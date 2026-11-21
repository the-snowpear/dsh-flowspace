import assert from "node:assert/strict";
import test from "node:test";
import {
  addBoardCard, boardColumnColor, boardProgress, clearCompletedBoardCards, findBoardCard,
  formatBoardMarkdown, isBoardCardDone, moveBoardCard, moveChecklistItem, normalizeBoardColumns,
  removeBoardCard, removeBoardColumn, resolveBoardReference, setBoardColumnRole, toggleBoardCardDone,
  updateBoardCard, updateBoardColumn,
} from "../src/core/board.ts";
import { emptyDocument, newEdge, newNode, referenceTitle } from "../src/core/document.ts";
import { buildLocalEdgePayloadFallback } from "../src/client/PayloadPeekPopover.tsx";
import { nodeBox } from "../src/client/geometry.ts";
import { DshRuntime } from "../src/host/runtime.ts";
import { checkDocument, documentSchema } from "../src/host/storage.ts";
import type { BoardColumn } from "../src/types.ts";

function legacyBoard() {
  return {
    ...newNode("board", 80, 80),
    columns: [
      { id: "todo", name: "待办", cards: [{ id: "a", text: "Acceptance criteria" }, { id: "b", text: "Review UI" }] },
      { id: "doing", name: "进行中", cards: [] },
      { id: "done", name: "完成", cards: [{ id: "done-card", text: "Collect inputs" }] },
    ] satisfies BoardColumn[],
  };
}

test("legacy boards parse as authored and infer semantic columns and completion when read", () => {
  const doc = emptyDocument();
  const board = legacyBoard();
  doc.nodes = [board];
  const old = documentSchema.parse(doc).nodes[0];
  assert.deepEqual(old.columns, board.columns);
  assert.equal(old.boardSettings, undefined);
  const columns = normalizeBoardColumns(old.columns);
  assert.deepEqual(columns.map((column) => column.role), ["todo", "doing", "done"]);
  assert.equal(boardColumnColor(columns[2]), "green");
  assert.equal(isBoardCardDone(columns[2].cards[0], columns[2]), true);
  assert.equal(old.columns?.[2].role, undefined);
  assert.deepEqual(boardProgress(columns), { total: 3, done: 1, doing: 0, pending: 2, percent: 33, next: columns[0].cards[0] });
  assert.equal(normalizeBoardColumns([{ id: "custom", name: "完成", role: "custom", cards: [] }])[0].role, "custom");
});

test("reordering and moving preserve card identity and complete or reopen across Done", () => {
  const columns = normalizeBoardColumns(legacyBoard().columns);
  assert.equal(moveBoardCard(columns, "a", "todo", "b"), columns);
  let next = moveBoardCard(columns, "b", "todo", "a", 1);
  assert.deepEqual(next[0].cards.map((card) => card.id), ["b", "a"]);
  assert.equal(next[0].cards[0].updatedAt, 1);
  next = moveBoardCard(next, "b", "doing");
  assert.equal(next[1].cards[0].id, "b");
  assert.equal(boardProgress(next).doing, 1);
  next = moveBoardCard(next, "b", "done", "done-card");
  assert.equal(next[2].cards[0].id, "b");
  assert.equal(next[2].cards[0].done, true);
  assert.equal(next[2].cards[0].previousColumnId, "doing");
  next = moveBoardCard(next, "b", "todo");
  assert.equal(next[0].cards[1].done, false);
  assert.equal(next[0].cards[1].previousColumnId, undefined);
  assert.deepEqual(columns[0].cards.map((card) => card.id), ["a", "b"]);
});

test("completion restores the original column, falls back after deletion and can stay in place", () => {
  const columns = normalizeBoardColumns(legacyBoard().columns);
  let next = moveBoardCard(columns, "a", "doing");
  next = toggleBoardCardDone(next, "a");
  assert.equal(findBoardCard(next, "a")?.column.id, "done");
  assert.equal(findBoardCard(next, "a")?.card.previousColumnId, "doing");
  assert.equal(findBoardCard(toggleBoardCardDone(next, "a"), "a")?.column.id, "doing");
  next = removeBoardColumn(next, "doing");
  assert.equal(findBoardCard(toggleBoardCardDone(next, "a"), "a")?.column.id, "todo");

  const stationary = toggleBoardCardDone(columns, "a", { autoMoveDone: false });
  assert.equal(findBoardCard(stationary, "a")?.column.id, "todo");
  assert.equal(findBoardCard(stationary, "a")?.card.done, true);
  const explicitOpen = toggleBoardCardDone(columns, "done-card", { autoMoveDone: false });
  assert.equal(boardProgress(explicitOpen).done, 0);
  assert.equal(findBoardCard(explicitOpen, "done-card")?.column.id, "done");
});

test("column changes protect tasks and preserve completion through migration", () => {
  const columns = normalizeBoardColumns(legacyBoard().columns);
  assert.equal(removeBoardColumn(columns, "todo"), columns);
  assert.equal(removeBoardColumn(columns, "todo", "todo"), columns);
  let next = updateBoardColumn(columns, "doing", (column) => ({ ...column, name: "Review", color: "teal", wipLimit: 1, collapsed: true }));
  next = addBoardCard(next, "doing", { id: "new", text: "New task", priority: "urgent" });
  assert.equal(boardProgress(next).next?.id, "new");
  next = setBoardColumnRole(next, "doing", "done");
  assert.equal(findBoardCard(next, "done-card")?.card.done, true);
  assert.equal(next.filter((column) => column.role === "done").length, 1);
  next = removeBoardColumn(next, "done", "todo");
  assert.equal(findBoardCard(next, "done-card")?.card.done, true);
  assert.equal(findBoardCard(next, "done-card")?.column.id, "todo");
  next = clearCompletedBoardCards(next, "todo");
  assert.equal(findBoardCard(next, "done-card"), undefined);
  assert.equal(findBoardCard(next, "a")?.column.id, "todo");
});

test("structured Markdown honors selection and open scopes and keeps plain cards compact", () => {
  const columns = updateBoardCard(normalizeBoardColumns(legacyBoard().columns), "a", (card) => ({
    ...card, priority: "high", tags: ["QA", "TDD"], dueDate: "2026-11-22",
    description: "First line\nSecond line",
    checklist: [{ id: "one", text: "Storage", done: true }, { id: "two", text: "Drag", done: false }],
  }));
  const selected = formatBoardMarkdown(columns, ["a"]);
  assert.equal(selected, [
    "## [待办]",
    "- [ ] [高] Acceptance criteria (标签: QA, TDD | 截止: 2026-11-22)",
    "  说明：First line",
    "  Second line",
    "  - [x] Storage",
    "  - [ ] Drag",
  ].join("\n"));
  assert.match(formatBoardMarkdown(columns, ["invalid"]), /- \[x\] Collect inputs/);
  assert.match(formatBoardMarkdown(columns, ["a"], "all"), /- \[ \] Review UI/);
  assert.doesNotMatch(formatBoardMarkdown(columns, ["done-card"], "open-only"), /Collect inputs/);
  const done = clearCompletedBoardCards(columns, "done");
  assert.doesNotMatch(formatBoardMarkdown(done), /## \[完成\]/);
  assert.equal(formatBoardMarkdown([columns[2]], undefined, "open-only"), "");
  const items = findBoardCard(columns, "a")!.card.checklist!;
  assert.equal(moveChecklistItem(items, "one", -1), items);
  assert.deepEqual(moveChecklistItem(items, "one", 1), [items[1], items[0]]);
});

test("Host schema preserves optional fields and rejects invalid new field values", () => {
  const doc = emptyDocument();
  const board = legacyBoard();
  const columns = updateBoardCard(normalizeBoardColumns(board.columns), "a", (card) => ({
    ...card, description: "Markdown", priority: "urgent", done: false, tags: ["QA"], dueDate: "2028-02-29",
    checklist: [{ id: "sub", text: "Validate", done: false }], previousColumnId: "doing", createdAt: 10, updatedAt: 13,
  }));
  doc.nodes = [{
    ...board, columns: updateBoardColumn(columns, "todo", (column) => ({ ...column, color: "violet", wipLimit: 2, collapsed: true })),
    boardSettings: { view: "list", showCompleted: false, autoMoveDone: false, refScope: "open-only" },
  }];
  assert.deepEqual(documentSchema.parse(doc), doc);
  columns[0].cards[0].dueDate = "2027-02-29";
  assert.equal(documentSchema.safeParse(doc).success, false);
});

test("single-card references resolve current columns, titles and content by stable ID", async () => {
  const board = legacyBoard();
  const agent = newNode("agent", 680, 100);
  const edge = { ...newEdge(board.id, agent.id, "reference"), sourceItemKey: "a" };
  const whole = newEdge(board.id, agent.id, "reference");
  const doc = { ...emptyDocument(), nodes: [board, agent], edges: [edge, whole] };
  board.selectedItems = ["b"];
  const records = new Map();
  const runtime = new DshRuntime({} as never, (id) => doc.nodes.find((node) => node.id === id), {} as never,
    new Map(), { get: key => records.get(key), entries: () => records.entries(), put: async (key, value) => { records.set(key, value); } });
  const captured = await runtime.reference(board, edge);
  assert.equal(captured.referenceKind, "board-card");
  assert.doesNotMatch(captured.text, /Review UI/);
  assert.match((await runtime.reference(board, whole)).text, /Review UI/);
  const moved = moveBoardCard(normalizeBoardColumns(board.columns), "a", "doing");
  doc.nodes[0] = { ...board, columns: updateBoardCard(moved, "a", (card) => ({
    ...card, text: "Updated Acceptance", checklist: [{ id: "sub", text: "Latest checklist", done: false }],
  })) };
  const updated = await runtime.reference(board, edge);
  const preview = buildLocalEdgePayloadFallback(doc, null, edge);
  assert.equal(preview.content, updated.text);
  assert.equal(preview.sourceTitle, "Updated Acceptance");
  assert.equal(referenceTitle(doc.nodes[0], edge), updated.title);
  assert.match(updated.text, /进行中[\s\S]+Latest checklist/);
  assert.notEqual(updated.version, captured.version);
  doc.nodes[0].selectedItems = ["a", "b"];
  doc.nodes[0].columns = removeBoardCard(doc.nodes[0].columns!, "a");
  const missing = await runtime.reference(board, edge);
  assert.equal(missing.missing, true);
  assert.doesNotMatch(missing.text, /Review UI/);
  checkDocument(doc);
  assert.deepEqual(doc.edges, [whole]);
  assert.deepEqual(doc.nodes[0].selectedItems, ["b"]);
  assert.equal(resolveBoardReference(doc.nodes[0]).text, "## [待办]\n- [ ] Review UI");
});

test("board geometry preserves narrow saved sizes and uses the new expanded and compact defaults", () => {
  const board = newNode("board", 12, 12);
  assert.deepEqual([board.width, board.height], [580, 380]);
  assert.deepEqual(nodeBox({ ...board, width: 340, height: 260 }), { x: 12, y: 12, w: 340, h: 280, compact: false });
  assert.deepEqual(nodeBox(board, true), { x: 12, y: 12, w: 280, h: 112, compact: true });
});
