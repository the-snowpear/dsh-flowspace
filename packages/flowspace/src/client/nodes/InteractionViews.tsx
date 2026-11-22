import { useState } from "react";
import type { EventPolicy, FlowspaceRun, FlowEdge, FlowEventKind, HumanField, JsonObject, JsonValue, RunStep } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { CanvasDialog } from "../CanvasDialog.tsx";
import { Icon } from "../icons.tsx";
import { t } from "../i18n.ts";
import { descriptorOf } from "../../core/nodes/registry.ts";
import { AnswerFields } from "./AnswerFields.tsx";
import { awaitingStep, FlowShell } from "./FlowShell.tsx";
import { HumanApproval, UpstreamPeek } from "./judge/HumanApproval.tsx";
import type { NodeViewProps } from "./types.ts";

export { AnswerFields };

const question = (props: NodeViewProps) => String(props.node.config?.question ?? "").trim();
const questionLead = (text: string) => text ? <span className="fs-branch-question" title={text}>{text}</span> : undefined;

export function HumanCompact({ node, run }: NodeViewProps) {
  const awaiting = run?.steps.some(step => step.nodeId === node.id && step.state === "awaiting");
  return <span className="compact-overview-detail">{awaiting ? t("flow_human_your_turn")
    : String(node.config?.question || t(descriptorOf(node.flowType)?.descKey ?? "flow_human_idle"))}</span>;
}

/** Form, score and review nodes: outlets first, the answer panel below them. */
export function HumanFull(props: NodeViewProps) {
  const { node, run } = props;
  const step = awaitingStep(props);
  const last = run?.steps.findLast(entry => entry.nodeId === node.id && entry.state === "completed");
  const fields = (node.config?.fields ?? []) as unknown as HumanField[];
  return <FlowShell {...props} lead={questionLead(question(props))}>
    {step && run ? <HumanApproval {...props} run={run} step={step} />
      : last?.output ? <pre className="file-preview fs-human-last">{last.output}</pre>
        : <div className="fs-human-idle">
          {fields.length > 0 && <div className="fs-human-chips">{fields.map(field =>
            <span key={field.name} className="fs-human-chip">{t(field.label)}</span>)}</div>}
          <small>{t("flow_human_idle")}</small>
        </div>}
  </FlowShell>;
}

/** Human choice: while waiting, each outlet row is the answer button for that branch. */
export function HumanChoiceFull(props: NodeViewProps) {
  const { run, bridge } = props;
  const step = awaitingStep(props);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (option: string) => {
    if (!run || !step) return;
    setBusy(true);
    setError("");
    try { await bridge.answerHuman(run.id, step.id, option, {}); }
    catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  };
  return <FlowShell {...props} lead={questionLead(step?.human?.question || question(props))}
    choose={step?.human ? { options: step.human.options, pick: option => void pick(option), busy } : undefined}>
    {step && run && <div className="fs-human-idle">
      <small className="fs-human-hint">{t("flow_human_pick")}</small>
      <UpstreamPeek {...props} run={run} step={step} />
      {error && <small role="alert" className="fs-human-error">{error}</small>}
    </div>}
  </FlowShell>;
}

/** Notification: the band previews the message that will be sent. */
export function NoticeFull(props: NodeViewProps) {
  const message = String(props.node.config?.message || props.node.config?.title || "").trim();
  return <FlowShell {...props} lead={message ? <span className="fs-branch-question" title={message}>{message}</span> : undefined} />;
}

export function TriggerCompact({ node, snapshot }: NodeViewProps) {
  const state = snapshot?.triggers?.find(state => state.id === node.id);
  return <span className="compact-overview-detail">{node.config?.mode === "launchpad" ? t("flow_trig_launchpad") :
    state?.nextAt ? t("flow_trig_next", { time: new Date(state.nextAt).toLocaleTimeString() }) :
      t(node.config?.enabled ? "flow_trig_enabled" : "flow_trig_disabled")}</span>;
}
export function TriggerFull(props: NodeViewProps) {
  const { node, snapshot, bridge } = props;
  const [values, setValues] = useState<JsonObject>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const state = snapshot?.triggers?.find(state => state.id === node.id);
  const manual = node.config?.mode === "launchpad";
  const fields = (node.config?.fields ?? []) as unknown as HumanField[];
  const meta = [
    state?.nextAt && <span key="next">{t("flow_trig_next", { time: new Date(state.nextAt).toLocaleTimeString() })}</span>,
    state?.lastAt && <span key="last">{t("flow_trig_last", { time: new Date(state.lastAt).toLocaleString() })}</span>,
    !!state?.missed && <span key="missed" className="fs-trig-missed">{t("flow_trig_missed", { count: state.missed })}</span>,
  ].filter(Boolean);
  return <FlowShell {...props} lead={manual ? undefined : meta.length
    ? <span className="fs-trig-meta">{meta}</span> : <span>{t(node.config?.enabled ? "flow_trig_enabled" : "flow_trig_disabled")}</span>}>
    {manual ? <div className="fs-trig-launch">
      {fields.length > 0 && <div className="fs-human-fields"><AnswerFields fields={fields} values={values}
        change={(name, value) => setValues(current => ({ ...current, [name]: value }))} /></div>}
      <button className="button button-primary" type="button" disabled={busy} onClick={event => {
        event.stopPropagation();
        setBusy(true);
        setError("");
        void bridge.launchTrigger(node.id, values)
          .catch(failure => setError(failure instanceof Error ? failure.message : String(failure)))
          .finally(() => setBusy(false));
      }}><Icon name="play" />{t("flow_trig_launch")}</button>
      {error && <small role="alert" className="fs-human-error">{error}</small>}
    </div> : <small className="fs-flow-note">{t("flow_trig_no_backfill")}</small>}
  </FlowShell>;
}

const kinds: Record<EventPolicy["mode"], FlowEventKind[]> = {
  end: ["done", "error"], change: ["running", "waiting", "done", "error", "budget", "container"],
  continuous: ["output", "tool", "usage"],
};
export function EventSettings({ edge, edit }: { edge: FlowEdge; edit: (id: string, changes: Partial<FlowEdge>) => void }) {
  const config: EventPolicy = edge.event ?? { mode: "end", kinds: ["done"] };
  const change = (patch: Partial<EventPolicy>) => edit(edge.id, { event: { ...config, ...patch } });
  return <>
    <div className="choice-buttons">{(["end", "change", "continuous"] as const).map(mode =>
      <button key={mode} type="button" className={mode === config.mode ? "selected" : ""}
        onClick={() => change({ mode, kinds: [kinds[mode][0]] })}>{t(`flow_evt_${mode}`)}</button>)}</div>
    <div className="fs-human-panel">{kinds[config.mode].map(kind => <label className="switch-row" key={kind}>
      {t(`flow_event_${kind}`)}
      <input type="checkbox" checked={config.kinds.includes(kind)} onChange={() =>
        change({ kinds: config.kinds.includes(kind) ? config.kinds.filter(value => value !== kind) : [...config.kinds, kind] })} />
    </label>)}</div>
    <label className="field-label">{t("flow_event_cooldown")}
      <input type="number" className="text-field" min={0} value={(config.cooldownMs ?? 0) / 1000}
        onChange={event => change({ cooldownMs: Math.round((event.target.valueAsNumber || 0) * 1000) })} />
    </label>
    <label className="field-label">{t("flow_event_limit")}
      <input type="number" className="text-field" min={1} value={config.maxTimes ?? ""}
        onChange={event => change({ maxTimes: event.target.valueAsNumber || undefined })} />
    </label>
    <label className="switch-row">{t("flow_event_full")}
      <button type="button" role="switch" aria-checked={!!config.full} className="switch" onClick={() => change({ full: !config.full })} />
    </label>
    {config.mode === "end" && <label className="field-label">{t("flow_evt_end_reasons")}
      <input className="text-field" value={config.reasons?.join(", ") ?? ""}
        onChange={event => change({ reasons: event.target.value.split(",").map(value => value.trim()).filter(Boolean) })} />
    </label>}
  </>;
}

export function BatchHuman({ run, bridge, onClose }: { run: FlowspaceRun; bridge: CanvasBridge; onClose: () => void }) {
  const [rows] = useState(() => run.steps.filter(step => step.itemKey && step.state === "awaiting" && step.human && !step.human.operation));
  const [answers, setAnswers] = useState<Record<string, JsonObject>>(() => Object.fromEntries(rows.map(step => [step.id, step.human!.initial ?? {}])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>();
  const fields = rows[0]?.human?.fields ?? [];
  const [column, setColumn] = useState(fields[0]?.name ?? "");
  const first = rows.find(row => run.steps.find(step => step.id === row.id)?.state === "awaiting");
  const send = async (step: RunStep, answer: string) => {
    setBusy(step.id);
    setErrors(current => ({ ...current, [step.id]: "" }));
    try { await bridge.answerHuman(run.id, step.id, answer, answers[step.id]); }
    catch (error) { setErrors(current => ({ ...current, [step.id]: String(error) })); }
    finally { setBusy(undefined); }
  };
  return <CanvasDialog title={t("flow_human_batch")} variant="wide" closeLabel={t("close")} onClose={onClose}>
    <table className="fs-replay-table fs-human-batch"><thead><tr>
      {["lane", "question", "answer", "state"].map(key => <th key={key}>{t(`flow_human_batch_${key}`)}</th>)}
    </tr></thead><tbody>{rows.map(step => {
      const live = run.steps.find(current => current.id === step.id);
      const node = run.graph.nodes.find(node => node.id === step.nodeId);
      const waiting = live?.state === "awaiting";
      return <tr key={step.id}>
        <td>{node?.itemTitle ?? node?.title ?? step.itemKey}</td><td>{step.human!.question || node?.title}</td>
        <td>{waiting && (step.human!.fields ? <>
          <AnswerFields fields={step.human!.fields} values={answers[step.id] ?? {}} change={(name, value) =>
            setAnswers(current => ({ ...current, [step.id]: { ...current[step.id], [name]: value } }))} />
          <button className="button-quiet" type="button" disabled={!!busy} onClick={() => void send(step, "out")}>{t("flow_human_submit")}</button>
        </> : <span className="choice-buttons">{step.human!.options.map(option =>
          <button key={option} type="button" disabled={!!busy} onClick={() => void send(step, option)}>
            {String((node?.config?.options as { id: string; label: string }[] | undefined)?.find(entry => entry.id === option)?.label ?? option)}
          </button>)}</span>)}
          {errors[step.id] && <small role="alert">{errors[step.id]}</small>}
        </td><td>{t(waiting ? "waiting" : "done")}</td>
      </tr>;
    })}</tbody></table>
    {fields.length > 0 && first && <div className="button-row">
      <select className="select-field" value={column} aria-label={t("flow_human_batch_answer")}
        onChange={event => setColumn(event.target.value)}>
        {fields.map(field => <option key={field.name} value={field.name}>{t(field.label)}</option>)}
      </select>
      <button type="button" className="text-button" disabled={answers[first.id]?.[column] === undefined} onClick={() => {
        const value = answers[first.id][column];
        setAnswers(current => ({ ...current, ...Object.fromEntries(rows
          .filter(row => row.human?.fields?.some(field => field.name === column))
          .map(row => [row.id, { ...current[row.id], [column]: value }])) }));
      }}>{t("flow_human_batch_apply")}</button>
    </div>}
  </CanvasDialog>;
}
