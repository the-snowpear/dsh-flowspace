import { useEffect, useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";

function motionAllowed(node: Element | null): boolean {
  return (
    !!node &&
    !node.closest('[data-perf-tier="L1"]') &&
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Slides one highlight under the current item of a list. The container receives
 * `--ind-x/y/w/h` and `data-indicator` so CSS can draw the highlight as `::before`.
 */
export function useSlidingIndicator(
  ref: RefObject<HTMLElement>,
  selector: string,
  deps: DependencyList,
) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const place = () => {
      const item = root.querySelector<HTMLElement>(selector);
      if (!item) {
        root.dataset.indicator = "off";
        return;
      }
      const frameBox = root.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      root.style.setProperty("--ind-x", `${box.left - frameBox.left + root.scrollLeft}px`);
      root.style.setProperty("--ind-y", `${box.top - frameBox.top + root.scrollTop}px`);
      root.style.setProperty("--ind-w", `${box.width}px`);
      root.style.setProperty("--ind-h", `${box.height}px`);
      const first = root.dataset.indicator !== "on";
      if (first) root.dataset.indicatorStill = "";
      root.dataset.indicator = "on";
      if (first) frame = requestAnimationFrame(() => { delete root.dataset.indicatorStill; });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    for (const child of Array.from(root.children)) observer.observe(child);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** FLIP reflow for `[data-flip]` descendants so live data never jumps. */
export function useFlip(ref: RefObject<HTMLElement>, deps: DependencyList) {
  const previous = useRef(new Map<string, { x: number; y: number }>());
  const measure = (root: HTMLElement) => {
    const frame = root.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number; el: HTMLElement }>();
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-flip]"))) {
      const box = el.getBoundingClientRect();
      next.set(el.dataset.flip!, { x: box.left - frame.left, y: box.top - frame.top + root.scrollTop, el });
    }
    return next;
  };
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const next = measure(root);
    const animate = motionAllowed(root) && previous.current.size > 0;
    if (animate) {
      for (const [id, { x, y, el }] of next) {
        const old = previous.current.get(id);
        if (!old) {
          el.animate(
            [{ opacity: 0, transform: "translateY(6px) scale(.98)" }, { opacity: 1, transform: "none" }],
            { duration: 260, easing: "cubic-bezier(.16,.84,.44,1)" },
          );
          continue;
        }
        const dx = old.x - x;
        const dy = old.y - y;
        if (Math.abs(dx) + Math.abs(dy) < 1) continue;
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: 380, easing: "cubic-bezier(.32,.72,0,1)" },
        );
      }
    }
    previous.current = new Map([...next].map(([id, { x, y }]) => [id, { x, y }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new ResizeObserver(() => {
      previous.current = new Map([...measure(root)].map(([id, { x, y }]) => [id, { x, y }]));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [ref]);
}
