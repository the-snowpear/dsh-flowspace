import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  CanvasPrefs,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GroupPort,
  LaunchPlan,
  SessionBrief,
  WorkflowTemplate,
  WorkspaceFilePreview,
} from "../../types.ts";
import { newNode, uid } from "../../core/document.ts";
import type { CanvasBridge } from "../bridge.ts";
import { CanvasDialog } from "../CanvasDialog.tsx";
import { clamp, inferGroupPorts } from "../geometry.ts";
import { t, tr } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import type { ExchangePair } from "../sceneWires.ts";
import { formatTime, MiniGraph, nodeStatusOf } from "../SurfaceViews.tsx";
import {
  synchronizeTemplate,
  teamRevisionDifferences,
  type SyncPlan,
} from "../templates.ts";
import { PromptDialog, type PromptDialogSpec } from "../ui/PromptDialog.tsx";
import {
  linkWireDrop,
  type PaletteEntry,
  type QuickCreateState,
} from "./canvasGraphOps.ts";

export interface CanvasDialogsHostProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  prefs: Required<Pick<CanvasPrefs, "theme" | "wheel" | "wireRouting" | "snap" | "filter">>;
  activeWorkspaceId: string;
  activeWorkspaceCwd: string | undefined;
  paletteDialog: { targetNodeId: string | null; query: string; index: number } | null;
  setPaletteDialog: Dispatch<SetStateAction<{ targetNodeId: string | null; query: string; index: number } | null>>;
  paletteEntries: PaletteEntry[];
  launchDialog: { plan: LaunchPlan; excluded: Set<string> } | null;
  setLaunchDialog: Dispatch<SetStateAction<{ plan: LaunchPlan; excluded: Set<string> } | null>>;
  formModal: PromptDialogSpec | null;
  setFormModal: Dispatch<SetStateAction<PromptDialogSpec | null>>;
  sessionModal: SessionBrief[] | null;
  setSessionModal: Dispatch<SetStateAction<SessionBrief[] | null>>;
  sessionWireDrop: MutableRefObject<QuickCreateState | null>;
  fileModal: WorkspaceFilePreview | null;
  setFileModal: Dispatch<SetStateAction<WorkspaceFilePreview | null>>;
  templatePreviewModal: WorkflowTemplate | null;
  setTemplatePreviewModal: Dispatch<SetStateAction<WorkflowTemplate | null>>;
  syncModal: { groupId: string; plan: SyncPlan } | null;
  setSyncModal: Dispatch<SetStateAction<{ groupId: string; plan: SyncPlan } | null>>;
  mergePortsModal: { groupId: string; name: string; selectedPortIds: Set<string> } | null;
  setMergePortsModal: Dispatch<SetStateAction<{ groupId: string; name: string; selectedPortIds: Set<string> } | null>>;
  exchangeModal: ExchangePair | null;
  setExchangeModal: Dispatch<SetStateAction<ExchangePair | null>>;
  helpModal: boolean;
  setHelpModal: Dispatch<SetStateAction<boolean>>;
  isNodeVisible: (n: FlowNode | undefined, allowCollapsedChild?: boolean) => boolean;
  edit: (mutator: (draft: FlowspaceDocument) => void, options?: { remember?: boolean; delay?: number }) => void;
  editNode: (id: string, changes: Partial<FlowNode>, options?: { remember?: boolean; delay?: number }) => void;
  revealNode: (id: string) => void;
  setBottomOpen: (open: boolean) => void;
  reportError: (err: unknown) => void;
  showToast: (msg: unknown, isError?: boolean) => void;
  handleInstantiateTemplate: (template: WorkflowTemplate) => void;
  extractDisplayFrom: (sourceId: string, text?: string, seq?: number, fixed?: boolean) => void;
}

export function CanvasDialogsHost({
  doc,
  snapshot,
  bridge,
  prefs,
  activeWorkspaceId,
  activeWorkspaceCwd,
  paletteDialog,
  setPaletteDialog,
  paletteEntries,
  launchDialog,
  setLaunchDialog,
  formModal,
  setFormModal,
  sessionModal,
  setSessionModal,
  sessionWireDrop,
  fileModal,
  setFileModal,
  templatePreviewModal,
  setTemplatePreviewModal,
  syncModal,
  setSyncModal,
  mergePortsModal,
  setMergePortsModal,
  exchangeModal,
  setExchangeModal,
  helpModal,
  setHelpModal,
  isNodeVisible,
  edit,
  editNode,
  revealNode,
  setBottomOpen,
  reportError,
  showToast,
  handleInstantiateTemplate,
  extractDisplayFrom,
}: CanvasDialogsHostProps) {
  return (
    <>
      {/* ---------- Dialogs Host ---------- */}
      {/* 1. Command & @ Mention Palette */}
      {paletteDialog && (
        <CanvasDialog
          onClose={() => setPaletteDialog(null)}
          ariaLabel={t("commandSearch")}
          variant="command"
        >
          <div className="command-input">
            <Icon name={paletteDialog.targetNodeId ? "at" : "search"} />
            <input
              autoFocus
              placeholder={t("commandSearch")}
              value={paletteDialog.query}
              onChange={(ev) =>
                setPaletteDialog((prev) =>
                  prev ? { ...prev, query: ev.target.value, index: 0 } : null,
                )
              }
              onKeyDown={(ev) => {
                if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
                  ev.preventDefault();
                  setPaletteDialog((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: clamp(
                            prev.index + (ev.key === "ArrowDown" ? 1 : -1),
                            0,
                            Math.max(0, paletteEntries.length - 1),
                          ),
                        }
                      : null,
                  );
                } else if (ev.key === "Enter") {
                  ev.preventDefault();
                  const picked = paletteEntries[paletteDialog.index];
                  if (picked) {
                    setPaletteDialog(null);
                    picked.fn();
                  }
                }
              }}
            />
            <kbd>Esc</kbd>
          </div>
          <div className="command-results">
            {paletteEntries.length ? (
              paletteEntries.map((entry, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`command-result ${paletteDialog.index === idx ? "active" : ""}`}
                  onClick={() => {
                    setPaletteDialog(null);
                    entry.fn();
                  }}
                >
                  <span className="command-icon">
                    <Icon name={entry.icon} />
                  </span>
                  <div>
                    <b className="user-content">{entry.label}</b>
                    {entry.detail && (
                      <small className="user-content">{entry.detail}</small>
                    )}
                  </div>
                  <span>{entry.section}</span>
                  {paletteDialog.index === idx && <kbd>↵</kbd>}
                </button>
              ))
            ) : (
              <div className="command-empty">{t("noSearchResults")}</div>
            )}
          </div>
          <footer className="command-hint">
            <kbd>↑ ↓</kbd>
            <span>{t("rangeSelection")}</span>
            <kbd>Enter</kbd>
            <span>{t(paletteDialog.targetNodeId ? "reference" : "run")}</span>
          </footer>
        </CanvasDialog>
      )}

      {/* 2. 4-Bucket Global Launch Preview Dialog */}
      {launchDialog && (() => {
        const chosenRoots = launchDialog.plan.roots.filter(
          (id) => !launchDialog.excluded.has(id),
        );
        const reach = new Set<string>(chosenRoots);
        const walk = (id: string) => {
          for (const e of doc.edges) {
            if (
              e.kind === "continuation" &&
              e.trigger !== "off" &&
              e.source === id &&
              !reach.has(e.target)
            ) {
              reach.add(e.target);
              walk(e.target);
            }
          }
        };
        chosenRoots.forEach(walk);
        const downstream = [...reach].filter((id) => !chosenRoots.includes(id));
        const confirmIds = downstream.filter((id) => {
          const n = doc.nodes.find((x) => x.id === id);
          return (
            n?.participation === "manual" ||
            doc.edges.some(
              (e) =>
                e.kind === "continuation" &&
                e.target === id &&
                reach.has(e.source) &&
                e.trigger === "confirm",
            )
          );
        });
        const followIds = downstream.filter((id) => !confirmIds.includes(id));
        const skippedRows = [
          ...launchDialog.plan.roots
            .filter((id) => launchDialog.excluded.has(id))
            .map((nodeId) => ({ nodeId, reason: t("cancel") })),
          ...launchDialog.plan.skipped.map((s) => ({
            nodeId: s.nodeId,
            reason: tr(s.reason),
          })),
        ];

        const titleOf = (id: string) =>
          doc.nodes.find((n) => n.id === id)?.title ?? id;
        const upstreamNames = (id: string) =>
          doc.edges
            .filter(
              (e) =>
                e.kind === "continuation" &&
                e.trigger !== "off" &&
                e.target === id &&
                reach.has(e.source),
            )
            .map((e) => titleOf(e.source))
            .join(" + ");

        return (
          <CanvasDialog
            onClose={() => setLaunchDialog(null)}
            title={t("runAll")}
            description={t("launchDescription")}
            closeLabel={t("close")}
            footer={
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() => setLaunchDialog(null)}
                >
                  <span>{t("cancel")}</span>
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={!chosenRoots.length}
                  onClick={() => {
                    const excludeRootIds = [...launchDialog.excluded];
                    setLaunchDialog(null);
                    void bridge
                      .start({
                        kind: "global",
                        nodeIds: [],
                        excludeRootIds,
                      })
                      .then(() => setBottomOpen(true))
                      .catch(reportError);
                  }}
                >
                  <Icon name="play" />
                  <span>{t("runCount", { count: chosenRoots.length })}</span>
                </button>
              </>
            }
          >
            <div className="launch-summary">
              <div className="launch-stat now">
                <b>{chosenRoots.length}</b>
                <span>{t("launchNow")}</span>
              </div>
              <div className="launch-stat next">
                <b>{followIds.length}</b>
                <span>{t("launchNext")}</span>
              </div>
              <div className="launch-stat confirm">
                <b>{confirmIds.length}</b>
                <span>{t("launchConfirm")}</span>
              </div>
              <div className="launch-stat">
                <b>{skippedRows.length}</b>
                <span>{t("launchNone")}</span>
              </div>
            </div>

            <section className="launch-section">
              <h4>{t("launchNow")}</h4>
              {launchDialog.plan.roots.length ? (
                launchDialog.plan.roots.map((id) => {
                  const checked = !launchDialog.excluded.has(id);
                  const hidden = !isNodeVisible(
                    doc.nodes.find((n) => n.id === id),
                    true,
                  );
                  return (
                    <label key={id} className="launch-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) =>
                          setLaunchDialog((prev) => {
                            if (!prev) return null;
                            const next = new Set(prev.excluded);
                            if (ev.target.checked) next.delete(id);
                            else next.add(id);
                            return { ...prev, excluded: next };
                          })
                        }
                      />
                      <span className="node-avatar agent-avatar">
                        <Icon name="agent" />
                      </span>
                      <div>
                        <b className="user-content">{titleOf(id)}</b>
                        {hidden && <small>{t("hidden")}</small>}
                      </div>
                      <span>{t(nodeStatusOf(snapshot, id))}</span>
                    </label>
                  );
                })
              ) : (
                <div className="surface-empty">
                  <h3>{t("noStarters")}</h3>
                  <p>{t("noStartersDescription")}</p>
                </div>
              )}
            </section>

            {followIds.length > 0 && (
              <section className="launch-section">
                <h4>{t("launchNext")}</h4>
                {followIds.map((id) => (
                  <div key={id} className="launch-row is-follow">
                    <i>
                      <Icon name="chev" />
                    </i>
                    <span className="node-avatar agent-avatar">
                      <Icon name="agent" />
                    </span>
                    <div>
                      <b className="user-content">{titleOf(id)}</b>
                      <small>
                        {t("afterStep", { name: upstreamNames(id) })}
                      </small>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {confirmIds.length > 0 && (
              <section className="launch-section">
                <h4>{t("launchConfirm")}</h4>
                {confirmIds.map((id) => (
                  <div key={id} className="launch-row is-follow is-confirm">
                    <i>
                      <Icon name="chev" />
                    </i>
                    <span className="node-avatar agent-avatar">
                      <Icon name="pause" />
                    </span>
                    <div>
                      <b className="user-content">{titleOf(id)}</b>
                      <small>
                        {t("afterStep", { name: upstreamNames(id) })}
                      </small>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {skippedRows.length > 0 && (
              <details className="launch-skipped">
                <summary>
                  <Icon name="chev" />
                  {t("launchNone")} · {skippedRows.length}
                </summary>
                {skippedRows.map((row) => (
                  <div
                    key={row.nodeId}
                    className="launch-row is-follow is-none"
                  >
                    <i />
                    <span className="node-avatar agent-avatar">
                      <Icon name="agent" />
                    </span>
                    <div>
                      <b className="user-content">{titleOf(row.nodeId)}</b>
                      <small>{row.reason}</small>
                    </div>
                  </div>
                ))}
              </details>
            )}
          </CanvasDialog>
        );
      })()}

      {/* 3. Rename / Form Modal */}
      {formModal && (
        <PromptDialog modal={formModal} onClose={() => setFormModal(null)} />
      )}

      {/* 4. Add Existing DSH Session Modal */}
      {sessionModal && (
        <CanvasDialog
          onClose={() => setSessionModal(null)}
          title={t("existingSession")}
          closeLabel={t("close")}
        >
          <div className="fs-session-list">
            {sessionModal.filter(
              (s) => !doc.nodes.some((n) => n.sessionId === s.sessionId),
            ).length ? (
              sessionModal
                .filter(
                  (s) => !doc.nodes.some((n) => n.sessionId === s.sessionId),
                )
                .map((s) => (
                  <button
                    key={s.sessionId}
                    type="button"
                    className="fs-session-pick"
                    onClick={() => {
                      const drop = sessionWireDrop.current;
                      const created: FlowNode = {
                        ...newNode(
                          "agent",
                          drop?.world.x ?? 120,
                          drop?.world.y ?? 160,
                          s.title,
                        ),
                        sessionId: s.sessionId,
                        cwd: s.cwd,
                        expanded: true,
                        tab: "conversation",
                      };
                      edit((d) => {
                        d.nodes.push(created);
                        if (drop?.wire) linkWireDrop(d, drop.wire, created);
                      });
                      setSessionModal(null);
                      revealNode(created.id);
                    }}
                  >
                    <Icon name="chat" />
                    <div>
                      <b className="user-content">{s.title}</b>
                      {s.cwd && <small>{s.cwd}</small>}
                    </div>
                  </button>
                ))
            ) : (
              <p className="muted">{t("noExistingSessions")}</p>
            )}
          </div>
        </CanvasDialog>
      )}

      {/* 5. Workspace File Preview Modal */}
      {fileModal && (
        <CanvasDialog
          onClose={() => setFileModal(null)}
          title={fileModal.path.split("/").pop()}
          description={fileModal.path}
          closeLabel={t("close")}
          variant="file"
          footer={
            <>
              <button
                type="button"
                className="button"
                onClick={() => {
                  void navigator.clipboard.writeText(fileModal.content);
                  showToast(t("copied"));
                }}
              >
                <Icon name="file" />
                <span>{t("copy")}</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setFileModal(null)}
              >
                <span>{t("close")}</span>
              </button>
            </>
          }
        >
          <div className="code-toolbar">
            <span>
              {t("lineCount", {
                count: fileModal.content.split("\n").length,
              })}
            </span>
          </div>
          <div className="code-view">
            {fileModal.content.split("\n").map((line, i) => (
              <div key={i} className="code-line">
                <span className="line-number">{i + 1}</span>
                <code>{line || " "}</code>
              </div>
            ))}
          </div>
        </CanvasDialog>
      )}

      {/* 6. Template Preview Modal */}
      {templatePreviewModal && (
        <CanvasDialog
          onClose={() => setTemplatePreviewModal(null)}
          title={
            templatePreviewModal.builtin
              ? t(templatePreviewModal.title)
              : templatePreviewModal.title
          }
          description={
            templatePreviewModal.builtin
              ? t(templatePreviewModal.description)
              : templatePreviewModal.description
          }
          closeLabel={t("close")}
          footer={
            <>
              <button
                type="button"
                className="button"
                onClick={() => setTemplatePreviewModal(null)}
              >
                <span>{t("cancel")}</span>
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  const tpl = templatePreviewModal;
                  setTemplatePreviewModal(null);
                  handleInstantiateTemplate(tpl);
                }}
              >
                <Icon name="plus" />
                <span>{t("useTemplate")}</span>
              </button>
            </>
          }
        >
          <div className="template-graph template-preview-graph">
            <MiniGraph
              nodes={templatePreviewModal.nodes}
              edges={templatePreviewModal.edges}
              wireRouting={prefs.wireRouting}
            />
          </div>
          {teamRevisionDifferences(
            templatePreviewModal,
            snapshot?.teamBlueprints,
          ).map((change) => (
            <p key={change.id} className="fs-team-muted">
              {t("teamRevisionDifference", change)}
            </p>
          ))}
          <div className="template-preview-list">
            {templatePreviewModal.nodes
              .filter((n) => n.kind === "agent")
              .map((n) => (
                <div key={n.id}>
                  <Icon name="agent" />
                  <div>
                    <b className="user-content">{n.title}</b>
                    <p className="user-content">{n.task || n.draft}</p>
                  </div>
                </div>
              ))}
          </div>
        </CanvasDialog>
      )}

      {/* 7. Template Sync Diff Modal */}
      {syncModal && (
        <CanvasDialog
          onClose={() => setSyncModal(null)}
          title={t("syncTemplate")}
          description={t("syncDialogDescription")}
          closeLabel={t("close")}
          footer={
            <>
              <button
                type="button"
                className="button"
                onClick={() => setSyncModal(null)}
              >
                <span>{t("cancel")}</span>
              </button>
              {syncModal.plan.edited.length > 0 && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    const { groupId, plan } = syncModal;
                    setSyncModal(null);
                    edit((d) =>
                      synchronizeTemplate(d, groupId, plan.template, false, {
                        workspaceId: activeWorkspaceId || undefined,
                        cwd: activeWorkspaceCwd,
                      }),
                    );
                    showToast(t("templateSynced"));
                  }}
                >
                  <span>{t("syncUseTemplate")}</span>
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  const { groupId, plan } = syncModal;
                  setSyncModal(null);
                  edit((d) =>
                    synchronizeTemplate(d, groupId, plan.template, true, {
                      workspaceId: activeWorkspaceId || undefined,
                      cwd: activeWorkspaceCwd,
                    }),
                  );
                  showToast(t("templateSynced"));
                }}
              >
                <Icon name="undo" />
                <span>
                  {t(
                    syncModal.plan.edited.length > 0
                      ? "syncKeepMine"
                      : "syncTemplate",
                  )}
                </span>
              </button>
            </>
          }
        >
          <div className="sync-diff">
            <div>
              <Icon name="canvas" />
              <b>{t("syncStructure")}</b>
              <small>v{syncModal.plan.template.revision}</small>
            </div>
            {syncModal.plan.outside > 0 && (
              <div>
                <Icon name="at" />
                <b>{t("syncOutsideKept", { count: syncModal.plan.outside })}</b>
              </div>
            )}
            {syncModal.plan.locked.length > 0 && (
              <div>
                <Icon name="pin" />
                <b>
                  {t("syncRunKept", {
                    count: syncModal.plan.locked.length,
                  })}
                </b>
              </div>
            )}
            {syncModal.plan.added.length > 0 && (
              <div>
                <Icon name="plus" />
                <b>
                  {t("syncAdded", { count: syncModal.plan.added.length })}
                </b>
              </div>
            )}
            {syncModal.plan.removed.length > 0 && (
              <div>
                <Icon name="x" />
                <b>
                  {t("syncRemoved", {
                    count: syncModal.plan.removed.length,
                  })}
                </b>
              </div>
            )}
            {syncModal.plan.edited.map((n) => (
              <div key={n.id}>
                <Icon name="quote" />
                <b className="user-content">{n.title}</b>
                <small>{t("syncEdited")}</small>
              </div>
            ))}
          </div>
        </CanvasDialog>
      )}

      {/* 8. Merge Composite Input Ports Modal */}
      {mergePortsModal && (() => {
        const grp = doc.nodes.find((n) => n.id === mergePortsModal.groupId);
        const inPorts = grp
          ? inferGroupPorts(doc, grp).filter((p) => p.direction === "in")
          : [];
        return (
          <CanvasDialog
            onClose={() => setMergePortsModal(null)}
            title={t("mergePorts")}
            closeLabel={t("close")}
            footer={
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() => setMergePortsModal(null)}
                >
                  <span>{t("cancel")}</span>
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    if (!grp) return;
                    const all = inferGroupPorts(doc, grp);
                    const chosen = inPorts.filter((p) =>
                      mergePortsModal.selectedPortIds.has(p.id),
                    );
                    if (
                      chosen.length >= 2 &&
                      chosen.every(
                        (p) =>
                          p.kind === chosen[0].kind &&
                          (p.portId ?? "in") === (chosen[0].portId ?? "in"),
                      )
                    ) {
                      const merged: GroupPort = {
                        id: uid(),
                        kind: chosen[0].kind,
                        portId: chosen[0].portId,
                        direction: "in",
                        name: mergePortsModal.name || t("inputPort"),
                        nodes: [
                          ...new Set(chosen.flatMap((p) => p.nodes)),
                        ],
                        hidden: false,
                      };
                      editNode(grp.id, {
                        ports: [
                          ...all.filter(
                            (p) => !mergePortsModal.selectedPortIds.has(p.id),
                          ),
                          merged,
                        ],
                      });
                    }
                    setMergePortsModal(null);
                  }}
                >
                  <span>{t("save")}</span>
                </button>
              </>
            }
          >
            <label className="field-label">{t("portName")}</label>
            <input
              className="text-field"
              value={mergePortsModal.name}
              onChange={(ev) =>
                setMergePortsModal((prev) =>
                  prev ? { ...prev, name: ev.target.value } : null,
                )
              }
            />
            <div className="merge-port-list">
              {inPorts.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={mergePortsModal.selectedPortIds.has(p.id)}
                    onChange={(ev) =>
                      setMergePortsModal((prev) => {
                        if (!prev) return null;
                        const next = new Set(prev.selectedPortIds);
                        if (ev.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        return { ...prev, selectedPortIds: next };
                      })
                    }
                  />
                  <span>
                    {t(p.kind)} · {p.name}
                  </span>
                </label>
              ))}
            </div>
          </CanvasDialog>
        );
      })()}

      {/* 9. Exchange History Viewer Modal */}
      {exchangeModal && (
        <CanvasDialog
          onClose={() => setExchangeModal(null)}
          title={t("nativeExchange")}
          description={t("nativeExchangeReadOnly")}
          closeLabel={t("close")}
        >
          <div className="exchange-messages">
            {exchangeModal.items.map((item) => {
              const fromTitle =
                doc.nodes.find((n) => n.id === item.fromId)?.title ??
                item.fromId;
              const toTitle =
                doc.nodes.find((n) => n.id === item.toId)?.title ?? item.toId;
              return (
                <article key={item.id} className="exchange-message">
                  <header>
                    <b className="user-content">
                      {fromTitle} → {toTitle}
                    </b>
                    <time>{formatTime(item.at)}</time>
                  </header>
                  <p className="user-content">{item.text}</p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setExchangeModal(null);
                      extractDisplayFrom(
                        item.fromId,
                        item.text,
                        item.seq,
                        true,
                      );
                    }}
                  >
                    <Icon name="quote" />
                    <span>{t("quoteMessage")}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </CanvasDialog>
      )}

      {/* 10. Help & Wire Legend Modal */}
      {helpModal && (
        <CanvasDialog
          onClose={() => setHelpModal(false)}
          title={t("keyboardHint")}
          description={t("helpDescription")}
          closeLabel={t("close")}
          variant="wide"
          footer={
            <button
              type="button"
              className="button button-primary"
              onClick={() => setHelpModal(false)}
            >
              <span>{t("close")}</span>
            </button>
          }
        >
          {(
            [
              [
                "shortcutSectionCreate",
                [
                  ["quickCreateShortcut", "Tab / Shift A"],
                  ["wireDropShortcut", t("dragWireToEmpty")],
                  ["doubleClickTip", t("doubleClickKey")],
                  ["command", "Ctrl K"],
                ],
              ],
              [
                "shortcutSectionEdit",
                [
                  ["copySelection", "Ctrl C"],
                  ["pasteSelection", "Ctrl V"],
                  ["duplicateSelection", "Ctrl D"],
                  ["selectAllShortcut", "Ctrl A"],
                  ["groupSelection", "G / Ctrl G"],
                  ["ungroup", "Ctrl Shift G"],
                  ["undo", "Ctrl Z"],
                  ["redo", "Ctrl Shift Z"],
                  ["deleteNode", "Delete"],
                ],
              ],
              [
                "shortcutSectionRun",
                [
                  ["runSelection", "Ctrl Enter"],
                  ["toggleBypass", "Ctrl B"],
                  ["toggleMute", "Ctrl M"],
                  ["executionDetail", "D"],
                ],
              ],
              [
                "shortcutSectionView",
                [
                  ["pan", "Space + Drag"],
                  ["rangeSelection", "Shift + Drag"],
                  ["fitView", "F / Shift F"],
                  ["openWindow", "Alt Enter"],
                  ["shortcutHelp", "?"],
                ],
              ],
            ] as const
          ).map(([section, rows]) => (
            <section key={section} className="shortcut-section">
              <h3>{t(section)}</h3>
              <div className="shortcut-list">
                {rows.map(([key, sc]) => (
                  <div key={key}>
                    <span>{t(key)}</span>
                    <kbd>{sc}</kbd>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="help-legend">
            <svg viewBox="0 0 64 16">
              <path
                d="M2 8H62"
                stroke="var(--text-2)"
                strokeWidth="2.8"
              />
            </svg>
            <b>{t("legendContinuation")}</b>
            <svg viewBox="0 0 64 16">
              <path
                d="M2 8H62"
                stroke="var(--accent)"
                strokeWidth="1.6"
                strokeDasharray="5 4"
              />
            </svg>
            <b>{t("legendReference")}</b>
            <svg viewBox="0 0 64 16">
              <path
                d="M2 8C20 1 44 1 62 8"
                stroke="var(--m-f)"
                strokeWidth="1.5"
              />
              <path
                d="M2 8C20 15 44 15 62 8"
                stroke="var(--m-b)"
                strokeWidth="1.5"
              />
            </svg>
            <b>{t("legendExchange")}</b>
            <svg viewBox="0 0 64 16">
              <path
                d="M2 8H62"
                stroke="var(--k-display)"
                strokeWidth="1.4"
                strokeDasharray="1.5 4"
              />
            </svg>
            <b>{t("legendDisplay")}</b>
          </div>
        </CanvasDialog>
      )}

    </>
  );
}
