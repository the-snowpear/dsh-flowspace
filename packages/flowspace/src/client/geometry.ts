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
export const LOD_ZOOM = 0.7;

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
  const minW = node.kind === "agent" && node.sessionId ? 420 : fw;
  const minH = node.kind === "agent" && node.sessionId ? 490 : fh;
  return {
    x: node.x,
    y: node.y,
    w: Math.max(node.width || fw, minW),
    h: Math.max(node.height || fh, minH),
    compact: false,
  };
}

export function groupBox(group: FlowNode, portRows = 2): Box {
  if (group.collapsed) {
    return {
      x: group.x,
      y: group.y,
      w: 312,
      h: 96 + Math.max(1, portRows) * 28,
      compact: true,
    };
  }
  return {
    x: group.x,
    y: group.y,
    w: Math.max(260, group.width || 850),
    h: Math.max(180, group.height || 474),
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

export function route(
  from: { x: number; y: number; box?: Box },
  to: { x: number; y: number; box?: Box },
  waypoints: Waypoint[] = [],
): { path: string; label: { x: number; y: number }; tight: boolean } {
  const pts = [from, ...waypoints, to];
  if (pts.length === 2 && to.x < from.x + 24) {
    const a = from.box ?? { x: from.x, y: from.y, w: 0, h: 0 },
      b = to.box ?? { x: to.x, y: to.y, w: 0, h: 0 },
      stub = 22;
    const lane =
      a.y + a.h + 20 <= b.y
        ? (a.y + a.h + b.y) / 2
        : b.y + b.h + 20 <= a.y
          ? (b.y + b.h + a.y) / 2
          : Math.max(a.y + a.h, b.y + b.h) + 34;
    const x1 = from.x + stub,
      x2 = to.x - stub;
    return {
      path: rounded([
        from,
        { x: x1, y: from.y },
        { x: x1, y: lane },
        { x: x2, y: lane },
        { x: x2, y: to.y },
        to,
      ]),
      label: { x: (x1 + x2) / 2, y: lane },
      tight: Math.abs(x1 - x2) < 140,
    };
  }
  let path = `M ${round(from.x)} ${round(from.y)}`;
  let label = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      reach = clamp(Math.abs(b.x - a.x) * 0.48, 36, 180);
    path += ` C ${round(a.x + reach)} ${round(a.y)}, ${round(b.x - reach)} ${round(b.y)}, ${round(b.x)} ${round(b.y)}`;
    if (i === Math.ceil((pts.length - 1) / 2)) {
      label = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }
  return { path, label, tight: Math.abs(to.x - from.x) < 140 };
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
    back: cubic(strand(-1).reverse()),
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
  const bottomInset = 58;
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
  const settled: Box[] = [nodeBox(expandedNode)];
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
    const box = nodeBox(other);
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
    settled.push(nodeBox(other));
  }
  let parentId = expandedNode.parentId;
  while (parentId) {
    const g = doc.nodes.find((n) => n.id === parentId && n.kind === "group");
    if (!g) break;
    const memberIds = members(doc, g.id);
    const memberBoxes = doc.nodes
      .filter((n) => memberIds.includes(n.id))
      .map((n) => nodeBox(n));
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
