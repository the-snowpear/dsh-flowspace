import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_NODE_FULL_SIZE, emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { createFanoutPair, markFanoutOverrides, reconcileFanout } from "../src/core/fanout.ts";
import { FULL_SIZE } from "../src/client/geometry.ts";
import { captureTemplate, instantiateTemplate, synchronizeTemplate } from "../src/client/templates.ts";

test("DEFAULT_NODE_FULL_SIZE and geometry FULL_SIZE stay in lockstep", () => {
  assert.deepEqual(FULL_SIZE, DEFAULT_NODE_FULL_SIZE);
});

test("synchronizeTemplate preserves flow config, budget, breakpoint, and board settings on unbound slots", () => {
  const doc = emptyDocument();
  const group = newNode("group", 0, 0, "Flow Group");
  const agent = newNode("agent", 40, 80, "Worker");
  agent.parentId = group.id;
  agent.task = "Initial task";
  agent.draft = "Initial task";
  const flow = newFlowNode("flowspace/condition", 400, 80);
  flow.parentId = group.id;
  doc.nodes.push(group, agent, flow);
  doc.edges.push(newEdge(agent.id, flow.id, "continuation"));

  const v1 = captureTemplate(doc, group.id, "Tpl", "desc");
  const targetDoc = emptyDocument();
  const instance = instantiateTemplate(targetDoc, v1, 100, 100, "Instance");

  // Update v2 with newer persisted fields
  const v2 = structuredClone(v1);
  v2.revision = 2;
  const tplAgent = v2.nodes.find((n) => n.kind === "agent")!;
  tplAgent.breakpoint = true;
  tplAgent.budget = { tokens: 5000, rounds: 3 };
  tplAgent.canvasToolsOnly = true;
  tplAgent.teamConfig = { persona: "Lead", norms: "Strict" };
  const tplFlow = v2.nodes.find((n) => n.kind === "flow")!;
  tplFlow.config = { ...tplFlow.config, branches: [{ id: "yes", label: "Yes", rules: [{ field: "text", op: "contains", value: "PASS" }] }] };

  synchronizeTemplate(targetDoc, instance.id, v2, false);

  const syncedAgent = targetDoc.nodes.find((n) => n.kind === "agent" && n.parentId === instance.id)!;
  const syncedFlow = targetDoc.nodes.find((n) => n.kind === "flow" && n.parentId === instance.id)!;
  assert.equal(syncedAgent.breakpoint, true);
  assert.deepEqual(syncedAgent.budget, { tokens: 5000, rounds: 3 });
  assert.equal(syncedAgent.canvasToolsOnly, true);
  assert.deepEqual(syncedAgent.teamConfig, { persona: "Lead", norms: "Strict" });
  assert.deepEqual(syncedFlow.config, tplFlow.config);
});

test("fanout reconciliation preserves branch on bound lane agents and detects new override fields", () => {
  const doc = emptyDocument();
  const { fan, master } = createFanoutPair(doc, 0, 0);
  master.task = "Process";
  reconcileFanout(doc, fan.id, [{ key: "k1", value: "One" }]);

  const laneAgent = doc.nodes.find((n) => n.generatedBy === fan.id && n.kind === "agent")!;
  laneAgent.sessionId = "sess-1";
  laneAgent.branch = "feat/demo";
  laneAgent.worktreePath = "/repo-wt";

  // Re-reconcile after master edit: branch must survive on the bound lane agent
  master.task = "Process v2";
  reconcileFanout(doc, fan.id, [{ key: "k1", value: "One" }]);
  const afterSync = doc.nodes.find((n) => n.id === laneAgent.id)!;
  assert.equal(afterSync.branch, "feat/demo");
  assert.equal(afterSync.sessionId, "sess-1");

  // Editing budget/breakpoint on a lane node must mark the lane overridden
  const prev = structuredClone(doc);
  const edited = structuredClone(doc);
  const editedLane = edited.nodes.find((n) => n.id === laneAgent.id)!;
  editedLane.breakpoint = true;
  editedLane.budget = { tokens: 1000 };
  markFanoutOverrides(prev, edited);
  assert.equal(edited.nodes.find((n) => n.id === laneAgent.id)!.overridden, true);
});
