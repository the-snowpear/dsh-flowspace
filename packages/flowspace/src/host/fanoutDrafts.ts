import type { FlowContent, FlowNode, FlowspaceDocument, FlowspaceRun } from "../types.ts";
import { markFanoutOverrides, reconcileFanout, staticFanoutContent, syncExistingFanout } from "../core/fanout.ts";
import { createStaticResolver } from "../core/nodes/data/preview.ts";

function motherDefinition(doc: FlowspaceDocument, fan: FlowNode): string {
  const nodes = doc.nodes.filter(node => node.masterOf === fan.id);
  const ids = new Set(nodes.map(node => node.id));
  const edges = doc.edges.filter(edge => !edge.generatedBy && (ids.has(edge.source) || ids.has(edge.target)));
  return JSON.stringify([fan.config, nodes, edges]);
}

/** Drafts follow static inputs on the edit that changed them. Runtime graph snapshots stay frozen. */
export async function reconcileFanoutDrafts(next: FlowspaceDocument, previous: FlowspaceDocument, runs: FlowspaceRun[],
  resolveDeferred: (fanId: string) => Promise<FlowContent | undefined>, changedFiles: readonly string[] = []): Promise<boolean> {
  const fans = next.nodes.filter(node => node.flowType === "flowspace/fanout");
  if (!fans.length) return false;
  markFanoutOverrides(previous, next);
  const oldInputs = createStaticResolver(previous);
  const newInputs = createStaticResolver(next, {}, Object.fromEntries(changedFiles.map(id => [id, "changed"])));
  let changed = false;
  const needsHost = (state: string) => state === "needs-file" || state === "needs-code" || state === "needs-spill";
  const used = new Set(runs.flatMap(run => run.steps.map(step => step.nodeId)));
  for (const run of runs) {
    if (run.state === "running" || run.state === "waiting" || run.state === "paused") {
      for (const node of run.graph.nodes) if (node.generatedBy) used.add(node.id);
    }
  }
  for (const fan of fans) {
    const old = previous.nodes.find(node => node.id === fan.id);
    const motherChanged = !old || motherDefinition(previous, old) !== motherDefinition(next, fan);
    if (!motherChanged && oldInputs.signature(fan.id) === newInputs.signature(fan.id)) continue;
    let after = staticFanoutContent(next, fan.id);
    if (!after && needsHost(newInputs.inputs(fan.id).state)) after = await resolveDeferred(fan.id);
    if (after || (old && (staticFanoutContent(previous, fan.id) || needsHost(oldInputs.inputs(fan.id).state)))) {
      if (reconcileFanout(next, fan.id, after?.items ?? [], used)) changed = true;
    } else if (motherChanged) {
      if (syncExistingFanout(next, fan.id, used)) changed = true;
    }
  }
  return changed;
}
