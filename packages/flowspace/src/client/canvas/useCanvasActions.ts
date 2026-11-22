import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
import type {
  CanvasPrefs,
  CanvasSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  LaunchPlan,
  NodeKind,
  StartRequest,
  TeamDependencies,
  TeamModel,
  WorkflowImportRequest,
  WorkflowTemplate,
  WorkspaceBrief,
  WorkspaceStructureBrief,
} from "../../types.ts";
import {
  findBoardCard,
  pruneBoardReferences,
  resolveBoardReference,
  type BoardEdit,
} from "../../core/board.ts";
import { canConnect } from "../../core/connect.ts";
import { rebaseContainerChanges } from "../../core/containers.ts";
import {
  boardSummaryText,
  deriveDraftTitle,
  members,
  newFlowNode,
  newNode,
  workflowNodes,
} from "../../core/document.ts";
import { canInsertFanout, createFanoutPair } from "../../core/fanout.ts";
import { isTeamNode, staffedIds } from "../../core/team.ts";
import type { CanvasBridge } from "../bridge.ts";
import { arrangeCanvas } from "../canvasLayout.ts";
import {
  bounds,
  canvasItemBox,
  clearBoxAlong,
  collapsedAncestor,
  groupBox,
  LOD_ZOOM,
  nodeBox,
  reflowCanvasItem,
  toWorld,
  type Box,
} from "../geometry.ts";
import { getLanguage, t } from "../i18n.ts";
import type { WireDropContext } from "../QuickCreateMenu.tsx";
import { intersects, padded, shareSnapshotValue } from "../sceneModel.ts";
import {
  resolveDraftAffiliation,
  type DerivedStructureCard,
  type DraftAffiliation,
} from "../structure.ts";
import {
  alignNodes,
  distributeNodes,
  duplicateSubgraph,
  pasteSubgraphClipboard,
  serializeSubgraphClipboard,
  toggleNodesParticipation,
  type AlignMode,
  type DistributeAxis,
  type SubgraphClipboard,
} from "../subgraphs.ts";
import { formatTime, nodeStatusOf } from "../SurfaceViews.tsx";
import {
  allTemplates,
  buildSnapshot,
  captureTemplate,
  computeSyncPlan,
  instantiateTemplate,
  localizedStarterDocument,
  teamDependenciesFor,
  teamRevisionDifferences,
  type SyncPlan,
} from "../templates.ts";
import { startThemeTransition } from "../themeTransition.ts";
import type { PromptDialogSpec } from "../ui/PromptDialog.tsx";
import { containsCodeNode } from "../WorkflowImportDialog.tsx";
import {
  addWire,
  linkWireDrop,
  removeCanvasNodes,
  type PayloadPeekState,
  type RouteId,
  type WireEnds,
} from "./canvasGraphOps.ts";
import type { EditDocFn, SelectionState } from "./canvasTypes.ts";

export interface UseCanvasActionsOptions {
  rootRef: RefObject<HTMLDivElement>;
  areaRef: RefObject<HTMLDivElement>;
  viewportRef: RefObject<HTMLDivElement>;
  docRef: MutableRefObject<FlowspaceDocument>;
  setDoc: Dispatch<SetStateAction<FlowspaceDocument>>;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  replayLocked: MutableRefObject<boolean>;
  clipboardRef: MutableRefObject<SubgraphClipboard | null>;
  pointerRef: MutableRefObject<{ x: number; y: number } | null>;
  preClickSelectionRef: MutableRefObject<{
    nodes: string[];
    structureId: string | null;
  }>;
  pendingFocusRef: MutableRefObject<string | null>;
  routeName: RouteId;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  setLibraryTab: Dispatch<
    SetStateAction<"patterns" | "mine" | "snapshots" | "teams">
  >;
  setMobileSidebar: Dispatch<SetStateAction<boolean>>;
  setBottomOpen: Dispatch<SetStateAction<boolean>>;
  setLastAgentId: Dispatch<SetStateAction<string>>;
  selection: SelectionState;
  setSelection: Dispatch<SetStateAction<SelectionState>>;
  selectedStructureId: string | null;
  setSelectedStructureId: Dispatch<SetStateAction<string | null>>;
  setPayloadPeek: Dispatch<SetStateAction<PayloadPeekState | null>>;
  setFormModal: Dispatch<SetStateAction<PromptDialogSpec | null>>;
  setLaunchDialog: Dispatch<
    SetStateAction<{ plan: LaunchPlan; excluded: Set<string> } | null>
  >;
  setSyncModal: Dispatch<
    SetStateAction<{ groupId: string; plan: SyncPlan } | null>
  >;
  setWorkflowImport: Dispatch<
    SetStateAction<
      { request: WorkflowImportRequest; missing?: TeamModel[] } | undefined
    >
  >;
  history: FlowspaceDocument[];
  setHistory: Dispatch<SetStateAction<FlowspaceDocument[]>>;
  future: FlowspaceDocument[];
  setFuture: Dispatch<SetStateAction<FlowspaceDocument[]>>;
  vpSize: { width: number; height: number };
  lod: boolean;
  hostDark: boolean;
  effectiveTheme: "dark" | "light";
  reducedMotion: boolean;
  workspaces: WorkspaceBrief[];
  projectStructures: WorkspaceStructureBrief[];
  activeWorkspaceId: string;
  activeWorkspaceCwd: string | undefined;
  workspaceFilesList: string[];
  visibleGroups: FlowNode[];
  keepExpandedIds: Set<string>;
  derivedStructureCards: DerivedStructureCard[];
  isNodeVisible: (
    node: FlowNode | undefined,
    ignoreCollapse?: boolean,
  ) => boolean;
  flush: () => Promise<void>;
  commitEdit: (next: FlowspaceDocument, delay?: number) => void;
  edit: EditDocFn;
  animateView: (
    target: { x: number; y: number; zoom: number },
    duration?: number,
  ) => void;
  fitBoxes: (boxes: Box[], instant?: boolean) => void;
  fitComfortably: (boxes: Box[]) => void;
  refreshProjectStructures: () => void;
  showToast: (msg: unknown, isError?: boolean) => void;
  reportError: (err: unknown) => void;
}

export function useCanvasActions({
  rootRef,
  areaRef,
  viewportRef,
  docRef,
  setDoc,
  snapshot,
  bridge,
  replayLocked,
  clipboardRef,
  pointerRef,
  preClickSelectionRef,
  pendingFocusRef,
  routeName,
  setRouteName,
  setLibraryTab,
  setMobileSidebar,
  setBottomOpen,
  setLastAgentId,
  selection,
  setSelection,
  selectedStructureId,
  setSelectedStructureId,
  setPayloadPeek,
  setFormModal,
  setLaunchDialog,
  setSyncModal,
  setWorkflowImport,
  history,
  setHistory,
  future,
  setFuture,
  vpSize,
  lod,
  hostDark,
  effectiveTheme,
  reducedMotion,
  workspaces,
  projectStructures,
  activeWorkspaceId,
  activeWorkspaceCwd,
  workspaceFilesList,
  visibleGroups,
  keepExpandedIds,
  derivedStructureCards,
  isNodeVisible,
  flush,
  commitEdit,
  edit,
  animateView,
  fitBoxes,
  fitComfortably,
  refreshProjectStructures,
  showToast,
  reportError,
}: UseCanvasActionsOptions) {
  const selectNode = useCallback(
    (id: string, additive = false) => {
      const target = docRef.current.nodes.find((n) => n.id === id);
      if (!target) return;
      if (target.kind === "group") {
        setSelection((prev) => ({
          nodes: additive ? prev.nodes : [],
          groups: additive
            ? prev.groups.includes(id)
              ? prev.groups.filter((x) => x !== id)
              : [...prev.groups, id]
            : [id],
          edge: null,
        }));
        return;
      }
      if (target.kind === "agent") setLastAgentId(id);
      setSelection((prev) => ({
        nodes: additive
          ? prev.nodes.includes(id)
            ? prev.nodes.filter((x) => x !== id)
            : [...prev.nodes, id]
          : [id],
        groups: additive ? prev.groups : [],
        edge: null,
      }));
    },
    [docRef, setSelection, setLastAgentId],
  );

  const revealNode = useCallback(
    (nodeId: string) => {
      const target = docRef.current.nodes.find((n) => n.id === nodeId);
      if (!target) return;
      setMobileSidebar(false);
      edit(
        (d) => {
          const wsKey = target.workspaceId || "__default__";
          if (d.prefs?.hiddenWorkspaces?.includes(wsKey)) {
            d.prefs.hiddenWorkspaces = d.prefs.hiddenWorkspaces.filter(
              (k) => k !== wsKey,
            );
          }
          let cur = d.nodes.find((n) => n.id === nodeId);
          const ancestors: FlowNode[] = [];
          while (cur?.parentId) {
            const parentId = cur.parentId;
            cur = d.nodes.find((n) => n.id === parentId);
            if (cur?.collapsed) ancestors.unshift(cur);
          }
          for (const group of ancestors) {
            const previous = canvasItemBox(d, group);
            group.collapsed = false;
            reflowCanvasItem(d, group, previous);
          }
          if (d.prefs?.filter === "running") d.prefs.filter = "all";
        },
        { remember: false },
      );
      if (routeName !== "conversation") setRouteName("canvas");
      selectNode(nodeId);
      if (routeName !== "conversation") {
        const box = nodeBox(
          docRef.current.nodes.find((n) => n.id === nodeId) ?? target,
        );
        const zoom = Math.max(docRef.current.viewport.zoom, 0.88);
        animateView({
          x: vpSize.width / 2 - (box.x + box.w / 2) * zoom,
          y: vpSize.height / 2 - (box.y + box.h / 2) * zoom - 8,
          zoom,
        });
      }
    },
    [
      docRef,
      setMobileSidebar,
      edit,
      routeName,
      setRouteName,
      selectNode,
      animateView,
      vpSize.width,
      vpSize.height,
    ],
  );

  const focusGroup = useCallback(
    (groupId: string, instant = false) => {
      const group = docRef.current.nodes.find(
        (n) => n.id === groupId && n.kind === "group",
      );
      if (!group) return;
      setMobileSidebar(false);
      setRouteName("canvas");
      setSelection({ nodes: [], groups: [groupId], edge: null });
      fitBoxes([groupBox(group)], instant);
    },
    [docRef, setMobileSidebar, setRouteName, setSelection, fitBoxes],
  );

  const fitView = useCallback(
    (all = false, instant = false) => {
      const curDoc = docRef.current;
      const curZoom = curDoc.viewport.zoom;
      const curLod = curZoom < LOD_ZOOM;
      const hiddenWs = curDoc.prefs?.hiddenWorkspaces ?? [];
      const curFilter = curDoc.prefs?.filter ?? "all";
      const nodeShown = (n: FlowNode) => {
        if (n.kind === "group") return false;
        if (hiddenWs.includes(n.workspaceId || "__default__")) return false;
        if (collapsedAncestor(curDoc, n.id)) return false;
        if (curFilter === "running" && n.kind === "agent") {
          const st = nodeStatusOf(snapshot, n.id);
          if (
            !["running", "settling", "waiting", "queued", "input"].includes(st)
          )
            return false;
        }
        return true;
      };
      if (!all && selection.groups.length) {
        const boxes = selection.groups
          .map((id) => curDoc.nodes.find((n) => n.id === id))
          .filter((g): g is FlowNode => !!g)
          .map((g) => groupBox(g));
        return fitBoxes(boxes, instant);
      }
      if (!all && selection.nodes.length) {
        const boxes = selection.nodes
          .map((id) => curDoc.nodes.find((n) => n.id === id))
          .filter((n): n is FlowNode => !!n)
          .map((n) => nodeBox(n, false, true));
        return fitBoxes(boxes, instant);
      }
      const groupsShown = curDoc.nodes.filter((g) => {
        if (g.kind !== "group") return false;
        if (g.parentId) {
          const parent = curDoc.nodes.find((p) => p.id === g.parentId);
          if (parent?.collapsed) return false;
        }
        const mIds = members(curDoc, g.id);
        return (
          !mIds.length ||
          mIds.some((id) => {
            const mn = curDoc.nodes.find((x) => x.id === id);
            return !!mn && !hiddenWs.includes(mn.workspaceId || "__default__");
          })
        );
      });
      const allBoxes = [
        ...curDoc.nodes
          .filter(nodeShown)
          .map((n) => nodeBox(n, all ? curLod : false)),
        ...groupsShown.map((g) => groupBox(g)),
      ];
      fitBoxes(allBoxes, instant);
    },
    [docRef, selection, fitBoxes, snapshot],
  );

  const focusCreatedGroup = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find(
        (n) => n.id === groupId && n.kind === "group",
      );
      if (!grp) return;
      setRouteName("canvas");
      setSelection({ nodes: [], groups: [groupId], edge: null });
      requestAnimationFrame(() =>
        fitComfortably([groupBox(grp, 2, { doc: docRef.current })]),
      );
    },
    [docRef, setRouteName, setSelection, fitComfortably],
  );

  const loadStarter = useCallback(() => {
    let groupId = "";
    edit((d) => {
      const before = new Set(d.nodes.map((n) => n.id));
      Object.assign(
        d,
        localizedStarterDocument(
          getLanguage(),
          activeWorkspaceCwd,
          activeWorkspaceId || undefined,
          d,
        ),
      );
      groupId =
        d.nodes.find((n) => n.kind === "group" && !before.has(n.id))?.id ?? "";
    });
    focusCreatedGroup(groupId);
  }, [edit, activeWorkspaceCwd, activeWorkspaceId, focusCreatedGroup]);

  const editBoard = useCallback(
    (id: string, change: BoardEdit) => {
      const current = docRef.current;
      const index = current.nodes.findIndex(
        (node) => node.id === id && node.kind === "board",
      );
      if (index < 0) return;
      const node = current.nodes[index];
      const patch = change(node);
      if (!Object.keys(patch).length) return;
      const next = { ...node, ...patch };
      if (patch.columns) next.text = boardSummaryText(patch.columns);
      const edges = pruneBoardReferences(next, current.edges);
      edit((doc) => {
        doc.nodes[index] = next;
        if (edges !== current.edges) doc.edges = edges;
      });
      if (edges !== current.edges) {
        const remains = new Set(edges.map((edge) => edge.id));
        setPayloadPeek((peek) =>
          peek && !remains.has(peek.edgeId) ? null : peek,
        );
        setSelection((sel) =>
          sel.edge && !remains.has(sel.edge) ? { ...sel, edge: null } : sel,
        );
      }
    },
    [docRef, edit, setPayloadPeek, setSelection],
  );

  const editNode = useCallback(
    (id: string, changes: Partial<FlowNode>) => {
      const textOnly = Object.keys(changes).every((k) =>
        ["draft", "task", "text"].includes(k),
      );
      if (
        changes.expanded === undefined &&
        changes.collapsed === undefined &&
        changes.tab === undefined &&
        changes.sessionId === undefined
      ) {
        const prev = docRef.current;
        const index = prev.nodes.findIndex((node) => node.id === id);
        if (index === -1) return;
        if (!textOnly) {
          setHistory((h) => [...h.slice(-39), prev]);
          setFuture([]);
        }
        const nodes = prev.nodes.slice();
        nodes[index] = { ...nodes[index], ...changes };
        commitEdit({ ...prev, nodes });
        return;
      }
      edit(
        (d) => {
          const n = d.nodes.find((x) => x.id === id);
          if (!n) return;
          const previous = canvasItemBox(d, n);
          Object.assign(n, changes);
          reflowCanvasItem(d, n, previous);
        },
        { remember: !textOnly },
      );
    },
    [docRef, setHistory, setFuture, edit, commitEdit],
  );

  const editEdge = useCallback(
    (id: string, changes: Partial<FlowEdge>) => {
      edit((d) => {
        const e = d.edges.find((x) => x.id === id);
        if (e) Object.assign(e, changes);
      });
    },
    [edit],
  );

  const toggleNodeForm = useCallback(
    (nodeId: string) => {
      const n = docRef.current.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      if (n.kind === "group") {
        editNode(nodeId, { collapsed: !n.collapsed });
      } else {
        editNode(nodeId, { expanded: !n.expanded });
      }
    },
    [docRef, editNode],
  );

  const openWindow = useCallback(
    (nodeId: string) => {
      const area = areaRef.current;
      const board =
        docRef.current.nodes.find((node) => node.id === nodeId)?.kind ===
        "board";
      const w = Math.min(board ? 760 : 540, (area?.clientWidth ?? 900) - 48);
      const h = Math.min(540, (area?.clientHeight ?? 620) - 48);
      const maxZ = Math.max(
        10,
        ...docRef.current.nodes
          .filter((n) => n.window)
          .map((n) => n.window?.z ?? 10),
      );
      edit((d) => {
        const n = d.nodes.find((x) => x.id === nodeId);
        if (!n || n.kind === "group") return;
        const previous = nodeBox(n);
        n.expanded = true;
        n.window = {
          x: Math.max(20, ((area?.clientWidth ?? 900) - w) / 2),
          y: Math.max(20, ((area?.clientHeight ?? 620) - h) / 2),
          w,
          h,
          z: maxZ + 1,
        };
        reflowCanvasItem(d, n, previous);
      });
    },
    [areaRef, docRef, edit],
  );

  const returnWindow = useCallback(
    (nodeId: string) => {
      edit((d) => {
        const n = d.nodes.find((x) => x.id === nodeId);
        if (n) delete n.window;
      });
    },
    [edit],
  );

  const openDetailCard = useCallback(
    (agentId: string) => {
      const source = docRef.current.nodes.find((n) => n.id === agentId);
      if (!source) return;
      const existing = docRef.current.nodes.find(
        (n) =>
          n.kind === "detail" && n.sourceNodeId === agentId && !n.pinned,
      );
      if (existing) {
        revealNode(existing.id);
        return;
      }
      const box = nodeBox(source, false, true);
      const latestOutput =
        snapshot?.live.find((l) => l.nodeId === agentId)?.output ||
        snapshot?.runs
          .flatMap((r) => r.steps)
          .filter((s) => s.nodeId === agentId)
          .at(-1)?.output ||
        "";
      const detail: FlowNode = {
        ...newNode(
          "detail",
          box.x + box.w + 36,
          box.y,
          `${source.title} · ${t("executionDetail")}`,
        ),
        sourceNodeId: agentId,
        text: latestOutput,
        fixed: false,
        pinned: false,
        expanded: true,
      };
      edit((d) => d.nodes.push(detail));
      selectNode(detail.id);
    },
    [docRef, snapshot, edit, revealNode, selectNode],
  );

  const createCanvasNode = useCallback(
    (
      kind: NodeKind,
      worldPoint?: { x: number; y: number },
      explicitAffiliation?: DraftAffiliation,
      usePreClick = false,
      extra?: {
        place?: (node: FlowNode) => { x: number; y: number };
        patch?: Partial<FlowNode>;
        flowType?: string;
        link?: (d: FlowspaceDocument, created: FlowNode) => void;
      },
    ): FlowNode => {
      let pt = worldPoint;
      if (!pt) {
        const visibleBoxes = [
          ...docRef.current.nodes
            .filter((n) => isNodeVisible(n))
            .map((n) => nodeBox(n)),
          ...visibleGroups.map((g) => groupBox(g)),
        ];
        if (visibleBoxes.length) {
          const b = bounds(visibleBoxes);
          pt = { x: b.x + b.w + 120, y: b.y + 60 };
        } else {
          const rect = viewportRef.current?.getBoundingClientRect();
          pt = rect
            ? toWorld(
                docRef.current.viewport,
                rect,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
              )
            : { x: 120, y: 160 };
        }
      }
      const chosenStructId = usePreClick
        ? preClickSelectionRef.current.structureId
        : selectedStructureId;
      const chosenNodeIds = usePreClick
        ? preClickSelectionRef.current.nodes
        : selection.nodes;
      const preStruct: DerivedStructureCard | null = chosenStructId
        ? (derivedStructureCards.find((c) => c.id === chosenStructId) ?? null)
        : null;
      const preNode = chosenNodeIds[0]
        ? (docRef.current.nodes.find((n) => n.id === chosenNodeIds[0]) ?? null)
        : null;
      const aff = resolveDraftAffiliation({
        explicit: explicitAffiliation,
        preSelectedStructure: preStruct,
        preSelectedNode: preNode,
        dropPoint: pt,
        structureCards: derivedStructureCards,
        workspaces,
        activeWorkspaceId,
      });
      const boundAgent = docRef.current.nodes.find(
        (n) => n.kind === "agent" && Boolean(n.sessionId),
      );
      const x = Math.round((pt.x - 140) / 12) * 12;
      const y = Math.round((pt.y - 70) / 12) * 12;
      const created: FlowNode = {
        ...(extra?.flowType
          ? newFlowNode(extra.flowType, x, y, getLanguage())
          : newNode(kind, x, y, undefined, getLanguage())),
        ...(kind === "agent"
          ? {
              workspaceId: aff.workspaceId,
              cwd: aff.cwd,
              branch: aff.branch,
              worktreePath: aff.worktreePath,
            }
          : kind === "git"
            ? {
                workspaceId: aff.workspaceId,
                cwd: aff.cwd,
                branch: aff.branch,
                worktreePath: aff.worktreePath,
              }
            : kind === "changes"
              ? {
                  workspaceId: aff.workspaceId,
                  cwd: aff.cwd,
                  changesSessionId: boundAgent?.sessionId,
                  expanded: true,
                }
              : kind === "terminal"
                ? {
                    workspaceId: aff.workspaceId,
                    cwd: aff.cwd,
                    terminalSessionId: boundAgent?.sessionId,
                    expanded: true,
                  }
                : kind === "file"
                  ? {
                      cwd: aff.cwd,
                      items: workspaceFilesList.slice(0, 12),
                      selectedItems: workspaceFilesList[0]
                        ? [workspaceFilesList[0]]
                        : [],
                      text: workspaceFilesList[0] ?? "README.md",
                      expanded: true,
                    }
                  : {}),
        ...(kind === "note" || kind === "display" ? { expanded: true } : {}),
        ...extra?.patch,
      };
      if (extra?.place) Object.assign(created, extra.place(created));
      edit((d) => {
        const parentGroup = d.nodes
          .filter(
            (g) =>
              g.kind === "group" &&
              !g.collapsed &&
              created.x > g.x &&
              created.x < g.x + g.width &&
              created.y > g.y + 36 &&
              created.y < g.y + g.height,
          )
          .sort((a, b) => a.width * a.height - b.width * b.height)[0];
        if (parentGroup) created.parentId = parentGroup.id;
        d.nodes.push(created);
        extra?.link?.(d, created);
      });
      setSelectedStructureId(null);
      selectNode(created.id);
      showToast(t("nodeCreated"));
      return created;
    },
    [
      docRef,
      viewportRef,
      preClickSelectionRef,
      isNodeVisible,
      visibleGroups,
      selectedStructureId,
      setSelectedStructureId,
      selection.nodes,
      derivedStructureCards,
      workspaces,
      activeWorkspaceId,
      workspaceFilesList,
      edit,
      selectNode,
      showToast,
    ],
  );

  const connectNodes = useCallback(
    (
      fromIds: string[],
      toIds: string[],
      kind: FlowEdge["kind"],
      ends: WireEnds = {},
    ) => {
      edit((d) => {
        for (const fromId of fromIds) {
          const source = d.nodes.find((n) => n.id === fromId);
          if (!source) continue;
          const targets = d.nodes.filter(
            (target) =>
              toIds.includes(target.id) &&
              target.id !== source.id &&
              canConnect({ source, target, kind, ...ends, edges: d.edges }).ok,
          );
          if (!targets.length) continue;
          let origin = source;
          if (kind === "reference" && source.kind === "agent") {
            const box = nodeBox(source);
            origin = {
              ...newNode(
                "display",
                box.x + box.w + 32,
                box.y + box.h + 36,
                `${source.title} · ${t("newDisplay")}`,
              ),
              sourceNodeId: source.id,
              expanded: true,
              fixed: false,
              text:
                snapshot?.live.find((l) => l.nodeId === fromId)?.output ||
                snapshot?.runs
                  .flatMap((r) => r.steps)
                  .filter((s) => s.nodeId === fromId)
                  .at(-1)?.output ||
                "",
            };
            d.nodes.push(origin);
          }
          const capture =
            kind === "reference" &&
            ["git", "changes", "terminal"].includes(origin.kind) &&
            origin.text.trim()
              ? { snapshotTitle: origin.title, snapshotText: origin.text }
              : {};
          for (const target of targets) {
            addWire(d, origin, target, kind, { ...ends, ...capture });
          }
        }
      });
    },
    [edit, snapshot],
  );

  const createBoardCompanion = useCallback(
    (boardId: string, cardId: string, kind: "agent" | "note") => {
      const current = docRef.current;
      const board = current.nodes.find(
        (node) => node.id === boardId && node.kind === "board",
      );
      const card = board && findBoardCard(board.columns ?? [], cardId)?.card;
      if (!board || !card) return;
      const box = nodeBox(board, lod, keepExpandedIds.has(board.id));
      const start = { x: box.x + box.w + 56, y: box.y };
      const byId = new Map(current.nodes.map((node) => [node.id, node]));
      const ancestors = new Set<string>([board.id]);
      for (
        let parent = board.parentId ? byId.get(board.parentId) : undefined;
        parent;
        parent = parent.parentId ? byId.get(parent.parentId) : undefined
      ) {
        ancestors.add(parent.id);
      }
      const obstacles = current.nodes
        .filter((node) => !ancestors.has(node.id))
        .map((node) => canvasItemBox(current, node));
      const title = deriveDraftTitle(card.text, t("boardTitle"));
      const draft = t("boardDraft", { title });
      const created = createCanvasNode(kind, start, undefined, false, {
        place: (item) => {
          const position = { ...start };
          const hit = () =>
            obstacles.filter((obstacle) =>
              intersects(padded(obstacle, 16), {
                ...position,
                w: item.width,
                h: item.height,
              }),
            );
          for (let collisions = hit(); collisions.length; collisions = hit()) {
            position.x =
              Math.max(...collisions.map((obstacle) => obstacle.x + obstacle.w)) +
              56;
          }
          return position;
        },
        patch:
          kind === "agent"
            ? { title, customTitle: true, draft, participation: "manual" }
            : {
                title,
                customTitle: true,
                text: resolveBoardReference(board, cardId).text,
              },
        link:
          kind === "agent"
            ? (doc, target) => {
                addWire(doc, board, target, "reference", {
                  sourceItemKey: cardId,
                });
              }
            : undefined,
      });
      revealNode(created.id);
    },
    [docRef, createCanvasNode, keepExpandedIds, lod, revealNode],
  );

  const deleteSelection = useCallback(() => {
    edit((d) => {
      if (selection.edge) {
        d.edges = d.edges.filter((e) => e.id !== selection.edge);
        return;
      }
      removeCanvasNodes(d, [...selection.nodes, ...selection.groups]);
    });
    setSelection({ nodes: [], groups: [], edge: null });
  }, [edit, selection, setSelection]);

  const groupSelected = useCallback(() => {
    const chosenIds = new Set([...selection.groups, ...selection.nodes]);
    for (const owner of docRef.current.nodes.filter((node) => node.fanout)) {
      const structure = docRef.current.nodes.filter(
        (node) =>
          node.parentId === owner.id &&
          (node.masterOf ||
            node.generatedBy ||
            node.id === owner.fanout!.fanId ||
            node.id === owner.fanout!.mergeId),
      );
      if (structure.some((node) => chosenIds.has(node.id))) {
        chosenIds.add(owner.id);
        for (const member of structure) chosenIds.delete(member.id);
      }
    }
    const chosenNodes = docRef.current.nodes
      .filter((node) => chosenIds.has(node.id) && node.kind !== "group")
      .map((node) => node.id);
    const chosenGroups = docRef.current.nodes
      .filter((node) => chosenIds.has(node.id) && node.kind === "group")
      .map((node) => node.id);
    if (chosenNodes.length + chosenGroups.length < 2) {
      showToast(t("groupNeedSelection"));
      return;
    }
    if (
      chosenGroups.some((gid) => {
        const g = docRef.current.nodes.find((n) => n.id === gid);
        return (
          g?.parentId ||
          docRef.current.nodes.some(
            (c) => c.parentId === gid && c.kind === "group",
          )
        );
      })
    ) {
      showToast(t("nestedLimit"), true);
      return;
    }
    const allMemberIds = [
      ...chosenNodes,
      ...chosenGroups.flatMap((gid) => members(docRef.current, gid)),
    ];
    const boxes = allMemberIds
      .map((id) => docRef.current.nodes.find((n) => n.id === id))
      .filter((n): n is FlowNode => !!n)
      .map((n) => nodeBox(n));
    if (!boxes.length) return;
    const b = bounds(boxes);
    const grp: FlowNode = {
      ...newNode("group", b.x - 24, b.y - 54, t("workflows")),
      width: b.w + 48,
      height: b.h + 82,
      color: "blue",
    };
    edit((d) => {
      d.nodes.push(grp);
      for (const id of [...chosenNodes, ...chosenGroups]) {
        const item = d.nodes.find((n) => n.id === id);
        if (item) item.parentId = grp.id;
      }
    });
    setSelection({ nodes: [], groups: [grp.id], edge: null });
    showToast(t("groupCreated"));
  }, [docRef, selection, edit, setSelection, showToast]);

  const ungroup = useCallback(
    (groupId: string) => {
      if (docRef.current.nodes.find((node) => node.id === groupId)?.fanout)
        return;
      edit((d) => {
        const grp = d.nodes.find((n) => n.id === groupId);
        if (!grp) return;
        for (const child of d.nodes) {
          if (child.parentId === groupId) {
            if (grp.parentId) child.parentId = grp.parentId;
            else delete child.parentId;
          }
        }
        d.nodes = d.nodes.filter((n) => n.id !== groupId);
      });
      setSelection({ nodes: [], groups: [], edge: null });
    },
    [docRef, edit, setSelection],
  );

  const arrangeTopology = useCallback(
    (targetIds = [...selection.nodes, ...selection.groups]) => {
      const previous = docRef.current;
      const next = structuredClone(previous);
      if (!arrangeCanvas(next, targetIds)) return;
      setHistory((items) => [...items.slice(-39), previous]);
      setFuture([]);
      commitEdit(shareSnapshotValue(previous, next));
    },
    [docRef, setHistory, setFuture, commitEdit, selection.nodes, selection.groups],
  );
  const tidyLabel: "tidySelection" | "tidy" =
    selection.nodes.length || selection.groups.length
      ? "tidySelection"
      : "tidy";

  const selectionIds = useCallback(
    () => [...selection.nodes, ...selection.groups],
    [selection.nodes, selection.groups],
  );

  const selectPasteResult = useCallback(
    (res: { createdNodeIds: string[]; createdGroupIds: string[] }) => {
      setSelection({
        nodes: res.createdNodeIds.filter(
          (id) => !res.createdGroupIds.includes(id),
        ),
        groups: res.createdGroupIds,
        edge: null,
      });
    },
    [setSelection],
  );

  const copySelection = useCallback((): boolean => {
    const clip = serializeSubgraphClipboard(docRef.current, selectionIds());
    if (!clip) return false;
    clipboardRef.current = clip;
    showToast(t("copySelection"));
    return true;
  }, [docRef, clipboardRef, selectionIds, showToast]);

  const cursorWorldPoint = useCallback(():
    | { x: number; y: number }
    | undefined => {
    const vp = viewportRef.current;
    const ptr = pointerRef.current;
    if (!vp || !ptr) return undefined;
    const rect = vp.getBoundingClientRect();
    if (
      ptr.x < rect.left ||
      ptr.x > rect.right ||
      ptr.y < rect.top ||
      ptr.y > rect.bottom
    ) {
      return undefined;
    }
    return toWorld(docRef.current.viewport, rect, ptr.x, ptr.y);
  }, [viewportRef, pointerRef, docRef]);

  const pasteClipboard = useCallback((): boolean => {
    const clip = clipboardRef.current;
    if (!clip?.nodes.length) return false;
    const anchor = cursorWorldPoint();
    let res: ReturnType<typeof pasteSubgraphClipboard> | null = null;
    edit((d) => {
      res = pasteSubgraphClipboard(d, clip, anchor);
    });
    if (res) selectPasteResult(res);
    if (!anchor) {
      clipboardRef.current = {
        ...clip,
        anchor: { x: clip.anchor.x - 36, y: clip.anchor.y - 36 },
      };
    }
    showToast(t("pasteSelection"));
    return true;
  }, [clipboardRef, cursorWorldPoint, edit, selectPasteResult, showToast]);

  const duplicateSelection = useCallback((): boolean => {
    const ids = selectionIds();
    if (!ids.length) return false;
    let res: ReturnType<typeof duplicateSubgraph> | null = null;
    edit((d) => {
      res = duplicateSubgraph(d, ids);
    });
    if (res) selectPasteResult(res);
    return true;
  }, [selectionIds, edit, selectPasteResult]);

  const selectAllVisible = useCallback(() => {
    const cur = docRef.current;
    setSelection({
      nodes: cur.nodes.filter((n) => isNodeVisible(n)).map((n) => n.id),
      groups: [],
      edge: null,
    });
  }, [docRef, setSelection, isNodeVisible]);

  const participationTargets = useCallback(
    (explicit?: string[]) => {
      const ids = explicit ?? [
        ...selection.nodes,
        ...selection.groups.flatMap((gid) => members(docRef.current, gid)),
      ];
      return ids.filter((id) =>
        docRef.current.nodes.some((n) => n.id === id && n.kind === "agent"),
      );
    },
    [docRef, selection.nodes, selection.groups],
  );

  const toggleParticipation = useCallback(
    (mode: "paused" | "bypassed", explicit?: string[]): boolean => {
      const ids = participationTargets(explicit);
      if (!ids.length) return false;
      let next = "global";
      edit((d) => {
        next = toggleNodesParticipation(d.nodes, ids, mode);
      });
      showToast(
        next === "global"
          ? t("global")
          : t(
              mode === "bypassed"
                ? "bypassParticipation"
                : "pausedParticipation",
            ),
      );
      return true;
    },
    [participationTargets, edit, showToast],
  );

  const setBatchParticipation = useCallback(
    (participation: FlowNode["participation"]) => {
      const ids = participationTargets();
      if (!ids.length) return;
      edit((d) => {
        for (const n of d.nodes) {
          if (ids.includes(n.id)) n.participation = participation;
        }
      });
    },
    [participationTargets, edit],
  );

  const alignSelection = useCallback(
    (mode: AlignMode) => {
      const ids = selectionIds();
      if (ids.length < 2) return;
      edit((d) => {
        d.nodes = alignNodes(d.nodes, ids, mode);
      });
    },
    [selectionIds, edit],
  );

  const distributeSelection = useCallback(
    (axis: DistributeAxis) => {
      const ids = selectionIds();
      if (ids.length < 3) return;
      edit((d) => {
        d.nodes = distributeNodes(d.nodes, ids, axis);
      });
    },
    [selectionIds, edit],
  );

  const performUndo = useCallback(
    (isRedo = false) => {
      const stack = isRedo ? future : history;
      const target = stack.at(-1);
      if (!target) return;
      const current = docRef.current;
      if (isRedo) {
        setFuture((f) => f.slice(0, -1));
        setHistory((h) => [...h, current]);
      } else {
        setHistory((h) => h.slice(0, -1));
        setFuture((f) => [...f, current]);
      }
      edit(
        (d) => {
          const liveNodes = d.nodes;
          const restored = rebaseContainerChanges(
            structuredClone(target),
            snapshot?.containerChanges ?? [],
            true,
          );
          restored.generationRevision = d.generationRevision;
          if (restored.prefs?.wireRouting !== d.prefs?.wireRouting) {
            restored.prefs = {
              ...restored.prefs,
              wireRouting: d.prefs?.wireRouting,
            };
          }
          Object.assign(d, restored);
          d.nodes = restored.nodes.map((n) => {
            const existing = liveNodes.find((x) => x.id === n.id);
            return existing?.sessionId
              ? {
                  ...n,
                  sessionId: existing.sessionId,
                  cwd: existing.cwd,
                  workspaceId: existing.workspaceId,
                  lastSubmittedTask: existing.lastSubmittedTask,
                }
              : n;
          });
        },
        { remember: false },
      );
    },
    [docRef, future, history, setFuture, setHistory, edit, snapshot?.containerChanges],
  );

  const launchScope = useCallback(
    (req: StartRequest) => {
      if (replayLocked.current) return;
      void (async () => {
        await flush();
        if (req.kind === "single" && req.nodeIds.length === 1) {
          const target = docRef.current.nodes.find(
            (n) => n.id === req.nodeIds[0],
          );
          if (
            target &&
            target.kind === "agent" &&
            !target.sessionId &&
            target.branch &&
            !target.worktreePath
          ) {
            const proj = projectStructures.find(
              (p) => p.id === (target.workspaceId || activeWorkspaceId),
            );
            const brInfo = proj?.branches.find((b) => b.name === target.branch);
            if (
              proj?.isGitRepo &&
              brInfo &&
              !brInfo.worktreePath &&
              !brInfo.current
            ) {
              setFormModal({
                title: t("createWorktree"),
                description: t("createWorktreePrompt"),
                initialValue: target.branch,
                onSubmit: (branchName) => {
                  void (async () => {
                    const updatedRepo = await bridge.gitAction({
                      cwd: proj.path,
                      action: "createWorktree",
                      branch: branchName,
                    });
                    const wt = updatedRepo.worktrees.find(
                      (w) => w.branch === branchName,
                    );
                    if (wt) {
                      editNode(target.id, {
                        branch: branchName,
                        worktreePath: wt.path,
                        cwd: wt.path,
                      });
                    }
                    refreshProjectStructures();
                    await flush();
                    await bridge.start(req);
                    setBottomOpen(true);
                  })().catch(reportError);
                },
              });
              return;
            }
          }
        }
        if (req.kind === "global") {
          const plan = await bridge.plan(req);
          setLaunchDialog({ plan, excluded: new Set() });
        } else {
          await bridge.start(req);
          setBottomOpen(true);
        }
      })().catch(reportError);
    },
    [
      replayLocked,
      flush,
      docRef,
      projectStructures,
      activeWorkspaceId,
      setFormModal,
      bridge,
      editNode,
      refreshProjectStructures,
      setBottomOpen,
      setLaunchDialog,
      reportError,
    ],
  );

  const bindAgentSession = useCallback(
    (node: FlowNode) => {
      void (async () => {
        await flush();
        const bound = await bridge.bind({
          nodeId: node.id,
          workspaceId: node.workspaceId || activeWorkspaceId || undefined,
          cwd: node.cwd || activeWorkspaceCwd,
        });
        editNode(bound.id, {
          sessionId: bound.sessionId,
          cwd: bound.cwd,
          expanded: true,
          tab: "conversation",
        });
      })().catch(reportError);
    },
    [
      flush,
      bridge,
      activeWorkspaceId,
      activeWorkspaceCwd,
      editNode,
      reportError,
    ],
  );

  const extractDisplayFrom = useCallback(
    (sourceNodeId: string, text?: string, seq?: number, fixed = true) => {
      void (async () => {
        await flush();
        const created = await bridge.display({
          nodeId: sourceNodeId,
          text,
          seq,
          fixed,
        });
        setSelection({ nodes: [created.id], groups: [], edge: null });
        showToast(t("nodeCreated"));
      })().catch(reportError);
    },
    [flush, bridge, setSelection, showToast, reportError],
  );

  const pinDeliverable = useCallback(
    (path: string, nodeId: string) => {
      const src = docRef.current.nodes.find((n) => n.id === nodeId);
      let targetId = "";
      edit((d) => {
        const existing = d.nodes.find(
          (n) =>
            n.kind === "file" &&
            (n.text === path || n.selectedItems?.includes(path)),
        );
        if (existing) {
          targetId = existing.id;
          return;
        }
        const fn = {
          ...newNode(
            "file",
            (src?.x ?? 120) + 340,
            (src?.y ?? 120) + 60,
            path.split(/[\\/]/).pop() ?? path,
          ),
          cwd: src?.worktreePath || src?.cwd || activeWorkspaceCwd,
          text: path,
          items: [path],
          selectedItems: [path],
          expanded: true,
        };
        targetId = fn.id;
        d.nodes.push(fn);
      });
      setRouteName("canvas");
      if (targetId) setTimeout(() => revealNode(targetId), 50);
    },
    [docRef, edit, activeWorkspaceCwd, setRouteName, revealNode],
  );

  const runSelection = useCallback(() => {
    const scopeIds = [
      ...selection.nodes,
      ...selection.groups.flatMap((gid) => members(docRef.current, gid)),
    ];
    launchScope(
      scopeIds.length
        ? { kind: "selection", nodeIds: scopeIds }
        : { kind: "global", nodeIds: [] },
    );
  }, [docRef, selection.nodes, selection.groups, launchScope]);

  const extendLoop = useCallback(
    (runId: string, edgeId: string, nodeId?: string) => {
      void bridge
        .extendLoop({ runId, edgeId, nodeId, extraRounds: 1 })
        .catch(reportError);
    },
    [bridge, reportError],
  );

  const runFromHere = useCallback(
    (nodeId: string) => launchScope({ kind: "from-node", nodeIds: [nodeId] }),
    [launchScope],
  );
  const runToHere = useCallback(
    (nodeId: string) => launchScope({ kind: "to-node", nodeIds: [nodeId] }),
    [launchScope],
  );
  const stopNode = useCallback(
    (nodeId: string) => {
      void bridge.stopNode(nodeId).catch(reportError);
    },
    [bridge, reportError],
  );

  const forkHypothesis = useCallback(
    (sourceId: string) => {
      const source = docRef.current.nodes.find((n) => n.id === sourceId);
      if (!source || source.kind !== "agent") return;
      if (!source.sessionId) {
        showToast(t("forkHypothesisTip"), true);
        return;
      }
      const sb = nodeBox(source, false, true);
      const siblings = docRef.current.edges.filter(
        (e) => e.source === sourceId && e.mode === "fork",
      ).length;
      const forked: FlowNode = {
        ...newNode(
          "agent",
          Math.round((sb.x + sb.w + 72) / 12) * 12,
          Math.round((sb.y + siblings * 48) / 12) * 12,
          `${source.title} ⎇ ${siblings + 1}`,
        ),
        workspaceId: source.workspaceId,
        cwd: source.cwd,
        branch: source.branch,
        worktreePath: source.worktreePath,
        roleLabel: source.roleLabel,
        parentId: source.parentId,
        expanded: true,
      };
      edit((d) => {
        d.nodes.push(forked);
        addWire(d, source, forked, "continuation", {
          mode: "fork",
          trigger: "off",
        });
      });
      pendingFocusRef.current = forked.id;
      selectNode(forked.id);
      showToast(t("forkHypothesis"));
    },
    [docRef, pendingFocusRef, edit, selectNode, showToast],
  );

  const handleInstantiateTemplate = useCallback(
    (
      tpl: WorkflowTemplate,
      opts?: {
        at?: { x: number; y: number };
        link?: (d: FlowspaceDocument, group: FlowNode) => void;
      },
    ) => {
      const occupied = [
        ...docRef.current.nodes
          .filter((n) => n.kind !== "group")
          .map((n) => nodeBox(n)),
        ...docRef.current.nodes
          .filter((n) => n.kind === "group")
          .map((g) => groupBox(g)),
      ];
      const x = opts?.at
        ? Math.round(opts.at.x / 12) * 12
        : occupied.length
          ? bounds(occupied).x + bounds(occupied).w + 120
          : 40;
      const y = opts?.at ? Math.round(opts.at.y / 12) * 12 : 140;
      let createdGroupId = "";
      edit((d) => {
        const grp = instantiateTemplate(
          d,
          tpl,
          x,
          y,
          tpl.builtin ? t(tpl.title) : tpl.title,
          {
            workspaceId: activeWorkspaceId || undefined,
            cwd: activeWorkspaceCwd,
          },
        );
        createdGroupId = grp.id;
        opts?.link?.(d, grp);
      });
      focusCreatedGroup(createdGroupId);
      const [changed] = teamRevisionDifferences(tpl, snapshot?.teamBlueprints);
      showToast(
        changed ? t("teamRevisionDifference", changed) : t("templateAdded"),
      );
    },
    [
      docRef,
      activeWorkspaceId,
      activeWorkspaceCwd,
      edit,
      focusCreatedGroup,
      showToast,
      snapshot?.teamBlueprints,
    ],
  );

  const insertFanout = useCallback(
    (
      point?: { x: number; y: number },
      wire?: WireDropContext | null,
      edgeId?: string,
    ) => {
      const current = docRef.current;
      const edge =
        edgeId && current.edges.find((candidate) => candidate.id === edgeId);
      if (edgeId && (!edge || !canInsertFanout(current, edge))) return;
      const from = edge
        ? current.nodes.find((node) => node.id === edge.source)
        : wire?.sourceNode;
      const to = edge
        ? current.nodes.find((node) => node.id === edge.target)
        : wire?.targetNode;
      const at =
        point ??
        (from
          ? { x: from.x + nodeBox(from).w + 48, y: from.y }
          : to
            ? { x: to.x - 1176, y: to.y }
            : { x: 48, y: 80 });
      const parent = current.nodes.find(
        (node) =>
          node.kind === "group" &&
          !node.fanout &&
          !node.parentId &&
          !node.collapsed &&
          at.x > node.x &&
          at.y > node.y + 48 &&
          at.x < node.x + node.width &&
          at.y < node.y + node.height,
      );
      const position = clearBoxAlong(
        {
          x: at.x - (wire?.direction === "in" ? 1128 : 24),
          y: at.y - 56,
          w: 1128,
          h: 472,
        },
        current.nodes
          .filter((node) => node.parentId === parent?.id)
          .map((node) => canvasItemBox(current, node)),
        "y",
        1,
        24,
      );
      let groupId = "";
      edit((d) => {
        const pair = createFanoutPair(
          d,
          Math.round(position.x / 12) * 12,
          Math.round(position.y / 12) * 12,
          {
            locale: getLanguage(),
            parentId: parent?.id,
            edgeId,
            workspaceId:
              from?.workspaceId ??
              to?.workspaceId ??
              (activeWorkspaceId || undefined),
            cwd: from?.cwd ?? to?.cwd ?? activeWorkspaceCwd,
          },
        );
        groupId = pair.group.id;
        if (wire) {
          const destination =
            wire.direction === "out" ? pair.fan : pair.merge;
          linkWireDrop(
            d,
            wire,
            destination,
            wire.direction === "out"
              ? {
                  targetPort: "in",
                  ...(wire.portKind === "reference" ? { always: true } : {}),
                }
              : { sourcePort: "out" },
          );
        }
      });
      focusCreatedGroup(groupId);
    },
    [docRef, activeWorkspaceCwd, activeWorkspaceId, edit, focusCreatedGroup],
  );

  const handleSaveTemplateDialog = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp) return;
      setFormModal({
        title: t("saveTemplate"),
        initialValue: grp.title,
        secondaryLabel: t("description"),
        secondaryInitial: "",
        onSubmit: (name, desc) => {
          edit((d) => {
            const captured = captureTemplate(
              d,
              groupId,
              name,
              desc ?? "",
              snapshot?.teamBlueprints,
            );
            d.templates = [...(d.templates ?? []), captured];
            const target = d.nodes.find((n) => n.id === groupId);
            if (target) {
              target.templateId = captured.id;
              target.templateRevision = captured.revision;
            }
          });
          showToast(t("templateSaved"));
        },
      });
    },
    [docRef, setFormModal, edit, showToast, snapshot?.teamBlueprints],
  );

  const handleSaveNewTemplateVersion = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp?.templateId) return;
      edit((d) => {
        const all = allTemplates(d);
        const src = all.find((tpl) => tpl.id === grp.templateId);
        if (!src) return;
        const captured = captureTemplate(
          d,
          groupId,
          src.builtin ? t(src.title) : src.title,
          src.builtin ? t(src.description) : src.description,
          snapshot?.teamBlueprints,
        );
        if (!src.builtin) {
          captured.id = src.id;
          captured.revision = src.revision + 1;
          d.templates = [
            ...(d.templates ?? []).filter((x) => x.id !== src.id),
            captured,
          ];
        } else {
          d.templates = [...(d.templates ?? []), captured];
        }
        const target = d.nodes.find((n) => n.id === groupId);
        if (target) {
          target.templateId = captured.id;
          target.templateRevision = captured.revision;
        }
      });
      showToast(t("templateSaved"));
    },
    [docRef, edit, showToast, snapshot?.teamBlueprints],
  );

  const handleOpenSyncTemplate = useCallback(
    (groupId: string) => {
      const grp = docRef.current.nodes.find((n) => n.id === groupId);
      if (!grp?.templateId) return;
      const tpl = allTemplates(docRef.current).find(
        (x) => x.id === grp.templateId,
      );
      if (!tpl) return;
      setSyncModal({
        groupId,
        plan: computeSyncPlan(docRef.current, grp, tpl),
      });
    },
    [docRef, setSyncModal],
  );

  const handleCaptureSnapshot = useCallback(() => {
    setFormModal({
      title: t("saveSnapshot"),
      description: t("snapshotDescription"),
      initialValue: `${docRef.current.title} · ${formatTime(Date.now())}`,
      onSubmit: (title) => {
        const snap = buildSnapshot(docRef.current, snapshot, title);
        edit((d) => {
          d.snapshots = [snap, ...(d.snapshots ?? []).slice(0, 19)];
        });
        showToast(t("snapshotSaved"));
      },
    });
  }, [docRef, setFormModal, snapshot, edit, showToast]);

  const handleRestoreSnapshot = useCallback(
    (snap: CanvasSnapshot) => {
      edit((d) => {
        const liveNodes = d.nodes;
        d.nodes = structuredClone(snap.nodes).map((n) => {
          const cur = liveNodes.find((x) => x.id === n.id);
          return cur?.sessionId
            ? {
                ...n,
                sessionId: cur.sessionId,
                cwd: cur.cwd,
                workspaceId: cur.workspaceId,
                lastSubmittedTask: cur.lastSubmittedTask,
              }
            : n;
        });
        d.edges = structuredClone(snap.edges);
        d.viewport = structuredClone(snap.viewport);
      });
      setRouteName("canvas");
      showToast(t("snapshotRestored"));
    },
    [edit, setRouteName, showToast],
  );

  /* Theme & Preferences */
  const updatePrefs = useCallback(
    (changes: Partial<CanvasPrefs>) => {
      const current = docRef.current;
      commitEdit({ ...current, prefs: { ...current.prefs, ...changes } });
    },
    [docRef, commitEdit],
  );

  const [themeOverride, setThemeOverride] = useState<"dark" | "light">();
  const themeTransitionRef = useRef<ReturnType<
    typeof startThemeTransition
  > | null>(null);
  const displayedTheme = themeOverride ?? effectiveTheme;
  const showTheme = useCallback((theme: "dark" | "light" | undefined) => {
    flushSync(() => setThemeOverride(theme));
  }, []);

  useLayoutEffect(() => () => themeTransitionRef.current?.stop(), []);
  useEffect(() => {
    if (reducedMotion && themeTransitionRef.current) {
      themeTransitionRef.current.stop();
      setThemeOverride(undefined);
    }
  }, [reducedMotion]);

  const toggleTheme = useCallback(
    (button: HTMLElement) => {
      const preference = docRef.current.prefs?.theme ?? "auto";
      const currentTheme =
        preference === "auto" ? (hostDark ? "dark" : "light") : preference;
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      const root = rootRef.current;
      if (
        root &&
        !reducedMotion &&
        typeof document.startViewTransition === "function"
      ) {
        const running = themeTransitionRef.current;
        if (running) {
          running.add(nextTheme);
        } else {
          setThemeOverride(currentTheme);
          themeTransitionRef.current = startThemeTransition(
            root,
            button,
            currentTheme,
            nextTheme,
            showTheme,
            () => {
              themeTransitionRef.current = null;
            },
          );
        }
      }
      updatePrefs({ theme: nextTheme });
    },
    [docRef, rootRef, hostDark, reducedMotion, showTheme, updatePrefs],
  );

  /* Export / Import JSON */
  const downloadWorkflow = useCallback((name: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, []);

  const handleExportJson = useCallback(() => {
    const copy = structuredClone(docRef.current);
    const nodes = workflowNodes(copy);
    const staffedNodes = staffedIds(nodes);
    for (const node of nodes) {
      if (!isTeamNode(node, staffedNodes)) continue;
      delete node.sessionId;
      delete node.lastSubmittedTask;
    }
    const dependencies = teamDependenciesFor(nodes, snapshot);
    downloadWorkflow(copy.title || "flowspace", {
      ...copy,
      ...(dependencies.teams.length || dependencies.roles.length
        ? { dependencies }
        : {}),
    });
  }, [docRef, snapshot, downloadWorkflow]);

  const handleExportTemplate = useCallback(
    (template: WorkflowTemplate) => {
      const dependencies = teamDependenciesFor(template.nodes, snapshot);
      downloadWorkflow(template.title, {
        kind: "flowspace-template",
        version: 1,
        template,
        dependencies,
      });
    },
    [snapshot, downloadWorkflow],
  );

  const finishImport = useCallback(
    (savedDoc: FlowspaceDocument, template: boolean) => {
      docRef.current = savedDoc;
      setDoc(savedDoc);
      setWorkflowImport(undefined);
      setRouteName(template ? "workflows" : "canvas");
      if (template) setLibraryTab("mine");
      else setTimeout(() => fitView(true), 60);
      showToast(t("workflowImported"));
    },
    [docRef, setDoc, setWorkflowImport, setRouteName, setLibraryTab, fitView, showToast],
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const parsed = JSON.parse(await file.text()) as FlowspaceDocument & {
          kind?: string;
          template?: WorkflowTemplate;
          dependencies?: TeamDependencies;
        };
        const request: WorkflowImportRequest =
          parsed.kind === "flowspace-template"
            ? { template: parsed.template, dependencies: parsed.dependencies }
            : {
                document: { ...parsed, version: 1, id: "main" },
                dependencies: parsed.dependencies,
              };
        await flush();
        if (
          request.dependencies ||
          containsCodeNode(request) ||
          (request.template?.nodes ?? request.document?.nodes ?? []).some(
            (node) => node.flowType === "flowspace/trigger",
          )
        ) {
          setWorkflowImport({ request });
        } else {
          const result = await bridge.importWorkflow(request);
          if (result.kind === "imported") {
            finishImport(result.document, !!request.template);
          } else {
            setWorkflowImport({ request, missing: result.models });
          }
        }
      } catch (err) {
        reportError(err);
      }
    },
    [bridge, finishImport, flush, reportError, setWorkflowImport],
  );

  return {
    selectNode,
    revealNode,
    focusGroup,
    fitView,
    focusCreatedGroup,
    loadStarter,
    editBoard,
    editNode,
    editEdge,
    toggleNodeForm,
    openWindow,
    returnWindow,
    openDetailCard,
    createCanvasNode,
    connectNodes,
    createBoardCompanion,
    deleteSelection,
    groupSelected,
    ungroup,
    arrangeTopology,
    tidyLabel,
    selectPasteResult,
    copySelection,
    pasteClipboard,
    duplicateSelection,
    selectAllVisible,
    toggleParticipation,
    setBatchParticipation,
    alignSelection,
    distributeSelection,
    performUndo,
    launchScope,
    bindAgentSession,
    extractDisplayFrom,
    pinDeliverable,
    runSelection,
    extendLoop,
    runFromHere,
    runToHere,
    stopNode,
    forkHypothesis,
    handleInstantiateTemplate,
    insertFanout,
    handleSaveTemplateDialog,
    handleSaveNewTemplateVersion,
    handleOpenSyncTemplate,
    handleCaptureSnapshot,
    handleRestoreSnapshot,
    updatePrefs,
    displayedTheme,
    toggleTheme,
    handleExportJson,
    handleExportTemplate,
    finishImport,
    handleImportFile,
  };
}
