import type { CSSProperties } from "react";
import { Icon } from "./icons.tsx";
import { SIGIL_GRID, cellsPath, eyesPath, sigilPhase, sigilSpec } from "./teamSigil.ts";
import { hueStyle, ModelChip, modelHue, modelTitle, type ModelLike } from "./ui/ModelIdentity.tsx";

export { useFlip, useSlidingIndicator } from "./hooks/useMotion.ts";
export { hueStyle, ModelChip, modelHue, modelTitle } from "./ui/ModelIdentity.tsx";
export { ModelSelect } from "./ui/ModelSelect.tsx";
export { SegmentedSwitch as TeamSwitch } from "./ui/SegmentedSwitch.tsx";
export { Stepper } from "./ui/Stepper.tsx";

export function monogram(title: string): string {
  const text = title.trim();
  if (!text) return "·";
  const first = [...text][0];
  if (!/[a-z0-9]/i.test(first)) return first;
  const words = text.split(/[\s_-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : text.slice(0, 2)).toUpperCase();
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
