import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Icon } from "./icons.tsx";

let cachedSupportsDisplayTransition: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedSupportsDisplayTransition !== undefined) {
    return cachedSupportsDisplayTransition;
  }
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = "none";
  cachedSupportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.CSS?.supports?.("overlay", "auto")) &&
    canTransitionDisplay()
  );
}

function isPointOutsideDialogBox(
  clientX: number,
  clientY: number,
  dialog: HTMLDialogElement,
): boolean {
  const rect = dialog.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  );
}

export interface CanvasDialogProps {
  /** Controls whether the modal dialog is open. Defaults to `true` when conditionally mounted. */
  open?: boolean;
  /** Invoked after the dialog closes (`Esc`, close button, or safe backdrop light-dismiss). */
  onClose: () => void;
  /** Visible heading rendered as an `<h2>` and wired via `aria-labelledby`. */
  title?: ReactNode;
  /** Optional subtitle/description rendered below `title`. */
  description?: ReactNode;
  /** Accessible name required when `title` is omitted (e.g., frameless Command Palette). */
  ariaLabel?: string;
  /** Optional footer slot (e.g., Cancel / Primary action buttons). */
  footer?: ReactNode;
  /** Accessible label for the header close button. Defaults to `"Close"`. */
  closeLabel?: string;
  /** Visual width/layout preset matching `.dialog` variants in `surfaces.css`. */
  variant?: "default" | "command" | "file" | "wide";
  /** Extra classes added to `<dialog>`. */
  className?: string;
  /** Whether clicking outside on `::backdrop` closes the modal. Defaults to `true`. */
  dismissOnBackdrop?: boolean;
  /** Optional external ref forwarded to the underlying `<dialog>` element. */
  dialogRef?: RefObject<HTMLDialogElement>;
  children: ReactNode;
}

/**
 * Accessible native `<dialog>` modal primitive (`R7` + `modern-web-guidance: dialog`).
 *
 * - Opens via `.showModal()` in the browser top layer (`inert` background, native focus
 *   containment, `::backdrop`, `Esc` dismissal, and automatic focus restoration to the
 *   triggering control without `role="dialog"` or manual Tab-trap hacks).
 * - Prevents accidental dismissal when drag-selecting text inside an `<input>`/`<textarea>`
 *   and releasing the pointer on the backdrop (`mousedown` + `click` target & bounds guard).
 */
export function CanvasDialog({
  open = true,
  onClose,
  title,
  description,
  ariaLabel,
  footer,
  closeLabel = "Close",
  variant = "default",
  className = "",
  dismissOnBackdrop = true,
  dialogRef,
  children,
}: CanvasDialogProps) {
  const internalRef = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const titleId = useId();
  const descId = useId();
  const backdropPressedRef = useRef(false);
  const closingRef = useRef(false);
  const invokerFallbackRef = useRef<HTMLElement | null>(null);

  const setMergedRef = useCallback(
    (node: HTMLDialogElement | null) => {
      internalRef.current = node;
      if (dialogRef && "current" in dialogRef) {
        (dialogRef as { current: HTMLDialogElement | null }).current = node;
      }
    },
    [dialogRef],
  );

  const requestAnimatedClose = useCallback(async () => {
    const el = internalRef.current;
    if (!el || !el.open || closingRef.current) {
      if (!el?.open) onCloseRef.current();
      return;
    }
    closingRef.current = true;
    const reduced =
      Boolean(el.closest('[data-perf-tier="L1"]')) ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

    if (!reduced && !supportsTopLayerExit()) {
      el.setAttribute("data-closing", "");
      const animations = el.getAnimations?.({ subtree: true }) ?? [];
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise<void>((resolve) => setTimeout(resolve, 260)),
        ]);
      }
      el.removeAttribute("data-closing");
    }

    if (el.open) {
      el.close();
    }
  }, []);

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;

    const handleNativeClose = () => {
      el.returnValue = "";
      closingRef.current = false;
      onCloseRef.current();
      /* If conditional rendering unmounts <dialog> right after close, ensure invoker retains focus (R7) */
      const fallbackInvoker = invokerFallbackRef.current;
      if (fallbackInvoker) {
        queueMicrotask(() => {
          if (
            document.activeElement === document.body &&
            fallbackInvoker.isConnected
          ) {
            fallbackInvoker.focus({ preventScroll: true });
          }
        });
      }
    };

    const handleCancel = (ev: Event) => {
      ev.preventDefault();
      void requestAnimatedClose();
    };

    el.addEventListener("close", handleNativeClose);
    el.addEventListener("cancel", handleCancel);
    return () => {
      el.removeEventListener("close", handleNativeClose);
      el.removeEventListener("cancel", handleCancel);
    };
  }, [requestAnimatedClose]);

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (open) {
      closingRef.current = false;
      el.removeAttribute("data-closing");
      if (!el.open) {
        if (document.activeElement instanceof HTMLElement) {
          invokerFallbackRef.current = document.activeElement;
        }
        el.showModal();
      }
    } else if (el.open) {
      void requestAnimatedClose();
    }

    return () => {
      if (el.open) {
        el.close();
      }
    };
  }, [open, requestAnimatedClose]);

  const handleMouseDown = (ev: MouseEvent<HTMLDialogElement>) => {
    const el = internalRef.current;
    if (!dismissOnBackdrop || !el) {
      backdropPressedRef.current = false;
      return;
    }
    backdropPressedRef.current =
      ev.target === el &&
      isPointOutsideDialogBox(ev.clientX, ev.clientY, el);
  };

  const handleClick = (ev: MouseEvent<HTMLDialogElement>) => {
    const el = internalRef.current;
    const wasPressedOutside = backdropPressedRef.current;
    backdropPressedRef.current = false;
    if (
      dismissOnBackdrop &&
      wasPressedOutside &&
      el &&
      ev.target === el &&
      isPointOutsideDialogBox(ev.clientX, ev.clientY, el)
    ) {
      void requestAnimatedClose();
    }
  };

  const variantClass =
    variant === "command"
      ? "command-dialog"
      : variant === "file"
        ? "file-dialog"
        : variant === "wide"
          ? "wide-dialog"
          : "";

  return (
    <dialog
      ref={setMergedRef}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      {...(dismissOnBackdrop ? ({ closedby: "any" } as Record<string, string>) : {})}
      className={["dialog", "fs-modal-dialog", variantClass, className]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {title && (
        <header className="dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descId}>{description}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={() => void requestAnimatedClose()}
          >
            <Icon name="x" />
          </button>
        </header>
      )}
      <div className="dialog-body">{children}</div>
      {footer && <footer className="dialog-footer">{footer}</footer>}
    </dialog>
  );
}
