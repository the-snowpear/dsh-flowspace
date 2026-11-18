import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  NodeKind,
  WorkflowTemplate,
} from "../types.ts";
import { getLanguage, t } from "./i18n.ts";
import { Icon } from "./icons.tsx";
import { allTemplates } from "./templates.ts";

const useClientLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type QuickCreateCategory = "all" | "nodes" | "tools" | "blueprints";

export interface WireDropContext {
  portKind: "reference" | "continuation";
  direction: "out" | "in";
  sourceNode?: FlowNode;
  targetNode?: FlowNode;
  worldPoint?: { x: number; y: number };
}

export type QuickCreateSelection =
  | {
      action: "create-node";
      nodeKind: NodeKind;
      nodePatch?: Partial<FlowNode>;
      edgePatch?: Partial<FlowEdge>;
    }
  | {
      action: "create-display";
      fixed: boolean;
    }
  | {
      action: "instantiate-template";
      template: WorkflowTemplate;
      edgePatch?: Partial<FlowEdge>;
    }
  | {
      action: "existing-session";
    };

interface QuickCreateEntry {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: Exclude<QuickCreateCategory, "all">;
  badge?: string;
  selection: QuickCreateSelection;
}

export interface QuickCreateMenuProps {
  open?: boolean;
  anchor: { x: number; y: number };
  doc: FlowspaceDocument;
  wireContext?: WireDropContext | null;
  allowExistingSession?: boolean;
  onSelect: (selection: QuickCreateSelection) => void;
  onClose: () => void;
}

export function QuickCreateMenu({
  open = true,
  anchor,
  doc,
  wireContext = null,
  allowExistingSession = true,
  onSelect,
  onClose,
}: QuickCreateMenuProps) {
  const inputId = useId();
  const listboxId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<QuickCreateCategory>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: anchor.x,
    top: anchor.y,
  });

  const templates = useMemo(
    () => allTemplates(doc, getLanguage()),
    [doc],
  );

  const entries = useMemo<QuickCreateEntry[]>(() => {
    /* Mode B: Wire-Drop Contextual Quick-Connect */
    if (wireContext) {
      const { portKind, direction } = wireContext;
      if (portKind === "continuation" && direction === "out") {
        const items: QuickCreateEntry[] = [
          {
            id: "cont-out-auto",
            label: t("qcAutoAgent"),
            description: t("qcAutoAgentDesc"),
            icon: "bolt",
            category: "nodes",
            badge: t("automatic"),
            selection: {
              action: "create-node",
              nodeKind: "agent",
              edgePatch: {
                kind: "continuation",
                mode: "conclusion",
                trigger: "auto",
              },
            },
          },
          {
            id: "cont-out-confirm",
            label: t("qcConfirmAgent"),
            description: t("qcConfirmAgentDesc"),
            icon: "pause",
            category: "nodes",
            badge: t("confirm"),
            selection: {
              action: "create-node",
              nodeKind: "agent",
              nodePatch: { roleLabel: "review" },
              edgePatch: {
                kind: "continuation",
                mode: "conclusion",
                trigger: "confirm",
              },
            },
          },
          {
            id: "cont-out-session",
            label: t("qcSessionAgent"),
            description: t("qcSessionAgentDesc"),
            icon: "clock",
            category: "nodes",
            badge: t("session"),
            selection: {
              action: "create-node",
              nodeKind: "agent",
              edgePatch: {
                kind: "continuation",
                mode: "session",
                trigger: "auto",
              },
            },
          },
          {
            id: "cont-out-fork",
            label: t("qcForkAgent"),
            description: t("qcForkAgentDesc"),
            icon: "fork",
            category: "nodes",
            badge: t("fork"),
            selection: {
              action: "create-node",
              nodeKind: "agent",
              edgePatch: {
                kind: "continuation",
                mode: "fork",
                trigger: "confirm",
              },
            },
          },
        ];
        if (allowExistingSession) {
          items.push({
            id: "cont-out-existing",
            label: t("existingSession"),
            icon: "chat",
            category: "nodes",
            selection: { action: "existing-session" },
          });
        }
        for (const tpl of templates) {
          const tplTitle = tpl.builtin ? t(tpl.title) : tpl.title;
          items.push({
            id: `cont-out-tpl-${tpl.id}`,
            label: t("qcChainBlueprint", { name: tplTitle }),
            description: tpl.builtin ? t(tpl.description) : tpl.description,
            icon: "canvas",
            category: "blueprints",
            badge: t("nodesCount", { count: tpl.nodes.length }),
            selection: {
              action: "instantiate-template",
              template: tpl,
              edgePatch: {
                kind: "continuation",
                mode: "conclusion",
                trigger: "auto",
              },
            },
          });
        }
        return items;
      }

      if (portKind === "reference" && direction === "out") {
        const isAgentSource = wireContext.sourceNode?.kind === "agent";
        const items: QuickCreateEntry[] = [
          {
            id: "ref-out-agent",
            label: t("qcRefConsumerAgent"),
            description: t("qcRefConsumerAgentDesc"),
            icon: "agent",
            category: "nodes",
            selection: {
              action: "create-node",
              nodeKind: "agent",
              edgePatch: {
                kind: "reference",
                mode: "conclusion",
                trigger: "off",
              },
            },
          },
          {
            id: "ref-out-follow",
            label: t("qcFollowDisplay"),
            description: t("qcFollowDisplayDesc"),
            icon: "quote",
            category: "nodes",
            badge: isAgentSource ? t("follow") : undefined,
            selection: {
              action: "create-display",
              fixed: false,
            },
          },
          {
            id: "ref-out-pinned",
            label: t("qcPinnedDisplay"),
            description: t("qcPinnedDisplayDesc"),
            icon: "pin",
            category: "nodes",
            badge: t("fixed"),
            selection: {
              action: "create-display",
              fixed: true,
            },
          },
        ];
        for (const tpl of templates) {
          const tplTitle = tpl.builtin ? t(tpl.title) : tpl.title;
          items.push({
            id: `ref-out-tpl-${tpl.id}`,
            label: t("qcChainBlueprint", { name: tplTitle }),
            description: tpl.builtin ? t(tpl.description) : tpl.description,
            icon: "canvas",
            category: "blueprints",
            selection: {
              action: "instantiate-template",
              template: tpl,
              edgePatch: { kind: "reference", trigger: "off" },
            },
          });
        }
        return items;
      }

      if (portKind === "continuation" && direction === "in") {
        return [
          {
            id: "cont-in-upstream",
            label: t("qcUpstreamAgent"),
            description: t("qcUpstreamAgentDesc"),
            icon: "agent",
            category: "nodes",
            selection: {
              action: "create-node",
              nodeKind: "agent",
              edgePatch: {
                kind: "continuation",
                mode: "conclusion",
                trigger: "auto",
              },
            },
          },
          {
            id: "cont-in-plan",
            label: t("qcUpstreamPlanAgent"),
            description: t("qcUpstreamPlanAgentDesc"),
            icon: "bolt",
            category: "nodes",
            badge: t("badgePlan"),
            selection: {
              action: "create-node",
              nodeKind: "agent",
              nodePatch: { planMode: true, roleLabel: "implementation" },
              edgePatch: {
                kind: "continuation",
                mode: "session",
                trigger: "auto",
              },
            },
          },
        ];
      }

      /* reference + in */
      return [
        {
          id: "ref-in-note",
          label: t("newNote"),
          description: t("notePlaceholder"),
          icon: "note",
          category: "nodes",
          selection: {
            action: "create-node",
            nodeKind: "note",
            edgePatch: { kind: "reference", trigger: "off" },
          },
        },
        {
          id: "ref-in-file",
          label: t("newFile"),
          description: t("filesDescription"),
          icon: "file",
          category: "nodes",
          selection: {
            action: "create-node",
            nodeKind: "file",
            edgePatch: { kind: "reference", trigger: "off" },
          },
        },
        {
          id: "ref-in-board",
          label: t("newBoard"),
          icon: "board",
          category: "nodes",
          selection: {
            action: "create-node",
            nodeKind: "board",
            edgePatch: { kind: "reference", trigger: "off" },
          },
        },
        {
          id: "ref-in-git",
          label: t("newGit"),
          icon: "git",
          category: "tools",
          selection: {
            action: "create-node",
            nodeKind: "git",
            edgePatch: { kind: "reference", trigger: "off" },
          },
        },
        {
          id: "ref-in-changes",
          label: t("newChanges"),
          icon: "diff",
          category: "tools",
          selection: {
            action: "create-node",
            nodeKind: "changes",
            edgePatch: { kind: "reference", trigger: "off" },
          },
        },
        {
          id: "ref-in-term",
          label: t("newTerminal"),
          icon: "term",
          category: "tools",
          selection: {
            action: "create-node",
            nodeKind: "terminal",
            edgePatch: { kind: "reference", trigger: "off" },
          },
        },
      ];
    }

    /* Mode A: Canvas Fuzzy Quick-Search (Tab / Shift+A / Right-Click) */
    const list: QuickCreateEntry[] = [
      {
        id: "node-agent",
        label: t("newAgent"),
        description: t("taskPlaceholder"),
        icon: "agent",
        category: "nodes",
        selection: { action: "create-node", nodeKind: "agent" },
      },
      {
        id: "node-plan-agent",
        label: `${t("newAgent")} · ${t("planMode")}`,
        description: t("qcUpstreamPlanAgentDesc"),
        icon: "bolt",
        category: "nodes",
        badge: t("badgePlan"),
        selection: {
          action: "create-node",
          nodeKind: "agent",
          nodePatch: { planMode: true, roleLabel: "implementation" },
        },
      },
      ...(allowExistingSession
        ? [
            {
              id: "node-existing",
              label: t("existingSession"),
              icon: "chat",
              category: "nodes" as const,
              selection: { action: "existing-session" as const },
            },
          ]
        : []),
      {
        id: "node-note",
        label: t("newNote"),
        description: t("notePlaceholder"),
        icon: "note",
        category: "nodes",
        selection: { action: "create-node", nodeKind: "note" },
      },
      {
        id: "node-board",
        label: t("newBoard"),
        icon: "board",
        category: "nodes",
        selection: { action: "create-node", nodeKind: "board" },
      },
      {
        id: "node-file",
        label: t("newFile"),
        description: t("filesDescription"),
        icon: "file",
        category: "nodes",
        selection: { action: "create-node", nodeKind: "file" },
      },
      {
        id: "node-display",
        label: t("newDisplay"),
        icon: "quote",
        category: "nodes",
        selection: { action: "create-node", nodeKind: "display" },
      },
      {
        id: "tool-git",
        label: t("newGit"),
        icon: "git",
        category: "tools",
        selection: { action: "create-node", nodeKind: "git" },
      },
      {
        id: "tool-changes",
        label: t("newChanges"),
        description: t("noChangesYet"),
        icon: "diff",
        category: "tools",
        selection: { action: "create-node", nodeKind: "changes" },
      },
      {
        id: "tool-terminal",
        label: t("newTerminal"),
        icon: "term",
        category: "tools",
        selection: { action: "create-node", nodeKind: "terminal" },
      },
    ];

    for (const tpl of templates) {
      list.push({
        id: `tpl-${tpl.id}`,
        label: tpl.builtin ? t(tpl.title) : tpl.title,
        description: tpl.builtin ? t(tpl.description) : tpl.description,
        icon: "canvas",
        category: "blueprints",
        badge: t("nodesCount", { count: tpl.nodes.length }),
        selection: { action: "instantiate-template", template: tpl },
      });
    }
    return list;
  }, [wireContext, allowExistingSession, templates]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      const haystack = `${item.label} ${item.description ?? ""} ${item.badge ?? ""}`.toLowerCase();
      return needle
        .split(/\s+/)
        .every((tok) => haystack.includes(tok));
    });
  }, [entries, category, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, category, wireContext]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      const prev = returnFocusRef.current;
      if (prev && prev.isConnected) {
        prev.focus();
      }
    };
  }, [open]);

  /* Viewport-aware flip on both block and inline axes so menus never clip */
  useClientLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const reposition = () => {
      const rect = el.getBoundingClientRect();
      const pad = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = anchor.x;
      let top = anchor.y;
      if (left + rect.width > vw - pad) {
        left = Math.max(pad, anchor.x - rect.width);
      }
      if (top + rect.height > vh - pad) {
        top = Math.max(pad, anchor.y - rect.height);
      }
      setPos({
        left: Math.max(pad, Math.min(left, vw - rect.width - pad)),
        top: Math.max(pad, Math.min(top, vh - rect.height - pad)),
      });
    };
    reposition();
    const ro = new ResizeObserver(reposition);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, anchor.x, anchor.y, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(ev.target as Node | null)
      ) {
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, onClose]);

  if (!open) return null;

  const activeItem = filtered[activeIndex];
  const headerTitle = wireContext
    ? wireContext.direction === "out"
      ? t("quickConnectFrom", {
          name: wireContext.sourceNode?.title ?? t("canvas"),
        })
      : t("quickConnectTo", {
          name: wireContext.targetNode?.title ?? t("canvas"),
        })
    : t("quickCreateTitle");

  const availableCategories: QuickCreateCategory[] = wireContext
    ? entries.some((e) => e.category === "blueprints")
      ? ["all", "nodes", "blueprints"]
      : ["all"]
    : ["all", "nodes", "tools", "blueprints"];

  return (
    <div
      ref={panelRef}
      className="fs-menu fs-quick-create"
      style={{
        left: pos.left,
        top: pos.top,
        width: 344,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "min(440px, calc(100svh - 24px))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 4px 6px",
        }}
      >
        <small
          className="user-content"
          style={{
            margin: 0,
            fontWeight: 600,
            color: "var(--text-2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {headerTitle}
        </small>
        <kbd style={{ fontSize: 10, opacity: 0.7 }}>Esc</kbd>
      </div>

      <div style={{ position: "relative", marginBottom: 6 }}>
        <label
          htmlFor={inputId}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          {headerTitle}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={true}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeItem ? `${listboxId}-${activeItem.id}` : undefined
          }
          className="text-field"
          placeholder={t("quickCreatePlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onClose();
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (filtered.length) {
                setActiveIndex((i) => (i + 1) % filtered.length);
              }
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              if (filtered.length) {
                setActiveIndex(
                  (i) => (i - 1 + filtered.length) % filtered.length,
                );
              }
              return;
            }
            if (e.key === "Home") {
              e.preventDefault();
              setActiveIndex(0);
              return;
            }
            if (e.key === "End") {
              e.preventDefault();
              if (filtered.length) setActiveIndex(filtered.length - 1);
              return;
            }
            if (e.key === "Tab" && availableCategories.length > 1) {
              e.preventDefault();
              const cur = availableCategories.indexOf(category);
              const nextIdx = e.shiftKey
                ? (cur - 1 + availableCategories.length) %
                  availableCategories.length
                : (cur + 1) % availableCategories.length;
              setCategory(availableCategories[nextIdx]);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.nativeEvent.isComposing || e.keyCode === 229) {
                return;
              }
              const chosen = filtered[activeIndex];
              if (chosen) {
                onSelect(chosen.selection);
                onClose();
              }
            }
          }}
        />
      </div>

      {availableCategories.length > 1 && (
        <div
          className="choice-buttons"
          style={{ marginBottom: 6, flexShrink: 0 }}
        >
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              tabIndex={-1}
              className={category === cat ? "selected" : ""}
              onClick={() => {
                setCategory(cat);
                inputRef.current?.focus();
              }}
            >
              {t(
                {
                  all: "catAll",
                  nodes: "catNodes",
                  tools: "catTools",
                  blueprints: "catBlueprints",
                }[cat],
              )}
            </button>
          ))}
        </div>
      )}

      <div
        id={listboxId}
        role="listbox"
        aria-label={headerTitle}
        style={{
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {filtered.length ? (
          filtered.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={item.id}
                id={`${listboxId}-${item.id}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onSelect(item.selection);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  textAlign: "left",
                  background: isSelected ? "var(--accent-soft)" : "transparent",
                }}
              >
                <span className="menu-icon">
                  <Icon name={item.icon} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "space-between",
                    }}
                  >
                    <b className="user-content" style={{ fontWeight: 600 }}>
                      {item.label}
                    </b>
                    {item.badge && (
                      <small
                        style={{
                          margin: 0,
                          padding: "0 6px",
                          borderRadius: 999,
                          background: "var(--surface-2)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.badge}
                      </small>
                    )}
                  </span>
                  {item.description && (
                    <small className="user-content">{item.description}</small>
                  )}
                </span>
              </button>
            );
          })
        ) : (
          <p
            className="muted"
            style={{ textAlign: "center", padding: "18px 8px", margin: 0 }}
          >
            {t("noSearchResults")}
          </p>
        )}
      </div>
    </div>
  );
}
