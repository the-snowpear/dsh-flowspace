import type { WireLayout } from "./ViewportCard.tsx";

export interface WirePalette {
  flow: string;
  running: string;
  runningBright: string;
  accent: string;
  amber: string;
  green: string;
  violet: string;
  capPending: string;
  capSent: string;
  capUpdated: string;
  capAlways: string;
  display: string;
  structure: string;
  msgOut: string;
  msgBack: string;
  text: string;
  team: string;
  child: string;
  surface: string;
  eventError: string;
  eventWaiting: string;
  eventDone: string;
}

/** Read theme tokens once per theme change, outside the paint and animation loops. */
export function readWirePalette(root: Element): WirePalette {
  const style = getComputedStyle(root);
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const running = color("--running", "#3b82f6");
  const accent = color("--accent", "#3b82f6");
  const structure = color("--text-3", "#8b93a6");
  return {
    flow: color("--wire-flow", "#64748b"), running,
    runningBright: `color-mix(in oklab, ${running} 60%, white)`,
    accent, amber: color("--amber", "#f59e0b"), green: color("--green", "#22c55e"), violet: color("--violet", "#8b5cf6"),
    capPending: color("--cap-pending", "#94a3b8"), capSent: color("--glyph", "#64748b"), capUpdated: color("--cap-updated", "#f59e0b"),
    capAlways: color("--cap-always", accent), display: color("--k-display", "#06b6d4"), structure,
    msgOut: color("--m-f", accent), msgBack: color("--m-b", "#22c55e"), text: color("--text", "#f5f7fa"),
    team: color("--team-ink", "#8b5cf6"), child: color("--k-sub", "#06b6d4"), surface: color("--surface", "#1c1f26"),
    eventError: color("--evt-error", "#ef4444"), eventWaiting: color("--evt-wait", "#f59e0b"), eventDone: color("--evt-done", "#22c55e"),
  };
}

export interface WireInk {
  color: keyof WirePalette;
  width: number;
  alpha: number;
  dash: number[];
  animation?: number;
}

export function wireInk({ edge, evState }: Pick<WireLayout, "edge" | "evState">): WireInk {
  if (evState === "bypassed") return { color: "violet", width: 1.6, alpha: 0.55, dash: [5, 5] };
  if (edge.kind === "event") {
    const kind = edge.event?.kinds.length === 1 ? edge.event.kinds[0] : "mixed";
    const colors: Record<string, keyof WirePalette> = { error: "eventError", waiting: "eventWaiting", done: "eventDone" };
    const color = colors[kind] ?? "structure";
    return { color, width: 1.2, alpha: 1, dash: [2, 4] };
  }
  if (edge.kind === "reference") {
    const colors: Record<string, keyof WirePalette> = { sent: "capSent", updated: "capUpdated", always: "capAlways" };
    const color = colors[evState] ?? "capPending";
    return { color, width: 1.3, alpha: evState === "updated" ? 0.8 : 0.6, dash: [],
      animation: evState === "pending" || evState === "updated" ? 2 : undefined };
  }
  const ink: WireInk = { color: "flow", width: 1.6, alpha: 1,
    dash: edge.trigger === "confirm" ? [7, 6] : edge.trigger === "off" ? [0.01, 6] : [] };
  if (evState === "active") return { ...ink, color: "running", alpha: 0.45, dash: [], animation: 0 };
  if (evState === "queued" || evState === "ready") return { ...ink, color: "accent", alpha: 0.7, animation: 1 };
  if (evState === "waiting" || evState === "boundary") return { ...ink, color: "amber", alpha: 0.75, animation: 3 };
  if (evState === "done") return { ...ink, color: "green", alpha: 0.62 };
  if (evState === "skipped") return { ...ink, color: "structure", alpha: 0.35, dash: [4, 5] };
  return edge.trigger === "off" ? { ...ink, alpha: 0.7 } : ink;
}
