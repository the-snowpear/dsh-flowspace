import type { FlowNode } from "../types.ts";

/** Native subagent slot names (DSH `subagent` path segment). */
export const SLOT_ID = /^(?!lead$)[a-z][a-z0-9-]{0,31}$/;

/** Ids of agent nodes that have at least one role node wired in. */
export function staffedIds(nodes: readonly FlowNode[]): Set<string> {
  return new Set(nodes.flatMap((node) => node.kind === "role" && node.staffOf ? [node.staffOf] : []));
}

/**
 * An agent node is a team when it references a library blueprint or has role
 * nodes wired into it. Any agent node can take role nodes.
 */
export const isTeamNode = (node: FlowNode | undefined, staffed: ReadonlySet<string>): boolean =>
  !!node && node.kind === "agent" && (!!node.teamRef || staffed.has(node.id));

/** Stable team identity: the library blueprint, or the canvas-composed team of this node. */
export function teamIdOf(node: FlowNode | undefined, staffed: ReadonlySet<string>): string | undefined {
  if (!node || !isTeamNode(node, staffed)) return;
  return node.teamRef?.teamId ?? canvasTeamId(node.id);
}

export const canvasTeamId = (nodeId: string) => `canvas-${nodeId}`;

/** Role nodes wired into a team, left to right like an org chart. */
export function staffNodes(nodes: readonly FlowNode[], teamNodeId: string): FlowNode[] {
  return nodes
    .filter((node) => node.kind === "role" && node.staffOf === teamNodeId)
    .sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));
}

/** A free slot name derived from a title; CJK titles fall back to `member`. */
export function slotIdFor(title: string, taken: ReadonlySet<string>): string {
  const base = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "").replace(/-+$/, "").slice(0, 24) || "member";
  let id = base;
  for (let index = 2; taken.has(id) || !SLOT_ID.test(id); index++) id = `${base}-${index}`;
  return id;
}
