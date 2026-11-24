import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
import { paintLayer, settleLayer } from "../cameraFrame.ts";
import type { CanvasInteractionStore, DragDelta, DragSession } from "./interactionStore.ts";
import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GroupPort,
  NodeKind,
} from "../../types.ts";
import { canConnect } from "../../core/connect.ts";
import { groupDescendants, uid } from "../../core/document.ts";
import { slotIdFor, staffNodes } from "../../core/team.ts";
import {
  BOARD_MIN_SIZE,
  clamp,
  computeInputHubLayout,
  endpoint,
  groupBox,
  nodeBox,
  portY,
  reflowCanvasItem,
  toWorld,
  type Box,
  type HubSatelliteItem,
} from "../geometry.ts";
import { t } from "../i18n.ts";
import type { WireDropContext } from "../QuickCreateMenu.tsx";
import { applyGeometry, padded, type GeometryEdit } from "../sceneModel.ts";
import { pathExtent } from "../sceneWires.ts";
import type { DraftAffiliation } from "../structure.ts";
import type { StaffWire } from "../TeamCanvas.tsx";
import type { MenuItem } from "../ui/ContextMenu.tsx";
import { route } from "../wireRouting.ts";
import {
  checkDraggedWire,
  matchesWire,
  wirePortIds,
  type WireAnchor,
  type WireEnds,
} from "./canvasGraphOps.ts";
import type {
  AnchorTarget,
  ConnectingState,
  EditDocFn,
  ResolvedCanvasPrefs,
  SelectionState,
  StaffDragState,
} from "./canvasTypes.ts";
import type { WireLayout } from "./ViewportCard.tsx";
import { PAN_INERTIA_TAU_MS } from "./viewportMath.ts";

export interface UseCanvasGesturesOptions {
  interactionStore: CanvasInteractionStore;
  attachedEdges: Map<string, Set<string>>;
  areaRef: RefObject<HTMLDivElement>;
  viewportRef: RefObject<HTMLDivElement>;
  doc: FlowspaceDocument;
  docRef: MutableRefObject<FlowspaceDocument>;
  snapshot: FlowspaceSnapshot | null;
  gestureRef: MutableRefObject<GeometryEdit | null>;
  setGesture: Dispatch<SetStateAction<GeometryEdit | null>>;
  viewAnimToken: MutableRefObject<number>;
  wheelTargetRef: MutableRefObject<{
    view: { x: number; y: number; zoom: number };
    anchor: { x: number; y: number };
  } | null>;
  pendingFocusRef: MutableRefObject<string | null>;
  nodesById: Map<string, FlowNode>;
  groupPorts: Map<string, GroupPort[]>;
  endpointIndex: {
    nodes: Map<string, FlowNode>;
    ancestors: Map<string, FlowNode | undefined>;
    ports: Map<string, GroupPort[]>;
    branchScroll: Map<string, number>;
    previewHeights: Map<string, number>;
  };
  visibleGroups: FlowNode[];
  keepExpandedIds: Set<string>;
  routingBoxes: Box[];
  baseWireLayouts: WireLayout[];
  prefs: ResolvedCanvasPrefs;
  lod: boolean;
  reducedMotion: boolean;
  spacePressed: boolean;
  tool: "pointer" | "hand";
  selection: SelectionState;
  setSelection: Dispatch<SetStateAction<SelectionState>>;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
  setHoveredEdgeId: Dispatch<SetStateAction<string | null>>;
  setConnecting: Dispatch<SetStateAction<ConnectingState | null>>;
  connecting: ConnectingState | null;
  setSnapPreview: Dispatch<SetStateAction<"left" | "right" | "max" | null>>;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  setHistory: Dispatch<SetStateAction<FlowspaceDocument[]>>;
  setFuture: Dispatch<SetStateAction<FlowspaceDocument[]>>;
  commitEdit: (next: FlowspaceDocument, delay?: number) => void;
  edit: EditDocFn;
  setViewportDirect: (
    nextView: { x: number; y: number; zoom: number },
    persistDelay?: number,
  ) => void;
  isNodeVisible: (
    node: FlowNode | undefined,
    ignoreCollapse?: boolean,
  ) => boolean;
  selectNode: (id: string, additive?: boolean) => void;
  openWindow: (nodeId: string) => void;
  connectNodes: (
    fromIds: string[],
    toIds: string[],
    kind: FlowEdge["kind"],
    ends?: WireEnds,
  ) => void;
  createBoardCompanion: (
    boardId: string,
    cardId: string,
    kind: "agent" | "note",
  ) => void;
  createCanvasNode: (
    kind: NodeKind,
    worldPoint?: { x: number; y: number },
    explicitAffiliation?: DraftAffiliation,
    usePreClick?: boolean,
    extra?: {
      place?: (node: FlowNode) => { x: number; y: number };
      patch?: Partial<FlowNode>;
      flowType?: string;
      link?: (d: FlowspaceDocument, created: FlowNode) => void;
    },
  ) => FlowNode;
  insertFanout: (
    point?: { x: number; y: number },
    wire?: WireDropContext | null,
    edgeId?: string,
  ) => void;
  openQuickCreate: (
    clientPt: { x: number; y: number },
    wire?: WireDropContext | null,
  ) => void;
  openAnchoredMenu: (anchor: AnchorTarget, items: MenuItem[]) => void;
  showToast: (msg: unknown, isError?: boolean) => void;
}

export function useCanvasGestures({
  interactionStore,
  attachedEdges,
  areaRef,
  viewportRef,
  doc,
  docRef,
  snapshot,
  gestureRef,
  setGesture,
  viewAnimToken,
  wheelTargetRef,
  pendingFocusRef,
  nodesById,
  groupPorts,
  endpointIndex,
  visibleGroups,
  keepExpandedIds,
  routingBoxes,
  baseWireLayouts,
  prefs,
  lod,
  reducedMotion,
  spacePressed,
  tool,
  selection,
  setSelection,
  setInspectorOpen,
  setHoveredEdgeId,
  setConnecting,
  connecting,
  setSnapPreview,
  setIsDragging,
  setHistory,
  setFuture,
  commitEdit,
  edit,
  setViewportDirect,
  isNodeVisible,
  selectNode,
  openWindow,
  connectNodes,
  createBoardCompanion,
  createCanvasNode,
  insertFanout,
  openQuickCreate,
  openAnchoredMenu,
  showToast,
}: UseCanvasGesturesOptions) {
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
  const activeTrackCancelRef = useRef<(() => void) | null>(null);

  const [staffDrag, setStaffDrag] = useState<StaffDragState | null>(null);
  const [staffTip, setStaffTip] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [staffTarget, setStaffTarget] = useState<string>();

  useEffect(() => () => {
    activeTrackCancelRef.current?.();
    activeTrackCancelRef.current = null;
  }, []);

  const nodeAtPoint = useCallback(
    (worldPt: { x: number; y: number }) => {
      const nodes = docRef.current.nodes;
      for (let index = nodes.length - 1; index >= 0; index--) {
        const node = nodes[index];
        if (!isNodeVisible(node)) continue;
        const box = nodeBox(node, lod, keepExpandedIds.has(node.id));
        if (
          worldPt.x >= box.x &&
          worldPt.x <= box.x + box.w &&
          worldPt.y >= box.y &&
          worldPt.y <= box.y + box.h
        ) {
          return node;
        }
      }
      return undefined;
    },
    [docRef, isNodeVisible, lod, keepExpandedIds],
  );

  /* Pointer Tracking Utility */
  const trackPointer = useCallback(
    (
      startEvent: ReactPointerEvent | PointerEvent,
      onMove: (ev: PointerEvent) => void,
      onEnd?: (ev: PointerEvent | KeyboardEvent, canceled: boolean) => void,
    ) => {
      startEvent.preventDefault();
      activeTrackCancelRef.current?.();
      let pending: PointerEvent | undefined;
      let frame = 0;
      let finished = false;
      let lastX = startEvent.clientX,
        lastY = startEvent.clientY;
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
      const blur = () => finish(new KeyboardEvent("keydown", { key: "Escape" }), true);
      const key = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          finish(ev, true);
        }
      };
      function finish(ev: PointerEvent | KeyboardEvent, canceled: boolean) {
        if (finished) return;
        if ("pointerId" in ev && ev.pointerId !== pointerId) return;
        finished = true;
        if (activeTrackCancelRef.current === abort) activeTrackCancelRef.current = null;
        cancelAnimationFrame(frame);
        if (
          !canceled &&
          "clientX" in ev &&
          (pending || ev.clientX !== lastX || ev.clientY !== lastY)
        ) {
          pending = ev;
          paint();
        }
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", key, true);
        window.removeEventListener("blur", blur);
        onEnd?.(ev, canceled);
      }
      const abort = () => finish(new KeyboardEvent("keydown", { key: "Escape" }), true);
      activeTrackCancelRef.current = abort;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", key, true);
      window.addEventListener("blur", blur);
    },
    [],
  );

  const previewGeometry = useCallback(
    (patch: GeometryEdit) => {
      gestureRef.current = patch;
      setGesture(patch);
    },
    [gestureRef, setGesture],
  );

  const commitGeometry = useCallback(
    (patch: GeometryEdit, finalize?: (next: FlowspaceDocument) => void) => {
      const previous = docRef.current;
      const next = applyGeometry(previous, patch);
      finalize?.(next);
      setHistory((h) => [...h.slice(-39), previous]);
      setFuture([]);
      commitEdit(next, 250);
    },
    [docRef, setHistory, setFuture, commitEdit],
  );

  const finishGeometry = useCallback(
    (canceled: boolean, finalize?: (next: FlowspaceDocument) => void) => {
      const patch = gestureRef.current;
      gestureRef.current = null;
      setGesture(null);
      if (!canceled && patch) commitGeometry(patch, finalize);
    },
    [gestureRef, setGesture, commitGeometry],
  );

  const trackMove = useCallback((
    event: ReactPointerEvent,
    mode: "node" | "group",
    originals: readonly FlowNode[],
    onEnd: (event: PointerEvent | KeyboardEvent, patch: GeometryEdit | null) => void,
  ) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const origin = toWorld(docRef.current.viewport, rect, event.clientX, event.clientY);
    const affectedEdgeIds = new Set<string>();
    for (const node of originals) {
      for (const id of attachedEdges.get(node.id) ?? []) affectedEdgeIds.add(id);
    }
    let delta: DragDelta | undefined;
    const movingElements = new Set<HTMLElement>();
    trackPointer(event, pointer => {
      const point = toWorld(docRef.current.viewport, rect, pointer.clientX, pointer.clientY);
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      if (!delta && Math.hypot(dx, dy) < 3) return;
      delta = { dx, dy };
      const deltas = new Map<string, DragDelta>();
      const transform = `translate3d(${dx}px, ${dy}px, 0)`;
      for (const node of originals) {
        deltas.set(node.id, delta);
        const element = interactionStore.getElement(node.id);
        if (!element) continue;
        if (!movingElements.has(element)) {
          movingElements.add(element);
          element.classList.add("fs-moving-card");
        }
        paintLayer(element, { transform });
      }
      interactionStore.setDrag({ mode, deltas, affectedEdgeIds });
    }, (pointer, canceled) => {
      if (!delta) {
        if (!canceled) onEnd(pointer, null);
        return;
      }
      const { dx, dy } = delta;
      const patch = canceled ? null : { nodes: new Map(originals.map(node => [
        node.id, { x: node.x + dx, y: node.y + dy },
      ])) };
      flushSync(() => {
        if (!canceled) onEnd(pointer, patch);
        for (const element of movingElements) {
          settleLayer(element);
          element.classList.remove("fs-moving-card");
        }
        interactionStore.setDrag(null);
      });
    });
  }, [viewportRef, docRef, attachedEdges, interactionStore, trackPointer]);

  const startPan = useCallback(
    (ev: ReactPointerEvent) => {
      const origin = { ...docRef.current.viewport };
      const sx = ev.clientX,
        sy = ev.clientY;
      let moved = false;
      const token = ++viewAnimToken.current;
      wheelTargetRef.current = null;
      const samples: { t: number; x: number; y: number }[] = [];
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
          const releaseGap = lastSample
            ? performance.now() - lastSample.t
            : Infinity;
          let vx = span > 8 ? (lastSample.x - first.x) / span : 0;
          let vy = span > 8 ? (lastSample.y - first.y) / span : 0;
          if (reducedMotion || releaseGap > 70 || Math.hypot(vx, vy) < 0.35) {
            setViewportDirect(docRef.current.viewport, 250);
            return;
          }
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
    [
      docRef,
      viewAnimToken,
      wheelTargetRef,
      viewportRef,
      trackPointer,
      setViewportDirect,
      spacePressed,
      tool,
      setSelection,
      reducedMotion,
    ],
  );

  const startWindowMove = useCallback(
    (
      ev: ReactPointerEvent,
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
      previewGeometry({
        nodes: new Map([[nodeId, { window: { ...originWin, z: maxZ } }]]),
      });
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
          previewGeometry({
            nodes: new Map([
              [
                nodeId,
                {
                  window: {
                    ...originWin,
                    x: nx,
                    y: ny,
                    snap: undefined,
                    z: maxZ,
                  },
                },
              ],
            ]),
          });
        },
        (_, canceled) => {
          setIsDragging(false);
          setSnapPreview(null);
          finishGeometry(canceled, (d) => {
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
          });
        },
      );
    },
    [
      docRef,
      areaRef,
      previewGeometry,
      setIsDragging,
      trackPointer,
      setSnapPreview,
      finishGeometry,
    ],
  );

  const startNodeMove = useCallback(
    (ev: ReactPointerEvent, nodeId: string) => {
      if (ev.button !== 0) return;
      const currentNodes = docRef.current.nodes;
      const node = currentNodes.find((n) => n.id === nodeId);
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
      const byId = new Map(currentNodes.map(item => [item.id, item]));
      const originals = activeIds
        .map(id => byId.get(id))
        .filter((item): item is FlowNode => !!item);
      trackMove(ev, "node", originals, (endEvent, patch) => {
        if (!selection.nodes.includes(nodeId)) selectNode(nodeId);
        if (!patch) return;
        const noSnap = "ctrlKey" in endEvent && endEvent.ctrlKey;
        commitGeometry(patch, d => {
          const candidateGroups = d.nodes
            .filter(g => g.kind === "group" && !g.collapsed)
            .sort((a, b) => a.width * a.height - b.width * b.height);
          for (const orig of originals) {
            const target = d.nodes.find(x => x.id === orig.id);
            if (!target) continue;
            delete target.nudge;
            if (prefs.snap && !noSnap) {
              target.x = Math.round(target.x / 12) * 12;
              target.y = Math.round(target.y / 12) * 12;
            }
            const box = nodeBox(target);
            const cx = box.x + box.w / 2;
            const cy = box.y + box.h / 2;
            const hitGroup = candidateGroups.find(g =>
              g.id !== target.id && cx > g.x && cx < g.x + g.width &&
              cy > g.y + 42 && cy < g.y + g.height,
            );
            const frameIndex = candidateGroups.findIndex(
              group => group.id === target.parentId && group.fanout,
            );
            const frame = candidateGroups[frameIndex];
            if (frame?.fanout && (target.masterOf || target.generatedBy ||
              frame.fanout.fanId === target.id || frame.fanout.mergeId === target.id)) {
              target.x = Math.max(frame.x + 24, target.x);
              target.y = Math.max(frame.y + 54, target.y);
              const resized = { ...frame,
                width: Math.max(frame.width, target.x + box.w - frame.x + 24),
                height: Math.max(frame.height, target.y + box.h - frame.y + 24),
              };
              candidateGroups[frameIndex] = resized;
              d.nodes[d.nodes.indexOf(frame)] = resized;
            } else target.parentId = hitGroup?.id;
          }
        });
      });
    },
    [docRef, startWindowMove, openWindow, selectNode, selection.nodes, trackMove, commitGeometry, prefs.snap],
  );

  const startGroupMove = useCallback(
    (ev: ReactPointerEvent, groupId: string) => {
      if (ev.button !== 0) return;
      if (ev.shiftKey) {
        selectNode(groupId, true);
        return;
      }
      const currentNodes = docRef.current.nodes;
      const byId = new Map(currentNodes.map(item => [item.id, item]));
      const movingIds = new Set([groupId, ...groupDescendants(docRef.current, groupId)]);
      const originals = Array.from(movingIds, id => byId.get(id)).filter((item): item is FlowNode => !!item);
      trackMove(ev, "group", originals, (_, patch) => {
        setSelection({ nodes: [], groups: [groupId], edge: null });
        if (!patch) return;
        commitGeometry(patch, d => {
          for (const item of d.nodes) {
            if (movingIds.has(item.id)) delete item.nudge;
          }
        });
      });
    },
    [docRef, selectNode, setSelection, trackMove, commitGeometry],
  );

  const startResize = useCallback(
    (
      ev: ReactPointerEvent,
      nodeId: string,
      mode: "node" | "group" | "window",
    ) => {
      if (ev.button !== 0) return;
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
      const [minW, minH] =
        mode === "group"
          ? [260, 180]
          : target.kind === "board"
            ? BOARD_MIN_SIZE
            : [288, 220];
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
          const change =
            mode === "window" && target.window
              ? {
                  window: {
                    ...target.window,
                    w: nw,
                    h: nh,
                    snap: undefined,
                  },
                }
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
    [docRef, setIsDragging, trackPointer, previewGeometry, finishGeometry],
  );

  /* Multi-input fan-out hub controls & 60fps animation */
  const openInputHub = useCallback(
    (nodeId: string, kind: FlowEdge["kind"]) => {
      clearTimeout(hubCloseTimerRef.current);
      setHubTarget((prev) =>
        prev?.nodeId === nodeId && prev.kind === kind ? prev : { nodeId, kind },
      );
    },
    [],
  );

  const scheduleCloseInputHub = useCallback(
    (delay = 175) => {
      clearTimeout(hubCloseTimerRef.current);
      hubCloseTimerRef.current = setTimeout(() => {
        setHubTarget(null);
        setHoveredEdgeId(null);
      }, delay);
    },
    [setHoveredEdgeId],
  );

  const closeInputHubImmediate = useCallback(() => {
    clearTimeout(hubCloseTimerRef.current);
    hubProgressRef.current = 0;
    setHubTarget(null);
    setHubState(null);
    setHoveredEdgeId(null);
  }, [setHoveredEdgeId]);

  useEffect(() => () => clearTimeout(hubCloseTimerRef.current), []);

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
        if (nextP < 1) scheduleFrame(stepOpen);
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

  const wireLayouts = useMemo(() => {
    const wires = !hubSatByEdgeId.size
      ? baseWireLayouts
      : baseWireLayouts.map((wire) => {
          const { edge, from } = wire;
          const satellite = hubSatByEdgeId.get(edge.id);
          if (!satellite) return wire;
          const geom = route(from, satellite.wireIn, {
            kind: edge.kind,
            mode: prefs.wireRouting,
            obstacles: routingBoxes,
            waypoints: edge.waypoints,
          });
          return { ...wire, to: satellite.wireIn, geom, extent: padded(pathExtent(geom.path), 72) };
        });
    return wires;
  }, [
    baseWireLayouts,
    hubSatByEdgeId,
    prefs.wireRouting,
    routingBoxes,
  ]);

  /* Port snapping & wiring gestures */
  const resolveSnapTarget = useCallback(
    (
      clientX: number,
      clientY: number,
      vpRect: DOMRect,
      kind: FlowEdge["kind"],
      fixedIds: string[],
      anchor: WireAnchor,
      original?: FlowEdge,
    ) => {
      const currentDoc = docRef.current;
      const current = toWorld(currentDoc.viewport, vpRect, clientX, clientY);
      const radius = clamp(28 / currentDoc.viewport.zoom, 18, 42);
      const direction = anchor.direction === "in" ? "out" : "in";
      const origin = fixedIds.flatMap((id) => nodesById.get(id) ?? []);
      type Match = {
        nodeIds: string[];
        portId?: string;
        point: ReturnType<typeof endpoint>;
        label: string;
        isOriginalTarget: boolean;
      };
      let reason: string | undefined;
      const match = (
        ids: string[],
        portId: string | undefined,
        label: string,
      ): Match | undefined => {
        const nodeIds = ids.filter((id) => {
          const target = nodesById.get(id);
          if (!target || fixedIds.includes(id)) return false;
          return origin.some((source) => {
            const result = checkDraggedWire(
              source,
              target,
              kind,
              anchor,
              portId,
              currentDoc.edges,
            );
            if (!result.ok) reason = result.reason;
            return result.ok;
          });
        });
        if (!nodeIds.length) return;
        const point = endpoint(
          currentDoc,
          nodeIds[0],
          kind,
          direction,
          lod,
          keepExpandedIds,
          endpointIndex,
          portId,
        );
        return {
          nodeIds,
          portId,
          point,
          label,
          isOriginalTarget:
            !!original &&
            nodeIds.length === 1 &&
            nodeIds[0] === original.target &&
            (portId ?? "in") === (original.targetPort ?? "in"),
        };
      };

      const hit = document.elementFromPoint(clientX, clientY);
      const socket = hit?.closest<HTMLElement>("[data-port-direction]");
      if (
        socket &&
        socket.dataset.portDirection === direction &&
        (socket.dataset.portKind === kind ||
          (kind === "event" &&
            direction === "in" &&
            socket.dataset.portKind === "continuation"))
      ) {
        const ids =
          socket.dataset.proxyNodes?.split(",") ??
          (socket.dataset.nodeId ? [socket.dataset.nodeId] : []);
        const snappedTarget = match(
          ids,
          socket.dataset.portId,
          socket.title || nodesById.get(ids[0])?.title || "",
        );
        return {
          current: snappedTarget?.point ?? current,
          snappedTarget,
          reason: snappedTarget ? undefined : reason,
        };
      }
      let nearest: Match | undefined;
      let distance = radius;
      for (const node of currentDoc.nodes) {
        if (fixedIds.includes(node.id)) continue;
        const candidates =
          node.kind === "group" &&
          node.collapsed &&
          visibleGroups.some((group) => group.id === node.id)
            ? (groupPorts.get(node.id) ?? [])
                .filter(
                  (p) =>
                    !p.hidden && p.direction === direction && p.kind === kind,
                )
                .map((p) => ({
                  ids: p.nodes,
                  portId: p.portId,
                  label: p.name,
                }))
            : isNodeVisible(node)
              ? wirePortIds(node, kind, direction).map((portId) => ({
                  ids: [node.id],
                  portId,
                  label: node.title,
                }))
              : [];
        for (const port of candidates) {
          if (!port.ids.length) continue;
          const point = endpoint(
            currentDoc,
            port.ids[0],
            kind,
            direction,
            lod,
            keepExpandedIds,
            endpointIndex,
            port.portId,
          );
          if (
            node.kind === "flow" &&
            !point.box.compact &&
            port.portId &&
            point.y !==
              point.box.y +
                portY(
                  node,
                  kind,
                  false,
                  port.portId,
                  endpointIndex.branchScroll.get(node.id),
                  undefined,
                  direction,
                )
          )
            continue;
          const d = Math.hypot(current.x - point.x, current.y - point.y);
          if (d > distance) continue;
          const found = match(port.ids, port.portId, port.label);
          if (found) {
            nearest = found;
            distance = d;
          }
        }
      }
      if (nearest)
        return {
          current: nearest.point,
          snappedTarget: nearest,
          reason: undefined,
        };

      const cardId =
        hit?.closest<HTMLElement>("[data-node-card]")?.dataset.nodeCard;
      const card = (cardId ? nodesById.get(cardId) : undefined) ?? nodeAtPoint(current);
      reason = undefined;
      if (card) {
        const ports = wirePortIds(card, kind, direction);
        for (const id of ports.length ? ports : [direction]) {
          const snappedTarget = match([card.id], id, card.title);
          if (snappedTarget)
            return { current, snappedTarget, reason: undefined };
        }
      }
      return { current, snappedTarget: undefined, reason };
    },
    [
      docRef,
      nodesById,
      endpointIndex,
      groupPorts,
      isNodeVisible,
      visibleGroups,
      lod,
      keepExpandedIds,
      nodeAtPoint,
    ],
  );

  const startPortDrag = useCallback(
    (
      ev: ReactPointerEvent,
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
      const anchor: WireAnchor =
        direction === "out"
          ? { sourceItemKey, sourcePort: portId, direction }
          : { targetPort: portId, direction };
      const fromPt =
        sourceItemKey !== undefined
          ? toWorld(docRef.current.viewport, vpRect, start.x, start.y)
          : endpoint(
              docRef.current,
              fromIds[0],
              kind,
              direction,
              lod,
              keepExpandedIds,
              endpointIndex,
              portId,
            );
      let started = false;
      const begin = () => {
        started = true;
        onDragStart?.();
        closeInputHubImmediate();
        setConnecting({
          kind,
          fromIds,
          anchor,
          fromPoint: fromPt,
          current: { x: fromPt.x, y: fromPt.y },
          snappedTarget: null,
        });
        setIsDragging(true);
      };
      if (sourceItemKey === undefined) begin();
      trackPointer(
        ev,
        (next) => {
          if (!started) {
            if (Math.hypot(next.clientX - start.x, next.clientY - start.y) <= 5)
              return;
            begin();
          }
          const snap = resolveSnapTarget(
            next.clientX,
            next.clientY,
            vpRect,
            kind,
            fromIds,
            anchor,
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
            fromIds,
            anchor,
          );
          if (snap.snappedTarget?.nodeIds.length) {
            const target = snap.snappedTarget;
            if (direction === "out") {
              connectNodes(fromIds, target.nodeIds, kind, {
                sourceItemKey,
                sourcePort: portId,
                targetPort: target.portId,
              });
            } else {
              connectNodes(target.nodeIds, fromIds, kind, {
                sourcePort: target.portId,
                targetPort: portId,
              });
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
          if (
            hitEl?.closest(".fs-viewport") &&
            !hitEl.closest(
              ".node,.workflow-group,.fs-minimap,.fs-canvas-controls",
            ) &&
            !nodeAtPoint(dropWorld)
          ) {
            if (sourceItemKey !== undefined) {
              const sourceNode = docRef.current.nodes.find(
                (node) => node.id === fromIds[0],
              );
              openAnchoredMenu({ x: endEv.clientX, y: endEv.clientY }, [
                {
                  label: t("boardDispatch"),
                  icon: "sendTask",
                  fn: () =>
                    createBoardCompanion(fromIds[0], sourceItemKey, "agent"),
                },
                {
                  label: t("flow_fanout_group"),
                  icon: "fanout",
                  fn: () =>
                    insertFanout(dropWorld, {
                      portKind: kind,
                      direction,
                      portId,
                      sourceNode,
                      sourceItemKey,
                      nodeIds: fromIds,
                    }),
                },
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
                portKind: kind,
                portId,
                direction,
                nodeIds: fromIds,
                ...(direction === "out"
                  ? { sourceNode: source }
                  : { targetNode: source }),
                worldPoint: dropWorld,
              },
            );
          }
        },
      );
    },
    [
      viewportRef,
      docRef,
      lod,
      keepExpandedIds,
      endpointIndex,
      closeInputHubImmediate,
      setConnecting,
      setIsDragging,
      resolveSnapTarget,
      trackPointer,
      connectNodes,
      openQuickCreate,
      openAnchoredMenu,
      createBoardCompanion,
      insertFanout,
      nodeAtPoint,
    ],
  );

  /* Staffing wires: role socket <-> team port */
  const staffSocketPoint = useCallback(
    (role: FlowNode) => {
      const box = nodeBox(role, lod, keepExpandedIds.has(role.id));
      return { x: box.x + box.w / 2, y: box.y };
    },
    [lod, keepExpandedIds],
  );
  const staffPortPoint = useCallback(
    (team: FlowNode) => {
      const box = nodeBox(team, lod, keepExpandedIds.has(team.id));
      return { x: box.x + box.w / 2, y: box.y + box.h };
    },
    [lod, keepExpandedIds],
  );

  const staffInto = useCallback(
    (d: FlowspaceDocument, roleId: string, teamId: string): boolean => {
      const role = d.nodes.find((n) => n.id === roleId && n.kind === "role");
      const team = d.nodes.find((n) => n.id === teamId);
      if (!role || team?.kind !== "agent") return false;
      const others = staffNodes(d.nodes, teamId).filter((n) => n.id !== roleId);
      const blueprint = team?.teamRef
        ? snapshot?.teamBlueprints?.find((b) => b.id === team.teamRef?.teamId)
        : undefined;
      if (others.length + (blueprint?.slots.length ?? 0) >= 8) {
        showToast(t("teamSlotsFull"), true);
        return false;
      }
      const taken = new Set([
        ...(blueprint?.slots.map((slot) => slot.slotId) ?? []),
        ...others.flatMap((n) => (n.slotId ? [n.slotId] : [])),
      ]);
      role.staffOf = teamId;
      if (!role.slotId || taken.has(role.slotId)) {
        role.slotId = slotIdFor(role.title, taken);
      }
      if (!team.teamRef && !others.length) {
        const previous = nodeBox(team);
        team.width = Math.max(team.width, 440);
        team.height = Math.max(team.height, 540);
        reflowCanvasItem(d, team, previous);
      }
      return true;
    },
    [snapshot?.teamBlueprints, showToast],
  );

  const startStaffDrag = useCallback(
    (ev: ReactPointerEvent, from: { roleId?: string; teamId?: string }) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      const vpRect = viewportRef.current?.getBoundingClientRect();
      const origin = docRef.current.nodes.find(
        (n) => n.id === (from.roleId ?? from.teamId),
      );
      if (!vpRect || !origin) return;
      const anchor = from.roleId
        ? staffSocketPoint(origin)
        : staffPortPoint(origin);
      const wasStaffed = from.roleId ? origin.staffOf : undefined;
      const hit = (clientX: number, clientY: number) => {
        const card = (
          document.elementFromPoint(clientX, clientY) as HTMLElement | null
        )?.closest<HTMLElement>("[data-node-card]");
        const node = card
          ? docRef.current.nodes.find((n) => n.id === card.dataset.nodeCard)
          : nodeAtPoint(toWorld(docRef.current.viewport, vpRect, clientX, clientY));
        if (!node || node.id === origin.id) return undefined;
        return node.kind === (from.roleId ? "agent" : "role")
          ? node
          : undefined;
      };
      setStaffDrag({ ...from, anchor });
      setStaffTip(anchor);
      setIsDragging(true);
      trackPointer(
        ev,
        (move) => {
          const node = hit(move.clientX, move.clientY);
          setStaffTarget((prev) => (prev === node?.id ? prev : node?.id));
          setStaffTip(
            node
              ? from.roleId
                ? staffPortPoint(node)
                : staffSocketPoint(node)
              : toWorld(
                  docRef.current.viewport,
                  vpRect,
                  move.clientX,
                  move.clientY,
                ),
          );
        },
        (end, canceled) => {
          setStaffDrag(null);
          setStaffTip(null);
          setStaffTarget(undefined);
          setIsDragging(false);
          if (canceled || !("clientX" in end)) return;
          const node = hit(end.clientX, end.clientY);
          if (from.roleId) {
            if (node) edit((d) => { staffInto(d, from.roleId!, node.id); });
            else if (
              wasStaffed &&
              Math.hypot(end.clientX - ev.clientX, end.clientY - ev.clientY) > 6
            ) {
              edit((d) => {
                const role = d.nodes.find((n) => n.id === from.roleId);
                if (role) delete role.staffOf;
              });
            }
            return;
          }
          if (node) {
            edit((d) => { staffInto(d, node.id, from.teamId!); });
            return;
          }
          const hitEl = document.elementFromPoint(
            end.clientX,
            end.clientY,
          ) as HTMLElement | null;
          const at = toWorld(
            docRef.current.viewport,
            vpRect,
            end.clientX,
            end.clientY,
          );
          if (
            !hitEl?.closest(".fs-viewport") ||
            hitEl.closest(
              ".node,.workflow-group,.fs-minimap,.fs-canvas-controls",
            ) ||
            nodeAtPoint(at)
          )
            return;
          const created = createCanvasNode("role", at, undefined, false, {
            place: (n) => ({
              x: Math.round((at.x - n.width / 2) / 12) * 12,
              y: Math.round(at.y / 12) * 12,
            }),
            patch: { title: t("teamRoleUntitled") },
            link: (d, role) => {
              staffInto(d, role.id, from.teamId!);
            },
          });
          pendingFocusRef.current = created.id;
        },
      );
    },
    [
      viewportRef,
      docRef,
      pendingFocusRef,
      staffSocketPoint,
      staffPortPoint,
      setIsDragging,
      trackPointer,
      edit,
      staffInto,
      createCanvasNode,
      nodeAtPoint,
    ],
  );

  const staffWires = useMemo<StaffWire[]>(() => {
    const wires: StaffWire[] = [];
    for (const role of doc.nodes) {
      if (role.kind !== "role" || !role.staffOf || role.id === staffDrag?.roleId)
        continue;
      const team = nodesById.get(role.staffOf);
      if (
        team?.kind !== "agent" ||
        !isNodeVisible(role) ||
        !isNodeVisible(team)
      )
        continue;
      const teamRt = team.sessionId
        ? snapshot?.teams?.[team.sessionId]
        : undefined;
      const slot = teamRt?.slots.find((s) => s.nodeId === role.id)?.slotId;
      wires.push({
        id: role.id,
        from: staffPortPoint(team),
        to: staffSocketPoint(role),
        active:
          !!slot &&
          !!teamRt?.members.some(
            (m) => m.slotId === slot && m.activity === "running",
          ),
      });
    }
    return wires;
  }, [
    doc.nodes,
    nodesById,
    isNodeVisible,
    snapshot?.teams,
    staffPortPoint,
    staffSocketPoint,
    staffDrag?.roleId,
  ]);

  const startInputEdgeDrag = useCallback(
    (ev: ReactPointerEvent, edge: FlowEdge) => {
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
          const anchor: WireAnchor = {
            sourcePort: edge.sourcePort,
            sourceItemKey: edge.sourceItemKey,
            mode: edge.mode,
            edgeId: edge.id,
          };
          const fromPt = endpoint(
            docRef.current,
            edge.source,
            edge.kind,
            "out",
            lod,
            keepExpandedIds,
            endpointIndex,
            edge.sourcePort,
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
            [edge.source],
            anchor,
            edge,
          );
          setConnecting({
            kind: edge.kind,
            fromIds: [edge.source],
            anchor,
            reason: snap.reason,
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
            [edge.source],
            {
              sourcePort: edge.sourcePort,
              sourceItemKey: edge.sourceItemKey,
              mode: edge.mode,
              edgeId: edge.id,
            },
            edge,
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
                return (
                  tid !== existing.source &&
                  canConnect({
                    ...existing,
                    source: d.nodes.find((n) => n.id === existing.source),
                    target: tn,
                    targetPort,
                    edges: d.edges,
                    edgeId: existing.id,
                  }).ok
                );
              });
              if (!validTargets.length) return;
              const [firstTarget, ...restTargets] = validTargets;
              const dup = d.edges.find(
                (x) =>
                  x.id !== existing.id &&
                  matchesWire(x, {
                    ...existing,
                    target: firstTarget,
                    targetPort,
                  }),
              );
              if (dup) {
                primaryEdgeId = dup.id;
                d.edges = d.edges.filter((x) => x.id !== existing.id);
              } else {
                existing.target = firstTarget;
                existing.targetPort = targetPort;
                existing.waypoints = [];
              }
              for (const extraId of restTargets) {
                if (
                  !d.edges.some((x) =>
                    matchesWire(x, {
                      ...existing,
                      target: extraId,
                      targetPort,
                    }),
                  )
                ) {
                  d.edges.push({
                    ...structuredClone(existing),
                    id: uid(),
                    target: extraId,
                    targetPort,
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
          const dropWorld = toWorld(
            docRef.current.viewport,
            vpRect,
            endEv.clientX,
            endEv.clientY,
          );
          if (
            !hit?.closest(".fs-viewport") ||
            hit.closest(".node,.workflow-group,.fs-minimap,.fs-canvas-controls") ||
            nodeAtPoint(dropWorld)
          )
            return;
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
      viewportRef,
      docRef,
      lod,
      keepExpandedIds,
      endpointIndex,
      closeInputHubImmediate,
      setIsDragging,
      resolveSnapTarget,
      setConnecting,
      setSelection,
      setInspectorOpen,
      trackPointer,
      edit,
      showToast,
      nodeAtPoint,
    ],
  );

  const startWaypointDrag = useCallback((ev: ReactPointerEvent, edgeId: string, wpIndex: number) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    const rect = viewportRef.current?.getBoundingClientRect();
    const original = docRef.current.edges.find(edge => edge.id === edgeId)?.waypoints;
    if (!rect || !original?.[wpIndex]) return;
    const affectedEdgeIds = new Set([edgeId]);
    const deltas = new Map<string, DragDelta>();
    let waypointEdit: DragSession["waypointEdit"];
    trackPointer(ev, pointer => {
      const point = toWorld(docRef.current.viewport, rect, pointer.clientX, pointer.clientY);
      waypointEdit = { edgeId, waypoints: original.map((waypoint, index) => index === wpIndex ? point : waypoint) };
      interactionStore.setDrag({ mode: "waypoint", deltas, affectedEdgeIds, waypointEdit });
    }, (_, canceled) => {
      flushSync(() => {
        if (!canceled && waypointEdit) commitGeometry({ edge: { id: edgeId, waypoints: waypointEdit.waypoints } });
        interactionStore.setDrag(null);
      });
    });
  }, [viewportRef, docRef, trackPointer, interactionStore, commitGeometry]);

  const startMarquee = useCallback(
    (ev: ReactPointerEvent) => {
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const start = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY,
      );
      const baseNodes = new Set(ev.shiftKey ? selection.nodes : []);
      let marqueeBox: Box | undefined;
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
          marqueeBox = { x, y, w, h };
          const v = docRef.current.viewport;
          interactionStore.setMarquee({
            x: x * v.zoom + v.x,
            y: y * v.zoom + v.y,
            w: w * v.zoom,
            h: h * v.zoom,
          });
        },
        (_, canceled) => {
          interactionStore.setMarquee(null);
          if (canceled || !marqueeBox) return;
          const { x, y, w, h } = marqueeBox;
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
      );
    },
    [
      viewportRef,
      docRef,
      selection.nodes,
      interactionStore,
      setSelection,
      trackPointer,
      isNodeVisible,
      lod,
      keepExpandedIds,
    ],
  );

  return {
    trackPointer,
    startPan,
    startNodeMove,
    startGroupMove,
    startResize,
    openInputHub,
    scheduleCloseInputHub,
    activeHubLayout,
    wireLayouts,
    startPortDrag,
    startStaffDrag,
    staffDrag,
    staffTip,
    staffTarget,
    staffWires,
    startInputEdgeDrag,
    startWaypointDrag,
    startMarquee,
  };
}
