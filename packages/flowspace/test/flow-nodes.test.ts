import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { isTypertRemoteMethod } from "@deepseek-ai/dsh-typert-protocol/remote-info";
import type { InvocationDescriptor } from "@deepseek-ai/dsh-typert-protocol/types";
import { TYPERT } from "../lib/typert.host.js";
import { nodeBox } from "../src/client/geometry.ts";
import { emptyDocument, newEdge, newFlowNode, newNode, sanitizeDocumentForWire } from "../src/core/document.ts";
import { descriptorOf, listDescriptors, portsOf, registerDescriptor } from "../src/core/nodes/registry.ts";
import { checkDocument, documentSchema } from "../src/host/storage.ts";
import { ai, code, condition, conditionRoute, human } from "../src/core/nodes/judge/index.ts";
import { aiJudge } from "../src/host/nodes/judge/ai.ts";
import { contentList } from "../src/core/content.ts";

test("judges expose JSON Schema, branch ports and valid defaults", () => {
  for (const descriptor of [condition, code, ai, human]) {
    assert.equal(z.toJSONSchema(descriptor.configSchema).type, "object");
    const node = newFlowNode(descriptor.flowType, 0, 0);
    assert.deepEqual(descriptor.configSchema.parse(node.config), descriptor.defaultConfig);
    assert.equal(portsOf(node)[0].id, "in");
    assert.equal(portsOf(node).at(-1)?.fixed, "error");
  }
  assert.deepEqual(code.ports(code.defaultConfig).map(p => p.id), ["in", "pass", "else", "error"]);
  assert.deepEqual(human.ports({ ...human.defaultConfig, timeoutAction: "timeout-port", timeoutSec: 1 })
    .map(p => p.id), ["in", "pass", "review", "timeout", "error"]);
  assert.equal(code.configSchema.parse({ ...code.defaultConfig, timeoutMs: undefined }).timeoutMs, 1000);
  for (const branches of [[{ id: "error", label: "A" }], [...code.defaultConfig.branches, ...code.defaultConfig.branches]]) {
    assert.equal(code.configSchema.safeParse({ ...code.defaultConfig, branches }).success, false);
  }
  assert.equal(ai.configSchema.safeParse({ ...ai.defaultConfig, lowConfidence: { threshold: .5, branch: "unknown" } }).success, false);
  assert.equal(human.configSchema.safeParse({ ...human.defaultConfig, timeoutAction: "default", timeoutSec: 1 }).success, false);
});

test("Host migrates older authored configs before validating and preserves the migrated version", (t) => {
  t.after(registerDescriptor({
    ...code, flowType: "test/versioned", version: 2,
    migrate(old, fromVersion) {
      assert.equal(fromVersion, 1);
      return { ...code.defaultConfig, source: String((old as { script: string }).script) };
    },
  }));
  const doc = emptyDocument();
  doc.nodes = [{ ...newFlowNode("test/versioned", 0, 0), configVersion: 1, config: { script: "() => false" } }];
  checkDocument(doc);
  checkDocument(doc);
  assert.equal(doc.nodes[0].configVersion, 2);
  assert.equal(doc.nodes[0].config?.source, "() => false");
});

test("conditions validate operands and evaluate ordered JSON and text rules", () => {
  const config = condition.configSchema.parse({ branches: [
    { id: "a", label: "A", match: "all", rules: [
      { field: "json", path: "$.items[0].score", op: "gt", value: "1" },
      { field: "json", path: "missing", op: "empty" },
    ] },
    { id: "b", label: "B", match: "any", rules: [
      { field: "text", op: "equals", value: "ok" }, { field: "text", op: "contains", value: "items" },
    ] },
  ] });
  assert.equal(conditionRoute(config, '{"items":[{"score":2}]}'), "a");
  assert.equal(conditionRoute(config, '{"items":[]}'), "b");
  assert.equal(conditionRoute(config, "ok"), "b");
  assert.equal(conditionRoute(config, ""), "else");
  for (const operand of [{ op: "regex", value: "[" }, { op: "lt", value: "" }, { op: "equals" }]) {
    assert.equal(condition.configSchema.safeParse({ branches: [{ ...config.branches[0], rules: [{ field: "text", ...operand }] }] }).success, false);
  }
});

test("AI judge retries malformed output once, records both responses and routes low confidence", async () => {
  const config = { ...ai.defaultConfig, provider: "fixture", model: "judge", lowConfidence: { threshold: .8, branch: "review" } };
  const input = "x".repeat(300);
  for (const last of ['{"branch":"pass","reason":"uncertain","confidence":0.6}', '{"branch":"missing","reason":"unknown","confidence":1}']) {
    const outputs = ["invalid", last];
    let attempts = 0;
    const result = await aiJudge({ async *stream(request) {
      assert.equal(request.purpose, "flowspace-judge");
      const text = outputs[attempts++];
      yield { type: "text-delta", index: 0, text };
      yield { type: "usage", usage: { inputTokens: 2, cacheReadTokens: 1, outputTokens: 4 } };
    } }, config, input, new AbortController().signal);
    assert.equal(attempts, 2);
    assert.equal(result.route, last.includes("missing") ? "error" : "review");
    assert.equal(result.verdict.model, config.model);
    assert.equal(result.verdict.inputSummary, input.slice(0, 240));
    assert.deepEqual(result.verdict.rawOutputs, outputs);
    assert.deepEqual(result.telemetry, { stepCount: 2, inputTokens: 6, outputTokens: 8 });
  }
});

test("flow factory resolves the requested locale, owns its defaults and uses descriptor sizes", (t) => {
  const defaults = { routes: [{ label: "Review" }] };
  t.after(registerDescriptor({
    flowType: "test/branch",
    family: "logic",
    version: 3,
    titleKey: "newBoard",
    descKey: "flow_node",
    icon: "logic-branch",
    configSchema: z.object({ routes: z.array(z.object({ label: z.string() })) }),
    defaultConfig: defaults,
    ports: ({ routes }) => routes.map(({ label }) => ({
      id: label, role: "continuation", direction: "out", dataType: "text",
    })),
    size: { compact: [260, 98], full: [328, 212] },
    capabilities: {},
    quickCreate: { canvas: true },
    experimental: true,
  }));
  const first = newFlowNode("test/branch", 17, 29, "zh");
  const second = newFlowNode("test/branch", 0, 0, "en");
  assert.equal(first.kind, "flow");
  assert.equal(first.flowType, "test/branch");
  assert.equal(first.configVersion, 3);
  assert.equal(first.titleKey, "newBoard");
  const descriptor = descriptorOf(first.flowType)!;
  assert.ok(listDescriptors().includes(descriptor));
  assert.throws(() => registerDescriptor(descriptor), /已注册/);
  assert.deepEqual(portsOf(first).map((port) => port.id), ["Review"]);
  assert.equal(first.title, "任务看板");
  assert.equal(second.title, "Task board");
  assert.deepEqual(nodeBox(first), { x: 17, y: 29, w: 328, h: 212, compact: false });
  assert.deepEqual(nodeBox(first, true), { x: 17, y: 29, w: 260, h: 98, compact: true });
  const firstRoutes = (first.config as typeof defaults).routes;
  firstRoutes[0].label = "Edited";
  assert.equal((second.config as typeof defaults).routes[0].label, "Review");
  assert.equal(defaults.routes[0].label, "Review");
});

test("missing descriptors preserve versioned JSON through the wire and storage", () => {
  const doc = emptyDocument();
  const config = { nullable: null, nested: [null, { flags: [true, false, null], path: "a/b" }] };
  const unknown = { ...newFlowNode("vendor/future-node", 1, 2), configVersion: 42, config, window: null };
  doc.nodes = [unknown];
  assert.deepEqual(portsOf(unknown), []);
  const wire = sanitizeDocumentForWire(doc);
  const { invocations } = TYPERT as { invocations: readonly InvocationDescriptor[] };
  const save = invocations.find((method) => method.namespace === "flowspace" && method.method === "save");
  assert.ok(save && isTypertRemoteMethod(save));
  const request = JSON.parse(JSON.stringify({ document: wire }));
  for (const strict of [false, true]) {
    assert.deepEqual(save.input({ strict }).create().parse(request), request);
  }
  const restored = documentSchema.parse(save.result.create().parse(request.document));
  checkDocument(restored);
  assert.equal(restored.nodes[0].kind, "flow");
  assert.equal(restored.nodes[0].flowType, "vendor/future-node");
  assert.equal(restored.nodes[0].configVersion, 42);
  assert.deepEqual(restored.nodes[0].config, config);
  assert.notEqual(wire.nodes[0].config?.nested, config.nested);
  assert.equal(restored.nodes[0].window, undefined);
  assert.equal(unknown.window, null);
});

test("frozen structured input preserves list order and JSON nulls through strict RPC and import storage", () => {
  const doc = emptyDocument();
  doc.settings.listLimit = 3;
  const source = newNode("note", 0, 0), target = newNode("agent", 400, 0);
  doc.nodes = [source, target];
  const content = contentList([null, { nested: [1, null, ["星图", null]] }, false, "truncated"], 3);
  doc.edges = [{ ...newEdge(source.id, target.id, "reference"), snapshotContent: content }];
  const methods = (TYPERT as { invocations: readonly InvocationDescriptor[] }).invocations;
  const save = methods.find(method => method.namespace === "flowspace" && method.method === "save")!;
  assert.ok(isTypertRemoteMethod(save));
  const wire = sanitizeDocumentForWire(doc);
  assert.notEqual(wire.edges[0].snapshotContent?.items?.[1]?.value, content.items?.[1]?.value);
  const input = JSON.parse(JSON.stringify({ document: wire }));
  const parsed = save.input({ strict: true }).create().parse(input) as { document: typeof doc };
  const restored = documentSchema.parse(save.result.create().parse(parsed.document));
  checkDocument(restored);
  assert.deepEqual(restored.edges[0].snapshotContent, content);
  assert.equal(restored.settings.listLimit, 3);
});

test("storage retains authored port IDs and logic, and accepts legacy edges without them", () => {
  const doc = emptyDocument();
  const a = newNode("agent", 0, 0);
  const b = newNode("agent", 1, 1);
  doc.nodes = [a, b];
  const legacy = newEdge(a.id, b.id, "continuation");
  doc.edges = [legacy];
  assert.deepEqual(documentSchema.parse(doc).edges[0], legacy);
  const routed = { ...legacy, sourcePort: "review", targetPort: "in", logic: {
    negate: false, fromRound: 0, maxTimes: 3, delayMs: 250,
  } };
  doc.edges = [routed];
  assert.deepEqual(documentSchema.parse(doc).edges[0], routed);
  for (const invalid of [{ negate: 1 }, { fromRound: -1 }, { maxTimes: 0.5 }, { delayMs: -100 }]) {
    assert.equal(documentSchema.safeParse({ ...doc, edges: [{ ...routed, logic: invalid }] }).success, false);
  }
});

test("storage validates namespaced flow type IDs and the versioned config envelope", () => {
  const doc = emptyDocument();
  const node = newFlowNode("vendor/logic-v2", 0, 0);
  for (const invalid of [
    { flowType: "missing-namespace" }, { flowType: "Vendor/logic" }, { flowType: "vendor/one/two" },
    { config: [] }, { configVersion: -1 }, { configVersion: 1.5 },
  ]) {
    assert.equal(documentSchema.safeParse({ ...doc, nodes: [{ ...node, ...invalid }] }).success, false);
  }
});
