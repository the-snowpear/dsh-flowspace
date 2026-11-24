import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { FlowspaceDocument, FlowspaceSnapshot } from "../../types.ts";
import { paintLayer, settleLayer } from "../cameraFrame.ts";
import {
  bounds,
  clamp,
  collapsedAncestor,
  comfortableFit,
  easeView,
  fit,
  groupBox,
  LOD_ZOOM,
  MOTION,
  nodeBox,
  zoomAt,
  type Box,
} from "../geometry.ts";
import { encloses, padded, viewportBox } from "../sceneModel.ts";
import type { RouteId } from "./canvasGraphOps.ts";
import {
  applyGridFrame,
  CURSOR_HALO_R,
  CURSOR_HALO_TAU_MS,
  CURSOR_LENS_R,
  CURSOR_LENS_TAU_MS,
  miniViewRect,
  tileOffset,
  typeScaleFor,
  VIEW_COMMIT_IDLE_MS,
  viewAtDetailBoundary,
  WHEEL_GLIDE_TAU_MS,
  worldTransform,
  type MiniFrame,
} from "./viewportMath.ts";
import type { CanvasInteractionStore } from "./interactionStore.ts";

export interface UseCanvasViewportOptions {
  interactionStore: CanvasInteractionStore;
  rootRef: RefObject<HTMLDivElement>;
  viewportRef: RefObject<HTMLDivElement>;
  docRef: MutableRefObject<FlowspaceDocument>;
  setDoc: Dispatch<SetStateAction<FlowspaceDocument>>;
  revision: MutableRefObject<number>;
  dirty: MutableRefObject<boolean>;
  setSaved: Dispatch<SetStateAction<boolean>>;
  saveTimer: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  flush: () => Promise<void>;
  reportError: (err: unknown) => void;
  snapshot: FlowspaceSnapshot | null;
  view: FlowspaceDocument["viewport"];
  vpSize: { width: number; height: number };
  lod: boolean;
  rasterScene: boolean;
  reducedMotion: boolean;
  routeName: RouteId;
  minimapOpen: boolean;
  wheelPref: "zoom" | "pan";
  replayActive?: boolean;
}

export function useCanvasViewport({
  interactionStore,
  rootRef,
  viewportRef,
  docRef,
  setDoc,
  revision,
  dirty,
  setSaved,
  saveTimer,
  flush,
  reportError,
  snapshot,
  view,
  vpSize,
  lod,
  rasterScene,
  reducedMotion,
  routeName,
  minimapOpen,
  wheelPref,
  replayActive = false,
}: UseCanvasViewportOptions) {
  const viewAnimToken = useRef(0);
  const worldRef = useRef<HTMLDivElement>(null);
  const groupsLayerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const rasterView = useRef<FlowspaceDocument["viewport"]>();
  const gridRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLButtonElement>(null);
  const miniViewportRef = useRef<SVGRectElement>(null);
  const miniFrameRef = useRef<MiniFrame | null>(null);
  const cursorFxRef = useRef<HTMLDivElement>(null);
  const cursorHaloRef = useRef<HTMLDivElement>(null);
  const cursorLensRef = useRef<HTMLDivElement>(null);
  const lensGridRef = useRef<HTMLDivElement>(null);
  const gridFrameRef = useRef<ReturnType<typeof applyGridFrame>>();
  const viewCommitTimer = useRef<ReturnType<typeof setTimeout>>();
  const movingTimer = useRef<ReturnType<typeof setTimeout>>();
  const committedLodRef = useRef(false);
  committedLodRef.current = lod;
  const typeScaleRef = useRef<{ world: HTMLElement; lod: boolean; scale: number }>();
  const wheelTargetRef = useRef<{
    view: { x: number; y: number; zoom: number };
    anchor: { x: number; y: number };
  } | null>(null);
  const wheelRafRef = useRef(0);
  const initialFitDone = useRef(false);

  const paintAreaRef = useRef<Box>(
    padded(viewportBox(view, vpSize), 128 / view.zoom),
  );
  const paintArea = useMemo(() => {
    const viewport = viewportBox(view, vpSize);
    const old = paintAreaRef.current;
    if (
      encloses(old, viewport) &&
      old.w < viewport.w * 1.45 &&
      old.h < viewport.h * 1.65
    ) {
      return old;
    }
    const target = wheelTargetRef.current?.view;
    if (rasterScene && target && target.zoom < view.zoom) {
      const end =
        lod || target.zoom >= LOD_ZOOM
          ? target
          : viewAtDetailBoundary(view, target);
      const ahead = bounds([viewport, viewportBox(end, vpSize)]);
      if (ahead.w <= viewport.w * 2 && ahead.h <= viewport.h * 2) {
        return padded(ahead, 96 / end.zoom);
      }
    }
    return padded(viewport, 96 / view.zoom);
  }, [view, vpSize, lod, rasterScene]);
  useLayoutEffect(() => {
    paintAreaRef.current = paintArea;
  }, [paintArea]);

  /* Cursor light: halo + dot lens on compositor-only layers */
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const cursorFx = useRef({
    tx: 0,
    ty: 0,
    lx: 0,
    ly: 0,
    hx: 0,
    hy: 0,
    raf: 0,
    last: 0,
    primed: false,
  });

  const paintCursorLensGrid = useCallback(() => {
    const lensGrid = lensGridRef.current;
    const frame = gridFrameRef.current;
    if (!lensGrid || !frame) return;
    const s = cursorFx.current;
    const x = tileOffset(frame.x + CURSOR_LENS_R - s.lx, frame.period);
    const y = tileOffset(frame.y + CURSOR_LENS_R - s.ly, frame.period);
    paintLayer(lensGrid, {
      transform: `translate3d(${x}px, ${y}px, 0) scale(${frame.scale})`,
    });
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
      paintLayer(halo, {
        transform: `translate3d(${s.hx - CURSOR_HALO_R}px, ${s.hy - CURSOR_HALO_R}px, 0)`,
      });
      paintLayer(lens, {
        transform: `translate3d(${s.lx - CURSOR_LENS_R}px, ${s.ly - CURSOR_LENS_R}px, 0)`,
      });
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
    if (replayActive) return;
    const vp = viewportRef.current;
    const root = cursorFxRef.current;
    if (!vp || !root) return;
    const layers = [
      cursorHaloRef.current,
      cursorLensRef.current,
      lensGridRef.current,
    ];
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
  }, [stepCursorFx, viewportRef, replayActive]);

  /* Liquid-glass capsule pointer glint */
  useEffect(() => {
    if (replayActive) return;
    const root = rootRef.current;
    if (!root) return;
    const CAPSULE =
      ".canvas-title, .toolbar-actions, .pointer-tools, .view-tools, .fs-minimap";
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
      lit =
        ((ev.target as Element | null)?.closest?.(CAPSULE) as HTMLElement | null) ??
        null;
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
  }, [rootRef, replayActive]);

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
        } else if (
          settle ||
          !base ||
          base.zoom < LOD_ZOOM !== v.zoom < LOD_ZOOM
        ) {
          world.style.transform = worldTransform(v);
          settleLayer(world);
          settleLayer(camera);
          rasterView.current = v;
        } else {
          const zoom = v.zoom / base.zoom;
          paintLayer(camera, {
            transform: worldTransform({
              x: v.x - base.x * zoom,
              y: v.y - base.y * zoom,
              zoom,
            }),
          });
        }
        const compact = v.zoom < LOD_ZOOM;
        const previous = typeScaleRef.current;
        if (settle || previous?.lod !== compact || previous.world !== world) {
          const scale = typeScaleFor(v.zoom);
          if (previous?.world !== world || previous.scale !== scale) {
            // Overview tiles own their typography. Full DOM cards keep a stable
            // inherited scale during the handoff and while native bodies are hidden.
            groupsLayerRef.current?.style.setProperty("--fs-type-scale", String(scale));
          }
          typeScaleRef.current = { world, lod: compact, scale };
        }
      }
      interactionStore.setCamera({
        ...v, moving: !settle, lod: v.zoom < LOD_ZOOM,
        zoomBucket: typeScaleRef.current?.scale ?? typeScaleFor(v.zoom),
      });
      const grid = gridRef.current;
      if (grid) {
        gridFrameRef.current = applyGridFrame(
          grid,
          v,
          settle,
          lensGridRef.current,
        );
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
        } else {
          paintLayer(miniRect, {
            x: `${r.x}px`,
            y: `${r.y}px`,
            width: `${r.w}px`,
            height: `${r.h}px`,
          });
        }
      }
    },
    [paintCursorLensGrid, rasterScene, interactionStore],
  );

  const markViewMoving = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    if (!world.dataset.moving) world.dataset.moving = "1";
    clearTimeout(movingTimer.current);
    movingTimer.current = setTimeout(() => {
      delete world.dataset.moving;
      applyViewToDom(docRef.current.viewport, true);
    }, 200);
  }, [applyViewToDom, docRef]);

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
      if (
        nextLod !== committedLodRef.current ||
        !encloses(paintAreaRef.current, nextBox)
      ) {
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
    [
      applyViewToDom,
      markViewMoving,
      flush,
      reportError,
      vpSize,
      docRef,
      revision,
      dirty,
      setSaved,
      setDoc,
      saveTimer,
    ],
  );

  /* Initial auto-fit on first host snapshot if viewport is at default origin */
  useEffect(() => {
    if (!snapshot || initialFitDone.current) return;
    initialFitDone.current = true;
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
  }, [snapshot, viewportRef, docRef, setViewportDirect]);

  useEffect(
    () => () => {
      viewAnimToken.current++;
      clearTimeout(viewCommitTimer.current);
      clearTimeout(movingTimer.current);
      cancelAnimationFrame(wheelRafRef.current);
    },
    [],
  );

  useLayoutEffect(() => {
    applyViewToDom(docRef.current.viewport, !worldRef.current?.dataset.moving);
  }, [applyViewToDom, view, routeName, minimapOpen, docRef]);

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
      const started = performance.now();
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
    [reducedMotion, setViewportDirect, docRef],
  );

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
        const goalView = goal.view;
        const zoom = Math.exp(
          Math.log(cur.zoom) + (Math.log(goalView.zoom) - Math.log(cur.zoom)) * k,
        );
        let x: number, y: number;
        if (Math.abs(goalView.zoom - cur.zoom) > 1e-5) {
          const wx = (goal.anchor.x - goalView.x) / goalView.zoom;
          const wy = (goal.anchor.y - goalView.y) / goalView.zoom;
          x = goal.anchor.x - wx * zoom;
          y = goal.anchor.y - wy * zoom;
        } else {
          x = cur.x + (goalView.x - cur.x) * k;
          y = cur.y + (goalView.y - cur.y) * k;
        }
        const settled =
          Math.abs(goalView.zoom - zoom) < 1e-4 &&
          Math.abs(goalView.x - x) < 0.3 &&
          Math.abs(goalView.y - y) < 0.3;
        setViewportDirect(settled ? goalView : { x, y, zoom }, 400);
        if (settled) {
          wheelTargetRef.current = null;
          wheelRafRef.current = 0;
          return;
        }
        wheelRafRef.current = requestAnimationFrame(tick);
      };
      wheelRafRef.current = requestAnimationFrame(tick);
    },
    [reducedMotion, setViewportDirect, docRef],
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
    [vpSize.width, vpSize.height, animateView, viewportRef],
  );

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
    [vpSize.width, vpSize.height, animateView, viewportRef],
  );

  /* Wheel Zoom / Pan on Canvas Viewport */
  useEffect(() => {
    if (replayActive) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (ev: WheelEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target?.closest(".fs-canvas-controls, .fs-minimap")) return;
      if (!ev.ctrlKey && target?.closest(".node.full")) return;
      ev.preventDefault();
      viewAnimToken.current++;
      const base = wheelTargetRef.current?.view ?? docRef.current.viewport;
      const rect = vp.getBoundingClientRect();
      const anchor = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      const unit =
        ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? rect.height : 1;
      const dx = ev.deltaX * unit;
      const dy = ev.deltaY * unit;
      if (wheelPref === "pan" && !ev.ctrlKey) {
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
  }, [wheelPref, glideViewTo, viewportRef, docRef, replayActive]);

  return {
    paintArea,
    worldRef,
    groupsLayerRef,
    cameraRef,
    gridRef,
    zoomLabelRef,
    miniViewportRef,
    miniFrameRef,
    cursorFxRef,
    cursorHaloRef,
    cursorLensRef,
    lensGridRef,
    viewAnimToken,
    wheelTargetRef,
    setViewportDirect,
    animateView,
    glideViewTo,
    fitBoxes,
    fitComfortably,
  };
}
