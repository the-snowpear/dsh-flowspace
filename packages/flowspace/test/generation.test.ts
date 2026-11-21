import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { mergePendingGeneration, stampGeneratedBatch } from "../src/core/generation.ts";

test("a pending save adopts only unseen lane elements while an acknowledged undo removes the whole batch", () => {
  const base = emptyDocument();
  const fan = newFlowNode("flowspace/fanout", 0, 0);
  base.nodes = [fan];
  const host = structuredClone(base);
  const lane = { ...newNode("agent", 350, 120), generatedBy: fan.id };
  host.nodes.push(lane);
  host.edges.push({ ...newEdge(fan.id, lane.id, "continuation"), generatedBy: fan.id });
  assert.equal(stampGeneratedBatch(host, new Set([fan.id]), new Set()), true);
  const pendingEdit = { ...base, title: "My edit" };
  const accepted = mergePendingGeneration(pendingEdit, host);
  assert.equal(accepted.title, "My edit");
  assert.equal(accepted.generationRevision, 1);
  assert.equal(accepted.nodes[1].generatedRevision, 1);
  assert.equal(accepted.edges[0].generatedRevision, 1);
  const undo = { ...pendingEdit, generationRevision: accepted.generationRevision };
  assert.equal(mergePendingGeneration(undo, host), undo);
  assert.equal(mergePendingGeneration({ ...base, nodes: [] }, host).nodes.length, 0);
  assert.equal(stampGeneratedBatch(host, new Set(host.nodes.map(n => n.id)), new Set(host.edges.map(e => e.id))), false);
  assert.equal(host.generationRevision, 1);
});
