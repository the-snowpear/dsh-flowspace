import { useState } from "react";
import type { FlowNode, FlowspaceSnapshot, JsonValue, VariableRecord } from "../../types.ts";
import { variableValue } from "../../core/nodes/variables.ts";
import type { CanvasBridge } from "../bridge.ts";
import { t } from "../i18n.ts";
import type { NodeViewProps } from "./index.ts";
import { FlowShell } from "./judge/JudgeView.tsx";

const textOf = (value: JsonValue) => typeof value === "string" ? value : JSON.stringify(value);
const latest = (snapshot: FlowspaceSnapshot | null, node: FlowNode, runId?: string) => {
  const definitions = snapshot?.variables?.filter(variable => variable.id === node.id) ?? [];
  const scoped = definitions.filter(variable => variable.runId && (!runId || variable.runId === runId));
  return scoped.toSorted((a, b) => (b.history.at(-1)?.at ?? 0) - (a.history.at(-1)?.at ?? 0))[0] ?? definitions[0];
};

export function VariableCompact({ node, run, snapshot }: NodeViewProps) {
  const variable = latest(snapshot, node, run?.id);
  const name = String(node.config?.name || node.title);
  return <span className="compact-overview-detail fs-var-mono">{variable
    ? `${name} = ${textOf(variable.value)} · v${variable.version}` : `${name} = ${String(node.config?.initial ?? "")}`}</span>;
}

function WriteControls({ variable, bridge, reset = true }: { variable: VariableRecord; bridge: CanvasBridge; reset?: boolean }) {
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = async (input?: string) => {
    setBusy(true);
    setError("");
    try {
      await bridge.writeVariable({ id: variable.id, runId: variable.runId, lane: variable.lane,
        expectedVersion: variable.version, ...(input === undefined ? {} : { value: variableValue(variable.type, input) }) });
      setDraft(undefined);
    } catch (failure) { setError(String(failure)); }
    finally { setBusy(false); }
  };
  return <>
    <div className="button-row">
      {draft === undefined ? <button type="button" className="text-button" disabled={busy}
        onClick={() => setDraft(textOf(variable.value))}>{t("flow_variable_edit")}</button> : <>
        <input className="text-field fs-var-mono" value={draft} aria-label={t("flow_variable_value")}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") { event.stopPropagation(); if (!busy) void change(draft); } }} />
        <button type="button" className="button-quiet" disabled={busy} onClick={() => void change(draft)}>{t("flow_variable_save")}</button>
        <button type="button" className="text-button" onClick={() => setDraft(undefined)}>{t("cancel")}</button>
      </>}
      {reset && draft === undefined && <button type="button" className="text-button" disabled={busy}
        onClick={() => void change()}>{t("flow_variable_reset")}</button>}
    </div>
    {error && <small role="alert">{error}</small>}
  </>;
}

export function VariableFull(props: NodeViewProps) {
  const { node, run, doc, snapshot, bridge } = props;
  const variable = latest(snapshot, node, run?.id);
  const scope = String(variable?.scope ?? node.config?.scope ?? "run");
  const lead = <span className="fs-var-lead">
    <span className="fs-var-name">{String(variable?.name ?? node.config?.name ?? node.title)}</span>
    <span className="fs-exec-chip">{t(`flow_scope_${scope}`)}</span>
    {variable && <small className="fs-var-version">v{variable.version}</small>}
  </span>;
  const history = variable?.history.slice(-5).toReversed() ?? [];
  return <FlowShell {...props} lead={lead}>
    <pre className="file-preview fs-var-value">{variable ? textOf(variable.value) : String(node.config?.initial ?? "")}</pre>
    {variable && (variable.scope === "canvas" || variable.runId) && <WriteControls variable={variable} bridge={bridge} />}
    {(!variable || (!variable.runId && variable.scope !== "canvas")) && <small className="fs-flow-note">{t("flow_variable_no_run")}</small>}
    {history.length > 0 && <div className="fs-var-changes">
      <span className="fs-git-section-head">{t("flow_variable_history")}</span>
      {history.map(write => {
        const name = doc.nodes.find(node => node.sessionId === write.writer)?.title ?? write.writer;
        return <div className="fs-var-change" key={write.id}>
          <span className="fs-var-change-copy" title={`${textOf(write.from)} → ${textOf(write.to)}`}>
            <span className="fs-var-mono">{textOf(write.from)} → {textOf(write.to)}</span>
            <small>{new Date(write.at).toLocaleTimeString()} · {name}</small>
          </span>
          <small className="fs-var-version">v{write.version}</small>
        </div>;
      })}
    </div>}
  </FlowShell>;
}

export function VariablePanel({ snapshot, bridge }: { snapshot: FlowspaceSnapshot | null; bridge: CanvasBridge }) {
  const definitions = snapshot?.variables?.filter(variable => !variable.runId) ?? [];
  const [selected, setSelected] = useState<string>();
  return <div className="inspector-content">
    {definitions.length === 0 && <div className="node-empty">{t("flow_variable_empty")}</div>}
    {definitions.map(definition => {
      const values = snapshot?.variables?.filter(variable => variable.id === definition.id && variable.runId) ?? [];
      const records = values.length ? values : [definition];
      const value = records.find(record => record.key === selected) ?? records.at(-1)!;
      return <div key={definition.id} className="fs-var-change">
        <span className="fs-var-change-copy">
          <span className="fs-var-name">{value.name}</span>
          <small>{t(`flow_scope_${value.scope}`)} · v{value.version} · {textOf(value.value)}</small>
          {values.length > 1 && <select className="select-field" aria-label={t("flow_scope_run")} value={value.key}
            onChange={event => setSelected(event.target.value)}>
            {records.map(record => <option key={record.key} value={record.key}>
              {snapshot?.runs.find(run => run.id === record.runId)?.title ?? record.runId}{record.lane ? ` · ${record.lane}` : ""}
            </option>)}
          </select>}
        </span>
        {(value.scope === "canvas" || value.runId) && <WriteControls key={value.key} variable={value} bridge={bridge} />}
      </div>;
    })}
  </div>;
}
