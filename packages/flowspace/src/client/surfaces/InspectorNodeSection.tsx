import type {
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  StartRequest,
  WorkspaceBrief,
} from "../../types.ts";
import { isContainer } from "../../core/containers.ts";
import { descriptorOf } from "../../core/nodes/registry.ts";
import type { CanvasBridge } from "../bridge.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { ConfigForm } from "../nodes/ConfigForm.tsx";
import { ContainerHistory } from "../nodes/ContainerControls.tsx";
import { DataCallDetails } from "../nodes/DataCallDetails.tsx";
import { BudgetFields } from "../nodes/PlayViews.tsx";
import { runtimeIndex } from "../sceneModel.ts";
import { nodeStatusOf } from "./formatters.ts";

export interface InspectorNodeSectionProps {
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  workspaces: WorkspaceBrief[];
  bridge?: CanvasBridge;
  selectedNode: FlowNode;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onApplyConfig: (id: string, config: NonNullable<FlowNode["config"]>, version: number) => Promise<void>;
  onDeleteSelection: () => void;
  onOpenNativeChat: (sessionId: string) => void;
  onOpenDetail: (nodeId: string) => void;
  onOpenWindow: (nodeId: string) => void;
  onRunFromHere?: (nodeId: string) => void;
  onRunToHere?: (nodeId: string) => void;
  onForkHypothesis?: (nodeId: string) => void;
  onStopNode?: (nodeId: string) => void;
}

export function InspectorNodeSection({
  doc,
  snapshot,
  workspaces,
  bridge,
  selectedNode,
  onEditNode,
  onApplyConfig,
  onDeleteSelection,
  onOpenNativeChat,
  onOpenDetail,
  onOpenWindow,
  onRunFromHere,
  onRunToHere,
  onForkHypothesis,
  onStopNode,
}: InspectorNodeSectionProps) {
      const state = nodeStatusOf(snapshot, selectedNode.id);
      const descriptor = selectedNode.kind === "flow" ? descriptorOf(selectedNode.flowType) : undefined;
      const canRunPartial = Boolean(
        onRunFromHere || onRunToHere || bridge,
      );

      return (
        <div className="inspector-content">
          <span className="eyebrow">{descriptor ? t(descriptor.titleKey) : selectedNode.kind}</span>
          <h2 className="user-content">{selectedNode.title}</h2>
          {selectedNode.kind === "agent" && (
            <span className={`status status-${state}`}>
              <i />
              {t(state)}
            </span>
          )}

          <label className="field-label">{t("name")}</label>
          <input
            className="text-field"
            value={selectedNode.title}
            onChange={(e) =>
              onEditNode(selectedNode.id, {
                title: e.target.value,
                customTitle: true,
              })
            }
          />

          {descriptor && <ConfigForm key={JSON.stringify([selectedNode.id, selectedNode.flowType, selectedNode.config])}
            descriptor={descriptor} value={selectedNode.config ?? descriptor.defaultConfig} bridge={bridge}
            connectedPorts={doc.edges.flatMap(edge => [
              ...(edge.source === selectedNode.id ? [{ id: edge.sourcePort ?? "out", direction: "out" as const }] : []),
              ...(edge.target === selectedNode.id ? [{ id: edge.targetPort ?? "in", direction: "in" as const }] : []),
            ])}
            apply={config => onApplyConfig(selectedNode.id, config, descriptor.version)} />}
          {selectedNode.flowType === "flowspace/exec-terminal" && selectedNode.config?.mode === "interactive" &&
            <label className="field-label">{t("flow_exec_terminal_owner")}
              <select className="select-field" value={selectedNode.terminalSessionId ?? ""}
                onChange={event => onEditNode(selectedNode.id, { terminalSessionId: event.target.value || undefined })}>
                <option value="">{t("flow_exec_terminal_upstream")}</option>
                {doc.nodes.filter(node => node.kind === "agent" && node.sessionId).map(node =>
                  <option key={node.id} value={node.sessionId}>{node.title}</option>)}
              </select>
            </label>}
          {descriptor?.family === "data" &&
            <DataCallDetails key={selectedNode.id} steps={runtimeIndex(snapshot).steps.get(selectedNode.id)} />}
          {isContainer(selectedNode) && <ContainerHistory
            key={selectedNode.id} nodeId={selectedNode.id} doc={doc} snapshot={snapshot} bridge={bridge} />}
          {selectedNode.kind === "agent" && (
            <>
              <label className="switch-row">
                {t("flow_bp_title")}
                <button type="button" role="switch" aria-checked={!!selectedNode.breakpoint} className="switch"
                  onClick={() => onEditNode(selectedNode.id, { breakpoint: !selectedNode.breakpoint })} />
              </label>
              <label className="switch-row">
                {t("flow_exec_canvas_tools")}
                <button type="button" role="switch" aria-checked={!!selectedNode.canvasToolsOnly} className="switch"
                  onClick={() => onEditNode(selectedNode.id, { canvasToolsOnly: !selectedNode.canvasToolsOnly })} />
              </label>
              <details><summary>{t("flow_budget_title")}</summary>
                <BudgetFields value={selectedNode.budget} update={budget => onEditNode(selectedNode.id, { budget })} />
              </details>
              {selectedNode.masterOf && <details><summary>{t("flow_lane_bindings")}</summary>
                {(["provider", "model", "persona", "cwd"] as const).map(key => <label key={key} className="field-label">
                  {t(`flow_lane_bind_${key}`)}
                  <input className="text-field fs-var-mono" value={selectedNode.laneBindings?.[key] ?? ""}
                    onChange={event => onEditNode(selectedNode.id, { laneBindings: { ...selectedNode.laneBindings,
                      [key]: event.target.value || undefined } })} />
                </label>)}
              </details>}
              <label className="field-label">{t("workspace")}</label>
              <select
                className="text-field"
                disabled={!!selectedNode.sessionId}
                value={selectedNode.workspaceId ?? ""}
                onChange={(e) => {
                  const ws = workspaces.find((w) => w.id === e.target.value);
                  onEditNode(selectedNode.id, {
                    workspaceId: e.target.value || undefined,
                    cwd: ws?.path,
                  });
                }}
              >
                <option value="">{t("currentWorkspace")}</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {(selectedNode.branch || selectedNode.worktreePath) && (
                <p className="muted user-content">
                  {t("affiliation")}:{" "}
                  {[
                    selectedNode.branch,
                    selectedNode.worktreePath?.split(/[\\/]/).pop(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              <div className="switch-row">
                <span>{t("planMode")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!selectedNode.planMode}
                  className="switch"
                  onClick={() =>
                    onEditNode(selectedNode.id, {
                      planMode: !selectedNode.planMode,
                    })
                  }
                />
              </div>

              <label className="field-label">{t("savedTask")}</label>
              <textarea
                className="text-field"
                rows={3}
                value={selectedNode.task}
                placeholder={t("taskPlaceholder")}
                onChange={(e) =>
                  onEditNode(selectedNode.id, { task: e.target.value })
                }
              />

              <label className="field-label">
                {t("continuationInstruction")}
              </label>
              <textarea
                className="text-field"
                rows={2}
                value={selectedNode.continuationPrompt ?? selectedNode.task}
                placeholder={t("continuationPlaceholder")}
                onChange={(e) =>
                  onEditNode(selectedNode.id, {
                    continuationPrompt: e.target.value,
                  })
                }
              />

              <label className="field-label">{t("nativeTriggerLabel")}</label>
              <div className="choice-buttons">
                {(
                  [
                    [
                      "inherit",
                      t("inheritGlobal", {
                        state: doc.settings.nativeChatTriggers
                          ? t("enabled")
                          : t("disabled"),
                      }),
                    ],
                    ["enabled", t("enabled")],
                    ["disabled", t("disabled")],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={
                      selectedNode.nativeTrigger === val ? "selected" : ""
                    }
                    onClick={() =>
                      onEditNode(selectedNode.id, { nativeTrigger: val })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="field-label">{t("participation")}</label>
              <div className="choice-buttons vertical">
                {(
                  [
                    ["global", "global"],
                    ["manual", "manual"],
                    ["paused", "pausedParticipation"],
                    ["bypassed", "bypassParticipation"],
                  ] as const
                ).map(([val, labelKey]) => (
                  <button
                    key={val}
                    type="button"
                    className={
                      (selectedNode.participation as string) === val
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      onEditNode(selectedNode.id, {
                        participation: val as FlowNode["participation"],
                      })
                    }
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <label className="field-label">{t("rerunRule")}</label>
              <select
                className="text-field"
                value={selectedNode.rerun ?? "change"}
                onChange={(e) =>
                  onEditNode(selectedNode.id, {
                    rerun: e.target.value as FlowNode["rerun"],
                  })
                }
              >
                <option value="change">{t("onInput")}</option>
                <option value="update">{t("onUpdate")}</option>
                <option value="always">{t("everyRun")}</option>
              </select>

              <div className="inspector-divider" />
              {state === "running" && (onStopNode || bridge) && (
                <button
                  type="button"
                  className="button danger"
                  onClick={() => {
                    if (onStopNode) {
                      onStopNode(selectedNode.id);
                    } else {
                      void bridge?.stopNode(selectedNode.id);
                    }
                  }}
                >
                  <Icon name="stop" />
                  <span>{t("stopAgent")}</span>
                </button>
              )}

              {canRunPartial && (
                <>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      if (onRunFromHere) {
                        onRunFromHere(selectedNode.id);
                      } else {
                        void bridge?.start({
                          kind: "from-node" as StartRequest["kind"],
                          nodeIds: [selectedNode.id],
                        });
                      }
                    }}
                  >
                    <Icon name="runFrom" />
                    <span>{t("runFromHere")}</span>
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (onRunToHere) {
                        onRunToHere(selectedNode.id);
                      } else {
                        void bridge?.start({
                          kind: "to-node" as StartRequest["kind"],
                          nodeIds: [selectedNode.id],
                        });
                      }
                    }}
                  >
                    <Icon name="runTo" />
                    <span>{t("runToHere")}</span>
                  </button>
                </>
              )}

              {onForkHypothesis && selectedNode.sessionId && (
                <button
                  type="button"
                  className="text-button"
                  title={t("forkHypothesisTip")}
                  onClick={() => onForkHypothesis(selectedNode.id)}
                >
                  <Icon name="fork" />
                  <span>{t("forkHypothesis")}</span>
                </button>
              )}

              <button
                type="button"
                className="button"
                onClick={() => onOpenDetail(selectedNode.id)}
              >
                <Icon name="card" />
                <span>{t("executionDetail")}</span>
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => onOpenWindow(selectedNode.id)}
              >
                <Icon name="pop" />
                <span>{t("openWindow")}</span>
              </button>
              {selectedNode.sessionId && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onOpenNativeChat(selectedNode.sessionId!)}
                >
                  <Icon name="chat" />
                  <span>{t("openNativeChat")}</span>
                </button>
              )}
            </>
          )}

          <div className="switch-row">
            <span>{t("pin")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!selectedNode.pinned}
              className="switch"
              onClick={() =>
                onEditNode(selectedNode.id, { pinned: !selectedNode.pinned })
              }
            />
          </div>

          <div className="inspector-divider" />
          <button
            type="button"
            className="text-button danger"
            onClick={onDeleteSelection}
          >
            <Icon name="trash" />
            <span>{t("deleteNode")}</span>
          </button>
          {selectedNode.kind === "agent" && (
            <small className="muted">{t("removeKeepSession")}</small>
          )}
        </div>
      );
}
