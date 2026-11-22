import { Icon } from "../icons.tsx";

export interface MenuItem {
  divider?: boolean;
  heading?: string;
  label?: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  fn?: () => void;
}

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
  returnFocus?: HTMLElement | null;
}

export function ContextMenu({
  menu,
  onClose,
}: {
  menu: MenuState;
  onClose: () => void;
}) {
  return (
    <div
      className="fs-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onKeyDown={
        menu.returnFocus
          ? (event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              event.stopPropagation();
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
              );
              const index = buttons.findIndex((button) => button === document.activeElement);
              const offset = event.key === "ArrowDown" ? 1 : -1;
              buttons[(index + offset + buttons.length) % buttons.length]?.focus();
            }
          : undefined
      }
    >
      {menu.items.map((item, idx) =>
        item.divider ? (
          <hr key={idx} />
        ) : item.heading ? (
          <small key={idx}>{item.heading}</small>
        ) : (
          <button
            key={idx}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={item.danger ? "danger" : ""}
            onClick={() => {
              menu.returnFocus?.focus({ preventScroll: true });
              onClose();
              item.fn?.();
            }}
          >
            <span className="menu-icon">
              {item.icon ? <Icon name={item.icon} /> : null}
            </span>
            <span>
              {item.label}
              {item.description && <small>{item.description}</small>}
            </span>
            {item.checked ? (
              <Icon name="check" />
            ) : item.shortcut ? (
              <kbd>{item.shortcut}</kbd>
            ) : null}
          </button>
        ),
      )}
    </div>
  );
}
