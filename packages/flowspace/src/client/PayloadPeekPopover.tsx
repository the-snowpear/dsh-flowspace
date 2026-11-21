import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { boardContent, resolveBoardReference } from "../core/board.ts";
import { DEFAULT_LIST_LIMIT, textOfContent } from "../core/content.ts";
import { referenceTitle } from "../core/document.ts";
import type {
  ContextSnapshot,
  EdgePayloadPreview,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
} from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { capsuleStateOf } from "./geometry.ts";
import { t } from "./i18n.ts";
import { Icon, kindIconName } from "./icons.tsx";

const utf8Encoder = new TextEncoder();
const SPILL_THRESHOLD_BYTES = 65_536;
const useClientLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type EdgePayloadPreviewData = EdgePayloadPreview;

type InspectableBridge = CanvasBridge & {
  inspectEdgePayload?: (req: {
    edgeId: string;
    runId?: string;
  }) => Promise<EdgePayloadPreviewData>;
};

export function formatPayloadBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  return `${kib >= 10 ? kib.toFixed(1) : kib.toFixed(2)} KiB`;
}

function extractNodeText(
  node: FlowNode | undefined,
  snapshot: FlowspaceSnapshot | null,
  edge: FlowEdge,
  listLimit = DEFAULT_LIST_LIMIT,
): { text: string; seq?: number; sessionId?: string } {
  if (!node) return { text: "" };
  if (node.kind === "agent") {
    const live = snapshot?.live.find((l) => l.nodeId === node.id);
    const lastStep = (snapshot?.runs ?? [])
      .flatMap((r) => r.steps)
      .findLast((s) => s.nodeId === node.id && Boolean(s.output?.trim()));
    const text = live?.output?.trim()
      ? live.output
      : (lastStep?.output ?? "");
    const seq =
      live && live.seq >= 0
        ? live.seq
        : lastStep?.endSeq;
    return {
      text,
      seq,
      sessionId: node.sessionId ?? live?.sessionId ?? lastStep?.sessionId,
    };
  }
  if (node.kind === "board") {
    return { text: resolveBoardReference(node, edge.sourceItemKey, listLimit).text };
  }
  if (node.kind === "file") {
    const selected = node.selectedItems?.length
      ? node.selectedItems
      : node.text
        ? [node.text]
        : [];
    return {
      text: selected.length
        ? selected.map((p) => `@${p}`).join("\n")
        : "",
    };
  }
  return {
    text: node.text ?? "",
    seq: node.changesSeq ?? node.sourceSeq,
    sessionId: node.changesSessionId ?? node.terminalSessionId,
  };
}

export function buildLocalEdgePayloadFallback(
  doc: FlowspaceDocument,
  snapshot: FlowspaceSnapshot | null,
  edge: FlowEdge,
  runId?: string,
  capturedSource?: ContextSnapshot,
): EdgePayloadPreviewData {
  const src = doc.nodes.find((n) => n.id === edge.source);
  const tgt = doc.nodes.find((n) => n.id === edge.target);
  const targetTitle = tgt?.title || edge.target;

  const candidateRuns = runId
    ? (snapshot?.runs ?? []).filter((r) => r.id === runId)
    : src?.kind === "board" ? [] : (snapshot?.runs ?? []);
  const capturedToken = candidateRuns
    .flatMap((r) => r.tokens)
    .findLast((tk) => tk.edgeId === edge.id);

  const liveResolved = extractNodeText(src, snapshot, edge, doc.settings.listLimit);
  const boardItem = src?.kind === "board" && edge.sourceItemKey !== undefined;
  const captured = capturedSource ?? capturedToken?.source;
  const frozenText = edge.snapshotContent
    ? edge.snapshotText ?? textOfContent(edge.snapshotContent)
    : edge.snapshotText || undefined;
  const content = captured?.text ?? (boardItem && !edge.snapshotContent ? liveResolved.text : frozenText ?? liveResolved.text);
  const structured = captured ? captured.content : edge.snapshotContent ??
    (src?.kind === "board" && (boardItem || !edge.snapshotText)
      ? boardContent(src, edge.sourceItemKey, doc.settings.listLimit) : undefined);
  const sourceTitle = capturedSource?.title ?? (src?.kind === "board" ? capturedToken?.source.title : undefined) ?? referenceTitle(src, edge);
  const seq = capturedSource?.seq ?? capturedToken?.source.seq ?? liveResolved.seq;
  const sessionId =
    capturedSource?.sourceSessionId ?? capturedToken?.source.sourceSessionId ?? liveResolved.sessionId;
  const byteLength = utf8Encoder.encode(content).byteLength;
  const willSpill = byteLength > SPILL_THRESHOLD_BYTES;

  const freshness: EdgePayloadPreviewData["freshness"] =
    edge.kind === "reference"
      ? capsuleStateOf(edge, snapshot?.sourceVersions)
      : capturedToken && !capturedToken.consumed && !capturedToken.dismissed
        ? "pending"
        : "live";

  const firstLine =
    content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";

  return {
    edgeId: edge.id,
    kind: edge.kind,
    mode: edge.kind === "continuation" ? edge.mode : (src?.kind ?? "reference"),
    sourceTitle,
    targetTitle,
    sessionId,
    seq,
    byteLength,
    itemCount: structured?.items?.length ?? (structured?.dataType === "file" && Array.isArray(structured.value)
      ? structured.value.length : undefined),
    originalCount: structured?.originalCount,
    willSpill,
    freshness,
    summary: firstLine.slice(0, 120),
    content,
  };
}

function isLikelyUnifiedDiff(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 1600);
  return sample.includes("\n@@ ") || sample.startsWith("@@ ") || sample.includes("\ndiff --git ");
}

export interface PayloadPeekCardProps {
  edge: FlowEdge;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge?: CanvasBridge;
  runId?: string;
  capturedSource?: ContextSnapshot;
  defaultExpanded?: boolean;
}

export function PayloadPeekCard({
  edge,
  doc,
  snapshot,
  bridge,
  runId,
  capturedSource,
  defaultExpanded = false,
}: PayloadPeekCardProps) {
  const fallback = useMemo(
    () => buildLocalEdgePayloadFallback(doc, snapshot, edge, runId, capturedSource),
    [doc, snapshot, edge, runId, capturedSource],
  );
  const [remoteData, setRemoteData] = useState<EdgePayloadPreviewData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const srcNode = doc.nodes.find((n) => n.id === edge.source);
  const boardLive = srcNode?.kind === "board" && !runId;

  useEffect(() => {
    const inspect = (bridge as InspectableBridge | undefined)
      ?.inspectEdgePayload;
    if (!inspect || boardLive || capturedSource) {
      setRemoteData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void inspect
      .call(bridge, { edgeId: edge.id, runId })
      .then((res) => {
        if (active) setRemoteData(res);
      })
      .catch(() => {
        if (active) setRemoteData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bridge, edge.id, edge.mode, edge.always, edge.sentVersion, runId, snapshot?.live, boardLive, capturedSource]);

  const data = capturedSource || boardLive ? fallback : remoteData ?? fallback;
  const modeLabel =
    edge.kind === "continuation"
      ? t(edge.mode)
      : t(srcNode?.kind ?? "reference");
  const isLong = data.content.length > 420;
  const shownText =
    expanded || !isLong ? data.content : `${data.content.slice(0, 420)}…`;
  const diffStyled = isLikelyUnifiedDiff(shownText);

  const handleCopy = () => {
    if (!data.content) return;
    void navigator.clipboard?.writeText(data.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <section
      className="fs-payload-card"
      style={{
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--r-8)",
        background: "var(--surface-2)",
        padding: "10px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "space-between",
        }}
      >
        <span
          className="eyebrow"
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <Icon name="xray" />
          <span>{t("payloadXray")}</span>
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {isLong && (
            <button
              type="button"
              className="text-button"
              onClick={() => setExpanded((v) => !v)}
            >
              <span>{t(expanded ? "collapsePayload" : "expandPayload")}</span>
            </button>
          )}
          {data.content && (
            <button
              type="button"
              className="icon-button"
              title={copied ? t("copied") : t("copy")}
              onClick={handleCopy}
            >
              <Icon name={copied ? "check" : "copy"} />
            </button>
          )}
        </div>
      </header>

      <div className="template-meta" style={{ marginTop: 0 }}>
        <span>
          <Icon
            name={
              edge.kind === "continuation"
                ? { conclusion: "turn", session: "clock", fork: "fork" }[
                    edge.mode
                  ]
                : kindIconName(srcNode?.kind ?? "file", srcNode?.flowType)
            }
          />{" "}
          {modeLabel}
        </span>
        <span className={data.freshness === "updated" ? "warn" : ""}>
          {t(data.freshness)}
        </span>
        {data.seq !== undefined && data.seq >= 0 && (
          <span>{t("seqWatermark", { seq: data.seq })}</span>
        )}
        <span>{formatPayloadBytes(data.byteLength)}</span>
        {data.itemCount !== undefined && data.originalCount !== undefined && data.originalCount > data.itemCount && (
          <span className="fs-content-count">
            {t("flow_list_truncated", { kept: data.itemCount, total: data.originalCount })}
          </span>
        )}
        <span className={data.willSpill ? "warn" : ""}>
          {t(data.willSpill ? "spillBadge" : "withinInlineLimit")}
        </span>
      </div>

      {loading && !data.content ? (
        <p className="muted" style={{ margin: 0, fontSize: 11.5 }}>
          {t("loadingPayload")}
        </p>
      ) : data.content ? (
        diffStyled ? (
          <div
            className="fs-diff-view user-content"
            style={{
              maxHeight: expanded ? 320 : 156,
              overflow: "auto",
              borderRadius: 8,
              background: "var(--code-bg)",
              padding: "6px 8px",
            }}
          >
            {shownText.split(/\r?\n/).map((line, i) => {
              const cls = line.startsWith("+")
                ? "add"
                : line.startsWith("-")
                  ? "del"
                  : "ctx";
              return (
                <div key={i} className={`fs-diff-line ${cls}`}>
                  {line}
                </div>
              );
            })}
          </div>
        ) : (
          <pre
            className="file-preview fs-xray-pre user-content"
            style={{
              margin: 0,
              maxHeight: expanded ? 320 : 156,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "var(--code-bg)",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 11.5,
            }}
          >
            {shownText}
          </pre>
        )
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 11.5 }}>
          {t("payloadEmpty")}
        </p>
      )}
    </section>
  );
}

export interface PayloadPeekPopoverProps {
  anchor: { x: number; y: number };
  edge: FlowEdge;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge?: CanvasBridge;
  runId?: string;
  onClose: () => void;
  onOpenInspector?: () => void;
}

export function PayloadPeekPopover({
  anchor,
  edge,
  doc,
  snapshot,
  bridge,
  runId,
  onClose,
  onOpenInspector,
}: PayloadPeekPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: anchor.x,
    top: anchor.y + 10,
  });

  useClientLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const reposition = () => {
      const rect = el.getBoundingClientRect();
      const pad = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = anchor.x;
      let top = anchor.y + 10;
      if (left + rect.width > vw - pad) {
        left = Math.max(pad, anchor.x - rect.width);
      }
      if (top + rect.height > vh - pad) {
        top = Math.max(pad, anchor.y - rect.height - 10);
      }
      setPos({
        left: Math.max(pad, Math.min(left, vw - rect.width - pad)),
        top: Math.max(pad, Math.min(top, vh - rect.height - pad)),
      });
    };
    reposition();
    const ro = new ResizeObserver(reposition);
    ro.observe(el);
    return () => ro.disconnect();
  }, [anchor.x, anchor.y]);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        onClose();
      }
    };
    const onPointerDown = (ev: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(ev.target as Node | null)
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  const srcTitle = referenceTitle(doc.nodes.find((n) => n.id === edge.source), edge);
  const tgtTitle =
    doc.nodes.find((n) => n.id === edge.target)?.title ?? edge.target;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("payloadXray")}
      className="fs-menu fs-payload-peek"
      style={{
        left: pos.left,
        top: pos.top,
        width: 368,
        maxWidth: "calc(100vw - 24px)",
        padding: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          padding: "0 2px",
        }}
      >
        <b
          className="user-content"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {srcTitle} → {tgtTitle}
        </b>
        {onOpenInspector && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onOpenInspector();
              onClose();
            }}
          >
            <Icon name="side" />
            <span>{t("inspect")}</span>
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          title={t("close")}
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>
      <PayloadPeekCard
        edge={edge}
        doc={doc}
        snapshot={snapshot}
        bridge={bridge}
        runId={runId}
        defaultExpanded={false}
      />
    </div>
  );
}
