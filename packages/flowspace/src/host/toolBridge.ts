import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
import { uid } from "../core/document.ts";
import type {
  GitActionRequest,
  GitDiffRequest,
  GitDiffResult,
  GitInspectRequest,
  GitRepoStatus,
  SessionBrief,
  SessionChangeDiffRequest,
  SessionChangesRequest,
  SessionChangeTurn,
  SessionFileDiffView,
  SessionTerminalBrief,
  SessionTerminalsRequest,
  TerminalScreenReadRequest,
  TerminalScreenSnapshot,
  WorkspaceBrief,
  WorkspaceStructureBrief,
} from "../types.ts";
import { MAX_INLINE_CONTEXT_BYTES } from "./content.ts";
import { getTerminalController, getWorkspaceChanges } from "./dshServices.ts";
import { HostGitService, sameFsPath } from "./git.ts";
import type { SessionIngestor } from "./sessionIngestor.ts";
import type { WorkspaceFs } from "./workspaceFs.ts";

export interface HostToolBridgeDeps {
  ctx: Context;
  git: HostGitService;
  workspaceFs: WorkspaceFs;
  ingestor: SessionIngestor;
}

/**
 * Host-side bridge for workspace/git/changes/terminal inspection and control RPCs.
 */
export class HostToolBridge {
  constructor(private readonly deps: HostToolBridgeDeps) {}

  async sessions(): Promise<SessionBrief[]> {
    const { ctx } = this.deps;
    const result = await ctx.sessionController.list(
      {},
      new AbortController().signal,
    );
    const rows = result.items.filter((s) => s.origin !== "subagent");
    const titles = await ctx.sessionQuery.readTitleSnapshots(
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

  workspaces(): WorkspaceBrief[] {
    return this.deps.ctx.workspaceRegistry
      .list()
      .map((w) => ({ id: w.id, name: w.title, path: w.path }));
  }

  async projectStructures(): Promise<WorkspaceStructureBrief[]> {
    const { ctx, git, workspaceFs } = this.deps;
    const list = ctx.workspaceRegistry.list();
    return Promise.all(
      list.map(async (w) => {
        const status = await git.inspect(w.path).catch(() => null);
        if (status?.topLevel && sameFsPath(status.topLevel, w.path)) {
          for (const wt of status.worktrees) {
            if (wt.path && !wt.isMain) {
              workspaceFs.trackWorktree(wt.path);
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

  async gitInspect(request: GitInspectRequest): Promise<GitRepoStatus> {
    const { git, workspaceFs } = this.deps;
    const base = workspaceFs.resolveWorkspaceRoot(request.cwd);
    const status = await git.inspect(base);
    if (status.topLevel && sameFsPath(status.topLevel, base)) {
      for (const wt of status.worktrees) {
        if (wt.path && !wt.isMain) {
          workspaceFs.trackWorktree(wt.path);
        }
      }
    }
    return status;
  }

  async gitDiff(request: GitDiffRequest): Promise<GitDiffResult> {
    const { git, workspaceFs } = this.deps;
    const base = workspaceFs.resolveWorkspaceRoot(request.cwd);
    return git.diff(base, request);
  }

  async gitAction(request: GitActionRequest): Promise<GitRepoStatus> {
    const { git, workspaceFs } = this.deps;
    const base = workspaceFs.resolveWorkspaceRoot(request.cwd);
    const status = await git.act(base, request);
    if (status.topLevel && sameFsPath(status.topLevel, base)) {
      for (const wt of status.worktrees) {
        if (wt.path && !wt.isMain) {
          workspaceFs.trackWorktree(wt.path);
        }
      }
    }
    return status;
  }

  async sessionChanges(
    request: SessionChangesRequest,
  ): Promise<SessionChangeTurn[]> {
    const sessionId = request.sessionId.trim();
    if (!sessionId) return [];
    using obs = await this.deps.ctx.sessionQuery.observeSession(
      sessionId as SessionId,
      { projectionMode: "none" },
    );
    return this.deps.ingestor.collectSessionChangesFromEvents(
      sessionId,
      obs.events,
    );
  }

  async sessionChangeDiff(
    request: SessionChangeDiffRequest,
  ): Promise<SessionFileDiffView> {
    const wc = getWorkspaceChanges(this.deps.ctx);
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
    return {
      path: sum.cwd,
      display: `Turn #${sum.turn}`,
      kind: "text",
      hunks: allHunks.slice(0, 60),
      formatted: parts.join("\n"),
    };
  }

  sessionTerminals(request: SessionTerminalsRequest): SessionTerminalBrief[] {
    const tc = getTerminalController(this.deps.ctx);
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

  async openSessionTerminal(
    request: SessionTerminalsRequest,
  ): Promise<SessionTerminalBrief> {
    const { ctx } = this.deps;
    const tc = getTerminalController(ctx);
    if (!tc) throw new Error("当前环境未启用 terminalController");
    const resolved = await ctx.sessionController.resolveAgent(
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

  async readTerminalScreen(
    request: TerminalScreenReadRequest,
  ): Promise<TerminalScreenSnapshot> {
    const { ctx } = this.deps;
    const tc = getTerminalController(ctx);
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
    const resolved = await ctx.sessionController.resolveAgent(sid);
    if ("error" in resolved) throw resolved.error;
    const page = await tc.readScreen(resolved.agent, chosen.id, {
      offset: 0,
      count: Math.min(400, Math.max(20, request.lines ?? 140)),
      maxBytes: MAX_INLINE_CONTEXT_BYTES,
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
}
