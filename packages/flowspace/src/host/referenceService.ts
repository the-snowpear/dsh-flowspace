import { randomUUID } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import type { ContextFormed, UserMessage } from "@deepseek-ai/dsh-llm";
import { resolveBoardReference } from "../core/board.ts";
import { variableNode } from "../core/nodes/variables.ts";
import type { Scheduler } from "../core/scheduler.ts";
import type { FlowNode, FlowspaceDocument } from "../types.ts";
import { shortHash } from "./dshServices.ts";
import type { OperationService } from "./nodes/operations.ts";
import { computeFileNodeFingerprint, DshRuntime, plainText } from "./runtime.ts";
import {
  capSetSize,
  MAX_INJECTED_STEPS,
  type FlowspaceHostState,
  type PreparedReferenceEntry,
} from "./state.ts";
import type { TeamRuntime } from "./teamRuntime.ts";
import type { VariableStore } from "./variables.ts";

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
    source: {
      kind: "flowspace-team",
      form: "snapshot",
      sections: [{ name: "flowspace-team", text }],
    },
  }) as unknown as UserMessage;
}

export interface ReferenceServiceDeps {
  ctx: Context;
  state: FlowspaceHostState;
  runtime: DshRuntime;
  variables: VariableStore;
  operations: OperationService;
  teams: TeamRuntime;
  scheduler: Scheduler;
  resolveWorkspaceRoot: (cwd?: string) => string;
  persist: () => Promise<void>;
}

const FILE_FINGERPRINT_TTL_MS = 500;

interface CachedFileFingerprint {
  key: string;
  fingerprint: string;
  at: number;
}

/**
 * Computes source version hashes, freezes reference capsules on user inbox insertion,
 * injects context/team briefs/operation prefetch hints on `agent/pre-step`, and manages
 * `canvasToolsOnly` tool restrictions.
 */
export class ReferenceService {
  private inputContexts = new Map<string, Promise<PreparedReferenceEntry[]>>();
  private teamBriefs = new Map<string, string>();
  private canvasToolRestrictions = new Map<string, () => void>();
  private fileFingerprintCache = new Map<string, CachedFileFingerprint>();

  constructor(private readonly deps: ReferenceServiceDeps) {}

  invalidateFileFingerprints(nodeIds?: string[]): void {
    if (!nodeIds) {
      this.fileFingerprintCache.clear();
      return;
    }
    for (const id of nodeIds) this.fileFingerprintCache.delete(id);
  }

  private fileFingerprint(node: FlowNode, baseCwd: string): string {
    const key = `${baseCwd}\0${node.text}\0${node.selectedItems?.join("\0") ?? ""}`;
    const now = Date.now();
    const cached = this.fileFingerprintCache.get(node.id);
    if (cached && cached.key === key && now - cached.at < FILE_FINGERPRINT_TTL_MS) {
      return cached.fingerprint;
    }
    const fingerprint = computeFileNodeFingerprint(node, baseCwd);
    this.fileFingerprintCache.set(node.id, { key, fingerprint, at: now });
    return fingerprint;
  }

  computeSourceVersions(): Record<string, string> {
    const { state, variables, resolveWorkspaceRoot } = this.deps;
    const out: Record<string, string> = {};
    for (const n of state.doc.nodes) {
      if (n.flowType === variableNode.flowType) {
        out[n.id] = `${n.id}:${variables.read(n, {}).version}`;
        continue;
      }
      if (n.flowType === "flowspace/constant") {
        out[n.id] = `${n.id}:${shortHash(JSON.stringify(n.config))}`;
        continue;
      }
      if (n.kind === "agent") {
        const live = state.live.get(n.id);
        if (n.sessionId && live && live.seq >= 0) {
          out[n.id] = `${n.sessionId}:${live.seq}`;
        }
        continue;
      }
      if (n.kind === "file") {
        const baseCwd = resolveWorkspaceRoot(n.worktreePath ?? n.cwd);
        out[n.id] = `${n.id}:${this.fileFingerprint(n, baseCwd)}`;
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

  referenceVersion(
    edge: FlowspaceDocument["edges"][number],
    source: FlowNode | undefined,
    sourceVersions: Record<string, string>,
  ): string | undefined {
    if (edge.snapshotContent) {
      return `${edge.source}:${shortHash(JSON.stringify(edge.snapshotContent))}`;
    }
    if (
      source?.kind === "board" &&
      (edge.sourceItemKey !== undefined || !edge.snapshotText)
    ) {
      if (edge.sourceItemKey === undefined && sourceVersions[source.id]) {
        return sourceVersions[source.id];
      }
      return `${source.id}:${shortHash(resolveBoardReference(source, edge.sourceItemKey).text)}`;
    }
    return edge.snapshotText
      ? `${edge.source}:${shortHash(edge.snapshotText)}`
      : (sourceVersions[edge.source] ?? edge.currentVersion);
  }

  syncLiveReferenceVersions(
    doc: FlowspaceDocument,
    sourceVersions = this.computeSourceVersions(),
  ): Record<string, string> {
    const nodes = new Map(doc.nodes.map((node) => [node.id, node]));
    for (const edge of doc.edges) {
      if (edge.kind === "reference") {
        edge.currentVersion = this.referenceVersion(
          edge,
          nodes.get(edge.source),
          sourceVersions,
        );
      }
    }
    return sourceVersions;
  }

  async prepareReferences(sessionId: string): Promise<PreparedReferenceEntry[]> {
    const { state, runtime, variables } = this.deps;
    const node = state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node) return [];
    const entries: PreparedReferenceEntry[] = [];
    for (const edge of state.doc.edges.filter(
      (e) =>
        e.target === node.id && (e.kind === "reference" || e.trigger === "off"),
    )) {
      const source = state.doc.nodes.find((n) => n.id === edge.source);
      if (!source) continue;
      const captured =
        source.flowType === variableNode.flowType
          ? variables.reference(source)
          : source.kind === "agent"
            ? await runtime.capture(source, edge.mode)
            : await runtime.reference(source, edge);
      if (captured.referenceKind === "board-card" && captured.missing) continue;
      const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
      edge.currentVersion = version;
      if (
        edge.kind === "reference" &&
        !edge.always &&
        edge.sentVersion === version
      ) {
        continue;
      }
      // Do NOT mutate `edge.sentVersion` here; wait until `agent/pre-step` confirms `decision.kind === "enter"`.
      entries.push({ snapshot: captured, edgeId: edge.id, version });
    }
    if (
      new Set(
        entries
          .filter((e) => e.snapshot.kind === "session")
          .map((e) => e.snapshot.sourceSessionId),
      ).size > 3
    ) {
      throw new Error("一次会话引用最多包含三个来源");
    }
    return entries;
  }

  onInboxInserted(
    agentId: string,
    message: {
      id: string;
      source: { kind: string; rpcId?: string };
      content: Parameters<typeof plainText>[0];
    },
    report: (promise: Promise<unknown>) => void,
  ): void {
    const { ctx, state, scheduler } = this.deps;
    if (message.source.kind !== "user") return;
    const id =
      "rpcId" in message.source && typeof message.source.rpcId === "string"
        ? message.source.rpcId
        : message.id;
    const owned = state.runs.some((r) =>
      r.steps.some((s) => s.requestId === id),
    );
    const preparation = owned
      ? Promise.resolve([] as PreparedReferenceEntry[])
      : this.prepareReferences(agentId);
    void preparation.catch((e) =>
      ctx.logger.warn("FlowSpace reference preparation: %s", e),
    );
    this.inputContexts.set(message.id, preparation);
    report(
      scheduler.native(
        agentId,
        id,
        plainText(message.content),
        state.canvasSessions.has(agentId),
      ),
    );
  }

  onInboxDiscarded(messageId: string): void {
    this.inputContexts.delete(messageId);
  }

  async onPreStep<
    M extends {
      id: string;
      source: { kind: string; rpcId?: string };
      content: readonly unknown[];
    },
    D extends { kind: string; messages?: M[] },
  >(
    agent: {
      id: string;
      ctx: { tools: { restrict(rule: { deny: string[] }): () => void } };
    },
    decision: D,
  ): Promise<D> {
    if (decision.kind !== "enter" || !decision.messages) return decision;
    const { ctx, state, operations, runtime, teams, persist } = this.deps;
    const node = state.doc.nodes.find((n) => n.sessionId === agent.id);
    if (node?.canvasToolsOnly && !this.canvasToolRestrictions.has(agent.id)) {
      const deny = ctx.tools
        .definitions()
        .map((tool) => tool.name)
        .filter((name) => /^(bash|pwsh|terminal_)/.test(name));
      if (deny.length) {
        this.canvasToolRestrictions.set(
          agent.id,
          agent.ctx.tools.restrict({ deny }),
        );
      }
    }
    const messages = (await Promise.all(
      decision.messages.map(async (message) => {
        const id =
          message.source.kind === "user" &&
          "rpcId" in message.source &&
          typeof message.source.rpcId === "string"
            ? message.source.rpcId
            : message.id;
        const run = state.runs.find((r) =>
          r.steps.some((step) => step.requestId === id),
        );
        const step = run?.steps.find((s) => s.requestId === id);
        const requests = run && step ? operations.prefetch(run, step) : [];
        if (requests.length) {
          const text =
            "回合结束后 FlowSpace 将执行以下操作。请用 provide_flow_parameters 提交所需参数，操作由 Host 执行。\n" +
            JSON.stringify(requests);
          message = {
            ...message,
            content: [...message.content, { type: "text", text }],
          };
        }
        const preparation = this.inputContexts.get(message.id);
        this.inputContexts.delete(message.id);

        // 1. Scheduler-owned step: inject `step.sources` once at step admission
        if (
          step &&
          step.sources.length > 0 &&
          !state.injectedSteps.has(step.id)
        ) {
          state.injectedSteps.add(step.id);
          capSetSize(state.injectedSteps, MAX_INJECTED_STEPS);
          const text = await runtime.contextText(step.sources, agent.id);
          return text
            ? {
                ...message,
                content: [...message.content, { type: "text" as const, text }],
              }
            : message;
        }

        // 2. Native / embedded chat prompt: resolve frozen reference preparation & flip capsules to `"sent"` now
        if (!preparation) return message;
        const entries = await preparation;
        if (!entries.length) return message;

        const sources = entries.map((e) => e.snapshot);
        for (const item of entries) {
          const liveEdge = state.doc.edges.find((e) => e.id === item.edgeId);
          if (liveEdge) {
            liveEdge.sentVersion = item.version;
            liveEdge.currentVersion = item.version;
          }
        }
        const text = await runtime.contextText(sources, agent.id);
        if (step) {
          step.sources.push(...sources);
        }
        await persist();
        return text
          ? {
              ...message,
              content: [...message.content, { type: "text" as const, text }],
            }
          : message;
      }),
    )) as M[];
    const sessionId = agent.id;
    if (teams.isLead(sessionId) && messages.length) {
      const brief = await teams.brief(sessionId);
      if (brief && this.teamBriefs.get(sessionId) !== brief) {
        this.teamBriefs.set(sessionId, brief);
        messages.push(teamBriefMessage(brief) as unknown as M);
      }
    }
    return { ...decision, messages };
  }

  pruneToolRestrictions(doc: FlowspaceDocument): void {
    for (const [id, dispose] of this.canvasToolRestrictions) {
      if (doc.nodes.some((node) => node.sessionId === id && node.canvasToolsOnly)) {
        continue;
      }
      dispose();
      this.canvasToolRestrictions.delete(id);
    }
  }

  dispose(): void {
    this.inputContexts.clear();
    this.fileFingerprintCache.clear();
    this.canvasToolRestrictions.forEach((dispose) => dispose());
    this.canvasToolRestrictions.clear();
  }
}
