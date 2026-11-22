import {
  createContext,
  memo,
  startTransition,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type {
  AgentTab,
  CanvasPrefs,
  CanvasSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowNotice,
  FlowspaceSnapshot,
  GroupPort,
  LaunchPlan,
  NodeKind,
  SessionBrief,
  StartRequest,
  TeamDependencies,
  TeamModel,
  WorkflowImportRequest,
  WorkflowTemplate,
  WorkspaceBrief,
  WorkspaceFilePreview,
  WorkspaceStructureBrief,
} from "../types.ts";
import { canConnect, connectionPort } from "../core/connect.ts";
import { containerPermission, isContainer, rebaseContainerChanges } from "../core/containers.ts";
import { VariablePanel } from "./nodes/Variables.tsx";
import { ArenaDialog, Breakpoint, BudgetMeter, ReplayDock, ReportDialog, replayAt } from "./nodes/PlayViews.tsx";
import { hasStatusPort } from "../core/nodes/interactions.ts";
import { BatchHuman } from "./nodes/InteractionViews.tsx";
import { appendMasterStep, canInsertFanout, cleanRetiredLanes, createFanoutPair, resumeMasterSync } from "../core/fanout.ts";
import { edgeLabels } from "./nodes/edgeLabels.ts";
import { CanvasPreviewContext, useCanvasPreviews, WireListLabel } from "./nodes/DataPreview.tsx";
import { receiveGeneration, reconcileLaneChanges } from "./generationHistory.ts";
import { LaneBadges, LaneMetrics, hasUnusedResult, isRemovedLaneWire, laneGroupState } from "./nodes/FanoutView.tsx";
import { descriptorOf, portsOf } from "../core/nodes/registry.ts";
import { findBoardCard, normalizeBoardColumns, pruneBoardReferences, resolveBoardReference, type BoardEdit } from "../core/board.ts";
import {
  boardSummaryText,
  deriveDraftTitle,
  emptyDocument,
  groupDescendants,
  members,
  newEdge,
  newFlowNode,
  newNode,
  referenceTitle,
  uid,
  workflowNodes,
} from "../core/document.ts";
import type { CanvasBridge } from "./bridge.ts";
import { BrandMark, Icon, PortMark, kindIconName } from "./icons.tsx";
import { getLanguage, setLanguage, subscribeLanguage, t, tr } from "./i18n.ts";
import {
  BOARD_MIN_SIZE,
  LOD_ZOOM,
  MOTION,
  alignedWireDropPosition,
  bounds,
  canvasItemBox,
  capsuleStateOf,
  clamp,
  collapsedAncestor,
  comfortableFit,
  clearBoxAlong,
  computeInputHubLayout,
  easeView,
  endpoint,
  exchangeRoute,
  expandedGroupBox,
  fit,
  groupBox,
  hubFilamentPath,
  inferGroupPorts,
  isCompactNode,
  nodeBox,
  portY,
  reflowCanvasItem,
  toWorld,
  zoomAt,
  type Box,
  type HubSatelliteItem,
} from "./geometry.ts";
import { DEFAULT_WIRE_ROUTING, insertWireWaypoint, route, type WireRoute } from "./wireRouting.ts";
import { arrangeCanvas } from "./canvasLayout.ts";
import { startThemeTransition } from "./themeTransition.ts";
import { groupExchanges, pathExtent, pathTouches, SceneWires, type ExchangePair, type WireEnd } from "./sceneWires.ts";
import { GuideWireLayer } from "./GuideWireLayer.tsx";
import { WireFlowLayer } from "./WireFlowLayer.tsx";
import { MiniMapNodes } from "./MiniMapNodes.tsx";
import { paintLayer, settleLayer } from "./cameraFrame.ts";
import { applyGeometry, byId, encloses, indexEdges, indexNodes, intersects, padded, runtimeIndex, shareSnapshotValue, viewportBox, type GeometryEdit } from "./sceneModel.ts";
import {
  allTemplates,
  buildSnapshot,
  captureTemplate,
  computeSyncPlan,
  instantiateTemplate,
  teamDependenciesFor,
  teamRevisionDifferences,
  localizedStarterDocument,
  synchronizeTemplate,
  type SyncPlan,
} from "./templates.ts";
import {
  ActivitySurface,
  InspectorPanel,
  MiniGraph,
  RunOverviewDock,
  SettingsSurface,
  WelcomeStudio,
  WorkflowsSurface,
  formatTime,
  nodeStatusOf,
} from "./SurfaceViews.tsx";
import {
  QuickCreateMenu,
  type QuickCreateSelection,
  type WireDropContext,
} from "./QuickCreateMenu.tsx";
import { PayloadPeekPopover } from "./PayloadPeekPopover.tsx";
import { BoardNodeView } from "./BoardNodeView.tsx";
import { BoardCompactSummary } from "./BoardControls.tsx";
import { installHostStyleGuard } from "./hostStyleGuard.ts";
import { CanvasDialog } from "./CanvasDialog.tsx";
import { TeamView } from "./TeamView.tsx";
import { AvatarStack, ModelChip, TeamAvatar, hueStyle } from "./TeamControls.tsx";
import { ChildCards, ChildLinks, CrewFrame, RoleNodeBody, RoleNodeSummary, StaffWires, staffHover, useModelRoutes,
  type StaffWire } from "./TeamCanvas.tsx";
import { buildChildTree } from "./childTree.ts";
import { draftSlots } from "./teamCrew.ts";
import { isTeamNode, slotIdFor, staffedIds, staffNodes } from "../core/team.ts";
import { WorkflowImportDialog, containsCodeNode } from "./WorkflowImportDialog.tsx";
import { FlowCountdown, viewOf } from "./nodes/index.ts";
import {
  alignNodes,
  distributeNodes,
  duplicateSubgraph,
  pasteSubgraphClipboard,
  serializeSubgraphClipboard,
  toggleNodesParticipation,
  type AlignMode,
  type DistributeAxis,
  type SubgraphClipboard,
} from "./subgraphs.ts";
import {
  buildDerivedStructure,
  resolveDraftAffiliation,
  type DerivedStructureCard,
  type DraftAffiliation,
} from "./structure.ts";
import {
  ChangesNodeBody,
  GitNodeBody,
  TerminalNodeBody,
} from "./ToolNodeViews.tsx";

type RouteId = "canvas" | "conversation" | "workflows" | "activity" | "settings" | "team";

interface MenuItem {
  heading?: string;
  divider?: boolean;
  label?: string;
  description?: string;
  icon?: string;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
  danger?: boolean;
  fn?: () => void;
}

interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
  returnFocus?: HTMLElement;
}

interface PaletteEntry {
  label: string;
  detail?: string;
  section: string;
  icon: string;
  fn: () => void;
}

/**
 * Reads the DSH host theme from both `<html>` and `<body>` with one rule set, so the
 * first render and later MutationObserver updates agree (no dark→light flash on mount).
 * Explicit host attributes win; otherwise fall back to the OS color scheme.
 */
export function detectHostDark(): boolean {
  if (typeof document === "undefined") return true;
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue;
    if (el.hasAttribute("data-ds-dark-theme")) return true;
    if (el.hasAttribute("data-ds-light-theme")) return false;
    const attr = el.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    if (el.classList.contains("dark")) return true;
    if (el.classList.contains("light")) return false;
  }
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true;
}

const HOST_THEME_ATTRS = [
  "data-ds-dark-theme",
  "data-ds-light-theme",
  "data-theme",
  "class",
];

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
    )
  );
}

type WireEnds = Pick<FlowEdge, "sourcePort" | "targetPort" | "sourceItemKey">;
type WireAnchor = WireEnds & { mode?: FlowEdge["mode"]; edgeId?: string; direction?: "in" | "out" };

function wirePortIds(node: FlowNode, kind: FlowEdge["kind"], direction: "in" | "out"): string[] {
  if (kind === "event") return direction === "in" ? wirePortIds(node, "continuation", "in")
    : connectionPort(node, kind, direction) ? ["out"] : [];
  if (node.kind === "flow")
    return portsOf(node).filter(port => port.direction === direction && port.role === kind).map(port => port.id);
  return connectionPort(node, kind, direction) ? [direction] : [];
}

function checkDraggedWire(fixed: FlowNode, candidate: FlowNode, kind: FlowEdge["kind"], anchor: WireAnchor,
  portId: string | undefined, edges: FlowEdge[]) {
  const ends = anchor.direction === "in"
    ? { source: candidate, target: fixed, sourcePort: portId }
    : { source: fixed, target: candidate, targetPort: portId };
  return canConnect({ ...anchor, ...ends, kind, edges });
}

function matchesWire(candidate: FlowEdge, edge: Pick<FlowEdge, "source" | "target" | "kind"> & WireEnds) {
  return candidate.source === edge.source && candidate.target === edge.target &&
    candidate.kind === edge.kind && candidate.sourceItemKey === edge.sourceItemKey &&
    (candidate.sourcePort ?? "out") === (edge.sourcePort ?? "out") &&
    (candidate.targetPort ?? "in") === (edge.targetPort ?? "in");
}

function addWire(doc: FlowspaceDocument, source: FlowNode, target: FlowNode, kind: FlowEdge["kind"], patch: Partial<FlowEdge> = {}) {
  const edge = { ...newEdge(source.id, target.id, kind), ...patch };
  const check = canConnect({ ...edge, source, target, edges: doc.edges });
  if (check.ok && !doc.edges.some(candidate => matchesWire(candidate, edge))) doc.edges.push(edge);
}

function removeCanvasNodes(doc: FlowspaceDocument, selected: string[]) {
  const ids = new Set(selected);
  for (const group of doc.nodes.filter(node => node.fanout)) {
    if (ids.has(group.id) || ids.has(group.fanout!.fanId) || ids.has(group.fanout!.mergeId)) {
      ids.add(group.id);
      for (const id of groupDescendants(doc, group.id)) ids.add(id);
    }
  }
  doc.nodes = doc.nodes.filter(node => !ids.has(node.id));
  for (const node of doc.nodes) if (node.parentId && ids.has(node.parentId)) delete node.parentId;
  doc.edges = doc.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target));
}

function linkWireDrop(doc: FlowspaceDocument, wire: WireDropContext, created: FlowNode, patch: Partial<FlowEdge> = {}) {
  const originId = wire.direction === "out" ? wire.sourceNode?.id : wire.targetNode?.id;
  const ids = wire.nodeIds ?? (originId ? [originId] : []);
  const kind = patch.kind ?? wire.portKind;
  for (const anchor of doc.nodes.filter(node => ids.includes(node.id))) {
    const [source, target] = wire.direction === "out" ? [anchor, created] : [created, anchor];
    const ports = wire.direction === "out" ? { sourcePort: wire.portId, sourceItemKey: wire.sourceItemKey } : { targetPort: wire.portId };
    addWire(doc, source, target, kind, { ...patch, ...ports });
  }
}

interface QuickCreateState {
  anchor: { x: number; y: number };
  world: { x: number; y: number };
  wire: WireDropContext | null;
}

interface PayloadPeekState {
  edgeId: string;
  anchor: { x: number; y: number };
}

/** How many times an embedded conversation retries `sessions.retain` before reporting. */
const EMBED_RETAIN_ATTEMPTS = 6;
/** React state follows the live viewport only after the gesture has been idle this long. */
const VIEW_COMMIT_IDLE_MS = 160;
// Small documents fit comfortably in the browser's vector scene. Reserve bitmap
// backing and forward viewport coverage for canvases with many more elements.
const RASTER_SCENE_NODES = 64;
/** Time constant of the eased wheel glide (smaller = snappier). */
const WHEEL_GLIDE_TAU_MS = 72;
/** Time constant of the momentum decay after a fling-pan. */
const PAN_INERTIA_TAU_MS = 300;
/** Grid layer overscan; must exceed the widest on-screen major cell (24 × 5 × 2.2 × 1.25). */
const GRID_OVERSCAN = 360;
/** The grid layer is re-tiled once its live scale drifts outside this band. */
const GRID_REBASE_MIN = 0.8;
const GRID_REBASE_MAX = 1.25;

function worldTransform(v: { x: number; y: number; zoom: number }): string {
  return `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
}

function viewAtDetailBoundary(from: FlowspaceDocument["viewport"], target: FlowspaceDocument["viewport"]) {
  const fraction = (LOD_ZOOM - from.zoom) / (target.zoom - from.zoom);
  return {
    x: from.x + (target.x - from.x) * fraction,
    y: from.y + (target.y - from.y) * fraction,
    zoom: LOD_ZOOM,
  };
}

/** Semantic-zoom text compensation, quantised so zooming does not relayout every frame. */
function typeScaleFor(zoom: number): number {
  return zoom < LOD_ZOOM ? Math.round(clamp(1 / zoom, 1, 2.6) * 10) / 10 : 1;
}

/** Zoom at which each grid layer's tiles were last rasterised. */
const gridBaseZoom = new WeakMap<HTMLElement, number>();

/** A repeating texture needs at most one tile before the visible origin. */
function tileOffset(offset: number, period: number) {
  return offset - Math.ceil(offset / period) * period;
}

/**
 * Moves the dot-grid layer with a pure compositor transform. While zooming, the cached
 * tiles are scaled instead of re-tiled; they are re-rasterised crisply when the view
 * settles (`settle`) or once the scale drifts past the rebase band.
 */
function applyGridFrame(
  grid: HTMLElement,
  v: { x: number; y: number; zoom: number },
  settle = false,
  lensGrid: HTMLElement | null = null,
) {
  let base = gridBaseZoom.get(grid);
  const drift = base ? v.zoom / base : 0;
  if (!base || drift < GRID_REBASE_MIN || drift > GRID_REBASE_MAX || (settle && base !== v.zoom)) {
    base = v.zoom;
    gridBaseZoom.set(grid, base);
    const minor = 24 * base;
    const major = minor * 5;
    const size = `${major}px ${major}px, ${minor}px ${minor}px`;
    grid.style.width = grid.style.height = `calc(${100 / GRID_REBASE_MIN}% + ${major + 2}px)`;
    const ga = String(clamp((base - 0.35) / 0.4, 0, 1));
    for (const el of [grid, lensGrid]) {
      if (!el) continue;
      el.style.backgroundSize = size;
      el.style.setProperty("--ga", ga);
    }
    if (lensGrid) {
      // Only one spare repeat is needed to pan the pattern inside the circular mask.
      const side = Math.ceil(2 * CURSOR_LENS_R / GRID_REBASE_MIN + major + 2);
      lensGrid.style.width = lensGrid.style.height = `${side}px`;
    }
  }
  const scale = v.zoom / base;
  const period = 24 * 5 * v.zoom;
  const mod = (n: number) => ((n % period) + period) % period;
  const phase = (coordinate: number) => {
    const pos = mod(coordinate + GRID_OVERSCAN);
    return scale === 1 ? Math.round(pos) : pos;
  };
  const tx = phase(v.x), ty = phase(v.y);
  const x = tileOffset(tx - GRID_OVERSCAN, period), y = tileOffset(ty - GRID_OVERSCAN, period);
  const transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  if (settle) {
    grid.style.transform = transform;
    settleLayer(grid);
  } else paintLayer(grid, { transform });
  return { x, y, period, scale };
}

/** Minimap projection: world frame → map pixels, plus the live camera size. */
type MiniFrame = {
  x: number;
  y: number;
  sc: number;
  ox: number;
  oy: number;
  vw: number;
  vh: number;
  mw: number;
  mh: number;
};

/**
 * The camera rectangle on the minimap, clipped to the map so a view larger than the
 * content (or partly off it) still reads as a crisp frame instead of spilling out.
 */
function miniViewRect(
  f: MiniFrame,
  v: { x: number; y: number; zoom: number },
): { x: number; y: number; w: number; h: number } {
  const x0 = (-v.x / v.zoom - f.x) * f.sc + f.ox;
  const y0 = (-v.y / v.zoom - f.y) * f.sc + f.oy;
  const x1 = x0 + (f.vw / v.zoom) * f.sc;
  const y1 = y0 + (f.vh / v.zoom) * f.sc;
  const edge = 1;
  const span = (a: number, b: number, max: number): [number, number] => {
    let lo = clamp(a, edge, max - edge);
    let hi = clamp(b, edge, max - edge);
    if (hi - lo < 6) {
      const mid = clamp((a + b) / 2, edge + 3, max - edge - 3);
      lo = mid - 3;
      hi = mid + 3;
    }
    return [lo, hi];
  };
  const [lx, hx] = span(x0, x1, f.mw);
  const [ly, hy] = span(y0, y1, f.mh);
  return { x: lx, y: ly, w: hx - lx, h: hy - ly };
}

/** Cursor-light follow constants: the lens tracks tightly, the halo trails like liquid. */
const CURSOR_LENS_TAU_MS = 34;
const CURSOR_HALO_TAU_MS = 120;
const CURSOR_LENS_R = 150;
const CURSOR_HALO_R = 280;

const SessionOnCanvas = createContext(true);

function EmbeddedSession({
  node,
  bridge,
  renderConversation,
  onError,
  onPresenceChange,
}: {
  node: FlowNode;
  bridge: CanvasBridge;
  renderConversation: (
    node: FlowNode,
    reference: SessionReference,
  ) => ReactNode;
  onError: (err: unknown) => void;
  onPresenceChange: (sessionId: string, mounted: boolean) => void;
}) {
  const [reference, setReference] = useState<SessionReference>();
  const [retained, setRetained] = useState<string>();
  const present = useContext(SessionOnCanvas);
  useLayoutEffect(() => {
    if (!present || !retained || retained !== node.sessionId) return;
    onPresenceChange(retained, true);
    return () => onPresenceChange(retained, false);
  }, [retained, node.sessionId, present, onPresenceChange]);
  useEffect(() => {
    if (!node.sessionId) return;
    const sid = node.sessionId;
    let active = true;
    let ref: SessionReference | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const acquire = () => {
      if (!active) return;
      try {
        ref = bridge.retain(node);
      } catch (err) {
        // Right after a reload the host may not have listed this session yet, and
        // `retain` throws synchronously. Retry briefly instead of letting the throw
        // unmount the whole canvas slot; report only if it never resolves.
        if (++attempt < EMBED_RETAIN_ATTEMPTS) {
          retryTimer = setTimeout(acquire, 250 * attempt);
        } else {
          onError(err);
        }
        return;
      }
      setRetained(sid);
      const acquired = ref;
      acquired.ready
        .then(() => {
          if (active) setReference(acquired);
        })
        .catch(onError);
    };
    acquire();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      if (ref) {
        ref.release();
      }
    };
  }, [bridge, node.sessionId]);

  return reference ? (
    <>{renderConversation(node, reference)}</>
  ) : (
    <div className="fs-loading">{t("openingConversation")}</div>
  );
}

type CardRenderer = (
  node: FlowNode, placement: "canvas" | "window" | "conversation", snapshot: FlowspaceSnapshot | null,
  box: Box, semantic?: boolean, prewarmFull?: boolean, contentVersion?: object, branchOffset?: number,
) => ReactNode;
type WireLayout = { edge: FlowEdge; from: WireEnd; geom: WireRoute; extent: Box; evState: string };

function useCardActions<T extends Record<string, (...args: never[]) => unknown>>(actions: T): T {
  const latest = useRef(actions);
  useLayoutEffect(() => { latest.current = actions; });
  return useMemo(() => Object.fromEntries(Object.keys(actions).map(key =>
    [key, (...args: never[]) => latest.current[key](...args)],
  )) as T, []);
}

function CardBody({ compact, preserve, prewarmFull, contentVersion, full, summary }: {
  compact: boolean; preserve: boolean; prewarmFull?: boolean; contentVersion?: object;
  full: () => ReactNode; summary: () => ReactNode;
}) {
  const previous = useRef<{ version?: object; body: ReactNode } | null>(null);
  if (!compact || prewarmFull) {
    if (!contentVersion || previous.current?.version !== contentVersion) {
      previous.current = { version: contentVersion, body: full() };
    }
  }
  else if (!preserve) previous.current = null;
  return <>
    {(previous.current != null || !compact) && <div key="full" className="node-body" hidden={compact}>
      <SessionOnCanvas.Provider value={!compact}>{previous.current?.body}</SessionOnCanvas.Provider>
    </div>}
    {(compact || preserve) && <div key="compact" className="node-body" hidden={!compact}>{summary()}</div>}
  </>;
}

const ViewportCard = memo(function ViewportCard({ node, visible, prepare, semantic, box, dx, dy, render, snapshot, branchOffset, onBranchScroll }: {
  node: FlowNode; visible: boolean; prepare: boolean; semantic: boolean; box: Box; dx: number; dy: number;
  branchOffset?: number; onBranchScroll: (id: string, top: number) => void;
  render: CardRenderer; snapshot: FlowspaceSnapshot | null; incoming?: FlowEdge[];
}) {
  const slot = useRef<HTMLDivElement>(null);
  const scroll = useRef(new Map<string, number>());
  const visited = useRef(false);
  const keepMounted = node.expanded && (Boolean(node.sessionId) || ["git", "changes", "terminal"].includes(node.kind));
  const mounted = visible || (keepMounted ? visited.current : prepare);
  const prewarmFull = prepare && visible && !keepMounted && node.expanded;
  const contentVersion = useMemo(() => ({}), [node, snapshot, render]);
  const content = useMemo(() => mounted
    ? render(node, "canvas", snapshot, box, semantic, prewarmFull, contentVersion, branchOffset)
    : null, [mounted, render, node, snapshot, box, semantic, prewarmFull, contentVersion, branchOffset]);
  useLayoutEffect(() => {
    const card = slot.current?.firstElementChild;
    if (!card) return;
    if (dx || dy) paintLayer(card, { transform: `translate(${dx}px, ${dy}px)` });
    else settleLayer(card);
  }, [mounted, dx, dy]);
  useLayoutEffect(() => {
    if (visible) visited.current = true;
    if (!visible || !scroll.current.size || !slot.current) return;
    for (const element of Array.from(slot.current.querySelectorAll<HTMLElement>(".node-scroll,textarea"))) {
      const value = scroll.current.get(element.className);
      if (value) element.scrollTop = value;
    }
  }, [visible, box.compact]);
  if (!mounted) return null;
  return <div className="fs-card-slot" ref={slot} hidden={!visible} onScrollCapture={event => {
    const element = event.target as HTMLElement;
    if (element.matches(".fs-branch-list")) onBranchScroll(node.id, element.scrollTop);
    if (element.matches(".node-scroll,textarea")) scroll.current.set(element.className, element.scrollTop);
  }}>{content}</div>;
}, (before, after) => {
  if (before.branchOffset !== after.branchOffset || before.node !== after.node || before.visible !== after.visible || before.prepare !== after.prepare ||
    before.semantic !== after.semantic || before.box !== after.box || before.dx !== after.dx || before.dy !== after.dy ||
    before.render !== after.render || before.incoming !== after.incoming) return false;
  if (before.snapshot === after.snapshot) return true;
  const node = after.node;
  if (node.flowType === "flowspace/variable") return before.snapshot?.variables === after.snapshot?.variables;
  if (node.flowType === "flowspace/trigger") return before.snapshot?.triggers === after.snapshot?.triggers;
  if (node.kind === "changes") return before.snapshot?.live === after.snapshot?.live;
  // Any agent may take role nodes; only leads and library teams follow team runtime traffic.
  const lead = node.kind === "agent" && (!!node.teamRef || !node.sessionId ||
    !!before.snapshot?.teams?.[node.sessionId] || !!after.snapshot?.teams?.[node.sessionId]);
  if (node.kind === "agent" && before.snapshot?.roles !== after.snapshot?.roles) return false;
  if (lead || node.kind === "role") {
    const teamId = node.teamRef?.teamId;
    if (before.snapshot?.roles !== after.snapshot?.roles ||
        (teamId && before.snapshot?.teamBlueprints?.find((team) => team.id === teamId) !== after.snapshot?.teamBlueprints?.find((team) => team.id === teamId)) ||
        (node.sessionId && before.snapshot?.teams?.[node.sessionId] !== after.snapshot?.teams?.[node.sessionId]) ||
        (node.sessionId && before.snapshot?.nativeMessages !== after.snapshot?.nativeMessages) ||
        (node.kind === "role" && before.snapshot?.teams !== after.snapshot?.teams)) return false;
  }
  const old = runtimeIndex(before.snapshot), current = runtimeIndex(after.snapshot);
  if (node.generatedBy && hasUnusedResult(before.snapshot?.runs, node) !== hasUnusedResult(after.snapshot?.runs, node)) return false;
  const sameNode = (id: string) => {
    if (old.live.get(id) !== current.live.get(id) || old.statuses.get(id) !== current.statuses.get(id)) return false;
    if (old.missingEmissions.get(id)?.step !== current.missingEmissions.get(id)?.step) return false;
    if (before.snapshot?.runs === after.snapshot?.runs) return true;
    const steps = old.steps.get(id), next = current.steps.get(id);
    return steps?.length === next?.length && (!steps || steps.every((step, index) => step === next?.[index])) &&
      !old.waiting.has(id) && !current.waiting.has(id);
  };
  return sameNode(node.id) && (!node.sourceNodeId || sameNode(node.sourceNodeId)) &&
    (node.kind !== "agent" || ((!after.incoming?.some(edge => edge.kind === "reference" &&
      before.snapshot?.sourceVersions?.[edge.source] !== after.snapshot?.sourceVersions?.[edge.source])) &&
      before.snapshot?.subagents === after.snapshot?.subagents));
});

export function CanvasApp({
  bridge,
  renderConversation,
  renderNotice,
}: {
  bridge: CanvasBridge;
  renderConversation: (
    node: FlowNode | undefined,
    reference: SessionReference,
  ) => ReactNode;
  renderNotice?: (notice: FlowNotice, onDone: () => void) => ReactNode;
}) {
  const snapshot = bridge.useSnapshot();
  const [languageRevision, setLangTick] = useState(0);
  useEffect(() => subscribeLanguage(() => setLangTick((v) => v + 1)), []);
  // Neutralise a host `:has()` rule that makes every canvas DOM change restyle the canvas.
  useEffect(() => installHostStyleGuard(), []);

  const [baseDoc, setDoc] = useState<FlowspaceDocument>(emptyDocument);
  const [zoomPreparation, setZoomPreparation] = useState<{ area: Box; compact: boolean } | null>(null);
  const preparedCrossing = useRef<boolean | undefined>(undefined);
  const [gesture, setGesture] = useState<GeometryEdit | null>(null);
  const gestureRef = useRef<GeometryEdit | null>(null);
  const doc = useMemo(() => applyGeometry(baseDoc, gesture), [baseDoc, gesture]);
  const rasterScene = baseDoc.nodes.length >= RASTER_SCENE_NODES;
  const contentIndex = useMemo(() => indexNodes(baseDoc.nodes), [baseDoc.nodes]);
  const groupPorts = useMemo(() => new Map(baseDoc.nodes.filter(node => node.kind === "group").map(group =>
    [group.id, inferGroupPorts(baseDoc, group).filter(port => !port.hidden)])),
  [baseDoc.nodes, baseDoc.edges]);
  const { nodesById, collapsed, membersOf } = useMemo(
    () => doc.nodes === baseDoc.nodes ? contentIndex : indexNodes(doc.nodes),
    [doc.nodes, baseDoc.nodes, contentIndex],
  );
  const staffed = useMemo(() => staffedIds(baseDoc.nodes), [baseDoc.nodes]);
  const edgeIndex = useMemo(() => indexEdges(doc.edges), [doc.edges]);
  const [branchScroll, setBranchScroll] = useState(() => new Map<string, number>());
  const onBranchScroll = useCallback((id: string, top: number) => setBranchScroll(previous => {
    if ((previous.get(id) ?? 0) === top) return previous;
    const next = new Map(previous);
    if (top) next.set(id, top);
    else next.delete(id);
    return next;
  }), []);
  const runtime = runtimeIndex(snapshot);
  const writeByEdge = useMemo(() => new Map(snapshot?.containerChanges?.flatMap(change =>
    change.edgeId && change.sessionId && !change.revertedBy ? [[change.edgeId, change] as const] : [])),
  [snapshot?.containerChanges]);
  const docRef = useRef(baseDoc);
  const graphDocument = useMemo(() => doc, [doc.nodes, doc.edges]);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const savingPromise = useRef<Promise<unknown>>(Promise.resolve());
  const applyingConfig = useRef(false);
  const revision = useRef(0);
  const sentRevision = useRef(-1);
  const initialized = useRef(false);

  const [saved, setSaved] = useState(true);
  const [toastState, setToastState] = useState<{
    text: string;
    error?: boolean;
    visible: boolean;
  }>({ text: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const [routeName, setRouteName] = useState<RouteId>("canvas");
  const [variablePanel, setVariablePanel] = useState(false);
  const [replayRun, setReplayRun] = useState<FlowspaceRun>();
  const replayLocked = useRef(false);
  replayLocked.current = !!replayRun;
  const [replayTime, setReplayTime] = useState(0);
  const [reportRun, setReportRun] = useState<FlowspaceRun>();
  const [arenaOpen, setArenaOpen] = useState(false);
  const [batchHumanId, setBatchHumanId] = useState<string>();
  const batchHumanRun = snapshot?.runs.find(run => run.id === batchHumanId);
  const seenNotices = useRef(new Set<string>());
  const noticeSince = useRef(Date.now());
  const [notice, setNotice] = useState<FlowNotice>();
  const [teamNodeId, setTeamNodeId] = useState<string>();
  const [teamFocus, setTeamFocus] = useState<string>();
  const openTeam = useCallback((nodeId: string, rowId?: string) => {
    setTeamNodeId(nodeId);
    setTeamFocus(rowId);
    setRouteName("team");
  }, []);
  const [libraryTab, setLibraryTab] = useState<
    "patterns" | "mine" | "snapshots" | "teams"
  >("patterns");
  const [activityTab, setActivityTab] = useState<
    "runs" | "outputs" | "waiting"
  >("runs");
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"events" | "outputs" | "waiting">(
    "events",
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  // The canvas opens full-bleed; the library / activity side panel is one click away.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [tool, setTool] = useState<"pointer" | "hand">("pointer");
  const [spacePressed, setSpacePressed] = useState(false);

  const [selection, setSelection] = useState<{
    nodes: string[];
    groups: string[];
    edge: string | null;
  }>({ nodes: [], groups: [], edge: null });
  const [lastAgentId, setLastAgentId] = useState<string>("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<{
    nodeId: string;
    text: string;
  } | null>(null);

  const [history, setHistory] = useState<FlowspaceDocument[]>([]);
  const [future, setFuture] = useState<FlowspaceDocument[]>([]);

  const [workspaces, setWorkspaces] = useState<WorkspaceBrief[]>([]);
  const [projectStructures, setProjectStructures] = useState<
    WorkspaceStructureBrief[]
  >([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(
    null,
  );
  const preClickSelectionRef = useRef<{
    nodes: string[];
    structureId: string | null;
  }>({ nodes: [], structureId: null });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [workspaceFilesList, setWorkspaceFilesList] = useState<string[]>([]);
  const [fileInputDrafts, setFileInputDrafts] = useState<
    Record<string, string>
  >({});

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [connecting, setConnecting] = useState<{
    kind: FlowEdge["kind"];
    fromIds: string[];
    anchor: WireAnchor;
    reason?: string;
    fromPoint: { x: number; y: number; box?: Box };
    current: { x: number; y: number };
    reconnectingEdge?: FlowEdge;
    snappedTarget?: {
      nodeIds: string[];
      portId?: string;
      point: { x: number; y: number; box?: Box };
      label: string;
      isOriginalTarget?: boolean;
    } | null;
  } | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hubTarget, setHubTarget] = useState<{
    nodeId: string;
    kind: FlowEdge["kind"];
  } | null>(null);
  const [hubState, setHubState] = useState<{
    nodeId: string;
    kind: FlowEdge["kind"];
    progress: number;
    closing: boolean;
  } | null>(null);
  const hubCloseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hubProgressRef = useRef(0);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [snapPreview, setSnapPreview] = useState<
    "left" | "right" | "max" | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);

  /* Dialog states */
  const [launchDialog, setLaunchDialog] = useState<{
    plan: LaunchPlan;
    excluded: Set<string>;
  } | null>(null);
  const [paletteDialog, setPaletteDialog] = useState<{
    targetNodeId: string | null;
    query: string;
    index: number;
  } | null>(null);
  const [formModal, setFormModal] = useState<{
    title: string;
    description?: string;
    initialValue: string;
    secondaryLabel?: string;
    secondaryInitial?: string;
    onSubmit: (val: string, secondary?: string) => void;
  } | null>(null);
  const [sessionModal, setSessionModal] = useState<SessionBrief[] | null>(null);
  const sessionWireDrop = useRef<QuickCreateState | null>(null);
  useEffect(() => {
    if (!sessionModal) sessionWireDrop.current = null;
  }, [sessionModal]);
  const [fileModal, setFileModal] = useState<WorkspaceFilePreview | null>(null);
  const [templatePreviewModal, setTemplatePreviewModal] =
    useState<WorkflowTemplate | null>(null);
  const [syncModal, setSyncModal] = useState<{
    groupId: string;
    plan: SyncPlan;
  } | null>(null);
  const [mergePortsModal, setMergePortsModal] = useState<{
    groupId: string;
    name: string;
    selectedPortIds: Set<string>;
  } | null>(null);
  const [exchangeModal, setExchangeModal] = useState<ExchangePair | null>(null);
  const [helpModal, setHelpModal] = useState(false);
  /* ComfyUI interaction layer */
  const [quickCreate, setQuickCreate] = useState<QuickCreateState | null>(null);
  const [teamPicker, setTeamPicker] = useState<{ at?: { x: number; y: number } } | null>(null);
  const [workflowImport, setWorkflowImport] = useState<{ request: WorkflowImportRequest; missing?: TeamModel[] }>();
  const [payloadPeek, setPayloadPeek] = useState<PayloadPeekState | null>(null);
  /** Subgraph clipboard lives in memory only: it is a draft document fragment, never runtime state. */
  const clipboardRef = useRef<SubgraphClipboard | null>(null);
  /** Last pointer position over the canvas viewport (client coords) for cursor-anchored paste/menus. */
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  /** Agent card whose task input should grab focus once it renders (double-click create). */
  const pendingFocusRef = useRef<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewAnimToken = useRef(0);
  /* Live viewport engine: pan / zoom frames write straight to the DOM (compositor-only
     transforms) and React state is committed once the gesture settles. */
  const worldRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const rasterView = useRef<FlowspaceDocument["viewport"]>();
  const gridRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLButtonElement>(null);
  const miniViewportRef = useRef<SVGRectElement>(null);
  const miniFrameRef = useRef<MiniFrame | null>(null);
  /* Cursor light: a soft halo plus a lens that lifts the grid dots near the pointer. */
  const cursorFxRef = useRef<HTMLDivElement>(null);
  const lensGridRef = useRef<HTMLDivElement>(null);
  const gridFrameRef = useRef<ReturnType<typeof applyGridFrame>>();
  const viewCommitTimer = useRef<ReturnType<typeof setTimeout>>();
  const movingTimer = useRef<ReturnType<typeof setTimeout>>();
  const committedLodRef = useRef(false);
  const typeScaleRef = useRef(1);
  const typeElements = useRef(new Set<HTMLElement>());
  const wheelTargetRef = useRef<{
    view: { x: number; y: number; zoom: number };
    anchor: { x: number; y: number };
  } | null>(null);
  const wheelRafRef = useRef(0);
  const mountedSessionsRef = useRef(new Map<string, number>());
  const autoSwitchedSteps = useRef(new Set<string>());
  const sidebarAutoAdjusted = useRef(false);

  const [vpSize, setVpSize] = useState({ width: 960, height: 640 });
  const [hostDark, setHostDark] = useState(detectHostDark);
  const [sysReducedMotion, setSysReducedMotion] = useState(false);

  const showToast = useCallback((msg: unknown, isError = false) => {
    const text = msg instanceof Error ? msg.message : String(msg);
    setToastState({ text, error: isError, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToastState((prev) => ({ ...prev, visible: false })),
      2800,
    );
  }, []);

  const reportError = useCallback(
    (err: unknown) => showToast(err, true),
    [showToast],
  );

  const onPresenceChange = useCallback(
    (sessionId: string, mounted: boolean) => {
      const prev = mountedSessionsRef.current.get(sessionId) ?? 0;
      if (mounted) {
        mountedSessionsRef.current.set(sessionId, prev + 1);
      } else if (prev <= 1) {
        mountedSessionsRef.current.delete(sessionId);
      } else {
        mountedSessionsRef.current.set(sessionId, prev - 1);
      }
      bridge.presence([...mountedSessionsRef.current.keys()]);
    },
    [bridge],
  );

  /* Observe DSH theme on <html> + <body> (layout effect: re-check before first paint) */
  useLayoutEffect(() => {
    const checkTheme = () => setHostDark(detectHostDark());
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    for (const el of [document.documentElement, document.body]) {
      obs.observe(el, { attributes: true, attributeFilter: HOST_THEME_ATTRS });
    }
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", checkTheme);
    return () => {
      obs.disconnect();
      scheme.removeEventListener("change", checkTheme);
    };
  }, []);

  /* System reduced-motion */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSysReducedMotion(mq.matches);
    const onMq = () => setSysReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  /* Observe viewport & root container dimensions */
  useEffect(() => {
    const vp = viewportRef.current;
    const root = rootRef.current;
    if (!vp || !root) return;
    const ro = new ResizeObserver(() => {
      setVpSize({
        width: vp.clientWidth || 960,
        height: vp.clientHeight || 640,
      });
      if (!sidebarAutoAdjusted.current && root.clientWidth > 0) {
        sidebarAutoAdjusted.current = true;
        if (root.clientWidth < 1040) setSidebarOpen(false);
      }
    });
    ro.observe(vp);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  /* Connect bridge & load workspaces + 4-tier project structures */
  const refreshProjectStructures = useCallback(() => {
    void bridge
      .projectStructures()
      .then(setProjectStructures)
      .catch(() => {});
  }, [bridge]);

  useEffect(() => bridge.connect(), [bridge]);
  useEffect(() => {
    void bridge
      .workspaces()
      .then((list) => {
        setWorkspaces(list);
        setActiveWorkspaceId(list[0]?.id ?? "");
      })
      .catch(reportError);
    refreshProjectStructures();
  }, [bridge, reportError, refreshProjectStructures]);

  useEffect(() => {
    for (const notice of snapshot?.notices ?? []) {
      if (notice.at < noticeSince.current || seenNotices.current.has(notice.id)) continue;
      seenNotices.current.add(notice.id);
      if (renderNotice) setNotice(notice);
      else showToast(`${notice.title} · ${notice.text}`);
      if (notice.system && typeof Notification !== "undefined" && Notification.permission === "granted")
        new Notification(notice.title, { body: notice.text });
      if (notice.sound && typeof AudioContext !== "undefined") {
        const audio = new AudioContext();
        const tone = audio.createOscillator();
        const volume = audio.createGain();
        volume.gain.value = .06;
        tone.connect(volume).connect(audio.destination);
        tone.start();
        tone.stop(audio.currentTime + .15);
        tone.onended = () => { void audio.close(); };
      }
    }
  }, [snapshot?.notices, showToast, renderNotice]);

  const activeWorkspaceCwd = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId)?.path,
    [workspaces, activeWorkspaceId],
  );

  useEffect(() => {
    void bridge
      .workspaceFiles(activeWorkspaceCwd)
      .then(setWorkspaceFilesList)
      .catch(() => setWorkspaceFilesList([]));
  }, [bridge, activeWorkspaceCwd]);

  /* Flush & Edit document */
  const acceptGeneration = useCallback((local: FlowspaceDocument, host: FlowspaceDocument) => {
    if (!initialized.current) return local;
    const received = receiveGeneration(local, host);
    if (received.history.length) {
      setHistory(history => [...history, ...received.history].slice(-40));
      setFuture([]);
    }
    return received.document;
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (!dirty.current) {
      await savingPromise.current;
      return;
    }
    const rev = revision.current;
    if (sentRevision.current === rev) {
      await savingPromise.current;
      return;
    }
    sentRevision.current = rev;
    const task = savingPromise.current.then(async () => {
      if (!dirty.current) return;
      // A config accepted by the Host while this save was queued is part of this document.
      const currentRevision = revision.current;
      const submitted = docRef.current;
      try {
        const accepted = await bridge.save(submitted);
        const current = acceptGeneration(docRef.current, accepted);
        if ((accepted.generationRevision ?? 0) >= (current.generationRevision ?? 0)) {
          const reconciled = reconcileLaneChanges(submitted, current, accepted);
          if (reconciled !== docRef.current) {
            docRef.current = reconciled;
            setDoc(reconciled);
          }
        }
        if (revision.current === currentRevision) {
          dirty.current = false;
          setSaved(true);
        }
      } catch (err) {
        if (sentRevision.current === rev) {
          sentRevision.current = -1;
        }
        throw err;
      }
    });
    savingPromise.current = task.catch(reportError);
    await task;
  }, [bridge, reportError, acceptGeneration]);
  const dataPreviews = useCanvasPreviews(baseDoc, snapshot, bridge, flush);
  const previewHeights = dataPreviews.heights;
  const endpointIndex = useMemo(() => ({ nodes: nodesById, ancestors: collapsed, ports: groupPorts, branchScroll, previewHeights }),
    [nodesById, collapsed, groupPorts, branchScroll, previewHeights]);

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      if (dirty.current) void bridge.save(docRef.current).catch(reportError);
      bridge.presence([]);
    },
    [bridge, reportError],
  );

  const commitEdit = useCallback(
    (next: FlowspaceDocument, delay = 450) => {
      revision.current++;
      docRef.current = next;
      setDoc(next);
      dirty.current = true;
      setSaved(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flush().catch(reportError);
      }, delay);
    },
    [flush, reportError],
  );

  const edit = useCallback(
    (
      mutator: (d: FlowspaceDocument) => void,
      options: { remember?: boolean; delay?: number } = {},
    ) => {
      if (replayLocked.current) return;
      const { remember = true, delay = 450 } = options;
      const prev = docRef.current;
      const next = structuredClone(prev);
      if (remember) {
        setHistory((h) => [...h.slice(-39), prev]);
        setFuture([]);
      }
      mutator(next);
      commitEdit(next, delay);
    },
    [commitEdit],
  );

  const applyConfig = useCallback((id: string, config: NonNullable<FlowNode["config"]>, configVersion: number) => {
    const task = savingPromise.current.then(async () => {
      const before = docRef.current;
      const submittedRevision = revision.current;
      const withConfig = (document: FlowspaceDocument, changes: Pick<FlowNode, "config" | "configVersion">) => ({
        ...document, nodes: document.nodes.map(node => node.id === id ? { ...node, ...changes } : node),
      });
      if (!before.nodes.some(node => node.id === id)) return;
      applyingConfig.current = true;
      try {
        const savedDocument = await bridge.save(withConfig(before, { config, configVersion }));
        const local = acceptGeneration(docRef.current, savedDocument);
        const latest = (savedDocument.generationRevision ?? 0) >= (local.generationRevision ?? 0)
          ? reconcileLaneChanges(before, local, savedDocument) : local;
        if (!latest.nodes.some(node => node.id === id)) return;
        setHistory(history => [...history.slice(-39), local]);
        setFuture([]);
        if (revision.current !== submittedRevision) {
          const accepted = savedDocument.nodes.find(node => node.id === id)!;
          commitEdit(withConfig(latest, { config: accepted.config, configVersion: accepted.configVersion }), 0);
        } else {
          revision.current++;
          sentRevision.current = revision.current;
          dirty.current = false;
          setSaved(true);
          const accepted = savedDocument.nodes.find(node => node.id === id)!;
          const next = (latest.generationRevision ?? 0) > (savedDocument.generationRevision ?? 0)
            ? withConfig(latest, { config: accepted.config, configVersion: accepted.configVersion }) : savedDocument;
          docRef.current = next;
          setDoc(next);
        }
      } finally {
        applyingConfig.current = false;
      }
    });
    savingPromise.current = task.catch(() => {}); // ConfigForm displays this request's Host error.
    return task;
  }, [bridge, commitEdit, acceptGeneration]);

  /* Sync incoming Host snapshots */
  const lastHostDoc = useRef<FlowspaceDocument>();
  useEffect(() => {
    if (!snapshot) return;
    const previousNodes = lastHostDoc.current && lastHostDoc.current !== snapshot.document
      ? byId(docRef.current.nodes)
      : undefined;
    const incoming = lastHostDoc.current !== snapshot.document &&
      (snapshot.document.generationRevision ?? 0) >= (docRef.current.generationRevision ?? 0);
    const rebased = rebaseContainerChanges(docRef.current, snapshot.containerChanges ?? []);
    const generated = incoming ? acceptGeneration(rebased, snapshot.document) : rebased;
    if (incoming && !dirty.current && !applyingConfig.current) {
      docRef.current = snapshot.document;
      setDoc(snapshot.document);
    } else if (incoming || rebased !== docRef.current) {
      const local = lastHostDoc.current ? reconcileLaneChanges(lastHostDoc.current, generated, snapshot.document) : generated;
      const hostNodes = byId(snapshot.document.nodes);
      const hostEdges = byId(snapshot.document.edges);
      const merged: FlowspaceDocument = {
        ...local,
        nodes: local.nodes.map((n) => {
          const host = hostNodes.get(n.id);
          if (!host) return n;
          return shareSnapshotValue(n, {
            ...n,
            ...(host.sessionId ? { sessionId: host.sessionId } : {}),
            ...(host.lastSubmittedTask !== undefined
              ? { lastSubmittedTask: host.lastSubmittedTask }
              : {}),
            ...(((n.kind === "display" && !n.fixed) ||
              (n.kind === "detail" && !n.pinned)) &&
            host.text
              ? { text: host.text, sourceSeq: host.sourceSeq }
              : {}),
          });
        }),
        edges: local.edges.map((e) => {
          const hostEdge = hostEdges.get(e.id);
          if (!hostEdge) return e;
          if (e.sentVersion === hostEdge.sentVersion && e.originMode === (hostEdge.originMode ?? e.originMode)) return e;
          return {
            ...e,
            sentVersion: hostEdge.sentVersion,
            originMode: hostEdge.originMode ?? e.originMode,
          };
        }),
      };
      const next = shareSnapshotValue(docRef.current, merged);
      docRef.current = next;
      setDoc(next);
    }
    if (incoming) lastHostDoc.current = snapshot.document;
    if (!initialized.current) {
      initialized.current = true;
      const d = snapshot.document;
      if (
        d.nodes.length > 0 &&
        d.viewport.x === 0 &&
        d.viewport.y === 0 &&
        d.viewport.zoom === 1
      ) {
        requestAnimationFrame(() => {
          const vp = viewportRef.current;
          if (!vp) return;
          const cur = docRef.current;
          const boxes = cur.nodes
            .filter((n) => !collapsedAncestor(cur, n.id))
            .map((n) => (n.kind === "group" ? groupBox(n) : nodeBox(n, false)));
          if (boxes.length) {
            const target = fit(
              { width: vp.clientWidth || 960, height: vp.clientHeight || 640 },
              boxes,
              1,
            );
            setViewportDirect(target, 400);
          }
        });
      }
    }

    const switchToConversation = new Set<string>();
    for (const run of snapshot.runs) {
      if (run.state !== "running") continue;
      for (const step of run.steps) {
        if (
          step.state === "running" &&
          !autoSwitchedSteps.current.has(step.id)
        ) {
          autoSwitchedSteps.current.add(step.id);
          const target = docRef.current.nodes.find((n) => n.id === step.nodeId);
          if (target && target.tab !== "conversation") switchToConversation.add(target.id);
        }
      }
    }
    const justBound = new Set(docRef.current.nodes.flatMap((node) => {
      const before = previousNodes?.get(node.id);
      return node.sessionId && node.expanded && node.tab === "conversation" && before && !before.sessionId
        ? [node.id]
        : [];
    }));
    if (!switchToConversation.size && !justBound.size) return;
    edit(
      (d) => {
        for (const node of d.nodes) {
          const switching = switchToConversation.has(node.id);
          const bound = justBound.has(node.id);
          if (!switching && !bound) continue;
          const previous = nodeBox(bound ? { ...node, sessionId: undefined } : node);
          if (switching) node.tab = "conversation";
          reflowCanvasItem(d, node, previous);
        }
      },
      { remember: false },
    );
  }, [snapshot, edit, acceptGeneration]);

  const prefs = useMemo(
    () => ({
      theme: doc.prefs?.theme ?? "auto",
      wheel: doc.prefs?.wheel ?? "zoom",
      wireRouting: doc.prefs?.wireRouting ?? DEFAULT_WIRE_ROUTING,
      snap: doc.prefs?.snap ?? true,
      filter: doc.prefs?.filter ?? "all",
      hiddenWorkspaces: doc.prefs?.hiddenWorkspaces ?? [],
      showBranches: doc.prefs?.showBranches ?? true,
      showWorktrees: doc.prefs?.showWorktrees ?? true,
    }),
    [doc.prefs],
  );

  const effectiveTheme: "dark" | "light" =
    prefs.theme === "auto" ? (hostDark ? "dark" : "light") : prefs.theme;
  const reducedMotion = doc.settings.reducedMotion || sysReducedMotion;
  const view = doc.viewport;
  const lod = view.zoom < LOD_ZOOM;
  committedLodRef.current = lod;
  const paintAreaRef = useRef<Box>(padded(viewportBox(view, vpSize), 128 / view.zoom));
  const paintArea = useMemo(() => {
    const viewport = viewportBox(view, vpSize);
    const old = paintAreaRef.current;
    if (encloses(old, viewport) && old.w < viewport.w * 1.45 && old.h < viewport.h * 1.65) return old;
    const target = wheelTargetRef.current?.view;
    // Cover the approaching part of a glide in one scene update. Bound prefetch
    // on large wheel jumps and still update card detail on the actual threshold.
    if (rasterScene && target && target.zoom < view.zoom) {
      const end = lod || target.zoom >= LOD_ZOOM ? target : viewAtDetailBoundary(view, target);
      const ahead = bounds([viewport, viewportBox(end, vpSize)]);
      if (ahead.w <= viewport.w * 2 && ahead.h <= viewport.h * 2) return padded(ahead, 96 / end.zoom);
    }
    return padded(viewport, 96 / view.zoom);
  }, [view, vpSize, lod, rasterScene]);
  useLayoutEffect(() => { paintAreaRef.current = paintArea; }, [paintArea]);

  /* ---------- Cursor light ----------
     Two compositor layers under the world: a wide halo that trails the pointer like
     liquid, and a tight lens that lifts and tints the grid dots right under it. All
     motion is transform-only and runs in its own rAF loop, so it never touches React. */
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const cursorHaloRef = useRef<HTMLDivElement>(null);
  const cursorLensRef = useRef<HTMLDivElement>(null);
  const cursorFx = useRef({ tx: 0, ty: 0, lx: 0, ly: 0, hx: 0, hy: 0, raf: 0, last: 0, primed: false });

  /* The lens carries its own copy of the grid, counter-moved so its dots sit exactly on
     the real ones: lens offset cancels out, leaving the live grid transform. */
  const paintCursorLensGrid = useCallback(() => {
    const lensGrid = lensGridRef.current;
    const frame = gridFrameRef.current;
    if (!lensGrid || !frame) return;
    const s = cursorFx.current;
    const x = tileOffset(frame.x + CURSOR_LENS_R - s.lx, frame.period);
    const y = tileOffset(frame.y + CURSOR_LENS_R - s.ly, frame.period);
    paintLayer(lensGrid, { transform: `translate3d(${x}px, ${y}px, 0) scale(${frame.scale})` });
  }, []);

  const stepCursorFx = useCallback(
    (now: number) => {
      const s = cursorFx.current;
      const halo = cursorHaloRef.current;
      const lens = cursorLensRef.current;
      if (!halo || !lens) {
        s.raf = 0;
        return;
      }
      const dt = Math.min(64, s.last ? now - s.last : 16);
      s.last = now;
      const still = reducedMotionRef.current;
      const kl = still ? 1 : 1 - Math.exp(-dt / CURSOR_LENS_TAU_MS);
      const kh = still ? 1 : 1 - Math.exp(-dt / CURSOR_HALO_TAU_MS);
      s.lx += (s.tx - s.lx) * kl;
      s.ly += (s.ty - s.ly) * kl;
      s.hx += (s.tx - s.hx) * kh;
      s.hy += (s.ty - s.hy) * kh;
      paintLayer(halo, { transform: `translate3d(${s.hx - CURSOR_HALO_R}px, ${s.hy - CURSOR_HALO_R}px, 0)` });
      paintLayer(lens, { transform: `translate3d(${s.lx - CURSOR_LENS_R}px, ${s.ly - CURSOR_LENS_R}px, 0)` });
      paintCursorLensGrid();
      const settled =
        Math.abs(s.tx - s.hx) + Math.abs(s.ty - s.hy) < 0.3 &&
        Math.abs(s.tx - s.lx) + Math.abs(s.ty - s.ly) < 0.3;
      if (settled) {
        s.raf = 0;
        s.last = 0;
      } else {
        s.raf = requestAnimationFrame(stepCursorFx);
      }
    },
    [paintCursorLensGrid],
  );

  useEffect(() => {
    const vp = viewportRef.current;
    const root = cursorFxRef.current;
    if (!vp || !root) return;
    const layers = [cursorHaloRef.current, cursorLensRef.current, lensGridRef.current];
    const CHROME =
      ".fs-canvas-controls, .fs-minimap, .fs-canvas-toolbar, .offscreen-indicator, .fs-welcome-card";
    const BUSY =
      ".node, .fs-struct-card, .group-header, .composite, .edge-hit, .edge-tag, .exchange-tag, .waypoint, .fs-input-satellite, .fs-hub-corridor";
    let rect = vp.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      rect = vp.getBoundingClientRect();
    });
    ro.observe(vp);
    const setOn = (on: boolean) => {
      if (on === (root.dataset.on === "1")) return;
      if (on) root.dataset.on = "1";
      else delete root.dataset.on;
    };
    const onEnter = () => {
      rect = vp.getBoundingClientRect();
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return;
      const s = cursorFx.current;
      s.tx = ev.clientX - rect.left;
      s.ty = ev.clientY - rect.top;
      if (!s.primed) {
        // Re-entering: appear under the pointer instead of sweeping in from the last exit.
        s.primed = true;
        s.lx = s.hx = s.tx;
        s.ly = s.hy = s.ty;
      }
      setOn(!(ev.target as Element | null)?.closest?.(CHROME));
      if (!s.raf) s.raf = requestAnimationFrame(stepCursorFx);
    };
    const onLeave = () => {
      setOn(false);
      cursorFx.current.primed = false;
    };
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0 || reducedMotionRef.current) return;
      const target = ev.target as Element | null;
      if (target?.closest?.(`${CHROME}, ${BUSY}`)) return;
      const ring = document.createElement("i");
      ring.className = "fx-ripple";
      // `translate` (not `transform`) so the keyframed `scale` blooms about the press point.
      ring.style.translate = `${ev.clientX - rect.left}px ${ev.clientY - rect.top}px`;
      const drop = () => ring.remove();
      ring.addEventListener("animationend", drop, { once: true });
      setTimeout(drop, 1400);
      root.appendChild(ring);
    };
    vp.addEventListener("pointerenter", onEnter);
    vp.addEventListener("pointermove", onMove, { passive: true });
    vp.addEventListener("pointerleave", onLeave);
    vp.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      ro.disconnect();
      vp.removeEventListener("pointerenter", onEnter);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerleave", onLeave);
      vp.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(cursorFx.current.raf);
      cursorFx.current.raf = 0;
      for (const layer of layers) if (layer) settleLayer(layer);
    };
  }, [stepCursorFx]);

  /* Liquid-glass capsules catch a glint that follows the pointer across them. The
     variables land on the one hovered capsule only, so the restyle stays tiny. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const CAPSULE = ".canvas-title, .toolbar-actions, .pointer-tools, .view-tools, .fs-minimap";
    let lit: HTMLElement | null = null;
    let raf = 0;
    let px = 0;
    let py = 0;
    const paint = () => {
      raf = 0;
      if (!lit) return;
      const r = lit.getBoundingClientRect();
      lit.style.setProperty("--lx", `${Math.round(px - r.left)}px`);
      lit.style.setProperty("--ly", `${Math.round(py - r.top)}px`);
    };
    const onMove = (ev: PointerEvent) => {
      lit = ((ev.target as Element | null)?.closest?.(CAPSULE) as HTMLElement | null) ?? null;
      if (!lit) return;
      px = ev.clientX;
      py = ev.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    root.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      root.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* Paint one viewport frame without React: world transform, grid layer, HUD readouts. */
  const applyViewToDom = useCallback(
    (v: { x: number; y: number; zoom: number }, settle = false) => {
      const world = worldRef.current;
      const camera = cameraRef.current;
      if (world && camera) {
        const base = rasterView.current;
        if (!rasterScene) {
          if (base) {
            settleLayer(camera);
            rasterView.current = undefined;
          }
          const transform = worldTransform(v);
          if (settle) {
            world.style.transform = transform;
            settleLayer(world);
          } else paintLayer(world, { transform });
        } else if (settle || !base || (base.zoom < LOD_ZOOM) !== (v.zoom < LOD_ZOOM)) {
          // Crossing replaces the card layout anyway. Rasterise the new layout at
          // the crossing scale instead of repainting it at the old settled scale.
          world.style.transform = worldTransform(v);
          settleLayer(world);
          settleLayer(camera);
          rasterView.current = v;
        } else {
          // Composite the raster at the last settled zoom. Baking the final scale
          // into the inner world on release keeps stationary text at device resolution.
          const zoom = v.zoom / base.zoom;
          paintLayer(camera, { transform: worldTransform({ x: v.x - base.x * zoom, y: v.y - base.y * zoom, zoom }) });
        }
        // On large scenes the camera composites the settled raster during a glide.
        // Resize its text and port glyphs only when the world is rasterised again.
        const ts = typeScaleFor(rasterView.current?.zoom ?? v.zoom);
        if (ts !== typeScaleRef.current) {
          typeScaleRef.current = ts;
          for (const element of typeElements.current) element.style.setProperty("--fs-type-scale", String(ts));
        }
      }
      const grid = gridRef.current;
      if (grid) {
        gridFrameRef.current = applyGridFrame(grid, v, settle, lensGridRef.current);
        if (cursorFx.current.primed) paintCursorLensGrid();
      }
      const label = zoomLabelRef.current;
      const pct = `${Math.round(v.zoom * 100)}%`;
      const text = label?.firstChild;
      if (text && text.nodeValue !== pct) text.nodeValue = pct;
      const mini = miniFrameRef.current;
      const miniRect = miniViewportRef.current;
      if (mini && miniRect) {
        const r = miniViewRect(mini, v);
        if (settle) {
          miniRect.setAttribute("x", String(r.x));
          miniRect.setAttribute("y", String(r.y));
          miniRect.setAttribute("width", String(r.w));
          miniRect.setAttribute("height", String(r.h));
          settleLayer(miniRect);
        } else paintLayer(miniRect, { x: `${r.x}px`, y: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      }
    },
    [paintCursorLensGrid, rasterScene],
  );

  /* Suppress hover churn during motion and settle the raster at its final scale. */
  const markViewMoving = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    if (!world.dataset.moving) world.dataset.moving = "1";
    clearTimeout(movingTimer.current);
    movingTimer.current = setTimeout(() => {
      delete world.dataset.moving;
      applyViewToDom(docRef.current.viewport, true);
      if (preparedCrossing.current !== undefined) {
        preparedCrossing.current = undefined;
        setZoomPreparation(null);
      }
    }, 200);
  }, [applyViewToDom]);

  const prepareZoom = useCallback((target: FlowspaceDocument["viewport"]) => {
    const origin = docRef.current.viewport;
    const compact = target.zoom < LOD_ZOOM;
    if (compact === (origin.zoom < LOD_ZOOM)) {
      if (preparedCrossing.current !== undefined) {
        preparedCrossing.current = undefined;
        startTransition(() => setZoomPreparation(null));
      }
      return;
    }
    if (preparedCrossing.current === compact) return;
    preparedCrossing.current = compact;
    const area = padded(viewportBox(viewAtDetailBoundary(origin, target), vpSize), 48);
    startTransition(() => setZoomPreparation({ area, compact }));
  }, [vpSize]);

  const setViewportDirect = useCallback(
    (nextView: { x: number; y: number; zoom: number }, persistDelay = 500) => {
      const next = { ...docRef.current, viewport: nextView };
      revision.current++;
      docRef.current = next;
      if (!dirty.current) setSaved(false);
      dirty.current = true;
      applyViewToDom(nextView);
      markViewMoving();
      const nextLod = nextView.zoom < LOD_ZOOM;
      clearTimeout(viewCommitTimer.current);
      const nextBox = viewportBox(nextView, vpSize);
      if (nextLod !== committedLodRef.current || !encloses(paintAreaRef.current, nextBox)) {
        // Semantic-zoom flips card layouts, so React must re-render right away.
        committedLodRef.current = nextLod;
        setDoc(next);
      } else {
        viewCommitTimer.current = setTimeout(() => {
          setDoc(docRef.current);
        }, VIEW_COMMIT_IDLE_MS);
      }
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(
        () => {
          void flush().catch(reportError);
        },
        Math.max(persistDelay, VIEW_COMMIT_IDLE_MS + 120),
      );
    },
    [applyViewToDom, markViewMoving, flush, reportError, vpSize],
  );

  useEffect(
    () => () => {
      viewAnimToken.current++;
      clearTimeout(viewCommitTimer.current);
      clearTimeout(movingTimer.current);
      cancelAnimationFrame(wheelRafRef.current);
    },
    [],
  );

  /* Keep the DOM-driven layers (grid, HUD readouts) in step with committed views too,
     e.g. Host snapshots, undo, or the grid element mounting after a route switch. */
  useLayoutEffect(() => {
    applyViewToDom(docRef.current.viewport, !worldRef.current?.dataset.moving);
  }, [applyViewToDom, view, routeName, minimapOpen]);
  useLayoutEffect(() => {
    if (!lod && !typeElements.current.size) return;
    const matches = lod && worldRef.current?.querySelectorAll<HTMLElement>(
      ".fs-card-slot:not([hidden]) :is(.port,.compact .node-heading strong,.compact-status .status,.compact-status .fs-team-node-summary,.compact-kind,.compact-overview-detail,.compact .node-actions,.compact .fs-lane-badges,.compact-release),.group-header > :is(strong,.fs-lane-metrics)",
    );
    const elements = new Set(matches ? Array.from(matches) : []);
    const scale = String(typeScaleRef.current);
    for (const element of elements) {
      if (!typeElements.current.has(element)) element.style.setProperty("--fs-type-scale", scale);
    }
    typeElements.current = elements;
  });

  const animateView = useCallback(
    (
      target: { x: number; y: number; zoom: number },
      duration = MOTION.hero,
    ) => {
      const token = ++viewAnimToken.current;
      wheelTargetRef.current = null;
      const from = { ...docRef.current.viewport };
      if (reducedMotion || duration <= 0) {
        setViewportDirect(target, 300);
        return;
      }
      prepareZoom(target);
      const started = performance.now();
      // Interpolate zoom geometrically so zooming in and out feel equally paced.
      const logFrom = Math.log(from.zoom);
      const logTo = Math.log(target.zoom);
      const step = (now: number) => {
        if (token !== viewAnimToken.current) return;
        const frac = clamp((now - started) / duration, 0, 1);
        const eased = easeView(frac);
        const cur = {
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
          zoom: Math.exp(logFrom + (logTo - logFrom) * eased),
        };
        setViewportDirect(frac < 1 ? cur : target, frac < 1 ? 1200 : 300);
        if (frac < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [reducedMotion, setViewportDirect, prepareZoom],
  );

  /* Eased wheel zoom / pan: wheel notches set a target that the view glides toward,
     keeping the world point under the cursor pinned while the zoom settles. */
  const glideViewTo = useCallback(
    (
      target: { x: number; y: number; zoom: number },
      anchor: { x: number; y: number },
    ) => {
      if (reducedMotion) {
        wheelTargetRef.current = null;
        setViewportDirect(target, 400);
        return;
      }
      wheelTargetRef.current = { view: target, anchor };
      prepareZoom(target);
      if (wheelRafRef.current) return;
      let last = performance.now();
      const tick = (now: number) => {
        const goal = wheelTargetRef.current;
        if (!goal) {
          wheelRafRef.current = 0;
          return;
        }
        const dt = Math.min(64, now - last);
        last = now;
        const k = 1 - Math.exp(-dt / WHEEL_GLIDE_TAU_MS);
        const cur = docRef.current.viewport;
        const t = goal.view;
        const zoom = Math.exp(
          Math.log(cur.zoom) + (Math.log(t.zoom) - Math.log(cur.zoom)) * k,
        );
        let x: number, y: number;
        if (Math.abs(t.zoom - cur.zoom) > 1e-5) {
          const wx = (goal.anchor.x - t.x) / t.zoom;
          const wy = (goal.anchor.y - t.y) / t.zoom;
          x = goal.anchor.x - wx * zoom;
          y = goal.anchor.y - wy * zoom;
        } else {
          x = cur.x + (t.x - cur.x) * k;
          y = cur.y + (t.y - cur.y) * k;
        }
        const settled =
          Math.abs(t.zoom - zoom) < 1e-4 &&
          Math.abs(t.x - x) < 0.3 &&
          Math.abs(t.y - y) < 0.3;
        setViewportDirect(settled ? t : { x, y, zoom }, 400);
        if (settled) {
          wheelTargetRef.current = null;
          wheelRafRef.current = 0;
          return;
        }
        wheelRafRef.current = requestAnimationFrame(tick);
      };
      wheelRafRef.current = requestAnimationFrame(tick);
    },
    [reducedMotion, setViewportDirect, prepareZoom],
  );

  const fitBoxes = useCallback(
    (boxes: Box[], instant = false) => {
      if (!boxes.length) return;
      const rect = viewportRef.current?.getBoundingClientRect();
      const width = rect?.width || vpSize.width;
      const height = rect?.height || vpSize.height;
      const target = fit({ width, height }, boxes, 1);
      animateView(target, instant ? 0 : MOTION.hero);
    },
    [vpSize.width, vpSize.height, animateView],
  );

  /* Focus request from Native DSH ChatBadge */
  useEffect(() => {
    const focusId = bridge.takeFocus();
    if (!focusId) return;
    const n = docRef.current.nodes.find((x) => x.id === focusId);
    if (n) {
      setRouteName("canvas");
      setSelection({ nodes: [focusId], groups: [], edge: null });
      setInspectorOpen(true);
      if (n.kind === "agent") setLastAgentId(focusId);
      const box = nodeBox(n, false, true);
      setTimeout(() => fitBoxes([box]), 60);
    }
  }, [bridge, snapshot, fitBoxes]);

  /* Visibility & Waiting Helpers */
  const filterSnapshot = ["all", "auto"].includes(prefs.filter) ? null : snapshot;
  const passesNodeFilter = useCallback(
    (node: FlowNode | undefined): boolean => {
      if (!node || node.kind === "group") return false;
      const wsKey = node.workspaceId || "__default__";
      if (prefs.hiddenWorkspaces.includes(wsKey)) return false;
      if (node.kind === "agent" && prefs.filter !== "all") {
        const runtime = runtimeIndex(filterSnapshot);
        const st = nodeStatusOf(filterSnapshot, node.id);
        const active = ["running", "settling", "waiting", "queued", "input"].includes(st);
        if (prefs.filter === "running") return active;
        const liveItem = runtime.live.get(node.id);
        const lastStepAt = runtime.steps.get(node.id)?.at(-1)?.createdAt ?? 0;
        const updatedAt = Math.max(liveItem?.updatedAt ?? 0, lastStepAt);
        if (prefs.filter === "3d") {
          return (
            active ||
            !node.sessionId ||
            updatedAt === 0 ||
            Date.now() - updatedAt <= 3 * 86_400_000
          );
        }
        if (prefs.filter === "7d") {
          return (
            active ||
            !node.sessionId ||
            updatedAt === 0 ||
            Date.now() - updatedAt <= 7 * 86_400_000
          );
        }
      }
      return true;
    },
    [prefs.hiddenWorkspaces, prefs.filter, filterSnapshot],
  );
  const isNodeVisible = useCallback(
    (node: FlowNode | undefined, ignoreCollapse = false) =>
      !!node && passesNodeFilter(node) && (ignoreCollapse || !collapsed.get(node.id)),
    [passesNodeFilter, collapsed],
  );

  const visibleGroups = useMemo(
    () =>
      doc.nodes.filter((g) => {
        if (g.kind !== "group") return false;
        if (g.parentId) {
          const parent = nodesById.get(g.parentId);
          if (parent?.collapsed) return false;
        }
        const groupMembers = membersOf(g.id);
        return !groupMembers.length || groupMembers.some(node => isNodeVisible(node, true));
      }),
    [doc.nodes, nodesById, membersOf, isNodeVisible],
  );

  const previousExpanded = useRef(new Set<string>());
  const keepExpandedIds = useMemo(() => {
    const ids = new Set<string>(selection.nodes);
    if (editingNodeId) ids.add(editingNodeId);
    for (const n of doc.nodes) {
      if (n.kind !== "agent") continue;
      const st = nodeStatusOf(snapshot, n.id);
      if (st === "waiting" || st === "input") ids.add(n.id);
    }
    if (ids.size === previousExpanded.current.size && [...ids].every(id => previousExpanded.current.has(id))) return previousExpanded.current;
    previousExpanded.current = ids;
    return ids;
  }, [selection.nodes, editingNodeId, doc.nodes, snapshot]);
  const cardBoxes = useMemo(() => {
    const cache = new WeakMap<FlowNode, [Box, Box]>();
    return (node: FlowNode) => {
      const stored = cache.get(node);
      if (stored) return stored;
      const expanded = Boolean(node.window) || keepExpandedIds.has(node.id);
      const previewHeight = previewHeights.get(node.id);
      const full = nodeBox(node, false, expanded, previewHeight);
      const compact = nodeBox(node, true, expanded, previewHeight);
      const boxes: [Box, Box] = [full, full.compact === compact.compact ? full : compact];
      cache.set(node, boxes);
      return boxes;
    };
  }, [keepExpandedIds, previewHeights]);
  const visibleNodes = useMemo(() => doc.nodes.filter(n => isNodeVisible(n)), [doc.nodes, isNodeVisible]);
  const sceneNodes = useMemo(() => visibleNodes.map(n => ({ n, b: cardBoxes(n)[Number(lod)] })), [visibleNodes, cardBoxes, lod]);
  const preparing = zoomPreparation?.compact !== lod ? zoomPreparation : null;
  const focusedCard = document.activeElement?.closest("[data-node-card]")?.getAttribute("data-node-card");

  const waitingAgentNodes = useMemo(
    () =>
      doc.nodes.filter((n) => {
        if (n.kind !== "agent" && n.kind !== "flow") return false;
        const st = nodeStatusOf(snapshot, n.id);
        return st === "waiting" || st === "input";
      }),
    [doc.nodes, snapshot],
  );

  const derivedStructure = useMemo(() => {
    const runningIds = new Set(
      doc.nodes
        .filter((n) => n.kind === "agent" && ["running", "settling"].includes(nodeStatusOf(snapshot, n.id)))
        .map((n) => n.id),
    );
    const waitingIds = new Set(waitingAgentNodes.map((n) => n.id));
    return buildDerivedStructure({
      projects: projectStructures,
      hiddenWorkspaces: prefs.hiddenWorkspaces,
      showBranches: prefs.showBranches,
      showWorktrees: prefs.showWorktrees,
      visibleNodes,
      visibleGroupBoxes: visibleGroups.map((group) => canvasItemBox(graphDocument, group)),
      lod,
      keepExpandedIds,
      runningNodeIds: runningIds,
      waitingNodeIds: waitingIds,
    });
  }, [
    graphDocument,
    visibleNodes,
    visibleGroups,
    snapshot,
    waitingAgentNodes,
    projectStructures,
    prefs.hiddenWorkspaces,
    prefs.showBranches,
    prefs.showWorktrees,
    lod,
    keepExpandedIds,
  ]);

  /* Native children: subagents hang from an agent's bottom port; role members from their role node. */
  const childTree = useMemo(() => buildChildTree({
    nodes: doc.nodes.filter((n) => isNodeVisible(n)),
    allNodes: doc.nodes,
    box: (n) => nodeBox(n, lod, keepExpandedIds.has(n.id)),
    obstacles: [
      ...visibleGroups.filter((group) => group.collapsed).map((group) => canvasItemBox(graphDocument, group)),
      ...derivedStructure.cards.map((card) => card.box),
    ],
    subagents: snapshot?.subagents ?? [],
    teams: snapshot?.teams,
  }), [graphDocument, isNodeVisible, visibleGroups, derivedStructure.cards, lod, keepExpandedIds, snapshot?.subagents, snapshot?.teams]);

  /* Selection & Reveal Helpers */
  const selectNode = useCallback(
    (id: string, additive = false) => {
      const target = docRef.current.nodes.find((n) => n.id === id);
      if (!target) return;
      if (target.kind === "group") {
        setSelection((prev) => ({
          nodes: additive ? prev.nodes : [],
          groups: additive
            ? prev.groups.includes(id)
              ? prev.groups.filter((x) => x !== id)
              : [...prev.groups, id]
            : [id],
          edge: null,
        }));
        return;
      }
      if (target.kind === "agent") setLastAgentId(id);
      setSelection((prev) => ({
        nodes: additive
          ? prev.nodes.includes(id)
            ? prev.nodes.filter((x) => x !== id)
            : [...prev.nodes, id]
          : [id],
        groups: additive ? prev.groups : [],
        edge: null,
      }));
    },
    [],
  );

  const revealNode = useCallback(
    (nodeId: string) => {
      const target = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!target) return;
      setMobileSidebar(false);
      edit(
        (d) => {
          const wsKey = target.workspaceId || "__default__";
          if (d.prefs?.hiddenWorkspaces?.includes(wsKey)) {
            d.prefs.hiddenWorkspaces = d.prefs.hiddenWorkspaces.filter(
              (k) => k !== wsKey,
            );
          }
          let cur = d.nodes.find((n) => n.id === nodeId);
          const ancestors: FlowNode[] = [];
          while (cur?.parentId) {
            const parentId = cur.parentId;
            cur = d.nodes.find((n) => n.id === parentId);
            if (cur?.collapsed) ancestors.unshift(cur);
          }
          for (const group of ancestors) {
            const previous = canvasItemBox(d, group);
            group.collapsed = false;
            reflowCanvasItem(d, group, previous);
          }
          if (d.prefs?.filter === "running") d.prefs.filter = "all";
        },
        { remember: false },
      );
      if (routeName !== "conversation") setRouteName("canvas");
      selectNode(nodeId);
      if (routeName !== "conversation") {
        const box = nodeBox(docRef.current.nodes.find((n) => n.id === nodeId) ?? target);
        const zoom = Math.max(docRef.current.viewport.zoom, 0.88);
        animateView({
          x: vpSize.width / 2 - (box.x + box.w / 2) * zoom,
          y: vpSize.height / 2 - (box.y + box.h / 2) * zoom - 8,
          zoom,
        });
      }
    },
    [edit, routeName, selectNode, animateView, vpSize.width, vpSize.height],
  );

  const focusGroup = useCallback(
    (groupId: string, instant = false) => {
      const group = docRef.current.nodes.find(
        (n) => n.id === groupId && n.kind === "group",
      );
      if (!group) return;
      setMobileSidebar(false);
      setRouteName("canvas");
      setSelection({ nodes: [], groups: [groupId], edge: null });
      fitBoxes([groupBox(group)], instant);
    },
    [fitBoxes],
  );

  const fitView = useCallback(
    (all = false, instant = false) => {
      const curDoc = docRef.current;
      const curZoom = curDoc.viewport.zoom;
      const curLod = curZoom < LOD_ZOOM;
      const hiddenWs = curDoc.prefs?.hiddenWorkspaces ?? [];
      const curFilter = curDoc.prefs?.filter ?? "all";
      const nodeShown = (n: FlowNode) => {
        if (n.kind === "group") return false;
        if (hiddenWs.includes(n.workspaceId || "__default__")) return false;
        if (collapsedAncestor(curDoc, n.id)) return false;
        if (curFilter === "running" && n.kind === "agent") {
          const st = nodeStatusOf(snapshot, n.id);
          if (!["running", "settling", "waiting", "queued", "input"].includes(st))
            return false;
        }
        return true;
      };
      if (!all && selection.groups.length) {
        const boxes = selection.groups
          .map((id) => curDoc.nodes.find((n) => n.id === id))
          .filter((g): g is FlowNode => !!g)
          .map((g) => groupBox(g));
        return fitBoxes(boxes, instant);
      }
      if (!all && selection.nodes.length) {
        const boxes = selection.nodes
          .map((id) => curDoc.nodes.find((n) => n.id === id))
          .filter((n): n is FlowNode => !!n)
          .map((n) => nodeBox(n, false, true));
        return fitBoxes(boxes, instant);
      }
      const groupsShown = curDoc.nodes.filter((g) => {
        if (g.kind !== "group") return false;
        if (g.parentId) {
          const parent = curDoc.nodes.find((p) => p.id === g.parentId);
          if (parent?.collapsed) return false;
        }
        const mIds = members(curDoc, g.id);
        return !mIds.length || mIds.some((id) => {
          const mn = curDoc.nodes.find((x) => x.id === id);
          return !!mn && !hiddenWs.includes(mn.workspaceId || "__default__");
        });
      });
      const allBoxes = [
        ...curDoc.nodes
          .filter(nodeShown)
          .map((n) => nodeBox(n, all ? curLod : false)),
        ...groupsShown.map((g) => groupBox(g)),
      ];
      fitBoxes(allBoxes, instant);
    },
    [selection, fitBoxes, snapshot],
  );

  /**
   * Fit freshly loaded workflows at a readable 82%–95% zoom. Never drops below the
   * LOD threshold; if the content is larger than the viewport, anchor its top-left
   * instead of shrinking cards into compact form.
   */
  const fitComfortably = useCallback(
    (boxes: Box[]) => {
      if (!boxes.length) return;
      const rect = viewportRef.current?.getBoundingClientRect();
      animateView(
        comfortableFit(
          {
            width: rect?.width || vpSize.width,
            height: rect?.height || vpSize.height,
          },
          boxes,
        ),
      );
    },
    [vpSize.width, vpSize.height, animateView],
  );

  const focusCreatedGroup = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find(
        (n) => n.id === groupId && n.kind === "group",
      );
      if (!grp) return;
      setRouteName("canvas");
      setSelection({ nodes: [], groups: [groupId], edge: null });
      requestAnimationFrame(() =>
        fitComfortably([groupBox(grp, 2, { doc: docRef.current })]),
      );
    },
    [fitComfortably],
  );

  /** Localized (zh/en, no mixed CJK) Analyze → Review → Deliver starter beside existing nodes. */
  const loadStarter = useCallback(() => {
    let groupId = "";
    edit((d) => {
      const before = new Set(d.nodes.map((n) => n.id));
      Object.assign(
        d,
        localizedStarterDocument(
          getLanguage(),
          activeWorkspaceCwd,
          activeWorkspaceId || undefined,
          d,
        ),
      );
      groupId =
        d.nodes.find((n) => n.kind === "group" && !before.has(n.id))?.id ?? "";
    });
    focusCreatedGroup(groupId);
  }, [edit, activeWorkspaceCwd, activeWorkspaceId, focusCreatedGroup]);

  /* Node & Edge Mutations */
  const editBoard = useCallback((id: string, change: BoardEdit) => {
    const current = docRef.current;
    const index = current.nodes.findIndex((node) => node.id === id && node.kind === "board");
    if (index < 0) return;
    const node = current.nodes[index];
    const patch = change(node);
    if (!Object.keys(patch).length) return;
    const next = { ...node, ...patch };
    if (patch.columns) next.text = boardSummaryText(patch.columns);
    const edges = pruneBoardReferences(next, current.edges);
    edit((doc) => {
      doc.nodes[index] = next;
      if (edges !== current.edges) doc.edges = edges;
    });
    if (edges !== current.edges) {
      const remains = new Set(edges.map((edge) => edge.id));
      setPayloadPeek((peek) => peek && !remains.has(peek.edgeId) ? null : peek);
      setSelection((selection) => selection.edge && !remains.has(selection.edge)
        ? { ...selection, edge: null } : selection);
    }
  }, [edit]);

  const editNode = useCallback(
    (id: string, changes: Partial<FlowNode>) => {
      const textOnly =
        Object.keys(changes).every((k) =>
          ["draft", "task", "text"].includes(k),
        );
      if (changes.expanded === undefined && changes.collapsed === undefined &&
          changes.tab === undefined && changes.sessionId === undefined) {
        const prev = docRef.current;
        const index = prev.nodes.findIndex(node => node.id === id);
        if (index === -1) return;
        if (!textOnly) {
          setHistory(history => [...history.slice(-39), prev]);
          setFuture([]);
        }
        const nodes = prev.nodes.slice();
        nodes[index] = { ...nodes[index], ...changes };
        commitEdit({ ...prev, nodes });
        return;
      }
      edit(
        (d) => {
          const n = d.nodes.find((x) => x.id === id);
          if (!n) return;
          const previous = canvasItemBox(d, n);
          Object.assign(n, changes);
          reflowCanvasItem(d, n, previous);
        },
        { remember: !textOnly },
      );
    },
    [edit, commitEdit],
  );

  const editEdge = useCallback(
    (id: string, changes: Partial<FlowEdge>) => {
      edit((d) => {
        const e = d.edges.find((x) => x.id === id);
        if (e) Object.assign(e, changes);
      });
    },
    [edit],
  );

  const toggleNodeForm = useCallback(
    (nodeId: string) => {
      const n = docRef.current.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      if (n.kind === "group") {
        editNode(nodeId, { collapsed: !n.collapsed });
      } else {
        editNode(nodeId, { expanded: !n.expanded });
      }
    },
    [editNode],
  );

  const openWindow = useCallback(
    (nodeId: string) => {
      const area = areaRef.current;
      const board = docRef.current.nodes.find((node) => node.id === nodeId)?.kind === "board";
      const w = Math.min(board ? 760 : 540, (area?.clientWidth ?? 900) - 48);
      const h = Math.min(540, (area?.clientHeight ?? 620) - 48);
      const maxZ = Math.max(
        10,
        ...docRef.current.nodes
          .filter((n) => n.window)
          .map((n) => n.window?.z ?? 10),
      );
      edit((d) => {
        const n = d.nodes.find((x) => x.id === nodeId);
        if (!n || n.kind === "group") return;
        const previous = nodeBox(n);
        n.expanded = true;
        n.window = {
          x: Math.max(20, ((area?.clientWidth ?? 900) - w) / 2),
          y: Math.max(20, ((area?.clientHeight ?? 620) - h) / 2),
          w,
          h,
          z: maxZ + 1,
        };
        reflowCanvasItem(d, n, previous);
      });
    },
    [edit],
  );

  const returnWindow = useCallback(
    (nodeId: string) => {
      edit((d) => {
        const n = d.nodes.find((x) => x.id === nodeId);
        if (n) delete n.window;
      });
    },
    [edit],
  );

  const openDetailCard = useCallback(
    (agentId: string) => {
      const source = docRef.current.nodes.find((n) => n.id === agentId);
      if (!source) return;
      const existing = docRef.current.nodes.find(
        (n) =>
          n.kind === "detail" &&
          n.sourceNodeId === agentId &&
          !n.pinned,
      );
      if (existing) {
        revealNode(existing.id);
        return;
      }
      const box = nodeBox(source, false, true);
      const latestOutput =
        snapshot?.live.find((l) => l.nodeId === agentId)?.output ||
        snapshot?.runs
          .flatMap((r) => r.steps)
          .filter((s) => s.nodeId === agentId)
          .at(-1)?.output ||
        "";
      const detail: FlowNode = {
        ...newNode(
          "detail",
          box.x + box.w + 36,
          box.y,
          `${source.title} · ${t("executionDetail")}`,
        ),
        sourceNodeId: agentId,
        text: latestOutput,
        fixed: false,
        pinned: false,
        expanded: true,
      };
      edit((d) => d.nodes.push(detail));
      selectNode(detail.id);
    },
    [snapshot, edit, revealNode, selectNode],
  );

  const createCanvasNode = useCallback(
    (
      kind: NodeKind,
      worldPoint?: { x: number; y: number },
      explicitAffiliation?: DraftAffiliation,
      usePreClick = false,
      extra?: {
        /** Exact top-left placement (e.g. wire-drop port alignment) instead of centring on the point. */
        place?: (node: FlowNode) => { x: number; y: number };
        patch?: Partial<FlowNode>;
        flowType?: string;
        /** Extra edits (edges) applied in the same undo step as the node creation. */
        link?: (d: FlowspaceDocument, created: FlowNode) => void;
      },
    ): FlowNode => {
      let pt = worldPoint;
      if (!pt) {
        const visibleBoxes = [
          ...docRef.current.nodes
            .filter((n) => isNodeVisible(n))
            .map((n) => nodeBox(n)),
          ...visibleGroups.map((g) => groupBox(g)),
        ];
        if (visibleBoxes.length) {
          const b = bounds(visibleBoxes);
          pt = { x: b.x + b.w + 120, y: b.y + 60 };
        } else {
          const rect = viewportRef.current?.getBoundingClientRect();
          pt = rect
            ? toWorld(
                docRef.current.viewport,
                rect,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
              )
            : { x: 120, y: 160 };
        }
      }
      const chosenStructId = usePreClick
        ? preClickSelectionRef.current.structureId
        : selectedStructureId;
      const chosenNodeIds = usePreClick
        ? preClickSelectionRef.current.nodes
        : selection.nodes;
      const preStruct: DerivedStructureCard | null = chosenStructId
        ? (derivedStructure.cards.find((c) => c.id === chosenStructId) ?? null)
        : null;
      const preNode = chosenNodeIds[0]
        ? (docRef.current.nodes.find((n) => n.id === chosenNodeIds[0]) ?? null)
        : null;
      const aff = resolveDraftAffiliation({
        explicit: explicitAffiliation,
        preSelectedStructure: preStruct,
        preSelectedNode: preNode,
        dropPoint: pt,
        structureCards: derivedStructure.cards,
        workspaces,
        activeWorkspaceId,
      });
      const boundAgent = docRef.current.nodes.find(
        (n) => n.kind === "agent" && Boolean(n.sessionId),
      );
      const x = Math.round((pt.x - 140) / 12) * 12;
      const y = Math.round((pt.y - 70) / 12) * 12;
      const created: FlowNode = {
        ...(extra?.flowType ? newFlowNode(extra.flowType, x, y, getLanguage()) : newNode(kind, x, y, undefined, getLanguage())),
        ...(kind === "agent"
          ? {
              workspaceId: aff.workspaceId,
              cwd: aff.cwd,
              branch: aff.branch,
              worktreePath: aff.worktreePath,
            }
          : kind === "git"
            ? {
                workspaceId: aff.workspaceId,
                cwd: aff.cwd,
                branch: aff.branch,
                worktreePath: aff.worktreePath,
              }
            : kind === "changes"
              ? {
                  workspaceId: aff.workspaceId,
                  cwd: aff.cwd,
                  changesSessionId: boundAgent?.sessionId,
                  expanded: true,
                }
              : kind === "terminal"
                ? {
                    workspaceId: aff.workspaceId,
                    cwd: aff.cwd,
                    terminalSessionId: boundAgent?.sessionId,
                    expanded: true,
                  }
                : kind === "file"
                  ? {
                      cwd: aff.cwd,
                      items: workspaceFilesList.slice(0, 12),
                      selectedItems: workspaceFilesList[0]
                        ? [workspaceFilesList[0]]
                        : [],
                      text: workspaceFilesList[0] ?? "README.md",
                      expanded: true,
                    }
                  : {}),
        ...(kind === "note" || kind === "display" ? { expanded: true } : {}),
        ...extra?.patch,
      };
      if (extra?.place) Object.assign(created, extra.place(created));
      edit((d) => {
        /* Place inside group if created inside an expanded group's bounds */
        const parentGroup = d.nodes
          .filter(
            (g) =>
              g.kind === "group" &&
              !g.collapsed &&
              created.x > g.x &&
              created.x < g.x + g.width &&
              created.y > g.y + 36 &&
              created.y < g.y + g.height,
          )
          .sort((a, b) => a.width * a.height - b.width * b.height)[0];
        if (parentGroup) created.parentId = parentGroup.id;
        d.nodes.push(created);
        extra?.link?.(d, created);
      });
      setSelectedStructureId(null);
      selectNode(created.id);
      showToast(t("nodeCreated"));
      return created;
    },
    [
      isNodeVisible,
      visibleGroups,
      selectedStructureId,
      selection.nodes,
      derivedStructure.cards,
      workspaces,
      activeWorkspaceId,
      workspaceFilesList,
      edit,
      selectNode,
      showToast,
    ],
  );

  const connectNodes = useCallback((
    fromIds: string[], toIds: string[], kind: FlowEdge["kind"], ends: WireEnds = {},
  ) => {
    edit(d => {
      for (const fromId of fromIds) {
        const source = d.nodes.find(n => n.id === fromId);
        if (!source) continue;
        const targets = d.nodes.filter(target => toIds.includes(target.id) && target.id !== source.id &&
          canConnect({ source, target, kind, ...ends, edges: d.edges }).ok);
        if (!targets.length) continue;
        let origin = source;
        if (kind === "reference" && source.kind === "agent") {
          const box = nodeBox(source);
          origin = {
            ...newNode("display", box.x + box.w + 32, box.y + box.h + 36, `${source.title} · ${t("newDisplay")}`),
            sourceNodeId: source.id, expanded: true, fixed: false,
            text: snapshot?.live.find(l => l.nodeId === fromId)?.output ||
              snapshot?.runs.flatMap(r => r.steps).filter(s => s.nodeId === fromId).at(-1)?.output || "",
          };
          d.nodes.push(origin);
        }
        const capture = kind === "reference" && ["git", "changes", "terminal"].includes(origin.kind) && origin.text.trim()
          ? { snapshotTitle: origin.title, snapshotText: origin.text } : {};
        for (const target of targets) addWire(d, origin, target, kind, { ...ends, ...capture });
      }
    });
  }, [edit, snapshot]);

  const createBoardCompanion = useCallback((boardId: string, cardId: string, kind: "agent" | "note") => {
    const doc = docRef.current;
    const board = doc.nodes.find((node) => node.id === boardId && node.kind === "board");
    const card = board && findBoardCard(board.columns ?? [], cardId)?.card;
    if (!board || !card) return;
    const box = nodeBox(board, lod, keepExpandedIds.has(board.id));
    const start = { x: box.x + box.w + 56, y: box.y };
    const byId = new Map(doc.nodes.map((node) => [node.id, node]));
    const ancestors = new Set<string>([board.id]);
    for (let parent = board.parentId ? byId.get(board.parentId) : undefined;
      parent; parent = parent.parentId ? byId.get(parent.parentId) : undefined) {
      ancestors.add(parent.id);
    }
    const obstacles = doc.nodes.filter((node) => !ancestors.has(node.id)).map((node) => canvasItemBox(doc, node));
    const title = deriveDraftTitle(card.text, t("boardTitle"));
    const draft = t("boardDraft", { title });
    const created = createCanvasNode(kind, start, undefined, false, {
      place: (item) => {
        const position = { ...start };
        const hit = () => obstacles.filter((obstacle) => intersects(padded(obstacle, 16), {
          ...position, w: item.width, h: item.height,
        }));
        for (let collisions = hit(); collisions.length; collisions = hit()) {
          position.x = Math.max(...collisions.map((obstacle) => obstacle.x + obstacle.w)) + 56;
        }
        return position;
      },
      patch: kind === "agent"
        ? { title, customTitle: true, draft, participation: "manual" }
        : { title, customTitle: true, text: resolveBoardReference(board, cardId).text },
      link: kind === "agent" ? (current, target) => {
        addWire(current, board, target, "reference", { sourceItemKey: cardId });
      } : undefined,
    });
    revealNode(created.id);
  }, [createCanvasNode, keepExpandedIds, lod, revealNode]);

  const deleteSelection = useCallback(() => {
    edit((d) => {
      if (selection.edge) {
        d.edges = d.edges.filter((e) => e.id !== selection.edge);
        return;
      }
      removeCanvasNodes(d, [...selection.nodes, ...selection.groups]);
    });
    setSelection({ nodes: [], groups: [], edge: null });
  }, [edit, selection]);

  const groupSelected = useCallback(() => {
    const chosenIds = new Set([...selection.groups, ...selection.nodes]);
    for (const owner of docRef.current.nodes.filter(node => node.fanout)) {
      const structure = docRef.current.nodes.filter(node => node.parentId === owner.id && (
        node.masterOf || node.generatedBy || node.id === owner.fanout!.fanId || node.id === owner.fanout!.mergeId));
      if (structure.some(node => chosenIds.has(node.id))) {
        chosenIds.add(owner.id);
        for (const member of structure) chosenIds.delete(member.id);
      }
    }
    const chosenNodes = docRef.current.nodes.filter(node => chosenIds.has(node.id) && node.kind !== "group").map(node => node.id);
    const chosenGroups = docRef.current.nodes.filter(node => chosenIds.has(node.id) && node.kind === "group").map(node => node.id);
    if (chosenNodes.length + chosenGroups.length < 2) {
      showToast(t("groupNeedSelection"));
      return;
    }
    if (
      chosenGroups.some((gid) => {
        const g = docRef.current.nodes.find((n) => n.id === gid);
        return (
          g?.parentId ||
          docRef.current.nodes.some(
            (c) => c.parentId === gid && c.kind === "group",
          )
        );
      })
    ) {
      showToast(t("nestedLimit"), true);
      return;
    }
    const allMemberIds = [
      ...chosenNodes,
      ...chosenGroups.flatMap((gid) => members(docRef.current, gid)),
    ];
    const boxes = allMemberIds
      .map((id) => docRef.current.nodes.find((n) => n.id === id))
      .filter((n): n is FlowNode => !!n)
      .map((n) => nodeBox(n));
    if (!boxes.length) return;
    const b = bounds(boxes);
    const grp: FlowNode = {
      ...newNode("group", b.x - 24, b.y - 54, t("workflows")),
      width: b.w + 48,
      height: b.h + 82,
      color: "blue",
    };
    edit((d) => {
      d.nodes.push(grp);
      for (const id of [...chosenNodes, ...chosenGroups]) {
        const item = d.nodes.find((n) => n.id === id);
        if (item) item.parentId = grp.id;
      }
    });
    setSelection({ nodes: [], groups: [grp.id], edge: null });
    showToast(t("groupCreated"));
  }, [selection, edit, showToast]);

  const ungroup = useCallback(
    (groupId: string) => {
      if (docRef.current.nodes.find(node => node.id === groupId)?.fanout) return;
      edit((d) => {
        const grp = d.nodes.find((n) => n.id === groupId);
        if (!grp) return;
        for (const child of d.nodes) {
          if (child.parentId === groupId) {
            if (grp.parentId) child.parentId = grp.parentId;
            else delete child.parentId;
          }
        }
        d.nodes = d.nodes.filter((n) => n.id !== groupId);
      });
      setSelection({ nodes: [], groups: [], edge: null });
    },
    [edit],
  );

  const arrangeTopology = useCallback((targetIds = [...selection.nodes, ...selection.groups]) => {
    const previous = docRef.current;
    const next = structuredClone(previous);
    if (!arrangeCanvas(next, targetIds)) return;
    setHistory((items) => [...items.slice(-39), previous]);
    setFuture([]);
    commitEdit(shareSnapshotValue(previous, next));
  }, [commitEdit, selection.nodes, selection.groups]);
  const tidyLabel = selection.nodes.length || selection.groups.length ? "tidySelection" : "tidy";

  /* ComfyUI subgraph clipboard, participation & layout ops (pure document edits, undoable) */
  const selectionIds = useCallback(
    () => [...selection.nodes, ...selection.groups],
    [selection.nodes, selection.groups],
  );

  const selectPasteResult = useCallback(
    (res: { createdNodeIds: string[]; createdGroupIds: string[] }) => {
      setSelection({
        nodes: res.createdNodeIds.filter(
          (id) => !res.createdGroupIds.includes(id),
        ),
        groups: res.createdGroupIds,
        edge: null,
      });
    },
    [],
  );

  const copySelection = useCallback((): boolean => {
    const clip = serializeSubgraphClipboard(docRef.current, selectionIds());
    if (!clip) return false;
    clipboardRef.current = clip;
    showToast(t("copySelection"));
    return true;
  }, [selectionIds, showToast]);

  const cursorWorldPoint = useCallback((): { x: number; y: number } | undefined => {
    const vp = viewportRef.current;
    const ptr = pointerRef.current;
    if (!vp || !ptr) return undefined;
    const rect = vp.getBoundingClientRect();
    if (
      ptr.x < rect.left ||
      ptr.x > rect.right ||
      ptr.y < rect.top ||
      ptr.y > rect.bottom
    ) {
      return undefined;
    }
    return toWorld(docRef.current.viewport, rect, ptr.x, ptr.y);
  }, []);

  const pasteClipboard = useCallback((): boolean => {
    const clip = clipboardRef.current;
    if (!clip?.nodes.length) return false;
    const anchor = cursorWorldPoint();
    let res: ReturnType<typeof pasteSubgraphClipboard> | null = null;
    edit((d) => {
      res = pasteSubgraphClipboard(d, clip, anchor);
    });
    if (res) selectPasteResult(res);
    if (!anchor) {
      /* Repeated keyboard-only pastes cascade instead of stacking on one spot */
      clipboardRef.current = {
        ...clip,
        anchor: { x: clip.anchor.x - 36, y: clip.anchor.y - 36 },
      };
    }
    showToast(t("pasteSelection"));
    return true;
  }, [cursorWorldPoint, edit, selectPasteResult, showToast]);

  const duplicateSelection = useCallback((): boolean => {
    const ids = selectionIds();
    if (!ids.length) return false;
    let res: ReturnType<typeof duplicateSubgraph> | null = null;
    edit((d) => {
      res = duplicateSubgraph(d, ids);
    });
    if (res) selectPasteResult(res);
    return true;
  }, [selectionIds, edit, selectPasteResult]);

  const selectAllVisible = useCallback(() => {
    const cur = docRef.current;
    setSelection({
      nodes: cur.nodes.filter((n) => isNodeVisible(n)).map((n) => n.id),
      groups: [],
      edge: null,
    });
  }, [isNodeVisible]);

  /** Agents targeted by participation toggles: selected agents plus agents inside selected groups. */
  const participationTargets = useCallback(
    (explicit?: string[]) => {
      const ids = explicit ?? [
        ...selection.nodes,
        ...selection.groups.flatMap((gid) => members(docRef.current, gid)),
      ];
      return ids.filter((id) =>
        docRef.current.nodes.some((n) => n.id === id && n.kind === "agent"),
      );
    },
    [selection.nodes, selection.groups],
  );

  const toggleParticipation = useCallback(
    (mode: "paused" | "bypassed", explicit?: string[]): boolean => {
      const ids = participationTargets(explicit);
      if (!ids.length) return false;
      let next: string = "global";
      edit((d) => {
        next = toggleNodesParticipation(d.nodes, ids, mode);
      });
      showToast(
        next === "global"
          ? t("global")
          : t(mode === "bypassed" ? "bypassParticipation" : "pausedParticipation"),
      );
      return true;
    },
    [participationTargets, edit, showToast],
  );

  const setBatchParticipation = useCallback(
    (participation: FlowNode["participation"]) => {
      const ids = participationTargets();
      if (!ids.length) return;
      edit((d) => {
        for (const n of d.nodes) {
          if (ids.includes(n.id)) n.participation = participation;
        }
      });
    },
    [participationTargets, edit],
  );

  const alignSelection = useCallback(
    (mode: AlignMode) => {
      const ids = selectionIds();
      if (ids.length < 2) return;
      edit((d) => {
        d.nodes = alignNodes(d.nodes, ids, mode);
      });
    },
    [selectionIds, edit],
  );

  const distributeSelection = useCallback(
    (axis: DistributeAxis) => {
      const ids = selectionIds();
      if (ids.length < 3) return;
      edit((d) => {
        d.nodes = distributeNodes(d.nodes, ids, axis);
      });
    },
    [selectionIds, edit],
  );

  /* Undo / Redo — preserves live DSH sessionId & lastSubmittedTask, never replays prompts */
  const performUndo = useCallback(
    (isRedo = false) => {
      const stack = isRedo ? future : history;
      const target = stack.at(-1);
      if (!target) return;
      const current = docRef.current;
      if (isRedo) {
        setFuture((f) => f.slice(0, -1));
        setHistory((h) => [...h, current]);
      } else {
        setHistory((h) => h.slice(0, -1));
        setFuture((f) => [...f, current]);
      }
      edit(
        (d) => {
          const liveNodes = d.nodes;
          const restored = rebaseContainerChanges(structuredClone(target), snapshot?.containerChanges ?? [], true);
          restored.generationRevision = d.generationRevision;
          if (restored.prefs?.wireRouting !== d.prefs?.wireRouting) {
            restored.prefs = { ...restored.prefs, wireRouting: d.prefs?.wireRouting };
          }
          Object.assign(d, restored);
          d.nodes = restored.nodes.map((n) => {
            const existing = liveNodes.find((x) => x.id === n.id);
            return existing?.sessionId
              ? {
                  ...n,
                  sessionId: existing.sessionId,
                  cwd: existing.cwd,
                  workspaceId: existing.workspaceId,
                  lastSubmittedTask: existing.lastSubmittedTask,
                }
              : n;
          });
        },
        { remember: false },
      );
    },
    [future, history, edit, snapshot?.containerChanges],
  );

  /* Execution & Session Binding (with safe worktree creation for unchecked-out branches, M05) */
  const launchScope = useCallback(
    (req: StartRequest) => {
      if (replayLocked.current) return;
      void (async () => {
        await flush();
        if (req.kind === "single" && req.nodeIds.length === 1) {
          const target = docRef.current.nodes.find(
            (n) => n.id === req.nodeIds[0],
          );
          if (
            target &&
            target.kind === "agent" &&
            !target.sessionId &&
            target.branch &&
            !target.worktreePath
          ) {
            const proj = projectStructures.find(
              (p) => p.id === (target.workspaceId || activeWorkspaceId),
            );
            const brInfo = proj?.branches.find((b) => b.name === target.branch);
            if (proj?.isGitRepo && brInfo && !brInfo.worktreePath && !brInfo.current) {
              setFormModal({
                title: t("createWorktree"),
                description: t("createWorktreePrompt"),
                initialValue: target.branch,
                onSubmit: (branchName) => {
                  void (async () => {
                    const updatedRepo = await bridge.gitAction({
                      cwd: proj.path,
                      action: "createWorktree",
                      branch: branchName,
                    });
                    const wt = updatedRepo.worktrees.find(
                      (w) => w.branch === branchName,
                    );
                    if (wt) {
                      editNode(target.id, {
                        branch: branchName,
                        worktreePath: wt.path,
                        cwd: wt.path,
                      });
                    }
                    refreshProjectStructures();
                    await flush();
                    await bridge.start(req);
                    setBottomOpen(true);
                  })().catch(reportError);
                },
              });
              return;
            }
          }
        }
        if (req.kind === "global") {
          const plan = await bridge.plan(req);
          setLaunchDialog({ plan, excluded: new Set() });
        } else {
          await bridge.start(req);
          setBottomOpen(true);
        }
      })().catch(reportError);
    },
    [
      flush,
      projectStructures,
      activeWorkspaceId,
      bridge,
      editNode,
      refreshProjectStructures,
      reportError,
    ],
  );

  const bindAgentSession = useCallback(
    (node: FlowNode) => {
      void (async () => {
        await flush();
        const bound = await bridge.bind({
          nodeId: node.id,
          workspaceId: node.workspaceId || activeWorkspaceId || undefined,
          cwd: node.cwd || activeWorkspaceCwd,
        });
        editNode(bound.id, {
          sessionId: bound.sessionId,
          cwd: bound.cwd,
          expanded: true,
          tab: "conversation",
        });
      })().catch(reportError);
    },
    [flush, bridge, activeWorkspaceId, activeWorkspaceCwd, editNode, reportError],
  );

  const extractDisplayFrom = useCallback(
    (sourceNodeId: string, text?: string, seq?: number, fixed = true) => {
      void (async () => {
        await flush();
        const created = await bridge.display({
          nodeId: sourceNodeId,
          text,
          seq,
          fixed,
        });
        setSelection({ nodes: [created.id], groups: [], edge: null });
        showToast(t("nodeCreated"));
      })().catch(reportError);
    },
    [flush, bridge, showToast, reportError],
  );

  const pinDeliverable = useCallback(
    (path: string, nodeId: string) => {
      const src = docRef.current.nodes.find((n) => n.id === nodeId);
      let targetId = "";
      edit((d) => {
        const existing = d.nodes.find(
          (n) =>
            n.kind === "file" &&
            (n.text === path || n.selectedItems?.includes(path)),
        );
        if (existing) {
          targetId = existing.id;
          return;
        }
        const fn = {
          ...newNode(
            "file",
            (src?.x ?? 120) + 340,
            (src?.y ?? 120) + 60,
            path.split(/[\\/]/).pop() ?? path,
          ),
          cwd: src?.worktreePath || src?.cwd || activeWorkspaceCwd,
          text: path,
          items: [path],
          selectedItems: [path],
          expanded: true,
        };
        targetId = fn.id;
        d.nodes.push(fn);
      });
      setRouteName("canvas");
      if (targetId) setTimeout(() => revealNode(targetId), 50);
    },
    [edit, activeWorkspaceCwd, revealNode],
  );

  /* Partial-DAG launch, stop & fork — all executed by the Host scheduler */
  const runSelection = useCallback(() => {
    const scopeIds = [
      ...selection.nodes,
      ...selection.groups.flatMap((gid) => members(docRef.current, gid)),
    ];
    launchScope(
      scopeIds.length
        ? { kind: "selection", nodeIds: scopeIds }
        : { kind: "global", nodeIds: [] },
    );
  }, [selection.nodes, selection.groups, launchScope]);
  const extendLoop = useCallback(
    (runId: string, edgeId: string, nodeId?: string) => {
      void bridge
        .extendLoop({ runId, edgeId, nodeId, extraRounds: 1 })
        .catch(reportError);
    },
    [bridge, reportError],
  );
  const runFromHere = useCallback(
    (nodeId: string) => launchScope({ kind: "from-node", nodeIds: [nodeId] }),
    [launchScope],
  );
  const runToHere = useCallback(
    (nodeId: string) => launchScope({ kind: "to-node", nodeIds: [nodeId] }),
    [launchScope],
  );
  const stopNode = useCallback(
    (nodeId: string) => {
      void bridge.stopNode(nodeId).catch(reportError);
    },
    [bridge, reportError],
  );

  /**
   * Fork Hypothesis: a new draft Agent beside the source, wired by a `fork` continuation.
   * The Host forks the source Session at its last completed turn when the draft is run,
   * so the branch inherits history without touching the source conversation.
   */
  const forkHypothesis = useCallback(
    (sourceId: string) => {
      const source = docRef.current.nodes.find((n) => n.id === sourceId);
      if (!source || source.kind !== "agent") return;
      if (!source.sessionId) {
        showToast(t("forkHypothesisTip"), true);
        return;
      }
      const sb = nodeBox(source, false, true);
      const siblings = docRef.current.edges.filter(
        (e) => e.source === sourceId && e.mode === "fork",
      ).length;
      const forked: FlowNode = {
        ...newNode(
          "agent",
          Math.round((sb.x + sb.w + 72) / 12) * 12,
          Math.round((sb.y + siblings * 48) / 12) * 12,
          `${source.title} ⎇ ${siblings + 1}`,
        ),
        workspaceId: source.workspaceId,
        cwd: source.cwd,
        branch: source.branch,
        worktreePath: source.worktreePath,
        roleLabel: source.roleLabel,
        parentId: source.parentId,
        expanded: true,
      };
      edit((d) => {
        d.nodes.push(forked);
        addWire(d, source, forked, "continuation", { mode: "fork", trigger: "off" });
      });
      pendingFocusRef.current = forked.id;
      selectNode(forked.id);
      showToast(t("forkHypothesis"));
    },
    [edit, selectNode, showToast],
  );

  /* Templates & Snapshots */
  const handleInstantiateTemplate = useCallback(
    (
      tpl: WorkflowTemplate,
      opts?: {
        /** World top-left for the new group (quick-create at cursor / wire drop). */
        at?: { x: number; y: number };
        /** Extra edits (e.g. wiring the dragged source in) inside the same undo step. */
        link?: (d: FlowspaceDocument, group: FlowNode) => void;
      },
    ) => {
      const occupied = [
        ...docRef.current.nodes
          .filter((n) => n.kind !== "group")
          .map((n) => nodeBox(n)),
        ...docRef.current.nodes
          .filter((n) => n.kind === "group")
          .map((g) => groupBox(g)),
      ];
      const x = opts?.at
        ? Math.round(opts.at.x / 12) * 12
        : occupied.length
          ? bounds(occupied).x + bounds(occupied).w + 120
          : 40;
      const y = opts?.at ? Math.round(opts.at.y / 12) * 12 : 140;
      let createdGroupId = "";
      edit((d) => {
        const grp = instantiateTemplate(
          d,
          tpl,
          x,
          y,
          tpl.builtin ? t(tpl.title) : tpl.title,
          {
            workspaceId: activeWorkspaceId || undefined,
            cwd: activeWorkspaceCwd,
          },
        );
        createdGroupId = grp.id;
        opts?.link?.(d, grp);
      });
      focusCreatedGroup(createdGroupId);
      const [changed] = teamRevisionDifferences(tpl, snapshot?.teamBlueprints);
      showToast(changed ? t("teamRevisionDifference", changed) : t("templateAdded"));
    },
    [activeWorkspaceId, activeWorkspaceCwd, edit, focusCreatedGroup, showToast, snapshot?.teamBlueprints],
  );

  const insertFanout = useCallback((point?: { x: number; y: number }, wire?: WireDropContext | null, edgeId?: string) => {
    const current = docRef.current;
    const edge = edgeId && current.edges.find(candidate => candidate.id === edgeId);
    if (edgeId && (!edge || !canInsertFanout(current, edge))) return;
    const from = edge ? current.nodes.find(node => node.id === edge.source) : wire?.sourceNode;
    const to = edge ? current.nodes.find(node => node.id === edge.target) : wire?.targetNode;
    const at = point ?? (from ? { x: from.x + nodeBox(from).w + 48, y: from.y } :
      to ? { x: to.x - 1176, y: to.y } : { x: 48, y: 80 });
    const parent = current.nodes.find(node => node.kind === "group" && !node.fanout && !node.parentId && !node.collapsed &&
      at.x > node.x && at.y > node.y + 48 && at.x < node.x + node.width && at.y < node.y + node.height);
    const position = clearBoxAlong({ x: at.x - (wire?.direction === "in" ? 1128 : 24), y: at.y - 56, w: 1128, h: 472 },
      current.nodes.filter(node => node.parentId === parent?.id).map(node => canvasItemBox(current, node)), "y", 1, 24);
    let groupId = "";
    edit(d => {
      const pair = createFanoutPair(d, Math.round(position.x / 12) * 12, Math.round(position.y / 12) * 12, {
        locale: getLanguage(), parentId: parent?.id, edgeId,
        workspaceId: from?.workspaceId ?? to?.workspaceId ?? (activeWorkspaceId || undefined),
        cwd: from?.cwd ?? to?.cwd ?? activeWorkspaceCwd,
      });
      groupId = pair.group.id;
      if (wire) {
        const destination = wire.direction === "out" ? pair.fan : pair.merge;
        linkWireDrop(d, wire, destination, wire.direction === "out"
          ? { targetPort: "in", ...(wire.portKind === "reference" ? { always: true } : {}) }
          : { sourcePort: "out" });
      }
    });
    focusCreatedGroup(groupId);
  }, [activeWorkspaceCwd, activeWorkspaceId, edit, focusCreatedGroup]);

  const handleSaveTemplateDialog = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp) return;
      setFormModal({
        title: t("saveTemplate"),
        initialValue: grp.title,
        secondaryLabel: t("description"),
        secondaryInitial: "",
        onSubmit: (name, desc) => {
          edit((d) => {
            const captured = captureTemplate(d, groupId, name, desc ?? "", snapshot?.teamBlueprints);
            d.templates = [...(d.templates ?? []), captured];
            const target = d.nodes.find((n) => n.id === groupId);
            if (target) {
              target.templateId = captured.id;
              target.templateRevision = captured.revision;
            }
          });
          showToast(t("templateSaved"));
        },
      });
    },
    [edit, showToast, snapshot?.teamBlueprints],
  );

  const handleSaveNewTemplateVersion = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp?.templateId) return;
      edit((d) => {
        const all = allTemplates(d);
        const src = all.find((tpl) => tpl.id === grp.templateId);
        if (!src) return;
        const captured = captureTemplate(
          d,
          groupId,
          src.builtin ? t(src.title) : src.title,
          src.builtin ? t(src.description) : src.description,
          snapshot?.teamBlueprints,
        );
        if (!src.builtin) {
          captured.id = src.id;
          captured.revision = src.revision + 1;
          d.templates = [
            ...(d.templates ?? []).filter((x) => x.id !== src.id),
            captured,
          ];
        } else {
          d.templates = [...(d.templates ?? []), captured];
        }
        const target = d.nodes.find((n) => n.id === groupId);
        if (target) {
          target.templateId = captured.id;
          target.templateRevision = captured.revision;
        }
      });
      showToast(t("templateSaved"));
    },
    [edit, showToast, snapshot?.teamBlueprints],
  );

  const handleOpenSyncTemplate = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp?.templateId) return;
      const tpl = allTemplates(docRef.current).find(
        (x) => x.id === grp.templateId,
      );
      if (!tpl) return;
      setSyncModal({
        groupId,
        plan: computeSyncPlan(docRef.current, grp, tpl),
      });
    },
    [],
  );

  const handleCaptureSnapshot = useCallback(() => {
    setFormModal({
      title: t("saveSnapshot"),
      description: t("snapshotDescription"),
      initialValue: `${docRef.current.title} · ${formatTime(Date.now())}`,
      onSubmit: (title) => {
        const snap = buildSnapshot(docRef.current, snapshot, title);
        edit((d) => {
          d.snapshots = [snap, ...(d.snapshots ?? []).slice(0, 19)];
        });
        showToast(t("snapshotSaved"));
      },
    });
  }, [snapshot, edit, showToast]);

  const handleRestoreSnapshot = useCallback(
    (snap: CanvasSnapshot) => {
      edit((d) => {
        const liveNodes = d.nodes;
        d.nodes = structuredClone(snap.nodes).map((n) => {
          const cur = liveNodes.find((x) => x.id === n.id);
          return cur?.sessionId
            ? {
                ...n,
                sessionId: cur.sessionId,
                cwd: cur.cwd,
                workspaceId: cur.workspaceId,
                lastSubmittedTask: cur.lastSubmittedTask,
              }
            : n;
        });
        d.edges = structuredClone(snap.edges);
        d.viewport = structuredClone(snap.viewport);
      });
      setRouteName("canvas");
      showToast(t("snapshotRestored"));
    },
    [edit, showToast],
  );

  /* Theme & Preferences */
  const updatePrefs = useCallback((changes: Partial<CanvasPrefs>) => {
    const current = docRef.current;
    commitEdit({ ...current, prefs: { ...current.prefs, ...changes } });
  }, [commitEdit]);

  const [themeOverride, setThemeOverride] = useState<"dark" | "light">();
  const themeTransitionRef = useRef<ReturnType<typeof startThemeTransition> | null>(null);
  const displayedTheme = themeOverride ?? effectiveTheme;
  const showTheme = useCallback((theme: "dark" | "light" | undefined) => {
    flushSync(() => setThemeOverride(theme));
  }, []);

  useLayoutEffect(() => () => themeTransitionRef.current?.stop(), []);
  useEffect(() => {
    if (reducedMotion && themeTransitionRef.current) {
      themeTransitionRef.current.stop();
      setThemeOverride(undefined);
    }
  }, [reducedMotion]);

  const toggleTheme = useCallback(
    (button: HTMLElement) => {
      const preference = docRef.current.prefs?.theme ?? "auto";
      const currentTheme = preference === "auto" ? (hostDark ? "dark" : "light") : preference;
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      const root = rootRef.current;
      if (root && !reducedMotion && typeof document.startViewTransition === "function") {
        const running = themeTransitionRef.current;
        if (running) {
          running.add(nextTheme);
        } else {
          setThemeOverride(currentTheme);
          themeTransitionRef.current = startThemeTransition(
            root,
            button,
            currentTheme,
            nextTheme,
            showTheme,
            () => { themeTransitionRef.current = null; },
          );
        }
      }
      updatePrefs({ theme: nextTheme });
    },
    [hostDark, reducedMotion, showTheme, updatePrefs],
  );

  /* Menus */
  const openAnchoredMenu = useCallback(
    (anchor: HTMLElement | { x: number; y: number }, items: MenuItem[], focusFirst = false) => {
      const pos =
        anchor instanceof HTMLElement
          ? {
              x: anchor.getBoundingClientRect().left,
              y: anchor.getBoundingClientRect().bottom + 6,
            }
          : anchor;
      setMenu({
        x: clamp(pos.x, 8, window.innerWidth - 250),
        y: clamp(pos.y, 8, window.innerHeight - Math.min(420, items.length * 36 + 24)),
        items,
        returnFocus: focusFirst && anchor instanceof HTMLElement ? anchor : undefined,
      });
    },
    [],
  );

  const openBoardMenu = useCallback((anchor: HTMLElement, items: MenuItem[]) => {
    openAnchoredMenu(anchor, items, true);
  }, [openAnchoredMenu]);

  const openBoardAgentMenu = useCallback((boardId: string, cardId: string, anchor: HTMLElement) => {
    const agents = docRef.current.nodes.filter((node) => node.kind === "agent");
    openBoardMenu(anchor, [
      { heading: t("boardLinkAgent") },
      ...agents.map((agent) => ({
        label: agent.title, icon: "agent",
        fn: () => {
          connectNodes([boardId], [agent.id], "reference", { sourceItemKey: cardId });
          showToast(t("boardAgentLinked", { name: agent.title }));
        },
      })),
      ...(agents.length ? [] : [{ label: t("boardNoAgents"), disabled: true }]),
      { divider: true },
      { label: t("boardDispatch"), icon: "sendTask", fn: () => createBoardCompanion(boardId, cardId, "agent") },
    ]);
  }, [openBoardMenu, connectNodes, createBoardCompanion, showToast]);

  const openAddMenu = useCallback(
    (
      anchor: HTMLElement | { x: number; y: number },
      worldPt?: { x: number; y: number },
    ) => {
      openAnchoredMenu(anchor, [
        { heading: t("create") },
        { label: t("flow_fanout_group"), icon: "fanout", fn: () => insertFanout(worldPt) },
        {
          label: t("newAgent"),
          icon: "agent",
          fn: () => createCanvasNode("agent", worldPt),
        },
        {
          label: t("newTeam"),
          icon: "team",
          fn: () => setTeamPicker({ at: worldPt }),
        },
        {
          label: t("existingSession"),
          icon: "chat",
          fn: () =>
            void bridge.sessions().then(setSessionModal).catch(reportError),
        },
        {
          label: t("newGit"),
          icon: "git",
          fn: () => createCanvasNode("git", worldPt),
        },
        {
          label: t("newChanges"),
          icon: "diff",
          fn: () => createCanvasNode("changes", worldPt),
        },
        {
          label: t("newFile"),
          icon: "file",
          fn: () => createCanvasNode("file", worldPt),
        },
        {
          label: t("newTerminal"),
          icon: "term",
          fn: () => createCanvasNode("terminal", worldPt),
        },
        {
          label: t("newNote"),
          icon: "note",
          fn: () => createCanvasNode("note", worldPt),
        },
        {
          label: t("newBoard"),
          icon: "board",
          fn: () => createCanvasNode("board", worldPt),
        },
        { divider: true },
        { heading: t("workflows") },
        ...allTemplates(docRef.current)
          .slice(0, 3)
          .map((tpl) => ({
            label: tpl.builtin ? t(tpl.title) : tpl.title,
            icon: "canvas",
            fn: () => handleInstantiateTemplate(tpl),
          })),
      ]);
    },
    [
      openAnchoredMenu,
      createCanvasNode,
      bridge,
      reportError,
      handleInstantiateTemplate,
      insertFanout,
    ],
  );

  /* ComfyUI-style fuzzy quick-create (Tab / Shift+A at cursor, or wire dropped on empty canvas) */
  const openQuickCreate = useCallback(
    (clientPt: { x: number; y: number }, wire: WireDropContext | null = null) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const world =
        wire?.worldPoint ??
        toWorld(docRef.current.viewport, vp.getBoundingClientRect(), clientPt.x, clientPt.y);
      setMenu(null);
      setPayloadPeek(null);
      setQuickCreate({ anchor: clientPt, world, wire });
    },
    [],
  );

  const handleQuickCreateSelect = useCallback(
    (sel: QuickCreateSelection) => {
      const qc = quickCreate;
      setQuickCreate(null);
      if (!qc) return;
      const { world, wire } = qc;
      if (sel.action === "create-fanout") {
        insertFanout(world, wire);
        return;
      }
      /* The node the wire was dragged from (out port) or into (in port) */
      const anchorNode = wire
        ? docRef.current.nodes.find(
            (n) =>
              n.id ===
              (wire.direction === "out" ? wire.sourceNode?.id : wire.targetNode?.id),
          )
        : undefined;
      const portKind = wire?.portKind;
      const anchorBox = anchorNode
        ? nodeBox(anchorNode, lod, keepExpandedIds.has(anchorNode.id))
        : undefined;
      const placeAligned =
        anchorNode && anchorBox && portKind
          ? (n: FlowNode) =>
              alignedWireDropPosition(anchorBox, portKind, world, n.kind, {
                direction: wire!.direction,
                sourceKind: anchorNode.kind,
                sourcePortOffset: portY(anchorNode, portKind, !!anchorBox.compact, wire?.portId, branchScroll.get(anchorNode.id), anchorBox.h, wire?.direction),
                targetCompact: isCompactNode(n, false, true),
              })
          : undefined;

      if (sel.action === "existing-session") {
        void bridge.sessions().then(sessions => {
          sessionWireDrop.current = qc;
          setSessionModal(sessions);
        }).catch(reportError);
        return;
      }
      if (sel.action === "create-team") {
        setTeamPicker({ at: world });
        return;
      }

      if (sel.action === "instantiate-template") {
        const kind = sel.edgePatch?.kind ?? portKind;
        handleInstantiateTemplate(sel.template, {
          at: world,
          link:
            anchorNode && kind && wire?.direction === "out"
              ? (d, grp) => {
                  const entry =
                    inferGroupPorts(d, grp).find(
                      (p) => p.direction === "in" && p.kind === kind && !p.hidden,
                    );
                  for (const targetId of entry?.nodes ?? []) {
                    const target = d.nodes.find((n) => n.id === targetId);
                    if (target) linkWireDrop(d, wire, target, { ...sel.edgePatch, kind, targetPort: entry?.portId });
                  }
                }
              : undefined,
        });
        return;
      }

      if (sel.action === "create-display") {
        const source = wire?.direction === "out" ? anchorNode : undefined;
        const latestText = source
          ? source.kind === "agent"
            ? snapshot?.live.find((l) => l.nodeId === source.id)?.output ||
              snapshot?.runs
                .flatMap((r) => r.steps)
                .filter((s) => s.nodeId === source.id)
                .at(-1)?.output ||
              ""
            : source.text
          : "";
        createCanvasNode("display", world, undefined, false, {
          place: placeAligned,
          patch: source
            ? {
                title: `${source.title} · ${t("newDisplay")}`,
                sourceNodeId: source.id,
                text: latestText,
                fixed: sel.fixed || source.kind !== "agent",
              }
            : { fixed: sel.fixed },
        });
        return;
      }

      const edgeKind = sel.edgePatch?.kind ?? portKind;
      const created = createCanvasNode(sel.nodeKind, world, undefined, false, {
        place: placeAligned,
        flowType: sel.flowType,
        patch: sel.nodePatch,
        link:
          anchorNode && edgeKind && wire
            ? (d, c) => linkWireDrop(d, wire, c, sel.edgePatch)
            : undefined,
      });
      if (created.kind === "agent" || created.kind === "note") {
        pendingFocusRef.current = created.id;
      }
    },
    [
      quickCreate, branchScroll,
      insertFanout,
      lod,
      keepExpandedIds,
      bridge,
      reportError,
      handleInstantiateTemplate,
      snapshot,
      createCanvasNode,
    ],
  );

  const openNodeContextMenu = useCallback(
    (node: FlowNode, anchor: HTMLElement | { x: number; y: number }) => {
      selectNode(node.id);
      const items: MenuItem[] = [
        {
          label: t("rename"),
          icon: "note",
          fn: () =>
            setFormModal({
              title: t("rename"),
              initialValue: node.title,
              onSubmit: (title) => editNode(node.id, { title }),
            }),
        },
      ];
      if (node.generatedBy && node.itemKey && node.overridden && !node.removed &&
          docRef.current.nodes.find(n => n.id === node.generatedBy)?.config?.followMaster !== false) {
        items.push({ label: t("flow_resume_master_sync"), icon: "undo", fn: () => edit(d => {
          const used = new Set(snapshot?.runs.flatMap(run => run.steps.map(step => step.nodeId)) ?? []);
          resumeMasterSync(d, node.generatedBy!, node.itemKey!, used);
        }) });
      }
      if (node.kind === "role" && node.staffOf) items.push({
        label: t("teamRoleDisconnect"),
        icon: "unplug",
        fn: () => editNode(node.id, { staffOf: undefined }),
      });
      if (node.kind === "agent") {
        if (isTeamNode(node, staffedIds(docRef.current.nodes))) items.push({
          label: t("teamEnter"),
          icon: "team",
          fn: () => openTeam(node.id),
        });
        items.push(
          {
            label: t("runSingle"),
            icon: "play",
            disabled: !(node.draft.trim() || node.task.trim()),
            fn: () => launchScope({ kind: "single", nodeIds: [node.id] }),
          },
          {
            label: t("runFromHere"),
            icon: "runFrom",
            fn: () => runFromHere(node.id),
          },
          {
            label: t("runToHere"),
            icon: "runTo",
            fn: () => runToHere(node.id),
          },
          {
            label: `⎇ ${t("forkHypothesis")}`,
            description: t("forkHypothesisTip"),
            icon: "fork",
            disabled: !node.sessionId,
            fn: () => forkHypothesis(node.id),
          },
        );
        if (["running", "settling"].includes(nodeStatusOf(snapshot, node.id))) {
          items.push({
            label: t("stopAgent"),
            icon: "stop",
            danger: true,
            fn: () => stopNode(node.id),
          });
        }
        items.push(
          { divider: true },
          {
            label: t("toggleBypass"),
            icon: "bypass",
            checked: node.participation === "bypassed",
            shortcut: "Ctrl B",
            fn: () => toggleParticipation("bypassed", [node.id]),
          },
          {
            label: t("toggleMute"),
            icon: "mute",
            checked: node.participation === "paused",
            shortcut: "Ctrl M",
            fn: () => toggleParticipation("paused", [node.id]),
          },
          {
            label: t("executionDetail"),
            icon: "card",
            fn: () => openDetailCard(node.id),
          },
        );
        if (node.sessionId) {
          items.push({
            label: t("openNativeChat"),
            icon: "chat",
            fn: () => bridge.openChat(node.sessionId!),
          });
        }
      }
      items.push(
        {
          label: t("duplicateSelection"),
          icon: "duplicate",
          shortcut: "Ctrl D",
          fn: () => {
            let res: ReturnType<typeof duplicateSubgraph> | null = null;
            edit((d) => {
              res = duplicateSubgraph(d, [node.id]);
            });
            if (res) selectPasteResult(res);
          },
        },
        {
          label: t("copySelection"),
          icon: "copy",
          shortcut: "Ctrl C",
          fn: () => {
            const clip = serializeSubgraphClipboard(docRef.current, [node.id]);
            if (clip) {
              clipboardRef.current = clip;
              showToast(t("copySelection"));
            }
          },
        },
      );
      items.push(
        { divider: true },
        {
          label: t(node.expanded ? "collapse" : "expand"),
          icon: "card",
          fn: () => toggleNodeForm(node.id),
        },
        {
          label: t(node.window ? "returnCanvas" : "openWindow"),
          icon: "pop",
          fn: () =>
            node.window ? returnWindow(node.id) : openWindow(node.id),
        },
        {
          label: t(node.pinned ? "unpin" : "pin"),
          icon: "pin",
          checked: !!node.pinned,
          fn: () => editNode(node.id, { pinned: !node.pinned }),
        },
        {
          label: t("inspect"),
          icon: "side",
          fn: () => setInspectorOpen(true),
        },
      );
      if (node.window) {
        items.push(
          { divider: true },
          ...(
            [
              ["left", "snapLeft"],
              ["right", "snapRight"],
              ["max", "maximize"],
            ] as const
          ).map(([snap, labelKey]) => ({
            label: t(labelKey),
            icon: "card",
            fn: () =>
              editNode(node.id, {
                window: { ...node.window!, snap },
              }),
          })),
        );
      }
      items.push(
        { divider: true },
        {
          label: t("deleteNode"),
          icon: "trash",
          danger: true,
          fn: () => {
            edit((d) => {
              removeCanvasNodes(d, [node.id]);
            });
            setSelection({ nodes: [], groups: [], edge: null });
          },
        },
      );
      openAnchoredMenu(anchor, items);
    },
    [
      selectNode,
      editNode,
      launchScope,
      openDetailCard,
      bridge,
      toggleNodeForm,
      returnWindow,
      openWindow,
      edit,
      openAnchoredMenu,
      runFromHere,
      runToHere,
      openTeam,
      forkHypothesis,
      stopNode,
      snapshot,
      toggleParticipation,
      selectPasteResult,
      showToast,
    ],
  );

  const openGroupContextMenu = useCallback(
    (group: FlowNode, anchor: HTMLElement | { x: number; y: number }) => {
      setSelection({ nodes: [], groups: [group.id], edge: null });
      const items: MenuItem[] = [
        {
          label: t("rename"),
          icon: "note",
          fn: () =>
            setFormModal({
              title: t("rename"),
              initialValue: group.title,
              onSubmit: (title) =>
                editNode(group.id, { title, titleKey: undefined }),
            }),
        },
        {
          label: t("runGroup"),
          icon: "play",
          fn: () => launchScope({ kind: "group", nodeIds: [group.id] }),
        },
        {
          label: t(group.collapsed ? "expand" : "collapse"),
          icon: "card",
          fn: () => editNode(group.id, { collapsed: !group.collapsed }),
        },
        {
          label: t("tidyGroup"),
          icon: "tidy",
          fn: () => arrangeTopology([group.id]),
        },
        {
          label: t("ports"),
          icon: "side",
          fn: () => setInspectorOpen(true),
        },
        { divider: true },
        {
          label: t("saveTemplate"),
          icon: "box",
          fn: () => handleSaveTemplateDialog(group.id),
        },
      ];
      if (group.templateId) {
        items.push(
          {
            label: t("syncTemplate"),
            icon: "undo",
            fn: () => handleOpenSyncTemplate(group.id),
          },
          {
            label: t("saveNewVersion"),
            icon: "check",
            fn: () => handleSaveNewTemplateVersion(group.id),
          },
          {
            label: t("detachTemplate"),
            icon: "off",
            fn: () =>
              editNode(group.id, {
                templateId: undefined,
                templateRevision: undefined,
              }),
          },
        );
      }
      if (group.fanout) {
        const fanId = group.fanout.fanId;
        items.push({ label: t("flow_append_master_step"), icon: "plus", fn: () => {
          let id: string | undefined;
          edit(d => {
            const previous = canvasItemBox(d, d.nodes.find(node => node.id === group.id)!);
            id = appendMasterStep(d, fanId, getLanguage())?.id;
            const frame = d.nodes.find(node => node.id === group.id)!;
            reflowCanvasItem(d, frame, previous);
          });
          if (id) revealNode(id);
        } });
        if (docRef.current.nodes.some(node => node.generatedBy === fanId && node.removed)) {
          items.push({ label: t("flow_cleanup_lanes"), icon: "trash", fn: () => edit(d => cleanRetiredLanes(d, fanId)) });
        }
        items.push({ label: t("deleteNode"), icon: "trash", danger: true, fn: () => {
          edit(d => removeCanvasNodes(d, [group.id]));
          setSelection({ nodes: [], groups: [], edge: null });
        } });
      } else items.push(
        { divider: true },
        {
          label: t("ungroup"),
          icon: "x",
          danger: true,
          fn: () => ungroup(group.id),
        },
      );
      openAnchoredMenu(anchor, items);
    },
    [
      editNode,
      launchScope,
      arrangeTopology,
      handleSaveTemplateDialog,
      handleOpenSyncTemplate,
      handleSaveNewTemplateVersion,
      edit, revealNode,
      ungroup,
      openAnchoredMenu,
    ],
  );

  /* Pointer Tracking Utility */
  const trackPointer = useCallback(
    (
      startEvent: React.PointerEvent | PointerEvent,
      onMove: (ev: PointerEvent) => void,
      onEnd?: (ev: PointerEvent | KeyboardEvent, canceled: boolean) => void,
    ) => {
      startEvent.preventDefault();
      let pending: PointerEvent | undefined;
      let frame = 0;
      let lastX = startEvent.clientX, lastY = startEvent.clientY;
      const pointerId = startEvent.pointerId;
      const paint = () => {
        frame = 0;
        if (!pending) return;
        lastX = pending.clientX;
        lastY = pending.clientY;
        onMove(pending);
        pending = undefined;
      };
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        pending = ev;
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const up = (ev: PointerEvent) => finish(ev, false);
      const cancel = (ev: PointerEvent) => finish(ev, true);
      const key = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          finish(ev, true);
        }
      };
      function finish(ev: PointerEvent | KeyboardEvent, canceled: boolean) {
        if ("pointerId" in ev && ev.pointerId !== pointerId) return;
        cancelAnimationFrame(frame);
        if (!canceled && "clientX" in ev && (pending || ev.clientX !== lastX || ev.clientY !== lastY)) {
          pending = ev;
          paint();
        }
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", key, true);
        onEnd?.(ev, canceled);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", key, true);
    },
    [],
  );

  const previewGeometry = useCallback((patch: GeometryEdit) => {
    gestureRef.current = patch;
    setGesture(patch);
  }, []);
  const finishGeometry = useCallback((canceled: boolean, finalize?: (next: FlowspaceDocument) => void) => {
    const patch = gestureRef.current;
    gestureRef.current = null;
    setGesture(null);
    if (canceled || !patch) return;
    const previous = docRef.current;
    const next = applyGeometry(previous, patch);
    finalize?.(next);
    setHistory(history => [...history.slice(-39), previous]);
    setFuture([]);
    commitEdit(next, 250);
  }, [commitEdit]);

  /* Pointer Interactions: Pan, Node Drag, Group Drag, Resize, Port Wire Drag, Waypoint, Marquee */
  const startPan = useCallback(
    (ev: React.PointerEvent) => {
      const origin = { ...docRef.current.viewport };
      const sx = ev.clientX,
        sy = ev.clientY;
      let moved = false;
      const token = ++viewAnimToken.current;
      wheelTargetRef.current = null;
      // Recent pointer samples drive the release velocity for momentum panning.
      const samples: { t: number; x: number; y: number }[] = [];
      // Pan only needs the grab cursor; toggling the class directly avoids two full
      // canvas re-renders per gesture (start + end) that `setIsDragging` would cost.
      const vpEl = viewportRef.current;
      vpEl?.classList.add("is-dragging");
      trackPointer(
        ev,
        (next) => {
          if (!moved && Math.hypot(next.clientX - sx, next.clientY - sy) < 3)
            return;
          moved = true;
          const now = performance.now();
          samples.push({ t: now, x: next.clientX, y: next.clientY });
          while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
          setViewportDirect(
            {
              x: origin.x + (next.clientX - sx),
              y: origin.y + (next.clientY - sy),
              zoom: origin.zoom,
            },
            900,
          );
        },
        (_, canceled) => {
          vpEl?.classList.remove("is-dragging");
          if (canceled) {
            setViewportDirect(origin, 300);
            return;
          }
          if (!moved && !spacePressed && tool !== "hand") {
            setSelection({ nodes: [], groups: [], edge: null });
            return;
          }
          const first = samples[0];
          const lastSample = samples[samples.length - 1];
          const span = first && lastSample ? lastSample.t - first.t : 0;
          const releaseGap = lastSample ? performance.now() - lastSample.t : Infinity;
          let vx = span > 8 ? (lastSample.x - first.x) / span : 0;
          let vy = span > 8 ? (lastSample.y - first.y) / span : 0;
          if (reducedMotion || releaseGap > 70 || Math.hypot(vx, vy) < 0.35) {
            setViewportDirect(docRef.current.viewport, 250);
            return;
          }
          // Fling: glide with exponential friction until the motion fades out.
          let prev = performance.now();
          const glide = (now: number) => {
            if (token !== viewAnimToken.current) return;
            const dt = Math.min(48, now - prev);
            prev = now;
            const decay = Math.exp(-dt / PAN_INERTIA_TAU_MS);
            vx *= decay;
            vy *= decay;
            const cur = docRef.current.viewport;
            setViewportDirect(
              { x: cur.x + vx * dt, y: cur.y + vy * dt, zoom: cur.zoom },
              400,
            );
            if (Math.hypot(vx, vy) > 0.02) requestAnimationFrame(glide);
          };
          requestAnimationFrame(glide);
        },
      );
    },
    [trackPointer, setViewportDirect, spacePressed, tool, reducedMotion],
  );

  const startWindowMove = useCallback(
    (
      ev: React.PointerEvent,
      nodeId: string,
      returnOnDrop = ev.altKey,
    ) => {
      const curNode = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!curNode?.window) return;
      const area = areaRef.current;
      if (!area) return;
      const originWin = structuredClone(curNode.window);
      const sx = ev.clientX,
        sy = ev.clientY;
      const maxZ =
        Math.max(
          10,
          ...docRef.current.nodes
            .filter((n) => n.window)
            .map((n) => n.window?.z ?? 10),
        ) + 1;
      let baseX = originWin.x,
        baseY = originWin.y;
      if (originWin.snap) {
        const rect = area.getBoundingClientRect();
        baseX = clamp(
          sx - rect.left - originWin.w / 2,
          0,
          Math.max(0, area.clientWidth - originWin.w),
        );
        baseY = 16;
      }
      let snap: "left" | "right" | "max" | null = null;
      previewGeometry({ nodes: new Map([[nodeId, { window: { ...originWin, z: maxZ } }]]) });
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const nx = baseX + (next.clientX - sx);
          const ny = baseY + (next.clientY - sy);
          const rect = area.getBoundingClientRect();
          snap = next.ctrlKey
            ? null
            : next.clientY < rect.top + 24
              ? "max"
              : next.clientX < rect.left + 36
                ? "left"
                : next.clientX > rect.right - 36
                  ? "right"
                  : null;
          setSnapPreview(snap);
          previewGeometry({ nodes: new Map([[nodeId, { window: { ...originWin, x: nx, y: ny, snap: undefined, z: maxZ } }]]) });
        },
        (_, canceled) => {
          setIsDragging(false);
          setSnapPreview(null);
          finishGeometry(canceled,
            (d) => {
              const target = d.nodes.find((x) => x.id === nodeId);
              if (!target) return;
              if (returnOnDrop) {
                delete target.window;
              } else if (target.window) {
                target.window.snap = snap ?? undefined;
                target.window.x = clamp(
                  target.window.x,
                  0,
                  Math.max(0, area.clientWidth - target.window.w),
                );
                target.window.y = clamp(
                  target.window.y,
                  0,
                  Math.max(0, area.clientHeight - 48),
                );
              }
            },
          );
        },
      );
    },
    [trackPointer, previewGeometry, finishGeometry],
  );

  const startNodeMove = useCallback(
    (ev: React.PointerEvent, nodeId: string) => {
      const node = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.window) {
        startWindowMove(ev, nodeId);
        return;
      }
      if (ev.altKey) {
        openWindow(nodeId);
        setTimeout(() => startWindowMove(ev, nodeId, false), 0);
        return;
      }
      if (ev.shiftKey) {
        selectNode(nodeId, true);
        return;
      }
      const activeIds = selection.nodes.includes(nodeId)
        ? selection.nodes
        : [nodeId];
      if (!selection.nodes.includes(nodeId)) {
        selectNode(nodeId);
      }
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const startWorld = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY,
      );
      const originals = activeIds
        .map((id) => docRef.current.nodes.find((n) => n.id === id))
        .filter((n): n is FlowNode => !!n)
        .map((n) => ({
          id: n.id,
          x: n.x,
          y: n.y,
          parentId: n.parentId,
        }));
      let moved = false;
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY,
          );
          const dx = cur.x - startWorld.x,
            dy = cur.y - startWorld.y;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            setIsDragging(true);
          }
          previewGeometry({ nodes: new Map(originals.map(orig => [orig.id, { x: orig.x + dx, y: orig.y + dy }])) });
        },
        (endEv, canceled) => {
          setIsDragging(false);
          if (!moved) return;
          if (canceled) {
            finishGeometry(true);
            return;
          }
          const noSnap = "ctrlKey" in endEv && endEv.ctrlKey;
          finishGeometry(false,
            (d) => {
              const candidateGroups = d.nodes
                .filter((g) => g.kind === "group" && !g.collapsed)
                .sort((a, b) => a.width * a.height - b.width * b.height);
              for (const orig of originals) {
                const target = d.nodes.find((x) => x.id === orig.id);
                if (!target) continue;
                // A card the user placed by hand must not be yanked back later.
                delete target.nudge;
                if (prefs.snap && !noSnap) {
                  target.x = Math.round(target.x / 12) * 12;
                  target.y = Math.round(target.y / 12) * 12;
                }
                const box = nodeBox(target);
                const cx = box.x + box.w / 2,
                  cy = box.y + box.h / 2;
                const hitGroup = candidateGroups.find(
                  (g) =>
                    g.id !== target.id &&
                    cx > g.x &&
                    cx < g.x + g.width &&
                    cy > g.y + 42 &&
                    cy < g.y + g.height,
                );
                const frame = candidateGroups.find(group => group.id === target.parentId && group.fanout);
                if (frame && (target.masterOf || target.generatedBy || frame.fanout!.fanId === target.id || frame.fanout!.mergeId === target.id)) {
                  target.x = Math.max(frame.x + 24, target.x);
                  target.y = Math.max(frame.y + 54, target.y);
                  frame.width = Math.max(frame.width, target.x + box.w - frame.x + 24);
                  frame.height = Math.max(frame.height, target.y + box.h - frame.y + 24);
                } else target.parentId = hitGroup?.id;
              }
            },
          );
        },
      );
    },
    [
      startWindowMove,
      openWindow,
      selectNode,
      selection.nodes,
      trackPointer,
      previewGeometry,
      finishGeometry,
      prefs.snap,
    ],
  );

  const startGroupMove = useCallback(
    (ev: React.PointerEvent, groupId: string) => {
      if (ev.shiftKey) {
        selectNode(groupId, true);
        return;
      }
      setSelection({ nodes: [], groups: [groupId], edge: null });
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const startWorld = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY,
      );
      const movingIds = [groupId, ...groupDescendants(docRef.current, groupId)];
      const originals = movingIds
        .map((id) => docRef.current.nodes.find((n) => n.id === id))
        .filter((n): n is FlowNode => !!n)
        .map((n) => ({ id: n.id, x: n.x, y: n.y }));
      let moved = false;
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY,
          );
          const dx = cur.x - startWorld.x,
            dy = cur.y - startWorld.y;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            setIsDragging(true);
          }
          previewGeometry({ nodes: new Map(originals.map(orig => [orig.id, { x: orig.x + dx, y: orig.y + dy }])) });
        },
        (_, canceled) => {
          setIsDragging(false);
          if (!moved) return;
          finishGeometry(canceled, (d) => {
            for (const item of d.nodes) {
              if (movingIds.includes(item.id)) delete item.nudge;
            }
          });
        },
      );
    },
    [selectNode, trackPointer, previewGeometry, finishGeometry],
  );

  const startResize = useCallback(
    (
      ev: React.PointerEvent,
      nodeId: string,
      mode: "node" | "group" | "window",
    ) => {
      ev.stopPropagation();
      const target = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const initialBox =
        mode === "window" && target.window
          ? { w: target.window.w, h: target.window.h }
          : mode === "group"
            ? groupBox(target)
            : nodeBox(target, false, true);
      const sx = ev.clientX,
        sy = ev.clientY;
      const scale = mode === "window" ? 1 : docRef.current.viewport.zoom;
      const [minW, minH] = mode === "group" ? [260, 180] : target.kind === "board" ? BOARD_MIN_SIZE : [288, 220];
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const nw = Math.max(
            minW,
            initialBox.w + (next.clientX - sx) / scale,
          );
          const nh = Math.max(
            minH,
            initialBox.h + (next.clientY - sy) / scale,
          );
          const change = mode === "window" && target.window
            ? { window: { ...target.window, w: nw, h: nh, snap: undefined } }
            : { width: nw, height: nh };
          previewGeometry({ nodes: new Map([[nodeId, change]]) });
        },
        (_, canceled) => {
          setIsDragging(false);
          finishGeometry(canceled, (d) => {
            const resized = d.nodes.find((n) => n.id === nodeId);
            if (mode === "group" && resized) delete resized.nudge;
          });
        },
      );
    },
    [trackPointer, previewGeometry, finishGeometry],
  );

  const openInputHub = useCallback(
    (nodeId: string, kind: FlowEdge["kind"]) => {
      clearTimeout(hubCloseTimerRef.current);
      setHubTarget((prev) =>
        prev?.nodeId === nodeId && prev.kind === kind ? prev : { nodeId, kind },
      );
    },
    [],
  );

  const scheduleCloseInputHub = useCallback((delay = 175) => {
    clearTimeout(hubCloseTimerRef.current);
    hubCloseTimerRef.current = setTimeout(() => {
      setHubTarget(null);
      setHoveredEdgeId(null);
    }, delay);
  }, []);

  const closeInputHubImmediate = useCallback(() => {
    clearTimeout(hubCloseTimerRef.current);
    hubProgressRef.current = 0;
    setHubTarget(null);
    setHubState(null);
    setHoveredEdgeId(null);
  }, []);

  useEffect(
    () => () => clearTimeout(hubCloseTimerRef.current),
    [],
  );

  /* Smooth 60fps spring/tween driver for multi-input fan-out satellites (with fallback tick when vsync is throttled) */
  useEffect(() => {
    let raf = 0;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let last = performance.now();

    const scheduleFrame = (cb: (now: number) => void) => {
      let fired = false;
      const invoke = (ts: number) => {
        if (fired || cancelled) return;
        fired = true;
        clearTimeout(fallbackTimer);
        cancelAnimationFrame(raf);
        cb(ts);
      };
      raf = requestAnimationFrame(invoke);
      fallbackTimer = setTimeout(() => invoke(performance.now()), 22);
    };

    const cleanup = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(fallbackTimer);
    };

    if (hubTarget) {
      const switching =
        !hubState ||
        hubState.nodeId !== hubTarget.nodeId ||
        hubState.kind !== hubTarget.kind;
      if (switching) {
        hubProgressRef.current = reducedMotion ? 1 : 0.08;
      }
      if (reducedMotion || hubProgressRef.current >= 1) {
        hubProgressRef.current = 1;
        setHubState({
          nodeId: hubTarget.nodeId,
          kind: hubTarget.kind,
          progress: 1,
          closing: false,
        });
        return cleanup;
      }
      setHubState({
        nodeId: hubTarget.nodeId,
        kind: hubTarget.kind,
        progress: hubProgressRef.current,
        closing: false,
      });
      const stepOpen = (now: number) => {
        const dt = Math.min(48, Math.max(8, now - last));
        last = now;
        const nextP = Math.min(1, hubProgressRef.current + dt / 245);
        hubProgressRef.current = nextP;
        setHubState({
          nodeId: hubTarget.nodeId,
          kind: hubTarget.kind,
          progress: nextP,
          closing: false,
        });
        if (nextP < 1) {
          scheduleFrame(stepOpen);
        }
      };
      scheduleFrame(stepOpen);
      return cleanup;
    }

    if (!hubState) return cleanup;
    if (reducedMotion || hubProgressRef.current <= 0.01) {
      hubProgressRef.current = 0;
      setHubState(null);
      return cleanup;
    }
    const closingNodeId = hubState.nodeId;
    const closingKind = hubState.kind;
    const stepClose = (now: number) => {
      const dt = Math.min(48, Math.max(8, now - last));
      last = now;
      const nextP = Math.max(0, hubProgressRef.current - dt / 180);
      hubProgressRef.current = nextP;
      if (nextP <= 0.01) {
        hubProgressRef.current = 0;
        setHubState(null);
      } else {
        setHubState({
          nodeId: closingNodeId,
          kind: closingKind,
          progress: nextP,
          closing: true,
        });
        scheduleFrame(stepClose);
      }
    };
    scheduleFrame(stepClose);
    return cleanup;
  }, [hubTarget, reducedMotion, hubState?.nodeId, hubState?.kind]);

  const resolveSnapTarget = useCallback((
    clientX: number, clientY: number, vpRect: DOMRect, kind: FlowEdge["kind"],
    fixedIds: string[], anchor: WireAnchor, original?: FlowEdge,
  ) => {
    const doc = docRef.current;
    const current = toWorld(doc.viewport, vpRect, clientX, clientY);
    const radius = clamp(28 / doc.viewport.zoom, 18, 42);
    const direction = anchor.direction === "in" ? "out" : "in";
    const origin = fixedIds.flatMap(id => nodesById.get(id) ?? []);
    type Match = { nodeIds: string[]; portId?: string; point: ReturnType<typeof endpoint>; label: string; isOriginalTarget: boolean };
    let reason: string | undefined;
    const match = (ids: string[], portId: string | undefined, label: string): Match | undefined => {
      const nodeIds = ids.filter(id => {
        const target = nodesById.get(id);
        if (!target || fixedIds.includes(id)) return false;
        return origin.some(source => {
          const result = checkDraggedWire(source, target, kind, anchor, portId, doc.edges);
          if (!result.ok) reason = result.reason;
          return result.ok;
        });
      });
      if (!nodeIds.length) return;
      const point = endpoint(doc, nodeIds[0], kind, direction, lod, keepExpandedIds, endpointIndex, portId);
      return { nodeIds, portId, point, label, isOriginalTarget: !!original && nodeIds.length === 1 &&
        nodeIds[0] === original.target && (portId ?? "in") === (original.targetPort ?? "in") };
    };

    const hit = document.elementFromPoint(clientX, clientY);
    const socket = hit?.closest<HTMLElement>("[data-port-direction]");
    if (socket && socket.dataset.portDirection === direction &&
        (socket.dataset.portKind === kind || kind === "event" && direction === "in" && socket.dataset.portKind === "continuation")) {
      const ids = socket.dataset.proxyNodes?.split(",") ?? (socket.dataset.nodeId ? [socket.dataset.nodeId] : []);
      const snappedTarget = match(ids, socket.dataset.portId, socket.title || nodesById.get(ids[0])?.title || "");
      return { current: snappedTarget?.point ?? current, snappedTarget, reason: snappedTarget ? undefined : reason };
    }
    // Snap to visible compatible sockets in world space, including folded group proxies.
    let nearest: Match | undefined;
    let distance = radius;
    for (const node of doc.nodes) {
      if (fixedIds.includes(node.id)) continue;
      const candidates = node.kind === "group" && node.collapsed && visibleGroups.some(group => group.id === node.id)
        ? (groupPorts.get(node.id) ?? []).filter(p => !p.hidden && p.direction === direction && p.kind === kind)
            .map(p => ({ ids: p.nodes, portId: p.portId, label: p.name }))
        : isNodeVisible(node) ? wirePortIds(node, kind, direction)
            .map(portId => ({ ids: [node.id], portId, label: node.title })) : [];
      for (const port of candidates) {
        if (!port.ids.length) continue;
        const point = endpoint(doc, port.ids[0], kind, direction, lod, keepExpandedIds, endpointIndex, port.portId);
        if (node.kind === "flow" && !point.box.compact && port.portId &&
            point.y !== point.box.y + portY(node, kind, false, port.portId, endpointIndex.branchScroll.get(node.id), undefined, direction)) continue;
        const d = Math.hypot(current.x - point.x, current.y - point.y);
        if (d > distance) continue;
        const found = match(port.ids, port.portId, port.label);
        if (found) { nearest = found; distance = d; }
      }
    }
    if (nearest) return { current: nearest.point, snappedTarget: nearest, reason: undefined };

    const cardId = hit?.closest<HTMLElement>("[data-node-card]")?.dataset.nodeCard;
    const card = cardId ? nodesById.get(cardId) : undefined;
    reason = undefined;
    if (card) {
      const ports = wirePortIds(card, kind, direction);
      for (const id of ports.length ? ports : [direction]) {
        const snappedTarget = match([card.id], id, card.title);
        if (snappedTarget) return { current, snappedTarget, reason: undefined };
      }
    }
    return { current, snappedTarget: undefined, reason };
  }, [nodesById, endpointIndex, groupPorts, isNodeVisible, visibleGroups, lod, keepExpandedIds]);

  const startPortDrag = useCallback(
    (
      ev: React.PointerEvent,
      fromIds: string[],
      kind: FlowEdge["kind"],
      sourceItemKey?: string,
      onDragStart?: () => void,
      portId?: string,
      direction: "out" | "in" = "out",
    ) => {
      ev.stopPropagation();
      if (ev.button !== 0) return;
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect || !fromIds.length) return;
      const start = { x: ev.clientX, y: ev.clientY };
      const anchor: WireAnchor = direction === "out"
        ? { sourceItemKey, sourcePort: portId, direction } : { targetPort: portId, direction };
      const fromPt = sourceItemKey !== undefined
        ? toWorld(docRef.current.viewport, vpRect, start.x, start.y)
        : endpoint(docRef.current, fromIds[0], kind, direction, lod, keepExpandedIds, endpointIndex, portId);
      let started = false;
      const begin = () => {
        started = true;
        onDragStart?.();
        closeInputHubImmediate();
        setConnecting({
          kind, fromIds, anchor, fromPoint: fromPt,
          current: { x: fromPt.x, y: fromPt.y }, snappedTarget: null,
        });
        setIsDragging(true);
      };
      if (sourceItemKey === undefined) begin();
      trackPointer(
        ev,
        (next) => {
          if (!started) {
            if (Math.hypot(next.clientX - start.x, next.clientY - start.y) <= 5) return;
            begin();
          }
          const snap = resolveSnapTarget(
            next.clientX,
            next.clientY,
            vpRect,
            kind,
            fromIds, anchor,
          );
          setConnecting((prev) =>
            prev
              ? {
                  ...prev,
                  ...snap,
                }
              : null,
          );
        },
        (endEv, canceled) => {
          if (!started) return;
          setIsDragging(false);
          setConnecting(null);
          if (canceled || !("clientX" in endEv)) return;
          const snap = resolveSnapTarget(
            endEv.clientX,
            endEv.clientY,
            vpRect,
            kind,
            fromIds, anchor,
          );
          if (snap.snappedTarget?.nodeIds.length) {
            const target = snap.snappedTarget;
            if (direction === "out") {
              connectNodes(fromIds, target.nodeIds, kind, { sourceItemKey, sourcePort: portId, targetPort: target.portId });
            } else {
              connectNodes(target.nodeIds, fromIds, kind, { sourcePort: target.portId, targetPort: portId });
            }
            return;
          }
          const hitEl = document.elementFromPoint(
            endEv.clientX,
            endEv.clientY,
          ) as HTMLElement | null;
          const dropWorld = toWorld(
            docRef.current.viewport,
            vpRect,
            endEv.clientX,
            endEv.clientY,
          );
          /* Dragged to empty canvas: ComfyUI wire-drop quick-connect menu at the release point */
          if (
            hitEl?.closest(".fs-viewport") &&
            !hitEl.closest(".node,.workflow-group,.fs-minimap,.fs-canvas-controls")
          ) {
            if (sourceItemKey !== undefined) {
              const sourceNode = docRef.current.nodes.find(node => node.id === fromIds[0]);
              openAnchoredMenu({ x: endEv.clientX, y: endEv.clientY }, [
                { label: t("boardDispatch"), icon: "sendTask",
                  fn: () => createBoardCompanion(fromIds[0], sourceItemKey, "agent") },
                { label: t("flow_fanout_group"), icon: "fanout", fn: () => insertFanout(dropWorld, {
                  portKind: kind, direction, portId, sourceNode, sourceItemKey, nodeIds: fromIds,
                }) },
              ]);
              return;
            }
            const source = docRef.current.nodes.find(
              (n) => n.id === fromIds[0],
            );
            if (!source) return;
            openQuickCreate(
              { x: endEv.clientX, y: endEv.clientY },
              {
                portKind: kind, portId, direction, nodeIds: fromIds,
                ...(direction === "out" ? { sourceNode: source } : { targetNode: source }),
                worldPoint: dropWorld,
              },
            );
          }
        },
      );
    },
    [
      lod,
      keepExpandedIds,
      closeInputHubImmediate,
      resolveSnapTarget,
      trackPointer,
      connectNodes,
      openQuickCreate,
      openAnchoredMenu,
      createBoardCompanion,
      insertFanout,
    ],
  );

  /* ---------- Staffing wires: a role node's top socket ⇄ a team's bottom port ---------- */
  const [staffDrag, setStaffDrag] = useState<{ roleId?: string; teamId?: string; anchor: { x: number; y: number } } | null>(null);
  const [staffTip, setStaffTip] = useState<{ x: number; y: number } | null>(null);
  const [staffTarget, setStaffTarget] = useState<string>();
  const wantsRoutes = useMemo(() => doc.nodes.some((n) => n.kind === "role" || !!n.teamConfig), [doc.nodes]);
  const modelRoutes = useModelRoutes(bridge, wantsRoutes);
  const staffSocketPoint = useCallback((role: FlowNode) => {
    const box = nodeBox(role, lod, keepExpandedIds.has(role.id));
    return { x: box.x + box.w / 2, y: box.y };
  }, [lod, keepExpandedIds]);
  const staffPortPoint = useCallback((team: FlowNode) => {
    const box = nodeBox(team, lod, keepExpandedIds.has(team.id));
    return { x: box.x + box.w / 2, y: box.y + box.h };
  }, [lod, keepExpandedIds]);

  /** Wires `roleId` into `teamId`, giving it a slot name free in that team. */
  const staffInto = useCallback((d: FlowspaceDocument, roleId: string, teamId: string): boolean => {
    const role = d.nodes.find((n) => n.id === roleId && n.kind === "role");
    const team = d.nodes.find((n) => n.id === teamId);
    if (!role || team?.kind !== "agent") return false;
    const others = staffNodes(d.nodes, teamId).filter((n) => n.id !== roleId);
    const blueprint = team?.teamRef ? snapshot?.teamBlueprints?.find((b) => b.id === team.teamRef?.teamId) : undefined;
    if (others.length + (blueprint?.slots.length ?? 0) >= 8) {
      showToast(t("teamSlotsFull"), true);
      return false;
    }
    const taken = new Set([...(blueprint?.slots.map((slot) => slot.slotId) ?? []),
      ...others.flatMap((n) => n.slotId ? [n.slotId] : [])]);
    role.staffOf = teamId;
    if (!role.slotId || taken.has(role.slotId)) role.slotId = slotIdFor(role.title, taken);
    // The first role turns a plain agent into a team; make room for its crew tab.
    if (!team.teamRef && !others.length) {
      const previous = nodeBox(team);
      team.width = Math.max(team.width, 440);
      team.height = Math.max(team.height, 540);
      reflowCanvasItem(d, team, previous);
    }
    return true;
  }, [snapshot?.teamBlueprints, showToast]);

  const startStaffDrag = useCallback((ev: React.PointerEvent, from: { roleId?: string; teamId?: string }) => {
    ev.stopPropagation();
    const vpRect = viewportRef.current?.getBoundingClientRect();
    const origin = docRef.current.nodes.find((n) => n.id === (from.roleId ?? from.teamId));
    if (!vpRect || !origin) return;
    const anchor = from.roleId ? staffSocketPoint(origin) : staffPortPoint(origin);
    const wasStaffed = from.roleId ? origin.staffOf : undefined;
    const hit = (clientX: number, clientY: number) => {
      const card = (document.elementFromPoint(clientX, clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-node-card]");
      const node = card ? docRef.current.nodes.find((n) => n.id === card.dataset.nodeCard) : undefined;
      if (!node || node.id === origin.id) return undefined;
      return node.kind === (from.roleId ? "agent" : "role") ? node : undefined;
    };
    setStaffDrag({ ...from, anchor });
    setStaffTip(anchor);
    setIsDragging(true);
    trackPointer(ev, (move) => {
      const node = hit(move.clientX, move.clientY);
      setStaffTarget((prev) => prev === node?.id ? prev : node?.id);
      setStaffTip(node
        ? (from.roleId ? staffPortPoint(node) : staffSocketPoint(node))
        : toWorld(docRef.current.viewport, vpRect, move.clientX, move.clientY));
    }, (end, canceled) => {
      setStaffDrag(null);
      setStaffTip(null);
      setStaffTarget(undefined);
      setIsDragging(false);
      if (canceled || !("clientX" in end)) return;
      const node = hit(end.clientX, end.clientY);
      if (from.roleId) {
        if (node) edit((d) => { staffInto(d, from.roleId!, node.id); });
        else if (wasStaffed && Math.hypot(end.clientX - ev.clientX, end.clientY - ev.clientY) > 6)
          edit((d) => { const role = d.nodes.find((n) => n.id === from.roleId); if (role) delete role.staffOf; });
        return;
      }
      if (node) {
        edit((d) => { staffInto(d, node.id, from.teamId!); });
        return;
      }
      // Dropped on empty canvas: a new role, already wired in.
      const hitEl = document.elementFromPoint(end.clientX, end.clientY) as HTMLElement | null;
      if (!hitEl?.closest(".fs-viewport") || hitEl.closest(".node,.workflow-group,.fs-minimap,.fs-canvas-controls")) return;
      const at = toWorld(docRef.current.viewport, vpRect, end.clientX, end.clientY);
      const created = createCanvasNode("role", at, undefined, false, {
        place: (n) => ({ x: Math.round((at.x - n.width / 2) / 12) * 12, y: Math.round(at.y / 12) * 12 }),
        patch: { title: t("teamRoleUntitled") },
        link: (d, role) => { staffInto(d, role.id, from.teamId!); },
      });
      pendingFocusRef.current = created.id;
    });
  }, [staffSocketPoint, staffPortPoint, trackPointer, edit, staffInto, createCanvasNode]);

  const staffWires = useMemo<StaffWire[]>(() => {
    const wires: StaffWire[] = [];
    for (const role of doc.nodes) {
      if (role.kind !== "role" || !role.staffOf || role.id === staffDrag?.roleId) continue;
      const team = nodesById.get(role.staffOf);
      if (team?.kind !== "agent" || !isNodeVisible(role) || !isNodeVisible(team)) continue;
      const runtime = team!.sessionId ? snapshot?.teams?.[team!.sessionId] : undefined;
      const slot = runtime?.slots.find((s) => s.nodeId === role.id)?.slotId;
      wires.push({
        id: role.id, from: staffPortPoint(team!), to: staffSocketPoint(role),
        active: !!slot && !!runtime?.members.some((m) => m.slotId === slot && m.activity === "running"),
      });
    }
    return wires;
  }, [doc.nodes, nodesById, isNodeVisible, snapshot?.teams, staffPortPoint, staffSocketPoint, staffDrag?.roleId]);

  /**
   * ComfyUI-style Input Wire Unplug / Reroute / Disconnect:
   * Clicking (<4px) selects the edge; dragging (>=4px) unplugs the wire from its input socket
   * so the user can plug it into another compatible node or drop on empty canvas to disconnect.
   */
  const startInputEdgeDrag = useCallback(
    (ev: React.PointerEvent, edge: FlowEdge) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const startX = ev.clientX;
      const startY = ev.clientY;
      let unplugged = false;

      trackPointer(
        ev,
        (next) => {
          if (
            !unplugged &&
            Math.hypot(next.clientX - startX, next.clientY - startY) < 4
          ) {
            return;
          }
          const anchor: WireAnchor = { sourcePort: edge.sourcePort, sourceItemKey: edge.sourceItemKey, mode: edge.mode, edgeId: edge.id };
          const fromPt = endpoint(
            docRef.current,
            edge.source,
            edge.kind,
            "out",
            lod,
            keepExpandedIds, endpointIndex, edge.sourcePort,
          );
          if (!unplugged) {
            unplugged = true;
            closeInputHubImmediate();
            setIsDragging(true);
          }
          const snap = resolveSnapTarget(
            next.clientX,
            next.clientY,
            vpRect,
            edge.kind,
            [edge.source], anchor, edge,
          );
          setConnecting({
            kind: edge.kind,
            fromIds: [edge.source], anchor, reason: snap.reason,
            fromPoint: fromPt,
            current: snap.current,
            reconnectingEdge: edge,
            snappedTarget: snap.snappedTarget,
          });
        },
        (endEv, canceled) => {
          if (!unplugged) {
            setSelection({ nodes: [], groups: [], edge: edge.id });
            setInspectorOpen(true);
            return;
          }
          setIsDragging(false);
          setConnecting(null);
          if (canceled || !("clientX" in endEv)) return;

          const snap = resolveSnapTarget(
            endEv.clientX,
            endEv.clientY,
            vpRect,
            edge.kind,
            [edge.source], { sourcePort: edge.sourcePort, sourceItemKey: edge.sourceItemKey, mode: edge.mode, edgeId: edge.id }, edge,
          );

          if (snap.reason || snap.snappedTarget?.isOriginalTarget) {
            return;
          }

          if (snap.snappedTarget?.nodeIds.length) {
            const targetLabel = snap.snappedTarget.label;
            const targetIds = snap.snappedTarget.nodeIds;
            const targetPort = snap.snappedTarget.portId;
            let primaryEdgeId = edge.id;
            edit((d) => {
              const existing = d.edges.find((x) => x.id === edge.id);
              if (!existing) return;
              const validTargets = targetIds.filter((tid) => {
                const tn = d.nodes.find((n) => n.id === tid);
                return tid !== existing.source && canConnect({ ...existing, source: d.nodes.find(n => n.id === existing.source),
                  target: tn, targetPort, edges: d.edges, edgeId: existing.id }).ok;
              });
              if (!validTargets.length) return;
              const [firstTarget, ...restTargets] = validTargets;
              const dup = d.edges.find(x => x.id !== existing.id && matchesWire(x, { ...existing, target: firstTarget, targetPort }));
              if (dup) {
                primaryEdgeId = dup.id;
                d.edges = d.edges.filter((x) => x.id !== existing.id);
              } else {
                existing.target = firstTarget;
                existing.targetPort = targetPort;
                existing.waypoints = [];
              }
              for (const extraId of restTargets) {
                if (!d.edges.some(x => matchesWire(x, { ...existing, target: extraId, targetPort }))) {
                  d.edges.push({
                    ...structuredClone(existing),
                    id: uid(),
                    target: extraId, targetPort,
                    waypoints: [],
                  });
                }
              }
            });
            setSelection({ nodes: [], groups: [], edge: primaryEdgeId });
            showToast(t("wireReconnected", { name: targetLabel }));
            return;
          }

          const hit = document.elementFromPoint(endEv.clientX, endEv.clientY);
          if (!hit?.closest(".fs-viewport") || hit.closest(".node,.workflow-group,.fs-minimap,.fs-canvas-controls")) return;
          /* Dropped onto empty canvas: disconnect (delete) the wire cleanly with Undo support */
          edit((d) => {
            d.edges = d.edges.filter((x) => x.id !== edge.id);
          });
          setSelection((prev) =>
            prev.edge === edge.id ? { ...prev, edge: null } : prev,
          );
          showToast(t("wireDisconnected"));
        },
      );
    },
    [
      lod,
      keepExpandedIds,
      closeInputHubImmediate,
      resolveSnapTarget,
      trackPointer,
      edit,
      showToast,
    ],
  );

  const startWaypointDrag = useCallback(
    (ev: React.PointerEvent, edgeId: string, wpIndex: number) => {
      ev.stopPropagation();
      const vpRect = viewportRef.current?.getBoundingClientRect();
      const edge = docRef.current.edges.find((e) => e.id === edgeId);
      const origWp = edge?.waypoints?.[wpIndex]
        ? { ...edge.waypoints[wpIndex] }
        : null;
      if (!vpRect || !origWp) return;
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const pt = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY,
          );
          const waypoints = edge!.waypoints!.map((waypoint, index) => index === wpIndex ? pt : waypoint);
          previewGeometry({ edge: { id: edgeId, waypoints } });
        },
        (_, canceled) => {
          setIsDragging(false);
          finishGeometry(canceled);
        },
      );
    },
    [trackPointer, previewGeometry, finishGeometry],
  );

  const startMarquee = useCallback(
    (ev: React.PointerEvent) => {
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const start = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY,
      );
      const baseNodes = new Set(ev.shiftKey ? selection.nodes : []);
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY,
          );
          const x = Math.min(start.x, cur.x),
            y = Math.min(start.y, cur.y),
            w = Math.abs(cur.x - start.x),
            h = Math.abs(cur.y - start.y);
          const v = docRef.current.viewport;
          setMarquee({
            x: x * v.zoom + v.x,
            y: y * v.zoom + v.y,
            w: w * v.zoom,
            h: h * v.zoom,
          });
          const hit = docRef.current.nodes
            .filter((n) => {
              if (!isNodeVisible(n)) return false;
              const b = nodeBox(n, lod, keepExpandedIds.has(n.id));
              return (
                b.x < x + w &&
                b.x + b.w > x &&
                b.y < y + h &&
                b.y + b.h > y
              );
            })
            .map((n) => n.id);
          setSelection({
            nodes: [...new Set([...baseNodes, ...hit])],
            groups: [],
            edge: null,
          });
        },
        () => {
          setIsDragging(false);
          setMarquee(null);
        },
      );
    },
    [selection.nodes, trackPointer, isNodeVisible, lod, keepExpandedIds],
  );

  /* Global Keyboard Shortcuts & Dialog Focus Trap */
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (replayLocked.current) return;
      const target = ev.target instanceof HTMLElement ? ev.target : null;
      const inOurRoot =
        Boolean(target && rootRef.current?.contains(target)) ||
        document.activeElement === document.body;
      if (!inOurRoot && !paletteDialog && !launchDialog && !helpModal) return;

      const mod = ev.ctrlKey || ev.metaKey;
      const typing = !!target?.closest(
        'input, textarea, select, [contenteditable="true"]',
      );

      /* Active Dialog Focus Trap & Escape */
      if (
        paletteDialog ||
        launchDialog ||
        formModal ||
        sessionModal ||
        fileModal ||
        templatePreviewModal ||
        syncModal ||
        mergePortsModal ||
        exchangeModal ||
        helpModal
      ) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          setPaletteDialog(null);
          setLaunchDialog(null);
          setFormModal(null);
          setSessionModal(null);
          setFileModal(null);
          setTemplatePreviewModal(null);
          setSyncModal(null);
          setMergePortsModal(null);
          setExchangeModal(null);
          setHelpModal(false);
          return;
        }
        if (ev.key === "Tab" && dialogRef.current) {
          const stops = Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]',
            ),
          ).filter((el) => el.offsetParent !== null);
          if (stops.length) {
            const first = stops[0],
              last = stops[stops.length - 1];
            if (ev.shiftKey && document.activeElement === first) {
              ev.preventDefault();
              last.focus();
            } else if (!ev.shiftKey && document.activeElement === last) {
              ev.preventDefault();
              first.focus();
            }
          }
        }
        return;
      }

      if (menu && ev.key === "Escape") {
        ev.preventDefault();
        menu.returnFocus?.focus({ preventScroll: true });
        setMenu(null);
        return;
      }

      if (target?.closest(".fs-team-dialog")) return;
      if (mod && (ev.key.toLowerCase() === "k" || ev.key.toLowerCase() === "f")) {
        if (!target?.closest(".fs-embedded")) {
          ev.preventDefault();
          setPaletteDialog({ targetNodeId: null, query: "", index: 0 });
          return;
        }
      }

      if (typing || isTypingTarget(document.activeElement) || target?.closest(".fs-team-page, .fs-team-view")) return;
      /* Quick-create & payload popovers own their keyboard while open */
      if (quickCreate || payloadPeek) return;

      if (ev.code === "Space" && !target?.closest("button")) {
        ev.preventDefault();
        setSpacePressed(true);
        return;
      }
      if (mod && ["z", "y"].includes(ev.key.toLowerCase())) {
        ev.preventDefault();
        performUndo(ev.shiftKey || ev.key.toLowerCase() === "y");
        return;
      }

      /* ---- ComfyUI shortcuts (canvas only, never inside the embedded DSH chat) ---- */
      const onCanvas =
        routeName === "canvas" &&
        !target?.closest(".fs-embedded") &&
        /* Mounted-but-hidden panels must not steal Tab / Ctrl+A / Ctrl+C from DSH */
        (rootRef.current?.getClientRects().length ?? 0) > 0;
      const lowerKey = ev.key.toLowerCase();
      if (onCanvas && !mod && !ev.altKey) {
        const neutralFocus =
          !target ||
          target === document.body ||
          target === rootRef.current ||
          target === viewportRef.current;
        if (
          (ev.key === "Tab" && !ev.shiftKey && neutralFocus) ||
          (ev.shiftKey && lowerKey === "a")
        ) {
          ev.preventDefault();
          const vpRect = viewportRef.current?.getBoundingClientRect();
          const ptr = pointerRef.current;
          const inside =
            ptr &&
            vpRect &&
            ptr.x >= vpRect.left &&
            ptr.x <= vpRect.right &&
            ptr.y >= vpRect.top &&
            ptr.y <= vpRect.bottom;
          openQuickCreate(
            inside
              ? ptr
              : {
                  x: (vpRect?.left ?? 0) + (vpRect?.width ?? vpSize.width) / 2,
                  y: (vpRect?.top ?? 0) + (vpRect?.height ?? vpSize.height) / 2,
                },
          );
          return;
        }
        if (ev.key === "?") {
          ev.preventDefault();
          setHelpModal(true);
          return;
        }
      }
      if (onCanvas && mod && !ev.altKey) {
        if (lowerKey === "c" && !ev.shiftKey) {
          /* Let native copy win when the user has highlighted text */
          if (window.getSelection()?.toString()) return;
          if (copySelection()) ev.preventDefault();
          return;
        }
        if (lowerKey === "v" && !ev.shiftKey) {
          if (pasteClipboard()) ev.preventDefault();
          return;
        }
        if (lowerKey === "d") {
          ev.preventDefault();
          duplicateSelection();
          return;
        }
        if (lowerKey === "a") {
          ev.preventDefault();
          selectAllVisible();
          return;
        }
        if (lowerKey === "g") {
          ev.preventDefault();
          if (ev.shiftKey) {
            for (const gid of selection.groups) ungroup(gid);
          } else {
            groupSelected();
          }
          return;
        }
        if (lowerKey === "b") {
          ev.preventDefault();
          toggleParticipation("bypassed");
          return;
        }
        if (lowerKey === "m") {
          ev.preventDefault();
          toggleParticipation("paused");
          return;
        }
      }
      if (mod && ev.key === "Enter") {
        ev.preventDefault();
        runSelection();
        return;
      }
      if (ev.altKey && ev.key === "Enter" && selection.nodes.length === 1) {
        ev.preventDefault();
        openWindow(selection.nodes[0]);
        return;
      }
      if (mod) return;

      const lower = ev.key.toLowerCase();
      if (lower === "f") {
        ev.preventDefault();
        fitView(ev.shiftKey);
      } else if (lower === "g") {
        ev.preventDefault();
        groupSelected();
      } else if (lower === "d" && selection.nodes.length === 1) {
        const n = docRef.current.nodes.find((x) => x.id === selection.nodes[0]);
        if (n?.kind === "agent") {
          ev.preventDefault();
          openDetailCard(n.id);
        }
      } else if (lower === "v") {
        setTool("pointer");
      } else if (lower === "h") {
        setTool("hand");
      } else if (ev.key === "Escape") {
        setMenu(null);
        setSelection({ nodes: [], groups: [], edge: null });
      } else if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        deleteSelection();
      } else if (ev.key.startsWith("Arrow") && selection.nodes.length === 1) {
        ev.preventDefault();
        const cur = docRef.current.nodes.find(
          (x) => x.id === selection.nodes[0],
        );
        if (!cur) return;
        const cb = nodeBox(cur);
        const cx = cb.x + cb.w / 2,
          cy = cb.y + cb.h / 2;
        const horiz = ev.key === "ArrowLeft" || ev.key === "ArrowRight";
        const sign = ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 1;
        const nextCandidate = docRef.current.nodes
          .filter((n) => n.id !== cur.id && isNodeVisible(n))
          .map((n) => {
            const nb = nodeBox(n);
            const dx = nb.x + nb.w / 2 - cx,
              dy = nb.y + nb.h / 2 - cy;
            return {
              n,
              primary: horiz ? dx * sign : dy * sign,
              cross: horiz ? Math.abs(dy) : Math.abs(dx),
            };
          })
          .filter((c) => c.primary > 8)
          .sort((a, b) => a.primary + a.cross * 2 - (b.primary + b.cross * 2))[0];
        if (nextCandidate) revealNode(nextCandidate.n.id);
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === "Space") setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    paletteDialog,
    launchDialog,
    formModal,
    sessionModal,
    fileModal,
    templatePreviewModal,
    syncModal,
    mergePortsModal,
    exchangeModal,
    helpModal,
    menu,
    quickCreate,
    payloadPeek,
    routeName,
    vpSize,
    openQuickCreate,
    copySelection,
    pasteClipboard,
    duplicateSelection,
    selectAllVisible,
    ungroup,
    toggleParticipation,
    runSelection,
    performUndo,
    selection,
    launchScope,
    openWindow,
    fitView,
    groupSelected,
    openDetailCard,
    deleteSelection,
    isNodeVisible,
    revealNode,
  ]);

  /* Focus the task editor of a freshly created Agent once its card is in the DOM */
  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    const raf = requestAnimationFrame(() => {
      const card = rootRef.current?.querySelector<HTMLElement>(
        `[data-node-card="${CSS.escape(id)}"]`,
      );
      const field = card?.querySelector<HTMLTextAreaElement>(
        "textarea.task-editor, textarea.note-editor",
      );
      if (!field) return;
      pendingFocusRef.current = null;
      field.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [doc]);

  /* Track the pointer over the canvas for cursor-anchored paste / quick-create */
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      pointerRef.current = { x: ev.clientX, y: ev.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menu) return;
    if (menu.returnFocus) {
      rootRef.current?.querySelector<HTMLElement>('.fs-menu[role="menu"] > button:not(:disabled)')?.focus();
    }
    const onDown = (ev: PointerEvent) => {
      if (!(ev.target as HTMLElement | null)?.closest(".fs-menu")) {
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [menu]);

  /* Wheel Zoom / Pan on Canvas Viewport */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (ev: WheelEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target?.closest(".fs-canvas-controls, .fs-minimap")) return;
      if (!ev.ctrlKey && target?.closest(".node.full")) return;
      ev.preventDefault();
      viewAnimToken.current++;
      // Accumulate onto the pending glide target so fast notches never lose distance.
      const base = wheelTargetRef.current?.view ?? docRef.current.viewport;
      const rect = vp.getBoundingClientRect();
      const anchor = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      // Line / page delta modes (classic mouse wheels) are normalised to pixels.
      const unit = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? rect.height : 1;
      const dx = ev.deltaX * unit;
      const dy = ev.deltaY * unit;
      if (prefs.wheel === "pan" && !ev.ctrlKey) {
        glideViewTo({ x: base.x - dx, y: base.y - dy, zoom: base.zoom }, anchor);
      } else {
        const factor = Math.exp(-dy * (ev.ctrlKey ? 0.009 : 0.0019));
        glideViewTo(
          zoomAt(base, rect, ev.clientX, ev.clientY, factor),
          anchor,
        );
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [prefs.wheel, glideViewTo]);

  /* Computed Read-Only Message Wires strictly from DSH Native Agent Messages (M11) */
  const exchanges = useMemo<ExchangePair[]>(() => {
    const teams = new Map<string, string>();
    for (const team of Object.values(snapshot?.teams ?? {})) {
      for (const member of team.members) teams.set(member.sessionId, team.nodeId);
    }
    const nodeIdForSession = (sid: string): string | undefined => {
      const direct = doc.nodes.find((n) => n.sessionId === sid)?.id;
      if (direct) return direct;
      if (teams.has(sid)) return teams.get(sid);
      const sub = snapshot?.subagents?.find((s) => s.sessionId === sid);
      if (sub) {
        return doc.nodes.find((n) => n.sessionId === sub.parentSessionId)?.id;
      }
      return undefined;
    };
    return groupExchanges(snapshot?.nativeMessages ?? [], nodeIdForSession).filter(
      (ex) =>
        ex.items.length > 0 &&
        isNodeVisible(
          doc.nodes.find((n) => n.id === ex.from),
          true,
        ) &&
        isNodeVisible(
          doc.nodes.find((n) => n.id === ex.to),
          true,
        ),
    );
  }, [snapshot?.nativeMessages, snapshot?.subagents, snapshot?.teams, doc.nodes, isNodeVisible]);

  /* Multi-input hover fan-out layout (one satellite mini-node per incoming wire) */
  const activeHubLayout = useMemo(
    () =>
      hubState
        ? computeInputHubLayout({
            doc,
            nodeId: hubState.nodeId,
            kind: hubState.kind,
            progress: hubState.progress,
            closing: hubState.closing,
            reducedMotion,
            excludeEdgeId: connecting?.reconnectingEdge?.id,
            lod,
            keepExpandedIds,
            isNodeVisible,
          })
        : null,
    [
      hubState,
      doc,
      reducedMotion,
      connecting?.reconnectingEdge?.id,
      lod,
      keepExpandedIds,
      isNodeVisible,
    ],
  );

  const hubSatByEdgeId = useMemo(() => {
    const m = new Map<string, HubSatelliteItem>();
    if (activeHubLayout) {
      for (const sat of activeHubLayout.satellites) {
        m.set(sat.edge.id, sat);
      }
    }
    return m;
  }, [activeHubLayout]);

  const routingBoxes = useMemo(
    () => [
      ...sceneNodes.map(item => item.b),
      ...visibleGroups
        .filter((group) => group.collapsed)
        .map((group) => expandedGroupBox(graphDocument, group)),
      ...derivedStructure.cards.map((card) => card.box),
    ],
    [graphDocument, sceneNodes, visibleGroups, derivedStructure.cards],
  );

  /* Computed SVG Wire Geometry */
  const svgBounds = paintArea;
  const wireViewport = useMemo(() => viewportBox(view, vpSize), [view, vpSize]);

  const edgeVisualState = useCallback(
    (edge: FlowEdge): string => {
      if (edge.kind === "reference") {
        return capsuleStateOf(edge, snapshot?.sourceVersions);
      }
      if (runtime.latestToken.get(edge.id)?.skip) return "skipped";
      if (
        contentIndex.nodesById.get(edge.target)?.participation ===
        "bypassed"
      ) {
        return "bypassed";
      }
      const activeTokens = runtime.tokens.get(edge.id) ?? [];
      if (
        activeTokens.some(
          (tk) => !tk.ready && !tk.consumed && !tk.dismissed && tk.boundary,
        )
      )
        return "boundary";
      if (
        activeTokens.some(
          (tk) => !tk.ready && !tk.consumed && !tk.dismissed && !tk.boundary,
        )
      )
        return "waiting";
      if (activeTokens.some((tk) => tk.ready && !tk.consumed)) return "queued";
      const targetState = nodeStatusOf(snapshot, edge.target);
      if (
        targetState === "running" &&
        runtime.runningConsumed.has(edge.id)
      )
        return "active";
      if (
        runtime.consumed.has(edge.id)
      )
        return "done";
      return "idle";
    },
    [snapshot, contentIndex, runtime],
  );

  const wireCaches = useMemo(() => [new SceneWires(), new SceneWires()], []);
  const pathIds = useMemo(() => {
    const ids = new Set(derivedStructure.links.map(link => link.id));
    for (const node of baseDoc.nodes) {
      if (node.kind === "detail" || node.kind === "display") ids.add(`source:${node.id}`);
    }
    return ids;
  }, [derivedStructure.links, baseDoc.nodes]);
  const wireScene = useMemo(() => {
    const cache = wireCaches[Number(lod)];
    const invalid = cache.update(routingBoxes, doc.edges, pathIds);
    return { cache, invalid };
  }, [wireCaches, lod, routingBoxes, doc.edges, pathIds]);
  const wirePlan = useMemo(() => {
    const attached = new Map<string, Set<string>>();
    const edges = new Map<string, { edge: FlowEdge; evState: string }>();
    const { nodesById, collapsed } = contentIndex;
    for (const edge of doc.edges) {
      if (!passesNodeFilter(nodesById.get(edge.source)) || !passesNodeFilter(nodesById.get(edge.target))) continue;
      const evState = edgeVisualState(edge);
      if (
        lod &&
        edge.kind === "reference" &&
        selection.edge !== edge.id &&
        !selection.nodes.includes(edge.source) &&
        !selection.nodes.includes(edge.target) &&
        !["active", "queued", "waiting", "boundary", "skipped"].includes(evState)
      ) continue;
      const sourceGroup = collapsed.get(edge.source)?.id;
      const targetGroup = collapsed.get(edge.target)?.id;
      if (sourceGroup && sourceGroup === targetGroup) continue;
      for (const id of [sourceGroup ?? edge.source, targetGroup ?? edge.target]) {
        let ids = attached.get(id);
        if (!ids) {
          ids = new Set();
          attached.set(id, ids);
        }
        ids.add(edge.id);
      }
      edges.set(edge.id, { edge, evState });
    }
    return { edges, attached };
  }, [doc.edges, contentIndex, passesNodeFilter, edgeVisualState, lod, selection.edge, selection.nodes]);
  const edgeLayouts = useRef<{
    plan: typeof wirePlan; scroll: typeof branchScroll; expanded: Set<string>; mode: typeof prefs.wireRouting;
    moves?: GeometryEdit["nodes"]; byId: Map<string, WireLayout>; layouts: WireLayout[];
  }[]>([]);
  const baseWireLayouts = useMemo(() => {
    const key = Number(lod);
    const previous = edgeLayouts.current[key];
    const reused = previous?.plan === wirePlan && previous.expanded === keepExpandedIds && previous.mode === prefs.wireRouting;
    const changed = new Set(wireScene.invalid);
    if (reused) {
      if (previous.scroll !== branchScroll) {
        for (const id of new Set([...previous.scroll.keys(), ...branchScroll.keys()])) {
          if (previous.scroll.get(id) !== branchScroll.get(id))
            for (const edge of wirePlan.attached.get(id) ?? []) changed.add(edge);
        }
      }
      for (const moves of [previous.moves, gesture?.nodes]) {
        for (const id of moves?.keys() ?? []) {
          if (previous.moves?.get(id) === gesture?.nodes?.get(id)) continue;
          for (const edge of wirePlan.attached.get(id) ?? []) changed.add(edge);
        }
      }
      if (!changed.size) return previous.layouts;
    }
    const layoutsById = reused ? new Map(previous.byId) : new Map<string, WireLayout>();
    for (const id of reused ? changed : wirePlan.edges.keys()) {
      const item = wirePlan.edges.get(id);
      if (!item) continue;
      const { edge, evState } = item;
      const from = endpoint(graphDocument, edge.source, edge.kind, "out", lod, keepExpandedIds, endpointIndex, edge.sourcePort);
      const to = endpoint(graphDocument, edge.target, edge.kind, "in", lod, keepExpandedIds, endpointIndex, edge.targetPort);
      const { geom, extent } = wireScene.cache.get(edge, from, to, prefs.wireRouting);
      layoutsById.set(id, { edge, from, geom, extent, evState });
    }
    const layouts = Array.from(wirePlan.edges.keys(), id => layoutsById.get(id)!);
    edgeLayouts.current[key] = { plan: wirePlan, scroll: branchScroll, expanded: keepExpandedIds, mode: prefs.wireRouting,
      moves: gesture?.nodes, byId: layoutsById, layouts };
    return layouts;
  }, [wirePlan, wireScene, graphDocument, endpointIndex, lod, keepExpandedIds, prefs.wireRouting, gesture?.nodes]);

  const wireLayouts = useMemo(() => {
    const wires = !hubSatByEdgeId.size ? baseWireLayouts : baseWireLayouts.map((wire) => {
      const { edge, from } = wire;
      const satellite = hubSatByEdgeId.get(edge.id);
      if (!satellite) return wire;
      const geom = route(from, satellite.wireIn, {
        kind: edge.kind,
        mode: prefs.wireRouting,
        obstacles: routingBoxes,
        waypoints: edge.waypoints,
      });
      return { ...wire, geom, extent: padded(pathExtent(geom.path), 72) };
    });
    const withLabels = padded(paintArea, 72);
    return wires.filter(wire => wire.edge.id === selection.edge || pathTouches(wire.geom, withLabels, wire.extent));
  }, [baseWireLayouts, hubSatByEdgeId, prefs.wireRouting, routingBoxes, paintArea, selection.edge]);

  const accessoryWires = useMemo(() => {
    const nodesById = new Map(doc.nodes.map((node) => [node.id, node]));
    return doc.nodes.flatMap((node) => {
      if (
        (node.kind !== "display" && node.kind !== "detail") || !node.sourceNodeId ||
        !isNodeVisible(node, true) || !isNodeVisible(nodesById.get(node.sourceNodeId), true)
      ) return [];
      const from = endpoint(graphDocument, node.sourceNodeId, "reference", "out", lod, keepExpandedIds, endpointIndex);
      const to = endpoint(graphDocument, node.id, "reference", "in", lod, keepExpandedIds, endpointIndex);
      if (from.groupId && from.groupId === to.groupId) return [];
      const { path, extent } = wireScene.cache.getPath(`source:${node.id}`, from, to, prefs.wireRouting, "reference");
      return [{ id: node.id, path, extent }];
    });
  }, [doc.nodes, graphDocument, isNodeVisible, keepExpandedIds, lod, prefs.wireRouting, wireScene, endpointIndex]);

  /* Command / @ Mention Palette Items */
  const paletteEntries = useMemo<PaletteEntry[]>(() => {
    if (!paletteDialog) return [];
    const targetId = paletteDialog.targetNodeId;
    const needle = paletteDialog.query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    if (!targetId) {
      const cmds: [string, string, () => void][] = [
        ["newAgent", "agent", () => createCanvasNode("agent")],
        ["newTeam", "team", () => setTeamPicker({})],
        [
          "existingSession",
          "chat",
          () => void bridge.sessions().then(setSessionModal).catch(reportError),
        ],
        ["newGit", "git", () => createCanvasNode("git")],
        ["newChanges", "diff", () => createCanvasNode("changes")],
        ["newFile", "file", () => createCanvasNode("file")],
        ["newTerminal", "term", () => createCanvasNode("terminal")],
        ["newNote", "note", () => createCanvasNode("note")],
        ["newBoard", "board", () => createCanvasNode("board")],
        [
          "runAll",
          "play",
          () => launchScope({ kind: "global", nodeIds: [] }),
        ],
        ["groupSelection", "group", groupSelected],
        [tidyLabel, "tidy", () => arrangeTopology()],
        ["fitView", "fit", () => fitView(false)],
        ["saveSnapshot", "clock", handleCaptureSnapshot],
        ["workflowLibrary", "box", () => setRouteName("workflows")],
        ["activity", "bolt", () => setRouteName("activity")],
        ["settings", "gear", () => setRouteName("settings")],
      ];
      for (const [key, glyph, fn] of cmds) {
        list.push({
          label: t(key),
          section: t("command"),
          icon: glyph,
          fn,
        });
      }
      for (const tpl of allTemplates(doc)) {
        list.push({
          label: tpl.builtin ? t(tpl.title) : tpl.title,
          detail: tpl.builtin ? t(tpl.description) : tpl.description,
          section: t("workflows"),
          icon: "canvas",
          fn: () => handleInstantiateTemplate(tpl),
        });
      }
    }

    for (const node of doc.nodes) {
      if (node.kind === "group") continue;
      if (targetId && node.id === targetId) continue;
      list.push({
        label: node.title,
        detail: node.kind.toUpperCase(),
        section: t("canvas"),
        icon: kindIconName(node.kind, node.flowType),
        fn: () => {
          if (!targetId) {
            revealNode(node.id);
            return;
          }
          if (node.kind === "agent") {
            edit((d) => {
              const tgt = d.nodes.find((x) => x.id === targetId);
              if (tgt && !d.edges.some(e => e.source === node.id && e.target === targetId))
                addWire(d, node, tgt, "continuation", { trigger: "off" });
              if (tgt) {
                tgt.draft = `${tgt.draft ? tgt.draft + " " : ""}@${node.title} `;
                tgt.task = tgt.draft;
              }
            });
          } else {
            connectNodes([node.id], [targetId], "reference");
            editNode(targetId, {
              draft: `${docRef.current.nodes.find((x) => x.id === targetId)?.draft ?? ""}@${node.title} `,
              task: `${docRef.current.nodes.find((x) => x.id === targetId)?.draft ?? ""}@${node.title} `,
            });
          }
        },
      });
    }

    if (targetId) {
      for (const filePath of workspaceFilesList) {
        list.push({
          label: filePath.split("/").pop() ?? filePath,
          detail: filePath,
          section: t("newFile"),
          icon: "file",
          fn: () => {
            const targetNode = docRef.current.nodes.find(
              (n) => n.id === targetId,
            );
            if (!targetNode) return;
            edit((d) => {
              /* M04: Only auto-wire if a File node for this path ALREADY exists on the canvas; otherwise keep inline @path without cluttering canvas! */
              const existingFileNode = d.nodes.find(
                (n) =>
                  n.kind === "file" &&
                  (n.text === filePath || n.selectedItems?.includes(filePath)),
              );
              if (existingFileNode) addWire(d, existingFileNode, targetNode, "reference");
              const tgt = d.nodes.find((x) => x.id === targetId);
              if (tgt) {
                tgt.draft = `${tgt.draft ? tgt.draft + " " : ""}@${filePath} `;
                if (!tgt.sessionId) tgt.task = tgt.draft;
              }
            });
          },
        });
      }
    }

    return list
      .filter(
        (item) =>
          !needle ||
          `${item.label} ${item.detail ?? ""} ${item.section}`
            .toLowerCase()
            .includes(needle),
      )
      .slice(0, 20);
  }, [
    paletteDialog,
    doc,
    workspaceFilesList,
    createCanvasNode,
    bridge,
    reportError,
    launchScope,
    groupSelected,
    arrangeTopology,
    tidyLabel,
    fitView,
    handleCaptureSnapshot,
    handleInstantiateTemplate,
    revealNode,
    edit,
    connectNodes,
    editNode,
    activeWorkspaceCwd,
  ]);

  /* Export / Import JSON */
  const downloadWorkflow = (name: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const handleExportJson = () => {
    const copy = structuredClone(docRef.current);
    const nodes = workflowNodes(copy);
    const staffedNodes = staffedIds(nodes);
    for (const node of nodes) {
      if (!isTeamNode(node, staffedNodes)) continue;
      delete node.sessionId;
      delete node.lastSubmittedTask;
    }
    const dependencies = teamDependenciesFor(nodes, snapshot);
    downloadWorkflow(copy.title || "flowspace", { ...copy,
      ...(dependencies.teams.length || dependencies.roles.length ? { dependencies } : {}) });
  };
  const handleExportTemplate = (template: WorkflowTemplate) => {
    const dependencies = teamDependenciesFor(template.nodes, snapshot);
    downloadWorkflow(template.title, { kind: "flowspace-template", version: 1, template, dependencies });
  };
  const finishImport = useCallback((savedDoc: FlowspaceDocument, template: boolean) => {
    docRef.current = savedDoc;
    setDoc(savedDoc);
    setWorkflowImport(undefined);
    setRouteName(template ? "workflows" : "canvas");
    if (template) setLibraryTab("mine");
    else setTimeout(() => fitView(true), 60);
    showToast(t("workflowImported"));
  }, [fitView, showToast]);
  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const parsed = JSON.parse(await file.text()) as FlowspaceDocument & {
          kind?: string; template?: WorkflowTemplate; dependencies?: TeamDependencies;
        };
        const request: WorkflowImportRequest = parsed.kind === "flowspace-template"
          ? { template: parsed.template, dependencies: parsed.dependencies }
          : { document: { ...parsed, version: 1, id: "main" }, dependencies: parsed.dependencies };
        await flush();
        if (request.dependencies || containsCodeNode(request) ||
            (request.template?.nodes ?? request.document?.nodes ?? []).some(node => node.flowType === "flowspace/trigger")) {
          setWorkflowImport({ request });
        } else {
          const result = await bridge.importWorkflow(request);
          if (result.kind === "imported") finishImport(result.document, !!request.template);
          else setWorkflowImport({ request, missing: result.models });
        }
      } catch (err) {
        reportError(err);
      }
    },
    [bridge, finishImport, flush, reportError],
  );

  /* Selected objects for Inspector & Header */
  const selectedNode = useMemo(() => {
    if (selection.groups.length === 1) {
      return doc.nodes.find((n) => n.id === selection.groups[0]);
    }
    if (selection.nodes.length === 1) {
      return doc.nodes.find((n) => n.id === selection.nodes[0]);
    }
    return undefined;
  }, [doc.nodes, selection]);

  const selectedEdge = useMemo(
    () =>
      selection.edge
        ? doc.edges.find((e) => e.id === selection.edge)
        : undefined,
    [doc.edges, selection.edge],
  );

  /** 2+ selected items feed the multi-select inspector (align / distribute / batch participation). */
  const selectedNodesList = useMemo(() => {
    const ids = new Set([...selection.nodes, ...selection.groups]);
    return ids.size >= 2 ? doc.nodes.filter((n) => ids.has(n.id)) : undefined;
  }, [doc.nodes, selection.nodes, selection.groups]);

  const hasRunnableSelection = useMemo(() => {
    if (selection.groups.length > 0) return true;
    return selection.nodes.some(
      (id) => doc.nodes.find((n) => n.id === id)?.kind === "agent",
    );
  }, [selection, doc.nodes]);

  const conversationFocusAgent = useMemo(() => {
    const explicit = doc.nodes.find(
      (n) => n.id === lastAgentId && n.kind === "agent",
    );
    return explicit ?? doc.nodes.find((n) => n.kind === "agent");
  }, [doc.nodes, lastAgentId]);
  const openTeamNode = teamNodeId ? doc.nodes.find((node) => node.id === teamNodeId && isTeamNode(node, staffed)) : undefined;

  const leftSnapped = doc.nodes.some((n) => n.window?.snap === "left");
  const rightSnapped = doc.nodes.some((n) => n.window?.snap === "right");

  const cardActions = useCardActions({ editNode, editEdge, edit, selectNode, showToast, openNodeContextMenu,
    startNodeMove, startResize, startPortDrag, startInputEdgeDrag, revealNode, openDetailCard, bindAgentSession,
    refreshProjectStructures, openAnchoredMenu, extractDisplayFrom, launchScope, toggleNodeForm, stopNode,
    returnWindow, openWindow, openInputHub, scheduleCloseInputHub, startStaffDrag,
    editBoard, createBoardCompanion, openBoardAgentMenu, openBoardMenu });
  // Seat ordering follows the positions of staffed roles. Other geometry previews only
  // change the moved card's own props and can reuse every unrelated card body.
  const movingStaff = gesture?.nodes && [...gesture.nodes.keys()].some(id => contentIndex.nodesById.get(id)?.staffOf);
  const crewNodes = movingStaff ? doc.nodes : baseDoc.nodes;
  /* Render a Single Node Card (used on Canvas, Floating Window, and Focused Conversation Surface) */
  const renderNodeCard = useCallback((
    node: FlowNode,
    placement: "canvas" | "window" | "conversation",
    snapshot: FlowspaceSnapshot | null,
    box: Box,
    semantic?: boolean,
    prewarmFull?: boolean,
    contentVersion?: object,
    branchOffset = 0,
  ) => {
    const nodesById = contentIndex.nodesById;
    const runtime = runtimeIndex(snapshot);
    const { editNode, editEdge, edit, selectNode, showToast, openNodeContextMenu, startNodeMove, startResize,
      startPortDrag, startInputEdgeDrag, revealNode, openDetailCard, bindAgentSession, refreshProjectStructures,
      openAnchoredMenu, extractDisplayFrom, launchScope, toggleNodeForm, stopNode, returnWindow, openWindow,
      openInputHub, scheduleCloseInputHub, startStaffDrag, editBoard, createBoardCompanion, openBoardAgentMenu, openBoardMenu } = cardActions;
    const awaiting = node.kind === "flow" ? runtime.awaiting.get(node.id) : undefined;
    const flowRun = node.kind === "flow" ? awaiting?.run ?? runtime.latestRun.get(node.id) : undefined;
    const breakpoint = runtime.breakpoints.get(node.id);
    const waitingHuman = awaiting?.step.human;
    const state = waitingHuman || breakpoint ? "waiting" : node.kind === "agent" || node.kind === "flow" ? nodeStatusOf(snapshot, node.id) : "";
    const waitingGates =
      node.kind === "agent" ? runtime.waiting.get(node.id) ?? [] : [];
    const live = runtime.live.get(node.id);
    const isSelected = selection.nodes.includes(node.id);
    const compact = placement === "canvas" && Boolean(box.compact);
    const masterHead = !!node.masterOf && !!edgeIndex.incoming.get(node.id)?.some(edge =>
      !edge.generatedBy && edge.kind === "continuation" && edge.source === node.masterOf);
    const laneItem = node.generatedBy && node.laneIndex !== undefined && node.itemTitle
      ? t("flow_lane_item_name", { n: node.laneIndex + 1, item: node.itemTitle }) : undefined;
    const heading = node.kind === "board" && !node.customTitle && (node.title === "任务看板" || node.title === "Task board")
      ? t("newBoard") : node.title;

    let style: React.CSSProperties | undefined;
    if (placement === "window" && node.window) {
      const aw = areaRef.current?.clientWidth || vpSize.width;
      const ah = areaRef.current?.clientHeight || vpSize.height;
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
      style = { ...style, ...hueStyle(node.teamModel ?? snapshot?.roles?.find((role) => role.id === node.roleRef)?.model) };
    }

    const dragDirection = connecting?.anchor.direction === "in" ? "out" : "in";
    const available = (kind: FlowEdge["kind"], portId: string) => connecting?.kind === kind &&
      !connecting.fromIds.includes(node.id) && connecting.fromIds.some(id => {
        const fixed = nodesById.get(id);
        return fixed && checkDraggedWire(fixed, node, kind, connecting.anchor, portId, docRef.current.edges).ok;
      });
    const renderPort = (kind: FlowEdge["kind"], direction: "in" | "out", portId: string = direction, label?: string) => {
      const input = direction === "in";
      const center = portY(node, kind, compact, portId, branchOffset, undefined, direction);
      const socketY = portY(node, kind, compact, portId, branchOffset, box.h, direction);
      if (socketY !== center) return null;
      const edges = (input ? edgeIndex.incoming : edgeIndex.outgoing).get(node.id) ?? [];
      const atPort = edges.filter(edge => edge.kind === kind && ((input ? edge.targetPort : edge.sourcePort) ?? direction) === portId);
      const incoming = input
        ? atPort.filter(edge => passesNodeFilter(nodesById.get(edge.source)))
        : [];
      const lastEdge = incoming.at(-1);
      const multi = incoming.length > 1;
      const linked = atPort.length > 0 || (kind === "reference" &&
        (input ? node.kind === "display" && !!node.sourceNodeId : contentIndex.referenceSources.has(node.id)));
      const fromHere = connecting?.fromIds.includes(node.id);
      const target = connecting && direction === dragDirection &&
        (available(kind, portId) || input && kind === "continuation" && available("event", portId));
      const name = label ?? (kind === "reference"
        ? t(input ? "refInput" : "refOutput")
        : t(input ? "contInput" : "contOutput"));
      const type = connectionPort(node, kind, direction, portId)?.dataType;
      const portName = type ? `${name} · ${t("flow_data_" + type)}` : name;
      const title = lastEdge ? `${portName} (${incoming.length}) · ${t("dragInputTip")}` : portName;
      return (
        <button
          type="button"
          key={`${kind}-${direction}-${portId}`}
          data-node-id={node.id}
          data-port-id={portId}
          data-port-kind={kind}
          data-port-direction={direction}
          className={[
            "port", `port-${kind}`, `port-${direction}`,
            linked && "is-linked",
            lastEdge && !connecting && "is-draggable-in",
            multi && "is-multi",
            multi && activeHubLayout?.nodeId === node.id && activeHubLayout.kind === kind && "is-hub-open",
            fromHere && connecting?.kind === kind && direction === (connecting.anchor.direction ?? "out") &&
              portId === ((input ? connecting.anchor.targetPort : connecting.anchor.sourcePort) ?? direction) && "is-dragging-origin",
            target && "port-target",
            target && connecting.snappedTarget?.nodeIds.includes(node.id) &&
              (connecting.snappedTarget.portId ?? direction) === portId && "is-snap-locked",
          ].filter(Boolean).join(" ")}
          style={{ "--port-y": `${socketY}px` } as React.CSSProperties}
          title={title}
          aria-label={title}
          onPointerEnter={() => {
            if (connecting || isDragging || !lastEdge) return;
            if (multi) openInputHub(node.id, kind);
            else setHoveredEdgeId(lastEdge.id);
          }}
          onPointerLeave={() => {
            if (multi) scheduleCloseInputHub();
            else if (lastEdge) setHoveredEdgeId(prev => prev === lastEdge.id ? null : prev);
          }}
          onPointerDown={ev => {
            if (input && lastEdge) startInputEdgeDrag(ev, lastEdge);
            else if (connectionPort(node, kind, direction, portId)) startPortDrag(ev, [node.id], kind, undefined, undefined, portId, direction);
          }}
        >
          {multi
            ? <span className="port-multi-count">{incoming.length}</span>
            : <PortMark kind={kind} />}
        </button>
      );
    };

    const activeTab: AgentTab = node.tab ?? "task";
    const nodeSteps = runtime.steps.get(node.id) ?? [];
    const missingEmission = runtime.missingEmissions.get(node.id);
    const emissionReminder = (compactView: boolean) => missingEmission && <button type="button"
      className={compactView ? "text-button compact-overview-detail" : "button button-quiet"}
      title={t("flow_emit_missing")}
      onClick={event => {
        event.stopPropagation();
        void bridge.remindEmission(missingEmission.runId, missingEmission.step.id).catch(reportError);
      }}>{t("flow_emit_remind")}</button>;
    const latestOutput =
      live?.output || nodeSteps.filter((s) => s.output).at(-1)?.output || "";
    const incomingRefs = (edgeIndex.incoming.get(node.id) ?? []).filter(
      (e) => e.kind === "reference" && e.target === node.id,
    );
    const hasForkInbound = edgeIndex.incoming.get(node.id)?.some(
      (e) => e.target === node.id && e.mode === "fork",
    );

    const renderCompactBody = () => {
      if (node.kind === "flow") {
        const { Compact } = viewOf(node.flowType);
        const kindTitle = t(descriptorOf(node.flowType)?.titleKey ?? "flow_view_missing");
        const detail = <Compact node={node} run={flowRun} doc={docRef.current} snapshot={snapshot} bridge={bridge} />;
        // Same frames as the built-in tool cards: a kind label at semantic zoom, an inset summary line otherwise.
        return semantic
          ? <div className="compact-overview"><span className="compact-kind">{kindTitle}</span>{detail}</div>
          : <div className="compact-tool fs-flow-compact">{detail}{node.customTitle && <span>{kindTitle}</span>}</div>;
      }
      if (node.kind === "board") {
        return <BoardCompactSummary columns={normalizeBoardColumns(node.columns)} semantic={semantic} />;
      }
      if (semantic && node.kind !== "agent") {
        let detail = "";
        let detailStatus = "";
        switch (node.kind) {
          case "note":
            detail = node.text.trim().split("\n")[0];
            break;
          case "display":
            detail = t(node.fixed ? "fixed" : "follow");
            break;
          case "file":
            detail = t("selectedCount", { count: node.selectedItems?.length || (node.text ? 1 : 0) });
            break;
          case "git":
            detail = node.branch ?? "";
            break;
          case "changes":
            detail = node.changesTurn ? `#${node.changesTurn}` : "";
            break;
          case "detail":
            detailStatus = node.sourceNodeId ? nodeStatusOf(snapshot, node.sourceNodeId) : "draft";
            detail = t(detailStatus);
            break;
          case "role":
            detail = staffTeam?.title ?? node.teamModel?.model ?? "";
            break;
        }
        return <div className="compact-overview">
          <span className="compact-kind">{t(`nodeKind_${node.kind}`)}</span>
          {detail && <span className={`compact-overview-detail ${detailStatus ? `status status-${detailStatus}` : "user-content"}`}
            title={detail}>{detailStatus && <i />}{detail}</span>}
        </div>;
      }
      if (node.kind === "agent") {
        const wsName =
          workspaces.find((w) => w.id === node.workspaceId)?.name ||
          node.cwd?.split(/[\\/]/).filter(Boolean).pop() ||
          t("currentWorkspace");
        const summary = waitingGates.length
          ? `${waitingGates[0].token.source.title} → ${t("waitingConfirmation")}`
          : node.draft.trim() ||
            (state === "draft"
              ? node.task || t("taskPlaceholder")
              : latestOutput || node.task);
        return (
          <>
            <div className="compact-status">
              <span className="compact-kind">{t(isTeam ? "teamLibrary" : "nodeKind_agent")}</span>
              <span className={`status status-${state}`}>
                <i />
                {t(state)}
              </span>
              {emissionReminder(true) || (team ? <small className="fs-team-node-summary">
                <span title={t("teamCapacity", team.capacity)} aria-label={t("teamCapacity", team.capacity)}>
                  {team.capacity.active > 0 ? <i className="fs-team-node-dot" aria-hidden="true" /> : <Icon name="person" />}
                  {team.capacity.active}/{team.capacity.max}
                </span>
                <span title={t("teamTaskProgress", { done: completedTasks, total: team.tasks.length })}
                  aria-label={t("teamTaskProgress", { done: completedTasks, total: team.tasks.length })}>
                  <Icon name="board" />{completedTasks}/{team.tasks.length}
                </span>
              </small> : <span>{wsName}</span>)}
            </div>
            <p className="compact-summary user-content">{summary}</p>
            {waitingGates.length > 0 && (
              <button
                type="button"
                className="compact-release"
                onClick={(e) => {
                  e.stopPropagation();
                  void bridge
                    .release(
                      waitingGates[0].run.id,
                      waitingGates[0].token.id,
                      true,
                    )
                    .catch(reportError);
                }}
              >
                <Icon name="play" />
                <span>{t("release")}</span>
              </button>
            )}
            <div
              className={`progress-line ${state === "running" ? "is-running" : ""}`}
            >
              <i />
            </div>
          </>
        );
      }
      if (node.kind === "role") return <RoleNodeSummary node={node} team={staffTeam} snapshot={snapshot}
        members={roleMembers} onOpenMember={openRoleMember} />;
      if (node.kind === "note" || node.kind === "display") {
        return (
          <>
            <p className="compact-summary user-content">
              {node.text ||
                t(node.kind === "note" ? "notePlaceholder" : "noOutput")}
            </p>
            {node.kind === "display" && (
              <span className="compact-display-mode">
                {t(node.fixed ? "fixed" : "follow")}
              </span>
            )}
          </>
        );
      }
      if (node.kind === "detail") {
        const srcState = node.sourceNodeId
          ? nodeStatusOf(snapshot, node.sourceNodeId)
          : "draft";
        return (
          <div className="compact-tool">
            <span className={`status status-${srcState}`}>
              <i />
              {t(srcState)}
            </span>
            <span>{t("executionDetail")}</span>
          </div>
        );
      }
      if (node.kind === "git") {
        const firstLine = node.text.split("\n")[0] || node.branch || "Git";
        return (
          <div className="compact-tool">
            <span className="user-content">{firstLine}</span>
            <span>{t("git")}</span>
          </div>
        );
      }
      if (node.kind === "changes") {
        const turnTag = node.changesTurn
          ? `Turn #${node.changesTurn}`
          : node.text.split("\n")[0] || t("changes");
        return (
          <div className="compact-tool">
            <span className="user-content">{turnTag}</span>
            <span>{t("changes")}</span>
          </div>
        );
      }
      if (node.kind === "terminal") {
        const tailLine =
          node.text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .at(-1) || t("terminal");
        return (
          <div className="compact-tool">
            <span className="user-content">{tailLine}</span>
            <span>{t("terminal")}</span>
          </div>
        );
      }
      const count = node.selectedItems?.length || (node.text ? 1 : 0);
      return (
        <div className="compact-tool">
          <span>{node.text.split("\n")[0] || t("newFile")}</span>
          <span>{t("selectedCount", { count })}</span>
        </div>
      );
    };

    const renderFullBody = () => {
      if (node.kind === "flow") {
        const { Full } = viewOf(node.flowType);
        return <Full node={node} run={flowRun} doc={docRef.current} snapshot={snapshot} bridge={bridge} />;
      }
      const bodyBox = placement === "canvas" ? nodeBox(node, false, true) : box;
      if (node.kind === "git") {
        return (
          <GitNodeBody
            node={node}
            bridge={bridge}
            onEditNode={editNode}
            onPromptForm={setFormModal}
            onExtractDisplay={(title, text) => {
              const box = nodeBox(node);
              const disp: FlowNode = {
                ...newNode("display", bodyBox.x + bodyBox.w + 36, bodyBox.y, title),
                sourceNodeId: node.id,
                text,
                fixed: true,
                expanded: true,
              };
              edit((d) => d.nodes.push(disp));
              selectNode(disp.id);
              showToast(t("nodeCreated"));
            }}
            onError={reportError}
            onRefreshStructure={refreshProjectStructures}
          />
        );
      }
      if (node.kind === "changes") {
        return (
          <ChangesNodeBody
            node={node}
            doc={doc}
            snapshot={snapshot}
            bridge={bridge}
            onEditNode={editNode}
            onExtractDisplay={(title, text) => {
              const box = nodeBox(node);
              const disp: FlowNode = {
                ...newNode("display", bodyBox.x + bodyBox.w + 36, bodyBox.y, title),
                sourceNodeId: node.id,
                text,
                fixed: true,
                expanded: true,
              };
              edit((d) => d.nodes.push(disp));
              selectNode(disp.id);
              showToast(t("nodeCreated"));
            }}
            onError={reportError}
          />
        );
      }
      if (node.kind === "terminal") {
        return (
          <TerminalNodeBody
            node={node}
            doc={doc}
            bridge={bridge}
            onEditNode={editNode}
            onExtractDisplay={(title, text) => {
              const box = nodeBox(node);
              const disp: FlowNode = {
                ...newNode("display", bodyBox.x + bodyBox.w + 36, bodyBox.y, title),
                sourceNodeId: node.id,
                text,
                fixed: true,
                expanded: true,
              };
              edit((d) => d.nodes.push(disp));
              selectNode(disp.id);
              showToast(t("nodeCreated"));
            }}
            onError={reportError}
          />
        );
      }

      if (node.kind === "role") {
        return <RoleNodeBody node={node} team={staffTeam} snapshot={snapshot} routes={modelRoutes}
          running={roleRunning} members={roleMembers} onOpenMember={openRoleMember}
          onEdit={(patch) => editNode(node.id, patch)} />;
      }

      if (node.kind === "agent") {
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
            ? doc.settings.nativeChatTriggers
            : node.nativeTrigger === "enabled";
        const queuedCount = nodeSteps.filter((s) => s.state === "queued").length;
        const hasActiveInboundContinuation = edgeIndex.incoming.get(node.id)?.some(
          (e) =>
            e.kind === "continuation" &&
            e.target === node.id &&
            e.trigger !== "off",
        );

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
                  const capState = capsuleStateOf(
                    refEdge,
                    snapshot?.sourceVersions,
                  );
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
                                  fn: () =>
                                    editEdge(refEdge.id, { sentVersion: "" }),
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
                                d.edges = d.edges.filter(
                                  (x) => x.id !== refEdge.id,
                                );
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
        const tabs: AgentTab[] = isTeam ? ["task", "conversation", "execution", "crew"] : ["task", "conversation", "execution"];
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
              {emissionReminder(false)}
              {!node.sessionId && (
                <button
                  type="button"
                  className={`fs-plan-chip ${node.planMode ? "active" : ""}`}
                  onClick={() =>
                    editNode(node.id, { planMode: !node.planMode })
                  }
                >
                  {t("planMode")}
                </button>
              )}
              {isTeamNode(node, staffed) && (
                <button type="button" className="fs-plan-chip fs-team-enter" onClick={() => openTeam(node.id)}>
                  <Icon name="team" /><span>{t("teamEnter")}</span><Icon name="chev" />
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
              <div
                className="node-tabs"
                role="tablist"
                aria-label={node.title}
              >
                {tabs.map(
                  (tb) => (
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
                      {tb === "crew" && teamSlots.length > 0 && <span>{teamSlots.length}</span>}
                      {tb === "execution" && nodeSteps.length > 0 && (
                        <span>{nodeSteps.length}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}

            {waitingGates.map(({ run, token }) => (
              <div className="approval-box fs-card-top-gate" key={token.id}>
                <span className="approval-heading">
                  <Icon name="pause" />
                  <b>
                    {t(
                      token.boundary ? "scopeBoundary" : "waitingConfirmation",
                    )}
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
                      void bridge
                        .release(run.id, token.id, true)
                        .catch(reportError)
                    }
                  >
                    <Icon name="play" />
                    <span>{t("release")}</span>
                  </button>
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() =>
                      void bridge
                        .release(run.id, token.id, false)
                        .catch(reportError)
                    }
                  >
                    <span>{t("dismiss")}</span>
                  </button>
                </div>
              </div>
            ))}

            {effectiveTab === "crew" ? (
              <CrewFrame node={node} nodes={crewNodes} snapshot={snapshot} status={state} routes={modelRoutes}
                onEditTeam={(teamConfig) => editNode(node.id, { teamConfig })}
                onLayout={(teamLayout) => editNode(node.id, { teamLayout })}
                onOpen={(rowId) => openTeam(node.id, rowId)} />
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
                  {quoteState?.nodeId === node.id && (
                    <div className="quote-selection-bar">
                      <span>{t("quoteSelection")}</span>
                      <div>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            extractDisplayFrom(
                              node.id,
                              quoteState.text,
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
                    <div
                      key={step.id}
                      className={`event-row event-${step.state}`}
                    >
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
                            extractDisplayFrom(
                              node.id,
                              latestOutput,
                              live?.seq,
                              true,
                            )
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
                        (p) =>
                          p.id === (node.workspaceId || activeWorkspaceId),
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
                          checked:
                            node.workspaceId === w.id && !node.branch,
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
                                description:
                                  br.worktreePath || t("createWorktree"),
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
                                state: doc.settings.nativeChatTriggers
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
                        {t(
                          node.sessionId && state !== "draft" ? "rerun" : "run",
                        )}
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

      if (node.kind === "file") {
        const knownPaths = [
          ...new Set([
            ...(node.items ?? []),
            ...node.text
              .split("\n")
              .map((p) => p.trim())
              .filter(Boolean),
            ...workspaceFilesList,
          ]),
        ];
        const selectedSet = new Set(
          node.selectedItems?.length
            ? node.selectedItems
            : node.text
                .split("\n")
                .map((p) => p.trim())
                .filter(Boolean),
        );
        const draftVal = fileInputDrafts[node.id] ?? "";
        const togglePath = (filePath: string) => {
          const next = new Set(selectedSet);
          if (next.has(filePath)) next.delete(filePath);
          else next.add(filePath);
          const arr = [...next];
          editNode(node.id, {
            selectedItems: arr,
            text: arr.join("\n"),
            title:
              arr.length === 1
                ? arr[0].split("/").pop() ?? node.title
                : node.title,
          });
        };
        return (
          <div className="tool-body">
            <div className="tool-summary">{t("filesDescription")}</div>
            <div className="file-input-bar">
              <input
                placeholder={t("filePathPlaceholder")}
                value={draftVal}
                onChange={(e) =>
                  setFileInputDrafts((prev) => ({
                    ...prev,
                    [node.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draftVal.trim()) {
                    const p = draftVal.trim();
                    const arr = [...new Set([...selectedSet, p])];
                    editNode(node.id, {
                      items: [...new Set([p, ...(node.items ?? [])])],
                      selectedItems: arr,
                      text: arr.join("\n"),
                    });
                    setFileInputDrafts((prev) => ({ ...prev, [node.id]: "" }));
                  }
                }}
              />
            </div>
            <div className="file-tree">
              {knownPaths.map((fp) => {
                const checked = selectedSet.has(fp);
                return (
                  <div
                    key={fp}
                    className={`file-row ${checked ? "selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="file-select"
                      aria-pressed={checked}
                      onClick={() => togglePath(fp)}
                    >
                      <i className="checkbox" />
                      <Icon name="file" />
                      <span title={fp}>{fp}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title={t("openFile")}
                      onClick={() =>
                        void bridge
                          .readWorkspaceFile(fp, node.cwd || activeWorkspaceCwd)
                          .then(setFileModal)
                          .catch(reportError)
                      }
                    >
                      <Icon name="pop" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="tool-footer">
              {t("selectedCount", { count: selectedSet.size })}
            </div>
          </div>
        );
      }

      if (node.kind === "note") {
        return (
          <textarea
            className="note-editor user-content"
            aria-label={node.title}
            placeholder={t("notePlaceholder")}
            value={node.text}
            onFocus={() => setEditingNodeId(node.id)}
            onBlur={() => setEditingNodeId(null)}
            onChange={(e) => editNode(node.id, { text: e.target.value })}
          />
        );
      }

      if (node.kind === "display") {
        return (
          <>
            <div className="display-content user-content">
              {node.text || t("noOutput")}
            </div>
            <footer className="display-footer">
              <button
                type="button"
                className="display-mode"
                onClick={() =>
                  editNode(node.id, {
                    fixed: !node.fixed,
                    text:
                      node.fixed && node.sourceNodeId
                        ? snapshot?.live.find(
                            (l) => l.nodeId === node.sourceNodeId,
                          )?.output || node.text
                        : node.text,
                  })
                }
              >
                <Icon name={node.fixed ? "pin" : "undo"} />
                <span>{t(node.fixed ? "fixed" : "follow")}</span>
              </button>
              <button
                type="button"
                className="text-button"
                disabled={
                  !node.sourceNodeId ||
                  !nodesById.has(node.sourceNodeId)
                }
                onClick={() =>
                  node.sourceNodeId && revealNode(node.sourceNodeId)
                }
              >
                <Icon name="chev" />
                <span>{t("viewSource")}</span>
              </button>
            </footer>
          </>
        );
      }

      if (node.kind === "detail") {
        const srcNode = node.sourceNodeId ? nodesById.get(node.sourceNodeId) : undefined;
        const srcState = node.sourceNodeId
          ? nodeStatusOf(snapshot, node.sourceNodeId)
          : "draft";
        const srcSteps =
          snapshot?.runs
            .flatMap((r) => r.steps)
            .filter((s) => s.nodeId === node.sourceNodeId) ?? [];
        const liveText = node.pinned
          ? node.text
          : (node.sourceNodeId &&
              snapshot?.live.find((l) => l.nodeId === node.sourceNodeId)
                ?.output) ||
            srcSteps.filter((s) => s.output).at(-1)?.output ||
            node.text;
        return (
          <>
            <div className="detail-summary">
              <span className={`status status-${srcState}`}>
                <i />
                {t(srcState)}
              </span>
              <span>{srcNode?.title ?? ""}</span>
            </div>
            <div className="node-scroll">
              {[...srcSteps].reverse().map((step) => (
                <div
                  key={step.id}
                  className={`event-row event-${step.state}`}
                >
                  <i className="event-dot">
                    <Icon
                      name={step.state === "completed" ? "check" : "bolt"}
                    />
                  </i>
                  <div>
                    <b>
                      {t(step.state)} ·{" "}
                      {t("roundBadge", { round: step.iteration })}
                    </b>
                  </div>
                  <time>{formatTime(step.createdAt)}</time>
                </div>
              ))}
              <div className="detail-result user-content">
                {liveText || t("noEvents")}
              </div>
            </div>
            <footer className="display-footer">
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  editNode(node.id, {
                    pinned: !node.pinned,
                    fixed: !node.pinned,
                    text: liveText,
                  })
                }
              >
                <Icon name="pin" />
                <span>{t(node.pinned ? "unpinDetail" : "pinDetail")}</span>
              </button>
              {srcNode && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => revealNode(srcNode.id)}
                >
                  <Icon name="chev" />
                  <span>{t("viewSource")}</span>
                </button>
              )}
            </footer>
          </>
        );
      }

      if (node.kind === "board") {
        const linkedCards = new Set((edgeIndex.outgoing.get(node.id) ?? []).flatMap((edge) =>
          edge.kind === "reference" && edge.sourceItemKey !== undefined ? [edge.sourceItemKey] : [],
        ));
        return <BoardNodeView node={node} linkedCards={linkedCards}
          onEdit={(change) => editBoard(node.id, change)}
          onMenu={openBoardMenu}
          onDispatch={(cardId) => createBoardCompanion(node.id, cardId, "agent")}
          onConvertNote={(cardId) => createBoardCompanion(node.id, cardId, "note")}
          onLinkAgent={(cardId, anchor) => openBoardAgentMenu(node.id, cardId, anchor)}
          onDragReference={placement === "canvas"
            ? (event, cardId, onStart) => startPortDrag(event, [node.id], "reference", cardId, onStart)
            : undefined}
          onCopy={(text) => void navigator.clipboard.writeText(text).then(() => showToast(t("copied"))).catch(reportError)} />;
      }
      return null;
    };

    const roleText = node.roleLabel
      ? dictRoleLabel(node.roleLabel)
      : undefined;
    const isTeam = isTeamNode(node, staffed);
    const team = node.sessionId ? snapshot?.teams?.[node.sessionId] : undefined;
    const blueprint = node.teamRef
      ? snapshot?.teamBlueprints?.find((team) => team.id === node.teamRef?.teamId)
      : undefined;
    const teamModel = team?.leadModel ?? blueprint?.lead.model ?? node.teamConfig?.model;
    const completedTasks = team?.tasks.filter((task) => task.status === "completed").length ?? 0;
    const teamSlots = isTeam ? team?.slots ?? draftSlots(node, crewNodes, snapshot) : [];
    const teamSlotCount = t("teamSlotCount", { count: teamSlots.length });
    const teamStack = teamSlots.map((slot) => ({ key: slot.slotId, label: slot.label, model: slot.model.model ? slot.model : undefined }));
    const staffOwner = node.kind === "role" && node.staffOf ? nodesById.get(node.staffOf) : undefined;
    const staffTeam = isTeamNode(staffOwner, staffed) ? staffOwner : undefined;
    const staffRuntime = staffTeam?.sessionId ? snapshot?.teams?.[staffTeam.sessionId] : undefined;
    const staffSlot = staffRuntime?.slots.find((slot) => slot.nodeId === node.id)?.slotId;
    const roleRunning = !!staffSlot && !!staffRuntime?.members.some((member) => member.slotId === staffSlot && member.activity === "running");
    const roleMembers = staffRuntime?.members.filter((member) => member.nodeId === node.id) ?? [];
    const openRoleMember = (sessionId: string) => { if (node.staffOf) openTeam(node.staffOf, sessionId); };
    // Native children that hang in this agent's own row: everything but members shown on role nodes.
    const onRole = new Set(team?.members.flatMap((member) =>
      member.nodeId && nodesById.get(member.nodeId)?.staffOf === node.id ? [member.sessionId] : []));
    const rowChildren = node.kind === "agent" && node.sessionId ? new Set([
      ...(snapshot?.subagents ?? []).filter((sub) => sub.parentSessionId === node.sessionId).map((sub) => sub.sessionId),
      ...(team?.members.filter((member) => member.depth === 1).map((member) => member.sessionId) ?? []),
    ].filter((id) => !onRole.has(id))).size : 0;
    const renderStaffPort = () => (
      <button type="button" className="fs-staff-port" data-staff-team={node.id}
        title={t("teamStaffPort")} aria-label={t("teamStaffPort")}
        onPointerDown={(ev) => startStaffDrag(ev, { teamId: node.id })}>
        <Icon name="person" />
        {teamSlots.length > 0 && <small>{teamSlots.length}</small>}
      </button>
    );
    const renderStaffSocket = () => (
      <button type="button" className="fs-staff-socket" data-staff-role={node.id} data-staffed={staffTeam ? "" : undefined}
        data-staff-id={node.id} title={t("teamStaffSocket")} aria-label={t("teamStaffSocket")}
        onPointerDown={(ev) => startStaffDrag(ev, { roleId: node.id })}>
        <i />
      </button>
    );

    return (
      <section
        key={`${placement}-${node.id}`}
        data-node-card={node.id}
        data-fs-semantic={semantic || undefined}
        data-staff-id={node.kind === "role" ? node.id : undefined}
        data-staff-target={staffDrag && node.id !== (staffDrag.roleId ?? staffDrag.teamId) &&
          node.kind === (staffDrag.roleId ? "agent" : "role") ? "" : undefined}
        data-staff-snap={staffTarget === node.id ? "" : undefined}
        data-children={rowChildren > 0 && node.subAgentsExpanded !== false ? "" : undefined}
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
          connecting?.fromIds.includes(node.id) ? "is-dragging-source" :
            connecting && !wirePortIds(node, connecting.kind, dragDirection).some(id => available(connecting.kind, id)) ? "is-invalid-target" : "",
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
        data-flow-family={node.kind === "flow" ? descriptorOf(node.flowType)?.family : undefined}
        data-flow-operation={node.flowType === "flowspace/exec-terminal" ? "terminal" : node.flowType === "flowspace/exec-git" ? "git" : undefined}
        data-participation={
          node.kind === "agent" ? node.participation : undefined
        }
        onFocusCapture={ev => {
          if ((ev.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) setEditingNodeId(node.id);
        }}
        onBlurCapture={ev => {
          if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
            setEditingNodeId(current => current === node.id ? null : current);
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
            openAnchoredMenu(
              { x: ev.clientX, y: ev.clientY },
              [
                {
                  label: t("quoteSelection"),
                  icon: "quote",
                  fn: () =>
                    extractDisplayFrom(node.id, selText, live?.seq, true),
                },
              ],
            );
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
          {isTeam ? <button type="button" className="node-avatar fs-team-avatar" title={t("teamEnter")}
            aria-label={t("teamEnter")} style={hueStyle(teamModel)} onClick={() => openTeam(node.id)}><Icon name="team" /></button>
            : node.kind === "role" ? <span className="node-avatar fs-role-avatar">
              <TeamAvatar label={node.title} seed={staffSlot ?? node.slotId ?? node.title}
                model={node.teamModel ?? snapshot?.roles?.find((role) => role.id === node.roleRef)?.model}
                size="sm" tone={roleRunning ? "running" : staffTeam ? "ready" : "idle"} active={roleRunning} />
            </span>
            : <span
            className={`node-avatar ${node.kind === "agent" ? "agent-avatar" : ""}`}
          >
            <Icon name={kindIconName(node.kind, node.flowType)} />
          </span>}
          <div className="node-heading">
            {node.kind === "role" && !compact ? (
              <input className="fs-role-title" value={node.title} aria-label={t("teamRoleName")}
                placeholder={t("teamRoleUntitled")} spellCheck={false}
                onFocus={() => setEditingNodeId(node.id)} onBlur={() => setEditingNodeId(null)}
                onChange={(ev) => editNode(node.id, { title: ev.target.value, customTitle: true })} />
            ) : <strong title={laneItem ? heading + " · " + laneItem : heading}>{compact && laneItem ? laneItem : heading}</strong>}
            {laneItem && !compact ? <small title={laneItem}>{laneItem}</small> : waitingHuman?.deadline !== undefined ? <FlowCountdown deadline={waitingHuman.deadline} /> : node.kind === "role" ? !compact && <small>{t("role")}</small> : isTeam ? !(team && compact) && <small className="fs-team-node-summary">
              <span title={teamSlotCount}>{teamStack.length > 0 && <AvatarStack items={teamStack} max={4} />}{teamSlotCount}</span>
              {teamModel && <span><ModelChip model={teamModel} quiet /></span>}
            </small> : !compact && roleText && <small>{roleText}</small>}
          </div>
          {(masterHead || node.generatedBy) &&
            <LaneBadges node={node} master={masterHead} unused={hasUnusedResult(snapshot?.runs, node)} />}
          {node.kind === "flow" && state === "skipped" &&
            <span className="status status-skipped"><i />{t("flow_skipped")}</span>}
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
            {node.kind === "agent" && (state === "running" || state === "settling") && (
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
                        snap: node.window?.snap === "max" ? undefined : "max",
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

        {node.breakpoint && <span title={t("flow_bp_title")} className="fs-bp-marker" />}
        {breakpoint && !compact && <Breakpoint run={breakpoint.run} step={breakpoint.step} bridge={bridge} />}
        <CardBody compact={compact}
          preserve={placement === "canvas" && node.expanded && !node.pinned}
          prewarmFull={prewarmFull}
          contentVersion={contentVersion}
          full={renderFullBody} summary={renderCompactBody} />
        {node.flowType === "flowspace/trigger" && node.config?.mode !== "launchpad" && <button
          className="switch fs-trig-enable" type="button" role="switch" aria-label={t("flow_trig_enabled")}
          aria-checked={!!node.config?.enabled} onClick={() => editNode(node.id, { config: { ...node.config, enabled: !node.config?.enabled } })} />}

        {placement === "canvas" && node.kind !== "detail" && node.kind !== "role" && (
          <>
            {node.kind === "flow" && portsOf(node).map(port => port.role !== "event" &&
              renderPort(port.role, port.direction, port.id, port.label ?? (port.labelKey ? t(port.labelKey) : port.id)))}
            {node.kind !== "flow" && connectionPort(node, "continuation", "in") && renderPort("continuation", "in")}
            {node.kind === "agent" && renderPort("continuation", "out")}
            {(node.kind === "agent" || node.kind === "display") && renderPort("reference", "in")}
            {node.kind !== "flow" && renderPort("reference", "out")}
            {hasStatusPort(node.kind, node.flowType, !!node.fanout) && <button type="button"
              className={`port fs-evt-port ${edgeIndex.outgoing.get(node.id)?.some(edge => edge.kind === "event") ? "is-linked" : ""}`}
              data-node-id={node.id} data-port-id="out" data-port-kind="event" data-port-direction="out"
              title={t("flow_evt_port")} aria-label={t("flow_evt_port")}
              onPointerDown={event => startPortDrag(event, [node.id], "event")} />}
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
  }, [doc.settings, crewNodes, contentIndex, cardActions, edgeIndex, selection.nodes, vpSize, workspaces,
    bridge, reportError, quoteState, renderConversation, onPresenceChange, projectStructures, activeWorkspaceId,
    workspaceFilesList, fileInputDrafts, activeWorkspaceCwd, passesNodeFilter, activeHubLayout, connecting, isDragging, languageRevision, openTeam,
    staffDrag, staffTarget, modelRoutes, staffed]);

  /* Workspace groupings for Left Explorer Sidebar */
  const sidebarWorkspaceBuckets = useMemo(() => {
    const list: { key: string; name: string; agents: FlowNode[] }[] = [];
    const agents = baseDoc.nodes.filter((n) => n.kind === "agent");
    for (const ws of workspaces) {
      list.push({
        key: ws.id,
        name: ws.name,
        agents: agents.filter((a) => a.workspaceId === ws.id),
      });
    }
    const unbound = agents.filter(
      (a) => !a.workspaceId || !workspaces.some((w) => w.id === a.workspaceId),
    );
    if (unbound.length || !list.length) {
      list.unshift({
        key: "__default__",
        name: t("currentWorkspace"),
        agents: unbound,
      });
    }
    return list.filter((b, i) => i === 0 || b.agents.length > 0 || workspaces.length > 0);
  }, [baseDoc.nodes, workspaces, languageRevision]);

  const sidebarFocus = routeName === "conversation" ? conversationFocusAgent?.id : undefined;
  const sidebarAgents = useMemo(() => new Map(sidebarWorkspaceBuckets.map(({ key, agents }) => [key,
    agents.map((agent) => {
      const state = nodeStatusOf(snapshot, agent.id);
      const selected = selection.nodes.includes(agent.id) || sidebarFocus === agent.id;
      return (
        <button
          key={agent.id}
          type="button"
          className={`sidebar-agent ${selected ? "selected" : ""} ${!passesNodeFilter(agent) ? "agent-hidden" : ""}`}
          onClick={() => {
            setLastAgentId(agent.id);
            cardActions.revealNode(agent.id);
          }}
        >
          <i className={`status-dot status-${state}`} />
          <span className="user-content">{agent.title}</span>
          {(state === "waiting" || state === "input") && <small>{t("confirm")}</small>}
          {state === "draft" && <small>{t("draft")}</small>}
        </button>
      );
    }),
  ])), [sidebarWorkspaceBuckets, snapshot, selection.nodes, sidebarFocus, passesNodeFilter, cardActions, languageRevision]);

  if (replayRun) {
    const frame = replayAt(replayRun, replayTime);
    const projected: FlowspaceSnapshot = { document: { ...doc, ...frame.graph }, runs: [frame], live: [],
      variables: snapshot?.variables?.map(variable => {
        const logs = variable.history.filter(write => write.at <= replayTime);
        const current = logs.at(-1);
        return { ...variable, history: logs, version: current?.version ?? 0, value: current?.to ?? variable.history[0]?.from ?? variable.value };
      }) };
    const nodes = frame.graph.nodes.filter(node => node.kind !== "group" && !node.removed);
    const boxes = new Map(nodes.map(node => [node.id, nodeBox(node, true)]));
    const focus = frame.steps.findLast(step => ["running", "awaiting"].includes(step.state)) ?? frame.steps.at(-1);
    const focusBox = focus && boxes.get(focus.nodeId);
    const camera = focusBox ? { x: (vpSize.width || 960) / 2 - (focusBox.x + focusBox.w / 2) * .8,
      y: (vpSize.height || 640) / 2 - (focusBox.y + focusBox.h / 2) * .8, zoom: .8 }
      : fit({ width: vpSize.width || 960, height: vpSize.height || 640 }, [...boxes.values()]);
    return <div className="fs-root fs-replay-mode" data-theme={displayedTheme} data-perf-tier={reducedMotion ? "L1" : "L3"}>
      <div className="fs-replay-banner"><Icon name="replay" />{t("flow_replay_readonly")} · {replayRun.title}</div>
      <div className="fs-viewport fs-replay-scene" ref={element => { if (element) element.inert = true; }}>
        <div className="fs-camera" style={{ transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})` }}>
          <div className="fs-world">
            <svg className="fs-edges-svg fs-replay-wires" aria-hidden="true">
              {frame.graph.edges.map(edge => {
                const a = boxes.get(edge.source), b = boxes.get(edge.target);
                if (!a || !b) return null;
                const token = frame.tokens.findLast(token => token.edgeId === edge.id);
                const y1 = a.y + 21, y2 = b.y + 21;
                const bend = Math.max(40, (b.x - a.x - a.w) / 2);
                return <path className={`edge-path edge-${edge.kind} ${token?.skip ? "edge-state-skipped" : token ? "edge-state-done" : ""}`}
                  key={edge.id} d={`M ${a.x + a.w} ${y1} C ${a.x + a.w + bend} ${y1}, ${b.x - bend} ${y2}, ${b.x} ${y2}`} />;
              })}
            </svg>
            {nodes.map(node => <div className="fs-card-slot" key={node.id}>
              {renderNodeCard(node, "canvas", projected, boxes.get(node.id)!, true)}
            </div>)}
          </div>
        </div>
      </div>
      <ReplayDock run={replayRun} time={replayTime} setTime={setReplayTime} exit={() => setReplayRun(undefined)} />
    </div>;
  }

  return (
    <CanvasPreviewContext.Provider value={dataPreviews}><div
      ref={rootRef}
      className="fs-root"
      data-theme={displayedTheme}
      data-perf-tier={reducedMotion ? "L1" : "L3"}
    >
      {/* ---------- Left Navigation Icon Rail ---------- */}
      {notice && renderNotice?.(notice, () => setNotice(undefined))}
      <nav className="fs-rail" aria-label="FlowSpace">
        <button
          type="button"
          className="rail-brand"
          onClick={() => setRouteName("canvas")}
          title="FlowSpace"
          aria-label="FlowSpace"
        >
          <BrandMark />
        </button>

        <div className="rail-main">
          {(
            [
              ["canvas", "canvas"],
              ["conversation", "chat"],
              ["workflows", "box"],
              ["activity", "bolt"],
            ] as const
          ).map(([id, glyph]) => (
            <button
              key={id}
              type="button"
              className={`rail-button ${routeName === id ? "active" : ""}`}
              title={t(id)}
              aria-label={t(id)}
              onClick={() => setRouteName(id)}
            >
              <Icon name={glyph} />
              {id === "canvas" && waitingAgentNodes.length > 0 && (
                <span className="rail-badge">{waitingAgentNodes.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="rail-bottom">
          <button
            type="button"
            className="rail-button"
            title={t("command")}
            aria-label={t("command")}
            onClick={() =>
              setPaletteDialog({ targetNodeId: null, query: "", index: 0 })
            }
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            className="rail-button"
            title={t("help")}
            aria-label={t("help")}
            onClick={() => setHelpModal(true)}
          >
            <Icon name="help" />
          </button>
          <button
            type="button"
            className={`rail-button ${routeName === "settings" ? "active" : ""}`}
            title={t("settings")}
            aria-label={t("settings")}
            onClick={() => setRouteName("settings")}
          >
            <Icon name="gear" />
          </button>
          {snapshot?.variables?.length ? <button type="button" className="rail-button" onClick={() => setVariablePanel(true)}
            aria-label={t("flow_variable_panel")} title={t("flow_variable_panel")}>
            <Icon name="braces" />
          </button> : null}
          <button
            type="button"
            className="rail-language"
            title={t("language")}
            aria-label={t("language")}
            onClick={() => setLanguage(getLanguage() === "zh" ? "en" : "zh")}
          >
            {getLanguage() === "zh" ? "EN" : "中"}
          </button>
        </div>
      </nav>

      {/* ---------- Left Explorer Sidebar ---------- */}
      <aside
        className={`fs-side ${!sidebarOpen ? "collapsed" : ""} ${mobileSidebar ? "mobile-open" : ""}`}
      >
        <header className="fs-side-head">
          <div className="brand-name">
            Flow<b>Space</b>
            <span>CANVAS</span>
          </div>
          <button
            type="button"
            className="side-search"
            onClick={() =>
              setPaletteDialog({ targetNodeId: null, query: "", index: 0 })
            }
          >
            <Icon name="search" />
            <span>{t("searchNodes")}</span>
            <kbd>Ctrl K</kbd>
          </button>
        </header>

        <div className="fs-side-list">
          <div className="side-section-heading">
            <span>{t("projectSessions")}</span>
            <button
              type="button"
              className="icon-button"
              title={t("add")}
              onClick={(ev) => openAddMenu(ev.currentTarget)}
            >
              <Icon name="plus" />
            </button>
          </div>

          {sidebarWorkspaceBuckets.map((bucket) => {
            const hidden = prefs.hiddenWorkspaces.includes(bucket.key);
            return (
              <div key={bucket.key}>
                <div
                  className={`sidebar-project ${hidden ? "project-hidden" : ""}`}
                >
                  <button
                    type="button"
                    className="project-name"
                    onClick={() => {
                      if (bucket.key !== "__default__") {
                        setActiveWorkspaceId(bucket.key);
                      }
                      const moves = gestureRef.current?.nodes;
                      const boxes = bucket.agents.map(agent => {
                        const move = moves?.get(agent.id);
                        return nodeBox(move ? { ...agent, ...move } : agent, false, true);
                      });
                      if (boxes.length) {
                        setRouteName("canvas");
                        fitBoxes(boxes);
                      }
                    }}
                  >
                    <Icon name="project" />
                    <span className="user-content">{bucket.name}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={t(hidden ? "showWorkspace" : "hideWorkspace")}
                    onClick={() =>
                      edit(
                        (d) => {
                          const cur = new Set(d.prefs?.hiddenWorkspaces ?? []);
                          if (cur.has(bucket.key)) cur.delete(bucket.key);
                          else cur.add(bucket.key);
                          d.prefs = {
                            ...d.prefs,
                            hiddenWorkspaces: [...cur],
                          };
                        },
                        { remember: false },
                      )
                    }
                  >
                    <Icon name={hidden ? "eyeoff" : "eye"} />
                  </button>
                </div>

                {sidebarAgents.get(bucket.key)}
              </div>
            );
          })}

          <div className="side-section-heading side-workflows-heading">
            <span>{t("workflows")}</span>
            <button
              type="button"
              className="icon-button"
              title={t("workflowLibrary")}
              onClick={() => setRouteName("workflows")}
            >
              <Icon name="box" />
            </button>
          </div>

          {doc.nodes
            .filter((n) => n.kind === "group" && !n.parentId)
            .map((grp) => {
              const count = members(doc, grp.id).filter(
                (id) => doc.nodes.find((n) => n.id === id)?.kind === "agent",
              ).length;
              return (
                <button
                  key={grp.id}
                  type="button"
                  className={`sidebar-workflow ${selection.groups.includes(grp.id) ? "selected" : ""}`}
                  onClick={() => focusGroup(grp.id)}
                >
                  <Icon name="canvas" />
                  <span className="user-content">{grp.title}</span>
                  <small>{count}</small>
                </button>
              );
            })}

          <button
            type="button"
            className="side-library-link"
            onClick={() => setRouteName("workflows")}
          >
            <Icon name="plus" />
            <span>{t("workflowLibrary")}</span>
          </button>
        </div>

        <footer className="fs-side-footer">
          <span className={`local-save-dot ${saved ? "" : "saving"}`} />
          <span>{t(saved ? "hostSaved" : "saving")}</span>
          <button
            type="button"
            className="icon-button"
            title={t("exportCanvas")}
            onClick={handleExportJson}
          >
            <Icon name="download" />
          </button>
        </footer>
      </aside>

      {/* ---------- Main Column ---------- */}
      <div className="fs-main">
        {/* Top Header */}
        <header className="fs-top">
          <div className="workspace-breadcrumb">
            <button
              type="button"
              className={`icon-button ${sidebarOpen ? "active" : ""}`}
              title={t("projectSessions")}
              onClick={() => {
                if ((rootRef.current?.clientWidth ?? 1000) <= 720) {
                  setMobileSidebar((v) => !v);
                } else {
                  setSidebarOpen((v) => !v);
                }
              }}
            >
              <Icon name="sidebarLeft" />
            </button>
            <span>{t("workbench")}</span>
            <i>/</i>
            <button
              type="button"
              className="breadcrumb-title-btn user-content"
              onClick={() =>
                setFormModal({
                  title: t("rename"),
                  initialValue: doc.title,
                  onSubmit: (title) =>
                    edit((d) => {
                      d.title = title;
                    }),
                })
              }
            >
              {routeName === "canvas" ? doc.title : t(routeName === "team" ? "teamLibrary" : routeName)}
            </button>
          </div>

          <div className="header-actions">
            <BudgetMeter snapshot={snapshot} />
            {doc.nodes.some(node => node.flowType === "flowspace/trigger") && <button type="button"
              className={`icon-button fs-trig-gate ${doc.settings.automaticTriggers ? "active" : ""}`} role="switch"
              aria-checked={!!doc.settings.automaticTriggers} aria-label={t("flow_trig_gate")} title={t("flow_trig_gate")}
              onClick={() => edit(next => { next.settings.automaticTriggers = !next.settings.automaticTriggers; })}>
              <Icon name="bolt" />
            </button>}
            {workspaces.length > 0 && (
              <button
                type="button"
                className="workspace-chip"
                onClick={(ev) =>
                  openAnchoredMenu(ev.currentTarget, [
                    {
                      label: t("currentWorkspace"),
                      icon: "project",
                      checked: !activeWorkspaceId,
                      fn: () => setActiveWorkspaceId(""),
                    },
                    ...workspaces.map((w) => ({
                      label: w.name,
                      description: w.path,
                      icon: "project",
                      checked: activeWorkspaceId === w.id,
                      fn: () => setActiveWorkspaceId(w.id),
                    })),
                  ])
                }
              >
                <Icon name="project" />
                <span>
                  {workspaces.find((w) => w.id === activeWorkspaceId)?.name ??
                    t("currentWorkspace")}
                </span>
              </button>
            )}

            {waitingAgentNodes.length > 0 && (
              <button
                type="button"
                className="waiting-button"
                onClick={(ev) =>
                  openAnchoredMenu(
                    ev.currentTarget,
                    waitingAgentNodes.map((n) => ({
                      label: n.title,
                      description: t(
                        nodeStatusOf(snapshot, n.id) === "input"
                          ? "approvalNeeded"
                          : "waitingConfirmation",
                      ),
                      icon: "pause",
                      fn: () => revealNode(n.id),
                    })),
                  )
                }
              >
                <Icon name="pause" />
                <span>
                  {t("waitingCount", { count: waitingAgentNodes.length })}
                </span>
              </button>
            )}

            <button
              type="button"
              className="icon-button"
              title={t("theme")}
              onClick={(ev) => toggleTheme(ev.currentTarget)}
            >
              <Icon name={displayedTheme === "dark" ? "moon" : "sun"} />
            </button>

            {routeName === "canvas" && (
              <button
                type="button"
                className={`icon-button ${inspectorOpen ? "active" : ""}`}
                title={t("inspector")}
                onClick={() => setInspectorOpen((v) => !v)}
              >
                <Icon name="side" />
              </button>
            )}

            <button
              type="button"
              className="header-save"
              onClick={handleCaptureSnapshot}
            >
              <Icon name="clock" />
              <span>{t("saveSnapshot")}</span>
            </button>

            {hasRunnableSelection && routeName === "canvas" && (
              <button
                type="button"
                className="icon-button"
                title={t("runAll")}
                onClick={() => launchScope({ kind: "global", nodeIds: [] })}
              >
                <Icon name="play" />
              </button>
            )}

            <button
              type="button"
              className="button button-primary header-run"
              onClick={() => {
                if (hasRunnableSelection && routeName === "canvas") {
                  if (selection.groups.length === 1 && !selection.nodes.length) {
                    launchScope({
                      kind: "group",
                      nodeIds: [selection.groups[0]],
                    });
                  } else {
                    launchScope({
                      kind: "selection",
                      nodeIds: [...selection.nodes, ...selection.groups],
                    });
                  }
                } else {
                  launchScope({ kind: "global", nodeIds: [] });
                }
              }}
            >
              <Icon name="play" />
              <span>
                {hasRunnableSelection && routeName === "canvas"
                  ? selection.groups.length === 1 && !selection.nodes.length
                    ? t("runGroup")
                    : t("runSelection")
                  : t("runAll")}
              </span>
            </button>
          </div>
        </header>

        {/* Content Row: Canvas / Surface + Right Inspector */}
        <div className="fs-content-row">
          <div
            className={`fs-canvas-column ${leftSnapped ? "has-left-window" : ""} ${rightSnapped ? "has-right-window" : ""}`}
          >
            {/* Floating Glassmorphic Canvas Toolbar */}
            {routeName === "canvas" && (
              <div className="fs-canvas-toolbar" role="toolbar">
                <div className="canvas-title">
                  <span>
                    <Icon name="canvas" />
                  </span>
                  <b className="user-content">{doc.title}</b>
                </div>

                <div className="toolbar-actions">
                  <button
                    type="button"
                    className={`toolbar-button ${prefs.showBranches ? "active" : ""}`}
                    title={t("showBranches")}
                    onClick={() =>
                      edit(
                        (d) => {
                          d.prefs = {
                            ...d.prefs,
                            showBranches: !prefs.showBranches,
                          };
                        },
                        { remember: false },
                      )
                    }
                  >
                    <Icon name="branch" />
                    <span>{t("showBranches")}</span>
                  </button>

                  <button
                    type="button"
                    className={`toolbar-button ${prefs.showWorktrees ? "active" : ""}`}
                    title={t("showWorktrees")}
                    onClick={() =>
                      edit(
                        (d) => {
                          d.prefs = {
                            ...d.prefs,
                            showWorktrees: !prefs.showWorktrees,
                          };
                        },
                        { remember: false },
                      )
                    }
                  >
                    <Icon name="worktree" />
                    <span>{t("showWorktrees")}</span>
                  </button>

                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={(ev) =>
                      openAnchoredMenu(
                        ev.currentTarget,
                        (
                          [
                            ["auto", "auto"],
                            ["running", "onlyRunning"],
                            ["3d", "filter3d"],
                            ["7d", "filter7d"],
                            ["all", "all"],
                          ] as const
                        ).map(([val, labelKey]) => ({
                          label: t(labelKey),
                          icon: "eye",
                          checked: prefs.filter === val,
                          fn: () =>
                            edit(
                              (d) => {
                                d.prefs = { ...d.prefs, filter: val };
                              },
                              { remember: false },
                            ),
                        })),
                      )
                    }
                  >
                    <Icon name="eye" />
                    <span>
                      {t(
                        prefs.filter === "running"
                          ? "onlyRunning"
                          : prefs.filter === "3d"
                            ? "filter3d"
                            : prefs.filter === "7d"
                              ? "filter7d"
                              : prefs.filter === "auto"
                                ? "auto"
                                : "all",
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="toolbar-button"
                    onClick={(ev) => openAddMenu(ev.currentTarget)}
                  >
                    <Icon name="plus" />
                    <span>{t("add")}</span>
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    title={t("groupSelection")}
                    onClick={groupSelected}
                  >
                    <Icon name="group" />
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    title={t(tidyLabel)}
                    aria-label={t(tidyLabel)}
                    onClick={() => arrangeTopology()}
                  >
                    <Icon name="tidy" />
                  </button>

                  <i className="toolbar-separator" />

                  <button
                    type="button"
                    className="toolbar-search"
                    onClick={() =>
                      setPaletteDialog({
                        targetNodeId: null,
                        query: "",
                        index: 0,
                      })
                    }
                  >
                    <Icon name="search" />
                    <span>{t("searchNodes")}</span>
                  </button>
                  <kbd>Ctrl K</kbd>
                </div>
              </div>
            )}

            {/* Infinite Canvas Area */}
            <div
              ref={areaRef}
              className={`fs-canvas-area ${leftSnapped ? "has-left-window" : ""} ${rightSnapped ? "has-right-window" : ""}`}
            >
              {/* Canvas Viewport */}
              <div
                ref={viewportRef}
                className={[
                  "fs-viewport",
                  routeName !== "canvas" ? "is-hidden" : "",
                  tool === "hand" || spacePressed ? "pan-mode" : "",
                  isDragging ? "is-dragging" : "",
                  connecting ? `connecting ${connecting.anchor.direction === "in" ? "connecting-reverse" : `connecting-${connecting.kind}`}` : "",
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
                <div className="fs-camera" data-raster={rasterScene || undefined} ref={cameraRef}>
                <div
                  ref={worldRef}
                  className={`fs-world ${lod ? "semantic-zoom" : ""}`}
                  data-wire-routing={prefs.wireRouting}
                >
                  <div className="fs-scene-clip" style={{ left: paintArea.x, top: paintArea.y, width: paintArea.w, height: paintArea.h }}>
                  <div className="fs-scene-origin" data-wire-routing={prefs.wireRouting} style={{ left: -paintArea.x, top: -paintArea.y }}>
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
                      const laneStats = fan && laneGroupState(doc, memberNodes, fan, snapshot?.runs);
                      const placeholder = !!laneStats && laneStats.total === undefined && !grp.collapsed;
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
                        const bottom = memberNodes.reduce((y, n) => Math.max(y,
                          n.y + nodeBox(n, lod, Boolean(n.pinned || keepExpandedIds.has(n.id))).h), grp.y);
                        box = { ...box, h: Math.max(box.h, bottom - grp.y + 48) };
                      }
                      if (!intersects(box, paintArea) && !selection.groups.includes(grp.id)) return null;
                      const runningCnt = memberNodes.filter(
                        (n) => ["running", "settling"].includes(nodeStatusOf(snapshot, n.id)),
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
                          {laneStats && grp.collapsed && <span className="fs-lane-stack-face" aria-hidden="true" />}
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
                            {laneStats ? <LaneMetrics state={laneStats} /> : <span>
                              {t("nodesCount", { count: memberNodes.length })}
                            </span>}
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
                                                  (e.targetPort ?? "in") === (port.portId ?? "in") &&
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
                                                      port.kind, undefined, undefined, port.portId,
                                                    )
                                                : proxyIncoming.length
                                                  ? (ev) =>
                                                      startInputEdgeDrag(
                                                        ev,
                                                        proxyIncoming[
                                                          proxyIncoming.length - 1
                                                        ],
                                                      )
                                                  : ev => startPortDrag(ev, port.nodes, port.kind, undefined, undefined, port.portId, "in")
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

                          {placeholder && <span className="fs-lane-placeholder">{t("flow_lane_runtime")}</span>}
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
                      {accessoryWires.filter(wire => intersects(wire.extent, paintArea)).map(({ id, path }) => (
                        <path key={`disp-${id}`} className="edge-path edge-display" d={path} />
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
                          edge.kind === "event" && `fs-evt-line fs-evt-${edge.event?.kinds.length === 1 ? edge.event.kinds[0] : "mixed"}`,
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

                        const write = edge.kind === "reference" ? writeByEdge.get(edge.id) : undefined;
                        const glow = edge.kind === "continuation" && ["active", "waiting", "boundary"].includes(evState);
                        const flow = (edge.kind === "continuation" && (evState === "active" || evState === "queued")) ||
                          (edge.kind === "reference" && (evState === "pending" || evState === "updated"));
                        return (
                          <g key={edge.id} className={retired ? "fs-lane-removed" : undefined}
                            data-flow-wire={!retired && edge.kind === "continuation" && evState === "active" ? edge.id : undefined}>
                            {/* Soft halo under live wires (shown only for active states) */}
                            {glow && <path
                              className={`edge-path edge-glow ${cls}`}
                              d={geom.path}
                            />}
                            <path
                              className={`edge-path ${cls}`}
                              d={geom.path}
                            />
                            {flow && <path
                              className={`edge-path edge-flow ${cls}`}
                              d={geom.path}
                            />}
                            {write && Date.now() - write.at < 1800 && !lod &&
                              <path key={write.id} className="fs-var-return fsx-motion" d={geom.path} pathLength={200} />}
                            {edge.kind === "event" && runtime.latestToken.get(edge.id)?.createdAt &&
                              Date.now() - runtime.latestToken.get(edge.id)!.createdAt! < 1400 &&
                              <path key={runtime.latestToken.get(edge.id)!.id} className="fs-evt-pulse fsx-motion" d={geom.path} pathLength={200} />}
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
                                  waypoints: insertWireWaypoint(edge.waypoints ?? [], geom, pt),
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
                                          waypoints: insertWireWaypoint(edge.waypoints ?? [], geom, pt),
                                        }),
                                    },
                                    ...(canInsertFanout(doc, edge) ? [{
                                      label: t("flow_insert_fanout"), icon: "fanout", fn: () => insertFanout(pt, null, edge.id),
                                    }] : []),
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

                      <WireFlowLayer wires={wireLayouts} area={svgBounds} viewport={wireViewport}
                        zoom={view.zoom} theme={displayedTheme} enabled={routeName === "canvas" && !reducedMotion}
                        spotlight={hoveredEdgeId} selected={selection.edge} reconnecting={connecting?.reconnectingEdge?.id} />

                      {!lod && snapshot?.nativeOperations?.flatMap(operation => {
                        const source = nodesById.get(operation.nodeId);
                        if (!source) return [];
                        return doc.nodes.filter(node => (node.kind === operation.kind || node.flowType === `flowspace/exec-${operation.kind}`) &&
                          (operation.kind === "terminal" ? node.terminalSessionId === source.sessionId
                            : !!operation.cwd && (node.worktreePath ?? node.cwd ?? node.config?.cwd) === operation.cwd))
                          .map(node => {
                            const a = nodeBox(source), b = nodeBox(node);
                            return <path key={`${operation.nodeId}:${node.id}:${operation.kind}`}
                              className="fs-exec-observed" d={`M ${a.x + a.w / 2} ${a.y + a.h / 2} L ${b.x + b.w / 2} ${b.y + b.h / 2}`}>
                              <title>{operation.command}</title>
                            </path>;
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
                          const rect = (box: Box) => `M${box.x},${box.y}h${box.w}v${box.h}h${-box.w}Z`;
                          return (
                            <g key={ex.id} clipPath={`url(#${clip})`}>
                              <clipPath id={clip}>
                                <path clipRule="evenodd" d={rect(svgBounds) + rect(boxA) + rect(boxB)} />
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
                      <GuideWireLayer links={derivedStructure.links} cache={wireScene.cache}
                        obstacleRevision={wireScene.cache.obstacleRevision} mode={prefs.wireRouting}
                        area={paintArea} zoom={view.zoom} theme={effectiveTheme}
                        settled={!worldRef.current?.dataset.moving} lod={lod} dragging={Boolean(gesture?.nodes)} />

                      {/* Native children: agent port → subagent row, role node → member tree */}
                      <ChildLinks links={childTree.links} />

                      {/* Staffing wires: team port → role socket */}
                      <StaffWires wires={staffWires}
                        drag={staffDrag && staffTip ? {
                          from: staffDrag.teamId ? staffDrag.anchor : staffTip,
                          to: staffDrag.teamId ? staffTip : staffDrag.anchor,
                          snapped: !!staffTarget,
                        } : null}
                        onMenu={(roleId, at) => openAnchoredMenu(at, [{
                          label: t("teamRoleDisconnect"), icon: "unplug", danger: true,
                          fn: () => edit((d) => { const role = d.nodes.find((n) => n.id === roleId); if (role) delete role.staffOf; }),
                        }])} />

                      {/* Live Temporary Drag Wire & Magnetic ComfyUI Plug Tip */}
                      {connecting && (() => {
                        const target = connecting.snappedTarget?.point;
                        const tip = target ?? connecting.current;
                        const wirePath = route(
                          connecting.anchor.direction === "in" ? tip : connecting.fromPoint,
                          connecting.anchor.direction === "in" ? connecting.fromPoint : tip,
                          {
                            kind: connecting.kind,
                            mode: prefs.wireRouting,
                            obstacles: target ? routingBoxes : [],
                            freeEnd: !target,
                            waypoints: connecting.snappedTarget?.isOriginalTarget
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
                    {derivedStructure.cards.filter(sc => intersects(sc.box, paintArea)).map((sc) => (
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
                              { x: sc.box.x + sc.box.w + 200, y: sc.box.y + 80 },
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

                    <ChildCards cards={childTree.cards.filter((card) => intersects(card.box, paintArea))}
                      onOpen={(card) => card.member ? openTeam(card.agentNodeId, card.sessionId) : bridge.openChat(card.sessionId)} />


                    {sceneNodes.map(({ n, b }) => {
                        const visible = intersects(b, paintArea) || n.id === focusedCard || n.id === editingNodeId || n.id === pendingFocusRef.current;
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
                                <strong className="user-content">
                                  {n.title}
                                </strong>
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
                        const translating = patch && Object.keys(patch).every(key => key === "x" || key === "y");
                        const node = translating ? contentIndex.nodesById.get(n.id)! : n;
                        const layout = cardBoxes(node);
                        const preview = Boolean(preparing?.compact && !visible && layout[1].compact &&
                          intersects(cardBoxes(n)[1], preparing.area));
                        const warmFull = Boolean(preparing && !preparing.compact && visible && b.compact &&
                          intersects(cardBoxes(n)[0], preparing.area));
                        const semantic = lod || preview;
                        const cardBox = layout[Number(semantic)];
                        return <ViewportCard key={n.id} node={node} visible={visible} box={cardBox} prepare={preview || warmFull}
                          dx={n.x - node.x} dy={n.y - node.y} semantic={semantic && (node.kind !== "detail" && node.kind !== "role" || !!cardBox.compact)}
                          branchOffset={branchScroll.get(node.id)} onBranchScroll={onBranchScroll}
                          render={renderNodeCard} snapshot={snapshot} incoming={edgeIndex.incoming.get(n.id)} />;
                      })}
                  </div>

                  {/* Edge Pill Tags & Waypoints Layer */}
                  <div className="fs-tags-layer fs-wire-labels" data-fs-semantic={lod || undefined}>
                    {wireLayouts.map(({ edge, geom, evState }) => {
                      if (connecting?.reconnectingEdge?.id === edge.id) {
                        return null;
                      }
                      const waitingTok = runtime.waitingByEdge.get(edge.id);
                      const isSpotlight = hoveredEdgeId === edge.id;
                      const edgeSource = nodesById.get(edge.source);
                      const edgeTarget = nodesById.get(edge.target);
                      const labels = edgeLabels(edge, edgeSource, edgeTarget, runtime.latestToken.get(edge.id));
                      const permission = containerPermission(edgeSource, edge);
                      const modeLabel = edge.kind === "event"
                        ? `${t(`flow_evt_${edge.event?.mode ?? "end"}`)} · ${edge.event?.kinds.length ?? 1}`
                        : evState === "skipped" ? t("flow_skipped") : edge.kind === "continuation"
                        ? t(isContainer(edgeTarget) ? "flow_delivery" : edge.mode)
                        : t(edge.always ? "always" : evState);
                      const tagTitle = edge.kind === "continuation"
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
                        <div key={`tags-${edge.id}`} className={isRemovedLaneWire(edge, nodesById) ? "fs-lane-removed" : undefined}>
                          <div
                            className={[
                              "edge-tag",
                              edge.kind,
                              `edge-state-${evState}`,
                              dimmed ? "edge-dim" : "",
                              geom.tight ? "tight-tag" : "",
                              geom.portLabel && "near-ports",
                              geom.portLabel?.fit === "snug" && "snug-tag",
                              geom.portLabel && (geom.portLabel.fit === "above" || waitingTok) && "above-ports",
                              selection.edge === edge.id ? "selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{
                              left: geom.label.x,
                              top: geom.label.y,
                              "--tag-lift": geom.portLabel && `${geom.portLabel.lift}px`,
                              "--tag-idle-width": geom.portLabel && `${geom.portLabel.idleWidth}px`,
                            } as React.CSSProperties}
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
                              <span className="fs-branch-edge-type">{labels.list && nodesById.get(edge.source)
                                ? <WireListLabel edge={edge} source={nodesById.get(edge.source)!} fallback={labels.type} /> : labels.type}</span>
                              <span className={evState === "skipped" ? "fs-branch-skipped-label" : undefined}>{modeLabel}</span>
                              {labels.conversion && <span className="fs-branch-edge-convert">{labels.conversion}</span>}
                              {labels.flags && <span className="fs-branch-edge-logic">· {labels.flags}</span>}
                              {permission !== "read" && <small>{t(`flow_permission_${permission}`)}{edge.ask ? " ?" : ""}</small>}
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
                                const r = ev.currentTarget.getBoundingClientRect();
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
                  <div className="fs-tags-layer" data-fs-semantic={lod || undefined}>
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
                            const isDim =
                              Boolean(hoveredEdgeId) && !isHot;
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
                                <Icon name={kindIconName(sat.sourceNode.kind, sat.sourceNode.flowType)} />
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
                      (connecting.reason || connecting.reconnectingEdge ||
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
                            name={
                              connecting.snappedTarget
                                ? "bolt"
                                : "unplug"
                            }
                          />
                          <span>
                            {connecting.reason ? t(connecting.reason) : connecting.reconnectingEdge
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
                    void bridge
                      .sessions()
                      .then(setSessionModal)
                      .catch(reportError)
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
              {routeName === "canvas" && minimapOpen && (() => {
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
                const jumpMinimap = (clientX: number, clientY: number, svgEl: SVGSVGElement) => {
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
                      <MiniMapNodes boxes={nodeBoxes} snapshot={snapshot} x={full.x} y={full.y} scale={sc}
                        offsetX={ox} offsetY={oy} width={mw} height={mh} theme={displayedTheme} raster={rasterScene} />
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
                      disabled={!history.length}
                      onClick={() => performUndo(false)}
                    >
                      <Icon name="undo" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title={t("redo")}
                      disabled={!future.length}
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
                    .map((n) => renderNodeCard(n, "window", snapshot, cardBoxes(n)[Number(lod)]))}
                </div>
              )}

              {/* Full-Page Surfaces */}
              {routeName === "team" && (openTeamNode ? (
                <TeamView key={`${openTeamNode.id}:${teamFocus ?? ""}`} node={openTeamNode} snapshot={snapshot}
                  nodes={doc.nodes} initialSelection={teamFocus}
                  status={nodeStatusOf(snapshot, openTeamNode.id)} bridge={bridge}
                  leadConversation={<EmbeddedSession node={openTeamNode} bridge={bridge}
                    renderConversation={renderConversation} onError={reportError} onPresenceChange={onPresenceChange} />}
                  renderConversation={renderConversation}
                  onBindLead={() => bindAgentSession(openTeamNode)}
                  onError={reportError}
                  onBack={() => setRouteName("canvas")}
                />
              ) : <button type="button" className="button" onClick={() => setRouteName("canvas")}>{t("returnCanvas")}</button>)}
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
                      d.templates = (d.templates ?? []).filter(
                        (x) => x.id !== id,
                      );
                    })
                  }
                  onRestoreSnapshot={handleRestoreSnapshot}
                  onDeleteSnapshot={(id) =>
                    edit((d) => {
                      d.snapshots = (d.snapshots ?? []).filter(
                        (x) => x.id !== id,
                      );
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
                  onReplay={run => {
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
                    void bridge
                      .release(runId, tokenId, accept)
                      .catch(reportError)
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
                    void bridge
                      .sessions()
                      .then(setSessionModal)
                      .catch(reportError)
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
                      renderNodeCard(conversationFocusAgent, "conversation", snapshot, cardBoxes(conversationFocusAgent)[Number(lod)])
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
            </div>
          </div>

          {/* Right Contextual Inspector */}
          <InspectorPanel
            open={inspectorOpen && routeName === "canvas"}
            doc={doc}
            snapshot={snapshot}
            workspaces={workspaces}
            bridge={bridge}
            selectedNode={selectedNode}
            selectedNodes={selectedNodesList}
            selectedEdge={selectedEdge}
            onClose={() => setInspectorOpen(false)}
            onExtendLoop={extendLoop}
            onAlign={alignSelection}
            onDistribute={distributeSelection}
            onGroupSelected={groupSelected}
            onDuplicateSelected={() => void duplicateSelection()}
            onBatchParticipation={setBatchParticipation}
            onRunSelection={runSelection}
            onRunFromHere={runFromHere}
            onRunToHere={runToHere}
            onForkHypothesis={forkHypothesis}
            onStopNode={stopNode}
            onEditNode={editNode}
            onEditEdge={editEdge}
            onApplyConfig={applyConfig}
            onDeleteSelection={deleteSelection}
            onInsertFanout={id => insertFanout(undefined, null, id)}
            onUngroup={ungroup}
            onReleaseToken={(runId, tokenId, accept) =>
              void bridge.release(runId, tokenId, accept).catch(reportError)
            }
            onOpenNativeChat={(sid) => bridge.openChat(sid)}
            onOpenDetail={openDetailCard}
            onOpenWindow={openWindow}
            onSetGroupPorts={(gid, ports) => editNode(gid, { ports })}
            onOpenMergePorts={(gid) =>
              setMergePortsModal({
                groupId: gid,
                name: t("inputPort"),
                selectedPortIds: new Set(),
              })
            }
            onSaveTemplate={handleSaveTemplateDialog}
            onSyncTemplate={handleOpenSyncTemplate}
            onDetachTemplate={(gid) =>
              editNode(gid, {
                templateId: undefined,
                templateRevision: undefined,
              })
            }
          />
        </div>

        {/* Bottom Execution Drawer */}
        {(routeName === "canvas" || routeName === "conversation") && (
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
                    void bridge
                      .release(runId, tokenId, accept)
                      .catch(reportError)
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
              <span className="bottom-event-count">
                {snapshot?.runs.length ?? 0}
              </span>
              <span className="fs-bottom-summary">
                {doc.nodes.filter((n) => n.kind === "agent").length} Agent ·{" "}
                {doc.edges.length} {t("continuation")}/{t("reference")}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ---------- ComfyUI Quick-Create (search / wire-drop) ---------- */}
      {quickCreate && (
        <QuickCreateMenu
          anchor={quickCreate.anchor}
          doc={doc}
          wireContext={quickCreate.wire}
          onSelect={handleQuickCreateSelect}
          onClose={() => setQuickCreate(null)}
        />
      )}
      {variablePanel && <CanvasDialog title={t("flow_variable_panel")} variant="wide" closeLabel={t("close")}
        onClose={() => setVariablePanel(false)}>
        <VariablePanel snapshot={snapshot} bridge={bridge} />
      </CanvasDialog>}
      {arenaOpen && <ArenaDialog snapshot={snapshot} close={() => setArenaOpen(false)} />}
      {batchHumanRun && <BatchHuman run={batchHumanRun} bridge={bridge} onClose={() => setBatchHumanId(undefined)} />}
      {reportRun && <ReportDialog run={reportRun} bridge={bridge} models={modelRoutes} close={() => setReportRun(undefined)} />}
      {teamPicker && (
        <CanvasDialog title={t("teamPickBlueprint")} className="fs-team-dialog" onClose={() => setTeamPicker(null)} closeLabel={t("close")}>
          <div className="fs-team-picker">
            {(snapshot?.teamBlueprints ?? []).filter((team) => !team.archived).map((team) => (
              <button type="button" className="fs-team-link-row" key={team.id} onClick={() => {
                const created = createCanvasNode("agent", teamPicker.at, undefined, false, { patch: {
                  title: team.title, customTitle: true, teamRef: { teamId: team.id, revision: team.revision },
                  tab: "crew", width: 440, height: 540,
                } });
                pendingFocusRef.current = created.id;
                setTeamPicker(null);
              }}>
                <TeamAvatar variant="team" label={team.title} model={team.lead.model} />
                <span className="fs-team-row-copy">
                  <strong className="user-content">{team.title}</strong>
                  <small><ModelChip model={team.lead.model} quiet /><span>{t("teamSlotCount", { count: team.slots.length })}</span></small>
                </span>
                <AvatarStack max={4} items={team.slots.map((slot) => ({ key: slot.slotId, label: slot.label,
                  model: slot.model ?? snapshot?.roles?.find((role) => role.id === slot.roleId)?.model }))} />
                <Icon name="plus" />
              </button>
            ))}
          </div>
          {!(snapshot?.teamBlueprints ?? []).some((team) => !team.archived) && <p className="fs-team-muted">{t("teamNoBlueprint")}</p>}
          <button type="button" className="text-button fs-team-library-link" onClick={() => {
            setTeamPicker(null);
            setLibraryTab("teams");
            setRouteName("workflows");
          }}>{t("teamOpenLibrary")}<Icon name="chev" /></button>
        </CanvasDialog>
      )}
      {workflowImport && (
        <WorkflowImportDialog request={workflowImport.request} bridge={bridge}
          initialMissing={workflowImport.missing}
          onClose={() => setWorkflowImport(undefined)}
          onImported={(imported) => finishImport(imported, !!workflowImport.request.template)} />
      )}

      {/* ---------- Wire / Capsule Payload X-Ray ---------- */}
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

      {/* ---------- Floating Menu ---------- */}
      {menu && (
        <div
          className="fs-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          onKeyDown={menu.returnFocus ? (event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            event.stopPropagation();
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
            const index = buttons.findIndex((button) => button === document.activeElement);
            const offset = event.key === "ArrowDown" ? 1 : -1;
            buttons[(index + offset + buttons.length) % buttons.length]?.focus();
          } : undefined}
        >
          {menu.items.map((item, idx) =>
            item.divider ? (
              <hr key={idx} />
            ) : item.heading ? (
              <small key={idx}>{item.heading}</small>
            ) : (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={item.danger ? "danger" : ""}
                onClick={() => {
                  menu.returnFocus?.focus({ preventScroll: true });
                  setMenu(null);
                  item.fn?.();
                }}
              >
                <span className="menu-icon">
                  {item.icon ? <Icon name={item.icon} /> : null}
                </span>
                <span>
                  {item.label}
                  {item.description && <small>{item.description}</small>}
                </span>
                {item.checked ? (
                  <Icon name="check" />
                ) : item.shortcut ? (
                  <kbd>{item.shortcut}</kbd>
                ) : null}
              </button>
            ),
          )}
        </div>
      )}

      {/* ---------- Dialogs Host ---------- */}
      {/* 1. Command & @ Mention Palette */}
      {paletteDialog && (
        <div
          className="fs-dialog-host"
          onClick={() => setPaletteDialog(null)}
        >
          <section
            ref={dialogRef}
            className="dialog command-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="dialog-body">
              <div className="command-input">
                <Icon name={paletteDialog.targetNodeId ? "at" : "search"} />
                <input
                  autoFocus
                  placeholder={t("commandSearch")}
                  value={paletteDialog.query}
                  onChange={(ev) =>
                    setPaletteDialog((prev) =>
                      prev
                        ? { ...prev, query: ev.target.value, index: 0 }
                        : null,
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
                <span>
                  {t(paletteDialog.targetNodeId ? "reference" : "run")}
                </span>
              </footer>
            </div>
          </section>
        </div>
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
          <div
            className="fs-dialog-host"
            onClick={() => setLaunchDialog(null)}
          >
            <section
              ref={dialogRef}
              className="dialog"
              role="dialog"
              aria-modal="true"
              onClick={(ev) => ev.stopPropagation()}
            >
              <header className="dialog-header">
                <div>
                  <h2>{t("runAll")}</h2>
                  <p>{t("launchDescription")}</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setLaunchDialog(null)}
                >
                  <Icon name="x" />
                </button>
              </header>
              <div className="dialog-body">
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
              </div>
              <footer className="dialog-footer">
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
              </footer>
            </section>
          </div>
        );
      })()}

      {/* 3. Rename / Form Modal */}
      {formModal && (
        <FormDialog
          dialogRef={dialogRef}
          modal={formModal}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* 4. Add Existing DSH Session Modal */}
      {sessionModal && (
        <div
          className="fs-dialog-host"
          onClick={() => setSessionModal(null)}
        >
          <section
            ref={dialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="dialog-header">
              <div>
                <h2>{t("existingSession")}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSessionModal(null)}
              >
                <Icon name="x" />
              </button>
            </header>
            <div className="dialog-body">
              <div className="fs-session-list">
                {sessionModal.filter(
                  (s) => !doc.nodes.some((n) => n.sessionId === s.sessionId),
                ).length ? (
                  sessionModal
                    .filter(
                      (s) =>
                        !doc.nodes.some((n) => n.sessionId === s.sessionId),
                    )
                    .map((s) => (
                      <button
                        key={s.sessionId}
                        type="button"
                        className="fs-session-pick"
                        onClick={() => {
                          const drop = sessionWireDrop.current;
                          const created: FlowNode = {
                            ...newNode("agent", drop?.world.x ?? 120, drop?.world.y ?? 160, s.title),
                            sessionId: s.sessionId,
                            cwd: s.cwd,
                            expanded: true,
                            tab: "conversation",
                          };
                          edit(d => {
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
            </div>
          </section>
        </div>
      )}

      {/* 5. Workspace File Preview Modal */}
      {fileModal && (
        <div className="fs-dialog-host" onClick={() => setFileModal(null)}>
          <section
            ref={dialogRef}
            className="dialog file-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="dialog-header">
              <div>
                <h2>{fileModal.path.split("/").pop()}</h2>
                <p>{fileModal.path}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setFileModal(null)}
              >
                <Icon name="x" />
              </button>
            </header>
            <div className="dialog-body">
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
            </div>
            <footer className="dialog-footer">
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
            </footer>
          </section>
        </div>
      )}

      {/* 6. Template Preview Modal */}
      {templatePreviewModal && (
        <div
          className="fs-dialog-host"
          onClick={() => setTemplatePreviewModal(null)}
        >
          <section
            ref={dialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="dialog-header">
              <div>
                <h2>
                  {templatePreviewModal.builtin
                    ? t(templatePreviewModal.title)
                    : templatePreviewModal.title}
                </h2>
                <p>
                  {templatePreviewModal.builtin
                    ? t(templatePreviewModal.description)
                    : templatePreviewModal.description}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setTemplatePreviewModal(null)}
              >
                <Icon name="x" />
              </button>
            </header>
            <div className="dialog-body">
              <div className="template-graph template-preview-graph">
                <MiniGraph
                  nodes={templatePreviewModal.nodes}
                  edges={templatePreviewModal.edges}
                  wireRouting={prefs.wireRouting}
                />
              </div>
              {teamRevisionDifferences(templatePreviewModal, snapshot?.teamBlueprints).map((change) => (
                <p key={change.id} className="fs-team-muted">{t("teamRevisionDifference", change)}</p>
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
            </div>
            <footer className="dialog-footer">
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
            </footer>
          </section>
        </div>
      )}

      {/* 7. Template Sync Diff Modal */}
      {syncModal && (
        <div className="fs-dialog-host" onClick={() => setSyncModal(null)}>
          <section
            ref={dialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="dialog-header">
              <div>
                <h2>{t("syncTemplate")}</h2>
                <p>{t("syncDialogDescription")}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSyncModal(null)}
              >
                <Icon name="x" />
              </button>
            </header>
            <div className="dialog-body">
              <div className="sync-diff">
                <div>
                  <Icon name="canvas" />
                  <b>{t("syncStructure")}</b>
                  <small>v{syncModal.plan.template.revision}</small>
                </div>
                {syncModal.plan.outside > 0 && (
                  <div>
                    <Icon name="at" />
                    <b>
                      {t("syncOutsideKept", { count: syncModal.plan.outside })}
                    </b>
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
            </div>
            <footer className="dialog-footer">
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
            </footer>
          </section>
        </div>
      )}

      {/* 8. Merge Composite Input Ports Modal */}
      {mergePortsModal && (() => {
        const grp = doc.nodes.find((n) => n.id === mergePortsModal.groupId);
        const inPorts = grp
          ? inferGroupPorts(doc, grp).filter((p) => p.direction === "in")
          : [];
        return (
          <div
            className="fs-dialog-host"
            onClick={() => setMergePortsModal(null)}
          >
            <section
              ref={dialogRef}
              className="dialog"
              role="dialog"
              aria-modal="true"
              onClick={(ev) => ev.stopPropagation()}
            >
              <header className="dialog-header">
                <div>
                  <h2>{t("mergePorts")}</h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setMergePortsModal(null)}
                >
                  <Icon name="x" />
                </button>
              </header>
              <div className="dialog-body">
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
              </div>
              <footer className="dialog-footer">
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
                      chosen.every((p) => p.kind === chosen[0].kind && (p.portId ?? "in") === (chosen[0].portId ?? "in"))
                    ) {
                      const merged: GroupPort = {
                        id: uid(),
                        kind: chosen[0].kind, portId: chosen[0].portId,
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
              </footer>
            </section>
          </div>
        );
      })()}

      {/* 9. Exchange History Viewer Modal */}
      {exchangeModal && (
        <div
          className="fs-dialog-host"
          onClick={() => setExchangeModal(null)}
        >
          <section
            ref={dialogRef}
            className="dialog"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="dialog-header">
              <div>
                <h2>{t("nativeExchange")}</h2>
                <p>{t("nativeExchangeReadOnly")}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setExchangeModal(null)}
              >
                <Icon name="x" />
              </button>
            </header>
            <div className="dialog-body">
              <div className="exchange-messages">
                {exchangeModal.items.map((item) => {
                  const fromTitle =
                    doc.nodes.find((n) => n.id === item.fromId)?.title ??
                    item.fromId;
                  const toTitle =
                    doc.nodes.find((n) => n.id === item.toId)?.title ??
                    item.toId;
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
            </div>
          </section>
        </div>
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

      {/* Hidden File Input for JSON Import */}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) void handleImportFile(f);
          ev.target.value = "";
        }}
      />

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fs-toast ${toastState.visible ? "visible" : ""} ${toastState.error ? "is-error" : ""}`}
      >
        {toastState.text}
      </div>
    </div></CanvasPreviewContext.Provider>
  );
}

function dictRoleLabel(role: string): string {
  const key = `role_${role}`;
  const val = t(key);
  return val === key ? role : val;
}

function FormDialog({
  dialogRef,
  modal,
  onClose,
}: {
  dialogRef: React.RefObject<HTMLDivElement>;
  modal: {
    title: string;
    description?: string;
    initialValue: string;
    secondaryLabel?: string;
    secondaryInitial?: string;
    onSubmit: (val: string, secondary?: string) => void;
  };
  onClose: () => void;
}) {
  const [val, setVal] = useState(modal.initialValue);
  const [sec, setSec] = useState(modal.secondaryInitial ?? "");
  return (
    <div className="fs-dialog-host" onClick={onClose}>
      <section
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <h2>{modal.title}</h2>
            {modal.description && <p>{modal.description}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!val.trim()) return;
            modal.onSubmit(val.trim(), sec.trim());
            onClose();
          }}
        >
          <div className="dialog-body">
            <label className="field-label">{t("name")}</label>
            <input
              autoFocus
              required
              className="text-field"
              value={val}
              onChange={(ev) => setVal(ev.target.value)}
            />
            {modal.secondaryLabel && (
              <>
                <label className="field-label">{modal.secondaryLabel}</label>
                <textarea
                  className="text-field"
                  rows={3}
                  value={sec}
                  onChange={(ev) => setSec(ev.target.value)}
                />
              </>
            )}
          </div>
          <footer className="dialog-footer">
            <button type="button" className="button" onClick={onClose}>
              <span>{t("cancel")}</span>
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={!val.trim()}
            >
              <span>{t("save")}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
