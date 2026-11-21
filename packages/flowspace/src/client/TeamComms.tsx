import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";
import { TeamAvatar, TeamMark } from "./TeamControls.tsx";
import { relativeTime, type CrewMessage, type CrewRow } from "./teamCrew.ts";

export function TeamComms({ rows, messages, now, query = "", selectedId, onSelect, only }: {
  rows: CrewRow[];
  messages: CrewMessage[];
  now: number;
  query?: string;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** One face's thread: what it sent or received, without the people filter. */
  only?: string;
}) {
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const [focus, setFocus] = useState<string>();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const scope = only ?? focus;
  const needle = query.trim().toLowerCase();
  const shown = messages.filter((message) => (!scope || message.from === scope || message.to === scope)
    && (!needle || message.text.toLowerCase().includes(needle) || (byId.get(message.from)?.label.toLowerCase().includes(needle) ?? false)));
  const people = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of messages) for (const id of [message.from, message.to]) counts.set(id, (counts.get(id) ?? 0) + 1);
    return rows.filter((row) => counts.has(row.id)).map((row) => ({ row, count: counts.get(row.id)! }));
  }, [messages, rows]);

  // Follow the newest post until the reader scrolls up; scrolling back to the end re-attaches.
  const scroller = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const seen = useRef(shown.length);
  const [unseen, setUnseen] = useState(0);
  const initial = useRef<ReadonlySet<string> | null>(null);
  initial.current ??= new Set(messages.map((message) => message.id));
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (pinned) { element.scrollTop = element.scrollHeight; seen.current = shown.length; setUnseen(0); }
    else if (shown.length > seen.current) setUnseen(shown.length - seen.current);
  }, [shown.length, pinned]);
  const unpin = () => {
    const element = scroller.current;
    if (element && element.scrollHeight - element.scrollTop - element.clientHeight > 24) setPinned(false);
  };
  const onScroll = () => {
    const element = scroller.current;
    if (element && element.scrollHeight - element.scrollTop - element.clientHeight <= 4) setPinned(true);
  };

  const face = (id: string, size: "xs" | "sm") => {
    const row = byId.get(id);
    return <TeamAvatar size={size} label={row?.label ?? id} seed={row?.seed ?? id} model={row?.model}
      variant={row?.kind === "lead" ? "lead" : "member"} tone={row?.tone} />;
  };
  const name = (id: string) => byId.get(id)?.label ?? id;

  return (
    <div className="fs-comms">
      {!only && people.length > 1 && <div className="fs-comms-people" role="group" aria-label={t("teamComms")}>
        <button type="button" className="fs-person" aria-pressed={!focus} onClick={() => setFocus(undefined)}>
          {t("teamCommsAll")}<em>{messages.length}</em>
        </button>
        {people.map(({ row, count }) => <button key={row.id} type="button" className="fs-person" aria-pressed={focus === row.id}
          onClick={() => setFocus((current) => current === row.id ? undefined : row.id)}>
          {face(row.id, "xs")}<span className="user-content">{row.label}</span>{row.instance && <small>{row.instance}</small>}<em>{count}</em>
        </button>)}
      </div>}
      <div className="fs-comms-scroll" ref={scroller} onScroll={onScroll} onWheel={(event) => { if (event.deltaY < 0) unpin(); }}
        onKeyDown={(event) => { if (["ArrowUp", "PageUp", "Home"].includes(event.key)) unpin(); }} tabIndex={0}
        role="log" aria-label={t("teamComms")} aria-live="polite">
        {!shown.length && <div className="fs-team-empty is-inline">
          <TeamMark icon="chat" />
          <p>{only ? t("teamCommsEmptyAgent", { name: name(only) }) : t("teamCommsEmpty")}</p>
        </div>}
        {shown.map((message, index) => {
          const long = message.text.length > 220;
          const expanded = open.has(message.id);
          const fresh = !initial.current!.has(message.id);
          return (
            <article key={message.id} className="fs-post" data-fresh={fresh || undefined} data-settled={message.settled || undefined}
              data-selected={!!selectedId && (message.from === selectedId || message.to === selectedId) || undefined}>
              <button type="button" className="fs-post-face" onClick={() => onSelect(message.from)} aria-label={name(message.from)}>
                {face(message.from, "sm")}
              </button>
              <div className="fs-post-main">
                <header>
                  <button type="button" className="fs-post-from user-content" onClick={() => onSelect(message.from)}>{name(message.from)}</button>
                  <Icon name="chev" />
                  <button type="button" className="fs-post-to" onClick={() => onSelect(message.to)}>
                    {face(message.to, "xs")}<span className="user-content">{name(message.to)}</span>
                  </button>
                  {message.settled && <span className="fs-team-tag" data-tone="ok">{t("teamSettledNotice")}</span>}
                  <span className="fs-post-meta"><span>#{index + 1}</span>
                    <time dateTime={new Date(message.at).toISOString()} title={new Date(message.at).toLocaleString()}>{relativeTime(message.at, now)}</time>
                  </span>
                </header>
                <p className="fs-post-body user-content" data-clamped={long && !expanded || undefined}>{message.text}</p>
                {long && <button type="button" className="fs-post-more" onClick={() => setOpen((current) => {
                  const next = new Set(current);
                  if (next.has(message.id)) next.delete(message.id); else next.add(message.id);
                  return next;
                })}>{t(expanded ? "teamCollapse" : "teamExpand")}</button>}
              </div>
            </article>
          );
        })}
      </div>
      {!pinned && <button type="button" className="fs-comms-latest" onClick={() => setPinned(true)}>
        <Icon name="download" />{unseen > 0 ? t("teamNewMessages", { count: unseen }) : t("teamLatest")}
      </button>}
    </div>
  );
}
