import { useLayoutEffect, useRef } from "react";
import type { Box } from "./geometry.ts";
import { encloses, padded } from "./sceneModel.ts";
import { guidePathInArea, pathTouches } from "./sceneWires.ts";

type Guide = { path: string; extent: Box };
type GuideRun = { image: HTMLCanvasElement; guides: Guide[] };
type Tile = {
  area: Box; density: number; image: HTMLCanvasElement; color: string; theme: string;
  paths: Map<string, Path2D>; guides: Guide[]; source: Guide[]; retained?: GuideRun;
};

function clearImage(image: HTMLCanvasElement, area: Box, density: number) {
  const width = Math.ceil(area.w * density), height = Math.ceil(area.h * density);
  if (image.width !== width) image.width = width;
  if (image.height !== height) image.height = height;
  const ctx = image.getContext("2d")!;
  ctx.resetTransform();
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

function strokeGuides(ctx: CanvasRenderingContext2D, guides: Guide[], paths: Map<string, Path2D>,
  area: Box, density: number, color: string) {
  ctx.setTransform(density, 0, 0, density, -area.x * density, -area.y * density);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.setLineDash([0.01, 5]);
  for (const guide of guides) ctx.stroke(paths.get(guide.path)!);
}

function samePaths(guides: Guide[], other: Guide[], start = 0) {
  return guides.every((guide, index) => guide.path === other[start + index]?.path);
}

/** Cache a contiguous run so the moving guides still paint in their original stacking order. */
function retainGuides(previous: Tile, visible: Guide[], paths: Map<string, Path2D>) {
  const cached = previous.retained;
  if (cached) {
    const first = visible.findIndex(guide => guide.path === cached.guides[0].path);
    if (first >= 0 && samePaths(cached.guides, visible, first)) return { run: cached, first };
  }
  let first = 0, length = 0, start = 0;
  for (let i = 0; i <= visible.length; i++) {
    if (i < visible.length && previous.paths.has(visible[i].path)) continue;
    if (i - start > length) {
      first = start;
      length = i - start;
    }
    start = i + 1;
  }
  // For a handful of paths the extra full-size backing image costs more than stroking.
  if (length < 8) return;
  const image = cached?.image ?? document.createElement("canvas");
  const guides = visible.slice(first, first + length);
  strokeGuides(clearImage(image, previous.area, previous.density), guides, paths,
    previous.area, previous.density, previous.color);
  return { run: { image, guides }, first };
}

export function StructureWireLayer({ guides, area, zoom, theme, settled, lod, dragging }: {
  guides: Guide[]; area: Box; zoom: number; theme: string; settled: boolean; lod: boolean; dragging: boolean;
}) {
  const sample = useRef<SVGPathElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const tiles = useRef<(Tile | undefined)[]>([]);
  useLayoutEffect(() => {
    const target = host.current;
    if (!target || !sample.current) return;
    const previous = tiles.current[Number(lod)];
    const density = window.devicePixelRatio * zoom;
    const color = previous?.theme === theme ? previous.color : getComputedStyle(sample.current).stroke;
    const covers = previous && encloses(previous.area, area) && (!settled || Math.abs(density - previous.density) < 0.015);
    const region = covers ? previous.area : padded(area, 80 / zoom);
    const reusable = covers && previous.color === color;
    const image = previous?.image ?? document.createElement("canvas");
    if (target.firstChild !== image) target.replaceChildren(image);
    image.style.transform = `translate(${region.x - area.x}px,${region.y - area.y}px)`;
    if (reusable && (previous.source === guides || (previous.source.length === guides.length && samePaths(guides, previous.source)))) {
      if (!dragging) previous.retained = undefined;
      return;
    }
    const visible = guides.filter(guide => pathTouches(guide, region));
    if (reusable && previous.guides.length === visible.length && samePaths(visible, previous.guides)) {
      previous.source = guides;
      if (!dragging) previous.retained = undefined;
      return;
    }

    const res = covers ? previous.density : density;
    const paths = new Map<string, Path2D>();
    for (const guide of visible) paths.set(guide.path,
      (covers ? previous.paths.get(guide.path) : undefined) ?? new Path2D(guidePathInArea(guide, region)));
    const retained = reusable && dragging ? retainGuides(previous, visible, paths) : undefined;
    const ctx = clearImage(image, region, res);
    if (retained) {
      const { first, run } = retained;
      strokeGuides(ctx, visible.slice(0, first), paths, region, res, color);
      ctx.resetTransform();
      ctx.globalAlpha = 1;
      ctx.drawImage(run.image, 0, 0);
      strokeGuides(ctx, visible.slice(first + run.guides.length), paths, region, res, color);
    } else {
      strokeGuides(ctx, visible, paths, region, res, color);
    }
    image.style.width = `${image.width / res}px`;
    image.style.height = `${image.height / res}px`;
    tiles.current[Number(lod)] = { area: region, density: res, image, color, theme, paths, guides: visible,
      source: guides, retained: retained?.run };
  }, [guides, area, zoom, theme, settled, lod, dragging]);
  return <>
    <path ref={sample} className="edge-path fs-structure-edge" />
    <foreignObject x={area.x} y={area.y} width={area.w} height={area.h} pointerEvents="none">
      <div ref={host} />
    </foreignObject>
  </>;
}
