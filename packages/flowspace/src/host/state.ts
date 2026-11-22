import { emptyDocument } from "../core/document.ts";
import type {
  ContextSnapshot,
  FlowNotice,
  FlowspaceDocument,
  FlowspaceRun,
  LiveNodeState,
  NativeAgentMessage,
  NativeOperation,
  SubagentBrief,
} from "../types.ts";

export const MAX_NATIVE_MESSAGES = 2000;
export const MAX_NATIVE_OPERATIONS = 1000;
export const MAX_INJECTED_STEPS = 4000;

export interface PreparedReferenceEntry {
  snapshot: ContextSnapshot;
  edgeId: string;
  version: string;
}

export interface FlowspaceHostState {
  doc: FlowspaceDocument;
  runs: FlowspaceRun[];
  live: Map<string, LiveNodeState>;
  nativeMessages: Map<string, NativeAgentMessage>;
  nativeOperations: Map<string, NativeOperation>;
  notices: FlowNotice[];
  subagents: Map<string, SubagentBrief>;
  listeners: Set<() => void>;
  turnOutput: Map<string, string>;
  canvasSessions: Set<string>;
  injectedSteps: Set<string>;
}

export function createHostState(): FlowspaceHostState {
  return {
    doc: emptyDocument(),
    runs: [],
    live: new Map(),
    nativeMessages: new Map(),
    nativeOperations: new Map(),
    notices: [],
    subagents: new Map(),
    listeners: new Set(),
    turnOutput: new Map(),
    canvasSessions: new Set(),
    injectedSteps: new Set(),
  };
}

/** Evicts oldest entries (Map insertion order) once `map.size > maxEntries`. */
export function capMapSize<K, V>(map: Map<K, V>, maxEntries: number): void {
  if (map.size <= maxEntries) return;
  const excess = map.size - maxEntries;
  let removed = 0;
  for (const key of map.keys()) {
    map.delete(key);
    if (++removed >= excess) break;
  }
}

/** Evicts oldest entries (Set insertion order) once `set.size > maxEntries`. */
export function capSetSize<T>(set: Set<T>, maxEntries: number): void {
  if (set.size <= maxEntries) return;
  const excess = set.size - maxEntries;
  let removed = 0;
  for (const value of set) {
    set.delete(value);
    if (++removed >= excess) break;
  }
}

/** Prunes live entries, native operations, and injected step IDs for removed nodes/runs. */
export function pruneHostState(state: FlowspaceHostState): void {
  const activeNodeIds = new Set(state.doc.nodes.map((node) => node.id));
  for (const nodeId of state.live.keys()) {
    if (!activeNodeIds.has(nodeId)) state.live.delete(nodeId);
  }
  for (const [key, op] of state.nativeOperations.entries()) {
    if (!activeNodeIds.has(op.nodeId)) state.nativeOperations.delete(key);
  }
  if (state.injectedSteps.size > 0) {
    const activeStepIds = new Set<string>();
    for (const run of state.runs) {
      for (const step of run.steps) activeStepIds.add(step.id);
    }
    for (const stepId of state.injectedSteps) {
      if (!activeStepIds.has(stepId)) state.injectedSteps.delete(stepId);
    }
  }
  capMapSize(state.nativeMessages, MAX_NATIVE_MESSAGES);
  capMapSize(state.nativeOperations, MAX_NATIVE_OPERATIONS);
  capSetSize(state.injectedSteps, MAX_INJECTED_STEPS);
}
