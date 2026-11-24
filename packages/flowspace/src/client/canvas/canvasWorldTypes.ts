import type { Dispatch, MutableRefObject, PointerEvent, RefObject, SetStateAction } from "react";
import type { ContainerChange, FlowEdge, FlowNode, FlowspaceDocument, FlowspaceSnapshot, GroupPort, NodeKind, SessionBrief, StartRequest, WorkflowTemplate } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import type { ChildCard, ChildLink } from "../childTree.ts";
import type { Box, HubSatelliteItem } from "../geometry.ts";
import type { WireDropContext } from "../QuickCreateMenu.tsx";
import type { GeometryEdit } from "../sceneModel.ts";
import type { ExchangePair, SceneWires } from "../sceneWires.ts";
import type { DerivedStructureCard, DerivedStructureLink, DraftAffiliation } from "../structure.ts";
import type { StaffWire } from "../TeamCanvas.tsx";
import type { MenuItem } from "../ui/ContextMenu.tsx";
import type { PayloadPeekState, RouteId } from "./canvasGraphOps.ts";
import type { AnchorTarget, ConnectingState, EditDocFn, EditEdgeFn, EditNodeFn, ResolvedCanvasPrefs, SelectionState, StaffDragState } from "./canvasTypes.ts";
import type { CardRenderer, WireLayout } from "./ViewportCard.tsx";
import type { MiniFrame } from "./viewportMath.ts";

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
  displayedTheme: "dark" | "light";
  reducedMotion: boolean;
  view: FlowspaceDocument["viewport"];
  vpSize: { width: number; height: number };
  lod: boolean;
  languageRevision: number;
  paintArea: Box;
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
  groupsLayerRef: RefObject<HTMLDivElement>;
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
  setHoveredEdgeId: Dispatch<SetStateAction<string | null>>;
  connecting: ConnectingState | null;
  gesture: GeometryEdit | null;

  contentIndex: { nodesById: Map<string, FlowNode> };
  nodesById: Map<string, FlowNode>;
  membersOf: (groupId: string) => FlowNode[];
  groupPorts: Map<string, GroupPort[]>;
  edgeIndex: { incoming: Map<string, FlowEdge[]>; outgoing: Map<string, FlowEdge[]> };
  writeByEdge: Map<string, ContainerChange>;
  visibleGroups: FlowNode[];
  sceneNodes: { n: FlowNode; b: Box }[];
  minimapBoxes: { n: FlowNode; b: Box }[];
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
  routingBoxesById: ReadonlyMap<string, Box>;
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
  startNodeMove: (ev: PointerEvent, nodeId: string) => void;
  selectNode: (nodeId: string, additive?: boolean) => void;
  toggleNodeForm: (nodeId: string) => void;
  stopNode: (nodeId: string) => void;
  openNodeContextMenu: (node: FlowNode, anchor: AnchorTarget) => void;
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
