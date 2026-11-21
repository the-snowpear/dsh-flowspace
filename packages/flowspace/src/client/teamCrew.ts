import type { FlowNode, FlowspaceSnapshot, NativeAgentMessage, TeamMemberView, TeamModel, TeamSlotView, TeamTaskView } from "../types.ts";
import type { SigilTone } from "./TeamControls.tsx";
import { t } from "./i18n.ts";
import { slotIdFor, staffNodes } from "../core/team.ts";

/** One face in the team room: the lead, a member, or a slot nobody fills yet. */
export interface CrewRow {
  id: string;
  kind: "lead" | "member" | "vacant";
  label: string;
  /** Sigil seed: a member's native name (its first instance equals the slot ID). */
  seed: string;
  /** Shown when one slot has several members. */
  instance?: string;
  model?: TeamModel;
  tone: SigilTone;
  group: CrewGroup;
  status: string;
  slotId: string | null;
  slotLabel?: string;
  roleTitle?: string;
  maxInstances?: number;
  outside?: boolean;
  member?: TeamMemberView;
  /** The task this face is working on now. */
  task?: TeamTaskView;
  tasks: { done: number; total: number };
  /** 0–1 share of its tasks that are done; absent without tasks. */
  progress?: number;
  messages: number;
}

export type CrewGroup = "running" | "idle" | "vacant";

export interface CrewMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  at: number;
  seq: number;
  settled: boolean;
}

const memberModel = (member: TeamMemberView): TeamModel | undefined =>
  member.model ? { provider: member.provider ?? "", model: member.model } : undefined;

export function leadTone(status: string): SigilTone {
  if (status === "running" || status === "settling" || status === "queued") return "running";
  if (status === "failed" || status === "error") return "failed";
  return "idle";
}

/**
 * Slots a team will run with before its lead exists: the library blueprint's
 * slots, then each wired role node. Mirrors the Host's roster derivation.
 */
export function draftSlots(node: FlowNode, nodes: readonly FlowNode[], snapshot: FlowspaceSnapshot | null): TeamSlotView[] {
  const roles = snapshot?.roles ?? [];
  const blueprint = snapshot?.teamBlueprints?.find((team) => team.id === node.teamRef?.teamId);
  const slots = (blueprint?.slots ?? []).flatMap((slot): TeamSlotView[] => {
    const role = roles.find((role) => role.id === slot.roleId);
    return role ? [{ ...slot, roleTitle: role.title, model: slot.model ?? role.model, maxInstances: slot.maxInstances ?? 1 }] : [];
  });
  const taken = new Set(slots.map((slot) => slot.slotId));
  for (const staff of staffNodes(nodes, node.id)) {
    const role = staff.roleRef ? roles.find((role) => role.id === staff.roleRef) : undefined;
    const label = staff.title.trim() || t("teamRoleUntitled");
    const slotId = staff.slotId && !taken.has(staff.slotId) ? staff.slotId : slotIdFor(label, taken);
    taken.add(slotId);
    const model = staff.teamModel ?? role?.model;
    slots.push({ slotId, label, roleTitle: role?.title ?? label, maxInstances: staff.maxInstances ?? 1, nodeId: staff.id,
      model: model ?? { provider: "", model: "" } });
  }
  return slots;
}

export function buildCrew(node: FlowNode, snapshot: FlowspaceSnapshot | null, status: string,
  nodes: readonly FlowNode[] = snapshot?.document.nodes ?? []) {
  const runtime = node.sessionId ? snapshot?.teams?.[node.sessionId] : undefined;
  const blueprint = snapshot?.teamBlueprints?.find((team) => team.id === node.teamRef?.teamId);
  const leadModel = runtime?.leadModel ?? blueprint?.lead.model ?? node.teamConfig?.model;
  const slots: TeamSlotView[] = runtime?.slots ?? draftSlots(node, nodes, snapshot);
  const members = runtime?.members ?? [];
  const tasks = runtime?.tasks ?? [];
  const leadId = node.sessionId ?? "lead";

  const endpoints = new Set([leadId, ...members.map((member) => member.sessionId)]);
  const messages: CrewMessage[] = (snapshot?.nativeMessages ?? [])
    .filter((message: NativeAgentMessage) => endpoints.has(message.fromSessionId) && endpoints.has(message.toSessionId)
      && message.fromSessionId !== message.toSessionId && message.text.trim())
    .map((message) => ({ id: message.id, from: message.fromSessionId, to: message.toSessionId, text: message.text,
      at: message.time, seq: message.seq, settled: message.kind === "subagent-settled" }))
    .sort((a, b) => a.at - b.at || a.seq - b.seq);
  const talk = new Map<string, number>();
  for (const message of messages) for (const id of [message.from, message.to]) talk.set(id, (talk.get(id) ?? 0) + 1);

  const owned = (id: string, name?: string) => tasks.filter((task) =>
    task.ownerId === id || (name !== undefined && task.ownerName === name) || (id === leadId && task.ownerName === "lead"));
  const taskFacts = (list: TeamTaskView[]) => {
    const done = list.filter((task) => task.status === "completed").length;
    return {
      task: list.find((task) => task.status === "in_progress"),
      tasks: { done, total: list.length },
      ...(list.length ? { progress: done / list.length } : {}),
    };
  };

  const rows: CrewRow[] = [];
  const tone = leadTone(status);
  rows.push({
    id: leadId, kind: "lead", label: t("teamLead"), seed: "lead", model: leadModel, tone,
    group: tone === "running" ? "running" : "idle", status: t(status), slotId: null,
    messages: talk.get(leadId) ?? 0, ...taskFacts(owned(leadId)),
  });
  const memberRow = (member: TeamMemberView, slot: TeamSlotView | undefined, twin: boolean): CrewRow => {
    const running = member.activity === "running";
    return {
      id: member.sessionId, kind: "member", label: member.label, seed: member.name, model: memberModel(member) ?? slot?.model,
      ...(twin ? { instance: member.name } : {}),
      tone: running ? "running" : "idle", group: running ? "running" : "idle",
      status: t(running ? "running" : "teamIdle"), slotId: member.slotId,
      slotLabel: slot?.label, roleTitle: slot?.roleTitle, maxInstances: slot?.maxInstances,
      outside: member.slotId === null, member, messages: talk.get(member.sessionId) ?? 0,
      ...taskFacts(owned(member.sessionId, member.name)),
    };
  };
  for (const slot of slots) {
    const occupants = members.filter((member) => member.slotId === slot.slotId);
    if (!occupants.length) {
      rows.push({
        id: `vacant:${slot.slotId}`, kind: "vacant", label: slot.label, seed: slot.slotId, model: slot.model,
        tone: "vacant", group: "vacant", status: t("teamVacant"), slotId: slot.slotId, slotLabel: slot.label,
        roleTitle: slot.roleTitle, maxInstances: slot.maxInstances, messages: 0, tasks: { done: 0, total: 0 },
      });
    }
    for (const member of occupants) rows.push(memberRow(member, slot, occupants.length > 1));
  }
  for (const member of members) {
    if (member.slotId === null || !slots.some((slot) => slot.slotId === member.slotId)) rows.push(memberRow(member, undefined, false));
  }
  return { rows, messages, slots, members, tasks, runtime, blueprint, leadModel, leadId };
}

export function relativeTime(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return t("teamJustNow");
  if (seconds < 60) return t("teamSecondsAgo", { count: seconds });
  if (seconds < 3600) return t("teamMinutesAgo", { count: Math.floor(seconds / 60) });
  return t("teamHoursAgo", { count: Math.floor(seconds / 3600) });
}
