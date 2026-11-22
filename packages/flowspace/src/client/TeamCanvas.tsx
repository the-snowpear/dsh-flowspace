import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CanvasTeamConfig, FlowNode, FlowspaceSnapshot, TeamLayout, TeamMemberView, TeamModelRoute } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { buildCrew, type CrewMessage, type CrewRow } from "./teamCrew.ts";
import { staffPath, type ChildCard, type ChildLink } from "./childTree.ts";
import { useModelRoutes } from "./hooks/useModelRoutes.ts";
import { ModelChip, ModelSelect, Stepper, TeamAvatar, TeamSwitch, hueStyle } from "./TeamControls.tsx";
import { ProgressRing } from "./ui/ProgressRing.tsx";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";

export { useModelRoutes };

type Pt = { x: number; y: number };

/* ---------- Cross-highlight: one role lights its card, wire and seat ---------- */

function markStaff(id: string | undefined, on: boolean) {
  if (!id) return;
  for (const element of Array.from(document.querySelectorAll<HTMLElement | SVGElement>(`[data-staff-id="${CSS.escape(id)}"]`))) {
    if (on) element.setAttribute("data-staff-hot", "");
    else element.removeAttribute("data-staff-hot");
  }
}

export function staffHover(id: string | undefined) {
  return {
    onPointerEnter: () => markStaff(id, true),
    onPointerLeave: () => markStaff(id, false),
  };
}

/* ---------- Role node ---------- */

/**
 * Who fills a role right now. One member lives inside the role node; several
 * get their own cards under it, so the strip only counts them.
 */
export function RoleMembers({ members, onOpen }: { members: readonly TeamMemberView[]; onOpen: (sessionId: string) => void }) {
  if (!members.length) return null;
  const busy = members.filter((member) => member.activity === "running").length;
  if (members.length > 1) {
    return (
      <div className="fs-role-members" data-running={busy > 0 || undefined}>
        <Icon name="team" />
        <span>{t("teamRoleMembers", { count: members.length })}</span>
        {busy > 0 && <small>{t("teamRoleMembersBusy", { count: busy })}</small>}
      </div>
    );
  }
  const [member] = members;
  const running = member.activity === "running";
  const model = member.model ? { provider: member.provider ?? "", model: member.model } : undefined;
  return (
    <button type="button" className="fs-role-members fs-role-member" data-running={running || undefined}
      title={t("teamOpenMember")} onClick={(event) => { event.stopPropagation(); onOpen(member.sessionId); }}
      onPointerDown={(event) => event.stopPropagation()}>
      <TeamAvatar label={member.label} seed={member.name} model={model} active={running} size="sm" />
      <span className="fs-role-member-copy">
        <strong className="user-content">{member.name}</strong>
        <small>{t(running ? "running" : "teamIdle")}</small>
      </span>
      <ModelChip model={model} quiet />
      <Icon name="chev" />
    </button>
  );
}

export function RoleNodeBody({ node, team, snapshot, routes, running, members = [], onOpenMember, onEdit }: {
  node: FlowNode;
  team?: FlowNode;
  snapshot: FlowspaceSnapshot | null;
  routes: TeamModelRoute[];
  running: boolean;
  members?: readonly TeamMemberView[];
  onOpenMember: (sessionId: string) => void;
  onEdit: (patch: Partial<FlowNode>) => void;
}) {
  const roles = (snapshot?.roles ?? []).filter((role) => !role.archived || role.id === node.roleRef);
  const role = node.roleRef ? roles.find((item) => item.id === node.roleRef) : undefined;
  const model = node.teamModel ?? role?.model;
  const needsModel = !role && !node.teamModel;
  return (
    <div className="node-scroll fs-role-body" style={hueStyle(model)} data-running={running || undefined}>
      <RoleMembers members={members} onOpen={onOpenMember} />
      <label className="fs-role-field">
        <span>{t("teamRoleSource")}</span>
        <select value={node.roleRef ?? ""} onChange={(event) => {
          const picked = roles.find((item) => item.id === event.target.value);
          onEdit(picked
            ? { roleRef: picked.id, ...(!node.customTitle || !node.title.trim() ? { title: picked.title } : {}) }
            : { roleRef: undefined });
        }}>
          <option value="">{t("teamRoleInline")}</option>
          {roles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      {role ? (
        <p className="fs-role-preview user-content">{role.description || role.persona || role.title}</p>
      ) : (
        <>
          <label className="fs-role-field">
            <span>{t("teamRoleDuty")}</span>
            <input value={node.task} placeholder={t("teamRoleDutyPlaceholder")} spellCheck={false}
              onChange={(event) => onEdit({ task: event.target.value })} />
          </label>
          <label className="fs-role-field">
            <span>{t("teamRolePersona")}</span>
            <textarea rows={3} value={node.text} placeholder={t("teamRolePersonaPlaceholder")} spellCheck={false}
              onChange={(event) => onEdit({ text: event.target.value })} />
          </label>
        </>
      )}
      <div className="fs-role-row">
        <div className="fs-role-model" data-missing={needsModel || undefined}>
          <ModelSelect label={t("teamRoleModel")} value={node.teamModel} routes={routes}
            placeholder={t("teamRoleNeedsModel")} allowEmpty={role ? t("teamRoleModelDefault") : undefined}
            onChange={(teamModel) => onEdit({ teamModel })} />
        </div>
        <Stepper value={node.maxInstances ?? 1} label={t("teamMaxInstances")}
          onChange={(maxInstances) => onEdit({ maxInstances })} />
      </div>
      <footer className="fs-role-foot" data-staffed={team ? "" : undefined}>
        <Icon name={team ? "team" : "unplug"} />
        <span className="user-content">{team ? t("teamRoleStaffed", { team: team.title }) : t("teamRoleLoose")}</span>
      </footer>
    </div>
  );
}

export function RoleNodeSummary({ node, team, snapshot, members = [], onOpenMember }: {
  node: FlowNode;
  team?: FlowNode;
  snapshot: FlowspaceSnapshot | null;
  members?: readonly TeamMemberView[];
  onOpenMember: (sessionId: string) => void;
}) {
  const role = node.roleRef ? snapshot?.roles?.find((item) => item.id === node.roleRef) : undefined;
  const model = node.teamModel ?? role?.model;
  if (members.length) return <div className="compact-tool fs-role-compact"><RoleMembers members={members} onOpen={onOpenMember} /></div>;
  return (
    <div className="compact-tool fs-role-compact">
      <span>{model?.model ? <ModelChip model={model} quiet /> : t("teamRoleNeedsModel")}</span>
      <span className="user-content">{team ? team.title : t("teamRoleLoose")}</span>
    </div>
  );
}

/* ---------- Crew frame inside a team card ---------- */

interface Seat {
  key: string;
  nodeId?: string;
  label: string;
  rows: CrewRow[];
  vacant: boolean;
  outside: boolean;
}

interface Placed { x: number; y: number; w: number; h: number }

const GAP = 10;

function layoutCrew(layout: TeamLayout, width: number, count: number) {
  const w = Math.max(width, 180);
  if (layout === "tree") {
    const lead = { x: 0, y: 0, w, h: 48 };
    const seats = Array.from({ length: count }, (_, i) => ({ x: 26, y: 62 + i * 54, w: w - 26, h: 46 }));
    return { lead, seats, height: count ? seats[count - 1].y + 46 : 48 };
  }
  if (layout === "orbit") {
    const seatW = Math.min(132, (w - GAP) / 2), seatH = 54;
    const height = Math.max(228, Math.min(w * 0.62, 300));
    const lead = { x: w / 2 - 66, y: height / 2 - 26, w: 132, h: 52 };
    const rx = w / 2 - seatW / 2, ry = height / 2 - seatH / 2;
    const seats = Array.from({ length: count }, (_, i) => {
      const angle = -Math.PI / 2 + (count === 1 ? 0 : (i * 2 * Math.PI) / count) + (count === 2 ? Math.PI / 2 : 0);
      return { x: w / 2 + Math.cos(angle) * rx - seatW / 2, y: height / 2 + Math.sin(angle) * ry - seatH / 2, w: seatW, h: seatH };
    });
    return { lead, seats, height };
  }
  const leadW = Math.min(232, w);
  const lead = { x: (w - leadW) / 2, y: 0, w: leadW, h: 56 };
  const cols = Math.max(1, Math.floor((w + GAP) / (138 + GAP)));
  const seatW = Math.min(176, (w - (cols - 1) * GAP) / cols), seatH = 66;
  const seats = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, count - row * cols);
    const x0 = (w - (inRow * seatW + (inRow - 1) * GAP)) / 2;
    return { x: x0 + col * (seatW + GAP), y: FIRST_ROW_Y + row * (seatH + GAP), w: seatW, h: seatH };
  });
  return { lead, seats, height: count ? seats[count - 1].y + seatH : 56 };
}

const center = (box: Placed): Pt => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

function tether(layout: TeamLayout, lead: Placed, seat: Placed): string {
  if (layout === "tree") {
    const x = 13, y = seat.y + seat.h / 2;
    return `M ${x} ${lead.y + lead.h} L ${x} ${y - 8} Q ${x} ${y} ${x + 8} ${y} L ${seat.x} ${y}`;
  }
  if (layout === "orbit") {
    const a = center(lead), b = center(seat);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const a = { x: lead.x + lead.w / 2, y: lead.y + lead.h }, b = { x: seat.x + seat.w / 2, y: seat.y };
  if (seat.y <= FIRST_ROW_Y) {
    const bend = Math.max(18, (b.y - a.y) / 2);
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + bend} ${b.x} ${b.y - bend} ${b.x} ${b.y}`;
  }
  // Later rows run down the gutter beside the seat, never through the row above.
  const gutter = seat.x - GAP / 2, bus = a.y + 20;
  return orthogonal([a, { x: a.x, y: bus }, { x: gutter, y: bus }, { x: gutter, y: b.y - 9 }, { x: b.x, y: b.y - 9 }, b]);
}

const FIRST_ROW_Y = 96;

/** A polyline with softly rounded corners. */
function orthogonal(points: Pt[], radius = 7): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [p, c, n] = [points[i - 1], points[i], points[i + 1]];
    const r = Math.min(radius, Math.hypot(c.x - p.x, c.y - p.y) / 2, Math.hypot(n.x - c.x, n.y - c.y) / 2);
    const into = { x: c.x - Math.sign(c.x - p.x) * r, y: c.y - Math.sign(c.y - p.y) * r };
    const out = { x: c.x + Math.sign(n.x - c.x) * r, y: c.y + Math.sign(n.y - c.y) * r };
    d += ` L ${into.x} ${into.y} Q ${c.x} ${c.y} ${out.x} ${out.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

function chord(layout: TeamLayout, a: Placed, b: Placed, frame: { w: number; h: number }): string {
  const p = center(a), q = center(b);
  if (layout === "tree") {
    const x = Math.max(a.x + a.w, b.x + b.w) - 12;
    const bulge = Math.min(48, Math.abs(q.y - p.y) / 2 + 12);
    return `M ${x} ${p.y} C ${x + bulge} ${p.y} ${x + bulge} ${q.y} ${x} ${q.y}`;
  }
  // Bow the chord toward the frame's middle so it clears the seats it joins.
  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const c = layout === "orbit"
    ? { x: mid.x + (frame.w / 2 - mid.x) * 0.45, y: mid.y + (frame.h / 2 - mid.y) * 0.45 }
    : { x: mid.x, y: Math.max(p.y, q.y) + 34 };
  return `M ${p.x} ${p.y} Q ${c.x} ${c.y} ${q.x} ${q.y}`;
}

function seatsFor(rows: CrewRow[], slots: ReturnType<typeof buildCrew>["slots"]): Seat[] {
  const seats: Seat[] = slots.map((slot) => {
    const occupants = rows.filter((row) => row.kind !== "lead" && row.slotId === slot.slotId);
    return {
      key: slot.slotId, nodeId: slot.nodeId, label: slot.label, rows: occupants,
      vacant: occupants.every((row) => row.kind === "vacant"), outside: false,
    };
  });
  for (const row of rows) {
    if (row.kind === "member" && (row.outside || !slots.some((slot) => slot.slotId === row.slotId)))
      seats.push({ key: row.id, label: row.label, rows: [row], vacant: false, outside: true });
  }
  return seats;
}

const PACKET_MS = 1200;

export function CrewFrame({ node, nodes, snapshot, status, routes, onEditTeam, onLayout, onOpen }: {
  node: FlowNode;
  nodes: readonly FlowNode[];
  snapshot: FlowspaceSnapshot | null;
  status: string;
  routes: TeamModelRoute[];
  onEditTeam: (config: CanvasTeamConfig) => void;
  onLayout: (layout: TeamLayout) => void;
  /** Open the team room, optionally focused on one crew row. */
  onOpen: (rowId?: string) => void;
}) {
  const layout: TeamLayout = node.teamLayout ?? "row";
  const crew = useMemo(() => buildCrew(node, snapshot, status, nodes), [node, snapshot, status, nodes]);
  const { rows, messages, tasks, slots, leadId, leadModel } = crew;
  const seats = useMemo(() => seatsFor(rows, slots), [rows, slots]);
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [settings, setSettings] = useState(false);
  const [hot, setHot] = useState<string>();

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const read = () => setWidth(element.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placed = useMemo(() => layoutCrew(layout, width, seats.length), [layout, width, seats.length]);
  const seatOf = useMemo(() => {
    const map = new Map<string, number>();
    seats.forEach((seat, index) => seat.rows.forEach((row) => map.set(row.id, index)));
    return map;
  }, [seats]);
  const boxOf = (id: string): Placed | undefined => id === leadId ? placed.lead
    : seatOf.has(id) ? placed.seats[seatOf.get(id)!] : undefined;

  // Chords: one per talking pair; recency sets their weight.
  const chords = useMemo(() => {
    const pairs = new Map<string, { a: string; b: string; count: number; at: number }>();
    for (const message of messages) {
      const [a, b] = [message.from, message.to].sort();
      const key = `${a}|${b}`;
      const entry = pairs.get(key) ?? { a, b, count: 0, at: 0 };
      entry.count++;
      entry.at = Math.max(entry.at, message.at);
      pairs.set(key, entry);
    }
    return [...pairs.values()];
  }, [messages]);

  // Packets fly only for messages that arrive while the card is on screen.
  const seen = useRef<Set<string>>();
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [packets, setPackets] = useState<CrewMessage[]>([]);
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); }, []);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(messages.map((message) => message.id));
      return;
    }
    const fresh = messages.filter((message) => !seen.current!.has(message.id));
    if (!fresh.length) return;
    for (const message of fresh) seen.current.add(message.id);
    const ids = new Set(fresh.map((message) => message.id));
    setPackets((current) => [...current, ...fresh].slice(-8));
    // Each batch lands on its own clock, so a later message never strands an earlier packet.
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setPackets((current) => current.filter((item) => !ids.has(item.id)));
    }, PACKET_MS + 120);
    timers.current.add(timer);
  }, [messages]);

  const done = tasks.filter((task) => task.status === "completed").length;
  const active = tasks.filter((task) => task.status === "in_progress").length;
  const lead = rows[0];
  // Library teams carry their own lead; an agent that took role nodes keeps optional settings.
  const config = node.teamRef ? undefined : node.teamConfig ?? { persona: "", norms: "" };
  const frame = { w: Math.max(width, 180), h: placed.height };
  const related = (id: string) => hot !== undefined && (id === hot);
  const lit = (a: string, b: string) => hot !== undefined && (a === hot || b === hot);

  return (
    <div className="node-scroll fs-crew" data-layout={layout}>
      {config && (
        <div className="fs-crew-settings" data-open={settings || undefined}>
          <button type="button" className="fs-crew-settings-toggle" aria-expanded={settings}
            onClick={() => setSettings((open) => !open)}>
            <Icon name="lead" /><span>{t("teamLeadSettings")}</span>
            {config.model?.model ? <ModelChip model={config.model} quiet /> : <small>{t("teamLeadModelDefault")}</small>}
            <Icon name="chev" />
          </button>
          <div className="fs-crew-settings-body" {...(!settings ? { inert: "" } : {})}>
            <div>
              <ModelSelect label={t("teamRoleModel")} value={config.model} routes={routes}
                allowEmpty={t("teamLeadModelDefault")} placeholder={t("teamLeadModelDefault")}
                onChange={(model) => onEditTeam({ ...config, model })} />
              <label className="fs-role-field"><span>{t("teamLeadPersona")}</span>
                <textarea rows={3} value={config.persona} placeholder={t("teamLeadPersonaPlaceholder")} spellCheck={false}
                  onChange={(event) => onEditTeam({ ...config, persona: event.target.value })} /></label>
              <label className="fs-role-field"><span>{t("teamNorms")}</span>
                <textarea rows={2} value={config.norms} placeholder={t("teamNormsPlaceholder")} spellCheck={false}
                  onChange={(event) => onEditTeam({ ...config, norms: event.target.value })} /></label>
            </div>
          </div>
        </div>
      )}

      <div className="fs-crew-stage" ref={stage} style={{ height: placed.height } as CSSProperties}>
        {width > 0 && (
          <svg className="fs-crew-links" width={frame.w} height={frame.h} aria-hidden="true">
            {seats.map((seat, index) => {
              const box = placed.seats[index];
              const running = seat.rows.some((row) => row.tone === "running");
              return (
                <g key={seat.key} data-staff-id={seat.nodeId} className="fs-crew-tether"
                  data-running={running || undefined} data-vacant={seat.vacant || undefined}
                  data-lit={seat.rows.some((row) => related(row.id)) || undefined}>
                  <path d={tether(layout, placed.lead, box)} />
                  {running && <path className="fs-crew-tether-flow" d={tether(layout, placed.lead, box)} />}
                </g>
              );
            })}
            {chords.map((pair) => {
              const a = boxOf(pair.a), b = boxOf(pair.b);
              if (!a || !b || a === b || (pair.a === leadId || pair.b === leadId)) return null;
              return <path key={`${pair.a}|${pair.b}`} className="fs-crew-chord" data-lit={lit(pair.a, pair.b) || undefined}
                style={{ "--weight": Math.min(1, 0.35 + pair.count * 0.12) } as CSSProperties}
                d={chord(layout, a, b, frame)} />;
            })}
            {packets.map((message) => {
              const a = boxOf(message.from), b = boxOf(message.to);
              if (!a || !b || a === b) return null;
              const d = message.from === leadId || message.to === leadId
                ? `M ${center(a).x} ${center(a).y} L ${center(b).x} ${center(b).y}`
                : chord(layout, a, b, frame);
              return (
                <circle key={message.id} className="fs-crew-packet" r={3.5} data-settled={message.settled || undefined}>
                  <animateMotion dur={`${PACKET_MS}ms`} path={d} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                </circle>
              );
            })}
          </svg>
        )}

        <button type="button" className="fs-crew-lead" data-tone={lead.tone}
          style={{ transform: `translate(${placed.lead.x}px, ${placed.lead.y}px)`, width: placed.lead.w, height: placed.lead.h, ...hueStyle(leadModel) }}
          onPointerEnter={() => setHot(leadId)} onPointerLeave={() => setHot(undefined)}
          onClick={() => onOpen(leadId)}>
          <TeamAvatar label={t("teamLead")} variant="lead" model={leadModel} size="sm" tone={lead.tone} active={lead.tone === "running"} />
          <span className="fs-crew-copy">
            <strong>{t("teamLead")}</strong>
            <small>{lead.task?.subject ?? lead.status}</small>
          </span>
          {tasks.length > 0 && <ProgressRing variant="compact" done={done} total={tasks.length} />}
        </button>

        {seats.map((seat, index) => {
          const box = placed.seats[index];
          if (!box) return null;
          const first = seat.rows[0];
          const running = seat.rows.filter((row) => row.tone === "running").length;
          const model = first?.model;
          const members = seat.rows.filter((row) => row.kind === "member");
          return (
            <button type="button" key={seat.key} className="fs-crew-seat" data-staff-id={seat.nodeId}
              data-vacant={seat.vacant || undefined} data-outside={seat.outside || undefined}
              data-running={running > 0 || undefined}
              style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h, ...hueStyle(model) }}
              onPointerEnter={() => { setHot(first?.id); markStaff(seat.nodeId, true); }}
              onPointerLeave={() => { setHot(undefined); markStaff(seat.nodeId, false); }}
              onClick={() => onOpen(members[0]?.id)}>
              {members.length > 1 && <i className="fs-crew-seat-stack" aria-hidden="true" />}
              <TeamAvatar label={seat.label} seed={first?.seed ?? seat.key} model={model} size="sm"
                variant={seat.vacant ? "vacant" : "member"} tone={first?.tone} active={running > 0} />
              <span className="fs-crew-copy">
                <strong className="user-content">{seat.label}{members.length > 1 && <em>×{members.length}</em>}</strong>
                <small className="user-content">
                  {seat.outside ? t("teamOutsideRoster")
                    : seat.vacant ? (model?.model ? model.model : t("teamRoleNeedsModel"))
                      : seat.rows.find((row) => row.task)?.task?.subject ?? first?.status}
                </small>
              </span>
            </button>
          );
        })}

        {!seats.length && <p className="fs-crew-empty">{t("teamNoSlotsYet")}</p>}
      </div>

      <footer className="fs-crew-foot">
        <span className="fs-crew-taskbar" aria-label={t("teamTasksLine", { done, total: tasks.length })}>
          <i style={{ "--done": tasks.length ? done / tasks.length : 0, "--active": tasks.length ? active / tasks.length : 0 } as CSSProperties} />
        </span>
        <small>
          {t("teamTasksLine", { done, total: tasks.length })}
          {active > 0 && <> · {t("teamTasksActive", { count: active })}</>}
        </small>
        <TeamSwitch size="sm" label={t("teamLayout")} value={layout} onChange={onLayout}
          choices={(["row", "orbit", "tree"] as const).map((value) => ({ value, label: t(`teamLayout_${value}`) }))} />
        <button type="button" className="text-button fs-crew-room" onClick={() => onOpen()}>
          {t("teamOpenRoom")}<Icon name="chev" />
        </button>
      </footer>
    </div>
  );
}

/* ---------- Staffing wires (world space) ---------- */

export interface StaffWire {
  id: string;
  /** Team node's staffing port (bottom centre). */
  from: Pt;
  /** Role node's socket (top centre). */
  to: Pt;
  active: boolean;
}

export function StaffWires({ wires, drag, onMenu }: {
  wires: StaffWire[];
  drag?: { from: Pt; to: Pt; snapped: boolean } | null;
  onMenu: (roleId: string, at: Pt) => void;
}) {
  return (
    <g className="fs-staff-wires">
      {wires.map((wire) => {
        const d = staffPath(wire.from, wire.to);
        return (
          <g key={wire.id} className="fs-staff-wire" data-staff-id={wire.id} data-active={wire.active || undefined}
            {...staffHover(wire.id)}>
            <path className="edge-path fs-staff-line" d={d} />
            {wire.active && <path className="edge-path fs-staff-flow" d={d} />}
            <circle className="fs-staff-dot" cx={wire.to.x} cy={wire.to.y} r={3} />
            <path className="edge-hit" d={d} onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMenu(wire.id, { x: event.clientX, y: event.clientY });
            }} />
          </g>
        );
      })}
      {drag && (
        <path className="edge-path fs-staff-line fs-staff-temp" data-snapped={drag.snapped || undefined}
          d={staffPath(drag.from, drag.to)} />
      )}
    </g>
  );
}

/* ---------- Native children: subagent rows and member trees (world space) ---------- */

export function ChildLinks({ links }: { links: readonly ChildLink[] }) {
  return (
    <g className="fs-child-links">
      {links.map((link) => {
        const d = staffPath(link.from, link.to);
        return (
          <g key={link.id} className="fs-child-link" data-active={link.active || undefined} data-staff-id={link.staffId}>
            <path className="edge-path fs-child-line" d={d} />
            {link.active && <path className="edge-path fs-child-flow" d={d} />}
            <circle className="fs-child-root" cx={link.from.x} cy={link.from.y} r={3} />
            <circle className="fs-child-end" cx={link.to.x} cy={link.to.y} r={2.5} />
          </g>
        );
      })}
    </g>
  );
}

export function ChildCards({ cards, onOpen }: { cards: readonly ChildCard[]; onOpen: (card: ChildCard) => void }) {
  return (
    <>
      {cards.map((card) => (
        <button key={card.id} type="button" className="fs-child-card" data-running={card.running || undefined}
          data-member={card.member || undefined} data-outside={card.outside || undefined} data-staff-id={card.roleNodeId}
          style={{ left: card.box.x, top: card.box.y, width: card.box.w, height: card.box.h, ...hueStyle(card.model) }}
          title={t(card.member ? "teamOpenMember" : "openChatView")} {...(card.roleNodeId ? staffHover(card.roleNodeId) : {})}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); onOpen(card); }}>
          <TeamAvatar label={card.title} seed={card.name} model={card.model} active={card.running} size="sm" />
          <span className="fs-child-copy">
            <strong className="user-content">{card.member ? card.name : card.title}</strong>
            <small>
              {card.outside ? t("teamOutsideRoster") : !card.member ? t("subagent") : t(card.running ? "running" : "teamIdle")}
              {card.model?.model && <span> · {card.model.model}</span>}
            </small>
          </span>
          <i className="fs-child-dot" aria-hidden="true" />
        </button>
      ))}
    </>
  );
}
