import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type { FlowNode, FlowspaceSnapshot, TeamMemberView, TeamTaskView } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { ModelChip, TeamAvatar, TeamMark, hueStyle, useFlip, useSlidingIndicator } from "./TeamControls.tsx";
import { TeamComms } from "./TeamComms.tsx";
import { TeamOrbit } from "./TeamOrbit.tsx";
import { buildCrew, relativeTime, type CrewGroup, type CrewMessage, type CrewRow } from "./teamCrew.ts";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";

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
  /** Canvas nodes, for role nodes wired into the team. */
  nodes?: readonly FlowNode[];
  /** Crew row to select on open. */
  initialSelection?: string;
}

type Stage = "crew" | "orbit" | "tasks" | "comms";
type Pane = "chat" | "overview" | "messages";
type Tier = "bridge" | "split" | "stack";

const INSPECTOR_KEY = "flowspace.teamInspector";
const INSPECTOR_MIN = 360;
const INSPECTOR_MAX = 680;
const GROUPS: CrewGroup[] = ["running", "idle", "vacant"];

function stored(key: string, fallback: number, min: number, max: number) {
  try {
    const value = Number(localStorage.getItem(key));
    return value >= min && value <= max ? value : fallback;
  } catch {
    return fallback;
  }
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const timer = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 15_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export function TeamView({ node, snapshot, status, bridge, leadConversation, renderConversation, onBack, onBindLead, onError, nodes, initialSelection }: TeamViewProps) {
  const crew = useMemo(() => buildCrew(node, snapshot, status, nodes), [node, snapshot, status, nodes]);
  const { rows, messages, tasks, runtime, blueprint, leadModel, leadId } = crew;
  const root = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<Tier>("bridge");
  const [stage, setStage] = useState<Stage>("orbit");
  const [pane, setPane] = useState<Pane>("chat");
  const [selectedId, setSelectedId] = useState(initialSelection ?? leadId);
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<ReadonlySet<CrewGroup>>(new Set());
  const [inspector, setInspector] = useState(() => stored(INSPECTOR_KEY, 460, INSPECTOR_MIN, INSPECTOR_MAX));
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const leadRunning = rows[0].tone === "running";
  const now = useNow(true);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const read = () => {
      const width = element.clientWidth;
      setTier(width >= 1160 ? "bridge" : width >= 800 ? "split" : "stack");
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // The crew list is a stage tab only while it has no column of its own.
  useEffect(() => { if (tier === "bridge" && stage === "crew") setStage("orbit"); }, [tier, stage]);
  useEffect(() => { if (!rows.some((row) => row.id === selectedId)) setSelectedId(leadId); }, [rows, selectedId, leadId]);

  const needle = query.trim().toLowerCase();
  const matched = useMemo(() => new Set(rows.filter((row) => row.kind === "lead" || (
    (!groups.size || groups.has(row.group)) &&
    (!needle || [row.label, row.instance, row.roleTitle, row.model?.model, row.task?.subject].some((text) => text?.toLowerCase().includes(needle)))
  )).map((row) => row.id)), [rows, groups, needle]);

  function select(id: string) {
    setSelectedId(id);
    const row = rows.find((item) => item.id === id);
    if (row?.kind === "vacant") setPane("overview");
    if (tier === "stack") setReading(true);
  }
  function openChat(id: string) {
    setSelectedId(id);
    setPane("chat");
    if (tier === "stack") setReading(true);
  }
  const toggleGroup = (group: CrewGroup) => setGroups((current) => {
    const next = new Set(current);
    if (next.has(group)) next.delete(group); else next.add(group);
    return next;
  });

  function commitInspector(width: number) {
    const next = Math.round(Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, width)));
    setInspector(next);
    try { localStorage.setItem(INSPECTOR_KEY, String(next)); } catch { /* per-viewer convenience only */ }
  }
  function resizeStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !root.current) return;
    const handle = event.currentTarget;
    const element = root.current;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = inspector;
    let width = inspector;
    element.dataset.resizing = "";
    const moveTo = (move: globalThis.PointerEvent) => {
      width = Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, startWidth - (move.clientX - startX)));
      element.style.setProperty("--inspector", `${width}px`);
    };
    const stop = () => {
      handle.removeEventListener("pointermove", moveTo);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      delete element.dataset.resizing;
      commitInspector(width);
    };
    handle.addEventListener("pointermove", moveTo);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }
  function resizeKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") { event.preventDefault(); commitInspector(inspector + step); }
    if (event.key === "ArrowRight") { event.preventDefault(); commitInspector(inspector - step); }
  }

  const stages: { id: Stage; icon: string; label: string; count?: string | number }[] = [
    ...(tier !== "bridge" ? [{ id: "crew" as const, icon: "team", label: t("teamCrew"), count: rows.length }] : []),
    { id: "orbit", icon: "web", label: t("teamOrbit") },
    { id: "tasks", icon: "board", label: t("teamTasks"), count: tasks.length ? `${tasks.filter((task) => task.status === "completed").length}/${tasks.length}` : undefined },
    { id: "comms", icon: "chat", label: t("teamComms"), count: messages.length || undefined },
  ];
  const stageBar = useRef<HTMLDivElement>(null);
  useSlidingIndicator(stageBar, '[aria-selected="true"]', [stage, tier, messages.length, tasks.length]);

  const lens = (
    <div className="fs-lens">
      <label className="fs-team-search">
        <Icon name="search" />
        <input type="search" value={query} placeholder={t("teamSearchCrew")} aria-label={t("teamSearchCrew")} spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); } }} />
      </label>
      <div className="fs-chips" role="group" aria-label={t("teamCrew")}>
        {GROUPS.map((group) => {
          const count = rows.filter((row) => row.kind !== "lead" && row.group === group).length;
          return <button key={group} type="button" className="fs-chip" data-group={group} aria-pressed={groups.has(group)}
            disabled={!count && !groups.has(group)} onClick={() => toggleGroup(group)}>
            <i aria-hidden="true" />{t(`teamGroup_${group}`)}<span>{count}</span>
          </button>;
        })}
        {(groups.size > 0 || query) && <button type="button" className="fs-chip-clear" onClick={() => { setGroups(new Set()); setQuery(""); }}>{t("teamCrewClear")}</button>}
      </div>
    </div>
  );
  const crewList = <CrewList rows={rows} matched={matched} selectedId={selected?.id} query={needle} onSelect={select} onOpen={openChat} />;

  const stageView = () => {
    if (stage === "crew") return <div className="fs-stage-fill fs-stage-crew">{lens}{crewList}</div>;
    if (stage === "orbit") return <TeamOrbit rows={rows} messages={messages} selectedId={selected?.id ?? leadId} matched={matched} onSelect={select} onOpen={openChat} />;
    if (stage === "tasks") return <TaskBoard tasks={tasks} rows={rows} leadId={leadId} columns onSelect={select} />;
    return <TeamComms rows={rows} messages={messages} now={now} query={query} selectedId={selected?.id} onSelect={select} />;
  };

  return (
    <div ref={root} className="fs-surface fs-team-view" data-tier={tier} data-reading={reading}
      style={{ "--inspector": tier === "split" ? `min(${inspector}px, 46%)` : `${inspector}px` } as CSSProperties}>
      <header className="fs-room-header">
        <nav aria-label={t("teamBreadcrumb")}>
          <button type="button" className="fs-team-back" onClick={onBack} title={t("teamBack")}>
            <Icon name="chev" /><span>{t("teamBack")}</span>
          </button>
        </nav>
        <TeamAvatar variant="team" size="md" label={node.title} model={leadModel} active={leadRunning} />
        <div className="fs-room-title">
          <h1 className="user-content">{node.title}</h1>
          <div className="fs-room-meta">
            <span className={`status status-${status}`}><i />{t(status)}</span>
            {leadModel && <ModelChip model={leadModel} quiet />}
            {(runtime || blueprint) && <span className="fs-team-rev">v{runtime?.revision ?? blueprint!.revision}</span>}
          </div>
        </div>
        <div className="fs-room-actions">
          {node.sessionId && <button type="button" className="button" onClick={() => bridge.openChat(node.sessionId!)}>
            <Icon name="pop" /><span>{t("teamOpenNative")}</span>
          </button>}
          {(status === "running" || status === "settling") && <button type="button" className="button fs-team-stop" onClick={() =>
            void bridge.stopNode(node.id).catch(onError)}><Icon name="stop" /><span>{t("teamStopTeam")}</span></button>}
          {tier === "stack" && <button type="button" className="button fs-team-mobile-toggle" aria-expanded={reading} onClick={() => setReading(!reading)}>
            <Icon name={reading ? "web" : "chat"} /><span>{reading ? t("teamOrbit") : selected?.label}</span>
          </button>}
        </div>
      </header>

      <div className="fs-deck">
        <section className="fs-deck-main" aria-label={t("teamCrew")}>
          <Pulse rows={rows} messages={messages} tasks={tasks} capacity={runtime?.capacity} now={now} groups={groups} onGroup={toggleGroup} />
          <div className="fs-deck-body">
            {tier === "bridge" && <aside className="fs-crew" aria-label={t("teamCrew")}>
              <div className="fs-pane-head"><span>{t("teamCrew")}<em>{[...matched].length}/{rows.length}</em></span></div>
              {lens}
              {crewList}
            </aside>}
            <div className="fs-stage">
              <div className="fs-stage-bar">
                <div ref={stageBar} className="fs-tabs fs-indicator-host" role="tablist" aria-label={t("teamViews")}>
                  {stages.map((item) => <button key={item.id} type="button" role="tab" className="fs-tab" aria-selected={stage === item.id}
                    onClick={() => setStage(item.id)}>
                    <Icon name={item.icon} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}
                  </button>)}
                </div>
              </div>
              <div className="fs-stage-pane" key={stage} role="tabpanel">{stageView()}</div>
            </div>
          </div>
        </section>
        {tier !== "stack" && <div className="fs-room-resizer" role="separator" aria-orientation="vertical" tabIndex={0}
          aria-label={t("teamResizeRail")} title={t("teamResizeRail")} aria-valuemin={INSPECTOR_MIN} aria-valuemax={INSPECTOR_MAX}
          aria-valuenow={inspector} onPointerDown={resizeStart} onKeyDown={resizeKeys} onDoubleClick={() => commitInspector(460)} />}
        {selected && <Inspector key={selected.id} row={selected} rows={rows} messages={messages} tasks={tasks} now={now} pane={pane}
          onPane={setPane} node={node} bridge={bridge} leadConversation={leadConversation} renderConversation={renderConversation}
          onBindLead={onBindLead} onError={onError} onSelect={select} leadId={leadId} />}
      </div>
    </div>
  );
}

/* ---------- Pulse header ---------- */

function useRolled(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const target = useRef(value);
  useEffect(() => {
    if (value === target.current) return;
    from.current = shown;
    target.current = value;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    const start = performance.now();
    let frame = 0;
    const step = (time: number) => {
      const k = Math.min(1, (time - start) / 480);
      const eased = 1 - (1 - k) ** 3;
      setShown(from.current + (value - from.current) * eased);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return Math.round(shown);
}

function Rolled({ value, total }: { value: number; total?: number }) {
  const shown = useRolled(value);
  return <strong>{shown}{total !== undefined && <small>/{total}</small>}</strong>;
}

const SPARK_BINS = 36;
const SPARK_STEP = 30_000;

function Spark({ messages, now }: { messages: CrewMessage[]; now: number }) {
  const { line, area, head } = useMemo(() => {
    const bins = new Array<number>(SPARK_BINS).fill(0);
    for (const message of messages) {
      const index = SPARK_BINS - 1 - Math.floor((now - message.at) / SPARK_STEP);
      if (index >= 0 && index < SPARK_BINS) bins[index] += 1;
    }
    const peak = Math.max(2, ...bins) * 1.2;
    const points = bins.map((count, index) => [index, 30 - (count / peak) * 26] as const);
    const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y.toFixed(1)}`).join("");
    return { line, area: `${line}L${SPARK_BINS - 1} 31L0 31Z`, head: points[points.length - 1] };
  }, [messages, now]);
  return <svg className="fs-spark" viewBox={`0 0 ${SPARK_BINS - 1} 31`} preserveAspectRatio="none" aria-hidden="true">
    <path className="fs-spark-base" d={`M0 30.5H${SPARK_BINS}`} />
    <path className="fs-spark-area" d={area} />
    <path className="fs-spark-line" d={line} />
    <circle className="fs-spark-head" cx={head[0]} cy={head[1]} r="1.6" />
  </svg>;
}

function Pulse({ rows, messages, tasks, capacity, now, groups, onGroup }: {
  rows: CrewRow[]; messages: CrewMessage[]; tasks: TeamTaskView[]; capacity?: { active: number; max: number };
  now: number; groups: ReadonlySet<CrewGroup>; onGroup: (group: CrewGroup) => void;
}) {
  const others = rows.filter((row) => row.kind !== "lead");
  const counts: Record<CrewGroup, number> = { running: 0, idle: 0, vacant: 0 };
  for (const row of others) counts[row.group]++;
  const working = rows.filter((row) => row.tone === "running").length;
  const live = working > 0;
  const last = messages.at(-1);
  const filled = others.filter((row) => row.kind !== "vacant").length;
  return (
    <header className="fs-pulse">
      <div className="fs-pulse-line">
        <span className="fs-live" data-on={live || undefined}><i aria-hidden="true" />{t(live ? "teamLive" : "teamQuiet")}</span>
        <span className="fs-pulse-count">{t("teamMemberCountLine", { count: filled, running: counts.running })}</span>
        {last && <span className="fs-pulse-clock" title={new Date(last.at).toLocaleString()}>{t("teamLastActivity", { time: relativeTime(last.at, now) })}</span>}
      </div>
      <div className="fs-ribbon" role="group" aria-label={t("teamCrew")} data-filtered={groups.size > 0 || undefined}>
        {GROUPS.map((group) => <button key={group} type="button" className="fs-ribbon-seg" data-group={group}
          aria-pressed={groups.has(group)} hidden={!counts[group]} style={{ flexGrow: counts[group] }}
          title={`${t(`teamGroup_${group}`)} · ${counts[group]}`} aria-label={`${t(`teamGroup_${group}`)} · ${counts[group]}`}
          onClick={() => onGroup(group)} />)}
        {!others.length && <span className="fs-ribbon-empty" aria-hidden="true" />}
      </div>
      <dl className="fs-metrics">
        <div><dt>{t("teamMetricSlots")}</dt><dd><Rolled value={filled} total={others.length} /></dd></div>
        <div><dt>{t("teamMetricTasks")}</dt><dd><Rolled value={tasks.filter((task) => task.status === "completed").length} total={tasks.length} /></dd></div>
        <div><dt>{t("teamMetricCapacity")}</dt><dd><Rolled value={capacity?.active ?? working} total={capacity?.max} /></dd></div>
        <div className="fs-metric-rate"><dt>{t("teamMetricActivity")}</dt><dd><Rolled value={messages.length} /><small>{t("teamMetricMessages")}</small></dd>
          <Spark messages={messages} now={now} />
        </div>
      </dl>
    </header>
  );
}

/* ---------- Crew list ---------- */

function Mark({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query) : -1;
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>;
}

function CrewList({ rows, matched, selectedId, query, onSelect, onOpen }: {
  rows: CrewRow[]; matched: ReadonlySet<string>; selectedId?: string; query: string;
  onSelect: (id: string) => void; onOpen: (id: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useFlip(list, [rows.map((row) => row.id + row.tone).join()]);
  useSlidingIndicator(list, '[data-selected="true"]', [selectedId, rows.length, query, [...matched].join()]);
  const lead = rows[0];
  const rest = rows.slice(1).filter((row) => matched.has(row.id) || !query);

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const hits = Array.from(list.current?.querySelectorAll<HTMLButtonElement>(".fs-card-hit") ?? []);
    if (!hits.length) return;
    const index = hits.indexOf(event.target as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? hits.length - 1
      : Math.max(0, Math.min(hits.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
    event.preventDefault();
    hits[next]?.focus();
  }

  const card = (row: CrewRow, last = false) => (
    <div key={row.id} className="fs-crew-node" data-flip={row.id} data-depth={row.kind === "lead" ? 0 : 1} data-last={last || undefined} role="listitem">
      <div className="fs-card" data-kind={row.kind} data-tone={row.tone} data-selected={row.id === selectedId}
        data-dimmed={!matched.has(row.id) || undefined} style={hueStyle(row.model)}>
        <button type="button" className="fs-card-hit" aria-pressed={row.id === selectedId} aria-label={`${row.label} · ${row.status}`}
          onClick={() => onSelect(row.id)} onDoubleClick={() => row.kind !== "vacant" && onOpen(row.id)}
          onKeyDown={(event) => { if (event.key === "Enter" && row.kind !== "vacant") { event.preventDefault(); onOpen(row.id); } }} />
        <div className="fs-card-top">
          <TeamAvatar size={row.kind === "lead" ? "md" : "sm"} label={row.label} seed={row.seed} model={row.model}
            variant={row.kind === "lead" ? "lead" : row.kind === "vacant" ? "vacant" : "member"} tone={row.tone} />
          <span className="fs-card-id">
            <span className="fs-card-name">
              <strong className="user-content"><Mark text={row.label} query={query} /></strong>
              {row.instance && <span className="fs-team-instance">{row.instance}</span>}
              {row.outside && <span className="fs-team-tag" data-tone="warn">{t("teamOutsideRoster")}</span>}
            </span>
            <span className="fs-card-model">
              {row.model && <ModelChip model={row.model} quiet />}
            </span>
          </span>
          <span className="fs-status" data-tone={row.tone}><i aria-hidden="true" /><span>{row.status}</span></span>
          {row.kind !== "vacant" && <button type="button" className="fs-quick" aria-label={t("teamChat")} title={t("teamChat")}
            onClick={() => onOpen(row.id)}><Icon name="chat" /></button>}
        </div>
        {row.task && <div className="fs-card-stage" data-running={row.tone === "running" || undefined}>
          <Icon name="play" /><span className="user-content"><Mark text={row.task.subject} query={query} /></span>
        </div>}
        {(row.tasks.total > 0 || row.messages > 0) && <div className="fs-card-meter">
          {row.tasks.total > 0 && <span className="fs-steps" aria-label={t("teamTaskProgress", { done: row.tasks.done, total: row.tasks.total })}>
            {Array.from({ length: Math.min(12, row.tasks.total) }, (_, index) =>
              <i key={index} data-state={index < row.tasks.done ? "done" : index === row.tasks.done && row.task ? "sent" : "todo"} />)}
          </span>}
          <span className="fs-card-facts">{[
            row.tasks.total ? t("teamTaskProgress", { done: row.tasks.done, total: row.tasks.total }) : "",
            row.messages ? `${row.messages} ${t("teamMetricMessages")}` : "",
          ].filter(Boolean).join(" · ")}</span>
        </div>}
      </div>
    </div>
  );

  if (!rest.length && query) return <div className="fs-crew-list"><div className="fs-team-empty is-inline"><TeamMark icon="search" /><p>{t("teamNoCrewMatch")}</p></div></div>;
  return (
    <div ref={list} className="fs-crew-list fs-indicator-host" role="list" aria-label={t("teamCrew")} onKeyDown={keys}>
      {card(lead)}
      {rest.map((row, index) => card(row, index === rest.length - 1))}
    </div>
  );
}

/* ---------- Inspector ---------- */

function Inspector({ row, rows, messages, tasks, now, pane, onPane, node, bridge, leadConversation, renderConversation, onBindLead, onError, onSelect, leadId }: {
  row: CrewRow; rows: CrewRow[]; messages: CrewMessage[]; tasks: TeamTaskView[]; now: number; pane: Pane; onPane: (pane: Pane) => void;
  node: FlowNode; bridge: CanvasBridge; leadConversation: ReactNode; renderConversation: TeamViewProps["renderConversation"];
  onBindLead: () => void; onError: (error: unknown) => void; onSelect: (id: string) => void; leadId: string;
}) {
  const tabs = useRef<HTMLDivElement>(null);
  const vacant = row.kind === "vacant";
  const shown: Pane = vacant ? "overview" : pane;
  const talk = messages.filter((message) => message.from === row.id || message.to === row.id).length;
  useSlidingIndicator(tabs, '[aria-selected="true"]', [shown, row.id]);
  const member = row.member;
  const panes: { id: Pane; icon: string; label: string; count?: number }[] = [
    ...(vacant ? [] : [{ id: "chat" as const, icon: "chat", label: t("teamChat") }]),
    { id: "overview", icon: "eye", label: t("teamOverview") },
    ...(vacant ? [] : [{ id: "messages" as const, icon: "at", label: t("teamMetricMessages"), count: talk || undefined }]),
  ];

  return (
    <aside className="fs-crew-inspector" aria-label={row.label} style={hueStyle(row.model)}>
      <header className="fs-ins-head">
        <div className="fs-ins-crumbs">
          {row.kind !== "lead"
            ? <button type="button" className="fs-ins-up" onClick={() => onSelect(leadId)}><Icon name="chev" />{t("teamLead")}</button>
            : <span className="fs-ins-up is-static"><Icon name="team" />{node.title}</span>}
          <span className="fs-team-tag">{t(row.kind === "lead" ? "teamLead" : row.kind === "vacant" ? "teamVacant" : row.outside ? "teamOutsideRoster" : "teamMember")}</span>
        </div>
        <div className="fs-ins-id">
          <TeamAvatar size="lg" label={row.label} seed={row.seed} model={row.model}
            variant={row.kind === "lead" ? "lead" : vacant ? "vacant" : "member"} tone={row.tone} />
          <div className="fs-ins-copy">
            <h2 className="user-content">{row.label}{row.instance && <span className="fs-team-instance">{row.instance}</span>}</h2>
            <div className="fs-ins-facts">
              <span className="fs-status is-chip" data-tone={row.tone}><i aria-hidden="true" /><span>{row.status}</span></span>
              {row.model && <ModelChip model={row.model} />}
            </div>
            <small className="user-content">{row.kind === "lead" ? t("teamLeadDuty") : [row.slotLabel, row.roleTitle].filter(Boolean).join(" · ")}</small>
          </div>
        </div>
        <div className="fs-ins-actions">
          {row.kind === "lead" && !node.sessionId && <button type="button" className="button button-primary" onClick={onBindLead}>
            <Icon name="chat" />{t("teamCreateLead")}</button>}
          {member && member.mode !== "external" && <span className="fs-team-approval" title={t("teamRestrictedApproval")} tabIndex={0}>
            <Icon name="shield" /><span>{t("teamApprovalShort")}</span>
          </span>}
          {member && (member.mode === "continuable" || member.activity === "running") && <button type="button" className="button fs-team-interrupt"
            onClick={() => void bridge.interruptTeamMember(member.sessionId).catch(onError)}>
            <Icon name="stop" /><span>{t("teamInterruptMember")}</span>
          </button>}
        </div>
        <div ref={tabs} className="fs-ins-tabs fs-indicator-host" role="tablist">
          {panes.map((item) => <button key={item.id} type="button" role="tab" className="fs-ins-tab" aria-selected={shown === item.id}
            onClick={() => onPane(item.id)}>
            <Icon name={item.icon} />{item.label}{item.count !== undefined && <em>{item.count}</em>}
          </button>)}
        </div>
      </header>
      <div className="fs-ins-body" key={shown} role="tabpanel">
        {shown === "chat" ? (
          row.kind === "lead"
            ? node.sessionId ? leadConversation : <div className="fs-team-empty fs-team-start">
                <TeamAvatar variant="lead" size="lg" label={t("teamLead")} model={row.model} />
                <p>{t("teamLeadStartHint")}</p>
                <button type="button" className="button button-primary" onClick={onBindLead}>{t("teamCreateLead")}</button>
              </div>
            : member?.mode === "external" ? <p className="fs-team-muted fs-ins-note">{t("teamExternalConversation")}</p>
            : member ? <MemberConversation bridge={bridge} member={member} renderConversation={renderConversation} onError={onError} /> : null
        ) : shown === "messages"
          ? <TeamComms rows={rows} messages={messages} now={now} only={row.id} selectedId={row.id} onSelect={onSelect} />
          : <Overview row={row} rows={rows} tasks={tasks} leadId={leadId} onSelect={onSelect} />}
      </div>
    </aside>
  );
}

function Overview({ row, rows, tasks, leadId, onSelect }: {
  row: CrewRow; rows: CrewRow[]; tasks: TeamTaskView[]; leadId: string; onSelect: (id: string) => void;
}) {
  const mine = row.kind === "lead" ? tasks : tasks.filter((task) => task.ownerId === row.id || (!!row.member && task.ownerName === row.member.name));
  return (
    <div className="fs-overview">
      <section>
        <h3>{t("teamNowWorking")}</h3>
        {row.task ? <div className="fs-now" data-tone={row.tone}>
          <Icon name="play" /><div><b className="user-content">{row.task.subject}</b>
            {row.task.description && <p className="user-content">{row.task.description}</p>}</div>
        </div> : <p className="fs-team-muted">{row.kind === "vacant" ? t("teamVacantHint") : t("teamNothingNow")}</p>}
      </section>
      {row.kind === "lead" ? <section>
        <h3>{t("teamRosterSummary")}<small>{rows.length - 1}</small></h3>
        <ul className="fs-roster-mini">
          {rows.slice(1).map((item) => <li key={item.id}>
            <button type="button" onClick={() => onSelect(item.id)} style={hueStyle(item.model)}>
              <TeamAvatar size="xs" label={item.label} seed={item.seed} model={item.model} tone={item.tone}
                variant={item.kind === "vacant" ? "vacant" : "member"} />
              <span className="user-content">{item.label}</span>{item.instance && <small>{item.instance}</small>}
              <span className="fs-status" data-tone={item.tone}><i aria-hidden="true" /><span>{item.status}</span></span>
            </button>
          </li>)}
        </ul>
      </section> : <section>
        <h3>{t("teamSlotInfo")}</h3>
        <dl className="fs-team-facts">
          <div className="fs-team-fact"><dt>{t("teamRole")}</dt><dd className="user-content">{row.roleTitle ?? "—"}</dd></div>
          <div className="fs-team-fact"><dt>{t("teamSlotId")}</dt><dd><code>{row.slotId ?? "—"}</code></dd></div>
          <div className="fs-team-fact"><dt>{t("teamModel")}</dt><dd>{row.model ? <ModelChip model={row.model} /> : "—"}</dd></div>
          <div className="fs-team-fact"><dt>{t("teamMaxInstances")}</dt><dd>{row.maxInstances ?? "—"}</dd></div>
        </dl>
      </section>}
      {row.kind !== "vacant" && <section>
        <h3>{row.kind === "lead" ? t("teamTasks") : t("teamOwnedTasks")}<small>{mine.length}</small></h3>
        {mine.length ? <ol className="fs-phases">
          {mine.map((task, index) => <li key={task.id} data-state={task.status}>
            <i aria-hidden="true">{task.status === "completed" ? <Icon name="check" /> : index + 1}</i>
            <span className="user-content">{task.subject}</span>
            <small>{t(`teamTask_${task.status}`)}</small>
          </li>)}
        </ol> : <p className="fs-team-muted">{t("teamNoOwnedTasks")}</p>}
      </section>}
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
    : <p className={error ? "fs-team-error fs-ins-note" : "fs-loading fs-ins-note"}>{error || t("openingConversation")}</p>;
}

/* ---------- Task board ---------- */

const statusIcon: Record<TeamTaskView["status"], string> = { pending: "clock", in_progress: "play", completed: "check" };

export function TaskBoard({ tasks, rows, leadId, columns = false, onSelect }: {
  tasks: TeamTaskView[]; rows: CrewRow[]; leadId: string; columns?: boolean; onSelect?: (id: string) => void;
}) {
  const board = useRef<HTMLElement>(null);
  const subjects = new Map(tasks.map((task) => [task.id, task.subject]));
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  for (const task of tasks) counts[task.status]++;
  useFlip(board, [tasks.map((task) => task.id + task.status).join()]);

  function owner(task: TeamTaskView): CrewRow | undefined {
    if (!task.ownerId && !task.ownerName) return undefined;
    if (task.ownerId === leadId || task.ownerName === "lead") return rows[0];
    return rows.find((row) => row.id === task.ownerId || row.member?.name === task.ownerName);
  }

  return (
    <section ref={board} className="fs-taskboard" data-columns={columns || undefined} aria-label={t("teamTasks")}>
      {tasks.length ? <>
        <div className="fs-task-progress">
          <ProgressRing done={counts.completed} total={tasks.length} />
          <div>
            <strong>{t("teamTaskProgress", { done: counts.completed, total: tasks.length })}</strong>
            <span className="fs-task-bar" aria-hidden="true">
              {(["completed", "in_progress", "pending"] as const).map((status) =>
                <i key={status} data-state={status} style={{ flexGrow: counts[status] }} />)}
            </span>
          </div>
        </div>
        <div className="fs-lanes">
          {(["in_progress", "pending", "completed"] as const).map((status) => {
            const lane = tasks.filter((task) => task.status === status);
            if (!lane.length && !columns) return null;
            return <section key={status} className="fs-team-lane" data-state={status}>
              <h4><Icon name={statusIcon[status]} />{t(`teamTask_${status}`)}<small>{lane.length}</small></h4>
              {lane.map((task) => {
                const who = owner(task);
                const label = who?.label ?? task.ownerName ?? task.ownerId;
                return <article key={task.id} data-flip={task.id} className="fs-task" data-state={task.status}>
                  <b className="user-content">{task.subject}</b>
                  {task.description && <p className="user-content">{task.description}</p>}
                  {(label || task.blockedBy.length > 0 || (task.ready && status === "pending")) && <footer>
                    {label && <button type="button" className="fs-task-owner" title={t("teamTaskOwner", { owner: label })}
                      disabled={!who || !onSelect} onClick={() => who && onSelect?.(who.id)}>
                      <TeamAvatar size="xs" label={label} seed={who?.seed ?? label} model={who?.model} tone={who?.tone}
                        variant={who?.kind === "lead" ? "lead" : "member"} />
                      <span className="user-content">{label}</span>
                    </button>}
                    {task.blockedBy.length > 0 && <span className="fs-team-tag" data-tone="warn"
                      title={t("teamTaskBlocked", { blockers: task.blockedBy.map((id) => subjects.get(id) ?? id).join(", ") })}>
                      <Icon name="unplug" />{task.blockedBy.length}</span>}
                    {task.ready && status === "pending" && <span className="fs-team-tag" data-tone="ok">{t("teamTaskReady")}</span>}
                  </footer>}
                </article>;
              })}
              {!lane.length && <p className="fs-lane-empty">—</p>}
            </section>;
          })}
        </div>
      </> : <div className="fs-team-empty"><TeamMark icon="board" /><h3>{t("teamNoTasks")}</h3><p>{t("teamNoTasksHint")}</p></div>}
    </section>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const ratio = total ? done / total : 0;
  return (
    <svg className="fs-progress-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" pathLength={100} />
      <circle cx="18" cy="18" r="15" pathLength={100} style={{ strokeDashoffset: 100 - ratio * 100 }} />
      <text x="18" y="18">{Math.round(ratio * 100)}<tspan dx="0.5" fontSize="6">%</tspan></text>
    </svg>
  );
}

