import {
  createContext,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type { FlowEdge, FlowNode, FlowspaceSnapshot } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { paintLayer, settleLayer } from "../cameraFrame.ts";
import type { Box } from "../geometry.ts";
import { t } from "../i18n.ts";
import { hasUnusedResult } from "../nodes/FanoutView.tsx";
import { runtimeIndex } from "../sceneModel.ts";
import type { WireEnd } from "../sceneWires.ts";
import type { WireRoute } from "../wireRouting.ts";
import { EMBED_RETAIN_ATTEMPTS } from "./viewportMath.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";

export const SessionOnCanvas = createContext(true);

export function EmbeddedSession({
  node,
  bridge,
  renderConversation,
  onError,
  onPresenceChange,
}: {
  node: FlowNode;
  bridge: CanvasBridge;
  renderConversation: (
    node: FlowNode,
    reference: SessionReference,
  ) => ReactNode;
  onError: (err: unknown) => void;
  onPresenceChange: (sessionId: string, mounted: boolean) => void;
}) {
  const [reference, setReference] = useState<SessionReference>();
  const [retained, setRetained] = useState<string>();
  const present = useContext(SessionOnCanvas);
  useLayoutEffect(() => {
    if (!present || !retained || retained !== node.sessionId) return;
    onPresenceChange(retained, true);
    return () => onPresenceChange(retained, false);
  }, [retained, node.sessionId, present, onPresenceChange]);
  useEffect(() => {
    if (!node.sessionId) return;
    const sid = node.sessionId;
    let active = true;
    let ref: SessionReference | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const acquire = () => {
      if (!active) return;
      try {
        ref = bridge.retain(node);
      } catch (err) {
        if (++attempt < EMBED_RETAIN_ATTEMPTS) {
          retryTimer = setTimeout(acquire, 250 * attempt);
        } else {
          onError(err);
        }
        return;
      }
      setRetained(sid);
      const acquired = ref;
      acquired.ready
        .then(() => {
          if (active) setReference(acquired);
        })
        .catch(onError);
    };
    acquire();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      if (ref) ref.release();
    };
  }, [bridge, node.sessionId]);

  return reference ? (
    <>{renderConversation(node, reference)}</>
  ) : (
    <div className="fs-loading">{t("openingConversation")}</div>
  );
}

export type CardUiState = {
  preserveBody?: boolean;
  selected?: boolean;
  snapPortId?: string;
  fileDraft?: string;
  hubKind?: FlowEdge["kind"];
  staffSnapped?: boolean;
  quoteText?: string;
};

export type CardRenderer = (
  node: FlowNode,
  placement: "canvas" | "window" | "conversation",
  snapshot: FlowspaceSnapshot | null,
  box: Box,
  semantic?: boolean,
  prewarmFull?: boolean,
  contentVersion?: object,
  branchOffset?: number,
  ui?: CardUiState,
) => ReactNode;

export type WireLayout = {
  edge: FlowEdge;
  from: WireEnd;
  to: WireEnd;
  geom: WireRoute;
  extent: Box;
  evState: string;
};

export function useCardActions<T extends Record<string, (...args: never[]) => unknown>>(
  actions: T,
): T {
  const latest = useRef(actions);
  useLayoutEffect(() => {
    latest.current = actions;
  });
  return useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          (...args: never[]) => latest.current[key](...args),
        ]),
      ) as T,
    [],
  );
}

export function CardBody({
  compact,
  preserve,
  prewarmFull,
  contentVersion,
  full,
  summary,
}: {
  compact: boolean;
  preserve: boolean;
  prewarmFull?: boolean;
  contentVersion?: object;
  full: () => ReactNode;
  summary: () => ReactNode;
}) {
  const previous = useRef<{ version?: object; body: ReactNode } | null>(null);
  if (!compact || prewarmFull) {
    if (!contentVersion || previous.current?.version !== contentVersion) {
      previous.current = { version: contentVersion, body: full() };
    }
  } else if (!preserve) {
    previous.current = null;
  }
  return (
    <>
      {(previous.current != null || !compact) && (
        <div key="full" className="node-body" hidden={compact}>
          <SessionOnCanvas.Provider value={!compact}>
            {previous.current?.body}
          </SessionOnCanvas.Provider>
        </div>
      )}
      {(compact || preserve) && (
        <div key="compact" className="node-body" hidden={!compact}>
          {summary()}
        </div>
      )}
    </>
  );
}

export const ViewportCard = memo(
  function ViewportCard({
    node,
    visible,
    keepSlot,
    prepare,
    rasterScene,
    semantic,
    box,
    dx,
    dy,
    render,
    snapshot,
    branchOffset,
    onBranchScroll,
    selected,
    snapPortId,
    fileDraft,
    hubKind,
    staffSnapped,
    quoteText,
  }: {
    node: FlowNode;
    visible: boolean;
    keepSlot: boolean;
    prepare: boolean;
    rasterScene: boolean;
    semantic: boolean;
    box: Box;
    dx: number;
    dy: number;
    branchOffset?: number;
    onBranchScroll: (id: string, top: number) => void;
    render: CardRenderer;
    snapshot: FlowspaceSnapshot | null;
    incoming?: FlowEdge[];
    selected?: boolean;
    snapPortId?: string;
    fileDraft?: string;
    hubKind?: FlowEdge["kind"];
    staffSnapped?: boolean;
    quoteText?: string;
  }) {
    const slot = useRef<HTMLDivElement>(null);
    const interactionStore = useCanvasInteractionStore();
    const scroll = useRef(new Map<string, number>());
    const embeddedScroll = useRef(new Map<HTMLElement, number>());
    const visited = useRef(false);
    const keepMounted =
      node.expanded &&
      (Boolean(node.sessionId) ||
        ["git", "changes", "terminal"].includes(node.kind));
    const mounted = visible || (keepMounted ? visited.current : prepare);
    const preserveBody = !rasterScene || node.kind !== "agent" || !!node.sessionId;
    const prewarmFull = prepare && visible && !keepMounted && node.expanded;
    const contentVersion = useMemo(
      () => ({}),
      [node, snapshot, render, fileDraft, quoteText],
    );
    const content = useMemo(
      () =>
        mounted
          ? render(
              node,
              "canvas",
              snapshot,
              box,
              semantic,
              prewarmFull,
              contentVersion,
              branchOffset,
              {
                preserveBody,
                selected,
                snapPortId,
                fileDraft,
                hubKind,
                staffSnapped,
                quoteText,
              },
            )
          : null,
      [
        mounted,
        render,
        node,
        snapshot,
        box,
        semantic,
        prewarmFull,
        preserveBody,
        contentVersion,
        branchOffset,
        selected,
        snapPortId,
        fileDraft,
        hubKind,
        staffSnapped,
        quoteText,
      ],
    );
    useLayoutEffect(() => {
      const card = slot.current?.querySelector<HTMLElement>("[data-node-card]");
      if (!card) return;
      if (dx || dy) paintLayer(card, { transform: `translate(${dx}px, ${dy}px)` });
      else settleLayer(card);
    }, [mounted, dx, dy]);
    useLayoutEffect(() => {
      const card = slot.current?.querySelector<HTMLElement>("[data-node-card]");
      if (!card) return;
      interactionStore.registerElement(node.id, card);
      return () => interactionStore.registerElement(node.id, null);
    }, [interactionStore, node.id, mounted]);
    useLayoutEffect(() => {
      if (visible) visited.current = true;
      if (!visible || !slot.current) return;
      const card = slot.current.querySelector<HTMLElement>("[data-node-card]");
      if (card && typeof card.getAnimations === "function") {
        for (const animation of card.getAnimations()) {
          if (animation.id === "fs-overview-fade") animation.cancel();
        }
      }
      if (scroll.current.size) {
        for (const element of Array.from(slot.current.querySelectorAll<HTMLElement>(".node-scroll,textarea"))) {
          const value = scroll.current.get(element.className);
          if (value) element.scrollTop = value;
        }
      }
      if (!box.compact) {
        for (const [element, top] of embeddedScroll.current) {
          if (element.isConnected) element.scrollTop = top;
          else embeddedScroll.current.delete(element);
        }
      }
    }, [visible, box.compact]);
    if (!mounted && !(keepSlot && visited.current)) return null;
    return (
      <div
        className="fs-card-slot"
        ref={slot}
        hidden={mounted && !visible}
        style={mounted && !visible ? { contentVisibility: "hidden" } : undefined}
        onScrollCapture={(event) => {
          const element = event.target as HTMLElement;
          if (element.closest(".fs-embedded")) {
            if (visible && !box.compact && element.scrollHeight > element.clientHeight) {
              embeddedScroll.current.set(element, element.scrollTop);
            }
            return;
          }
          if (element.matches(".fs-branch-list")) {
            onBranchScroll(node.id, element.scrollTop);
          }
          if (element.matches(".node-scroll,textarea")) {
            scroll.current.set(element.className, element.scrollTop);
          }
        }}
      >
        {/* Keep :empty stable while the heavy card subtree is unmounted. */}
        <span hidden />
        {content}
      </div>
    );
  },
  (before, after) => {
    if (
      before.branchOffset !== after.branchOffset ||
      before.node !== after.node ||
      before.visible !== after.visible ||
      before.keepSlot !== after.keepSlot ||
      before.prepare !== after.prepare ||
      before.rasterScene !== after.rasterScene ||
      before.semantic !== after.semantic ||
      before.box !== after.box ||
      before.dx !== after.dx ||
      before.dy !== after.dy ||
      before.render !== after.render ||
      before.incoming !== after.incoming ||
      before.selected !== after.selected ||
      before.snapPortId !== after.snapPortId ||
      before.fileDraft !== after.fileDraft ||
      before.hubKind !== after.hubKind ||
      before.staffSnapped !== after.staffSnapped ||
      before.quoteText !== after.quoteText
    ) {
      return false;
    }
    if (before.snapshot === after.snapshot) return true;
    const node = after.node;
    if (node.flowType === "flowspace/variable") {
      return before.snapshot?.variables === after.snapshot?.variables;
    }
    if (node.flowType === "flowspace/trigger") {
      return before.snapshot?.triggers === after.snapshot?.triggers;
    }
    if (node.kind === "changes") {
      return before.snapshot?.live === after.snapshot?.live;
    }
    const lead =
      node.kind === "agent" &&
      (!!node.teamRef ||
        !node.sessionId ||
        !!before.snapshot?.teams?.[node.sessionId] ||
        !!after.snapshot?.teams?.[node.sessionId]);
    if (node.kind === "agent" && before.snapshot?.roles !== after.snapshot?.roles) {
      return false;
    }
    if (lead || node.kind === "role") {
      const teamId = node.teamRef?.teamId;
      if (
        before.snapshot?.roles !== after.snapshot?.roles ||
        (teamId &&
          before.snapshot?.teamBlueprints?.find((team) => team.id === teamId) !==
            after.snapshot?.teamBlueprints?.find((team) => team.id === teamId)) ||
        (node.sessionId &&
          before.snapshot?.teams?.[node.sessionId] !==
            after.snapshot?.teams?.[node.sessionId]) ||
        (node.sessionId &&
          before.snapshot?.nativeMessages !== after.snapshot?.nativeMessages) ||
        (node.kind === "role" && before.snapshot?.teams !== after.snapshot?.teams)
      ) {
        return false;
      }
    }
    const old = runtimeIndex(before.snapshot);
    const current = runtimeIndex(after.snapshot);
    if (
      node.generatedBy &&
      hasUnusedResult(before.snapshot?.runs, node) !==
        hasUnusedResult(after.snapshot?.runs, node)
    ) {
      return false;
    }
    const sameNode = (id: string) => {
      if (
        old.live.get(id) !== current.live.get(id) ||
        old.statuses.get(id) !== current.statuses.get(id)
      ) {
        return false;
      }
      if (
        old.missingEmissions.get(id)?.step !==
        current.missingEmissions.get(id)?.step
      ) {
        return false;
      }
      if (before.snapshot?.runs === after.snapshot?.runs) return true;
      const steps = old.steps.get(id);
      const next = current.steps.get(id);
      return (
        steps?.length === next?.length &&
        (!steps || steps.every((step, index) => step === next?.[index])) &&
        !old.waiting.has(id) &&
        !current.waiting.has(id)
      );
    };
    return (
      sameNode(node.id) &&
      (!node.sourceNodeId || sameNode(node.sourceNodeId)) &&
      (node.kind !== "agent" ||
        (!after.incoming?.some(
          (edge) =>
            edge.kind === "reference" &&
            before.snapshot?.sourceVersions?.[edge.source] !==
              after.snapshot?.sourceVersions?.[edge.source],
        ) &&
          before.snapshot?.subagents === after.snapshot?.subagents))
    );
  },
);
