import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { FlowspaceSnapshot, RoleDefinition, TeamBlueprint, TeamModel, TeamSlot } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { TeamAssetEditor, newTeamAsset, type TeamAsset } from "./TeamAssetEditor.tsx";
import { AvatarStack, ModelChip, TeamAvatar, TeamMark, TeamSwitch, hueStyle, modelTitle, useFlip, useSlidingIndicator } from "./TeamControls.tsx";
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
  const list = useRef<HTMLDivElement>(null);
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
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const slotModel = (slot: TeamSlot) => slot.model ?? roleById.get(slot.roleId)?.model;

  useSlidingIndicator(list, '[aria-pressed="true"]', [selected?.value.id, kind, visible.length, search, showArchived]);
  useFlip(list, [kind, visible.map(({ value }) => value.id).join()]);

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

  const count = (items: { archived?: boolean }[]) => items.filter((item) => !item.archived).length;

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
            choices={[
              { value: "team", label: t("teamBlueprints"), icon: "team", badge: count(teams) || "" },
              { value: "role", label: t("teamRoles"), icon: "person", badge: count(roles) || "" },
            ]} />
          <div className="fs-team-directory-tools">
            <label className="fs-team-search">
              <Icon name="search" />
              <input type="search" aria-label={t(isTeam ? "teamSearchBlueprint" : "teamSearchRole")}
                placeholder={t(isTeam ? "teamSearchBlueprint" : "teamSearchRole")} value={query}
                onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button type="button" className="fs-team-add" title={needsRole ? t("teamNeedsRole") : newLabel}
              aria-label={newLabel} disabled={needsRole} onClick={() => setEditor(newTeamAsset(kind))}><Icon name="plus" /></button>
          </div>
          <div ref={list} className="fs-team-asset-list fs-indicator-host">
            {visible.map((item) => (
              <button type="button" key={item.value.id} data-flip={item.value.id}
                aria-pressed={selected?.value.id === item.value.id} data-archived={item.value.archived || undefined}
                className="fs-team-asset-row" title={item.value.title} onClick={() => {
                  if (directoryOpen) navigate(kind, item.value.id);
                  else setSelectedId(item.value.id);
                }}>
                {item.kind === "team"
                  ? <TeamAvatar variant="team" label={item.value.title} model={item.value.lead.model} />
                  : <TeamAvatar label={item.value.title} seed={item.value.id} model={item.value.model} />}
                <span className="fs-team-row-copy">
                  <strong className="user-content">{item.value.title || t("teamUntitled")}</strong>
                  <small>{item.value.archived ? t("teamArchived") : item.kind === "team"
                    ? t("teamSlotCount", { count: item.value.slots.length }) : item.value.model.model}</small>
                </span>
                {item.kind === "team" && <AvatarStack max={3} items={item.value.slots.map((slot) =>
                  ({ key: slot.slotId, label: slot.label, model: slotModel(slot) }))} />}
              </button>
            ))}
          </div>
          <label className="fs-team-archive-filter">
            <input type="checkbox" role="switch" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            <Icon name="archive" />{t("teamShowArchived")}<i aria-hidden="true" />
          </label>
        </div>
      </aside>
      <section className="fs-team-detail" aria-label={t(isTeam ? "teamBlueprint" : "teamRole")}>
        {selected ? <div className="fs-team-detail-content" key={kind + selected.value.id}>
          <header className="fs-team-hero">
            {selected.kind === "team"
              ? <TeamAvatar variant="team" size="lg" label={selected.value.title} model={selected.value.lead.model} />
              : <TeamAvatar size="lg" label={selected.value.title} seed={selected.value.id} model={selected.value.model} />}
            <div className="fs-team-hero-copy">
              <div className="fs-team-byline">
                <span>{t(isTeam ? "teamBlueprint" : "teamRole")}</span>
                <span className="fs-team-rev">v{selected.value.revision}</span>
                {selected.value.archived && <span className="fs-team-tag">{t("teamArchived")}</span>}
              </div>
              <h2 ref={detailTitle} tabIndex={-1} className="user-content">{selected.value.title || t("teamUntitled")}</h2>
              {selected.kind === "role" && selected.value.description &&
                <p className="user-content">{selected.value.description}</p>}
            </div>
            {!selected.value.archived && <button type="button" className="button fs-team-hero-action" onClick={() => setEditor(selected)}>
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
          <button type="button" className="button button-primary" onClick={() => search ? setQuery("") : setEditor(newTeamAsset(needsRole ? "role" : kind))}>
            <Icon name={search ? "x" : "plus"} />{search ? t("teamClearSearch") : needsRole ? t("teamNewRole") : newLabel}
          </button>
        </div>}
      </section>
      {editor && <TeamAssetEditor asset={editor} roles={roles} bridge={bridge} onSaved={saved} onClose={() => setEditor(undefined)} />}
    </div>
  );
}

function Prose({ children }: { children?: string }) {
  return children?.trim()
    ? <p className="fs-team-prose user-content">{children}</p>
    : <p className="fs-team-prose fs-team-muted">{t("teamNoInstructions")}</p>;
}

function Fact({ label, children, wide }: { label: string; children?: ReactNode; wide?: boolean }) {
  return <div className="fs-team-fact" data-wide={wide || undefined}><dt>{label}</dt>
    <dd className="user-content">{children ?? <span className="fs-team-muted">{t("teamNoInstructions")}</span>}</dd></div>;
}

function OrgChart({ team, roles, focus, onFocus }: {
  team: TeamBlueprint; roles: RoleDefinition[]; focus?: string; onFocus: (slotId?: string) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ id: string; d: string }[]>([]);
  const [hot, setHot] = useState<string>();
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const layout = team.slots.map((slot) => slot.slotId).join();

  useLayoutEffect(() => {
    const root = frame.current;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const lead = root.querySelector<HTMLElement>("[data-org-lead]")?.getBoundingClientRect();
      if (!lead || !box.width) return;
      const stacked = getComputedStyle(root).getPropertyValue("--org-stacked").trim() === "1";
      setPaths(Array.from(root.querySelectorAll<HTMLElement>("[data-org-slot]")).map((node) => {
        const slot = node.getBoundingClientRect();
        if (stacked) {
          const x = lead.left - box.left + 22;
          const y1 = lead.bottom - box.top;
          const y2 = slot.top - box.top + slot.height / 2;
          const x2 = slot.left - box.left;
          return { id: node.dataset.orgSlot!, d: `M ${x} ${y1} V ${y2 - 10} Q ${x} ${y2} ${x + 10} ${y2} H ${x2}` };
        }
        const x1 = lead.right - box.left;
        const y1 = lead.top - box.top + lead.height / 2;
        const x2 = slot.left - box.left;
        const y2 = slot.top - box.top + slot.height / 2;
        const mid = (x1 + x2) / 2;
        return { id: node.dataset.orgSlot!, d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}` };
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [layout]);

  const lit = hot ?? focus;
  return (
    <div ref={frame} className="fs-org" data-lit={lit ? "slot" : "lead"} style={{ "--slots": team.slots.length } as CSSProperties}>
      <svg className="fs-org-wires" aria-hidden="true">
        {paths.map((path, index) => {
          const slot = team.slots.find((item) => item.slotId === path.id);
          const model = slot?.model ?? roleById.get(slot?.roleId ?? "")?.model;
          return <path key={path.id} d={path.d} pathLength={1} data-lit={lit === path.id || !lit || undefined}
            style={hueStyle(model, { "--i": index } as CSSProperties)} />;
        })}
      </svg>
      <button type="button" data-org-lead className="fs-org-node fs-org-lead" aria-pressed={!focus}
        style={hueStyle(team.lead.model)} onClick={() => onFocus(undefined)}>
        <TeamAvatar variant="lead" label={t("teamLead")} model={team.lead.model} />
        <span className="fs-team-row-copy"><strong>{t("teamLead")}</strong><ModelChip model={team.lead.model} quiet /></span>
      </button>
      <ul className="fs-org-slots">
        {team.slots.map((slot, index) => {
          const role = roleById.get(slot.roleId);
          const model = slot.model ?? role?.model;
          return <li key={slot.slotId} style={{ "--i": index } as CSSProperties}>
            <button type="button" data-org-slot={slot.slotId} className="fs-org-node" aria-pressed={slot.slotId === focus}
              style={hueStyle(model)} onClick={() => onFocus(slot.slotId === focus ? undefined : slot.slotId)}
              onPointerEnter={() => setHot(slot.slotId)} onPointerLeave={() => setHot(undefined)}
              onFocus={() => setHot(slot.slotId)} onBlur={() => setHot(undefined)}>
              <TeamAvatar label={slot.label} seed={slot.slotId} model={model} />
              <span className="fs-team-row-copy">
                <strong className="user-content">{slot.label}</strong>
                <small className="user-content">{role?.title ?? slot.roleId}</small>
              </span>
              <span className="fs-org-meta">
                <ModelChip model={model} quiet />
                {(slot.maxInstances ?? 1) > 1 && <span className="fs-team-tag" title={t("teamMaxInstances")}>×{slot.maxInstances}</span>}
              </span>
            </button>
          </li>;
        })}
      </ul>
    </div>
  );
}

function BlueprintOverview({ team, roles, snapshot, onRole }: {
  team: TeamBlueprint; roles: RoleDefinition[]; snapshot: FlowspaceSnapshot | null; onRole: (role: RoleDefinition) => void;
}) {
  const [slotId, setSlotId] = useState<string>();
  const slot = team.slots.find((item) => item.slotId === slotId);
  const role = roles.find((item) => item.id === slot?.roleId);
  const slotModel: TeamModel | undefined = slot?.model ?? role?.model;
  const running = new Set(Object.values(snapshot?.teams ?? {}).filter((runtime) =>
    runtime.teamId === team.id && (snapshot?.live.some((node) => node.sessionId === runtime.leadSessionId && node.running) ||
      snapshot?.runs.some((run) => run.steps.some((step) => step.sessionId === runtime.leadSessionId &&
        ["queued", "running", "settling"].includes(step.state))))).map((runtime) => runtime.revision));

  return <>
    <figure className="fs-team-map">
      <figcaption><span><Icon name="team" />{t("teamStructure")}</span><small>{t("teamSlotCount", { count: team.slots.length })}</small></figcaption>
      <OrgChart team={team} roles={roles} focus={slot?.slotId} onFocus={setSlotId} />
    </figure>
    <section className="fs-team-card fs-team-inspector" key={slot?.slotId ?? "lead"} style={hueStyle(slot ? slotModel : team.lead.model)}>
      <header>
        {slot ? <TeamAvatar label={slot.label} seed={slot.slotId} model={slotModel} size="sm" /> : <TeamAvatar variant="lead" label={t("teamLead")} model={team.lead.model} size="sm" />}
        <div className="fs-team-row-copy">
          <strong className="user-content">{slot ? slot.label : t("teamLead")}</strong>
          <small>{slot ? t("teamSlotDetails") : t("teamLeadDuty")}</small>
        </div>
        {role && <button type="button" className="text-button" onClick={() => onRole(role)}>{t("teamOpenRole")}<Icon name="chev" /></button>}
      </header>
      <dl className="fs-team-facts">
        {slot ? <>
          <Fact label={t("teamRole")}>{role?.title ?? slot.roleId}</Fact>
          <Fact label={t("teamModel")}>{slotModel && <span className="fs-team-fact-model"><ModelChip model={slotModel} />
            {slot.model && <span className="fs-team-tag">{t("teamOverrideModel")}</span>}</span>}</Fact>
          <Fact label={t("teamSlotId")}><code>{slot.slotId}</code></Fact>
          <Fact label={t("teamMaxInstances")}>{slot.maxInstances ?? 1}</Fact>
          {role && <Fact label={t("teamResponsibility")} wide>{role.description || undefined}</Fact>}
        </> : <>
          <Fact label={t("teamLeadModel")}><span title={modelTitle(team.lead.model)}><ModelChip model={team.lead.model} /></span></Fact>
          <Fact label={t("teamLeadPersona")} wide>{team.lead.persona || undefined}</Fact>
        </>}
      </dl>
    </section>
    <section className="fs-team-card fs-team-notes">
      <h3><Icon name="note" />{t("teamNorms")}</h3>
      <Prose>{team.norms}</Prose>
    </section>
    <p className="fs-team-revision-note"><Icon name="clock" /><span>
      {running.size > 0 && <b>{t("teamRunningRevisions", { revisions: [...running].map((rev) => "v" + rev).join(", ") })}</b>}
      {t("teamRevisionHint")}
    </span></p>
  </>;
}

function RoleOverview({ role, teams, onTeam }: {
  role: RoleDefinition; teams: TeamBlueprint[]; onTeam: (team: TeamBlueprint) => void;
}) {
  const usedBy = teams.filter((team) => team.slots.some((slot) => slot.roleId === role.id));
  return <>
    <section className="fs-team-card" style={hueStyle(role.model)}>
      <dl className="fs-team-facts">
        <Fact label={t("teamModel")}><ModelChip model={role.model} /></Fact>
        <Fact label={t("teamResponsibility")}>{role.description || undefined}</Fact>
      </dl>
    </section>
    <section className="fs-team-card fs-team-notes">
      <h3><Icon name="person" />{t("teamPersona")}</h3>
      <Prose>{role.persona}</Prose>
    </section>
    <section className="fs-team-card fs-team-notes">
      <h3><Icon name="team" />{t("teamRoleUsedIn")}</h3>
      {usedBy.length ? <div className="fs-team-related">{usedBy.map((team) => (
        <button type="button" className="fs-team-pill" key={team.id} onClick={() => onTeam(team)}>
          <TeamAvatar variant="team" size="xs" label={team.title} model={team.lead.model} />
          <strong className="user-content">{team.title}</strong>
          {team.archived && <small>{t("teamArchived")}</small>}<Icon name="chev" />
        </button>
      ))}</div> : <p className="fs-team-prose fs-team-muted">{t("teamRoleUnused")}</p>}
    </section>
  </>;
}
