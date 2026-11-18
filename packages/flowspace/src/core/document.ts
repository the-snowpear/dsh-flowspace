import type {
  BoardColumn,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
} from "../types.ts";

export const uid = (): string => crypto.randomUUID();
export function emptyDocument(): FlowspaceDocument {
  return {
    version: 1,
    id: "main",
    title: "FlowSpace",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { nativeChatTriggers: true, reducedMotion: false },
  };
}

const DEFAULT_DIMS: Record<FlowNode["kind"], [number, number]> = {
  agent: [312, 392],
  note: [276, 200],
  file: [300, 286],
  display: [300, 252],
  group: [1152, 474],
  board: [520, 310],
  detail: [340, 362],
  git: [380, 376],
  changes: [340, 318],
  terminal: [360, 300],
};

export function boardSummaryText(
  columns: BoardColumn[],
  selectedIds?: string[],
): string {
  const chosen = selectedIds?.length ? new Set(selectedIds) : null;
  const lines: string[] = [];
  for (const col of columns) {
    const cards = chosen
      ? col.cards.filter((c) => chosen.has(c.id))
      : col.cards;
    if (!cards.length) continue;
    lines.push(`[${col.name}]`);
    for (const card of cards) lines.push(`- ${card.text}`);
  }
  return lines.join("\n");
}

/** Derive an auto-title from the first non-empty line of a draft prompt (D38). */
export function deriveDraftTitle(
  prompt: string,
  fallback = "新 Agent",
): string {
  const first = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/^[#>*\-\s]+/, "").trim())
    .find(Boolean);
  if (!first) return fallback;
  return first.length > 36 ? `${first.slice(0, 36)}…` : first;
}

export function newNode(
  kind: FlowNode["kind"],
  x: number,
  y: number,
  title?: string,
): FlowNode {
  const [width, height] = DEFAULT_DIMS[kind] ?? [312, 260];
  const columns: BoardColumn[] | undefined =
    kind === "board"
      ? [
          {
            id: uid(),
            name: "待办",
            cards: [{ id: uid(), text: "梳理核心需求与验收边界" }],
          },
          { id: uid(), name: "进行中", cards: [] },
          { id: uid(), name: "完成", cards: [] },
        ]
      : undefined;
  return {
    id: uid(),
    kind,
    title:
      title ??
      {
        agent: "新 Agent",
        note: "便签",
        file: "文件引用",
        display: "展示结果",
        group: "工作流",
        board: "任务看板",
        detail: "执行详情",
        git: "Git 仓库",
        changes: "轮次改动",
        terminal: "终端快照",
      }[kind],
    x,
    y,
    width,
    height,
    expanded:
      kind === "agent" ||
      kind === "board" ||
      kind === "detail" ||
      kind === "git",
    task: "",
    draft: "",
    nativeTrigger: "inherit",
    participation: "global",
    text: columns ? boardSummaryText(columns) : "",
    fixed: kind !== "detail",
    collapsed: false,
    ...(title ? { customTitle: true } : {}),
    ...(kind === "agent"
      ? { tab: "task" as const, rerun: "change" as const }
      : {}),
    ...(kind === "git" ? { gitTab: "changes" as const } : {}),
    ...(kind === "group" ? { color: "blue" as const, ports: [] } : {}),
    ...(columns ? { columns, selectedItems: [] } : {}),
  };
}
export function newEdge(
  source: string,
  target: string,
  kind: FlowEdge["kind"],
): FlowEdge {
  return {
    id: uid(),
    source,
    target,
    kind,
    mode: "conclusion",
    trigger: kind === "reference" ? "off" : "auto",
    maxRounds: 3,
    always: false,
    waypoints: [],
  };
}
export function members(doc: FlowspaceDocument, groupId: string): string[] {
  return doc.nodes
    .filter((n) => n.parentId === groupId)
    .flatMap((n) => (n.kind === "group" ? members(doc, n.id) : [n.id]));
}
export function groupDescendants(
  doc: FlowspaceDocument,
  groupId: string,
): string[] {
  return doc.nodes
    .filter((n) => n.parentId === groupId)
    .flatMap((n) => [
      n.id,
      ...(n.kind === "group" ? groupDescendants(doc, n.id) : []),
    ]);
}
export function sample(
  doc: FlowspaceDocument,
  kind: "review" | "parallel",
  placement?: { workspaceId?: string; cwd?: string },
  availableFiles?: string[],
): FlowspaceDocument {
  const copy = structuredClone(doc);
  const baseX = copy.nodes.length
    ? Math.max(...copy.nodes.map((n) => n.x + n.width)) + 132
    : 40;
  const baseY = 194;
  const group = {
    ...newNode(
      "group",
      baseX - 24,
      baseY - 54,
      kind === "review" ? "分析与审查工作流" : "并行调查工作流",
    ),
    color: (kind === "review" ? "blue" : "teal") as "blue" | "teal",
    width: kind === "review" ? 1152 : 756,
    height: 474,
  };
  const prompts =
    kind === "review"
      ? [
          [
            "分析项目",
            "阅读当前工作区，简要说明项目用途、核心架构与最值得改进的一点。先不要修改文件。",
            "implementation",
            true,
          ],
          [
            "审查建议",
            "审查上游建议的可行性，核对证据、边界风险与不足。先不要修改文件。",
            "review",
            true,
          ],
          [
            "汇总结论",
            "结合上游审查结论，给出结构清晰、可执行的行动清单。",
            "delivery",
            true,
          ],
        ]
      : [
          [
            "探索架构",
            "阅读工作区，概括整体架构、核心模块与数据流。不要修改文件。",
            "implementation",
            false,
          ],
          [
            "调查验证",
            "阅读工作区，概括测试覆盖、类型检查与集成验证方式。不要修改文件。",
            "implementation",
            false,
          ],
          [
            "汇总结论",
            "等两路调查完成，综合整理出一份有明确下一步建议的项目概览。",
            "review",
            true,
          ],
        ];
  const nodes = prompts.map(([title, task, roleLabel, full], i) => ({
    ...newNode(
      "agent",
      baseX + (kind === "parallel" ? (i === 2 ? 396 : 0) : i * 396),
      kind === "parallel"
        ? i === 0
          ? baseY + 12
          : i === 1
            ? baseY + 214
            : baseY
        : baseY,
      title as string,
    ),
    ...placement,
    parentId: group.id,
    expanded: full as boolean,
    roleLabel: roleLabel as string,
    task: task as string,
    draft: task as string,
    continuationPrompt: i > 0 ? (task as string) : undefined,
  }));
  const fileItems =
    availableFiles !== undefined
      ? availableFiles.slice(0, 4)
      : ["README.md", "package.json"];
  const firstFile = fileItems[0] ?? "";
  const fileCard = {
    ...newNode("file", baseX, baseY - 146, "工作区文件"),
    ...placement,
    items: fileItems,
    selectedItems: firstFile ? [firstFile] : [],
    text: firstFile,
    expanded: false,
    pinned: true,
  };
  const note = {
    ...newNode(
      "note",
      baseX + (kind === "review" ? 460 : 300),
      baseY - 160,
      "验收标准",
    ),
    text: "先只读核对代码事实，保持结论精炼可验证；确认无误后再放行整理交付清单。",
    expanded: false,
    pinned: true,
  };
  const edges =
    kind === "review"
      ? [
          newEdge(nodes[0].id, nodes[1].id, "continuation"),
          {
            ...newEdge(nodes[1].id, nodes[2].id, "continuation"),
            trigger: "confirm" as const,
          },
          ...(firstFile
            ? [newEdge(fileCard.id, nodes[1].id, "reference")]
            : [newEdge(note.id, nodes[1].id, "reference")]),
          newEdge(note.id, nodes[2].id, "reference"),
        ]
      : [
          newEdge(nodes[0].id, nodes[2].id, "continuation"),
          newEdge(nodes[1].id, nodes[2].id, "continuation"),
          ...(firstFile
            ? [newEdge(fileCard.id, nodes[0].id, "reference")]
            : []),
          newEdge(note.id, nodes[2].id, "reference"),
        ];
  copy.nodes.push(group, fileCard, note, ...nodes);
  copy.edges.push(...edges);
  return copy;
}
