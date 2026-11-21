import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { emptyDocument, newEdge, newNode } from "../packages/flowspace/src/core/document.ts";
import { boot, findAvailablePort } from "./environment.mjs";

const require = createRequire(new URL("../packages/flowspace/package.json", import.meta.url));
const { z } = require("zod");

/** Exercise the actual rc.3 tool resolution, inbox claim, native batch executor and persisted deliveries. */
export async function verifyStructuredEmission({ ctx, workspace }) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const doc = emptyDocument();
  const producer = {
    ...newNode("agent", 0, 0, "Emitter"), cwd: workspace, task: "FLOWSPACE_EMIT_SPIKE",
    nativeTrigger: "disabled",
  };
  const ordinary = { ...newNode("agent", 0, 310, "Plain output"), cwd: workspace,
    task: "FLOWSPACE_EMIT_SPIKE", nativeTrigger: "disabled" };
  const flowType = "fixture/flow-emit-receiver";
  const receiver = (name, y) => ({ ...newNode("flow", 350, y, name), flowType, configVersion: 1, config: {} });
  const streaming = receiver("Streaming", 0), atEnd = receiver("Batch", 310);
  const observed = [];
  const unregister = service.registerNodeKind({
    flowType, version: 1, family: "data", titleKey: "flow_node", descKey: "flow_node", icon: "braces",
    configSchema: z.object({}), defaultConfig: {}, size: { compact: [256, 96], full: [312, 200] },
    capabilities: {}, quickCreate: { canvas: false }, experimental: true,
    ports: () => [{ id: "in", role: "continuation", direction: "in", dataType: "list" }],
  }, async (node, step) => {
    const run = service.snapshot().runs.findLast(run => run.steps.some(owned => owned.id === step.id));
    const upstream = run.steps.find(owned => owned.nodeId === producer.id);
    observed.push({ receiver: node.id, state: upstream.state, values: step.sources[0].content.items.map(item => item.value) });
    return { route: "out", output: step.sources[0].text, source: step.sources[0] };
  });
  const signal = AbortSignal.timeout(60_000);
  async function hasEmit(sessionId) {
    const { agent, error } = await ctx.sessionController.resolveAgent(sessionId);
    if (error) throw error;
    const resolved = await ctx.tools.resolve({ agent, modelSelection: agent.model.current(), signal });
    try { return ctx.tools.schemas(agent, resolved).some(tool => tool.name === "flow_emit"); }
    finally { resolved.dispose(); }
  }
  async function finished(runId) {
    for (;;) {
      signal.throwIfAborted();
      const run = service.snapshot().runs.find(run => run.id === runId);
      if (run.state === "error") throw new Error(JSON.stringify({ notes: run.notes, steps: run.steps.map(s => [s.nodeId, s.error]) }));
      if (run.state === "completed") return run;
      await delay(60, undefined, { signal });
    }
  }
  try {
    doc.nodes = [producer, ordinary, streaming, atEnd];
    const streamEdge = { ...newEdge(producer.id, streaming.id, "continuation"), emitMode: "stream" };
    const endEdge = newEdge(producer.id, atEnd.id, "continuation");
    doc.edges = [streamEdge, endEdge];
    await service.save(doc);
    const sender = await service.bind({ nodeId: producer.id, cwd: workspace });
    const plain = await service.bind({ nodeId: ordinary.id, cwd: workspace });
    assert.equal(await hasEmit(sender.sessionId), false);
    assert.equal(await hasEmit(plain.sessionId), false);
    const run = await finished((await service.start({ kind: "global", nodeIds: [] })).id);
    assert.equal(run.steps.find(step => step.nodeId === producer.id).output, "FLOWSPACE_EMITTED");
    assert.equal(run.steps.find(step => step.nodeId === ordinary.id).output, "FLOWSPACE_EMIT_UNAVAILABLE");
    assert.deepEqual(observed.filter(row => row.receiver === streaming.id).map(row => [row.state, row.values]), [
      ["running", ["first", { nested: [null, 2] }]], ["running", ["last"]],
    ]);
    assert.deepEqual(observed.filter(row => row.receiver === atEnd.id).map(row => [row.state, row.values]), [
      ["completed", ["first", { nested: [null, 2] }, "last"]],
    ]);
    assert.equal(run.tokens.filter(token => token.edgeId === streamEdge.id && !token.skip).length, 2);
    assert.equal(run.tokens.filter(token => token.edgeId === endEdge.id && !token.skip).length, 1);
    const log = await ctx.sessionQuery.observeSession(sender.sessionId);
    try {
      const calls = log.events.filter(event => event.type === "tool/call" && event.data.name === "flow_emit");
      assert.equal(calls.length, 2);
      const results = log.events.filter(event => event.type === "tool/result" && calls.some(call => call.data.callId === event.data.message.source.callId));
      assert.deepEqual(results.map(event => JSON.parse(event.data.message.content[0].text)), [
        { accepted: 2, total: 2 }, { accepted: 1, total: 3 },
      ]);
    } finally { log[Symbol.dispose](); }
    assert.equal(await hasEmit(sender.sessionId), false);
  } finally {
    try { await service.save(previous); }
    finally { unregister(); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = await boot({ name: `flow-emit-spike-${Date.now()}`, mock: true, port: await findAvailablePort(0) });
  let exitCode = 1;
  try {
    await verifyStructuredEmission(host);
    console.log("PASS native flow_emit scoping, two tool calls, immediate streaming and one end-of-turn delivery");
    exitCode = 0;
  } catch (error) { console.error(error); }
  finally { await host.shutdown.shutdown(exitCode); }
}
