import type {
  FlowEdge,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  FlowToken,
} from "../../types.ts";
import { canConnect, canStreamTo, structuredInput } from "../../core/connect.ts";
import { isContainer } from "../../core/containers.ts";
import { canInsertFanout } from "../../core/fanout.ts";
import { descriptorOf } from "../../core/nodes/registry.ts";
import type { CanvasBridge } from "../bridge.ts";
import { capsuleStateOf } from "../geometry.ts";
import { t } from "../i18n.ts";
import { Icon, kindIconName } from "../icons.tsx";
import { EdgeLogicForm } from "../nodes/ConfigForm.tsx";
import { DeliverySettings, PermissionSettings } from "../nodes/ContainerControls.tsx";
import { EventSettings } from "../nodes/InteractionViews.tsx";
import { PayloadPeekCard } from "../PayloadPeekPopover.tsx";
import { needsManualRelease } from "./formatters.ts";

export interface InspectorEdgeSectionProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge?: CanvasBridge;
  selectedEdge: FlowEdge;
  titleOf: (id: string) => string;
  triggerExtendLoop: (runId: string, edgeId: string, nodeId?: string) => void;
  onEditEdge: (id: string, changes: Partial<FlowEdge>) => void;
  onDeleteSelection: () => void;
  onInsertFanout?: (edgeId: string) => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
}

export function InspectorEdgeSection({
  doc,
  snapshot,
  bridge,
  selectedEdge,
  titleOf,
  triggerExtendLoop,
  onEditEdge,
  onDeleteSelection,
  onInsertFanout,
  onReleaseToken,
}: InspectorEdgeSectionProps) {
      const sourceNode = doc.nodes.find((n) => n.id === selectedEdge.source);
      const targetNode = doc.nodes.find((n) => n.id === selectedEdge.target);
      const hasStructuredOutput = selectedEdge.kind === "continuation" && selectedEdge.trigger !== "off" &&
        sourceNode?.kind === "agent" && targetNode && structuredInput(targetNode, selectedEdge.targetPort);
      const waitingTokens: { run: FlowspaceRun; token: FlowToken }[] =
        snapshot?.runs
          .filter((r) => ["running", "waiting", "paused"].includes(r.state))
          .flatMap((run) =>
            run.tokens
              .filter(
                (tk) =>
                  tk.edgeId === selectedEdge.id &&
                  needsManualRelease(tk),
              )
              .map((token) => ({ run, token })),
          ) ?? [];

      return (
        <div className="inspector-content">
          <span className="eyebrow">{t(selectedEdge.kind === "event" ? "flow_evt_wire" : selectedEdge.kind)}</span>
          <h2 className="user-content">
            {titleOf(selectedEdge.source)}
            <span>→</span>
            {titleOf(selectedEdge.target)}
          </h2>

          {selectedEdge.kind === "event" ? <EventSettings edge={selectedEdge} edit={onEditEdge} /> : selectedEdge.kind === "continuation" ? (
            <>
              {targetNode && isContainer(targetNode)
                ? <DeliverySettings edge={selectedEdge} target={targetNode} edit={onEditEdge} />
                : <>
              <label className="field-label">{t("mode")}</label>
              <div className="mode-options">
                {(
                  [
                    ["conclusion", "turn"],
                    ["session", "clock"],
                    ["fork", "fork"],
                  ] as const
                ).map(([mode, glyph]) => {
                  const eligibility = canConnect({ ...selectedEdge, mode, source: sourceNode, target: targetNode,
                    edges: doc.edges, edgeId: selectedEdge.id });
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={selectedEdge.mode === mode ? "selected" : ""}
                      disabled={!eligibility.ok}
                      title={eligibility.ok ? undefined : t(eligibility.reason)}
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
                </>}

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

              {hasStructuredOutput && (
                <>
                  <span className="field-label" id="fs-edge-emit-mode">{t("flow_emit_mode")}</span>
                  <div className="choice-buttons" role="group" aria-labelledby="fs-edge-emit-mode">
                    {(["end", "stream"] as const).map(mode => {
                      const selected = (selectedEdge.emitMode ?? "end") === mode;
                      const enabled = mode === "end" || canStreamTo(targetNode, selectedEdge.targetPort);
                      return <button key={mode} type="button" className={selected ? "selected" : ""}
                        aria-pressed={selected} disabled={!enabled} title={enabled ? undefined : t("flow_emit_stream_targets")}
                        onClick={() => onEditEdge(selectedEdge.id, { emitMode: mode })}>
                        {t(mode === "end" ? "flow_emit_end" : "flow_emit_stream")}
                      </button>;
                    })}
                  </div>
                </>
              )}
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

              <EdgeLogicForm edge={selectedEdge} apply={logic => onEditEdge(selectedEdge.id, { logic })} />
              {selectedEdge.originMode && (
                <p className="muted">
                  {t("createdBy", { mode: t(selectedEdge.originMode) })}
                </p>
              )}
            </>
          ) : (
            <>
              {sourceNode && targetNode?.kind === "agent" && isContainer(sourceNode) &&
                <PermissionSettings edge={selectedEdge} source={sourceNode} edit={onEditEdge} />}
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
                    {t(capsuleStateOf(selectedEdge, snapshot?.sourceVersions))}
                  </small>
                </div>
              </div>
              {selectedEdge.sentVersion && !selectedEdge.always && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    onEditEdge(selectedEdge.id, { sentVersion: "" })
                  }
                >
                  <Icon name="refresh" />
                  <span>{t("rearmCapsule")}</span>
                </button>
              )}
            </>
          )}

          {/* Glass-Box Wire Payload X-Ray Card */}
          {onInsertFanout && canInsertFanout(doc, selectedEdge) &&
            <button type="button" className="text-button" onClick={() => onInsertFanout(selectedEdge.id)}>
              <Icon name="fanout" /><span>{t("flow_insert_fanout")}</span>
            </button>}
          <PayloadPeekCard
            edge={selectedEdge}
            doc={doc}
            snapshot={snapshot}
            bridge={bridge}
          />

          {waitingTokens.map(({ run, token }) => (
            <div className="approval-box" key={token.id}>
              <span className="approval-heading">
                <Icon name={token.loopCapReached ? "loopPlus" : "pause"} />
                <b>
                  {t(
                    token.loopCapReached
                      ? "loopCapGate"
                      : token.boundary
                        ? "scopeBoundary"
                        : "waitingConfirmation",
                  )}
                </b>
              </span>
              <div className="approval-snippet user-content">
                {token.source.text.slice(0, 320) || token.source.title}
              </div>
              <div className="button-row">
                {token.loopCapReached ? (
                  <button
                    type="button"
                    className="button button-amber"
                    onClick={() =>
                      triggerExtendLoop(
                        run.id,
                        selectedEdge.id,
                        selectedEdge.target,
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
                    onClick={() => onReleaseToken(run.id, token.id, true)}
                  >
                    <Icon name="play" />
                    <span>{t("release")}</span>
                  </button>
                )}
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
