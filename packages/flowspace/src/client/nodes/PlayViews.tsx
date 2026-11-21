import { useEffect, useMemo, useRef, useState } from "react";
import type { BudgetLimits, FlowspaceRun, FlowspaceSnapshot, RunStep, TeamModel, TeamModelRoute } from "../../types.ts";
import { budgetUsage } from "../../core/budget.ts";
import type { CanvasBridge } from "../bridge.ts";
import { CanvasDialog } from "../CanvasDialog.tsx";
import { Icon } from "../icons.tsx";
import { t } from "../i18n.ts";
import { ModelChip, ModelSelect } from "../TeamControls.tsx";

export const replayEnd = (run: FlowspaceRun) => Math.max(run.createdAt + 100,
  ...run.steps.map(step => step.endedAt ?? step.createdAt),
  ...(run.events ?? []).map(event => event.at),
  ...run.tokens.map(token => token.consumedAt ?? token.readyAt ?? token.createdAt ?? token.source.capturedAt));

export function replayAt(run: FlowspaceRun, time: number): FlowspaceRun {
  const steps: RunStep[] = run.steps.filter(step => step.createdAt <= time).map(step => {
    if (step.endedAt !== undefined && step.endedAt <= time) return step;
    const lastEvent = run.events?.findLast(event => event.stepId === step.id && event.at <= time);
    return { ...step, route: undefined, output: undefined, endedAt: undefined,
      state: lastEvent?.kind === "waiting" ? "awaiting" : !step.startedAt || step.startedAt <= time ? "running" : "queued" };
  });
  const tokens = run.tokens.filter(token => (token.createdAt ?? token.source.capturedAt) <= time).map(token => ({
    ...token, ready: token.readyAt !== undefined && token.readyAt <= time,
    consumed: token.consumedAt !== undefined && token.consumedAt <= time,
  }));
  return { ...run, state: time >= replayEnd(run) ? run.state : "running", steps, tokens };
}

export function ReplayDock({ run, time, setTime, exit }: {
  run: FlowspaceRun; time: number; setTime: (time: number) => void; exit: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const end = replayEnd(run);
  const timeRef = useRef(time);
  timeRef.current = time;
  useEffect(() => {
    if (!playing) return;
    let updated = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const next = Math.min(end, timeRef.current + (now - updated) * speed);
      updated = now;
      setTime(next);
      if (next >= end) setPlaying(false);
    }, 50);
    return () => clearInterval(timer);
  }, [playing, speed, end, setTime]);
  return <div className="fs-replay-dock">
    <button type="button" className="icon-button" aria-label={t(playing ? "pause" : "flow_replay_play")} onClick={() => {
      if (!playing && time >= end) setTime(run.createdAt);
      setPlaying(!playing);
    }}><Icon name={playing ? "pause" : "replay"} /></button>
    <div className="fs-replay-track">
      <progress aria-hidden="true" value={time - run.createdAt} max={end - run.createdAt} />
      <input type="range" aria-label={t("flow_replay_position")} min={run.createdAt} max={end}
        step={10} value={time} onChange={event => setTime(event.target.valueAsNumber)} />
    </div>
    <span className="fs-replay-time">{((time - run.createdAt) / 1000).toFixed(1)} / {((end - run.createdAt) / 1000).toFixed(1)} s</span>
    <div className="choice-buttons">{[1, 4, 16].map(rate => <button key={rate} type="button"
      className={rate === speed ? "selected" : ""} onClick={() => setSpeed(rate)}>{rate}×</button>)}</div>
    <button type="button" className="icon-button" onClick={exit} aria-label={t("close")}><Icon name="x" /></button>
  </div>;
}

export function Breakpoint({ run, step, bridge }: { run: FlowspaceRun; step: RunStep; bridge: CanvasBridge }) {
  const [task, setTask] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="approval-box fs-bp-box">
    <small className="field-label">{t(step.debug?.reason === "budget" ? "flow_budget_pause" : "flow_bp_hit")}</small>
    {task === undefined ? <pre className="file-preview">{step.task}</pre> :
      <textarea className="text-field" value={task} onChange={event => setTask(event.target.value)} />}
    {step.sources.map(source => <details key={source.id}><summary>{source.title}</summary><pre className="file-preview">{source.text}</pre></details>)}
    {!!step.debug?.tools.length && <small className="fs-var-mono">{step.debug.tools.join(" · ")}</small>}
    {step.variables?.map(variable => <small className="fs-var-mono" key={variable.key}>
      {variable.name} · v{variable.version} · {JSON.stringify(variable.value)}
    </small>)}
    <div className="button-row">
      {(["continue", "step", "skip"] as const).map(action => <button type="button" className={action === "continue" ? "button" : "button-quiet"}
        disabled={busy || !!run.budgetPause} key={action} onClick={() => {
          setBusy(true);
          setError("");
          void bridge.debugStep({ runId: run.id, stepId: step.id, action, task }).catch(failure => setError(String(failure))).finally(() => setBusy(false));
        }}>{t(`flow_bp_${action}`)}</button>)}
      <button type="button" className="text-button" onClick={() => setTask(step.task)}>{t("flow_bp_edit")}</button>
    </div>
    {error && <small role="alert">{error}</small>}
  </div>;
}

export function BudgetFields({ value, update }: { value?: BudgetLimits; update: (limits: BudgetLimits) => void }) {
  return <div>
    {(["tokens", "seconds", "rounds"] as const).map(key => <label className="setting-row" key={key}>
      <span>{t(`flow_budget_${key}`)}</span>
      <input type="number" className="text-field" min={1} value={value?.[key] ?? ""} onChange={event => {
        const next = { ...value };
        if (event.target.valueAsNumber > 0) next[key] = event.target.valueAsNumber;
        else delete next[key];
        update(next);
      }} />
    </label>)}
  </div>;
}

export function BudgetMeter({ snapshot }: { snapshot: FlowspaceSnapshot | null }) {
  const run = snapshot?.runs.findLast(run => !!run.budget && ["running", "paused", "waiting"].includes(run.state));
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!run) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run?.id]);
  if (!run?.budget) return null;
  const limits = run.budget;
  const usage = budgetUsage(run.steps, run.createdAt, now);
  const key = (["tokens", "seconds", "rounds"] as const).filter(key => limits[key] !== undefined)
    .sort((a, b) => usage[b] / limits[b]! - usage[a] / limits[a]!)[0];
  if (!key) return null;
  const limit = limits[key]!;
  const value = Math.floor(usage[key]);
  const format = (count: number) => key === "tokens" && count >= 1000
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count).toLowerCase()
    : count.toLocaleString();
  return <div className="fs-budget-meter" data-level={value >= limit ? "over" : value >= .8 * limit ? "near" : "normal"}
    title={t(`flow_budget_${key}`)}><Icon name="gauge" />
    <span>{format(value)} / {format(limit)}</span>
    <progress value={Math.min(value, limit)} max={limit} />
  </div>;
}

export function ArenaDialog({ snapshot, close }: { snapshot: FlowspaceSnapshot | null; close: () => void }) {
  const [tag, setTag] = useState("");
  const results = snapshot?.arena ?? [];
  const tags = [...new Set(results.map(result => result.tag).filter(Boolean))];
  const models = new Map<string, { model: TeamModel; wins: number; losses: number }>();
  for (const result of results) {
    if (tag && result.tag !== tag) continue;
    const key = `${result.model.provider}/${result.model.model}`;
    const score = models.get(key) ?? { model: result.model, wins: 0, losses: 0 };
    if (result.won) score.wins++;
    else score.losses++;
    models.set(key, score);
  }
  return <CanvasDialog title={t("flow_arena_table")} closeLabel={t("close")} variant="wide" onClose={close}>
    <label className="field-label">{t("flow_form_taskTag")}<select className="select-field" value={tag} onChange={event => setTag(event.target.value)}>
      <option value="">{t("all")}</option>{tags.map(tag => <option key={tag}>{tag}</option>)}
    </select></label>
    <table className="fs-replay-table">
      <thead><tr>{["model", "wins", "losses", "rate"].map(key => <th key={key}>{t(`flow_arena_${key}`)}</th>)}</tr></thead>
      <tbody>{[...models.values()].toSorted((a, b) => b.wins - a.wins).map(({ model, wins, losses }) => <tr key={model.provider + model.model}>
        <td><ModelChip model={model} /></td><td>{wins}</td><td>{losses}</td><td>{Math.round(100 * wins / (wins + losses))}%</td>
      </tr>)}</tbody>
    </table>
    {!models.size && <p className="muted">{t("flow_arena_empty")}</p>}
  </CanvasDialog>;
}

async function exportReport(element: HTMLElement, title: string) {
  const width = element.clientWidth;
  const height = element.scrollHeight;
  const copy = element.cloneNode(true) as HTMLElement;
  const targets = Array.from(copy.querySelectorAll<HTMLElement>("*"));
  [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))].forEach((source, index) => {
    const target = index ? targets[index - 1] : copy;
    const styles = getComputedStyle(source);
    const properties = ["display", "gap", "grid-template-columns", "padding", "margin", "border-radius", "background-color",
      "color", "font-family", "font-size", "font-weight", "line-height", "white-space"];
    for (const property of properties) target.style.setProperty(property, styles.getPropertyValue(property));
  });
  copy.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const serialized = new XMLSerializer().serializeToString(copy);
  const image = new Image();
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = title + ".png";
  anchor.click();
}

export function ReportDialog({ run, bridge, models, close }: {
  run: FlowspaceRun; bridge: CanvasBridge; models: TeamModelRoute[]; close: () => void;
}) {
  const [report, setReport] = useState(run.report);
  const [model, setModel] = useState<TeamModel>(models[0] ?? { provider: "", model: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => report && [[t("flow_budget_seconds"), report.seconds.toFixed(1)],
    [t("flow_report_tokens"), report.tokens], [t("flow_budget_rounds"), report.rounds], [t("flow_report_best"), report.bestNode ?? "—"]], [report]);
  return <CanvasDialog title={t("flow_report_title")} variant="wide" closeLabel={t("close")} onClose={close}>
    {report ? <>
      <div className="fs-replay-report" ref={content}>
        <div className="fs-replay-metrics">{stats?.map(([name, value]) => <div key={name}><small>{name}</small><span>{value}</span></div>)}</div>
        <p>{report.summary}</p>
        {report.artifacts.map(artifact => <div className="fs-var-mono" key={artifact.id}>{artifact.path}</div>)}
      </div>
      <button type="button" className="button-quiet" onClick={() =>
        void exportReport(content.current!, run.title).catch(failure => setError(String(failure)))}>{t("flow_report_export")}</button>
    </> : <>
      <ModelSelect routes={models} value={model} label={t("flow_arena_model")}
        onChange={next => setModel(next ?? { provider: "", model: "" })} />
      <button type="button" className="button" disabled={busy || !model.provider || !model.model} onClick={() => {
        setBusy(true);
        setError("");
        void bridge.generateReport(run.id, model).then(setReport).catch(failure => setError(String(failure))).finally(() => setBusy(false));
      }}>{t("flow_report_generate")}</button>
    </>}
    {error && <p role="alert">{error}</p>}
  </CanvasDialog>;
}
