import type { Agent } from "@deepseek-ai/dsh-agent";
import type TeamService from "@deepseek-ai/dsh-agent-team";
import type { Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { SessionId } from "@deepseek-ai/dsh-session";
import type {} from "@deepseek-ai/dsh-subagent";
import type { FlowNode, TeamMemberView, TeamModel, TeamReference, TeamRuntimeBrief, TeamTaskView } from "../types.ts";
import type { flowspaceDomain, TeamSessionRecord } from "./storage.ts";
import type { DraftRoster, TeamAssets } from "./teamAssets.ts";
import { isTeamNode, staffedIds } from "../core/team.ts";
import { planDelegation, registerTeamDelegate, rosterSlots, slotOf, teamAgentOptions } from "./teamDelegate.ts";

type Board = { enabled: boolean; tasks: TeamTaskView[] };
const delegationTools = ["subagent", "subagent_fork", "workflow"];

/** Key-order independent JSON, so stored and rebuilt rosters compare equal. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    : item);
}

/** A canvas team without a lead model keeps the session's default model. */
function leadDefault(agent: Agent): TeamModel {
  const current = agent.model.current();
  if (!current) throw new Error("请为团队主管选择模型。 / Choose a model for the team lead.");
  return { provider: current.provider, model: current.model,
    ...(current.reasoningEffort ? { reasoningEffort: current.reasoningEffort } : {}) };
}

export class TeamRuntime {
  private records = new Map<string, TeamSessionRecord>();
  /** Released leads: plain agents again, keeping who their members were. */
  private dormant = new Map<string, TeamSessionRecord>();
  private views = new Map<string, TeamRuntimeBrief>();
  private boards = new Map<string, Board>();
  private models = new Map<string, TeamModel>();
  private restrictions = new Map<Agent, () => void>();
  private leafRoots = new Map<string, string>();
  private activations = new Map<string, string>();
  private refreshes = new Map<string, Promise<void>>();
  private waits = new Map<string, Promise<void>>();
  private delegateTails = new Map<string, Promise<unknown>>();
  private userTurns = new Map<string, number>();
  private epochs = new Set<string>();
  private pendingSaves = new Map<string, Promise<void>>();
  private syncs = new Map<string, Promise<void>>();

  constructor(
    private ctx: Context,
    private domain: Domain<typeof flowspaceDomain>,
    private assets: TeamAssets,
    private publish: () => void,
    private nodes: () => readonly FlowNode[],
  ) {
    for (const [id, record] of domain.table("team_sessions").entries())
      (record.released ? this.dormant : this.records).set(id, record);
    const unregister = registerTeamDelegate(ctx, (id) => this.isLead(id), (agent, args, signal) =>
      this.delegate(agent, args, signal));
    ctx.effect(() => () => {
      unregister();
      for (const release of this.restrictions.values()) release();
    });
    ctx.on("agent/created", ({ agent }) => {
      const record = this.records.get(agent.id);
      if (record) this.applyLead(agent, record);
      return undefined;
    });
    ctx.on("agent/disposed", ({ agent }) => {
      this.restrictions.delete(agent);
      this.userTurns.delete(agent.id);
    });
    ctx.sessionProjections.onChanged((session, key, value) => {
      if (key === "agentTeam" && this.isLead(session.id)) {
        this.boards.set(session.id, value as Board);
        this.queueRefresh(session.id);
      }
      if (key === "subagentCatalog") this.refreshFor(session.id);
    });
    ctx.on("subagent/start", ({ id, parentSessionId, runId }) => {
      const root = this.rootFor(parentSessionId);
      if (!root) return;
      this.leafRoots.set(id, root);
      this.activations.set(id, runId);
      this.queueRefresh(root);
    });
    ctx.on("subagent/end", ({ id, parentSessionId, runId }) => {
      if (this.activations.get(id) === runId) this.activations.delete(id);
      this.refreshFor(this.leafRoots.get(id) ?? parentSessionId);
    });
    ctx.on("agent/status", ({ agent }) => {
      if (this.leafRoots.has(agent.id)) this.refreshFor(agent.id);
    });
  }

  private warn(error: unknown) {
    this.ctx.logger.warn("FlowSpace team: %s", error);
  }

  isLead(sessionId: string): boolean {
    return this.records.has(sessionId);
  }

  ownsNode(sessionId: string, nodeId: string): boolean {
    return this.records.get(sessionId)?.nodeId === nodeId;
  }

  reference(sessionId: string): TeamReference | undefined {
    const team = this.records.get(sessionId)?.roster.team;
    return team && { teamId: team.id, revision: team.revision };
  }

  isFollowup(sessionId: string, turn: number): boolean {
    return this.isLead(sessionId) && this.userTurns.get(sessionId) !== turn;
  }

  wantsTeam(node: FlowNode): boolean {
    return isTeamNode(node, staffedIds(this.nodes()));
  }

  async validateRoster(node: FlowNode): Promise<DraftRoster> {
    const roster = this.assets.rosterForNode(node, this.nodes());
    const lead = roster.team.lead.model;
    await this.assets.validateModels([...lead ? [lead] : [], ...rosterSlots(roster).map((slot) => slot.model)]);
    return roster;
  }

  async bind(node: FlowNode, sessionId: SessionId, draft: DraftRoster): Promise<void> {
    const service = this.ctx.get("agentTeams") as TeamService | undefined;
    if (!service) throw new Error("DSH Agent Teams service is unavailable");
    const result = await this.ctx.sessionController.resolveAgent(sessionId);
    if ("error" in result) throw result.error;
    const model = draft.team.lead.model ?? leadDefault(result.agent);
    const roster = { ...draft, team: { ...draft.team, lead: { ...draft.team.lead, model } } };
    // Members from an earlier spell as a team come back to their roles; any other
    // subagent the session already has stays a plain subagent.
    const earlier = this.dormant.get(sessionId);
    const delegations = earlier?.nodeId === node.id ? earlier.delegations : [];
    const members = new Set(delegations.map((child) => child.sessionId));
    const children = await this.ctx.subagents.listDescendants(sessionId);
    const priorChildren = children.flatMap((row) => row.kind === "child" && !members.has(row.id) ? [row.id] : []);
    const record: TeamSessionRecord = { leadSessionId: sessionId, nodeId: node.id, roster, delegations,
      ...(priorChildren.length ? { priorChildren } : {}) };
    result.agent.model.select(teamAgentOptions(roster.team.lead.model));
    await service.setEnabled(result.agent, true);
    await this.save(record);
    this.dormant.delete(sessionId);
    this.applyLead(result.agent, record);
    this.boards.set(sessionId, { enabled: true, tasks: [] });
    await this.refresh(sessionId);
  }

  /**
   * Brings an existing session in line with its node's wiring: an agent that
   * gains role nodes becomes a team lead in place; a canvas team that loses all
   * of them goes back to a plain agent once its tree is idle. Library teams stay bound.
   */
  sync(nodeId: string): Promise<void> {
    const sessionId = this.nodes().find((node) => node.id === nodeId)?.sessionId;
    if (!sessionId) return Promise.resolve();
    const previous = this.syncs.get(sessionId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const wanted = () => {
        const nodes = this.nodes();
        const node = nodes.find((candidate) => candidate.id === nodeId && candidate.sessionId === sessionId);
        return node && { node, team: isTeamNode(node, staffedIds(nodes)) };
      };
      const record = this.records.get(sessionId);
      const now = wanted();
      if (!now) return;
      if (now.team && !record) {
        await this.bind(now.node, sessionId as SessionId, await this.validateRoster(now.node));
      } else if (!now.team && record?.nodeId === nodeId && !now.node.teamRef) {
        await this.waitForIdle(sessionId);
        const later = wanted();
        if (later && !later.team && this.records.has(sessionId)) await this.release(sessionId);
      }
    });
    this.syncs.set(sessionId, next);
    void next.finally(() => {
      if (this.syncs.get(sessionId) === next) this.syncs.delete(sessionId);
    }).catch(() => {});
    return next;
  }

  private async release(sessionId: string) {
    const record = { ...this.records.get(sessionId)!, released: true };
    await this.domain.table("team_sessions").put(sessionId, record);
    this.dormant.set(sessionId, record);
    this.records.delete(sessionId);
    this.views.delete(sessionId);
    this.boards.delete(sessionId);
    this.userTurns.delete(sessionId);
    for (const [member, root] of this.leafRoots) if (root === sessionId) this.leafRoots.delete(member);
    const agent = this.ctx.agents.get(sessionId as SessionId);
    if (agent) {
      this.restrictions.get(agent)?.();
      this.restrictions.delete(agent);
    }
    this.publish();
  }

  private applyLead(agent: Agent, record: TeamSessionRecord) {
    agent.model.select(teamAgentOptions(record.roster.team.lead.model));
    if (this.restrictions.has(agent)) return;
    const releases = delegationTools.flatMap((name) => {
      if (!this.ctx.tools.get(name, agent)) return [];
      try {
        return [agent.ctx.tools.restrict({ deny: [name] })];
      } catch (error) {
        // A custom preset can own a tool in the Agent's scope. DSH masks inherited tools.
        this.warn(error);
        return [];
      }
    });
    this.restrictions.set(agent, () => releases.forEach((release) => release()));
  }

  private async save(record: TeamSessionRecord) {
    await this.domain.table("team_sessions").put(record.leadSessionId, record);
    this.records.set(record.leadSessionId, record);
  }

  /** Inbox claim precedes DSH's model selection capture for the step. */
  claim(agent: Agent, turn: number, user: boolean): void {
    const record = this.records.get(agent.id);
    if (!record) return;
    if (user && this.userTurns.get(agent.id) !== turn) {
      this.userTurns.set(agent.id, turn);
      if (!this.epochs.has(agent.id)) {
        const roster = this.currentRoster(record);
        if (roster && stableJson(roster) !== stableJson(record.roster)) {
          const next = { ...record, roster };
          this.records.set(agent.id, next);
          const saved = this.save(next);
          this.pendingSaves.set(agent.id, saved);
          void saved.then(() => this.queueRefresh(agent.id), (error) => this.warn(error));
        }
        this.epochs.add(agent.id);
        void this.waitForIdle(agent.id).finally(() => this.epochs.delete(agent.id)).catch((error) => this.warn(error));
      }
    }
    agent.model.select(teamAgentOptions(this.records.get(agent.id)!.roster.team.lead.model));
  }

  /** The node's roster as the canvas and library stand now; undefined keeps the bound one. */
  private currentRoster(record: TeamSessionRecord): TeamSessionRecord["roster"] | undefined {
    const nodes = this.nodes();
    const node = nodes.find((candidate) => candidate.id === record.nodeId);
    if (!node) return;
    try {
      const draft = this.assets.rosterForNode(node, nodes, record.roster.team.lead.model);
      const model = draft.team.lead.model ?? record.roster.team.lead.model;
      return { ...draft, team: { ...draft.team, lead: { ...draft.team.lead, model } } };
    } catch (error) {
      this.warn(error);
      return;
    }
  }

  async brief(sessionId: string): Promise<string | undefined> {
    const record = this.records.get(sessionId);
    if (!record) return;
    const saving = this.pendingSaves.get(sessionId);
    if (saving) {
      await saving;
      if (this.pendingSaves.get(sessionId) === saving) this.pendingSaves.delete(sessionId);
    }
    const { team } = record.roster;
    const slots = rosterSlots(record.roster).map(({ slotId, role, label, model, maxInstances }) =>
      `- ${slotId} (${label}, ${model.provider}/${model.model}, up to ${maxInstances}): ${role.description}`).join("\n");
    return `<team-brief>\n${team.title} · rev ${team.revision}\n${team.lead.persona}\n${team.norms}\n${slots}\n` +
      "Coordinate work and report the team's results. Assign new work through team_delegate(slot, task). " +
      "Use send_message to continue with an existing member. Native notices deliver the results.\n</team-brief>";
  }

  delegate(parent: Agent, args: unknown, signal: AbortSignal) {
    const previous = this.delegateTails.get(parent.id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const record = this.records.get(parent.id);
      if (!record) throw new Error("Only a FlowSpace team lead can delegate to a slot.");
      const rows = await this.ctx.subagents.listDescendants(parent.id, signal);
      const names = new Set(rows.flatMap((entry) => entry.depth === 1 && entry.path ? [entry.path] : []));
      const { slot, name, prompt } = planDelegation(record, args, names);
      try {
        const activation = await this.ctx.subagents.startActivation({
          provider: "spawn", parent, name, label: slot.label, delivery: "parent",
          prompt: [{ type: "text", text: prompt }], agentOptions: teamAgentOptions(slot.model),
          maxDepth: this.ctx.subagents.resolveMaxDepth(), signal,
        });
        void activation.result.catch((error) => this.warn(error));
        try {
          const latest = this.records.get(parent.id)!;
          await this.save({ ...latest, delegations: [...latest.delegations, {
            sessionId: activation.childId, slotId: slot.slotId, roleId: slot.role.id,
            model: slot.model, roleRevision: slot.role.revision, ...(slot.nodeId ? { nodeId: slot.nodeId } : {}),
          }] });
        } catch (error) {
          await activation.dispose();
          throw error;
        }
        this.queueRefresh(parent.id);
        return { name: activation.name, label: slot.label, model: slot.model.model };
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ACTIVATION_LIMIT_REACHED")
          throw new Error("Team capacity is full. Wait for a member to finish or use send_message to reuse one.", { cause: error });
        throw error;
      }
    });
    this.delegateTails.set(parent.id, next);
    void next.finally(() => {
      if (this.delegateTails.get(parent.id) === next) this.delegateTails.delete(parent.id);
    }).catch(() => {});
    return next;
  }

  waitForIdle(sessionId: string): Promise<void> {
    const current = this.waits.get(sessionId);
    if (current) return current;
    const lead = this.ctx.agents.get(sessionId as SessionId);
    if (!lead) return Promise.resolve();
    const wait = (async () => {
      do {
        await lead.whenIdle();
      } while (await this.ctx.subagents.waitForTreeWork(lead) || lead.status !== "idle");
    })();
    this.waits.set(sessionId, wait);
    void wait.finally(() => this.waits.delete(sessionId)).catch(() => {});
    return wait;
  }

  async interruptMembers(sessionId: string): Promise<void> {
    const rows = await this.ctx.subagents.listDescendants(sessionId as SessionId);
    for (const row of rows) {
      if (row.kind === "child" && (row.activity === "running" || this.activations.has(row.id)))
        this.ctx.subagents.interruptByUser(row.id);
    }
  }

  private rootFor(sessionId: string): string | undefined {
    return this.records.has(sessionId) ? sessionId : this.leafRoots.get(sessionId);
  }

  private refreshFor(sessionId: string) {
    const root = this.rootFor(sessionId);
    if (root) this.queueRefresh(root);
  }

  private queueRefresh(sessionId: string) {
    void this.refresh(sessionId).catch((error) => this.warn(error));
  }

  private refresh(sessionId: string): Promise<void> {
    const previous = this.refreshes.get(sessionId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const record = this.records.get(sessionId);
      if (!record) return;
      // Subagents from before the session became a team, and their own children, are not members.
      const prior = new Set(record.priorChildren);
      const tree = await this.ctx.subagents.listDescendants(sessionId as SessionId);
      for (let grew = prior.size > 0; grew;) {
        grew = false;
        for (const row of tree) {
          if (prior.has(row.id) || !prior.has(row.parentId)) continue;
          prior.add(row.id);
          grew = true;
        }
      }
      const rows = tree.filter((row) => !prior.has(row.id));
      const delegations = new Map(record.delegations.map((child) => [child.sessionId, child]));
      const slots = rosterSlots(record.roster);
      const members = await Promise.all(rows.flatMap((row) => row.kind !== "child" ? [] : [(
        async (): Promise<TeamMemberView> => {
          this.leafRoots.set(row.id, sessionId);
          const delegated = delegations.get(row.id);
          const slot = delegated && slotOf(slots, delegated);
          const agent = this.ctx.agents.get(row.id);
          const model = delegated?.model ?? agent?.model.current() ?? await this.memberModel(row.id, row.mode);
          return {
            sessionId: row.id, parentId: row.parentId, depth: row.depth, mode: row.mode,
            name: row.path ?? row.id, label: row.label ?? row.path ?? row.id,
            activity: agent?.status === "running" || (row.mode === "external" && this.activations.has(row.id))
              ? "running" : "idle",
            slotId: slot?.slotId ?? null, ...(slot?.nodeId ? { nodeId: slot.nodeId } : {}),
            provider: model?.provider, model: model?.model,
          };
        })()]));
      const { team } = record.roster;
      const board = this.boards.get(sessionId);
      const native = this.ctx.subagents as unknown as { config: { maxActiveSubagents: { get(): number } } };
      this.views.set(sessionId, {
        leadSessionId: sessionId, nodeId: record.nodeId, teamId: team.id, title: team.title,
        revision: team.revision, enabled: board?.enabled ?? false, tasks: board?.tasks ?? [],
        leadModel: team.lead.model,
        slots: slots.map(({ slotId, label, role, model, maxInstances, nodeId }) => ({
          slotId, label, roleTitle: role.title, model, maxInstances, ...(nodeId ? { nodeId } : {}),
        })),
        members,
        capacity: { active: rows.filter((row) => row.kind === "child" &&
          (row.activity === "running" || this.activations.has(row.id))).length,
          max: native.config.maxActiveSubagents.get() },
      });
      this.publish();
    });
    this.refreshes.set(sessionId, next);
    void next.finally(() => {
      if (this.refreshes.get(sessionId) === next) this.refreshes.delete(sessionId);
    }).catch(() => {});
    return next;
  }

  private async memberModel(id: SessionId, mode: TeamMemberView["mode"]): Promise<TeamModel | undefined> {
    if (mode === "external") return;
    const cached = this.models.get(id);
    if (cached) return cached;
    using log = await this.ctx.sessionQuery.observeSession(id);
    const selection = log.projections?.values.modelSelection as { pending?: TeamModel; lastUsed?: TeamModel } | undefined;
    const model = selection?.pending ?? selection?.lastUsed;
    if (model) this.models.set(id, model);
    return model;
  }

  async hydrate(): Promise<void> {
    await Promise.all([...this.records].map(async ([id, record]) => {
      try {
        const agent = this.ctx.agents.get(id as SessionId);
        if (agent) this.applyLead(agent, record);
        using log = await this.ctx.sessionQuery.observeSession(id as SessionId);
        const board = log.projections?.values.agentTeam as Board | undefined;
        if (board) this.boards.set(id, board);
        await this.refresh(id);
      } catch (error) {
        this.warn(error);
      }
    }));
  }

  snapshot(): Record<string, TeamRuntimeBrief> {
    return Object.fromEntries(this.views);
  }
}
