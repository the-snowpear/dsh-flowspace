import test from "node:test";
import assert from "node:assert/strict";
import { extractValues, parseValues, pathValues, splitValues } from "../src/core/nodes/data/text.ts";

const markdown = ["序言", "# 星图", "条目 A", "## 日期", "条目 B", "~~~ts", "# code", "~~~", "# 对照表", "条目 C"].join("\n");

test("split supports literal and regex separators, Markdown headings and fenced blocks", () => {
  assert.deepEqual(splitValues({ mode: "lines" }, " A\r\n\n B "), ["A", "B"]);
  assert.deepEqual(splitValues({ mode: "delimiter", delimiter: "||" }, "A||||B"), ["A", "B"]);
  assert.deepEqual(splitValues({ mode: "regex", pattern: "([，,])" }, "甲，乙,丙"), ["甲", "乙", "丙"]);
  assert.deepEqual(splitValues({ mode: "headings" }, markdown), ["序言", "# 星图\n条目 A", "## 日期\n条目 B\n~~~ts\n# code\n~~~", "# 对照表\n条目 C"]);
  assert.deepEqual(splitValues({ mode: "code-blocks" }, markdown), ["# code"]);
  assert.throws(() => splitValues({ mode: "regex", pattern: "[" }, "a"));
  assert.deepEqual(splitValues({ mode: "lines" }, ""), []);
});

test("extract keeps JSON values typed and respects Markdown section depth", () => {
  const record = { items: [{ "a.b": null }, { "a.b": [0, false] }] };
  assert.deepEqual(pathValues(record, "$.items[*]['a.b']"), [null, [0, false]]);
  assert.deepEqual(pathValues(record, "items[1][\"a.b\"][0]"), [0]);
  assert.deepEqual(pathValues(record, "$.missing"), []);
  assert.deepEqual(pathValues(record, "$.constructor"), []);
  assert.throws(() => pathValues(record, "$.items[no]"), /下标/);
  assert.deepEqual(extractValues({ mode: "json-path", path: "$.items[*][\"a.b\"]" },
    "~~~json\n" + JSON.stringify(record) + "\n~~~"), [null, [0, false]]);
  assert.deepEqual(extractValues({ mode: "heading", heading: "星图" }, markdown), ["条目 A\n## 日期\n条目 B\n~~~ts\n# code\n~~~"]);
  assert.deepEqual(extractValues({ mode: "regex", pattern: "(?<key>[A-Z]):(\\d+)" }, "A:1 B:2"), [{ key: "A" }, { key: "B" }]);
});

test("context parsers extract tasks, file paths, error stacks, typed JSON and code fences", () => {
  assert.deepEqual(parseValues({ kind: "todos" }, "- [ ] 写展签\n- [x] 打印\n// TODO(馆长): 复核"), ["写展签", "复核"]);
  assert.deepEqual(parseValues({ kind: "paths" }, 'src/ui/app.ts:3:7 "C:\\藏品\\星 图.md" https://example.test/a.json README.md'),
    ["src/ui/app.ts", "C:\\藏品\\星 图.md", "README.md"]);
  assert.deepEqual(parseValues({ kind: "errors" }, "Intro\nTypeError: missing entry\n  at load (src/a.ts:3)\nOK"), ["TypeError: missing entry\n  at load (src/a.ts:3)"]);
  assert.deepEqual(parseValues({ kind: "json" }, 'Record {"text":"}","items":[null,1]} then [false]'), [{ text: "}", items: [null, 1] }, [false]]);
  assert.deepEqual(parseValues({ kind: "code-blocks" }, markdown), [{ language: "ts", code: "# code" }]);
  assert.deepEqual(parseValues({ kind: "paths" }, "  "), []);
});
