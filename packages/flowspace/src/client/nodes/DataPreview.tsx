import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { createStaticResolver, previewLines } from "../../core/nodes/data/preview.ts";
import { dataMode } from "../../core/nodes/data/descriptors.ts";
import type { DataPreview, FlowEdge, FlowNode, FlowspaceDocument, FlowspaceSnapshot } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { t } from "../i18n.ts";
import { dataCardHeight } from "../geometry.ts";
import { runtimeIndex } from "../sceneModel.ts";
import type { NodeViewProps } from "./index.ts";
import { FlowShell } from "./judge/JudgeView.tsx";

export function useFlowBodyHeight(id: string, height: number) {
  const resize = useContext(CanvasPreviewContext)?.size;
  useLayoutEffect(() => { resize?.(id, height); }, [id, height, resize]);
}

type Reply = { key: string; data: DataPreview };
type Job = { key: string; explicit: boolean; controller: AbortController };
const needsHost = (state: string) => state === "needs-file" || state === "needs-spill" || state === "needs-code";

/** Share pure evaluations and in-flight Host reads across cards, compact views and wire labels. */
export function useCanvasPreviews(doc: FlowspaceDocument, snapshot: FlowspaceSnapshot | null,
  bridge: CanvasBridge, flush: () => Promise<void>) {
  const fileVersion = useMemo(() => JSON.stringify(doc.nodes.filter(node => node.kind === "file")
    .map(node => [node.id, snapshot?.sourceVersions?.[node.id]])), [doc.nodes, snapshot?.sourceVersions]);
  const resolver = useMemo(() => createStaticResolver(doc, undefined, snapshot?.sourceVersions),
    [doc.nodes, doc.edges, doc.settings.listLimit, fileVersion]);
  const keyOf = useCallback((id: string) => {
    const signature = resolver.signature(id);
    if (resolver.output(id).state !== "dynamic") return signature;
    const frozen = runtimeIndex(snapshot).steps.get(id)?.findLast(step => step.sources.length);
    return signature + "/" + (frozen?.id ?? "");
  }, [resolver, snapshot]);
  const latest = useRef(keyOf);
  latest.current = keyOf;
  const replies = useRef(new Map<string, Reply>());
  const jobs = useRef(new Map<string, Job>());
  const [heights, setHeights] = useState(() => new Map<string, number>());
  const size = useCallback((id: string, height: number) => {
    setHeights(previous => previous.get(id) === height ? previous : new Map(previous).set(id, height));
  }, []);
  const [revision, refresh] = useReducer(n => n + 1, 0);

  useEffect(() => {
    for (const [id, job] of jobs.current) if (job.key !== latest.current(id)) {
      job.controller.abort();
      jobs.current.delete(id);
    }
    for (const [id, reply] of replies.current) if (reply.key !== latest.current(id)) replies.current.delete(id);
  }, [keyOf]);
  useEffect(() => () => {
    for (const job of jobs.current.values()) job.controller.abort();
    jobs.current.clear();
  }, []);
  useEffect(() => {
    const ids = new Set(doc.nodes.map(node => node.id));
    setHeights(previous => [...previous.keys()].every(id => ids.has(id)) ? previous :
      new Map([...previous].filter(([id]) => ids.has(id))));
  }, [doc.nodes]);
  const request = useCallback((id: string, key: string, explicit: boolean) => {
    if (latest.current(id) !== key) return;
    const inFlight = jobs.current.get(id);
    if (inFlight?.key === key && (inFlight.explicit || !explicit)) return;
    if (!explicit && replies.current.get(id)?.key === key) return;
    inFlight?.controller.abort();
    const controller = new AbortController();
    const job = { key, explicit, controller };
    jobs.current.set(id, job);
    refresh();
    const load = async () => {
      let data: DataPreview;
      try {
        await flush();
        if (controller.signal.aborted || latest.current(id) !== key) return;
        data = await bridge.previewData({ nodeId: id, tryModel: explicit }, controller.signal);
      } catch (cause) {
        if (controller.signal.aborted) return;
        data = { state: "error", message: cause instanceof Error ? cause.message : String(cause), lines: [], count: 0, remaining: 0 };
      }
      if (!controller.signal.aborted && latest.current(id) === key) replies.current.set(id, { key, data });
    };
    void load().finally(() => {
      if (jobs.current.get(id) === job) {
        jobs.current.delete(id);
        refresh();
      }
    });
  }, [bridge, flush]);
  return useMemo(() => ({
    resolver, keyOf, request, heights, size,
    reply: (id: string, key: string) => {
      const found = replies.current.get(id); return found?.key === key ? found.data : undefined;
    },
    pending: (id: string, key: string) => jobs.current.get(id)?.key === key,
  }), [resolver, keyOf, request, revision, heights, size]);
}

export const CanvasPreviewContext = createContext<ReturnType<typeof useCanvasPreviews> | null>(null);
function usePassive(id: string, key: string, enabled: boolean, request?: ReturnType<typeof useCanvasPreviews>["request"]) {
  useEffect(() => {
    if (!enabled || !request) return;
    const timer = window.setTimeout(() => request(id, key, false), 180);
    return () => window.clearTimeout(timer);
  }, [id, key, enabled, request]);
}

export function WireListLabel({ edge, source, fallback }: { edge: FlowEdge; source: FlowNode; fallback: string }) {
  const previews = useContext(CanvasPreviewContext);
  const projected = previews?.resolver.edge(edge.id);
  const key = previews?.keyOf(source.id) ?? "";
  const passive = source.kind === "flow" && dataMode(source) !== "ai" && needsHost(projected?.state ?? "");
  usePassive(source.id, key, passive, previews?.request);
  const reply = previews?.reply(source.id, key);
  const count = projected?.state === "ready" ? projected.content.items?.length : reply?.state === "ready" ? reply.count : undefined;
  return count === undefined ? <>{fallback}</> : <>{t("flow_data_list")}·{count}</>;
}

function useDataPreview({ node, run }: NodeViewProps) {
  const previews = useContext(CanvasPreviewContext);
  const projected = previews?.resolver.output(node.id);
  const key = previews?.keyOf(node.id) ?? "";
  const ai = dataMode(node) === "ai";
  usePassive(node.id, key, !ai && needsHost(projected?.state ?? ""), previews?.request);
  const reply = previews?.reply(node.id, key);
  const latest = run?.steps.findLast(step => step.nodeId === node.id && step.state === "completed" && step.outputContent)?.outputContent;
  const current = projected?.state === "ready" ? previewLines(projected.content) :
    reply?.state === "ready" ? reply : undefined;
  const previous = !current && latest && (projected?.state === "dynamic" || ai) ? previewLines(latest) : undefined;
  return {
    ai, current: current ?? previous, previous: !!previous, pending: previews?.pending(node.id, key) ?? false,
    error: reply?.state === "error" ? reply.message : projected?.state === "error" ? projected.message : undefined,
    waiting: reply?.state === "waiting", trial: () => previews?.request(node.id, key, true), size: previews?.size,
  };
}

export function DataCompact(props: NodeViewProps) {
  const preview = useDataPreview(props);
  const text = preview.current?.lines[0] || t(preview.current ? "flow_data_empty" : "flow_data_waiting");
  if (preview.ai) return <>
    {preview.current && <span className="compact-overview-detail user-content" title={text}>{text}</span>}
    <button className="button-quiet fs-flow-compact-action" type="button" disabled={preview.pending}
      onClick={event => { event.stopPropagation(); preview.trial(); }}>{t("flow_data_trial")}</button>
  </>;
  return <span className="compact-overview-detail user-content" title={text}>{text}</span>;
}

export function DataFull(props: NodeViewProps) {
  const preview = useDataPreview(props);
  const content = preview.current;
  const truncated = content?.originalCount !== undefined && content.originalCount > content.count;
  const waiting = !preview.ai || preview.waiting;
  const lines = !preview.error && content ? Math.max(1, content.lines.length) : 0;
  const notes = Number(preview.previous) + (preview.error ? 1 : content
    ? Number(!!content.remaining) + Number(truncated) : Number(waiting));
  const height = dataCardHeight(props.node, lines, notes, preview.ai);
  const size = preview.size;
  useLayoutEffect(() => { size?.(props.node.id, height); }, [size, props.node.id, height]);
  return <FlowShell {...props} fixedHeight>
    <div className="fs-data-preview">
      {preview.previous && <small>{t("flow_data_previous")}</small>}
      {preview.ai && <button className="button button-quiet" type="button" disabled={preview.pending}
        onClick={event => { event.stopPropagation(); preview.trial(); }}>{t("flow_data_trial")}</button>}
      {preview.error ? <p className="fs-data-preview-error" role="alert">{preview.error}</p> :
        content ? <>
          <pre className="file-preview user-content">{content.lines.length ? content.lines.join("\n") : t("flow_data_empty")}</pre>
          {!!content.remaining && <small>{t("flow_data_remaining", { n: content.remaining })}</small>}
          {truncated && <small>{t("flow_list_truncated", { kept: content.count, total: content.originalCount! })}</small>}
        </> : waiting &&
          <small>{t(preview.pending ? "flow_data_loading" : "flow_data_waiting")}</small>}
    </div>
  </FlowShell>;
}
