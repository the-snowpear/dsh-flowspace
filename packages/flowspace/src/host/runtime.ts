import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-api-session-controller";
import type {} from "@deepseek-ai/dsh-agent";
import type {} from "@deepseek-ai/dsh-session-query";
import type {} from "@deepseek-ai/dsh-spill";
import type {} from "@deepseek-ai/dsh-workspace";
import type {} from "@deepseek-ai/dsh-fs";
import type {} from "@deepseek-ai/dsh-plan-mode";
import { foldSurface, type SessionId } from "@deepseek-ai/dsh-session";
import type { SessionRequestId } from "@deepseek-ai/dsh-api-session-controller/types";
import { isCompactCheckpointSource } from "@deepseek-ai/dsh-compaction";
import type { ContentBlock } from "@deepseek-ai/dsh-llm";
import type { WorkspaceId } from "@deepseek-ai/dsh-workspace/types";
import type {
  ContextMode,
  ContextSnapshot,
  FlowEdge,
  FlowNode,
  RunStep,
} from "../types.ts";
import type { RuntimeAdapter } from "../core/scheduler.ts";
import {
  boardSummaryText,
  syncUntitledAgentNode,
  uid,
} from "../core/document.ts";
import { sameFsPath } from "./git.ts";
import type { TeamRuntime } from "./teamRuntime.ts";

interface OptionalWorkingDirectoryService {
  set(agent: unknown, path: string, signal?: AbortSignal): Promise<string>;
}
interface OptionalWorkspaceChangesService {
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
}
interface OptionalTerminalControllerService {
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
  readScreen(
    agent: unknown,
    id: string,
    req: { offset: number; count: number; maxBytes: number },
  ): Promise<{ text: string; totalLines: number; truncated: boolean }>;
}

const MAX_INLINE_CONTEXT_BYTES = 65536;

const shortHash = (value: string): string =>
  createHash("sha1").update(value).digest("hex").slice(0, 12);

const escapeXmlAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const plainText = (blocks: readonly ContentBlock[]): string =>
  blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

export function extractFileNodePaths(node: FlowNode): string[] {
  return (
    node.selectedItems?.length
      ? node.selectedItems
      : node.text.split(/\r?\n/)
  )
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Deterministic `mtimeMs:size` fingerprint for referenced workspace files so
 * external edits immediately flip File capsules to `"updated"` and admit `rerun: "update"`.
 */
export function computeFileNodeFingerprint(
  node: FlowNode,
  baseCwd?: string,
): string {
  const paths = extractFileNodePaths(node);
  if (!paths.length) return "missing:empty";
  const root = resolve(
    baseCwd || node.worktreePath || node.cwd || process.cwd(),
  );
  const parts = paths.map((p) => {
    try {
      const full = resolve(root, p);
      const st = statSync(full);
      if (!st.isFile()) return `${p}:missing`;
      return `${p}:${Math.trunc(st.mtimeMs)}:${st.size}`;
    } catch {
      return `${p}:missing`;
    }
  });
  return shortHash(parts.join("|"));
}

export class DshRuntime implements RuntimeAdapter {
  constructor(
    private ctx: Context,
    private findNode: (id: string) => FlowNode | undefined,
    private teams: TeamRuntime,
  ) {}

  teamReference(sessionId: string) {
    return this.teams.reference(sessionId);
  }

  waitForTeam(sessionId: string): Promise<void> {
    return this.teams.waitForIdle(sessionId);
  }

  running(): string[] {
    return this.ctx.agents
      .list()
      .filter((a) => a.status === "running")
      .map((a) => a.id);
  }

  isPlanModeActive(sessionId: string): boolean {
    const pm = this.ctx.get("planMode") as
      | { get?(agent: unknown): { active: boolean; pending?: boolean } }
      | undefined;
    if (!pm?.get) return false;
    const liveAgent = this.ctx.agents.get(sessionId as SessionId);
    if (!liveAgent) return false;
    try {
      return Boolean(pm.get(liveAgent).active);
    } catch {
      return false;
    }
  }

  private async syncLiveAgentConfig(
    node: FlowNode,
    sessionId: string,
    opts: { isFork?: boolean; workspacePath?: string } = {},
  ): Promise<void> {
    const targetDir = node.worktreePath || node.cwd;
    const needsWorkdirSet =
      !opts.isFork &&
      Boolean(
        targetDir &&
          opts.workspacePath &&
          !sameFsPath(targetDir, opts.workspacePath),
      );
    const hasPlanPreference = node.planMode !== undefined;
    if (!needsWorkdirSet && !hasPlanPreference) return;

    const resolved = await this.ctx.sessionController
      .resolveAgent(sessionId as SessionId)
      .catch(() => null);
    if (!resolved || "error" in resolved) return;

    if (needsWorkdirSet && targetDir) {
      const wd = (
        this.ctx as unknown as {
          get(k: string): OptionalWorkingDirectoryService | undefined;
        }
      ).get("workingDirectory");
      if (wd) {
        await wd.set(resolved.agent, targetDir).catch((err) => {
          this.ctx.logger.warn(
            "FlowSpace worktree workingDirectory.set failed: %s",
            err,
          );
        });
      }
    }

    if (hasPlanPreference) {
      const pm = this.ctx.get("planMode") as
        | { set?(agent: unknown, active: boolean): unknown }
        | undefined;
      try {
        pm?.set?.(resolved.agent, Boolean(node.planMode));
      } catch (err) {
        this.ctx.logger.warn("FlowSpace planMode.set failed: %s", err);
      }
    }
  }

  async ensure(node: FlowNode, fork?: ContextSnapshot): Promise<string> {
    const titleDerived = syncUntitledAgentNode(node);
    const ws = node.workspaceId
      ? this.ctx.workspaceRegistry
          .list()
          .find((w) => w.id === node.workspaceId)
      : undefined;

    if (node.sessionId) {
      if (titleDerived) {
        await this.ctx.sessionController
          .rename({
            sessionId: node.sessionId as SessionId,
            title: node.title,
          })
          .catch(() => {});
      }
      await this.syncLiveAgentConfig(node, node.sessionId, {
        workspacePath: ws?.path,
      });
      return node.sessionId;
    }

    const roster = node.teamRef && await this.teams.validateRoster(node.teamRef.teamId);
    const result = fork?.sourceSessionId && !roster
      ? await this.ctx.sessionController.fork({
          sessionId: fork.sourceSessionId as SessionId,
          atSeq: fork.seq,
        })
      : await this.ctx.sessionController.create({
          ...(ws
            ? { workspaceId: ws.id as WorkspaceId }
            : node.cwd || node.worktreePath
              ? { cwd: node.worktreePath ?? node.cwd }
              : {}),
          ...(!roster && node.agentPreset ? { agentPreset: node.agentPreset } : {}),
        });

    await this.ctx.sessionController.rename({
      sessionId: result.sessionId,
      title: node.title,
    });

    await this.syncLiveAgentConfig(node, result.sessionId, {
      isFork: Boolean(fork),
      workspacePath: ws?.path,
    });
    if (roster) await this.teams.bind(node, result.sessionId, roster);

    return result.sessionId;
  }

  async send(step: RunStep): Promise<void> {
    await this.ctx.sessionController.prompt(
      {
        sessionId: step.sessionId as SessionId,
        requestId: step.requestId as SessionRequestId,
        mode: "queue",
        content: [{ type: "text", text: step.task }],
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      new AbortController().signal,
    );
  }

  /**
   * Format semantic `<upstream-conclusion>`, `<upstream-session>`, and `<canvas-reference>`
   * XML context blocks with both individual and cumulative >64 KiB `spillStore` protection (D36).
   */
  async contextText(
    sources: ContextSnapshot[],
    sessionId: string,
  ): Promise<string> {
    const active = sources.filter((s) => s.kind !== "fork");
    if (!active.length) return "";

    const entries = active.map((source, idx) => ({
      idx,
      source,
      bytes: Buffer.byteLength(source.text, "utf8"),
      spill: Buffer.byteLength(source.text, "utf8") > MAX_INLINE_CONTEXT_BYTES,
    }));

    let inlineTotal = entries
      .filter((e) => !e.spill)
      .reduce((sum, e) => sum + e.bytes, 0);

    if (inlineTotal > MAX_INLINE_CONTEXT_BYTES) {
      const candidates = entries
        .filter((e) => !e.spill && e.bytes > 1024)
        .sort((a, b) => b.bytes - a.bytes);
      for (const candidate of candidates) {
        if (inlineTotal <= MAX_INLINE_CONTEXT_BYTES) break;
        candidate.spill = true;
        inlineTotal -= candidate.bytes;
        // Account for the ~2.2 KiB preview + locator stub that replaces the full payload
        inlineTotal += Math.min(candidate.bytes, 2200);
      }
    }

    const blocks: string[] = [];
    for (const entry of entries) {
      const { source } = entry;
      let body = source.text;
      if (entry.spill) {
        const spill = this.ctx.get("spillStore");
        if (!spill) throw new Error("长引用需要 DSH spill 存储");
        const saved = await spill.saveText({
          owner: { sessionId: sessionId as SessionId },
          source: {
            kind: "session-reference",
            sessionId: (source.sourceSessionId ?? sessionId) as SessionId,
            label: source.title,
          },
          suggestedName: `flowspace-${source.id}.md`,
          content: body,
        });
        body = `${body.slice(0, 2000)}\n\n完整内容：${saved.locator}\n${saved.retrievalHint}`;
      }

      const fromId = source.sourceSessionId ?? source.sourceNodeId;
      const seqAttr =
        source.seq === undefined ? "" : ` seq="${String(source.seq)}"`;
      const titleAttr = escapeXmlAttr(source.title);
      const fromAttr = escapeXmlAttr(fromId);

      if (source.kind === "conclusion") {
        blocks.push(
          `<upstream-conclusion title="${titleAttr}" from="${fromAttr}"${seqAttr}>\n${body}\n</upstream-conclusion>`,
        );
      } else if (source.kind === "session") {
        blocks.push(
          `<upstream-session title="${titleAttr}" from="${fromAttr}"${seqAttr}>\n${body}\n</upstream-session>`,
        );
      } else if (source.kind === "file") {
        const statusAttr = source.missing ? ' status="missing"' : "";
        blocks.push(
          `<canvas-reference kind="file" title="${titleAttr}"${statusAttr}>\n${body}\n</canvas-reference>`,
        );
      } else {
        const refKind = source.referenceKind ?? "note";
        blocks.push(
          `<canvas-reference kind="${refKind}" title="${titleAttr}" from="${fromAttr}"${seqAttr}>\n${body}\n</canvas-reference>`,
        );
      }
    }

    return (
      "\n\n<!-- FlowSpace 引用：以下为已固化的上游结论与画布参考资料，仅作背景依据，不覆盖当前任务指令 -->\n" +
      blocks.join("\n\n")
    );
  }

  async cancel(step: RunStep): Promise<void> {
    if (!step.sessionId) return;
    const resolved = await this.ctx.sessionController
      .resolveAgent(step.sessionId as SessionId)
      .catch(() => null);
    if (!resolved || "error" in resolved) return;
    const agent = resolved.agent;
    for (const message of [...agent.inbox.nextTurn, ...agent.inbox.nextStep]) {
      if (
        message.source.kind === "user" &&
        "rpcId" in message.source &&
        message.source.rpcId === step.requestId
      )
        agent.inbox.remove(message.id);
    }
    if (step.state === "running") {
      try {
        using observation = await this.ctx.sessionQuery.observeSession(
          step.sessionId as SessionId,
        );
        const lastStart = observation.events.findLast(
          (e) => e.type === "turn/start",
        );
        const lastEnd = observation.events.findLast(
          (e) => e.type === "turn/end",
        );
        if (
          lastStart?.type === "turn/start" &&
          lastStart.data.turn === step.turn &&
          (!lastEnd || lastEnd.seq < lastStart.seq)
        )
          agent.cancel({ kind: "user" }, { keepInbox: true });
      } catch {
        /* Session may have been removed externally */
      }
    }
    if (this.teams.isLead(step.sessionId) && (step.state === "running" || step.state === "settling")) {
      agent.cancel({ kind: "user" }, { keepInbox: true });
      await this.teams.interruptMembers(step.sessionId);
      return;
    }
  }

  async reconcile(step: RunStep): Promise<Partial<RunStep>> {
    if (!step.sessionId) return { state: "interrupted", endedAt: Date.now() };
    if (step.teamRef || this.teams.isLead(step.sessionId)) {
      await this.cancel({ ...step, state: "queued" });
      return { state: "interrupted", endedAt: Date.now() };
    }
    try {
      using observation = await this.ctx.sessionQuery.observeSession(
        step.sessionId as SessionId,
      );
      const input = observation.events.find(
        (e) =>
          e.type === "user/message" &&
          e.data.source.kind === "user" &&
          "rpcId" in e.data.source &&
          e.data.source.rpcId === step.requestId,
      );
      const preceding =
        input &&
        observation.events
          .filter((e) => e.seq < input.seq)
          .findLast((e) => e.type === "turn/start");
      const turn =
        preceding?.type === "turn/start" ? preceding.data.turn : step.turn;
      const end =
        turn !== undefined
          ? observation.events.find(
              (e) => e.type === "turn/end" && e.data.turn === turn,
            )
          : undefined;
      if (end?.type === "turn/end" && end.data.reason.kind === "completed") {
        const turnAssistants = observation.events.filter(
          (e) =>
            e.seq > (preceding?.seq ?? -1) &&
            e.seq < end.seq &&
            e.type === "assistant/message" &&
            !e.data.interrupted,
        );
        const lastNonEmpty = turnAssistants.findLast(
          (e) =>
            e.type === "assistant/message" &&
            plainText(e.data.message.content).trim().length > 0,
        );
        const chosen = lastNonEmpty ?? turnAssistants.at(-1);
        return {
          state: "completed",
          turn,
          endSeq: end.seq,
          endedAt: Date.now(),
          output:
            chosen?.type === "assistant/message"
              ? plainText(chosen.data.message.content)
              : "",
        };
      }
      // A restart must not wake or replay the workflow's parked inbox items.
      await this.cancel({ ...step, state: "queued" }).catch(() => {});
      return { state: "interrupted", turn, endedAt: Date.now() };
    } catch {
      return { state: "interrupted", endedAt: Date.now() };
    }
  }

  async capture(
    node: FlowNode,
    mode: ContextMode,
    seq?: number,
    output?: string,
  ): Promise<ContextSnapshot> {
    const sessionId = node.sessionId ?? this.findNode(node.id)?.sessionId;
    if (!sessionId) throw new Error(`${node.title} 尚未创建会话`);
    using observation = await this.ctx.sessionQuery.observeSession(
      sessionId as SessionId,
      { projectionMode: "none" },
    );
    const rawCut = seq ?? observation.cursor;
    const candidateEvents = observation.events.filter((e) => e.seq <= rawCut);

    let cut = rawCut;
    if (mode === "fork") {
      const lastCompletedEnd = candidateEvents.findLast(
        (e) => e.type === "turn/end" && e.data.reason.kind === "completed",
      );
      if (!lastCompletedEnd) {
        throw new Error("来源会话至少需要一个已完成回合才能分叉");
      }
      // Always slice fork at an exact completed turn/end boundary so running upstreams never fork mid-turn
      cut = lastCompletedEnd.seq;
    }

    const events =
      cut === rawCut
        ? candidateEvents
        : candidateEvents.filter((e) => e.seq <= cut);

    let text = output;
    if (mode === "session") {
      const surface = foldSurface(events);
      text = surface.nodes
        .flatMap((index) => {
          const e = events[index];
          if (
            e.type === "user/message" &&
            (e.data.source.kind === "user" ||
              isCompactCheckpointSource(e.data.source))
          )
            return [`用户：${plainText(e.data.content)}`];
          if (e.type === "assistant/message")
            return [`助手：${plainText(e.data.message.content)}`];
          return [];
        })
        .join("\n\n");
    } else if (!text || !text.trim()) {
      const nonEmptyAssistant = events.findLast(
        (e) =>
          e.type === "assistant/message" &&
          !e.data.interrupted &&
          plainText(e.data.message.content).trim().length > 0,
      );
      const fallbackAssistant =
        nonEmptyAssistant ??
        events.findLast(
          (e) => e.type === "assistant/message" && !e.data.interrupted,
        );
      text =
        fallbackAssistant?.type === "assistant/message"
          ? plainText(fallbackAssistant.data.message.content)
          : (output ?? "");
    }
    return {
      id: uid(),
      kind: mode,
      sourceNodeId: node.id,
      sourceSessionId: sessionId,
      seq: cut,
      title: node.title,
      text: text ?? "",
      version: String(cut),
      capturedAt: Date.now(),
    };
  }

  private inferReferenceKind(
    node: FlowNode,
  ): NonNullable<ContextSnapshot["referenceKind"]> {
    switch (node.kind) {
      case "file":
        return "file";
      case "changes":
        return "changes";
      case "git":
        return "git";
      case "terminal":
        return "terminal";
      case "display":
      case "detail":
        return "display";
      case "board":
        return "board";
      default:
        return "note";
    }
  }

  async reference(node: FlowNode, edge?: FlowEdge): Promise<ContextSnapshot> {
    const refKind = this.inferReferenceKind(node);
    if (edge?.snapshotText !== undefined && edge.snapshotText.length > 0) {
      return {
        id: uid(),
        kind: "text",
        referenceKind: refKind,
        sourceNodeId: node.id,
        title: edge.snapshotTitle || node.title,
        text: edge.snapshotText,
        version: shortHash(edge.snapshotText),
        capturedAt: Date.now(),
      };
    }
    if (
      (node.kind === "display" || node.kind === "detail") &&
      !node.fixed &&
      !node.pinned &&
      node.sourceNodeId
    ) {
      const source = this.findNode(node.sourceNodeId);
      if (source?.sessionId) {
        const cap = await this.capture(source, "conclusion");
        return {
          ...cap,
          kind: "text",
          referenceKind: "display",
          sourceNodeId: node.id,
          title: node.title,
        };
      }
    }
    if (node.kind === "file") {
      const paths = extractFileNodePaths(node);
      const baseCwd = node.worktreePath ?? node.cwd;
      const version = computeFileNodeFingerprint(node, baseCwd);
      if (!paths.length) {
        return {
          id: uid(),
          kind: "file",
          referenceKind: "file",
          missing: true,
          sourceNodeId: node.id,
          title: node.title,
          text: "未配置引用文件路径（当前文件节点为空）",
          version,
          capturedAt: Date.now(),
        };
      }
      const resolved: string[] = [];
      const missingPaths: string[] = [];
      for (const p of paths) {
        try {
          const target = await this.ctx.fs.resolve(p, { cwd: baseCwd });
          const info = await this.ctx.fs.stat(target);
          if (!info) {
            missingPaths.push(p);
          } else {
            resolved.push(target.displayPath);
          }
        } catch {
          missingPaths.push(p);
        }
      }
      if (!resolved.length) {
        return {
          id: uid(),
          kind: "file",
          referenceKind: "file",
          missing: true,
          sourceNodeId: node.id,
          title: node.title,
          text: `引用的文件当前不存在（已安全跳过）：${missingPaths.join("、")}`,
          version,
          capturedAt: Date.now(),
        };
      }
      const noteMissing = missingPaths.length
        ? `\n（以下路径未找到，已跳过：${missingPaths.join("、")}）`
        : "";
      return {
        id: uid(),
        kind: "file",
        referenceKind: "file",
        sourceNodeId: node.id,
        title: node.title,
        text: `请按任务需要读取文件：${resolved.join("、")}${noteMissing}`,
        version,
        capturedAt: Date.now(),
      };
    }
    if (node.kind === "changes") {
      let text = node.text;
      if (!text && node.changesSessionId && node.changesSeq !== undefined) {
        const wc = (
          this.ctx as unknown as {
            get(k: string): OptionalWorkspaceChangesService | undefined;
          }
        ).get("workspaceChanges");
        const sum = wc?.summary(
          node.changesSessionId as SessionId,
          node.changesSeq,
        );
        if (sum) {
          text =
            `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})\n` +
            sum.files
              .map((f) => `- ${f.display} (+${f.added} / -${f.deleted})`)
              .join("\n");
        }
      }
      return {
        id: uid(),
        kind: "text",
        referenceKind: "changes",
        sourceNodeId: node.id,
        sourceSessionId: node.changesSessionId,
        seq: node.changesSeq,
        title: node.title,
        text,
        version: shortHash(text),
        capturedAt: Date.now(),
      };
    }
    if (node.kind === "terminal") {
      let text = node.text;
      if (node.terminalSessionId) {
        const tc = (
          this.ctx as unknown as {
            get(k: string): OptionalTerminalControllerService | undefined;
          }
        ).get("terminalController");
        const list = tc?.list(node.terminalSessionId as SessionId) ?? [];
        const term =
          (node.terminalId
            ? list.find((item) => item.id === node.terminalId)
            : undefined) ?? list[0];
        if (tc && term) {
          const resolved = await this.ctx.sessionController
            .resolveAgent(node.terminalSessionId as SessionId)
            .catch(() => null);
          if (resolved && !("error" in resolved)) {
            const page = await tc
              .readScreen(resolved.agent, term.id, {
                offset: 0,
                count: 140,
                maxBytes: 49152,
              })
              .catch(() => null);
            if (page?.text) text = page.text;
          }
        }
      }
      return {
        id: uid(),
        kind: "text",
        referenceKind: "terminal",
        sourceNodeId: node.id,
        sourceSessionId: node.terminalSessionId,
        title: node.title,
        text,
        version: shortHash(text),
        capturedAt: Date.now(),
      };
    }
    const text =
      node.kind === "board" && node.columns
        ? boardSummaryText(node.columns, node.selectedItems) || node.text
        : node.text;
    return {
      id: uid(),
      kind: "text",
      referenceKind: refKind,
      sourceNodeId: node.id,
      title: node.title,
      text,
      seq: node.sourceSeq,
      version: shortHash(text),
      capturedAt: Date.now(),
    };
  }
}
