import type { FlowEdge, FlowNode, FlowspaceDocument } from "../../types.ts";
import { canConnect, connectionPort } from "../../core/connect.ts";
import { groupDescendants, newEdge } from "../../core/document.ts";
import { portsOf } from "../../core/nodes/registry.ts";
import { t } from "../i18n.ts";
import type { WireDropContext } from "../QuickCreateMenu.tsx";

export type RouteId =
  | "canvas"
  | "conversation"
  | "workflows"
  | "activity"
  | "settings"
  | "team";

export interface PaletteEntry {
  label: string;
  detail?: string;
  section: string;
  icon: string;
  fn: () => void;
}

export interface QuickCreateState {
  anchor: { x: number; y: number };
  world: { x: number; y: number };
  wire: WireDropContext | null;
}

export interface PayloadPeekState {
  edgeId: string;
  anchor: { x: number; y: number };
}

export type WireEnds = Pick<FlowEdge, "sourcePort" | "targetPort" | "sourceItemKey">;
export type WireAnchor = WireEnds & {
  mode?: FlowEdge["mode"];
  edgeId?: string;
  direction?: "in" | "out";
};

export const HOST_THEME_ATTRS = [
  "data-ds-dark-theme",
  "data-ds-light-theme",
  "data-theme",
  "class",
];

/**
 * Reads the DSH host theme from both `<html>` and `<body>` with one rule set, so the
 * first render and later MutationObserver updates agree (no dark→light flash on mount).
 */
export function detectHostDark(): boolean {
  if (typeof document === "undefined") return true;
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue;
    if (el.hasAttribute("data-ds-dark-theme")) return true;
    if (el.hasAttribute("data-ds-light-theme")) return false;
    const attr = el.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    if (el.classList.contains("dark")) return true;
    if (el.classList.contains("light")) return false;
  }
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
      ),
    )
  );
}

export function wirePortIds(
  node: FlowNode,
  kind: FlowEdge["kind"],
  direction: "in" | "out",
): string[] {
  if (kind === "event") {
    return direction === "in"
      ? wirePortIds(node, "continuation", "in")
      : connectionPort(node, kind, direction)
        ? ["out"]
        : [];
  }
  if (node.kind === "flow") {
    return portsOf(node)
      .filter((port) => port.direction === direction && port.role === kind)
      .map((port) => port.id);
  }
  return connectionPort(node, kind, direction) ? [direction] : [];
}

export function checkDraggedWire(
  fixed: FlowNode,
  candidate: FlowNode,
  kind: FlowEdge["kind"],
  anchor: WireAnchor,
  portId: string | undefined,
  edges: FlowEdge[],
) {
  const ends =
    anchor.direction === "in"
      ? { source: candidate, target: fixed, sourcePort: portId }
      : { source: fixed, target: candidate, targetPort: portId };
  return canConnect({ ...anchor, ...ends, kind, edges });
}

export function matchesWire(
  candidate: FlowEdge,
  edge: Pick<FlowEdge, "source" | "target" | "kind"> & WireEnds,
) {
  return (
    candidate.source === edge.source &&
    candidate.target === edge.target &&
    candidate.kind === edge.kind &&
    candidate.sourceItemKey === edge.sourceItemKey &&
    (candidate.sourcePort ?? "out") === (edge.sourcePort ?? "out") &&
    (candidate.targetPort ?? "in") === (edge.targetPort ?? "in")
  );
}

export function addWire(
  doc: FlowspaceDocument,
  source: FlowNode,
  target: FlowNode,
  kind: FlowEdge["kind"],
  patch: Partial<FlowEdge> = {},
) {
  const edge = { ...newEdge(source.id, target.id, kind), ...patch };
  const check = canConnect({ ...edge, source, target, edges: doc.edges });
  if (check.ok && !doc.edges.some((candidate) => matchesWire(candidate, edge))) {
    doc.edges.push(edge);
  }
}

export function removeCanvasNodes(doc: FlowspaceDocument, selected: string[]) {
  const ids = new Set(selected);
  for (const group of doc.nodes.filter((node) => node.fanout)) {
    if (
      ids.has(group.id) ||
      ids.has(group.fanout!.fanId) ||
      ids.has(group.fanout!.mergeId)
    ) {
      ids.add(group.id);
      for (const id of groupDescendants(doc, group.id)) ids.add(id);
    }
  }
  doc.nodes = doc.nodes.filter((node) => !ids.has(node.id));
  for (const node of doc.nodes) {
    if (node.parentId && ids.has(node.parentId)) delete node.parentId;
  }
  doc.edges = doc.edges.filter(
    (edge) => !ids.has(edge.source) && !ids.has(edge.target),
  );
}

export function linkWireDrop(
  doc: FlowspaceDocument,
  wire: WireDropContext,
  created: FlowNode,
  patch: Partial<FlowEdge> = {},
) {
  const originId =
    wire.direction === "out" ? wire.sourceNode?.id : wire.targetNode?.id;
  const ids = wire.nodeIds ?? (originId ? [originId] : []);
  const kind = patch.kind ?? wire.portKind;
  for (const anchor of doc.nodes.filter((node) => ids.includes(node.id))) {
    const [source, target] =
      wire.direction === "out" ? [anchor, created] : [created, anchor];
    const ports =
      wire.direction === "out"
        ? { sourcePort: wire.portId, sourceItemKey: wire.sourceItemKey }
        : { targetPort: wire.portId };
    addWire(doc, source, target, kind, { ...patch, ...ports });
  }
}

export function dictRoleLabel(role: string): string {
  const key = `role_${role}`;
  const val = t(key);
  return val === key ? role : val;
}
