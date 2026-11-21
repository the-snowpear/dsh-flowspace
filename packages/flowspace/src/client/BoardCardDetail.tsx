import { useId, useState, type FormEvent } from "react";
import { BOARD_LIMITS, BOARD_PRIORITIES, isBoardCardDone, moveChecklistItem } from "../core/board.ts";
import type { BoardCard, BoardCardPriority, BoardChecklistItem, BoardColumn } from "../types.ts";
import { boardColumnName, boardDate, BoardCheck, BoardIconButton, BoardProgress, BoardTextField, tagColor } from "./BoardControls.tsx";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";

export function BoardCardDetail({
  card, column, columns, referenced, onClose, onUpdate, onToggleDone, onMove,
  onReference, onDispatch, onDelete,
}: {
  card: BoardCard;
  column: BoardColumn;
  columns: BoardColumn[];
  referenced: boolean;
  onClose: () => void;
  onUpdate: (update: (current: BoardCard) => BoardCard) => void;
  onToggleDone: () => void;
  onMove: (columnId: string) => void;
  onReference: () => void;
  onDispatch: () => void;
  onDelete: () => void;
}) {
  const heading = useId();
  const [tag, setTag] = useState("");
  const tags = card.tags ?? [];
  const tagSet = new Set(tags.map((text) => text.toLowerCase()));
  const availableTags = new Map<string, string>();
  for (const lane of columns) {
    for (const task of lane.cards) {
      for (const label of task.tags ?? []) {
        const key = label.toLowerCase();
        if (!tagSet.has(key)) availableTags.set(key, label);
      }
    }
  }
  const addTag = (text: string) => {
    const value = text.trim();
    if (value && !tagSet.has(value.toLowerCase()) && tags.length < BOARD_LIMITS.tags) {
      onUpdate((current) => ({ ...current, tags: [...(current.tags ?? []), value] }));
      setTag("");
    }
  };
  const updateChecklist = (update: (items: BoardChecklistItem[]) => BoardChecklistItem[]) => {
    onUpdate((current) => ({ ...current, checklist: update(current.checklist ?? []) }));
  };

  return <aside className="board-drawer board-detail" aria-labelledby={heading}>
    <header className="board-drawer-header">
      <BoardIconButton icon="chevronLeft" label={t("close")} onClick={onClose} />
      <strong id={heading}>{t("boardDetails")}</strong>
    </header>
    <div className="board-drawer-scroll">
      <div className="board-detail-title">
        <BoardCheck done={isBoardCardDone(card, column)} onClick={onToggleDone} />
        <BoardTextField value={card.text} label={t("boardTitle")} className="board-title-field"
          multiline autoFocus onCommit={(text) => onUpdate((current) => ({ ...current, text }))} />
      </div>
      <div className="board-detail-properties">
        <label>
          <span>{t("boardCardColumn")}</span>
          <select className="board-field" value={column.id} onChange={(event) => onMove(event.target.value)}>
            {columns.map((lane) => <option key={lane.id} value={lane.id}>{boardColumnName(lane)}</option>)}
          </select>
        </label>
        <label>
          <span>{t("boardPriority")}</span>
          <select className="board-field" value={card.priority ?? "none"} onChange={(event) => {
            const priority = event.target.value as BoardCardPriority;
            onUpdate((current) => ({ ...current, priority: priority === "none" ? undefined : priority }));
          }}>
            {BOARD_PRIORITIES.map((priority) => <option value={priority} key={priority}>{t(`boardPriority_${priority}`)}</option>)}
          </select>
        </label>
      </div>
      <div className="board-detail-section">
        <label className="board-field-label" htmlFor={`${heading}-date`}><Icon name="calendar" />{t("boardDueDate")}</label>
        <input id={`${heading}-date`} className="board-field" type="date" max="9999-12-31" value={card.dueDate ?? ""}
          onChange={(event) => {
            const dueDate = event.target.value || undefined;
            if (event.target.validity.valid) onUpdate((current) => ({ ...current, dueDate }));
          }} />
        <div className="board-inline-actions">
          {[0, 1].map((offset) => <button key={offset} type="button" onClick={() => {
            onUpdate((current) => ({ ...current, dueDate: boardDate(offset) }));
          }}>{t(offset ? "boardTomorrow" : "boardToday")}</button>)}
          {card.dueDate && <button type="button" onClick={() => onUpdate((current) => ({ ...current, dueDate: undefined }))}>
            {t("boardDateClear")}
          </button>}
        </div>
      </div>
      <div className="board-detail-section">
        <h4><Icon name="tag" />{t("boardTags")}</h4>
        {tags.length > 0 && <div className="board-tags">
          {tags.map((text) => <span key={text} className="board-tag" data-board-color={tagColor(text)}>
            <span>{text}</span>
            <BoardIconButton icon="x" label={t("boardRemoveTag", { tag: text })}
              onClick={() => onUpdate((current) => ({ ...current, tags: current.tags?.filter((item) => item !== text) }))} />
          </span>)}
        </div>}
        {tags.length < BOARD_LIMITS.tags && <>
          <form onSubmit={(event) => { event.preventDefault(); addTag(tag); }}>
            <input className="board-field" value={tag} maxLength={BOARD_LIMITS.tag} aria-label={t("boardNewTag")}
              placeholder={t("boardNewTag")} onChange={(event) => setTag(event.target.value)} />
          </form>
          {!!availableTags.size && <div className="board-tags board-tag-options">
            {[...availableTags.values()].map((label) => <button type="button" className="board-tag" key={label}
              data-board-color={tagColor(label)} onClick={() => addTag(label)}><Icon name="plus" />{label}</button>)}
          </div>}
        </>}
      </div>
      <div className="board-detail-section">
        <h4><Icon name="note" />{t("boardDescription")}</h4>
        <BoardTextField value={card.description ?? ""} label={t("boardDescription")} multiline allowEmpty
          maxLength={BOARD_LIMITS.description} placeholder={t("boardDescriptionHint")}
          onCommit={(description) => onUpdate((current) => ({ ...current, description: description || undefined }))} />
      </div>
      <BoardChecklist items={card.checklist ?? []} onUpdate={updateChecklist} />
      {!!card.comments?.length && <section className="board-detail-section">
        <h4><Icon name="note" />{t("flow_board_comments")}</h4>
        {card.comments.map(comment => <p key={comment.id} className="user-content">{comment.text}</p>)}
      </section>}
    </div>
    <footer className="board-drawer-footer">
      <BoardIconButton icon="link" label={t(referenced ? "boardRemoveReference" : "boardUseReference")}
        aria-pressed={referenced} onClick={onReference} />
      <button type="button" className="board-action board-action-primary" onClick={onDispatch}>
        <Icon name="sendTask" /><span>{t("boardDispatch")}</span>
      </button>
      <BoardIconButton icon="trash" className="board-danger" label={t("deleteCard")} onClick={onDelete} />
    </footer>
  </aside>;
}

function BoardChecklist({ items, onUpdate }: {
  items: BoardChecklistItem[];
  onUpdate: (update: (current: BoardChecklistItem[]) => BoardChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const done = items.filter((item) => item.done).length;
  const add = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const item = { id: crypto.randomUUID(), text, done: false };
    onUpdate((current) => [...current, item]);
    setDraft("");
  };
  const change = (id: string, update: (item: BoardChecklistItem) => BoardChecklistItem) => {
    onUpdate((current) => current.map((item) => item.id === id ? update(item) : item));
  };
  return <section className="board-detail-section board-checklist">
    <div className="board-checklist-heading">
      <h4><Icon name="checklist" />{t("boardChecklist")}</h4>
      {items.length > 0 && <BoardProgress done={done} total={items.length} />}
    </div>
    {items.map((item, index) => <div className="board-checklist-row" key={item.id} data-done={item.done}>
      <BoardCheck done={item.done} onClick={() => change(item.id, (current) => ({ ...current, done: !current.done }))} />
      <BoardTextField value={item.text} label={t("boardChecklistItem")} maxLength={BOARD_LIMITS.checklistText}
        onCommit={(text) => change(item.id, (current) => ({ ...current, text }))} />
      <div className="board-checklist-actions">
        <BoardIconButton icon="arrowUp" label={t("boardMoveUp")} disabled={index === 0}
          onClick={() => onUpdate((current) => moveChecklistItem(current, item.id, -1))} />
        <BoardIconButton icon="arrowDown" label={t("boardMoveDown")} disabled={index === items.length - 1}
          onClick={() => onUpdate((current) => moveChecklistItem(current, item.id, 1))} />
        <BoardIconButton icon="x" label={t("boardDeleteChecklistItem")}
          onClick={() => onUpdate((current) => current.filter((currentItem) => currentItem.id !== item.id))} />
      </div>
    </div>)}
    {items.length < BOARD_LIMITS.checklist && <form onSubmit={add} className="board-checklist-add">
      <Icon name="plus" />
      <input className="board-field" maxLength={BOARD_LIMITS.checklistText} value={draft} aria-label={t("boardAddChecklistItem")}
        placeholder={t("boardAddChecklistItem")} onChange={(event) => setDraft(event.target.value)} />
    </form>}
  </section>;
}
