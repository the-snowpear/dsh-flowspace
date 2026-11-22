import { useCallback, type KeyboardEvent } from "react";

export function useListboxNavigation(opts: {
  count: number;
  active: number;
  setActive: (index: number) => void;
  onSelect: (index: number) => void;
  onClose?: (focusTrigger?: boolean) => void;
  loop?: boolean;
  selectOnSpace?: boolean;
  scrollToIndex?: (index: number) => void;
}) {
  const {
    count,
    active,
    setActive,
    onSelect,
    onClose,
    loop = true,
    selectOnSpace = false,
    scrollToIndex,
  } = opts;

  return useCallback(
    (event: KeyboardEvent) => {
      const last = Math.max(0, count - 1);
      const move = (next: number) => {
        setActive(next);
        scrollToIndex?.(next);
      };
      if (event.key === "ArrowDown") {
        event.preventDefault();
        move(active >= last ? (loop ? 0 : last) : active + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(active <= 0 ? (loop ? last : 0) : active - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        move(0);
      } else if (event.key === "End") {
        event.preventDefault();
        move(last);
      } else if (event.key === "Enter" || (selectOnSpace && event.key === " ")) {
        event.preventDefault();
        if (count > 0) onSelect(active);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose?.(true);
      } else if (event.key === "Tab") {
        onClose?.(false);
      }
    },
    [count, active, setActive, onSelect, onClose, loop, selectOnSpace, scrollToIndex],
  );
}
