import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type {
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  WorkspaceBrief,
} from "../../types.ts";
import { members } from "../../core/document.ts";
import { nodeBox, type Box } from "../geometry.ts";
import { getLanguage, setLanguage, t } from "../i18n.ts";
import { BrandMark, Icon } from "../icons.tsx";
import type { GeometryEdit } from "../sceneModel.ts";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import type { RouteId } from "./canvasGraphOps.ts";
import type {
  AnchorTarget,
  EditDocFn,
  ResolvedCanvasPrefs,
  SelectionState,
} from "./canvasTypes.ts";

export interface CanvasSidebarProps {
  baseDoc: FlowspaceDocument;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  workspaces: WorkspaceBrief[];
  routeName: RouteId;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  sidebarOpen: boolean;
  mobileSidebar: boolean;
  saved: boolean;
  prefs: ResolvedCanvasPrefs;
  selection: SelectionState;
  conversationFocusAgent: FlowNode | undefined;
  waitingAgentNodes: FlowNode[];
  gestureRef: MutableRefObject<GeometryEdit | null>;
  languageRevision: number;
  passesNodeFilter: (node: FlowNode | undefined) => boolean;
  setLastAgentId: Dispatch<SetStateAction<string>>;
  setActiveWorkspaceId: Dispatch<SetStateAction<string>>;
  setPaletteDialog: Dispatch<
    SetStateAction<{ targetNodeId: string | null; query: string; index: number } | null>
  >;
  setHelpModal: Dispatch<SetStateAction<boolean>>;
  setVariablePanel: Dispatch<SetStateAction<boolean>>;
  revealNode: (id: string) => void;
  focusGroup: (id: string) => void;
  fitBoxes: (boxes: Box[]) => void;
  edit: EditDocFn;
  openAddMenu: (anchor: AnchorTarget) => void;
  handleExportJson: () => void;
}

export function CanvasSidebar({
  baseDoc,
  doc,
  snapshot,
  workspaces,
  routeName,
  setRouteName,
  sidebarOpen,
  mobileSidebar,
  saved,
  prefs,
  selection,
  conversationFocusAgent,
  waitingAgentNodes,
  gestureRef,
  languageRevision,
  passesNodeFilter,
  setLastAgentId,
  setActiveWorkspaceId,
  setPaletteDialog,
  setHelpModal,
  setVariablePanel,
  revealNode,
  focusGroup,
  fitBoxes,
  edit,
  openAddMenu,
  handleExportJson,
}: CanvasSidebarProps) {
  const sidebarWorkspaceBuckets = useMemo(() => {
    const list: { key: string; name: string; agents: FlowNode[] }[] = [];
    const agents = baseDoc.nodes.filter((n) => n.kind === "agent");
    for (const ws of workspaces) {
      list.push({
        key: ws.id,
        name: ws.name,
        agents: agents.filter((a) => a.workspaceId === ws.id),
      });
    }
    const unbound = agents.filter(
      (a) => !a.workspaceId || !workspaces.some((w) => w.id === a.workspaceId),
    );
    if (unbound.length || !list.length) {
      list.unshift({
        key: "__default__",
        name: t("currentWorkspace"),
        agents: unbound,
      });
    }
    return list.filter((b, i) => i === 0 || b.agents.length > 0 || workspaces.length > 0);
  }, [baseDoc.nodes, workspaces, languageRevision]);

  const sidebarFocus = routeName === "conversation" ? conversationFocusAgent?.id : undefined;
  const sidebarAgents = useMemo(
    () =>
      new Map(
        sidebarWorkspaceBuckets.map(({ key, agents }) => [
          key,
          agents.map((agent) => {
            const state = nodeStatusOf(snapshot, agent.id);
            const selected =
              selection.nodes.includes(agent.id) || sidebarFocus === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                className={`sidebar-agent ${selected ? "selected" : ""} ${!passesNodeFilter(agent) ? "agent-hidden" : ""}`}
                onClick={() => {
                  setLastAgentId(agent.id);
                  revealNode(agent.id);
                }}
              >
                <i className={`status-dot status-${state}`} />
                <span className="user-content">{agent.title}</span>
                {(state === "waiting" || state === "input") && (
                  <small>{t("confirm")}</small>
                )}
                {state === "draft" && <small>{t("draft")}</small>}
              </button>
            );
          }),
        ]),
      ),
    [
      sidebarWorkspaceBuckets,
      snapshot,
      selection.nodes,
      sidebarFocus,
      passesNodeFilter,
      revealNode,
      setLastAgentId,
      languageRevision,
    ],
  );

  return (
    <>
      {/* ---------- Left Navigation Icon Rail ---------- */}
      <nav className="fs-rail" aria-label="FlowSpace">
        <button
          type="button"
          className="rail-brand"
          onClick={() => setRouteName("canvas")}
          title="FlowSpace"
          aria-label="FlowSpace"
        >
          <BrandMark />
        </button>

        <div className="rail-main">
          {(
            [
              ["canvas", "canvas"],
              ["conversation", "chat"],
              ["workflows", "box"],
              ["activity", "bolt"],
            ] as const
          ).map(([id, glyph]) => (
            <button
              key={id}
              type="button"
              className={`rail-button ${routeName === id ? "active" : ""}`}
              title={t(id)}
              aria-label={t(id)}
              onClick={() => setRouteName(id)}
            >
              <Icon name={glyph} />
              {id === "canvas" && waitingAgentNodes.length > 0 && (
                <span className="rail-badge">{waitingAgentNodes.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="rail-bottom">
          <button
            type="button"
            className="rail-button"
            title={t("command")}
            aria-label={t("command")}
            onClick={() =>
              setPaletteDialog({ targetNodeId: null, query: "", index: 0 })
            }
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            className="rail-button"
            title={t("help")}
            aria-label={t("help")}
            onClick={() => setHelpModal(true)}
          >
            <Icon name="help" />
          </button>
          <button
            type="button"
            className={`rail-button ${routeName === "settings" ? "active" : ""}`}
            title={t("settings")}
            aria-label={t("settings")}
            onClick={() => setRouteName("settings")}
          >
            <Icon name="gear" />
          </button>
          {snapshot?.variables?.length ? (
            <button
              type="button"
              className="rail-button"
              onClick={() => setVariablePanel(true)}
              aria-label={t("flow_variable_panel")}
              title={t("flow_variable_panel")}
            >
              <Icon name="braces" />
            </button>
          ) : null}
          <button
            type="button"
            className="rail-language"
            title={t("language")}
            aria-label={t("language")}
            onClick={() => setLanguage(getLanguage() === "zh" ? "en" : "zh")}
          >
            {getLanguage() === "zh" ? "EN" : "中"}
          </button>
        </div>
      </nav>

      {/* ---------- Left Explorer Sidebar ---------- */}
      <aside
        className={`fs-side ${!sidebarOpen ? "collapsed" : ""} ${mobileSidebar ? "mobile-open" : ""}`}
      >
        <header className="fs-side-head">
          <div className="brand-name">
            Flow<b>Space</b>
            <span>CANVAS</span>
          </div>
          <button
            type="button"
            className="side-search"
            onClick={() =>
              setPaletteDialog({ targetNodeId: null, query: "", index: 0 })
            }
          >
            <Icon name="search" />
            <span>{t("searchNodes")}</span>
            <kbd>Ctrl K</kbd>
          </button>
        </header>

        <div className="fs-side-list">
          <div className="side-section-heading">
            <span>{t("projectSessions")}</span>
            <button
              type="button"
              className="icon-button"
              title={t("add")}
              onClick={(ev) => openAddMenu(ev.currentTarget)}
            >
              <Icon name="plus" />
            </button>
          </div>

          {sidebarWorkspaceBuckets.map((bucket) => {
            const hidden = prefs.hiddenWorkspaces.includes(bucket.key);
            return (
              <div key={bucket.key}>
                <div
                  className={`sidebar-project ${hidden ? "project-hidden" : ""}`}
                >
                  <button
                    type="button"
                    className="project-name"
                    onClick={() => {
                      if (bucket.key !== "__default__") {
                        setActiveWorkspaceId(bucket.key);
                      }
                      const moves = gestureRef.current?.nodes;
                      const boxes = bucket.agents.map((agent) => {
                        const move = moves?.get(agent.id);
                        return nodeBox(
                          move ? { ...agent, ...move } : agent,
                          false,
                          true,
                        );
                      });
                      if (boxes.length) {
                        setRouteName("canvas");
                        fitBoxes(boxes);
                      }
                    }}
                  >
                    <Icon name="project" />
                    <span className="user-content">{bucket.name}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={t(hidden ? "showWorkspace" : "hideWorkspace")}
                    onClick={() =>
                      edit(
                        (d) => {
                          const cur = new Set(d.prefs?.hiddenWorkspaces ?? []);
                          if (cur.has(bucket.key)) cur.delete(bucket.key);
                          else cur.add(bucket.key);
                          d.prefs = {
                            ...d.prefs,
                            hiddenWorkspaces: [...cur],
                          };
                        },
                        { remember: false },
                      )
                    }
                  >
                    <Icon name={hidden ? "eyeoff" : "eye"} />
                  </button>
                </div>

                {sidebarAgents.get(bucket.key)}
              </div>
            );
          })}

          <div className="side-section-heading side-workflows-heading">
            <span>{t("workflows")}</span>
            <button
              type="button"
              className="icon-button"
              title={t("workflowLibrary")}
              onClick={() => setRouteName("workflows")}
            >
              <Icon name="box" />
            </button>
          </div>

          {doc.nodes
            .filter((n) => n.kind === "group" && !n.parentId)
            .map((grp) => {
              const count = members(doc, grp.id).filter(
                (id) => doc.nodes.find((n) => n.id === id)?.kind === "agent",
              ).length;
              return (
                <button
                  key={grp.id}
                  type="button"
                  className={`sidebar-workflow ${selection.groups.includes(grp.id) ? "selected" : ""}`}
                  onClick={() => focusGroup(grp.id)}
                >
                  <Icon name="canvas" />
                  <span className="user-content">{grp.title}</span>
                  <small>{count}</small>
                </button>
              );
            })}

          <button
            type="button"
            className="side-library-link"
            onClick={() => setRouteName("workflows")}
          >
            <Icon name="plus" />
            <span>{t("workflowLibrary")}</span>
          </button>
        </div>

        <footer className="fs-side-footer">
          <span className={`local-save-dot ${saved ? "" : "saving"}`} />
          <span>{t(saved ? "hostSaved" : "saving")}</span>
          <button
            type="button"
            className="icon-button"
            title={t("exportCanvas")}
            onClick={handleExportJson}
          >
            <Icon name="download" />
          </button>
        </footer>
      </aside>
    </>
  );
}
