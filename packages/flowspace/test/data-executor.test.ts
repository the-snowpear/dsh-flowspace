import assert from "node:assert/strict";
import test from "node:test";
import { contentList } from "../src/core/content.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { snapshotWithContent } from "../src/core/nodes/input.ts";
import { Scheduler, type RuntimeAdapter } from "../src/core/scheduler.ts";
import { dataExecutor, evaluateData } from "../src/host/nodes/data.ts";
import { runDataCode } from "../src/host/nodes/judge/code.ts";
import type { ContextSnapshot, DataCallTrace, JsonObject, RunStep } from "../src/types.ts";

const signal = new AbortController().signal;
const source = snapshotWithContent({ id: "source", title: "Records" },
  contentList([null, { values: ["雪\u0000", null] }], 3, ["alpha", "beta"]));
const inputs = [{ port: "in", source }];
type Model = Parameters<typeof evaluateData>[0];
type Stream = Model["llm"]["stream"];

function fakeStream(complete: (payload: JsonObject) => string): Model {
  const stream = async function* (options: Parameters<Stream>[0]) {
    assert.equal(options.purpose, "flowspace-transform");
    const message = options.messages[0].content[0];
    assert.equal(message.type, "text");
    const payload = JSON.parse(message.text);
    yield { type: "text-delta", text: complete(payload) };
    yield { type: "usage", usage: { inputTokens: 5, cacheReadTokens: 2, cacheWriteTokens: 1, outputTokens: 3 } };
    yield { type: "finish", reason: { kind: "stop" } };
  };
  return { llm: { stream: stream as Stream } };
}

function configured(kind: string, mode: "ai" | "code", script = "(input) => input.item") {
  const node = newFlowNode(`flowspace/${kind}`, 0, 0);
  node.config = { ...node.config, mode, ai: { provider: "fixture", model: "cpu", instruction: "Inspect items" },
    code: { source: script, timeoutMs: 1000 } };
  return node;
}

test("QuickJS transforms return lossless JSON for an ordered batch and reject lossy return values", async () => {
  const values = await runDataCode("(input) => ({ i:input.index, nested:[input.item,null] })",
    [{ ...source, index: 0, item: false }, { ...source, index: 1, item: { s: "\u0000\ud800" } }], 500, signal);
  assert.deepEqual(values, [{ i: 0, nested: [false, null] }, { i: 1, nested: [{ s: "\u0000\ud800" }, null] }]);
  for (const body of ["undefined", "NaN", "({bad:undefined})", "[,1]", "new Date(0)", "({toJSON(){return 1}})",
    "(()=>{const o={};o.loop=o;return o})()", "Object.assign([1],{extra:0})",
    "Object.defineProperty({},'hidden',{value:1})", "Promise.resolve(1)", "(()=>{})"]) {
    await assert.rejects(runDataCode(`() => ${body}`, [source], 500, signal));
  }
});

test("Host code map, filter and parse preserve immutable input keys, null and list truncation", async () => {
  const unused = fakeStream(() => { throw new Error("unexpected model invocation"); });
  const result = await evaluateData(unused, configured("map", "code", "input => ({ data:input.item, index:input.index })"), inputs, 2, signal);
  assert.equal(result.route, "out");
  assert.deepEqual(result.source.content?.items, [
    { key: "alpha", value: { data: null, index: 0 } }, { key: "beta", value: { data: { values: ["雪\u0000", null] }, index: 1 } },
  ]);
  assert.equal(source.content?.items?.[0].value, null);
  const filter = await evaluateData(unused, configured("filter", "code", "input => input.item !== null"), inputs, 2, signal);
  assert.deepEqual(filter.source.content?.items, [source.content!.items![1]]);
  const parse = await evaluateData(unused, configured("parse", "code", "() => [false,0,null]"), inputs, 2, signal);
  assert.deepEqual(parse.source.content?.items?.map(item => item.value), [false, 0]);
  assert.equal(parse.source.content?.originalCount, 3);
  const failed = await evaluateData(unused, configured("filter", "code", "() => 1"), inputs, 2, signal);
  assert.equal(failed.route, "error");
  assert.match(failed.output, /布尔/);
});

test("item-level AI requests retain keys, cumulative native usage and the successful prefix on malformed output", async () => {
  const ai = configured("map", "ai");
  const ctx = fakeStream(payload => JSON.stringify({ value: [payload.item, "checked"] }));
  const result = await evaluateData(ctx, ai, inputs, 10, signal);
  assert.deepEqual(result.dataCalls?.map(call => [call.itemKey, call.index, call.inputTokens, call.outputTokens, call.provider, call.model]), [
    ["alpha", 0, 8, 3, "fixture", "cpu"], ["beta", 1, 8, 3, "fixture", "cpu"],
  ]);
  assert.deepEqual(result.telemetry, { inputTokens: 16, outputTokens: 6, stepCount: 2 });
  assert.deepEqual(result.source.content?.items?.map(item => item.key), ["alpha", "beta"]);
  const failure = await evaluateData(fakeStream(payload => payload.index === 0 ? '{"value":null}' : "broken"), ai, inputs, 10, signal);
  assert.equal(failure.route, "error");
  assert.equal(failure.dataCalls?.length, 2);
  assert.match(failure.dataCalls![1].error!, /JSON/);
  assert.equal(failure.dataCalls![0].error, undefined);
  assert.equal(failure.telemetry?.outputTokens, 6);
});

test("AI filtering, collection ordering, semantic deduplication and parsing validate their result envelopes", async () => {
  const run = (kind: string, respond: (value: JsonObject) => string, limit = 2) =>
    evaluateData(fakeStream(respond), configured(kind, "ai"), inputs, limit, signal);
  assert.deepEqual((await run("filter", item => JSON.stringify({ keep: item.item !== null }))).source.content?.items, [source.content!.items![1]]);
  assert.deepEqual((await run("sort", () => '{"indexes":[1,0]}')).source.content?.items?.map(item => item.key), ["beta", "alpha"]);
  assert.deepEqual((await run("dedupe", () => '{"indexes":[1]}')).source.content?.items?.map(item => item.key), ["beta"]);
  assert.deepEqual((await run("parse", () => '{"items":[null,1]}', 1)).source.content?.items?.map(item => item.value), [null]);
  for (const raw of ['{"indexes":[1]}', '{"indexes":[1,1]}', '{"indexes":[0,2]}', '{"indexes":[-1,0]}'])
    assert.equal((await run("sort", () => raw)).route, "error");
  const rejected = await run("dedupe", () => '{"indexes":[7]}');
  assert.equal(rejected.route, "error");
  assert.ok(rejected.dataCalls?.[0].error);
});

test("aborted model streams retain completed and partial usage without scheduling another item", async () => {
  const controller = new AbortController(), start = Promise.withResolvers<void>();
  const traces: DataCallTrace[] = [];
  let count = 0;
  const stream = async function* (options: Parameters<Stream>[0]) {
    count++;
    yield { type: "usage", usage: { inputTokens: 2, outputTokens: 1 } };
    if (count === 2) {
      start.resolve();
      await new Promise<void>((_, reject) => options.signal!.addEventListener("abort", () => reject(options.signal!.reason), { once: true }));
    }
    yield { type: "text-delta", text: '{"value":"valid"}' };
    yield { type: "finish", reason: { kind: "stop" } };
  };
  const result = evaluateData({ llm: { stream: stream as Stream } }, configured("map", "ai"), inputs, 10,
    controller.signal, undefined, async trace => { traces.push(trace); });
  await start.promise;
  controller.abort(new Error("stop item"));
  await assert.rejects(result, /stop item/);
  assert.deepEqual(traces.map(trace => [trace.itemKey, trace.inputTokens, trace.error]), [
    ["alpha", 2, undefined], ["beta", 2, "stop item"],
  ]);
  assert.equal(count, 2);
});

test("concurrent streamed appends commit once in admission order and isolate each run's accumulator", async () => {
  const doc = emptyDocument(), a = newNode("agent", 0, 0, "A"), b = newNode("agent", 0, 300, "B");
  a.task = b.task = "Emit";
  const acc = newFlowNode("flowspace/accumulate", 420, 0);
  doc.nodes = [a, b, acc];
  doc.edges = [a, b].map(node => ({ ...newEdge(node.id, acc.id, "continuation"), emitMode: "stream" }));
  const sent: RunStep[] = [], noopModel = fakeStream(() => { throw new Error("unexpected model call"); });
  const plain = (node: typeof a, text: string): ContextSnapshot => snapshotWithContent(node, { dataType: "text", value: text });
  const runtime: RuntimeAdapter = {
    ensure: async node => `session-${node.id}`, send: async step => { sent.push(step); }, cancel: async () => {},
    reference: async node => plain(node, node.text), capture: async (node, _mode, _seq, output = "") => plain(node, output),
    execute: dataExecutor(noopModel),
  };
  const store = { document: () => doc, changed: async () => {}, submitted: async () => {}, bound: async () => {} };
  const scheduler = new Scheduler(runtime, store);
  await scheduler.start({ kind: "single", nodeIds: [a.id] });
  await scheduler.start({ kind: "single", nodeIds: [b.id] });
  for (const step of sent) await scheduler.claim(step.requestId, 1);
  await Promise.all([
    scheduler.emit(sent[0].sessionId!, "a1", ["first"], signal), scheduler.emit(sent[1].sessionId!, "b1", [null], signal),
    scheduler.emit(sent[0].sessionId!, "a2", ["second"], signal), scheduler.emit(sent[0].sessionId!, "a2", ["second"], signal),
  ]);
  for (const step of sent) await scheduler.finish(step.sessionId!, 1, "completed", 5, "done");
  await scheduler.transact(async () => {});
  const [first, second] = scheduler.runs;
  assert.deepEqual(first.steps.filter(s => s.nodeId === acc.id).map(s => s.outputContent!.items!.map(item => item.value)),
    [["first"], ["first", "second"]]);
  assert.deepEqual(second.accumulators![0].content.items!.map(item => item.value), [null]);
  assert.deepEqual(first.accumulators![0].content.items!.map(item => item.value), ["first", "second"]);
  const reopened = new Scheduler(runtime, store, structuredClone(scheduler.runs));
  await reopened.recover();
  assert.deepEqual(reopened.runs.map(r => r.accumulators), scheduler.runs.map(r => r.accumulators));
});
