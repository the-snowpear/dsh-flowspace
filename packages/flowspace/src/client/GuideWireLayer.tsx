import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { WireRoutingMode } from "../types.ts";
import type { Box } from "./geometry.ts";
import { GuideWorker } from "./guideWorker.ts";
import { intersects } from "./sceneModel.ts";
import { buildGuideRoute, guidePathInArea, pathTouches, type CachedPath, type GuideRoute, type SceneWires } from "./sceneWires.ts";
import { StructureWireLayer } from "./StructureWireLayer.tsx";
import type { DerivedStructureLink } from "./structure.ts";

export const GuideWireLayer = memo(function GuideWireLayer({ links, cache, obstacleRevision, mode, area, zoom, theme, settled, lod, dragging }: {
  links: DerivedStructureLink[];
  cache: SceneWires;
  obstacleRevision: number;
  mode: WireRoutingMode;
  area: Box;
  zoom: number;
  theme: string;
  settled: boolean;
  lod: boolean;
  dragging: boolean;
}) {
  const [refresh, setRefresh] = useState(0);
  const worker = useMemo(() => new GuideWorker(), []);
  const deferred = useRef<Set<string>>(new Set());
  const receiving = useRef<{ cache: SceneWires; tasks: Map<string, GuideRoute> }>();
  const tasks = useMemo(() => links.map(({ id, fromBox, toBox }) => cache.guide(id, {
    x: fromBox.x + fromBox.w, y: fromBox.y + fromBox.h / 2, box: fromBox,
  }, {
    x: toBox.x, y: toBox.y + toBox.h / 2, box: toBox,
  }, mode)), [links, cache, mode]);
  const result = useMemo(() => {
    const pending: GuideRoute[] = [];
    const elsewhere: GuideRoute[] = [];
    const paths = tasks.map((task, index) => {
      const { path, current } = cache.lookupGuide(task);
      if (current) return path!;
      if (dragging && mode === "avoid" && worker.available && path && !links[index].active && !deferred.current.has(task.id)) {
        (pathTouches(path, area) ? pending : elsewhere).push(task);
        return path;
      }
      return cache.saveGuide(task.id, buildGuideRoute(task, cache.obstacles));
    });
    const batches: { index: number; guides: CachedPath[] }[] = [];
    for (const [index, link] of links.entries()) {
      const last = batches.at(-1);
      if (link.active) batches.push({ index, guides: [] });
      else if (last?.guides.length) last.guides.push(paths[index]);
      else batches.push({ index, guides: [paths[index]] });
    }
    return { pending: [...pending, ...elsewhere], paths, batches };
  }, [tasks, cache, obstacleRevision, mode, dragging, links, refresh, worker, area]);
  useEffect(() => {
    if (mode === "avoid" && links.length) worker.start();
  }, [mode, links.length, worker]);
  useEffect(() => () => worker.dispose(), [worker]);
  useLayoutEffect(() => {
    receiving.current = dragging && mode === "avoid" && worker.available
      ? { cache, tasks: new Map(tasks.map(task => [task.id, task])) }
      : undefined;
  }, [cache, dragging, mode, tasks, worker]);
  useLayoutEffect(() => {
    deferred.current = new Set(result.pending.map(task => task.id));
    if (!result.pending.length) {
      worker.discard();
      return;
    }
    const frame = requestAnimationFrame(() => setRefresh(version => version + 1));
    worker.request({
      boxes: cache.obstacles.all(),
      tasks: result.pending,
      receive(paths) {
        const current = receiving.current;
        if (current?.cache !== cache) return;
        for (const [id, path] of paths) {
          const task = current.tasks.get(id);
          if (task) cache.acceptGuide(task, path, obstacleRevision);
        }
      },
    });
    return () => cancelAnimationFrame(frame);
  }, [cache, obstacleRevision, result.pending, worker]);
  return <>{result.batches.map(({ index, guides }) => {
    const { id, active } = links[index];
    if (guides.length) return <StructureWireLayer key={id} guides={guides}
      area={area} zoom={zoom} theme={theme} settled={settled} lod={lod} dragging={dragging} />;
    const guide = result.paths[index];
    return intersects(guide.extent, area) ? <path key={id} className={`edge-path fs-structure-edge ${active ? "is-active" : ""}`}
      d={guidePathInArea(guide, area)} /> : null;
  })}</>;
});
