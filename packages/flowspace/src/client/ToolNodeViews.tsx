import { useCallback, useEffect, useId, useState } from "react";
import type {
  DiffHunkView,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GitDiffResult,
  GitPanelTab,
  GitRepoStatus,
  SessionChangeTurn,
  SessionFileDiffView,
  SessionTerminalBrief,
} from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";
import { DiffHunks } from "./ui/DiffView.tsx";

export { DiffHunks };

/** OMP-migrated GitQuickCard + GitWorkbench inside FlowSpace (M08, D55). */
export function GitNodeBody({
  node,
  bridge,
  onEditNode,
  onPromptForm,
  onExtractDisplay,
  onError,
  onRefreshStructure,
  onInitGit,
}: {
  node: FlowNode;
  bridge: CanvasBridge;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onPromptForm: (opts: {
    title: string;
    description?: string;
    initialValue: string;
    secondaryLabel?: string;
    secondaryInitial?: string;
    onSubmit: (val: string, secondary?: string) => void;
  }) => void;
  onExtractDisplay: (title: string, text: string) => void;
  onError: (err: unknown) => void;
  onRefreshStructure: () => void;
  onInitGit?: () => void;
}) {
  const [status, setStatus] = useState<GitRepoStatus | null>(null);
  const [diffView, setDiffView] = useState<GitDiffResult | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const commitInputId = useId();

  const cwd = node.worktreePath || node.cwd;
  const tab: GitPanelTab = node.gitTab ?? "changes";

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const repo = await bridge.gitInspect(cwd);
      setStatus(repo);
      if (repo.isGitRepo && !node.gitCommitOid) {
        const summaryLines = [
          `Branch: ${repo.branch}${repo.ahead || repo.behind ? ` (↑${repo.ahead} ↓${repo.behind})` : ""}`,
          `${t("stagedFiles")} (${repo.staged.length}): ${repo.staged.map((f) => `${f.status} ${f.path}`).join(", ") || "none"}`,
          `${t("workingFiles")} (${repo.unstaged.length}): ${repo.unstaged.map((f) => `${f.status} ${f.path}`).join(", ") || "none"}`,
          repo.commits[0]
            ? `HEAD: ${repo.commits[0].shortOid} ${repo.commits[0].subject}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        if (summaryLines !== node.text) {
          onEditNode(node.id, { text: summaryLines, branch: repo.branch });
        }
      }
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }, [bridge, cwd, node.id, node.gitCommitOid, node.text, onEditNode, onError]);

  useEffect(() => {
    void refresh();
  }, [cwd]);

  const runAction = async (
    action: Parameters<CanvasBridge["gitAction"]>[0]["action"] | "init",
    extra: Partial<Parameters<CanvasBridge["gitAction"]>[0]> = {},
  ) => {
    setBusy(true);
    try {
      const next = await bridge.gitAction({
        cwd,
        expectedRevision: action === "init" ? undefined : status?.revision,
        action: action as Parameters<CanvasBridge["gitAction"]>[0]["action"],
        ...extra,
      });
      setStatus(next);
      onRefreshStructure();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const inspectFileDiff = async (path: string, staged: boolean) => {
    try {
      const res = await bridge.gitDiff({
        cwd,
        target: staged ? "staged" : "working",
        path,
      });
      setDiffView(res);
      if (res.text.trim()) {
        onEditNode(node.id, {
          text: `# ${res.title}\n${res.text}`,
          gitCommitOid: undefined,
        });
      }
    } catch (err) {
      onError(err);
    }
  };

  const inspectCommit = async (oid: string, subject: string) => {
    try {
      const res = await bridge.gitDiff({
        cwd,
        target: "commit",
        commitOid: oid,
      });
      setDiffView(res);
      onEditNode(node.id, {
        gitCommitOid: oid,
        text: `Commit ${oid.slice(0, 7)}: ${subject}\n\n${res.text}`,
      });
    } catch (err) {
      onError(err);
    }
  };

  if (!status) {
    return <div className="fs-loading">{t("git")}…</div>;
  }
  if (!status.isGitRepo) {
    return (
      <div className="node-empty fs-tool-empty-cta">
        <Icon name="gitInit" />
        <b>{t("gitNotRepoTitle")}</b>
        <p>{t("gitNotRepoDesc")}</p>
        {status.cwd && (
          <small className="muted user-content">{status.cwd}</small>
        )}
        <div
          className="button-row"
          style={{ justifyContent: "center", marginTop: 8 }}
        >
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => {
              if (onInitGit) {
                onInitGit();
              } else {
                void runAction("init");
              }
            }}
          >
            <Icon name="gitInit" />
            <span>{t("initGitRepo")}</span>
          </button>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <Icon name="refresh" />
            <span>{t("refreshSnapshot")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fs-tool-body">
      <div className="fs-git-bar">
        <span className="fs-git-branch-chip">
          <Icon name="branch" />
          <b>{status.branch || "HEAD"}</b>
          {(status.ahead > 0 || status.behind > 0) && (
            <small>
              ↑{status.ahead} ↓{status.behind}
            </small>
          )}
        </span>
        <div className="fs-git-sync-btns">
          <button
            type="button"
            className="icon-button"
            title={t("fetch")}
            disabled={busy}
            onClick={() => void runAction("fetch")}
          >
            <Icon name="download" />
          </button>
          <button
            type="button"
            className="icon-button"
            title={t("push")}
            disabled={busy}
            onClick={() => void runAction("push")}
          >
            <Icon name="upload" />
          </button>
          <button
            type="button"
            className="icon-button"
            title={t("refreshSnapshot")}
            disabled={busy}
            onClick={() => void refresh()}
          >
            <Icon name="refresh" />
          </button>
        </div>
      </div>

      <div className="node-tabs" role="tablist">
        {(
          [
            [
              "changes",
              t("gitChanges"),
              status.staged.length + status.unstaged.length,
            ],
            ["history", t("gitHistory"), status.commits.length],
            ["branches", t("gitBranches"), status.branches.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onEditNode(node.id, { gitTab: id })}
          >
            {label}
            {count > 0 && <span>{count}</span>}
          </button>
        ))}
      </div>

      <div className="node-scroll fs-tool-scroll">
        {tab === "changes" && (
          <>
            <div className="fs-git-commit-row">
              <label
                htmlFor={commitInputId}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                }}
              >
                {t("commitMessagePlaceholder")}
              </label>
              <input
                id={commitInputId}
                className="text-field"
                placeholder={t("commitMessagePlaceholder")}
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) {
                      return;
                    }
                    if (commitMsg.trim() && status.staged.length) {
                      e.preventDefault();
                      const msg = commitMsg;
                      setCommitMsg("");
                      void runAction("commit", { message: msg });
                    }
                  }
                }}
              />
              <button
                type="button"
                className="button button-primary"
                disabled={
                  busy || !commitMsg.trim() || status.staged.length === 0
                }
                onClick={() => {
                  const msg = commitMsg;
                  setCommitMsg("");
                  void runAction("commit", { message: msg });
                }}
              >
                {t("commitChanges")}
              </button>
            </div>

            <div className="fs-git-section-head">
              <span>
                {t("stagedFiles")} ({status.staged.length})
              </span>
              {status.staged.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void runAction("unstageAll")}
                >
                  {t("unstageAll")}
                </button>
              )}
            </div>
            {status.staged.map((f) => (
              <div key={`s-${f.path}`} className="fs-git-file-row">
                <span className={`fs-git-badge st-${f.status}`}>
                  {f.status}
                </span>
                <button
                  type="button"
                  className="fs-git-file-btn user-content"
                  onClick={() => void inspectFileDiff(f.path, true)}
                >
                  {f.path}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("gitUnstageFile")}
                  onClick={() => void runAction("unstage", { paths: [f.path] })}
                >
                  <Icon name="off" />
                </button>
              </div>
            ))}

            <div className="fs-git-section-head">
              <span>
                {t("workingFiles")} ({status.unstaged.length})
              </span>
              {status.unstaged.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void runAction("stageAll")}
                >
                  {t("stageAll")}
                </button>
              )}
            </div>
            {status.unstaged.map((f) => (
              <div key={`u-${f.path}`} className="fs-git-file-row">
                <span className={`fs-git-badge st-${f.status}`}>
                  {f.status}
                </span>
                <button
                  type="button"
                  className="fs-git-file-btn user-content"
                  onClick={() => void inspectFileDiff(f.path, false)}
                >
                  {f.path}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("gitStageFile")}
                  onClick={() => void runAction("stage", { paths: [f.path] })}
                >
                  <Icon name="plus" />
                </button>
              </div>
            ))}

            {diffView && (
              <div className="fs-git-patch-box">
                <div className="fs-git-section-head">
                  <b className="user-content">{diffView.title}</b>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      onExtractDisplay(
                        `Git · ${diffView.title}`,
                        diffView.text || diffView.title,
                      )
                    }
                  >
                    <Icon name="quote" />
                    <span>{t("wireReference")}</span>
                  </button>
                </div>
                <DiffHunks hunks={diffView.hunks} />
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <div className="fs-commit-list">
              {status.commits.map((c, idx) => (
                <div
                  key={c.oid}
                  className={`fs-commit-row ${node.gitCommitOid === c.oid ? "selected" : ""}`}
                >
                  <svg
                    className="fs-commit-lane"
                    viewBox="0 0 18 28"
                    aria-hidden="true"
                  >
                    {idx > 0 && <line x1="9" y1="0" x2="9" y2="14" />}
                    {idx < status.commits.length - 1 && (
                      <line x1="9" y1="14" x2="9" y2="28" />
                    )}
                    {c.parents.length > 1 && (
                      <path d="M9 14 C 15 14, 15 24, 15 28" fill="none" />
                    )}
                    <circle cx="9" cy="14" r="3.4" />
                  </svg>
                  <button
                    type="button"
                    className="fs-commit-main user-content"
                    onClick={() => void inspectCommit(c.oid, c.subject)}
                  >
                    <b>{c.subject}</b>
                    <small>
                      <code>{c.shortOid}</code> · {c.author} · {c.relativeTime}
                    </small>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={t("wireReference")}
                    onClick={() => {
                      void bridge
                        .gitDiff({ cwd, target: "commit", commitOid: c.oid })
                        .then((res) =>
                          onExtractDisplay(
                            `Commit ${c.shortOid}`,
                            `${c.oid}\n${c.subject}\n\n${res.text}`,
                          ),
                        )
                        .catch(onError);
                    }}
                  >
                    <Icon name="quote" />
                  </button>
                </div>
              ))}
            </div>
            {diffView && (
              <div className="fs-git-patch-box">
                <div className="fs-git-section-head">
                  <b className="user-content">{diffView.title}</b>
                </div>
                <DiffHunks hunks={diffView.hunks} />
              </div>
            )}
          </>
        )}

        {tab === "branches" && (
          <>
            <div className="button-row" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className="button"
                onClick={() =>
                  onPromptForm({
                    title: t("createBranch"),
                    initialValue: "feat/",
                    secondaryLabel: t("gitBaseRef"),
                    secondaryInitial: status.branch || "HEAD",
                    onSubmit: (branch, baseRef) =>
                      void runAction("createBranch", { branch, baseRef }),
                  })
                }
              >
                <Icon name="branch" />
                <span>{t("createBranch")}</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() =>
                  onPromptForm({
                    title: t("createWorktree"),
                    initialValue: "feat/canvas-wt",
                    onSubmit: (branch) =>
                      void runAction("createWorktree", { branch }),
                  })
                }
              >
                <Icon name="worktree" />
                <span>{t("createWorktree")}</span>
              </button>
            </div>

            <div className="fs-git-section-head">
              <span>{t("showBranches")}</span>
            </div>
            {status.branches.map((br) => (
              <div key={br.name} className="fs-git-file-row">
                <Icon name="branch" />
                <span className="fs-git-file-btn user-content">
                  <b>{br.name}</b>{" "}
                  {br.worktreePath && (
                    <small>
                      ({br.worktreePath.split(/[\\/]/).pop()})
                    </small>
                  )}
                </span>
                {!br.current && !br.worktreePath && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      void runAction("createWorktree", { branch: br.name })
                    }
                  >
                    +WT
                  </button>
                )}
              </div>
            ))}

            <div className="fs-git-section-head">
              <span>
                {t("gitWorktreesCount", { count: status.worktrees.length })}
              </span>
            </div>
            {status.worktrees.map((wt) => (
              <div key={wt.path} className="fs-git-file-row">
                <Icon name="worktree" />
                <span className="fs-git-file-btn user-content">
                  <b>{wt.branch || "HEAD"}</b> ·{" "}
                  <small>{wt.path.split(/[\\/]/).pop()}</small>
                </span>
                {!wt.isMain && (
                  <button
                    type="button"
                    className="icon-button danger"
                    title={t("delete")}
                    onClick={() =>
                      void runAction("removeWorktree", {
                        worktreePath: wt.path,
                      })
                    }
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** Native @deepseek-ai/dsh-workspace-changes canvas node body (M07). */
export function ChangesNodeBody({
  node,
  doc,
  snapshot,
  bridge,
  onEditNode,
  onExtractDisplay,
  onError,
}: {
  node: FlowNode;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onExtractDisplay: (title: string, text: string) => void;
  onError: (err: unknown) => void;
}) {
  const [turns, setTurns] = useState<SessionChangeTurn[]>([]);
  const [selectedDiff, setSelectedDiff] = useState<SessionFileDiffView | null>(
    null,
  );

  const boundAgents = doc.nodes.filter(
    (n) => n.kind === "agent" && Boolean(n.sessionId),
  );
  const activeSessionId =
    node.changesSessionId || boundAgents[0]?.sessionId || "";

  useEffect(() => {
    if (!activeSessionId) {
      setTurns([]);
      return;
    }
    if (activeSessionId !== node.changesSessionId) {
      onEditNode(node.id, { changesSessionId: activeSessionId });
    }
    void bridge
      .sessionChanges(activeSessionId)
      .then((list) => {
        setTurns(list);
        const target =
          (node.changesSeq !== undefined
            ? list.find((c) => c.seq === node.changesSeq)
            : undefined) ?? list[0];
        if (target && node.changesSeq !== target.seq) {
          const summary =
            `Turn #${target.turn} (${target.total} files, +${target.added} / -${target.deleted})\n` +
            target.files
              .map((f) => `- ${f.display} (+${f.added} / -${f.deleted})`)
              .join("\n");
          onEditNode(node.id, {
            changesSessionId: activeSessionId,
            changesSeq: target.seq,
            changesTurn: target.turn,
            text: node.text || summary,
          });
        }
      })
      .catch(() => {
        const liveTurns =
          snapshot?.live.find((l) => l.sessionId === activeSessionId)
            ?.changesTurns ?? [];
        setTurns(liveTurns);
      });
  }, [activeSessionId, snapshot?.live]);

  const activeTurn =
    turns.find((c) => c.seq === node.changesSeq) ?? turns[0] ?? null;

  const loadDiff = async (seq: number, fileIndex?: number) => {
    if (!activeSessionId) return;
    try {
      const diff = await bridge.sessionChangeDiff(
        activeSessionId,
        seq,
        fileIndex,
      );
      setSelectedDiff(diff);
      // Persist deterministic diff snapshot onto node.text (survives Host restart! M07)
      onEditNode(node.id, {
        changesSessionId: activeSessionId,
        changesSeq: seq,
        text: diff.formatted,
      });
    } catch (err) {
      onError(err);
    }
  };

  return (
    <div className="fs-tool-body">
      <div className="fs-git-bar">
        <select
          className="fs-compact-select"
          value={activeSessionId}
          onChange={(e) =>
            onEditNode(node.id, {
              changesSessionId: e.target.value || undefined,
              changesSeq: undefined,
            })
          }
        >
          <option value="">{t("selectAgentOption")}</option>
          {boundAgents.map((ag) => (
            <option key={ag.id} value={ag.sessionId}>
              {ag.title}
            </option>
          ))}
        </select>

        {turns.length > 0 && (
          <select
            className="fs-compact-select"
            value={activeTurn?.seq ?? ""}
            onChange={(e) => {
              const seq = Number(e.target.value);
              const found = turns.find((x) => x.seq === seq);
              onEditNode(node.id, {
                changesSeq: seq,
                changesTurn: found?.turn,
              });
              void loadDiff(seq);
            }}
          >
            {turns.map((trItem) => (
              <option key={trItem.seq} value={trItem.seq}>
                {t("turnChanges", { turn: trItem.turn })} (+{trItem.added}/-
                {trItem.deleted})
              </option>
            ))}
          </select>
        )}

        {activeSessionId && (
          <button
            type="button"
            className="icon-button"
            title={t("openNativeChat")}
            onClick={() => bridge.openChat(activeSessionId)}
          >
            <Icon name="pop" />
          </button>
        )}
      </div>

      <div className="node-scroll fs-tool-scroll">
        {activeTurn ? (
          <>
            <div className="fs-git-section-head">
              <span>
                {t("turnChanges", { turn: activeTurn.turn })} ·{" "}
                {t("filesCount", { count: activeTurn.total })}
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() => void loadDiff(activeTurn.seq)}
              >
                <Icon name="diff" />
                <span>{t("diffAction")}</span>
              </button>
            </div>
            {activeTurn.files.map((f, idx) => (
              <div key={f.path} className="fs-git-file-row">
                <button
                  type="button"
                  className="fs-git-file-btn user-content"
                  onClick={() => void loadDiff(activeTurn.seq, idx)}
                >
                  {f.display}
                </button>
                <small className="fs-diff-stat">
                  <span className="add">+{f.added}</span>{" "}
                  <span className="del">-{f.deleted}</span>
                </small>
                <button
                  type="button"
                  className="icon-button"
                  title={t("wireReference")}
                  onClick={() =>
                    void bridge
                      .sessionChangeDiff(activeSessionId, activeTurn.seq, idx)
                      .then((d) =>
                        onExtractDisplay(
                          `${t("turnChanges", { turn: activeTurn.turn })} · ${f.display}`,
                          d.formatted,
                        ),
                      )
                      .catch(onError)
                  }
                >
                  <Icon name="quote" />
                </button>
              </div>
            ))}

            {selectedDiff ? (
              <div className="fs-git-patch-box">
                <div className="fs-git-section-head">
                  <b className="user-content">{selectedDiff.display}</b>
                </div>
                <DiffHunks hunks={selectedDiff.hunks} />
              </div>
            ) : node.text ? (
              <pre className="file-preview user-content">{node.text}</pre>
            ) : null}
          </>
        ) : node.text ? (
          <pre className="file-preview user-content">{node.text}</pre>
        ) : (
          <div className="node-empty">
            <Icon name="diff" />
            <p>{t("noChangesYet")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Native @deepseek-ai/dsh-api-terminal-controller Phase 1 screen snapshot node (M09). */
export function TerminalNodeBody({
  node,
  doc,
  bridge,
  onEditNode,
  onExtractDisplay,
  onError,
}: {
  node: FlowNode;
  doc: FlowspaceDocument;
  bridge: CanvasBridge;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onExtractDisplay: (title: string, text: string) => void;
  onError: (err: unknown) => void;
}) {
  const [terminals, setTerminals] = useState<SessionTerminalBrief[]>([]);
  const [busy, setBusy] = useState(false);

  const boundAgents = doc.nodes.filter(
    (n) => n.kind === "agent" && Boolean(n.sessionId),
  );
  const activeSessionId =
    node.terminalSessionId || boundAgents[0]?.sessionId || "";

  const refreshScreen = useCallback(
    async (sid = activeSessionId, termId = node.terminalId) => {
      if (!sid) return;
      setBusy(true);
      try {
        const list = await bridge.sessionTerminals(sid);
        setTerminals(list);
        if (list.length) {
          const snap = await bridge.readTerminalScreen(
            sid,
            termId ?? list[0].id,
            160,
          );
          onEditNode(node.id, {
            terminalSessionId: sid,
            terminalId: snap.terminalId || list[0].id,
            text: snap.text || node.text,
          });
        }
      } catch (err) {
        onError(err);
      } finally {
        setBusy(false);
      }
    },
    [
      activeSessionId,
      bridge,
      node.id,
      node.terminalId,
      node.text,
      onEditNode,
      onError,
    ],
  );

  const createSessionTerminal = useCallback(() => {
    if (!activeSessionId) return;
    setBusy(true);
    void bridge
      .openSessionTerminal(activeSessionId)
      .then((created) => refreshScreen(activeSessionId, created.id))
      .catch((err) => {
        setBusy(false);
        onError(err);
      });
  }, [activeSessionId, bridge, onError, refreshScreen]);

  useEffect(() => {
    if (activeSessionId) void refreshScreen(activeSessionId, node.terminalId);
  }, [activeSessionId]);

  return (
    <div className="fs-tool-body">
      <div className="fs-git-bar">
        <select
          className="fs-compact-select"
          value={activeSessionId}
          onChange={(e) => {
            const sid = e.target.value;
            onEditNode(node.id, {
              terminalSessionId: sid || undefined,
              terminalId: undefined,
            });
            if (sid) void refreshScreen(sid, undefined);
          }}
        >
          <option value="">{t("selectAgentOption")}</option>
          {boundAgents.map((ag) => (
            <option key={ag.id} value={ag.sessionId}>
              {ag.title}
            </option>
          ))}
        </select>

        {terminals.length > 0 && (
          <select
            className="fs-compact-select"
            value={node.terminalId ?? terminals[0]?.id ?? ""}
            onChange={(e) => {
              const tid = e.target.value;
              onEditNode(node.id, { terminalId: tid });
              void refreshScreen(activeSessionId, tid);
            }}
          >
            {terminals.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.title} ({tm.state})
              </option>
            ))}
          </select>
        )}

        <div className="fs-git-sync-btns">
          {activeSessionId && (
            <button
              type="button"
              className="icon-button"
              title={t("openTerminal")}
              disabled={busy}
              onClick={createSessionTerminal}
            >
              <Icon name="termPlus" />
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            title={t("refreshSnapshot")}
            disabled={busy || !activeSessionId}
            onClick={() => void refreshScreen()}
          >
            <Icon name="refresh" />
          </button>
          {activeSessionId && (
            <button
              type="button"
              className="icon-button"
              title={t("openNativeChat")}
              onClick={() => bridge.openChat(activeSessionId)}
            >
              <Icon name="pop" />
            </button>
          )}
        </div>
      </div>

      <div className="node-scroll fs-tool-scroll">
        {node.text ? (
          <>
            <div className="fs-git-section-head">
              <span>{t("terminalScreenHeader")}</span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const sel = window.getSelection()?.toString().trim();
                  onExtractDisplay(
                    `${node.title} · ${t("terminalScreenHeader")}`,
                    sel || node.text,
                  );
                }}
              >
                <Icon name="quote" />
                <span>{t("wireReference")}</span>
              </button>
            </div>
            <pre className="file-preview fs-terminal-pre user-content">
              {node.text}
            </pre>
          </>
        ) : (
          <div className="node-empty fs-tool-empty-cta">
            <Icon name="termPlus" />
            <p>
              {activeSessionId
                ? t("noTerminalsYet")
                : t("terminalSelectAgentHint")}
            </p>
            {activeSessionId && (
              <button
                type="button"
                className="button button-primary"
                style={{ marginTop: 8 }}
                disabled={busy}
                onClick={createSessionTerminal}
              >
                <Icon name="termPlus" />
                <span>{t("openTerminal")}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
