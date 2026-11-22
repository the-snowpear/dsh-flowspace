import { groupDescendants } from "../core/document.ts";
import { activeEdges, graphOrder } from "../core/graph.ts";
import { isExecutable } from "../core/nodes/registry.ts";
import type { FlowEdge, FlowNode, FlowspaceDocument } from "../types.ts";
import { bounds, canvasItemBox, clearBoxAlong, lockedCanvasItems, type Box } from "./geometry.ts";
import { byId, indexEdges } from "./sceneModel.ts";

const COLUMN_GAP = 88;
const ROW_GAP = 40;
const SIDE_GAP = 48;
const GROUP_SIDE = 24;
const GROUP_TOP = 56;

interface LayoutItem {
  node: FlowNode;
  box: Box;
}

interface LayoutBlock {
  items: LayoutItem[];
  box: Box;
}

function stack(items: LayoutItem[], x: (box: Box) => number, y: number): LayoutItem[] {
  return items.map(({ node, box }) => {
    const result = { node, box: { ...box, x: x(box), y } };
    y += box.h + 24;
    return result;
  });
}

function workflowBlock(anchor: LayoutItem, inputs: LayoutItem[], outputs: LayoutItem[], roles: LayoutItem[]): LayoutBlock {
  const main = { ...anchor.box, x: 0, y: 0 };
  const items = [
    { node: anchor.node, box: main },
    ...stack(inputs, (box) => -box.w - SIDE_GAP, 0),
    ...stack(outputs, () => main.w + SIDE_GAP, 0),
  ];
  let roleY = Math.max(...items.map(({ box }) => box.y + box.h)) + SIDE_GAP;
  for (let index = 0; index < roles.length; index += 3) {
    const row = roles.slice(index, index + 3);
    const width = row.reduce((sum, { box }) => sum + box.w, 0) + 24 * (row.length - 1);
    let x = (main.w - width) / 2;
    for (const { node, box } of row) {
      items.push({ node, box: { ...box, x, y: roleY } });
      x += box.w + 24;
    }
    roleY += Math.max(...row.map(({ box }) => box.h)) + 24;
  }
  return { items, box: bounds(items.map((item) => item.box)) };
}

/** One column per longest path in the workflow, with feedback edges omitted from ranking. */
function workflowColumns(ids: string[], links: FlowEdge[]): string[][] {
  const { component, rank } = graphOrder([], links, ids);
  const forward = links.filter(({ source, target }) =>
    component.get(source) !== component.get(target) || rank.get(source)! < rank.get(target)!,
  );
  const { incoming } = indexEdges(forward);
  const layers = new Map<string, number>();
  function layer(id: string): number {
    const known = layers.get(id);
    if (known !== undefined) return known;
    const upstream = incoming.get(id) ?? [];
    const result = upstream.reduce((max, edge) => Math.max(max, layer(edge.source) + 1), 0);
    layers.set(id, result);
    return result;
  }
  const columns: string[][] = [];
  for (const id of ids) (columns[layer(id)] ??= []).push(id);
  const rows = new Map<string, number>();
  for (const column of columns) {
    function averageRow(id: string) {
      const upstream = incoming.get(id) ?? [];
      return upstream.length ? upstream.reduce((sum, edge) => sum + rows.get(edge.source)!, 0) / upstream.length : 0;
    }
    column.sort((a, b) => averageRow(a) - averageRow(b));
    column.forEach((id, index) => rows.set(id, index));
  }
  return columns;
}

/** Arrange real card sizes within each group. Fixed cards and unselected siblings are obstacles. */
export function arrangeCanvas(doc: FlowspaceDocument, targetIds: string[] = []): boolean {
  const targets = new Set(targetIds);
  const locked = lockedCanvasItems(doc);
  const children = new Map<string | undefined, FlowNode[]>();
  const original = new Map(doc.nodes.map(({ id, x, y }) => [id, { x, y }]));
  const continuation = activeEdges(doc.edges);
  const reference = indexEdges(doc.edges.filter((edge) => edge.kind === "reference"));
  let changed = false;

  for (const node of doc.nodes) {
    if (!children.has(node.parentId)) children.set(node.parentId, []);
    children.get(node.parentId)!.push(node);
  }

  function translate(node: FlowNode, dx: number, dy: number, preserveOffset = false) {
    node.x += dx;
    node.y += dy;
    if (preserveOffset) {
      if (node.nudge?.origX !== undefined) node.nudge.origX += dx;
      if (node.nudge?.origY !== undefined) node.nudge.origY += dy;
    } else {
      delete node.nudge;
    }
    for (const child of children.get(node.id) ?? []) translate(child, dx, dy, preserveOffset || node.collapsed);
  }

  function arrangeLevel(parent: FlowNode | undefined, all: boolean, outside: Box[]): boolean {
    const siblings = children.get(parent?.id) ?? [];
    const scoped = (node: FlowNode) => all || targets.has(node.id);
    const movable = (node: FlowNode) => scoped(node) && !locked.has(node.id);
    const boxOf = (node: FlowNode) => canvasItemBox(doc, node);
    let descendantChanged = false;
    for (const group of siblings) {
      if (group.kind !== "group" || group.collapsed) continue;
      const external = movable(group) ? [] : [...outside, ...siblings.filter((node) => node !== group && !movable(node)).map(boxOf)];
      if (arrangeLevel(group, scoped(group), external)) descendantChanged = true;
    }

    const fixed = siblings.filter((node) => !movable(node));
    const items = siblings.filter(movable).map((node) => ({ node, box: boxOf(node) }));
    if (items.length) {
      const anchors = siblings.filter((node) => node.kind === "agent" || node.kind === "group");
      const anchorIds = new Set(anchors.map((node) => node.id));
      const representedBy = new Map<string, string>();
      function represent(node: FlowNode, id: string) {
        representedBy.set(node.id, id);
        for (const child of children.get(node.id) ?? []) represent(child, id);
      }
      for (const anchor of anchors) represent(anchor, anchor.id);
      const links = continuation.flatMap((edge) => {
        const source = representedBy.get(edge.source);
        const target = representedBy.get(edge.target);
        return source && target && source !== target ? [{ ...edge, source, target }] : [];
      });
      const linked = new Set(links.flatMap((edge) => [edge.source, edge.target]));

      const inputs = new Map<string, LayoutItem[]>();
      const outputs = new Map<string, LayoutItem[]>();
      const roles = new Map<string, LayoutItem[]>();
      const attached = new Set<string>();
      function attach(map: Map<string, LayoutItem[]>, owner: string | undefined, item: LayoutItem) {
        if (!owner || !anchorIds.has(owner)) return false;
        const owned = map.get(owner) ?? [];
        owned.push(item);
        map.set(owner, owned);
        attached.add(item.node.id);
        return true;
      }
      for (const item of items) {
        const { node } = item;
        if (anchorIds.has(node.id)) continue;
        if (node.kind === "role" && node.staffOf && attach(roles, representedBy.get(node.staffOf), item)) continue;
        const consumer = reference.outgoing.get(node.id)?.find((edge) => representedBy.has(edge.target));
        if (consumer && attach(inputs, representedBy.get(consumer.target), item)) continue;
        const producer = reference.incoming.get(node.id)?.find((edge) => representedBy.has(edge.source));
        const source = node.sourceNodeId ?? producer?.source;
        if (source) attach(outputs, representedBy.get(source), item);
      }

      const blocks = new Map(anchors.map((node) => [node.id, workflowBlock(
        { node, box: boxOf(node) }, inputs.get(node.id) ?? [], outputs.get(node.id) ?? [], roles.get(node.id) ?? [],
      )]));
      const fixedAttachments = anchors.filter((anchor) => !movable(anchor))
        .flatMap((anchor) => blocks.get(anchor.id)!.items.slice(1).map(({ node, box }) => ({
          node, box: { ...box, x: anchor.x + box.x, y: anchor.y + box.y },
        })));
      const anchored = new Set(fixedAttachments.map(({ node }) => node.id));
      const layoutOrigin = bounds(items.filter(({ node }) => !anchored.has(node.id)).map(({ box }) => box));
      const originX = parent ? parent.x + GROUP_SIDE : Math.round(layoutOrigin.x / 12) * 12;
      const originY = parent ? parent.y + GROUP_TOP : Math.round(layoutOrigin.y / 12) * 12;
      const occupied = [...outside, ...fixed.map(boxOf)];
      let bottom = originY - ROW_GAP;
      const place = (block: LayoutBlock, x: number, y: number) => {
        const slot = clearBoxAlong({ ...block.box, x, y }, occupied);
        occupied.push(slot);
        for (const item of block.items) {
          const dx = slot.x - block.box.x + item.box.x - item.node.x;
          const dy = slot.y - block.box.y + item.box.y - item.node.y;
          if (!dx && !dy && !item.node.nudge) continue;
          translate(item.node, dx, dy);
          changed = true;
        }
        return slot;
      };
      for (const item of fixedAttachments) {
        const { x, y } = item.box;
        place({ items: [item], box: item.box }, parent ? Math.max(originX, x) : x, parent ? Math.max(originY, y) : y);
      }

      let columnX = originX;
      for (const column of workflowColumns(anchors.filter((node) => linked.has(node.id)).map((node) => node.id), links)) {
        const blocksInColumn = column.map((id) => blocks.get(id)!);
        const moving = blocksInColumn.filter((block) => movable(block.items[0].node));
        const leftGutter = Math.max(0, ...moving.map((block) => -block.box.x));
        let rowY = originY;
        let right = columnX - COLUMN_GAP;
        for (const block of blocksInColumn) {
          const anchor = block.items[0].node;
          if (!movable(anchor)) {
            if (links.some((edge) => edge.source === anchor.id)) right = Math.max(right, anchor.x + block.items[0].box.w);
            continue;
          }
          const slot = place(block, columnX + leftGutter + block.box.x, rowY);
          rowY = slot.y + slot.h + ROW_GAP;
          bottom = Math.max(bottom, slot.y + slot.h);
          right = Math.max(right, slot.x + slot.w);
        }
        columnX = right + COLUMN_GAP;
      }

      const loose = items.filter(({ node }) => !linked.has(node.id) && !attached.has(node.id));
      const tileColumns = Math.min(4, Math.ceil(Math.sqrt(loose.length)));
      for (let index = 0; index < loose.length; index += tileColumns) {
        const y = bottom + ROW_GAP;
        let x = originX;
        for (const item of loose.slice(index, index + tileColumns)) {
          const block = blocks.get(item.node.id) ?? { items: [item], box: item.box };
          const slot = place(block, x, y);
          x = slot.x + slot.w + SIDE_GAP;
          bottom = Math.max(bottom, slot.y + slot.h);
        }
      }
    }

    const levelChanged = items.length > 0 || descendantChanged;
    if (!parent || !levelChanged) return levelChanged;
    const content = bounds(siblings.map(boxOf));
    const compact = all && !parent.pinned;
    const width = Math.max(compact ? 260 : parent.width, content.x + content.w + GROUP_SIDE - parent.x);
    const height = Math.max(compact ? 180 : parent.height, content.y + content.h + GROUP_SIDE - parent.y);
    if (width !== parent.width || height !== parent.height) {
      Object.assign(parent, { width, height });
      delete parent.nudge;
      changed = true;
    }
    return levelChanged;
  }

  arrangeLevel(undefined, targets.size === 0, []);

  // Hand-routed segments inside a translated group follow both endpoints.
  const nodesById = byId(doc.nodes);
  for (const edge of doc.edges) {
    if (!edge.waypoints?.length) continue;
    const source = nodesById.get(edge.source)!;
    const target = nodesById.get(edge.target)!;
    const from = original.get(source.id)!;
    const to = original.get(target.id)!;
    const dx = source.x - from.x;
    const dy = source.y - from.y;
    if ((dx || dy) && dx === target.x - to.x && dy === target.y - to.y) {
      edge.waypoints = edge.waypoints.map(({ x, y }) => ({ x: x + dx, y: y + dy }));
    }
  }
  return changed;
}

const snapGrid = (val: number): number => Math.round(val / 12) * 12;

/**
 * Pure topological + barycenter auto-layout for Agent DAGs and attached reference/display
 * satellite nodes, respecting `pinned` nodes and optional group/selection scopes.
 */
export function computeAutoLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts?: { targetIds?: string[]; groupId?: string },
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (!nodes.length) return result;

  const docLike = { nodes, edges } as FlowspaceDocument;
  let scopeIds: Set<string>;
  let groupAnchor: FlowNode | undefined;
  if (opts?.groupId) {
    groupAnchor = nodes.find(
      (n) => n.id === opts.groupId && n.kind === "group",
    );
    scopeIds = new Set(groupDescendants(docLike, opts.groupId));
  } else if (opts?.targetIds?.length) {
    scopeIds = new Set(
      opts.targetIds.flatMap((id) =>
        nodes.find((n) => n.id === id)?.kind === "group"
          ? groupDescendants(docLike, id)
          : [id],
      ),
    );
  } else {
    scopeIds = new Set(nodes.filter((n) => n.kind !== "group").map((n) => n.id));
  }

  const movable = nodes.filter(
    (n) => scopeIds.has(n.id) && n.kind !== "group" && !n.pinned,
  );
  if (!movable.length) return result;

  const pinnedBoxes = nodes
    .filter((n) => n.kind !== "group" && (!scopeIds.has(n.id) || n.pinned))
    .map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height }));

  const baseX = groupAnchor
    ? groupAnchor.x + 28
    : snapGrid(Math.min(...movable.map((n) => n.x)));
  const baseY = groupAnchor
    ? groupAnchor.y + 64
    : snapGrid(Math.min(...movable.map((n) => n.y)));

  const agents = movable.filter((n) => n.kind === "agent" || (n.kind === "flow" && isExecutable(n)));
  const agentIds = new Set(agents.map((n) => n.id));
  const contEdges = edges.filter(
    (e) =>
      e.kind === "continuation" &&
      agentIds.has(e.source) &&
      agentIds.has(e.target) &&
      e.source !== e.target,
  );

  // Break cycles via Tarjan DFS rank so back-edges don't create infinite layers
  const roots = agents
    .filter((a) => !contEdges.some((e) => e.target === a.id))
    .map((a) => a.id);
  const order = graphOrder(agents, contEdges, roots);
  const dagEdges = contEdges.filter((e) => {
    const sameComp =
      order.component.get(e.source) === order.component.get(e.target);
    if (!sameComp) return true;
    return (order.rank.get(e.source) ?? 0) < (order.rank.get(e.target) ?? 0);
  });

  // Longest-path layering
  const layerOf = new Map<string, number>();
  for (const a of agents) layerOf.set(a.id, 0);
  for (let pass = 0; pass < agents.length; pass++) {
    let changed = false;
    for (const e of dagEdges) {
      const nextLayer = (layerOf.get(e.source) ?? 0) + 1;
      if (nextLayer > (layerOf.get(e.target) ?? 0)) {
        layerOf.set(e.target, nextLayer);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const maxLayer = agents.length
    ? Math.max(...agents.map((a) => layerOf.get(a.id) ?? 0))
    : -1;
  const layers: FlowNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const a of agents) {
    layers[layerOf.get(a.id) ?? 0].push(a);
  }
  for (const col of layers) {
    col.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  // Two-pass barycenter sweep to minimize continuation wire crossings
  const rowIndex = new Map<string, number>();
  const syncRows = () => {
    for (const col of layers) {
      col.forEach((n, idx) => rowIndex.set(n.id, idx));
    }
  };
  syncRows();
  for (let sweep = 0; sweep < 2; sweep++) {
    for (let l = 1; l <= maxLayer; l++) {
      layers[l].sort((a, b) => {
        const upA = dagEdges
          .filter((e) => e.target === a.id)
          .map((e) => rowIndex.get(e.source) ?? 0);
        const upB = dagEdges
          .filter((e) => e.target === b.id)
          .map((e) => rowIndex.get(e.source) ?? 0);
        const baryA = upA.length
          ? upA.reduce((s, v) => s + v, 0) / upA.length
          : (rowIndex.get(a.id) ?? 0);
        const baryB = upB.length
          ? upB.reduce((s, v) => s + v, 0) / upB.length
          : (rowIndex.get(b.id) ?? 0);
        return baryA - baryB || a.y - b.y;
      });
      syncRows();
    }
    for (let l = maxLayer - 1; l >= 0; l--) {
      layers[l].sort((a, b) => {
        const dnA = dagEdges
          .filter((e) => e.source === a.id)
          .map((e) => rowIndex.get(e.target) ?? 0);
        const dnB = dagEdges
          .filter((e) => e.source === b.id)
          .map((e) => rowIndex.get(e.target) ?? 0);
        const baryA = dnA.length
          ? dnA.reduce((s, v) => s + v, 0) / dnA.length
          : (rowIndex.get(a.id) ?? 0);
        const baryB = dnB.length
          ? dnB.reduce((s, v) => s + v, 0) / dnB.length
          : (rowIndex.get(b.id) ?? 0);
        return baryA - baryB || a.y - b.y;
      });
      syncRows();
    }
  }

  // Classify movable non-agent satellites
  const satellites = movable.filter((n) => !agentIds.has(n.id));
  const inputSatellitesByAgent = new Map<string, FlowNode[]>();
  const outputSatellitesByAgent = new Map<string, FlowNode[]>();
  const looseSatellites: FlowNode[] = [];

  for (const sat of satellites) {
    if (sat.kind === "display" || sat.kind === "detail") {
      const producerId =
        sat.sourceNodeId && (agentIds.has(sat.sourceNodeId) || nodes.some((n) => n.id === sat.sourceNodeId))
          ? sat.sourceNodeId
          : edges.find((e) => e.target === sat.id)?.source;
      if (producerId && agentIds.has(producerId)) {
        const list = outputSatellitesByAgent.get(producerId) ?? [];
        list.push(sat);
        outputSatellitesByAgent.set(producerId, list);
        continue;
      }
    }
    const refEdge = edges.find(
      (e) =>
        e.kind === "reference" &&
        e.source === sat.id &&
        agentIds.has(e.target),
    );
    if (refEdge) {
      const list = inputSatellitesByAgent.get(refEdge.target) ?? [];
      list.push(sat);
      inputSatellitesByAgent.set(refEdge.target, list);
    } else {
      looseSatellites.push(sat);
    }
  }

  // Reserve a left satellite gutter if any layer-0 agent has input satellites
  const hasLayer0Inputs = (layers[0] ?? []).some(
    (a) => (inputSatellitesByAgent.get(a.id)?.length ?? 0) > 0,
  );
  const agentStartX = hasLayer0Inputs ? baseX + 372 : baseX;
  const colGap = 96;
  const rowGap = 48;

  const avoidPinned = (
    x: number,
    y: number,
    w: number,
    h: number,
  ): { x: number; y: number } => {
    let curY = y;
    for (let guard = 0; guard < 12; guard++) {
      const hit = pinnedBoxes.find(
        (b) =>
          x < b.x + b.w + 20 &&
          x + w + 20 > b.x &&
          curY < b.y + b.h + 20 &&
          curY + h + 20 > b.y,
      );
      if (!hit) break;
      curY = snapGrid(hit.y + hit.h + 28);
    }
    return { x: snapGrid(x), y: snapGrid(curY) };
  };

  let curX = agentStartX;
  let maxAgentBottom = baseY;

  for (let l = 0; l <= maxLayer; l++) {
    const col = layers[l];
    if (!col.length) continue;
    const colWidth = Math.max(...col.map((n) => n.width));
    let curY = baseY;
    for (const ag of col) {
      const inputs = inputSatellitesByAgent.get(ag.id) ?? [];
      if (l > 0 && inputs.length > 0) {
        // Place reference satellites cleanly above their consumer Agent in deeper columns
        for (const sat of inputs) {
          const placedSat = avoidPinned(curX, curY, sat.width, sat.height);
          result.set(sat.id, placedSat);
          curY = placedSat.y + sat.height + 24;
        }
      }
      const placedAg = avoidPinned(curX, curY, ag.width, ag.height);
      result.set(ag.id, placedAg);

      if (l === 0 && inputs.length > 0) {
        let satY = placedAg.y;
        for (const sat of inputs) {
          const satX = Math.max(baseX, placedAg.x - sat.width - 56);
          const placedSat = avoidPinned(satX, satY, sat.width, sat.height);
          result.set(sat.id, placedSat);
          satY = placedSat.y + sat.height + 24;
          maxAgentBottom = Math.max(maxAgentBottom, placedSat.y + sat.height);
        }
      }

      const outputs = outputSatellitesByAgent.get(ag.id) ?? [];
      if (outputs.length > 0) {
        let outY = placedAg.y;
        const outX =
          l === maxLayer
            ? placedAg.x + ag.width + 64
            : placedAg.x + 24;
        if (l === maxLayer) {
          for (const outSat of outputs) {
            const placedOut = avoidPinned(
              outX,
              outY,
              outSat.width,
              outSat.height,
            );
            result.set(outSat.id, placedOut);
            outY = placedOut.y + outSat.height + 24;
            maxAgentBottom = Math.max(
              maxAgentBottom,
              placedOut.y + outSat.height,
            );
          }
        } else {
          outY = placedAg.y + ag.height + 24;
          for (const outSat of outputs) {
            const placedOut = avoidPinned(
              placedAg.x,
              outY,
              outSat.width,
              outSat.height,
            );
            result.set(outSat.id, placedOut);
            outY = placedOut.y + outSat.height + 24;
          }
          curY = Math.max(placedAg.y + ag.height, outY - 24) + rowGap;
          maxAgentBottom = Math.max(maxAgentBottom, curY);
          continue;
        }
      }

      curY = placedAg.y + ag.height + rowGap;
      maxAgentBottom = Math.max(maxAgentBottom, placedAg.y + ag.height);
    }
    curX += colWidth + colGap;
  }

  if (looseSatellites.length > 0) {
    let looseX = baseX;
    const looseY = agents.length ? maxAgentBottom + 60 : baseY;
    for (const sat of looseSatellites) {
      const placed = avoidPinned(looseX, looseY, sat.width, sat.height);
      result.set(sat.id, placed);
      looseX = placed.x + sat.width + 48;
    }
  }

  return result;
}

