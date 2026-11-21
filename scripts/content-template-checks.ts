import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { builtinTemplates, contentFlowTemplateId, instantiateTemplate } from "../packages/flowspace/src/client/templates.ts";
import { contentList } from "../packages/flowspace/src/core/content.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../packages/flowspace/src/core/document.ts";
import { createFanoutPair } from "../packages/flowspace/src/core/fanout.ts";
import type { FlowspaceRun } from "../packages/flowspace/src/types.ts";
import type { boot } from "./environment.mjs";

type Host = Awaited<ReturnType<typeof boot>>;
interface TemplateFixture {
  runId: string;
  noteId: string;
  input: string;
  keys: string[];
  guideId: string;
  guide: string;
  workers: { sessionId: string; requestId: string }[];
}

export async function exerciseContentTemplate({ ctx, workspace }: Host): Promise<TemplateFixture> {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  try {
    const builtin = builtinTemplates("zh").find(tpl => tpl.id === contentFlowTemplateId)!;
    const imported = await service.importWorkflow({ template: JSON.parse(JSON.stringify(builtin)) });
    assert.equal(imported.kind, "imported");
    const template = imported.document.templates.at(-1)!;
    const doc = emptyDocument();
    const group = instantiateTemplate(doc, template, 0, 0, "逐件撰写展签", { cwd: workspace });
    const deployed = await service.save(doc);
    const slot = (name: string) => deployed.nodes.find(node => node.templateSlotId === "slot-content-" + name)!;
    const note = slot("note"), fan = slot("fan"), guide = slot("result");
    const keys = contentList(note.text.split("\n")).items!.map(item => item.key);
    const drafts = deployed.nodes.filter(node => node.generatedBy === fan.id && node.kind === "agent");
    assert.deepEqual(drafts.map(node => node.itemKey), keys, "pure upstream splitting projects static lanes before launch");
    assert.ok(drafts.every(node => !node.sessionId));
    const { id } = await service.start({ kind: "group", nodeIds: [group.id] });
    const edit = service.snapshot().document;
    edit.nodes.find(node => node.id === note.id)!.text += "\n新藏品";
    await service.save(edit);
    let run: FlowspaceRun;
    const timeout = AbortSignal.timeout(90_000);
    do {
      run = service.snapshot().runs.find(run => run.id === id)!;
      if (run.state === "completed") break;
      assert.notEqual(run.state, "error", JSON.stringify([run.notes, run.steps.map(step => step.error)]));
      await delay(80, undefined, { signal: timeout });
    } while (true);
    const lanes = run.fanouts![0].lanes;
    assert.deepEqual(lanes.map(lane => lane.item.key), keys);
    const guideText = lanes.map((lane, index) => `${index + 1}. ${lane.result!.text}`).join("\n");
    assert.equal(run.steps.find(step => step.nodeId === guide.id)?.outputContent?.value, guideText);
    const workers = run.steps.filter(step => step.sessionId).map(step => ({ sessionId: step.sessionId!, requestId: step.requestId }));
    assert.equal(new Set(workers.map(step => step.sessionId)).size, keys.length);
    return { runId: id, noteId: note.id, input: note.text, keys, guideId: guide.id, guide: guideText, workers };
  } finally {
    await service.save(previous);
  }
}

export async function checkContentTemplateAfterRestart({ ctx }: Host, fixture: TemplateFixture) {
  const run = ctx.flowspace.snapshot().runs.find(run => run.id === fixture.runId)!;
  assert.equal(run.state, "completed");
  assert.equal(run.graph.nodes.find(node => node.id === fixture.noteId)?.text, fixture.input);
  assert.deepEqual(run.fanouts?.[0].lanes.map(lane => lane.item.key), fixture.keys);
  assert.equal(run.steps.find(step => step.nodeId === fixture.guideId)?.outputContent?.value, fixture.guide);
  for (const worker of fixture.workers) {
    using log = await ctx.sessionQuery.observeSession(worker.sessionId);
    const prompts = log.events.flatMap(event => event.type === "user/message" && event.data.source.kind === "user" &&
      event.data.source.rpcId ? [event.data.source.rpcId] : []);
    assert.deepEqual(prompts, [worker.requestId]);
  }
}

export async function checkWatchedContent({ ctx, workspace }: Host) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const fileName = "changing-exhibits.txt";
  const path = join(workspace, fileName);
  await writeFile(path, "compass\nsundial");
  const doc = emptyDocument();
  const file = { ...newNode("file", 0, 0), cwd: workspace, selectedItems: [fileName] };
  const split = newFlowNode("flowspace/split", 360, 0);
  doc.nodes = [file, split];
  doc.edges = [newEdge(file.id, split.id, "reference")];
  const { fan } = createFanoutPair(doc, 740, 0, { sourceId: split.id, sourcePort: "out", cwd: workspace });
  const lanes = () => service.snapshot().document.nodes.filter(n => n.generatedBy === fan.id && n.kind === "agent");
  try {
    const count = service.snapshot().runs.length;
    await service.save(doc);
    assert.deepEqual(lanes().map(n => n.itemTitle), ["compass", "sundial"]);
    const compass = lanes()[0].id;
    await writeFile(path, "astrolabe\ncompass\nclock");
    const timeout = AbortSignal.timeout(15_000);
    while (lanes().length !== 3) await delay(80, undefined, { signal: timeout });
    assert.equal(lanes()[1].id, compass);
    const preview = await service.previewData({ nodeId: split.id }, timeout);
    assert.deepEqual(preview.lines, ["astrolabe", "compass", "clock"]);
    assert.equal(service.snapshot().runs.length, count);
    assert.ok(lanes().every(n => !n.sessionId));
  } finally { await service.save(previous); }
}
