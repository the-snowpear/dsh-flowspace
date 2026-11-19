import { getLanguage, subscribeLanguage, t, tr } from "./i18n.ts";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-api-remotes/client";
import type {} from "@deepseek-ai/dsh-api-session-controller/client";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-layout/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import type {} from "@deepseek-ai/dsh-client-ui-session/client";
import type {} from "@deepseek-ai/dsh-client-ui-conversation/client";
import type {} from "@deepseek-ai/dsh-client-ui-workspace/client";
import type { MainPanelId } from "@deepseek-ai/dsh-client-ui-layout/client";
import type {
  PropsRuntime,
  PropsRenderFactories,
  PropsRenderSlots,
} from "@deepseek-ai/dsh-client-ui-slots";
import type { SessionId } from "@deepseek-ai/dsh-session/types";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pin, Quote, Workflow } from "lucide-react";
import { TYPERT_REMOTE } from "../../lib/typert.remote-client.js";
import { CanvasApp, detectHostDark } from "./CanvasApp.tsx";
import { FlowClient, type CanvasBridge } from "./bridge.ts";
import { capsuleStateOf } from "./geometry.ts";
import { PayloadPeekPopover } from "./PayloadPeekPopover.tsx";
import "./style.css";

declare module "@deepseek-ai/dsh-api-session-controller/client" {
  interface SessionReferenceSourceMap {
    flowspace: unknown;
  }
}
declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface SlotMap {
    "flowspace.conversation": {
      kind: "single";
      scope: "session";
      owner: { nodeId?: string };
    };
  }
}
export const inject = [
  "slots",
  "remote",
  "layout",
  "sessions",
  "uiSession",
  "conversation",
  "uiWorkspace",
  "locale",
];
const PANEL_ID = "flowspace" as MainPanelId;
const HMR_RESTORE_KEY = "__flowspaceHmrRestoreUntil";
const INITIAL_HASH_HANDLED_KEY = "__flowspaceInitialHashHandled";
const hmrWindow = window as unknown as Record<string, number | undefined>;
const bootUrlWantsCanvas =
  typeof window !== "undefined" &&
  (window.location.hash === "#flowspace" ||
    new URLSearchParams(window.location.search).get("panel") === "flowspace");

export function apply(ctx: Context): void {
  void ctx.remote.$mount(TYPERT_REMOTE);
  ctx.inject(["remote.flowspace", "remote.subagents"], mountUi);
}
function mountUi(ctx: Context): void {
  const bridge = new FlowClient(ctx);
  let mainRegistered = false;
  let activeBeforeTeardown =
    ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID;

  ctx.effect(() => bridge.connect());
  ctx.effect(() => () => bridge.dispose());
  ctx.slots.inject("main", () => {
    const dispose = ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        children: {
          "flowspace.conversation": { kind: "single", scope: "session" },
        },
        inject: () => ({ bridge }),
      },
      Main,
    );
    mainRegistered = true;
    const restoreUntil = hmrWindow[HMR_RESTORE_KEY] ?? 0;
    delete hmrWindow[HMR_RESTORE_KEY];
    const shouldAutoOpenCanvas =
      !hmrWindow[INITIAL_HASH_HANDLED_KEY] &&
      (bootUrlWantsCanvas ||
        window.location.hash === "#flowspace" ||
        new URLSearchParams(window.location.search).get("panel") ===
          "flowspace");
    if (shouldAutoOpenCanvas) {
      hmrWindow[INITIAL_HASH_HANDLED_KEY] = 1;
    }
    if (restoreUntil > Date.now() || shouldAutoOpenCanvas) {
      activeBeforeTeardown = true;
      queueMicrotask(() => {
        if (mainRegistered) ctx.layout.selectPanel(PANEL_ID);
      });
    } else {
      activeBeforeTeardown =
        ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID;
    }
    return () => {
      if (ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID) {
        activeBeforeTeardown = true;
      }
      mainRegistered = false;
      dispose();
    };
  });
  ctx.effect(() => foldHostSidebar(ctx));
  ctx.effect(() => {
    const unsubscribe = ctx.layout.panelInfo.subscribe(() => {
      if (!mainRegistered) return;
      activeBeforeTeardown =
        ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID;
    });
    return () => {
      unsubscribe();
      if (activeBeforeTeardown) {
        hmrWindow[HMR_RESTORE_KEY] = Date.now() + 5000;
      }
    };
  });
  ctx.slots.inject("flowspace.conversation", () =>
    ctx.slots.register(
      {
        name: "flowspace.conversation",
        inject: (sessionId: SessionId) => ({
          watchDraft: (nodeId: string) =>
            bridge.watchDraft(ctx.sessions.scope(sessionId)!, nodeId),
        }),
      },
      Conversation,
    ),
  );
  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 100,
        label: "FlowSpace",
      },
      ({ size }) => <Workflow size={size} />,
    ),
  );
  ctx.slots.inject("conversation.session.header.actions", () =>
    ctx.slots.register(
      {
        name: "conversation.session.header.actions",
        id: "flowspace-trigger",
        order: 100,
        inject: () => ({ bridge }),
      },
      ChatBadge,
    ),
  );
  ctx.slots.inject("conversation.composer.dock", () =>
    ctx.slots.register(
      {
        name: "conversation.composer.dock",
        id: "flowspace-composer-dock",
        order: 40,
        inject: () => ({ bridge }),
      },
      FlowspaceComposerDock,
    ),
  );
}
/**
 * Folds DSH's sidebar to its icon rail whenever the canvas comes to the front, so the
 * canvas opens full-bleed, and unfolds it again on the way out if FlowSpace was the one
 * that folded it. ctx.layout only offers a toggle, so the current state is read from
 * the frame's `data-sidebar-collapsed` attribute (present only while collapsed).
 */
function foldHostSidebar(ctx: Context): () => void {
  let folded = false;
  let wasActive = false;
  let raf = 0;
  const sync = () => {
    const active = ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID;
    if (active === wasActive) return;
    wasActive = active;
    cancelAnimationFrame(raf);
    let tries = 0;
    const apply = () => {
      // AppFrame sets `data-sidebar-collapsed` only while collapsed; the sidebar's own
      // toggle button tells us the frame has mounted at all.
      if (!document.querySelector("[data-sidebar-collapsed], [data-sidebar-toggle]")) {
        // The app frame may not have mounted yet on a cold boot straight into #flowspace.
        if (++tries < 60) raf = requestAnimationFrame(apply);
        return;
      }
      const collapsed = !!document.querySelector("[data-sidebar-collapsed]");
      if (active) {
        if (!collapsed) {
          ctx.layout.toggleSidebar();
          folded = true;
        }
      } else if (folded) {
        folded = false;
        if (collapsed) ctx.layout.toggleSidebar();
      }
    };
    apply();
  };
  const unsubscribe = ctx.layout.panelInfo.subscribe(sync);
  sync();
  return () => {
    unsubscribe();
    cancelAnimationFrame(raf);
  };
}

type MainProps = PropsRuntime<"main"> &
  PropsRenderSlots<"flowspace.conversation"> & { bridge: CanvasBridge };
function Main({ bridge, SessionProvider, renderSlot }: MainProps) {
  return (
    <CanvasApp
      bridge={bridge}
      renderConversation={(node, reference) => (
        <SessionProvider session={reference}>
          {renderSlot("flowspace.conversation", { nodeId: node?.id })}
        </SessionProvider>
      )}
    />
  );
}
type ConversationProps = PropsRuntime<"flowspace.conversation"> &
  PropsRenderFactories & { watchDraft: (nodeId: string) => () => void };
function Conversation({
  nodeId,
  renderFactorySlot,
  watchDraft,
  useSession,
}: ConversationProps) {
  const blank = useSession((s) => s.blank);
  useEffect(() => nodeId ? watchDraft(nodeId) : undefined, [nodeId, watchDraft]);
  return (
    <div className="fs-embedded">
      {renderFactorySlot("conversation.content", {
        variant: "embedded",
        phase: blank ? "hero" : "active",
        hero: false,
      })}
    </div>
  );
}

/** Shared reference capsule tray inside native DSH composer.dock (main chat & embedded cards, M03). */
function FlowspaceComposerDock({
  bridge,
  sessionId,
}: PropsRuntime<"conversation.composer.dock"> & {
  bridge: CanvasBridge;
}) {
  const [peek, setPeek] = useState<{
    edgeId: string;
    anchor: { x: number; y: number };
  } | null>(null);
  useSyncExternalStore(subscribeLanguage, getLanguage);
  const snapshot = bridge.useValue(value => peek ? value : null);
  const doc = bridge.useValue(value => value?.document);
  const sourceVersions = bridge.useValue(value => value?.sourceVersions);
  const node = doc?.nodes.find((n) => n.sessionId === sessionId);
  if (!doc || !node) return null;
  const incomingRefs = doc.edges.filter(
    (e) => e.kind === "reference" && e.target === node.id,
  );
  if (!incomingRefs.length) return null;

  /** Shift+click pins (always); right-click re-arms a sent capsule, else toggles pinning (M03). */
  const toggleCapsule = (edgeId: string, pinOnly: boolean) => {
    const next = structuredClone(doc);
    const target = next.edges.find((e) => e.id === edgeId);
    if (!target) return;
    if (!pinOnly && target.sentVersion && !target.always) {
      target.sentVersion = "";
    } else {
      target.always = !target.always;
    }
    void bridge.save(next).catch(() => {});
  };
  const peekEdge = peek && doc.edges.find((e) => e.id === peek.edgeId);

  return (
    <div className="fs-native-dock-tray" aria-label={t("context")}>
      {incomingRefs.map((refEdge) => {
        const src = doc.nodes.find((x) => x.id === refEdge.source);
        const state = capsuleStateOf(refEdge, sourceVersions);
        const label = refEdge.snapshotTitle || src?.title || refEdge.source;
        return (
          <button
            key={refEdge.id}
            type="button"
            className={`fs-dock-capsule fs-dock-${state}`}
            title={`${label} · ${t(state)} (${t(`${state}Tip`)}) · ${t("dockCapsuleHint")}`}
            onClick={(ev) => {
              if (ev.shiftKey) {
                toggleCapsule(refEdge.id, true);
                return;
              }
              const r = ev.currentTarget.getBoundingClientRect();
              setPeek({ edgeId: refEdge.id, anchor: { x: r.left, y: r.top - 8 } });
            }}
            onContextMenu={(ev) => {
              ev.preventDefault();
              toggleCapsule(refEdge.id, false);
            }}
            onDoubleClick={() => bridge.openCanvas(refEdge.source)}
          >
            <span className="fs-dock-dot" />
            <span className="fs-dock-label">{label}</span>
            {refEdge.always && <Pin size={10} />}
          </button>
        );
      })}
      {peek && peekEdge && (
        /* The native composer sits outside .fs-root; this box-less host scopes FlowSpace tokens. */
        <div
          className="fs-root fs-popover-host"
          data-theme={
            doc.prefs?.theme && doc.prefs.theme !== "auto"
              ? doc.prefs.theme
              : detectHostDark()
                ? "dark"
                : "light"
          }
        >
          <PayloadPeekPopover
            anchor={peek.anchor}
            edge={peekEdge}
            doc={doc}
            snapshot={snapshot}
            bridge={bridge}
            onClose={() => setPeek(null)}
            onOpenInspector={() => bridge.openCanvas(peekEdge.target)}
          />
        </div>
      )}
    </div>
  );
}

function ChatBadge({
  bridge,
  sessionId,
}: PropsRuntime<"conversation.session.header.actions"> & {
  bridge: CanvasBridge;
}) {
  useSyncExternalStore(subscribeLanguage, getLanguage);
  const node = bridge.useValue(value => value?.document.nodes.find(item => item.sessionId === sessionId));
  const nativeChatTriggers = bridge.useValue(value => value?.document.settings.nativeChatTriggers);
  const [selectedText, setSelectedText] = useState("");
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection()?.toString().trim() ?? "";
      setSelectedText(sel.length > 1 ? sel : "");
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  if (!node) return null;
  const enabled =
    node.nativeTrigger === "inherit"
      ? nativeChatTriggers
      : node.nativeTrigger === "enabled";
  return (
    <span className="fs-chat-actions">
      <button
        className={"fs-chat-badge " + (enabled ? "on" : "")}
        onClick={() => bridge.openCanvas(node.id)}
        title={tr("在 FlowSpace 中查看和设置接续")}
      >
        <Workflow size={13} />
        {tr("接续")}
        {enabled ? tr("开启") : tr("关闭")}
      </button>
      {selectedText && (
        <button
          className="fs-chat-badge on"
          onClick={() => {
            const captured = selectedText;
            window.getSelection()?.removeAllRanges();
            setSelectedText("");
            void bridge
              .display({
                nodeId: node.id,
                text: captured,
                fixed: true,
              })
              .then((created) => bridge.openCanvas(created.id))
              .catch(() => {});
          }}
          title={t("quoteToCanvas")}
        >
          <Quote size={12} />
          {t("quoteToCanvas")}
        </button>
      )}
    </span>
  );
}
