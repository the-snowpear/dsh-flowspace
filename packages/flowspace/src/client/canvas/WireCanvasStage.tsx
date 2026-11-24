import { memo, useLayoutEffect, useRef } from "react";
import { staffPath } from "../childTree.ts";
import { exchangeRoute } from "../geometry.ts";
import { encloses, intersects, padded, type Box } from "../boxes.ts";
import { cachedPath2D, guidePathInArea, pathExtent, pathTouches, sampleWirePath, type CachedWire } from "../sceneWires.ts";
import { runtimeIndex, viewportBox } from "../sceneModel.ts";
import { wireFlowProgram, wireMeshFromPath, type WireFlowMesh } from "../wireFlowMesh.ts";
import { routePath } from "../wireRouting.ts";
import { isRemovedLaneWire } from "../nodes/FanoutView.tsx";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { useCanvasInteractionStore, type CanvasInteractionStore, type HoverSnapshot } from "./interactionStore.ts";
import { WireImageCache, type WireImage } from "./wireImageCache.ts";
import { previewDragWire, usePausedDragRouting } from "./layers/dragWires.tsx";
import { readWirePalette, wireInk, type WireInk, type WirePalette } from "./wireCanvasPalette.ts";
import { useStageGuides, type StageGuide, type StageSceneProps } from "./wireStageScene.ts";

type StageProps = StageSceneProps & Pick<CanvasWorldProps,
  "wireLayouts" | "vpSize" | "displayedTheme" | "reducedMotion" | "routeName" |
  "selection" | "connecting" | "routingBoxes" | "routingBoxesById" | "writeByEdge"
>;

interface Stroke {
  entry: { path: string; extent: Box; path2d?: Path2D; cached?: CachedWire };
  ink: WireInk;
  dx: number;
  dy: number;
  arrow?: boolean;
  dots?: boolean;
  clip?: Box[];
  workflow?: boolean;
  edgeId?: string;
  guideId?: string;
  guide?: boolean;
  phase?: number;
  expires?: number;
}

const pathCache = new WeakMap<object, Stroke["entry"]>();
const meshCache = new WeakMap<object, Map<number, WireFlowMesh | undefined>>();
const guideClips = new WeakMap<object, { area: Box; path: Path2D }>();
interface GuideScratch {
  canvas: OffscreenCanvas;
  image: WireImage;
  excluded: StageGuide[];
}
interface DragScratch {
  canvas: OffscreenCanvas;
  image: WireImage;
  excluded: ReadonlySet<string>;
}

function entryFor(wire: StageProps["wireLayouts"][number]) {
  let entry = pathCache.get(wire.geom);
  if (!entry) {
    entry = { path: wire.geom.path, extent: wire.extent };
    pathCache.set(wire.geom, entry);
  }
  return entry;
}

function translatedGuide(guide: StageGuide, store: CanvasInteractionStore): Stroke {
  const drag = store.getDrag();
  const fromDelta = guide.sourceId && drag?.deltas.get(guide.sourceId);
  const toDelta = guide.targetId && drag?.deltas.get(guide.targetId);
  const a = fromDelta || { dx: 0, dy: 0 }, b = toDelta || { dx: 0, dy: 0 };
  const stroke = { ...guide, dx: a.dx, dy: a.dy, guide: true, guideId: guide.id };
  if (a.dx === b.dx && a.dy === b.dy) return stroke;
  if (guide.exchange) {
    const boxA = { ...guide.exchange.a, x: guide.exchange.a.x + a.dx, y: guide.exchange.a.y + a.dy };
    const boxB = { ...guide.exchange.b, x: guide.exchange.b.x + b.dx, y: guide.exchange.b.y + b.dy };
    const path = exchangeRoute(boxA, boxB)[guide.exchange.direction];
    return { ...stroke, entry: { path, extent: pathExtent(path) }, clip: [boxA, boxB], dx: 0, dy: 0 };
  }
  if (!guide.from || !guide.to) return { ...stroke, dx: 0, dy: 0 };
  const shift = (end: typeof guide.from, delta: typeof a) => ({ ...end, x: end.x + delta.dx, y: end.y + delta.dy,
    box: end.box && { ...end.box, x: end.box.x + delta.dx, y: end.box.y + delta.dy } });
  const from = shift(guide.from, a), to = shift(guide.to, b);
  const path = guide.shape === "staff" ? staffPath(from, to) : guide.shape === "line"
    ? `M ${from.x} ${from.y} L ${to.x} ${to.y}` : routePath(from, to, { mode: "overlap" });
  return { ...stroke, entry: { path, extent: pathExtent(path) }, dx: 0, dy: 0 };
}

function sameInk(a: WireInk, b: WireInk) {
  return a.color === b.color && a.alpha === b.alpha && a.width === b.width &&
    a.animation === b.animation && a.dash.join() === b.dash.join();
}

class WireSurface {
  private props!: StageProps;
  private guides: StageGuide[] = [];
  private palette!: WirePalette;
  private theme?: string;
  private colors = new Map<string, number[]>();
  private strokes: Stroke[] = [];
  private workflowSources: { strokes: Stroke[]; token: object }[] = [];
  private guideSources: { guides: StageGuide[]; token: object }[] = [];
  private workflowCacheToken: object = {};
  private guideCacheToken: object = {};
  private movingStrokes: Stroke[] = [];
  private baseStrokes = new Map<string, Stroke>();
  private wiresById = new Map<string, StageProps["wireLayouts"][number]>();
  private baseAnimations: Stroke[] = [];
  private movingGuides: StageGuide[] = [];
  private staticGuides: StageGuide[] = [];
  private animatedGuides: StageGuide[] = [];
  private guideStrokes: Stroke[] = [];
  private selectedEdges = new Set<string>();
  private hoverEdge: string | null = null;
  private hoverStaff: string | null = null;
  private lastDragKeys = "";
  private guidesDirty = true;
  private animated: Stroke[] = [];
  private epoch = performance.now();
  private pulsePhases = new Map<string, number>();
  private frame = 0;
  private dirty = true;
  private meshDirty = true;
  private contextLost = false;
  private gpuUnavailable = false;
  private gl?: WebGL2RenderingContext;
  private program?: ReturnType<typeof wireFlowProgram>;
  private unsubscribe: (() => void)[];
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private guideImages = new WireImageCache();
  private staticImages = new WireImageCache();
  private guideScratch?: GuideScratch;
  private dragScratch?: DragScratch;
  private gpuSignature = "";
  private gpuFocus = "";

  constructor(private canvas: HTMLCanvasElement, private flow: HTMLCanvasElement, private store: CanvasInteractionStore) {
    this.ctx = canvas.getContext("2d")!;
    this.unsubscribe = [
      store.subscribeCamera(this.schedule), store.subscribeDrag(this.applyDrag),
      store.subscribeDragRoutes(this.applyDrag), store.subscribeHover(this.hoverChanged),
    ];
    flow.addEventListener("webglcontextlost", this.lost);
    flow.addEventListener("webglcontextrestored", this.restored);
    document.addEventListener("visibilitychange", this.visibility);
  }

  update(props: StageProps, guides: StageGuide[]) {
    const previous = this.props;
    const rebuild = !previous || guides !== this.guides || props.wireLayouts !== previous.wireLayouts ||
      props.reducedMotion !== previous.reducedMotion || props.routeName !== previous.routeName ||
      props.displayedTheme !== previous.displayedTheme || props.writeByEdge !== previous.writeByEdge;
    this.props = props;
    this.guides = guides;
    if (!previous || previous.wireLayouts !== props.wireLayouts) props.wireScene.cache.setHitWires(props.wireLayouts);
    if (this.theme !== props.displayedTheme) {
      this.theme = props.displayedTheme;
      this.palette = readWirePalette(this.canvas.closest(".fs-root") ?? this.canvas);
      this.colors.clear();
    }
    if (!previous || previous.selection !== props.selection || previous.wireLayouts !== props.wireLayouts) {
      const selectedNodes = new Set(props.selection.nodes);
      this.selectedEdges = new Set(props.selection.edge ? [props.selection.edge] : props.wireLayouts
        .filter(wire => selectedNodes.has(wire.edge.source) || selectedNodes.has(wire.edge.target)).map(wire => wire.edge.id));
    }
    if (rebuild) this.rebuild();
    else this.schedule();
  }

  private rebuild = () => {
    if (!this.props) return;
    const props = this.props;
    this.baseStrokes.clear();
    this.wiresById.clear();
    const pulses: Stroke[] = [];
    const activePulseKeys = new Set<string>();
    const now = Date.now();
    const perfNow = performance.now();
    const runtime = runtimeIndex(props.snapshot);
    for (const wire of props.wireLayouts) {
      const { edge } = wire;
      const cached = props.wireScene.cache.cachedEdge(edge.id);
      const entry = entryFor(wire), dx = 0, dy = 0;
      if (cached?.geom === wire.geom) entry.cached = cached;
      const ink = wireInk(wire);
      if (isRemovedLaneWire(edge, props.nodesById)) { ink.alpha *= 0.35; ink.animation = undefined; }
      this.baseStrokes.set(edge.id, { entry, ink, dx, dy, workflow: true, edgeId: edge.id });
      this.wiresById.set(edge.id, wire);
      const write = edge.kind === "reference" && !props.lod && props.writeByEdge.get(edge.id);
      const eventAt = edge.kind === "event" && runtime.latestToken.get(edge.id)?.createdAt;
      const at = write ? write.at : eventAt;
      const duration = write ? 1800 : 1400;
      if (at && now - at < duration) {
        const pulseKey = `${edge.id}:${at}`;
        activePulseKeys.add(pulseKey);
        let phase = this.pulsePhases.get(pulseKey);
        if (phase === undefined) {
          phase = (perfNow - (now - at) - this.epoch) / 1000;
          this.pulsePhases.set(pulseKey, phase);
        }
        pulses.push({ entry, dx, dy, edgeId: edge.id, expires: at + duration,
          phase,
          ink: { color: write ? "capUpdated" : "accent", width: 1.3, alpha: 1, dash: [], animation: write ? 4 : 5 } });
      }
    }
    for (const key of this.pulsePhases.keys()) if (!activePulseKeys.has(key)) this.pulsePhases.delete(key);
    const key = Number(props.lod);
    const strokes = [...this.baseStrokes.values()];
    const previousWorkflow = this.workflowSources[key];
    const sameWorkflow = previousWorkflow?.strokes.length === strokes.length && previousWorkflow.strokes.every((stroke, i) =>
      stroke.edgeId === strokes[i].edgeId && stroke.entry.path === strokes[i].entry.path && sameInk(stroke.ink, strokes[i].ink));
    this.workflowCacheToken = sameWorkflow ? previousWorkflow.token : {};
    this.strokes = strokes;
    this.workflowSources[key] = { strokes, token: this.workflowCacheToken };

    const guides = this.guides.filter(guide => guide.ink.animation === undefined);
    const previousGuides = this.guideSources[key];
    const sameGuides = previousGuides?.guides.length === guides.length && previousGuides.guides.every((guide, i) =>
      guide.id === guides[i].id && guide.entry.path === guides[i].entry.path && sameInk(guide.ink, guides[i].ink) &&
      guide.arrow === guides[i].arrow && guide.dots === guides[i].dots);
    this.guideCacheToken = sameGuides ? previousGuides.token : {};
    this.staticGuides = guides;
    this.guideSources[key] = { guides, token: this.guideCacheToken };
    this.animatedGuides = this.guides.filter(guide => guide.ink.animation !== undefined);
    this.baseAnimations = [...this.baseStrokes.values()].filter(stroke => stroke.ink.animation !== undefined).concat(pulses);
    this.guidesDirty = true;
    this.applyDrag();
  };

  private applyDrag = () => {
    if (!this.props) return;
    const drag = this.store.getDrag();
    const hidden = this.store.getHiddenEdgeIds();
    const dragKeys = drag ? [...drag.deltas.keys()].join(",") : "";
    if (this.guidesDirty || dragKeys !== this.lastDragKeys) {
      this.guidesDirty = false;
      this.lastDragKeys = dragKeys;
      this.movingGuides = drag ? this.staticGuides.filter(guide =>
        (guide.sourceId && drag.deltas.has(guide.sourceId)) || (guide.targetId && drag.deltas.has(guide.targetId))) : [];
    }
    const resolved = this.store.getDragRoutes();
    this.guideStrokes = [...this.animatedGuides, ...this.movingGuides].map(guide => translatedGuide(guide, this.store));
    this.movingStrokes = [];
    const moved = new Map<string, Stroke>();
    for (const id of hidden) {
      const wire = this.wiresById.get(id);
      const original = this.baseStrokes.get(id);
      if (!wire || !original || !drag) continue;
      const a = drag.deltas.get(wire.from.groupId ?? wire.edge.source);
      const b = drag.deltas.get(wire.to.groupId ?? wire.edge.target);
      const routed = resolved?.drag === drag && resolved.routes.get(id);
      let stroke: Stroke;
      if (!routed && a && b && a.dx === b.dx && a.dy === b.dy && !wire.edge.waypoints?.length && !drag.waypointEdit) {
        stroke = { ...original, dx: a.dx, dy: a.dy };
      } else {
        const preview = previewDragWire(wire, drag);
        stroke = { ...original, entry: entryFor(routed ? { ...preview, geom: routed.geom, extent: routed.extent } : preview) };
      }
      moved.set(id, stroke);
      this.movingStrokes.push(stroke);
    }
    this.animated = this.props.reducedMotion || this.props.routeName !== "canvas" ? [] :
      this.baseAnimations.map(stroke => {
        const current = stroke.edgeId && moved.get(stroke.edgeId);
        return current ? { ...stroke, entry: current.entry, dx: current.dx, dy: current.dy } : stroke;
      }).concat(this.guideStrokes.filter(stroke => stroke.ink.animation !== undefined));
    if (!this.animated.length && !this.pulsePhases.size) this.epoch = performance.now();
    this.meshDirty = true;
    this.schedule();
  };

  private hoverChanged = (hover: HoverSnapshot) => {
    const staff = hover.portKey?.startsWith("staff:") ? hover.portKey : null;
    if (this.hoverEdge === hover.edgeId && this.hoverStaff === staff) return;
    this.hoverEdge = hover.edgeId;
    this.hoverStaff = staff;
    this.schedule();
  };

  private focused(id: string) {
    return this.hoverEdge ? id === this.hoverEdge : this.selectedEdges.has(id);
  }

  private dimmed() {
    return Boolean(this.hoverEdge || this.props.selection.edge || this.props.selection.nodes.length);
  }

  private schedule = () => {
    this.dirty = true;
    if (!this.frame && this.props && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  };

  private lost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.program = undefined;
    this.gpuSignature = "";
    this.flow.dataset.gpuActive = "0";
    this.flow.dataset.renderer = "canvas2d";
    if (!this.flow.hidden) this.flow.hidden = true;
    this.schedule();
  };

  private restored = () => {
    this.contextLost = false;
    this.gpuUnavailable = false;
    this.meshDirty = true;
    this.schedule();
  };

  private visibility = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (!document.hidden) this.schedule();
  };

  private color(css: string, alpha: number) {
    const key = `${css}:${alpha}`;
    let color = this.colors.get(key);
    if (!color) {
      const swatch = document.createElement("canvas");
      swatch.width = swatch.height = 1;
      const ctx = swatch.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      color = [r / 255, g / 255, b / 255, a / 255 * alpha];
      this.colors.set(key, color);
    }
    return color;
  }

  private prepareGpu() {
    if (!this.animated.length || this.contextLost || this.gpuUnavailable) return;
    if (!this.program) {
      const gl = this.flow.getContext("webgl2", { alpha: true, premultipliedAlpha: true });
      if (!gl) { this.gpuUnavailable = true; return; }
      this.gl = gl;
      try { this.program = wireFlowProgram(gl); }
      catch { this.gpuUnavailable = true; return; }
    }
    const focus = `${this.hoverEdge}:${this.props.selection.edge}:${this.props.selection.nodes.join()}:${this.props.connecting?.reconnectingEdge?.id}`;
    if (!this.meshDirty && focus === this.gpuFocus) return;
    this.gpuFocus = focus;
    const signature = this.animated.map(({ entry, ink, dx, dy, phase }) =>
      `${entry.path}:${ink.color}:${ink.alpha}:${ink.animation}:${dx},${dy}:${phase}`).join("|") + this.theme + focus;
    this.meshDirty = false;
    if (signature === this.gpuSignature) return;
    this.gpuSignature = signature;
    const meshes = this.animated.flatMap(({ entry, ink, dx, dy, phase, edgeId }) => {
      if (edgeId && edgeId === this.props.connecting?.reconnectingEdge?.id) return [];
      let mesh: WireFlowMesh | undefined;
      if (phase !== undefined) {
        mesh = wireMeshFromPath(entry.path, phase, ink.animation!);
      } else {
        let kinds = meshCache.get(entry);
        if (!kinds) { kinds = new Map(); meshCache.set(entry, kinds); }
        if (!kinds.has(ink.animation!)) kinds.set(ink.animation!, wireMeshFromPath(entry.path, 0, ink.animation!));
        mesh = kinds.get(ink.animation!);
      }
      if (!mesh) return [];
      if (dx || dy) {
        const strip = mesh.strip.slice();
        for (let i = 0; i < strip.length; i += 7) { strip[i] += dx; strip[i + 1] += dy; }
        mesh = { strip };
      }
      const active = ink.animation === 0;
      const alpha = edgeId && this.dimmed() && !this.focused(edgeId) ? 0.22 : 1;
      const color = edgeId && edgeId === this.hoverEdge ? this.palette.accent : this.palette[ink.color];
      const scale = Math.min(1, ink.alpha / 0.45);
      return [{ mesh, light: this.color(active && edgeId !== this.hoverEdge ? this.palette.runningBright : color, scale * alpha),
        glow: this.color(color, (active ? 0.16 * scale : 0.2 * Math.min(1, ink.alpha / 0.75)) * alpha) }];
    });
    this.program.upload(meshes);
  }

  private visible(stroke: Stroke, area: Box) {
    const { extent } = stroke.entry;
    const shifted = { ...area, x: area.x - stroke.dx, y: area.y - stroke.dy };
    return intersects(extent, shifted) && (!stroke.guide || pathTouches(stroke.entry, shifted));
  }

  private path(stroke: Stroke, area: Box) {
    const { entry, dx, dy } = stroke;
    if (!stroke.guide || !stroke.ink.dash.length) return cachedPath2D(entry.cached ?? entry)!;
    const local = { ...area, x: area.x - dx, y: area.y - dy };
    let clipped = guideClips.get(entry);
    if (!clipped || !encloses(clipped.area, local)) {
      const region = padded(local, 160);
      clipped = { area: region, path: new Path2D(guidePathInArea(entry, region)) };
      guideClips.set(entry, clipped);
    }
    return clipped.path;
  }

  private stroke(stroke: Stroke, now?: number, region = viewportBox(this.store.getCamera(), this.props.vpSize),
    zoom = this.store.getCamera().zoom) {
    const { ctx, palette } = this;
    const { entry, ink, dx, dy } = stroke;
    const path = this.path(stroke, region);
    ctx.save();
    ctx.translate(dx, dy);
    if (stroke.clip) {
      const clip = new Path2D();
      clip.rect(region.x - dx, region.y - dy, region.w, region.h);
      for (const box of stroke.clip) clip.rect(box.x, box.y, box.w, box.h);
      ctx.clip(clip, "evenodd");
    }
    const hovered = stroke.edgeId !== undefined && stroke.edgeId === this.hoverEdge;
    const baseColor = hovered ? palette.accent : palette[ink.color];
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = ink.width;
    ctx.globalAlpha = ink.alpha;
    this.applyDash(ink.dash, zoom);
    if (now !== undefined) {
      const seconds = now / 1000;
      ctx.lineCap = "round";
      if (ink.animation === 0) {
        ctx.strokeStyle = hovered ? palette.accent : palette.runningBright;
        ctx.lineWidth = 2.1;
        ctx.globalAlpha = Math.min(1, ink.alpha / 0.45);
        ctx.setLineDash([26, 174]);
        ctx.lineDashOffset = -seconds * 200 / 1.5;
        ctx.stroke(path);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 7;
        ctx.globalAlpha *= 0.16;
        ctx.setLineDash([46, 154]);
        ctx.lineDashOffset += 10;
      } else if (ink.animation === 3) {
        ctx.lineWidth = 6;
        ctx.globalAlpha *= (0.14 + 0.06 * Math.cos(seconds * Math.PI * 2 / 2.6)) / 0.75;
        ctx.setLineDash([]);
      } else if (ink.animation! >= 4) {
        const lifetime = ink.animation === 4 ? 1.8 : 1.4;
        const progress = (seconds - stroke.phase!) / lifetime;
        const fade = Math.max(0, Math.min(1, progress / 0.12, (1 - progress) / 0.12));
        if (fade <= 0) { ctx.restore(); return; }
        ctx.globalAlpha *= fade;
        ctx.setLineDash([26, 174]);
        ctx.lineDashOffset = (ink.animation === 4 ? 1 : -1) * progress * 200;
      } else {
        const queued = ink.animation === 1;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([0.01, queued ? 14 : 22]);
        ctx.lineDashOffset = -seconds * (queued ? 28 / 1.1 : 44 / 2.4);
      }
    }
    ctx.stroke(path);
    if (now === undefined && (stroke.arrow || stroke.dots)) {
      const points = sampleWirePath(entry.path);
      const last = stroke.clip ? points.findLastIndex(({ point }) => !stroke.clip!.some(box =>
        point.x > box.x && point.x < box.x + box.w && point.y > box.y && point.y < box.y + box.h)) : points.length - 1;
      const a = points[last - 1]?.point, b = points[last]?.point;
      ctx.setLineDash([]);
      ctx.fillStyle = baseColor;
      if (stroke.arrow && a && b) {
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -3.5); ctx.lineTo(-7, 3.5); ctx.closePath(); ctx.fill();
      } else if (stroke.dots && b) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  private applyDash(dash: number[], zoom: number) {
    const period = dash.reduce((sum, value) => sum + value, 0);
    const scale = zoom < 0.5 && period > 0 && period <= 8 ? Math.max(1, 5 / (period * zoom)) : 1;
    this.ctx.setLineDash(scale === 1 ? dash : dash.map((value, i) => i % 2 ? value * scale : Math.max(1 / zoom, value * scale)));
    this.ctx.lineCap = zoom < 0.5 && period > 0 && period <= 8 ? "butt" : "round";
  }

  private paintStatic(area: Box, strokes: Stroke[], zoom: number, hidden?: ReadonlySet<string>, alpha = 1) {
    const buckets = new Map<string, { ink: WireInk; strokes: Stroke[] }>();
    for (const stroke of strokes) {
      if (stroke.edgeId && hidden?.has(stroke.edgeId)) continue;
      if (!this.visible(stroke, area)) continue;
      if (stroke.arrow || stroke.dots || stroke.clip) { this.stroke(stroke, undefined, area, zoom); continue; }
      const { ink } = stroke;
      const key = `${ink.color}:${ink.width}:${ink.alpha}:${ink.dash}`;
      let bucket = buckets.get(key);
      if (!bucket) { bucket = { ink, strokes: [] }; buckets.set(key, bucket); }
      bucket.strokes.push(stroke);
    }
    const ctx = this.ctx;
    for (const { ink, strokes: bucket } of buckets.values()) {
      ctx.strokeStyle = this.palette[ink.color];
      ctx.lineWidth = ink.width;
      ctx.globalAlpha = ink.alpha * alpha;
      this.applyDash(ink.dash, zoom);
      for (const stroke of bucket) ctx.stroke(this.path(stroke, area));
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  private highlightInk(id: string, stroke: Stroke): WireInk {
    if (this.hoverEdge === id) return { ...stroke.ink, color: "accent", width: 2.4, alpha: 1 };
    if (this.props.selection.edge === id) {
      return { ...stroke.ink, width: this.wiresById.get(id)?.edge.kind === "reference" ? 2.2 : 2.6 };
    }
    return stroke.ink;
  }

  private paintWorkflow(area: Box) {
    const camera = this.store.getCamera();
    const dim = this.dimmed();
    const hidden = this.store.getHiddenEdgeIds();
    const reconnecting = this.props.connecting?.reconnectingEdge?.id;
    if ((this.store.getDrag() && camera.zoom >= 0.5 && this.props.prefs.wireRouting === "overlap") || reconnecting) {
      // No full-scene cache update at either drag boundary.
      const excluded = reconnecting ? new Set([...hidden, reconnecting]) : hidden;
      this.paintStatic(area, this.strokes, camera.zoom, excluded, dim ? 0.22 : 1);
    } else {
      const image = this.staticImages.get(this.workflowCacheToken, this.theme!, area, camera.zoom, devicePixelRatio,
        (target, region, zoom) => {
          const original = this.ctx;
          this.ctx = target;
          try { this.paintStatic(region, this.strokes, zoom); }
          finally { this.ctx = original; }
        });
      this.ctx.globalAlpha = dim ? 0.22 : 1;
      if (hidden.size) {
        let scratch = this.dragScratch;
        if (!scratch || scratch.image !== image || scratch.excluded !== hidden) {
          const canvas = scratch?.canvas ?? new OffscreenCanvas(1, 1);
          const ctx = this.copyImage(image, canvas);
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          const erased: Box[] = [];
          for (const id of hidden) {
            const stroke = this.baseStrokes.get(id);
            if (!stroke || !this.visible(stroke, image.area)) continue;
            ctx.lineWidth = stroke.ink.width + 2 / image.density;
            ctx.stroke(this.path(stroke, image.area));
            erased.push(stroke.entry.extent);
          }
          ctx.globalCompositeOperation = "source-over";
          if (erased.length) {
            const crossing = this.strokes.filter(stroke =>
              (!stroke.edgeId || !hidden.has(stroke.edgeId)) &&
              erased.some(box => intersects(stroke.entry.extent, box)));
            if (crossing.length > 0 && crossing.length <= 48) {
              const original = this.ctx;
              this.ctx = ctx;
              try { this.paintStatic(image.area, crossing, image.zoom); }
              finally { this.ctx = original; }
            }
          }
          scratch = { canvas, image, excluded: hidden };
          this.dragScratch = scratch;
        }
        this.drawImage(image, scratch.canvas);
      } else this.drawImage(image);
      this.ctx.globalAlpha = 1;
    }
    const highlightSet = new Set(this.hoverEdge ? [this.hoverEdge] : this.selectedEdges);
    const moving = new Map<string, Stroke>();
    for (const stroke of this.movingStrokes) {
      const id = stroke.edgeId!;
      moving.set(id, stroke);
      if (id === reconnecting || !this.visible(stroke, area)) continue;
      if (highlightSet.has(id)) {
        this.stroke({ ...stroke, ink: this.highlightInk(id, stroke) });
      } else {
        const alpha = dim ? 0.22 : 1;
        this.stroke({ ...stroke, ink: { ...stroke.ink, alpha: stroke.ink.alpha * alpha } });
      }
    }
    for (const id of highlightSet) {
      if (id === reconnecting || moving.has(id)) continue;
      const stroke = this.baseStrokes.get(id);
      if (!stroke || !this.visible(stroke, area)) continue;
      this.stroke({ ...stroke, ink: this.highlightInk(id, stroke) });
    }
    if (reconnecting) {
      const stroke = moving.get(reconnecting) ?? this.baseStrokes.get(reconnecting);
      if (stroke && this.visible(stroke, area)) this.stroke({ ...stroke, ink: { ...stroke.ink, alpha: 0.14, dash: [4, 6] } });
    }
  }

  private drawImage(image: WireImage, canvas = image.canvas) {
    this.ctx.drawImage(canvas, 0, 0, image.width, image.height,
      image.area.x, image.area.y, image.width / image.density, image.height / image.density);
  }

  private copyImage(image: WireImage, canvas: OffscreenCanvas) {
    if (canvas.width < image.width) canvas.width = image.width;
    if (canvas.height < image.height) canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image.canvas, 0, 0);
    ctx.setTransform(image.density, 0, 0, image.density, -image.area.x * image.density, -image.area.y * image.density);
    return ctx;
  }

  private paintGuides(area: Box) {
    const camera = this.store.getCamera();
    const image = this.guideImages.get(this.guideCacheToken, this.theme!, area, camera.zoom, devicePixelRatio,
      (target, region, zoom) => {
        const original = this.ctx;
        this.ctx = target;
        try {
          this.paintStatic(region, this.staticGuides.map(guide => ({ ...guide, dx: 0, dy: 0, guide: true })), zoom);
        } finally { this.ctx = original; }
      });
    if (this.movingGuides.length) {
      let scratch = this.guideScratch;
      if (!scratch || scratch.image !== image || scratch.excluded !== this.movingGuides) {
        const canvas = scratch?.canvas ?? new OffscreenCanvas(1, 1);
        const ctx = this.copyImage(image, canvas);
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const movingSet = new Set(this.movingGuides);
        const erased: Box[] = [];
        for (const guide of this.movingGuides) {
          if (!intersects(guide.entry.extent, image.area)) continue;
          ctx.lineWidth = guide.ink.width + 2 / image.density;
          ctx.stroke(cachedPath2D(guide.entry)!);
          if (guide.dots && guide.to) {
            ctx.beginPath();
            ctx.arc(guide.to.x, guide.to.y, 3 + 1.5 / image.density, 0, Math.PI * 2);
            ctx.fill();
          }
          erased.push(guide.entry.extent);
        }
        ctx.globalCompositeOperation = "source-over";
        if (erased.length) {
          const crossing = this.staticGuides
            .filter(guide => !movingSet.has(guide) && erased.some(box => intersects(guide.entry.extent, box)))
            .map(guide => ({ ...guide, dx: 0, dy: 0, guide: true }));
          if (crossing.length > 0 && crossing.length <= 24) {
            const original = this.ctx;
            this.ctx = ctx;
            try { this.paintStatic(image.area, crossing, image.zoom); }
            finally { this.ctx = original; }
          }
        }
        scratch = { canvas, image, excluded: this.movingGuides };
        this.guideScratch = scratch;
      }
      this.drawImage(image, scratch.canvas);
    } else {
      this.drawImage(image);
    }
    for (const stroke of this.guideStrokes) if (this.visible(stroke, area)) this.stroke(stroke);
    if (this.hoverStaff) for (const guide of this.guides) {
      if (this.hoverStaff !== `staff:${guide.staffId}`) continue;
      const stroke = translatedGuide(guide, this.store);
      if (this.visible(stroke, area)) this.stroke({ ...stroke, ink: { ...stroke.ink, color: "team", width: 2.4, alpha: 1, dash: [] } });
    }
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.props.routeName !== "canvas") {
      if (!this.flow.hidden) this.flow.hidden = true;
      return;
    }
    const camera = this.store.getCamera();
    if (!(camera.zoom > 0) || !Number.isFinite(camera.zoom)) return;
    const { width, height } = this.props.vpSize;
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [this.canvas, this.flow]) {
      const w = Math.round(width * dpr), h = Math.round(height * dpr);
      if (canvas.width !== w) { canvas.width = w; this.dirty = true; }
      if (canvas.height !== h) { canvas.height = h; this.dirty = true; }
    }
    const area = padded(viewportBox(camera, this.props.vpSize), 10 / camera.zoom);
    const remaining = this.animated.filter(stroke => !stroke.expires || stroke.expires > Date.now());
    if (remaining.length !== this.animated.length) {
      this.animated = remaining;
      this.meshDirty = true;
      this.dirty = true;
    }
    const reconnecting = this.props.connecting?.reconnectingEdge?.id;
    const visibleAnimations = this.animated.filter(stroke =>
      (!reconnecting || stroke.edgeId !== reconnecting) &&
      this.visible(stroke, area) &&
      pathTouches(stroke.entry, { ...area, x: area.x - stroke.dx, y: area.y - stroke.dy }));
    this.prepareGpu();
    const gpu = !!this.program && !this.contextLost;
    const active = visibleAnimations.length;
    const setData = (key: string, value: string) => { if (this.flow.dataset[key] !== value) this.flow.dataset[key] = value; };
    const workflowActive = visibleAnimations.filter(stroke => stroke.workflow).length;
    setData("activeWires", String(workflowActive));
    setData("gpuActive", String(gpu ? workflowActive : 0));
    setData("renderer", gpu ? "webgl2" : "canvas2d");
    const elapsedMs = now - this.epoch;
    if (this.dirty || (!gpu && active)) {
      const ctx = this.ctx;
      ctx.resetTransform();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(camera.zoom * dpr, 0, 0, camera.zoom * dpr, camera.x * dpr, camera.y * dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      this.paintGuides(area);
      this.paintWorkflow(area);
      if (!gpu) for (const stroke of visibleAnimations) {
        const alpha = stroke.edgeId && this.dimmed() && !this.focused(stroke.edgeId) ? 0.22 : 1;
        this.stroke({ ...stroke, ink: { ...stroke.ink, alpha: stroke.ink.alpha * alpha } }, elapsedMs);
      }
    }
    const hidden = !gpu || !active;
    if (this.flow.hidden !== hidden) this.flow.hidden = hidden;
    if (gpu && (active || this.dirty)) {
      this.program!.clear(width, height, camera, dpr);
      if (active) this.program!.draw(elapsedMs / 1000);
    }
    this.dirty = false;
    if (active && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    for (const stop of this.unsubscribe) stop();
    this.flow.removeEventListener("webglcontextlost", this.lost);
    this.flow.removeEventListener("webglcontextrestored", this.restored);
    document.removeEventListener("visibilitychange", this.visibility);
    this.program?.dispose();
    this.program = undefined;
    if (this.gl && !this.gl.isContextLost()) {
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    this.gl = undefined;
    this.guideImages.dispose();
    this.staticImages.dispose();
    if (this.dragScratch) this.dragScratch.canvas.width = this.dragScratch.canvas.height = 1;
    if (this.guideScratch) this.guideScratch.canvas.width = this.guideScratch.canvas.height = 1;
    this.canvas.width = this.canvas.height = 0;
    this.flow.width = this.flow.height = 0;
  }
}

export const WireCanvasStage = memo(function WireCanvasStage(props: StageProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const flow = useRef<HTMLCanvasElement>(null);
  const surface = useRef<WireSurface>();
  const store = useCanvasInteractionStore();
  const guides = useStageGuides(props);
  usePausedDragRouting(props.prefs.wireRouting, props.wireLayouts, props.routingBoxes, props.routingBoxesById, props.wireScene.cache);
  useLayoutEffect(() => {
    surface.current = new WireSurface(canvas.current!, flow.current!, store);
    return () => surface.current!.dispose();
  }, [store]);
  useLayoutEffect(() => surface.current!.update(props, guides), [props, guides]);
  return <div className="fs-wire-stage" aria-hidden="true">
    <canvas ref={canvas} className="fs-wire-static-canvas" />
    <canvas ref={flow} className="fs-wire-flow-canvas" data-active-wires="0" data-gpu-active="0" hidden />
  </div>;
});
