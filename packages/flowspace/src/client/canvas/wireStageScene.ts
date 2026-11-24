import { useEffect, useMemo, useRef, useState } from "react";
import { staffPath } from "../childTree.ts";
import { collapsedAncestor, exchangeRoute, expandedGroupBox, nodeBox, type Box } from "../geometry.ts";
import { pathExtent, sampleWirePath, type CachedPath, type GuideRoute } from "../sceneWires.ts";
import { WireWorker } from "../wireWorker.ts";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import type { WireInk } from "./wireCanvasPalette.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";

export interface StageGuide {
  id: string;
  entry: { path: string; extent: Box; path2d?: Path2D };
  ink: WireInk;
  sourceId?: string;
  targetId?: string;
  from?: { x: number; y: number; box?: Box };
  to?: { x: number; y: number; box?: Box };
  shape?: "guide" | "staff" | "line";
  exchange?: { a: Box; b: Box; direction: "out" | "back" };
  arrow?: boolean;
  dots?: boolean;
  staffId?: string;
  clip?: Box[];
}

export type StageSceneProps = Pick<CanvasWorldProps,
  "doc" | "snapshot" | "lod" | "nodesById" | "keepExpandedIds" | "derivedStructure" |
  "childTree" | "wireScene" | "accessoryWires" | "exchanges" | "staffWires" | "prefs"
>;

export function useStageGuides(props: StageSceneProps) {
  const { doc, snapshot, lod, nodesById, keepExpandedIds, derivedStructure, childTree,
    wireScene: { cache }, accessoryWires, exchanges, staffWires, prefs } = props;
  const worker = useMemo(() => new WireWorker(), []);
  const interaction = useCanvasInteractionStore();
  const [revision, refresh] = useState(0);
  const [workerEnabled, setWorkerEnabled] = useState(() => typeof Worker !== "undefined");
  const pendingRef = useRef<{ sig: string; tasks: GuideRoute[] }>({ sig: "", tasks: [] });
  const obstacleRef = useRef<{ cache: typeof cache; rev: number; boxes: Box[] }>({ cache, rev: -1, boxes: [] });
  useEffect(() => () => worker.dispose(), [worker]);
  const obstacleRevision = cache.obstacleRevision;
  const guides = useMemo(() => {
    const pending: GuideRoute[] = [];
    const items: StageGuide[] = [];
    for (const link of derivedStructure.links) {
      const { fromBox, toBox } = link;
      const from = { x: fromBox.x + fromBox.w, y: fromBox.y + fromBox.h / 2, box: fromBox };
      const to = { x: toBox.x, y: toBox.y + toBox.h / 2, box: toBox };
      const task = cache.guide(link.id, from, to, prefs.wireRouting);
      const existing = cache.lookupGuide(task);
      let entry: CachedPath;
      if (!existing.current && prefs.wireRouting === "avoid" && workerEnabled) {
        pending.push(task);
        entry = existing.path ?? cache.getPath(link.id, from, to, "overlap");
      } else entry = cache.getPath(link.id, from, to, prefs.wireRouting);
      items.push({ id: link.id, entry, from, to, shape: "guide",
        targetId: link.targetNodeId,
        ink: { color: link.active ? "running" : "structure", width: 1, alpha: link.active ? 0.7 : 0.4,
          dash: [0.01, 5], animation: link.active ? 2 : undefined } });
    }
    for (const wire of accessoryWires) {
      const target = nodesById.get(wire.id);
      if (!target) continue;
      const source = target.sourceNodeId ? nodesById.get(target.sourceNodeId) : undefined;
      const points = sampleWirePath(wire.path);
      const fromPt = points[0]?.point, toPt = points.at(-1)?.point;
      items.push({ id: `source:${wire.id}`, entry: wire, sourceId: target.sourceNodeId, targetId: wire.id,
        from: fromPt ? { ...fromPt, box: source && nodeBox(source, lod, keepExpandedIds.has(source.id)) } : undefined,
        to: toPt ? { ...toPt, box: nodeBox(target, lod, keepExpandedIds.has(target.id)) } : undefined,
        shape: "guide",
        ink: { color: "display", width: 1.2, alpha: 0.55, dash: [0.01, 5] } });
    }
    if (!lod) {
      for (const ex of exchanges) {
        const fg = collapsedAncestor(doc, ex.from), tg = collapsedAncestor(doc, ex.to);
        if (fg && fg.id === tg?.id) continue;
        const fromNode = nodesById.get(ex.from), toNode = nodesById.get(ex.to);
        if ((!fg && !fromNode) || (!tg && !toNode)) continue;
        const boxA = fg ? expandedGroupBox(doc, fg) : nodeBox(fromNode!, lod, keepExpandedIds.has(ex.from));
        const boxB = tg ? expandedGroupBox(doc, tg) : nodeBox(toNode!, lod, keepExpandedIds.has(ex.to));
        const geom = exchangeRoute(boxA, boxB);
        for (const [direction, id, color] of [["out", ex.from, "msgOut"], ["back", ex.to, "msgBack"]] as const) {
          if (!ex.items.some(item => item.fromId === id)) continue;
          const path = geom[direction];
          items.push({ id: `${ex.id}:${direction}`, entry: { path, extent: pathExtent(path) },
            sourceId: fg?.id ?? ex.from, targetId: tg?.id ?? ex.to, exchange: { a: boxA, b: boxB, direction },
            ink: { color, width: 1.6, alpha: 0.85, dash: [0.01, 5.5], animation: 2 }, arrow: true, clip: [boxA, boxB] });
        }
      }
      for (const operation of snapshot?.nativeOperations ?? []) {
        const source = nodesById.get(operation.nodeId);
        if (!source) continue;
        for (const node of doc.nodes) {
          if ((node.kind !== operation.kind && node.flowType !== `flowspace/exec-${operation.kind}`) ||
              !(operation.kind === "terminal" ? node.terminalSessionId === source.sessionId :
                operation.cwd && (node.worktreePath ?? node.cwd ?? node.config?.cwd) === operation.cwd)) continue;
          const a = nodeBox(source), b = nodeBox(node);
          const from = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, to = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
          const path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
          items.push({ id: `${operation.nodeId}:${node.id}:${operation.kind}`, entry: { path, extent: pathExtent(path) },
            from, to, sourceId: source.id, targetId: node.id, shape: "line",
            ink: { color: "structure", width: 1, alpha: 0.5, dash: [0.01, 4] } });
        }
      }
    }
    for (const link of childTree.links) {
      const path = staffPath(link.from, link.to);
      items.push({ id: link.id, entry: { path, extent: pathExtent(path) }, from: link.from, to: link.to, shape: "staff", dots: true,
        sourceId: link.sourceNodeId, staffId: link.staffId,
        ink: { color: link.active || link.staffId ? "team" : "child", width: 1.4, alpha: link.active ? 1 : 0.5, dash: [],
          animation: link.active ? 0 : undefined } });
    }
    for (const wire of staffWires) {
      const path = staffPath(wire.from, wire.to);
      items.push({ id: `staff:${wire.id}`, entry: { path, extent: pathExtent(path) }, from: wire.from, to: wire.to, staffId: wire.id,
        sourceId: nodesById.get(wire.id)?.staffOf, targetId: wire.id, shape: "staff", dots: true,
        ink: { color: "team", width: 1.6, alpha: wire.active ? 1 : 0.55, dash: wire.active ? [] : [2, 5],
          animation: wire.active ? 0 : undefined } });
    }
    const sig = pending.map(task => `${task.id}=${task.key}`).join("|");
    const stablePending = sig === pendingRef.current.sig ? pendingRef.current.tasks : pending;
    pendingRef.current = { sig, tasks: stablePending };
    return { items, pending: stablePending };
  }, [doc, snapshot?.nativeOperations, lod, nodesById, keepExpandedIds, derivedStructure, childTree,
    cache, obstacleRevision, accessoryWires, exchanges, staffWires, prefs.wireRouting, revision, workerEnabled]);
  useEffect(() => {
    if (!guides.pending.length) return;
    worker.start(() => setWorkerEnabled(false));
    if (!worker.available) { setWorkerEnabled(false); return; }
    const tasks = new Map(guides.pending.map(task => [task.id, task]));
    let changed = false;
    let unsubscribe: (() => void) | undefined;
    const publish = () => {
      if (interaction.getDrag()) return;
      unsubscribe?.();
      refresh(value => value + 1);
    };
    if (obstacleRef.current.cache !== cache || obstacleRef.current.rev !== obstacleRevision) {
      obstacleRef.current = { cache, rev: obstacleRevision, boxes: cache.obstacles.all() };
    }
    worker.request({ boxes: obstacleRef.current.boxes,
      tasks: guides.pending.map(({ kind, ...task }) => ({ ...task, kind: "guide", edgeKind: kind })),
      receive(results, done) {
        for (const result of results) {
          if (result.kind !== "guide") continue;
          const task = tasks.get(result.id);
          if (task && cache.acceptGuide(task, result.entry, obstacleRevision)) changed = true;
        }
        if (done && changed) {
          if (interaction.getDrag()) unsubscribe = interaction.subscribeDrag(publish);
          else publish();
        }
      } });
    return () => {
      unsubscribe?.();
      worker.discard();
    };
  }, [guides.pending, cache, obstacleRevision, worker, interaction]);
  return guides.items;
}
