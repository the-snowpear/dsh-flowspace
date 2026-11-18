import type {
  CanvasPrefs,
  CanvasSnapshot,
  FlowEdge,
  FlowNode,
  FlowToken,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  GroupColor,
  GroupPort,
  RunStep,
  StartRequest,
  WorkflowTemplate,
  WorkspaceBrief,
} from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { capsuleStateOf, inferGroupPorts, nodeBox } from "./geometry.ts";
import { getLanguage, t } from "./i18n.ts";
import { BrandMark, Icon, kindIconName } from "./icons.tsx";
import { PayloadPeekCard } from "./PayloadPeekPopover.tsx";
import { allTemplates, builtinTemplates } from "./templates.ts";

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";
export type DistributeAxis = "horizontal" | "vertical";

export interface StructureInspectorItem {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  branch?: string;
  worktreePath?: string;
  cwd?: string;
  sessionId?: string;
}

type StepWithTelemetry = RunStep & {
  telemetry?: {
    stepCount: number;
    inputTokens: number;
    outputTokens: number;
    durationMs?: number;
  };
};

type TokenWithLoopGate = FlowToken & {
  loopCapReached?: boolean;
};

type ExtendedBridge = CanvasBridge & {
  extendLoop?: (req: {
    runId: string;
    edgeId?: string;
    nodeId?: string;
    extraRounds?: number;
  }) => Promise<void>;
};

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(
    getLanguage() === "en" ? "en-GB" : "zh-CN",
    { hour: "2-digit", minute: "2-digit" },
  );
}

export function formatDate(at: number): string {
  return new Date(at).toLocaleString(
    getLanguage() === "en" ? "en-GB" : "zh-CN",
    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
  );
}

export function formatStepDuration(step: StepWithTelemetry): string | null {
  const ms =
    step.telemetry?.durationMs ??
    (step.endedAt && step.endedAt >= step.createdAt
      ? step.endedAt - step.createdAt
      : undefined);
  if (ms === undefined || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)}s`;
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${mins}m ${rem}s`;
}

export function formatStepTelemetrySummary(step: StepWithTelemetry): string {
  const parts: string[] = [];
  if (step.telemetry) {
    if (step.telemetry.stepCount > 0) {
      parts.push(`${step.telemetry.stepCount} st`);
    }
    const totalTokens =
      (step.telemetry.inputTokens || 0) + (step.telemetry.outputTokens || 0);
    if (totalTokens > 0) {
      parts.push(
        totalTokens >= 1000
          ? `${(totalTokens / 1000).toFixed(1)}k tok`
          : `${totalTokens} tok`,
      );
    }
  }
  const dur = formatStepDuration(step);
  if (dur) parts.push(dur);
  return parts.join(" · ");
}

export function nodeStatusOf(
  snapshot: FlowspaceSnapshot | null,
  nodeId: string,
): string {
  if (
    snapshot?.runs.some(
      (r) =>
        ["running", "waiting", "paused"].includes(r.state) &&
        r.tokens.some(
          (tk) =>
            !tk.ready &&
            !tk.consumed &&
            !tk.dismissed &&
            r.graph.edges.find((e) => e.id === tk.edgeId)?.target === nodeId,
        ),
    )
  ) {
    return "waiting";
  }
  const live = snapshot?.live.find((l) => l.nodeId === nodeId);
  if (live?.pendingInput.length) return "input";
  if (live?.running) return "running";
  const node = snapshot?.document.nodes.find((n) => n.id === nodeId);
  if ((node?.participation as string | undefined) === "bypassed") {
    return "bypassed";
  }
  const lastStep = snapshot?.runs
    .flatMap((r) => r.steps)
    .filter((s) => s.nodeId === nodeId)
    .at(-1);
  if (lastStep) return lastStep.state;
  const hasSessionHistory =
    (live?.seq ?? -1) >= 0 || Boolean(live?.output?.trim());
  return node?.sessionId && hasSessionHistory ? "completed" : "draft";
}

function templateCapabilityBadges(tpl: WorkflowTemplate): {
  label: string;
  warn?: boolean;
}[] {
  const badges: { label: string; warn?: boolean }[] = [];
  if (tpl.nodes.some((n) => n.planMode)) {
    badges.push({ label: t("badgePlan") });
  }
  if (tpl.edges.some((e) => e.mode === "fork")) {
    badges.push({ label: t("badgeFork") });
  }
  const contEdges = tpl.edges.filter((e) => e.kind === "continuation");
  const loopEdge = contEdges.find((e) =>
    contEdges.some(
      (back) => back.source === e.target && back.target === e.source,
    ),
  );
  if (loopEdge) {
    badges.push({
      label: t("badgeLoop", { count: loopEdge.maxRounds || 3 }),
      warn: true,
    });
  }
  const joinTarget = tpl.nodes.some(
    (n) => contEdges.filter((e) => e.target === n.id).length >= 2,
  );
  if (joinTarget) {
    badges.push({ label: t("badgeJoin") });
  }
  if (
    tpl.nodes.some((n) =>
      ["git", "changes", "terminal", "board"].includes(n.kind),
    )
  ) {
    badges.push({ label: t("badgeTools") });
  }
  if (tpl.edges.some((e) => e.trigger === "confirm")) {
    badges.push({ label: t("confirm"), warn: true });
  }
  return badges;
}

export function MiniGraph({
  nodes,
  edges,
  snapshot,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  snapshot?: FlowspaceSnapshot | null;
}) {
  const shown = nodes.filter((n) => n.kind !== "group");
  if (!shown.length) return null;
  const boxes = new Map(
    shown.map((n) => [n.id, nodeBox({ ...n, window: undefined }, false)]),
  );
  const all = [...boxes.values()];
  const wpPoints = edges.flatMap((e) => e.waypoints ?? []);
  const pad = 44;
  const left =
    Math.min(...all.map((b) => b.x), ...wpPoints.map((p) => p.x)) - pad;
  const top =
    Math.min(...all.map((b) => b.y), ...wpPoints.map((p) => p.y)) - pad;
  const width =
    Math.max(...all.map((b) => b.x + b.w), ...wpPoints.map((p) => p.x)) +
    pad -
    left;
  const height =
    Math.max(...all.map((b) => b.y + b.h), ...wpPoints.map((p) => p.y)) +
    pad -
    top;

  const renderWire = (edge: FlowEdge) => {
    const a = boxes.get(edge.source),
      b = boxes.get(edge.target);
    if (!a || !b) return null;
    const ax = a.x + a.w - left,
      ay = a.y - top + (edge.kind === "reference" ? Math.min(72, a.h * 0.58) : Math.min(28, a.h / 2)),
      bx = b.x - left,
      by = b.y - top + (edge.kind === "reference" ? Math.min(72, b.h * 0.58) : Math.min(28, b.h / 2));
    const cls =
      edge.kind === "reference"
        ? "mg-ref"
        : `mg-flow ${edge.trigger === "confirm" ? "mg-confirm" : ""}`;

    /* Smooth backward-loop arc when cyclic feedback wire routes right-to-left */
    if (bx < ax - 20) {
      const loopY =
        edge.waypoints?.length
          ? Math.max(...edge.waypoints.map((p) => p.y - top))
          : Math.max(a.y + a.h, b.y + b.h) - top + 36;
      const d = `M${ax} ${ay} C${ax + 54} ${ay}, ${ax + 54} ${loopY}, ${(ax + bx) / 2} ${loopY} C${bx - 54} ${loopY}, ${bx - 54} ${by}, ${bx} ${by}`;
      return (
        <path
          key={edge.id}
          className={cls}
          vectorEffect="non-scaling-stroke"
          d={d}
        />
      );
    }

    const reach = Math.max(40, Math.abs(bx - ax) * 0.45);
    return (
      <path
        key={edge.id}
        className={cls}
        vectorEffect="non-scaling-stroke"
        d={`M${ax} ${ay} C${ax + reach} ${ay}, ${bx - reach} ${by}, ${bx} ${by}`}
      />
    );
  };

  return (
    <svg
      className="mini-graph"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {edges.filter((e) => e.kind === "reference").map(renderWire)}
      {edges.filter((e) => e.kind === "continuation").map(renderWire)}
      {shown.map((n) => {
        const b = boxes.get(n.id)!;
        const x = b.x - left,
          y = b.y - top;
        const st = snapshot ? nodeStatusOf(snapshot, n.id) : "draft";
        const mgState =
          n.kind !== "agent"
            ? "other"
            : (n.participation as string) === "bypassed" || st === "bypassed"
              ? "bypassed"
              : st === "completed" || st === "done"
                ? "done"
                : st === "running"
                  ? "running"
                  : st === "waiting" || st === "input" || st === "paused"
                    ? "waiting"
                    : "agent";
        return (
          <g key={n.id}>
            <rect
              className={`mg-node mg-${mgState}`}
              vectorEffect="non-scaling-stroke"
              x={x}
              y={y}
              width={b.w}
              height={b.h}
              rx={20}
            />
            <circle
              className={`mg-dot mg-${mgState}`}
              cx={x + 30}
              cy={y + 30}
              r={n.kind === "agent" ? 13 : 9}
            />
            <rect
              className="mg-bar"
              x={x + 54}
              y={y + 22}
              width={b.w * 0.5}
              height={16}
              rx={8}
            />
            {b.h > 150 && (
              <>
                <rect
                  className="mg-bar"
                  x={x + 24}
                  y={y + 74}
                  width={b.w - 48}
                  height={12}
                  rx={6}
                />
                <rect
                  className="mg-bar"
                  x={x + 24}
                  y={y + 100}
                  width={(b.w - 48) * 0.7}
                  height={12}
                  rx={6}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   WelcomeStudio: Visual Empty-Canvas Blueprint Gallery & Wire Legend
   ============================================================ */
export interface WelcomeStudioProps {
  doc?: FlowspaceDocument;
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onCreateBlankAgent: () => void;
  onBrowseLibrary: () => void;
  onImportSession?: () => void;
}

export function WelcomeStudio({
  doc,
  onSelectTemplate,
  onCreateBlankAgent,
  onBrowseLibrary,
  onImportSession,
}: WelcomeStudioProps) {
  const builtins = builtinTemplates(getLanguage());
  const featured = builtins.slice(0, 4);
  const totalCount = doc
    ? allTemplates(doc, getLanguage()).length
    : builtins.length;

  return (
    <div className="fs-welcome-overlay">
      <div
        className="fs-welcome-card fs-welcome-studio"
        style={{
          maxWidth: 784,
          padding: "24px 26px 22px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div className="fs-welcome-mark" style={{ margin: 0, flexShrink: 0 }}>
            <BrandMark />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="eyebrow">{t("welcomeEyebrow")}</span>
            <h1 style={{ margin: "3px 0 4px", fontSize: 20 }}>
              {t("welcomeTitle")}
            </h1>
            <p style={{ margin: 0, fontSize: 12.5 }}>
              {t("welcomeStudioSubtitle")}
            </p>
          </div>
        </div>

        <div
          className="fs-welcome-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {featured.map((tpl) => {
            const badges = templateCapabilityBadges(tpl).slice(0, 2);
            return (
              <button
                key={tpl.id}
                type="button"
                className="template-card fs-blueprint-pick"
                onClick={() => onSelectTemplate(tpl)}
                style={{
                  textAlign: "left",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <div className="template-graph" style={{ height: 88 }}>
                  <MiniGraph nodes={tpl.nodes} edges={tpl.edges} />
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <b
                    style={{
                      display: "block",
                      fontSize: 13,
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {t(tpl.title)}
                  </b>
                  <small
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      color: "var(--text-3)",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                    }}
                  >
                    {t(tpl.description)}
                  </small>
                  <div className="template-meta" style={{ marginTop: 8 }}>
                    <span>{t("nodesCount", { count: tpl.nodes.length })}</span>
                    {badges.map((b, bi) => (
                      <span key={bi} className={b.warn ? "warn" : ""}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="fs-welcome-actions"
          style={{ justifyContent: "space-between", marginBottom: 14 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="button button-primary"
              onClick={onCreateBlankAgent}
            >
              <Icon name="plus" />
              <span>{t("newAgent")}</span>
            </button>
            {onImportSession && (
              <button
                type="button"
                className="button"
                onClick={onImportSession}
              >
                <Icon name="chat" />
                <span>{t("existingSession")}</span>
              </button>
            )}
          </div>
          <button type="button" className="button" onClick={onBrowseLibrary}>
            <Icon name="box" />
            <span>{t("browseAllBlueprints", { count: totalCount })}</span>
          </button>
        </div>

        <div
          className="fs-welcome-legend"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          {(["legendPillRef", "legendPillCont", "legendPillMsg"] as const).map(
            (key) => (
              <span
                key={key}
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "var(--surface-2)",
                }}
              >
                {t(key)}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   InspectorPanel: Single Node, Multi-Select, Structure & X-Ray Wire Inspector
   ============================================================ */
export interface InspectorProps {
  open: boolean;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  workspaces: WorkspaceBrief[];
  bridge?: CanvasBridge;
  selectedNode?: FlowNode;
  selectedNodes?: FlowNode[];
  selectedEdge?: FlowEdge;
  selectedStructureCard?: StructureInspectorItem | null;
  onClose: () => void;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onEditEdge: (id: string, changes: Partial<FlowEdge>) => void;
  onDeleteSelection: () => void;
  onUngroup: (groupId: string) => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
  onExtendLoop?: (runId: string, edgeId: string, nodeId?: string) => void;
  onOpenNativeChat: (sessionId: string) => void;
  onOpenDetail: (nodeId: string) => void;
  onOpenWindow: (nodeId: string) => void;
  onSetGroupPorts: (groupId: string, ports: GroupPort[]) => void;
  onOpenMergePorts: (groupId: string) => void;
  onSaveTemplate: (groupId: string) => void;
  onSyncTemplate: (groupId: string) => void;
  onDetachTemplate: (groupId: string) => void;
  /* Optional Wave 2 ComfyUI callbacks */
  onAlign?: (mode: AlignMode) => void;
  onDistribute?: (axis: DistributeAxis) => void;
  onGroupSelected?: () => void;
  onDuplicateSelected?: () => void;
  onBatchParticipation?: (
    participation: "global" | "manual" | "paused" | "bypassed",
  ) => void;
  onRunSelection?: () => void;
  onRunFromHere?: (nodeId: string) => void;
  onRunToHere?: (nodeId: string) => void;
  onForkHypothesis?: (nodeId: string) => void;
  onStopNode?: (nodeId: string) => void;
}

export function InspectorPanel({
  open,
  doc,
  snapshot,
  workspaces,
  bridge,
  selectedNode,
  selectedNodes,
  selectedEdge,
  selectedStructureCard,
  onClose,
  onEditNode,
  onEditEdge,
  onDeleteSelection,
  onUngroup,
  onReleaseToken,
  onExtendLoop,
  onOpenNativeChat,
  onOpenDetail,
  onOpenWindow,
  onSetGroupPorts,
  onOpenMergePorts,
  onSaveTemplate,
  onSyncTemplate,
  onDetachTemplate,
  onAlign,
  onDistribute,
  onGroupSelected,
  onDuplicateSelected,
  onBatchParticipation,
  onRunSelection,
  onRunFromHere,
  onRunToHere,
  onForkHypothesis,
  onStopNode,
}: InspectorProps) {
  const titleOf = (id: string) =>
    doc.nodes.find((n) => n.id === id)?.title ?? id;

  const triggerExtendLoop = (
    runId: string,
    edgeId: string,
    nodeId?: string,
  ) => {
    if (onExtendLoop) {
      onExtendLoop(runId, edgeId, nodeId);
      return;
    }
    const ext = (bridge as ExtendedBridge | undefined)?.extendLoop;
    if (ext) {
      void ext.call(bridge, { runId, edgeId, nodeId, extraRounds: 1 });
    }
  };

  const renderBody = () => {
    /* 1. Multi-Select ComfyUI Inspector (2+ nodes selected) */
    if (selectedNodes && selectedNodes.length >= 2) {
      const selectedAgents = selectedNodes.filter((n) => n.kind === "agent");
      const kindCounts = new Map<string, number>();
      for (const n of selectedNodes) {
        kindCounts.set(n.kind, (kindCounts.get(n.kind) ?? 0) + 1);
      }

      const applyBatchParticipation = (
        val: "global" | "manual" | "paused" | "bypassed",
      ) => {
        if (onBatchParticipation) {
          onBatchParticipation(val);
          return;
        }
        for (const ag of selectedAgents) {
          onEditNode(ag.id, {
            participation: val as FlowNode["participation"],
          });
        }
      };

      return (
        <div className="inspector-content">
          <span className="eyebrow">{t("rangeSelection")}</span>
          <h2>
            {t("multiSelectionTitle", { count: selectedNodes.length })}
          </h2>

          <div className="template-meta" style={{ marginTop: 0 }}>
            {[...kindCounts.entries()].map(([kind, cnt]) => (
              <span key={kind}>
                {cnt} × {t(kind)}
              </span>
            ))}
          </div>

          {onAlign && (
            <>
              <label className="field-label">{t("alignNodesLabel")}</label>
              <div
                className="fs-align-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 4,
                }}
              >
                {(
                  [
                    ["left", "alignLeft"],
                    ["center", "alignCenter"],
                    ["right", "alignRight"],
                    ["top", "alignTop"],
                    ["middle", "alignMiddle"],
                    ["bottom", "alignBottom"],
                  ] as const
                ).map(([mode, iconKey]) => (
                  <button
                    key={mode}
                    type="button"
                    className="button"
                    style={{ padding: 0, justifyContent: "center" }}
                    title={t(iconKey)}
                    aria-label={t(iconKey)}
                    onClick={() => onAlign(mode)}
                  >
                    <Icon name={iconKey} />
                  </button>
                ))}
              </div>
            </>
          )}

          {onDistribute && selectedNodes.length >= 3 && (
            <>
              <label className="field-label">{t("distributeNodesLabel")}</label>
              <div className="choice-buttons">
                <button
                  type="button"
                  onClick={() => onDistribute("horizontal")}
                >
                  <Icon name="distributeH" />{" "}
                  <span>{t("distributeH")}</span>
                </button>
                <button type="button" onClick={() => onDistribute("vertical")}>
                  <Icon name="distributeV" />{" "}
                  <span>{t("distributeV")}</span>
                </button>
              </div>
            </>
          )}

          {selectedAgents.length > 0 && (
            <>
              <label className="field-label">{t("batchParticipation")}</label>
              <div className="choice-buttons vertical">
                {(
                  [
                    ["global", "global"],
                    ["manual", "manual"],
                    ["paused", "pausedParticipation"],
                    ["bypassed", "bypassParticipation"],
                  ] as const
                ).map(([val, labelKey]) => {
                  const allMatch = selectedAgents.every(
                    (ag) => (ag.participation as string) === val,
                  );
                  return (
                    <button
                      key={val}
                      type="button"
                      className={allMatch ? "selected" : ""}
                      onClick={() => applyBatchParticipation(val)}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="inspector-divider" />
          {onRunSelection && selectedAgents.length > 0 && (
            <button
              type="button"
              className="button button-primary"
              onClick={onRunSelection}
            >
              <Icon name="play" />
              <span>{t("runSelection")}</span>
            </button>
          )}
          {onGroupSelected && (
            <button type="button" className="button" onClick={onGroupSelected}>
              <Icon name="group" />
              <span>{t("groupSelection")}</span>
            </button>
          )}
          {onDuplicateSelected && (
            <button
              type="button"
              className="text-button"
              onClick={onDuplicateSelected}
            >
              <Icon name="duplicate" />
              <span>{t("duplicateSelection")}</span>
            </button>
          )}
          <button
            type="button"
            className="text-button danger"
            onClick={onDeleteSelection}
          >
            <Icon name="trash" />
            <span>{t("deleteSelected")}</span>
          </button>
        </div>
      );
    }

    /* 2. Single Edge Inspector + Embedded Payload X-Ray */
    if (selectedEdge) {
      const targetNode = doc.nodes.find((n) => n.id === selectedEdge.target);
      const waitingTokens: { run: FlowspaceRun; token: TokenWithLoopGate }[] =
        snapshot?.runs
          .filter((r) => ["running", "waiting", "paused"].includes(r.state))
          .flatMap((run) =>
            run.tokens
              .filter(
                (tk) =>
                  tk.edgeId === selectedEdge.id &&
                  !tk.ready &&
                  !tk.consumed &&
                  !tk.dismissed,
              )
              .map((token) => ({ run, token: token as TokenWithLoopGate })),
          ) ?? [];

      return (
        <div className="inspector-content">
          <span className="eyebrow">{t(selectedEdge.kind)}</span>
          <h2 className="user-content">
            {titleOf(selectedEdge.source)}
            <span>→</span>
            {titleOf(selectedEdge.target)}
          </h2>

          {selectedEdge.kind === "continuation" ? (
            <>
              <label className="field-label">{t("mode")}</label>
              <div className="mode-options">
                {(
                  [
                    ["conclusion", "turn"],
                    ["session", "clock"],
                    ["fork", "fork"],
                  ] as const
                ).map(([mode, glyph]) => {
                  const disabled =
                    mode === "fork" &&
                    (!!targetNode?.sessionId ||
                      doc.edges.some(
                        (e) =>
                          e.id !== selectedEdge.id &&
                          e.target === selectedEdge.target &&
                          e.mode === "fork",
                      ));
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={selectedEdge.mode === mode ? "selected" : ""}
                      disabled={disabled}
                      title={disabled ? t("draftOnly") : undefined}
                      onClick={() => onEditEdge(selectedEdge.id, { mode })}
                    >
                      <Icon name={glyph} />
                      <span>
                        <b>{t(mode)}</b>
                        <small>{t(`${mode}Description`)}</small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="field-label">{t("trigger")}</label>
              <div className="choice-buttons">
                {(
                  [
                    ["off", "off"],
                    ["auto", "automatic"],
                    ["confirm", "confirm"],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={value}
                    type="button"
                    className={selectedEdge.trigger === value ? "selected" : ""}
                    onClick={() =>
                      onEditEdge(selectedEdge.id, { trigger: value })
                    }
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="fs-edge-rounds">
                {t("maxRounds")}
              </label>
              <div className="rounds-field">
                <input
                  id="fs-edge-rounds"
                  type="number"
                  min={1}
                  max={12}
                  value={selectedEdge.maxRounds}
                  onChange={(e) =>
                    onEditEdge(selectedEdge.id, {
                      maxRounds: Math.max(1, Number(e.target.value) || 3),
                    })
                  }
                />
                <span>{t("rounds", { count: selectedEdge.maxRounds })}</span>
              </div>

              {selectedEdge.originMode && (
                <p className="muted">
                  {t("createdBy", { mode: t(selectedEdge.originMode) })}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="inspector-description">
                {t(selectedEdge.always ? "alwaysTip" : "pendingTip")}
              </p>
              <div className="switch-row">
                <span>{t("always")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={selectedEdge.always}
                  className="switch"
                  onClick={() =>
                    onEditEdge(selectedEdge.id, {
                      always: !selectedEdge.always,
                    })
                  }
                />
              </div>
              <div className="reference-list">
                <div>
                  <Icon
                    name={kindIconName(
                      doc.nodes.find((n) => n.id === selectedEdge.source)
                        ?.kind ?? "file",
                    )}
                  />
                  <span className="user-content">
                    {titleOf(selectedEdge.source)}
                  </span>
                  <small>
                    {t(capsuleStateOf(selectedEdge, snapshot?.sourceVersions))}
                  </small>
                </div>
              </div>
              {selectedEdge.sentVersion && !selectedEdge.always && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    onEditEdge(selectedEdge.id, { sentVersion: "" })
                  }
                >
                  <Icon name="refresh" />
                  <span>{t("rearmCapsule")}</span>
                </button>
              )}
            </>
          )}

          {/* Glass-Box Wire Payload X-Ray Card */}
          <PayloadPeekCard
            edge={selectedEdge}
            doc={doc}
            snapshot={snapshot}
            bridge={bridge}
          />

          {waitingTokens.map(({ run, token }) => (
            <div className="approval-box" key={token.id}>
              <span className="approval-heading">
                <Icon name={token.loopCapReached ? "loopPlus" : "pause"} />
                <b>
                  {t(
                    token.loopCapReached
                      ? "loopCapGate"
                      : token.boundary
                        ? "scopeBoundary"
                        : "waitingConfirmation",
                  )}
                </b>
              </span>
              <div className="approval-snippet user-content">
                {token.source.text.slice(0, 320) || token.source.title}
              </div>
              <div className="button-row">
                {token.loopCapReached ? (
                  <button
                    type="button"
                    className="button button-amber"
                    onClick={() =>
                      triggerExtendLoop(
                        run.id,
                        selectedEdge.id,
                        selectedEdge.target,
                      )
                    }
                  >
                    <Icon name="loopPlus" />
                    <span>{t("extendLoopOne")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-amber"
                    onClick={() => onReleaseToken(run.id, token.id, true)}
                  >
                    <Icon name="play" />
                    <span>{t("release")}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => onReleaseToken(run.id, token.id, false)}
                >
                  <span>{t("dismiss")}</span>
                </button>
              </div>
            </div>
          ))}

          {(selectedEdge.waypoints?.length ?? 0) > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={() => onEditEdge(selectedEdge.id, { waypoints: [] })}
            >
              <Icon name="x" />
              <span>{t("clearWaypoints")}</span>
            </button>
          )}

          <div className="inspector-divider" />
          <button
            type="button"
            className="text-button danger"
            onClick={onDeleteSelection}
          >
            <Icon name="trash" />
            <span>{t("deleteConnection")}</span>
          </button>
        </div>
      );
    }

    /* 3. Group / Composite Workflow Inspector */
    if (selectedNode?.kind === "group") {
      const ports = inferGroupPorts(doc, selectedNode);
      return (
        <div className="inspector-content">
          <span className="eyebrow">{t("groupSettings")}</span>
          <h2 className="user-content">{selectedNode.title}</h2>

          <label className="field-label">{t("name")}</label>
          <input
            className="text-field"
            value={selectedNode.title}
            onChange={(e) =>
              onEditNode(selectedNode.id, {
                title: e.target.value,
                titleKey: undefined,
              })
            }
          />

          <label className="field-label">{t("groupColor")}</label>
          <div className="color-options">
            {(["blue", "violet", "teal", "amber"] as GroupColor[]).map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(color)}
                  className={`color-${color} ${(selectedNode.color ?? "blue") === color ? "selected" : ""}`}
                  onClick={() => onEditNode(selectedNode.id, { color })}
                />
              ),
            )}
          </div>

          <label className="field-label">{t("ports")}</label>
          <div className="port-editor">
            {ports.map((port, idx) => (
              <div
                key={port.id}
                className={`port-editor-row ${port.hidden ? "port-hidden" : ""}`}
              >
                <i className={`proxy-pin proxy-${port.kind}`} />
                <div>
                  <small>
                    {t(port.kind)} ·{" "}
                    {t(port.direction === "in" ? "inputPort" : "outputPort")}
                  </small>
                  <input
                    value={port.name}
                    aria-label={t("portName")}
                    onChange={(e) => {
                      const next = structuredClone(ports);
                      next[idx].name = e.target.value;
                      onSetGroupPorts(selectedNode.id, next);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="icon-button rotate-up"
                  title={t("reorderUp")}
                  onClick={() => {
                    if (idx === 0) return;
                    const next = structuredClone(ports);
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    onSetGroupPorts(selectedNode.id, next);
                  }}
                >
                  <Icon name="chev" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("hidePort")}
                  onClick={() => {
                    const next = structuredClone(ports);
                    next[idx].hidden = !next[idx].hidden;
                    onSetGroupPorts(selectedNode.id, next);
                  }}
                >
                  <Icon name={port.hidden ? "eyeoff" : "eye"} />
                </button>
              </div>
            ))}
          </div>
          {ports.filter((p) => p.direction === "in").length >= 2 && (
            <button
              type="button"
              className="text-button"
              onClick={() => onOpenMergePorts(selectedNode.id)}
            >
              <Icon name="group" />
              <span>{t("mergePorts")}</span>
            </button>
          )}

          <div className="inspector-divider" />
          <button
            type="button"
            className="button button-primary"
            onClick={() => onSaveTemplate(selectedNode.id)}
          >
            <Icon name="box" />
            <span>{t("saveTemplate")}</span>
          </button>

          {selectedNode.templateId && (
            <>
              <p className="muted">
                {t("templateLinked", {
                  version: selectedNode.templateRevision ?? 1,
                })}
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => onSyncTemplate(selectedNode.id)}
              >
                <Icon name="undo" />
                <span>{t("syncTemplate")}</span>
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => onDetachTemplate(selectedNode.id)}
              >
                <Icon name="off" />
                <span>{t("detachTemplate")}</span>
              </button>
            </>
          )}

          <div className="inspector-divider" />
          <button
            type="button"
            className="text-button danger"
            onClick={() => onUngroup(selectedNode.id)}
          >
            <Icon name="x" />
            <span>{t("ungroup")}</span>
          </button>
        </div>
      );
    }

    /* 4. Single Node Inspector */
    if (selectedNode) {
      const state = nodeStatusOf(snapshot, selectedNode.id);
      const canRunPartial = Boolean(
        onRunFromHere || onRunToHere || bridge,
      );

      return (
        <div className="inspector-content">
          <span className="eyebrow">{selectedNode.kind}</span>
          <h2 className="user-content">{selectedNode.title}</h2>
          {selectedNode.kind === "agent" && (
            <span className={`status status-${state}`}>
              <i />
              {t(state)}
            </span>
          )}

          <label className="field-label">{t("name")}</label>
          <input
            className="text-field"
            value={selectedNode.title}
            onChange={(e) =>
              onEditNode(selectedNode.id, {
                title: e.target.value,
                customTitle: true,
              })
            }
          />

          {selectedNode.kind === "agent" && (
            <>
              <label className="field-label">{t("workspace")}</label>
              <select
                className="text-field"
                disabled={!!selectedNode.sessionId}
                value={selectedNode.workspaceId ?? ""}
                onChange={(e) => {
                  const ws = workspaces.find((w) => w.id === e.target.value);
                  onEditNode(selectedNode.id, {
                    workspaceId: e.target.value || undefined,
                    cwd: ws?.path,
                  });
                }}
              >
                <option value="">{t("currentWorkspace")}</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {(selectedNode.branch || selectedNode.worktreePath) && (
                <p className="muted user-content">
                  {t("affiliation")}:{" "}
                  {[
                    selectedNode.branch,
                    selectedNode.worktreePath?.split(/[\\/]/).pop(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              <div className="switch-row">
                <span>{t("planMode")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!selectedNode.planMode}
                  className="switch"
                  onClick={() =>
                    onEditNode(selectedNode.id, {
                      planMode: !selectedNode.planMode,
                    })
                  }
                />
              </div>

              <label className="field-label">{t("savedTask")}</label>
              <textarea
                className="text-field"
                rows={3}
                value={selectedNode.task}
                placeholder={t("taskPlaceholder")}
                onChange={(e) =>
                  onEditNode(selectedNode.id, { task: e.target.value })
                }
              />

              <label className="field-label">
                {t("continuationInstruction")}
              </label>
              <textarea
                className="text-field"
                rows={2}
                value={selectedNode.continuationPrompt ?? selectedNode.task}
                placeholder={t("continuationPlaceholder")}
                onChange={(e) =>
                  onEditNode(selectedNode.id, {
                    continuationPrompt: e.target.value,
                  })
                }
              />

              <label className="field-label">{t("nativeTriggerLabel")}</label>
              <div className="choice-buttons">
                {(
                  [
                    [
                      "inherit",
                      t("inheritGlobal", {
                        state: doc.settings.nativeChatTriggers
                          ? t("enabled")
                          : t("disabled"),
                      }),
                    ],
                    ["enabled", t("enabled")],
                    ["disabled", t("disabled")],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={
                      selectedNode.nativeTrigger === val ? "selected" : ""
                    }
                    onClick={() =>
                      onEditNode(selectedNode.id, { nativeTrigger: val })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="field-label">{t("participation")}</label>
              <div className="choice-buttons vertical">
                {(
                  [
                    ["global", "global"],
                    ["manual", "manual"],
                    ["paused", "pausedParticipation"],
                    ["bypassed", "bypassParticipation"],
                  ] as const
                ).map(([val, labelKey]) => (
                  <button
                    key={val}
                    type="button"
                    className={
                      (selectedNode.participation as string) === val
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      onEditNode(selectedNode.id, {
                        participation: val as FlowNode["participation"],
                      })
                    }
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <label className="field-label">{t("rerunRule")}</label>
              <select
                className="text-field"
                value={selectedNode.rerun ?? "change"}
                onChange={(e) =>
                  onEditNode(selectedNode.id, {
                    rerun: e.target.value as FlowNode["rerun"],
                  })
                }
              >
                <option value="change">{t("onInput")}</option>
                <option value="update">{t("onUpdate")}</option>
                <option value="always">{t("everyRun")}</option>
              </select>

              <div className="inspector-divider" />
              {state === "running" && (onStopNode || bridge) && (
                <button
                  type="button"
                  className="button danger"
                  onClick={() => {
                    if (onStopNode) {
                      onStopNode(selectedNode.id);
                    } else {
                      void bridge?.stopNode(selectedNode.id);
                    }
                  }}
                >
                  <Icon name="stop" />
                  <span>{t("stopAgent")}</span>
                </button>
              )}

              {canRunPartial && (
                <>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      if (onRunFromHere) {
                        onRunFromHere(selectedNode.id);
                      } else {
                        void bridge?.start({
                          kind: "from-node" as StartRequest["kind"],
                          nodeIds: [selectedNode.id],
                        });
                      }
                    }}
                  >
                    <Icon name="runFrom" />
                    <span>{t("runFromHere")}</span>
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (onRunToHere) {
                        onRunToHere(selectedNode.id);
                      } else {
                        void bridge?.start({
                          kind: "to-node" as StartRequest["kind"],
                          nodeIds: [selectedNode.id],
                        });
                      }
                    }}
                  >
                    <Icon name="runTo" />
                    <span>{t("runToHere")}</span>
                  </button>
                </>
              )}

              {onForkHypothesis && selectedNode.sessionId && (
                <button
                  type="button"
                  className="text-button"
                  title={t("forkHypothesisTip")}
                  onClick={() => onForkHypothesis(selectedNode.id)}
                >
                  <Icon name="fork" />
                  <span>{t("forkHypothesis")}</span>
                </button>
              )}

              <button
                type="button"
                className="button"
                onClick={() => onOpenDetail(selectedNode.id)}
              >
                <Icon name="card" />
                <span>{t("executionDetail")}</span>
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => onOpenWindow(selectedNode.id)}
              >
                <Icon name="pop" />
                <span>{t("openWindow")}</span>
              </button>
              {selectedNode.sessionId && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onOpenNativeChat(selectedNode.sessionId!)}
                >
                  <Icon name="chat" />
                  <span>{t("openNativeChat")}</span>
                </button>
              )}
            </>
          )}

          <div className="switch-row">
            <span>{t("pin")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!selectedNode.pinned}
              className="switch"
              onClick={() =>
                onEditNode(selectedNode.id, { pinned: !selectedNode.pinned })
              }
            />
          </div>

          <div className="inspector-divider" />
          <button
            type="button"
            className="text-button danger"
            onClick={onDeleteSelection}
          >
            <Icon name="trash" />
            <span>{t("deleteNode")}</span>
          </button>
          {selectedNode.kind === "agent" && (
            <small className="muted">{t("removeKeepSession")}</small>
          )}
        </div>
      );
    }

    /* 5. Derived Structure Card Inspector (Project / Branch / Worktree / Subagent) */
    if (selectedStructureCard) {
      return (
        <div className="inspector-content">
          <span className="eyebrow">{t("structureInspectorEyebrow")}</span>
          <h2 className="user-content">{selectedStructureCard.title}</h2>
          <p className="inspector-description">{t("structureInspectorDesc")}</p>
          <div className="reference-list">
            <div>
              <Icon name={kindIconName(selectedStructureCard.kind)} />
              <span className="user-content">
                {t(selectedStructureCard.kind)}
              </span>
              {selectedStructureCard.branch && (
                <small className="user-content">
                  {selectedStructureCard.branch}
                </small>
              )}
            </div>
          </div>
          {(selectedStructureCard.worktreePath ||
            selectedStructureCard.cwd ||
            selectedStructureCard.subtitle) && (
            <p className="muted user-content">
              {selectedStructureCard.worktreePath ||
                selectedStructureCard.cwd ||
                selectedStructureCard.subtitle}
            </p>
          )}
          {selectedStructureCard.sessionId && (
            <button
              type="button"
              className="button"
              onClick={() =>
                onOpenNativeChat(selectedStructureCard.sessionId!)
              }
            >
              <Icon name="chat" />
              <span>{t("openNativeChat")}</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="inspector-empty">
        <Icon name="card" />
        <h3>{t("selectObject")}</h3>
        <p>{t("selectObjectDescription")}</p>
      </div>
    );
  };

  return (
    <aside className={`fs-inspector ${open ? "open" : ""}`}>
      <header className="inspector-header">
        <b>{t("inspector")}</b>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          title={t("close")}
        >
          <Icon name="x" />
        </button>
      </header>
      {renderBody()}
    </aside>
  );
}

/* ============================================================
   WorkflowsSurface: 6 Built-In Blueprints, Custom Templates & Snapshots
   ============================================================ */
export function WorkflowsSurface({
  tab,
  onTabChange,
  doc,
  snapshot,
  onInstantiate,
  onPreviewTemplate,
  onDeleteTemplate,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onReturnCanvas,
}: {
  tab: "patterns" | "mine" | "snapshots";
  onTabChange: (next: "patterns" | "mine" | "snapshots") => void;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  onInstantiate: (template: WorkflowTemplate) => void;
  onPreviewTemplate: (template: WorkflowTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onRestoreSnapshot: (snap: CanvasSnapshot) => void;
  onDeleteSnapshot: (snapId: string) => void;
  onReturnCanvas: () => void;
}) {
  const templates = allTemplates(doc, getLanguage());
  const shownTemplates = templates.filter((tpl) =>
    tab === "patterns" ? tpl.builtin : !tpl.builtin,
  );
  const snapshots = doc.snapshots ?? [];

  return (
    <div className="fs-surface">
      <div className="surface-page">
        <header className="surface-page-header">
          <span className="eyebrow">FLOWSPACE · STUDIO</span>
          <h1>{t("workflowLibrary")}</h1>
          <p>{t("libraryDescription")}</p>
        </header>

        <div className="surface-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "patterns"}
            className={tab === "patterns" ? "selected" : ""}
            onClick={() => onTabChange("patterns")}
          >
            {t("builtIn")}
            <span>{templates.filter((x) => x.builtin).length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mine"}
            className={tab === "mine" ? "selected" : ""}
            onClick={() => onTabChange("mine")}
          >
            {t("mine")}
            <span>{(doc.templates ?? []).length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "snapshots"}
            className={tab === "snapshots" ? "selected" : ""}
            onClick={() => onTabChange("snapshots")}
          >
            {t("snapshots")}
            <span>{snapshots.length}</span>
          </button>
        </div>

        <div className="template-list">
          {tab !== "snapshots" ? (
            shownTemplates.length ? (
              shownTemplates.map((tpl, idx) => {
                const contCount = tpl.edges.filter(
                  (e) => e.kind === "continuation",
                ).length;
                const badges = templateCapabilityBadges(tpl);
                return (
                  <article
                    key={tpl.id}
                    className="template-card"
                    style={{ ["--i" as string]: idx }}
                  >
                    <div className="template-graph">
                      <MiniGraph nodes={tpl.nodes} edges={tpl.edges} />
                    </div>
                    <div className="template-text">
                      <h3 className={tpl.builtin ? "" : "user-content"}>
                        {tpl.builtin ? t(tpl.title) : tpl.title}
                      </h3>
                      <p>
                        {tpl.builtin
                          ? t(tpl.description)
                          : tpl.description || t("libraryDescription")}
                      </p>
                      <div className="template-meta">
                        <span>
                          {t("nodesCount", { count: tpl.nodes.length })}
                        </span>
                        <span>
                          {t("continuation")} {contCount}
                        </span>
                        {badges.map((b, bi) => (
                          <span key={bi} className={b.warn ? "warn" : ""}>
                            {b.label}
                          </span>
                        ))}
                        <span>v{tpl.revision}</span>
                      </div>
                    </div>
                    <div className="template-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => onInstantiate(tpl)}
                      >
                        <Icon name="plus" />
                        <span>{t("useTemplate")}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title={t("previewTemplate")}
                        onClick={() => onPreviewTemplate(tpl)}
                      >
                        <Icon name="eye" />
                      </button>
                      {!tpl.builtin && (
                        <button
                          type="button"
                          className="icon-button danger"
                          title={t("delete")}
                          onClick={() => onDeleteTemplate(tpl.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="surface-empty">
                <Icon name="box" />
                <h3>{t("noTemplates")}</h3>
                <p>{t("noTemplatesDescription")}</p>
                <button
                  type="button"
                  className="button"
                  onClick={onReturnCanvas}
                >
                  <Icon name="canvas" />
                  <span>{t("returnCanvas")}</span>
                </button>
              </div>
            )
          ) : snapshots.length ? (
            snapshots.toReversed().map((snap, idx) => (
              <article
                key={snap.id}
                className="snapshot-card"
                style={{ ["--i" as string]: idx }}
              >
                <div className="template-graph">
                  <MiniGraph
                    nodes={snap.nodes}
                    edges={snap.edges}
                    snapshot={snapshot}
                  />
                </div>
                <div className="template-text">
                  <h3 className="user-content">{snap.title}</h3>
                  <p>{formatDate(snap.createdAt)}</p>
                  <div className="template-meta">
                    <span>
                      {t("nodesCount", {
                        count: snap.nodes.filter((n) => n.kind !== "group")
                          .length,
                      })}
                    </span>
                    {!!snap.summary?.drafts && (
                      <span>
                        {t("snapDrafts", { count: snap.summary.drafts })}
                      </span>
                    )}
                    {!!snap.summary?.stopping && (
                      <span className="bad">
                        {t("snapInterrupted", { count: snap.summary.stopping })}
                      </span>
                    )}
                    {!!snap.summary?.awaiting && (
                      <span className="warn">
                        {t("snapWaiting", { count: snap.summary.awaiting })}
                      </span>
                    )}
                    {!!snap.summary?.queued && (
                      <span className="warn">
                        {t("snapQueued", { count: snap.summary.queued })}
                      </span>
                    )}
                  </div>
                  {!!snap.summary?.recentOutputs?.length && (
                    <ul className="snapshot-recent">
                      {snap.summary.recentOutputs.map((out, i) => (
                        <li key={i}>
                          <Icon name="quote" />
                          <span className="user-content">
                            {out.title}：{out.snippet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="template-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => onRestoreSnapshot(snap)}
                  >
                    <Icon name="undo" />
                    <span>{t("restoreSnapshot")}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    title={t("delete")}
                    onClick={() => onDeleteSnapshot(snap.id)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="surface-empty">
              <Icon name="clock" />
              <h3>{t("noSnapshots")}</h3>
              <p>{t("noSnapshotsDescription")}</p>
              <button type="button" className="button" onClick={onReturnCanvas}>
                <Icon name="canvas" />
                <span>{t("returnCanvas")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Shared Run Summary Builder (used by both ActivitySurface & RunOverviewDock)
   ============================================================ */
function summarizeRunSteps(
  run: FlowspaceRun,
  snapshot: FlowspaceSnapshot | null,
) {
  const participantIds = [
    ...new Set([
      ...run.roots,
      ...run.participants,
      ...run.steps.map((s) => s.nodeId),
    ]),
  ].filter((id) => run.graph.nodes.find((n) => n.id === id)?.kind === "agent");

  const stepItems = participantIds.map((nodeId) => {
    const node = run.graph.nodes.find((n) => n.id === nodeId)!;
    const nodeSteps = run.steps.filter(
      (s) => s.nodeId === nodeId,
    ) as StepWithTelemetry[];
    const latest = nodeSteps.at(-1);
    const gate = run.tokens.find(
      (tk) =>
        !tk.ready &&
        !tk.consumed &&
        !tk.dismissed &&
        run.graph.edges.find((e) => e.id === tk.edgeId)?.target === nodeId,
    ) as TokenWithLoopGate | undefined;
    const gateEdge = gate
      ? run.graph.edges.find((e) => e.id === gate.edgeId)
      : undefined;
    const live = snapshot?.live.find((l) => l.nodeId === nodeId);

    let state = (node.participation as string) === "bypassed" ? "bypassed" : "pending";
    let reason = "";
    if (gate && ["running", "waiting", "paused"].includes(run.state)) {
      state = "waiting";
      reason = gate.loopCapReached
        ? "loopCapGate"
        : gate.boundary
          ? "scopeBoundary"
          : "waitingConfirmation";
    } else if (live?.pendingInput.length && latest && !latest.endedAt) {
      state = "waiting";
      reason = "approvalNeeded";
    } else if (latest) {
      state = latest.state;
    }
    const telemetryLabel = latest ? formatStepTelemetrySummary(latest) : "";
    return { node, state, reason, gate, gateEdge, latest, telemetryLabel };
  });

  const total = Math.max(1, stepItems.length);
  const done = stepItems.filter(
    (s) => s.state === "completed" || s.state === "bypassed",
  ).length;
  const blocker = stepItems.find((s) => s.state === "waiting");
  const active = stepItems.find((s) => ["running", "queued"].includes(s.state));
  return { stepItems, total, done, blocker, active };
}

/* ============================================================
   RunOverviewDock: High-Density R5 Single-Launch Overview for Bottom Canvas Dock
   ============================================================ */
export interface RunOverviewDockProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge?: CanvasBridge;
  tab?: "runs" | "outputs" | "waiting";
  onRevealNode: (nodeId: string) => void;
  onRunCommand: (runId: string, action: "pause" | "resume" | "cancel") => void;
  onRerunFailed: (runId: string) => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
  onExtendLoop?: (runId: string, edgeId: string, nodeId?: string) => void;
  onExtractStep: (nodeId: string, text: string, seq?: number) => void;
  onPinDeliverable: (path: string, nodeId: string) => void;
}

export function RunOverviewDock({
  doc,
  snapshot,
  bridge,
  tab = "runs",
  onRevealNode,
  onRunCommand,
  onRerunFailed,
  onReleaseToken,
  onExtendLoop,
  onExtractStep,
  onPinDeliverable,
}: RunOverviewDockProps) {
  const runs = (snapshot?.runs ?? []).toReversed();

  const handleLoopExtend = (runId: string, edgeId: string, nodeId?: string) => {
    if (onExtendLoop) {
      onExtendLoop(runId, edgeId, nodeId);
      return;
    }
    const ext = (bridge as ExtendedBridge | undefined)?.extendLoop;
    if (ext) {
      void ext.call(bridge, { runId, edgeId, nodeId, extraRounds: 1 });
    }
  };

  if (tab === "outputs") {
    const completedOutputs = runs.flatMap((run) =>
      run.steps
        .filter((s) => s.state === "completed" && Boolean(s.output?.trim()))
        .map((step) => ({
          step: step as StepWithTelemetry,
          nodeTitle:
            run.graph.nodes.find((n) => n.id === step.nodeId)?.title ??
            step.nodeId,
        })),
    );
    if (!completedOutputs.length) {
      return <p className="muted">{t("noOutputs")}</p>;
    }
    return (
      <div className="activity-list fs-run-dock">
        {completedOutputs.map(({ step, nodeTitle }) => (
          <article
            key={step.id}
            className="artifact-row"
            style={{ padding: "8px 12px" }}
          >
            <Icon name="quote" />
            <div>
              <b className="user-content">
                {nodeTitle} · {t("roundBadge", { round: step.iteration })}
              </b>
              <small className="user-content">
                {step.output!.slice(0, 160)}
                {step.output!.length > 160 ? "…" : ""}
              </small>
            </div>
            <button
              type="button"
              className="button"
              onClick={() => onRevealNode(step.nodeId)}
            >
              <Icon name="chev" />
              <span>{t("locate")}</span>
            </button>
            {doc.nodes.some((n) => n.id === step.nodeId) && (
              <button
                type="button"
                className="button"
                onClick={() =>
                  onExtractStep(step.nodeId, step.output!, step.endSeq)
                }
              >
                <Icon name="quote" />
                <span>{t("quoteMessage")}</span>
              </button>
            )}
          </article>
        ))}
      </div>
    );
  }

  if (tab === "waiting") {
    const waitingTokens = (snapshot?.runs ?? [])
      .filter((r) => ["running", "waiting", "paused"].includes(r.state))
      .flatMap((run) =>
        run.tokens
          .filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed)
          .map((token) => {
            const edge = run.graph.edges.find((e) => e.id === token.edgeId);
            return {
              run,
              token: token as TokenWithLoopGate,
              edge,
              targetNode: run.graph.nodes.find((n) => n.id === edge?.target),
            };
          }),
      );
    const pendingApprovals = (snapshot?.live ?? []).filter(
      (l) => l.pendingInput.length > 0,
    );
    if (!waitingTokens.length && !pendingApprovals.length) {
      return <p className="muted">{t("noWaiting")}</p>;
    }
    return (
      <div className="activity-list fs-run-dock">
        {pendingApprovals.map((live) => {
          const node = doc.nodes.find((n) => n.id === live.nodeId);
          if (!node) return null;
          return (
            <article
              key={live.nodeId}
              className="queue-row"
              style={{ padding: "8px 12px" }}
            >
              <Icon name="pause" />
              <div>
                <b className="user-content">{node.title}</b>
                <p>{t("approvalDescription")}</p>
              </div>
              <button
                type="button"
                className="button button-amber"
                onClick={() => onRevealNode(node.id)}
              >
                <Icon name="chat" />
                <span>{t("openApprovalTab")}</span>
              </button>
            </article>
          );
        })}
        {waitingTokens.map(({ run, token, edge, targetNode }) => (
          <article
            key={token.id}
            className="queue-row"
            style={{ padding: "8px 12px" }}
          >
            <Icon name={token.loopCapReached ? "loopPlus" : "pause"} />
            <div>
              <b className="user-content">
                {token.source.title} → {targetNode?.title ?? ""}
              </b>
              <p className="user-content">{token.source.text.slice(0, 140)}</p>
            </div>
            {token.loopCapReached && edge ? (
              <button
                type="button"
                className="button button-amber"
                onClick={() =>
                  handleLoopExtend(run.id, edge.id, targetNode?.id)
                }
              >
                <Icon name="loopPlus" />
                <span>{t("extendLoopOne")}</span>
              </button>
            ) : (
              <button
                type="button"
                className="button button-amber"
                onClick={() => onReleaseToken(run.id, token.id, true)}
              >
                <Icon name="play" />
                <span>{t("release")}</span>
              </button>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => onReleaseToken(run.id, token.id, false)}
            >
              <span>{t("dismiss")}</span>
            </button>
          </article>
        ))}
      </div>
    );
  }

  if (!runs.length) {
    return <p className="muted">{t("noActivityDescription")}</p>;
  }

  return (
    <div className="activity-list fs-run-dock" style={{ gap: 8 }}>
      {runs.map((run) => {
        const { stepItems, done, blocker } = summarizeRunSteps(run, snapshot);
        return (
          <article
            key={run.id}
            className={`run-card run-${run.state}`}
            style={{ padding: 0 }}
          >
            <header
              className="run-head"
              style={{ padding: "8px 12px", gap: 10 }}
            >
              <span className={`status status-${run.state}`}>
                <i />
                {done}/{stepItems.length}
              </span>
              <div className="run-head-title">
                <h3 className="user-content" style={{ fontSize: 13 }}>
                  {run.title}
                </h3>
              </div>
              {blocker && (
                <div
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {blocker.gate ? (
                    blocker.gate.loopCapReached && blocker.gateEdge ? (
                      <button
                        type="button"
                        className="button button-amber"
                        onClick={() =>
                          handleLoopExtend(
                            run.id,
                            blocker.gateEdge!.id,
                            blocker.node.id,
                          )
                        }
                      >
                        <Icon name="loopPlus" />
                        <span>{t("extendLoopOne")}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-amber"
                        onClick={() =>
                          onReleaseToken(run.id, blocker.gate!.id, true)
                        }
                      >
                        <Icon name="play" />
                        <span>{t("release")}</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="button"
                      onClick={() => onRevealNode(blocker.node.id)}
                    >
                      <Icon name="chev" />
                      <span>{t("locate")}</span>
                    </button>
                  )}
                </div>
              )}
              <div className="run-head-actions">
                {["running", "waiting"].includes(run.state) && (
                  <button
                    type="button"
                    className="icon-button"
                    title={t("pause")}
                    onClick={() => onRunCommand(run.id, "pause")}
                  >
                    <Icon name="pause" />
                  </button>
                )}
                {["paused", "interrupted"].includes(run.state) && (
                  <button
                    type="button"
                    className="icon-button"
                    title={t("resume")}
                    onClick={() => onRunCommand(run.id, "resume")}
                  >
                    <Icon name="play" />
                  </button>
                )}
                {run.steps.some((s) =>
                  ["error", "aborted", "interrupted"].includes(s.state),
                ) && (
                  <button
                    type="button"
                    className="button"
                    onClick={() => onRerunFailed(run.id)}
                  >
                    <Icon name="refresh" />
                    <span>{t("rerunFailed")}</span>
                  </button>
                )}
                {!["completed", "cancelled"].includes(run.state) && (
                  <button
                    type="button"
                    className="icon-button danger"
                    title={t("cancelRun")}
                    onClick={() => onRunCommand(run.id, "cancel")}
                  >
                    <Icon name="stop" />
                  </button>
                )}
              </div>
              <time>{formatTime(run.createdAt)}</time>
            </header>

            <div className="run-steps" style={{ padding: "0 12px 8px" }}>
              {stepItems.map((item) => (
                <button
                  key={item.node.id}
                  type="button"
                  className={`run-step step-${item.state}`}
                  style={{ minWidth: 108, padding: "6px 10px 4px 0" }}
                  onClick={() => onRevealNode(item.node.id)}
                >
                  <i />
                  <b className="user-content">{item.node.title}</b>
                  <small>
                    {t(
                      item.reason ||
                        (item.state === "pending" ? "stepPending" : item.state),
                    )}
                    {item.telemetryLabel ? ` · ${item.telemetryLabel}` : ""}
                  </small>
                </button>
              ))}
            </div>

            {!!run.deliverables?.length && (
              <div
                className="fs-run-deliverables"
                style={{ padding: "6px 12px 8px", borderTop: "1px solid var(--border)" }}
              >
                <div className="fs-deliverable-chips">
                  {run.deliverables.map((deliv) => (
                    <button
                      key={deliv.id}
                      type="button"
                      className="capsule capsule-pending"
                      title={deliv.description || deliv.path}
                      onClick={() =>
                        onPinDeliverable(deliv.path, deliv.nodeId)
                      }
                    >
                      <Icon name="file" />
                      <span className="user-content">
                        {deliv.path.split(/[\\/]/).pop() ?? deliv.path}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/* ============================================================
   ActivitySurface: Full-Page R5 Run Cards, Telemetry, Gates & Deliverables
   ============================================================ */
export function ActivitySurface({
  tab,
  onTabChange,
  doc,
  snapshot,
  bridge,
  onRevealNode,
  onRunCommand,
  onRerunFailed,
  onReleaseToken,
  onExtendLoop,
  onExtractStep,
  onPinDeliverable,
  onReturnCanvas,
}: {
  tab: "runs" | "outputs" | "waiting";
  onTabChange: (next: "runs" | "outputs" | "waiting") => void;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge?: CanvasBridge;
  onRevealNode: (nodeId: string) => void;
  onRunCommand: (runId: string, action: "pause" | "resume" | "cancel") => void;
  onRerunFailed: (runId: string) => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
  onExtendLoop?: (runId: string, edgeId: string, nodeId?: string) => void;
  onExtractStep: (nodeId: string, text: string, seq?: number) => void;
  onPinDeliverable: (path: string, nodeId: string) => void;
  onReturnCanvas: () => void;
}) {
  const runs = (snapshot?.runs ?? []).toReversed();
  const circumference = 2 * Math.PI * 17;

  const handleLoopExtend = (runId: string, edgeId: string, nodeId?: string) => {
    if (onExtendLoop) {
      onExtendLoop(runId, edgeId, nodeId);
      return;
    }
    const ext = (bridge as ExtendedBridge | undefined)?.extendLoop;
    if (ext) {
      void ext.call(bridge, { runId, edgeId, nodeId, extraRounds: 1 });
    }
  };

  const waitingTokens = (snapshot?.runs ?? [])
    .filter((r) => ["running", "waiting", "paused"].includes(r.state))
    .flatMap((run) =>
      run.tokens
        .filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed)
        .map((token) => {
          const edge = run.graph.edges.find((e) => e.id === token.edgeId);
          return {
            run,
            token: token as TokenWithLoopGate,
            edge,
            targetNode: run.graph.nodes.find((n) => n.id === edge?.target),
          };
        }),
    );
  const pendingApprovals = (snapshot?.live ?? []).filter(
    (l) => l.pendingInput.length > 0,
  );
  const completedOutputs = runs.flatMap((run) =>
    run.steps
      .filter((s) => s.state === "completed" && s.output?.trim())
      .map((step) => ({
        run,
        step: step as StepWithTelemetry,
        nodeTitle:
          run.graph.nodes.find((n) => n.id === step.nodeId)?.title ??
          step.nodeId,
      })),
  );

  return (
    <div className="fs-surface">
      <div className="surface-page">
        <header className="surface-page-header">
          <span className="eyebrow">FLOWSPACE · EXECUTION</span>
          <h1>{t("activity")}</h1>
          <p>{t("activityDescription")}</p>
        </header>

        <div className="surface-tabs" role="tablist">
          <button
            type="button"
            className={tab === "runs" ? "selected" : ""}
            onClick={() => onTabChange("runs")}
          >
            {t("allRuns")}
            <span>{runs.length}</span>
          </button>
          <button
            type="button"
            className={tab === "outputs" ? "selected" : ""}
            onClick={() => onTabChange("outputs")}
          >
            {t("outputsTab")}
            <span>{completedOutputs.length}</span>
          </button>
          <button
            type="button"
            className={tab === "waiting" ? "selected" : ""}
            onClick={() => onTabChange("waiting")}
          >
            {t("waitingTab")}
            <span>{waitingTokens.length + pendingApprovals.length}</span>
          </button>
        </div>

        <div className="activity-list">
          {tab === "runs" ? (
            runs.length ? (
              runs.map((run, idx) => {
                const { stepItems, total, done, blocker, active } =
                  summarizeRunSteps(run, snapshot);
                const originLabel =
                  run.origin === "chat"
                    ? t("runTypeChat")
                    : run.scope
                      ? t("runTypeGroup")
                      : t("runTypeGlobal");

                return (
                  <article
                    key={run.id}
                    className={`run-card run-${run.state}`}
                    style={{ ["--i" as string]: Math.min(idx, 6) }}
                  >
                    <header className="run-head">
                      <div className="run-ring-wrap">
                        <svg className="run-ring" viewBox="0 0 42 42">
                          <circle
                            className="ring-track"
                            cx="21"
                            cy="21"
                            r="17"
                          />
                          <circle
                            className="ring-value"
                            cx="21"
                            cy="21"
                            r="17"
                            strokeDasharray={circumference}
                            strokeDashoffset={
                              circumference * (1 - done / total)
                            }
                          />
                        </svg>
                        <b>
                          {done}/{stepItems.length}
                        </b>
                      </div>
                      <div className="run-head-title">
                        <h3 className="user-content">{run.title}</h3>
                        <p>
                          {originLabel} ·{" "}
                          {t("stepsDone", { done, total: stepItems.length })}
                        </p>
                      </div>
                      <span className={`status status-${run.state}`}>
                        <i />
                        {t(run.state)}
                      </span>
                      <time>{formatTime(run.createdAt)}</time>
                      <div className="run-head-actions">
                        {["running", "waiting"].includes(run.state) && (
                          <button
                            type="button"
                            className="icon-button"
                            title={t("pause")}
                            onClick={() => onRunCommand(run.id, "pause")}
                          >
                            <Icon name="pause" />
                          </button>
                        )}
                        {["paused", "interrupted"].includes(run.state) && (
                          <button
                            type="button"
                            className="button"
                            onClick={() => onRunCommand(run.id, "resume")}
                          >
                            <Icon name="play" />
                            <span>{t("resume")}</span>
                          </button>
                        )}
                        {run.steps.some((s) =>
                          ["error", "aborted", "interrupted"].includes(s.state),
                        ) && (
                          <button
                            type="button"
                            className="button"
                            onClick={() => onRerunFailed(run.id)}
                          >
                            <Icon name="refresh" />
                            <span>{t("rerunFailed")}</span>
                          </button>
                        )}
                        {!["completed", "cancelled"].includes(run.state) && (
                          <button
                            type="button"
                            className="icon-button danger"
                            title={t("cancelRun")}
                            onClick={() => onRunCommand(run.id, "cancel")}
                          >
                            <Icon name="stop" />
                          </button>
                        )}
                      </div>
                    </header>

                    <div className="run-steps">
                      {stepItems.map((item) => (
                        <button
                          key={item.node.id}
                          type="button"
                          className={`run-step step-${item.state}`}
                          onClick={() => onRevealNode(item.node.id)}
                        >
                          <i />
                          <b className="user-content">{item.node.title}</b>
                          <small>
                            {t(
                              item.reason ||
                                (item.state === "pending"
                                  ? "stepPending"
                                  : item.state),
                            )}
                            {item.telemetryLabel
                              ? ` · ${item.telemetryLabel}`
                              : ""}
                          </small>
                        </button>
                      ))}
                    </div>

                    <div className="run-foot">
                      {blocker ? (
                        <div className="run-blocker">
                          <Icon
                            name={
                              blocker.gate?.loopCapReached
                                ? "loopPlus"
                                : "pause"
                            }
                          />
                          <span>
                            {t("runBlockedBy", {
                              name: blocker.node.title,
                              reason: t(blocker.reason || "waiting"),
                            })}
                          </span>
                          {blocker.gate ? (
                            blocker.gate.loopCapReached && blocker.gateEdge ? (
                              <button
                                type="button"
                                className="button button-amber"
                                onClick={() =>
                                  handleLoopExtend(
                                    run.id,
                                    blocker.gateEdge!.id,
                                    blocker.node.id,
                                  )
                                }
                              >
                                <Icon name="loopPlus" />
                                <span>{t("extendLoopOne")}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="button button-amber"
                                onClick={() =>
                                  onReleaseToken(run.id, blocker.gate!.id, true)
                                }
                              >
                                <Icon name="play" />
                                <span>{t("release")}</span>
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              className="button"
                              onClick={() => onRevealNode(blocker.node.id)}
                            >
                              <Icon name="chev" />
                              <span>{t("locate")}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="run-next">
                          {run.state === "completed"
                            ? t("runAllDone")
                            : active
                              ? t("runNextStep", { name: active.node.title })
                              : run.notes.at(-1) || t(run.state)}
                        </div>
                      )}
                    </div>

                    {!!run.deliverables?.length && (
                      <div className="fs-run-deliverables">
                        <span className="eyebrow">
                          {t("deliverablesTitle")} ({run.deliverables.length})
                        </span>
                        <div className="fs-deliverable-chips">
                          {run.deliverables.map((deliv) => (
                            <button
                              key={deliv.id}
                              type="button"
                              className="capsule capsule-pending"
                              title={deliv.description || deliv.path}
                              onClick={() =>
                                onPinDeliverable(deliv.path, deliv.nodeId)
                              }
                            >
                              <Icon name="file" />
                              <span className="user-content">
                                {deliv.path.split(/[\\/]/).pop() ?? deliv.path}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <details
                      className="run-timeline"
                      open={["waiting", "error", "interrupted"].includes(
                        run.state,
                      )}
                    >
                      <summary>
                        <Icon name="chev" />
                        {t("runTimeline", { count: run.steps.length })}
                      </summary>
                      <div>
                        {(run.steps as StepWithTelemetry[])
                          .toReversed()
                          .map((step) => {
                            const stepTitle =
                              run.graph.nodes.find((n) => n.id === step.nodeId)
                                ?.title ?? step.nodeId;
                            const telem = formatStepTelemetrySummary(step);
                            return (
                              <div
                                key={step.id}
                                className={`event-row event-${step.state}`}
                              >
                                <i className="event-dot">
                                  <Icon
                                    name={
                                      step.state === "completed"
                                        ? "check"
                                        : step.state === "queued"
                                          ? "clock"
                                          : "bolt"
                                    }
                                  />
                                </i>
                                <div>
                                  <b>{t(step.state)}</b>
                                  <button
                                    type="button"
                                    className="event-agent user-content"
                                    onClick={() => onRevealNode(step.nodeId)}
                                  >
                                    {stepTitle} ·{" "}
                                    {t("roundBadge", { round: step.iteration })}
                                    {telem ? ` · ${telem}` : ""}
                                  </button>
                                  {step.error && (
                                    <p className="danger">{step.error}</p>
                                  )}
                                  {step.output && (
                                    <p className="user-content">
                                      {step.output.slice(0, 220)}
                                      {step.output.length > 220 ? "…" : ""}
                                    </p>
                                  )}
                                </div>
                                {step.output &&
                                  doc.nodes.some(
                                    (n) => n.id === step.nodeId,
                                  ) && (
                                    <button
                                      type="button"
                                      className="text-button"
                                      onClick={() =>
                                        onExtractStep(
                                          step.nodeId,
                                          step.output!,
                                          step.endSeq,
                                        )
                                      }
                                    >
                                      <Icon name="quote" />
                                    </button>
                                  )}
                                <time>{formatTime(step.createdAt)}</time>
                              </div>
                            );
                          })}
                        {run.notes.map((note, i) => (
                          <p key={i} className="muted">
                            {note}
                          </p>
                        ))}
                      </div>
                    </details>
                  </article>
                );
              })
            ) : (
              <div className="surface-empty">
                <Icon name="bolt" />
                <h3>{t("noActivity")}</h3>
                <p>{t("noActivityDescription")}</p>
                <button
                  type="button"
                  className="button"
                  onClick={onReturnCanvas}
                >
                  <Icon name="canvas" />
                  <span>{t("returnCanvas")}</span>
                </button>
              </div>
            )
          ) : tab === "outputs" ? (
            completedOutputs.length ? (
              completedOutputs.map(({ step, nodeTitle }) => (
                <article key={step.id} className="artifact-row">
                  <Icon name="quote" />
                  <div>
                    <b className="user-content">
                      {nodeTitle} · {t("roundBadge", { round: step.iteration })}
                    </b>
                    <small className="user-content">
                      {step.output!.slice(0, 200)}
                      {step.output!.length > 200 ? "…" : ""}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="button"
                    onClick={() => onRevealNode(step.nodeId)}
                  >
                    <Icon name="chev" />
                    <span>{t("locate")}</span>
                  </button>
                  {doc.nodes.some((n) => n.id === step.nodeId) && (
                    <button
                      type="button"
                      className="button"
                      onClick={() =>
                        onExtractStep(step.nodeId, step.output!, step.endSeq)
                      }
                    >
                      <Icon name="quote" />
                      <span>{t("quoteMessage")}</span>
                    </button>
                  )}
                </article>
              ))
            ) : (
              <div className="surface-empty">
                <Icon name="quote" />
                <h3>{t("noOutputs")}</h3>
                <p>{t("noActivityDescription")}</p>
              </div>
            )
          ) : waitingTokens.length || pendingApprovals.length ? (
            <>
              {pendingApprovals.map((live) => {
                const node = doc.nodes.find((n) => n.id === live.nodeId);
                if (!node) return null;
                return (
                  <article key={live.nodeId} className="queue-row">
                    <Icon name="pause" />
                    <div>
                      <b className="user-content">{node.title}</b>
                      <p>{t("approvalDescription")}</p>
                    </div>
                    <button
                      type="button"
                      className="button button-amber"
                      onClick={() => onRevealNode(node.id)}
                    >
                      <Icon name="chat" />
                      <span>{t("openApprovalTab")}</span>
                    </button>
                  </article>
                );
              })}
              {waitingTokens.map(({ run, token, edge, targetNode }) => (
                <article key={token.id} className="queue-row">
                  <Icon name={token.loopCapReached ? "loopPlus" : "pause"} />
                  <div>
                    <b className="user-content">
                      {token.source.title} → {targetNode?.title ?? ""}
                    </b>
                    <p className="user-content">
                      {token.source.text.slice(0, 160)}
                    </p>
                  </div>
                  {token.loopCapReached && edge ? (
                    <button
                      type="button"
                      className="button button-amber"
                      onClick={() =>
                        handleLoopExtend(run.id, edge.id, targetNode?.id)
                      }
                    >
                      <Icon name="loopPlus" />
                      <span>{t("extendLoopOne")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button-amber"
                      onClick={() => onReleaseToken(run.id, token.id, true)}
                    >
                      <Icon name="play" />
                      <span>{t("release")}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onReleaseToken(run.id, token.id, false)}
                  >
                    <span>{t("dismiss")}</span>
                  </button>
                </article>
              ))}
            </>
          ) : (
            <div className="surface-empty">
              <Icon name="check" />
              <h3>{t("noWaiting")}</h3>
              <p>{t("noActivityDescription")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SettingsSurface: Preferences, Orchestration & Data Portability
   ============================================================ */
export function SettingsSurface({
  doc,
  prefs,
  onUpdatePrefs,
  onUpdateSettings,
  onToggleLanguage,
  onExportJson,
  onTriggerImport,
  onOpenExistingSessions,
  onLoadStarter,
}: {
  doc: FlowspaceDocument;
  prefs: Required<Pick<CanvasPrefs, "theme" | "wheel" | "snap" | "filter">>;
  onUpdatePrefs: (changes: Partial<CanvasPrefs>) => void;
  onUpdateSettings: (changes: Partial<FlowspaceDocument["settings"]>) => void;
  onToggleLanguage: (lang: "zh" | "en") => void;
  onExportJson: () => void;
  onTriggerImport: () => void;
  onOpenExistingSessions: () => void;
  onLoadStarter: () => void;
}) {
  const lang = getLanguage();
  return (
    <div className="fs-surface">
      <div className="surface-page settings-page">
        <header className="surface-page-header">
          <span className="eyebrow">FLOWSPACE · PREFERENCES</span>
          <h1>{t("settings")}</h1>
        </header>

        <section className="settings-section">
          <h2>{t("appearance")}</h2>
          <div className="setting-row">
            <b>{t("theme")}</b>
            <div className="choice-buttons">
              {(
                [
                  ["auto", "followHost"],
                  ["dark", "dark"],
                  ["light", "light"],
                ] as const
              ).map(([val, labelKey]) => (
                <button
                  key={val}
                  type="button"
                  className={prefs.theme === val ? "selected" : ""}
                  onClick={() => onUpdatePrefs({ theme: val })}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <b>{t("language")}</b>
            <div className="choice-buttons">
              <button
                type="button"
                className={lang === "zh" ? "selected" : ""}
                onClick={() => onToggleLanguage("zh")}
              >
                {t("chinese")}
              </button>
              <button
                type="button"
                className={lang === "en" ? "selected" : ""}
                onClick={() => onToggleLanguage("en")}
              >
                {t("english")}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>{t("interaction")}</h2>
          <div className="setting-row">
            <b>{t("wheelBehavior")}</b>
            <div className="choice-buttons">
              <button
                type="button"
                className={prefs.wheel === "zoom" ? "selected" : ""}
                onClick={() => onUpdatePrefs({ wheel: "zoom" })}
              >
                {t("zoom")}
              </button>
              <button
                type="button"
                className={prefs.wheel === "pan" ? "selected" : ""}
                onClick={() => onUpdatePrefs({ wheel: "pan" })}
              >
                {t("pan")}
              </button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <b>{t("snapGrid")}</b>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.snap}
              className="switch"
              onClick={() => onUpdatePrefs({ snap: !prefs.snap })}
            />
          </div>
          <div className="setting-row">
            <div>
              <b>{t("reducedMotion")}</b>
              <p>{t("reducedMotionDescription")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={doc.settings.reducedMotion}
              className="switch"
              onClick={() =>
                onUpdateSettings({
                  reducedMotion: !doc.settings.reducedMotion,
                })
              }
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>{t("orchestration")}</h2>
          <div className="setting-row">
            <div>
              <b>{t("nativeChatTriggers")}</b>
              <p>{t("nativeChatTriggersDescription")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={doc.settings.nativeChatTriggers}
              className="switch"
              onClick={() =>
                onUpdateSettings({
                  nativeChatTriggers: !doc.settings.nativeChatTriggers,
                })
              }
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>{t("data")}</h2>
          <div className="setting-row">
            <b>{t("exportCanvas")}</b>
            <button type="button" className="button" onClick={onExportJson}>
              <Icon name="download" />
              <span>{t("download")}</span>
            </button>
          </div>
          <div className="setting-row">
            <b>{t("importCanvas")}</b>
            <button type="button" className="button" onClick={onTriggerImport}>
              <Icon name="upload" />
              <span>{t("import")}</span>
            </button>
          </div>
          <div className="setting-row">
            <b>{t("existingSession")}</b>
            <button
              type="button"
              className="button"
              onClick={onOpenExistingSessions}
            >
              <Icon name="chat" />
              <span>{t("existingSession")}</span>
            </button>
          </div>
          <div className="setting-row">
            <div>
              <b>{t("loadStarter")}</b>
              <p>{t("loadStarterDescription")}</p>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={onLoadStarter}
            >
              <Icon name="plus" />
              <span>{t("useTemplate")}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
