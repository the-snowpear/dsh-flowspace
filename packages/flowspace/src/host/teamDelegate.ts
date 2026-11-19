import type { Agent, AgentOptions } from "@deepseek-ai/dsh-agent";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-tools";
import { z } from "zod";
import type { TeamModel } from "../types.ts";
import type { TeamSessionRecord } from "./storage.ts";

export const teamDelegateName = "team_delegate";
const inputSchema = z.object({ slot: z.string().min(1), task: z.string().trim().min(1) });

export function teamAgentOptions(model: TeamModel) {
  return { ...model, reasoningEffort: model.reasoningEffort as AgentOptions["reasoningEffort"] };
}

export function rosterSlots(roster: TeamSessionRecord["roster"]) {
  return roster.team.slots.map((slot) => {
    const role = roster.roles.find((role) => role.id === slot.roleId)!;
    return { ...slot, role, model: slot.model ?? role.model, maxInstances: slot.maxInstances ?? 1 };
  });
}

export function planDelegation(record: TeamSessionRecord, args: unknown, names: Set<string>) {
  const { slot: slotId, task } = inputSchema.parse(args);
  const slot = rosterSlots(record.roster).find((slot) => slot.slotId === slotId);
  if (!slot) throw new Error(`Unknown team slot "${slotId}". Use a slot ID from <team-brief>.`);
  const count = record.delegations.filter((child) =>
    child.slotId === slotId &&
    child.roleId === slot.roleId &&
    child.roleRevision === slot.role.revision &&
    child.model.provider === slot.model.provider &&
    child.model.model === slot.model.model &&
    child.model.reasoningEffort === slot.model.reasoningEffort,
  ).length;
  if (count >= slot.maxInstances) {
    throw new Error(`Slot "${slotId}" reached its ${slot.maxInstances}-member limit. Use send_message to reuse a member.`);
  }
  let name = slotId;
  for (let index = 2; names.has(name); index++) {
    const suffix = `-${index}`;
    name = slotId.slice(0, 32 - suffix.length) + suffix;
  }
  const persona = [slot.role.description, slot.role.persona].filter(Boolean).join("\n");
  return { slot, name, prompt: `<role-persona>\n${persona}\n</role-persona>\n\n${task}` };
}

interface DelegatedMember {
  name: string;
  label: string;
  model: string;
}

export function registerTeamDelegate(
  ctx: Context,
  isLead: (sessionId: string) => boolean,
  delegate: (agent: Agent, args: unknown, signal: AbortSignal) => Promise<DelegatedMember>,
) {
  return ctx.tools.register({
    name: teamDelegateName,
    description: "Start a FlowSpace team member in a slot from <team-brief>. FlowSpace assigns the role and model. Returns the member name immediately. Use send_message to reuse a member. The native runtime delivers results to the lead.",
    parameters: {
      type: "object",
      properties: { slot: { type: "string" }, task: { type: "string" } },
      required: ["slot", "task"],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: "object",
        properties: { name: { type: "string" }, label: { type: "string" }, model: { type: "string" } },
        required: ["name", "label", "model"],
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: "text",
        text: JSON.stringify({ name: (value as unknown as DelegatedMember).name }),
      }],
      presentationMeta: (_args, value) => value,
    },
    presentResult: (_args, result) => {
      const meta = result.meta as unknown as DelegatedMember | undefined;
      return result.isError || !meta ? undefined : {
        card: "generic",
        title: `派给 ${meta.label} · ${meta.model}`,
      };
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error("team_delegate requires a calling team lead.");
      return delegate(exec.agent, args, exec.signal);
    },
  }, { when: ({ agent }) => isLead(agent.id) });
}
