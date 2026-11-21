import { activeEdges, graphOrder } from "../core/graph.ts";
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
