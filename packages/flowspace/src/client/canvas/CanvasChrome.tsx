import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type {
  CanvasPrefs,
  CanvasSnapshot,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  NodeKind,
  SessionBrief,
  TeamModel,
  TeamModelRoute,
  WorkflowImportRequest,
  WorkflowTemplate,
} from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { CanvasDialog } from "../CanvasDialog.tsx";
import { fit, nodeBox, type Box } from "../geometry.ts";
import { setLanguage, t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { BatchHuman } from "../nodes/InteractionViews.tsx";
import { ArenaDialog, ReplayDock, ReportDialog, replayAt } from "../nodes/PlayViews.tsx";
import { VariablePanel } from "../nodes/Variables.tsx";
import { PayloadPeekPopover } from "../PayloadPeekPopover.tsx";
import { QuickCreateMenu, type QuickCreateSelection } from "../QuickCreateMenu.tsx";
import type { DraftAffiliation } from "../structure.ts";
import {
  ActivitySurface,
  nodeStatusOf,
  RunOverviewDock,
  SettingsSurface,
  WorkflowsSurface,
} from "../SurfaceViews.tsx";
import { AvatarStack, ModelChip, TeamAvatar } from "../TeamControls.tsx";
import { TeamView } from "../TeamView.tsx";
import { ContextMenu, type MenuItem, type MenuState } from "../ui/ContextMenu.tsx";
import { WorkflowImportDialog } from "../WorkflowImportDialog.tsx";
import type {
  PayloadPeekState,
  QuickCreateState,
  RouteId,
} from "./canvasGraphOps.ts";
import type {
  AnchorTarget,
  EditDocFn,
  ResolvedCanvasPrefs,
  SelectionState,
} from "./canvasTypes.ts";
import { EmbeddedSession, type CardRenderer } from "./ViewportCard.tsx";

export interface CanvasReplayViewProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  replayRun: FlowspaceRun;
  replayTime: number;
  setReplayTime: Dispatch<SetStateAction<number>>;
  onExit: () => void;
  displayedTheme: "dark" | "light";
  reducedMotion: boolean;
  vpSize: { width: number; height: number };
  renderNodeCard: CardRenderer;
}

export function CanvasReplayView({
  doc,
  snapshot,
  replayRun,
  replayTime,
  setReplayTime,
  onExit,
  displayedTheme,
  reducedMotion,
  vpSize,
  renderNodeCard,
}: CanvasReplayViewProps) {
  const frame = replayAt(replayRun, replayTime);
  const projected: FlowspaceSnapshot = {
    document: { ...doc, ...frame.graph },
    runs: [frame],
    live: [],
    variables: snapshot?.variables?.map((variable) => {
      const logs = variable.history.filter((write) => write.at <= replayTime);
      const current = logs.at(-1);
      return {
        ...variable,
        history: logs,
        version: current?.version ?? 0,
        value: current?.to ?? variable.history[0]?.from ?? variable.value,
      };
    }),
  };
  const nodes = frame.graph.nodes.filter(
    (node) => node.kind !== "group" && !node.removed,
  );
  const boxes = new Map(nodes.map((node) => [node.id, nodeBox(node, true)]));
  const focus =
    frame.steps.findLast((step) => ["running", "awaiting"].includes(step.state)) ??
    frame.steps.at(-1);
  const focusBox = focus && boxes.get(focus.nodeId);
  const camera = focusBox
    ? {
        x: (vpSize.width || 960) / 2 - (focusBox.x + focusBox.w / 2) * 0.8,
        y: (vpSize.height || 640) / 2 - (focusBox.y + focusBox.h / 2) * 0.8,
        zoom: 0.8,
      }
    : fit(
        { width: vpSize.width || 960, height: vpSize.height || 640 },
        [...boxes.values()],
      );

  return (
    <div
      className="fs-root fs-replay-mode"
      data-theme={displayedTheme}
      data-perf-tier={reducedMotion ? "L1" : "L3"}
    >
      <div className="fs-replay-banner">
        <Icon name="replay" />
        {t("flow_replay_readonly")} · {replayRun.title}
      </div>
      <div
        className="fs-viewport fs-replay-scene"
        ref={(element) => {
          if (element) element.inert = true;
        }}
      >
        <div
          className="fs-camera"
          style={{
            transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`,
          }}
        >
          <div className="fs-world">
            <svg className="fs-edges-svg fs-replay-wires" aria-hidden="true">
              {frame.graph.edges.map((edge) => {
                const a = boxes.get(edge.source),
                  b = boxes.get(edge.target);
                if (!a || !b) return null;
                const token = frame.tokens.findLast(
                  (tok) => tok.edgeId === edge.id,
                );
                const y1 = a.y + 21,
                  y2 = b.y + 21;
                const bend = Math.max(40, (b.x - a.x - a.w) / 2);
                return (
                  <path
                    className={`edge-path edge-${edge.kind} ${token?.skip ? "edge-state-skipped" : token ? "edge-state-done" : ""}`}
                    key={edge.id}
                    d={`M ${a.x + a.w} ${y1} C ${a.x + a.w + bend} ${y1}, ${b.x - bend} ${y2}, ${b.x} ${y2}`}
                  />
                );
              })}
            </svg>
            {nodes.map((node) => (
              <div className="fs-card-slot" key={node.id}>
                {renderNodeCard(
                  node,
                  "canvas",
                  projected,
                  boxes.get(node.id)!,
                  true,
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ReplayDock
        run={replayRun}
        time={replayTime}
        setTime={setReplayTime}
        exit={onExit}
      />
    </div>
  );
}

export interface CanvasRouteSurfacesProps {
  routeName: RouteId;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  prefs: ResolvedCanvasPrefs;
  lod: boolean;
  openTeamNode: FlowNode | undefined;
  teamFocus: string | undefined;
  libraryTab: "patterns" | "mine" | "snapshots" | "teams";
  setLibraryTab: Dispatch<
    SetStateAction<"patterns" | "mine" | "snapshots" | "teams">
  >;
  activityTab: "runs" | "outputs" | "waiting";
  setActivityTab: Dispatch<SetStateAction<"runs" | "outputs" | "waiting">>;
  conversationFocusAgent: FlowNode | undefined;
  selectionNodeSet: Set<string>;
  quoteState: { nodeId: string; text: string } | null;
  importInputRef: RefObject<HTMLInputElement>;
  viewAnimToken: MutableRefObject<number>;
  cardBoxes: (node: FlowNode) => [Box, Box];
  renderNodeCard: CardRenderer;
  renderConversation: (
    node: FlowNode | undefined,
    reference: SessionReference,
  ) => ReactNode;
  onPresenceChange: (sessionId: string, mounted: boolean) => void;
  bindAgentSession: (node: FlowNode) => void;
  createCanvasNode: (
    kind: NodeKind,
    at?: { x: number; y: number },
    affiliation?: DraftAffiliation,
    expanded?: boolean,
  ) => FlowNode;
  openAnchoredMenu: (anchor: AnchorTarget, items: MenuItem[]) => void;
  edit: EditDocFn;
  updatePrefs: (changes: Partial<CanvasPrefs>) => void;
  handleInstantiateTemplate: (template: WorkflowTemplate) => void;
  handleExportTemplate: (template: WorkflowTemplate) => void;
  handleExportJson: () => void;
  handleRestoreSnapshot: (snap: CanvasSnapshot) => void;
  loadStarter: () => void;
  revealNode: (id: string) => void;
  extractDisplayFrom: (
    sourceId: string,
    text?: string,
    seq?: number,
    fixed?: boolean,
  ) => void;
  pinDeliverable: (nodeId: string, text: string, title?: string) => void;
  reportError: (err: unknown) => void;
  setLastAgentId: Dispatch<SetStateAction<string>>;
  setTemplatePreviewModal: Dispatch<SetStateAction<WorkflowTemplate | null>>;
  setReplayTime: Dispatch<SetStateAction<number>>;
  setReplayRun: Dispatch<SetStateAction<FlowspaceRun | undefined>>;
  setReportRun: Dispatch<SetStateAction<FlowspaceRun | undefined>>;
  setArenaOpen: Dispatch<SetStateAction<boolean>>;
  setBatchHumanId: Dispatch<SetStateAction<string | undefined>>;
  setSessionModal: Dispatch<SetStateAction<SessionBrief[] | null>>;
}

export function CanvasRouteSurfaces({
  routeName,
  setRouteName,
  doc,
  snapshot,
  bridge,
  prefs,
  lod,
  openTeamNode,
  teamFocus,
  libraryTab,
  setLibraryTab,
  activityTab,
  setActivityTab,
  conversationFocusAgent,
  selectionNodeSet,
  quoteState,
  importInputRef,
  viewAnimToken,
  cardBoxes,
  renderNodeCard,
  renderConversation,
  onPresenceChange,
  bindAgentSession,
  createCanvasNode,
  openAnchoredMenu,
  edit,
  updatePrefs,
  handleInstantiateTemplate,
  handleExportTemplate,
  handleExportJson,
  handleRestoreSnapshot,
  loadStarter,
  revealNode,
  extractDisplayFrom,
  pinDeliverable,
  reportError,
  setLastAgentId,
  setTemplatePreviewModal,
  setReplayTime,
  setReplayRun,
  setReportRun,
  setArenaOpen,
  setBatchHumanId,
  setSessionModal,
}: CanvasRouteSurfacesProps) {
  return (
    <>
      {routeName === "team" &&
        (openTeamNode ? (
          <TeamView
            key={`${openTeamNode.id}:${teamFocus ?? ""}`}
            node={openTeamNode}
            snapshot={snapshot}
            nodes={doc.nodes}
            initialSelection={teamFocus}
            status={nodeStatusOf(snapshot, openTeamNode.id)}
            bridge={bridge}
            leadConversation={
              <EmbeddedSession
                node={openTeamNode}
                bridge={bridge}
                renderConversation={renderConversation}
                onError={reportError}
                onPresenceChange={onPresenceChange}
              />
            }
            renderConversation={renderConversation}
            onBindLead={() => bindAgentSession(openTeamNode)}
            onError={reportError}
            onBack={() => setRouteName("canvas")}
          />
        ) : (
          <button
            type="button"
            className="button"
            onClick={() => setRouteName("canvas")}
          >
            {t("returnCanvas")}
          </button>
        ))}

      {routeName === "workflows" && (
        <WorkflowsSurface
          tab={libraryTab}
          onTabChange={setLibraryTab}
          bridge={bridge}
          doc={doc}
          snapshot={snapshot}
          onInstantiate={handleInstantiateTemplate}
          onPreviewTemplate={setTemplatePreviewModal}
          onExportTemplate={handleExportTemplate}
          onImport={() => importInputRef.current?.click()}
          onDeleteTemplate={(id) =>
            edit((d) => {
              d.templates = (d.templates ?? []).filter((x) => x.id !== id);
            })
          }
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={(id) =>
            edit((d) => {
              d.snapshots = (d.snapshots ?? []).filter((x) => x.id !== id);
            })
          }
          onReturnCanvas={() => setRouteName("canvas")}
        />
      )}

      {routeName === "activity" && (
        <ActivitySurface
          tab={activityTab}
          onTabChange={setActivityTab}
          doc={doc}
          snapshot={snapshot}
          onReplay={(run) => {
            viewAnimToken.current++;
            setReplayTime(run.createdAt);
            setReplayRun(structuredClone(run));
          }}
          onReport={setReportRun}
          onArena={() => setArenaOpen(true)}
          onBatchHuman={setBatchHumanId}
          onRevealNode={revealNode}
          onRunCommand={(runId, action) =>
            void bridge.command(runId, action).catch(reportError)
          }
          onRerunFailed={(runId) =>
            void bridge.rerunFailed(runId).catch(reportError)
          }
          onReleaseToken={(runId, tokenId, accept) =>
            void bridge.release(runId, tokenId, accept).catch(reportError)
          }
          onExtractStep={(nodeId, text, seq) =>
            extractDisplayFrom(nodeId, text, seq, true)
          }
          onPinDeliverable={pinDeliverable}
          onReturnCanvas={() => setRouteName("canvas")}
        />
      )}

      {routeName === "settings" && (
        <SettingsSurface
          doc={doc}
          prefs={prefs}
          onUpdatePrefs={updatePrefs}
          onUpdateSettings={(changes) =>
            edit((d) => {
              d.settings = { ...d.settings, ...changes };
            })
          }
          onToggleLanguage={(lang) => setLanguage(lang)}
          onExportJson={handleExportJson}
          onTriggerImport={() => importInputRef.current?.click()}
          onOpenExistingSessions={() =>
            void bridge.sessions().then(setSessionModal).catch(reportError)
          }
          onLoadStarter={loadStarter}
        />
      )}

      {routeName === "conversation" && (
        <div className="fs-conversation-surface">
          <header className="conversation-heading">
            <span>
              <Icon name="chat" />
              <b className="user-content">
                {conversationFocusAgent?.title ?? t("newAgent")}
              </b>
            </span>
            <button
              type="button"
              className="button"
              onClick={(ev) =>
                openAnchoredMenu(
                  ev.currentTarget,
                  doc.nodes
                    .filter((n) => n.kind === "agent")
                    .map((ag) => ({
                      label: ag.title,
                      icon: "agent",
                      checked: conversationFocusAgent?.id === ag.id,
                      fn: () => setLastAgentId(ag.id),
                    })),
                )
              }
            >
              <Icon name="agent" />
              <span>Agent</span>
            </button>
            {conversationFocusAgent?.sessionId && (
              <button
                type="button"
                className="button"
                onClick={() =>
                  bridge.openChat(conversationFocusAgent.sessionId!)
                }
              >
                <Icon name="pop" />
                <span>{t("openNativeChat")}</span>
              </button>
            )}
            <button
              type="button"
              className="button"
              onClick={() => setRouteName("canvas")}
            >
              <Icon name="canvas" />
              <span>{t("returnCanvas")}</span>
            </button>
          </header>
          <div className="conversation-node-host">
            {conversationFocusAgent ? (
              renderNodeCard(
                conversationFocusAgent,
                "conversation",
                snapshot,
                cardBoxes(conversationFocusAgent)[Number(lod)],
                undefined,
                undefined,
                undefined,
                0,
                {
                  selected: selectionNodeSet.has(conversationFocusAgent.id),
                  quoteText:
                    quoteState?.nodeId === conversationFocusAgent.id
                      ? quoteState.text
                      : undefined,
                },
              )
            ) : (
              <div className="surface-empty" style={{ width: "100%" }}>
                <Icon name="agent" />
                <h3>{t("noStarters")}</h3>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    const created = createCanvasNode("agent");
                    setLastAgentId(created.id);
                  }}
                >
                  <Icon name="plus" />
                  <span>{t("newAgent")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export interface CanvasBottomDrawerProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  bottomOpen: boolean;
  setBottomOpen: Dispatch<SetStateAction<boolean>>;
  bottomTab: "events" | "outputs" | "waiting";
  setBottomTab: Dispatch<SetStateAction<"events" | "outputs" | "waiting">>;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  revealNode: (id: string) => void;
  extendLoop: (runId: string, stepId: string) => void;
  extractDisplayFrom: (
    sourceId: string,
    text?: string,
    seq?: number,
    fixed?: boolean,
  ) => void;
  pinDeliverable: (nodeId: string, text: string, title?: string) => void;
  reportError: (err: unknown) => void;
}

export function CanvasBottomDrawer({
  doc,
  snapshot,
  bridge,
  bottomOpen,
  setBottomOpen,
  bottomTab,
  setBottomTab,
  setRouteName,
  revealNode,
  extendLoop,
  extractDisplayFrom,
  pinDeliverable,
  reportError,
}: CanvasBottomDrawerProps) {
  return (
    <>
      <div className={`fs-bottom-panel ${bottomOpen ? "open" : ""}`}>
        <header className="bottom-panel-header">
          <div>
            {(["events", "outputs", "waiting"] as const).map((tb) => (
              <button
                key={tb}
                type="button"
                className={bottomTab === tb ? "active" : ""}
                onClick={() => setBottomTab(tb)}
              >
                {t(
                  tb === "events"
                    ? "execution"
                    : tb === "outputs"
                      ? "outputsTab"
                      : "waitingTab",
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => setRouteName("activity")}
          >
            <Icon name="pop" />
            <span>{t("activity")}</span>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setBottomOpen(false)}
          >
            <Icon name="x" />
          </button>
        </header>
        <div className="bottom-panel-content">
          <RunOverviewDock
            doc={doc}
            snapshot={snapshot}
            bridge={bridge}
            tab={
              bottomTab === "events"
                ? "runs"
                : bottomTab === "outputs"
                  ? "outputs"
                  : "waiting"
            }
            onRevealNode={revealNode}
            onRunCommand={(runId, action) =>
              void bridge.command(runId, action).catch(reportError)
            }
            onRerunFailed={(runId) =>
              void bridge.rerunFailed(runId).catch(reportError)
            }
            onReleaseToken={(runId, tokenId, accept) =>
              void bridge.release(runId, tokenId, accept).catch(reportError)
            }
            onExtendLoop={extendLoop}
            onExtractStep={(nodeId, text, seq) =>
              extractDisplayFrom(nodeId, text, seq, true)
            }
            onPinDeliverable={pinDeliverable}
          />
        </div>
      </div>

      <button
        type="button"
        className="fs-bottom-toggle"
        onClick={() => setBottomOpen((v) => !v)}
      >
        <Icon name="bolt" />
        <span>{t("activity")}</span>
        <span className="bottom-event-count">{snapshot?.runs.length ?? 0}</span>
        <span className="fs-bottom-summary">
          {doc.nodes.filter((n) => n.kind === "agent").length} Agent ·{" "}
          {doc.edges.length} {t("continuation")}/{t("reference")}
        </span>
      </button>
    </>
  );
}

export interface CanvasOverlaysProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  modelRoutes: TeamModelRoute[];
  quickCreate: QuickCreateState | null;
  setQuickCreate: Dispatch<SetStateAction<QuickCreateState | null>>;
  handleQuickCreateSelect: (selection: QuickCreateSelection) => void;
  variablePanel: boolean;
  setVariablePanel: Dispatch<SetStateAction<boolean>>;
  arenaOpen: boolean;
  setArenaOpen: Dispatch<SetStateAction<boolean>>;
  batchHumanRun: FlowspaceRun | undefined;
  setBatchHumanId: Dispatch<SetStateAction<string | undefined>>;
  reportRun: FlowspaceRun | undefined;
  setReportRun: Dispatch<SetStateAction<FlowspaceRun | undefined>>;
  teamPicker: { at?: { x: number; y: number } } | null;
  setTeamPicker: Dispatch<SetStateAction<{ at?: { x: number; y: number } } | null>>;
  workflowImport: { request: WorkflowImportRequest; missing?: TeamModel[] } | undefined;
  setWorkflowImport: Dispatch<
    SetStateAction<{ request: WorkflowImportRequest; missing?: TeamModel[] } | undefined>
  >;
  finishImport: (savedDoc: FlowspaceDocument, template: boolean) => void;
  payloadPeek: PayloadPeekState | null;
  setPayloadPeek: Dispatch<SetStateAction<PayloadPeekState | null>>;
  menu: MenuState | null;
  setMenu: Dispatch<SetStateAction<MenuState | null>>;
  pendingFocusRef: MutableRefObject<string | null>;
  createCanvasNode: (
    kind: NodeKind,
    at?: { x: number; y: number },
    affiliation?: DraftAffiliation,
    expanded?: boolean,
    options?: { patch?: Partial<FlowNode> },
  ) => FlowNode;
  setLibraryTab: Dispatch<
    SetStateAction<"patterns" | "mine" | "snapshots" | "teams">
  >;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  setSelection: Dispatch<SetStateAction<SelectionState>>;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
}

export function CanvasOverlays({
  doc,
  snapshot,
  bridge,
  modelRoutes,
  quickCreate,
  setQuickCreate,
  handleQuickCreateSelect,
  variablePanel,
  setVariablePanel,
  arenaOpen,
  setArenaOpen,
  batchHumanRun,
  setBatchHumanId,
  reportRun,
  setReportRun,
  teamPicker,
  setTeamPicker,
  workflowImport,
  setWorkflowImport,
  finishImport,
  payloadPeek,
  setPayloadPeek,
  menu,
  setMenu,
  pendingFocusRef,
  createCanvasNode,
  setLibraryTab,
  setRouteName,
  setSelection,
  setInspectorOpen,
}: CanvasOverlaysProps) {
  return (
    <>
      {quickCreate && (
        <QuickCreateMenu
          anchor={quickCreate.anchor}
          doc={doc}
          wireContext={quickCreate.wire}
          onSelect={handleQuickCreateSelect}
          onClose={() => setQuickCreate(null)}
        />
      )}
      {variablePanel && (
        <CanvasDialog
          title={t("flow_variable_panel")}
          variant="wide"
          closeLabel={t("close")}
          onClose={() => setVariablePanel(false)}
        >
          <VariablePanel snapshot={snapshot} bridge={bridge} />
        </CanvasDialog>
      )}
      {arenaOpen && (
        <ArenaDialog snapshot={snapshot} close={() => setArenaOpen(false)} />
      )}
      {batchHumanRun && (
        <BatchHuman
          run={batchHumanRun}
          bridge={bridge}
          onClose={() => setBatchHumanId(undefined)}
        />
      )}
      {reportRun && (
        <ReportDialog
          run={reportRun}
          bridge={bridge}
          models={modelRoutes}
          close={() => setReportRun(undefined)}
        />
      )}
      {teamPicker && (
        <CanvasDialog
          title={t("teamPickBlueprint")}
          className="fs-team-dialog"
          onClose={() => setTeamPicker(null)}
          closeLabel={t("close")}
        >
          <div className="fs-team-picker">
            {(snapshot?.teamBlueprints ?? [])
              .filter((team) => !team.archived)
              .map((team) => (
                <button
                  type="button"
                  className="fs-team-link-row"
                  key={team.id}
                  onClick={() => {
                    const created = createCanvasNode(
                      "agent",
                      teamPicker.at,
                      undefined,
                      false,
                      {
                        patch: {
                          title: team.title,
                          customTitle: true,
                          teamRef: {
                            teamId: team.id,
                            revision: team.revision,
                          },
                          tab: "crew",
                          width: 440,
                          height: 540,
                        },
                      },
                    );
                    pendingFocusRef.current = created.id;
                    setTeamPicker(null);
                  }}
                >
                  <TeamAvatar
                    variant="team"
                    label={team.title}
                    model={team.lead.model}
                  />
                  <span className="fs-team-row-copy">
                    <strong className="user-content">{team.title}</strong>
                    <small>
                      <ModelChip model={team.lead.model} quiet />
                      <span>
                        {t("teamSlotCount", { count: team.slots.length })}
                      </span>
                    </small>
                  </span>
                  <AvatarStack
                    max={4}
                    items={team.slots.map((slot) => ({
                      key: slot.slotId,
                      label: slot.label,
                      model:
                        slot.model ??
                        snapshot?.roles?.find((role) => role.id === slot.roleId)
                          ?.model,
                    }))}
                  />
                  <Icon name="plus" />
                </button>
              ))}
          </div>
          {!(snapshot?.teamBlueprints ?? []).some((team) => !team.archived) && (
            <p className="fs-team-muted">{t("teamNoBlueprint")}</p>
          )}
          <button
            type="button"
            className="text-button fs-team-library-link"
            onClick={() => {
              setTeamPicker(null);
              setLibraryTab("teams");
              setRouteName("workflows");
            }}
          >
            {t("teamOpenLibrary")}
            <Icon name="chev" />
          </button>
        </CanvasDialog>
      )}
      {workflowImport && (
        <WorkflowImportDialog
          request={workflowImport.request}
          bridge={bridge}
          initialMissing={workflowImport.missing}
          onClose={() => setWorkflowImport(undefined)}
          onImported={(imported) =>
            finishImport(imported, !!workflowImport.request.template)
          }
        />
      )}

      {payloadPeek &&
        (() => {
          const peekEdge = doc.edges.find((e) => e.id === payloadPeek.edgeId);
          if (!peekEdge) return null;
          return (
            <PayloadPeekPopover
              anchor={payloadPeek.anchor}
              edge={peekEdge}
              doc={doc}
              snapshot={snapshot}
              bridge={bridge}
              onClose={() => setPayloadPeek(null)}
              onOpenInspector={() => {
                setRouteName("canvas");
                setSelection({ nodes: [], groups: [], edge: peekEdge.id });
                setInspectorOpen(true);
              }}
            />
          );
        })()}

      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
    </>
  );
}
