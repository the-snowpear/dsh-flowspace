import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../packages/flowspace/src/core/document.ts";
import type { FlowNode, FlowspaceDocument, FlowspaceRun, JsonObject } from "../packages/flowspace/src/types.ts";
import type { boot } from "./environment.mjs";

type Host = Awaited<ReturnType<typeof boot>>;
const model = { provider: "flowspace-test", model: "deterministic", instruction: "Review the supplied item." };
function node(type: string, config: JsonObject = {}) {
  const n = newFlowNode("flowspace/" + type, 0, 0);
  n.config = { ...n.config, ...config };
  return n;
}
function link(source: FlowNode, target: FlowNode, port = "in") {
  return { ...newEdge(source.id, target.id, "continuation"), sourcePort: "out", targetPort: port };
}
function ref(source: FlowNode, target: FlowNode, port = "in") {
  return { ...newEdge(source.id, target.id, "reference"), always: true, targetPort: port };
}

export async function verifyDataTransforms(host: Host) {
  const service = host.ctx.flowspace, previous = service.snapshot().document;
  async function done(id: string): Promise<FlowspaceRun> {
    const end = Date.now() + 45_000;
    for (;;) {
      const run = service.snapshot().runs.find(value => value.id === id)!;
      if (run.state === "completed") return run;
      assert.ok(run.state !== "error" && Date.now() < end, JSON.stringify([run.state, run.notes, run.steps.map(s => [s.nodeId,s.error])]));
      await delay(80);
    }
  }
  async function execute(document: FlowspaceDocument) {
    await service.save(document);
    return done((await service.start({ kind: "global", nodeIds: [] })).id);
  }
  try {
    const document = emptyDocument();
    const input = { ...newNode("note", 0, 0, "Catalogue"), text: "Atlas\nCompass" };
    const split = node("split");
    const coded = node("map", { mode: "code", code: {
      source: "(input) => ({ label: input.item, index: input.index })", timeoutMs: 1000,
    } });
    const reviewed = node("map", { mode: "ai", ai: model });
    document.nodes = [input, split, coded, reviewed];
    document.edges = [ref(input, split), link(split, coded), link(coded, reviewed)];
    const run = await execute(document);
    const [first, second, third] = run.steps;
    assert.deepEqual(run.steps.map(s => s.nodeId), [split.id, coded.id, reviewed.id]);
    const items = first.outputContent!.items!;
    assert.deepEqual(items.map(i => i.value), ["Atlas", "Compass"]);
    const values = items.map((i, index) => ({ label: i.value, index }));
    assert.deepEqual(second.outputContent!.items, items.map((i, index) => ({ key: i.key, value: values[index] })));
    assert.deepEqual(third.outputContent!.items, items.map((i, index) => ({ key: i.key, value: { reviewed: values[index] } })));
    assert.ok(run.steps.every(s => s.sessionId === undefined));
    assert.equal(second.telemetry?.inputTokens, 0);
    assert.deepEqual(third.dataCalls?.map(c => [c.itemKey, c.index, c.provider, c.model]), items.map((i, index) =>
      [i.key, index, model.provider, model.model]));
    assert.deepEqual([third.telemetry?.stepCount, third.telemetry?.inputTokens, third.telemetry?.outputTokens], [2, 18, 8]);

    const named = emptyDocument(), title = { ...newNode("note", 0, 0), text: "Atlas" };
    const place = node("constant", { mode: "text", value: "Gallery 3" });
    const template = node("template", { inputs: ["title","room"], template: "{{room}} — {{title}}" });
    named.nodes = [title, place, template];
    named.edges = [link(place, template, "room"), ref(title, template, "title")];
    const namedRun = await execute(named);
    const rendered = namedRun.steps.filter(s => s.nodeId === template.id);
    assert.equal(rendered.length, 1);
    assert.equal(rendered[0].outputContent?.value, "Gallery 3 — Atlas");

    const batch = emptyDocument();
    const source = node("constant", { mode: "list", value: JSON.stringify(["Beta", "", "Alpha", "Alpha"]) });
    const filter = node("filter", { mode: "ai", ai: model });
    const sort = node("sort", { mode: "ai", ai: model });
    const dedupe = node("dedupe", { mode: "ai", ai: model });
    const join = node("join", { mode: "delimiter", delimiter: "\n" });
    const parsed = node("parse", { mode: "ai", ai: model });
    batch.nodes = [source, filter, sort, dedupe, join, parsed];
    batch.edges = batch.nodes.slice(1).map((target, i) => link(batch.nodes[i], target));
    const ordered = await execute(batch);
    const captured = ordered.steps.find(s => s.nodeId === source.id)!.outputContent!.items!;
    assert.deepEqual(ordered.steps.find(s => s.nodeId === dedupe.id)!.outputContent!.items,
      [captured[2], captured[0]]);
    assert.deepEqual(ordered.steps.find(s => s.nodeId === parsed.id)!.outputContent!.items!.map(i => i.value), ["Alpha", "Beta"]);
    assert.equal(ordered.steps.filter(s => s.sessionId).length, 0);

    const concurrent = emptyDocument();
    const producer = (marker: string) => ({ ...newNode("agent", 0, 0, marker), task: marker, cwd: host.workspace });
    const left = producer("FLOWSPACE_DATA_ACC_A"), right = producer("FLOWSPACE_DATA_ACC_B");
    const accumulator = node("accumulate");
    concurrent.nodes = [left, right, accumulator];
    concurrent.edges = [left, right].map(n => ({ ...link(n, accumulator), emitMode: "stream" }));
    await service.save(concurrent);
    const starts = await Promise.all([left, right].map(n => service.start({ kind: "single", nodeIds: [n.id] })));
    const results = await Promise.all(starts.map(start => done(start.id)));
    for (const [index, result] of results.entries()) {
      const prefix = index === 0 ? "A" : "B";
      assert.deepEqual(result.steps.filter(s => s.nodeId === accumulator.id).map(s => s.outputContent!.items!.map(i => i.value)),
        [[prefix + ":1"], [prefix + ":1", prefix + ":2"]]);
      assert.deepEqual(result.accumulators?.find(a => a.nodeId === accumulator.id)?.content.items?.map(i => i.value),
        [prefix + ":1", prefix + ":2"]);
    }
  } finally { await service.save(previous); }
}
