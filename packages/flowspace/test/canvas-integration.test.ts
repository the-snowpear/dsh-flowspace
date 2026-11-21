import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDocument,
  newEdge,
  newFlowNode,
  newNode,
  sanitizeDocumentForWire,
} from "../src/core/document.ts";
import {
  COMFORT_ZOOM,
  LOD_ZOOM,
  alignedWireDropPosition,
  comfortableFit,
  endpoint,
  groupBox,
  nodeBox,
  portY,
} from "../src/client/geometry.ts";
import { localizedStarterDocument } from "../src/client/templates.ts";
import {
  pasteSubgraphClipboard,
  serializeSubgraphClipboard,
  toggleNodesParticipation,
} from "../src/client/subgraphs.ts";
import { checkDocument, documentSchema } from "../src/host/storage.ts";
import type { FlowspaceDocument } from "../src/types.ts";

const CJK = /[㐀-鿿豈-﫿]/;

function starterStrings(doc: FlowspaceDocument): string[] {
  return doc.nodes.flatMap((n) => [
    n.title,
    n.task,
    n.draft,
    n.text,
    ...(n.ports ?? []).map((p) => p.name),
  ]);
}

test("Wave 2B: localized starter is pure per language and fits at a readable zoom", () => {
  const en = localizedStarterDocument("en");
  const zh = localizedStarterDocument("zh");
  for (const s of starterStrings(en)) {
    assert.equal(CJK.test(s ?? ""), false, `English starter leaked CJK: ${s}`);
  }
  assert.ok(
    starterStrings(zh).some((s) => CJK.test(s ?? "")),
    "Chinese starter is localized",
  );
  documentSchema.parse(sanitizeDocumentForWire(en));
  checkDocument(sanitizeDocumentForWire(en));

  const group = en.nodes.find((n) => n.kind === "group")!;
  const box = groupBox(group, 2, { doc: en });
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [960, 640],
    [760, 520],
    [520, 400],
  ]) {
    const view = comfortableFit({ width, height }, [box]);
    assert.ok(
      view.zoom >= COMFORT_ZOOM.min && view.zoom <= COMFORT_ZOOM.max,
      `zoom ${view.zoom} at ${width}x${height} stays within 82%–95%`,
    );
    assert.ok(view.zoom > LOD_ZOOM, "never folds into LOD cards");
  }
});

test("Wave 2B: wire-drop placement keeps a horizontal continuation at 0px vertical offset", () => {
  const source = newNode("agent", 100, 100, "Source");
  const sourceBox = nodeBox(source, false, true);
  const sourcePortY = sourceBox.y + portY(source, "continuation", false);
  const drop = { x: sourceBox.x + sourceBox.w + 140, y: sourcePortY + 20 };
  const pos = alignedWireDropPosition(sourceBox, "continuation", drop, "agent", {
    direction: "out",
    sourceKind: "agent",
    targetCompact: false,
  });
  const target = { ...newNode("agent", pos.x, pos.y, "Target") };
  assert.equal(pos.y + portY(target, "continuation", false), sourcePortY);
  assert.ok(pos.x >= sourceBox.x + sourceBox.w + 56, "lands right of source");
});

test("merge item and list sockets stay individually selectable in both levels of detail", () => {
  const doc = emptyDocument();
  const merge = newFlowNode("flowspace/merge-sort", 250, 300);
  doc.nodes.push(merge);
  for (const compact of [false, true]) {
    const ordinary = endpoint(doc, merge.id, "continuation", "in", compact, undefined, undefined, "in");
    const list = endpoint(doc, merge.id, "continuation", "in", compact, undefined, undefined, "list");
    assert.equal(ordinary.x, list.x);
    assert.ok(list.y - ordinary.y >= 28);
    assert.equal(list.y - list.box.y, portY(merge, "continuation", compact, "list", 0, list.box.h, "in"));
    const fan = newFlowNode("flowspace/fanout", 0, 0);
    assert.notEqual(portY(fan, "reference", compact, "in", 0, undefined, "in"),
      portY(fan, "continuation", compact, "in", 0, undefined, "in"));
  }
});

test("Wave 2B: subgraph paste and fork drafts stay runtime-free and Host-valid", () => {
  const doc = emptyDocument();
  const bound = {
    ...newNode("agent", 80, 120, "Bound"),
    sessionId: "session-1",
    task: "analyze",
  };
  const next = newNode("agent", 480, 120, "Next");
  doc.nodes.push(bound, next);
  doc.edges.push(newEdge(bound.id, next.id, "continuation"));

  const clip = serializeSubgraphClipboard(doc, [bound.id, next.id]);
  assert.ok(clip);
  const res = pasteSubgraphClipboard(doc, clip, { x: 80, y: 700 });
  assert.equal(res.createdNodeIds.length, 2);
  for (const id of res.createdNodeIds) {
    const pasted = doc.nodes.find((n) => n.id === id)!;
    assert.equal(pasted.sessionId, undefined, "paste strips the live Session");
  }
  assert.equal(res.edges.length, 1, "internal continuation is cloned");
  assert.ok(
    res.edges.every((e) => res.createdNodeIds.includes(e.source)),
    "cloned edges are re-pointed at the pasted nodes",
  );

  /* Fork Hypothesis shape created by the canvas: draft + single `fork` continuation */
  const fork = newNode("agent", 480, 520, "Bound ⎇ 1");
  doc.nodes.push(fork);
  doc.edges.push({
    ...newEdge(bound.id, fork.id, "continuation"),
    mode: "fork",
    trigger: "off",
  });

  /* Mute/Bypass toggles cycle back to global */
  assert.equal(toggleNodesParticipation(doc.nodes, [next.id], "bypassed"), "bypassed");
  assert.equal(toggleNodesParticipation(doc.nodes, [next.id], "bypassed"), "global");
  assert.equal(toggleNodesParticipation(doc.nodes, [next.id], "paused"), "paused");

  const wire = sanitizeDocumentForWire(doc);
  documentSchema.parse(wire);
  checkDocument(wire);
});
