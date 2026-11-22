import { descriptorOf, portsOf } from "../../../core/nodes/registry.ts";
import { t } from "../../i18n.ts";
import { awaitingStep, FlowShell, labelOf, MissingView, type FlowShellProps } from "../FlowShell.tsx";
import type { NodeViewProps } from "../types.ts";

export { awaitingStep, FlowShell, labelOf, MissingView, type FlowShellProps };

/** One-line summary shared by every compact flow card: the latest route, else the descriptor summary. */
export function JudgeCompact({ node, run }: NodeViewProps) {
  const last = run?.steps.findLast(step => step.nodeId === node.id && step.route);
  const branch = portsOf(node).find(port => port.id === last?.route);
  return <span className="compact-overview-detail">{branch
    ? t("flow_view_latest", { branch: labelOf(branch) })
    : t(descriptorOf(node.flowType)!.descKey)}</span>;
}

/** Plain judges (condition, code, AI, random, merge, assign, notice). */
export function JudgeFull(props: NodeViewProps) {
  return <FlowShell {...props} />;
}
