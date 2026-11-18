import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session/types";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type { MainPanelId } from "@deepseek-ai/dsh-client-ui-layout/client";
import { useSyncExternalStore } from "react";
import type {
  BindRequest,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GitActionRequest,
  GitDiffRequest,
  GitDiffResult,
  GitRepoStatus,
  LaunchPlan,
  SessionBrief,
  SessionChangeTurn,
  SessionFileDiffView,
  SessionTerminalBrief,
  SourceRequest,
  StartRequest,
  TerminalScreenSnapshot,
  WorkspaceBrief,
  WorkspaceFilePreview,
  WorkspaceStructureBrief,
} from "../types.ts";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";
import type {} from "../../lib/typert.remote-client.js";
import type {} from "@deepseek-ai/dsh-client-locale/client";
import { setLanguage } from "./i18n.ts";

export interface CanvasBridge {
  useSnapshot(): FlowspaceSnapshot | null;
  connect(): () => void;
  save(doc: FlowspaceDocument): Promise<FlowspaceDocument>;
  plan(req: StartRequest): Promise<LaunchPlan>;
  start(req: StartRequest): Promise<void>;
  rerunFailed(runId: string): Promise<void>;
  command(runId: string, action: "pause" | "resume" | "cancel"): Promise<void>;
  release(runId: string, tokenId: string, accept: boolean): Promise<void>;
  bind(req: BindRequest): Promise<FlowNode>;
  display(req: SourceRequest): Promise<FlowNode>;
  sessions(): Promise<SessionBrief[]>;
  workspaces(): Promise<WorkspaceBrief[]>;
  projectStructures(): Promise<WorkspaceStructureBrief[]>;
  gitInspect(cwd?: string): Promise<GitRepoStatus>;
  gitDiff(req: GitDiffRequest): Promise<GitDiffResult>;
  gitAction(req: GitActionRequest): Promise<GitRepoStatus>;
  sessionChanges(sessionId: string): Promise<SessionChangeTurn[]>;
  sessionChangeDiff(
    sessionId: string,
    seq: number,
    fileIndex?: number,
  ): Promise<SessionFileDiffView>;
  sessionTerminals(sessionId: string): Promise<SessionTerminalBrief[]>;
  openSessionTerminal(sessionId: string): Promise<SessionTerminalBrief>;
  readTerminalScreen(
    sessionId: string,
    terminalId?: string,
    lines?: number,
  ): Promise<TerminalScreenSnapshot>;
  workspaceFiles(cwd?: string): Promise<string[]>;
  readWorkspaceFile(path: string, cwd?: string): Promise<WorkspaceFilePreview>;
  retain(node: FlowNode): SessionReference;
  openChat(sessionId: string): void;
  openCanvas(nodeId?: string): void;
  presence(ids: string[]): void;
  stopNode(nodeId: string): Promise<void>;
  takeFocus(): string | undefined;
}
function value<T>(result: RemoteResult<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}
export class FlowClient implements CanvasBridge {
  private snapshot: FlowspaceSnapshot | null = null;
  private listeners = new Set<() => void>();
  private stream?: { dispose(): void };
  private focus?: string;
  private connectCount = 0;
  private draftSavers = new Map<string, () => Promise<void>>();
  constructor(private ctx: Context) {
    setLanguage(ctx.locale.getLocale().active);
    ctx.effect(() =>
      ctx.locale.subscribe(() => {
        setLanguage(ctx.locale.getLocale().active);
        if (this.snapshot) this.publish({ ...this.snapshot });
      }),
    );
    ctx.on("connection/reset", () => {
      if (this.connectCount) {
        this.stream?.dispose();
        this.read();
      }
    });
    ctx.effect(() =>
      ctx.uiSession.sessionStatus.subscribe(() => {
        if (this.snapshot) this.publish(this.snapshot);
      }),
    );
  }
  useSnapshot = (): FlowspaceSnapshot | null =>
    useSyncExternalStore(
      (fn) => {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
      },
      () => this.snapshot,
    );
  private publish(snapshot: FlowspaceSnapshot): void {
    const statuses = this.ctx.uiSession.sessionStatus.getSnapshot();
    const live = snapshot.document.nodes.flatMap((node) => {
      if (!node.sessionId) return [];
      const host = snapshot.live.find((s) => s.nodeId === node.id),
        status = statuses.get(node.sessionId as SessionId);
      return [
        {
          nodeId: node.id,
          sessionId: node.sessionId,
          output: host?.output ?? "",
          seq: host?.seq ?? -1,
          running: status?.running ?? host?.running ?? false,
          pendingInput: status?.pendingInteraction
            ? [status.pendingInteraction.kind]
            : [],
          updatedAt: host?.updatedAt,
          effectiveCwd: host?.effectiveCwd,
          changesTurns: host?.changesTurns,
        },
      ];
    });
    this.snapshot = { ...snapshot, live };
    this.listeners.forEach((fn) => fn());
  }
  connect(): () => void {
    if (!this.connectCount++) this.read();
    return () => {
      if (!--this.connectCount) {
        this.stream?.dispose();
        this.stream = undefined;
        this.presence([]);
      }
    };
  }
  private read(): void {
    const handle = this.ctx.remote.flowspace.follow();
    this.stream = handle;
    void (async () => {
      try {
        for await (const snapshot of handle) this.publish(snapshot);
      } catch (e) {
        console.error("FlowSpace stream:", e);
      }
    })();
  }
  async save(doc: FlowspaceDocument): Promise<FlowspaceDocument> {
    return value(await this.ctx.remote.flowspace.save(doc));
  }
  async plan(req: StartRequest): Promise<LaunchPlan> {
    await Promise.all([...this.draftSavers.values()].map((save) => save()));
    return value(await this.ctx.remote.flowspace.plan(req));
  }
  async start(req: StartRequest): Promise<void> {
    await Promise.all([...this.draftSavers.values()].map((save) => save()));
    const run = value(await this.ctx.remote.flowspace.start(req));
    for (const step of run.steps) {
      const scope =
        step.sessionId && this.ctx.sessions.scope(step.sessionId as SessionId);
      if (!scope) continue;
      const input = this.ctx.conversation.input.for(scope);
      if (input.state.getSnapshot().draft.trim() === step.task)
        input.setDraft("");
    }
  }
  async rerunFailed(runId: string): Promise<void> {
    value(await this.ctx.remote.flowspace.rerunFailed({ runId }));
  }
  async command(
    runId: string,
    action: "pause" | "resume" | "cancel",
  ): Promise<void> {
    value(await this.ctx.remote.flowspace.command({ runId, action }));
  }
  async release(
    runId: string,
    tokenId: string,
    accept: boolean,
  ): Promise<void> {
    value(await this.ctx.remote.flowspace.release({ runId, tokenId, accept }));
  }
  async bind(req: BindRequest): Promise<FlowNode> {
    return value(await this.ctx.remote.flowspace.bind(req));
  }
  async display(req: SourceRequest): Promise<FlowNode> {
    return value(await this.ctx.remote.flowspace.display(req));
  }
  async sessions(): Promise<SessionBrief[]> {
    return value(await this.ctx.remote.flowspace.sessions());
  }
  async stopNode(nodeId: string): Promise<void> {
    value(await this.ctx.remote.flowspace.stopNode(nodeId));
  }
  async workspaces(): Promise<WorkspaceBrief[]> {
    return value(await this.ctx.remote.flowspace.workspaces());
  }
  async projectStructures(): Promise<WorkspaceStructureBrief[]> {
    return value(await this.ctx.remote.flowspace.projectStructures());
  }
  async gitInspect(cwd?: string): Promise<GitRepoStatus> {
    return value(await this.ctx.remote.flowspace.gitInspect({ cwd }));
  }
  async gitDiff(req: GitDiffRequest): Promise<GitDiffResult> {
    return value(await this.ctx.remote.flowspace.gitDiff(req));
  }
  async gitAction(req: GitActionRequest): Promise<GitRepoStatus> {
    return value(await this.ctx.remote.flowspace.gitAction(req));
  }
  async sessionChanges(sessionId: string): Promise<SessionChangeTurn[]> {
    return value(
      await this.ctx.remote.flowspace.sessionChanges({ sessionId }),
    );
  }
  async sessionChangeDiff(
    sessionId: string,
    seq: number,
    fileIndex?: number,
  ): Promise<SessionFileDiffView> {
    return value(
      await this.ctx.remote.flowspace.sessionChangeDiff({
        sessionId,
        seq,
        fileIndex,
      }),
    );
  }
  async sessionTerminals(sessionId: string): Promise<SessionTerminalBrief[]> {
    return value(
      await this.ctx.remote.flowspace.sessionTerminals({ sessionId }),
    );
  }
  async openSessionTerminal(sessionId: string): Promise<SessionTerminalBrief> {
    return value(
      await this.ctx.remote.flowspace.openSessionTerminal({ sessionId }),
    );
  }
  async readTerminalScreen(
    sessionId: string,
    terminalId?: string,
    lines?: number,
  ): Promise<TerminalScreenSnapshot> {
    return value(
      await this.ctx.remote.flowspace.readTerminalScreen({
        sessionId,
        terminalId,
        lines,
      }),
    );
  }
  async workspaceFiles(cwd?: string): Promise<string[]> {
    return value(await this.ctx.remote.flowspace.workspaceFiles({ cwd }));
  }
  async readWorkspaceFile(
    path: string,
    cwd?: string,
  ): Promise<WorkspaceFilePreview> {
    return value(
      await this.ctx.remote.flowspace.readWorkspaceFile({ path, cwd }),
    );
  }
  retain(node: FlowNode): SessionReference {
    const reference = this.ctx.sessions.retain(node.sessionId as SessionId, {
      source: "flowspace",
    });
    void reference.ready.then((binding) => {
      this.ctx.conversation.input.requestDraftInitialization(binding, {
        prompt: node.draft,
        whenDraftExists: "keep",
      });
    });
    return reference;
  }
  watchDraft(actx: Context, nodeId: string): () => void {
    const input = this.ctx.conversation.input.for(actx);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = async (): Promise<void> => {
      clearTimeout(timer);
      const draft = input.state.getSnapshot().draft;
      value(await this.ctx.remote.flowspace.draft({ nodeId, draft }));
    };
    this.draftSavers.set(nodeId, flush);
    const save = (): void => {
      void flush().catch((error) => input.notify("error", String(error)));
    };
    const stop = input.state.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(save, 400);
    });
    return () => {
      stop();
      clearTimeout(timer);
      this.draftSavers.delete(nodeId);
      void Promise.resolve()
        .then(flush)
        .catch(() => {
          /* Remote can be withdrawn before an unmount cleanup. */
        });
    };
  }
  openChat(sessionId: string): void {
    this.ctx.uiWorkspace.openSession(sessionId as SessionId);
  }
  openCanvas(nodeId?: string): void {
    this.focus = nodeId;
    this.ctx.layout.selectPanel("flowspace" as MainPanelId);
  }
  takeFocus(): string | undefined {
    const id = this.focus;
    this.focus = undefined;
    return id;
  }
  presence(ids: string[]): void {
    void Promise.resolve()
      .then(() => this.ctx.remote.flowspace.canvasPresence(ids))
      .then(value)
      .catch(() => {
        /* The namespace may already be withdrawn during plugin teardown. */
      });
  }
  dispose(): void {
    this.stream?.dispose();
    this.listeners.clear();
    this.draftSavers.clear();
  }
}
