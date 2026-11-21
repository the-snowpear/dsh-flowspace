import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";
import { SigilArt, hueStyle } from "./TeamControls.tsx";
import type { CrewRow, CrewMessage } from "./teamCrew.ts";

const PACKET_MS = 1300;

function useSize(ref: { current: HTMLElement | null }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const read = () => setSize((current) => current.width === element.clientWidth && current.height === element.clientHeight
      ? current : { width: element.clientWidth, height: element.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** Spawn edges bow away from the centre so they never cut through it. */
function edgePath(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, bow = 0.16) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const sign = (mx - cx) * -dy + (my - cy) * dx >= 0 ? 1 : -1;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx - dy * bow * sign).toFixed(1)} ${(my + dx * bow * sign).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Talk between peers bows toward the centre; talk with the lead bows to the other side of its spawn edge. */
function chordPath(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, withLead: boolean) {
  if (withLead) return edgePath(x1, y1, x2, y2, cx, cy, -0.22);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx + (cx - mx) * 0.55).toFixed(1)} ${(my + (cy - my) * 0.55).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function motionReduced(element: Element | null) {
  return !!element?.closest('[data-perf-tier="L1"]') || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function TeamOrbit({ rows, messages, selectedId, matched, onSelect, onOpen }: {
  rows: CrewRow[];
  messages: CrewMessage[];
  selectedId: string;
  matched: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useSize(box);
  const [hover, setHover] = useState<string>();
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const lead = rows.find((row) => row.kind === "lead");
  const ring = rows.filter((row) => row.kind !== "lead");

  const cx = width / 2, cy = height / 2 - 6;
  const rx = Math.max(60, Math.min(width / 2 - 78, 300));
  const ry = Math.max(54, Math.min(height / 2 - 64, 230));
  const points = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (lead) map.set(lead.id, { x: cx, y: cy });
    ring.forEach((row, index) => {
      // Fan out from the top; one member sits straight above the lead.
      const angle = -Math.PI / 2 + (index / Math.max(1, ring.length)) * Math.PI * 2 + (ring.length === 2 ? Math.PI / 2 : 0);
      map.set(row.id, { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((row) => row.id).join(), cx, cy, rx, ry, lead?.id]);

  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const lit = useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    if (lead) set.add(lead.id);
    for (const message of messages) {
      if (message.from === hover) set.add(message.to);
      if (message.to === hover) set.add(message.from);
    }
    return set;
  }, [hover, lead, messages]);

  const chords = useMemo(() => {
    const pairs = new Map<string, { a: string; b: string; count: number }>();
    for (const message of messages) {
      const [a, b] = message.from < message.to ? [message.from, message.to] : [message.to, message.from];
      const key = `${a}|${b}`;
      const pair = pairs.get(key) ?? { a, b, count: 0 };
      pair.count += 1;
      pairs.set(key, pair);
    }
    return [...pairs.values()];
  }, [messages]);

  // Messages that arrive while the orbit is open fly from sender to receiver.
  const seen = useRef<Set<string> | null>(null);
  const [flying, setFlying] = useState<CrewMessage[]>([]);
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(messages.map((message) => message.id)); return; }
    const fresh = messages.filter((message) => !seen.current!.has(message.id));
    for (const message of fresh) seen.current.add(message.id);
    if (!fresh.length || motionReduced(box.current)) return;
    setFlying((current) => [...current, ...fresh]);
    const timer = setTimeout(() => setFlying((current) => current.filter((message) => !fresh.includes(message))), PACKET_MS + 80);
    return () => clearTimeout(timer);
  }, [messages]);

  // Wheel zoom about the pointer; React's wheel listener is passive, so attach a native one.
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const current = viewRef.current;
      const sx = event.clientX - rect.left, sy = event.clientY - rect.top;
      const zoom = Math.max(0.5, Math.min(2.6, current.zoom * (event.deltaY > 0 ? 1 / 1.1 : 1.1)));
      const ox = element.clientWidth / 2, oy = element.clientHeight / 2 - 6;
      const wx = ox + (sx - ox - current.x) / current.zoom, wy = oy + (sy - oy - current.y) / current.zoom;
      setView({ zoom, x: sx - ox - (wx - ox) * zoom, y: sy - oy - (wy - oy) * zoom });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("[data-node], button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: view.x, oy: view.y };
    box.current!.dataset.panning = "";
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    setView((current) => ({ ...current, x: state.ox + event.clientX - state.x, y: state.oy + event.clientY - state.y }));
  };
  const up = () => { drag.current = null; if (box.current) delete box.current.dataset.panning; };
  const reset = () => setView({ zoom: 1, x: 0, y: 0 });
  const moved = view.zoom !== 1 || view.x !== 0 || view.y !== 0;
  // Nodes grow with the room the ring gives them, within reading sizes.
  const scale = Math.max(0.9, Math.min(1.4, Math.min(rx, ry * 1.3) / 190));
  const dim = (id: string) => (lit !== null && !lit.has(id)) || !matched.has(id);

  return (
    <div ref={box} className="fs-orbit" data-focus={lit ? "" : undefined} onPointerDown={down} onPointerMove={move}
      onPointerUp={up} onPointerCancel={up} onDoubleClick={(event) => { if (!(event.target as Element).closest("[data-node]")) reset(); }}>
      {width > 0 && <svg width={width} height={height} className="fs-orbit-svg" role="img" aria-label={t("teamOrbit")}>
        <g className="fs-orbit-world" style={{ transform: `translate(${view.x}px, ${view.y}px) translate(${cx}px, ${cy}px) scale(${view.zoom}) translate(${-cx}px, ${-cy}px)` }}>
          <ellipse className="fs-orbit-ring" cx={cx} cy={cy} rx={rx} ry={ry} />
          <ellipse className="fs-orbit-ring is-inner" cx={cx} cy={cy} rx={rx * 0.5} ry={ry * 0.5} />
          <g className="fs-orbit-edges">
            {lead && ring.map((row) => {
              const from = points.get(lead.id), to = points.get(row.id);
              if (!from || !to) return null;
              return <path key={row.id} data-tone={row.tone} data-dimmed={dim(row.id) || undefined}
                style={{ ...hueStyle(row.model), d: `path("${edgePath(from.x, from.y, to.x, to.y, cx, cy)}")` } as CSSProperties} />;
            })}
          </g>
          <g className="fs-orbit-chords">
            {chords.map(({ a, b, count }) => {
              const pa = points.get(a), pb = points.get(b);
              if (!pa || !pb) return null;
              const on = lit === null || (lit.has(a) && lit.has(b));
              const withLead = a === lead?.id || b === lead?.id;
              return <path key={`${a}|${b}`} data-dimmed={!on || undefined}
                style={{ strokeWidth: 1.2 + Math.min(2.6, count * 0.5), d: `path("${chordPath(pa.x, pa.y, pb.x, pb.y, cx, cy, withLead)}")` } as CSSProperties}>
                <title>{`${byId.get(a)?.label ?? a} ↔ ${byId.get(b)?.label ?? b} · ${count}`}</title>
              </path>;
            })}
          </g>
          <g className="fs-orbit-packets">
            {flying.map((message) => {
              const pa = points.get(message.from), pb = points.get(message.to);
              if (!pa || !pb) return null;
              const withLead = message.from === lead?.id || message.to === lead?.id;
              return <circle key={message.id} r={3.4} style={{ ...hueStyle(byId.get(message.from)?.model),
                offsetPath: `path("${chordPath(pa.x, pa.y, pb.x, pb.y, cx, cy, withLead)}")` } as CSSProperties} />;
            })}
          </g>
          {rows.map((row) => {
            const point = points.get(row.id);
            if (!point) return null;
            const isLead = row.kind === "lead";
            const r = (isLead ? 25 : 17) * scale;
            const art = r * 1.2;
            const selected = selectedId === row.id;
            return (
              <g key={row.id} className="fs-orbit-node" data-node={row.id} data-kind={row.kind} data-tone={row.tone}
                data-selected={selected || undefined} data-dimmed={dim(row.id) || undefined}
                style={{ ...hueStyle(row.model, { "--cx": `${cx}px`, "--cy": `${cy}px` } as CSSProperties), transform: `translate(${point.x}px, ${point.y}px)` }}
                tabIndex={0} role="button" aria-label={`${row.label} · ${row.status}`} aria-pressed={selected}
                onPointerEnter={() => setHover(row.id)} onPointerLeave={() => setHover((current) => current === row.id ? undefined : current)}
                onFocus={() => setHover(row.id)} onBlur={() => setHover(undefined)}
                onClick={() => onSelect(row.id)} onDoubleClick={() => row.kind !== "vacant" && onOpen(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); if (row.kind !== "vacant") onOpen(row.id); }
                  else if (event.key === " ") { event.preventDefault(); onSelect(row.id); }
                }}>
                <title>{[row.label, row.status, row.model?.model, row.task?.subject].filter(Boolean).join("\n")}</title>
                <g className="fs-orbit-body">
                  {row.tone === "running" && <circle className="fs-orbit-ripple" r={r + 3} />}
                  <circle className="fs-orbit-halo" r={r + 6} />
                  {row.progress !== undefined && <>
                    <circle className="fs-orbit-track" r={r + 3} />
                    <circle className="fs-orbit-progress" r={r + 3} pathLength={100} transform="rotate(-90)"
                      strokeDasharray={`${Math.max(0.001, row.progress * 100).toFixed(2)} 100`} />
                  </>}
                  <circle className="fs-orbit-disc" r={r} />
                  <SigilArt seed={row.seed} lead={isLead} tone={row.tone} x={-art / 2} y={-art / 2} size={art} />
                  {!isLead && <circle className="fs-orbit-dot" cx={r * 0.74} cy={r * 0.74} r={3.6} />}
                </g>
                <text className="fs-orbit-name" y={r + 16} textAnchor="middle">{row.label.length > 16 ? `${row.label.slice(0, 15)}…` : row.label}</text>
                {row.instance && <text className="fs-orbit-sub" y={r + 29} textAnchor="middle">{row.instance}</text>}
              </g>
            );
          })}
        </g>
      </svg>}
      <div className="fs-orbit-legend" aria-hidden="true">
        <span><i className="is-spawn" />{t("teamLegendSpawn")}</span>
        <span><i className="is-comms" />{t("teamLegendComms")}</span>
      </div>
      <div className="fs-orbit-zoom">
        <button type="button" aria-label={t("teamZoomOut")} title={t("teamZoomOut")}
          onClick={() => setView((current) => ({ ...current, zoom: Math.max(0.5, current.zoom / 1.2) }))}><Icon name="off" /></button>
        <button type="button" aria-label={t("teamZoomIn")} title={t("teamZoomIn")}
          onClick={() => setView((current) => ({ ...current, zoom: Math.min(2.6, current.zoom * 1.2) }))}><Icon name="plus" /></button>
        <button type="button" aria-label={t("teamFit")} title={t("teamFit")} disabled={!moved} onClick={reset}><Icon name="fit" /></button>
      </div>
    </div>
  );
}
