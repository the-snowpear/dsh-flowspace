import type {
  FlowspaceDocument,
  FlowspaceSnapshot,
} from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { formatTime, needsManualRelease } from "./formatters.ts";
import { HumanWaitRows, summarizeRunSteps, waitingHumanSteps } from "./RunWidgets.tsx";

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
    const ext = bridge?.extendLoop;
    if (ext) {
      void ext.call(bridge, { runId, edgeId, nodeId, extraRounds: 1 });
    }
  };

  if (tab === "outputs") {
    const completedOutputs = runs.flatMap((run) =>
      run.steps
        .filter((s) => s.state === "completed" && Boolean(s.output?.trim()))
        .map((step) => ({
          step,
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
    const humanWaits = waitingHumanSteps(snapshot);
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
    if (!waitingTokens.length && !pendingApprovals.length && !humanWaits.length) {
      return <p className="muted">{t("noWaiting")}</p>;
    }
    return (
      <div className="activity-list fs-run-dock">
        <HumanWaitRows waits={humanWaits} reveal={onRevealNode} />
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
                  <b className="user-content">{item.title}</b>
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
