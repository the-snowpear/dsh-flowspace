import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalEdgePayloadFallback } from "../src/client/PayloadPeekPopover.tsx";
import { contentList } from "../src/core/content.ts";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import type { ContextSnapshot } from "../src/types.ts";

test("payload inspector shows the retained count for the selected board scope", () => {
  const doc = emptyDocument();
  const board = newNode("board", 0, 0);
  board.columns = [{ id: "queue", name: "Queue", cards: ["one", "two", "three"].map(text => ({ id: text, text })) }];
  const agent = newNode("agent", 400, 0);
  const edge = newEdge(board.id, agent.id, "reference");
  doc.nodes = [board, agent];
  doc.settings.listLimit = 2;
  const preview = buildLocalEdgePayloadFallback(doc, null, edge);
  assert.equal(preview.itemCount, 2);
  assert.equal(preview.originalCount, 3);
  assert.doesNotMatch(preview.content, /three/);
  board.selectedItems = ["three"];
  const selected = buildLocalEdgePayloadFallback(doc, null, edge);
  assert.equal(selected.itemCount, 1);
  assert.equal(selected.originalCount, undefined);
});

test("wire and step previews prefer the frozen payload even after the canvas source changes", () => {
  const doc = emptyDocument();
  const source = newNode("note", 0, 0);
  source.text = "Edited after capture";
  const agent = newNode("agent", 400, 0);
  const edge = { ...newEdge(source.id, agent.id, "reference"), snapshotContent: contentList([null, ["a"], "b"], 2) };
  doc.nodes = [source, agent];
  const frozen = buildLocalEdgePayloadFallback(doc, null, edge);
  assert.equal(frozen.content, '[null,["a"]]');
  assert.deepEqual([frozen.itemCount, frozen.originalCount], [2, 3]);
  const captured: ContextSnapshot = { kind: "text", id: "capture", title: source.title,
    text: "", sourceNodeId: source.id, capturedAt: 0 };
  const older = buildLocalEdgePayloadFallback(doc, null, edge, undefined, captured);
  assert.equal(older.content, "");
  assert.equal(older.itemCount, undefined);
  assert.equal(older.originalCount, undefined);
  const files = buildLocalEdgePayloadFallback(doc, null, { ...edge, snapshotText: "",
    snapshotContent: { dataType: "file", value: ["a.md", "b.md"], originalCount: 5 } });
  assert.equal(files.content, "");
  assert.deepEqual([files.itemCount, files.originalCount], [2, 5]);
});
