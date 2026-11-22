import type { FlowEdge, FlowNode, FlowspaceRun, JsonValue } from "../types.ts";
import { structuredInput } from "./connect.ts";
import { parseMarkdownFences } from "./utils.ts";

export interface EmissionTarget {
  edge: FlowEdge;
  node: FlowNode;
  type: "list" | "record";
}

export function emissionTargets(run: FlowspaceRun, sourceId: string): EmissionTarget[] {
  if (!run.graph.nodes.some(node => node.id === sourceId && node.kind === "agent")) return [];
  const targets: EmissionTarget[] = [];
  for (const edge of run.graph.edges) {
    if (edge.source !== sourceId || edge.kind !== "continuation" || edge.trigger === "off") continue;
    const node = run.graph.nodes.find(candidate => candidate.id === edge.target);
    if (!node || node.participation === "paused") continue;
    const type = structuredInput(node, edge.targetPort);
    if (type) targets.push({ edge, node, type });
  }
  return targets;
}

export function checkEmissionValues(targets: EmissionTarget[], values: JsonValue[]): void {
  if (targets.some(target => target.type === "record") &&
      values.some(value => value === null || typeof value !== "object" || Array.isArray(value))) {
    throw new Error("记录入口需要每个条目都是 JSON 对象");
  }
}

/** Parse only explicit structured output. A plain paragraph is never a one-item list. */
export function parseEmission(text: string): JsonValue[] {
  const { blocks, outsideLines } = parseMarkdownFences(text);
  for (const block of blocks) {
    if (!block.closed || !/^(?:json)?$/i.test(block.language)) continue;
    try {
      const value: JsonValue = JSON.parse(block.code);
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") return [value];
    } catch { /* Continue looking for a valid output section. */ }
  }
  const items: string[] = [];
  for (const line of outsideLines) {
    const item = /^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$/.exec(line)?.[1].trim();
    if (item) items.push(item);
  }
  if (items.length) return items;
  throw new Error("未收到 flow_emit 输出，结论中也没有可用的 Markdown 列表或 JSON 代码块");
}
