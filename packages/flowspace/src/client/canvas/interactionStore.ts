import { createContext, useContext, useSyncExternalStore } from "react";
import type { Waypoint } from "../../types.ts";
import type { MarqueeRect } from "./canvasTypes.ts";
import type { CachedWire } from "../sceneWires.ts";

export interface CameraSnapshot {
  x: number;
  y: number;
  zoom: number;
  moving: boolean;
  lod: boolean;
  zoomBucket: number;
}

export interface DragDelta {
  dx: number;
  dy: number;
}

export interface DragSession {
  mode: "node" | "group" | "waypoint";
  deltas: ReadonlyMap<string, DragDelta>;
  affectedEdgeIds: ReadonlySet<string>;
  waypointEdit?: { edgeId: string; waypoints: Waypoint[] };
}

export interface HoverSnapshot {
  nodeId: string | null;
  edgeId: string | null;
  portKey: string | null;
}

export type MarqueeSnapshot = MarqueeRect;

function channel<T>(value: T) {
  const listeners = new Set<(next: T) => void>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener(next);
    },
    subscribe(listener: (next: T) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

const noHiddenEdges: ReadonlySet<string> = new Set();

export function createCanvasInteractionStore() {
  const camera = channel<CameraSnapshot>({ x: 0, y: 0, zoom: 1, moving: false, lod: false, zoomBucket: 1 });
  const drag = channel<DragSession | null>(null);
  const dragRoutes = channel<{ drag: DragSession; routes: ReadonlyMap<string, CachedWire> } | null>(null);
  const hiddenEdges = channel(noHiddenEdges);
  const hover = channel<HoverSnapshot>({ nodeId: null, edgeId: null, portKey: null });
  const marquee = channel<MarqueeSnapshot | null>(null);
  const overviewDom = channel<ReadonlySet<string>>(new Set());
  const elements = new Map<string, HTMLElement>();
  return {
    getCamera: camera.get,
    setCamera: camera.set,
    subscribeCamera: camera.subscribe,
    getDrag: drag.get,
    setDrag(next: DragSession | null) {
      if (!next) dragRoutes.set(null);
      hiddenEdges.set(next?.affectedEdgeIds ?? noHiddenEdges);
      drag.set(next);
    },
    subscribeDrag: drag.subscribe,
    getDragRoutes: dragRoutes.get,
    subscribeDragRoutes: dragRoutes.subscribe,
    setDragRoutes(session: DragSession, routes: ReadonlyMap<string, CachedWire>) {
      if (drag.get() === session) dragRoutes.set({ drag: session, routes });
    },
    getHiddenEdgeIds: hiddenEdges.get,
    subscribeHiddenEdgeIds: hiddenEdges.subscribe,
    getHover: hover.get,
    setHover(patch: Partial<HoverSnapshot>) {
      const current = hover.get();
      const next = { ...current, ...patch };
      if (next.nodeId !== current.nodeId || next.edgeId !== current.edgeId || next.portKey !== current.portKey) hover.set(next);
    },
    subscribeHover: hover.subscribe,
    getMarquee: marquee.get,
    setMarquee: marquee.set,
    subscribeMarquee: marquee.subscribe,
    getOverviewDomIds: overviewDom.get,
    subscribeOverviewDom: overviewDom.subscribe,
    setOverviewDomIds: overviewDom.set,
    registerElement(id: string, element: HTMLElement | null) {
      if (element) elements.set(id, element);
      else elements.delete(id);
    },
    getElement: (id: string) => elements.get(id),
  };
}

export type CanvasInteractionStore = ReturnType<typeof createCanvasInteractionStore>;
export const CanvasInteractionContext = createContext<CanvasInteractionStore | null>(null);

export function useCanvasInteractionStore() {
  return useContext(CanvasInteractionContext)!;
}

export function useHoveredEdge() {
  const store = useCanvasInteractionStore();
  return useSyncExternalStore(store.subscribeHover, () => store.getHover().edgeId);
}
