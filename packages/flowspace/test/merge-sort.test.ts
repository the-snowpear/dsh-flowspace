import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { contentList } from "../src/core/content.ts";
import { newFlowNode } from "../src/core/document.ts";
import { mergeSort } from "../src/core/nodes/fanout.ts";
import { snapshotWithContent } from "../src/core/nodes/input.ts";
import { flowRunsCode, portsOf } from "../src/core/nodes/registry.ts";
import type { ContextSnapshot, FlowNode, RunStep } from "../src/types.ts";
import { mergeExecutor } from "../src/host/nodes/merge.ts";

const quiet = { llm: { async *stream() { throw new Error("unexpected model request"); } } };
const signal = new AbortController().signal;
function stepWith(node: FlowNode, sources: ContextSnapshot[]): RunStep {
  return { id: "step", nodeId: node.id, requestId: "req", iteration: 1, state: "running", task: "", sources, createdAt: 42 };
}
function fixture() {
  const node = newFlowNode("flowspace/merge-sort", 0, 0);
  const source = snapshotWithContent(node, contentList([{ name: "第二项", ok: false }, { name: "第一项", ok: true }]));
  const step = stepWith(node, [source]);
  return { node, source, step };
}

test("merge exposes usable defaults, fixed sorting exits and active-mode code consent", () => {
  const { node } = fixture();
  const cfg = mergeSort.configSchema.parse({ wait: "all", quorum: 1, output: "list", cancelRest: false });
  assert.deepEqual(cfg, mergeSort.defaultConfig);
  assert.equal(z.toJSONSchema(mergeSort.configSchema).type, "object");
  assert.deepEqual(portsOf(node).filter(p => p.direction === "out").map(p => p.id), ["out"]);
  assert.equal(flowRunsCode(node), false);
  node.config = { ...cfg, sortMode: "code" };
  assert.equal(flowRunsCode(node), true);
  assert.deepEqual(portsOf(node).filter(p => p.direction === "out").map(p => [p.id, p.dataType, p.fixed]),
    [["pass", "list", undefined], ["fail", "list", undefined], ["error", "list", "error"]]);
  assert.equal(flowRunsCode(newFlowNode("flowspace/code", 0, 0)), true);
  assert.equal(mergeSort.configSchema.safeParse({ ...cfg, code: { source: "true", timeoutMs: 20000 } }).success, false);
  assert.equal(mergeSort.configSchema.safeParse({ ...cfg, condition: { match: "all", rules: [{ field: "text", op: "regex", value: "[" }] } }).success, false);
});

test("condition routing preserves order, typed payload, and the original frozen aggregate", async () => {
  const { node, step, source } = fixture();
  const exec = mergeExecutor(quiet);
  for (const [path, expected] of [["[0].ok", "fail"], ["[1].ok", "pass"]]) {
    node.config = { ...mergeSort.defaultConfig, sortMode: "condition", condition: {
      match: "all", rules: [{ field: "json", path, op: "equals", value: "true" }],
    } };
    const result = await exec(node, step, signal);
    assert.ok("route" in result);
    assert.equal(result.route, expected);
    assert.equal(result.source, source);
    assert.equal(result.output, source.text);
  }
});

test("code sorting runs the original typed snapshot through QuickJS and routes errors to its fixed port", async () => {
  const { node, source, step } = fixture();
  const exec = mergeExecutor(quiet);
  for (const [script, route] of [
    ["s => s.content.items[1].value.ok && typeof process === 'undefined'", "pass"],
    ["() => false", "fail"], ["() => 'fail'", "fail"], ["() => 'unknown'", "error"],
    ["() => { throw Error('bad merge') }", "error"],
  ]) {
    node.config = { ...mergeSort.defaultConfig, sortMode: "code", code: { source: script, timeoutMs: 1000 } };
    const result = await exec(node, step, signal);
    assert.ok("route" in result);
    assert.equal(result.route, route);
    assert.equal(result.verdict?.branch, route);
    assert.equal(result.source, source);
  }
});

test("a single native AI route records retries, tokens and low-confidence selection on the ordered merge", async () => {
  const { node, source, step } = fixture();
  node.config = { ...mergeSort.defaultConfig, sortMode: "ai", ai: { ...mergeSort.defaultConfig.ai,
    provider: "mock", model: "review", threshold: 0.8 } };
  let calls = 0;
  const exec = mergeExecutor({ llm: { async *stream(req) {
    assert.equal(req.purpose, "flowspace-judge");
    assert.equal(req.messages.length, 1);
    assert.deepEqual(req.messages[0].content, [{ type: "text", text: source.text }]);
    const text = ++calls === 1 ? "invalid" : '{"branch":"pass","confidence":0.6,"reason":"uncertain"}';
    yield { type: "text-delta", index: 0, text };
    yield { type: "usage", usage: { inputTokens: 2, outputTokens: 3 } };
  } } });
  const result = await exec(node, step, signal);
  assert.ok("route" in result);
  assert.equal(result.route, "fail");
  assert.equal(result.verdict?.confidence, 0.6);
  assert.equal(result.verdict?.rawOutputs?.length, 2);
  assert.deepEqual(result.telemetry, { stepCount: 2, inputTokens: 4, outputTokens: 6 });
  assert.equal(result.source, source);
  assert.equal(result.output, source.text);
});

test("a standalone merge formats direct lists or text inputs and obeys the supplied run cap", async () => {
  const { node, step } = fixture();
  const exec = mergeExecutor(quiet, () => 1);
  node.config = { ...mergeSort.defaultConfig, output: "text" };
  let result = await exec(node, step, signal);
  assert.ok("route" in result);
  assert.equal(result.route, "out");
  assert.deepEqual(result.source.content, { dataType: "text", value: JSON.stringify({ name: "第二项", ok: false }), originalCount: 2 });
  node.config = { ...mergeSort.defaultConfig, output: "list" };
  result = await exec(node, stepWith(node, ["a", "b"].map(value => snapshotWithContent(node, { dataType: "text", value }))), signal);
  assert.ok("route" in result);
  assert.deepEqual(result.source.content?.items?.map(item => item.value), ["a"]);
  assert.equal(result.source.content?.originalCount, 2);
});
