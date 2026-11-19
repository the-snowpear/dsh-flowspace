import type { FlowEdge, FlowNode, FlowspaceDocument, FlowspaceRun, FlowspaceSnapshot, FlowToken, RunStep } from "../types.ts";
import type { Box } from "./geometry.ts";

export function padded(box: Box, pad: number): Box {
  return { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
}

export function intersects(a: Box, b: Box): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

export function viewportBox(view: FlowspaceDocument["viewport"], size: { width: number; height: number }): Box {
  return { x: -view.x / view.zoom, y: -view.y / view.zoom, w: size.width / view.zoom, h: size.height / view.zoom };
}

export function encloses(outer: Box, inner: Box): boolean {
  return outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h;
}

export function shareSnapshotValue<T>(previous: T, next: T): T {
  if (previous === next || !previous || !next || typeof previous !== "object" || typeof next !== "object") return next;
  if (Array.isArray(next)) {
    if (!Array.isArray(previous)) return next;
    let byId: Map<string, T> | undefined;
    let changed = previous.length !== next.length;
    const items = next.map((item, index) => {
      let old = previous[index];
      if (item?.id !== undefined && old?.id !== item.id) {
        byId ??= new Map(previous.map(value => [value?.id, value]));
        old = byId.get(item.id);
      }
      const value = shareSnapshotValue(old, item);
      changed ||= value !== previous[index];
      return value;
    });
    return changed ? items as T : previous;
  }
  if (Array.isArray(previous)) return next;
  const keys = Object.keys(next) as (keyof T)[];
  let changed = keys.length !== Object.keys(previous).length;
  const result = { ...next };
  for (const key of keys) {
    result[key] = shareSnapshotValue(previous[key], next[key]);
    changed ||= result[key] !== previous[key] || !Object.hasOwn(previous, key);
  }
  return changed ? result : previous;
}

export function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map(item => [item.id, item]));
}

export interface GeometryEdit {
  nodes?: Map<string, Partial<FlowNode>>;
  edge?: { id: string; waypoints: FlowEdge["waypoints"] };
}

export function applyGeometry(doc: FlowspaceDocument, edit: GeometryEdit | null): FlowspaceDocument {
  if (!edit) return doc;
  const changes = edit.nodes;
  const edge = edit.edge;
  return {
    ...doc,
    nodes: changes ? doc.nodes.map(node => changes.has(node.id) ? { ...node, ...changes.get(node.id) } : node) : doc.nodes,
    edges: edge ? doc.edges.map(item => item.id === edge.id ? { ...item, waypoints: edge.waypoints } : item) : doc.edges,
  };
}

function append<T>(map: Map<string, T[]>, key: string, item: T) {
  const bucket = map.get(key);
  if (bucket) bucket.push(item);
  else map.set(key, [item]);
}

export function indexEdges(edges: FlowEdge[]) {
  const incoming = new Map<string, FlowEdge[]>();
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    append(incoming, edge.target, edge);
    append(outgoing, edge.source, edge);
  }
  return { incoming, outgoing };
}

export function indexNodes(nodes: FlowNode[]) {
  const nodesById = byId(nodes);
  const collapsed = new Map<string, FlowNode | undefined>();
  const children = new Map<string, FlowNode[]>();
  const referenceSources = new Set<string>();
  for (const node of nodes) {
    if (node.parentId) append(children, node.parentId, node);
    if ((node.kind === "display" || node.kind === "detail") && node.sourceNodeId) {
      referenceSources.add(node.sourceNodeId);
    }
  }
  const members = new Map<string, FlowNode[]>();
  function membersOf(id: string): FlowNode[] {
    const cached = members.get(id);
    if (cached) return cached;
    const result = (children.get(id) ?? []).flatMap(node => node.kind === "group" ? membersOf(node.id) : [node]);
    members.set(id, result);
    return result;
  }
  function ancestor(node: FlowNode): FlowNode | undefined {
    if (collapsed.has(node.id)) return collapsed.get(node.id);
    const parent = node.parentId && nodesById.get(node.parentId);
    const result = parent ? ancestor(parent) ?? (parent.kind === "group" && parent.collapsed ? parent : undefined) : undefined;
    collapsed.set(node.id, result);
    return result;
  }
  for (const node of nodes) ancestor(node);
  return { nodesById, collapsed, membersOf, referenceSources };
}

function indexSnapshot(snapshot: FlowspaceSnapshot | null) {
  const live = new Map(snapshot?.live.map(item => [item.nodeId, item]));
  const steps = new Map<string, RunStep[]>();
  const waiting = new Map<string, { run: FlowspaceRun; token: FlowToken }[]>();
  const tokens = new Map<string, FlowToken[]>();
  const consumed = new Set<string>();
  const runningConsumed = new Set<string>();
  for (const run of snapshot?.runs ?? []) {
    const active = ["running", "waiting", "paused"].includes(run.state);
    const edges = active ? byId(run.graph.edges) : undefined;
    for (const step of run.steps) append(steps, step.nodeId, step);
    for (const token of run.tokens) {
      if (active) append(tokens, token.edgeId, token);
      if (token.consumed) {
        consumed.add(token.edgeId);
        if (run.state === "running") runningConsumed.add(token.edgeId);
      } else if (active && !token.ready && !token.dismissed) {
        const target = edges?.get(token.edgeId)?.target;
        if (target) append(waiting, target, { run, token });
      }
    }
  }
  const statuses = new Map<string, string>();
  for (const node of snapshot?.document.nodes ?? []) {
    const item = live.get(node.id);
    const hasHistory = (item?.seq ?? -1) >= 0 || Boolean(item?.output?.trim());
    const status = waiting.has(node.id) ? "waiting" : item?.pendingInput.length ? "input"
      : item?.running ? "running" : node.participation === "bypassed" ? "bypassed"
      : steps.get(node.id)?.at(-1)?.state ?? (node.sessionId && hasHistory ? "completed" : "draft");
    statuses.set(node.id, status);
  }
  return { live, steps, waiting, tokens, consumed, runningConsumed, statuses };
}

const indexes = new WeakMap<FlowspaceSnapshot, ReturnType<typeof indexSnapshot>>();
const emptyIndex = indexSnapshot(null);
export function runtimeIndex(snapshot: FlowspaceSnapshot | null) {
  if (!snapshot) return emptyIndex;
  let index = indexes.get(snapshot);
  if (!index) {
    index = indexSnapshot(snapshot);
    indexes.set(snapshot, index);
  }
  return index;
}
