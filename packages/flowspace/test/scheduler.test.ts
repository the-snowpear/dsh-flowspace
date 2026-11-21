import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { Scheduler, type RuntimeAdapter, type SchedulerStore } from "../src/core/scheduler.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { registerDescriptor } from "../src/core/nodes/registry.ts";
import type { NodeExecutor, PortSpec } from "../src/core/nodes/types.ts";
import type { FlowEdge, RunStep } from "../src/types.ts";

function fixture(count = 3) {
  const doc = emptyDocument();
  doc.nodes = Array.from({ length: count }, (_, i) => ({
    ...newNode("agent", i * 400, 0, String(i)),
    task: `task ${i}`,
    draft: `task ${i}`,
  }));
  const sent: RunStep[] = [],
    cancelled: string[] = [];
  const planActiveSessions = new Set<string>();
  const runtime: RuntimeAdapter = {
    ensure: async (n, fork) =>
      n.sessionId ?? `${fork ? "fork" : "session"}-${n.id}`,
    send: async (s) => {
      sent.push(structuredClone(s));
    },
    cancel: async (s) => {
      cancelled.push(s.requestId);
    },
    capture: async (n, mode, seq = 1, output = `output ${n.title}`) => ({
      id: `${n.id}-${seq}`,
      kind: mode,
      sourceNodeId: n.id,
      sourceSessionId: n.sessionId,
      seq,
      title: n.title,
      text: output,
      capturedAt: 1,
    }),
    reference: async (n) => ({
      id: n.id,
      kind: "text",
      sourceNodeId: n.id,
      title: n.title,
      text: n.text,
      capturedAt: 1,
    }),
    isPlanModeActive: (sessionId) => planActiveSessions.has(sessionId),
  };
  const store: SchedulerStore = {
    document: () => doc,
    changed: async () => {},
    bound: async (id, sessionId) => {
      doc.nodes.find((n) => n.id === id)!.sessionId = sessionId;
    },
    submitted: async (id, task) => {
      const n = doc.nodes.find((n) => n.id === id)!;
      n.draft = "";
      n.lastSubmittedTask = task;
    },
  };
  const scheduler = new Scheduler(runtime, store);
  const edge = (a: number, b: number, opts: Partial<FlowEdge> = {}) => {
    const e = {
      ...newEdge(doc.nodes[a].id, doc.nodes[b].id, "continuation"),
      ...opts,
    };
    doc.edges.push(e);
    return e;
  };
  let turn = 0;
  const finish = async (
    index: number,
    ending = "completed",
    output = `result ${index}`,
  ) => {
    const step = sent[index];
    const t = ++turn;
    await scheduler.claim(step.requestId, t);
    await scheduler.finish(step.sessionId!, t, ending, t * 10, output);
  };
  return {
    doc,
    sent,
    scheduler,
    edge,
    finish,
    cancelled,
    planActiveSessions,
    runtime,
    store,
  };
}

test("serial runs enqueue only roots, then each successor once", async () => {
  const f = fixture();
  f.edge(0, 1);
  f.edge(1, 2);
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  assert.equal(f.sent.length, 1);
  await f.finish(0);
  assert.equal(f.sent.length, 2);
  await f.finish(1);
  await f.finish(2);
  assert.equal(f.scheduler.runs[0].state, "completed");
});

test("team settlement holds successors and uses the final native lead turn", async () => {
  const f = fixture(2);
  f.doc.nodes[0].teamRef = { teamId: "team" };
  f.edge(0, 1);
  const idle = Promise.withResolvers<void>();
  f.runtime.waitForTeam = () => idle.promise;
  f.runtime.teamReference = () => ({ teamId: "team", revision: 3 });
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  await f.finish(0, "completed", "Working");
  const step = f.scheduler.runs[0].steps[0];
  assert.equal(step.state, "settling");
  assert.equal(f.sent.length, 1);
  assert.equal(f.scheduler.busy().has(step.nodeId), true);
  await f.scheduler.finish(step.sessionId!, 2, "completed", 20, "Final report", undefined, true);
  await f.scheduler.finish(step.sessionId!, 2, "completed", 20, "Duplicate", undefined, true);
  idle.resolve();
  await Promise.resolve();
  await f.scheduler.transact(async () => {});
  assert.equal(step.state, "completed");
  assert.deepEqual(step.teamRef, { teamId: "team", revision: 3 });
  assert.equal(f.sent[1].sources[0].text, "Final report");
  assert.equal(f.sent[1].sources[0].seq, 20);
});

test("cancelling a settling team aborts its step without releasing a successor", async () => {
  const f = fixture(2);
  f.doc.nodes[0].teamRef = { teamId: "team" };
  f.edge(0, 1);
  const idle = Promise.withResolvers<void>();
  f.runtime.waitForTeam = () => idle.promise;
  const run = await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  await f.finish(0);
  await f.scheduler.command(run.id, "cancel");
  idle.resolve();
  await Promise.resolve();
  await f.scheduler.transact(async () => {});
  assert.equal(f.sent.length, 1);
  assert.equal(f.cancelled.length, 1);
  assert.equal(f.scheduler.runs[0].steps[0].state, "aborted");
});

test("join waits for all active upstreams and explicit confirmation", async () => {
  const f = fixture();
  f.edge(0, 2);
  f.edge(1, 2, { trigger: "confirm" });
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  await f.finish(0);
  assert.equal(f.sent.length, 2);
  await f.finish(1);
  assert.equal(f.sent.length, 2);
  const r = f.scheduler.runs[0];
  await f.scheduler.release(r.id, r.tokens.find((t) => !t.ready)!.id, true);
  assert.equal(f.sent.length, 3);
  assert.equal(f.sent[2].sources.length, 2);
});

test("queued continuations hold A1 instead of later A2", async () => {
  const f = fixture(2);
  f.edge(0, 1, { trigger: "confirm" });
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  await f.finish(0, "completed", "A1");
  f.doc.nodes[0].draft = "A2";
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  await f.finish(1, "completed", "A2");
  const r = f.scheduler.runs[0];
  await f.scheduler.release(r.id, r.tokens[0].id, true);
  assert.equal(f.sent[2].sources[0].text, "A1");
});

test("scope boundary retains original run through release", async () => {
  const f = fixture();
  f.edge(0, 1);
  f.edge(1, 2);
  const r = await f.scheduler.start({
    kind: "selection",
    nodeIds: [f.doc.nodes[0].id],
  });
  await f.finish(0);
  assert.equal(f.sent.length, 1);
  await f.scheduler.release(r.id, f.scheduler.runs[0].tokens[0].id, true);
  await f.finish(1);
  assert.equal(f.sent.length, 2);
  assert.equal(f.scheduler.runs[0].tokens[1].boundary, true);
});

test("cycle parks at three rounds with loopCapReached, supports +1 round extendLoop and dismiss", async () => {
  const f = fixture();
  f.edge(0, 1);
  f.edge(1, 2);
  f.edge(2, 1);
  const run = await f.scheduler.start({ kind: "global", nodeIds: [] });
  for (let i = 0; i < 7; i++) await f.finish(i);
  assert.equal(f.sent.length, 7);
  assert.equal(f.sent.filter((s) => s.nodeId === f.doc.nodes[1].id).length, 3);
  // Bounded loop parks token at round cap (`waiting`) instead of silently dropping
  assert.equal(f.scheduler.runs[0].state, "waiting");
  const parked = f.scheduler.runs[0].tokens.find((t) => t.loopCapReached);
  assert.ok(parked, "feedback token is marked loopCapReached");

  // Grant +1 round via extendLoop -> runs round 4 of (1 -> 2) while preserving external root 0 input
  await f.scheduler.extendLoop({
    runId: run.id,
    nodeId: f.doc.nodes[1].id,
    extraRounds: 1,
  });
  assert.equal(f.sent.length, 8);
  assert.equal(f.sent[7].nodeId, f.doc.nodes[1].id);
  assert.equal(f.sent[7].sources.length, 2);
  await f.finish(7);
  await f.finish(8);
  assert.equal(f.scheduler.runs[0].state, "waiting");

  // Dismissing the parked loop token settles the run cleanly to completed
  const secondParked = f.scheduler.runs[0].tokens.find((t) => t.loopCapReached)!;
  await f.scheduler.release(run.id, secondParked.id, false);
  assert.equal(f.scheduler.runs[0].state, "completed");
});

test("error and cancellation never advance downstream", async () => {
  for (const ending of ["error", "aborted", "blocked", "max-tokens"]) {
    const f = fixture(2);
    f.edge(0, 1);
    await f.scheduler.start({ kind: "global", nodeIds: [] });
    await f.finish(0, ending);
    assert.equal(f.sent.length, 1);
    assert.equal(f.scheduler.runs[0].state, "error");
  }
});

test("pause stops new dispatch, resume consumes captured tokens", async () => {
  const f = fixture(2);
  f.edge(0, 1);
  const r = await f.scheduler.start({ kind: "global", nodeIds: [] });
  await f.scheduler.command(r.id, "pause");
  await f.finish(0);
  assert.equal(f.sent.length, 1);
  await f.scheduler.command(r.id, "resume");
  assert.equal(f.sent.length, 2);
});

test("native chat default and node overrides, duplicate request deduplication", async () => {
  const f = fixture(2);
  f.edge(0, 1);
  const n = f.doc.nodes[0];
  n.sessionId = "native";
  await f.scheduler.native("native", "input1", "hello");
  await f.scheduler.native("native", "input1", "hello");
  assert.equal(f.scheduler.runs.length, 1);
  n.nativeTrigger = "disabled";
  await f.scheduler.native("native", "input2", "hello");
  assert.equal(f.scheduler.runs.length, 1);
  await f.scheduler.native("native", "input3", "hello", true);
  assert.equal(f.scheduler.runs.length, 2);
});

test("duplicate turn end cannot trigger two downstream messages", async () => {
  const f = fixture(2);
  f.edge(0, 1);
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  await f.finish(0);
  await f.scheduler.finish(f.sent[0].sessionId!, 1, "completed", 10, "again");
  assert.equal(f.sent.length, 2);
});

test("restart marks work interrupted without resending and survives deleted external sessions", async () => {
  const f = fixture(3);
  f.edge(0, 1);
  f.edge(1, 2);
  f.doc.nodes[2].participation = "manual";
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  await f.finish(0, "completed", "done-0");
  // Simulate step 1 throwing session/not-found during reconcile while step 0 stays safe
  f.runtime.reconcile = async () => {
    throw new Error("session/not-found");
  };
  await f.scheduler.recover();
  assert.equal(f.scheduler.runs[0].state, "interrupted");
  assert.equal(f.sent.length, 2);
});

test("fork reuses created identity on subsequent rounds", async () => {
  const f = fixture(2);
  f.edge(0, 1, { mode: "fork" });
  f.edge(1, 0);
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  for (let i = 0; i < 6; i++) await f.finish(i);
  const child = f.sent.filter((s) => s.nodeId === f.doc.nodes[1].id);
  assert.ok(child[0].sessionId!.startsWith("fork"));
  assert.ok(child.every((s) => s.sessionId === child[0].sessionId));
});

test("manual input to a busy node queues without interrupting its existing turn", async () => {
  const f = fixture(1);
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  f.doc.nodes[0].draft = "follow-up";
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[0].id] });
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].task, "follow-up");
  assert.equal(f.cancelled.length, 0);
});

test("excluding one global root still allows the other branch to finish its join", async () => {
  const f = fixture();
  f.edge(0, 2);
  f.edge(1, 2);
  await f.scheduler.start({
    kind: "global",
    nodeIds: [],
    excludeRootIds: [f.doc.nodes[1].id],
  });
  assert.equal(f.sent.length, 1);
  await f.finish(0);
  assert.equal(f.sent.length, 2);
});

test("manual start of a fork draft honors its fork input", async () => {
  const f = fixture(2);
  f.doc.nodes[0].sessionId = "source";
  f.edge(0, 1, { mode: "fork" });
  await f.scheduler.start({ kind: "single", nodeIds: [f.doc.nodes[1].id] });
  assert.match(f.sent[0].sessionId!, /^fork-/);
});

test("steering inputs entering the same turn cause one continuation", async () => {
  const f = fixture(2);
  f.edge(0, 1);
  f.doc.nodes[0].sessionId = "native";
  await f.scheduler.native("native", "first", "first");
  await f.scheduler.claim("first", 1);
  await f.scheduler.native("native", "steer", "follow-up");
  await f.scheduler.claim("steer", 1);
  await f.scheduler.finish("native", 1, "completed", 10, "result");
  assert.equal(f.scheduler.runs.length, 1);
  assert.equal(f.sent.length, 1);
});

test("ComfyUI Bypass (`bypassed`) skips DSH execution and passes upstream output straight through to downstream", async () => {
  const f = fixture(4);
  // 0 (Analyze) -> 1 (Bypassed Critic) -> 2 (Bypassed Polisher) -> 3 (Deliver)
  f.doc.nodes[1].participation = "bypassed";
  f.doc.nodes[2].participation = "bypassed";
  f.edge(0, 1);
  f.edge(1, 2);
  f.edge(2, 3);

  const plan = f.scheduler.plan({ kind: "global", nodeIds: [] });
  assert.deepEqual(plan.roots, [f.doc.nodes[0].id]);
  assert.deepEqual(plan.later, [f.doc.nodes[3].id]);

  await f.scheduler.start({ kind: "global", nodeIds: [] });
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].nodeId, f.doc.nodes[0].id);

  await f.finish(0, "completed", "UPSTREAM_PAYLOAD_77");
  // Nodes 1 and 2 must NOT run; Node 3 immediately receives Node 0's output!
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].nodeId, f.doc.nodes[3].id);
  assert.equal(f.sent[1].sources[0].text, "UPSTREAM_PAYLOAD_77");

  await f.finish(1, "completed", "DELIVERED");
  assert.equal(f.scheduler.runs[0].state, "completed");
});

test("Muted (`paused`) intermediate branch never deadlocks sibling diamond joins", async () => {
  const f = fixture(4);
  // Diamond: 0 -> 1 (paused) -> 3 AND 0 -> 2 (active) -> 3
  f.doc.nodes[1].participation = "paused";
  f.edge(0, 1);
  f.edge(1, 3);
  f.edge(0, 2);
  f.edge(2, 3);

  await f.scheduler.start({ kind: "global", nodeIds: [] });
  assert.equal(f.sent.length, 1);
  await f.finish(0, "completed", "root-out");

  // Only Node 2 runs
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].nodeId, f.doc.nodes[2].id);

  await f.finish(1, "completed", "branch-2-out");
  // Join Node 3 fires cleanly with branch 2's output instead of deadlocking on paused Node 1!
  assert.equal(f.sent.length, 3);
  assert.equal(f.sent[2].nodeId, f.doc.nodes[3].id);
  assert.equal(f.sent[2].sources[0].text, "branch-2-out");

  await f.finish(2, "completed", "joined-done");
  assert.equal(f.scheduler.runs[0].state, "completed");
});

test("R2: Plan-mode turn ending without exit_plan_mode holds downstream at planGate until released", async () => {
  const f = fixture(2);
  f.doc.nodes[0].planMode = true;
  f.edge(0, 1);

  const run = await f.scheduler.start({ kind: "global", nodeIds: [] });
  f.planActiveSessions.add(f.sent[0].sessionId!);
  await f.finish(0, "completed", "## Draft Plan\n1. Step one");

  // Downstream must NOT fire while Plan mode is still active
  assert.equal(f.sent.length, 1);
  assert.equal(f.scheduler.runs[0].state, "waiting");
  const gateToken = f.scheduler.runs[0].tokens[0];
  assert.equal(gateToken.planGate, true);
  assert.equal(gateToken.ready, false);

  // Releasing the plan gate dispatches downstream with the approved plan text
  f.planActiveSessions.delete(f.sent[0].sessionId!);
  await f.scheduler.release(run.id, gateToken.id, true);
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].sources[0].text, "## Draft Plan\n1. Step one");
});

test("Partial DAG runs (`from-node` & `to-node`) and Group Run title", async () => {
  const f = fixture(3);
  const group = newNode("group", 0, 0, "TDD Blueprint Group");
  f.doc.nodes.forEach((n) => {
    n.parentId = group.id;
  });
  f.doc.nodes.unshift(group);
  f.edge(1, 2); // nodes[1] ("0") -> nodes[2] ("1")
  f.edge(2, 3); // nodes[2] ("1") -> nodes[3] ("2")

  // 1. Group Run uses the Group's title
  const grpRun = await f.scheduler.start({
    kind: "group",
    nodeIds: [group.id],
  });
  assert.equal(grpRun.title, "TDD Blueprint Group");
  await f.finish(0, "completed", "ARCH_SUMMARY");
  await f.finish(1, "completed", "REVIEW_V1");
  await f.finish(2, "completed", "SUMMARY_V1");
  assert.equal(f.scheduler.runs[0].state, "completed");

  // 2. `from-node` on middle node ("1"): reuses "0"'s completed session without re-running "0", runs "1" -> "2"
  f.doc.nodes[2].continuationPrompt = "Re-verify with stricter checks";
  const fromRun = await f.scheduler.start({
    kind: "from-node",
    nodeIds: [f.doc.nodes[2].id],
  });
  assert.deepEqual(fromRun.roots, [f.doc.nodes[2].id]);
  assert.equal(f.sent.length, 4);
  assert.equal(f.sent[3].nodeId, f.doc.nodes[2].id);
  assert.equal(f.sent[3].sources[0].sourceNodeId, f.doc.nodes[1].id);
  await f.finish(3, "completed", "REVIEW_V2");
  assert.equal(f.sent.length, 5);
  assert.equal(f.sent[4].nodeId, f.doc.nodes[3].id);
  await f.finish(4, "completed", "SUMMARY_V2");

  // 3. `to-node` on middle node in a fresh 3-step chain halts at target boundary
  const f2 = fixture(3);
  f2.edge(0, 1);
  f2.edge(1, 2);
  await f2.scheduler.start({
    kind: "to-node",
    nodeIds: [f2.doc.nodes[1].id],
  });
  assert.equal(f2.sent.length, 1);
  await f2.finish(0, "completed", "step-0");
  assert.equal(f2.sent.length, 2);
  await f2.finish(1, "completed", "step-1");
  // Must stop at 1 -> 2 boundary without running node 2!
  assert.equal(f2.sent.length, 2);
  assert.equal(f2.scheduler.runs[0].tokens.at(-1)?.boundary, true);
});

const routed = (route: string, step: RunStep) => ({
  route, source: step.sources[0], output: `selected ${route}`, verdict: { branch: route },
});

function judgeFixture(t: TestContext, count: number, execute: NodeExecutor, index = 1) {
  const type = "test/scheduler-judge";
  t.after(registerDescriptor({
    flowType: type, version: 1, family: "logic", icon: "logic-branch", titleKey: "flow_node",
    descKey: "flow_node", experimental: true, configSchema: z.object({}), defaultConfig: {},
    quickCreate: { canvas: true }, capabilities: {}, size: { compact: [256, 96], full: [312, 200] },
    ports: (): PortSpec[] => [
      { id: "in", role: "continuation", direction: "in", dataType: "text" },
      ...["pass", "else", "timeout", "error"].map((id): PortSpec => ({
        id, role: "continuation", direction: "out", dataType: "text",
      })),
    ],
  }));
  const f = fixture(count);
  const judge = newFlowNode(type, 400 * index, 0);
  f.doc.nodes[index] = judge;
  const executed: RunStep[] = [];
  f.runtime.execute = async (node, step, signal) => {
    executed.push(structuredClone(step));
    return execute(node, step, signal);
  };
  t.after(() => f.scheduler.dispose());
  return { ...f, judge, executed };
}

// The synthetic executors do no I/O. Yield through their promise callbacks, then
// wait behind their completion transactions before inspecting the durable state.
async function settled(scheduler: Scheduler) {
  await new Promise<void>(resolve => setImmediate(resolve));
  await scheduler.transact(async () => {});
}

test("a named branch forwards the original snapshot and a diamond consumes the skipped path", async t => {
  const f = judgeFixture(t, 6, async (_node, step) => routed("pass", step));
  const [, judge, selected, skipped, join, skippedChild] = f.doc.nodes;
  f.edge(0, 1);
  f.edge(1, 2, { sourcePort: "pass" });
  f.edge(1, 3, { sourcePort: "else" });
  f.edge(3, 5);
  f.edge(5, 4);
  f.edge(2, 4);
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  assert.deepEqual(run.roots, [f.doc.nodes[0].id]);
  await f.finish(0, "completed", "upstream artifact");
  await settled(f.scheduler);
  const gate = run.steps.find(s => s.nodeId === judge.id)!;
  assert.equal(gate.route, "pass");
  assert.deepEqual(gate.verdict, { branch: "pass" });
  assert.equal(gate.sessionId, undefined);
  assert.deepEqual(f.sent.map(s => s.nodeId), [f.doc.nodes[0].id, selected.id]);
  assert.deepEqual(f.sent[1].sources, f.executed[0].sources);
  for (const dead of [skipped, skippedChild]) assert.equal(run.steps.find(s => s.nodeId === dead.id)?.state, "skipped");
  await f.finish(1, "completed", "selected result");
  assert.equal(f.sent[2].nodeId, join.id);
  assert.deepEqual(f.sent[2].sources.map(s => s.text), ["selected result"]);
  await f.finish(2);
  assert.equal(run.state, "completed");
  assert.ok(run.tokens.filter(token => token.skip).every(token =>
    token.source.text === "" && token.consumed && token.consumedAt! >= token.createdAt));
});

test("a skipped branch passes through two bypassed nodes without waiting for their confirm or delay", async t => {
  const f = judgeFixture(t, 5, async (_node, step) => routed("pass", step));
  f.doc.nodes[2].participation = "bypassed";
  f.doc.nodes[3].participation = "bypassed";
  f.edge(0, 1);
  f.edge(1, 2, { sourcePort: "else", trigger: "confirm" });
  f.edge(2, 3);
  const exit = f.edge(3, 4, { logic: { delayMs: 60_000 } });
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  await f.finish(0);
  await settled(f.scheduler);
  assert.deepEqual(f.sent.map(s => s.nodeId), [f.doc.nodes[0].id]);
  assert.equal(run.steps.find(s => s.nodeId === f.doc.nodes[4].id)?.state, "skipped");
  assert.equal(run.tokens.find(token => token.edgeId === exit.id)?.skip, true);
  assert.equal(run.state, "completed");
});

test("TDD feedback is consumed on pass and the signoff only dispatches once after confirmation", async t => {
  const f = judgeFixture(t, 4, async (_node, step) =>
    routed(step.sources[0].text === "结论：通过" ? "pass" : "else", step), 2);
  const [author, verifier, gate, signoff] = f.doc.nodes;
  f.edge(0, 1);
  f.edge(1, 2);
  const loop = f.edge(2, 0, { sourcePort: "else", maxRounds: 3 });
  const exit = f.edge(2, 3, { sourcePort: "pass", trigger: "confirm" });
  await f.scheduler.start({ kind: "single", nodeIds: [author.id] });
  const run = f.scheduler.runs[0];
  await f.finish(0);
  await f.finish(1, "completed", "结论：未通过");
  await settled(f.scheduler);
  await f.finish(2);
  await f.finish(3, "completed", "结论：通过");
  await settled(f.scheduler);
  assert.deepEqual(f.sent.map(s => s.nodeId), [author.id, verifier.id, author.id, verifier.id]);
  assert.deepEqual(run.steps.filter(s => s.nodeId === gate.id).map(s => s.route), ["else", "pass"]);
  const feedback = run.tokens.filter(token => token.edgeId === loop.id).at(-1)!;
  assert.ok(feedback.skip && feedback.consumed && !feedback.loopCapReached);
  assert.equal(run.state, "waiting");
  const pending = run.tokens.filter(token => token.edgeId === exit.id && !token.skip);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].ready, false);
  await f.scheduler.release(run.id, pending[0].id, true);
  assert.deepEqual(f.sent.filter(s => s.nodeId === signoff.id).map(s => s.sources[0].text), ["结论：通过"]);
  await f.finish(4);
  assert.equal(run.state, "completed");
});

test("edge logic counts only deliveries, applies fromRound inclusively and negates the selected output", async t => {
  const f = judgeFixture(t, 5, async (_node, step) => routed("pass", step));
  const [root, judge, feedbackAgent, side, inverse] = f.doc.nodes;
  f.edge(0, 1);
  f.edge(1, 2, { sourcePort: "pass" });
  f.edge(2, 1, { logic: { maxTimes: 2 } });
  const limited = f.edge(1, 3, { sourcePort: "pass", logic: { fromRound: 2, maxTimes: 1 } });
  f.edge(1, 4, { sourcePort: "else", logic: { negate: true, maxTimes: 1 } });
  await f.scheduler.start({ kind: "single", nodeIds: [root.id] });
  const run = f.scheduler.runs[0];
  for (let i = 0; i < 6; i++) {
    assert.ok(f.sent[i], `missing scheduled agent at position ${i}`);
    await f.finish(i);
    await settled(f.scheduler);
  }
  assert.equal(f.executed.filter(s => s.nodeId === judge.id).length, 3);
  assert.equal(f.sent.filter(s => s.nodeId === feedbackAgent.id).length, 3);
  assert.equal(f.sent.filter(s => s.nodeId === inverse.id).length, 1);
  assert.equal(f.sent.filter(s => s.nodeId === side.id).length, 1);
  assert.deepEqual(run.tokens.filter(token => token.edgeId === limited.id).map(token => !!token.skip), [true, false, true]);
  assert.equal(run.state, "completed");
});

for (const confirmFirst of [false, true]) {
  test(`delayed auto and confirm tokens when confirmation comes ${confirmFirst ? "before" : "after"} the deadline`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
    const f = fixture(3);
    t.after(() => f.scheduler.dispose());
    const [root, automatic, manual] = f.doc.nodes;
    f.edge(0, 1, { logic: { delayMs: 100 } });
    const edge = f.edge(0, 2, { trigger: "confirm", logic: { delayMs: 100 } });
    await f.scheduler.start({ kind: "single", nodeIds: [root.id] });
    const run = f.scheduler.runs[0];
    await f.finish(0);
    const pending = run.tokens.find(token => token.edgeId === edge.id)!;
    if (confirmFirst) await f.scheduler.release(run.id, pending.id, true);
    t.mock.timers.tick(99);
    await settled(f.scheduler);
    assert.equal(f.sent.length, 1);
    t.mock.timers.tick(1);
    await settled(f.scheduler);
    assert.ok(f.sent.some(s => s.nodeId === automatic.id));
    assert.equal(f.sent.some(s => s.nodeId === manual.id), confirmFirst);
    if (!confirmFirst) await f.scheduler.release(run.id, pending.id, true);
    assert.equal(f.sent.length, 3);
    assert.ok(run.tokens.every(token => token.consumed && token.readyAt! >= 1100));
    await f.finish(1);
    await f.finish(2);
    assert.equal(run.state, "completed");
  });
}

test("executor exceptions select error and forward input to the error handler", async t => {
  const f = judgeFixture(t, 4, async () => { throw new Error("judgment failed"); });
  f.edge(0, 1);
  f.edge(1, 2, { sourcePort: "pass" });
  f.edge(1, 3, { sourcePort: "error" });
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  await f.finish(0, "completed", "original input");
  await settled(f.scheduler);
  const failed = run.steps.find(s => s.nodeId === f.judge.id)!;
  assert.equal(failed.route, "error");
  assert.match(failed.error ?? "", /judgment failed/);
  assert.equal(run.steps.find(s => s.nodeId === f.doc.nodes[2].id)?.state, "skipped");
  assert.deepEqual(f.sent[1].sources.map(s => s.text), ["original input"]);
  assert.equal(f.sent[1].nodeId, f.doc.nodes[3].id);
  await f.finish(1);
  assert.equal(run.state, "completed");
});

for (const action of ["wait", "skip", "default", "timeout-port"] as const) {
  test(`human deadline action ${action} persists the decision and forwards only its route`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 5000 });
    const f = judgeFixture(t, 5, async () => ({
      awaiting: { question: "Choose a branch", options: ["pass", "else"], deadline: Date.now() + 100,
        timeoutAction: action, defaultOption: "else" },
    }));
    f.edge(0, 1);
    f.edge(1, 2, { sourcePort: "pass" });
    f.edge(1, 3, { sourcePort: "else" });
    f.edge(1, 4, { sourcePort: "timeout" });
    await f.scheduler.start({ kind: "global", nodeIds: [] });
    const run = f.scheduler.runs[0];
    await f.finish(0, "completed", "input before question");
    await settled(f.scheduler);
    const question = run.steps.find(s => s.nodeId === f.judge.id)!;
    assert.equal(question.state, "awaiting");
    assert.equal(run.state, "waiting");
    assert.deepEqual(question.human?.options, ["pass", "else"]);
    await assert.rejects(f.scheduler.answerHuman(run.id, question.id, "unknown"));
    t.mock.timers.tick(100);
    await settled(f.scheduler);
    if (action === "wait") {
      assert.equal(question.state, "awaiting");
      await f.scheduler.answerHuman(run.id, question.id, "pass");
    }
    assert.equal(question.state, action === "skip" ? "skipped" : "completed");
    await assert.rejects(f.scheduler.answerHuman(run.id, question.id, "else"));
    if (action === "skip") {
      assert.equal(f.sent.length, 1);
      assert.equal(run.steps.filter(s => s.state === "skipped" && s.id !== question.id).length, 3);
    } else {
      const [destination, route] = action === "wait" ? [2, "pass"] as const :
        action === "default" ? [3, "else"] as const : [4, "timeout"] as const;
      assert.equal(question.route, route);
      assert.equal(f.sent.length, 2);
      assert.equal(f.sent[1].nodeId, f.doc.nodes[destination].id);
      assert.equal(f.sent[1].sources[0].text, "input before question");
      await f.finish(1);
    }
    assert.equal(run.state, "completed");
  });
}

test("restart restores both human deadlines and expired delay tokens without replaying an agent or executor", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 7000 });
  const f = judgeFixture(t, 4, async () => ({
    awaiting: { question: "Release?", options: ["pass"], timeoutAction: "default",
      defaultOption: "pass", deadline: Date.now() + 200 },
  }));
  f.edge(0, 1);
  f.edge(0, 2, { logic: { delayMs: 100 } });
  f.edge(1, 3, { sourcePort: "pass" });
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  await f.finish(0, "completed", "persisted input");
  await settled(f.scheduler);
  assert.equal(run.steps.find(s => s.nodeId === f.judge.id)?.state, "awaiting");
  await f.scheduler.dispose();
  const saved = structuredClone(f.scheduler.runs);
  t.mock.timers.tick(125);
  assert.equal(f.sent.length, 1);
  const next = new Scheduler(f.runtime, f.store, saved);
  t.after(() => next.dispose());
  await next.recover();
  t.mock.timers.tick(1);
  await settled(next);
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].nodeId, f.doc.nodes[2].id);
  assert.equal(saved[0].steps.find(s => s.nodeId === f.judge.id)?.state, "awaiting");
  t.mock.timers.tick(75);
  await settled(next);
  assert.equal(saved[0].steps.find(s => s.nodeId === f.judge.id)?.route, "pass");
  assert.deepEqual(f.sent.map(s => s.nodeId), [f.doc.nodes[0].id, f.doc.nodes[2].id, f.doc.nodes[3].id]);
  assert.equal(f.executed.length, 1);
  for (const [i, step] of f.sent.slice(1).entries()) {
    await next.claim(step.requestId, i + 2);
    await next.finish(step.sessionId!, i + 2, "completed", (i + 2) * 10, "done");
  }
  assert.equal(saved[0].state, "completed");
});
