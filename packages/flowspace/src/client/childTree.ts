import type { FlowNode, SubagentBrief, TeamMemberView, TeamModel, TeamRuntimeBrief } from "../types.ts";
import { clearBoxAlong, type Box } from "./geometry.ts";

type Pt = { x: number; y: number };

/**
 * Native children hang from an agent's bottom-centre port, beside its role
 * nodes. A role filled by one member shows it inside the role node; a role
 * with several members grows a row of member cards under it.
 * Everything here is runtime state: derived, never saved in the document.
 */

export const CHILD_W = 208;
export const CHILD_H = 56;
export const CHILD_GAP = 16;
/** Drop from a port to the top of its child row. */
export const CHILD_DROP = 64;

export interface ChildCard {
  id: string;
  sessionId: string;
  title: string;
  /** Native name (`tester-2`); sigil seed and instance label. */
  name: string;
  running: boolean;
  model?: TeamModel;
  /** Agent node the card belongs to. */
  agentNodeId: string;
  /** Role node it hangs from; absent for cards in the agent's own row. */
  roleNodeId?: string;
  /** A team member, opened in the team room; plain subagents open in chat. */
  member: boolean;
  /** A team member outside the roster. */
  outside: boolean;
  box: Box;
}

export interface ChildLink {
  id: string;
  from: Pt;
  to: Pt;
  active: boolean;
  /** Canvas node (agent or role) whose bottom port anchors this link. */
  sourceNodeId?: string;
  /** Role node whose cross-highlight this link joins. */
  staffId?: string;
}

/** Vertical S-curve from a bottom port down to a top socket. */
export function staffPath(from: Pt, to: Pt): string {
  const bend = Math.max(36, Math.abs(to.y - from.y) / 2);
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + bend} ${to.x} ${to.y - bend} ${to.x} ${to.y}`;
}

export const bottomPort = (box: Box): Pt => ({ x: box.x + box.w / 2, y: box.y + box.h });

/** Members per role node, for roles wired into a lead that runs now. */
export function membersByRole(nodes: readonly FlowNode[], teams: Record<string, TeamRuntimeBrief> | undefined) {
  const byRole = new Map<string, TeamMemberView[]>();
  if (!teams) return byRole;
  const roles = new Map(nodes.flatMap((node) => node.kind === "role" && node.staffOf ? [[node.id, node.staffOf] as const] : []));
  for (const team of Object.values(teams)) {
    for (const member of team.members) {
      if (!member.nodeId || roles.get(member.nodeId) !== team.nodeId) continue;
      byRole.set(member.nodeId, [...byRole.get(member.nodeId) ?? [], member]);
    }
  }
  return byRole;
}

function row(count: number, top: number, left: number): Box[] {
  return Array.from({ length: count }, (_, index) => ({
    x: Math.round(left + index * (CHILD_W + CHILD_GAP)), y: Math.round(top), w: CHILD_W, h: CHILD_H, compact: true,
  }));
}

const rowWidth = (count: number) => count * CHILD_W + Math.max(0, count - 1) * CHILD_GAP;

export function buildChildTree(opts: {
  /** Visible canvas nodes. */
  nodes: readonly FlowNode[];
  /** Every node, so members of a hidden role stay with it. */
  allNodes?: readonly FlowNode[];
  box: (node: FlowNode) => Box;
  obstacles?: readonly Box[];
  subagents: readonly SubagentBrief[];
  teams: Record<string, TeamRuntimeBrief> | undefined;
}): { cards: ChildCard[]; links: ChildLink[]; members: Map<string, TeamMemberView[]> } {
  const cards: ChildCard[] = [];
  const links: ChildLink[] = [];
  let occupied: Box[] | undefined;
  function placeRow(count: number, top: number, left: number): Box[] {
    occupied ??= [...opts.nodes.map(opts.box), ...(opts.obstacles ?? [])];
    const slot = clearBoxAlong({ x: Math.round(left), y: Math.round(top), w: rowWidth(count), h: CHILD_H }, occupied, "y", 1, CHILD_GAP);
    slot.y = Math.ceil(slot.y);
    occupied.push(slot);
    return row(count, slot.y, slot.x);
  }
  const members = membersByRole(opts.allNodes ?? opts.nodes, opts.teams);
  const attached = new Set([...members.values()].flat().map((member) => member.sessionId));
  const memberCard = (member: TeamMemberView, agentNodeId: string, box: Box, roleNodeId?: string): ChildCard => ({
    id: `child-${member.sessionId}`, sessionId: member.sessionId, title: member.label, name: member.name,
    running: member.activity === "running", agentNodeId, member: true, outside: member.slotId === null, box,
    ...(member.model ? { model: { provider: member.provider ?? "", model: member.model } } : {}),
    ...(roleNodeId ? { roleNodeId } : {}),
  });

  for (const agent of opts.nodes) {
    if (agent.kind !== "agent" || !agent.sessionId || agent.subAgentsExpanded === false) continue;
    const team = opts.teams?.[agent.sessionId];
    const own = new Map(team?.members.filter((member) => member.depth === 1).map((member) => [member.sessionId, member]));
    const ids = new Set([
      ...opts.subagents.filter((sub) => sub.parentSessionId === agent.sessionId).map((sub) => sub.sessionId),
      ...own.keys(),
    ]);
    const shown = [...ids].filter((id) => !attached.has(id));
    if (!shown.length) continue;
    const box = opts.box(agent);
    const port = bottomPort(box);
    // Line up beside the role nodes that hang below this agent, or centre under it.
    const roles = opts.nodes.filter((node) => node.kind === "role" && node.staffOf === agent.id)
      .map(opts.box).filter((role) => role.y > port.y + 16);
    const top = roles.length ? Math.min(...roles.map((role) => role.y)) : port.y + CHILD_DROP;
    const left = roles.length ? Math.max(...roles.map((role) => role.x + role.w)) + 24 : port.x - rowWidth(shown.length) / 2;
    const boxes = placeRow(shown.length, top, left);
    shown.forEach((sessionId, index) => {
      const member = own.get(sessionId);
      const sub = opts.subagents.find((item) => item.sessionId === sessionId);
      const card = member ? memberCard(member, agent.id, boxes[index]) : {
        id: `child-${sessionId}`, sessionId, title: sub?.title ?? sessionId, name: sub?.title ?? sessionId,
        running: !!sub?.running, agentNodeId: agent.id, member: false, outside: false, box: boxes[index],
      };
      cards.push(card);
      links.push({ id: card.id, from: port, to: { x: card.box.x + CHILD_W / 2, y: card.box.y }, active: card.running, sourceNodeId: agent.id });
    });
  }

  for (const role of opts.nodes) {
    const crew = members.get(role.id);
    if (role.kind !== "role" || !role.staffOf || !crew || crew.length < 2) continue;
    const port = bottomPort(opts.box(role));
    const boxes = placeRow(crew.length, port.y + CHILD_DROP - 8, port.x - rowWidth(crew.length) / 2);
    crew.forEach((member, index) => {
      const card = memberCard(member, role.staffOf!, boxes[index], role.id);
      cards.push(card);
      links.push({ id: card.id, from: port, to: { x: card.box.x + CHILD_W / 2, y: card.box.y }, active: card.running,
        sourceNodeId: role.id, staffId: role.id });
    });
  }
  return { cards, links, members };
}
