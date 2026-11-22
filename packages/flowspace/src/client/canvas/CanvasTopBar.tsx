import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  StartRequest,
  WorkspaceBrief,
} from "../../types.ts";
import { t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { BudgetMeter } from "../nodes/PlayViews.tsx";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import type { MenuItem } from "../ui/ContextMenu.tsx";
import type { PromptDialogSpec } from "../ui/PromptDialog.tsx";
import type { RouteId } from "./canvasGraphOps.ts";
import type {
  AnchorTarget,
  EditDocFn,
  ResolvedCanvasPrefs,
  SelectionState,
} from "./canvasTypes.ts";

export interface CanvasTopBarProps {
  rootRef: RefObject<HTMLDivElement>;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  routeName: RouteId;
  workspaces: WorkspaceBrief[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: Dispatch<SetStateAction<string>>;
  waitingAgentNodes: FlowNode[];
  displayedTheme: "dark" | "light";
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setMobileSidebar: Dispatch<SetStateAction<boolean>>;
  inspectorOpen: boolean;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
  hasRunnableSelection: boolean;
  selection: SelectionState;
  setFormModal: Dispatch<SetStateAction<PromptDialogSpec | null>>;
  edit: EditDocFn;
  openAnchoredMenu: (anchor: AnchorTarget, items: MenuItem[]) => void;
  revealNode: (id: string) => void;
  toggleTheme: (button: HTMLElement) => void;
  handleCaptureSnapshot: () => void;
  launchScope: (scope: StartRequest) => void;
}

export function CanvasTopBar({
  rootRef,
  doc,
  snapshot,
  routeName,
  workspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
  waitingAgentNodes,
  displayedTheme,
  sidebarOpen,
  setSidebarOpen,
  setMobileSidebar,
  inspectorOpen,
  setInspectorOpen,
  hasRunnableSelection,
  selection,
  setFormModal,
  edit,
  openAnchoredMenu,
  revealNode,
  toggleTheme,
  handleCaptureSnapshot,
  launchScope,
}: CanvasTopBarProps) {
  return (
    <header className="fs-top">
      <div className="workspace-breadcrumb">
        <button
          type="button"
          className={`icon-button ${sidebarOpen ? "active" : ""}`}
          title={t("projectSessions")}
          onClick={() => {
            if ((rootRef.current?.clientWidth ?? 1000) <= 720) {
              setMobileSidebar((v) => !v);
            } else {
              setSidebarOpen((v) => !v);
            }
          }}
        >
          <Icon name="sidebarLeft" />
        </button>
        <span>{t("workbench")}</span>
        <i>/</i>
        <button
          type="button"
          className="breadcrumb-title-btn user-content"
          onClick={() =>
            setFormModal({
              title: t("rename"),
              initialValue: doc.title,
              onSubmit: (title) =>
                edit((d) => {
                  d.title = title;
                }),
            })
          }
        >
          {routeName === "canvas"
            ? doc.title
            : t(routeName === "team" ? "teamLibrary" : routeName)}
        </button>
      </div>

      <div className="header-actions">
        <BudgetMeter snapshot={snapshot} />
        {doc.nodes.some((node) => node.flowType === "flowspace/trigger") && (
          <button
            type="button"
            className={`icon-button fs-trig-gate ${doc.settings.automaticTriggers ? "active" : ""}`}
            role="switch"
            aria-checked={!!doc.settings.automaticTriggers}
            aria-label={t("flow_trig_gate")}
            title={t("flow_trig_gate")}
            onClick={() =>
              edit((next) => {
                next.settings.automaticTriggers =
                  !next.settings.automaticTriggers;
              })
            }
          >
            <Icon name="bolt" />
          </button>
        )}
        {workspaces.length > 0 && (
          <button
            type="button"
            className="workspace-chip"
            onClick={(ev) =>
              openAnchoredMenu(ev.currentTarget, [
                {
                  label: t("currentWorkspace"),
                  icon: "project",
                  checked: !activeWorkspaceId,
                  fn: () => setActiveWorkspaceId(""),
                },
                ...workspaces.map((w) => ({
                  label: w.name,
                  description: w.path,
                  icon: "project",
                  checked: activeWorkspaceId === w.id,
                  fn: () => setActiveWorkspaceId(w.id),
                })),
              ])
            }
          >
            <Icon name="project" />
            <span>
              {workspaces.find((w) => w.id === activeWorkspaceId)?.name ??
                t("currentWorkspace")}
            </span>
          </button>
        )}

        {waitingAgentNodes.length > 0 && (
          <button
            type="button"
            className="waiting-button"
            onClick={(ev) =>
              openAnchoredMenu(
                ev.currentTarget,
                waitingAgentNodes.map((n) => ({
                  label: n.title,
                  description: t(
                    nodeStatusOf(snapshot, n.id) === "input"
                      ? "approvalNeeded"
                      : "waitingConfirmation",
                  ),
                  icon: "pause",
                  fn: () => revealNode(n.id),
                })),
              )
            }
          >
            <Icon name="pause" />
            <span>
              {t("waitingCount", { count: waitingAgentNodes.length })}
            </span>
          </button>
        )}

        <button
          type="button"
          className="icon-button"
          title={t("theme")}
          onClick={(ev) => toggleTheme(ev.currentTarget)}
        >
          <Icon name={displayedTheme === "dark" ? "moon" : "sun"} />
        </button>

        {routeName === "canvas" && (
          <button
            type="button"
            className={`icon-button ${inspectorOpen ? "active" : ""}`}
            title={t("inspector")}
            onClick={() => setInspectorOpen((v) => !v)}
          >
            <Icon name="side" />
          </button>
        )}

        <button
          type="button"
          className="header-save"
          onClick={handleCaptureSnapshot}
        >
          <Icon name="clock" />
          <span>{t("saveSnapshot")}</span>
        </button>

        {hasRunnableSelection && routeName === "canvas" && (
          <button
            type="button"
            className="icon-button"
            title={t("runAll")}
            onClick={() => launchScope({ kind: "global", nodeIds: [] })}
          >
            <Icon name="play" />
          </button>
        )}

        <button
          type="button"
          className="button button-primary header-run"
          onClick={() => {
            if (hasRunnableSelection && routeName === "canvas") {
              if (selection.groups.length === 1 && !selection.nodes.length) {
                launchScope({
                  kind: "group",
                  nodeIds: [selection.groups[0]],
                });
              } else {
                launchScope({
                  kind: "selection",
                  nodeIds: [...selection.nodes, ...selection.groups],
                });
              }
            } else {
              launchScope({ kind: "global", nodeIds: [] });
            }
          }}
        >
          <Icon name="play" />
          <span>
            {hasRunnableSelection && routeName === "canvas"
              ? selection.groups.length === 1 && !selection.nodes.length
                ? t("runGroup")
                : t("runSelection")
              : t("runAll")}
          </span>
        </button>
      </div>
    </header>
  );
}

export interface CanvasToolbarProps {
  docTitle: string;
  prefs: ResolvedCanvasPrefs;
  tidyLabel: "tidySelection" | "tidy";
  edit: EditDocFn;
  openAnchoredMenu: (anchor: AnchorTarget, items: MenuItem[]) => void;
  openAddMenu: (anchor: AnchorTarget) => void;
  groupSelected: () => void;
  arrangeTopology: () => void;
  setPaletteDialog: Dispatch<
    SetStateAction<{ targetNodeId: string | null; query: string; index: number } | null>
  >;
}

export function CanvasToolbar({
  docTitle,
  prefs,
  tidyLabel,
  edit,
  openAnchoredMenu,
  openAddMenu,
  groupSelected,
  arrangeTopology,
  setPaletteDialog,
}: CanvasToolbarProps) {
  return (
    <div className="fs-canvas-toolbar" role="toolbar">
      <div className="canvas-title">
        <span>
          <Icon name="canvas" />
        </span>
        <b className="user-content">{docTitle}</b>
      </div>

      <div className="toolbar-actions">
        <button
          type="button"
          className={`toolbar-button ${prefs.showBranches ? "active" : ""}`}
          title={t("showBranches")}
          onClick={() =>
            edit(
              (d) => {
                d.prefs = {
                  ...d.prefs,
                  showBranches: !prefs.showBranches,
                };
              },
              { remember: false },
            )
          }
        >
          <Icon name="branch" />
          <span>{t("showBranches")}</span>
        </button>

        <button
          type="button"
          className={`toolbar-button ${prefs.showWorktrees ? "active" : ""}`}
          title={t("showWorktrees")}
          onClick={() =>
            edit(
              (d) => {
                d.prefs = {
                  ...d.prefs,
                  showWorktrees: !prefs.showWorktrees,
                };
              },
              { remember: false },
            )
          }
        >
          <Icon name="worktree" />
          <span>{t("showWorktrees")}</span>
        </button>

        <button
          type="button"
          className="toolbar-button"
          onClick={(ev) =>
            openAnchoredMenu(
              ev.currentTarget,
              (
                [
                  ["auto", "auto"],
                  ["running", "onlyRunning"],
                  ["3d", "filter3d"],
                  ["7d", "filter7d"],
                  ["all", "all"],
                ] as const
              ).map(([val, labelKey]) => ({
                label: t(labelKey),
                icon: "eye",
                checked: prefs.filter === val,
                fn: () =>
                  edit(
                    (d) => {
                      d.prefs = { ...d.prefs, filter: val };
                    },
                    { remember: false },
                  ),
              })),
            )
          }
        >
          <Icon name="eye" />
          <span>
            {t(
              prefs.filter === "running"
                ? "onlyRunning"
                : prefs.filter === "3d"
                  ? "filter3d"
                  : prefs.filter === "7d"
                    ? "filter7d"
                    : prefs.filter === "auto"
                      ? "auto"
                      : "all",
            )}
          </span>
        </button>

        <button
          type="button"
          className="toolbar-button"
          onClick={(ev) => openAddMenu(ev.currentTarget)}
        >
          <Icon name="plus" />
          <span>{t("add")}</span>
        </button>

        <button
          type="button"
          className="icon-button"
          title={t("groupSelection")}
          onClick={groupSelected}
        >
          <Icon name="group" />
        </button>

        <button
          type="button"
          className="icon-button"
          title={t(tidyLabel)}
          aria-label={t(tidyLabel)}
          onClick={() => arrangeTopology()}
        >
          <Icon name="tidy" />
        </button>

        <i className="toolbar-separator" />

        <button
          type="button"
          className="toolbar-search"
          onClick={() =>
            setPaletteDialog({
              targetNodeId: null,
              query: "",
              index: 0,
            })
          }
        >
          <Icon name="search" />
          <span>{t("searchNodes")}</span>
        </button>
        <kbd>Ctrl K</kbd>
      </div>
    </div>
  );
}
