import type { FlowspaceRun, FlowspaceSnapshot, FlowToken } from "../../types.ts";
import { isFanoutMaster } from "../../core/graph.ts";
import { descriptorOf } from "../../core/nodes/registry.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { formatStepTelemetrySummary } from "./formatters.ts";

export function summarizeRunSteps(
  run: FlowspaceRun,
  snapshot: FlowspaceSnapshot | null,
) {
  const nodes = new Map(run.graph.nodes.map(node => [node.id, node]));
  const steps = new Map(run.steps.map(step => [step.nodeId, step]));
  const edges = new Map(run.graph.edges.map(edge => [edge.id, edge]));
  const gates = new Map<string, FlowToken>();
  for (const token of run.tokens) {
    if (token.ready || token.consumed || token.dismissed) continue;
    const target = edges.get(token.edgeId)?.target;
    if (target && !gates.has(target)) gates.set(target, token);
  }
  const liveNodes = new Map(snapshot?.live.map(node => [node.nodeId, node]));
  const fanoutLanes = new Map(run.fanouts?.map(batch =>
    [batch.fanId, new Map(batch.lanes.map(lane => [lane.item.key, lane]))]));
  const dataFlow = !!run.fanouts?.length || run.steps.some(step => descriptorOf(nodes.get(step.nodeId)?.flowType)?.family === "data");
  const participantIds = [
    ...new Set([
      ...run.roots,
      ...run.participants,
      ...run.steps.map((s) => s.nodeId),
    ]),
  ].filter(id => {
    const node = nodes.get(id);
    return node && !node.removed && !isFanoutMaster(run.graph, node) &&
      (node.kind === "agent" || (dataFlow && node.kind === "flow"));
  });

  const stepItems = participantIds.map((nodeId) => {
    const node = nodes.get(nodeId)!;
    const latest = steps.get(nodeId);
    const gate = gates.get(nodeId);
    const gateEdge = gate && edges.get(gate.edgeId);
    const live = liveNodes.get(nodeId);

    let state = (node.participation as string) === "bypassed" ? "bypassed" : "pending";
    let reason = "";
    if (gate && ["running", "waiting", "paused"].includes(run.state)) {
      state = "waiting";
      reason = gate.loopCapReached
        ? "loopCapGate"
        : gate.boundary
          ? "scopeBoundary"
          : "waitingConfirmation";
    } else if (live?.pendingInput.length && latest && !latest.endedAt) {
      state = "waiting";
      reason = "approvalNeeded";
    } else if (latest) {
      state = latest.state;
    }
    const lane = node.generatedBy && node.itemKey && fanoutLanes.get(node.generatedBy)?.get(node.itemKey);
    if (lane && lane.state === "cancelled") state = "cancelled";
    const title = node.generatedBy && node.laneIndex !== undefined && node.itemTitle
      ? t("flow_lane_item_name", { n: node.laneIndex + 1, item: node.itemTitle }) : node.title;
    const telemetryLabel = latest ? formatStepTelemetrySummary(latest) : "";
    return { node, title, state, reason, gate, gateEdge, latest, telemetryLabel };
  });

  const total = Math.max(1, stepItems.length);
  const done = stepItems.filter(
    (s) => s.state === "completed" || s.state === "bypassed" || (dataFlow && (s.state === "skipped" || s.state === "cancelled")),
  ).length;
  const blocker = stepItems.find((s) => s.state === "waiting");
  const active = stepItems.find((s) => ["running", "queued", "settling"].includes(s.state));
  return { stepItems, total, done, blocker, active };
}

export function waitingHumanSteps(snapshot: FlowspaceSnapshot | null) {
  return (snapshot?.runs ?? []).filter(run => ["waiting", "running", "paused"].includes(run.state))
    .flatMap(run => run.steps.flatMap(step => {
      if (step.state !== "awaiting" || (!step.human && !step.debug)) return [];
      const node = run.graph.nodes.find(node => node.id === step.nodeId);
      return node ? [{ step, node }] : [];
    }));
}

export function HumanWaitRows({ waits, reveal }: {
  waits: ReturnType<typeof waitingHumanSteps>; reveal: (id: string) => void;
}) {
  return <>{waits.map(({ step, node }) => <article key={step.id} className="queue-row fs-human-queue">
    <Icon name={step.debug ? "pause" : "person"} />
    <div><b className="user-content">{node.title}</b>
      <p>{step.debug ? t(step.debug.reason === "budget" ? "flow_budget_pause" : "flow_bp_hit") : step.human?.question}</p></div>
    <button type="button" className="button-quiet" onClick={() => reveal(node.id)}>{t("locate")}</button>
  </article>)}</>;
}
