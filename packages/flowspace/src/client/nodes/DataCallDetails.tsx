import { useState } from "react";
import type { RunStep } from "../../types.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";

export function DataCallDetails({ steps = [] }: { steps?: RunStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const count = steps.reduce((sum, step) => sum + (step.dataCalls?.length ?? 0), 0);
  if (!count) return null;
  return <details className="run-timeline fs-data-calls" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary><Icon name="chev" />{t("flow_data_calls", { count })}</summary>
    {expanded && <div className="node-scroll">{steps.toReversed().flatMap(step => (step.dataCalls ?? []).map(call =>
      <div className={`event-row event-${call.error ? "error" : "completed"}`} key={call.id}>
        <i className="event-dot"><Icon name={call.error ? "x" : "check"} /></i>
        <div>
          <b>{call.index !== undefined ? t("flow_data_call_item", { n: call.index + 1 }) : t("flow_data_" + call.operation)}</b>
          <p className="user-content">{call.provider} / {call.model}</p>
          <p>{t("flow_data_call_usage", { input: call.inputTokens, output: call.outputTokens })}</p>
          {call.itemKey && <code>{call.itemKey}</code>}
          {call.error && <p className="danger">{call.error}</p>}
        </div>
      </div>))}</div>}
  </details>;
}
