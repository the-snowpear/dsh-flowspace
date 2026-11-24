import { memo, useSyncExternalStore } from "react";
import type { CanvasWorldProps } from "../canvasWorldTypes.ts";
import { bounds, clamp, collapsedAncestor, groupBox, MOTION, nodeBox, zoomAt, type Box } from "../../geometry.ts";
import { t } from "../../i18n.ts";
import { Icon } from "../../icons.tsx";
import { MiniMapNodes } from "../../MiniMapNodes.tsx";
import { useCanvasInteractionStore } from "../interactionStore.ts";
import { miniViewRect, type MiniFrame } from "../viewportMath.ts";

export function MarqueeOverlay() {
  const store = useCanvasInteractionStore();
  const marquee = useSyncExternalStore(store.subscribeMarquee, store.getMarquee);
  if (!marquee) return null;
  return <div className="fs-marquee" style={{
    left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h,
  }} />;
}

type CanvasHudLayerProps = Pick<CanvasWorldProps,
  | "doc"
  | "docRef"
  | "snapshot"
  | "routeName"
  | "displayedTheme"
  | "view"
  | "vpSize"
  | "lod"
  | "rasterScene"
  | "tool"
  | "setTool"
  | "minimapOpen"
  | "setMinimapOpen"
  | "historyCount"
  | "futureCount"
  | "viewportRef"
  | "zoomLabelRef"
  | "miniViewportRef"
  | "miniFrameRef"
  | "minimapBoxes"
  | "keepExpandedIds"
  | "waitingAgentNodes"
  | "isNodeVisible"
  | "trackPointer"
  | "revealNode"
  | "animateView"
  | "fitView"
  | "performUndo"
  | "setHelpModal"
>;

export const CanvasHudLayer = memo(function CanvasHudLayer(props: CanvasHudLayerProps) {
  const {
    doc,
    docRef,
    snapshot,
    routeName,
    displayedTheme,
    view,
    vpSize,
    lod,
    rasterScene,
    tool,
    setTool,
    minimapOpen,
    setMinimapOpen,
    historyCount,
    futureCount,
    viewportRef,
    zoomLabelRef,
    miniViewportRef,
    miniFrameRef,
    minimapBoxes,
    keepExpandedIds,
    waitingAgentNodes,
    isNodeVisible,
    trackPointer,
    revealNode,
    animateView,
    fitView,
    performUndo,
    setHelpModal,
  } = props;
  return (
    <>
      {routeName === "canvas" && (
        <div className="fs-indicators">
          {waitingAgentNodes
            .filter((n) => isNodeVisible(n, true))
            .map((n) => {
              const cg = collapsedAncestor(doc, n.id);
              const box = cg
                ? groupBox(cg)
                : nodeBox(n, lod, keepExpandedIds.has(n.id));
              const cx = (box.x + box.w / 2) * view.zoom + view.x;
              const cy = (box.y + box.h / 2) * view.zoom + view.y;
              if (
                cx > 0 &&
                cy > 28 &&
                cx < vpSize.width &&
                cy < vpSize.height - 44
              ) {
                return null;
              }
              const ix = clamp(cx, 12, vpSize.width - 12);
              const iy = clamp(cy, 54, vpSize.height - 64);
              const onRight = ix > vpSize.width / 2;
              return (
                <button
                  key={`ind-${n.id}`}
                  type="button"
                  className={`offscreen-indicator ${onRight ? "indicator-right" : ""}`}
                  style={{ left: ix, top: iy }}
                  title={t("locateWaiting")}
                  onClick={() => revealNode(n.id)}
                >
                  <Icon name="pause" />
                  <span className="user-content">{n.title}</span>
                  <Icon name="chev" />
                </button>
              );
            })}
        </div>
      )}

      {/* Interactive SVG Minimap */}
      {routeName === "canvas" &&
        minimapOpen &&
        (() => {
          const mw = 192;
          const nodeBoxes = minimapBoxes;
          const visRect: Box = {
            x: -view.x / view.zoom,
            y: -view.y / view.zoom,
            w: vpSize.width / view.zoom,
            h: vpSize.height / view.zoom,
          };
          /* Frame the content, not the camera: a zoomed-out view used to swallow the
             map in empty space. The camera only widens the frame once it has
             wandered off the content entirely, so "where am I" is never lost. */
          const content = nodeBoxes.length
            ? bounds(nodeBoxes.map((x) => x.b))
            : visRect;
          const pad = Math.max(24, Math.max(content.w, content.h) * 0.05);
          let full: Box = {
            x: content.x - pad,
            y: content.y - pad,
            w: content.w + pad * 2,
            h: content.h + pad * 2,
          };
          const camOnContent =
            visRect.x < full.x + full.w &&
            visRect.x + visRect.w > full.x &&
            visRect.y < full.y + full.h &&
            visRect.y + visRect.h > full.y;
          if (!camOnContent) full = bounds([full, visRect]);
          // The map's height follows the content's aspect, so there is no letterbox.
          const mh = Math.round(clamp((mw * full.h) / full.w, 64, 132));
          const sc = Math.min(mw / full.w, mh / full.h);
          const ox = (mw - full.w * sc) / 2;
          const oy = (mh - full.h * sc) / 2;
          const frame: MiniFrame = {
            x: full.x,
            y: full.y,
            sc,
            ox,
            oy,
            vw: vpSize.width,
            vh: vpSize.height,
            mw,
            mh,
          };
          miniFrameRef.current = frame;
          const camRect = miniViewRect(frame, view);
          const jumpMinimap = (
            clientX: number,
            clientY: number,
            svgEl: SVGSVGElement,
          ) => {
            const r = svgEl.getBoundingClientRect();
            const wx = full.x + (clientX - r.left - ox) / sc;
            const wy = full.y + (clientY - r.top - oy) / sc;
            const z = docRef.current.viewport.zoom;
            animateView(
              {
                x: vpSize.width / 2 - wx * z,
                y: vpSize.height / 2 - wy * z,
                zoom: z,
              },
              MOTION.region,
            );
          };
          return (
            <div className="fs-minimap" aria-label={t("minimap")}>
              <button
                type="button"
                className="icon-button fs-minimap-close"
                title={t("close")}
                aria-label={t("close")}
                onClick={() => setMinimapOpen(false)}
              >
                <Icon name="x" />
              </button>
              <svg
                viewBox={`0 0 ${mw} ${mh}`}
                style={{ height: mh }}
                onPointerDown={(ev) => {
                  if (ev.button !== 0) return;
                  const svgEl = ev.currentTarget;
                  jumpMinimap(ev.clientX, ev.clientY, svgEl);
                  trackPointer(ev, (next) =>
                    jumpMinimap(next.clientX, next.clientY, svgEl),
                  );
                }}
              >
                <MiniMapNodes
                  boxes={nodeBoxes}
                  snapshot={snapshot}
                  x={full.x}
                  y={full.y}
                  scale={sc}
                  offsetX={ox}
                  offsetY={oy}
                  width={mw}
                  height={mh}
                  theme={displayedTheme}
                  raster={rasterScene}
                />
                <rect
                  ref={miniViewportRef}
                  className="mini-viewport"
                  x={camRect.x}
                  y={camRect.y}
                  width={camRect.w}
                  height={camRect.h}
                  rx={3}
                />
              </svg>
            </div>
          );
        })()}

      {/* Bottom Controls Bar */}
      {routeName === "canvas" && (
        <div
          className={`fs-canvas-controls ${minimapOpen ? "minimap-open" : ""}`}
          role="toolbar"
        >
          <div className="pointer-tools">
            <button
              type="button"
              className={`icon-button ${tool === "pointer" ? "active" : ""}`}
              title={t("pointer")}
              onClick={() => setTool("pointer")}
            >
              <Icon name="pointer" />
            </button>
            <button
              type="button"
              className={`icon-button ${tool === "hand" ? "active" : ""}`}
              title={t("hand")}
              onClick={() => setTool("hand")}
            >
              <Icon name="hand" />
            </button>
            <i />
            <button
              type="button"
              className="icon-button"
              title={t("undo")}
              disabled={!historyCount}
              onClick={() => performUndo(false)}
            >
              <Icon name="undo" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("redo")}
              disabled={!futureCount}
              onClick={() => performUndo(true)}
            >
              <Icon name="redo" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("help")}
              onClick={() => setHelpModal(true)}
            >
              <Icon name="help" />
            </button>
          </div>

          <div className="canvas-hint">
            <span>{t("doubleClickTip")}</span>
            <i>·</i>
            <kbd>Space</kbd>
            <span>{t("pan")}</span>
            <i>·</i>
            <kbd>Shift</kbd>
            <span>{t("rangeSelection")}</span>
          </div>

          <div className="view-tools">
            <button
              type="button"
              className="icon-button"
              title={t("zoom")}
              onClick={() => {
                const rect = viewportRef.current?.getBoundingClientRect();
                if (!rect) return;
                animateView(
                  zoomAt(
                    docRef.current.viewport,
                    rect,
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    1 / 1.2,
                  ),
                  MOTION.region,
                );
              }}
            >
              <Icon name="off" />
            </button>
            <button
              type="button"
              ref={zoomLabelRef}
              className="zoom-label"
              onClick={() => {
                const px = vpSize.width / 2,
                  py = vpSize.height / 2;
                const live = docRef.current.viewport;
                animateView(
                  {
                    x: px - (px - live.x) / live.zoom,
                    y: py - (py - live.y) / live.zoom,
                    zoom: 1,
                  },
                  MOTION.region,
                );
              }}
            >
              {`${Math.round(view.zoom * 100)}%`}
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("zoom")}
              onClick={() => {
                const rect = viewportRef.current?.getBoundingClientRect();
                if (!rect) return;
                animateView(
                  zoomAt(
                    docRef.current.viewport,
                    rect,
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    1.2,
                  ),
                  MOTION.region,
                );
              }}
            >
              <Icon name="plus" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t("fitView")}
              onClick={(ev) => fitView(ev.shiftKey)}
            >
              <Icon name="fit" />
            </button>
            <button
              type="button"
              className={`icon-button ${minimapOpen ? "active" : ""}`}
              title={t("minimap")}
              onClick={() => setMinimapOpen((v) => !v)}
            >
              <Icon name="canvas" />
            </button>
          </div>
        </div>
      )}
    </>
  );
});
