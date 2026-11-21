import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { appendMasterStep, canInsertFanout, cleanRetiredLanes, createFanoutPair, fanoutPair, markFanoutOverrides,
  reconcileFanout, resumeMasterSync, staticFanoutContent, syncExistingFanout } from "../src/core/fanout.ts";
import { inferGroupPorts } from "../src/client/geometry.ts";
import { contentList } from "../src/core/content.ts";
import { checkDocument, documentSchema } from "../src/host/storage.ts";

test("pair insertion redirects only the specified downstream wire and keeps its settings", () => {
  const doc = emptyDocument();
  const [source, a, b] = [0, 1, 2].map(i => newNode("agent", i * 400, 0));
  const selected = { ...newEdge(source.id, a.id, "continuation"), trigger: "confirm" as const,
    waypoints: [{ x: 40, y: 40 }], logic: { delayMs: 400 } };
  const other = newEdge(source.id, b.id, "continuation");
  doc.nodes = [source, a, b]; doc.edges = [selected, other];
  const pair = createFanoutPair(doc, 80, 500, { edgeId: selected.id });
  assert.equal(selected.source, pair.merge.id);
  assert.equal(selected.target, a.id);
  assert.equal(selected.trigger, "confirm");
  assert.deepEqual(selected.logic, { delayMs: 400 });
  assert.deepEqual(selected.waypoints, [{ x: 40, y: 40 }]);
  assert.equal(other.source, source.id);
  assert.equal(pair.group.ports!.find(p => p.kind === "reference")?.nodes[0], pair.fan.id);
  const appended = createFanoutPair(doc, 1000, 900, { sourceId: source.id });
  assert.equal(other.source, source.id);
  assert.ok(doc.edges.some(e => e.source === source.id && e.target === appended.fan.id));
  checkDocument(documentSchema.parse(doc));
});

test("ten static lanes track source order, stable identities, prior Sessions and the 11th-row fold", () => {
  const doc = emptyDocument();
  const note = newNode("note", 0, 0);
  doc.nodes.push(note);
  const { fan, group } = createFanoutPair(doc, 350, 0, { sourceId: note.id });
  const labels = Array.from({ length: 10 }, (_, i) => `Entry ${i}`);
  note.text = labels.join("\n");
  const sync = () => reconcileFanout(doc, fan.id, staticFanoutContent(doc, fan.id)!.items!);
  assert.ok(sync());
  const rows = () => doc.nodes.filter(n => n.generatedBy === fan.id);
  assert.equal(rows().length, 10);
  assert.equal(group.collapsed, false);
  const before = new Map(rows().map(node => [node.itemTitle!, node.id]));
  rows()[0].sessionId = "previous-session";
  note.text = [...labels.slice(1).reverse(), "New 1", "New 2"].join("\n");
  sync();
  assert.equal(group.collapsed, true);
  assert.deepEqual(rows().filter(row => !row.removed).map(row => row.itemTitle), note.text.split("\n"));
  assert.equal(rows()[0].id, before.get("Entry 9"));
  assert.equal(rows().at(-1)?.removed, true);
  assert.equal(rows().at(-1)?.sessionId, "previous-session");
  group.collapsed = false;
  assert.equal(sync(), false);
  assert.equal(group.collapsed, false);
  note.text = "Entry 0\nNew 2";
  sync();
  assert.deepEqual(rows().map(row => row.itemTitle), ["Entry 0", "New 2"]);
  assert.equal(rows()[0].id, before.get("Entry 0"));
  assert.equal(rows()[0].sessionId, "previous-session");
  assert.equal(rows()[0].removed, undefined);
  const persisted = documentSchema.parse(JSON.parse(JSON.stringify(doc)));
  checkDocument(persisted);
  assert.equal(reconcileFanout(persisted, fan.id, staticFanoutContent(persisted, fan.id)!.items!), false);
});

test("static card identity and file selection survive content edits while dynamic Agents await output", () => {
  const doc = emptyDocument();
  const board = newNode("board", 0, 0);
  board.columns = [{ id: "todo", name: "Todo", cards: [{ id: "a", text: "Before" }, { id: "b", text: "Other" }] }];
  doc.nodes.push(board);
  const { fan } = createFanoutPair(doc, 360, 0, { sourceId: board.id });
  let list = staticFanoutContent(doc, fan.id)!;
  assert.deepEqual(list.items!.map(item => item.key), ["a", "b"]);
  board.columns[0].cards[0].text = "After";
  doc.settings.listLimit = 1;
  list = staticFanoutContent(doc, fan.id)!;
  assert.deepEqual(list.items!.map(item => item.key), ["a"]);
  assert.equal(list.originalCount, 2);
  const file = { ...newNode("file", 0, 0), items: ["a.txt", "b.txt"], selectedItems: ["b.txt"] };
  doc.nodes.push(file);
  const edge = doc.edges.find(e => e.target === fan.id)!;
  edge.source = file.id;
  assert.deepEqual(staticFanoutContent(doc, fan.id)?.items, [{ key: "b.txt", value: "b.txt" }]);
  file.selectedItems = [];
  assert.deepEqual(staticFanoutContent(doc, fan.id)?.items, []);
  const agent = newNode("agent", 0, 0);
  doc.nodes.push(agent); edge.source = agent.id; edge.kind = "continuation"; edge.trigger = "auto";
  assert.equal(staticFanoutContent(doc, fan.id), undefined);
});

test("mother edits sync slots and distinct named wires, preserve references and respect per-lane overrides", () => {
  const doc = emptyDocument();
  const { fan, master, group, merge } = createFanoutPair(doc, 0, 0);
  const judge = { ...newFlowNode("flowspace/condition", 600, 100), parentId: group.id };
  const note = newNode("note", -300, 0);
  doc.nodes.push(judge, note);
  const tail = doc.edges.find(e => e.target === merge.id)!;
  tail.target = judge.id; tail.targetPort = "in";
  doc.edges.push(...["pass", "else"].map(port => ({ ...newEdge(judge.id, merge.id, "continuation"), sourcePort: port, targetPort: "in" })),
    { ...newEdge(note.id, master.id, "reference"), always: true });
  const items = contentList(["a", "b"]).items!;
  const frozen = structuredClone(doc);
  reconcileFanout(doc, fan.id, items);
  reconcileFanout(frozen, fan.id, items);
  assert.deepEqual(doc.nodes.map(node => node.id), frozen.nodes.map(node => node.id));
  assert.deepEqual(doc.edges.map(edge => edge.id), frozen.edges.map(edge => edge.id));
  assert.equal(judge.masterOf, fan.id);
  const firstWires = doc.edges.filter(edge => edge.itemKey === items[0].key);
  assert.deepEqual(firstWires.filter(edge => edge.target === merge.id).map(edge => edge.sourcePort), ["pass", "else"]);
  assert.ok(firstWires.some(edge => edge.source === note.id && edge.kind === "reference"));
  const prior = structuredClone(doc);
  const first = doc.nodes.find(node => node.masterNodeId === master.id && node.itemKey === items[0].key)!;
  first.task = "personal override";
  markFanoutOverrides(prior, doc);
  master.task = "new mother";
  syncExistingFanout(doc, fan.id);
  const copies = doc.nodes.filter(node => node.masterNodeId === master.id);
  assert.deepEqual(copies.map(node => node.task), ["personal override", "new mother"]);
  assert.ok(doc.nodes.filter(node => node.itemKey === items[0].key).every(node => node.overridden));
  const second = copies[1];
  second.sessionId = "bound"; fan.config!.followMaster = false;
  master.task = "another amendment";
  syncExistingFanout(doc, fan.id);
  assert.equal(doc.nodes.find(node => node.id === second.id)?.task, "new mother");
  assert.equal(doc.nodes.find(node => node.id === second.id)?.sessionId, "bound");
  assert.ok(fanoutPair(doc, fan.id));
  checkDocument(documentSchema.parse(doc));
});

test("a new custom step and wire stay with the one edited lane", () => {
  const doc = emptyDocument();
  const { group, fan, master } = createFanoutPair(doc, 0, 0);
  const items = contentList(["one", "two"]).items!;
  reconcileFanout(doc, fan.id, items);
  const previous = structuredClone(doc);
  const first = doc.nodes.find(node => node.itemKey === items[0].key)!;
  const custom = { ...newNode("agent", first.x + 360, first.y), parentId: group.id, task: "additional review" };
  const wire = newEdge(first.id, custom.id, "continuation");
  doc.nodes.push(custom); doc.edges.push(wire);
  markFanoutOverrides(previous, doc);
  master.task = "changed";
  reconcileFanout(doc, fan.id, items);
  const own = doc.nodes.find(node => node.id === custom.id)!;
  assert.equal(own.itemKey, items[0].key);
  assert.equal(own.overridden, true);
  assert.equal(doc.edges.find(edge => edge.id === wire.id)!.generatedBy, fan.id);
  assert.deepEqual(doc.nodes.filter(node => node.masterNodeId === master.id).map(node => node.task),
    [first.task, "changed"]);
  checkDocument(documentSchema.parse(doc));
});

test("fan groups expose their actual bracket ports when collapsed, including sorted results", () => {
  const doc = emptyDocument();
  const { group, fan, merge, master } = createFanoutPair(doc, 0, 0);
  group.collapsed = true;
  const ports = () => inferGroupPorts(doc, group).map(p => [p.kind, p.direction, p.portId, p.nodes[0]]);
  assert.deepEqual(ports(), [["reference", "in", "in", fan.id], ["continuation", "in", "in", fan.id],
    ["continuation", "out", "out", merge.id]]);
  merge.config!.sortMode = "code";
  const sorted = ports();
  assert.deepEqual(sorted.filter(p => p[1] === "out").map(p => p[2]), ["pass", "fail", "error"]);
  assert.ok(sorted.every(p => p[3] !== master.id));
});

test("insertion is offered only when both replacement links are compatible", () => {
  const doc = emptyDocument();
  const [a, b] = [0, 400].map(x => newNode("agent", x, 0));
  const judge = newFlowNode("flowspace/condition", 0, 400);
  doc.nodes = [a, b, judge];
  const wire = newEdge(a.id, b.id, "continuation");
  assert.equal(canInsertFanout(doc, wire), true);
  assert.equal(canInsertFanout(doc, { ...wire, mode: "fork" }), false);
  assert.equal(canInsertFanout(doc, { ...wire, kind: "reference" }), false);
  assert.equal(canInsertFanout(doc, { ...wire, source: judge.id, sourcePort: "pass" }), false);
});

test("mother extension, explicit resume and retired-lane cleanup preserve authored fields and native sessions", () => {
  const doc = emptyDocument();
  const { fan, merge, master } = createFanoutPair(doc, 0, 0);
  const items = contentList(["one", "two"]).items!;
  reconcileFanout(doc, fan.id, items);
  const edge = doc.edges.find(e => e.source === master.id)!;
  const beforeExtension = structuredClone(doc);
  const newMaster = appendMasterStep(doc, fan.id)!;
  assert.equal(edge.target, newMaster.id);
  assert.ok(doc.edges.some(e => e.source === newMaster.id && e.target === merge.id));
  const { key } = items[0];
  reconcileFanout(doc, fan.id, items);
  markFanoutOverrides(doc, beforeExtension);
  assert.ok(beforeExtension.nodes.filter(node => node.generatedBy).every(node => !node.overridden));
  const lane = doc.nodes.find(n => n.itemKey === key && n.masterNodeId === master.id)!;
  lane.task = "override"; lane.overridden = true; lane.sessionId = "native";
  const before = structuredClone(doc);
  resumeMasterSync(doc, fan.id, key);
  markFanoutOverrides(before, doc);
  assert.ok(doc.nodes.filter(n => n.itemKey === key).every(n => !n.overridden));
  assert.equal(doc.nodes.find(n => n.id === lane.id)?.task, master.task);
  assert.equal(doc.nodes.find(n => n.id === lane.id)?.sessionId, "native");
  reconcileFanout(doc, fan.id, items.slice(1));
  assert.ok(doc.nodes.filter(n => n.itemKey === key).every(n => n.removed));
  cleanRetiredLanes(doc, fan.id);
  assert.equal(doc.nodes.some(n => n.itemKey === key), false);
  assert.equal(doc.edges.some(e => e.target === lane.id || e.source === lane.id), false);
  checkDocument(documentSchema.parse(doc));
});
