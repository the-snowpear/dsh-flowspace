import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  boardSummaryText,
  emptyDocument,
  newEdge,
  newFlowNode,
  newNode,
  uid,
} from "../packages/flowspace/src/core/document.ts";
import { expandedGroupBox, nodeBox } from "../packages/flowspace/src/client/geometry.ts";
import { tFor } from "../packages/flowspace/src/client/i18n.ts";
import {
  buildSnapshot,
  builtinTemplates,
  contentFlowTemplateId,
  instantiateTemplate,
} from "../packages/flowspace/src/client/templates.ts";
import type { FlowEdge, FlowNode, FlowspaceDocument } from "../packages/flowspace/src/types.ts";
import type { FlowspaceService } from "../packages/flowspace/src/index.ts";

const exec = promisify(execFile);
const catalog = "catalog.md";
const checklist = "checklist.md";
const originalLabel = "展品：机械星图";
const revisedLabel = "展品：机械星图 · 可转动的北半球夜空";
const catalogText = (label: string) =>
  `# 馆藏目录\n\n${label}\n\n展签需包含名称、可观察的特征，以及一个留给访客的问题。\n`;

export const collaborationLeadId = "museum-collaboration-lead";
export const collaborationChildId = "museum-collaboration-child";
const collaborationGroupId = "museum-collaboration";
const controlFlowGroupId = "museum-control-flow";
const extensionGalleryId = "museum-extended-workflows";

function nextGalleryY(doc: FlowspaceDocument, width: number): number {
  const boxes = doc.nodes
    .filter(node => !node.parentId)
    .map(node => node.kind === "group" ? expandedGroupBox(doc, node) : nodeBox(node));
  return 132 + Math.max(0, ...boxes
    .filter(box => box.x < width && box.x + box.w > 0)
    .map(box => box.y + box.h));
}

export function addCollaborationGallery(
  doc: FlowspaceDocument,
  placement: { cwd: string; workspaceId: string },
): void {
  if (doc.nodes.some((node) => node.id === collaborationGroupId)) return;

  const width = 1016;
  const y = nextGalleryY(doc, width);
  const group: FlowNode = {
    ...newNode("group", 0, y, "协作展区 · 消息线与子代理"),
    id: collaborationGroupId,
    color: "violet",
    width,
    height: 320,
  };
  const note = {
    ...newNode("note", 24, y + 58, "协作记录"),
    parentId: group.id,
    pinned: true,
    text: "点消息线上的气泡，查看消息正文和方向。\n\n馆长下方展开了子代理树。右边的会话卡绑定的是同一个子代理，可查看完整对话。",
  };
  const agent = (id: string, x: number, title: string): FlowNode => ({
    ...newNode("agent", x, y + 58, title),
    ...placement,
    id,
    parentId: group.id,
    expanded: false,
    nativeTrigger: "disabled",
  });
  const lead = {
    ...agent(collaborationLeadId, 340, "馆长 Agent"),
    subAgentsExpanded: true,
  };
  const child = agent(collaborationChildId, 706, "展签核对子代理");
  const firstTemplate = doc.nodes.findIndex((node) => node.templateId && !node.parentId);
  doc.nodes.splice(firstTemplate < 0 ? doc.nodes.length : firstTemplate, 0, group, note, lead, child);
}

function addControlFlowGallery(
  doc: FlowspaceDocument,
  placement: { cwd: string; workspaceId: string },
): void {
  const width = 1464;
  const y = nextGalleryY(doc, width);
  const group: FlowNode = {
    ...newNode("group", 0, y, "控制流展区 · 展签审核"),
    id: controlFlowGroupId,
    color: "violet",
    width,
    height: 770,
  };

  const guide = {
    ...newNode("note", 24, y + 62, "参观指南 · 展签审核"),
    width: 304,
    text: "点分组右上角「启动」。展签依次经过关键词、格式和 AI 审核，然后等你决定发布或退回。\n\n点击接续线可查看命中的出口与输入快照。",
  };
  const agent = (x: number, row: number, title: string, task: string, downstream = false): FlowNode => ({
    ...newNode("agent", x, y + row, title),
    ...placement,
    task,
    draft: task,
    ...(downstream ? { continuationPrompt: task } : { rerun: "always" }),
    expanded: false,
  });
  const judge = (type: string, x: number, row: number, title: string, config: FlowNode["config"]): FlowNode => ({
    ...newFlowNode(type, x, y + row),
    title,
    titleKey: undefined,
    config,
  });
  const author = agent(384, 62, "拟写机械星图展签",
    "为机械星图拟写一张展签。写出展品名称与转动圆盘时可观察到的变化，最后用一个问题邀请访客动手。限 140 字。");
  const condition = judge("flowspace/condition", 744, 62, "关键词检查", {
    branches: [{ id: "pass", label: "关键词齐全", match: "all", rules: [
      { field: "text", op: "contains", value: "机械星图" },
      { field: "text", op: "contains", value: "圆盘" },
    ] }],
  });
  const code = judge("flowspace/code", 1104, 62, "展签格式检查", {
    source: "(input) => {\n  const label = input.text.trim();\n  return label.length <= 140 && /[？?]$/u.test(label);\n}",
    timeoutMs: 1000,
    branches: [{ id: "pass", label: "格式合格" }],
  });
  const ai = judge("flowspace/ai-judge", 384, 378, "AI 展签初审", {
    provider: "flowspace-test",
    model: "deterministic",
    instruction: "检查展签是否让第一次见到机械星图的访客知道如何操作，并给出理由。",
    branches: [
      { id: "pass", label: "建议发布", description: "操作说明清楚，适合展出。" },
      { id: "review", label: "需要复核", description: "操作说明有歧义，请馆长复核。" },
    ],
    lowConfidence: { threshold: 0.8, branch: "review" },
  });
  const human = judge("flowspace/human-choice", 744, 378, "馆长决定", {
    question: "这张机械星图展签可以发布到展厅吗？",
    options: [{ id: "publish", label: "发布展签" }, { id: "revise", label: "退回修改" }],
    timeoutAction: "wait",
  });
  const publish = agent(1104, 378, "记录发布", "为这张已通过的展签写一句发布记录。", true);
  const revise = agent(1104, 526, "记录退回", "为这张被退回的展签写一句修改建议。", true);
  const connect = (source: FlowNode, target: FlowNode, ports: Partial<FlowEdge> = {}) => ({
    ...newEdge(source.id, target.id, "continuation"),
    ...ports,
  });
  const nodes = [guide, author, condition, code, ai, human, publish, revise]
    .map(node => ({ ...node, parentId: group.id }));
  const firstTemplate = doc.nodes.findIndex(node => node.templateId && !node.parentId);
  doc.nodes.splice(firstTemplate < 0 ? doc.nodes.length : firstTemplate, 0, group, ...nodes);
  doc.edges.push(
    connect(author, condition, { targetPort: "in" }),
    connect(condition, code, { sourcePort: "pass", targetPort: "in" }),
    connect(code, ai, {
      sourcePort: "pass", targetPort: "in", logic: { delayMs: 1200 },
      waypoints: [{ x: 1440, y: y + 318 }, { x: 360, y: y + 318 }],
    }),
    connect(ai, human, { sourcePort: "pass", targetPort: "in" }),
    connect(ai, human, { sourcePort: "review", targetPort: "in" }),
    connect(human, publish, { sourcePort: "publish" }),
    connect(human, revise, { sourcePort: "revise" }),
  );
}

export async function prepareMuseumCollection(workspace: string): Promise<string> {
  const cwd = join(workspace, "collection");
  await mkdir(cwd, { recursive: true });
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)),
  );
  const git = (...args: string[]) =>
    exec("git", ["-c", "core.hooksPath=.git/museum-hooks", ...args], { cwd, env, windowsHide: true });

  await git("init", "--template=", "-b", "main");
  // The museum document is saved after the fixture. Retry setup if startup
  // stopped before the first commit, while preserving an existing collection.
  const hasHistory = await git("rev-parse", "--verify", "HEAD").then(
    () => true,
    () => false,
  );
  if (!hasHistory) {
    await writeFile(join(cwd, catalog), catalogText(originalLabel));
    await writeFile(join(cwd, checklist), "# 开馆清单\n\n- 核对展品名称\n- 复核展签\n- 发布导览\n");
    await git("add", "--", catalog, checklist);
    await git("-c", "user.name=FlowSpace Museum", "-c", "user.email=museum@example.invalid",
      "-c", "commit.gpgsign=false", "commit", "-m", "登记馆藏与开馆清单");
  }
  await git("branch", "--list", "exhibit/layout").then(({ stdout }) =>
    stdout.trim() ? undefined : git("branch", "exhibit/layout"),
  );
  // If setup was interrupted, add the working-tree exhibit only to a clean copy.
  const { stdout } = await git("status", "--porcelain", "--", catalog);
  if (!stdout.trim()) {
    await writeFile(join(cwd, catalog), catalogText(revisedLabel));
  }
  return cwd;
}

export function createMuseumDocument(cwd: string, workspaceId: string) {
  const doc = emptyDocument();
  doc.title = "FlowSpace 博物馆";
  doc.viewport = { x: 36, y: 58, zoom: 0.86 };
  doc.prefs = { filter: "all" };
  const placement = { cwd, workspaceId };

  const entrance = {
    ...newNode("group", 0, 0, "参观入口 · 引用与接续"),
    color: "teal" as const,
    width: 1090,
    height: 560,
  };
  const guide = {
    ...newNode("note", 24, 58, "参观指南"),
    text: "点分组右上角「启动」试跑。\n按 F 看全馆，或展开左侧栏跳转展区。\n\n展签规范：写明名称与可观察的特征，再留一个问题。",
  };
  const authorTask = "根据引用的展签规范，为机械星图写一张简短展签。";
  const reviewerTask = "检查上游展签是否包含名称、可观察的特征和一个问题，给出发布结论。";
  const author = {
    ...newNode("agent", 380, 58, "展签撰写"),
    ...placement,
    task: authorTask,
    draft: authorTask,
  };
  const reviewer = {
    ...newNode("agent", 752, 58, "展签复核"),
    ...placement,
    task: reviewerTask,
    draft: reviewerTask,
    continuationPrompt: reviewerTask,
  };
  const display = {
    ...newNode("display", 24, 280, "展签成品 · 固定展示"),
    sourceNodeId: author.id,
    text: "机械星图\n\n转动圆盘，可以观察北半球不同月份的夜空。\n\n如果把日期拨到今天，哪颗星最容易找到？",
  };
  doc.nodes.push(entrance, ...[guide, author, reviewer, display].map((node) => ({
    ...node,
    parentId: entrance.id,
    pinned: true,
  })));
  doc.edges.push(
    { ...newEdge(guide.id, author.id, "reference"), always: true },
    { ...newEdge(author.id, reviewer.id, "continuation"), trigger: "confirm" },
  );

  const tools = {
    ...newNode("group", 0, 690, "工具展区 · 资料与执行"),
    color: "blue" as const,
    width: 1368,
    height: 864,
  };
  const exhibit = (
    kind: FlowNode["kind"],
    x: number,
    y: number,
    title: string,
    props: Partial<FlowNode> = {},
  ) => ({
    ...newNode(kind, tools.x + x, tools.y + y, title),
    parentId: tools.id,
    expanded: true,
    pinned: true,
    ...props,
  });
  const board = exhibit("board", 350, 62, "开馆任务看板");
  const columns = board.columns!;
  columns[0].cards[0].text = "登记下一件藏品";
  columns[1].cards.push({ id: uid(), text: "复核机械星图展签" });
  columns[2].cards.push({ id: uid(), text: "馆藏目录已归档" });
  board.text = boardSummaryText(columns);
  doc.nodes.push(
    tools,
    exhibit("file", 24, 62, "馆藏文件引用", {
      ...placement,
      items: [catalog, checklist],
      selectedItems: [catalog],
      text: catalog,
    }),
    board,
    exhibit("git", 920, 62, "馆藏 Git 仓库", placement),
    exhibit("detail", 24, 486, "展签执行详情", {
      pinned: false,
      sourceNodeId: author.id,
      text: "运行入口工作流后，这里会跟随展签撰写的执行步骤与输出。",
    }),
    exhibit("changes", 425, 486, "轮次改动 · 示例快照", {
      text: `示例 Diff\n\n--- a/${catalog}\n+++ b/${catalog}\n@@ -3,1 +3,1 @@\n-${originalLabel}\n+${revisedLabel}`,
    }),
    exhibit("terminal", 850, 486, "终端 · 示例快照", {
      text: "$ git status --short\n M catalog.md\n\n运行入口 Agent 后，可选中会话并打开终端，读取实时屏幕。",
    }),
  );

  addControlFlowGallery(doc, placement);
  addExtensionGallery(doc, placement);

  // Keep each built-in as a real, independently runnable template instance.
  const templates = builtinTemplates("zh");
  const galleryStart = 1510;
  let y = 0;
  for (let i = 0; i < templates.length; i += 2) {
    let x = galleryStart;
    let nextY = y;
    for (const template of templates.slice(i, i + 2)) {
      const group = instantiateTemplate(doc, template, x, y, tFor("zh", template.title), placement);
      const box = expandedGroupBox(doc, group);
      x += box.w + 132;
      nextY = Math.max(nextY, y + box.h + 132);
    }
    y = nextY;
  }

  doc.snapshots = [buildSnapshot(doc, null, "开馆布展")];
  return doc;
}

export function addExtensionGallery(doc: FlowspaceDocument, placement: { cwd: string; workspaceId: string }): void {
  if (doc.nodes.some(node => node.id === extensionGalleryId)) return;
  const y = nextGalleryY(doc, 1732);
  const group = { ...newNode("group", 0, y, "展签工作台"), id: extensionGalleryId, width: 1732, height: 948, color: "teal" as const };
  const add = (node: FlowNode, id: string, title: string) => {
    Object.assign(node, placement, { id: `${extensionGalleryId}-${id}`, parentId: group.id, title, titleKey: undefined });
    doc.nodes.push(node);
    return node;
  };
  doc.nodes.push(group);
  const start = add(newFlowNode("flowspace/trigger", 24, y + 72), "launch", "登记展签");
  start.config = { ...start.config, fields: [{ name: "exhibit", label: "展品名称", type: "text", required: true }] };
  const review = add(newFlowNode("flowspace/human-review", 384, y + 72), "review", "审阅展签");
  review.config = { ...review.config, question: "补充一个让访客参与的问题。" };
  const notice = add(newFlowNode("flowspace/notice", 744, y + 72), "notice", "审阅通知");
  notice.config = { ...notice.config, message: "展签正在等待人工审阅。" };
  const agent = add(newNode("agent", 1104, y + 72), "author", "整理展签");
  agent.task = "提取展签正文，写成一张适合儿童阅读的展签。";
  agent.continuationPrompt = agent.task;
  agent.breakpoint = true;
  const counter = add(newFlowNode("flowspace/variable", 24, y + 538), "var", "已登记展签");
  counter.config = { name: "labels", type: "number", scope: "canvas", initial: "0" };
  const increment = add(newFlowNode("flowspace/assign", 384, y + 538), "assign", "登记次数加一");
  increment.config = { name: "labels", operation: "increment", value: "1", inputValue: false };
  const terminal = add(newFlowNode("flowspace/exec-terminal", 744, y + 538), "terminal", "查看馆藏 Git 状态");
  terminal.config = { ...terminal.config, program: "git", cwd: placement.cwd, parameters: [
    { name: "command", source: "fixed", value: "status" },
    { name: "porcelain", source: "fixed", value: "--short" },
  ] };
  const board = add(newNode("board", 1104, y + 538), "board", "展签登记看板");
  board.columns = [{ id: "labels", name: "待发布", role: "todo", cards: [] }];
  const links = [[start, review], [review, agent], [agent, increment], [increment, terminal], [agent, board]];
  doc.edges.push(...links.map(([source, target]) => newEdge(source.id, target.id, "continuation")));
  doc.edges.push({ ...newEdge(review.id, notice.id, "event"), event: { mode: "change", kinds: ["waiting"] } });
  doc.edges.push({ ...newEdge(counter.id, agent.id, "reference"), always: true });
  doc.edges.push({ ...newEdge(board.id, agent.id, "reference"), permission: "advance", ask: true });
}

export async function initializeMuseum({ ctx, home, workspace }: {
  ctx: {
    flowspace: Pick<FlowspaceService, "snapshot" | "save">;
    workspaceRegistry: {
      create(path: string, title: string): Promise<{ id: string }>;
    };
  };
  home: string;
  workspace: string;
}): Promise<boolean> {
  const marker = join(home, "museum-initialized");
  const controlFlowMarker = join(home, "museum-control-flow-initialized");
  const contentFlowMarker = join(home, "museum-content-flow-initialized");
  const extensionMarker = join(home, "museum-extensions-initialized");
  if (statSync(extensionMarker, { throwIfNoEntry: false })) return false;
  const hasControlFlow = statSync(controlFlowMarker, { throwIfNoEntry: false });
  const initialized = statSync(marker, { throwIfNoEntry: false });

  // Host recovery already writes the empty default canvas on first boot.
  // Also preserve a document saved just before an interrupted initialization.
  const { document, runs } = ctx.flowspace.snapshot();
  const fresh =
    !initialized &&
    document.title === emptyDocument().title &&
    !document.nodes.length &&
    !document.templates?.length &&
    !document.snapshots?.length &&
    !runs.length;
  if (fresh) {
    const cwd = await prepareMuseumCollection(workspace);
    const project = await ctx.workspaceRegistry.create(cwd, "馆藏工作区");
    await ctx.flowspace.save(createMuseumDocument(cwd, project.id));
  } else if (initialized && document.nodes.length) {
    const cwd = join(workspace, "collection");
    const project = await ctx.workspaceRegistry.create(cwd, "馆藏工作区");
    const placement = { cwd, workspaceId: project.id };
    const templates = builtinTemplates("zh");
    const before = document.nodes.length;
    if (!hasControlFlow && !document.nodes.some(node => node.id === controlFlowGroupId)) {
      addControlFlowGallery(document, placement);
      const tdd = templates.find(template => template.id === "builtin-tdd-loop")!;
      const exhibits = document.nodes.filter(node => node.kind === "group" && node.templateId === tdd.id);
      if (exhibits.length && !exhibits.some(node => (node.templateRevision ?? 1) >= tdd.revision))
        instantiateTemplate(document, tdd, 0, nextGalleryY(document, tdd.w), `${tFor("zh", tdd.title)} · 条件分流版`, placement);
    }
    if (!document.nodes.some(node => node.templateId === contentFlowTemplateId)) {
      const content = templates.find(template => template.id === contentFlowTemplateId)!;
      instantiateTemplate(document, content, 0, nextGalleryY(document, content.w), tFor("zh", content.title), placement);
    }
    addExtensionGallery(document, placement);
    for (const template of templates.filter(template => template.id.startsWith("builtin-play-"))) {
      if (document.nodes.some(node => node.templateId === template.id)) continue;
      instantiateTemplate(document, template, 0, nextGalleryY(document, template.w), tFor("zh", template.title), placement);
    }
    if (document.nodes.length !== before) await ctx.flowspace.save(document);
  }
  if (!initialized) await writeFile(marker, "");
  if (!hasControlFlow) await writeFile(controlFlowMarker, "");
  await writeFile(contentFlowMarker, "");
  await writeFile(extensionMarker, "");
  return fresh;
}
