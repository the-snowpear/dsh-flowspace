/** Persisted canvas vocabulary. Session history remains owned by DSH. */
export type NodeKind =
  | "agent"
  | "note"
  | "file"
  | "display"
  | "group"
  | "board"
  | "detail";
export type ContextMode = "conclusion" | "session" | "fork";
export type Trigger = "off" | "auto" | "confirm";
export type NativeTrigger = "inherit" | "enabled" | "disabled";
export type GroupColor = "violet" | "teal" | "blue" | "amber";
export type AgentTab = "task" | "conversation" | "execution";
export type RerunRule = "change" | "update" | "always";

export interface GroupPort {
  id: string;
  kind: "reference" | "continuation";
  direction: "in" | "out";
  name: string;
  nodes: string[];
  hidden: boolean;
}

export interface BoardCard {
  id: string;
  text: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  cards: BoardCard[];
}

export interface WindowState {
  x: number;
  y: number;
  w: number;
  h: number;
  snap?: "left" | "right" | "max" | null;
  z?: number;
}

export interface NodeNudge {
  by: string;
  origY?: number;
  origH?: number;
}

export interface FlowNode {
  id: string;
  kind: NodeKind;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
  parentId?: string;
  sessionId?: string;
  workspaceId?: string;
  cwd?: string;
  agentPreset?: string;
  task: string;
  draft: string;
  nativeTrigger: NativeTrigger;
  participation: "global" | "manual" | "paused";
  text: string;
  sourceNodeId?: string;
  sourceSeq?: number;
  fixed: boolean;
  collapsed: boolean;
  lastSubmittedTask?: string;
  /** Optional rich canvas UI metadata persisted in DSH storageDomain */
  tab?: AgentTab;
  pinned?: boolean;
  roleLabel?: string;
  rerun?: RerunRule;
  color?: GroupColor;
  ports?: GroupPort[];
  templateId?: string;
  templateRevision?: number;
  templateSlotId?: string;
  titleKey?: string;
  window?: WindowState | null;
  columns?: BoardColumn[];
  items?: string[];
  selectedItems?: string[];
  nudge?: NodeNudge;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  kind: "reference" | "continuation";
  mode: ContextMode;
  trigger: Trigger;
  maxRounds: number;
  always: boolean;
  sentVersion?: string;
  originMode?: ContextMode;
  waypoints?: Waypoint[];
  placedCapsules?: string[];
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  revision: number;
  builtin?: boolean;
  color?: GroupColor;
  w: number;
  h: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  ports: GroupPort[];
}

export interface CanvasSnapshot {
  id: string;
  title: string;
  createdAt: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };
  summary?: {
    drafts: number;
    stopping: number;
    awaiting: number;
    queued: number;
    recentOutputs: { title: string; snippet: string }[];
  };
}

export interface CanvasPrefs {
  theme?: "dark" | "light" | "auto";
  wheel?: "zoom" | "pan";
  snap?: boolean;
  filter?: "auto" | "running" | "all";
  hiddenWorkspaces?: string[];
}

export interface FlowspaceDocument {
  version: 1;
  id: string;
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };
  settings: { nativeChatTriggers: boolean; reducedMotion: boolean };
  prefs?: CanvasPrefs;
  templates?: WorkflowTemplate[];
  snapshots?: CanvasSnapshot[];
}

export interface ContextSnapshot {
  id: string;
  kind: "conclusion" | "session" | "fork" | "text" | "file";
  sourceNodeId: string;
  sourceSessionId?: string;
  seq?: number;
  title: string;
  text: string;
  capturedAt: number;
  version?: string;
}

export type StepState =
  | "queued"
  | "running"
  | "completed"
  | "error"
  | "aborted"
  | "interrupted";
export interface RunStep {
  id: string;
  nodeId: string;
  requestId: string;
  sessionId?: string;
  turn?: number;
  state: StepState;
  iteration: number;
  task: string;
  sources: ContextSnapshot[];
  createdAt: number;
  endedAt?: number;
  endSeq?: number;
  output?: string;
  error?: string;
}

export interface FlowToken {
  id: string;
  edgeId: string;
  stepId: string;
  source: ContextSnapshot;
  ready: boolean;
  consumed: boolean;
  boundary: boolean;
  dismissed: boolean;
}

export interface FlowspaceRun {
  id: string;
  title: string;
  origin: "canvas" | "chat";
  state:
    | "running"
    | "waiting"
    | "paused"
    | "completed"
    | "cancelled"
    | "interrupted"
    | "error";
  createdAt: number;
  scope: string[] | null;
  roots: string[];
  participants: string[];
  graph: { nodes: FlowNode[]; edges: FlowEdge[] };
  steps: RunStep[];
  tokens: FlowToken[];
  notes: string[];
}

export interface SessionBrief {
  sessionId: string;
  title: string;
  cwd?: string;
  running: boolean;
}
export interface WorkspaceBrief {
  id: string;
  name: string;
  path: string;
}
export interface WorkspaceFilePreview {
  path: string;
  content: string;
  truncated: boolean;
}
export interface LiveNodeState {
  nodeId: string;
  sessionId: string;
  running: boolean;
  output: string;
  seq: number;
  pendingInput: string[];
}
export interface FlowspaceSnapshot {
  document: FlowspaceDocument;
  runs: FlowspaceRun[];
  live: LiveNodeState[];
}
export interface StartRequest {
  nodeIds: string[];
  kind: "single" | "selection" | "group" | "global";
  excludeRootIds?: string[];
}
export interface LaunchPlan {
  roots: string[];
  later: string[];
  confirmation: string[];
  skipped: { nodeId: string; reason: string }[];
}
export interface RunCommand {
  runId: string;
  action: "pause" | "resume" | "cancel";
}
export interface ReleaseRequest {
  runId: string;
  tokenId: string;
  accept: boolean;
}
export interface BindRequest {
  nodeId: string;
  sessionId?: string;
  workspaceId?: string;
  cwd?: string;
}
export interface DraftRequest {
  nodeId: string;
  draft: string;
}
export interface SourceRequest {
  nodeId: string;
  text?: string;
  seq?: number;
  fixed: boolean;
}
export interface WorkspaceFilesRequest {
  cwd?: string;
}
export interface FilePreviewRequest {
  path: string;
  cwd?: string;
}
