import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-llm";
import type { DataCallTrace } from "../types.ts";

export type LlmStreamClient = Pick<Context["llm"], "stream">;
export type LlmStreamRequest = Parameters<Context["llm"]["stream"]>[0];

export interface LlmTextRequest {
  provider: string;
  model: string;
  purpose: LlmStreamRequest["purpose"];
  system?: string;
  userText: string;
  signal?: AbortSignal;
  requireFinish?: boolean;
  incompleteMessage?: string;
  trace?: {
    operation: string;
    itemKey?: string;
    index?: number;
    inputSummary?: string;
    record?: (trace: DataCallTrace) => Promise<void> | void;
    calls?: DataCallTrace[];
  };
}

export interface LlmTextResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  finished: boolean;
  trace?: DataCallTrace;
}

export interface LlmJsonRequest<T> extends LlmTextRequest {
  parse: (raw: unknown) => T;
  invalidJsonMessage?: string;
}

export interface LlmJsonResult<T> extends LlmTextResult {
  data: T;
}

async function runLlmStream<T>(
  llm: LlmStreamClient,
  req: LlmTextRequest,
  finalize: (text: string) => T,
): Promise<LlmTextResult & { value: T }> {
  req.signal?.throwIfAborted();
  const startedAt = Date.now();
  const trace: DataCallTrace | undefined = req.trace
    ? {
        id: crypto.randomUUID(),
        operation: req.trace.operation,
        provider: req.provider,
        model: req.model,
        ...(req.trace.itemKey !== undefined ? { itemKey: req.trace.itemKey } : {}),
        ...(req.trace.index !== undefined ? { index: req.trace.index } : {}),
        startedAt,
        endedAt: 0,
        inputTokens: 0,
        outputTokens: 0,
        inputSummary: (req.trace.inputSummary ?? req.userText).slice(0, 240),
      }
    : undefined;

  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let finished = false;

  try {
    for await (const chunk of llm.stream({
      provider: req.provider as LlmStreamRequest["provider"],
      model: req.model,
      signal: req.signal,
      purpose: req.purpose,
      ...(req.system !== undefined ? { system: req.system } : {}),
      messages: [{ role: "user", content: [{ type: "text", text: req.userText }] }],
    })) {
      if (chunk.type === "usage") {
        inputTokens +=
          chunk.usage.inputTokens +
          (chunk.usage.cacheReadTokens ?? 0) +
          (chunk.usage.cacheWriteTokens ?? 0);
        outputTokens += chunk.usage.outputTokens;
        if (trace) {
          trace.inputTokens = inputTokens;
          trace.outputTokens = outputTokens;
        }
      } else if (chunk.type === "text-delta") {
        text += chunk.text;
      } else if (chunk.type === "finish") {
        if (chunk.reason.kind === "error" || chunk.reason.kind === "aborted") {
          throw new Error(chunk.reason.failure.message);
        }
        finished = true;
      }
      req.signal?.throwIfAborted();
    }
    req.signal?.throwIfAborted();
    if (req.requireFinish && !finished) {
      throw new Error(req.incompleteMessage ?? "模型未完成请求");
    }
    const value = finalize(text);
    return { text, inputTokens, outputTokens, finished, trace, value };
  } catch (error) {
    if (trace) trace.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (trace && req.trace) {
      trace.endedAt = Date.now();
      if (text) trace.outputSummary = text.slice(0, 240);
      req.trace.calls?.push(trace);
      await req.trace.record?.(trace);
    }
  }
}

/**
 * Unified streaming LLM text call with consistent AbortSignal propagation,
 * finish-error reporting, cache-inclusive token accounting, and optional tracing.
 */
export async function streamLlmText(
  llm: LlmStreamClient,
  req: LlmTextRequest,
): Promise<LlmTextResult> {
  const { value: _value, ...result } = await runLlmStream(llm, req, (text) => text);
  return result;
}

/**
 * Streams an LLM response, parses JSON, validates via `parse`, and records partial usage
 * and parse/validation failures onto the attached `DataCallTrace` before rethrowing.
 */
export async function streamLlmJson<T>(
  llm: LlmStreamClient,
  req: LlmJsonRequest<T>,
): Promise<LlmJsonResult<T>> {
  const { parse, invalidJsonMessage, ...base } = req;
  const { value, ...result } = await runLlmStream(llm, base, (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(invalidJsonMessage ?? "模型未返回有效的 JSON");
    }
    return parse(parsed);
  });
  return { ...result, data: value };
}
