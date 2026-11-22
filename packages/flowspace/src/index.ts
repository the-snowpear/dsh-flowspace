import { Context, Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type {} from "@deepseek-ai/dsh-api-session-controller";
import type {} from "@deepseek-ai/dsh-workspace";
import type { SessionId } from "@deepseek-ai/dsh-session";
import { DEFAULT_LIST_LIMIT } from "./core/content.ts";
import {
  sanitizeDocumentForWire,
  syncUntitledAgentNode,
} from "./core/document.ts";
import { dataDescriptors } from "./core/nodes/data/index.ts";
import { mergeSort } from "./core/nodes/fanout.ts";
import { humanNodes, noticeNode } from "./core/nodes/interactions.ts";
import { judges } from "./core/nodes/judge/index.ts";
import { gitExec, terminalExec } from "./core/nodes/operations.ts";
import { randomNode } from "./core/nodes/play.ts";
import { descriptorOf, registerDescriptor } from "./core/nodes/registry.ts";
import type { NodeDescriptor, NodeExecutor } from "./core/nodes/types.ts";
import { assignmentNode, variableNode } from "./core/nodes/variables.ts";
import { Scheduler } from "./core/scheduler.ts";
import { ContainerStore, registerContainerTools } from "./host/containers.ts";
import { DataFileWatch } from "./host/dataFileWatch.ts";
import { previewDataNode } from "./host/dataPreview.ts";
import { DocumentService, loadInitialHostState } from "./host/documentService.ts";
import { inspectEdgePayload } from "./host/edgeInspector.ts";
import { registerFlowEmit } from "./host/flowEmit.ts";
import { HostGitService } from "./host/git.ts";
import { dataExecutor } from "./host/nodes/data.ts";
import {
  humanExecutor,
  noticeExecutor,
  TriggerService,
} from "./host/nodes/interactions.ts";
import { judgeExecutors } from "./host/nodes/judge/index.ts";
import { mergeExecutor } from "./host/nodes/merge.ts";
import { OperationService } from "./host/nodes/operations.ts";
import { ArenaStore, randomExecutor } from "./host/nodes/play.ts";
import { ReferenceService } from "./host/referenceService.ts";
import { DshRuntime } from "./host/runtime.ts";
import { SessionIngestor } from "./host/sessionIngestor.ts";
import { createHostState } from "./host/state.ts";
import { flowspaceDomain } from "./host/storage.ts";
import { TeamAssets } from "./host/teamAssets.ts";
import { TeamRuntime } from "./host/teamRuntime.ts";
import { HostToolBridge } from "./host/toolBridge.ts";
import { VariableStore } from "./host/variables.ts";
import { WorkspaceFs } from "./host/workspaceFs.ts";
import type {
  ArchiveTeamAssetRequest,
  BindRequest,
  DataPreview,
  DataPreviewRequest,
  DebugStepRequest,
  DraftRequest,
  EdgePayloadPreview,
  ExtendLoopRequest,
  FilePreviewRequest,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  GenerateReportRequest,
  GitActionRequest,
  GitDiffRequest,
  GitDiffResult,
  GitInspectRequest,
  GitRepoStatus,
  HumanAnswerRequest,
  InspectEdgeRequest,
  JsonObject,
  LaunchPlan,
  LaunchTriggerRequest,
  ReleaseRequest,
  RemindEmissionRequest,
  RerunFailedRequest,
  RestoreSnapshotRequest,
  RoleDefinition,
  RunCommand,
  RunReport,
  RunStep,
  SaveRoleRequest,
  SaveTeamRequest,
  SessionBrief,
  SessionChangeDiffRequest,
  SessionChangesRequest,
  SessionChangeTurn,
  SessionFileDiffView,
  SessionTerminalBrief,
  SessionTerminalsRequest,
  SourceRequest,
  StartRequest,
  TeamBlueprint,
  TeamModelRoute,
  TerminalScreenReadRequest,
  TerminalScreenSnapshot,
  WorkflowImportRequest,
  WorkflowImportResult,
  WorkspaceBrief,
  WorkspaceFilePreview,
  WorkspaceFilesRequest,
  WorkspaceStructureBrief,
  WriteVariableRequest,
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
    "llm",
    "tools",
    "subagents",
    "sessionProjections",
  ];

  private state = createHostState();
  private domain!: Domain<typeof flowspaceDomain>;
  private workspaceFs!: WorkspaceFs;
  private teamAssets!: TeamAssets;
  private teams!: TeamRuntime;
  private scheduler!: Scheduler;
  private containers!: ContainerStore;
  private variables!: VariableStore;
  private operations!: OperationService;
  private triggers!: TriggerService;
  private arena!: ArenaStore;
  private runtime!: DshRuntime;
  private dataFileWatch!: DataFileWatch;
  private references!: ReferenceService;
  private ingestor!: SessionIngestor;
  private documents!: DocumentService;
  private toolBridge!: HostToolBridge;
  private nodeExecutors = new Map<string, NodeExecutor>();
  private git = new HostGitService();
  private disposed = false;

  constructor(ctx: Context) {
    super(ctx, "flowspace");
  }

  registerNodeKind<C extends JsonObject>(
    descriptor: NodeDescriptor<C>,
    executor: NodeExecutor,
  ): () => void {
    return this.ctx.effect(() => {
      if (this.nodeExecutors.has(descriptor.flowType)) {
        throw new Error(`节点执行器已注册：${descriptor.flowType}`);
      }
      const unregister =
        descriptorOf(descriptor.flowType) === descriptor
          ? undefined
          : registerDescriptor(descriptor);
      this.nodeExecutors.set(descriptor.flowType, executor);
      return () => {
        this.nodeExecutors.delete(descriptor.flowType);
        unregister?.();
      };
    });
  }

  protected async [Service.init](): Promise<void> {
    this.domain = await this.ctx.storageDomain.open(flowspaceDomain);
    this.arena = new ArenaStore(this.domain.table("arena_results"));
    this.teamAssets = new TeamAssets(this.domain, this.ctx.llm);
    this.teams = new TeamRuntime(
      this.ctx,
      this.domain,
      this.teamAssets,
      () => this.publish(),
      () => this.state?.doc.nodes ?? [],
    );
    this.workspaceFs = new WorkspaceFs(this.ctx);
    await loadInitialHostState(this.domain, this.workspaceFs, this.state);

    this.runtime = new DshRuntime(
      this.ctx,
      (id) => this.state.doc.nodes.find((n) => n.id === id),
      this.teams,
      this.nodeExecutors,
      this.domain.table("content_spills"),
      () => this.state.doc.settings.listLimit,
      (path, cwd) => this.workspaceFs.readFullText(path, cwd),
    );

    const executors = judgeExecutors(
      this.ctx,
      this.runtime.contextText.bind(this.runtime),
    );
    for (const descriptor of judges) {
      this.registerNodeKind(descriptor, executors[descriptor.flowType]);
    }
    const stepLimit = (step: RunStep) =>
      this.state.runs.find((run) =>
        run.steps.some((current) => current.id === step.id),
      )?.listLimit ??
      this.state.doc.settings.listLimit ??
      DEFAULT_LIST_LIMIT;
    this.registerNodeKind(mergeSort, mergeExecutor(this.ctx, stepLimit));
    const transform = dataExecutor(this.ctx, stepLimit);
    for (const descriptor of dataDescriptors) {
      this.registerNodeKind(descriptor, transform);
    }

    this.variables = new VariableStore(
      this.domain.table("variables"),
      () => this.state.doc,
      () => this.state.runs,
      () => this.publish(),
      (value) => {
        const write = value.history.at(-1);
        if (!write) return;
        void this.scheduler
          .variableChanged(
            value.id,
            JSON.stringify({
              name: value.name,
              version: value.version,
              value: value.value,
            }),
            write.runId,
            write.stepId,
          )
          .catch((error) =>
            this.ctx.logger.warn("FlowSpace 变量事件：%s", error),
          );
      },
    );

    this.operations = new OperationService(
      this.ctx,
      this.git,
      () => this.state.doc,
      () => this.state.runs,
      (cwd) => this.resolveWorkspaceRoot(cwd),
      (id) =>
        [...this.state.live.values()].find((live) => live.sessionId === id)
          ?.effectiveCwd ??
        this.state.doc.nodes.find((node) => node.sessionId === id)
          ?.worktreePath ??
        this.state.doc.nodes.find((node) => node.sessionId === id)?.cwd,
    );
    this.registerNodeKind(gitExec, this.operations.execute);
    this.registerNodeKind(terminalExec, this.operations.execute);

    const draw = randomExecutor(this.domain.table("play_counters"));
    this.registerNodeKind(randomNode, (node, step, signal, options) =>
      this.scheduler.transact(() => draw(node, step, signal, options)),
    );
    for (const descriptor of humanNodes) {
      this.registerNodeKind(descriptor, humanExecutor(this.ctx));
    }
    this.registerNodeKind(
      noticeNode,
      noticeExecutor((notice) => {
        if (this.state.notices.some((entry) => entry.id === notice.id)) return;
        this.state.notices = [...this.state.notices.slice(-39), notice];
        this.publish();
      }),
    );
    this.registerNodeKind(assignmentNode, (node, step, signal, options) =>
      this.scheduler.transact(() =>
        this.variables.assign(node, step, signal, options),
      ),
    );

    this.documents = new DocumentService({
      ctx: this.ctx,
      domain: this.domain,
      state: this.state,
      arena: this.arena,
      teamAssets: this.teamAssets,
      teams: this.teams,
      runtime: this.runtime,
      workspaceFs: this.workspaceFs,
      getScheduler: () => this.scheduler,
      getContainers: () => this.containers,
      getDataFileWatch: () => this.dataFileWatch,
      getReferences: () => this.references,
      getIngestor: () => this.ingestor,
      publish: () => this.publish(),
    });

    this.scheduler = new Scheduler(
      this.runtime,
      {
        document: () => this.state.doc,
        changed: () => this.documents.persist(),
        deliver: async (run, edge, token) => {
          const source = await this.runtime.hydrateContent(token.source);
          const variable = this.state.doc.nodes.find(
            (node) =>
              node.id === edge.target && node.flowType === variableNode.flowType,
          );
          if (variable) {
            await this.variables.deliver(
              variable,
              run,
              run.steps.find((step) => step.id === token.stepId),
              edge.id,
              source,
            );
          } else {
            await this.containers.deliver(run, edge, token, source);
          }
        },
        variableReference: (run, step, node) =>
          this.variables.reference(node, run, step),
        prepareStep: async (run, step, node) => {
          const { resolvedTask, config, variables } = this.variables.prepare(
            node,
            step.task,
            run,
            step,
          );
          step.task = node.lanePersona
            ? `${node.lanePersona}\n\n${resolvedTask}`
            : resolvedTask;
          if (node.teamModel?.provider === "@available") {
            node.teamModel = await this.documents.availableModel(
              node.teamModel.model,
            );
          }
          if (variables.length) {
            step.variables = variables;
            step.resolvedConfig = config;
          }
          if (config?.provider === "@available") {
            const model = await this.documents.availableModel(
              String(config.model ?? "0"),
            );
            step.resolvedConfig = { ...config, ...model };
          }
        },
        toolsFor: (run, step) =>
          this.operations.prefetch(run, step).length
            ? ["provide_flow_parameters"]
            : [],
        recordAccumulator: async (run, step, node, source) => {
          await this.variables.recordAccumulator(
            run,
            step,
            node,
            await this.runtime.hydrateContent(source),
          );
        },
        bound: async (nodeId, sessionId, fork) => {
          const node = this.state.doc.nodes.find((n) => n.id === nodeId);
          if (!node) return;
          node.sessionId = sessionId;
          syncUntitledAgentNode(node);
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
          const n = this.state.doc.nodes.find((item) => item.id === id);
          if (n) {
            syncUntitledAgentNode(n);
            n.lastSubmittedTask = isContinuation ? task : n.task || task;
            if (!isContinuation && n.draft === task) n.draft = "";
          }
        },
      },
      this.state.runs,
    );

    this.references = new ReferenceService({
      ctx: this.ctx,
      state: this.state,
      runtime: this.runtime,
      variables: this.variables,
      operations: this.operations,
      teams: this.teams,
      scheduler: this.scheduler,
      resolveWorkspaceRoot: (cwd) => this.resolveWorkspaceRoot(cwd),
      persist: () => this.documents.persist(),
    });

    this.ingestor = new SessionIngestor({
      ctx: this.ctx,
      state: this.state,
      runtime: this.runtime,
      workspaceFs: this.workspaceFs,
      teams: this.teams,
      scheduler: this.scheduler,
      publish: () => this.publish(),
      schedulePersist: () => this.documents.schedulePersist(),
    });

    this.toolBridge = new HostToolBridge({
      ctx: this.ctx,
      git: this.git,
      workspaceFs: this.workspaceFs,
      ingestor: this.ingestor,
    });

    this.containers = new ContainerStore(
      this.ctx,
      this.domain.table("container_changes"),
      () => this.state.doc,
      () => this.documents.persist(),
      () => this.publish(),
      (request) => this.workspaceFs.workspacePath(request),
    );
    await this.containers.recover();

    this.triggers = new TriggerService(
      this.ctx,
      this.domain.table("triggers"),
      this.scheduler,
      this.git,
      () => this.state.doc,
      () => this.state.runs,
      () => this.publish(),
      (request) => this.workspaceFs.workspacePath(request),
      () =>
        [
          ...this.containers.changes().map((change) => ({
            key: change.id,
            at: change.at,
            nodeId: change.nodeId,
            columnId:
              change.after?.kind === "board" ? change.after.columnId : undefined,
          })),
          ...this.variables.list().flatMap((variable) =>
            variable.history.map((write) => ({
              key: write.id,
              at: write.at,
              nodeId: variable.id,
              columnId: undefined,
            })),
          ),
        ].sort((a, b) => a.at - b.at),
    );
    this.ctx.effect(() => this.triggers.start());

    registerFlowEmit(this.ctx, this.scheduler);
    registerContainerTools(this.ctx, this.containers, this.scheduler);
    this.variables.registerTools(this.ctx, this.scheduler);
    this.operations.registerTools(this.scheduler);

    this.ctx.on("llm/stream", (options, next) => {
      const source = next();
      const id = options.sessionId;
      if (!id || !this.scheduler.observesOutput(id)) return source;
      const scheduler = this.scheduler;
      const logger = this.ctx.logger;
      return (async function* () {
        let buffered = "",
          sentAt = 0;
        const emit = () => {
          if (!buffered) return;
          const delta = buffered;
          buffered = "";
          sentAt = Date.now();
          void scheduler
            .nativeStatus(id, "output", delta)
            .catch((error) => logger.warn("FlowSpace 输出事件：%s", error));
        };
        for await (const chunk of source) {
          if (chunk.type === "text-delta") {
            buffered += chunk.text;
            if (Date.now() - sentAt >= 200) emit();
          } else if (chunk.type === "finish") emit();
          yield chunk;
        }
      })();
    });

    await this.scheduler.recover().catch((e) =>
      this.ctx.logger.warn("FlowSpace run recovery warning: %s", e),
    );

    this.dataFileWatch = new DataFileWatch(
      this.ctx.fs,
      (path, cwd, signal) =>
        this.workspaceFs.checkedWatchTarget(path, cwd, signal),
      (ids) => {
        void this.documents
          .refreshDataFiles(ids)
          .catch((error) =>
            this.ctx.logger.warn("FlowSpace 文件预览更新失败: %s", error),
          );
      },
    );
    this.ctx.effect(() => () => this.dataFileWatch.dispose());
    await this.dataFileWatch.sync(this.state.doc);
    const fileIds = this.state.doc.nodes
      .filter((node) => node.kind === "file")
      .map((node) => node.id);
    if (fileIds.length) await this.documents.refreshDataFiles(fileIds);
    await this.ingestor.hydrateBoundSessions().catch((e) =>
      this.ctx.logger.warn("FlowSpace session hydration: %s", e),
    );
    await this.teams.hydrate();
    this.documents.syncTeams();

    const report = (promise: Promise<unknown>): void => {
      void promise.catch((e) => this.ctx.logger.error("FlowSpace: %s", e));
    };

    this.ctx.on("agent/inbox/inserted", ({ agent, message }) => {
      this.references.onInboxInserted(agent.id, message, report);
    });

    this.ctx.on(
      "agent/pre-step",
      async (payload, next) => {
        const decision = await next();
        return this.references.onPreStep(payload.agent, decision);
      },
      { prepend: true },
    );

    this.ctx.on("agent/inbox/claimed", ({ agent, message, turn }) => {
      this.teams.claim(agent, turn, message.source.kind === "user");
      if (message.source.kind === "user") {
        report(
          this.scheduler.claim(
            "rpcId" in message.source ? message.source.rpcId : message.id,
            turn,
            this.teams.reference(agent.id),
          ),
        );
      }
    });

    this.ctx.on("agent/inbox/discarded", ({ message }) => {
      this.references.onInboxDiscarded(message.id);
    });

    this.ctx.on("agent/status", ({ agent, status }) => {
      this.ingestor.onAgentStatus(agent.id, status);
    });

    const rawCtx = this.ctx as unknown as {
      on(event: string, listener: (...args: unknown[]) => void): () => void;
    };
    rawCtx.on("subagent/start", (rawInfo: unknown) => {
      const info = rawInfo as { id?: string; parentSessionId?: string };
      if (info?.id && info?.parentSessionId) {
        this.ingestor.upsertSubagentBrief(info.id, info.parentSessionId, true);
      }
    });
    rawCtx.on("subagent/end", (rawInfo: unknown) => {
      const info = rawInfo as { id?: string; parentSessionId?: string };
      if (!info?.id) return;
      const parentId =
        info.parentSessionId ??
        this.state.subagents.get(info.id)?.parentSessionId;
      if (parentId) {
        this.ingestor.upsertSubagentBrief(info.id, parentId, false);
      }
    });
    rawCtx.on("api-session/added", (rawSummary: unknown) => {
      const summary = rawSummary as {
        sessionId?: string;
        origin?: string;
        parentSessionId?: string;
        running?: boolean;
      };
      if (
        summary?.origin === "subagent" &&
        summary.sessionId &&
        summary.parentSessionId
      ) {
        this.ingestor.upsertSubagentBrief(
          summary.sessionId,
          summary.parentSessionId,
          Boolean(summary.running),
        );
      }
    });

    this.ctx.on("session/event", (session, event) => {
      this.ingestor.onSessionEvent(session.id, event, report, session.header);
    });

    this.ctx.effect(() => async () => {
      this.disposed = true;
      this.documents.dispose();
      this.references.dispose();
      this.operations.dispose();
      await this.scheduler.dispose();
      this.state.listeners.forEach((fn) => fn());
      await this.domain.close();
    });
  }

  private publish(): void {
    this.state.listeners.forEach((fn) => fn());
  }

  @Remote
  snapshot(): FlowspaceSnapshot {
    const sourceVersions = this.references.computeSourceVersions();
    const docCopy = sanitizeDocumentForWire(this.state.doc);
    this.references.syncLiveReferenceVersions(docCopy, sourceVersions);
    return {
      document: docCopy,
      runs: structuredClone(this.state.runs),
      live: [...this.state.live.values()],
      nativeMessages: [...this.state.nativeMessages.values()].sort(
        (a, b) => a.time - b.time || a.seq - b.seq,
      ),
      nativeOperations: [...this.state.nativeOperations.values()],
      subagents: [...this.state.subagents.values()],
      sourceVersions,
      roles: this.teamAssets.listRoles(),
      teamBlueprints: this.teamAssets.listTeams(),
      teams: this.teams.snapshot(),
      containerChanges: this.containers.changes(),
      variables: this.variables.list(),
      triggers: this.triggers.list(),
      notices: this.state.notices,
      arena: this.arena.list(),
    };
  }

  @Remote
  listRoles(): RoleDefinition[] {
    return this.teamAssets.listRoles();
  }

  @Remote
  async saveRole(request: SaveRoleRequest): Promise<RoleDefinition> {
    return this.scheduler.transact(async () => {
      const role = await this.teamAssets.saveRole(request);
      this.publish();
      return role;
    });
  }

  @Remote
  async archiveRole(
    request: ArchiveTeamAssetRequest,
  ): Promise<RoleDefinition> {
    return this.scheduler.transact(async () => {
      const role = await this.teamAssets.archiveRole(request);
      this.publish();
      return role;
    });
  }

  @Remote
  listTeams(): TeamBlueprint[] {
    return this.teamAssets.listTeams();
  }

  @Remote
  async saveTeam(request: SaveTeamRequest): Promise<TeamBlueprint> {
    return this.scheduler.transact(async () => {
      const team = await this.teamAssets.saveTeam(request);
      this.publish();
      return team;
    });
  }

  @Remote
  async archiveTeam(request: ArchiveTeamAssetRequest): Promise<TeamBlueprint> {
    return this.scheduler.transact(async () => {
      const team = await this.teamAssets.archiveTeam(request);
      this.publish();
      return team;
    });
  }

  @Remote
  async listModelRoutes(): Promise<TeamModelRoute[]> {
    return this.teamAssets.listModelRoutes();
  }

  @Remote
  save(document: FlowspaceDocument): Promise<FlowspaceDocument> {
    return this.documents.save(document);
  }

  @Remote
  async revertContainerChange(id: string): Promise<void> {
    await this.scheduler.transact(async () => {
      await this.containers.revert(id);
      this.publish();
    });
  }

  @Remote
  async writeVariable(request: WriteVariableRequest): Promise<void> {
    await this.scheduler.transact(() => this.variables.manualWrite(request));
  }

  @Remote
  async launchTrigger(request: LaunchTriggerRequest): Promise<FlowspaceRun> {
    return this.triggers.launch(request.nodeId, request.values ?? {});
  }

  @Remote
  debugStep(request: DebugStepRequest): Promise<void> {
    return this.scheduler.debugStep(
      request.runId,
      request.stepId,
      request.action,
      request.task,
    );
  }

  @Remote
  generateReport(request: GenerateReportRequest): Promise<RunReport> {
    return this.documents.generateReport(request);
  }

  @Remote
  importWorkflow(
    request: WorkflowImportRequest,
  ): Promise<WorkflowImportResult> {
    return this.documents.importWorkflow(request);
  }

  @Remote
  draft(request: DraftRequest): Promise<void> {
    return this.documents.draft(request);
  }

  @Remote
  plan(request: StartRequest): LaunchPlan {
    this.references.syncLiveReferenceVersions(this.state.doc);
    return this.scheduler.plan(request);
  }

  @Remote
  start(request: StartRequest): Promise<FlowspaceRun> {
    this.references.syncLiveReferenceVersions(this.state.doc);
    return this.scheduler.start(request);
  }

  @Remote
  rerunFailed(request: RerunFailedRequest): Promise<FlowspaceRun> {
    return this.scheduler.rerunFailed(request.runId);
  }

  @Remote
  extendLoop(request: ExtendLoopRequest): Promise<void> {
    return this.scheduler.extendLoop(request);
  }

  @Remote
  command(request: RunCommand): Promise<void> {
    return this.scheduler.command(request.runId, request.action);
  }

  @Remote
  answerHuman(request: HumanAnswerRequest): Promise<void> {
    return this.scheduler.answerHuman(
      request.runId,
      request.stepId,
      request.option,
      request.values,
    );
  }

  @Remote
  remindEmission(request: RemindEmissionRequest): Promise<void> {
    return this.scheduler.remindEmission(request.runId, request.stepId);
  }

  @Remote
  previewData(
    request: DataPreviewRequest,
    signal: AbortSignal,
  ): Promise<DataPreview> {
    return previewDataNode(
      this.ctx,
      this.runtime,
      this.state.doc,
      this.state.runs,
      request,
      signal ?? new AbortController().signal,
    );
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
  restoreSnapshot(
    request: RestoreSnapshotRequest,
  ): Promise<FlowspaceDocument> {
    return this.documents.restoreSnapshot(request);
  }

  @Remote
  inspectEdgePayload(
    request: InspectEdgeRequest,
  ): Promise<EdgePayloadPreview> {
    return inspectEdgePayload(
      {
        ctx: this.ctx,
        state: this.state,
        runtime: this.runtime,
        references: this.references,
        workspaceFs: this.workspaceFs,
      },
      request,
    );
  }

  @Remote
  bind(request: BindRequest): Promise<FlowNode> {
    return this.documents.bind(request);
  }

  @Remote
  display(request: SourceRequest): Promise<FlowNode> {
    return this.documents.display(request);
  }

  @Remote
  sessions(): Promise<SessionBrief[]> {
    return this.toolBridge.sessions();
  }

  @Remote
  workspaces(): WorkspaceBrief[] {
    return this.toolBridge.workspaces();
  }

  @Remote
  projectStructures(): Promise<WorkspaceStructureBrief[]> {
    return this.toolBridge.projectStructures();
  }

  @Remote
  gitInspect(request: GitInspectRequest): Promise<GitRepoStatus> {
    return this.toolBridge.gitInspect(request);
  }

  @Remote
  gitDiff(request: GitDiffRequest): Promise<GitDiffResult> {
    return this.toolBridge.gitDiff(request);
  }

  @Remote
  gitAction(request: GitActionRequest): Promise<GitRepoStatus> {
    return this.toolBridge.gitAction(request);
  }

  @Remote
  sessionChanges(
    request: SessionChangesRequest,
  ): Promise<SessionChangeTurn[]> {
    return this.toolBridge.sessionChanges(request);
  }

  @Remote
  sessionChangeDiff(
    request: SessionChangeDiffRequest,
  ): Promise<SessionFileDiffView> {
    return this.toolBridge.sessionChangeDiff(request);
  }

  @Remote
  sessionTerminals(request: SessionTerminalsRequest): SessionTerminalBrief[] {
    return this.toolBridge.sessionTerminals(request);
  }

  @Remote
  openSessionTerminal(
    request: SessionTerminalsRequest,
  ): Promise<SessionTerminalBrief> {
    return this.toolBridge.openSessionTerminal(request);
  }

  @Remote
  readTerminalScreen(
    request: TerminalScreenReadRequest,
  ): Promise<TerminalScreenSnapshot> {
    return this.toolBridge.readTerminalScreen(request);
  }

  @Remote
  workspaceFiles(request: WorkspaceFilesRequest): Promise<string[]> {
    return this.workspaceFs.listFiles(request);
  }

  @Remote
  readWorkspaceFile(request: FilePreviewRequest): Promise<WorkspaceFilePreview> {
    return this.workspaceFs.readBoundedText(request);
  }

  public resolveWorkspaceRoot(cwd?: string): string {
    return this.workspaceFs.resolveWorkspaceRoot(cwd);
  }

  @Remote
  canvasPresence(sessionIds: string[]): void {
    this.state.canvasSessions = new Set(sessionIds);
  }

  @Remote
  async stopNode(nodeId: string): Promise<void> {
    const node = this.documents.agentNode(nodeId);
    if (!node.sessionId) return;
    const lead = this.teams.isLead(node.sessionId);
    if (lead) await this.scheduler.stopSettlingTeam(node.sessionId);
    this.ctx.sessionController.cancel({
      sessionId: node.sessionId as SessionId,
    });
    if (lead) await this.teams.interruptMembers(node.sessionId);
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
      while (!signal.aborted && !this.disposed) {
        if (!changed) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
        if (signal.aborted || this.disposed) break;
        changed = false;
        wake = undefined;
        yield this.snapshot();
      }
    } finally {
      this.state.listeners.delete(notify);
      signal.removeEventListener("abort", notify);
    }
  }
}

export default FlowspaceService;
