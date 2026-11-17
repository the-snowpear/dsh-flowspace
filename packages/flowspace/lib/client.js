window.__ModuleLoader__.load({id:"dsh-flowspace",factory(require){const module={exports:{}};const exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/flowspace/src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// packages/flowspace/src/client/i18n.ts
var language = "zh";
var subscribers = /* @__PURE__ */ new Set();
var getLanguage = () => language.startsWith("en") ? "en" : "zh";
var setLanguage = (value2) => {
  const next = value2.startsWith("en") ? "en" : "zh";
  if (next !== language) {
    language = next;
    subscribers.forEach((fn) => fn());
  }
};
var subscribeLanguage = (fn) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};
var dict = {
  appTitle: ["FlowSpace \xB7 Agent \u753B\u5E03", "FlowSpace \xB7 Agent Canvas"],
  canvas: ["\u753B\u5E03", "Canvas"],
  conversation: ["\u5BF9\u8BDD", "Conversation"],
  workflows: ["\u5DE5\u4F5C\u6D41", "Workflows"],
  activity: ["\u8FD0\u884C\u8BB0\u5F55", "Activity"],
  settings: ["\u8BBE\u7F6E", "Settings"],
  workbench: ["\u5DE5\u4F5C\u53F0", "Workbench"],
  workspaces: ["\u5DE5\u4F5C\u533A", "Workspaces"],
  workspace: ["\u5DE5\u4F5C\u533A", "Workspace"],
  currentWorkspace: ["\u5F53\u524D\u5DE5\u4F5C\u533A", "Current workspace"],
  projectSessions: ["\u5DE5\u4F5C\u533A\u4E0E Agent", "Workspaces & agents"],
  hostSaved: ["\u5DF2\u4FDD\u5B58", "Saved"],
  saving: ["\u4FDD\u5B58\u4E2D\u2026", "Saving\u2026"],
  showWorkspace: ["\u5728\u753B\u5E03\u663E\u793A", "Show on canvas"],
  hideWorkspace: ["\u4ECE\u753B\u5E03\u9690\u85CF", "Hide from canvas"],
  searchNodes: ["\u641C\u7D22\u8282\u70B9", "Search nodes"],
  commandSearch: [
    "\u641C\u7D22\u8282\u70B9\u3001\u6587\u4EF6\u3001\u64CD\u4F5C\u6216\u5DE5\u4F5C\u6D41\u2026",
    "Search nodes, files, actions or workflows\u2026"
  ],
  command: ["\u5FEB\u6377\u547D\u4EE4", "Commands"],
  create: ["\u521B\u5EFA\u4E0E\u5BFC\u5165", "Create & import"],
  add: ["\u6DFB\u52A0\u8282\u70B9", "Add node"],
  newAgent: ["\u65B0\u5EFA Agent", "New agent"],
  existingSession: ["\u5DF2\u6709 DSH \u4F1A\u8BDD\u2026", "Existing DSH session\u2026"],
  newFile: ["\u6587\u4EF6\u5F15\u7528", "File reference"],
  newNote: ["\u65B0\u5EFA\u4FBF\u7B7E", "New note"],
  newBoard: ["\u4EFB\u52A1\u770B\u677F", "Task board"],
  newDisplay: ["\u5C55\u793A\u8282\u70B9", "Display node"],
  filter: ["\u663E\u793A", "Show"],
  auto: ["\u81EA\u52A8", "Auto"],
  onlyRunning: ["\u8FD0\u884C\u4E0E\u7B49\u5F85", "Running & waiting"],
  all: ["\u5168\u90E8\u8282\u70B9", "All nodes"],
  run: ["\u542F\u52A8", "Run"],
  runAll: ["\u5168\u5C40\u542F\u52A8", "Run all"],
  runSelection: ["\u542F\u52A8\u9009\u533A", "Run selection"],
  runGroup: ["\u542F\u52A8\u5DE5\u4F5C\u6D41", "Run workflow"],
  runSingle: ["\u542F\u52A8 Agent", "Run agent"],
  runCount: ["\u542F\u52A8 {count} \u4E2A\u8D77\u59CB Agent", "Run {count} starting agents"],
  launchDescription: [
    "\u8D77\u59CB Agent \u5148\u8FD0\u884C\uFF0C\u4E0B\u6E38\u6309\u63A5\u7EED\u89C4\u5219\u63A8\u8FDB\u3002\u9690\u85CF\u5DE5\u4F5C\u533A\u7684\u53EF\u8FD0\u884C\u8D77\u70B9\u4E5F\u5305\u542B\u5728\u5185\u3002",
    "Starting agents run first, then continuations advance the flow. Hidden starters are included."
  ],
  hidden: ["\u5DF2\u9690\u85CF", "Hidden"],
  noStarters: ["\u8FD8\u6CA1\u6709\u53EF\u542F\u52A8\u7684\u4EFB\u52A1", "No tasks ready to run"],
  noStartersDescription: [
    "\u4E3A Agent \u5199\u4E0B\u4EFB\u52A1\uFF0C\u6216\u4E3A\u5DF2\u5B8C\u6210\u7684 Agent \u8865\u5145\u65B0\u8F93\u5165\u3002",
    "Write a task for an agent, or add new input to a completed agent."
  ],
  task: ["\u4EFB\u52A1", "Task"],
  conversationTab: ["\u5BF9\u8BDD", "Conversation"],
  execution: ["\u6267\u884C", "Execution"],
  savedTask: ["\u4EFB\u52A1\u9884\u8BBE", "Saved task"],
  taskPlaceholder: [
    "\u5199\u4E0B\u8981\u5B8C\u6210\u7684\u4EFB\u52A1\u2026\uFF08\u8F93\u5165 @ \u5F15\u7528\u4E0A\u4E0B\u6587\uFF0CEnter \u542F\u52A8\uFF09",
    "Describe the task\u2026 (@ to reference context, Enter to run)"
  ],
  followupPlaceholder: [
    "\u8865\u5145\u4E0B\u4E00\u8F6E\u6307\u793A\uFF0C@ \u5F15\u7528\u4E0A\u4E0B\u6587\u2026",
    "Add next-turn instructions, @ to reference context\u2026"
  ],
  send: ["\u53D1\u9001", "Send"],
  queueSend: ["\u52A0\u5165\u961F\u5217", "Queue"],
  rerun: ["\u91CD\u65B0\u8FD0\u884C", "Run again"],
  bindConversation: ["\u521B\u5EFA\u5E76\u6253\u5F00\u539F\u751F\u4F1A\u8BDD", "Create & open session"],
  forkDraftHint: [
    "\u6B64\u8349\u7A3F\u5DF2\u63A5\u5165\u5386\u53F2\u5206\u53C9\uFF0C\u9996\u6B21\u8FD0\u884C\u65F6\u5C06\u81EA\u52A8\u4ECE\u4E0A\u6E38\u4F1A\u8BDD\u5206\u53C9\u521B\u5EFA\u3002",
    "Connected via history fork; the session is forked automatically on first run."
  ],
  openingConversation: ["\u6B63\u5728\u6253\u5F00\u4F1A\u8BDD\u2026", "Opening conversation\u2026"],
  openNativeChat: ["\u5728\u539F\u751F\u5BF9\u8BDD\u4E2D\u6253\u5F00", "Open in native chat"],
  noMessages: ["\u542F\u52A8\u8FD0\u884C\u6216\u521B\u5EFA\u4F1A\u8BDD\u540E\uFF0C\u539F\u751F\u5BF9\u8BDD\u5C06\u5728\u6B64\u5904\u5C55\u5F00", "Start or create a session to chat here"],
  noEvents: ["\u8FD0\u884C\u540E\uFF0C\u5728\u8FD9\u91CC\u67E5\u770B\u6BCF\u8F6E\u6B65\u9AA4\u8F68\u8FF9", "Run an agent to inspect its execution steps here"],
  executionDetail: ["\u6267\u884C\u8BE6\u60C5", "Execution details"],
  pinDetail: ["\u51BB\u7ED3\u5F53\u524D\u5FEB\u7167", "Freeze snapshot"],
  unpinDetail: ["\u6062\u590D\u8DDF\u968F\u6700\u65B0", "Follow live"],
  context: ["\u4E0A\u4E0B\u6587", "Context"],
  addContext: ["\u6DFB\u52A0\u5F15\u7528", "Add reference"],
  reference: ["\u5F15\u7528", "Reference"],
  continuation: ["\u63A5\u7EED", "Continuation"],
  messagesLine: ["\u4EA4\u63A5\u5F80\u6765", "Exchanges"],
  refInput: ["\u5F15\u7528\u8F93\u5165", "Reference input"],
  refOutput: ["\u5F15\u7528\u8F93\u51FA", "Reference output"],
  contInput: ["\u63A5\u7EED\u5165\u53E3", "Continuation input"],
  contOutput: ["\u63A5\u7EED\u51FA\u53E3", "Continuation output"],
  quoteMessage: ["\u5F15\u51FA\u4E3A\u5C55\u793A\u8282\u70B9", "Extract as display node"],
  quoteSelection: ["\u5F15\u51FA\u9009\u4E2D\u6587\u5B57", "Extract selected text"],
  viewSource: ["\u5B9A\u4F4D\u6765\u6E90", "Locate source"],
  fixed: ["\u56FA\u5B9A\u5185\u5BB9", "Pinned"],
  follow: ["\u8DDF\u968F\u6700\u65B0", "Follow latest"],
  noOutput: ["\u7B49\u5F85\u6765\u6E90\u8F93\u51FA\u2026", "Waiting for source output\u2026"],
  pending: ["\u5F85\u53D1", "Pending"],
  sent: ["\u5DF2\u53D1", "Sent"],
  updated: ["\u6765\u6E90\u66F4\u65B0", "Updated"],
  always: ["\u59CB\u7EC8\u9644\u5E26", "Always include"],
  pendingTip: ["\u4E0B\u6B21\u53D1\u9001\u65F6\u9644\u5E26\u6B64\u5F15\u7528", "Included with the next prompt"],
  sentTip: ["\u5DF2\u53D1\u9001\uFF0C\u70B9\u51FB\u53EF\u91CD\u65B0\u9644\u5E26", "Already sent. Click to manage"],
  updatedTip: ["\u6765\u6E90\u5DF2\u66F4\u65B0\uFF0C\u4E0B\u6B21\u53D1\u9001\u65F6\u91CD\u65B0\u9644\u5E26", "Updated; included next time"],
  alwaysTip: ["\u6BCF\u6B21\u53D1\u9001\u90FD\u81EA\u52A8\u9644\u5E26", "Included with every turn"],
  mode: ["\u4F20\u9012\u5185\u5BB9", "Context mode"],
  conclusion: ["\u672C\u8F6E\u7ED3\u8BBA", "Conclusion"],
  session: ["\u4F1A\u8BDD\u5FEB\u7167", "Session text"],
  fork: ["\u5386\u53F2\u5206\u53C9", "Fork history"],
  conclusionDescription: ["\u4F20\u9012\u4E0A\u6E38\u6700\u540E\u4E00\u8F6E\u52A9\u624B\u7ED3\u8BBA", "Pass the upstream turn conclusion"],
  sessionDescription: ["\u4F20\u9012\u4E0A\u6E38\u5B8C\u6574\u7528\u6237\u4E0E\u52A9\u624B\u6587\u672C", "Pass user & assistant text snapshot"],
  forkDescription: ["\u4ECE\u4E0A\u6E38\u5DF2\u5B8C\u6210\u524D\u7F00\u5206\u53C9\u65B0\u4F1A\u8BDD", "Fork native session at completed turn"],
  draftOnly: ["\u76EE\u6807\u9700\u8981\u662F\u5C1A\u672A\u7ED1\u5B9A\u4F1A\u8BDD\u7684\u8349\u7A3F", "Target must be an unbound draft agent"],
  createdBy: ["\u9996\u6B21\u8FD0\u884C\u7531\u300C{mode}\u300D\u521B\u5EFA", "Created via {mode}"],
  trigger: ["\u89E6\u53D1\u65B9\u5F0F", "Trigger"],
  off: ["\u4E0D\u81EA\u52A8\u89E6\u53D1", "Reference only"],
  automatic: ["\u81EA\u52A8\u63A5\u7EED", "Automatic"],
  confirm: ["\u7B49\u5F85\u786E\u8BA4", "Confirm first"],
  release: ["\u653E\u884C", "Continue"],
  dismiss: ["\u8FD9\u6B21\u8DF3\u8FC7", "Skip"],
  waitingConfirmation: ["\u7B49\u5F85\u4F60\u7684\u786E\u8BA4", "Waiting for confirmation"],
  scopeBoundary: ["\u5DF2\u5230\u8FBE\u542F\u52A8\u8303\u56F4\u8FB9\u754C", "Reached run scope boundary"],
  waitingDescription: [
    "\u4E0A\u6E38\u5DF2\u5B8C\u6210\u5E76\u56FA\u5B9A\u5FEB\u7167\u3002\u653E\u884C\u540E\u5C06\u5E26\u7740\u8BE5\u7ED3\u679C\u63A8\u8FDB\u5F53\u524D\u4EFB\u52A1\u3002",
    "Upstream finished and captured. Continue to run with the captured result."
  ],
  approvalNeeded: ["\u7B49\u5F85\u5BA1\u6279\u6216\u56DE\u7B54", "Approval or answer needed"],
  approvalDescription: [
    "\u5F53\u524D\u4F1A\u8BDD\u6B63\u5728\u7B49\u5F85\u5DE5\u5177\u5BA1\u6279\u6216\u63D0\u95EE\u56DE\u7B54\uFF0C\u8BF7\u5728\u300C\u5BF9\u8BDD\u300D\u9875\u7B7E\u4E2D\u5904\u7406\u3002",
    "Session is awaiting tool approval or user input in the Conversation tab."
  ],
  openApprovalTab: ["\u5207\u5230\u5BF9\u8BDD\u5904\u7406", "Handle in Conversation"],
  maxRounds: ["\u5FAA\u73AF\u4E0A\u9650", "Max loop rounds"],
  rounds: ["{count} \u8F6E", "{count} rounds"],
  waypoint: ["\u4E2D\u7EE7\u70B9", "Waypoint"],
  addWaypoint: ["\u6DFB\u52A0\u4E2D\u7EE7\u70B9", "Add waypoint"],
  clearWaypoints: ["\u6E05\u9664\u4E2D\u7EE7\u70B9", "Clear waypoints"],
  removeWaypoint: ["\u79FB\u9664\u4E2D\u7EE7\u70B9", "Remove waypoint"],
  deleteConnection: ["\u5220\u9664\u8FDE\u7EBF", "Delete connection"],
  draft: ["\u8349\u7A3F", "Draft"],
  running: ["\u8FD0\u884C\u4E2D", "Running"],
  queued: ["\u6392\u961F\u4E2D", "Queued"],
  waiting: ["\u7B49\u4F60\u786E\u8BA4", "Needs confirm"],
  input: ["\u7B49\u5F85\u5BA1\u6279", "Input needed"],
  paused: ["\u5DF2\u6682\u505C", "Paused"],
  completed: ["\u5DF2\u5B8C\u6210", "Done"],
  done: ["\u5DF2\u5B8C\u6210", "Done"],
  interrupted: ["\u5F85\u6062\u590D", "Interrupted"],
  aborted: ["\u5DF2\u4E2D\u6B62", "Stopped"],
  cancelled: ["\u5DF2\u53D6\u6D88", "Cancelled"],
  error: ["\u5F02\u5E38", "Error"],
  pause: ["\u6682\u505C\u540E\u7EED", "Pause"],
  resume: ["\u7EE7\u7EED\u63A8\u8FDB", "Resume"],
  stop: ["\u4E2D\u6B62", "Stop"],
  cancelRun: ["\u53D6\u6D88\u8FD0\u884C", "Cancel run"],
  inspector: ["\u68C0\u67E5\u5668", "Inspector"],
  close: ["\u5173\u95ED", "Close"],
  name: ["\u540D\u79F0", "Name"],
  description: ["\u8BF4\u660E", "Description"],
  cancel: ["\u53D6\u6D88", "Cancel"],
  save: ["\u4FDD\u5B58", "Save"],
  delete: ["\u79FB\u9664", "Remove"],
  deleteNode: ["\u4ECE\u753B\u5E03\u79FB\u9664", "Remove from canvas"],
  removeKeepSession: ["\u79FB\u9664\u8282\u70B9\u4E0D\u4F1A\u5220\u9664 DSH \u4F1A\u8BDD\u5386\u53F2\u3002", "Removing a node keeps its DSH session."],
  rename: ["\u91CD\u547D\u540D", "Rename"],
  expand: ["\u5C55\u5F00\u5361\u7247", "Expand"],
  collapse: ["\u6536\u6210\u7CBE\u7B80\u5361", "Collapse"],
  openWindow: ["\u5F39\u51FA\u4E3A\u6D6E\u7A97", "Open in window"],
  returnCanvas: ["\u6536\u56DE\u753B\u5E03", "Return to canvas"],
  maximize: ["\u6700\u5927\u5316\u6D6E\u7A97", "Maximize"],
  restoreWindow: ["\u8FD8\u539F\u6D6E\u7A97", "Restore"],
  snapLeft: ["\u5438\u9644\u5230\u5DE6\u4FA7", "Snap left"],
  snapRight: ["\u5438\u9644\u5230\u53F3\u4FA7", "Snap right"],
  pin: ["\u56FA\u5B9A\u4F4D\u7F6E\u4E0E\u5C55\u5F00\u6001", "Pin position & size"],
  unpin: ["\u53D6\u6D88\u56FA\u5B9A", "Unpin"],
  inspect: ["\u6253\u5F00\u68C0\u67E5\u5668", "Inspect"],
  participation: ["\u53C2\u4E0E\u65B9\u5F0F", "Participation"],
  global: ["\u53C2\u4E0E\u5168\u5C40\u4E0E\u5206\u7EC4\u5DE5\u4F5C\u6D41", "Include in workflow"],
  manual: ["\u4EC5\u624B\u52A8\u542F\u52A8\u6216\u653E\u884C", "Manual start only"],
  pausedParticipation: ["\u6682\u505C\u53C2\u4E0E\uFF08\u6682\u65F6\u8DF3\u8FC7\uFF09", "Paused (skip)"],
  nativeTriggerLabel: ["\u539F\u751F\u5BF9\u8BDD\u89E6\u53D1\u63A5\u7EED", "Continue from native chat"],
  inheritGlobal: ["\u7EE7\u627F\u5168\u5C40\uFF08{state}\uFF09", "Use global ({state})"],
  enabled: ["\u5F00\u542F", "On"],
  disabled: ["\u5173\u95ED", "Off"],
  rerunRule: ["\u91CD\u590D\u542F\u52A8\u7B56\u7565", "Rerun rule"],
  onInput: ["\u6709\u65B0\u8349\u7A3F\u8F93\u5165\u65F6", "When new draft exists"],
  onUpdate: ["\u5F15\u7528\u5185\u5BB9\u66F4\u65B0\u65F6", "When references update"],
  everyRun: ["\u6BCF\u6B21\u5168\u5C40\u542F\u52A8\u90FD\u8FD0\u884C", "Every workflow launch"],
  groupSelection: ["\u7F16\u7EC4\u5DE5\u4F5C\u6D41 (G)", "Group workflow (G)"],
  groupNeedSelection: ["\u8BF7\u6309\u4F4F Shift \u9009\u62E9\u81F3\u5C11 2 \u4E2A\u8282\u70B9\u540E\u518D\u7F16\u7EC4", "Select at least 2 nodes to group"],
  nestedLimit: ["\u5206\u7EC4\u6700\u591A\u652F\u6301\u4E24\u5C42\u5D4C\u5957", "Groups support at most 2 nesting levels"],
  groupSettings: ["\u5DE5\u4F5C\u6D41\u5206\u7EC4", "Workflow group"],
  groupColor: ["\u5206\u7EC4\u5F3A\u8C03\u8272", "Accent color"],
  violet: ["\u661F\u4E91\u7D2B", "Violet"],
  teal: ["\u9752\u78A7", "Teal"],
  blue: ["\u6674\u7A7A\u84DD", "Blue"],
  amber: ["\u7425\u73C0\u91D1", "Amber"],
  ports: ["\u6298\u53E0\u4EE3\u7406\u7AEF\u53E3", "Composite proxy ports"],
  portName: ["\u7AEF\u53E3\u540D\u79F0", "Port name"],
  inputPort: ["\u5165\u53E3", "Input"],
  outputPort: ["\u51FA\u53E3", "Output"],
  reorderUp: ["\u4E0A\u79FB", "Move up"],
  hidePort: ["\u9690\u85CF\u6216\u663E\u793A\u7AEF\u53E3", "Toggle port visibility"],
  mergePorts: ["\u5408\u5E76\u5165\u53E3\u7AEF\u53E3\u2026", "Merge input ports\u2026"],
  ungroup: ["\u89E3\u6563\u5206\u7EC4\uFF08\u4FDD\u7559\u8282\u70B9\uFF09", "Ungroup (keep nodes)"],
  saveTemplate: ["\u4FDD\u5B58\u4E3A\u5DE5\u4F5C\u6D41\u6A21\u677F", "Save as template"],
  syncTemplate: ["\u6309\u6A21\u677F\u540C\u6B65\u2026", "Sync with template\u2026"],
  saveNewVersion: ["\u66F4\u65B0\u6A21\u677F\u7248\u672C", "Save new template version"],
  detachTemplate: ["\u89E3\u9664\u6A21\u677F\u5173\u8054", "Detach from template"],
  templateLinked: ["\u6A21\u677F v{version}", "Template v{version}"],
  workflowLibrary: ["\u5DE5\u4F5C\u6D41\u4E0E\u72B6\u6001\u5E93", "Workflows & snapshots"],
  libraryDescription: [
    "\u4ECE\u6210\u719F\u7684\u591A Agent \u534F\u4F5C\u8303\u5F0F\u8D77\u6B65\uFF0C\u6216\u5C06\u753B\u5E03\u4E0A\u7684\u5DE5\u4F5C\u6D41\u4FDD\u5B58\u4E3A\u53EF\u7248\u672C\u5316\u540C\u6B65\u7684\u6A21\u677F\u4E0E\u72B6\u6001\u5FEB\u7167\u3002",
    "Start from multi-agent workflow patterns, or save your own reusable templates and canvas state snapshots."
  ],
  builtIn: ["\u5185\u7F6E\u5DE5\u4F5C\u6D41\u8303\u5F0F", "Built-in patterns"],
  mine: ["\u6211\u7684\u6A21\u677F", "My templates"],
  snapshots: ["\u72B6\u6001\u5FEB\u7167", "Snapshots"],
  useTemplate: ["\u6DFB\u52A0\u5230\u753B\u5E03", "Add to canvas"],
  previewTemplate: ["\u9884\u89C8\u7ED3\u6784", "Preview"],
  nodesCount: ["{count} \u4E2A\u8282\u70B9", "{count} nodes"],
  noTemplates: ["\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u6A21\u677F", "No custom templates yet"],
  noTemplatesDescription: [
    "\u5728\u753B\u5E03\u4E2D\u6846\u9009\u591A\u4E2A\u8282\u70B9\u6309 G \u7F16\u7EC4\uFF0C\u5373\u53EF\u5728\u68C0\u67E5\u5668\u4E2D\u4FDD\u5B58\u4E3A\u53EF\u590D\u7528\u6A21\u677F\u3002",
    "Group nodes with G on the canvas, then save the group as a reusable template."
  ],
  saveSnapshot: ["\u4FDD\u5B58\u72B6\u6001", "Save snapshot"],
  snapshotDescription: [
    "\u4FDD\u5B58\u5F53\u524D\u753B\u5E03\u5E03\u5C40\u3001\u8349\u7A3F\u4E0E\u6700\u8FD1\u8F93\u51FA\u6458\u8981\u3002\u6062\u590D\u5FEB\u7167\u65F6\u4E0D\u4F1A\u81EA\u52A8\u91CD\u653E\u4EFB\u4F55\u5DF2\u53D1\u9001\u63D0\u793A\u8BCD\u3002",
    "Save layout, drafts and recent output summaries. Restoring never replays prompts."
  ],
  restoreSnapshot: ["\u6062\u590D\u6B64\u72B6\u6001", "Restore snapshot"],
  noSnapshots: ["\u8FD8\u6CA1\u6709\u4FDD\u5B58\u72B6\u6001\u5FEB\u7167", "No snapshots saved yet"],
  noSnapshotsDescription: [
    "\u70B9\u51FB\u9876\u680F\u300C\u4FDD\u5B58\u72B6\u6001\u300D\uFF0C\u968F\u65F6\u4E3A\u5B9E\u9A8C\u5206\u652F\u5E03\u5C40\u548C\u8349\u7A3F\u7559\u5B58\u68C0\u67E5\u70B9\u3002",
    "Use Save snapshot in the top bar before rearranging or experimenting."
  ],
  snapshotSaved: ["\u72B6\u6001\u5FEB\u7167\u5DF2\u4FDD\u5B58", "Snapshot saved"],
  snapshotRestored: ["\u5DF2\u6062\u590D\u753B\u5E03\u5FEB\u7167\uFF08\u5728\u9014\u8FD0\u884C\u5DF2\u505C\u6B62\uFF0C\u4E0D\u4F1A\u91CD\u653E\u63D0\u793A\u8BCD\uFF09", "Snapshot restored without replaying prompts"],
  templateSaved: ["\u5DE5\u4F5C\u6D41\u6A21\u677F\u5DF2\u4FDD\u5B58", "Workflow template saved"],
  templateAdded: ["\u5DE5\u4F5C\u6D41\u5DF2\u6DFB\u52A0\u5230\u753B\u5E03", "Workflow added to canvas"],
  templateSynced: ["\u5DF2\u6309\u6A21\u677F\u539F\u5730\u540C\u6B65", "Workflow synced with template"],
  groupCreated: ["\u5DF2\u521B\u5EFA\u5DE5\u4F5C\u6D41\u5206\u7EC4", "Workflow group created"],
  nodeCreated: ["\u8282\u70B9\u5DF2\u521B\u5EFA", "Node created"],
  copied: ["\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F", "Copied to clipboard"],
  implementationReview: ["\u5206\u6790 \u2192 \u5BA1\u67E5 \u2192 \u6C47\u603B\u4EA4\u4ED8", "Analyze \u2192 Review \u2192 Deliver"],
  implementationReviewDescription: [
    "\u4E0A\u6E38\u5206\u6790\u67B6\u6784\u4E0E\u95EE\u9898\uFF0C\u4E2D\u6E38\u72EC\u7ACB\u5BA1\u67E5\u53EF\u884C\u6027\u4E0E\u98CE\u9669\uFF0C\u4EBA\u5DE5\u786E\u8BA4\u653E\u884C\u540E\u6574\u7406\u6700\u7EC8\u884C\u52A8\u6E05\u5355\u3002",
    "Analyze first, review independently, then pause for your confirmation before producing the delivery checklist."
  ],
  parallelResearch: ["\u4E24\u8DEF\u5E76\u884C\u63A2\u7D22 \u2192 \u6C47\u603B\u7ED3\u8BBA", "Parallel exploration \u2192 Synthesis"],
  parallelResearchDescription: [
    "\u4E24\u4E2A\u7CBE\u7B80 Agent \u540C\u65F6\u4ECE\u67B6\u6784\u4E0E\u9A8C\u8BC1\u4E24\u4E2A\u7EF4\u5EA6\u8C03\u67E5\uFF0C\u5168\u90E8\u5B8C\u6210\u540E\u81EA\u52A8\u6C47\u5408\u5230\u603B\u7ED3 Agent\u3002",
    "Two parallel agents investigate architecture and testing simultaneously, joining into one synthesis agent."
  ],
  releaseWorkflow: ["\u6574\u7406\u53D8\u66F4\u8BF4\u660E \u2192 \u53CC\u8BED\u6821\u5BF9", "Release notes \u2192 Bilingual review"],
  releaseWorkflowDescription: [
    "\u6574\u7406\u672C\u8F6E\u65B0\u589E\u3001\u6539\u8FDB\u4E0E\u4FEE\u590D\u8BF4\u660E\uFF0C\u786E\u8BA4\u65E0\u8BEF\u540E\u4EA4\u7531\u4E0B\u6E38\u6838\u5BF9\u683C\u5F0F\u3001\u547D\u4EE4\u4E0E\u53CC\u8BED\u8868\u8FBE\u3002",
    "Draft structured release notes, confirm, then verify commands, links and bilingual phrasing."
  ],
  activityDescription: [
    "\u6BCF\u6B21\u542F\u52A8\u805A\u5408\u4E3A\u4E00\u5F20\u8FD0\u884C\u603B\u89C8\u5361\uFF1A\u76F4\u89C2\u67E5\u770B\u5B8C\u6210\u8FDB\u5EA6\u3001\u5F53\u524D\u5361\u70B9\u3001\u6355\u83B7\u4E0A\u4E0B\u6587\u4E0E\u6BCF\u4E00\u6B65\u6267\u884C\u65F6\u95F4\u7EBF\u3002",
    "One card per workflow launch: completion ring, step pipeline, active gates, outputs and full timeline."
  ],
  allRuns: ["\u5168\u90E8\u8FD0\u884C", "All runs"],
  outputsTab: ["\u7ED3\u679C\u4E0E\u5C55\u793A\u5361", "Outputs & displays"],
  waitingTab: ["\u5F85\u786E\u8BA4\u4E0E\u5BA1\u6279", "Waiting & approvals"],
  noActivity: ["\u8FD8\u6CA1\u6709\u8FD0\u884C\u8BB0\u5F55", "No workflow runs yet"],
  noActivityDescription: [
    "\u542F\u52A8\u4EFB\u610F Agent \u6216\u5DE5\u4F5C\u6D41\u540E\uFF0C\u5B9E\u65F6\u8FDB\u5EA6\u4E0E\u63A5\u7EED\u8F68\u8FF9\u5C06\u663E\u793A\u5728\u8FD9\u91CC\u3002",
    "Start an agent or workflow to track live steps and continuations here."
  ],
  noOutputs: ["\u8FD8\u6CA1\u6709\u63D0\u53D6\u7ED3\u679C\u6216\u8FD0\u884C\u8F93\u51FA", "No outputs yet"],
  noWaiting: ["\u5F53\u524D\u6CA1\u6709\u7B49\u5F85\u5904\u7406\u7684\u786E\u8BA4\u6216\u5BA1\u6279", "Nothing waiting on you"],
  runTypeGlobal: ["\u5168\u5C40\u542F\u52A8", "Global launch"],
  runTypeGroup: ["\u5DE5\u4F5C\u6D41\u8FD0\u884C", "Workflow run"],
  runTypeSelection: ["\u9009\u533A\u8FD0\u884C", "Selection run"],
  runTypeChat: ["\u539F\u751F\u5BF9\u8BDD\u89E6\u53D1", "Native chat"],
  stepsDone: ["{done}/{total} \u6B65\u5DF2\u5B8C\u6210", "{done}/{total} steps done"],
  stepPending: ["\u5F85\u89E6\u53D1", "Pending"],
  stepQueued: ["\u6392\u961F\u4E2D", "Queued"],
  stepStopped: ["\u5DF2\u505C\u6B62", "Stopped"],
  runAllDone: ["\u5168\u90E8\u6B65\u9AA4\u5DF2\u5B8C\u6210", "All steps completed"],
  runNextStep: ["\u6B63\u5728\u63A8\u8FDB\uFF1A{name}", "Active: {name}"],
  runTimeline: ["\u6267\u884C\u65F6\u95F4\u7EBF \xB7 {count} \u6B65", "Timeline \xB7 {count} steps"],
  runBlockedBy: ["\u505C\u5728\u300C{name}\u300D\uFF1A{reason}", "Waiting at \u201C{name}\u201D: {reason}"],
  locate: ["\u5B9A\u4F4D\u8282\u70B9", "Locate"],
  appearance: ["\u5916\u89C2\u4E0E\u8BED\u8A00", "Appearance & language"],
  theme: ["\u754C\u9762\u4E3B\u9898", "Theme"],
  dark: ["\u77F3\u58A8\u6DF1\u8272", "Dark"],
  light: ["\u6D45\u8272\u5DE5\u4F5C\u9762", "Light"],
  followHost: ["\u8DDF\u968F\u5BBF\u4E3B", "Follow DSH"],
  language: ["\u754C\u9762\u8BED\u8A00", "Language"],
  chinese: ["\u7B80\u4F53\u4E2D\u6587", "\u4E2D\u6587"],
  english: ["English", "English"],
  interaction: ["\u753B\u5E03\u4E0E\u4EA4\u4E92", "Canvas & interaction"],
  wheelBehavior: ["\u6EDA\u8F6E\u9ED8\u8BA4\u624B\u52BF", "Mouse wheel"],
  zoom: ["\u7F29\u653E\u753B\u5E03", "Zoom"],
  pan: ["\u5E73\u79FB\u753B\u5E03", "Pan"],
  snapGrid: ["\u62D6\u52A8\u65F6\u5438\u9644\u7F51\u683C (12px)", "Snap nodes to 12px grid"],
  reducedMotion: ["\u51CF\u5F31\u52A8\u6548", "Reduce motion"],
  reducedMotionDescription: [
    "\u5173\u95ED\u6D41\u5149\u3001\u6781\u5149\u4E0E\u5F39\u7C27\u8FC7\u6E21\uFF0C\u4FDD\u7559\u5168\u90E8\u72B6\u6001\u989C\u8272\u3001\u56FE\u6807\u4E0E\u6587\u6848\u4FE1\u606F\u3002",
    "Disable ambient aurora, wire flow and spring transitions while keeping all state indicators."
  ],
  orchestration: ["\u5BBF\u4E3B\u7F16\u6392", "Host orchestration"],
  nativeChatTriggers: [
    "\u539F\u751F\u5BF9\u8BDD\u9ED8\u8BA4\u89E6\u53D1\u4E0B\u6E38\u63A5\u7EED",
    "Native chat starts downstream continuations by default"
  ],
  nativeChatTriggersDescription: [
    "\u5728 DSH \u539F\u751F\u804A\u5929\u9875\u53D1\u9001\u6D88\u606F\u65F6\u81EA\u52A8\u63A8\u8FDB\u753B\u5E03\u63A5\u7EED\u7EBF\uFF1B\u5355\u4E2A Agent \u53EF\u72EC\u7ACB\u8986\u76D6\u3002",
    "Prompts sent in DSH native chat trigger canvas continuations unless overridden on the node."
  ],
  data: ["\u753B\u5E03\u6570\u636E\u4E0E\u8D77\u624B\u5F0F", "Data & starter workflows"],
  exportCanvas: ["\u5BFC\u51FA\u753B\u5E03 JSON", "Export canvas JSON"],
  importCanvas: ["\u5BFC\u5165\u753B\u5E03 JSON", "Import canvas JSON"],
  download: ["\u5BFC\u51FA\u6587\u4EF6", "Download"],
  import: ["\u9009\u62E9\u6587\u4EF6\u2026", "Choose file\u2026"],
  loadStarter: ["\u6DFB\u52A0\u4E09\u6B65\u5BA1\u67E5\u8D77\u624B\u5DE5\u4F5C\u6D41", "Add 3-step review workflow"],
  loadStarterDescription: [
    "\u5728\u753B\u5E03\u7A7A\u767D\u5904\u653E\u5165\u4E00\u5957\u53EF\u76F4\u63A5\u8FD0\u884C\u7684\u300C\u5206\u6790 \u2192 \u5BA1\u67E5 \u2192 \u6C47\u603B\u300D\u4E09\u6B65\u5DE5\u4F5C\u6D41\uFF0C\u4E0D\u5F71\u54CD\u5DF2\u6709\u4F1A\u8BDD\u3002",
    "Insert a ready-to-run Analyze \u2192 Review \u2192 Deliver workflow beside existing nodes."
  ],
  selectObject: ["\u9009\u62E9\u8282\u70B9\u3001\u5206\u7EC4\u6216\u8FDE\u7EBF", "Select a node, group or wire"],
  selectObjectDescription: [
    "\u5728\u8FD9\u91CC\u67E5\u770B\u548C\u8C03\u6574 Agent \u53C2\u4E0E\u65B9\u5F0F\u3001\u63A5\u7EED\u6A21\u5F0F\u3001\u5FAA\u73AF\u4E0A\u9650\u3001\u5206\u7EC4\u989C\u8272\u4E0E\u4EE3\u7406\u7AEF\u53E3\u3002",
    "Inspect and configure agent participation, continuation mode, loop bounds, group colors and proxy ports."
  ],
  pointer: ["\u9009\u62E9\u5DE5\u5177 (V)", "Select tool (V)"],
  hand: ["\u6293\u624B\u5E73\u79FB (H)", "Hand pan (H)"],
  undo: ["\u64A4\u9500 (Ctrl+Z)", "Undo (Ctrl+Z)"],
  redo: ["\u91CD\u505A (Ctrl+Shift+Z)", "Redo (Ctrl+Shift+Z)"],
  tidy: ["\u62D3\u6251\u6574\u7406\u5E03\u5C40", "Tidy layout"],
  fitView: ["\u9002\u5E94\u89C6\u56FE (F)", "Fit view (F)"],
  minimap: ["\u5C0F\u5730\u56FE", "Minimap"],
  help: ["\u5FEB\u6377\u952E\u4E0E\u8FDE\u7EBF\u56FE\u4F8B", "Shortcuts & wire legend"],
  doubleClickTip: ["\u53CC\u51FB\u7A7A\u767D\u65B0\u5EFA Agent", "Double-click to create agent"],
  rangeSelection: ["\u6846\u9009\u4E0E\u591A\u9009", "Marquee / multi-select"],
  waitingCount: ["{count} \u9879\u5F85\u5904\u7406", "{count} waiting"],
  locateWaiting: ["\u5B9A\u4F4D\u5F85\u5904\u7406\u8282\u70B9", "Locate waiting node"],
  launchNow: ["\u7ACB\u5373\u542F\u52A8", "Start now"],
  launchNext: ["\u968F\u540E\u63A5\u7EED", "Then continue"],
  launchConfirm: ["\u7B49\u4F60\u786E\u8BA4", "Needs your go-ahead"],
  launchNone: ["\u8FD9\u6B21\u4E0D\u8FD0\u884C", "Not in this run"],
  afterStep: ["\u5728\u300C{name}\u300D\u5B8C\u6210\u540E", "After \u201C{name}\u201D"],
  keyboardHint: ["\u5FEB\u6377\u952E\u4E0E\u8FDE\u7EBF\u8BED\u4E49", "Shortcuts & wire legend"],
  helpDescription: [
    "\u6BCF\u4E2A Agent \u8282\u70B9\u7ED1\u5B9A\u771F\u5B9E\u7684\u6301\u4E45\u5316 DSH Session\u3002\u5DE5\u4F5C\u6D41\u8C03\u5EA6\u9A7B\u7559\u5728\u5BBF\u4E3B\uFF0C\u64A4\u9500\u7EDD\u4E0D\u91CD\u653E\u63D0\u793A\u8BCD\u3002",
    "Every Agent node binds a real persistent DSH Session. Scheduling runs in the Host; undo never replays prompts."
  ],
  legendContinuation: [
    "\u63A5\u7EED\u7EBF\uFF08\u6807\u9898\u680F\u7BAD\u5934\u53E3\uFF09\uFF1A\u63A8\u8FDB\u4E0B\u6E38\u4EFB\u52A1\uFF0C\u652F\u6301\u7ED3\u8BBA / \u5FEB\u7167 / \u5206\u53C9\u4E0E\u786E\u8BA4\u95E8\u63A7",
    "Continuation wire (header arrow port): advances tasks with conclusion, snapshot or fork"
  ],
  legendReference: [
    "\u5F15\u7528\u7EBF\uFF08\u4E0B\u65B9\u5706\u73AF\u53E3\uFF09\uFF1A\u4EC5\u6CE8\u5165\u53EA\u8BFB\u4E0A\u4E0B\u6587\u8D44\u6599\uFF0C\u7EDD\u4E0D\u81EA\u52A8\u542F\u52A8\u5BF9\u65B9",
    "Reference wire (lower circle port): supplies read-only context, never triggers execution"
  ],
  legendExchange: [
    "\u4EA4\u63A5\u7EBF\uFF08\u53CC\u80A1\u5F27\u7EBF\uFF09\uFF1A\u5C55\u793A\u5DF2\u4F20\u9012\u7684\u63A5\u7EED\u5FEB\u7167\u5F80\u6765\uFF0C\u53EA\u8BFB\u53EF\u63D0\u53D6",
    "Exchange arc (bowed\u96D9strand): visualizes captured handoff turns between agents"
  ],
  legendDisplay: [
    "\u5C55\u793A\u6E90\u7EBF\uFF08\u7C89\u8272\u70B9\u7EBF\uFF09\uFF1A\u8FDE\u63A5\u5C55\u793A/\u8BE6\u60C5\u5361\u4E0E\u5176\u4E0A\u6E38\u6765\u6E90\uFF0C\u652F\u6301\u56FA\u5B9A\u6216\u8DDF\u968F\u6700\u65B0",
    "Display link (pink dotted): links an extracted display/detail card to its source"
  ],
  filesDescription: ["\u52FE\u9009\u6216\u8F93\u5165\u5DE5\u4F5C\u533A\u76F8\u5BF9\u8DEF\u5F84\u4F5C\u4E3A\u4E0A\u4E0B\u6587\u5F15\u7528", "Select or enter workspace file paths"],
  filePathPlaceholder: ["\u8F93\u5165\u5DE5\u4F5C\u533A\u8DEF\u5F84\uFF0C\u5982 README.md\uFF0C\u56DE\u8F66\u6DFB\u52A0\u2026", "Workspace path e.g. README.md, Enter to add\u2026"],
  selectedCount: ["\u5DF2\u9009 {count} \u9879", "{count} selected"],
  filesCount: ["{count} \u4E2A\u6587\u4EF6", "{count} files"],
  openFile: ["\u9884\u89C8\u6587\u4EF6\u5185\u5BB9", "Preview file"],
  lineCount: ["{count} \u884C", "{count} lines"],
  copy: ["\u590D\u5236\u5185\u5BB9", "Copy"],
  notePlaceholder: ["\u5728\u8FD9\u91CC\u8BB0\u5F55\u8BBE\u8BA1\u7EA6\u675F\u3001\u9A8C\u6536\u6807\u51C6\u6216\u63D0\u793A\u8BCD\u7247\u6BB5\u2026", "Write constraints, acceptance criteria or notes\u2026"],
  todo: ["\u5F85\u529E", "To do"],
  inProgress: ["\u8FDB\u884C\u4E2D", "In progress"],
  completedColumn: ["\u5B8C\u6210", "Done"],
  addCard: ["\u6DFB\u52A0\u5361\u7247", "Add card"],
  editCard: ["\u7F16\u8F91\u5361\u7247", "Edit card"],
  deleteCard: ["\u5220\u9664\u5361\u7247", "Delete card"],
  nextColumn: ["\u79FB\u81F3\u4E0B\u4E00\u5217", "Move to next column"],
  syncDialogDescription: [
    "\u6309\u6A21\u677F\u6700\u65B0\u7248\u672C\u539F\u5730\u66F4\u65B0\u6B64\u5DE5\u4F5C\u6D41\u7ED3\u6784\uFF1A\u5DF2\u6709\u8282\u70B9\u8EAB\u4EFD\u3001DSH \u4F1A\u8BDD\u7ED1\u5B9A\u548C\u8DE8\u8FB9\u754C\u8FDE\u7EBF\u5747\u5B8C\u6574\u4FDD\u7559\u3002",
    "Update this workflow in place from its template while keeping node identities, DSH sessions and external wires."
  ],
  syncStructure: ["\u66F4\u65B0\u5206\u7EC4\u5185\u90E8\u7ED3\u6784\u4E0E\u8FDE\u7EBF", "Update internal layout and wiring"],
  syncOutsideKept: ["\u4FDD\u7559 {count} \u6761\u8DE8\u8FB9\u754C\u8FDE\u7EBF", "Keep {count} external connections"],
  syncRunKept: ["\u4FDD\u7559 {count} \u4E2A\u5DF2\u7ED1\u5B9A\u4F1A\u8BDD\u7684 Agent", "Keep {count} bound agent sessions"],
  syncAdded: ["\u65B0\u589E {count} \u4E2A\u6A21\u677F\u8282\u70B9", "Add {count} new template nodes"],
  syncRemoved: ["\u79FB\u9664 {count} \u4E2A\u6A21\u677F\u5DF2\u5220\u8282\u70B9", "Remove {count} dropped nodes"],
  syncEdited: ["\u4EFB\u52A1\u5DF2\u88AB\u4F60\u4FEE\u6539", "Task customized"],
  syncKeepMine: ["\u540C\u6B65\uFF0C\u4FDD\u7559\u6211\u6539\u8FC7\u7684\u4EFB\u52A1", "Sync & keep my tasks"],
  syncUseTemplate: ["\u540C\u6B65\uFF0C\u91C7\u7528\u6A21\u677F\u4EFB\u52A1", "Sync & use template tasks"],
  snapDrafts: ["{count} \u4E2A\u8349\u7A3F", "{count} drafts"],
  snapInterrupted: ["{count} \u4E2A\u8FD0\u884C\u6062\u590D\u65F6\u505C\u6B62", "{count} active stop on restore"],
  snapWaiting: ["{count} \u9879\u5F85\u786E\u8BA4", "{count} awaiting confirm"],
  snapQueued: ["{count} \u6B65\u6392\u961F\u4E2D", "{count} queued"],
  welcomeEyebrow: ["DEEPSEEK HARNESS \xB7 PERSISTENT AGENT CANVAS", "DEEPSEEK HARNESS \xB7 PERSISTENT AGENT CANVAS"],
  welcomeTitle: ["\u628A\u591A Agent \u534F\u4F5C\u653E\u4E0A\u540C\u4E00\u5F20\u5DE5\u4F5C\u53F0", "Put multi-agent workflows on one live canvas"],
  welcomeDescription: [
    "\u6BCF\u4E2A\u8282\u70B9\u90FD\u662F\u771F\u5B9E\u7684\u6301\u4E45\u5316 DSH \u4F1A\u8BDD\u3002\u7528\u5706\u73AF\u5F15\u7528\u53E3\u6CE8\u5165\u6587\u4EF6\u4E0E\u4FBF\u7B7E\uFF0C\u7528\u7BAD\u5934\u63A5\u7EED\u53E3\u4E32\u8054\u5206\u6790\u3001\u5BA1\u67E5\u3001\u5E76\u884C\u63A2\u7D22\u4E0E\u4EBA\u5DE5\u653E\u884C\u3002",
    "Every card is a real persistent DSH session. Wire files and notes into reference ports, and chain analysis, review and confirmation gates through continuation ports."
  ],
  startWithReview: ["\u8F7D\u5165\u300C\u5206\u6790 \u2192 \u5BA1\u67E5 \u2192 \u6C47\u603B\u300D\u4E09\u6B65\u5DE5\u4F5C\u6D41", "Load \u201CAnalyze \u2192 Review \u2192 Deliver\u201D workflow"],
  startWithParallel: ["\u8F7D\u5165\u300C\u4E24\u8DEF\u63A2\u7D22 \u2192 \u6C47\u603B\u300D\u5E76\u884C\u5DE5\u4F5C\u6D41", "Load \u201CParallel exploration \u2192 Synthesis\u201D"],
  noSearchResults: ["\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9\u3001\u6587\u4EF6\u6216\u547D\u4EE4", "No matching nodes, files or commands"],
  noExistingSessions: ["\u5F53\u524D\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u5176\u4ED6 DSH \u4F1A\u8BDD", "No other DSH sessions available to add"],
  exchange: ["\u63A5\u7EED\u4E0A\u4E0B\u6587\u5F80\u6765", "Continuation exchange"],
  exchangeReadOnly: ["\u5C55\u793A\u8FD0\u884C\u8FC7\u7A0B\u4E2D\u5B9E\u9645\u6355\u83B7\u5E76\u6295\u9012\u7684\u4E0A\u4E0B\u6587\u5FEB\u7167\uFF0C\u53EA\u8BFB\u3002", "Captured context snapshots delivered across runs (read-only)."],
  roundBadge: ["\u7B2C {round} \u8F6E", "Round {round}"],
  role_implementation: ["\u5B9E\u73B0", "Build"],
  role_review: ["\u5BA1\u67E5", "Review"],
  role_delivery: ["\u4EA4\u4ED8", "Deliver"],
  "\u5728 FlowSpace \u4E2D\u67E5\u770B\u548C\u8BBE\u7F6E\u63A5\u7EED": [
    "\u5728 FlowSpace \u4E2D\u67E5\u770B\u548C\u8BBE\u7F6E\u63A5\u7EED",
    "View and configure continuations in FlowSpace"
  ],
  \u5F00\u542F: ["\u5F00\u542F", "On"],
  \u5173\u95ED: ["\u5173\u95ED", "Off"],
  \u63A5\u7EED: ["\u63A5\u7EED", "Continuation"]
};
function t(key, values) {
  const pair = dict[key];
  let text = pair ? pair[getLanguage() === "en" ? 1 : 0] : key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
var legacyEn = {
  "\u6B63\u5728\u8FD0\u884C": "Already running",
  "\u7B49\u5F85\u786E\u8BA4": "Waiting for confirmation",
  "\u5C1A\u672A\u586B\u5199\u4EFB\u52A1": "No task yet",
  "\u6682\u505C\u53C2\u4E0E": "Participation paused",
  "\u4EC5\u624B\u52A8\u542F\u52A8": "Manual start only",
  "\u6CA1\u6709\u65B0\u8F93\u5165": "No new input",
  "\u4E0A\u6E38\u4ECD\u5728\u8FD0\u884C\u6216\u7B49\u5F85\u786E\u8BA4": "Upstream still running or awaiting confirmation",
  "\u5728 FlowSpace \u4E2D\u67E5\u770B\u548C\u8BBE\u7F6E\u63A5\u7EED": "View and configure continuations in FlowSpace",
  \u63A5\u7EED: "Continuation ",
  \u5F00\u542F: "On",
  \u5173\u95ED: "Off"
};
function tr(text) {
  if (getLanguage() === "zh") return text;
  if (dict[text]) return dict[text][1];
  return legacyEn[text] ?? text;
}

// packages/flowspace/src/client/index.tsx
var import_react5 = require("react");

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.js
var import_react2 = require("react");

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.js
var import_react = require("react");

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.js
var Icon = (0, import_react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => {
    return (0, import_react.createElement)(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: mergeClasses("lucide", className),
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component = (0, import_react2.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
      ...props
    })
  );
  Component.displayName = `${iconName}`;
  return Component;
};

// node_modules/.pnpm/lucide-react@0.468.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/workflow.js
var Workflow = createLucideIcon("Workflow", [
  ["rect", { width: "8", height: "8", x: "3", y: "3", rx: "2", key: "by2w9f" }],
  ["path", { d: "M7 11v4a2 2 0 0 0 2 2h4", key: "xkn7yn" }],
  ["rect", { width: "8", height: "8", x: "13", y: "13", rx: "2", key: "1cgmvn" }]
]);

// packages/flowspace/lib/typert.remote-client.js
var import_zod = require("zod");

// node_modules/.pnpm/@deepseek-ai+dsh-typert-pro_2f8178087ff5b29d6de54290762a244a/node_modules/@deepseek-ai/dsh-typert-protocol/lib/types/remote-info.js
function createTypertRemoteInfo(spec, zod) {
  return new RemoteInfo(spec, zod);
}
var RemoteInfo = class {
  spec;
  zod;
  index;
  constructor(spec, zod) {
    this.spec = spec;
    this.zod = zod;
  }
  get package() {
    return this.spec.package;
  }
  get descriptors() {
    return this.resolve().descriptors;
  }
  get methods() {
    return this.resolve().methods;
  }
  resolve() {
    if (this.index !== void 0)
      return this.index;
    const zod = this.zod;
    const descriptors = [];
    const methods = /* @__PURE__ */ Object.create(null);
    for (const [endpoint2, definition] of Object.entries(this.spec.methods)) {
      const separator = endpoint2.indexOf("/");
      const namespace = endpoint2.slice(0, separator);
      const method = endpoint2.slice(separator + 1);
      const parameters = definition.parameters.map((parameter) => ({ ...parameter, wire: parameter.wire ?? parameter.name }));
      const descriptor = {
        ...definition,
        id: `${this.spec.package}#${endpoint2}`,
        namespace,
        method,
        parameters,
        result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
      };
      if (definition.invocation.kind === "direct") {
        const inputs = [];
        const direct = Object.assign(descriptor, {
          input(options) {
            const strict = options?.strict === true;
            return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
          },
          invoke(remote, input, signal) {
            const named = input;
            const values = parameters.map((parameter) => named[parameter.wire]);
            if (definition.cancellation !== void 0)
              values.push(signal);
            const receiver = Reflect.get(remote, namespace);
            const call = Reflect.get(receiver, method);
            return call.apply(receiver, values);
          }
        });
        methods[endpoint2] = direct;
      }
      descriptors.push(descriptor);
    }
    return this.index = { descriptors, methods };
  }
};
function optional(parameter) {
  return parameter.source === "json" && parameter.acceptsUndefined === true;
}
var NamedInput = class {
  parameters;
  strict;
  zod;
  schema;
  projection;
  constructor(parameters, strict, zod) {
    this.parameters = parameters;
    this.strict = strict;
    this.zod = zod;
  }
  codec(parameter) {
    return this.strict ? parameter.strictCodec : parameter.codec;
  }
  create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
    const value2 = this.codec(parameter).create();
    return [parameter.wire, optional(parameter) ? value2.optional() : value2.nonoptional()];
  })));
  get jsonSchema() {
    return this.project().jsonSchema;
  }
  get jsonSchemaError() {
    return this.project().jsonSchemaError;
  }
  project() {
    if (this.projection !== void 0)
      return this.projection;
    const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
    if (unavailable !== void 0) {
      return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
    }
    return this.projection = {
      jsonSchema: {
        type: "object",
        properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
          ...this.codec(parameter).jsonSchema,
          ...parameter.description === void 0 ? {} : { description: parameter.description }
        }])),
        required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
        additionalProperties: false
      }
    };
  }
};
var ResultValue = class {
  spec;
  projection;
  constructor(spec) {
    this.spec = spec;
  }
  get mode() {
    return this.spec.mode;
  }
  get typeSymbol() {
    return this.spec.typeSymbol;
  }
  get create() {
    return this.spec.create;
  }
  get decode() {
    return this.spec.decode;
  }
  get encode() {
    return this.spec.encode;
  }
  get description() {
    return this.spec.description;
  }
  get jsonSchemaError() {
    return this.spec.jsonSchemaError;
  }
  get jsonSchema() {
    if (this.projection === void 0) {
      const schema = this.spec.jsonSchema;
      this.projection = { value: schema === void 0 ? void 0 : { ...schema, description: this.spec.description } };
    }
    return this.projection.value;
  }
};

// packages/flowspace/lib/typert.remote-client.js
var dsh_flowspace_flowspace_bind_parameter_0$schema$value;
var dsh_flowspace_flowspace_bind_parameter_0$schema = () => dsh_flowspace_flowspace_bind_parameter_0$schema$value ??= import_zod.z.object({
  "nodeId": import_zod.z.string(),
  "sessionId": import_zod.z.string().optional(),
  "workspaceId": import_zod.z.string().optional(),
  "cwd": import_zod.z.string().optional()
});
var dsh_flowspace_flowspace_bind_result$schema$value;
var dsh_flowspace_flowspace_bind_result$schema = () => dsh_flowspace_flowspace_bind_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string(),
  "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
  "title": import_zod.z.string(),
  "x": import_zod.z.number(),
  "y": import_zod.z.number(),
  "width": import_zod.z.number(),
  "height": import_zod.z.number(),
  "expanded": import_zod.z.boolean(),
  "parentId": import_zod.z.string().optional(),
  "sessionId": import_zod.z.string().optional(),
  "workspaceId": import_zod.z.string().optional(),
  "cwd": import_zod.z.string().optional(),
  "agentPreset": import_zod.z.string().optional(),
  "task": import_zod.z.string(),
  "draft": import_zod.z.string(),
  "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
  "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
  "text": import_zod.z.string(),
  "sourceNodeId": import_zod.z.string().optional(),
  "sourceSeq": import_zod.z.number().optional(),
  "fixed": import_zod.z.boolean(),
  "collapsed": import_zod.z.boolean(),
  "lastSubmittedTask": import_zod.z.string().optional(),
  "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
  "pinned": import_zod.z.boolean().optional(),
  "roleLabel": import_zod.z.string().optional(),
  "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
  "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
  "ports": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
    "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
    "name": import_zod.z.string(),
    "nodes": import_zod.z.array(import_zod.z.string()),
    "hidden": import_zod.z.boolean()
  })).optional(),
  "templateId": import_zod.z.string().optional(),
  "templateRevision": import_zod.z.number().optional(),
  "templateSlotId": import_zod.z.string().optional(),
  "titleKey": import_zod.z.string().optional(),
  "window": import_zod.z.object({
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "w": import_zod.z.number(),
    "h": import_zod.z.number(),
    "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
    "z": import_zod.z.number().optional()
  }).optional(),
  "columns": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "name": import_zod.z.string(),
    "cards": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "text": import_zod.z.string()
    }))
  })).optional(),
  "items": import_zod.z.array(import_zod.z.string()).optional(),
  "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
  "nudge": import_zod.z.object({
    "by": import_zod.z.string(),
    "origY": import_zod.z.number().optional(),
    "origH": import_zod.z.number().optional()
  }).optional()
});
var dsh_flowspace_flowspace_canvasPresence_parameter_0$schema$value;
var dsh_flowspace_flowspace_canvasPresence_parameter_0$schema = () => dsh_flowspace_flowspace_canvasPresence_parameter_0$schema$value ??= import_zod.z.array(import_zod.z.string());
var dsh_flowspace_flowspace_canvasPresence_result$schema$value;
var dsh_flowspace_flowspace_canvasPresence_result$schema = () => dsh_flowspace_flowspace_canvasPresence_result$schema$value ??= import_zod.z.void();
var dsh_flowspace_flowspace_command_parameter_0$schema$value;
var dsh_flowspace_flowspace_command_parameter_0$schema = () => dsh_flowspace_flowspace_command_parameter_0$schema$value ??= import_zod.z.object({
  "runId": import_zod.z.string(),
  "action": import_zod.z.union([import_zod.z.literal("pause"), import_zod.z.literal("resume"), import_zod.z.literal("cancel")])
});
var dsh_flowspace_flowspace_command_result$schema$value;
var dsh_flowspace_flowspace_command_result$schema = () => dsh_flowspace_flowspace_command_result$schema$value ??= import_zod.z.void();
var dsh_flowspace_flowspace_display_parameter_0$schema$value;
var dsh_flowspace_flowspace_display_parameter_0$schema = () => dsh_flowspace_flowspace_display_parameter_0$schema$value ??= import_zod.z.object({
  "nodeId": import_zod.z.string(),
  "text": import_zod.z.string().optional(),
  "seq": import_zod.z.number().optional(),
  "fixed": import_zod.z.boolean()
});
var dsh_flowspace_flowspace_display_result$schema$value;
var dsh_flowspace_flowspace_display_result$schema = () => dsh_flowspace_flowspace_display_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string(),
  "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
  "title": import_zod.z.string(),
  "x": import_zod.z.number(),
  "y": import_zod.z.number(),
  "width": import_zod.z.number(),
  "height": import_zod.z.number(),
  "expanded": import_zod.z.boolean(),
  "parentId": import_zod.z.string().optional(),
  "sessionId": import_zod.z.string().optional(),
  "workspaceId": import_zod.z.string().optional(),
  "cwd": import_zod.z.string().optional(),
  "agentPreset": import_zod.z.string().optional(),
  "task": import_zod.z.string(),
  "draft": import_zod.z.string(),
  "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
  "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
  "text": import_zod.z.string(),
  "sourceNodeId": import_zod.z.string().optional(),
  "sourceSeq": import_zod.z.number().optional(),
  "fixed": import_zod.z.boolean(),
  "collapsed": import_zod.z.boolean(),
  "lastSubmittedTask": import_zod.z.string().optional(),
  "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
  "pinned": import_zod.z.boolean().optional(),
  "roleLabel": import_zod.z.string().optional(),
  "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
  "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
  "ports": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
    "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
    "name": import_zod.z.string(),
    "nodes": import_zod.z.array(import_zod.z.string()),
    "hidden": import_zod.z.boolean()
  })).optional(),
  "templateId": import_zod.z.string().optional(),
  "templateRevision": import_zod.z.number().optional(),
  "templateSlotId": import_zod.z.string().optional(),
  "titleKey": import_zod.z.string().optional(),
  "window": import_zod.z.object({
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "w": import_zod.z.number(),
    "h": import_zod.z.number(),
    "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
    "z": import_zod.z.number().optional()
  }).optional(),
  "columns": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "name": import_zod.z.string(),
    "cards": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "text": import_zod.z.string()
    }))
  })).optional(),
  "items": import_zod.z.array(import_zod.z.string()).optional(),
  "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
  "nudge": import_zod.z.object({
    "by": import_zod.z.string(),
    "origY": import_zod.z.number().optional(),
    "origH": import_zod.z.number().optional()
  }).optional()
});
var dsh_flowspace_flowspace_draft_parameter_0$schema$value;
var dsh_flowspace_flowspace_draft_parameter_0$schema = () => dsh_flowspace_flowspace_draft_parameter_0$schema$value ??= import_zod.z.object({
  "nodeId": import_zod.z.string(),
  "draft": import_zod.z.string()
});
var dsh_flowspace_flowspace_draft_result$schema$value;
var dsh_flowspace_flowspace_draft_result$schema = () => dsh_flowspace_flowspace_draft_result$schema$value ??= import_zod.z.void();
var dsh_flowspace_flowspace_follow_result$schema$value;
var dsh_flowspace_flowspace_follow_result$schema = () => dsh_flowspace_flowspace_follow_result$schema$value ??= import_zod.z.object({
  "document": import_zod.z.object({
    "version": import_zod.z.literal(1),
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "viewport": import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "zoom": import_zod.z.number()
    }),
    "settings": import_zod.z.object({
      "nativeChatTriggers": import_zod.z.boolean(),
      "reducedMotion": import_zod.z.boolean()
    }),
    "prefs": import_zod.z.object({
      "theme": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("dark"), import_zod.z.literal("light")]).optional(),
      "wheel": import_zod.z.union([import_zod.z.literal("zoom"), import_zod.z.literal("pan")]).optional(),
      "snap": import_zod.z.boolean().optional(),
      "filter": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("running"), import_zod.z.literal("all")]).optional(),
      "hiddenWorkspaces": import_zod.z.array(import_zod.z.string()).optional()
    }).optional(),
    "templates": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "title": import_zod.z.string(),
      "description": import_zod.z.string(),
      "revision": import_zod.z.number(),
      "builtin": import_zod.z.boolean().optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "w": import_zod.z.number(),
      "h": import_zod.z.number(),
      "nodes": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
        "title": import_zod.z.string(),
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "width": import_zod.z.number(),
        "height": import_zod.z.number(),
        "expanded": import_zod.z.boolean(),
        "parentId": import_zod.z.string().optional(),
        "sessionId": import_zod.z.string().optional(),
        "workspaceId": import_zod.z.string().optional(),
        "cwd": import_zod.z.string().optional(),
        "agentPreset": import_zod.z.string().optional(),
        "task": import_zod.z.string(),
        "draft": import_zod.z.string(),
        "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
        "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
        "text": import_zod.z.string(),
        "sourceNodeId": import_zod.z.string().optional(),
        "sourceSeq": import_zod.z.number().optional(),
        "fixed": import_zod.z.boolean(),
        "collapsed": import_zod.z.boolean(),
        "lastSubmittedTask": import_zod.z.string().optional(),
        "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
        "pinned": import_zod.z.boolean().optional(),
        "roleLabel": import_zod.z.string().optional(),
        "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
        "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
        "ports": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
          "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
          "name": import_zod.z.string(),
          "nodes": import_zod.z.array(import_zod.z.string()),
          "hidden": import_zod.z.boolean()
        })).optional(),
        "templateId": import_zod.z.string().optional(),
        "templateRevision": import_zod.z.number().optional(),
        "templateSlotId": import_zod.z.string().optional(),
        "titleKey": import_zod.z.string().optional(),
        "window": import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number(),
          "w": import_zod.z.number(),
          "h": import_zod.z.number(),
          "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
          "z": import_zod.z.number().optional()
        }).optional(),
        "columns": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "name": import_zod.z.string(),
          "cards": import_zod.z.array(import_zod.z.object({
            "id": import_zod.z.string(),
            "text": import_zod.z.string()
          }))
        })).optional(),
        "items": import_zod.z.array(import_zod.z.string()).optional(),
        "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
        "nudge": import_zod.z.object({
          "by": import_zod.z.string(),
          "origY": import_zod.z.number().optional(),
          "origH": import_zod.z.number().optional()
        }).optional()
      })),
      "edges": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "source": import_zod.z.string(),
        "target": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
        "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
        "maxRounds": import_zod.z.number(),
        "always": import_zod.z.boolean(),
        "sentVersion": import_zod.z.string().optional(),
        "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
        "waypoints": import_zod.z.array(import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number()
        })).optional(),
        "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
      })),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      }))
    })).optional(),
    "snapshots": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "title": import_zod.z.string(),
      "createdAt": import_zod.z.number(),
      "nodes": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
        "title": import_zod.z.string(),
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "width": import_zod.z.number(),
        "height": import_zod.z.number(),
        "expanded": import_zod.z.boolean(),
        "parentId": import_zod.z.string().optional(),
        "sessionId": import_zod.z.string().optional(),
        "workspaceId": import_zod.z.string().optional(),
        "cwd": import_zod.z.string().optional(),
        "agentPreset": import_zod.z.string().optional(),
        "task": import_zod.z.string(),
        "draft": import_zod.z.string(),
        "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
        "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
        "text": import_zod.z.string(),
        "sourceNodeId": import_zod.z.string().optional(),
        "sourceSeq": import_zod.z.number().optional(),
        "fixed": import_zod.z.boolean(),
        "collapsed": import_zod.z.boolean(),
        "lastSubmittedTask": import_zod.z.string().optional(),
        "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
        "pinned": import_zod.z.boolean().optional(),
        "roleLabel": import_zod.z.string().optional(),
        "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
        "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
        "ports": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
          "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
          "name": import_zod.z.string(),
          "nodes": import_zod.z.array(import_zod.z.string()),
          "hidden": import_zod.z.boolean()
        })).optional(),
        "templateId": import_zod.z.string().optional(),
        "templateRevision": import_zod.z.number().optional(),
        "templateSlotId": import_zod.z.string().optional(),
        "titleKey": import_zod.z.string().optional(),
        "window": import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number(),
          "w": import_zod.z.number(),
          "h": import_zod.z.number(),
          "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
          "z": import_zod.z.number().optional()
        }).optional(),
        "columns": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "name": import_zod.z.string(),
          "cards": import_zod.z.array(import_zod.z.object({
            "id": import_zod.z.string(),
            "text": import_zod.z.string()
          }))
        })).optional(),
        "items": import_zod.z.array(import_zod.z.string()).optional(),
        "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
        "nudge": import_zod.z.object({
          "by": import_zod.z.string(),
          "origY": import_zod.z.number().optional(),
          "origH": import_zod.z.number().optional()
        }).optional()
      })),
      "edges": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "source": import_zod.z.string(),
        "target": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
        "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
        "maxRounds": import_zod.z.number(),
        "always": import_zod.z.boolean(),
        "sentVersion": import_zod.z.string().optional(),
        "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
        "waypoints": import_zod.z.array(import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number()
        })).optional(),
        "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
      })),
      "viewport": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "zoom": import_zod.z.number()
      }),
      "summary": import_zod.z.object({
        "drafts": import_zod.z.number(),
        "stopping": import_zod.z.number(),
        "awaiting": import_zod.z.number(),
        "queued": import_zod.z.number(),
        "recentOutputs": import_zod.z.array(import_zod.z.object({
          "title": import_zod.z.string(),
          "snippet": import_zod.z.string()
        }))
      }).optional()
    })).optional()
  }),
  "runs": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "origin": import_zod.z.union([import_zod.z.literal("canvas"), import_zod.z.literal("chat")]),
    "state": import_zod.z.union([import_zod.z.literal("paused"), import_zod.z.literal("running"), import_zod.z.literal("waiting"), import_zod.z.literal("completed"), import_zod.z.literal("cancelled"), import_zod.z.literal("interrupted"), import_zod.z.literal("error")]),
    "createdAt": import_zod.z.number(),
    "scope": import_zod.z.array(import_zod.z.string()),
    "roots": import_zod.z.array(import_zod.z.string()),
    "participants": import_zod.z.array(import_zod.z.string()),
    "graph": import_zod.z.object({
      "nodes": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
        "title": import_zod.z.string(),
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "width": import_zod.z.number(),
        "height": import_zod.z.number(),
        "expanded": import_zod.z.boolean(),
        "parentId": import_zod.z.string().optional(),
        "sessionId": import_zod.z.string().optional(),
        "workspaceId": import_zod.z.string().optional(),
        "cwd": import_zod.z.string().optional(),
        "agentPreset": import_zod.z.string().optional(),
        "task": import_zod.z.string(),
        "draft": import_zod.z.string(),
        "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
        "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
        "text": import_zod.z.string(),
        "sourceNodeId": import_zod.z.string().optional(),
        "sourceSeq": import_zod.z.number().optional(),
        "fixed": import_zod.z.boolean(),
        "collapsed": import_zod.z.boolean(),
        "lastSubmittedTask": import_zod.z.string().optional(),
        "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
        "pinned": import_zod.z.boolean().optional(),
        "roleLabel": import_zod.z.string().optional(),
        "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
        "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
        "ports": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
          "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
          "name": import_zod.z.string(),
          "nodes": import_zod.z.array(import_zod.z.string()),
          "hidden": import_zod.z.boolean()
        })).optional(),
        "templateId": import_zod.z.string().optional(),
        "templateRevision": import_zod.z.number().optional(),
        "templateSlotId": import_zod.z.string().optional(),
        "titleKey": import_zod.z.string().optional(),
        "window": import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number(),
          "w": import_zod.z.number(),
          "h": import_zod.z.number(),
          "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
          "z": import_zod.z.number().optional()
        }).optional(),
        "columns": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "name": import_zod.z.string(),
          "cards": import_zod.z.array(import_zod.z.object({
            "id": import_zod.z.string(),
            "text": import_zod.z.string()
          }))
        })).optional(),
        "items": import_zod.z.array(import_zod.z.string()).optional(),
        "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
        "nudge": import_zod.z.object({
          "by": import_zod.z.string(),
          "origY": import_zod.z.number().optional(),
          "origH": import_zod.z.number().optional()
        }).optional()
      })),
      "edges": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "source": import_zod.z.string(),
        "target": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
        "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
        "maxRounds": import_zod.z.number(),
        "always": import_zod.z.boolean(),
        "sentVersion": import_zod.z.string().optional(),
        "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
        "waypoints": import_zod.z.array(import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number()
        })).optional(),
        "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
      }))
    }),
    "steps": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "nodeId": import_zod.z.string(),
      "requestId": import_zod.z.string(),
      "sessionId": import_zod.z.string().optional(),
      "turn": import_zod.z.number().optional(),
      "state": import_zod.z.union([import_zod.z.literal("running"), import_zod.z.literal("completed"), import_zod.z.literal("interrupted"), import_zod.z.literal("error"), import_zod.z.literal("queued"), import_zod.z.literal("aborted")]),
      "iteration": import_zod.z.number(),
      "task": import_zod.z.string(),
      "sources": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("file"), import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork"), import_zod.z.literal("text")]),
        "sourceNodeId": import_zod.z.string(),
        "sourceSessionId": import_zod.z.string().optional(),
        "seq": import_zod.z.number().optional(),
        "title": import_zod.z.string(),
        "text": import_zod.z.string(),
        "capturedAt": import_zod.z.number(),
        "version": import_zod.z.string().optional()
      })),
      "createdAt": import_zod.z.number(),
      "endedAt": import_zod.z.number().optional(),
      "endSeq": import_zod.z.number().optional(),
      "output": import_zod.z.string().optional(),
      "error": import_zod.z.string().optional()
    })),
    "tokens": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "edgeId": import_zod.z.string(),
      "stepId": import_zod.z.string(),
      "source": import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("file"), import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork"), import_zod.z.literal("text")]),
        "sourceNodeId": import_zod.z.string(),
        "sourceSessionId": import_zod.z.string().optional(),
        "seq": import_zod.z.number().optional(),
        "title": import_zod.z.string(),
        "text": import_zod.z.string(),
        "capturedAt": import_zod.z.number(),
        "version": import_zod.z.string().optional()
      }),
      "ready": import_zod.z.boolean(),
      "consumed": import_zod.z.boolean(),
      "boundary": import_zod.z.boolean(),
      "dismissed": import_zod.z.boolean()
    })),
    "notes": import_zod.z.array(import_zod.z.string())
  })),
  "live": import_zod.z.array(import_zod.z.object({
    "nodeId": import_zod.z.string(),
    "sessionId": import_zod.z.string(),
    "running": import_zod.z.boolean(),
    "output": import_zod.z.string(),
    "seq": import_zod.z.number(),
    "pendingInput": import_zod.z.array(import_zod.z.string())
  }))
});
var dsh_flowspace_flowspace_plan_parameter_0$schema$value;
var dsh_flowspace_flowspace_plan_parameter_0$schema = () => dsh_flowspace_flowspace_plan_parameter_0$schema$value ??= import_zod.z.object({
  "nodeIds": import_zod.z.array(import_zod.z.string()),
  "kind": import_zod.z.union([import_zod.z.literal("group"), import_zod.z.literal("global"), import_zod.z.literal("single"), import_zod.z.literal("selection")]),
  "excludeRootIds": import_zod.z.array(import_zod.z.string()).optional()
});
var dsh_flowspace_flowspace_plan_result$schema$value;
var dsh_flowspace_flowspace_plan_result$schema = () => dsh_flowspace_flowspace_plan_result$schema$value ??= import_zod.z.object({
  "roots": import_zod.z.array(import_zod.z.string()),
  "later": import_zod.z.array(import_zod.z.string()),
  "confirmation": import_zod.z.array(import_zod.z.string()),
  "skipped": import_zod.z.array(import_zod.z.object({
    "nodeId": import_zod.z.string(),
    "reason": import_zod.z.string()
  }))
});
var dsh_flowspace_flowspace_readWorkspaceFile_parameter_0$schema$value;
var dsh_flowspace_flowspace_readWorkspaceFile_parameter_0$schema = () => dsh_flowspace_flowspace_readWorkspaceFile_parameter_0$schema$value ??= import_zod.z.object({
  "path": import_zod.z.string(),
  "cwd": import_zod.z.string().optional()
});
var dsh_flowspace_flowspace_readWorkspaceFile_result$schema$value;
var dsh_flowspace_flowspace_readWorkspaceFile_result$schema = () => dsh_flowspace_flowspace_readWorkspaceFile_result$schema$value ??= import_zod.z.object({
  "path": import_zod.z.string(),
  "content": import_zod.z.string(),
  "truncated": import_zod.z.boolean()
});
var dsh_flowspace_flowspace_release_parameter_0$schema$value;
var dsh_flowspace_flowspace_release_parameter_0$schema = () => dsh_flowspace_flowspace_release_parameter_0$schema$value ??= import_zod.z.object({
  "runId": import_zod.z.string(),
  "tokenId": import_zod.z.string(),
  "accept": import_zod.z.boolean()
});
var dsh_flowspace_flowspace_release_result$schema$value;
var dsh_flowspace_flowspace_release_result$schema = () => dsh_flowspace_flowspace_release_result$schema$value ??= import_zod.z.void();
var dsh_flowspace_flowspace_save_parameter_0$schema$value;
var dsh_flowspace_flowspace_save_parameter_0$schema = () => dsh_flowspace_flowspace_save_parameter_0$schema$value ??= import_zod.z.object({
  "version": import_zod.z.literal(1),
  "id": import_zod.z.string(),
  "title": import_zod.z.string(),
  "nodes": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
    "title": import_zod.z.string(),
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "width": import_zod.z.number(),
    "height": import_zod.z.number(),
    "expanded": import_zod.z.boolean(),
    "parentId": import_zod.z.string().optional(),
    "sessionId": import_zod.z.string().optional(),
    "workspaceId": import_zod.z.string().optional(),
    "cwd": import_zod.z.string().optional(),
    "agentPreset": import_zod.z.string().optional(),
    "task": import_zod.z.string(),
    "draft": import_zod.z.string(),
    "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
    "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
    "text": import_zod.z.string(),
    "sourceNodeId": import_zod.z.string().optional(),
    "sourceSeq": import_zod.z.number().optional(),
    "fixed": import_zod.z.boolean(),
    "collapsed": import_zod.z.boolean(),
    "lastSubmittedTask": import_zod.z.string().optional(),
    "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
    "pinned": import_zod.z.boolean().optional(),
    "roleLabel": import_zod.z.string().optional(),
    "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
    "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
    "ports": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
      "name": import_zod.z.string(),
      "nodes": import_zod.z.array(import_zod.z.string()),
      "hidden": import_zod.z.boolean()
    })).optional(),
    "templateId": import_zod.z.string().optional(),
    "templateRevision": import_zod.z.number().optional(),
    "templateSlotId": import_zod.z.string().optional(),
    "titleKey": import_zod.z.string().optional(),
    "window": import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "w": import_zod.z.number(),
      "h": import_zod.z.number(),
      "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
      "z": import_zod.z.number().optional()
    }).optional(),
    "columns": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "name": import_zod.z.string(),
      "cards": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "text": import_zod.z.string()
      }))
    })).optional(),
    "items": import_zod.z.array(import_zod.z.string()).optional(),
    "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
    "nudge": import_zod.z.object({
      "by": import_zod.z.string(),
      "origY": import_zod.z.number().optional(),
      "origH": import_zod.z.number().optional()
    }).optional()
  })),
  "edges": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "source": import_zod.z.string(),
    "target": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
    "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
    "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
    "maxRounds": import_zod.z.number(),
    "always": import_zod.z.boolean(),
    "sentVersion": import_zod.z.string().optional(),
    "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
    "waypoints": import_zod.z.array(import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number()
    })).optional(),
    "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
  })),
  "viewport": import_zod.z.object({
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "zoom": import_zod.z.number()
  }),
  "settings": import_zod.z.object({
    "nativeChatTriggers": import_zod.z.boolean(),
    "reducedMotion": import_zod.z.boolean()
  }),
  "prefs": import_zod.z.object({
    "theme": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("dark"), import_zod.z.literal("light")]).optional(),
    "wheel": import_zod.z.union([import_zod.z.literal("zoom"), import_zod.z.literal("pan")]).optional(),
    "snap": import_zod.z.boolean().optional(),
    "filter": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("running"), import_zod.z.literal("all")]).optional(),
    "hiddenWorkspaces": import_zod.z.array(import_zod.z.string()).optional()
  }).optional(),
  "templates": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "description": import_zod.z.string(),
    "revision": import_zod.z.number(),
    "builtin": import_zod.z.boolean().optional(),
    "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
    "w": import_zod.z.number(),
    "h": import_zod.z.number(),
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "ports": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
      "name": import_zod.z.string(),
      "nodes": import_zod.z.array(import_zod.z.string()),
      "hidden": import_zod.z.boolean()
    }))
  })).optional(),
  "snapshots": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "createdAt": import_zod.z.number(),
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "viewport": import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "zoom": import_zod.z.number()
    }),
    "summary": import_zod.z.object({
      "drafts": import_zod.z.number(),
      "stopping": import_zod.z.number(),
      "awaiting": import_zod.z.number(),
      "queued": import_zod.z.number(),
      "recentOutputs": import_zod.z.array(import_zod.z.object({
        "title": import_zod.z.string(),
        "snippet": import_zod.z.string()
      }))
    }).optional()
  })).optional()
});
var dsh_flowspace_flowspace_save_result$schema$value;
var dsh_flowspace_flowspace_save_result$schema = () => dsh_flowspace_flowspace_save_result$schema$value ??= import_zod.z.object({
  "version": import_zod.z.literal(1),
  "id": import_zod.z.string(),
  "title": import_zod.z.string(),
  "nodes": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
    "title": import_zod.z.string(),
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "width": import_zod.z.number(),
    "height": import_zod.z.number(),
    "expanded": import_zod.z.boolean(),
    "parentId": import_zod.z.string().optional(),
    "sessionId": import_zod.z.string().optional(),
    "workspaceId": import_zod.z.string().optional(),
    "cwd": import_zod.z.string().optional(),
    "agentPreset": import_zod.z.string().optional(),
    "task": import_zod.z.string(),
    "draft": import_zod.z.string(),
    "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
    "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
    "text": import_zod.z.string(),
    "sourceNodeId": import_zod.z.string().optional(),
    "sourceSeq": import_zod.z.number().optional(),
    "fixed": import_zod.z.boolean(),
    "collapsed": import_zod.z.boolean(),
    "lastSubmittedTask": import_zod.z.string().optional(),
    "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
    "pinned": import_zod.z.boolean().optional(),
    "roleLabel": import_zod.z.string().optional(),
    "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
    "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
    "ports": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
      "name": import_zod.z.string(),
      "nodes": import_zod.z.array(import_zod.z.string()),
      "hidden": import_zod.z.boolean()
    })).optional(),
    "templateId": import_zod.z.string().optional(),
    "templateRevision": import_zod.z.number().optional(),
    "templateSlotId": import_zod.z.string().optional(),
    "titleKey": import_zod.z.string().optional(),
    "window": import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "w": import_zod.z.number(),
      "h": import_zod.z.number(),
      "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
      "z": import_zod.z.number().optional()
    }).optional(),
    "columns": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "name": import_zod.z.string(),
      "cards": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "text": import_zod.z.string()
      }))
    })).optional(),
    "items": import_zod.z.array(import_zod.z.string()).optional(),
    "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
    "nudge": import_zod.z.object({
      "by": import_zod.z.string(),
      "origY": import_zod.z.number().optional(),
      "origH": import_zod.z.number().optional()
    }).optional()
  })),
  "edges": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "source": import_zod.z.string(),
    "target": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
    "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
    "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
    "maxRounds": import_zod.z.number(),
    "always": import_zod.z.boolean(),
    "sentVersion": import_zod.z.string().optional(),
    "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
    "waypoints": import_zod.z.array(import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number()
    })).optional(),
    "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
  })),
  "viewport": import_zod.z.object({
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "zoom": import_zod.z.number()
  }),
  "settings": import_zod.z.object({
    "nativeChatTriggers": import_zod.z.boolean(),
    "reducedMotion": import_zod.z.boolean()
  }),
  "prefs": import_zod.z.object({
    "theme": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("dark"), import_zod.z.literal("light")]).optional(),
    "wheel": import_zod.z.union([import_zod.z.literal("zoom"), import_zod.z.literal("pan")]).optional(),
    "snap": import_zod.z.boolean().optional(),
    "filter": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("running"), import_zod.z.literal("all")]).optional(),
    "hiddenWorkspaces": import_zod.z.array(import_zod.z.string()).optional()
  }).optional(),
  "templates": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "description": import_zod.z.string(),
    "revision": import_zod.z.number(),
    "builtin": import_zod.z.boolean().optional(),
    "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
    "w": import_zod.z.number(),
    "h": import_zod.z.number(),
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "ports": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
      "name": import_zod.z.string(),
      "nodes": import_zod.z.array(import_zod.z.string()),
      "hidden": import_zod.z.boolean()
    }))
  })).optional(),
  "snapshots": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "createdAt": import_zod.z.number(),
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "viewport": import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "zoom": import_zod.z.number()
    }),
    "summary": import_zod.z.object({
      "drafts": import_zod.z.number(),
      "stopping": import_zod.z.number(),
      "awaiting": import_zod.z.number(),
      "queued": import_zod.z.number(),
      "recentOutputs": import_zod.z.array(import_zod.z.object({
        "title": import_zod.z.string(),
        "snippet": import_zod.z.string()
      }))
    }).optional()
  })).optional()
});
var dsh_flowspace_flowspace_sessions_result$schema$value;
var dsh_flowspace_flowspace_sessions_result$schema = () => dsh_flowspace_flowspace_sessions_result$schema$value ??= import_zod.z.array(import_zod.z.object({
  "sessionId": import_zod.z.string(),
  "title": import_zod.z.string(),
  "cwd": import_zod.z.string().optional(),
  "running": import_zod.z.boolean()
}));
var dsh_flowspace_flowspace_snapshot_result$schema$value;
var dsh_flowspace_flowspace_snapshot_result$schema = () => dsh_flowspace_flowspace_snapshot_result$schema$value ??= import_zod.z.object({
  "document": import_zod.z.object({
    "version": import_zod.z.literal(1),
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "viewport": import_zod.z.object({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "zoom": import_zod.z.number()
    }),
    "settings": import_zod.z.object({
      "nativeChatTriggers": import_zod.z.boolean(),
      "reducedMotion": import_zod.z.boolean()
    }),
    "prefs": import_zod.z.object({
      "theme": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("dark"), import_zod.z.literal("light")]).optional(),
      "wheel": import_zod.z.union([import_zod.z.literal("zoom"), import_zod.z.literal("pan")]).optional(),
      "snap": import_zod.z.boolean().optional(),
      "filter": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("running"), import_zod.z.literal("all")]).optional(),
      "hiddenWorkspaces": import_zod.z.array(import_zod.z.string()).optional()
    }).optional(),
    "templates": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "title": import_zod.z.string(),
      "description": import_zod.z.string(),
      "revision": import_zod.z.number(),
      "builtin": import_zod.z.boolean().optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "w": import_zod.z.number(),
      "h": import_zod.z.number(),
      "nodes": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
        "title": import_zod.z.string(),
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "width": import_zod.z.number(),
        "height": import_zod.z.number(),
        "expanded": import_zod.z.boolean(),
        "parentId": import_zod.z.string().optional(),
        "sessionId": import_zod.z.string().optional(),
        "workspaceId": import_zod.z.string().optional(),
        "cwd": import_zod.z.string().optional(),
        "agentPreset": import_zod.z.string().optional(),
        "task": import_zod.z.string(),
        "draft": import_zod.z.string(),
        "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
        "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
        "text": import_zod.z.string(),
        "sourceNodeId": import_zod.z.string().optional(),
        "sourceSeq": import_zod.z.number().optional(),
        "fixed": import_zod.z.boolean(),
        "collapsed": import_zod.z.boolean(),
        "lastSubmittedTask": import_zod.z.string().optional(),
        "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
        "pinned": import_zod.z.boolean().optional(),
        "roleLabel": import_zod.z.string().optional(),
        "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
        "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
        "ports": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
          "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
          "name": import_zod.z.string(),
          "nodes": import_zod.z.array(import_zod.z.string()),
          "hidden": import_zod.z.boolean()
        })).optional(),
        "templateId": import_zod.z.string().optional(),
        "templateRevision": import_zod.z.number().optional(),
        "templateSlotId": import_zod.z.string().optional(),
        "titleKey": import_zod.z.string().optional(),
        "window": import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number(),
          "w": import_zod.z.number(),
          "h": import_zod.z.number(),
          "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
          "z": import_zod.z.number().optional()
        }).optional(),
        "columns": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "name": import_zod.z.string(),
          "cards": import_zod.z.array(import_zod.z.object({
            "id": import_zod.z.string(),
            "text": import_zod.z.string()
          }))
        })).optional(),
        "items": import_zod.z.array(import_zod.z.string()).optional(),
        "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
        "nudge": import_zod.z.object({
          "by": import_zod.z.string(),
          "origY": import_zod.z.number().optional(),
          "origH": import_zod.z.number().optional()
        }).optional()
      })),
      "edges": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "source": import_zod.z.string(),
        "target": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
        "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
        "maxRounds": import_zod.z.number(),
        "always": import_zod.z.boolean(),
        "sentVersion": import_zod.z.string().optional(),
        "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
        "waypoints": import_zod.z.array(import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number()
        })).optional(),
        "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
      })),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      }))
    })).optional(),
    "snapshots": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "title": import_zod.z.string(),
      "createdAt": import_zod.z.number(),
      "nodes": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
        "title": import_zod.z.string(),
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "width": import_zod.z.number(),
        "height": import_zod.z.number(),
        "expanded": import_zod.z.boolean(),
        "parentId": import_zod.z.string().optional(),
        "sessionId": import_zod.z.string().optional(),
        "workspaceId": import_zod.z.string().optional(),
        "cwd": import_zod.z.string().optional(),
        "agentPreset": import_zod.z.string().optional(),
        "task": import_zod.z.string(),
        "draft": import_zod.z.string(),
        "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
        "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
        "text": import_zod.z.string(),
        "sourceNodeId": import_zod.z.string().optional(),
        "sourceSeq": import_zod.z.number().optional(),
        "fixed": import_zod.z.boolean(),
        "collapsed": import_zod.z.boolean(),
        "lastSubmittedTask": import_zod.z.string().optional(),
        "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
        "pinned": import_zod.z.boolean().optional(),
        "roleLabel": import_zod.z.string().optional(),
        "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
        "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
        "ports": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
          "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
          "name": import_zod.z.string(),
          "nodes": import_zod.z.array(import_zod.z.string()),
          "hidden": import_zod.z.boolean()
        })).optional(),
        "templateId": import_zod.z.string().optional(),
        "templateRevision": import_zod.z.number().optional(),
        "templateSlotId": import_zod.z.string().optional(),
        "titleKey": import_zod.z.string().optional(),
        "window": import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number(),
          "w": import_zod.z.number(),
          "h": import_zod.z.number(),
          "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
          "z": import_zod.z.number().optional()
        }).optional(),
        "columns": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "name": import_zod.z.string(),
          "cards": import_zod.z.array(import_zod.z.object({
            "id": import_zod.z.string(),
            "text": import_zod.z.string()
          }))
        })).optional(),
        "items": import_zod.z.array(import_zod.z.string()).optional(),
        "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
        "nudge": import_zod.z.object({
          "by": import_zod.z.string(),
          "origY": import_zod.z.number().optional(),
          "origH": import_zod.z.number().optional()
        }).optional()
      })),
      "edges": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "source": import_zod.z.string(),
        "target": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
        "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
        "maxRounds": import_zod.z.number(),
        "always": import_zod.z.boolean(),
        "sentVersion": import_zod.z.string().optional(),
        "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
        "waypoints": import_zod.z.array(import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number()
        })).optional(),
        "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
      })),
      "viewport": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "zoom": import_zod.z.number()
      }),
      "summary": import_zod.z.object({
        "drafts": import_zod.z.number(),
        "stopping": import_zod.z.number(),
        "awaiting": import_zod.z.number(),
        "queued": import_zod.z.number(),
        "recentOutputs": import_zod.z.array(import_zod.z.object({
          "title": import_zod.z.string(),
          "snippet": import_zod.z.string()
        }))
      }).optional()
    })).optional()
  }),
  "runs": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "origin": import_zod.z.union([import_zod.z.literal("canvas"), import_zod.z.literal("chat")]),
    "state": import_zod.z.union([import_zod.z.literal("paused"), import_zod.z.literal("running"), import_zod.z.literal("waiting"), import_zod.z.literal("completed"), import_zod.z.literal("cancelled"), import_zod.z.literal("interrupted"), import_zod.z.literal("error")]),
    "createdAt": import_zod.z.number(),
    "scope": import_zod.z.array(import_zod.z.string()),
    "roots": import_zod.z.array(import_zod.z.string()),
    "participants": import_zod.z.array(import_zod.z.string()),
    "graph": import_zod.z.object({
      "nodes": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
        "title": import_zod.z.string(),
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "width": import_zod.z.number(),
        "height": import_zod.z.number(),
        "expanded": import_zod.z.boolean(),
        "parentId": import_zod.z.string().optional(),
        "sessionId": import_zod.z.string().optional(),
        "workspaceId": import_zod.z.string().optional(),
        "cwd": import_zod.z.string().optional(),
        "agentPreset": import_zod.z.string().optional(),
        "task": import_zod.z.string(),
        "draft": import_zod.z.string(),
        "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
        "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
        "text": import_zod.z.string(),
        "sourceNodeId": import_zod.z.string().optional(),
        "sourceSeq": import_zod.z.number().optional(),
        "fixed": import_zod.z.boolean(),
        "collapsed": import_zod.z.boolean(),
        "lastSubmittedTask": import_zod.z.string().optional(),
        "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
        "pinned": import_zod.z.boolean().optional(),
        "roleLabel": import_zod.z.string().optional(),
        "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
        "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
        "ports": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
          "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
          "name": import_zod.z.string(),
          "nodes": import_zod.z.array(import_zod.z.string()),
          "hidden": import_zod.z.boolean()
        })).optional(),
        "templateId": import_zod.z.string().optional(),
        "templateRevision": import_zod.z.number().optional(),
        "templateSlotId": import_zod.z.string().optional(),
        "titleKey": import_zod.z.string().optional(),
        "window": import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number(),
          "w": import_zod.z.number(),
          "h": import_zod.z.number(),
          "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
          "z": import_zod.z.number().optional()
        }).optional(),
        "columns": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "name": import_zod.z.string(),
          "cards": import_zod.z.array(import_zod.z.object({
            "id": import_zod.z.string(),
            "text": import_zod.z.string()
          }))
        })).optional(),
        "items": import_zod.z.array(import_zod.z.string()).optional(),
        "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
        "nudge": import_zod.z.object({
          "by": import_zod.z.string(),
          "origY": import_zod.z.number().optional(),
          "origH": import_zod.z.number().optional()
        }).optional()
      })),
      "edges": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "source": import_zod.z.string(),
        "target": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
        "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
        "maxRounds": import_zod.z.number(),
        "always": import_zod.z.boolean(),
        "sentVersion": import_zod.z.string().optional(),
        "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
        "waypoints": import_zod.z.array(import_zod.z.object({
          "x": import_zod.z.number(),
          "y": import_zod.z.number()
        })).optional(),
        "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
      }))
    }),
    "steps": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "nodeId": import_zod.z.string(),
      "requestId": import_zod.z.string(),
      "sessionId": import_zod.z.string().optional(),
      "turn": import_zod.z.number().optional(),
      "state": import_zod.z.union([import_zod.z.literal("running"), import_zod.z.literal("completed"), import_zod.z.literal("interrupted"), import_zod.z.literal("error"), import_zod.z.literal("queued"), import_zod.z.literal("aborted")]),
      "iteration": import_zod.z.number(),
      "task": import_zod.z.string(),
      "sources": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("file"), import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork"), import_zod.z.literal("text")]),
        "sourceNodeId": import_zod.z.string(),
        "sourceSessionId": import_zod.z.string().optional(),
        "seq": import_zod.z.number().optional(),
        "title": import_zod.z.string(),
        "text": import_zod.z.string(),
        "capturedAt": import_zod.z.number(),
        "version": import_zod.z.string().optional()
      })),
      "createdAt": import_zod.z.number(),
      "endedAt": import_zod.z.number().optional(),
      "endSeq": import_zod.z.number().optional(),
      "output": import_zod.z.string().optional(),
      "error": import_zod.z.string().optional()
    })),
    "tokens": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "edgeId": import_zod.z.string(),
      "stepId": import_zod.z.string(),
      "source": import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("file"), import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork"), import_zod.z.literal("text")]),
        "sourceNodeId": import_zod.z.string(),
        "sourceSessionId": import_zod.z.string().optional(),
        "seq": import_zod.z.number().optional(),
        "title": import_zod.z.string(),
        "text": import_zod.z.string(),
        "capturedAt": import_zod.z.number(),
        "version": import_zod.z.string().optional()
      }),
      "ready": import_zod.z.boolean(),
      "consumed": import_zod.z.boolean(),
      "boundary": import_zod.z.boolean(),
      "dismissed": import_zod.z.boolean()
    })),
    "notes": import_zod.z.array(import_zod.z.string())
  })),
  "live": import_zod.z.array(import_zod.z.object({
    "nodeId": import_zod.z.string(),
    "sessionId": import_zod.z.string(),
    "running": import_zod.z.boolean(),
    "output": import_zod.z.string(),
    "seq": import_zod.z.number(),
    "pendingInput": import_zod.z.array(import_zod.z.string())
  }))
});
var dsh_flowspace_flowspace_start_parameter_0$schema$value;
var dsh_flowspace_flowspace_start_parameter_0$schema = () => dsh_flowspace_flowspace_start_parameter_0$schema$value ??= import_zod.z.object({
  "nodeIds": import_zod.z.array(import_zod.z.string()),
  "kind": import_zod.z.union([import_zod.z.literal("group"), import_zod.z.literal("global"), import_zod.z.literal("single"), import_zod.z.literal("selection")]),
  "excludeRootIds": import_zod.z.array(import_zod.z.string()).optional()
});
var dsh_flowspace_flowspace_start_result$schema$value;
var dsh_flowspace_flowspace_start_result$schema = () => dsh_flowspace_flowspace_start_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string(),
  "title": import_zod.z.string(),
  "origin": import_zod.z.union([import_zod.z.literal("canvas"), import_zod.z.literal("chat")]),
  "state": import_zod.z.union([import_zod.z.literal("paused"), import_zod.z.literal("running"), import_zod.z.literal("waiting"), import_zod.z.literal("completed"), import_zod.z.literal("cancelled"), import_zod.z.literal("interrupted"), import_zod.z.literal("error")]),
  "createdAt": import_zod.z.number(),
  "scope": import_zod.z.array(import_zod.z.string()),
  "roots": import_zod.z.array(import_zod.z.string()),
  "participants": import_zod.z.array(import_zod.z.string()),
  "graph": import_zod.z.object({
    "nodes": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.object({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.object({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.object({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.object({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    }))
  }),
  "steps": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "nodeId": import_zod.z.string(),
    "requestId": import_zod.z.string(),
    "sessionId": import_zod.z.string().optional(),
    "turn": import_zod.z.number().optional(),
    "state": import_zod.z.union([import_zod.z.literal("running"), import_zod.z.literal("completed"), import_zod.z.literal("interrupted"), import_zod.z.literal("error"), import_zod.z.literal("queued"), import_zod.z.literal("aborted")]),
    "iteration": import_zod.z.number(),
    "task": import_zod.z.string(),
    "sources": import_zod.z.array(import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("file"), import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork"), import_zod.z.literal("text")]),
      "sourceNodeId": import_zod.z.string(),
      "sourceSessionId": import_zod.z.string().optional(),
      "seq": import_zod.z.number().optional(),
      "title": import_zod.z.string(),
      "text": import_zod.z.string(),
      "capturedAt": import_zod.z.number(),
      "version": import_zod.z.string().optional()
    })),
    "createdAt": import_zod.z.number(),
    "endedAt": import_zod.z.number().optional(),
    "endSeq": import_zod.z.number().optional(),
    "output": import_zod.z.string().optional(),
    "error": import_zod.z.string().optional()
  })),
  "tokens": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string(),
    "edgeId": import_zod.z.string(),
    "stepId": import_zod.z.string(),
    "source": import_zod.z.object({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("file"), import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork"), import_zod.z.literal("text")]),
      "sourceNodeId": import_zod.z.string(),
      "sourceSessionId": import_zod.z.string().optional(),
      "seq": import_zod.z.number().optional(),
      "title": import_zod.z.string(),
      "text": import_zod.z.string(),
      "capturedAt": import_zod.z.number(),
      "version": import_zod.z.string().optional()
    }),
    "ready": import_zod.z.boolean(),
    "consumed": import_zod.z.boolean(),
    "boundary": import_zod.z.boolean(),
    "dismissed": import_zod.z.boolean()
  })),
  "notes": import_zod.z.array(import_zod.z.string())
});
var dsh_flowspace_flowspace_stopNode_parameter_0$schema$value;
var dsh_flowspace_flowspace_stopNode_parameter_0$schema = () => dsh_flowspace_flowspace_stopNode_parameter_0$schema$value ??= import_zod.z.string();
var dsh_flowspace_flowspace_stopNode_result$schema$value;
var dsh_flowspace_flowspace_stopNode_result$schema = () => dsh_flowspace_flowspace_stopNode_result$schema$value ??= import_zod.z.void();
var dsh_flowspace_flowspace_workspaceFiles_parameter_0$schema$value;
var dsh_flowspace_flowspace_workspaceFiles_parameter_0$schema = () => dsh_flowspace_flowspace_workspaceFiles_parameter_0$schema$value ??= import_zod.z.object({
  "cwd": import_zod.z.string().optional()
});
var dsh_flowspace_flowspace_workspaceFiles_result$schema$value;
var dsh_flowspace_flowspace_workspaceFiles_result$schema = () => dsh_flowspace_flowspace_workspaceFiles_result$schema$value ??= import_zod.z.array(import_zod.z.string());
var dsh_flowspace_flowspace_workspaces_result$schema$value;
var dsh_flowspace_flowspace_workspaces_result$schema = () => dsh_flowspace_flowspace_workspaces_result$schema$value ??= import_zod.z.array(import_zod.z.object({
  "id": import_zod.z.string(),
  "name": import_zod.z.string(),
  "path": import_zod.z.string()
}));
var dsh_flowspace_flowspace_bind_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_bind_parameter_0_strict$schema = () => dsh_flowspace_flowspace_bind_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "nodeId": import_zod.z.string(),
  "sessionId": import_zod.z.string().optional(),
  "workspaceId": import_zod.z.string().optional(),
  "cwd": import_zod.z.string().optional()
});
var dsh_flowspace_flowspace_canvasPresence_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_canvasPresence_parameter_0_strict$schema = () => dsh_flowspace_flowspace_canvasPresence_parameter_0_strict$schema$value ??= import_zod.z.array(import_zod.z.string());
var dsh_flowspace_flowspace_command_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_command_parameter_0_strict$schema = () => dsh_flowspace_flowspace_command_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "runId": import_zod.z.string(),
  "action": import_zod.z.union([import_zod.z.literal("pause"), import_zod.z.literal("resume"), import_zod.z.literal("cancel")])
});
var dsh_flowspace_flowspace_display_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_display_parameter_0_strict$schema = () => dsh_flowspace_flowspace_display_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "nodeId": import_zod.z.string(),
  "text": import_zod.z.string().optional(),
  "seq": import_zod.z.number().optional(),
  "fixed": import_zod.z.boolean()
});
var dsh_flowspace_flowspace_draft_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_draft_parameter_0_strict$schema = () => dsh_flowspace_flowspace_draft_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "nodeId": import_zod.z.string(),
  "draft": import_zod.z.string()
});
var dsh_flowspace_flowspace_plan_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_plan_parameter_0_strict$schema = () => dsh_flowspace_flowspace_plan_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "nodeIds": import_zod.z.array(import_zod.z.string()),
  "kind": import_zod.z.union([import_zod.z.literal("group"), import_zod.z.literal("global"), import_zod.z.literal("single"), import_zod.z.literal("selection")]),
  "excludeRootIds": import_zod.z.array(import_zod.z.string()).optional()
});
var dsh_flowspace_flowspace_readWorkspaceFile_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_readWorkspaceFile_parameter_0_strict$schema = () => dsh_flowspace_flowspace_readWorkspaceFile_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "path": import_zod.z.string(),
  "cwd": import_zod.z.string().optional()
});
var dsh_flowspace_flowspace_release_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_release_parameter_0_strict$schema = () => dsh_flowspace_flowspace_release_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "runId": import_zod.z.string(),
  "tokenId": import_zod.z.string(),
  "accept": import_zod.z.boolean()
});
var dsh_flowspace_flowspace_save_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_save_parameter_0_strict$schema = () => dsh_flowspace_flowspace_save_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "version": import_zod.z.literal(1),
  "id": import_zod.z.string(),
  "title": import_zod.z.string(),
  "nodes": import_zod.z.array(import_zod.z.strictObject({
    "id": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
    "title": import_zod.z.string(),
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "width": import_zod.z.number(),
    "height": import_zod.z.number(),
    "expanded": import_zod.z.boolean(),
    "parentId": import_zod.z.string().optional(),
    "sessionId": import_zod.z.string().optional(),
    "workspaceId": import_zod.z.string().optional(),
    "cwd": import_zod.z.string().optional(),
    "agentPreset": import_zod.z.string().optional(),
    "task": import_zod.z.string(),
    "draft": import_zod.z.string(),
    "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
    "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
    "text": import_zod.z.string(),
    "sourceNodeId": import_zod.z.string().optional(),
    "sourceSeq": import_zod.z.number().optional(),
    "fixed": import_zod.z.boolean(),
    "collapsed": import_zod.z.boolean(),
    "lastSubmittedTask": import_zod.z.string().optional(),
    "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
    "pinned": import_zod.z.boolean().optional(),
    "roleLabel": import_zod.z.string().optional(),
    "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
    "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
    "ports": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
      "name": import_zod.z.string(),
      "nodes": import_zod.z.array(import_zod.z.string()),
      "hidden": import_zod.z.boolean()
    })).optional(),
    "templateId": import_zod.z.string().optional(),
    "templateRevision": import_zod.z.number().optional(),
    "templateSlotId": import_zod.z.string().optional(),
    "titleKey": import_zod.z.string().optional(),
    "window": import_zod.z.strictObject({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "w": import_zod.z.number(),
      "h": import_zod.z.number(),
      "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
      "z": import_zod.z.number().optional()
    }).optional(),
    "columns": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "name": import_zod.z.string(),
      "cards": import_zod.z.array(import_zod.z.strictObject({
        "id": import_zod.z.string(),
        "text": import_zod.z.string()
      }))
    })).optional(),
    "items": import_zod.z.array(import_zod.z.string()).optional(),
    "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
    "nudge": import_zod.z.strictObject({
      "by": import_zod.z.string(),
      "origY": import_zod.z.number().optional(),
      "origH": import_zod.z.number().optional()
    }).optional()
  })),
  "edges": import_zod.z.array(import_zod.z.strictObject({
    "id": import_zod.z.string(),
    "source": import_zod.z.string(),
    "target": import_zod.z.string(),
    "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
    "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
    "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
    "maxRounds": import_zod.z.number(),
    "always": import_zod.z.boolean(),
    "sentVersion": import_zod.z.string().optional(),
    "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
    "waypoints": import_zod.z.array(import_zod.z.strictObject({
      "x": import_zod.z.number(),
      "y": import_zod.z.number()
    })).optional(),
    "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
  })),
  "viewport": import_zod.z.strictObject({
    "x": import_zod.z.number(),
    "y": import_zod.z.number(),
    "zoom": import_zod.z.number()
  }),
  "settings": import_zod.z.strictObject({
    "nativeChatTriggers": import_zod.z.boolean(),
    "reducedMotion": import_zod.z.boolean()
  }),
  "prefs": import_zod.z.strictObject({
    "theme": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("dark"), import_zod.z.literal("light")]).optional(),
    "wheel": import_zod.z.union([import_zod.z.literal("zoom"), import_zod.z.literal("pan")]).optional(),
    "snap": import_zod.z.boolean().optional(),
    "filter": import_zod.z.union([import_zod.z.literal("auto"), import_zod.z.literal("running"), import_zod.z.literal("all")]).optional(),
    "hiddenWorkspaces": import_zod.z.array(import_zod.z.string()).optional()
  }).optional(),
  "templates": import_zod.z.array(import_zod.z.strictObject({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "description": import_zod.z.string(),
    "revision": import_zod.z.number(),
    "builtin": import_zod.z.boolean().optional(),
    "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
    "w": import_zod.z.number(),
    "h": import_zod.z.number(),
    "nodes": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.strictObject({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.strictObject({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.strictObject({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.strictObject({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.strictObject({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.strictObject({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "ports": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
      "name": import_zod.z.string(),
      "nodes": import_zod.z.array(import_zod.z.string()),
      "hidden": import_zod.z.boolean()
    }))
  })).optional(),
  "snapshots": import_zod.z.array(import_zod.z.strictObject({
    "id": import_zod.z.string(),
    "title": import_zod.z.string(),
    "createdAt": import_zod.z.number(),
    "nodes": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("agent"), import_zod.z.literal("note"), import_zod.z.literal("file"), import_zod.z.literal("display"), import_zod.z.literal("group"), import_zod.z.literal("board"), import_zod.z.literal("detail")]),
      "title": import_zod.z.string(),
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "width": import_zod.z.number(),
      "height": import_zod.z.number(),
      "expanded": import_zod.z.boolean(),
      "parentId": import_zod.z.string().optional(),
      "sessionId": import_zod.z.string().optional(),
      "workspaceId": import_zod.z.string().optional(),
      "cwd": import_zod.z.string().optional(),
      "agentPreset": import_zod.z.string().optional(),
      "task": import_zod.z.string(),
      "draft": import_zod.z.string(),
      "nativeTrigger": import_zod.z.union([import_zod.z.literal("inherit"), import_zod.z.literal("enabled"), import_zod.z.literal("disabled")]),
      "participation": import_zod.z.union([import_zod.z.literal("global"), import_zod.z.literal("manual"), import_zod.z.literal("paused")]),
      "text": import_zod.z.string(),
      "sourceNodeId": import_zod.z.string().optional(),
      "sourceSeq": import_zod.z.number().optional(),
      "fixed": import_zod.z.boolean(),
      "collapsed": import_zod.z.boolean(),
      "lastSubmittedTask": import_zod.z.string().optional(),
      "tab": import_zod.z.union([import_zod.z.literal("task"), import_zod.z.literal("conversation"), import_zod.z.literal("execution")]).optional().describe("Optional rich canvas UI metadata persisted in DSH storageDomain"),
      "pinned": import_zod.z.boolean().optional(),
      "roleLabel": import_zod.z.string().optional(),
      "rerun": import_zod.z.union([import_zod.z.literal("change"), import_zod.z.literal("update"), import_zod.z.literal("always")]).optional(),
      "color": import_zod.z.union([import_zod.z.literal("violet"), import_zod.z.literal("teal"), import_zod.z.literal("blue"), import_zod.z.literal("amber")]).optional(),
      "ports": import_zod.z.array(import_zod.z.strictObject({
        "id": import_zod.z.string(),
        "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
        "direction": import_zod.z.union([import_zod.z.literal("in"), import_zod.z.literal("out")]),
        "name": import_zod.z.string(),
        "nodes": import_zod.z.array(import_zod.z.string()),
        "hidden": import_zod.z.boolean()
      })).optional(),
      "templateId": import_zod.z.string().optional(),
      "templateRevision": import_zod.z.number().optional(),
      "templateSlotId": import_zod.z.string().optional(),
      "titleKey": import_zod.z.string().optional(),
      "window": import_zod.z.strictObject({
        "x": import_zod.z.number(),
        "y": import_zod.z.number(),
        "w": import_zod.z.number(),
        "h": import_zod.z.number(),
        "snap": import_zod.z.union([import_zod.z.literal("left"), import_zod.z.literal("right"), import_zod.z.literal("max")]).optional(),
        "z": import_zod.z.number().optional()
      }).optional(),
      "columns": import_zod.z.array(import_zod.z.strictObject({
        "id": import_zod.z.string(),
        "name": import_zod.z.string(),
        "cards": import_zod.z.array(import_zod.z.strictObject({
          "id": import_zod.z.string(),
          "text": import_zod.z.string()
        }))
      })).optional(),
      "items": import_zod.z.array(import_zod.z.string()).optional(),
      "selectedItems": import_zod.z.array(import_zod.z.string()).optional(),
      "nudge": import_zod.z.strictObject({
        "by": import_zod.z.string(),
        "origY": import_zod.z.number().optional(),
        "origH": import_zod.z.number().optional()
      }).optional()
    })),
    "edges": import_zod.z.array(import_zod.z.strictObject({
      "id": import_zod.z.string(),
      "source": import_zod.z.string(),
      "target": import_zod.z.string(),
      "kind": import_zod.z.union([import_zod.z.literal("reference"), import_zod.z.literal("continuation")]),
      "mode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]),
      "trigger": import_zod.z.union([import_zod.z.literal("off"), import_zod.z.literal("auto"), import_zod.z.literal("confirm")]),
      "maxRounds": import_zod.z.number(),
      "always": import_zod.z.boolean(),
      "sentVersion": import_zod.z.string().optional(),
      "originMode": import_zod.z.union([import_zod.z.literal("conclusion"), import_zod.z.literal("session"), import_zod.z.literal("fork")]).optional(),
      "waypoints": import_zod.z.array(import_zod.z.strictObject({
        "x": import_zod.z.number(),
        "y": import_zod.z.number()
      })).optional(),
      "placedCapsules": import_zod.z.array(import_zod.z.string()).optional()
    })),
    "viewport": import_zod.z.strictObject({
      "x": import_zod.z.number(),
      "y": import_zod.z.number(),
      "zoom": import_zod.z.number()
    }),
    "summary": import_zod.z.strictObject({
      "drafts": import_zod.z.number(),
      "stopping": import_zod.z.number(),
      "awaiting": import_zod.z.number(),
      "queued": import_zod.z.number(),
      "recentOutputs": import_zod.z.array(import_zod.z.strictObject({
        "title": import_zod.z.string(),
        "snippet": import_zod.z.string()
      }))
    }).optional()
  })).optional()
});
var dsh_flowspace_flowspace_start_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_start_parameter_0_strict$schema = () => dsh_flowspace_flowspace_start_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "nodeIds": import_zod.z.array(import_zod.z.string()),
  "kind": import_zod.z.union([import_zod.z.literal("group"), import_zod.z.literal("global"), import_zod.z.literal("single"), import_zod.z.literal("selection")]),
  "excludeRootIds": import_zod.z.array(import_zod.z.string()).optional()
});
var dsh_flowspace_flowspace_stopNode_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_stopNode_parameter_0_strict$schema = () => dsh_flowspace_flowspace_stopNode_parameter_0_strict$schema$value ??= import_zod.z.string();
var dsh_flowspace_flowspace_workspaceFiles_parameter_0_strict$schema$value;
var dsh_flowspace_flowspace_workspaceFiles_parameter_0_strict$schema = () => dsh_flowspace_flowspace_workspaceFiles_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "cwd": import_zod.z.string().optional()
});
var TYPERT_REMOTE = createTypertRemoteInfo({
  package: "dsh-flowspace",
  methods: {
    "flowspace/bind": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#BindRequest",
            create: dsh_flowspace_flowspace_bind_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "nodeId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" } }, "required": ["nodeId"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#BindRequest",
            create: dsh_flowspace_flowspace_bind_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "nodeId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" } }, "required": ["nodeId"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#FlowNode",
        create: dsh_flowspace_flowspace_bind_result$schema,
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 370, "column": 9 }
    },
    "flowspace/canvasPresence": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "sessionIds",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace#flowspace/canvasPresence:sessionIds",
            create: dsh_flowspace_flowspace_canvasPresence_parameter_0$schema,
            jsonSchema: { "type": "array", "items": { "type": "string" } }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace#flowspace/canvasPresence:sessionIds",
            create: dsh_flowspace_flowspace_canvasPresence_parameter_0_strict$schema,
            jsonSchema: { "type": "array", "items": { "type": "string" } }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/canvasPresence:result",
        create: dsh_flowspace_flowspace_canvasPresence_result$schema,
        jsonSchemaError: "typert tool schema: unsupported void value"
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 518, "column": 3 }
    },
    "flowspace/command": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#RunCommand",
            create: dsh_flowspace_flowspace_command_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "runId": { "type": "string" }, "action": { "type": "string", "enum": ["pause", "resume", "cancel"] } }, "required": ["runId", "action"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#RunCommand",
            create: dsh_flowspace_flowspace_command_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "runId": { "type": "string" }, "action": { "type": "string", "enum": ["pause", "resume", "cancel"] } }, "required": ["runId", "action"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/command:result",
        create: dsh_flowspace_flowspace_command_result$schema,
        jsonSchemaError: "typert tool schema: unsupported void value"
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 358, "column": 3 }
    },
    "flowspace/display": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#SourceRequest",
            create: dsh_flowspace_flowspace_display_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "nodeId": { "type": "string" }, "text": { "type": "string" }, "seq": { "type": "number" }, "fixed": { "type": "boolean" } }, "required": ["nodeId", "fixed"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#SourceRequest",
            create: dsh_flowspace_flowspace_display_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "nodeId": { "type": "string" }, "text": { "type": "string" }, "seq": { "type": "number" }, "fixed": { "type": "boolean" } }, "required": ["nodeId", "fixed"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#FlowNode",
        create: dsh_flowspace_flowspace_display_result$schema,
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 399, "column": 9 }
    },
    "flowspace/draft": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#DraftRequest",
            create: dsh_flowspace_flowspace_draft_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "nodeId": { "type": "string" }, "draft": { "type": "string" } }, "required": ["nodeId", "draft"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#DraftRequest",
            create: dsh_flowspace_flowspace_draft_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "nodeId": { "type": "string" }, "draft": { "type": "string" } }, "required": ["nodeId", "draft"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/draft:result",
        create: dsh_flowspace_flowspace_draft_result$schema,
        jsonSchemaError: "typert tool schema: unsupported void value"
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 341, "column": 9 }
    },
    "flowspace/follow": {
      service: "flowspace",
      mode: "stream",
      invocation: { kind: "direct" },
      parameters: [],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#FlowspaceSnapshot",
        create: dsh_flowspace_flowspace_follow_result$schema,
        jsonSchema: { "type": "object", "properties": { "document": { "type": "object", "properties": { "version": { "type": "number", "const": 1 }, "id": { "type": "string" }, "title": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "settings": { "type": "object", "properties": { "nativeChatTriggers": { "type": "boolean" }, "reducedMotion": { "type": "boolean" } }, "required": ["nativeChatTriggers", "reducedMotion"], "additionalProperties": true }, "prefs": { "type": "object", "properties": { "theme": { "type": "string", "enum": ["auto", "dark", "light"] }, "wheel": { "type": "string", "enum": ["zoom", "pan"] }, "snap": { "type": "boolean" }, "filter": { "type": "string", "enum": ["auto", "running", "all"] }, "hiddenWorkspaces": { "type": "array", "items": { "type": "string" } } }, "required": [], "additionalProperties": true }, "templates": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" }, "revision": { "type": "number" }, "builtin": { "type": "boolean" }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "w": { "type": "number" }, "h": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } } }, "required": ["id", "title", "description", "revision", "w", "h", "nodes", "edges", "ports"], "additionalProperties": true } }, "snapshots": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "createdAt": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "summary": { "type": "object", "properties": { "drafts": { "type": "number" }, "stopping": { "type": "number" }, "awaiting": { "type": "number" }, "queued": { "type": "number" }, "recentOutputs": { "type": "array", "items": { "type": "object", "properties": { "title": { "type": "string" }, "snippet": { "type": "string" } }, "required": ["title", "snippet"], "additionalProperties": true } } }, "required": ["drafts", "stopping", "awaiting", "queued", "recentOutputs"], "additionalProperties": true } }, "required": ["id", "title", "createdAt", "nodes", "edges", "viewport"], "additionalProperties": true } } }, "required": ["version", "id", "title", "nodes", "edges", "viewport", "settings"], "additionalProperties": true }, "runs": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "origin": { "type": "string", "enum": ["canvas", "chat"] }, "state": { "type": "string", "enum": ["paused", "running", "waiting", "completed", "cancelled", "interrupted", "error"] }, "createdAt": { "type": "number" }, "scope": { "type": "array", "items": { "type": "string" } }, "roots": { "type": "array", "items": { "type": "string" } }, "participants": { "type": "array", "items": { "type": "string" } }, "graph": { "type": "object", "properties": { "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } } }, "required": ["nodes", "edges"], "additionalProperties": true }, "steps": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "nodeId": { "type": "string" }, "requestId": { "type": "string" }, "sessionId": { "type": "string" }, "turn": { "type": "number" }, "state": { "type": "string", "enum": ["running", "completed", "interrupted", "error", "queued", "aborted"] }, "iteration": { "type": "number" }, "task": { "type": "string" }, "sources": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["file", "conclusion", "session", "fork", "text"] }, "sourceNodeId": { "type": "string" }, "sourceSessionId": { "type": "string" }, "seq": { "type": "number" }, "title": { "type": "string" }, "text": { "type": "string" }, "capturedAt": { "type": "number" }, "version": { "type": "string" } }, "required": ["id", "kind", "sourceNodeId", "title", "text", "capturedAt"], "additionalProperties": true } }, "createdAt": { "type": "number" }, "endedAt": { "type": "number" }, "endSeq": { "type": "number" }, "output": { "type": "string" }, "error": { "type": "string" } }, "required": ["id", "nodeId", "requestId", "state", "iteration", "task", "sources", "createdAt"], "additionalProperties": true } }, "tokens": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "edgeId": { "type": "string" }, "stepId": { "type": "string" }, "source": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["file", "conclusion", "session", "fork", "text"] }, "sourceNodeId": { "type": "string" }, "sourceSessionId": { "type": "string" }, "seq": { "type": "number" }, "title": { "type": "string" }, "text": { "type": "string" }, "capturedAt": { "type": "number" }, "version": { "type": "string" } }, "required": ["id", "kind", "sourceNodeId", "title", "text", "capturedAt"], "additionalProperties": true }, "ready": { "type": "boolean" }, "consumed": { "type": "boolean" }, "boundary": { "type": "boolean" }, "dismissed": { "type": "boolean" } }, "required": ["id", "edgeId", "stepId", "source", "ready", "consumed", "boundary", "dismissed"], "additionalProperties": true } }, "notes": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "title", "origin", "state", "createdAt", "scope", "roots", "participants", "graph", "steps", "tokens", "notes"], "additionalProperties": true } }, "live": { "type": "array", "items": { "type": "object", "properties": { "nodeId": { "type": "string" }, "sessionId": { "type": "string" }, "running": { "type": "boolean" }, "output": { "type": "string" }, "seq": { "type": "number" }, "pendingInput": { "type": "array", "items": { "type": "string" } } }, "required": ["nodeId", "sessionId", "running", "output", "seq", "pendingInput"], "additionalProperties": true } } }, "required": ["document", "runs", "live"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 530, "column": 10 }
    },
    "flowspace/plan": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#StartRequest",
            create: dsh_flowspace_flowspace_plan_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "nodeIds": { "type": "array", "items": { "type": "string" } }, "kind": { "type": "string", "enum": ["group", "global", "single", "selection"] }, "excludeRootIds": { "type": "array", "items": { "type": "string" } } }, "required": ["nodeIds", "kind"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#StartRequest",
            create: dsh_flowspace_flowspace_plan_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "nodeIds": { "type": "array", "items": { "type": "string" } }, "kind": { "type": "string", "enum": ["group", "global", "single", "selection"] }, "excludeRootIds": { "type": "array", "items": { "type": "string" } } }, "required": ["nodeIds", "kind"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#LaunchPlan",
        create: dsh_flowspace_flowspace_plan_result$schema,
        jsonSchema: { "type": "object", "properties": { "roots": { "type": "array", "items": { "type": "string" } }, "later": { "type": "array", "items": { "type": "string" } }, "confirmation": { "type": "array", "items": { "type": "string" } }, "skipped": { "type": "array", "items": { "type": "object", "properties": { "nodeId": { "type": "string" }, "reason": { "type": "string" } }, "required": ["nodeId", "reason"], "additionalProperties": true } } }, "required": ["roots", "later", "confirmation", "skipped"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 350, "column": 3 }
    },
    "flowspace/readWorkspaceFile": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#FilePreviewRequest",
            create: dsh_flowspace_flowspace_readWorkspaceFile_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "path": { "type": "string" }, "cwd": { "type": "string" } }, "required": ["path"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#FilePreviewRequest",
            create: dsh_flowspace_flowspace_readWorkspaceFile_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "path": { "type": "string" }, "cwd": { "type": "string" } }, "required": ["path"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#WorkspaceFilePreview",
        create: dsh_flowspace_flowspace_readWorkspaceFile_result$schema,
        jsonSchema: { "type": "object", "properties": { "path": { "type": "string" }, "content": { "type": "string" }, "truncated": { "type": "boolean" } }, "required": ["path", "content", "truncated"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 482, "column": 9 }
    },
    "flowspace/release": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#ReleaseRequest",
            create: dsh_flowspace_flowspace_release_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "runId": { "type": "string" }, "tokenId": { "type": "string" }, "accept": { "type": "boolean" } }, "required": ["runId", "tokenId", "accept"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#ReleaseRequest",
            create: dsh_flowspace_flowspace_release_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "runId": { "type": "string" }, "tokenId": { "type": "string" }, "accept": { "type": "boolean" } }, "required": ["runId", "tokenId", "accept"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/release:result",
        create: dsh_flowspace_flowspace_release_result$schema,
        jsonSchemaError: "typert tool schema: unsupported void value"
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 362, "column": 3 }
    },
    "flowspace/save": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "document",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#FlowspaceDocument",
            create: dsh_flowspace_flowspace_save_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "version": { "type": "number", "const": 1 }, "id": { "type": "string" }, "title": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "settings": { "type": "object", "properties": { "nativeChatTriggers": { "type": "boolean" }, "reducedMotion": { "type": "boolean" } }, "required": ["nativeChatTriggers", "reducedMotion"], "additionalProperties": true }, "prefs": { "type": "object", "properties": { "theme": { "type": "string", "enum": ["auto", "dark", "light"] }, "wheel": { "type": "string", "enum": ["zoom", "pan"] }, "snap": { "type": "boolean" }, "filter": { "type": "string", "enum": ["auto", "running", "all"] }, "hiddenWorkspaces": { "type": "array", "items": { "type": "string" } } }, "required": [], "additionalProperties": true }, "templates": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" }, "revision": { "type": "number" }, "builtin": { "type": "boolean" }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "w": { "type": "number" }, "h": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } } }, "required": ["id", "title", "description", "revision", "w", "h", "nodes", "edges", "ports"], "additionalProperties": true } }, "snapshots": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "createdAt": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "summary": { "type": "object", "properties": { "drafts": { "type": "number" }, "stopping": { "type": "number" }, "awaiting": { "type": "number" }, "queued": { "type": "number" }, "recentOutputs": { "type": "array", "items": { "type": "object", "properties": { "title": { "type": "string" }, "snippet": { "type": "string" } }, "required": ["title", "snippet"], "additionalProperties": true } } }, "required": ["drafts", "stopping", "awaiting", "queued", "recentOutputs"], "additionalProperties": true } }, "required": ["id", "title", "createdAt", "nodes", "edges", "viewport"], "additionalProperties": true } } }, "required": ["version", "id", "title", "nodes", "edges", "viewport", "settings"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#FlowspaceDocument",
            create: dsh_flowspace_flowspace_save_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "version": { "type": "number", "const": 1 }, "id": { "type": "string" }, "title": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": false } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": false }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": false } } }, "required": ["id", "name", "cards"], "additionalProperties": false } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": false } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": false } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": false } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": false } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": false }, "settings": { "type": "object", "properties": { "nativeChatTriggers": { "type": "boolean" }, "reducedMotion": { "type": "boolean" } }, "required": ["nativeChatTriggers", "reducedMotion"], "additionalProperties": false }, "prefs": { "type": "object", "properties": { "theme": { "type": "string", "enum": ["auto", "dark", "light"] }, "wheel": { "type": "string", "enum": ["zoom", "pan"] }, "snap": { "type": "boolean" }, "filter": { "type": "string", "enum": ["auto", "running", "all"] }, "hiddenWorkspaces": { "type": "array", "items": { "type": "string" } } }, "required": [], "additionalProperties": false }, "templates": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" }, "revision": { "type": "number" }, "builtin": { "type": "boolean" }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "w": { "type": "number" }, "h": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": false } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": false }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": false } } }, "required": ["id", "name", "cards"], "additionalProperties": false } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": false } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": false } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": false } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": false } }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": false } } }, "required": ["id", "title", "description", "revision", "w", "h", "nodes", "edges", "ports"], "additionalProperties": false } }, "snapshots": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "createdAt": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": false } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": false }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": false } } }, "required": ["id", "name", "cards"], "additionalProperties": false } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": false } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": false } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": false } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": false } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": false }, "summary": { "type": "object", "properties": { "drafts": { "type": "number" }, "stopping": { "type": "number" }, "awaiting": { "type": "number" }, "queued": { "type": "number" }, "recentOutputs": { "type": "array", "items": { "type": "object", "properties": { "title": { "type": "string" }, "snippet": { "type": "string" } }, "required": ["title", "snippet"], "additionalProperties": false } } }, "required": ["drafts", "stopping", "awaiting", "queued", "recentOutputs"], "additionalProperties": false } }, "required": ["id", "title", "createdAt", "nodes", "edges", "viewport"], "additionalProperties": false } } }, "required": ["version", "id", "title", "nodes", "edges", "viewport", "settings"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#FlowspaceDocument",
        create: dsh_flowspace_flowspace_save_result$schema,
        jsonSchema: { "type": "object", "properties": { "version": { "type": "number", "const": 1 }, "id": { "type": "string" }, "title": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "settings": { "type": "object", "properties": { "nativeChatTriggers": { "type": "boolean" }, "reducedMotion": { "type": "boolean" } }, "required": ["nativeChatTriggers", "reducedMotion"], "additionalProperties": true }, "prefs": { "type": "object", "properties": { "theme": { "type": "string", "enum": ["auto", "dark", "light"] }, "wheel": { "type": "string", "enum": ["zoom", "pan"] }, "snap": { "type": "boolean" }, "filter": { "type": "string", "enum": ["auto", "running", "all"] }, "hiddenWorkspaces": { "type": "array", "items": { "type": "string" } } }, "required": [], "additionalProperties": true }, "templates": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" }, "revision": { "type": "number" }, "builtin": { "type": "boolean" }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "w": { "type": "number" }, "h": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } } }, "required": ["id", "title", "description", "revision", "w", "h", "nodes", "edges", "ports"], "additionalProperties": true } }, "snapshots": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "createdAt": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "summary": { "type": "object", "properties": { "drafts": { "type": "number" }, "stopping": { "type": "number" }, "awaiting": { "type": "number" }, "queued": { "type": "number" }, "recentOutputs": { "type": "array", "items": { "type": "object", "properties": { "title": { "type": "string" }, "snippet": { "type": "string" } }, "required": ["title", "snippet"], "additionalProperties": true } } }, "required": ["drafts", "stopping", "awaiting", "queued", "recentOutputs"], "additionalProperties": true } }, "required": ["id", "title", "createdAt", "nodes", "edges", "viewport"], "additionalProperties": true } } }, "required": ["version", "id", "title", "nodes", "edges", "viewport", "settings"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 314, "column": 9 }
    },
    "flowspace/sessions": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/sessions:result",
        create: dsh_flowspace_flowspace_sessions_result$schema,
        jsonSchema: { "type": "array", "items": { "type": "object", "properties": { "sessionId": { "type": "string" }, "title": { "type": "string" }, "cwd": { "type": "string" }, "running": { "type": "boolean" } }, "required": ["sessionId", "title", "running"], "additionalProperties": true } }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 422, "column": 9 }
    },
    "flowspace/snapshot": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#FlowspaceSnapshot",
        create: dsh_flowspace_flowspace_snapshot_result$schema,
        jsonSchema: { "type": "object", "properties": { "document": { "type": "object", "properties": { "version": { "type": "number", "const": 1 }, "id": { "type": "string" }, "title": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "settings": { "type": "object", "properties": { "nativeChatTriggers": { "type": "boolean" }, "reducedMotion": { "type": "boolean" } }, "required": ["nativeChatTriggers", "reducedMotion"], "additionalProperties": true }, "prefs": { "type": "object", "properties": { "theme": { "type": "string", "enum": ["auto", "dark", "light"] }, "wheel": { "type": "string", "enum": ["zoom", "pan"] }, "snap": { "type": "boolean" }, "filter": { "type": "string", "enum": ["auto", "running", "all"] }, "hiddenWorkspaces": { "type": "array", "items": { "type": "string" } } }, "required": [], "additionalProperties": true }, "templates": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "description": { "type": "string" }, "revision": { "type": "number" }, "builtin": { "type": "boolean" }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "w": { "type": "number" }, "h": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } } }, "required": ["id", "title", "description", "revision", "w", "h", "nodes", "edges", "ports"], "additionalProperties": true } }, "snapshots": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "createdAt": { "type": "number" }, "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } }, "viewport": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "zoom": { "type": "number" } }, "required": ["x", "y", "zoom"], "additionalProperties": true }, "summary": { "type": "object", "properties": { "drafts": { "type": "number" }, "stopping": { "type": "number" }, "awaiting": { "type": "number" }, "queued": { "type": "number" }, "recentOutputs": { "type": "array", "items": { "type": "object", "properties": { "title": { "type": "string" }, "snippet": { "type": "string" } }, "required": ["title", "snippet"], "additionalProperties": true } } }, "required": ["drafts", "stopping", "awaiting", "queued", "recentOutputs"], "additionalProperties": true } }, "required": ["id", "title", "createdAt", "nodes", "edges", "viewport"], "additionalProperties": true } } }, "required": ["version", "id", "title", "nodes", "edges", "viewport", "settings"], "additionalProperties": true }, "runs": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "origin": { "type": "string", "enum": ["canvas", "chat"] }, "state": { "type": "string", "enum": ["paused", "running", "waiting", "completed", "cancelled", "interrupted", "error"] }, "createdAt": { "type": "number" }, "scope": { "type": "array", "items": { "type": "string" } }, "roots": { "type": "array", "items": { "type": "string" } }, "participants": { "type": "array", "items": { "type": "string" } }, "graph": { "type": "object", "properties": { "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } } }, "required": ["nodes", "edges"], "additionalProperties": true }, "steps": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "nodeId": { "type": "string" }, "requestId": { "type": "string" }, "sessionId": { "type": "string" }, "turn": { "type": "number" }, "state": { "type": "string", "enum": ["running", "completed", "interrupted", "error", "queued", "aborted"] }, "iteration": { "type": "number" }, "task": { "type": "string" }, "sources": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["file", "conclusion", "session", "fork", "text"] }, "sourceNodeId": { "type": "string" }, "sourceSessionId": { "type": "string" }, "seq": { "type": "number" }, "title": { "type": "string" }, "text": { "type": "string" }, "capturedAt": { "type": "number" }, "version": { "type": "string" } }, "required": ["id", "kind", "sourceNodeId", "title", "text", "capturedAt"], "additionalProperties": true } }, "createdAt": { "type": "number" }, "endedAt": { "type": "number" }, "endSeq": { "type": "number" }, "output": { "type": "string" }, "error": { "type": "string" } }, "required": ["id", "nodeId", "requestId", "state", "iteration", "task", "sources", "createdAt"], "additionalProperties": true } }, "tokens": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "edgeId": { "type": "string" }, "stepId": { "type": "string" }, "source": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["file", "conclusion", "session", "fork", "text"] }, "sourceNodeId": { "type": "string" }, "sourceSessionId": { "type": "string" }, "seq": { "type": "number" }, "title": { "type": "string" }, "text": { "type": "string" }, "capturedAt": { "type": "number" }, "version": { "type": "string" } }, "required": ["id", "kind", "sourceNodeId", "title", "text", "capturedAt"], "additionalProperties": true }, "ready": { "type": "boolean" }, "consumed": { "type": "boolean" }, "boundary": { "type": "boolean" }, "dismissed": { "type": "boolean" } }, "required": ["id", "edgeId", "stepId", "source", "ready", "consumed", "boundary", "dismissed"], "additionalProperties": true } }, "notes": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "title", "origin", "state", "createdAt", "scope", "roots", "participants", "graph", "steps", "tokens", "notes"], "additionalProperties": true } }, "live": { "type": "array", "items": { "type": "object", "properties": { "nodeId": { "type": "string" }, "sessionId": { "type": "string" }, "running": { "type": "boolean" }, "output": { "type": "string" }, "seq": { "type": "number" }, "pendingInput": { "type": "array", "items": { "type": "string" } } }, "required": ["nodeId", "sessionId", "running", "output", "seq", "pendingInput"], "additionalProperties": true } } }, "required": ["document", "runs", "live"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 306, "column": 3 }
    },
    "flowspace/start": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#StartRequest",
            create: dsh_flowspace_flowspace_start_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "nodeIds": { "type": "array", "items": { "type": "string" } }, "kind": { "type": "string", "enum": ["group", "global", "single", "selection"] }, "excludeRootIds": { "type": "array", "items": { "type": "string" } } }, "required": ["nodeIds", "kind"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#StartRequest",
            create: dsh_flowspace_flowspace_start_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "nodeIds": { "type": "array", "items": { "type": "string" } }, "kind": { "type": "string", "enum": ["group", "global", "single", "selection"] }, "excludeRootIds": { "type": "array", "items": { "type": "string" } } }, "required": ["nodeIds", "kind"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace/types#FlowspaceRun",
        create: dsh_flowspace_flowspace_start_result$schema,
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "origin": { "type": "string", "enum": ["canvas", "chat"] }, "state": { "type": "string", "enum": ["paused", "running", "waiting", "completed", "cancelled", "interrupted", "error"] }, "createdAt": { "type": "number" }, "scope": { "type": "array", "items": { "type": "string" } }, "roots": { "type": "array", "items": { "type": "string" } }, "participants": { "type": "array", "items": { "type": "string" } }, "graph": { "type": "object", "properties": { "nodes": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["agent", "note", "file", "display", "group", "board", "detail"] }, "title": { "type": "string" }, "x": { "type": "number" }, "y": { "type": "number" }, "width": { "type": "number" }, "height": { "type": "number" }, "expanded": { "type": "boolean" }, "parentId": { "type": "string" }, "sessionId": { "type": "string" }, "workspaceId": { "type": "string" }, "cwd": { "type": "string" }, "agentPreset": { "type": "string" }, "task": { "type": "string" }, "draft": { "type": "string" }, "nativeTrigger": { "type": "string", "enum": ["inherit", "enabled", "disabled"] }, "participation": { "type": "string", "enum": ["global", "manual", "paused"] }, "text": { "type": "string" }, "sourceNodeId": { "type": "string" }, "sourceSeq": { "type": "number" }, "fixed": { "type": "boolean" }, "collapsed": { "type": "boolean" }, "lastSubmittedTask": { "type": "string" }, "tab": { "type": "string", "enum": ["task", "conversation", "execution"], "description": "Optional rich canvas UI metadata persisted in DSH storageDomain" }, "pinned": { "type": "boolean" }, "roleLabel": { "type": "string" }, "rerun": { "type": "string", "enum": ["change", "update", "always"] }, "color": { "type": "string", "enum": ["violet", "teal", "blue", "amber"] }, "ports": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "direction": { "type": "string", "enum": ["in", "out"] }, "name": { "type": "string" }, "nodes": { "type": "array", "items": { "type": "string" } }, "hidden": { "type": "boolean" } }, "required": ["id", "kind", "direction", "name", "nodes", "hidden"], "additionalProperties": true } }, "templateId": { "type": "string" }, "templateRevision": { "type": "number" }, "templateSlotId": { "type": "string" }, "titleKey": { "type": "string" }, "window": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "w": { "type": "number" }, "h": { "type": "number" }, "snap": { "type": "string", "enum": ["left", "right", "max"] }, "z": { "type": "number" } }, "required": ["x", "y", "w", "h"], "additionalProperties": true }, "columns": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "cards": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" } }, "required": ["id", "text"], "additionalProperties": true } } }, "required": ["id", "name", "cards"], "additionalProperties": true } }, "items": { "type": "array", "items": { "type": "string" } }, "selectedItems": { "type": "array", "items": { "type": "string" } }, "nudge": { "type": "object", "properties": { "by": { "type": "string" }, "origY": { "type": "number" }, "origH": { "type": "number" } }, "required": ["by"], "additionalProperties": true } }, "required": ["id", "kind", "title", "x", "y", "width", "height", "expanded", "task", "draft", "nativeTrigger", "participation", "text", "fixed", "collapsed"], "additionalProperties": true } }, "edges": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "source": { "type": "string" }, "target": { "type": "string" }, "kind": { "type": "string", "enum": ["reference", "continuation"] }, "mode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "trigger": { "type": "string", "enum": ["off", "auto", "confirm"] }, "maxRounds": { "type": "number" }, "always": { "type": "boolean" }, "sentVersion": { "type": "string" }, "originMode": { "type": "string", "enum": ["conclusion", "session", "fork"] }, "waypoints": { "type": "array", "items": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } }, "required": ["x", "y"], "additionalProperties": true } }, "placedCapsules": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "source", "target", "kind", "mode", "trigger", "maxRounds", "always"], "additionalProperties": true } } }, "required": ["nodes", "edges"], "additionalProperties": true }, "steps": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "nodeId": { "type": "string" }, "requestId": { "type": "string" }, "sessionId": { "type": "string" }, "turn": { "type": "number" }, "state": { "type": "string", "enum": ["running", "completed", "interrupted", "error", "queued", "aborted"] }, "iteration": { "type": "number" }, "task": { "type": "string" }, "sources": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["file", "conclusion", "session", "fork", "text"] }, "sourceNodeId": { "type": "string" }, "sourceSessionId": { "type": "string" }, "seq": { "type": "number" }, "title": { "type": "string" }, "text": { "type": "string" }, "capturedAt": { "type": "number" }, "version": { "type": "string" } }, "required": ["id", "kind", "sourceNodeId", "title", "text", "capturedAt"], "additionalProperties": true } }, "createdAt": { "type": "number" }, "endedAt": { "type": "number" }, "endSeq": { "type": "number" }, "output": { "type": "string" }, "error": { "type": "string" } }, "required": ["id", "nodeId", "requestId", "state", "iteration", "task", "sources", "createdAt"], "additionalProperties": true } }, "tokens": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "edgeId": { "type": "string" }, "stepId": { "type": "string" }, "source": { "type": "object", "properties": { "id": { "type": "string" }, "kind": { "type": "string", "enum": ["file", "conclusion", "session", "fork", "text"] }, "sourceNodeId": { "type": "string" }, "sourceSessionId": { "type": "string" }, "seq": { "type": "number" }, "title": { "type": "string" }, "text": { "type": "string" }, "capturedAt": { "type": "number" }, "version": { "type": "string" } }, "required": ["id", "kind", "sourceNodeId", "title", "text", "capturedAt"], "additionalProperties": true }, "ready": { "type": "boolean" }, "consumed": { "type": "boolean" }, "boundary": { "type": "boolean" }, "dismissed": { "type": "boolean" } }, "required": ["id", "edgeId", "stepId", "source", "ready", "consumed", "boundary", "dismissed"], "additionalProperties": true } }, "notes": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "title", "origin", "state", "createdAt", "scope", "roots", "participants", "graph", "steps", "tokens", "notes"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 354, "column": 3 }
    },
    "flowspace/stopNode": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "nodeId",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace#flowspace/stopNode:nodeId",
            create: dsh_flowspace_flowspace_stopNode_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace#flowspace/stopNode:nodeId",
            create: dsh_flowspace_flowspace_stopNode_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/stopNode:result",
        create: dsh_flowspace_flowspace_stopNode_result$schema,
        jsonSchemaError: "typert tool schema: unsupported void value"
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 522, "column": 3 }
    },
    "flowspace/workspaceFiles": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "request",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#WorkspaceFilesRequest",
            create: dsh_flowspace_flowspace_workspaceFiles_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "cwd": { "type": "string" } }, "required": [], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-flowspace/types#WorkspaceFilesRequest",
            create: dsh_flowspace_flowspace_workspaceFiles_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "cwd": { "type": "string" } }, "required": [], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/workspaceFiles:result",
        create: dsh_flowspace_flowspace_workspaceFiles_result$schema,
        jsonSchema: { "type": "array", "items": { "type": "string" } }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 448, "column": 9 }
    },
    "flowspace/workspaces": {
      service: "flowspace",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "dsh-flowspace#flowspace/workspaces:result",
        create: dsh_flowspace_flowspace_workspaces_result$schema,
        jsonSchema: { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "path": { "type": "string" } }, "required": ["id", "name", "path"], "additionalProperties": true } }
      },
      sourceLocation: { "file": "packages/flowspace/src/index.ts", "line": 442, "column": 3 }
    }
  }
}, import_zod.z);

// packages/flowspace/src/client/CanvasApp.tsx
var import_react3 = require("react");

// packages/flowspace/src/core/document.ts
var uid = () => crypto.randomUUID();
function emptyDocument() {
  return {
    version: 1,
    id: "main",
    title: "FlowSpace",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { nativeChatTriggers: true, reducedMotion: false }
  };
}
var DEFAULT_DIMS = {
  agent: [312, 392],
  note: [276, 200],
  file: [300, 286],
  display: [300, 252],
  group: [1152, 474],
  board: [520, 310],
  detail: [340, 362]
};
function boardSummaryText(columns, selectedIds) {
  const chosen = selectedIds?.length ? new Set(selectedIds) : null;
  const lines = [];
  for (const col of columns) {
    const cards = chosen ? col.cards.filter((c) => chosen.has(c.id)) : col.cards;
    if (!cards.length) continue;
    lines.push(`[${col.name}]`);
    for (const card of cards) lines.push(`- ${card.text}`);
  }
  return lines.join("\n");
}
function newNode(kind, x, y, title) {
  const [width, height] = DEFAULT_DIMS[kind] ?? [312, 260];
  const columns = kind === "board" ? [
    {
      id: uid(),
      name: "\u5F85\u529E",
      cards: [{ id: uid(), text: "\u68B3\u7406\u6838\u5FC3\u9700\u6C42\u4E0E\u9A8C\u6536\u8FB9\u754C" }]
    },
    { id: uid(), name: "\u8FDB\u884C\u4E2D", cards: [] },
    { id: uid(), name: "\u5B8C\u6210", cards: [] }
  ] : void 0;
  return {
    id: uid(),
    kind,
    title: title ?? {
      agent: "\u65B0 Agent",
      note: "\u4FBF\u7B7E",
      file: "\u6587\u4EF6\u5F15\u7528",
      display: "\u5C55\u793A\u7ED3\u679C",
      group: "\u5DE5\u4F5C\u6D41",
      board: "\u4EFB\u52A1\u770B\u677F",
      detail: "\u6267\u884C\u8BE6\u60C5"
    }[kind],
    x,
    y,
    width,
    height,
    expanded: kind === "agent" || kind === "board" || kind === "detail",
    task: "",
    draft: "",
    nativeTrigger: "inherit",
    participation: "global",
    text: columns ? boardSummaryText(columns) : "",
    fixed: kind !== "detail",
    collapsed: false,
    ...kind === "agent" ? { tab: "task", rerun: "change" } : {},
    ...kind === "group" ? { color: "violet", ports: [] } : {},
    ...columns ? { columns, selectedItems: [] } : {}
  };
}
function newEdge(source, target, kind) {
  return {
    id: uid(),
    source,
    target,
    kind,
    mode: "conclusion",
    trigger: kind === "reference" ? "off" : "auto",
    maxRounds: 3,
    always: false,
    waypoints: []
  };
}
function members(doc, groupId) {
  return doc.nodes.filter((n) => n.parentId === groupId).flatMap((n) => n.kind === "group" ? members(doc, n.id) : [n.id]);
}
function groupDescendants(doc, groupId) {
  return doc.nodes.filter((n) => n.parentId === groupId).flatMap((n) => [
    n.id,
    ...n.kind === "group" ? groupDescendants(doc, n.id) : []
  ]);
}
function sample(doc, kind, placement) {
  const copy = structuredClone(doc);
  const baseX = copy.nodes.length ? Math.max(...copy.nodes.map((n) => n.x + n.width)) + 120 : 40;
  const baseY = 180;
  const group = {
    ...newNode(
      "group",
      baseX - 24,
      baseY - 54,
      kind === "review" ? "\u5206\u6790\u4E0E\u5BA1\u67E5\u5DE5\u4F5C\u6D41" : "\u5E76\u884C\u8C03\u67E5\u5DE5\u4F5C\u6D41"
    ),
    color: kind === "review" ? "violet" : "teal",
    width: kind === "review" ? 1152 : 782,
    height: 474
  };
  const prompts = kind === "review" ? [
    [
      "\u5206\u6790\u9879\u76EE",
      "\u9605\u8BFB\u5F53\u524D\u5DE5\u4F5C\u533A\uFF0C\u7B80\u8981\u8BF4\u660E\u9879\u76EE\u7528\u9014\u3001\u6838\u5FC3\u67B6\u6784\u4E0E\u6700\u503C\u5F97\u6539\u8FDB\u7684\u4E00\u70B9\u3002\u5148\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      "implementation",
      true
    ],
    [
      "\u5BA1\u67E5\u5EFA\u8BAE",
      "\u5BA1\u67E5\u4E0A\u6E38\u5EFA\u8BAE\u7684\u53EF\u884C\u6027\uFF0C\u6838\u5BF9\u8BC1\u636E\u3001\u8FB9\u754C\u98CE\u9669\u4E0E\u4E0D\u8DB3\u3002\u5148\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      "review",
      true
    ],
    [
      "\u6C47\u603B\u7ED3\u8BBA",
      "\u7ED3\u5408\u4E0A\u6E38\u5BA1\u67E5\u7ED3\u8BBA\uFF0C\u7ED9\u51FA\u7ED3\u6784\u6E05\u6670\u3001\u53EF\u6267\u884C\u7684\u884C\u52A8\u6E05\u5355\u3002",
      "delivery",
      true
    ]
  ] : [
    [
      "\u63A2\u7D22\u67B6\u6784",
      "\u9605\u8BFB\u5DE5\u4F5C\u533A\uFF0C\u6982\u62EC\u6574\u4F53\u67B6\u6784\u3001\u6838\u5FC3\u6A21\u5757\u4E0E\u6570\u636E\u6D41\u3002\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      "implementation",
      false
    ],
    [
      "\u8C03\u67E5\u9A8C\u8BC1",
      "\u9605\u8BFB\u5DE5\u4F5C\u533A\uFF0C\u6982\u62EC\u6D4B\u8BD5\u8986\u76D6\u3001\u7C7B\u578B\u68C0\u67E5\u4E0E\u96C6\u6210\u9A8C\u8BC1\u65B9\u5F0F\u3002\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      "implementation",
      false
    ],
    [
      "\u6C47\u603B\u7ED3\u8BBA",
      "\u7B49\u4E24\u8DEF\u8C03\u67E5\u5B8C\u6210\uFF0C\u7EFC\u5408\u6574\u7406\u51FA\u4E00\u4EFD\u6709\u660E\u786E\u4E0B\u4E00\u6B65\u5EFA\u8BAE\u7684\u9879\u76EE\u6982\u89C8\u3002",
      "review",
      true
    ]
  ];
  const nodes = prompts.map(([title, task, roleLabel, full], i) => ({
    ...newNode(
      "agent",
      baseX + (kind === "parallel" ? i === 2 ? 396 : 0 : i * 396),
      kind === "parallel" ? i === 0 ? baseY + 12 : i === 1 ? baseY + 214 : baseY : baseY,
      title
    ),
    ...placement,
    parentId: group.id,
    expanded: full,
    roleLabel,
    task,
    draft: task
  }));
  const note = {
    ...newNode("note", baseX, baseY - 146, "\u9A8C\u6536\u6807\u51C6"),
    text: "\u5148\u53EA\u8BFB\u6838\u5BF9\u4EE3\u7801\u4E8B\u5B9E\uFF0C\u4FDD\u6301\u7ED3\u8BBA\u7CBE\u70BC\u53EF\u9A8C\u8BC1\uFF1B\u786E\u8BA4\u65E0\u8BEF\u540E\u518D\u653E\u884C\u6574\u7406\u4EA4\u4ED8\u6E05\u5355\u3002",
    expanded: false,
    pinned: true
  };
  const edges = kind === "review" ? [
    newEdge(nodes[0].id, nodes[1].id, "continuation"),
    {
      ...newEdge(nodes[1].id, nodes[2].id, "continuation"),
      trigger: "confirm"
    },
    newEdge(note.id, nodes[2].id, "reference")
  ] : [
    newEdge(nodes[0].id, nodes[2].id, "continuation"),
    newEdge(nodes[1].id, nodes[2].id, "continuation"),
    newEdge(note.id, nodes[2].id, "reference")
  ];
  copy.nodes.push(group, note, ...nodes);
  copy.edges.push(...edges);
  return copy;
}

// packages/flowspace/src/client/icons.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ICONS = {
  bench: "M2 3h12v10H2z M6 3v10 M6 8h8",
  hand: "M6.5 2.5v5 M8.5 2v5.5 M10.5 3v4.8 M4.5 5v3.5L3.3 7.3a1.2 1.2 0 0 0-1.8 1.5l2.7 3.7c.7.9 1.7 1.5 2.9 1.5h2.4c2 0 3.5-1.5 3.5-3.5V5.5a1 1 0 0 0-2 0",
  pointer: "M4 2.5l8 5.8-3.6.7 1.9 3.9-1.7.8-1.9-3.9L4 12.2z",
  chat: "M2.5 3.5h11v7H8l-3 2.5v-2.5H2.5z",
  canvas: "M2 3h4v3H2z M10 10h4v3h-4z M6 4.5h1.5c2 0 .5 7 2.5 7",
  home: "M2.5 8L8 3l5.5 5 M4 7v6h8V7",
  clock: "M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M8 5v3l2 2",
  box: "M2.5 5L8 2l5.5 3v6L8 14l-5.5-3z M2.5 5L8 8l5.5-3 M8 8v6",
  server: "M3 3h10v4H3z M3 9h10v4H3z M5.5 5h.01 M5.5 11h.01",
  gear: "M8 5.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M8 1.5v2 M8 12.5v2 M1.5 8h2 M12.5 8h2 M3.4 3.4l1.4 1.4 M11.2 11.2l1.4 1.4 M12.6 3.4l-1.4 1.4 M4.8 11.2l-1.4 1.4",
  agent: "M3.5 6h9v6.5h-9z M8 6V3.5 M6.2 9.2h.01 M9.8 9.2h.01",
  project: "M2 4h4l1.5 2H14v7H2z",
  branch: "M5 3v10 M11 3v2.5c0 3-6 2-6 5",
  worktree: "M8 2v12 M8 6l4-2 M8 9L4 7 M8 12l4-2",
  file: "M4 2h5l3 3v9H4z M9 2v3h3",
  git: "M8 2l6 6-6 6-6-6z M8 5.5v5",
  diff: "M4 5h8 M8 2.5v5 M4 12h8",
  web: "M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M2 8h12 M8 2c2.5 2 2.5 10 0 12 M8 2c-2.5 2-2.5 10 0 12",
  term: "M2 3h12v10H2z M4.5 6l2.5 2-2.5 2 M8.5 10.5h3",
  note: "M3 3h10v7l-3 3H3z M10 13v-3h3",
  board: "M2 3h12v10H2z M6 3v10 M10 3v10",
  pin: "M8 10v4 M5 10h6 M6 10V4h4v6",
  pop: "M9 3h4v4 M13 3L8 8 M11 9v4H3V5h4",
  chev: "M6 4l4 4-4 4",
  card: "M2 4h12v8H2z M2 7h12",
  eye: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z M8 6.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3",
  eyeoff: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z M3 3l10 10",
  search: "M7 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M10 10l3.5 3.5",
  plus: "M8 3v10 M3 8h10",
  fit: "M3 6V3h3 M10 3h3v3 M13 10v3h-3 M6 13H3v-3",
  tidy: "M3 4h10 M3 8h6 M3 12h8",
  group: "M3 3h4 M9 3h4 M3 13h4 M9 13h4 M3 3v4 M3 9v4 M13 3v4 M13 9v4",
  x: "M4 4l8 8 M12 4l-8 8",
  moon: "M8 2.5a5.5 5.5 0 1 0 5.5 5.5A4.5 4.5 0 0 1 8 2.5z",
  sun: "M8 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M8 1.5v1.8 M8 12.7v1.8 M1.5 8h1.8 M12.7 8h1.8 M3.4 3.4l1.3 1.3 M11.3 11.3l1.3 1.3 M12.6 3.4l-1.3 1.3 M4.7 11.3l-1.3 1.3",
  send: "M8 13V3 M4 7l4-4 4 4",
  undo: "M4 6h6a3 3 0 0 1 0 6H6 M6 3.5L3.5 6 6 8.5",
  redo: "M12 6H6a3 3 0 0 0 0 6h4 M10 3.5L12.5 6 10 8.5",
  more: "M4 8h.01 M8 8h.01 M12 8h.01",
  side: "M2 3h12v10H2z M10 3v10",
  sidebarLeft: "M2 3h12v10H2z M5.5 3v10",
  bottom: "M2 3h12v10H2z M2 10h12",
  play: "M5.5 3.5v9l7-4.5z",
  pause: "M5.5 3.5v9 M10.5 3.5v9",
  stop: "M4.5 4.5h7v7h-7z",
  check: "M3.5 8.5l3 3 6-7",
  off: "M4 8h8",
  bolt: "M9 2L4 9h3.5L7 14l5-7H8.5z",
  quote: "M3.5 5.5h3v3h-3z M9.5 5.5h3v3h-3z M6.5 8.5c0 1.6-1 2.6-2.5 3 M12.5 8.5c0 1.6-1 2.6-2.5 3",
  at: "M8 5.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M10.5 6v3.2c0 1 .7 1.6 1.5 1.6 1 0 2-1 2-2.8a6 6 0 1 0-2.6 5",
  help: "M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M6.4 6.2a1.7 1.7 0 0 1 3.2.7c0 1.1-1.6 1.4-1.6 2.5 M8 11.4h.01",
  download: "M8 2.5v7.5 M5 7.5L8 10.5l3-3 M3 13h10",
  upload: "M8 10.5V3 M5 6l3-3 3 3 M3 13h10",
  trash: "M3.5 4.5h9 M6 4.5V3h4v1.5 M5 4.5l.6 8.5h4.8l.6-8.5"
};
function Icon2({
  name,
  className = "ic"
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className, viewBox: "0 0 16 16", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: ICONS[name] ?? "" }) });
}
function kindIconName(kind) {
  switch (kind) {
    case "agent":
      return "agent";
    case "file":
    case "files":
      return "file";
    case "note":
      return "note";
    case "display":
      return "quote";
    case "board":
      return "board";
    case "detail":
      return "card";
    case "group":
      return "canvas";
    default:
      return "card";
  }
}
function BrandMark() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 32 32", "aria-hidden": "true", className: "fs-brand-svg", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: "fs-brand-bg", x1: "0", y1: "0", x2: "1", y2: "1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "0%", stopColor: "#1e1b2e" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "100%", stopColor: "#12131c" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: "fs-brand-stroke", x1: "0", y1: "0", x2: "1", y2: "1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "0%", stopColor: "#9e8cfc" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "100%", stopColor: "#6fd0ff" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "32", height: "32", rx: "9", fill: "url(#fs-brand-bg)" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        x: "6",
        y: "7.5",
        width: "7.5",
        height: "6",
        rx: "2",
        fill: "none",
        stroke: "#9e8cfc",
        strokeWidth: "1.8"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        x: "18.5",
        y: "18.5",
        width: "7.5",
        height: "6",
        rx: "2",
        fill: "none",
        stroke: "#6fd0ff",
        strokeWidth: "1.8"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "path",
      {
        d: "M13.5 10.5 C 18 10.5, 14 21.5, 18.5 21.5",
        fill: "none",
        stroke: "url(#fs-brand-stroke)",
        strokeWidth: "2",
        strokeLinecap: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "22.2", cy: "10.5", r: "2.2", fill: "#4cc38a" })
  ] });
}

// packages/flowspace/src/client/geometry.ts
var clamp = (value2, min, max) => Math.max(min, Math.min(max, value2));
var MOTION = {
  tactile: 80,
  fast: 120,
  base: 180,
  region: 250,
  surface: 320,
  hero: 480,
  flash: 900
};
var LOD_ZOOM = 0.7;
var COMPACT_SIZE = {
  agent: [280, 118],
  note: [276, 98],
  file: [264, 86],
  display: [280, 126],
  board: [280, 100],
  detail: [280, 112],
  group: [312, 152]
};
var FULL_SIZE = {
  agent: [336, 412],
  note: [276, 200],
  file: [300, 286],
  display: [300, 252],
  board: [520, 310],
  detail: [340, 362],
  group: [1152, 474]
};
var round = (value2) => Math.round(value2 * 10) / 10;
function isCompactNode(node, lod = false, keepExpanded = false) {
  if (node.kind === "group") return node.collapsed;
  if (!node.expanded) return true;
  if (lod && !node.pinned && !keepExpanded) return true;
  return false;
}
function nodeBox(node, lod = false, keepExpanded = false) {
  if (node.kind === "group") return groupBox(node);
  const compact = isCompactNode(node, lod, keepExpanded);
  if (compact) {
    const [cw, ch] = COMPACT_SIZE[node.kind] ?? [280, 110];
    return { x: node.x, y: node.y, w: cw, h: ch, compact: true };
  }
  const [fw, fh] = FULL_SIZE[node.kind] ?? [320, 280];
  const minW = node.kind === "agent" && node.tab === "conversation" && node.sessionId ? 420 : fw;
  const minH = node.kind === "agent" && node.tab === "conversation" && node.sessionId ? 490 : fh;
  return {
    x: node.x,
    y: node.y,
    w: Math.max(node.width || fw, minW),
    h: Math.max(node.height || fh, minH),
    compact: false
  };
}
function groupBox(group, portRows = 2) {
  if (group.collapsed) {
    return {
      x: group.x,
      y: group.y,
      w: 312,
      h: 96 + Math.max(1, portRows) * 28,
      compact: true
    };
  }
  return {
    x: group.x,
    y: group.y,
    w: Math.max(260, group.width || 850),
    h: Math.max(180, group.height || 474),
    compact: false
  };
}
function bounds(boxes) {
  if (!boxes.length) return { x: 0, y: 0, w: 1e3, h: 600 };
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y
  };
}
function toWorld(view, rect, clientX, clientY) {
  return {
    x: (clientX - rect.left - view.x) / view.zoom,
    y: (clientY - rect.top - view.y) / view.zoom
  };
}
function portY(node, kind, compact) {
  if (kind === "continuation") return compact ? 21 : 24;
  return compact ? node.kind === "agent" ? 78 : 56 : 62;
}
function inferGroupPorts(doc, group) {
  const inside = new Set(members(doc, group.id));
  const inferred = [];
  for (const kind of ["reference", "continuation"]) {
    for (const direction of ["in", "out"]) {
      const matching = doc.edges.filter(
        (e) => e.kind === kind && (direction === "in" ? inside.has(e.target) && !inside.has(e.source) : inside.has(e.source) && !inside.has(e.target))
      );
      for (const edge of matching) {
        const nodeId = direction === "in" ? edge.target : edge.source;
        const targetNode = doc.nodes.find((n) => n.id === nodeId);
        if (!targetNode) continue;
        if (!inferred.some(
          (p) => p.kind === kind && p.direction === direction && p.nodes.includes(nodeId)
        )) {
          inferred.push({
            id: `${kind}-${direction}-${nodeId}`,
            kind,
            direction,
            name: targetNode.title,
            nodes: [nodeId],
            hidden: false
          });
        }
      }
    }
  }
  const agents = doc.nodes.filter(
    (n) => n.kind === "agent" && inside.has(n.id)
  );
  if (agents.length && !inferred.some((p) => p.kind === "continuation" && p.direction === "in")) {
    const roots = agents.filter(
      (n) => !doc.edges.some(
        (e) => e.kind === "continuation" && e.target === n.id && inside.has(e.source) && e.trigger !== "off"
      )
    );
    for (const n of roots.length ? roots : [agents[0]]) {
      inferred.push({
        id: `continuation-in-${n.id}`,
        kind: "continuation",
        direction: "in",
        name: n.title,
        nodes: [n.id],
        hidden: false
      });
    }
  }
  if (agents.length && !inferred.some((p) => p.kind === "continuation" && p.direction === "out")) {
    const leaves = agents.filter(
      (n) => !doc.edges.some(
        (e) => e.kind === "continuation" && e.source === n.id && inside.has(e.target) && e.trigger !== "off"
      )
    );
    for (const n of leaves.length ? leaves : [agents[agents.length - 1]]) {
      inferred.push({
        id: `continuation-out-${n.id}`,
        kind: "continuation",
        direction: "out",
        name: n.title,
        nodes: [n.id],
        hidden: false
      });
    }
  }
  const customized = group.ports ?? [];
  const mergedKeys = new Set(
    customized.filter((p) => p.nodes.length > 1).flatMap((p) => p.nodes.map((id) => `${p.kind}-${p.direction}-${id}`))
  );
  return [
    ...customized,
    ...inferred.filter(
      (p) => !customized.some(
        (c) => c.id === p.id || c.kind === p.kind && c.direction === p.direction && p.nodes.every((id) => c.nodes.includes(id))
      ) && !mergedKeys.has(p.id)
    )
  ];
}
function collapsedAncestor(doc, nodeId) {
  let current = doc.nodes.find((n) => n.id === nodeId);
  let collapsed;
  while (current?.parentId) {
    const parent = doc.nodes.find((n) => n.id === current.parentId);
    if (!parent) break;
    if (parent.kind === "group" && parent.collapsed) collapsed = parent;
    current = parent;
  }
  return collapsed;
}
function endpoint(doc, nodeId, kind, direction, lod = false, keepExpandedIds) {
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) return { x: 0, y: 0, box: { x: 0, y: 0, w: 0, h: 0 } };
  const collapsed = collapsedAncestor(doc, nodeId);
  if (collapsed) {
    const allPorts = inferGroupPorts(doc, collapsed).filter((p) => !p.hidden);
    const dirPorts = allPorts.filter((p) => p.direction === direction);
    const rows = Math.max(
      allPorts.filter((p) => p.direction === "in").length,
      allPorts.filter((p) => p.direction === "out").length
    );
    const idx = Math.max(
      0,
      dirPorts.findIndex((p) => p.kind === kind && p.nodes.includes(nodeId))
    );
    const box2 = groupBox(collapsed, rows);
    return {
      x: direction === "out" ? box2.x + box2.w : box2.x,
      y: box2.y + 80 + idx * 28,
      groupId: collapsed.id,
      box: box2
    };
  }
  const box = nodeBox(node, lod, keepExpandedIds?.has(node.id));
  return {
    x: box.x + (direction === "out" ? box.w : 0),
    y: box.y + portY(node, kind, !!box.compact),
    box
  };
}
function rounded(points, radius = 16) {
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1], corner = points[i], after = points[i + 1];
    const inLen = Math.hypot(corner.x - before.x, corner.y - before.y) || 1, outLen = Math.hypot(after.x - corner.x, after.y - corner.y) || 1, r = Math.min(radius, inLen / 2, outLen / 2);
    path += ` L ${round(corner.x - (corner.x - before.x) / inLen * r)} ${round(corner.y - (corner.y - before.y) / inLen * r)} Q ${round(corner.x)} ${round(corner.y)} ${round(corner.x + (after.x - corner.x) / outLen * r)} ${round(corner.y + (after.y - corner.y) / outLen * r)}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${round(last.x)} ${round(last.y)}`;
}
function route(from, to, waypoints = []) {
  const pts = [from, ...waypoints, to];
  if (pts.length === 2 && to.x < from.x + 24) {
    const a = from.box ?? { x: from.x, y: from.y, w: 0, h: 0 }, b = to.box ?? { x: to.x, y: to.y, w: 0, h: 0 }, stub = 22;
    const lane = a.y + a.h + 20 <= b.y ? (a.y + a.h + b.y) / 2 : b.y + b.h + 20 <= a.y ? (b.y + b.h + a.y) / 2 : Math.max(a.y + a.h, b.y + b.h) + 34;
    const x1 = from.x + stub, x2 = to.x - stub;
    return {
      path: rounded([
        from,
        { x: x1, y: from.y },
        { x: x1, y: lane },
        { x: x2, y: lane },
        { x: x2, y: to.y },
        to
      ]),
      label: { x: (x1 + x2) / 2, y: lane },
      tight: Math.abs(x1 - x2) < 140
    };
  }
  let path = `M ${round(from.x)} ${round(from.y)}`;
  let label = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], reach = clamp(Math.abs(b.x - a.x) * 0.48, 36, 180);
    path += ` C ${round(a.x + reach)} ${round(a.y)}, ${round(b.x - reach)} ${round(b.y)}, ${round(b.x)} ${round(b.y)}`;
    if (i === Math.ceil((pts.length - 1) / 2)) {
      label = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }
  return { path, label, tight: Math.abs(to.x - from.x) < 140 };
}
function exchangeRoute(a, b) {
  const row = b.y < a.y + a.h - 4 && a.y < b.y + b.h - 4;
  const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), gap = b.y >= a.y ? b.y - a.y - a.h : a.y - b.y - b.h;
  const side = !row && overlap > 40 && gap < 70;
  const facing = (box, other) => clamp(other.x + other.w / 2, box.x + 28, box.x + box.w - 28);
  let p, q, c1, c2;
  if (side) {
    p = { x: a.x + a.w, y: a.y + a.h / 2 };
    q = { x: b.x + b.w, y: b.y + b.h / 2 };
    const out = Math.max(p.x, q.x) + clamp(Math.abs(q.y - p.y) * 0.35, 30, 56);
    c1 = { x: out, y: p.y };
    c2 = { x: out, y: q.y };
  } else if (row) {
    p = { x: facing(a, b), y: a.y + a.h };
    q = { x: facing(b, a), y: b.y + b.h };
    const dip = clamp(Math.abs(q.x - p.x) * 0.2, 30, 84), lean = (q.x - p.x) * 0.18;
    c1 = { x: p.x + lean, y: p.y + dip };
    c2 = { x: q.x - lean, y: q.y + dip };
  } else {
    const down = b.y >= a.y;
    p = { x: facing(a, b), y: down ? a.y + a.h : a.y };
    q = { x: facing(b, a), y: down ? b.y : b.y + b.h };
    const half = (q.y - p.y) / 2;
    c1 = { x: p.x, y: p.y + half };
    c2 = { x: q.x, y: q.y - half };
  }
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, bow = Math.min(clamp(len * 0.09, 9, 20), len / 2);
  const strand = (k) => {
    const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1, sn = Math.sign(nx) || 1;
    const start = side ? { x: 0, y: 3.5 * k * sy } : row ? { x: -3.5 * k * sx, y: 0 } : { x: 3.5 * k * sn, y: 0 };
    const end = side ? { x: 0, y: -3.5 * k * sy } : row ? { x: 3.5 * k * sx, y: 0 } : start;
    return [
      { x: p.x + start.x, y: p.y + start.y },
      { x: c1.x + nx * bow * k, y: c1.y + ny * bow * k },
      { x: c2.x + nx * bow * k, y: c2.y + ny * bow * k },
      { x: q.x + end.x, y: q.y + end.y }
    ];
  };
  const cubic = (pts) => `M ${round(pts[0].x)} ${round(pts[0].y)} C ${pts.slice(1).map((pt) => `${round(pt.x)} ${round(pt.y)}`).join(", ")}`;
  return {
    out: cubic(strand(1)),
    back: cubic(strand(-1).reverse()),
    side,
    label: {
      x: (p.x + 3 * c1.x + 3 * c2.x + q.x) / 8 + (side ? 14 : 0),
      y: (p.y + 3 * c1.y + 3 * c2.y + q.y) / 8
    }
  };
}
function fit(viewport, boxes, maxZoom = 1) {
  const box = bounds(boxes);
  const zoom = clamp(
    Math.min(
      (viewport.width - 72) / Math.max(box.w, 1),
      (viewport.height - 156) / Math.max(box.h, 1)
    ),
    0.2,
    maxZoom
  );
  return {
    x: (viewport.width - box.w * zoom) / 2 - box.x * zoom,
    y: (viewport.height - box.h * zoom) / 2 - box.y * zoom + 6,
    zoom
  };
}
function zoomAt(view, rect, clientX, clientY, factor) {
  const px = clientX - rect.left, py = clientY - rect.top, zoom = clamp(view.zoom * factor, 0.2, 2.2);
  return {
    x: px - (px - view.x) * zoom / view.zoom,
    y: py - (py - view.y) * zoom / view.zoom,
    zoom
  };
}
function bezier(x1, y1, x2, y2) {
  return (x) => {
    let lo = 0, hi = 1, t2 = x;
    const val = (a, b, u) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
    for (let i = 0; i < 16; i++) {
      const v = val(x1, x2, t2);
      if (v < x) lo = t2;
      else hi = t2;
      t2 = (lo + hi) / 2;
    }
    return val(y1, y2, t2);
  };
}
var easeView = bezier(0.32, 0.72, 0, 1);
function makeRoom(doc, expandedNode) {
  const gap = 24;
  const settled = [nodeBox(expandedNode)];
  const below = doc.nodes.filter(
    (other) => other.id !== expandedNode.id && other.kind !== "group" && !other.window && other.y >= expandedNode.y - 8
  ).sort((a, b) => a.y - b.y);
  for (const other of below) {
    const box = nodeBox(other);
    const overlaps = settled.filter(
      (s) => box.x < s.x + s.w - 4 && box.x + box.w > s.x + 4 && box.y < s.y + s.h + gap && box.y + box.h > s.y
    );
    if (!overlaps.length) continue;
    const nextY = Math.max(...overlaps.map((s) => s.y + s.h + gap));
    if (nextY > other.y) {
      if (!other.nudge) other.nudge = { by: expandedNode.id, origY: other.y };
      other.y = nextY;
    }
    settled.push(nodeBox(other));
  }
  let parentId = expandedNode.parentId;
  while (parentId) {
    const g = doc.nodes.find((n) => n.id === parentId && n.kind === "group");
    if (!g) break;
    const memberIds = members(doc, g.id);
    const memberBoxes = doc.nodes.filter((n) => memberIds.includes(n.id)).map((n) => nodeBox(n));
    if (memberBoxes.length) {
      const b = bounds(memberBoxes);
      const neededH = b.y + b.h + 28 - g.y;
      const neededW = b.x + b.w + 28 - g.x;
      if (neededH > g.height) {
        if (!g.nudge) g.nudge = { by: expandedNode.id, origH: g.height };
        g.height = neededH;
      }
      if (neededW > g.width) g.width = neededW;
    }
    parentId = g.parentId;
  }
}
function giveRoomBack(doc, collapsedNode) {
  for (const other of doc.nodes) {
    if (other.nudge?.by === collapsedNode.id) {
      if (other.nudge.origY !== void 0) other.y = other.nudge.origY;
      if (other.nudge.origH !== void 0) other.height = other.nudge.origH;
      delete other.nudge;
    }
  }
}

// packages/flowspace/src/client/templates.ts
function tplAgent(slotId, title, x, y, task, opts = {}) {
  return {
    ...newNode("agent", x, y, title),
    id: slotId,
    templateSlotId: slotId,
    task,
    draft: task,
    expanded: opts.expanded ?? true,
    ...opts
  };
}
function builtinTemplates() {
  const reviewNodes = [
    tplAgent(
      "slot-analyze",
      "\u5206\u6790\u9879\u76EE",
      24,
      54,
      "\u9605\u8BFB\u5F53\u524D\u5DE5\u4F5C\u533A\uFF0C\u7B80\u8981\u8BF4\u660E\u9879\u76EE\u7528\u9014\u3001\u6838\u5FC3\u67B6\u6784\u4EE5\u53CA\u6700\u503C\u5F97\u6539\u8FDB\u7684\u4E00\u70B9\u3002\u5148\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      { roleLabel: "implementation" }
    ),
    tplAgent(
      "slot-review",
      "\u5BA1\u67E5\u5EFA\u8BAE",
      408,
      54,
      "\u5BA1\u67E5\u4E0A\u6E38\u5EFA\u8BAE\u7684\u53EF\u884C\u6027\uFF0C\u6838\u5BF9\u4EE3\u7801\u8BC1\u636E\u3001\u6F5C\u5728\u98CE\u9669\u4E0E\u8FB9\u754C\u6761\u4EF6\u3002\u5148\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      { roleLabel: "review" }
    ),
    tplAgent(
      "slot-deliver",
      "\u6C47\u603B\u7ED3\u8BBA",
      792,
      54,
      "\u7ED3\u5408\u4E0A\u6E38\u5BA1\u67E5\u7ED3\u8BBA\uFF0C\u6574\u7406\u51FA\u4E00\u4EFD\u7B80\u6D01\u3001\u53EF\u76F4\u63A5\u6267\u884C\u7684\u884C\u52A8\u6E05\u5355\u4E0E\u9A8C\u6536\u9879\u3002",
      { roleLabel: "delivery" }
    )
  ];
  const reviewEdges = [
    { ...newEdge("slot-analyze", "slot-review", "continuation"), id: "e-1" },
    {
      ...newEdge("slot-review", "slot-deliver", "continuation"),
      id: "e-2",
      trigger: "confirm"
    }
  ];
  const parallelNodes = [
    tplAgent(
      "slot-res1",
      "\u63A2\u7D22\u67B6\u6784\u4E0E\u6A21\u5757",
      24,
      64,
      "\u9605\u8BFB\u5F53\u524D\u5DE5\u4F5C\u533A\uFF0C\u6982\u62EC\u67B6\u6784\u5206\u5C42\u3001\u4E3B\u8981\u6A21\u5757\u804C\u8D23\u4E0E\u6570\u636E\u6D41\u3002\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      { expanded: false, roleLabel: "implementation" }
    ),
    tplAgent(
      "slot-res2",
      "\u8C03\u67E5\u6D4B\u8BD5\u4E0E\u7EA6\u675F",
      24,
      236,
      "\u8C03\u67E5\u5F53\u524D\u9879\u76EE\u7684\u7C7B\u578B\u68C0\u67E5\u3001\u5355\u5143\u6D4B\u8BD5\u3001\u96C6\u6210\u9A8C\u6536\u4E0E\u5DE5\u7A0B\u7EA6\u675F\u8FB9\u754C\u3002\u4E0D\u8981\u4FEE\u6539\u6587\u4EF6\u3002",
      { expanded: false, roleLabel: "implementation" }
    ),
    tplAgent(
      "slot-synth",
      "\u6C47\u603B\u7ED3\u8BBA",
      384,
      54,
      "\u7B49\u4E24\u8DEF\u8C03\u67E5\u5168\u90E8\u5B8C\u6210\u540E\uFF0C\u7EFC\u5408\u6574\u7406\u51FA\u4E00\u4EFD\u6709\u660E\u786E\u4E0B\u4E00\u6B65\u63A8\u8350\u7684\u9879\u76EE\u6982\u89C8\u3002",
      { roleLabel: "review" }
    )
  ];
  const parallelEdges = [
    { ...newEdge("slot-res1", "slot-synth", "continuation"), id: "ep-1" },
    { ...newEdge("slot-res2", "slot-synth", "continuation"), id: "ep-2" }
  ];
  const releaseNodes = [
    tplAgent(
      "slot-writer",
      "\u6574\u7406\u53D8\u66F4\u8BF4\u660E",
      24,
      54,
      "\u6839\u636E\u5F53\u524D\u5DE5\u4F5C\u533A\u6700\u8FD1\u7684\u63D0\u4EA4\u4E0E\u6587\u6863\uFF0C\u6574\u7406\u7ED3\u6784\u5316\u7684\u53D8\u66F4\u8BF4\u660E\uFF08\u65B0\u589E\u3001\u6539\u8FDB\u4E0E\u4FEE\u590D\uFF09\u3002",
      { roleLabel: "delivery" }
    ),
    tplAgent(
      "slot-proof",
      "\u53CC\u8BED\u6821\u5BF9\u4E0E\u6838\u9A8C",
      408,
      54,
      "\u7FFB\u8BD1\u5E76\u6821\u5BF9\u4E0A\u6E38\u53D8\u66F4\u8BF4\u660E\uFF0C\u6838\u5BF9\u547D\u4EE4\u3001\u7248\u672C\u53F7\u4E0E\u672F\u8BED\u4E00\u81F4\u6027\uFF0C\u8F93\u51FA\u4E2D\u82F1\u5BF9\u7167\u7248\u672C\u3002",
      { roleLabel: "review" }
    )
  ];
  const releaseEdges = [
    {
      ...newEdge("slot-writer", "slot-proof", "continuation"),
      id: "er-1",
      trigger: "confirm"
    }
  ];
  return [
    {
      id: "builtin-review",
      title: "implementationReview",
      description: "implementationReviewDescription",
      revision: 1,
      builtin: true,
      color: "violet",
      w: 1152,
      h: 492,
      nodes: reviewNodes,
      edges: reviewEdges,
      ports: [
        {
          id: "in-analyze",
          kind: "continuation",
          direction: "in",
          name: "\u5206\u6790\u9879\u76EE",
          nodes: ["slot-analyze"],
          hidden: false
        },
        {
          id: "out-deliver",
          kind: "continuation",
          direction: "out",
          name: "\u6C47\u603B\u7ED3\u8BBA",
          nodes: ["slot-deliver"],
          hidden: false
        }
      ]
    },
    {
      id: "builtin-parallel",
      title: "parallelResearch",
      description: "parallelResearchDescription",
      revision: 1,
      builtin: true,
      color: "teal",
      w: 756,
      h: 492,
      nodes: parallelNodes,
      edges: parallelEdges,
      ports: [
        {
          id: "in-res",
          kind: "reference",
          direction: "in",
          name: "\u8C03\u67E5\u4E0A\u4E0B\u6587",
          nodes: ["slot-res1", "slot-res2"],
          hidden: false
        },
        {
          id: "out-synth",
          kind: "continuation",
          direction: "out",
          name: "\u6C47\u603B\u7ED3\u8BBA",
          nodes: ["slot-synth"],
          hidden: false
        }
      ]
    },
    {
      id: "builtin-release",
      title: "releaseWorkflow",
      description: "releaseWorkflowDescription",
      revision: 1,
      builtin: true,
      color: "blue",
      w: 780,
      h: 492,
      nodes: releaseNodes,
      edges: releaseEdges,
      ports: [
        {
          id: "in-writer",
          kind: "reference",
          direction: "in",
          name: "\u53D8\u66F4\u8F93\u5165",
          nodes: ["slot-writer"],
          hidden: false
        },
        {
          id: "out-proof",
          kind: "continuation",
          direction: "out",
          name: "\u53D1\u5E03\u8BF4\u660E",
          nodes: ["slot-proof"],
          hidden: false
        }
      ]
    }
  ];
}
function allTemplates(doc) {
  return [...builtinTemplates(), ...doc.templates ?? []];
}
function captureTemplate(doc, groupId, title, description) {
  const group = doc.nodes.find((n) => n.id === groupId && n.kind === "group");
  if (!group) throw new Error("\u5DE5\u4F5C\u6D41\u5206\u7EC4\u4E0D\u5B58\u5728");
  const descendantIds = groupDescendants(doc, group.id);
  const inside = new Set(descendantIds);
  const nodes = doc.nodes.filter((n) => inside.has(n.id)).map((n) => {
    const slot = n.templateSlotId ?? n.id;
    const clone = structuredClone(n);
    delete clone.sessionId;
    delete clone.lastSubmittedTask;
    delete clone.window;
    delete clone.nudge;
    return {
      ...clone,
      id: slot,
      templateSlotId: slot,
      parentId: n.parentId === group.id ? void 0 : doc.nodes.find((p) => p.id === n.parentId)?.templateSlotId ?? n.parentId,
      x: n.x - group.x,
      y: n.y - group.y,
      draft: n.task || n.draft
    };
  });
  const slotOf = new Map(
    doc.nodes.filter((n) => inside.has(n.id)).map((n) => [n.id, n.templateSlotId ?? n.id])
  );
  const edges = doc.edges.filter((e) => inside.has(e.source) && inside.has(e.target)).map((e) => {
    const clone = structuredClone(e);
    delete clone.sentVersion;
    delete clone.originMode;
    return {
      ...clone,
      id: uid(),
      source: slotOf.get(e.source),
      target: slotOf.get(e.target),
      waypoints: e.waypoints?.map((p) => ({
        x: p.x - group.x,
        y: p.y - group.y
      }))
    };
  });
  const ports = inferGroupPorts(doc, group).map((p) => ({
    ...structuredClone(p),
    nodes: p.nodes.map((id) => slotOf.get(id) ?? id)
  }));
  return {
    id: uid(),
    title,
    description,
    revision: 1,
    color: group.color ?? "violet",
    w: group.width,
    h: group.height,
    nodes,
    edges,
    ports
  };
}
function instantiateTemplate(doc, template, x, y, displayTitle, placement) {
  const group = {
    ...newNode("group", x, y, displayTitle),
    color: template.color ?? "violet",
    width: template.w,
    height: template.h,
    templateId: template.id,
    templateRevision: template.revision,
    ...template.builtin ? { titleKey: template.title } : {}
  };
  const idMap = /* @__PURE__ */ new Map();
  for (const n of template.nodes) idMap.set(n.id, uid());
  const createdNodes = template.nodes.map((n) => {
    const clone = structuredClone(n);
    delete clone.sessionId;
    delete clone.lastSubmittedTask;
    delete clone.window;
    return {
      ...clone,
      id: idMap.get(n.id),
      templateSlotId: n.templateSlotId ?? n.id,
      parentId: n.parentId ? idMap.get(n.parentId) ?? group.id : group.id,
      x: x + n.x,
      y: y + n.y,
      ...n.kind === "agent" ? {
        workspaceId: placement?.workspaceId,
        cwd: placement?.cwd,
        draft: n.task || n.draft
      } : {}
    };
  });
  const createdEdges = template.edges.map((e) => ({
    ...structuredClone(e),
    id: uid(),
    source: idMap.get(e.source),
    target: idMap.get(e.target),
    waypoints: e.waypoints?.map((p) => ({ x: x + p.x, y: y + p.y }))
  }));
  group.ports = template.ports.map((p) => ({
    ...structuredClone(p),
    id: uid(),
    nodes: p.nodes.map((s) => idMap.get(s)).filter(Boolean)
  }));
  doc.nodes.push(group, ...createdNodes);
  doc.edges.push(...createdEdges);
  return group;
}
function computeSyncPlan(doc, group, template) {
  const desc = groupDescendants(doc, group.id);
  const inside = new Set(desc);
  const members2 = doc.nodes.filter((n) => inside.has(n.id));
  const outside = doc.edges.filter(
    (e) => inside.has(e.source) !== inside.has(e.target)
  ).length;
  const slots = new Set(
    template.nodes.map((n) => n.templateSlotId ?? n.id)
  );
  const memberSlots = new Set(
    members2.map((n) => n.templateSlotId ?? "")
  );
  const added = template.nodes.filter(
    (n) => !memberSlots.has(n.templateSlotId ?? n.id)
  );
  const removed = members2.filter(
    (n) => n.templateSlotId && !slots.has(n.templateSlotId) && !n.sessionId
  );
  const locked = members2.filter((n) => !!n.sessionId);
  const edited = members2.filter((n) => {
    const src = template.nodes.find(
      (t2) => (t2.templateSlotId ?? t2.id) === n.templateSlotId
    );
    return src && n.kind === "agent" && n.task !== src.task;
  });
  return { template, outside, locked, added, removed, edited };
}
function synchronizeTemplate(doc, groupId, template, keepTasks, placement) {
  const group = doc.nodes.find((n) => n.id === groupId && n.kind === "group");
  if (!group) return;
  const desc = groupDescendants(doc, group.id);
  const inside = new Set(desc);
  const existingBySlot = /* @__PURE__ */ new Map();
  for (const n of doc.nodes) {
    if (inside.has(n.id) && n.templateSlotId) {
      existingBySlot.set(n.templateSlotId, n);
    }
  }
  const slotToNodeId = /* @__PURE__ */ new Map();
  group.width = template.w;
  group.height = template.h;
  group.templateRevision = template.revision;
  for (const src of template.nodes) {
    const slot = src.templateSlotId ?? src.id;
    const existing = existingBySlot.get(slot);
    if (existing) {
      slotToNodeId.set(slot, existing.id);
      existing.x = group.x + src.x;
      existing.y = group.y + src.y;
      existing.width = src.width;
      existing.height = src.height;
      if (!keepTasks && !existing.sessionId) {
        existing.title = src.title;
        existing.task = src.task;
        existing.draft = src.task;
        existing.text = src.text;
      }
    } else {
      const freshId = uid();
      slotToNodeId.set(slot, freshId);
      const clone = structuredClone(src);
      delete clone.sessionId;
      delete clone.lastSubmittedTask;
      doc.nodes.push({
        ...clone,
        id: freshId,
        templateSlotId: slot,
        parentId: group.id,
        x: group.x + src.x,
        y: group.y + src.y,
        ...src.kind === "agent" ? {
          workspaceId: placement?.workspaceId,
          cwd: placement?.cwd,
          draft: src.task || src.draft
        } : {}
      });
    }
  }
  const templateSlots = new Set(
    template.nodes.map((n) => n.templateSlotId ?? n.id)
  );
  const dropIds = new Set(
    doc.nodes.filter(
      (n) => inside.has(n.id) && n.templateSlotId && !templateSlots.has(n.templateSlotId) && !n.sessionId
    ).map((n) => n.id)
  );
  if (dropIds.size) {
    doc.nodes = doc.nodes.filter((n) => !dropIds.has(n.id));
    doc.edges = doc.edges.filter(
      (e) => !dropIds.has(e.source) && !dropIds.has(e.target)
    );
  }
  const mappedIds = new Set(slotToNodeId.values());
  const oldInternal = doc.edges.filter(
    (e) => mappedIds.has(e.source) && mappedIds.has(e.target)
  );
  doc.edges = doc.edges.filter(
    (e) => !(mappedIds.has(e.source) && mappedIds.has(e.target))
  );
  for (const e of template.edges) {
    const source = slotToNodeId.get(e.source), target = slotToNodeId.get(e.target);
    if (!source || !target) continue;
    const prev = oldInternal.find(
      (o) => o.source === source && o.target === target && o.kind === e.kind
    );
    doc.edges.push({
      ...structuredClone(e),
      id: prev?.id ?? uid(),
      source,
      target,
      sentVersion: prev?.sentVersion,
      originMode: prev?.originMode,
      mode: prev?.originMode === "fork" ? prev.mode : e.mode,
      waypoints: prev?.waypoints ?? e.waypoints?.map((p) => ({ x: group.x + p.x, y: group.y + p.y }))
    });
  }
  group.ports = template.ports.map((p) => ({
    ...structuredClone(p),
    id: uid(),
    nodes: p.nodes.map((s) => slotToNodeId.get(s)).filter(Boolean)
  }));
}
function buildSnapshot(doc, hostSnapshot, title) {
  const agents = doc.nodes.filter((n) => n.kind === "agent");
  const drafts = agents.filter(
    (n) => !n.sessionId && (n.draft.trim() || n.task.trim())
  ).length;
  const stopping = hostSnapshot?.live.filter((l) => l.running).length ?? 0;
  const awaiting = (hostSnapshot?.runs.filter((r) => ["running", "waiting", "paused"].includes(r.state)).reduce(
    (sum, r) => sum + r.tokens.filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed).length,
    0
  ) ?? 0) + (hostSnapshot?.live.filter((l) => l.pendingInput.length > 0).length ?? 0);
  const queued = hostSnapshot?.runs.filter((r) => r.state === "running").reduce(
    (sum, r) => sum + r.steps.filter((s) => s.state === "queued").length,
    0
  ) ?? 0;
  const recentOutputs = (hostSnapshot?.runs ?? []).flatMap(
    (r) => r.steps.filter((s) => s.state === "completed" && s.output).map((s) => ({
      title: r.graph.nodes.find((n) => n.id === s.nodeId)?.title ?? s.nodeId,
      snippet: s.output.slice(0, 72)
    }))
  ).slice(-3).reverse();
  return {
    id: uid(),
    title,
    createdAt: Date.now(),
    nodes: structuredClone(doc.nodes).map((n) => {
      delete n.window;
      return n;
    }),
    edges: structuredClone(doc.edges),
    viewport: structuredClone(doc.viewport),
    summary: {
      drafts,
      stopping,
      awaiting,
      queued,
      recentOutputs
    }
  };
}

// packages/flowspace/src/client/SurfaceViews.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function formatTime(at) {
  return new Date(at).toLocaleTimeString(
    getLanguage() === "en" ? "en-GB" : "zh-CN",
    { hour: "2-digit", minute: "2-digit" }
  );
}
function formatDate(at) {
  return new Date(at).toLocaleString(
    getLanguage() === "en" ? "en-GB" : "zh-CN",
    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );
}
function nodeStatusOf(snapshot, nodeId) {
  if (snapshot?.runs.some(
    (r) => ["running", "waiting", "paused"].includes(r.state) && r.tokens.some(
      (tk) => !tk.ready && !tk.consumed && !tk.dismissed && r.graph.edges.find((e) => e.id === tk.edgeId)?.target === nodeId
    )
  )) {
    return "waiting";
  }
  const live = snapshot?.live.find((l) => l.nodeId === nodeId);
  if (live?.pendingInput.length) return "input";
  if (live?.running) return "running";
  const lastStep = snapshot?.runs.flatMap((r) => r.steps).filter((s) => s.nodeId === nodeId).at(-1);
  if (lastStep) return lastStep.state;
  const node = snapshot?.document.nodes.find((n) => n.id === nodeId);
  return node?.sessionId ? "completed" : "draft";
}
function MiniGraph({
  nodes,
  edges,
  snapshot
}) {
  const shown = nodes.filter((n) => n.kind !== "group");
  if (!shown.length) return null;
  const boxes = new Map(
    shown.map((n) => [n.id, nodeBox({ ...n, window: null }, false)])
  );
  const all = [...boxes.values()];
  const pad = 44;
  const left = Math.min(...all.map((b) => b.x)) - pad;
  const top = Math.min(...all.map((b) => b.y)) - pad;
  const width = Math.max(...all.map((b) => b.x + b.w)) + pad - left;
  const height = Math.max(...all.map((b) => b.y + b.h)) + pad - top;
  const renderWire = (edge) => {
    const a = boxes.get(edge.source), b = boxes.get(edge.target);
    if (!a || !b) return null;
    const ax = a.x + a.w - left, ay = a.y - top + Math.min(28, a.h / 2), bx = b.x - left, by = b.y - top + Math.min(28, b.h / 2), reach = Math.max(40, Math.abs(bx - ax) * 0.45);
    const cls = edge.kind === "reference" ? "mg-ref" : `mg-flow ${edge.trigger === "confirm" ? "mg-confirm" : ""}`;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "path",
      {
        className: cls,
        vectorEffect: "non-scaling-stroke",
        d: `M${ax} ${ay} C${ax + reach} ${ay}, ${bx - reach} ${by}, ${bx} ${by}`
      },
      edge.id
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "svg",
    {
      className: "mini-graph",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet",
      "aria-hidden": "true",
      children: [
        edges.filter((e) => e.kind === "reference").map(renderWire),
        edges.filter((e) => e.kind === "continuation").map(renderWire),
        shown.map((n) => {
          const b = boxes.get(n.id);
          const x = b.x - left, y = b.y - top;
          const st = snapshot ? nodeStatusOf(snapshot, n.id) : "draft";
          const mgState = n.kind !== "agent" ? "other" : st === "completed" || st === "done" ? "done" : st === "running" ? "running" : st === "waiting" || st === "input" || st === "paused" ? "waiting" : "agent";
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("g", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "rect",
              {
                className: `mg-node mg-${mgState}`,
                vectorEffect: "non-scaling-stroke",
                x,
                y,
                width: b.w,
                height: b.h,
                rx: 20
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "circle",
              {
                className: `mg-dot mg-${mgState}`,
                cx: x + 30,
                cy: y + 30,
                r: n.kind === "agent" ? 13 : 9
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "rect",
              {
                className: "mg-bar",
                x: x + 54,
                y: y + 22,
                width: b.w * 0.5,
                height: 16,
                rx: 8
              }
            ),
            b.h > 150 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "rect",
                {
                  className: "mg-bar",
                  x: x + 24,
                  y: y + 74,
                  width: b.w - 48,
                  height: 12,
                  rx: 6
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "rect",
                {
                  className: "mg-bar",
                  x: x + 24,
                  y: y + 100,
                  width: (b.w - 48) * 0.7,
                  height: 12,
                  rx: 6
                }
              )
            ] })
          ] }, n.id);
        })
      ]
    }
  );
}
function InspectorPanel({
  open,
  doc,
  snapshot,
  workspaces,
  selectedNode,
  selectedEdge,
  onClose,
  onEditNode,
  onEditEdge,
  onDeleteSelection,
  onUngroup,
  onReleaseToken,
  onOpenNativeChat,
  onOpenDetail,
  onOpenWindow,
  onSetGroupPorts,
  onOpenMergePorts,
  onSaveTemplate,
  onSyncTemplate,
  onDetachTemplate
}) {
  const titleOf = (id) => doc.nodes.find((n) => n.id === id)?.title ?? id;
  const renderBody = () => {
    if (selectedEdge) {
      const targetNode = doc.nodes.find((n) => n.id === selectedEdge.target);
      const waitingTokens = snapshot?.runs.filter((r) => ["running", "waiting", "paused"].includes(r.state)).flatMap(
        (run) => run.tokens.filter(
          (tk) => tk.edgeId === selectedEdge.id && !tk.ready && !tk.consumed && !tk.dismissed
        ).map((token) => ({ run, token }))
      ) ?? [];
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "inspector-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "eyebrow", children: t(selectedEdge.kind) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "user-content", children: [
          titleOf(selectedEdge.source),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u2192" }),
          titleOf(selectedEdge.target)
        ] }),
        selectedEdge.kind === "continuation" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("mode") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mode-options", children: [
            ["conclusion", "at"],
            ["session", "clock"],
            ["fork", "branch"]
          ].map(([mode, glyph]) => {
            const disabled = mode === "fork" && (!!targetNode?.sessionId || doc.edges.some(
              (e) => e.id !== selectedEdge.id && e.target === selectedEdge.target && e.mode === "fork"
            ));
            return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: selectedEdge.mode === mode ? "selected" : "",
                disabled,
                title: disabled ? t("draftOnly") : void 0,
                onClick: () => onEditEdge(selectedEdge.id, { mode }),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: glyph }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t(mode) }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: t(`${mode}Description`) })
                  ] })
                ]
              },
              mode
            );
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("trigger") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "choice-buttons", children: [
            ["off", "off"],
            ["auto", "automatic"],
            ["confirm", "confirm"]
          ].map(([value2, labelKey]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: selectedEdge.trigger === value2 ? "selected" : "",
              onClick: () => onEditEdge(selectedEdge.id, { trigger: value2 }),
              children: t(labelKey)
            },
            value2
          )) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", htmlFor: "fs-edge-rounds", children: t("maxRounds") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "rounds-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                id: "fs-edge-rounds",
                type: "number",
                min: 1,
                max: 12,
                value: selectedEdge.maxRounds,
                onChange: (e) => onEditEdge(selectedEdge.id, {
                  maxRounds: Math.max(1, Number(e.target.value) || 3)
                })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("rounds", { count: selectedEdge.maxRounds }) })
          ] }),
          selectedEdge.originMode && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "muted", children: t("createdBy", { mode: t(selectedEdge.originMode) }) })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "inspector-description", children: t(selectedEdge.always ? "alwaysTip" : "pendingTip") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "switch-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("always") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                role: "switch",
                "aria-checked": selectedEdge.always,
                className: "switch",
                onClick: () => onEditEdge(selectedEdge.id, {
                  always: !selectedEdge.always
                })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "reference-list", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Icon2,
              {
                name: kindIconName(
                  doc.nodes.find((n) => n.id === selectedEdge.source)?.kind ?? "file"
                )
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "user-content", children: titleOf(selectedEdge.source) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: t(
              selectedEdge.always ? "always" : selectedEdge.sentVersion ? "sent" : "pending"
            ) })
          ] }) })
        ] }),
        waitingTokens.map(({ run, token }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "approval-box", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "approval-heading", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "pause" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t(token.boundary ? "scopeBoundary" : "waitingConfirmation") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "approval-snippet user-content", children: token.source.text.slice(0, 320) || token.source.title }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "button-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: "button button-amber",
                onClick: () => onReleaseToken(run.id, token.id, true),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "play" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("release") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                className: "button button-quiet",
                onClick: () => onReleaseToken(run.id, token.id, false),
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("dismiss") })
              }
            )
          ] })
        ] }, token.id)),
        (selectedEdge.waypoints?.length ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "text-button",
            onClick: () => onEditEdge(selectedEdge.id, { waypoints: [] }),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "x" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("clearWaypoints") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "inspector-divider" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "text-button danger",
            onClick: onDeleteSelection,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "trash" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("deleteConnection") })
            ]
          }
        )
      ] });
    }
    if (selectedNode?.kind === "group") {
      const ports = inferGroupPorts(doc, selectedNode);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "inspector-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "eyebrow", children: t("groupSettings") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "user-content", children: selectedNode.title }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("name") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: "text-field",
            value: selectedNode.title,
            onChange: (e) => onEditNode(selectedNode.id, {
              title: e.target.value,
              titleKey: void 0
            })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("groupColor") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "color-options", children: ["violet", "teal", "blue", "amber"].map(
          (color) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              "aria-label": t(color),
              className: `color-${color} ${(selectedNode.color ?? "violet") === color ? "selected" : ""}`,
              onClick: () => onEditNode(selectedNode.id, { color })
            },
            color
          )
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("ports") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "port-editor", children: ports.map((port, idx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            className: `port-editor-row ${port.hidden ? "port-hidden" : ""}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("i", { className: `proxy-pin proxy-${port.kind}` }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("small", { children: [
                  t(port.kind),
                  " \xB7",
                  " ",
                  t(port.direction === "in" ? "inputPort" : "outputPort")
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "input",
                  {
                    value: port.name,
                    "aria-label": t("portName"),
                    onChange: (e) => {
                      const next = structuredClone(ports);
                      next[idx].name = e.target.value;
                      onSetGroupPorts(selectedNode.id, next);
                    }
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button rotate-up",
                  title: t("reorderUp"),
                  onClick: () => {
                    if (idx === 0) return;
                    const next = structuredClone(ports);
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    onSetGroupPorts(selectedNode.id, next);
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chev" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button",
                  title: t("hidePort"),
                  onClick: () => {
                    const next = structuredClone(ports);
                    next[idx].hidden = !next[idx].hidden;
                    onSetGroupPorts(selectedNode.id, next);
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: port.hidden ? "eyeoff" : "eye" })
                }
              )
            ]
          },
          port.id
        )) }),
        ports.filter((p) => p.direction === "in").length >= 2 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "text-button",
            onClick: () => onOpenMergePorts(selectedNode.id),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "group" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("mergePorts") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "inspector-divider" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "button button-primary",
            onClick: () => onSaveTemplate(selectedNode.id),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "box" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("saveTemplate") })
            ]
          }
        ),
        selectedNode.templateId && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "muted", children: t("templateLinked", {
            version: selectedNode.templateRevision ?? 1
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "text-button",
              onClick: () => onSyncTemplate(selectedNode.id),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "undo" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("syncTemplate") })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "text-button",
              onClick: () => onDetachTemplate(selectedNode.id),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "off" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("detachTemplate") })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "inspector-divider" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "text-button danger",
            onClick: () => onUngroup(selectedNode.id),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "x" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("ungroup") })
            ]
          }
        )
      ] });
    }
    if (selectedNode) {
      const state = nodeStatusOf(snapshot, selectedNode.id);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "inspector-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "eyebrow", children: selectedNode.kind }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "user-content", children: selectedNode.title }),
        selectedNode.kind === "agent" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: `status status-${state}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("i", {}),
          t(state)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("name") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: "text-field",
            value: selectedNode.title,
            onChange: (e) => onEditNode(selectedNode.id, { title: e.target.value })
          }
        ),
        selectedNode.kind === "agent" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("workspace") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "select",
            {
              className: "text-field",
              disabled: !!selectedNode.sessionId,
              value: selectedNode.workspaceId ?? "",
              onChange: (e) => {
                const ws = workspaces.find((w) => w.id === e.target.value);
                onEditNode(selectedNode.id, {
                  workspaceId: e.target.value || void 0,
                  cwd: ws?.path
                });
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: t("currentWorkspace") }),
                workspaces.map((w) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: w.id, children: w.name }, w.id))
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("savedTask") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "textarea",
            {
              className: "text-field",
              rows: 3,
              value: selectedNode.task,
              placeholder: t("taskPlaceholder"),
              onChange: (e) => onEditNode(selectedNode.id, { task: e.target.value })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("nativeTriggerLabel") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "choice-buttons", children: [
            [
              "inherit",
              t("inheritGlobal", {
                state: doc.settings.nativeChatTriggers ? t("enabled") : t("disabled")
              })
            ],
            ["enabled", t("enabled")],
            ["disabled", t("disabled")]
          ].map(([val, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: selectedNode.nativeTrigger === val ? "selected" : "",
              onClick: () => onEditNode(selectedNode.id, { nativeTrigger: val }),
              children: label
            },
            val
          )) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("participation") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "choice-buttons vertical", children: [
            ["global", "global"],
            ["manual", "manual"],
            ["paused", "pausedParticipation"]
          ].map(([val, labelKey]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: selectedNode.participation === val ? "selected" : "",
              onClick: () => onEditNode(selectedNode.id, { participation: val }),
              children: t(labelKey)
            },
            val
          )) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "field-label", children: t("rerunRule") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "select",
            {
              className: "text-field",
              value: selectedNode.rerun ?? "change",
              onChange: (e) => onEditNode(selectedNode.id, {
                rerun: e.target.value
              }),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "change", children: t("onInput") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "update", children: t("onUpdate") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "always", children: t("everyRun") })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "inspector-divider" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "button",
              onClick: () => onOpenDetail(selectedNode.id),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "card" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("executionDetail") })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "text-button",
              onClick: () => onOpenWindow(selectedNode.id),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "pop" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("openWindow") })
              ]
            }
          ),
          selectedNode.sessionId && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "text-button",
              onClick: () => onOpenNativeChat(selectedNode.sessionId),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chat" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("openNativeChat") })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "switch-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("pin") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": !!selectedNode.pinned,
              className: "switch",
              onClick: () => onEditNode(selectedNode.id, { pinned: !selectedNode.pinned })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "inspector-divider" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "text-button danger",
            onClick: onDeleteSelection,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "trash" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("deleteNode") })
            ]
          }
        ),
        selectedNode.kind === "agent" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { className: "muted", children: t("removeKeepSession") })
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "inspector-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "card" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("selectObject") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("selectObjectDescription") })
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("aside", { className: `fs-inspector ${open ? "open" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "inspector-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("inspector") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "icon-button",
          onClick: onClose,
          title: t("close"),
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "x" })
        }
      )
    ] }),
    renderBody()
  ] });
}
function WorkflowsSurface({
  tab,
  onTabChange,
  doc,
  snapshot,
  onInstantiate,
  onPreviewTemplate,
  onDeleteTemplate,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onReturnCanvas
}) {
  const templates = allTemplates(doc);
  const shownTemplates = templates.filter(
    (tpl) => tab === "patterns" ? tpl.builtin : !tpl.builtin
  );
  const snapshots = doc.snapshots ?? [];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fs-surface", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "surface-page-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "eyebrow", children: "FLOWSPACE \xB7 STUDIO" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: t("workflowLibrary") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("libraryDescription") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-tabs", role: "tablist", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": tab === "patterns",
          className: tab === "patterns" ? "selected" : "",
          onClick: () => onTabChange("patterns"),
          children: t("builtIn")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": tab === "mine",
          className: tab === "mine" ? "selected" : "",
          onClick: () => onTabChange("mine"),
          children: [
            t("mine"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: (doc.templates ?? []).length })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": tab === "snapshots",
          className: tab === "snapshots" ? "selected" : "",
          onClick: () => onTabChange("snapshots"),
          children: [
            t("snapshots"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: snapshots.length })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "template-list", children: tab !== "snapshots" ? shownTemplates.length ? shownTemplates.map((tpl, idx) => {
      const contCount = tpl.edges.filter(
        (e) => e.kind === "continuation"
      ).length;
      const hasConfirm = tpl.edges.some(
        (e) => e.trigger === "confirm"
      );
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "article",
        {
          className: "template-card",
          style: { ["--i"]: idx },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "template-graph", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(MiniGraph, { nodes: tpl.nodes, edges: tpl.edges }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "template-text", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: tpl.builtin ? "" : "user-content", children: tpl.builtin ? t(tpl.title) : tpl.title }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: tpl.builtin ? t(tpl.description) : tpl.description || t("libraryDescription") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "template-meta", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("nodesCount", { count: tpl.nodes.length }) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                  t("continuation"),
                  " ",
                  contCount
                ] }),
                hasConfirm && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "warn", children: t("confirm") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                  "v",
                  tpl.revision
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "template-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button button-primary",
                  onClick: () => onInstantiate(tpl),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "plus" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("useTemplate") })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button",
                  title: t("previewTemplate"),
                  onClick: () => onPreviewTemplate(tpl),
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "eye" })
                }
              ),
              !tpl.builtin && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button danger",
                  title: t("delete"),
                  onClick: () => onDeleteTemplate(tpl.id),
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "trash" })
                }
              )
            ] })
          ]
        },
        tpl.id
      );
    }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "box" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("noTemplates") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("noTemplatesDescription") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "button",
          onClick: onReturnCanvas,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "canvas" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("returnCanvas") })
          ]
        }
      )
    ] }) : snapshots.length ? snapshots.map((snap, idx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "article",
      {
        className: "snapshot-card",
        style: { ["--i"]: idx },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "template-graph", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            MiniGraph,
            {
              nodes: snap.nodes,
              edges: snap.edges,
              snapshot
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "template-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "user-content", children: snap.title }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: formatDate(snap.createdAt) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "template-meta", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("nodesCount", {
                count: snap.nodes.filter((n) => n.kind !== "group").length
              }) }),
              !!snap.summary?.drafts && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("snapDrafts", { count: snap.summary.drafts }) }),
              !!snap.summary?.stopping && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "bad", children: t("snapInterrupted", { count: snap.summary.stopping }) }),
              !!snap.summary?.awaiting && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "warn", children: t("snapWaiting", { count: snap.summary.awaiting }) }),
              !!snap.summary?.queued && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "warn", children: t("snapQueued", { count: snap.summary.queued }) })
            ] }),
            !!snap.summary?.recentOutputs?.length && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "snapshot-recent", children: snap.summary.recentOutputs.map((out, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "quote" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "user-content", children: [
                out.title,
                "\uFF1A",
                out.snippet
              ] })
            ] }, i)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "template-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: "button",
                onClick: () => onRestoreSnapshot(snap),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "undo" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("restoreSnapshot") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                className: "icon-button danger",
                title: t("delete"),
                onClick: () => onDeleteSnapshot(snap.id),
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "trash" })
              }
            )
          ] })
        ]
      },
      snap.id
    )) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "clock" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("noSnapshots") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("noSnapshotsDescription") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "button", onClick: onReturnCanvas, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "canvas" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("returnCanvas") })
      ] })
    ] }) })
  ] }) });
}
function ActivitySurface({
  tab,
  onTabChange,
  doc,
  snapshot,
  onRevealNode,
  onRunCommand,
  onReleaseToken,
  onExtractStep,
  onReturnCanvas
}) {
  const runs = [...snapshot?.runs ?? []].reverse();
  const circumference = 2 * Math.PI * 17;
  const waitingTokens = (snapshot?.runs ?? []).filter((r) => ["running", "waiting", "paused"].includes(r.state)).flatMap(
    (run) => run.tokens.filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed).map((token) => ({
      run,
      token,
      targetNode: run.graph.nodes.find(
        (n) => n.id === run.graph.edges.find((e) => e.id === token.edgeId)?.target
      )
    }))
  );
  const pendingApprovals = (snapshot?.live ?? []).filter(
    (l) => l.pendingInput.length > 0
  );
  const completedOutputs = runs.flatMap(
    (run) => run.steps.filter((s) => s.state === "completed" && s.output?.trim()).map((step) => ({
      run,
      step,
      nodeTitle: run.graph.nodes.find((n) => n.id === step.nodeId)?.title ?? step.nodeId
    }))
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fs-surface", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "surface-page-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "eyebrow", children: "FLOWSPACE \xB7 EXECUTION" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: t("activity") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("activityDescription") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-tabs", role: "tablist", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: tab === "runs" ? "selected" : "",
          onClick: () => onTabChange("runs"),
          children: [
            t("allRuns"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: runs.length })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: tab === "outputs" ? "selected" : "",
          onClick: () => onTabChange("outputs"),
          children: [
            t("outputsTab"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: completedOutputs.length })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: tab === "waiting" ? "selected" : "",
          onClick: () => onTabChange("waiting"),
          children: [
            t("waitingTab"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: waitingTokens.length + pendingApprovals.length })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "activity-list", children: tab === "runs" ? runs.length ? runs.map((run, idx) => {
      const participantIds = [
        .../* @__PURE__ */ new Set([
          ...run.roots,
          ...run.participants,
          ...run.steps.map((s) => s.nodeId)
        ])
      ].filter(
        (id) => run.graph.nodes.find((n) => n.id === id)?.kind === "agent"
      );
      const stepItems = participantIds.map((nodeId) => {
        const node = run.graph.nodes.find((n) => n.id === nodeId);
        const nodeSteps = run.steps.filter(
          (s) => s.nodeId === nodeId
        );
        const latest = nodeSteps.at(-1);
        const gate = run.tokens.find(
          (tk) => !tk.ready && !tk.consumed && !tk.dismissed && run.graph.edges.find((e) => e.id === tk.edgeId)?.target === nodeId
        );
        const live = snapshot?.live.find((l) => l.nodeId === nodeId);
        let state = "pending";
        let reason = "";
        if (gate && ["running", "waiting", "paused"].includes(run.state)) {
          state = "waiting";
          reason = gate.boundary ? "scopeBoundary" : "waitingConfirmation";
        } else if (live?.pendingInput.length && latest && !latest.endedAt) {
          state = "waiting";
          reason = "approvalNeeded";
        } else if (latest) {
          state = latest.state;
        }
        return { node, state, reason, gate };
      });
      const total = Math.max(1, stepItems.length);
      const done = stepItems.filter(
        (s) => s.state === "completed"
      ).length;
      const blocker = stepItems.find((s) => s.state === "waiting");
      const active = stepItems.find(
        (s) => ["running", "queued"].includes(s.state)
      );
      const originLabel = run.origin === "chat" ? t("runTypeChat") : run.scope ? t("runTypeGroup") : t("runTypeGlobal");
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "article",
        {
          className: `run-card run-${run.state}`,
          style: { ["--i"]: Math.min(idx, 6) },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "run-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "run-ring-wrap", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { className: "run-ring", viewBox: "0 0 42 42", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "circle",
                    {
                      className: "ring-track",
                      cx: "21",
                      cy: "21",
                      r: "17"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "circle",
                    {
                      className: "ring-value",
                      cx: "21",
                      cy: "21",
                      r: "17",
                      strokeDasharray: circumference,
                      strokeDashoffset: circumference * (1 - done / total)
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("b", { children: [
                  done,
                  "/",
                  stepItems.length
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "run-head-title", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "user-content", children: run.title }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
                  originLabel,
                  " \xB7",
                  " ",
                  t("stepsDone", { done, total: stepItems.length })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: `status status-${run.state}`, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("i", {}),
                t(run.state)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("time", { children: formatTime(run.createdAt) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "run-head-actions", children: [
                ["running", "waiting"].includes(run.state) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    title: t("pause"),
                    onClick: () => onRunCommand(run.id, "pause"),
                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "pause" })
                  }
                ),
                ["paused", "interrupted"].includes(run.state) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "button",
                    onClick: () => onRunCommand(run.id, "resume"),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "play" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("resume") })
                    ]
                  }
                ),
                !["completed", "cancelled"].includes(run.state) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button danger",
                    title: t("cancelRun"),
                    onClick: () => onRunCommand(run.id, "cancel"),
                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "stop" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "run-steps", children: stepItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: `run-step step-${item.state}`,
                onClick: () => onRevealNode(item.node.id),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("i", {}),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { className: "user-content", children: item.node.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: t(
                    item.reason || (item.state === "pending" ? "stepPending" : item.state)
                  ) })
                ]
              },
              item.node.id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "run-foot", children: blocker ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "run-blocker", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "pause" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("runBlockedBy", {
                name: blocker.node.title,
                reason: t(blocker.reason || "waiting")
              }) }),
              blocker.gate ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button button-amber",
                  onClick: () => onReleaseToken(run.id, blocker.gate.id, true),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "play" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("release") })
                  ]
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button",
                  onClick: () => onRevealNode(blocker.node.id),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chev" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("locate") })
                  ]
                }
              )
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "run-next", children: run.state === "completed" ? t("runAllDone") : active ? t("runNextStep", { name: active.node.title }) : run.notes.at(-1) || t(run.state) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "details",
              {
                className: "run-timeline",
                open: ["waiting", "error", "interrupted"].includes(
                  run.state
                ),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("summary", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chev" }),
                    t("runTimeline", { count: run.steps.length })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                    [...run.steps].reverse().map((step) => {
                      const stepTitle = run.graph.nodes.find((n) => n.id === step.nodeId)?.title ?? step.nodeId;
                      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "div",
                        {
                          className: `event-row event-${step.state}`,
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("i", { className: "event-dot", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              Icon2,
                              {
                                name: step.state === "completed" ? "check" : step.state === "queued" ? "clock" : "bolt"
                              }
                            ) }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t(step.state) }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                "button",
                                {
                                  type: "button",
                                  className: "event-agent user-content",
                                  onClick: () => onRevealNode(step.nodeId),
                                  children: [
                                    stepTitle,
                                    " \xB7",
                                    " ",
                                    t("roundBadge", { round: step.iteration })
                                  ]
                                }
                              ),
                              step.error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "danger", children: step.error }),
                              step.output && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "user-content", children: [
                                step.output.slice(0, 220),
                                step.output.length > 220 ? "\u2026" : ""
                              ] })
                            ] }),
                            step.output && doc.nodes.some((n) => n.id === step.nodeId) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "button",
                              {
                                type: "button",
                                className: "text-button",
                                onClick: () => onExtractStep(
                                  step.nodeId,
                                  step.output,
                                  step.endSeq
                                ),
                                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "quote" })
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("time", { children: formatTime(step.createdAt) })
                          ]
                        },
                        step.id
                      );
                    }),
                    run.notes.map((note, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "muted", children: note }, i))
                  ] })
                ]
              }
            )
          ]
        },
        run.id
      );
    }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "bolt" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("noActivity") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("noActivityDescription") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "button",
          onClick: onReturnCanvas,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "canvas" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("returnCanvas") })
          ]
        }
      )
    ] }) : tab === "outputs" ? completedOutputs.length ? completedOutputs.map(({ step, nodeTitle }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { className: "artifact-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "quote" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("b", { className: "user-content", children: [
          nodeTitle,
          " \xB7 ",
          t("roundBadge", { round: step.iteration })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("small", { className: "user-content", children: [
          step.output.slice(0, 200),
          step.output.length > 200 ? "\u2026" : ""
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "button",
          onClick: () => onRevealNode(step.nodeId),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chev" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("locate") })
          ]
        }
      ),
      doc.nodes.some((n) => n.id === step.nodeId) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "button",
          onClick: () => onExtractStep(step.nodeId, step.output, step.endSeq),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "quote" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("quoteMessage") })
          ]
        }
      )
    ] }, step.id)) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "quote" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("noOutputs") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("noActivityDescription") })
    ] }) : waitingTokens.length || pendingApprovals.length ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      pendingApprovals.map((live) => {
        const node = doc.nodes.find((n) => n.id === live.nodeId);
        if (!node) return null;
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { className: "queue-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "pause" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { className: "user-content", children: node.title }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("approvalDescription") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "button button-amber",
              onClick: () => onRevealNode(node.id),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chat" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("openApprovalTab") })
              ]
            }
          )
        ] }, live.nodeId);
      }),
      waitingTokens.map(({ run, token, targetNode }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { className: "queue-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "pause" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("b", { className: "user-content", children: [
            token.source.title,
            " \u2192 ",
            targetNode?.title ?? ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "user-content", children: token.source.text.slice(0, 160) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "button button-amber",
            onClick: () => onReleaseToken(run.id, token.id, true),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "play" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("release") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "text-button",
            onClick: () => onReleaseToken(run.id, token.id, false),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("dismiss") })
          }
        )
      ] }, token.id))
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "check" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: t("noWaiting") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("noActivityDescription") })
    ] }) })
  ] }) });
}
function SettingsSurface({
  doc,
  prefs,
  onUpdatePrefs,
  onUpdateSettings,
  onToggleLanguage,
  onExportJson,
  onTriggerImport,
  onOpenExistingSessions,
  onLoadStarter
}) {
  const lang = getLanguage();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fs-surface", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "surface-page settings-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "surface-page-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "eyebrow", children: "FLOWSPACE \xB7 PREFERENCES" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: t("settings") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "settings-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: t("appearance") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("theme") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "choice-buttons", children: [
          ["auto", "followHost"],
          ["dark", "dark"],
          ["light", "light"]
        ].map(([val, labelKey]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: prefs.theme === val ? "selected" : "",
            onClick: () => onUpdatePrefs({ theme: val }),
            children: t(labelKey)
          },
          val
        )) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("language") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "choice-buttons", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: lang === "zh" ? "selected" : "",
              onClick: () => onToggleLanguage("zh"),
              children: t("chinese")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: lang === "en" ? "selected" : "",
              onClick: () => onToggleLanguage("en"),
              children: t("english")
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "settings-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: t("interaction") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("wheelBehavior") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "choice-buttons", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: prefs.wheel === "zoom" ? "selected" : "",
              onClick: () => onUpdatePrefs({ wheel: "zoom" }),
              children: t("zoom")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: prefs.wheel === "pan" ? "selected" : "",
              onClick: () => onUpdatePrefs({ wheel: "pan" }),
              children: t("pan")
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("snapGrid") }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": prefs.snap,
            className: "switch",
            onClick: () => onUpdatePrefs({ snap: !prefs.snap })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("reducedMotion") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("reducedMotionDescription") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": doc.settings.reducedMotion,
            className: "switch",
            onClick: () => onUpdateSettings({
              reducedMotion: !doc.settings.reducedMotion
            })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "settings-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: t("orchestration") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("nativeChatTriggers") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("nativeChatTriggersDescription") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": doc.settings.nativeChatTriggers,
            className: "switch",
            onClick: () => onUpdateSettings({
              nativeChatTriggers: !doc.settings.nativeChatTriggers
            })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "settings-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: t("data") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("exportCanvas") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "button", onClick: onExportJson, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "download" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("download") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("importCanvas") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "button", onClick: onTriggerImport, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "upload" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("import") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("existingSession") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "button",
            onClick: onOpenExistingSessions,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chat" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("existingSession") })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("b", { children: t("loadStarter") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: t("loadStarterDescription") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            className: "button button-primary",
            onClick: onLoadStarter,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "plus" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("useTemplate") })
            ]
          }
        )
      ] })
    ] })
  ] }) });
}

// packages/flowspace/src/client/CanvasApp.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function EmbeddedSession({
  node,
  bridge,
  renderConversation,
  onError,
  onPresenceChange
}) {
  const [reference, setReference] = (0, import_react3.useState)();
  (0, import_react3.useEffect)(() => {
    if (!node.sessionId) return;
    const sid = node.sessionId;
    onPresenceChange(sid, true);
    const ref = bridge.retain(node);
    let active = true;
    ref.ready.then(() => {
      if (active) setReference(ref);
    }).catch(onError);
    return () => {
      active = false;
      onPresenceChange(sid, false);
      ref.release();
    };
  }, [bridge, node.sessionId]);
  return reference ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: renderConversation(node, reference) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-loading", children: t("openingConversation") });
}
function CanvasApp({
  bridge,
  renderConversation
}) {
  const snapshot = bridge.useSnapshot();
  const [, setLangTick] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => subscribeLanguage(() => setLangTick((v) => v + 1)), []);
  const [doc, setDoc] = (0, import_react3.useState)(emptyDocument);
  const docRef = (0, import_react3.useRef)(doc);
  const dirty = (0, import_react3.useRef)(false);
  const saveTimer = (0, import_react3.useRef)();
  const savingPromise = (0, import_react3.useRef)(Promise.resolve());
  const revision = (0, import_react3.useRef)(0);
  const sentRevision = (0, import_react3.useRef)(-1);
  const initialized = (0, import_react3.useRef)(false);
  const [saved, setSaved] = (0, import_react3.useState)(true);
  const [toastState, setToastState] = (0, import_react3.useState)({ text: "", visible: false });
  const toastTimer = (0, import_react3.useRef)();
  const [routeName, setRouteName] = (0, import_react3.useState)("canvas");
  const [libraryTab, setLibraryTab] = (0, import_react3.useState)("patterns");
  const [activityTab, setActivityTab] = (0, import_react3.useState)("runs");
  const [bottomOpen, setBottomOpen] = (0, import_react3.useState)(false);
  const [bottomTab, setBottomTab] = (0, import_react3.useState)(
    "events"
  );
  const [inspectorOpen, setInspectorOpen] = (0, import_react3.useState)(false);
  const [sidebarOpen, setSidebarOpen] = (0, import_react3.useState)(true);
  const [mobileSidebar, setMobileSidebar] = (0, import_react3.useState)(false);
  const [minimapOpen, setMinimapOpen] = (0, import_react3.useState)(false);
  const [tool, setTool] = (0, import_react3.useState)("pointer");
  const [spacePressed, setSpacePressed] = (0, import_react3.useState)(false);
  const [selection, setSelection] = (0, import_react3.useState)({ nodes: [], groups: [], edge: null });
  const [lastAgentId, setLastAgentId] = (0, import_react3.useState)("");
  const [editingNodeId, setEditingNodeId] = (0, import_react3.useState)(null);
  const [quoteState, setQuoteState] = (0, import_react3.useState)(null);
  const [history, setHistory] = (0, import_react3.useState)([]);
  const [future, setFuture] = (0, import_react3.useState)([]);
  const [workspaces, setWorkspaces] = (0, import_react3.useState)([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = (0, import_react3.useState)("");
  const [workspaceFilesList, setWorkspaceFilesList] = (0, import_react3.useState)([]);
  const [fileInputDrafts, setFileInputDrafts] = (0, import_react3.useState)({});
  const [menu, setMenu] = (0, import_react3.useState)(null);
  const [connecting, setConnecting] = (0, import_react3.useState)(null);
  const [marquee, setMarquee] = (0, import_react3.useState)(null);
  const [snapPreview, setSnapPreview] = (0, import_react3.useState)(null);
  const [isDragging, setIsDragging] = (0, import_react3.useState)(false);
  const [launchDialog, setLaunchDialog] = (0, import_react3.useState)(null);
  const [paletteDialog, setPaletteDialog] = (0, import_react3.useState)(null);
  const [formModal, setFormModal] = (0, import_react3.useState)(null);
  const [sessionModal, setSessionModal] = (0, import_react3.useState)(null);
  const [fileModal, setFileModal] = (0, import_react3.useState)(null);
  const [templatePreviewModal, setTemplatePreviewModal] = (0, import_react3.useState)(null);
  const [syncModal, setSyncModal] = (0, import_react3.useState)(null);
  const [mergePortsModal, setMergePortsModal] = (0, import_react3.useState)(null);
  const [exchangeModal, setExchangeModal] = (0, import_react3.useState)(null);
  const [helpModal, setHelpModal] = (0, import_react3.useState)(false);
  const rootRef = (0, import_react3.useRef)(null);
  const areaRef = (0, import_react3.useRef)(null);
  const viewportRef = (0, import_react3.useRef)(null);
  const importInputRef = (0, import_react3.useRef)(null);
  const dialogRef = (0, import_react3.useRef)(null);
  const viewAnimToken = (0, import_react3.useRef)(0);
  const mountedSessionsRef = (0, import_react3.useRef)(/* @__PURE__ */ new Map());
  const autoSwitchedSteps = (0, import_react3.useRef)(/* @__PURE__ */ new Set());
  const sidebarAutoAdjusted = (0, import_react3.useRef)(false);
  const [vpSize, setVpSize] = (0, import_react3.useState)({ width: 960, height: 640 });
  const [hostDark, setHostDark] = (0, import_react3.useState)(
    () => typeof document !== "undefined" ? document.body.hasAttribute("data-ds-dark-theme") || !document.body.hasAttribute("data-ds-light-theme") : true
  );
  const [sysReducedMotion, setSysReducedMotion] = (0, import_react3.useState)(false);
  const showToast = (0, import_react3.useCallback)((msg, isError = false) => {
    const text = msg instanceof Error ? msg.message : String(msg);
    setToastState({ text, error: isError, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToastState((prev) => ({ ...prev, visible: false })),
      2800
    );
  }, []);
  const reportError = (0, import_react3.useCallback)(
    (err) => showToast(err, true),
    [showToast]
  );
  const onPresenceChange = (0, import_react3.useCallback)(
    (sessionId, mounted) => {
      const prev = mountedSessionsRef.current.get(sessionId) ?? 0;
      if (mounted) {
        mountedSessionsRef.current.set(sessionId, prev + 1);
      } else if (prev <= 1) {
        mountedSessionsRef.current.delete(sessionId);
      } else {
        mountedSessionsRef.current.set(sessionId, prev - 1);
      }
      bridge.presence([...mountedSessionsRef.current.keys()]);
    },
    [bridge]
  );
  (0, import_react3.useEffect)(() => {
    const checkTheme = () => {
      setHostDark(document.body.hasAttribute("data-ds-dark-theme"));
    };
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-ds-dark-theme", "class", "data-theme"]
    });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSysReducedMotion(mq.matches);
    const onMq = () => setSysReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);
  (0, import_react3.useEffect)(() => {
    const vp = viewportRef.current;
    const root = rootRef.current;
    if (!vp || !root) return;
    const ro = new ResizeObserver(() => {
      setVpSize({
        width: vp.clientWidth || 960,
        height: vp.clientHeight || 640
      });
      if (!sidebarAutoAdjusted.current && root.clientWidth > 0) {
        sidebarAutoAdjusted.current = true;
        if (root.clientWidth < 1100) setSidebarOpen(false);
      }
    });
    ro.observe(vp);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);
  (0, import_react3.useEffect)(() => bridge.connect(), [bridge]);
  (0, import_react3.useEffect)(() => {
    void bridge.workspaces().then((list) => {
      setWorkspaces(list);
      setActiveWorkspaceId(list[0]?.id ?? "");
    }).catch(reportError);
  }, [bridge, reportError]);
  const activeWorkspaceCwd = (0, import_react3.useMemo)(
    () => workspaces.find((w) => w.id === activeWorkspaceId)?.path,
    [workspaces, activeWorkspaceId]
  );
  (0, import_react3.useEffect)(() => {
    void bridge.workspaceFiles(activeWorkspaceCwd).then(setWorkspaceFilesList).catch(() => setWorkspaceFilesList([]));
  }, [bridge, activeWorkspaceCwd]);
  const flush = (0, import_react3.useCallback)(async () => {
    clearTimeout(saveTimer.current);
    if (!dirty.current) {
      await savingPromise.current;
      return;
    }
    const current = docRef.current;
    const rev = revision.current;
    if (sentRevision.current === rev) {
      await savingPromise.current;
      return;
    }
    sentRevision.current = rev;
    const task = savingPromise.current.then(async () => {
      try {
        await bridge.save(current);
        if (revision.current === rev) {
          dirty.current = false;
          setSaved(true);
        }
      } catch (err) {
        if (sentRevision.current === rev) {
          sentRevision.current = -1;
        }
        throw err;
      }
    });
    savingPromise.current = task.catch(reportError);
    await task;
  }, [bridge, reportError]);
  (0, import_react3.useEffect)(
    () => () => {
      clearTimeout(saveTimer.current);
      if (dirty.current) void bridge.save(docRef.current).catch(reportError);
      bridge.presence([]);
    },
    [bridge, reportError]
  );
  const edit = (0, import_react3.useCallback)(
    (mutator, options = {}) => {
      const { remember = true, delay = 450 } = options;
      const prev = docRef.current;
      const next = structuredClone(prev);
      if (remember) {
        setHistory((h) => [...h.slice(-39), prev]);
        setFuture([]);
      }
      mutator(next);
      revision.current++;
      docRef.current = next;
      setDoc(next);
      dirty.current = true;
      setSaved(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flush().catch(reportError);
      }, delay);
    },
    [flush, reportError]
  );
  (0, import_react3.useEffect)(() => {
    if (!snapshot) return;
    if (!dirty.current) {
      docRef.current = snapshot.document;
      setDoc(snapshot.document);
    } else {
      const merged = {
        ...docRef.current,
        nodes: docRef.current.nodes.map((n) => {
          const host = snapshot.document.nodes.find((x) => x.id === n.id);
          if (!host) return n;
          return {
            ...n,
            ...host.sessionId ? { sessionId: host.sessionId } : {},
            ...host.lastSubmittedTask !== void 0 ? { lastSubmittedTask: host.lastSubmittedTask } : {},
            ...(n.kind === "display" && !n.fixed || n.kind === "detail" && !n.pinned) && host.text ? { text: host.text, sourceSeq: host.sourceSeq } : {}
          };
        }),
        edges: docRef.current.edges.map((e) => {
          const hostEdge = snapshot.document.edges.find((x) => x.id === e.id);
          if (!hostEdge) return e;
          return {
            ...e,
            sentVersion: hostEdge.sentVersion,
            originMode: hostEdge.originMode ?? e.originMode
          };
        })
      };
      docRef.current = merged;
      setDoc(merged);
    }
    if (!initialized.current) {
      initialized.current = true;
    }
    for (const run of snapshot.runs) {
      if (run.state !== "running") continue;
      for (const step of run.steps) {
        if (step.state === "running" && !autoSwitchedSteps.current.has(step.id)) {
          autoSwitchedSteps.current.add(step.id);
          const target = docRef.current.nodes.find((n) => n.id === step.nodeId);
          if (target && target.tab !== "conversation") {
            edit(
              (d) => {
                const n = d.nodes.find((x) => x.id === step.nodeId);
                if (n) n.tab = "conversation";
              },
              { remember: false }
            );
          }
        }
      }
    }
  }, [snapshot, edit]);
  const prefs = (0, import_react3.useMemo)(
    () => ({
      theme: doc.prefs?.theme ?? "auto",
      wheel: doc.prefs?.wheel ?? "zoom",
      snap: doc.prefs?.snap ?? true,
      filter: doc.prefs?.filter ?? "all",
      hiddenWorkspaces: doc.prefs?.hiddenWorkspaces ?? []
    }),
    [doc.prefs]
  );
  const effectiveTheme = prefs.theme === "auto" ? hostDark ? "dark" : "light" : prefs.theme;
  const reducedMotion = doc.settings.reducedMotion || sysReducedMotion;
  const view = doc.viewport;
  const lod = view.zoom < LOD_ZOOM;
  const setViewportDirect = (0, import_react3.useCallback)(
    (nextView, persistDelay = 500) => {
      const next = { ...docRef.current, viewport: nextView };
      revision.current++;
      docRef.current = next;
      setDoc(next);
      dirty.current = true;
      setSaved(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flush().catch(reportError);
      }, persistDelay);
    },
    [flush, reportError]
  );
  const animateView = (0, import_react3.useCallback)(
    (target, duration = MOTION.hero) => {
      const token = ++viewAnimToken.current;
      const from = { ...docRef.current.viewport };
      if (reducedMotion || duration <= 0) {
        setViewportDirect(target, 300);
        return;
      }
      const started = performance.now();
      const step = (now) => {
        if (token !== viewAnimToken.current) return;
        const frac = clamp((now - started) / duration, 0, 1);
        const eased = easeView(frac);
        const cur = {
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
          zoom: from.zoom + (target.zoom - from.zoom) * eased
        };
        setViewportDirect(cur, frac < 1 ? 1200 : 300);
        if (frac < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [reducedMotion, setViewportDirect]
  );
  const fitBoxes = (0, import_react3.useCallback)(
    (boxes, instant = false) => {
      if (!boxes.length) return;
      const rect = viewportRef.current?.getBoundingClientRect();
      const width = rect?.width || vpSize.width;
      const height = rect?.height || vpSize.height;
      const target = fit({ width, height }, boxes, 1);
      animateView(target, instant ? 0 : MOTION.hero);
    },
    [vpSize.width, vpSize.height, animateView]
  );
  (0, import_react3.useEffect)(() => {
    const focusId = bridge.takeFocus();
    if (!focusId) return;
    const n = docRef.current.nodes.find((x) => x.id === focusId);
    if (n) {
      setRouteName("canvas");
      setSelection({ nodes: [focusId], groups: [], edge: null });
      setInspectorOpen(true);
      if (n.kind === "agent") setLastAgentId(focusId);
      const box = nodeBox(n, false, true);
      setTimeout(() => fitBoxes([box]), 60);
    }
  }, [bridge, snapshot, fitBoxes]);
  const waitingForNode = (0, import_react3.useCallback)(
    (nodeId) => snapshot?.runs.filter((r) => ["running", "waiting", "paused"].includes(r.state)).flatMap(
      (run) => run.tokens.filter(
        (tk) => !tk.ready && !tk.consumed && !tk.dismissed && run.graph.edges.find((e) => e.id === tk.edgeId)?.target === nodeId
      ).map((token) => ({ run, token }))
    ) ?? [],
    [snapshot]
  );
  const isNodeVisible = (0, import_react3.useCallback)(
    (node, ignoreCollapse = false) => {
      if (!node || node.kind === "group") return false;
      const wsKey = node.workspaceId || "__default__";
      if (prefs.hiddenWorkspaces.includes(wsKey)) return false;
      if (!ignoreCollapse && collapsedAncestor(doc, node.id)) return false;
      if (prefs.filter === "running" && node.kind === "agent") {
        const st = nodeStatusOf(snapshot, node.id);
        if (!["running", "waiting", "queued", "input"].includes(st)) {
          return false;
        }
      }
      return true;
    },
    [doc, prefs.hiddenWorkspaces, prefs.filter, snapshot]
  );
  const visibleGroups = (0, import_react3.useMemo)(
    () => doc.nodes.filter((g) => {
      if (g.kind !== "group") return false;
      if (g.parentId) {
        const parent = doc.nodes.find((p) => p.id === g.parentId);
        if (parent?.collapsed) return false;
      }
      const memberIds = members(doc, g.id);
      if (!memberIds.length) return true;
      return memberIds.some(
        (id) => isNodeVisible(
          doc.nodes.find((n) => n.id === id),
          true
        )
      );
    }),
    [doc, isNodeVisible]
  );
  const keepExpandedIds = (0, import_react3.useMemo)(() => {
    const ids = new Set(selection.nodes);
    if (editingNodeId) ids.add(editingNodeId);
    for (const n of doc.nodes) {
      if (n.kind !== "agent") continue;
      const st = nodeStatusOf(snapshot, n.id);
      if (st === "waiting" || st === "input") ids.add(n.id);
    }
    return ids;
  }, [selection.nodes, editingNodeId, doc.nodes, snapshot]);
  const waitingAgentNodes = (0, import_react3.useMemo)(
    () => doc.nodes.filter((n) => {
      if (n.kind !== "agent") return false;
      const st = nodeStatusOf(snapshot, n.id);
      return st === "waiting" || st === "input";
    }),
    [doc.nodes, snapshot]
  );
  const selectNode = (0, import_react3.useCallback)(
    (id, additive = false) => {
      const target = docRef.current.nodes.find((n) => n.id === id);
      if (!target) return;
      if (target.kind === "group") {
        setSelection((prev) => ({
          nodes: additive ? prev.nodes : [],
          groups: additive ? prev.groups.includes(id) ? prev.groups.filter((x) => x !== id) : [...prev.groups, id] : [id],
          edge: null
        }));
        return;
      }
      if (target.kind === "agent") setLastAgentId(id);
      setSelection((prev) => ({
        nodes: additive ? prev.nodes.includes(id) ? prev.nodes.filter((x) => x !== id) : [...prev.nodes, id] : [id],
        groups: additive ? prev.groups : [],
        edge: null
      }));
    },
    []
  );
  const revealNode = (0, import_react3.useCallback)(
    (nodeId) => {
      const target = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!target) return;
      setMobileSidebar(false);
      edit(
        (d) => {
          const wsKey = target.workspaceId || "__default__";
          if (d.prefs?.hiddenWorkspaces?.includes(wsKey)) {
            d.prefs.hiddenWorkspaces = d.prefs.hiddenWorkspaces.filter(
              (k) => k !== wsKey
            );
          }
          let cur = d.nodes.find((n) => n.id === nodeId);
          while (cur?.parentId) {
            const p = d.nodes.find((x) => x.id === cur.parentId);
            if (p?.collapsed) p.collapsed = false;
            cur = p;
          }
          if (d.prefs?.filter === "running") d.prefs.filter = "all";
        },
        { remember: false }
      );
      if (routeName !== "conversation") setRouteName("canvas");
      selectNode(nodeId);
      if (routeName !== "conversation") {
        const box = nodeBox(target, false, true);
        const zoom = Math.max(docRef.current.viewport.zoom, 0.88);
        animateView({
          x: vpSize.width / 2 - (box.x + box.w / 2) * zoom,
          y: vpSize.height / 2 - (box.y + box.h / 2) * zoom - 8,
          zoom
        });
      }
    },
    [edit, routeName, selectNode, animateView, vpSize.width, vpSize.height]
  );
  const focusGroup = (0, import_react3.useCallback)(
    (groupId, instant = false) => {
      const group = docRef.current.nodes.find(
        (n) => n.id === groupId && n.kind === "group"
      );
      if (!group) return;
      setMobileSidebar(false);
      setRouteName("canvas");
      setSelection({ nodes: [], groups: [groupId], edge: null });
      fitBoxes([groupBox(group)], instant);
    },
    [fitBoxes]
  );
  const fitView = (0, import_react3.useCallback)(
    (all = false) => {
      if (!all && selection.groups.length) {
        const boxes = selection.groups.map((id) => docRef.current.nodes.find((n) => n.id === id)).filter((g) => !!g).map((g) => groupBox(g));
        return fitBoxes(boxes);
      }
      if (!all && selection.nodes.length) {
        const boxes = selection.nodes.map((id) => docRef.current.nodes.find((n) => n.id === id)).filter((n) => !!n).map((n) => nodeBox(n, false, true));
        return fitBoxes(boxes);
      }
      const topGroup = docRef.current.nodes.find(
        (n) => n.kind === "group" && !n.parentId
      );
      if (topGroup && !all) return fitBoxes([groupBox(topGroup)]);
      const allBoxes = [
        ...docRef.current.nodes.filter((n) => isNodeVisible(n)).map((n) => nodeBox(n, lod)),
        ...visibleGroups.map((g) => groupBox(g))
      ];
      fitBoxes(allBoxes);
    },
    [selection, fitBoxes, isNodeVisible, lod, visibleGroups]
  );
  const editNode = (0, import_react3.useCallback)(
    (id, changes) => {
      const textOnly = Object.keys(changes).every(
        (k) => ["draft", "task", "text"].includes(k)
      );
      edit(
        (d) => {
          const n = d.nodes.find((x) => x.id === id);
          if (!n) return;
          const togglingExpand = changes.expanded !== void 0 && changes.expanded !== n.expanded;
          Object.assign(n, changes);
          if (togglingExpand && n.kind !== "group") {
            if (n.expanded) makeRoom(d, n);
            else giveRoomBack(d, n);
          }
        },
        { remember: !textOnly }
      );
    },
    [edit]
  );
  const editEdge = (0, import_react3.useCallback)(
    (id, changes) => {
      edit((d) => {
        const e = d.edges.find((x) => x.id === id);
        if (e) Object.assign(e, changes);
      });
    },
    [edit]
  );
  const toggleNodeForm = (0, import_react3.useCallback)(
    (nodeId) => {
      const n = docRef.current.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      if (n.kind === "group") {
        editNode(nodeId, { collapsed: !n.collapsed });
      } else {
        editNode(nodeId, { expanded: !n.expanded });
      }
    },
    [editNode]
  );
  const openWindow = (0, import_react3.useCallback)(
    (nodeId) => {
      const area = areaRef.current;
      const w = Math.min(540, (area?.clientWidth ?? 900) - 48);
      const h = Math.min(540, (area?.clientHeight ?? 620) - 48);
      const maxZ = Math.max(
        10,
        ...docRef.current.nodes.filter((n) => n.window).map((n) => n.window?.z ?? 10)
      );
      edit((d) => {
        const n = d.nodes.find((x) => x.id === nodeId);
        if (!n || n.kind === "group") return;
        n.expanded = true;
        n.window = {
          x: Math.max(20, ((area?.clientWidth ?? 900) - w) / 2),
          y: Math.max(20, ((area?.clientHeight ?? 620) - h) / 2),
          w,
          h,
          snap: null,
          z: maxZ + 1
        };
      });
    },
    [edit]
  );
  const returnWindow = (0, import_react3.useCallback)(
    (nodeId) => {
      edit((d) => {
        const n = d.nodes.find((x) => x.id === nodeId);
        if (n) delete n.window;
      });
    },
    [edit]
  );
  const openDetailCard = (0, import_react3.useCallback)(
    (agentId) => {
      const source = docRef.current.nodes.find((n) => n.id === agentId);
      if (!source) return;
      const existing = docRef.current.nodes.find(
        (n) => n.kind === "detail" && n.sourceNodeId === agentId && !n.pinned
      );
      if (existing) {
        revealNode(existing.id);
        return;
      }
      const box = nodeBox(source, false, true);
      const latestOutput = snapshot?.live.find((l) => l.nodeId === agentId)?.output || snapshot?.runs.flatMap((r) => r.steps).filter((s) => s.nodeId === agentId).at(-1)?.output || "";
      const detail = {
        ...newNode(
          "detail",
          box.x + box.w + 36,
          box.y,
          `${source.title} \xB7 ${t("executionDetail")}`
        ),
        sourceNodeId: agentId,
        text: latestOutput,
        fixed: false,
        pinned: false,
        expanded: true
      };
      edit((d) => d.nodes.push(detail));
      selectNode(detail.id);
    },
    [snapshot, edit, revealNode, selectNode]
  );
  const createCanvasNode = (0, import_react3.useCallback)(
    (kind, worldPoint) => {
      let pt = worldPoint;
      if (!pt) {
        const visibleBoxes = [
          ...docRef.current.nodes.filter((n) => isNodeVisible(n)).map((n) => nodeBox(n)),
          ...visibleGroups.map((g) => groupBox(g))
        ];
        if (visibleBoxes.length) {
          const b = bounds(visibleBoxes);
          pt = { x: b.x + b.w + 120, y: b.y + 60 };
        } else {
          const rect = viewportRef.current?.getBoundingClientRect();
          pt = rect ? toWorld(
            docRef.current.viewport,
            rect,
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          ) : { x: 120, y: 160 };
        }
      }
      const ws = workspaces.find((w) => w.id === activeWorkspaceId);
      const created = {
        ...newNode(
          kind,
          Math.round((pt.x - 140) / 12) * 12,
          Math.round((pt.y - 70) / 12) * 12
        ),
        ...kind === "agent" ? {
          workspaceId: activeWorkspaceId || void 0,
          cwd: ws?.path
        } : kind === "file" ? {
          cwd: ws?.path,
          items: workspaceFilesList.slice(0, 12),
          selectedItems: workspaceFilesList[0] ? [workspaceFilesList[0]] : [],
          text: workspaceFilesList[0] ?? "README.md",
          expanded: true
        } : {}
      };
      edit((d) => {
        const parentGroup = d.nodes.filter(
          (g) => g.kind === "group" && !g.collapsed && created.x > g.x && created.x < g.x + g.width && created.y > g.y + 36 && created.y < g.y + g.height
        ).sort((a, b) => a.width * a.height - b.width * b.height)[0];
        if (parentGroup) created.parentId = parentGroup.id;
        d.nodes.push(created);
      });
      selectNode(created.id);
      showToast(t("nodeCreated"));
      return created;
    },
    [
      isNodeVisible,
      visibleGroups,
      workspaces,
      activeWorkspaceId,
      workspaceFilesList,
      edit,
      selectNode,
      showToast
    ]
  );
  const connectNodes = (0, import_react3.useCallback)(
    (fromIds, toIds, kind) => {
      edit((d) => {
        for (const fromId of fromIds) {
          const source = d.nodes.find((n) => n.id === fromId);
          if (!source) continue;
          if (kind === "continuation") {
            if (source.kind !== "agent") continue;
            for (const toId of toIds) {
              const target = d.nodes.find((n) => n.id === toId);
              if (!target || target.kind !== "agent" || fromId === toId)
                continue;
              if (!d.edges.some(
                (e) => e.source === fromId && e.target === toId && e.kind === "continuation"
              )) {
                d.edges.push(newEdge(fromId, toId, "continuation"));
              }
            }
          } else {
            let refSourceId = fromId;
            if (source.kind === "agent") {
              const latestText = snapshot?.live.find((l) => l.nodeId === fromId)?.output || snapshot?.runs.flatMap((r) => r.steps).filter((s) => s.nodeId === fromId).at(-1)?.output || "";
              const sb = nodeBox(source);
              const disp = {
                ...newNode(
                  "display",
                  sb.x + sb.w + 32,
                  sb.y + sb.h + 36,
                  `${source.title} \xB7 ${t("newDisplay")}`
                ),
                sourceNodeId: fromId,
                text: latestText,
                fixed: false,
                expanded: false
              };
              d.nodes.push(disp);
              refSourceId = disp.id;
            }
            for (const toId of toIds) {
              const target = d.nodes.find((n) => n.id === toId);
              if (!target || target.kind !== "agent" || refSourceId === toId)
                continue;
              if (!d.edges.some(
                (e) => e.source === refSourceId && e.target === toId && e.kind === "reference"
              )) {
                d.edges.push(newEdge(refSourceId, toId, "reference"));
              }
            }
          }
        }
      });
    },
    [edit, snapshot]
  );
  const deleteSelection = (0, import_react3.useCallback)(() => {
    edit((d) => {
      if (selection.edge) {
        d.edges = d.edges.filter((e) => e.id !== selection.edge);
        return;
      }
      const removeIds = /* @__PURE__ */ new Set([...selection.nodes, ...selection.groups]);
      if (!removeIds.size) return;
      d.nodes = d.nodes.filter((n) => !removeIds.has(n.id));
      for (const n of d.nodes) {
        if (n.parentId && removeIds.has(n.parentId)) delete n.parentId;
      }
      d.edges = d.edges.filter(
        (e) => !removeIds.has(e.source) && !removeIds.has(e.target)
      );
    });
    setSelection({ nodes: [], groups: [], edge: null });
  }, [edit, selection]);
  const groupSelected = (0, import_react3.useCallback)(() => {
    const chosenNodes = selection.nodes.filter(
      (id) => docRef.current.nodes.some((n) => n.id === id && n.kind !== "group")
    );
    const chosenGroups = selection.groups.filter(
      (id) => docRef.current.nodes.some((n) => n.id === id && n.kind === "group")
    );
    if (chosenNodes.length + chosenGroups.length < 2) {
      showToast(t("groupNeedSelection"));
      return;
    }
    if (chosenGroups.some((gid) => {
      const g = docRef.current.nodes.find((n) => n.id === gid);
      return g?.parentId || docRef.current.nodes.some(
        (c) => c.parentId === gid && c.kind === "group"
      );
    })) {
      showToast(t("nestedLimit"), true);
      return;
    }
    const allMemberIds = [
      ...chosenNodes,
      ...chosenGroups.flatMap((gid) => members(docRef.current, gid))
    ];
    const boxes = allMemberIds.map((id) => docRef.current.nodes.find((n) => n.id === id)).filter((n) => !!n).map((n) => nodeBox(n));
    if (!boxes.length) return;
    const b = bounds(boxes);
    const grp = {
      ...newNode("group", b.x - 24, b.y - 54, t("workflows")),
      width: b.w + 48,
      height: b.h + 82,
      color: "violet"
    };
    edit((d) => {
      d.nodes.push(grp);
      for (const id of [...chosenNodes, ...chosenGroups]) {
        const item = d.nodes.find((n) => n.id === id);
        if (item) item.parentId = grp.id;
      }
    });
    setSelection({ nodes: [], groups: [grp.id], edge: null });
    showToast(t("groupCreated"));
  }, [selection, edit, showToast]);
  const ungroup = (0, import_react3.useCallback)(
    (groupId) => {
      edit((d) => {
        const grp = d.nodes.find((n) => n.id === groupId);
        if (!grp) return;
        for (const child of d.nodes) {
          if (child.parentId === groupId) {
            if (grp.parentId) child.parentId = grp.parentId;
            else delete child.parentId;
          }
        }
        d.nodes = d.nodes.filter((n) => n.id !== groupId);
      });
      setSelection({ nodes: [], groups: [], edge: null });
    },
    [edit]
  );
  const arrangeTopology = (0, import_react3.useCallback)(() => {
    edit((d) => {
      const targetGroup = selection.groups.length ? d.nodes.find((n) => n.id === selection.groups[0] && n.kind === "group") : d.nodes.find((n) => n.kind === "group" && !n.parentId);
      const scopeIds = targetGroup ? new Set(members(d, targetGroup.id)) : null;
      const agents = d.nodes.filter(
        (n) => n.kind === "agent" && (!scopeIds || scopeIds.has(n.id))
      );
      if (!agents.length) return;
      const inside = new Set(agents.map((n) => n.id));
      const ranks = /* @__PURE__ */ new Map();
      const visiting = /* @__PURE__ */ new Set();
      const rankOf = (id) => {
        if (ranks.has(id)) return ranks.get(id);
        if (visiting.has(id)) return 0;
        visiting.add(id);
        const up = d.edges.filter(
          (e) => e.kind === "continuation" && e.trigger !== "off" && e.target === id && inside.has(e.source)
        );
        const val = up.length ? Math.max(...up.map((e) => rankOf(e.source))) + 1 : 0;
        visiting.delete(id);
        ranks.set(id, val);
        return val;
      };
      const colCounts = /* @__PURE__ */ new Map();
      const startX = (targetGroup?.x ?? 40) + 24;
      const startY = (targetGroup?.y ?? 126) + 54;
      for (const ag of agents) {
        const col = rankOf(ag.id);
        const row = colCounts.get(col) ?? 0;
        colCounts.set(col, row + 1);
        if (!ag.pinned) {
          ag.x = startX + col * 396;
          ag.y = startY + row * 444;
        }
      }
      if (targetGroup) {
        const b = bounds(agents.map((a) => nodeBox(a)));
        targetGroup.x = b.x - 24;
        targetGroup.y = b.y - 54;
        targetGroup.width = b.w + 48;
        targetGroup.height = b.h + 82;
      }
    });
  }, [edit, selection.groups]);
  const performUndo = (0, import_react3.useCallback)(
    (isRedo = false) => {
      const stack = isRedo ? future : history;
      const target = stack.at(-1);
      if (!target) return;
      const current = docRef.current;
      if (isRedo) {
        setFuture((f) => f.slice(0, -1));
        setHistory((h) => [...h, current]);
      } else {
        setHistory((h) => h.slice(0, -1));
        setFuture((f) => [...f, current]);
      }
      edit(
        (d) => {
          const liveNodes = d.nodes;
          const restored = structuredClone(target);
          Object.assign(d, restored);
          d.nodes = restored.nodes.map((n) => {
            const existing = liveNodes.find((x) => x.id === n.id);
            return existing?.sessionId ? {
              ...n,
              sessionId: existing.sessionId,
              cwd: existing.cwd,
              workspaceId: existing.workspaceId,
              lastSubmittedTask: existing.lastSubmittedTask
            } : n;
          });
        },
        { remember: false }
      );
    },
    [future, history, edit]
  );
  const launchScope = (0, import_react3.useCallback)(
    (req) => {
      void (async () => {
        await flush();
        if (req.kind === "global") {
          const plan = await bridge.plan(req);
          setLaunchDialog({ plan, excluded: /* @__PURE__ */ new Set() });
        } else {
          await bridge.start(req);
          setBottomOpen(true);
        }
      })().catch(reportError);
    },
    [flush, bridge, reportError]
  );
  const bindAgentSession = (0, import_react3.useCallback)(
    (node) => {
      void (async () => {
        await flush();
        const bound = await bridge.bind({
          nodeId: node.id,
          workspaceId: node.workspaceId || activeWorkspaceId || void 0,
          cwd: node.cwd || activeWorkspaceCwd
        });
        editNode(bound.id, {
          sessionId: bound.sessionId,
          cwd: bound.cwd,
          expanded: true,
          tab: "conversation"
        });
      })().catch(reportError);
    },
    [flush, bridge, activeWorkspaceId, activeWorkspaceCwd, editNode, reportError]
  );
  const extractDisplayFrom = (0, import_react3.useCallback)(
    (sourceNodeId, text, seq, fixed = true) => {
      void (async () => {
        await flush();
        const created = await bridge.display({
          nodeId: sourceNodeId,
          text,
          seq,
          fixed
        });
        setSelection({ nodes: [created.id], groups: [], edge: null });
        showToast(t("nodeCreated"));
      })().catch(reportError);
    },
    [flush, bridge, showToast, reportError]
  );
  const handleInstantiateTemplate = (0, import_react3.useCallback)(
    (tpl) => {
      const occupied = [
        ...docRef.current.nodes.filter((n) => n.kind !== "group").map((n) => nodeBox(n)),
        ...docRef.current.nodes.filter((n) => n.kind === "group").map((g) => groupBox(g))
      ];
      const x = occupied.length ? bounds(occupied).x + bounds(occupied).w + 120 : 40;
      const y = 140;
      let createdGroupId = "";
      edit((d) => {
        const grp = instantiateTemplate(
          d,
          tpl,
          x,
          y,
          tpl.builtin ? t(tpl.title) : tpl.title,
          {
            workspaceId: activeWorkspaceId || void 0,
            cwd: activeWorkspaceCwd
          }
        );
        createdGroupId = grp.id;
      });
      setRouteName("canvas");
      setTimeout(() => focusGroup(createdGroupId), 40);
      showToast(t("templateAdded"));
    },
    [activeWorkspaceId, activeWorkspaceCwd, edit, focusGroup, showToast]
  );
  const handleSaveTemplateDialog = (0, import_react3.useCallback)(
    (groupId) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp) return;
      setFormModal({
        title: t("saveTemplate"),
        initialValue: grp.title,
        secondaryLabel: t("description"),
        secondaryInitial: "",
        onSubmit: (name, desc) => {
          edit((d) => {
            const captured = captureTemplate(d, groupId, name, desc ?? "");
            d.templates = [...d.templates ?? [], captured];
            const target = d.nodes.find((n) => n.id === groupId);
            if (target) {
              target.templateId = captured.id;
              target.templateRevision = captured.revision;
            }
          });
          showToast(t("templateSaved"));
        }
      });
    },
    [edit, showToast]
  );
  const handleSaveNewTemplateVersion = (0, import_react3.useCallback)(
    (groupId) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp?.templateId) return;
      edit((d) => {
        const all = allTemplates(d);
        const src = all.find((tpl) => tpl.id === grp.templateId);
        if (!src) return;
        const captured = captureTemplate(
          d,
          groupId,
          src.builtin ? t(src.title) : src.title,
          src.builtin ? t(src.description) : src.description
        );
        if (!src.builtin) {
          captured.id = src.id;
          captured.revision = src.revision + 1;
          d.templates = [
            ...(d.templates ?? []).filter((x) => x.id !== src.id),
            captured
          ];
        } else {
          d.templates = [...d.templates ?? [], captured];
        }
        const target = d.nodes.find((n) => n.id === groupId);
        if (target) {
          target.templateId = captured.id;
          target.templateRevision = captured.revision;
        }
      });
      showToast(t("templateSaved"));
    },
    [edit, showToast]
  );
  const handleOpenSyncTemplate = (0, import_react3.useCallback)(
    (groupId) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp?.templateId) return;
      const tpl = allTemplates(docRef.current).find(
        (x) => x.id === grp.templateId
      );
      if (!tpl) return;
      setSyncModal({
        groupId,
        plan: computeSyncPlan(docRef.current, grp, tpl)
      });
    },
    []
  );
  const handleCaptureSnapshot = (0, import_react3.useCallback)(() => {
    setFormModal({
      title: t("saveSnapshot"),
      description: t("snapshotDescription"),
      initialValue: `${docRef.current.title} \xB7 ${formatTime(Date.now())}`,
      onSubmit: (title) => {
        const snap = buildSnapshot(docRef.current, snapshot, title);
        edit((d) => {
          d.snapshots = [snap, ...(d.snapshots ?? []).slice(0, 19)];
        });
        showToast(t("snapshotSaved"));
      }
    });
  }, [snapshot, edit, showToast]);
  const handleRestoreSnapshot = (0, import_react3.useCallback)(
    (snap) => {
      edit((d) => {
        const liveNodes = d.nodes;
        d.nodes = structuredClone(snap.nodes).map((n) => {
          const cur = liveNodes.find((x) => x.id === n.id);
          return cur?.sessionId ? {
            ...n,
            sessionId: cur.sessionId,
            cwd: cur.cwd,
            workspaceId: cur.workspaceId,
            lastSubmittedTask: cur.lastSubmittedTask
          } : n;
        });
        d.edges = structuredClone(snap.edges);
        d.viewport = structuredClone(snap.viewport);
      });
      setRouteName("canvas");
      showToast(t("snapshotRestored"));
    },
    [edit, showToast]
  );
  const toggleTheme = (0, import_react3.useCallback)(
    (originEl) => {
      const nextTheme = effectiveTheme === "dark" ? "light" : "dark";
      const applyTheme = () => edit(
        (d) => {
          d.prefs = { ...d.prefs, theme: nextTheme };
        },
        { remember: false }
      );
      const docAny = document;
      if (!reducedMotion && docAny.startViewTransition) {
        const rect = originEl?.getBoundingClientRect();
        if (rect) {
          document.documentElement.style.setProperty(
            "--tx",
            `${rect.left + rect.width / 2}px`
          );
          document.documentElement.style.setProperty(
            "--ty",
            `${rect.top + rect.height / 2}px`
          );
        }
        document.documentElement.dataset.themeTransition = "";
        docAny.startViewTransition(applyTheme).finished.finally(() => {
          delete document.documentElement.dataset.themeTransition;
        });
      } else {
        applyTheme();
      }
    },
    [effectiveTheme, reducedMotion, edit]
  );
  const openAnchoredMenu = (0, import_react3.useCallback)(
    (anchor, items) => {
      const pos = anchor instanceof HTMLElement ? {
        x: anchor.getBoundingClientRect().left,
        y: anchor.getBoundingClientRect().bottom + 6
      } : anchor;
      setMenu({
        x: clamp(pos.x, 8, window.innerWidth - 250),
        y: clamp(pos.y, 8, window.innerHeight - Math.min(420, items.length * 36 + 24)),
        items
      });
    },
    []
  );
  const openAddMenu = (0, import_react3.useCallback)(
    (anchor, worldPt) => {
      openAnchoredMenu(anchor, [
        { heading: t("create") },
        {
          label: t("newAgent"),
          icon: "agent",
          fn: () => createCanvasNode("agent", worldPt)
        },
        {
          label: t("existingSession"),
          icon: "chat",
          fn: () => void bridge.sessions().then(setSessionModal).catch(reportError)
        },
        {
          label: t("newFile"),
          icon: "file",
          fn: () => createCanvasNode("file", worldPt)
        },
        {
          label: t("newNote"),
          icon: "note",
          fn: () => createCanvasNode("note", worldPt)
        },
        {
          label: t("newBoard"),
          icon: "board",
          fn: () => createCanvasNode("board", worldPt)
        },
        { divider: true },
        { heading: t("workflows") },
        ...allTemplates(docRef.current).slice(0, 3).map((tpl) => ({
          label: tpl.builtin ? t(tpl.title) : tpl.title,
          icon: "canvas",
          fn: () => handleInstantiateTemplate(tpl)
        }))
      ]);
    },
    [
      openAnchoredMenu,
      createCanvasNode,
      bridge,
      reportError,
      handleInstantiateTemplate
    ]
  );
  const openNodeContextMenu = (0, import_react3.useCallback)(
    (node, anchor) => {
      selectNode(node.id);
      const items = [
        {
          label: t("rename"),
          icon: "note",
          fn: () => setFormModal({
            title: t("rename"),
            initialValue: node.title,
            onSubmit: (title) => editNode(node.id, { title })
          })
        }
      ];
      if (node.kind === "agent") {
        items.push(
          {
            label: t("runSingle"),
            icon: "play",
            disabled: !(node.draft.trim() || node.task.trim()),
            fn: () => launchScope({ kind: "single", nodeIds: [node.id] })
          },
          {
            label: t("executionDetail"),
            icon: "card",
            fn: () => openDetailCard(node.id)
          }
        );
        if (node.sessionId) {
          items.push({
            label: t("openNativeChat"),
            icon: "chat",
            fn: () => bridge.openChat(node.sessionId)
          });
        }
      }
      items.push(
        { divider: true },
        {
          label: t(node.expanded ? "collapse" : "expand"),
          icon: "card",
          fn: () => toggleNodeForm(node.id)
        },
        {
          label: t(node.window ? "returnCanvas" : "openWindow"),
          icon: "pop",
          fn: () => node.window ? returnWindow(node.id) : openWindow(node.id)
        },
        {
          label: t(node.pinned ? "unpin" : "pin"),
          icon: "pin",
          checked: !!node.pinned,
          fn: () => editNode(node.id, { pinned: !node.pinned })
        },
        {
          label: t("inspect"),
          icon: "side",
          fn: () => setInspectorOpen(true)
        }
      );
      if (node.window) {
        items.push(
          { divider: true },
          ...[
            ["left", "snapLeft"],
            ["right", "snapRight"],
            ["max", "maximize"]
          ].map(([snap, labelKey]) => ({
            label: t(labelKey),
            icon: "card",
            fn: () => editNode(node.id, {
              window: { ...node.window, snap }
            })
          }))
        );
      }
      items.push(
        { divider: true },
        {
          label: t("deleteNode"),
          icon: "trash",
          danger: true,
          fn: () => {
            edit((d) => {
              d.nodes = d.nodes.filter((x) => x.id !== node.id);
              d.edges = d.edges.filter(
                (e) => e.source !== node.id && e.target !== node.id
              );
            });
            setSelection({ nodes: [], groups: [], edge: null });
          }
        }
      );
      openAnchoredMenu(anchor, items);
    },
    [
      selectNode,
      editNode,
      launchScope,
      openDetailCard,
      bridge,
      toggleNodeForm,
      returnWindow,
      openWindow,
      edit,
      openAnchoredMenu
    ]
  );
  const openGroupContextMenu = (0, import_react3.useCallback)(
    (group, anchor) => {
      setSelection({ nodes: [], groups: [group.id], edge: null });
      const items = [
        {
          label: t("rename"),
          icon: "note",
          fn: () => setFormModal({
            title: t("rename"),
            initialValue: group.title,
            onSubmit: (title) => editNode(group.id, { title, titleKey: void 0 })
          })
        },
        {
          label: t("runGroup"),
          icon: "play",
          fn: () => launchScope({ kind: "group", nodeIds: [group.id] })
        },
        {
          label: t(group.collapsed ? "expand" : "collapse"),
          icon: "card",
          fn: () => editNode(group.id, { collapsed: !group.collapsed })
        },
        {
          label: t("ports"),
          icon: "side",
          fn: () => setInspectorOpen(true)
        },
        { divider: true },
        {
          label: t("saveTemplate"),
          icon: "box",
          fn: () => handleSaveTemplateDialog(group.id)
        }
      ];
      if (group.templateId) {
        items.push(
          {
            label: t("syncTemplate"),
            icon: "undo",
            fn: () => handleOpenSyncTemplate(group.id)
          },
          {
            label: t("saveNewVersion"),
            icon: "check",
            fn: () => handleSaveNewTemplateVersion(group.id)
          },
          {
            label: t("detachTemplate"),
            icon: "off",
            fn: () => editNode(group.id, {
              templateId: void 0,
              templateRevision: void 0
            })
          }
        );
      }
      items.push(
        { divider: true },
        {
          label: t("ungroup"),
          icon: "x",
          danger: true,
          fn: () => ungroup(group.id)
        }
      );
      openAnchoredMenu(anchor, items);
    },
    [
      editNode,
      launchScope,
      handleSaveTemplateDialog,
      handleOpenSyncTemplate,
      handleSaveNewTemplateVersion,
      ungroup,
      openAnchoredMenu
    ]
  );
  const trackPointer = (0, import_react3.useCallback)(
    (startEvent, onMove, onEnd) => {
      startEvent.preventDefault();
      const move = (ev) => onMove(ev);
      const up = (ev) => finish(ev, false);
      const cancel = (ev) => finish(ev, true);
      const key = (ev) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          finish(ev, true);
        }
      };
      function finish(ev, canceled) {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", key, true);
        onEnd?.(ev, canceled);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", key, true);
    },
    []
  );
  const startPan = (0, import_react3.useCallback)(
    (ev) => {
      const origin = { ...docRef.current.viewport };
      const sx = ev.clientX, sy = ev.clientY;
      let moved = false;
      viewAnimToken.current++;
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          if (!moved && Math.hypot(next.clientX - sx, next.clientY - sy) < 3)
            return;
          moved = true;
          setViewportDirect(
            {
              x: origin.x + (next.clientX - sx),
              y: origin.y + (next.clientY - sy),
              zoom: origin.zoom
            },
            900
          );
        },
        (_, canceled) => {
          setIsDragging(false);
          if (canceled) setViewportDirect(origin, 300);
          else if (!moved && !spacePressed && tool !== "hand") {
            setSelection({ nodes: [], groups: [], edge: null });
          } else {
            setViewportDirect(docRef.current.viewport, 250);
          }
        }
      );
    },
    [trackPointer, setViewportDirect, spacePressed, tool]
  );
  const startWindowMove = (0, import_react3.useCallback)(
    (ev, nodeId, returnOnDrop = ev.altKey) => {
      const curNode = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!curNode?.window) return;
      const area = areaRef.current;
      if (!area) return;
      const originWin = structuredClone(curNode.window);
      const sx = ev.clientX, sy = ev.clientY;
      const maxZ = Math.max(
        10,
        ...docRef.current.nodes.filter((n) => n.window).map((n) => n.window?.z ?? 10)
      ) + 1;
      let baseX = originWin.x, baseY = originWin.y;
      if (originWin.snap) {
        const rect = area.getBoundingClientRect();
        baseX = clamp(
          sx - rect.left - originWin.w / 2,
          0,
          Math.max(0, area.clientWidth - originWin.w)
        );
        baseY = 16;
      }
      setHistory((h) => [...h.slice(-39), docRef.current]);
      setFuture([]);
      let snap = null;
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const nx = baseX + (next.clientX - sx);
          const ny = baseY + (next.clientY - sy);
          const rect = area.getBoundingClientRect();
          snap = next.ctrlKey ? null : next.clientY < rect.top + 24 ? "max" : next.clientX < rect.left + 36 ? "left" : next.clientX > rect.right - 36 ? "right" : null;
          setSnapPreview(snap);
          edit(
            (d) => {
              const target = d.nodes.find((x) => x.id === nodeId);
              if (target?.window) {
                target.window = {
                  ...target.window,
                  x: nx,
                  y: ny,
                  snap: null,
                  z: maxZ
                };
              }
            },
            { remember: false, delay: 900 }
          );
        },
        (_, canceled) => {
          setIsDragging(false);
          setSnapPreview(null);
          edit(
            (d) => {
              const target = d.nodes.find((x) => x.id === nodeId);
              if (!target) return;
              if (canceled) {
                target.window = originWin;
              } else if (returnOnDrop) {
                delete target.window;
              } else if (target.window) {
                target.window.snap = snap;
                target.window.x = clamp(
                  target.window.x,
                  0,
                  Math.max(0, area.clientWidth - target.window.w)
                );
                target.window.y = clamp(
                  target.window.y,
                  0,
                  Math.max(0, area.clientHeight - 48)
                );
              }
            },
            { remember: false, delay: 250 }
          );
        }
      );
    },
    [trackPointer, edit]
  );
  const startNodeMove = (0, import_react3.useCallback)(
    (ev, nodeId) => {
      const node = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.window) {
        startWindowMove(ev, nodeId);
        return;
      }
      if (ev.altKey) {
        openWindow(nodeId);
        setTimeout(() => startWindowMove(ev, nodeId, false), 0);
        return;
      }
      if (ev.shiftKey) {
        selectNode(nodeId, true);
        return;
      }
      const activeIds = selection.nodes.includes(nodeId) ? selection.nodes : [nodeId];
      if (!selection.nodes.includes(nodeId)) {
        selectNode(nodeId);
      }
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const startWorld = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY
      );
      const originals = activeIds.map((id) => docRef.current.nodes.find((n) => n.id === id)).filter((n) => !!n).map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        parentId: n.parentId
      }));
      let moved = false;
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY
          );
          const dx = cur.x - startWorld.x, dy = cur.y - startWorld.y;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            setIsDragging(true);
            setHistory((h) => [...h.slice(-39), docRef.current]);
            setFuture([]);
          }
          edit(
            (d) => {
              for (const orig of originals) {
                const target = d.nodes.find((x) => x.id === orig.id);
                if (target) {
                  target.x = orig.x + dx;
                  target.y = orig.y + dy;
                }
              }
            },
            { remember: false, delay: 900 }
          );
        },
        (endEv, canceled) => {
          setIsDragging(false);
          if (!moved) return;
          if (canceled) {
            edit(
              (d) => {
                for (const orig of originals) {
                  const target = d.nodes.find((x) => x.id === orig.id);
                  if (target) {
                    target.x = orig.x;
                    target.y = orig.y;
                    target.parentId = orig.parentId;
                  }
                }
              },
              { remember: false, delay: 250 }
            );
            setHistory((h) => h.slice(0, -1));
            return;
          }
          const noSnap = "ctrlKey" in endEv && endEv.ctrlKey;
          edit(
            (d) => {
              const candidateGroups = d.nodes.filter((g) => g.kind === "group" && !g.collapsed).sort((a, b) => a.width * a.height - b.width * b.height);
              for (const orig of originals) {
                const target = d.nodes.find((x) => x.id === orig.id);
                if (!target) continue;
                if (prefs.snap && !noSnap) {
                  target.x = Math.round(target.x / 12) * 12;
                  target.y = Math.round(target.y / 12) * 12;
                }
                const box = nodeBox(target);
                const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
                const hitGroup = candidateGroups.find(
                  (g) => g.id !== target.id && cx > g.x && cx < g.x + g.width && cy > g.y + 42 && cy < g.y + g.height
                );
                target.parentId = hitGroup?.id;
              }
            },
            { remember: false, delay: 250 }
          );
        }
      );
    },
    [
      startWindowMove,
      openWindow,
      selectNode,
      selection.nodes,
      trackPointer,
      edit,
      prefs.snap
    ]
  );
  const startGroupMove = (0, import_react3.useCallback)(
    (ev, groupId) => {
      if (ev.shiftKey) {
        selectNode(groupId, true);
        return;
      }
      setSelection({ nodes: [], groups: [groupId], edge: null });
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const startWorld = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY
      );
      const movingIds = [groupId, ...groupDescendants(docRef.current, groupId)];
      const originals = movingIds.map((id) => docRef.current.nodes.find((n) => n.id === id)).filter((n) => !!n).map((n) => ({ id: n.id, x: n.x, y: n.y }));
      let moved = false;
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY
          );
          const dx = cur.x - startWorld.x, dy = cur.y - startWorld.y;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            setIsDragging(true);
            setHistory((h) => [...h.slice(-39), docRef.current]);
            setFuture([]);
          }
          edit(
            (d) => {
              for (const orig of originals) {
                const item = d.nodes.find((x) => x.id === orig.id);
                if (item) {
                  item.x = orig.x + dx;
                  item.y = orig.y + dy;
                }
              }
            },
            { remember: false, delay: 900 }
          );
        },
        (_, canceled) => {
          setIsDragging(false);
          if (!moved) return;
          if (canceled) {
            edit(
              (d) => {
                for (const orig of originals) {
                  const item = d.nodes.find((x) => x.id === orig.id);
                  if (item) {
                    item.x = orig.x;
                    item.y = orig.y;
                  }
                }
              },
              { remember: false, delay: 250 }
            );
            setHistory((h) => h.slice(0, -1));
          } else {
            void flush().catch(reportError);
          }
        }
      );
    },
    [selectNode, trackPointer, edit, flush, reportError]
  );
  const startResize = (0, import_react3.useCallback)(
    (ev, nodeId, mode) => {
      ev.stopPropagation();
      const target = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const initialBox = mode === "window" && target.window ? { w: target.window.w, h: target.window.h } : mode === "group" ? groupBox(target) : nodeBox(target, false, true);
      const sx = ev.clientX, sy = ev.clientY;
      const scale = mode === "window" ? 1 : docRef.current.viewport.zoom;
      setHistory((h) => [...h.slice(-39), docRef.current]);
      setFuture([]);
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const nw = Math.max(
            mode === "group" ? 260 : 288,
            initialBox.w + (next.clientX - sx) / scale
          );
          const nh = Math.max(
            mode === "group" ? 180 : 220,
            initialBox.h + (next.clientY - sy) / scale
          );
          edit(
            (d) => {
              const n = d.nodes.find((x) => x.id === nodeId);
              if (!n) return;
              if (mode === "window" && n.window) {
                n.window.w = nw;
                n.window.h = nh;
                n.window.snap = null;
              } else {
                n.width = nw;
                n.height = nh;
              }
            },
            { remember: false, delay: 900 }
          );
        },
        (_, canceled) => {
          setIsDragging(false);
          if (canceled) {
            edit(
              (d) => {
                const n = d.nodes.find((x) => x.id === nodeId);
                if (!n) return;
                if (mode === "window" && n.window) {
                  n.window.w = initialBox.w;
                  n.window.h = initialBox.h;
                } else {
                  n.width = initialBox.w;
                  n.height = initialBox.h;
                }
              },
              { remember: false, delay: 250 }
            );
            setHistory((h) => h.slice(0, -1));
          } else {
            void flush().catch(reportError);
          }
        }
      );
    },
    [trackPointer, edit, flush, reportError]
  );
  const startPortDrag = (0, import_react3.useCallback)(
    (ev, fromIds, kind) => {
      ev.stopPropagation();
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect || !fromIds.length) return;
      const fromPt = endpoint(
        docRef.current,
        fromIds[0],
        kind,
        "out",
        lod,
        keepExpandedIds
      );
      setConnecting({
        kind,
        fromIds,
        fromPoint: fromPt,
        current: { x: fromPt.x, y: fromPt.y }
      });
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY
          );
          setConnecting((prev) => prev ? { ...prev, current: cur } : null);
        },
        (endEv, canceled) => {
          setIsDragging(false);
          setConnecting(null);
          if (canceled || !("clientX" in endEv)) return;
          const hitEl = document.elementFromPoint(
            endEv.clientX,
            endEv.clientY
          );
          const inPort = hitEl?.closest(
            '[data-port-direction="in"]'
          );
          const hitCard = hitEl?.closest("[data-node-card]");
          const dropWorld = toWorld(
            docRef.current.viewport,
            vpRect,
            endEv.clientX,
            endEv.clientY
          );
          if (inPort && inPort.dataset.portKind === kind) {
            const proxyIds = inPort.dataset.proxyNodes?.split(",").filter(Boolean);
            const targetIds = proxyIds?.length ? proxyIds : inPort.dataset.nodeId ? [inPort.dataset.nodeId] : [];
            if (targetIds.length) connectNodes(fromIds, targetIds, kind);
            return;
          }
          if (hitCard?.dataset.nodeCard) {
            const targetNode = docRef.current.nodes.find(
              (n) => n.id === hitCard.dataset.nodeCard
            );
            if (targetNode?.kind === "agent") {
              connectNodes(fromIds, [targetNode.id], kind);
              return;
            }
          }
          if (hitEl?.closest(".fs-viewport") && !hitEl.closest(".node,.workflow-group,.fs-minimap,.fs-canvas-controls")) {
            const source = docRef.current.nodes.find(
              (n) => n.id === fromIds[0]
            );
            if (!source) return;
            if (kind === "continuation" && source.kind === "agent") {
              const downstream = createCanvasNode("agent", dropWorld);
              edit((d) => {
                d.edges.push(newEdge(source.id, downstream.id, "continuation"));
              });
            } else {
              const latestText = source.kind === "agent" ? snapshot?.live.find((l) => l.nodeId === source.id)?.output || snapshot?.runs.flatMap((r) => r.steps).filter((s) => s.nodeId === source.id).at(-1)?.output || "" : source.text;
              const disp = {
                ...newNode(
                  "display",
                  dropWorld.x - 140,
                  dropWorld.y - 60,
                  `${source.title} \xB7 ${t("newDisplay")}`
                ),
                sourceNodeId: source.id,
                text: latestText,
                fixed: source.kind !== "agent",
                expanded: true
              };
              edit((d) => d.nodes.push(disp));
              selectNode(disp.id);
            }
          }
        }
      );
    },
    [
      lod,
      keepExpandedIds,
      trackPointer,
      connectNodes,
      createCanvasNode,
      edit,
      snapshot,
      selectNode
    ]
  );
  const startWaypointDrag = (0, import_react3.useCallback)(
    (ev, edgeId, wpIndex) => {
      ev.stopPropagation();
      const vpRect = viewportRef.current?.getBoundingClientRect();
      const edge = docRef.current.edges.find((e) => e.id === edgeId);
      const origWp = edge?.waypoints?.[wpIndex] ? { ...edge.waypoints[wpIndex] } : null;
      if (!vpRect || !origWp) return;
      setHistory((h) => [...h.slice(-39), docRef.current]);
      setFuture([]);
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const pt = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY
          );
          edit(
            (d) => {
              const target = d.edges.find((x) => x.id === edgeId);
              if (target?.waypoints?.[wpIndex]) {
                target.waypoints[wpIndex] = pt;
              }
            },
            { remember: false, delay: 900 }
          );
        },
        (_, canceled) => {
          setIsDragging(false);
          if (canceled) {
            edit(
              (d) => {
                const target = d.edges.find((x) => x.id === edgeId);
                if (target?.waypoints?.[wpIndex]) {
                  target.waypoints[wpIndex] = origWp;
                }
              },
              { remember: false, delay: 250 }
            );
            setHistory((h) => h.slice(0, -1));
          } else {
            void flush().catch(reportError);
          }
        }
      );
    },
    [trackPointer, edit, flush, reportError]
  );
  const startMarquee = (0, import_react3.useCallback)(
    (ev) => {
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const start = toWorld(
        docRef.current.viewport,
        vpRect,
        ev.clientX,
        ev.clientY
      );
      const baseNodes = new Set(ev.shiftKey ? selection.nodes : []);
      setIsDragging(true);
      trackPointer(
        ev,
        (next) => {
          const cur = toWorld(
            docRef.current.viewport,
            vpRect,
            next.clientX,
            next.clientY
          );
          const x = Math.min(start.x, cur.x), y = Math.min(start.y, cur.y), w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y);
          const v = docRef.current.viewport;
          setMarquee({
            x: x * v.zoom + v.x,
            y: y * v.zoom + v.y,
            w: w * v.zoom,
            h: h * v.zoom
          });
          const hit = docRef.current.nodes.filter((n) => {
            if (!isNodeVisible(n)) return false;
            const b = nodeBox(n, lod, keepExpandedIds.has(n.id));
            return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
          }).map((n) => n.id);
          setSelection({
            nodes: [.../* @__PURE__ */ new Set([...baseNodes, ...hit])],
            groups: [],
            edge: null
          });
        },
        () => {
          setIsDragging(false);
          setMarquee(null);
        }
      );
    },
    [selection.nodes, trackPointer, isNodeVisible, lod, keepExpandedIds]
  );
  (0, import_react3.useEffect)(() => {
    const onKeyDown = (ev) => {
      const target = ev.target;
      const inOurRoot = rootRef.current?.contains(target) || document.activeElement === document.body;
      if (!inOurRoot && !paletteDialog && !launchDialog && !helpModal) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const typing = !!target?.closest(
        'input, textarea, select, [contenteditable="true"]'
      );
      if (paletteDialog || launchDialog || formModal || sessionModal || fileModal || templatePreviewModal || syncModal || mergePortsModal || exchangeModal || helpModal) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          setPaletteDialog(null);
          setLaunchDialog(null);
          setFormModal(null);
          setSessionModal(null);
          setFileModal(null);
          setTemplatePreviewModal(null);
          setSyncModal(null);
          setMergePortsModal(null);
          setExchangeModal(null);
          setHelpModal(false);
          return;
        }
        if (ev.key === "Tab" && dialogRef.current) {
          const stops = Array.from(
            dialogRef.current.querySelectorAll(
              'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]'
            )
          ).filter((el) => el.offsetParent !== null);
          if (stops.length) {
            const first = stops[0], last = stops[stops.length - 1];
            if (ev.shiftKey && document.activeElement === first) {
              ev.preventDefault();
              last.focus();
            } else if (!ev.shiftKey && document.activeElement === last) {
              ev.preventDefault();
              first.focus();
            }
          }
        }
        return;
      }
      if (menu && ev.key === "Escape") {
        ev.preventDefault();
        setMenu(null);
        return;
      }
      if (mod && (ev.key.toLowerCase() === "k" || ev.key.toLowerCase() === "f")) {
        if (!target?.closest(".fs-embedded")) {
          ev.preventDefault();
          setPaletteDialog({ targetNodeId: null, query: "", index: 0 });
          return;
        }
      }
      if (typing) return;
      if (ev.code === "Space" && !target?.closest("button")) {
        ev.preventDefault();
        setSpacePressed(true);
        return;
      }
      if (mod && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        performUndo(ev.shiftKey);
        return;
      }
      if (mod && ev.key === "Enter") {
        ev.preventDefault();
        const scopeIds = [
          ...selection.nodes,
          ...selection.groups.flatMap((gid) => members(docRef.current, gid))
        ];
        if (scopeIds.length) {
          launchScope({ kind: "selection", nodeIds: scopeIds });
        } else {
          launchScope({ kind: "global", nodeIds: [] });
        }
        return;
      }
      if (ev.altKey && ev.key === "Enter" && selection.nodes.length === 1) {
        ev.preventDefault();
        openWindow(selection.nodes[0]);
        return;
      }
      if (mod) return;
      const lower = ev.key.toLowerCase();
      if (lower === "f") {
        ev.preventDefault();
        fitView(ev.shiftKey);
      } else if (lower === "g") {
        ev.preventDefault();
        groupSelected();
      } else if (lower === "d" && selection.nodes.length === 1) {
        const n = docRef.current.nodes.find((x) => x.id === selection.nodes[0]);
        if (n?.kind === "agent") {
          ev.preventDefault();
          openDetailCard(n.id);
        }
      } else if (lower === "v") {
        setTool("pointer");
      } else if (lower === "h") {
        setTool("hand");
      } else if (ev.key === "Escape") {
        setMenu(null);
        setSelection({ nodes: [], groups: [], edge: null });
      } else if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        deleteSelection();
      } else if (ev.key.startsWith("Arrow") && selection.nodes.length === 1) {
        ev.preventDefault();
        const cur = docRef.current.nodes.find(
          (x) => x.id === selection.nodes[0]
        );
        if (!cur) return;
        const cb = nodeBox(cur);
        const cx = cb.x + cb.w / 2, cy = cb.y + cb.h / 2;
        const horiz = ev.key === "ArrowLeft" || ev.key === "ArrowRight";
        const sign = ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 1;
        const nextCandidate = docRef.current.nodes.filter((n) => n.id !== cur.id && isNodeVisible(n)).map((n) => {
          const nb = nodeBox(n);
          const dx = nb.x + nb.w / 2 - cx, dy = nb.y + nb.h / 2 - cy;
          return {
            n,
            primary: horiz ? dx * sign : dy * sign,
            cross: horiz ? Math.abs(dy) : Math.abs(dx)
          };
        }).filter((c) => c.primary > 8).sort((a, b) => a.primary + a.cross * 2 - (b.primary + b.cross * 2))[0];
        if (nextCandidate) revealNode(nextCandidate.n.id);
      }
    };
    const onKeyUp = (ev) => {
      if (ev.code === "Space") setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    paletteDialog,
    launchDialog,
    formModal,
    sessionModal,
    fileModal,
    templatePreviewModal,
    syncModal,
    mergePortsModal,
    exchangeModal,
    helpModal,
    menu,
    performUndo,
    selection,
    launchScope,
    openWindow,
    fitView,
    groupSelected,
    openDetailCard,
    deleteSelection,
    isNodeVisible,
    revealNode
  ]);
  (0, import_react3.useEffect)(() => {
    if (!menu) return;
    const onDown = (ev) => {
      if (!ev.target?.closest(".fs-menu")) {
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menu]);
  (0, import_react3.useEffect)(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (ev) => {
      const target = ev.target;
      if (target?.closest(".fs-canvas-controls, .fs-minimap")) return;
      if (!ev.ctrlKey && target?.closest(".node.full")) return;
      ev.preventDefault();
      viewAnimToken.current++;
      const cur = docRef.current.viewport;
      if (prefs.wheel === "pan" && !ev.ctrlKey) {
        setViewportDirect(
          { x: cur.x - ev.deltaX, y: cur.y - ev.deltaY, zoom: cur.zoom },
          400
        );
      } else {
        const factor = Math.exp(-ev.deltaY * (ev.ctrlKey ? 8e-3 : 18e-4));
        setViewportDirect(
          zoomAt(cur, vp.getBoundingClientRect(), ev.clientX, ev.clientY, factor),
          400
        );
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [prefs.wheel, setViewportDirect]);
  const exchanges = (0, import_react3.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    for (const run of snapshot?.runs ?? []) {
      for (const tk of run.tokens) {
        if (!tk.consumed && !tk.ready) continue;
        const edge = run.graph.edges.find((e) => e.id === tk.edgeId);
        if (!edge || edge.kind !== "continuation") continue;
        const [a, b] = edge.source < edge.target ? [edge.source, edge.target] : [edge.target, edge.source];
        const key = `${a}::${b}`;
        let entry = map.get(key);
        if (!entry) {
          entry = { id: key, from: edge.source, to: edge.target, items: [] };
          map.set(key, entry);
        }
        if (tk.source.text.trim()) {
          entry.items.push({
            id: tk.id,
            fromId: edge.source,
            toId: edge.target,
            text: tk.source.text,
            at: tk.source.capturedAt,
            seq: tk.source.seq
          });
        }
      }
    }
    return [...map.values()].filter(
      (ex) => ex.items.length > 0 && isNodeVisible(
        doc.nodes.find((n) => n.id === ex.from),
        true
      ) && isNodeVisible(
        doc.nodes.find((n) => n.id === ex.to),
        true
      )
    );
  }, [snapshot?.runs, doc.nodes, isNodeVisible]);
  const svgBounds = (0, import_react3.useMemo)(() => {
    const visBoxes = [
      ...doc.nodes.filter((n) => isNodeVisible(n)).map((n) => nodeBox(n, lod, keepExpandedIds.has(n.id))),
      ...visibleGroups.map((g) => groupBox(g)),
      {
        x: -view.x / view.zoom,
        y: -view.y / view.zoom,
        w: vpSize.width / view.zoom,
        h: vpSize.height / view.zoom
      }
    ];
    const b = bounds(visBoxes);
    return {
      x: b.x - 256,
      y: b.y - 256,
      w: b.w + 512,
      h: b.h + 512
    };
  }, [doc.nodes, isNodeVisible, lod, keepExpandedIds, visibleGroups, view, vpSize]);
  const edgeVisualState = (0, import_react3.useCallback)(
    (edge) => {
      if (edge.kind === "reference") {
        if (!edge.sentVersion) return "pending";
        return "sent";
      }
      const activeTokens = snapshot?.runs.filter((r) => ["running", "waiting", "paused"].includes(r.state)).flatMap((r) => r.tokens.filter((tk) => tk.edgeId === edge.id)) ?? [];
      if (activeTokens.some(
        (tk) => !tk.ready && !tk.consumed && !tk.dismissed && tk.boundary
      ))
        return "boundary";
      if (activeTokens.some(
        (tk) => !tk.ready && !tk.consumed && !tk.dismissed && !tk.boundary
      ))
        return "waiting";
      if (activeTokens.some((tk) => tk.ready && !tk.consumed)) return "queued";
      const targetState = nodeStatusOf(snapshot, edge.target);
      if (targetState === "running" && snapshot?.runs.some(
        (r) => r.state === "running" && r.tokens.some((tk) => tk.edgeId === edge.id && tk.consumed)
      ))
        return "active";
      if (snapshot?.runs.some(
        (r) => r.tokens.some((tk) => tk.edgeId === edge.id && tk.consumed)
      ))
        return "done";
      return "idle";
    },
    [snapshot]
  );
  const paletteEntries = (0, import_react3.useMemo)(() => {
    if (!paletteDialog) return [];
    const targetId = paletteDialog.targetNodeId;
    const needle = paletteDialog.query.trim().toLowerCase();
    const list = [];
    if (!targetId) {
      const cmds = [
        ["newAgent", "agent", () => createCanvasNode("agent")],
        [
          "existingSession",
          "chat",
          () => void bridge.sessions().then(setSessionModal).catch(reportError)
        ],
        ["newFile", "file", () => createCanvasNode("file")],
        ["newNote", "note", () => createCanvasNode("note")],
        ["newBoard", "board", () => createCanvasNode("board")],
        [
          "runAll",
          "play",
          () => launchScope({ kind: "global", nodeIds: [] })
        ],
        ["groupSelection", "group", groupSelected],
        ["tidy", "tidy", arrangeTopology],
        ["fitView", "fit", () => fitView(false)],
        ["saveSnapshot", "clock", handleCaptureSnapshot],
        ["workflowLibrary", "box", () => setRouteName("workflows")],
        ["activity", "bolt", () => setRouteName("activity")],
        ["settings", "gear", () => setRouteName("settings")]
      ];
      for (const [key, glyph, fn] of cmds) {
        list.push({
          label: t(key),
          section: t("command"),
          icon: glyph,
          fn
        });
      }
      for (const tpl of allTemplates(doc)) {
        list.push({
          label: tpl.builtin ? t(tpl.title) : tpl.title,
          detail: tpl.builtin ? t(tpl.description) : tpl.description,
          section: t("workflows"),
          icon: "canvas",
          fn: () => handleInstantiateTemplate(tpl)
        });
      }
    }
    for (const node of doc.nodes) {
      if (node.kind === "group") continue;
      if (targetId && node.id === targetId) continue;
      list.push({
        label: node.title,
        detail: node.kind.toUpperCase(),
        section: t("canvas"),
        icon: kindIconName(node.kind),
        fn: () => {
          if (!targetId) {
            revealNode(node.id);
            return;
          }
          if (node.kind === "agent") {
            edit((d) => {
              if (!d.edges.some(
                (e) => e.source === node.id && e.target === targetId
              )) {
                d.edges.push({
                  ...newEdge(node.id, targetId, "continuation"),
                  trigger: "off"
                });
              }
              const tgt = d.nodes.find((x) => x.id === targetId);
              if (tgt) {
                tgt.draft = `${tgt.draft ? tgt.draft + " " : ""}@${node.title} `;
                tgt.task = tgt.draft;
              }
            });
          } else {
            connectNodes([node.id], [targetId], "reference");
            editNode(targetId, {
              draft: `${docRef.current.nodes.find((x) => x.id === targetId)?.draft ?? ""}@${node.title} `,
              task: `${docRef.current.nodes.find((x) => x.id === targetId)?.draft ?? ""}@${node.title} `
            });
          }
        }
      });
    }
    if (targetId) {
      for (const filePath of workspaceFilesList) {
        list.push({
          label: filePath.split("/").pop() ?? filePath,
          detail: filePath,
          section: t("newFile"),
          icon: "file",
          fn: () => {
            const targetNode = docRef.current.nodes.find(
              (n) => n.id === targetId
            );
            if (!targetNode) return;
            edit((d) => {
              let fileNode = d.nodes.find(
                (n) => n.kind === "file" && (n.text === filePath || n.selectedItems?.includes(filePath))
              );
              if (!fileNode) {
                fileNode = {
                  ...newNode(
                    "file",
                    targetNode.x - 320,
                    targetNode.y + 40,
                    filePath.split("/").pop() ?? filePath
                  ),
                  cwd: targetNode.cwd || activeWorkspaceCwd,
                  text: filePath,
                  items: [
                    .../* @__PURE__ */ new Set([filePath, ...workspaceFilesList.slice(0, 10)])
                  ],
                  selectedItems: [filePath],
                  expanded: false
                };
                d.nodes.push(fileNode);
              }
              if (!d.edges.some(
                (e) => e.source === fileNode.id && e.target === targetId && e.kind === "reference"
              )) {
                d.edges.push(newEdge(fileNode.id, targetId, "reference"));
              }
              const tgt = d.nodes.find((x) => x.id === targetId);
              if (tgt) {
                tgt.draft = `${tgt.draft ? tgt.draft + " " : ""}@${filePath} `;
                tgt.task = tgt.draft;
              }
            });
          }
        });
      }
    }
    return list.filter(
      (item) => !needle || `${item.label} ${item.detail ?? ""} ${item.section}`.toLowerCase().includes(needle)
    ).slice(0, 20);
  }, [
    paletteDialog,
    doc,
    workspaceFilesList,
    createCanvasNode,
    bridge,
    reportError,
    launchScope,
    groupSelected,
    arrangeTopology,
    fitView,
    handleCaptureSnapshot,
    handleInstantiateTemplate,
    revealNode,
    edit,
    connectNodes,
    editNode,
    activeWorkspaceCwd
  ]);
  const handleExportJson = (0, import_react3.useCallback)(() => {
    const blob = new Blob([JSON.stringify(docRef.current, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docRef.current.title || "flowspace"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, []);
  const handleImportFile = (0, import_react3.useCallback)(
    async (file) => {
      try {
        const parsed = JSON.parse(await file.text());
        const savedDoc = await bridge.save({
          ...parsed,
          version: 1,
          id: "main"
        });
        docRef.current = savedDoc;
        setDoc(savedDoc);
        setRouteName("canvas");
        setTimeout(() => fitView(true), 60);
      } catch (err) {
        reportError(err);
      }
    },
    [bridge, fitView, reportError]
  );
  const selectedNode = (0, import_react3.useMemo)(() => {
    if (selection.groups.length === 1) {
      return doc.nodes.find((n) => n.id === selection.groups[0]);
    }
    if (selection.nodes.length === 1) {
      return doc.nodes.find((n) => n.id === selection.nodes[0]);
    }
    return void 0;
  }, [doc.nodes, selection]);
  const selectedEdge = (0, import_react3.useMemo)(
    () => selection.edge ? doc.edges.find((e) => e.id === selection.edge) : void 0,
    [doc.edges, selection.edge]
  );
  const hasRunnableSelection = (0, import_react3.useMemo)(() => {
    if (selection.groups.length > 0) return true;
    return selection.nodes.some(
      (id) => doc.nodes.find((n) => n.id === id)?.kind === "agent"
    );
  }, [selection, doc.nodes]);
  const conversationFocusAgent = (0, import_react3.useMemo)(() => {
    const explicit = doc.nodes.find(
      (n) => n.id === lastAgentId && n.kind === "agent"
    );
    return explicit ?? doc.nodes.find((n) => n.kind === "agent");
  }, [doc.nodes, lastAgentId]);
  const leftSnapped = doc.nodes.some((n) => n.window?.snap === "left");
  const rightSnapped = doc.nodes.some((n) => n.window?.snap === "right");
  const renderNodeCard = (node, placement) => {
    const state = node.kind === "agent" ? nodeStatusOf(snapshot, node.id) : "";
    const waitingGates = node.kind === "agent" ? waitingForNode(node.id) : [];
    const live = snapshot?.live.find((l) => l.nodeId === node.id);
    const isSelected = selection.nodes.includes(node.id);
    const box = nodeBox(node, lod, keepExpandedIds.has(node.id));
    const compact = placement === "canvas" && isCompactNode(node, lod, keepExpandedIds.has(node.id));
    let style;
    if (placement === "window" && node.window) {
      const aw = areaRef.current?.clientWidth || vpSize.width;
      const ah = areaRef.current?.clientHeight || vpSize.height;
      const win = node.window;
      const rect = win.snap === "left" ? { x: 0, y: 0, w: aw / 2, h: ah } : win.snap === "right" ? { x: aw / 2, y: 0, w: aw / 2, h: ah } : win.snap === "max" ? { x: 0, y: 0, w: aw, h: ah } : win;
      style = {
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex: win.z ?? 12
      };
    } else if (placement === "canvas") {
      style = {
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h
      };
    }
    const linkedPort = (pKind, dir) => doc.edges.some(
      (e) => e.kind === pKind && (dir === "in" ? e.target === node.id : e.source === node.id)
    ) || pKind === "reference" && dir === "in" && (node.kind === "display" || node.kind === "detail") && !!node.sourceNodeId;
    const activeTab = node.tab ?? "task";
    const nodeSteps = snapshot?.runs.flatMap((r) => r.steps).filter((s) => s.nodeId === node.id) ?? [];
    const latestOutput = live?.output || nodeSteps.filter((s) => s.output).at(-1)?.output || "";
    const incomingRefs = doc.edges.filter(
      (e) => e.kind === "reference" && e.target === node.id
    );
    const hasForkInbound = doc.edges.some(
      (e) => e.target === node.id && e.mode === "fork"
    );
    const renderCompactBody = () => {
      if (node.kind === "agent") {
        const wsName = workspaces.find((w) => w.id === node.workspaceId)?.name || node.cwd?.split(/[\\/]/).filter(Boolean).pop() || t("currentWorkspace");
        const summary = waitingGates.length ? `${waitingGates[0].token.source.title} \u2192 ${t("waitingConfirmation")}` : node.draft.trim() || (state === "draft" ? node.task || t("taskPlaceholder") : latestOutput || node.task);
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "compact-status", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: `status status-${state}`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {}),
              t(state)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: wsName })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "compact-summary user-content", children: summary }),
          waitingGates.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "button",
            {
              type: "button",
              className: "compact-release",
              onClick: (e) => {
                e.stopPropagation();
                void bridge.release(
                  waitingGates[0].run.id,
                  waitingGates[0].token.id,
                  true
                ).catch(reportError);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("release") })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              className: `progress-line ${state === "running" ? "is-running" : ""}`,
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {})
            }
          )
        ] });
      }
      if (node.kind === "note" || node.kind === "display") {
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "compact-summary user-content", children: node.text || t(node.kind === "note" ? "notePlaceholder" : "noOutput") }),
          node.kind === "display" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "compact-display-mode", children: t(node.fixed ? "fixed" : "follow") })
        ] });
      }
      if (node.kind === "board") {
        const cols = node.columns ?? [];
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "compact-tool", children: cols.map((col, idx) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
          t(["todo", "inProgress", "completedColumn"][idx] ?? col.name),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: col.cards.length })
        ] }, col.id)) });
      }
      if (node.kind === "detail") {
        const srcState = node.sourceNodeId ? nodeStatusOf(snapshot, node.sourceNodeId) : "draft";
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "compact-tool", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: `status status-${srcState}`, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {}),
            t(srcState)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("executionDetail") })
        ] });
      }
      const count = node.selectedItems?.length || (node.text ? 1 : 0);
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "compact-tool", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: node.text.split("\n")[0] || t("newFile") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("selectedCount", { count }) })
      ] });
    };
    const renderFullBody = () => {
      if (node.kind === "agent") {
        const wsName = workspaces.find((w) => w.id === node.workspaceId)?.name || node.cwd?.split(/[\\/]/).filter(Boolean).pop() || t("currentWorkspace");
        const nativeEnabled = node.nativeTrigger === "inherit" ? doc.settings.nativeChatTriggers : node.nativeTrigger === "enabled";
        const queuedCount = nodeSteps.filter((s) => s.state === "queued").length;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-status-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "span",
              {
                className: `status status-${waitingGates.length ? "waiting" : state}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {}),
                  t(waitingGates.length ? "waitingConfirmation" : state)
                ]
              }
            ),
            queuedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "queue-count", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "clock" }),
              queuedCount
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "agent-workspace-tag", title: node.cwd, children: wsName })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              className: "node-tabs",
              role: "tablist",
              "aria-label": node.title,
              children: ["task", "conversation", "execution"].map(
                (tb) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    role: "tab",
                    "aria-selected": activeTab === tb,
                    onClick: () => editNode(node.id, { tab: tb }),
                    children: [
                      t(tb === "conversation" ? "conversationTab" : tb),
                      tb === "execution" && nodeSteps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: nodeSteps.length })
                    ]
                  },
                  tb
                )
              )
            }
          ),
          activeTab === "conversation" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              className: "agent-embedded-wrap",
              onMouseUp: () => {
                const sel = window.getSelection()?.toString().trim();
                if (sel) setQuoteState({ nodeId: node.id, text: sel });
              },
              children: [
                quoteState?.nodeId === node.id && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "quote-selection-bar", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("quoteSelection") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                      "button",
                      {
                        type: "button",
                        className: "text-button",
                        onClick: () => {
                          extractDisplayFrom(
                            node.id,
                            quoteState.text,
                            live?.seq,
                            true
                          );
                          setQuoteState(null);
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "quote" }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("quoteMessage") })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        onClick: () => setQuoteState(null),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                      }
                    )
                  ] })
                ] }),
                node.sessionId ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  EmbeddedSession,
                  {
                    node,
                    bridge,
                    renderConversation,
                    onError: reportError,
                    onPresenceChange
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "node-empty", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chat" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: hasForkInbound ? t("forkDraftHint") : t("noMessages") }),
                  !hasForkInbound && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "button button-primary",
                      onClick: () => bindAgentSession(node),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("bindConversation") })
                      ]
                    }
                  )
                ] })
              ]
            }
          ) : activeTab === "execution" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "node-scroll", children: nodeSteps.length ? [...nodeSteps].reverse().map((step) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              className: `event-row event-${step.state}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "event-dot", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  Icon2,
                  {
                    name: step.state === "completed" ? "check" : step.state === "queued" ? "clock" : "bolt"
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("b", { children: [
                    t(step.state),
                    " \xB7",
                    " ",
                    t("roundBadge", { round: step.iteration })
                  ] }),
                  step.error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "danger", children: step.error }),
                  step.output && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "user-content", children: [
                    step.output.slice(0, 180),
                    step.output.length > 180 ? "\u2026" : ""
                  ] })
                ] }),
                step.output && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    title: t("quoteMessage"),
                    onClick: () => extractDisplayFrom(
                      node.id,
                      step.output,
                      step.endSeq,
                      true
                    ),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "quote" })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("time", { children: formatTime(step.createdAt) })
              ]
            },
            step.id
          )) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "node-empty", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "bolt" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("noEvents") })
          ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "node-scroll task-content", children: [
            live?.pendingInput.length ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "approval-box", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "approval-heading", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pause" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("approvalNeeded") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("approvalDescription") }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "button-row", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button button-amber",
                  onClick: () => editNode(node.id, { tab: "conversation" }),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chat" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("openApprovalTab") })
                  ]
                }
              ) })
            ] }) : null,
            waitingGates.map(({ run, token }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "approval-box", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "approval-heading", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pause" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t(
                  token.boundary ? "scopeBoundary" : "waitingConfirmation"
                ) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "user-content", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: token.source.title }) }),
              token.source.text && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "approval-snippet user-content", children: token.source.text.slice(0, 220) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "button-row", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "button button-amber",
                    onClick: () => void bridge.release(run.id, token.id, true).catch(reportError),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("release") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "button button-quiet",
                    onClick: () => void bridge.release(run.id, token.id, false).catch(reportError),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("dismiss") })
                  }
                )
              ] })
            ] }, token.id)),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "task-label", children: t(node.sessionId ? "savedTask" : "task") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "textarea",
              {
                className: "task-editor",
                "aria-label": `${node.title} \xB7 ${t("task")}`,
                placeholder: t("taskPlaceholder"),
                value: node.draft || node.task,
                onFocus: () => setEditingNodeId(node.id),
                onBlur: () => setEditingNodeId(null),
                onChange: (e) => editNode(node.id, {
                  draft: e.target.value,
                  task: e.target.value
                }),
                onKeyDown: (e) => {
                  if (e.key === "@" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    setPaletteDialog({
                      targetNodeId: node.id,
                      query: "",
                      index: 0
                    });
                  } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    launchScope({ kind: "single", nodeIds: [node.id] });
                  }
                }
              }
            ),
            latestOutput && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "latest-output-preview user-content", children: [
              latestOutput.slice(0, 240),
              latestOutput.length > 240 ? "\u2026" : ""
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "context-label", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "at" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("context") }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  "aria-label": t("addContext"),
                  onClick: () => setPaletteDialog({
                    targetNodeId: node.id,
                    query: "",
                    index: 0
                  }),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" })
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "reference-tray", children: incomingRefs.length ? incomingRefs.map((refEdge) => {
              const src = doc.nodes.find(
                (x) => x.id === refEdge.source
              );
              const capState = refEdge.always ? "always" : refEdge.sentVersion ? "sent" : "pending";
              return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: `capsule capsule-${capState}`,
                  title: t(`${capState}Tip`),
                  onClick: (ev) => openAnchoredMenu(ev.currentTarget, [
                    {
                      label: t("viewSource"),
                      icon: "chev",
                      fn: () => revealNode(refEdge.source)
                    },
                    {
                      label: t("always"),
                      icon: "pin",
                      checked: refEdge.always,
                      fn: () => editEdge(refEdge.id, {
                        always: !refEdge.always
                      })
                    },
                    {
                      label: t("deleteConnection"),
                      icon: "trash",
                      danger: true,
                      fn: () => edit((d) => {
                        d.edges = d.edges.filter(
                          (x) => x.id !== refEdge.id
                        );
                      })
                    }
                  ]),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: kindIconName(src?.kind ?? "file") }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: src?.title ?? refEdge.source }),
                    refEdge.always && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pin" })
                  ]
                },
                refEdge.id
              );
            }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "empty-reference",
                onClick: () => setPaletteDialog({
                  targetNodeId: node.id,
                  query: "",
                  index: 0
                }),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("addContext") })
                ]
              }
            ) })
          ] }),
          !(activeTab === "conversation" && node.sessionId) && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "agent-footer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "model-picker",
                disabled: !!node.sessionId,
                onClick: (ev) => openAnchoredMenu(ev.currentTarget, [
                  {
                    label: t("currentWorkspace"),
                    icon: "project",
                    checked: !node.workspaceId,
                    fn: () => editNode(node.id, {
                      workspaceId: void 0,
                      cwd: void 0
                    })
                  },
                  ...workspaces.map((w) => ({
                    label: w.name,
                    description: w.path,
                    icon: "project",
                    checked: node.workspaceId === w.id,
                    fn: () => editNode(node.id, {
                      workspaceId: w.id,
                      cwd: w.path
                    })
                  }))
                ]),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "project" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: wsName })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "mode-picker",
                title: t("nativeTriggerLabel"),
                onClick: (ev) => openAnchoredMenu(
                  ev.currentTarget,
                  [
                    [
                      "inherit",
                      t("inheritGlobal", {
                        state: doc.settings.nativeChatTriggers ? t("enabled") : t("disabled")
                      })
                    ],
                    ["enabled", t("enabled")],
                    ["disabled", t("disabled")]
                  ].map(([val, label]) => ({
                    label,
                    icon: "bolt",
                    checked: node.nativeTrigger === val,
                    fn: () => editNode(node.id, { nativeTrigger: val })
                  }))
                ),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "bolt" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: nativeEnabled ? t("enabled") : t("disabled") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "agent-controls", children: waitingGates.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "button button-amber",
                onClick: () => void bridge.release(
                  waitingGates[0].run.id,
                  waitingGates[0].token.id,
                  true
                ).catch(reportError),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("release") })
                ]
              }
            ) : state === "running" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button danger",
                  title: t("stop"),
                  onClick: () => void bridge.stopNode(node.id).catch(reportError),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "stop" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button button-primary",
                  disabled: !node.draft.trim(),
                  onClick: () => launchScope({ kind: "single", nodeIds: [node.id] }),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("queueSend") })
                  ]
                }
              )
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              node.sessionId && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button",
                  title: t("openNativeChat"),
                  onClick: () => bridge.openChat(node.sessionId),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button button-primary",
                  disabled: !(node.draft.trim() || node.task.trim()),
                  onClick: () => launchScope({ kind: "single", nodeIds: [node.id] }),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: state === "draft" ? "play" : "send" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(
                      state === "draft" ? "run" : node.draft.trim() ? "send" : "rerun"
                    ) })
                  ]
                }
              )
            ] }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              className: `progress-line ${state === "running" ? "is-running" : ""}`,
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {})
            }
          )
        ] });
      }
      if (node.kind === "file") {
        const knownPaths = [
          .../* @__PURE__ */ new Set([
            ...node.items ?? [],
            ...node.text.split("\n").map((p) => p.trim()).filter(Boolean),
            ...workspaceFilesList
          ])
        ];
        const selectedSet = new Set(
          node.selectedItems?.length ? node.selectedItems : node.text.split("\n").map((p) => p.trim()).filter(Boolean)
        );
        const draftVal = fileInputDrafts[node.id] ?? "";
        const togglePath = (filePath) => {
          const next = new Set(selectedSet);
          if (next.has(filePath)) next.delete(filePath);
          else next.add(filePath);
          const arr = [...next];
          editNode(node.id, {
            selectedItems: arr,
            text: arr.join("\n"),
            title: arr.length === 1 ? arr[0].split("/").pop() ?? node.title : node.title
          });
        };
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "tool-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "tool-summary", children: t("filesDescription") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "file-input-bar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "input",
            {
              placeholder: t("filePathPlaceholder"),
              value: draftVal,
              onChange: (e) => setFileInputDrafts((prev) => ({
                ...prev,
                [node.id]: e.target.value
              })),
              onKeyDown: (e) => {
                if (e.key === "Enter" && draftVal.trim()) {
                  const p = draftVal.trim();
                  const arr = [.../* @__PURE__ */ new Set([...selectedSet, p])];
                  editNode(node.id, {
                    items: [.../* @__PURE__ */ new Set([p, ...node.items ?? []])],
                    selectedItems: arr,
                    text: arr.join("\n")
                  });
                  setFileInputDrafts((prev) => ({ ...prev, [node.id]: "" }));
                }
              }
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "file-tree", children: knownPaths.map((fp) => {
            const checked = selectedSet.has(fp);
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                className: `file-row ${checked ? "selected" : ""}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "file-select",
                      "aria-pressed": checked,
                      onClick: () => togglePath(fp),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "checkbox" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "file" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { title: fp, children: fp })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("openFile"),
                      onClick: () => void bridge.readWorkspaceFile(fp, node.cwd || activeWorkspaceCwd).then(setFileModal).catch(reportError),
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" })
                    }
                  )
                ]
              },
              fp
            );
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "tool-footer", children: t("selectedCount", { count: selectedSet.size }) })
        ] });
      }
      if (node.kind === "note") {
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "textarea",
          {
            className: "note-editor user-content",
            "aria-label": node.title,
            placeholder: t("notePlaceholder"),
            value: node.text,
            onFocus: () => setEditingNodeId(node.id),
            onBlur: () => setEditingNodeId(null),
            onChange: (e) => editNode(node.id, { text: e.target.value })
          }
        );
      }
      if (node.kind === "display") {
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "display-content user-content", children: node.text || t("noOutput") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "display-footer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "display-mode",
                onClick: () => editNode(node.id, {
                  fixed: !node.fixed,
                  text: node.fixed && node.sourceNodeId ? snapshot?.live.find(
                    (l) => l.nodeId === node.sourceNodeId
                  )?.output || node.text : node.text
                }),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: node.fixed ? "pin" : "undo" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(node.fixed ? "fixed" : "follow") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "text-button",
                disabled: !node.sourceNodeId || !doc.nodes.some((n) => n.id === node.sourceNodeId),
                onClick: () => node.sourceNodeId && revealNode(node.sourceNodeId),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("viewSource") })
                ]
              }
            )
          ] })
        ] });
      }
      if (node.kind === "detail") {
        const srcNode = doc.nodes.find((x) => x.id === node.sourceNodeId);
        const srcState = node.sourceNodeId ? nodeStatusOf(snapshot, node.sourceNodeId) : "draft";
        const srcSteps = snapshot?.runs.flatMap((r) => r.steps).filter((s) => s.nodeId === node.sourceNodeId) ?? [];
        const liveText = node.pinned ? node.text : node.sourceNodeId && snapshot?.live.find((l) => l.nodeId === node.sourceNodeId)?.output || srcSteps.filter((s) => s.output).at(-1)?.output || node.text;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "detail-summary", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: `status status-${srcState}`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {}),
              t(srcState)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: srcNode?.title ?? "" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "node-scroll", children: [
            [...srcSteps].reverse().map((step) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                className: `event-row event-${step.state}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "event-dot", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    Icon2,
                    {
                      name: step.state === "completed" ? "check" : "bolt"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("b", { children: [
                    t(step.state),
                    " \xB7",
                    " ",
                    t("roundBadge", { round: step.iteration })
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("time", { children: formatTime(step.createdAt) })
                ]
              },
              step.id
            )),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "detail-result user-content", children: liveText || t("noEvents") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "display-footer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "text-button",
                onClick: () => editNode(node.id, {
                  pinned: !node.pinned,
                  fixed: !node.pinned,
                  text: liveText
                }),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pin" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(node.pinned ? "unpinDetail" : "pinDetail") })
                ]
              }
            ),
            srcNode && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "text-button",
                onClick: () => revealNode(srcNode.id),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("viewSource") })
                ]
              }
            )
          ] })
        ] });
      }
      const columns = node.columns ?? [
        { id: "todo", name: "\u5F85\u529E", cards: [] },
        { id: "doing", name: "\u8FDB\u884C\u4E2D", cards: [] },
        { id: "done", name: "\u5B8C\u6210", cards: [] }
      ];
      const updateBoard = (nextCols, nextSel) => {
        const sel = nextSel ?? node.selectedItems ?? [];
        editNode(node.id, {
          columns: nextCols,
          selectedItems: sel,
          text: boardSummaryText(nextCols, sel)
        });
      };
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "board-columns", children: columns.map((col, colIdx) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "board-column", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: `column-dot column-${colIdx}` }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: t(
            ["todo", "inProgress", "completedColumn"][colIdx] ?? col.name
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: col.cards.length }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "icon-button",
              title: t("addCard"),
              onClick: () => setFormModal({
                title: t("addCard"),
                initialValue: "",
                onSubmit: (cardText) => {
                  const next = structuredClone(columns);
                  next[colIdx].cards.push({ id: uid(), text: cardText });
                  updateBoard(next);
                }
              }),
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" })
            }
          )
        ] }),
        col.cards.map((card) => {
          const cardSelected = !!node.selectedItems?.includes(card.id);
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              className: `board-card ${cardSelected ? "selected" : ""}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "board-card-text user-content",
                    onClick: () => {
                      const cur = new Set(node.selectedItems ?? []);
                      if (cur.has(card.id)) cur.delete(card.id);
                      else cur.add(card.id);
                      updateBoard(columns, [...cur]);
                    },
                    children: card.text
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("editCard"),
                      onClick: (ev) => openAnchoredMenu(ev.currentTarget, [
                        {
                          label: t("editCard"),
                          icon: "note",
                          fn: () => setFormModal({
                            title: t("editCard"),
                            initialValue: card.text,
                            onSubmit: (val) => {
                              const next = structuredClone(columns);
                              const found = next[colIdx].cards.find(
                                (c) => c.id === card.id
                              );
                              if (found) found.text = val;
                              updateBoard(next);
                            }
                          })
                        },
                        {
                          label: t("deleteCard"),
                          icon: "trash",
                          danger: true,
                          fn: () => {
                            const next = structuredClone(columns);
                            next[colIdx].cards = next[colIdx].cards.filter(
                              (c) => c.id !== card.id
                            );
                            updateBoard(
                              next,
                              (node.selectedItems ?? []).filter(
                                (id) => id !== card.id
                              )
                            );
                          }
                        }
                      ]),
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "more" })
                    }
                  ),
                  colIdx < columns.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("nextColumn"),
                      onClick: () => {
                        const next = structuredClone(columns);
                        next[colIdx].cards = next[colIdx].cards.filter(
                          (c) => c.id !== card.id
                        );
                        next[colIdx + 1].cards.push(card);
                        updateBoard(next);
                      },
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" })
                    }
                  )
                ] })
              ]
            },
            card.id
          );
        })
      ] }, col.id)) });
    };
    const roleText = node.roleLabel ? dictRoleLabel(node.roleLabel) : void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "section",
      {
        "data-node-card": node.id,
        tabIndex: 0,
        "aria-label": node.title,
        style,
        className: [
          "node",
          `node-${node.kind}`,
          compact ? "compact" : "full",
          placement === "window" ? "floating-window" : "",
          placement === "conversation" ? "conversation-agent" : "",
          isSelected ? "selected" : "",
          state ? `status-${state}` : "",
          node.pinned ? "is-pinned" : "",
          waitingGates.length ? "needs-confirmation" : ""
        ].filter(Boolean).join(" "),
        onPointerDown: (ev) => {
          if (!ev.target.closest(
            "button, input, textarea, select, a, .fs-embedded"
          )) {
            selectNode(node.id, ev.shiftKey);
          }
        },
        onContextMenu: (ev) => {
          if (ev.target.closest(".fs-embedded")) return;
          ev.preventDefault();
          ev.stopPropagation();
          const selText = window.getSelection()?.toString().trim();
          if (selText && node.kind === "agent") {
            openAnchoredMenu(
              { x: ev.clientX, y: ev.clientY },
              [
                {
                  label: t("quoteSelection"),
                  icon: "quote",
                  fn: () => extractDisplayFrom(node.id, selText, live?.seq, true)
                }
              ]
            );
            return;
          }
          openNodeContextMenu(node, { x: ev.clientX, y: ev.clientY });
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "header",
            {
              className: "node-header",
              onPointerDown: (ev) => {
                if (ev.target.closest("button")) return;
                startNodeMove(ev, node.id);
              },
              onDoubleClick: () => toggleNodeForm(node.id),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "span",
                  {
                    className: `node-avatar ${node.kind === "agent" ? "agent-avatar" : ""}`,
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: kindIconName(node.kind) })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "node-heading", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: node.title }),
                  !compact && roleText && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: roleText })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "node-actions", children: [
                  placement === "window" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        title: t("returnCanvas"),
                        onClick: () => returnWindow(node.id),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        title: node.window?.snap === "max" ? t("restoreWindow") : t("maximize"),
                        onClick: () => editNode(node.id, {
                          window: {
                            ...node.window,
                            snap: node.window?.snap === "max" ? null : "max"
                          }
                        }),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "fit" })
                      }
                    )
                  ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        title: t(compact ? "expand" : "collapse"),
                        onClick: () => toggleNodeForm(node.id),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: compact ? "card" : "off" })
                      }
                    ),
                    !compact && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        title: t("openWindow"),
                        onClick: () => openWindow(node.id),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("inspector"),
                      onClick: (ev) => openNodeContextMenu(node, ev.currentTarget),
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "more" })
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "node-body", children: compact ? renderCompactBody() : renderFullBody() }),
          placement === "canvas" && node.kind !== "detail" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
            node.kind === "agent" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  "data-port-kind": "continuation",
                  "data-port-direction": "in",
                  "data-node-id": node.id,
                  className: `port port-continuation port-in ${linkedPort("continuation", "in") ? "is-linked" : ""} ${connecting?.kind === "continuation" ? "port-target" : ""}`,
                  style: {
                    ["--port-y"]: `${portY(node, "continuation", compact)}px`
                  },
                  title: t("contInput"),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {})
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  "data-port-kind": "continuation",
                  "data-port-direction": "out",
                  "data-node-id": node.id,
                  className: `port port-continuation port-out ${linkedPort("continuation", "out") ? "is-linked" : ""}`,
                  style: {
                    ["--port-y"]: `${portY(node, "continuation", compact)}px`
                  },
                  title: t("contOutput"),
                  onPointerDown: (ev) => startPortDrag(ev, [node.id], "continuation"),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {})
                }
              )
            ] }),
            (node.kind === "agent" || node.kind === "display") && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "button",
              {
                type: "button",
                "data-port-kind": "reference",
                "data-port-direction": "in",
                "data-node-id": node.id,
                className: `port port-reference port-in ${linkedPort("reference", "in") ? "is-linked" : ""} ${connecting?.kind === "reference" && node.kind === "agent" ? "port-target" : ""}`,
                style: {
                  ["--port-y"]: `${portY(node, "reference", compact)}px`
                },
                title: t("refInput"),
                children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {})
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "button",
              {
                type: "button",
                "data-port-kind": "reference",
                "data-port-direction": "out",
                "data-node-id": node.id,
                className: `port port-reference port-out ${linkedPort("reference", "out") ? "is-linked" : ""}`,
                style: {
                  ["--port-y"]: `${portY(node, "reference", compact)}px`
                },
                title: t("refOutput"),
                onPointerDown: (ev) => startPortDrag(ev, [node.id], "reference"),
                children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {})
              }
            )
          ] }),
          !compact && placement === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "node-resizer",
              "aria-label": t("expand"),
              onPointerDown: (ev) => startResize(ev, node.id, "node")
            }
          ),
          placement === "window" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "window-resizer",
              "aria-label": t("expand"),
              onPointerDown: (ev) => startResize(ev, node.id, "window")
            }
          )
        ]
      },
      `${placement}-${node.id}`
    );
  };
  const sidebarWorkspaceBuckets = (0, import_react3.useMemo)(() => {
    const list = [];
    const agents = doc.nodes.filter((n) => n.kind === "agent");
    for (const ws of workspaces) {
      list.push({
        key: ws.id,
        name: ws.name,
        agents: agents.filter((a) => a.workspaceId === ws.id)
      });
    }
    const unbound = agents.filter(
      (a) => !a.workspaceId || !workspaces.some((w) => w.id === a.workspaceId)
    );
    if (unbound.length || !list.length) {
      list.unshift({
        key: "__default__",
        name: t("currentWorkspace"),
        agents: unbound
      });
    }
    return list.filter((b, i) => i === 0 || b.agents.length > 0 || workspaces.length > 0);
  }, [doc.nodes, workspaces]);
  const totalStepEvents = (0, import_react3.useMemo)(
    () => (snapshot?.runs ?? []).reduce((sum, r) => sum + r.steps.length, 0),
    [snapshot?.runs]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      ref: rootRef,
      className: "fs-root",
      "data-theme": effectiveTheme,
      "data-perf-tier": reducedMotion ? "L1" : "L3",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "aside",
          {
            className: `fs-side ${!sidebarOpen ? "collapsed" : ""} ${mobileSidebar ? "mobile-open" : ""}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "fs-side-head", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "brand-row", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "rail-brand",
                      onClick: () => setRouteName("canvas"),
                      title: "FlowSpace",
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(BrandMark, {})
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "brand-name", children: [
                    "Flow",
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: "Space" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "CANVAS" })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "side-search",
                    onClick: () => setPaletteDialog({ targetNodeId: null, query: "", index: 0 }),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "search" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("searchNodes") }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "Ctrl K" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-side-list", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "side-section-heading", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("projectSessions") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("add"),
                      onClick: (ev) => openAddMenu(ev.currentTarget),
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" })
                    }
                  )
                ] }),
                sidebarWorkspaceBuckets.map((bucket) => {
                  const hidden = prefs.hiddenWorkspaces.includes(bucket.key);
                  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                      "div",
                      {
                        className: `sidebar-project ${hidden ? "project-hidden" : ""}`,
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                            "button",
                            {
                              type: "button",
                              className: "project-name",
                              onClick: () => {
                                if (bucket.key !== "__default__") {
                                  setActiveWorkspaceId(bucket.key);
                                }
                                const boxes = bucket.agents.map(
                                  (a) => nodeBox(a, false, true)
                                );
                                if (boxes.length) {
                                  setRouteName("canvas");
                                  fitBoxes(boxes);
                                }
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "project" }),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "user-content", children: bucket.name })
                              ]
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                            "button",
                            {
                              type: "button",
                              className: "icon-button",
                              title: t(hidden ? "showWorkspace" : "hideWorkspace"),
                              onClick: () => edit(
                                (d) => {
                                  const cur = new Set(d.prefs?.hiddenWorkspaces ?? []);
                                  if (cur.has(bucket.key)) cur.delete(bucket.key);
                                  else cur.add(bucket.key);
                                  d.prefs = {
                                    ...d.prefs,
                                    hiddenWorkspaces: [...cur]
                                  };
                                },
                                { remember: false }
                              ),
                              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: hidden ? "eyeoff" : "eye" })
                            }
                          )
                        ]
                      }
                    ),
                    bucket.agents.map((ag) => {
                      const st = nodeStatusOf(snapshot, ag.id);
                      const activeSel = selection.nodes.includes(ag.id) || routeName === "conversation" && conversationFocusAgent?.id === ag.id;
                      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                        "button",
                        {
                          type: "button",
                          className: `sidebar-agent ${activeSel ? "selected" : ""} ${!isNodeVisible(ag, true) ? "agent-hidden" : ""}`,
                          onClick: () => {
                            setLastAgentId(ag.id);
                            revealNode(ag.id);
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: `status-dot status-${st}` }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "user-content", children: ag.title }),
                            (st === "waiting" || st === "input") && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: t("confirm") }),
                            st === "draft" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: t("draft") })
                          ]
                        },
                        ag.id
                      );
                    })
                  ] }, bucket.key);
                }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "side-section-heading side-workflows-heading", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("workflows") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("workflowLibrary"),
                      onClick: () => setRouteName("workflows"),
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "box" })
                    }
                  )
                ] }),
                doc.nodes.filter((n) => n.kind === "group" && !n.parentId).map((grp) => {
                  const count = members(doc, grp.id).filter(
                    (id) => doc.nodes.find((n) => n.id === id)?.kind === "agent"
                  ).length;
                  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: `sidebar-workflow ${selection.groups.includes(grp.id) ? "selected" : ""}`,
                      onClick: () => focusGroup(grp.id),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "canvas" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "user-content", children: grp.title }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: count })
                      ]
                    },
                    grp.id
                  );
                }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "side-library-link",
                    onClick: () => setRouteName("workflows"),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("workflowLibrary") })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "fs-side-footer", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `local-save-dot ${saved ? "" : "saving"}` }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(saved ? "hostSaved" : "saving") }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    title: t("settings"),
                    onClick: () => setRouteName("settings"),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "gear" })
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-main", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "fs-top", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "workspace-breadcrumb", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: `icon-button ${sidebarOpen ? "active" : ""}`,
                  title: t("projectSessions"),
                  onClick: () => {
                    if ((rootRef.current?.clientWidth ?? 1e3) <= 700) {
                      setMobileSidebar((v) => !v);
                    } else {
                      setSidebarOpen((v) => !v);
                    }
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "sidebarLeft" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "FlowSpace" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { children: "/" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "breadcrumb-title-btn user-content",
                  onClick: () => setFormModal({
                    title: t("rename"),
                    initialValue: doc.title,
                    onSubmit: (title) => edit((d) => {
                      d.title = title;
                    })
                  }),
                  children: routeName === "canvas" ? doc.title : t(routeName)
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("nav", { className: "route-nav", "aria-label": "FlowSpace Views", children: [
              ["canvas", "canvas"],
              ["conversation", "chat"],
              ["workflows", "box"],
              ["activity", "bolt"],
              ["settings", "gear"]
            ].map(([id, glyph]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: routeName === id ? "active" : "",
                onClick: () => setRouteName(id),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: glyph }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(id) }),
                  id === "canvas" && waitingAgentNodes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "route-badge", children: waitingAgentNodes.length })
                ]
              },
              id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "header-actions", children: [
              workspaces.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "workspace-chip",
                  onClick: (ev) => openAnchoredMenu(ev.currentTarget, [
                    {
                      label: t("currentWorkspace"),
                      icon: "project",
                      checked: !activeWorkspaceId,
                      fn: () => setActiveWorkspaceId("")
                    },
                    ...workspaces.map((w) => ({
                      label: w.name,
                      description: w.path,
                      icon: "project",
                      checked: activeWorkspaceId === w.id,
                      fn: () => setActiveWorkspaceId(w.id)
                    }))
                  ]),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "project" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? t("currentWorkspace") })
                  ]
                }
              ),
              waitingAgentNodes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "waiting-button",
                  onClick: (ev) => openAnchoredMenu(
                    ev.currentTarget,
                    waitingAgentNodes.map((n) => ({
                      label: n.title,
                      description: t(
                        nodeStatusOf(snapshot, n.id) === "input" ? "approvalNeeded" : "waitingConfirmation"
                      ),
                      icon: "pause",
                      fn: () => revealNode(n.id)
                    }))
                  ),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pause" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("waitingCount", { count: waitingAgentNodes.length }) })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "rail-language",
                  title: t("language"),
                  onClick: () => setLanguage(getLanguage() === "zh" ? "en" : "zh"),
                  children: getLanguage() === "zh" ? "EN" : "\u4E2D"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button",
                  title: t("theme"),
                  onClick: (ev) => toggleTheme(ev.currentTarget),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: effectiveTheme === "dark" ? "moon" : "sun" })
                }
              ),
              routeName === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: `icon-button ${inspectorOpen ? "active" : ""}`,
                  title: t("inspector"),
                  onClick: () => setInspectorOpen((v) => !v),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "side" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "header-save",
                  onClick: handleCaptureSnapshot,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "clock" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("saveSnapshot") })
                  ]
                }
              ),
              hasRunnableSelection && routeName === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "icon-button",
                  title: t("runAll"),
                  onClick: () => launchScope({ kind: "global", nodeIds: [] }),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: "button button-primary header-run",
                  onClick: () => {
                    if (hasRunnableSelection && routeName === "canvas") {
                      if (selection.groups.length === 1 && !selection.nodes.length) {
                        launchScope({
                          kind: "group",
                          nodeIds: [selection.groups[0]]
                        });
                      } else {
                        launchScope({
                          kind: "selection",
                          nodeIds: [...selection.nodes, ...selection.groups]
                        });
                      }
                    } else {
                      launchScope({ kind: "global", nodeIds: [] });
                    }
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: hasRunnableSelection && routeName === "canvas" ? selection.groups.length === 1 && !selection.nodes.length ? t("runGroup") : t("runSelection") : t("runAll") })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-content-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-canvas-column", children: [
              routeName === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-canvas-toolbar", role: "toolbar", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "canvas-title", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "canvas" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: doc.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "canvas-save-pill", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "span",
                      {
                        className: `local-save-dot ${saved ? "" : "saving"}`
                      }
                    ),
                    t(saved ? "hostSaved" : "saving")
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "toolbar-actions", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "toolbar-button",
                      onClick: (ev) => openAnchoredMenu(
                        ev.currentTarget,
                        [
                          ["all", "all"],
                          ["running", "onlyRunning"]
                        ].map(([val, labelKey]) => ({
                          label: t(labelKey),
                          icon: "eye",
                          checked: prefs.filter === val,
                          fn: () => edit(
                            (d) => {
                              d.prefs = { ...d.prefs, filter: val };
                            },
                            { remember: false }
                          )
                        }))
                      ),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "eye" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(prefs.filter === "running" ? "onlyRunning" : "all") })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "toolbar-button",
                      onClick: (ev) => openAddMenu(ev.currentTarget),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("add") })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("groupSelection"),
                      onClick: groupSelected,
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "group" })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "icon-button",
                      title: t("tidy"),
                      onClick: arrangeTopology,
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "tidy" })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "toolbar-separator" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "toolbar-search",
                      onClick: () => setPaletteDialog({
                        targetNodeId: null,
                        query: "",
                        index: 0
                      }),
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "search" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("searchNodes") })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "Ctrl K" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "div",
                {
                  ref: areaRef,
                  className: `fs-canvas-area ${leftSnapped ? "has-left-window" : ""} ${rightSnapped ? "has-right-window" : ""}`,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                      "div",
                      {
                        ref: viewportRef,
                        className: [
                          "fs-viewport",
                          routeName !== "canvas" ? "is-hidden" : "",
                          tool === "hand" || spacePressed ? "pan-mode" : "",
                          isDragging ? "is-dragging" : "",
                          connecting ? `connecting connecting-${connecting.kind}` : ""
                        ].filter(Boolean).join(" "),
                        style: {
                          ["--gx"]: `${view.x}px`,
                          ["--gy"]: `${view.y}px`,
                          ["--gs"]: `${24 * view.zoom}px`,
                          ["--ga"]: clamp((view.zoom - 0.35) / 0.4, 0, 1)
                        },
                        onPointerMove: (ev) => {
                          const vp = viewportRef.current;
                          if (!vp) return;
                          const rect = vp.getBoundingClientRect();
                          vp.style.setProperty("--mx", `${ev.clientX - rect.left}px`);
                          vp.style.setProperty("--my", `${ev.clientY - rect.top}px`);
                          vp.style.setProperty("--spot", "1");
                          const card = ev.target?.closest(
                            ".node"
                          );
                          if (card) {
                            const cb = card.getBoundingClientRect();
                            card.style.setProperty(
                              "--px",
                              `${(ev.clientX - cb.left) / view.zoom}px`
                            );
                            card.style.setProperty(
                              "--py",
                              `${(ev.clientY - cb.top) / view.zoom}px`
                            );
                          }
                        },
                        onPointerLeave: () => {
                          viewportRef.current?.style.setProperty("--spot", "0");
                        },
                        onPointerDown: (ev) => {
                          const target = ev.target;
                          if (ev.button === 2) return;
                          if (target.closest(
                            ".node, .group-header, .composite, .edge-tag, .exchange-tag, .waypoint, .fs-canvas-controls, .fs-minimap, .offscreen-indicator, .fs-welcome-card"
                          )) {
                            return;
                          }
                          if (ev.button === 1 || spacePressed || tool === "hand") {
                            startPan(ev);
                          } else if (ev.shiftKey) {
                            startMarquee(ev);
                          } else {
                            startPan(ev);
                          }
                        },
                        onDoubleClick: (ev) => {
                          const target = ev.target;
                          if (target.closest(
                            ".node, .workflow-group, .edge-hit, .edge-tag, .fs-canvas-controls, .fs-minimap, .fs-welcome-card"
                          ))
                            return;
                          const vp = viewportRef.current;
                          if (!vp) return;
                          createCanvasNode(
                            "agent",
                            toWorld(
                              docRef.current.viewport,
                              vp.getBoundingClientRect(),
                              ev.clientX,
                              ev.clientY
                            )
                          );
                        },
                        onContextMenu: (ev) => {
                          const target = ev.target;
                          if (target.closest(
                            ".node, .workflow-group, .edge-hit, .waypoint, .fs-canvas-controls, .fs-minimap"
                          ))
                            return;
                          ev.preventDefault();
                          const vp = viewportRef.current;
                          if (!vp) return;
                          openAddMenu(
                            { x: ev.clientX, y: ev.clientY },
                            toWorld(
                              docRef.current.viewport,
                              vp.getBoundingClientRect(),
                              ev.clientX,
                              ev.clientY
                            )
                          );
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                            "div",
                            {
                              className: `fs-world ${lod ? "semantic-zoom" : ""}`,
                              style: {
                                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                                ["--type-scale"]: clamp(1 / view.zoom, 1, 2.6)
                              },
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-groups-layer", children: visibleGroups.map((grp) => {
                                  const ports = inferGroupPorts(doc, grp).filter(
                                    (p) => !p.hidden
                                  );
                                  const rows = Math.max(
                                    ports.filter((p) => p.direction === "in").length,
                                    ports.filter((p) => p.direction === "out").length
                                  );
                                  const box = groupBox(grp, rows);
                                  const memberNodes = members(doc, grp.id).map((id) => doc.nodes.find((n) => n.id === id)).filter((n) => !!n);
                                  const runningCnt = memberNodes.filter(
                                    (n) => nodeStatusOf(snapshot, n.id) === "running"
                                  ).length;
                                  const waitingCnt = memberNodes.filter(
                                    (n) => ["waiting", "input"].includes(
                                      nodeStatusOf(snapshot, n.id)
                                    )
                                  ).length;
                                  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                    "section",
                                    {
                                      className: [
                                        "workflow-group",
                                        `color-${grp.color ?? "violet"}`,
                                        grp.collapsed ? "composite" : "",
                                        selection.groups.includes(grp.id) ? "selected" : "",
                                        grp.parentId ? "nested-group" : ""
                                      ].filter(Boolean).join(" "),
                                      style: {
                                        left: box.x,
                                        top: box.y,
                                        width: box.w,
                                        height: box.h
                                      },
                                      onContextMenu: (ev) => {
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        openGroupContextMenu(grp, {
                                          x: ev.clientX,
                                          y: ev.clientY
                                        });
                                      },
                                      children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                          "header",
                                          {
                                            className: "group-header",
                                            onPointerDown: (ev) => {
                                              if (ev.target.closest("button"))
                                                return;
                                              startGroupMove(ev, grp.id);
                                            },
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "group-mark" }),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "user-content", children: grp.titleKey ? t(grp.titleKey) : grp.title }),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("nodesCount", { count: memberNodes.length }) }),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    className: "group-run",
                                                    onClick: () => launchScope({
                                                      kind: "group",
                                                      nodeIds: [grp.id]
                                                    }),
                                                    children: [
                                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("run") })
                                                    ]
                                                  }
                                                ),
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    className: "icon-button",
                                                    title: t(grp.collapsed ? "expand" : "collapse"),
                                                    onClick: () => editNode(grp.id, {
                                                      collapsed: !grp.collapsed
                                                    }),
                                                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: grp.collapsed ? "card" : "off" })
                                                  }
                                                ),
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    className: "icon-button",
                                                    title: t("inspector"),
                                                    onClick: (ev) => openGroupContextMenu(grp, ev.currentTarget),
                                                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "more" })
                                                  }
                                                )
                                              ] })
                                            ]
                                          }
                                        ),
                                        grp.collapsed && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "composite-ports", children: ["in", "out"].map((dir) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: ports.filter((p) => p.direction === dir).map((port) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                            "button",
                                            {
                                              type: "button",
                                              "data-port-kind": port.kind,
                                              "data-port-direction": dir,
                                              "data-proxy-nodes": port.nodes.join(","),
                                              className: `composite-port-row composite-${dir} ${connecting?.kind === port.kind && dir === "in" ? "port-target" : ""}`,
                                              onPointerDown: dir === "out" ? (ev) => startPortDrag(
                                                ev,
                                                port.nodes,
                                                port.kind
                                              ) : void 0,
                                              children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                  "i",
                                                  {
                                                    className: `proxy-pin proxy-${port.kind}`
                                                  }
                                                ),
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: port.name })
                                              ]
                                            },
                                            port.id
                                          )) }, dir)) }),
                                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "composite-summary", children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("nodesCount", {
                                              count: memberNodes.length
                                            }) }),
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                                              runningCnt,
                                              " ",
                                              t("running"),
                                              " \xB7 ",
                                              waitingCnt,
                                              " ",
                                              t("waiting")
                                            ] })
                                          ] })
                                        ] }),
                                        grp.templateId && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                          "button",
                                          {
                                            type: "button",
                                            className: "template-association",
                                            onClick: (ev) => openGroupContextMenu(grp, ev.currentTarget),
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "box" }),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("templateLinked", {
                                                version: grp.templateRevision ?? 1
                                              }) })
                                            ]
                                          }
                                        ),
                                        !grp.collapsed && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                          "button",
                                          {
                                            type: "button",
                                            className: "group-resizer",
                                            "aria-label": t("expand"),
                                            onPointerDown: (ev) => startResize(ev, grp.id, "group")
                                          }
                                        )
                                      ]
                                    },
                                    grp.id
                                  );
                                }) }),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                  "svg",
                                  {
                                    className: "fs-edges-svg",
                                    style: {
                                      left: svgBounds.x,
                                      top: svgBounds.y,
                                      width: svgBounds.w,
                                      height: svgBounds.h
                                    },
                                    viewBox: `${svgBounds.x} ${svgBounds.y} ${svgBounds.w} ${svgBounds.h}`,
                                    "aria-hidden": "true",
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("defs", { children: [
                                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                          "marker",
                                          {
                                            id: "fs-msg-arrow-out",
                                            viewBox: "0 0 6 6",
                                            refX: "5",
                                            refY: "3",
                                            markerWidth: "5",
                                            markerHeight: "5",
                                            orient: "auto",
                                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M0 0L6 3L0 6Z", fill: "var(--m-f)" })
                                          }
                                        ),
                                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                          "marker",
                                          {
                                            id: "fs-msg-arrow-back",
                                            viewBox: "0 0 6 6",
                                            refX: "5",
                                            refY: "3",
                                            markerWidth: "5",
                                            markerHeight: "5",
                                            orient: "auto-start-reverse",
                                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M0 0L6 3L0 6Z", fill: "var(--m-b)" })
                                          }
                                        )
                                      ] }),
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("g", { children: [
                                        doc.nodes.filter(
                                          (n) => (n.kind === "display" || n.kind === "detail") && n.sourceNodeId && isNodeVisible(n, true) && isNodeVisible(
                                            doc.nodes.find((s) => s.id === n.sourceNodeId),
                                            true
                                          )
                                        ).map((n) => {
                                          const a = endpoint(
                                            doc,
                                            n.sourceNodeId,
                                            "reference",
                                            "out",
                                            lod,
                                            keepExpandedIds
                                          );
                                          const b = endpoint(
                                            doc,
                                            n.id,
                                            "reference",
                                            "in",
                                            lod,
                                            keepExpandedIds
                                          );
                                          if (a.groupId && a.groupId === b.groupId) return null;
                                          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                            "path",
                                            {
                                              className: "edge-path edge-display",
                                              d: route(a, b).path
                                            },
                                            `disp-${n.id}`
                                          );
                                        }),
                                        doc.edges.map((edge) => {
                                          const srcNode = doc.nodes.find(
                                            (n) => n.id === edge.source
                                          );
                                          const tgtNode = doc.nodes.find(
                                            (n) => n.id === edge.target
                                          );
                                          if (!isNodeVisible(srcNode, true) || !isNodeVisible(tgtNode, true))
                                            return null;
                                          const a = endpoint(
                                            doc,
                                            edge.source,
                                            edge.kind,
                                            "out",
                                            lod,
                                            keepExpandedIds
                                          );
                                          const b = endpoint(
                                            doc,
                                            edge.target,
                                            edge.kind,
                                            "in",
                                            lod,
                                            keepExpandedIds
                                          );
                                          if (a.groupId && a.groupId === b.groupId) return null;
                                          const evState = edgeVisualState(edge);
                                          if (lod && !selection.nodes.includes(edge.source) && !selection.nodes.includes(edge.target) && !["active", "queued", "waiting", "boundary"].includes(
                                            evState
                                          )) {
                                            return null;
                                          }
                                          const geom = route(a, b, edge.waypoints);
                                          const dimmed = selection.edge ? selection.edge !== edge.id : selection.nodes.length > 0 && !selection.nodes.includes(edge.source) && !selection.nodes.includes(edge.target);
                                          const cls = [
                                            `edge-${edge.kind}`,
                                            `edge-state-${evState}`,
                                            edge.kind === "continuation" ? `trigger-${edge.trigger}` : "",
                                            dimmed ? "edge-dim" : "",
                                            selection.edge === edge.id ? "edge-selected" : ""
                                          ].filter(Boolean).join(" ");
                                          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("g", { children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "path",
                                              {
                                                className: `edge-path ${cls}`,
                                                d: geom.path
                                              }
                                            ),
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "path",
                                              {
                                                className: `edge-path edge-flow ${cls}`,
                                                d: geom.path
                                              }
                                            ),
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "path",
                                              {
                                                className: "edge-hit",
                                                d: geom.path,
                                                onClick: (ev) => {
                                                  ev.stopPropagation();
                                                  setSelection({
                                                    nodes: [],
                                                    groups: [],
                                                    edge: edge.id
                                                  });
                                                  setInspectorOpen(true);
                                                },
                                                onDoubleClick: (ev) => {
                                                  ev.stopPropagation();
                                                  const vp = viewportRef.current;
                                                  if (!vp) return;
                                                  const pt = toWorld(
                                                    docRef.current.viewport,
                                                    vp.getBoundingClientRect(),
                                                    ev.clientX,
                                                    ev.clientY
                                                  );
                                                  editEdge(edge.id, {
                                                    waypoints: [...edge.waypoints ?? [], pt]
                                                  });
                                                },
                                                onContextMenu: (ev) => {
                                                  ev.preventDefault();
                                                  ev.stopPropagation();
                                                  const vp = viewportRef.current;
                                                  if (!vp) return;
                                                  const pt = toWorld(
                                                    docRef.current.viewport,
                                                    vp.getBoundingClientRect(),
                                                    ev.clientX,
                                                    ev.clientY
                                                  );
                                                  openAnchoredMenu(
                                                    { x: ev.clientX, y: ev.clientY },
                                                    [
                                                      {
                                                        label: t("addWaypoint"),
                                                        icon: "plus",
                                                        fn: () => editEdge(edge.id, {
                                                          waypoints: [
                                                            ...edge.waypoints ?? [],
                                                            pt
                                                          ]
                                                        })
                                                      },
                                                      {
                                                        label: t("deleteConnection"),
                                                        icon: "trash",
                                                        danger: true,
                                                        fn: () => edit((d) => {
                                                          d.edges = d.edges.filter(
                                                            (x) => x.id !== edge.id
                                                          );
                                                        })
                                                      }
                                                    ]
                                                  );
                                                }
                                              }
                                            )
                                          ] }, edge.id);
                                        }),
                                        !lod && exchanges.map((ex) => {
                                          const fg = collapsedAncestor(doc, ex.from);
                                          const tg = collapsedAncestor(doc, ex.to);
                                          if (fg && fg.id === tg?.id) return null;
                                          const boxA = fg ? groupBox(fg) : nodeBox(
                                            doc.nodes.find((n) => n.id === ex.from),
                                            lod,
                                            keepExpandedIds.has(ex.from)
                                          );
                                          const boxB = tg ? groupBox(tg) : nodeBox(
                                            doc.nodes.find((n) => n.id === ex.to),
                                            lod,
                                            keepExpandedIds.has(ex.to)
                                          );
                                          const geom = exchangeRoute(boxA, boxB);
                                          const hasOut = ex.items.some(
                                            (m) => m.fromId === ex.from
                                          );
                                          const hasBack = ex.items.some(
                                            (m) => m.fromId === ex.to
                                          );
                                          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("g", { children: [
                                            hasOut && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "path",
                                              {
                                                className: "edge-path edge-message message-out",
                                                d: geom.out,
                                                markerEnd: "url(#fs-msg-arrow-out)"
                                              }
                                            ),
                                            hasBack && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                              "path",
                                              {
                                                className: "edge-path edge-message message-back",
                                                d: geom.back,
                                                markerEnd: "url(#fs-msg-arrow-back)"
                                              }
                                            )
                                          ] }, ex.id);
                                        }),
                                        connecting && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                          "path",
                                          {
                                            className: `edge-path temporary-edge edge-${connecting.kind}`,
                                            d: route(connecting.fromPoint, connecting.current).path
                                          }
                                        )
                                      ] })
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-nodes-layer", children: doc.nodes.filter((n) => isNodeVisible(n)).map((n) => {
                                  if (n.window) {
                                    const b = nodeBox(n, lod, true);
                                    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                      "div",
                                      {
                                        className: "window-stub",
                                        style: {
                                          left: n.x,
                                          top: n.y,
                                          width: b.w,
                                          height: b.h
                                        },
                                        children: [
                                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" }),
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "user-content", children: n.title })
                                          ] }),
                                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                            "button",
                                            {
                                              type: "button",
                                              className: "text-button",
                                              onClick: () => returnWindow(n.id),
                                              children: [
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }),
                                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("returnCanvas") })
                                              ]
                                            }
                                          )
                                        ]
                                      },
                                      `stub-${n.id}`
                                    );
                                  }
                                  return renderNodeCard(n, "canvas");
                                }) }),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-tags-layer", children: [
                                  doc.edges.map((edge) => {
                                    const srcNode = doc.nodes.find(
                                      (n) => n.id === edge.source
                                    );
                                    const tgtNode = doc.nodes.find(
                                      (n) => n.id === edge.target
                                    );
                                    if (!isNodeVisible(srcNode, true) || !isNodeVisible(tgtNode, true))
                                      return null;
                                    const a = endpoint(
                                      doc,
                                      edge.source,
                                      edge.kind,
                                      "out",
                                      lod,
                                      keepExpandedIds
                                    );
                                    const b = endpoint(
                                      doc,
                                      edge.target,
                                      edge.kind,
                                      "in",
                                      lod,
                                      keepExpandedIds
                                    );
                                    if (a.groupId && a.groupId === b.groupId) return null;
                                    const geom = route(a, b, edge.waypoints);
                                    const evState = edgeVisualState(edge);
                                    const waitingTok = snapshot?.runs.filter(
                                      (r) => ["running", "waiting", "paused"].includes(r.state)
                                    ).flatMap(
                                      (r) => r.tokens.filter(
                                        (tk) => tk.edgeId === edge.id && !tk.ready && !tk.consumed && !tk.dismissed
                                      ).map((token) => ({ run: r, token }))
                                    )[0] ?? null;
                                    const dimmed = selection.edge ? selection.edge !== edge.id : selection.nodes.length > 0 && !selection.nodes.includes(edge.source) && !selection.nodes.includes(edge.target);
                                    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                        "div",
                                        {
                                          className: [
                                            "edge-tag",
                                            edge.kind,
                                            `edge-state-${evState}`,
                                            dimmed ? "edge-dim" : "",
                                            geom.tight ? "tight-tag" : "",
                                            selection.edge === edge.id ? "selected" : ""
                                          ].filter(Boolean).join(" "),
                                          style: {
                                            left: geom.label.x,
                                            top: geom.label.y
                                          },
                                          children: [
                                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                              "button",
                                              {
                                                type: "button",
                                                onClick: (ev) => {
                                                  ev.stopPropagation();
                                                  setSelection({
                                                    nodes: [],
                                                    groups: [],
                                                    edge: edge.id
                                                  });
                                                  setInspectorOpen(true);
                                                },
                                                children: [
                                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                    Icon2,
                                                    {
                                                      name: edge.kind === "continuation" ? {
                                                        conclusion: "at",
                                                        session: "clock",
                                                        fork: "branch"
                                                      }[edge.mode] : "at"
                                                    }
                                                  ),
                                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: edge.kind === "continuation" ? t(edge.mode) : t(edge.always ? "always" : evState) }),
                                                  edge.kind === "continuation" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "trigger-indicator", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                                    Icon2,
                                                    {
                                                      name: edge.trigger === "auto" ? "bolt" : edge.trigger === "confirm" ? "pause" : "off"
                                                    }
                                                  ) })
                                                ]
                                              }
                                            ),
                                            waitingTok && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                              "button",
                                              {
                                                type: "button",
                                                className: "edge-release",
                                                onClick: (ev) => {
                                                  ev.stopPropagation();
                                                  void bridge.release(
                                                    waitingTok.run.id,
                                                    waitingTok.token.id,
                                                    true
                                                  ).catch(reportError);
                                                },
                                                children: [
                                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                                                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("release") })
                                                ]
                                              }
                                            )
                                          ]
                                        }
                                      ),
                                      (edge.waypoints ?? []).map((wp, idx) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                        "button",
                                        {
                                          type: "button",
                                          className: "waypoint",
                                          "aria-label": t("waypoint"),
                                          style: { left: wp.x, top: wp.y },
                                          onPointerDown: (ev) => startWaypointDrag(ev, edge.id, idx),
                                          onContextMenu: (ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            openAnchoredMenu(
                                              { x: ev.clientX, y: ev.clientY },
                                              [
                                                {
                                                  label: t("removeWaypoint"),
                                                  icon: "x",
                                                  danger: true,
                                                  fn: () => editEdge(edge.id, {
                                                    waypoints: (edge.waypoints ?? []).filter((_, i) => i !== idx)
                                                  })
                                                }
                                              ]
                                            );
                                          }
                                        },
                                        `${edge.id}-wp-${idx}`
                                      ))
                                    ] }, `tags-${edge.id}`);
                                  }),
                                  !lod && exchanges.map((ex) => {
                                    const fg = collapsedAncestor(doc, ex.from);
                                    const tg = collapsedAncestor(doc, ex.to);
                                    if (fg && fg.id === tg?.id) return null;
                                    const boxA = fg ? groupBox(fg) : nodeBox(
                                      doc.nodes.find((n) => n.id === ex.from),
                                      lod,
                                      keepExpandedIds.has(ex.from)
                                    );
                                    const boxB = tg ? groupBox(tg) : nodeBox(
                                      doc.nodes.find((n) => n.id === ex.to),
                                      lod,
                                      keepExpandedIds.has(ex.to)
                                    );
                                    const geom = exchangeRoute(boxA, boxB);
                                    const sent = ex.items.filter(
                                      (m) => m.fromId === ex.from
                                    ).length;
                                    const back = ex.items.length - sent;
                                    const latest = ex.items[ex.items.length - 1];
                                    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                      "div",
                                      {
                                        className: `exchange-tag ${geom.side ? "side" : ""}`,
                                        style: { left: geom.label.x, top: geom.label.y },
                                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                                          "button",
                                          {
                                            type: "button",
                                            onClick: () => setExchangeModal(ex),
                                            children: [
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chat" }),
                                              sent > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("i", { className: "mc f", children: [
                                                "\u2193",
                                                sent
                                              ] }),
                                              back > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("i", { className: "mc b", children: [
                                                "\u2191",
                                                back
                                              ] }),
                                              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("em", { children: [
                                                latest.text.slice(0, 20),
                                                latest.text.length > 20 ? "\u2026" : ""
                                              ] })
                                            ]
                                          }
                                        )
                                      },
                                      `ex-tag-${ex.id}`
                                    );
                                  })
                                ] })
                              ]
                            }
                          ),
                          marquee && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                            "div",
                            {
                              className: "fs-marquee",
                              style: {
                                left: marquee.x,
                                top: marquee.y,
                                width: marquee.w,
                                height: marquee.h
                              }
                            }
                          )
                        ]
                      }
                    ),
                    routeName === "canvas" && doc.nodes.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-welcome-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-welcome-card", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-welcome-mark", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(BrandMark, {}) }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "eyebrow", children: t("welcomeEyebrow") }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { children: t("welcomeTitle") }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("welcomeDescription") }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-welcome-actions", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button button-primary",
                            onClick: () => {
                              edit(
                                (d) => Object.assign(
                                  d,
                                  sample(d, "review", {
                                    workspaceId: activeWorkspaceId || void 0,
                                    cwd: activeWorkspaceCwd
                                  })
                                )
                              );
                              setTimeout(() => fitView(true), 50);
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("startWithReview") })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button",
                            onClick: () => createCanvasNode("agent"),
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("newAgent") })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button",
                            onClick: () => setRouteName("workflows"),
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "box" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("workflowLibrary") })
                            ]
                          }
                        )
                      ] })
                    ] }) }),
                    routeName === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-indicators", children: waitingAgentNodes.filter((n) => isNodeVisible(n, true)).map((n) => {
                      const cg = collapsedAncestor(doc, n.id);
                      const box = cg ? groupBox(cg) : nodeBox(n, lod, keepExpandedIds.has(n.id));
                      const cx = (box.x + box.w / 2) * view.zoom + view.x;
                      const cy = (box.y + box.h / 2) * view.zoom + view.y;
                      if (cx > 0 && cy > 28 && cx < vpSize.width && cy < vpSize.height - 44) {
                        return null;
                      }
                      const ix = clamp(cx, 12, vpSize.width - 12);
                      const iy = clamp(cy, 54, vpSize.height - 64);
                      const onRight = ix > vpSize.width / 2;
                      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                        "button",
                        {
                          type: "button",
                          className: `offscreen-indicator ${onRight ? "indicator-right" : ""}`,
                          style: { left: ix, top: iy },
                          title: t("locateWaiting"),
                          onClick: () => revealNode(n.id),
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pause" }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "user-content", children: n.title }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" })
                          ]
                        },
                        `ind-${n.id}`
                      );
                    }) }),
                    routeName === "canvas" && minimapOpen && (() => {
                      const mw = 178, mh = 104;
                      const nodeBoxes = doc.nodes.filter((n) => isNodeVisible(n)).map((n) => ({
                        n,
                        b: nodeBox(n, lod, keepExpandedIds.has(n.id))
                      }));
                      const visRect = {
                        x: -view.x / view.zoom,
                        y: -view.y / view.zoom,
                        w: vpSize.width / view.zoom,
                        h: vpSize.height / view.zoom
                      };
                      const full = bounds([...nodeBoxes.map((x) => x.b), visRect]);
                      full.x -= 36;
                      full.y -= 36;
                      full.w += 72;
                      full.h += 72;
                      const sc = Math.min(mw / full.w, mh / full.h);
                      const ox = (mw - full.w * sc) / 2;
                      const oy = (mh - full.h * sc) / 2;
                      const jumpMinimap = (clientX, clientY, svgEl) => {
                        const r = svgEl.getBoundingClientRect();
                        const wx = full.x + (clientX - r.left - ox) / sc;
                        const wy = full.y + (clientY - r.top - oy) / sc;
                        setViewportDirect(
                          {
                            x: vpSize.width / 2 - wx * view.zoom,
                            y: vpSize.height / 2 - wy * view.zoom,
                            zoom: view.zoom
                          },
                          300
                        );
                      };
                      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-minimap", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("minimap") }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                            "button",
                            {
                              type: "button",
                              className: "icon-button",
                              onClick: () => setMinimapOpen(false),
                              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                            }
                          )
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "svg",
                          {
                            viewBox: `0 0 ${mw} ${mh}`,
                            onPointerDown: (ev) => {
                              const svgEl = ev.currentTarget;
                              jumpMinimap(ev.clientX, ev.clientY, svgEl);
                              trackPointer(
                                ev,
                                (next) => jumpMinimap(next.clientX, next.clientY, svgEl)
                              );
                            },
                            children: [
                              nodeBoxes.map(({ n, b }) => {
                                const st = n.kind === "agent" ? nodeStatusOf(snapshot, n.id) : n.kind;
                                return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                  "rect",
                                  {
                                    className: `mini-node mini-${st}`,
                                    x: (b.x - full.x) * sc + ox,
                                    y: (b.y - full.y) * sc + oy,
                                    width: Math.max(2, b.w * sc),
                                    height: Math.max(2, b.h * sc),
                                    rx: 1.8
                                  },
                                  n.id
                                );
                              }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                                "rect",
                                {
                                  className: "mini-viewport",
                                  x: (visRect.x - full.x) * sc + ox,
                                  y: (visRect.y - full.y) * sc + oy,
                                  width: Math.max(4, visRect.w * sc),
                                  height: Math.max(4, visRect.h * sc),
                                  rx: 2
                                }
                              )
                            ]
                          }
                        )
                      ] });
                    })(),
                    routeName === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-canvas-controls", role: "toolbar", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "pointer-tools", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: `icon-button ${tool === "pointer" ? "active" : ""}`,
                            title: t("pointer"),
                            onClick: () => setTool("pointer"),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pointer" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: `icon-button ${tool === "hand" ? "active" : ""}`,
                            title: t("hand"),
                            onClick: () => setTool("hand"),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "hand" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {}),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "icon-button",
                            title: t("undo"),
                            disabled: !history.length,
                            onClick: () => performUndo(false),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "undo" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "icon-button",
                            title: t("redo"),
                            disabled: !future.length,
                            onClick: () => performUndo(true),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "redo" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "icon-button",
                            title: t("help"),
                            onClick: () => setHelpModal(true),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "help" })
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "canvas-hint", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("doubleClickTip") }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { children: "\xB7" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "Space" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("pan") }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { children: "\xB7" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "Shift" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("rangeSelection") })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "view-tools", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "icon-button",
                            title: t("zoom"),
                            onClick: () => {
                              const rect = viewportRef.current?.getBoundingClientRect();
                              if (!rect) return;
                              animateView(
                                zoomAt(
                                  view,
                                  rect,
                                  rect.left + rect.width / 2,
                                  rect.top + rect.height / 2,
                                  1 / 1.2
                                ),
                                MOTION.region
                              );
                            },
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "off" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "zoom-label",
                            onClick: () => {
                              const px = vpSize.width / 2, py = vpSize.height / 2;
                              animateView(
                                {
                                  x: px - (px - view.x) / view.zoom,
                                  y: py - (py - view.y) / view.zoom,
                                  zoom: 1
                                },
                                MOTION.region
                              );
                            },
                            children: [
                              Math.round(view.zoom * 100),
                              "%"
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "icon-button",
                            title: t("zoom"),
                            onClick: () => {
                              const rect = viewportRef.current?.getBoundingClientRect();
                              if (!rect) return;
                              animateView(
                                zoomAt(
                                  view,
                                  rect,
                                  rect.left + rect.width / 2,
                                  rect.top + rect.height / 2,
                                  1.2
                                ),
                                MOTION.region
                              );
                            },
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "icon-button",
                            title: t("fitView"),
                            onClick: (ev) => fitView(ev.shiftKey),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "fit" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "button",
                          {
                            type: "button",
                            className: `icon-button ${minimapOpen ? "active" : ""}`,
                            title: t("minimap"),
                            onClick: () => setMinimapOpen((v) => !v),
                            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "canvas" })
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "div",
                      {
                        className: `snap-preview ${snapPreview ? `snap-${snapPreview}` : ""}`
                      }
                    ),
                    routeName === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-floating-layer", children: doc.nodes.filter((n) => !!n.window).map((n) => renderNodeCard(n, "window")) }),
                    routeName === "workflows" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      WorkflowsSurface,
                      {
                        tab: libraryTab,
                        onTabChange: setLibraryTab,
                        doc,
                        snapshot,
                        onInstantiate: handleInstantiateTemplate,
                        onPreviewTemplate: setTemplatePreviewModal,
                        onDeleteTemplate: (id) => edit((d) => {
                          d.templates = (d.templates ?? []).filter(
                            (x) => x.id !== id
                          );
                        }),
                        onRestoreSnapshot: handleRestoreSnapshot,
                        onDeleteSnapshot: (id) => edit((d) => {
                          d.snapshots = (d.snapshots ?? []).filter(
                            (x) => x.id !== id
                          );
                        }),
                        onReturnCanvas: () => setRouteName("canvas")
                      }
                    ),
                    routeName === "activity" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      ActivitySurface,
                      {
                        tab: activityTab,
                        onTabChange: setActivityTab,
                        doc,
                        snapshot,
                        onRevealNode: revealNode,
                        onRunCommand: (runId, action) => void bridge.command(runId, action).catch(reportError),
                        onReleaseToken: (runId, tokenId, accept) => void bridge.release(runId, tokenId, accept).catch(reportError),
                        onExtractStep: (nodeId, text, seq) => extractDisplayFrom(nodeId, text, seq, true),
                        onReturnCanvas: () => setRouteName("canvas")
                      }
                    ),
                    routeName === "settings" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      SettingsSurface,
                      {
                        doc,
                        prefs,
                        onUpdatePrefs: (changes) => edit(
                          (d) => {
                            d.prefs = { ...d.prefs, ...changes };
                          },
                          { remember: false }
                        ),
                        onUpdateSettings: (changes) => edit((d) => {
                          d.settings = { ...d.settings, ...changes };
                        }),
                        onToggleLanguage: (lang) => setLanguage(lang),
                        onExportJson: handleExportJson,
                        onTriggerImport: () => importInputRef.current?.click(),
                        onOpenExistingSessions: () => void bridge.sessions().then(setSessionModal).catch(reportError),
                        onLoadStarter: () => {
                          edit(
                            (d) => Object.assign(
                              d,
                              sample(d, "review", {
                                workspaceId: activeWorkspaceId || void 0,
                                cwd: activeWorkspaceCwd
                              })
                            )
                          );
                          setRouteName("canvas");
                          setTimeout(() => fitView(true), 60);
                        }
                      }
                    ),
                    routeName === "conversation" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fs-conversation-surface", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "conversation-heading", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chat" }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: conversationFocusAgent?.title ?? t("newAgent") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button",
                            onClick: (ev) => openAnchoredMenu(
                              ev.currentTarget,
                              doc.nodes.filter((n) => n.kind === "agent").map((ag) => ({
                                label: ag.title,
                                icon: "agent",
                                checked: conversationFocusAgent?.id === ag.id,
                                fn: () => setLastAgentId(ag.id)
                              }))
                            ),
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "agent" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Agent" })
                            ]
                          }
                        ),
                        conversationFocusAgent?.sessionId && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button",
                            onClick: () => bridge.openChat(conversationFocusAgent.sessionId),
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("openNativeChat") })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button",
                            onClick: () => setRouteName("canvas"),
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "canvas" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("returnCanvas") })
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "conversation-node-host", children: conversationFocusAgent ? renderNodeCard(conversationFocusAgent, "conversation") : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "surface-empty", style: { width: "100%" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "agent" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: t("noStarters") }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "button button-primary",
                            onClick: () => {
                              const created = createCanvasNode("agent");
                              setLastAgentId(created.id);
                            },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("newAgent") })
                            ]
                          }
                        )
                      ] }) })
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              InspectorPanel,
              {
                open: inspectorOpen && routeName === "canvas",
                doc,
                snapshot,
                workspaces,
                selectedNode,
                selectedEdge,
                onClose: () => setInspectorOpen(false),
                onEditNode: editNode,
                onEditEdge: editEdge,
                onDeleteSelection: deleteSelection,
                onUngroup: ungroup,
                onReleaseToken: (runId, tokenId, accept) => void bridge.release(runId, tokenId, accept).catch(reportError),
                onOpenNativeChat: (sid) => bridge.openChat(sid),
                onOpenDetail: openDetailCard,
                onOpenWindow: openWindow,
                onSetGroupPorts: (gid, ports) => editNode(gid, { ports }),
                onOpenMergePorts: (gid) => setMergePortsModal({
                  groupId: gid,
                  name: t("inputPort"),
                  selectedPortIds: /* @__PURE__ */ new Set()
                }),
                onSaveTemplate: handleSaveTemplateDialog,
                onSyncTemplate: handleOpenSyncTemplate,
                onDetachTemplate: (gid) => editNode(gid, {
                  templateId: void 0,
                  templateRevision: void 0
                })
              }
            )
          ] }),
          (routeName === "canvas" || routeName === "conversation") && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: `fs-bottom-panel ${bottomOpen ? "open" : ""}`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "bottom-panel-header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: ["events", "outputs", "waiting"].map((tb) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: bottomTab === tb ? "active" : "",
                    onClick: () => setBottomTab(tb),
                    children: t(
                      tb === "events" ? "execution" : tb === "outputs" ? "outputsTab" : "waitingTab"
                    )
                  },
                  tb
                )) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "text-button",
                    onClick: () => setRouteName("activity"),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pop" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("activity") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    onClick: () => setBottomOpen(false),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "bottom-panel-content", children: bottomTab === "events" ? totalStepEvents > 0 ? [...snapshot?.runs ?? []].reverse().flatMap(
                (run) => [...run.steps].reverse().map((step) => ({ run, step }))
              ).slice(0, 30).map(({ run, step }) => {
                const title = run.graph.nodes.find((n) => n.id === step.nodeId)?.title ?? step.nodeId;
                return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "div",
                  {
                    className: `event-row event-${step.state}`,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "event-dot", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        Icon2,
                        {
                          name: step.state === "completed" ? "check" : "bolt"
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t(step.state) }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "event-agent user-content",
                            onClick: () => revealNode(step.nodeId),
                            children: [
                              title,
                              " \xB7",
                              " ",
                              t("roundBadge", { round: step.iteration })
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("time", { children: formatTime(step.createdAt) })
                    ]
                  },
                  step.id
                );
              }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "muted", children: t("noEvents") }) : bottomTab === "outputs" ? (snapshot?.runs ?? []).flatMap(
                (r) => r.steps.filter((s) => s.state === "completed" && s.output).map((s) => ({ r, s }))
              ).reverse().map(({ r, s }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "event-row event-completed", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "event-dot", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "quote" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: r.graph.nodes.find((n) => n.id === s.nodeId)?.title ?? s.nodeId }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "user-content", children: s.output.slice(0, 140) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "text-button",
                    onClick: () => extractDisplayFrom(s.nodeId, s.output, s.endSeq, true),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "quote" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("quoteMessage") })
                    ]
                  }
                )
              ] }, s.id)) : waitingAgentNodes.length ? waitingAgentNodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "event-row event-waiting", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { className: "event-dot", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pause" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: n.title }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "text-button",
                    onClick: () => revealNode(n.id),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("locate") })
                    ]
                  }
                )
              ] }, n.id)) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "muted", children: t("noWaiting") }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "fs-bottom-toggle",
                onClick: () => setBottomOpen((v) => !v),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "bolt" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("activity") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "bottom-event-count", children: snapshot?.runs.length ?? 0 }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "fs-bottom-summary", children: [
                    doc.nodes.filter((n) => n.kind === "agent").length,
                    " Agent \xB7",
                    " ",
                    doc.edges.length,
                    " ",
                    t("continuation"),
                    "/",
                    t("reference")
                  ] })
                ]
              }
            )
          ] })
        ] }),
        menu && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: "fs-menu",
            style: { left: menu.x, top: menu.y },
            role: "menu",
            children: menu.items.map(
              (item, idx) => item.divider ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("hr", {}, idx) : item.heading ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: item.heading }, idx) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  role: "menuitem",
                  disabled: item.disabled,
                  className: item.danger ? "danger" : "",
                  onClick: () => {
                    setMenu(null);
                    item.fn?.();
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "menu-icon", children: item.icon ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: item.icon }) : null }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                      item.label,
                      item.description && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: item.description })
                    ] }),
                    item.checked ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "check" }) : item.shortcut ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: item.shortcut }) : null
                  ]
                },
                idx
              )
            )
          }
        ),
        paletteDialog && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: "fs-dialog-host",
            onClick: () => setPaletteDialog(null),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "section",
              {
                ref: dialogRef,
                className: "dialog command-dialog",
                role: "dialog",
                "aria-modal": "true",
                onClick: (ev) => ev.stopPropagation(),
                children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "command-input", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: paletteDialog.targetNodeId ? "at" : "search" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "input",
                      {
                        autoFocus: true,
                        placeholder: t("commandSearch"),
                        value: paletteDialog.query,
                        onChange: (ev) => setPaletteDialog(
                          (prev) => prev ? { ...prev, query: ev.target.value, index: 0 } : null
                        ),
                        onKeyDown: (ev) => {
                          if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
                            ev.preventDefault();
                            setPaletteDialog(
                              (prev) => prev ? {
                                ...prev,
                                index: clamp(
                                  prev.index + (ev.key === "ArrowDown" ? 1 : -1),
                                  0,
                                  Math.max(0, paletteEntries.length - 1)
                                )
                              } : null
                            );
                          } else if (ev.key === "Enter") {
                            ev.preventDefault();
                            const picked = paletteEntries[paletteDialog.index];
                            if (picked) {
                              setPaletteDialog(null);
                              picked.fn();
                            }
                          }
                        }
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "Esc" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "command-results", children: paletteEntries.length ? paletteEntries.map((entry, idx) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: `command-result ${paletteDialog.index === idx ? "active" : ""}`,
                      onClick: () => {
                        setPaletteDialog(null);
                        entry.fn();
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "command-icon", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: entry.icon }) }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: entry.label }),
                          entry.detail && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { className: "user-content", children: entry.detail })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: entry.section }),
                        paletteDialog.index === idx && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "\u21B5" })
                      ]
                    },
                    idx
                  )) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "command-empty", children: t("noSearchResults") }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "command-hint", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "\u2191 \u2193" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("rangeSelection") }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: "Enter" }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(paletteDialog.targetNodeId ? "reference" : "run") })
                  ] })
                ] })
              }
            )
          }
        ),
        launchDialog && (() => {
          const chosenRoots = launchDialog.plan.roots.filter(
            (id) => !launchDialog.excluded.has(id)
          );
          const reach = new Set(chosenRoots);
          const walk = (id) => {
            for (const e of doc.edges) {
              if (e.kind === "continuation" && e.trigger !== "off" && e.source === id && !reach.has(e.target)) {
                reach.add(e.target);
                walk(e.target);
              }
            }
          };
          chosenRoots.forEach(walk);
          const downstream = [...reach].filter((id) => !chosenRoots.includes(id));
          const confirmIds = downstream.filter((id) => {
            const n = doc.nodes.find((x) => x.id === id);
            return n?.participation === "manual" || doc.edges.some(
              (e) => e.kind === "continuation" && e.target === id && reach.has(e.source) && e.trigger === "confirm"
            );
          });
          const followIds = downstream.filter((id) => !confirmIds.includes(id));
          const skippedRows = [
            ...launchDialog.plan.roots.filter((id) => launchDialog.excluded.has(id)).map((nodeId) => ({ nodeId, reason: t("cancel") })),
            ...launchDialog.plan.skipped.map((s) => ({
              nodeId: s.nodeId,
              reason: tr(s.reason)
            }))
          ];
          const titleOf = (id) => doc.nodes.find((n) => n.id === id)?.title ?? id;
          const upstreamNames = (id) => doc.edges.filter(
            (e) => e.kind === "continuation" && e.trigger !== "off" && e.target === id && reach.has(e.source)
          ).map((e) => titleOf(e.source)).join(" + ");
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              className: "fs-dialog-host",
              onClick: () => setLaunchDialog(null),
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "section",
                {
                  ref: dialogRef,
                  className: "dialog",
                  role: "dialog",
                  "aria-modal": "true",
                  onClick: (ev) => ev.stopPropagation(),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: t("runAll") }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("launchDescription") })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "icon-button",
                          onClick: () => setLaunchDialog(null),
                          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-summary", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-stat now", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: chosenRoots.length }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("launchNow") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-stat next", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: followIds.length }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("launchNext") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-stat confirm", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: confirmIds.length }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("launchConfirm") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-stat", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: skippedRows.length }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("launchNone") })
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "launch-section", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { children: t("launchNow") }),
                        launchDialog.plan.roots.length ? launchDialog.plan.roots.map((id) => {
                          const checked = !launchDialog.excluded.has(id);
                          const hidden = !isNodeVisible(
                            doc.nodes.find((n) => n.id === id),
                            true
                          );
                          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "launch-row", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                              "input",
                              {
                                type: "checkbox",
                                checked,
                                onChange: (ev) => setLaunchDialog((prev) => {
                                  if (!prev) return null;
                                  const next = new Set(prev.excluded);
                                  if (ev.target.checked) next.delete(id);
                                  else next.add(id);
                                  return { ...prev, excluded: next };
                                })
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "node-avatar agent-avatar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "agent" }) }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: titleOf(id) }),
                              hidden && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: t("hidden") })
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(nodeStatusOf(snapshot, id)) })
                          ] }, id);
                        }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "surface-empty", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: t("noStarters") }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("noStartersDescription") })
                        ] })
                      ] }),
                      followIds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "launch-section", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { children: t("launchNext") }),
                        followIds.map((id) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-row is-follow", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }) }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "node-avatar agent-avatar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "agent" }) }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: titleOf(id) }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: t("afterStep", { name: upstreamNames(id) }) })
                          ] })
                        ] }, id))
                      ] }),
                      confirmIds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "launch-section", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { children: t("launchConfirm") }),
                        confirmIds.map((id) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "launch-row is-follow is-confirm", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }) }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "node-avatar agent-avatar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pause" }) }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: titleOf(id) }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: t("afterStep", { name: upstreamNames(id) }) })
                          ] })
                        ] }, id))
                      ] }),
                      skippedRows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "launch-skipped", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chev" }),
                          t("launchNone"),
                          " \xB7 ",
                          skippedRows.length
                        ] }),
                        skippedRows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                          "div",
                          {
                            className: "launch-row is-follow is-none",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", {}),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "node-avatar agent-avatar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "agent" }) }),
                              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: titleOf(row.nodeId) }),
                                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: row.reason })
                              ] })
                            ]
                          },
                          row.nodeId
                        ))
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "dialog-footer", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "button",
                          onClick: () => setLaunchDialog(null),
                          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("cancel") })
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                        "button",
                        {
                          type: "button",
                          className: "button button-primary",
                          disabled: !chosenRoots.length,
                          onClick: () => {
                            const excludeRootIds = [...launchDialog.excluded];
                            setLaunchDialog(null);
                            void bridge.start({
                              kind: "global",
                              nodeIds: [],
                              excludeRootIds
                            }).then(() => setBottomOpen(true)).catch(reportError);
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "play" }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("runCount", { count: chosenRoots.length }) })
                          ]
                        }
                      )
                    ] })
                  ]
                }
              )
            }
          );
        })(),
        formModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          FormDialog,
          {
            dialogRef,
            modal: formModal,
            onClose: () => setFormModal(null)
          }
        ),
        sessionModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: "fs-dialog-host",
            onClick: () => setSessionModal(null),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "section",
              {
                ref: dialogRef,
                className: "dialog",
                role: "dialog",
                "aria-modal": "true",
                onClick: (ev) => ev.stopPropagation(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: t("existingSession") }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        onClick: () => setSessionModal(null),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dialog-body", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-session-list", children: sessionModal.filter(
                    (s) => !doc.nodes.some((n) => n.sessionId === s.sessionId)
                  ).length ? sessionModal.filter(
                    (s) => !doc.nodes.some((n) => n.sessionId === s.sessionId)
                  ).map((s) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "fs-session-pick",
                      onClick: () => {
                        const created = {
                          ...newNode("agent", 120, 160, s.title),
                          sessionId: s.sessionId,
                          cwd: s.cwd,
                          expanded: true,
                          tab: "conversation"
                        };
                        edit((d) => d.nodes.push(created));
                        setSessionModal(null);
                        revealNode(created.id);
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "chat" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: s.title }),
                          s.cwd && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: s.cwd })
                        ] })
                      ]
                    },
                    s.sessionId
                  )) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "muted", children: t("noExistingSessions") }) }) })
                ]
              }
            )
          }
        ),
        fileModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-dialog-host", onClick: () => setFileModal(null), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "section",
          {
            ref: dialogRef,
            className: "dialog file-dialog",
            role: "dialog",
            "aria-modal": "true",
            onClick: (ev) => ev.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: fileModal.path.split("/").pop() }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: fileModal.path })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    onClick: () => setFileModal(null),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "code-toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("lineCount", {
                  count: fileModal.content.split("\n").length
                }) }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "code-view", children: fileModal.content.split("\n").map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "code-line", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "line-number", children: i + 1 }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: line || " " })
                ] }, i)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "dialog-footer", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "button",
                    onClick: () => {
                      void navigator.clipboard.writeText(fileModal.content);
                      showToast(t("copied"));
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "file" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("copy") })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "button",
                    onClick: () => setFileModal(null),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("close") })
                  }
                )
              ] })
            ]
          }
        ) }),
        templatePreviewModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: "fs-dialog-host",
            onClick: () => setTemplatePreviewModal(null),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "section",
              {
                ref: dialogRef,
                className: "dialog",
                role: "dialog",
                "aria-modal": "true",
                onClick: (ev) => ev.stopPropagation(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: templatePreviewModal.builtin ? t(templatePreviewModal.title) : templatePreviewModal.title }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: templatePreviewModal.builtin ? t(templatePreviewModal.description) : templatePreviewModal.description })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        onClick: () => setTemplatePreviewModal(null),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "template-graph template-preview-graph", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      MiniGraph,
                      {
                        nodes: templatePreviewModal.nodes,
                        edges: templatePreviewModal.edges
                      }
                    ) }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "template-preview-list", children: templatePreviewModal.nodes.filter((n) => n.kind === "agent").map((n) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "agent" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: n.title }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "user-content", children: n.task || n.draft })
                      ] })
                    ] }, n.id)) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "dialog-footer", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "button",
                        onClick: () => setTemplatePreviewModal(null),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("cancel") })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                      "button",
                      {
                        type: "button",
                        className: "button button-primary",
                        onClick: () => {
                          const tpl = templatePreviewModal;
                          setTemplatePreviewModal(null);
                          handleInstantiateTemplate(tpl);
                        },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("useTemplate") })
                        ]
                      }
                    )
                  ] })
                ]
              }
            )
          }
        ),
        syncModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-dialog-host", onClick: () => setSyncModal(null), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "section",
          {
            ref: dialogRef,
            className: "dialog",
            role: "dialog",
            "aria-modal": "true",
            onClick: (ev) => ev.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: t("syncTemplate") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("syncDialogDescription") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    onClick: () => setSyncModal(null),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dialog-body", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "sync-diff", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "canvas" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("syncStructure") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("small", { children: [
                    "v",
                    syncModal.plan.template.revision
                  ] })
                ] }),
                syncModal.plan.outside > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "at" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("syncOutsideKept", { count: syncModal.plan.outside }) })
                ] }),
                syncModal.plan.locked.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "pin" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("syncRunKept", {
                    count: syncModal.plan.locked.length
                  }) })
                ] }),
                syncModal.plan.added.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "plus" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("syncAdded", { count: syncModal.plan.added.length }) })
                ] }),
                syncModal.plan.removed.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("syncRemoved", {
                    count: syncModal.plan.removed.length
                  }) })
                ] }),
                syncModal.plan.edited.map((n) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "quote" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { className: "user-content", children: n.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("small", { children: t("syncEdited") })
                ] }, n.id))
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "dialog-footer", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "button",
                    onClick: () => setSyncModal(null),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("cancel") })
                  }
                ),
                syncModal.plan.edited.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "button",
                    onClick: () => {
                      const { groupId, plan } = syncModal;
                      setSyncModal(null);
                      edit(
                        (d) => synchronizeTemplate(d, groupId, plan.template, false, {
                          workspaceId: activeWorkspaceId || void 0,
                          cwd: activeWorkspaceCwd
                        })
                      );
                      showToast(t("templateSynced"));
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("syncUseTemplate") })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "button button-primary",
                    onClick: () => {
                      const { groupId, plan } = syncModal;
                      setSyncModal(null);
                      edit(
                        (d) => synchronizeTemplate(d, groupId, plan.template, true, {
                          workspaceId: activeWorkspaceId || void 0,
                          cwd: activeWorkspaceCwd
                        })
                      );
                      showToast(t("templateSynced"));
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "undo" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(
                        syncModal.plan.edited.length > 0 ? "syncKeepMine" : "syncTemplate"
                      ) })
                    ]
                  }
                )
              ] })
            ]
          }
        ) }),
        mergePortsModal && (() => {
          const grp = doc.nodes.find((n) => n.id === mergePortsModal.groupId);
          const inPorts = grp ? inferGroupPorts(doc, grp).filter((p) => p.direction === "in") : [];
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              className: "fs-dialog-host",
              onClick: () => setMergePortsModal(null),
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "section",
                {
                  ref: dialogRef,
                  className: "dialog",
                  role: "dialog",
                  "aria-modal": "true",
                  onClick: (ev) => ev.stopPropagation(),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: t("mergePorts") }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "icon-button",
                          onClick: () => setMergePortsModal(null),
                          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "field-label", children: t("portName") }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "input",
                        {
                          className: "text-field",
                          value: mergePortsModal.name,
                          onChange: (ev) => setMergePortsModal(
                            (prev) => prev ? { ...prev, name: ev.target.value } : null
                          )
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "merge-port-list", children: inPorts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            checked: mergePortsModal.selectedPortIds.has(p.id),
                            onChange: (ev) => setMergePortsModal((prev) => {
                              if (!prev) return null;
                              const next = new Set(prev.selectedPortIds);
                              if (ev.target.checked) next.add(p.id);
                              else next.delete(p.id);
                              return { ...prev, selectedPortIds: next };
                            })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                          t(p.kind),
                          " \xB7 ",
                          p.name
                        ] })
                      ] }, p.id)) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "dialog-footer", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "button",
                          onClick: () => setMergePortsModal(null),
                          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("cancel") })
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "button button-primary",
                          onClick: () => {
                            if (!grp) return;
                            const all = inferGroupPorts(doc, grp);
                            const chosen = inPorts.filter(
                              (p) => mergePortsModal.selectedPortIds.has(p.id)
                            );
                            if (chosen.length >= 2 && chosen.every((p) => p.kind === chosen[0].kind)) {
                              const merged = {
                                id: uid(),
                                kind: chosen[0].kind,
                                direction: "in",
                                name: mergePortsModal.name || t("inputPort"),
                                nodes: [
                                  ...new Set(chosen.flatMap((p) => p.nodes))
                                ],
                                hidden: false
                              };
                              editNode(grp.id, {
                                ports: [
                                  ...all.filter(
                                    (p) => !mergePortsModal.selectedPortIds.has(p.id)
                                  ),
                                  merged
                                ]
                              });
                            }
                            setMergePortsModal(null);
                          },
                          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("save") })
                        }
                      )
                    ] })
                  ]
                }
              )
            }
          );
        })(),
        exchangeModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: "fs-dialog-host",
            onClick: () => setExchangeModal(null),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "section",
              {
                ref: dialogRef,
                className: "dialog",
                role: "dialog",
                "aria-modal": "true",
                onClick: (ev) => ev.stopPropagation(),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: t("exchange") }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("exchangeReadOnly") })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "icon-button",
                        onClick: () => setExchangeModal(null),
                        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dialog-body", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "exchange-messages", children: exchangeModal.items.map((item) => {
                    const fromTitle = doc.nodes.find((n) => n.id === item.fromId)?.title ?? item.fromId;
                    const toTitle = doc.nodes.find((n) => n.id === item.toId)?.title ?? item.toId;
                    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: "exchange-message", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("b", { className: "user-content", children: [
                          fromTitle,
                          " \u2192 ",
                          toTitle
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("time", { children: formatTime(item.at) })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "user-content", children: item.text }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                        "button",
                        {
                          type: "button",
                          className: "text-button",
                          onClick: () => {
                            setExchangeModal(null);
                            extractDisplayFrom(
                              item.fromId,
                              item.text,
                              item.seq,
                              true
                            );
                          },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "quote" }),
                            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("quoteMessage") })
                          ]
                        }
                      )
                    ] }, item.id);
                  }) }) })
                ]
              }
            )
          }
        ),
        helpModal && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-dialog-host", onClick: () => setHelpModal(false), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "section",
          {
            ref: dialogRef,
            className: "dialog",
            role: "dialog",
            "aria-modal": "true",
            onClick: (ev) => ev.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: t("keyboardHint") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: t("helpDescription") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "icon-button",
                    onClick: () => setHelpModal(false),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" })
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "shortcut-list", children: [
                  ["doubleClickTip", "Double Click"],
                  ["pan", "Space + Drag"],
                  ["rangeSelection", "Shift + Drag"],
                  ["command", "Ctrl K"],
                  ["runSelection", "Ctrl Enter"],
                  ["fitView", "F / Shift F"],
                  ["groupSelection", "G"],
                  ["undo", "Ctrl Z"],
                  ["redo", "Ctrl Shift Z"],
                  ["executionDetail", "D"],
                  ["openWindow", "Alt Enter"],
                  ["deleteNode", "Delete"]
                ].map(([key, sc]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(key) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: sc })
                ] }, key)) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "help-legend", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { viewBox: "0 0 64 16", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "path",
                    {
                      d: "M2 8H62",
                      stroke: "var(--text-2)",
                      strokeWidth: "2.8"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("legendContinuation") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { viewBox: "0 0 64 16", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "path",
                    {
                      d: "M2 8H62",
                      stroke: "var(--accent)",
                      strokeWidth: "1.6",
                      strokeDasharray: "5 4"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("legendReference") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { viewBox: "0 0 64 16", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "path",
                      {
                        d: "M2 8C20 1 44 1 62 8",
                        stroke: "var(--m-f)",
                        strokeWidth: "1.5"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                      "path",
                      {
                        d: "M2 8C20 15 44 15 62 8",
                        stroke: "var(--m-b)",
                        strokeWidth: "1.5"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("legendExchange") }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { viewBox: "0 0 64 16", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "path",
                    {
                      d: "M2 8H62",
                      stroke: "var(--k-display)",
                      strokeWidth: "1.4",
                      strokeDasharray: "1.5 4"
                    }
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("b", { children: t("legendDisplay") })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("footer", { className: "dialog-footer", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "button button-primary",
                  onClick: () => setHelpModal(false),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("close") })
                }
              ) })
            ]
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            ref: importInputRef,
            type: "file",
            accept: "application/json,.json",
            hidden: true,
            onChange: (ev) => {
              const f = ev.target.files?.[0];
              if (f) void handleImportFile(f);
              ev.target.value = "";
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            role: "status",
            "aria-live": "polite",
            className: `fs-toast ${toastState.visible ? "visible" : ""} ${toastState.error ? "is-error" : ""}`,
            children: toastState.text
          }
        )
      ]
    }
  );
}
function dictRoleLabel(role) {
  const key = `role_${role}`;
  const val = t(key);
  return val === key ? role : val;
}
function FormDialog({
  dialogRef,
  modal,
  onClose
}) {
  const [val, setVal] = (0, import_react3.useState)(modal.initialValue);
  const [sec, setSec] = (0, import_react3.useState)(modal.secondaryInitial ?? "");
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fs-dialog-host", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "section",
    {
      ref: dialogRef,
      className: "dialog",
      role: "dialog",
      "aria-modal": "true",
      onClick: (ev) => ev.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dialog-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: modal.title }),
            modal.description && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: modal.description })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "icon-button", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon2, { name: "x" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "form",
          {
            onSubmit: (ev) => {
              ev.preventDefault();
              if (!val.trim()) return;
              modal.onSubmit(val.trim(), sec.trim());
              onClose();
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dialog-body", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "field-label", children: t("name") }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "input",
                  {
                    autoFocus: true,
                    required: true,
                    className: "text-field",
                    value: val,
                    onChange: (ev) => setVal(ev.target.value)
                  }
                ),
                modal.secondaryLabel && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "field-label", children: modal.secondaryLabel }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "textarea",
                    {
                      className: "text-field",
                      rows: 3,
                      value: sec,
                      onChange: (ev) => setSec(ev.target.value)
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("footer", { className: "dialog-footer", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "button", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("cancel") }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "submit",
                    className: "button button-primary",
                    disabled: !val.trim(),
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("save") })
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  ) });
}

// packages/flowspace/src/client/bridge.ts
var import_react4 = require("react");
function value(result) {
  if (!result.ok) throw result.error;
  return result.value;
}
var FlowClient = class {
  constructor(ctx) {
    this.ctx = ctx;
    setLanguage(ctx.locale.getLocale().active);
    ctx.effect(
      () => ctx.locale.subscribe(() => {
        setLanguage(ctx.locale.getLocale().active);
        if (this.snapshot) this.publish({ ...this.snapshot });
      })
    );
    ctx.on("connection/reset", () => {
      if (this.connectCount) {
        this.stream?.dispose();
        this.read();
      }
    });
    ctx.effect(
      () => ctx.uiSession.sessionStatus.subscribe(() => {
        if (this.snapshot) this.publish(this.snapshot);
      })
    );
  }
  snapshot = null;
  listeners = /* @__PURE__ */ new Set();
  stream;
  focus;
  connectCount = 0;
  draftSavers = /* @__PURE__ */ new Map();
  useSnapshot = () => (0, import_react4.useSyncExternalStore)(
    (fn) => {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    },
    () => this.snapshot
  );
  publish(snapshot) {
    const statuses = this.ctx.uiSession.sessionStatus.getSnapshot();
    const live = snapshot.document.nodes.flatMap((node) => {
      if (!node.sessionId) return [];
      const host = snapshot.live.find((s) => s.nodeId === node.id), status = statuses.get(node.sessionId);
      return [
        {
          nodeId: node.id,
          sessionId: node.sessionId,
          output: host?.output ?? "",
          seq: host?.seq ?? -1,
          running: status?.running ?? host?.running ?? false,
          pendingInput: status?.pendingInteraction ? [status.pendingInteraction.kind] : []
        }
      ];
    });
    this.snapshot = { ...snapshot, live };
    this.listeners.forEach((fn) => fn());
  }
  connect() {
    if (!this.connectCount++) this.read();
    return () => {
      if (!--this.connectCount) {
        this.stream?.dispose();
        this.stream = void 0;
        this.presence([]);
      }
    };
  }
  read() {
    const handle = this.ctx.remote.flowspace.follow();
    this.stream = handle;
    void (async () => {
      try {
        for await (const snapshot of handle) this.publish(snapshot);
      } catch (e) {
        console.error("FlowSpace stream:", e);
      }
    })();
  }
  async save(doc) {
    return value(await this.ctx.remote.flowspace.save(doc));
  }
  async plan(req) {
    await Promise.all([...this.draftSavers.values()].map((save) => save()));
    return value(await this.ctx.remote.flowspace.plan(req));
  }
  async start(req) {
    await Promise.all([...this.draftSavers.values()].map((save) => save()));
    const run = value(await this.ctx.remote.flowspace.start(req));
    for (const step of run.steps) {
      const scope = step.sessionId && this.ctx.sessions.scope(step.sessionId);
      if (!scope) continue;
      const input = this.ctx.conversation.input.for(scope);
      if (input.state.getSnapshot().draft.trim() === step.task)
        input.setDraft("");
    }
  }
  async command(runId, action) {
    value(await this.ctx.remote.flowspace.command({ runId, action }));
  }
  async release(runId, tokenId, accept) {
    value(await this.ctx.remote.flowspace.release({ runId, tokenId, accept }));
  }
  async bind(req) {
    return value(await this.ctx.remote.flowspace.bind(req));
  }
  async display(req) {
    return value(await this.ctx.remote.flowspace.display(req));
  }
  async sessions() {
    return value(await this.ctx.remote.flowspace.sessions());
  }
  async stopNode(nodeId) {
    value(await this.ctx.remote.flowspace.stopNode(nodeId));
  }
  async workspaces() {
    return value(await this.ctx.remote.flowspace.workspaces());
  }
  async workspaceFiles(cwd) {
    return value(await this.ctx.remote.flowspace.workspaceFiles({ cwd }));
  }
  async readWorkspaceFile(path, cwd) {
    return value(
      await this.ctx.remote.flowspace.readWorkspaceFile({ path, cwd })
    );
  }
  retain(node) {
    const reference = this.ctx.sessions.retain(node.sessionId, {
      source: "flowspace"
    });
    void reference.ready.then((binding) => {
      this.ctx.conversation.input.requestDraftInitialization(binding, {
        prompt: node.draft,
        whenDraftExists: "keep"
      });
    });
    return reference;
  }
  watchDraft(actx, nodeId) {
    const input = this.ctx.conversation.input.for(actx);
    let timer;
    const flush = async () => {
      clearTimeout(timer);
      const draft = input.state.getSnapshot().draft;
      value(await this.ctx.remote.flowspace.draft({ nodeId, draft }));
    };
    this.draftSavers.set(nodeId, flush);
    const save = () => {
      void flush().catch((error) => input.notify("error", String(error)));
    };
    const stop = input.state.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(save, 400);
    });
    return () => {
      stop();
      clearTimeout(timer);
      this.draftSavers.delete(nodeId);
      void Promise.resolve().then(flush).catch(() => {
      });
    };
  }
  openChat(sessionId) {
    this.ctx.uiWorkspace.openSession(sessionId);
  }
  openCanvas(nodeId) {
    this.focus = nodeId;
    this.ctx.layout.selectPanel("flowspace");
  }
  takeFocus() {
    const id = this.focus;
    this.focus = void 0;
    return id;
  }
  presence(ids) {
    void Promise.resolve().then(() => this.ctx.remote.flowspace.canvasPresence(ids)).then(value).catch(() => {
    });
  }
  dispose() {
    this.stream?.dispose();
    this.listeners.clear();
    this.draftSavers.clear();
  }
};

// packages/flowspace/src/client/index.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var inject = [
  "slots",
  "remote",
  "layout",
  "sessions",
  "uiSession",
  "conversation",
  "uiWorkspace",
  "locale"
];
var PANEL_ID = "flowspace";
function apply(ctx) {
  ctx.remote.$mount(TYPERT_REMOTE);
  ctx.inject(["remote.flowspace"], mountUi);
}
function mountUi(ctx) {
  const bridge = new FlowClient(ctx);
  ctx.effect(() => bridge.connect());
  ctx.effect(() => () => bridge.dispose());
  ctx.slots.inject(
    "main",
    () => ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        children: {
          "flowspace.conversation": { kind: "single", scope: "session" }
        },
        inject: () => ({ bridge })
      },
      Main
    )
  );
  ctx.slots.inject(
    "flowspace.conversation",
    () => ctx.slots.register(
      {
        name: "flowspace.conversation",
        inject: (sessionId) => ({
          watchDraft: (nodeId) => bridge.watchDraft(ctx.sessions.scope(sessionId), nodeId)
        })
      },
      Conversation
    )
  );
  ctx.slots.inject(
    "sidebar.panellist",
    () => ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 100,
        label: "FlowSpace"
      },
      ({ size }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Workflow, { size })
    )
  );
  ctx.slots.inject(
    "conversation.session.header.actions",
    () => ctx.slots.register(
      {
        name: "conversation.session.header.actions",
        id: "flowspace-trigger",
        order: 100,
        inject: () => ({ bridge })
      },
      ChatBadge
    )
  );
}
function Main({ bridge, SessionProvider, renderSlot }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    CanvasApp,
    {
      bridge,
      renderConversation: (node, reference) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionProvider, { session: reference, children: renderSlot("flowspace.conversation", { nodeId: node.id }) })
    }
  );
}
function Conversation({
  nodeId,
  renderFactorySlot,
  watchDraft,
  useSession
}) {
  const blank = useSession((s) => s.blank);
  (0, import_react5.useEffect)(() => watchDraft(nodeId), [nodeId, watchDraft]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "fs-embedded", children: renderFactorySlot("conversation.content", {
    variant: "embedded",
    phase: blank ? "hero" : "active",
    hero: false
  }) });
}
function ChatBadge({
  bridge,
  sessionId
}) {
  const snapshot = bridge.useSnapshot();
  const node = snapshot?.document.nodes.find((n) => n.sessionId === sessionId);
  if (!node) return null;
  const enabled = node.nativeTrigger === "inherit" ? snapshot.document.settings.nativeChatTriggers : node.nativeTrigger === "enabled";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "button",
    {
      className: "fs-chat-badge " + (enabled ? "on" : ""),
      onClick: () => bridge.openCanvas(node.id),
      title: tr("\u5728 FlowSpace \u4E2D\u67E5\u770B\u548C\u8BBE\u7F6E\u63A5\u7EED"),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Workflow, { size: 13 }),
        tr("\u63A5\u7EED"),
        enabled ? tr("\u5F00\u542F") : tr("\u5173\u95ED")
      ]
    }
  );
}
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/workflow.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/

const flowspaceApply=module.exports.apply;return {...module.exports,apply(ctx){ctx.effect(()=>{const style=document.createElement('style');style.dataset.plugin='dsh-flowspace';style.textContent="/* packages/flowspace/src/client/styles/tokens.css */\n@property --beam { syntax: \"<angle>\"; inherits: false; initial-value: 0deg; }\n@property --pop-from { syntax: \"<number>\"; inherits: false; initial-value: -1; }\n@property --enter-x { syntax: \"<length>\"; inherits: false; initial-value: 0px; }\n@keyframes omp-pop-in {\n  from {\n    opacity: 0;\n    translate: 0 calc(var(--shift-xs) * var(--pop-from));\n    scale: 0.97;\n  }\n}\n@keyframes omp-rise-in {\n  from {\n    opacity: 0;\n    translate: 0 var(--shift-xs);\n  }\n}\n@keyframes omp-drop-in {\n  from {\n    opacity: 0;\n    translate: 0 calc(var(--shift-xs) * -1);\n  }\n}\n@keyframes omp-sheet-in {\n  from {\n    opacity: 0;\n    translate: 0 var(--shift-sm);\n    scale: 0.98;\n  }\n}\n@keyframes omp-fade-in {\n  from {\n    opacity: 0;\n  }\n}\n@keyframes omp-enter {\n  from {\n    opacity: 0;\n    translate: var(--enter-x) 0;\n  }\n}\n@keyframes omp-spin {\n  to {\n    rotate: 360deg;\n  }\n}\n@keyframes omp-pulse {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.35;\n  }\n}\n@keyframes omp-sweep {\n  from {\n    translate: -100% 0;\n  }\n  to {\n    translate: 100% 0;\n  }\n}\n@keyframes cv-node-in {\n  from {\n    opacity: 0;\n    scale: 0.94;\n    filter: blur(4px);\n  }\n}\n@keyframes cv-mark-in {\n  from {\n    opacity: 0;\n    scale: 0.6;\n  }\n}\n@keyframes cv-flow {\n  to {\n    stroke-dashoffset: -24;\n  }\n}\n@keyframes cv-beam {\n  to {\n    --beam: 360deg;\n  }\n}\n@keyframes cv-breathe {\n  0%, 100% {\n    box-shadow: 0 0 0 0 transparent;\n  }\n  50% {\n    box-shadow: 0 0 0 5px var(--ring);\n  }\n}\n@keyframes cv-halo {\n  0% {\n    opacity: 0.7;\n    scale: 1;\n  }\n  100% {\n    opacity: 0;\n    scale: 2.4;\n  }\n}\n@keyframes cv-aurora {\n  0% {\n    translate: -4% -3%;\n    rotate: 0deg;\n  }\n  50% {\n    translate: 5% 4%;\n    rotate: 8deg;\n  }\n  100% {\n    translate: -4% -3%;\n    rotate: 0deg;\n  }\n}\n@keyframes cv-shimmer {\n  from {\n    background-position: 200% 0;\n  }\n  to {\n    background-position: -200% 0;\n  }\n}\n@keyframes cv-reveal {\n  from {\n    clip-path: circle(0 at var(--tx, 50%) var(--ty, 0%));\n  }\n  to {\n    clip-path: circle(150vmax at var(--tx, 50%) var(--ty, 0%));\n  }\n}\n.fs-root {\n  --font-ui:\n    \"Segoe UI Variable Text\",\n    \"Segoe UI\",\n    -apple-system,\n    BlinkMacSystemFont,\n    \"PingFang SC\",\n    \"Hiragino Sans GB\",\n    \"Microsoft YaHei UI\",\n    \"Microsoft YaHei\",\n    \"Noto Sans SC\",\n    sans-serif;\n  --font-display:\n    \"Segoe UI Variable Display\",\n    \"Segoe UI\",\n    -apple-system,\n    BlinkMacSystemFont,\n    \"PingFang SC\",\n    \"Microsoft YaHei UI\",\n    sans-serif;\n  --font-mono:\n    \"JetBrains Mono\",\n    \"Cascadia Code\",\n    ui-monospace,\n    \"SF Mono\",\n    Menlo,\n    Consolas,\n    monospace;\n  --r-4: 6px;\n  --r-6: 9px;\n  --r-8: 12px;\n  --r-10: 16px;\n  --r-12: 20px;\n  --r-full: 999px;\n  --radius: var(--r-8);\n  --radius-sm: 7px;\n  --dur-tactile: 80ms;\n  --dur-fast: 120ms;\n  --dur: 180ms;\n  --dur-slow: 250ms;\n  --dur-slower: 320ms;\n  --dur-hero: 480ms;\n  --dur-flash: 900ms;\n  --loop-spin: 800ms;\n  --loop-pulse: 1400ms;\n  --loop-drift: 2400ms;\n  --loop-ambient: 18s;\n  --ease: cubic-bezier(0.25, 0.1, 0.25, 1);\n  --ease-out: cubic-bezier(0.16, 0.84, 0.44, 1);\n  --ease-in: cubic-bezier(0.5, 0, 0.75, 0);\n  --ease-nav: cubic-bezier(0.32, 0.72, 0, 1);\n  --ease-emphasis: cubic-bezier(0.38, 0, 0.08, 1);\n  --ease-loop: cubic-bezier(0.42, 0, 0.58, 1);\n  --ease-spring: linear( 0, 0.006 1%, 0.028 2.25%, 0.064 3.5%, 0.122 5%, 0.179 6.25%, 0.241 7.5%, 0.523 12.75%, 0.638 15%, 0.752 17.5%, 0.84 19.75%, 0.913 22%, 0.977 24.5%, 1.024 27%, 1.055 29.5%, 1.07 31.25%, 1.078 33%, 1.083 36.75%, 1.072 41.25%, 1.017 54.5%, 0.998 62.75%, 0.993 72.5%, 1 );\n  --shift-xs: 4px;\n  --shift-sm: 8px;\n  --shift-md: 12px;\n  --shift-lg: 16px;\n  --stagger: 40ms;\n  --motion-pop: omp-pop-in var(--dur-fast) var(--ease-out) backwards;\n  --motion-reveal: omp-rise-in var(--dur) var(--ease-out) backwards;\n  --motion-unfold: omp-drop-in var(--dur) var(--ease-out) backwards;\n  --motion-sheet: omp-sheet-in var(--dur-slow) var(--ease-out) backwards;\n  --motion-fade: omp-fade-in var(--dur-fast) var(--ease) backwards;\n  color-scheme: dark;\n  --bg: #101216;\n  --canvas: #0b0d10;\n  --surface: #17191e;\n  --surface-2: #1f2127;\n  --surface-3: #2a2c34;\n  --rail: #0e1014;\n  --hover: rgba(235, 235, 245, 0.055);\n  --active: rgba(235, 235, 245, 0.1);\n  --border: rgba(255, 255, 255, 0.07);\n  --border-strong: rgba(255, 255, 255, 0.125);\n  --border-float: rgba(255, 255, 255, 0.2);\n  --text: #eceef2;\n  --text-2: #b1b6c0;\n  --text-3: #8e94a0;\n  --text-faint: #7b818d;\n  --glyph: #646974;\n  --on-accent: #14111f;\n  --accent: #9e8cfc;\n  --accent-2: #6fd0ff;\n  --accent-hover: #b3a5ff;\n  --accent-soft: rgba(158, 140, 252, 0.15);\n  --accent-softer: rgba(158, 140, 252, 0.08);\n  --accent-border: rgba(158, 140, 252, 0.42);\n  --green: #4cc38a;\n  --green-soft: rgba(76, 195, 138, 0.15);\n  --amber: #e6a640;\n  --amber-soft: rgba(230, 166, 64, 0.15);\n  --red: #f26669;\n  --red-soft: rgba(242, 102, 105, 0.14);\n  --blue: #6fb0ee;\n  --teal: #3ccadf;\n  --orange: #ff9468;\n  --grid-rgb: 255 255 255;\n  --sheen: rgba(255, 255, 255, 0.4);\n  --glass: rgba(23, 25, 30, 0.72);\n  --glass-border: rgba(255, 255, 255, 0.11);\n  --shadow: rgba(0, 0, 0, 0.5);\n  --float-shadow:\n    0 1px 0 rgba(255, 255, 255, 0.05) inset,\n    0 12px 36px -8px rgba(0, 0, 0, 0.6),\n    0 2px 8px rgba(0, 0, 0, 0.35);\n  --glow: 1;\n  --aurora-a: rgba(124, 98, 255, 0.16);\n  --aurora-b: rgba(40, 190, 220, 0.1);\n  --aurora-c: rgba(255, 120, 90, 0.07);\n  --k-agent: #9e8cfc;\n  --k-project: #b3a5ff;\n  --k-file: #93b4dc;\n  --k-display: #f472b6;\n  --k-note: #e6a640;\n  --k-board: #818cf8;\n  --k-detail: #8e94a0;\n  --m-f: #3ccadf;\n  --m-b: #ff9468;\n  --note-bg: #221f17;\n  --note-border: rgba(230, 166, 64, 0.3);\n  --code-bg: #0c0e11;\n  --faint: var(--text-faint);\n  --grid: rgb(var(--grid-rgb) / 0.16);\n  font: 13px/1.5 var(--font-ui);\n  color: var(--text);\n  background: var(--bg);\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  min-width: 0;\n  display: flex;\n  overflow: hidden;\n  position: relative;\n  container: flowspace / inline-size;\n  -webkit-font-smoothing: antialiased;\n  text-rendering: optimizeLegibility;\n}\n.fs-root[data-theme=light] {\n  color-scheme: light;\n  --bg: #fafafb;\n  --canvas: #f1f1f5;\n  --surface: #fff;\n  --surface-2: #f3f3f6;\n  --surface-3: #e7e7ec;\n  --rail: #f5f5f8;\n  --hover: rgba(20, 20, 30, 0.05);\n  --active: rgba(20, 20, 30, 0.085);\n  --border: rgba(15, 18, 25, 0.085);\n  --border-strong: rgba(15, 18, 25, 0.15);\n  --border-float: rgba(15, 18, 25, 0.24);\n  --text: #1b1f27;\n  --text-2: #4b525d;\n  --text-3: #5b626d;\n  --text-faint: #6c7380;\n  --glyph: #8b929d;\n  --on-accent: #fff;\n  --accent: #6a50d3;\n  --accent-2: #0b8ba3;\n  --accent-hover: #5b42c2;\n  --accent-soft: rgba(106, 80, 211, 0.1);\n  --accent-softer: rgba(106, 80, 211, 0.055);\n  --accent-border: rgba(106, 80, 211, 0.36);\n  --green: #127a51;\n  --green-soft: rgba(18, 122, 81, 0.11);\n  --amber: #8f5a05;\n  --amber-soft: rgba(143, 90, 5, 0.11);\n  --red: #c0272c;\n  --red-soft: rgba(192, 39, 44, 0.09);\n  --blue: #1f6ba3;\n  --teal: #0b8ba3;\n  --orange: #cc5a2b;\n  --grid-rgb: 20 24 40;\n  --sheen: rgba(255, 255, 255, 0.75);\n  --glass: rgba(255, 255, 255, 0.76);\n  --glass-border: rgba(15, 18, 25, 0.1);\n  --shadow: rgba(30, 34, 52, 0.14);\n  --float-shadow:\n    0 1px 0 rgba(255, 255, 255, 0.9) inset,\n    0 14px 36px -10px rgba(30, 34, 60, 0.22),\n    0 2px 6px rgba(30, 34, 60, 0.08);\n  --glow: 0.55;\n  --aurora-a: rgba(106, 80, 211, 0.1);\n  --aurora-b: rgba(11, 139, 163, 0.07);\n  --aurora-c: rgba(204, 90, 43, 0.05);\n  --k-agent: #6a50d3;\n  --k-project: #6a50d3;\n  --k-file: #3b5f8f;\n  --k-display: #b8336f;\n  --k-note: #8f5a05;\n  --k-board: #4f46e5;\n  --k-detail: #5b626d;\n  --m-f: #0b8ba3;\n  --m-b: #cc5a2b;\n  --note-bg: #fdf6e3;\n  --note-border: rgba(143, 90, 5, 0.28);\n  --code-bg: #f6f6f9;\n}\n.fs-root *,\n.fs-root *::before,\n.fs-root *::after {\n  box-sizing: border-box;\n}\n.fs-root :is(button, input, textarea, select):not(.fs-embedded *) {\n  font: inherit;\n  color: inherit;\n}\n.fs-root button:not(.fs-embedded *) {\n  border: 0;\n  background: none;\n  padding: 0;\n  cursor: pointer;\n  -webkit-tap-highlight-color: transparent;\n}\n.fs-root button:not(.fs-embedded *):disabled {\n  opacity: 0.42;\n  cursor: default;\n}\n.fs-root button:not(.fs-embedded *):not(:disabled):active {\n  scale: 0.96;\n}\n.fs-root button:not(.fs-embedded *),\n.fs-root a:not(.fs-embedded *),\n.fs-root .capsule,\n.fs-root .board-card {\n  transition:\n    background-color var(--dur-fast) var(--ease),\n    color var(--dur-fast) var(--ease),\n    border-color var(--dur-fast) var(--ease),\n    opacity var(--dur-fast) var(--ease),\n    box-shadow var(--dur-fast) var(--ease),\n    scale var(--dur-tactile) var(--ease);\n}\n.fs-root button:not(.fs-embedded *):focus-visible,\n.fs-root a:not(.fs-embedded *):focus-visible,\n.fs-root [tabindex]:not(.fs-embedded *):focus-visible {\n  outline: 2px solid var(--accent);\n  outline-offset: 2px;\n}\n.fs-root :is(input, textarea):not(.fs-embedded *) {\n  outline: none;\n}\n.fs-root textarea:not(.fs-embedded *) {\n  resize: none;\n}\n.fs-root ::selection {\n  background: color-mix(in srgb, var(--accent) 28%, transparent);\n}\n.fs-root ::-webkit-scrollbar {\n  width: 8px;\n  height: 8px;\n}\n.fs-root ::-webkit-scrollbar-thumb {\n  background: var(--border-strong);\n  border-radius: 8px;\n  border: 2px solid transparent;\n  background-clip: content-box;\n}\n.fs-root ::-webkit-scrollbar-thumb:hover {\n  background: var(--glyph);\n  border: 2px solid transparent;\n  background-clip: content-box;\n}\n.fs-root .ic {\n  width: 16px;\n  height: 16px;\n  flex: none;\n  fill: none;\n  stroke: currentColor;\n  stroke-width: 1.45;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n  vertical-align: middle;\n}\n.fs-root .is-hidden {\n  display: none !important;\n}\n.fs-root .muted {\n  color: var(--text-faint);\n  font-size: 12px;\n}\n.fs-root .user-content {\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n.fs-root code:not(.fs-embedded *),\n.fs-root pre:not(.fs-embedded *),\n.fs-root kbd:not(.fs-embedded *) {\n  font-family: var(--font-mono);\n}\n.fs-root kbd:not(.fs-embedded *) {\n  display: inline-flex;\n  align-items: center;\n  height: 18px;\n  padding: 0 5px;\n  border: 1px solid var(--border-strong);\n  border-bottom-width: 2px;\n  border-radius: 5px;\n  background: var(--surface-2);\n  color: var(--text-3);\n  font-size: 10px;\n  white-space: nowrap;\n}\n.fs-root .eyebrow {\n  color: var(--accent);\n  font: 600 10px/1 var(--font-mono);\n  letter-spacing: 0.14em;\n  text-transform: uppercase;\n}\n.fs-root .icon-button {\n  width: 28px;\n  height: 28px;\n  display: inline-grid;\n  place-items: center;\n  border-radius: var(--radius-sm);\n  color: var(--text-3);\n  flex: none;\n}\n.fs-root .icon-button:hover {\n  color: var(--text);\n  background: var(--hover);\n}\n.fs-root .icon-button.active {\n  color: var(--accent);\n  background: var(--accent-soft);\n}\n.fs-root .button {\n  min-height: 30px;\n  padding: 0 12px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  border: 1px solid var(--border-strong);\n  border-radius: 8px;\n  background: var(--surface);\n  white-space: nowrap;\n  font-size: 12px;\n  font-weight: 500;\n}\n.fs-root .button:hover {\n  background: var(--surface-2);\n  border-color: var(--border-float);\n}\n.fs-root .button .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .button-primary {\n  position: relative;\n  overflow: hidden;\n  background:\n    linear-gradient(\n      135deg,\n      var(--accent),\n      color-mix(in srgb, var(--accent) 72%, var(--accent-2)));\n  color: var(--on-accent);\n  border-color: transparent;\n  font-weight: 600;\n  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--accent) calc(70% * var(--glow)), transparent);\n}\n.fs-root .button-primary::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      110deg,\n      transparent 30%,\n      var(--sheen) 50%,\n      transparent 70%);\n  translate: -100% 0;\n  transition: translate var(--dur-hero) var(--ease-out);\n}\n.fs-root .button-primary:not(:disabled):hover {\n  background:\n    linear-gradient(\n      135deg,\n      var(--accent-hover),\n      color-mix(in srgb, var(--accent-hover) 70%, var(--accent-2)));\n  border-color: transparent;\n}\n.fs-root .button-primary:not(:disabled):hover::after {\n  translate: 100% 0;\n}\n.fs-root .button-amber {\n  background: var(--amber);\n  border-color: transparent;\n  color: var(--surface);\n  font-weight: 600;\n  box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--amber) calc(70% * var(--glow)), transparent);\n}\n.fs-root .button-amber:hover {\n  background: color-mix(in srgb, var(--amber) 88%, #fff);\n  border-color: transparent;\n}\n.fs-root .button-quiet {\n  background: none;\n  border-color: transparent;\n  color: var(--text-3);\n}\n.fs-root .text-button {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-height: 26px;\n  padding: 0 6px;\n  margin: 0 -6px;\n  color: var(--text-2);\n  font-size: 12px;\n  border-radius: 6px;\n}\n.fs-root .text-button:hover {\n  color: var(--accent);\n  background: var(--accent-softer);\n}\n.fs-root .text-button .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .danger {\n  color: var(--red);\n}\n.fs-root .text-button.danger:hover {\n  color: var(--red);\n  background: var(--red-soft);\n}\n.fs-root .status {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 20px;\n  padding: 0 8px 0 7px;\n  border-radius: var(--r-full);\n  background: var(--surface-2);\n  color: var(--text-3);\n  font-size: 11px;\n  font-weight: 500;\n  white-space: nowrap;\n  --sc: var(--text-3);\n}\n.fs-root .status > i {\n  position: relative;\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--sc);\n  flex: none;\n}\n.fs-root .status.status-draft,\n.fs-root .status.status-queued {\n  --sc: var(--accent);\n  background: var(--accent-soft);\n  color: var(--accent);\n}\n.fs-root .status.status-draft > i {\n  background: none;\n  box-shadow: inset 0 0 0 1.5px var(--accent);\n}\n.fs-root .status.status-running,\n.fs-root .status.status-completed,\n.fs-root .status.status-done {\n  --sc: var(--green);\n  background: var(--green-soft);\n  color: var(--green);\n}\n.fs-root .status.status-waiting,\n.fs-root .status.status-input,\n.fs-root .status.status-paused {\n  --sc: var(--amber);\n  background: var(--amber-soft);\n  color: var(--amber);\n}\n.fs-root .status.status-error,\n.fs-root .status.status-aborted,\n.fs-root .status.status-cancelled,\n.fs-root .status.status-interrupted {\n  --sc: var(--red);\n  background: var(--red-soft);\n  color: var(--red);\n}\n.fs-root .status.status-running > i::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  border-radius: 50%;\n  background: var(--sc);\n  animation: cv-halo var(--loop-pulse) var(--ease-out) infinite;\n}\n.fs-root .status.status-waiting > i,\n.fs-root .status.status-input > i {\n  animation: omp-pulse var(--loop-pulse) var(--ease-loop) infinite;\n}\n.fs-root .status-dot {\n  position: relative;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--glyph);\n  flex: none;\n}\n.fs-root .status-dot.status-draft {\n  background: none;\n  box-shadow: inset 0 0 0 1.5px var(--accent);\n}\n.fs-root .status-dot.status-queued {\n  background: var(--accent);\n}\n.fs-root .status-dot.status-running,\n.fs-root .status-dot.status-completed,\n.fs-root .status-dot.status-done {\n  background: var(--green);\n}\n.fs-root .status-dot.status-waiting,\n.fs-root .status-dot.status-input,\n.fs-root .status-dot.status-paused {\n  background: var(--amber);\n}\n.fs-root .status-dot.status-error,\n.fs-root .status-dot.status-aborted,\n.fs-root .status-dot.status-interrupted {\n  background: var(--red);\n}\n.fs-root .status-dot.status-running::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  border-radius: 50%;\n  background: var(--green);\n  animation: cv-halo var(--loop-pulse) var(--ease-out) infinite;\n}\n.fs-root .status-dot.status-waiting,\n.fs-root .status-dot.status-input {\n  animation: omp-pulse var(--loop-pulse) var(--ease-loop) infinite;\n}\n.fs-root .switch {\n  width: 32px;\n  height: 18px;\n  border-radius: 9px;\n  background: var(--surface-3);\n  box-shadow: inset 0 0 0 1px var(--border-strong);\n  position: relative;\n  flex: none;\n  transition: background-color var(--dur) var(--ease);\n}\n.fs-root .switch::after {\n  content: \"\";\n  position: absolute;\n  width: 12px;\n  height: 12px;\n  background: var(--text-3);\n  border-radius: 50%;\n  top: 3px;\n  left: 3px;\n  transition:\n    translate var(--dur-slow) var(--ease-spring),\n    background-color var(--dur-fast) var(--ease),\n    width var(--dur-fast) var(--ease);\n}\n.fs-root .switch:active::after {\n  width: 15px;\n}\n.fs-root .switch[aria-checked=true] {\n  background: var(--accent);\n  box-shadow: 0 0 12px -2px color-mix(in srgb, var(--accent) calc(80% * var(--glow)), transparent);\n}\n.fs-root .switch[aria-checked=true]::after {\n  background: var(--on-accent);\n  translate: 14px 0;\n}\n.fs-root .switch[aria-checked=true]:active::after {\n  translate: 11px 0;\n}\n.fs-root .choice-buttons {\n  display: flex;\n  align-items: center;\n  padding: 2px;\n  gap: 2px;\n  border-radius: 9px;\n  background: var(--surface-2);\n  box-shadow: inset 0 0 0 1px var(--border);\n}\n.fs-root .choice-buttons button {\n  flex: 1;\n  min-height: 26px;\n  padding: 0 10px;\n  font-size: 11.5px;\n  color: var(--text-3);\n  border-radius: 7px;\n  white-space: nowrap;\n}\n.fs-root .choice-buttons button:hover {\n  color: var(--text);\n}\n.fs-root .choice-buttons button.selected {\n  background: var(--surface);\n  color: var(--text);\n  font-weight: 600;\n  box-shadow: 0 0 0 1px var(--border-strong), 0 1px 3px var(--shadow);\n}\n.fs-root .choice-buttons.vertical {\n  flex-direction: column;\n  align-items: stretch;\n}\n.fs-root .choice-buttons.vertical button {\n  text-align: left;\n  min-height: 30px;\n}\n.fs-root .field-label {\n  display: block;\n  color: var(--text-faint);\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.03em;\n  margin: 14px 0 2px;\n}\n.fs-root .text-field {\n  min-height: 32px;\n  padding: 6px 10px;\n  width: 100%;\n  border: 1px solid var(--border-strong);\n  border-radius: 8px;\n  background: var(--bg);\n  font-size: 12.5px;\n  user-select: text;\n  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);\n}\n.fs-root .text-field:focus-visible,\n.fs-root .followup-editor:focus-visible,\n.fs-root .waiting-task-editor:focus-visible,\n.fs-root .rounds-field input:focus-visible {\n  border-color: var(--accent);\n  box-shadow: 0 0 0 3px var(--accent-soft);\n}\n.fs-root .text-field.select-field {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  text-align: left;\n}\n.fs-root .select-field .ic {\n  width: 11px;\n  rotate: 90deg;\n  color: var(--text-faint);\n}\n.fs-chat-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  border: 1px solid rgba(158, 140, 252, 0.25);\n  border-radius: 999px;\n  padding: 3px 9px;\n  color: #9395a0;\n  background: rgba(158, 140, 252, 0.06);\n  font-size: 11px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 140ms ease;\n}\n.fs-chat-badge:hover {\n  border-color: rgba(158, 140, 252, 0.5);\n  background: rgba(158, 140, 252, 0.14);\n}\n.fs-chat-badge.on {\n  color: #a899fb;\n}\n\n/* packages/flowspace/src/client/styles/shell.css */\n.fs-root .fs-side {\n  width: 224px;\n  flex: none;\n  background: var(--bg);\n  border-right: 1px solid var(--border);\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  overflow: hidden;\n  transition: width var(--dur-slow) var(--ease-nav);\n  z-index: 22;\n}\n.fs-root .fs-side.collapsed {\n  width: 0;\n  border-right: 0;\n}\n.fs-root .fs-side-head,\n.fs-root .fs-side-list,\n.fs-root .fs-side-footer {\n  width: 224px;\n}\n.fs-root .fs-side-head {\n  padding: 12px 12px 6px;\n}\n.fs-root .brand-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 0 2px;\n}\n.fs-root .rail-brand {\n  width: 28px;\n  height: 28px;\n  border-radius: 8px;\n  overflow: hidden;\n  flex: none;\n  box-shadow: 0 0 0 1px var(--border-strong), 0 6px 16px -6px color-mix(in srgb, var(--accent) calc(60% * var(--glow)), transparent);\n  transition: rotate var(--dur-hero) var(--ease-spring), scale var(--dur) var(--ease-spring);\n}\n.fs-root .rail-brand:hover {\n  rotate: -8deg;\n  scale: 1.06;\n}\n.fs-root .fs-brand-svg {\n  width: 100%;\n  height: 100%;\n  display: block;\n}\n.fs-root .brand-name {\n  display: flex;\n  align-items: baseline;\n  gap: 3px;\n  flex: 1;\n  min-width: 0;\n  font: 400 16px/1.2 var(--font-display);\n  letter-spacing: -0.4px;\n}\n.fs-root .brand-name b {\n  font-weight: 650;\n  background:\n    linear-gradient(\n      100deg,\n      var(--text) 20%,\n      var(--accent) 60%,\n      var(--accent-2));\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n}\n.fs-root .brand-name > span {\n  margin-left: auto;\n  font: 600 8.5px/1 var(--font-mono);\n  letter-spacing: 0.14em;\n  color: var(--text-faint);\n}\n.fs-root .side-search {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  width: 100%;\n  margin-top: 10px;\n  height: 32px;\n  padding: 0 8px 0 10px;\n  color: var(--text-faint);\n  border: 1px solid var(--border);\n  border-radius: 9px;\n  background: var(--surface);\n}\n.fs-root .side-search:hover {\n  border-color: var(--border-strong);\n  color: var(--text-2);\n}\n.fs-root .side-search > span {\n  flex: 1;\n  text-align: left;\n  font-size: 12px;\n}\n.fs-root .side-search .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .fs-side-list {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  padding: 4px 8px 16px;\n}\n.fs-root .side-section-heading {\n  height: 30px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 4px 0 8px;\n  margin-top: 6px;\n  color: var(--text-faint);\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n.fs-root .side-section-heading .icon-button {\n  width: 22px;\n  height: 22px;\n}\n.fs-root .side-section-heading .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .sidebar-project {\n  display: flex;\n  align-items: center;\n  margin: 4px 0 2px;\n}\n.fs-root .project-name {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  text-align: left;\n  flex: 1;\n  min-width: 0;\n  height: 28px;\n  padding: 0 8px;\n  border-radius: 7px;\n  font-size: 12.5px;\n  font-weight: 600;\n}\n.fs-root .project-name:hover {\n  background: var(--hover);\n}\n.fs-root .project-name .ic {\n  width: 15px;\n  height: 15px;\n  color: var(--k-project);\n}\n.fs-root .project-name .user-content {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n.fs-root .sidebar-project .icon-button {\n  width: 24px;\n  height: 24px;\n  color: var(--glyph);\n}\n.fs-root .sidebar-project .icon-button .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .project-hidden {\n  opacity: 0.55;\n}\n.fs-root .sidebar-agent {\n  position: relative;\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  text-align: left;\n  width: 100%;\n  height: 29px;\n  padding: 0 8px 0 24px;\n  border-radius: 7px;\n  color: var(--text-2);\n  font-size: 12px;\n}\n.fs-root .sidebar-agent::before {\n  content: \"\";\n  position: absolute;\n  left: 14px;\n  top: -2px;\n  bottom: -2px;\n  width: 1px;\n  background: var(--border);\n}\n.fs-root .sidebar-agent > span.user-content {\n  flex: 1;\n  min-width: 0;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fs-root .sidebar-agent > small {\n  color: var(--text-faint);\n  font-size: 10px;\n  flex: none;\n}\n.fs-root .sidebar-agent:hover,\n.fs-root .sidebar-workflow:hover,\n.fs-root .side-library-link:hover {\n  background: var(--hover);\n  color: var(--text);\n}\n.fs-root .sidebar-agent.selected,\n.fs-root .sidebar-workflow.selected {\n  background: var(--accent-soft);\n  color: var(--text);\n}\n.fs-root .sidebar-agent.selected::before {\n  background: var(--accent);\n  width: 2px;\n  left: 13.5px;\n  border-radius: 2px;\n}\n.fs-root .agent-hidden {\n  opacity: 0.5;\n}\n.fs-root .side-workflows-heading {\n  margin-top: 16px;\n}\n.fs-root .sidebar-workflow,\n.fs-root .side-library-link {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  text-align: left;\n  width: 100%;\n  height: 30px;\n  padding: 0 8px;\n  color: var(--text-2);\n  border-radius: 7px;\n  font-size: 12px;\n}\n.fs-root .sidebar-workflow > span {\n  flex: 1;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n.fs-root .sidebar-workflow small {\n  color: var(--text-faint);\n  font: 500 10px var(--font-mono);\n  padding: 0 6px;\n  border-radius: var(--r-full);\n  background: var(--surface-2);\n}\n.fs-root .sidebar-workflow .ic {\n  width: 14px;\n  height: 14px;\n  color: var(--accent);\n}\n.fs-root .side-library-link {\n  color: var(--text-faint);\n  margin-top: 4px;\n  border: 1px dashed var(--border-strong);\n}\n.fs-root .side-library-link:hover {\n  border-color: var(--accent-border);\n  color: var(--accent);\n  background: var(--accent-softer);\n}\n.fs-root .side-library-link .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .fs-side-footer {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  height: 40px;\n  border-top: 1px solid var(--border);\n  padding: 0 10px 0 14px;\n  color: var(--text-faint);\n  font-size: 11px;\n}\n.fs-root .local-save-dot {\n  width: 6px;\n  height: 6px;\n  background: var(--green);\n  border-radius: 50%;\n  box-shadow: 0 0 8px var(--green);\n}\n.fs-root .local-save-dot.saving {\n  background: var(--amber);\n  box-shadow: 0 0 8px var(--amber);\n}\n.fs-root .fs-side-footer .icon-button {\n  margin-left: auto;\n  width: 24px;\n  height: 24px;\n}\n.fs-root .fs-side-footer .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .fs-main {\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n}\n.fs-root .fs-top {\n  height: 46px;\n  flex: none;\n  border-bottom: 1px solid var(--border);\n  background: var(--surface);\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 0 10px 0 10px;\n  z-index: 20;\n}\n.fs-root .workspace-breadcrumb {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  min-width: 0;\n  font-size: 12.5px;\n}\n.fs-root .workspace-breadcrumb > span {\n  color: var(--text-faint);\n  white-space: nowrap;\n}\n.fs-root .workspace-breadcrumb > i {\n  color: var(--glyph);\n  font-style: normal;\n}\n.fs-root .workspace-breadcrumb > strong,\n.fs-root .breadcrumb-title-btn {\n  font-weight: 600;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  max-width: 180px;\n  padding: 2px 6px;\n  border-radius: 6px;\n}\n.fs-root .breadcrumb-title-btn:hover {\n  background: var(--hover);\n}\n.fs-root .route-nav {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n  padding: 2px;\n  margin-left: 6px;\n  border-radius: 9px;\n  background: var(--surface-2);\n  box-shadow: inset 0 0 0 1px var(--border);\n}\n.fs-root .route-nav button {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  height: 26px;\n  padding: 0 10px;\n  border-radius: 7px;\n  font-size: 12px;\n  color: var(--text-3);\n  white-space: nowrap;\n}\n.fs-root .route-nav button .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .route-nav button:hover {\n  color: var(--text);\n}\n.fs-root .route-nav button.active {\n  background: var(--surface);\n  color: var(--text);\n  font-weight: 600;\n  box-shadow: 0 0 0 1px var(--border-strong), 0 1px 3px var(--shadow);\n}\n.fs-root .route-nav button.active .ic {\n  color: var(--accent);\n}\n.fs-root .route-badge {\n  min-width: 16px;\n  height: 16px;\n  padding: 0 4px;\n  font: 700 10px/16px var(--font-ui);\n  background: var(--amber);\n  color: var(--surface);\n  border-radius: 8px;\n}\n.fs-root .header-actions {\n  margin-left: auto;\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  white-space: nowrap;\n}\n.fs-root .workspace-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  height: 28px;\n  padding: 0 9px;\n  border-radius: 8px;\n  border: 1px solid var(--border);\n  background: var(--bg);\n  color: var(--text-2);\n  font-size: 11.5px;\n  max-width: 160px;\n}\n.fs-root .workspace-chip:hover {\n  border-color: var(--border-strong);\n  color: var(--text);\n}\n.fs-root .workspace-chip span {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.fs-root .workspace-chip .ic {\n  width: 13px;\n  height: 13px;\n  color: var(--k-project);\n}\n.fs-root .rail-language {\n  min-width: 30px;\n  height: 26px;\n  padding: 0 6px;\n  color: var(--text-3);\n  font: 600 10px/1 var(--font-mono);\n  border: 1px solid var(--border-strong);\n  border-radius: 7px;\n  display: inline-grid;\n  place-items: center;\n}\n.fs-root .rail-language:hover {\n  color: var(--accent);\n  border-color: var(--accent-border);\n}\n.fs-root .header-save {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  color: var(--text-2);\n  padding: 0 9px;\n  height: 30px;\n  border-radius: 8px;\n}\n.fs-root .header-save .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .header-save:hover {\n  background: var(--hover);\n  color: var(--text);\n}\n.fs-root .header-run {\n  padding: 0 13px;\n  min-height: 30px;\n}\n.fs-root .waiting-button {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  height: 26px;\n  padding: 0 10px 0 8px;\n  border-radius: var(--r-full);\n  color: var(--amber);\n  background: var(--amber-soft);\n  font-size: 11.5px;\n  font-weight: 600;\n  --ring: var(--amber-soft);\n  animation: cv-breathe var(--loop-drift) var(--ease-loop) infinite;\n}\n.fs-root .waiting-button:hover {\n  background: color-mix(in srgb, var(--amber) 24%, transparent);\n}\n.fs-root .waiting-button .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .fs-content-row {\n  display: flex;\n  flex: 1;\n  min-height: 0;\n  min-width: 0;\n  position: relative;\n}\n.fs-root .fs-canvas-column {\n  position: relative;\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n}\n.fs-root .fs-canvas-toolbar {\n  position: absolute;\n  top: 12px;\n  left: 12px;\n  right: 12px;\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  z-index: 15;\n  pointer-events: none;\n  transition: left var(--dur-slow) var(--ease-nav), right var(--dur-slow) var(--ease-nav);\n}\n.fs-root .fs-canvas-column:has(.has-left-window) .fs-canvas-toolbar {\n  left: calc(50% + 12px);\n}\n.fs-root .fs-canvas-column:has(.has-right-window) .fs-canvas-toolbar {\n  right: calc(50% + 12px);\n}\n.fs-root .canvas-title,\n.fs-root .toolbar-actions,\n.fs-root .pointer-tools,\n.fs-root .view-tools {\n  pointer-events: auto;\n  background: var(--glass);\n  border: 1px solid var(--glass-border);\n  border-radius: 11px;\n  backdrop-filter: blur(14px) saturate(1.5);\n  -webkit-backdrop-filter: blur(14px) saturate(1.5);\n  box-shadow: var(--float-shadow);\n}\n.fs-root .canvas-title {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  min-width: 0;\n  height: 34px;\n  padding: 0 12px 0 10px;\n  animation: var(--motion-reveal);\n}\n.fs-root .canvas-title > span {\n  color: var(--accent);\n  display: grid;\n}\n.fs-root .canvas-title .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .canvas-title b {\n  font-size: 12.5px;\n  font-weight: 600;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n.fs-root .canvas-save-pill {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  font-size: 10.5px;\n  color: var(--text-faint);\n  padding-left: 6px;\n  border-left: 1px solid var(--border);\n}\n.fs-root .toolbar-actions {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  margin-left: auto;\n  padding: 3px;\n  white-space: nowrap;\n  animation: var(--motion-reveal);\n  animation-delay: var(--stagger);\n}\n.fs-root .toolbar-button,\n.fs-root .toolbar-search {\n  height: 28px;\n  padding: 0 9px;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  border-radius: 8px;\n  font-size: 12px;\n  color: var(--text-2);\n}\n.fs-root .toolbar-button:hover,\n.fs-root .toolbar-search:hover {\n  color: var(--text);\n  background: var(--hover);\n}\n.fs-root .toolbar-button .ic,\n.fs-root .toolbar-search .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .toolbar-actions > kbd {\n  margin: 0 5px 0 0;\n}\n.fs-root .toolbar-separator {\n  width: 1px;\n  height: 16px;\n  background: var(--border-strong);\n  margin: 0 4px;\n}\n.fs-root .fs-canvas-area {\n  flex: 1;\n  min-height: 0;\n  position: relative;\n  overflow: clip;\n  background: var(--canvas);\n}\n.fs-root .fs-canvas-area::before {\n  content: \"\";\n  position: absolute;\n  inset: -25%;\n  pointer-events: none;\n  background:\n    radial-gradient(\n      38% 34% at 24% 26%,\n      var(--aurora-a),\n      transparent 70%),\n    radial-gradient(\n      34% 40% at 78% 72%,\n      var(--aurora-b),\n      transparent 70%),\n    radial-gradient(\n      28% 28% at 64% 14%,\n      var(--aurora-c),\n      transparent 70%);\n  animation: cv-aurora var(--loop-ambient) var(--ease-loop) infinite;\n}\n.fs-root .fs-viewport {\n  position: absolute;\n  inset: 0;\n  overflow: clip;\n  touch-action: none;\n  background-image: radial-gradient(rgb(var(--grid-rgb) / 0.2) 1.2px, transparent 1.5px), radial-gradient(rgb(var(--grid-rgb) / calc(0.12 * var(--ga, 1))) 1px, transparent 1.3px);\n  background-size: calc(var(--gs, 24px) * 5) calc(var(--gs, 24px) * 5), var(--gs, 24px) var(--gs, 24px);\n  background-position: var(--gx, 0) var(--gy, 0);\n  transition: left var(--dur-slow) var(--ease-nav), right var(--dur-slow) var(--ease-nav);\n}\n.fs-root .fs-viewport::before {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  background:\n    radial-gradient(\n      420px circle at var(--mx, -999px) var(--my, -999px),\n      color-mix(in srgb, var(--accent) calc(13% * var(--glow)), transparent),\n      transparent 72%);\n  opacity: var(--spot, 0);\n  transition: opacity var(--dur-hero) var(--ease);\n}\n.fs-root .fs-canvas-area.has-left-window .fs-viewport {\n  left: 50%;\n}\n.fs-root .fs-canvas-area.has-right-window .fs-viewport {\n  right: 50%;\n}\n.fs-root .fs-world {\n  position: absolute;\n  inset: 0 auto auto 0;\n  transform-origin: 0 0;\n  width: 1px;\n  height: 1px;\n}\n.fs-root .fs-nodes-layer,\n.fs-root .fs-groups-layer,\n.fs-root .fs-tags-layer {\n  position: absolute;\n  left: 0;\n  top: 0;\n}\n.fs-root .fs-groups-layer {\n  z-index: 0;\n}\n.fs-root .fs-nodes-layer {\n  z-index: 3;\n}\n.fs-root .fs-tags-layer {\n  z-index: 4;\n}\n.fs-root .fs-edges-svg {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 1px;\n  height: 1px;\n  overflow: visible;\n  pointer-events: none;\n  z-index: 1;\n}\n.fs-root .pan-mode {\n  cursor: grab;\n}\n.fs-root .is-dragging {\n  cursor: grabbing;\n}\n.fs-root .fs-marquee {\n  position: absolute;\n  pointer-events: none;\n  border: 1px solid var(--accent);\n  background: var(--accent-softer);\n  z-index: 8;\n  border-radius: 6px;\n  box-shadow: 0 0 0 1px var(--accent-soft), inset 0 0 24px var(--accent-softer);\n}\n.fs-root .fs-indicators {\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  z-index: 10;\n}\n.fs-root .offscreen-indicator {\n  position: absolute;\n  translate: 0 -50%;\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  height: 28px;\n  padding: 0 9px;\n  color: var(--surface);\n  background: var(--amber);\n  border-radius: var(--r-full);\n  font-size: 12px;\n  font-weight: 600;\n  pointer-events: auto;\n  --ring: var(--amber-soft);\n  animation: cv-breathe var(--loop-drift) var(--ease-loop) infinite;\n  box-shadow: 0 8px 20px -8px var(--amber);\n}\n.fs-root .offscreen-indicator:hover {\n  filter: brightness(1.08);\n}\n.fs-root .offscreen-indicator > span {\n  max-width: 140px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.fs-root .offscreen-indicator .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .indicator-right {\n  translate: -100% -50%;\n}\n.fs-root .fs-canvas-controls {\n  position: absolute;\n  left: 12px;\n  right: 12px;\n  bottom: 12px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 8px;\n  z-index: 12;\n  pointer-events: none;\n}\n.fs-root .pointer-tools,\n.fs-root .view-tools {\n  display: inline-flex;\n  align-items: center;\n  padding: 3px;\n  gap: 1px;\n}\n.fs-root .pointer-tools .icon-button,\n.fs-root .view-tools .icon-button {\n  width: 28px;\n  height: 28px;\n  border-radius: 8px;\n}\n.fs-root .pointer-tools .ic,\n.fs-root .view-tools .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .pointer-tools > i {\n  width: 1px;\n  height: 16px;\n  background: var(--border-strong);\n  margin: 0 4px;\n}\n.fs-root .zoom-label {\n  width: 46px;\n  height: 28px;\n  color: var(--text-2);\n  font: 600 11px var(--font-mono);\n  font-variant-numeric: tabular-nums;\n  border-radius: 8px;\n}\n.fs-root .zoom-label:hover {\n  background: var(--hover);\n  color: var(--text);\n}\n.fs-root .canvas-hint {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 26px;\n  padding: 0 12px;\n  border-radius: var(--r-full);\n  color: var(--text-faint);\n  font-size: 11px;\n  background: color-mix(in srgb, var(--canvas) 70%, transparent);\n  backdrop-filter: blur(8px);\n  -webkit-backdrop-filter: blur(8px);\n  opacity: 0.82;\n}\n.fs-root .canvas-hint i {\n  font-style: normal;\n  color: var(--glyph);\n}\n.fs-root .fs-minimap {\n  position: absolute;\n  right: 12px;\n  bottom: 58px;\n  width: 200px;\n  border: 1px solid var(--glass-border);\n  border-radius: 11px;\n  background: var(--glass);\n  backdrop-filter: blur(14px) saturate(1.5);\n  -webkit-backdrop-filter: blur(14px) saturate(1.5);\n  box-shadow: var(--float-shadow);\n  overflow: hidden;\n  z-index: 10;\n  animation: var(--motion-reveal);\n}\n.fs-root .fs-minimap > header {\n  height: 26px;\n  display: flex;\n  align-items: center;\n  padding: 0 5px 0 10px;\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  color: var(--text-faint);\n  border-bottom: 1px solid var(--border);\n}\n.fs-root .fs-minimap > header .icon-button {\n  margin-left: auto;\n  width: 20px;\n  height: 20px;\n}\n.fs-root .fs-minimap > header .ic {\n  width: 10px;\n  height: 10px;\n}\n.fs-root .fs-minimap > svg {\n  display: block;\n  width: 186px;\n  height: 108px;\n  margin: 6px;\n  cursor: crosshair;\n}\n.fs-root .mini-node {\n  fill: var(--glyph);\n  opacity: 0.55;\n}\n.fs-root .mini-draft {\n  fill: var(--accent);\n  opacity: 0.8;\n}\n.fs-root .mini-group {\n  fill: var(--accent);\n  opacity: 0.45;\n}\n.fs-root .mini-running,\n.fs-root .mini-completed,\n.fs-root .mini-done {\n  fill: var(--green);\n  opacity: 0.95;\n}\n.fs-root .mini-waiting,\n.fs-root .mini-input,\n.fs-root .mini-paused {\n  fill: var(--amber);\n  opacity: 1;\n}\n.fs-root .mini-viewport {\n  fill: var(--accent-softer);\n  stroke: var(--accent);\n  stroke-width: 1.2;\n}\n.fs-root .fs-floating-layer {\n  position: absolute;\n  inset: 0;\n  z-index: 25;\n  pointer-events: none;\n}\n.fs-root .snap-preview {\n  display: none;\n  position: absolute;\n  top: 6px;\n  bottom: 6px;\n  width: calc(50% - 9px);\n  background: var(--accent-softer);\n  border: 1.5px solid var(--accent-border);\n  z-index: 24;\n  pointer-events: none;\n  border-radius: 14px;\n  backdrop-filter: blur(6px);\n  -webkit-backdrop-filter: blur(6px);\n  box-shadow: inset 0 0 60px var(--accent-soft);\n  animation: var(--motion-fade);\n}\n.fs-root .snap-left {\n  display: block;\n  left: 6px;\n}\n.fs-root .snap-right {\n  display: block;\n  right: 6px;\n}\n.fs-root .snap-max {\n  display: block;\n  left: 6px;\n  right: 6px;\n  width: auto;\n}\n.fs-root .fs-welcome-overlay {\n  position: absolute;\n  inset: 0;\n  display: grid;\n  place-items: center;\n  pointer-events: none;\n  padding: 24px;\n  z-index: 9;\n}\n.fs-root .fs-welcome-card {\n  pointer-events: auto;\n  max-width: 520px;\n  width: 100%;\n  padding: 30px 32px;\n  border-radius: 20px;\n  border: 1px solid var(--glass-border);\n  background: var(--glass);\n  backdrop-filter: blur(20px) saturate(1.5);\n  -webkit-backdrop-filter: blur(20px) saturate(1.5);\n  box-shadow: var(--float-shadow);\n  text-align: center;\n  animation: var(--motion-sheet);\n}\n.fs-root .fs-welcome-mark {\n  width: 52px;\n  height: 52px;\n  margin: 0 auto 14px;\n  border-radius: 15px;\n  overflow: hidden;\n  box-shadow: 0 0 0 1px var(--border-strong), 0 12px 28px -8px color-mix(in srgb, var(--accent) calc(65% * var(--glow)), transparent);\n}\n.fs-root .fs-welcome-card h1 {\n  font: 650 22px/1.3 var(--font-display);\n  letter-spacing: -0.5px;\n  margin: 8px 0 10px;\n}\n.fs-root .fs-welcome-card p {\n  color: var(--text-3);\n  font-size: 13px;\n  line-height: 1.7;\n  margin: 0 0 22px;\n}\n.fs-root .fs-welcome-actions {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px;\n}\n.fs-root .fs-inspector {\n  flex: none;\n  width: 0;\n  min-width: 0;\n  overflow: hidden;\n  background: var(--surface);\n  transition: width var(--dur-slow) var(--ease-nav);\n  border-left: 0;\n}\n.fs-root .fs-inspector.open {\n  width: 292px;\n  border-left: 1px solid var(--border);\n  overflow-y: auto;\n}\n.fs-root .inspector-header {\n  width: 291px;\n  height: 46px;\n  display: flex;\n  align-items: center;\n  padding: 0 8px 0 16px;\n  border-bottom: 1px solid var(--border);\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  color: var(--text-faint);\n  position: sticky;\n  top: 0;\n  background: var(--surface);\n  z-index: 2;\n}\n.fs-root .inspector-header .icon-button {\n  margin-left: auto;\n}\n.fs-root .inspector-content {\n  width: 291px;\n  padding: 18px 16px 28px;\n  display: flex;\n  flex-direction: column;\n  align-items: stretch;\n  gap: 8px;\n}\n.fs-root .inspector-content > * {\n  animation: var(--motion-reveal);\n}\n.fs-root .inspector-content > h2 {\n  font: 600 16px/1.45 var(--font-display);\n  letter-spacing: -0.2px;\n  margin: 2px 0 4px;\n}\n.fs-root .inspector-content > h2 > span {\n  display: block;\n  color: var(--accent);\n  font-size: 12px;\n  margin: 2px 0;\n  line-height: 1.3;\n}\n.fs-root .inspector-content > .status {\n  align-self: flex-start;\n}\n.fs-root .inspector-description {\n  color: var(--text-3);\n  font-size: 12px;\n  line-height: 1.65;\n  margin: 0;\n}\n.fs-root .inspector-empty {\n  width: 291px;\n  padding: 88px 26px;\n  text-align: center;\n  color: var(--text-faint);\n}\n.fs-root .inspector-empty > .ic {\n  width: 30px;\n  height: 30px;\n  padding: 7px;\n  box-sizing: content-box;\n  border-radius: 14px;\n  background: var(--surface-2);\n  color: var(--glyph);\n}\n.fs-root .inspector-empty h3 {\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--text-2);\n  margin: 14px 0 6px;\n}\n.fs-root .inspector-empty p {\n  font-size: 12px;\n  line-height: 1.7;\n  margin: 0;\n}\n.fs-root .inspector-divider {\n  height: 1px;\n  background: var(--border);\n  margin: 10px 0;\n}\n.fs-root .mode-options {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 6px;\n}\n.fs-root .mode-options button {\n  display: flex;\n  align-items: flex-start;\n  gap: 9px;\n  text-align: left;\n  padding: 9px 10px;\n  border: 1px solid var(--border);\n  border-radius: 10px;\n  background: var(--bg);\n}\n.fs-root .mode-options button:not(:disabled):hover {\n  border-color: var(--border-float);\n}\n.fs-root .mode-options button > span {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  flex: 1;\n}\n.fs-root .mode-options b {\n  font-size: 12px;\n  font-weight: 600;\n}\n.fs-root .mode-options small {\n  color: var(--text-faint);\n  font-size: 10.5px;\n  line-height: 1.45;\n}\n.fs-root .mode-options .ic {\n  color: var(--text-faint);\n  width: 15px;\n  height: 15px;\n  margin-top: 2px;\n}\n.fs-root .mode-options button.selected {\n  border-color: var(--accent);\n  background: var(--accent-soft);\n  box-shadow: 0 0 0 3px var(--accent-softer);\n}\n.fs-root .mode-options button.selected .ic {\n  color: var(--accent);\n}\n.fs-root .switch-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-height: 34px;\n  font-size: 12.5px;\n}\n.fs-root .rounds-field {\n  display: flex;\n  align-items: center;\n  gap: 9px;\n}\n.fs-root .rounds-field input {\n  width: 64px;\n  height: 32px;\n  border: 1px solid var(--border-strong);\n  border-radius: 8px;\n  background: var(--bg);\n  padding: 0 9px;\n  font: 12px var(--font-mono);\n}\n.fs-root .rounds-field span {\n  color: var(--text-faint);\n  font-size: 11.5px;\n}\n.fs-root .reference-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin: 6px 0;\n}\n.fs-root .reference-list > div {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  min-height: 30px;\n  padding: 4px 9px;\n  border-radius: 8px;\n  background: var(--surface-2);\n  font-size: 12px;\n}\n.fs-root .reference-list > div > small {\n  margin-left: auto;\n  color: var(--text-faint);\n  font-size: 10.5px;\n}\n.fs-root .reference-list .ic {\n  color: var(--accent);\n  width: 13px;\n  height: 13px;\n}\n.fs-root .color-options {\n  display: flex;\n  gap: 10px;\n  padding: 2px;\n}\n.fs-root .color-options button {\n  width: 22px;\n  height: 22px;\n  background: var(--group-color);\n  border-radius: 50%;\n  box-shadow: 0 0 0 2px var(--surface);\n  transition: scale var(--dur) var(--ease-spring), box-shadow var(--dur-fast) var(--ease);\n}\n.fs-root .color-options button:hover {\n  scale: 1.15;\n}\n.fs-root .color-options button.selected {\n  box-shadow:\n    0 0 0 2px var(--surface),\n    0 0 0 4px var(--group-color),\n    0 0 14px var(--group-color);\n}\n.fs-root .port-editor {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.fs-root .port-editor-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 5px 4px 5px 9px;\n  border-radius: 8px;\n  background: var(--surface-2);\n}\n.fs-root .port-editor-row > div {\n  min-width: 0;\n  flex: 1;\n}\n.fs-root .port-editor-row small {\n  display: block;\n  font-size: 10px;\n  color: var(--text-faint);\n}\n.fs-root .port-editor-row input {\n  width: 100%;\n  min-width: 0;\n  background: transparent;\n  border: 0;\n  font-size: 12px;\n  padding: 0;\n}\n.fs-root .port-editor-row .icon-button {\n  width: 22px;\n  height: 22px;\n}\n.fs-root .port-editor-row .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .port-hidden {\n  opacity: 0.45;\n}\n.fs-root .rotate-up > .ic {\n  rotate: -90deg;\n}\n.fs-root .fs-bottom-toggle {\n  height: 26px;\n  flex: none;\n  padding: 0 14px;\n  color: var(--text-faint);\n  border-top: 1px solid var(--border);\n  background: var(--bg);\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  font-size: 11px;\n  text-align: left;\n  width: 100%;\n}\n.fs-root .fs-bottom-toggle:hover {\n  color: var(--text);\n  background: var(--surface);\n}\n.fs-root .bottom-event-count {\n  font: 600 10px var(--font-mono);\n  color: var(--accent);\n  padding: 1px 6px;\n  border-radius: var(--r-full);\n  background: var(--accent-soft);\n}\n.fs-root .fs-bottom-toggle .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .fs-bottom-summary {\n  margin-left: auto;\n  color: var(--text-faint);\n  font-size: 11px;\n}\n.fs-root .fs-bottom-panel {\n  height: 0;\n  flex: none;\n  overflow: hidden;\n  background: var(--surface);\n  transition: height var(--dur-slow) var(--ease-out);\n}\n.fs-root .fs-bottom-panel.open {\n  height: 216px;\n  border-top: 1px solid var(--border);\n}\n.fs-root .bottom-panel-header {\n  height: 36px;\n  display: flex;\n  align-items: center;\n  border-bottom: 1px solid var(--border);\n  padding: 0 8px 0 12px;\n  gap: 8px;\n}\n.fs-root .bottom-panel-header > div {\n  display: flex;\n  gap: 2px;\n  padding: 2px;\n  border-radius: 8px;\n  background: var(--surface-2);\n}\n.fs-root .bottom-panel-header > .icon-button {\n  margin-left: auto;\n  width: 24px;\n  height: 24px;\n}\n.fs-root .bottom-panel-header .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .bottom-panel-header > div button {\n  height: 22px;\n  padding: 0 10px;\n  border-radius: 6px;\n  font-size: 11.5px;\n  color: var(--text-3);\n}\n.fs-root .bottom-panel-header > div button.active {\n  color: var(--text);\n  background: var(--surface);\n  font-weight: 600;\n  box-shadow: 0 0 0 1px var(--border-strong);\n}\n.fs-root .bottom-panel-content {\n  height: 180px;\n  overflow: auto;\n  padding: 6px 14px 12px;\n}\n\n/* packages/flowspace/src/client/styles/nodes.css */\n.fs-root .node {\n  position: absolute;\n  display: flex;\n  flex-direction: column;\n  background: var(--surface);\n  border: 1px solid var(--border-strong);\n  border-radius: var(--r-8);\n  color: var(--text);\n  user-select: none;\n  --kc: var(--text-3);\n  transition:\n    width var(--dur-slow) var(--ease-out),\n    height var(--dur-slow) var(--ease-out),\n    border-color var(--dur-fast) var(--ease),\n    background-color var(--dur-fast) var(--ease),\n    box-shadow var(--dur) var(--ease),\n    opacity var(--dur) var(--ease);\n}\n.fs-root .node:hover {\n  border-color: color-mix(in srgb, var(--kc) 55%, var(--border-strong));\n}\n.fs-root .node.selected {\n  z-index: 4;\n  border-color: var(--accent);\n  box-shadow: 0 0 0 3px var(--accent-soft), 0 18px 40px -18px color-mix(in srgb, var(--accent) calc(55% * var(--glow)), transparent);\n}\n.fs-root .node:focus {\n  outline: none;\n}\n.fs-root .node:focus-visible {\n  outline: 2px solid var(--accent);\n  outline-offset: 4px;\n}\n.fs-root .node-enter {\n  animation: cv-node-in var(--dur-slower) var(--ease-out) backwards;\n}\n.fs-root .is-dragging .node,\n.fs-root .is-dragging .workflow-group {\n  transition-duration: 0s;\n}\n.fs-root .node::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  pointer-events: none;\n  background:\n    radial-gradient(\n      260px circle at var(--px, 50%) var(--py, 0%),\n      color-mix(in srgb, var(--kc) calc(13% * var(--glow)), transparent),\n      transparent 70%);\n  opacity: 0;\n  transition: opacity var(--dur-slow) var(--ease);\n}\n.fs-root .node:hover::after {\n  opacity: 1;\n}\n.fs-root .node-agent {\n  --kc: var(--text-3);\n}\n.fs-root .node.status-draft {\n  --kc: var(--accent);\n  border-style: dashed;\n  border-color: var(--accent-border);\n}\n.fs-root .node.status-running,\n.fs-root .node.status-completed,\n.fs-root .node.status-done {\n  --kc: var(--green);\n}\n.fs-root .node.status-waiting,\n.fs-root .node.status-input,\n.fs-root .node.status-paused,\n.fs-root .node.needs-confirmation {\n  --kc: var(--amber);\n}\n.fs-root .node.status-error,\n.fs-root .node.status-aborted,\n.fs-root .node.status-interrupted {\n  --kc: var(--red);\n}\n.fs-root .node-file {\n  --kc: var(--k-file);\n}\n.fs-root .node-display {\n  --kc: var(--k-display);\n}\n.fs-root .node-board {\n  --kc: var(--k-board);\n}\n.fs-root .node-detail {\n  --kc: var(--k-detail);\n}\n.fs-root .node-note {\n  --kc: var(--k-note);\n  background: var(--note-bg);\n  border-color: var(--note-border);\n}\n.fs-root .node.status-running {\n  border-style: solid;\n  border-color: color-mix(in srgb, var(--green) 45%, var(--border-strong));\n  box-shadow: 0 0 34px -10px color-mix(in srgb, var(--green) calc(60% * var(--glow)), transparent);\n}\n.fs-root .node.status-running::before {\n  content: \"\";\n  position: absolute;\n  inset: -1.5px;\n  border-radius: inherit;\n  padding: 1.5px;\n  pointer-events: none;\n  background:\n    conic-gradient(\n      from var(--beam),\n      transparent 0 58%,\n      color-mix(in srgb, var(--green) 60%, transparent) 76%,\n      var(--green) 90%,\n      color-mix(in srgb, var(--green) 40%, #fff) 96%,\n      transparent 100%);\n  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);\n  -webkit-mask-composite: xor;\n  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);\n  animation: cv-beam var(--loop-drift) linear infinite;\n}\n.fs-root .node.status-waiting,\n.fs-root .node.status-input,\n.fs-root .node.needs-confirmation {\n  border-color: var(--amber);\n  border-style: solid;\n  --ring: var(--amber-soft);\n}\n.fs-root .node.status-waiting::before,\n.fs-root .node.status-input::before,\n.fs-root .node.needs-confirmation::before {\n  content: \"\";\n  position: absolute;\n  inset: -1px;\n  border-radius: inherit;\n  pointer-events: none;\n  animation: cv-breathe var(--loop-drift) var(--ease-loop) infinite;\n}\n.fs-root .node.is-pinned .node-avatar::after {\n  content: \"\";\n  width: 6px;\n  height: 6px;\n  background: var(--accent);\n  position: absolute;\n  bottom: -1px;\n  right: -1px;\n  border-radius: 50%;\n  box-shadow: 0 0 0 2px var(--surface);\n}\n.fs-root .node-header {\n  height: 48px;\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  padding: 0 8px 0 11px;\n  flex: none;\n  border-bottom: 1px solid var(--border);\n  cursor: grab;\n  position: relative;\n}\n.fs-root .node-avatar {\n  position: relative;\n  width: 26px;\n  height: 26px;\n  border-radius: 8px;\n  flex: none;\n  display: grid;\n  place-items: center;\n  color: var(--kc);\n  background: color-mix(in srgb, var(--kc) 14%, var(--surface));\n  transition: color var(--dur) var(--ease), background-color var(--dur) var(--ease);\n}\n.fs-root .node-avatar .ic {\n  width: 15px;\n  height: 15px;\n}\n.fs-root .agent-avatar {\n  border-radius: 50%;\n}\n.fs-root .status-draft .node-avatar {\n  background: transparent;\n  box-shadow: inset 0 0 0 1.5px var(--accent-border);\n}\n.fs-root .status-running .agent-avatar::before {\n  content: \"\";\n  position: absolute;\n  inset: -3px;\n  border-radius: 50%;\n  border: 1.5px solid transparent;\n  border-top-color: var(--kc);\n  border-right-color: var(--kc);\n  animation: omp-spin var(--loop-spin) linear infinite;\n}\n.fs-root .status-waiting .node-avatar,\n.fs-root .status-input .node-avatar,\n.fs-root .needs-confirmation .node-avatar {\n  animation: omp-pulse var(--loop-pulse) var(--ease-loop) infinite;\n}\n.fs-root .node-heading {\n  min-width: 0;\n  flex: 1;\n  display: flex;\n  align-items: baseline;\n  gap: 7px;\n}\n.fs-root .node-heading strong {\n  font: 600 14px/1.3 var(--font-display);\n  letter-spacing: -0.1px;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n.fs-root .node-heading small {\n  flex: none;\n  font-size: 10.5px;\n  color: var(--text-faint);\n  padding: 1px 7px;\n  border-radius: var(--r-full);\n  background: var(--surface-2);\n  translate: 0 -1px;\n}\n.fs-root .node-actions {\n  display: flex;\n  align-items: center;\n  gap: 1px;\n  flex: none;\n}\n.fs-root .node-actions .icon-button {\n  width: 24px;\n  height: 24px;\n  border-radius: 6px;\n}\n.fs-root .node-actions .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .node-body {\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  border-radius: 0 0 11px 11px;\n}\n.fs-root .node.full .node-body {\n  animation: var(--motion-unfold);\n}\n.fs-root .node.compact .node-header {\n  height: 42px;\n  border-bottom: 0;\n}\n.fs-root .node.compact .node-avatar {\n  width: 24px;\n  height: 24px;\n}\n.fs-root .node.compact .node-heading strong {\n  font-size: 13px;\n}\n.fs-root .node.compact .node-actions {\n  position: absolute;\n  right: 6px;\n  top: 9px;\n  padding-left: 16px;\n  background:\n    linear-gradient(\n      90deg,\n      transparent,\n      var(--surface) 14px);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity var(--dur-fast) var(--ease);\n}\n.fs-root .node-note.compact .node-actions {\n  background:\n    linear-gradient(\n      90deg,\n      transparent,\n      var(--note-bg) 14px);\n}\n.fs-root .node.compact:hover .node-actions,\n.fs-root .node.compact.selected .node-actions,\n.fs-root .node.compact:focus-within .node-actions {\n  opacity: 1;\n  pointer-events: auto;\n}\n.fs-root .semantic-zoom .node.compact .node-heading strong {\n  font-size: calc(13px * var(--type-scale, 1));\n}\n.fs-root .semantic-zoom .compact-status .status {\n  font-size: calc(11px * var(--type-scale, 1));\n  height: auto;\n  padding: 1px 8px;\n}\n.fs-root .semantic-zoom .compact-status > span:last-child,\n.fs-root .semantic-zoom .compact-summary,\n.fs-root .semantic-zoom .compact-tool {\n  display: none;\n}\n.fs-root .semantic-zoom .node.compact .node-avatar {\n  scale: var(--type-scale, 1);\n  margin-right: calc(8px * (var(--type-scale, 1) - 1));\n}\n.fs-root .compact-status {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 0 12px 0 11px;\n}\n.fs-root .compact-status > span:last-child {\n  margin-left: auto;\n  color: var(--text-faint);\n  font: 10.5px var(--font-mono);\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n.fs-root .compact-summary {\n  margin: 6px 12px 0 11px;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--text-2);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.fs-root .node-note .compact-summary {\n  margin-top: 0;\n  color: var(--text);\n}\n.fs-root .compact-tool {\n  padding: 0 12px 0 44px;\n  line-height: 20px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 9px;\n  color: var(--text-faint);\n  font-size: 11.5px;\n}\n.fs-root .compact-tool span {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fs-root .compact-tool b {\n  color: var(--text);\n  font-weight: 600;\n}\n.fs-root .compact-display-mode {\n  position: absolute;\n  right: 10px;\n  bottom: 8px;\n  color: var(--k-display);\n  font-size: 10.5px;\n  padding: 0 7px;\n  border-radius: var(--r-full);\n  background: color-mix(in srgb, var(--k-display) 12%, transparent);\n}\n.fs-root .compact-release {\n  position: absolute;\n  right: 8px;\n  bottom: 8px;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  height: 22px;\n  padding: 0 10px 0 8px;\n  border-radius: var(--r-full);\n  color: var(--surface);\n  background: var(--amber);\n  font-size: 11px;\n  font-weight: 600;\n  box-shadow: 0 6px 14px -6px var(--amber);\n}\n.fs-root .compact-release .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .agent-body {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-height: 0;\n}\n.fs-root .agent-status-row {\n  display: flex;\n  align-items: center;\n  height: 36px;\n  padding: 0 11px;\n  gap: 7px;\n  flex: none;\n}\n.fs-root .agent-workspace-tag {\n  margin-left: auto;\n  color: var(--text-faint);\n  font: 500 10.5px var(--font-mono);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  max-width: 120px;\n}\n.fs-root .queue-count {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  height: 20px;\n  padding: 0 7px;\n  border-radius: var(--r-full);\n  font: 500 10.5px var(--font-mono);\n  color: var(--amber);\n  background: var(--amber-soft);\n}\n.fs-root .queue-count .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .node-tabs {\n  height: 28px;\n  display: flex;\n  align-items: stretch;\n  margin: 0 10px 8px;\n  padding: 2px;\n  gap: 2px;\n  flex: none;\n  border-radius: 9px;\n  background: var(--surface-2);\n}\n.fs-root .node-tabs button {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  color: var(--text-3);\n  font-size: 12px;\n  white-space: nowrap;\n  border-radius: 7px;\n}\n.fs-root .node-tabs button:hover {\n  color: var(--text);\n}\n.fs-root .node-tabs button[aria-selected=true] {\n  color: var(--text);\n  font-weight: 600;\n  background: var(--surface);\n  box-shadow: 0 0 0 1px var(--border-strong), 0 1px 3px var(--shadow);\n}\n.fs-root .node-tabs button > span {\n  font: 500 10px var(--font-mono);\n  color: var(--text-faint);\n  padding: 0 5px;\n  border-radius: var(--r-full);\n  background: var(--surface-3);\n}\n.fs-root .node-scroll {\n  flex: 1;\n  min-height: 0;\n  overflow: auto;\n  padding: 6px 12px 12px;\n  user-select: text;\n  border-top: 1px solid var(--border);\n}\n.fs-root .agent-embedded-wrap {\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  border-top: 1px solid var(--border);\n}\n.fs-root .fs-embedded {\n  flex: 1;\n  min-height: 0;\n  height: 100%;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.fs-root .fs-embedded > div {\n  flex: 1;\n  min-height: 0;\n}\n.fs-root .fs-loading {\n  flex: 1;\n  display: grid;\n  place-items: center;\n  color: var(--text-faint);\n  font-size: 12px;\n}\n.fs-root .quote-selection-bar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 5px 10px;\n  background: var(--accent-soft);\n  border-bottom: 1px solid var(--accent-border);\n  font-size: 11.5px;\n  color: var(--accent);\n}\n.fs-root .task-content {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 10px 12px 12px;\n}\n.fs-root .task-label {\n  color: var(--text-faint);\n  font-size: 10.5px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n}\n.fs-root .task-editor {\n  width: 100%;\n  flex: 1;\n  min-height: 92px;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--text);\n  font-size: 13.5px;\n  line-height: 1.7;\n  user-select: text;\n  caret-color: var(--accent);\n}\n.fs-root .task-editor::placeholder,\n.fs-root .note-editor::placeholder,\n.fs-root .followup-editor::placeholder {\n  color: var(--text-faint);\n}\n.fs-root .latest-output-preview {\n  margin-top: 4px;\n  padding: 8px 10px;\n  border-radius: 9px;\n  background: var(--surface-2);\n  border-left: 2px solid var(--green);\n  font-size: 12px;\n  line-height: 1.6;\n  color: var(--text-2);\n  max-height: 92px;\n  overflow: auto;\n}\n.fs-root .context-label {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  color: var(--text-faint);\n  font-size: 10.5px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  margin-top: auto;\n  padding-top: 6px;\n}\n.fs-root .context-label .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .context-label button {\n  margin-left: auto;\n  width: 22px;\n  height: 20px;\n  border-radius: 6px;\n  display: grid;\n  place-items: center;\n}\n.fs-root .context-label button:hover {\n  color: var(--accent);\n  background: var(--accent-soft);\n}\n.fs-root .reference-tray {\n  min-height: 24px;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  align-items: center;\n}\n.fs-root .empty-reference {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  height: 24px;\n  border: 1px dashed var(--border-strong);\n  color: var(--text-faint);\n  border-radius: var(--r-full);\n  padding: 0 10px 0 8px;\n  font-size: 11px;\n}\n.fs-root .empty-reference:hover {\n  border-color: var(--accent-border);\n  color: var(--accent);\n  background: var(--accent-softer);\n}\n.fs-root .empty-reference .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .capsule {\n  height: 24px;\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  max-width: 100%;\n  padding: 0 9px 0 7px;\n  border: 1px solid var(--accent-border);\n  border-radius: var(--r-full);\n  color: var(--text);\n  font-size: 11.5px;\n  background: var(--accent-softer);\n  cursor: grab;\n  animation: cv-mark-in var(--dur) var(--ease-spring) backwards;\n}\n.fs-root .capsule:hover {\n  background: var(--accent-soft);\n  border-color: var(--accent);\n  translate: 0 -1px;\n}\n.fs-root .capsule .ic {\n  width: 12px;\n  height: 12px;\n  color: var(--accent);\n}\n.fs-root .capsule span {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  max-width: 145px;\n}\n.fs-root .capsule-sent {\n  background: transparent;\n  color: var(--text-faint);\n  border-color: var(--border-strong);\n  border-style: dashed;\n}\n.fs-root .capsule-sent .ic {\n  color: var(--glyph);\n}\n.fs-root .capsule-updated {\n  color: var(--green);\n  background: var(--green-soft);\n  border-color: var(--green);\n}\n.fs-root .capsule-updated .ic {\n  color: var(--green);\n}\n.fs-root .capsule-always {\n  border-color: var(--accent);\n  background: var(--accent-soft);\n  box-shadow: 0 0 0 1px var(--accent-border);\n}\n.fs-root .agent-footer {\n  display: flex;\n  align-items: center;\n  flex: none;\n  height: 44px;\n  padding: 0 8px 0 10px;\n  gap: 5px;\n  border-top: 1px solid var(--border);\n}\n.fs-root .model-picker,\n.fs-root .mode-picker {\n  display: flex;\n  align-items: center;\n  min-width: 0;\n  gap: 5px;\n  height: 24px;\n  padding: 0 8px;\n  border-radius: var(--r-full);\n  color: var(--text-3);\n  font-size: 11px;\n}\n.fs-root .model-picker .ic,\n.fs-root .mode-picker .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .model-picker span {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  max-width: 100px;\n  font-family: var(--font-mono);\n  font-size: 10.5px;\n}\n.fs-root .model-picker:hover,\n.fs-root .mode-picker:hover {\n  color: var(--accent);\n  background: var(--accent-soft);\n}\n.fs-root .mode-picker {\n  flex: none;\n  box-shadow: inset 0 0 0 1px var(--border-strong);\n}\n.fs-root .agent-controls {\n  margin-left: auto;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  flex: none;\n}\n.fs-root .agent-controls .button {\n  min-height: 28px;\n  padding: 0 11px;\n  font-size: 12px;\n}\n.fs-root .agent-controls .button .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .progress-line {\n  height: 3px;\n  position: absolute;\n  bottom: 0;\n  left: 12px;\n  right: 12px;\n  overflow: hidden;\n  opacity: 0;\n  border-radius: 3px 3px 0 0;\n  background: var(--surface-3);\n  transition: opacity var(--dur) var(--ease);\n}\n.fs-root .progress-line.is-running {\n  opacity: 1;\n}\n.fs-root .progress-line i {\n  position: relative;\n  display: block;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  border-radius: 3px;\n  background:\n    linear-gradient(\n      90deg,\n      var(--green),\n      color-mix(in srgb, var(--green) 60%, var(--accent-2)));\n  box-shadow: 0 0 10px var(--green);\n}\n.fs-root .progress-line i::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      90deg,\n      transparent,\n      var(--sheen),\n      transparent);\n  animation: omp-sweep var(--loop-pulse) linear infinite;\n}\n.fs-root .node-empty {\n  padding: 32px 16px;\n  text-align: center;\n  color: var(--text-faint);\n  font-size: 12px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n}\n.fs-root .node-empty > .ic {\n  width: 22px;\n  height: 22px;\n  opacity: 0.6;\n}\n.fs-root .node-empty p {\n  margin: 0;\n  line-height: 1.6;\n}\n.fs-root .approval-box {\n  position: relative;\n  background: var(--amber-soft);\n  border: 1px solid color-mix(in srgb, var(--amber) 55%, transparent);\n  border-radius: 10px;\n  padding: 10px 11px;\n  margin: 4px 0 6px;\n  color: var(--text-2);\n  font-size: 12px;\n  animation: var(--motion-reveal);\n}\n.fs-root .approval-heading {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  color: var(--amber);\n  font-size: 11.5px;\n  margin-bottom: 5px;\n}\n.fs-root .approval-heading .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .approval-box p {\n  margin: 4px 0;\n  font-size: 11.5px;\n  line-height: 1.55;\n}\n.fs-root .approval-snippet {\n  font-size: 11px;\n  color: var(--text-3);\n  background: var(--bg);\n  border-radius: 6px;\n  padding: 6px 8px;\n  max-height: 76px;\n  overflow: auto;\n  margin: 6px 0;\n}\n.fs-root .button-row {\n  display: flex;\n  gap: 6px;\n  margin-top: 8px;\n}\n.fs-root .button-row .button {\n  min-height: 26px;\n  font-size: 11.5px;\n  padding: 0 11px;\n}\n.fs-root .port {\n  position: absolute;\n  width: 20px;\n  height: 20px;\n  top: calc(var(--port-y) - 10px);\n  z-index: 5;\n  display: grid;\n  place-items: center;\n  color: var(--border-float);\n  cursor: crosshair;\n  opacity: 0;\n  scale: 0.5;\n  transition:\n    color var(--dur-fast) var(--ease),\n    opacity var(--dur-fast) var(--ease),\n    scale var(--dur) var(--ease-spring);\n}\n.fs-root .port::before {\n  content: \"\";\n  position: absolute;\n  inset: -6px;\n}\n.fs-root .port-in {\n  left: -11px;\n}\n.fs-root .port-out {\n  right: -11px;\n}\n.fs-root .port-reference {\n  --pc: var(--accent);\n}\n.fs-root .port-continuation {\n  --pc: var(--text);\n}\n.fs-root .node:hover > .port,\n.fs-root .node.selected > .port,\n.fs-root .port.is-linked,\n.fs-root .connecting .port,\n.fs-root .semantic-zoom .port.is-linked {\n  opacity: 1;\n  scale: 1;\n}\n.fs-root .node:hover > .port,\n.fs-root .node.selected > .port,\n.fs-root .port.is-linked {\n  color: var(--pc);\n}\n.fs-root .port > i {\n  display: block;\n  width: 10px;\n  height: 10px;\n  background: var(--surface);\n  border: 1.75px solid currentColor;\n  border-radius: 50%;\n  transition:\n    scale var(--dur) var(--ease-spring),\n    background-color var(--dur-fast) var(--ease),\n    box-shadow var(--dur-fast) var(--ease);\n}\n.fs-root .node-note > .port > i {\n  background: var(--note-bg);\n}\n.fs-root .port.is-linked > i {\n  background: currentColor;\n}\n.fs-root .port-continuation > i {\n  width: 12px;\n  height: 12px;\n  border: 0;\n  border-radius: 0;\n  background: currentColor;\n  clip-path: polygon(0 8%, 52% 8%, 100% 50%, 52% 92%, 0 92%, 26% 50%);\n}\n.fs-root .port:hover > i,\n.fs-root .port-target > i {\n  scale: 1.45;\n  background: currentColor;\n  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 22%, transparent);\n}\n.fs-root .port:hover,\n.fs-root .port-target {\n  color: var(--pc);\n}\n.fs-root .connecting-continuation .port-reference,\n.fs-root .connecting-reference .port-continuation {\n  opacity: 0.15;\n}\n.fs-root .connecting-reference .port-reference.port-in,\n.fs-root .connecting-continuation .port-continuation.port-in {\n  color: var(--pc);\n  scale: 1.2;\n}\n.fs-root .connecting-reference .port-reference.port-in > i,\n.fs-root .connecting-continuation .port-continuation.port-in > i {\n  animation: omp-pulse var(--loop-pulse) var(--ease-loop) infinite;\n}\n.fs-root .semantic-zoom .port {\n  scale: var(--type-scale, 1);\n}\n.fs-root .node-resizer,\n.fs-root .window-resizer,\n.fs-root .group-resizer {\n  position: absolute;\n  right: 3px;\n  bottom: 3px;\n  width: 14px;\n  height: 14px;\n  border-right: 2px solid var(--border-strong);\n  border-bottom: 2px solid var(--border-strong);\n  border-radius: 0 0 8px 0;\n  cursor: nwse-resize;\n  opacity: 0;\n  z-index: 3;\n  transition: opacity var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);\n}\n.fs-root .node:hover > .node-resizer,\n.fs-root .node:hover > .window-resizer,\n.fs-root .workflow-group:hover > .group-resizer,\n.fs-root .workflow-group.selected > .group-resizer {\n  opacity: 0.7;\n}\n.fs-root .node-resizer:hover,\n.fs-root .window-resizer:hover,\n.fs-root .group-resizer:hover {\n  border-color: var(--accent);\n  opacity: 1 !important;\n}\n.fs-root .node-note .node-header {\n  border-bottom-color: var(--note-border);\n}\n.fs-root .note-editor {\n  background: transparent;\n  border: 0;\n  flex: 1;\n  min-height: 0;\n  padding: 11px 13px;\n  line-height: 1.7;\n  user-select: text;\n  caret-color: var(--k-note);\n}\n.fs-root .display-content {\n  flex: 1;\n  min-height: 0;\n  margin: 12px 13px;\n  padding: 1px 0 1px 12px;\n  border-left: 2px solid var(--k-display);\n  overflow-y: auto;\n  font-size: 12.5px;\n  line-height: 1.7;\n  color: var(--text-2);\n  user-select: text;\n}\n.fs-root .display-footer {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  padding: 0 12px;\n  border-top: 1px solid var(--border);\n  flex: none;\n  height: 38px;\n}\n.fs-root .display-footer > :last-child {\n  margin-left: auto;\n}\n.fs-root .display-mode {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  height: 22px;\n  padding: 0 9px 0 7px;\n  border-radius: var(--r-full);\n  color: var(--k-display);\n  background: color-mix(in srgb, var(--k-display) 12%, transparent);\n  font-size: 11px;\n}\n.fs-root .display-mode:hover {\n  background: color-mix(in srgb, var(--k-display) 20%, transparent);\n}\n.fs-root .display-mode .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .detail-summary {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  height: 36px;\n  padding: 0 12px;\n  font-size: 11px;\n}\n.fs-root .detail-summary > span:last-child {\n  margin-left: auto;\n  color: var(--text-faint);\n  font-family: var(--font-mono);\n}\n.fs-root .detail-result {\n  font-size: 12.5px;\n  line-height: 1.65;\n  margin-top: 10px;\n  border-top: 1px dashed var(--border-strong);\n  padding-top: 10px;\n}\n.fs-root .tool-body {\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n  flex: 1;\n  overflow: auto;\n}\n.fs-root .tool-summary {\n  font-size: 11px;\n  color: var(--text-faint);\n  padding: 9px 12px 6px;\n}\n.fs-root .file-input-bar {\n  display: flex;\n  gap: 6px;\n  padding: 0 10px 8px;\n}\n.fs-root .file-input-bar input {\n  flex: 1;\n  min-width: 0;\n  height: 28px;\n  padding: 0 9px;\n  border-radius: 7px;\n  border: 1px solid var(--border-strong);\n  background: var(--bg);\n  font: 11.5px var(--font-mono);\n}\n.fs-root .tool-footer {\n  margin-top: auto;\n  padding: 8px 13px;\n  color: var(--text-faint);\n  font-size: 11px;\n  border-top: 1px solid var(--border);\n}\n.fs-root .file-tree {\n  padding: 0 6px 8px;\n  overflow: auto;\n  flex: 1;\n}\n.fs-root .file-row {\n  display: flex;\n  align-items: center;\n  border: 1px solid transparent;\n  border-radius: 7px;\n}\n.fs-root .file-row:hover {\n  background: var(--hover);\n}\n.fs-root .file-row.selected {\n  background: var(--accent-soft);\n  border-color: var(--accent-border);\n}\n.fs-root .file-select {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  height: 29px;\n  text-align: left;\n  min-width: 0;\n  flex: 1;\n  padding-left: 7px;\n}\n.fs-root .file-select > span {\n  flex: 1;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  font: 11.5px var(--font-mono);\n}\n.fs-root .file-select .ic {\n  width: 13px;\n  height: 13px;\n  color: var(--k-file);\n}\n.fs-root .checkbox {\n  width: 13px;\n  height: 13px;\n  border: 1.5px solid var(--glyph);\n  border-radius: 4px;\n  flex: none;\n  display: grid;\n  place-items: center;\n  transition: background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);\n}\n.fs-root .file-row.selected .checkbox {\n  background: var(--accent);\n  border-color: var(--accent);\n}\n.fs-root .file-row.selected .checkbox::after {\n  content: \"\";\n  width: 6px;\n  height: 3px;\n  border-left: 1.5px solid var(--on-accent);\n  border-bottom: 1.5px solid var(--on-accent);\n  rotate: -45deg;\n  translate: 0 -1px;\n  animation: cv-mark-in var(--dur) var(--ease-spring) backwards;\n}\n.fs-root .file-row .icon-button {\n  width: 24px;\n  height: 24px;\n  opacity: 0;\n}\n.fs-root .file-row:hover .icon-button,\n.fs-root .file-row:focus-within .icon-button {\n  opacity: 1;\n}\n.fs-root .file-row .icon-button .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .board-columns {\n  display: flex;\n  gap: 6px;\n  flex: 1;\n  min-height: 0;\n  padding: 8px;\n}\n.fs-root .board-column {\n  background: var(--surface-2);\n  border-radius: 9px;\n  flex: 1;\n  min-width: 0;\n  padding: 6px;\n  overflow: auto;\n}\n.fs-root .board-column > header {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 24px;\n  padding: 0 3px;\n  font-size: 11px;\n  color: var(--text-3);\n}\n.fs-root .board-column > header > span {\n  margin-left: auto;\n  font: 10.5px var(--font-mono);\n  color: var(--text-faint);\n}\n.fs-root .board-column > header .icon-button {\n  width: 20px;\n  height: 20px;\n}\n.fs-root .board-column > header .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .column-dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--glyph);\n}\n.fs-root .column-1 {\n  background: var(--accent);\n}\n.fs-root .column-2 {\n  background: var(--green);\n}\n.fs-root .board-card {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: 7px;\n  padding: 7px 4px 2px 8px;\n  margin-top: 5px;\n  font-size: 12px;\n  animation: cv-mark-in var(--dur) var(--ease-out) backwards;\n}\n.fs-root .board-card:hover {\n  border-color: var(--border-float);\n  translate: 0 -1px;\n  box-shadow: 0 6px 14px -8px var(--shadow);\n}\n.fs-root .board-card > div {\n  display: flex;\n  justify-content: flex-end;\n  opacity: 0;\n  transition: opacity var(--dur-fast) var(--ease);\n}\n.fs-root .board-card:hover > div,\n.fs-root .board-card:focus-within > div {\n  opacity: 1;\n}\n.fs-root .board-card .icon-button {\n  width: 20px;\n  height: 20px;\n}\n.fs-root .board-card .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .board-card-text {\n  display: block;\n  text-align: left;\n  width: 100%;\n  font-size: 12px;\n  line-height: 1.55;\n}\n.fs-root .board-card.selected {\n  border-color: var(--accent);\n  background: var(--accent-soft);\n}\n.fs-root .color-violet {\n  --group-color: var(--accent);\n}\n.fs-root .color-teal {\n  --group-color: var(--teal);\n}\n.fs-root .color-blue {\n  --group-color: var(--blue);\n}\n.fs-root .color-amber {\n  --group-color: var(--amber);\n}\n.fs-root .workflow-group {\n  position: absolute;\n  border: 1.5px dashed color-mix(in srgb, var(--group-color) 50%, transparent);\n  border-radius: var(--r-12);\n  background:\n    linear-gradient(\n      180deg,\n      color-mix(in srgb, var(--group-color) 8%, transparent),\n      color-mix(in srgb, var(--group-color) 2.5%, transparent) 120px);\n  pointer-events: none;\n  animation: var(--motion-fade);\n  transition:\n    width var(--dur-slow) var(--ease-out),\n    height var(--dur-slow) var(--ease-out),\n    border-color var(--dur) var(--ease),\n    box-shadow var(--dur) var(--ease);\n}\n.fs-root .workflow-group.selected {\n  border-color: var(--group-color);\n  box-shadow: 0 0 0 4px color-mix(in srgb, var(--group-color) 12%, transparent);\n}\n.fs-root .group-header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 0 8px 0 14px;\n  height: 42px;\n  color: var(--text-2);\n  pointer-events: auto;\n  cursor: grab;\n}\n.fs-root .group-mark {\n  width: 10px;\n  height: 10px;\n  border-radius: 3px;\n  background: var(--group-color);\n  box-shadow: 0 0 10px color-mix(in srgb, var(--group-color) calc(80% * var(--glow)), transparent);\n  flex: none;\n}\n.fs-root .group-header > strong {\n  font: 600 13px var(--font-display);\n  color: var(--text);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fs-root .group-header > span {\n  color: var(--text-faint);\n  font-size: 11px;\n}\n.fs-root .group-header > div {\n  margin-left: auto;\n  display: flex;\n  gap: 2px;\n  align-items: center;\n  flex: none;\n}\n.fs-root .group-header .icon-button {\n  width: 24px;\n  height: 24px;\n}\n.fs-root .group-header .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .group-run {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 0 10px 0 8px;\n  height: 24px;\n  margin-right: 4px;\n  border-radius: var(--r-full);\n  color: var(--group-color);\n  background: color-mix(in srgb, var(--group-color) 12%, transparent);\n  font-size: 11.5px;\n  font-weight: 600;\n}\n.fs-root .group-run:hover {\n  background: color-mix(in srgb, var(--group-color) 22%, transparent);\n}\n.fs-root .group-resizer {\n  pointer-events: auto;\n  right: 6px;\n  bottom: 6px;\n}\n.fs-root .nested-group {\n  border-style: dotted;\n  border-color: color-mix(in srgb, var(--group-color) 40%, var(--border-strong));\n  background: color-mix(in srgb, var(--group-color) 3%, transparent);\n}\n.fs-root .semantic-zoom .group-header > strong {\n  font-size: calc(13px * var(--type-scale, 1));\n}\n.fs-root .semantic-zoom .group-header > span,\n.fs-root .semantic-zoom .group-header > div {\n  display: none;\n}\n.fs-root .workflow-group.composite {\n  border-style: solid;\n  border-color: color-mix(in srgb, var(--group-color) 55%, var(--border-strong));\n  background:\n    linear-gradient(\n      180deg,\n      color-mix(in srgb, var(--group-color) 10%, var(--surface)),\n      var(--surface) 70px);\n  pointer-events: auto;\n  box-shadow: 0 14px 30px -18px color-mix(in srgb, var(--group-color) calc(60% * var(--glow)), transparent);\n}\n.fs-root .composite .group-header {\n  height: 46px;\n  border-bottom: 1px solid var(--border);\n}\n.fs-root .composite .group-header > span {\n  display: none;\n}\n.fs-root .composite .group-header > strong {\n  flex: 1;\n}\n.fs-root .composite-ports {\n  display: flex;\n  gap: 14px;\n  padding: 18px 12px 12px;\n}\n.fs-root .composite-ports > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .composite-port-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 28px;\n  width: 100%;\n  position: relative;\n  color: var(--text-3);\n  font-size: 11.5px;\n}\n.fs-root .composite-port-row:hover {\n  color: var(--text);\n}\n.fs-root .composite-port-row > span {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n.fs-root .composite-out {\n  flex-direction: row-reverse;\n  text-align: right;\n}\n.fs-root .composite-summary {\n  display: flex;\n  justify-content: space-between;\n  color: var(--text-faint);\n  font-size: 10.5px;\n  position: absolute;\n  left: 12px;\n  right: 12px;\n  bottom: 8px;\n}\n.fs-root .proxy-pin {\n  width: 10px;\n  height: 10px;\n  border: 1.75px solid var(--accent);\n  background: var(--surface);\n  border-radius: 50%;\n  flex: none;\n  transition: scale var(--dur) var(--ease-spring);\n}\n.fs-root .proxy-continuation {\n  border: 0;\n  background: var(--text-2);\n  clip-path: polygon(0 8%, 52% 8%, 100% 50%, 52% 92%, 0 92%, 26% 50%);\n  width: 12px;\n  height: 12px;\n  border-radius: 0;\n}\n.fs-root .composite-port-row:hover .proxy-pin {\n  scale: 1.4;\n}\n.fs-root .composite-in .proxy-pin {\n  position: absolute;\n  left: -18px;\n}\n.fs-root .composite-out .proxy-pin {\n  position: absolute;\n  right: -18px;\n}\n.fs-root .template-association {\n  position: absolute;\n  bottom: -24px;\n  left: 14px;\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  height: 20px;\n  padding: 0 8px;\n  border-radius: var(--r-full);\n  color: var(--text-faint);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  font-size: 10.5px;\n  pointer-events: auto;\n}\n.fs-root .template-association:hover {\n  color: var(--accent);\n  border-color: var(--accent-border);\n}\n.fs-root .template-association .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .floating-window {\n  pointer-events: auto;\n  min-width: 288px;\n  min-height: 260px;\n  border-radius: 14px;\n  border-color: var(--border-float);\n  box-shadow:\n    0 30px 70px -18px var(--shadow),\n    0 8px 20px -8px var(--shadow),\n    0 0 0 1px var(--glass-border);\n  animation: var(--motion-sheet);\n}\n.fs-root .floating-window .node-header {\n  background: var(--surface-2);\n  border-radius: 13px 13px 0 0;\n}\n.fs-root .floating-window > .window-resizer {\n  opacity: 0.7;\n}\n.fs-root .window-stub {\n  position: absolute;\n  border: 1.5px dashed var(--border-strong);\n  border-radius: var(--r-8);\n  padding: 12px 13px;\n  color: var(--text-faint);\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  background:\n    repeating-linear-gradient(\n      135deg,\n      transparent 0 8px,\n      var(--hover) 8px 9px);\n}\n.fs-root .window-stub > span {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  font-size: 12.5px;\n}\n.fs-root .window-stub .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .window-stub strong {\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n.fs-root .fs-conversation-surface {\n  position: absolute;\n  inset: 0;\n  overflow: auto;\n  background: var(--bg);\n  z-index: 16;\n  display: flex;\n  flex-direction: column;\n  --enter-x: calc(var(--shift-lg) * -1);\n  animation: omp-enter var(--dur-slower) var(--ease-nav) backwards;\n}\n.fs-root .conversation-heading {\n  min-height: 54px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  max-width: 860px;\n  width: 100%;\n  padding: 0 22px;\n  margin: 0 auto;\n}\n.fs-root .conversation-heading > span {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n  font: 600 15px var(--font-display);\n}\n.fs-root .conversation-heading > span .ic {\n  color: var(--accent);\n  width: 16px;\n  height: 16px;\n}\n.fs-root .conversation-node-host {\n  flex: 1;\n  min-height: 0;\n  padding: 0 22px 20px;\n  max-width: 860px;\n  width: 100%;\n  margin: 0 auto;\n  display: flex;\n}\n.fs-root .node.conversation-agent {\n  position: relative;\n  width: 100%;\n  min-height: 360px;\n  flex: 1;\n  border-radius: var(--r-10);\n  border-style: solid;\n}\n.fs-root .conversation-agent::after {\n  display: none;\n}\n.fs-root .conversation-agent .node-header,\n.fs-root .conversation-agent .port {\n  display: none;\n}\n.fs-root .conversation-agent .node-tabs {\n  height: 32px;\n  margin: 0 20px 10px;\n  max-width: 320px;\n}\n.fs-root .conversation-agent .agent-status-row {\n  padding: 0 20px;\n  height: 46px;\n}\n.fs-root .conversation-agent .node-scroll {\n  padding: 12px 20px 20px;\n}\n.fs-root .conversation-agent .agent-footer {\n  padding: 0 20px;\n  height: 52px;\n}\n\n/* packages/flowspace/src/client/styles/wires.css */\n.fs-root .edge-path {\n  fill: none;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n  stroke: var(--text-3);\n  transition:\n    stroke var(--dur-fast) var(--ease),\n    opacity var(--dur-fast) var(--ease),\n    stroke-width var(--dur-fast) var(--ease);\n}\n.fs-root .edge-flow {\n  display: none;\n  pointer-events: none;\n}\n.fs-root .edge-display {\n  stroke: var(--k-display);\n  stroke-width: 1.3;\n  stroke-dasharray: 1.5 4;\n  opacity: 0.75;\n}\n.fs-root .edge-reference {\n  stroke: var(--accent);\n  stroke-width: 1.6;\n  stroke-dasharray: 5 4;\n  opacity: 0.9;\n}\n.fs-root .edge-reference.edge-state-sent {\n  stroke: var(--glyph);\n  opacity: 0.55;\n}\n.fs-root .edge-reference.edge-state-updated {\n  stroke: var(--green);\n  opacity: 1;\n}\n.fs-root .edge-reference.edge-state-pending.edge-flow {\n  display: block;\n  stroke: var(--accent);\n  stroke-width: 3;\n  stroke-dasharray: 0.1 26;\n  opacity: 1;\n  filter: drop-shadow(0 0 3px var(--accent));\n  animation: cv-flow var(--loop-drift) linear infinite;\n}\n.fs-root .edge-reference.edge-state-updated.edge-flow {\n  display: block;\n  stroke: var(--green);\n  stroke-width: 3;\n  stroke-dasharray: 0.1 26;\n  opacity: 1;\n  filter: drop-shadow(0 0 3px var(--green));\n  animation: cv-flow var(--loop-pulse) linear infinite;\n}\n.fs-root .edge-continuation {\n  stroke-width: 2.8;\n  stroke: var(--text-2);\n}\n.fs-root .edge-continuation.trigger-confirm {\n  stroke-dasharray: 14 7;\n}\n.fs-root .edge-continuation.trigger-off {\n  stroke-dasharray: 0.1 7;\n  opacity: 0.6;\n}\n.fs-root .edge-continuation.edge-state-active {\n  stroke: color-mix(in srgb, var(--accent) 45%, transparent);\n  stroke-dasharray: none;\n  opacity: 1;\n}\n.fs-root .edge-continuation.edge-state-active.edge-flow {\n  display: block;\n  stroke: var(--accent);\n  stroke-width: 3.4;\n  stroke-dasharray: 14 34;\n  filter: drop-shadow(0 0 5px var(--accent));\n  animation: cv-flow var(--loop-spin) linear infinite;\n}\n.fs-root .edge-continuation.edge-state-ready,\n.fs-root .edge-continuation.edge-state-queued {\n  stroke: var(--accent);\n  opacity: 1;\n}\n.fs-root .edge-continuation.edge-state-queued.edge-flow {\n  display: block;\n  stroke: var(--accent);\n  stroke-width: 4.5;\n  stroke-dasharray: 0.1 12;\n  animation: cv-flow var(--loop-drift) linear infinite;\n}\n.fs-root .edge-continuation.edge-state-waiting,\n.fs-root .edge-continuation.edge-state-boundary {\n  stroke: var(--amber);\n  opacity: 1;\n}\n.fs-root .edge-continuation.edge-state-waiting.edge-flow,\n.fs-root .edge-continuation.edge-state-boundary.edge-flow {\n  display: block;\n  stroke: var(--amber);\n  stroke-width: 7;\n  stroke-dasharray: none;\n  opacity: 0.22;\n  animation: omp-pulse var(--loop-drift) var(--ease-loop) infinite;\n}\n.fs-root .edge-continuation.edge-state-done {\n  stroke: var(--green);\n  opacity: 1;\n}\n.fs-root .edge-message {\n  stroke-width: 1.5;\n  opacity: 0.66;\n}\n.fs-root .message-out {\n  stroke: var(--m-f);\n}\n.fs-root .message-back {\n  stroke: var(--m-b);\n}\n.fs-root .edge-dim {\n  opacity: 0.16;\n}\n.fs-root .edge-selected.edge-reference {\n  stroke-width: 2.8;\n}\n.fs-root .edge-selected.edge-continuation {\n  stroke-width: 4.2;\n}\n.fs-root .edge-hit {\n  fill: none;\n  stroke: transparent;\n  stroke-width: 18px;\n  cursor: pointer;\n  pointer-events: stroke;\n}\n.fs-root .temporary-edge {\n  stroke-dasharray: 6 5;\n  animation: cv-flow var(--loop-spin) linear infinite;\n  filter: drop-shadow(0 0 4px var(--accent));\n}\n.fs-root .temporary-edge.edge-reference {\n  stroke: var(--accent);\n  stroke-width: 1.8;\n  opacity: 1;\n}\n.fs-root .temporary-edge.edge-continuation {\n  stroke: var(--text);\n  stroke-width: 2.8;\n}\n.fs-root .connecting .edge-tag,\n.fs-root .connecting .exchange-tag {\n  pointer-events: none;\n}\n.fs-root .edge-tag,\n.fs-root .exchange-tag {\n  position: absolute;\n  translate: -50% -50%;\n  display: inline-flex;\n  align-items: center;\n  height: 24px;\n  background: var(--surface);\n  border: 1px solid var(--border-strong);\n  border-radius: var(--r-full);\n  color: var(--text-2);\n  animation: cv-mark-in var(--dur) var(--ease-out) backwards;\n  transition:\n    border-color var(--dur-fast) var(--ease),\n    box-shadow var(--dur-fast) var(--ease),\n    opacity var(--dur-fast) var(--ease);\n}\n.fs-root .edge-tag:hover,\n.fs-root .exchange-tag:hover {\n  border-color: var(--text-3);\n  color: var(--text);\n  z-index: 5;\n}\n.fs-root .edge-tag > button,\n.fs-root .exchange-tag > button {\n  display: flex;\n  gap: 5px;\n  align-items: center;\n  height: 22px;\n  padding: 0 8px;\n  white-space: nowrap;\n  font-size: 11px;\n  border-radius: var(--r-full);\n}\n.fs-root .edge-tag .ic,\n.fs-root .exchange-tag .ic {\n  width: 12px;\n  height: 12px;\n}\n.fs-root .edge-tag small {\n  font: 600 10px var(--font-mono);\n  color: var(--text-faint);\n}\n.fs-root .edge-tag .trigger-indicator {\n  font-style: normal;\n  display: grid;\n  place-items: center;\n  color: var(--text-faint);\n  border-left: 1px solid var(--border-strong);\n  padding-left: 5px;\n  height: 12px;\n}\n.fs-root .edge-tag .trigger-indicator .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .edge-tag.reference {\n  color: var(--accent);\n  border-color: var(--accent-border);\n}\n.fs-root .edge-tag.reference.edge-state-sent {\n  color: var(--text-faint);\n  border-color: var(--border-strong);\n  border-style: dashed;\n}\n.fs-root .edge-tag.reference.edge-state-updated {\n  color: var(--green);\n  border-color: var(--green);\n}\n.fs-root .tight-tag:not(:hover):not(.selected) > button > span,\n.fs-root .tight-tag:not(:hover):not(.selected) > button > small {\n  display: none;\n}\n.fs-root .edge-tag.edge-dim {\n  opacity: 0.25;\n}\n.fs-root .edge-tag.selected {\n  border-color: var(--accent);\n  box-shadow: 0 0 0 3px var(--accent-soft);\n}\n.fs-root .edge-tag.continuation.edge-state-active,\n.fs-root .edge-tag.continuation.edge-state-ready,\n.fs-root .edge-tag.continuation.edge-state-queued {\n  border-color: var(--accent);\n  color: var(--accent);\n  box-shadow: 0 0 14px -2px color-mix(in srgb, var(--accent) calc(70% * var(--glow)), transparent);\n}\n.fs-root .edge-tag.continuation.edge-state-done {\n  border-color: var(--green);\n  color: var(--green);\n}\n.fs-root .edge-tag.edge-state-waiting,\n.fs-root .edge-tag.edge-state-boundary {\n  height: 28px;\n  padding-right: 3px;\n  border-color: var(--amber);\n  color: var(--amber);\n  background: color-mix(in srgb, var(--amber) 10%, var(--surface));\n  --ring: var(--amber-soft);\n  animation: cv-breathe var(--loop-drift) var(--ease-loop) infinite;\n}\n.fs-root .edge-tag .edge-release {\n  background: var(--amber);\n  color: var(--surface);\n  height: 22px;\n  padding: 0 10px 0 8px;\n  font-weight: 600;\n  box-shadow: 0 4px 12px -4px var(--amber);\n}\n.fs-root .edge-tag .edge-release:hover {\n  filter: brightness(1.08);\n}\n.fs-root .exchange-tag {\n  border-color: color-mix(in srgb, var(--m-f) 34%, var(--border-strong));\n  font-variant-numeric: tabular-nums;\n}\n.fs-root .exchange-tag.side {\n  translate: 0 -50%;\n}\n.fs-root .exchange-tag > button {\n  gap: 6px;\n}\n.fs-root .exchange-tag .ic {\n  color: var(--text-3);\n}\n.fs-root .mc {\n  font-style: normal;\n  font-weight: 700;\n  font-size: 11px;\n}\n.fs-root .mc.f {\n  color: var(--m-f);\n}\n.fs-root .mc.b {\n  color: var(--m-b);\n}\n.fs-root .exchange-tag em {\n  font-style: normal;\n  max-width: 150px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  color: var(--text-2);\n  padding-left: 7px;\n  border-left: 2px solid var(--m-f);\n}\n.fs-root .semantic-zoom .exchange-tag em,\n.fs-root .semantic-zoom .edge-tag:not(.edge-state-waiting):not(.edge-state-boundary) {\n  display: none;\n}\n.fs-root .waypoint {\n  position: absolute;\n  translate: -50% -50%;\n  rotate: 45deg;\n  width: 11px;\n  height: 11px;\n  border: 1.75px solid var(--accent);\n  border-radius: 3px;\n  background: var(--surface);\n  cursor: move;\n  animation: cv-mark-in var(--dur) var(--ease-spring) backwards;\n  transition: scale var(--dur) var(--ease-spring), background-color var(--dur-fast) var(--ease);\n}\n.fs-root .waypoint:hover {\n  scale: 1.35;\n  background: var(--accent);\n}\n.fs-root .waypoint::before {\n  content: \"\";\n  position: absolute;\n  inset: -7px;\n}\n\n/* packages/flowspace/src/client/styles/surfaces.css */\n.fs-root .fs-surface {\n  position: absolute;\n  inset: 0;\n  background: var(--bg);\n  overflow-y: auto;\n  z-index: 16;\n}\n.fs-root .fs-surface::before {\n  content: \"\";\n  position: sticky;\n  display: block;\n  top: 0;\n  height: 0;\n  pointer-events: none;\n  box-shadow: 220px 60px 260px 120px var(--aurora-a), 680px 40px 240px 100px var(--aurora-b);\n}\n.fs-root .surface-page {\n  position: relative;\n  max-width: 980px;\n  margin: 0 auto;\n  padding: 40px 40px 70px;\n  --enter-x: var(--shift-lg);\n  animation: omp-enter var(--dur-slower) var(--ease-nav) backwards;\n}\n.fs-root .surface-page-header {\n  margin-bottom: 24px;\n}\n.fs-root .surface-page-header h1 {\n  font: 650 30px/1.2 var(--font-display);\n  letter-spacing: -0.8px;\n  margin: 10px 0 10px;\n  background:\n    linear-gradient(\n      100deg,\n      var(--text) 30%,\n      color-mix(in srgb, var(--text) 50%, var(--accent)));\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n}\n.fs-root .surface-page-header p {\n  font-size: 13.5px;\n  color: var(--text-3);\n  margin: 0;\n  max-width: 600px;\n  line-height: 1.7;\n}\n.fs-root .surface-tabs {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n  padding: 3px;\n  margin-bottom: 18px;\n  border-radius: 11px;\n  background: var(--surface-2);\n  box-shadow: inset 0 0 0 1px var(--border);\n}\n.fs-root .surface-tabs button {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  height: 30px;\n  padding: 0 14px;\n  border-radius: 8px;\n  font-size: 12.5px;\n  color: var(--text-3);\n}\n.fs-root .surface-tabs button:hover {\n  color: var(--text);\n}\n.fs-root .surface-tabs button[aria-selected=true],\n.fs-root .surface-tabs button.selected {\n  color: var(--text);\n  font-weight: 600;\n  background: var(--surface);\n  box-shadow: 0 0 0 1px var(--border-strong), 0 2px 6px var(--shadow);\n}\n.fs-root .surface-tabs button > span {\n  font: 600 10px var(--font-mono);\n  color: var(--text-faint);\n  padding: 0 6px;\n  border-radius: var(--r-full);\n  background: var(--surface-3);\n}\n.fs-root .surface-empty {\n  text-align: center;\n  padding: 56px 20px;\n  color: var(--text-3);\n  grid-column: 1 / -1;\n  border: 1.5px dashed var(--border-strong);\n  border-radius: var(--r-10);\n}\n.fs-root .surface-empty > .ic {\n  width: 26px;\n  height: 26px;\n  padding: 9px;\n  box-sizing: content-box;\n  border-radius: 14px;\n  background: var(--surface-2);\n  color: var(--glyph);\n}\n.fs-root .surface-empty h3 {\n  font-size: 15px;\n  color: var(--text);\n  font-weight: 600;\n  margin: 14px 0 6px;\n}\n.fs-root .surface-empty p {\n  font-size: 12.5px;\n  margin: 0 0 18px;\n}\n.fs-root .template-list {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 14px;\n}\n.fs-root .template-card,\n.fs-root .snapshot-card {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--r-10);\n  background: var(--surface);\n  overflow: hidden;\n  animation: var(--motion-reveal);\n  animation-delay: calc(var(--i, 0) * var(--stagger));\n  transition:\n    border-color var(--dur-fast) var(--ease),\n    translate var(--dur) var(--ease-out),\n    box-shadow var(--dur) var(--ease);\n}\n.fs-root .template-card:hover,\n.fs-root .snapshot-card:hover {\n  border-color: var(--accent-border);\n  translate: 0 -3px;\n  box-shadow: 0 22px 40px -22px color-mix(in srgb, var(--accent) calc(70% * var(--glow)), transparent), 0 8px 18px -10px var(--shadow);\n}\n.fs-root .template-graph {\n  height: 132px;\n  border-bottom: 1px solid var(--border);\n  background-color: var(--canvas);\n  background-image: radial-gradient(rgb(var(--grid-rgb) / 0.14) 1px, transparent 1.3px);\n  background-size: 14px 14px;\n  display: grid;\n  place-items: center;\n  overflow: hidden;\n}\n.fs-root .mini-graph {\n  width: 100%;\n  height: 100%;\n  display: block;\n}\n.fs-root .mg-node {\n  fill: var(--surface);\n  stroke: var(--border-float);\n  stroke-width: 1.2;\n}\n.fs-root .mg-node.mg-agent {\n  stroke: var(--accent);\n  stroke-dasharray: 3 2.4;\n}\n.fs-root .mg-node.mg-done,\n.fs-root .mg-node.mg-running {\n  stroke: var(--green);\n  stroke-dasharray: none;\n}\n.fs-root .mg-node.mg-waiting,\n.fs-root .mg-node.mg-paused {\n  stroke: var(--amber);\n  stroke-dasharray: none;\n}\n.fs-root .mg-node.mg-other {\n  stroke: var(--glyph);\n}\n.fs-root .mg-dot {\n  fill: var(--accent);\n}\n.fs-root .mg-dot.mg-done,\n.fs-root .mg-dot.mg-running {\n  fill: var(--green);\n}\n.fs-root .mg-dot.mg-waiting {\n  fill: var(--amber);\n}\n.fs-root .mg-dot.mg-other {\n  fill: var(--glyph);\n}\n.fs-root .mg-bar {\n  fill: var(--surface-3);\n}\n.fs-root .mg-flow {\n  fill: none;\n  stroke: var(--text-3);\n  stroke-width: 1.8;\n  stroke-linecap: round;\n}\n.fs-root .mg-flow.mg-confirm {\n  stroke-dasharray: 6 4;\n}\n.fs-root .mg-ref {\n  fill: none;\n  stroke: var(--accent);\n  stroke-width: 1.1;\n  stroke-dasharray: 3 3;\n  stroke-linecap: round;\n  opacity: 0.8;\n}\n.fs-root .template-card:hover .mg-flow {\n  stroke: var(--accent);\n  stroke-dasharray: 6 6;\n  animation: cv-flow var(--loop-spin) linear infinite;\n}\n.fs-root .template-text {\n  flex: 1;\n  min-width: 0;\n  padding: 14px 16px 4px;\n}\n.fs-root .template-text h3 {\n  font: 600 15px/1.35 var(--font-display);\n  margin: 0 0 5px;\n}\n.fs-root .template-text p {\n  font-size: 12.5px;\n  color: var(--text-3);\n  margin: 0;\n  line-height: 1.65;\n}\n.fs-root .template-meta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 5px;\n  margin-top: 10px;\n}\n.fs-root .template-meta span {\n  font-size: 10.5px;\n  color: var(--text-3);\n  padding: 1px 8px;\n  border-radius: var(--r-full);\n  background: var(--surface-2);\n}\n.fs-root .template-meta span.warn {\n  color: var(--amber);\n  background: var(--amber-soft);\n}\n.fs-root .template-meta span.bad {\n  color: var(--red);\n  background: var(--red-soft);\n}\n.fs-root .template-actions {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  padding: 12px 16px 16px;\n}\n.fs-root .template-actions .button {\n  flex: 1;\n}\n.fs-root .snapshot-recent {\n  margin: 8px 0 0;\n  padding: 0;\n  list-style: none;\n  font-size: 11.5px;\n  color: var(--text-3);\n  line-height: 1.7;\n}\n.fs-root .snapshot-recent li {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fs-root .snapshot-recent .ic {\n  width: 11px;\n  height: 11px;\n  color: var(--accent);\n  flex: none;\n}\n.fs-root .activity-list {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.fs-root .run-card {\n  border: 1px solid var(--border-strong);\n  border-radius: var(--r-10);\n  background: var(--surface);\n  overflow: hidden;\n  --rc: var(--text-3);\n  animation: var(--motion-reveal);\n  animation-delay: calc(var(--i, 0) * var(--stagger));\n}\n.fs-root .run-card.run-running {\n  --rc: var(--green);\n  border-color: color-mix(in srgb, var(--green) 40%, var(--border-strong));\n  box-shadow: 0 0 34px -14px color-mix(in srgb, var(--green) calc(70% * var(--glow)), transparent);\n}\n.fs-root .run-card.run-waiting,\n.fs-root .run-card.run-paused {\n  --rc: var(--amber);\n  border-color: var(--amber);\n}\n.fs-root .run-card.run-completed,\n.fs-root .run-card.run-done {\n  --rc: var(--green);\n}\n.fs-root .run-card.run-error,\n.fs-root .run-card.run-cancelled,\n.fs-root .run-card.run-interrupted {\n  --rc: var(--red);\n}\n.fs-root .run-head {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  padding: 14px 16px;\n}\n.fs-root .run-ring {\n  width: 42px;\n  height: 42px;\n  flex: none;\n  rotate: -90deg;\n}\n.fs-root .run-ring circle {\n  fill: none;\n  stroke-width: 3.5;\n  stroke-linecap: round;\n}\n.fs-root .run-ring .ring-track {\n  stroke: var(--surface-3);\n}\n.fs-root .run-ring .ring-value {\n  stroke: var(--rc);\n  transition: stroke-dashoffset var(--dur-hero) var(--ease-out);\n  filter: drop-shadow(0 0 3px var(--rc));\n}\n.fs-root .run-ring-wrap {\n  position: relative;\n  flex: none;\n  display: grid;\n  place-items: center;\n}\n.fs-root .run-ring-wrap > b {\n  position: absolute;\n  font: 700 11px var(--font-mono);\n  color: var(--rc);\n}\n.fs-root .run-head-title {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .run-head h3 {\n  font: 600 15px/1.35 var(--font-display);\n  margin: 0;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fs-root .run-head p {\n  margin: 3px 0 0;\n  font-size: 11.5px;\n  color: var(--text-faint);\n}\n.fs-root .run-head time {\n  font: 11px var(--font-mono);\n  color: var(--text-faint);\n}\n.fs-root .run-head-actions {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.fs-root .run-steps {\n  display: flex;\n  align-items: stretch;\n  gap: 0;\n  padding: 0 16px 14px;\n  overflow-x: auto;\n}\n.fs-root .run-step {\n  position: relative;\n  flex: 1;\n  min-width: 120px;\n  padding: 9px 12px 9px 0;\n  text-align: left;\n  --sc: var(--glyph);\n}\n.fs-root .run-step::before {\n  content: \"\";\n  position: absolute;\n  left: 5px;\n  right: 0;\n  top: 14px;\n  height: 2px;\n  border-radius: 2px;\n  background: var(--surface-3);\n}\n.fs-root .run-step:last-child::before {\n  display: none;\n}\n.fs-root .run-step > i {\n  position: relative;\n  display: block;\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  background: var(--surface);\n  border: 2px solid var(--sc);\n  margin-bottom: 8px;\n  z-index: 1;\n}\n.fs-root .run-step > b {\n  display: block;\n  font-size: 12.5px;\n  font-weight: 600;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fs-root .run-step > small {\n  display: block;\n  font-size: 11px;\n  color: var(--sc);\n  margin-top: 1px;\n}\n.fs-root .run-step:hover > b {\n  color: var(--accent);\n}\n.fs-root .step-completed,\n.fs-root .step-done {\n  --sc: var(--green);\n}\n.fs-root .step-completed > i,\n.fs-root .step-done > i {\n  background: var(--green);\n}\n.fs-root .step-completed::before,\n.fs-root .step-done::before {\n  background: var(--green);\n}\n.fs-root .step-running {\n  --sc: var(--green);\n}\n.fs-root .step-running > i {\n  animation: omp-pulse var(--loop-pulse) var(--ease-loop) infinite;\n  box-shadow: 0 0 0 4px var(--green-soft);\n}\n.fs-root .step-running::before {\n  background:\n    linear-gradient(\n      90deg,\n      var(--green),\n      var(--surface-3)) 0 0 / 200% 100%;\n  animation: cv-shimmer 2s linear infinite;\n}\n.fs-root .step-waiting {\n  --sc: var(--amber);\n}\n.fs-root .step-waiting > i {\n  box-shadow: 0 0 0 4px var(--amber-soft);\n}\n.fs-root .step-queued {\n  --sc: var(--accent);\n}\n.fs-root .step-error,\n.fs-root .step-aborted,\n.fs-root .step-interrupted,\n.fs-root .step-stopped {\n  --sc: var(--red);\n}\n.fs-root .step-error > i,\n.fs-root .step-aborted > i,\n.fs-root .step-interrupted > i {\n  background: var(--red);\n}\n.fs-root .step-pending > small {\n  color: var(--text-faint);\n}\n.fs-root .run-foot {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 16px;\n  border-top: 1px solid var(--border);\n  background: var(--surface-2);\n}\n.fs-root .run-blocker {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n  min-width: 220px;\n  font-size: 12px;\n  color: var(--amber);\n}\n.fs-root .run-blocker .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .run-blocker .button {\n  min-height: 26px;\n  font-size: 11.5px;\n  margin-left: 4px;\n}\n.fs-root .run-next {\n  flex: 1;\n  min-width: 160px;\n  font-size: 12px;\n  color: var(--text-3);\n}\n.fs-root .run-timeline {\n  border-top: 1px solid var(--border);\n}\n.fs-root .run-timeline > summary {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 34px;\n  padding: 0 16px;\n  font-size: 11.5px;\n  color: var(--text-faint);\n  cursor: pointer;\n  list-style: none;\n}\n.fs-root .run-timeline > summary::-webkit-details-marker {\n  display: none;\n}\n.fs-root .run-timeline > summary:hover {\n  color: var(--text);\n}\n.fs-root .run-timeline > summary .ic {\n  width: 11px;\n  height: 11px;\n  transition: rotate var(--dur) var(--ease-out);\n}\n.fs-root .run-timeline[open] > summary .ic {\n  rotate: 90deg;\n}\n.fs-root .run-timeline > div {\n  padding: 0 16px 10px;\n}\n.fs-root .event-row {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  min-height: 38px;\n  padding: 7px 0;\n  border-bottom: 1px solid var(--border);\n}\n.fs-root .event-row:last-child {\n  border-bottom: 0;\n}\n.fs-root .event-dot {\n  display: grid;\n  place-items: center;\n  width: 22px;\n  height: 22px;\n  border-radius: 50%;\n  color: var(--text-faint);\n  background: var(--surface-2);\n  flex: none;\n}\n.fs-root .event-dot .ic {\n  width: 11px;\n  height: 11px;\n}\n.fs-root .event-row > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .event-row b {\n  font-size: 12.5px;\n  font-weight: 500;\n}\n.fs-root .event-row time {\n  font: 10.5px var(--font-mono);\n  color: var(--text-faint);\n  padding-top: 3px;\n}\n.fs-root .event-agent {\n  display: inline-block;\n  font-size: 11.5px;\n  color: var(--text-faint);\n  margin-left: 6px;\n}\n.fs-root .event-agent:hover {\n  color: var(--accent);\n}\n.fs-root .event-row p {\n  margin: 3px 0 0;\n  font-size: 11.5px;\n  color: var(--text-3);\n  line-height: 1.55;\n}\n.fs-root .event-completed .event-dot {\n  color: var(--green);\n  background: var(--green-soft);\n}\n.fs-root .event-waiting .event-dot,\n.fs-root .event-queued .event-dot {\n  color: var(--amber);\n  background: var(--amber-soft);\n}\n.fs-root .event-error .event-dot,\n.fs-root .event-aborted .event-dot,\n.fs-root .event-interrupted .event-dot {\n  color: var(--red);\n  background: var(--red-soft);\n}\n.fs-root .event-running .event-dot {\n  color: var(--accent);\n  background: var(--accent-soft);\n}\n.fs-root .artifact-row,\n.fs-root .queue-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 16px;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--r-8);\n  background: var(--surface);\n  animation: var(--motion-reveal);\n}\n.fs-root .artifact-row > .ic,\n.fs-root .queue-row > .ic {\n  color: var(--accent);\n  width: 18px;\n  height: 18px;\n}\n.fs-root .queue-row > .ic {\n  color: var(--amber);\n}\n.fs-root .artifact-row > div,\n.fs-root .queue-row > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .artifact-row b,\n.fs-root .queue-row b {\n  font-size: 13px;\n  font-weight: 600;\n}\n.fs-root .artifact-row small,\n.fs-root .queue-row p {\n  display: block;\n  color: var(--text-3);\n  font-size: 12px;\n  margin: 3px 0 0;\n  line-height: 1.5;\n}\n.fs-root .settings-page {\n  max-width: 760px;\n}\n.fs-root .settings-section {\n  margin: 0 0 18px;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--r-10);\n  background: var(--surface);\n  padding: 6px 18px;\n  animation: var(--motion-reveal);\n}\n.fs-root .settings-section h2 {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  color: var(--text-faint);\n  margin: 12px 0 2px;\n  text-transform: uppercase;\n}\n.fs-root .setting-row {\n  display: flex;\n  align-items: center;\n  gap: 24px;\n  justify-content: space-between;\n  padding: 13px 0;\n  border-bottom: 1px solid var(--border);\n}\n.fs-root .setting-row:last-child {\n  border-bottom: 0;\n}\n.fs-root .setting-row b {\n  font-size: 13px;\n  font-weight: 500;\n}\n.fs-root .setting-row p {\n  color: var(--text-faint);\n  font-size: 12px;\n  line-height: 1.6;\n  max-width: 440px;\n  margin: 3px 0 0;\n}\n.fs-root .setting-row .choice-buttons {\n  min-width: 196px;\n}\n.fs-root .fs-menu {\n  position: fixed;\n  z-index: 95;\n  min-width: 220px;\n  max-width: 330px;\n  max-height: calc(100svh - 24px);\n  overflow-y: auto;\n  padding: 5px;\n  border: 1px solid var(--glass-border);\n  border-radius: 12px;\n  background: var(--glass);\n  backdrop-filter: blur(20px) saturate(1.6);\n  -webkit-backdrop-filter: blur(20px) saturate(1.6);\n  box-shadow: var(--float-shadow);\n  animation: var(--motion-pop);\n}\n.fs-root .fs-menu > button {\n  display: flex;\n  align-items: flex-start;\n  gap: 9px;\n  width: 100%;\n  padding: 7px 9px;\n  border-radius: 8px;\n  text-align: left;\n  color: var(--text);\n  font-size: 12.5px;\n  animation: var(--motion-fade);\n}\n.fs-root .fs-menu > button:not(:disabled):hover,\n.fs-root .fs-menu > button:focus-visible {\n  background: var(--accent-soft);\n  outline: none;\n}\n.fs-root .fs-menu > button > span:nth-child(2) {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .fs-menu .menu-icon {\n  width: 15px;\n  color: var(--text-3);\n  margin-top: 1px;\n}\n.fs-root .fs-menu > button:not(:disabled):hover .menu-icon {\n  color: var(--accent);\n}\n.fs-root .fs-menu .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .fs-menu > button > .ic {\n  color: var(--accent);\n}\n.fs-root .fs-menu small {\n  display: block;\n  color: var(--text-faint);\n  font-size: 11px;\n  line-height: 1.5;\n  margin-top: 2px;\n}\n.fs-root .fs-menu > small {\n  padding: 6px 9px 3px;\n  font-size: 10.5px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n}\n.fs-root .fs-menu hr {\n  border: 0;\n  border-top: 1px solid var(--border);\n  margin: 4px 2px;\n}\n.fs-root .fs-dialog-host {\n  position: fixed;\n  inset: 0;\n  z-index: 100;\n  display: grid;\n  place-items: center;\n  background: color-mix(in srgb, var(--canvas) 58%, transparent);\n  padding: 24px;\n  backdrop-filter: blur(8px) saturate(1.2);\n  -webkit-backdrop-filter: blur(8px) saturate(1.2);\n  animation: var(--motion-fade);\n}\n.fs-root .dialog {\n  position: relative;\n  width: min(560px, 100%);\n  max-height: calc(100svh - 70px);\n  border: 1px solid var(--glass-border);\n  border-radius: 18px;\n  background: var(--surface);\n  display: flex;\n  flex-direction: column;\n  box-shadow:\n    0 40px 100px -20px var(--shadow),\n    0 0 0 1px var(--border),\n    0 0 80px -30px color-mix(in srgb, var(--accent) calc(70% * var(--glow)), transparent);\n  animation: var(--motion-sheet);\n  overflow: hidden;\n}\n.fs-root .dialog::before {\n  content: \"\";\n  position: absolute;\n  inset: 0 0 auto 0;\n  height: 1px;\n  background:\n    linear-gradient(\n      90deg,\n      transparent,\n      var(--accent),\n      var(--accent-2),\n      transparent);\n  opacity: 0.8;\n}\n.fs-root .dialog-header {\n  display: flex;\n  align-items: flex-start;\n  gap: 14px;\n  padding: 22px 22px 14px;\n}\n.fs-root .dialog-header > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .dialog-header h2 {\n  font: 650 18px/1.3 var(--font-display);\n  letter-spacing: -0.3px;\n  margin: 0;\n  outline: none;\n}\n.fs-root .dialog-header p {\n  font-size: 12.5px;\n  color: var(--text-3);\n  margin: 6px 0 0;\n  line-height: 1.65;\n  overflow-wrap: anywhere;\n}\n.fs-root .dialog-header > .icon-button {\n  width: 26px;\n  height: 26px;\n  margin: -4px -6px 0 0;\n}\n.fs-root .dialog-header .ic {\n  width: 13px;\n  height: 13px;\n}\n.fs-root .dialog-body {\n  padding: 0 22px 20px;\n  flex: 1;\n  min-height: 0;\n  overflow: auto;\n}\n.fs-root .dialog-footer {\n  display: flex;\n  justify-content: flex-end;\n  align-items: center;\n  gap: 8px;\n  padding: 14px 22px 18px;\n  border-top: 1px solid var(--border);\n  background: var(--surface-2);\n}\n.fs-root .dialog-footer .button {\n  min-height: 32px;\n  padding: 0 16px;\n}\n.fs-root .launch-summary {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 8px;\n  padding: 2px 0 14px;\n}\n.fs-root .launch-stat {\n  padding: 10px 12px;\n  border-radius: 12px;\n  background: var(--surface-2);\n  border: 1px solid var(--border);\n  --lc: var(--text-3);\n}\n.fs-root .launch-stat b {\n  display: block;\n  font: 650 22px/1.1 var(--font-display);\n  color: var(--lc);\n  font-variant-numeric: tabular-nums;\n}\n.fs-root .launch-stat span {\n  font-size: 11px;\n  color: var(--text-faint);\n}\n.fs-root .launch-stat.now {\n  --lc: var(--accent);\n  border-color: var(--accent-border);\n  background: var(--accent-softer);\n}\n.fs-root .launch-stat.next {\n  --lc: var(--text);\n}\n.fs-root .launch-stat.confirm {\n  --lc: var(--amber);\n}\n.fs-root .launch-section > h4 {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  margin: 12px 0 4px;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  color: var(--text-faint);\n}\n.fs-root .launch-section > h4::after {\n  content: \"\";\n  flex: 1;\n  height: 1px;\n  background: var(--border);\n}\n.fs-root .launch-row {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 8px;\n  border-radius: 10px;\n  cursor: pointer;\n}\n.fs-root label.launch-row:hover {\n  background: var(--hover);\n}\n.fs-root .launch-row input {\n  appearance: none;\n  width: 16px;\n  height: 16px;\n  border-radius: 5px;\n  border: 1.5px solid var(--glyph);\n  display: grid;\n  place-items: center;\n  flex: none;\n  margin: 0;\n  cursor: pointer;\n}\n.fs-root .launch-row input:checked {\n  background: var(--accent);\n  border-color: var(--accent);\n}\n.fs-root .launch-row input:checked::after {\n  content: \"\";\n  width: 7px;\n  height: 4px;\n  border-left: 2px solid var(--on-accent);\n  border-bottom: 2px solid var(--on-accent);\n  rotate: -45deg;\n  translate: 0 -1px;\n}\n.fs-root .launch-row:has(input:not(:checked)) b {\n  color: var(--text-faint);\n  text-decoration: line-through;\n}\n.fs-root .launch-row > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .launch-row b {\n  font-size: 13px;\n  font-weight: 600;\n}\n.fs-root .launch-row small {\n  display: block;\n  color: var(--text-faint);\n  font-size: 11px;\n  margin-top: 1px;\n}\n.fs-root .launch-row > span:last-child {\n  font-size: 11px;\n  color: var(--text-faint);\n  flex: none;\n}\n.fs-root .launch-row .node-avatar {\n  --kc: var(--accent);\n  width: 26px;\n  height: 26px;\n}\n.fs-root .launch-row.is-follow {\n  cursor: default;\n  padding-left: 14px;\n}\n.fs-root .launch-row.is-follow .node-avatar {\n  --kc: var(--text-3);\n  width: 22px;\n  height: 22px;\n}\n.fs-root .launch-row.is-confirm .node-avatar {\n  --kc: var(--amber);\n}\n.fs-root .launch-row.is-none {\n  opacity: 0.72;\n}\n.fs-root .launch-skipped > summary {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  margin: 12px 0 4px;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  color: var(--text-faint);\n  cursor: pointer;\n  list-style: none;\n}\n.fs-root .launch-skipped > summary::-webkit-details-marker {\n  display: none;\n}\n.fs-root .launch-skipped > summary::after {\n  content: \"\";\n  flex: 1;\n  height: 1px;\n  background: var(--border);\n}\n.fs-root .launch-skipped > summary .ic {\n  width: 11px;\n  height: 11px;\n  transition: rotate var(--dur) var(--ease-out);\n}\n.fs-root .launch-skipped[open] > summary .ic {\n  rotate: 90deg;\n}\n.fs-root .command-dialog {\n  width: min(620px, 100%);\n  align-self: start;\n  margin-top: 10vh;\n  background: var(--glass);\n  backdrop-filter: blur(24px) saturate(1.6);\n  -webkit-backdrop-filter: blur(24px) saturate(1.6);\n}\n.fs-root .command-dialog .dialog-body {\n  padding: 0;\n}\n.fs-root .command-input {\n  display: flex;\n  align-items: center;\n  gap: 11px;\n  padding: 16px 20px;\n  border-bottom: 1px solid var(--border);\n}\n.fs-root .command-input .ic {\n  color: var(--accent);\n  width: 18px;\n  height: 18px;\n}\n.fs-root .command-input input {\n  flex: 1;\n  min-width: 0;\n  background: transparent;\n  border: 0;\n  font-size: 15.5px;\n  min-height: 28px;\n  caret-color: var(--accent);\n}\n.fs-root .command-results {\n  overflow-y: auto;\n  max-height: min(410px, calc(100svh - 280px));\n  padding: 6px;\n}\n.fs-root .command-result {\n  width: 100%;\n  display: flex;\n  gap: 11px;\n  align-items: center;\n  min-height: 42px;\n  padding: 7px 12px;\n  text-align: left;\n  border-radius: 10px;\n}\n.fs-root .command-result.active,\n.fs-root .command-result:hover {\n  background: var(--accent-soft);\n}\n.fs-root .command-result.active {\n  box-shadow: inset 2px 0 0 var(--accent);\n}\n.fs-root .command-result > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .command-result b {\n  font-size: 13px;\n  font-weight: 500;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  display: block;\n}\n.fs-root .command-result small {\n  font-size: 11px;\n  color: var(--text-faint);\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  display: block;\n  margin-top: 1px;\n}\n.fs-root .command-result > span:last-of-type {\n  font-size: 10.5px;\n  color: var(--text-faint);\n}\n.fs-root .command-icon {\n  width: 26px;\n  height: 26px;\n  border-radius: 8px;\n  display: grid;\n  place-items: center;\n  background: var(--surface-2);\n  color: var(--text-3);\n  flex: none;\n}\n.fs-root .command-result.active .command-icon {\n  background: var(--accent);\n  color: var(--on-accent);\n}\n.fs-root .command-icon .ic {\n  width: 14px;\n  height: 14px;\n}\n.fs-root .command-hint {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  font-size: 11px;\n  color: var(--text-faint);\n  padding: 10px 18px;\n  border-top: 1px solid var(--border);\n}\n.fs-root .command-hint > span {\n  margin-right: 12px;\n}\n.fs-root .command-empty {\n  padding: 40px 20px;\n  text-align: center;\n  color: var(--text-faint);\n  font-size: 12.5px;\n}\n.fs-root .file-dialog {\n  width: min(760px, 100%);\n}\n.fs-root .file-dialog .dialog-body {\n  padding: 0;\n}\n.fs-root .code-toolbar {\n  padding: 8px 22px;\n  color: var(--text-faint);\n  font: 11px var(--font-mono);\n  display: flex;\n  gap: 18px;\n  border-block: 1px solid var(--border);\n}\n.fs-root .code-view {\n  padding: 10px 0;\n  overflow: auto;\n  background: var(--code-bg);\n}\n.fs-root .code-line {\n  display: flex;\n  min-height: 22px;\n  font-size: 12px;\n  white-space: pre;\n  line-height: 1.85;\n}\n.fs-root .code-line:hover {\n  background: var(--hover);\n}\n.fs-root .code-line code {\n  padding: 0 14px;\n  flex: 1;\n  white-space: pre;\n}\n.fs-root .line-number {\n  width: 46px;\n  flex: none;\n  text-align: right;\n  color: var(--glyph);\n  font: 11px/2 var(--font-mono);\n  user-select: none;\n}\n.fs-root .template-preview-graph {\n  height: 150px;\n  margin: 0 0 8px;\n  border-radius: 12px;\n  border: 1px solid var(--border);\n  overflow: hidden;\n}\n.fs-root .template-preview-list > div {\n  display: flex;\n  gap: 11px;\n  padding: 10px 0;\n  border-bottom: 1px solid var(--border);\n}\n.fs-root .template-preview-list > div > .ic {\n  margin-top: 2px;\n  color: var(--accent);\n}\n.fs-root .template-preview-list b {\n  font-size: 13px;\n  font-weight: 600;\n}\n.fs-root .template-preview-list p {\n  margin: 3px 0 0;\n  color: var(--text-3);\n  font-size: 12px;\n  line-height: 1.6;\n}\n.fs-root .merge-port-list {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  margin-top: 14px;\n}\n.fs-root .merge-port-list label {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 12.5px;\n  cursor: pointer;\n}\n.fs-root .merge-port-list input {\n  accent-color: var(--accent);\n}\n.fs-root .sync-diff {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin: 4px 0 0;\n}\n.fs-root .sync-diff > div {\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  padding: 9px 11px;\n  border-radius: 10px;\n  background: var(--surface-2);\n  font-size: 12.5px;\n}\n.fs-root .sync-diff > div .ic {\n  width: 14px;\n  height: 14px;\n  color: var(--accent);\n  flex: none;\n}\n.fs-root .sync-diff small {\n  margin-left: auto;\n  color: var(--text-faint);\n  font-size: 11px;\n  flex: none;\n}\n.fs-root .shortcut-list {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 0 22px;\n}\n.fs-root .shortcut-list > div {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 8px 0;\n  border-bottom: 1px solid var(--border);\n  font-size: 12px;\n}\n.fs-root .help-legend {\n  display: grid;\n  grid-template-columns: auto 1fr;\n  align-items: center;\n  gap: 10px 14px;\n  margin-top: 18px;\n  padding: 14px 16px;\n  border-radius: 12px;\n  background: var(--surface-2);\n}\n.fs-root .help-legend svg {\n  width: 64px;\n  height: 16px;\n  overflow: visible;\n}\n.fs-root .help-legend path {\n  fill: none;\n  stroke-linecap: round;\n}\n.fs-root .help-legend b {\n  font-size: 12px;\n  font-weight: 400;\n  color: var(--text-2);\n}\n.fs-root .exchange-messages {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.fs-root .exchange-message {\n  --c: var(--m-f);\n  padding: 9px 12px;\n  border-radius: 12px;\n  border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);\n  background: color-mix(in srgb, var(--c) 8%, var(--surface));\n}\n.fs-root .exchange-message > header {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  font-size: 12px;\n  color: var(--c);\n}\n.fs-root .exchange-message > header time {\n  margin-left: auto;\n  color: var(--text-faint);\n  font: 10.5px var(--font-mono);\n}\n.fs-root .exchange-message > p {\n  font-size: 12.5px;\n  line-height: 1.6;\n  margin: 4px 0 6px;\n  user-select: text;\n}\n.fs-root .fs-session-list {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n.fs-root .fs-session-pick {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  width: 100%;\n  padding: 9px 12px;\n  border-radius: 10px;\n  border: 1px solid var(--border);\n  background: var(--surface-2);\n  text-align: left;\n}\n.fs-root .fs-session-pick:hover {\n  border-color: var(--accent-border);\n  background: var(--accent-softer);\n}\n.fs-root .fs-session-pick > div {\n  flex: 1;\n  min-width: 0;\n}\n.fs-root .fs-session-pick b {\n  display: block;\n  font-size: 13px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.fs-root .fs-session-pick small {\n  display: block;\n  color: var(--text-faint);\n  font: 11px var(--font-mono);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.fs-root .fs-toast {\n  position: fixed;\n  bottom: 40px;\n  left: 50%;\n  translate: -50% var(--shift-md);\n  padding: 9px 16px;\n  border-radius: var(--r-full);\n  background: var(--text);\n  color: var(--bg);\n  font-size: 12.5px;\n  font-weight: 500;\n  opacity: 0;\n  pointer-events: none;\n  z-index: 150;\n  box-shadow: 0 14px 34px -10px var(--shadow);\n  transition: opacity var(--dur) var(--ease), translate var(--dur-slower) var(--ease-spring);\n  max-width: min(560px, 88vw);\n}\n.fs-root .fs-toast.is-error {\n  background: var(--red);\n  color: #fff;\n}\n.fs-root .fs-toast.visible {\n  opacity: 1;\n  translate: -50% 0;\n  pointer-events: auto;\n}\n@container flowspace (max-width: 1060px) {\n  .fs-root .canvas-hint,\n  .fs-root .header-save > span,\n  .fs-root .toolbar-search > span,\n  .fs-root .toolbar-actions > kbd,\n  .fs-root .workspace-breadcrumb > span,\n  .fs-root .workspace-breadcrumb > i {\n    display: none;\n  }\n  .fs-root .canvas-title {\n    max-width: 190px;\n  }\n  .fs-root .surface-page {\n    padding: 30px 24px 50px;\n  }\n}\n@container flowspace (max-width: 860px) {\n  .fs-root .workspace-chip > span,\n  .fs-root .waiting-button > span,\n  .fs-root .toolbar-button > span,\n  .fs-root .route-nav button > span:not(.route-badge) {\n    display: none;\n  }\n  .fs-root .fs-inspector.open {\n    position: absolute;\n    top: 0;\n    right: 0;\n    bottom: 0;\n    z-index: 40;\n    width: 276px;\n    box-shadow: -20px 0 50px var(--shadow);\n  }\n  .fs-root .inspector-content,\n  .fs-root .inspector-header,\n  .fs-root .inspector-empty {\n    width: 275px;\n  }\n  .fs-root .launch-summary {\n    grid-template-columns: repeat(2, 1fr);\n  }\n  .fs-root .shortcut-list {\n    grid-template-columns: 1fr;\n  }\n}\n@container flowspace (max-width: 700px) {\n  .fs-root .fs-side {\n    position: absolute;\n    left: 0;\n    top: 46px;\n    bottom: 0;\n    width: 224px;\n    z-index: 60;\n    background: var(--surface);\n    transform: translateX(-105%);\n    visibility: hidden;\n    pointer-events: none;\n    transition: transform var(--dur-slow) var(--ease-nav), visibility var(--dur-slow) var(--ease);\n  }\n  .fs-root .fs-side.mobile-open {\n    width: 224px;\n    transform: translateX(0);\n    visibility: visible;\n    pointer-events: auto;\n    border-right: 1px solid var(--border-strong);\n    box-shadow: 20px 0 50px var(--shadow);\n  }\n  .fs-root .canvas-title {\n    display: none;\n  }\n}\n:root[data-theme-transition]::view-transition-old(root) {\n  animation: none;\n  z-index: 0;\n}\n:root[data-theme-transition]::view-transition-new(root) {\n  animation: cv-reveal 480ms cubic-bezier(0.16, 0.84, 0.44, 1);\n  z-index: 1;\n  mix-blend-mode: normal;\n}\n:root[data-theme-transition] * {\n  transition-duration: 0s !important;\n}\n.fs-root[data-perf-tier=L1] *,\n.fs-root[data-perf-tier=L1] *::before,\n.fs-root[data-perf-tier=L1] *::after {\n  animation-duration: 0.01ms !important;\n  animation-iteration-count: 1 !important;\n  animation-delay: 0s !important;\n  transition-duration: 0s !important;\n}\n.fs-root[data-perf-tier=L1] .edge-flow,\n.fs-root[data-perf-tier=L1] .progress-line i::after,\n.fs-root[data-perf-tier=L1] .status > i::after,\n.fs-root[data-perf-tier=L1] .status-dot::after,\n.fs-root[data-perf-tier=L1] .fs-canvas-area::before,\n.fs-root[data-perf-tier=L1] .fs-viewport::before,\n.fs-root[data-perf-tier=L1] .node::after,\n.fs-root[data-perf-tier=L1] .node.status-running::before {\n  display: none !important;\n}\n\n/* packages/flowspace/src/client/style.css */\n";document.head.appendChild(style);return ()=>style.remove()});return flowspaceApply(ctx)}};}});
