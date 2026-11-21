import assert from "node:assert/strict";
import test from "node:test";
import type { Context } from "@deepseek-ai/cordis";
import type { SaveTextSpill } from "@deepseek-ai/dsh-spill";
import { boardContent } from "../src/core/board.ts";
import { contentList } from "../src/core/content.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { ContentSpills, MAX_INLINE_CONTEXT_BYTES, type ContentSpillTable } from "../src/host/content.ts";
import { DshRuntime } from "../src/host/runtime.ts";
import { documentSchema, flowContentSchema } from "../src/host/storage.ts";
import type { ContextSnapshot, RunStep } from "../src/types.ts";

const sample = (text: string): ContextSnapshot => ({
  kind: "text", id: "snapshot", sourceNodeId: "board", title: "展品", text, capturedAt: 1,
});

function spillFixture() {
  const writes: SaveTextSpill[] = [];
  const files = new Map<string, string>();
  const records = new Map<string, NonNullable<ReturnType<ContentSpillTable["get"]>>>();
  const table: ContentSpillTable = {
    get: id => records.get(id), entries: () => records.entries(), put: async (id, row) => { records.set(id, row); },
  };
  const ctx = {
    fs: { resolve: async (locator: string) => locator, readText: async (locator: string) => files.get(locator) },
    get: () => ({ saveText: async (input: SaveTextSpill) => {
      writes.push(input);
      const locator = `fixture:${writes.length}`;
      files.set(locator, input.content);
      return { locator, bytes: Buffer.byteLength(input.content, "utf8"), retrievalHint: "Read the saved item" };
    } }),
  } as unknown as Context;
  return { writes, ctx, table };
}

test("individual spills preserve exact text and nested JSON through restarts and pure Host execution", async () => {
  const { ctx, table, writes } = spillFixture();
  const spills = new ContentSpills(ctx, table);
  const atLimit = "a".repeat(MAX_INLINE_CONTEXT_BYTES);
  const large = "展".repeat(22000);
  const record = { original: [large, null, { note: "完整" }] };
  const input = { ...sample(large), content: contentList([atLimit, record, null], 3, ["small", "big", "null"]) };
  const stored = await spills.freeze(input, 3);
  assert.equal(writes.length, 2);
  assert.equal(stored.content!.items![0].value, atLimit);
  assert.equal(stored.content!.items![1].value, undefined);
  assert.ok(stored.content!.items![1].spill);
  assert.deepEqual(stored.content!.items![2], { key: "null", value: null });
  assert.equal(stored.text.includes(large), false);
  assert.match(stored.text, /完整内容：fixture:2/);
  const reloaded = JSON.parse(JSON.stringify(stored)) as ContextSnapshot;
  assert.deepEqual(await new ContentSpills(ctx, table).hydrate(reloaded), input);
  const flow = newFlowNode("flowspace/condition", 0, 0);
  const runtime = new DshRuntime(ctx, () => flow, {} as never, new Map([
    [flow.flowType!, async (_node, step) => {
      assert.deepEqual(step.sources[0], input);
      return { route: "pass", output: "passed", source: step.sources[0] };
    }],
  ]), table);
  const result = await runtime.execute(flow, { sources: [reloaded] } as RunStep, new AbortController().signal);
  assert.ok("source" in result);
  assert.equal(result.source, reloaded);
  assert.equal(writes.length, 2);
  assert.equal(await runtime.contextText([reloaded]), large);
  const nativeContext = await runtime.contextText([reloaded], "recipient");
  assert.match(nativeContext, /完整内容：fixture:2/);
  assert.match(nativeContext, /Read the saved item/);
  assert.ok(Buffer.byteLength(nativeContext, "utf8") < MAX_INLINE_CONTEXT_BYTES);
});

test("frozen board and file references retain their native rendering, stable origin and configured limit", async () => {
  const { ctx, table } = spillFixture();
  const board = newNode("board", 0, 0);
  board.columns = [{ id: "todo", name: "待办", role: "todo", cards: [
    { id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C", done: true },
  ] }];
  board.selectedItems = ["b", "c"];
  const runtime = new DshRuntime(ctx, () => board, {} as never, new Map(), table, () => 1);
  const source = await runtime.reference(board);
  assert.deepEqual(source.content!.items!.map(item => item.key), ["b"]);
  assert.equal(source.content!.originalCount, 2);
  assert.equal(source.text, "## [待办]\n- [ ] B");
  board.boardSettings = { refScope: "open-only" };
  assert.deepEqual(boardContent(board)?.items?.map(item => item.key), ["a", "b"]);
  const edge = newEdge(board.id, "recipient", "reference");
  const card = await runtime.reference(board, { ...edge, sourceItemKey: "c" });
  assert.deepEqual(card.content, { dataType: "record", value: { id: "c", text: "C", done: true, columnId: "todo", column: "待办" } });
  const frozen = await runtime.reference(board, { ...edge,
    snapshotContent: contentList([{ nested: [null] }, "discard"], 2), snapshotText: "manual preview",
  });
  assert.equal(frozen.content!.originalCount, 2);
  assert.deepEqual(frozen.content!.items!.map(item => item.value), [{ nested: [null] }]);
  assert.equal(frozen.text, '[{"nested":[null]}]');
  const file = newNode("file", 0, 0);
  const empty = await runtime.reference(file);
  assert.deepEqual(empty.content, { dataType: "file", value: [] });
  assert.match(empty.text, /未配置/);
});

test("Host validates imported content, list settings, and locators before lookup", async () => {
  const { ctx, table } = spillFixture();
  const spills = new ContentSpills(ctx, table);
  const ref = { locator: "unregistered", bytes: 77000, preview: "preview" };
  await assert.rejects(spills.freeze({ ...sample("x"), content: { dataType: "text", spill: ref } }, 1), /没有.*spill/);
  await assert.rejects(spills.hydrate({ ...sample("x"), content: { dataType: "list", items: [{ key: "first", spill: ref }] } }), /没有.*spill/);
  for (const content of [
    { dataType: "list", items: [{ key: "1", value: 0 }, { key: "1", value: 1 }] },
    { dataType: "list", items: [{ key: "1" }] },
    { dataType: "list", items: [{ key: "1", value: null, spill: ref }] },
    { dataType: "list", items: [{ key: "1", value: 0 }], originalCount: 0 },
    { dataType: "record", value: [1] },
  ]) assert.equal(flowContentSchema.safeParse(content).success, false);
  const doc = emptyDocument();
  for (const listLimit of [0, -1, 0.5]) {
    assert.equal(documentSchema.safeParse({ ...doc, settings: { ...doc.settings, listLimit } }).success, false);
  }
});
