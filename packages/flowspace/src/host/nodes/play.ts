import { randomInt } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import type { KvTable } from "@deepseek-ai/dsh-storage-domain";
import { budgetUsage } from "../../core/budget.ts";
import { snapshotWithContent } from "../../core/nodes/input.ts";
import { randomConfig, seededIndex } from "../../core/nodes/play.ts";
import type { NodeExecutor } from "../../core/nodes/types.ts";
import type { ArenaResult, FlowspaceRun, RunReport, TeamModel } from "../../types.ts";

declare module "@deepseek-ai/dsh-llm/types" {
  interface LlmRequestPurposeMap { "flowspace-run-report": true }
}

type Counter = { next: number; lastStep: string; index: number };
export const randomExecutor = (counter: KvTable<string, Counter>): NodeExecutor => async (node, step) => {
  const config = randomConfig.parse(node.config);
  const count = config.branches.length;
  let index: number;
  if (config.mode === "rotation") {
    const state = counter.get(node.id);
    if (state?.lastStep === step.id) index = state.index % count;
    else {
      index = (state?.next ?? 0) % count;
      await counter.put(node.id, { next: index + 1, lastStep: step.id, index });
    }
  } else index = config.seed ? seededIndex(config.seed, step.iteration, count) : randomInt(count);
  const option = config.branches[index];
  const source = snapshotWithContent(node, { dataType: "text", value: option.value || option.label });
  return { route: option.id, output: source.text, source, verdict: { branch: option.id } };
};

export class ArenaStore {
  constructor(private readonly table: KvTable<string, ArenaResult>) {}
  list() { return [...this.table.entries()].map(([, result]) => result); }
  async settle(run: FlowspaceRun) {
    if (run.state !== "completed") return;
    for (const batch of run.fanouts ?? []) {
      const merge = run.graph.nodes.find(node => node.id === batch.mergeId);
      if (!merge?.config?.arena || !batch.mergeStepId || !batch.lanes.some(lane => lane.adopted === true)) continue;
      for (const lane of batch.lanes) {
        if (!lane.model || lane.adopted === undefined) continue;
        const id = JSON.stringify([run.id, batch.id, lane.item.key]);
        if (this.table.get(id)) continue;
        await this.table.put(id, { id, runId: run.id, tag: String(merge.config.taskTag || ""), model: lane.model, won: lane.adopted });
      }
    }
  }
}

export async function buildReport(ctx: Context, run: FlowspaceRun, model: TeamModel): Promise<RunReport> {
  const ended = Math.max(run.createdAt, ...run.steps.map(step => step.endedAt ?? step.createdAt));
  const usage = budgetUsage(run.steps, run.createdAt, ended);
  const scores = run.fanouts?.flatMap(batch => batch.lanes.filter(lane => lane.adopted).map(lane => ({ batch, lane }))) ?? [];
  const chosen = scores.toSorted((a, b) => (b.lane.score ?? 0) - (a.lane.score ?? 0))[0];
  const best = chosen && run.graph.nodes.find(node => node.generatedBy === chosen.batch.fanId && node.itemKey === chosen.lane.item.key);
  const bestNode = best?.title ?? run.graph.nodes.find(node =>
    node.id === run.steps.findLast(step => step.state === "completed" && step.sessionId)?.nodeId)?.title;
  let summary = "";
  for await (const chunk of ctx.llm.stream({
    provider: model.provider as Parameters<Context["llm"]["stream"]>[0]["provider"],
    model: model.model, purpose: "flowspace-run-report",
    system: "Summarize this completed FlowSpace run in three short sentences using the provided results.",
    messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify({ title: run.title, ...usage, bestNode,
      steps: run.steps.slice(-40).map(step => ({ state: step.state, task: step.task.slice(0, 180), output: step.output?.slice(0, 480) })),
      artifacts: run.deliverables?.map(artifact => artifact.path),
    }) }] }],
  })) {
    if (chunk.type === "text-delta") summary += chunk.text;
    if (chunk.type === "finish" && (chunk.reason.kind === "error" || chunk.reason.kind === "aborted"))
      throw new Error(chunk.reason.failure.message);
  }
  if (!summary.trim()) throw new Error("模型没有返回战报");
  return { summary, ...usage, bestNode, artifacts: run.deliverables ?? [] };
}
