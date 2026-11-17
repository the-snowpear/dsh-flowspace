import { tr } from "./i18n.ts";
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
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import { useEffect, useState } from "react";
import { Workflow } from "lucide-react";
import { TYPERT_REMOTE } from "../../lib/typert.remote-client.js";
import { CanvasApp } from "./CanvasApp.tsx";
import { FlowClient, type CanvasBridge } from "./bridge.ts";
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
      owner: { nodeId: string };
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
export function apply(ctx: Context): void {
  ctx.remote.$mount(TYPERT_REMOTE);
  ctx.inject(["remote.flowspace"], mountUi);
}
function mountUi(ctx: Context): void {
  const bridge = new FlowClient(ctx);
  ctx.effect(() => bridge.connect());
  ctx.effect(() => () => bridge.dispose());
  ctx.slots.inject("main", () =>
    ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        children: {
          "flowspace.conversation": { kind: "single", scope: "session" },
        },
        inject: () => ({ bridge }),
      },
      Main,
    ),
  );
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
}
type MainProps = PropsRuntime<"main"> &
  PropsRenderSlots<"flowspace.conversation"> & { bridge: CanvasBridge };
function Main({ bridge, SessionProvider, renderSlot }: MainProps) {
  return (
    <CanvasApp
      bridge={bridge}
      renderConversation={(node, reference) => (
        <SessionProvider session={reference}>
          {renderSlot("flowspace.conversation", { nodeId: node.id })}
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
  useEffect(() => watchDraft(nodeId), [nodeId, watchDraft]);
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
function ChatBadge({
  bridge,
  sessionId,
}: PropsRuntime<"conversation.session.header.actions"> & {
  bridge: CanvasBridge;
}) {
  const snapshot = bridge.useSnapshot();
  const node = snapshot?.document.nodes.find((n) => n.sessionId === sessionId);
  if (!node) return null;
  const enabled =
    node.nativeTrigger === "inherit"
      ? snapshot!.document.settings.nativeChatTriggers
      : node.nativeTrigger === "enabled";
  return (
    <button
      className={"fs-chat-badge " + (enabled ? "on" : "")}
      onClick={() => bridge.openCanvas(node.id)}
      title={tr("在 FlowSpace 中查看和设置接续")}
    >
      <Workflow size={13} />
      {tr("接续")}
      {enabled ? tr("开启") : tr("关闭")}
    </button>
  );
}
