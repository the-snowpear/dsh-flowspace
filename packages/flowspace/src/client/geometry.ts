import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  GroupPort,
  Waypoint,
} from "../types.ts";
import { members } from "../core/document.ts";

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const MOTION = {
  tactile: 80,
  fast: 120,
  base: 180,
  region: 250,
  surface: 320,
  hero: 480,
  flash: 900,
};

/** Below this zoom unpinned cards fold to compact form and quiet wires step back. */
export const LOD_ZOOM = 0.5;

export const COMPACT_SIZE: Record<FlowNode["kind"], [number, number]> = {
  agent: [280, 118],
  note: [276, 98],
  file: [256, 82],
  display: [280, 126],
  board: [280, 100],
  detail: [280, 112],
  group: [312, 152],
  git: [280, 108],
  changes: [276, 104],
  terminal: [280, 108],
};

export const FULL_SIZE: Record<FlowNode["kind"], [number, number]> = {
  agent: [312, 392],
  note: [276, 200],
  file: [300, 286],
  display: [300, 252],
  board: [520, 310],
  detail: [340, 362],
  group: [1152, 474],
  git: [420, 410],
  changes: [360, 340],
  terminal: [380, 320],
};

export type CapsuleState = "pending" | "sent" | "updated" | "always";

export function capsuleStateOf(
  edge: FlowEdge,
  sourceVersions?: Record<string, string>,
): CapsuleState {
  if (edge.always) return "always";
  if (!edge.sentVersion) return "pending";
  const current = edge.currentVersion ?? sourceVersions?.[edge.source];
  if (current && current !== edge.sentVersion) return "updated";
  return "sent";
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  compact?: boolean;
}

const round = (value: number): number => Math.round(value * 10) / 10;

export function isCompactNode(
  node: FlowNode,
  lod = false,
  keepExpanded = false,
): boolean {
  if (node.kind === "group") return node.collapsed;
  if (!node.expanded) return true;
  if (lod && !node.pinned && !keepExpanded) return true;
  return false;
}

export function nodeBox(
  node: FlowNode,
  lod = false,
  keepExpanded = false,
): Box {
  if (node.kind === "group") return groupBox(node);
  const compact = isCompactNode(node, lod, keepExpanded);
  if (compact) {
    const [cw, ch] = COMPACT_SIZE[node.kind] ?? [280, 110];
    return { x: node.x, y: node.y, w: cw, h: ch, compact: true };
  }
  const [fw, fh] = FULL_SIZE[node.kind] ?? [320, 280];
  const inLiveChat =
    node.kind === "agent" &&
    Boolean(node.sessionId) &&
    (node.tab ?? "task") === "conversation";
  const minW = inLiveChat ? 420 : fw;
  const minH = inLiveChat ? 490 : fh;
  return {
    x: node.x,
    y: node.y,
    w: Math.max(node.width || fw, minW),
    h: Math.max(node.height || fh, minH),
    compact: false,
  };
}

export function groupBox(
  group: FlowNode,
  portRows = 2,
  context?: {
    doc: FlowspaceDocument;
    lod?: boolean;
    keepExpandedIds?: Set<string>;
  },
): Box {
  if (group.collapsed) {
    return {
      x: group.x,
      y: group.y,
      w: 312,
      h: 96 + Math.max(1, portRows) * 28,
      compact: true,
    };
  }
  const baseW = Math.max(260, group.width || 850);
  const baseH = Math.max(180, group.height || 474);
  if (!context?.doc) {
    return {
      x: group.x,
      y: group.y,
      w: baseW,
      h: baseH,
      compact: false,
    };
  }
  return expandedGroupBox(
    context.doc,
    group,
    context.lod ?? false,
    context.keepExpandedIds,
  );
}

/**
 * Computes an expanded group's bounding box while guaranteeing that mixed-LOD
 * pinned/waiting/selected expanded member cards (and nested child groups) never
 * overflow the right or bottom of the group frame.
 */
export function expandedGroupBox(
  doc: FlowspaceDocument,
  group: FlowNode,
  lod = false,
  keepExpandedIds?: Set<string>,
): Box {
  if (group.collapsed) {
    const ports = inferGroupPorts(doc, group).filter((p) => !p.hidden);
    const rows = Math.max(
      ports.filter((p) => p.direction === "in").length,
      ports.filter((p) => p.direction === "out").length,
    );
    return groupBox(group, rows);
  }
  const baseW = Math.max(260, group.width || 850);
  const baseH = Math.max(180, group.height || 474);
  const directChildren = doc.nodes.filter((n) => n.parentId === group.id);
  if (!directChildren.length) {
    return { x: group.x, y: group.y, w: baseW, h: baseH, compact: false };
  }
  const childBoxes: Box[] = directChildren.map((child) =>
    child.kind === "group"
      ? expandedGroupBox(doc, child, lod, keepExpandedIds)
      : nodeBox(
          child,
          lod,
          Boolean(child.pinned) || Boolean(keepExpandedIds?.has(child.id)),
        ),
  );
  const maxRight = Math.max(...childBoxes.map((b) => b.x + b.w));
  const maxBottom = Math.max(...childBoxes.map((b) => b.y + b.h));
  const pad = 24;
  return {
    x: group.x,
    y: group.y,
    w: Math.max(baseW, maxRight - group.x + pad),
    h: Math.max(
      lod ? 180 : baseH,
      maxBottom - group.y + pad,
    ),
    compact: false,
  };
}

export function bounds(boxes: Box[]): Box {
  if (!boxes.length) return { x: 0, y: 0, w: 1000, h: 600 };
  const x = Math.min(...boxes.map((b) => b.x)),
    y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
}

export function toWorld(
  view: { x: number; y: number; zoom: number },
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - view.x) / view.zoom,
    y: (clientY - rect.top - view.y) / view.zoom,
  };
}

/** Continuation ports sit on the header row; reference ports sit below it. */
export function portY(
  node: FlowNode,
  kind: "reference" | "continuation",
  compact: boolean,
): number {
  if (kind === "continuation") return compact ? 21 : 24;
  return compact ? (node.kind === "agent" ? 78 : 56) : 62;
}

export function inferGroupPorts(
  doc: FlowspaceDocument,
  group: FlowNode,
): GroupPort[] {
  const inside = new Set(members(doc, group.id));
  const inferred: GroupPort[] = [];
  for (const kind of ["reference", "continuation"] as const) {
    for (const direction of ["in", "out"] as const) {
      const matching = doc.edges.filter(
        (e) =>
          e.kind === kind &&
          (direction === "in"
            ? inside.has(e.target) && !inside.has(e.source)
            : inside.has(e.source) && !inside.has(e.target)),
      );
      for (const edge of matching) {
        const nodeId = direction === "in" ? edge.target : edge.source;
        const targetNode = doc.nodes.find((n) => n.id === nodeId);
        if (!targetNode) continue;
        if (
          !inferred.some(
            (p) =>
              p.kind === kind &&
              p.direction === direction &&
              p.nodes.includes(nodeId),
          )
        ) {
          inferred.push({
            id: `${kind}-${direction}-${nodeId}`,
            kind,
            direction,
            name: targetNode.title,
            nodes: [nodeId],
            hidden: false,
          });
        }
      }
    }
  }
  const agents = doc.nodes.filter(
    (n) => n.kind === "agent" && inside.has(n.id),
  );
  if (
    agents.length &&
    !inferred.some((p) => p.kind === "continuation" && p.direction === "in")
  ) {
    const roots = agents.filter(
      (n) =>
        !doc.edges.some(
          (e) =>
            e.kind === "continuation" &&
            e.target === n.id &&
            inside.has(e.source) &&
            e.trigger !== "off",
        ),
    );
    for (const n of roots.length ? roots : [agents[0]]) {
      inferred.push({
        id: `continuation-in-${n.id}`,
        kind: "continuation",
        direction: "in",
        name: n.title,
        nodes: [n.id],
        hidden: false,
      });
    }
  }
  if (
    agents.length &&
    !inferred.some((p) => p.kind === "continuation" && p.direction === "out")
  ) {
    const leaves = agents.filter(
      (n) =>
        !doc.edges.some(
          (e) =>
            e.kind === "continuation" &&
            e.source === n.id &&
            inside.has(e.target) &&
            e.trigger !== "off",
        ),
    );
    for (const n of leaves.length ? leaves : [agents[agents.length - 1]]) {
      inferred.push({
        id: `continuation-out-${n.id}`,
        kind: "continuation",
        direction: "out",
        name: n.title,
        nodes: [n.id],
        hidden: false,
      });
    }
  }
  const customized = group.ports ?? [];
  const mergedKeys = new Set(
    customized
      .filter((p) => p.nodes.length > 1)
      .flatMap((p) => p.nodes.map((id) => `${p.kind}-${p.direction}-${id}`)),
  );
  return [
    ...customized,
    ...inferred.filter(
      (p) =>
        !customized.some(
          (c) =>
            c.id === p.id ||
            (c.kind === p.kind &&
              c.direction === p.direction &&
              p.nodes.every((id) => c.nodes.includes(id))),
        ) && !mergedKeys.has(p.id),
    ),
  ];
}

export function collapsedAncestor(
  doc: FlowspaceDocument,
  nodeId: string,
): FlowNode | undefined {
  let current = doc.nodes.find((n) => n.id === nodeId);
  let collapsed: FlowNode | undefined;
  while (current?.parentId) {
    const parent = doc.nodes.find((n) => n.id === current!.parentId);
    if (!parent) break;
    if (parent.kind === "group" && parent.collapsed) collapsed = parent;
    current = parent;
  }
  return collapsed;
}

export function endpoint(
  doc: FlowspaceDocument,
  nodeId: string,
  kind: "reference" | "continuation",
  direction: "in" | "out",
  lod = false,
  keepExpandedIds?: Set<string>,
): { x: number; y: number; groupId?: string; box: Box } {
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) return { x: 0, y: 0, box: { x: 0, y: 0, w: 0, h: 0 } };
  const collapsed = collapsedAncestor(doc, nodeId);
  if (collapsed) {
    const allPorts = inferGroupPorts(doc, collapsed).filter((p) => !p.hidden);
    const dirPorts = allPorts.filter((p) => p.direction === direction);
    const rows = Math.max(
      allPorts.filter((p) => p.direction === "in").length,
      allPorts.filter((p) => p.direction === "out").length,
    );
    const idx = Math.max(
      0,
      dirPorts.findIndex((p) => p.kind === kind && p.nodes.includes(nodeId)),
    );
    const box = groupBox(collapsed, rows);
    return {
      x: direction === "out" ? box.x + box.w : box.x,
      y: box.y + 80 + idx * 28,
      groupId: collapsed.id,
      box,
    };
  }
  const box = nodeBox(node, lod, keepExpandedIds?.has(node.id));
  return {
    x: box.x + (direction === "out" ? box.w : 0),
    y: box.y + portY(node, kind, !!box.compact),
    box,
  };
}

function rounded(points: { x: number; y: number }[], radius = 16): string {
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1],
      corner = points[i],
      after = points[i + 1];
    const inLen = Math.hypot(corner.x - before.x, corner.y - before.y) || 1,
      outLen = Math.hypot(after.x - corner.x, after.y - corner.y) || 1,
      r = Math.min(radius, inLen / 2, outLen / 2);
    path += ` L ${round(corner.x - ((corner.x - before.x) / inLen) * r)} ${round(corner.y - ((corner.y - before.y) / inLen) * r)} Q ${round(corner.x)} ${round(corner.y)} ${round(corner.x + ((after.x - corner.x) / outLen) * r)} ${round(corner.y + ((after.y - corner.y) / outLen) * r)}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${round(last.x)} ${round(last.y)}`;
}

function computeChainTangents(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  const n = pts.length;
  return pts.map((curr, i) => {
    if (i === 0 || i === n - 1) {
      return { x: 1, y: 0 };
    }
    const prev = pts[i - 1];
    const next = pts[i + 1];
    const inDx = curr.x - prev.x;
    const inDy = curr.y - prev.y;
    const inLen = Math.hypot(inDx, inDy) || 1;
    const outDx = next.x - curr.x;
    const outDy = next.y - curr.y;
    const outLen = Math.hypot(outDx, outDy) || 1;
    const bx = inDx / inLen + outDx / outLen;
    const by = inDy / inLen + outDy / outLen;
    const bLen = Math.hypot(bx, by);
    if (bLen > 1e-3) {
      return { x: bx / bLen, y: by / bLen };
    }
    return { x: -inDy / inLen, y: inDx / inLen };
  });
}

function cubicPoint(
  p0: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return {
    x: b0 * p0.x + b1 * c1.x + b2 * c2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * c1.y + b2 * c2.y + b3 * p3.y,
  };
}

function distToSegmentSquared(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-6) {
    return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  }
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return (p.x - projX) ** 2 + (p.y - projY) ** 2;
}

export function route(
  from: { x: number; y: number; box?: Box },
  to: { x: number; y: number; box?: Box },
  waypoints: Waypoint[] = [],
): { path: string; label: { x: number; y: number }; tight: boolean } {
  const pts = [from, ...waypoints, to];
  if (pts.length === 2 && to.x < from.x + 24) {
    const a = from.box ?? { x: from.x, y: from.y, w: 0, h: 0 },
      b = to.box ?? { x: to.x, y: to.y, w: 0, h: 0 },
      stub = 28;
    const lane =
      a.y + a.h + 24 <= b.y
        ? (a.y + a.h + b.y) / 2
        : b.y + b.h + 24 <= a.y
          ? (b.y + b.h + a.y) / 2
          : Math.max(a.y + a.h, b.y + b.h) + 38;
    const x1 = from.x + stub,
      x2 = to.x - stub;
    return {
      path: rounded(
        [
          from,
          { x: x1, y: from.y },
          { x: x1, y: lane },
          { x: x2, y: lane },
          { x: x2, y: to.y },
          to,
        ],
        18,
      ),
      label: { x: (x1 + x2) / 2, y: lane },
      tight: Math.abs(x1 - x2) < 140,
    };
  }

  if (pts.length === 2) {
    const reach = clamp(Math.abs(to.x - from.x) * 0.48, 36, 180);
    const c1 = { x: from.x + reach, y: from.y };
    const c2 = { x: to.x - reach, y: to.y };
    const mid = cubicPoint(from, c1, c2, to, 0.5);
    return {
      path: `M ${round(from.x)} ${round(from.y)} C ${round(c1.x)} ${round(c1.y)}, ${round(c2.x)} ${round(c2.y)}, ${round(to.x)} ${round(to.y)}`,
      label: { x: round(mid.x), y: round(mid.y) },
      tight: Math.hypot(to.x - from.x, to.y - from.y) < 148,
    };
  }

  /* C1-smooth tangent routing across 1+ waypoints (supports both forward & cyclic backward loops without twists) */
  const tangents = computeChainTangents(pts);
  let path = `M ${round(from.x)} ${round(from.y)}`;
  let bestLabelSegLen = -1;
  let label = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const tA = tangents[i - 1];
    const tB = tangents[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const isFirstBackward = i === 1 && b.x < a.x + 16;
    const isLastBackward = i === pts.length - 1 && b.x < a.x + 16;
    const reachA = isFirstBackward
      ? clamp(segLen * 0.44, 44, 150)
      : clamp(segLen * 0.36, 24, 160);
    const reachB = isLastBackward
      ? clamp(segLen * 0.44, 44, 150)
      : clamp(segLen * 0.36, 24, 160);
    const c1 = { x: a.x + tA.x * reachA, y: a.y + tA.y * reachA };
    const c2 = { x: b.x - tB.x * reachB, y: b.y - tB.y * reachB };
    path += ` C ${round(c1.x)} ${round(c1.y)}, ${round(c2.x)} ${round(c2.y)}, ${round(b.x)} ${round(b.y)}`;
    if (segLen > bestLabelSegLen) {
      bestLabelSegLen = segLen;
      const mid = cubicPoint(a, c1, c2, b, 0.5);
      label = { x: round(mid.x), y: round(mid.y) };
    }
  }
  return {
    path,
    label,
    tight: bestLabelSegLen < 120,
  };
}

/**
 * Inserts a new waypoint into the exact wire segment closest to `clickPt`
 * (sampling rendered Bezier / loop curves rather than blindly appending to the end).
 */
export function insertWaypointAtClosestSegment(
  points: Waypoint[],
  clickPt: Waypoint,
  existingWaypoints?: Waypoint[],
): Waypoint[] {
  const wp: Waypoint = { x: round(clickPt.x), y: round(clickPt.y) };
  const base =
    existingWaypoints !== undefined
      ? [...existingWaypoints]
      : points.length >= 2
        ? points.slice(1, -1)
        : [];
  if (points.length < 2) {
    return [...base, wp];
  }
  const chain: Waypoint[] =
    existingWaypoints !== undefined &&
    points.length === 2 &&
    existingWaypoints.length > 0
      ? [points[0], ...existingWaypoints, points[1]]
      : points;

  if (chain.length <= 2) {
    return [wp];
  }

  const tangents = computeChainTangents(chain);
  let bestSegIdx = base.length;
  let bestDistSq = Infinity;
  const samples = 12;

  for (let seg = 0; seg < chain.length - 1; seg++) {
    const a = chain[seg];
    const b = chain[seg + 1];
    const tA = tangents[seg];
    const tB = tangents[seg + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const reachA =
      seg === 0 && b.x < a.x + 16
        ? clamp(segLen * 0.44, 44, 150)
        : clamp(segLen * 0.36, 24, 160);
    const reachB =
      seg === chain.length - 2 && b.x < a.x + 16
        ? clamp(segLen * 0.44, 44, 150)
        : clamp(segLen * 0.36, 24, 160);
    const c1 = { x: a.x + tA.x * reachA, y: a.y + tA.y * reachA };
    const c2 = { x: b.x - tB.x * reachB, y: b.y - tB.y * reachB };

    let prevSample = a;
    for (let s = 1; s <= samples; s++) {
      const currSample = cubicPoint(a, c1, c2, b, s / samples);
      const dSq = distToSegmentSquared(clickPt, prevSample, currSample);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestSegIdx = seg;
      }
      prevSample = currSample;
    }
  }

  const insertIdx = clamp(bestSegIdx, 0, base.length);
  return [...base.slice(0, insertIdx), wp, ...base.slice(insertIdx)];
}

/**
 * Computes the top-left world position `{ x, y }` for a node spawned by dropping
 * a wire onto empty canvas so its receiving port aligns cleanly with `dropPt`
 * (and magnetically snaps straight horizontally with the upstream port within 36px,
 * eliminating the 172px upward S-bend on horizontal continuation chains).
 */
export function alignedWireDropPosition(
  sourceBox: Box,
  sourcePortKind: "reference" | "continuation",
  dropPt: { x: number; y: number },
  targetKind: FlowNode["kind"] = "agent",
  opts?: {
    direction?: "out" | "in";
    sourceKind?: FlowNode["kind"];
    targetCompact?: boolean;
    snapGrid?: number;
  },
): { x: number; y: number } {
  const direction = opts?.direction ?? "out";
  const sourceKind = opts?.sourceKind ?? "agent";
  const targetCompact =
    opts?.targetCompact ??
    !(
      targetKind === "agent" ||
      targetKind === "note" ||
      targetKind === "display" ||
      targetKind === "board" ||
      targetKind === "detail" ||
      targetKind === "git"
    );
  const grid = opts?.snapGrid ?? 12;

  const sourcePortOffset = portY(
    { kind: sourceKind } as FlowNode,
    sourcePortKind,
    Boolean(sourceBox.compact),
  );
  const sourcePortY = sourceBox.y + sourcePortOffset;

  const targetPortOffset = portY(
    { kind: targetKind } as FlowNode,
    sourcePortKind,
    targetCompact,
  );
  const [targetW] = targetCompact
    ? (COMPACT_SIZE[targetKind] ?? [280, 118])
    : (FULL_SIZE[targetKind] ?? [312, 392]);

  const rawX =
    direction === "out"
      ? dropPt.x > sourceBox.x + sourceBox.w - 24
        ? Math.max(dropPt.x, sourceBox.x + sourceBox.w + 56)
        : dropPt.x
      : dropPt.x < sourceBox.x + 24
        ? Math.min(dropPt.x - targetW, sourceBox.x - targetW - 56)
        : dropPt.x - targetW;

  const alignedY =
    Math.abs(dropPt.y - sourcePortY) <= 36
      ? sourcePortY - targetPortOffset
      : dropPt.y - targetPortOffset;

  const snapVal = (v: number) => (grid > 1 ? Math.round(v / grid) * grid : round(v));
  return {
    x: snapVal(rawX),
    y:
      Math.abs(dropPt.y - sourcePortY) <= 36
        ? round(alignedY)
        : snapVal(alignedY),
  };
}

export function exchangeRoute(
  a: Box,
  b: Box,
): {
  out: string;
  back: string;
  side: boolean;
  label: { x: number; y: number };
} {
  const row = b.y < a.y + a.h - 4 && a.y < b.y + b.h - 4;
  const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    gap = b.y >= a.y ? b.y - a.y - a.h : a.y - b.y - b.h;
  const side = !row && overlap > 40 && gap < 70;
  const facing = (box: Box, other: Box): number =>
    clamp(other.x + other.w / 2, box.x + 28, box.x + box.w - 28);
  let p: { x: number; y: number },
    q: { x: number; y: number },
    c1: { x: number; y: number },
    c2: { x: number; y: number };
  if (side) {
    p = { x: a.x + a.w, y: a.y + a.h / 2 };
    q = { x: b.x + b.w, y: b.y + b.h / 2 };
    const out = Math.max(p.x, q.x) + clamp(Math.abs(q.y - p.y) * 0.35, 30, 56);
    c1 = { x: out, y: p.y };
    c2 = { x: out, y: q.y };
  } else if (row) {
    p = { x: facing(a, b), y: a.y + a.h };
    q = { x: facing(b, a), y: b.y + b.h };
    const dip = clamp(Math.abs(q.x - p.x) * 0.2, 30, 84),
      lean = (q.x - p.x) * 0.18;
    c1 = { x: p.x + lean, y: p.y + dip };
    c2 = { x: q.x - lean, y: q.y + dip };
  } else {
    const down = b.y >= a.y;
    p = { x: facing(a, b), y: down ? a.y + a.h : a.y };
    q = { x: facing(b, a), y: down ? b.y : b.y + b.h };
    const half = (q.y - p.y) / 2;
    c1 = { x: p.x, y: p.y + half };
    c2 = { x: q.x, y: q.y - half };
  }
  const dx = q.x - p.x,
    dy = q.y - p.y,
    len = Math.hypot(dx, dy) || 1,
    nx = -dy / len,
    ny = dx / len,
    bow = Math.min(clamp(len * 0.09, 9, 20), len / 2);
  const strand = (k: number) => {
    const sx = Math.sign(dx) || 1,
      sy = Math.sign(dy) || 1,
      sn = Math.sign(nx) || 1;
    const start = side
      ? { x: 0, y: 3.5 * k * sy }
      : row
        ? { x: -3.5 * k * sx, y: 0 }
        : { x: 3.5 * k * sn, y: 0 };
    const end = side
      ? { x: 0, y: -3.5 * k * sy }
      : row
        ? { x: 3.5 * k * sx, y: 0 }
        : start;
    return [
      { x: p.x + start.x, y: p.y + start.y },
      { x: c1.x + nx * bow * k, y: c1.y + ny * bow * k },
      { x: c2.x + nx * bow * k, y: c2.y + ny * bow * k },
      { x: q.x + end.x, y: q.y + end.y },
    ];
  };
  const cubic = (pts: { x: number; y: number }[]) =>
    `M ${round(pts[0].x)} ${round(pts[0].y)} C ${pts
      .slice(1)
      .map((pt) => `${round(pt.x)} ${round(pt.y)}`)
      .join(", ")}`;
  return {
    out: cubic(strand(1)),
    back: cubic(strand(-1).toReversed()),
    side,
    label: {
      x: (p.x + 3 * c1.x + 3 * c2.x + q.x) / 8 + (side ? 14 : 0),
      y: (p.y + 3 * c1.y + 3 * c2.y + q.y) / 8,
    },
  };
}

export function fit(
  viewport: { width: number; height: number },
  boxes: Box[],
  maxZoom = 1,
): { x: number; y: number; zoom: number } {
  const topInset = 64;
  const bottomInset = 66;
  const sideInset = 44;
  const availW = Math.max(120, viewport.width - sideInset * 2);
  const availH = Math.max(120, viewport.height - topInset - bottomInset);
  const box = bounds(boxes);
  const zoom = clamp(
    Math.min(availW / Math.max(box.w, 1), availH / Math.max(box.h, 1)),
    0.2,
    maxZoom,
  );
  return {
    x: sideInset + (availW - box.w * zoom) / 2 - box.x * zoom,
    y: topInset + (availH - box.h * zoom) / 2 - box.y * zoom,
    zoom,
  };
}

export function zoomAt(
  view: { x: number; y: number; zoom: number },
  rect: DOMRect,
  clientX: number,
  clientY: number,
  factor: number,
): { x: number; y: number; zoom: number } {
  const px = clientX - rect.left,
    py = clientY - rect.top,
    zoom = clamp(view.zoom * factor, 0.2, 2.2);
  return {
    x: px - ((px - view.x) * zoom) / view.zoom,
    y: py - ((py - view.y) * zoom) / view.zoom,
    zoom,
  };
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (x: number): number => {
    let lo = 0,
      hi = 1,
      t = x;
    const val = (a: number, b: number, u: number) =>
      3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
    for (let i = 0; i < 16; i++) {
      const v = val(x1, x2, t);
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return val(y1, y2, t);
  };
}
export const easeView = bezier(0.32, 0.72, 0, 1);

/** Expanding a card nudges only cards below it that would overlap, and grows its group; collapsing restores both. */
export function makeRoom(doc: FlowspaceDocument, expandedNode: FlowNode): void {
  const gap = 24;
  const settled: Box[] = [nodeBox(expandedNode, false, true)];
  const below = doc.nodes
    .filter(
      (other) =>
        other.id !== expandedNode.id &&
        other.kind !== "group" &&
        !other.window &&
        other.y >= expandedNode.y - 8,
    )
    .sort((a, b) => a.y - b.y);
  for (const other of below) {
    const box = nodeBox(other, false, Boolean(other.pinned));
    const overlaps = settled.filter(
      (s) =>
        box.x < s.x + s.w - 4 &&
        box.x + box.w > s.x + 4 &&
        box.y < s.y + s.h + gap &&
        box.y + box.h > s.y,
    );
    if (!overlaps.length) continue;
    const nextY = Math.max(...overlaps.map((s) => s.y + s.h + gap));
    if (nextY > other.y) {
      if (!other.nudge) other.nudge = { by: expandedNode.id, origY: other.y };
      other.y = nextY;
    }
    settled.push(nodeBox(other, false, Boolean(other.pinned)));
  }
  let parentId = expandedNode.parentId;
  while (parentId) {
    const g = doc.nodes.find((n) => n.id === parentId && n.kind === "group");
    if (!g) break;
    const memberIds = members(doc, g.id);
    const memberBoxes = doc.nodes
      .filter((n) => memberIds.includes(n.id))
      .map((n) =>
        nodeBox(n, false, n.id === expandedNode.id || Boolean(n.pinned)),
      );
    if (memberBoxes.length) {
      const b = bounds(memberBoxes);
      const neededH = b.y + b.h + 28 - g.y;
      const neededW = b.x + b.w + 28 - g.x;
      if (neededH > g.height) {
        if (!g.nudge) g.nudge = { by: expandedNode.id, origH: g.height };
        g.height = neededH;
      }
      if (neededW > g.width) g.width = neededW;
    }
    parentId = g.parentId;
  }
}

export function giveRoomBack(
  doc: FlowspaceDocument,
  collapsedNode: FlowNode,
): void {
  for (const other of doc.nodes) {
    if (other.nudge?.by === collapsedNode.id) {
      if (other.nudge.origY !== undefined) other.y = other.nudge.origY;
      if (other.nudge.origH !== undefined) other.height = other.nudge.origH;
      delete other.nudge;
    }
  }
}

export interface HubSatelliteItem {
  edge: FlowEdge;
  sourceNode: FlowNode;
  index: number;
  total: number;
  cx: number;
  cy: number;
  targetCx: number;
  targetCy: number;
  w: number;
  h: number;
  scale: number;
  opacity: number;
  wireIn: { x: number; y: number; box: Box };
  wireOut: { x: number; y: number };
}

export interface InputHubLayout {
  nodeId: string;
  kind: "reference" | "continuation";
  portPoint: { x: number; y: number; box: Box };
  progress: number;
  satellites: HubSatelliteItem[];
  corridorBox: Box;
}

/**
 * Computes the multi-input hover fan-out ("one input = one draggable mini-node")
 * sorted top-to-bottom by upstream Y so bundled wires uncross cleanly.
 */
export function computeInputHubLayout(params: {
  doc: FlowspaceDocument;
  nodeId: string;
  kind: "reference" | "continuation";
  progress: number;
  closing?: boolean;
  reducedMotion?: boolean;
  excludeEdgeId?: string;
  lod?: boolean;
  keepExpandedIds?: Set<string>;
  isNodeVisible?: (node: FlowNode | undefined, allowCollapsedChild?: boolean) => boolean;
}): InputHubLayout | null {
  const {
    doc,
    nodeId,
    kind,
    progress,
    closing = false,
    reducedMotion = false,
    excludeEdgeId,
    lod = false,
    keepExpandedIds,
    isNodeVisible,
  } = params;
  const targetNode = doc.nodes.find((n) => n.id === nodeId);
  if (!targetNode || (isNodeVisible && !isNodeVisible(targetNode))) return null;

  const incoming = doc.edges
    .filter(
      (e) =>
        e.target === nodeId &&
        e.kind === kind &&
        e.id !== excludeEdgeId,
    )
    .map((edge) => {
      const sourceNode = doc.nodes.find((n) => n.id === edge.source);
      if (!sourceNode || (isNodeVisible && !isNodeVisible(sourceNode, true))) {
        return null;
      }
      const srcOut = endpoint(doc, sourceNode.id, kind, "out", lod, keepExpandedIds);
      return { edge, sourceNode, srcOut };
    })
    .filter(
      (item): item is { edge: FlowEdge; sourceNode: FlowNode; srcOut: { x: number; y: number; box: Box } } =>
        item !== null,
    )
    .sort(
      (a, b) =>
        a.srcOut.y - b.srcOut.y ||
        a.srcOut.x - b.srcOut.x ||
        a.edge.id.localeCompare(b.edge.id),
    );

  if (incoming.length < 2) return null;

  const portPoint = endpoint(doc, nodeId, kind, "in", lod, keepExpandedIds);
  const satW = 148;
  const satH = 30;
  const stepY = 38;
  const total = incoming.length;
  const clampedP = clamp(progress, 0, 1);

  const satellites: HubSatelliteItem[] = incoming.map((item, index) => {
    const offset = index - (total - 1) / 2;
    const arcX = Math.abs(offset) * 7.5;
    const targetCx = portPoint.x - 104 - arcX;
    const targetCy = portPoint.y + offset * stepY;

    const stagger = reducedMotion ? 0 : Math.min(0.24, index * 0.055);
    const u =
      stagger >= 1
        ? clampedP
        : clamp((clampedP - stagger) / (1 - stagger), 0, 1);

    const spatialP = reducedMotion
      ? u
      : closing
        ? 1 - (1 - u) ** 3
        : u === 0 || u === 1
          ? u
          : 1 + 1.42 * (u - 1) ** 3 + 0.42 * (u - 1) ** 2;

    const cx = portPoint.x + (targetCx - portPoint.x) * spatialP;
    const cy = portPoint.y + (targetCy - portPoint.y) * spatialP;
    const halfW = (satW / 2) * u;
    const box: Box = {
      x: cx - halfW,
      y: cy - (satH / 2) * u,
      w: halfW * 2,
      h: satH * u,
    };
    return {
      edge: item.edge,
      sourceNode: item.sourceNode,
      index,
      total,
      cx,
      cy,
      targetCx,
      targetCy,
      w: satW,
      h: satH,
      scale: reducedMotion ? 1 : 0.56 + 0.44 * Math.max(0, spatialP),
      opacity: clamp(u * 1.35, 0, 1),
      wireIn: { x: cx - halfW, y: cy, box },
      wireOut: { x: cx + halfW, y: cy },
    };
  });

  const minX = Math.min(...satellites.map((s) => s.targetCx - satW / 2)) - 18;
  const maxX = portPoint.x + 20;
  const minY =
    Math.min(portPoint.y - 22, ...satellites.map((s) => s.targetCy - satH / 2)) -
    16;
  const maxY =
    Math.max(portPoint.y + 22, ...satellites.map((s) => s.targetCy + satH / 2)) +
    16;

  return {
    nodeId,
    kind,
    portPoint,
    progress: clampedP,
    satellites,
    corridorBox: {
      x: minX,
      y: minY,
      w: Math.max(40, maxX - minX),
      h: Math.max(40, maxY - minY),
    },
  };
}

export function hubFilamentPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const dx = Math.max(14, Math.abs(to.x - from.x) * 0.56);
  return `M ${round(from.x)} ${round(from.y)} C ${round(from.x + dx)} ${round(from.y)}, ${round(to.x - dx)} ${round(to.y)}, ${round(to.x)} ${round(to.y)}`;
}

