import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session/types";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type { MainPanelId } from "@deepseek-ai/dsh-client-ui-layout/client";
import { useSyncExternalStore } from "react";
import { sanitizeDocumentForWire } from "../core/document.ts";
import type {
  ArchiveTeamAssetRequest,
  BindRequest,
  DataPreview,
  DataPreviewRequest,
  EdgePayloadPreview,
  ExtendLoopRequest,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GitActionRequest,
  GitDiffRequest,
  GitDiffResult,
  GitRepoStatus,
  InspectEdgeRequest,
  JsonValue,
  LaunchPlan,
  RoleDefinition,
  SaveRoleRequest,
  SaveTeamRequest,
  SessionBrief,
  SessionChangeTurn,
  SessionFileDiffView,
  SessionTerminalBrief,
  SourceRequest,
  StartRequest,
  TeamBlueprint,
  TeamMemberView,
  TeamModelRoute,
  TerminalScreenSnapshot,
  WorkspaceBrief,
  WorkflowImportRequest,
  WorkflowImportResult,
  WorkspaceFilePreview,
  WorkspaceStructureBrief,
} from "../types.ts";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";
import type {} from "../../lib/typert.remote-client.js";
import type {} from "@deepseek-ai/dsh-client-locale/client";
import type {} from "@deepseek-ai/dsh-subagent/remote";
import { setLanguage } from "./i18n.ts";
import { shareSnapshotValue } from "./sceneModel.ts";

export { sanitizeDocumentForWire };

export interface CanvasBridge {
  useSnapshot(): FlowspaceSnapshot | null;
  useValue<T>(read: (snapshot: FlowspaceSnapshot | null) => T): T;
  connect(): () => void;
  save(doc: FlowspaceDocument): Promise<FlowspaceDocument>;
  revertContainerChange(id: string): Promise<void>;
  writeVariable(request: { id: string; runId?: string; lane?: string; expectedVersion: number; value?: JsonValue }): Promise<void>;
  launchTrigger(nodeId: string, values: import("../types.ts").JsonObject): Promise<import("../types.ts").FlowspaceRun>;
  debugStep(request: { runId: string; stepId: string; action: "continue" | "step" | "skip"; task?: string }): Promise<void>;
  generateReport(runId: string, model: import("../types.ts").TeamModel): Promise<import("../types.ts").RunReport>;
  importWorkflow(request: WorkflowImportRequest): Promise<WorkflowImportResult>;
  listRoles(): Promise<RoleDefinition[]>;
  saveRole(request: SaveRoleRequest): Promise<RoleDefinition>;
  archiveRole(request: ArchiveTeamAssetRequest): Promise<RoleDefinition>;
  listTeams(): Promise<TeamBlueprint[]>;
  saveTeam(request: SaveTeamRequest): Promise<TeamBlueprint>;
  archiveTeam(request: ArchiveTeamAssetRequest): Promise<TeamBlueprint>;
  listModelRoutes(): Promise<TeamModelRoute[]>;
  plan(req: StartRequest): Promise<LaunchPlan>;
  start(req: StartRequest): Promise<void>;
  rerunFailed(runId: string): Promise<void>;
  extendLoop(req: ExtendLoopRequest): Promise<void>;
  command(runId: string, action: "pause" | "resume" | "cancel"): Promise<void>;
  release(runId: string, tokenId: string, accept: boolean): Promise<void>;
  answerHuman(runId: string, stepId: string, option: string, values?: import("../types.ts").JsonObject): Promise<void>;
  remindEmission(runId: string, stepId: string): Promise<void>;
  restoreSnapshot(snapshotId: string): Promise<FlowspaceDocument>;
  inspectEdgePayload(req: InspectEdgeRequest): Promise<EdgePayloadPreview>;
  previewData(req: DataPreviewRequest, signal?: AbortSignal): Promise<DataPreview>;
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
  retainTeamMember(member: TeamMemberView): SessionReference;
  interruptTeamMember(sessionId: string): Promise<void>;
  openChat(sessionId: string): void;
  openCanvas(nodeId?: string): void;
  presence(ids: string[]): void;
  stopNode(nodeId: string): Promise<void>;
  takeFocus(): string | undefined;
}

export type FlowspaceBridge = CanvasBridge;

function value<T>(result: RemoteResult<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}
export class FlowClient implements CanvasBridge {
  private snapshot: FlowspaceSnapshot | null = null;
  private hostSnapshot: FlowspaceSnapshot | null = null;
  private pendingPresence?: string[];
  private listeners = new Set<() => void>();
  private stream?: { dispose(): void };
  private focus?: string;
  private connectCount = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private draftSavers = new Map<string, () => Promise<void>>();
  constructor(private ctx: Context) {
    setLanguage(ctx.locale.getLocale().active);
    ctx.effect(() =>
      ctx.locale.subscribe(() => {
        setLanguage(ctx.locale.getLocale().active);
        if (this.snapshot) {
          this.snapshot = { ...this.snapshot };
          this.listeners.forEach(fn => fn());
        }
      }),
    );
    ctx.on("connection/reset", () => {
      if (this.connectCount && !this.disposed) {
        this.read();
      }
    });
    ctx.effect(() =>
      ctx.uiSession.sessionStatus.subscribe(() => {
        if (this.hostSnapshot) this.publish(this.hostSnapshot);
      }),
    );
  }
  private subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  useSnapshot = (): FlowspaceSnapshot | null => useSyncExternalStore(this.subscribe, () => this.snapshot);
  useValue = <T,>(read: (snapshot: FlowspaceSnapshot | null) => T): T =>
    useSyncExternalStore(this.subscribe, () => read(this.snapshot));
  private publish(snapshot: FlowspaceSnapshot): void {
    snapshot = this.hostSnapshot ? shareSnapshotValue(this.hostSnapshot, snapshot) : snapshot;
    this.hostSnapshot = snapshot;
    const statuses = this.ctx.uiSession.sessionStatus.getSnapshot();
    const byNode = new Map(snapshot.live.map(item => [item.nodeId, item]));
    const live = snapshot.document.nodes.flatMap((node) => {
      if (!node.sessionId) return [];
      const host = byNode.get(node.id),
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
    const next = { ...snapshot, live: this.snapshot ? shareSnapshotValue(this.snapshot.live, live) : live };
    if (this.snapshot && (Object.keys(next) as (keyof FlowspaceSnapshot)[]).every(key => this.snapshot![key] === next[key])) return;
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  }
  connect(): () => void {
    if (!this.connectCount++) this.read();
    return () => {
      if (!--this.connectCount) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
        const active = this.stream;
        this.stream = undefined;
        active?.dispose();
        this.presence([]);
      }
    };
  }
  private read(): void {
    if (this.disposed) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const prev = this.stream;
    this.stream = undefined;
    prev?.dispose();
    const handle = this.ctx.remote.flowspace.follow();
    this.stream = handle;
    void (async () => {
      try {
        for await (const snapshot of handle) this.publish(snapshot);
      } catch (e) {
        if (this.stream === handle && this.connectCount > 0 && !this.disposed) {
          console.warn("FlowSpace stream interrupted, reconnecting:", e);
        }
      } finally {
        if (this.stream === handle && this.connectCount > 0 && !this.disposed) {
          this.reconnectTimer = setTimeout(() => {
            if (this.connectCount > 0 && !this.disposed) this.read();
          }, 250);
        }
      }
    })();
  }
  async save(doc: FlowspaceDocument): Promise<FlowspaceDocument> {
    const clean = sanitizeDocumentForWire(doc);
    return value(await this.ctx.remote.flowspace.save(clean));
  }
  async revertContainerChange(id: string): Promise<void> {
    value(await this.ctx.remote.flowspace.revertContainerChange(id));
  }
  async writeVariable(request: Parameters<CanvasBridge["writeVariable"]>[0]): Promise<void> {
    value(await this.ctx.remote.flowspace.writeVariable(request));
  }
  async launchTrigger(nodeId: string, values: import("../types.ts").JsonObject) {
    return value(await this.ctx.remote.flowspace.launchTrigger({ nodeId, values }));
  }
  async debugStep(request: Parameters<CanvasBridge["debugStep"]>[0]) {
    value(await this.ctx.remote.flowspace.debugStep(request));
  }
  async generateReport(runId: string, model: import("../types.ts").TeamModel) {
    return value(await this.ctx.remote.flowspace.generateReport({ runId, model }));
  }
  async importWorkflow(request: WorkflowImportRequest): Promise<WorkflowImportResult> {
    return value(await this.ctx.remote.flowspace.importWorkflow(request));
  }
  async listRoles(): Promise<RoleDefinition[]> {
    return value(await this.ctx.remote.flowspace.listRoles());
  }
  async saveRole(request: SaveRoleRequest): Promise<RoleDefinition> {
    return value(await this.ctx.remote.flowspace.saveRole(request));
  }
  async archiveRole(request: ArchiveTeamAssetRequest): Promise<RoleDefinition> {
    return value(await this.ctx.remote.flowspace.archiveRole(request));
  }
  async listTeams(): Promise<TeamBlueprint[]> {
    return value(await this.ctx.remote.flowspace.listTeams());
  }
  async saveTeam(request: SaveTeamRequest): Promise<TeamBlueprint> {
    return value(await this.ctx.remote.flowspace.saveTeam(request));
  }
  async archiveTeam(request: ArchiveTeamAssetRequest): Promise<TeamBlueprint> {
    return value(await this.ctx.remote.flowspace.archiveTeam(request));
  }
  async listModelRoutes(): Promise<TeamModelRoute[]> {
    return value(await this.ctx.remote.flowspace.listModelRoutes());
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
  async extendLoop(req: ExtendLoopRequest): Promise<void> {
    value(await this.ctx.remote.flowspace.extendLoop(req));
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
  async restoreSnapshot(snapshotId: string): Promise<FlowspaceDocument> {
    return value(
      await this.ctx.remote.flowspace.restoreSnapshot({ snapshotId }),
    );
  }
  async answerHuman(runId: string, stepId: string, option: string, values?: import("../types.ts").JsonObject): Promise<void> {
    value(await this.ctx.remote.flowspace.answerHuman({ runId, stepId, option, values }));
  }
  async remindEmission(runId: string, stepId: string): Promise<void> {
    value(await this.ctx.remote.flowspace.remindEmission({ runId, stepId }));
  }
  async inspectEdgePayload(
    req: InspectEdgeRequest,
  ): Promise<EdgePayloadPreview> {
    return value(await this.ctx.remote.flowspace.inspectEdgePayload(req));
  }
  async previewData(req: DataPreviewRequest, signal?: AbortSignal): Promise<DataPreview> {
    return value(await this.ctx.remote.flowspace.previewData(req, signal));
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
  retainTeamMember(member: TeamMemberView): SessionReference {
    return this.ctx.sessions.retain({
      parentSessionId: member.parentId as SessionId,
      childSessionId: member.sessionId as SessionId,
      mode: member.mode === "external" ? "unknown" : member.mode,
    }, { source: "flowspace" });
  }
  async interruptTeamMember(sessionId: string): Promise<void> {
    value(await this.ctx.remote.subagents.interruptByUser(sessionId as SessionId));
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
    if (nodeId && this.snapshot) {
      this.snapshot = { ...this.snapshot };
      this.listeners.forEach(fn => fn());
    }
  }
  takeFocus(): string | undefined {
    const id = this.focus;
    this.focus = undefined;
    return id;
  }
  presence(ids: string[]): void {
    const queued = this.pendingPresence !== undefined;
    this.pendingPresence = ids;
    if (queued) return;
    void Promise.resolve()
      .then(() => {
        const latest = this.pendingPresence!;
        this.pendingPresence = undefined;
        return this.ctx.remote.flowspace.canvasPresence(latest);
      })
      .then(value)
      .catch(() => {
        /* The namespace may already be withdrawn during plugin teardown. */
      });
  }
  dispose(): void {
    this.disposed = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const active = this.stream;
    this.stream = undefined;
    active?.dispose();
    this.listeners.clear();
    this.draftSavers.clear();
  }
}
