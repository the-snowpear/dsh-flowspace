import type {
  FlowToken,
  FlowspaceSnapshot,
  RunStep,
  WorkflowTemplate,
} from "../../types.ts";
import { getLanguage, t } from "../i18n.ts";
import { runtimeIndex } from "../sceneModel.ts";
import type { AlignMode, DistributeAxis } from "../subgraphs.ts";

export type { AlignMode, DistributeAxis };

export function needsManualRelease(token: FlowToken) {
  return !token.ready && !token.consumed && !token.dismissed && (token.delayUntil === undefined || token.needsRelease);
}

export interface StructureInspectorItem {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  branch?: string;
  worktreePath?: string;
  cwd?: string;
  sessionId?: string;
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(
    getLanguage() === "en" ? "en-GB" : "zh-CN",
    { hour: "2-digit", minute: "2-digit" },
  );
}

export function formatDate(at: number): string {
  return new Date(at).toLocaleString(
    getLanguage() === "en" ? "en-GB" : "zh-CN",
    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
  );
}

export function formatStepDuration(step: RunStep): string | null {
  const ms =
    step.telemetry?.durationMs ??
    (step.endedAt && step.endedAt >= step.createdAt
      ? step.endedAt - step.createdAt
      : undefined);
  if (ms === undefined || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)}s`;
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${mins}m ${rem}s`;
}

export function formatStepTelemetrySummary(step: RunStep): string {
  const parts: string[] = [];
  if (step.telemetry) {
    if (step.telemetry.stepCount > 0) {
      parts.push(`${step.telemetry.stepCount} st`);
    }
    const totalTokens =
      (step.telemetry.inputTokens || 0) + (step.telemetry.outputTokens || 0);
    if (totalTokens > 0) {
      parts.push(
        totalTokens >= 1000
          ? `${(totalTokens / 1000).toFixed(1)}k tok`
          : `${totalTokens} tok`,
      );
    }
  }
  const dur = formatStepDuration(step);
  if (dur) parts.push(dur);
  return parts.join(" · ");
}

export function nodeStatusOf(
  snapshot: FlowspaceSnapshot | null,
  nodeId: string,
): string {
  const index = runtimeIndex(snapshot);
  return index.statuses.get(nodeId) ?? (index.waiting.has(nodeId) ? "waiting" : index.steps.get(nodeId)?.at(-1)?.state ?? "draft");
}

export function templateCapabilityBadges(tpl: WorkflowTemplate): {
  label: string;
  warn?: boolean;
}[] {
  const badges: { label: string; warn?: boolean }[] = [];
  if (tpl.nodes.some((n) => n.planMode)) {
    badges.push({ label: t("badgePlan") });
  }
  if (tpl.edges.some((e) => e.mode === "fork")) {
    badges.push({ label: t("badgeFork") });
  }
  const contEdges = tpl.edges.filter((e) => e.kind === "continuation");
  const loopEdge = contEdges.find((e) =>
    contEdges.some(
      (back) => back.source === e.target && back.target === e.source,
    ),
  );
  if (loopEdge) {
    badges.push({
      label: t("badgeLoop", { count: loopEdge.maxRounds || 3 }),
      warn: true,
    });
  }
  const joinTarget = tpl.nodes.some(
    (n) => contEdges.filter((e) => e.target === n.id).length >= 2,
  );
  if (joinTarget) {
    badges.push({ label: t("badgeJoin") });
  }
  if (
    tpl.nodes.some((n) =>
      ["git", "changes", "terminal", "board"].includes(n.kind),
    )
  ) {
    badges.push({ label: t("badgeTools") });
  }
  if (tpl.edges.some((e) => e.trigger === "confirm")) {
    badges.push({ label: t("confirm"), warn: true });
  }
  return badges;
}
