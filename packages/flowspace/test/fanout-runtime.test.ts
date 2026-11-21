import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { createFanoutPair } from "../src/core/fanout.ts";
import { snapshotWithContent } from "../src/core/nodes/input.ts";
import { Scheduler, type RuntimeAdapter, type SchedulerStore } from "../src/core/scheduler.ts";
import type { RunStep } from "../src/types.ts";

function fixture(dynamic = false) {
  const doc = emptyDocument();
  const source = newNode(dynamic ? "agent" : "note", 0, 0, "Source");
  source.text = "apple\npear";
  source.task = source.draft = "Emit items";
  const sink = newNode("agent", 1800, 0, "Summary");
  sink.task = sink.draft = "Deliver";
  doc.nodes.push(source, sink);
  const pair = createFanoutPair(doc, 320, 0, { title: "Review", sourceId: source.id });
  doc.edges.push(newEdge(pair.merge.id, sink.id, "continuation"));
  if (dynamic) doc.edges.find(edge => edge.target === pair.fan.id)!.emitMode = "stream";
  const sent: RunStep[] = [], titles: string[] = [];
  const runtime: RuntimeAdapter = {
    ensure: async (node, _fork, title) => {
      if (title) titles.push(title);
      return node.sessionId ?? `session-${node.id}`;
    },
    send: async step => { sent.push(step); }, cancel: async () => {},
    capture: async (node, kind, seq = 1, text = "") => ({
      id: crypto.randomUUID(), sourceNodeId: node.id, sourceSessionId: node.sessionId, title: node.title, kind, seq, text, capturedAt: seq,
    }),
    reference: async (node, edge) => snapshotWithContent(node, edge?.snapshotContent ?? { dataType: "text", value: node.text }),
  };
  const store: SchedulerStore = {
    document: () => doc, changed: async () => {}, submitted: async () => {},
    bound: async (id, sessionId) => { const node = doc.nodes.find(node => node.id === id); if (node) node.sessionId = sessionId; },
  };
  const scheduler = new Scheduler(runtime, store);
  let turn = 0;
  async function finish(step: RunStep, output = "done") {
    const n = step.turn ?? ++turn;
    await scheduler.claim(step.requestId, n);
    await scheduler.finish(step.sessionId!, n, "completed", 99, output);
  }
  return { doc, source, sink, pair, sent, titles, scheduler, runtime, store, finish };
}

test("static fanout freezes two levels of work, binds separate Sessions, and merges out-of-order completions once", async () => {
  const f = fixture();
  const { master, fan, group, merge } = f.pair;
  const secondMaster = { ...newNode("agent", master.x + 350, master.y), masterOf: fan.id, parentId: group.id, task: "Check each review" };
  const terminal = f.doc.edges.find(edge => edge.source === master.id && edge.target === merge.id)!;
  terminal.source = secondMaster.id;
  f.doc.edges.push(newEdge(master.id, secondMaster.id, "continuation"));
  f.doc.nodes.push(secondMaster);
  const started = await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  assert.deepEqual(started.roots, [fan.id]);
  assert.deepEqual(f.sent.map(step => step.sources[0].content?.value), ["apple", "pear"]);
  assert.deepEqual(f.titles, ["Review #1 · apple", "Review #2 · pear"]);
  assert.equal(new Set(f.sent.map(step => step.sessionId)).size, 2);
  assert.deepEqual(f.scheduler.plan({ kind: "single", nodeIds: [master.id, f.sent[0].nodeId] }).roots, []);
  f.source.text = "third";
  const generated = f.doc.nodes.filter(node => node.generatedBy);
  for (const node of generated) node.continuationPrompt = "Changed after launch";
  // Undo all generated cards while the native requests are active.
  f.doc.nodes = f.doc.nodes.filter(node => !node.generatedBy);
  f.doc.edges = f.doc.edges.filter(edge => !edge.generatedBy);
  await f.finish(f.sent[1], "first-pear");
  await f.finish(f.sent[2], "checked-pear");
  assert.equal(f.sent.length, 3);
  assert.equal(f.sent[2].task, secondMaster.task);
  await f.finish(f.sent[0], "first-apple");
  await f.finish(f.sent[3], "checked-apple");
  assert.equal(f.sent[4].nodeId, f.sink.id);
  const result = f.sent[4].sources[0].content!.items!;
  assert.deepEqual(result.map(item => item.value), ["checked-apple", "checked-pear"]);
  assert.deepEqual(result.map(item => item.key), run.fanouts![0].lanes.map(lane => lane.item.key));
  assert.equal(f.doc.nodes.some(node => node.generatedBy), false);
  await f.finish(f.sent[4]);
  assert.equal(run.state, "completed");
  assert.equal(run.steps.filter(step => step.nodeId === merge.id).length, 1);
  assert.ok(!run.steps.find(step => step.nodeId === master.id || step.nodeId === secondMaster.id));
});

test("flow_emit streams create independent lanes before the producer ends and seal a single ordered batch", async () => {
  const f = fixture(true);
  const runId = (await f.scheduler.start({ kind: "single", nodeIds: [f.source.id] })).id;
  const run = f.scheduler.runs.find(run => run.id === runId)!;
  const emitter = f.sent[0];
  const signal = new AbortController().signal;
  await f.scheduler.claim(emitter.requestId, 1);
  await f.scheduler.emit(emitter.sessionId!, "a", ["same"], signal);
  await f.finish(f.sent[1], "first");
  assert.equal(f.sent.length, 2);
  assert.equal(run.fanouts![0].closed, false);
  await f.scheduler.emit(emitter.sessionId!, "b", ["same"], signal);
  assert.equal(f.doc.generationRevision, 2);
  await f.finish(f.sent[2], "second");
  assert.equal(f.sent.length, 3);
  await f.finish(emitter);
  assert.equal(run.fanouts!.length, 1);
  assert.equal(run.fanouts![0].closed, true);
  assert.equal(new Set(run.fanouts![0].lanes.map(lane => lane.item.key)).size, 2);
  assert.deepEqual(f.sent[3].sources[0].content!.items!.map(item => item.value), ["first", "second"]);
  await f.finish(f.sent[3]);
  assert.equal(run.state, "completed");
  const before = f.sent.length;
  await new Scheduler(f.runtime, f.store, structuredClone(f.scheduler.runs)).recover();
  assert.equal(f.sent.length, before);
});

test("empty static input reaches the merge exactly once with an empty list", async () => {
  const f = fixture();
  f.source.text = "";
  await f.scheduler.start({ kind: "group", nodeIds: [f.pair.group.id] });
  const run = f.scheduler.runs[0];
  assert.equal(f.sent.length, 0);
  const boundary = run.tokens.find(token => token.boundary)!;
  assert.deepEqual(boundary.source.content, { dataType: "list", items: [] });
  await f.scheduler.release(run.id, boundary.id, true);
  assert.equal(f.sent.length, 1);
  await f.finish(f.sent[0]);
  assert.equal(run.state, "completed");
});

test("an unmatched upstream closes the paired skip path without sending a lane or summary request", async () => {
  const f = fixture(true);
  f.doc.edges.find(edge => edge.target === f.pair.fan.id)!.logic = { fromRound: 2 };
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const [emitter] = f.sent;
  await f.scheduler.claim(emitter.requestId, 1);
  await f.scheduler.emit(emitter.sessionId!, "excluded", ["value"], new AbortController().signal);
  await f.finish(emitter);
  const run = f.scheduler.runs[0];
  assert.equal(f.sent.length, 1);
  assert.equal(run.steps.find(step => step.nodeId === f.pair.merge.id)?.state, "skipped");
  assert.equal(run.steps.find(step => step.nodeId === f.sink.id)?.state, "skipped");
  assert.equal(run.state, "completed");
});

test("a native lane error closes the all barrier and records the failed merge", async () => {
  const f = fixture();
  f.source.text = "one";
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const [lane] = f.sent;
  await f.scheduler.claim(lane.requestId, 1);
  await f.scheduler.finish(lane.sessionId!, 1, "error", 101, "", "review unavailable");
  const run = f.scheduler.runs[0];
  assert.equal(run.fanouts![0].lanes[0].state, "error");
  assert.equal(run.steps.find(step => step.nodeId === f.pair.merge.id)?.route, "error");
  assert.equal(run.state, "error");
  assert.equal(f.sent.length, 1);
});

test("bounded quorum adopts the earliest completions, restores source order and drains the remaining lanes", async () => {
  const f = fixture();
  f.source.text = "A\nB\nC\nD";
  f.pair.fan.config!.concurrency = 3;
  f.pair.merge.config = { ...f.pair.merge.config, wait: "quorum", quorum: 2 };
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0], batch = run.fanouts![0];
  const lane = (text: string) => f.sent.find(step => step.itemKey && step.sources[0].text === text)!;
  assert.equal(f.sent.length, 3);
  assert.equal(batch.lanes[3].state, "queued");
  assert.equal(f.doc.nodes.find(node => node.itemTitle === "D")!.sessionId, undefined);
  await f.finish(lane("C"), "third");
  assert.equal(lane("D").state, "queued");
  assert.equal(batch.mergeStepId, undefined);
  await f.finish(lane("A"), "first");
  const sink = f.sent.find(step => step.nodeId === f.sink.id)!;
  assert.deepEqual(sink.sources[0].content!.items!.map(item => item.value), ["first", "third"]);
  assert.deepEqual(batch.lanes.map(lane => lane.adopted), [true, false, true, false]);
  await f.finish(sink);
  await f.finish(lane("D"), "late D");
  await f.finish(lane("B"), "late B");
  assert.equal(run.state, "completed");
  assert.equal(batch.lanes[1].result?.text, "late B");
  assert.equal(run.steps.filter(step => step.nodeId === f.pair.merge.id).length, 1);
});

test("any with cancellation stops only open siblings, ignores future streamed items and never opens their Sessions", async () => {
  const f = fixture(true);
  f.pair.fan.config!.concurrency = 2;
  f.pair.merge.config = { ...f.pair.merge.config, wait: "any", cancelRest: true, output: "text" };
  const cancelled: string[] = [];
  f.runtime.cancel = async step => { cancelled.push(step.id); };
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0], producer = f.sent[0], signal = new AbortController().signal;
  await f.scheduler.claim(producer.requestId, 3);
  await f.scheduler.emit(producer.sessionId!, "first", ["A", "B", "C"], signal);
  const [a, b] = f.sent.slice(1);
  await f.finish(b, "B won");
  assert.deepEqual(cancelled, [a.id]);
  assert.equal(a.state, "aborted");
  const sink = f.sent.find(step => step.nodeId === f.sink.id)!;
  assert.equal(sink.sources[0].content?.value, "B won");
  await f.scheduler.emit(producer.sessionId!, "late", ["D"], signal);
  const batch = run.fanouts![0];
  assert.deepEqual(batch.lanes.map(lane => lane.state), ["cancelled", "completed", "cancelled", "cancelled"]);
  assert.equal(f.titles.length, 2);
  await f.finish(producer);
  await f.finish(sink);
  assert.equal(run.state, "completed");
});

test("shared fanout capacity wakes a different run when a paused run releases its last active slot", async () => {
  const f = fixture();
  f.pair.fan.config!.concurrency = 1;
  f.source.text = "A\nB";
  const one = await f.scheduler.start({ kind: "single", nodeIds: [f.pair.fan.id] });
  f.source.text = "X";
  const two = await f.scheduler.start({ kind: "single", nodeIds: [f.pair.fan.id] });
  assert.equal(f.sent.length, 1);
  await f.scheduler.command(one.id, "pause");
  await f.finish(f.sent[0], "done A");
  assert.equal(f.scheduler.runs.find(run => run.id === one.id)!.state, "paused");
  assert.equal(f.sent[1].sources[0].text, "X");
  await f.scheduler.command(one.id, "resume");
  assert.equal(f.sent.length, 2);
  await f.scheduler.command(two.id, "cancel");
  assert.equal(f.sent[2].sources[0].text, "B");
});

test("a held merge edge consumes its lane slot and unreachable quorum is reported once", async () => {
  const f = fixture();
  f.pair.fan.config!.concurrency = 1;
  f.pair.merge.config = { ...f.pair.merge.config, wait: "quorum", quorum: 3 };
  f.doc.edges.find(edge => edge.target === f.pair.merge.id)!.trigger = "confirm";
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  await f.finish(f.sent[0]);
  assert.equal(f.sent.length, 1);
  let held = run.tokens.find(token => !token.ready && !token.consumed)!;
  await f.scheduler.release(run.id, held.id, false);
  assert.equal(f.sent[1].sources[0].text, "pear");
  await f.finish(f.sent[1]);
  held = run.tokens.find(token => !token.ready && !token.consumed)!;
  await f.scheduler.release(run.id, held.id, true);
  assert.equal(run.state, "error");
  assert.match(run.steps.find(step => step.id === run.fanouts![0].mergeStepId)!.error!, /3.*最多可完成 2/);
  assert.equal(f.sent.length, 2);
});

test("restart reconciles dispatched lanes and sends only previously unstarted items", async () => {
  const f = fixture();
  f.source.text = "A\nB\nC";
  f.pair.fan.config!.concurrency = 2;
  f.pair.merge.config = { ...f.pair.merge.config, wait: "any" };
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const [a, b] = f.sent;
  await f.scheduler.claim(a.requestId, 1);
  await f.scheduler.claim(b.requestId, 1);
  const state = structuredClone(f.scheduler.runs);
  let reconciliations = 0;
  f.runtime.reconcile = async step => {
    reconciliations++;
    return step.id === a.id ? { state: "completed", output: "A was saved", endSeq: 8, endedAt: 128 } :
      { state: "interrupted", endedAt: 130 };
  };
  const recovered = new Scheduler(f.runtime, f.store, state);
  await recovered.recover();
  assert.equal(reconciliations, 2);
  assert.deepEqual(f.sent.filter(step => step.itemKey).map(step => step.sources[0].text), ["A", "B", "C"]);
  const run = recovered.runs[0];
  assert.equal(run.fanouts![0].lanes[1].state, "error");
  assert.equal(run.fanouts![0].lanes[1].adopted, false);
  const downstream = f.sent.filter(step => step.nodeId === f.sink.id);
  assert.equal(downstream.length, 1);
  assert.deepEqual(downstream[0].sources[0].content!.items!.map(item => item.value), ["A was saved"]);
});

test("any honors terminal manual release order even when both results wait through a pause", async () => {
  const f = fixture();
  f.pair.merge.config!.wait = "any";
  f.doc.edges.find(edge => edge.target === f.pair.merge.id)!.trigger = "confirm";
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const [a, b] = f.sent, run = f.scheduler.runs[0];
  await f.finish(a, "A");
  await f.finish(b, "B");
  await f.scheduler.command(run.id, "pause");
  for (const step of [b, a]) {
    const token = run.tokens.find(token => token.stepId === step.id && token.needsRelease)!;
    await f.scheduler.release(run.id, token.id, true);
  }
  assert.equal(f.sent.length, 2);
  await f.scheduler.command(run.id, "resume");
  assert.deepEqual(f.sent[2].sources[0].content!.items!.map(item => item.value), ["B"]);
});

test("cold quorum selection ranks native end times rather than recovery scan order", async () => {
  const f = fixture();
  f.pair.merge.config!.wait = "any";
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const [a, b] = f.sent;
  await f.scheduler.claim(a.requestId, 1);
  await f.scheduler.claim(b.requestId, 1);
  f.runtime.reconcile = async step => ({ state: "completed", output: step.id === a.id ? "A" : "B",
    endedAt: step.id === a.id ? 202 : 100, endSeq: 9 });
  const recovered = new Scheduler(f.runtime, f.store, structuredClone(f.scheduler.runs));
  await recovered.recover();
  assert.deepEqual(f.sent[2].sources[0].content!.items!.map(item => item.value), ["B"]);
  assert.deepEqual(recovered.runs[0].fanouts![0].lanes.map(lane => lane.adopted), [false, true]);
});

test("an asynchronous sorter receives only adopted frozen input and can be cancelled while the scheduler accepts commands", async () => {
  const f = fixture();
  f.pair.merge.config = { ...f.pair.merge.config, wait: "any", sortMode: "ai" };
  const wait = Promise.withResolvers<void>();
  let sorting: RunStep | undefined, sortSignal: AbortSignal | undefined;
  f.runtime.execute = async (_node, step, signal) => {
    sorting = step; sortSignal = signal;
    await wait.promise;
    return { route: "pass", output: step.sources[0].text, source: step.sources[0] };
  };
  await f.scheduler.start({ kind: "global", nodeIds: [] });
  const run = f.scheduler.runs[0];
  await f.finish(f.sent[1], "B");
  assert.deepEqual(sorting!.sources[0].content!.items!.map(item => item.value), ["B"]);
  assert.equal(sorting!.state, "running");
  await f.scheduler.command(run.id, "cancel");
  assert.ok(sortSignal!.aborted);
  wait.resolve();
  await f.scheduler.transact(async () => {});
  assert.equal(run.state, "cancelled");
  assert.equal(f.sent.length, 2);
});
