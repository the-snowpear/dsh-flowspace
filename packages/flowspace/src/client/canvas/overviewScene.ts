import type { FlowNode, FlowspaceDocument, FlowspaceSnapshot } from "../../types.ts";
import { descriptorOf } from "../../core/nodes/registry.ts";
import { BoxIndex } from "../boxIndex.ts";
import { groupBox, nodeBox, portY, type Box } from "../geometry.ts";
import { kindIconName } from "../icons.tsx";
import { t } from "../i18n.ts";
import { laneGroupState } from "../nodes/FanoutView.tsx";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import { wirePortIds } from "./canvasGraphOps.ts";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import type { OverviewVisual, OverviewPort } from "./OverviewCardAtlas.ts";

export function shouldRenderDomInLod(node: FlowNode, keepExpandedIds: ReadonlySet<string>) {
  return !!node.pinned || !!node.window || keepExpandedIds.has(node.id);
}

export interface OverviewCard {
  id: string;
  box: Box;
  node?: FlowNode;
  visual: OverviewVisual;
  kind: "node" | "structure" | "child";
}

export function overviewPorts(node: FlowNode, box: Box, edges: CanvasWorldProps["edgeIndex"]): OverviewPort[] {
  const ports: OverviewPort[] = [];
  for (const kind of ["continuation", "reference", "event"] as const) {
    for (const direction of ["in", "out"] as const) {
      if (kind === "event" && direction === "in") continue;
      for (const id of wirePortIds(node, kind, direction)) {
        const status = kind === "event";
        const linked = (direction === "in" ? edges.incoming : edges.outgoing).get(node.id)?.some(edge =>
          edge.kind === kind && ((direction === "in" ? edge.targetPort : edge.sourcePort) ?? direction) === id) ?? false;
        ports.push({ kind, direction, id, linked,
          x: status ? box.w / 2 : direction === "in" ? 0 : box.w,
          y: status ? 0 : portY(node, kind, !!box.compact, id, 0, box.h, direction) });
      }
    }
  }
  return ports;
}

export function overviewGroupBox(
  group: FlowNode,
  props: Pick<CanvasWorldProps, "groupPorts" | "membersOf" | "keepExpandedIds"> & {
    doc?: FlowspaceDocument;
    snapshot?: FlowspaceSnapshot | null;
    nodesById?: Map<string, FlowNode>;
  },
  lod: boolean,
) {
  const ports = props.groupPorts.get(group.id) ?? [];
  const rawBox = groupBox(group, Math.max(ports.filter(p => p.direction === "in").length, ports.filter(p => p.direction === "out").length));
  const members = props.membersOf(group.id);
  let box = lod && !group.collapsed && members.length
    ? {
        ...rawBox,
        h: Math.max(180, ...members.map(node => {
          const child = nodeBox(node, true, props.keepExpandedIds.has(node.id));
          return child.y + child.h - rawBox.y + 24;
        })),
      }
    : rawBox;
  if (!group.collapsed && group.fanout && props.doc && props.nodesById) {
    const fan = props.nodesById.get(group.fanout.fanId);
    const laneStats = fan && laneGroupState(props.doc, members, fan, props.snapshot?.runs);
    if (laneStats && laneStats.total === undefined) {
      const bottom = members.reduce(
        (y, n) => Math.max(y, n.y + nodeBox(n, lod, Boolean(n.pinned || props.keepExpandedIds.has(n.id))).h),
        group.y,
      );
      box = { ...box, h: Math.max(box.h, bottom - group.y + 48) };
    }
  }
  return box;
}

export function buildOverviewScene(props: Pick<CanvasWorldProps,
  "sceneNodes" | "cardBoxes" | "snapshot" | "edgeIndex" | "derivedStructure" | "childTree" | "keepExpandedIds">) {
  const cards = new Map<string, OverviewCard>();
  const index = new BoxIndex<string>();
  const add = (card: OverviewCard) => { cards.set(card.id, card); index.set(card.id, card.box); };
  for (const { n } of props.sceneNodes) {
    if (shouldRenderDomInLod(n, props.keepExpandedIds)) continue;
    const box = nodeBox(n, true);
    const status = nodeStatusOf(props.snapshot, n.id);
    add({ id: n.id, node: n, box, kind: "node", visual: {
      title: n.title, detail: `${t(n.kind === "flow" ? descriptorOf(n.flowType)?.titleKey ?? "flow_view_missing" : `nodeKind_${n.kind}`)} · ${t(status || "draft")}`,
      icon: kindIconName(n.kind, n.flowType), kind: n.kind, status, participation: n.participation,
      width: box.w, height: box.h, ports: overviewPorts(n, box, props.edgeIndex),
    } });
  }
  for (const card of props.derivedStructure.cards) {
    add({ id: card.id, box: card.box, kind: "structure", visual: {
      title: card.title, detail: card.subtitle, icon: kindIconName(card.kind), kind: card.kind,
      status: card.runningCount ? "running" : card.waitingCount ? "waiting" : "", width: card.box.w, height: card.box.h, ports: [],
    } });
  }
  for (const card of props.childTree.cards) {
    add({ id: card.id, box: card.box, kind: "child", visual: {
      title: card.title, detail: card.name, icon: "agent", kind: "sub", status: card.running ? "running" : "",
      width: card.box.w, height: card.box.h, ports: [],
    } });
  }
  return { cards, index };
}

export type OverviewScene = ReturnType<typeof buildOverviewScene>;
