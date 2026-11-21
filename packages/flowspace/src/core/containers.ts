import type {
  BoardCard, ContainerChange, ContainerEntry, ContainerPermission, FlowEdge, FlowNode, FlowspaceDocument,
} from "../types.ts";
import { findBoardCard, normalizeBoardColumns, pruneBoardReferences, referenceColumns, removeBoardCard } from "./board.ts";

export const isContainer = (node: FlowNode | undefined) =>
  node?.kind === "board" || node?.kind === "note" || node?.kind === "file" || node?.flowType === "flowspace/variable";

export function containerPermission(node: FlowNode | undefined, edge: FlowEdge): ContainerPermission {
  if (edge.kind !== "reference" || !isContainer(node) || edge.snapshotText !== undefined || edge.snapshotContent)
    return "read";
  if (edge.permission === "advance" && node?.kind !== "board") return "read";
  return edge.permission ?? "read";
}

export function boardIdsForReference(node: FlowNode, edge: FlowEdge): Set<string> {
  const columns = normalizeBoardColumns(node.columns);
  return edge.sourceItemKey !== undefined
    ? new Set(findBoardCard(columns, edge.sourceItemKey) ? [edge.sourceItemKey] : [])
    : new Set(referenceColumns(columns, node.selectedItems, node.boardSettings?.refScope)
        .flatMap(column => column.cards.map(card => card.id)));
}

export function canvasEntry(node: FlowNode, itemId?: string): ContainerEntry | null {
  if (node.kind === "note") return { kind: "note", text: node.text };
  if (node.kind !== "board" || itemId === undefined) return null;
  const columns = normalizeBoardColumns(node.columns);
  const entry = findBoardCard(columns, itemId);
  return entry ? {
    kind: "board", columnId: entry.column.id, card: entry.card,
    ...(entry.column.cards[entry.index + 1] ? { beforeId: entry.column.cards[entry.index + 1].id } : {}),
  } : null;
}

export function writeCanvasEntry(node: FlowNode, itemId: string | undefined, entry: ContainerEntry | null): boolean {
  if (node.kind === "note" && entry?.kind === "note") {
    node.text = entry.text;
    return true;
  }
  if (node.kind !== "board" || itemId === undefined || (entry && entry.kind !== "board")) return false;
  const columns = normalizeBoardColumns(node.columns);
  const without = removeBoardCard(columns, itemId);
  if (!entry) {
    node.columns = without;
    return true;
  }
  const destination = without.findIndex(column => column.id === entry.columnId);
  if (destination < 0) return false;
  const column = without[destination];
  const before = column.cards.findIndex(card => card.id === entry.beforeId);
  node.columns = without.with(destination, {
    ...column, cards: column.cards.toSpliced(before < 0 ? column.cards.length : before, 0, entry.card),
  });
  return true;
}

const equal = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

function mergeEntry(
  current: ContainerEntry | null, change: ContainerChange, history: boolean,
): ContainerEntry | null {
  const { before, after } = change;
  if (equal(current, before)) return after;
  if (current?.kind === "note" && after?.kind === "note") return history ? after : current;
  if (current?.kind !== "board" || before?.kind !== "board") return current;
  if (after === null) return history || equal(current.card, before.card) ? null : current;
  if (after.kind !== "board") return current;
  const fields = { ...current.card };
  for (const key of new Set([...Object.keys(before.card), ...Object.keys(after.card)]) as Set<keyof BoardCard>) {
    if (equal(before.card[key], after.card[key]) || (!history && !equal(current.card[key], before.card[key]))) continue;
    Object.assign(fields, { [key]: after.card[key] });
  }
  const moved = before.columnId !== after.columnId;
  const canMove = moved && (history || current.columnId === before.columnId);
  return { ...current, ...(canMove ? { columnId: after.columnId, beforeId: after.beforeId } : {}), card: fields };
}

/** Rebase edits and undo snapshots over independent Agent mutations. */
export function rebaseContainerChanges(
  document: FlowspaceDocument, changes: readonly ContainerChange[], history = false,
): FlowspaceDocument {
  const revision = document.containerRevision ?? 0;
  const newer = changes.filter(change => !change.pending && change.revision > revision);
  if (!newer.length) return document;
  const next = { ...document, nodes: [...document.nodes], containerRevision: newer.at(-1)!.revision };
  const indices = new Map(next.nodes.map((node, index) => [node.id, index]));
  for (const change of newer) {
    const index = indices.get(change.nodeId);
    if (index === undefined || change.before?.kind === "file" || change.after?.kind === "file") continue;
    const node = next.nodes[index];
    const current = canvasEntry(node, change.itemId);
    const entry = mergeEntry(current, change, history);
    if (equal(current, entry)) continue;
    const updated = { ...node };
    if (writeCanvasEntry(updated, change.itemId, entry)) {
      next.nodes[index] = updated;
      if (updated.kind === "board") next.edges = pruneBoardReferences(updated, next.edges);
    }
  }
  return next;
}
