import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { createFanoutPair, reconcileFanout } from "../src/core/fanout.ts";
import { stampGeneratedBatch } from "../src/core/generation.ts";
import { receiveGeneration, reconcileLaneChanges } from "../src/client/generationHistory.ts";
import { duplicateSubgraph } from "../src/client/subgraphs.ts";
import { captureTemplate, instantiateTemplate, synchronizeTemplate } from "../src/client/templates.ts";
import type { FlowspaceDocument } from "../src/types.ts";

function addBatch(doc: FlowspaceDocument, fan: string, values: string[]) {
  const nodes = new Set(doc.nodes.map(node => node.id));
  const edges = new Set(doc.edges.map(edge => edge.id));
  reconcileFanout(doc, fan, values.map(value => ({ key: value, value })));
  stampGeneratedBatch(doc, nodes, edges);
}

test("coalesced Host batches each undo once and acknowledged removals are retained", () => {
  const draft = emptyDocument(), { fan } = createFanoutPair(draft, 0, 0);
  const host = structuredClone(draft);
  addBatch(host, fan.id, ["a", "b"]);
  addBatch(host, fan.id, ["a", "b", "c"]);
  draft.title = "Local edit during delivery";
  const received = receiveGeneration(draft, host);
  assert.equal(received.document.title, draft.title);
  assert.deepEqual(received.history.map(d => d.nodes.filter(n => n.generatedBy).length), [0, 2]);
  assert.equal(received.document.nodes.filter(n => n.generatedBy).length, 3);
  assert.equal(received.document.edges.filter(e => e.generatedBy).length, 6);
  const undone = { ...received.history[1], generationRevision: host.generationRevision };
  assert.equal(receiveGeneration(undone, host).document, undone);
  assert.equal(reconcileLaneChanges(host, undone, host), undone);
});

test("a static reconciliation preserves newer edits, while removing vanished lane endpoints", () => {
  const prior = emptyDocument(), { fan } = createFanoutPair(prior, 0, 0);
  const accepted = structuredClone(prior);
  reconcileFanout(accepted, fan.id, [{ key: "a", value: "a" }, { key: "b", value: "b" }]);
  const local = structuredClone(prior);
  local.title = "Local title";
  const next = reconcileLaneChanges(prior, local, accepted);
  assert.equal(next.title, local.title);
  assert.equal(next.nodes.filter(n => n.generatedBy).length, 2);
  const updated = structuredClone(accepted);
  reconcileFanout(updated, fan.id, [{ key: "b", value: "b" }]);
  const merged = reconcileLaneChanges(accepted, next, updated);
  assert.deepEqual(merged.nodes.filter(n => n.generatedBy).map(n => n.itemKey), ["b"]);
  const present = new Set(merged.nodes.map(n => n.id));
  assert.ok(merged.edges.every(edge => present.has(edge.source) && present.has(edge.target)));
  assert.equal(receiveGeneration(local, accepted).history.length, 0);
});

test("an echoed manual group toggle cannot undo a newer opposite toggle", () => {
  const before = emptyDocument(), { group, fan } = createFanoutPair(before, 0, 0);
  const entries = Array.from({ length: 11 }, (_, i) => ({ key: String(i), value: i }));
  reconcileFanout(before, fan.id, entries);
  const submitted = structuredClone(before);
  submitted.nodes.find(node => node.id === group.id)!.collapsed = false;
  const latest = structuredClone(submitted);
  latest.nodes.find(node => node.id === group.id)!.collapsed = true;
  assert.ok(reconcileLaneChanges(before, latest, submitted).nodes.find(node => node.id === group.id)!.collapsed);
  const ten = structuredClone(submitted);
  reconcileFanout(ten, fan.id, entries.slice(0, 10));
  const eleven = structuredClone(ten);
  reconcileFanout(eleven, fan.id, entries);
  assert.ok(reconcileLaneChanges(ten, ten, eleven).nodes.find(node => node.id === group.id)!.collapsed);
});

test("a duplicated bracket retains both external wires and independently remaps its mother graph", () => {
  const doc = emptyDocument(), source = newNode("agent", 0, 0), target = newNode("agent", 1600, 0);
  doc.nodes.push(source, target);
  const { group, fan, merge, master } = createFanoutPair(doc, 370, 0, { sourceId: source.id });
  doc.edges.push({ ...newEdge(merge.id, target.id, "continuation"), sourcePort: "out" });
  reconcileFanout(doc, fan.id, [{ key: "a", value: "a" }]);
  const copy = duplicateSubgraph(doc, [fan.id]);
  const paired = copy.nodes.find(n => n.fanout)!;
  const copiedFan = paired.fanout!.fanId, copiedMerge = paired.fanout!.mergeId;
  assert.notEqual(paired.id, group.id);
  assert.notEqual(copiedFan, fan.id);
  assert.notEqual(copiedMerge, merge.id);
  assert.equal(copy.nodes.some(n => n.masterOf === copiedFan && n.id !== master.id), true);
  assert.equal(copy.nodes.some(n => n.generatedBy), false);
  assert.ok(copy.edges.some(e => e.source === source.id && e.target === copiedFan));
  assert.ok(copy.edges.some(e => e.source === copiedMerge && e.target === target.id));
});

test("template capture, instantiate and sync preserve root and nested pairs, alongside existing external wires", () => {
  const doc = emptyDocument(), outer = newNode("group", 0, 0);
  doc.nodes.push(outer);
  const { group, fan, merge, master } = createFanoutPair(doc, 300, 120, { parentId: outer.id });
  fan.templateSlotId = "fan-slot"; merge.templateSlotId = "merge-slot"; master.templateSlotId = "master-slot";
  reconcileFanout(doc, fan.id, [{ key: "a", value: "a" }, { key: "b", value: "b" }]);
  const saved = captureTemplate(doc, group.id, "Checklist", "");
  assert.deepEqual(saved.fanout, { fanId: "fan-slot", mergeId: "merge-slot" });
  assert.equal(saved.nodes.length, 3);
  assert.equal(saved.nodes.find(n => n.id === "master-slot")?.masterOf, "fan-slot");
  assert.ok(saved.h < group.height);
  const instance = instantiateTemplate(doc, saved, 2200, 200, "New checklist");
  const instanceFan = instance.fanout!.fanId, instanceMerge = instance.fanout!.mergeId;
  assert.ok(doc.nodes.some(n => n.masterOf === instanceFan && n.parentId === instance.id));
  assert.ok(instance.ports?.some(p => p.nodes.includes(instanceMerge)));
  const external = newEdge(instanceMerge, master.id, "continuation");
  doc.edges.push(external);
  synchronizeTemplate(doc, instance.id, { ...saved, revision: 2 }, true);
  assert.deepEqual(instance.fanout, { fanId: instanceFan, mergeId: instanceMerge });
  assert.ok(doc.edges.some(e => e.id === external.id));
  const nested = captureTemplate(doc, outer.id, "Nested checklist", "");
  const second = instantiateTemplate(doc, nested, 3200, 200, "Nested");
  const nestedPair = doc.nodes.find(n => n.parentId === second.id && n.fanout)!;
  assert.ok(doc.nodes.some(n => n.parentId === nestedPair.id && n.masterOf === nestedPair.fanout!.fanId));
});
