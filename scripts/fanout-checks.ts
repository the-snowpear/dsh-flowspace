import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { emptyDocument, newEdge, newNode } from "../packages/flowspace/src/core/document.ts";
import { createFanoutPair } from "../packages/flowspace/src/core/fanout.ts";
import type { FlowspaceDocument, FlowspaceRun } from "../packages/flowspace/src/types.ts";
import type { boot } from "./environment.mjs";

export async function verifyFanout({ ctx, workspace }: Awaited<ReturnType<typeof boot>>) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const doc = emptyDocument();
  const board = newNode("board", 0, 0, "Collection");
  const cards = Array.from({ length: 10 }, (_, i) => ({ id: "exhibit-" + i, text: "Exhibit " + i }));
  board.columns = [{ id: "catalog", name: "Catalog", cards }];
  doc.nodes.push(board);
  const pair = createFanoutPair(doc, 600, 0, { title: "Exhibit review", task: "Review this exhibit.", cwd: workspace,
    sourceId: board.id, sourceKind: "reference" });
  const workers = (doc: FlowspaceDocument) => doc.nodes.filter(n => n.generatedBy === pair.fan.id && n.kind === "agent");
  const launch = async () => {
    const run = await service.start({ kind: "global", nodeIds: [] });
    const timeout = AbortSignal.timeout(60_000);
    for (;;) {
      const current: FlowspaceRun = service.snapshot().runs.find(r => r.id === run.id)!;
      if (current.state === "completed") return current;
      assert.notEqual(current.state, "error", JSON.stringify([current.notes, current.steps.map(s => s.error)]));
      await delay(80, undefined, { signal: timeout });
    }
  };
  try {
    const before = service.snapshot().runs.length;
    const ten = await service.save(doc);
    const identities = new Map(workers(ten).map(n => [n.itemKey, n.id]));
    assert.equal(identities.size, 10);
    assert.ok(workers(ten).every(n => !n.sessionId));
    const reordered = structuredClone(ten);
    reordered.nodes.find(n => n.id === board.id)!.columns![0].cards = [cards[8], cards[1]];
    const two = await service.save(reordered);
    assert.equal(workers(two).length, 2);
    assert.ok(workers(two).every(n => n.id === identities.get(n.itemKey)));
    assert.equal(service.snapshot().runs.length, before);
    const sink = { ...newNode("agent", 2100, 0, "Deliver summary"), task: "Summarize the reviewed items.", cwd: workspace };
    two.nodes.push(sink);
    two.edges.push(newEdge(pair.merge.id, sink.id, "continuation"));
    await service.save(two);
    const run = await launch();
    const laneSteps = run.steps.filter(step => workers(two).some(node => node.id === step.nodeId));
    assert.equal(laneSteps.length, 2);
    assert.equal(new Set(laneSteps.map(step => step.sessionId)).size, 2);
    assert.ok(laneSteps.every(step => step.sessionId && step.state === "completed"));
    const sessions = await service.sessions();
    for (const worker of workers(two)) {
      const sessionId = laneSteps.find(step => step.nodeId === worker.id)!.sessionId;
      assert.equal(sessions.find(session => session.sessionId === sessionId)?.title,
        `Exhibit review #${worker.laneIndex! + 1} · ${worker.itemTitle}`);
    }
    assert.ok(!run.steps.some(step => step.nodeId === pair.master.id));
    const output = run.steps.filter(step => step.nodeId === sink.id);
    assert.equal(output.length, 1);
    assert.deepEqual(output[0].sources[0].content?.items?.map(item => item.key), [cards[8].id, cards[1].id]);
    const edited = service.snapshot().document;
    edited.nodes.find(n => n.id === pair.group.id)!.title = "Updated exhibit review";
    edited.nodes.find(n => n.id === board.id)!.columns![0].cards = [cards[1]];
    const after = await service.save(edited);
    assert.equal(workers(after).find(n => n.itemKey === cards[8].id)?.removed, true);
    const retained = workers(after).find(n => n.itemKey === cards[1].id)!;
    assert.equal((await service.sessions()).find(session => session.sessionId === retained.sessionId)?.title,
      `Updated exhibit review #1 · ${retained.itemTitle}`);
    assert.equal(service.snapshot().runs.length, before + 1);
  } finally {
    await service.save(previous);
  }
}
