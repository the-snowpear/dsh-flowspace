import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { mergeResultPort } from "../core/connect.ts";
import { rebaseContainerChanges } from "../core/containers.ts";
import {
  emptyDocument,
  newNode,
  sanitizeDocumentForWire,
  syncUntitledAgentNode,
  syncUntitledAgentTitles,
  uid,
  workflowNodes,
} from "../core/document.ts";
import { laneTitle } from "../core/fanout.ts";
import { mergePendingGeneration, stampGeneratedBatch } from "../core/generation.ts";
import { copyBoundNodeFields } from "../core/nodeFields.ts";
import { triggerNode } from "../core/nodes/interactions.ts";
import type { Scheduler } from "../core/scheduler.ts";
import { isTeamNode, staffedIds } from "../core/team.ts";
import type {
  BindRequest,
  DraftRequest,
  FlowNode,
  FlowspaceDocument,
  GenerateReportRequest,
  RestoreSnapshotRequest,
  RunReport,
  SourceRequest,
  TeamDependencies,
  TeamModel,
  WorkflowImportRequest,
  WorkflowImportResult,
} from "../types.ts";
import type { ContainerStore } from "./containers.ts";
import type { DataFileWatch } from "./dataFileWatch.ts";
import { resolveStaticFanout } from "./dataPreview.ts";
import { reconcileFanoutDrafts } from "./fanoutDrafts.ts";
import { validateTriggers } from "./nodes/interactions.ts";
import { ArenaStore, buildReport } from "./nodes/play.ts";
import type { ReferenceService } from "./referenceService.ts";
import type { DshRuntime } from "./runtime.ts";
import type { SessionIngestor } from "./sessionIngestor.ts";
import { pruneHostState, type FlowspaceHostState } from "./state.ts";
import {
  checkDocument,
  documentSchema,
  type flowspaceDomain,
  workflowTemplateSchema,
} from "./storage.ts";
import type { TeamAssets } from "./teamAssets.ts";
import type { TeamRuntime } from "./teamRuntime.ts";
import type { WorkspaceFs } from "./workspaceFs.ts";

/** Hydrates document, templates, snapshots, and runs from storage on startup. */
export async function loadInitialHostState(
  domain: Domain<typeof flowspaceDomain>,
  workspaceFs: WorkspaceFs,
  state: FlowspaceHostState,
): Promise<void> {
  const storedDoc = sanitizeDocumentForWire(
    structuredClone(domain.table("documents").get("main") ?? emptyDocument()),
  );
  const storedTemplates = [...domain.table("templates").entries()].map(
    ([, tpl]) => structuredClone(tpl),
  );
  const storedSnapshots = [...domain.table("snapshots").entries()]
    .map(([, snap]) => structuredClone(snap))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (storedTemplates.length) {
    storedDoc.templates = storedTemplates;
  } else if (storedDoc.templates?.length) {
    for (const tpl of storedDoc.templates) {
      await domain.table("templates").put(tpl.id, structuredClone(tpl));
    }
  }
  if (storedSnapshots.length) {
    storedDoc.snapshots = storedSnapshots;
  } else if (storedDoc.snapshots?.length) {
    for (const snap of storedDoc.snapshots) {
      await domain.table("snapshots").put(snap.id, structuredClone(snap));
    }
  }

  checkDocument(storedDoc);
  validateTriggers(storedDoc);
  syncUntitledAgentTitles(storedDoc);
  state.doc = sanitizeDocumentForWire(storedDoc);
  for (const n of state.doc.nodes) {
    workspaceFs.trackWorktree(n.worktreePath);
  }
  state.runs = [...domain.table("runs").entries()]
    .map(([, r]) => structuredClone(r))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export interface DocumentServiceDeps {
  ctx: Context;
  domain: Domain<typeof flowspaceDomain>;
  state: FlowspaceHostState;
  arena: ArenaStore;
  teamAssets: TeamAssets;
  teams: TeamRuntime;
  runtime: DshRuntime;
  workspaceFs: WorkspaceFs;
  getScheduler: () => Scheduler;
  getContainers: () => ContainerStore;
  getDataFileWatch: () => DataFileWatch;
  getReferences: () => ReferenceService;
  getIngestor: () => SessionIngestor;
  publish: () => void;
}

/**
 * Owns Host document mutations, dirty-tracked storage persistence, workflow import,
 * snapshot restore, agent session binding, display extraction, and run report generation.
 */
export class DocumentService {
  private deferredPersistTimer?: ReturnType<typeof setTimeout>;
  private reportRequests = new Map<string, Promise<RunReport>>();
  private lastDocJson?: string;
  private lastTemplateJson = new Map<string, string>();
  private lastSnapshotJson = new Map<string, string>();
  private lastRunJson = new Map<string, string>();
  private settledArenaRuns = new Set<string>();

  constructor(private readonly deps: DocumentServiceDeps) {
    this.seedPersistedState();
  }

  /** Captures initial storage signatures so subsequent `persist()` only writes dirty rows. */
  seedPersistedState(): void {
    const { state } = this.deps;
    const cleanDoc = sanitizeDocumentForWire(state.doc);
    this.lastDocJson = JSON.stringify(cleanDoc);
    this.lastTemplateJson.clear();
    for (const tpl of cleanDoc.templates ?? []) {
      this.lastTemplateJson.set(tpl.id, JSON.stringify(tpl));
    }
    this.lastSnapshotJson.clear();
    for (const snap of cleanDoc.snapshots ?? []) {
      this.lastSnapshotJson.set(snap.id, JSON.stringify(snap));
    }
    this.lastRunJson.clear();
    for (const run of state.runs) {
      this.lastRunJson.set(run.id, JSON.stringify(run));
    }
  }

  schedulePersist(): void {
    clearTimeout(this.deferredPersistTimer);
    this.deferredPersistTimer = setTimeout(() => {
      void this.persist({ silent: true }).catch((e) =>
        this.deps.ctx.logger.warn("FlowSpace deferred persist: %s", e),
      );
    }, 350);
  }

  async persist(options?: { silent?: boolean }): Promise<void> {
    clearTimeout(this.deferredPersistTimer);
    const { domain, state, arena, getReferences, publish } = this.deps;
    getReferences().syncLiveReferenceVersions(state.doc);
    const cleanDoc = sanitizeDocumentForWire(state.doc);
    state.doc = cleanDoc;

    const docJson = JSON.stringify(cleanDoc);
    if (docJson !== this.lastDocJson) {
      await domain.table("documents").put("main", structuredClone(cleanDoc));
      this.lastDocJson = docJson;
    }

    const templatesTable = domain.table("templates");
    const retainedTemplates = new Set(
      (cleanDoc.templates ?? []).map((t) => t.id),
    );
    for (const id of templatesTable.keys()) {
      if (!retainedTemplates.has(id)) {
        await templatesTable.delete(id);
        this.lastTemplateJson.delete(id);
      }
    }
    for (const tpl of cleanDoc.templates ?? []) {
      const json = JSON.stringify(tpl);
      if (this.lastTemplateJson.get(tpl.id) !== json) {
        await templatesTable.put(tpl.id, structuredClone(tpl));
        this.lastTemplateJson.set(tpl.id, json);
      }
    }

    const snapshotsTable = domain.table("snapshots");
    const retainedSnapshots = new Set(
      (cleanDoc.snapshots ?? []).map((s) => s.id),
    );
    for (const id of snapshotsTable.keys()) {
      if (!retainedSnapshots.has(id)) {
        await snapshotsTable.delete(id);
        this.lastSnapshotJson.delete(id);
      }
    }
    for (const snap of cleanDoc.snapshots ?? []) {
      const json = JSON.stringify(snap);
      if (this.lastSnapshotJson.get(snap.id) !== json) {
        await snapshotsTable.put(snap.id, structuredClone(snap));
        this.lastSnapshotJson.set(snap.id, json);
      }
    }

    const runsTable = domain.table("runs");
    const retainedRuns = new Set(state.runs.map((r) => r.id));
    for (const id of runsTable.keys()) {
      if (!retainedRuns.has(id)) {
        await runsTable.delete(id);
        this.lastRunJson.delete(id);
        this.settledArenaRuns.delete(id);
      }
    }
    for (const run of state.runs) {
      const json = JSON.stringify(run);
      if (this.lastRunJson.get(run.id) !== json) {
        await runsTable.put(run.id, structuredClone(run));
        this.lastRunJson.set(run.id, json);
      }
      if (run.state === "completed" && !this.settledArenaRuns.has(run.id)) {
        await arena.settle(run);
        this.settledArenaRuns.add(run.id);
      }
    }
    if (!options?.silent) publish();
  }

  async availableModel(index: string): Promise<TeamModel> {
    const models = await this.deps.teamAssets.listModelRoutes();
    const fixtures = models.filter((model) => model.provider === "flowspace-test");
    const routes = fixtures.length ? fixtures : models;
    if (!routes.length) throw new Error("请先配置可用的模型");
    const { provider, model } = routes[(Number(index) || 0) % routes.length];
    return { provider, model };
  }

  async save(document: FlowspaceDocument): Promise<FlowspaceDocument> {
    return this.deps.getScheduler().transact(() =>
      this.saveDocument(documentSchema.parse(sanitizeDocumentForWire(document))),
    );
  }

  async saveDocument(
    next: FlowspaceDocument,
    portable = false,
    importedAssets?: TeamDependencies,
  ): Promise<FlowspaceDocument> {
    const {
      ctx,
      state,
      teams,
      teamAssets,
      runtime,
      workspaceFs,
      getContainers,
      getDataFileWatch,
      getReferences,
    } = this.deps;
    const previous = state.doc;
    if (!portable && next.id === previous.id) {
      next = rebaseContainerChanges(next, getContainers().changes());
    }
    next.containerRevision = previous.containerRevision;
    if (!portable) next = mergePendingGeneration(next, previous);
    next.generationRevision = previous.generationRevision;
    const previousNodes = new Map(state.doc.nodes.map((node) => [node.id, node]));
    const previousEdges = new Map(state.doc.edges.map((edge) => [edge.id, edge]));
    for (const node of next.nodes) {
      const prior = previousNodes.get(node.id);
      const old =
        portable && prior?.teamRef?.teamId !== node.teamRef?.teamId
          ? undefined
          : prior;
      if (old?.sessionId) {
        copyBoundNodeFields(node, old);
        node.teamRef = old.teamRef;
        if (node.teamRef) delete node.teamConfig;
      }
      if (
        node.sessionId &&
        teams.isLead(node.sessionId) &&
        !teams.ownsNode(node.sessionId, node.id)
      ) {
        throw new Error("团队主管会话必须由对应的画布团队节点创建");
      }
      if (old) node.lastSubmittedTask = old.lastSubmittedTask;
      syncUntitledAgentNode(node);
      if (node.worktreePath) workspaceFs.trackWorktree(node.worktreePath);
      if (
        node.kind === "agent" &&
        node.sessionId &&
        old &&
        old.planMode !== node.planMode
      ) {
        void runtime.ensure(node).catch(() => {});
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
      if (
        source?.flowType === "flowspace/merge-sort" &&
        edge.kind === "continuation"
      ) {
        edge.sourcePort = mergeResultPort(source.config, edge.sourcePort);
      }
    }
    for (const node of next.nodes) {
      const merge = node.fanout && byId.get(node.fanout.mergeId);
      if (merge) {
        for (const port of node.ports ?? []) {
          if (
            port.direction === "out" &&
            port.kind === "continuation" &&
            port.nodes.includes(merge.id)
          ) {
            port.portId = mergeResultPort(merge.config, port.portId);
          }
        }
      }
      if (node.staffOf !== undefined && !byId.has(node.staffOf)) {
        delete node.staffOf;
      }
    }
    checkDocument(next);
    validateTriggers(next);
    await reconcileFanoutDrafts(
      next,
      portable ? emptyDocument() : previous,
      state.runs,
      (fanId) => resolveStaticFanout(ctx, runtime, next, fanId),
    );
    if (importedAssets) await teamAssets.addImported(importedAssets);
    state.doc = sanitizeDocumentForWire(next);
    pruneHostState(state);
    getReferences().invalidateFileFingerprints();
    getReferences().pruneToolRestrictions(next);
    await this.persist();
    await getDataFileWatch().sync(next);
    await this.renameLaneSessions(previous, next);
    this.syncTeams();
    return structuredClone(state.doc);
  }

  refreshDataFiles(ids: string[]): Promise<void> {
    const { ctx, state, runtime, getScheduler, getReferences, publish } =
      this.deps;
    getReferences().invalidateFileFingerprints(ids);
    return getScheduler().transact(async () => {
      const previous = state.doc;
      const next = structuredClone(previous);
      const changed = await reconcileFanoutDrafts(
        next,
        previous,
        state.runs,
        (fanId) => resolveStaticFanout(ctx, runtime, next, fanId),
        ids,
      );
      if (changed) {
        stampGeneratedBatch(
          next,
          new Set(previous.nodes.map((node) => node.id)),
          new Set(previous.edges.map((edge) => edge.id)),
        );
        state.doc = next;
        await this.persist();
        await this.renameLaneSessions(previous, next);
      } else {
        publish();
      }
    });
  }

  async renameLaneSessions(
    previous: FlowspaceDocument,
    next: FlowspaceDocument,
  ): Promise<void> {
    const { ctx } = this.deps;
    const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]));
    const laneGroups = (nodes: FlowNode[]) =>
      new Map(
        nodes.flatMap((node) =>
          node.fanout ? [[node.fanout.fanId, node] as const] : [],
        ),
      );
    const priorGroups = laneGroups(previous.nodes),
      groups = laneGroups(next.nodes);
    for (const lane of next.nodes) {
      if (!lane.generatedBy || !lane.sessionId) continue;
      const prior = previousNodes.get(lane.id);
      const title = laneTitle(groups.get(lane.generatedBy), lane);
      if (
        !title ||
        (prior &&
          prior.sessionId === lane.sessionId &&
          title === laneTitle(priorGroups.get(lane.generatedBy), prior))
      ) {
        continue;
      }
      await ctx.sessionController
        .rename({ sessionId: lane.sessionId as SessionId, title })
        .catch((error) =>
          ctx.logger.warn("FlowSpace 泳道会话重命名失败: %s", error),
        );
    }
  }

  syncTeams(): void {
    const { state, teams } = this.deps;
    const staffed = staffedIds(state.doc.nodes);
    for (const node of state.doc.nodes) {
      if (node.kind !== "agent" || !node.sessionId) continue;
      if (isTeamNode(node, staffed) !== teams.isLead(node.sessionId)) {
        void teams.sync(node.id).catch(() => {});
      }
    }
  }

  async importWorkflow(
    request: WorkflowImportRequest,
  ): Promise<WorkflowImportResult> {
    const { state, teamAssets, getScheduler } = this.deps;
    return getScheduler().transact(async () => {
      if (!!request.document === !!request.template) {
        throw new Error("Choose one canvas or workflow template to import.");
      }
      const template =
        request.template && workflowTemplateSchema.parse(request.template);
      const next = request.document
        ? documentSchema.parse(sanitizeDocumentForWire(request.document))
        : structuredClone(state.doc);
      if (template) {
        if (next.templates?.some((existing) => existing.id === template.id)) {
          template.id = uid();
        }
        delete template.builtin;
        next.templates = [...(next.templates ?? []), template];
      }
      const nodes = template?.nodes ?? workflowNodes(next);
      if (!request.enableTriggers) {
        for (const node of nodes) {
          if (node.flowType === triggerNode.flowType) {
            node.config = { ...node.config, enabled: false };
          }
        }
      }
      const refs = new Set(
        nodes.flatMap((node) => (node.teamRef ? [node.teamRef.teamId] : [])),
      );
      const plan = await teamAssets.prepareImport(request, refs);
      if (plan.missing.length) {
        return { kind: "missing-models", models: plan.missing };
      }
      const staffed = staffedIds(nodes);
      for (const node of nodes) {
        if (node.roleRef) {
          node.roleRef = plan.roleIds.get(node.roleRef) ?? node.roleRef;
        }
        if (!isTeamNode(node, staffed)) continue;
        if (node.teamRef) {
          node.teamRef.teamId =
            plan.teamIds.get(node.teamRef.teamId) ?? node.teamRef.teamId;
        }
        delete node.sessionId;
        delete node.lastSubmittedTask;
      }
      return {
        kind: "imported",
        document: await this.saveDocument(
          next,
          !!request.document,
          plan.additions,
        ),
      };
    });
  }

  async draft(request: DraftRequest): Promise<void> {
    const { domain, state, getScheduler, publish } = this.deps;
    await getScheduler().transact(async () => {
      const node = this.agentNode(request.nodeId);
      node.draft = request.draft;
      syncUntitledAgentNode(node);
      const cleanDoc = sanitizeDocumentForWire(state.doc);
      state.doc = cleanDoc;
      const docJson = JSON.stringify(cleanDoc);
      if (docJson !== this.lastDocJson) {
        await domain.table("documents").put("main", structuredClone(cleanDoc));
        this.lastDocJson = docJson;
      }
      publish();
    });
  }

  async restoreSnapshot(
    request: RestoreSnapshotRequest,
  ): Promise<FlowspaceDocument> {
    const { state, getScheduler, getDataFileWatch } = this.deps;
    return getScheduler().transact(async () => {
      const snap = (state.doc.snapshots ?? []).find(
        (s) => s.id === request.snapshotId,
      );
      if (!snap) throw new Error("状态快照不存在");

      await getScheduler().interruptAllActive(
        `已恢复工作状态快照「${snap.title}」，原在途调度已安全中断`,
      );

      const liveNodes = state.doc.nodes;
      const restoredNodes = structuredClone(snap.nodes).map((n) => {
        const cur = liveNodes.find((x) => x.id === n.id);
        if (cur?.sessionId && cur.teamRef?.teamId === n.teamRef?.teamId) {
          copyBoundNodeFields(n, cur);
        }
        return n;
      });

      const nextDoc: FlowspaceDocument = sanitizeDocumentForWire({
        ...state.doc,
        nodes: restoredNodes,
        edges: structuredClone(snap.edges),
        viewport: structuredClone(snap.viewport),
      });
      checkDocument(nextDoc);
      validateTriggers(nextDoc);
      state.doc = nextDoc;
      pruneHostState(state);
      this.deps.getReferences().invalidateFileFingerprints();
      await this.persist();
      await getDataFileWatch().sync(nextDoc);
      this.syncTeams();
      return structuredClone(state.doc);
    });
  }

  async bind(request: BindRequest): Promise<FlowNode> {
    const { ctx, state, teams, runtime, workspaceFs, getScheduler, getIngestor } =
      this.deps;
    return getScheduler().transact(async () => {
      const node = this.agentNode(request.nodeId);
      if (node.sessionId) {
        return structuredClone(
          sanitizeDocumentForWire(state.doc).nodes.find(
            (n) => n.id === node.id,
          )!,
        );
      }
      if (
        state.doc.edges.some((e) => e.target === node.id && e.mode === "fork")
      ) {
        throw new Error("分叉草稿将在接续时创建会话");
      }
      if (
        request.sessionId &&
        state.doc.nodes.some((n) => n.sessionId === request.sessionId)
      ) {
        throw new Error("该会话已在画布中");
      }
      node.workspaceId = request.workspaceId ?? node.workspaceId;
      node.cwd = request.cwd ?? node.cwd;
      node.branch = request.branch ?? node.branch;
      node.worktreePath = request.worktreePath ?? node.worktreePath;
      if (node.worktreePath) {
        workspaceFs.trackWorktree(node.worktreePath);
      }
      if (request.sessionId) {
        if (node.teamRef || teams.isLead(request.sessionId)) {
          throw new Error("团队主管会话必须由对应的画布团队节点创建");
        }
        using observation = await ctx.sessionQuery.observeSession(
          request.sessionId as SessionId,
        );
        node.sessionId = request.sessionId;
        node.cwd = observation.header.cwd;
        for (const ev of observation.events) {
          getIngestor().recordNativeMessage(request.sessionId, ev);
        }
      } else {
        node.sessionId = await runtime.ensure(node);
      }
      syncUntitledAgentNode(node);
      if (node.continuationPrompt === undefined && node.task.trim()) {
        node.continuationPrompt = node.task;
      }
      await this.persist();
      if (request.sessionId) this.syncTeams();
      return structuredClone(state.doc.nodes.find((n) => n.id === node.id)!);
    });
  }

  async display(request: SourceRequest): Promise<FlowNode> {
    const { state, runtime, getScheduler } = this.deps;
    return getScheduler().transact(async () => {
      const source = state.doc.nodes.find((n) => n.id === request.nodeId);
      if (!source) throw new Error("来源节点不存在");
      const captured =
        request.text === undefined
          ? source.kind === "agent"
            ? await runtime.capture(source, "conclusion", request.seq)
            : await runtime.reference(source)
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
      state.doc.nodes.push(node);
      await this.persist();
      return structuredClone(node);
    });
  }

  async generateReport(request: GenerateReportRequest): Promise<RunReport> {
    const { ctx, state, getScheduler } = this.deps;
    const run = state.runs.find((r) => r.id === request.runId);
    if (
      !run ||
      !["completed", "cancelled", "error", "interrupted"].includes(run.state)
    ) {
      throw new Error("运行结束后才能生成战报");
    }
    if (run.report) return run.report;
    const existing = this.reportRequests.get(run.id);
    if (existing) return existing;
    const job = buildReport(ctx, structuredClone(run), request.model)
      .then((report) =>
        getScheduler().transact(async () => {
          run.report = report;
          await this.persist();
          return report;
        }),
      )
      .finally(() => this.reportRequests.delete(run.id));
    this.reportRequests.set(run.id, job);
    return job;
  }

  agentNode(id: string): FlowNode {
    const n = this.deps.state.doc.nodes.find((item) => item.id === id);
    if (!n || n.kind !== "agent") throw new Error("Agent 节点不存在");
    return n;
  }

  dispose(): void {
    clearTimeout(this.deferredPersistTimer);
    this.reportRequests.clear();
  }
}
