import type {
  Dispatch,
  MutableRefObject,
  PointerEvent,
  RefObject,
  SetStateAction,
} from "react";
import type {
  ContainerChange,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GroupPort,
  NodeKind,
  SessionBrief,
  StartRequest,
  WorkflowTemplate,
} from "../../types.ts";
import { containerPermission, isContainer } from "../../core/containers.ts";
import { referenceTitle } from "../../core/document.ts";
import { canInsertFanout } from "../../core/fanout.ts";
import type { CanvasBridge } from "../bridge.ts";
import type { ChildCard, ChildLink } from "../childTree.ts";
import {
  bounds,
  clamp,
  collapsedAncestor,
  exchangeRoute,
  groupBox,
  hubFilamentPath,
  MOTION,
  nodeBox,
  toWorld,
  zoomAt,
  type Box,
  type HubSatelliteItem,
} from "../geometry.ts";
import { GuideWireLayer } from "../GuideWireLayer.tsx";
import { t } from "../i18n.ts";
import { Icon, PortMark, kindIconName } from "../icons.tsx";
import { MiniMapNodes } from "../MiniMapNodes.tsx";
import { WireListLabel } from "../nodes/DataPreview.tsx";
import { edgeLabels } from "../nodes/edgeLabels.ts";
import { isRemovedLaneWire, laneGroupState, LaneMetrics } from "../nodes/FanoutView.tsx";
import type { WireDropContext } from "../QuickCreateMenu.tsx";
import { intersects, runtimeIndex, type GeometryEdit } from "../sceneModel.ts";
import type { ExchangePair, SceneWires } from "../sceneWires.ts";
import type {
  DerivedStructureCard,
  DerivedStructureLink,
  DraftAffiliation,
} from "../structure.ts";
import { nodeStatusOf, WelcomeStudio } from "../SurfaceViews.tsx";
import { ChildCards, ChildLinks, StaffWires, type StaffWire } from "../TeamCanvas.tsx";
import type { MenuItem } from "../ui/ContextMenu.tsx";
import { WireFlowLayer } from "../WireFlowLayer.tsx";
import { insertWireWaypoint, route } from "../wireRouting.ts";
import type { PayloadPeekState, RouteId } from "./canvasGraphOps.ts";
import type {
  AnchorTarget,
  ConnectingState,
  EditDocFn,
  EditEdgeFn,
  EditNodeFn,
  MarqueeRect,
  ResolvedCanvasPrefs,
  SelectionState,
  StaffDragState,
} from "./canvasTypes.ts";
import {
  ViewportCard,
  type CardRenderer,
  type WireLayout,
} from "./ViewportCard.tsx";
import { miniViewRect, type MiniFrame } from "./viewportMath.ts";

export interface ActiveHubLayout {
  nodeId: string;
  kind: FlowEdge["kind"];
  progress: number;
  portPoint: { x: number; y: number };
  corridorBox: Box;
  satellites: HubSatelliteItem[];
}

export interface CanvasWorldProps {
  doc: FlowspaceDocument;
  docRef: MutableRefObject<FlowspaceDocument>;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  routeName: RouteId;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  prefs: ResolvedCanvasPrefs;
  effectiveTheme: "dark" | "light";
  displayedTheme: "dark" | "light";
  reducedMotion: boolean;
  view: FlowspaceDocument["viewport"];
  vpSize: { width: number; height: number };
  lod: boolean;
  paintArea: Box;
  svgBounds: Box;
  wireViewport: Box;
  rasterScene: boolean;
  tool: "pointer" | "hand";
  setTool: Dispatch<SetStateAction<"pointer" | "hand">>;
  spacePressed: boolean;
  isDragging: boolean;
  minimapOpen: boolean;
  setMinimapOpen: Dispatch<SetStateAction<boolean>>;
  snapPreview: "left" | "right" | "max" | null;
  historyCount: number;
  futureCount: number;

  viewportRef: RefObject<HTMLDivElement>;
  gridRef: RefObject<HTMLDivElement>;
  cursorFxRef: RefObject<HTMLDivElement>;
  cursorHaloRef: RefObject<HTMLDivElement>;
  cursorLensRef: RefObject<HTMLDivElement>;
  lensGridRef: RefObject<HTMLDivElement>;
  cameraRef: RefObject<HTMLDivElement>;
  worldRef: RefObject<HTMLDivElement>;
  zoomLabelRef: RefObject<HTMLButtonElement>;
  miniViewportRef: RefObject<SVGRectElement>;
  miniFrameRef: MutableRefObject<MiniFrame | null>;
  viewAnimToken: MutableRefObject<number>;
  wheelTargetRef: MutableRefObject<{
    view: { x: number; y: number; zoom: number };
    anchor: { x: number; y: number };
  } | null>;
  preClickSelectionRef: MutableRefObject<{ nodes: string[]; structureId: string | null }>;
  pendingFocusRef: MutableRefObject<string | null>;

  selection: SelectionState;
  setSelection: Dispatch<SetStateAction<SelectionState>>;
  selectionNodeSet: Set<string>;
  selectedStructureId: string | null;
  setSelectedStructureId: Dispatch<SetStateAction<string | null>>;
  editingNodeId: string | null;
  focusedCard: string | null | undefined;
  hoveredEdgeId: string | null;
  setHoveredEdgeId: Dispatch<SetStateAction<string | null>>;
  connecting: ConnectingState | null;
  marquee: MarqueeRect | null;
  gesture: GeometryEdit | null;
  preparing: { area: Box; compact: boolean } | null;

  contentIndex: { nodesById: Map<string, FlowNode> };
  nodesById: Map<string, FlowNode>;
  membersOf: (groupId: string) => FlowNode[];
  groupPorts: Map<string, GroupPort[]>;
  edgeIndex: { incoming: Map<string, FlowEdge[]>; outgoing: Map<string, FlowEdge[]> };
  writeByEdge: Map<string, ContainerChange>;
  visibleGroups: FlowNode[];
  sceneNodes: { n: FlowNode; b: Box }[];
  keepExpandedIds: Set<string>;
  waitingAgentNodes: FlowNode[];
  cardBoxes: (node: FlowNode) => [Box, Box];
  branchScroll: Map<string, number>;
  onBranchScroll: (id: string, top: number) => void;
  fileInputDrafts: Record<string, string>;
  quoteState: { nodeId: string; text: string } | null;

  derivedStructure: { cards: DerivedStructureCard[]; links: DerivedStructureLink[] };
  childTree: { cards: ChildCard[]; links: ChildLink[] };
  wireScene: { cache: SceneWires };
  wireLayouts: WireLayout[];
  accessoryWires: { id: string; path: string; extent: Box }[];
  exchanges: ExchangePair[];
  routingBoxes: Box[];
  activeHubLayout: ActiveHubLayout | null;
  staffWires: StaffWire[];
  staffDrag: StaffDragState | null;
  staffTip: { x: number; y: number } | null;
  staffTarget: string | undefined;

  isNodeVisible: (n: FlowNode | undefined, allowCollapsedChild?: boolean) => boolean;
  edgeVisualState: (edge: FlowEdge) => string;
  renderNodeCard: CardRenderer;
  edit: EditDocFn;
  editNode: EditNodeFn;
  editEdge: EditEdgeFn;
  createCanvasNode: (
    kind: NodeKind,
    at?: { x: number; y: number },
    affiliation?: DraftAffiliation,
    expanded?: boolean,
  ) => FlowNode;
  startPan: (ev: PointerEvent) => void;
  startMarquee: (ev: PointerEvent) => void;
  startGroupMove: (ev: PointerEvent, groupId: string) => void;
  startResize: (ev: PointerEvent, id: string, mode: "node" | "group" | "window") => void;
  startPortDrag: (
    ev: PointerEvent,
    fromIds: string[],
    kind: FlowEdge["kind"],
    sourceItemKey?: string,
    onStart?: () => void,
    portId?: string,
    direction?: "in" | "out",
  ) => void;
  startInputEdgeDrag: (ev: PointerEvent, edge: FlowEdge) => void;
  startWaypointDrag: (ev: PointerEvent, edgeId: string, index: number) => void;
  trackPointer: (
    ev: PointerEvent,
    onMove: (e: globalThis.PointerEvent) => void,
    onEnd?: (e: globalThis.PointerEvent | KeyboardEvent, canceled: boolean) => void,
  ) => void;
  openQuickCreate: (anchor: { x: number; y: number }, wire?: WireDropContext | null) => void;
  openGroupContextMenu: (group: FlowNode, anchor: AnchorTarget) => void;
  openAnchoredMenu: (anchor: AnchorTarget, items: MenuItem[]) => void;
  openInputHub: (nodeId: string, kind: FlowEdge["kind"]) => void;
  scheduleCloseInputHub: (delay?: number) => void;
  insertFanout: (point?: { x: number; y: number }, wire?: WireDropContext | null, edgeId?: string) => void;
  launchScope: (scope: StartRequest) => void;
  revealNode: (id: string) => void;
  returnWindow: (id: string) => void;
  openTeam: (nodeId: string, rowId?: string) => void;
  animateView: (target: FlowspaceDocument["viewport"], duration?: number) => void;
  fitView: (selectionOnly?: boolean) => void;
  performUndo: (redo: boolean) => void;
  loadStarter: () => void;
  handleInstantiateTemplate: (template: WorkflowTemplate) => void;
  reportError: (err: unknown) => void;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
  setPayloadPeek: Dispatch<SetStateAction<PayloadPeekState | null>>;
  setExchangeModal: Dispatch<SetStateAction<ExchangePair | null>>;
  setSessionModal: Dispatch<SetStateAction<SessionBrief[] | null>>;
  setHelpModal: Dispatch<SetStateAction<boolean>>;
}

export function CanvasWorld(props: CanvasWorldProps) {
  const {
    doc,
    docRef,
    snapshot,
    bridge,
    routeName,
    setRouteName,
    prefs,
    effectiveTheme,
    displayedTheme,
    reducedMotion,
    view,
    vpSize,
    lod,
    paintArea,
    svgBounds,
    wireViewport,
    rasterScene,
    tool,
    setTool,
    spacePressed,
    isDragging,
    minimapOpen,
    setMinimapOpen,
    snapPreview,
    historyCount,
    futureCount,
    viewportRef,
    gridRef,
    cursorFxRef,
    cursorHaloRef,
    cursorLensRef,
    lensGridRef,
    cameraRef,
    worldRef,
    zoomLabelRef,
    miniViewportRef,
    miniFrameRef,
    viewAnimToken,
    wheelTargetRef,
    preClickSelectionRef,
    pendingFocusRef,
    selection,
    setSelection,
    selectionNodeSet,
    selectedStructureId,
    setSelectedStructureId,
    editingNodeId,
    focusedCard,
    hoveredEdgeId,
    setHoveredEdgeId,
    connecting,
    marquee,
    gesture,
    preparing,
    contentIndex,
    nodesById,
    membersOf,
    groupPorts,
    edgeIndex,
    writeByEdge,
    visibleGroups,
    sceneNodes,
    keepExpandedIds,
    waitingAgentNodes,
    cardBoxes,
    branchScroll,
    onBranchScroll,
    fileInputDrafts,
    quoteState,
    derivedStructure,
    childTree,
    wireScene,
    wireLayouts,
    accessoryWires,
    exchanges,
    routingBoxes,
    activeHubLayout,
    staffWires,
    staffDrag,
    staffTip,
    staffTarget,
    isNodeVisible,
    edgeVisualState,
    renderNodeCard,
    edit,
    editNode,
    editEdge,
    createCanvasNode,
    startPan,
    startMarquee,
    startGroupMove,
    startResize,
    startPortDrag,
    startInputEdgeDrag,
    startWaypointDrag,
    trackPointer,
    openQuickCreate,
    openGroupContextMenu,
    openAnchoredMenu,
    openInputHub,
    scheduleCloseInputHub,
    insertFanout,
    launchScope,
    revealNode,
    returnWindow,
    openTeam,
    animateView,
    fitView,
    performUndo,
    loadStarter,
    handleInstantiateTemplate,
    reportError,
    setInspectorOpen,
    setPayloadPeek,
    setExchangeModal,
    setSessionModal,
    setHelpModal,
  } = props;

  const runtime = runtimeIndex(snapshot);

  return (
    <>
      {/* Canvas Viewport */}
      <div
        ref={viewportRef}
        className={[
          "fs-viewport",
          routeName !== "canvas" ? "is-hidden" : "",
          tool === "hand" || spacePressed ? "pan-mode" : "",
          isDragging ? "is-dragging" : "",
          connecting
            ? `connecting ${connecting.anchor.direction === "in" ? "connecting-reverse" : `connecting-${connecting.kind}`}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={(ev) => {
          const target = ev.target as HTMLElement;
          // Any press catches a gliding / flung view, like grabbing a moving sheet.
          viewAnimToken.current++;
          wheelTargetRef.current = null;
          if (ev.button === 2) return;
          if (
            target.closest(
              ".node, .fs-struct-card, .group-header, .composite, .edge-tag, .exchange-tag, .waypoint, .fs-input-satellite, .fs-hub-corridor, .fs-canvas-controls, .fs-minimap, .offscreen-indicator, .fs-welcome-card",
            )
          ) {
            return;
          }
          if (ev.detail === 1) {
            preClickSelectionRef.current = {
              nodes: [...selection.nodes],
              structureId: selectedStructureId,
            };
          }
          if (ev.button === 1 || spacePressed || tool === "hand") {
            startPan(ev);
          } else if (ev.shiftKey) {
            startMarquee(ev);
          } else {
            startPan(ev);
          }
        }}
        onDoubleClick={(ev) => {
          const target = ev.target as HTMLElement;
          if (
            target.closest(
              ".node, .fs-struct-card, .workflow-group, .edge-hit, .edge-tag, .fs-input-satellite, .fs-hub-corridor, .fs-canvas-controls, .fs-minimap, .fs-welcome-card",
            )
          )
            return;
          const vp = viewportRef.current;
          if (!vp) return;
          const created = createCanvasNode(
            "agent",
            toWorld(
              docRef.current.viewport,
              vp.getBoundingClientRect(),
              ev.clientX,
              ev.clientY,
            ),
            undefined,
            true,
          );
          pendingFocusRef.current = created.id;
        }}
        onContextMenu={(ev) => {
          const target = ev.target as HTMLElement;
          if (
            target.closest(
              ".node, .workflow-group, .edge-hit, .waypoint, .fs-canvas-controls, .fs-minimap",
            )
          )
            return;
          ev.preventDefault();
          openQuickCreate({ x: ev.clientX, y: ev.clientY });
        }}
      >
        {/* Dot grid on its own layer: panning only translates it */}
        <div ref={gridRef} className="fs-grid" aria-hidden="true" />
        {/* Cursor light: halo + dot lens, under the cards so it lights only the floor */}
        <div ref={cursorFxRef} className="fs-cursor-fx" aria-hidden="true">
          <div ref={cursorHaloRef} className="fx-halo" />
          <div ref={cursorLensRef} className="fx-lens">
            <div ref={lensGridRef} className="fx-lens-grid" />
          </div>
        </div>
        {/* Transformed World */}
        <div
          className="fs-camera"
          data-raster={rasterScene || undefined}
          ref={cameraRef}
        >
          <div
            ref={worldRef}
            className={`fs-world ${lod ? "semantic-zoom" : ""}`}
            data-wire-routing={prefs.wireRouting}
          >
            <div
              className="fs-scene-clip"
              style={{
                left: paintArea.x,
                top: paintArea.y,
                width: paintArea.w,
                height: paintArea.h,
              }}
            >
              <div
                className="fs-scene-origin"
                data-wire-routing={prefs.wireRouting}
                style={{ left: -paintArea.x, top: -paintArea.y }}
              >
                {/* Groups Layer */}
                <div className="fs-groups-layer">
                  {visibleGroups.map((grp) => {
                    const ports = groupPorts.get(grp.id)!;
                    const rows = Math.max(
                      ports.filter((p) => p.direction === "in").length,
                      ports.filter((p) => p.direction === "out").length,
                    );
                    const rawBox = groupBox(grp, rows);
                    const memberNodes = membersOf(grp.id);
                    const fan = grp.fanout && nodesById.get(grp.fanout.fanId);
                    const laneStats =
                      fan && laneGroupState(doc, memberNodes, fan, snapshot?.runs);
                    const placeholder =
                      !!laneStats &&
                      laneStats.total === undefined &&
                      !grp.collapsed;
                    let box =
                      lod && !grp.collapsed && memberNodes.length > 0
                        ? {
                            ...rawBox,
                            h: Math.max(
                              180,
                              Math.max(
                                ...memberNodes.map((mn) => {
                                  const mb = nodeBox(
                                    mn,
                                    lod,
                                    keepExpandedIds.has(mn.id),
                                  );
                                  return mb.y + mb.h;
                                }),
                              ) -
                                rawBox.y +
                                24,
                            ),
                          }
                        : rawBox;
                    if (placeholder) {
                      const bottom = memberNodes.reduce(
                        (y, n) =>
                          Math.max(
                            y,
                            n.y +
                              nodeBox(
                                n,
                                lod,
                                Boolean(n.pinned || keepExpandedIds.has(n.id)),
                              ).h,
                          ),
                        grp.y,
                      );
                      box = { ...box, h: Math.max(box.h, bottom - grp.y + 48) };
                    }
                    if (
                      !intersects(box, paintArea) &&
                      !selection.groups.includes(grp.id)
                    )
                      return null;
                    const runningCnt = memberNodes.filter((n) =>
                      ["running", "settling"].includes(
                        nodeStatusOf(snapshot, n.id),
                      ),
                    ).length;
                    const waitingCnt = memberNodes.filter((n) =>
                      ["waiting", "input"].includes(
                        nodeStatusOf(snapshot, n.id),
                      ),
                    ).length;

                    return (
                      <section
                        key={grp.id}
                        data-lane-group={fan?.id}
                        className={[
                          "workflow-group",
                          `color-${grp.color ?? "blue"}`,
                          grp.collapsed ? "composite" : "",
                          laneStats ? "fs-lane-group fsx-motion" : "",
                          selection.groups.includes(grp.id) ? "selected" : "",
                          grp.parentId ? "nested-group" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{
                          left: box.x,
                          top: box.y,
                          width: box.w,
                          height: box.h,
                        }}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          openGroupContextMenu(grp, {
                            x: ev.clientX,
                            y: ev.clientY,
                          });
                        }}
                      >
                        {laneStats && grp.collapsed && (
                          <span
                            className="fs-lane-stack-face"
                            aria-hidden="true"
                          />
                        )}
                        <header
                          className="group-header"
                          data-fs-semantic={lod || undefined}
                          onPointerDown={(ev) => {
                            if ((ev.target as HTMLElement).closest("button"))
                              return;
                            startGroupMove(ev, grp.id);
                          }}
                        >
                          <i className="group-mark" />
                          <strong className="user-content">
                            {grp.titleKey ? t(grp.titleKey) : grp.title}
                          </strong>
                          {laneStats ? (
                            <LaneMetrics state={laneStats} />
                          ) : (
                            <span>
                              {t("nodesCount", { count: memberNodes.length })}
                            </span>
                          )}
                          <div>
                            <button
                              type="button"
                              className="group-run"
                              onClick={() =>
                                launchScope({
                                  kind: "group",
                                  nodeIds: [grp.id],
                                })
                              }
                            >
                              <Icon name="play" />
                              <span>{t("run")}</span>
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title={t(grp.collapsed ? "expand" : "collapse")}
                              onClick={() =>
                                editNode(grp.id, {
                                  collapsed: !grp.collapsed,
                                })
                              }
                            >
                              <Icon name={grp.collapsed ? "card" : "off"} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title={t("inspector")}
                              onClick={(ev) =>
                                openGroupContextMenu(grp, ev.currentTarget)
                              }
                            >
                              <Icon name="more" />
                            </button>
                          </div>
                        </header>

                        {grp.collapsed && (
                          <>
                            <div className="composite-ports">
                              {(["in", "out"] as const).map((dir) => (
                                <div key={dir}>
                                  {ports
                                    .filter((p) => p.direction === dir)
                                    .map((port) => {
                                      const proxyIncoming =
                                        dir === "in"
                                          ? doc.edges.filter(
                                              (e) =>
                                                e.kind === port.kind &&
                                                port.nodes.includes(e.target) &&
                                                (e.targetPort ?? "in") ===
                                                  (port.portId ?? "in") &&
                                                !memberNodes.some(
                                                  (m) => m.id === e.source,
                                                ),
                                            )
                                          : [];
                                      return (
                                        <button
                                          key={port.id}
                                          type="button"
                                          data-port-id={port.portId ?? dir}
                                          data-port-kind={port.kind}
                                          data-port-direction={dir}
                                          data-proxy-nodes={port.nodes.join(",")}
                                          className={`composite-port-row composite-${dir} ${connecting?.kind === port.kind && dir === "in" ? "port-target" : ""} ${proxyIncoming.length ? "is-draggable-in" : ""}`}
                                          onPointerDown={
                                            dir === "out"
                                              ? (ev) =>
                                                  startPortDrag(
                                                    ev,
                                                    port.nodes,
                                                    port.kind,
                                                    undefined,
                                                    undefined,
                                                    port.portId,
                                                  )
                                              : proxyIncoming.length
                                                ? (ev) =>
                                                    startInputEdgeDrag(
                                                      ev,
                                                      proxyIncoming[
                                                        proxyIncoming.length - 1
                                                      ],
                                                    )
                                                : (ev) =>
                                                    startPortDrag(
                                                      ev,
                                                      port.nodes,
                                                      port.kind,
                                                      undefined,
                                                      undefined,
                                                      port.portId,
                                                      "in",
                                                    )
                                          }
                                        >
                                          <PortMark kind={port.kind} proxy />
                                          <span>{port.name}</span>
                                        </button>
                                      );
                                    })}
                                </div>
                              ))}
                            </div>
                            <div className="composite-summary">
                              <span>
                                {t("nodesCount", {
                                  count: memberNodes.length,
                                })}
                              </span>
                              <span>
                                {runningCnt} {t("running")} · {waitingCnt}{" "}
                                {t("waiting")}
                              </span>
                            </div>
                          </>
                        )}

                        {placeholder && (
                          <span className="fs-lane-placeholder">
                            {t("flow_lane_runtime")}
                          </span>
                        )}
                        {grp.templateId && (
                          <button
                            type="button"
                            className="template-association"
                            onClick={(ev) =>
                              openGroupContextMenu(grp, ev.currentTarget)
                            }
                          >
                            <Icon name="box" />
                            <span>
                              {t("templateLinked", {
                                version: grp.templateRevision ?? 1,
                              })}
                            </span>
                          </button>
                        )}

                        {!grp.collapsed && (
                          <button
                            type="button"
                            className="group-resizer"
                            aria-label={t("expand")}
                            onPointerDown={(ev) =>
                              startResize(ev, grp.id, "group")
                            }
                          />
                        )}
                      </section>
                    );
                  })}
                </div>

                {/* SVG Edges Layer */}
                <svg
                  className="fs-edges-svg"
                  style={{
                    left: svgBounds.x,
                    top: svgBounds.y,
                    width: svgBounds.w,
                    height: svgBounds.h,
                  }}
                  viewBox={`${svgBounds.x} ${svgBounds.y} ${svgBounds.w} ${svgBounds.h}`}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="fs-msg-arrow-out"
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto"
                    >
                      <path d="M0 0L6 3L0 6Z" fill="var(--m-f)" />
                    </marker>
                    <marker
                      id="fs-msg-arrow-back"
                      viewBox="0 0 6 6"
                      refX="5"
                      refY="3"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M0 0L6 3L0 6Z" fill="var(--m-b)" />
                    </marker>
                  </defs>
                  <g>
                    {/* Display & Detail source dotted links */}
                    {accessoryWires
                      .filter((wire) => intersects(wire.extent, paintArea))
                      .map(({ id, path }) => (
                        <path
                          key={`disp-${id}`}
                          className="edge-path edge-display"
                          d={path}
                        />
                      ))}

                    {/* Reference & Continuation Wires */}
                    {wireLayouts.map(({ edge, geom, evState }) => {
                      const retired = isRemovedLaneWire(edge, nodesById);
                      const isReconnecting =
                        connecting?.reconnectingEdge?.id === edge.id;
                      const isSpotlight = hoveredEdgeId === edge.id;
                      const dimmed = isReconnecting
                        ? false
                        : hoveredEdgeId
                          ? !isSpotlight
                          : selection.edge
                            ? selection.edge !== edge.id
                            : selection.nodes.length > 0 &&
                              !selection.nodes.includes(edge.source) &&
                              !selection.nodes.includes(edge.target);
                      const cls = [
                        `edge-${edge.kind}`,
                        edge.kind === "event" &&
                          `fs-evt-line fs-evt-${edge.event?.kinds.length === 1 ? edge.event.kinds[0] : "mixed"}`,
                        `edge-state-${evState}`,
                        edge.kind === "continuation"
                          ? `trigger-${edge.trigger}`
                          : "",
                        dimmed ? "edge-dim" : "",
                        isSpotlight ? "edge-spotlight" : "",
                        isReconnecting ? "edge-reconnecting-ghost" : "",
                        selection.edge === edge.id ? "edge-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      const write =
                        edge.kind === "reference"
                          ? writeByEdge.get(edge.id)
                          : undefined;
                      const glow =
                        edge.kind === "continuation" &&
                        ["active", "waiting", "boundary"].includes(evState);
                      const flow =
                        (edge.kind === "continuation" &&
                          (evState === "active" || evState === "queued")) ||
                        (edge.kind === "reference" &&
                          (evState === "pending" || evState === "updated"));
                      return (
                        <g
                          key={edge.id}
                          className={retired ? "fs-lane-removed" : undefined}
                          data-flow-wire={
                            !retired &&
                            edge.kind === "continuation" &&
                            evState === "active"
                              ? edge.id
                              : undefined
                          }
                        >
                          {/* Soft halo under live wires (shown only for active states) */}
                          {glow && (
                            <path
                              className={`edge-path edge-glow ${cls}`}
                              d={geom.path}
                            />
                          )}
                          <path
                            className={`edge-path ${cls}`}
                            d={geom.path}
                          />
                          {flow && (
                            <path
                              className={`edge-path edge-flow ${cls}`}
                              d={geom.path}
                            />
                          )}
                          {write && Date.now() - write.at < 1800 && !lod && (
                            <path
                              key={write.id}
                              className="fs-var-return fsx-motion"
                              d={geom.path}
                              pathLength={200}
                            />
                          )}
                          {edge.kind === "event" &&
                            runtime.latestToken.get(edge.id)?.createdAt &&
                            Date.now() -
                              runtime.latestToken.get(edge.id)!.createdAt! <
                              1400 && (
                              <path
                                key={runtime.latestToken.get(edge.id)!.id}
                                className="fs-evt-pulse fsx-motion"
                                d={geom.path}
                                pathLength={200}
                              />
                            )}
                          <path
                            className="edge-hit"
                            d={geom.path}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelection({
                                nodes: [],
                                groups: [],
                                edge: edge.id,
                              });
                              setInspectorOpen(true);
                            }}
                            onDoubleClick={(ev) => {
                              ev.stopPropagation();
                              const vp = viewportRef.current;
                              if (!vp) return;
                              const pt = toWorld(
                                docRef.current.viewport,
                                vp.getBoundingClientRect(),
                                ev.clientX,
                                ev.clientY,
                              );
                              editEdge(edge.id, {
                                waypoints: insertWireWaypoint(
                                  edge.waypoints ?? [],
                                  geom,
                                  pt,
                                ),
                              });
                            }}
                            onContextMenu={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              const vp = viewportRef.current;
                              if (!vp) return;
                              const pt = toWorld(
                                docRef.current.viewport,
                                vp.getBoundingClientRect(),
                                ev.clientX,
                                ev.clientY,
                              );
                              openAnchoredMenu(
                                { x: ev.clientX, y: ev.clientY },
                                [
                                  {
                                    label: t("addWaypoint"),
                                    icon: "plus",
                                    fn: () =>
                                      editEdge(edge.id, {
                                        waypoints: insertWireWaypoint(
                                          edge.waypoints ?? [],
                                          geom,
                                          pt,
                                        ),
                                      }),
                                  },
                                  ...(canInsertFanout(doc, edge)
                                    ? [
                                        {
                                          label: t("flow_insert_fanout"),
                                          icon: "fanout",
                                          fn: () =>
                                            insertFanout(pt, null, edge.id),
                                        },
                                      ]
                                    : []),
                                  {
                                    label: t("deleteConnection"),
                                    icon: "trash",
                                    danger: true,
                                    fn: () =>
                                      edit((d) => {
                                        d.edges = d.edges.filter(
                                          (x) => x.id !== edge.id,
                                        );
                                      }),
                                  },
                                ],
                              );
                            }}
                          />
                        </g>
                      );
                    })}

                    <WireFlowLayer
                      wires={wireLayouts}
                      area={svgBounds}
                      viewport={wireViewport}
                      zoom={view.zoom}
                      theme={displayedTheme}
                      enabled={routeName === "canvas" && !reducedMotion}
                      spotlight={hoveredEdgeId}
                      selected={selection.edge}
                      reconnecting={connecting?.reconnectingEdge?.id}
                    />

                    {!lod &&
                      snapshot?.nativeOperations?.flatMap((operation) => {
                        const source = nodesById.get(operation.nodeId);
                        if (!source) return [];
                        return doc.nodes
                          .filter(
                            (node) =>
                              (node.kind === operation.kind ||
                                node.flowType ===
                                  `flowspace/exec-${operation.kind}`) &&
                              (operation.kind === "terminal"
                                ? node.terminalSessionId === source.sessionId
                                : !!operation.cwd &&
                                  (node.worktreePath ??
                                    node.cwd ??
                                    node.config?.cwd) === operation.cwd),
                          )
                          .map((node) => {
                            const a = nodeBox(source),
                              b = nodeBox(node);
                            return (
                              <path
                                key={`${operation.nodeId}:${node.id}:${operation.kind}`}
                                className="fs-exec-observed"
                                d={`M ${a.x + a.w / 2} ${a.y + a.h / 2} L ${b.x + b.w / 2} ${b.y + b.h / 2}`}
                              >
                                <title>{operation.command}</title>
                              </path>
                            );
                          });
                      })}
                    {/* Continuation Exchange Arcs */}
                    {!lod &&
                      exchanges.map((ex) => {
                        const fg = collapsedAncestor(doc, ex.from);
                        const tg = collapsedAncestor(doc, ex.to);
                        if (fg && fg.id === tg?.id) return null;
                        const boxA = fg
                          ? groupBox(fg)
                          : nodeBox(
                              doc.nodes.find((n) => n.id === ex.from)!,
                              lod,
                              keepExpandedIds.has(ex.from),
                            );
                        const boxB = tg
                          ? groupBox(tg)
                          : nodeBox(
                              doc.nodes.find((n) => n.id === ex.to)!,
                              lod,
                              keepExpandedIds.has(ex.to),
                            );
                        const geom = exchangeRoute(boxA, boxB);
                        const hasOut = ex.items.some(
                          (m) => m.fromId === ex.from,
                        );
                        const hasBack = ex.items.some(
                          (m) => m.fromId === ex.to,
                        );
                        const clip = `flowspace-message-clip-${ex.id.replace(/[^\w-]/g, "_")}`;
                        const rect = (box: Box) =>
                          `M${box.x},${box.y}h${box.w}v${box.h}h${-box.w}Z`;
                        return (
                          <g key={ex.id} clipPath={`url(#${clip})`}>
                            <clipPath id={clip}>
                              <path
                                clipRule="evenodd"
                                d={rect(svgBounds) + rect(boxA) + rect(boxB)}
                              />
                            </clipPath>
                            {hasOut && (
                              <path
                                className="edge-path edge-message message-out"
                                d={geom.out}
                                markerEnd="url(#fs-msg-arrow-out)"
                              />
                            )}
                            {hasBack && (
                              <path
                                className="edge-path edge-message message-back"
                                d={geom.back}
                                markerEnd="url(#fs-msg-arrow-back)"
                              />
                            )}
                          </g>
                        );
                      })}

                    {/* 4-Tier Derived Structure Skeleton Links (M06) */}
                    <GuideWireLayer
                      links={derivedStructure.links}
                      cache={wireScene.cache}
                      obstacleRevision={wireScene.cache.obstacleRevision}
                      mode={prefs.wireRouting}
                      area={paintArea}
                      zoom={view.zoom}
                      theme={effectiveTheme}
                      settled={!worldRef.current?.dataset.moving}
                      lod={lod}
                      dragging={Boolean(gesture?.nodes)}
                    />

                    {/* Native children: agent port → subagent row, role node → member tree */}
                    <ChildLinks links={childTree.links} />

                    {/* Staffing wires: team port → role socket */}
                    <StaffWires
                      wires={staffWires}
                      drag={
                        staffDrag && staffTip
                          ? {
                              from: staffDrag.teamId
                                ? staffDrag.anchor
                                : staffTip,
                              to: staffDrag.teamId
                                ? staffTip
                                : staffDrag.anchor,
                              snapped: !!staffTarget,
                            }
                          : null
                      }
                      onMenu={(roleId, at) =>
                        openAnchoredMenu(at, [
                          {
                            label: t("teamRoleDisconnect"),
                            icon: "unplug",
                            danger: true,
                            fn: () =>
                              edit((d) => {
                                const role = d.nodes.find(
                                  (n) => n.id === roleId,
                                );
                                if (role) delete role.staffOf;
                              }),
                          },
                        ])
                      }
                    />

                    {/* Live Temporary Drag Wire & Magnetic ComfyUI Plug Tip */}
                    {connecting &&
                      (() => {
                        const target = connecting.snappedTarget?.point;
                        const tip = target ?? connecting.current;
                        const wirePath = route(
                          connecting.anchor.direction === "in"
                            ? tip
                            : connecting.fromPoint,
                          connecting.anchor.direction === "in"
                            ? connecting.fromPoint
                            : tip,
                          {
                            kind: connecting.kind,
                            mode: prefs.wireRouting,
                            obstacles: target ? routingBoxes : [],
                            freeEnd: !target,
                            waypoints: connecting.snappedTarget
                              ?.isOriginalTarget
                              ? connecting.reconnectingEdge?.waypoints
                              : undefined,
                          },
                        ).path;
                        const isSnapped = Boolean(connecting.snappedTarget);
                        const isDisconnectZone =
                          Boolean(connecting.reconnectingEdge) && !isSnapped;
                        return (
                          <g className="fs-temp-wire-group">
                            <path
                              className={`edge-path temporary-edge-glow edge-${connecting.kind} ${isDisconnectZone ? "is-disconnecting" : ""}`}
                              d={wirePath}
                            />
                            <path
                              className={`edge-path temporary-edge edge-${connecting.kind} ${isDisconnectZone ? "is-disconnecting" : ""}`}
                              d={wirePath}
                            />
                            <circle
                              cx={connecting.fromPoint.x}
                              cy={connecting.fromPoint.y}
                              r={4}
                              className="fs-wire-origin-dot"
                            />
                            {isSnapped && (
                              <circle
                                cx={tip.x}
                                cy={tip.y}
                                r={11}
                                className="fs-wire-snap-halo"
                              />
                            )}
                            <circle
                              cx={tip.x}
                              cy={tip.y}
                              r={isSnapped ? 5.5 : 4.6}
                              className={`fs-wire-plug-tip ${isSnapped ? "is-snapped" : isDisconnectZone ? "is-disconnecting" : ""}`}
                            />
                          </g>
                        );
                      })()}
                  </g>
                </svg>

                {/* Nodes Layer */}
                <div className="fs-nodes-layer">
                  {/* 4-Tier Derived Structure Cards (Project -> Branch -> Worktree -> SubAgent) */}
                  {derivedStructure.cards
                    .filter((sc) => intersects(sc.box, paintArea))
                    .map((sc) => (
                      <div
                        key={sc.id}
                        className={`fs-struct-card fs-struct-${sc.kind} ${selectedStructureId === sc.id ? "selected" : ""}`}
                        style={{
                          left: sc.box.x,
                          top: sc.box.y,
                          width: sc.box.w,
                          height: sc.box.h,
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedStructureId(sc.id);
                          setSelection({ nodes: [], groups: [], edge: null });
                        }}
                        onDoubleClick={(ev) => {
                          ev.stopPropagation();
                          if (sc.kind === "branch" || sc.kind === "worktree") {
                            createCanvasNode(
                              "git",
                              {
                                x: sc.box.x + sc.box.w + 200,
                                y: sc.box.y + 80,
                              },
                              {
                                workspaceId: sc.workspaceId,
                                cwd: sc.worktreePath || sc.cwd,
                                branch: sc.branch,
                                worktreePath: sc.worktreePath,
                              },
                            );
                          }
                        }}
                      >
                        <div className="fs-struct-head">
                          <Icon name={kindIconName(sc.kind)} />
                          <strong className="user-content">{sc.title}</strong>
                          {sc.badge && (
                            <span className="fs-struct-badge">{sc.badge}</span>
                          )}
                          <button
                            type="button"
                            className="icon-button"
                            title={t("newAgent")}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              createCanvasNode(
                                "agent",
                                {
                                  x: sc.box.x + sc.box.w + 220,
                                  y: sc.box.y + 80,
                                },
                                {
                                  workspaceId: sc.workspaceId,
                                  cwd: sc.worktreePath || sc.cwd,
                                  branch: sc.branch,
                                  worktreePath: sc.worktreePath,
                                },
                              );
                            }}
                          >
                            <Icon name="plus" />
                          </button>
                        </div>
                        <small className="fs-struct-sub user-content">
                          {sc.subtitle}
                        </small>
                      </div>
                    ))}

                  <ChildCards
                    cards={childTree.cards.filter((card) =>
                      intersects(card.box, paintArea),
                    )}
                    onOpen={(card) =>
                      card.member
                        ? openTeam(card.agentNodeId, card.sessionId)
                        : bridge.openChat(card.sessionId)
                    }
                  />

                  {sceneNodes.map(({ n, b }) => {
                    const visible =
                      intersects(b, paintArea) ||
                      n.id === focusedCard ||
                      n.id === editingNodeId ||
                      n.id === pendingFocusRef.current;
                    if (n.window) {
                      if (!visible) return null;
                      return (
                        <div
                          key={`stub-${n.id}`}
                          className="window-stub"
                          style={{
                            left: n.x,
                            top: n.y,
                            width: b.w,
                            height: b.h,
                          }}
                        >
                          <span>
                            <Icon name="pop" />
                            <strong className="user-content">{n.title}</strong>
                          </span>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => returnWindow(n.id)}
                          >
                            <Icon name="chev" />
                            <span>{t("returnCanvas")}</span>
                          </button>
                        </div>
                      );
                    }
                    const patch = gesture?.nodes?.get(n.id);
                    const translating =
                      patch &&
                      Object.keys(patch).every(
                        (key) => key === "x" || key === "y",
                      );
                    const node = translating
                      ? contentIndex.nodesById.get(n.id)!
                      : n;
                    const layout = cardBoxes(node);
                    const preview = Boolean(
                      preparing?.compact &&
                        !visible &&
                        layout[1].compact &&
                        intersects(cardBoxes(n)[1], preparing.area),
                    );
                    const warmFull = Boolean(
                      preparing &&
                        !preparing.compact &&
                        visible &&
                        b.compact &&
                        intersects(cardBoxes(n)[0], preparing.area),
                    );
                    const semantic = lod || preview;
                    const cardBox = layout[Number(semantic)];
                    const snapPortId = connecting?.snappedTarget?.nodeIds.includes(
                      n.id,
                    )
                      ? (connecting.snappedTarget.portId ??
                        (connecting.anchor.direction === "in" ? "out" : "in"))
                      : undefined;
                    return (
                      <ViewportCard
                        key={n.id}
                        node={node}
                        visible={visible}
                        box={cardBox}
                        prepare={preview || warmFull}
                        dx={n.x - node.x}
                        dy={n.y - node.y}
                        semantic={
                          semantic &&
                          ((node.kind !== "detail" && node.kind !== "role") ||
                            !!cardBox.compact)
                        }
                        branchOffset={branchScroll.get(node.id)}
                        onBranchScroll={onBranchScroll}
                        selected={selectionNodeSet.has(n.id)}
                        snapPortId={snapPortId}
                        fileDraft={
                          n.kind === "file"
                            ? (fileInputDrafts[n.id] ?? "")
                            : undefined
                        }
                        hubKind={
                          activeHubLayout?.nodeId === n.id
                            ? activeHubLayout.kind
                            : undefined
                        }
                        staffSnapped={staffTarget === n.id}
                        quoteText={
                          quoteState?.nodeId === n.id
                            ? quoteState.text
                            : undefined
                        }
                        render={renderNodeCard}
                        snapshot={snapshot}
                        incoming={edgeIndex.incoming.get(n.id)}
                      />
                    );
                  })}
                </div>

                {/* Edge Pill Tags & Waypoints Layer */}
                <div
                  className="fs-tags-layer fs-wire-labels"
                  data-fs-semantic={lod || undefined}
                >
                  {wireLayouts.map(({ edge, geom, evState }) => {
                    if (connecting?.reconnectingEdge?.id === edge.id) {
                      return null;
                    }
                    const waitingTok = runtime.waitingByEdge.get(edge.id);
                    const isSpotlight = hoveredEdgeId === edge.id;
                    const edgeSource = nodesById.get(edge.source);
                    const edgeTarget = nodesById.get(edge.target);
                    const labels = edgeLabels(
                      edge,
                      edgeSource,
                      edgeTarget,
                      runtime.latestToken.get(edge.id),
                    );
                    const permission = containerPermission(edgeSource, edge);
                    const modeLabel =
                      edge.kind === "event"
                        ? `${t(`flow_evt_${edge.event?.mode ?? "end"}`)} · ${edge.event?.kinds.length ?? 1}`
                        : evState === "skipped"
                          ? t("flow_skipped")
                          : edge.kind === "continuation"
                            ? t(
                                isContainer(edgeTarget)
                                  ? "flow_delivery"
                                  : edge.mode,
                              )
                            : t(edge.always ? "always" : evState);
                    const tagTitle =
                      edge.kind === "continuation"
                        ? `${modeLabel} · ${t(edge.trigger === "auto" ? "automatic" : edge.trigger)}`
                        : modeLabel;
                    const dimmed = hoveredEdgeId
                      ? !isSpotlight
                      : selection.edge
                        ? selection.edge !== edge.id
                        : selection.nodes.length > 0 &&
                          !selection.nodes.includes(edge.source) &&
                          !selection.nodes.includes(edge.target);

                    return (
                      <div
                        key={`tags-${edge.id}`}
                        className={
                          isRemovedLaneWire(edge, nodesById)
                            ? "fs-lane-removed"
                            : undefined
                        }
                      >
                        <div
                          className={[
                            "edge-tag",
                            edge.kind,
                            `edge-state-${evState}`,
                            dimmed ? "edge-dim" : "",
                            geom.tight ? "tight-tag" : "",
                            geom.portLabel && "near-ports",
                            geom.portLabel?.fit === "snug" && "snug-tag",
                            geom.portLabel &&
                              (geom.portLabel.fit === "above" || waitingTok) &&
                              "above-ports",
                            selection.edge === edge.id ? "selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={
                            {
                              left: geom.label.x,
                              top: geom.label.y,
                              "--tag-lift":
                                geom.portLabel && `${geom.portLabel.lift}px`,
                              "--tag-idle-width":
                                geom.portLabel &&
                                `${geom.portLabel.idleWidth}px`,
                            } as React.CSSProperties
                          }
                        >
                          <button
                            type="button"
                            title={tagTitle}
                            aria-label={tagTitle}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelection({
                                nodes: [],
                                groups: [],
                                edge: edge.id,
                              });
                              setInspectorOpen(true);
                            }}
                          >
                            <Icon
                              name={
                                edge.kind === "continuation"
                                  ? {
                                      conclusion: "at",
                                      session: "clock",
                                      fork: "branch",
                                    }[edge.mode]
                                  : "at"
                              }
                            />
                            <span className="fs-branch-edge-type">
                              {labels.list && nodesById.get(edge.source) ? (
                                <WireListLabel
                                  edge={edge}
                                  source={nodesById.get(edge.source)!}
                                  fallback={labels.type}
                                />
                              ) : (
                                labels.type
                              )}
                            </span>
                            <span
                              className={
                                evState === "skipped"
                                  ? "fs-branch-skipped-label"
                                  : undefined
                              }
                            >
                              {modeLabel}
                            </span>
                            {labels.conversion && (
                              <span className="fs-branch-edge-convert">
                                {labels.conversion}
                              </span>
                            )}
                            {labels.flags && (
                              <span className="fs-branch-edge-logic">
                                · {labels.flags}
                              </span>
                            )}
                            {permission !== "read" && (
                              <small>
                                {t(`flow_permission_${permission}`)}
                                {edge.ask ? " ?" : ""}
                              </small>
                            )}
                            {edge.kind === "continuation" && (
                              <i className="trigger-indicator">
                                <Icon
                                  name={
                                    edge.trigger === "auto"
                                      ? "bolt"
                                      : edge.trigger === "confirm"
                                        ? "pause"
                                        : "off"
                                  }
                                />
                              </i>
                            )}
                          </button>
                          <button
                            type="button"
                            className="edge-xray"
                            title={t("inspectPayload")}
                            aria-label={t("inspectPayload")}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              const r =
                                ev.currentTarget.getBoundingClientRect();
                              setPayloadPeek({
                                edgeId: edge.id,
                                anchor: { x: r.left, y: r.bottom },
                              });
                            }}
                          >
                            <Icon name="xray" />
                          </button>
                          {waitingTok && (
                            <button
                              type="button"
                              className="edge-release"
                              title={t("release")}
                              aria-label={t("release")}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                void bridge
                                  .release(
                                    waitingTok.run.id,
                                    waitingTok.token.id,
                                    true,
                                  )
                                  .catch(reportError);
                              }}
                            >
                              <Icon name="play" />
                              <span>{t("release")}</span>
                            </button>
                          )}
                        </div>

                        {(edge.waypoints ?? []).map((wp, idx) => (
                          <button
                            key={`${edge.id}-wp-${idx}`}
                            type="button"
                            className="waypoint"
                            aria-label={t("waypoint")}
                            style={{ left: wp.x, top: wp.y }}
                            onPointerDown={(ev) =>
                              startWaypointDrag(ev, edge.id, idx)
                            }
                            onContextMenu={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              openAnchoredMenu(
                                { x: ev.clientX, y: ev.clientY },
                                [
                                  {
                                    label: t("removeWaypoint"),
                                    icon: "x",
                                    danger: true,
                                    fn: () =>
                                      editEdge(edge.id, {
                                        waypoints: (
                                          edge.waypoints ?? []
                                        ).filter((_, i) => i !== idx),
                                      }),
                                  },
                                ],
                              );
                            }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div
                  className="fs-tags-layer"
                  data-fs-semantic={lod || undefined}
                >
                  {/* Exchange Count Pill Tags */}
                  {!lod &&
                    exchanges.map((ex) => {
                      const fg = collapsedAncestor(doc, ex.from);
                      const tg = collapsedAncestor(doc, ex.to);
                      if (fg && fg.id === tg?.id) return null;
                      const boxA = fg
                        ? groupBox(fg)
                        : nodeBox(
                            doc.nodes.find((n) => n.id === ex.from)!,
                            lod,
                            keepExpandedIds.has(ex.from),
                          );
                      const boxB = tg
                        ? groupBox(tg)
                        : nodeBox(
                            doc.nodes.find((n) => n.id === ex.to)!,
                            lod,
                            keepExpandedIds.has(ex.to),
                          );
                      const geom = exchangeRoute(boxA, boxB);
                      const sent = ex.items.filter(
                        (m) => m.fromId === ex.from,
                      ).length;
                      const back = ex.items.length - sent;
                      const latest = ex.items[ex.items.length - 1];
                      return (
                        <div
                          key={`ex-tag-${ex.id}`}
                          className={`exchange-tag ${geom.side ? "side" : ""}`}
                          style={{ left: geom.label.x, top: geom.label.y }}
                        >
                          <button
                            type="button"
                            onClick={() => setExchangeModal(ex)}
                          >
                            <Icon name="chat" />
                            {sent > 0 && <i className="mc f">↓{sent}</i>}
                            {back > 0 && <i className="mc b">↑{back}</i>}
                            <em>
                              {latest.text.slice(0, 20)}
                              {latest.text.length > 20 ? "…" : ""}
                            </em>
                          </button>
                        </div>
                      );
                    })}

                  {/* Multi-Input Hover Fan-Out Satellites ("一输入一节点" ComfyUI Deck) */}
                  {activeHubLayout && activeHubLayout.progress > 0.01 && (
                    <>
                      <div
                        className="fs-hub-corridor"
                        style={{
                          left: activeHubLayout.corridorBox.x,
                          top: activeHubLayout.corridorBox.y,
                          width: Math.max(
                            24,
                            activeHubLayout.portPoint.x -
                              10 -
                              activeHubLayout.corridorBox.x,
                          ),
                          height: activeHubLayout.corridorBox.h,
                        }}
                        onPointerEnter={() =>
                          openInputHub(
                            activeHubLayout.nodeId,
                            activeHubLayout.kind,
                          )
                        }
                        onPointerLeave={() => scheduleCloseInputHub()}
                      />
                      <svg
                        className="fs-hub-overlay-svg"
                        style={{
                          left: activeHubLayout.corridorBox.x,
                          top: activeHubLayout.corridorBox.y,
                          width: activeHubLayout.corridorBox.w,
                          height: activeHubLayout.corridorBox.h,
                        }}
                        viewBox={`${activeHubLayout.corridorBox.x} ${activeHubLayout.corridorBox.y} ${activeHubLayout.corridorBox.w} ${activeHubLayout.corridorBox.h}`}
                        aria-hidden="true"
                      >
                        <circle
                          cx={activeHubLayout.portPoint.x}
                          cy={activeHubLayout.portPoint.y}
                          r={8 + 4 * activeHubLayout.progress}
                          className={`fs-hub-port-aura kind-${activeHubLayout.kind}`}
                          style={{ opacity: activeHubLayout.progress * 0.85 }}
                        />
                        {activeHubLayout.satellites.map((sat) => {
                          const fPath = hubFilamentPath(
                            sat.wireOut,
                            activeHubLayout.portPoint,
                          );
                          const isHot = hoveredEdgeId === sat.edge.id;
                          const isDim = Boolean(hoveredEdgeId) && !isHot;
                          return (
                            <g
                              key={`fil-${sat.edge.id}`}
                              style={{ opacity: sat.opacity }}
                            >
                              <path
                                d={fPath}
                                className={[
                                  "fs-hub-filament",
                                  `kind-${activeHubLayout.kind}`,
                                  isHot ? "is-hot" : "",
                                  isDim ? "is-dim" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              />
                              <path
                                d={fPath}
                                className={[
                                  "fs-hub-filament-pulse",
                                  `kind-${activeHubLayout.kind}`,
                                  isHot ? "is-hot" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              />
                            </g>
                          );
                        })}
                      </svg>
                      {activeHubLayout.satellites.map((sat) => {
                        const evState = edgeVisualState(sat.edge);
                        const isHot = hoveredEdgeId === sat.edge.id;
                        const label = referenceTitle(sat.sourceNode, sat.edge);
                        const modeGlyph =
                          sat.edge.kind === "continuation"
                            ? sat.edge.mode === "fork"
                              ? "⑂"
                              : sat.edge.mode === "session"
                                ? "⏱"
                                : "→"
                            : "@";
                        return (
                          <button
                            key={`sat-${sat.edge.id}`}
                            type="button"
                            data-edge-id={sat.edge.id}
                            className={[
                              "fs-input-satellite",
                              `kind-${sat.edge.kind}`,
                              `state-${evState}`,
                              isHot ? "is-hot" : "",
                              selection.edge === sat.edge.id
                                ? "is-selected"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{
                              left: sat.cx,
                              top: sat.cy,
                              width: sat.w,
                              height: sat.h,
                              opacity: sat.opacity,
                              transform: `translate(-50%, -50%) scale(${sat.scale})`,
                            }}
                            title={`${label} · ${t("dragInputTip")}`}
                            onPointerEnter={() => {
                              openInputHub(
                                activeHubLayout.nodeId,
                                activeHubLayout.kind,
                              );
                              setHoveredEdgeId(sat.edge.id);
                            }}
                            onPointerLeave={() => {
                              setHoveredEdgeId((prev) =>
                                prev === sat.edge.id ? null : prev,
                              );
                              scheduleCloseInputHub();
                            }}
                            onPointerDown={(ev) =>
                              startInputEdgeDrag(ev, sat.edge)
                            }
                            onDoubleClick={(ev) => {
                              ev.stopPropagation();
                              revealNode(sat.sourceNode.id);
                            }}
                          >
                            <i className="fs-sat-pin fs-sat-pin-in" />
                            <span className="fs-sat-icon">
                              <Icon
                                name={kindIconName(
                                  sat.sourceNode.kind,
                                  sat.sourceNode.flowType,
                                )}
                              />
                            </span>
                            <span className="fs-sat-title user-content">
                              {label}
                            </span>
                            <kbd className="fs-sat-mode">{modeGlyph}</kbd>
                            <Icon name="grip" className="ic fs-sat-grip" />
                            <i className="fs-sat-pin fs-sat-pin-out" />
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Floating ComfyUI Wire Action HUD */}
                  {connecting &&
                    (connecting.reason ||
                      connecting.reconnectingEdge ||
                      connecting.snappedTarget) && (
                      <div
                        className={[
                          "fs-wire-hud",
                          connecting.snappedTarget
                            ? connecting.snappedTarget.isOriginalTarget
                              ? "hud-neutral"
                              : "hud-snap"
                            : "hud-disconnect",
                        ].join(" ")}
                        style={{
                          left: connecting.current.x,
                          top: connecting.current.y - 24,
                        }}
                      >
                        <Icon
                          name={connecting.snappedTarget ? "bolt" : "unplug"}
                        />
                        <span>
                          {connecting.reason
                            ? t(connecting.reason)
                            : connecting.reconnectingEdge
                              ? connecting.snappedTarget
                                ? connecting.snappedTarget.isOriginalTarget
                                  ? t("keepConnected")
                                  : t("reconnectTo", {
                                      name: connecting.snappedTarget.label,
                                    })
                                : t("dropToDisconnect")
                              : t("connectTo", {
                                  name: connecting.snappedTarget?.label ?? "",
                                })}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee Selection Box */}
        {marquee && (
          <div
            className="fs-marquee"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
            }}
          />
        )}
      </div>

      {/* Empty Canvas Welcome Card */}
      {routeName === "canvas" && doc.nodes.length === 0 && (
        <WelcomeStudio
          doc={doc}
          onSelectTemplate={(tpl) =>
            tpl.id === "builtin-review"
              ? loadStarter()
              : handleInstantiateTemplate(tpl)
          }
          onCreateBlankAgent={() => {
            const created = createCanvasNode("agent");
            pendingFocusRef.current = created.id;
          }}
          onBrowseLibrary={() => setRouteName("workflows")}
          onImportSession={() =>
            void bridge.sessions().then(setSessionModal).catch(reportError)
          }
        />
      )}

      {/* Offscreen Waiting Indicators */}
      {routeName === "canvas" && (
        <div className="fs-indicators">
          {waitingAgentNodes
            .filter((n) => isNodeVisible(n, true))
            .map((n) => {
              const cg = collapsedAncestor(doc, n.id);
              const box = cg
                ? groupBox(cg)
                : nodeBox(n, lod, keepExpandedIds.has(n.id));
              const cx = (box.x + box.w / 2) * view.zoom + view.x;
              const cy = (box.y + box.h / 2) * view.zoom + view.y;
              if (
                cx > 0 &&
                cy > 28 &&
                cx < vpSize.width &&
                cy < vpSize.height - 44
              ) {
                return null;
              }
              const ix = clamp(cx, 12, vpSize.width - 12);
              const iy = clamp(cy, 54, vpSize.height - 64);
              const onRight = ix > vpSize.width / 2;
              return (
                <button
                  key={`ind-${n.id}`}
                  type="button"
                  className={`offscreen-indicator ${onRight ? "indicator-right" : ""}`}
                  style={{ left: ix, top: iy }}
                  title={t("locateWaiting")}
                  onClick={() => revealNode(n.id)}
                >
                  <Icon name="pause" />
                  <span className="user-content">{n.title}</span>
                  <Icon name="chev" />
                </button>
              );
            })}
        </div>
      )}

      {/* Interactive SVG Minimap */}
      {routeName === "canvas" &&
        minimapOpen &&
        (() => {
          const mw = 192;
          const nodeBoxes = sceneNodes;
          const visRect: Box = {
            x: -view.x / view.zoom,
            y: -view.y / view.zoom,
            w: vpSize.width / view.zoom,
            h: vpSize.height / view.zoom,
          };
          /* Frame the content, not the camera: a zoomed-out view used to swallow the
             map in empty space. The camera only widens the frame once it has
             wandered off the content entirely, so "where am I" is never lost. */
          const content = nodeBoxes.length
            ? bounds(nodeBoxes.map((x) => x.b))
            : visRect;
          const pad = Math.max(24, Math.max(content.w, content.h) * 0.05);
          let full: Box = {
            x: content.x - pad,
            y: content.y - pad,
            w: content.w + pad * 2,
            h: content.h + pad * 2,
          };
          const camOnContent =
            visRect.x < full.x + full.w &&
            visRect.x + visRect.w > full.x &&
            visRect.y < full.y + full.h &&
            visRect.y + visRect.h > full.y;
          if (!camOnContent) full = bounds([full, visRect]);
          // The map's height follows the content's aspect, so there is no letterbox.
          const mh = Math.round(clamp((mw * full.h) / full.w, 64, 132));
          const sc = Math.min(mw / full.w, mh / full.h);
          const ox = (mw - full.w * sc) / 2;
          const oy = (mh - full.h * sc) / 2;
          const frame: MiniFrame = {
            x: full.x,
            y: full.y,
            sc,
            ox,
            oy,
            vw: vpSize.width,
            vh: vpSize.height,
            mw,
            mh,
          };
          miniFrameRef.current = frame;
          const camRect = miniViewRect(frame, view);
          const jumpMinimap = (
            clientX: number,
            clientY: number,
            svgEl: SVGSVGElement,
          ) => {
            const r = svgEl.getBoundingClientRect();
            const wx = full.x + (clientX - r.left - ox) / sc;
            const wy = full.y + (clientY - r.top - oy) / sc;
            const z = docRef.current.viewport.zoom;
            animateView(
              {
                x: vpSize.width / 2 - wx * z,
                y: vpSize.height / 2 - wy * z,
                zoom: z,
              },
              MOTION.region,
            );
          };
          return (
            <div className="fs-minimap" aria-label={t("minimap")}>
              <button
                type="button"
                className="icon-button fs-minimap-close"
                title={t("close")}
                aria-label={t("close")}
                onClick={() => setMinimapOpen(false)}
              >
                <Icon name="x" />
              </button>
              <svg
                viewBox={`0 0 ${mw} ${mh}`}
                style={{ height: mh }}
                onPointerDown={(ev) => {
                  const svgEl = ev.currentTarget;
                  jumpMinimap(ev.clientX, ev.clientY, svgEl);
                  trackPointer(ev, (next) =>
                    jumpMinimap(next.clientX, next.clientY, svgEl),
                  );
                }}
              >
                <MiniMapNodes
                  boxes={nodeBoxes}
                  snapshot={snapshot}
                  x={full.x}
                  y={full.y}
                  scale={sc}
                  offsetX={ox}
                  offsetY={oy}
                  width={mw}
                  height={mh}
                  theme={displayedTheme}
                  raster={rasterScene}
                />
                <rect
                  ref={miniViewportRef}
                  className="mini-viewport"
                  x={camRect.x}
                  y={camRect.y}
                  width={camRect.w}
                  height={camRect.h}
                  rx={3}
                />
              </svg>
            </div>
          );
        })()}

      {/* Bottom Controls Bar */}
      {routeName === "canvas" && (
        <div
          className={`fs-canvas-controls ${minimapOpen ? "minimap-open" : ""}`}
          role="toolbar"
        >
          <div className="pointer-tools">
            <button
              type="button"
              className={`icon-button ${tool === "pointer" ? "active" : ""}`}
              title={t("pointer")}
              onClick={() => setTool("pointer")}
            >
              <Icon name="pointer" />
            </button>
            <button
              type="button"
              className={`icon-button ${tool === "hand" ? "active" : ""}`}
              title={t("hand")}
              onClick={() => setTool("hand")}
            >
              <Icon name="hand" />
            </button>
            <i />
            <button
              type="button"
              className="icon-button"
              title={t("undo")}
              disabled={!historyCount}
              onClick={() => performUndo(false)}
            >
              <Icon name="undo" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("redo")}
              disabled={!futureCount}
              onClick={() => performUndo(true)}
            >
              <Icon name="redo" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("help")}
              onClick={() => setHelpModal(true)}
            >
              <Icon name="help" />
            </button>
          </div>

          <div className="canvas-hint">
            <span>{t("doubleClickTip")}</span>
            <i>·</i>
            <kbd>Space</kbd>
            <span>{t("pan")}</span>
            <i>·</i>
            <kbd>Shift</kbd>
            <span>{t("rangeSelection")}</span>
          </div>

          <div className="view-tools">
            <button
              type="button"
              className="icon-button"
              title={t("zoom")}
              onClick={() => {
                const rect = viewportRef.current?.getBoundingClientRect();
                if (!rect) return;
                animateView(
                  zoomAt(
                    docRef.current.viewport,
                    rect,
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    1 / 1.2,
                  ),
                  MOTION.region,
                );
              }}
            >
              <Icon name="off" />
            </button>
            <button
              type="button"
              ref={zoomLabelRef}
              className="zoom-label"
              onClick={() => {
                const px = vpSize.width / 2,
                  py = vpSize.height / 2;
                const live = docRef.current.viewport;
                animateView(
                  {
                    x: px - (px - live.x) / live.zoom,
                    y: py - (py - live.y) / live.zoom,
                    zoom: 1,
                  },
                  MOTION.region,
                );
              }}
            >
              {`${Math.round(view.zoom * 100)}%`}
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("zoom")}
              onClick={() => {
                const rect = viewportRef.current?.getBoundingClientRect();
                if (!rect) return;
                animateView(
                  zoomAt(
                    docRef.current.viewport,
                    rect,
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    1.2,
                  ),
                  MOTION.region,
                );
              }}
            >
              <Icon name="plus" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("fitView")}
              onClick={(ev) => fitView(ev.shiftKey)}
            >
              <Icon name="fit" />
            </button>
            <button
              type="button"
              className={`icon-button ${minimapOpen ? "active" : ""}`}
              title={t("minimap")}
              onClick={() => setMinimapOpen((v) => !v)}
            >
              <Icon name="canvas" />
            </button>
          </div>
        </div>
      )}

      {/* Snap Preview Overlay & Floating Windows */}
      <div
        className={`snap-preview ${snapPreview ? `snap-${snapPreview}` : ""}`}
      />
      {routeName === "canvas" && (
        <div className="fs-floating-layer">
          {doc.nodes
            .filter((n) => !!n.window)
            .map((n) =>
              renderNodeCard(
                n,
                "window",
                snapshot,
                cardBoxes(n)[Number(lod)],
                undefined,
                undefined,
                undefined,
                0,
                {
                  selected: selectionNodeSet.has(n.id),
                  fileDraft:
                    n.kind === "file"
                      ? (fileInputDrafts[n.id] ?? "")
                      : undefined,
                  quoteText:
                    quoteState?.nodeId === n.id ? quoteState.text : undefined,
                },
              ),
            )}
        </div>
      )}
    </>
  );
}
