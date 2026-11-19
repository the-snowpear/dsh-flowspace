import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  GroupPort,
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
  index?: {
    nodes: Map<string, FlowNode>;
    ancestors: Map<string, FlowNode | undefined>;
    ports: Map<string, GroupPort[]>;
  },
): { x: number; y: number; groupId?: string; box: Box } {
  const node = index ? index.nodes.get(nodeId) : doc.nodes.find((n) => n.id === nodeId);
  if (!node) return { x: 0, y: 0, box: { x: 0, y: 0, w: 0, h: 0 } };
  const collapsed = index ? index.ancestors.get(nodeId) : collapsedAncestor(doc, nodeId);
  if (collapsed) {
    let allPorts = index?.ports.get(collapsed.id);
    if (!allPorts) {
      allPorts = inferGroupPorts(doc, collapsed).filter((p) => !p.hidden);
      index?.ports.set(collapsed.id, allPorts);
    }
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
  const box = nodeBox(node, lod, Boolean(node.window) || keepExpandedIds?.has(node.id));
  return {
    x: box.x + (direction === "out" ? box.w : 0),
    y: box.y + portY(node, kind, !!box.compact),
    box,
  };
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

/** Readable zoom band for freshly loaded workflows: well above the LOD fold threshold. */
export const COMFORT_ZOOM = { min: 0.82, max: 0.95 } as const;

/**
 * Like `fit`, but keeps the zoom inside `COMFORT_ZOOM` so a just-loaded workflow never
 * folds into LOD cards. Content larger than the viewport is anchored at its top-left
 * (inside the same insets as `fit`) instead of being shrunk.
 */
export function comfortableFit(
  viewport: { width: number; height: number },
  boxes: Box[],
): { x: number; y: number; zoom: number } {
  const target = fit(viewport, boxes, COMFORT_ZOOM.max);
  const minZoom = Math.max(COMFORT_ZOOM.min, LOD_ZOOM + 0.05);
  if (target.zoom >= minZoom) return target;
  const b = bounds(boxes);
  const availW = Math.max(120, viewport.width - 88);
  const availH = Math.max(120, viewport.height - 130);
  return {
    zoom: minZoom,
    x:
      b.w * minZoom <= availW
        ? 44 + (availW - b.w * minZoom) / 2 - b.x * minZoom
        : 44 - b.x * minZoom,
    y:
      b.h * minZoom <= availH
        ? 64 + (availH - b.h * minZoom) / 2 - b.y * minZoom
        : 64 - b.y * minZoom,
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

/** Horizontal / vertical clearance kept between a grown card and the cards it moves. */
const ROOM_GAP = 24;

function overlapArea(a: Box, b: Box, gap: number): number {
  const w = Math.min(a.x + a.w, b.x + b.w + gap) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h + gap) - Math.max(a.y, b.y);
  return w > 4 && h > 0 ? w * h : 0;
}

/**
 * A card grew (expanded, or switched into the wider live-chat form): move only the cards
 * it now covers out of its way. A card sitting beside it on the same row slides right,
 * a card underneath slides down, and displaced cards push their own neighbours in turn,
 * so a left-to-right pipeline stays a readable row. Enclosing groups grow to fit.
 * Every moved card / group remembers its original geometry for `giveRoomBack`.
 */
export function makeRoom(doc: FlowspaceDocument, expandedNode: FlowNode): void {
  const gap = ROOM_GAP;
  const origin = { x: expandedNode.x, y: expandedNode.y };
  const others = doc.nodes
    .filter(
      (other) =>
        other.id !== expandedNode.id &&
        other.kind !== "group" &&
        !other.window &&
        (other.y >= origin.y - 8 || other.x >= origin.x + 8),
    )
    .sort(
      (a, b) =>
        a.x - origin.x + (a.y - origin.y) - (b.x - origin.x + (b.y - origin.y)),
    );
  // Only the grown card and cards it displaced can push others, so unrelated
  // pre-existing overlaps are left exactly as the user arranged them.
  const pushers = new Map<string, Box>([
    [expandedNode.id, nodeBox(expandedNode, false, true)],
  ]);
  const moved = new Set<string>();
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const other of others) {
      const box = nodeBox(other, false, Boolean(other.pinned));
      let primary: Box | null = null;
      let best = 0;
      for (const [pid, s] of pushers) {
        if (pid === other.id) continue;
        const area = overlapArea(box, s, gap);
        if (area > best) {
          best = area;
          primary = s;
        }
      }
      if (!primary) continue;
      const beside = box.x >= primary.x + 24 && box.y < primary.y + primary.h * 0.5;
      if (!other.nudge) {
        other.nudge = { by: expandedNode.id, origX: other.x, origY: other.y };
      }
      if (beside) other.x = Math.max(other.x, primary.x + primary.w + gap);
      else other.y = Math.max(other.y, primary.y + primary.h + gap);
      changed = true;
      moved.add(other.id);
      pushers.set(other.id, nodeBox(other, false, Boolean(other.pinned)));
    }
    if (!changed) break;
  }
  // Grow every group that encloses the grown card or a displaced card.
  const groupIds = new Set<string>();
  for (const id of [expandedNode.id, ...moved]) {
    let parentId = doc.nodes.find((n) => n.id === id)?.parentId;
    while (parentId && !groupIds.has(parentId)) {
      groupIds.add(parentId);
      parentId = doc.nodes.find((n) => n.id === parentId)?.parentId;
    }
  }
  for (const gid of groupIds) {
    const g = doc.nodes.find((n) => n.id === gid && n.kind === "group");
    if (!g) continue;
    const memberIds = members(doc, g.id);
    const memberBoxes = doc.nodes
      .filter((n) => memberIds.includes(n.id))
      .map((n) =>
        nodeBox(n, false, n.id === expandedNode.id || Boolean(n.pinned)),
      );
    if (!memberBoxes.length) continue;
    const b = bounds(memberBoxes);
    const neededH = b.y + b.h + 28 - g.y;
    const neededW = b.x + b.w + 28 - g.x;
    if (neededH > g.height || neededW > g.width) {
      if (!g.nudge) {
        g.nudge = { by: expandedNode.id, origW: g.width, origH: g.height };
      }
      g.height = Math.max(g.height, neededH);
      g.width = Math.max(g.width, neededW);
    }
  }
}

export function giveRoomBack(
  doc: FlowspaceDocument,
  collapsedNode: FlowNode,
): void {
  for (const other of doc.nodes) {
    if (other.nudge?.by === collapsedNode.id) {
      if (other.nudge.origX !== undefined) other.x = other.nudge.origX;
      if (other.nudge.origY !== undefined) other.y = other.nudge.origY;
      if (other.nudge.origW !== undefined) other.width = other.nudge.origW;
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

