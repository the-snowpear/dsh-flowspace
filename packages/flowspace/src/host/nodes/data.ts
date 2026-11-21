import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-llm";
import { z } from "zod";
import { contentList, DEFAULT_LIST_LIMIT } from "../../core/content.ts";
import { dataItems, dataMode, dataText, transformData, type DataInput } from "../../core/nodes/data/index.ts";
import { snapshotWithContent } from "../../core/nodes/input.ts";
import type { ExecResult, ExecutionOptions, NodeExecutor } from "../../core/nodes/types.ts";
import type { ContextSnapshot, DataCallTrace, FlowContent, FlowItem, FlowNode, JsonObject, JsonValue, RunStep } from "../../types.ts";
import { runDataCode, type DataCodeInput } from "./judge/code.ts";

declare module "@deepseek-ai/dsh-llm/types" {
  interface LlmRequestPurposeMap { "flowspace-transform": true }
}

type ModelContext = { llm: Pick<Context["llm"], "stream"> };
type DataResult = Exclude<ExecResult, { awaiting: unknown }>;
type ModelConfig = { provider: string; model: string; instruction: string };
const mapped = z.strictObject({ value: z.json() });
const filtered = z.strictObject({ keep: z.boolean() });
const parsed = z.strictObject({ items: z.array(z.json()) });
const ordered = z.strictObject({ indexes: z.array(z.number().int().nonnegative()) });

const responseInstructions: Record<string, string> = {
  map: 'Transform the item. Return only JSON {"value":<JSON value>}.',
  filter: 'Decide whether to keep the item. Return only JSON {"keep":true|false}.',
  sort: 'Order the supplied items. Return only JSON {"indexes":[...]}, a permutation of all zero-based indexes. Preserve the input order of ties.',
  dedupe: 'Identify semantic duplicates and retain the first representative. Return only JSON {"indexes":[...]}, listing distinct retained zero-based indexes.',
  parse: 'Extract items from the supplied text. Return only JSON {"items":[...]}.',
};

async function modelCall<T>(ctx: ModelContext, config: ModelConfig, operation: string, payload: JsonObject,
  signal: AbortSignal, calls: DataCallTrace[], read: (response: unknown) => T, record?: ExecutionOptions["recordCall"]): Promise<T> {
  signal.throwIfAborted();
  if (!config.provider || !config.model) throw new Error("请先选择数据变换的供应商和模型");
  const text = JSON.stringify({ operation, ...payload });
  const trace: DataCallTrace = {
    id: crypto.randomUUID(), operation, provider: config.provider, model: config.model,
    ...(typeof payload.key === "string" ? { itemKey: payload.key } : {}),
    ...(typeof payload.index === "number" ? { index: payload.index } : {}),
    startedAt: Date.now(), endedAt: 0, inputTokens: 0, outputTokens: 0, inputSummary: text.slice(0, 240),
  };
  let raw = "", finished = false;
  try {
    for await (const chunk of ctx.llm.stream({
      provider: config.provider, model: config.model, signal, purpose: "flowspace-transform",
      system: [config.instruction, responseInstructions[operation]].filter(Boolean).join("\n"),
      messages: [{ role: "user", content: [{ type: "text", text }] }],
    })) {
      if (chunk.type === "usage") {
        trace.inputTokens += chunk.usage.inputTokens + (chunk.usage.cacheReadTokens ?? 0) + (chunk.usage.cacheWriteTokens ?? 0);
        trace.outputTokens += chunk.usage.outputTokens;
      }
      if (chunk.type === "text-delta") raw += chunk.text;
      if (chunk.type === "finish") {
        if (chunk.reason.kind === "error" || chunk.reason.kind === "aborted") throw new Error(chunk.reason.failure.message);
        finished = true;
      }
      signal.throwIfAborted();
    }
    signal.throwIfAborted();
    if (!finished) throw new Error("模型未完成数据变换请求");
    let response: unknown;
    try { response = JSON.parse(raw); } catch { throw new Error("模型未返回有效的 JSON"); }
    return read(response);
  } catch (error) {
    trace.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    trace.endedAt = Date.now();
    if (raw) trace.outputSummary = raw.slice(0, 240);
    calls.push(trace);
    await record?.(trace);
  }
}

function parseSource(node: FlowNode, inputs: DataInput[]): ContextSnapshot {
  const text = dataText(inputs);
  return inputs.length === 1 && inputs[0].source.text === text ? inputs[0].source :
    snapshotWithContent(node, { dataType: "text", value: text });
}

function codeItem(source: ContextSnapshot, item: FlowItem, index: number, limit: number): DataCodeInput {
  const value = item.value!;
  const content: FlowContent = Array.isArray(value) ? contentList(value, limit) :
    { dataType: typeof value === "string" ? "text" : value && typeof value === "object" ? "record" : "signal", value };
  return { ...snapshotWithContent({ id: source.sourceNodeId, title: source.title }, content, source.capturedAt),
    sourceSessionId: source.sourceSessionId, seq: source.seq, item: value, key: item.key, index };
}

async function executeCode(node: FlowNode, inputs: DataInput[], limit: number, signal: AbortSignal): Promise<FlowContent> {
  const config = node.config!.code as { source: string; timeoutMs: number };
  const source = parseSource(node, inputs);
  if (node.flowType === "flowspace/parse") {
    const [value] = await runDataCode(config.source, [source], config.timeoutMs, signal);
    if (!Array.isArray(value)) throw new Error("解析脚本必须返回 JSON 列表");
    return contentList(value, limit);
  }
  const list = dataItems(inputs, limit), items = list.items!;
  if (!items.length) return list;
  const values = await runDataCode(config.source, items.map((item, i) => codeItem(source, item, i, limit)), config.timeoutMs, signal);
  if (node.flowType === "flowspace/map") return { ...list, items: items.map((item, i) => ({ key: item.key, value: values[i] })) };
  if (values.some(value => typeof value !== "boolean")) throw new Error("过滤脚本必须返回布尔值");
  return { ...list, items: items.filter((_item, i) => values[i]) };
}

async function executeModel(ctx: ModelContext, node: FlowNode, inputs: DataInput[], limit: number,
  signal: AbortSignal, calls: DataCallTrace[], record?: ExecutionOptions["recordCall"]): Promise<FlowContent> {
  const operation = node.flowType!.slice("flowspace/".length);
  const config = node.config!.ai as ModelConfig;
  const ask = <T>(payload: JsonObject, read: (value: unknown) => T) =>
    modelCall(ctx, config, operation, payload, signal, calls, read, record);
  if (operation === "parse") {
    const text = parseSource(node, inputs).text;
    const values = await ask({ text }, value => parsed.parse(value).items);
    return contentList(values, limit);
  }
  const list = dataItems(inputs, limit), items = list.items!;
  if (!items.length) return list;
  if (operation === "sort" || operation === "dedupe") {
    const indexes = await ask({ items: items.map(item => ({ key: item.key, value: item.value! })) }, response => {
      const order = ordered.parse(response).indexes;
      if (order.some(index => index >= items.length) || new Set(order).size !== order.length ||
          (operation === "sort" && order.length !== items.length)) throw new Error("模型返回了无效的条目序号");
      return order;
    });
    if (operation === "dedupe") indexes.sort((a, b) => a - b);
    return { ...list, items: indexes.map(index => items[index]) };
  }
  const output: FlowItem[] = [];
  for (const [index, item] of items.entries()) {
    const payload = { item: item.value!, key: item.key, index };
    if (operation === "map") {
      const value = await ask(payload, response => mapped.parse(response).value);
      output.push({ key: item.key, value });
    } else if (await ask(payload, response => filtered.parse(response).keep)) output.push(item);
  }
  return { ...list, items: output };
}

/** Inputs and previous state are hydrated by the calling Host. Explicit previews share this path. */
export async function evaluateData(ctx: ModelContext, node: FlowNode, inputs: DataInput[], limit: number, signal: AbortSignal,
  previous?: FlowContent, record?: ExecutionOptions["recordCall"]): Promise<DataResult> {
  const calls: DataCallTrace[] = [];
  const mode = dataMode(node);
  const accounting = () => ({
    ...(calls.length ? { dataCalls: calls } : {}),
    telemetry: { stepCount: mode === "ai" ? calls.length : 1, inputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
      outputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0) },
  });
  try {
    signal.throwIfAborted();
    const content = mode === "code" ? await executeCode(node, inputs, limit, signal) :
      mode === "ai" ? await executeModel(ctx, node, inputs, limit, signal, calls, record) : transformData(node, inputs, limit, previous);
    signal.throwIfAborted();
    const source = snapshotWithContent(node, content);
    return { source, route: "out", output: source.text, ...accounting() };
  } catch (error) {
    signal.throwIfAborted();
    const reason = error instanceof Error ? error.message : String(error);
    return { source: inputs[0]?.source ?? snapshotWithContent(node, { dataType: "text", value: "" }),
      route: "error", output: reason, ...accounting() };
  }
}

export function dataExecutor(ctx: ModelContext, getListLimit: (step: RunStep) => number = () => DEFAULT_LIST_LIMIT): NodeExecutor {
  return (node, step, signal, options) => evaluateData(ctx, node,
    step.sources.map((source, i) => ({ source, port: step.sourcePorts?.[i] ?? "in" })),
    options?.listLimit ?? getListLimit(step), signal, options?.previous, options?.recordCall);
}
