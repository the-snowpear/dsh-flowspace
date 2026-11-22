import type {
  ContextMode,
  ContextSnapshot,
  DataCallTrace,
  ExtendLoopRequest,
  FlowContent,
  FlowEdge,
  FlowEvent,
  FlowEventKind,
  FlowItem,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowToken,
  JsonObject,
  JsonValue,
  RunFanout,
  RunFanoutLane,
  RunStep,
  StartRequest,
  StepEmission,
  TeamReference,
} from "../types.ts";
import {
  members,
  syncUntitledAgentNode,
  syncUntitledAgentTitles,
  uid,
} from "./document.ts";
import { staffedIds, teamIdOf } from "./team.ts";
import {
  activeEdges,
  ancestorsOf,
  graphOrder,
  isFanoutMaster,
  launchPlan,
  reachable,
} from "./graph.ts";
import { descriptorOf, isExecutable } from "./nodes/registry.ts";
import type { ExecResult, NodeExecutor } from "./nodes/types.ts";
import { forwardInput, snapshotWithContent } from "./nodes/input.ts";
import { contentList, DEFAULT_LIST_LIMIT, textOfContent } from "./content.ts";
import { checkEmissionValues, emissionTargets, parseEmission, type EmissionTarget } from "./emission.ts";
import { fanoutPair, staticFanoutContent } from "./fanout.ts";
import { FanoutExecution, laneSessionTitle } from "./runFanout.ts";
import { isContainer } from "./containers.ts";
import { triggerNode, checkAnswers } from "./nodes/interactions.ts";
import { budgetHit } from "./budget.ts";
import { isActiveStep as activeStep, type RuntimeAdapter, type SchedulerStore } from "./schedulerTypes.ts";

export type { RuntimeAdapter, SchedulerStore };

function consumeToken(token: FlowToken): void {
  if (token.consumed) return;
  token.consumed = true;
  token.consumedAt = Date.now();
}

function markTokenReady(run: FlowspaceRun, token: FlowToken, at = Date.now()): void {
  token.readyAt = at;
  if (token.fanoutBatchId) token.readyOrder = run.fanoutReadyOrder = (run.fanoutReadyOrder ?? 0) + 1;
}

/** Durable run ownership. A promise queue serializes commands, never model execution. */
export class Scheduler {
  readonly runs: FlowspaceRun[];
  private serial: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private teamSettlements = new Set<string>();
  private executions = new Map<string, AbortController>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private fanout: FanoutExecution;
  constructor(
    private runtime: RuntimeAdapter,
    private store: SchedulerStore,
    runs: FlowspaceRun[] = [],
  ) {
    this.runs = runs;
    this.fanout = new FanoutExecution(runtime, store, runs);
  }
  transact<T>(action: () => Promise<T>): Promise<T> {
    const next = this.serial.then(action);
    this.serial = next.catch(() => undefined);
    return next;
  }
  busy(): Set<string> {
    const sessions = new Set(this.runtime.running?.() ?? []);
    return new Set([
      ...this.runs.flatMap((r) =>
        r.steps
          .filter(activeStep)
          .map((s) => s.nodeId),
      ),
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
          .filter((t) => !t.ready && !t.consumed && !t.dismissed && (!t.delayUntil || t.needsRelease))
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
          const seeded = await this.collectCompletedUpstreamSources(run, id);
          if (seeded.length) {
            sources = seeded;
            treatAsContinuation = true;
          }
        }
        await this.enqueue(run, id, sources, treatAsContinuation);
      }
      if (run.fanouts?.length) await this.advance(run);
      this.settle(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }

  startTriggered(nodeId: string, input: ContextSnapshot): Promise<FlowspaceRun> {
    return this.transact(async () => {
      const node = this.store.document().nodes.find(node => node.id === nodeId && node.flowType === triggerNode.flowType);
      if (!node) throw new Error("触发器已移除");
      const run = this.create([nodeId], null, "trigger", node.title);
      run.triggerId = nodeId;
      const now = Date.now();
      const step: RunStep = { id: uid(), requestId: uid(), nodeId, state: "completed", iteration: 1, route: "out",
        sources: [input], task: "", output: input.text, createdAt: now, endedAt: now };
      run.steps.push(step);
      input = await this.runtime.freezeContent?.(input, run.listLimit) ?? input;
      await this.emitDownstreamTokens(run, step, node, undefined, undefined, input.text, false, input);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }

  private async status(run: FlowspaceRun, step: RunStep, kind: FlowEventKind, summary?: string, reason?: string, seq?: number) {
    const edges = run.graph.edges.filter(edge => edge.kind === "event" && edge.source === step.nodeId);
    if (!edges.length && ["tool", "output", "usage"].includes(kind)) return;
    const event: FlowEvent = {
      id: uid(), nodeId: step.nodeId, stepId: step.id, at: Date.now(), round: step.iteration,
      kind, summary: summary?.slice(0, 512), reason, sessionId: step.sessionId, seq: seq ?? step.endSeq,
      telemetry: step.telemetry && { ...step.telemetry },
    };
    (run.events ??= []).push(event);
    for (const edge of edges) {
      const policy = edge.event;
      const mode = policy?.mode ?? "end";
      if (edge.trigger === "off" || mode === "end" && !["done", "error"].includes(kind) ||
          mode === "change" && ["output", "usage", "tool"].includes(kind) ||
          mode === "continuous" && !["output", "usage", "tool"].includes(kind) ||
          !(policy?.kinds ?? ["done", "error"]).includes(kind) ||
          policy?.reasons?.length && (!reason || !policy.reasons.includes(reason))) continue;
      const prior = run.tokens.filter(token => token.edgeId === edge.id && !token.skip);
      if (prior.length >= (policy?.maxTimes ?? Infinity)) continue;
      const dueAt = (prior.at(-1)?.createdAt ?? 0) + (policy?.cooldownMs ?? 0);
      const pending = run.pendingEvents?.find(batch => batch.edgeId === edge.id && batch.event.kind === kind && batch.event.stepId === step.id);
      if (mode === "continuous" && (pending || dueAt > event.at)) {
        const batch = pending ?? { edgeId: edge.id, event, content: "", dueAt };
        if (!pending) (run.pendingEvents ??= []).push(batch);
        batch.event = event;
        batch.content += (batch.content && kind !== "output" ? "\n" : "") + (summary ?? "");
        this.armEvent(run, batch);
      } else if (dueAt <= event.at) await this.sendEvent(run, edge, event, summary);
    }
  }

  private async sendEvent(run: FlowspaceRun, edge: FlowEdge, event: FlowEvent, content?: string) {
    const origin = run.graph.nodes.find(node => node.id === event.nodeId);
    const target = run.graph.nodes.find(node => node.id === edge.target);
    const step = run.steps.find(step => step.id === event.stepId);
    if (!origin || !step || !target || target.participation === "paused") return;
    const value = JSON.parse(JSON.stringify({
      ...event, ...(edge.event?.full || edge.event?.mode === "continuous" ? { content } : {}),
    })) as JsonObject;
    const snapshot = { ...snapshotWithContent(origin, { dataType: "record", value }), seq: event.seq, sourceSessionId: event.sessionId };
    const frozen = await this.runtime.freezeContent?.(snapshot, run.listLimit, event.sessionId) ?? snapshot;
    this.pushToken(run, edge, step, target, frozen, false);
  }

  private armEvent(run: FlowspaceRun, batch: NonNullable<FlowspaceRun["pendingEvents"]>[number]) {
    const timer = `event:${run.id}:${batch.edgeId}:${batch.event.stepId}:${batch.event.kind}`;
    this.schedule(timer, batch.dueAt, async () => {
      if (!run.pendingEvents?.includes(batch) || ["cancelled", "interrupted", "error"].includes(run.state)) return;
      const edge = run.graph.edges.find(edge => edge.id === batch.edgeId);
      const prior = run.tokens.filter(token => token.edgeId === batch.edgeId && !token.skip);
      const dueAt = (prior.at(-1)?.createdAt ?? 0) + (edge?.event?.cooldownMs ?? 0);
      if (dueAt > Date.now()) {
        batch.dueAt = dueAt;
        this.armEvent(run, batch);
        return;
      }
      run.pendingEvents = run.pendingEvents.filter(other => other !== batch);
      if (edge && prior.length < (edge.event?.maxTimes ?? Infinity))
        await this.sendEvent(run, edge, batch.event, batch.content);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }

  nativeStatus(sessionId: string, kind: "tool" | "output" | "usage", summary: string, seq?: number): Promise<void> {
    return this.transact(async () => {
      const owner = this.activeSessionStep(sessionId);
      if (!owner || !owner.run.graph.edges.some(edge => edge.kind === "event" && edge.source === owner.step.nodeId &&
          edge.event?.mode === "continuous" && edge.event.kinds.includes(kind))) return;
      await this.status(owner.run, owner.step, kind, summary, undefined, seq);
      await this.advance(owner.run);
      await this.store.changed();
    });
  }

  observesOutput(sessionId: string): boolean {
    const owner = this.activeSessionStep(sessionId);
    return !!owner?.run.graph.edges.some(edge => edge.kind === "event" && edge.source === owner.step.nodeId &&
      edge.event?.mode === "continuous" && edge.event.kinds.includes("output"));
  }

  variableChanged(nodeId: string, summary: string, runId?: string, stepId?: string): Promise<void> {
    return this.transact(async () => {
      const graph = runId ? this.runs.find(run => run.id === runId)?.graph : this.store.document();
      if (!graph?.edges.some(edge => edge.source === nodeId && edge.kind === "event" && edge.event?.kinds.includes("container"))) return;
      const owner = runId && this.runs.find(run => run.id === runId);
      const run = owner || this.create([nodeId], null, "trigger", graph.nodes.find(node => node.id === nodeId)?.title);
      if (!owner) run.triggerId = nodeId;
      const now = Date.now();
      const original = run.steps.find(step => step.id === stepId);
      const step: RunStep = original ? { ...original, nodeId } : {
        id: uid(), nodeId, requestId: uid(), state: "completed", iteration: 1, createdAt: now, endedAt: now,
        task: "", sources: [], output: summary,
      };
      if (!original) run.steps.push(step);
      await this.status(run, step, "container", summary);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }

  /** Collect latest completed outputs from upstream sessions when starting mid-DAG (`from-node` / `to-node`). */
  private async collectCompletedUpstreamSources(
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
        if (!src || src.participation === "paused" || seen.has(src.id))
          continue;
        seen.add(src.id);
        if (src.participation === "bypassed") {
          await walkBack(
            src.id,
            e.mode === "fork" ? "conclusion" : e.mode,
          );
          continue;
        }
        if (src.sessionId) {
          try {
            const mode: ContextMode =
              e.mode === "fork" ? fallbackMode : e.mode;
            const snap = await this.runtime.capture(src, mode);
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
      if (!failedRoots.length)
        throw new Error("该次运行没有可重跑的失败或中断节点");
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
        const preservedSources =
          failedStep?.sources ?? [];
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
      this.settle(run);
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
      const inputs = run.graph.edges.filter(edge => edge.target === node.id && edge.kind === "reference");
      for (const edge of inputs) {
        const frozen = staticFanoutContent({ nodes: run.graph.nodes, edges: [edge], settings: doc.settings }, node.id);
        if (!frozen) continue;
        if (inputs.length > 1 && frozen.items)
          frozen.items = frozen.items.map(item => ({ ...item, key: JSON.stringify([edge.id, item.key]) }));
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
        !node || node.generatedBy || isFanoutMaster(doc, node) ||
        node.participation === "paused" ||
        node.participation === "bypassed" ||
        !(
          canvas ||
          (node.nativeTrigger === "inherit"
            ? doc.settings.nativeChatTriggers
            : node.nativeTrigger === "enabled")
        )
      )
        return;
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

  claim(requestId: string, turn: number, teamRef?: TeamReference): Promise<void> {
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
      const run = this.runs.find(run => run.steps.includes(step));
      if (run) {
        await this.status(run, step, "running");
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
      const owner = this.runs.find(run => run.steps.includes(step));
      if (owner && (owner.budget || owner.graph.nodes.find(node => node.id === step.nodeId)?.budget)) {
        if (await this.enforceBudget(owner, step, false)) await this.store.changed();
      }
      return true;
    });
  }

  private async enforceBudget(run: FlowspaceRun, step: RunStep, beforeDispatch: boolean) {
    if (["cancelled", "interrupted", "error", "completed"].includes(run.state)) return false;
    const hit = budgetHit(run, step, beforeDispatch, Date.now());
    if (!hit) return false;
    if (!run.budgetPause) {
      run.state = "paused";
      const { key, ...details } = hit;
      run.budgetPause = details;
      await this.status(run, step, "budget", `${hit.dimension}: ${hit.value} / ${hit.limit}`);
      await this.deliverEvents(run, true);
    }
    return true;
  }

  private armBudget(run: FlowspaceRun, step: RunStep) {
    const limits = run.graph.nodes.find(node => node.id === step.nodeId)?.budget;
    for (const [scope, duration, start] of [["run", run.budget?.seconds, run.createdAt],
      [step.id, limits?.seconds, step.startedAt ?? Date.now()]] as const) {
      if (duration === undefined) continue;
      this.schedule(`budget:${run.id}:${scope}`, start + duration * 1000 + 1, async () => {
        if (await this.enforceBudget(run, step, false)) await this.store.changed();
      });
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

  private addNoteOnce(run: FlowspaceRun, note: string): void {
    if (!run.notes.includes(note)) run.notes.push(note);
  }

  activeSessionStep(sessionId: string) {
    // DSH only admits one native turn at a time. A queued request for the same
    // Session may already be in another run and must never receive this call.
    for (const run of this.runs) {
      if (run.state === "cancelled" || run.state === "interrupted") continue;
      const step = run.steps.find(entry => entry.sessionId === sessionId && entry.state === "running" &&
        entry.turn !== undefined && !entry.endedAt);
      if (step) return { run, step };
    }
  }

  private emissionOwner(sessionId: string) {
    const owner = this.activeSessionStep(sessionId);
    if (!owner || owner.step.emission?.closed) return;
    const targets = emissionTargets(owner.run, owner.step.nodeId);
    if (targets.length) return { ...owner, targets };
  }

  canEmit(sessionId: string): boolean {
    return !this.disposed && !!this.emissionOwner(sessionId);
  }

  private emissionState(run: FlowspaceRun, step: RunStep): StepEmission {
    return step.emission ?? { items: [], calls: [], total: 0, limit: run.listLimit ?? DEFAULT_LIST_LIMIT, closed: false };
  }

  private async emissionSnapshot(run: FlowspaceRun, step: RunStep, content: FlowContent): Promise<ContextSnapshot> {
    const node = run.graph.nodes.find(entry => entry.id === step.nodeId)!;
    let source: ContextSnapshot = {
      ...snapshotWithContent(node, content), kind: "conclusion", sourceSessionId: step.sessionId, seq: step.endSeq,
    };
    if (this.runtime.hydrateContent && (content.spill || content.items?.some(item => item.spill))) {
      source = await this.runtime.hydrateContent(source);
      source = { ...source, text: textOfContent(source.content!) };
    }
    return this.runtime.freezeContent
      ? this.runtime.freezeContent(source, step.emission?.limit ?? run.listLimit, step.sessionId)
      : source;
  }

  private async emissionDeliveries(
    run: FlowspaceRun, step: RunStep, targets: EmissionTarget[], list: ContextSnapshot,
  ) {
    const items = list.content!.items!;
    const records: ContextSnapshot[] = [];
    if (targets.some(target => target.type === "record")) {
      for (const item of items) {
        const content: FlowContent = item.spill ? { dataType: "record", spill: item.spill } : { dataType: "record", value: item.value };
        records.push(await this.emissionSnapshot(run, step, content));
      }
    }
    return targets.flatMap(({ edge, node, type }) =>
      (type === "list" ? [list] : records.length ? records : [undefined]).map(source => ({ edge, node, source })),
    );
  }

  private pushEmissionDeliveries(
    run: FlowspaceRun, step: RunStep,
    deliveries: { edge: FlowEdge; node: FlowNode; source?: ContextSnapshot }[], planGate: boolean,
  ) {
    for (const { edge, node, source } of deliveries) {
      this.pushToken(run, edge, step, node, this.edgeFires(run, edge, step, true) ? source : undefined, planGate,
        { streamFrom: edge.emitMode === "stream" ? step.id : step.streamFrom, fanoutBatchId: step.fanoutBatchId });
    }
  }

  emit(sessionId: string, callId: string, values: JsonValue[], signal: AbortSignal): Promise<{ accepted: number; total: number }> {
    const owner = this.emissionOwner(sessionId);
    return this.transact(async () => {
      signal.throwIfAborted();
      if (this.disposed || !owner || this.emissionOwner(sessionId)?.step !== owner.step) {
        throw new Error("当前原生回合没有可接收结构化内容的步骤");
      }
      const { run, step, targets } = owner;
      const state = this.emissionState(run, step);
      const previous = state.calls.find(call => call.id === callId);
      if (previous) return { accepted: previous.accepted, total: previous.total };
      checkEmissionValues(targets, values);
      const content = contentList(values, state.limit - state.items.length, [], state.items.map(item => item.key));
      const batch = await this.emissionSnapshot(run, step, content);
      const items = batch.content!.items!;
      const streamTargets = targets.filter(target => target.edge.emitMode === "stream" &&
        (items.length || (!state.calls.length && !values.length && target.type === "list")));
      const deliveries = await this.emissionDeliveries(run, step, streamTargets, batch);
      const planGate = Boolean(await this.runtime.isPlanModeActive?.(sessionId));
      signal.throwIfAborted();
      const receipt = { accepted: items.length, total: state.total + values.length };
      step.emission = { ...state, items: [...state.items, ...items], total: receipt.total,
        calls: [...state.calls, { id: callId, ...receipt }] };
      this.pushEmissionDeliveries(run, step, deliveries, planGate);
      // Persist the receipt together with the tokens before starting any downstream work.
      await this.store.changed();
      if (deliveries.length) {
        await this.advance(run);
        this.settle(run);
        await this.store.changed();
      }
      return receipt;
    });
  }

  private async closeEmission(run: FlowspaceRun, step: RunStep, targets: EmissionTarget[], planGate: boolean) {
    const state = this.emissionState(run, step);
    if (state.closed) return;
    let items: FlowItem[] = state.items;
    let total = state.total;
    try {
      if (!state.calls.length) {
        const values = parseEmission(step.output ?? "");
        checkEmissionValues(targets, values);
        items = contentList(values, state.limit).items!;
        total = values.length;
      }
    } catch (error) {
      step.emission = { ...state, closed: true, missing: true };
      step.state = "error";
      step.error = error instanceof Error ? error.message : String(error);
      this.addNoteOnce(run, step.error);
      return;
    }
    const endTargets = targets.filter(target => target.edge.emitMode !== "stream" || !state.calls.length ||
      (!items.length && target.type === "record"));
    if (endTargets.length) {
      const content: FlowContent = { dataType: "list", items, ...(total > items.length ? { originalCount: total } : {}) };
      const list = await this.emissionSnapshot(run, step, content);
      const deliveries = await this.emissionDeliveries(run, step, endTargets, list);
      this.pushEmissionDeliveries(run, step, deliveries, planGate);
      items = list.content!.items!;
    }
    step.emission = { ...state, items, total, closed: true };
  }

  /**
   * Capture upstream snapshots at exact `seq` and route tokens across outgoing active
   * edges, forwarding transparently through `bypassed` Agents (with cycle guard) and
   * respecting `paused` stops, `scope` boundaries, `confirm`/`manual` gates, and `R2` Plan gates.
   */
  private async emitDownstreamTokens(
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
    const outgoing = activeEdges(run.graph.edges).filter((edge) => edge.source === sourceNode.id);
    if (planGateActive && outgoing.length) {
      this.addNoteOnce(run, `${sourceNode.title}：Plan 模式尚未退出计划态，已暂停自动接续等待确认计划`);
    }
    for (const edge of outgoing) {
      if (omit?.has(edge.id)) continue;
      const target = run.graph.nodes.find((node) => node.id === edge.target);
      if (!target || target.participation === "paused" || (!isExecutable(target) && !isContainer(target))) continue;
      const selected = (edge.sourcePort ?? "out") === (step.route ?? "out");
      const fires = step.state !== "skipped" && this.edgeFires(run, edge, step, selected);
      try {
        const mode = target.participation === "bypassed" && edge.mode === "fork" ? "conclusion" : edge.mode;
        const source = fires ? forwarded ?? await this.runtime.capture({ ...sourceNode, sessionId }, mode, seq, output) : undefined;
        this.pushToken(run, edge, step, target, source, planGateActive);
      } catch (error) {
        run.notes.push(`${sourceNode.title} → ${target.title}: ${String(error)}`);
        run.state = "error";
      }
    }
  }

  private edgeFires(run: FlowspaceRun, edge: FlowEdge, step: RunStep, selected: boolean): boolean {
    const logic = edge.logic;
    const routed = logic?.negate ? !selected : selected;
    if (!routed) return false;
    if (step.iteration < (logic?.fromRound ?? 0)) return false;
    return logic?.maxTimes === undefined
      || run.tokens.filter((token) => token.edgeId === edge.id && !token.skip).length < logic.maxTimes;
  }

  private pushToken(
    run: FlowspaceRun, edge: FlowEdge, step: RunStep, target: FlowNode,
    source: ContextSnapshot | undefined, planGate: boolean,
    origin: Pick<FlowToken, "streamFrom" | "fanoutBatchId"> = step,
  ): void {
    const now = Date.now();
    const boundary = !!source && !!run.scope && !run.scope.includes(target.id);
    const needsRelease = !!source && (planGate || boundary || edge.trigger === "confirm" || target.participation === "manual");
    const delayUntil = source && edge.logic?.delayMs ? now + edge.logic.delayMs : undefined;
    const ready = !needsRelease && delayUntil === undefined;
    const token: FlowToken = {
      id: uid(), edgeId: edge.id, stepId: step.id,
      ...(origin.streamFrom ? { streamFrom: origin.streamFrom } : {}),
      ...(origin.fanoutBatchId && (target.generatedBy || target.flowType === "flowspace/merge-sort")
        ? { fanoutBatchId: origin.fanoutBatchId } : {}),
      source: source ?? { id: uid(), kind: "text", sourceNodeId: edge.source, text: "", title: "", capturedAt: now },
      ...(source ? {} : { skip: true }),
      ...(source && planGate ? { planGate: true } : {}),
      ...(needsRelease ? { needsRelease: true } : {}),
      createdAt: now, delayUntil, readyAt: ready ? now : delayUntil,
      boundary, ready, consumed: false, dismissed: false,
    };
    if (ready) markTokenReady(run, token, token.fanoutBatchId && step.endedAt ? step.endedAt : now);
    run.tokens.push(token);
    if (delayUntil !== undefined) this.armDelay(run, token);
  }

  private forwardThroughBypass(run: FlowspaceRun, node: FlowNode, token: FlowToken, step: RunStep, cycleEdges: Set<string>): void {
    this.addNoteOnce(run, `${node.title}：已旁路透传上游上下文`);
    for (const edge of activeEdges(run.graph.edges).filter((candidate) => candidate.source === node.id)) {
      const target = run.graph.nodes.find((entry) => entry.id === edge.target);
      if (!target || target.participation === "paused" || !isExecutable(target)) continue;
      // A bypass cycle cannot generate additional copies of the same originating delivery.
      const fires = !token.skip && this.edgeFires(run, edge, step, true);
      if (cycleEdges.has(edge.id) && run.tokens.some((seen) =>
        seen.edgeId === edge.id && seen.stepId === step.id && Boolean(seen.skip) === !fires)) continue;
      this.pushToken(run, edge, step, target, fires ? token.source : undefined, false, token);
    }
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
      const matches = (s: RunStep) => s.sessionId === sessionId && !s.endedAt && s.turn === turn;
      const settling = (s: RunStep) => s.sessionId === sessionId && s.state === "settling";
      const run = this.runs.find((r) => r.steps.some(matches)) ??
        (teamFollowup ? this.runs.findLast((r) => r.steps.some(settling)) : undefined);
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

  private waitForTeam(run: FlowspaceRun, step: RunStep, sessionId: string): void {
    if (this.teamSettlements.has(step.id)) return;
    this.teamSettlements.add(step.id);
    const finish = (ending: string, error?: string) => this.transact(async () => {
      this.teamSettlements.delete(step.id);
      if (step.state === "settling") await this.finishStep(run, step, sessionId, ending, error);
    });
    void this.runtime.waitForTeam!(sessionId).then(
      () => finish("completed"),
      (error) => finish("error", String(error)),
    ).catch((error) => console.error("FlowSpace team settlement:", error));
  }

  private async finishStep(
    run: FlowspaceRun, step: RunStep, sessionId: string, ending: string, error?: string,
  ): Promise<void> {
    step.endedAt = Date.now();
    step.telemetry ??= { stepCount: 1, inputTokens: 0, outputTokens: 0 };
    if (step.telemetry.stepCount === 0) step.telemetry.stepCount = 1;
    step.telemetry.durationMs = Math.max(0, step.endedAt - step.createdAt);
    step.state = ending === "completed" || ending === "aborted" || ending === "interrupted" ? ending : "error";
    step.error = error ?? (step.state === "error" ? ending : undefined);
    this.clearTimer(`budget:${run.id}:${step.id}`);
    await this.enforceBudget(run, step, false);
    if (step.parameterRetryFor) {
      const target = run.steps.find(entry => entry.id === step.parameterRetryFor);
      if (target?.operation && target.state === "awaiting" && !["cancelled", "interrupted"].includes(run.state)) {
        const data = step.operationParameters?.[target.nodeId] ?? {};
        for (const field of target.operation.missing) {
          if (data[field]?.trim()) target.operation.values[field] = data[field];
        }
        target.operation.missing = target.operation.missing.filter(field => !target.operation!.values[field]?.trim());
        target.operation.review = true;
        delete target.human;
        target.state = "running";
        await this.store.changed();
        this.execute(run, target, run.graph.nodes.find(node => node.id === target.nodeId)!);
      }
      if (step.state === "error" || step.state === "interrupted") step.state = "skipped";
      this.settle(run);
      await this.store.changed();
      return;
    }
    await this.status(run, step, step.state === "completed" ? "done" : "error", step.error ?? step.output, ending);

    // Capture each edge at the settled lead turn before any downstream dispatch.
    if (step.state === "completed" && !["cancelled", "interrupted"].includes(run.state)) {
      step.route = "out";
      const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
      const planGateActive = Boolean(await this.runtime.isPlanModeActive?.(sessionId));
      await this.deliverAgentResult(run, step, node, planGateActive);
      await this.store.changed();
      if (run.state !== "error") await this.advance(run);
    } else {
      if (step.emission) step.emission.closed = true;
      if (step.fanoutBatchId || run.fanouts?.some(batch => batch.producerStepId === step.id)) await this.advance(run);
    }
    this.settle(run);
    await this.store.changed();
  }

  private async deliverAgentResult(run: FlowspaceRun, step: RunStep, node: FlowNode, planGate: boolean) {
    const targets = emissionTargets(run, step.nodeId);
    const omit = new Set(targets.map(target => target.edge.id));
    if (!step.reminderFor) {
      for (const token of run.tokens) if (token.stepId === step.id) omit.add(token.edgeId);
      await this.emitDownstreamTokens(run, step, node, step.sessionId, step.endSeq,
        step.output ?? "", planGate, undefined, omit);
    }
    if (targets.length) {
      try {
        await this.closeEmission(run, step, targets, planGate);
      } catch (error) {
        step.state = "error";
        step.error = String(error);
        this.addNoteOnce(run, step.error);
      }
    }
  }

  remindEmission(runId: string, stepId: string): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const prior = run.steps.find(step => step.id === stepId);
      if (!prior?.emission?.missing) throw new Error("该步骤没有需要补交的结构化输出");
      if (prior.emission.reminderStepId) return;
      if (["cancelled", "interrupted", "paused"].includes(run.state)) throw new Error("当前运行无法补交输出");
      run.state = "running";
      await this.enqueue(run, prior.nodeId, prior.sources, true, prior);
      this.settle(run);
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

  private async finishExecStep(run: FlowspaceRun, step: RunStep, result: Exclude<ExecResult, { awaiting: unknown }>, skipped = false) {
    const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
    step.state = skipped ? "skipped" : "completed";
    step.route = result.route;
    if (result.route === "error") step.error ??= result.output;
    step.output = result.output;
    step.verdict = result.verdict;
    if (result.dataCalls) step.dataCalls = result.dataCalls;
    if (!skipped && result.route !== "error" && descriptorOf(node.flowType)?.family === "data") {
      step.outputContent = result.source.content;
      if (node.flowType === "flowspace/accumulate" && result.source.content) {
        await this.store.recordAccumulator?.(run, step, node, result.source);
        const states = run.accumulators ??= [];
        const state = states.find(existing => existing.nodeId === node.id);
        if (state) state.content = result.source.content;
        else states.push({ nodeId: node.id, content: result.source.content });
      }
    }
    step.endedAt = Date.now();
    step.telemetry = { stepCount: 1, inputTokens: 0, outputTokens: 0, ...result.telemetry,
      durationMs: step.endedAt - step.createdAt };
    this.clearTimer(`budget:${run.id}:${step.id}`);
    await this.enforceBudget(run, step, false);
    if (!skipped) await this.status(run, step, result.route === "error" ? "error" : "done", result.output, result.route);
    await this.emitDownstreamTokens(run, step, node, undefined, undefined, result.output, false, result.source);
    await this.advance(run);
    this.settle(run);
    await this.store.changed();
  }

  private execute(run: FlowspaceRun, step: RunStep, node: FlowNode): void {
    const controller = new AbortController();
    this.executions.set(step.id, controller);
    const recordCall = (trace: DataCallTrace) => this.transact(async () => {
      if (this.disposed) return;
      (step.dataCalls ??= []).push(trace);
      const telemetry = step.telemetry ??= { stepCount: 0, inputTokens: 0, outputTokens: 0 };
      telemetry.stepCount++;
      telemetry.inputTokens += trace.inputTokens;
      telemetry.outputTokens += trace.outputTokens;
      await this.enforceBudget(run, step, false);
      await this.store.changed();
    });
    const dispatch = async (previous?: FlowContent): Promise<ExecResult> => {
      if (!this.runtime.execute) throw new Error("Host 未注册节点执行器");
      const configured = step.resolvedConfig ? { ...node, config: step.resolvedConfig } : node;
      return this.runtime.execute(configured, step, controller.signal, { runId: run.id, listLimit: run.listLimit, previous, recordCall });
    };
    const complete = async (result?: ExecResult, error?: unknown) => {
      this.executions.delete(step.id);
      if (controller.signal.aborted || step.state !== "running" || this.disposed) return;
      if (!result) {
        step.error = String(error);
        result = { route: "error", output: step.error, source: await forwardInput(node, step) };
      }
      if (result.operation) step.operation = result.operation;
      if (result.operationResult) step.operationResult = result.operationResult;
      if ("awaiting" in result) {
        step.state = "awaiting";
        step.human = result.awaiting;
        this.armHuman(run, step);
        await this.status(run, step, "waiting", step.human.question);
        await this.advance(run);
        this.settle(run);
        await this.store.changed();
      } else {
        await this.finishExecStep(run, step, result);
      }
    };
    // Append is the sole stateful transform. Select the prior value and commit its
    // successor in the same admission-ordered transaction; other transforms run outside the queue.
    const work = node.flowType === "flowspace/accumulate" ? this.transact(async () => {
      if (controller.signal.aborted || step.state !== "running" || this.disposed) return;
      const previous = run.accumulators?.find(state => state.nodeId === node.id)?.content;
      let result: ExecResult;
      try { result = await dispatch(previous); }
      catch (error) { await complete(undefined, error); return; }
      await complete(result);
    }) : dispatch().then(
      result => this.transact(() => complete(result)),
      error => this.transact(() => complete(undefined, error)),
    );
    void work.catch(error => console.error("FlowSpace 节点执行收尾失败", error));
  }

  private clearTimer(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  private schedule(id: string, deadline: number, action: () => Promise<void>): void {
    this.clearTimer(id);
    if (this.disposed) return;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      if (Date.now() < deadline) this.schedule(id, deadline, action);
      else void this.transact(action).catch((error) => console.error("FlowSpace 调度定时器", error));
    }, Math.min(2_147_483_647, Math.max(0, deadline - Date.now())));
    timer.unref();
    this.timers.set(id, timer);
  }

  private armDelay(run: FlowspaceRun, token: FlowToken): void {
    if (token.delayUntil === undefined) return;
    this.schedule(token.id, token.delayUntil, async () => {
      if (this.disposed || token.consumed || token.dismissed || ["cancelled", "interrupted"].includes(run.state)) return;
      delete token.delayUntil;
      token.ready = !token.needsRelease && !token.loopCapReached;
      if (token.ready) markTokenReady(run, token);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }

  private armHuman(run: FlowspaceRun, step: RunStep): void {
    const human = step.human;
    if (human?.deadline === undefined || !human.timeoutAction || human.timeoutAction === "wait") return;
    this.schedule(step.id, human.deadline, async () => {
      if (this.disposed || step.state !== "awaiting" || ["cancelled", "interrupted"].includes(run.state)) return;
      const route = human.timeoutAction === "default" ? human.defaultOption! : human.timeoutAction === "skip" ? "skip" : "timeout";
      await this.resolveHuman(run, step, route, human.timeoutAction === "skip");
    });
  }

  private async resolveHuman(run: FlowspaceRun, step: RunStep, route: string, skip = false) {
    this.clearTimer(step.id);
    const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
    const source = route === "out" && step.human?.fields && step.human.initial
      ? this.humanSource(node, step, step.human.initial) : await forwardInput(node, step, this.runtime.contextText?.bind(this.runtime));
    await this.finishExecStep(run, step, { route, source, output: route, verdict: { branch: route } }, skip);
  }

  private humanSource(node: FlowNode, step: RunStep, values: JsonObject): ContextSnapshot {
    if (node.flowType === "flowspace/human-score")
      values = { ...values, reviewed: step.sources[0]?.content?.value ?? step.sources[0]?.text ?? "" };
    return snapshotWithContent(node, node.flowType === "flowspace/human-review"
      ? { dataType: "text", value: String(values.text ?? "") } : { dataType: "record", value: values });
  }

  answerHuman(runId: string, stepId: string, option: string, values?: JsonObject): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const step = run.steps.find((s) => s.id === stepId);
      if (step?.state !== "awaiting" || !step.human) throw new Error("该步骤没有等待回答的问题");
      if (!step.human.options.includes(option)) throw new Error("无效的人工选项");
      if (step.human.operation && option === "execute" && step.operation) {
        for (const key of step.operation.missing) {
          if (typeof values?.[key] !== "string" || !(values[key] as string).trim()) throw new Error(`请填写 ${key}`);
        }
        for (const key of step.operation.missing) step.operation.values[key] = values![key] as string;
        step.operation.missing = [];
        step.operation.approved = true;
        delete step.human;
        step.state = "running";
        run.state = "running";
        await this.store.changed();
        this.execute(run, step, run.graph.nodes.find(node => node.id === step.nodeId)!);
        return;
      }
      if (step.human.operation && option === "skip") {
        await this.resolveHuman(run, step, "skip", true);
        return;
      }
      if (step.human.operation && option === "retry" && step.operation?.sessionId) {
        if (run.steps.some(entry => entry.parameterRetryFor === step.id)) throw new Error("已经向上游追问");
        const prior = run.steps.find(entry => step.upstreamStepIds?.includes(entry.id) && entry.sessionId === step.operation?.sessionId);
        if (!prior) throw new Error("无法找到上游会话");
        const retry: RunStep = {
          id: uid(), requestId: uid(), nodeId: prior.nodeId, sessionId: prior.sessionId,
          task: "请调用 provide_flow_parameters 补齐上一轮未提供的参数。操作将由 FlowSpace 执行。",
          parameterRetryFor: step.id, state: "queued", iteration: prior.iteration,
          sources: step.sources, createdAt: Date.now(), startedAt: Date.now(),
        };
        step.human.options = step.human.options.filter(option => option !== "retry");
        run.steps.push(retry);
        await this.store.changed();
        await this.runtime.send(retry);
        return;
      }
      if (step.human.fields && option === "skip") {
        await this.resolveHuman(run, step, "skip", true);
        return;
      }
      if (step.human.fields && option === "out") {
        this.clearTimer(step.id);
        const node = run.graph.nodes.find(node => node.id === step.nodeId)!;
        const answer = checkAnswers(step.human.fields, values ?? {});
        const source = this.humanSource(node, step, answer);
        step.human.initial = answer;
        await this.finishExecStep(run, step, { route: "out", source, output: source.text });
        return;
      }
      await this.resolveHuman(run, step, option);
    });
  }

  private async advance(run: FlowspaceRun): Promise<void> {
    if (this.disposed) return;
    if (run.state === "paused") await this.fanout.collectCompleted(run);
    else if (!["cancelled", "interrupted", "error"].includes(run.state)) await this.advanceRun(run);
    await this.wakeFanouts(run);
  }

  private async wakeFanouts(except: FlowspaceRun): Promise<void> {
    for (const other of this.runs) {
      if (other === except || !["running", "waiting"].includes(other.state) || !this.fanout.hasAdmission(other)) continue;
      await this.advanceRun(other);
      this.settle(other);
    }
  }

  private async advanceRun(run: FlowspaceRun): Promise<void> {
    let expanded: boolean;
    do {
      await this.advanceGraph(run);
      await this.deliverContainers(run);
      await this.deliverEvents(run);
      expanded = await this.fanout.pump(run, (edge, step, input, batch) => {
        const target = run.graph.nodes.find(node => node.id === edge.target)!;
        this.pushToken(run, edge, step, target, input, false, { fanoutBatchId: batch.id });
      }, (merge, batch, result, error) => this.finishMerge(run, merge, batch, result, error),
      (batch, lane) => this.cancelFanoutLane(run, batch, lane));
    } while (expanded && run.state !== "error");
  }

  private async deliverContainers(run: FlowspaceRun) {
    const deliveries = new Map(run.graph.edges.filter(edge => edge.kind !== "reference" &&
      run.graph.nodes.some(node => node.id === edge.target && isContainer(node))).map(edge => [edge.id, edge]));
    for (const token of run.tokens) {
      const edge = deliveries.get(token.edgeId);
      if (!edge || !token.ready || token.dismissed || token.consumed) continue;
      if (!token.skip) {
        try { await this.store.deliver?.(run, edge, token); }
        catch (error) {
          run.state = "error";
          this.addNoteOnce(run, `投递失败：${String(error)}`);
        }
      }
      consumeToken(token);
    }
  }

  private async deliverEvents(run: FlowspaceRun, budgetOnly = false) {
    const edges = new Map(run.graph.edges.filter(edge => edge.kind === "event").map(edge => [edge.id, edge]));
    for (const token of run.tokens) {
      const edge = edges.get(token.edgeId);
      if (!edge || token.consumed || !token.ready || token.dismissed) continue;
      if (budgetOnly && (!edge.event?.kinds.includes("budget") ||
          run.graph.nodes.find(node => node.id === edge.target)?.flowType !== "flowspace/notice")) continue;
      consumeToken(token);
      if (!token.skip) await this.enqueue(run, edge.target, [token.source], true, undefined, {
        upstreamStepIds: [token.stepId], sourcePorts: [edge.targetPort ?? "in"],
      });
    }
  }

  private async finishMerge(run: FlowspaceRun, node: FlowNode, batch: RunFanout, source: ContextSnapshot, error?: string) {
    const now = Date.now();
    const step: RunStep = {
      id: uid(), requestId: uid(), nodeId: node.id, iteration: run.steps.filter(other => other.nodeId === node.id).length + 1,
      fanoutId: batch.fanId, fanoutBatchId: batch.id, state: error ? "error" : "completed", route: error ? "error" : "out", error, task: "",
      sources: [source], output: source.text, createdAt: now, endedAt: now,
    };
    batch.mergeStepId = step.id;
    run.steps.push(step);
    if (run.graph.edges.some(edge => edge.source === batch.groupId && edge.kind === "event"))
      await this.status(run, { ...step, nodeId: batch.groupId }, error ? "error" : "done", error ?? source.text);
    if (!error && node.config?.sortMode && node.config.sortMode !== "off") {
      step.state = "running";
      delete step.route;
      delete step.endedAt;
      await this.store.changed();
      this.execute(run, step, node);
      return;
    }
    await this.emitDownstreamTokens(run, step, node, undefined, undefined, source.text, false, source);
  }

  private async cancelFanoutLane(run: FlowspaceRun, batch: RunFanout, lane: RunFanoutLane) {
    for (const step of run.steps.filter(step => step.fanoutBatchId === batch.id && step.itemKey === lane.item.key &&
      (activeStep(step) || step.state === "awaiting"))) {
      await this.stopStep(step);
      step.state = "aborted";
      step.endedAt = Date.now();
    }
    const edges = new Set(run.graph.edges.filter(edge => edge.generatedBy === batch.fanId && edge.itemKey === lane.item.key).map(edge => edge.id));
    for (const token of run.tokens) {
      if (token.fanoutBatchId !== batch.id || !edges.has(token.edgeId) || token.consumed) continue;
      this.clearTimer(token.id);
      token.dismissed = true;
      consumeToken(token);
    }
    lane.state = "cancelled";
    lane.endedAt = Date.now();
  }

  private async advanceGraph(run: FlowspaceRun): Promise<void> {
    const nodes = new Map(run.graph.nodes.map((node) => [node.id, node]));
    const links = activeEdges(run.graph.edges).filter((edge) => {
      const source = nodes.get(edge.source), target = nodes.get(edge.target);
      return source && target && (isExecutable(source) || source.flowType === triggerNode.flowType) && isExecutable(target)
        && !source.removed && !target.removed && !isFanoutMaster(run.graph, source) && !isFanoutMaster(run.graph, target)
        && !(edge.generatedBy && target.flowType === "flowspace/merge-sort")
        && source.participation !== "paused" && target.participation !== "paused";
    });
    const edges = new Map(links.map((edge) => [edge.id, edge]));
    const { component, rank, cyclic } = graphOrder(run.graph.nodes, links, run.roots);
    const bypassNodes = run.graph.nodes.filter((node) => node.participation === "bypassed");
    const bypassLinks = links.filter((edge) => nodes.get(edge.source)?.participation === "bypassed"
      && nodes.get(edge.target)?.participation === "bypassed");
    const bypassOrder = graphOrder(bypassNodes, bypassLinks, []);
    const bypassCycles = new Set(bypassLinks.filter((edge) => {
      const group = bypassOrder.component.get(edge.source)!;
      return bypassOrder.cyclic.has(group) && group === bypassOrder.component.get(edge.target);
    }).map((edge) => edge.id));
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
      // Pending deliveries and active work can still produce inputs for a join.
      // An emitted edge remains an input after consumption for subsequent loop rounds.
      const frontier = run.steps.filter((s) => activeStep(s) || ["awaiting", "error", "interrupted", "aborted"].includes(s.state))
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
        if (!node || !isExecutable(node) || node.participation === "paused") continue;
        const incoming = links.filter((edge) => edge.target === nodeId && (delivered.has(edge.id) || producers.has(edge.source)));
        if (!incoming.length) continue;
        const pending = run.tokens.filter((token) => !token.consumed && !token.dismissed && edges.get(token.edgeId)?.target === nodeId);
        if (!pending.length) continue;
        if (node.participation === "bypassed") {
          for (const token of pending) {
            if (!token.ready) continue;
            consumeToken(token);
            if (!token.skip || !feedback.has(token.edgeId)) {
              this.forwardThroughBypass(run, node, token, steps.get(token.stepId)!, bypassCycles);
            }
            progressed = true;
          }
          continue;
        }
        const batchId = node.generatedBy ? pending[0]?.fanoutBatchId : undefined;
        const count = run.steps.filter((step) => step.nodeId === nodeId && (!batchId || step.fanoutBatchId === batchId)).length;
        const group = component.get(nodeId)!;
        const limit = limits.get(group) ?? Infinity;
        if (count >= limit) {
          for (const token of pending) {
            if (token.skip || token.loopCapReached) continue;
            token.loopCapReached = true;
            token.ready = false;
            delete token.readyAt;
            this.addNoteOnce(run, `${node.title}：已达到循环上限（${limit} 轮），可点击「+1 轮」继续或跳过完成`);
          }
        }

        const chosen: FlowToken[] = [];
        let missing = false;
        for (const edge of incoming) {
          const back = feedback.has(edge.id);
          if (back && count === 0) continue;
          const internal = component.get(edge.source) === group;
          const candidates = run.tokens.filter((token) => {
            if (token.edgeId !== edge.id || token.dismissed || (batchId && token.fanoutBatchId !== batchId)) return false;
            if (!internal) return true;
            // A transparent bypass preserves the originating step and its round.
            const origin = steps.get(token.stepId)!;
            if (component.get(origin.nodeId) !== group) return true;
            const sourceFeedsBack = rank.get(origin.nodeId)! >= rank.get(nodeId)!;
            return origin.iteration === count + (sourceFeedsBack ? 0 : 1);
          });
          let token = candidates.find((t) => !t.consumed && (!back || !t.skip));
          // A closed feedback path can satisfy a join with another live back edge,
          // but cannot start a round or turn the loop into an endless chain of skips.
          if (back && !token && candidates.some((t) => t.skip)) continue;
          if (!token && !internal && cyclic.has(group)) token = candidates.at(-1);
          if (!token?.ready) { missing = true; break; }
          chosen.push(token);
        }
        if (missing || !chosen.some((token) => !token.consumed)) continue;
        const live = chosen.filter((token) => !token.skip);
        const fires = live.some((token) => !token.consumed);
        chosen.forEach(consumeToken);
        progressed = true;
        if (fires) {
          await this.enqueue(run, nodeId, live.map((token) => token.source), true, undefined, {
            ...(node.kind === "flow" ? { sourcePorts: live.map(token => edges.get(token.edgeId)?.targetPort ?? "in") } : {}),
            fanoutBatchId: batchId, streamFrom: live.find(token => token.streamFrom)?.streamFrom,
            upstreamStepIds: [...new Set(live.map(token => token.stepId))],
          });
        } else {
          const now = Date.now();
          const step: RunStep = {
            id: uid(), requestId: uid(), nodeId, iteration: count + 1, state: "skipped",
            sources: [], task: "", createdAt: now, endedAt: now,
            ...(batchId ? { fanoutBatchId: batchId, fanoutId: node.generatedBy, itemKey: node.itemKey } : {}),
          };
          run.steps.push(step);
          steps.set(step.id, step);
          const pair = node.flowType === "flowspace/fanout" && fanoutPair(run.graph, node.id);
          if (pair) {
            const merge = { ...step, id: uid(), requestId: uid(), nodeId: pair.merge.id, fanoutId: node.id };
            run.steps.push(merge);
            await this.emitDownstreamTokens(run, merge, pair.merge, undefined, undefined, "", false);
          } else await this.emitDownstreamTokens(run, step, node, undefined, undefined, "", false);
        }
      }
    } while (progressed && run.state !== "error");
  }

  /** Extend bounded-loop round budget (`+1 Round` gate) and immediately advance parked feedback tokens. */
  extendLoop(request: ExtendLoopRequest): Promise<void> {
    return this.transact(async () => {
      const run = this.requireRun(request.runId);
      if (["cancelled", "interrupted"].includes(run.state)) return;
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
          if (comp !== undefined && order.cyclic.has(comp))
            targetComps.add(comp);
        }
      }

      if (!targetComps.size) return;

      for (const edge of activeEdges(run.graph.edges)) {
        const sc = order.component.get(edge.source);
        const tc = order.component.get(edge.target);
        if (sc !== undefined && sc === tc && targetComps.has(sc)) {
          edge.maxRounds += extra;
        }
      }

      for (const token of run.tokens) {
        if (!token.loopCapReached || token.consumed || token.dismissed)
          continue;
        const edge = run.graph.edges.find((e) => e.id === token.edgeId);
        const comp = edge ? order.component.get(edge.target) : undefined;
        if (comp !== undefined && targetComps.has(comp)) {
          delete token.loopCapReached;
          if (!token.boundary && !token.planGate && !token.needsRelease && token.delayUntil === undefined) {
            token.ready = true;
            markTokenReady(run, token);
          }
        }
      }

      if (run.state === "waiting") run.state = "running";
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }

  private async enqueue(
    run: FlowspaceRun,
    nodeId: string,
    sources: ContextSnapshot[],
    isContinuation = false,
    reminder?: RunStep,
    origin: Pick<RunStep, "streamFrom" | "fanoutBatchId" | "sourcePorts" | "upstreamStepIds"> = {},
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

    const task = reminder ? `请调用 flow_emit 补交上一轮任务要求的结构化内容。\n\n${reminder.task}` : isContinuation
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
      ...(node.generatedBy ? { fanoutId: node.generatedBy, itemKey: node.itemKey } : {}),
      ...origin,
      createdAt: Date.now(),
      ...(reminder ? { reminderFor: reminder.id } : {}),
    };
    if (node.kind === "flow") {
      step.sourcePorts = [...(origin.sourcePorts ?? sources.map(source =>
        run.graph.edges.find(edge => edge.source === source.sourceNodeId && edge.target === nodeId)?.targetPort ?? "in"))];
    }
    run.steps.push(step);
    if (reminder?.emission) reminder.emission.reminderStepId = step.id;
    try {
      const pendingSentUpdates: { edge: FlowEdge; version: string }[] = [];
      for (const edge of (reminder ? [] : run.graph.edges).filter(
        (e) =>
          e.target === nodeId &&
          (e.kind === "reference" || e.trigger === "off"),
      )) {
        const source = run.graph.nodes.find((n) => n.id === edge.source)!;
        if (!source) continue;
        if (reuseReferences && sources.some((saved, index) => saved.sourceNodeId === edge.source &&
          (!origin.sourcePorts || origin.sourcePorts[index] === (edge.targetPort ?? "in")))) continue;
        const variable = source.flowType === "flowspace/variable" && this.store.variableReference?.(run, step, source);
        const captured = variable ||
          (source.kind === "agent"
            ? await this.runtime.capture(source, edge.mode)
            : await this.runtime.reference(source, edge, node, run.listLimit));
        if (captured.referenceKind === "board-card" && captured.missing) continue;
        const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
        edge.currentVersion = version;
        if (source.kind === "display" && source.sourceNodeId) {
          const replaced = source.sourceNodeId;
          if (step.sourcePorts) step.sourcePorts = step.sourcePorts.filter((_, i) => step.sources[i].sourceNodeId !== replaced);
          step.sources = step.sources.filter(
            (s) => s.sourceNodeId !== source.sourceNodeId,
          );
        }
        if (
          edge.kind === "reference" &&
          node.kind !== "flow" &&
          !edge.always &&
          edge.sentVersion === version
        )
          continue;
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
      )
        throw new Error("一次会话引用最多包含三个来源；更多来源可改用结论");
      await this.store.prepareStep?.(run, step, node);
      const debug = { originalTask: task, continuation: isContinuation,
        references: pendingSentUpdates.map(({ edge, version }) => ({ edgeId: edge.id, version })),
        tools: this.store.toolsFor?.(run, step) ?? [] };
      const over = node.flowType !== "flowspace/notice" && await this.enforceBudget(run, step, true);
      if (over || node.breakpoint || run.singleStep) {
        step.state = "awaiting";
        step.debug = { reason: over ? "budget" : "breakpoint", ...debug };
        run.singleStep = false;
        if (!over) await this.status(run, step, "waiting");
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

  private async admitPrepared(run: FlowspaceRun, step: RunStep, node: FlowNode,
    prepared: Pick<NonNullable<RunStep["debug"]>, "references" | "originalTask" | "continuation">) {
      const { originalTask, continuation, references } = prepared;
      const pendingSentUpdates = references.flatMap(({ edgeId, version }) => {
        const edge = run.graph.edges.find(edge => edge.id === edgeId);
        return edge ? [{ edge, version }] : [];
      });
      const liveDoc = this.store.document();
      const nodeId = node.id;
      const fork = step.sources.find((s) => s.kind === "fork");
      step.startedAt = Date.now();
      this.armBudget(run, step);
      if (node.kind === "flow") {
        step.state = "running";
        for (const { edge, version } of pendingSentUpdates) edge.sentVersion = version;
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
      // A draft fork is one-time. Subsequent loop rounds reuse the created Session.
      if (current?.sessionId) node.sessionId = current.sessionId;
      step.sessionId = await this.runtime.ensure(
        node,
        node.sessionId || node.generatedBy ? undefined : fork,
        laneSessionTitle(run, node),
      );
      node.sessionId = step.sessionId;
      const teamId = teamIdOf(node, staffedIds(liveDoc.nodes));
      if (teamId) step.teamRef = this.runtime.teamReference?.(step.sessionId) ?? node.teamRef ?? { teamId };
      await this.store.bound(nodeId, step.sessionId, fork);
      if (fork)
        for (const e of run.graph.edges.filter(
          (e) => e.target === nodeId && e.mode === "fork",
        )) {
          e.originMode = "fork";
          e.mode = "conclusion";
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
      if (!step.reminderFor) await this.store.submitted(nodeId, originalTask, continuation);
      await this.store.changed();
  }

  debugStep(runId: string, stepId: string, action: "continue" | "step" | "skip", task?: string) {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const step = run.steps.find(entry => entry.id === stepId);
      if (!step?.debug || step.state !== "awaiting" || run.budgetPause) throw new Error("此步骤未处于可放行的断点");
      const prepared = step.debug;
      if (task !== undefined) step.task = task;
      delete step.debug;
      run.state = "running";
      run.singleStep = action === "step";
      if (action === "skip") await this.resolveHuman(run, step, "skip", true);
      else {
        step.state = "queued";
        const node = run.graph.nodes.find(node => node.id === step.nodeId)!;
        try { await this.admitPrepared(run, step, node, prepared); }
        catch (error) { step.state = "error"; step.endedAt = Date.now(); step.error = String(error); }
      }
      this.settle(run);
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
      )
        return;
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
        if (token.boundary && run.scope)
          run.scope.push(
            run.graph.edges.find((e) => e.id === token.edgeId)!.target,
          );
        token.boundary = false;
      }
      if (run.state === "waiting") run.state = "running";
      await this.advance(run);
      this.settle(run);
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
          (run.budgetAcknowledged ??= []).push(`${nodeId ?? "run"}:${dimension}`);
          delete run.budgetPause;
          for (const step of run.steps) if (step.debug?.reason === "budget") step.debug.reason = "breakpoint";
        }
        this.restoreWaits(run);
        await this.advance(run);
        this.settle(run);
      } else {
        run.state = "cancelled";
        delete run.pendingEvents;
        for (const step of run.steps.filter((s) => activeStep(s) || s.state === "awaiting")) {
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
          for (const lane of batch.lanes) if (lane.state === "queued" || lane.state === "running") {
            lane.state = "cancelled";
            lane.endedAt = Date.now();
          }
        }
        await this.wakeFanouts(run);
      }
      await this.store.changed();
    });
  }

  /** Safely interrupt all active runs before restoring a canvas snapshot (R10). */
  private async stopStep(step: RunStep): Promise<void> {
    this.clearTimer(step.id);
    if (step.emission) step.emission.closed = true;
    const controller = this.executions.get(step.id);
    if (controller) {
      controller.abort();
      this.executions.delete(step.id);
    } else if (step.sessionId) await this.runtime.cancel(step).catch(() => {});
  }

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
      this.addNoteOnce(run, reasonNote);
    }
  }

  private hasDurableWait(run: FlowspaceRun): boolean {
    return !!run.pendingEvents?.length ||
      !!run.fanouts?.some(batch => !batch.mergeStepId || batch.lanes.some(lane => lane.state === "queued" || lane.state === "running")) ||
      run.steps.some((step) => step.state === "awaiting") ||
      run.tokens.some((token) => !token.consumed && !token.dismissed && token.delayUntil !== undefined);
  }

  private restoreWaits(run: FlowspaceRun): void {
    for (const batch of run.pendingEvents ?? []) this.armEvent(run, batch);
    for (const step of run.steps) if (step.state === "awaiting") this.armHuman(run, step);
    for (const token of run.tokens) if (!token.consumed && !token.dismissed) this.armDelay(run, token);
  }

  recover(): Promise<void> {
    return this.transact(async () => {
      const resume: FlowspaceRun[] = [];
      for (const run of this.runs) {
        if (!["running", "waiting", "paused"].includes(run.state)) continue;
        const hadActiveSteps = run.steps.some(activeStep);
        const resumable = this.hasDurableWait(run) || (run.state === "paused" && !hadActiveSteps);
        if (!resumable) run.state = "interrupted";
        for (const step of run.steps) {
          if (activeStep(step) || (resumable && step.fanoutBatchId && step.sessionId && step.state === "interrupted" && step.endSeq === undefined)) {
            let patch: Partial<RunStep>;
            try {
              patch = step.sessionId && this.runtime.reconcile
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
                  await this.deliverAgentResult(run, step, source, planGateActive);
                } catch (err) {
                  this.addNoteOnce(
                    run,
                    `${source.title}：恢复捕获结果失败（${String(err)}）`,
                  );
                }
              }
            } else if (step.emission && !activeStep(step)) step.emission.closed = true;
          }
        }
        if (resumable) {
          this.restoreWaits(run);
          resume.push(run);
        }
        if (hadActiveSteps || !resumable) this.addNoteOnce(run,
          "Host 已重新启动。保留已完成结果；继续只推进尚未投递的接续，中断节点请手动重跑。");
      }
      // Reconcile every native request before a different run can claim a released fan-out slot.
      for (const run of resume) {
        await this.advance(run);
        this.settle(run);
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
        if (this.hasDurableWait(run)) {
          if (run.state !== "paused") run.state = "waiting";
        } else if (run.state !== "paused" || active.length) run.state = "interrupted";
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

  private settle(run: FlowspaceRun): void {
    for (const step of run.steps) {
      if (step.state === "completed" && step.route === "error" && step.error) step.state = "error";
    }
    if (["paused", "cancelled", "interrupted"].includes(run.state)) return;
    if (run.steps.some((s) => s.state === "awaiting"))
      run.state = "waiting";
    else if (run.steps.some(activeStep))
      run.state = "running";
    else if (run.tokens.some((t) => !t.skip && !t.consumed && !t.dismissed && !t.ready))
      run.state = "waiting";
    else if (run.pendingEvents?.length || run.fanouts?.some(batch => batch.lanes.some(lane => lane.state === "queued")))
      run.state = "waiting";
    else if (
      run.steps.some((step) => {
        if (step.emission?.reminderStepId) return false;
        if (step.itemKey && run.fanouts?.some(batch => batch.id === step.fanoutBatchId && batch.mergeStepId &&
          batch.lanes.some(lane => lane.item.key === step.itemKey && lane.adopted === false))) return false;
        if (step.state === "error" && step.route === "error") {
          return !run.tokens.some((token) => token.stepId === step.id && !token.skip);
        }
        return ["error", "aborted", "interrupted"].includes(step.state);
      }) ||
      run.state === "error"
    )
      run.state = "error";
    else if (run.tokens.some((t) => !t.skip && !t.consumed && !t.dismissed)) {
      run.state = "error";
      this.addNoteOnce(
        run,
        "接续无法汇合：有分支被跳过或未产生本轮结果。可从目标节点手动继续。",
      );
    } else run.state = "completed";
  }
}
