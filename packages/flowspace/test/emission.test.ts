import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { z } from "zod";
import { contentList } from "../src/core/content.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { parseEmission } from "../src/core/emission.ts";
import { registerDescriptor } from "../src/core/nodes/registry.ts";
import { Scheduler, type RuntimeAdapter, type SchedulerStore } from "../src/core/scheduler.ts";
import type { FlowEdge, JsonValue, RunStep } from "../src/types.ts";

function setup(t: TestContext, formats: ["list" | "record", "stream" | "end"][], cap = 1000) {
  const doc = emptyDocument();
  doc.settings.listLimit = cap;
  const producer = { ...newNode("agent", 0, 0), title: "producer", task: "items", draft: "items" };
  doc.nodes.push(producer);
  const calls: RunStep[] = [];
  for (const [i, [dataType, mode]] of formats.entries()) {
    const flowType = `fixture/emission-${i}-${dataType}`;
    t.after(registerDescriptor({
      flowType, version: 1, family: "data", icon: "braces", titleKey: "flow_node", descKey: "flow_node",
      size: { compact: [256, 96], full: [312, 200] }, configSchema: z.object({}), defaultConfig: {},
      capabilities: {}, quickCreate: { canvas: true }, experimental: true,
      ports: () => [{ id: "in", role: "continuation", direction: "in", dataType }],
    }));
    const target = newFlowNode(flowType, 400, i * 200);
    doc.nodes.push(target);
    const edge: FlowEdge = { ...newEdge(producer.id, target.id, "continuation"), emitMode: mode, trigger: "confirm" };
    doc.edges.push(edge);
  }
  const runtime: RuntimeAdapter = {
    ensure: async node => `session-${node.id}`,
    send: async step => { calls.push(structuredClone(step)); },
    capture: async (node, mode, seq, output) => ({
      id: "capture", kind: mode, sourceNodeId: node.id, title: node.title, seq, capturedAt: 3, text: output ?? "",
    }),
    reference: async node => ({ id: "ref", kind: "text", sourceNodeId: node.id, title: node.title, capturedAt: 2, text: node.text }),
    cancel: async () => {},
    execute: async (_node, step) => ({ route: "out", output: "ok", source: step.sources[0] }),
  };
  const store: SchedulerStore = {
    document: () => doc, changed: async () => {}, submitted: async () => {},
    bound: async (id, sessionId) => { doc.nodes.find(node => node.id === id)!.sessionId = sessionId; },
  };
  const scheduler = new Scheduler(runtime, store);
  const start = () => scheduler.start({ kind: "single", nodeIds: [producer.id] });
  return { doc, producer, calls, scheduler, start, runtime, store };
}

test("explicit Markdown lists and JSON code blocks are the only fallback inputs", () => {
  assert.deepEqual(parseEmission("Notes\r\n - alpha\r\n2. beta \r\n"), ["alpha", "beta"]);
  assert.deepEqual(parseEmission("~~~JSON\n[null,{\"a\":[2,null]}]\n~~~"), [null, { a: [2, null] }]);
  assert.deepEqual(parseEmission("```json\n{\"item\":1}\n```"), [{ item: 1 }]);
  assert.deepEqual(parseEmission("```json\n[]\n```"), []);
  for (const bad of ["a paragraph", "", "```js\n- code\n```", "```json\n[bad]\n```", "-  "]) {
    assert.throws(() => parseEmission(bad), /flow_emit/);
  }
});

test("claimed-turn streaming and end-mode receipts preserve order, cap, keys and exact owner", async t => {
  const f = setup(t, [["list", "stream"], ["list", "end"]], 3);
  const first = await f.start();
  const session = f.calls[0].sessionId!;
  assert.equal(f.scheduler.canEmit(session), false);
  await f.scheduler.claim(f.calls[0].requestId, 2);
  await f.start(); // Another request is queued in the same native Session.
  assert.equal(f.scheduler.canEmit(session), true);
  const sig = new AbortController().signal;
  const run = f.scheduler.runs.find(item => item.id === first.id)!;
  const emit = (id: string, values: JsonValue[]) => f.scheduler.emit(session, id, values, sig);
  assert.deepEqual(await emit("a", ["same"]), { accepted: 1, total: 1 });
  assert.deepEqual(await emit("a", ["same"]), { accepted: 1, total: 1 });
  assert.deepEqual(await emit("b", ["other", "same", "truncated"]), { accepted: 2, total: 4 });
  assert.deepEqual(run.tokens.map(token => token.edgeId), [f.doc.edges[0].id, f.doc.edges[0].id]);
  assert.equal(run.tokens[1].source.content?.originalCount, 3);
  assert.deepEqual(run.tokens.flatMap(token => token.source.content!.items!.map(item => item.key)),
    contentList(["same", "other", "same"]).items!.map(item => item.key));
  await f.scheduler.finish(session, 2, "completed", 9, "done");
  assert.equal(run.tokens.length, 3);
  assert.equal(run.tokens[2].edgeId, f.doc.edges[1].id);
  assert.equal(run.tokens[2].source.content?.originalCount, 4);
  assert.equal(run.tokens[2].source.seq, 9);
  assert.deepEqual(run.tokens[2].source.content?.items?.map(item => item.value), ["same", "other", "same"]);
  assert.equal(run.steps[0].emission?.closed, true);
  assert.equal(f.scheduler.canEmit(session), false);
  await f.scheduler.claim(f.calls[1].requestId, 3);
  await emit("c", ["second run"]);
  assert.deepEqual(f.scheduler.runs[1].steps[0].emission?.items.map(item => item.value), ["second run"]);
  assert.equal(run.tokens.length, 3);
});

test("an invalid record batch is atomic; record consumers receive one snapshot per object", async t => {
  const f = setup(t, [["list", "stream"], ["record", "end"]]);
  await f.start();
  const step = f.calls[0], sig = new AbortController().signal;
  await f.scheduler.claim(step.requestId, 1);
  const run = f.scheduler.runs[0];
  await assert.rejects(f.scheduler.emit(step.sessionId!, "bad", [{ a: 1 }, null], sig), /JSON 对象/);
  assert.equal(run.tokens.length, 0);
  await f.scheduler.emit(step.sessionId!, "good", [{ nested: [null] }, {}], sig);
  await f.scheduler.finish(step.sessionId!, 1, "completed", 12, "done");
  assert.deepEqual(run.tokens.slice(1).map(token => token.source.content),
    [{ dataType: "record", value: { nested: [null] } }, { dataType: "record", value: {} }]);
  await f.scheduler.finish(step.sessionId!, 1, "completed", 13, "repeated notification");
  assert.equal(run.tokens.length, 3);
});

test("a rejected fallback can be reminded once with exactly the original context and no duplicate text route", async t => {
  const f = setup(t, [["list", "end"]]);
  const note = { ...newNode("note", 0, 0), text: "original" };
  const plain = { ...newNode("agent", 0, 0), task: "unstructured consumer" };
  f.doc.nodes.push(note, plain);
  const plainEdge = { ...newEdge(f.producer.id, plain.id, "continuation"), trigger: "confirm" as const };
  f.doc.edges.push({ ...newEdge(note.id, f.producer.id, "reference"), always: true }, plainEdge);
  await f.start();
  const step = f.calls[0];
  await f.scheduler.claim(step.requestId, 1);
  await f.scheduler.finish(step.sessionId!, 1, "completed", 11, "no structured items");
  const run = f.scheduler.runs[0];
  assert.equal(run.steps[0].emission?.missing, true);
  assert.deepEqual(run.tokens.map(token => token.edgeId), [plainEdge.id]);
  note.text = "edited later";
  await Promise.all([f.scheduler.remindEmission(run.id, step.id), f.scheduler.remindEmission(run.id, step.id)]);
  assert.equal(f.calls.length, 2);
  assert.equal(run.steps[0].emission?.reminderStepId, f.calls[1].id);
  assert.deepEqual(f.calls[1].sources, step.sources);
  await f.scheduler.claim(f.calls[1].requestId, 2);
  await f.scheduler.finish(step.sessionId!, 2, "completed", 22, "- repaired");
  assert.equal(run.tokens.length, 2);
  assert.equal(run.tokens[1].edgeId, f.doc.edges[0].id);
  assert.equal(run.tokens[1].source.content?.items?.[0].value, "repaired");
  for (const token of run.tokens) await f.scheduler.release(run.id, token.id, false);
  assert.equal(run.state, "completed");
});

test("interrupted or cancelled native turns never release buffered items", async t => {
  const f = setup(t, [["list", "stream"], ["list", "end"]]);
  await f.start();
  const step = f.calls[0], run = f.scheduler.runs[0];
  await f.scheduler.claim(step.requestId, 4);
  await assert.rejects(f.scheduler.emit(step.sessionId!, "aborted", [1], AbortSignal.abort()));
  assert.equal(run.tokens.length, 0);
  await f.scheduler.emit(step.sessionId!, "a", [1], new AbortController().signal);
  await f.scheduler.command(run.id, "cancel");
  await f.scheduler.finish(step.sessionId!, 4, "completed", 44, "- should not send");
  assert.equal(run.tokens.length, 1);
  assert.equal(run.tokens[0].consumed, true);
  assert.equal(run.steps[0].emission?.closed, true);
  assert.equal(f.scheduler.canEmit(step.sessionId!), false);
});

test("cold reconciliation after streaming delivers buffered end edges exactly once", async t => {
  const f = setup(t, [["list", "stream"], ["list", "end"]]);
  await f.start();
  const step = f.calls[0];
  await f.scheduler.claim(step.requestId, 1);
  await f.scheduler.emit(step.sessionId!, "saved", [42], new AbortController().signal);
  f.runtime.reconcile = async () => ({ state: "completed", endedAt: 5, endSeq: 4, output: "done" });
  const restored = new Scheduler(f.runtime, f.store, structuredClone(f.scheduler.runs));
  await restored.recover();
  await restored.recover();
  const run = restored.runs[0];
  assert.equal(run.tokens.length, 2);
  assert.deepEqual(run.tokens.map(token => token.edgeId), f.doc.edges.map(edge => edge.id));
  assert.equal(run.steps[0].emission?.closed, true);
  assert.equal(f.calls.length, 1);
});

test("empty structured output closes an empty list and skips an empty record edge", async t => {
  const f = setup(t, [["list", "stream"], ["record", "stream"]]);
  for (const called of [true, false]) {
    await f.start();
    const step = f.calls.at(-1)!;
    await f.scheduler.claim(step.requestId, 1);
    if (called) await f.scheduler.emit(step.sessionId!, "empty", [], new AbortController().signal);
    await f.scheduler.finish(step.sessionId!, 1, "completed", 2, "```json\n[]\n```");
    const run = f.scheduler.runs.at(-1)!;
    assert.equal(run.steps[0].emission?.missing, undefined);
    assert.deepEqual(run.tokens[0].source.content, { dataType: "list", items: [] });
    assert.equal(run.tokens[1].skip, true);
    assert.equal(run.tokens.length, 2);
  }
});

test("cancellation during a spill writes no receipt or downstream delivery", async t => {
  const f = setup(t, [["list", "stream"]]);
  await f.start();
  const step = f.calls[0];
  await f.scheduler.claim(step.requestId, 1);
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  f.runtime.freezeContent = async source => {
    started.resolve();
    await release.promise;
    return source;
  };
  const controller = new AbortController();
  const pending = f.scheduler.emit(step.sessionId!, "a", ["large".repeat(20000)], controller.signal);
  await started.promise;
  controller.abort();
  release.resolve();
  await assert.rejects(pending);
  assert.equal(f.scheduler.runs[0].tokens.length, 0);
  assert.equal(f.scheduler.runs[0].steps[0].emission?.calls.length ?? 0, 0);
});
