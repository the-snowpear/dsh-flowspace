import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { BoardCard } from "../types.ts";

interface DropTarget {
  columnId: string;
  beforeId?: string;
}

interface BoardDrag {
  card: BoardCard;
  x: number;
  y: number;
  width: number;
  target?: DropTarget;
}

const edgeSpeed = (position: number, start: number, end: number): number => {
  if (position < start || position > end) return 0;
  const edge = Math.min(32, (end - start) / 3);
  if (position - start < edge) return -12 * (1 - (position - start) / edge);
  if (end - position < edge) return 12 * (1 - (end - position) / edge);
  return 0;
};

export function useBoardDrag(
  root: RefObject<HTMLDivElement>,
  onDrop: (cardId: string, target: DropTarget) => void,
) {
  const [drag, setDrag] = useState<BoardDrag>();
  const cleanup = useRef<() => void>();
  const suppressClick = useRef(false);
  useEffect(() => () => cleanup.current?.(), []);

  const start = (event: ReactPointerEvent<HTMLElement>, card: BoardCard) => {
    const target = event.target as Element;
    if (
      event.button !== 0 || event.ctrlKey || event.metaKey ||
      target.closest(".board-check, .board-card-actions, input, textarea, select")
    ) return;
    const board = root.current;
    const scrollArea = board?.querySelector<HTMLElement>(".board-lanes");
    if (!scrollArea) return;
    const lanes = scrollArea;

    cleanup.current?.();
    const source = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const width = Math.min(232, source.getBoundingClientRect().width);
    let x = startX;
    let y = startY;
    let active = false;
    let frame = 0;

    function columnAtPointer() {
      const column = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-board-col-id]");
      return column && lanes.contains(column) ? column : undefined;
    }

    function destination(): DropTarget | undefined {
      const column = columnAtPointer();
      const columnId = column?.dataset.boardColId;
      if (!column || !columnId) return;
      const before = Array.from(column.querySelectorAll<HTMLElement>("[data-board-card-id]"))
        .find((element) => {
          if (element.dataset.boardCardId === card.id) return false;
          const rect = element.getBoundingClientRect();
          return y < rect.top + rect.height / 2;
        });
      return { columnId, beforeId: before?.dataset.boardCardId };
    }

    function paint() {
      const rect = lanes.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        if (lanes.scrollWidth > lanes.clientWidth) lanes.scrollLeft += edgeSpeed(x, rect.left, rect.right);
        if (lanes.scrollHeight > lanes.clientHeight) lanes.scrollTop += edgeSpeed(y, rect.top, rect.bottom);
        const scroll = columnAtPointer()?.querySelector<HTMLElement>(".board-column-scroll");
        if (scroll && scroll.scrollHeight > scroll.clientHeight) {
          const area = scroll.getBoundingClientRect();
          scroll.scrollTop += edgeSpeed(y, area.top, area.bottom);
        }
      }
      const target = destination();
      setDrag((current) => {
        return current?.x === x && current.y === y &&
          current.target?.columnId === target?.columnId && current.target?.beforeId === target?.beforeId
          ? current : { card, x, y, width, target };
      });
      frame = requestAnimationFrame(paint);
    }

    function move(next: PointerEvent) {
      if (next.pointerId !== pointerId) return;
      x = next.clientX;
      y = next.clientY;
      if (active || Math.hypot(x - startX, y - startY) <= 5) return;
      active = true;
      suppressClick.current = true;
      source.setPointerCapture(pointerId);
      paint();
    }

    function finish() {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", cancel);
      if (source.hasPointerCapture(pointerId)) source.releasePointerCapture(pointerId);
      cleanup.current = undefined;
    }

    function cancel() {
      finish();
      if (active) setDrag(undefined);
    }

    function end(next: PointerEvent) {
      if (next.pointerId !== pointerId) return;
      x = next.clientX;
      y = next.clientY;
      const drop = active && next.type === "pointerup" ? destination() : undefined;
      cancel();
      if (drop) onDrop(card.id, drop);
    }

    function key(next: KeyboardEvent) {
      if (next.key !== "Escape" || !active) return;
      next.preventDefault();
      next.stopPropagation();
      cancel();
    }

    cleanup.current = finish;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", cancel);
  };

  return { drag, start, suppressClick };
}
