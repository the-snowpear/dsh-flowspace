import {
  useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type DependencyList, type KeyboardEvent, type RefObject,
} from "react";
import type { TeamModel, TeamModelRoute } from "../types.ts";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";
import { SIGIL_GRID, cellsPath, eyesPath, sigilPhase, sigilSpec } from "./teamSigil.ts";

/* ---------- Identity: every model owns one stable hue, every role a monogram ---------- */

const HUES = 8;
type ModelLike = Pick<TeamModel, "provider" | "model"> & { reasoningEffort?: string };

/** Stable palette slot for a provider/model pair, or -1 when no model is chosen. */
export function modelHue(model?: ModelLike | null): number {
  if (!model?.model) return -1;
  let hash = 2166136261;
  for (const char of `${model.provider}/${model.model}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % HUES;
}

export function hueStyle(model?: ModelLike | null, extra?: CSSProperties): CSSProperties {
  const hue = modelHue(model);
  return { "--hue": hue < 0 ? "var(--text-faint)" : `var(--team-hue-${hue})`, ...extra } as CSSProperties;
}

export function monogram(title: string): string {
  const text = title.trim();
  if (!text) return "·";
  const first = [...text][0];
  if (!/[a-z0-9]/i.test(first)) return first;
  const words = text.split(/[\s_-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : text.slice(0, 2)).toUpperCase();
}

export function modelTitle(model: ModelLike): string {
  return `${model.provider}/${model.model}${model.reasoningEffort ? ` · ${model.reasoningEffort}` : ""}`;
}

/** Icon tile kept for empty states and generic rows. */
export function TeamMark({ icon }: { icon: string }) {
  return <span className="fs-team-mark" aria-hidden="true"><Icon name={icon} /></span>;
}

export type SigilTone = "running" | "ready" | "idle" | "failed" | "vacant";

/** The pixel face in SVG user space: `size` units square at (x, y). */
export function SigilArt({ seed, lead = false, tone = "running", x = 0, y = 0, size }: {
  seed: string; lead?: boolean; tone?: SigilTone; x?: number; y?: number; size: number;
}) {
  const spec = sigilSpec(seed, lead);
  const closed = tone === "idle" || tone === "vacant";
  return (
    <g className="fs-sg-art" transform={`translate(${x} ${y}) scale(${size / SIGIL_GRID})`} shapeRendering="crispEdges">
      <path className="fs-sg-head" d={cellsPath(spec.cells, "head")} />
      <path className="fs-sg-mouth" d={cellsPath(spec.cells, "mouth")} />
      <path className="fs-sg-crown" d={cellsPath(spec.cells, "crown")} />
      <path className="fs-sg-beacon" d={cellsPath(spec.cells, "beacon")} />
      <path className="fs-sg-eyes" d={eyesPath(spec.eyes, closed)} />
    </g>
  );
}

const AVATAR_PX = { xs: 18, sm: 28, md: 34, lg: 52 } as const;

/**
 * A role's sigil tile: the face comes from `seed` (slot ID or member name),
 * the colour from the model. The lead wears the crowned face on an ink tile;
 * a team wears the team glyph.
 */
export function TeamAvatar({ label, seed, model, variant = "member", active = false, tone, size = "md" }: {
  label: string;
  seed?: string;
  model?: ModelLike | null;
  variant?: "member" | "lead" | "team" | "vacant";
  active?: boolean;
  tone?: SigilTone;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const px = AVATAR_PX[size];
  const shown: SigilTone = tone ?? (variant === "vacant" ? "vacant" : active ? "running" : "ready");
  const face = seed ?? (label || "member");
  // Whole-pixel cells where the tile allows it, so the face stays crisp at 1×.
  const cell = px >= 24 ? Math.round(px * 0.66 / SIGIL_GRID) : px * 0.7 / SIGIL_GRID;
  const art = cell * SIGIL_GRID;
  const offset = Math.round((px - art) / 2);
  return (
    <span className="fs-tavatar" data-variant={variant} data-size={size} data-active={active || undefined} data-tone={shown}
      style={hueStyle(model, { "--sg-phase": sigilPhase(face) } as CSSProperties)} aria-hidden="true">
      {variant === "team" ? <Icon name="team" /> : (
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
          <SigilArt seed={variant === "lead" ? "lead" : face} lead={variant === "lead"} tone={shown} x={offset} y={offset} size={art} />
        </svg>
      )}
    </span>
  );
}

export function AvatarStack({ items, max = 4 }: { items: { key: string; label: string; model?: ModelLike | null }[]; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <span className="fs-tstack" aria-hidden="true">
      {shown.map((item) => <i key={item.key} style={hueStyle(item.model)} title={item.label} />)}
      {items.length > max && <span className="fs-tstack-more">+{items.length - max}</span>}
    </span>
  );
}

export function ModelChip({ model, missing = false, quiet = false }: { model?: ModelLike | null; missing?: boolean; quiet?: boolean }) {
  if (!model?.model) return null;
  return (
    <span className="fs-model-chip" data-missing={missing || undefined} data-quiet={quiet || undefined}
      style={hueStyle(model)} title={modelTitle(model)}>
      <i aria-hidden="true" /><span>{model.model}</span>
      {model.reasoningEffort && <em>{model.reasoningEffort}</em>}
    </span>
  );
}

/* ---------- Motion helpers ---------- */

function motionAllowed(node: Element | null): boolean {
  return !!node && !node.closest('[data-perf-tier="L1"]') &&
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Slides one highlight under the current item of a list. The container receives
 * `--ind-x/y/w/h` and `data-indicator` so CSS can draw the highlight as `::before`;
 * it lives in the scrolling content so it scrolls with the items.
 */
export function useSlidingIndicator(ref: RefObject<HTMLElement>, selector: string, deps: DependencyList) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const place = () => {
      const item = root.querySelector<HTMLElement>(selector);
      if (!item) { root.dataset.indicator = "off"; return; }
      const frameBox = root.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      root.style.setProperty("--ind-x", `${box.left - frameBox.left + root.scrollLeft}px`);
      root.style.setProperty("--ind-y", `${box.top - frameBox.top + root.scrollTop}px`);
      root.style.setProperty("--ind-w", `${box.width}px`);
      root.style.setProperty("--ind-h", `${box.height}px`);
      const first = root.dataset.indicator !== "on";
      if (first) root.dataset.indicatorStill = "";
      root.dataset.indicator = "on";
      if (first) frame = requestAnimationFrame(() => { delete root.dataset.indicatorStill; });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    for (const child of Array.from(root.children)) observer.observe(child);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * FLIP reflow for `[data-flip]` descendants: moved items glide to their new place,
 * new items rise in, so live data (tasks, members) never jumps.
 */
export function useFlip(ref: RefObject<HTMLElement>, deps: DependencyList) {
  const previous = useRef(new Map<string, { x: number; y: number }>());
  const measure = (root: HTMLElement) => {
    const frame = root.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number; el: HTMLElement }>();
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-flip]"))) {
      const box = el.getBoundingClientRect();
      next.set(el.dataset.flip!, { x: box.left - frame.left, y: box.top - frame.top + root.scrollTop, el });
    }
    return next;
  };
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const next = measure(root);
    const animate = motionAllowed(root) && previous.current.size > 0;
    if (animate) {
      for (const [id, { x, y, el }] of next) {
        const old = previous.current.get(id);
        if (!old) {
          el.animate([{ opacity: 0, transform: "translateY(6px) scale(.98)" }, { opacity: 1, transform: "none" }],
            { duration: 260, easing: "cubic-bezier(.16,.84,.44,1)" });
          continue;
        }
        const dx = old.x - x;
        const dy = old.y - y;
        if (Math.abs(dx) + Math.abs(dy) < 1) continue;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: 380, easing: "cubic-bezier(.32,.72,0,1)" });
      }
    }
    previous.current = new Map([...next].map(([id, { x, y }]) => [id, { x, y }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Resizes are not data changes: refresh the baseline so they never animate.
    const observer = new ResizeObserver(() => {
      previous.current = new Map([...measure(root)].map(([id, { x, y }]) => [id, { x, y }]));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [ref]);
}

/* ---------- Segmented control with a sliding thumb ---------- */

type Choice<T extends string> = { value: T; label: string; icon?: string; badge?: string | number };

export function TeamSwitch<T extends string>({ label, choices, value, onChange, size = "md" }: {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  const name = useId();
  const root = useRef<HTMLDivElement>(null);
  useSlidingIndicator(root, "label:has(input:checked)", [value, choices.length]);
  return (
    <div ref={root} role="radiogroup" aria-label={label} className="fs-team-switch" data-size={size}>
      {choices.map((item) => (
        <label key={item.value}>
          <input type="radio" name={name} value={item.value} checked={value === item.value}
            onChange={() => onChange(item.value)} />
          <span>{item.icon && <Icon name={item.icon} />}{item.label}
            {item.badge !== undefined && item.badge !== "" && <small>{item.badge}</small>}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------- Stepper for small integers ---------- */

export function Stepper({ value, min = 1, max = 8, onChange, label }: {
  value: number; min?: number; max?: number; onChange: (value: number) => void; label: string;
}) {
  return (
    <span className="fs-stepper" role="group" aria-label={label}>
      <button type="button" aria-label={t("teamDecrease")} disabled={value <= min} onClick={() => onChange(value - 1)}><Icon name="off" /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={t("teamIncrease")} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" /></button>
    </span>
  );
}

/* ---------- Model picker: a grouped listbox in the top layer ---------- */

const modelKey = ({ provider, model }: Pick<TeamModel, "provider" | "model">) => JSON.stringify([provider, model]);
const supportsPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

export function ModelSelect({ value, routes, onChange, label, placeholder, allowEmpty }: {
  value?: TeamModel;
  routes: TeamModelRoute[];
  onChange: (model: TeamModel | undefined) => void;
  label: string;
  placeholder?: string;
  /** Adds a first option that clears the value (e.g. "use the role's model"). */
  allowEmpty?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const key = value?.model ? modelKey(value) : "";
  const known = routes.find((route) => modelKey(route) === key);
  const options: ({ key: string; route?: TeamModelRoute })[] = [
    ...(allowEmpty ? [{ key: "" }] : []),
    ...routes.map((route) => ({ key: modelKey(route), route })),
  ];

  function place() {
    const button = trigger.current;
    const popover = list.current;
    if (!button || !popover) return;
    const box = button.getBoundingClientRect();
    const height = Math.min(320, popover.scrollHeight || 320);
    const below = window.innerHeight - box.bottom - 12;
    const up = below < Math.min(height, 220) && box.top > below;
    const width = Math.max(box.width, 260);
    popover.style.width = `${width}px`;
    popover.style.left = `${Math.min(box.left, window.innerWidth - width - 8)}px`;
    popover.style.top = up ? "" : `${box.bottom + 6}px`;
    popover.style.bottom = up ? `${window.innerHeight - box.top + 6}px` : "";
    popover.dataset.side = up ? "top" : "bottom";
  }

  function show() {
    const index = Math.max(0, options.findIndex((option) => option.key === key));
    setActive(index);
    setOpen(true);
    if (supportsPopover) list.current?.showPopover();
    place();
    requestAnimationFrame(() => {
      place();
      list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
      list.current?.focus({ preventScroll: true });
    });
  }

  function hide(focus = true) {
    if (supportsPopover && list.current?.matches(":popover-open")) list.current.hidePopover();
    setOpen(false);
    if (focus) trigger.current?.focus({ preventScroll: true });
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.route ? { provider: option.route.provider, model: option.route.model, ...(value?.reasoningEffort ? { reasoningEffort: value.reasoningEffort } : {}) } : undefined);
    hide();
  }

  useEffect(() => {
    const popover = list.current;
    if (!popover || !supportsPopover) return;
    const toggled = (event: Event) => { if ((event as ToggleEvent).newState === "closed") setOpen(false); };
    popover.addEventListener("toggle", toggled);
    return () => popover.removeEventListener("toggle", toggled);
  }, []);

  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    const outside = (event: PointerEvent) => {
      if (supportsPopover) return;
      const target = event.target as Node;
      if (!list.current?.contains(target) && !trigger.current?.contains(target)) hide(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", outside, true);
    };
  });

  function onListKey(event: KeyboardEvent) {
    const last = options.length - 1;
    const move = (index: number) => {
      setActive(index);
      list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
    };
    if (event.key === "ArrowDown") { event.preventDefault(); move(active >= last ? 0 : active + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); move(active <= 0 ? last : active - 1); }
    else if (event.key === "Home") { event.preventDefault(); move(0); }
    else if (event.key === "End") { event.preventDefault(); move(last); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(active); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); hide(); }
    else if (event.key === "Tab") hide(false);
  }

  let lastProvider = "";
  return (
    <div className="fs-mselect" data-open={open || undefined}>
      <button ref={trigger} type="button" className="fs-mselect-trigger" aria-haspopup="listbox"
        aria-expanded={open} aria-controls={id} aria-label={label}
        onClick={() => (open ? hide() : show())}
        onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(); } }}>
        {value?.model
          ? <ModelChip model={value} missing={routes.length > 0 && !known} />
          : <span className="fs-mselect-placeholder">{allowEmpty ?? placeholder ?? t("teamChooseModel")}</span>}
        {value?.model && known && <small>{known.providerName}</small>}
        {value?.model && routes.length > 0 && !known && <small className="fs-mselect-warn">{t("teamModelUnavailable")}</small>}
        <Icon name="chev" />
      </button>
      {/* Native validation needs a focusable field; this one mirrors the choice. */}
      {!allowEmpty && <input className="fs-mselect-proxy" tabIndex={-1} aria-hidden="true" required
        value={key} onChange={() => undefined} onFocus={() => trigger.current?.focus()} />}
      <div ref={list} id={id} role="listbox" tabIndex={-1} aria-label={label}
        className="fs-mselect-list" data-fallback={!supportsPopover || undefined}
        {...(supportsPopover ? { popover: "auto" } : {})} hidden={!supportsPopover && !open}
        aria-activedescendant={open ? `${id}-${active}` : undefined} onKeyDown={onListKey}>
        {options.length === 0 && <p className="fs-mselect-empty">{t("teamNoModels")}</p>}
        {options.map((option, index) => {
          const header = option.route && option.route.providerName !== lastProvider ? option.route.providerName : "";
          if (option.route) lastProvider = option.route.providerName;
          return (
            <div key={option.key || "empty"} role="presentation">
              {header && <div className="fs-mselect-group" role="presentation">{header}</div>}
              <div id={`${id}-${index}`} role="option" data-index={index} aria-selected={option.key === key}
                data-active={index === active || undefined} className="fs-mselect-option"
                style={option.route ? hueStyle(option.route) : undefined}
                onPointerMove={() => index !== active && setActive(index)} onClick={() => choose(index)}>
                {option.route ? <>
                  <i aria-hidden="true" />
                  <span><b>{option.route.name}</b><small>{option.route.model}</small></span>
                </> : <>
                  <Icon name="refresh" /><span><b>{allowEmpty}</b></span>
                </>}
                {option.key === key && <Icon name="check" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
