import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMuseumDocument, initializeMuseum } from "../../../scripts/museum.ts";
import { buildSnapshot, contentFlowTemplateId } from "../src/client/templates.ts";
import { groupDescendants } from "../src/core/document.ts";
import type { FlowspaceDocument } from "../src/types.ts";

test("an existing museum receives the content template once and keeps its saved exhibits and snapshot", async t => {
  const home = await mkdtemp(join(tmpdir(), "flowspace-p2-museum-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const doc = createMuseumDocument(join(home, "collection"), "museum");
  const exhibit = doc.nodes.find(node => node.templateId === contentFlowTemplateId)!;
  const removed = new Set([exhibit.id, ...groupDescendants(doc, exhibit.id)]);
  doc.nodes = doc.nodes.filter(node => !removed.has(node.id));
  doc.edges = doc.edges.filter(edge => !removed.has(edge.source) && !removed.has(edge.target));
  doc.nodes[0].title = "我的入口";
  doc.snapshots = [buildSnapshot(doc, null, "我的布展")];
  const before = structuredClone(doc);
  const saved: FlowspaceDocument[] = [];
  const ctx = {
    workspaceRegistry: { create: async () => ({ id: "museum" }) },
    flowspace: { snapshot: () => ({ document: structuredClone(saved.at(-1) ?? doc), runs: [] }),
      save: async (next: FlowspaceDocument) => { saved.push(next); return next; } },
  } as unknown as Parameters<typeof initializeMuseum>[0]["ctx"];
  for (const marker of ["museum-initialized", "museum-control-flow-initialized"]) await writeFile(join(home, marker), "");
  await initializeMuseum({ home, workspace: home, ctx });
  await initializeMuseum({ home, workspace: home, ctx });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].nodes.filter(node => node.templateId === contentFlowTemplateId).length, 1);
  assert.deepEqual(saved[0].nodes.slice(0, before.nodes.length), before.nodes);
  assert.deepEqual(saved[0].edges.slice(0, before.edges.length), before.edges);
  assert.deepEqual(saved[0].snapshots, before.snapshots);
});
