import type { FlowEdge, FlowNode, FlowToken } from "../../types.ts";
import { connectionOutput, connectionPort } from "../../core/connect.ts";
import { t } from "../i18n.ts";

export function edgeLabels(edge: FlowEdge, source?: FlowNode, target?: FlowNode, token?: FlowToken) {
  const output = source && target && connectionOutput(source, target, edge);
  const input = target && connectionPort(target, edge.kind, "in", edge.targetPort);
  let type = output ? t("flow_data_" + output.dataType) : "";
  if (output?.dataType === "list" && token && !token.skip) {
    if (token.source.content?.items) {
      type += `·${token.source.content.items.length}`;
    } else if (!token.source.content) {
      try {
        const items: unknown = JSON.parse(token.source.text);
        if (Array.isArray(items)) type += `·${items.length}`;
      } catch { /* Older text snapshots may not contain a list. */ }
    }
  }
  const flags: string[] = [];
  const logic = edge.logic;
  if (edge.kind === "continuation" && logic) {
    if (logic.negate) flags.push(t("flow_edge_not"));
    if (logic.fromRound !== undefined) flags.push(t("flow_edge_round", { n: logic.fromRound }));
    if (logic.maxTimes !== undefined) flags.push(t("flow_edge_limit", { n: logic.maxTimes }));
    if (logic.delayMs) flags.push(t("flow_edge_delay", { seconds: logic.delayMs / 1000 }));
  }
  return { type, list: output?.dataType === "list" && !token?.skip,
    conversion: edge.kind === "reference" && output && input && output.dataType !== input.dataType
    ? "→ " + t("flow_data_text") : "", flags: flags.join(" · ") };
}
