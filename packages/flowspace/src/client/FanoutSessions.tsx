import { useSyncExternalStore } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-workspace/client";
import type { FlowNode, FlowspaceSnapshot } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { getLanguage, subscribeLanguage, t } from "./i18n.ts";

interface Lane {
  key: string;
  title: string;
  index: number;
  removed: boolean;
}
interface SessionSeat {
  group: string;
  lane: Lane;
  lanes: Lane[];
  total: number;
  removed: boolean;
}
const graphSeats = new WeakMap<FlowNode[], Map<string, SessionSeat>>();

function seatsOf(nodes: FlowNode[]): Map<string, SessionSeat> {
  const cached = graphSeats.get(nodes);
  if (cached) return cached;
  const seats = new Map<string, SessionSeat>();
  const groups = new Map(nodes.flatMap(group => group.fanout
    ? [[group.fanout.fanId, { title: group.title, lanes: new Map<string, Lane>(), sessions: [] as FlowNode[] }] as const]
    : []));
  for (const node of nodes) {
    if (!node.generatedBy || node.itemKey === undefined || node.laneIndex === undefined) continue;
    const group = groups.get(node.generatedBy);
    if (!group) continue;
    const existing = group.lanes.get(node.itemKey);
    if (!existing) group.lanes.set(node.itemKey, {
      key: node.itemKey, title: node.itemTitle ?? node.title, index: node.laneIndex + 1, removed: !!node.removed,
    });
    else if (!node.removed) existing.removed = false;
    if (node.sessionId) group.sessions.push(node);
  }
  for (const group of groups.values()) {
    const lanes = [...group.lanes.values()].sort((a, b) => a.index - b.index);
    const total = lanes.filter(lane => !lane.removed).length;
    for (const node of group.sessions) {
      const lane = group.lanes.get(node.itemKey!)!;
      seats.set(node.sessionId!, { group: group.title, lane, lanes, total, removed: !!node.removed });
    }
  }
  graphSeats.set(nodes, seats);
  return seats;
}

/** A session keeps its recorded group after the visitor undoes the generated canvas batch. */
export function fanoutSession(snapshot: FlowspaceSnapshot | null, id: string): SessionSeat | undefined {
  if (!snapshot) return;
  const current = seatsOf(snapshot.document.nodes).get(id);
  if (current) return current;
  for (let i = snapshot.runs.length - 1; i >= 0; i--) {
    const historic = seatsOf(snapshot.runs[i].graph.nodes).get(id);
    if (historic) return historic;
  }
}

type BridgeProp = { bridge: CanvasBridge };

export function FanoutSessionMarker({ sessionId, bridge }: PropsRuntime<"sidebar.session.row.trailing"> & BridgeProp) {
  const seat = bridge.useValue(snapshot => fanoutSession(snapshot, sessionId));
  useSyncExternalStore(subscribeLanguage, getLanguage);
  if (!seat) return null;
  return <span className="fs-lane-session-marker" data-fanout-session={sessionId}>
    <span className="user-content">{seat.group}</span>
    <small>{seat.removed ? t("flow_lane_removed") : `${seat.lane.index}/${seat.total}`}</small>
  </span>;
}

export function FanoutSessionHover({ sessionId, bridge }: PropsRuntime<"sidebar.session.row.hover"> & BridgeProp) {
  const seat = bridge.useValue(snapshot => fanoutSession(snapshot, sessionId));
  useSyncExternalStore(subscribeLanguage, getLanguage);
  if (!seat) return null;
  // rc.3 gives the native hover card the same dark surface in both themes.
  return <div className="fs-root fs-popover-host" data-theme="dark">
    <section className="fs-lane-session-hover" aria-label={t("flow_fanout_group")} data-fanout-session-list={sessionId}>
      <span>{seat.group}</span>
      <ul className="fs-lane-session-list">
        {seat.lanes.map(lane => <li key={lane.key} aria-current={lane.key === seat.lane.key || undefined}>
          <small>{lane.index}</small><span>{lane.title}</span>{lane.removed && <small>{t("flow_lane_removed")}</small>}
        </li>)}
      </ul>
    </section>
  </div>;
}
