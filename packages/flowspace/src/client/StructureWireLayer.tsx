import { useLayoutEffect, useRef } from "react";
import type { Box } from "./geometry.ts";
import { encloses, padded } from "./sceneModel.ts";
import { pathTouches } from "./sceneWires.ts";

type Guide = { path: string; extent: Box };
type Tile = { area: Box; density: number; image: HTMLCanvasElement; color: string; theme: string; paths: Map<string, Path2D>; guides: Guide[] };

export function StructureWireLayer({ guides, area, zoom, theme, settled, lod }: {
  guides: Guide[]; area: Box; zoom: number; theme: string; settled: boolean; lod: boolean;
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
    const inPrevious = previous && encloses(previous.area, area);
    const covers = inPrevious && (!settled || Math.abs(density - previous.density) < 0.015);
    const region = covers ? previous.area : padded(area, 80 / zoom);
    const visible = guides.filter(guide => pathTouches(guide, region));
    if (covers && previous.color === color && previous.guides.length === visible.length &&
      visible.every((guide, index) => previous.guides[index].path === guide.path)) {
      if (target.firstChild !== previous.image) target.replaceChildren(previous.image);
      previous.image.style.transform = `translate(${region.x - area.x}px,${region.y - area.y}px)`;
      return;
    }
    const image = previous?.image ?? document.createElement("canvas");
    const res = covers ? previous.density : density;
    image.width = Math.ceil(region.w * res);
    image.height = Math.ceil(region.h * res);
    const context = image.getContext("2d");
    if (!context) return;
    context.setTransform(res, 0, 0, res, -region.x * res, -region.y * res);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 1;
    context.strokeStyle = color;
    context.globalAlpha = 0.4;
    context.setLineDash([0.01, 5]);
    const paths = new Map<string, Path2D>();
    for (const guide of visible) {
      const path = previous?.paths.get(guide.path) ?? new Path2D(guide.path);
      context.stroke(path);
      paths.set(guide.path, path);
    }
    image.style.width = `${image.width / res}px`;
    image.style.height = `${image.height / res}px`;
    image.style.transform = `translate(${region.x - area.x}px,${region.y - area.y}px)`;
    if (target.firstChild !== image) target.replaceChildren(image);
    tiles.current[Number(lod)] = { area: region, density: res, image, color, theme, paths, guides: visible };
  }, [guides, area, zoom, theme, settled, lod]);
  return <>
    <path ref={sample} className="edge-path fs-structure-edge" />
    <foreignObject x={area.x} y={area.y} width={area.w} height={area.h} pointerEvents="none">
      <div ref={host} />
    </foreignObject>
  </>;
}
