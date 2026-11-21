import type { FlowEdge, FlowNode, FlowspaceDocument, FlowspaceRun, RunFanout, RunFanoutLane } from "../../types.ts";
import { staticFanoutContent } from "../../core/fanout.ts";
import { t } from "../i18n.ts";

type LaneRun = { active: boolean; batch: RunFanout; byKey: Map<string, RunFanoutLane> };
const indexedRuns = new WeakMap<FlowspaceRun[], Map<string, LaneRun>>();

export function latestLaneRun(runs: FlowspaceRun[] | undefined, fanId: string) {
  if (!runs) return undefined;
  let index = indexedRuns.get(runs);
  if (!index) {
    index = new Map();
    for (const run of runs) {
      const active = ["running", "waiting", "paused"].includes(run.state);
      for (const batch of run.fanouts ?? []) {
        if (active || !index.get(batch.fanId)?.active) {
          index.set(batch.fanId, { batch, active, byKey: new Map(batch.lanes.map(lane => [lane.item.key, lane])) });
        }
      }
    }
    indexedRuns.set(runs, index);
  }
  return index.get(fanId);
}

export function laneGroupState(document: FlowspaceDocument, members: FlowNode[], fan: FlowNode, runs?: FlowspaceRun[]) {
  const represented = new Set(members.filter(node => node.generatedBy === fan.id && !node.removed)
    .map(node => node.itemKey!));
  const recent = latestLaneRun(runs, fan.id);
  const live = recent?.active;
  const total = live ? recent.batch.lanes.length : represented.size ? represented.size :
    staticFanoutContent(document, fan.id)?.items?.length ?? (recent?.batch.lanes.length === 0 ? 0 : undefined);
  const done = recent?.batch.lanes.filter(lane => !!lane.endedAt && (live || represented.has(lane.item.key))).length ?? 0;
  return { total, done, concurrency: Number(fan.config?.concurrency ?? 4) };
}

export function hasUnusedResult(runs: FlowspaceRun[] | undefined, node: FlowNode): boolean {
  if (!node.generatedBy || !node.itemKey) return false;
  const lane = latestLaneRun(runs, node.generatedBy)?.byKey.get(node.itemKey);
  return lane?.adopted === false && lane.state === "completed";
}

export function isRemovedLaneWire(edge: FlowEdge, nodes: ReadonlyMap<string, FlowNode>): boolean {
  return !!edge.generatedBy && !!(nodes.get(edge.source)?.removed || nodes.get(edge.target)?.removed);
}

export function LaneMetrics({ state }: { state: ReturnType<typeof laneGroupState> }) {
  const total = state.total ?? "?";
  return <span className="fs-lane-metrics">
    <span className="fs-lane-kind">{t("flow_fanout")}</span>
    <span>×{total}</span>
    <span aria-label={t("flow_lane_progress", { done: state.done, total })}>{state.done}/{total}</span>
    <span>{t("flow_lane_concurrency", { limit: state.concurrency })}</span>
  </span>;
}

export function LaneBadges({ node, master, unused }: { node: FlowNode; master: boolean; unused: boolean }) {
  if (!master && !node.overridden && !node.removed && !unused) return null;
  return <span className="fs-lane-badges">
    {master && <span className="fs-lane-chip is-master">{t("flow_lane_master")}</span>}
    {node.overridden && <span className="fs-lane-chip is-overridden">{t("flow_lane_overridden")}</span>}
    {node.removed && <span className="fs-lane-chip">{t("flow_lane_removed")}</span>}
    {unused && <span className="fs-lane-chip">{t("flow_lane_unused")}</span>}
  </span>;
}
