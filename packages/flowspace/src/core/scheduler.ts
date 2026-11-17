import type {
  ContextMode,
  ContextSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowToken,
  RunStep,
  StartRequest,
} from "../types.ts";
import { uid, members } from "./document.ts";
import { activeEdges, graphOrder, launchPlan, reachable } from "./graph.ts";

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
  reference(node: FlowNode): Promise<ContextSnapshot>;
  reconcile?(step: RunStep): Promise<Partial<RunStep>>;
  running?(): string[];
}
export interface SchedulerStore {
  document(): FlowspaceDocument;
  changed(): Promise<void>;
  bound(
    nodeId: string,
    sessionId: string,
    fork?: ContextSnapshot,
  ): Promise<void>;
  submitted(nodeId: string, task: string): Promise<void>;
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
          .map((t) => r.graph.edges.find((e) => e.id === t.edgeId)!.target),
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
      const plan =
        request.kind === "single"
          ? launchPlan(this.store.document(), request, new Set(), new Set())
          : this.plan(request);
      plan.roots = plan.roots.filter(
        (id) => !request.excludeRootIds?.includes(id),
      );
      if (!plan.roots.length) throw new Error("没有可启动的 Agent");
      const doc = this.store.document();
      const scope =
        request.kind === "global" || request.kind === "single"
          ? null
          : request.nodeIds.flatMap((id) =>
              doc.nodes.find((n) => n.id === id)?.kind === "group"
                ? members(doc, id)
                : [id],
            );
      const run = this.create(plan.roots, scope, "canvas");
      await this.store.changed();
      for (const id of run.roots) {
        const node = run.graph.nodes.find((n) => n.id === id)!;
        const incomingFork = run.graph.edges.find(
          (e) => e.target === id && e.mode === "fork",
        );
        let sources: ContextSnapshot[] = [];
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
        }
        await this.enqueue(run, id, sources);
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
  ): FlowspaceRun {
    const doc = this.store.document();
    const run: FlowspaceRun = {
      id: uid(),
      title: roots
        .map((id) => doc.nodes.find((n) => n.id === id)?.title)
        .join(" · "),
      origin,
      state: "running",
      createdAt: Date.now(),
      scope,
      roots,
      participants: reachable(roots, doc.edges),
      graph: structuredClone({ nodes: doc.nodes, edges: doc.edges }),
      steps: [],
      tokens: [],
      notes: [],
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
        !(
          canvas ||
          (node.nativeTrigger === "inherit"
            ? doc.settings.nativeChatTriggers
            : node.nativeTrigger === "enabled")
        )
      )
        return;
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
      await this.store.submitted(node.id, task);
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
        for (const edge of activeEdges(run.graph.edges).filter(
          (e) => e.source === node.id,
        )) {
          const target = run.graph.nodes.find((n) => n.id === edge.target);
          if (!target || target.participation === "paused") continue;
          try {
            const captured = await this.runtime.capture(
              { ...node, sessionId },
              edge.mode,
              seq,
              output,
            );
            const boundary = !!run.scope && !run.scope.includes(target.id);
            run.tokens.push({
              id: uid(),
              edgeId: edge.id,
              stepId: step.id,
              source: captured,
              boundary,
              ready:
                !boundary &&
                edge.trigger === "auto" &&
                target.participation !== "manual",
              consumed: false,
              dismissed: false,
            });
          } catch (e) {
            run.notes.push(`${node.title} → ${target.title}: ${String(e)}`);
            run.state = "error";
          }
        }
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
  private async advance(run: FlowspaceRun): Promise<void> {
    if (
      this.disposed ||
      ["paused", "cancelled", "interrupted", "error"].includes(run.state)
    )
      return;
    const order = graphOrder(run.graph.nodes, run.graph.edges, run.roots);
    for (const nodeId of run.participants) {
      const node = run.graph.nodes.find((n) => n.id === nodeId);
      if (!node || node.participation === "paused") continue;
      const count = run.steps.filter((s) => s.nodeId === nodeId).length;
      if (count >= this.loopLimit(run, nodeId)) {
        for (const token of run.tokens.filter(
          (t) =>
            run.graph.edges.find((e) => e.id === t.edgeId)?.target === nodeId,
        ))
          token.consumed = true;
        continue;
      }
      const incoming = activeEdges(run.graph.edges).filter(
        (e) => e.target === nodeId && run.participants.includes(e.source),
      );
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
      );
    }
  }
  private async enqueue(
    run: FlowspaceRun,
    nodeId: string,
    sources: ContextSnapshot[],
  ): Promise<void> {
    const node = run.graph.nodes.find((n) => n.id === nodeId)!;
    const task = node.draft.trim() || node.task.trim();
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
      for (const edge of run.graph.edges.filter(
        (e) =>
          e.target === nodeId &&
          (e.kind === "reference" || e.trigger === "off"),
      )) {
        const source = run.graph.nodes.find((n) => n.id === edge.source)!;
        const captured =
          source.kind === "agent"
            ? await this.runtime.capture(source, edge.mode)
            : await this.runtime.reference(source);
        const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
        if (
          edge.kind === "reference" &&
          !edge.always &&
          edge.sentVersion === version
        )
          continue;
        if (source.kind === "display" && source.sourceNodeId)
          step.sources = step.sources.filter(
            (s) => s.sourceNodeId !== source.sourceNodeId,
          );
        step.sources.push(captured);
        edge.sentVersion = version;
        const live = this.store.document().edges.find((e) => e.id === edge.id);
        if (live) live.sentVersion = version;
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
      const current = this.store.document().nodes.find((n) => n.id === nodeId);
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
      await this.store.submitted(nodeId, task);
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
      } else {
        token.ready = true;
        if (token.boundary && run.scope)
          run.scope.push(
            run.graph.edges.find((e) => e.id === token.edgeId)!.target,
          );
        token.boundary = false;
      }
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
          await this.runtime.cancel(step);
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
  async recover(): Promise<void> {
    for (const run of this.runs)
      if (["running", "waiting", "paused"].includes(run.state)) {
        run.state = "interrupted";
        for (const step of run.steps)
          if (["queued", "running"].includes(step.state)) {
            Object.assign(
              step,
              this.runtime.reconcile
                ? await this.runtime.reconcile(step)
                : { state: "interrupted", endedAt: Date.now() },
            );
            if (
              step.state === "completed" &&
              !run.tokens.some((t) => t.stepId === step.id)
            ) {
              const source = run.graph.nodes.find((n) => n.id === step.nodeId)!;
              for (const edge of activeEdges(run.graph.edges).filter(
                (e) => e.source === step.nodeId,
              )) {
                run.tokens.push({
                  id: uid(),
                  edgeId: edge.id,
                  stepId: step.id,
                  source: await this.runtime.capture(
                    { ...source, sessionId: step.sessionId },
                    edge.mode,
                    step.endSeq,
                    step.output,
                  ),
                  consumed: false,
                  dismissed: false,
                  boundary: !!run.scope && !run.scope.includes(edge.target),
                  ready:
                    edge.trigger === "auto" &&
                    (!run.scope || run.scope.includes(edge.target)),
                });
              }
            }
          }
        run.notes.push(
          "Host 已重新启动。保留已完成结果；继续只推进尚未投递的接续，中断节点请手动重跑。",
        );
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
          await this.runtime.cancel(step);
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
      run.notes.push(
        "接续无法汇合：有分支被跳过或未产生本轮结果。可从目标节点手动继续。",
      );
    } else run.state = "completed";
  }
}
