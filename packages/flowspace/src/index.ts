import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { TypertRemoteService, Remote } from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type {} from "@deepseek-ai/dsh-api-session-controller";
import type {} from "@deepseek-ai/dsh-workspace";
import type { SessionId, SessionEvent } from "@deepseek-ai/dsh-session";
import {
  boardSummaryText,
  emptyDocument,
  newNode,
  uid,
} from "./core/document.ts";
import { Scheduler } from "./core/scheduler.ts";
import { DshRuntime, plainText } from "./host/runtime.ts";
import { HostGitService, isSubPath } from "./host/git.ts";
import {
  checkDocument,
  documentSchema,
  flowspaceDomain,
} from "./host/storage.ts";
import type {
  BindRequest,
  ContextSnapshot,
  DraftRequest,
  FilePreviewRequest,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  GitActionRequest,
  GitDiffRequest,
  GitDiffResult,
  GitInspectRequest,
  GitRepoStatus,
  LaunchPlan,
  LiveNodeState,
  NativeAgentMessage,
  ReleaseRequest,
  RerunFailedRequest,
  RunCommand,
  SessionBrief,
  SessionChangeDiffRequest,
  SessionChangesRequest,
  SessionChangeTurn,
  SessionFileDiffView,
  SessionTerminalBrief,
  SessionTerminalsRequest,
  SourceRequest,
  StartRequest,
  SubagentBrief,
  TerminalScreenReadRequest,
  TerminalScreenSnapshot,
  WorkspaceBrief,
  WorkspaceFilePreview,
  WorkspaceFilesRequest,
  WorkspaceStructureBrief,
} from "./types.ts";
export type * from "./types.ts";

declare module "@deepseek-ai/cordis" {
  interface Context {
    flowspace: FlowspaceService;
  }
}

interface HostWorkspaceChanges {
  summary(
    sessionId: SessionId,
    seq: number,
  ):
    | {
        turn: number;
        cwd: string;
        total: number;
        added: number;
        deleted: number;
        files: {
          path: string;
          display: string;
          added: number;
          deleted: number;
          binary?: true;
          oversized?: true;
        }[];
      }
    | undefined;
  diff(
    sessionId: SessionId,
    seq: number,
    index: number,
    signal: AbortSignal,
  ): Promise<
    | {
        kind: "text";
        path: string;
        display: string;
        hunks: {
          oldStart: number;
          oldLines: number;
          newStart: number;
          newLines: number;
          lines: string[];
        }[];
      }
    | { kind: "binary" | "oversized"; path: string; display: string }
    | undefined
  >;
}

interface HostTerminalController {
  list(
    sessionId: SessionId,
  ): {
    id: string;
    title: string;
    cwd: string;
    state: "running" | "exited" | "failed";
    exitCode: number | null;
    origin: "user" | "agent";
  }[];
  create(
    agent: unknown,
    req: { id: string; cols: number; rows: number },
    signal: AbortSignal,
  ): Promise<{
    id: string;
    title: string;
    cwd: string;
    state: "running" | "exited" | "failed";
    exitCode: number | null;
    origin: "user" | "agent";
  }>;
  readScreen(
    agent: unknown,
    id: string,
    req: { offset: number; count: number; maxBytes: number },
  ): Promise<{ text: string; totalLines: number; truncated: boolean }>;
}

const shortHash = (value: string): string =>
  createHash("sha1").update(value).digest("hex").slice(0, 12);

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
    nativeMessages: new Map<string, NativeAgentMessage>(),
    subagents: new Map<string, SubagentBrief>(),
    listeners: new Set<() => void>(),
    turnOutput: new Map<string, string>(),
    canvasSessions: new Set<string>(),
  };
  private domain!: Domain<typeof flowspaceDomain>;
  private scheduler!: Scheduler;
  private runtime!: DshRuntime;
  private git = new HostGitService();
  private inputContexts = new Map<string, Promise<ContextSnapshot[]>>();
  constructor(ctx: Context) {
    super(ctx, "flowspace");
  }
  protected async [Service.init](): Promise<void> {
    this.domain = await this.ctx.storageDomain.open(flowspaceDomain);
    const storedDoc = structuredClone(
      this.domain.table("documents").get("main") ?? emptyDocument(),
    );
    const storedTemplates = [...this.domain.table("templates").entries()].map(
      ([, tpl]) => structuredClone(tpl),
    );
    const storedSnapshots = [...this.domain.table("snapshots").entries()]
      .map(([, snap]) => structuredClone(snap))
      .sort((a, b) => b.createdAt - a.createdAt);

    if (storedTemplates.length) {
      storedDoc.templates = storedTemplates;
    } else if (storedDoc.templates?.length) {
      for (const tpl of storedDoc.templates) {
        await this.domain.table("templates").put(tpl.id, structuredClone(tpl));
      }
    }
    if (storedSnapshots.length) {
      storedDoc.snapshots = storedSnapshots;
    } else if (storedDoc.snapshots?.length) {
      for (const snap of storedDoc.snapshots) {
        await this.domain
          .table("snapshots")
          .put(snap.id, structuredClone(snap));
      }
    }

    this.state.doc = storedDoc;
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
          if (node.continuationPrompt === undefined && node.task.trim()) {
            node.continuationPrompt = node.task;
          }
          if (fork) {
            const source = this.state.doc.nodes.find(
              (n) => n.id === fork.sourceNodeId,
            );
            node.workspaceId = source?.workspaceId;
            node.cwd = source?.cwd;
            node.branch = source?.branch;
            node.worktreePath = source?.worktreePath;
            for (const edge of this.state.doc.edges.filter(
              (e) => e.target === nodeId && e.mode === "fork",
            )) {
              edge.originMode = "fork";
              edge.mode = "conclusion";
            }
          }
        },
        submitted: async (id, task, isContinuation) => {
          const n = this.state.doc.nodes.find((n) => n.id === id);
          if (n) {
            n.lastSubmittedTask = isContinuation ? task : n.task || task;
            if (!isContinuation && n.draft === task) n.draft = "";
          }
        },
      },
      this.state.runs,
    );
    await this.scheduler.recover();
    await this.hydrateBoundSessions().catch((e) =>
      this.ctx.logger.warn("FlowSpace session hydration: %s", e),
    );

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
          } else if (sources.length) {
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
          updatedAt: Date.now(),
          effectiveCwd: old?.effectiveCwd,
          changesTurns: old?.changesTurns,
        });
        this.publish();
      }
      const sub = this.state.subagents.get(agent.id);
      if (sub) {
        this.state.subagents.set(agent.id, {
          ...sub,
          running: status === "running",
          updatedAt: Date.now(),
        });
        this.publish();
      }
    });
    this.ctx.on("session/event", (session, event) => {
      this.event(session.id, event, report, session.header);
    });
    this.ctx.effect(() => async () => {
      await this.scheduler.dispose();
      this.state.listeners.forEach((fn) => fn());
      await this.domain.close();
    });
  }

  private async hydrateBoundSessions(): Promise<void> {
    const listed = await this.ctx.sessionController.list(
      {},
      new AbortController().signal,
    );
    const subRows = listed.items.filter((s) => s.origin === "subagent");
    if (subRows.length) {
      const titles = await this.ctx.sessionQuery.readTitleSnapshots(
        subRows.map((s) => s.sessionId),
      );
      subRows.forEach((row, idx) => {
        const parentId = (
          row as unknown as { parentSessionId?: string; creatorSessionId?: string }
        ).parentSessionId;
        if (parentId) {
          this.state.subagents.set(row.sessionId, {
            sessionId: row.sessionId,
            parentSessionId: parentId,
            title:
              titles[idx]?.status === "fulfilled"
                ? (titles[idx].value.title?.title ?? row.sessionId)
                : row.sessionId,
            running: row.running,
          });
        }
      });
    }

    for (const node of this.state.doc.nodes) {
      if (node.kind !== "agent" || !node.sessionId) continue;
      try {
        using obs = await this.ctx.sessionQuery.observeSession(
          node.sessionId as SessionId,
          { projectionMode: "none" },
        );
        const lastAssistant = obs.events.findLast(
          (e) => e.type === "assistant/message",
        );
        const lastWorkdir = obs.events.findLast(
          (e) => (e as { type: string }).type === "working-directory/change",
        ) as { data?: { cwd?: string } } | undefined;
        const lastTime = obs.events.at(-1)?.time;
        for (const ev of obs.events) {
          this.recordNativeMessage(node.sessionId, ev);
        }
        const turns = this.collectSessionChangesFromEvents(
          node.sessionId,
          obs.events,
        );
        this.state.live.set(node.id, {
          nodeId: node.id,
          sessionId: node.sessionId,
          running: this.runtime.running().includes(node.sessionId),
          output:
            lastAssistant?.type === "assistant/message"
              ? plainText(lastAssistant.data.message.content)
              : "",
          seq: lastAssistant?.seq ?? obs.cursor,
          pendingInput: [],
          updatedAt: lastTime,
          effectiveCwd: lastWorkdir?.data?.cwd ?? node.worktreePath ?? node.cwd,
          changesTurns: turns,
        });
      } catch {
        /* Session may have been deleted outside FlowSpace */
      }
    }
  }

  private recordNativeMessage(sessionId: string, event: SessionEvent): boolean {
    if (event.type !== "user/message") return false;
    const src = event.data.source as {
      kind?: string;
      senderSessionId?: string;
      summary?: string;
    };
    if (
      (src.kind === "agent-message" || src.kind === "subagent-settled") &&
      typeof src.senderSessionId === "string"
    ) {
      const msgId = `${sessionId}:${event.seq}`;
      if (this.state.nativeMessages.has(msgId)) return false;
      const bodyText =
        plainText(event.data.content).trim() || src.summary || "";
      this.state.nativeMessages.set(msgId, {
        id: msgId,
        fromSessionId: src.senderSessionId,
        toSessionId: sessionId,
        kind: src.kind,
        text: bodyText,
        summary: src.summary,
        seq: event.seq,
        time: event.time,
      });
      if (src.kind === "subagent-settled") {
        const existingSub = this.state.subagents.get(src.senderSessionId);
        this.state.subagents.set(src.senderSessionId, {
          sessionId: src.senderSessionId,
          parentSessionId: existingSub?.parentSessionId ?? sessionId,
          title: existingSub?.title ?? src.senderSessionId.slice(0, 8),
          running: false,
          updatedAt: event.time,
        });
      }
      return true;
    }
    return false;
  }

  private collectSessionChangesFromEvents(
    sessionId: string,
    events: readonly SessionEvent[],
  ): SessionChangeTurn[] {
    const wc = (
      this.ctx as unknown as {
        get(k: string): HostWorkspaceChanges | undefined;
      }
    ).get("workspaceChanges");
    if (!wc) return [];
    const byTurn = new Map<number, SessionChangeTurn>();
    for (const ev of events) {
      if ((ev as { type: string }).type !== "workspace/changes") continue;
      const sum = wc.summary(sessionId as SessionId, ev.seq);
      if (!sum) continue;
      byTurn.set(sum.turn, {
        sessionId,
        turn: sum.turn,
        seq: ev.seq,
        cwd: sum.cwd,
        total: sum.total,
        added: sum.added,
        deleted: sum.deleted,
        files: sum.files.map((f) => ({
          path: f.path,
          display: f.display,
          added: f.added,
          deleted: f.deleted,
          binary: f.binary,
          oversized: f.oversized,
        })),
      });
    }
    return [...byTurn.values()].sort((a, b) => b.turn - a.turn);
  }

  private event(
    sessionId: string,
    event: SessionEvent,
    report: (p: Promise<unknown>) => void,
    header?: { origin?: string; cwd?: string },
  ): void {
    if (this.recordNativeMessage(sessionId, event)) {
      this.publish();
    }
    if (header?.origin === "subagent") {
      const prev = this.state.subagents.get(sessionId);
      if (prev) {
        this.state.subagents.set(sessionId, {
          ...prev,
          updatedAt: event.time,
        });
      }
    }

    const node = this.state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node) return;

    const evAny = event as {
      type: string;
      seq: number;
      time: number;
      data?: Record<string, unknown>;
    };
    if (evAny.type === "working-directory/change" && evAny.data?.cwd) {
      const old = this.state.live.get(node.id);
      this.state.live.set(node.id, {
        nodeId: node.id,
        sessionId,
        running: old?.running ?? false,
        output: old?.output ?? "",
        seq: event.seq,
        pendingInput: old?.pendingInput ?? [],
        updatedAt: event.time,
        effectiveCwd: String(evAny.data.cwd),
        changesTurns: old?.changesTurns,
      });
      this.publish();
    }

    if (evAny.type === "deliverables/presented" && evAny.data) {
      const turn = Number(evAny.data.turn ?? 0);
      const files = Array.isArray(evAny.data.files)
        ? (evAny.data.files as { path: string; description?: string }[])
        : [];
      if (files.length) {
        report(
          this.scheduler.deliverable(
            sessionId,
            turn,
            event.seq,
            event.time,
            files,
          ),
        );
      }
    }

    if (evAny.type === "workspace/changes") {
      const wc = (
        this.ctx as unknown as {
          get(k: string): HostWorkspaceChanges | undefined;
        }
      ).get("workspaceChanges");
      const sum = wc?.summary(sessionId as SessionId, event.seq);
      if (sum) {
        const turnEntry: SessionChangeTurn = {
          sessionId,
          turn: sum.turn,
          seq: event.seq,
          cwd: sum.cwd,
          total: sum.total,
          added: sum.added,
          deleted: sum.deleted,
          files: sum.files.map((f) => ({
            path: f.path,
            display: f.display,
            added: f.added,
            deleted: f.deleted,
            binary: f.binary,
            oversized: f.oversized,
          })),
        };
        const old = this.state.live.get(node.id);
        const existing = (old?.changesTurns ?? []).filter(
          (c) => c.turn !== sum.turn,
        );
        this.state.live.set(node.id, {
          nodeId: node.id,
          sessionId,
          running: old?.running ?? false,
          output: old?.output ?? "",
          seq: event.seq,
          pendingInput: old?.pendingInput ?? [],
          updatedAt: event.time,
          effectiveCwd: old?.effectiveCwd,
          changesTurns: [turnEntry, ...existing],
        });
        for (const chNode of this.state.doc.nodes) {
          if (
            chNode.kind === "changes" &&
            !chNode.fixed &&
            chNode.changesSessionId === sessionId
          ) {
            chNode.changesSeq = event.seq;
            chNode.changesTurn = sum.turn;
            chNode.text =
              `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})\n` +
              sum.files
                .map((f) => `- ${f.display} (+${f.added} / -${f.deleted})`)
                .join("\n");
          }
        }
        this.publish();
      }
    }

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
        updatedAt: event.time,
        effectiveCwd: old?.effectiveCwd,
        changesTurns: old?.changesTurns,
      });
      for (const display of this.state.doc.nodes.filter(
        (n) =>
          ((n.kind === "display" && !n.fixed) ||
            (n.kind === "detail" && !n.pinned)) &&
          n.sourceNodeId === node.id,
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
  private computeSourceVersions(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const n of this.state.doc.nodes) {
      if (n.kind === "agent") {
        const live = this.state.live.get(n.id);
        if (n.sessionId && live && live.seq >= 0) {
          out[n.id] = `${n.sessionId}:${live.seq}`;
        }
        continue;
      }
      if (n.kind === "board" && n.columns) {
        const txt = boardSummaryText(n.columns, n.selectedItems) || n.text;
        out[n.id] = `${n.id}:${shortHash(txt)}`;
        continue;
      }
      if (
        n.kind === "note" ||
        n.kind === "display" ||
        n.kind === "git" ||
        n.kind === "changes" ||
        n.kind === "terminal"
      ) {
        out[n.id] = `${n.id}:${shortHash(n.text)}`;
      }
    }
    return out;
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
      const source = this.state.doc.nodes.find((n) => n.id === edge.source);
      if (!source) continue;
      const captured =
        source.kind === "agent"
          ? await this.runtime.capture(source, edge.mode)
          : await this.runtime.reference(source, edge);
      const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
      edge.currentVersion = version;
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
    const sourceVersions = this.computeSourceVersions();
    for (const edge of this.state.doc.edges) {
      if (edge.kind === "reference") {
        if (edge.snapshotText) {
          edge.currentVersion = `${edge.source}:${shortHash(edge.snapshotText)}`;
        } else if (sourceVersions[edge.source]) {
          edge.currentVersion = sourceVersions[edge.source];
        }
      }
    }
    await this.domain
      .table("documents")
      .put("main", structuredClone(this.state.doc));

    const retainedTemplates = new Set(
      (this.state.doc.templates ?? []).map((t) => t.id),
    );
    for (const id of this.domain.table("templates").keys())
      if (!retainedTemplates.has(id))
        await this.domain.table("templates").delete(id);
    for (const tpl of this.state.doc.templates ?? [])
      await this.domain.table("templates").put(tpl.id, structuredClone(tpl));

    const retainedSnapshots = new Set(
      (this.state.doc.snapshots ?? []).map((s) => s.id),
    );
    for (const id of this.domain.table("snapshots").keys())
      if (!retainedSnapshots.has(id))
        await this.domain.table("snapshots").delete(id);
    for (const snap of this.state.doc.snapshots ?? [])
      await this.domain.table("snapshots").put(snap.id, structuredClone(snap));

    const retainedRuns = new Set(this.state.runs.map((r) => r.id));
    for (const id of this.domain.table("runs").keys())
      if (!retainedRuns.has(id)) await this.domain.table("runs").delete(id);
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
      nativeMessages: [...this.state.nativeMessages.values()].sort(
        (a, b) => a.time - b.time || a.seq - b.seq,
      ),
      subagents: [...this.state.subagents.values()],
      sourceVersions: this.computeSourceVersions(),
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
          node.branch = old.branch;
          node.worktreePath = old.worktreePath;
        }
        if (old) node.lastSubmittedTask = old.lastSubmittedTask;
      }
      for (const edge of next.edges) {
        const old = this.state.doc.edges.find((e) => e.id === edge.id);
        if (old?.originMode === "fork") {
          edge.originMode = "fork";
          edge.mode = old.mode;
        }
        if (old && edge.sentVersion === undefined && old.sentVersion) {
          // Preserve sentVersion unless the client explicitly cleared it (re-arming a sent capsule via sentVersion: "")
          edge.sentVersion = old.sentVersion;
        } else if (edge.sentVersion === "") {
          delete edge.sentVersion;
        }
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
  rerunFailed(request: RerunFailedRequest): Promise<FlowspaceRun> {
    return this.scheduler.rerunFailed(request.runId);
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
      node.branch = request.branch ?? node.branch;
      node.worktreePath = request.worktreePath ?? node.worktreePath;
      if (request.sessionId) {
        using observation = await this.ctx.sessionQuery.observeSession(
          request.sessionId as SessionId,
        );
        node.sessionId = request.sessionId;
        node.cwd = observation.header.cwd;
        for (const ev of observation.events) {
          this.recordNativeMessage(request.sessionId, ev);
        }
      } else node.sessionId = await this.runtime.ensure(node);
      if (node.continuationPrompt === undefined && node.task.trim()) {
        node.continuationPrompt = node.task;
      }
      await this.persist();
      return structuredClone(node);
    });
  }
  @Remote
  async display(request: SourceRequest): Promise<FlowNode> {
    const source = this.state.doc.nodes.find((n) => n.id === request.nodeId);
    if (!source) throw new Error("来源节点不存在");
    const captured =
      request.text === undefined
        ? source.kind === "agent"
          ? await this.runtime.capture(source, "conclusion", request.seq)
          : await this.runtime.reference(source)
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
      updatedAt: (s as unknown as { updatedAt?: number }).updatedAt,
    }));
  }
  @Remote
  workspaces(): WorkspaceBrief[] {
    return this.ctx.workspaceRegistry
      .list()
      .map((w) => ({ id: w.id, name: w.title, path: w.path }));
  }
  @Remote
  async projectStructures(): Promise<WorkspaceStructureBrief[]> {
    const list = this.ctx.workspaceRegistry.list();
    return Promise.all(
      list.map(async (w) => {
        const status = await this.git.inspect(w.path).catch(() => null);
        return {
          id: w.id,
          name: w.title,
          path: w.path,
          isGitRepo: Boolean(status?.isGitRepo),
          currentBranch: status?.branch || undefined,
          branches: status?.branches ?? [],
          worktrees: status?.worktrees ?? [],
        };
      }),
    );
  }
  @Remote
  async gitInspect(request: GitInspectRequest): Promise<GitRepoStatus> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    return this.git.inspect(base);
  }
  @Remote
  async gitDiff(request: GitDiffRequest): Promise<GitDiffResult> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    return this.git.diff(base, request);
  }
  @Remote
  async gitAction(request: GitActionRequest): Promise<GitRepoStatus> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    return this.git.act(base, request);
  }
  @Remote
  async sessionChanges(
    request: SessionChangesRequest,
  ): Promise<SessionChangeTurn[]> {
    const sessionId = request.sessionId.trim();
    if (!sessionId) return [];
    using obs = await this.ctx.sessionQuery.observeSession(
      sessionId as SessionId,
      { projectionMode: "none" },
    );
    return this.collectSessionChangesFromEvents(sessionId, obs.events);
  }
  @Remote
  async sessionChangeDiff(
    request: SessionChangeDiffRequest,
  ): Promise<SessionFileDiffView> {
    const wc = (
      this.ctx as unknown as {
        get(k: string): HostWorkspaceChanges | undefined;
      }
    ).get("workspaceChanges");
    if (!wc) {
      throw new Error("当前 Host 未挂载 workspace-changes 服务");
    }
    const sid = request.sessionId as SessionId;
    const sum = wc.summary(sid, request.seq);
    if (!sum) {
      throw new Error("该轮改动临时快照已过期或不存在");
    }
    const signal = new AbortController().signal;
    if (request.fileIndex !== undefined) {
      const diff = await wc.diff(sid, request.seq, request.fileIndex, signal);
      if (!diff) throw new Error("未找到指定文件改动对比");
      if (diff.kind !== "text") {
        return {
          path: diff.path,
          display: diff.display,
          kind: diff.kind,
          hunks: [],
          formatted: `[${diff.kind.toUpperCase()}] ${diff.display}`,
        };
      }
      const formatted = [
        `--- a/${diff.display}`,
        `+++ b/${diff.display}`,
        ...diff.hunks.flatMap((h) => [
          `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
          ...h.lines,
        ]),
      ].join("\n");
      return {
        path: diff.path,
        display: diff.display,
        kind: "text",
        hunks: diff.hunks,
        formatted,
      };
    }

    // Whole-turn diff aggregation for snapshotting onto a Changes node or reference wire
    const parts: string[] = [
      `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})`,
    ];
    const allHunks: SessionFileDiffView["hunks"] = [];
    for (let i = 0; i < Math.min(sum.files.length, 20); i++) {
      const diff = await wc.diff(sid, request.seq, i, signal).catch(() => undefined);
      if (!diff) continue;
      if (diff.kind !== "text") {
        parts.push(`\n[${diff.kind.toUpperCase()}] ${diff.display}`);
        continue;
      }
      parts.push(`\n--- a/${diff.display}\n+++ b/${diff.display}`);
      for (const h of diff.hunks) {
        allHunks.push(h);
        parts.push(
          `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
          ...h.lines,
        );
      }
    }
    const formatted = parts.join("\n");
    return {
      path: sum.cwd,
      display: `Turn #${sum.turn}`,
      kind: "text",
      hunks: allHunks.slice(0, 60),
      formatted,
    };
  }
  @Remote
  sessionTerminals(
    request: SessionTerminalsRequest,
  ): SessionTerminalBrief[] {
    const tc = (
      this.ctx as unknown as {
        get(k: string): HostTerminalController | undefined;
      }
    ).get("terminalController");
    if (!tc || !request.sessionId) return [];
    return tc.list(request.sessionId as SessionId).map((t) => ({
      id: t.id,
      sessionId: request.sessionId,
      title: t.title,
      cwd: t.cwd,
      state: t.state,
      exitCode: t.exitCode,
      origin: t.origin,
    }));
  }
  @Remote
  async openSessionTerminal(
    request: SessionTerminalsRequest,
  ): Promise<SessionTerminalBrief> {
    const tc = (
      this.ctx as unknown as {
        get(k: string): HostTerminalController | undefined;
      }
    ).get("terminalController");
    if (!tc) throw new Error("当前环境未启用 terminalController");
    const resolved = await this.ctx.sessionController.resolveAgent(
      request.sessionId as SessionId,
    );
    if ("error" in resolved) throw resolved.error;
    const created = await tc.create(
      resolved.agent,
      { id: uid(), cols: 100, rows: 28 },
      new AbortController().signal,
    );
    return {
      id: created.id,
      sessionId: request.sessionId,
      title: created.title,
      cwd: created.cwd,
      state: created.state,
      exitCode: created.exitCode,
      origin: created.origin,
    };
  }
  @Remote
  async readTerminalScreen(
    request: TerminalScreenReadRequest,
  ): Promise<TerminalScreenSnapshot> {
    const tc = (
      this.ctx as unknown as {
        get(k: string): HostTerminalController | undefined;
      }
    ).get("terminalController");
    if (!tc) throw new Error("当前环境未启用 terminalController");
    const sid = request.sessionId as SessionId;
    const list = tc.list(sid);
    const chosen =
      (request.terminalId
        ? list.find((t) => t.id === request.terminalId)
        : undefined) ?? list[0];
    if (!chosen) {
      return {
        sessionId: request.sessionId,
        terminalId: "",
        title: "无活动终端",
        state: "exited",
        text: "",
        totalLines: 0,
        truncated: false,
      };
    }
    const resolved = await this.ctx.sessionController.resolveAgent(sid);
    if ("error" in resolved) throw resolved.error;
    const page = await tc.readScreen(resolved.agent, chosen.id, {
      offset: 0,
      count: Math.min(400, Math.max(20, request.lines ?? 140)),
      maxBytes: 65536,
    });
    return {
      sessionId: request.sessionId,
      terminalId: chosen.id,
      title: chosen.title,
      state: chosen.state,
      text: page.text,
      totalLines: page.totalLines,
      truncated: page.truncated,
    };
  }
  @Remote
  async workspaceFiles(request: WorkspaceFilesRequest): Promise<string[]> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const out: string[] = [];
    const skip = new Set([
      "node_modules",
      ".git",
      ".local",
      ".backups",
      "dist",
      "lib",
      ".next",
      "coverage",
    ]);
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > 3 || out.length >= 60) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (out.length >= 60) break;
        if (skip.has(entry.name)) continue;
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) await walk(full, depth + 1);
        else if (entry.isFile())
          out.push(relative(base, full).replaceAll("\\", "/"));
      }
    };
    await walk(base, 0);
    return out;
  }
  @Remote
  async readWorkspaceFile(
    request: FilePreviewRequest,
  ): Promise<WorkspaceFilePreview> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const raw = request.path.trim();
    if (!raw) throw new Error("未指定文件路径");
    const full = resolve(base, raw);
    const rel = relative(base, full);
    if (rel.startsWith("..") || isAbsolute(rel))
      throw new Error("文件路径超出当前工作区");
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) throw new Error(`文件不存在：${raw}`);
    const content = await readFile(full, "utf8");
    const max = 24000;
    return {
      path: rel.replaceAll("\\", "/"),
      content: content.length > max ? content.slice(0, max) : content,
      truncated: content.length > max,
    };
  }
  private resolveWorkspaceRoot(cwd?: string): string {
    const list = this.ctx.workspaceRegistry.list();
    if (cwd) {
      const candidate = resolve(cwd);
      // Allow any registered workspace, its subpaths, or sibling worktrees (`../<repo>-worktrees/...`)
      if (
        list.some(
          (w) =>
            isSubPath(w.path, candidate) ||
            isSubPath(resolve(w.path, ".."), candidate),
        ) ||
        candidate === resolve(process.cwd())
      ) {
        return candidate;
      }
    }
    return resolve(list[0]?.path ?? process.cwd());
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
