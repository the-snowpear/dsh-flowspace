import { useEffect, useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import { canInsertFanout } from "../../core/fanout.ts";
import { staffPath } from "../childTree.ts";
import { sampleWirePath } from "../sceneWires.ts";
import { toWorld } from "../geometry.ts";
import { t } from "../i18n.ts";
import { insertWireWaypoint } from "../wireRouting.ts";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";

const DOM_TARGETS = ".node, .fs-struct-card, .workflow-group, .floating-window, .edge-tag, .exchange-tag, .waypoint, .fs-input-satellite, .fs-hub-corridor, .fs-canvas-controls, .fs-minimap, .offscreen-indicator, .fs-welcome-card, .fs-overview-actions, .fs-overview-port, button, input, textarea, [contenteditable]";

export interface WireHoverPoint {
  x: number;
  y: number;
  blocked: boolean;
  tag?: string;
  staff?: string;
}

export function useWirePointer(props: CanvasWorldProps) {
  const store = useCanvasInteractionStore();
  const frame = useRef(0);
  const pointer = useRef<WireHoverPoint>();
  const down = useRef<{ x: number; y: number; button: number; shift: boolean; ctrl: boolean }>();
  const byId = useMemo(() => new Map(props.wireLayouts.map(wire => [wire.edge.id, wire])), [props.wireLayouts]);
  const candidates = useMemo(() => new Set(byId.keys()), [byId]);
  const staffing = useMemo(() => props.staffWires.map(wire => ({ id: wire.id, points: sampleWirePath(staffPath(wire.from, wire.to)) })), [props.staffWires]);
  const latest = useRef({ props, candidates, staffing });
  latest.current = { props, candidates, staffing };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    if (props.spacePressed || props.tool === "hand" || props.connecting) {
      const vp = props.viewportRef.current;
      if (vp && vp.style.cursor) vp.style.cursor = "";
    }
  }, [props.spacePressed, props.tool, props.connecting, props.viewportRef]);
  const world = (x: number, y: number) => {
    const vp = latest.current.props.viewportRef.current;
    return vp ? toWorld(store.getCamera(), vp.getBoundingClientRect(), x, y) : { x: 0, y: 0 };
  };
  const blocked = (event: MouseEvent) => !!(event.target as Element).closest(DOM_TARGETS) ||
    latest.current.props.spacePressed || latest.current.props.tool === "hand" ||
    !!latest.current.props.connecting || !!latest.current.props.staffDrag;
  const hit = (x: number, y: number) => {
    const zoom = store.getCamera().zoom;
    if (!(zoom > 0)) return null;
    return latest.current.props.wireScene.cache.hitTestEdge(world(x, y), 9 / zoom, latest.current.candidates);
  };
  const staffAt = (x: number, y: number) => {
    const zoom = store.getCamera().zoom;
    if (!(zoom > 0)) return undefined;
    const point = world(x, y);
    let best = (9 / zoom) ** 2;
    let id: string | undefined;
    for (const wire of latest.current.staffing) {
      for (let i = 1; i < wire.points.length; i++) {
        const a = wire.points[i - 1].point, b = wire.points[i].point;
        const dx = b.x - a.x, dy = b.y - a.y;
        const length = dx * dx + dy * dy;
        const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
        const distance = (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2;
        if (distance <= best) { best = distance; id = wire.id; }
      }
    }
    return id;
  };
  const edgeAt = (event: MouseEvent) => {
    if (blocked(event) || store.getDrag()) return;
    const result = hit(event.clientX, event.clientY);
    return result && byId.get(result.edgeId);
  };
  const readHoverPoint = (event: PointerEvent): WireHoverPoint => {
    const target = event.target as HTMLElement;
    return {
      x: event.clientX, y: event.clientY, blocked: blocked(event),
      tag: target.closest<HTMLElement>(".edge-tag,.fs-input-satellite,.waypoint,.port[data-edge-id]")?.dataset.edgeId,
      staff: target.closest<HTMLElement>("[data-staff-id]")?.dataset.staffId,
    };
  };
  const evaluateHover = (point: WireHoverPoint) => {
    const vp = latest.current.props.viewportRef.current;
    if (store.getDrag() || store.getCamera().moving || latest.current.props.connecting) {
      if (vp && vp.style.cursor) vp.style.cursor = "";
      return;
    }
    const id = point.tag ?? (point.blocked ? null : hit(point.x, point.y)?.edgeId ?? null);
    const staff = point.staff ?? (!point.blocked && !id ? staffAt(point.x, point.y) : undefined);
    store.setHover({ edgeId: id, portKey: staff ? `staff:${staff}` : null });
    if (vp) vp.style.cursor = !point.blocked && (id || staff) ? "pointer" : "";
  };
  const cancelHover = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  };
  const leave = () => {
    cancelHover();
    down.current = undefined;
    store.setHover({ edgeId: null, portKey: null });
    const vp = latest.current.props.viewportRef.current;
    if (vp) vp.style.cursor = "";
  };
  return {
    readHoverPoint,
    evaluateHover,
    cancelHover,
    pointerDown(event: PointerEvent) {
      down.current = { x: event.clientX, y: event.clientY, button: event.button, shift: event.shiftKey, ctrl: event.ctrlKey };
      return event.button === 0 && !event.shiftKey && !event.ctrlKey && !blocked(event) && !!hit(event.clientX, event.clientY);
    },
    pointerMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      pointer.current = readHoverPoint(event);
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (pointer.current) evaluateHover(pointer.current);
      });
    },
    pointerLeave: leave,
    pointerCancel: leave,
    click(event: MouseEvent) {
      const start = down.current;
      down.current = undefined;
      if (!start || start.button !== 0 || start.shift || start.ctrl || event.button !== 0 || event.shiftKey || event.ctrlKey) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 3) return;
      const wire = edgeAt(event);
      if (!wire) return;
      event.stopPropagation();
      props.setSelection({ nodes: [], groups: [], edge: wire.edge.id });
      props.setInspectorOpen(true);
    },
    doubleClick(event: MouseEvent) {
      const wire = edgeAt(event);
      if (!wire) return false;
      event.stopPropagation();
      props.editEdge(wire.edge.id, { waypoints: insertWireWaypoint(wire.edge.waypoints ?? [], wire.geom, world(event.clientX, event.clientY)) });
      return true;
    },
    contextMenu(event: MouseEvent) {
      const wire = edgeAt(event);
      if (wire) {
        event.preventDefault();
        event.stopPropagation();
        const point = world(event.clientX, event.clientY);
        const { edge, geom } = wire;
        props.openAnchoredMenu({ x: event.clientX, y: event.clientY }, [
          { label: t("addWaypoint"), icon: "plus", fn: () => props.editEdge(edge.id, {
            waypoints: insertWireWaypoint(edge.waypoints ?? [], geom, point),
          }) },
          ...(canInsertFanout(props.doc, edge) ? [{ label: t("flow_insert_fanout"), icon: "fanout", fn: () => props.insertFanout(point, null, edge.id) }] : []),
          { label: t("deleteConnection"), icon: "trash", danger: true,
            fn: () => props.edit(doc => { doc.edges = doc.edges.filter(item => item.id !== edge.id); }) },
        ]);
        return true;
      }
      const staff = !blocked(event) && !store.getDrag() && staffAt(event.clientX, event.clientY);
      if (!staff) return false;
      event.preventDefault();
      event.stopPropagation();
      props.openAnchoredMenu({ x: event.clientX, y: event.clientY }, [
        { label: t("teamRoleDisconnect"), icon: "unplug", danger: true, fn: () => props.edit(doc => {
          const role = doc.nodes.find(node => node.id === staff);
          if (role) delete role.staffOf;
        }) },
      ]);
      return true;
    },
  };
}
