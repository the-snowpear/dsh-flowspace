import { mergePendingGeneration } from "../core/generation.ts";
import type { FlowEdge, FlowNode, FlowspaceDocument } from "../types.ts";
import { byId, shareSnapshotValue } from "./sceneModel.ts";

/** A follow notification can contain more than one new batch after a slow frame. */
export function receiveGeneration(draft: FlowspaceDocument, host: FlowspaceDocument) {
  const history: FlowspaceDocument[] = [];
  const seen = draft.generationRevision ?? 0;
  const revision = host.generationRevision ?? 0;
  if (revision <= seen) return { document: draft, history };
  const batches = new Set([...host.nodes, ...host.edges]
    .map(element => element.generatedRevision ?? 0).filter(value => value > seen));
  let document = draft;
  for (const batch of [...batches].sort((a, b) => a - b)) {
    const throughBatch = (element: FlowNode | FlowEdge) => (element.generatedRevision ?? 0) <= batch;
    const next = mergePendingGeneration(document, batch === revision ? host : {
      ...host, generationRevision: batch, nodes: host.nodes.filter(throughBatch), edges: host.edges.filter(throughBatch),
    });
    if (next.nodes.length !== document.nodes.length || next.edges.length !== document.edges.length) history.push(document);
    document = next;
  }
  return { document: { ...document, generationRevision: revision }, history };
}

function mergeFields<T extends FlowNode | FlowEdge>(base: T, local: T, host: T, keys: (keyof T)[]): T {
  let result = local;
  for (const key of keys) {
    if (shareSnapshotValue(base[key], host[key]) === base[key] || shareSnapshotValue(base[key], local[key]) !== base[key]) continue;
    if (result === local) result = { ...local };
    if (Object.hasOwn(host, key)) result[key] = host[key];
    else delete result[key];
  }
  return result;
}

function mergeLaneElements<T extends FlowNode | FlowEdge>(
  before: T[], current: T[], incoming: T[], canAdd: (element: T) => boolean,
  layout?: (node: T, old: T, host: T) => T,
): T[] {
  const base = byId(before), host = byId(incoming);
  const present = new Set(current.map(element => element.id));
  const elements = current.flatMap(element => {
    const old = base.get(element.id), updated = host.get(element.id);
    if (!old) return [element];
    if (!element.generatedBy) {
      if (layout && updated && "fanout" in element && element.fanout) return [layout(element, old, updated)];
      return [element];
    }
    if (!updated) return shareSnapshotValue(old, element) === old ? [] : [element];
    const keys = [...new Set([...Object.keys(old), ...Object.keys(updated)])] as (keyof T)[];
    return [mergeFields(old, element, updated, keys)];
  });
  for (const element of incoming) {
    // A missing, acknowledged dynamic lane may have just been removed by undo.
    if (element.generatedBy && !element.generatedRevision && !base.has(element.id) &&
      !present.has(element.id) && canAdd(element)) elements.push(element);
  }
  return elements;
}

/** Fold static source reconciliation into the authored edit that caused it. */
export function reconcileLaneChanges(base: FlowspaceDocument, local: FlowspaceDocument, host: FlowspaceDocument): FlowspaceDocument {
  if (!host.nodes.some(node => node.fanout) && !base.nodes.some(node => node.fanout)) return local;
  const owners = new Set(local.nodes.map(node => node.id));
  const count = (doc: FlowspaceDocument, fanId: string) => new Set(doc.nodes
    .filter(node => node.generatedBy === fanId && !node.removed).map(node => node.itemKey)).size;
  const nodes = mergeLaneElements(base.nodes, local.nodes, host.nodes, node => owners.has(node.generatedBy!),
    (node, old, updated) => {
      const keys: (keyof FlowNode)[] = ["height", "width"];
      // A user can fold again before the earlier expand acknowledgement arrives.
      // Only crossing the automatic folding threshold changes this authored flag.
      if (updated.collapsed && !old.collapsed &&
        count(base, node.fanout!.fanId) <= 10 && count(host, node.fanout!.fanId) > 10) keys.push("collapsed");
      return mergeFields(old, node, updated, keys);
    });
  const endpoints = new Set(nodes.map(node => node.id));
  const edges = mergeLaneElements(base.edges, local.edges, host.edges, edge =>
    endpoints.has(edge.generatedBy!) && endpoints.has(edge.source) && endpoints.has(edge.target))
    .filter(edge => endpoints.has(edge.source) && endpoints.has(edge.target));
  return shareSnapshotValue(local, { ...local, nodes, edges });
}
