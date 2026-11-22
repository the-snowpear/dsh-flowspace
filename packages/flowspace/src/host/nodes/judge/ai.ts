import { z } from "zod";
import type {} from "@deepseek-ai/dsh-llm";
import type { AiConfig } from "../../../core/nodes/judge/index.ts";
import type { RunStep, StepTelemetry } from "../../../types.ts";
import { streamLlmText, type LlmStreamClient } from "../../llm.ts";

declare module "@deepseek-ai/dsh-llm/types" {
  interface LlmRequestPurposeMap { "flowspace-judge": true }
}

const response = z.object({
  branch: z.string(), reason: z.string(), confidence: z.number().min(0).max(1),
});

export async function aiJudge(llm: LlmStreamClient, config: AiConfig, input: string, signal: AbortSignal) {
  const { provider, model, branches } = config;
  if (!provider || !model) throw new Error("请先选择 AI 判断的供应商和模型");
  const rawOutputs: string[] = [];
  const telemetry: StepTelemetry = { stepCount: 0, inputTokens: 0, outputTokens: 0 };
  const record = { provider, model, inputSummary: input.slice(0, 240), rawOutputs };
  const system = [config.instruction, JSON.stringify(branches),
    '选择一个列出的分支。只返回 JSON {"branch":"分支 id","reason":"判断理由","confidence":0-1}。'].join("\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    telemetry.stepCount++;
    const res = await streamLlmText(llm, {
      provider,
      model,
      signal,
      purpose: "flowspace-judge",
      system: attempt ? system + "\n上次响应无法解析，请严格使用指定格式和分支。" : system,
      userText: input,
    });
    telemetry.inputTokens += res.inputTokens;
    telemetry.outputTokens += res.outputTokens;
    rawOutputs.push(res.text);
    let parsed: unknown;
    try { parsed = JSON.parse(res.text); } catch { continue; }
    const result = response.safeParse(parsed);
    if (!result.success || !branches.some((b) => b.id === result.data.branch)) continue;
    const { branch, confidence, reason } = result.data;
    const route = config.lowConfidence && confidence < config.lowConfidence.threshold ? config.lowConfidence.branch : branch;
    return { route, output: reason, verdict: { ...record, branch: route, reason, confidence }, telemetry };
  }
  const reason = "连续两次未收到有效的判断结果";
  const verdict: NonNullable<RunStep["verdict"]> = { ...record, branch: "error", reason };
  return { route: "error", output: reason, verdict, telemetry };
}
