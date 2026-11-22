import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowspaceSnapshot,
  FlowToken,
  TeamMemberView,
  TeamModelRoute,
  TeamRuntimeBrief,
  WorkspaceBrief,
  WorkspaceFilePreview,
} from "../../../types.ts";
import { normalizeBoardColumns } from "../../../core/board.ts";
import { newNode } from "../../../core/document.ts";
import { descriptorOf } from "../../../core/nodes/registry.ts";
import { BoardCompactSummary } from "../../BoardControls.tsx";
import { BoardNodeView } from "../../BoardNodeView.tsx";
import type { CanvasBridge } from "../../bridge.ts";
import { nodeBox, type Box } from "../../geometry.ts";
import { t } from "../../i18n.ts";
import { Icon } from "../../icons.tsx";
import { viewOf } from "../../nodes/index.ts";
import { formatTime, nodeStatusOf } from "../../SurfaceViews.tsx";
import { RoleNodeBody, RoleNodeSummary } from "../../TeamCanvas.tsx";
import { ChangesNodeBody, GitNodeBody, TerminalNodeBody } from "../../ToolNodeViews.tsx";
import type { PromptDialogSpec } from "../../ui/PromptDialog.tsx";
import type { CardActionHandlers } from "../canvasTypes.ts";
import type { CardUiState } from "../ViewportCard.tsx";

export interface NodeCompactBodyProps {
  node: FlowNode;
  semantic: boolean | undefined;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  flowRun: FlowspaceRun | undefined;
  state: string;
  waitingGates: { run: FlowspaceRun; token: FlowToken }[];
  latestOutput: string;
  workspaces: WorkspaceBrief[];
  isTeam: boolean;
  team: TeamRuntimeBrief | undefined;
  completedTasks: number;
  staffTeam: FlowNode | undefined;
  roleMembers: TeamMemberView[];
  openRoleMember: (sessionId: string) => void;
  emissionReminder: ReactNode;
  reportError: (err: unknown) => void;
}

export function renderNodeCompactBody({
  node,
  semantic,
  doc,
  snapshot,
  bridge,
  flowRun,
  state,
  waitingGates,
  latestOutput,
  workspaces,
  isTeam,
  team,
  completedTasks,
  staffTeam,
  roleMembers,
  openRoleMember,
  emissionReminder,
  reportError,
}: NodeCompactBodyProps): ReactNode {
  if (node.kind === "flow") {
    const { Compact } = viewOf(node.flowType);
    const kindTitle = t(descriptorOf(node.flowType)?.titleKey ?? "flow_view_missing");
    const detail = (
      <Compact node={node} run={flowRun} doc={doc} snapshot={snapshot} bridge={bridge} />
    );
    // Same frames as the built-in tool cards: a kind label at semantic zoom, an inset summary line otherwise.
    return semantic ? (
      <div className="compact-overview">
        <span className="compact-kind">{kindTitle}</span>
        {detail}
      </div>
    ) : (
      <div className="compact-tool fs-flow-compact">
        {detail}
        {node.customTitle && <span>{kindTitle}</span>}
      </div>
    );
  }
  if (node.kind === "board") {
    return (
      <BoardCompactSummary
        columns={normalizeBoardColumns(node.columns)}
        semantic={semantic}
      />
    );
  }
  if (semantic && node.kind !== "agent") {
    let detail = "";
    let detailStatus = "";
    switch (node.kind) {
      case "note":
        detail = node.text.trim().split("\n")[0];
        break;
      case "display":
        detail = t(node.fixed ? "fixed" : "follow");
        break;
      case "file":
        detail = t("selectedCount", {
          count: node.selectedItems?.length || (node.text ? 1 : 0),
        });
        break;
      case "git":
        detail = node.branch ?? "";
        break;
      case "changes":
        detail = node.changesTurn ? `#${node.changesTurn}` : "";
        break;
      case "detail":
        detailStatus = node.sourceNodeId
          ? nodeStatusOf(snapshot, node.sourceNodeId)
          : "draft";
        detail = t(detailStatus);
        break;
      case "role":
        detail = staffTeam?.title ?? node.teamModel?.model ?? "";
        break;
    }
    return (
      <div className="compact-overview">
        <span className="compact-kind">{t(`nodeKind_${node.kind}`)}</span>
        {detail && (
          <span
            className={`compact-overview-detail ${detailStatus ? `status status-${detailStatus}` : "user-content"}`}
            title={detail}
          >
            {detailStatus && <i />}
            {detail}
          </span>
        )}
      </div>
    );
  }
  if (node.kind === "agent") {
    const wsName =
      workspaces.find((w) => w.id === node.workspaceId)?.name ||
      node.cwd?.split(/[\\/]/).filter(Boolean).pop() ||
      t("currentWorkspace");
    const summary = waitingGates.length
      ? `${waitingGates[0].token.source.title} → ${t("waitingConfirmation")}`
      : node.draft.trim() ||
        (state === "draft"
          ? node.task || t("taskPlaceholder")
          : latestOutput || node.task);
    return (
      <>
        <div className="compact-status">
          <span className="compact-kind">
            {t(isTeam ? "teamLibrary" : "nodeKind_agent")}
          </span>
          <span className={`status status-${state}`}>
            <i />
            {t(state)}
          </span>
          {emissionReminder ||
            (team ? (
              <small className="fs-team-node-summary">
                <span
                  title={t("teamCapacity", team.capacity)}
                  aria-label={t("teamCapacity", team.capacity)}
                >
                  {team.capacity.active > 0 ? (
                    <i className="fs-team-node-dot" aria-hidden="true" />
                  ) : (
                    <Icon name="person" />
                  )}
                  {team.capacity.active}/{team.capacity.max}
                </span>
                <span
                  title={t("teamTaskProgress", {
                    done: completedTasks,
                    total: team.tasks.length,
                  })}
                  aria-label={t("teamTaskProgress", {
                    done: completedTasks,
                    total: team.tasks.length,
                  })}
                >
                  <Icon name="board" />
                  {completedTasks}/{team.tasks.length}
                </span>
              </small>
            ) : (
              <span>{wsName}</span>
            ))}
        </div>
        <p className="compact-summary user-content">{summary}</p>
        {waitingGates.length > 0 && (
          <button
            type="button"
            className="compact-release"
            onClick={(e) => {
              e.stopPropagation();
              void bridge
                .release(waitingGates[0].run.id, waitingGates[0].token.id, true)
                .catch(reportError);
            }}
          >
            <Icon name="play" />
            <span>{t("release")}</span>
          </button>
        )}
        <div
          className={`progress-line ${state === "running" ? "is-running" : ""}`}
        >
          <i />
        </div>
      </>
    );
  }
  if (node.kind === "role") {
    return (
      <RoleNodeSummary
        node={node}
        team={staffTeam}
        snapshot={snapshot}
        members={roleMembers}
        onOpenMember={openRoleMember}
      />
    );
  }
  if (node.kind === "note" || node.kind === "display") {
    return (
      <>
        <p className="compact-summary user-content">
          {node.text ||
            t(node.kind === "note" ? "notePlaceholder" : "noOutput")}
        </p>
        {node.kind === "display" && (
          <span className="compact-display-mode">
            {t(node.fixed ? "fixed" : "follow")}
          </span>
        )}
      </>
    );
  }
  if (node.kind === "detail") {
    const srcState = node.sourceNodeId
      ? nodeStatusOf(snapshot, node.sourceNodeId)
      : "draft";
    return (
      <div className="compact-tool">
        <span className={`status status-${srcState}`}>
          <i />
          {t(srcState)}
        </span>
        <span>{t("executionDetail")}</span>
      </div>
    );
  }
  if (node.kind === "git") {
    const firstLine = node.text.split("\n")[0] || node.branch || "Git";
    return (
      <div className="compact-tool">
        <span className="user-content">{firstLine}</span>
        <span>{t("git")}</span>
      </div>
    );
  }
  if (node.kind === "changes") {
    const turnTag = node.changesTurn
      ? `Turn #${node.changesTurn}`
      : node.text.split("\n")[0] || t("changes");
    return (
      <div className="compact-tool">
        <span className="user-content">{turnTag}</span>
        <span>{t("changes")}</span>
      </div>
    );
  }
  if (node.kind === "terminal") {
    const tailLine =
      node.text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .at(-1) || t("terminal");
    return (
      <div className="compact-tool">
        <span className="user-content">{tailLine}</span>
        <span>{t("terminal")}</span>
      </div>
    );
  }
  const count = node.selectedItems?.length || (node.text ? 1 : 0);
  return (
    <div className="compact-tool">
      <span>{node.text.split("\n")[0] || t("newFile")}</span>
      <span>{t("selectedCount", { count })}</span>
    </div>
  );
}

export interface BasicNodeFullBodyProps {
  node: FlowNode;
  placement: "canvas" | "window" | "conversation";
  box: Box;
  doc: FlowspaceDocument;
  liveDoc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  nodesById: Map<string, FlowNode>;
  outgoingEdges: FlowEdge[];
  flowRun: FlowspaceRun | undefined;
  bridge: CanvasBridge;
  cardActions: CardActionHandlers;
  staffTeam: FlowNode | undefined;
  roleRunning: boolean;
  roleMembers: TeamMemberView[];
  openRoleMember: (sessionId: string) => void;
  modelRoutes: TeamModelRoute[];
  workspaceFilesList: string[];
  activeWorkspaceCwd: string | undefined;
  ui: CardUiState | undefined;
  reportError: (err: unknown) => void;
  setFormModal: Dispatch<SetStateAction<PromptDialogSpec | null>>;
  setFileInputDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setFileModal: Dispatch<SetStateAction<WorkspaceFilePreview | null>>;
  setEditingNodeId: Dispatch<SetStateAction<string | null>>;
}

export function renderBasicNodeFullBody({
  node,
  placement,
  box,
  doc,
  liveDoc,
  snapshot,
  nodesById,
  outgoingEdges,
  flowRun,
  bridge,
  cardActions,
  staffTeam,
  roleRunning,
  roleMembers,
  openRoleMember,
  modelRoutes,
  workspaceFilesList,
  activeWorkspaceCwd,
  ui,
  reportError,
  setFormModal,
  setFileInputDrafts,
  setFileModal,
  setEditingNodeId,
}: BasicNodeFullBodyProps): ReactNode {
  const {
    editNode,
    edit,
    selectNode,
    showToast,
    startPortDrag,
    revealNode,
    refreshProjectStructures,
    editBoard,
    createBoardCompanion,
    openBoardAgentMenu,
    openBoardMenu,
  } = cardActions;

  if (node.kind === "flow") {
    const { Full } = viewOf(node.flowType);
    return (
      <Full node={node} run={flowRun} doc={liveDoc} snapshot={snapshot} bridge={bridge} />
    );
  }
  const bodyBox = placement === "canvas" ? nodeBox(node, false, true) : box;
  const extractDisplay = (title: string, text: string) => {
    const disp: FlowNode = {
      ...newNode("display", bodyBox.x + bodyBox.w + 36, bodyBox.y, title),
      sourceNodeId: node.id,
      text,
      fixed: true,
      expanded: true,
    };
    edit((d) => d.nodes.push(disp));
    selectNode(disp.id);
    showToast(t("nodeCreated"));
  };

  if (node.kind === "git") {
    return (
      <GitNodeBody
        node={node}
        bridge={bridge}
        onEditNode={editNode}
        onPromptForm={setFormModal}
        onExtractDisplay={extractDisplay}
        onError={reportError}
        onRefreshStructure={refreshProjectStructures}
      />
    );
  }
  if (node.kind === "changes") {
    return (
      <ChangesNodeBody
        node={node}
        doc={doc}
        snapshot={snapshot}
        bridge={bridge}
        onEditNode={editNode}
        onExtractDisplay={extractDisplay}
        onError={reportError}
      />
    );
  }
  if (node.kind === "terminal") {
    return (
      <TerminalNodeBody
        node={node}
        doc={doc}
        bridge={bridge}
        onEditNode={editNode}
        onExtractDisplay={extractDisplay}
        onError={reportError}
      />
    );
  }

  if (node.kind === "role") {
    return (
      <RoleNodeBody
        node={node}
        team={staffTeam}
        snapshot={snapshot}
        routes={modelRoutes}
        running={roleRunning}
        members={roleMembers}
        onOpenMember={openRoleMember}
        onEdit={(patch) => editNode(node.id, patch)}
      />
    );
  }

  if (node.kind === "file") {
    const knownPaths = [
      ...new Set([
        ...(node.items ?? []),
        ...node.text
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        ...workspaceFilesList,
      ]),
    ];
    const selectedSet = new Set(
      node.selectedItems?.length
        ? node.selectedItems
        : node.text
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean),
    );
    const draftVal = ui?.fileDraft ?? "";
    const togglePath = (filePath: string) => {
      const next = new Set(selectedSet);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      const arr = [...next];
      editNode(node.id, {
        selectedItems: arr,
        text: arr.join("\n"),
        title:
          arr.length === 1
            ? arr[0].split("/").pop() ?? node.title
            : node.title,
      });
    };
    return (
      <div className="tool-body">
        <div className="tool-summary">{t("filesDescription")}</div>
        <div className="file-input-bar">
          <input
            placeholder={t("filePathPlaceholder")}
            value={draftVal}
            onChange={(e) =>
              setFileInputDrafts((prev) => ({
                ...prev,
                [node.id]: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && draftVal.trim()) {
                const p = draftVal.trim();
                const arr = [...new Set([...selectedSet, p])];
                editNode(node.id, {
                  items: [...new Set([p, ...(node.items ?? [])])],
                  selectedItems: arr,
                  text: arr.join("\n"),
                });
                setFileInputDrafts((prev) => ({ ...prev, [node.id]: "" }));
              }
            }}
          />
        </div>
        <div className="file-tree">
          {knownPaths.map((fp) => {
            const checked = selectedSet.has(fp);
            return (
              <div
                key={fp}
                className={`file-row ${checked ? "selected" : ""}`}
              >
                <button
                  type="button"
                  className="file-select"
                  aria-pressed={checked}
                  onClick={() => togglePath(fp)}
                >
                  <i className="checkbox" />
                  <Icon name="file" />
                  <span title={fp}>{fp}</span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t("openFile")}
                  onClick={() =>
                    void bridge
                      .readWorkspaceFile(fp, node.cwd || activeWorkspaceCwd)
                      .then(setFileModal)
                      .catch(reportError)
                  }
                >
                  <Icon name="pop" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="tool-footer">
          {t("selectedCount", { count: selectedSet.size })}
        </div>
      </div>
    );
  }

  if (node.kind === "note") {
    return (
      <textarea
        className="note-editor user-content"
        aria-label={node.title}
        placeholder={t("notePlaceholder")}
        value={node.text}
        onFocus={() => setEditingNodeId(node.id)}
        onBlur={() => setEditingNodeId(null)}
        onChange={(e) => editNode(node.id, { text: e.target.value })}
      />
    );
  }

  if (node.kind === "display") {
    return (
      <>
        <div className="display-content user-content">
          {node.text || t("noOutput")}
        </div>
        <footer className="display-footer">
          <button
            type="button"
            className="display-mode"
            onClick={() =>
              editNode(node.id, {
                fixed: !node.fixed,
                text:
                  node.fixed && node.sourceNodeId
                    ? snapshot?.live.find((l) => l.nodeId === node.sourceNodeId)
                        ?.output || node.text
                    : node.text,
              })
            }
          >
            <Icon name={node.fixed ? "pin" : "undo"} />
            <span>{t(node.fixed ? "fixed" : "follow")}</span>
          </button>
          <button
            type="button"
            className="text-button"
            disabled={!node.sourceNodeId || !nodesById.has(node.sourceNodeId)}
            onClick={() => node.sourceNodeId && revealNode(node.sourceNodeId)}
          >
            <Icon name="chev" />
            <span>{t("viewSource")}</span>
          </button>
        </footer>
      </>
    );
  }

  if (node.kind === "detail") {
    const srcNode = node.sourceNodeId
      ? nodesById.get(node.sourceNodeId)
      : undefined;
    const srcState = node.sourceNodeId
      ? nodeStatusOf(snapshot, node.sourceNodeId)
      : "draft";
    const srcSteps =
      snapshot?.runs
        .flatMap((r) => r.steps)
        .filter((s) => s.nodeId === node.sourceNodeId) ?? [];
    const liveText = node.pinned
      ? node.text
      : (node.sourceNodeId &&
          snapshot?.live.find((l) => l.nodeId === node.sourceNodeId)?.output) ||
        srcSteps.filter((s) => s.output).at(-1)?.output ||
        node.text;
    return (
      <>
        <div className="detail-summary">
          <span className={`status status-${srcState}`}>
            <i />
            {t(srcState)}
          </span>
          <span>{srcNode?.title ?? ""}</span>
        </div>
        <div className="node-scroll">
          {[...srcSteps].reverse().map((step) => (
            <div key={step.id} className={`event-row event-${step.state}`}>
              <i className="event-dot">
                <Icon name={step.state === "completed" ? "check" : "bolt"} />
              </i>
              <div>
                <b>
                  {t(step.state)} ·{" "}
                  {t("roundBadge", { round: step.iteration })}
                </b>
              </div>
              <time>{formatTime(step.createdAt)}</time>
            </div>
          ))}
          <div className="detail-result user-content">
            {liveText || t("noEvents")}
          </div>
        </div>
        <footer className="display-footer">
          <button
            type="button"
            className="text-button"
            onClick={() =>
              editNode(node.id, {
                pinned: !node.pinned,
                fixed: !node.pinned,
                text: liveText,
              })
            }
          >
            <Icon name="pin" />
            <span>{t(node.pinned ? "unpinDetail" : "pinDetail")}</span>
          </button>
          {srcNode && (
            <button
              type="button"
              className="text-button"
              onClick={() => revealNode(srcNode.id)}
            >
              <Icon name="chev" />
              <span>{t("viewSource")}</span>
            </button>
          )}
        </footer>
      </>
    );
  }

  if (node.kind === "board") {
    const linkedCards = new Set(
      outgoingEdges.flatMap((edge) =>
        edge.kind === "reference" && edge.sourceItemKey !== undefined
          ? [edge.sourceItemKey]
          : [],
      ),
    );
    return (
      <BoardNodeView
        node={node}
        linkedCards={linkedCards}
        onEdit={(change) => editBoard(node.id, change)}
        onMenu={openBoardMenu}
        onDispatch={(cardId) => createBoardCompanion(node.id, cardId, "agent")}
        onConvertNote={(cardId) => createBoardCompanion(node.id, cardId, "note")}
        onLinkAgent={(cardId, anchor) =>
          openBoardAgentMenu(node.id, cardId, anchor)
        }
        onDragReference={
          placement === "canvas"
            ? (event, cardId, onStart) =>
                startPortDrag(event, [node.id], "reference", cardId, onStart)
            : undefined
        }
        onCopy={(text) =>
          void navigator.clipboard
            .writeText(text)
            .then(() => showToast(t("copied")))
            .catch(reportError)
        }
      />
    );
  }
  return null;
}
