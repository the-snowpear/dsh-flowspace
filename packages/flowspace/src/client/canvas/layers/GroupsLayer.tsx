import { memo } from "react";
import type { CanvasWorldProps } from "../canvasWorldTypes.ts";
import { t } from "../../i18n.ts";
import { Icon, PortMark } from "../../icons.tsx";
import { laneGroupState, LaneMetrics } from "../../nodes/FanoutView.tsx";
import { intersects } from "../../sceneModel.ts";
import { nodeStatusOf } from "../../SurfaceViews.tsx";
import { useCanvasInteractionStore } from "../interactionStore.ts";
import { overviewGroupBox } from "../overviewScene.ts";

type GroupsLayerProps = Pick<CanvasWorldProps,
  | "doc"
  | "snapshot"
  | "lod"
  | "paintArea"
  | "groupsLayerRef"
  | "selection"
  | "connecting"
  | "nodesById"
  | "membersOf"
  | "groupPorts"
  | "visibleGroups"
  | "keepExpandedIds"
  | "editNode"
  | "startGroupMove"
  | "startResize"
  | "startPortDrag"
  | "startInputEdgeDrag"
  | "openGroupContextMenu"
  | "launchScope"
>;

export const GroupsLayer = memo(function GroupsLayer(props: GroupsLayerProps) {
  const {
    doc,
    snapshot,
    lod,
    paintArea,
    groupsLayerRef,
    selection,
    connecting,
    nodesById,
    membersOf,
    groupPorts,
    visibleGroups,
    keepExpandedIds,
    editNode,
    startGroupMove,
    startResize,
    startPortDrag,
    startInputEdgeDrag,
    openGroupContextMenu,
    launchScope,
  } = props;
  const store = useCanvasInteractionStore();
  return (
    <>
      <div ref={groupsLayerRef} className="fs-groups-layer">
        {visibleGroups.map((grp) => {
          const ports = groupPorts.get(grp.id)!;
          const memberNodes = membersOf(grp.id);
          const fan = grp.fanout && nodesById.get(grp.fanout.fanId);
          const laneStats =
            fan && laneGroupState(doc, memberNodes, fan, snapshot?.runs);
          const placeholder =
            !!laneStats &&
            laneStats.total === undefined &&
            !grp.collapsed;
          const box = overviewGroupBox(grp, { doc, snapshot, nodesById, groupPorts, membersOf, keepExpandedIds }, lod);
          if (
            !intersects(box, paintArea) &&
            !selection.groups.includes(grp.id)
          )
            return null;
          const runningCnt = memberNodes.filter((n) =>
            ["running", "settling"].includes(
              nodeStatusOf(snapshot, n.id),
            ),
          ).length;
          const waitingCnt = memberNodes.filter((n) =>
            ["waiting", "input"].includes(
              nodeStatusOf(snapshot, n.id),
            ),
          ).length;

          return (
            <section
              key={grp.id}
              ref={element => store.registerElement(grp.id, element)}
              data-lane-group={fan?.id}
              className={[
                "workflow-group",
                `color-${grp.color ?? "blue"}`,
                grp.collapsed ? "composite" : "",
                laneStats ? "fs-lane-group fsx-motion" : "",
                selection.groups.includes(grp.id) ? "selected" : "",
                grp.parentId ? "nested-group" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
              }}
              onContextMenu={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                openGroupContextMenu(grp, {
                  x: ev.clientX,
                  y: ev.clientY,
                });
              }}
            >
              {laneStats && grp.collapsed && (
                <span
                  className="fs-lane-stack-face"
                  aria-hidden="true"
                />
              )}
              <header
                className="group-header"
                data-fs-semantic={lod || undefined}
                onPointerDown={(ev) => {
                  if ((ev.target as HTMLElement).closest("button"))
                    return;
                  startGroupMove(ev, grp.id);
                }}
              >
                <i className="group-mark" />
                <strong className="user-content">
                  {grp.titleKey ? t(grp.titleKey) : grp.title}
                </strong>
                {laneStats ? (
                  <LaneMetrics state={laneStats} />
                ) : (
                  <span>
                    {t("nodesCount", { count: memberNodes.length })}
                  </span>
                )}
                <div>
                  <button
                    type="button"
                    className="group-run"
                    onClick={() =>
                      launchScope({
                        kind: "group",
                        nodeIds: [grp.id],
                      })
                    }
                  >
                    <Icon name="play" />
                    <span>{t("run")}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={t(grp.collapsed ? "expand" : "collapse")}
                    onClick={() =>
                      editNode(grp.id, {
                        collapsed: !grp.collapsed,
                      })
                    }
                  >
                    <Icon name={grp.collapsed ? "card" : "off"} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={t("inspector")}
                    onClick={(ev) =>
                      openGroupContextMenu(grp, ev.currentTarget)
                    }
                  >
                    <Icon name="more" />
                  </button>
                </div>
              </header>

              {grp.collapsed && (
                <>
                  <div className="composite-ports">
                    {(["in", "out"] as const).map((dir) => (
                      <div key={dir}>
                        {ports
                          .filter((p) => p.direction === dir)
                          .map((port) => {
                            const proxyIncoming =
                              dir === "in"
                                ? doc.edges.filter(
                                    (e) =>
                                      e.kind === port.kind &&
                                      port.nodes.includes(e.target) &&
                                      (e.targetPort ?? "in") ===
                                        (port.portId ?? "in") &&
                                      !memberNodes.some(
                                        (m) => m.id === e.source,
                                      ),
                                  )
                                : [];
                            return (
                              <button
                                key={port.id}
                                type="button"
                                data-port-id={port.portId ?? dir}
                                data-port-kind={port.kind}
                                data-port-direction={dir}
                                data-proxy-nodes={port.nodes.join(",")}
                                className={`composite-port-row composite-${dir} ${connecting?.kind === port.kind && dir === "in" ? "port-target" : ""} ${proxyIncoming.length ? "is-draggable-in" : ""}`}
                                onPointerDown={
                                  dir === "out"
                                    ? (ev) =>
                                        startPortDrag(
                                          ev,
                                          port.nodes,
                                          port.kind,
                                          undefined,
                                          undefined,
                                          port.portId,
                                        )
                                    : proxyIncoming.length
                                      ? (ev) =>
                                          startInputEdgeDrag(
                                            ev,
                                            proxyIncoming[
                                              proxyIncoming.length - 1
                                            ],
                                          )
                                      : (ev) =>
                                          startPortDrag(
                                            ev,
                                            port.nodes,
                                            port.kind,
                                            undefined,
                                            undefined,
                                            port.portId,
                                            "in",
                                          )
                                }
                              >
                                <PortMark kind={port.kind} proxy />
                                <span>{port.name}</span>
                              </button>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                  <div className="composite-summary">
                    <span>
                      {t("nodesCount", {
                        count: memberNodes.length,
                      })}
                    </span>
                    <span>
                      {runningCnt} {t("running")} · {waitingCnt}{" "}
                      {t("waiting")}
                    </span>
                  </div>
                </>
              )}

              {placeholder && (
                <span className="fs-lane-placeholder">
                  {t("flow_lane_runtime")}
                </span>
              )}
              {grp.templateId && (
                <button
                  type="button"
                  className="template-association"
                  onClick={(ev) =>
                    openGroupContextMenu(grp, ev.currentTarget)
                  }
                >
                  <Icon name="box" />
                  <span>
                    {t("templateLinked", {
                      version: grp.templateRevision ?? 1,
                    })}
                  </span>
                </button>
              )}

              {!grp.collapsed && (
                <button
                  type="button"
                  className="group-resizer"
                  aria-label={t("expand")}
                  onPointerDown={(ev) =>
                    startResize(ev, grp.id, "group")
                  }
                />
              )}
            </section>
          );
        })}
      </div>
    </>
  );
});
