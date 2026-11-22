import type { Context } from "@deepseek-ai/cordis";
import type { SessionEvent, SessionId } from "@deepseek-ai/dsh-session";
import type { Scheduler } from "../core/scheduler.ts";
import type { SessionChangeTurn } from "../types.ts";
import { formatTurnChangesSummary, getWorkspaceChanges } from "./dshServices.ts";
import { DshRuntime, plainText } from "./runtime.ts";
import type { FlowspaceHostState } from "./state.ts";
import type { TeamRuntime } from "./teamRuntime.ts";
import type { WorkspaceFs } from "./workspaceFs.ts";

export interface SessionIngestorDeps {
  ctx: Context;
  state: FlowspaceHostState;
  runtime: DshRuntime;
  workspaceFs: WorkspaceFs;
  teams: TeamRuntime;
  scheduler: Scheduler;
  publish: () => void;
  schedulePersist: () => void;
}

/**
 * Hydrates bound DSH sessions on startup and ingests live `session/event`,
 * `agent/status`, and `subagent/*` events into Host runtime state.
 */
export class SessionIngestor {
  constructor(private readonly deps: SessionIngestorDeps) {}

  upsertSubagentBrief(
    childSessionId: string,
    parentSessionId: string,
    running: boolean,
  ): void {
    const { ctx, state, publish } = this.deps;
    const existing = state.subagents.get(childSessionId);
    state.subagents.set(childSessionId, {
      sessionId: childSessionId,
      parentSessionId,
      title: existing?.title ?? childSessionId.slice(0, 8),
      running,
      updatedAt: Date.now(),
    });
    publish();
    void ctx.sessionQuery
      .readTitleSnapshots([childSessionId as SessionId])
      .then((titles) => {
        const resolvedTitle =
          titles[0]?.status === "fulfilled"
            ? titles[0].value.title?.title
            : undefined;
        if (resolvedTitle) {
          const cur = state.subagents.get(childSessionId);
          if (cur && cur.title !== resolvedTitle) {
            state.subagents.set(childSessionId, {
              ...cur,
              title: resolvedTitle,
            });
            publish();
          }
        }
      })
      .catch(() => {});
  }

  async hydrateBoundSessions(): Promise<void> {
    const { ctx, state, runtime, workspaceFs } = this.deps;
    const listed = await ctx.sessionController.list(
      {},
      new AbortController().signal,
    );
    const subRows = listed.items.filter((s) => s.origin === "subagent");
    if (subRows.length) {
      const titles = await ctx.sessionQuery.readTitleSnapshots(
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
          state.subagents.set(row.sessionId, {
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
        using subObs = await ctx.sessionQuery.observeSession(sub.sessionId, {
          projectionMode: "none",
        });
        for (const ev of subObs.events) {
          this.recordNativeMessage(sub.sessionId, ev);
        }
      } catch {
        /* Subagent log may be unavailable */
      }
    }

    for (const node of state.doc.nodes) {
      if (node.kind !== "agent" || !node.sessionId) continue;
      try {
        using obs = await ctx.sessionQuery.observeSession(
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
          workspaceFs.trackWorktree(effectiveCwd);
        }
        state.live.set(node.id, {
          nodeId: node.id,
          sessionId: node.sessionId,
          running: runtime.running().includes(node.sessionId),
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

  recordNativeMessage(sessionId: string, event: SessionEvent): boolean {
    if (event.type !== "user/message") return false;
    const { state } = this.deps;
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
      if (state.nativeMessages.has(msgId)) return false;
      const bodyText =
        plainText(event.data.content).trim() ||
        src.summary ||
        (src.senderName ? `From ${src.senderName}` : "");
      state.nativeMessages.set(msgId, {
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
        const existingSub = state.subagents.get(senderSessionId);
        state.subagents.set(senderSessionId, {
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

  collectSessionChangesFromEvents(
    sessionId: string,
    events: readonly SessionEvent[],
  ): SessionChangeTurn[] {
    const wc = getWorkspaceChanges(this.deps.ctx);
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

  onAgentStatus(agentId: string, status: string): void {
    const { state, publish } = this.deps;
    const n = state.doc.nodes.find((item) => item.sessionId === agentId);
    if (n) {
      const old = state.live.get(n.id);
      state.live.set(n.id, {
        nodeId: n.id,
        sessionId: agentId,
        running: status === "running",
        output: old?.output ?? "",
        seq: old?.seq ?? -1,
        pendingInput: [],
        updatedAt: Date.now(),
        effectiveCwd: old?.effectiveCwd,
        changesTurns: old?.changesTurns,
      });
      publish();
    }
    const sub = state.subagents.get(agentId);
    if (sub) {
      state.subagents.set(agentId, {
        ...sub,
        running: status === "running",
        updatedAt: Date.now(),
      });
      publish();
    }
  }

  onSessionEvent(
    sessionId: string,
    event: SessionEvent,
    report: (p: Promise<unknown>) => void,
    header?: { origin?: string; cwd?: string; parentSession?: string },
  ): void {
    const {
      ctx,
      state,
      workspaceFs,
      teams,
      scheduler,
      publish,
      schedulePersist,
    } = this.deps;

    if (this.recordNativeMessage(sessionId, event)) {
      publish();
    }
    if (header?.origin === "subagent") {
      const prev = state.subagents.get(sessionId);
      if (prev) {
        state.subagents.set(sessionId, {
          ...prev,
          updatedAt: event.time,
        });
      } else if (header.parentSession) {
        this.upsertSubagentBrief(sessionId, header.parentSession, true);
      }
    }

    const node = state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node) return;

    const evAny = event as {
      type: string;
      seq: number;
      time: number;
      data?: Record<string, unknown>;
    };

    if (evAny.type === "tool/call" && evAny.data) {
      const name = String(evAny.data.name ?? "");
      report(scheduler.nativeStatus(sessionId, "tool", name, event.seq));
      if (/^(bash|pwsh|terminal_(?:exec|send))$/.test(name)) {
        const raw = evAny.data.args ?? evAny.data.arguments;
        let args: unknown = raw;
        if (typeof raw === "string") {
          try {
            args = JSON.parse(raw);
          } catch {
            args = undefined;
          }
        }
        if (args && typeof args === "object") {
          const command = ["command", "text", "code"].flatMap((key) =>
            typeof (args as Record<string, unknown>)[key] === "string"
              ? [String((args as Record<string, unknown>)[key])]
              : [],
          )[0];
          if (command) {
            const kind = /^\s*git(?:\.exe)?\s/i.test(command)
              ? "git"
              : "terminal";
            const cwd =
              state.live.get(node.id)?.effectiveCwd ??
              node.worktreePath ??
              node.cwd;
            const key = `${node.id}:${kind}`;
            const old = state.nativeOperations.get(key);
            if (!old || old.seq < event.seq) {
              state.nativeOperations.set(key, {
                nodeId: node.id,
                kind,
                command: command.slice(0, 256),
                cwd,
                at: event.time,
                seq: event.seq,
              });
              publish();
            }
          }
        }
      }
    }

    if (evAny.type === "working-directory/change" && evAny.data?.cwd) {
      const nextCwd = String(evAny.data.cwd);
      workspaceFs.trackWorktree(nextCwd);
      const old = state.live.get(node.id);
      state.live.set(node.id, {
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
      publish();
    }

    if (evAny.type === "step/start" && evAny.data) {
      const turn = Number(evAny.data.turn ?? 0);
      report(
        scheduler
          .recordTelemetry(sessionId, turn, { addStep: true })
          .then((updated) => {
            if (updated) publish();
          }),
      );
    }

    if (evAny.type === "deliverables/presented" && evAny.data) {
      const turn = Number(evAny.data.turn ?? 0);
      const files = Array.isArray(evAny.data.files)
        ? (evAny.data.files as { path: string; description?: string }[])
        : [];
      if (files.length) {
        report(
          scheduler.deliverable(sessionId, turn, event.seq, event.time, files),
        );
      }
    }

    if (evAny.type === "workspace/changes") {
      const wc = getWorkspaceChanges(ctx);
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
        const old = state.live.get(node.id);
        const existing = (old?.changesTurns ?? []).filter(
          (c) => c.turn !== sum.turn,
        );
        state.live.set(node.id, {
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
        for (const chNode of state.doc.nodes) {
          if (
            chNode.kind === "changes" &&
            !chNode.fixed &&
            chNode.changesSessionId === sessionId
          ) {
            chNode.changesSeq = event.seq;
            chNode.changesTurn = sum.turn;
            chNode.text = formatTurnChangesSummary(sum);
            docMutated = true;
          }
        }
        publish();
        if (docMutated) schedulePersist();
      }
    }

    if (event.type === "assistant/message") {
      const text = plainText(event.data.message.content);
      const usage = event.data.usage;
      if (usage) {
        report(
          scheduler.recordTelemetry(sessionId, event.data.turn, {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          }),
        );
        report(
          scheduler.nativeStatus(
            sessionId,
            "usage",
            JSON.stringify(usage),
            event.seq,
          ),
        );
      }
      if (!event.data.interrupted && text.trim().length > 0) {
        state.turnOutput.set(sessionId, text);
      } else if (!state.turnOutput.has(sessionId) && text.length > 0) {
        state.turnOutput.set(sessionId, text);
      }
      const effectiveOutput =
        text.trim().length > 0
          ? text
          : (state.turnOutput.get(sessionId) ?? text);
      const old = state.live.get(node.id);
      state.live.set(node.id, {
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
        for (const display of state.doc.nodes.filter(
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
      publish();
      if (displayMutated) schedulePersist();
    }

    if (event.type === "turn/start") state.turnOutput.delete(sessionId);
    if (event.type === "turn/end") {
      report(
        scheduler.finish(
          sessionId,
          event.data.turn,
          event.data.reason.kind,
          event.seq,
          state.turnOutput.get(sessionId) ?? "",
          event.data.reason.kind === "error"
            ? event.data.reason.error.message
            : undefined,
          teams.isFollowup(sessionId, event.data.turn),
        ),
      );
    }
  }
}
