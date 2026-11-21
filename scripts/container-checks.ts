import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { resolve } from "node:path";
import type { SessionId } from "@deepseek-ai/dsh-session";
import { boot, findAvailablePort } from "./environment.mjs";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../packages/flowspace/src/core/document.ts";
import { findBoardCard } from "../packages/flowspace/src/core/board.ts";

export async function verifyContainerTools({ ctx, workspace }: Awaited<ReturnType<typeof boot>>) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const doc = emptyDocument();
  const board = { ...newNode("board", 0, 0, "Mounted board"), columns: [
    { id: "todo", name: "To do", cards: [{ id: "one", text: "One" }, { id: "two", text: "Two" }] },
    { id: "review", name: "Review", cards: [] },
  ] };
  const agent = { ...newNode("agent", 660, 0, "Writer"), cwd: workspace, task: "Read board", nativeTrigger: "disabled" as const };
  const reader = { ...newNode("agent", 660, 420, "Reader"), cwd: workspace, task: "Read board", nativeTrigger: "disabled" as const };
  const edge = { ...newEdge(board.id, agent.id, "reference"), permission: "advance" as const, sourceItemKey: "one" };
  doc.nodes = [board, agent, reader];
  doc.edges = [edge, newEdge(board.id, reader.id, "reference")];
  const signal = AbortSignal.timeout(100_000);
  let expectedApproval = "rejected";
  const stop = ctx.on("approval/request", (request, next) =>
    request.toolName === "board_write" ? Promise.resolve(expectedApproval) : next(), { prepend: true });
  try {
    await service.save(doc);
    const bound = await service.bind({ nodeId: agent.id, cwd: workspace });
    const readOnly = await service.bind({ nodeId: reader.id, cwd: workspace });
    async function tools(sessionId: string) {
      const resolution = await ctx.sessionController.resolveAgent(sessionId as SessionId);
      if ("error" in resolution) throw resolution.error;
      const { agent } = resolution;
      const resolved = await ctx.tools.resolve({ agent, modelSelection: agent.model.current(), signal });
      try { return ctx.tools.schemas(agent, resolved).map(tool => tool.name); }
      finally { resolved.dispose(); }
    }
    assert.ok((await tools(bound.sessionId!)).includes("board_write"));
    assert.ok(!(await tools(readOnly.sessionId!)).includes("board_write"));
    async function run(actions: { name: string; args: object }[]) {
      const next = service.snapshot().document;
      next.nodes.find(node => node.id === agent.id)!.task = `FLOWSPACE_CONTAINER ${JSON.stringify(actions)}`;
      await service.save(next);
      const started = await service.start({ kind: "single", nodeIds: [agent.id] });
      for (;;) {
        signal.throwIfAborted();
        const result = service.snapshot().runs.find(run => run.id === started.id)!;
        if (result.state === "error") throw new Error(JSON.stringify(result.steps));
        if (result.state === "completed") break;
        await delay(60, undefined, { signal });
      }
      const log = await ctx.sessionQuery.observeSession(bound.sessionId! as SessionId);
      try {
        return [...log.events].reverse().find(event => event.type === "tool/result");
      } finally { log[Symbol.dispose](); }
    }
    const read = await run([{ name: "board_read", args: { edgeId: edge.id } }]);
    assert.ok(read?.type === "tool/result");
    const block = read.data.message.content.find(block => block.type === "text");
    assert.ok(block?.type === "text");
    const content = JSON.parse(block.text);
    assert.deepEqual(content.entries.map((item: { id: string }) => item.id), ["one"]);
    const version = content.entries[0].version;
    const write = (args: object) => run([{ name: "board_write", args: {
      edgeId: edge.id, expectedVersion: version, action: "move", columnId: "review", itemId: "one", ...args,
    } }]);
    await write({ itemId: "two" });
    assert.equal(service.snapshot().containerChanges?.filter(change => change.nodeId === board.id).length, 0);
    const ask = service.snapshot().document;
    ask.edges.find(item => item.id === edge.id)!.ask = true;
    await service.save(ask);
    await write({});
    assert.equal(service.snapshot().containerChanges?.filter(change => change.nodeId === board.id).length, 0);
    expectedApproval = "allowed-once";
    await write({});
    const current = () => service.snapshot().document.nodes.find(node => node.id === board.id)!;
    assert.equal(findBoardCard(current().columns!, "one")?.column.id, "review");
    await write({ action: "comment", text: "stale call" });
    assert.equal(service.snapshot().containerChanges?.filter(change => change.nodeId === board.id).length, 1);
    const change = service.snapshot().containerChanges!.find(change => change.nodeId === board.id)!;
    await service.revertContainerChange(change.id);
    assert.equal(findBoardCard(current().columns!, "one")?.column.id, "todo");
  } finally {
    stop();
    await service.save(previous);
  }
}

export async function verifyVariablesAndDelivery({ ctx, workspace }: Awaited<ReturnType<typeof boot>>) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const doc = emptyDocument();
  const counter = newFlowNode("flowspace/variable", 0, 0);
  counter.config = { name: "counter", type: "number", scope: "canvas", initial: "2" };
  const increment = newFlowNode("flowspace/assign", 350, 0);
  increment.config = { name: "counter", operation: "increment", value: "3", inputValue: false };
  const agent = { ...newNode("agent", 700, 0, "Reader"), cwd: workspace, task: "counter={{var.counter}}" };
  const board = { ...newNode("board", 1100, 0), columns: [{ id: "result", name: "Result", cards: [] }] };
  doc.nodes = [counter, increment, agent, board];
  doc.edges = [newEdge(counter.id, agent.id, "reference"), newEdge(increment.id, agent.id, "continuation"),
    { ...newEdge(agent.id, board.id, "continuation"), delivery: { mode: "paragraph", columnId: "result" } }];
  const signal = AbortSignal.timeout(35_000);
  try {
    await service.save(doc);
    const id = (await service.start({ kind: "global", nodeIds: [] })).id;
    const pending = () => service.snapshot().runs.find(run => run.id === id)!;
    while (pending().state !== "completed") {
      signal.throwIfAborted();
      if (pending().state === "error") throw new Error(JSON.stringify(pending()));
      await delay(60, undefined, { signal });
    }
    const step = pending().steps.find(step => step.nodeId === agent.id)!;
    assert.equal(step.task, "counter=5");
    assert.equal(step.variables?.[0].version, 1);
    assert.equal(step.sources.find(source => source.referenceKind === "variable")?.text, "5");
    const view = () => service.snapshot().variables?.find(variable => variable.id === counter.id);
    assert.equal(view()?.value, 5);
    await service.writeVariable({ id: counter.id, expectedVersion: 1, value: 21 });
    await assert.rejects(service.writeVariable({ id: counter.id, expectedVersion: 1, value: 22 }), /版本冲突/);
    assert.equal(view()?.value, 21);
    assert.equal(pending().steps.find(step => step.nodeId === agent.id)?.variables?.[0].value, 5);
    const delivered = service.snapshot().document.nodes.find(node => node.id === board.id)?.columns?.[0].cards;
    assert.equal(delivered?.length, 1);
    assert.match(delivered![0].text, /counter=5/);
  } finally { await service.save(previous); }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const fixture = await boot({ name: `container-checks-${Date.now()}`, mock: true, port: await findAvailablePort(0) });
  let status = 1;
  try {
    await verifyContainerTools(fixture);
    await verifyVariablesAndDelivery(fixture);
    console.log("PASS native container tools, approvals and version conflicts");
    status = 0;
  } catch (error) { console.error(error); }
  finally { await fixture.shutdown.shutdown(status); }
}
