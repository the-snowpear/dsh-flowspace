import type { ContextSnapshot, FlowContent, FlowEdge, FlowNode, FlowspaceDocument, JsonValue } from "../../../types.ts";
import { boardContent, resolveBoardReference } from "../../board.ts";
import { contentOf, DEFAULT_LIST_LIMIT, hashContentText, selectedFileContent, textOfContent } from "../../content.ts";
import { connectionPort } from "../../connect.ts";
import { dataDescriptors, dataMode, transformData, type DataInput } from "./index.ts";

export type PreviewNeed =
  | { state: "needs-file"; edgeId: string; sourceId: string; targetId: string }
  | { state: "needs-spill"; edgeId: string; source: ContextSnapshot }
  | { state: "needs-code" | "needs-ai"; nodeId: string; inputs: DataInput[] };
type Blocker = PreviewNeed | { state: "dynamic" } | { state: "error"; message: string };
export type StaticResult = { state: "ready"; content: FlowContent } | Blocker;
export type StaticInputs = { state: "ready"; inputs: DataInput[] } | Blocker;
type EdgeInput = { state: "ready"; source: ContextSnapshot } | Blocker;
export interface PreviewOverrides {
  nodes?: ReadonlyMap<string, FlowContent>;
  edges?: ReadonlyMap<string, ContextSnapshot>;
}

const dataTypes = new Set(dataDescriptors.map(descriptor => descriptor.flowType));
const dynamic = { state: "dynamic" } as const;
const ready = (content: FlowContent): StaticResult => ({ state: "ready", content });
const blockerRank: Record<Blocker["state"], number> = {
  dynamic: 5, error: 4, "needs-ai": 3, "needs-code": 2, "needs-file": 1, "needs-spill": 1,
};

function snapshot(node: FlowNode, edge: FlowEdge, content: FlowContent, text = textOfContent(content)): ContextSnapshot {
  return { id: edge.id, sourceNodeId: node.id, title: edge.snapshotTitle ?? node.title, capturedAt: 0,
    kind: content.dataType === "file" ? "file" : "text", text, content };
}

function fromSnapshot(edgeId: string, source: ContextSnapshot): EdgeInput {
  return source.textSpill || source.content?.spill || source.content?.items?.some(item => item.spill)
    ? { state: "needs-spill", edgeId, source } : { state: "ready", source };
}

/** Construct once per editable document revision. The traversal never performs I/O or invokes a model. */
export function createStaticResolver(
  doc: Pick<FlowspaceDocument, "nodes" | "edges" | "settings">,
  overrides: PreviewOverrides = {},
  sourceVersions: Readonly<Record<string, string>> = {},
) {
  const nodes = new Map(doc.nodes.map(node => [node.id, node]));
  const edges = new Map(doc.edges.map(edge => [edge.id, edge]));
  const incoming = new Map<string, FlowEdge[]>();
  // A dispatch receives active continuation tokens first; reference attachments follow in document order.
  for (const attached of [false, true]) for (const edge of doc.edges) {
    if (edge.generatedBy || (edge.kind === "reference" || edge.trigger === "off") !== attached) continue;
    if (edge.kind === "continuation" && edge.trigger === "off" && nodes.get(edge.target)?.flowType === "flowspace/fanout") continue;
    const list = incoming.get(edge.target);
    if (list) list.push(edge);
    else incoming.set(edge.target, [edge]);
  }
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  const cached = new Map<string, StaticResult>(), visiting = new Set<string>();
  const fingerprints = new Map<string, string>(), signing = new Set<string>();

  function edgeInput(edge: FlowEdge): EdgeInput {
    const override = overrides.edges?.get(edge.id);
    if (override) return fromSnapshot(edge.id, override);
    const source = nodes.get(edge.source), target = nodes.get(edge.target);
    if (!source || !target) return dynamic;
    if (edge.snapshotContent) return fromSnapshot(edge.id, snapshot(source, edge, edge.snapshotContent, edge.snapshotText));
    if (source.kind === "board" && (edge.sourceItemKey !== undefined || !edge.snapshotText)) {
      const ref = resolveBoardReference(source, edge.sourceItemKey, limit);
      if (ref.missing) return dynamic;
      const content = boardContent(source, edge.sourceItemKey, limit) ?? { dataType: "text", value: ref.text };
      return { state: "ready", source: { ...snapshot(source, edge, content, ref.text), title: ref.title,
        referenceKind: edge.sourceItemKey === undefined ? "board" : "board-card" } };
    }
    if (edge.snapshotText !== undefined && edge.snapshotText !== "")
      return fromSnapshot(edge.id, snapshot(source, edge, { dataType: "text", value: edge.snapshotText }));
    if (source.kind === "file") {
      const paths = selectedFileContent(source, limit);
      const textInput = connectionPort(target, edge.kind, "in", edge.targetPort)?.dataType === "text";
      if (textInput && paths.items?.length) return { state: "needs-file", edgeId: edge.id, sourceId: source.id, targetId: target.id };
      const content = textInput ? { dataType: "text" as const, value: "" } : paths;
      return { state: "ready", source: { ...snapshot(source, edge, content), referenceKind: "file" } };
    }
    if ((edge.sourcePort && edge.sourcePort !== "out") || source.participation === "paused" || source.participation === "bypassed")
      return dynamic;
    const result = output(source.id);
    return result.state === "ready" ? fromSnapshot(edge.id, snapshot(source, edge, result.content)) : result;
  }

  function inputs(nodeId: string): StaticInputs {
    const attached = incoming.get(nodeId) ?? [];
    if (!attached.length) return nodes.get(nodeId)?.flowType === "flowspace/constant" ? { state: "ready", inputs: [] } : dynamic;
    const values: DataInput[] = [];
    let pending: Blocker | undefined;
    for (const edge of attached) {
      const result = edgeInput(edge);
      if (result.state === "ready") values.push({ port: edge.targetPort ?? "in", source: result.source });
      else if (!pending || blockerRank[result.state] > blockerRank[pending.state]) pending = result;
    }
    return pending ?? { state: "ready", inputs: values };
  }

  function output(nodeId: string): StaticResult {
    const override = overrides.nodes?.get(nodeId);
    if (override) return ready(override);
    const known = cached.get(nodeId);
    if (known) return known;
    const node = nodes.get(nodeId);
    if (!node || visiting.has(nodeId)) return dynamic;
    visiting.add(nodeId);
    let result: StaticResult;
    try {
      if (node.kind === "note" || ((node.kind === "display" || node.kind === "detail") && (node.fixed || node.pinned))) {
        result = ready({ dataType: "text", value: node.text });
      } else if (node.kind === "board") {
        result = ready(boardContent(node, undefined, limit) ?? { dataType: "text", value: node.text });
      } else if (node.kind === "file") result = ready(selectedFileContent(node, limit));
      else if (!dataTypes.has(node.flowType ?? "")) result = dynamic;
      else if (node.flowType === "flowspace/constant") result = ready(transformData(node, [], limit));
      else {
        const sources = inputs(node.id);
        if (sources.state !== "ready") result = sources;
        else {
          const mode = dataMode(node);
          result = mode === "rule" ? ready(transformData(node, sources.inputs, limit))
            : { state: mode === "ai" ? "needs-ai" : "needs-code", nodeId, inputs: sources.inputs };
        }
      }
    } catch (error) {
      result = { state: "error", message: error instanceof Error ? error.message : String(error) };
    } finally { visiting.delete(nodeId); }
    cached.set(nodeId, result);
    return result;
  }

  function edge(edgeId: string): StaticResult {
    const link = edges.get(edgeId);
    if (!link) return dynamic;
    const result = edgeInput(link);
    return result.state === "ready" ? ready(contentOf(result.source)) : result;
  }

  /** Only content-bearing dependencies invalidate a trial or a file read. */
  function signature(nodeId: string): string {
    const cached = fingerprints.get(nodeId);
    if (cached) return cached;
    const node = nodes.get(nodeId);
    if (!node || signing.has(nodeId)) return nodeId;
    signing.add(nodeId);
    const semantics = [limit, node.id, node.kind, node.title, node.participation, node.flowType, node.config,
      node.text, node.fixed, node.pinned, node.columns, node.selectedItems, node.boardSettings?.refScope,
      ...(node.kind === "file" ? [node.worktreePath ?? node.cwd, sourceVersions[nodeId]] : [])];
    const dependencies = (incoming.get(nodeId) ?? []).map(edge => {
      const source = nodes.get(edge.source);
      const value = edge.snapshotContent ?? (source?.kind === "board" && edge.sourceItemKey !== undefined
        ? boardContent(source, edge.sourceItemKey, limit) : edge.snapshotText || signature(edge.source));
      return [edge.id, edge.kind, edge.sourcePort, edge.targetPort, edge.trigger, edge.sourceItemKey, edge.snapshotTitle, value,
        edge.snapshotContent ? edge.snapshotText : undefined];
    });
    signing.delete(nodeId);
    const key = hashContentText(JSON.stringify([semantics, dependencies]));
    fingerprints.set(nodeId, key);
    return key;
  }
  return { output, inputs, edge, signature };
}

const rowText = (value: JsonValue) => typeof value === "string" ? value : JSON.stringify(value);
const singleLine = (text: string) => text.replace(/\r\n?|\n/g, "\\n");

/** Six physical rows. A multiline list item belongs to one row and retains its position. */
export function previewLines(content: FlowContent): { lines: string[]; count: number; remaining: number; originalCount?: number } {
  let rows: string[], count: number;
  if (content.items) {
    count = content.items.length;
    rows = content.items.slice(0, 6).map(item => singleLine(item.spill?.preview ?? rowText(item.value ?? null)));
  } else if (content.dataType === "file" && Array.isArray(content.value)) {
    count = content.value.length;
    rows = content.value.slice(0, 6).map(value => singleLine(rowText(value)));
  } else {
    const text = content.spill?.preview ?? (content.value === undefined ? "" : typeof content.value === "string" ? content.value : JSON.stringify(content.value, null, 2));
    const lines = text ? text.split(/\r\n?|\n/) : [];
    if (lines.at(-1) === "") lines.pop();
    count = lines.length;
    rows = lines.slice(0, 6);
  }
  return { lines: rows.map(row => row.length > 512 ? row.slice(0, 511) + "…" : row),
    count, remaining: count - rows.length, ...(content.originalCount === undefined ? {} : { originalCount: content.originalCount }) };
}
