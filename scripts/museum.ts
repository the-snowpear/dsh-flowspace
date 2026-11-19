import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  boardSummaryText,
  emptyDocument,
  newEdge,
  newNode,
  uid,
} from "../packages/flowspace/src/core/document.ts";
import { expandedGroupBox } from "../packages/flowspace/src/client/geometry.ts";
import { tFor } from "../packages/flowspace/src/client/i18n.ts";
import {
  buildSnapshot,
  builtinTemplates,
  instantiateTemplate,
} from "../packages/flowspace/src/client/templates.ts";
import type { FlowNode, FlowspaceDocument } from "../packages/flowspace/src/types.ts";
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

export function addCollaborationGallery(
  doc: FlowspaceDocument,
  placement: { cwd: string; workspaceId: string },
): void {
  if (doc.nodes.some((node) => node.id === collaborationGroupId)) return;

  const width = 1016;
  const y = 132 + Math.max(0, ...doc.nodes
    .filter((node) => node.x < width && node.x + node.width > 0)
    .map((node) => {
      if (node.kind !== "group") return node.y + node.height;
      const box = expandedGroupBox(doc, node);
      return box.y + box.h;
    }));
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
  if (statSync(marker, { throwIfNoEntry: false })) return false;

  // Host recovery already writes the empty default canvas on first boot.
  // Also preserve a document saved just before an interrupted initialization.
  const { document, runs } = ctx.flowspace.snapshot();
  const fresh =
    document.title === emptyDocument().title &&
    !document.nodes.length &&
    !document.templates?.length &&
    !document.snapshots?.length &&
    !runs.length;
  if (fresh) {
    const cwd = await prepareMuseumCollection(workspace);
    const project = await ctx.workspaceRegistry.create(cwd, "馆藏工作区");
    await ctx.flowspace.save(createMuseumDocument(cwd, project.id));
  }
  await writeFile(marker, "");
  return fresh;
}
