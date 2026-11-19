import { useEffect, useId, useState, type FormEvent } from "react";
import { uid } from "../core/document.ts";
import type { RoleDefinition, TeamBlueprint, TeamModel, TeamModelRoute } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { CanvasDialog } from "./CanvasDialog.tsx";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";

const emptyModel: TeamModel = { provider: "", model: "" };
const modelKey = ({ provider, model }: TeamModel) => JSON.stringify([provider, model]);

export function TeamModelPicker({ value, routes, onChange, label = t("teamModel") }: {
  value: TeamModel;
  routes: TeamModelRoute[];
  onChange: (model: TeamModel) => void;
  label?: string;
}) {
  const key = modelKey(value);
  const available = routes.some((route) => modelKey(route) === key);
  return (
    <div className="fs-team-model">
      <label>
        {label}
        <select required value={value.model ? key : ""} onChange={(event) => {
          const model = routes.find((route) => modelKey(route) === event.target.value);
          if (model) onChange({ provider: model.provider, model: model.model });
        }}>
          <option value="" disabled>{t("teamChooseModel")}</option>
          {value.model && !available && <option value={key}>{value.provider}/{value.model}</option>}
          {routes.map((route) => (
            <option key={modelKey(route)} value={modelKey(route)}>{route.providerName} · {route.name}</option>
          ))}
        </select>
      </label>
      <label>
        {t("teamEffort")}
        <input value={value.reasoningEffort ?? ""} onChange={(event) =>
          onChange({ ...value, reasoningEffort: event.target.value || undefined })
        } />
      </label>
    </div>
  );
}

export type TeamAsset = { kind: "role"; value: RoleDefinition } | { kind: "team"; value: TeamBlueprint };


export function newTeamAsset(kind: TeamAsset["kind"]): TeamAsset {
  const common = { id: uid(), title: "", revision: 0 };
  return kind === "role"
    ? { kind, value: { ...common, description: "", persona: "", model: emptyModel } }
    : { kind, value: { ...common, lead: { persona: "", model: emptyModel }, norms: "", slots: [] } };
}

export function TeamAssetEditor({ asset, roles, bridge, onClose, onSaved }: {
  asset: TeamAsset;
  roles: RoleDefinition[];
  bridge: CanvasBridge;
  onClose: () => void;
  onSaved: (asset: TeamAsset) => void;
}) {
  const [editor, setEditor] = useState(asset);
  const [routes, setRoutes] = useState<TeamModelRoute[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const formId = useId();
  const existing = asset.value.revision > 0;
  const title = editor.kind === "role"
    ? t(existing ? "teamEditRole" : "teamNewRole")
    : t(existing ? "teamEditBlueprint" : "teamNewBlueprint");

  useEffect(() => {
    let mounted = true;
    void bridge.listModelRoutes().then(
      (models) => { if (mounted) setRoutes(models); },
      (failure) => { if (mounted) setError(String(failure)); },
    );
    return () => { mounted = false; };
  }, [bridge]);

  async function persist(archive = false) {
    setPending(true);
    setError("");
    const { id, revision } = editor.value;
    try {
      if (editor.kind === "role") {
        const value = archive ? await bridge.archiveRole({ id, revision }) : await bridge.saveRole(editor.value);
        onSaved({ kind: "role", value });
      } else {
        const value = archive ? await bridge.archiveTeam({ id, revision }) : await bridge.saveTeam(editor.value);
        onSaved({ kind: "team", value });
      }
    } catch (failure) {
      setError(String(failure));
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void persist();
  }

  return (
    <CanvasDialog title={title} closeLabel={t("close")} className="fs-team-dialog" onClose={onClose}
      footer={<>
        {existing && <button type="button" className="fs-team-archive-button" disabled={pending}
          onClick={() => void persist(true)}><Icon name="archive" />{t("teamArchive")}</button>}
        <button type="button" className="button button-quiet" onClick={onClose}>{t("cancel")}</button>
        <button type="submit" form={formId} className="button button-primary" disabled={pending}>
          <Icon name="check" />{t(pending ? "saving" : "save")}
        </button>
      </>}>
      <form id={formId} className="fs-team-editor" onSubmit={submit}>
        <fieldset disabled={pending} aria-label={title}>
          <label>{t("teamTitle")}
            <input required autoFocus value={editor.value.title} onChange={(event) => {
              const title = event.target.value;
              setEditor(editor.kind === "role"
                ? { kind: "role", value: { ...editor.value, title } }
                : { kind: "team", value: { ...editor.value, title } });
            }} />
          </label>
          {editor.kind === "role"
            ? <RoleFields role={editor.value} routes={routes} onChange={(value) => setEditor({ kind: "role", value })} />
            : <BlueprintFields team={editor.value} roles={roles} activeRoles={roles.filter((role) => !role.archived)}
                routes={routes} onChange={(value) => setEditor({ kind: "team", value })} />}
        </fieldset>
        {error && <p role="alert" className="fs-team-error">{error}</p>}
      </form>
    </CanvasDialog>
  );
}

function RoleFields({ role, routes, onChange }: {
  role: RoleDefinition;
  routes: TeamModelRoute[];
  onChange: (role: RoleDefinition) => void;
}) {
  return <>
    <label>{t("teamResponsibility")}<input value={role.description} onChange={(event) => onChange({ ...role, description: event.target.value })} /></label>
    <label>{t("teamPersona")}<textarea rows={5} value={role.persona} onChange={(event) => onChange({ ...role, persona: event.target.value })} /></label>
    <TeamModelPicker value={role.model} routes={routes} onChange={(model) => onChange({ ...role, model })} />
  </>;
}

function BlueprintFields({ team, roles, activeRoles, routes, onChange }: {
  team: TeamBlueprint;
  roles: RoleDefinition[];
  activeRoles: RoleDefinition[];
  routes: TeamModelRoute[];
  onChange: (team: TeamBlueprint) => void;
}) {
  // A slot's editable ID cannot serve as its React key while the user types.
  const [rows, setRows] = useState(() => team.slots.map((slot) => ({ key: slot.slotId, added: false })));

  function addSlot() {
    const role = activeRoles[0];
    let position = team.slots.length + 1;
    while (team.slots.some((slot) => slot.slotId === `member-${position}`)) position++;
    setRows([...rows, { key: uid(), added: true }]);
    onChange({ ...team, slots: [...team.slots, { slotId: `member-${position}`, roleId: role.id, label: role.title }] });
  }

  function removeSlot(index: number) {
    setRows(rows.filter((_, i) => i !== index));
    onChange({ ...team, slots: team.slots.filter((_, i) => i !== index) });
  }

  return <>
    <h3 className="fs-team-form-section"><Icon name="lead" />{t("teamLead")}</h3>
    <label>{t("teamLeadPersona")}<textarea rows={3} value={team.lead.persona}
      onChange={(event) => onChange({ ...team, lead: { ...team.lead, persona: event.target.value } })} /></label>
    <TeamModelPicker value={team.lead.model} routes={routes} onChange={(model) => onChange({ ...team, lead: { ...team.lead, model } })} label={t("teamLeadModel")} />
    <label>{t("teamNorms")}<textarea rows={3} value={team.norms}
      onChange={(event) => onChange({ ...team, norms: event.target.value })} /></label>
    <h3 className="fs-team-form-section"><Icon name="team" />{t("teamRosterSlots")}</h3>
    <div className="fs-team-slots">
      {team.slots.map((slot, index) => {
        const defaultModel = roles.find((role) => role.id === slot.roleId)?.model ?? emptyModel;
        const update = (patch: Partial<typeof slot>) =>
          onChange({ ...team, slots: team.slots.map((item, i) => i === index ? { ...item, ...patch } : item) });
        return (
          <details className="fs-team-slot-editor" key={rows[index].key} open={rows[index].added}
            onInvalidCapture={(event) => { event.currentTarget.open = true; }}>
            <summary><Icon name="person" /><strong className="user-content">{slot.label || t("teamSlot")}</strong>
              <small>{slot.slotId}</small><Icon name="chev" /></summary>
            <div>
            <div className="fs-team-slot-fields">
              <label>{t("teamSlotId")}<input required value={slot.slotId} onChange={(event) => update({ slotId: event.target.value })} /></label>
              <label>{t("teamRole")}
                <select required value={slot.roleId} onChange={(event) => update({ roleId: event.target.value })}>
                  {roles.filter((role) => !role.archived || role.id === slot.roleId).map((role) => (
                    <option key={role.id} value={role.id}>{role.title}</option>
                  ))}
                </select>
              </label>
              <label>{t("teamSlotLabel")}<input required value={slot.label} onChange={(event) => update({ label: event.target.value })} /></label>
              <label>{t("teamMaxInstances")}<input type="number" required min={1} value={slot.maxInstances ?? 1}
                onChange={(event) => update({ maxInstances: event.target.valueAsNumber || 1 })} /></label>
            </div>
            <label className="fs-team-checkbox">
              <input type="checkbox" checked={!!slot.model} onChange={(event) => update({ model: event.target.checked ? defaultModel : undefined })} />
              {t("teamOverrideModel")}
            </label>
            {slot.model && <TeamModelPicker value={slot.model} routes={routes} onChange={(model) => update({ model })} />}
            <button type="button" className="text-button danger" onClick={() => removeSlot(index)}>{t("teamRemoveSlot")}</button>
            </div>
          </details>
        );
      })}
    </div>
    <div className="fs-team-actions">
      <button type="button" className="button" disabled={!activeRoles.length || team.slots.length >= 8} onClick={addSlot}>
        <Icon name="plus" />{t("teamAddSlot")}
      </button>
      {!activeRoles.length && <small className="fs-team-muted">{t("teamNeedsRole")}</small>}
    </div>
    <p className="fs-team-muted">{t("teamRevisionHint")}</p>
  </>;
}
