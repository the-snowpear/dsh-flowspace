import type { CSSProperties } from "react";
import type { TeamModel } from "../../types.ts";

const HUES = 8;
export type ModelLike = Pick<TeamModel, "provider" | "model"> & { reasoningEffort?: string };

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
  return {
    "--hue": hue < 0 ? "var(--text-faint)" : `var(--team-hue-${hue})`,
    ...extra,
  } as CSSProperties;
}

export function modelTitle(model: ModelLike): string {
  return `${model.provider}/${model.model}${model.reasoningEffort ? ` · ${model.reasoningEffort}` : ""}`;
}

export function ModelChip({
  model,
  missing = false,
  quiet = false,
}: {
  model?: ModelLike | null;
  missing?: boolean;
  quiet?: boolean;
}) {
  if (!model?.model) return null;
  return (
    <span
      className="fs-model-chip"
      data-missing={missing || undefined}
      data-quiet={quiet || undefined}
      style={hueStyle(model)}
      title={modelTitle(model)}
    >
      <i aria-hidden="true" />
      <span>{model.model}</span>
      {model.reasoningEffort && <em>{model.reasoningEffort}</em>}
    </span>
  );
}
