import type { FlowEdge, FlowNode } from "../types.ts";
import { findBoardCard } from "./board.ts";
import { isContainer } from "./containers.ts";
import { hasStatusPort } from "./nodes/interactions.ts";
import { descriptorOf, portsOf } from "./nodes/registry.ts";
import type { PortSpec } from "./nodes/types.ts";

export function connectionPort(
  node: FlowNode, role: FlowEdge["kind"], direction: PortSpec["direction"], portId?: string,
): PortSpec | undefined {
  const id = portId ?? direction;
  if (role === "event") {
    if (direction === "out") return hasStatusPort(node.kind, node.flowType, !!node.fanout)
      ? { id, role, direction, dataType: "signal" } : undefined;
    return connectionPort(node, "continuation", "in", portId);
  }
  if (node.kind === "flow")
    return portsOf(node).find((port) => port.id === id && port.role === role && port.direction === direction);
  if (id !== direction || node.kind === "role") return undefined;
  if (role === "continuation" && direction === "in" && isContainer(node))
    return { id, role, direction, dataType: "text" };
  if ((direction === "in" || role === "continuation") && node.kind !== "agent") return undefined;
  const dataType = node.kind === "board" ? "list" : node.kind === "file" ? "file" : "text";
  return { id, role, direction, dataType };
}

type PortSelection = Pick<FlowEdge, "kind" | "sourcePort" | "targetPort" | "sourceItemKey" | "snapshotContent">;

export function structuredInput(target: FlowNode, portId?: string): "list" | "record" | undefined {
  const type = connectionPort(target, "continuation", "in", portId)?.dataType;
  return type === "list" || type === "record" ? type : undefined;
}

export function canStreamTo(target: FlowNode, portId?: string): boolean {
  if (!structuredInput(target, portId)) return false;
  return descriptorOf(target.flowType)?.family === "data" ||
    target.flowType === "flowspace/fanout" || target.flowType === "flowspace/merge-sort";
}

/** The ordinary merged result becomes the pass branch when sorting is enabled. */
export function mergeResultPort(config: FlowNode["config"], portId?: string): string | undefined {
  if (portId && portId !== "out" && portId !== "pass") return portId;
  if (config?.sortMode && config.sortMode !== "off") return "pass";
  return portId === "pass" ? "out" : portId;
}

/** A native Agent negotiates structured output per receiving port. */
export function connectionOutput(source: FlowNode, target: FlowNode, edge: PortSelection): PortSpec | undefined {
  const port = connectionPort(source, edge.kind, "out", edge.sourcePort);
  if (!port) return undefined;
  if (edge.kind === "reference" && edge.snapshotContent) return { ...port, dataType: edge.snapshotContent.dataType };
  if (edge.kind === "reference" && source.kind === "file" &&
      (target.flowType === "flowspace/fanout" || descriptorOf(target.flowType)?.family === "data") &&
      connectionPort(target, "reference", "in", edge.targetPort)?.dataType === "list")
    return { ...port, dataType: "list" };
  if (edge.kind === "reference" && source.kind === "board" && edge.sourceItemKey !== undefined)
    return { ...port, dataType: "record" };
  if (edge.kind === "continuation" && source.kind === "agent")
    return { ...port, dataType: structuredInput(target, edge.targetPort) ?? port.dataType };
  return port;
}

interface Connection {
  source: FlowNode | undefined;
  target: FlowNode | undefined;
  kind: FlowEdge["kind"];
  sourcePort?: string;
  targetPort?: string;
  mode?: FlowEdge["mode"];
  sourceItemKey?: string;
  snapshotContent?: FlowEdge["snapshotContent"];
  edges?: readonly FlowEdge[];
  edgeId?: string;
  permission?: FlowEdge["permission"];
  ask?: FlowEdge["ask"];
  delivery?: FlowEdge["delivery"];
  event?: FlowEdge["event"];
}

export type ConnectionResult = { ok: true; convert?: "text" } | { ok: false; reason: string };

export function canConnect(connection: Connection): ConnectionResult {
  const { source, target, kind, targetPort, sourceItemKey } = connection;
  if (!source || !target) return { ok: false, reason: "flow_missing_endpoint" };
  if (kind === "event") {
    if (!connectionPort(source, "event", "out", connection.sourcePort) ||
        !connectionPort(target, "event", "in", targetPort) ||
        target.kind !== "agent" && !isContainer(target) &&
          !["flowspace/notice", "flowspace/parse", "flowspace/condition", "flowspace/code", "flowspace/ai-judge", "flowspace/human-choice"].includes(target.flowType ?? ""))
      return { ok: false, reason: "flow_evt_target" };
    if (connection.event?.mode === "continuous" && (target.kind === "agent" || target.flowType === "flowspace/ai-judge" ||
        descriptorOf(target.flowType)?.capabilities.callsModel || target.config?.mode === "ai"))
      return { ok: false, reason: "flow_evt_model" };
    return { ok: true };
  }
  if ((connection.permission || connection.ask) && (kind !== "reference" || !isContainer(source) ||
      target.kind !== "agent" || connection.snapshotContent))
    return { ok: false, reason: "flow_invalid_permission" };
  if (kind === "continuation" && isContainer(target) && connection.mode && connection.mode !== "conclusion")
    return { ok: false, reason: "flow_invalid_delivery" };
  if (connection.delivery && (kind !== "continuation" || !isContainer(target)))
    return { ok: false, reason: "flow_invalid_delivery" };
  if (source.kind === "role" || target.kind === "role") return { ok: false, reason: "flow_staff_only" };
  if (sourceItemKey !== undefined && (kind !== "reference" || source.kind !== "board" ||
      !findBoardCard(source.columns ?? [], sourceItemKey))) return { ok: false, reason: "flow_invalid_board_card" };
  const output = connectionOutput(source, target, connection);
  const input = connectionPort(target, kind, "in", targetPort);
  if (!output) return { ok: false, reason: "flow_invalid_output" };
  if (!input) return { ok: false, reason: "flow_invalid_input" };
  if (connection.mode === "fork" && (source.kind === "flow" || target.kind !== "agent" || target.sessionId ||
      connection.edges?.some((edge) => edge.id !== connection.edgeId && edge.target === target.id && edge.mode === "fork")))
    return { ok: false, reason: "flow_invalid_fork" };
  if (output.dataType !== input.dataType) {
    if (kind === "reference") return { ok: true, convert: "text" };
    if (input.dataType !== "text") return { ok: false, reason: "flow_type_mismatch" };
  }
  return { ok: true };
}
