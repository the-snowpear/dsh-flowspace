import type { FlowspaceDocument } from "../types.ts";

/** Only a Host-created batch enters canvas history. Session updates share its revision. */
export function stampGeneratedBatch(
  doc: FlowspaceDocument, beforeNodes: ReadonlySet<string>, beforeEdges: ReadonlySet<string>,
): boolean {
  const nodes = doc.nodes.filter(node => node.generatedBy && !beforeNodes.has(node.id));
  const edges = doc.edges.filter(edge => edge.generatedBy && !beforeEdges.has(edge.id));
  if (!nodes.length && !edges.length) return false;
  const revision = (doc.generationRevision ?? 0) + 1;
  doc.generationRevision = revision;
  for (const element of [...nodes, ...edges]) element.generatedRevision = revision;
  return true;
}

/** Carry an unseen Host batch across a simultaneous user save, down to its last wire. */
export function mergePendingGeneration(draft: FlowspaceDocument, host: FlowspaceDocument): FlowspaceDocument {
  const seen = draft.generationRevision ?? 0;
  if ((host.generationRevision ?? 0) <= seen) return draft;
  const nodeIds = new Set(draft.nodes.map(node => node.id));
  const edgeIds = new Set(draft.edges.map(edge => edge.id));
  const nodes = host.nodes.filter(node => (node.generatedRevision ?? 0) > seen &&
    node.generatedBy && nodeIds.has(node.generatedBy) && !nodeIds.has(node.id));
  for (const node of nodes) nodeIds.add(node.id);
  const edges = host.edges.filter(edge => (edge.generatedRevision ?? 0) > seen &&
    edge.generatedBy && nodeIds.has(edge.generatedBy) && !edgeIds.has(edge.id) &&
    nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const changedFans = new Set(nodes.map(node => node.generatedBy));
  const groups = new Map(host.nodes.filter(node => node.fanout && changedFans.has(node.fanout.fanId))
    .map(node => [node.id, node]));
  const authored = draft.nodes.map(node => {
    const group = groups.get(node.id);
    return group ? { ...node, width: group.width, height: group.height, collapsed: group.collapsed } : node;
  });
  return { ...draft, generationRevision: host.generationRevision,
    nodes: [...authored, ...structuredClone(nodes)], edges: [...draft.edges, ...structuredClone(edges)] };
}
