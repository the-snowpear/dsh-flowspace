import type { FlowEdge, FlowNode, FlowspaceDocument, FlowspaceRun, FlowspaceSnapshot, FlowToken, RunStep } from "../types.ts";
import type { Box } from "./boxes.ts";
export { encloses, intersects, padded } from "./boxes.ts";

export function viewportBox(view: FlowspaceDocument["viewport"], size: { width: number; height: number }): Box {
  return { x: -view.x / view.zoom, y: -view.y / view.zoom, w: size.width / view.zoom, h: size.height / view.zoom };
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

function indexRuns(runs: FlowspaceRun[]) {
  const steps = new Map<string, RunStep[]>();
  const latestRun = new Map<string, FlowspaceRun>();
  const awaiting = new Map<string, { run: FlowspaceRun; step: RunStep }>();
  const breakpoints = new Map<string, { run: FlowspaceRun; step: RunStep }>();
  const missingEmissions = new Map<string, { runId: string; step: RunStep }>();
  const waiting = new Map<string, { run: FlowspaceRun; token: FlowToken }[]>();
  const waitingByEdge = new Map<string, { run: FlowspaceRun; token: FlowToken }>();
  const tokens = new Map<string, FlowToken[]>();
  const latestToken = new Map<string, FlowToken>();
  const consumed = new Set<string>();
  const runningConsumed = new Set<string>();
  for (const run of runs) {
    const active = ["running", "waiting", "paused"].includes(run.state);
    const edges = active ? byId(run.graph.edges) : undefined;
    for (const step of run.steps) {
      append(steps, step.nodeId, step);
      latestRun.set(step.nodeId, run);
      if (step.state === "awaiting") {
        // Cards show the first pending step of the newest applicable run.
        if (awaiting.get(step.nodeId)?.run !== run) awaiting.set(step.nodeId, { run, step });
        if (step.debug && breakpoints.get(step.nodeId)?.run !== run) breakpoints.set(step.nodeId, { run, step });
      }
      if (step.emission?.missing && !step.emission.reminderStepId && !["cancelled", "interrupted", "paused"].includes(run.state))
        missingEmissions.set(step.nodeId, { runId: run.id, step });
    }
    for (const token of run.tokens) {
      latestToken.set(token.edgeId, token);
      if (active) append(tokens, token.edgeId, token);
      if (token.consumed) {
        consumed.add(token.edgeId);
        if (run.state === "running") runningConsumed.add(token.edgeId);
      } else if (active && !token.ready && !token.dismissed && (!token.delayUntil || token.needsRelease)) {
        const gate = { run, token };
        if (!waitingByEdge.has(token.edgeId)) waitingByEdge.set(token.edgeId, gate);
        const target = edges?.get(token.edgeId)?.target;
        if (target) append(waiting, target, gate);
      }
    }
  }
  return { steps, latestRun, awaiting, breakpoints, missingEmissions, waiting, waitingByEdge, tokens, latestToken, consumed, runningConsumed };
}

const histories = new WeakMap<FlowspaceSnapshot, ReturnType<typeof indexRuns>>();

/** Only the bridge can vouch that two published snapshots share reconciled, immutable runs. */
export function reuseRunHistory(previous: FlowspaceSnapshot | null, next: FlowspaceSnapshot) {
  if (!previous || previous.runs !== next.runs) return;
  const history = histories.get(previous);
  if (history) histories.set(next, history);
}

function indexSnapshot(snapshot: FlowspaceSnapshot | null) {
  let history = snapshot && histories.get(snapshot);
  if (!history) {
    history = indexRuns(snapshot?.runs ?? []);
    if (snapshot) histories.set(snapshot, history);
  }
  const live = new Map(snapshot?.live.map(item => [item.nodeId, item]));
  const statuses = new Map<string, string>();
  for (const node of snapshot?.document.nodes ?? []) {
    const item = live.get(node.id);
    const hasHistory = (item?.seq ?? -1) >= 0 || Boolean(item?.output?.trim());
    const status = history.waiting.has(node.id) ? "waiting" : item?.pendingInput.length ? "input"
      : item?.running ? "running" : node.participation === "bypassed" ? "bypassed"
      : history.steps.get(node.id)?.at(-1)?.state ?? (node.sessionId && hasHistory ? "completed" : "draft");
    statuses.set(node.id, status);
  }
  return { ...history, live, statuses };
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
