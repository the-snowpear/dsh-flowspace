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
  WorkflowTemplate,
  WorkspaceBrief,
} from "../types.ts";
import { Icon, kindIconName } from "./icons.tsx";
import { getLanguage, t } from "./i18n.ts";
import { inferGroupPorts, nodeBox } from "./geometry.ts";
import { allTemplates } from "./templates.ts";

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
  const lastStep = snapshot?.runs
    .flatMap((r) => r.steps)
    .filter((s) => s.nodeId === nodeId)
    .at(-1);
  if (lastStep) return lastStep.state;
  const node = snapshot?.document.nodes.find((n) => n.id === nodeId);
  return node?.sessionId ? "completed" : "draft";
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
    shown.map((n) => [n.id, nodeBox({ ...n, window: null }, false)]),
  );
  const all = [...boxes.values()];
  const pad = 44;
  const left = Math.min(...all.map((b) => b.x)) - pad;
  const top = Math.min(...all.map((b) => b.y)) - pad;
  const width = Math.max(...all.map((b) => b.x + b.w)) + pad - left;
  const height = Math.max(...all.map((b) => b.y + b.h)) + pad - top;

  const renderWire = (edge: FlowEdge) => {
    const a = boxes.get(edge.source),
      b = boxes.get(edge.target);
    if (!a || !b) return null;
    const ax = a.x + a.w - left,
      ay = a.y - top + Math.min(28, a.h / 2),
      bx = b.x - left,
      by = b.y - top + Math.min(28, b.h / 2),
      reach = Math.max(40, Math.abs(bx - ax) * 0.45);
    const cls =
      edge.kind === "reference"
        ? "mg-ref"
        : `mg-flow ${edge.trigger === "confirm" ? "mg-confirm" : ""}`;
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

export interface InspectorProps {
  open: boolean;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  workspaces: WorkspaceBrief[];
  selectedNode?: FlowNode;
  selectedEdge?: FlowEdge;
  onClose: () => void;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onEditEdge: (id: string, changes: Partial<FlowEdge>) => void;
  onDeleteSelection: () => void;
  onUngroup: (groupId: string) => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
  onOpenNativeChat: (sessionId: string) => void;
  onOpenDetail: (nodeId: string) => void;
  onOpenWindow: (nodeId: string) => void;
  onSetGroupPorts: (groupId: string, ports: GroupPort[]) => void;
  onOpenMergePorts: (groupId: string) => void;
  onSaveTemplate: (groupId: string) => void;
  onSyncTemplate: (groupId: string) => void;
  onDetachTemplate: (groupId: string) => void;
}

export function InspectorPanel({
  open,
  doc,
  snapshot,
  workspaces,
  selectedNode,
  selectedEdge,
  onClose,
  onEditNode,
  onEditEdge,
  onDeleteSelection,
  onUngroup,
  onReleaseToken,
  onOpenNativeChat,
  onOpenDetail,
  onOpenWindow,
  onSetGroupPorts,
  onOpenMergePorts,
  onSaveTemplate,
  onSyncTemplate,
  onDetachTemplate,
}: InspectorProps) {
  const titleOf = (id: string) =>
    doc.nodes.find((n) => n.id === id)?.title ?? id;

  const renderBody = () => {
    if (selectedEdge) {
      const targetNode = doc.nodes.find((n) => n.id === selectedEdge.target);
      const waitingTokens: { run: FlowspaceRun; token: FlowToken }[] =
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
              .map((token) => ({ run, token })),
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
                    ["conclusion", "at"],
                    ["session", "clock"],
                    ["fork", "branch"],
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
                    {t(
                      selectedEdge.always
                        ? "always"
                        : selectedEdge.sentVersion
                          ? "sent"
                          : "pending",
                    )}
                  </small>
                </div>
              </div>
            </>
          )}

          {waitingTokens.map(({ run, token }) => (
            <div className="approval-box" key={token.id}>
              <span className="approval-heading">
                <Icon name="pause" />
                <b>
                  {t(token.boundary ? "scopeBoundary" : "waitingConfirmation")}
                </b>
              </span>
              <div className="approval-snippet user-content">
                {token.source.text.slice(0, 320) || token.source.title}
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-amber"
                  onClick={() => onReleaseToken(run.id, token.id, true)}
                >
                  <Icon name="play" />
                  <span>{t("release")}</span>
                </button>
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
            {(["violet", "teal", "blue", "amber"] as GroupColor[]).map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(color)}
                  className={`color-${color} ${(selectedNode.color ?? "violet") === color ? "selected" : ""}`}
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

    if (selectedNode) {
      const state = nodeStatusOf(snapshot, selectedNode.id);
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
              onEditNode(selectedNode.id, { title: e.target.value })
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
                  ] as const
                ).map(([val, labelKey]) => (
                  <button
                    key={val}
                    type="button"
                    className={
                      selectedNode.participation === val ? "selected" : ""
                    }
                    onClick={() =>
                      onEditNode(selectedNode.id, { participation: val })
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
  const templates = allTemplates(doc);
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
                const hasConfirm = tpl.edges.some(
                  (e) => e.trigger === "confirm",
                );
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
                        {hasConfirm && (
                          <span className="warn">{t("confirm")}</span>
                        )}
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
            snapshots.map((snap, idx) => (
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

export function ActivitySurface({
  tab,
  onTabChange,
  doc,
  snapshot,
  onRevealNode,
  onRunCommand,
  onReleaseToken,
  onExtractStep,
  onReturnCanvas,
}: {
  tab: "runs" | "outputs" | "waiting";
  onTabChange: (next: "runs" | "outputs" | "waiting") => void;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  onRevealNode: (nodeId: string) => void;
  onRunCommand: (runId: string, action: "pause" | "resume" | "cancel") => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
  onExtractStep: (nodeId: string, text: string, seq?: number) => void;
  onReturnCanvas: () => void;
}) {
  const runs = [...(snapshot?.runs ?? [])].reverse();
  const circumference = 2 * Math.PI * 17;

  const waitingTokens = (snapshot?.runs ?? [])
    .filter((r) => ["running", "waiting", "paused"].includes(r.state))
    .flatMap((run) =>
      run.tokens
        .filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed)
        .map((token) => ({
          run,
          token,
          targetNode: run.graph.nodes.find(
            (n) =>
              n.id ===
              run.graph.edges.find((e) => e.id === token.edgeId)?.target,
          ),
        })),
    );
  const pendingApprovals = (snapshot?.live ?? []).filter(
    (l) => l.pendingInput.length > 0,
  );
  const completedOutputs = runs.flatMap((run) =>
    run.steps
      .filter((s) => s.state === "completed" && s.output?.trim())
      .map((step) => ({
        run,
        step,
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
                const participantIds = [
                  ...new Set([
                    ...run.roots,
                    ...run.participants,
                    ...run.steps.map((s) => s.nodeId),
                  ]),
                ].filter(
                  (id) =>
                    run.graph.nodes.find((n) => n.id === id)?.kind === "agent",
                );
                const stepItems = participantIds.map((nodeId) => {
                  const node = run.graph.nodes.find((n) => n.id === nodeId)!;
                  const nodeSteps = run.steps.filter(
                    (s) => s.nodeId === nodeId,
                  );
                  const latest = nodeSteps.at(-1);
                  const gate = run.tokens.find(
                    (tk) =>
                      !tk.ready &&
                      !tk.consumed &&
                      !tk.dismissed &&
                      run.graph.edges.find((e) => e.id === tk.edgeId)
                        ?.target === nodeId,
                  );
                  const live = snapshot?.live.find((l) => l.nodeId === nodeId);
                  let state = "pending";
                  let reason = "";
                  if (gate && ["running", "waiting", "paused"].includes(run.state)) {
                    state = "waiting";
                    reason = gate.boundary
                      ? "scopeBoundary"
                      : "waitingConfirmation";
                  } else if (live?.pendingInput.length && latest && !latest.endedAt) {
                    state = "waiting";
                    reason = "approvalNeeded";
                  } else if (latest) {
                    state = latest.state;
                  }
                  return { node, state, reason, gate };
                });

                const total = Math.max(1, stepItems.length);
                const done = stepItems.filter(
                  (s) => s.state === "completed",
                ).length;
                const blocker = stepItems.find((s) => s.state === "waiting");
                const active = stepItems.find((s) =>
                  ["running", "queued"].includes(s.state),
                );
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
                          </small>
                        </button>
                      ))}
                    </div>

                    <div className="run-foot">
                      {blocker ? (
                        <div className="run-blocker">
                          <Icon name="pause" />
                          <span>
                            {t("runBlockedBy", {
                              name: blocker.node.title,
                              reason: t(blocker.reason || "waiting"),
                            })}
                          </span>
                          {blocker.gate ? (
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
                        {[...run.steps].reverse().map((step) => {
                          const stepTitle =
                            run.graph.nodes.find((n) => n.id === step.nodeId)
                              ?.title ?? step.nodeId;
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
                                doc.nodes.some((n) => n.id === step.nodeId) && (
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
              {waitingTokens.map(({ run, token, targetNode }) => (
                <article key={token.id} className="queue-row">
                  <Icon name="pause" />
                  <div>
                    <b className="user-content">
                      {token.source.title} → {targetNode?.title ?? ""}
                    </b>
                    <p className="user-content">
                      {token.source.text.slice(0, 160)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-amber"
                    onClick={() => onReleaseToken(run.id, token.id, true)}
                  >
                    <Icon name="play" />
                    <span>{t("release")}</span>
                  </button>
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
  prefs: Required<
    Pick<CanvasPrefs, "theme" | "wheel" | "snap" | "filter">
  >;
  onUpdatePrefs: (changes: Partial<CanvasPrefs>) => void;
  onUpdateSettings: (
    changes: Partial<FlowspaceDocument["settings"]>,
  ) => void;
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
