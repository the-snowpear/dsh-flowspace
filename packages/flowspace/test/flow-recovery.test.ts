import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { z } from "zod";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { registerDescriptor } from "../src/core/nodes/registry.ts";
import { Scheduler, type RuntimeAdapter, type SchedulerStore } from "../src/core/scheduler.ts";
import type { ContextSnapshot, FlowspaceRun, RunStep } from "../src/types.ts";

function restartFixture(t: TestContext) {
  const type = "test/recovery";
  t.after(registerDescriptor({
    flowType: type, version: 1, family: "logic", titleKey: "flow_node", descKey: "flow_node",
    icon: "logic-branch", configSchema: z.object({}), defaultConfig: {}, ports: () => [],
    size: { compact: [256, 96], full: [312, 200] }, capabilities: {}, quickCreate: {canvas: true}, experimental: true,
  }));
  const doc = emptyDocument();
  const agent = (id: string) => ({ ...newNode("agent", 0, 0, id), id, draft: id });
  const question = { ...newFlowNode(type, 0, 0), id: "question" };
  const runningCode = { ...newFlowNode(type, 0, 0), id: "running-code" };
  doc.nodes = [agent("source"), agent("inflight"), runningCode, question, agent("after-delay"), agent("after-choice")];
  const delay = { ...newEdge("source", "after-delay", "continuation"), logic: { delayMs: 10 } };
  doc.edges = [delay, newEdge("source", question.id, "continuation"),
    { ...newEdge(question.id, "after-choice", "continuation"), sourcePort: "pass" }];
  const snapshot: ContextSnapshot = {
    id: "snapshot", kind: "text", sourceNodeId: "source", title: "Upstream", text: "saved work", capturedAt: 100,
  };
  const step = (nodeId: string, state: RunStep["state"]): RunStep => ({
    id: nodeId, nodeId, requestId: nodeId, task: "", sources: [], createdAt: 100, iteration: 1, state,
  });
  const run: FlowspaceRun = {
    id: "run", title: "Mixed restart", origin: "canvas", state: "running", createdAt: 100,
    scope: null, roots: ["source", "inflight", "running-code"], participants: doc.nodes.map(n => n.id),
    graph: {nodes: doc.nodes, edges: doc.edges}, notes: [],
    steps: [step("source", "completed"), { ...step("inflight", "running"), sessionId: "native-agent" },
      step("running-code", "running"), { ...step("question", "awaiting"), sources: [snapshot],
        human: {question: "Proceed?", options: ["pass"], timeoutAction: "wait"} }],
    tokens: [{ id: "delay-token", edgeId: delay.id, stepId: "source", source: snapshot,
      consumed: false, dismissed: false, boundary: false, ready: false, createdAt: 100, readyAt: 110, delayUntil: 110 }],
  };
  const sent: string[] = [], reconciled: string[] = [], cancelled: string[] = [];
  const runtime: RuntimeAdapter = {
    ensure: async n => n.id, send: async s => { sent.push(s.nodeId); },
    cancel: async s => { cancelled.push(s.nodeId); }, execute: async () => assert.fail("replayed executor"),
    capture: async () => snapshot, reference: async () => snapshot,
    reconcile: async s => { reconciled.push(s.nodeId); return {state: "interrupted", endedAt: 100}; },
  };
  const store: SchedulerStore = {
    document: () => doc, changed: async () => {}, bound: async () => {}, submitted: async () => {},
  };
  return { run, runtime, store, sent, reconciled, cancelled };
}

for (const graceful of [false, true]) {
  test(`mixed human/delay waits survive ${graceful ? "Host shutdown" : "Host loss"} alongside an active Agent and executor`, async t => {
    t.mock.timers.enable({apis: ["setTimeout", "Date"], now: 100});
    const f = restartFixture(t);
    if (graceful) await new Scheduler(f.runtime, f.store, [f.run]).dispose();
    const saved = structuredClone(f.run);
    const next = new Scheduler(f.runtime, f.store, [saved]);
    t.after(() => next.dispose());
    await next.recover();
    assert.equal(saved.state, "waiting");
    assert.deepEqual(f.reconciled, graceful ? [] : ["inflight"]);
    assert.deepEqual(f.cancelled, graceful ? ["inflight"] : []);
    for (const id of ["inflight", "running-code"]) assert.equal(saved.steps.find(s => s.id === id)?.state, "interrupted");
    assert.deepEqual(f.sent, []);
    t.mock.timers.tick(10);
    await next.transact(async () => {});
    assert.deepEqual(f.sent, ["after-delay"]);
    await next.command(saved.id, "pause");
    await next.answerHuman(saved.id, "question", "pass");
    assert.equal(saved.state, "paused");
    assert.equal(saved.steps.find(s => s.id === "question")?.route, "pass");
    assert.deepEqual(f.sent, ["after-delay"]);
    await next.command(saved.id, "resume");
    assert.deepEqual(f.sent, ["after-delay", "after-choice"]);
    assert.deepEqual(saved.tokens.filter(token => !token.consumed), []);
  });
}

test("an executor error with no live handler leaves a failed step and run", async t => {
  const f = restartFixture(t);
  f.run.state = "paused";
  f.run.tokens = [];
  f.run.steps = [{...f.run.steps[0], state: "completed", route: "error", error: "invalid result"}];
  const scheduler = new Scheduler(f.runtime, f.store, [f.run]);
  await scheduler.command(f.run.id, "resume");
  assert.equal(f.run.steps[0].state, "error");
  assert.equal(f.run.state, "error");
});
