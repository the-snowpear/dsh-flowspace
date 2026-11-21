import { useState } from "react";
import { normalizeBoardColumns } from "../../core/board.ts";
import { containerPermission } from "../../core/containers.ts";
import type { ContainerEntry, FlowEdge, FlowNode, FlowspaceDocument, FlowspaceSnapshot } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { Icon } from "../icons.tsx";
import { t } from "../i18n.ts";
import { TeamAvatar } from "../TeamControls.tsx";

type Edit = (id: string, patch: Partial<FlowEdge>) => void;

export function PermissionSettings({ edge, source, edit }: { edge: FlowEdge; source: FlowNode; edit: Edit }) {
  const permission = containerPermission(source, edge);
  if (edge.snapshotText !== undefined || edge.snapshotContent) return null;
  const permissions = source.kind === "board" ? ["read", "advance", "edit"] as const : ["read", "edit"] as const;
  return <>
    <span className="field-label">{t("flow_permission")}</span>
    <div className="choice-buttons">
      {permissions.map(value => <button key={value} type="button" className={value === permission ? "selected" : ""}
        aria-pressed={value === permission} onClick={() => edit(edge.id, {
          permission: value, ...(value === "read" ? { ask: false } : {}),
        })}>{t(`flow_permission_${value}`)}</button>)}
    </div>
    <label className="switch-row">
      <span>{t("flow_permission_ask")}</span>
      <button type="button" role="switch" aria-checked={!!edge.ask} aria-label={t("flow_permission_ask")} className="switch"
        disabled={permission === "read"} onClick={() => edit(edge.id, { ask: !edge.ask })} />
    </label>
  </>;
}

export function DeliverySettings({ edge, target, edit }: { edge: FlowEdge; target: FlowNode; edit: Edit }) {
  if (target.kind !== "board") return <p className="inspector-description">{t("flow_delivery_replace")}</p>;
  const delivery = edge.delivery ?? { mode: "lines" as const };
  return <>
    <label className="field-label">
      {t("flow_delivery")}
      <select className="select-field" value={delivery.mode} onChange={event => edit(edge.id, {
        delivery: { ...delivery, mode: event.target.value as typeof delivery.mode },
      })}>
        {(["lines", "paragraph", "list"] as const).map(mode =>
          <option key={mode} value={mode}>{t(`flow_delivery_${mode}`)}</option>)}
      </select>
    </label>
    <label className="field-label">
      {t("boardCardColumn")}
      <select className="select-field" value={delivery.columnId ?? ""} onChange={event => edit(edge.id, {
        delivery: { ...delivery, columnId: event.target.value || undefined },
      })}>
        <option value="">{t("flow_delivery_first_column")}</option>
        {normalizeBoardColumns(target.columns).map(column => <option key={column.id} value={column.id}>{column.name}</option>)}
      </select>
    </label>
  </>;
}

const summary = (entry: ContainerEntry | null) => !entry ? "∅" : entry.kind === "board"
  ? `${entry.columnId} · ${entry.card.text}` : entry.text;

export function ContainerHistory({ nodeId, doc, snapshot, bridge }: {
  nodeId: string; doc: FlowspaceDocument; snapshot?: FlowspaceSnapshot | null; bridge?: CanvasBridge;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string>();
  const changes = snapshot?.containerChanges?.filter(change => change.nodeId === nodeId).toReversed() ?? [];
  if (!changes.length) return null;
  return <details className="fs-var-changes">
    <summary>{t("flow_agent_changes")} · {changes.length}</summary>
    <div className="node-scroll">
      {changes.map(change => {
        const writer = doc.nodes.find(node => node.sessionId === change.sessionId && change.sessionId)?.title ??
          doc.nodes.find(node => node.id === change.by)?.title ?? (change.sessionId ? t("nodeKind_agent") : change.by);
        return <div key={change.id} className="fs-var-change">
          {change.sessionId && <TeamAvatar size="xs" label={writer} seed={change.by} />}
          <span className="fs-var-change-copy" title={`${summary(change.before)} → ${summary(change.after)}`}>
            <small>{new Date(change.at).toLocaleTimeString()} · {writer}</small>
            <span>{summary(change.before)} → {summary(change.after)}</span>
          </span>
          {change.revertedBy ? <Icon name="check" /> : bridge && !change.id.startsWith("undo:") &&
            <button type="button" className="text-button" disabled={busy !== undefined} onClick={() => {
              setBusy(change.id);
              setError("");
              void bridge.revertContainerChange(change.id).catch(error => setError(String(error))).finally(() => setBusy(undefined));
            }}>{t("flow_change_revert")}</button>}
        </div>;
      })}
    </div>
    {error && <p role="alert" className="muted">{error}</p>}
  </details>;
}
