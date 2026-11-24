import { memo } from "react";
import type { CanvasWorldProps } from "../canvasWorldTypes.ts";
import { t } from "../../i18n.ts";
import { Icon, kindIconName } from "../../icons.tsx";
import { intersects } from "../../sceneModel.ts";
import { ChildCards } from "../../TeamCanvas.tsx";
import { ViewportCard } from "../ViewportCard.tsx";
import { useCanvasInteractionStore } from "../interactionStore.ts";
import { useOverviewMounts } from "../useOverviewMounts.ts";
import { shouldRenderDomInLod } from "../overviewScene.ts";

type NodesLayerProps = Pick<CanvasWorldProps,
  | "snapshot"
  | "bridge"
  | "lod"
  | "keepExpandedIds"
  | "vpSize"
  | "reducedMotion"
  | "paintArea"
  | "rasterScene"
  | "pendingFocusRef"
  | "setSelection"
  | "selectionNodeSet"
  | "selectedStructureId"
  | "setSelectedStructureId"
  | "editingNodeId"
  | "focusedCard"
  | "connecting"
  | "gesture"
  | "contentIndex"
  | "edgeIndex"
  | "sceneNodes"
  | "cardBoxes"
  | "branchScroll"
  | "onBranchScroll"
  | "fileInputDrafts"
  | "quoteState"
  | "derivedStructure"
  | "childTree"
  | "activeHubLayout"
  | "staffTarget"
  | "renderNodeCard"
  | "createCanvasNode"
  | "returnWindow"
  | "openTeam"
>;

export const NodesLayer = memo(function NodesLayer(props: NodesLayerProps) {
  const {
    snapshot,
    bridge,
    lod,
    keepExpandedIds,
    vpSize,
    reducedMotion,
    paintArea,
    rasterScene,
    pendingFocusRef,
    setSelection,
    selectionNodeSet,
    selectedStructureId,
    setSelectedStructureId,
    editingNodeId,
    focusedCard,
    connecting,
    gesture,
    contentIndex,
    edgeIndex,
    sceneNodes,
    cardBoxes,
    branchScroll,
    onBranchScroll,
    fileInputDrafts,
    quoteState,
    derivedStructure,
    childTree,
    activeHubLayout,
    staffTarget,
    renderNodeCard,
    createCanvasNode,
    returnWindow,
    openTeam,
  } = props;
  const store = useCanvasInteractionStore();
  const mounted = useOverviewMounts(sceneNodes, paintArea, lod, keepExpandedIds, vpSize, reducedMotion);
  return (
    <>
      <div className="fs-nodes-layer">
        {/* 4-Tier Derived Structure Cards (Project -> Branch -> Worktree -> SubAgent) */}
        <div className="fs-structure-slots">
        <span hidden />
        {(!lod ? derivedStructure.cards : [])
          .filter((sc) => intersects(sc.box, paintArea))
          .map((sc) => (
            <div
              key={sc.id}
              className={`fs-struct-card fs-struct-${sc.kind} ${selectedStructureId === sc.id ? "selected" : ""}`}
              style={{
                left: sc.box.x,
                top: sc.box.y,
                width: sc.box.w,
                height: sc.box.h,
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                setSelectedStructureId(sc.id);
                setSelection({ nodes: [], groups: [], edge: null });
              }}
              onDoubleClick={(ev) => {
                ev.stopPropagation();
                if (sc.kind === "branch" || sc.kind === "worktree") {
                  createCanvasNode(
                    "git",
                    {
                      x: sc.box.x + sc.box.w + 200,
                      y: sc.box.y + 80,
                    },
                    {
                      workspaceId: sc.workspaceId,
                      cwd: sc.worktreePath || sc.cwd,
                      branch: sc.branch,
                      worktreePath: sc.worktreePath,
                    },
                  );
                }
              }}
            >
              <div className="fs-struct-head">
                <Icon name={kindIconName(sc.kind)} />
                <strong className="user-content">{sc.title}</strong>
                {sc.badge && (
                  <span className="fs-struct-badge">{sc.badge}</span>
                )}
                <button
                  type="button"
                  className="icon-button"
                  title={t("newAgent")}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    createCanvasNode(
                      "agent",
                      {
                        x: sc.box.x + sc.box.w + 220,
                        y: sc.box.y + 80,
                      },
                      {
                        workspaceId: sc.workspaceId,
                        cwd: sc.worktreePath || sc.cwd,
                        branch: sc.branch,
                        worktreePath: sc.worktreePath,
                      },
                    );
                  }}
                >
                  <Icon name="plus" />
                </button>
              </div>
              <small className="fs-struct-sub user-content">
                {sc.subtitle}
              </small>
            </div>
          ))}

        <ChildCards
          cards={(lod ? [] : childTree.cards).filter((card) =>
            intersects(card.box, paintArea),
          )}
          onOpen={(card) =>
            card.member
              ? openTeam(card.agentNodeId, card.sessionId)
              : bridge.openChat(card.sessionId)
          }
        />
        </div>

        {sceneNodes.map(({ n, b }) => {
          const inView =
            intersects(b, paintArea) ||
            n.id === focusedCard ||
            n.id === editingNodeId ||
            n.id === pendingFocusRef.current;
          const whitelist = shouldRenderDomInLod(n, keepExpandedIds);
          const visible = inView && (whitelist || mounted.has(n.id));
          if (n.window) {
            if (!visible) return null;
            return (
              <div
                key={`stub-${n.id}`}
                ref={element => store.registerElement(n.id, element)}
                className="window-stub"
                style={{
                  left: n.x,
                  top: n.y,
                  width: b.w,
                  height: b.h,
                }}
              >
                <span>
                  <Icon name="pop" />
                  <strong className="user-content">{n.title}</strong>
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => returnWindow(n.id)}
                >
                  <Icon name="chev" />
                  <span>{t("returnCanvas")}</span>
                </button>
              </div>
            );
          }
          const patch = gesture?.nodes?.get(n.id);
          const translating =
            patch &&
            Object.keys(patch).every(
              (key) => key === "x" || key === "y",
            );
          const node = translating
            ? contentIndex.nodesById.get(n.id)!
            : n;
          const layout = cardBoxes(node);
          // Fade the existing full shell without rebuilding it as a compact DOM card.
          const semantic = lod && !visible;
          const cardBox = layout[Number(semantic)];
          const snapPortId = connecting?.snappedTarget?.nodeIds.includes(
            n.id,
          )
            ? (connecting.snappedTarget.portId ??
              (connecting.anchor.direction === "in" ? "out" : "in"))
            : undefined;
          return (
            <ViewportCard
              key={n.id}
              node={node}
              visible={visible}
              keepSlot={inView}
              box={cardBox}
              prepare={false}
              rasterScene={rasterScene}
              dx={n.x - node.x}
              dy={n.y - node.y}
              semantic={
                semantic &&
                ((node.kind !== "detail" && node.kind !== "role") ||
                  !!cardBox.compact)
              }
              branchOffset={branchScroll.get(node.id)}
              onBranchScroll={onBranchScroll}
              selected={selectionNodeSet.has(n.id)}
              snapPortId={snapPortId}
              fileDraft={
                n.kind === "file"
                  ? (fileInputDrafts[n.id] ?? "")
                  : undefined
              }
              hubKind={
                activeHubLayout?.nodeId === n.id
                  ? activeHubLayout.kind
                  : undefined
              }
              staffSnapped={staffTarget === n.id}
              quoteText={
                quoteState?.nodeId === n.id
                  ? quoteState.text
                  : undefined
              }
              render={renderNodeCard}
              snapshot={snapshot}
              incoming={edgeIndex.incoming.get(n.id)}
            />
          );
        })}
      </div>
    </>
  );
});
