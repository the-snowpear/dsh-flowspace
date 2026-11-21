import { parentPort, workerData } from "node:worker_threads";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import singlefile from "@jitl/quickjs-singlefile-cjs-release-sync";

// Capture the built-ins before the script runs. JSON.stringify alone silently
// drops undefined properties, maps non-finite numbers to null and invokes toJSON.
const encodeJson = `(() => {
  const stringify = JSON.stringify, finite = Number.isFinite, array = Array.isArray;
  const proto = Object.getPrototypeOf, plain = Object.prototype, symbols = Object.getOwnPropertySymbols;
  const names = Object.getOwnPropertyNames, keys = Object.keys;
  return value => stringify(value, function (key, encoded) {
    const raw = this[key], type = typeof raw;
    if (raw !== encoded || !["object","boolean","string","number"].includes(type) ||
        (type === "number" && !finite(raw)) ||
        (raw && type === "object" && (symbols(raw).length || (array(raw)
          ? names(raw).length !== raw.length + 1 || keys(raw).length !== raw.length
          : (proto(raw) !== plain && proto(raw) !== null) || names(raw).length !== keys(raw).length))))
      throw new TypeError("代码变换必须返回 JSON 值");
    return encoded;
  });
})()`;

async function execute({ source, inputs, mode, timeoutMs }) {
  const engine = await newQuickJSWASMModuleFromVariant(singlefile.default);
  using runtime = engine.newRuntime({ memoryLimitBytes: 32 * 1024 * 1024, maxStackSizeBytes: 256 * 1024 });
  using context = runtime.newContext();
  const deadline = performance.now() + timeoutMs;
  runtime.setInterruptHandler(() => performance.now() >= deadline);
  parentPort.postMessage({ kind: "ready" });

  // JSON quoting preserves embedded NULs and lone surrogates across the WASM
  // string API. The guest receives a fresh JSON snapshot and no host callbacks.
  using json = context.getProp(context.global, "JSON");
  using parse = context.getProp(json, "parse");
  using encode = mode === "json" ? context.unwrapResult(context.evalCode(encodeJson)) : context.getProp(json, "stringify");
  using fn = context.unwrapResult(context.evalCode(`(${source}\n)`, "flowspace-code.js", { type: "global" }));
  if (context.typeof(fn) !== "function") throw new Error("代码节点必须是一个函数");
  const results = [];
  for (const input of inputs) {
    using encodedInput = context.newString(JSON.stringify(input));
    using argument = context.unwrapResult(context.callFunction(parse, json, encodedInput));
    using value = context.unwrapResult(context.callFunction(fn, context.undefined, argument));
    const type = context.typeof(value);
    if (mode === "branch" && type !== "string" && type !== "boolean") throw new Error("代码判断须返回分支 ID 或布尔值");
    using encoded = context.unwrapResult(context.callFunction(encode, json, value));
    results.push(JSON.parse(context.getString(encoded)));
  }
  return mode === "branch" ? results[0] : results;
}

try {
  parentPort.postMessage({ kind: "result", value: await execute(workerData) });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  parentPort.postMessage({ kind: "error", message: message === "interrupted" ? "代码判断执行超时" : message });
}
