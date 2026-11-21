import assert from "node:assert/strict";
import test from "node:test";
import { arrangeCanvas } from "../src/client/canvasLayout.ts";
import { buildChildTree } from "../src/client/childTree.ts";
import { canvasItemBox, nodeBox, reflowCanvasItem, type Box } from "../src/client/geometry.ts";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function assertSeparate(items: Box[]) {
  for (const [index, box] of items.entries()) {
    for (const other of items.slice(index + 1)) {
      assert.ok(!overlaps(box, other), `${JSON.stringify(box)} overlaps ${JSON.stringify(other)}`);
    }
  }
}

test("expansion clears a pinned neighbour, cascades through other obstacles, and restores when folded", () => {
  const doc = emptyDocument();
  const card = { ...newNode("agent", 0, 0), expanded: false, height: 550 };
  const fixed = { ...newNode("file", -2, 160), pinned: true };
  const row = Array.from({ length: 9 }, (_, i) => newNode("note", 326 + i * 300, 0));
  const stub = { ...newNode("agent", 326, 324), window: { x: 15, y: 15, w: 460, h: 460, z: 2 } };
  doc.nodes = [card, fixed, stub, ...row.toReversed()];
  const original = structuredClone(doc.nodes);
  const before = nodeBox(card);
  card.expanded = true;
  reflowCanvasItem(doc, card, before);
  assert.deepEqual(fixed, original[1]);
  assert.deepEqual(stub, original[2]);
  assertSeparate(doc.nodes.map((node) => canvasItemBox(doc, node)));

  const grown = nodeBox(card);
  card.expanded = false;
  reflowCanvasItem(doc, card, grown);
  assert.deepEqual(doc.nodes, original);
});

test("when a nested frame grows its sibling moves, then returns after both frames shrink", () => {
  const doc = emptyDocument();
  const outer = { ...newNode("group", 0, 0), width: 416, height: 280 };
  const inner = { ...newNode("group", 24, 56), parentId: outer.id, width: 368, height: 200 };
  const card = { ...newNode("agent", 48, 112), parentId: inner.id, expanded: false, width: 530 };
  const neighbour = newNode("board", 470, 6);
  doc.nodes = [outer, inner, card, neighbour];
  const original = structuredClone(doc.nodes);
  const before = nodeBox(card);
  card.expanded = true;
  reflowCanvasItem(doc, card, before);
  assert.ok(inner.width >= card.width + 48);
  assert.ok(outer.width >= inner.width + 48);
  assertSeparate([canvasItemBox(doc, outer), nodeBox(neighbour)]);
  assert.ok(neighbour.nudge);

  const grown = nodeBox(card);
  card.expanded = false;
  reflowCanvasItem(doc, card, grown);
  assert.deepEqual(doc.nodes, original);
});

test("collapse leaves a displaced card in place if the user placed a different node in its original spot", () => {
  const doc = emptyDocument();
  const card = { ...newNode("agent", 0, 0), expanded: false };
  const neighbour = newNode("note", 0, 164);
  doc.nodes = [card, neighbour];
  const before = nodeBox(card);
  card.expanded = true;
  reflowCanvasItem(doc, card, before);
  assert.ok(neighbour.y > 164);
  const movedY = neighbour.y;
  const dropped = newNode("note", 0, 164);
  doc.nodes.push(dropped);
  const grown = nodeBox(card);
  card.expanded = false;
  reflowCanvasItem(doc, card, grown);
  assert.equal(neighbour.y, movedY);
  assertSeparate(doc.nodes.map((node) => canvasItemBox(doc, node)));
});

test("leaving the conversation keeps the offsets needed by the expanded form until it is folded", () => {
  const doc = emptyDocument();
  const group = { ...newNode("group", -24, -56), width: 660, height: 450 };
  const card = { ...newNode("agent", 0, 0), parentId: group.id, sessionId: "session", expanded: false };
  const below = { ...newNode("note", 0, 168), parentId: group.id };
  const beside = { ...newNode("file", 348, 0), parentId: group.id };
  doc.nodes = [group, card, below, beside];
  const original = structuredClone(doc.nodes);
  const compact = nodeBox(card);
  card.expanded = true;
  reflowCanvasItem(doc, card, compact);
  const overview = nodeBox(card);
  card.tab = "conversation";
  reflowCanvasItem(doc, card, overview);

  const live = nodeBox(card);
  card.tab = "task";
  reflowCanvasItem(doc, card, live);
  assert.equal(beside.x, original[3].x);
  assert.ok(below.y > original[2].y);
  assert.ok(group.y + group.height >= below.y + nodeBox(below).h);
  assertSeparate([card, below, beside].map((node) => nodeBox(node)));
  card.expanded = false;
  reflowCanvasItem(doc, card, overview);
  assert.deepEqual(doc.nodes, original);
});

test("subagent rows avoid canvas nodes and other subagent rows", () => {
  const first = { ...newNode("agent", 0, 0), sessionId: "first" };
  const second = { ...newNode("agent", 330, 0), sessionId: "second" };
  const note = newNode("note", 200, 450);
  const composite = { x: 0, y: 450, w: 312, h: 320 };
  const nodes = [first, second, note];
  const { cards } = buildChildTree({
    nodes, box: nodeBox, obstacles: [composite], teams: undefined,
    subagents: [first, first, second, second].map((parent, i) => ({
      parentSessionId: parent.sessionId, sessionId: `child-${i}`, title: `Child ${i}`, running: false,
    })),
  });
  const children = cards.map(({ box }) => box);
  assert.equal(children.length, 4);
  assertSeparate(children);
  assert.ok(children.every((box) => ![...nodes.map((node) => nodeBox(node)), composite].some((other) => overlaps(box, other))));
});

test("whole-canvas tidy includes workflows, satellite cards, loose tools, and fixed anchors", () => {
  const doc = emptyDocument();
  const group = newNode("group", 0, 0);
  const input = { ...newNode("file", 10, 10), parentId: group.id };
  const first = { ...newNode("agent", 10, 10), parentId: group.id, width: 700, height: 610 };
  const second = { ...newNode("agent", 10, 10), parentId: group.id, sessionId: "bound", tab: "conversation" as const };
  const role = { ...newNode("role", 10, 10), parentId: group.id, staffOf: first.id };
  const result = { ...newNode("display", 10, 10), parentId: group.id, sourceNodeId: second.id };
  const collapsed = { ...newNode("group", 4, 6), collapsed: true };
  const hidden = { ...newNode("agent", 44, 88), parentId: collapsed.id };
  const blocked = { ...newNode("git", 0, 0), pinned: true };
  const stub = { ...newNode("agent", 470, 0), window: { x: 20, y: 30, w: 500, h: 320, z: 2 } };
  const loose = newNode("note", 40, 40);
  doc.nodes = [group, first, second, input, role, result, collapsed, hidden, blocked, stub, loose];
  doc.edges = [newEdge(input.id, first.id, "reference"), newEdge(first.id, second.id, "continuation"), newEdge(second.id, hidden.id, "continuation")];
  const edges = structuredClone(doc.edges);
  const fixed = structuredClone([blocked, stub]);
  assert.equal(arrangeCanvas(doc), true);
  assertSeparate([group, collapsed, blocked, stub, loose].map((node) => canvasItemBox(doc, node)));
  assertSeparate([first, second, input, role, result].map((node) => nodeBox(node)));
  assert.ok(nodeBox(input).x + nodeBox(input).w < first.x);
  assert.ok(first.x + nodeBox(first).w < second.x);
  assert.ok(second.x + nodeBox(second).w < result.x);
  assert.ok(first.y + nodeBox(first).h < role.y);
  assert.ok(group.x + group.width < collapsed.x);
  assert.deepEqual([hidden.x - collapsed.x, hidden.y - collapsed.y], [40, 82]);
  assert.deepEqual([blocked, stub], fixed);
  assert.deepEqual(doc.edges, edges);
  assert.equal(arrangeCanvas(doc), false);
});

test("selection tidy sizes tool-only groups, preserves out-of-scope items, and avoids an existing frame", () => {
  const doc = emptyDocument();
  const outer = { ...newNode("group", 0, 0), width: 420, height: 410 };
  const inner = { ...newNode("group", 24, 56), parentId: outer.id, width: 350, height: 268 };
  const fixed = { ...newNode("note", 48, 110), parentId: inner.id, pinned: true };
  const board = { ...newNode("board", 53, 112), parentId: inner.id };
  const file = { ...newNode("file", 53, 112), parentId: inner.id };
  const unrelated = { ...newNode("group", 0, 350), width: 650, height: 200, collapsed: false };
  doc.nodes = [outer, inner, fixed, board, file, unrelated];
  const untouched = structuredClone([fixed, unrelated]);
  assert.equal(arrangeCanvas(doc, [board.id, file.id]), true);
  assert.deepEqual([fixed, unrelated], untouched);
  assertSeparate([fixed, board, file, unrelated].map((node) => canvasItemBox(doc, node)));
  assert.ok(inner.y + inner.height >= Math.max(board.y + nodeBox(board).h, file.y + nodeBox(file).h));
  assert.ok(outer.y + outer.height >= inner.y + inner.height);
});

test("tidy ranks a continuation cycle deterministically without changing its edges", () => {
  const doc = emptyDocument();
  const [first, second, third] = [0, 1, 2].map(() => newNode("agent", 20, 20));
  doc.nodes = [first, second, third];
  doc.edges = [newEdge(first.id, second.id, "continuation"), newEdge(second.id, third.id, "continuation"), newEdge(third.id, first.id, "continuation")];
  const originalEdges = structuredClone(doc.edges);
  assert.equal(arrangeCanvas(doc), true);
  assert.ok(first.x < second.x && second.x < third.x);
  assertSeparate(doc.nodes.map((node) => nodeBox(node)));
  assert.deepEqual(doc.edges, originalEdges);
});
