import type { PointerEvent } from "react";
import type { BoardEdit } from "../../core/board.ts";
import type {
  CanvasPrefs,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  StartRequest,
} from "../../types.ts";
import type { Box } from "../geometry.ts";
import type { MenuItem } from "../ui/ContextMenu.tsx";
import type { WireAnchor } from "./canvasGraphOps.ts";

export interface SelectionState {
  nodes: string[];
  groups: string[];
  edge: string | null;
}

export interface ConnectingSnapTarget {
  nodeIds: string[];
  portId?: string;
  point: { x: number; y: number; box?: Box };
  label: string;
  isOriginalTarget?: boolean;
}

export interface ConnectingState {
  kind: FlowEdge["kind"];
  fromIds: string[];
  anchor: WireAnchor;
  reason?: string;
  fromPoint: { x: number; y: number; box?: Box };
  current: { x: number; y: number };
  reconnectingEdge?: FlowEdge;
  snappedTarget?: ConnectingSnapTarget | null;
}

export type ConnectSession = Pick<ConnectingState, "kind" | "fromIds" | "anchor">;

export interface StaffDragState {
  roleId?: string;
  teamId?: string;
  anchor: { x: number; y: number };
}

export interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResolvedCanvasPrefs {
  theme: NonNullable<CanvasPrefs["theme"]>;
  wheel: NonNullable<CanvasPrefs["wheel"]>;
  wireRouting: NonNullable<CanvasPrefs["wireRouting"]>;
  snap: boolean;
  filter: NonNullable<CanvasPrefs["filter"]>;
  hiddenWorkspaces: string[];
  showBranches: boolean;
  showWorktrees: boolean;
}

export type EditOptions = { remember?: boolean; delay?: number };

export type EditDocFn = (
  mutator: (draft: FlowspaceDocument) => void,
  options?: EditOptions,
) => void;

export type EditNodeFn = (
  id: string,
  changes: Partial<FlowNode>,
  options?: EditOptions,
) => void;

export type EditEdgeFn = (
  id: string,
  changes: Partial<FlowEdge>,
  options?: EditOptions,
) => void;

export type AnchorTarget = HTMLElement | { x: number; y: number };

export interface CardActionHandlers {
  editNode: EditNodeFn;
  editEdge: EditEdgeFn;
  edit: EditDocFn;
  selectNode: (id: string, additive?: boolean) => void;
  showToast: (msg: unknown, isError?: boolean) => void;
  openNodeContextMenu: (node: FlowNode, anchor: AnchorTarget) => void;
  startNodeMove: (ev: PointerEvent, nodeId: string) => void;
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
  revealNode: (id: string) => void;
  openDetailCard: (sourceNodeId: string) => void;
  bindAgentSession: (node: FlowNode) => void;
  refreshProjectStructures: () => void;
  openAnchoredMenu: (anchor: AnchorTarget, items: MenuItem[]) => void;
  extractDisplayFrom: (sourceId: string, text?: string, seq?: number, fixed?: boolean) => void;
  launchScope: (scope: StartRequest) => void;
  toggleNodeForm: (id: string) => void;
  stopNode: (id: string) => void;
  returnWindow: (id: string) => void;
  openWindow: (id: string) => void;
  openInputHub: (nodeId: string, kind: FlowEdge["kind"]) => void;
  scheduleCloseInputHub: (delay?: number) => void;
  startStaffDrag: (ev: PointerEvent, from: { roleId?: string; teamId?: string }) => void;
  editBoard: (id: string, change: BoardEdit) => void;
  createBoardCompanion: (boardId: string, cardId: string, kind: "agent" | "note") => void;
  openBoardAgentMenu: (boardId: string, cardId: string, anchor: HTMLElement) => void;
  openBoardMenu: (anchor: HTMLElement, items: MenuItem[]) => void;
}
