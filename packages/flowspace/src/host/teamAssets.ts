import type { Context } from "@deepseek-ai/cordis";
import type { LlmCallConfig } from "@deepseek-ai/dsh-llm";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { uid } from "../core/document.ts";
import type {
  ArchiveTeamAssetRequest,
  RoleDefinition,
  SaveRoleRequest,
  SaveTeamRequest,
  TeamBlueprint,
  TeamDependencies,
  TeamModel,
  TeamModelRoute,
  WorkflowImportRequest,
} from "../types.ts";
import {
  archiveTeamAssetSchema,
  flowspaceDomain,
  saveRoleSchema,
  saveTeamSchema,
  teamDependenciesSchema,
  teamModelReplacementSchema,
  type TeamSessionRecord,
} from "./storage.ts";

const modelKey = (model: TeamModel) => JSON.stringify([model.provider, model.model, model.reasoningEffort ?? ""]);

function nextRevision(expected: number, current?: number): number {
  if (expected !== (current ?? 0)) throw new Error("版本已更新，请重新打开编辑。 / Revision changed. Reopen the editor.");
  return expected + 1;
}

export class TeamAssets {
  constructor(
    private domain: Domain<typeof flowspaceDomain>,
    private llm: Context["llm"],
  ) {}

  listRoles(): RoleDefinition[] {
    return structuredClone([...this.domain.table("roles").entries()].map(([, role]) => role));
  }

  listTeams(): TeamBlueprint[] {
    return structuredClone([...this.domain.table("teams").entries()].map(([, team]) => team));
  }

  getTeam(id: string): TeamBlueprint | undefined {
    return this.domain.table("teams").get(id);
  }

  roster(teamId: string): TeamSessionRecord["roster"] {
    const team = this.getTeam(teamId);
    if (!team) throw new Error(`找不到团队编制 / Team blueprint not found: ${teamId}`);
    const roles = [...new Set(team.slots.map((slot) => slot.roleId))].map((id) => {
      const role = this.domain.table("roles").get(id);
      if (!role) throw new Error(`找不到角色 / Role not found: ${id}`);
      return role;
    });
    return { team, roles };
  }

  async listModelRoutes(): Promise<TeamModelRoute[]> {
    const results = await Promise.allSettled(this.llm.listProviders().map(async (provider) =>
      (await this.llm.listModels(provider.id)).map((model) => ({
        provider: provider.id,
        providerName: provider.name,
        model: model.id,
        name: model.name,
      })),
    ));
    return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }

  async validateModels(models: TeamModel[]): Promise<void> {
    const [missing] = await this.missingModels(models);
    if (missing) throw new Error(`模型不可用 / Model unavailable: ${missing.provider}/${missing.model}${missing.reasoningEffort ? ` (${missing.reasoningEffort})` : ""}`);
  }

  private async missingModels(models: TeamModel[]): Promise<TeamModel[]> {
    const catalogs = new Map<string, Awaited<ReturnType<Context["llm"]["listModels"]>>>();
    const missing: TeamModel[] = [];
    for (const model of new Map(models.map((model) => [modelKey(model), model])).values()) {
      let catalog = catalogs.get(model.provider);
      if (!catalog) {
        catalog = await this.llm.listModels(model.provider).catch(() => []);
        catalogs.set(model.provider, catalog);
      }
      if (!catalog.some((entry) => entry.id === model.model)) {
        missing.push(model);
      } else if (model.reasoningEffort) {
        await this.llm.resolveCallConfig(model as LlmCallConfig).catch(() => { missing.push(model); });
      }
    }
    return missing;
  }

  async prepareImport(request: WorkflowImportRequest, referenced: Set<string>) {
    const input = teamDependenciesSchema.parse(request.dependencies ?? { teams: [], roles: [] });
    const replacements = new Map(teamModelReplacementSchema.parse(request.replacements ?? []).map(
      ({ from, to }) => [modelKey(from), to],
    ));
    const replacement = (model: TeamModel) => replacements.get(modelKey(model)) ?? model;
    const roleIds = new Map<string, string>();
    const teamIds = new Map<string, string>();
    const additions: TeamDependencies = { roles: [], teams: [] };
    const roles = new Map(this.domain.table("roles").entries());
    const teams = new Map(this.domain.table("teams").entries());
    for (const incoming of input.roles) {
      const id = request.copyAssets ? uid() : incoming.id;
      roleIds.set(incoming.id, id);
      if (roles.has(id)) continue;
      const role = { ...incoming, id, model: replacement(incoming.model) };
      roles.set(id, role);
      additions.roles.push(role);
    }
    for (const incoming of input.teams) {
      const id = request.copyAssets ? uid() : incoming.id;
      teamIds.set(incoming.id, id);
      if (teams.has(id)) continue;
      const team = {
        ...incoming, id, lead: { ...incoming.lead, model: replacement(incoming.lead.model) },
        slots: incoming.slots.map((slot) => ({
          ...slot, roleId: roleIds.get(slot.roleId) ?? slot.roleId,
          ...(slot.model ? { model: replacement(slot.model) } : {}),
        })),
      };
      teams.set(id, team);
      additions.teams.push(team);
    }
    const models = additions.roles.map((role) => role.model);
    const teamIdsToValidate = new Set([...referenced, ...input.teams.map((team) => team.id)]);
    for (const teamId of teamIdsToValidate) {
      const team = teams.get(teamIds.get(teamId) ?? teamId);
      if (!team) throw new Error(`找不到团队编制 / Team blueprint not found: ${teamId}`);
      models.push(team.lead.model);
      for (const slot of team.slots) {
        const role = roles.get(slot.roleId);
        if (!role) throw new Error(`找不到角色 / Role not found: ${slot.roleId}`);
        models.push(role.model);
        if (slot.model) models.push(slot.model);
      }
    }
    return { additions, teamIds, missing: await this.missingModels(models) };
  }

  async addImported(assets: TeamDependencies): Promise<void> {
    for (const role of assets.roles) await this.domain.table("roles").put(role.id, role);
    for (const team of assets.teams) await this.domain.table("teams").put(team.id, team);
  }

  async saveRole(request: SaveRoleRequest): Promise<RoleDefinition> {
    const input = saveRoleSchema.parse(request);
    const table = this.domain.table("roles");
    const current = table.get(input.id);
    const revision = nextRevision(input.revision, current?.revision);
    if (current?.archived) throw new Error("此角色已归档。 / This role is archived.");
    await this.validateModels([input.model]);
    const saved = { ...input, revision };
    await table.put(saved.id, saved);
    return saved;
  }

  async saveTeam(request: SaveTeamRequest): Promise<TeamBlueprint> {
    const input = saveTeamSchema.parse(request);
    const table = this.domain.table("teams");
    const current = table.get(input.id);
    const revision = nextRevision(input.revision, current?.revision);
    if (current?.archived) throw new Error("此编制已归档。 / This team is archived.");
    const models = input.slots.map((slot) => {
      const role = this.domain.table("roles").get(slot.roleId);
      if (!role || (role.archived && !current?.slots.some(
        (previous) => previous.slotId === slot.slotId && previous.roleId === role.id,
      ))) throw new Error(`角色不可用 / Role unavailable: ${slot.roleId}`);
      return slot.model ?? role.model;
    });
    await this.validateModels([input.lead.model, ...models]);
    const saved = { ...input, revision };
    await table.put(saved.id, saved);
    return saved;
  }

  async archiveRole(request: ArchiveTeamAssetRequest): Promise<RoleDefinition> {
    const { id, revision } = archiveTeamAssetSchema.parse(request);
    const table = this.domain.table("roles");
    const current = table.get(id);
    if (!current) throw new Error("找不到角色。 / Role not found.");
    const saved = { ...current, revision: nextRevision(revision, current.revision), archived: true };
    await table.put(id, saved);
    return saved;
  }

  async archiveTeam(request: ArchiveTeamAssetRequest): Promise<TeamBlueprint> {
    const { id, revision } = archiveTeamAssetSchema.parse(request);
    const table = this.domain.table("teams");
    const current = table.get(id);
    if (!current) throw new Error("找不到团队。 / Team not found.");
    const saved = { ...current, revision: nextRevision(revision, current.revision), archived: true };
    await table.put(id, saved);
    return saved;
  }
}
