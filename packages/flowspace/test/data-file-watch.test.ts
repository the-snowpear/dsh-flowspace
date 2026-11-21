import assert from "node:assert/strict";
import test from "node:test";
import type { FsTarget } from "@deepseek-ai/dsh-fs";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { DataFileWatch } from "../src/host/dataFileWatch.ts";

const target = (path: string): FsTarget => ({ displayPath: path, targetKey: path as FsTarget["targetKey"] });
const tick = () => new Promise<void>(resolve => queueMicrotask(resolve));

function fixture() {
  const doc = emptyDocument();
  const a = { ...newNode("file", 0, 0), selectedItems: ["same.md"], cwd: "/project" };
  const b = { ...newNode("file", 0, 0), selectedItems: ["./same.md"], cwd: "/project" };
  const split = newFlowNode("flowspace/split", 300, 0);
  const first = newEdge(a.id, split.id, "reference"), second = newEdge(b.id, split.id, "reference");
  doc.nodes = [a, b, split];
  doc.edges = [first, second];
  return { doc, a, b, split, first, second };
}

test("edits and restores share checked paths across file nodes, notify their current owners, and dispose exact watches", async () => {
  const { doc, a, b, split, first, second } = fixture();
  const checked: string[] = [], opened: string[] = [], closed: string[] = [], messages: string[][] = [];
  const listeners = new Map<string, (error?: Error) => void>();
  const watch = new DataFileWatch({ watch: async (file, changed) => {
    opened.push(file.displayPath); listeners.set(file.displayPath, changed);
    return async () => { closed.push(file.displayPath); };
  } }, async (path, cwd) => {
    assert.equal(cwd, "/project"); checked.push(path);
    return target(path.replace(/^\.\//, ""));
  }, ids => messages.push(ids));
  await watch.sync(doc);
  assert.deepEqual(opened, ["same.md"]);
  await watch.sync({ ...doc, viewport: { x: 400, y: 200, zoom: .4 } });
  assert.deepEqual(checked, ["same.md", "./same.md"]);
  const old = listeners.get("same.md")!;
  old(); old(); await tick();
  assert.deepEqual(messages, [[a.id, b.id]]);
  b.selectedItems = ["next.md"];
  await watch.sync(doc);
  assert.deepEqual(opened, ["same.md", "next.md"]);
  old(); listeners.get("next.md")!(); await tick();
  assert.deepEqual(messages[1], [a.id, b.id]);
  const frozen = { ...first, snapshotText: "archived" };
  const listTarget = newFlowNode("flowspace/dedupe", 350, 0);
  const generated = { ...newEdge(a.id, split.id, "reference"), generatedBy: "fan" };
  doc.nodes.push(listTarget);
  doc.edges = [frozen, generated, newEdge(b.id, listTarget.id, "reference")];
  await watch.sync(doc);
  old(); await tick();
  assert.equal(messages.length, 2);
  assert.deepEqual(closed, ["same.md", "next.md"]);
  doc.edges = [first, second];
  await watch.sync(doc);
  assert.deepEqual(opened.slice(-2), ["same.md", "next.md"]);
  const restored = listeners.get("same.md")!;
  await watch.dispose(); restored(); await tick();
  assert.equal(messages.length, 2);
  assert.deepEqual(closed, opened);
});

test("superseded or disposed asynchronous setup closes returned handles and discards stale events", async () => {
  const { doc, a, first } = fixture();
  doc.edges = [first];
  const entered = Promise.withResolvers<void>(), delayed = Promise.withResolvers<void>();
  const closed: string[] = [], messages: string[][] = [];
  const callbacks = new Map<string, () => void>();
  const watcher = new DataFileWatch({ watch: async (file, changed) => {
    callbacks.set(file.displayPath, changed);
    if (file.displayPath === "same.md") { entered.resolve(); await delayed.promise; }
    return async () => { closed.push(file.displayPath); };
  } }, async name => target(name), ids => messages.push(ids));
  const firstSync = watcher.sync(doc);
  await entered.promise;
  a.selectedItems = ["final.md"];
  const latest = watcher.sync(doc);
  callbacks.get("same.md")!(); delayed.resolve();
  await Promise.all([firstSync, latest]);
  assert.deepEqual(closed, ["same.md"]);
  callbacks.get("same.md")!(); callbacks.get("final.md")!(); await tick();
  assert.deepEqual(messages, [[a.id]]);
  await watcher.dispose();
  assert.deepEqual(closed, ["same.md", "final.md"]);
});

test("denied paths and a provider without watch support never prevent the document from opening", async () => {
  const { doc } = fixture();
  const called: string[] = [];
  const watcher = new DataFileWatch({ watch: async file => { called.push(file.displayPath); throw new Error("unsupported"); } },
    async path => { if (path.startsWith(".")) throw new Error("unchecked path"); return target(path); },
    () => assert.fail("no changes"));
  await watcher.sync(doc); await watcher.sync(doc); await watcher.dispose();
  assert.deepEqual(called, ["same.md"]);
});

test("disposing during native watcher initialization suppresses callbacks and awaits the late handle exactly once", async () => {
  const { doc, first } = fixture();
  doc.edges = [first];
  const entered = Promise.withResolvers<void>(), ready = Promise.withResolvers<void>();
  let closed = 0;
  const watcher = new DataFileWatch({ watch: async (_file, changed) => {
    entered.resolve(); await ready.promise;
    changed(); return async () => { closed++; };
  } }, async path => target(path), () => assert.fail("disposal emitted a change"));
  const loading = watcher.sync(doc);
  await entered.promise;
  const disposing = watcher.dispose();
  assert.equal(watcher.dispose(), disposing);
  ready.resolve();
  await Promise.all([loading, disposing]);
  assert.equal(closed, 1);
});
