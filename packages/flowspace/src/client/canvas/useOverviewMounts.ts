import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { intersects, viewportBox } from "../sceneModel.ts";
import type { Box } from "../geometry.ts";
import type { FlowNode } from "../../types.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";
import { shouldRenderDomInLod } from "./overviewScene.ts";

/** Card-local mounting changes never mutate inherited world/layer style. */
export function useOverviewMounts(nodes: { n: FlowNode; b: Box }[], area: Box, lod: boolean,
  keepExpandedIds: ReadonlySet<string>, size: { width: number; height: number }, reducedMotion: boolean) {
  const store = useCanvasInteractionStore();
  const [mounted, setMounted] = useState(() => new Set(lod ? [] : nodes.filter(({ b }) => intersects(b, area)).map(({ n }) => n.id)));
  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;
  const fadesRef = useRef(new Map<string, Animation>());
  const latest = useRef({ nodes, keepExpandedIds });
  latest.current = { nodes, keepExpandedIds };
  useLayoutEffect(() => {
    if (!lod) return;
    const animations: [string, Animation][] = [];
    for (const id of mountedRef.current) {
      const node = latest.current.nodes.find(({ n }) => n.id === id)?.n;
      if (node && !shouldRenderDomInLod(node, latest.current.keepExpandedIds)) {
        const card = store.getElement(id);
        if (card && !reducedMotion && typeof card.animate === "function") {
          const animation = card.animate([{ opacity: 1 }, { opacity: 0 }], {
            id: "fs-overview-fade", duration: 140, fill: "forwards", easing: "ease-out",
          });
          fadesRef.current.set(id, animation);
          animations.push([id, animation]);
        }
      }
    }
    const cancelAll = () => {
      for (const [id, animation] of animations) {
        animation.cancel();
        if (fadesRef.current.get(id) === animation) fadesRef.current.delete(id);
      }
    };
    const timer = mountedRef.current.size ? setTimeout(() => {
      flushSync(() => setMounted(new Set()));
      cancelAll();
    }, reducedMotion ? 0 : 140) : undefined;
    return () => { clearTimeout(timer); cancelAll(); };
  }, [lod, store, reducedMotion]);

  useLayoutEffect(() => {
    if (lod) return;
    let frame = 0;
    const mount = () => {
      const camera = store.getCamera();
      if (camera.moving) {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        return;
      }
      const viewport = viewportBox(camera, size);
      const cx = viewport.x + viewport.w / 2, cy = viewport.y + viewport.h / 2;
      const targets = nodes.filter(({ b }) => intersects(b, viewport));
      const wanted = new Set(targets.map(({ n }) => n.id));
      let next = new Set([...mountedRef.current].filter(id => wanted.has(id)));
      const pending = targets.filter(({ n }) => !next.has(n.id)).sort((a, b) =>
        Math.hypot(a.b.x + a.b.w / 2 - cx, a.b.y + a.b.h / 2 - cy) - Math.hypot(b.b.x + b.b.w / 2 - cx, b.b.y + b.b.h / 2 - cy));
      let offset = 0;
      const step = () => {
        frame = 0;
        const live = store.getCamera();
        if (live.lod || live.moving) return;
        next = new Set(next);
        for (const { n } of pending.slice(offset, offset + 6)) next.add(n.id);
        offset += 6;
        setMounted(next);
        if (offset < pending.length) frame = requestAnimationFrame(step);
      };
      if (pending.length || next.size !== mountedRef.current.size) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(step);
      }
    };
    mount();
    const stop = store.subscribeCamera(mount);
    return () => { stop(); cancelAnimationFrame(frame); };
  }, [nodes, area, lod, keepExpandedIds, store, size]);

  useLayoutEffect(() => {
    const ids = new Set(nodes.filter(({ n, b }) => intersects(b, area) &&
      (shouldRenderDomInLod(n, keepExpandedIds) || !lod && mounted.has(n.id))).map(({ n }) => n.id));
    for (const id of ids) {
      const fade = fadesRef.current.get(id);
      if (fade) { fade.cancel(); fadesRef.current.delete(id); }
    }
    store.setOverviewDomIds(ids);
  }, [mounted, nodes, area, lod, keepExpandedIds, store]);
  return mounted;
}
