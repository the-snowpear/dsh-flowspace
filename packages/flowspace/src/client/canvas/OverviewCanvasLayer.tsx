import { memo, useLayoutEffect, useRef, type RefObject } from "react";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { useCanvasInteractionStore, type CanvasInteractionStore } from "./interactionStore.ts";
import { OverviewCardAtlas, readOverviewPalette, type OverviewPalette } from "./OverviewCardAtlas.ts";
import { overviewGroupBox, type OverviewScene } from "./overviewScene.ts";
import { intersects, padded, viewportBox } from "../sceneModel.ts";
import { typeScaleFor } from "./viewportMath.ts";

export type OverviewProps = Pick<CanvasWorldProps,
  "doc" | "nodesById" | "sceneNodes" | "cardBoxes" | "snapshot" | "edgeIndex" | "derivedStructure" | "childTree" |
  "keepExpandedIds" | "vpSize" | "displayedTheme" | "routeName" | "visibleGroups" | "membersOf" |
  "groupPorts" | "selectionNodeSet" | "selectedStructureId" | "connecting" | "lod" | "languageRevision"> & {
    overviewScene: OverviewScene;
  };

class OverviewSurface {
  private frame = 0;
  private idle = 0;
  private atlas: OverviewCardAtlas;
  private palette: OverviewPalette;
  private dpr = devicePixelRatio;
  private theme: string;
  private stops: (() => void)[];
  private lastRasterizations = -1;
  private lastCount = -1;
  private ctx: CanvasRenderingContext2D;
  private background: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private groups: HTMLCanvasElement,
    private store: CanvasInteractionStore, private props: OverviewProps, private scene: OverviewScene) {
    this.ctx = canvas.getContext("2d")!;
    this.background = groups.getContext("2d")!;
    this.palette = readOverviewPalette(canvas.closest(".fs-root") ?? canvas);
    this.atlas = new OverviewCardAtlas(this.palette, this.dpr);
    this.theme = props.displayedTheme;
    this.stops = [store.subscribeCamera(this.schedule), store.subscribeDrag(this.schedule),
      store.subscribeHover(this.schedule), store.subscribeOverviewDom(this.schedule)];
    // Read-only geometry used by browser regression tests and accessibility tooling.
    Object.assign(canvas, { overviewSnapshot: () => ({
      camera: this.store.getCamera(), domIds: [...this.store.getOverviewDomIds()],
      cards: [...this.scene.cards.values()].map(card => ({ id: card.id, kind: card.kind, box: card.box, ports: card.visual.ports })),
      nodes: this.props.sceneNodes.map(({ n }) => ({ id: n.id, x: n.x, y: n.y, expanded: n.expanded })),
      groups: this.props.visibleGroups.map(group => ({ id: group.id, box: overviewGroupBox(group, this.props, this.store.getCamera().lod) })),
      pages: this.atlas.pageCount, rasterizations: this.atlas.rasterizations,
    }) });
    this.update(props, scene);
  }

  update(props: OverviewProps, scene: OverviewScene) {
    this.props = props;
    this.scene = scene;
    this.resize();
    this.schedule();
    if (typeof cancelIdleCallback === "function") cancelIdleCallback(this.idle);
    this.idle = 0;
    if (typeof requestIdleCallback === "function" && props.routeName === "canvas") {
      this.idle = requestIdleCallback(() => {
        this.idle = 0;
        const cam = this.store.getCamera();
        if (this.props.routeName !== "canvas" || cam.lod || !(cam.zoom > 0)) return;
        const area = padded(viewportBox(cam, this.props.vpSize), 500);
        for (const id of this.scene.index.query(area)) {
          const card = this.scene.cards.get(id);
          if (card) this.atlas.get(card.visual, typeScaleFor(0.49));
        }
        this.stats();
      });
    }
  }

  private resize() {
    if (this.dpr !== devicePixelRatio || this.theme !== this.props.displayedTheme) {
      this.dpr = devicePixelRatio;
      this.theme = this.props.displayedTheme;
      this.palette = readOverviewPalette(this.canvas.closest(".fs-root") ?? this.canvas);
      this.atlas.invalidateAll(this.palette, this.dpr);
    }
    const width = Math.round(this.props.vpSize.width * this.dpr), height = Math.round(this.props.vpSize.height * this.dpr);
    for (const canvas of [this.canvas, this.groups]) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    }
  }

  private stats() {
    if (this.lastRasterizations === this.atlas.rasterizations) return;
    this.lastRasterizations = this.atlas.rasterizations;
    this.canvas.dataset.rasterizations = String(this.lastRasterizations);
    this.canvas.dataset.atlasPages = String(this.atlas.pageCount);
  }

  private schedule = () => {
    if (!this.frame) this.frame = requestAnimationFrame(this.paint);
  };

  private paint = () => {
    this.frame = 0;
    this.resize();
    const cam = this.store.getCamera(), drag = this.store.getDrag();
    const { ctx, background } = this;
    for (const context of [ctx, background]) {
      context.resetTransform();
      context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.props.routeName !== "canvas" || !(cam.zoom > 0) || !Number.isFinite(cam.zoom)) return;
    for (const context of [ctx, background]) {
      context.setTransform(cam.zoom * this.dpr, 0, 0, cam.zoom * this.dpr, cam.x * this.dpr, cam.y * this.dpr);
    }
    const area = viewportBox(cam, this.props.vpSize), dom = this.store.getOverviewDomIds();
    const hover = this.store.getHover();
    const groupRadius = this.palette.groupRadius ?? 26;
    for (const group of this.props.visibleGroups) {
      const delta = drag?.deltas.get(group.id);
      const box = overviewGroupBox(group, this.props, cam.lod);
      const x = box.x + (delta?.dx ?? 0), y = box.y + (delta?.dy ?? 0);
      if (group.collapsed || !intersects({ ...box, x, y }, area)) continue;
      background.fillStyle = `color-mix(in oklab, ${this.palette.kinds[group.color ?? "agent"] || this.palette.accent} 7%, transparent)`;
      background.beginPath();
      background.roundRect(x, y, box.w, box.h, groupRadius);
      background.fill();
    }
    const visible = new Set(this.scene.index.query(padded(area, 24 / cam.zoom)));
    for (const id of drag?.deltas.keys() ?? []) visible.add(id);
    let count = 0;
    for (const id of visible) {
      const card = this.scene.cards.get(id);
      if (!card || dom.has(id) || !cam.lod && card.kind !== "node") continue;
      if (!cam.lod && card.node && !intersects(this.props.cardBoxes(card.node)[0], area)) continue;
      const delta = drag?.deltas.get(id);
      const x = card.box.x + (delta?.dx ?? 0), y = card.box.y + (delta?.dy ?? 0);
      if (!intersects({ ...card.box, x, y }, area)) continue;
      const tile = this.atlas.get(card.visual, typeScaleFor(Math.min(cam.zoom, 0.49)));
      ctx.globalAlpha = card.visual.participation === "paused" ? 0.62 : 1;
      ctx.drawImage(tile.page.canvas, tile.x, tile.y, tile.w, tile.h,
        x - 6, y - 6, tile.w / tile.density, tile.h / tile.density);
      const selected = this.props.selectionNodeSet.has(id) || this.props.selectedStructureId === id;
      if (selected || hover.nodeId === id || this.props.connecting) {
        if (selected || hover.nodeId === id) {
          ctx.strokeStyle = this.palette.accent;
          ctx.lineWidth = (selected ? 2 : 1) / cam.zoom;
          ctx.beginPath();
          ctx.roundRect(x, y, card.box.w, card.box.h, 16);
          ctx.stroke();
        }
        for (const port of card.visual.ports) {
          ctx.beginPath();
          ctx.arc(x + port.x, y + port.y, 4 / cam.zoom, 0, Math.PI * 2);
          ctx.fillStyle = this.palette.surface;
          ctx.fill();
          ctx.lineWidth = 1 / cam.zoom;
          ctx.strokeStyle = port.kind === "reference" ? this.palette.accent : this.palette.secondary;
          ctx.stroke();
        }
      }
      count++;
    }
    ctx.globalAlpha = 1;
    if (this.lastCount !== count) { this.canvas.dataset.visibleCards = String(count); this.lastCount = count; }
    this.stats();
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    if (typeof cancelIdleCallback === "function") cancelIdleCallback(this.idle);
    for (const stop of this.stops) stop();
    this.atlas.dispose();
  }
}

export const OverviewCanvasLayer = memo(function OverviewCanvasLayer(props: OverviewProps & { backgroundRef: RefObject<HTMLCanvasElement> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const surface = useRef<OverviewSurface>();
  const store = useCanvasInteractionStore();
  useLayoutEffect(() => {
    surface.current = new OverviewSurface(ref.current!, props.backgroundRef.current!, store, props, props.overviewScene);
    return () => surface.current?.dispose();
  }, [store]);
  useLayoutEffect(() => surface.current!.update(props, props.overviewScene), [props]);
  return <canvas ref={ref} className="fs-overview-canvas" aria-hidden="true" />;
});
