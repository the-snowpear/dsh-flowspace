import test from "node:test";
import assert from "node:assert/strict";
import { Scheduler, type RuntimeAdapter } from "../src/core/scheduler.ts";
import { emptyDocument, newNode, newEdge } from "../src/core/document.ts";
import type { RunStep, FlowspaceDocument } from "../src/types.ts";

function fixture(count = 3) {
  const doc = emptyDocument();
  doc.nodes = Array.from({ length: count }, (_, i) => ({
    ...newNode("agent", i * 400, 0, String(i)),
    task: `task ${i}`,
    draft: `task ${i}`,
  }));
  const sent: RunStep[] = [],
    cancelled: string[] = [];
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
  return { doc, sent, scheduler, edge, finish, cancelled };
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
test("cycle stops after three rounds and preserves frozen external input", async () => {
  const f = fixture();
  f.edge(0, 1);
  f.edge(1, 2);
  f.edge(2, 1);
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  for (let i = 0; i < 7; i++) await f.finish(i);
  assert.equal(f.sent.length, 7);
  assert.equal(f.sent.filter((s) => s.nodeId === f.doc.nodes[1].id).length, 3);
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
test("restart marks work interrupted without resending", async () => {
  const f = fixture(2);
  f.edge(0, 1);
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  await f.scheduler.recover();
  assert.equal(f.scheduler.runs[0].state, "interrupted");
  assert.equal(f.sent.length, 1);
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
