import { useState } from "react";
import type {
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
} from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import {
  formatDate,
  formatStepTelemetrySummary,
  formatTime,
  needsManualRelease,
} from "./formatters.ts";
import { HumanWaitRows, summarizeRunSteps, waitingHumanSteps } from "./RunWidgets.tsx";

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
  onReplay,
  onReport,
  onArena,
  onBatchHuman,
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
  onReplay?: (run: FlowspaceRun) => void;
  onReport?: (run: FlowspaceRun) => void;
  onArena?: () => void;
  onBatchHuman?: (runId: string) => void;
}) {
  const [origin, setOrigin] = useState<"all" | FlowspaceRun["origin"]>("all");
  const runs = (snapshot?.runs ?? []).filter(run => origin === "all" || run.origin === origin).toReversed();
  const humanWaits = waitingHumanSteps(snapshot);
  const circumference = 2 * Math.PI * 17;

  const handleLoopExtend = (runId: string, edgeId: string, nodeId?: string) => {
    if (onExtendLoop) {
      onExtendLoop(runId, edgeId, nodeId);
      return;
    }
    const ext = bridge?.extendLoop;
    if (ext) {
      void ext.call(bridge, { runId, edgeId, nodeId, extraRounds: 1 });
    }
  };

  const waitingTokens = (snapshot?.runs ?? [])
    .filter((r) => ["running", "waiting", "paused"].includes(r.state))
    .flatMap((run) =>
      run.tokens
        .filter(needsManualRelease)
        .map((token) => {
          const edge = run.graph.edges.find((e) => e.id === token.edgeId);
          return {
            run,
            token,
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
            <span>{waitingTokens.length + pendingApprovals.length + humanWaits.length}</span>
          </button>
        </div>

        <div className="activity-list">
          {tab === "runs" && <div className="button-row">
            <select className="select-field" aria-label={t("flow_run_origin")} value={origin}
              onChange={event => setOrigin(event.target.value as typeof origin)}>
              {(["all", "canvas", "chat", "trigger"] as const).map(value => <option key={value} value={value}>
                {t(value === "all" ? "all" : `flow_origin_${value}`)}
              </option>)}
            </select>
            {onArena && <button className="button-quiet" type="button" onClick={onArena}><Icon name="trophy" />{t("flow_arena_table")}</button>}
          </div>}
          {tab === "runs" ? (
            runs.length ? (
              runs.map((run, idx) => {
                const { stepItems, total, done, blocker, active } =
                  summarizeRunSteps(run, snapshot);
                const originLabel =
                  run.origin === "trigger" ? t("flow_origin_trigger") : run.origin === "chat"
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
                        {onReplay && <button className="button-quiet" type="button" onClick={() => onReplay(run)}>
                          <Icon name="replay" />{t("flow_replay_play")}
                        </button>}
                        {onBatchHuman && run.steps.some(step => step.itemKey && step.state === "awaiting" && step.human && !step.human.operation) &&
                          <button className="button-quiet" type="button" onClick={() => onBatchHuman(run.id)}>{t("flow_human_batch")}</button>}
                        {onReport && ["completed", "error", "cancelled", "interrupted"].includes(run.state) &&
                          <button className="button-quiet" type="button" onClick={() => onReport(run)}>{t("flow_report_title")}</button>}
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
                          <b className="user-content">{item.title}</b>
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
                              name: blocker.title,
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
                              ? t("runNextStep", { name: active.title })
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
                        {run.steps
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
          ) : waitingTokens.length || pendingApprovals.length || humanWaits.length ? (
            <>
              <HumanWaitRows waits={humanWaits} reveal={onRevealNode} />
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
