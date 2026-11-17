import { Context, Service } from "@deepseek-ai/cordis";
import { TypertRemoteService, Remote } from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type {} from "@deepseek-ai/dsh-api-session-controller";
import type {} from "@deepseek-ai/dsh-workspace";
import type { SessionId, SessionEvent } from "@deepseek-ai/dsh-session";
import { emptyDocument, newNode } from "./core/document.ts";
import { Scheduler } from "./core/scheduler.ts";
import { DshRuntime, plainText } from "./host/runtime.ts";
import {
  checkDocument,
  documentSchema,
  flowspaceDomain,
} from "./host/storage.ts";
import type {
  BindRequest,
  ContextSnapshot,
  DraftRequest,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  LaunchPlan,
  LiveNodeState,
  ReleaseRequest,
  RunCommand,
  SessionBrief,
  SourceRequest,
  StartRequest,
  WorkspaceBrief,
} from "./types.ts";
export type * from "./types.ts";

declare module "@deepseek-ai/cordis" {
  interface Context {
    flowspace: FlowspaceService;
  }
}

/** Persistent canvas and orchestration for ordinary DSH Sessions. @typert service flowspace */
export class FlowspaceService extends TypertRemoteService {
  static inject = [
    "sessionController",
    "sessions",
    "agents",
    "sessionQuery",
    "storageDomain",
    "workspaceRegistry",
    "fs",
  ];
  private state = {
    doc: emptyDocument(),
    runs: [] as FlowspaceRun[],
    live: new Map<string, LiveNodeState>(),
    listeners: new Set<() => void>(),
    turnOutput: new Map<string, string>(),
    canvasSessions: new Set<string>(),
  };
  private domain!: Domain<typeof flowspaceDomain>;
  private scheduler!: Scheduler;
  private runtime!: DshRuntime;
  private inputContexts = new Map<string, Promise<ContextSnapshot[]>>();
  constructor(ctx: Context) {
    super(ctx, "flowspace");
  }
  protected async [Service.init](): Promise<void> {
    this.domain = await this.ctx.storageDomain.open(flowspaceDomain);
    this.state.doc = structuredClone(
      this.domain.table("documents").get("main") ?? emptyDocument(),
    );
    this.state.runs = [...this.domain.table("runs").entries()]
      .map(([, r]) => structuredClone(r))
      .sort((a, b) => a.createdAt - b.createdAt);
    this.runtime = new DshRuntime(this.ctx, (id) =>
      this.state.doc.nodes.find((n) => n.id === id),
    );
    this.scheduler = new Scheduler(
      this.runtime,
      {
        document: () => this.state.doc,
        changed: () => this.persist(),
        bound: async (nodeId, sessionId, fork) => {
          const node = this.state.doc.nodes.find((n) => n.id === nodeId);
          if (!node) return;
          node.sessionId = sessionId;
          if (fork) {
            const source = this.state.doc.nodes.find(
              (n) => n.id === fork.sourceNodeId,
            );
            node.workspaceId = source?.workspaceId;
            node.cwd = source?.cwd;
            for (const edge of this.state.doc.edges.filter(
              (e) => e.target === nodeId && e.mode === "fork",
            )) {
              edge.originMode = "fork";
              edge.mode = "conclusion";
            }
          }
        },
        submitted: async (id, task) => {
          const n = this.state.doc.nodes.find((n) => n.id === id);
          if (n) {
            n.lastSubmittedTask = n.task;
            if (n.draft === task) n.draft = "";
          }
        },
      },
      this.state.runs,
    );
    await this.scheduler.recover();
    const report = (promise: Promise<unknown>): void => {
      void promise.catch((e) => this.ctx.logger.error("FlowSpace: %s", e));
    };
    this.ctx.on("agent/inbox/inserted", ({ agent, message }) => {
      if (message.source.kind !== "user") return;
      const id = "rpcId" in message.source ? message.source.rpcId : message.id;
      const owned = this.state.runs.some((r) =>
        r.steps.some((s) => s.requestId === id),
      );
      const preparation = owned
        ? Promise.resolve([])
        : this.prepareReferences(agent.id);
      void preparation.catch((e) =>
        this.ctx.logger.warn("FlowSpace reference preparation: %s", e),
      );
      this.inputContexts.set(message.id, preparation);
      report(
        this.scheduler.native(
          agent.id,
          id,
          plainText(message.content),
          this.state.canvasSessions.has(agent.id),
        ),
      );
    });
    this.ctx.on("agent/pre-step", async (_payload, next) => {
      const decision = await next();
      if (decision.kind !== "enter") return decision;
      const messages = await Promise.all(
        decision.messages.map(async (message) => {
          const preparation = this.inputContexts.get(message.id);
          if (!preparation) return message;
          const sources = await preparation;
          const text = await this.runtime.contextText(
            sources,
            _payload.agent.id,
          );
          const id =
            message.source.kind === "user" && "rpcId" in message.source
              ? message.source.rpcId
              : message.id;
          const step = this.state.runs
            .flatMap((r) => r.steps)
            .find((s) => s.requestId === id);
          if (step && sources.length) {
            step.sources.push(...sources);
            await this.persist();
          }
          this.inputContexts.delete(message.id);
          return text
            ? {
                ...message,
                content: [...message.content, { type: "text" as const, text }],
              }
            : message;
        }),
      );
      return { ...decision, messages };
    });
    this.ctx.on("agent/inbox/claimed", ({ message, turn }) => {
      if (message.source.kind === "user")
        report(
          this.scheduler.claim(
            "rpcId" in message.source ? message.source.rpcId : message.id,
            turn,
          ),
        );
    });
    this.ctx.on("agent/inbox/discarded", ({ message }) => {
      this.inputContexts.delete(message.id);
    });
    this.ctx.on("agent/status", ({ agent, status }) => {
      const n = this.state.doc.nodes.find((n) => n.sessionId === agent.id);
      if (n) {
        const old = this.state.live.get(n.id);
        this.state.live.set(n.id, {
          nodeId: n.id,
          sessionId: agent.id,
          running: status === "running",
          output: old?.output ?? "",
          seq: old?.seq ?? -1,
          pendingInput: [],
        });
        this.publish();
      }
    });
    this.ctx.on("session/event", (session, event) => {
      this.event(session.id, event, report);
    });
    this.ctx.effect(() => async () => {
      await this.scheduler.dispose();
      this.state.listeners.forEach((fn) => fn());
      await this.domain.close();
    });
  }
  private event(
    sessionId: string,
    event: SessionEvent,
    report: (p: Promise<unknown>) => void,
  ): void {
    const node = this.state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node) return;
    if (event.type === "assistant/message") {
      const text = plainText(event.data.message.content);
      this.state.turnOutput.set(sessionId, text);
      const old = this.state.live.get(node.id);
      this.state.live.set(node.id, {
        nodeId: node.id,
        sessionId,
        running: old?.running ?? true,
        output: text,
        seq: event.seq,
        pendingInput: [],
      });
      for (const display of this.state.doc.nodes.filter(
        (n) => n.kind === "display" && !n.fixed && n.sourceNodeId === node.id,
      )) {
        display.text = text;
        display.sourceSeq = event.seq;
      }
      this.publish();
    }
    if (event.type === "turn/start") this.state.turnOutput.delete(sessionId);
    if (event.type === "turn/end")
      report(
        this.scheduler.finish(
          sessionId,
          event.data.turn,
          event.data.reason.kind,
          event.seq,
          this.state.turnOutput.get(sessionId) ?? "",
          event.data.reason.kind === "error"
            ? event.data.reason.error.message
            : undefined,
        ),
      );
  }
  private publish(): void {
    this.state.listeners.forEach((fn) => fn());
  }
  private async prepareReferences(
    sessionId: string,
  ): Promise<ContextSnapshot[]> {
    const node = this.state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node) return [];
    const sources: ContextSnapshot[] = [];
    for (const edge of this.state.doc.edges.filter(
      (e) =>
        e.target === node.id && (e.kind === "reference" || e.trigger === "off"),
    )) {
      const source = this.state.doc.nodes.find((n) => n.id === edge.source)!;
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
      sources.push(captured);
      edge.sentVersion = version;
    }
    if (
      new Set(
        sources
          .filter((s) => s.kind === "session")
          .map((s) => s.sourceSessionId),
      ).size > 3
    )
      throw new Error("一次会话引用最多包含三个来源");
    return sources;
  }
  private async persist(): Promise<void> {
    await this.domain
      .table("documents")
      .put("main", structuredClone(this.state.doc));
    const retained = new Set(this.state.runs.map((r) => r.id));
    for (const id of this.domain.table("runs").keys())
      if (!retained.has(id)) await this.domain.table("runs").delete(id);
    for (const run of this.state.runs)
      await this.domain.table("runs").put(run.id, structuredClone(run));
    this.publish();
  }
  @Remote
  snapshot(): FlowspaceSnapshot {
    return {
      document: structuredClone(this.state.doc),
      runs: structuredClone(this.state.runs),
      live: [...this.state.live.values()],
    };
  }
  @Remote
  async save(document: FlowspaceDocument): Promise<FlowspaceDocument> {
    return this.scheduler.transact(async () => {
      const next = documentSchema.parse(document);
      for (const node of next.nodes) {
        const old = this.state.doc.nodes.find((n) => n.id === node.id);
        if (old?.sessionId) {
          node.sessionId = old.sessionId;
          node.cwd = old.cwd;
          node.workspaceId = old.workspaceId;
        }
        if (old) node.lastSubmittedTask = old.lastSubmittedTask;
      }
      for (const edge of next.edges) {
        const old = this.state.doc.edges.find((e) => e.id === edge.id);
        if (old?.originMode === "fork") {
          edge.originMode = "fork";
          edge.mode = old.mode;
        }
        if (old) edge.sentVersion = old.sentVersion;
      }
      checkDocument(next);
      this.state.doc = next;
      await this.persist();
      return structuredClone(next);
    });
  }
  @Remote
  async draft(request: DraftRequest): Promise<void> {
    const node = this.node(request.nodeId);
    node.draft = request.draft;
    await this.domain
      .table("documents")
      .put("main", structuredClone(this.state.doc));
    this.publish();
  }
  @Remote
  plan(request: StartRequest): LaunchPlan {
    return this.scheduler.plan(request);
  }
  @Remote
  start(request: StartRequest): Promise<FlowspaceRun> {
    return this.scheduler.start(request);
  }
  @Remote
  command(request: RunCommand): Promise<void> {
    return this.scheduler.command(request.runId, request.action);
  }
  @Remote
  release(request: ReleaseRequest): Promise<void> {
    return this.scheduler.release(
      request.runId,
      request.tokenId,
      request.accept,
    );
  }
  @Remote
  async bind(request: BindRequest): Promise<FlowNode> {
    return this.scheduler.transact(async () => {
      const node = this.node(request.nodeId);
      if (node.sessionId) return structuredClone(node);
      if (
        this.state.doc.edges.some(
          (e) => e.target === node.id && e.mode === "fork",
        )
      )
        throw new Error("分叉草稿将在接续时创建会话");
      if (
        request.sessionId &&
        this.state.doc.nodes.some((n) => n.sessionId === request.sessionId)
      )
        throw new Error("该会话已在画布中");
      node.workspaceId = request.workspaceId ?? node.workspaceId;
      node.cwd = request.cwd ?? node.cwd;
      if (request.sessionId) {
        using observation = await this.ctx.sessionQuery.observeSession(
          request.sessionId as SessionId,
        );
        node.sessionId = request.sessionId;
        node.cwd = observation.header.cwd;
      } else node.sessionId = await this.runtime.ensure(node);
      await this.persist();
      return structuredClone(node);
    });
  }
  @Remote
  async display(request: SourceRequest): Promise<FlowNode> {
    const source = this.node(request.nodeId);
    const captured =
      request.text === undefined
        ? await this.runtime.capture(source, "conclusion", request.seq)
        : undefined;
    const node = {
      ...newNode(
        "display",
        source.x + source.width + 60,
        source.y + 40,
        source.title + " · 结果",
      ),
      text: request.text ?? captured?.text ?? "",
      sourceNodeId: source.id,
      sourceSeq: request.seq ?? captured?.seq,
      fixed: request.fixed,
    };
    this.state.doc.nodes.push(node);
    await this.persist();
    return node;
  }
  @Remote
  async sessions(): Promise<SessionBrief[]> {
    const result = await this.ctx.sessionController.list(
      {},
      new AbortController().signal,
    );
    const rows = result.items.filter((s) => s.origin !== "subagent");
    const titles = await this.ctx.sessionQuery.readTitleSnapshots(
      rows.map((s) => s.sessionId),
    );
    return rows.map((s, i) => ({
      sessionId: s.sessionId,
      title:
        titles[i]?.status === "fulfilled"
          ? (titles[i].value.title?.title ?? s.sessionId)
          : s.sessionId,
      cwd: s.cwd,
      running: s.running,
    }));
  }
  @Remote
  workspaces(): WorkspaceBrief[] {
    return this.ctx.workspaceRegistry
      .list()
      .map((w) => ({ id: w.id, name: w.title, path: w.path }));
  }
  @Remote
  canvasPresence(sessionIds: string[]): void {
    this.state.canvasSessions = new Set(sessionIds);
  }
  @Remote
  stopNode(nodeId: string): void {
    const node = this.node(nodeId);
    if (node.sessionId)
      this.ctx.sessionController.cancel({
        sessionId: node.sessionId as SessionId,
      });
  }
  @Remote({ mode: "stream" })
  async *follow(signal: AbortSignal): AsyncIterable<FlowspaceSnapshot> {
    let wake: (() => void) | undefined,
      changed = true;
    const notify = (): void => {
      changed = true;
      wake?.();
    };
    this.state.listeners.add(notify);
    signal.addEventListener("abort", notify, { once: true });
    try {
      while (!signal.aborted) {
        if (!changed)
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        if (signal.aborted) break;
        changed = false;
        wake = undefined;
        yield this.snapshot();
      }
    } finally {
      this.state.listeners.delete(notify);
      signal.removeEventListener("abort", notify);
    }
  }
  private node(id: string): FlowNode {
    const n = this.state.doc.nodes.find((n) => n.id === id);
    if (!n || n.kind !== "agent") throw new Error("Agent 节点不存在");
    return n;
  }
}
export default FlowspaceService;
