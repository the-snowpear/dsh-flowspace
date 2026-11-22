import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { TeamModel, TeamModelRoute } from "../../types.ts";
import { useAnchoredPopover } from "../hooks/useAnchoredPopover.ts";
import { useListboxNavigation } from "../hooks/useListboxNavigation.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { hueStyle, ModelChip } from "./ModelIdentity.tsx";

const modelKey = ({ provider, model }: Pick<TeamModel, "provider" | "model">) =>
  JSON.stringify([provider, model]);
const supportsPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

export function ModelSelect({
  value,
  routes,
  onChange,
  label,
  placeholder,
  allowEmpty,
}: {
  value?: TeamModel;
  routes: TeamModelRoute[];
  onChange: (model: TeamModel | undefined) => void;
  label: string;
  placeholder?: string;
  /** Adds a first option that clears the value (e.g. "use the role's model"). */
  allowEmpty?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const key = value?.model ? modelKey(value) : "";
  const known = routes.find((route) => modelKey(route) === key);
  const options: { key: string; route?: TeamModelRoute }[] = [
    ...(allowEmpty ? [{ key: "" }] : []),
    ...routes.map((route) => ({ key: modelKey(route), route })),
  ];

  const place = useCallback(() => {
    const button = trigger.current;
    const popover = list.current;
    if (!button || !popover) return;
    const box = button.getBoundingClientRect();
    const height = Math.min(320, popover.scrollHeight || 320);
    const below = window.innerHeight - box.bottom - 12;
    const up = below < Math.min(height, 220) && box.top > below;
    const width = Math.max(box.width, 260);
    popover.style.width = `${width}px`;
    popover.style.left = `${Math.min(box.left, window.innerWidth - width - 8)}px`;
    popover.style.top = up ? "" : `${box.bottom + 6}px`;
    popover.style.bottom = up ? `${window.innerHeight - box.top + 6}px` : "";
    popover.dataset.side = up ? "top" : "bottom";
  }, []);

  const hide = useCallback((focus = true) => {
    if (supportsPopover && list.current?.matches(":popover-open")) list.current.hidePopover();
    setOpen(false);
    if (focus) trigger.current?.focus({ preventScroll: true });
  }, []);

  const show = () => {
    const index = Math.max(0, options.findIndex((option) => option.key === key));
    setActive(index);
    setOpen(true);
    if (supportsPopover) list.current?.showPopover();
    place();
    requestAnimationFrame(() => {
      place();
      list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
      list.current?.focus({ preventScroll: true });
    });
  };

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      onChange(
        option.route
          ? {
              provider: option.route.provider,
              model: option.route.model,
              ...(value?.reasoningEffort ? { reasoningEffort: value.reasoningEffort } : {}),
            }
          : undefined,
      );
      hide();
    },
    [options, onChange, value?.reasoningEffort, hide],
  );

  useEffect(() => {
    const popover = list.current;
    if (!popover || !supportsPopover) return;
    const toggled = (event: Event) => {
      if ((event as ToggleEvent).newState === "closed") setOpen(false);
    };
    popover.addEventListener("toggle", toggled);
    return () => popover.removeEventListener("toggle", toggled);
  }, []);

  useAnchoredPopover({
    open,
    popoverRef: list,
    anchorRef: trigger,
    place,
    onClose: hide,
    listenOutside: !supportsPopover,
  });

  const onListKey = useListboxNavigation({
    count: options.length,
    active,
    setActive,
    onSelect: choose,
    onClose: hide,
    selectOnSpace: true,
    scrollToIndex: (index) => {
      list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
    },
  });

  let lastProvider = "";
  return (
    <div className="fs-mselect" data-open={open || undefined}>
      <button
        ref={trigger}
        type="button"
        className="fs-mselect-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => (open ? hide() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
      >
        {value?.model ? (
          <ModelChip model={value} missing={routes.length > 0 && !known} />
        ) : (
          <span className="fs-mselect-placeholder">
            {allowEmpty ?? placeholder ?? t("teamChooseModel")}
          </span>
        )}
        {value?.model && known && <small>{known.providerName}</small>}
        {value?.model && routes.length > 0 && !known && (
          <small className="fs-mselect-warn">{t("teamModelUnavailable")}</small>
        )}
        <Icon name="chev" />
      </button>
      {!allowEmpty && (
        <input
          className="fs-mselect-proxy"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={key}
          onChange={() => undefined}
          onFocus={() => trigger.current?.focus()}
        />
      )}
      <div
        ref={list}
        id={id}
        role="listbox"
        tabIndex={-1}
        aria-label={label}
        className="fs-mselect-list"
        data-fallback={!supportsPopover || undefined}
        {...(supportsPopover ? { popover: "auto" } : {})}
        hidden={!supportsPopover && !open}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onKeyDown={onListKey}
      >
        {options.length === 0 && <p className="fs-mselect-empty">{t("teamNoModels")}</p>}
        {options.map((option, index) => {
          const header =
            option.route && option.route.providerName !== lastProvider
              ? option.route.providerName
              : "";
          if (option.route) lastProvider = option.route.providerName;
          return (
            <div key={option.key || "empty"} role="presentation">
              {header && (
                <div className="fs-mselect-group" role="presentation">
                  {header}
                </div>
              )}
              <div
                id={`${id}-${index}`}
                role="option"
                data-index={index}
                aria-selected={option.key === key}
                data-active={index === active || undefined}
                className="fs-mselect-option"
                style={option.route ? hueStyle(option.route) : undefined}
                onPointerMove={() => index !== active && setActive(index)}
                onClick={() => choose(index)}
              >
                {option.route ? (
                  <>
                    <i aria-hidden="true" />
                    <span>
                      <b>{option.route.name}</b>
                      <small>{option.route.model}</small>
                    </span>
                  </>
                ) : (
                  <>
                    <Icon name="refresh" />
                    <span>
                      <b>{allowEmpty}</b>
                    </span>
                  </>
                )}
                {option.key === key && <Icon name="check" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
