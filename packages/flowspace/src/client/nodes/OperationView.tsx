import type { FlowNode } from "../../types.ts";
import { t } from "../i18n.ts";
import { FlowShell } from "./FlowShell.tsx";
import { HumanApproval, OperationCommand } from "./judge/HumanApproval.tsx";
import type { NodeViewProps } from "./types.ts";

export function OperationCompact({ node, run }: NodeViewProps) {
  const step = run?.steps.findLast(step => step.nodeId === node.id);
  const result = step?.operationResult;
  const label = step?.state === "awaiting" ? t("flow_human_your_turn") : result ? t(result.exitCode === 0 ? "flow_exec_success" : "flow_exec_failure")
    : configuredCommand(node);
  return <span className="compact-overview-detail">{label}</span>;
}

/** What the node will run, before the Host has resolved parameters: fixed values inline, the rest as ‹name›. */
function configuredCommand(node: FlowNode): string {
  const config = node.config ?? {};
  const parameters = Array.isArray(config.parameters) ? config.parameters as { name: string; source: string; value: string }[] : [];
  const args = parameters.map(parameter => parameter.source === "fixed" && parameter.value ? parameter.value : `‹${parameter.name}›`);
  if (node.flowType === "flowspace/exec-git") return ["git", String(config.action ?? ""), ...args].join(" ");
  return [String(config.program || t("flow_exec_operation")), ...args].join(" ");
}

export function OperationFull(props: NodeViewProps) {
  const { node, run } = props;
  const step = run?.steps.findLast(step => step.nodeId === node.id);
  const result = step?.operationResult;
  const awaiting = step?.state === "awaiting" && step.human && run ? step : undefined;
  const failed = !!result && (result.exitCode !== 0 || result.timedOut);
  const lead = <span className="fs-exec-lead">
    <span className="fs-exec-chip">{t(node.flowType === "flowspace/exec-git" ? "flow_exec_git"
      : node.config?.mode === "interactive" ? "flow_exec_interactive" : "flow_form_once")}</span>
    {result && <span className={`fs-exec-chip ${failed ? "is-failed" : "is-ok"}`}>
      {result.timedOut ? t("flow_timeout") : t("flow_exec_exit", { code: String(result.exitCode ?? "—") })}
    </span>}
  </span>;
  return <FlowShell {...props} lead={lead}>
    {awaiting ? <HumanApproval {...props} run={run!} step={awaiting} /> : <>
      {step?.operation?.preview ? <OperationCommand preview={step.operation.preview} />
        : <pre className="file-preview fs-exec-value"><span className="fs-exec-prompt" aria-hidden="true">$ </span>{configuredCommand(node)}</pre>}
      {step?.output && <pre className="fs-terminal-pre fs-exec-output">{step.output}</pre>}
    </>}
  </FlowShell>;
}
