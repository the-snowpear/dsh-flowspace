import type {
  BoardColumn,
  CanvasSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GroupPort,
  TeamBlueprint,
  TeamDependencies,
  WorkflowTemplate,
} from "../types.ts";
import {
  boardSummaryText,
  emptyDocument,
  groupDescendants,
  newEdge,
  newFlowNode,
  newNode,
  uid,
} from "../core/document.ts";
import {
  stripEdgeForPortableTemplate,
  stripForFreshInstance,
  stripForPortableTemplate,
  syncTemplateAuthoredFields,
} from "../core/nodeFields.ts";
import { inferGroupPorts } from "./geometry.ts";
import { createFanoutPair } from "../core/fanout.ts";
import { authoredPairHeight, remapFanout, remapLaneNode } from "./laneIds.ts";
import { getLanguage, t, tFor, type Locale } from "./i18n.ts";

const pick = <T,>(locale: Locale, zh: T, en: T): T =>
  locale === "en" ? en : zh;

function tplAgent(
  slotId: string,
  title: string,
  x: number,
  y: number,
  task: string,
  opts: Partial<FlowNode> & { downstream?: boolean } = {},
): FlowNode {
  const { downstream, ...rest } = opts;
  const node: FlowNode = {
    ...newNode("agent", x, y, title),
    id: slotId,
    templateSlotId: slotId,
    task,
    draft: task,
    continuationPrompt:
      rest.continuationPrompt ?? (downstream ? task : undefined),
    expanded: rest.expanded ?? true,
    ...rest,
  };
  delete node.window;
  return node;
}

function tplNote(
  slotId: string,
  title: string,
  x: number,
  y: number,
  text: string,
  expanded = false,
): FlowNode {
  const node: FlowNode = {
    ...newNode("note", x, y, title),
    id: slotId,
    templateSlotId: slotId,
    text,
    expanded,
    pinned: true,
  };
  delete node.window;
  return node;
}

function tplBoard(
  slotId: string,
  title: string,
  x: number,
  y: number,
  columns: BoardColumn[],
  expanded = false,
): FlowNode {
  const node: FlowNode = {
    ...newNode("board", x, y, title),
    id: slotId,
    templateSlotId: slotId,
    columns,
    selectedItems: [],
    text: boardSummaryText(columns),
    expanded,
    pinned: true,
  };
  delete node.window;
  return node;
}

function tplTool(
  kind: "git" | "changes" | "terminal",
  slotId: string,
  title: string,
  x: number,
  y: number,
  expanded = false,
): FlowNode {
  const node: FlowNode = {
    ...newNode(kind, x, y, title),
    id: slotId,
    templateSlotId: slotId,
    expanded,
    pinned: true,
  };
  delete node.window;
  return node;
}

function tplDisplay(
  slotId: string,
  title: string,
  x: number,
  y: number,
  sourceSlotId: string,
  placeholderText: string,
  fixed = false,
): FlowNode {
  const node: FlowNode = {
    ...newNode("display", x, y, title),
    id: slotId,
    templateSlotId: slotId,
    sourceNodeId: sourceSlotId,
    text: placeholderText,
    fixed,
    expanded: true,
  };
  delete node.window;
  return node;
}

export const contentFlowTemplateId = "builtin-split-fanout-merge";
const playModes = ["arena", "jury", "debate", "wall", "inspiration"] as const;

function playTemplate(locale: Locale, mode: typeof playModes[number]): WorkflowTemplate {
  const doc = emptyDocument();
  const label = (key: string) => tFor(locale, `flow_play_${key}`);
  const outer = { ...newNode("group", 0, 0), color: "teal" as const, width: 1420, height: 660 };
  doc.nodes.push(outer);
  const add = (node: FlowNode, slot: string, parentId = outer.id) => {
    node.templateSlotId = `slot-${mode}-${slot}`;
    node.parentId = parentId;
    doc.nodes.push(node);
    return node;
  };
  const link = (source: FlowNode, target: FlowNode, patch: Partial<FlowEdge> = {}) =>
    doc.edges.push({ ...newEdge(source.id, target.id, "continuation"), ...patch });
  if (mode === "arena" || mode === "jury") {
    const models = add(newFlowNode("flowspace/constant", 24, 64, locale), "models");
    models.title = label("model_list");
    models.config = { mode: "list", value: JSON.stringify([
      { provider: "@available", model: "0" }, { provider: "@available", model: "1" },
      ...(mode === "jury" ? [{ provider: "@available", model: "2" }] : []),
    ]) };
    const pair = createFanoutPair(doc, 360, 64, { locale, title: label(mode), masterTitle: label("author"),
      task: label(mode === "arena" ? "arena_task" : "vote_task"), parentId: outer.id,
      sourceId: models.id, sourcePort: "out", sourceKind: "continuation" });
    for (const [index, node] of [pair.group, pair.fan, pair.master, pair.merge].entries()) node.templateSlotId = `slot-${mode}-${index}`;
    pair.master.laneBindings = { provider: "provider", model: "model" };
    pair.merge.config = { ...pair.merge.config, wait: mode === "arena" ? "best" : "quorum", quorum: 2,
      output: "list", arena: mode === "arena", taskTag: mode === "arena" ? "museum-label" : "" };
    if (mode === "arena") {
      const score = add(newFlowNode("flowspace/human-score", pair.master.x + 344, pair.master.y, locale), "score", pair.group.id);
      score.masterOf = pair.fan.id;
      score.title = label("review");
      const edge = doc.edges.find(edge => edge.source === pair.master.id && edge.target === pair.merge.id)!;
      edge.target = score.id;
      edge.targetPort = "in";
      link(score, pair.merge);
      pair.group.width += 344;
      pair.merge.x += 344;
      outer.width += 344;
    }
  } else if (mode === "debate") {
    const first = add(tplAgent("pro", label("pro"), 24, 56, label("debate_pro")), "pro");
    const second = add(tplAgent("con", label("con"), 394, 56, label("debate_con"), { downstream: true }), "con");
    const judge = add(newFlowNode("flowspace/ai-judge", 768, 56, locale), "judge");
    judge.title = label("judge");
    judge.config = { ...judge.config, provider: "@available", model: "0" };
    link(first, second, { maxRounds: 2 });
    link(second, first, { maxRounds: 2, logic: { maxTimes: 1 } });
    link(second, judge, { logic: { fromRound: 2, maxTimes: 1 } });
  } else if (mode === "wall") {
    const first = add(tplAgent("first", label("wall_educator"), 24, 60,
      `${label("wall_educator_task")}\n${label("wall_task")}`), "first");
    const second = add(tplAgent("second", label("wall_exhibit_designer"), 24, 480,
      `${label("wall_exhibit_designer_task")}\n${label("wall_task")}`), "second");
    const board = add(newNode("board", 404, 210, label("wall")), "board");
    board.columns = [{ id: "ideas", name: label("wall"), cards: [] }];
    const final = add(tplAgent("implement", label("author"), 1796, 210, label("implement"), { downstream: true }), "implement");
    for (const [slot, source] of [["educator", first], ["designer", second]] as const) {
      const human = add(newFlowNode("flowspace/human-score", 1040, source.y, locale), `score-${slot}`);
      const condition = add(newFlowNode("flowspace/condition", 1420, source.y, locale), `condition-${slot}`);
      condition.config = { branches: [{ id: "pass", label: label("best"), match: "all",
        rules: [{ field: "json", path: "score", op: "gt", value: "3" }] }] };
      link(source, board, { delivery: { mode: "paragraph" } });
      link(source, human, { trigger: "confirm" });
      link(human, condition);
      link(condition, final, { sourcePort: "pass" });
    }
    outer.width = 2150;
    outer.height = 940;
  } else {
    const chooser = add(newFlowNode("flowspace/random", 24, 64, locale), "random");
    const phases = ["story", "question", "demo"];
    chooser.config = { mode: "random", seed: "", branches: phases.map(id => ({ id, label: label("style_" + id), value: label("style_" + id) })) };
    const creator = add(tplAgent("creator", label("author"), 430, 64, label("creative"), { downstream: true }), "creator");
    for (const phase of phases) link(chooser, creator, { sourcePort: phase });
    outer.width = 810;
    outer.height = 502;
  }
  const template = captureTemplate(doc, outer.id, `flow_play_${mode}`, `flow_play_${mode}_desc`);
  template.edges.forEach((edge, index) => { edge.id = `e-${mode}-${index}`; });
  return { ...template, id: `builtin-play-${mode}`, builtin: true, ...(mode === "wall" ? { revision: 2 } : {}) };
}

function contentFlowTemplate(locale: Locale): WorkflowTemplate {
  const label = (key: string) => tFor(locale, "flow_tpl_content_" + key);
  const doc = emptyDocument();
  const outer = { ...newNode("group", 0, 0), width: 1544, height: 1172, color: "teal" as const };
  const note = tplNote("slot-content-note", label("note"), 24, 58, label("items"), true);
  const split = newFlowNode("flowspace/split", 360, 58, locale);
  const result = newFlowNode("flowspace/join", 1200, 488, locale);
  split.title = label("split"); split.titleKey = "flow_tpl_content_split";
  result.title = label("result"); result.titleKey = "flow_tpl_content_result";
  result.config = { ...result.config, mode: "numbered" };
  for (const node of [note, split, result]) node.parentId = outer.id;
  doc.nodes.push(outer, note, split, result);
  doc.edges.push({ ...newEdge(note.id, split.id, "reference"), targetPort: "in", always: true });
  const { group, fan, master, merge } = createFanoutPair(doc, 24, 432, {
    locale, title: label("group"), masterTitle: label("master"), task: label("task"), parentId: outer.id,
    sourceId: split.id, sourcePort: "out", sourceKind: "continuation",
  });
  master.expanded = false;
  for (const [node, slot] of [[split, "split"], [group, "lanes"], [fan, "fan"], [master, "master"],
    [merge, "merge"], [result, "result"]] as const) node.templateSlotId = "slot-content-" + slot;
  doc.edges.find(edge => edge.target === fan.id)!.waypoints = [{ x: 696, y: 320 }, { x: 24, y: 320 }];
  doc.edges.push({ ...newEdge(merge.id, result.id, "continuation"), sourcePort: "out", targetPort: "in" });
  const template = captureTemplate(doc, outer.id, "flow_tpl_content_title", "flow_tpl_content_description");
  template.edges.forEach((edge, i) => { edge.id = `e-content-${i + 1}`; });
  const inner = template.nodes.find(node => node.fanout)!;
  for (const port of inner.ports ?? []) port.id = `content-lanes-${port.kind}-${port.direction}`;
  template.ports = [
    { id: "content-in", kind: "reference", direction: "in", portId: "in", name: label("input"), nodes: [split.templateSlotId!], hidden: false },
    { id: "content-out", kind: "continuation", direction: "out", portId: "out", name: result.title, nodes: [result.templateSlotId!], hidden: false },
  ];
  return { ...template, id: contentFlowTemplateId, builtin: true };
}

export function builtinTemplates(
  locale: Locale = getLanguage(),
): WorkflowTemplate[] {
  /* 1. Spec -> Plan Gate -> Adversarial Critique -> Actionable Delivery */
  const reviewNodes: FlowNode[] = [
    tplNote(
      "slot-spec-note",
      pick(locale, "规格与验收约束", "Spec & Guardrails"),
      24,
      54,
      pick(
        locale,
        "1. 先只读核对真实代码与接口契约，禁止凭空假设。\n2. 明确影响范围、边界条件与回归验证命令。",
        "1. Verify real code and contracts read-only first; never guess APIs.\n2. State blast radius, edge cases and exact verification commands.",
      ),
      false,
    ),
    tplAgent(
      "slot-analyze",
      pick(locale, "架构规划师 (Plan)", "Plan Architect"),
      24,
      178,
      pick(
        locale,
        "阅读当前工作区与规格约束，梳理核心模块职责、潜在瓶颈，并制定分步实施计划。先不要修改文件。",
        "Inspect the workspace and spec guardrails, map core module boundaries, and formulate a step-by-step plan without modifying files.",
      ),
      { roleLabel: "implementation", planMode: true, expanded: false },
    ),
    tplAgent(
      "slot-review",
      pick(locale, "挑刺审查员", "Adversarial Critic"),
      348,
      54,
      pick(
        locale,
        "基于上游完整对话快照，逐条挑刺架构方案的并发安全、边界遗漏与兼容性风险，给出具体修正建议。不要修改文件。",
        "Audit the upstream folded session transcript for race conditions, missed edge cases and compatibility risks, citing concrete code evidence.",
      ),
      { roleLabel: "review", downstream: true, expanded: true },
    ),
    tplAgent(
      "slot-deliver",
      pick(locale, "交付执行清单", "Delivery Checklist"),
      704,
      54,
      pick(
        locale,
        "结合规划与挑刺审查结论，收敛出一份可直接执行的文件级行动清单与自动化验收步骤。",
        "Synthesize the plan and critique into a concise, file-referenced execution checklist and verification sequence.",
      ),
      { roleLabel: "delivery", downstream: true, expanded: true },
    ),
  ];
  const reviewEdges: FlowEdge[] = [
    {
      ...newEdge("slot-spec-note", "slot-analyze", "reference"),
      id: "er-ref-1",
      always: true,
    },
    {
      ...newEdge("slot-spec-note", "slot-review", "reference"),
      id: "er-ref-2",
      always: true,
    },
    {
      ...newEdge("slot-analyze", "slot-review", "continuation"),
      id: "e-1",
      mode: "session",
      trigger: "auto",
    },
    {
      ...newEdge("slot-review", "slot-deliver", "continuation"),
      id: "e-2",
      mode: "conclusion",
      trigger: "confirm",
    },
  ];

  /* 2. Parallel Repo Recon -> Join Synthesis */
  const parallelNodes: FlowNode[] = [
    tplNote(
      "slot-recon-goals",
      pick(locale, "侦察焦点", "Recon Goals"),
      24,
      52,
      pick(
        locale,
        "聚焦核心数据流、状态边界与构建测试链路，汇总高价值改进切入点。",
        "Focus on core dataflow, state invariants and test/build pipelines; surface high-leverage wins.",
      ),
      false,
    ),
    tplAgent(
      "slot-res1",
      pick(locale, "探索架构与数据流", "Scout: Architecture & Dataflow"),
      24,
      172,
      pick(
        locale,
        "阅读当前工作区，概括分层架构、主要模块职责与核心状态数据流。不要修改文件。",
        "Read the workspace and map layered architecture, module responsibilities and primary state dataflow. Read-only.",
      ),
      { expanded: false, roleLabel: "implementation" },
    ),
    tplAgent(
      "slot-res2",
      pick(locale, "调查类型与测试防线", "Scout: Types, Build & Tests"),
      24,
      312,
      pick(
        locale,
        "调查当前项目的构建脚本、类型检查、单元测试与集成验收约束。不要修改文件。",
        "Investigate build scripts, typechecking, unit tests and integration verification constraints. Read-only.",
      ),
      { expanded: false, roleLabel: "implementation" },
    ),
    tplAgent(
      "slot-synth",
      pick(locale, "全景汇合综述", "Executive Synthesis"),
      368,
      54,
      pick(
        locale,
        "等两路侦察全部完成后，交叉印证架构与验证防线，输出结构化项目全景图与优先级建议。",
        "Once both scouts complete at the join barrier, cross-reference architecture and test coverage into an executive roadmap.",
      ),
      { roleLabel: "review", downstream: true, expanded: true },
    ),
  ];
  const parallelEdges: FlowEdge[] = [
    {
      ...newEdge("slot-recon-goals", "slot-res1", "reference"),
      id: "ep-ref-1",
    },
    {
      ...newEdge("slot-recon-goals", "slot-res2", "reference"),
      id: "ep-ref-2",
    },
    { ...newEdge("slot-res1", "slot-synth", "continuation"), id: "ep-1" },
    { ...newEdge("slot-res2", "slot-synth", "continuation"), id: "ep-2" },
  ];

  /* 3. Self-Healing TDD Bounded Loop (maxRounds: 3) */
  const tddColumns: BoardColumn[] = [
    {
      id: "col-todo",
      name: pick(locale, "待办验收项", "Acceptance To-Do"),
      role: "todo",
      color: "neutral",
      cards: [
        {
          id: "card-red-green",
          text: pick(
            locale,
            "先补失败单测覆盖目标边界，再做最小代码实现并通过类型检查",
            "Write failing regression test first, implement minimal fix, pass typecheck",
          ),
          priority: "high",
          tags: [pick(locale, "验收", "Acceptance"), "TDD"],
          description: pick(
            locale,
            "记录回归测试的失败原因，并在修复后重新运行同一组检查。",
            "Record why the regression test fails and rerun the same checks after the fix.",
          ),
          checklist: [
            { id: "tdd-reproduce", text: pick(locale, "确认可复现的失败场景", "Confirm a reproducible failure"), done: true },
            { id: "tdd-edge-case", text: pick(locale, "补齐边界条件测试", "Cover the edge case"), done: false },
            { id: "tdd-check", text: pick(locale, "运行类型检查与测试", "Run typecheck and tests"), done: false },
          ],
        },
      ],
    },
    {
      id: "col-doing",
      name: pick(locale, "进行中", "In Progress"),
      role: "doing",
      color: "blue",
      cards: [],
    },
    {
      id: "col-done",
      name: pick(locale, "已验证", "Verified"),
      role: "done",
      color: "green",
      cards: [],
    },
  ];
  const tddNodes: FlowNode[] = [
    tplBoard(
      "slot-tdd-board",
      pick(locale, "TDD 验收看板", "TDD Acceptance Board"),
      24,
      54,
      tddColumns,
      false,
    ),
    tplAgent(
      "slot-tdd-author",
      pick(locale, "测试与实现作者", "Test & Feature Author"),
      24,
      180,
      pick(
        locale,
        "对照验收看板，先编写或更新复现/边界测试，再完成最小干净实现并运行检查命令汇报结果。",
        "Follow the acceptance board: write or update tests first, implement the minimal clean change, and run local check commands.",
      ),
      {
        roleLabel: "implementation",
        expanded: true,
        continuationPrompt: pick(
          locale,
          "阅读下游独立验证员指出的失败项或边界缺陷，做最小定向修复并重新运行测试核验；若已全部通过请简要确认。",
          "Address the exact test/type defects cited by the Independent Verifier with minimal targeted edits and re-verify.",
        ),
      },
    ),
    tplTool(
      "changes",
      "slot-tdd-changes",
      pick(locale, "本轮代码改动", "Turn Diff Snapshot"),
      384,
      54,
      false,
    ),
    tplAgent(
      "slot-tdd-verifier",
      pick(locale, "独立验证员 (×3 闭环)", "Independent Verifier"),
      384,
      180,
      pick(
        locale,
        "结合本轮改动 Diff 独立运行类型检查与测试套件：若仍有缺陷请列出精确文件行号触发回环修复；若全部通过请给出验收通过结论。",
        "Audit the turn diff and run typecheck + tests independently: cite exact file/line failures for repair, or sign off when clean.",
      ) + "\n\n" + tFor(locale, "flow_tdd_marker"),
      { roleLabel: "review", downstream: true, expanded: true },
    ),
    {
      ...newFlowNode("flowspace/condition", 744, 180, locale),
      id: "slot-tdd-gate", templateSlotId: "slot-tdd-gate",
      title: tFor(locale, "flow_tdd_gate"), titleKey: "flow_tdd_gate",
      expanded: true,
      config: { branches: [{ id: "pass", label: tFor(locale, "flow_tdd_pass"), match: "all",
        rules: [{ field: "text", op: "regex", value: "(?:^|\\n)结论：通过(?:\\r?\\n)?$" }] }] },
    },
    tplAgent(
      "slot-tdd-summary",
      pick(locale, "变更签收摘要", "Verified Delivery Summary"),
      1104,
      180,
      pick(
        locale,
        "汇总本轮 TDD 闭环的新增测试、核心代码改动与验证结果，生成简洁的提交/PR 摘要。",
        "Summarize new test coverage, surgical code changes and verification status into a crisp PR/commit brief.",
      ),
      { roleLabel: "delivery", downstream: true, expanded: false },
    ),
  ];
  const tddEdges: FlowEdge[] = [
    {
      ...newEdge("slot-tdd-board", "slot-tdd-author", "reference"),
      id: "etdd-ref-board",
      always: true,
    },
    {
      ...newEdge("slot-tdd-changes", "slot-tdd-verifier", "reference"),
      id: "etdd-ref-diff",
      always: true,
    },
    {
      ...newEdge("slot-tdd-author", "slot-tdd-verifier", "continuation"),
      id: "etdd-forward",
      mode: "conclusion",
      trigger: "auto",
      maxRounds: 3,
    },
    {
      ...newEdge("slot-tdd-verifier", "slot-tdd-gate", "continuation"),
      id: "etdd-verdict", targetPort: "in", trigger: "auto",
    },
    {
      ...newEdge("slot-tdd-gate", "slot-tdd-author", "continuation"),
      id: "etdd-loopback",
      sourcePort: "else",
      mode: "conclusion",
      trigger: "auto",
      maxRounds: 3,
      waypoints: [
        { x: 1080, y: 604 },
        { x: 24, y: 604 },
      ],
    },
    {
      ...newEdge("slot-tdd-gate", "slot-tdd-summary", "continuation"),
      id: "etdd-exit",
      sourcePort: "pass",
      mode: "conclusion",
      trigger: "confirm",
    },
  ];

  /* 4. A/B Hypothesis Fork & Trade-off Judge */
  const abForkNodes: FlowNode[] = [
    tplAgent(
      "slot-fork-root",
      pick(locale, "同源问题探索基线", "Root Problem Framing"),
      24,
      54,
      pick(
        locale,
        "深入阅读相关源码，定位问题根因、关键约束与评估指标，为下游两条并行分叉方案建立统一上下文基线。不要修改文件。",
        "Investigate relevant source files, establish root context, constraints and evaluation metrics for two competing forked designs. Read-only.",
      ),
      { roleLabel: "implementation", expanded: true },
    ),
    tplAgent(
      "slot-fork-a",
      pick(locale, "方案 A · 最小安全补丁", "Branch A · Minimal Safe Patch"),
      388,
      64,
      pick(
        locale,
        "继承上游探索历史，设计并论证「改动面最小、零破坏性、最快上线」的保守修复方案及具体代码落点。",
        "Inheriting forked history, design and justify a minimal-blast-radius, backwards-compatible patch with exact code touchpoints.",
      ),
      { roleLabel: "implementation", downstream: true, expanded: false },
    ),
    tplAgent(
      "slot-fork-b",
      pick(locale, "方案 B · 根治架构重构", "Branch B · Clean Refactor"),
      388,
      236,
      pick(
        locale,
        "继承上游探索历史，设计并论证「消除历史包袱、边界最清晰、长期可演进」的架构级重构方案及迁移步骤。",
        "Inheriting forked history, design and justify a clean structural refactor eliminating tech debt with clear migration steps.",
      ),
      { roleLabel: "implementation", downstream: true, expanded: false },
    ),
    tplAgent(
      "slot-fork-judge",
      pick(locale, "双方案对比裁决官", "Trade-off Judge"),
      724,
      54,
      pick(
        locale,
        "对比 A/B 两条分叉分支的完整对话论证，从正确性、复杂度、回归风险与维护成本四维打分，给出最终胜出推荐。",
        "Compare full transcripts from Branch A and Branch B across correctness, complexity, regression risk and maintainability; pick a winner.",
      ),
      { roleLabel: "review", downstream: true, expanded: true },
    ),
  ];
  const abForkEdges: FlowEdge[] = [
    {
      ...newEdge("slot-fork-root", "slot-fork-a", "continuation"),
      id: "efork-a",
      mode: "fork",
      trigger: "confirm",
    },
    {
      ...newEdge("slot-fork-root", "slot-fork-b", "continuation"),
      id: "efork-b",
      mode: "fork",
      trigger: "confirm",
    },
    {
      ...newEdge("slot-fork-a", "slot-fork-judge", "continuation"),
      id: "efork-join-a",
      mode: "session",
      trigger: "auto",
    },
    {
      ...newEdge("slot-fork-b", "slot-fork-judge", "continuation"),
      id: "efork-join-b",
      mode: "session",
      trigger: "auto",
    },
  ];

  /* 5. Bug Triage: Terminal + Git -> Root Cause -> Fix + Live Display */
  const bugHuntNodes: FlowNode[] = [
    tplTool(
      "terminal",
      "slot-bug-term",
      pick(locale, "报错终端快照", "Failing Terminal"),
      24,
      54,
      false,
    ),
    tplTool(
      "git",
      "slot-bug-git",
      pick(locale, "近期 Git 改动", "Recent Git Diff"),
      24,
      192,
      false,
    ),
    tplAgent(
      "slot-bug-locator",
      pick(locale, "只读根因定位器", "Read-Only Fault Localizer"),
      348,
      54,
      pick(
        locale,
        "交叉分析终端报错栈与近期 Git 提交/改动，精确锁定触发故障的文件、函数与触发条件。先只读定位，不要改代码。",
        "Cross-correlate terminal failure output with recent Git changes to pinpoint exact file, function and reproduction trigger. Read-only.",
      ),
      { roleLabel: "review", expanded: true },
    ),
    tplAgent(
      "slot-bug-fixer",
      pick(locale, "最小修复与回归验证", "Minimal Fix & Regression Test"),
      704,
      54,
      pick(
        locale,
        "根据已确认的根因报告，实施最小外科手术式修复，补充防回归测试并输出根因与验证复盘报告。",
        "Apply a surgical fix for the confirmed root cause, add a regression test, and output a structured post-mortem verification report.",
      ),
      { roleLabel: "implementation", downstream: true, expanded: true },
    ),
    tplDisplay(
      "slot-bug-report",
      pick(locale, "故障复盘与修复报告", "Live Root-Cause & Fix Report"),
      1056,
      96,
      "slot-bug-fixer",
      pick(
        locale,
        "等待修复 Agent 输出最新故障根因与回归验证报告…",
        "Follows latest root-cause analysis and verification report…",
      ),
      false,
    ),
  ];
  const bugHuntEdges: FlowEdge[] = [
    {
      ...newEdge("slot-bug-term", "slot-bug-locator", "reference"),
      id: "ebug-ref-term",
    },
    {
      ...newEdge("slot-bug-git", "slot-bug-locator", "reference"),
      id: "ebug-ref-git",
    },
    {
      ...newEdge("slot-bug-locator", "slot-bug-fixer", "continuation"),
      id: "ebug-cont",
      mode: "session",
      trigger: "confirm",
    },
  ];

  /* 6. Multi-Reviewer PR Audit -> Bilingual Release Notes */
  const releaseNodes: FlowNode[] = [
    tplTool(
      "git",
      "slot-rel-git",
      pick(locale, "Git 待发变更", "Git Repo Changes"),
      24,
      54,
      false,
    ),
    tplAgent(
      "slot-rel-correctness",
      pick(locale, "正确性与安全审查", "Correctness & Security Reviewer"),
      344,
      58,
      pick(
        locale,
        "审查当前工作区最近的提交与未提交变更，排查逻辑缺陷、权限边界与潜在性能回退。不要修改文件。",
        "Audit recent commits and working diffs for logic bugs, security boundaries and regressions. Read-only.",
      ),
      { roleLabel: "review", expanded: false },
    ),
    tplAgent(
      "slot-rel-dx",
      pick(locale, "兼容性与文档核查", "DX & Breaking-Change Auditor"),
      344,
      214,
      pick(
        locale,
        "核查公开类型契约、配置迁移影响、CLI 命令与中英文文档一致性，标记任何破坏性变更。不要修改文件。",
        "Check public API contracts, migration impact, CLI commands and docs consistency; flag any breaking changes. Read-only.",
      ),
      { roleLabel: "review", expanded: false },
    ),
    tplAgent(
      "slot-proof",
      pick(locale, "PR 结论与双语发布说明", "PR Verdict & Bilingual Changelog"),
      676,
      54,
      pick(
        locale,
        "综合两路审查报告，先给出是否可发布的明确结论与阻塞项，再输出结构化中英双语变更说明（新增、改进、修复）。",
        "Combine both audit reports into a ship/block verdict, followed by structured bilingual release notes (Added, Improved, Fixed).",
      ),
      { roleLabel: "delivery", downstream: true, expanded: true },
    ),
  ];
  const releaseEdges: FlowEdge[] = [
    {
      ...newEdge("slot-rel-git", "slot-rel-correctness", "reference"),
      id: "er-git-1",
      always: true,
    },
    {
      ...newEdge("slot-rel-git", "slot-rel-dx", "reference"),
      id: "er-git-2",
      always: true,
    },
    {
      ...newEdge("slot-rel-correctness", "slot-proof", "continuation"),
      id: "er-1",
      mode: "conclusion",
      trigger: "confirm",
    },
    {
      ...newEdge("slot-rel-dx", "slot-proof", "continuation"),
      id: "er-2",
      mode: "conclusion",
      trigger: "confirm",
    },
  ];

  return [
    {
      id: "builtin-review",
      title: "implementationReview",
      description: "implementationReviewDescription",
      revision: 2,
      builtin: true,
      color: "blue",
      w: 1044,
      h: 476,
      nodes: reviewNodes,
      edges: reviewEdges,
      ports: [
        {
          id: "in-spec-ref",
          kind: "reference",
          direction: "in",
          name: pick(locale, "外部规格输入", "Spec context"),
          nodes: ["slot-analyze"],
          hidden: false,
        },
        {
          id: "in-analyze",
          kind: "continuation",
          direction: "in",
          name: pick(locale, "启动规划", "Start plan"),
          nodes: ["slot-analyze"],
          hidden: false,
        },
        {
          id: "out-deliver",
          kind: "continuation",
          direction: "out",
          name: pick(locale, "行动清单出口", "Delivery checklist"),
          nodes: ["slot-deliver"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-parallel",
      title: "parallelResearch",
      description: "parallelResearchDescription",
      revision: 2,
      builtin: true,
      color: "teal",
      w: 712,
      h: 476,
      nodes: parallelNodes,
      edges: parallelEdges,
      ports: [
        {
          id: "in-res",
          kind: "reference",
          direction: "in",
          name: pick(locale, "侦察资料输入", "Recon context"),
          nodes: ["slot-res1", "slot-res2"],
          hidden: false,
        },
        {
          id: "out-synth",
          kind: "continuation",
          direction: "out",
          name: pick(locale, "全景综述出口", "Synthesis output"),
          nodes: ["slot-synth"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-tdd-loop",
      title: "tddLoopWorkflow",
      description: "tddLoopWorkflowDescription",
      revision: 2,
      builtin: true,
      color: "amber",
      w: 1440,
      h: 644,
      nodes: tddNodes,
      edges: tddEdges,
      ports: [
        {
          id: "in-tdd-context",
          kind: "reference",
          direction: "in",
          name: pick(locale, "需求与测试上下文", "TDD spec input"),
          nodes: ["slot-tdd-author"],
          hidden: false,
        },
        {
          id: "in-tdd-start",
          kind: "continuation",
          direction: "in",
          name: pick(locale, "启动 TDD 闭环", "Run TDD loop"),
          nodes: ["slot-tdd-author"],
          hidden: false,
        },
        {
          id: "out-tdd-summary",
          kind: "continuation",
          direction: "out",
          name: pick(locale, "已验证摘要", "Verified summary"),
          nodes: ["slot-tdd-summary"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-ab-fork",
      title: "abForkWorkflow",
      description: "abForkWorkflowDescription",
      revision: 1,
      builtin: true,
      color: "violet",
      w: 1064,
      h: 476,
      nodes: abForkNodes,
      edges: abForkEdges,
      ports: [
        {
          id: "in-fork-ref",
          kind: "reference",
          direction: "in",
          name: pick(locale, "背景约束", "Problem context"),
          nodes: ["slot-fork-root"],
          hidden: false,
        },
        {
          id: "in-fork-start",
          kind: "continuation",
          direction: "in",
          name: pick(locale, "探索并分叉", "Explore & fork"),
          nodes: ["slot-fork-root"],
          hidden: false,
        },
        {
          id: "out-fork-judge",
          kind: "continuation",
          direction: "out",
          name: pick(locale, "胜出方案", "Winning design"),
          nodes: ["slot-fork-judge"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-bug-hunt",
      title: "bugHuntWorkflow",
      description: "bugHuntWorkflowDescription",
      revision: 1,
      builtin: true,
      color: "teal",
      w: 1384,
      h: 476,
      nodes: bugHuntNodes,
      edges: bugHuntEdges,
      ports: [
        {
          id: "in-bug-ref",
          kind: "reference",
          direction: "in",
          name: pick(locale, "报错补充上下文", "Extra repro context"),
          nodes: ["slot-bug-locator"],
          hidden: false,
        },
        {
          id: "out-bug-fix",
          kind: "continuation",
          direction: "out",
          name: pick(locale, "修复完成出口", "Verified fix"),
          nodes: ["slot-bug-fixer"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-release",
      title: "releaseWorkflow",
      description: "releaseWorkflowDescription",
      revision: 2,
      builtin: true,
      color: "blue",
      w: 1016,
      h: 476,
      nodes: releaseNodes,
      edges: releaseEdges,
      ports: [
        {
          id: "in-writer",
          kind: "reference",
          direction: "in",
          name: pick(locale, "补充发布背景", "Release context"),
          nodes: ["slot-rel-correctness", "slot-rel-dx"],
          hidden: false,
        },
        {
          id: "out-proof",
          kind: "continuation",
          direction: "out",
          name: pick(locale, "发布说明", "Release notes"),
          nodes: ["slot-proof"],
          hidden: false,
        },
      ],
    },
    contentFlowTemplate(locale),
    ...playModes.map(mode => playTemplate(locale, mode)),
  ];
}

/**
 * Compact, 100%-localized starter document (~740x468 bounds) that fits comfortably
 * at ~85%-100% zoom on standard screens without triggering LOD card collapse,
 * and without hardcoding non-existent workspace file paths like "README.md".
 */
export function localizedStarterDocument(
  locale: Locale = getLanguage(),
  workspaceCwd?: string,
  workspaceId?: string,
  baseDoc?: FlowspaceDocument,
): FlowspaceDocument {
  const copy = baseDoc ? structuredClone(baseDoc) : emptyDocument();
  const baseX = copy.nodes.length
    ? Math.max(...copy.nodes.map((n) => n.x + n.width)) + 96
    : 56;
  const baseY = 76;
  const placement = {
    ...(workspaceId ? { workspaceId } : {}),
    ...(workspaceCwd ? { cwd: workspaceCwd } : {}),
  };

  const group: FlowNode = {
    ...newNode(
      "group",
      baseX,
      baseY,
      pick(locale, "分析 → 审查 → 汇总交付", "Analyze → Review → Deliver"),
    ),
    color: "blue",
    width: 736,
    height: 468,
    templateId: "builtin-review",
    templateRevision: 2,
    titleKey: "implementationReview",
  };
  delete group.window;

  const specNote: FlowNode = {
    ...tplNote(
      uid(),
      pick(locale, "验收标准", "Guardrails"),
      baseX + 24,
      baseY + 48,
      pick(
        locale,
        "先只读核对真实源码证据，保持结论精炼可验证；确认无误后再放行生成行动清单。",
        "Verify real code facts read-only first; keep findings concrete and pause for review before final checklist.",
      ),
      false,
    ),
    parentId: group.id,
    templateSlotId: "slot-spec-note",
  };

  const analyzeAgent: FlowNode = {
    ...tplAgent(
      uid(),
      pick(locale, "分析项目架构", "Analyze Architecture"),
      baseX + 24,
      baseY + 170,
      pick(
        locale,
        "阅读当前工作区，简要说明项目定位、核心模块分层以及最值得优先改进的一点。先不要修改文件。",
        "Inspect the current workspace, summarize project purpose, core module layers and top improvement opportunity. Do not edit files.",
      ),
      { roleLabel: "implementation", expanded: false, pinned: true },
    ),
    ...placement,
    parentId: group.id,
    templateSlotId: "slot-analyze",
  };

  const reviewAgent: FlowNode = {
    ...tplAgent(
      uid(),
      pick(locale, "独立风险审查", "Adversarial Review"),
      baseX + 24,
      baseY + 312,
      pick(
        locale,
        "审查上游分析建议的可行性，核对代码事实、潜在回归风险与边界条件。不要修改文件。",
        "Audit upstream findings against code evidence, checking feasibility, edge cases and regression risks. Do not edit files.",
      ),
      { roleLabel: "review", downstream: true, expanded: false, pinned: true },
    ),
    ...placement,
    parentId: group.id,
    templateSlotId: "slot-review",
  };

  const deliverAgent: FlowNode = {
    ...tplAgent(
      uid(),
      pick(locale, "可执行行动清单", "Actionable Checklist"),
      baseX + 392,
      baseY + 52,
      pick(
        locale,
        "结合上游分析与审查结论，整理出一份结构清晰、可直接执行的行动清单与验证命令。",
        "Combine upstream analysis and review into a concise, directly executable checklist and verification plan.",
      ),
      { roleLabel: "delivery", downstream: true, expanded: true, pinned: true },
    ),
    ...placement,
    parentId: group.id,
    templateSlotId: "slot-deliver",
  };

  const edges: FlowEdge[] = [
    {
      ...newEdge(specNote.id, reviewAgent.id, "reference"),
      always: true,
    },
    {
      ...newEdge(specNote.id, deliverAgent.id, "reference"),
      always: true,
    },
    {
      ...newEdge(analyzeAgent.id, reviewAgent.id, "continuation"),
      mode: "session",
      trigger: "auto",
    },
    {
      ...newEdge(reviewAgent.id, deliverAgent.id, "continuation"),
      mode: "conclusion",
      trigger: "confirm",
    },
  ];

  group.ports = [
    {
      id: uid(),
      kind: "continuation",
      direction: "in",
      name: pick(locale, "启动分析", "Start analysis"),
      nodes: [analyzeAgent.id],
      hidden: false,
    },
    {
      id: uid(),
      kind: "continuation",
      direction: "out",
      name: pick(locale, "行动清单", "Action checklist"),
      nodes: [deliverAgent.id],
      hidden: false,
    },
  ];

  copy.nodes.push(group, specNote, analyzeAgent, reviewAgent, deliverAgent);
  copy.edges.push(...edges);
  return copy;
}

export function allTemplates(
  doc: FlowspaceDocument,
  locale: Locale = getLanguage(),
): WorkflowTemplate[] {
  return [...builtinTemplates(locale), ...(doc.templates ?? [])];
}

export function captureTemplate(
  doc: FlowspaceDocument,
  groupId: string,
  title: string,
  description: string,
  teams: TeamBlueprint[] = [],
): WorkflowTemplate {
  const group = doc.nodes.find((n) => n.id === groupId && n.kind === "group");
  if (!group) throw new Error(t("groupNotFound"));
  const descendants = new Set(groupDescendants(doc, group.id));
  const authored = doc.nodes.filter(node => descendants.has(node.id) && !node.generatedBy);
  const inside = new Set(authored.map(node => node.id));
  const slotOf = new Map<string, string>();
  const usedSlots = new Set<string>();
  for (const node of authored) {
    const preferred = node.templateSlotId ?? node.id;
    const slot = usedSlots.has(preferred) ? node.id : preferred;
    slotOf.set(node.id, slot);
    usedSlots.add(slot);
  }

  const nodes = authored
    .map((n) => {
      const slot = slotOf.get(n.id)!;
      const clone = structuredClone(n);
      if (clone.fanout) clone.height = authoredPairHeight(n, doc.nodes);
      remapLaneNode(clone, slotOf);
      if (clone.staffOf) clone.staffOf = slotOf.get(clone.staffOf);
      if (clone.ports) clone.ports = remapGroupPorts(clone.ports, slotOf);
      const revision = clone.teamRef && teams.find((team) => team.id === clone.teamRef?.teamId)?.revision;
      if (clone.teamRef && revision !== undefined) clone.teamRef.revision = revision;
      /* Strip all machine/session-bound state so exported templates stay portable */
      stripForPortableTemplate(clone);
      return {
        ...clone,
        id: slot,
        templateSlotId: slot,
        parentId:
          n.parentId === group.id
            ? undefined
            : n.parentId
              ? slotOf.get(n.parentId)
              : undefined,
        sourceNodeId:
          n.sourceNodeId && inside.has(n.sourceNodeId)
            ? slotOf.get(n.sourceNodeId)
            : undefined,
        x: n.x - group.x,
        y: n.y - group.y,
        draft: n.task || n.draft,
      };
    });

  const edges = doc.edges
    .filter((e) => !e.generatedBy && inside.has(e.source) && inside.has(e.target))
    .map((e) => {
      const clone = stripEdgeForPortableTemplate(structuredClone(e));
      return {
        ...clone,
        id: uid(),
        source: slotOf.get(e.source)!,
        target: slotOf.get(e.target)!,
        waypoints: e.waypoints?.map((p) => ({
          x: p.x - group.x,
          y: p.y - group.y,
        })),
      };
    });

  /* Preserve customized group.ports (order, custom labels, hidden, merged targets) */
  const ports: GroupPort[] = inferGroupPorts(doc, group)
    .map((p) => {
      const mappedTargets = p.nodes
        .filter((id) => inside.has(id))
        .map((id) => slotOf.get(id)!);
      return {
        ...structuredClone(p),
        id: p.id,
        nodes: mappedTargets,
      };
    })
    .filter((p) => p.nodes.length > 0);

  return {
    id: uid(),
    title,
    description,
    revision: 1,
    color: group.color ?? "blue",
    w: group.width,
    h: authoredPairHeight(group, doc.nodes),
    ...(group.fanout ? { fanout: remapFanout(group.fanout, slotOf) } : {}),
    nodes,
    edges,
    ports,
  };
}

export function teamDependenciesFor(nodes: FlowNode[], snapshot: FlowspaceSnapshot | null): TeamDependencies {
  const teamIds = new Set(nodes.flatMap((node) => node.teamRef ? [node.teamRef.teamId] : []));
  const teams = (snapshot?.teamBlueprints ?? []).filter((team) => teamIds.has(team.id));
  const roleIds = new Set([
    ...teams.flatMap((team) => team.slots.map((slot) => slot.roleId)),
    ...nodes.flatMap((node) => node.kind === "role" && node.roleRef ? [node.roleRef] : []),
  ]);
  const roles = (snapshot?.roles ?? []).filter((role) => roleIds.has(role.id));
  return { teams, roles };
}

export function teamRevisionDifferences(template: WorkflowTemplate, teams: TeamBlueprint[] = []) {
  const references = new Map(template.nodes.flatMap((node) => node.teamRef
    ? [[node.teamRef.teamId, node.teamRef.revision] as const] : []));
  return teams.flatMap((team) => {
    const saved = references.get(team.id);
    return saved !== undefined && team.revision > saved
      ? [{ id: team.id, title: team.title, saved, current: team.revision }] : [];
  });
}

export function instantiateTemplate(
  doc: FlowspaceDocument,
  template: WorkflowTemplate,
  x: number,
  y: number,
  displayTitle: string,
  placement?: { workspaceId?: string; cwd?: string },
): FlowNode {
  const group: FlowNode = {
    ...newNode("group", x, y, displayTitle),
    color: template.color ?? "blue",
    width: template.w,
    height: template.h,
    templateId: template.id,
    templateRevision: template.revision,
    ...(template.builtin ? { titleKey: template.title } : {}),
  };
  delete group.window;

  const idMap = new Map<string, string>();
  for (const n of template.nodes) {
    idMap.set(n.templateSlotId ?? n.id, uid());
    idMap.set(n.id, idMap.get(n.templateSlotId ?? n.id)!);
  }
  if (template.fanout) group.fanout = remapFanout(template.fanout, idMap);

  const createdNodes: FlowNode[] = template.nodes.map((n) => {
    const clone = structuredClone(n);
    remapLaneNode(clone, idMap);
    if (clone.ports) clone.ports = remapGroupPorts(clone.ports, idMap);
    stripForFreshInstance(clone);
    const slotKey = n.templateSlotId ?? n.id;
    return {
      ...clone,
      id: idMap.get(slotKey)!,
      templateSlotId: slotKey,
      parentId: n.parentId ? (idMap.get(n.parentId) ?? group.id) : group.id,
      sourceNodeId: n.sourceNodeId
        ? (idMap.get(n.sourceNodeId) ?? n.sourceNodeId)
        : undefined,
      staffOf: n.staffOf ? idMap.get(n.staffOf) : undefined,
      slotId: n.staffOf && idMap.has(n.staffOf) ? n.slotId : undefined,
      x: x + n.x,
      y: y + n.y,
      ...(n.kind === "agent"
        ? {
            ...(placement?.workspaceId
              ? { workspaceId: placement.workspaceId }
              : {}),
            ...(placement?.cwd ? { cwd: placement.cwd } : {}),
            draft: n.task || n.draft,
            continuationPrompt: n.continuationPrompt ?? n.task,
          }
        : (n.kind === "git" || n.kind === "file") && placement?.cwd
          ? { cwd: placement.cwd }
          : {}),
    };
  });

  const createdEdges: FlowEdge[] = template.edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) => ({
      ...structuredClone(e),
      id: uid(),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      waypoints: e.waypoints?.map((p) => ({ x: x + p.x, y: y + p.y })),
    }));

  group.ports = remapGroupPorts(template.ports, idMap);

  doc.nodes.push(group, ...createdNodes);
  doc.edges.push(...createdEdges);
  return group;
}

export interface SyncPlan {
  template: WorkflowTemplate;
  outside: number;
  locked: FlowNode[];
  added: FlowNode[];
  removed: FlowNode[];
  edited: FlowNode[];
}

function remapGroupPorts(ports: GroupPort[], ids: ReadonlyMap<string, string>, previous: GroupPort[] = [],
  keepNames = false): GroupPort[] {
  return ports.flatMap(port => {
    const nodes = port.nodes.map(id => ids.get(id)).filter((id): id is string => !!id);
    if (!nodes.length) return [];
    const prior = previous.find(old => old.kind === port.kind && old.direction === port.direction &&
      old.portId === port.portId && old.nodes.length === nodes.length && nodes.every(id => old.nodes.includes(id)));
    return [{ ...structuredClone(port), id: prior?.id ?? uid(), nodes,
      hidden: prior?.hidden ?? port.hidden, name: keepNames && prior ? prior.name : port.name }];
  });
}

export function computeSyncPlan(
  doc: FlowspaceDocument,
  group: FlowNode,
  template: WorkflowTemplate,
): SyncPlan {
  const desc = groupDescendants(doc, group.id);
  const inside = new Set(desc);
  const members = doc.nodes.filter((n) => inside.has(n.id) && !n.generatedBy);
  const outside = doc.edges.filter(
    (e) => inside.has(e.source) !== inside.has(e.target),
  ).length;
  const slots = new Set(template.nodes.map((n) => n.templateSlotId ?? n.id));
  const memberSlots = new Set(members.map((n) => n.templateSlotId ?? ""));
  const added = template.nodes.filter(
    (n) => !memberSlots.has(n.templateSlotId ?? n.id),
  );
  const removed = members.filter(
    (n) => n.templateSlotId && !slots.has(n.templateSlotId) && !n.sessionId,
  );
  const locked = members.filter((n) => !!n.sessionId);
  const edited = members.filter((n) => {
    const src = template.nodes.find(
      (t) => (t.templateSlotId ?? t.id) === n.templateSlotId,
    );
    return src && n.kind === "agent" && n.task !== src.task;
  });
  return { template, outside, locked, added, removed, edited };
}

export function synchronizeTemplate(
  doc: FlowspaceDocument,
  groupId: string,
  template: WorkflowTemplate,
  keepTasks: boolean,
  placement?: { workspaceId?: string; cwd?: string },
): void {
  const group = doc.nodes.find((n) => n.id === groupId && n.kind === "group");
  if (!group) return;
  const desc = groupDescendants(doc, group.id);
  const inside = new Set(desc);
  const existingBySlot = new Map<string, FlowNode>();
  for (const n of doc.nodes) {
    if (inside.has(n.id) && !n.generatedBy && n.templateSlotId) {
      existingBySlot.set(n.templateSlotId, n);
    }
  }

  /* Pass 1: Pre-allocate stable slot -> nodeId map so nested subgroups resolve in any order */
  const slotToNodeId = new Map<string, string>();
  for (const src of template.nodes) {
    const slot = src.templateSlotId ?? src.id;
    const existing = existingBySlot.get(slot);
    const assignedId = existing ? existing.id : uid();
    slotToNodeId.set(slot, assignedId);
    slotToNodeId.set(src.id, assignedId);
  }

  const upgradingTddGate = group.templateId === "builtin-tdd-loop" && template.id === group.templateId &&
    (group.templateRevision ?? 1) < 2 && template.revision >= 2;
  group.width = template.w;
  group.height = template.h;
  group.templateRevision = template.revision;
  if (group.fanout || template.fanout) group.fanout = remapFanout(template.fanout, slotToNodeId);

  /* Pass 2: Update existing slots in-place and insert newly added template slots */
  for (const src of template.nodes) {
    const slot = src.templateSlotId ?? src.id;
    const existing = existingBySlot.get(slot);
    const resolvedParentId = src.parentId
      ? (slotToNodeId.get(src.parentId) ?? group.id)
      : group.id;
    const resolvedSourceNodeId = src.sourceNodeId
      ? (slotToNodeId.get(src.sourceNodeId) ?? src.sourceNodeId)
      : undefined;

    if (existing) {
      existing.parentId = resolvedParentId;
      if (existing.fanout || src.fanout) existing.fanout = remapFanout(src.fanout, slotToNodeId);
      if (existing.masterOf || src.masterOf) existing.masterOf = src.masterOf && slotToNodeId.get(src.masterOf);
      if (src.ports) existing.ports = remapGroupPorts(src.ports, slotToNodeId, existing.ports, keepTasks);
      existing.x = group.x + src.x;
      existing.y = group.y + src.y;
      existing.width = src.width;
      existing.height = src.height;
      if (resolvedSourceNodeId) existing.sourceNodeId = resolvedSourceNodeId;
      if (upgradingTddGate && slot === "slot-tdd-verifier" && (existing.sessionId || keepTasks)) {
        // R1 preserves the session and authored task. Only the continuation
        // that feeds the new gate needs its machine-readable output contract.
        const contract = (["zh", "en"] as const).map(locale => tFor(locale, "flow_tdd_marker"))
          .find(text => src.continuationPrompt?.endsWith(text));
        const prompt = existing.continuationPrompt?.trim() ? existing.continuationPrompt :
          (existing.sessionId ? existing.task || existing.draft : existing.draft || existing.task);
        if (contract && !prompt.endsWith(contract)) existing.continuationPrompt = [prompt, contract].filter(Boolean).join("\n\n");
      }
      if (!keepTasks && !existing.sessionId) {
        syncTemplateAuthoredFields(existing, src);
        existing.staffOf = src.staffOf ? slotToNodeId.get(src.staffOf) : undefined;
      }
    } else {
      const freshId = slotToNodeId.get(slot)!;
      const clone = structuredClone(src);
      remapLaneNode(clone, slotToNodeId);
      if (clone.ports) clone.ports = remapGroupPorts(clone.ports, slotToNodeId);
      if (clone.staffOf) clone.staffOf = slotToNodeId.get(clone.staffOf);
      stripForFreshInstance(clone);
      doc.nodes.push({
        ...clone,
        id: freshId,
        templateSlotId: slot,
        parentId: resolvedParentId,
        sourceNodeId: resolvedSourceNodeId,
        x: group.x + src.x,
        y: group.y + src.y,
        ...(src.kind === "agent"
          ? {
              ...(placement?.workspaceId
                ? { workspaceId: placement.workspaceId }
                : {}),
              ...(placement?.cwd ? { cwd: placement.cwd } : {}),
              draft: src.task || src.draft,
            }
          : (src.kind === "git" || src.kind === "file") && placement?.cwd
            ? { cwd: placement.cwd }
            : {}),
      });
    }
  }

  const templateSlots = new Set(
    template.nodes.map((n) => n.templateSlotId ?? n.id),
  );
  const dropIds = new Set(
    doc.nodes
      .filter(
        (n) =>
          inside.has(n.id) &&
          !n.generatedBy &&
          n.templateSlotId &&
          !templateSlots.has(n.templateSlotId) &&
          !n.sessionId,
      )
      .map((n) => n.id),
  );
  if (dropIds.size) {
    doc.nodes = doc.nodes.filter((n) => !dropIds.has(n.id));
    doc.edges = doc.edges.filter(
      (e) => !dropIds.has(e.source) && !dropIds.has(e.target),
    );
  }

  const mappedIds = new Set(slotToNodeId.values());
  const oldInternal = doc.edges.filter(
    (e) => mappedIds.has(e.source) && mappedIds.has(e.target),
  );
  doc.edges = doc.edges.filter(
    (e) => !(mappedIds.has(e.source) && mappedIds.has(e.target)),
  );
  for (const e of template.edges) {
    const source = slotToNodeId.get(e.source),
      target = slotToNodeId.get(e.target);
    if (!source || !target) continue;
    const prev = oldInternal.find(
      (o) => o.source === source && o.target === target && o.kind === e.kind &&
        o.sourcePort === e.sourcePort && o.targetPort === e.targetPort,
    );
    doc.edges.push({
      ...structuredClone(e),
      id: prev?.id ?? uid(),
      source,
      target,
      sentVersion: prev?.sentVersion,
      originMode: prev?.originMode,
      mode: prev?.originMode === "fork" ? prev.mode : e.mode,
      waypoints:
        prev?.waypoints ??
        e.waypoints?.map((p) => ({ x: group.x + p.x, y: group.y + p.y })),
    });
  }

  group.ports = remapGroupPorts(template.ports, slotToNodeId, group.ports, keepTasks);
}

export function buildSnapshot(
  doc: FlowspaceDocument,
  hostSnapshot: FlowspaceSnapshot | null,
  title: string,
): CanvasSnapshot {
  const agents = doc.nodes.filter((n) => n.kind === "agent");
  const drafts = agents.filter(
    (n) => !n.sessionId && (n.draft.trim() || n.task.trim()),
  ).length;
  const stopping = hostSnapshot?.live.filter((l) => l.running).length ?? 0;
  const awaiting =
    (hostSnapshot?.runs
      .filter((r) => ["running", "waiting", "paused"].includes(r.state))
      .reduce(
        (sum, r) =>
          sum +
          r.tokens.filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed)
            .length,
        0,
      ) ?? 0) +
    (hostSnapshot?.live.filter((l) => l.pendingInput.length > 0).length ?? 0);
  const queued =
    hostSnapshot?.runs
      .filter((r) => r.state === "running")
      .reduce(
        (sum, r) => sum + r.steps.filter((s) => s.state === "queued").length,
        0,
      ) ?? 0;
  const recentOutputs = (hostSnapshot?.runs ?? [])
    .flatMap((r) =>
      r.steps
        .filter((s) => s.state === "completed" && s.output)
        .map((s) => ({
          title:
            r.graph.nodes.find((n) => n.id === s.nodeId)?.title ?? s.nodeId,
          snippet: s.output!.slice(0, 72),
        })),
    )
    .slice(-3)
    .toReversed();

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
      recentOutputs,
    },
  };
}
