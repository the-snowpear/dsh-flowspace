import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type { FlowNode, FlowspaceSnapshot, TeamMemberView, TeamSlotView, TeamTaskView } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { TeamMark, TeamSwitch } from "./TeamControls.tsx";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";
import { groupExchanges } from "./sceneWires.ts";

interface TeamViewProps {
  node: FlowNode;
  snapshot: FlowspaceSnapshot | null;
  status: string;
  bridge: CanvasBridge;
  leadConversation: ReactNode;
  renderConversation: (node: FlowNode | undefined, reference: SessionReference) => ReactNode;
  onBack: () => void;
  onBindLead: () => void;
  onError: (error: unknown) => void;
}

export function TeamView({ node, snapshot, status, bridge, leadConversation, renderConversation, onBack, onBindLead, onError }: TeamViewProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [panel, setPanel] = useState<"members" | "tasks">("members");
  const [reading, setReading] = useState(false);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const chatTitle = useRef<HTMLHeadingElement>(null);
  const runtime = node.sessionId ? snapshot?.teams?.[node.sessionId] : undefined;
  const blueprint = snapshot?.teamBlueprints?.find((team) => team.id === node.teamRef?.teamId);
  const leadModel = runtime?.leadModel ?? blueprint?.lead.model;
  const slots = runtime?.slots ?? (blueprint?.slots ?? []).flatMap((slot): TeamSlotView[] => {
    const role = snapshot?.roles?.find((role) => role.id === slot.roleId);
    return role ? [{ ...slot, roleTitle: role.title, model: slot.model ?? role.model, maxInstances: slot.maxInstances ?? 1 }] : [];
  });
  const members = runtime?.members ?? [];
  const selected = members.find((member) => member.sessionId === selectedId);
  const outside = members.filter((member) => member.slotId === null);
  const former = members.filter((member) => member.slotId !== null && !slots.some((slot) => slot.slotId === member.slotId));
  const tasks = runtime?.tasks ?? [];
  const roster = useRef<HTMLDivElement>(null);
  const labels = useMemo(() => new Map([
    ...(node.sessionId ? [[node.sessionId, node.title] as const] : []),
    ...(runtime?.members ?? []).map((member) => [member.sessionId, member.label] as const),
  ]), [node.sessionId, node.title, runtime?.members]);
  const exchanges = useMemo(() => groupExchanges(snapshot?.nativeMessages ?? [],
    (id) => labels.has(id) ? id : undefined), [snapshot?.nativeMessages, labels]);
  const messages = exchanges.flatMap((exchange) => exchange.items).sort((a, b) => b.at - a.at || b.seq - a.seq);

  function openConversation(id?: string) {
    setSelectedId(id);
    setReading(true);
    if (mobileToggle.current?.offsetWidth) requestAnimationFrame(() => chatTitle.current?.focus({ preventScroll: true }));
  }

  function memberCard(member: TeamMemberView) {
    return (
      <button type="button" key={member.sessionId} data-team-session={member.sessionId}
        className="fs-team-person" aria-pressed={member.sessionId === selected?.sessionId} onClick={() => openConversation(member.sessionId)}>
        <TeamMark icon="person" />
        <span className="fs-team-row-copy"><b className="user-content">{member.label}</b><small>{member.name}{member.model && ` · ${member.model}`}</small></span>
        <span className={`fs-team-activity ${member.activity}`} role="img" aria-label={t(member.activity === "running" ? "running" : "teamIdle")} />
      </button>
    );
  }

  return (
    <div className="fs-surface fs-team-view" data-reading={reading}>
      <header className="fs-team-view-header">
        <div className="fs-team-room-title">
          <nav aria-label={t("teamBreadcrumb")}><button type="button" className="fs-team-back" onClick={onBack}>
            <Icon name="chev" />{t("teamBack")}
          </button></nav>
          <div><TeamMark icon="team" /><h1 className="user-content">{node.title}</h1></div>
        </div>
        <div className="fs-team-view-meta">
          <span className={`status status-${status}`}><i />{t(status)}</span>
          {runtime && <span>{t("teamCapacity", runtime.capacity)}</span>}
          {(runtime || blueprint) && <small>{t("teamRevision", { revision: (runtime?.revision ?? blueprint!.revision) })}</small>}
        </div>
        <button type="button" className="button fs-team-mobile-toggle" ref={mobileToggle}
          aria-expanded={reading} onClick={() => setReading(!reading)}>
          <Icon name={reading ? (panel === "tasks" ? "board" : "team") : "chat"} />{t(reading ? (panel === "tasks" ? "teamTasks" : "teamMembers") : "teamChat")}
        </button>
      </header>
      <div className="fs-team-workspace">
        <aside className="fs-team-sidebar" aria-label={t("teamRoomPanels")}>
          <TeamSwitch<"members" | "tasks"> label={t("teamRoomPanels")} value={panel} onChange={setPanel}
            choices={[{ value: "members", label: t("teamMembers"), icon: "team" }, { value: "tasks", label: t("teamTasks"), icon: "board" }]} />
          {panel === "tasks" ? <TaskBoard tasks={tasks} /> : <div className="fs-team-roster">
          <div ref={roster} className="fs-team-roster-nodes" data-wires={exchanges.length > 0}>
            <button type="button" className="fs-team-person fs-team-lead" data-team-session={node.sessionId}
              aria-pressed={!selected} onClick={() => openConversation()}>
              <TeamMark icon="lead" />
              <span className="fs-team-row-copy"><b>{t("teamLead")}</b>{leadModel && <small title={leadModel.provider + "/" + leadModel.model}>{leadModel.model}</small>}</span>
            </button>
            {slots.map((slot) => {
              const occupants = members.filter((member) => member.slotId === slot.slotId);
              return (
                <section key={slot.slotId} className="fs-team-roster-slot" aria-label={slot.label}>
                  {occupants.length ? <>
                    <h3 className="user-content">{slot.label} <small>{occupants.length}/{slot.maxInstances}</small></h3>
                    {occupants.map(memberCard)}
                  </> : (
                    <div className="fs-team-person fs-team-vacancy">
                      <TeamMark icon="person" /><span className="fs-team-row-copy"><b className="user-content">{slot.label}</b><small>{slot.roleTitle} · {slot.model.model}</small></span>
                      <small>{t("teamVacant")}</small>
                    </div>
                  )}
                </section>
              );
            })}
            {!!outside.length && <section className="fs-team-roster-slot">
              <h3>{t("teamOutsideRoster")}</h3>{outside.map(memberCard)}
            </section>}
            {!!former.length && <section className="fs-team-roster-slot">
              <h3>{t("teamFormerSlots")}</h3>{former.map(memberCard)}
            </section>}
            {!!exchanges.length && <MessageWires roster={roster} exchanges={exchanges} focused={selected?.sessionId ?? node.sessionId} />}
          </div>
          {!!messages.length && (
            <details className="fs-team-message-log">
              <summary><Icon name="chat" /><strong>{t("teamMessages")}</strong><small>{messages.length}</small><Icon name="chev" /></summary>
              <ol>{messages.slice(0, 16).map((message) => (
                <li key={message.id}>
                  <b className="user-content">{labels.get(message.fromId)} → {labels.get(message.toId)}</b>
                  <p className="user-content">{message.text}</p>
                </li>
              ))}</ol>
            </details>
          )}
          </div>}
        </aside>

        <section className="fs-team-conversation" aria-label={t("teamConversation")}>
          <header>
            <TeamMark icon={selected ? "person" : "lead"} />
            <div className="fs-team-chat-title" key={selected?.sessionId ?? "lead"}>
              <h2 ref={chatTitle} tabIndex={-1} className={selected ? "user-content" : undefined}>{selected?.label ?? t("teamLead")}</h2>
              <small>{selected?.model ?? (!selected && leadModel?.model)}</small>
            </div>
            {selected && (selected.mode === "continuable" || selected.activity === "running") && <button type="button" className="button fs-team-interrupt" onClick={() =>
              void bridge.interruptTeamMember(selected.sessionId).catch(onError)
            }><Icon name="stop" />{t("teamInterruptMember")}</button>}
          </header>
          {selected && <p className="fs-team-approval"><Icon name="shield" />{t("teamRestrictedApproval")}</p>}
          <div className="fs-team-conversation-body">
            {selected
              ? selected.mode === "external" ? <p className="fs-team-muted">{t("teamExternalConversation")}</p>
                : <MemberConversation key={selected.sessionId} bridge={bridge} member={selected} renderConversation={renderConversation} onError={onError} />
              : node.sessionId ? leadConversation : (
                <div className="fs-team-empty fs-team-start">
                  <TeamMark icon="chat" /><p>{t("teamLeadStartHint")}</p>
                  <button type="button" className="button button-primary" onClick={onBindLead}>{t("teamCreateLead")}</button>
                </div>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MemberConversation({ bridge, member, renderConversation, onError }: Pick<TeamViewProps, "bridge" | "renderConversation" | "onError"> & { member: TeamMemberView }) {
  const [reference, setReference] = useState<SessionReference>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let retained: SessionReference | undefined;
    const failed = (error: unknown) => {
      if (!active) return;
      setError(String(error));
      onError(error);
    };
    try {
      retained = bridge.retainTeamMember(member);
      void retained.ready.then(() => { if (active) setReference(retained); }, failed);
    } catch (error) {
      failed(error);
    }
    return () => { active = false; retained?.release(); };
  }, [bridge, member.sessionId, member.parentId, member.mode, onError]);
  return reference ? renderConversation(undefined, reference)
    : <p className={error ? "fs-team-error" : "fs-loading"}>{error || t("openingConversation")}</p>;
}

function TaskBoard({ tasks }: { tasks: TeamTaskView[] }) {
  const subjects = new Map(tasks.map((task) => [task.id, task.subject]));
  const done = tasks.filter((task) => task.status === "completed").length;
  return (
    <section className="fs-team-taskboard" aria-label={t("teamTasks")}>
      {tasks.length ? <>
        <div className="fs-team-task-progress"><span>{t("teamTaskProgress", { done, total: tasks.length })}</span>
          <progress aria-label={t("teamTasks")} value={done} max={tasks.length} /></div>
        {(["pending", "in_progress", "completed"] as const).map((status) => {
          const lane = tasks.filter((task) => task.status === status);
          return lane.length > 0 && <details key={status} className="fs-team-lane" data-state={status} open>
            <summary><i aria-hidden="true" /><strong>{t(`teamTask_${status}`)}</strong><small>{lane.length}</small><Icon name="chev" /></summary>
            {lane.map((task) => <article key={task.id}>
              <b className="user-content">{task.subject}</b>
              {task.description && <p className="user-content">{task.description}</p>}
              {(task.ownerName ?? task.ownerId) && <small className="user-content">{t("teamTaskOwner", { owner: task.ownerName ?? task.ownerId! })}</small>}
              {!!task.blockedBy.length && <small className="user-content">{t("teamTaskBlocked", { blockers: task.blockedBy.map((id) => subjects.get(id) ?? id).join(", ") })}</small>}
              {task.ready && status === "pending" && <small>{t("teamTaskReady")}</small>}
            </article>)}
          </details>;
        })}
      </> : <div className="fs-team-empty"><TeamMark icon="board" /><h3>{t("teamNoTasks")}</h3><p>{t("teamNoTasksHint")}</p></div>}
    </section>
  );
}

function MessageWires({ roster, exchanges, focused }: {
  roster: React.RefObject<HTMLDivElement>; exchanges: ReturnType<typeof groupExchanges>; focused?: string;
}) {
  const id = useId();
  type Wire = { id: string; from: string; to: string; out?: string; back?: string };
  const [paths, setPaths] = useState<Wire[]>([]);
  useEffect(() => {
    const surface = roster.current;
    if (!surface) return;
    const cards = Array.from(surface.querySelectorAll<HTMLElement>("[data-team-session]"));
    function measure() {
      const frame = surface!.getBoundingClientRect();
      if (!frame.width) return;
      const ports = new Map(cards.map((card) => {
        const box = card.getBoundingClientRect();
        return [card.dataset.teamSession!, { x: box.right - frame.left, y: box.y - frame.y + box.height / 2 }] as const;
      }));
      setPaths(exchanges.flatMap((exchange) => {
        const a = ports.get(exchange.from);
        const b = ports.get(exchange.to);
        if (!a || !b) return [];
        // Longer exchanges run farther out in the gutter, clear of other member rows.
        const lane = Math.max(a.x, b.x) + Math.min(43, 13 + Math.abs(a.y - b.y) * 0.12);
        return [{ id: exchange.id, from: exchange.from, to: exchange.to,
          out: exchange.items.some((item) => item.fromId === exchange.from)
            ? `M ${a.x} ${a.y - 3} C ${lane} ${a.y - 3}, ${lane} ${b.y - 3}, ${b.x} ${b.y - 3}` : undefined,
          back: exchange.items.some((item) => item.fromId === exchange.to)
            ? `M ${b.x} ${b.y + 3} C ${lane + 8} ${b.y + 3}, ${lane + 8} ${a.y + 3}, ${a.x} ${a.y + 3}` : undefined }];
      }));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    for (const card of cards) observer.observe(card);
    return () => observer.disconnect();
  }, [exchanges, roster]);
  return <svg className="fs-team-message-wires" aria-hidden="true">
    <defs>
      {[["out", "--m-f"], ["back", "--m-b"]].map(([direction, color]) =>
        <marker key={direction} id={`${id}-${direction}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M1 1 L7 4 L1 7" fill="none" stroke={`var(${color})`} />
        </marker>)}
    </defs>
    {paths.map((path) => <g key={path.id} data-focused={path.from === focused || path.to === focused}>
      {path.out && <path className="edge-path edge-message message-out" d={path.out} markerEnd={`url(#${id}-out)`} />}
      {path.back && <path className="edge-path edge-message message-back" d={path.back} markerEnd={`url(#${id}-back)`} />}
    </g>)}
  </svg>;
}
