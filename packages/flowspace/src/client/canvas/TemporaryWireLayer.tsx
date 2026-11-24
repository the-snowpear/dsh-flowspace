import { memo, useLayoutEffect, useRef } from "react";
import { staffPath } from "../childTree.ts";
import { routePath } from "../wireRouting.ts";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";

type Props = Pick<CanvasWorldProps, "connecting" | "prefs" | "routingBoxes" | "staffDrag" | "staffTip" | "staffTarget">;

export const TemporaryWireLayer = memo(function TemporaryWireLayer({ connecting, prefs, routingBoxes, staffDrag, staffTip, staffTarget }: Props) {
  const group = useRef<SVGGElement>(null);
  const store = useCanvasInteractionStore();
  const active = Boolean(connecting || (staffDrag && staffTip));
  useLayoutEffect(() => {
    if (!active) return;
    const apply = () => {
      const view = store.getCamera();
      group.current?.setAttribute("transform", `translate(${view.x},${view.y}) scale(${view.zoom})`);
    };
    apply();
    return store.subscribeCamera(apply);
  }, [store, active]);
  if (!active) return null;
  const target = connecting?.snappedTarget?.point;
  const tip = target ?? connecting?.current;
  const path = connecting && routePath(
    connecting.anchor.direction === "in" ? tip! : connecting.fromPoint,
    connecting.anchor.direction === "in" ? connecting.fromPoint : tip!,
    { kind: connecting.kind, mode: prefs.wireRouting, obstacles: target ? routingBoxes : [], freeEnd: !target,
      waypoints: connecting.snappedTarget?.isOriginalTarget ? connecting.reconnectingEdge?.waypoints : undefined },
  );
  const disconnect = connecting?.reconnectingEdge && !target;
  return <svg className="fs-temp-wire-stage" aria-hidden="true"><g ref={group}>
    {connecting && <g className="fs-temp-wire-group">
      <path className={`edge-path temporary-edge-glow edge-${connecting.kind} ${disconnect ? "is-disconnecting" : ""}`} d={path!} />
      <path className={`edge-path temporary-edge edge-${connecting.kind} ${disconnect ? "is-disconnecting" : ""}`} d={path!} />
      <circle cx={connecting.fromPoint.x} cy={connecting.fromPoint.y} r={4} className="fs-wire-origin-dot" />
      {target && <circle cx={tip!.x} cy={tip!.y} r={11} className="fs-wire-snap-halo" />}
      <circle cx={tip!.x} cy={tip!.y} r={target ? 5.5 : 4.6}
        className={`fs-wire-plug-tip ${target ? "is-snapped" : disconnect ? "is-disconnecting" : ""}`} />
    </g>}
    {staffDrag && staffTip && <path className="edge-path fs-staff-line fs-staff-temp" data-snapped={!!staffTarget || undefined}
      d={staffPath(staffDrag.teamId ? staffDrag.anchor : staffTip, staffDrag.teamId ? staffTip : staffDrag.anchor)} />}
  </g></svg>;
});
