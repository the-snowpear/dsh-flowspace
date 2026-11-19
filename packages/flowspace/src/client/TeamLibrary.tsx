import { useId, useRef, useState, type ReactNode } from "react";
import type { FlowspaceSnapshot, RoleDefinition, TeamBlueprint, TeamModel } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { TeamAssetEditor, newTeamAsset, type TeamAsset } from "./TeamAssetEditor.tsx";
import { TeamMark, TeamSwitch } from "./TeamControls.tsx";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";

type Kind = TeamAsset["kind"];

export function TeamLibrary({ bridge, snapshot }: { bridge: CanvasBridge; snapshot: FlowspaceSnapshot | null }) {
  const roles = snapshot?.roles ?? [];
  const teams = snapshot?.teamBlueprints ?? [];
  const [choice, setKind] = useState<Kind>();
  const kind = choice ?? (teams.some((team) => !team.archived) ? "team" : "role");
  const [selectedId, setSelectedId] = useState<string>();
  const [editor, setEditor] = useState<TeamAsset>();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const directoryId = useId();
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const isTeam = kind === "team";
  const assets = isTeam
    ? teams.map((value): TeamAsset => ({ kind: "team", value }))
    : roles.map((value): TeamAsset => ({ kind: "role", value }));
  const search = query.trim().toLocaleLowerCase();
  const visible = assets.filter(({ value }) =>
    (showArchived || !value.archived) && value.title.toLocaleLowerCase().includes(search));
  const selected = visible.find(({ value }) => value.id === selectedId) ?? visible[0];
  const needsRole = isTeam && !roles.some((role) => !role.archived);
  const newLabel = t(isTeam ? "teamNewBlueprint" : "teamNewRole");

  function navigate(next: Kind, id?: string, archived = false) {
    setKind(next);
    setSelectedId(id);
    setQuery("");
    if (archived) setShowArchived(true);
    if (id) {
      setDirectoryOpen(false);
      requestAnimationFrame(() => detailTitle.current?.focus({ preventScroll: true }));
    }
  }

  function saved(asset: TeamAsset) {
    navigate(asset.kind, asset.value.id, asset.value.archived);
    setEditor(undefined);
  }

  return (
    <div className="fs-team-library">
      <aside className="fs-team-directory" aria-label={t("teamDirectory")} data-open={directoryOpen}>
        <button type="button" className="fs-team-directory-toggle" aria-expanded={directoryOpen} aria-controls={directoryId}
          onClick={() => setDirectoryOpen(!directoryOpen)}>
          <Icon name="sidebarLeft" /><strong>{t("teamDirectory")}</strong>
          <span>{t(isTeam ? "teamBlueprints" : "teamRoles")}</span><Icon name="chev" />
        </button>
        <div id={directoryId} className="fs-team-directory-body">
        <TeamSwitch<Kind> label={t("teamDirectory")} value={kind} onChange={(next) => navigate(next)}
          choices={[{ value: "team", label: t("teamBlueprints"), icon: "team" }, { value: "role", label: t("teamRoles"), icon: "person" }]} />
        <div className="fs-team-directory-tools">
          <label className="fs-team-search">
            <Icon name="search" />
            <input type="search" aria-label={t(isTeam ? "teamSearchBlueprint" : "teamSearchRole")}
              placeholder={t(isTeam ? "teamSearchBlueprint" : "teamSearchRole")} value={query}
              onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button type="button" className="icon-button fs-team-add" title={needsRole ? t("teamNeedsRole") : newLabel}
            aria-label={newLabel} disabled={needsRole} onClick={() => setEditor(newTeamAsset(kind))}><Icon name="plus" /></button>
        </div>
        <div className="fs-team-asset-list">
          {visible.map((item) => (
            <button type="button" key={item.value.id} aria-pressed={selected?.value.id === item.value.id}
              className="fs-team-asset-row" title={item.value.title} onClick={() => {
                if (directoryOpen) navigate(kind, item.value.id);
                else setSelectedId(item.value.id);
              }}>
              <TeamMark icon={isTeam ? "team" : "person"} />
              <span className="fs-team-row-copy">
                <strong className="user-content">{item.value.title}</strong>
                <small>{item.value.archived ? t("teamArchived") : item.kind === "team"
                  ? t("teamSlotCount", { count: item.value.slots.length }) : item.value.model.model}</small>
              </span>
              <Icon name="chev" />
            </button>
          ))}
        </div>
        <label className="fs-team-archive-filter">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          <Icon name="archive" />{t("teamShowArchived")}<i aria-hidden="true" />
        </label>
        </div>
      </aside>
      <section className="fs-team-detail" aria-label={t(isTeam ? "teamBlueprint" : "teamRole")}>
        {selected ? <div className="fs-team-detail-content" key={kind + selected.value.id}>
          <header className="fs-team-detail-heading">
            <div>
              <div className="fs-team-byline">
                {t(isTeam ? "teamBlueprint" : "teamRole")}<i aria-hidden="true" />
                <span>{t("teamRevision", { revision: selected.value.revision })}</span>
                {selected.value.archived && <span>{t("teamArchived")}</span>}
              </div>
              <h2 ref={detailTitle} tabIndex={-1} className="user-content">{selected.value.title}</h2>
            </div>
            {!selected.value.archived && <button type="button" className="button" onClick={() => setEditor(selected)}>
              <Icon name="edit" />{t(isTeam ? "teamEditBlueprint" : "teamEditRole")}
            </button>}
          </header>
          {selected.kind === "team"
            ? <BlueprintOverview team={selected.value} roles={roles} snapshot={snapshot}
                onRole={(role) => navigate("role", role.id, role.archived)} />
            : <RoleOverview role={selected.value} teams={teams} onTeam={(team) => navigate("team", team.id, team.archived)} />}
        </div> : <div className="fs-team-empty">
          <TeamMark icon={search ? "search" : isTeam ? "team" : "person"} />
          <h2>{t(search ? "teamNoMatch" : isTeam ? "teamEmptyBlueprints" : "teamEmptyRoles")}</h2>
          {!search && <p>{t(needsRole ? "teamNeedsRole" : isTeam ? "teamEmptyBlueprintHint" : "teamEmptyRoleHint")}</p>}
          <button type="button" className="button" onClick={() => search ? setQuery("") : setEditor(newTeamAsset(needsRole ? "role" : kind))}>
            <Icon name={search ? "x" : "plus"} />{search ? t("teamClearSearch") : needsRole ? t("teamNewRole") : newLabel}
          </button>
        </div>}
      </section>
      {editor && <TeamAssetEditor asset={editor} roles={roles} bridge={bridge} onSaved={saved} onClose={() => setEditor(undefined)} />}
    </div>
  );
}

function ModelName({ model }: { model: TeamModel }) {
  return <span className="fs-team-model-name">
    <span>{model.provider}</span> / {model.model}{model.reasoningEffort && " · " + model.reasoningEffort}
  </span>;
}

function Fact({ label, children }: { label: string; children?: ReactNode }) {
  return <div><dt>{label}</dt><dd className="user-content">{children || <span className="fs-team-muted">{t("teamNoInstructions")}</span>}</dd></div>;
}

function BlueprintOverview({ team, roles, snapshot, onRole }: {
  team: TeamBlueprint; roles: RoleDefinition[]; snapshot: FlowspaceSnapshot | null; onRole: (role: RoleDefinition) => void;
}) {
  const [slotId, setSlotId] = useState<string>();
  const slot = team.slots.find((item) => item.slotId === slotId);
  const role = roles.find((item) => item.id === slot?.roleId);
  const slotModel = slot?.model ?? role?.model;
  const running = new Set(Object.values(snapshot?.teams ?? {}).filter((runtime) =>
    runtime.teamId === team.id && (snapshot?.live.some((node) => node.sessionId === runtime.leadSessionId && node.running) ||
      snapshot?.runs.some((run) => run.steps.some((step) => step.sessionId === runtime.leadSessionId &&
        ["queued", "running", "settling"].includes(step.state))))).map((runtime) => runtime.revision));

  return <>
    <figure className="fs-team-map">
      <figcaption><span><Icon name="team" />{t("teamStructure")}</span><small>{t("teamSlotCount", { count: team.slots.length })}</small></figcaption>
      <div className="fs-team-branches">
        <button type="button" className="fs-team-map-node fs-team-map-lead" aria-pressed={!slot} onClick={() => setSlotId(undefined)}>
          <TeamMark icon="lead" /><span className="fs-team-row-copy"><strong>{t("teamLead")}</strong><small>{team.lead.model.model}</small></span>
        </button>
        <ul>{team.slots.map((item) => {
          const model = item.model ?? roles.find((role) => role.id === item.roleId)?.model;
          return <li key={item.slotId} data-selected={item.slotId === slot?.slotId}>
            <button type="button" className="fs-team-map-node" aria-pressed={item.slotId === slot?.slotId} onClick={() => setSlotId(item.slotId)}>
              <TeamMark icon="person" /><span className="fs-team-row-copy"><strong className="user-content">{item.label}</strong>
                {model && <small>{model.model}</small>}</span>
            </button>
          </li>;
        })}</ul>
      </div>
    </figure>
    <div className="fs-team-focus" data-slot={!!slot} key={slot?.slotId ?? "lead"}>
      <div className="fs-team-section-heading"><h3>{slot ? t("teamSlotDetails") : t("teamLead")}</h3>
        {role && <button type="button" className="text-button" onClick={() => onRole(role)}>{t("teamOpenRole")}<Icon name="chev" /></button>}
      </div>
      <dl className="fs-team-facts">
        {slot ? <>
          <Fact label={t("teamRole")}>{role?.title ?? slot.roleId}</Fact>
          <Fact label={t("teamSlotId")}>{slot.slotId}</Fact>
          <Fact label={t("teamModel")}>{slotModel && <ModelName model={slotModel} />}</Fact>
          <Fact label={t("teamMaxInstances")}>{slot.maxInstances ?? 1}</Fact>
        </> : <>
          <Fact label={t("teamLeadModel")}><ModelName model={team.lead.model} /></Fact>
          <Fact label={t("teamLeadPersona")}>{team.lead.persona}</Fact>
        </>}
      </dl>
    </div>
    <div className="fs-team-notes"><h3>{t("teamNorms")}</h3><p className="user-content">{team.norms || t("teamNoInstructions")}</p></div>
    <p className="fs-team-revision-note"><Icon name="clock" /><span>
      {running.size > 0 && t("teamRunningRevisions", { revisions: [...running].map((rev) => "v" + rev).join(", ") }) + " · "}
      {t("teamRevisionHint")}
    </span></p>
  </>;
}

function RoleOverview({ role, teams, onTeam }: {
  role: RoleDefinition; teams: TeamBlueprint[]; onTeam: (team: TeamBlueprint) => void;
}) {
  const usedBy = teams.filter((team) => team.slots.some((slot) => slot.roleId === role.id));
  return <>
    <div className="fs-team-role-profile">
      <TeamMark icon="person" />
      <div><h3>{t("teamResponsibility")}</h3><p className="user-content">{role.description || t("teamNoInstructions")}</p></div>
    </div>
    <dl className="fs-team-facts">
      <Fact label={t("teamModel")}><ModelName model={role.model} /></Fact>
      <Fact label={t("teamPersona")}>{role.persona}</Fact>
    </dl>
    <div className="fs-team-notes">
      <h3>{t("teamRoleUsedIn")}</h3>
      {usedBy.length ? <div className="fs-team-related">{usedBy.map((team) => (
        <button type="button" className="fs-team-link-row" key={team.id} onClick={() => onTeam(team)}>
          <Icon name="team" /><strong className="user-content">{team.title}</strong>
          {team.archived && <small>{t("teamArchived")}</small>}<Icon name="chev" />
        </button>
      ))}</div> : <p>{t("teamRoleUnused")}</p>}
    </div>
  </>;
}
