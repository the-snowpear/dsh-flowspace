import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { contentList } from "../src/core/content.ts";
import { newFlowNode } from "../src/core/document.ts";
import { dataDescriptors, dataItems, dataMode, transformData, type DataInput } from "../src/core/nodes/data/index.ts";
import { snapshotWithContent } from "../src/core/nodes/input.ts";
import { flowRunsCode, portsOf } from "../src/core/nodes/registry.ts";
import type { FlowContent, JsonObject, JsonValue } from "../src/types.ts";

const root = { id: "source", title: "Source" };
const input = (content: FlowContent, port = "in"): DataInput => ({ port, source: snapshotWithContent(root, content, 0) });
const textInput = (value: string, port = "in") => input({ dataType: "text", value }, port);
function configured(slug: string, config: JsonObject = {}) {
  const node = newFlowNode("flowspace/" + slug, 0, 0);
  node.config = { ...node.config, ...config };
  return node;
}
const values = (result: FlowContent) => result.items!.map(item => item.value);

test("all eleven data descriptors expose portable forms and run with their default empty input", () => {
  assert.equal(dataDescriptors.length, 11);
  for (const descriptor of dataDescriptors) {
    const node = newFlowNode(descriptor.flowType, 0, 0);
    assert.equal(z.toJSONSchema(descriptor.configSchema).type, "object");
    assert.deepEqual(descriptor.configSchema.parse({}), node.config);
    assert.equal(descriptor.family, "data");
    assert.deepEqual(descriptor.size, { compact: [256, 96], full: [312, 200] });
    assert.equal(portsOf(node).at(-1)?.id, "error");
    assert.equal(portsOf(node).at(-1)?.fixed, "error");
    assert.equal(dataMode(node), "rule");
    const result = transformData(node, []);
    if (result.dataType === "list") assert.deepEqual(result.items, [], descriptor.flowType);
    else assert.equal(result.value, "", descriptor.flowType);
  }
});

test("each data descriptor rejects invalid authored settings at the Host schema boundary", () => {
  const invalid: Record<string, JsonObject> = {
    split: { mode: "delimiter", delimiter: "" }, join: { mode: "numbered", delimiter: false },
    extract: { mode: "regex", pattern: "[" }, template: { inputs: ["要点", "要点"], template: "{{要点}}" },
    map: { mode: "code", code: { source: "", timeoutMs: 50 } },
    filter: { condition: { match: "all", rules: [] } }, sort: { mode: "field", path: "$[" },
    dedupe: { mode: "missing" }, constant: { mode: "list", value: "[bad]" }, accumulate: { accidental: true },
    parse: { kind: "unknown" },
  };
  for (const descriptor of dataDescriptors) {
    const config = invalid[descriptor.flowType.split("/")[1]];
    assert.equal(descriptor.configSchema.safeParse(config).success, false, descriptor.flowType);
  }
  const template = dataDescriptors.find(node => node.flowType === "flowspace/template")!;
  for (const config of [{ inputs: ["out"] }, { inputs: ["topic"], template: "{{missing}}" }, { inputs: [] }])
    assert.equal(template.configSchema.safeParse(config).success, false);
});

test("line split, structured JSON path and context parsing respect source order, nulls and the configured limit", () => {
  const result = transformData(configured("split"), [textInput("甲\n甲\n乙\n")], 2);
  assert.deepEqual(values(result), ["甲", "甲"]);
  assert.equal(new Set(result.items!.map(item => item.key)).size, 2);
  assert.equal(result.originalCount, 3);
  const record = input({ dataType: "record", value: { tasks: [null, { text: "内容" }] } });
  record.source.text = "# Human-readable details";
  assert.deepEqual(values(transformData(configured("extract", { mode: "json-path", path: "$.tasks[*]" }), [record])),
    [null, { text: "内容" }]);
  assert.deepEqual(values(transformData(configured("parse", { kind: "todos" }),
    [textInput("- [ ] 未完成\n- [x] 已完成\nTODO: 复核")])), ["未完成", "复核"]);
});

test("constants parse multiline text or nested JSON; joins support delimiters, numbered lists and item templates", () => {
  assert.equal(transformData(configured("constant", { value: " literal " }), []).value, " literal ");
  const list = transformData(configured("constant", { mode: "list", value: '[null,{"name":"A","field":["一"]},"$&"]' }), []);
  assert.deepEqual(values(list), [null, { name: "A", field: ["一"] }, "$&"]);
  assert.deepEqual(values(transformData(configured("constant", { mode: "list", value: "甲\r\n 乙\n甲" }), [])), ["甲", "乙", "甲"]);
  assert.equal(transformData(configured("join", { delimiter: " / " }), [input(contentList(["一", "二"]))]).value, "一 / 二");
  assert.equal(transformData(configured("join", { mode: "numbered" }), [input(contentList(["一", "二"]))]).value, "1. 一\n2. 二");
  const joined = transformData(configured("join", { mode: "template", template: "{{n}}={{item.name}}", delimiter: " | " }),
    [input(contentList([{ name: "一" }, { name: "$&" }]))]);
  assert.equal(joined.value, "1=一 | 2=$&");
});

test("named template ports bind by ID independent of edge arrival order and preserve record paths", () => {
  const node = configured("template", { inputs: ["资料", "标题", "资料.别名"],
    template: "{{标题}}／{{资料.rows[0].text}}／{{资料.别名}}" });
  assert.deepEqual(portsOf(node).filter(port => port.direction === "in" && port.role === "reference").map(port => port.id),
    ["资料", "标题", "资料.别名"]);
  const inputs = [textInput("简报", "标题"), textInput("另名", "资料.别名"),
    input({ dataType: "record", value: { rows: [{ text: "$1" }] } }, "资料")];
  assert.equal(transformData(node, inputs).value, "简报／$1／另名");
  assert.equal(transformData(node, [...inputs].reverse()).value, "简报／$1／另名");
});

test("mapping and filtering keep native keys; stable sorting puts missing fields last and leaves source untouched", () => {
  const original: JsonValue[] = [{ text: "z", score: 2 }, { text: "a", score: 3 }, { text: "b", score: 2 }, { text: "missing" }];
  const keys = ["c-z", "c-a", "c-b", "c-m"];
  const source = input(contentList(original, 100, keys));
  const mapped = transformData(configured("map", { template: "{{index}}:{{text}}/{{item.score}}" }), [source]);
  assert.deepEqual(mapped.items!.map(item => [item.key, item.value]), [
    ["c-z", "0:z/2"], ["c-a", "1:a/3"], ["c-b", "2:b/2"], ["c-m", "3:missing/"],
  ]);
  const rules = { match: "all", rules: [{ field: "json", path: "score", op: "gt", value: "2" }] };
  assert.deepEqual(transformData(configured("filter", { condition: rules }), [source]).items!.map(item => item.key), ["c-a"]);
  assert.deepEqual(transformData(configured("sort", { path: "score", order: "desc" }), [source]).items!.map(item => item.key),
    ["c-a", "c-z", "c-b", "c-m"]);
  assert.deepEqual(transformData(configured("sort", { mode: "rule", condition: rules }), [source]).items!.map(item => item.key),
    ["c-a", "c-z", "c-b", "c-m"]);
  assert.deepEqual(source.source.content!.items!.map(item => item.key), keys);
});

test("deduplication uses JSON value equality, optional normalization, and retains the first native key", () => {
  const source = input(contentList([{ b: 1, a: " X　Y " }, { a: "x y", b: 1 }, { a: " X　Y ", b: 1 }, 1, "1", null, null],
    10, ["first", "second", "third", "num", "str", "null", "duplicate-null"]));
  assert.deepEqual(transformData(configured("dedupe"), [source]).items!.map(item => item.key), ["first", "second", "num", "str", "null"]);
  assert.deepEqual(transformData(configured("dedupe", { mode: "normalized" }), [source]).items!.map(item => item.key),
    ["first", "num", "str", "null"]);
});

test("accumulation appends repeated native keys without collisions and carries source truncation counts", () => {
  const a = input(contentList(["a", "b"], 2, ["card-id", 'repeat:["card-id",2]']));
  const b = input(contentList(["b", "c", "d"], 2, ["card-id", "new", "truncated"]));
  const accumulator = configured("accumulate");
  const first = transformData(accumulator, [a], 6);
  const second = transformData(accumulator, [b], 6, first);
  const third = transformData(accumulator, [b], 6, second);
  assert.deepEqual(values(third), ["a", "b", "b", "c", "b", "c"]);
  assert.equal(third.originalCount, 8);
  assert.equal(new Set(third.items!.map(item => item.key)).size, 6);
  assert.deepEqual(third.items!.slice(0, 2), first.items);
  assert.deepEqual(values(transformData(accumulator, [b], 6)), ["b", "c"]);
  assert.equal(dataItems([a, b], 1).originalCount, 5);
  assert.equal(transformData(configured("join"), [b], 1).originalCount, 3);
});

test("AI and isolated code modes stay outside the pure rule path; only active script modes require import consent", () => {
  for (const slug of ["map", "filter", "parse", "sort", "dedupe"]) {
    const node = configured(slug, { mode: "ai" });
    assert.equal(dataMode(node), "ai");
    assert.equal(flowRunsCode(node), false);
    assert.throws(() => transformData(node, []), /Host/);
  }
  for (const slug of ["map", "filter", "parse"]) {
    const node = configured(slug, { mode: "code" });
    assert.equal(dataMode(node), "code");
    assert.equal(flowRunsCode(node), true);
    assert.throws(() => transformData(node, []), /Host/);
  }
  const constant = configured("constant", { mode: "list" });
  assert.equal(portsOf(constant).find(port => port.role === "reference" && port.direction === "out")?.dataType, "list");
});
