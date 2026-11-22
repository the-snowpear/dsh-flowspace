import type {
  ContextSnapshot,
  FlowEdge,
  FlowEvent,
  FlowEventKind,
  FlowNode,
  FlowspaceRun,
  FlowToken,
  JsonObject,
  RunStep,
} from "../types.ts";
import { uid } from "./document.ts";
import { snapshotWithContent } from "./nodes/input.ts";
import { consumeToken, pushToken } from "./schedulerTokens.ts";
import type { RuntimeAdapter, SchedulerStore } from "./schedulerTypes.ts";

export interface EventRouterHost {
  runtime: RuntimeAdapter;
  store: SchedulerStore;
  schedule: (id: string, deadline: number, action: () => Promise<void>) => void;
  armDelay: (run: FlowspaceRun, token: FlowToken) => void;
  advance: (run: FlowspaceRun) => Promise<void>;
  settle: (run: FlowspaceRun) => void;
  enqueueEventTarget: (
    run: FlowspaceRun,
    nodeId: string,
    sources: ContextSnapshot[],
    origin: Pick<RunStep, "upstreamStepIds" | "sourcePorts">,
  ) => Promise<void>;
}

/**
 * Routes status/telemetry/container events over `event` wires with mode filtering
 * (`end`, `change`, `continuous`), cooldown batching, and `maxTimes` limits.
 */
export class EventRouter {
  constructor(private readonly host: EventRouterHost) {}

  async recordStatus(
    run: FlowspaceRun,
    step: RunStep,
    kind: FlowEventKind,
    summary?: string,
    reason?: string,
    seq?: number,
  ): Promise<void> {
    const edges = run.graph.edges.filter(
      (edge) => edge.kind === "event" && edge.source === step.nodeId,
    );
    if (!edges.length && ["tool", "output", "usage"].includes(kind)) return;
    const event: FlowEvent = {
      id: uid(),
      nodeId: step.nodeId,
      stepId: step.id,
      at: Date.now(),
      round: step.iteration,
      kind,
      summary: summary?.slice(0, 512),
      reason,
      sessionId: step.sessionId,
      seq: seq ?? step.endSeq,
      telemetry: step.telemetry && { ...step.telemetry },
    };
    (run.events ??= []).push(event);
    for (const edge of edges) {
      const policy = edge.event;
      const mode = policy?.mode ?? "end";
      if (
        edge.trigger === "off" ||
        (mode === "end" && !["done", "error"].includes(kind)) ||
        (mode === "change" && ["output", "usage", "tool"].includes(kind)) ||
        (mode === "continuous" && !["output", "usage", "tool"].includes(kind)) ||
        !(policy?.kinds ?? ["done", "error"]).includes(kind) ||
        (policy?.reasons?.length && (!reason || !policy.reasons.includes(reason)))
      ) {
        continue;
      }
      const prior = run.tokens.filter(
        (token) => token.edgeId === edge.id && !token.skip,
      );
      if (prior.length >= (policy?.maxTimes ?? Infinity)) continue;
      const dueAt = (prior.at(-1)?.createdAt ?? 0) + (policy?.cooldownMs ?? 0);
      const pending = run.pendingEvents?.find(
        (batch) =>
          batch.edgeId === edge.id &&
          batch.event.kind === kind &&
          batch.event.stepId === step.id,
      );
      if (mode === "continuous" && (pending || dueAt > event.at)) {
        const batch = pending ?? {
          edgeId: edge.id,
          event,
          content: "",
          dueAt,
        };
        if (!pending) (run.pendingEvents ??= []).push(batch);
        batch.event = event;
        batch.content +=
          (batch.content && kind !== "output" ? "\n" : "") + (summary ?? "");
        this.armEvent(run, batch);
      } else if (dueAt <= event.at) {
        await this.sendEvent(run, edge, event, summary);
      }
    }
  }

  async sendEvent(
    run: FlowspaceRun,
    edge: FlowEdge,
    event: FlowEvent,
    content?: string,
  ): Promise<void> {
    const origin = run.graph.nodes.find((node) => node.id === event.nodeId);
    const target = run.graph.nodes.find((node) => node.id === edge.target);
    const step = run.steps.find((s) => s.id === event.stepId);
    if (!origin || !step || !target || target.participation === "paused") return;
    const value = JSON.parse(
      JSON.stringify({
        ...event,
        ...(edge.event?.full || edge.event?.mode === "continuous"
          ? { content }
          : {}),
      }),
    ) as JsonObject;
    const snapshot = {
      ...snapshotWithContent(origin, { dataType: "record", value }),
      seq: event.seq,
      sourceSessionId: event.sessionId,
    };
    const frozen =
      (await this.host.runtime.freezeContent?.(
        snapshot,
        run.listLimit,
        event.sessionId,
      )) ?? snapshot;
    pushToken(run, edge, step, target, frozen, false, this.host.armDelay);
  }

  armEvent(
    run: FlowspaceRun,
    batch: NonNullable<FlowspaceRun["pendingEvents"]>[number],
  ): void {
    const timer = `event:${run.id}:${batch.edgeId}:${batch.event.stepId}:${batch.event.kind}`;
    this.host.schedule(timer, batch.dueAt, async () => {
      if (
        !run.pendingEvents?.includes(batch) ||
        ["cancelled", "interrupted", "error"].includes(run.state)
      ) {
        return;
      }
      const edge = run.graph.edges.find((e) => e.id === batch.edgeId);
      const prior = run.tokens.filter(
        (token) => token.edgeId === batch.edgeId && !token.skip,
      );
      const dueAt =
        (prior.at(-1)?.createdAt ?? 0) + (edge?.event?.cooldownMs ?? 0);
      if (dueAt > Date.now()) {
        batch.dueAt = dueAt;
        this.armEvent(run, batch);
        return;
      }
      run.pendingEvents = run.pendingEvents.filter((other) => other !== batch);
      if (edge && prior.length < (edge.event?.maxTimes ?? Infinity)) {
        await this.sendEvent(run, edge, batch.event, batch.content);
      }
      await this.host.advance(run);
      this.host.settle(run);
      await this.host.store.changed();
    });
  }

  async deliverEvents(run: FlowspaceRun, budgetOnly = false): Promise<void> {
    const edges = new Map(
      run.graph.edges
        .filter((edge) => edge.kind === "event")
        .map((edge) => [edge.id, edge]),
    );
    for (const token of run.tokens) {
      const edge = edges.get(token.edgeId);
      if (!edge || token.consumed || !token.ready || token.dismissed) continue;
      if (
        budgetOnly &&
        (!edge.event?.kinds.includes("budget") ||
          run.graph.nodes.find((node) => node.id === edge.target)?.flowType !==
            "flowspace/notice")
      ) {
        continue;
      }
      consumeToken(token);
      if (!token.skip) {
        await this.host.enqueueEventTarget(run, edge.target, [token.source], {
          upstreamStepIds: [token.stepId],
          sourcePorts: [edge.targetPort ?? "in"],
        });
      }
    }
  }
}

export function isStreamingOutputObserved(
  owner: { run: FlowspaceRun; step: RunStep } | undefined,
): boolean {
  return !!owner?.run.graph.edges.some(
    (edge) =>
      edge.kind === "event" &&
      edge.source === owner.step.nodeId &&
      edge.event?.mode === "continuous" &&
      edge.event.kinds.includes("output"),
  );
}

export function isNativeEventSubscribed(
  owner: { run: FlowspaceRun; step: RunStep } | undefined,
  kind: "tool" | "output" | "usage",
): boolean {
  return !!owner?.run.graph.edges.some(
    (edge) =>
      edge.kind === "event" &&
      edge.source === owner.step.nodeId &&
      edge.event?.mode === "continuous" &&
      edge.event.kinds.includes(kind),
  );
}

export type EventNode = FlowNode;
