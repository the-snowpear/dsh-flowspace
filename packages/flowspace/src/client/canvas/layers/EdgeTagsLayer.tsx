import { memo, useMemo, useSyncExternalStore } from "react";
import { previewDragWire } from "./dragWires.tsx";
import type { WireLayout } from "../ViewportCard.tsx";
import type { CanvasWorldProps } from "../canvasWorldTypes.ts";
import { containerPermission, isContainer } from "../../../core/containers.ts";
import { referenceTitle } from "../../../core/document.ts";
import { collapsedAncestor, exchangeRoute, groupBox, hubFilamentPath, nodeBox } from "../../geometry.ts";
import { t } from "../../i18n.ts";
import { Icon, kindIconName } from "../../icons.tsx";
import { WireListLabel } from "../../nodes/DataPreview.tsx";
import { edgeLabels } from "../../nodes/edgeLabels.ts";
import { isRemovedLaneWire } from "../../nodes/FanoutView.tsx";
import { intersects, runtimeIndex } from "../../sceneModel.ts";
import { useCanvasInteractionStore, useHoveredEdge } from "../interactionStore.ts";

type EdgeTagsLayerProps = Pick<CanvasWorldProps,
  | "doc"
  | "bridge"
  | "lod"
  | "rasterScene"
  | "wireViewport"
  | "selection"
  | "setSelection"
  | "setHoveredEdgeId"
  | "connecting"
  | "nodesById"
  | "keepExpandedIds"
  | "wireLayouts"
  | "exchanges"
  | "activeHubLayout"
  | "edgeVisualState"
  | "editEdge"
  | "startInputEdgeDrag"
  | "startWaypointDrag"
  | "openAnchoredMenu"
  | "openInputHub"
  | "scheduleCloseInputHub"
  | "revealNode"
  | "reportError"
  | "setInspectorOpen"
  | "setPayloadPeek"
  | "setExchangeModal"
  | "snapshot"
>;

export const EdgeTagsLayer = memo(function EdgeTagsLayer(props: EdgeTagsLayerProps) {
  const {
    doc,
    bridge,
    lod,
    rasterScene,
    wireViewport,
    selection,
    setSelection,
    setHoveredEdgeId,
    connecting,
    nodesById,
    keepExpandedIds,
    wireLayouts,
    exchanges,
    activeHubLayout,
    edgeVisualState,
    editEdge,
    startInputEdgeDrag,
    startWaypointDrag,
    openAnchoredMenu,
    openInputHub,
    scheduleCloseInputHub,
    revealNode,
    reportError,
    setInspectorOpen,
    setPayloadPeek,
    setExchangeModal,
    snapshot,
  } = props;
  const runtime = runtimeIndex(snapshot);
  const hoveredEdgeId = useHoveredEdge();
  const visible = useMemo(() => wireLayouts.filter(wire =>
    intersects(wire.extent, wireViewport) &&
    ((!rasterScene && !lod) || ["waiting", "boundary", "skipped"].includes(wire.evState) ||
      wire.edge.id === selection.edge || wire.edge.id === hoveredEdgeId ||
      (!rasterScene && !!wire.edge.waypoints?.length))),
  [wireLayouts, wireViewport, rasterScene, lod, selection.edge, hoveredEdgeId]);
  const renderWire = ({ edge, geom, evState }: WireLayout) => {
    if (connecting?.reconnectingEdge?.id === edge.id) {
      return null;
    }
    const waitingTok = runtime.waitingByEdge.get(edge.id);
    const isSpotlight = hoveredEdgeId === edge.id;
    const showTag =
      (!rasterScene && !lod) || !!waitingTok || evState === "boundary" || evState === "skipped" ||
      selection.edge === edge.id || isSpotlight;
    const waypoints = edge.waypoints ?? [];
    if (!showTag && !waypoints.length) return null;

    const renderTag = () => {
      const edgeSource = nodesById.get(edge.source);
      const edgeTarget = nodesById.get(edge.target);
      const labels = edgeLabels(
        edge,
        edgeSource,
        edgeTarget,
        runtime.latestToken.get(edge.id),
      );
      const permission = containerPermission(edgeSource, edge);
      const modeLabel =
        edge.kind === "event"
          ? `${t(`flow_evt_${edge.event?.mode ?? "end"}`)} · ${edge.event?.kinds.length ?? 1}`
          : evState === "skipped"
            ? t("flow_skipped")
            : edge.kind === "continuation"
              ? t(
                  isContainer(edgeTarget)
                    ? "flow_delivery"
                    : edge.mode,
                )
              : t(edge.always ? "always" : evState);
      const tagTitle =
        edge.kind === "continuation"
          ? `${modeLabel} · ${t(edge.trigger === "auto" ? "automatic" : edge.trigger)}`
          : modeLabel;
      const dimmed = hoveredEdgeId
        ? !isSpotlight
        : selection.edge
          ? selection.edge !== edge.id
          : selection.nodes.length > 0 &&
            !selection.nodes.includes(edge.source) &&
            !selection.nodes.includes(edge.target);

      return (
        <div
          data-edge-id={edge.id}
          className={[
            "edge-tag",
            edge.kind,
            `edge-state-${evState}`,
            dimmed ? "edge-dim" : "",
            geom.tight ? "tight-tag" : "",
            geom.portLabel && "near-ports",
            geom.portLabel?.fit === "snug" && "snug-tag",
            geom.portLabel &&
              (geom.portLabel.fit === "above" || waitingTok) &&
              "above-ports",
            selection.edge === edge.id ? "selected" : "",
            isSpotlight ? "edge-spotlight" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            {
              left: 0,
              top: 0,
              transform: `translate3d(${geom.label.x}px, ${geom.label.y}px, 0)`,
              "--tag-lift":
                geom.portLabel && `${geom.portLabel.lift}px`,
              "--tag-idle-width":
                geom.portLabel &&
                `${geom.portLabel.idleWidth}px`,
            } as React.CSSProperties
          }
        >
          <button
            type="button"
            title={tagTitle}
            aria-label={tagTitle}
            onClick={(ev) => {
              ev.stopPropagation();
              setSelection({
                nodes: [],
                groups: [],
                edge: edge.id,
              });
              setInspectorOpen(true);
            }}
          >
            <Icon
              name={
                edge.kind === "continuation"
                  ? {
                      conclusion: "at",
                      session: "clock",
                      fork: "branch",
                    }[edge.mode]
                  : "at"
              }
            />
            <span className="fs-branch-edge-type">
              {labels.list && nodesById.get(edge.source) ? (
                <WireListLabel
                  edge={edge}
                  source={nodesById.get(edge.source)!}
                  fallback={labels.type}
                />
              ) : (
                labels.type
              )}
            </span>
            <span
              className={
                evState === "skipped"
                  ? "fs-branch-skipped-label"
                  : undefined
              }
            >
              {modeLabel}
            </span>
            {labels.conversion && (
              <span className="fs-branch-edge-convert">
                {labels.conversion}
              </span>
            )}
            {labels.flags && (
              <span className="fs-branch-edge-logic">
                · {labels.flags}
              </span>
            )}
            {permission !== "read" && (
              <small>
                {t(`flow_permission_${permission}`)}
                {edge.ask ? " ?" : ""}
              </small>
            )}
            {edge.kind === "continuation" && (
              <i className="trigger-indicator">
                <Icon
                  name={
                    edge.trigger === "auto"
                      ? "bolt"
                      : edge.trigger === "confirm"
                        ? "pause"
                        : "off"
                  }
                />
              </i>
            )}
          </button>
          <button
            type="button"
            className="edge-xray"
            title={t("inspectPayload")}
            aria-label={t("inspectPayload")}
            onClick={(ev) => {
              ev.stopPropagation();
              const r =
                ev.currentTarget.getBoundingClientRect();
              setPayloadPeek({
                edgeId: edge.id,
                anchor: { x: r.left, y: r.bottom },
              });
            }}
          >
            <Icon name="xray" />
          </button>
          {waitingTok && (
            <button
              type="button"
              className="edge-release"
              title={t("release")}
              aria-label={t("release")}
              onClick={(ev) => {
                ev.stopPropagation();
                void bridge
                  .release(
                    waitingTok.run.id,
                    waitingTok.token.id,
                    true,
                  )
                  .catch(reportError);
              }}
            >
              <Icon name="play" />
              <span>{t("release")}</span>
            </button>
          )}
        </div>
      );
    };

    return (
      <div
        key={edge.id}
        className={isRemovedLaneWire(edge, nodesById) ? "fs-lane-removed" : undefined}
      >
        {showTag && renderTag()}
        {waypoints.map((wp, idx) => (
          <button
            key={`${edge.id}-wp-${idx}`}
            type="button"
            className="waypoint"
            data-edge-id={edge.id}
            aria-label={t("waypoint")}
            style={{ left: wp.x, top: wp.y }}
            onPointerDown={(ev) =>
              startWaypointDrag(ev, edge.id, idx)
            }
            onContextMenu={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              openAnchoredMenu(
                { x: ev.clientX, y: ev.clientY },
                [
                  {
                    label: t("removeWaypoint"),
                    icon: "x",
                    danger: true,
                    fn: () =>
                      editEdge(edge.id, {
                        waypoints: waypoints.filter((_, i) => i !== idx),
                      }),
                  },
                ],
              );
            }}
          />
        ))}
      </div>
    );
  };
  return (
    <>
      <WireTags wires={visible} renderWire={renderWire} semantic={lod} />
      <div
        className="fs-tags-layer"
        data-fs-semantic={lod || undefined}
      >
        {/* Exchange Count Pill Tags */}
        {!lod &&
          exchanges.map((ex) => {
            const fg = collapsedAncestor(doc, ex.from);
            const tg = collapsedAncestor(doc, ex.to);
            if (fg && fg.id === tg?.id) return null;
            const boxA = fg
              ? groupBox(fg)
              : nodeBox(
                  doc.nodes.find((n) => n.id === ex.from)!,
                  lod,
                  keepExpandedIds.has(ex.from),
                );
            const boxB = tg
              ? groupBox(tg)
              : nodeBox(
                  doc.nodes.find((n) => n.id === ex.to)!,
                  lod,
                  keepExpandedIds.has(ex.to),
                );
            const geom = exchangeRoute(boxA, boxB);
            const sent = ex.items.filter(
              (m) => m.fromId === ex.from,
            ).length;
            const back = ex.items.length - sent;
            const latest = ex.items[ex.items.length - 1];
            return (
              <div
                key={`ex-tag-${ex.id}`}
                className={`exchange-tag ${geom.side ? "side" : ""}`}
                style={{ left: geom.label.x, top: geom.label.y }}
              >
                <button
                  type="button"
                  onClick={() => setExchangeModal(ex)}
                >
                  <Icon name="chat" />
                  {sent > 0 && <i className="mc f">↓{sent}</i>}
                  {back > 0 && <i className="mc b">↑{back}</i>}
                  <em>
                    {latest.text.slice(0, 20)}
                    {latest.text.length > 20 ? "…" : ""}
                  </em>
                </button>
              </div>
            );
          })}

        {/* Multi-Input Hover Fan-Out Satellites ("一输入一节点" ComfyUI Deck) */}
        {activeHubLayout && activeHubLayout.progress > 0.01 && (
          <>
            <div
              className="fs-hub-corridor"
              style={{
                left: activeHubLayout.corridorBox.x,
                top: activeHubLayout.corridorBox.y,
                width: Math.max(
                  24,
                  activeHubLayout.portPoint.x -
                    10 -
                    activeHubLayout.corridorBox.x,
                ),
                height: activeHubLayout.corridorBox.h,
              }}
              onPointerEnter={() =>
                openInputHub(
                  activeHubLayout.nodeId,
                  activeHubLayout.kind,
                )
              }
              onPointerLeave={() => scheduleCloseInputHub()}
            />
            <svg
              className="fs-hub-overlay-svg"
              style={{
                left: activeHubLayout.corridorBox.x,
                top: activeHubLayout.corridorBox.y,
                width: activeHubLayout.corridorBox.w,
                height: activeHubLayout.corridorBox.h,
              }}
              viewBox={`${activeHubLayout.corridorBox.x} ${activeHubLayout.corridorBox.y} ${activeHubLayout.corridorBox.w} ${activeHubLayout.corridorBox.h}`}
              aria-hidden="true"
            >
              <circle
                cx={activeHubLayout.portPoint.x}
                cy={activeHubLayout.portPoint.y}
                r={8 + 4 * activeHubLayout.progress}
                className={`fs-hub-port-aura kind-${activeHubLayout.kind}`}
                style={{ opacity: activeHubLayout.progress * 0.85 }}
              />
              {activeHubLayout.satellites.map((sat) => {
                const fPath = hubFilamentPath(
                  sat.wireOut,
                  activeHubLayout.portPoint,
                );
                const isHot = hoveredEdgeId === sat.edge.id;
                const isDim = Boolean(hoveredEdgeId) && !isHot;
                return (
                  <g
                    key={`fil-${sat.edge.id}`}
                    style={{ opacity: sat.opacity }}
                  >
                    <path
                      d={fPath}
                      className={[
                        "fs-hub-filament",
                        `kind-${activeHubLayout.kind}`,
                        isHot ? "is-hot" : "",
                        isDim ? "is-dim" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    <path
                      d={fPath}
                      className={[
                        "fs-hub-filament-pulse",
                        `kind-${activeHubLayout.kind}`,
                        isHot ? "is-hot" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  </g>
                );
              })}
            </svg>
            {activeHubLayout.satellites.map((sat) => {
              const evState = edgeVisualState(sat.edge);
              const isHot = hoveredEdgeId === sat.edge.id;
              const label = referenceTitle(sat.sourceNode, sat.edge);
              const modeGlyph =
                sat.edge.kind === "continuation"
                  ? sat.edge.mode === "fork"
                    ? "⑂"
                    : sat.edge.mode === "session"
                      ? "⏱"
                      : "→"
                  : "@";
              return (
                <button
                  key={`sat-${sat.edge.id}`}
                  type="button"
                  data-edge-id={sat.edge.id}
                  className={[
                    "fs-input-satellite",
                    `kind-${sat.edge.kind}`,
                    `state-${evState}`,
                    isHot ? "is-hot" : "",
                    selection.edge === sat.edge.id
                      ? "is-selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    left: sat.cx,
                    top: sat.cy,
                    width: sat.w,
                    height: sat.h,
                    opacity: sat.opacity,
                    transform: `translate(-50%, -50%) scale(${sat.scale})`,
                  }}
                  title={`${label} · ${t("dragInputTip")}`}
                  onPointerEnter={() => {
                    openInputHub(
                      activeHubLayout.nodeId,
                      activeHubLayout.kind,
                    );
                    setHoveredEdgeId(sat.edge.id);
                  }}
                  onPointerLeave={() => {
                    setHoveredEdgeId((prev) =>
                      prev === sat.edge.id ? null : prev,
                    );
                    scheduleCloseInputHub();
                  }}
                  onPointerDown={(ev) =>
                    startInputEdgeDrag(ev, sat.edge)
                  }
                  onDoubleClick={(ev) => {
                    ev.stopPropagation();
                    revealNode(sat.sourceNode.id);
                  }}
                >
                  <i className="fs-sat-pin fs-sat-pin-in" />
                  <span className="fs-sat-icon">
                    <Icon
                      name={kindIconName(
                        sat.sourceNode.kind,
                        sat.sourceNode.flowType,
                      )}
                    />
                  </span>
                  <span className="fs-sat-title user-content">
                    {label}
                  </span>
                  <kbd className="fs-sat-mode">{modeGlyph}</kbd>
                  <Icon name="grip" className="ic fs-sat-grip" />
                  <i className="fs-sat-pin fs-sat-pin-out" />
                </button>
              );
            })}
          </>
        )}

        {/* Floating ComfyUI Wire Action HUD */}
        {connecting &&
          (connecting.reason ||
            connecting.reconnectingEdge ||
            connecting.snappedTarget) && (
            <div
              className={[
                "fs-wire-hud",
                connecting.snappedTarget
                  ? connecting.snappedTarget.isOriginalTarget
                    ? "hud-neutral"
                    : "hud-snap"
                  : "hud-disconnect",
              ].join(" ")}
              style={{
                left: connecting.current.x,
                top: connecting.current.y - 24,
              }}
            >
              <Icon
                name={connecting.snappedTarget ? "bolt" : "unplug"}
              />
              <span>
                {connecting.reason
                  ? t(connecting.reason)
                  : connecting.reconnectingEdge
                    ? connecting.snappedTarget
                      ? connecting.snappedTarget.isOriginalTarget
                        ? t("keepConnected")
                        : t("reconnectTo", {
                            name: connecting.snappedTarget.label,
                          })
                      : t("dropToDisconnect")
                    : t("connectTo", {
                        name: connecting.snappedTarget?.label ?? "",
                      })}
              </span>
            </div>
          )}
      </div>
    </>
  );
});

const noopSubscribe = () => () => {};
const nullSnapshot = () => null;

const WireTags = memo(function WireTags({ wires, renderWire, semantic }: {
  wires: WireLayout[];
  renderWire: (wire: WireLayout) => React.ReactNode;
  semantic: boolean;
}) {
  const store = useCanvasInteractionStore();
  // A scene without visible capsules has no per-frame React subscription.
  const drag = useSyncExternalStore(wires.length ? store.subscribeDrag : noopSubscribe,
    wires.length ? store.getDrag : nullSnapshot);
  const resolved = useSyncExternalStore(wires.length ? store.subscribeDragRoutes : noopSubscribe,
    wires.length ? store.getDragRoutes : nullSnapshot);
  return <div className={drag ? "fs-tags-layer fs-wire-labels fs-live-edge-tags" : "fs-tags-layer fs-wire-labels"}
    data-fs-semantic={semantic || undefined}>
    {wires.map(wire => {
      if (!drag?.affectedEdgeIds.has(wire.edge.id)) return renderWire(wire);
      const current = previewDragWire(wire, drag);
      const routed = resolved?.drag === drag && resolved.routes.get(wire.edge.id);
      return renderWire(routed ? { ...current, geom: routed.geom, extent: routed.extent } : current);
    })}
  </div>;
});
