import { useEffect, useRef, useState, type ChangeEvent, type ComponentProps, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { boardColumnColor, boardProgress } from "../core/board.ts";
import type { BoardCard, BoardColumn, BoardColumnColor } from "../types.ts";
import { t } from "./i18n.ts";
import { Icon } from "./icons.tsx";

export function boardColumnName(column: BoardColumn): string {
  switch (column.name) {
    case "待办": case "To do": return t("todo");
    case "进行中": case "In progress": return t("inProgress");
    case "完成": case "Done": return t("completedColumn");
    default: return column.name;
  }
}

export function BoardIconButton({ icon, label, className, ...props }: ComponentProps<"button"> & {
  icon: string;
  label: string;
}) {
  return <button type="button" className={`board-icon${className ? ` ${className}` : ""}`}
    title={label} aria-label={label} {...props}><Icon name={icon} /></button>;
}

export function BoardCheck({ done, onClick }: { done: boolean; onClick: () => void }) {
  return <button type="button" role="checkbox" aria-checked={done} className="board-check"
    aria-label={t(done ? "boardMarkOpen" : "boardMarkDone")}
    title={t(done ? "boardMarkOpen" : "boardMarkDone")} onClick={onClick}>
    {done && <Icon name="check" />}
  </button>;
}

export function BoardProgress({ done, doing = 0, total, children }: {
  done: number;
  doing?: number;
  total: number;
  children?: ReactNode;
}) {
  const percent = total ? Math.round(done / total * 100) : 0;
  const label = t("boardProgress", { done, total, percent });
  return <div className="board-progress" title={label}>
    <div className="board-progress-track" role="progressbar" aria-label={label} aria-valuenow={percent}>
      {done > 0 && <i className="is-done" style={{ width: `${done / total * 100}%` }} />}
      {doing > 0 && <i className="is-doing" style={{ width: `${doing / total * 100}%` }} />}
    </div>
    <span>{children ?? `${done}/${total}`}</span>
  </div>;
}

export function BoardCompactSummary({ columns, semantic }: { columns: BoardColumn[]; semantic?: boolean }) {
  const progress = boardProgress(columns);
  return <div className={`board-summary${semantic ? " board-summary-semantic" : ""}`}>
    {semantic && <span className="compact-kind">{t("nodeKind_board")}</span>}
    <BoardProgress {...progress}>
      {semantic ? `${progress.done}/${progress.total}` : t("boardProgress", {
        done: progress.done, total: progress.total, percent: progress.percent,
      })}
    </BoardProgress>
    {!semantic && <>
      {columns.length > 0 && <div className="board-summary-columns">
        {columns.map((column) => <span key={column.id} data-board-color={boardColumnColor(column)}
          title={`${boardColumnName(column)} · ${column.cards.length}`}>
          <i className="board-dot" /><span>{boardColumnName(column)}</span><b>{column.cards.length}</b>
        </span>)}
      </div>}
      {progress.next && <div className="board-summary-next" title={t("boardNext", { text: progress.next.text })}>
        <PriorityMark priority={progress.next.priority} />
        <span>{progress.next.text}</span>
      </div>}
    </>}
  </div>;
}

export function PriorityMark({ priority, showLabel }: { priority: BoardCard["priority"]; showLabel?: boolean }) {
  if (!priority || priority === "none") return null;
  const label = t(`boardPriority_${priority}`);
  return <span className="board-priority" data-priority={priority} title={label} aria-label={label}>
    {priority === "urgent" ? <Icon name="priorityUrgent" /> : <span className="board-priority-bars" aria-hidden="true"><i /><i /><i /></span>}
    {showLabel && <span>{label}</span>}
  </span>;
}

const tagColors: BoardColumnColor[] = ["teal", "violet", "blue", "amber", "green"];

export function tagColor(tag: string): BoardColumnColor {
  let hash = 0;
  for (const char of tag.toLowerCase()) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return tagColors[hash % tagColors.length];
}

export function boardDate(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Inline field edits produce a single canvas undo step on commit. */
export function BoardTextField({
  value, label, onCommit, onCancel, multiline, maxLength, autoFocus, allowEmpty, className, placeholder,
}: {
  value: string;
  label: string;
  onCommit: (value: string) => void;
  onCancel?: () => void;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  allowEmpty?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const canceled = useRef(false);
  useEffect(() => setDraft(value), [value]);
  const props = {
    "aria-label": label,
    className: `board-field ${className ?? ""}`,
    value: draft,
    maxLength,
    autoFocus,
    placeholder,
    onFocus: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (onCancel) event.currentTarget.select();
    },
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.currentTarget.value),
    onBlur: () => {
      if (canceled.current) return;
      const next = draft.trim();
      if ((allowEmpty || next) && next !== value) onCommit(next);
      else {
        setDraft(value);
        onCancel?.();
      }
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Enter" && (!multiline || event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.currentTarget.blur();
      }
      if (onCancel && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        canceled.current = true;
        onCancel();
      }
    },
  };
  return multiline ? <textarea {...props} rows={2} /> : <input {...props} />;
}
