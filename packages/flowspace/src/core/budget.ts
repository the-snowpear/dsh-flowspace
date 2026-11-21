import type { BudgetLimits, FlowspaceRun, RunStep } from "../types.ts";

export function budgetUsage(steps: readonly RunStep[], start: number, now: number): Required<BudgetLimits> {
  const active = steps.filter(step => !!step.startedAt || (step.state !== "queued" && step.state !== "awaiting"));
  return {
    tokens: steps.reduce((total, step) => total + (step.telemetry?.inputTokens ?? 0) + (step.telemetry?.outputTokens ?? 0), 0),
    seconds: Math.max(0, (now - start) / 1000),
    rounds: active.length,
  };
}

export function budgetHit(run: FlowspaceRun, step: RunStep, beforeDispatch: boolean, now: number) {
  const limitForNode = run.graph.nodes.find(node => node.id === step.nodeId)?.budget;
  const sets = [
    { key: "run", nodeId: undefined, limits: run.budget, steps: run.steps, start: run.createdAt },
    { key: step.nodeId, nodeId: step.nodeId, limits: limitForNode,
      steps: run.steps.filter(entry => entry.nodeId === step.nodeId), start: step.startedAt ?? now },
  ];
  for (const set of sets) {
    if (!set.limits) continue;
    const usage = budgetUsage(set.steps, set.start, now);
    for (const dimension of ["tokens", "seconds", "rounds"] as const) {
      const limit = set.limits[dimension];
      const key = `${set.key}:${dimension}`;
      const value = usage[dimension] + (beforeDispatch && dimension === "rounds" ? 1 : 0);
      if (limit !== undefined && value > limit && !run.budgetAcknowledged?.includes(key))
        return { key, nodeId: set.nodeId, dimension, value, limit, at: now };
    }
  }
}
