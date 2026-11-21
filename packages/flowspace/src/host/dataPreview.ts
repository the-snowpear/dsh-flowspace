import { DEFAULT_LIST_LIMIT } from "../core/content.ts";
import { staticFanoutContent } from "../core/fanout.ts";
import { dataDescriptors, dataMode, type DataInput } from "../core/nodes/data/index.ts";
import { createStaticResolver, previewLines, type StaticInputs, type StaticResult } from "../core/nodes/data/preview.ts";
import type { ContextSnapshot, DataPreview, DataPreviewRequest, FlowContent, FlowNode, FlowspaceDocument,
  FlowspaceRun, RunStep, StepTelemetry } from "../types.ts";
import { evaluateData } from "./nodes/data.ts";
import type { DshRuntime } from "./runtime.ts";

type PreviewRuntime = Pick<DshRuntime, "previewFile" | "hydrateContent">;
type ModelContext = Parameters<typeof evaluateData>[0];
const emptyPreview = (state: "trial" | "waiting" | "error", message?: string): DataPreview =>
  ({ state, lines: [], count: 0, remaining: 0, ...(message ? { message: message.slice(0, 512) } : {}) });

function latestSources(runs: FlowspaceRun[], doc: FlowspaceDocument, node: FlowNode) {
  const wiring = (graph: Pick<FlowspaceDocument, "edges">) => graph.edges.filter(edge => edge.target === node.id)
    .map(edge => [edge.source, edge.kind, edge.sourcePort, edge.targetPort, edge.mode, edge.trigger, edge.emitMode,
      edge.sourceItemKey, edge.snapshotText, edge.snapshotContent]);
  const current = wiring(doc);
  if (!current.length) return;
  const ports = JSON.stringify(current);
  let latest: RunStep | undefined;
  for (const run of runs) {
    if (!run.graph.nodes.some(candidate => candidate.id === node.id && candidate.flowType === node.flowType) ||
        JSON.stringify(wiring(run.graph)) !== ports) continue;
    for (const step of run.steps) if (step.nodeId === node.id && step.state !== "skipped" && step.sources.length &&
      (!latest || step.createdAt >= latest.createdAt)) latest = step;
  }
  return latest?.sources.map((source, i) => ({ source, port: latest.sourcePorts?.[i] ?? "in" }));
}

/** Complete deterministic dependencies using request-local values. AI and dynamic inputs are returned to the caller. */
async function resolveStatic<T extends StaticInputs | StaticResult>(ctx: ModelContext, runtime: PreviewRuntime,
  doc: FlowspaceDocument, read: (resolver: ReturnType<typeof createStaticResolver>) => T, signal: AbortSignal) {
  const overrides = { nodes: new Map<string, FlowContent>(), edges: new Map<string, ContextSnapshot>() };
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  for (;;) {
    signal.throwIfAborted();
    const resolution = read(createStaticResolver(doc, overrides));
    if (resolution.state === "needs-file") {
      const edge = doc.edges.find(edge => edge.id === resolution.edgeId)!;
      const source = doc.nodes.find(node => node.id === resolution.sourceId)!;
      const receiver = doc.nodes.find(node => node.id === resolution.targetId)!;
      overrides.edges.set(edge.id, await runtime.previewFile(source, edge, receiver, limit));
    } else if (resolution.state === "needs-spill") {
      overrides.edges.set(resolution.edgeId, await runtime.hydrateContent(resolution.source));
    } else if (resolution.state === "needs-code") {
      const code = doc.nodes.find(node => node.id === resolution.nodeId)!;
      const result = await evaluateData(ctx, code, resolution.inputs, limit, signal);
      if (result.route === "error") throw new Error(result.output);
      overrides.nodes.set(code.id, result.source.content!);
    } else return { resolution, overrides };
  }
}

/** Full draft list for a saved static source, including file- and QuickJS-derived branches. */
export async function resolveStaticFanout(ctx: ModelContext, runtime: PreviewRuntime, doc: FlowspaceDocument,
  fanId: string, signal: AbortSignal = new AbortController().signal): Promise<FlowContent | undefined> {
  try {
    const { resolution, overrides } = await resolveStatic(ctx, runtime, doc, resolver => resolver.inputs(fanId), signal);
    return resolution.state === "ready" ? staticFanoutContent(doc, fanId, overrides) : undefined;
  } catch {
    signal.throwIfAborted();
    // Missing files and invalid worker output have no draft lanes. Node preview reports the actual error.
    return undefined;
  }
}

/** Resolve only saved canvas inputs or the target's durable capture; preview work owns no Run or Session. */
export async function previewDataNode(ctx: ModelContext, runtime: PreviewRuntime, doc: FlowspaceDocument,
  runs: FlowspaceRun[], request: DataPreviewRequest, signal: AbortSignal): Promise<DataPreview> {
  const target = doc.nodes.find(node => node.id === request.nodeId);
  if (!target || !dataDescriptors.some(descriptor => descriptor.flowType === target.flowType))
    return emptyPreview("error", "所选节点不支持数据预览");
  const targetAI = dataMode(target) === "ai";
  if (targetAI && !request.tryModel) return emptyPreview("trial");
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  const ready = (content: FlowContent, telemetry?: StepTelemetry): DataPreview =>
    ({ state: "ready", ...previewLines(content), ...(telemetry ? { telemetry } : {}) });
  const trial = async (inputs: DataInput[]): Promise<DataPreview> => {
    const hydrated = await Promise.all(inputs.map(async ({ source, port }) => ({ source: await runtime.hydrateContent(source), port })));
    const result = await evaluateData(ctx, target, hydrated, limit, signal);
    return result.route === "error" ? { ...emptyPreview("error", result.output), telemetry: result.telemetry } :
      ready(result.source.content!, result.telemetry);
  };
  try {
    const { resolution } = await resolveStatic(ctx, runtime, doc, resolver => resolver.output(target.id), signal);
    if (resolution.state === "ready") return ready(resolution.content);
    if (resolution.state === "error") return emptyPreview("error", resolution.message);
    if (!targetAI || !request.tryModel) return emptyPreview("waiting");
    const inputs = resolution.state === "needs-ai" && resolution.nodeId === target.id
      ? resolution.inputs : latestSources(runs, doc, target);
    return inputs ? await trial(inputs) : emptyPreview("waiting");
  } catch (error) {
    signal.throwIfAborted();
    return emptyPreview("error", error instanceof Error ? error.message : String(error));
  }
}
