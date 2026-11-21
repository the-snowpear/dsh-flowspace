import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentList } from "../src/core/content.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { snapshotWithContent } from "../src/core/nodes/input.ts";
import { ContentSpills, type ContentSpillTable } from "../src/host/content.ts";
import { previewDataNode, resolveStaticFanout } from "../src/host/dataPreview.ts";
import { DshRuntime } from "../src/host/runtime.ts";
import type { ContextSnapshot, FlowspaceRun } from "../src/types.ts";

const signal = new AbortController().signal;
const noIO = {
  previewFile: async (): Promise<ContextSnapshot> => { throw new Error("unexpected file read"); },
  hydrateContent: async (source: ContextSnapshot) => source,
};
function mockModel() {
  const calls: { operation: string; item: unknown }[] = [];
  const ctx = { llm: { async *stream(options: { messages: { content: { text: string }[] }[] }) {
    const payload = JSON.parse(options.messages[0].content[0].text);
    calls.push(payload);
    yield { type: "text-delta", text: JSON.stringify({ value: { reviewed: payload.item } }) };
    yield { type: "usage", usage: { inputTokens: 3, outputTokens: 1 } };
    yield { type: "finish", reason: { kind: "stop" } };
  } } } as unknown as Parameters<typeof previewDataNode>[0];
  return { ctx, calls };
}
function mapNode(mode: "ai" | "code") {
  const node = newFlowNode("flowspace/map", 0, 0);
  node.config = { ...node.config, mode, ai: { provider: "fixture", model: "preview", instruction: "Review items" },
    code: { source: "input => ({ item:input.item, index:input.index })", timeoutMs: 1000 } };
  return node;
}

test("an eligible QuickJS preview uses a fresh guest; AI previews require an explicit target and leave the document untouched", async () => {
  const { ctx, calls } = mockModel();
  const doc = emptyDocument(), constant = newFlowNode("flowspace/constant", 0, 0), code = mapNode("code"), ai = mapNode("ai");
  constant.config = { mode: "list", value: '["first",null]' };
  doc.nodes = [constant, code, ai];
  doc.edges = [newEdge(constant.id, code.id, "continuation"), newEdge(code.id, ai.id, "continuation")];
  const before = structuredClone(doc);
  const run = (nodeId: string, tryModel = false) => previewDataNode(ctx, noIO, doc, [], { nodeId, tryModel }, signal);
  const preview = await run(code.id);
  assert.equal(preview.state, "ready");
  assert.deepEqual(preview.lines.map(line => JSON.parse(line)), [{ item: "first", index: 0 }, { item: null, index: 1 }]);
  assert.equal((await run(ai.id)).state, "trial");
  assert.equal(calls.length, 0);
  const tested = await run(ai.id, true);
  assert.deepEqual(tested.lines.map(line => JSON.parse(line)), [{ reviewed: { item: "first", index: 0 } }, { reviewed: { item: null, index: 1 } }]);
  assert.deepEqual(tested.telemetry, { stepCount: 2, inputTokens: 6, outputTokens: 2 });
  assert.equal(calls.length, 2);
  assert.deepEqual(doc, before);
});

test("an AI dependency is never invoked by another preview, including when its consumer requests a trial", async () => {
  const { ctx, calls } = mockModel(), doc = emptyDocument();
  const constant = newFlowNode("flowspace/constant", 0, 0), upstream = mapNode("ai"), target = mapNode("ai");
  const passiveCode = mapNode("code");
  constant.config = { mode: "list", value: '["live"]' };
  doc.nodes = [constant, upstream, target, passiveCode];
  doc.edges = [newEdge(constant.id, upstream.id, "continuation"), newEdge(upstream.id, target.id, "continuation"),
    newEdge(upstream.id, passiveCode.id, "continuation")];
  assert.equal((await previewDataNode(ctx, noIO, doc, [], { nodeId: target.id, tryModel: true }, signal)).state, "waiting");
  assert.equal((await previewDataNode(ctx, noIO, doc, [], { nodeId: passiveCode.id, tryModel: true }, signal)).state, "waiting");
  assert.equal(calls.length, 0);
  const frozen = snapshotWithContent(upstream, contentList(["captured"], 2, ["old-item"]));
  const run = { graph: structuredClone({ nodes: doc.nodes, edges: doc.edges }),
    steps: [{ nodeId: target.id, state: "completed", createdAt: 10, sources: [frozen], sourcePorts: ["in"] }],
    accumulators: [{ nodeId: "unused", content: contentList(["original"]) }] } as FlowspaceRun;
  const saved = structuredClone(run);
  const trial = await previewDataNode(ctx, noIO, doc, [run], { nodeId: target.id, tryModel: true }, signal);
  assert.deepEqual(trial.lines.map(line => JSON.parse(line)), [{ reviewed: "captured" }]);
  assert.equal(calls.length, 1);
  assert.deepEqual(run, saved);
  const newSource = newNode("agent", 0, 0, "Different source");
  doc.nodes.push(newSource);
  doc.edges.find(edge => edge.target === target.id)!.source = newSource.id;
  assert.equal((await previewDataNode(ctx, noIO, doc, [run], { nodeId: target.id, tryModel: true }, signal)).state, "waiting");
  assert.equal(calls.length, 1);
});

test("static file preview reads the same complete input once, returns bounded rows and writes no spill or Session", async t => {
  const { ctx, calls } = mockModel(), doc = emptyDocument();
  const cwd = await mkdtemp(join(tmpdir(), "flowspace-preview-"));
  const lines = ["x".repeat(70000), ...Array.from({ length: 8 }, (_, i) => `row-${i + 2}`)];
  await writeFile(join(cwd, "guide.txt"), lines.join("\n"));
  t.after(async () => { await unlink(join(cwd, "guide.txt")); await rmdir(cwd); });
  const file = { ...newNode("file", 0, 0), cwd, selectedItems: ["guide.txt"] };
  const split = newFlowNode("flowspace/split", 400, 0);
  doc.settings.listLimit = 8;
  doc.nodes = [file, split];
  doc.edges = [newEdge(file.id, split.id, "reference")];
  let reads = 0;
  const table: ContentSpillTable = { get: () => undefined, entries: () => new Map().entries(), put: async () => { throw new Error("preview wrote a spill"); } };
  const runtime = new DshRuntime({} as never, () => undefined, {} as never, new Map(), table, () => 8,
    async (path, folder) => { reads++; return readFile(join(folder!, path), "utf8"); });
  const preview = await previewDataNode(ctx, runtime, doc, [], { nodeId: split.id }, signal);
  assert.equal(preview.state, "ready");
  assert.equal(preview.count, 8);
  assert.equal(preview.remaining, 2);
  assert.equal(preview.originalCount, 9);
  assert.equal(preview.lines.length, 6);
  assert.ok(preview.lines[0].length <= 512);
  assert.equal(preview.lines[5], "row-6");
  assert.equal(reads, 1);
  assert.equal(calls.length, 0);
});

test("frozen spill-only text is fully restored before parsing and unregistered locators produce a bounded error", async () => {
  const { ctx, calls } = mockModel(), doc = emptyDocument();
  const note = newNode("note", 0, 0), split = newFlowNode("flowspace/split", 0, 0);
  const key = "fixture:known";
  const row = { locator: key, encoding: "text", preview: "partial", bytes: 30, retrievalHint: "" };
  const records = new Map([["known", row]]);
  const spills = new ContentSpills({ fs: { resolve: async () => key, readText: async () => "complete\nsecond" } } as never, {
    get: () => undefined, entries: () => records.entries() as ReturnType<ContentSpillTable["entries"]>,
    put: async () => { throw new Error("unexpected spill"); },
  });
  doc.nodes = [note, split];
  const edge = { ...newEdge(note.id, split.id, "reference"), snapshotContent: {
    dataType: "text" as const, spill: { locator: key, preview: "partial", bytes: 30 },
  } };
  doc.edges = [edge];
  const runtime = { ...noIO, hydrateContent: (source: ContextSnapshot) => spills.hydrate(source) };
  assert.deepEqual((await previewDataNode(ctx, runtime, doc, [], { nodeId: split.id }, signal)).lines, ["complete", "second"]);
  edge.snapshotContent.spill.locator = "missing";
  const error = await previewDataNode(ctx, runtime, doc, [], { nodeId: split.id }, signal);
  assert.equal(error.state, "error");
  assert.match(error.message!, /spill/);
  assert.equal(calls.length, 0);
});

test("file and QuickJS inputs produce the complete pre-run draft list with stable keys and no model or runtime changes", async () => {
  const { ctx, calls } = mockModel(), doc = emptyDocument();
  const file = { ...newNode("file", 0, 0), selectedItems: ["first.md"] }, split = newFlowNode("flowspace/split", 0, 0);
  const code = mapNode("code"), fan = newFlowNode("flowspace/fanout", 0, 0);
  code.config!.code = { source: "input => input.item.toUpperCase()", timeoutMs: 1000 };
  doc.nodes = [file, split, code, fan];
  doc.edges = [newEdge(file.id, split.id, "reference"), newEdge(split.id, code.id, "continuation"), newEdge(code.id, fan.id, "continuation")];
  let reads = 0;
  const bodies = new Map([["first.md", "a\nb\nc\nd\ne\nf\ng\nh"], ["second.md", "b\na"]]);
  const runtime = { ...noIO, previewFile: async (node: typeof file) => {
    reads++;
    return snapshotWithContent(node, { dataType: "text", value: bodies.get(node.selectedItems![0])! });
  } } as Parameters<typeof resolveStaticFanout>[1];
  const before = structuredClone(doc);
  const first = await resolveStaticFanout(ctx, runtime, doc, fan.id);
  assert.deepEqual(first?.items?.map(item => item.value), ["A", "B", "C", "D", "E", "F", "G", "H"]);
  assert.deepEqual(doc, before);
  bodies.set("first.md", "a\nb");
  const revised = await resolveStaticFanout(ctx, runtime, doc, fan.id);
  assert.deepEqual(revised?.items, first?.items?.slice(0, 2));
  file.selectedItems = ["second.md"];
  const moved = await resolveStaticFanout(ctx, runtime, doc, fan.id);
  assert.deepEqual(moved?.items, revised?.items?.toReversed());
  assert.equal(reads, 3);
  code.config!.mode = "ai";
  assert.equal(await resolveStaticFanout(ctx, runtime, doc, fan.id), undefined);
  assert.equal(calls.length, 0);
  assert.ok(doc.nodes.every(node => !node.sessionId));
});
