import { useState } from "react";
import type { FlowspaceRun, JsonObject, RunStep } from "../../../types.ts";
import { portsOf } from "../../../core/nodes/registry.ts";
import { PayloadPeekCard } from "../../PayloadPeekPopover.tsx";
import { Icon } from "../../icons.tsx";
import { t } from "../../i18n.ts";
import { AnswerFields } from "../AnswerFields.tsx";
import { FlowCountdown } from "../FlowCountdown.tsx";
import type { NodeViewProps } from "../types.ts";

export { FlowCountdown };

const quote = (part: string) => /^[\w@%+=:,./\\-]+$/.test(part) ? part : `"${part.replace(/"/g, '\\"')}"`;

/** Split the Host's operation preview (`cwd\n<argv JSON | action JSON>`) into a readable command. */
export function operationCommand(preview: string): { cwd?: string; command: string } {
  const newline = preview.indexOf("\n");
  if (newline < 0) return { command: preview };
  const cwd = preview.slice(0, newline);
  const rest = preview.slice(newline + 1);
  try {
    const parsed: unknown = JSON.parse(rest);
    if (Array.isArray(parsed)) return { cwd, command: parsed.map(part => quote(String(part))).join(" ") };
    if (parsed && typeof parsed === "object") {
      const { action, ...values } = parsed as Record<string, unknown>;
      const args = Object.entries(values).map(([key, value]) => `${key}=${quote(String(value))}`);
      return { cwd, command: ["git", String(action ?? ""), ...args].filter(Boolean).join(" ") };
    }
  } catch { /* Show the Host text unchanged. */ }
  return { cwd, command: rest };
}

/** The exact command a person approves: working directory above, the full command line below. */
export function OperationCommand({ preview }: { preview: string }) {
  const { cwd, command } = operationCommand(preview);
  return <div className="fs-exec-cmd">
    {cwd && <small className="fs-exec-cwd" title={cwd}><Icon name="file" /><span>{cwd}</span></small>}
    <pre className="file-preview fs-exec-value"><span className="fs-exec-prompt" aria-hidden="true">$ </span>{command}</pre>
  </div>;
}

/** Upstream content stays one click away so the answer controls stay above the fold. */
export function UpstreamPeek({ node, run, step, doc, snapshot }: NodeViewProps & { run: FlowspaceRun; step: RunStep }) {
  if (!step.sources.length) return null;
  return <details className="fs-human-peek">
    <summary><Icon name="eye" /><span>{t("flow_human_upstream")}</span><small>{step.sources.length}</small></summary>
    <div className="fs-human-peek-body">{step.sources.map(source => {
      const edge = run.graph.edges.find(edge => edge.source === source.sourceNodeId && edge.target === node.id);
      return edge ? <PayloadPeekCard key={source.id} edge={edge} capturedSource={source} doc={doc} snapshot={snapshot} runId={run.id} />
        : <pre key={source.id} className="file-preview">{source.text}</pre>;
    })}</div>
  </details>;
}

export function HumanApproval(props: NodeViewProps & { run: FlowspaceRun; step: RunStep; showQuestion?: boolean }) {
  const { node, run, step, bridge, showQuestion } = props;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<JsonObject>(() => step.human?.initial ?? {});
  const human = step.human!;
  const labels = portsOf(run.graph.nodes.find(entry => entry.id === node.id) ?? node);
  async function answer(option: string) {
    setPending(true);
    setError("");
    try {
      await bridge.answerHuman(run.id, step.id, option, values);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setPending(false);
    }
  }
  const labelOf = (id: string) => human.operation
    ? t(id === "execute" ? "flow_exec_now" : id === "retry" ? "flow_exec_retry" : "flow_exec_skip")
    : human.fields ? t(id === "out" ? "flow_human_submit" : "flow_exec_skip")
      : labels.find(port => port.id === id)?.label ?? id;
  const primary = human.operation ? "execute" : human.fields ? "out" : undefined;
  const ordered = primary && human.options.includes(primary)
    ? [primary, ...human.options.filter(id => id !== primary)] : human.options;
  return <div className="fs-human-approval approval-box">
    {human.operation ? <OperationCommand preview={human.question} />
      : showQuestion && human.question && <p className="fs-human-q">{human.question}</p>}
    <UpstreamPeek {...props} />
    {!!human.fields?.length && <div className="fs-human-fields">
      <AnswerFields fields={human.fields} values={values}
        change={(name, value) => setValues(current => ({ ...current, [name]: value }))} />
    </div>}
    {primary ? <div className="button-row fs-human-actions">{ordered.map(id =>
      <button key={id} type="button" disabled={pending} className={id === primary ? "button button-primary" : "button-quiet"}
        onClick={() => void answer(id)}>{id === primary && <Icon name={human.operation ? "play" : "check"} />}{labelOf(id)}</button>)}
    </div> : <div className="choice-buttons">{ordered.map(id =>
      <button key={id} type="button" disabled={pending} onClick={() => void answer(id)}>{labelOf(id)}</button>)}
    </div>}
    {error && <small role="alert" className="fs-human-error">{error}</small>}
  </div>;
}
