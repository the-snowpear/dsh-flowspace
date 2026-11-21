import type {
  BoardCard,
  BoardCardPriority,
  BoardChecklistItem,
  BoardColumn,
  BoardColumnColor,
  BoardColumnRole,
  BoardRefScope,
  BoardSettings,
  FlowContent,
  FlowEdge,
  FlowNode,
  JsonObject,
} from "../types.ts";
import { contentList, DEFAULT_LIST_LIMIT } from "./content.ts";

export const BOARD_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export const BOARD_ROLES = ["backlog", "todo", "doing", "done", "custom"] as const;
export const BOARD_COLORS = ["neutral", "blue", "teal", "green", "amber", "violet", "red"] as const;
export const BOARD_REF_SCOPES = ["selected-or-all", "open-only", "all"] as const;
export const BOARD_LIMITS = { description: 12000, tags: 20, tag: 32, checklist: 200, checklistText: 500, wip: 9999 };

export type BoardEdit = (node: FlowNode) => Partial<Pick<FlowNode, "columns" | "selectedItems" | "boardSettings">>;

const defaultColumns: BoardColumn[] = [
  { id: "todo", name: "待办", role: "todo", color: "neutral", cards: [] },
  { id: "doing", name: "进行中", role: "doing", color: "blue", cards: [] },
  { id: "done", name: "完成", role: "done", color: "green", cards: [] },
];

const defaultColors: Record<BoardColumnRole, BoardColumnColor> = {
  backlog: "neutral",
  todo: "neutral",
  doing: "blue",
  done: "green",
  custom: "neutral",
};
const legacyRolesByPosition = ["todo", "doing", "done"] as const;

const legacyRoles = new Map<string, BoardColumnRole>([
  ["待办", "todo"], ["todo", "todo"], ["to do", "todo"], ["col-todo", "todo"],
  ["进行中", "doing"], ["doing", "doing"], ["in progress", "doing"], ["col-doing", "doing"],
  ["完成", "done"], ["已完成", "done"], ["已验证", "done"], ["done", "done"],
  ["completed", "done"], ["verified", "done"], ["col-done", "done"],
  ["积压", "backlog"], ["backlog", "backlog"],
]);

export function normalizeBoardColumns(columns: BoardColumn[] = defaultColumns): BoardColumn[] {
  if (columns.every((column) => column.role)) return columns;
  const legacyLayout = columns.length === 3 && columns.every((column) => !column.role);
  return columns.map((column, index) => {
    if (column.role) return column;
    const role = legacyRoles.get(column.name.trim().toLowerCase()) ??
      legacyRoles.get(column.id.toLowerCase()) ??
      (legacyLayout ? legacyRolesByPosition[index] : "custom");
    return { ...column, role };
  });
}

export const boardColumnColor = (column: BoardColumn): BoardColumnColor =>
  column.color ?? defaultColors[column.role ?? "custom"];

export const isBoardCardDone = (card: BoardCard, column: BoardColumn): boolean =>
  card.done ?? column.role === "done";

export function newBoardCard(text: string): BoardCard {
  const now = Date.now();
  return { id: crypto.randomUUID(), text, createdAt: now, updatedAt: now };
}

export function defaultBoardWithExamples(locale: "zh" | "en" = "zh"): BoardColumn[] {
  const english = locale === "en";
  const englishNames = ["To do", "In progress", "Done"];
  const examples: BoardCard[][] = [
    [
      { ...newBoardCard(english ? "Define acceptance criteria" : "明确需求与验收标准"), priority: "high" },
      newBoardCard(english ? "Record open questions" : "记录尚待确认的问题"),
    ],
    [{ ...newBoardCard(english ? "Review the current workflow" : "梳理当前工作流程"), priority: "medium" }],
    [{ ...newBoardCard(english ? "Collect background materials" : "收集背景资料"), done: true }],
  ];
  return defaultColumns.map((column, index) => ({
    ...column,
    name: english ? englishNames[index] : column.name,
    cards: examples[index],
  }));
}

export function findBoardCard(columns: BoardColumn[], id: string) {
  for (const [columnIndex, column] of columns.entries()) {
    const index = column.cards.findIndex((card) => card.id === id);
    if (index >= 0) return { card: column.cards[index], column, index, columnIndex };
  }
}

export function updateBoardColumn(columns: BoardColumn[], id: string, update: (column: BoardColumn) => BoardColumn) {
  const index = columns.findIndex((column) => column.id === id);
  if (index < 0) return columns;
  const next = update(columns[index]);
  return next === columns[index] ? columns : columns.with(index, next);
}

export function updateBoardCard(columns: BoardColumn[], id: string, update: (card: BoardCard) => BoardCard) {
  const found = findBoardCard(columns, id);
  if (!found) return columns;
  const card = update(found.card);
  return card === found.card ? columns :
    columns.with(found.columnIndex, { ...found.column, cards: found.column.cards.with(found.index, card) });
}

export const addBoardCard = (columns: BoardColumn[], columnId: string, card: BoardCard): BoardColumn[] =>
  updateBoardColumn(columns, columnId, (column) => ({ ...column, cards: [...column.cards, card] }));

export function removeBoardCard(columns: BoardColumn[], id: string): BoardColumn[] {
  const found = findBoardCard(columns, id);
  if (!found) return columns;
  return columns.with(found.columnIndex, { ...found.column, cards: found.column.cards.toSpliced(found.index, 1) });
}

export function clearCompletedBoardCards(columns: BoardColumn[], id: string): BoardColumn[] {
  return updateBoardColumn(columns, id, (column) => {
    const cards = column.cards.filter((card) => !isBoardCardDone(card, column));
    return cards.length === column.cards.length ? column : { ...column, cards };
  });
}

export function removeBoardColumn(columns: BoardColumn[], id: string, destinationId?: string): BoardColumn[] {
  const column = columns.find((current) => current.id === id);
  if (!column) return columns;
  const remaining = columns.filter((current) => current.id !== id);
  if (!column.cards.length) return remaining;
  if (!destinationId || !remaining.some((current) => current.id === destinationId)) return columns;
  return updateBoardColumn(remaining, destinationId, (destination) => ({
    ...destination,
    cards: [...destination.cards, ...column.cards.map((card) => ({
      ...card,
      done: isBoardCardDone(card, column),
    }))],
  }));
}

export function setBoardColumnRole(columns: BoardColumn[], id: string, role: BoardColumnRole): BoardColumn[] {
  const current = columns.find((column) => column.id === id);
  if (!current || current.role === role) return columns;
  return columns.map((column) => {
    const nextRole = column === current ? role : role === "done" && column.role === "done" ? "custom" : column.role;
    if (nextRole === column.role) return column;
    return {
      ...column,
      role: nextRole,
      cards: column.role === "done"
        ? column.cards.map((card) => card.done === undefined ? { ...card, done: true } : card)
        : column.cards,
    };
  });
}

function relocateBoardCard(
  columns: BoardColumn[],
  destination: BoardColumn,
  card: BoardCard,
  beforeId?: string,
): BoardColumn[] {
  const withoutCard = removeBoardCard(columns, card.id);
  return updateBoardColumn(withoutCard, destination.id, (column) => {
    const before = column.cards.findIndex((item) => item.id === beforeId);
    const index = before < 0 ? column.cards.length : before;
    return { ...column, cards: column.cards.toSpliced(index, 0, card) };
  });
}

/** Insert before a stable ID within the destination column, or append. */
export function moveBoardCard(
  columns: BoardColumn[], id: string, destinationId: string, beforeId?: string, now?: number,
): BoardColumn[] {
  const found = findBoardCard(columns, id);
  const destination = columns.find((column) => column.id === destinationId);
  if (!found || !destination || beforeId === id) return columns;
  const { card, column, index } = found;
  if (column === destination) {
    const next = column.cards[index + 1]?.id;
    const before = column.cards.find((item) => item.id === beforeId)?.id;
    if (before === next) return columns;
  }
  let moved = now === undefined ? card : { ...card, updatedAt: now };
  if (column !== destination) {
    if (destination.role === "done" && column.role !== "done") {
      moved = { ...moved, done: true, previousColumnId: column.id };
    } else if (column.role === "done" && destination.role !== "done") {
      moved = { ...moved, done: false, previousColumnId: undefined };
    }
  }
  return relocateBoardCard(columns, destination, moved, beforeId);
}

export function toggleBoardCardDone(
  columns: BoardColumn[], id: string, settings?: BoardSettings, now?: number,
): BoardColumn[] {
  const found = findBoardCard(columns, id);
  if (!found) return columns;
  const { card, column } = found;
  const done = !isBoardCardDone(card, column);
  const updated = { ...card, done, updatedAt: now ?? card.updatedAt };
  if (settings?.autoMoveDone !== false) {
    if (done && column.role !== "done") {
      const destination = columns.find((item) => item.role === "done");
      if (destination) {
        return relocateBoardCard(columns, destination, { ...updated, previousColumnId: column.id });
      }
    } else if (!done && column.role === "done") {
      const open = columns.filter((item) => item.role !== "done");
      const destination = open.find((item) => item.id === card.previousColumnId) ??
        open.find((item) => item.role === "todo") ?? open[0];
      if (destination) {
        return relocateBoardCard(columns, destination, { ...updated, previousColumnId: undefined });
      }
    }
  }
  return updateBoardCard(columns, id, () => updated);
}

export function moveChecklistItem(items: BoardChecklistItem[], id: string, offset: -1 | 1): BoardChecklistItem[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= items.length) return items;
  return items.with(from, items[to]).with(to, items[from]);
}

const priorityOrder: Record<BoardCardPriority, number> = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 };

export function boardProgress(columns: BoardColumn[]) {
  let total = 0;
  let done = 0;
  let doing = 0;
  let next: BoardCard | undefined;
  for (const column of columns) {
    for (const card of column.cards) {
      total++;
      if (isBoardCardDone(card, column)) {
        done++;
        continue;
      }
      if (column.role === "doing") doing++;
      if (!next || priorityOrder[card.priority ?? "none"] > priorityOrder[next.priority ?? "none"]) next = card;
    }
  }
  return { total, done, doing, pending: total - done - doing, percent: total ? Math.round(done / total * 100) : 0, next };
}

const priorityLabels = { none: "", low: "低", medium: "中", high: "高", urgent: "紧急" };
const singleLine = (text: string): string => text.trim().replace(/\s*\r?\n\s*/g, " ");

function formatCardLines(card: BoardCard, column: BoardColumn): string[] {
  const priority = priorityLabels[card.priority ?? "none"];
  const attrs = [
    card.tags?.length ? `标签: ${card.tags.map(singleLine).join(", ")}` : "",
    card.dueDate ? `截止: ${card.dueDate}` : "",
  ].filter(Boolean);
  const lines = [
    `- [${isBoardCardDone(card, column) ? "x" : " "}] ${priority ? `[${priority}] ` : ""}${singleLine(card.text)}${attrs.length ? ` (${attrs.join(" | ")})` : ""}`,
  ];
  if (card.description?.trim()) {
    const [first, ...rest] = card.description.trim().split(/\r?\n/);
    lines.push(`  说明：${first}`, ...rest.map((line) => `  ${line}`));
  }
  for (const item of card.checklist ?? []) {
    lines.push(`  - [${item.done ? "x" : " "}] ${singleLine(item.text)}`);
  }
  return lines;
}

export function formatBoardCardMarkdown(card: BoardCard, column: BoardColumn): string {
  return [`## [${singleLine(column.name)}]`, ...formatCardLines(card, column)].join("\n");
}

export function referenceColumns(
  columns: BoardColumn[], selectedIds?: string[], scope: BoardRefScope = "selected-or-all",
): BoardColumn[] {
  const chosen = scope === "selected-or-all" && selectedIds?.length
    ? new Set(selectedIds)
    : undefined;
  const filterSelection = chosen && columns.some((column) => column.cards.some((card) => chosen.has(card.id)));
  return columns.map(column => ({
    ...column,
    cards: column.cards.filter(card => {
      if (scope === "open-only") return !isBoardCardDone(card, column);
      return !filterSelection || chosen.has(card.id);
    }),
  }));
}

export function formatBoardMarkdown(
  columns: BoardColumn[], selectedIds?: string[], scope: BoardRefScope = "selected-or-all", limit = Infinity,
): string {
  let remaining = limit;
  return referenceColumns(columns, selectedIds, scope).flatMap(column => {
    const cards = column.cards.slice(0, remaining);
    remaining -= cards.length;
    return cards.length ? [[`## [${singleLine(column.name)}]`, ...cards.flatMap(card => formatCardLines(card, column))].join("\n")] : [];
  }).join("\n\n");
}

function cardRecord(card: BoardCard, column: BoardColumn): JsonObject {
  const { checklist, comments, ...fields } = card;
  return { ...fields, columnId: column.id, column: column.name, done: isBoardCardDone(card, column),
    ...(checklist ? { checklist: checklist.map(item => ({ ...item })) } : {}),
    ...(comments ? { comments: comments.map(comment => ({ ...comment })) } : {}) };
}

export function boardContent(node: FlowNode, sourceItemKey?: string, limit = DEFAULT_LIST_LIMIT): FlowContent | undefined {
  if (!node.columns) return undefined;
  const columns = normalizeBoardColumns(node.columns);
  if (sourceItemKey !== undefined) {
    const found = findBoardCard(columns, sourceItemKey);
    return found ? { dataType: "record", value: cardRecord(found.card, found.column) } : undefined;
  }
  const selected = referenceColumns(columns, node.selectedItems, node.boardSettings?.refScope);
  const values: JsonObject[] = [], keys: string[] = [];
  let total = 0;
  for (const column of selected) {
    total += column.cards.length;
    for (const card of column.cards.slice(0, limit - values.length)) {
      values.push(cardRecord(card, column));
      keys.push(card.id);
    }
  }
  const result = contentList(values, limit, keys);
  if (total > values.length) result.originalCount = total;
  return result;
}

export function resolveBoardReference(node: FlowNode, sourceItemKey?: string, limit?: number): {
  title: string;
  text: string;
  missing?: boolean;
} {
  if (sourceItemKey !== undefined) {
    const found = findBoardCard(normalizeBoardColumns(node.columns), sourceItemKey);
    return found
      ? { title: found.card.text, text: formatBoardCardMarkdown(found.card, found.column) }
      : { title: node.title, text: "引用的待办卡片已移除 / The referenced task was removed.", missing: true };
  }
  return {
    title: node.title,
    text: node.columns
      ? formatBoardMarkdown(normalizeBoardColumns(node.columns), node.selectedItems, node.boardSettings?.refScope, limit)
      : node.text,
  };
}

/** Clean up a board edit without affecting other boards that use the same local card IDs. */
export function pruneBoardReferences(node: FlowNode, edges: FlowEdge[]): FlowEdge[] {
  const ids = new Set(node.columns?.flatMap((column) => column.cards.map((card) => card.id)));
  if (node.selectedItems?.some((id) => !ids.has(id))) {
    node.selectedItems = node.selectedItems.filter((id) => ids.has(id));
  }
  const retained = edges.filter((edge) =>
    edge.source !== node.id || edge.kind !== "reference" ||
    edge.sourceItemKey === undefined || ids.has(edge.sourceItemKey),
  );
  return retained.length === edges.length ? edges : retained;
}
