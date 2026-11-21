import type { ContextSnapshot, JsonValue } from "../../../types.ts";
import { Worker } from "node:worker_threads";

type WorkerReply =
  | { kind: "ready" }
  | { kind: "result"; value: JsonValue }
  | { kind: "error"; message: string };

// The published plugin includes src. A package-relative URL works from both
// the bundled Host and the TypeScript entry used by the tests.
const workerUrl = new URL("./src/host/nodes/judge/code-worker.mjs", import.meta.resolve("dsh-flowspace/package.json"));

export async function runCode(source: string, input: ContextSnapshot, timeoutMs: number, signal: AbortSignal): Promise<string | boolean> {
  return runWorker(source, [input], "branch", timeoutMs, signal) as Promise<string | boolean>;
}

export interface DataCodeInput extends ContextSnapshot {
  item?: JsonValue;
  key?: string;
  index?: number;
}

/** Compile one transformation per worker and process the input batch in order under one deadline. */
export async function runDataCode(source: string, inputs: DataCodeInput[], timeoutMs: number, signal: AbortSignal): Promise<JsonValue[]> {
  return runWorker(source, inputs, "json", timeoutMs, signal) as Promise<JsonValue[]>;
}

async function runWorker(source: string, inputs: DataCodeInput[], mode: "branch" | "json", timeoutMs: number, signal: AbortSignal) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 5000) {
    throw new Error("代码判断超时须为 100 到 5000 毫秒的整数");
  }
  signal.throwIfAborted();
  const worker = new Worker(workerUrl, {
    workerData: { source, inputs, mode, timeoutMs },
    execArgv: [],
    resourceLimits: { maxOldGenerationSizeMb: 48, maxYoungGenerationSizeMb: 8, stackSizeMb: 2 },
  });
  return awaitWorkerResult(worker, signal, timeoutMs);
}

// WASM module initialization and guest execution have independent deadlines.
export async function awaitWorkerResult(worker: Worker, signal: AbortSignal, timeoutMs: number, startupMs = 10_000): Promise<JsonValue> {
  let timer: ReturnType<typeof setTimeout>;
  let abort!: () => void;
  try {
    return await new Promise<JsonValue>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("代码判断 Worker 初始化超时")), startupMs);
      abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      worker.once("error", reject);
      worker.once("exit", (code) => reject(new Error(`代码判断 Worker 提前结束（${code}）`)));
      worker.on("message", (reply: WorkerReply) => {
        if (reply.kind === "ready") {
          clearTimeout(timer);
          timer = setTimeout(() => reject(new Error("代码判断执行超时")), timeoutMs);
        } else if (reply.kind === "result") {
          resolve(reply.value);
        } else {
          reject(new Error(reply.message));
        }
      });
    });
  } finally {
    clearTimeout(timer!);
    signal.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
