import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { emptyDocument, newNode } from "../src/core/document.ts";
import {
  canonicalJson,
  deepEqual,
  expandNodeIds,
  extractFileNodePaths,
  parseMarkdownFences,
} from "../src/core/utils.ts";
import { streamLlmJson, streamLlmText, type LlmStreamClient } from "../src/host/llm.ts";
import { KeyedSerialQueue, SerialQueue } from "../src/host/serialQueue.ts";
import type { DataCallTrace } from "../src/types.ts";

test("core/utils canonicalJson, deepEqual, extractFileNodePaths, parseMarkdownFences, expandNodeIds", () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
  assert.equal(deepEqual({ a: 1, b: undefined }, { a: 1 }), true);
  assert.equal(deepEqual({ a: [1, { x: 2, y: 3 }] }, { a: [1, { y: 3, x: 2 }] }), true);
  assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);

  assert.deepEqual(extractFileNodePaths({ text: " a.ts \n\n b.ts \n a.ts " }, true), ["a.ts", "b.ts"]);
  assert.deepEqual(extractFileNodePaths({ selectedItems: ["x.md", " x.md "], text: "ignored" }, true), ["x.md"]);

  const parsed = parseMarkdownFences("# Heading\n- outside\n```json\n# not heading\n[1,2]\n```\n");
  assert.equal(parsed.headings.length, 1);
  assert.equal(parsed.headings[0].title, "Heading");
  assert.equal(parsed.blocks.length, 1);
  assert.equal(parsed.blocks[0].language, "json");
  assert.equal(parsed.blocks[0].closed, true);
  assert.ok(parsed.outsideLines.includes("- outside"));

  const doc = emptyDocument();
  const group = newNode("group", 0, 0, "G");
  const child = newNode("agent", 10, 10, "A");
  child.parentId = group.id;
  doc.nodes.push(group, child);
  assert.deepEqual(expandNodeIds(doc.nodes, [group.id]), [child.id]);
});

test("host/serialQueue serializes execution and isolates errors", async () => {
  const order: string[] = [];
  const errors: unknown[] = [];
  const q = new SerialQueue((e) => errors.push(e));
  const p1 = q.run(async () => {
    await new Promise((r) => setTimeout(r, 15));
    order.push("first");
    throw new Error("boom");
  });
  const p2 = q.run(async () => {
    order.push("second");
    return 42;
  });
  await assert.rejects(p1, /boom/);
  assert.equal(await p2, 42);
  assert.deepEqual(order, ["first", "second"]);
  assert.equal(errors.length, 1);

  const keyed = new KeyedSerialQueue();
  const kOrder: string[] = [];
  await Promise.all([
    keyed.run("a", async () => {
      await new Promise((r) => setTimeout(r, 10));
      kOrder.push("a1");
    }),
    keyed.run("a", async () => {
      kOrder.push("a2");
    }),
    keyed.run("b", async () => {
      kOrder.push("b1");
    }),
  ]);
  assert.equal(kOrder.indexOf("a1") < kOrder.indexOf("a2"), true);
});

test("host/llm counts cache tokens, throws on finish error, and records DataCallTrace", async () => {
  const mockLlm: LlmStreamClient = {
    async *stream() {
      yield { type: "text-delta", text: '{"ok":' } as never;
      yield { type: "usage", usage: { inputTokens: 100, cacheReadTokens: 40, cacheWriteTokens: 10, outputTokens: 25 } } as never;
      yield { type: "text-delta", text: "true}" } as never;
      yield { type: "finish", reason: { kind: "stop" } } as never;
    },
  };
  const calls: DataCallTrace[] = [];
  const res = await streamLlmJson(mockLlm, {
    provider: "p",
    model: "m",
    purpose: "flowspace-transform",
    userText: "hi",
    parse: (v) => v as { ok: boolean },
    trace: { operation: "map", calls },
  });
  assert.equal(res.data.ok, true);
  assert.equal(res.inputTokens, 150);
  assert.equal(res.outputTokens, 25);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].inputTokens, 150);

  const failingLlm: LlmStreamClient = {
    async *stream() {
      yield { type: "finish", reason: { kind: "error", failure: { message: "provider down" } } } as never;
    },
  };
  await assert.rejects(
    streamLlmText(failingLlm, {
      provider: "p",
      model: "m",
      purpose: "flowspace-judge",
      userText: "x",
    }),
    /provider down/,
  );
});

test("architecture guard: zero core/host -> client imports and zero circular module dependencies", () => {
  const srcRoot = resolve(import.meta.dirname, "../src");
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
    return out;
  };
  const files = walk(srcRoot);
  const adj = new Map<string, string[]>();
  const violations: string[] = [];
  for (const file of files) {
    const rel = relative(srcRoot, file).replaceAll("\\", "/");
    const text = readFileSync(file, "utf8");
    const edges: string[] = [];
    for (const m of text.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g)) {
      const targetRel = relative(srcRoot, resolve(dirname(file), m[1])).replaceAll("\\", "/");
      edges.push(targetRel);
      if ((rel.startsWith("core/") || rel.startsWith("host/") || rel === "index.ts") && targetRel.startsWith("client/")) {
        violations.push(`${rel} -> ${targetRel}`);
      }
    }
    adj.set(rel, [...new Set(edges)]);
  }
  assert.deepEqual(violations, [], `Cross-layer imports forbidden: ${violations.join(", ")}`);

  let idx = 0;
  const index = new Map<string, number>(), low = new Map<string, number>(), onStack = new Set<string>(), stack: string[] = [];
  const cycles: string[][] = [];
  const visit = (v: string) => {
    index.set(v, idx);
    low.set(v, idx);
    idx++;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!adj.has(w)) continue;
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) cycles.push(comp);
    }
  };
  for (const v of adj.keys()) if (!index.has(v)) visit(v);
  assert.deepEqual(cycles, [], `Circular dependencies forbidden: ${cycles.map((c) => c.join(" <-> ")).join("; ")}`);
});
