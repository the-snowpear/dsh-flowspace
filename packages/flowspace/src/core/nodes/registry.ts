import type { FlowNode, JsonObject } from "../../types.ts";
import type { NodeDescriptor, PortSpec } from "./types.ts";
import { judges } from "./judge/index.ts";
import { fanout, mergeSort } from "./fanout.ts";
import { dataDescriptors, dataMode } from "./data/descriptors.ts";
import { assignmentNode, variableNode } from "./variables.ts";
import { gitExec, terminalExec } from "./operations.ts";
import { humanNodes, noticeNode, triggerNode } from "./interactions.ts";
import { randomNode } from "./play.ts";

export const DEFAULT_FLOW_SIZE: NodeDescriptor["size"] = {
  compact: [256, 96],
  full: [312, 200],
};

const descriptors = new Map<string, NodeDescriptor>([...judges, fanout, mergeSort, variableNode, assignmentNode,
  gitExec, terminalExec, triggerNode, noticeNode, randomNode, ...humanNodes, ...dataDescriptors].map(descriptor => [descriptor.flowType, descriptor]));

export function registerDescriptor<C extends JsonObject>(
  descriptor: NodeDescriptor<C>,
): () => void {
  const { flowType } = descriptor;
  if (descriptors.has(flowType)) throw new Error(`节点类型已注册：${flowType}`);
  descriptors.set(flowType, descriptor);
  let registered = true;
  return () => {
    if (!registered) return;
    registered = false;
    descriptors.delete(flowType);
  };
}

export function descriptorOf(flowType: string | undefined): NodeDescriptor | undefined {
  return flowType ? descriptors.get(flowType) : undefined;
}

export function listDescriptors(): NodeDescriptor[] {
  return [...descriptors.values()];
}

export function isExecutable(node: FlowNode): boolean {
  const descriptor = node.kind === "flow" ? descriptorOf(node.flowType) : undefined;
  return node.kind === "agent" || (!!descriptor && !descriptor.capabilities.resourceOnly);
}

export function flowRunsCode(node: FlowNode): boolean {
  return node.kind === "flow" && (descriptorOf(node.flowType)?.capabilities.runsCode === true ||
    (node.flowType === mergeSort.flowType && node.config?.sortMode === "code") || dataMode(node) === "code");
}

export function portsOf(node: FlowNode): PortSpec[] {
  const descriptor = node.kind === "flow" ? descriptorOf(node.flowType) : undefined;
  return descriptor ? descriptor.ports(node.config ?? descriptor.defaultConfig) : [];
}

export function sizeOf(node: Pick<FlowNode, "flowType">, compact: boolean): [number, number] {
  const size = descriptorOf(node.flowType)?.size ?? DEFAULT_FLOW_SIZE;
  return compact ? size.compact : size.full;
}
