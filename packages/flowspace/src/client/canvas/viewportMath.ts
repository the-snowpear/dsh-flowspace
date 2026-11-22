import type { FlowspaceDocument } from "../../types.ts";
import { paintLayer, settleLayer } from "../cameraFrame.ts";
import { clamp, LOD_ZOOM } from "../geometry.ts";

/** How many times an embedded conversation retries `sessions.retain` before reporting. */
export const EMBED_RETAIN_ATTEMPTS = 6;
/** React state follows the live viewport only after the gesture has been idle this long. */
export const VIEW_COMMIT_IDLE_MS = 160;
/** Reserve bitmap backing and forward viewport coverage for canvases with many elements. */
export const RASTER_SCENE_NODES = 64;
/** Time constant of the eased wheel glide (smaller = snappier). */
export const WHEEL_GLIDE_TAU_MS = 72;
/** Time constant of the momentum decay after a fling-pan. */
export const PAN_INERTIA_TAU_MS = 300;
/** Grid layer overscan; must exceed the widest on-screen major cell (24 × 5 × 2.2 × 1.25). */
export const GRID_OVERSCAN = 360;
/** The grid layer is re-tiled once its live scale drifts outside this band. */
export const GRID_REBASE_MIN = 0.8;
export const GRID_REBASE_MAX = 1.25;
/** Cursor-light follow constants: the lens tracks tightly, the halo trails like liquid. */
export const CURSOR_LENS_TAU_MS = 34;
export const CURSOR_HALO_TAU_MS = 120;
export const CURSOR_LENS_R = 150;
export const CURSOR_HALO_R = 280;

export function worldTransform(v: { x: number; y: number; zoom: number }): string {
  return `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
}

export function viewAtDetailBoundary(
  from: FlowspaceDocument["viewport"],
  target: FlowspaceDocument["viewport"],
) {
  const fraction = (LOD_ZOOM - from.zoom) / (target.zoom - from.zoom);
  return {
    x: from.x + (target.x - from.x) * fraction,
    y: from.y + (target.y - from.y) * fraction,
    zoom: LOD_ZOOM,
  };
}

/** Semantic-zoom text compensation, quantised so zooming does not relayout every frame. */
export function typeScaleFor(zoom: number): number {
  return zoom < LOD_ZOOM ? Math.round(clamp(1 / zoom, 1, 2.6) * 10) / 10 : 1;
}

/** Zoom at which each grid layer's tiles were last rasterised. */
const gridBaseZoom = new WeakMap<HTMLElement, number>();

/** A repeating texture needs at most one tile before the visible origin. */
export function tileOffset(offset: number, period: number) {
  return offset - Math.ceil(offset / period) * period;
}

/**
 * Moves the dot-grid layer with a pure compositor transform. While zooming, the cached
 * tiles are scaled instead of re-tiled; they are re-rasterised crisply when the view
 * settles (`settle`) or once the scale drifts past the rebase band.
 */
export function applyGridFrame(
  grid: HTMLElement,
  v: { x: number; y: number; zoom: number },
  settle = false,
  lensGrid: HTMLElement | null = null,
) {
  let base = gridBaseZoom.get(grid);
  const drift = base ? v.zoom / base : 0;
  if (
    !base ||
    drift < GRID_REBASE_MIN ||
    drift > GRID_REBASE_MAX ||
    (settle && base !== v.zoom)
  ) {
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
      const side = Math.ceil((2 * CURSOR_LENS_R) / GRID_REBASE_MIN + major + 2);
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
  const tx = phase(v.x);
  const ty = phase(v.y);
  const x = tileOffset(tx - GRID_OVERSCAN, period);
  const y = tileOffset(ty - GRID_OVERSCAN, period);
  const transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  if (settle) {
    grid.style.transform = transform;
    settleLayer(grid);
  } else {
    paintLayer(grid, { transform });
  }
  return { x, y, period, scale };
}

/** Minimap projection: world frame → map pixels, plus the live camera size. */
export type MiniFrame = {
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
export function miniViewRect(
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
