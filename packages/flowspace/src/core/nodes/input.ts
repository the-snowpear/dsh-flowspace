import type { ContextSnapshot, FlowContent, FlowNode, RunStep } from "../../types.ts";
import { textOfContent } from "../content.ts";

export function snapshotWithContent(
  node: Pick<FlowNode, "id" | "title">, content: FlowContent, capturedAt = Date.now(),
): ContextSnapshot {
  return {
    id: crypto.randomUUID(), kind: content.dataType === "file" ? "file" : "text",
    sourceNodeId: node.id, title: node.title, text: textOfContent(content), content, capturedAt,
  };
}

export async function forwardInput(node: FlowNode, step: RunStep,
  contextText?: (sources: ContextSnapshot[]) => Promise<string>): Promise<ContextSnapshot> {
  if (step.sources.length === 1) return step.sources[0];
  const text = contextText ? await contextText(step.sources) : step.sources.map(source => source.text).join("\n\n");
  return snapshotWithContent(node, { dataType: "text", value: text }, step.createdAt);
}
