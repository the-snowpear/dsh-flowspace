import { useEffect, useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import { BoxIndex } from "../boxIndex.ts";
import { toWorld, type Box } from "../geometry.ts";
import { overviewGroupBox, type OverviewCard, type OverviewScene } from "./overviewScene.ts";
import type { OverviewPort } from "./OverviewCardAtlas.ts";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";
import { useWirePointer, type WireHoverPoint } from "./useWirePointer.ts";

const DOM_TARGETS = ".node, .fs-struct-card, .floating-window, .edge-tag, .exchange-tag, .group-header, .composite, .waypoint, .fs-input-satellite, .fs-hub-corridor, .fs-canvas-controls, .fs-minimap, .offscreen-indicator, .fs-welcome-card, .fs-overview-actions, .fs-overview-port, button, input, textarea, [contenteditable]";
type Point = { x: number; y: number };
export type OverviewHit = { card: OverviewCard; port?: OverviewPort };

/** Geometric broad phase, with port precedence over cards and group headers. */
export class CanvasPointerDispatcher {
  private groups = new BoxIndex<string>();
  constructor(readonly scene: OverviewScene, groups: { id: string; box: Box }[]) {
    for (const group of groups) this.groups.set(group.id, { ...group.box, h: 42 });
  }
  cardAt(point: Point, zoom: number): OverviewHit | undefined {
    if (!(zoom > 0)) return undefined;
    const radius = 12 / zoom;
    const candidates = this.scene.index.query({ x: point.x - radius, y: point.y - radius, w: radius * 2, h: radius * 2 }).reverse();
    let nearest: OverviewHit | undefined;
    let distance = radius;
    for (const id of candidates) {
      const card = this.scene.cards.get(id)!;
      for (const port of card.visual.ports) {
        const gap = Math.hypot(card.box.x + port.x - point.x, card.box.y + port.y - point.y);
        if (gap <= distance) { nearest = { card, port }; distance = gap; }
      }
    }
    if (nearest) return nearest;
    for (const id of candidates) {
      const card = this.scene.cards.get(id)!, box = card.box;
      if (point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h) return { card };
    }
  }
  groupAt(point: Point) {
    return this.groups.query({ x: point.x, y: point.y, w: 0.01, h: 0.01 }).at(-1);
  }
}

export function useCanvasPointerDispatcher(props: CanvasWorldProps, overviewScene: OverviewScene) {
  const store = useCanvasInteractionStore();
  const wires = useWirePointer(props);
  const frame = useRef(0);
  const last = useRef<{ x: number; y: number; blocked: boolean; wire: WireHoverPoint }>();
  const dispatcher = useMemo(() => new CanvasPointerDispatcher(overviewScene,
    props.visibleGroups.map(group => ({ id: group.id, box: overviewGroupBox(group, props, props.lod) }))),
  [overviewScene, props.visibleGroups, props.groupPorts, props.membersOf, props.keepExpandedIds, props.doc, props.snapshot, props.nodesById, props.lod]);
  const latest = useRef({ props, dispatcher, wires });
  latest.current = { props, dispatcher, wires };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const blocked = (event: MouseEvent) => !!(event.target as Element).closest(DOM_TARGETS);
  const world = (point: Point) => {
    const vp = latest.current.props.viewportRef.current;
    return vp ? toWorld(store.getCamera(), vp.getBoundingClientRect(), point.x, point.y) : { x: 0, y: 0 };
  };
  const enabled = () => store.getCamera().lod && !latest.current.props.spacePressed && latest.current.props.tool !== "hand";
  const hit = (event: MouseEvent) => !blocked(event) && enabled()
    ? latest.current.dispatcher.cardAt(world({ x: event.clientX, y: event.clientY }), store.getCamera().zoom) : undefined;
  const expand = (card: OverviewCard) => {
    if (card.node) {
      props.selectNode(card.id);
      if (!card.node.expanded) props.toggleNodeForm(card.id);
    } else if (card.kind === "child") {
      const child = props.childTree.cards.find(item => item.id === card.id);
      if (!child) return;
      if (child.member) props.openTeam(child.agentNodeId, child.sessionId);
      else props.bridge.openChat(child.sessionId);
    } else {
      const structure = props.derivedStructure.cards.find(item => item.id === card.id);
      if (!structure || (structure.kind !== "branch" && structure.kind !== "worktree")) return;
      props.createCanvasNode("git", { x: card.box.x + card.box.w + 200, y: card.box.y + 80 }, {
        workspaceId: structure.workspaceId, cwd: structure.worktreePath || structure.cwd, branch: structure.branch, worktreePath: structure.worktreePath,
      });
    }
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    store.setHover({ nodeId: null, edgeId: null, portKey: null });
    latest.current.wires.pointerLeave();
  };
  return {
    pointerDown(event: PointerEvent) {
      const target = hit(event);
      if (target && event.button === 0) {
        event.stopPropagation();
        if (target.port && target.card.node) {
          const { port, card } = target;
          const incoming = port.direction === "in" && props.edgeIndex.incoming.get(card.id)?.filter(edge =>
            edge.kind === port.kind && (edge.targetPort ?? "in") === port.id).at(-1);
          if (incoming) props.startInputEdgeDrag(event, incoming);
          else props.startPortDrag(event, [card.id], port.kind, undefined, undefined, port.id, port.direction);
        } else if (target.card.node) props.startNodeMove(event, target.card.id);
        else { props.setSelectedStructureId(target.card.id); props.setSelection({ nodes: [], groups: [], edge: null }); }
        return true;
      }
      if (wires.pointerDown(event)) return true;
      const group = !blocked(event) && enabled() && dispatcher.groupAt(world({ x: event.clientX, y: event.clientY }));
      if (group && event.button === 0) { props.startGroupMove(event, group); return true; }
      return false;
    },
    pointerMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const element = event.target as Element;
      if (element.closest(".fs-overview-actions,.fs-overview-port")) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        wires.cancelHover();
        return;
      }
      last.current = {
        x: event.clientX, y: event.clientY, blocked: blocked(event),
        wire: wires.readHoverPoint(event),
      };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const vp = latest.current.props.viewportRef.current;
        if (store.getDrag() || store.getCamera().moving || latest.current.props.connecting) {
          if (vp && vp.style.cursor) vp.style.cursor = "";
          return;
        }
        const point = last.current;
        if (!point) return;
        const target = !point.blocked && enabled()
          ? latest.current.dispatcher.cardAt(world(point), store.getCamera().zoom) : undefined;
        if (target) {
          store.setHover({
            nodeId: target.card.id,
            edgeId: null,
            portKey: target.port ? `${target.card.id}:${target.port.kind}:${target.port.direction}:${target.port.id}` : null,
          });
          if (vp) vp.style.cursor = target.port ? "crosshair" : "pointer";
          return;
        }
        store.setHover({ nodeId: null });
        latest.current.wires.evaluateHover(point.wire);
      });
    },
    pointerLeave: leave,
    pointerCancel: leave,
    click(event: MouseEvent) {
      if (hit(event)) { event.stopPropagation(); return; }
      wires.click(event);
    },
    doubleClick(event: MouseEvent) {
      const target = hit(event);
      if (!target) return wires.doubleClick(event);
      event.stopPropagation();
      expand(target.card);
      return true;
    },
    contextMenu(event: MouseEvent) {
      const target = hit(event);
      if (target?.card.node) {
        event.preventDefault(); event.stopPropagation();
        props.openNodeContextMenu(target.card.node, { x: event.clientX, y: event.clientY });
        return true;
      }
      if (wires.contextMenu(event)) return true;
      const group = !blocked(event) && enabled() && dispatcher.groupAt(world({ x: event.clientX, y: event.clientY }));
      if (!group) return false;
      const groupNode = props.nodesById.get(group);
      if (!groupNode) return false;
      event.preventDefault(); event.stopPropagation();
      props.openGroupContextMenu(groupNode, { x: event.clientX, y: event.clientY });
      return true;
    },
  };
}
