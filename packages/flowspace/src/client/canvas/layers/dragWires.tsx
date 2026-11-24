import { useEffect, useMemo } from "react";
import type { WireRoutingMode } from "../../../types.ts";
import { padded, type Box } from "../../boxes.ts";
import { edgeRouteTask, pathExtent, type CachedWire, type SceneWires, type WireEnd } from "../../sceneWires.ts";
import { route } from "../../wireRouting.ts";
import { WireWorker } from "../../wireWorker.ts";
import { useCanvasInteractionStore, type DragDelta, type DragSession } from "../interactionStore.ts";
import type { WireLayout } from "../ViewportCard.tsx";

function shift(end: WireEnd, delta: DragDelta | undefined) {
  if (!delta) return end;
  const { dx, dy } = delta;
  return {
    ...end, x: end.x + dx, y: end.y + dy,
    box: { ...end.box, x: end.box.x + dx, y: end.box.y + dy },
  };
}

const previews = new WeakMap<DragSession, WeakMap<WireLayout, WireLayout>>();

export function previewDragWire(wire: WireLayout, drag: DragSession): WireLayout {
  const cache = previews.get(drag) ?? new WeakMap();
  previews.set(drag, cache);
  const cached = cache.get(wire);
  if (cached) return cached;
  const edge = drag.waypointEdit?.edgeId === wire.edge.id
    ? { ...wire.edge, waypoints: drag.waypointEdit.waypoints }
    : wire.edge;
  const fromDelta = drag.deltas.get(wire.from.groupId ?? edge.source);
  const toDelta = drag.deltas.get(wire.to.groupId ?? edge.target);
  const from = shift(wire.from, fromDelta);
  const to = shift(wire.to, toDelta);
  if (fromDelta && toDelta && fromDelta.dx === toDelta.dx && fromDelta.dy === toDelta.dy &&
      !edge.waypoints?.length && !drag.waypointEdit) {
    const { dx, dy } = fromDelta;
    const geom = {
      ...wire.geom,
      label: { x: wire.geom.label.x + dx, y: wire.geom.label.y + dy },
      legs: wire.geom.legs.map(leg => leg.map(pt => ({ x: pt.x + dx, y: pt.y + dy }))),
    };
    const updated = {
      ...wire, edge, from, to, geom,
      extent: { ...wire.extent, x: wire.extent.x + dx, y: wire.extent.y + dy },
    };
    cache.set(wire, updated);
    return updated;
  }
  const geom = route(from, to, { kind: edge.kind, mode: "overlap", waypoints: edge.waypoints });
  const updated = { ...wire, edge, from, to, geom, extent: padded(pathExtent(geom.path), 72) };
  cache.set(wire, updated);
  return updated;
}

export function usePausedDragRouting(
  mode: WireRoutingMode,
  wires: WireLayout[],
  boxes: Box[],
  boxesById: ReadonlyMap<string, Box>,
  cache: SceneWires,
) {
  const store = useCanvasInteractionStore();
  const worker = useMemo(() => new WireWorker(), []);
  useEffect(() => () => worker.dispose(), [worker]);
  useEffect(() => {
    if (mode !== "avoid") return;
    const byId = new Map(wires.map(wire => [wire.edge.id, wire]));
    let idle: ReturnType<typeof setTimeout> | undefined;
    const submit = (drag: DragSession | null) => {
      clearTimeout(idle);
      worker.discard();
      if (!drag?.affectedEdgeIds.size) return;
      idle = setTimeout(() => {
        worker.start();
        if (!worker.available) return;
        const moved = new Map<Box, Box>();
        for (const [id, { dx, dy }] of drag.deltas) {
          const before = boxesById.get(id);
          if (before) moved.set(before, { ...before, x: before.x + dx, y: before.y + dy });
        }
        const tasks = Array.from(drag.affectedEdgeIds).flatMap(id => {
          const wire = byId.get(id);
          if (!wire) return [];
          const { edge, from, to } = previewDragWire(wire, drag);
          return [edgeRouteTask(edge, from, to, "avoid")];
        });
        if (!tasks.length) return;
        const revision = cache.obstacleRevision;
        const routes = new Map<string, CachedWire>();
        worker.request({
          boxes: boxes.map(box => moved.get(box) ?? box),
          tasks,
          receive(results, done) {
            for (const result of results) {
              if (result.kind === "edge") routes.set(result.id, result);
            }
            if (done && cache.obstacleRevision === revision) store.setDragRoutes(drag, routes);
          },
        });
      }, 120);
    };
    const unsubscribe = store.subscribeDrag(submit);
    submit(store.getDrag());
    return () => {
      unsubscribe();
      clearTimeout(idle);
      worker.discard();
    };
  }, [mode, wires, boxes, boxesById, cache, store, worker]);
}
