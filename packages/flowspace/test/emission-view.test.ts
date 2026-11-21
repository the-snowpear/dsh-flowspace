import assert from "node:assert/strict";
import test from "node:test";
import { runtimeIndex } from "../src/client/sceneModel.ts";
import { edgeLabels } from "../src/client/nodes/edgeLabels.ts";
import { t as translate } from "../src/client/i18n.ts";
import { contentList } from "../src/core/content.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { registerDescriptor } from "../src/core/nodes/registry.ts";
import { condition } from "../src/core/nodes/judge/condition.ts";
import type { FlowspaceRun, FlowspaceSnapshot, FlowToken, RunStep } from "../src/types.ts";

test("the Agent reminder targets an outstanding step in its original run", () => {
  const document = emptyDocument();
  const node = newNode("agent", 0, 0);
  document.nodes.push(node);
  const step = (id: string): RunStep => ({
    id, nodeId: node.id, requestId: id, state: "error", iteration: 1, task: "", sources: [], createdAt: 1,
    emission: { items: [], calls: [], total: 0, limit: 10, closed: true, missing: true },
  });
  const run = (id: string, s: RunStep, state: FlowspaceRun["state"] = "error"): FlowspaceRun => ({
    id, state, title: id, origin: "canvas", createdAt: 1, scope: null, roots: [node.id], participants: [node.id],
    graph: { nodes: [node], edges: [] }, steps: [s], tokens: [], notes: [],
  });
  const first = step("first"), second = step("second");
  const runs = [run("first-run", first), run("second-run", second), run("cancelled", step("cancelled"), "cancelled")];
  const snapshot = (): FlowspaceSnapshot => ({ document, runs, live: [], nativeMessages: [], subagents: [], sourceVersions: {} });
  assert.deepEqual(runtimeIndex(snapshot()).missingEmissions.get(node.id), { runId: "second-run", step: second });
  second.emission!.reminderStepId = "follow-up";
  assert.deepEqual(runtimeIndex(snapshot()).missingEmissions.get(node.id), { runId: "first-run", step: first });
  runs[0].state = "interrupted";
  assert.equal(runtimeIndex(snapshot()).missingEmissions.has(node.id), false);
});

test("Agent wire labels follow the receiving port and prefer retained list items", t => {
  t.after(registerDescriptor({
    ...condition, flowType: "test/list-label",
    ports: () => [{ id: "in", role: "continuation", direction: "in", dataType: "list" }],
  }));
  const source = newNode("agent", 0, 0);
  const target = newFlowNode("test/list-label", 400, 0);
  const edge = newEdge(source.id, target.id, "continuation");
  const token: FlowToken = {
    id: "token", edgeId: edge.id, stepId: "step", createdAt: 1, ready: true, consumed: false, dismissed: false, boundary: false,
    source: { id: "snapshot", kind: "conclusion", sourceNodeId: source.id, title: source.title,
      text: '["old"]', capturedAt: 1, content: contentList(["one", "two", "three"], 2) },
  };
  const list = translate("flow_data_list");
  assert.equal(edgeLabels(edge, source, target, token).type, list + "·2");
  delete token.source.content;
  assert.equal(edgeLabels(edge, source, target, token).type, list + "·1");
  assert.equal(edgeLabels(edge, source, target, { ...token, skip: true }).type, list);
});
