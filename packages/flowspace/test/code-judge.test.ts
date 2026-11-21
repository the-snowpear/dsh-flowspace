import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";
import type { Context } from "@deepseek-ai/cordis";
import { newFlowNode } from "../src/core/document.ts";
import type { ContextSnapshot, RunStep } from "../src/types.ts";
import { judgeExecutors } from "../src/host/nodes/judge/index.ts";
import { awaitWorkerResult, runCode } from "../src/host/nodes/judge/code.ts";

const signal = new AbortController().signal;

const snapshot: ContextSnapshot = {
  id: "input", kind: "conclusion", sourceNodeId: "node-1", sourceSessionId: "session-1",
  title: "Review", text: '雪\n"\\;\u0000🧭\ud800x\udfff', capturedAt: 8123, seq: 0,
};

test("QuickJS receives an independent JSON snapshot preserving optional fields and Unicode", async () => {
  assert.deepEqual(JSON.parse(String(await runCode("input => JSON.stringify(input)", snapshot, 100, signal))), snapshot);
  assert.equal(await runCode("input => input.text", snapshot, 100, signal), snapshot.text);
  assert.equal(await runCode("input => { input.text = 'changed'; return input.seq === 0; }", snapshot, 100, signal), true);
  assert.notEqual(snapshot.text, "changed");
  assert.equal(await runCode("() => false", snapshot, 1000, signal), false);
});

test("the guest has no Node or browser I/O globals", async () => {
  const check = "() => [typeof require, typeof process, typeof fetch, typeof XMLHttpRequest, typeof setTimeout, typeof setInterval, typeof WebSocket, typeof std, typeof os].every(x => x === 'undefined')";
  assert.equal(await runCode(check, snapshot, 1000, signal), true);
});

test("guest exceptions and invalid return types reject execution", async () => {
  await assert.rejects(runCode('() => { throw new Error("fixture"); }', snapshot, 1000, signal), /fixture/);
  await assert.rejects(runCode("() => ({ branch: 'pass' })", snapshot, 1000, signal), /分支 ID 或布尔值/);
  await assert.rejects(runCode("123", snapshot, 1000, signal), /函数/);
});

test("the guest CPU timeout terminates a loop and validates the supported budget", async () => {
  await assert.rejects(runCode("() => { while (true) {} }", snapshot, 100, signal), /超时/);
  for (const budget of [99, 5001, 250.5]) {
    await assert.rejects(runCode("() => true", snapshot, budget, signal), /100 到 5000/);
  }
});

test("abort cancels the worker and an already aborted run never starts one", async () => {
  const controller = new AbortController();
  const reason = new Error("cancel fixture");
  const pending = runCode("() => { while (true) {} }", snapshot, 5000, controller.signal);
  const cancel = setTimeout(() => controller.abort(reason), 250);
  try {
    await assert.rejects(pending, reason);
    await assert.rejects(runCode("() => true", snapshot, 1000, controller.signal), reason);
  } finally {
    clearTimeout(cancel);
  }
});

test("guest memory allocation beyond the 32 MiB budget fails in isolation", async () => {
  await assert.rejects(runCode("() => new ArrayBuffer(40 * 1024 * 1024).byteLength > 0", snapshot, 1000, signal), /memory|allocation/i);
  assert.equal(await runCode("() => true", snapshot, 100, signal), true);
});

test("the executor reports an unknown branch and preserves the original snapshot on success", async () => {
  const node = newFlowNode("flowspace/code", 0, 0);
  const step: RunStep = { id: "s", requestId: "r", nodeId: node.id, state: "running", iteration: 1,
    task: "", sources: [snapshot], createdAt: 1 };
  const execute = judgeExecutors({} as Context, async () => "")["flowspace/code"];
  const result = await execute(node, step, signal);
  assert.ok("route" in result && result.route === "pass" && result.source === snapshot);
  node.config = { ...node.config, source: "() => 'unknown'" };
  await assert.rejects(execute(node, step, signal), /未知分支/);
});

test("host terminates idle workers that withhold readiness or a result", async () => {
  for (const ready of [false, true]) {
    const fixture = `import { parentPort } from 'node:worker_threads';
      ${ready ? "parentPort.postMessage({ kind: 'ready' });" : ""}
      setTimeout(() => parentPort.postMessage({ kind: 'result', value: false }), 5000);`;
    const worker = new Worker(new URL("data:text/javascript," + encodeURIComponent(fixture)), { execArgv: [] });
    await assert.rejects(awaitWorkerResult(worker, signal, 100, ready ? 4000 : 100), ready ? /执行超时/ : /初始化超时/);
    assert.equal(worker.threadId, -1);
  }
});
