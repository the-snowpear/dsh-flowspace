import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type {
  AgentTab,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  FlowToken,
  LiveNodeState,
  RunStep,
  TeamModelRoute,
  TeamSlotView,
  WorkspaceBrief,
  WorkspaceStructureBrief,
} from "../../../types.ts";
import { referenceTitle } from "../../../core/document.ts";
import { isTeamNode } from "../../../core/team.ts";
import type { CanvasBridge } from "../../bridge.ts";
import { capsuleStateOf } from "../../geometry.ts";
import { t } from "../../i18n.ts";
import { Icon, kindIconName } from "../../icons.tsx";
import { formatTime } from "../../SurfaceViews.tsx";
import { CrewFrame } from "../../TeamCanvas.tsx";
import type { PayloadPeekState } from "../canvasGraphOps.ts";
import type { CardActionHandlers } from "../canvasTypes.ts";
import { EmbeddedSession, type CardUiState } from "../ViewportCard.tsx";

export interface AgentNodeBodyProps {
  node: FlowNode;
  placement: "canvas" | "window" | "conversation";
  docSettings: FlowspaceDocument["settings"];
  snapshot: FlowspaceSnapshot | null;
  nodesById: Map<string, FlowNode>;
  crewNodes: FlowNode[];
  workspaces: WorkspaceBrief[];
  projectStructures: WorkspaceStructureBrief[];
  activeWorkspaceId: string;
  bridge: CanvasBridge;
  cardActions: CardActionHandlers;
  state: string;
  live: LiveNodeState | undefined;
  nodeSteps: RunStep[];
  waitingGates: { run: FlowspaceRun; token: FlowToken }[];
  incomingRefs: FlowEdge[];
  hasForkInbound: boolean;
  hasActiveInboundContinuation: boolean;
  latestOutput: string;
  isTeam: boolean;
  staffed: Set<string>;
  teamSlots: TeamSlotView[];
  rowChildren: number;
  modelRoutes: TeamModelRoute[];
  ui: CardUiState | undefined;
  emissionReminder: ReactNode;
  openTeam: (nodeId: string, rowId?: string) => void;
  reportError: (err: unknown) => void;
  renderConversation: (node: FlowNode | undefined, reference: SessionReference) => ReactNode;
  onPresenceChange: (sessionId: string, mounted: boolean) => void;
  setEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setPaletteDialog: Dispatch<
    SetStateAction<{ targetNodeId: string | null; query: string; index: number } | null>
  >;
  setPayloadPeek: Dispatch<SetStateAction<PayloadPeekState | null>>;
  setQuoteState: Dispatch<SetStateAction<{ nodeId: string; text: string } | null>>;
}

export function AgentNodeBody({
  node,
  placement,
  docSettings,
  snapshot,
  nodesById,
  crewNodes,
  workspaces,
  projectStructures,
  activeWorkspaceId,
  bridge,
  cardActions,
  state,
  live,
  nodeSteps,
  waitingGates,
  incomingRefs,
  hasForkInbound,
  hasActiveInboundContinuation,
  latestOutput,
  isTeam,
  staffed,
  teamSlots,
  rowChildren,
  modelRoutes,
  ui,
  emissionReminder,
  openTeam,
  reportError,
  renderConversation,
  onPresenceChange,
  setEditingNodeId,
  setPaletteDialog,
  setPayloadPeek,
  setQuoteState,
}: AgentNodeBodyProps) {
  const {
    editNode,
    editEdge,
    edit,
    revealNode,
    openDetailCard,
    bindAgentSession,
    openAnchoredMenu,
    extractDisplayFrom,
    launchScope,
  } = cardActions;

  const activeTab: AgentTab = node.tab ?? "task";
  const wsName =
    workspaces.find((w) => w.id === node.workspaceId)?.name ||
    node.cwd?.split(/[\\/]/).filter(Boolean).pop() ||
    t("currentWorkspace");
  const affiliationLabel = [
    wsName,
    node.branch,
    node.worktreePath ? node.worktreePath.split(/[\\/]/).pop() : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const nativeEnabled =
    node.nativeTrigger === "inherit"
      ? docSettings.nativeChatTriggers
      : node.nativeTrigger === "enabled";
  const queuedCount = nodeSteps.filter((s) => s.state === "queued").length;

  const renderCapsuleTray = () => (
    <>
      <div className="context-label">
        <Icon name="at" />
        <span>{t("context")}</span>
        <button
          type="button"
          aria-label={t("addContext")}
          onClick={() =>
            setPaletteDialog({
              targetNodeId: node.id,
              query: "",
              index: 0,
            })
          }
        >
          <Icon name="plus" />
        </button>
      </div>
      <div className="reference-tray">
        {incomingRefs.length ? (
          incomingRefs.map((refEdge) => {
            const src = nodesById.get(refEdge.source);
            const capState = capsuleStateOf(refEdge, snapshot?.sourceVersions);
            const capLabel = referenceTitle(src, refEdge);
            return (
              <button
                key={refEdge.id}
                type="button"
                className={`capsule capsule-${capState}`}
                title={`${capLabel} · ${t(`${capState}Tip`)}`}
                onClick={(ev) => {
                  const capRect = ev.currentTarget.getBoundingClientRect();
                  openAnchoredMenu(ev.currentTarget, [
                    {
                      label: t("inspectPayload"),
                      icon: "xray",
                      fn: () =>
                        setPayloadPeek({
                          edgeId: refEdge.id,
                          anchor: { x: capRect.left, y: capRect.bottom },
                        }),
                    },
                    {
                      label: t("viewSource"),
                      icon: "chev",
                      fn: () => revealNode(refEdge.source),
                    },
                    ...(refEdge.sentVersion && !refEdge.always
                      ? [
                          {
                            label: t("rearmCapsule"),
                            icon: "refresh",
                            fn: () => editEdge(refEdge.id, { sentVersion: "" }),
                          },
                        ]
                      : []),
                    {
                      label: t("always"),
                      icon: "pin",
                      checked: refEdge.always,
                      fn: () =>
                        editEdge(refEdge.id, {
                          always: !refEdge.always,
                        }),
                    },
                    {
                      label: t("deleteConnection"),
                      icon: "trash",
                      danger: true,
                      fn: () =>
                        edit((d) => {
                          d.edges = d.edges.filter((x) => x.id !== refEdge.id);
                        }),
                    },
                  ]);
                }}
              >
                <Icon name={kindIconName(src?.kind ?? "file", src?.flowType)} />
                <span>{capLabel}</span>
                {capState === "updated" && (
                  <i className="fs-capsule-update-dot" />
                )}
                {refEdge.always && <Icon name="pin" />}
              </button>
            );
          })
        ) : (
          <button
            type="button"
            className="empty-reference"
            onClick={() =>
              setPaletteDialog({
                targetNodeId: node.id,
                query: "",
                index: 0,
              })
            }
          >
            <Icon name="plus" />
            <span>{t("addContext")}</span>
          </button>
        )}
      </div>
    </>
  );

  const effectiveTab: AgentTab =
    placement === "conversation"
      ? "conversation"
      : !node.sessionId && activeTab === "conversation"
        ? "task"
        : activeTab === "crew" && !isTeam
          ? "task"
          : activeTab;
  const tabs: AgentTab[] = isTeam
    ? ["task", "conversation", "execution", "crew"]
    : ["task", "conversation", "execution"];
  const usesContinuationPreset =
    Boolean(node.sessionId) && hasActiveInboundContinuation;

  return (
    <div className="agent-body">
      <div className="agent-status-row">
        <span
          className={`status status-${waitingGates.length ? "waiting" : state}`}
        >
          <i />
          {t(waitingGates.length ? "waitingConfirmation" : state)}
        </span>
        {queuedCount > 0 && (
          <span className="queue-count">
            <Icon name="clock" />
            {queuedCount}
          </span>
        )}
        {emissionReminder}
        {!node.sessionId && (
          <button
            type="button"
            className={`fs-plan-chip ${node.planMode ? "active" : ""}`}
            onClick={() => editNode(node.id, { planMode: !node.planMode })}
          >
            {t("planMode")}
          </button>
        )}
        {isTeamNode(node, staffed) && (
          <button
            type="button"
            className="fs-plan-chip fs-team-enter"
            onClick={() => openTeam(node.id)}
          >
            <Icon name="team" />
            <span>{t("teamEnter")}</span>
            <Icon name="chev" />
          </button>
        )}
        {node.sessionId && (
          <>
            {rowChildren > 0 && (
              <button
                type="button"
                className={`fs-plan-chip ${node.subAgentsExpanded !== false ? "active" : ""}`}
                onClick={() =>
                  editNode(node.id, {
                    subAgentsExpanded: node.subAgentsExpanded === false,
                  })
                }
                title={t("subagents")}
              >
                <Icon name="agent" />
                <span>{rowChildren}</span>
              </button>
            )}
            {nodeSteps.length > 0 && (
              <button
                type="button"
                className="fs-plan-chip"
                onClick={() => openDetailCard(node.id)}
                title={t("executionDetail")}
              >
                <Icon name="bolt" />
                <span>{nodeSteps.length}</span>
              </button>
            )}
            {effectiveTab === "conversation" && (
              <button
                type="button"
                className="fs-plan-chip fs-back-overview-chip"
                style={{ marginLeft: "auto" }}
                onClick={() => editNode(node.id, { tab: "task" })}
                title={t("backToOverview")}
              >
                <Icon name="card" />
                <span>{t("overviewTab")}</span>
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              style={
                effectiveTab === "conversation"
                  ? undefined
                  : { marginLeft: "auto" }
              }
              title={t("openNativeChat")}
              onClick={() => bridge.openChat(node.sessionId!)}
            >
              <Icon name="pop" />
            </button>
          </>
        )}
      </div>

      {placement !== "conversation" && (
        <div className="node-tabs" role="tablist" aria-label={node.title}>
          {tabs.map((tb) => (
            <button
              key={tb}
              type="button"
              role="tab"
              aria-selected={effectiveTab === tb}
              onClick={() => {
                if (tb === "conversation" && !node.sessionId) {
                  bindAgentSession(node);
                  return;
                }
                editNode(node.id, { tab: tb });
              }}
            >
              {t(
                tb === "crew"
                  ? "teamCrewTab"
                  : tb === "task"
                    ? "overviewTab"
                    : tb === "conversation"
                      ? "conversationTab"
                      : "execution",
              )}
              {tb === "crew" && teamSlots.length > 0 && (
                <span>{teamSlots.length}</span>
              )}
              {tb === "execution" && nodeSteps.length > 0 && (
                <span>{nodeSteps.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {waitingGates.map(({ run, token }) => (
        <div className="approval-box fs-card-top-gate" key={token.id}>
          <span className="approval-heading">
            <Icon name="pause" />
            <b>
              {t(token.boundary ? "scopeBoundary" : "waitingConfirmation")}
            </b>
            <span className="user-content">· {token.source.title}</span>
          </span>
          {token.source.text && (
            <div className="approval-snippet user-content">
              {token.source.text.slice(0, 180)}
            </div>
          )}
          <div className="button-row">
            <button
              type="button"
              className="button button-amber"
              onClick={() =>
                void bridge.release(run.id, token.id, true).catch(reportError)
              }
            >
              <Icon name="play" />
              <span>{t("release")}</span>
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() =>
                void bridge.release(run.id, token.id, false).catch(reportError)
              }
            >
              <span>{t("dismiss")}</span>
            </button>
          </div>
        </div>
      ))}

      {effectiveTab === "crew" ? (
        <CrewFrame
          node={node}
          nodes={crewNodes}
          snapshot={snapshot}
          status={state}
          routes={modelRoutes}
          onEditTeam={(teamConfig) => editNode(node.id, { teamConfig })}
          onLayout={(teamLayout) => editNode(node.id, { teamLayout })}
          onOpen={(rowId) => openTeam(node.id, rowId)}
        />
      ) : effectiveTab === "conversation" && node.sessionId ? (
        <>
          {hasActiveInboundContinuation && (
            <div className="fs-continuation-bar">
              <button
                type="button"
                className="fs-continuation-bar-toggle"
                onClick={() =>
                  editNode(node.id, {
                    continuationCollapsed: !node.continuationCollapsed,
                  })
                }
              >
                <Icon name="bolt" />
                <span>{t("continuationInstruction")}</span>
                <Icon name="chev" />
              </button>
              {!node.continuationCollapsed && (
                <textarea
                  className="fs-continuation-input"
                  rows={2}
                  placeholder={t("continuationPlaceholder")}
                  value={node.continuationPrompt ?? node.task}
                  onFocus={() => setEditingNodeId(node.id)}
                  onBlur={() => setEditingNodeId(null)}
                  onChange={(e) =>
                    editNode(node.id, {
                      continuationPrompt: e.target.value,
                    })
                  }
                />
              )}
            </div>
          )}

          <div
            className="agent-embedded-wrap"
            onMouseUp={() => {
              const sel = window.getSelection()?.toString().trim();
              if (sel) setQuoteState({ nodeId: node.id, text: sel });
            }}
          >
            {ui?.quoteText && (
              <div className="quote-selection-bar">
                <span>{t("quoteSelection")}</span>
                <div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      extractDisplayFrom(
                        node.id,
                        ui.quoteText!,
                        live?.seq,
                        true,
                      );
                      setQuoteState(null);
                    }}
                  >
                    <Icon name="quote" />
                    <span>{t("quoteMessage")}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setQuoteState(null)}
                  >
                    <Icon name="x" />
                  </button>
                </div>
              </div>
            )}
            <EmbeddedSession
              node={node}
              bridge={bridge}
              renderConversation={renderConversation}
              onError={reportError}
              onPresenceChange={onPresenceChange}
            />
          </div>
        </>
      ) : effectiveTab === "execution" ? (
        <div className="node-scroll">
          {nodeSteps.length ? (
            [...nodeSteps].reverse().map((step) => (
              <div key={step.id} className={`event-row event-${step.state}`}>
                <i className="event-dot">
                  <Icon
                    name={
                      step.state === "completed"
                        ? "check"
                        : step.state === "queued"
                          ? "clock"
                          : "bolt"
                    }
                  />
                </i>
                <div>
                  <b>
                    {t(step.state)} ·{" "}
                    {t("roundBadge", { round: step.iteration })}
                  </b>
                  {step.error && <p className="danger">{step.error}</p>}
                  {step.output && (
                    <p className="user-content">
                      {step.output.slice(0, 180)}
                      {step.output.length > 180 ? "…" : ""}
                    </p>
                  )}
                </div>
                {step.output && (
                  <button
                    type="button"
                    className="icon-button"
                    title={t("quoteMessage")}
                    onClick={() =>
                      extractDisplayFrom(
                        node.id,
                        step.output,
                        step.endSeq,
                        true,
                      )
                    }
                  >
                    <Icon name="quote" />
                  </button>
                )}
                <time>{formatTime(step.createdAt)}</time>
              </div>
            ))
          ) : (
            <div className="node-empty">
              <Icon name="bolt" />
              <p>{t("noEvents")}</p>
            </div>
          )}
        </div>
      ) : (
        /* Agent Overview Page (概览页: works both for Draft & Bound Sessions while preserving M02) */
        <>
          <div className="node-scroll task-content">
            {hasForkInbound && !node.sessionId && (
              <p className="muted">{t("forkDraftHint")}</p>
            )}
            {latestOutput && (
              <div className="fs-overview-output">
                <div className="fs-overview-output-head">
                  <span>{t("latestConclusion")}</span>
                  <button
                    type="button"
                    className="icon-button"
                    title={t("quoteMessage")}
                    onClick={() =>
                      extractDisplayFrom(node.id, latestOutput, live?.seq, true)
                    }
                  >
                    <Icon name="quote" />
                  </button>
                </div>
                <div className="latest-output-preview user-content">
                  {latestOutput.slice(0, 260)}
                  {latestOutput.length > 260 ? "…" : ""}
                </div>
              </div>
            )}
            <div className="task-label">
              {t(
                usesContinuationPreset
                  ? "continuationInstruction"
                  : node.sessionId
                    ? "savedTask"
                    : "task",
              )}
            </div>
            <textarea
              className="task-editor"
              aria-label={`${node.title} · ${t("task")}`}
              placeholder={t(
                usesContinuationPreset
                  ? "continuationPlaceholder"
                  : "taskPlaceholder",
              )}
              spellCheck={false}
              value={
                usesContinuationPreset
                  ? (node.continuationPrompt ?? node.task)
                  : node.draft || node.task
              }
              onFocus={() => setEditingNodeId(node.id)}
              onBlur={() => setEditingNodeId(null)}
              onChange={(e) =>
                editNode(
                  node.id,
                  usesContinuationPreset
                    ? { continuationPrompt: e.target.value }
                    : node.sessionId && state !== "draft"
                      ? { task: e.target.value }
                      : { draft: e.target.value, task: e.target.value },
                )
              }
              onKeyDown={(e) => {
                if (e.key === "@" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  setPaletteDialog({
                    targetNodeId: node.id,
                    query: "",
                    index: 0,
                  });
                } else if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  launchScope({ kind: "single", nodeIds: [node.id] });
                }
              }}
            />
            {renderCapsuleTray()}
          </div>

          <footer className="agent-footer">
            <button
              type="button"
              className="model-picker"
              onClick={(ev) => {
                const proj = projectStructures.find(
                  (p) => p.id === (node.workspaceId || activeWorkspaceId),
                );
                openAnchoredMenu(ev.currentTarget, [
                  {
                    label: t("currentWorkspace"),
                    icon: "project",
                    checked: !node.workspaceId && !node.branch,
                    fn: () =>
                      editNode(node.id, {
                        workspaceId: undefined,
                        cwd: undefined,
                        branch: undefined,
                        worktreePath: undefined,
                      }),
                  },
                  ...workspaces.map((w) => ({
                    label: w.name,
                    description: w.path,
                    icon: "project",
                    checked: node.workspaceId === w.id && !node.branch,
                    fn: () =>
                      editNode(node.id, {
                        workspaceId: w.id,
                        cwd: w.path,
                        branch: undefined,
                        worktreePath: undefined,
                      }),
                  })),
                  ...(proj?.branches.length
                    ? [
                        { divider: true },
                        { heading: t("showBranches") },
                        ...proj.branches.slice(0, 8).map((br) => ({
                          label: br.name,
                          description: br.worktreePath || t("createWorktree"),
                          icon: "branch",
                          checked: node.branch === br.name,
                          fn: () =>
                            editNode(node.id, {
                              workspaceId: proj.id,
                              branch: br.name,
                              worktreePath: br.worktreePath,
                              cwd: br.worktreePath || proj.path,
                            }),
                        })),
                      ]
                    : []),
                ]);
              }}
            >
              <Icon name={node.branch ? "branch" : "project"} />
              <span>{affiliationLabel}</span>
            </button>
            <button
              type="button"
              className="mode-picker"
              title={t("nativeTriggerLabel")}
              onClick={(ev) =>
                openAnchoredMenu(
                  ev.currentTarget,
                  (
                    [
                      [
                        "inherit",
                        t("inheritGlobal", {
                          state: docSettings.nativeChatTriggers
                            ? t("enabled")
                            : t("disabled"),
                        }),
                      ],
                      ["enabled", t("enabled")],
                      ["disabled", t("disabled")],
                    ] as const
                  ).map(([val, label]) => ({
                    label,
                    icon: "bolt",
                    checked: node.nativeTrigger === val,
                    fn: () => editNode(node.id, { nativeTrigger: val }),
                  })),
                )
              }
            >
              <Icon name="bolt" />
              <span>
                {nativeEnabled
                  ? t("nativeTriggerOn")
                  : t("nativeTriggerOff")}
              </span>
            </button>
            <div className="agent-controls">
              {(node.sessionId || !hasForkInbound) && (
                <button
                  type="button"
                  className="icon-button"
                  title={t(
                    node.sessionId ? "openChatView" : "bindConversation",
                  )}
                  onClick={() =>
                    node.sessionId
                      ? editNode(node.id, { tab: "conversation" })
                      : bindAgentSession(node)
                  }
                >
                  <Icon name="chat" />
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                disabled={!(node.draft.trim() || node.task.trim())}
                onClick={() => {
                  editNode(node.id, { tab: "conversation" });
                  launchScope({ kind: "single", nodeIds: [node.id] });
                }}
              >
                <Icon name="play" />
                <span>
                  {t(node.sessionId && state !== "draft" ? "rerun" : "run")}
                </span>
              </button>
            </div>
          </footer>
        </>
      )}

      <div
        className={`progress-line ${state === "running" ? "is-running" : ""}`}
      >
        <i />
      </div>
    </div>
  );
}
