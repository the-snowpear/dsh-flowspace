import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { FlowNode, FlowspaceDocument } from "../../types.ts";
import { nodeBox } from "../geometry.ts";
import type { MenuState } from "../ui/ContextMenu.tsx";
import { isTypingTarget, type RouteId } from "./canvasGraphOps.ts";

export interface CanvasShortcutsInput {
  replayLocked: RefObject<boolean>;
  rootRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  pointerRef: RefObject<{ x: number; y: number } | null>;
  docRef: MutableRefObject<FlowspaceDocument>;
  hasOpenDialog: boolean;
  hasKeyModal: boolean;
  menu: MenuState | null;
  quickCreateOpen: boolean;
  payloadPeekOpen: boolean;
  routeName: RouteId;
  vpSize: { width: number; height: number };
  selection: { nodes: string[]; groups: string[]; edge: string | null };
  setMenu: (menu: MenuState | null) => void;
  setPaletteDialog: (v: { targetNodeId: string | null; query: string; index: number } | null) => void;
  setSpacePressed: (v: boolean) => void;
  setHelpModal: (v: boolean) => void;
  setTool: (t: "pointer" | "hand") => void;
  setSelection: (s: { nodes: string[]; groups: string[]; edge: string | null }) => void;
  openQuickCreate: (anchor: { x: number; y: number }) => void;
  copySelection: () => boolean;
  pasteClipboard: () => boolean;
  duplicateSelection: () => boolean;
  selectAllVisible: () => void;
  ungroup: (gid: string) => void;
  toggleParticipation: (mode: "bypassed" | "paused") => void;
  runSelection: () => void;
  performUndo: (redo: boolean) => void;
  openWindow: (id: string) => void;
  fitView: (onlySelected?: boolean) => void;
  groupSelected: () => void;
  openDetailCard: (id: string) => void;
  deleteSelection: () => void;
  isNodeVisible: (n: FlowNode | undefined, allowCollapsedChild?: boolean) => boolean;
  revealNode: (id: string) => void;
}

/**
 * Registers global FlowSpace keyboard shortcuts ONCE per mount by reading from a stable ref,
 * eliminating the 33-dependency addEventListener/removeEventListener churn on every render.
 */
export function useCanvasShortcuts(input: CanvasShortcutsInput): void {
  const latest = useRef(input);
  latest.current = input;

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      const s = latest.current;
      if (s.replayLocked.current) return;
      const target = ev.target instanceof HTMLElement ? ev.target : null;
      const inOurRoot =
        Boolean(target && s.rootRef.current?.contains(target)) ||
        document.activeElement === document.body;
      if (!inOurRoot && !s.hasKeyModal) return;

      const mod = ev.ctrlKey || ev.metaKey;
      const typing = !!target?.closest(
        'input, textarea, select, [contenteditable="true"]',
      );

      if (s.hasOpenDialog) {
        // Native `<dialog>` handles Esc cancellation, inert background, and focus containment.
        return;
      }

      if (s.menu && ev.key === "Escape") {
        ev.preventDefault();
        s.menu.returnFocus?.focus({ preventScroll: true });
        s.setMenu(null);
        return;
      }

      if (target?.closest(".fs-team-dialog")) return;
      if (mod && (ev.key.toLowerCase() === "k" || ev.key.toLowerCase() === "f")) {
        if (!target?.closest(".fs-embedded")) {
          ev.preventDefault();
          s.setPaletteDialog({ targetNodeId: null, query: "", index: 0 });
          return;
        }
      }

      if (
        typing ||
        isTypingTarget(document.activeElement) ||
        target?.closest(".fs-team-page, .fs-team-view")
      ) {
        return;
      }
      if (s.quickCreateOpen || s.payloadPeekOpen) return;

      if (ev.code === "Space" && !target?.closest("button")) {
        ev.preventDefault();
        s.setSpacePressed(true);
        return;
      }
      if (mod && ["z", "y"].includes(ev.key.toLowerCase())) {
        ev.preventDefault();
        s.performUndo(ev.shiftKey || ev.key.toLowerCase() === "y");
        return;
      }

      const onCanvas =
        s.routeName === "canvas" &&
        !target?.closest(".fs-embedded") &&
        (s.rootRef.current?.getClientRects().length ?? 0) > 0;
      const lowerKey = ev.key.toLowerCase();
      if (onCanvas && !mod && !ev.altKey) {
        const neutralFocus =
          !target ||
          target === document.body ||
          target === s.rootRef.current ||
          target === s.viewportRef.current;
        if (
          (ev.key === "Tab" && !ev.shiftKey && neutralFocus) ||
          (ev.shiftKey && lowerKey === "a")
        ) {
          ev.preventDefault();
          const vpRect = s.viewportRef.current?.getBoundingClientRect();
          const ptr = s.pointerRef.current;
          const inside =
            ptr &&
            vpRect &&
            ptr.x >= vpRect.left &&
            ptr.x <= vpRect.right &&
            ptr.y >= vpRect.top &&
            ptr.y <= vpRect.bottom;
          s.openQuickCreate(
            inside
              ? ptr
              : {
                  x: (vpRect?.left ?? 0) + (vpRect?.width ?? s.vpSize.width) / 2,
                  y: (vpRect?.top ?? 0) + (vpRect?.height ?? s.vpSize.height) / 2,
                },
          );
          return;
        }
        if (ev.key === "?") {
          ev.preventDefault();
          s.setHelpModal(true);
          return;
        }
      }
      if (onCanvas && mod && !ev.altKey) {
        if (lowerKey === "c" && !ev.shiftKey) {
          if (window.getSelection()?.toString()) return;
          if (s.copySelection()) ev.preventDefault();
          return;
        }
        if (lowerKey === "v" && !ev.shiftKey) {
          if (s.pasteClipboard()) ev.preventDefault();
          return;
        }
        if (lowerKey === "d") {
          ev.preventDefault();
          s.duplicateSelection();
          return;
        }
        if (lowerKey === "a") {
          ev.preventDefault();
          s.selectAllVisible();
          return;
        }
        if (lowerKey === "g") {
          ev.preventDefault();
          if (ev.shiftKey) {
            for (const gid of s.selection.groups) s.ungroup(gid);
          } else {
            s.groupSelected();
          }
          return;
        }
        if (lowerKey === "b") {
          ev.preventDefault();
          s.toggleParticipation("bypassed");
          return;
        }
        if (lowerKey === "m") {
          ev.preventDefault();
          s.toggleParticipation("paused");
          return;
        }
      }
      if (mod && ev.key === "Enter") {
        ev.preventDefault();
        s.runSelection();
        return;
      }
      if (ev.altKey && ev.key === "Enter" && s.selection.nodes.length === 1) {
        ev.preventDefault();
        s.openWindow(s.selection.nodes[0]);
        return;
      }
      if (mod) return;

      const lower = ev.key.toLowerCase();
      if (lower === "f") {
        ev.preventDefault();
        s.fitView(ev.shiftKey);
      } else if (lower === "g") {
        ev.preventDefault();
        s.groupSelected();
      } else if (lower === "d" && s.selection.nodes.length === 1) {
        const n = s.docRef.current.nodes.find((x) => x.id === s.selection.nodes[0]);
        if (n?.kind === "agent") {
          ev.preventDefault();
          s.openDetailCard(n.id);
        }
      } else if (lower === "v") {
        s.setTool("pointer");
      } else if (lower === "h") {
        s.setTool("hand");
      } else if (ev.key === "Escape") {
        s.setMenu(null);
        s.setSelection({ nodes: [], groups: [], edge: null });
      } else if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        s.deleteSelection();
      } else if (ev.key.startsWith("Arrow") && s.selection.nodes.length === 1) {
        ev.preventDefault();
        const cur = s.docRef.current.nodes.find(
          (x) => x.id === s.selection.nodes[0],
        );
        if (!cur) return;
        const cb = nodeBox(cur);
        const cx = cb.x + cb.w / 2;
        const cy = cb.y + cb.h / 2;
        const horiz = ev.key === "ArrowLeft" || ev.key === "ArrowRight";
        const sign = ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 1;
        const nextCandidate = s.docRef.current.nodes
          .filter((n) => n.id !== cur.id && s.isNodeVisible(n))
          .map((n) => {
            const nb = nodeBox(n);
            const dx = nb.x + nb.w / 2 - cx;
            const dy = nb.y + nb.h / 2 - cy;
            return {
              n,
              primary: horiz ? dx * sign : dy * sign,
              cross: horiz ? Math.abs(dy) : Math.abs(dx),
            };
          })
          .filter((c) => c.primary > 8)
          .sort((a, b) => a.primary + a.cross * 2 - (b.primary + b.cross * 2))[0];
        if (nextCandidate) s.revealNode(nextCandidate.n.id);
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === "Space") latest.current.setSpacePressed(false);
    };
    const onBlur = () => latest.current.setSpacePressed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
