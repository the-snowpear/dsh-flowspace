import type { FlowEdge, FlowNode } from "../types.ts";

/** Ephemeral UI-only fields stripped on template capture, instantiation, snapshot and clipboard copy. */
export const EPHEMERAL_UI_NODE_FIELDS = ["window", "nudge"] as const satisfies readonly (keyof FlowNode)[];

/** Host/session-identity fields stripped when creating a fresh copy of a node (clipboard / template instantiation). */
export const SESSION_IDENTITY_NODE_FIELDS = [
  "sessionId",
  "lastSubmittedTask",
] as const satisfies readonly (keyof FlowNode)[];

/** All machine- and session-bound fields stripped when capturing a portable workflow template. */
export const PORTABLE_STRIP_NODE_FIELDS = [
  ...SESSION_IDENTITY_NODE_FIELDS,
  ...EPHEMERAL_UI_NODE_FIELDS,
  "workspaceId",
  "cwd",
  "branch",
  "worktreePath",
  "changesSessionId",
  "changesSeq",
  "changesTurn",
  "terminalSessionId",
  "terminalId",
] as const satisfies readonly (keyof FlowNode)[];

/** Host-owned binding fields preserved when an already-bound node is saved, restored, or reconciled in a fanout lane. */
export const PRESERVED_BOUND_NODE_FIELDS = [
  "sessionId",
  "cwd",
  "workspaceId",
  "branch",
  "worktreePath",
  "lastSubmittedTask",
] as const satisfies readonly (keyof FlowNode)[];

/** Edge runtime-freshness fields stripped when capturing a portable template or cloning a fanout edge. */
export const PORTABLE_STRIP_EDGE_FIELDS = [
  "sentVersion",
  "currentVersion",
  "originMode",
] as const satisfies readonly (keyof FlowEdge)[];

/**
 * Authored node fields synchronized from a template slot onto an unbound canvas instance
 * when `keepTasks` is false. Centralizing this list prevents silent field loss as FlowNode grows.
 */
export const TEMPLATE_SYNC_NODE_FIELDS = [
  "title",
  "titleKey",
  "customTitle",
  "task",
  "continuationPrompt",
  "text",
  "flowType",
  "config",
  "configVersion",
  "breakpoint",
  "budget",
  "canvasToolsOnly",
  "laneBindings",
  "lanePersona",
  "agentPreset",
  "planMode",
  "teamRef",
  "teamConfig",
  "teamLayout",
  "roleRef",
  "teamModel",
  "maxInstances",
  "slotId",
  "roleLabel",
  "nativeTrigger",
  "participation",
  "rerun",
  "fixed",
  "expanded",
  "pinned",
  "color",
  "columns",
  "boardSettings",
  "items",
  "selectedItems",
  "gitTab",
  "gitCommitOid",
] as const satisfies readonly (keyof FlowNode)[];

/** Authored node fields whose divergence from a fanout master marks the lane as overridden. */
export const FANOUT_OVERRIDE_NODE_FIELDS = [
  "title",
  "task",
  "draft",
  "continuationPrompt",
  "text",
  "config",
  "configVersion",
  "breakpoint",
  "budget",
  "canvasToolsOnly",
  "laneBindings",
  "lanePersona",
  "agentPreset",
  "columns",
  "boardSettings",
  "selectedItems",
  "items",
  "roleLabel",
  "planMode",
  "teamRef",
  "teamConfig",
  "teamLayout",
  "roleRef",
  "teamModel",
  "maxInstances",
  "slotId",
  "nativeTrigger",
  "participation",
  "rerun",
] as const satisfies readonly (keyof FlowNode)[];

/** Authored edge fields whose divergence from a fanout master marks the lane as overridden. */
export const FANOUT_OVERRIDE_EDGE_FIELDS = [
  "kind",
  "source",
  "target",
  "sourcePort",
  "targetPort",
  "mode",
  "trigger",
  "emitMode",
  "always",
  "maxRounds",
  "logic",
  "sourceItemKey",
  "permission",
  "ask",
  "delivery",
  "event",
] as const satisfies readonly (keyof FlowEdge)[];

export function stripFields<T extends object>(target: T, fields: readonly (keyof T)[]): T {
  for (const field of fields) delete target[field];
  return target;
}

export function stripForPortableTemplate(node: FlowNode): FlowNode {
  return stripFields(node, PORTABLE_STRIP_NODE_FIELDS);
}

export function stripForFreshInstance(node: FlowNode): FlowNode {
  stripFields(node, SESSION_IDENTITY_NODE_FIELDS);
  stripFields(node, EPHEMERAL_UI_NODE_FIELDS);
  return node;
}

export function stripEdgeForPortableTemplate(edge: FlowEdge): FlowEdge {
  return stripFields(edge, PORTABLE_STRIP_EDGE_FIELDS);
}

export function copyBoundNodeFields(target: FlowNode, prior: FlowNode): void {
  for (const field of PRESERVED_BOUND_NODE_FIELDS) {
    if (prior[field] !== undefined) {
      (target as unknown as Record<string, unknown>)[field] = prior[field];
    }
  }
}

export function syncTemplateAuthoredFields(target: FlowNode, source: FlowNode): void {
  for (const field of TEMPLATE_SYNC_NODE_FIELDS) {
    const value = source[field];
    if (value === undefined) {
      delete (target as unknown as Record<string, unknown>)[field];
    } else {
      (target as unknown as Record<string, unknown>)[field] =
        typeof value === "object" && value !== null ? structuredClone(value) : value;
    }
  }
  target.draft = source.task || source.draft;
}
