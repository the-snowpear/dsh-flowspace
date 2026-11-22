import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GroupColor,
  GroupPort,
  WorkspaceBrief,
} from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { inferGroupPorts } from "../geometry.ts";
import { t } from "../i18n.ts";
import { Icon, kindIconName, PortMark } from "../icons.tsx";
import { BudgetFields } from "../nodes/PlayViews.tsx";
import { allTemplates } from "../templates.ts";
import type { AlignMode, DistributeAxis, StructureInspectorItem } from "./formatters.ts";
import { InspectorEdgeSection } from "./InspectorEdgeSection.tsx";
import { InspectorNodeSection } from "./InspectorNodeSection.tsx";

export interface InspectorProps {
  open: boolean;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  workspaces: WorkspaceBrief[];
  bridge?: CanvasBridge;
  selectedNode?: FlowNode;
  selectedNodes?: FlowNode[];
  selectedEdge?: FlowEdge;
  selectedStructureCard?: StructureInspectorItem | null;
  onClose: () => void;
  onEditNode: (id: string, changes: Partial<FlowNode>) => void;
  onApplyConfig: (id: string, config: NonNullable<FlowNode["config"]>, version: number) => Promise<void>;
  onEditEdge: (id: string, changes: Partial<FlowEdge>) => void;
  onDeleteSelection: () => void;
  onInsertFanout?: (edgeId: string) => void;
  onUngroup: (groupId: string) => void;
  onReleaseToken: (runId: string, tokenId: string, accept: boolean) => void;
  onExtendLoop?: (runId: string, edgeId: string, nodeId?: string) => void;
  onOpenNativeChat: (sessionId: string) => void;
  onOpenDetail: (nodeId: string) => void;
  onOpenWindow: (nodeId: string) => void;
  onSetGroupPorts: (groupId: string, ports: GroupPort[]) => void;
  onOpenMergePorts: (groupId: string) => void;
  onSaveTemplate: (groupId: string) => void;
  onSyncTemplate: (groupId: string) => void;
  onDetachTemplate: (groupId: string) => void;
  /* Optional Wave 2 ComfyUI callbacks */
  onAlign?: (mode: AlignMode) => void;
  onDistribute?: (axis: DistributeAxis) => void;
  onGroupSelected?: () => void;
  onDuplicateSelected?: () => void;
  onBatchParticipation?: (
    participation: "global" | "manual" | "paused" | "bypassed",
  ) => void;
  onRunSelection?: () => void;
  onRunFromHere?: (nodeId: string) => void;
  onRunToHere?: (nodeId: string) => void;
  onForkHypothesis?: (nodeId: string) => void;
  onStopNode?: (nodeId: string) => void;
}

export function InspectorPanel({
  open,
  doc,
  snapshot,
  workspaces,
  bridge,
  selectedNode,
  selectedNodes,
  selectedEdge,
  selectedStructureCard,
  onClose,
  onEditNode,
  onApplyConfig,
  onEditEdge,
  onDeleteSelection,
  onInsertFanout,
  onUngroup,
  onReleaseToken,
  onExtendLoop,
  onOpenNativeChat,
  onOpenDetail,
  onOpenWindow,
  onSetGroupPorts,
  onOpenMergePorts,
  onSaveTemplate,
  onSyncTemplate,
  onDetachTemplate,
  onAlign,
  onDistribute,
  onGroupSelected,
  onDuplicateSelected,
  onBatchParticipation,
  onRunSelection,
  onRunFromHere,
  onRunToHere,
  onForkHypothesis,
  onStopNode,
}: InspectorProps) {
  const titleOf = (id: string) =>
    doc.nodes.find((n) => n.id === id)?.title ?? id;

  const triggerExtendLoop = (
    runId: string,
    edgeId: string,
    nodeId?: string,
  ) => {
    if (onExtendLoop) {
      onExtendLoop(runId, edgeId, nodeId);
      return;
    }
    const ext = bridge?.extendLoop;
    if (ext) {
      void ext.call(bridge, { runId, edgeId, nodeId, extraRounds: 1 });
    }
  };

  const renderBody = () => {
    /* 1. Multi-Select ComfyUI Inspector (2+ nodes selected) */
    if (selectedNodes && selectedNodes.length >= 2) {
      const selectedAgents = selectedNodes.filter((n) => n.kind === "agent");
      const kindCounts = new Map<string, number>();
      for (const n of selectedNodes) {
        kindCounts.set(n.kind, (kindCounts.get(n.kind) ?? 0) + 1);
      }

      const applyBatchParticipation = (
        val: "global" | "manual" | "paused" | "bypassed",
      ) => {
        if (onBatchParticipation) {
          onBatchParticipation(val);
          return;
        }
        for (const ag of selectedAgents) {
          onEditNode(ag.id, {
            participation: val as FlowNode["participation"],
          });
        }
      };

      return (
        <div className="inspector-content">
          <span className="eyebrow">{t("rangeSelection")}</span>
          <h2>
            {t("multiSelectionTitle", { count: selectedNodes.length })}
          </h2>

          <div className="template-meta" style={{ marginTop: 0 }}>
            {[...kindCounts.entries()].map(([kind, cnt]) => (
              <span key={kind}>
                {cnt} × {t(kind)}
              </span>
            ))}
          </div>

          {onAlign && (
            <>
              <label className="field-label">{t("alignNodesLabel")}</label>
              <div
                className="fs-align-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 4,
                }}
              >
                {(
                  [
                    ["left", "alignLeft"],
                    ["center", "alignCenter"],
                    ["right", "alignRight"],
                    ["top", "alignTop"],
                    ["middle", "alignMiddle"],
                    ["bottom", "alignBottom"],
                  ] as const
                ).map(([mode, iconKey]) => (
                  <button
                    key={mode}
                    type="button"
                    className="button"
                    style={{ padding: 0, justifyContent: "center" }}
                    title={t(iconKey)}
                    aria-label={t(iconKey)}
                    onClick={() => onAlign(mode)}
                  >
                    <Icon name={iconKey} />
                  </button>
                ))}
              </div>
            </>
          )}

          {onDistribute && selectedNodes.length >= 3 && (
            <>
              <label className="field-label">{t("distributeNodesLabel")}</label>
              <div className="choice-buttons">
                <button
                  type="button"
                  onClick={() => onDistribute("horizontal")}
                >
                  <Icon name="distributeH" />{" "}
                  <span>{t("distributeH")}</span>
                </button>
                <button type="button" onClick={() => onDistribute("vertical")}>
                  <Icon name="distributeV" />{" "}
                  <span>{t("distributeV")}</span>
                </button>
              </div>
            </>
          )}

          {selectedAgents.length > 0 && (
            <>
              <label className="field-label">{t("batchParticipation")}</label>
              <div className="choice-buttons vertical">
                {(
                  [
                    ["global", "global"],
                    ["manual", "manual"],
                    ["paused", "pausedParticipation"],
                    ["bypassed", "bypassParticipation"],
                  ] as const
                ).map(([val, labelKey]) => {
                  const allMatch = selectedAgents.every(
                    (ag) => (ag.participation as string) === val,
                  );
                  return (
                    <button
                      key={val}
                      type="button"
                      className={allMatch ? "selected" : ""}
                      onClick={() => applyBatchParticipation(val)}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="inspector-divider" />
          {onRunSelection && selectedAgents.length > 0 && (
            <button
              type="button"
              className="button button-primary"
              onClick={onRunSelection}
            >
              <Icon name="play" />
              <span>{t("runSelection")}</span>
            </button>
          )}
          {onGroupSelected && (
            <button type="button" className="button" onClick={onGroupSelected}>
              <Icon name="group" />
              <span>{t("groupSelection")}</span>
            </button>
          )}
          {onDuplicateSelected && (
            <button
              type="button"
              className="text-button"
              onClick={onDuplicateSelected}
            >
              <Icon name="duplicate" />
              <span>{t("duplicateSelection")}</span>
            </button>
          )}
          <button
            type="button"
            className="text-button danger"
            onClick={onDeleteSelection}
          >
            <Icon name="trash" />
            <span>{t("deleteSelected")}</span>
          </button>
        </div>
      );
    }

    /* 2. Single Edge Inspector + Embedded Payload X-Ray */
    if (selectedEdge) {
      return (
        <InspectorEdgeSection
          doc={doc}
          snapshot={snapshot}
          bridge={bridge}
          selectedEdge={selectedEdge}
          titleOf={titleOf}
          triggerExtendLoop={triggerExtendLoop}
          onEditEdge={onEditEdge}
          onDeleteSelection={onDeleteSelection}
          onInsertFanout={onInsertFanout}
          onReleaseToken={onReleaseToken}
        />
      );
    }

    /* 3. Group / Composite Workflow Inspector */
    if (selectedNode?.kind === "group") {
      const ports = inferGroupPorts(doc, selectedNode);
      return (
        <div className="inspector-content">
          <span className="eyebrow">{t("groupSettings")}</span>
          <h2 className="user-content">{selectedNode.title}</h2>

          <label className="field-label">{t("name")}</label>
          <input
            className="text-field"
            value={selectedNode.title}
            onChange={(e) =>
              onEditNode(selectedNode.id, {
                title: e.target.value,
                titleKey: undefined,
              })
            }
          />

          <label className="field-label">{t("groupColor")}</label>
          <div className="color-options">
            {(["blue", "violet", "teal", "amber"] as GroupColor[]).map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(color)}
                  className={`color-${color} ${(selectedNode.color ?? "blue") === color ? "selected" : ""}`}
                  onClick={() => onEditNode(selectedNode.id, { color })}
                />
              ),
            )}
          </div>

          <label className="field-label">{t("ports")}</label>
          <div className="port-editor">
            {ports.map((port, idx) => (
              <div
                key={port.id}
                className={`port-editor-row ${port.hidden ? "port-hidden" : ""}`}
              >
                <PortMark kind={port.kind} proxy />
                <div>
                  <small>
                    {t(port.kind)} ·{" "}
                    {t(port.direction === "in" ? "inputPort" : "outputPort")}
                  </small>
                  <input
                    value={port.name}
                    aria-label={t("portName")}
                    onChange={(e) => {
                      const next = structuredClone(ports);
                      next[idx].name = e.target.value;
                      onSetGroupPorts(selectedNode.id, next);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="icon-button rotate-up"
                  title={t("reorderUp")}
                  onClick={() => {
                    if (idx === 0) return;
                    const next = structuredClone(ports);
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    onSetGroupPorts(selectedNode.id, next);
                  }}
                >
                  <Icon name="chev" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("hidePort")}
                  onClick={() => {
                    const next = structuredClone(ports);
                    next[idx].hidden = !next[idx].hidden;
                    onSetGroupPorts(selectedNode.id, next);
                  }}
                >
                  <Icon name={port.hidden ? "eyeoff" : "eye"} />
                </button>
              </div>
            ))}
          </div>
          {ports.filter((p) => p.direction === "in").length >= 2 && (
            <button
              type="button"
              className="text-button"
              onClick={() => onOpenMergePorts(selectedNode.id)}
            >
              <Icon name="group" />
              <span>{t("mergePorts")}</span>
            </button>
          )}

          <div className="inspector-divider" />
          <button
            type="button"
            className="button button-primary"
            onClick={() => onSaveTemplate(selectedNode.id)}
          >
            <Icon name="box" />
            <span>{t("saveTemplate")}</span>
          </button>

          {selectedNode.templateId && (
            <>
              <p className="muted">
                {t("templateLinked", {
                  version: selectedNode.templateRevision ?? 1,
                })}
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => onSyncTemplate(selectedNode.id)}
              >
                <Icon name="undo" />
                <span>{t("syncTemplate")}</span>
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => onDetachTemplate(selectedNode.id)}
              >
                <Icon name="off" />
                <span>{t("detachTemplate")}</span>
              </button>
            </>
          )}

          <div className="inspector-divider" />
          <button
            type="button"
            className="text-button danger"
            onClick={() => selectedNode.fanout ? onDeleteSelection() : onUngroup(selectedNode.id)}
          >
            <Icon name="x" />
            <span>{t(selectedNode.fanout ? "deleteNode" : "ungroup")}</span>
          </button>
        </div>
      );
    }

    /* 4. Single Node Inspector */
    if (selectedNode) {
      return (
        <InspectorNodeSection
          doc={doc}
          snapshot={snapshot}
          workspaces={workspaces}
          bridge={bridge}
          selectedNode={selectedNode}
          onEditNode={onEditNode}
          onApplyConfig={onApplyConfig}
          onDeleteSelection={onDeleteSelection}
          onOpenNativeChat={onOpenNativeChat}
          onOpenDetail={onOpenDetail}
          onOpenWindow={onOpenWindow}
          onRunFromHere={onRunFromHere}
          onRunToHere={onRunToHere}
          onForkHypothesis={onForkHypothesis}
          onStopNode={onStopNode}
        />
      );
    }

    /* 5. Derived Structure Card Inspector (Project / Branch / Worktree / Subagent) */
    if (selectedStructureCard) {
      return (
        <div className="inspector-content">
          <span className="eyebrow">{t("structureInspectorEyebrow")}</span>
          <h2 className="user-content">{selectedStructureCard.title}</h2>
          <p className="inspector-description">{t("structureInspectorDesc")}</p>
          <div className="reference-list">
            <div>
              <Icon name={kindIconName(selectedStructureCard.kind)} />
              <span className="user-content">
                {t(selectedStructureCard.kind)}
              </span>
              {selectedStructureCard.branch && (
                <small className="user-content">
                  {selectedStructureCard.branch}
                </small>
              )}
            </div>
          </div>
          {(selectedStructureCard.worktreePath ||
            selectedStructureCard.cwd ||
            selectedStructureCard.subtitle) && (
            <p className="muted user-content">
              {selectedStructureCard.worktreePath ||
                selectedStructureCard.cwd ||
                selectedStructureCard.subtitle}
            </p>
          )}
          {selectedStructureCard.sessionId && (
            <button
              type="button"
              className="button"
              onClick={() =>
                onOpenNativeChat(selectedStructureCard.sessionId!)
              }
            >
              <Icon name="chat" />
              <span>{t("openNativeChat")}</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="inspector-empty">
        <Icon name="card" />
        <h3>{t("selectObject")}</h3>
        <p>{t("selectObjectDescription")}</p>
      </div>
    );
  };

  return (
    <aside className={`fs-inspector ${open ? "open" : ""}`}>
      <header className="inspector-header">
        <b>{t("inspector")}</b>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          title={t("close")}
        >
          <Icon name="x" />
        </button>
      </header>
      {renderBody()}
    </aside>
  );
}
