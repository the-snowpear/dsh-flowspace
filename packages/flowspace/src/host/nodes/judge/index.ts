import type { Context } from "@deepseek-ai/cordis";
import { conditionRoute, type ConditionConfig, type HumanConfig, type CodeConfig, type AiConfig } from "../../../core/nodes/judge/index.ts";
import { forwardInput } from "../../../core/nodes/input.ts";
import type { NodeExecutor } from "../../../core/nodes/types.ts";
import type { DshRuntime } from "../../runtime.ts";
import { aiJudge } from "./ai.ts";
import { runCode } from "./code.ts";

export function judgeExecutors(ctx: Context, contextText: DshRuntime["contextText"]): Record<string, NodeExecutor> {
  return {
    "flowspace/condition": async (node, step) => {
      const source = await forwardInput(node, step, contextText);
      const config = node.config as ConditionConfig;
      const route = conditionRoute(config, source.text);
      return { route, source, output: config.branches.find((b) => b.id === route)?.label ?? route, verdict: { branch: route } };
    },
    "flowspace/code": async (node, step, signal) => {
      const source = await forwardInput(node, step, contextText);
      const config = node.config as CodeConfig;
      const value = await runCode(config.source, source, config.timeoutMs, signal);
      const route = value === true ? config.branches[0].id : value === false ? "else" : value;
      if (route !== "else" && !config.branches.some((b) => b.id === route)) throw new Error(`代码返回了未知分支：${route}`);
      return { route, source, output: config.branches.find((b) => b.id === route)?.label ?? route, verdict: { branch: route } };
    },
    "flowspace/ai-judge": async (node, step, signal) => {
      const source = await forwardInput(node, step, contextText);
      return { ...await aiJudge(ctx.llm, node.config as AiConfig, source.text, signal), source };
    },
    "flowspace/human-choice": async (node) => {
      const config = node.config as HumanConfig;
      const deadline = config.timeoutSec !== undefined && config.timeoutAction !== "wait" ? Date.now() + config.timeoutSec * 1000 : undefined;
      return { awaiting: { question: config.question, options: config.options.map((option) => option.id),
        timeoutAction: config.timeoutAction, deadline, defaultOption: config.defaultOption } };
    },
  };
}
