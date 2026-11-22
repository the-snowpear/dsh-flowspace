import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  TeamModelRoute,
  WorkspaceBrief,
  WorkspaceFilePreview,
  WorkspaceStructureBrief,
} from "../../types.ts";
import { connectionPort } from "../../core/connect.ts";
import { hasStatusPort } from "../../core/nodes/interactions.ts";
import { descriptorOf, portsOf } from "../../core/nodes/registry.ts";
import { isTeamNode } from "../../core/team.ts";
import type { CanvasBridge } from "../bridge.ts";
import { portY, type Box } from "../geometry.ts";
import { t } from "../i18n.ts";
import { Icon, PortMark, kindIconName } from "../icons.tsx";
import { hasUnusedResult, LaneBadges } from "../nodes/FanoutView.tsx";
import { FlowCountdown } from "../nodes/index.ts";
import { Breakpoint } from "../nodes/PlayViews.tsx";
import { runtimeIndex } from "../sceneModel.ts";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import { staffHover } from "../TeamCanvas.tsx";
import { AvatarStack, hueStyle, ModelChip, TeamAvatar } from "../TeamControls.tsx";
import { draftSlots } from "../teamCrew.ts";
import type { PromptDialogSpec } from "../ui/PromptDialog.tsx";
import {
  checkDraggedWire,
  dictRoleLabel,
  wirePortIds,
  type PayloadPeekState,
} from "./canvasGraphOps.ts";
import type {
  CardActionHandlers,
  ConnectingState,
  ConnectSession,
} from "./canvasTypes.ts";
import { AgentNodeBody } from "./cards/AgentNodeBody.tsx";
import {
  renderBasicNodeFullBody,
  renderNodeCompactBody,
} from "./cards/BasicNodeBodies.tsx";
import { CardBody, type CardRenderer, type CardUiState } from "./ViewportCard.tsx";

export interface UseNodeCardRendererOptions {
  doc: FlowspaceDocument;
  docRef: MutableRefObject<FlowspaceDocument>;
  areaRef: RefObject<HTMLDivElement>;
  vpSizeRef: MutableRefObject<{ width: number; height: number }>;
  connectingRef: MutableRefObject<ConnectingState | null>;
  isDraggingRef: MutableRefObject<boolean>;
  contentIndex: {
    nodesById: Map<string, FlowNode>;
    referenceSources: Set<string>;
  };
  edgeIndex: {
    incoming: Map<string, FlowEdge[]>;
    outgoing: Map<string, FlowEdge[]>;
  };
  crewNodes: FlowNode[];
  staffed: Set<string>;
  cardActions: CardActionHandlers;
  workspaces: WorkspaceBrief[];
  projectStructures: WorkspaceStructureBrief[];
  activeWorkspaceId: string;
  workspaceFilesList: string[];
  activeWorkspaceCwd: string | undefined;
  bridge: CanvasBridge;
  reportError: (err: unknown) => void;
  renderConversation: (node: FlowNode | undefined, reference: SessionReference) => ReactNode;
  onPresenceChange: (sessionId: string, mounted: boolean) => void;
  passesNodeFilter: (node: FlowNode | undefined) => boolean;
  connectSession: ConnectSession | null;
  staffDragSession: { roleId?: string; teamId?: string } | null;
  modelRoutes: TeamModelRoute[];
  languageRevision: number;
  openTeam: (nodeId: string, rowId?: string) => void;
  setHoveredEdgeId: Dispatch<SetStateAction<string | null>>;
  setEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setPaletteDialog: Dispatch<
    SetStateAction<{ targetNodeId: string | null; query: string; index: number } | null>
  >;
  setPayloadPeek: Dispatch<SetStateAction<PayloadPeekState | null>>;
  setQuoteState: Dispatch<SetStateAction<{ nodeId: string; text: string } | null>>;
  setFormModal: Dispatch<SetStateAction<PromptDialogSpec | null>>;
  setFileInputDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setFileModal: Dispatch<SetStateAction<WorkspaceFilePreview | null>>;
}

export function useNodeCardRenderer({
  doc,
  docRef,
  areaRef,
  vpSizeRef,
  connectingRef,
  isDraggingRef,
  contentIndex,
  edgeIndex,
  crewNodes,
  staffed,
  cardActions,
  workspaces,
  projectStructures,
  activeWorkspaceId,
  workspaceFilesList,
  activeWorkspaceCwd,
  bridge,
  reportError,
  renderConversation,
  onPresenceChange,
  passesNodeFilter,
  connectSession,
  staffDragSession,
  modelRoutes,
  languageRevision,
  openTeam,
  setHoveredEdgeId,
  setEditingNodeId,
  setPaletteDialog,
  setPayloadPeek,
  setQuoteState,
  setFormModal,
  setFileInputDrafts,
  setFileModal,
}: UseNodeCardRendererOptions): CardRenderer {
  return useCallback(
    (
      node: FlowNode,
      placement: "canvas" | "window" | "conversation",
      snapshot: FlowspaceSnapshot | null,
      box: Box,
      semantic?: boolean,
      prewarmFull?: boolean,
      contentVersion?: object,
      branchOffset = 0,
      ui?: CardUiState,
    ) => {
      const nodesById = contentIndex.nodesById;
      const runtime = runtimeIndex(snapshot);
      const {
        editNode,
        selectNode,
        openNodeContextMenu,
        startNodeMove,
        startResize,
        startPortDrag,
        startInputEdgeDrag,
        openAnchoredMenu,
        extractDisplayFrom,
        toggleNodeForm,
        stopNode,
        returnWindow,
        openWindow,
        openInputHub,
        scheduleCloseInputHub,
        startStaffDrag,
      } = cardActions;

      const awaiting = node.kind === "flow" ? runtime.awaiting.get(node.id) : undefined;
      const flowRun =
        node.kind === "flow"
          ? awaiting?.run ?? runtime.latestRun.get(node.id)
          : undefined;
      const breakpoint = runtime.breakpoints.get(node.id);
      const waitingHuman = awaiting?.step.human;
      const state =
        waitingHuman || breakpoint
          ? "waiting"
          : node.kind === "agent" || node.kind === "flow"
            ? nodeStatusOf(snapshot, node.id)
            : "";
      const waitingGates =
        node.kind === "agent" ? runtime.waiting.get(node.id) ?? [] : [];
      const live = runtime.live.get(node.id);
      const isSelected = Boolean(ui?.selected);
      const compact = placement === "canvas" && Boolean(box.compact);
      const masterHead =
        !!node.masterOf &&
        !!edgeIndex.incoming
          .get(node.id)
          ?.some(
            (edge) =>
              !edge.generatedBy &&
              edge.kind === "continuation" &&
              edge.source === node.masterOf,
          );
      const laneItem =
        node.generatedBy && node.laneIndex !== undefined && node.itemTitle
          ? t("flow_lane_item_name", {
              n: node.laneIndex + 1,
              item: node.itemTitle,
            })
          : undefined;
      const heading =
        node.kind === "board" &&
        !node.customTitle &&
        (node.title === "任务看板" || node.title === "Task board")
          ? t("newBoard")
          : node.title;

      let style: React.CSSProperties | undefined;
      if (placement === "window" && node.window) {
        const aw = areaRef.current?.clientWidth || vpSizeRef.current.width;
        const ah = areaRef.current?.clientHeight || vpSizeRef.current.height;
        const win = node.window;
        const rect =
          win.snap === "left"
            ? { x: 0, y: 0, w: aw / 2, h: ah }
            : win.snap === "right"
              ? { x: aw / 2, y: 0, w: aw / 2, h: ah }
              : win.snap === "max"
                ? { x: 0, y: 0, w: aw, h: ah }
                : win;
        style = {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          zIndex: win.z ?? 12,
        };
      } else if (placement === "canvas") {
        style = {
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
        };
      }
      if (node.kind === "role") {
        style = {
          ...style,
          ...hueStyle(
            node.teamModel ??
              snapshot?.roles?.find((role) => role.id === node.roleRef)?.model,
          ),
        };
      }

      const dragDirection =
        connectSession?.anchor.direction === "in" ? "out" : "in";
      const available = (kind: FlowEdge["kind"], portId: string) =>
        connectSession?.kind === kind &&
        !connectSession.fromIds.includes(node.id) &&
        connectSession.fromIds.some((id) => {
          const fixed = nodesById.get(id);
          return (
            fixed &&
            checkDraggedWire(
              fixed,
              node,
              kind,
              connectSession.anchor,
              portId,
              docRef.current.edges,
            ).ok
          );
        });

      const renderPort = (
        kind: FlowEdge["kind"],
        direction: "in" | "out",
        portId: string = direction,
        label?: string,
      ) => {
        const center = portY(
          node,
          kind,
          compact,
          portId,
          branchOffset,
          undefined,
          direction,
        );
        const socketY = portY(
          node,
          kind,
          compact,
          portId,
          branchOffset,
          box.h,
          direction,
        );
        if (socketY !== center) return null;
        const input = direction === "in";
        const edges =
          (input ? edgeIndex.incoming : edgeIndex.outgoing).get(node.id) ?? [];
        const atPort = edges.filter(
          (edge) =>
            edge.kind === kind &&
            ((input ? edge.targetPort : edge.sourcePort) ?? direction) ===
              portId,
        );
        const incoming = input
          ? atPort.filter((edge) =>
              passesNodeFilter(nodesById.get(edge.source)),
            )
          : [];
        const lastEdge = incoming.at(-1);
        const multi = incoming.length > 1;
        const linked =
          atPort.length > 0 ||
          (kind === "reference" &&
            (input
              ? node.kind === "display" && !!node.sourceNodeId
              : contentIndex.referenceSources.has(node.id)));
        const fromHere = connectSession?.fromIds.includes(node.id);
        const target =
          connectSession &&
          direction === dragDirection &&
          (available(kind, portId) ||
            (input && kind === "continuation" && available("event", portId)));
        const name =
          label ??
          (kind === "reference"
            ? t(input ? "refInput" : "refOutput")
            : t(input ? "contInput" : "contOutput"));
        const type = connectionPort(node, kind, direction, portId)?.dataType;
        const portName = type ? `${name} · ${t("flow_data_" + type)}` : name;
        const title = lastEdge
          ? `${portName} (${incoming.length}) · ${t("dragInputTip")}`
          : portName;
        return (
          <button
            type="button"
            key={`${kind}-${direction}-${portId}`}
            data-node-id={node.id}
            data-port-id={portId}
            data-port-kind={kind}
            data-port-direction={direction}
            className={[
              "port",
              `port-${kind}`,
              `port-${direction}`,
              linked && "is-linked",
              lastEdge && !connectSession && "is-draggable-in",
              multi && "is-multi",
              multi && ui?.hubKind === kind && "is-hub-open",
              fromHere &&
                connectSession?.kind === kind &&
                direction === (connectSession.anchor.direction ?? "out") &&
                portId ===
                  ((input
                    ? connectSession.anchor.targetPort
                    : connectSession.anchor.sourcePort) ?? direction) &&
                "is-dragging-origin",
              target && "port-target",
              target && ui?.snapPortId === portId && "is-snap-locked",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--port-y": `${socketY}px` } as React.CSSProperties}
            title={title}
            aria-label={title}
            onPointerEnter={() => {
              if (connectingRef.current || isDraggingRef.current || !lastEdge)
                return;
              if (multi) openInputHub(node.id, kind);
              else setHoveredEdgeId(lastEdge.id);
            }}
            onPointerLeave={() => {
              if (multi) scheduleCloseInputHub();
              else if (lastEdge)
                setHoveredEdgeId((prev) => (prev === lastEdge.id ? null : prev));
            }}
            onPointerDown={(ev) => {
              if (input && lastEdge) startInputEdgeDrag(ev, lastEdge);
              else if (connectionPort(node, kind, direction, portId)) {
                startPortDrag(
                  ev,
                  [node.id],
                  kind,
                  undefined,
                  undefined,
                  portId,
                  direction,
                );
              }
            }}
          >
            {multi ? (
              <span className="port-multi-count">{incoming.length}</span>
            ) : (
              <PortMark kind={kind} />
            )}
          </button>
        );
      };

      const nodeSteps = runtime.steps.get(node.id) ?? [];
      const missingEmission = runtime.missingEmissions.get(node.id);
      const emissionReminder = (compactView: boolean) =>
        missingEmission && (
          <button
            type="button"
            className={
              compactView
                ? "text-button compact-overview-detail"
                : "button button-quiet"
            }
            title={t("flow_emit_missing")}
            onClick={(event) => {
              event.stopPropagation();
              void bridge
                .remindEmission(missingEmission.runId, missingEmission.step.id)
                .catch(reportError);
            }}
          >
            {t("flow_emit_remind")}
          </button>
        );
      const latestOutput =
        live?.output || nodeSteps.filter((s) => s.output).at(-1)?.output || "";
      const incoming = edgeIndex.incoming.get(node.id) ?? [];
      const incomingRefs = incoming.filter(
        (e) => e.kind === "reference" && e.target === node.id,
      );
      const hasForkInbound = incoming.some(
        (e) => e.target === node.id && e.mode === "fork",
      );
      const hasActiveInboundContinuation = incoming.some(
        (e) =>
          e.kind === "continuation" &&
          e.target === node.id &&
          e.trigger !== "off",
      );

      const roleText = node.roleLabel
        ? dictRoleLabel(node.roleLabel)
        : undefined;
      const isTeam = isTeamNode(node, staffed);
      const team = node.sessionId
        ? snapshot?.teams?.[node.sessionId]
        : undefined;
      const blueprint = node.teamRef
        ? snapshot?.teamBlueprints?.find(
            (item) => item.id === node.teamRef?.teamId,
          )
        : undefined;
      const teamModel =
        team?.leadModel ?? blueprint?.lead.model ?? node.teamConfig?.model;
      const completedTasks =
        team?.tasks.filter((task) => task.status === "completed").length ?? 0;
      const teamSlots = isTeam
        ? team?.slots ?? draftSlots(node, crewNodes, snapshot)
        : [];
      const teamSlotCount = t("teamSlotCount", { count: teamSlots.length });
      const teamStack = teamSlots.map((slot) => ({
        key: slot.slotId,
        label: slot.label,
        model: slot.model.model ? slot.model : undefined,
      }));
      const staffOwner =
        node.kind === "role" && node.staffOf
          ? nodesById.get(node.staffOf)
          : undefined;
      const staffTeam = isTeamNode(staffOwner, staffed)
        ? staffOwner
        : undefined;
      const staffRuntime = staffTeam?.sessionId
        ? snapshot?.teams?.[staffTeam.sessionId]
        : undefined;
      const staffSlot = staffRuntime?.slots.find(
        (slot) => slot.nodeId === node.id,
      )?.slotId;
      const roleRunning =
        !!staffSlot &&
        !!staffRuntime?.members.some(
          (member) =>
            member.slotId === staffSlot && member.activity === "running",
        );
      const roleMembers =
        staffRuntime?.members.filter((member) => member.nodeId === node.id) ??
        [];
      const openRoleMember = (sessionId: string) => {
        if (node.staffOf) openTeam(node.staffOf, sessionId);
      };
      // Native children that hang in this agent's own row: everything but members shown on role nodes.
      const onRole = new Set(
        team?.members.flatMap((member) =>
          member.nodeId && nodesById.get(member.nodeId)?.staffOf === node.id
            ? [member.sessionId]
            : [],
        ),
      );
      const rowChildren =
        node.kind === "agent" && node.sessionId
          ? new Set(
              [
                ...(snapshot?.subagents ?? [])
                  .filter((sub) => sub.parentSessionId === node.sessionId)
                  .map((sub) => sub.sessionId),
                ...(team?.members
                  .filter((member) => member.depth === 1)
                  .map((member) => member.sessionId) ?? []),
              ].filter((id) => !onRole.has(id)),
            ).size
          : 0;

      const renderCompactBody = () =>
        renderNodeCompactBody({
          node,
          semantic,
          doc: docRef.current,
          snapshot,
          bridge,
          flowRun,
          state,
          waitingGates,
          latestOutput,
          workspaces,
          isTeam,
          team,
          completedTasks,
          staffTeam,
          roleMembers,
          openRoleMember,
          emissionReminder: emissionReminder(true),
          reportError,
        });

      const renderFullBody = () => {
        if (node.kind === "agent") {
          return (
            <AgentNodeBody
              node={node}
              placement={placement}
              docSettings={doc.settings}
              snapshot={snapshot}
              nodesById={nodesById}
              crewNodes={crewNodes}
              workspaces={workspaces}
              projectStructures={projectStructures}
              activeWorkspaceId={activeWorkspaceId}
              bridge={bridge}
              cardActions={cardActions}
              state={state}
              live={live}
              nodeSteps={nodeSteps}
              waitingGates={waitingGates}
              incomingRefs={incomingRefs}
              hasForkInbound={hasForkInbound}
              hasActiveInboundContinuation={hasActiveInboundContinuation}
              latestOutput={latestOutput}
              isTeam={isTeam}
              staffed={staffed}
              teamSlots={teamSlots}
              rowChildren={rowChildren}
              modelRoutes={modelRoutes}
              ui={ui}
              emissionReminder={emissionReminder(false)}
              openTeam={openTeam}
              reportError={reportError}
              renderConversation={renderConversation}
              onPresenceChange={onPresenceChange}
              setEditingNodeId={setEditingNodeId}
              setPaletteDialog={setPaletteDialog}
              setPayloadPeek={setPayloadPeek}
              setQuoteState={setQuoteState}
            />
          );
        }
        return renderBasicNodeFullBody({
          node,
          placement,
          box,
          doc,
          liveDoc: docRef.current,
          snapshot,
          nodesById,
          outgoingEdges: edgeIndex.outgoing.get(node.id) ?? [],
          flowRun,
          bridge,
          cardActions,
          staffTeam,
          roleRunning,
          roleMembers,
          openRoleMember,
          modelRoutes,
          workspaceFilesList,
          activeWorkspaceCwd,
          ui,
          reportError,
          setFormModal,
          setFileInputDrafts,
          setFileModal,
          setEditingNodeId,
        });
      };

      const renderStaffPort = () => (
        <button
          type="button"
          className="fs-staff-port"
          data-staff-team={node.id}
          title={t("teamStaffPort")}
          aria-label={t("teamStaffPort")}
          onPointerDown={(ev) => startStaffDrag(ev, { teamId: node.id })}
        >
          <Icon name="person" />
          {teamSlots.length > 0 && <small>{teamSlots.length}</small>}
        </button>
      );
      const renderStaffSocket = () => (
        <button
          type="button"
          className="fs-staff-socket"
          data-staff-role={node.id}
          data-staffed={staffTeam ? "" : undefined}
          data-staff-id={node.id}
          title={t("teamStaffSocket")}
          aria-label={t("teamStaffSocket")}
          onPointerDown={(ev) => startStaffDrag(ev, { roleId: node.id })}
        >
          <i />
        </button>
      );

      return (
        <section
          key={`${placement}-${node.id}`}
          data-node-card={node.id}
          data-fs-semantic={semantic || undefined}
          data-staff-id={node.kind === "role" ? node.id : undefined}
          data-staff-target={
            staffDragSession &&
            node.id !== (staffDragSession.roleId ?? staffDragSession.teamId) &&
            node.kind === (staffDragSession.roleId ? "agent" : "role")
              ? ""
              : undefined
          }
          data-staff-snap={ui?.staffSnapped ? "" : undefined}
          data-children={
            rowChildren > 0 && node.subAgentsExpanded !== false
              ? ""
              : undefined
          }
          {...(node.kind === "role" ? staffHover(node.id) : {})}
          tabIndex={0}
          aria-label={heading}
          style={style}
          className={[
            "node",
            `node-${node.kind}`,
            node.kind === "flow" && "fsx-motion",
            isTeam ? "node-team" : "",
            roleRunning ? "is-role-running" : "",
            compact ? "compact" : "full",
            placement === "window" ? "floating-window" : "",
            placement === "conversation" ? "conversation-agent" : "",
            isSelected ? "selected" : "",
            connectSession?.fromIds.includes(node.id)
              ? "is-dragging-source"
              : connectSession &&
                  !wirePortIds(node, connectSession.kind, dragDirection).some(
                    (id) => available(connectSession.kind, id),
                  )
                ? "is-invalid-target"
                : "",
            state ? `status-${state}` : "",
            node.removed ? "fs-lane-removed" : "",
            node.pinned ? "is-pinned" : "",
            waitingGates.length || waitingHuman ? "needs-confirmation" : "",
            node.kind === "agent" && node.participation !== "global"
              ? `participation-${node.participation}`
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-flow-family={
            node.kind === "flow"
              ? descriptorOf(node.flowType)?.family
              : undefined
          }
          data-flow-operation={
            node.flowType === "flowspace/exec-terminal"
              ? "terminal"
              : node.flowType === "flowspace/exec-git"
                ? "git"
                : undefined
          }
          data-participation={
            node.kind === "agent" ? node.participation : undefined
          }
          onFocusCapture={(ev) => {
            if (
              (ev.target as HTMLElement).closest(
                "input,textarea,select,[contenteditable=true]",
              )
            ) {
              setEditingNodeId(node.id);
            }
          }}
          onBlurCapture={(ev) => {
            if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
              setEditingNodeId((current) =>
                current === node.id ? null : current,
              );
            }
          }}
          onPointerDown={(ev) => {
            if (
              !(ev.target as HTMLElement).closest(
                "button, input, textarea, select, a, .fs-embedded",
              )
            ) {
              selectNode(node.id, ev.shiftKey);
            }
          }}
          onContextMenu={(ev) => {
            if ((ev.target as HTMLElement).closest(".fs-embedded")) return;
            ev.preventDefault();
            ev.stopPropagation();
            const selText = window.getSelection()?.toString().trim();
            if (selText && node.kind === "agent") {
              openAnchoredMenu({ x: ev.clientX, y: ev.clientY }, [
                {
                  label: t("quoteSelection"),
                  icon: "quote",
                  fn: () =>
                    extractDisplayFrom(node.id, selText, live?.seq, true),
                },
              ]);
              return;
            }
            openNodeContextMenu(node, { x: ev.clientX, y: ev.clientY });
          }}
        >
          {(state === "running" || state === "settling") && (
            /* A comet of light travelling the rounded border at constant speed:
               a long faint tail plus a bright head, both dash-offset animated. */
            <svg className="node-aura" aria-hidden="true">
              <rect className="aura-tail" pathLength={1000} />
              <rect className="aura-head" pathLength={1000} />
            </svg>
          )}
          <header
            className="node-header"
            onPointerDown={(ev) => {
              if ((ev.target as HTMLElement).closest("button, input")) return;
              ev.stopPropagation();
              startNodeMove(ev, node.id);
            }}
            onDoubleClick={(ev) => {
              if ((ev.target as HTMLElement).closest("input")) return;
              if (isTeam) openTeam(node.id);
              else toggleNodeForm(node.id);
            }}
          >
            {isTeam ? (
              <button
                type="button"
                className="node-avatar fs-team-avatar"
                title={t("teamEnter")}
                aria-label={t("teamEnter")}
                style={hueStyle(teamModel)}
                onClick={() => openTeam(node.id)}
              >
                <Icon name="team" />
              </button>
            ) : node.kind === "role" ? (
              <span className="node-avatar fs-role-avatar">
                <TeamAvatar
                  label={node.title}
                  seed={staffSlot ?? node.slotId ?? node.title}
                  model={
                    node.teamModel ??
                    snapshot?.roles?.find((role) => role.id === node.roleRef)
                      ?.model
                  }
                  size="sm"
                  tone={
                    roleRunning ? "running" : staffTeam ? "ready" : "idle"
                  }
                  active={roleRunning}
                />
              </span>
            ) : (
              <span
                className={`node-avatar ${node.kind === "agent" ? "agent-avatar" : ""}`}
              >
                <Icon name={kindIconName(node.kind, node.flowType)} />
              </span>
            )}
            <div className="node-heading">
              {node.kind === "role" && !compact ? (
                <input
                  className="fs-role-title"
                  value={node.title}
                  aria-label={t("teamRoleName")}
                  placeholder={t("teamRoleUntitled")}
                  spellCheck={false}
                  onFocus={() => setEditingNodeId(node.id)}
                  onBlur={() => setEditingNodeId(null)}
                  onChange={(ev) =>
                    editNode(node.id, {
                      title: ev.target.value,
                      customTitle: true,
                    })
                  }
                />
              ) : (
                <strong
                  title={laneItem ? heading + " · " + laneItem : heading}
                >
                  {compact && laneItem ? laneItem : heading}
                </strong>
              )}
              {laneItem && !compact ? (
                <small title={laneItem}>{laneItem}</small>
              ) : waitingHuman?.deadline !== undefined ? (
                <FlowCountdown deadline={waitingHuman.deadline} />
              ) : node.kind === "role" ? (
                !compact && <small>{t("role")}</small>
              ) : isTeam ? (
                !(team && compact) && (
                  <small className="fs-team-node-summary">
                    <span title={teamSlotCount}>
                      {teamStack.length > 0 && (
                        <AvatarStack items={teamStack} max={4} />
                      )}
                      {teamSlotCount}
                    </span>
                    {teamModel && (
                      <span>
                        <ModelChip model={teamModel} quiet />
                      </span>
                    )}
                  </small>
                )
              ) : (
                !compact && roleText && <small>{roleText}</small>
              )}
            </div>
            {(masterHead || node.generatedBy) && (
              <LaneBadges
                node={node}
                master={masterHead}
                unused={hasUnusedResult(snapshot?.runs, node)}
              />
            )}
            {node.kind === "flow" && state === "skipped" && (
              <span className="status status-skipped">
                <i />
                {t("flow_skipped")}
              </span>
            )}
            {node.kind === "agent" &&
              (node.participation === "bypassed" ||
                node.participation === "paused") && (
                <span
                  className={`node-participation-badge is-${node.participation}`}
                  title={t(
                    node.participation === "bypassed"
                      ? "bypassParticipation"
                      : "pausedParticipation",
                  )}
                >
                  {t(node.participation === "bypassed" ? "bypassed" : "paused")}
                </span>
              )}
            <div className="node-actions">
              {node.kind === "agent" &&
                (state === "running" || state === "settling") && (
                  <button
                    type="button"
                    className="icon-button node-stop-button"
                    title={t("stopAgent")}
                    aria-label={t("stopAgent")}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      stopNode(node.id);
                    }}
                  >
                    <Icon name="stop" />
                  </button>
                )}
              {placement === "window" ? (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    title={t("returnCanvas")}
                    onClick={() => returnWindow(node.id)}
                  >
                    <Icon name="pop" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={
                      node.window?.snap === "max"
                        ? t("restoreWindow")
                        : t("maximize")
                    }
                    onClick={() =>
                      editNode(node.id, {
                        window: {
                          ...node.window!,
                          snap:
                            node.window?.snap === "max" ? undefined : "max",
                        },
                      })
                    }
                  >
                    <Icon name="fit" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    title={t(compact ? "expand" : "collapse")}
                    onClick={() => {
                      if (compact) {
                        selectNode(node.id);
                        if (!node.expanded) toggleNodeForm(node.id);
                      } else toggleNodeForm(node.id);
                    }}
                  >
                    <Icon name={compact ? "card" : "off"} />
                  </button>
                  {!compact && (
                    <button
                      type="button"
                      className="icon-button"
                      title={t("openWindow")}
                      onClick={() => openWindow(node.id)}
                    >
                      <Icon name="pop" />
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                className="icon-button"
                title={t("inspector")}
                onClick={(ev) => openNodeContextMenu(node, ev.currentTarget)}
              >
                <Icon name="more" />
              </button>
            </div>
          </header>

          {node.breakpoint && (
            <span title={t("flow_bp_title")} className="fs-bp-marker" />
          )}
          {breakpoint && !compact && (
            <Breakpoint
              run={breakpoint.run}
              step={breakpoint.step}
              bridge={bridge}
            />
          )}
          <CardBody
            compact={compact}
            preserve={placement === "canvas" && node.expanded && !node.pinned}
            prewarmFull={prewarmFull}
            contentVersion={contentVersion}
            full={renderFullBody}
            summary={renderCompactBody}
          />
          {node.flowType === "flowspace/trigger" &&
            node.config?.mode !== "launchpad" && (
              <button
                className="switch fs-trig-enable"
                type="button"
                role="switch"
                aria-label={t("flow_trig_enabled")}
                aria-checked={!!node.config?.enabled}
                onClick={() =>
                  editNode(node.id, {
                    config: { ...node.config, enabled: !node.config?.enabled },
                  })
                }
              />
            )}

          {placement === "canvas" &&
            node.kind !== "detail" &&
            node.kind !== "role" && (
              <>
                {node.kind === "flow" &&
                  portsOf(node).map(
                    (port) =>
                      port.role !== "event" &&
                      renderPort(
                        port.role,
                        port.direction,
                        port.id,
                        port.label ??
                          (port.labelKey ? t(port.labelKey) : port.id),
                      ),
                  )}
                {node.kind !== "flow" &&
                  connectionPort(node, "continuation", "in") &&
                  renderPort("continuation", "in")}
                {node.kind === "agent" && renderPort("continuation", "out")}
                {(node.kind === "agent" || node.kind === "display") &&
                  renderPort("reference", "in")}
                {node.kind !== "flow" && renderPort("reference", "out")}
                {hasStatusPort(node.kind, node.flowType, !!node.fanout) && (
                  <button
                    type="button"
                    className={`port fs-evt-port ${edgeIndex.outgoing.get(node.id)?.some((edge) => edge.kind === "event") ? "is-linked" : ""}`}
                    data-node-id={node.id}
                    data-port-id="out"
                    data-port-kind="event"
                    data-port-direction="out"
                    title={t("flow_evt_port")}
                    aria-label={t("flow_evt_port")}
                    onPointerDown={(event) =>
                      startPortDrag(event, [node.id], "event")
                    }
                  />
                )}
              </>
            )}
          {placement === "canvas" && node.kind === "agent" && renderStaffPort()}
          {placement === "canvas" && node.kind === "role" && renderStaffSocket()}

          {!compact && placement === "canvas" && (
            <button
              type="button"
              className="node-resizer"
              aria-label={t("expand")}
              onPointerDown={(ev) => startResize(ev, node.id, "node")}
            />
          )}
          {placement === "window" && (
            <button
              type="button"
              className="window-resizer"
              aria-label={t("expand")}
              onPointerDown={(ev) => startResize(ev, node.id, "window")}
            />
          )}
        </section>
      );
    },
    [
      doc.settings,
      crewNodes,
      contentIndex,
      cardActions,
      edgeIndex,
      workspaces,
      bridge,
      reportError,
      renderConversation,
      onPresenceChange,
      projectStructures,
      activeWorkspaceId,
      workspaceFilesList,
      activeWorkspaceCwd,
      passesNodeFilter,
      connectSession,
      languageRevision,
      openTeam,
      staffDragSession,
      modelRoutes,
      staffed,
    ],
  );
}
