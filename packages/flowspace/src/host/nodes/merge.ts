import type { ContextSnapshot, FlowNode, JsonValue, RunStep } from "../../types.ts";
import { contentList, contentOf, DEFAULT_LIST_LIMIT } from "../../core/content.ts";
import type { MergeConfig } from "../../core/nodes/fanout.ts";
import { conditionRoute } from "../../core/nodes/judge/condition.ts";
import { snapshotWithContent } from "../../core/nodes/input.ts";
import type { NodeExecutor } from "../../core/nodes/types.ts";
import { aiJudge } from "./judge/ai.ts";
import { runCode } from "./judge/code.ts";

/** The scheduler supplies one frozen aggregate for a paired merge. A standalone
 * merge can also receive content directly at its ordinary or list input. */
function mergedInput(node: FlowNode, step: RunStep, format: MergeConfig["output"], limit: number): ContextSnapshot {
  const first = step.sources[0];
  if (step.sources.length === 1 && contentOf(first).dataType === format &&
      (first.content?.items?.length ?? 0) <= limit) return first;
  const values: JsonValue[] = [];
  const keys: (string | undefined)[] = [];
  let total = 0;
  const sourceCounts = new Map<string, number>();
  for (const source of step.sources) {
    const content = contentOf(source);
    if (content.items) {
      total += content.originalCount ?? content.items.length;
      const occurrence = sourceCounts.get(source.sourceNodeId) ?? 0;
      sourceCounts.set(source.sourceNodeId, occurrence + 1);
      for (const item of content.items.slice(0, limit - values.length)) {
        values.push(item.value!); // DshRuntime hydrated spilled items before execution.
        keys.push(step.sources.length === 1 ? item.key : JSON.stringify([source.sourceNodeId, occurrence, item.key]));
      }
    } else {
      total++;
      if (values.length < limit) {
        values.push(content.value === undefined ? source.text : content.value);
        keys.push(undefined);
      }
    }
  }
  const content = format === "list" ? contentList(values, limit, keys) : {
    dataType: "text" as const, value: values.map(value => typeof value === "string" ? value : JSON.stringify(value)).join("\n"),
  };
  if (total > values.length) Object.assign(content, { originalCount: total });
  return snapshotWithContent(node, content, step.createdAt);
}

export function mergeExecutor(ctx: { llm: Parameters<typeof aiJudge>[0] },
  getListLimit: (step: RunStep) => number = () => DEFAULT_LIST_LIMIT,
): NodeExecutor {
  return async (node, step, signal) => {
    signal.throwIfAborted();
    const config = node.config as MergeConfig;
    const source = mergedInput(node, step, config.output, getListLimit(step));
    if (!config.sortMode || config.sortMode === "off") return { source, route: "out", output: source.text };
    try {
      if (config.sortMode === "ai") {
        const settings = config.ai;
        const result = await aiJudge(ctx.llm, {
          provider: settings.provider, model: settings.model, instruction: settings.instruction,
          branches: [
            { id: "pass", label: "pass", description: settings.passDescription },
            { id: "fail", label: "fail", description: settings.failDescription },
          ],
          lowConfidence: { threshold: settings.threshold, branch: "fail" },
        }, source.text, signal);
        return { ...result, source, output: result.route === "error" ? result.output : source.text };
      }
      let route: string;
      if (config.sortMode === "condition") {
        const selected = conditionRoute({ branches: [{ id: "pass", label: "pass", ...config.condition }] }, source.text);
        route = selected === "pass" ? "pass" : "fail";
      } else {
        const value = await runCode(config.code.source, source, config.code.timeoutMs, signal);
        if (value === true || value === "pass") route = "pass";
        else if (value === false || value === "fail") route = "fail";
        else throw new Error("分拣脚本须返回布尔值、pass 或 fail");
      }
      return { source, route, output: source.text, verdict: { branch: route } };
    } catch (error) {
      signal.throwIfAborted();
      const reason = error instanceof Error ? error.message : String(error);
      return { source, route: "error", output: reason, verdict: { branch: "error", reason } };
    }
  };
}
