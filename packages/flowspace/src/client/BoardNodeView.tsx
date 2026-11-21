import {
  useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  BOARD_COLORS, BOARD_LIMITS, BOARD_REF_SCOPES, BOARD_ROLES, addBoardCard,
  boardColumnColor, boardProgress, clearCompletedBoardCards, findBoardCard, formatBoardMarkdown,
  isBoardCardDone, moveBoardCard, newBoardCard, normalizeBoardColumns, removeBoardCard,
  removeBoardColumn, setBoardColumnRole, toggleBoardCardDone, updateBoardCard, updateBoardColumn,
  type BoardEdit,
} from "../core/board.ts";
import type { BoardCard, BoardColumn, BoardColumnRole, BoardSettings, FlowNode } from "../types.ts";
import { BoardCardDetail } from "./BoardCardDetail.tsx";
import {
  BoardCheck, BoardIconButton, BoardProgress, BoardTextField, PriorityMark, boardColumnName, boardDate, tagColor,
} from "./BoardControls.tsx";
import { useBoardDrag } from "./boardDrag.ts";
import { Icon } from "./icons.tsx";
import { TeamAvatar } from "./TeamControls.tsx";
import { t } from "./i18n.ts";

interface BoardMenuItem {
  heading?: string;
  divider?: boolean;
  label?: string;
  icon?: string;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  fn?: () => void;
}

interface BoardNodeViewProps {
  node: FlowNode;
  linkedCards: ReadonlySet<string>;
  onEdit: (edit: BoardEdit) => void;
  onMenu: (anchor: HTMLElement, items: BoardMenuItem[]) => void;
  onDispatch: (cardId: string) => void;
  onConvertNote: (cardId: string) => void;
  onLinkAgent: (cardId: string, anchor: HTMLElement) => void;
  onDragReference?: (event: ReactPointerEvent, cardId: string, onStart: () => void) => void;
  onCopy: (text: string) => void;
}

type Filter = "all" | "open" | "priority" | "refs";
type ColumnPanel = { kind: "create" } | { kind: "settings" | "remove" | "clear"; id: string };
type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
const directions = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const filters = ["all", "open", "priority", "refs"] as const;

export function BoardNodeView({
  node, linkedCards, onEdit, onMenu, onDispatch, onConvertNote, onLinkAgent, onDragReference, onCopy,
}: BoardNodeViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeCardId, setActiveCardId] = useState<string>();
  const [columnPanel, setColumnPanel] = useState<ColumnPanel>();
  const [renamingColumn, setRenamingColumn] = useState<string>();
  const [addingColumn, setAddingColumn] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const columns = normalizeBoardColumns(node.columns);
  const settings = node.boardSettings;
  const progress = boardProgress(columns);
  const today = boardDate();
  const referenceIds = new Set(node.selectedItems);
  const scope = settings?.refScope ?? "selected-or-all";
  const activeCard = activeCardId ? findBoardCard(columns, activeCardId) : undefined;
  const visibleColumnPanel = columnPanel && (columnPanel.kind === "create" || columns.some((column) => column.id === columnPanel.id));
  const hasPanel = activeCard || visibleColumnPanel;
  const search = query.trim().toLowerCase();
  const searchActive = Boolean(search || filter !== "all");

  const updateColumns = (update: (current: BoardColumn[], board: FlowNode) => BoardColumn[]) => onEdit((current) => {
    const stored = normalizeBoardColumns(current.columns);
    const next = update(stored, current);
    return next === stored ? {} : { columns: next };
  });
  const updateColumn = (id: string, patch: Partial<BoardColumn>) =>
    updateColumns((current) => updateBoardColumn(current, id, (column) => ({ ...column, ...patch })));
  const updateCard = (id: string, update: (card: BoardCard) => BoardCard) =>
    updateColumns((current) => updateBoardCard(current, id, (card) => ({ ...update(card), updatedAt: Date.now() })));
  const updateSettings = (patch: Partial<BoardSettings>) =>
    onEdit((current) => ({ boardSettings: { ...current.boardSettings, ...patch } }));

  const toggleReference = (id: string) => {
    onEdit((current) => {
      const ids = new Set(current.selectedItems);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { selectedItems: [...ids] };
    });
  };
  const cardElement = (id: string) =>
    root.current?.querySelector<HTMLElement>(`[data-board-card-id="${CSS.escape(id)}"]`);
  const toggleDone = (id: string) => {
    const check = cardElement(id)?.querySelector(".board-check");
    const focused = check && document.activeElement === check;
    updateColumns((current, board) => toggleBoardCardDone(current, id, board.boardSettings, Date.now()));
    if (focused) requestAnimationFrame(() => {
      const next = cardElement(id)?.querySelector<HTMLElement>(".board-check") ??
        root.current?.querySelector<HTMLElement>(".board-options-button");
      next?.focus();
    });
  };
  const focusCard = (id: string) =>
    cardElement(id)?.querySelector<HTMLElement>(".board-card-title")?.focus();
  const closePanel = () => {
    // Move focus before unmounting so the current field commits on blur.
    root.current?.querySelector<HTMLElement>(".board-options-button")?.focus();
    setActiveCardId(undefined);
    setColumnPanel(undefined);
    if (activeCardId) requestAnimationFrame(() => focusCard(activeCardId));
  };
  const openCard = (id: string) => {
    setColumnPanel(undefined);
    setActiveCardId(id);
  };
  const openColumnPanel = (panel: ColumnPanel) => {
    setActiveCardId(undefined);
    setColumnPanel(panel);
  };
  const removeCard = (id: string) => {
    if (activeCardId === id) closePanel();
    setSelected((current) => new Set([...current].filter((item) => item !== id)));
    updateColumns((current) => removeBoardCard(current, id));
  };
  const moveCard = (id: string, columnId: string, beforeId?: string, restoreFocus = false) => {
    const next = moveBoardCard(columns, id, columnId, beforeId);
    if (next === columns) return;
    updateColumns((current) => moveBoardCard(current, id, columnId, beforeId, Date.now()));
    const moved = findBoardCard(next, id);
    if (moved) setAnnouncement(t("boardMoved", {
      text: moved.card.text, name: boardColumnName(moved.column), index: moved.index + 1,
    }));
    if (restoreFocus) requestAnimationFrame(() => focusCard(id));
  };
  const { drag, start: startDrag, suppressClick } = useBoardDrag(root, (id, target) => {
    moveCard(id, target.columnId, target.beforeId);
  });

  const moveByKey = (id: string, direction: Direction) => {
    const found = findBoardCard(columns, id);
    if (!found) return;
    const { column, columnIndex, index } = found;
    if (direction === "ArrowLeft" || direction === "ArrowRight") {
      const destination = columns[columnIndex + (direction === "ArrowLeft" ? -1 : 1)];
      if (destination) moveCard(id, destination.id, undefined, true);
    } else if (direction === "ArrowUp" && index > 0) {
      moveCard(id, column.id, column.cards[index - 1].id, true);
    } else if (direction === "ArrowDown" && index < column.cards.length - 1) {
      moveCard(id, column.id, column.cards[index + 2]?.id, true);
    }
  };

  const startAdd = (column: BoardColumn) => {
    if (column.collapsed) updateColumn(column.id, { collapsed: false });
    setAddingColumn(column.id);
  };
  const addTask = (columnId: string, text: string, detail: boolean) => {
    const card = newBoardCard(text);
    updateColumns((current) => addBoardCard(current, columnId, card));
    if (detail) {
      setAddingColumn(undefined);
      setSelected(new Set([card.id]));
      openCard(card.id);
    }
  };
  const duplicate = (card: BoardCard, column: BoardColumn) => {
    const copy = { ...structuredClone(card), ...newBoardCard(card.text),
      checklist: card.checklist?.map((item) => ({ ...item, id: crypto.randomUUID() })),
    };
    updateColumns((current) => addBoardCard(current, column.id, copy));
    setSelected(new Set([copy.id]));
    requestAnimationFrame(() => focusCard(copy.id));
  };
  const selectTask = (id: string, multi: boolean) => {
    if (!multi) setSelected(new Set([id]));
    else setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };
  const openOptions = (anchor: HTMLElement) => {
    const chosen = [...selected].filter((id) => findBoardCard(columns, id));
    onMenu(anchor, [
      { label: t("boardAddColumn"), icon: "plus", fn: () => openColumnPanel({ kind: "create" }) },
      { label: t(settings?.showCompleted === false ? "boardShowCompleted" : "boardHideCompleted"),
        icon: settings?.showCompleted === false ? "eye" : "eyeoff",
        fn: () => updateSettings({ showCompleted: settings?.showCompleted === false }) },
      { label: t(settings?.autoMoveDone === false ? "boardEnableAutoMove" : "boardDisableAutoMove"), icon: "check",
        fn: () => updateSettings({ autoMoveDone: settings?.autoMoveDone === false }) },
      { label: t("boardAutoView"), icon: "board", checked: !settings?.view,
        fn: () => { if (settings?.view) updateSettings({ view: undefined }); } },
      { label: t("boardCopyMarkdown"), icon: "copy", fn: () => onCopy(formatBoardMarkdown(columns)) },
      { heading: t("boardRefScope") },
      ...BOARD_REF_SCOPES.map((value) => ({
        label: t(`boardRefScope_${value}`), checked: scope === value,
        fn: () => { if (scope !== value) updateSettings({ refScope: value }); },
      })),
      ...(chosen.length > 1 ? [{ label: t("boardSetSelectionRefs", { count: chosen.length }), icon: "link", fn: () =>
        onEdit((current) => ({ selectedItems: [...new Set([...(current.selectedItems ?? []), ...chosen])] })),
      }] : []),
    ]);
  };
  const openColumnMenu = (anchor: HTMLElement, column: BoardColumn) => {
    const id = column.id;
    onMenu(anchor, [
      { label: t("rename"), icon: "edit", fn: () => setRenamingColumn(id) },
      { label: t("boardColumnSettings"), icon: "gear", fn: () => openColumnPanel({ kind: "settings", id }) },
      { label: t("boardColumnDone"), icon: "check", checked: column.role === "done",
        fn: () => updateColumns((current) => setBoardColumnRole(current, id, "done")) },
      { label: t(column.collapsed ? "expand" : "collapse"), icon: column.collapsed ? "chev" : "off",
        fn: () => updateColumn(id, { collapsed: !column.collapsed }) },
      { divider: true },
      { label: t("boardClearDone"), icon: "checklist", disabled: !column.cards.some((card) => isBoardCardDone(card, column)),
        fn: () => openColumnPanel({ kind: "clear", id }) },
      { label: t("boardDeleteColumn"), icon: "trash", danger: true, fn: () => openColumnPanel({ kind: "remove", id }) },
    ]);
  };
  const openTaskMenu = (anchor: HTMLElement, card: BoardCard, column: BoardColumn) => {
    const index = column.cards.indexOf(card);
    onMenu(anchor, [
      { label: t("editCard"), icon: "edit", fn: () => openCard(card.id) },
      { label: t(referenceIds.has(card.id) ? "boardRemoveReference" : "boardUseReference"), icon: "link",
        fn: () => toggleReference(card.id) },
      { label: t("boardLinkAgent"), icon: "link", fn: () => onLinkAgent(card.id, anchor) },
      { label: t("boardDispatch"), icon: "sendTask", fn: () => onDispatch(card.id) },
      { label: t("boardDuplicateTask"), icon: "duplicate", fn: () => duplicate(card, column) },
      { label: t("boardConvertNote"), icon: "note", fn: () => onConvertNote(card.id) },
      { heading: t("boardMoveTask") },
      { label: t("boardMoveUp"), icon: "arrowUp", disabled: index === 0, fn: () => moveByKey(card.id, "ArrowUp") },
      { label: t("boardMoveDown"), icon: "arrowDown", disabled: index === column.cards.length - 1, fn: () => moveByKey(card.id, "ArrowDown") },
      ...columns.filter((lane) => lane.id !== column.id).map((lane) => ({
        label: t("boardMoveColumn", { name: boardColumnName(lane) }), icon: "chev", fn: () => moveCard(card.id, lane.id, undefined, true),
      })),
      { divider: true },
      { label: t("deleteCard"), icon: "trash", danger: true, fn: () => removeCard(card.id) },
    ]);
  };
  const selectedScope = scope === "selected-or-all" && referenceIds.size;
  const scopeText = selectedScope
    ? t("boardRefSelected", { count: referenceIds.size })
    : t(scope === "open-only" ? "boardRefScope_open-only" : "boardRefScope_all");
  const firstColumn = columns.find((column) => column.role === "todo") ??
    columns.find((column) => column.role !== "done") ?? columns[0];
  const matches = (card: BoardCard, column: BoardColumn) => {
    const done = isBoardCardDone(card, column);
    if ((settings?.showCompleted === false || filter === "open") && done) return false;
    if (filter === "priority" && card.priority !== "urgent" && card.priority !== "high") return false;
    if (filter === "refs" && !referenceIds.has(card.id)) return false;
    return !search || [card.text, card.description, ...(card.tags ?? []), ...(card.checklist ?? []).map((item) => item.text)]
      .some((value) => value?.toLowerCase().includes(search));
  };
  const lanes = columns.map((column) => ({ column, cards: column.cards.filter((card) => matches(card, column)) }));
  const portalRoot = drag ? root.current?.closest(".fs-root") : null;

  return <div ref={root} className="board-root" data-view={settings?.view ?? "auto"}
    onPointerDownCapture={() => { suppressClick.current = false; }}
    onPointerDown={(event) => event.stopPropagation()}
    onClickCapture={(event) => {
      if (suppressClick.current && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    }}
    onKeyDown={(event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.stopPropagation();
        return;
      }
      if (event.key !== "Escape") return;
      if (hasPanel) closePanel();
      else if (searchOpen) setSearchOpen(false);
      else return;
      event.preventDefault();
      event.stopPropagation();
    }}>
    <div className="board-toolbar">
      <BoardProgress {...progress} />
      <div className="board-toolbar-search">
        <BoardIconButton icon="search" label={t("boardSearch")} aria-expanded={searchOpen}
          aria-pressed={searchActive || searchOpen} onClick={() => setSearchOpen(!searchOpen)} />
        {!searchOpen && filter !== "all" && <button type="button" className="board-filter-glance"
          onClick={() => setSearchOpen(true)}>{t(`boardFilter_${filter}`)}</button>}
      </div>
      <div className="board-ref-scope" data-selected={referenceIds.size > 0}
        title={t("boardRefScopeBadge", { scope: scopeText })}>
        <Icon name="link" /><span>{scopeText}</span>
        {!selectedScope && referenceIds.size > 0 && <b>{referenceIds.size}</b>}
        {referenceIds.size > 0 && <BoardIconButton icon="x" label={t("boardRefClear")}
          onClick={() => onEdit(() => ({ selectedItems: [] }))} />}
      </div>
      <div className="board-view-toggle" role="group" aria-label={t("boardViewMode")}>
        {(["list", "board"] as const).map((view) => <button type="button" key={view} data-option={view}
          aria-pressed={settings?.view === view} aria-label={t(view === "list" ? "boardList" : "boardView")}
          onClick={() => { if (view !== settings?.view) updateSettings({ view }); }}>
          <Icon name={view} /><span>{t(view === "list" ? "boardList" : "boardView")}</span>
        </button>)}
      </div>
      {firstColumn && <BoardIconButton className="board-list-add" icon="plus" label={t("boardAddTask")}
        onClick={() => startAdd(firstColumn)} />}
      <BoardIconButton className="board-options-button" icon="more" label={t("boardOptions")}
        aria-haspopup="menu" onClick={(event) => openOptions(event.currentTarget)} />
    </div>
    {searchOpen && <div className="board-search-panel">
      <label className="board-search-box">
        <Icon name="search" />
        <input className="board-field" type="search" value={query} autoFocus placeholder={t("boardSearch")}
          aria-label={t("boardSearch")} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="board-filter-chips">
        {filters.map((value) => <button key={value} type="button" aria-pressed={filter === value}
          onClick={() => setFilter(value)}>{t(`boardFilter_${value}`)}</button>)}
      </div>
    </div>}
    <div className="board-main">
      <div className="board-lanes">
        {lanes.map(({ column, cards }) => {
          const name = boardColumnName(column);
          const openCount = column.cards.filter((card) => !isBoardCardDone(card, column)).length;
          const target = drag?.target?.columnId === column.id ? drag.target : undefined;
          return <section key={column.id} className="board-column" data-board-col-id={column.id}
            data-board-color={boardColumnColor(column)} data-collapsed={Boolean(column.collapsed)}
            data-drop={Boolean(target)} aria-label={name}>
            {column.collapsed && renamingColumn !== column.id
              ? <button className="board-collapsed-column" type="button"
                  aria-label={t("boardExpandColumn", { name })} aria-expanded={false}
                  onClick={() => updateColumn(column.id, { collapsed: false })}>
                  <i className="board-dot" /><span>{name}</span><b>{column.cards.length}</b>
                </button>
              : <header className="board-column-header">
                  <button type="button" className="board-column-fold"
                    title={t("boardCollapseColumn", { name })} aria-label={t("boardCollapseColumn", { name })} aria-expanded="true"
                    onClick={() => updateColumn(column.id, { collapsed: true })}><i className="board-dot" /></button>
                  {renamingColumn === column.id
                    ? <BoardTextField className="board-column-name-edit" value={name} label={t("boardColumnName")} autoFocus
                        onCancel={() => setRenamingColumn(undefined)} onCommit={(value) => {
                          updateColumn(column.id, { name: value });
                          setRenamingColumn(undefined);
                        }} />
                    : <button type="button" className="board-column-name" title={name}
                        onClick={(event) => { if (!event.detail) setRenamingColumn(column.id); }}
                        onDoubleClick={() => setRenamingColumn(column.id)}
                        onKeyDown={(event) => {
                          if (event.key === "F2") { event.preventDefault(); setRenamingColumn(column.id); }
                        }}>{name}</button>}
                  <span className="board-column-count" data-over={Boolean(column.wipLimit && openCount > column.wipLimit)}
                    title={column.wipLimit ? t("boardWipHint", { count: openCount, limit: column.wipLimit }) : undefined}>
                    {column.wipLimit ? `${openCount}/${column.wipLimit}` : searchActive ? `${cards.length}/${column.cards.length}` : column.cards.length}
                  </span>
                  <div className="board-column-actions">
                    <BoardIconButton icon="plus" label={t("boardAddTask")} onClick={() => startAdd(column)} />
                    <BoardIconButton icon="more" label={t("boardColumnOptions", { name })} aria-haspopup="menu"
                      onClick={(event) => openColumnMenu(event.currentTarget, column)} />
                  </div>
                </header>}
            {!column.collapsed && <>
              <div className="board-column-scroll">
                {cards.map((card) => <BoardTask key={card.id} card={card} today={today}
                  done={isBoardCardDone(card, column)} selected={selected.has(card.id)}
                  uniquelySelected={selected.size === 1 && selected.has(card.id)}
                  referenced={referenceIds.has(card.id)} linked={linkedCards.has(card.id)}
                  dragging={drag?.card.id === card.id} insertBefore={target?.beforeId === card.id}
                  onSelect={(multi) => selectTask(card.id, multi)}
                  onDetails={() => openCard(card.id)} onRename={(text) => updateCard(card.id, (current) => ({ ...current, text }))}
                  onToggle={() => toggleDone(card.id)} onReference={() => toggleReference(card.id)}
                  onDragReference={onDragReference ? (event, onStart) => onDragReference(event, card.id, onStart) : undefined}
                  onMenu={(anchor) => openTaskMenu(anchor, card, column)}
                  onPointerDown={(event) => startDrag(event, card)}
                  onMove={(direction) => moveByKey(card.id, direction)} />)}
                {target && !target.beforeId && <div className="board-drop-end" />}
                {!cards.length && !target && <div className="board-column-empty">
                  {searchActive ? t("boardNoMatches") : t("boardColumnEmpty")}
                </div>}
              </div>
              <BoardQuickAdd open={addingColumn === column.id} onOpen={() => startAdd(column)}
                onClose={() => setAddingColumn(undefined)} onAdd={(text, detail) => addTask(column.id, text, detail)} />
            </>}
          </section>;
        })}
        {!columns.length && <div className="board-empty">
          <Icon name="board" /><span>{t("boardNoColumns")}</span>
          <button type="button" className="board-action board-action-primary" onClick={() => openColumnPanel({ kind: "create" })}>
            <Icon name="plus" />{t("boardAddColumn")}
          </button>
        </div>}
      </div>
      {activeCard && <BoardCardDetail key={activeCard.card.id} card={activeCard.card} column={activeCard.column}
        columns={columns} referenced={referenceIds.has(activeCard.card.id)} onClose={closePanel}
        onUpdate={(update) => updateCard(activeCard.card.id, update)} onToggleDone={() => toggleDone(activeCard.card.id)}
        onMove={(id) => moveCard(activeCard.card.id, id)} onReference={() => toggleReference(activeCard.card.id)}
        onDispatch={() => onDispatch(activeCard.card.id)} onDelete={() => removeCard(activeCard.card.id)} />}
      {columnPanel && visibleColumnPanel && <BoardColumnDrawer key={columnPanel.kind === "create" ? "new" : `${columnPanel.kind}-${columnPanel.id}`}
        panel={columnPanel} columns={columns} onClose={closePanel} onColumns={updateColumns} />}
    </div>
    <span className="board-visually-hidden" aria-live="polite">{announcement}</span>
    {drag && portalRoot && createPortal(<div className="board-drag-ghost" aria-hidden="true"
      style={{ left: drag.x + 12, top: drag.y + 12, width: drag.width }}>
      <PriorityMark priority={drag.card.priority} /><span>{drag.card.text}</span>
    </div>, portalRoot)}
  </div>;
}

function BoardTask({
  card, today, done, selected, uniquelySelected, referenced, linked, dragging, insertBefore,
  onSelect, onDetails, onRename, onToggle, onReference, onDragReference, onMenu, onPointerDown, onMove,
}: {
  card: BoardCard;
  today: string;
  done: boolean;
  selected: boolean;
  uniquelySelected: boolean;
  referenced: boolean;
  linked: boolean;
  dragging: boolean;
  insertBefore: boolean;
  onSelect: (multi: boolean) => void;
  onDetails: () => void;
  onRename: (text: string) => void;
  onToggle: () => void;
  onReference: () => void;
  onDragReference?: (event: ReactPointerEvent, onStart: () => void) => void;
  onMenu: (anchor: HTMLElement) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onMove: (direction: Direction) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const detailsTimer = useRef<ReturnType<typeof setTimeout>>();
  const draggedReference = useRef(false);
  useEffect(() => () => clearTimeout(detailsTimer.current), []);
  const select = (event: MouseEvent) => {
    const multi = event.ctrlKey || event.metaKey;
    if (!multi && event.detail === 0) onDetails();
    else if (multi || !uniquelySelected) onSelect(multi);
    else if (event.detail === 1) {
      clearTimeout(detailsTimer.current);
      detailsTimer.current = setTimeout(onDetails, 300);
    }
  };
  const rename = () => {
    clearTimeout(detailsTimer.current);
    setRenaming(true);
  };
  const key = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).matches("input,textarea,select")) return;
    if (event.key === "F2") {
      event.preventDefault();
      rename();
    } else if (event.altKey && directions.has(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      onMove(event.key as Direction);
    }
  };
  const checklist = card.checklist?.length ?? 0;
  const completed = card.checklist?.filter((item) => item.done).length ?? 0;
  const due = card.dueDate;
  const overdue = !done && Boolean(due && due < today);
  const hasMeta = Boolean((card.priority && card.priority !== "none") || checklist || card.tags?.length || due || card.description || referenced || linked);
  const refLabel = t(referenced ? "boardRemoveReference" : "boardUseReference");

  return <article className="board-task" data-board-card-id={card.id} data-done={done} data-selected={selected}
    data-referenced={referenced || linked} data-dragging={dragging} data-insert={insertBefore}
    onPointerDown={onPointerDown} onKeyDown={key}
    onClick={(event) => { if (!(event.target as Element).closest("button,input")) select(event); }}>
    <div className="board-task-heading">
      <BoardCheck done={done} onClick={onToggle} />
      {renaming
        ? <BoardTextField value={card.text} label={t("boardTitle")} autoFocus onCancel={() => setRenaming(false)}
            onCommit={(text) => { onRename(text); setRenaming(false); }} />
        : <button type="button" className="board-card-title user-content" title={card.text}
            aria-pressed={selected} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight F2"
            onClick={select} onDoubleClick={rename}>{card.text}</button>}
      {!renaming && <div className="board-card-actions">
        <BoardIconButton icon="link" label={refLabel}
          title={onDragReference ? `${refLabel} · ${t("boardDragReference")}` : refLabel}
          aria-pressed={referenced} onPointerDown={(event) => {
            draggedReference.current = false;
            onDragReference?.(event, () => { draggedReference.current = true; });
          }}
          onClick={(event) => { if (!event.detail || !draggedReference.current) onReference(); }} />
        <BoardIconButton icon="more" label={t("boardTaskOptions", { text: card.text })}
          aria-haspopup="menu" onClick={(event) => onMenu(event.currentTarget)} />
      </div>}
      {card.author && <span className="fs-var-author" title={t("flow_agent_changes")}>
        <TeamAvatar label={t("nodeKind_agent")} seed={card.author} size="xs" />
      </span>}
    </div>
    {hasMeta && <div className="board-task-meta">
      <PriorityMark priority={card.priority} showLabel />
      {checklist > 0 && <span className="board-card-checklist" data-complete={checklist === completed} title={t("boardChecklist")}>
        <Icon name="checklist" />{completed}/{checklist}
      </span>}
      {card.tags?.slice(0, 2).map((tag) => <span className="board-tag" data-board-color={tagColor(tag)} key={tag} title={tag}>{tag}</span>)}
      {card.tags && card.tags.length > 2 && <span title={card.tags.slice(2).join(", ")}>+{card.tags.length - 2}</span>}
      {due && <time dateTime={due} className="board-date" data-today={!done && due === today} data-overdue={overdue}
        title={overdue ? t("boardOverdue", { date: due }) : due}><Icon name="calendar" />{due === today ? t("boardToday") : due.slice(5)}</time>}
      {card.description && <span title={t("boardDescription")}><Icon name="note" /></span>}
      {(referenced || linked) && <span className="board-card-linked" title={t(linked ? "boardHasReference" : "boardUseReference")}>
        <Icon name="link" />
      </span>}
    </div>}
  </article>;
}

function BoardQuickAdd({ open, onOpen, onClose, onAdd }: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAdd: (text: string, detail: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const add = (detail: boolean) => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text, detail);
    setDraft("");
    if (!detail) input.current?.focus();
  };
  if (!open) return <button type="button" className="board-quick-trigger" ref={addButton} onClick={onOpen}>
    <Icon name="plus" /><span>{t("boardAddTask")}</span>
  </button>;
  return <form className="board-quick-form" onSubmit={(event) => { event.preventDefault(); add(false); }}>
    <input ref={input} className="board-field" value={draft} autoFocus aria-label={t("boardNewTask")}
      placeholder={t("boardAddTask")} onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" && event.shiftKey) { event.preventDefault(); add(true); }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setDraft("");
          onClose();
          requestAnimationFrame(() => addButton.current?.focus());
        }
      }} />
    <BoardIconButton icon="edit" label={t("boardNewWithDetails")} onClick={() => add(true)} disabled={!draft.trim()} />
  </form>;
}

function BoardColumnDrawer({ panel, columns, onClose, onColumns }: {
  panel: ColumnPanel;
  columns: BoardColumn[];
  onClose: () => void;
  onColumns: (update: (columns: BoardColumn[]) => BoardColumn[]) => void;
}) {
  const column = panel.kind === "create" ? undefined : columns.find((item) => item.id === panel.id);
  const options = columns.filter((item) => item.id !== column?.id);
  const [name, setName] = useState("");
  const [destinationId, setDestinationId] = useState(options[0]?.id ?? "");
  const buttonLabel = panel.kind === "create" ? "boardAddColumn" : panel.kind === "settings" ? "boardColumnSettings" :
    panel.kind === "clear" ? "boardClearDone" : "boardDeleteColumn";
  const updateColumn = (patch: Partial<BoardColumn>) => {
    if (!column) return;
    onColumns((current) => updateBoardColumn(current, column.id, (item) => ({ ...item, ...patch })));
  };
  const confirm = (event: FormEvent) => {
    event.preventDefault();
    if (panel.kind === "create") {
      const title = name.trim();
      if (!title) return;
      const next: BoardColumn = { id: crypto.randomUUID(), name: title, role: "custom", color: "neutral", cards: [] };
      onColumns((current) => [...current, next]);
    } else if (column && panel.kind === "remove") {
      onColumns((current) => removeBoardColumn(current, column.id, destinationId));
    } else if (column && panel.kind === "clear") {
      onColumns((current) => clearCompletedBoardCards(current, column.id));
    }
    onClose();
  };
  return <aside className="board-drawer board-column-drawer" aria-label={t(buttonLabel)}>
    <header className="board-drawer-header">
      <BoardIconButton icon="chevronLeft" label={t("close")} onClick={onClose} />
      <strong>{t(buttonLabel)}</strong>
    </header>
    <form className="board-drawer-scroll board-column-form" onSubmit={confirm}>
      {panel.kind === "create" && <>
        <label><span>{t("boardColumnName")}</span><input className="board-field" autoFocus value={name}
          onChange={(event) => setName(event.target.value)} /></label>
        <button type="submit" className="board-action board-action-primary" disabled={!name.trim()}>
          <Icon name="plus" />{t("boardAddColumn")}
        </button>
      </>}
      {panel.kind === "settings" && column && <>
        <label><span>{t("boardColumnName")}</span><BoardTextField value={boardColumnName(column)} label={t("boardColumnName")}
          onCommit={(value) => updateColumn({ name: value })} /></label>
        <div>
          <span className="board-field-label">{t("boardColumnColor")}</span>
          <div className="board-color-options">
            {BOARD_COLORS.map((color) => <button type="button" key={color} data-board-color={color}
              aria-pressed={boardColumnColor(column) === color} aria-label={t(`boardColor_${color}`)}
              title={t(`boardColor_${color}`)} onClick={() => updateColumn({ color })}><i className="board-dot" /></button>)}
          </div>
        </div>
        <label><span>{t("boardColumnRole")}</span><select className="board-field" value={column.role}
          onChange={(event) => {
            const role = event.target.value as BoardColumnRole;
            onColumns((current) => setBoardColumnRole(current, column.id, role));
          }}>
          {BOARD_ROLES.map((role) => <option key={role} value={role}>{t(`boardRole_${role}`)}</option>)}
        </select></label>
        <label><span>{t("boardWip")}</span><input key={column.wipLimit ?? ""} className="board-field" type="number"
          min={1} max={BOARD_LIMITS.wip} step={1} placeholder={t("boardNoLimit")} defaultValue={column.wipLimit ?? ""}
          onBlur={(event) => {
            if (!event.currentTarget.validity.valid) { event.currentTarget.value = String(column.wipLimit ?? ""); return; }
            const value = event.currentTarget.value ? event.currentTarget.valueAsNumber : undefined;
            if (value !== column.wipLimit) updateColumn({ wipLimit: value });
          }} /></label>
        <button type="button" className="board-action board-action-primary" onClick={onClose}>{t("close")}</button>
      </>}
      {panel.kind === "clear" && column && <>
        <p>{t("boardClearDoneConfirm", { count: column.cards.filter((card) => isBoardCardDone(card, column)).length })}</p>
        <button type="submit" className="board-action board-action-danger"><Icon name="trash" />{t(buttonLabel)}</button>
      </>}
      {panel.kind === "remove" && column && <>
        {column.cards.length > 0 && (
          options.length ? <label><span>{t("boardMigrateTasks", { count: column.cards.length })}</span>
            <select className="board-field" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
              {options.map((option) => <option key={option.id} value={option.id}>{boardColumnName(option)}</option>)}
            </select></label>
            : <p>{t("boardMigrateFirst")}</p>
        )}
        <button type="submit" className="board-action board-action-danger"
          disabled={column.cards.length > 0 && !options.some((option) => option.id === destinationId)}>
          <Icon name="trash" />{t(column.cards.length ? "boardMoveAndDelete" : buttonLabel)}
        </button>
      </>}
    </form>
  </aside>;
}
