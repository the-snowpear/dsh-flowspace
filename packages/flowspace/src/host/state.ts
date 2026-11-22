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
