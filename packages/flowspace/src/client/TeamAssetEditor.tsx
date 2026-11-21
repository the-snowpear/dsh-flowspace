import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { uid } from "../core/document.ts";
import type { RoleDefinition, TeamBlueprint, TeamModel, TeamModelRoute, TeamSlot } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { CanvasDialog } from "./CanvasDialog.tsx";
import { ModelChip, ModelSelect, Stepper, TeamAvatar } from "./TeamControls.tsx";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";

const emptyModel: TeamModel = { provider: "", model: "" };
const MAX_SLOTS = 8;

/** Model choice plus the optional adapter-owned reasoning effort. */
export function TeamModelPicker({ value, routes, onChange, label = t("teamModel"), hint }: {
  value: TeamModel;
  routes: TeamModelRoute[];
  onChange: (model: TeamModel) => void;
  label?: string;
  hint?: string;
}) {
  const effortId = useId();
  return (
    <div className="fs-field">
      <span className="fs-field-label">{label}</span>
      <div className="fs-team-model">
        <ModelSelect label={label} value={value.model ? value : undefined} routes={routes}
          onChange={(model) => model && onChange({ ...model, ...(value.reasoningEffort ? { reasoningEffort: value.reasoningEffort } : {}) })} />
        <label className="fs-team-effort" htmlFor={effortId} title={t("teamEffort")}>
          <Icon name="bolt" />
          <input id={effortId} aria-label={t("teamEffort")} placeholder={t("teamDefaultEffort")}
            value={value.reasoningEffort ?? ""} onChange={(event) =>
              onChange({ ...value, reasoningEffort: event.target.value.trim() ? event.target.value : undefined })} />
        </label>
      </div>
      {hint && <small className="fs-field-hint">{hint}</small>}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="fs-field"><span className="fs-field-label">{label}</span>{children}
    {hint && <small className="fs-field-hint">{hint}</small>}</label>;
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
  const [confirmArchive, setConfirmArchive] = useState(false);
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

  useEffect(() => {
    if (!confirmArchive) return;
    const timer = setTimeout(() => setConfirmArchive(false), 3200);
    return () => clearTimeout(timer);
  }, [confirmArchive]);

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

  const setTitle = (value: string) => setEditor(editor.kind === "role"
    ? { kind: "role", value: { ...editor.value, title: value } }
    : { kind: "team", value: { ...editor.value, title: value } });

  return (
    <CanvasDialog title={title} closeLabel={t("close")} className="fs-team-dialog fs-team-sheet" onClose={onClose}
      footer={<>
        {existing && <button type="button" className="fs-team-archive-button" data-confirm={confirmArchive || undefined}
          disabled={pending} onClick={() => confirmArchive ? void persist(true) : setConfirmArchive(true)}>
          <Icon name="archive" />{t(confirmArchive ? "teamArchiveConfirm" : "teamArchive")}</button>}
        <button type="button" className="button button-quiet" onClick={onClose}>{t("cancel")}</button>
        <button type="submit" form={formId} className="button button-primary" disabled={pending} data-pending={pending || undefined}>
          <Icon name="check" />{t(pending ? "saving" : "save")}
        </button>
      </>}>
      <form id={formId} className="fs-team-editor" onSubmit={submit}>
        <fieldset disabled={pending} aria-label={title}>
          <div className="fs-sheet-identity">
            {editor.kind === "role"
              ? <TeamAvatar size="lg" label={editor.value.title} seed={editor.value.id} model={editor.value.model} />
              : <TeamAvatar size="lg" variant="team" label={editor.value.title} model={editor.value.lead.model} />}
            <input className="fs-sheet-title" required autoFocus aria-label={t("teamTitle")} value={editor.value.title}
              placeholder={t(editor.kind === "role" ? "teamRoleNamePlaceholder" : "teamBlueprintNamePlaceholder")}
              onChange={(event) => setTitle(event.target.value)} />
          </div>
          {editor.kind === "role"
            ? <RoleFields role={editor.value} routes={routes} onChange={(value) => setEditor({ kind: "role", value })} />
            : <BlueprintFields team={editor.value} roles={roles} activeRoles={roles.filter((role) => !role.archived)}
                routes={routes} onChange={(value) => setEditor({ kind: "team", value })} />}
        </fieldset>
        {error && <p role="alert" className="fs-team-error"><Icon name="x" />{error}</p>}
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
    <Field label={t("teamResponsibility")}>
      <input value={role.description} onChange={(event) => onChange({ ...role, description: event.target.value })} />
    </Field>
    <TeamModelPicker value={role.model} routes={routes} hint={t("teamRoleModelHint")}
      onChange={(model) => onChange({ ...role, model })} />
    <Field label={t("teamPersona")} hint={t("teamRolePersonaHint")}>
      <textarea rows={5} value={role.persona} onChange={(event) => onChange({ ...role, persona: event.target.value })} />
    </Field>
  </>;
}

type Row = { key: string; open: boolean };
type Drag = { index: number; over: number; dy: number; startY: number; heights: number[]; tops: number[]; gap: number };

function BlueprintFields({ team, roles, activeRoles, routes, onChange }: {
  team: TeamBlueprint;
  roles: RoleDefinition[];
  activeRoles: RoleDefinition[];
  routes: TeamModelRoute[];
  onChange: (team: TeamBlueprint) => void;
}) {
  // A slot's editable ID cannot serve as its React key while the user types.
  const [rows, setRows] = useState<Row[]>(() => team.slots.map((slot) => ({ key: slot.slotId, open: false })));
  const [drag, setDrag] = useState<Drag>();
  const list = useRef<HTMLOListElement>(null);
  const dropped = useRef<{ key: string; top: number }>();
  const roleById = new Map(roles.map((role) => [role.id, role]));

  // After a drop, glide the released row from where the pointer left it.
  useLayoutEffect(() => {
    const landing = dropped.current;
    const root = list.current;
    if (!landing || !root) return;
    dropped.current = undefined;
    const el = root.querySelector<HTMLElement>(`[data-row="${landing.key}"]`);
    root.dataset.settling = "";
    requestAnimationFrame(() => { delete root.dataset.settling; });
    if (!el || root.closest('[data-perf-tier="L1"]') || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const offset = landing.top - el.getBoundingClientRect().top;
    if (Math.abs(offset) > 1) el.animate([{ transform: `translateY(${offset}px) scale(1.015)` }, { transform: "none" }],
      { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" });
  });

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= team.slots.length) return;
    const slots = [...team.slots];
    const nextRows = [...rows];
    slots.splice(to, 0, ...slots.splice(from, 1));
    nextRows.splice(to, 0, ...nextRows.splice(from, 1));
    setRows(nextRows);
    onChange({ ...team, slots });
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0 || !list.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const items = Array.from(list.current.querySelectorAll<HTMLElement>(":scope > [data-row]"));
    const boxes = items.map((item) => item.getBoundingClientRect());
    const gap = boxes.length > 1 ? boxes[1].top - boxes[0].bottom : 8;
    setDrag({ index, over: index, dy: 0, startY: event.clientY, heights: boxes.map((box) => box.height), tops: boxes.map((box) => box.top), gap });
  }

  function dragMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    const center = drag.tops[drag.index] + dy + drag.heights[drag.index] / 2;
    let over = 0;
    for (let i = 0; i < drag.tops.length; i++) if (center > drag.tops[i] + drag.heights[i] / 2) over = i;
    if (center < drag.tops[0] + drag.heights[0] / 2) over = 0;
    setDrag({ ...drag, dy, over });
  }

  function endDrag() {
    if (!drag) return;
    const el = list.current?.querySelector<HTMLElement>(`:scope > [data-row="${rows[drag.index].key}"]`);
    if (el) dropped.current = { key: rows[drag.index].key, top: el.getBoundingClientRect().top };
    setDrag(undefined);
    move(drag.index, drag.over);
  }

  function shift(index: number): number {
    if (!drag || index === drag.index) return 0;
    const size = drag.heights[drag.index] + drag.gap;
    if (drag.index < drag.over && index > drag.index && index <= drag.over) return -size;
    if (drag.index > drag.over && index < drag.index && index >= drag.over) return size;
    return 0;
  }

  function gripKeys(event: KeyboardEvent, index: number) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const to = index + (event.key === "ArrowUp" ? -1 : 1);
    move(index, to);
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLElement>(".fs-slot-grip")[to]?.focus());
  }

  function addSlot() {
    const role = activeRoles[0];
    let position = team.slots.length + 1;
    while (team.slots.some((slot) => slot.slotId === `member-${position}`)) position++;
    setRows([...rows.map((row) => ({ ...row, open: false })), { key: uid(), open: true }]);
    onChange({ ...team, slots: [...team.slots, { slotId: `member-${position}`, roleId: role.id, label: role.title }] });
  }

  function removeSlot(index: number) {
    setRows(rows.filter((_, i) => i !== index));
    onChange({ ...team, slots: team.slots.filter((_, i) => i !== index) });
  }

  const toggle = (index: number, open = !rows[index].open) =>
    setRows(rows.map((row, i) => i === index ? { ...row, open } : row));

  return <>
    <section className="fs-sheet-section fs-sheet-lead">
      <header><TeamAvatar variant="lead" size="sm" label={t("teamLead")} model={team.lead.model} />
        <div className="fs-team-row-copy"><strong>{t("teamLead")}</strong><small>{t("teamLeadDuty")}</small></div></header>
      <TeamModelPicker value={team.lead.model} routes={routes} label={t("teamLeadModel")}
        onChange={(model) => onChange({ ...team, lead: { ...team.lead, model } })} />
      <Field label={t("teamLeadPersona")}>
        <textarea rows={3} value={team.lead.persona}
          onChange={(event) => onChange({ ...team, lead: { ...team.lead, persona: event.target.value } })} />
      </Field>
    </section>

    <section className="fs-sheet-section">
      <header className="fs-sheet-section-title">
        <h3><Icon name="team" />{t("teamRosterSlots")}</h3>
        <small>{team.slots.length}/{MAX_SLOTS}</small>
      </header>
      {!team.slots.length && <p className="fs-sheet-empty">{t("teamSlotsEmpty")}</p>}
      <ol ref={list} className="fs-slot-list" data-dragging={drag ? "" : undefined}>
        {team.slots.map((slot, index) => {
          const row = rows[index];
          const role = roleById.get(slot.roleId);
          const model = slot.model ?? role?.model;
          const update = (patch: Partial<TeamSlot>) =>
            onChange({ ...team, slots: team.slots.map((item, i) => i === index ? { ...item, ...patch } : item) });
          const lifted = drag?.index === index;
          return (
            <li key={row.key} data-row={row.key} className="fs-slot" data-open={row.open || undefined} data-lifted={lifted || undefined}
              style={{ transform: lifted ? `translateY(${drag!.dy}px)` : shift(index) ? `translateY(${shift(index)}px)` : undefined }}
              onInvalidCapture={() => toggle(index, true)}>
              <div className="fs-slot-row">
                <button type="button" className="fs-slot-grip" aria-label={t("teamDragSlot")} title={t("teamDragSlot")}
                  onPointerDown={(event) => startDrag(event, index)} onPointerMove={dragMove}
                  onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={(event) => gripKeys(event, index)}>
                  <Icon name="grip" />
                </button>
                <TeamAvatar label={slot.label} seed={slot.slotId} model={model} />
                <div className="fs-slot-main">
                  <input className="fs-slot-label user-content" required aria-label={t("teamSlotLabel")} value={slot.label}
                    placeholder={t("teamSlotLabel")} onChange={(event) => update({ label: event.target.value })} />
                  <div className="fs-slot-meta">
                    <span className="fs-slot-role">
                      <select required aria-label={t("teamRole")} value={slot.roleId} onChange={(event) => {
                        const next = roleById.get(event.target.value);
                        update({ roleId: event.target.value, ...(next && slot.label === role?.title ? { label: next.title } : {}) });
                      }}>
                        {roles.filter((item) => !item.archived || item.id === slot.roleId).map((item) => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                      </select>
                      <Icon name="chev" />
                    </span>
                    <ModelChip model={model} quiet />
                    {(slot.maxInstances ?? 1) > 1 && <span className="fs-team-tag">×{slot.maxInstances}</span>}
                  </div>
                </div>
                <button type="button" className="fs-slot-icon" aria-expanded={row.open} aria-label={t("teamSlotOptions")}
                  title={t("teamSlotOptions")} onClick={() => toggle(index)}><Icon name="chev" /></button>
                <button type="button" className="fs-slot-icon danger" aria-label={t("teamRemoveSlot")} title={t("teamRemoveSlot")}
                  onClick={() => removeSlot(index)}><Icon name="trash" /></button>
              </div>
              <div className="fs-collapse" {...(row.open ? {} : { inert: "" })}>
                <div className="fs-slot-details">
                  <Field label={t("teamSlotId")}>
                    <input required value={slot.slotId} spellCheck={false} className="fs-mono"
                      onChange={(event) => update({ slotId: event.target.value })} />
                  </Field>
                  <div className="fs-field">
                    <span className="fs-field-label">{t("teamMaxInstances")}</span>
                    <Stepper label={t("teamMaxInstances")} value={slot.maxInstances ?? 1} onChange={(maxInstances) => update({ maxInstances })} />
                  </div>
                  <div className="fs-field fs-slot-model">
                    <span className="fs-field-label">{t("teamModel")}</span>
                    <ModelSelect label={t("teamModel")} routes={routes} value={slot.model}
                      allowEmpty={`${t("teamUseRoleModel")}${role ? ` · ${role.model.model}` : ""}`}
                      onChange={(next) => update({ model: next })} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="fs-slot-add" disabled={!activeRoles.length || team.slots.length >= MAX_SLOTS} onClick={addSlot}>
        <Icon name="plus" />{t("teamAddSlot")}
        {!activeRoles.length && <small>{t("teamNeedsRole")}</small>}
      </button>
    </section>

    <Field label={t("teamNorms")} hint={t("teamNormsHint")}>
      <textarea rows={3} value={team.norms} onChange={(event) => onChange({ ...team, norms: event.target.value })} />
    </Field>
    <p className="fs-team-revision-note"><Icon name="clock" /><span>{t("teamRevisionHint")}</span></p>
  </>;
}
