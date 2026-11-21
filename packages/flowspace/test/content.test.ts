import assert from "node:assert/strict";
import test from "node:test";
import { contentList, contentOf, DEFAULT_LIST_LIMIT, textOfContent } from "../src/core/content.ts";
import { forwardInput, snapshotWithContent } from "../src/core/nodes/input.ts";
import type { ContextSnapshot, FlowNode, JsonValue, RunStep } from "../src/types.ts";
import { newFlowNode } from "../src/core/document.ts";

const node = newFlowNode("flowspace/condition", 0, 0);
const keysOf = (values: JsonValue[]) => contentList(values).items!.map(item => item.key);

test("list identity follows values, duplicate occurrence, and native source IDs", () => {
  const [a1, b, a2] = keysOf(["甲", "乙", "甲"]);
  assert.notEqual(a1, a2);
  assert.deepEqual(keysOf(["新", "甲", "甲", "乙"]).slice(1), [a1, a2, b]);
  assert.deepEqual(keysOf([{ a: 1, b: [null] }]), keysOf([{ b: [null], a: 1 }]));
  assert.notDeepEqual(keysOf(["1"]), keysOf([1]));

  const cards = contentList(["甲", "甲"], 4, ["card-A", "card-B"]);
  assert.deepEqual(cards.items!.map(item => item.key), ["card-A", "card-B"]);
  const mixed = contentList(["甲", "原生"], 4, [undefined, a1]);
  assert.equal(mixed.items![1].key, a1);
  assert.notEqual(mixed.items![0].key, a1);
});

test("list snapshots freeze nested JSON and report the starting count on truncation", () => {
  const record = { nested: [false, null, ["汉字"]] };
  const list = contentList([record, [], null], 2);
  record.nested.pop();
  assert.deepEqual(list.items!.map(item => item.value), [{ nested: [false, null, ["汉字"]] }, []]);
  assert.equal(list.originalCount, 3);
  assert.deepEqual(JSON.parse(textOfContent(list)), [{ nested: [false, null, ["汉字"]] }, []]);
  assert.equal(contentList([]).originalCount, undefined);
  const capped = contentList(Array.from({ length: 1002 }, (_, i) => i));
  assert.equal(capped.items!.length, DEFAULT_LIST_LIMIT);
  assert.equal(capped.originalCount, 1002);
});

test("all port types have textual projections and old captures remain readable", () => {
  const captured = snapshotWithContent(node, { dataType: "record", value: { empty: null } }, 42);
  assert.equal(captured.text, '{"empty":null}');
  assert.equal(captured.capturedAt, 42);
  assert.deepEqual(contentOf(captured), captured.content);
  const { content, ...legacy } = captured;
  assert.deepEqual(contentOf(legacy), { dataType: "text", value: captured.text });
  const file = snapshotWithContent(node, { dataType: "file", value: ["说明.txt"] });
  assert.equal(file.kind, "file");
  assert.deepEqual(contentOf({ ...legacy, kind: "file", text: "目录" }), { dataType: "file", value: "目录" });
  assert.equal(textOfContent({ dataType: "text", value: "" }), "");
  assert.equal(textOfContent({ dataType: "signal" }), "");
  const spill = { locator: "spill://example", preview: "预览", bytes: 70000 };
  assert.match(textOfContent({ dataType: "text", spill }), /预览\nspill:\/\/example/);
  assert.deepEqual(JSON.parse(textOfContent({ dataType: "list", items: [{ key: "a", spill }] })),
    [{ preview: spill.preview, locator: spill.locator }]);
});

function stepFor(sourceNode: FlowNode, sources: ContextSnapshot[]): RunStep {
  return { id: "step", nodeId: sourceNode.id, requestId: "request", state: "running", iteration: 1, task: "", sources, createdAt: 7 };
}

test("forwarded single input retains typed identity and multiple inputs preserve context formatting", async () => {
  const first = snapshotWithContent(node, contentList([{ key: null }, ["二"]]));
  assert.equal(await forwardInput(node, stepFor(node, [first])), first);
  const second = snapshotWithContent(node, { dataType: "text", value: "done" });
  const combined = await forwardInput(node, stepFor(node, [first, second]), async sources => sources.map(s => s.text).join(" · "));
  assert.equal(combined.text, '[{"key":null},["二"]] · done');
  assert.deepEqual(combined.content, { dataType: "text", value: combined.text });
  assert.equal(combined.capturedAt, 7);
});
