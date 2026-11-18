import type {
  ContextMode,
  ContextSnapshot,
  ExtendLoopRequest,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowToken,
  RunStep,
  StartRequest,
} from "../types.ts";
import {
  members,
  syncUntitledAgentNode,
  syncUntitledAgentTitles,
  uid,
} from "./document.ts";
import {
  activeEdges,
  ancestorsOf,
  graphOrder,
  launchPlan,
  reachable,
} from "./graph.ts";

export interface RuntimeAdapter {
  ensure(node: FlowNode, fork?: ContextSnapshot): Promise<string>;
  send(step: RunStep): Promise<void>;
  cancel(step: RunStep): Promise<void>;
  capture(
    node: FlowNode,
    mode: ContextMode,
    seq?: number,
    output?: string,
  ): Promise<ContextSnapshot>;
  reference(node: FlowNode, edge?: FlowEdge): Promise<ContextSnapshot>;
  reconcile?(step: RunStep): Promise<Partial<RunStep>>;
  running?(): string[];
  isPlanModeActive?(sessionId: string): boolean | Promise<boolean>;
}
export interface SchedulerStore {
  document(): FlowspaceDocument;
  changed(): Promise<void>;
  bound(
    nodeId: string,
    sessionId: string,
    fork?: ContextSnapshot,
  ): Promise<void>;
  submitted(
    nodeId: string,
    task: string,
    isContinuation?: boolean,
  ): Promise<void>;
}

/** Durable run ownership. A promise queue serializes commands, never model execution. */
export class Scheduler {
  readonly runs: FlowspaceRun[];
  private serial: Promise<unknown> = Promise.resolve();
  private disposed = false;
  constructor(
    private runtime: RuntimeAdapter,
    private store: SchedulerStore,
    runs: FlowspaceRun[] = [],
  ) {
    this.runs = runs;
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
          .filter((s) => s.state === "running" || s.state === "queued")
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
          .filter((t) => !t.ready && !t.consumed && !t.dismissed)
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
      if (!plan.roots.length) throw new Error("没有可启动的 Agent");

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
      this.settle(run);
      await this.store.changed();
      return structuredClone(run);
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
            .nodes.some((n) => n.id === nodeId && n.kind === "agent"),
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
          failedStep?.sources.filter((s) =>
            ["conclusion", "session", "fork"].includes(s.kind),
          ) ?? [];
        await this.enqueue(
          run,
          id,
          preservedSources,
          preservedSources.length > 0,
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
      state: "running",
      createdAt: Date.now(),
      scope,
      roots,
      participants: reachable(roots, doc.edges, doc.nodes),
      graph: structuredClone({ nodes: doc.nodes, edges: doc.edges }),
      steps: [],
      tokens: [],
      notes: [],
      deliverables: [],
    };
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
      run.steps.push({
        id: uid(),
        nodeId: node.id,
        requestId,
        sessionId,
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

  claim(requestId: string, turn: number): Promise<void> {
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
      step.state = "running";
      await this.store.changed();
    });
  }

  /** Record native step/token telemetry from DSH session events without triggering full storage churn. */
  recordTelemetry(
    sessionId: string,
    turn: number,
    delta: {
      addStep?: boolean;
      inputTokens?: number;
      outputTokens?: number;
    },
  ): boolean {
    const step = this.runs
      .flatMap((r) => r.steps)
      .find(
        (s) =>
          s.sessionId === sessionId &&
          !s.endedAt &&
          (s.turn === turn || s.turn === undefined),
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
    return true;
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
  ): Promise<void> {
    const links = activeEdges(run.graph.edges);
    const outgoing = links.filter((e) => e.source === sourceNode.id);
    if (!outgoing.length) return;

    if (planGateActive) {
      this.addNoteOnce(
        run,
        `${sourceNode.title}：Plan 模式尚未退出计划态，已暂停自动接续等待确认计划`,
      );
    }

    for (const edge of outgoing) {
      const target = run.graph.nodes.find((n) => n.id === edge.target);
      if (!target || target.participation === "paused") continue;

      try {
        const captureMode: ContextMode =
          target.participation === "bypassed" && edge.mode === "fork"
            ? "conclusion"
            : edge.mode;
        const captured = await this.runtime.capture(
          { ...sourceNode, sessionId },
          captureMode,
          seq,
          output,
        );

        if (target.participation === "bypassed") {
          this.forwardThroughBypass(
            run,
            step,
            target,
            captured,
            edge.trigger === "confirm",
            planGateActive,
            new Set([sourceNode.id, target.id]),
          );
          continue;
        }

        const boundary = !!run.scope && !run.scope.includes(target.id);
        run.tokens.push({
          id: uid(),
          edgeId: edge.id,
          stepId: step.id,
          source: captured,
          boundary,
           ...(planGateActive ? { planGate: true } : {}),
          ready:
            !planGateActive &&
            !boundary &&
            edge.trigger === "auto" &&
            target.participation !== "manual",
          consumed: false,
          dismissed: false,
        });
      } catch (e) {
        run.notes.push(`${sourceNode.title} → ${target.title}: ${String(e)}`);
        run.state = "error";
      }
    }
  }

  private forwardThroughBypass(
    run: FlowspaceRun,
    originStep: RunStep,
    bypassNode: FlowNode,
    captured: ContextSnapshot,
    confirmCarry: boolean,
    planGateActive: boolean,
    visited: Set<string>,
  ): void {
    this.addNoteOnce(run, `${bypassNode.title}：已旁路透传上游上下文`);
    const links = activeEdges(run.graph.edges).filter(
      (e) => e.source === bypassNode.id,
    );
    for (const outEdge of links) {
      const nextTarget = run.graph.nodes.find((n) => n.id === outEdge.target);
      if (!nextTarget || nextTarget.participation === "paused") continue;
      const nextConfirm = confirmCarry || outEdge.trigger === "confirm";
      if (nextTarget.participation === "bypassed") {
        if (visited.has(nextTarget.id)) continue;
        const nextVisited = new Set(visited);
        nextVisited.add(nextTarget.id);
        this.forwardThroughBypass(
          run,
          originStep,
          nextTarget,
          captured,
          nextConfirm,
          planGateActive,
          nextVisited,
        );
        continue;
      }
      const boundary = !!run.scope && !run.scope.includes(nextTarget.id);
      run.tokens.push({
        id: uid(),
        edgeId: outEdge.id,
        stepId: originStep.id,
        source: structuredClone(captured),
        boundary,
        ...(planGateActive ? { planGate: true } : {}),
        ready:
          !planGateActive &&
          !boundary &&
          !nextConfirm &&
          nextTarget.participation !== "manual",
        consumed: false,
        dismissed: false,
      });
    }
  }

  finish(
    sessionId: string,
    turn: number,
    ending: string,
    seq: number,
    output: string,
    error?: string,
  ): Promise<void> {
    return this.transact(async () => {
      const run = this.runs.find((r) =>
        r.steps.some(
          (s) => s.sessionId === sessionId && s.turn === turn && !s.endedAt,
        ),
      );
      const step = run?.steps.find(
        (s) => s.sessionId === sessionId && s.turn === turn && !s.endedAt,
      );
      if (!run || !step) return;
      step.endedAt = Date.now();
      step.endSeq = seq;
      step.output = output;
      step.telemetry ??= { stepCount: 1, inputTokens: 0, outputTokens: 0 };
      if (step.telemetry.stepCount === 0) step.telemetry.stepCount = 1;
      step.telemetry.durationMs = Math.max(0, step.endedAt - step.createdAt);
      step.state =
        ending === "completed"
          ? "completed"
          : ending === "aborted"
            ? "aborted"
            : ending === "interrupted"
              ? "interrupted"
              : "error";
      step.error = error ?? (step.state === "error" ? ending : undefined);

      // Capture each edge before any downstream dispatch. No live URI is left in the queue.
      if (
        step.state === "completed" &&
        !["cancelled", "interrupted"].includes(run.state)
      ) {
        const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
        const planGateActive = Boolean(
          await this.runtime.isPlanModeActive?.(sessionId),
        );
        await this.emitDownstreamTokens(
          run,
          step,
          node,
          sessionId,
          seq,
          output,
          planGateActive,
        );
        await this.store.changed();
        if (!["paused", "error"].includes(run.state)) await this.advance(run);
      }
      this.settle(run);
      await this.store.changed();
    });
  }

  private loopLimit(run: FlowspaceRun, nodeId: string): number {
    const order = graphOrder(run.graph.nodes, run.graph.edges, run.roots),
      comp = order.component.get(nodeId)!;
    if (!order.cyclic.has(comp)) return Infinity;
    return Math.min(
      ...activeEdges(run.graph.edges)
        .filter(
          (e) =>
            order.component.get(e.source) === comp &&
            order.component.get(e.target) === comp,
        )
        .map((e) => e.maxRounds),
    );
  }

  private liveTokenProducers(run: FlowspaceRun): Set<string> {
    const activeRoots = run.roots.filter((id) => {
      const n = run.graph.nodes.find((x) => x.id === id);
      return (
        n &&
        n.participation !== "paused" &&
        n.participation !== "bypassed"
      );
    });
    return new Set(reachable(activeRoots, run.graph.edges, run.graph.nodes));
  }

  private async advance(run: FlowspaceRun): Promise<void> {
    if (
      this.disposed ||
      ["paused", "cancelled", "interrupted", "error"].includes(run.state)
    )
      return;
    const order = graphOrder(run.graph.nodes, run.graph.edges, run.roots);
    const liveProducers = this.liveTokenProducers(run);

    for (const nodeId of run.participants) {
      const node = run.graph.nodes.find((n) => n.id === nodeId);
      if (
        !node ||
        node.participation === "paused" ||
        node.participation === "bypassed"
      )
        continue;
      const count = run.steps.filter((s) => s.nodeId === nodeId).length;
      const limit = this.loopLimit(run, nodeId);
      if (count >= limit) {
        const pendingLoopTokens = run.tokens.filter(
          (t) =>
            !t.consumed &&
            !t.dismissed &&
            run.graph.edges.find((e) => e.id === t.edgeId)?.target === nodeId,
        );
        if (pendingLoopTokens.length) {
          for (const token of pendingLoopTokens) {
            token.loopCapReached = true;
            token.ready = false;
          }
          this.addNoteOnce(
            run,
            `${node.title}：已达到循环上限（${limit} 轮），可点击「+1 轮」继续或跳过完成`,
          );
        }
        continue;
      }

      const incoming = activeEdges(run.graph.edges).filter(
        (e) => e.target === nodeId && liveProducers.has(e.source),
      );
      if (!incoming.length) continue;

      const chosen: FlowToken[] = [];
      let missing = false;
      for (const edge of incoming) {
        const same =
          order.component.get(edge.source) === order.component.get(nodeId);
        const feedback =
          same && order.rank.get(edge.source)! >= order.rank.get(nodeId)!;
        // The first pass of an SCC does not wait on its own feedback.
        if (feedback && count === 0) continue;
        const sourceIteration = same ? count + (feedback ? 0 : 1) : undefined;
        const tokens = run.tokens.filter(
          (t) =>
            t.edgeId === edge.id &&
            !t.dismissed &&
            (sourceIteration === undefined ||
              run.steps.find((s) => s.id === t.stepId)?.iteration ===
                sourceIteration),
        );
        let token = tokens.find((t) => !t.consumed);
        // An input from outside a loop remains fixed across that loop's rounds.
        if (!token && !same && order.cyclic.has(order.component.get(nodeId)!))
          token = tokens.at(-1);
        if (!token || !token.ready) {
          missing = true;
          break;
        }
        chosen.push(token);
      }
      if (missing || !chosen.some((t) => !t.consumed)) continue;
      chosen.forEach((t) => {
        t.consumed = true;
      });
      await this.enqueue(
        run,
        nodeId,
        chosen.map((t) => t.source),
        true,
      );
    }
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
          if (!token.boundary && !token.planGate) {
            token.ready = true;
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
  ): Promise<void> {
    const liveDoc = this.store.document();
    const liveNode = liveDoc.nodes.find((n) => n.id === nodeId);
    const node = run.graph.nodes.find((n) => n.id === nodeId)!;
    if (liveNode?.continuationPrompt !== undefined) {
      node.continuationPrompt = liveNode.continuationPrompt;
    }
    if (liveNode?.planMode !== undefined) {
      node.planMode = liveNode.planMode;
    }
    syncUntitledAgentNode(node);
    if (liveNode) syncUntitledAgentNode(liveNode);

    const task = isContinuation
      ? (node.continuationPrompt ?? "").trim() ||
        (node.sessionId
          ? node.task.trim() || node.draft.trim()
          : node.draft.trim() || node.task.trim())
      : node.draft.trim() ||
        node.task.trim() ||
        (node.continuationPrompt ?? "").trim();
    if (!task) {
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
      createdAt: Date.now(),
    };
    run.steps.push(step);
    try {
      const pendingSentUpdates: { edge: FlowEdge; version: string }[] = [];
      for (const edge of run.graph.edges.filter(
        (e) =>
          e.target === nodeId &&
          (e.kind === "reference" || e.trigger === "off"),
      )) {
        const source = run.graph.nodes.find((n) => n.id === edge.source)!;
        if (!source) continue;
        const captured =
          source.kind === "agent"
            ? await this.runtime.capture(source, edge.mode)
            : await this.runtime.reference(source, edge);
        const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
        edge.currentVersion = version;
        if (source.kind === "display" && source.sourceNodeId) {
          step.sources = step.sources.filter(
            (s) => s.sourceNodeId !== source.sourceNodeId,
          );
        }
        if (
          edge.kind === "reference" &&
          !edge.always &&
          edge.sentVersion === version
        )
          continue;
        step.sources.push(captured);
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
      const fork = step.sources.find((s) => s.kind === "fork");
      const current = liveDoc.nodes.find((n) => n.id === nodeId);
      // A draft fork is one-time. Subsequent loop rounds reuse the created Session.
      if (current?.sessionId) node.sessionId = current.sessionId;
      step.sessionId = await this.runtime.ensure(
        node,
        node.sessionId ? undefined : fork,
      );
      node.sessionId = step.sessionId;
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
      await this.store.submitted(nodeId, task, isContinuation);
      await this.store.changed();
    } catch (e) {
      step.state = "error";
      step.error = String(e);
      step.endedAt = Date.now();
    }
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
        token.dismissed = true;
        token.consumed = true;
        delete token.loopCapReached;
        delete token.planGate;
      } else {
        if (token.loopCapReached) {
          const edge = run.graph.edges.find((e) => e.id === token.edgeId);
          if (edge) edge.maxRounds += 1;
          delete token.loopCapReached;
        }
        delete token.planGate;
        token.ready = true;
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
        await this.advance(run);
        this.settle(run);
      } else {
        run.state = "cancelled";
        for (const step of run.steps.filter((s) =>
          ["queued", "running"].includes(s.state),
        )) {
          await this.runtime.cancel(step).catch(() => {});
          step.state = "aborted";
          step.endedAt = Date.now();
        }
        run.tokens.forEach((t) => {
          t.consumed = true;
        });
      }
      await this.store.changed();
    });
  }

  /** Safely interrupt all active runs before restoring a canvas snapshot (R10). */
  async interruptAllActive(reasonNote: string): Promise<void> {
    for (const run of this.runs) {
      if (!["running", "waiting", "paused"].includes(run.state)) continue;
      run.state = "interrupted";
      for (const step of run.steps) {
        if (["queued", "running"].includes(step.state)) {
          await this.runtime.cancel(step).catch(() => {});
          step.state = "interrupted";
          step.endedAt = Date.now();
        }
      }
      for (const token of run.tokens) {
        if (!token.consumed && !token.dismissed) {
          token.dismissed = true;
        }
      }
      this.addNoteOnce(run, reasonNote);
    }
  }

  async recover(): Promise<void> {
    for (const run of this.runs) {
      if (["running", "waiting", "paused"].includes(run.state)) {
        run.state = "interrupted";
        for (const step of run.steps) {
          if (["queued", "running"].includes(step.state)) {
            let patch: Partial<RunStep>;
            try {
              patch = this.runtime.reconcile
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
            if (
              step.state === "completed" &&
              !run.tokens.some((t) => t.stepId === step.id)
            ) {
              const source = run.graph.nodes.find((n) => n.id === step.nodeId);
              if (source) {
                try {
                  const planGateActive = step.sessionId
                    ? Boolean(
                        await this.runtime.isPlanModeActive?.(step.sessionId),
                      )
                    : false;
                  await this.emitDownstreamTokens(
                    run,
                    step,
                    source,
                    step.sessionId,
                    step.endSeq,
                    step.output ?? "",
                    planGateActive,
                  );
                } catch (err) {
                  this.addNoteOnce(
                    run,
                    `${source.title}：恢复捕获结果失败（${String(err)}）`,
                  );
                }
              }
            }
          }
        }
        this.addNoteOnce(
          run,
          "Host 已重新启动。保留已完成结果；继续只推进尚未投递的接续，中断节点请手动重跑。",
        );
      }
    }
    await this.store.changed();
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.transact(async () => {
      for (const run of this.runs.filter((r) =>
        ["running", "waiting", "paused"].includes(r.state),
      )) {
        run.state = "interrupted";
        for (const step of run.steps.filter((s) =>
          ["queued", "running"].includes(s.state),
        )) {
          await this.runtime.cancel(step).catch(() => {});
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
    if (["paused", "cancelled", "interrupted"].includes(run.state)) return;
    if (run.steps.some((s) => s.state === "queued" || s.state === "running"))
      run.state = "running";
    else if (
      run.steps.some((s) =>
        ["error", "aborted", "interrupted"].includes(s.state),
      ) ||
      run.state === "error"
    )
      run.state = "error";
    else if (run.tokens.some((t) => !t.consumed && !t.dismissed && !t.ready))
      run.state = "waiting";
    else if (run.tokens.some((t) => !t.consumed && !t.dismissed)) {
      run.state = "error";
      this.addNoteOnce(
        run,
        "接续无法汇合：有分支被跳过或未产生本轮结果。可从目标节点手动继续。",
      );
    } else run.state = "completed";
  }
}
