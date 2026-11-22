import { useEffect, type RefObject } from "react";

/**
 * Keeps an anchored floating element positioned inside the viewport and closes
 * on outside pointer-down when native `popover="auto"` is unavailable or unused.
 */
export function useAnchoredPopover(opts: {
  open: boolean;
  popoverRef: RefObject<HTMLElement | null>;
  anchorRef?: RefObject<HTMLElement | null>;
  place?: () => void;
  onClose: (restoreFocus?: boolean) => void;
  listenOutside?: boolean;
}) {
  const { open, popoverRef, anchorRef, place, onClose, listenOutside = true } = opts;

  useEffect(() => {
    if (!open) return;
    const reposition = () => place?.();
    if (place) {
      window.addEventListener("resize", reposition);
      document.addEventListener("scroll", reposition, true);
    }
    const outside = (event: PointerEvent) => {
      if (!listenOutside) return;
      const target = event.target as Node;
      if (
        !popoverRef.current?.contains(target) &&
        !anchorRef?.current?.contains(target)
      ) {
        onClose(false);
      }
    };
    if (listenOutside) document.addEventListener("pointerdown", outside, true);
    return () => {
      if (place) {
        window.removeEventListener("resize", reposition);
        document.removeEventListener("scroll", reposition, true);
      }
      if (listenOutside) document.removeEventListener("pointerdown", outside, true);
    };
  }, [open, popoverRef, anchorRef, place, onClose, listenOutside]);
}
