import type {
  ContextSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceRun,
  FlowToken,
  RunStep,
} from "../types.ts";
import { isContainer } from "./containers.ts";
import { uid } from "./document.ts";
import { activeEdges } from "./graph.ts";
import { isExecutable } from "./nodes/registry.ts";
import { isActiveStep as activeStep, type RuntimeAdapter } from "./schedulerTypes.ts";

export function consumeToken(token: FlowToken): void {
  if (token.consumed) return;
  token.consumed = true;
  token.consumedAt = Date.now();
}

export function markTokenReady(
  run: FlowspaceRun,
  token: FlowToken,
  at = Date.now(),
): void {
  token.readyAt = at;
  if (token.fanoutBatchId) {
    token.readyOrder = run.fanoutReadyOrder = (run.fanoutReadyOrder ?? 0) + 1;
  }
}

export function addNoteOnce(run: FlowspaceRun, note: string): void {
  if (!run.notes.includes(note)) run.notes.push(note);
}

export function edgeFires(
  run: FlowspaceRun,
  edge: FlowEdge,
  step: RunStep,
  selected: boolean,
): boolean {
  const logic = edge.logic;
  const routed = logic?.negate ? !selected : selected;
  if (!routed) return false;
  if (step.iteration < (logic?.fromRound ?? 0)) return false;
  return (
    logic?.maxTimes === undefined ||
    run.tokens.filter((token) => token.edgeId === edge.id && !token.skip)
      .length < logic.maxTimes
  );
}

export function pushToken(
  run: FlowspaceRun,
  edge: FlowEdge,
  step: RunStep,
  target: FlowNode,
  source: ContextSnapshot | undefined,
  planGate: boolean,
  armDelay: (run: FlowspaceRun, token: FlowToken) => void,
  origin: Pick<FlowToken, "streamFrom" | "fanoutBatchId"> = step,
): void {
  const now = Date.now();
  const boundary = !!source && !!run.scope && !run.scope.includes(target.id);
  const needsRelease =
    !!source &&
    (planGate ||
      boundary ||
      edge.trigger === "confirm" ||
      target.participation === "manual");
  const delayUntil =
    source && edge.logic?.delayMs ? now + edge.logic.delayMs : undefined;
  const ready = !needsRelease && delayUntil === undefined;
  const token: FlowToken = {
    id: uid(),
    edgeId: edge.id,
    stepId: step.id,
    ...(origin.streamFrom ? { streamFrom: origin.streamFrom } : {}),
    ...(origin.fanoutBatchId &&
    (target.generatedBy || target.flowType === "flowspace/merge-sort")
      ? { fanoutBatchId: origin.fanoutBatchId }
      : {}),
    source: source ?? {
      id: uid(),
      kind: "text",
      sourceNodeId: edge.source,
      text: "",
      title: "",
      capturedAt: now,
    },
    ...(source ? {} : { skip: true }),
    ...(source && planGate ? { planGate: true } : {}),
    ...(needsRelease ? { needsRelease: true } : {}),
    createdAt: now,
    delayUntil,
    readyAt: ready ? now : delayUntil,
    boundary,
    ready,
    consumed: false,
    dismissed: false,
  };
  if (ready) {
    markTokenReady(
      run,
      token,
      token.fanoutBatchId && step.endedAt ? step.endedAt : now,
    );
  }
  run.tokens.push(token);
  if (delayUntil !== undefined) armDelay(run, token);
}

/**
 * Capture upstream snapshots at exact `seq` and route tokens across outgoing active
 * edges, respecting `paused` stops, `scope` boundaries, `confirm`/`manual` gates,
 * and `R2` Plan gates.
 */
export async function emitDownstreamTokens(
  runtime: RuntimeAdapter,
  armDelay: (run: FlowspaceRun, token: FlowToken) => void,
  run: FlowspaceRun,
  step: RunStep,
  sourceNode: FlowNode,
  sessionId: string | undefined,
  seq: number | undefined,
  output: string,
  planGateActive: boolean,
  forwarded?: ContextSnapshot,
  omit?: Set<string>,
): Promise<void> {
  const outgoing = activeEdges(run.graph.edges).filter(
    (edge) => edge.source === sourceNode.id,
  );
  if (planGateActive && outgoing.length) {
    addNoteOnce(
      run,
      `${sourceNode.title}：Plan 模式尚未退出计划态，已暂停自动接续等待确认计划`,
    );
  }
  for (const edge of outgoing) {
    if (omit?.has(edge.id)) continue;
    const target = run.graph.nodes.find((node) => node.id === edge.target);
    if (
      !target ||
      target.participation === "paused" ||
      (!isExecutable(target) && !isContainer(target))
    ) {
      continue;
    }
    const selected = (edge.sourcePort ?? "out") === (step.route ?? "out");
    const fires =
      step.state !== "skipped" && edgeFires(run, edge, step, selected);
    try {
      const mode =
        target.participation === "bypassed" && edge.mode === "fork"
          ? "conclusion"
          : edge.mode;
      const source = fires
        ? (forwarded ??
          (await runtime.capture({ ...sourceNode, sessionId }, mode, seq, output)))
        : undefined;
      pushToken(run, edge, step, target, source, planGateActive, armDelay);
    } catch (error) {
      run.notes.push(`${sourceNode.title} → ${target.title}: ${String(error)}`);
      run.state = "error";
    }
  }
}

export function forwardThroughBypass(
  run: FlowspaceRun,
  node: FlowNode,
  token: FlowToken,
  step: RunStep,
  cycleEdges: Set<string>,
  armDelay: (run: FlowspaceRun, token: FlowToken) => void,
): void {
  addNoteOnce(run, `${node.title}：已旁路透传上游上下文`);
  for (const edge of activeEdges(run.graph.edges).filter(
    (candidate) => candidate.source === node.id,
  )) {
    const target = run.graph.nodes.find((entry) => entry.id === edge.target);
    if (!target || target.participation === "paused" || !isExecutable(target)) {
      continue;
    }
    // A bypass cycle cannot generate additional copies of the same originating delivery.
    const fires = !token.skip && edgeFires(run, edge, step, true);
    if (
      cycleEdges.has(edge.id) &&
      run.tokens.some(
        (seen) =>
          seen.edgeId === edge.id &&
          seen.stepId === step.id &&
          Boolean(seen.skip) === !fires,
      )
    ) {
      continue;
    }
    pushToken(
      run,
      edge,
      step,
      target,
      fires ? token.source : undefined,
      false,
      armDelay,
      token,
    );
  }
}

export function hasDurableWait(run: FlowspaceRun): boolean {
  return (
    !!run.pendingEvents?.length ||
    !!run.fanouts?.some(
      (batch) =>
        !batch.mergeStepId ||
        batch.lanes.some(
          (lane) => lane.state === "queued" || lane.state === "running",
        ),
    ) ||
    run.steps.some((step) => step.state === "awaiting") ||
    run.tokens.some(
      (token) =>
        !token.consumed && !token.dismissed && token.delayUntil !== undefined,
    )
  );
}

export function settleRun(run: FlowspaceRun): void {
  for (const step of run.steps) {
    if (step.state === "completed" && step.route === "error" && step.error) {
      step.state = "error";
    }
  }
  if (["paused", "cancelled", "interrupted"].includes(run.state)) return;
  if (run.steps.some((s) => s.state === "awaiting")) {
    run.state = "waiting";
  } else if (run.steps.some(activeStep)) {
    run.state = "running";
  } else if (
    run.tokens.some(
      (t) => !t.skip && !t.consumed && !t.dismissed && !t.ready,
    )
  ) {
    run.state = "waiting";
  } else if (
    run.pendingEvents?.length ||
    run.fanouts?.some((batch) =>
      batch.lanes.some((lane) => lane.state === "queued"),
    )
  ) {
    run.state = "waiting";
  } else if (
    run.steps.some((step) => {
      if (step.emission?.reminderStepId) return false;
      if (
        step.itemKey &&
        run.fanouts?.some(
          (batch) =>
            batch.id === step.fanoutBatchId &&
            batch.mergeStepId &&
            batch.lanes.some(
              (lane) => lane.item.key === step.itemKey && lane.adopted === false,
            ),
        )
      ) {
        return false;
      }
      if (step.state === "error" && step.route === "error") {
        return !run.tokens.some(
          (token) => token.stepId === step.id && !token.skip,
        );
      }
      return ["error", "aborted", "interrupted"].includes(step.state);
    }) ||
    run.state === "error"
  ) {
    run.state = "error";
  } else if (
    run.tokens.some((t) => !t.skip && !t.consumed && !t.dismissed)
  ) {
    run.state = "error";
    addNoteOnce(
      run,
      "接续无法汇合：有分支被跳过或未产生本轮结果。可从目标节点手动继续。",
    );
  } else {
    run.state = "completed";
  }
}
