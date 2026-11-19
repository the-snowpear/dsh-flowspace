import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  GroupPort,
} from "../types.ts";
import { groupDescendants, members, uid } from "../core/document.ts";
import { bounds, expandedGroupBox, groupBox, nodeBox, type Box } from "./geometry.ts";

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export type DistributeAxis = "horizontal" | "vertical";

export interface SubgraphClipboard {
  kind: "flowspace-subgraph";
  version: 1;
  copiedAt: number;
  anchor: { x: number; y: number };
  nodes: FlowNode[];
  internalEdges: FlowEdge[];
  incomingRefEdges: FlowEdge[];
}

export interface SubgraphPasteResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdNodeIds: string[];
  createdGroupIds: string[];
  createdEdgeIds: string[];
}

const GRID = 12;

function snap(value: number, grid = GRID): number {
  return grid > 1 ? Math.round(value / grid) * grid : Math.round(value * 10) / 10;
}

function sanitizeClonedNode(
  raw: FlowNode,
  newId: string,
  clonedAgentSessionIds: Set<string>,
): FlowNode {
  const clone = structuredClone(raw);
  clone.id = newId;
  // The team reference belongs to the canvas document. Session identity is per instance.
  delete clone.sessionId;
  delete clone.lastSubmittedTask;
  delete clone.window;
  delete clone.nudge;

  if (clone.kind === "agent") {
    clone.draft = clone.task || clone.draft || "";
    if (clone.tab === "conversation") {
      clone.tab = "task";
    }
  } else if (
    clone.kind === "changes" &&
    clone.changesSessionId &&
    clonedAgentSessionIds.has(clone.changesSessionId)
  ) {
    delete clone.changesSessionId;
    delete clone.changesSeq;
    delete clone.changesTurn;
  } else if (
    clone.kind === "terminal" &&
    clone.terminalSessionId &&
    clonedAgentSessionIds.has(clone.terminalSessionId)
  ) {
    delete clone.terminalSessionId;
    delete clone.terminalId;
  }

  return clone;
}

function sanitizeClonedEdge(
  raw: FlowEdge,
  sourceId: string,
  targetId: string,
  dx: number,
  dy: number,
  keepWaypoints: boolean,
): FlowEdge {
  const clone = structuredClone(raw);
  clone.id = uid();
  clone.source = sourceId;
  clone.target = targetId;
  delete clone.sentVersion;
  delete clone.placedCapsules;
  if (clone.originMode === "fork") {
    clone.mode = "fork";
    delete clone.originMode;
  } else {
    delete clone.originMode;
  }
  clone.waypoints = keepWaypoints
    ? clone.waypoints?.map((wp) => ({
        x: Math.round((wp.x + dx) * 10) / 10,
        y: Math.round((wp.y + dy) * 10) / 10,
      }))
    : [];
  return clone;
}

function collectExpandedSelectionIds(
  doc: FlowspaceDocument,
  selectedIds: string[],
): Set<string> {
  const result = new Set<string>();
  for (const id of selectedIds) {
    const node = doc.nodes.find((n) => n.id === id);
    if (!node) continue;
    result.add(node.id);
    if (node.kind === "group") {
      for (const childId of groupDescendants(doc, node.id)) {
        result.add(childId);
      }
    }
  }
  return result;
}

/**
 * Serializes a selected subgraph (including nested group hierarchies, internal
 * edges + waypoints, and incoming external reference wires) into a clean,
 * runtime-free clipboard payload (`AGENTS.md` rule #5).
 */
export function serializeSubgraphClipboard(
  doc: FlowspaceDocument,
  selectedNodeIds: string[],
): SubgraphClipboard | null {
  const inside = collectExpandedSelectionIds(doc, selectedNodeIds);
  if (!inside.size) return null;

  const selectedNodes = doc.nodes.filter((n) => inside.has(n.id));
  if (!selectedNodes.length) return null;

  const boxes = selectedNodes.map((n) =>
    n.kind === "group" ? expandedGroupBox(doc, n) : nodeBox(n, false, true),
  );
  const b = bounds(boxes);

  const nodes = selectedNodes.map((n) => {
    const clone = structuredClone(n);
    delete clone.window;
    delete clone.nudge;
    return clone;
  });

  const internalEdges = doc.edges
    .filter((e) => inside.has(e.source) && inside.has(e.target))
    .map((e) => structuredClone(e));

  const incomingRefEdges = doc.edges
    .filter(
      (e) =>
        e.kind === "reference" &&
        !inside.has(e.source) &&
        inside.has(e.target),
    )
    .map((e) => structuredClone(e));

  return {
    kind: "flowspace-subgraph",
    version: 1,
    copiedAt: Date.now(),
    anchor: { x: b.x, y: b.y },
    nodes,
    internalEdges,
    incomingRefEdges,
  };
}

/**
 * Pastes a serialized subgraph into `doc` at `anchorPt` (or offset `+36, +36`
 * from its original bounds), stripping all live session/runtime state so every
 * pasted Agent starts as an independent draft.
 */
export function pasteSubgraphClipboard(
  doc: FlowspaceDocument,
  clipboard: SubgraphClipboard | null | undefined,
  anchorPt?: { x: number; y: number },
): SubgraphPasteResult {
  if (!clipboard?.nodes.length) {
    return {
      nodes: [],
      edges: [],
      createdNodeIds: [],
      createdGroupIds: [],
      createdEdgeIds: [],
    };
  }

  const dx = anchorPt
    ? snap(anchorPt.x - clipboard.anchor.x)
    : 36;
  const dy = anchorPt
    ? snap(anchorPt.y - clipboard.anchor.y)
    : 36;

  const idMap = new Map<string, string>();
  const clonedAgentSessionIds = new Set<string>();
  for (const n of clipboard.nodes) {
    idMap.set(n.id, uid());
    if (n.kind === "agent" && n.sessionId) {
      clonedAgentSessionIds.add(n.sessionId);
    }
  }

  const existingIds = new Set(doc.nodes.map((n) => n.id));
  const candidateHostGroups = doc.nodes
    .filter((g) => g.kind === "group" && !g.collapsed && !g.parentId)
    .toSorted((a, b) => a.width * a.height - b.width * b.height);

  const createdNodes: FlowNode[] = clipboard.nodes.map((orig) => {
    const freshId = idMap.get(orig.id)!;
    const clone = sanitizeClonedNode(orig, freshId, clonedAgentSessionIds);
    clone.x = orig.x + dx;
    clone.y = orig.y + dy;

    if (orig.parentId && idMap.has(orig.parentId)) {
      clone.parentId = idMap.get(orig.parentId);
    } else if (
      !anchorPt &&
      orig.parentId &&
      existingIds.has(orig.parentId) &&
      orig.kind !== "group"
    ) {
      clone.parentId = orig.parentId;
    } else {
      delete clone.parentId;
      if (clone.kind !== "group") {
        const box = nodeBox(clone, false, true);
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const hitGroup = candidateHostGroups.find(
          (g) =>
            cx > g.x &&
            cx < g.x + g.width &&
            cy > g.y + 42 &&
            cy < g.y + g.height,
        );
        if (hitGroup) {
          clone.parentId = hitGroup.id;
        }
      }
    }

    if (clone.sourceNodeId) {
      if (idMap.has(clone.sourceNodeId)) {
        clone.sourceNodeId = idMap.get(clone.sourceNodeId);
      } else if (!existingIds.has(clone.sourceNodeId)) {
        delete clone.sourceNodeId;
      }
    }

    if (clone.kind === "group" && clone.ports?.length) {
      clone.ports = clone.ports
        .map((port): GroupPort => ({
          ...structuredClone(port),
          id: uid(),
          nodes: port.nodes
            .map((nid) => idMap.get(nid))
            .filter((nid): nid is string => Boolean(nid)),
        }))
        .filter((port) => port.nodes.length > 0);
    }

    return clone;
  });

  const createdInternalEdges: FlowEdge[] = clipboard.internalEdges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) =>
      sanitizeClonedEdge(
        e,
        idMap.get(e.source)!,
        idMap.get(e.target)!,
        dx,
        dy,
        true,
      ),
    );

  const createdExternalRefs: FlowEdge[] = clipboard.incomingRefEdges
    .filter((e) => existingIds.has(e.source) && idMap.has(e.target))
    .map((e) =>
      sanitizeClonedEdge(
        e,
        e.source,
        idMap.get(e.target)!,
        0,
        0,
        false,
      ),
    );

  const createdEdges = [...createdInternalEdges, ...createdExternalRefs];
  doc.nodes.push(...createdNodes);
  doc.edges.push(...createdEdges);

  /* Expand any existing parent group whose duplicated members shifted down/right */
  const touchedParentIds = new Set(
    createdNodes
      .map((n) => n.parentId)
      .filter((pid): pid is string => Boolean(pid) && existingIds.has(pid!)),
  );
  for (const pid of touchedParentIds) {
    const grp = doc.nodes.find((g) => g.id === pid && g.kind === "group");
    if (grp && !grp.collapsed) {
      const exp = expandedGroupBox(doc, grp, false);
      grp.width = Math.max(grp.width, exp.w);
      grp.height = Math.max(grp.height, exp.h);
    }
  }

  return {
    nodes: createdNodes,
    edges: createdEdges,
    createdNodeIds: createdNodes
      .filter((n) => n.kind !== "group")
      .map((n) => n.id),
    createdGroupIds: createdNodes
      .filter((n) => n.kind === "group" && (!n.parentId || !idMap.has(n.parentId)))
      .map((n) => n.id),
    createdEdgeIds: createdEdges.map((e) => e.id),
  };
}

/**
 * Duplicates the selected nodes/groups in-place with a clean grid-aligned offset (`+36, +36` default).
 */
export function duplicateSubgraph(
  doc: FlowspaceDocument,
  selectedNodeIds: string[],
  offset: { x: number; y: number } = { x: 36, y: 36 },
): SubgraphPasteResult {
  const clip = serializeSubgraphClipboard(doc, selectedNodeIds);
  if (!clip) {
    return {
      nodes: [],
      edges: [],
      createdNodeIds: [],
      createdGroupIds: [],
      createdEdgeIds: [],
    };
  }
  const targetAnchor = {
    x: clip.anchor.x + offset.x,
    y: clip.anchor.y + offset.y,
  };
  const res = pasteSubgraphClipboard(doc, clip, targetAnchor);
  return res;
}

function getTopLevelMovableItems(
  nodes: FlowNode[],
  targetIds: string[],
): { node: FlowNode; box: Box; descendantIds: string[] }[] {
  const targetSet = new Set(targetIds);
  const hasSelectedAncestor = (n: FlowNode): boolean => {
    let cur = n.parentId;
    while (cur) {
      if (targetSet.has(cur)) return true;
      cur = nodes.find((p) => p.id === cur)?.parentId;
    }
    return false;
  };

  const fakeDoc = { nodes, edges: [] } as unknown as FlowspaceDocument;
  return nodes
    .filter((n) => targetSet.has(n.id) && !hasSelectedAncestor(n) && !n.window)
    .map((node) => ({
      node,
      box:
        node.kind === "group"
          ? groupBox(node)
          : nodeBox(node, false, true),
      descendantIds:
        node.kind === "group" ? groupDescendants(fakeDoc, node.id) : [],
    }));
}

function shiftItemByDelta(
  nodes: FlowNode[],
  item: { node: FlowNode; descendantIds: string[] },
  dx: number,
  dy: number,
): void {
  if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
  item.node.x = Math.round(item.node.x + dx);
  item.node.y = Math.round(item.node.y + dy);
  delete item.node.nudge;
  for (const cid of item.descendantIds) {
    const child = nodes.find((n) => n.id === cid);
    if (child) {
      child.x = Math.round(child.x + dx);
      child.y = Math.round(child.y + dy);
      delete child.nudge;
    }
  }
}

/**
 * Aligns 2+ target nodes/groups along the requested edge or center axis,
 * respecting `nodeBox` / `groupBox` dimensions and translating group children together.
 */
export function alignNodes(
  nodes: FlowNode[],
  targetIds: string[],
  mode: AlignMode,
): FlowNode[] {
  const items = getTopLevelMovableItems(nodes, targetIds);
  if (items.length < 2) return nodes;

  const minX = Math.min(...items.map((it) => it.box.x));
  const maxRight = Math.max(...items.map((it) => it.box.x + it.box.w));
  const centerX = (minX + maxRight) / 2;

  const minY = Math.min(...items.map((it) => it.box.y));
  const maxBottom = Math.max(...items.map((it) => it.box.y + it.box.h));
  const middleY = (minY + maxBottom) / 2;

  for (const item of items) {
    if (item.node.pinned) continue;
    let nextX = item.box.x;
    let nextY = item.box.y;
    switch (mode) {
      case "left":
        nextX = minX;
        break;
      case "center":
        nextX = centerX - item.box.w / 2;
        break;
      case "right":
        nextX = maxRight - item.box.w;
        break;
      case "top":
        nextY = minY;
        break;
      case "middle":
        nextY = middleY - item.box.h / 2;
        break;
      case "bottom":
        nextY = maxBottom - item.box.h;
        break;
    }
    shiftItemByDelta(nodes, item, nextX - item.box.x, nextY - item.box.y);
  }

  return nodes;
}

/**
 * Evenly distributes 3+ target nodes/groups horizontally or vertically,
 * preserving `nodeBox` widths/heights and enforcing at least a 24px gap if overlapping.
 */
export function distributeNodes(
  nodes: FlowNode[],
  targetIds: string[],
  axis: DistributeAxis,
): FlowNode[] {
  const items = getTopLevelMovableItems(nodes, targetIds);
  if (items.length < 3) return nodes;

  const sorted = items.toSorted((a, b) =>
    axis === "horizontal"
      ? a.box.x - b.box.x || a.box.y - b.box.y
      : a.box.y - b.box.y || a.box.x - b.box.x,
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startCoord = axis === "horizontal" ? first.box.x : first.box.y;
  const endEdge =
    axis === "horizontal"
      ? last.box.x + last.box.w
      : last.box.y + last.box.h;
  const totalSizes = sorted.reduce(
    (sum, it) => sum + (axis === "horizontal" ? it.box.w : it.box.h),
    0,
  );
  const rawGap = (endEdge - startCoord - totalSizes) / (sorted.length - 1);
  const gap = Math.max(24, rawGap);

  let cursor = startCoord;
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const size = axis === "horizontal" ? item.box.w : item.box.h;
    if (i > 0 && !item.node.pinned) {
      const dx = axis === "horizontal" ? cursor - item.box.x : 0;
      const dy = axis === "vertical" ? cursor - item.box.y : 0;
      shiftItemByDelta(nodes, item, dx, dy);
    }
    cursor += size + gap;
  }

  return nodes;
}

/**
 * Client-ready DAG auto-layout that ranks Agents left-to-right (with cycle-breaking
 * and barycenter uncrossing) AND positions attached `file`/`note`/`board`/`git`/`changes`/`terminal`
 * context nodes neatly to the upper-left of their consumer Agent and `display`/`detail`
 * nodes to the right of their producer Agent.
 *
 * Updates unpinned node coordinates in-place (plus enclosing group bounds) and returns
 * a `Map<nodeId, { x, y }>` of all computed positions.
 */
export function arrangeGraphWithSatellites(
  nodes: FlowNode[],
  edges: FlowEdge[],
  targetIds?: string[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const fakeDoc = { nodes, edges } as unknown as FlowspaceDocument;

  let targetGroup: FlowNode | undefined;
  let scopedIds: Set<string>;

  if (targetIds?.length) {
    if (targetIds.length === 1) {
      const maybeGroup = nodes.find(
        (n) => n.id === targetIds[0] && n.kind === "group",
      );
      if (maybeGroup) {
        targetGroup = maybeGroup;
        scopedIds = new Set(members(fakeDoc, maybeGroup.id));
      } else {
        scopedIds = collectExpandedSelectionIds(fakeDoc, targetIds);
      }
    } else {
      scopedIds = collectExpandedSelectionIds(fakeDoc, targetIds);
    }
  } else {
    const nonGroups = nodes.filter((n) => n.kind !== "group" && !n.window);
    scopedIds = new Set(nonGroups.map((n) => n.id));
  }

  const movableNodes = nodes.filter(
    (n) => n.kind !== "group" && scopedIds.has(n.id) && !n.window,
  );
  if (!movableNodes.length) return positions;

  const currentBoxes = movableNodes.map((n) => nodeBox(n, false, true));
  const originBounds = bounds(currentBoxes);
  const startX = targetGroup ? snap(targetGroup.x + 28) : snap(originBounds.x);
  const startY = targetGroup ? snap(targetGroup.y + 58) : snap(originBounds.y);

  const agents = movableNodes.filter((n) => n.kind === "agent");
  const agentSet = new Set(agents.map((a) => a.id));

  /* Fallback grid if selection contains only non-agent context/tool cards */
  if (!agents.length) {
    let curX = startX;
    let curY = startY;
    let rowMaxH = 0;
    movableNodes.forEach((n, idx) => {
      const b = nodeBox(n, false, true);
      if (idx > 0 && idx % 3 === 0) {
        curX = startX;
        curY += rowMaxH + 28;
        rowMaxH = 0;
      }
      const pt = n.pinned ? { x: n.x, y: n.y } : { x: snap(curX), y: snap(curY) };
      positions.set(n.id, pt);
      if (!n.pinned) {
        n.x = pt.x;
        n.y = pt.y;
        delete n.nudge;
      }
      curX += b.w + 32;
      rowMaxH = Math.max(rowMaxH, b.h);
    });
    return positions;
  }

  /* 1. Cycle-safe longest-path rank assignment among Agents */
  const contEdges = edges.filter(
    (e) =>
      e.kind === "continuation" &&
      e.trigger !== "off" &&
      agentSet.has(e.source) &&
      agentSet.has(e.target) &&
      e.source !== e.target,
  );

  const orderedAgents = agents.toSorted(
    (a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id),
  );
  const backEdges = new Set<string>();
  const visitState = new Map<string, 0 | 1 | 2>();
  const dfsCycle = (u: string) => {
    visitState.set(u, 1);
    for (const e of contEdges) {
      if (e.source !== u) continue;
      const st = visitState.get(e.target) ?? 0;
      if (st === 1) {
        backEdges.add(e.id);
      } else if (st === 0) {
        dfsCycle(e.target);
      }
    }
    visitState.set(u, 2);
  };
  for (const ag of orderedAgents) {
    if (!visitState.has(ag.id)) dfsCycle(ag.id);
  }

  const dagEdges = contEdges.filter((e) => !backEdges.has(e.id));
  const rawRanks = new Map<string, number>();
  const rankMemoVisiting = new Set<string>();
  const getRank = (id: string): number => {
    if (rawRanks.has(id)) return rawRanks.get(id)!;
    if (rankMemoVisiting.has(id)) return 0;
    rankMemoVisiting.add(id);
    const incoming = dagEdges.filter((e) => e.target === id);
    const r = incoming.length
      ? Math.max(...incoming.map((e) => getRank(e.source))) + 1
      : 0;
    rankMemoVisiting.delete(id);
    rawRanks.set(id, r);
    return r;
  };
  for (const ag of orderedAgents) getRank(ag.id);

  const uniqueRanks = [...new Set(rawRanks.values())].toSorted((a, b) => a - b);
  const rankIndexMap = new Map(uniqueRanks.map((r, idx) => [r, idx]));
  const columns: FlowNode[][] = uniqueRanks.map(() => []);
  for (const ag of orderedAgents) {
    const colIdx = rankIndexMap.get(rawRanks.get(ag.id) ?? 0) ?? 0;
    columns[colIdx].push(ag);
  }

  /* Barycenter ordering within each column to minimize wire crossings */
  const rowScore = new Map<string, number>();
  columns[0].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  columns[0].forEach((ag, idx) => rowScore.set(ag.id, idx));

  for (let c = 1; c < columns.length; c++) {
    columns[c].sort((a, b) => {
      const upA = dagEdges
        .filter((e) => e.target === a.id)
        .map((e) => rowScore.get(e.source) ?? 0);
      const upB = dagEdges
        .filter((e) => e.target === b.id)
        .map((e) => rowScore.get(e.source) ?? 0);
      const baryA = upA.length
        ? upA.reduce((s, v) => s + v, 0) / upA.length
        : a.y / 400;
      const baryB = upB.length
        ? upB.reduce((s, v) => s + v, 0) / upB.length
        : b.y / 400;
      return baryA - baryB || a.y - b.y || a.id.localeCompare(b.id);
    });
    columns[c].forEach((ag, idx) => rowScore.set(ag.id, idx));
  }

  /* 2. Partition non-Agent satellites into context (upper-left) vs output (right) */
  const nonAgents = movableNodes.filter((n) => n.kind !== "agent");
  const contextSatellitesByAgent = new Map<string, FlowNode[]>();
  const outputSatellitesByAgent = new Map<string, FlowNode[]>();
  const orphans: FlowNode[] = [];

  for (const sat of nonAgents) {
    const isOutputCard =
      (sat.kind === "display" || sat.kind === "detail") &&
      sat.sourceNodeId &&
      agentSet.has(sat.sourceNodeId) &&
      !edges.some(
        (e) =>
          e.kind === "reference" &&
          e.source === sat.id &&
          agentSet.has(e.target),
      );
    if (isOutputCard) {
      const list = outputSatellitesByAgent.get(sat.sourceNodeId!) ?? [];
      list.push(sat);
      outputSatellitesByAgent.set(sat.sourceNodeId!, list);
      continue;
    }

    const consumerEdge = edges
      .filter(
        (e) =>
          e.kind === "reference" &&
          e.source === sat.id &&
          agentSet.has(e.target),
      )
      .toSorted(
        (a, b) =>
          (rawRanks.get(a.target) ?? 0) - (rawRanks.get(b.target) ?? 0),
      )[0];

    if (consumerEdge) {
      const list = contextSatellitesByAgent.get(consumerEdge.target) ?? [];
      list.push(sat);
      contextSatellitesByAgent.set(consumerEdge.target, list);
    } else if (sat.sourceNodeId && agentSet.has(sat.sourceNodeId)) {
      const list = outputSatellitesByAgent.get(sat.sourceNodeId) ?? [];
      list.push(sat);
      outputSatellitesByAgent.set(sat.sourceNodeId, list);
    } else {
      orphans.push(sat);
    }
  }

  /* 3. Compute column horizontal lanes reserving exact space for upper-left context & right output cards */
  let cursorX = startX;
  let globalMaxBottom = startY;

  for (let c = 0; c < columns.length; c++) {
    const colAgents = columns[c];
    const maxContextLeftW = Math.max(
      0,
      ...colAgents.map((ag) => {
        const ctxList = contextSatellitesByAgent.get(ag.id) ?? [];
        if (!ctxList.length) return 0;
        return Math.max(...ctxList.map((s) => nodeBox(s, false, true).w)) + 44;
      }),
    );

    const agentColX = cursorX + maxContextLeftW;
    const maxAgentW = Math.max(
      312,
      ...colAgents.map((ag) => nodeBox(ag, false, true).w),
    );
    const maxOutRightW = Math.max(
      0,
      ...colAgents.map((ag) => {
        const outList = outputSatellitesByAgent.get(ag.id) ?? [];
        if (!outList.length) return 0;
        return 44 + Math.max(...outList.map((s) => nodeBox(s, false, true).w));
      }),
    );

    let cursorY = startY;
    for (const ag of colAgents) {
      const agBox = nodeBox(ag, false, true);
      const ctxList = contextSatellitesByAgent.get(ag.id) ?? [];
      const outList = outputSatellitesByAgent.get(ag.id) ?? [];

      /* Stack context satellites neatly to the upper-left of their consumer Agent */
      const ctxHeadroom = ctxList.length > 0 ? 28 : 0;
      const agentTargetY = snap(cursorY + ctxHeadroom);
      const agentPt = ag.pinned
        ? { x: ag.x, y: ag.y }
        : { x: snap(agentColX), y: agentTargetY };
      positions.set(ag.id, agentPt);
      if (!ag.pinned) {
        ag.x = agentPt.x;
        ag.y = agentPt.y;
        delete ag.nudge;
      }

      let ctxY = agentPt.y - ctxHeadroom;
      for (const ctxNode of ctxList) {
        const cb = nodeBox(ctxNode, false, true);
        const cx = snap(agentPt.x - cb.w - 44);
        const cy = snap(ctxY);
        const pt = ctxNode.pinned ? { x: ctxNode.x, y: ctxNode.y } : { x: cx, y: cy };
        positions.set(ctxNode.id, pt);
        if (!ctxNode.pinned) {
          ctxNode.x = pt.x;
          ctxNode.y = pt.y;
          delete ctxNode.nudge;
        }
        ctxY = pt.y + cb.h + 18;
      }

      /* Stack extracted Display/Detail nodes cleanly to the right of their producer Agent */
      let outY = agentPt.y + 12;
      for (const outNode of outList) {
        const ob = nodeBox(outNode, false, true);
        const ox = snap(agentPt.x + agBox.w + 44);
        const oy = snap(outY);
        const pt = outNode.pinned ? { x: outNode.x, y: outNode.y } : { x: ox, y: oy };
        positions.set(outNode.id, pt);
        if (!outNode.pinned) {
          outNode.x = pt.x;
          outNode.y = pt.y;
          delete outNode.nudge;
        }
        outY = pt.y + ob.h + 18;
      }

      const rowBottom = Math.max(
        agentPt.y + agBox.h,
        ctxList.length ? ctxY - 18 : 0,
        outList.length ? outY - 18 : 0,
      );
      globalMaxBottom = Math.max(globalMaxBottom, rowBottom);
      cursorY = rowBottom + 36;
    }

    cursorX = agentColX + maxAgentW + maxOutRightW + 84;
  }

  /* 4. Place any unattached tool/note cards in a clean row below */
  if (orphans.length) {
    let ox = startX;
    const oy = snap(globalMaxBottom + 44);
    for (const orph of orphans) {
      const ob = nodeBox(orph, false, true);
      const pt = orph.pinned ? { x: orph.x, y: orph.y } : { x: snap(ox), y: oy };
      positions.set(orph.id, pt);
      if (!orph.pinned) {
        orph.x = pt.x;
        orph.y = pt.y;
        delete orph.nudge;
      }
      ox += ob.w + 28;
    }
  }

  /* Clear stale manual waypoints between moved nodes so auto-routed curves flow cleanly */
  for (const edge of edges) {
    if (
      positions.has(edge.source) &&
      positions.has(edge.target) &&
      edge.waypoints?.length
    ) {
      edge.waypoints = [];
    }
  }

  /* Resize enclosing groups around their arranged members */
  const groupsToFit = targetGroup
    ? [targetGroup]
    : nodes.filter(
        (g) =>
          g.kind === "group" &&
          !g.collapsed &&
          members(fakeDoc, g.id).some((id) => positions.has(id)),
      );
  for (const grp of groupsToFit) {
    const mBoxes = members(fakeDoc, grp.id)
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is FlowNode => Boolean(n))
      .map((n) => nodeBox(n, false, true));
    if (mBoxes.length) {
      const mb = bounds(mBoxes);
      grp.x = snap(mb.x - 28);
      grp.y = snap(mb.y - 58);
      grp.width = mb.w + 56;
      grp.height = mb.h + 86;
    }
  }

  return positions;
}

/**
 * Toggles Mute (`paused`) or Bypass (`bypassed`) participation on target Agent nodes,
 * cycling back to `"global"` when all selected Agents are already in `mode`.
 */
export function toggleNodesParticipation(
  nodes: FlowNode[],
  targetIds: string[],
  mode: "paused" | "bypassed",
): "global" | "paused" | "bypassed" {
  const targetSet = new Set(targetIds);
  const agents = nodes.filter(
    (n) => n.kind === "agent" && targetSet.has(n.id),
  );
  if (!agents.length) return "global";
  const allAlreadyInMode = agents.every(
    (a) => (a.participation as string) === mode,
  );
  const nextMode = allAlreadyInMode ? "global" : mode;
  for (const ag of agents) {
    (ag as { participation: string }).participation = nextMode;
  }
  return nextMode;
}
