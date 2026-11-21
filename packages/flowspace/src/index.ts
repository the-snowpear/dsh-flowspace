import { createHash, randomUUID } from "node:crypto";
import type { ContextFormed, UserMessage } from "@deepseek-ai/dsh-llm";
import { statSync } from "node:fs";
import { open, readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type {} from "@deepseek-ai/dsh-api-session-controller";
import type {} from "@deepseek-ai/dsh-workspace";
import type { SessionEvent, SessionId } from "@deepseek-ai/dsh-session";
import { resolveBoardReference } from "./core/board.ts";
import { rebaseContainerChanges } from "./core/containers.ts";
import {
  emptyDocument,
  newNode,
  referenceTitle,
  sanitizeDocumentForWire,
  syncUntitledAgentNode,
  syncUntitledAgentTitles,
  uid,
  workflowNodes,
} from "./core/document.ts";
import { Scheduler } from "./core/scheduler.ts";
import { mergePendingGeneration, stampGeneratedBatch } from "./core/generation.ts";
import { laneTitle } from "./core/fanout.ts";
import { mergeResultPort } from "./core/connect.ts";
import { DEFAULT_LIST_LIMIT } from "./core/content.ts";
import { descriptorOf, registerDescriptor } from "./core/nodes/registry.ts";
import { judges } from "./core/nodes/judge/index.ts";
import { judgeExecutors } from "./host/nodes/judge/index.ts";
import { mergeSort } from "./core/nodes/fanout.ts";
import { mergeExecutor } from "./host/nodes/merge.ts";
import { dataDescriptors } from "./core/nodes/data/index.ts";
import { dataExecutor } from "./host/nodes/data.ts";
import { previewDataNode, resolveStaticFanout } from "./host/dataPreview.ts";
import { DataFileWatch } from "./host/dataFileWatch.ts";
import type { NodeDescriptor, NodeExecutor } from "./core/nodes/types.ts";
import { isTeamNode, staffedIds } from "./core/team.ts";
import {
  computeFileNodeFingerprint,
  DshRuntime,
  extractFileNodePaths,
  plainText,
} from "./host/runtime.ts";
import { HostGitService, isSubPath, sameFsPath } from "./host/git.ts";
import { registerFlowEmit } from "./host/flowEmit.ts";
import { ContainerStore, registerContainerTools } from "./host/containers.ts";
import { VariableStore } from "./host/variables.ts";
import { assignmentNode, variableNode } from "./core/nodes/variables.ts";
import { gitExec, terminalExec } from "./core/nodes/operations.ts";
import { OperationService } from "./host/nodes/operations.ts";
import { humanNodes, noticeNode, triggerNode } from "./core/nodes/interactions.ts";
import { humanExecutor, noticeExecutor, TriggerService, validateTriggers } from "./host/nodes/interactions.ts";
import { randomNode } from "./core/nodes/play.ts";
import { ArenaStore, buildReport, randomExecutor } from "./host/nodes/play.ts";
import { reconcileFanoutDrafts } from "./host/fanoutDrafts.ts";
import { TeamAssets } from "./host/teamAssets.ts";
import { TeamRuntime } from "./host/teamRuntime.ts";
import {
  checkDocument,
  documentSchema,
  flowspaceDomain,
  workflowTemplateSchema,
} from "./host/storage.ts";
import type {
  ArchiveTeamAssetRequest,
  BindRequest,
  ContextSnapshot,
  DraftRequest,
  DataPreview,
  DataPreviewRequest,
  EdgePayloadPreview,
  ExtendLoopRequest,
  FilePreviewRequest,
  FlowNode,
  FlowNotice,
  JsonObject,
  HumanAnswerRequest,
  TeamDependencies,
  TeamModel,
  FlowspaceDocument,
  FlowspaceRun,
  RunReport,
  FlowspaceSnapshot,
  JsonValue,
  GitActionRequest,
  GitDiffRequest,
  GitDiffResult,
  GitInspectRequest,
  GitRepoStatus,
  InspectEdgeRequest,
  LaunchPlan,
  LiveNodeState,
  NativeAgentMessage,
  NativeOperation,
  ReleaseRequest,
  RerunFailedRequest,
  RoleDefinition,
  RestoreSnapshotRequest,
  RunStep,
  RunCommand,
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
  SubagentBrief,
  TeamBlueprint,
  TeamModelRoute,
  TerminalScreenReadRequest,
  TerminalScreenSnapshot,
  WorkspaceBrief,
  WorkflowImportRequest,
  WorkflowImportResult,
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

declare module "@deepseek-ai/dsh-llm" {
  interface MessageSourceMap {
    /** Team roster and coordination rules for a FlowSpace team lead. */
    "flowspace-team": { kind: "flowspace-team" } & ContextFormed;
  }
}

/** Same shape as dsh-llm `createUserMessage`, without a runtime dependency on dsh-llm. */
function teamBriefMessage(text: string): UserMessage {
  return Object.freeze({
    id: randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "flowspace-team", form: "snapshot", sections: [{ name: "flowspace-team", text }] },
  }) as unknown as UserMessage;
}

interface PreparedReferenceEntry {
  snapshot: ContextSnapshot;
  edgeId: string;
  version: string;
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
    "llm",
    "tools",
    "subagents",
    "sessionProjections",
  ];
  private state = {
    doc: emptyDocument(),
    runs: [] as FlowspaceRun[],
    live: new Map<string, LiveNodeState>(),
    nativeMessages: new Map<string, NativeAgentMessage>(),
    nativeOperations: new Map<string, NativeOperation>(),
    notices: [] as FlowNotice[],
    subagents: new Map<string, SubagentBrief>(),
    listeners: new Set<() => void>(),
    turnOutput: new Map<string, string>(),
    canvasSessions: new Set<string>(),
    knownWorktrees: new Set<string>(),
    injectedSteps: new Set<string>(),
  };
  private domain!: Domain<typeof flowspaceDomain>;
  private teamAssets!: TeamAssets;
  private teams!: TeamRuntime;
  private teamBriefs = new Map<string, string>();
  private scheduler!: Scheduler;
  private containers!: ContainerStore;
  private variables!: VariableStore;
  private operations!: OperationService;
  private triggers!: TriggerService;
  private arena!: ArenaStore;
  private reportRequests = new Map<string, Promise<RunReport>>();
  private canvasToolRestrictions = new Map<string, () => void>();
  private runtime!: DshRuntime;
  private dataFileWatch!: DataFileWatch;
  private nodeExecutors = new Map<string, NodeExecutor>();
  private git = new HostGitService();
  private inputContexts = new Map<string, Promise<PreparedReferenceEntry[]>>();
  private deferredPersistTimer?: ReturnType<typeof setTimeout>;

  constructor(ctx: Context) {
    super(ctx, "flowspace");
  }

  registerNodeKind<C extends JsonObject>(descriptor: NodeDescriptor<C>, executor: NodeExecutor): () => void {
    return this.ctx.effect(() => {
      if (this.nodeExecutors.has(descriptor.flowType)) throw new Error(`节点执行器已注册：${descriptor.flowType}`);
      const unregister = descriptorOf(descriptor.flowType) === descriptor ? undefined : registerDescriptor(descriptor);
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
    this.teams = new TeamRuntime(this.ctx, this.domain, this.teamAssets, () => this.publish(),
      () => this.state?.doc.nodes ?? []);
    const storedDoc = sanitizeDocumentForWire(
      structuredClone(
        this.domain.table("documents").get("main") ?? emptyDocument(),
      ),
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

    checkDocument(storedDoc);
    validateTriggers(storedDoc);
    syncUntitledAgentTitles(storedDoc);
    this.state.doc = sanitizeDocumentForWire(storedDoc);
    for (const n of this.state.doc.nodes) {
      if (n.worktreePath) this.state.knownWorktrees.add(resolve(n.worktreePath));
    }
    this.state.runs = [...this.domain.table("runs").entries()]
      .map(([, r]) => structuredClone(r))
      .sort((a, b) => a.createdAt - b.createdAt);

    this.runtime = new DshRuntime(this.ctx,
      (id) => this.state.doc.nodes.find((n) => n.id === id),
      this.teams,
      this.nodeExecutors,
      this.domain.table("content_spills"),
      () => this.state.doc.settings.listLimit,
      async (path, cwd) => {
        const { full } = await this.workspaceFile({ path, cwd });
        const body = await readFile(full);
        if (body.includes(0)) throw new Error(`二进制文件不能作为文本输入：${path}`);
        return new TextDecoder().decode(body);
      },
    );
    const executors = judgeExecutors(this.ctx, this.runtime.contextText.bind(this.runtime));
    for (const descriptor of judges) this.registerNodeKind(descriptor, executors[descriptor.flowType]);
    const stepLimit = (step: RunStep) =>
      this.state.runs.find(run => run.steps.some(current => current.id === step.id))?.listLimit ??
      this.state.doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
    this.registerNodeKind(mergeSort, mergeExecutor(this.ctx, stepLimit));
    const transform = dataExecutor(this.ctx, stepLimit);
    for (const descriptor of dataDescriptors) this.registerNodeKind(descriptor, transform);
    this.variables = new VariableStore(this.domain.table("variables"), () => this.state.doc, () => this.state.runs, () => this.publish(), value => {
      const write = value.history.at(-1);
      if (!write) return;
      void this.scheduler.variableChanged(value.id, JSON.stringify({ name: value.name, version: value.version, value: value.value }),
        write.runId, write.stepId).catch(error => this.ctx.logger.warn("FlowSpace 变量事件：%s", error));
    });
    this.operations = new OperationService(this.ctx, this.git, () => this.state.doc, () => this.state.runs,
      cwd => this.resolveWorkspaceRoot(cwd), id =>
        [...this.state.live.values()].find(live => live.sessionId === id)?.effectiveCwd ??
        this.state.doc.nodes.find(node => node.sessionId === id)?.worktreePath ??
        this.state.doc.nodes.find(node => node.sessionId === id)?.cwd);
    this.registerNodeKind(gitExec, this.operations.execute);
    this.registerNodeKind(terminalExec, this.operations.execute);
    const draw = randomExecutor(this.domain.table("play_counters"));
    this.registerNodeKind(randomNode, (node, step, signal, options) =>
      this.scheduler.transact(() => draw(node, step, signal, options)));
    for (const descriptor of humanNodes) this.registerNodeKind(descriptor, humanExecutor(this.ctx));
    this.registerNodeKind(noticeNode, noticeExecutor(notice => {
      if (this.state.notices.some(entry => entry.id === notice.id)) return;
      this.state.notices = [...this.state.notices.slice(-39), notice];
      this.publish();
    }));
    this.registerNodeKind(assignmentNode, (node, step, signal, options) =>
      this.scheduler.transact(() => this.variables.assign(node, step, signal, options)));
    this.scheduler = new Scheduler(
      this.runtime,
      {
        document: () => this.state.doc,
        changed: () => this.persist(),
        deliver: async (run, edge, token) => {
          const source = await this.runtime.hydrateContent(token.source);
          const variable = this.state.doc.nodes.find(node => node.id === edge.target && node.flowType === variableNode.flowType);
          if (variable) await this.variables.deliver(variable, run, run.steps.find(step => step.id === token.stepId), edge.id, source);
          else await this.containers.deliver(run, edge, token, source);
        },
        variableReference: (run, step, node) => this.variables.reference(node, run, step),
        prepareStep: async (run, step, node) => {
          const { resolvedTask, config, variables } = this.variables.prepare(node, step.task, run, step);
          step.task = node.lanePersona ? `${node.lanePersona}\n\n${resolvedTask}` : resolvedTask;
          if (node.teamModel?.provider === "@available") node.teamModel = await this.availableModel(node.teamModel.model);
          if (variables.length) {
            step.variables = variables;
            step.resolvedConfig = config;
          }
          if (config?.provider === "@available") {
            const model = await this.availableModel(String(config.model ?? "0"));
            step.resolvedConfig = { ...config, ...model };
          }
        },
        toolsFor: (run, step) => this.operations.prefetch(run, step).length ? ["provide_flow_parameters"] : [],
        recordAccumulator: async (run, step, node, source) => {
          await this.variables.recordAccumulator(run, step, node, await this.runtime.hydrateContent(source));
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
          const n = this.state.doc.nodes.find((n) => n.id === id);
          if (n) {
            syncUntitledAgentNode(n);
            n.lastSubmittedTask = isContinuation ? task : n.task || task;
            if (!isContinuation && n.draft === task) n.draft = "";
          }
        },
      },
      this.state.runs,
    );
    this.containers = new ContainerStore(this.ctx, this.domain.table("container_changes"),
      () => this.state.doc, () => this.persist(), () => this.publish(), request => this.workspacePath(request));
    await this.containers.recover();
    this.triggers = new TriggerService(this.ctx, this.domain.table("triggers"), this.scheduler, this.git,
      () => this.state.doc, () => this.state.runs, () => this.publish(), request => this.workspacePath(request), () => [
        ...this.containers.changes().map(change => ({ key: change.id, at: change.at, nodeId: change.nodeId,
          columnId: change.after?.kind === "board" ? change.after.columnId : undefined })),
        ...this.variables.list().flatMap(variable => variable.history.map(write => ({
          key: write.id, at: write.at, nodeId: variable.id, columnId: undefined,
        }))),
      ].sort((a, b) => a.at - b.at));
    this.ctx.effect(() => this.triggers.start());
    registerFlowEmit(this.ctx, this.scheduler);
    registerContainerTools(this.ctx, this.containers, this.scheduler);
    this.variables.registerTools(this.ctx, this.scheduler);
    this.operations.registerTools(this.scheduler);
    this.ctx.effect(() => () => this.canvasToolRestrictions.forEach(dispose => dispose()));
    this.ctx.on("llm/stream", (options, next) => {
      const source = next();
      const id = options.sessionId;
      if (!id || !this.scheduler.observesOutput(id)) return source;
      const scheduler = this.scheduler;
      const logger = this.ctx.logger;
      return (async function* () {
        let buffered = "", sentAt = 0;
        const emit = () => {
          if (!buffered) return;
          const delta = buffered;
          buffered = "";
          sentAt = Date.now();
          void scheduler.nativeStatus(id, "output", delta).catch(error => logger.warn("FlowSpace 输出事件：%s", error));
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
    this.dataFileWatch = new DataFileWatch(this.ctx.fs, async (path, cwd, signal) => {
      const { base, full } = this.workspacePath({ path, cwd });
      const physical = await realpath(full).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
        return realpath(dirname(full));
      });
      if (!isSubPath(await realpath(base), physical)) throw new Error("文件路径超出当前工作区");
      return this.ctx.fs.resolve(full, { signal });
    }, ids => { void this.refreshDataFiles(ids).catch(error => this.ctx.logger.warn("FlowSpace 文件预览更新失败: %s", error)); });
    this.ctx.effect(() => () => this.dataFileWatch.dispose());
    await this.dataFileWatch.sync(this.state.doc);
    const fileIds = this.state.doc.nodes.filter(node => node.kind === "file").map(node => node.id);
    if (fileIds.length) await this.refreshDataFiles(fileIds);
    await this.hydrateBoundSessions().catch((e) =>
      this.ctx.logger.warn("FlowSpace session hydration: %s", e),
    );
    await this.teams.hydrate();
    this.syncTeams();

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
        ? Promise.resolve([] as PreparedReferenceEntry[])
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

    // Register with `{ prepend: true }` per design.md §4.3; commit `sentVersion` only after step admission (`enter`).
    this.ctx.on(
      "agent/pre-step",
      async (payload, next) => {
        const decision = await next();
        if (decision.kind !== "enter") return decision;
        const node = this.state.doc.nodes.find(node => node.sessionId === payload.agent.id);
        if (node?.canvasToolsOnly && !this.canvasToolRestrictions.has(payload.agent.id)) {
          const deny = this.ctx.tools.definitions().map(tool => tool.name)
            .filter(name => /^(bash|pwsh|terminal_)/.test(name));
          if (deny.length) this.canvasToolRestrictions.set(payload.agent.id, payload.agent.ctx.tools.restrict({ deny }));
        }
        const messages = await Promise.all(
          decision.messages.map(async (message) => {
            const id =
              message.source.kind === "user" && "rpcId" in message.source
                ? message.source.rpcId
                : message.id;
            const run = this.state.runs.find(run => run.steps.some(step => step.requestId === id));
            const step = run?.steps.find(step => step.requestId === id);
            const requests = run && step ? this.operations.prefetch(run, step) : [];
            if (requests.length) {
              const text = "回合结束后 FlowSpace 将执行以下操作。请用 provide_flow_parameters 提交所需参数，操作由 Host 执行。\n" +
                JSON.stringify(requests);
              message = { ...message, content: [...message.content, { type: "text", text }] };
            }
            const preparation = this.inputContexts.get(message.id);
            this.inputContexts.delete(message.id);

            // 1. Scheduler-owned step: inject `step.sources` once at step admission
            if (
              step &&
              step.sources.length > 0 &&
              !this.state.injectedSteps.has(step.id)
            ) {
              this.state.injectedSteps.add(step.id);
              const text = await this.runtime.contextText(
                step.sources,
                payload.agent.id,
              );
              return text
                ? {
                    ...message,
                    content: [
                      ...message.content,
                      { type: "text" as const, text },
                    ],
                  }
                : message;
            }

            // 2. Native / embedded chat prompt: resolve frozen reference preparation & flip capsules to `"sent"` now
            if (!preparation) return message;
            const entries = await preparation;
            if (!entries.length) return message;

            const sources = entries.map((e) => e.snapshot);
            for (const item of entries) {
              const liveEdge = this.state.doc.edges.find(
                (e) => e.id === item.edgeId,
              );
              if (liveEdge) {
                liveEdge.sentVersion = item.version;
                liveEdge.currentVersion = item.version;
              }
            }
            const text = await this.runtime.contextText(
              sources,
              payload.agent.id,
            );
            if (step) {
              step.sources.push(...sources);
            }
            await this.persist();
            return text
              ? {
                  ...message,
                  content: [
                    ...message.content,
                    { type: "text" as const, text },
                  ],
                }
              : message;
          }),
        );
        const sessionId = payload.agent.id;
        if (this.teams.isLead(sessionId) && messages.length) {
          const brief = await this.teams.brief(sessionId);
          // A source-attributed snapshot, like native time-context: the model reads
          // it, the conversation shows a collapsed context row instead of the
          // user's bubble, and it is only re-sent when the roster changes.
          if (brief && this.teamBriefs.get(sessionId) !== brief) {
            this.teamBriefs.set(sessionId, brief);
            messages.push(teamBriefMessage(brief) as (typeof messages)[number]);
          }
        }
        return { ...decision, messages };
      },
      { prepend: true },
    );

    this.ctx.on("agent/inbox/claimed", ({ agent, message, turn }) => {
      this.teams.claim(agent, turn, message.source.kind === "user");
      if (message.source.kind === "user")
        report(
          this.scheduler.claim(
            "rpcId" in message.source ? message.source.rpcId : message.id,
            turn,
            this.teams.reference(agent.id),
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

    // Live subagent lifecycle & dynamic session registration subscriptions
    const rawCtx = this.ctx as unknown as {
      on(event: string, listener: (...args: unknown[]) => void): () => void;
    };
    rawCtx.on("subagent/start", (rawInfo: unknown) => {
      const info = rawInfo as {
        id?: string;
        parentSessionId?: string;
      };
      if (!info?.id || !info?.parentSessionId) return;
      this.upsertSubagentBrief(info.id, info.parentSessionId, true);
    });
    rawCtx.on("subagent/end", (rawInfo: unknown) => {
      const info = rawInfo as {
        id?: string;
        parentSessionId?: string;
      };
      if (!info?.id) return;
      const existing = this.state.subagents.get(info.id);
      const parentId = info.parentSessionId ?? existing?.parentSessionId;
      if (parentId) {
        this.upsertSubagentBrief(info.id, parentId, false);
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
        this.upsertSubagentBrief(
          summary.sessionId,
          summary.parentSessionId,
          Boolean(summary.running),
        );
      }
    });

    this.ctx.on("session/event", (session, event) => {
      this.event(session.id, event, report, session.header);
    });

    this.ctx.effect(() => async () => {
      clearTimeout(this.deferredPersistTimer);
      await this.scheduler.dispose();
      this.state.listeners.forEach((fn) => fn());
      await this.domain.close();
    });
  }

  private upsertSubagentBrief(
    childSessionId: string,
    parentSessionId: string,
    running: boolean,
  ): void {
    const existing = this.state.subagents.get(childSessionId);
    this.state.subagents.set(childSessionId, {
      sessionId: childSessionId,
      parentSessionId,
      title: existing?.title ?? childSessionId.slice(0, 8),
      running,
      updatedAt: Date.now(),
    });
    this.publish();
    void this.ctx.sessionQuery
      .readTitleSnapshots([childSessionId as SessionId])
      .then((titles) => {
        const resolvedTitle =
          titles[0]?.status === "fulfilled"
            ? titles[0].value.title?.title
            : undefined;
        if (resolvedTitle) {
          const cur = this.state.subagents.get(childSessionId);
          if (cur && cur.title !== resolvedTitle) {
            this.state.subagents.set(childSessionId, {
              ...cur,
              title: resolvedTitle,
            });
            this.publish();
          }
        }
      })
      .catch(() => {});
  }

  private schedulePersist(): void {
    clearTimeout(this.deferredPersistTimer);
    this.deferredPersistTimer = setTimeout(() => {
      void this.persist().catch((e) =>
        this.ctx.logger.warn("FlowSpace deferred persist: %s", e),
      );
    }, 350);
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
          row as unknown as {
            parentSessionId?: string;
            creatorSessionId?: string;
          }
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

    for (const sub of subRows) {
      try {
        using subObs = await this.ctx.sessionQuery.observeSession(
          sub.sessionId,
          { projectionMode: "none" },
        );
        for (const ev of subObs.events) {
          this.recordNativeMessage(sub.sessionId, ev);
        }
      } catch {
        /* Subagent log may be unavailable */
      }
    }

    for (const node of this.state.doc.nodes) {
      if (node.kind !== "agent" || !node.sessionId) continue;
      try {
        using obs = await this.ctx.sessionQuery.observeSession(
          node.sessionId as SessionId,
          { projectionMode: "none" },
        );
        const lastAssistant =
          obs.events.findLast(
            (e) =>
              e.type === "assistant/message" &&
              !e.data.interrupted &&
              plainText(e.data.message.content).trim().length > 0,
          ) ??
          obs.events.findLast(
            (e) => e.type === "assistant/message" && !e.data.interrupted,
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
        const effectiveCwd =
          lastWorkdir?.data?.cwd ?? node.worktreePath ?? node.cwd;
        if (effectiveCwd) {
          this.state.knownWorktrees.add(resolve(effectiveCwd));
        }
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
          effectiveCwd,
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
      senderId?: string;
      senderName?: string;
      summary?: string;
    };
    const senderSessionId = src.senderSessionId ?? src.senderId;
    if (
      (src.kind === "agent-message" ||
        src.kind === "subagent-settled" ||
        src.kind === "team-message") &&
      typeof senderSessionId === "string" &&
      senderSessionId.length > 0
    ) {
      const msgId = `${sessionId}:${event.seq}`;
      if (this.state.nativeMessages.has(msgId)) return false;
      const bodyText =
        plainText(event.data.content).trim() ||
        src.summary ||
        (src.senderName ? `From ${src.senderName}` : "");
      this.state.nativeMessages.set(msgId, {
        id: msgId,
        fromSessionId: senderSessionId,
        toSessionId: sessionId,
        kind: src.kind,
        text: bodyText,
        summary: src.summary ?? src.senderName,
        seq: event.seq,
        time: event.time,
      });
      if (src.kind === "subagent-settled") {
        const existingSub = this.state.subagents.get(senderSessionId);
        this.state.subagents.set(senderSessionId, {
          sessionId: senderSessionId,
          parentSessionId: existingSub?.parentSessionId ?? sessionId,
          title: existingSub?.title ?? senderSessionId.slice(0, 8),
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
    header?: { origin?: string; cwd?: string; parentSession?: string },
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
      } else if (header.parentSession) {
        this.upsertSubagentBrief(sessionId, header.parentSession, true);
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

    if (evAny.type === "tool/call" && evAny.data) {
      const name = String(evAny.data.name ?? "");
      report(this.scheduler.nativeStatus(sessionId, "tool", name, event.seq));
      if (/^(bash|pwsh|terminal_(?:exec|send))$/.test(name)) {
        const raw = evAny.data.args ?? evAny.data.arguments;
        let args: unknown = raw;
        if (typeof raw === "string") {
          try { args = JSON.parse(raw); } catch { args = undefined; }
        }
        if (args && typeof args === "object") {
          const command = ["command", "text", "code"].flatMap(key =>
            typeof (args as Record<string, unknown>)[key] === "string" ? [String((args as Record<string, unknown>)[key])] : [])[0];
          if (command) {
            const kind = /^\s*git(?:\.exe)?\s/i.test(command) ? "git" : "terminal";
            const cwd = this.state.live.get(node.id)?.effectiveCwd ?? node.worktreePath ?? node.cwd;
            const key = `${node.id}:${kind}`;
            const old = this.state.nativeOperations.get(key);
            if (!old || old.seq < event.seq) {
              this.state.nativeOperations.set(key, { nodeId: node.id, kind, command: command.slice(0, 256), cwd,
                at: event.time, seq: event.seq });
              this.publish();
            }
          }
        }
      }
    }

    if (evAny.type === "working-directory/change" && evAny.data?.cwd) {
      const nextCwd = String(evAny.data.cwd);
      this.state.knownWorktrees.add(resolve(nextCwd));
      const old = this.state.live.get(node.id);
      this.state.live.set(node.id, {
        nodeId: node.id,
        sessionId,
        running: old?.running ?? false,
        output: old?.output ?? "",
        seq: event.seq,
        pendingInput: old?.pendingInput ?? [],
        updatedAt: event.time,
        effectiveCwd: nextCwd,
        changesTurns: old?.changesTurns,
      });
      this.publish();
    }

    if (evAny.type === "step/start" && evAny.data) {
      const turn = Number(evAny.data.turn ?? 0);
      if (this.scheduler.recordTelemetry(sessionId, turn, { addStep: true })) {
        this.publish();
      }
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
        let docMutated = false;
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
            docMutated = true;
          }
        }
        this.publish();
        if (docMutated) this.schedulePersist();
      }
    }

    if (event.type === "assistant/message") {
      const text = plainText(event.data.message.content);
      const usage = event.data.usage;
      if (usage) {
        this.scheduler.recordTelemetry(sessionId, event.data.turn, {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });
        report(this.scheduler.nativeStatus(sessionId, "usage", JSON.stringify(usage), event.seq));
      }
      // Preserve earlier non-empty assistant conclusion in multi-step turns when a final tool/usage step emits empty text
      if (!event.data.interrupted && text.trim().length > 0) {
        this.state.turnOutput.set(sessionId, text);
      } else if (!this.state.turnOutput.has(sessionId) && text.length > 0) {
        this.state.turnOutput.set(sessionId, text);
      }
      const effectiveOutput =
        text.trim().length > 0
          ? text
          : (this.state.turnOutput.get(sessionId) ?? text);
      const old = this.state.live.get(node.id);
      this.state.live.set(node.id, {
        nodeId: node.id,
        sessionId,
        running: old?.running ?? true,
        output: effectiveOutput,
        seq: event.seq,
        pendingInput: [],
        updatedAt: event.time,
        effectiveCwd: old?.effectiveCwd,
        changesTurns: old?.changesTurns,
      });
      let displayMutated = false;
      if (!event.data.interrupted && effectiveOutput.trim().length > 0) {
        for (const display of this.state.doc.nodes.filter(
          (n) =>
            ((n.kind === "display" && !n.fixed) ||
              (n.kind === "detail" && !n.pinned)) &&
            n.sourceNodeId === node.id,
        )) {
          display.text = effectiveOutput;
          display.sourceSeq = event.seq;
          displayMutated = true;
        }
      }
      this.publish();
      if (displayMutated) this.schedulePersist();
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
          this.teams.isFollowup(sessionId, event.data.turn),
        ),
      );
  }

  private publish(): void {
    this.state.listeners.forEach((fn) => fn());
  }

  private computeSourceVersions(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const n of this.state.doc.nodes) {
      if (n.flowType === variableNode.flowType) {
        out[n.id] = `${n.id}:${this.variables.read(n, {}).version}`;
        continue;
      }
      if (n.flowType === "flowspace/constant") {
        out[n.id] = `${n.id}:${shortHash(JSON.stringify(n.config))}`;
        continue;
      }
      if (n.kind === "agent") {
        const live = this.state.live.get(n.id);
        if (n.sessionId && live && live.seq >= 0) {
          out[n.id] = `${n.sessionId}:${live.seq}`;
        }
        continue;
      }
      if (n.kind === "file") {
        const baseCwd = this.resolveWorkspaceRoot(n.worktreePath ?? n.cwd);
        out[n.id] = `${n.id}:${computeFileNodeFingerprint(n, baseCwd)}`;
        continue;
      }
      if (n.kind === "board") {
        out[n.id] = `${n.id}:${shortHash(resolveBoardReference(n).text)}`;
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

  private referenceVersion(
    edge: FlowspaceDocument["edges"][number],
    source: FlowNode | undefined,
    sourceVersions: Record<string, string>,
  ): string | undefined {
    if (edge.snapshotContent) return `${edge.source}:${shortHash(JSON.stringify(edge.snapshotContent))}`;
    if (source?.kind === "board" && (edge.sourceItemKey !== undefined || !edge.snapshotText)) {
      if (edge.sourceItemKey === undefined && sourceVersions[source.id]) return sourceVersions[source.id];
      return `${source.id}:${shortHash(resolveBoardReference(source, edge.sourceItemKey).text)}`;
    }
    return edge.snapshotText
      ? `${edge.source}:${shortHash(edge.snapshotText)}`
      : sourceVersions[edge.source] ?? edge.currentVersion;
  }

  private syncLiveReferenceVersions(
    doc: FlowspaceDocument,
    sourceVersions = this.computeSourceVersions(),
  ): Record<string, string> {
    const nodes = new Map(doc.nodes.map((node) => [node.id, node]));
    for (const edge of doc.edges) {
      if (edge.kind === "reference") {
        edge.currentVersion = this.referenceVersion(edge, nodes.get(edge.source), sourceVersions);
      }
    }
    return sourceVersions;
  }

  private async prepareReferences(
    sessionId: string,
  ): Promise<PreparedReferenceEntry[]> {
    const node = this.state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node) return [];
    const entries: PreparedReferenceEntry[] = [];
    for (const edge of this.state.doc.edges.filter(
      (e) =>
        e.target === node.id && (e.kind === "reference" || e.trigger === "off"),
    )) {
      const source = this.state.doc.nodes.find((n) => n.id === edge.source);
      if (!source) continue;
      const captured =
        source.flowType === variableNode.flowType ? this.variables.reference(source) :
        source.kind === "agent"
          ? await this.runtime.capture(source, edge.mode)
          : await this.runtime.reference(source, edge);
      if (captured.referenceKind === "board-card" && captured.missing) continue;
      const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
      edge.currentVersion = version;
      if (
        edge.kind === "reference" &&
        !edge.always &&
        edge.sentVersion === version
      )
        continue;
      // Do NOT mutate `edge.sentVersion` here; wait until `agent/pre-step` confirms `decision.kind === "enter"`.
      entries.push({ snapshot: captured, edgeId: edge.id, version });
    }
    if (
      new Set(
        entries
          .filter((e) => e.snapshot.kind === "session")
          .map((e) => e.snapshot.sourceSessionId),
      ).size > 3
    )
      throw new Error("一次会话引用最多包含三个来源");
    return entries;
  }

  private async persist(): Promise<void> {
    clearTimeout(this.deferredPersistTimer);
    this.syncLiveReferenceVersions(this.state.doc);
    const cleanDoc = sanitizeDocumentForWire(this.state.doc);
    this.state.doc = cleanDoc;
    await this.domain
      .table("documents")
      .put("main", structuredClone(cleanDoc));

    const retainedTemplates = new Set(
      (cleanDoc.templates ?? []).map((t) => t.id),
    );
    for (const id of this.domain.table("templates").keys())
      if (!retainedTemplates.has(id))
        await this.domain.table("templates").delete(id);
    for (const tpl of cleanDoc.templates ?? [])
      await this.domain.table("templates").put(tpl.id, structuredClone(tpl));

    const retainedSnapshots = new Set(
      (cleanDoc.snapshots ?? []).map((s) => s.id),
    );
    for (const id of this.domain.table("snapshots").keys())
      if (!retainedSnapshots.has(id))
        await this.domain.table("snapshots").delete(id);
    for (const snap of cleanDoc.snapshots ?? [])
      await this.domain.table("snapshots").put(snap.id, structuredClone(snap));

    const retainedRuns = new Set(this.state.runs.map((r) => r.id));
    for (const id of this.domain.table("runs").keys())
      if (!retainedRuns.has(id)) await this.domain.table("runs").delete(id);
    for (const run of this.state.runs) {
      await this.domain.table("runs").put(run.id, structuredClone(run));
      await this.arena.settle(run);
    }
    this.publish();
  }

  @Remote
  snapshot(): FlowspaceSnapshot {
    const sourceVersions = this.computeSourceVersions();
    const docCopy = sanitizeDocumentForWire(this.state.doc);
    this.syncLiveReferenceVersions(docCopy, sourceVersions);
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
  async archiveRole(request: ArchiveTeamAssetRequest): Promise<RoleDefinition> {
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

  private async availableModel(index: string): Promise<TeamModel> {
    const models = await this.teamAssets.listModelRoutes();
    const fixtures = models.filter(model => model.provider === "flowspace-test");
    const routes = fixtures.length ? fixtures : models;
    if (!routes.length) throw new Error("请先配置可用的模型");
    const { provider, model } = routes[(Number(index) || 0) % routes.length];
    return { provider, model };
  }

  @Remote
  async save(document: FlowspaceDocument): Promise<FlowspaceDocument> {
    return this.scheduler.transact(() =>
      this.saveDocument(documentSchema.parse(sanitizeDocumentForWire(document))),
    );
  }

  private async saveDocument(next: FlowspaceDocument, portable = false, importedAssets?: TeamDependencies): Promise<FlowspaceDocument> {
    const previous = this.state.doc;
    if (!portable && next.id === previous.id)
      next = rebaseContainerChanges(next, this.containers.changes());
    next.containerRevision = previous.containerRevision;
    if (!portable) next = mergePendingGeneration(next, previous);
    next.generationRevision = previous.generationRevision;
    const previousNodes = new Map(this.state.doc.nodes.map((node) => [node.id, node]));
    const previousEdges = new Map(this.state.doc.edges.map((edge) => [edge.id, edge]));
    for (const node of next.nodes) {
      const prior = previousNodes.get(node.id);
      const old = portable && prior?.teamRef?.teamId !== node.teamRef?.teamId ? undefined : prior;
      if (old?.sessionId) {
        node.sessionId = old.sessionId;
        node.teamRef = old.teamRef;
        if (node.teamRef) delete node.teamConfig;
        node.cwd = old.cwd;
        node.workspaceId = old.workspaceId;
        node.branch = old.branch;
        node.worktreePath = old.worktreePath;
      }
      if (node.sessionId && this.teams.isLead(node.sessionId) && !this.teams.ownsNode(node.sessionId, node.id))
        throw new Error("团队主管会话必须由对应的画布团队节点创建");
      if (old) node.lastSubmittedTask = old.lastSubmittedTask;
      syncUntitledAgentNode(node);
      if (node.worktreePath) this.state.knownWorktrees.add(resolve(node.worktreePath));
      if (node.kind === "agent" && node.sessionId && old && old.planMode !== node.planMode) {
        void this.runtime.ensure(node).catch(() => {});
      }
    }
    for (const edge of next.edges) {
      const old = previousEdges.get(edge.id);
      if (old?.originMode === "fork") {
        edge.originMode = "fork";
        edge.mode = old.mode;
      }
      if (old && edge.sentVersion === undefined && old.sentVersion) {
        edge.sentVersion = old.sentVersion;
      } else if (edge.sentVersion === "") {
        delete edge.sentVersion;
      }
    }
    const byId = new Map(next.nodes.map((node) => [node.id, node]));
    for (const edge of next.edges) {
      const source = byId.get(edge.source);
      if (source?.flowType === "flowspace/merge-sort" && edge.kind === "continuation")
        edge.sourcePort = mergeResultPort(source.config, edge.sourcePort);
    }
    for (const node of next.nodes) {
      const merge = node.fanout && byId.get(node.fanout.mergeId);
      if (merge) for (const port of node.ports ?? []) {
        if (port.direction === "out" && port.kind === "continuation" && port.nodes.includes(merge.id))
          port.portId = mergeResultPort(merge.config, port.portId);
      }
      // Deleting a team releases the role nodes wired into it; any other bad target is rejected below.
      if (node.staffOf !== undefined && !byId.has(node.staffOf)) delete node.staffOf;
    }
    checkDocument(next);
    validateTriggers(next);
    await reconcileFanoutDrafts(next, portable ? emptyDocument() : previous, this.state.runs,
      fanId => resolveStaticFanout(this.ctx, this.runtime, next, fanId));
    if (importedAssets) await this.teamAssets.addImported(importedAssets);
    this.state.doc = sanitizeDocumentForWire(next);
    for (const [id, dispose] of this.canvasToolRestrictions) {
      if (next.nodes.some(node => node.sessionId === id && node.canvasToolsOnly)) continue;
      dispose();
      this.canvasToolRestrictions.delete(id);
    }
    await this.persist();
    await this.dataFileWatch.sync(next);
    await this.renameLaneSessions(previous, next);
    this.syncTeams();
    return structuredClone(this.state.doc);
  }

  @Remote
  async revertContainerChange(id: string): Promise<void> {
    await this.scheduler.transact(async () => {
      await this.containers.revert(id);
      this.publish();
    });
  }

  @Remote
  async writeVariable(request: { id: string; runId?: string; lane?: string; expectedVersion: number; value?: JsonValue }): Promise<void> {
    await this.scheduler.transact(() => this.variables.manualWrite(request));
  }

  @Remote
  async launchTrigger(request: { nodeId: string; values?: JsonObject }): Promise<FlowspaceRun> {
    return this.triggers.launch(request.nodeId, request.values ?? {});
  }

  @Remote
  debugStep(request: { runId: string; stepId: string; action: "continue" | "step" | "skip"; task?: string }): Promise<void> {
    return this.scheduler.debugStep(request.runId, request.stepId, request.action, request.task);
  }

  @Remote
  async generateReport(request: { runId: string; model: TeamModel }): Promise<RunReport> {
    const run = this.state.runs.find(run => run.id === request.runId);
    if (!run || !["completed", "cancelled", "error", "interrupted"].includes(run.state)) throw new Error("运行结束后才能生成战报");
    if (run.report) return run.report;
    const existing = this.reportRequests.get(run.id);
    if (existing) return existing;
    const job = buildReport(this.ctx, structuredClone(run), request.model).then(report => this.scheduler.transact(async () => {
      run.report = report;
      await this.persist();
      return report;
    })).finally(() => this.reportRequests.delete(run.id));
    this.reportRequests.set(run.id, job);
    return job;
  }

  private refreshDataFiles(ids: string[]): Promise<void> {
    return this.scheduler.transact(async () => {
      const previous = this.state.doc;
      const next = structuredClone(previous);
      const changed = await reconcileFanoutDrafts(next, previous, this.state.runs,
        fanId => resolveStaticFanout(this.ctx, this.runtime, next, fanId), ids);
      if (changed) {
        stampGeneratedBatch(next, new Set(previous.nodes.map(node => node.id)), new Set(previous.edges.map(edge => edge.id)));
        this.state.doc = next;
        await this.persist();
        await this.renameLaneSessions(previous, next);
      } else this.publish();
    });
  }

  private async renameLaneSessions(previous: FlowspaceDocument, next: FlowspaceDocument) {
    const previousNodes = new Map(previous.nodes.map(node => [node.id, node]));
    const laneGroups = (nodes: FlowNode[]) => new Map(nodes.flatMap(node => node.fanout ? [[node.fanout.fanId, node] as const] : []));
    const priorGroups = laneGroups(previous.nodes), groups = laneGroups(next.nodes);
    for (const lane of next.nodes) {
      if (!lane.generatedBy || !lane.sessionId) continue;
      const prior = previousNodes.get(lane.id);
      const title = laneTitle(groups.get(lane.generatedBy), lane);
      if (!title || (prior && prior.sessionId === lane.sessionId && title === laneTitle(priorGroups.get(lane.generatedBy), prior))) continue;
      await this.ctx.sessionController.rename({ sessionId: lane.sessionId as SessionId, title }).catch(error =>
        this.ctx.logger.warn("FlowSpace 泳道会话重命名失败: %s", error));
    }
  }

  /**
   * Upgrades agents that gained role nodes to team leads and releases canvas
   * teams that lost them. A roster that does not validate yet (a role without a
   * model) waits; running the node reports the error.
   */
  private syncTeams() {
    const staffed = staffedIds(this.state.doc.nodes);
    for (const node of this.state.doc.nodes) {
      if (node.kind !== "agent" || !node.sessionId) continue;
      if (isTeamNode(node, staffed) !== this.teams.isLead(node.sessionId))
        void this.teams.sync(node.id).catch(() => {});
    }
  }

  @Remote
  async importWorkflow(request: WorkflowImportRequest): Promise<WorkflowImportResult> {
    return this.scheduler.transact(async () => {
      if (!!request.document === !!request.template) throw new Error("Choose one canvas or workflow template to import.");
      const template = request.template && workflowTemplateSchema.parse(request.template);
      const next = request.document
        ? documentSchema.parse(sanitizeDocumentForWire(request.document))
        : structuredClone(this.state.doc);
      if (template) {
        if (next.templates?.some((existing) => existing.id === template.id)) template.id = uid();
        delete template.builtin;
        next.templates = [...(next.templates ?? []), template];
      }
      const nodes = template?.nodes ?? workflowNodes(next);
      if (!request.enableTriggers) for (const node of nodes)
        if (node.flowType === triggerNode.flowType) node.config = { ...node.config, enabled: false };
      const refs = new Set(nodes.flatMap((node) => node.teamRef ? [node.teamRef.teamId] : []));
      const plan = await this.teamAssets.prepareImport(request, refs);
      if (plan.missing.length) return { kind: "missing-models", models: plan.missing };
      const staffed = staffedIds(nodes);
      for (const node of nodes) {
        if (node.roleRef) node.roleRef = plan.roleIds.get(node.roleRef) ?? node.roleRef;
        if (!isTeamNode(node, staffed)) continue;
        if (node.teamRef) node.teamRef.teamId = plan.teamIds.get(node.teamRef.teamId) ?? node.teamRef.teamId;
        delete node.sessionId;
        delete node.lastSubmittedTask;
      }
      return { kind: "imported", document: await this.saveDocument(next, !!request.document, plan.additions) };
    });
  }

  @Remote
  async draft(request: DraftRequest): Promise<void> {
    const node = this.node(request.nodeId);
    node.draft = request.draft;
    syncUntitledAgentNode(node);
    const cleanDoc = sanitizeDocumentForWire(this.state.doc);
    this.state.doc = cleanDoc;
    await this.domain
      .table("documents")
      .put("main", structuredClone(cleanDoc));
    this.publish();
  }

  @Remote
  plan(request: StartRequest): LaunchPlan {
    this.syncLiveReferenceVersions(this.state.doc);
    return this.scheduler.plan(request);
  }

  @Remote
  start(request: StartRequest): Promise<FlowspaceRun> {
    this.syncLiveReferenceVersions(this.state.doc);
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
    return this.scheduler.answerHuman(request.runId, request.stepId, request.option, request.values);
  }

  @Remote
  remindEmission(request: { runId: string; stepId: string }): Promise<void> {
    return this.scheduler.remindEmission(request.runId, request.stepId);
  }

  @Remote
  previewData(request: DataPreviewRequest, signal: AbortSignal): Promise<DataPreview> {
    return previewDataNode(this.ctx, this.runtime, this.state.doc, this.state.runs, request, signal ?? new AbortController().signal);
  }

  @Remote
  release(request: ReleaseRequest): Promise<void> {
    return this.scheduler.release(
      request.runId,
      request.tokenId,
      request.accept,
    );
  }

  /** Atomic snapshot restore (`R10`): safely stops active runs before restoring document state. */
  @Remote
  async restoreSnapshot(
    request: RestoreSnapshotRequest,
  ): Promise<FlowspaceDocument> {
    return this.scheduler.transact(async () => {
      const snap = (this.state.doc.snapshots ?? []).find(
        (s) => s.id === request.snapshotId,
      );
      if (!snap) throw new Error("状态快照不存在");

      await this.scheduler.interruptAllActive(
        `已恢复工作状态快照「${snap.title}」，原在途调度已安全中断`,
      );

      const liveNodes = this.state.doc.nodes;
      const restoredNodes = structuredClone(snap.nodes).map((n) => {
        const cur = liveNodes.find((x) => x.id === n.id);
        return cur?.sessionId && cur.teamRef?.teamId === n.teamRef?.teamId
          ? {
              ...n,
              sessionId: cur.sessionId,
              cwd: cur.cwd,
              workspaceId: cur.workspaceId,
              branch: cur.branch,
              worktreePath: cur.worktreePath,
              lastSubmittedTask: cur.lastSubmittedTask,
            }
          : n;
      });

      const nextDoc: FlowspaceDocument = sanitizeDocumentForWire({
        ...this.state.doc,
        nodes: restoredNodes,
        edges: structuredClone(snap.edges),
        viewport: structuredClone(snap.viewport),
      });
      checkDocument(nextDoc);
      this.state.doc = nextDoc;
      await this.persist();
      await this.dataFileWatch.sync(nextDoc);
      this.syncTeams();
      return structuredClone(this.state.doc);
    });
  }

  /** Read-only Glass-Box X-Ray wire & capsule payload inspector (zero mutation to `sentVersion`). */
  @Remote
  async inspectEdgePayload(
    request: InspectEdgeRequest,
  ): Promise<EdgePayloadPreview> {
    const run = request.runId
      ? this.state.runs.find((r) => r.id === request.runId)
      : [...this.state.runs]
          .reverse()
          .find((r) => r.tokens.some((t) => t.edgeId === request.edgeId));

    const edge =
      this.state.doc.edges.find((e) => e.id === request.edgeId) ??
      run?.graph.edges.find((e) => e.id === request.edgeId);
    if (!edge) throw new Error("连线不存在");

    const source =
      this.state.doc.nodes.find((n) => n.id === edge.source) ??
      run?.graph.nodes.find((n) => n.id === edge.source);
    const target =
      this.state.doc.nodes.find((n) => n.id === edge.target) ??
      run?.graph.nodes.find((n) => n.id === edge.target);
    if (!source || !target) throw new Error("连线端点不存在");

    const sourceVersions = this.computeSourceVersions();
    let freshness: EdgePayloadPreview["freshness"] = "live";
    if (edge.kind === "reference") {
      if (edge.always) {
        freshness = "always";
      } else if (!edge.sentVersion) {
        freshness = "pending";
      } else {
        const currentVer = this.referenceVersion(edge, source, sourceVersions);
        freshness =
          currentVer && currentVer !== edge.sentVersion ? "updated" : "sent";
      }
    }

    const runToken = run?.tokens.findLast(token => token.edgeId === edge.id &&
      (request.runId !== undefined || (!token.skip && token.source.content !== undefined)));

    let content = "";
    let structured = runToken?.source.content ?? edge.snapshotContent;
    let sessionId: string | undefined;
    let seq: number | undefined;
    let totalDiskBytes = 0;

    if (runToken) {
      content = runToken.source.text;
      sessionId = runToken.source.sourceSessionId;
      seq = runToken.source.seq;
    } else if (source.kind === "agent") {
      sessionId = source.sessionId;
      if (source.sessionId) {
        if (edge.mode === "fork") {
          try {
            using obs = await this.ctx.sessionQuery.observeSession(
              source.sessionId as SessionId,
              { projectionMode: "none" },
            );
            const completedTurns = obs.events.filter(
              (e) =>
                e.type === "turn/end" && e.data.reason.kind === "completed",
            );
            const lastEnd = completedTurns.at(-1);
            seq = lastEnd?.seq ?? obs.cursor;
            const latestSnap = await this.runtime
              .capture(source, "conclusion", seq)
              .catch(() => null);
            content =
              `[Fork 完整历史分支 · ${completedTurns.length} 个已完成回合 · 截至事件 #${seq}]\n\n` +
              (latestSnap?.text || "(暂无助手文本输出)");
          } catch {
            content = "(会话历史暂不可读)";
          }
        } else {
          try {
            const cap = await this.runtime.capture(source, edge.mode);
            content = cap.text;
            seq = cap.seq;
          } catch {
            content = source.draft || source.task || "(会话暂无输出)";
          }
        }
      } else {
        content =
          source.draft.trim() ||
          source.task.trim() ||
          "(尚未启动草稿 — 启动运行后将在此传递输出)";
      }
    } else if (source.kind === "file" && !edge.snapshotText && !edge.snapshotContent) {
      const cap = await this.runtime.reference(source, edge);
      structured = cap.content;
      const paths = extractFileNodePaths(source);
      const baseCwd = this.resolveWorkspaceRoot(
        source.worktreePath ?? source.cwd,
      );
      const previews: string[] = [cap.text];
      for (const p of paths.slice(0, 4)) {
        try {
          const full = resolve(baseCwd, p);
          const rel = relative(baseCwd, full);
          if (rel.startsWith("..") || isAbsolute(rel)) continue;
          const st = statSync(full);
          if (st.isFile()) {
            totalDiskBytes += st.size;
            const preview = await this.readWorkspaceFile({
              path: p,
              cwd: baseCwd,
            });
            previews.push(
              `\n--- ${preview.path} (${st.size} bytes) ---\n${preview.content.slice(0, 4000)}${preview.truncated || preview.content.length > 4000 ? "\n…[预览已截断]" : ""}`,
            );
          }
        } catch {
          /* Missing file already reported in `cap.text` */
        }
      }
      content = previews.join("\n");
    } else {
      const cap = await this.runtime.reference(source, edge);
      structured = cap.content;
      content = cap.text;
      sessionId = cap.sourceSessionId;
      seq = cap.seq;
    }

    const byteLength = Math.max(
      totalDiskBytes,
      Buffer.byteLength(content, "utf8"),
    );
    const firstLine =
      content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find(Boolean) ?? "";
    const summary =
      firstLine.length > 100
        ? `${firstLine.slice(0, 100)}…`
        : firstLine || `${source.title} → ${target.title}`;
    const itemCount = structured?.items?.length ??
      (structured?.dataType === "file" && Array.isArray(structured.value) ? structured.value.length : undefined);

    return {
      edgeId: edge.id,
      kind: edge.kind,
      mode: edge.kind === "reference" ? source.kind : edge.mode,
      sourceTitle: source.kind === "board" ? runToken?.source.title ?? referenceTitle(source, edge) : source.title,
      targetTitle: target.title,
      ...(sessionId ? { sessionId } : {}),
      ...(seq !== undefined ? { seq } : {}),
      byteLength,
      ...(itemCount !== undefined ? { itemCount, originalCount: structured?.originalCount } : {}),
      willSpill: byteLength > 65536,
      freshness,
      summary,
      content,
    };
  }

  @Remote
  async bind(request: BindRequest): Promise<FlowNode> {
    return this.scheduler.transact(async () => {
      const node = this.node(request.nodeId);
      if (node.sessionId) return structuredClone(sanitizeDocumentForWire(this.state.doc).nodes.find((n) => n.id === node.id)!);
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
      if (node.worktreePath) {
        this.state.knownWorktrees.add(resolve(node.worktreePath));
      }
      if (request.sessionId) {
        if (node.teamRef || this.teams.isLead(request.sessionId))
          throw new Error("团队主管会话必须由对应的画布团队节点创建");
        using observation = await this.ctx.sessionQuery.observeSession(
          request.sessionId as SessionId,
        );
        node.sessionId = request.sessionId;
        node.cwd = observation.header.cwd;
        for (const ev of observation.events) {
          this.recordNativeMessage(request.sessionId, ev);
        }
      } else node.sessionId = await this.runtime.ensure(node);
      syncUntitledAgentNode(node);
      if (node.continuationPrompt === undefined && node.task.trim()) {
        node.continuationPrompt = node.task;
      }
      await this.persist();
      if (request.sessionId) this.syncTeams();
      return structuredClone(
        this.state.doc.nodes.find((n) => n.id === node.id)!,
      );
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
    return structuredClone(node);
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
        if (status?.topLevel && sameFsPath(status.topLevel, w.path)) {
          for (const wt of status.worktrees) {
            if (wt.path && !wt.isMain) {
              this.state.knownWorktrees.add(resolve(wt.path));
            }
          }
        }
        return {
          id: w.id,
          name: w.title,
          path: w.path,
          isGitRepo: Boolean(
            status?.isGitRepo && sameFsPath(status.topLevel, w.path),
          ),
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
    const status = await this.git.inspect(base);
    if (status.topLevel && sameFsPath(status.topLevel, base)) {
      for (const wt of status.worktrees) {
        if (wt.path && !wt.isMain) {
          this.state.knownWorktrees.add(resolve(wt.path));
        }
      }
    }
    return status;
  }

  @Remote
  async gitDiff(request: GitDiffRequest): Promise<GitDiffResult> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    return this.git.diff(base, request);
  }

  @Remote
  async gitAction(request: GitActionRequest): Promise<GitRepoStatus> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const status = await this.git.act(base, request);
    if (status.topLevel && sameFsPath(status.topLevel, base)) {
      for (const wt of status.worktrees) {
        if (wt.path && !wt.isMain) {
          this.state.knownWorktrees.add(resolve(wt.path));
        }
      }
    }
    return status;
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
      const diff = await wc
        .diff(sid, request.seq, i, signal)
        .catch(() => undefined);
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
  sessionTerminals(request: SessionTerminalsRequest): SessionTerminalBrief[] {
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
      if (depth > 3 || out.length >= 80) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (out.length >= 80) break;
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

  private workspacePath(request: FilePreviewRequest) {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const raw = request.path.trim();
    if (!raw) throw new Error("未指定文件路径");
    const full = resolve(base, raw);
    const rel = relative(base, full);
    if (rel.startsWith("..") || isAbsolute(rel))
      throw new Error("文件路径超出当前工作区");
    return { base, raw, full, rel };
  }

  private async workspaceFile(request: FilePreviewRequest) {
    const { base, raw, full, rel } = this.workspacePath(request);
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) throw new Error(`文件不存在：${raw}`);
    if (!isSubPath(await realpath(base), await realpath(full))) throw new Error("文件路径超出当前工作区");
    return { full, rel, info, raw };
  }

  /** Bounded viewer. A transform reads the complete selected text and spills its frozen input. */
  @Remote
  async readWorkspaceFile(request: FilePreviewRequest): Promise<WorkspaceFilePreview> {
    const { full, rel, info, raw } = await this.workspaceFile(request);
    const maxReadBytes = 65536;
    const maxChars = 24000;
    const toRead = Math.min(info.size, maxReadBytes);
    if (toRead === 0) {
      return {
        path: rel.replaceAll("\\", "/"),
        content: "",
        truncated: false,
      };
    }

    const fh = await open(full, "r");
    try {
      const buf = Buffer.allocUnsafe(toRead);
      const { bytesRead } = await fh.read(buf, 0, toRead, 0);
      const slice = buf.subarray(0, bytesRead);
      if (slice.includes(0)) {
        throw new Error(`二进制文件不支持文本预览：${raw}`);
      }
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      const truncated = bytesRead < info.size || decoded.length > maxChars;
      return {
        path: rel.replaceAll("\\", "/"),
        content: decoded.length > maxChars ? decoded.slice(0, maxChars) : decoded,
        truncated,
      };
    } finally {
      await fh.close();
    }
  }

  /**
   * Confine `cwd` strictly to registered DSH workspaces, `<repo>-worktrees/*` managed directories,
   * or verified Git worktrees discovered from those workspaces (no arbitrary `../*` sibling folders).
   */
  public resolveWorkspaceRoot(cwd?: string): string {
    const list = this.ctx.workspaceRegistry.list();
    if (cwd) {
      const candidate = resolve(cwd);
      const inRegisteredWorkspace = list.some((w) =>
        isSubPath(w.path, candidate),
      );
      const inManagedWorktreesDir = list.some((w) =>
        isSubPath(
          resolve(w.path, "..", `${basename(w.path)}-worktrees`),
          candidate,
        ),
      );
      const inVerifiedWorktree = [...this.state.knownWorktrees].some((wt) =>
        isSubPath(wt, candidate),
      );
      if (
        inRegisteredWorkspace ||
        inManagedWorktreesDir ||
        inVerifiedWorktree ||
        isSubPath(resolve(process.cwd()), candidate)
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
  async stopNode(nodeId: string): Promise<void> {
    const node = this.node(nodeId);
    if (!node.sessionId) return;
    const lead = this.teams.isLead(node.sessionId);
    if (lead) await this.scheduler.stopSettlingTeam(node.sessionId);
    this.ctx.sessionController.cancel({ sessionId: node.sessionId as SessionId });
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
