import type { FlowContent, FlowEdge, FlowItem, FlowNode, FlowspaceDocument } from "../types.ts";
import { nodeBox } from "../client/geometry.ts";
import { tFor, type Locale } from "../client/i18n.ts";
import { boardContent } from "./board.ts";
import { canConnect } from "./connect.ts";
import { contentList, contentOf, DEFAULT_LIST_LIMIT, selectedFileContent } from "./content.ts";
import { newEdge, newFlowNode, newNode, uid } from "./document.ts";
import { createStaticResolver, type PreviewOverrides } from "./nodes/data/preview.ts";

type Graph = Pick<FlowspaceDocument, "nodes" | "edges">;
type SourceGraph = Graph & Pick<FlowspaceDocument, "settings">;

export function laneTitle(group: FlowNode | undefined, node: FlowNode): string | undefined {
  if (!group || node.laneIndex === undefined) return undefined;
  return `${group.title} #${node.laneIndex + 1} · ${node.itemTitle || node.title}`;
}

export function fanoutPair(graph: Graph, fanId: string) {
  const group = graph.nodes.find(node => node.fanout?.fanId === fanId);
  const fan = graph.nodes.find(node => node.id === fanId);
  const merge = group?.fanout && graph.nodes.find(node => node.id === group.fanout!.mergeId);
  return group && fan && merge ? { group, fan, merge } : undefined;
}

interface PairOptions {
  locale?: Locale;
  title?: string;
  masterTitle?: string;
  task?: string;
  workspaceId?: string;
  cwd?: string;
  parentId?: string;
  sourceId?: string;
  sourceKind?: FlowEdge["kind"];
  sourcePort?: string;
  edgeId?: string;
  rerouteOutgoing?: boolean;
}

/** Mutates one editable document. The caller can insert the entire bracket in one undo entry. */
export function createFanoutPair(doc: Graph, x: number, y: number, options: PairOptions = {}) {
  const locale = options.locale ?? "zh";
  const group = newNode("group", x, y, options.title ?? tFor(locale, "flow_fanout_group"), locale);
  group.parentId = options.parentId;
  group.width = 1128;
  group.height = 472;
  const fan = newFlowNode("flowspace/fanout", x + 24, y + 56, locale);
  const master = newNode("agent", x + 408, y + 56, options.masterTitle ?? tFor(locale, "flow_lane_master"), locale);
  const merge = newFlowNode("flowspace/merge-sort", x + 792, y + 56, locale);
  for (const node of [fan, master, merge]) node.parentId = group.id;
  master.masterOf = fan.id;
  master.task = options.task ?? tFor(locale, "flow_lane_task");
  master.draft = master.continuationPrompt = master.task;
  master.cwd = options.cwd;
  master.workspaceId = options.workspaceId;
  group.fanout = { fanId: fan.id, mergeId: merge.id };
  group.ports = [
    { id: uid(), direction: "in", kind: "reference", portId: "in", name: fan.title, nodes: [fan.id], hidden: false },
    { id: uid(), direction: "in", kind: "continuation", portId: "in", name: fan.title, nodes: [fan.id], hidden: false },
    { id: uid(), direction: "out", kind: "continuation", portId: "out", name: merge.title, nodes: [merge.id], hidden: false },
  ];
  const previousWire = options.edgeId && doc.edges.find(edge => edge.id === options.edgeId);
  const sourceId = previousWire ? previousWire.source : options.sourceId;
  const source = sourceId && doc.nodes.find(node => node.id === sourceId);
  if (source) {
    const kind = previousWire ? previousWire.kind : options.sourceKind ?? (["agent", "flow"].includes(source.kind) ? "continuation" : "reference");
    const sourcePort = previousWire ? previousWire.sourcePort : options.sourcePort;
    const input = { ...newEdge(source.id, fan.id, kind), sourcePort, targetPort: "in" };
    if (kind === "continuation") {
      for (const edge of doc.edges) {
        if (previousWire ? edge.id !== previousWire.id : !options.rerouteOutgoing) continue;
        if (edge.source !== source.id || edge.kind !== kind || (edge.sourcePort ?? "out") !== (sourcePort ?? "out")) continue;
        const target = doc.nodes.find(node => node.id === edge.target);
        if (!canConnect({ ...edge, source: merge, sourcePort: "out", target }).ok) continue;
        if (edge.emitMode === "stream") Object.assign(input, { emitMode: "stream" });
        edge.source = merge.id;
        edge.sourcePort = "out";
        delete edge.emitMode;
      }
    } else input.always = true;
    doc.edges.push(input);
  }
  doc.nodes.push(group, fan, master, merge);
  doc.edges.push({ ...newEdge(fan.id, master.id, "continuation"), sourcePort: "out" },
    { ...newEdge(master.id, merge.id, "continuation"), targetPort: "in" });
  return { group, fan, merge, master };
}

export function canInsertFanout(graph: Graph, edge: FlowEdge): boolean {
  if (edge.kind !== "continuation" || edge.mode === "fork" || edge.generatedBy) return false;
  const source = graph.nodes.find(node => node.id === edge.source);
  const target = graph.nodes.find(node => node.id === edge.target);
  if (!source || !target || source.masterOf || target.masterOf) return false;
  return canConnect({ source, sourcePort: edge.sourcePort, target: newFlowNode("flowspace/fanout", 0, 0),
    targetPort: "in", kind: edge.kind }).ok &&
    canConnect({ ...edge, source: newFlowNode("flowspace/merge-sort", 0, 0), sourcePort: "out", target }).ok;
}

/** Add a step just before the merge, preserving named exits on every current mother tail. */
export function appendMasterStep(graph: Graph, fanId: string, locale: Locale = "zh") {
  const pair = fanoutPair(graph, fanId);
  if (!pair) return;
  const { group, fan, merge } = pair;
  const tails = graph.edges.filter(edge => !edge.generatedBy && edge.kind === "continuation" && edge.target === merge.id &&
    graph.nodes.some(node => node.id === edge.source && node.masterOf === fanId));
  const prior = graph.nodes.find(node => node.id === tails[0]?.source);
  const node = newNode("agent", merge.x, prior?.y ?? fan.y, tFor(locale, "flow_lane_master"), locale);
  node.masterOf = fanId; node.parentId = group.id;
  node.workspaceId = prior?.workspaceId; node.cwd = prior?.cwd;
  node.task = node.draft = node.continuationPrompt = tFor(locale, "flow_lane_task");
  if (tails.length) {
    for (const tail of tails) { tail.target = node.id; delete tail.targetPort; }
  } else graph.edges.push({ ...newEdge(fan.id, node.id, "continuation"), sourcePort: "out" });
  graph.nodes.push(node);
  graph.edges.push({ ...newEdge(node.id, merge.id, "continuation"), targetPort: "in" });
  merge.x = node.x + nodeBox(node).w + 72;
  group.width = Math.max(group.width, merge.x + nodeBox(merge).w - group.x + 24);
  group.collapsed = false;
  return node;
}

export function cleanRetiredLanes(graph: Graph, fanId: string) {
  const removed = new Set(graph.nodes.filter(node => node.generatedBy === fanId && node.removed).map(node => node.id));
  graph.nodes = graph.nodes.filter(node => !removed.has(node.id));
  graph.edges = graph.edges.filter(edge => !removed.has(edge.source) && !removed.has(edge.target));
  if (removed.size) syncExistingFanout(graph, fanId);
}

export function resumeMasterSync(graph: Graph, fanId: string, key: string, used?: ReadonlySet<string>) {
  const lane = graph.nodes.filter(node => node.generatedBy === fanId && node.itemKey === key);
  for (const node of lane) delete node.overridden;
  syncExistingFanout(graph, fanId, used);
  // Explicit false distinguishes this edit from a stale draft during Host reconciliation.
  for (const node of graph.nodes) if (node.generatedBy === fanId && node.itemKey === key && !node.removed) node.overridden = false;
}

function lines(text: string): string[] {
  return text.split(/\r?\n/).map(line => line.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, "")).filter(Boolean);
}

/** Draft projection of a static source. No files are read or Sessions created. */
export function staticFanoutContent(doc: SourceGraph, fanId: string, overrides?: PreviewOverrides): FlowContent | undefined {
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  const connected = doc.edges.filter(edge => edge.target === fanId && !edge.generatedBy &&
    (edge.kind === "reference" || edge.trigger !== "off"));
  const references = connected.filter(edge => edge.kind === "reference");
  const incoming = [...connected.filter(edge => edge.kind === "continuation"), ...references];
  if (!incoming.length) return undefined;
  let resolver: ReturnType<typeof createStaticResolver> | undefined;
  const lists: FlowContent[] = [];
  for (const edge of incoming) {
    const source = doc.nodes.find(node => node.id === edge.source);
    if (!source) return undefined;
    const resolved = overrides?.edges?.get(edge.id);
    let content = resolved ? contentOf(resolved) : edge.snapshotContent;
    if (!content) {
      if (source.kind === "board") content = boardContent(source, edge.sourceItemKey, limit);
      else if (source.kind === "file") {
        content = selectedFileContent(source, limit);
      } else if (source.kind === "note" || (source.kind === "display" && source.fixed)) {
        content = contentList(lines(edge.snapshotText ?? source.text), limit);
      } else if (source.kind === "flow") {
        resolver ??= createStaticResolver(doc, overrides);
        const result = resolver.edge(edge.id);
        if (result.state !== "ready") return undefined;
        content = result.content;
      } else return undefined;
    }
    if (!content) return undefined;
    if (content.dataType !== "list") {
      if (content.value === undefined) return undefined;
      const values = content.dataType === "text" ? lines(String(content.value)) :
        content.dataType === "file" && Array.isArray(content.value) ? content.value : [content.value];
      content = contentList(values, limit, edge.sourceItemKey ? [edge.sourceItemKey] : undefined);
    }
    lists.push(content);
  }
  const items: FlowItem[] = [];
  const keys = new Set<string>();
  let total = 0;
  for (const [index, list] of lists.entries()) {
    const sourceItems = list.items ?? [];
    total += list.originalCount ?? sourceItems.length;
    for (const item of sourceItems.slice(0, limit - items.length)) {
      const edge = incoming[index];
      const sourceKey = edge.kind === "reference" && references.length > 1 ? JSON.stringify([edge.id, item.key]) : item.key;
      let key = sourceKey;
      for (let occurrence = 2; keys.has(key); occurrence++) key = `${sourceKey}#${occurrence}`;
      keys.add(key);
      items.push(key === item.key ? item : { ...item, key });
    }
  }
  return { dataType: "list", items, ...(total > items.length ? { originalCount: total } : {}) };
}

function itemTitle(item: FlowItem): string {
  const value = item.value;
  const record = typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
  const named = record && [record.title, record.text, record.name, record.path].find(field => typeof field === "string");
  const text = typeof named === "string" ? named : typeof value === "string" ? value :
    item.spill?.preview ?? JSON.stringify(value) ?? item.key;
  return text.trim().split(/\r?\n/, 1)[0].slice(0, 100) || item.key;
}

function generatedId(kind: "node" | "edge", fanId: string, key: string, masterId: string): string {
  return `lane-${kind}:${encodeURIComponent(JSON.stringify([fanId, key, masterId]))}`;
}

function masterGraph(graph: Graph, group: FlowNode, fan: FlowNode, merge: FlowNode) {
  const children = new Set(graph.nodes.filter(node => node.parentId === group.id && !node.generatedBy).map(node => node.id));
  const interior = graph.edges.filter(edge => !edge.generatedBy && edge.kind === "continuation" &&
    children.has(edge.source) && children.has(edge.target) && edge.source !== merge.id && edge.target !== fan.id);
  function reachable(start: string, upstream: boolean) {
    const seen = new Set([start]), queue = [start];
    for (let i = 0; i < queue.length; i++) {
      for (const edge of interior) {
        if ((upstream ? edge.target : edge.source) !== queue[i]) continue;
        const next = upstream ? edge.source : edge.target;
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    return seen;
  }
  const from = reachable(fan.id, false), to = reachable(merge.id, true);
  const nodes = graph.nodes.filter(node => children.has(node.id) && node.id !== fan.id && node.id !== merge.id &&
    (node.masterOf === fan.id || (from.has(node.id) && to.has(node.id)) || (node.staffOf && from.has(node.staffOf) && to.has(node.staffOf))));
  const ids = new Set(nodes.map(node => node.id));
  const edges = graph.edges.filter(edge => !edge.generatedBy && (
    (ids.has(edge.target) && (ids.has(edge.source) || edge.source === fan.id || edge.kind === "reference")) ||
    (ids.has(edge.source) && edge.target === merge.id)));
  return { nodes, edges };
}

function cloneMaster(master: FlowNode, fanId: string, key: string, title: string, index: number, dy: number,
  ids: Map<string, string>, prior?: FlowNode): FlowNode {
  const copy = structuredClone(master);
  delete copy.masterOf;
  delete copy.templateSlotId;
  delete copy.sessionId;
  delete copy.lastSubmittedTask;
  delete copy.window;
  delete copy.nudge;
  copy.id = ids.get(master.id)!;
  copy.generatedBy = fanId;
  copy.masterNodeId = master.id;
  copy.itemKey = key;
  copy.itemTitle = title;
  copy.laneIndex = index;
  copy.y += dy;
  if (copy.sourceNodeId) copy.sourceNodeId = ids.get(copy.sourceNodeId) ?? copy.sourceNodeId;
  if (copy.staffOf) copy.staffOf = ids.get(copy.staffOf) ?? copy.staffOf;
  if (copy.kind === "agent") {
    copy.draft = master.draft || master.task;
    if (copy.tab === "conversation") copy.tab = "task";
  }
  if (prior?.generatedRevision !== undefined) copy.generatedRevision = prior.generatedRevision;
  if (prior?.sessionId) {
    copy.sessionId = prior.sessionId;
    copy.lastSubmittedTask = prior.lastSubmittedTask;
    copy.draft = prior.draft;
    copy.tab = prior.tab;
    copy.cwd = prior.cwd;
    copy.workspaceId = prior.workspaceId;
    copy.worktreePath = prior.worktreePath;
  }
  return copy;
}

function cloneMasterEdge(master: FlowEdge, fanId: string, key: string, dy: number, ids: Map<string, string>,
  prior?: FlowEdge): FlowEdge {
  const edge = structuredClone(master);
  edge.id = prior?.id ?? generatedId("edge", fanId, key, master.id);
  edge.source = ids.get(master.source) ?? master.source;
  edge.target = ids.get(master.target) ?? master.target;
  edge.generatedBy = fanId;
  edge.itemKey = key;
  edge.masterEdgeId = master.id;
  edge.waypoints = master.waypoints?.map(point => ({ x: point.x, y: point.y + dy }));
  delete edge.sentVersion;
  delete edge.currentVersion;
  delete edge.placedCapsules;
  if (prior?.sentVersion) edge.sentVersion = prior.sentVersion;
  if (prior?.currentVersion) edge.currentVersion = prior.currentVersion;
  if (prior?.generatedRevision !== undefined) edge.generatedRevision = prior.generatedRevision;
  return edge;
}

function laneMap<T extends { id: string; itemKey?: string; generatedBy?: string }>(objects: T[], fanId: string) {
  const result = new Map<string, T[]>();
  for (const object of objects) {
    if (object.generatedBy !== fanId || object.itemKey === undefined) continue;
    const lane = result.get(object.itemKey);
    if (lane) lane.push(object);
    else result.set(object.itemKey, [object]);
  }
  return result;
}

// Storage and RPC may reorder object keys or omit optional undefined fields.
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((value, i) => sameValue(value, b[i]));
  if (Array.isArray(b)) return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  return Object.keys(left).every(key => sameValue(left[key], right[key])) &&
    Object.keys(right).every(key => right[key] === undefined || Object.hasOwn(left, key));
}

/** Reconcile a complete ordered set. The run graph and editable graph independently get identical IDs. */
export function reconcileFanout(graph: Graph, fanId: string, items: readonly FlowItem[], usedNodeIds: ReadonlySet<string> = new Set()): boolean {
  const pair = fanoutPair(graph, fanId);
  if (!pair) return false;
  const { group, fan, merge } = pair;
  const masters = masterGraph(graph, group, fan, merge);
  const rows = laneMap(graph.nodes, fanId), wires = laneMap(graph.edges, fanId);
  const oldCount = [...rows.values()].filter(row => row.some(node => !node.removed)).length;
  const boxes = masters.nodes.map(node => nodeBox(node));
  const stride = boxes.length ? Math.max(...boxes.map(box => box.y + box.h)) - Math.min(...boxes.map(box => box.y)) + 48 : 248;
  const nextNodes: FlowNode[] = [], nextEdges: FlowEdge[] = [];
  const activeKeys = new Set(items.map(item => item.key));
  let changed = false;
  for (const node of masters.nodes) {
    if (node.masterOf !== fanId) { node.masterOf = fanId; changed = true; }
  }
  function preserveRow(nodes: FlowNode[], index: number, title: string, removed: boolean) {
    for (const node of nodes) {
      const moved = (index - (node.laneIndex ?? index)) * stride;
      const copy = { ...node, laneIndex: index, itemTitle: title, y: node.y + moved };
      if (removed) copy.removed = true;
      else delete copy.removed;
      nextNodes.push(copy);
    }
  }
  for (const [index, item] of items.entries()) {
    const row = rows.get(item.key) ?? [], edges = wires.get(item.key) ?? [];
    const title = itemTitle(item);
    if (row.length && (fan.config?.followMaster === false || row.some(node => node.overridden))) {
      preserveRow(row, index, title, false);
      nextEdges.push(...edges);
      continue;
    }
    const priorNodes = new Map(row.map(node => [node.masterNodeId, node]));
    const priorEdges = new Map(edges.map(edge => [edge.masterEdgeId, edge]));
    const ids = new Map(masters.nodes.map(node => [node.id, priorNodes.get(node.id)?.id ?? generatedId("node", fanId, item.key, node.id)]));
    const dy = (index + 1) * stride;
    for (const node of masters.nodes) nextNodes.push(cloneMaster(node, fanId, item.key, title, index, dy, ids, priorNodes.get(node.id)));
    for (const edge of masters.edges) nextEdges.push(cloneMasterEdge(edge, fanId, item.key, dy, ids, priorEdges.get(edge.id)));
    for (const node of row) {
      if (node.masterNodeId && !ids.has(node.masterNodeId) && (node.sessionId || usedNodeIds.has(node.id))) {
        nextNodes.push({ ...node, removed: true });
      }
    }
  }
  let removedIndex = items.length;
  for (const [key, row] of rows) {
    if (activeKeys.has(key) || !row.some(node => node.sessionId || usedNodeIds.has(node.id))) continue;
    preserveRow(row, removedIndex++, row[0].itemTitle ?? key, true);
    nextEdges.push(...wires.get(key) ?? []);
  }

  const same = <T extends { id: string }>(previous: Map<string, T[]>, next: T[]) => {
    const flat = [...previous.values()].flat();
    return flat.length === next.length && flat.every((entry, i) =>
      entry === next[i] || (entry.id === next[i].id && sameValue(entry, next[i])));
  };
  if (!same(rows, nextNodes) || !same(wires, nextEdges)) {
    const kept = graph.nodes.filter(node => node.generatedBy !== fanId);
    const ids = new Set([...kept, ...nextNodes].map(node => node.id));
    graph.nodes = [...kept, ...nextNodes];
    graph.edges = [...graph.edges.filter(edge => edge.generatedBy !== fanId && ids.has(edge.source) && ids.has(edge.target)), ...nextEdges];
    changed = true;
  }
  let width = group.width, height = 180;
  for (const node of [...masters.nodes, fan, merge, ...nextNodes]) {
    const box = nodeBox(node);
    width = Math.max(width, box.x + box.w - group.x + 24);
    height = Math.max(height, box.y + box.h - group.y + 24);
  }
  if (width > group.width || height !== group.height) {
    group.width = width; group.height = height; changed = true;
  }
  if (oldCount <= 10 && items.length > 10 && !group.collapsed) { group.collapsed = true; changed = true; }
  return changed;
}

export function syncExistingFanout(graph: Graph, fanId: string, usedNodeIds?: ReadonlySet<string>): boolean {
  const rows = [...laneMap(graph.nodes, fanId).values()].map(nodes => nodes.find(node => !node.removed)).filter(node => !!node);
  rows.sort((a, b) => a.laneIndex! - b.laneIndex!);
  return reconcileFanout(graph, fanId, rows.map(node => ({ key: node.itemKey!, value: node.itemTitle ?? node.itemKey! })), usedNodeIds);
}

/** Apply a user edit to an entire lane. Host status, bindings, group drag and viewport edits are excluded. */
export function markFanoutOverrides(previous: Graph, next: Graph): void {
  const before = new Map(previous.nodes.map(node => [node.id, node]));
  const after = new Map(next.nodes.map(node => [node.id, node]));
  const changed = new Set<string>();
  const laneId = (item: { generatedBy?: string; itemKey?: string }) => JSON.stringify([item.generatedBy, item.itemKey]);
  const resumed = new Set(next.nodes.filter(node => node.generatedBy && node.overridden === false &&
    before.get(node.id)?.overridden === true).map(laneId));
  const fields: (keyof FlowNode)[] = ["title", "task", "draft", "continuationPrompt", "text", "config",
    "columns", "selectedItems", "items", "roleLabel", "planMode", "teamRef", "participation", "rerun"];
  for (const node of previous.nodes) {
    if (!node.generatedBy || node.removed) continue;
    const updated = after.get(node.id);
    const master = node.masterNodeId && after.get(node.masterNodeId);
    // A whole-document undo can roll back the mother and its already synchronized
    // children together. Removing a mother slot removes its generated copies.
    if (!updated && node.masterNodeId && !master) continue;
    const parent = before.get(node.parentId ?? ""), movedParent = after.get(node.parentId ?? "");
    const dx = (movedParent?.x ?? 0) - (parent?.x ?? 0), dy = (movedParent?.y ?? 0) - (parent?.y ?? 0);
    if (!updated || node.parentId !== updated.parentId || node.x + dx !== updated.x || node.y + dy !== updated.y ||
        fields.some(field => !sameValue(node[field], updated[field]) &&
          (!master || !sameValue(master[field], updated[field])))) changed.add(laneId(node));
  }
  const edges = new Map(next.edges.map(edge => [edge.id, edge]));
  const previousEdges = new Map(previous.edges.map(edge => [edge.id, edge]));
  const edgeFields = (edge: FlowEdge) => [edge.kind, edge.source, edge.target, edge.sourcePort, edge.targetPort,
    edge.mode, edge.trigger, edge.emitMode, edge.always, edge.maxRounds, edge.logic, edge.sourceItemKey];
  for (const edge of previous.edges) {
    if (!edge.generatedBy) continue;
    const updated = edges.get(edge.id);
    const master = edge.masterEdgeId && edges.get(edge.masterEdgeId);
    if (!updated && edge.masterEdgeId && !master) continue;
    if (!updated || !sameValue(edgeFields(edge), edgeFields(updated))) {
      const originalEndpoint = (id: string) => {
        const node = after.get(id);
        return node && node.generatedBy === edge.generatedBy && node.itemKey === edge.itemKey ? node.masterNodeId ?? id : id;
      };
      const logical = updated && { ...updated, source: originalEndpoint(updated.source), target: originalEndpoint(updated.target) };
      if (!logical || !master || !sameValue(edgeFields(logical), edgeFields(master))) changed.add(laneId(edge));
    }
    else if (!sameValue(edge.waypoints ?? [], updated.waypoints ?? [])) {
      const source = before.get(edge.generatedBy), moved = source && after.get(source.id);
      if (!source || !moved || (source.x === moved.x && source.y === moved.y)) changed.add(laneId(edge));
    }
  }
  for (const edge of next.edges) {
    if (previousEdges.has(edge.id) || edge.generatedBy) continue;
    const source = after.get(edge.source), target = after.get(edge.target);
    const lane = source?.generatedBy ? source : target?.generatedBy ? target : undefined;
    if (!lane || !lane.itemKey) continue;
    const peer = lane === source ? target : source;
    if (!peer) continue;
    changed.add(laneId(lane));
    if (!before.has(peer.id) && !peer.masterOf && !peer.generatedBy && peer.parentId === lane.parentId &&
        peer.kind !== "group" && peer.flowType !== "flowspace/merge-sort" && peer.flowType !== "flowspace/fanout") {
      Object.assign(peer, { generatedBy: lane.generatedBy, itemKey: lane.itemKey, laneIndex: lane.laneIndex,
        itemTitle: lane.itemTitle, overridden: true });
    }
    if (peer.generatedBy === lane.generatedBy && peer.itemKey === lane.itemKey) {
      edge.generatedBy = lane.generatedBy;
      edge.itemKey = lane.itemKey;
    }
  }
  if (changed.size) for (const node of next.nodes) if (node.generatedBy && changed.has(laneId(node)) && !resumed.has(laneId(node))) node.overridden = true;
}
