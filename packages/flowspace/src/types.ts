/** Persisted canvas vocabulary. Session history remains owned by DSH. */
export type NodeKind =
  | "agent"
  | "note"
  | "file"
  | "display"
  | "group"
  | "board"
  | "detail"
  | "git"
  | "changes"
  | "terminal";
export type ContextMode = "conclusion" | "session" | "fork";
export type Trigger = "off" | "auto" | "confirm";
export type NativeTrigger = "inherit" | "enabled" | "disabled";
export type ParticipationMode = "global" | "manual" | "paused" | "bypassed";
export type GroupColor = "violet" | "teal" | "blue" | "amber";
export type AgentTab = "task" | "conversation" | "execution";
export type RerunRule = "change" | "update" | "always";
export type VisualFilter = "auto" | "running" | "3d" | "7d" | "all";
export type GitPanelTab = "changes" | "history" | "branches";

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
  branch?: string;
  worktreePath?: string;
  agentPreset?: string;
  planMode?: boolean;
  customTitle?: boolean;
  subAgentsExpanded?: boolean;
  task: string;
  draft: string;
  /** Independent prompt sent when triggered by upstream completion (M02). */
  continuationPrompt?: string;
  continuationCollapsed?: boolean;
  nativeTrigger: NativeTrigger;
  participation: ParticipationMode;
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
  /** Tool node bindings (Git / Changes / Terminal) */
  gitTab?: GitPanelTab;
  gitCommitOid?: string;
  changesSessionId?: string;
  changesSeq?: number;
  changesTurn?: number;
  terminalSessionId?: string;
  terminalId?: string;
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
  currentVersion?: string;
  sourceItemKey?: string;
  snapshotTitle?: string;
  snapshotText?: string;
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
  filter?: VisualFilter;
  hiddenWorkspaces?: string[];
  showBranches?: boolean;
  showWorktrees?: boolean;
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
  referenceKind?:
    | "file"
    | "changes"
    | "git"
    | "terminal"
    | "display"
    | "note"
    | "board";
  missing?: boolean;
  sourceNodeId: string;
  sourceSessionId?: string;
  seq?: number;
  title: string;
  text: string;
  capturedAt: number;
  version?: string;
}

export interface StepTelemetry {
  stepCount: number;
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
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
  telemetry?: StepTelemetry;
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
  loopCapReached?: boolean;
  planGate?: boolean;
}

export interface PresentedDeliverable {
  id: string;
  nodeId: string;
  sessionId: string;
  turn: number;
  seq: number;
  time: number;
  path: string;
  description?: string;
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
  deliverables?: PresentedDeliverable[];
}

export interface SessionBrief {
  sessionId: string;
  title: string;
  cwd?: string;
  running: boolean;
  updatedAt?: number;
}
export interface SubagentBrief {
  sessionId: string;
  parentSessionId: string;
  title: string;
  running: boolean;
  updatedAt?: number;
}
export interface NativeAgentMessage {
  id: string;
  fromSessionId: string;
  toSessionId: string;
  kind: "agent-message" | "subagent-settled" | "team-message";
  text: string;
  summary?: string;
  seq: number;
  time: number;
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
export interface SessionChangeFile {
  path: string;
  display: string;
  added: number;
  deleted: number;
  binary?: boolean;
  oversized?: boolean;
}
export interface SessionChangeTurn {
  sessionId: string;
  turn: number;
  seq: number;
  cwd: string;
  total: number;
  added: number;
  deleted: number;
  files: SessionChangeFile[];
}
export interface DiffHunkView {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}
export interface SessionFileDiffView {
  path: string;
  display: string;
  kind: "text" | "binary" | "oversized";
  hunks: DiffHunkView[];
  formatted: string;
}
export interface SessionTerminalBrief {
  id: string;
  sessionId: string;
  title: string;
  cwd: string;
  state: "running" | "exited" | "failed";
  exitCode: number | null;
  origin: "user" | "agent";
}
export interface TerminalScreenSnapshot {
  sessionId: string;
  terminalId: string;
  title: string;
  state: "running" | "exited" | "failed";
  text: string;
  totalLines: number;
  truncated: boolean;
}

/** OMP-migrated Host Git models */
export interface GitFileChange {
  path: string;
  origPath?: string;
  status: "M" | "A" | "D" | "R" | "U" | "?";
  staged: boolean;
  added?: number;
  deleted?: number;
}
export interface GitBranchInfo {
  name: string;
  current: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  commitOid: string;
  worktreePath?: string;
}
export interface GitWorktreeInfo {
  path: string;
  head: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked: boolean;
  isMain: boolean;
}
export interface GitCommitInfo {
  oid: string;
  shortOid: string;
  parents: string[];
  subject: string;
  author: string;
  relativeTime: string;
  timestamp: number;
  refs: string[];
}
export interface GitRepoStatus {
  isGitRepo: boolean;
  cwd: string;
  topLevel?: string;
  commonDir?: string;
  branch: string;
  detached: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  revision: string;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  branches: GitBranchInfo[];
  worktrees: GitWorktreeInfo[];
  commits: GitCommitInfo[];
}
export interface GitDiffResult {
  title: string;
  text: string;
  hunks: DiffHunkView[];
  truncated: boolean;
}
export interface WorkspaceStructureBrief {
  id: string;
  name: string;
  path: string;
  isGitRepo: boolean;
  currentBranch?: string;
  branches: GitBranchInfo[];
  worktrees: GitWorktreeInfo[];
}

export interface LiveNodeState {
  nodeId: string;
  sessionId: string;
  running: boolean;
  output: string;
  seq: number;
  pendingInput: string[];
  updatedAt?: number;
  effectiveCwd?: string;
  changesTurns?: SessionChangeTurn[];
}
export interface FlowspaceSnapshot {
  document: FlowspaceDocument;
  runs: FlowspaceRun[];
  live: LiveNodeState[];
  nativeMessages?: NativeAgentMessage[];
  subagents?: SubagentBrief[];
  sourceVersions?: Record<string, string>;
}
export interface StartRequest {
  nodeIds: string[];
  kind:
    | "single"
    | "selection"
    | "group"
    | "global"
    | "from-node"
    | "to-node";
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
export interface RerunFailedRequest {
  runId: string;
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
  branch?: string;
  worktreePath?: string;
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
export interface GitInspectRequest {
  cwd?: string;
}
export interface GitDiffRequest {
  cwd?: string;
  target: "working" | "staged" | "commit" | "all";
  path?: string;
  commitOid?: string;
}
export interface GitActionRequest {
  cwd?: string;
  expectedRevision?: string;
  action:
    | "init"
    | "stage"
    | "unstage"
    | "stageAll"
    | "unstageAll"
    | "discard"
    | "commit"
    | "createBranch"
    | "checkoutBranch"
    | "fetch"
    | "pull"
    | "push"
    | "createWorktree"
    | "removeWorktree";
  paths?: string[];
  message?: string;
  branch?: string;
  baseRef?: string;
  worktreePath?: string;
}
export interface ExtendLoopRequest {
  runId: string;
  edgeId?: string;
  nodeId?: string;
  extraRounds?: number;
}
export interface InspectEdgeRequest {
  edgeId: string;
  runId?: string;
}
export interface EdgePayloadPreview {
  edgeId: string;
  kind: "reference" | "continuation";
  mode: string;
  sourceTitle: string;
  targetTitle: string;
  sessionId?: string;
  seq?: number;
  byteLength: number;
  willSpill: boolean;
  freshness: "pending" | "sent" | "updated" | "always" | "live";
  summary: string;
  content: string;
}
export interface RestoreSnapshotRequest {
  snapshotId: string;
}
export interface SessionChangesRequest {
  sessionId: string;
}
export interface SessionChangeDiffRequest {
  sessionId: string;
  seq: number;
  fileIndex?: number;
}
export interface SessionTerminalsRequest {
  sessionId: string;
}
export interface TerminalScreenReadRequest {
  sessionId: string;
  terminalId?: string;
  lines?: number;
}
