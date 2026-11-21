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
  | "terminal"
  | "role"
  | "flow";
export type ContextMode = "conclusion" | "session" | "fork";
export type Trigger = "off" | "auto" | "confirm";
export type NativeTrigger = "inherit" | "enabled" | "disabled";
export type ParticipationMode = "global" | "manual" | "paused" | "bypassed";
export type GroupColor = "violet" | "teal" | "blue" | "amber";
export type AgentTab = "task" | "conversation" | "execution" | "crew";
export type TeamLayout = "row" | "orbit" | "tree";
export type RerunRule = "change" | "update" | "always";
export type VisualFilter = "auto" | "running" | "3d" | "7d" | "all";
export type WireRoutingMode = "avoid" | "overlap";
export type GitPanelTab = "changes" | "history" | "branches";

export interface TeamModel {
  provider: string;
  model: string;
  reasoningEffort?: string;
}

export interface RoleDefinition {
  id: string;
  title: string;
  description: string;
  persona: string;
  model: TeamModel;
  revision: number;
  archived?: boolean;
}

export interface TeamSlot {
  slotId: string;
  roleId: string;
  label: string;
  model?: TeamModel;
  maxInstances?: number;
  /** Role node on the canvas that staffs this slot. */
  nodeId?: string;
}

export interface TeamBlueprint {
  id: string;
  title: string;
  lead: { persona: string; model: TeamModel };
  slots: TeamSlot[];
  norms: string;
  revision: number;
  archived?: boolean;
}

export type SaveRoleRequest = Omit<RoleDefinition, "archived">;
export type SaveTeamRequest = Omit<TeamBlueprint, "archived">;
export interface ArchiveTeamAssetRequest {
  id: string;
  revision: number;
}

export interface TeamModelRoute {
  provider: string;
  providerName: string;
  model: string;
  name: string;
}

export interface TeamReference {
  teamId: string;
  revision?: number;
}

/** Lead settings of a team composed on the canvas from role nodes. */
export interface CanvasTeamConfig {
  persona: string;
  norms: string;
  /** Absent: the lead keeps the session's default model. */
  model?: TeamModel;
}

export interface TeamDependencies {
  teams: TeamBlueprint[];
  roles: RoleDefinition[];
}

export interface TeamModelReplacement {
  from: TeamModel;
  to: TeamModel;
}

export interface WorkflowImportRequest {
  document?: FlowspaceDocument;
  template?: WorkflowTemplate;
  dependencies?: TeamDependencies;
  copyAssets?: boolean;
  replacements?: TeamModelReplacement[];
  enableTriggers?: boolean;
}

export type WorkflowImportResult =
  | { kind: "imported"; document: FlowspaceDocument }
  | { kind: "missing-models"; models: TeamModel[] };

export interface TeamSlotView {
  slotId: string;
  label: string;
  roleTitle: string;
  model: TeamModel;
  maxInstances: number;
  nodeId?: string;
}

export interface TeamMemberView {
  sessionId: string;
  parentId: string;
  depth: number;
  name: string;
  label: string;
  activity: "running" | "idle";
  mode: "continuable" | "one-shot" | "external";
  slotId: string | null;
  /** The canvas role node whose slot this member fills now. */
  nodeId?: string;
  provider?: string;
  model?: string;
}

export interface TeamTaskView {
  id: string;
  subject: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  ownerId?: string;
  ownerName?: string;
  blockedBy: string[];
  ready: boolean;
}

export interface TeamRuntimeBrief {
  leadSessionId: string;
  nodeId: string;
  teamId: string;
  title: string;
  revision: number;
  enabled: boolean;
  leadModel: TeamModel;
  slots: TeamSlotView[];
  tasks: TeamTaskView[];
  members: TeamMemberView[];
  capacity: { active: number; max: number };
}

export interface GroupPort {
  id: string;
  portId?: string;
  kind: WireKind;
  direction: "in" | "out";
  name: string;
  nodes: string[];
  hidden: boolean;
}

export type BoardCardPriority = "none" | "low" | "medium" | "high" | "urgent";
export type BoardColumnRole = "backlog" | "todo" | "doing" | "done" | "custom";
export type BoardColumnColor = "neutral" | "blue" | "teal" | "green" | "amber" | "violet" | "red";
export type BoardViewMode = "board" | "list";
export type BoardRefScope = "selected-or-all" | "open-only" | "all";

export type ContainerPermission = "read" | "advance" | "edit";

export interface BoardComment {
  id: string;
  by: string;
  text: string;
  createdAt: number;
}

export interface BoardChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface BoardCard {
  id: string;
  text: string;
  description?: string;
  done?: boolean;
  priority?: BoardCardPriority;
  tags?: string[];
  dueDate?: string;
  checklist?: BoardChecklistItem[];
  comments?: BoardComment[];
  author?: string;
  previousColumnId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface BoardColumn {
  id: string;
  name: string;
  cards: BoardCard[];
  role?: BoardColumnRole;
  color?: BoardColumnColor;
  wipLimit?: number;
  collapsed?: boolean;
}

export interface BoardSettings {
  view?: BoardViewMode;
  autoMoveDone?: boolean;
  showCompleted?: boolean;
  refScope?: BoardRefScope;
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
  origX?: number;
  origY?: number;
  origW?: number;
  origH?: number;
}

/** Flow configs cross the DSH RPC and storage boundaries as JSON. */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export type FlowDataType = "text" | "list" | "record" | "signal" | "file";

export interface FlowSpill {
  locator: string;
  preview: string;
  bytes: number;
}

export interface FlowItem {
  key: string;
  value?: JsonValue;
  spill?: FlowSpill;
}

/** Lists retain identity and source order. A spilled value is represented by its locator. */
export interface FlowContent {
  dataType: FlowDataType;
  value?: JsonValue;
  items?: FlowItem[];
  originalCount?: number;
  spill?: FlowSpill;
}

export interface FanoutPairIds {
  fanId: string;
  mergeId: string;
}

export interface FlowNode {
  id: string;
  breakpoint?: boolean;
  budget?: BudgetLimits;
  laneBindings?: { provider?: string; model?: string; persona?: string; cwd?: string };
  lanePersona?: string;
  canvasToolsOnly?: boolean;
  kind: NodeKind;
  flowType?: string;
  config?: JsonObject;
  configVersion?: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
  parentId?: string;
  fanout?: FanoutPairIds;
  masterOf?: string;
  generatedBy?: string;
  masterNodeId?: string;
  itemKey?: string;
  itemTitle?: string;
  laneIndex?: number;
  overridden?: boolean;
  removed?: boolean;
  generatedRevision?: number;
  sessionId?: string;
  workspaceId?: string;
  cwd?: string;
  branch?: string;
  worktreePath?: string;
  agentPreset?: string;
  teamRef?: TeamReference;
  /** Canvas-composed team (no library blueprint). Mutually exclusive with `teamRef`. */
  teamConfig?: CanvasTeamConfig;
  teamLayout?: TeamLayout;
  /** Role node: library role it instantiates; absent means an inline role (`text` = persona). */
  roleRef?: string;
  /** Role node: model for an inline role, or an override for a library role. */
  teamModel?: TeamModel;
  /** Role node: concurrent member limit for this slot. */
  maxInstances?: number;
  /** Role node: team node this role staffs (a staffing wire). */
  staffOf?: string;
  /** Role node: native subagent slot name. */
  slotId?: string;
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
  boardSettings?: BoardSettings;
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
  generatedBy?: string;
  masterEdgeId?: string;
  itemKey?: string;
  generatedRevision?: number;
  sourcePort?: string;
  targetPort?: string;
  emitMode?: "stream" | "end";
  permission?: ContainerPermission;
  ask?: boolean;
  delivery?: { mode: "lines" | "paragraph" | "list"; columnId?: string };
  logic?: {
    negate?: boolean;
    fromRound?: number;
    maxTimes?: number;
    delayMs?: number;
  };
  kind: WireKind;
  event?: EventPolicy;
  mode: ContextMode;
  trigger: Trigger;
  maxRounds: number;
  always: boolean;
  sentVersion?: string;
  currentVersion?: string;
  sourceItemKey?: string;
  snapshotTitle?: string;
  snapshotText?: string;
  snapshotContent?: FlowContent;
  originMode?: ContextMode;
  waypoints?: Waypoint[];
  placedCapsules?: string[];
}

export type WireKind = "reference" | "continuation" | "event";
export type FlowEventKind = "running" | "waiting" | "done" | "error" | "budget" | "output" | "tool" | "usage" | "container";
export interface EventPolicy {
  mode: "end" | "change" | "continuous";
  kinds: FlowEventKind[];
  reasons?: string[];
  cooldownMs?: number;
  maxTimes?: number;
  full?: boolean;
}
export interface FlowEvent {
  id: string;
  nodeId: string;
  stepId: string;
  kind: FlowEventKind;
  at: number;
  round: number;
  reason?: string;
  sessionId?: string;
  seq?: number;
  telemetry?: StepTelemetry;
  summary?: string;
}
export interface TriggerGuards {
  cooldownSec?: number;
  dailyLimit?: number;
  busy?: "skip" | "queue" | "interrupt";
}
export interface TriggerStatus {
  id: string;
  nextAt?: number;
  lastAt?: number;
  missed: number;
  day?: string;
  hits: number;
  configKey?: string;
  queued?: ContextSnapshot[];
  observed?: Record<string, string>;
}
export interface FlowNotice {
  id: string;
  title: string;
  text: string;
  at: number;
  system?: boolean;
  sound?: boolean;
}

export interface WorkflowTemplate {
  id: string;
  fanout?: FanoutPairIds;
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
  wireRouting?: WireRoutingMode;
  snap?: boolean;
  filter?: VisualFilter;
  hiddenWorkspaces?: string[];
  showBranches?: boolean;
  showWorktrees?: boolean;
}

export interface FlowspaceDocument {
  version: 1;
  generationRevision?: number;
  id: string;
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };
  settings: { nativeChatTriggers: boolean; reducedMotion: boolean; listLimit?: number; automaticTriggers?: boolean;
    triggerGuards?: TriggerGuards; budget?: BudgetLimits };
  containerRevision?: number;
  prefs?: CanvasPrefs;
  templates?: WorkflowTemplate[];
  snapshots?: CanvasSnapshot[];
}

export type ContainerEntry =
  | { kind: "board"; columnId: string; beforeId?: string; card: BoardCard }
  | { kind: "note"; text: string }
  | { kind: "file"; text: string; path: string; cwd: string };

export interface ContainerChange {
  id: string;
  nodeId: string;
  itemId?: string;
  edgeId?: string;
  sessionId?: string;
  runId?: string;
  stepId?: string;
  by: string;
  at: number;
  revision: number;
  before: ContainerEntry | null;
  after: ContainerEntry | null;
  beforeVersion: string;
  afterVersion: string;
  pending?: boolean;
  revertedBy?: string;
}

export type VariableScope = "run" | "canvas" | "lane";
export type VariableType = "text" | "number" | "boolean" | "list" | "record";
export interface VariableValue {
  key: string;
  id: string;
  name: string;
  scope: VariableScope;
  type: VariableType;
  runId?: string;
  lane?: string;
  version: number;
  value: JsonValue;
}
export interface VariableWrite {
  id: string;
  writer: string;
  at: number;
  from: JsonValue;
  to: JsonValue;
  version: number;
  runId?: string;
  stepId?: string;
}
export interface VariableRecord extends VariableValue {
  history: VariableWrite[];
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
    | "board-card"
    | "board"
    | "variable";
  missing?: boolean;
  sourceNodeId: string;
  sourceSessionId?: string;
  seq?: number;
  title: string;
  text: string;
  content?: FlowContent;
  textSpill?: FlowSpill;
  capturedAt: number;
  version?: string;
}

export interface StepTelemetry {
  stepCount: number;
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
}

export interface DataCallTrace {
  id: string;
  operation: string;
  itemKey?: string;
  index?: number;
  provider: string;
  model: string;
  startedAt: number;
  endedAt: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
  inputSummary: string;
  outputSummary?: string;
}

export type StepState =
  | "queued"
  | "running"
  | "settling"
  | "awaiting"
  | "skipped"
  | "completed"
  | "error"
  | "aborted"
  | "interrupted";

export interface StepEmission {
  items: FlowItem[];
  calls: { id: string; accepted: number; total: number }[];
  total: number;
  limit: number;
  closed: boolean;
  missing?: boolean;
  reminderStepId?: string;
}

export interface RunStep {
  debug?: { reason: "breakpoint" | "budget"; tools: string[]; originalTask: string; continuation: boolean;
    references: { edgeId: string; version: string }[] };
  startedAt?: number;
  operationParameters?: Record<string, Record<string, string>>;
  parameterRetryFor?: string;
  operation?: PreparedOperation;
  operationResult?: { exitCode: number | null; timedOut: boolean; stdout: string; stderr: string };
  upstreamStepIds?: string[];
  variables?: VariableValue[];
  resolvedConfig?: JsonObject;
  id: string;
  nodeId: string;
  fanoutId?: string;
  itemKey?: string;
  fanoutBatchId?: string;
  streamFrom?: string;
  requestId: string;
  sessionId?: string;
  teamRef?: TeamReference;
  turn?: number;
  state: StepState;
  iteration: number;
  task: string;
  sources: ContextSnapshot[];
  /** Target port for each source of a registered node, in the same order. */
  sourcePorts?: string[];
  createdAt: number;
  endedAt?: number;
  endSeq?: number;
  output?: string;
  outputContent?: FlowContent;
  dataCalls?: DataCallTrace[];
  error?: string;
  telemetry?: StepTelemetry;
  route?: string;
  emission?: StepEmission;
  reminderFor?: string;
  verdict?: {
    branch: string; reason?: string; confidence?: number;
    provider?: string; model?: string; inputSummary?: string; rawOutputs?: string[];
  };
  human?: {
    operation?: boolean;
    fields?: HumanField[];
    initial?: JsonObject;
    question: string;
    options: string[];
    deadline?: number;
    timeoutAction?: "wait" | "skip" | "default" | "timeout-port";
    defaultOption?: string;
  };
}

export interface HumanField {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "score" | "review" | "like";
  required?: boolean;
  choices?: string[];
}

export interface PreparedOperation {
  cwd: string;
  sessionId?: string;
  values: Record<string, string>;
  missing: string[];
  preview: string;
  revision?: string;
  approved?: boolean;
  review?: boolean;
}

export interface FlowToken {
  id: string;
  edgeId: string;
  stepId: string;
  /** Native emitting step for stream propagation across intermediate transformations. */
  streamFrom?: string;
  fanoutBatchId?: string;
  source: ContextSnapshot;
  skip?: true;
  createdAt: number;
  readyAt?: number;
  readyOrder?: number;
  delayUntil?: number;
  needsRelease?: true;
  consumedAt?: number;
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

/** Per-run input and delivery state for one generated lane, in source order. */
export interface RunFanoutLane {
  item: FlowItem;
  fanStepId: string;
  input: ContextSnapshot;
  state: "queued" | "running" | "completed" | "skipped" | "error" | "cancelled";
  result?: ContextSnapshot;
  endedAt?: number;
  adopted?: boolean;
  readyOrder?: number;
  score?: number;
  model?: TeamModel;
}

export interface RunFanout {
  id: string;
  producerStepId?: string;
  fanId: string;
  mergeId: string;
  groupId: string;
  closed: boolean;
  lanes: RunFanoutLane[];
  mergeStepId?: string;
}

export interface FlowspaceRun {
  id: string;
  title: string;
  origin: "canvas" | "chat" | "trigger";
  triggerId?: string;
  events?: FlowEvent[];
  pendingEvents?: { edgeId: string; event: FlowEvent; content: string; dueAt: number }[];
  budget?: BudgetLimits;
  budgetPause?: { nodeId?: string; dimension: keyof BudgetLimits; value: number; limit: number; at: number };
  budgetAcknowledged?: string[];
  singleStep?: boolean;
  report?: RunReport;
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
  listLimit?: number;
  steps: RunStep[];
  tokens: FlowToken[];
  fanouts?: RunFanout[];
  accumulators?: { nodeId: string; content: FlowContent }[];
  fanoutReadyOrder?: number;
  notes: string[];
  deliverables?: PresentedDeliverable[];
}

export interface RunReport {
  summary: string;
  seconds: number;
  tokens: number;
  rounds: number;
  bestNode?: string;
  artifacts: PresentedDeliverable[];
}
export interface ArenaResult {
  id: string;
  runId: string;
  tag: string;
  model: TeamModel;
  won: boolean;
}

export interface BudgetLimits {
  tokens?: number;
  seconds?: number;
  rounds?: number;
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

export interface NativeOperation {
  nodeId: string;
  kind: "terminal" | "git";
  command: string;
  cwd?: string;
  at: number;
  seq: number;
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
  nativeOperations?: NativeOperation[];
  subagents?: SubagentBrief[];
  sourceVersions?: Record<string, string>;
  roles?: RoleDefinition[];
  teamBlueprints?: TeamBlueprint[];
  teams?: Record<string, TeamRuntimeBrief>;
  containerChanges?: ContainerChange[];
  variables?: VariableRecord[];
  triggers?: TriggerStatus[];
  notices?: FlowNotice[];
  arena?: ArenaResult[];
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
export interface HumanAnswerRequest {
  runId: string;
  stepId: string;
  option: string;
  values?: JsonObject;
}
export interface InspectEdgeRequest {
  edgeId: string;
  runId?: string;
}
export interface DataPreviewRequest {
  nodeId: string;
  tryModel?: boolean;
}
export interface DataPreview {
  state: "ready" | "waiting" | "trial" | "error";
  lines: string[];
  count: number;
  remaining: number;
  originalCount?: number;
  message?: string;
  telemetry?: StepTelemetry;
}
export interface EdgePayloadPreview {
  edgeId: string;
  kind: WireKind;
  mode: string;
  sourceTitle: string;
  targetTitle: string;
  sessionId?: string;
  seq?: number;
  byteLength: number;
  willSpill: boolean;
  itemCount?: number;
  originalCount?: number;
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
