import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newNode } from "../src/core/document.ts";
import { createFanoutPair } from "../src/core/fanout.ts";
import {
  addWire,
  matchesWire,
  removeCanvasNodes,
  wirePortIds,
} from "../src/client/canvas/canvasGraphOps.ts";

test("canvasGraphOps addWire deduplicates matching edges and removeCanvasNodes cleans fanout brackets", () => {
  const doc = emptyDocument();
  const a = newNode("agent", 0, 0, "A");
  const b = newNode("agent", 400, 0, "B");
  doc.nodes.push(a, b);

  addWire(doc, a, b, "continuation");
  addWire(doc, a, b, "continuation");
  assert.equal(doc.edges.length, 1);
  assert.equal(matchesWire(doc.edges[0], { source: a.id, target: b.id, kind: "continuation" }), true);
  assert.deepEqual(wirePortIds(a, "continuation", "out"), ["out"]);

  const { group, fan, master, merge } = createFanoutPair(doc, 0, 400);
  removeCanvasNodes(doc, [fan.id]);
  assert.equal(doc.nodes.some((n) => n.id === group.id || n.id === fan.id || n.id === master.id || n.id === merge.id), false);
  assert.equal(doc.nodes.length, 2);
});
