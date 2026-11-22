import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  GroupPort,
} from "../types.ts";
import { DEFAULT_NODE_FULL_SIZE, groupDescendants, members } from "../core/document.ts";
import { judges } from "../core/nodes/judge/index.ts";
import { DEFAULT_FLOW_SIZE, descriptorOf, portsOf, sizeOf } from "../core/nodes/registry.ts";
import { dataMode } from "../core/nodes/data/descriptors.ts";
import { t } from "./i18n.ts";
import { bounds, type Box } from "./boxes.ts";
export { bounds, type Box } from "./boxes.ts";

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
export const BOARD_MIN_SIZE = [320, 280] as const;

export const COMPACT_SIZE: Record<FlowNode["kind"], [number, number]> = {
  agent: [280, 118],
  note: [276, 98],
  file: [256, 82],
  display: [280, 126],
  board: [280, 112],
  detail: [280, 112],
  group: [312, 152],
  git: [280, 108],
  changes: [276, 104],
  terminal: [280, 108],
  role: [252, 96],
  flow: DEFAULT_FLOW_SIZE.compact,
};

export const FULL_SIZE: Record<FlowNode["kind"], [number, number]> = DEFAULT_NODE_FULL_SIZE;

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

// Every flow card is header 48 → summary band 48 → outlet rows → work area, so answering a
// question or growing a preview never moves an outlet socket.
const judgeTypes = new Set([...judges.map(judge => judge.flowType), "flowspace/merge-sort"]);
const rowHeight = 32;
const branchTop = (_node: FlowNode) => 1 + 48 + 48;
/** World-space top of the first outlet row inside a full flow card. */
export const flowBranchTop = branchTop;
const branchBottom = (height: number) => height - 1 - 12;

function judgeHeight(node: FlowNode, minHeight: number) {
  const rows = portsOf(node).filter(port => port.direction === "out").length;
  return clamp(Math.max(node.height ?? 0, branchTop(node) + rows * rowHeight + 13), minHeight, 480);
}

/** Total card height for the currently visible preview lines, footnotes and trial button. */
export function dataCardHeight(node: FlowNode, lines: number, notes: number, button: boolean): number {
  const ports = portsOf(node).filter(port => port.direction === "out").length;
  const blocks = Number(lines > 0) + notes + Number(button);
  const preview = (lines ? Math.min(6, lines) * 16 + 18 : 0) + notes * 16 + (button ? 28 : 0) + blocks * 4;
  return clamp(Math.max(node.height, branchTop(node) + ports * rowHeight + 12 + preview), 200, 480);
}

export function nodeBox(
  node: FlowNode,
  lod = false,
  keepExpanded = false,
  previewHeight?: number,
): Box {
  if (node.kind === "group") return groupBox(node);
  const compact = isCompactNode(node, lod, keepExpanded);
  const flowSize = node.kind === "flow" ? sizeOf(node, compact) : undefined;
  if (compact) {
    const [cw, ch] = flowSize ?? COMPACT_SIZE[node.kind] ?? [280, 110];
    return { x: node.x, y: node.y, w: cw, h: ch, compact: true };
  }
  const [fw, fh] = flowSize ?? FULL_SIZE[node.kind] ?? [320, 280];
  const inLiveChat =
    node.kind === "agent" &&
    Boolean(node.sessionId) &&
    (node.tab ?? "task") === "conversation";
  const minW = inLiveChat ? 420 : node.kind === "board" ? BOARD_MIN_SIZE[0] : fw;
  const minH = inLiveChat ? 490 : node.kind === "board" ? BOARD_MIN_SIZE[1] : fh;
  const data = node.kind === "flow" && descriptorOf(node.flowType)?.family === "data";
  // Keep the six-line preview below the outlet rows at the same world coordinates as portY.
  const dataHeight = data ? previewHeight ?? dataCardHeight(node, 6, 1, dataMode(node) === "ai") : 0;
  return {
    x: node.x,
    y: node.y,
    w: Math.max(node.width || fw, minW),
    h: data || previewHeight !== undefined ? clamp(Math.max(node.height || fh, dataHeight, previewHeight ?? 0), minH, 480) :
      node.flowType && judgeTypes.has(node.flowType) ? judgeHeight(node, minH) : Math.max(node.height || fh, minH),
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

/** World-space offsets include the card border above the header and body. */
export function portY(
  node: FlowNode,
  kind: FlowEdge["kind"],
  compact: boolean,
  portId?: string,
  scrollTop = 0,
  height?: number,
  direction?: "in" | "out",
): number {
  const border = 1;
  if (node.kind === "flow" && portId) {
    const ports = portsOf(node);
    const outputs = ports.filter(port => port.direction === "out");
    const index = direction === "in" ? -1 : outputs.findIndex(port => port.id === portId && port.role === kind);
    if (index >= 0) {
      if (compact) return border + 12 + (index + 0.5) * 70 / outputs.length;
      const center = branchTop(node) + (index + 0.5) * rowHeight - scrollTop;
      return height === undefined ? center : clamp(center, branchTop(node), branchBottom(height));
    }
    if (direction !== "out") {
      const inputs = ports.filter(port => port.direction === "in");
      const i = inputs.findIndex(port => port.id === portId && port.role === kind);
      // Single sockets keep the familiar header/reference positions. Named inputs
      // share the left edge; both their DOM buttons and SVG endpoints use this spacing.
      if (i >= 0 && (inputs.length > 2 || inputs.filter(port => port.role === kind).length > 1)) {
        if (compact) return border + 12 + (i + 0.5) * 70 / inputs.length;
        const available = Math.max(node.height, sizeOf(node, false)[1]) - 48;
        return border + 24 + i * Math.min(rowHeight, available / (inputs.length - 1));
      }
    }
  }
  if (kind === "continuation") return border + (compact ? 21 : 24);
  return border + (compact ? (node.kind === "agent" ? 78 : 56) : 62);
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
        const portId = direction === "in" ? edge.targetPort : edge.sourcePort;
        const targetNode = doc.nodes.find((n) => n.id === nodeId);
        if (!targetNode) continue;
        if (
          !inferred.some(
            (p) =>
              p.kind === kind &&
              p.direction === direction &&
              (p.portId ?? direction) === (portId ?? direction) &&
              p.nodes.includes(nodeId),
          )
        ) {
          const port = portId && portsOf(targetNode).find((item) => item.id === portId);
          inferred.push({
            id: `${kind}-${direction}-${nodeId}${portId && portId !== direction ? "-" + portId : ""}`,
            ...(portId ? { portId } : {}),
            kind,
            direction,
            name: port ? `${targetNode.title} · ${port.label ?? t(port.labelKey ?? port.id)}` : targetNode.title,
            nodes: [nodeId],
            hidden: false,
          });
        }
      }
    }
  }
  if (group.fanout) {
    const fan = doc.nodes.find(node => node.id === group.fanout!.fanId);
    const merge = doc.nodes.find(node => node.id === group.fanout!.mergeId);
    const boundary = [fan, merge].flatMap(node => !node ? [] : portsOf(node)
      .filter(port => port.role !== "event" && port.direction === (node === fan ? "in" : "out"))
      .map((port): GroupPort => ({
        id: `${node.id}:${port.role}:${port.id}`, kind: port.role as GroupPort["kind"], direction: port.direction,
        portId: port.id, name: port.label ?? (port.labelKey ? t(port.labelKey) : node.title),
        nodes: [node.id], hidden: false,
      })));
    const realExternal = inferred.filter(port => port.nodes.every(id => {
      const node = doc.nodes.find(candidate => candidate.id === id);
      return node && !node.generatedBy && node !== fan && node !== merge;
    }));
    const valid = [...boundary, ...realExternal];
    const matches = (a: GroupPort, b: GroupPort) => a.kind === b.kind && a.direction === b.direction &&
      (a.portId ?? a.direction) === (b.portId ?? b.direction) && b.nodes.every(id => a.nodes.includes(id));
    const customized = (group.ports ?? []).filter(port => valid.some(real => matches(port, real)));
    return [...customized, ...valid.filter(port => !customized.some(custom => matches(custom, port)))];
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
              (c.portId ?? c.direction) === (p.portId ?? p.direction) &&
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
  kind: FlowEdge["kind"],
  direction: "in" | "out",
  lod = false,
  keepExpandedIds?: Set<string>,
  index?: {
    nodes: Map<string, FlowNode>;
    ancestors: Map<string, FlowNode | undefined>;
    branchScroll?: ReadonlyMap<string, number>;
    previewHeights?: ReadonlyMap<string, number>;
    ports: Map<string, GroupPort[]>;
  },
  portId?: string,
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
      dirPorts.findIndex((p) => p.kind === kind && p.nodes.includes(nodeId) &&
        (p.portId ?? direction) === (portId ?? direction)),
    );
    const box = groupBox(collapsed, rows);
    return {
      x: direction === "out" ? box.x + box.w : box.x,
      y: box.y + 80 + idx * 28,
      groupId: collapsed.id,
      box,
    };
  }
  const box = nodeBox(node, lod, Boolean(node.window) || keepExpandedIds?.has(node.id), index?.previewHeights?.get(node.id));
  if (kind === "event" && direction === "out") return { x: box.x + box.w / 2, y: box.y, box };
  return {
    x: box.x + (direction === "out" ? box.w : 0),
    y: box.y + portY(node, kind === "event" ? "continuation" : kind, !!box.compact, portId ?? direction, index?.branchScroll?.get(nodeId), box.h, direction),
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
  sourcePortKind: FlowEdge["kind"],
  dropPt: { x: number; y: number },
  targetKind: FlowNode["kind"] = "agent",
  opts?: {
    direction?: "out" | "in";
    sourceKind?: FlowNode["kind"];
    sourcePortOffset?: number;
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

  const sourcePortOffset = opts?.sourcePortOffset ?? portY(
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
      { x: a.x + a.w / 2, y: a.y + a.h / 2 },
      { x: c1.x + nx * bow * k, y: c1.y + ny * bow * k },
      { x: c2.x + nx * bow * k, y: c2.y + ny * bow * k },
      { x: b.x + b.w / 2, y: b.y + b.h / 2 },
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

function overlapArea(a: Box, b: Box, gap = 0): number {
  const w = Math.min(a.x + a.w, b.x + b.w + gap) - Math.max(a.x, b.x - gap);
  const h = Math.min(a.y + a.h, b.y + b.h + gap) - Math.max(a.y, b.y - gap);
  return Math.max(0, w) * Math.max(0, h);
}

export function clearBoxAlong(
  box: Box,
  obstacles: readonly Box[],
  axis: "x" | "y" = "y",
  direction: 1 | -1 = 1,
  gap = ROOM_GAP,
): Box {
  const span = axis === "x" ? "w" : "h";
  const across = axis === "x" ? "y" : "x";
  const acrossSpan = axis === "x" ? "h" : "w";
  const blocked = obstacles.flatMap((obstacle) => {
    if (box[across] >= obstacle[across] + obstacle[acrossSpan] + gap ||
        box[across] + box[acrossSpan] + gap <= obstacle[across]) return [];
    const start = obstacle[axis] - box[span] - gap;
    const end = obstacle[axis] + obstacle[span] + gap;
    return [direction === 1 ? { start, end } : { start: -end, end: -start }];
  }).sort((a, b) => a.start - b.start);
  let position = direction * box[axis];
  for (const { start, end } of blocked) {
    if (position <= start) break;
    position = Math.max(position, end);
  }
  return { ...box, [axis]: position * direction };
}

/** Size of a canvas card or frame, including the visible ports on composites. */
export function canvasItemBox(doc: FlowspaceDocument, node: FlowNode): Box {
  return node.kind === "group" && node.collapsed ? expandedGroupBox(doc, node) : nodeBox(node);
}

export function lockedCanvasItems(doc: FlowspaceDocument): Set<string> {
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const locked = new Set<string>();
  for (const node of doc.nodes) {
    if (!node.pinned && !node.window) continue;
    let item: FlowNode | undefined = node;
    while (item && !locked.has(item.id)) {
      locked.add(item.id);
      item = item.parentId ? byId.get(item.parentId) : undefined;
    }
  }
  return locked;
}

function shiftWithGroup(doc: FlowspaceDocument, node: FlowNode, x: number, y: number): void {
  const dx = x - node.x;
  const dy = y - node.y;
  node.x = x;
  node.y = y;
  if (node.kind !== "group") return;
  const descendants = new Set(groupDescendants(doc, node.id));
  for (const child of doc.nodes) {
    if (!descendants.has(child.id)) continue;
    child.x += dx;
    child.y += dy;
    if (child.nudge?.origX !== undefined) child.nudge.origX += dx;
    if (child.nudge?.origY !== undefined) child.nudge.origY += dy;
  }
}

function nearestClearBox(box: Box, obstacles: Box[], parent?: FlowNode): Box {
  const options = [
    clearBoxAlong(box, obstacles, "y", 1),
    clearBoxAlong(box, obstacles, "x", 1),
    clearBoxAlong(box, obstacles, "y", -1),
    clearBoxAlong(box, obstacles, "x", -1),
  ];
  const distance = (candidate: Box) => Math.abs(candidate.x - box.x) + Math.abs(candidate.y - box.y);
  return options.filter((candidate) => staysInGroup(candidate, box, parent)).sort((a, b) => distance(a) - distance(b))[0];
}

function staysInGroup(candidate: Box, original: Box, parent?: FlowNode): boolean {
  return !parent || (candidate.x >= Math.min(original.x, parent.x + 24) &&
    candidate.y >= Math.min(original.y, parent.y + 54));
}

/** Propagate a size change through siblings, then through the frames that contain them. */
export function makeRoom(doc: FlowspaceDocument, expandedNode: FlowNode, previous?: Box): void {
  if (collapsedAncestor(doc, expandedNode.id)) return;
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const locked = lockedCanvasItems(doc);
  const owner = expandedNode.id;
  const move = (node: FlowNode, box: Box) => {
    if (node.x === box.x && node.y === box.y) return;
    node.nudge ??= { by: owner };
    node.nudge.origX ??= node.x;
    node.nudge.origY ??= node.y;
    shiftWithGroup(doc, node, box.x, box.y);
  };

  for (let item: FlowNode | undefined = expandedNode; item;) {
    const parentId: string | undefined = item.parentId;
    const parent: FlowNode | undefined = parentId ? byId.get(parentId) : undefined;
    if (item.kind === "group" && !item.collapsed) {
      const { w, h } = expandedGroupBox(doc, item);
      if (w > item.width || h > item.height) {
        item.nudge ??= { by: owner };
        item.nudge.origW ??= item.width;
        item.nudge.origH ??= item.height;
        item.width = w;
        item.height = h;
      }
    }
    let box = canvasItemBox(doc, item);
    if (previous && box.w <= previous.w && box.h <= previous.h) break;
    const siblings = doc.nodes.filter((node) => node.parentId === parentId && node !== item);
    const fixed = siblings.filter((n) => locked.has(n.id)).map((n) => canvasItemBox(doc, n));
    if (!locked.has(item.id) && fixed.some((b) => overlapArea(box, b) > (previous ? overlapArea(previous, b) : 0))) {
      box = nearestClearBox(box, fixed, parent);
      move(item, box);
    }

    const pending = new Map(siblings.filter((n) => !locked.has(n.id)).map((n) => [n, canvasItemBox(doc, n)]));
    const placed = [...fixed, box];
    const pushers = [box];
    for (const pusher of pushers) {
      const prior = pusher === box ? previous : undefined;
      const hits = [...pending].filter(([, other]) =>
        overlapArea(other, pusher, ROOM_GAP) > (prior ? overlapArea(other, prior, ROOM_GAP) : 0),
      ).sort(([, a], [, b]) =>
        Math.hypot(a.x - pusher.x, a.y - pusher.y) - Math.hypot(b.x - pusher.x, b.y - pusher.y),
      );
      for (const [node, other] of hits) {
        const beside = Math.abs(other.x - pusher.x) >= ROOM_GAP &&
          Math.abs(other.y - pusher.y) < Math.min(other.h, prior?.h ?? pusher.h) / 2;
        const axis = beside ? "x" : "y";
        const next = clearBoxAlong(other, [pusher], axis, other[axis] < pusher[axis] ? -1 : 1);
        const destination = staysInGroup(next, other, parent) && !placed.some((b) => overlapArea(next, b, ROOM_GAP))
          ? next
          : nearestClearBox(other, placed, parent);
        move(node, destination);
        pending.delete(node);
        placed.push(destination);
        pushers.push(destination);
      }
    }
    previous = parent && canvasItemBox(doc, parent);
    item = parent;
  }
}

export function giveRoomBack(
  doc: FlowspaceDocument,
  collapsedNode: FlowNode,
): void {
  const displaced = doc.nodes.filter((node) => node.nudge?.by === collapsedNode.id);
  if (!displaced.length) return;
  const locked = lockedCanvasItems(doc);
  const children = new Map<string | undefined, FlowNode[]>();
  for (const node of doc.nodes) {
    if (!children.has(node.parentId)) children.set(node.parentId, []);
    children.get(node.parentId)!.push(node);
  }

  function restoreLevel(parentId?: string): void {
    const siblings = children.get(parentId) ?? [];
    const stillGrown = new Set<FlowNode>();
    for (const node of siblings) {
      if (node.kind !== "group") continue;
      restoreLevel(node.id);
      const nudge = node.nudge;
      if (nudge?.by !== collapsedNode.id || (nudge.origW === undefined && nudge.origH === undefined)) continue;
      const width = nudge.origW ?? node.width;
      const height = nudge.origH ?? node.height;
      node.width = width;
      node.height = height;
      if (!node.collapsed) {
        const { w, h } = expandedGroupBox(doc, node);
        node.width = w;
        node.height = h;
        if (w > width || h > height) stillGrown.add(node);
      }
    }

    // A card in a chain may need to wait for the card occupying its original spot.
    const owned = siblings.filter((node) => node.nudge?.by === collapsedNode.id);
    const pending = new Set(owned.filter(({ nudge }) => nudge?.origX !== undefined || nudge?.origY !== undefined));
    const blockers = new Map<FlowNode, FlowNode>();
    for (let restored = true; pending.size && restored;) {
      restored = false;
      for (const node of pending) {
        if (locked.has(node.id)) continue;
        const current = canvasItemBox(doc, node);
        const candidate = { ...current, x: node.nudge!.origX ?? node.x, y: node.nudge!.origY ?? node.y };
        const blocker = siblings.find((other) => {
          if (other === node) return false;
          const box = canvasItemBox(doc, other);
          return overlapArea(candidate, box) > overlapArea(current, box);
        });
        if (blocker) {
          blockers.set(node, blocker);
          continue;
        }
        shiftWithGroup(doc, node, candidate.x, candidate.y);
        pending.delete(node);
        restored = true;
      }
    }

    for (const node of owned) {
      const nudge = node.nudge!;
      const blocker = pending.has(node) ? blockers.get(node) : undefined;
      const nextOwner = blocker?.nudge?.by;
      if (nextOwner && nextOwner !== node.id) {
        node.nudge = { ...nudge, by: nextOwner };
      } else if (blocker && (blocker.kind === "group" ? !blocker.collapsed : blocker.expanded)) {
        node.nudge = { ...nudge, by: blocker.id };
      } else if (stillGrown.has(node)) {
        node.nudge = { by: nudge.by, origW: nudge.origW, origH: nudge.origH };
      } else {
        delete node.nudge;
      }
    }
  }
  restoreLevel();
}

export function reflowCanvasItem(doc: FlowspaceDocument, node: FlowNode, previous: Box): void {
  const next = node.kind === "group" && !node.collapsed ? expandedGroupBox(doc, node) : canvasItemBox(doc, node);
  if (next.w < previous.w || next.h < previous.h) giveRoomBack(doc, node);
  if (next.w > previous.w || next.h > previous.h) makeRoom(doc, node, previous);
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
  kind: FlowEdge["kind"];
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
  kind: FlowEdge["kind"];
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

