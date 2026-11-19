import test from "node:test";
import assert from "node:assert/strict";
import { Scheduler, type RuntimeAdapter } from "../src/core/scheduler.ts";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import type { RunStep } from "../src/types.ts";

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
  const scheduler = new Scheduler(runtime, {
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
  });
  const edge = (a: number, b: number, opts = {}) => {
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
