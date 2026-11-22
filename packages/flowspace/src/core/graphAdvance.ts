import type {
  ContextMode,
  ContextSnapshot,
  ExtendLoopRequest,
  FlowspaceRun,
  FlowToken,
  RunStep,
} from "../types.ts";
import { isContainer } from "./containers.ts";
import { uid } from "./document.ts";
import { fanoutPair } from "./fanout.ts";
import { activeEdges, graphOrder, isFanoutMaster, reachable } from "./graph.ts";
import { triggerNode } from "./nodes/interactions.ts";
import { isExecutable } from "./nodes/registry.ts";
import {
  addNoteOnce,
  consumeToken,
  emitDownstreamTokens,
  forwardThroughBypass,
  markTokenReady,
} from "./schedulerTokens.ts";
import {
  isActiveStep as activeStep,
  type RuntimeAdapter,
  type SchedulerStore,
} from "./schedulerTypes.ts";

export interface GraphAdvanceHost {
  runtime: RuntimeAdapter;
  store: SchedulerStore;
  armDelay: (run: FlowspaceRun, token: FlowToken) => void;
  enqueue: (
    run: FlowspaceRun,
    nodeId: string,
    sources: ContextSnapshot[],
    isContinuation: boolean,
    reminder: RunStep | undefined,
    origin: Pick<
      RunStep,
      "streamFrom" | "fanoutBatchId" | "sourcePorts" | "upstreamStepIds"
    >,
  ) => Promise<void>;
}

/** Collect latest completed outputs from upstream sessions when starting mid-DAG (`from-node` / `to-node`). */
export async function collectCompletedUpstreamSources(
  runtime: RuntimeAdapter,
  run: FlowspaceRun,
  targetId: string,
): Promise<ContextSnapshot[]> {
  const out: ContextSnapshot[] = [];
  const links = activeEdges(run.graph.edges);
  const seen = new Set<string>([targetId]);
  const walkBack = async (curId: string, fallbackMode: ContextMode) => {
    for (const e of links) {
      if (e.target !== curId || run.roots.includes(e.source)) continue;
      const src = run.graph.nodes.find((n) => n.id === e.source);
      if (!src || src.participation === "paused" || seen.has(src.id)) continue;
      seen.add(src.id);
      if (src.participation === "bypassed") {
        await walkBack(src.id, e.mode === "fork" ? "conclusion" : e.mode);
        continue;
      }
      if (src.sessionId) {
        try {
          const mode: ContextMode = e.mode === "fork" ? fallbackMode : e.mode;
          const snap = await runtime.capture(src, mode);
          if (snap.text.trim()) out.push(snap);
        } catch {
          /* Upstream session has no completed output yet; proceed without it */
        }
      }
    }
  };
  await walkBack(targetId, "conclusion");
  return out;
}

/** Deliver ready tokens targeting container nodes (notes/boards/files/variables). */
export async function deliverContainers(
  store: SchedulerStore,
  run: FlowspaceRun,
): Promise<void> {
  const deliveries = new Map(
    run.graph.edges
      .filter(
        (edge) =>
          edge.kind !== "reference" &&
          run.graph.nodes.some(
            (node) => node.id === edge.target && isContainer(node),
          ),
      )
      .map((edge) => [edge.id, edge]),
  );
  for (const token of run.tokens) {
    const edge = deliveries.get(token.edgeId);
    if (!edge || !token.ready || token.dismissed || token.consumed) continue;
    if (!token.skip) {
      try {
        await store.deliver?.(run, edge, token);
      } catch (error) {
        run.state = "error";
        addNoteOnce(run, `投递失败：${String(error)}`);
      }
    }
    consumeToken(token);
  }
}

/**
 * Advances the DAG/SCC join barrier: resolves bypass forwarding, bounded-loop caps,
 * join readiness, skipped-branch propagation, and downstream step admission.
 */
export async function advanceGraph(
  host: GraphAdvanceHost,
  run: FlowspaceRun,
): Promise<void> {
  const nodes = new Map(run.graph.nodes.map((node) => [node.id, node]));
  const links = activeEdges(run.graph.edges).filter((edge) => {
    const source = nodes.get(edge.source),
      target = nodes.get(edge.target);
    return (
      source &&
      target &&
      (isExecutable(source) || source.flowType === triggerNode.flowType) &&
      isExecutable(target) &&
      !source.removed &&
      !target.removed &&
      !isFanoutMaster(run.graph, source) &&
      !isFanoutMaster(run.graph, target) &&
      !(edge.generatedBy && target.flowType === "flowspace/merge-sort") &&
      source.participation !== "paused" &&
      target.participation !== "paused"
    );
  });
  const edges = new Map(links.map((edge) => [edge.id, edge]));
  const { component, rank, cyclic } = graphOrder(
    run.graph.nodes,
    links,
    run.roots,
  );
  const bypassNodes = run.graph.nodes.filter(
    (node) => node.participation === "bypassed",
  );
  const bypassLinks = links.filter(
    (edge) =>
      nodes.get(edge.source)?.participation === "bypassed" &&
      nodes.get(edge.target)?.participation === "bypassed",
  );
  const bypassOrder = graphOrder(bypassNodes, bypassLinks, []);
  const bypassCycles = new Set(
    bypassLinks
      .filter((edge) => {
        const group = bypassOrder.component.get(edge.source)!;
        return (
          bypassOrder.cyclic.has(group) &&
          group === bypassOrder.component.get(edge.target)
        );
      })
      .map((edge) => edge.id),
  );
  const feedback = new Set<string>();
  const limits = new Map<number, number>();
  for (const edge of links) {
    const group = component.get(edge.source)!;
    if (!cyclic.has(group) || group !== component.get(edge.target)) continue;
    limits.set(group, Math.min(limits.get(group) ?? Infinity, edge.maxRounds));
    if (rank.get(edge.source)! >= rank.get(edge.target)!) feedback.add(edge.id);
  }

  let progressed: boolean;
  do {
    progressed = false;
    const steps = new Map(run.steps.map((step) => [step.id, step]));
    const frontier = run.steps
      .filter(
        (s) =>
          activeStep(s) ||
          ["awaiting", "error", "interrupted", "aborted"].includes(s.state),
      )
      .map((s) => s.nodeId);
    const delivered = new Set<string>();
    for (const token of run.tokens) {
      const edge = edges.get(token.edgeId);
      if (!edge) continue;
      delivered.add(edge.id);
      if (token.consumed || token.dismissed) continue;
      if (token.skip && feedback.has(edge.id)) {
        consumeToken(token);
        progressed = true;
      } else {
        frontier.push(edge.target);
      }
    }
    const producers = new Set(reachable([...new Set(frontier)], links));
    for (const nodeId of run.participants) {
      const node = nodes.get(nodeId)!;
      if (!node || !isExecutable(node) || node.participation === "paused") {
        continue;
      }
      const incoming = links.filter(
        (edge) =>
          edge.target === nodeId &&
          (delivered.has(edge.id) || producers.has(edge.source)),
      );
      if (!incoming.length) continue;
      const pending = run.tokens.filter(
        (token) =>
          !token.consumed &&
          !token.dismissed &&
          edges.get(token.edgeId)?.target === nodeId,
      );
      if (!pending.length) continue;
      if (node.participation === "bypassed") {
        for (const token of pending) {
          if (!token.ready) continue;
          consumeToken(token);
          if (!token.skip || !feedback.has(token.edgeId)) {
            forwardThroughBypass(
              run,
              node,
              token,
              steps.get(token.stepId)!,
              bypassCycles,
              host.armDelay,
            );
          }
          progressed = true;
        }
        continue;
      }
      const batchId = node.generatedBy ? pending[0]?.fanoutBatchId : undefined;
      const count = run.steps.filter(
        (step) =>
          step.nodeId === nodeId && (!batchId || step.fanoutBatchId === batchId),
      ).length;
      const group = component.get(nodeId)!;
      const limit = limits.get(group) ?? Infinity;
      if (count >= limit) {
        for (const token of pending) {
          if (token.skip || token.loopCapReached) continue;
          token.loopCapReached = true;
          token.ready = false;
          delete token.readyAt;
          addNoteOnce(
            run,
            `${node.title}：已达到循环上限（${limit} 轮），可点击「+1 轮」继续或跳过完成`,
          );
        }
      }

      const chosen: FlowToken[] = [];
      let missing = false;
      for (const edge of incoming) {
        const back = feedback.has(edge.id);
        if (back && count === 0) continue;
        const internal = component.get(edge.source) === group;
        const candidates = run.tokens.filter((token) => {
          if (
            token.edgeId !== edge.id ||
            token.dismissed ||
            (batchId && token.fanoutBatchId !== batchId)
          ) {
            return false;
          }
          if (!internal) return true;
          const origin = steps.get(token.stepId)!;
          if (component.get(origin.nodeId) !== group) return true;
          const sourceFeedsBack = rank.get(origin.nodeId)! >= rank.get(nodeId)!;
          return origin.iteration === count + (sourceFeedsBack ? 0 : 1);
        });
        let token = candidates.find((t) => !t.consumed && (!back || !t.skip));
        if (back && !token && candidates.some((t) => t.skip)) continue;
        if (!token && !internal && cyclic.has(group)) token = candidates.at(-1);
        if (!token?.ready) {
          missing = true;
          break;
        }
        chosen.push(token);
      }
      if (missing || !chosen.some((token) => !token.consumed)) continue;
      const live = chosen.filter((token) => !token.skip);
      const fires = live.some((token) => !token.consumed);
      chosen.forEach(consumeToken);
      progressed = true;
      if (fires) {
        await host.enqueue(
          run,
          nodeId,
          live.map((token) => token.source),
          true,
          undefined,
          {
            ...(node.kind === "flow"
              ? {
                  sourcePorts: live.map(
                    (token) => edges.get(token.edgeId)?.targetPort ?? "in",
                  ),
                }
              : {}),
            fanoutBatchId: batchId,
            streamFrom: live.find((token) => token.streamFrom)?.streamFrom,
            upstreamStepIds: [...new Set(live.map((token) => token.stepId))],
          },
        );
      } else {
        const now = Date.now();
        const step: RunStep = {
          id: uid(),
          requestId: uid(),
          nodeId,
          iteration: count + 1,
          state: "skipped",
          sources: [],
          task: "",
          createdAt: now,
          endedAt: now,
          ...(batchId
            ? {
                fanoutBatchId: batchId,
                fanoutId: node.generatedBy,
                itemKey: node.itemKey,
              }
            : {}),
        };
        run.steps.push(step);
        steps.set(step.id, step);
        const pair =
          node.flowType === "flowspace/fanout" &&
          fanoutPair(run.graph, node.id);
        if (pair) {
          const merge = {
            ...step,
            id: uid(),
            requestId: uid(),
            nodeId: pair.merge.id,
            fanoutId: node.id,
          };
          run.steps.push(merge);
          await emitDownstreamTokens(
            host.runtime,
            host.armDelay,
            run,
            merge,
            pair.merge,
            undefined,
            undefined,
            "",
            false,
          );
        } else {
          await emitDownstreamTokens(
            host.runtime,
            host.armDelay,
            run,
            step,
            node,
            undefined,
            undefined,
            "",
            false,
          );
        }
      }
    }
  } while (progressed && run.state !== "error");
}

/** Applies `+N rounds` budget increase to the targeted SCC(s) and unparks feedback tokens. */
export function applyExtendLoop(
  run: FlowspaceRun,
  request: ExtendLoopRequest,
): boolean {
  const extra = Math.max(1, Math.trunc(request.extraRounds ?? 1));
  const order = graphOrder(run.graph.nodes, run.graph.edges, run.roots);
  const targetComps = new Set<number>();

  if (request.edgeId) {
    const edge = run.graph.edges.find((e) => e.id === request.edgeId);
    const comp = edge ? order.component.get(edge.target) : undefined;
    if (comp !== undefined && order.cyclic.has(comp)) targetComps.add(comp);
  } else if (request.nodeId) {
    const comp = order.component.get(request.nodeId);
    if (comp !== undefined && order.cyclic.has(comp)) targetComps.add(comp);
  } else {
    for (const t of run.tokens) {
      if (!t.loopCapReached || t.consumed || t.dismissed) continue;
      const edge = run.graph.edges.find((e) => e.id === t.edgeId);
      const comp = edge ? order.component.get(edge.target) : undefined;
      if (comp !== undefined && order.cyclic.has(comp)) targetComps.add(comp);
    }
  }

  if (!targetComps.size) return false;

  for (const edge of activeEdges(run.graph.edges)) {
    const sc = order.component.get(edge.source);
    const tc = order.component.get(edge.target);
    if (sc !== undefined && sc === tc && targetComps.has(sc)) {
      edge.maxRounds += extra;
    }
  }

  for (const token of run.tokens) {
    if (!token.loopCapReached || token.consumed || token.dismissed) continue;
    const edge = run.graph.edges.find((e) => e.id === token.edgeId);
    const comp = edge ? order.component.get(edge.target) : undefined;
    if (comp !== undefined && targetComps.has(comp)) {
      delete token.loopCapReached;
      if (
        !token.boundary &&
        !token.planGate &&
        !token.needsRelease &&
        token.delayUntil === undefined
      ) {
        token.ready = true;
        markTokenReady(run, token);
      }
    }
  }

  if (run.state === "waiting") run.state = "running";
  return true;
}
