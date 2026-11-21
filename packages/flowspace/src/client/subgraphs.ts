import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  GroupPort,
} from "../types.ts";
import { groupDescendants, uid } from "../core/document.ts";
import { bounds, expandedGroupBox, groupBox, nodeBox, type Box } from "./geometry.ts";
import { authoredPairHeight, remapLaneNode } from "./laneIds.ts";

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
  pairBoundaryEdges?: FlowEdge[];
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
  delete clone.generatedBy;
  delete clone.generatedRevision;
  delete clone.masterEdgeId;
  delete clone.itemKey;
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
  const pairOf = new Map<string, FlowNode>();
  for (const group of doc.nodes) if (group.fanout) {
    pairOf.set(group.fanout.fanId, group);
    pairOf.set(group.fanout.mergeId, group);
  }
  for (const id of selectedIds) {
    const node = pairOf.get(id) ?? doc.nodes.find((n) => n.id === id);
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
  const selected = collectExpandedSelectionIds(doc, selectedNodeIds);
  const selectedNodes = doc.nodes.filter(n => selected.has(n.id) && !(n.generatedBy && selected.has(n.generatedBy)));
  if (!selectedNodes.length) return null;
  const inside = new Set(selectedNodes.map(node => node.id));
  const pairedMembers = new Set(selectedNodes.filter(node => node.fanout).flatMap(node => groupDescendants(doc, node.id)));

  const boxes = selectedNodes.map((n) =>
    n.kind === "group" ? expandedGroupBox(doc, n) : nodeBox(n, false, true),
  );
  const b = bounds(boxes);

  const nodes = selectedNodes.map((n) => {
    const clone = structuredClone(n);
    if (clone.fanout) clone.height = authoredPairHeight(n, doc.nodes);
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
        e.kind === "reference" && !(e.generatedBy && selected.has(e.generatedBy)) &&
        !inside.has(e.source) &&
        inside.has(e.target),
    )
    .map((e) => structuredClone(e));
  const pairBoundaryEdges = doc.edges.filter(edge => !edge.generatedBy &&
    (inside.has(edge.source) ? !inside.has(edge.target) && pairedMembers.has(edge.source) :
      edge.kind !== "reference" && inside.has(edge.target) && pairedMembers.has(edge.target)))
    .map(edge => structuredClone(edge));

  return {
    kind: "flowspace-subgraph",
    version: 1,
    copiedAt: Date.now(),
    anchor: { x: b.x, y: b.y },
    nodes,
    internalEdges,
    incomingRefEdges,
    ...(pairBoundaryEdges.length ? { pairBoundaryEdges } : {}),
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
    remapLaneNode(clone, idMap);
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
    if (clone.staffOf) {
      // A copied role follows a copied team; next to the original team it takes a fresh slot name.
      if (idMap.has(clone.staffOf)) clone.staffOf = idMap.get(clone.staffOf);
      else {
        if (!existingIds.has(clone.staffOf)) delete clone.staffOf;
        delete clone.slotId;
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

  const boundaryCopies = (clipboard.pairBoundaryEdges ?? []).flatMap(edge => {
    const source = idMap.get(edge.source) ?? (existingIds.has(edge.source) ? edge.source : undefined);
    const target = idMap.get(edge.target) ?? (existingIds.has(edge.target) ? edge.target : undefined);
    return source && target ? [sanitizeClonedEdge(edge, source, target, 0, 0, false)] : [];
  });
  const createdEdges = [...createdInternalEdges, ...createdExternalRefs, ...boundaryCopies];
  const copiedIds = new Set(idMap.values());
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
      .filter((n) => n.kind === "group" && (!n.parentId || !copiedIds.has(n.parentId)))
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
