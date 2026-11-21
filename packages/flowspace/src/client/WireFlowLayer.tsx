import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { FlowEdge } from "../types.ts";
import type { Box } from "./geometry.ts";
import { intersects, padded } from "./sceneModel.ts";
import { pathTouches } from "./sceneWires.ts";
import { wireMesh, wireFlowProgram, type WireFlowMesh } from "./wireFlowMesh.ts";
import type { WireRoute } from "./wireRouting.ts";

const MIN_ACTIVE_WIRES = 12;
const PERIOD = 1500;

interface FlowWire {
  edge: FlowEdge;
  geom: WireRoute;
  extent: Box;
  evState: string;
}

interface WireMesh extends WireFlowMesh {
  path: string;
  group: SVGGElement;
  start: number;
}

const overlaps = new WeakMap<WireRoute, WeakMap<WireRoute, boolean>>();

function mayOverlap(wire: FlowWire, other: FlowWire) {
  if (!intersects(wire.extent, other.extent)) return false;
  let compared = overlaps.get(wire.geom);
  if (!compared) {
    compared = new WeakMap();
    overlaps.set(wire.geom, compared);
  }
  const cached = compared.get(other.geom);
  if (cached !== undefined) return cached;
  for (const leg of wire.geom.legs) {
    for (let i = 1; i < leg.length; i++) {
      const a = leg[i - 1], b = leg[i];
      const segment = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
        w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
      if (pathTouches(other.geom, padded(segment, 8), other.extent)) {
        compared.set(other.geom, true);
        return true;
      }
    }
  }
  compared.set(other.geom, false);
  return false;
}

function animationTime(path: SVGPathElement) {
  const animation = path.getAnimations().find(
    animation => (animation as CSSAnimation).animationName === "fs-wire-travel",
  );
  const time = Number(animation?.currentTime ?? 0) - Number(animation?.effect?.getTiming().delay ?? 0);
  return Math.max(0, time) % PERIOD;
}

function strokeColor(path: SVGPathElement) {
  const style = getComputedStyle(path);
  const swatch = document.createElement("canvas");
  swatch.width = swatch.height = 1;
  const ctx = swatch.getContext("2d")!;
  ctx.fillStyle = style.stroke;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255 * Number(style.opacity)];
}

class FlowSurface {
  private program?: ReturnType<typeof wireFlowProgram>;
  private meshes = new Map<string, WireMesh>();
  private frame = 0;
  private box?: Box;
  private zoom = 1;
  private light: number[] = [];
  private glow: number[] = [];
  private theme?: string;
  private max = 0;
  private failed = false;
  private last?: { wires: FlowWire[]; box: Box; zoom: number; theme: string };

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener("webglcontextlost", this.lost);
    canvas.addEventListener("webglcontextrestored", this.restored);
    document.addEventListener("visibilitychange", this.visibility);
  }

  private lost = (event: Event) => {
    event.preventDefault();
    this.stop();
    this.program = undefined;
    this.failed = true;
    this.theme = undefined;
  };

  private restored = () => {
    this.failed = false;
    const last = this.last;
    if (last) this.update(last.wires, last.box, last.zoom, last.theme);
  };
  private visibility = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (!document.hidden && this.meshes.size) this.frame = requestAnimationFrame(this.tick);
  };

  private release(mesh: WireMesh) {
    if (mesh.group.dataset.flowWire !== undefined) {
      const time = (performance.now() - mesh.start) % PERIOD;
      mesh.group.style.setProperty("--fs-wire-flow-delay", `${-time}ms`);
    } else {
      mesh.group.style.removeProperty("--fs-wire-flow-delay");
    }
    delete mesh.group.dataset.gpuFlow;
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const mesh of this.meshes.values()) this.release(mesh);
    this.meshes.clear();
    if (!this.canvas.hidden) this.canvas.hidden = true;
  }

  update(wires: FlowWire[], box: Box, zoom: number, theme: string) {
    this.last = { wires, box, zoom, theme };
    if (!wires.length || this.failed) {
      this.stop();
      return;
    }
    if (!this.program) {
      const gl = this.canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true });
      if (!gl) {
        this.failed = true;
        return;
      }
      try {
        this.program = wireFlowProgram(gl);
        const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
        this.max = Math.min(viewport[0], viewport[1], gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
      } catch {
        this.failed = true;
        return;
      }
    }

    const groups = new Map(Array.from(this.canvas.closest("svg")!.querySelectorAll<SVGGElement>("g[data-flow-wire]"))
      .map(group => [group.dataset.flowWire!, group]));
    const requested = new Set(wires.map(wire => wire.edge.id));
    let changed = false;
    for (const [id, mesh] of this.meshes) {
      if (requested.has(id) && groups.get(id) === mesh.group) continue;
      this.release(mesh);
      this.meshes.delete(id);
      changed = true;
    }
    for (const { edge, geom } of wires) {
      const id = edge.id;
      const group = groups.get(id);
      if (!group) continue;
      const previous = this.meshes.get(id);
      if (previous?.path === geom.path) continue;
      const path = group.querySelector<SVGPathElement>(".edge-flow")!;
      const start = previous?.start ?? performance.now() - animationTime(path);
      const mesh = wireMesh(path, (start % PERIOD) / PERIOD);
      changed = true;
      if (!mesh) {
        if (previous) this.release(previous);
        this.meshes.delete(id);
        continue;
      }
      this.meshes.set(id, { ...mesh, path: geom.path, group, start });
    }
    if (!this.meshes.size) {
      this.stop();
      return;
    }
    const recolor = theme !== this.theme;
    if (recolor) {
      this.theme = theme;
      const group = this.meshes.values().next().value!.group;
      this.light = strokeColor(group.querySelector(".edge-flow")!);
      this.glow = strokeColor(group.querySelector(".edge-glow")!);
    }
    const refresh = changed || recolor || this.box !== box || this.zoom !== zoom;
    this.box = box;
    this.zoom = zoom;
    if (changed) this.program.upload([...this.meshes.values()]);
    if (refresh) this.draw(performance.now());
    if (!this.meshes.size) return;
    this.canvas.hidden = false;
    for (const { group } of this.meshes.values()) {
      if (group.dataset.gpuFlow === undefined) group.dataset.gpuFlow = "";
    }
    if (!this.frame && this.meshes.size && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  }

  private draw(now: number) {
    const box = this.box!;
    const density = this.zoom * devicePixelRatio;
    const width = Math.ceil(box.w * density), height = Math.ceil(box.h * density);
    if (width > this.max || height > this.max || !width || !height) {
      this.stop();
      return;
    }
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.program!.clear(width, height, box, this.light, this.glow);
    this.program!.draw((now % PERIOD) / PERIOD);
  }

  private tick = (now: number) => {
    this.frame = 0;
    this.draw(now);
    if (this.meshes.size && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.stop();
    this.program?.dispose();
    this.canvas.removeEventListener("webglcontextlost", this.lost);
    this.canvas.removeEventListener("webglcontextrestored", this.restored);
    document.removeEventListener("visibilitychange", this.visibility);
  }
}

export const WireFlowLayer = memo(function WireFlowLayer({ wires, area, viewport, zoom, theme, enabled, spotlight, selected, reconnecting }: {
  wires: FlowWire[];
  area: Box;
  viewport: Box;
  zoom: number;
  theme: string;
  enabled: boolean;
  spotlight: string | null;
  selected: string | null;
  reconnecting?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const painter = useRef<FlowSurface>();
  const eligible = useMemo(() => {
    if (!enabled) return [];
    const active = wires.filter(wire => wire.edge.kind === "continuation" && wire.evState === "active" &&
      pathTouches(wire.geom, viewport, wire.extent));
    if (active.length < MIN_ACTIVE_WIRES) return [];
    return active.filter(wire => wire.edge.id !== spotlight && wire.edge.id !== selected && wire.edge.id !== reconnecting &&
      !wire.edge.waypoints?.length && !wires.some(other => wire !== other && mayOverlap(wire, other)));
  }, [enabled, wires, viewport, spotlight, selected, reconnecting]);
  useLayoutEffect(() => {
    const surface = painter.current = new FlowSurface(canvas.current!);
    return () => surface.dispose();
  }, []);
  useLayoutEffect(() => painter.current!.update(eligible, area, zoom, theme), [eligible, area, zoom, theme]);
  return <foreignObject x={area.x} y={area.y} width={area.w} height={area.h} pointerEvents="none">
    <canvas ref={canvas} className="fs-wire-flow-canvas" hidden />
  </foreignObject>;
});
