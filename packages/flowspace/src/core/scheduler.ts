import type {
  ContextSnapshot,
  DataCallTrace,
  ExtendLoopRequest,
  FlowContent,
  FlowEdge,
  FlowNode,
  FlowspaceRun,
  FlowToken,
  JsonObject,
  JsonValue,
  RunFanout,
  RunFanoutLane,
  RunStep,
  StartRequest,
  TeamReference,
} from "../types.ts";
import { budgetHit } from "./budget.ts";
import { DEFAULT_LIST_LIMIT } from "./content.ts";
import {
  members,
  syncUntitledAgentNode,
  syncUntitledAgentTitles,
  uid,
} from "./document.ts";
import { EmissionController } from "./emissionController.ts";
import {
  EventRouter,
  isNativeEventSubscribed,
  isStreamingOutputObserved,
} from "./eventRouter.ts";
import { staticFanoutContent } from "./fanout.ts";
import {
  ancestorsOf,
  isFanoutMaster,
  launchPlan,
  reachable,
} from "./graph.ts";
import {
  advanceGraph,
  applyExtendLoop,
  collectCompletedUpstreamSources,
  deliverContainers,
} from "./graphAdvance.ts";
import { HumanGateController } from "./humanGate.ts";
import { forwardInput } from "./nodes/input.ts";
import { triggerNode } from "./nodes/interactions.ts";
import { descriptorOf, isExecutable } from "./nodes/registry.ts";
import type { ExecResult } from "./nodes/types.ts";
import { FanoutExecution, laneSessionTitle } from "./runFanout.ts";
import {
  addNoteOnce,
  consumeToken,
  emitDownstreamTokens,
  hasDurableWait,
  markTokenReady,
  pushToken,
  settleRun,
} from "./schedulerTokens.ts";
import {
  isActiveStep as activeStep,
  type RuntimeAdapter,
  type SchedulerStore,
} from "./schedulerTypes.ts";
import { staffedIds, teamIdOf } from "./team.ts";

export type { RuntimeAdapter, SchedulerStore };

/** Durable run ownership. A promise queue serializes commands, never model execution. */
export class Scheduler {
  readonly runs: FlowspaceRun[];
  private serial: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private teamSettlements = new Set<string>();
  private executions = new Map<string, AbortController>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private fanout: FanoutExecution;
  private events: EventRouter;
  private emissions: EmissionController;
  private humanGate: HumanGateController;

  constructor(
    private runtime: RuntimeAdapter,
    private store: SchedulerStore,
    runs: FlowspaceRun[] = [],
  ) {
    this.runs = runs;
    this.fanout = new FanoutExecution(runtime, store, runs);
    this.events = new EventRouter({
      runtime,
      store,
      schedule: (id, deadline, action) => this.schedule(id, deadline, action),
      armDelay: (run, token) => this.armDelay(run, token),
      advance: (run) => this.advance(run),
      settle: (run) => settleRun(run),
      enqueueEventTarget: (run, nodeId, sources, origin) =>
        this.enqueue(run, nodeId, sources, true, undefined, origin),
    });
    this.emissions = new EmissionController({
      runtime,
      store,
      isDisposed: () => this.disposed,
      activeSessionStep: (sessionId) => this.activeSessionStep(sessionId),
      armDelay: (run, token) => this.armDelay(run, token),
      advance: (run) => this.advance(run),
      settle: (run) => settleRun(run),
    });
    this.humanGate = new HumanGateController({
      runtime,
      store,
      isDisposed: () => this.disposed,
      schedule: (id, deadline, action) => this.schedule(id, deadline, action),
      clearTimer: (id) => this.clearTimer(id),
      execute: (run, step, node) => this.execute(run, step, node),
      finishExecStep: (run, step, result, skipped) =>
        this.finishExecStep(run, step, result, skipped),
    });
  }

  transact<T>(action: () => Promise<T>): Promise<T> {
    const next = this.serial.then(action);
    this.serial = next.catch(() => undefined);
    return next;
  }

  busy(): Set<string> {
    const sessions = new Set(this.runtime.running?.() ?? []);
    return new Set([
      ...this.runs.flatMap((r) => r.steps.filter(activeStep).map((s) => s.nodeId)),
      ...this.store
        .document()
        .nodes.filter((n) => n.sessionId && sessions.has(n.sessionId))
        .map((n) => n.id),
    ]);
  }

  waiting(): Set<string> {
    return new Set(
      this.runs.flatMap((r) =>
        r.tokens
          .filter(
            (t) =>
              !t.ready &&
              !t.consumed &&
              !t.dismissed &&
              (!t.delayUntil || t.needsRelease),
          )
          .flatMap((t) => {
            const edge = r.graph.edges.find((e) => e.id === t.edgeId);
            return edge ? [edge.target] : [];
          }),
      ),
    );
  }

  plan(request: StartRequest) {
    return launchPlan(
      this.store.document(),
      request,
      this.busy(),
      this.waiting(),
    );
  }

  async start(request: StartRequest): Promise<FlowspaceRun> {
    return this.transact(async () => {
      const doc = this.store.document();
      syncUntitledAgentTitles(doc);
      const plan =
        request.kind === "single"
          ? launchPlan(doc, request, new Set(), new Set())
          : this.plan(request);
      plan.roots = plan.roots.filter(
        (id) => !request.excludeRootIds?.includes(id),
      );
      if (!plan.roots.length) throw new Error("没有可启动的 Agent 或静态输入节点");

      const expandIds = (ids: string[]) =>
        ids.flatMap((id) =>
          doc.nodes.find((n) => n.id === id)?.kind === "group"
            ? members(doc, id)
            : [id],
        );

      const scope =
        request.kind === "global" || request.kind === "single"
          ? null
          : request.kind === "from-node"
            ? reachable(expandIds(request.nodeIds), doc.edges, doc.nodes)
            : request.kind === "to-node"
              ? ancestorsOf(expandIds(request.nodeIds), doc.edges, doc.nodes)
              : expandIds(request.nodeIds);

      const groupTitles =
        request.kind === "group"
          ? request.nodeIds
              .map(
                (id) =>
                  doc.nodes.find((n) => n.id === id && n.kind === "group")
                    ?.title,
              )
              .filter((t): t is string => Boolean(t?.trim()))
          : [];
      const customTitle = groupTitles.length
        ? groupTitles.join(" · ")
        : undefined;

      const run = this.create(plan.roots, scope, "canvas", customTitle);
      await this.store.changed();

      for (const id of run.roots) {
        const node = run.graph.nodes.find((n) => n.id === id)!;
        const incomingFork = run.graph.edges.find(
          (e) => e.target === id && e.mode === "fork",
        );
        let sources: ContextSnapshot[] = [];
        let treatAsContinuation = false;
        if (incomingFork && !node.sessionId) {
          try {
            sources = [
              await this.runtime.capture(
                run.graph.nodes.find((n) => n.id === incomingFork.source)!,
                "fork",
              ),
            ];
          } catch (error) {
            run.state = "error";
            run.notes.push(String(error));
            continue;
          }
        } else if (
          request.kind === "from-node" ||
          request.kind === "to-node"
        ) {
          const seeded = await collectCompletedUpstreamSources(
            this.runtime,
            run,
            id,
          );
          if (seeded.length) {
            sources = seeded;
            treatAsContinuation = true;
          }
        }
        await this.enqueue(run, id, sources, treatAsContinuation);
      }
      if (run.fanouts?.length) await this.advance(run);
      settleRun(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }

  startTriggered(nodeId: string, input: ContextSnapshot): Promise<FlowspaceRun> {
    return this.transact(async () => {
      const node = this.store
        .document()
        .nodes.find(
          (n) => n.id === nodeId && n.flowType === triggerNode.flowType,
        );
      if (!node) throw new Error("触发器已移除");
      const run = this.create([nodeId], null, "trigger", node.title);
      run.triggerId = nodeId;
      const now = Date.now();
      const step: RunStep = {
        id: uid(),
        requestId: uid(),
        nodeId,
        state: "completed",
        iteration: 1,
        route: "out",
        sources: [input],
        task: "",
        output: input.text,
        createdAt: now,
        endedAt: now,
      };
      run.steps.push(step);
      input = (await this.runtime.freezeContent?.(input, run.listLimit)) ?? input;
      await emitDownstreamTokens(
        this.runtime,
        (r, t) => this.armDelay(r, t),
        run,
        step,
        node,
        undefined,
        undefined,
        input.text,
        false,
        input,
      );
      await this.advance(run);
      settleRun(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }

  nativeStatus(
    sessionId: string,
    kind: "tool" | "output" | "usage",
    summary: string,
    seq?: number,
  ): Promise<void> {
    return this.transact(async () => {
      const owner = this.activeSessionStep(sessionId);
      if (!owner || !isNativeEventSubscribed(owner, kind)) return;
      await this.events.recordStatus(
        owner.run,
        owner.step,
        kind,
        summary,
        undefined,
        seq,
      );
      await this.advance(owner.run);
      await this.store.changed();
    });
  }

  observesOutput(sessionId: string): boolean {
    return isStreamingOutputObserved(this.activeSessionStep(sessionId));
  }

  variableChanged(
    nodeId: string,
    summary: string,
    runId?: string,
    stepId?: string,
  ): Promise<void> {
    return this.transact(async () => {
      const graph = runId
        ? this.runs.find((run) => run.id === runId)?.graph
        : this.store.document();
      if (
        !graph?.edges.some(
          (edge) =>
            edge.source === nodeId &&
            edge.kind === "event" &&
            edge.event?.kinds.includes("container"),
        )
      ) {
        return;
      }
      const owner = runId && this.runs.find((run) => run.id === runId);
      const run =
        owner ||
        this.create(
          [nodeId],
          null,
          "trigger",
          graph.nodes.find((node) => node.id === nodeId)?.title,
        );
      if (!owner) run.triggerId = nodeId;
      const now = Date.now();
      const original = run.steps.find((step) => step.id === stepId);
      const step: RunStep = original
        ? { ...original, nodeId }
        : {
            id: uid(),
            nodeId,
            requestId: uid(),
            state: "completed",
            iteration: 1,
            createdAt: now,
            endedAt: now,
            task: "",
            sources: [],
            output: summary,
          };
      if (!original) run.steps.push(step);
      await this.events.recordStatus(run, step, "container", summary);
      await this.advance(run);
      settleRun(run);
      await this.store.changed();
    });
  }

  /** Rerun failed/interrupted nodes of a run and their affected downstream while reusing completed upstream snapshots (R5). */
  async rerunFailed(runId: string): Promise<FlowspaceRun> {
    return this.transact(async () => {
      const prev = this.requireRun(runId);
      const latestByNode = new Map<string, RunStep>();
      for (const step of prev.steps) latestByNode.set(step.nodeId, step);
      const failedRoots = [...latestByNode.entries()]
        .filter(([, step]) =>
          ["error", "aborted", "interrupted"].includes(step.state),
        )
        .map(([nodeId]) => nodeId)
        .filter((nodeId) =>
          this.store
            .document()
            .nodes.some((n) => n.id === nodeId && isExecutable(n)),
        );
      if (!failedRoots.length) {
        throw new Error("该次运行没有可重跑的失败或中断节点");
      }
      const doc = this.store.document();
      const scope = prev.scope
        ? [
            ...new Set([
              ...prev.scope,
              ...reachable(failedRoots, doc.edges, doc.nodes),
            ]),
          ]
        : null;
      const run = this.create(failedRoots, scope, "canvas");
      run.notes.push(`自运行 ${prev.title} 局部重跑失败节点及下游`);
      await this.store.changed();
      for (const id of run.roots) {
        const failedStep = latestByNode.get(id);
        const preservedSources = failedStep?.sources ?? [];
        await this.enqueue(
          run,
          id,
          preservedSources,
          preservedSources.length > 0,
          undefined,
          { sourcePorts: failedStep?.sourcePorts },
          !!failedStep,
        );
      }
      settleRun(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }

  private create(
    roots: string[],
    scope: string[] | null,
    origin: FlowspaceRun["origin"],
    customTitle?: string,
  ): FlowspaceRun {
    const doc = this.store.document();
    const run: FlowspaceRun = {
      id: uid(),
      title:
        customTitle ||
        roots
          .map((id) => doc.nodes.find((n) => n.id === id)?.title)
          .filter(Boolean)
          .join(" · "),
      origin,
      budget: doc.settings.budget,
      state: "running",
      createdAt: Date.now(),
      scope,
      roots,
      participants: reachable(roots, doc.edges, doc.nodes),
      graph: structuredClone({ nodes: doc.nodes, edges: doc.edges }),
      listLimit: doc.settings.listLimit ?? DEFAULT_LIST_LIMIT,
      steps: [],
      tokens: [],
      notes: [],
      deliverables: [],
    };
    for (const node of run.graph.nodes) {
      if (node.flowType !== "flowspace/fanout") continue;
      const inputs = run.graph.edges.filter(
        (edge) => edge.target === node.id && edge.kind === "reference",
      );
      for (const edge of inputs) {
        const frozen = staticFanoutContent(
          { nodes: run.graph.nodes, edges: [edge], settings: doc.settings },
          node.id,
        );
        if (!frozen) continue;
        if (inputs.length > 1 && frozen.items) {
          frozen.items = frozen.items.map((item) => ({
            ...item,
            key: JSON.stringify([edge.id, item.key]),
          }));
        }
        edge.snapshotContent = frozen;
      }
    }
    this.runs.push(run);
    return run;
  }

  /** Only direct user input not already owned by a workflow creates a chat run. */
  native(
    sessionId: string,
    requestId: string,
    task: string,
    canvas = false,
    sources: ContextSnapshot[] = [],
  ): Promise<void> {
    return this.transact(async () => {
      if (this.runs.some((r) => r.steps.some((s) => s.requestId === requestId)))
        return;
      const doc = this.store.document(),
        node = doc.nodes.find(
          (n) => n.kind === "agent" && n.sessionId === sessionId,
        );
      if (
        !node ||
        node.generatedBy ||
        isFanoutMaster(doc, node) ||
        node.participation === "paused" ||
        node.participation === "bypassed" ||
        !(
          canvas ||
          (node.nativeTrigger === "inherit"
            ? doc.settings.nativeChatTriggers
            : node.nativeTrigger === "enabled")
        )
      ) {
        return;
      }
      syncUntitledAgentNode(node);
      const run = this.create([node.id], null, canvas ? "canvas" : "chat");
      const teamId = teamIdOf(node, staffedIds(doc.nodes));
      run.steps.push({
        id: uid(),
        nodeId: node.id,
        requestId,
        sessionId,
        ...(teamId ? { teamRef: node.teamRef ?? { teamId } } : {}),
        state: "queued",
        iteration: 1,
        task,
        sources,
        createdAt: Date.now(),
      });
      await this.store.submitted(node.id, task, false);
      await this.store.changed();
    });
  }

  claim(
    requestId: string,
    turn: number,
    teamRef?: TeamReference,
  ): Promise<void> {
    return this.transact(async () => {
      const step = this.runs
        .flatMap((r) => r.steps)
        .find((s) => s.requestId === requestId);
      if (!step || step.endedAt) return;
      const existing = this.runs
        .flatMap((r) => r.steps)
        .find(
          (s) =>
            s !== step &&
            s.sessionId === step.sessionId &&
            s.turn === turn &&
            !s.endedAt,
        );
      if (existing) {
        existing.task += "\n\n" + step.task;
        const owner = this.runs.find((r) => r.steps.includes(step))!;
        owner.steps = owner.steps.filter((s) => s !== step);
        if (!owner.steps.length) this.runs.splice(this.runs.indexOf(owner), 1);
        await this.store.changed();
        return;
      }
      step.turn = turn;
      if (teamRef) step.teamRef = teamRef;
      step.state = "running";
      const run = this.runs.find((r) => r.steps.includes(step));
      if (run) {
        await this.events.recordStatus(run, step, "running");
        await this.advance(run);
      }
      await this.store.changed();
    });
  }

  /** Record native step/token telemetry from DSH session events inside the scheduler transaction queue. */
  recordTelemetry(
    sessionId: string,
    turn: number,
    delta: {
      addStep?: boolean;
      inputTokens?: number;
      outputTokens?: number;
    },
  ): Promise<boolean> {
    return this.transact(async () => {
      const step = this.runs
        .flatMap((r) => r.steps)
        .find(
          (s) =>
            s.sessionId === sessionId &&
            !s.endedAt &&
            (s.turn === turn || s.turn === undefined || s.state === "settling"),
        );
      if (!step) return false;
      step.telemetry ??= { stepCount: 0, inputTokens: 0, outputTokens: 0 };
      if (delta.addStep) step.telemetry.stepCount += 1;
      if (typeof delta.inputTokens === "number") {
        step.telemetry.inputTokens += delta.inputTokens;
      }
      if (typeof delta.outputTokens === "number") {
        step.telemetry.outputTokens += delta.outputTokens;
      }
      const owner = this.runs.find((run) => run.steps.includes(step));
      if (
        owner &&
        (owner.budget ||
          owner.graph.nodes.find((node) => node.id === step.nodeId)?.budget)
      ) {
        if (await this.enforceBudget(owner, step, false)) {
          await this.store.changed();
        }
      }
      return true;
    });
  }

  private async enforceBudget(
    run: FlowspaceRun,
    step: RunStep,
    beforeDispatch: boolean,
  ): Promise<boolean> {
    if (["cancelled", "interrupted", "error", "completed"].includes(run.state))
      return false;
    const hit = budgetHit(run, step, beforeDispatch, Date.now());
    if (!hit) return false;
    if (!run.budgetPause) {
      run.state = "paused";
      const { key: _key, ...details } = hit;
      run.budgetPause = details;
      await this.events.recordStatus(
        run,
        step,
        "budget",
        `${hit.dimension}: ${hit.value} / ${hit.limit}`,
      );
      await this.events.deliverEvents(run, true);
    }
    return true;
  }

  private armBudget(run: FlowspaceRun, step: RunStep): void {
    const limits = run.graph.nodes.find((node) => node.id === step.nodeId)?.budget;
    for (const [scope, duration, start] of [
      ["run", run.budget?.seconds, run.createdAt],
      [step.id, limits?.seconds, step.startedAt ?? Date.now()],
    ] as const) {
      if (duration === undefined) continue;
      this.schedule(
        `budget:${run.id}:${scope}`,
        start + duration * 1000 + 1,
        async () => {
          if (await this.enforceBudget(run, step, false)) {
            await this.store.changed();
          }
        },
      );
    }
  }

  deliverable(
    sessionId: string,
    turn: number,
    seq: number,
    time: number,
    files: { path: string; description?: string }[],
  ): Promise<void> {
    return this.transact(async () => {
      const run = [...this.runs]
        .reverse()
        .find((r) =>
          r.steps.some(
            (s) =>
              s.sessionId === sessionId &&
              (s.turn === turn || (!s.endedAt && s.turn === undefined)),
          ),
        );
      const node = this.store
        .document()
        .nodes.find((n) => n.sessionId === sessionId);
      if (!run || !node) return;
      run.deliverables ??= [];
      for (const file of files) {
        const id = `${sessionId}:${seq}:${file.path}`;
        if (run.deliverables.some((d) => d.id === id)) continue;
        run.deliverables.push({
          id,
          nodeId: node.id,
          sessionId,
          turn,
          seq,
          time,
          path: file.path,
          description: file.description,
        });
      }
      await this.store.changed();
    });
  }

  activeSessionStep(sessionId: string) {
    for (const run of this.runs) {
      if (run.state === "cancelled" || run.state === "interrupted") continue;
      const step = run.steps.find(
        (entry) =>
          entry.sessionId === sessionId &&
          entry.state === "running" &&
          entry.turn !== undefined &&
          !entry.endedAt,
      );
      if (step) return { run, step };
    }
  }

  canEmit(sessionId: string): boolean {
    return this.emissions.canEmit(sessionId);
  }

  emit(
    sessionId: string,
    callId: string,
    values: JsonValue[],
    signal: AbortSignal,
  ): Promise<{ accepted: number; total: number }> {
    const owner = this.emissions.owner(sessionId);
    return this.transact(() =>
      this.emissions.admitEmit(owner, sessionId, callId, values, signal),
    );
  }

  finish(
    sessionId: string,
    turn: number,
    ending: string,
    seq: number,
    output: string,
    error?: string,
    teamFollowup = false,
  ): Promise<void> {
    return this.transact(async () => {
      const matches = (s: RunStep) =>
        s.sessionId === sessionId && !s.endedAt && s.turn === turn;
      const settling = (s: RunStep) =>
        s.sessionId === sessionId && s.state === "settling";
      const run =
        this.runs.find((r) => r.steps.some(matches)) ??
        (teamFollowup
          ? this.runs.findLast((r) => r.steps.some(settling))
          : undefined);
      const step = run?.steps.find(matches) ?? run?.steps.findLast(settling);
      if (!run || !step || seq <= (step.endSeq ?? -1)) return;
      step.turn = turn;
      step.endSeq = seq;
      if (output || step.output === undefined) step.output = output;
      if (step.teamRef && ending === "completed" && this.runtime.waitForTeam) {
        step.state = "settling";
        await this.store.changed();
        this.waitForTeam(run, step, sessionId);
      } else {
        await this.finishStep(run, step, sessionId, ending, error);
      }
    });
  }

  private waitForTeam(
    run: FlowspaceRun,
    step: RunStep,
    sessionId: string,
  ): void {
    if (this.teamSettlements.has(step.id)) return;
    this.teamSettlements.add(step.id);
    const finish = (ending: string, error?: string) =>
      this.transact(async () => {
        this.teamSettlements.delete(step.id);
        if (step.state === "settling") {
          await this.finishStep(run, step, sessionId, ending, error);
        }
      });
    void this.runtime
      .waitForTeam!(sessionId)
      .then(
        () => finish("completed"),
        (error) => finish("error", String(error)),
      )
      .catch((error) => console.error("FlowSpace team settlement:", error));
  }

  private async finishStep(
    run: FlowspaceRun,
    step: RunStep,
    sessionId: string,
    ending: string,
    error?: string,
  ): Promise<void> {
    step.endedAt = Date.now();
    step.telemetry ??= { stepCount: 1, inputTokens: 0, outputTokens: 0 };
    if (step.telemetry.stepCount === 0) step.telemetry.stepCount = 1;
    step.telemetry.durationMs = Math.max(0, step.endedAt - step.createdAt);
    step.state =
      ending === "completed" ||
      ending === "aborted" ||
      ending === "interrupted"
        ? ending
        : "error";
    step.error = error ?? (step.state === "error" ? ending : undefined);
    this.clearTimer(`budget:${run.id}:${step.id}`);
    await this.enforceBudget(run, step, false);
    if (step.parameterRetryFor) {
      const target = run.steps.find(
        (entry) => entry.id === step.parameterRetryFor,
      );
      if (
        target?.operation &&
        target.state === "awaiting" &&
        !["cancelled", "interrupted"].includes(run.state)
      ) {
        const data = step.operationParameters?.[target.nodeId] ?? {};
        for (const field of target.operation.missing) {
          if (data[field]?.trim()) target.operation.values[field] = data[field];
        }
        target.operation.missing = target.operation.missing.filter(
          (field) => !target.operation!.values[field]?.trim(),
        );
        target.operation.review = true;
        delete target.human;
        target.state = "running";
        await this.store.changed();
        this.execute(
          run,
          target,
          run.graph.nodes.find((node) => node.id === target.nodeId)!,
        );
      }
      if (step.state === "error" || step.state === "interrupted") {
        step.state = "skipped";
      }
      settleRun(run);
      await this.store.changed();
      return;
    }
    await this.events.recordStatus(
      run,
      step,
      step.state === "completed" ? "done" : "error",
      step.error ?? step.output,
      ending,
    );

    if (
      step.state === "completed" &&
      !["cancelled", "interrupted"].includes(run.state)
    ) {
      step.route = "out";
      const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
      const planGateActive = Boolean(
        await this.runtime.isPlanModeActive?.(sessionId),
      );
      await this.emissions.deliverAgentResult(run, step, node, planGateActive);
      await this.store.changed();
      if (run.state !== "error") await this.advance(run);
    } else {
      if (step.emission) step.emission.closed = true;
      if (
        step.fanoutBatchId ||
        run.fanouts?.some((batch) => batch.producerStepId === step.id)
      ) {
        await this.advance(run);
      }
    }
    settleRun(run);
    await this.store.changed();
  }

  remindEmission(runId: string, stepId: string): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const prior = run.steps.find((step) => step.id === stepId);
      if (!prior?.emission?.missing) {
        throw new Error("该步骤没有需要补交的结构化输出");
      }
      if (prior.emission.reminderStepId) return;
      if (["cancelled", "interrupted", "paused"].includes(run.state)) {
        throw new Error("当前运行无法补交输出");
      }
      run.state = "running";
      await this.enqueue(run, prior.nodeId, prior.sources, true, prior);
      settleRun(run);
      await this.store.changed();
    });
  }

  stopSettlingTeam(sessionId: string): Promise<void> {
    return this.transact(async () => {
      for (const run of this.runs) {
        for (const step of run.steps) {
          if (step.sessionId === sessionId && step.state === "settling") {
            await this.finishStep(run, step, sessionId, "aborted");
          }
        }
      }
    });
  }

  private async finishExecStep(
    run: FlowspaceRun,
    step: RunStep,
    result: Exclude<ExecResult, { awaiting: unknown }>,
    skipped = false,
  ): Promise<void> {
    const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
    step.state = skipped ? "skipped" : "completed";
    step.route = result.route;
    if (result.route === "error") step.error ??= result.output;
    step.output = result.output;
    step.verdict = result.verdict;
    if (result.dataCalls) step.dataCalls = result.dataCalls;
    if (
      !skipped &&
      result.route !== "error" &&
      descriptorOf(node.flowType)?.family === "data"
    ) {
      step.outputContent = result.source.content;
      if (node.flowType === "flowspace/accumulate" && result.source.content) {
        await this.store.recordAccumulator?.(run, step, node, result.source);
        const states = (run.accumulators ??= []);
        const state = states.find((existing) => existing.nodeId === node.id);
        if (state) state.content = result.source.content;
        else states.push({ nodeId: node.id, content: result.source.content });
      }
    }
    step.endedAt = Date.now();
    step.telemetry = {
      stepCount: 1,
      inputTokens: 0,
      outputTokens: 0,
      ...result.telemetry,
      durationMs: step.endedAt - step.createdAt,
    };
    this.clearTimer(`budget:${run.id}:${step.id}`);
    await this.enforceBudget(run, step, false);
    if (!skipped) {
      await this.events.recordStatus(
        run,
        step,
        result.route === "error" ? "error" : "done",
        result.output,
        result.route,
      );
    }
    await emitDownstreamTokens(
      this.runtime,
      (r, t) => this.armDelay(r, t),
      run,
      step,
      node,
      undefined,
      undefined,
      result.output,
      false,
      result.source,
    );
    await this.advance(run);
    settleRun(run);
    await this.store.changed();
  }

  private execute(run: FlowspaceRun, step: RunStep, node: FlowNode): void {
    const controller = new AbortController();
    this.executions.set(step.id, controller);
    const recordCall = (trace: DataCallTrace) =>
      this.transact(async () => {
        if (this.disposed) return;
        (step.dataCalls ??= []).push(trace);
        const telemetry = (step.telemetry ??= {
          stepCount: 0,
          inputTokens: 0,
          outputTokens: 0,
        });
        telemetry.stepCount++;
        telemetry.inputTokens += trace.inputTokens;
        telemetry.outputTokens += trace.outputTokens;
        await this.enforceBudget(run, step, false);
        await this.store.changed();
      });
    const dispatch = async (previous?: FlowContent): Promise<ExecResult> => {
      if (!this.runtime.execute) throw new Error("Host 未注册节点执行器");
      const configured = step.resolvedConfig
        ? { ...node, config: step.resolvedConfig }
        : node;
      return this.runtime.execute(configured, step, controller.signal, {
        runId: run.id,
        listLimit: run.listLimit,
        previous,
        recordCall,
      });
    };
    const complete = async (result?: ExecResult, error?: unknown) => {
      this.executions.delete(step.id);
      if (controller.signal.aborted || step.state !== "running" || this.disposed)
        return;
      if (!result) {
        step.error = String(error);
        result = {
          route: "error",
          output: step.error,
          source: await forwardInput(node, step),
        };
      }
      if (result.operation) step.operation = result.operation;
      if (result.operationResult) step.operationResult = result.operationResult;
      if ("awaiting" in result) {
        step.state = "awaiting";
        step.human = result.awaiting;
        this.humanGate.armHuman(run, step);
        await this.events.recordStatus(
          run,
          step,
          "waiting",
          step.human.question,
        );
        await this.advance(run);
        settleRun(run);
        await this.store.changed();
      } else {
        await this.finishExecStep(run, step, result);
      }
    };
    const work =
      node.flowType === "flowspace/accumulate"
        ? this.transact(async () => {
            if (
              controller.signal.aborted ||
              step.state !== "running" ||
              this.disposed
            )
              return;
            const previous = run.accumulators?.find(
              (state) => state.nodeId === node.id,
            )?.content;
            let result: ExecResult;
            try {
              result = await dispatch(previous);
            } catch (error) {
              await complete(undefined, error);
              return;
            }
            await complete(result);
          })
        : dispatch().then(
            (result) => this.transact(() => complete(result)),
            (error) => this.transact(() => complete(undefined, error)),
          );
    void work.catch((error) =>
      console.error("FlowSpace 节点执行收尾失败", error),
    );
  }

  private clearTimer(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  private schedule(
    id: string,
    deadline: number,
    action: () => Promise<void>,
  ): void {
    this.clearTimer(id);
    if (this.disposed) return;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      if (Date.now() < deadline) this.schedule(id, deadline, action);
      else
        void this.transact(action).catch((error) =>
          console.error("FlowSpace 调度定时器", error),
        );
    }, Math.min(2_147_483_647, Math.max(0, deadline - Date.now())));
    timer.unref();
    this.timers.set(id, timer);
  }

  private armDelay(run: FlowspaceRun, token: FlowToken): void {
    if (token.delayUntil === undefined) return;
    this.schedule(token.id, token.delayUntil, async () => {
      if (
        this.disposed ||
        token.consumed ||
        token.dismissed ||
        ["cancelled", "interrupted"].includes(run.state)
      ) {
        return;
      }
      delete token.delayUntil;
      token.ready = !token.needsRelease && !token.loopCapReached;
      if (token.ready) markTokenReady(run, token);
      await this.advance(run);
      settleRun(run);
      await this.store.changed();
    });
  }

  answerHuman(
    runId: string,
    stepId: string,
    option: string,
    values?: JsonObject,
  ): Promise<void> {
    return this.transact(() =>
      this.humanGate.answer(this.requireRun(runId), stepId, option, values),
    );
  }

  private async advance(run: FlowspaceRun): Promise<void> {
    if (this.disposed) return;
    if (run.state === "paused") await this.fanout.collectCompleted(run);
    else if (!["cancelled", "interrupted", "error"].includes(run.state)) {
      await this.advanceRun(run);
    }
    await this.wakeFanouts(run);
  }

  private async wakeFanouts(except: FlowspaceRun): Promise<void> {
    for (const other of this.runs) {
      if (
        other === except ||
        !["running", "waiting"].includes(other.state) ||
        !this.fanout.hasAdmission(other)
      ) {
        continue;
      }
      await this.advanceRun(other);
      settleRun(other);
    }
  }

  private async advanceRun(run: FlowspaceRun): Promise<void> {
    let expanded: boolean;
    do {
      await advanceGraph(
        {
          runtime: this.runtime,
          store: this.store,
          armDelay: (r, t) => this.armDelay(r, t),
          enqueue: (r, nodeId, sources, isCont, rem, origin) =>
            this.enqueue(r, nodeId, sources, isCont, rem, origin),
        },
        run,
      );
      await deliverContainers(this.store, run);
      await this.events.deliverEvents(run);
      expanded = await this.fanout.pump(
        run,
        (edge, step, input, batch) => {
          const target = run.graph.nodes.find((node) => node.id === edge.target)!;
          pushToken(
            run,
            edge,
            step,
            target,
            input,
            false,
            (r, t) => this.armDelay(r, t),
            { fanoutBatchId: batch.id },
          );
        },
        (merge, batch, result, error) =>
          this.finishMerge(run, merge, batch, result, error),
        (batch, lane) => this.cancelFanoutLane(run, batch, lane),
      );
    } while (expanded && run.state !== "error");
  }

  private async finishMerge(
    run: FlowspaceRun,
    node: FlowNode,
    batch: RunFanout,
    source: ContextSnapshot,
    error?: string,
  ): Promise<void> {
    const now = Date.now();
    const step: RunStep = {
      id: uid(),
      requestId: uid(),
      nodeId: node.id,
      iteration:
        run.steps.filter((other) => other.nodeId === node.id).length + 1,
      fanoutId: batch.fanId,
      fanoutBatchId: batch.id,
      state: error ? "error" : "completed",
      route: error ? "error" : "out",
      error,
      task: "",
      sources: [source],
      output: source.text,
      createdAt: now,
      endedAt: now,
    };
    batch.mergeStepId = step.id;
    run.steps.push(step);
    if (
      run.graph.edges.some(
        (edge) => edge.source === batch.groupId && edge.kind === "event",
      )
    ) {
      await this.events.recordStatus(
        run,
        { ...step, nodeId: batch.groupId },
        error ? "error" : "done",
        error ?? source.text,
      );
    }
    if (!error && node.config?.sortMode && node.config.sortMode !== "off") {
      step.state = "running";
      delete step.route;
      delete step.endedAt;
      await this.store.changed();
      this.execute(run, step, node);
      return;
    }
    await emitDownstreamTokens(
      this.runtime,
      (r, t) => this.armDelay(r, t),
      run,
      step,
      node,
      undefined,
      undefined,
      source.text,
      false,
      source,
    );
  }

  private async cancelFanoutLane(
    run: FlowspaceRun,
    batch: RunFanout,
    lane: RunFanoutLane,
  ): Promise<void> {
    for (const step of run.steps.filter(
      (s) =>
        s.fanoutBatchId === batch.id &&
        s.itemKey === lane.item.key &&
        (activeStep(s) || s.state === "awaiting"),
    )) {
      await this.stopStep(step);
      step.state = "aborted";
      step.endedAt = Date.now();
    }
    const edges = new Set(
      run.graph.edges
        .filter(
          (edge) =>
            edge.generatedBy === batch.fanId && edge.itemKey === lane.item.key,
        )
        .map((edge) => edge.id),
    );
    for (const token of run.tokens) {
      if (
        token.fanoutBatchId !== batch.id ||
        !edges.has(token.edgeId) ||
        token.consumed
      ) {
        continue;
      }
      this.clearTimer(token.id);
      token.dismissed = true;
      consumeToken(token);
    }
    lane.state = "cancelled";
    lane.endedAt = Date.now();
  }

  /** Extend bounded-loop round budget (`+1 Round` gate) and immediately advance parked feedback tokens. */
  extendLoop(request: ExtendLoopRequest): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(request.runId);
      if (["cancelled", "interrupted"].includes(run.state)) return;
      if (!applyExtendLoop(run, request)) return;
      await this.advance(run);
      settleRun(run);
      await this.store.changed();
    });
  }

  private async enqueue(
    run: FlowspaceRun,
    nodeId: string,
    sources: ContextSnapshot[],
    isContinuation = false,
    reminder?: RunStep,
    origin: Pick<
      RunStep,
      "streamFrom" | "fanoutBatchId" | "sourcePorts" | "upstreamStepIds"
    > = {},
    reuseReferences = false,
  ): Promise<void> {
    const liveDoc = this.store.document();
    const liveNode = liveDoc.nodes.find((n) => n.id === nodeId);
    const node = run.graph.nodes.find((n) => n.id === nodeId)!;
    if (!node.generatedBy && liveNode?.continuationPrompt !== undefined) {
      node.continuationPrompt = liveNode.continuationPrompt;
    }
    if (!node.generatedBy && liveNode?.planMode !== undefined) {
      node.planMode = liveNode.planMode;
    }
    syncUntitledAgentNode(node);
    if (liveNode) syncUntitledAgentNode(liveNode);

    const task = reminder
      ? `请调用 flow_emit 补交上一轮任务要求的结构化内容。\n\n${reminder.task}`
      : isContinuation
        ? (node.continuationPrompt ?? "").trim() ||
          (node.sessionId
            ? node.task.trim() || node.draft.trim()
            : node.draft.trim() || node.task.trim())
        : node.draft.trim() ||
          node.task.trim() ||
          (node.continuationPrompt ?? "").trim();
    if (!task && node.kind !== "flow") {
      run.notes.push(`${node.title}：尚未填写任务`);
      run.state = "error";
      return;
    }
    const step: RunStep = {
      id: uid(),
      nodeId,
      requestId: uid(),
      state: "queued",
      iteration: run.steps.filter((s) => s.nodeId === nodeId).length + 1,
      task,
      sources: [...sources],
      ...(node.generatedBy
        ? { fanoutId: node.generatedBy, itemKey: node.itemKey }
        : {}),
      ...origin,
      createdAt: Date.now(),
      ...(reminder ? { reminderFor: reminder.id } : {}),
    };
    if (node.kind === "flow") {
      step.sourcePorts = [
        ...(origin.sourcePorts ??
          sources.map(
            (source) =>
              run.graph.edges.find(
                (edge) =>
                  edge.source === source.sourceNodeId && edge.target === nodeId,
              )?.targetPort ?? "in",
          )),
      ];
    }
    run.steps.push(step);
    if (reminder?.emission) reminder.emission.reminderStepId = step.id;
    try {
      const pendingSentUpdates: { edge: FlowEdge; version: string }[] = [];
      for (const edge of (reminder ? [] : run.graph.edges).filter(
        (e) =>
          e.target === nodeId && (e.kind === "reference" || e.trigger === "off"),
      )) {
        const source = run.graph.nodes.find((n) => n.id === edge.source)!;
        if (!source) continue;
        if (
          reuseReferences &&
          sources.some(
            (saved, index) =>
              saved.sourceNodeId === edge.source &&
              (!origin.sourcePorts ||
                origin.sourcePorts[index] === (edge.targetPort ?? "in")),
          )
        ) {
          continue;
        }
        const variable =
          source.flowType === "flowspace/variable" &&
          this.store.variableReference?.(run, step, source);
        const captured =
          variable ||
          (source.kind === "agent"
            ? await this.runtime.capture(source, edge.mode)
            : await this.runtime.reference(source, edge, node, run.listLimit));
        if (captured.referenceKind === "board-card" && captured.missing)
          continue;
        const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
        edge.currentVersion = version;
        if (source.kind === "display" && source.sourceNodeId) {
          const replaced = source.sourceNodeId;
          if (step.sourcePorts) {
            step.sourcePorts = step.sourcePorts.filter(
              (_, i) => step.sources[i].sourceNodeId !== replaced,
            );
          }
          step.sources = step.sources.filter(
            (s) => s.sourceNodeId !== source.sourceNodeId,
          );
        }
        if (
          edge.kind === "reference" &&
          node.kind !== "flow" &&
          !edge.always &&
          edge.sentVersion === version
        ) {
          continue;
        }
        step.sources.push(captured);
        step.sourcePorts?.push(edge.targetPort ?? "in");
        pendingSentUpdates.push({ edge, version });
      }
      if (
        new Set(
          step.sources
            .filter((s) => s.kind === "session")
            .map((s) => s.sourceSessionId),
        ).size > 3
      ) {
        throw new Error("一次会话引用最多包含三个来源；更多来源可改用结论");
      }
      await this.store.prepareStep?.(run, step, node);
      const debug = {
        originalTask: task,
        continuation: isContinuation,
        references: pendingSentUpdates.map(({ edge, version }) => ({
          edgeId: edge.id,
          version,
        })),
        tools: this.store.toolsFor?.(run, step) ?? [],
      };
      const over =
        node.flowType !== "flowspace/notice" &&
        (await this.enforceBudget(run, step, true));
      if (over || node.breakpoint || run.singleStep) {
        step.state = "awaiting";
        step.debug = { reason: over ? "budget" : "breakpoint", ...debug };
        run.singleStep = false;
        if (!over) await this.events.recordStatus(run, step, "waiting");
        await this.store.changed();
        return;
      }
      await this.admitPrepared(run, step, node, debug);
    } catch (e) {
      step.state = "error";
      step.error = String(e);
      step.endedAt = Date.now();
    }
  }

  private async admitPrepared(
    run: FlowspaceRun,
    step: RunStep,
    node: FlowNode,
    prepared: Pick<
      NonNullable<RunStep["debug"]>,
      "references" | "originalTask" | "continuation"
    >,
  ): Promise<void> {
    const { originalTask, continuation, references } = prepared;
    const pendingSentUpdates = references.flatMap(({ edgeId, version }) => {
      const edge = run.graph.edges.find((e) => e.id === edgeId);
      return edge ? [{ edge, version }] : [];
    });
    const liveDoc = this.store.document();
    const nodeId = node.id;
    const fork = step.sources.find((s) => s.kind === "fork");
    step.startedAt = Date.now();
    this.armBudget(run, step);
    if (node.kind === "flow") {
      step.state = "running";
      for (const { edge, version } of pendingSentUpdates)
        edge.sentVersion = version;
      if (node.flowType === "flowspace/fanout") {
        await this.fanout.receive(run, node, step);
        await this.store.changed();
        return;
      }
      await this.store.changed();
      this.execute(run, step, node);
      return;
    }
    const current = liveDoc.nodes.find((n) => n.id === nodeId);
    if (current?.sessionId) node.sessionId = current.sessionId;
    step.sessionId = await this.runtime.ensure(
      node,
      node.sessionId || node.generatedBy ? undefined : fork,
      laneSessionTitle(run, node),
    );
    node.sessionId = step.sessionId;
    const teamId = teamIdOf(node, staffedIds(liveDoc.nodes));
    if (teamId) {
      step.teamRef =
        this.runtime.teamReference?.(step.sessionId) ??
        node.teamRef ??
        { teamId };
    }
    await this.store.bound(nodeId, step.sessionId, fork);
    if (fork) {
      for (const e of run.graph.edges.filter(
        (e) => e.target === nodeId && e.mode === "fork",
      )) {
        e.originMode = "fork";
        e.mode = "conclusion";
      }
    }
    await this.store.changed();
    await this.runtime.send(step);
    const currentDoc = this.store.document();
    for (const { edge, version } of pendingSentUpdates) {
      edge.sentVersion = version;
      const live = currentDoc.edges.find((e) => e.id === edge.id);
      if (live) {
        live.sentVersion = version;
        live.currentVersion = version;
      }
    }
    if (!step.reminderFor) {
      await this.store.submitted(nodeId, originalTask, continuation);
    }
    await this.store.changed();
  }

  debugStep(
    runId: string,
    stepId: string,
    action: "continue" | "step" | "skip",
    task?: string,
  ): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const step = run.steps.find((entry) => entry.id === stepId);
      if (!step?.debug || step.state !== "awaiting" || run.budgetPause) {
        throw new Error("此步骤未处于可放行的断点");
      }
      const prepared = step.debug;
      if (task !== undefined) step.task = task;
      delete step.debug;
      run.state = "running";
      run.singleStep = action === "step";
      if (action === "skip") {
        await this.humanGate.resolveHuman(run, step, "skip", true);
      } else {
        step.state = "queued";
        const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
        try {
          await this.admitPrepared(run, step, node, prepared);
        } catch (error) {
          step.state = "error";
          step.endedAt = Date.now();
          step.error = String(error);
        }
      }
      settleRun(run);
      await this.store.changed();
    });
  }

  release(runId: string, tokenId: string, accept: boolean): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(runId),
        token = run.tokens.find((t) => t.id === tokenId);
      if (
        !token ||
        token.consumed ||
        token.dismissed ||
        ["cancelled", "interrupted"].includes(run.state)
      ) {
        return;
      }
      if (!accept) {
        this.clearTimer(token.id);
        token.dismissed = true;
        consumeToken(token);
        delete token.loopCapReached;
        delete token.planGate;
      } else {
        if (token.loopCapReached) {
          const edge = run.graph.edges.find((e) => e.id === token.edgeId);
          if (edge) edge.maxRounds += 1;
          delete token.loopCapReached;
        }
        delete token.planGate;
        delete token.needsRelease;
        token.ready = token.delayUntil === undefined;
        if (token.ready) markTokenReady(run, token);
        if (token.boundary && run.scope) {
          run.scope.push(
            run.graph.edges.find((e) => e.id === token.edgeId)!.target,
          );
        }
        token.boundary = false;
      }
      if (run.state === "waiting") run.state = "running";
      await this.advance(run);
      settleRun(run);
      await this.store.changed();
    });
  }

  command(runId: string, action: "pause" | "resume" | "cancel"): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      if (action === "pause") {
        if (["running", "waiting"].includes(run.state)) run.state = "paused";
      } else if (action === "resume") {
        if (!["paused", "interrupted"].includes(run.state)) return;
        run.state = "running";
        if (run.budgetPause) {
          const { nodeId, dimension } = run.budgetPause;
          (run.budgetAcknowledged ??= []).push(
            `${nodeId ?? "run"}:${dimension}`,
          );
          delete run.budgetPause;
          for (const step of run.steps) {
            if (step.debug?.reason === "budget") step.debug.reason = "breakpoint";
          }
        }
        this.restoreWaits(run);
        await this.advance(run);
        settleRun(run);
      } else {
        run.state = "cancelled";
        delete run.pendingEvents;
        for (const step of run.steps.filter(
          (s) => activeStep(s) || s.state === "awaiting",
        )) {
          await this.stopStep(step);
          step.state = "aborted";
          step.endedAt = Date.now();
        }
        for (const token of run.tokens) {
          this.clearTimer(token.id);
          consumeToken(token);
        }
        for (const batch of run.fanouts ?? []) {
          batch.closed = true;
          for (const lane of batch.lanes) {
            if (lane.state === "queued" || lane.state === "running") {
              lane.state = "cancelled";
              lane.endedAt = Date.now();
            }
          }
        }
        await this.wakeFanouts(run);
      }
      await this.store.changed();
    });
  }

  private async stopStep(step: RunStep): Promise<void> {
    this.clearTimer(step.id);
    if (step.emission) step.emission.closed = true;
    const controller = this.executions.get(step.id);
    if (controller) {
      controller.abort();
      this.executions.delete(step.id);
    } else if (step.sessionId) {
      await this.runtime.cancel(step).catch(() => {});
    }
  }

  /** Safely interrupt all active runs before restoring a canvas snapshot (R10). */
  async interruptAllActive(reasonNote: string): Promise<void> {
    for (const run of this.runs) {
      if (!["running", "waiting", "paused"].includes(run.state)) continue;
      run.state = "interrupted";
      for (const step of run.steps) {
        if (activeStep(step) || step.state === "awaiting") {
          await this.stopStep(step);
          step.state = "interrupted";
          step.endedAt = Date.now();
        }
      }
      for (const token of run.tokens) {
        this.clearTimer(token.id);
        if (!token.consumed && !token.dismissed) {
          token.dismissed = true;
        }
      }
      addNoteOnce(run, reasonNote);
    }
  }

  private restoreWaits(run: FlowspaceRun): void {
    for (const batch of run.pendingEvents ?? []) this.events.armEvent(run, batch);
    for (const step of run.steps) {
      if (step.state === "awaiting") this.humanGate.armHuman(run, step);
    }
    for (const token of run.tokens) {
      if (!token.consumed && !token.dismissed) this.armDelay(run, token);
    }
  }

  recover(): Promise<void> {
    return this.transact(async () => {
      const resume: FlowspaceRun[] = [];
      for (const run of this.runs) {
        if (!["running", "waiting", "paused"].includes(run.state)) continue;
        const hadActiveSteps = run.steps.some(activeStep);
        const resumable =
          hasDurableWait(run) || (run.state === "paused" && !hadActiveSteps);
        if (!resumable) run.state = "interrupted";
        for (const step of run.steps) {
          if (
            activeStep(step) ||
            (resumable &&
              step.fanoutBatchId &&
              step.sessionId &&
              step.state === "interrupted" &&
              step.endSeq === undefined)
          ) {
            let patch: Partial<RunStep>;
            try {
              patch =
                step.sessionId && this.runtime.reconcile
                  ? await this.runtime.reconcile(step)
                  : { state: "interrupted", endedAt: Date.now() };
            } catch (err) {
              patch = {
                state: "interrupted",
                endedAt: Date.now(),
                error: String(err),
              };
            }
            Object.assign(step, patch);
            if (step.state === "completed") {
              const source = run.graph.nodes.find((n) => n.id === step.nodeId);
              if (source?.kind === "agent") {
                try {
                  const planGateActive = step.sessionId
                    ? Boolean(
                        await this.runtime.isPlanModeActive?.(step.sessionId),
                      )
                    : false;
                  step.route ??= "out";
                  await this.emissions.deliverAgentResult(
                    run,
                    step,
                    source,
                    planGateActive,
                  );
                } catch (err) {
                  addNoteOnce(
                    run,
                    `${source.title}：恢复捕获结果失败（${String(err)}）`,
                  );
                }
              }
            } else if (step.emission && !activeStep(step)) {
              step.emission.closed = true;
            }
          }
        }
        if (resumable) {
          this.restoreWaits(run);
          resume.push(run);
        }
        if (hadActiveSteps || !resumable) {
          addNoteOnce(
            run,
            "Host 已重新启动。保留已完成结果；继续只推进尚未投递的接续，中断节点请手动重跑。",
          );
        }
      }
      for (const run of resume) {
        await this.advance(run);
        settleRun(run);
      }
      await this.store.changed();
    });
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    for (const id of this.timers.keys()) this.clearTimer(id);
    await this.transact(async () => {
      for (const run of this.runs.filter((r) =>
        ["running", "waiting", "paused"].includes(r.state),
      )) {
        const active = run.steps.filter(activeStep);
        if (hasDurableWait(run)) {
          if (run.state !== "paused") run.state = "waiting";
        } else if (run.state !== "paused" || active.length) {
          run.state = "interrupted";
        }
        for (const step of active) {
          await this.stopStep(step);
          step.state = "interrupted";
          step.endedAt = Date.now();
        }
      }
      await this.store.changed();
    });
  }

  private requireRun(id: string): FlowspaceRun {
    const run = this.runs.find((r) => r.id === id);
    if (!run) throw new Error("运行记录不存在");
    return run;
  }
}
