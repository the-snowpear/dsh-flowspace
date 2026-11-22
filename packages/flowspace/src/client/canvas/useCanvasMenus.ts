import {
  useCallback,
  useMemo,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  NodeKind,
  SessionBrief,
  StartRequest,
  WorkflowTemplate,
} from "../../types.ts";
import {
  appendMasterStep,
  cleanRetiredLanes,
  resumeMasterSync,
} from "../../core/fanout.ts";
import { isTeamNode, staffedIds } from "../../core/team.ts";
import type { CanvasBridge } from "../bridge.ts";
import {
  alignedWireDropPosition,
  canvasItemBox,
  clamp,
  inferGroupPorts,
  isCompactNode,
  nodeBox,
  portY,
  reflowCanvasItem,
  toWorld,
} from "../geometry.ts";
import { getLanguage, t } from "../i18n.ts";
import { kindIconName } from "../icons.tsx";
import type {
  QuickCreateSelection,
  WireDropContext,
} from "../QuickCreateMenu.tsx";
import type { DraftAffiliation } from "../structure.ts";
import {
  duplicateSubgraph,
  serializeSubgraphClipboard,
  type SubgraphClipboard,
} from "../subgraphs.ts";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import { allTemplates } from "../templates.ts";
import type { MenuItem, MenuState } from "../ui/ContextMenu.tsx";
import type { PromptDialogSpec } from "../ui/PromptDialog.tsx";
import {
  addWire,
  linkWireDrop,
  removeCanvasNodes,
  type PaletteEntry,
  type PayloadPeekState,
  type QuickCreateState,
  type RouteId,
  type WireEnds,
} from "./canvasGraphOps.ts";
import type {
  AnchorTarget,
  EditDocFn,
  EditNodeFn,
  SelectionState,
} from "./canvasTypes.ts";

export interface UseCanvasMenusOptions {
  doc: FlowspaceDocument;
  docRef: MutableRefObject<FlowspaceDocument>;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
  viewportRef: RefObject<HTMLDivElement>;
  sessionWireDrop: MutableRefObject<QuickCreateState | null>;
  clipboardRef: MutableRefObject<SubgraphClipboard | null>;
  pendingFocusRef: MutableRefObject<string | null>;
  lod: boolean;
  keepExpandedIds: Set<string>;
  branchScroll: Map<string, number>;
  quickCreate: QuickCreateState | null;
  setQuickCreate: Dispatch<SetStateAction<QuickCreateState | null>>;
  paletteDialog: {
    targetNodeId: string | null;
    query: string;
    index: number;
  } | null;
  workspaceFilesList: string[];
  activeWorkspaceCwd: string | undefined;
  tidyLabel: "tidySelection" | "tidy";
  setMenu: Dispatch<SetStateAction<MenuState | null>>;
  setPayloadPeek: Dispatch<SetStateAction<PayloadPeekState | null>>;
  setTeamPicker: Dispatch<SetStateAction<{ at?: { x: number; y: number } } | null>>;
  setSessionModal: Dispatch<SetStateAction<SessionBrief[] | null>>;
  setFormModal: Dispatch<SetStateAction<PromptDialogSpec | null>>;
  setSelection: Dispatch<SetStateAction<SelectionState>>;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
  setRouteName: Dispatch<SetStateAction<RouteId>>;
  edit: EditDocFn;
  editNode: EditNodeFn;
  selectNode: (id: string, additive?: boolean) => void;
  revealNode: (id: string) => void;
  createCanvasNode: (
    kind: NodeKind,
    worldPoint?: { x: number; y: number },
    explicitAffiliation?: DraftAffiliation,
    usePreClick?: boolean,
    extra?: {
      place?: (node: FlowNode) => { x: number; y: number };
      patch?: Partial<FlowNode>;
      flowType?: string;
      link?: (d: FlowspaceDocument, created: FlowNode) => void;
    },
  ) => FlowNode;
  connectNodes: (
    fromIds: string[],
    toIds: string[],
    kind: FlowEdge["kind"],
    ends?: WireEnds,
  ) => void;
  createBoardCompanion: (
    boardId: string,
    cardId: string,
    kind: "agent" | "note",
  ) => void;
  insertFanout: (
    point?: { x: number; y: number },
    wire?: WireDropContext | null,
    edgeId?: string,
  ) => void;
  handleInstantiateTemplate: (
    tpl: WorkflowTemplate,
    opts?: {
      at?: { x: number; y: number };
      link?: (d: FlowspaceDocument, group: FlowNode) => void;
    },
  ) => void;
  openTeam: (nodeId: string, rowId?: string) => void;
  launchScope: (req: StartRequest) => void;
  runFromHere: (nodeId: string) => void;
  runToHere: (nodeId: string) => void;
  forkHypothesis: (sourceId: string) => void;
  stopNode: (nodeId: string) => void;
  toggleParticipation: (
    mode: "paused" | "bypassed",
    explicit?: string[],
  ) => boolean;
  openDetailCard: (agentId: string) => void;
  selectPasteResult: (res: {
    createdNodeIds: string[];
    createdGroupIds: string[];
  }) => void;
  toggleNodeForm: (nodeId: string) => void;
  returnWindow: (nodeId: string) => void;
  openWindow: (nodeId: string) => void;
  arrangeTopology: (targetIds?: string[]) => void;
  groupSelected: () => void;
  fitView: (all?: boolean, instant?: boolean) => void;
  handleCaptureSnapshot: () => void;
  handleSaveTemplateDialog: (groupId: string) => void;
  handleOpenSyncTemplate: (groupId: string) => void;
  handleSaveNewTemplateVersion: (groupId: string) => void;
  ungroup: (groupId: string) => void;
  showToast: (msg: unknown, isError?: boolean) => void;
  reportError: (err: unknown) => void;
}

export function useCanvasMenus({
  doc,
  docRef,
  snapshot,
  bridge,
  viewportRef,
  sessionWireDrop,
  clipboardRef,
  pendingFocusRef,
  lod,
  keepExpandedIds,
  branchScroll,
  quickCreate,
  setQuickCreate,
  paletteDialog,
  workspaceFilesList,
  activeWorkspaceCwd,
  tidyLabel,
  setMenu,
  setPayloadPeek,
  setTeamPicker,
  setSessionModal,
  setFormModal,
  setSelection,
  setInspectorOpen,
  setRouteName,
  edit,
  editNode,
  selectNode,
  revealNode,
  createCanvasNode,
  connectNodes,
  createBoardCompanion,
  insertFanout,
  handleInstantiateTemplate,
  openTeam,
  launchScope,
  runFromHere,
  runToHere,
  forkHypothesis,
  stopNode,
  toggleParticipation,
  openDetailCard,
  selectPasteResult,
  toggleNodeForm,
  returnWindow,
  openWindow,
  arrangeTopology,
  groupSelected,
  fitView,
  handleCaptureSnapshot,
  handleSaveTemplateDialog,
  handleOpenSyncTemplate,
  handleSaveNewTemplateVersion,
  ungroup,
  showToast,
  reportError,
}: UseCanvasMenusOptions) {
  const openAnchoredMenu = useCallback(
    (anchor: AnchorTarget, items: MenuItem[], focusFirst = false) => {
      const pos =
        anchor instanceof HTMLElement
          ? {
              x: anchor.getBoundingClientRect().left,
              y: anchor.getBoundingClientRect().bottom + 6,
            }
          : anchor;
      setMenu({
        x: clamp(pos.x, 8, window.innerWidth - 250),
        y: clamp(
          pos.y,
          8,
          window.innerHeight - Math.min(420, items.length * 36 + 24),
        ),
        items,
        returnFocus:
          focusFirst && anchor instanceof HTMLElement ? anchor : undefined,
      });
    },
    [setMenu],
  );

  const openBoardMenu = useCallback(
    (anchor: HTMLElement, items: MenuItem[]) => {
      openAnchoredMenu(anchor, items, true);
    },
    [openAnchoredMenu],
  );

  const openBoardAgentMenu = useCallback(
    (boardId: string, cardId: string, anchor: HTMLElement) => {
      const agents = docRef.current.nodes.filter(
        (node) => node.kind === "agent",
      );
      openBoardMenu(anchor, [
        { heading: t("boardLinkAgent") },
        ...agents.map((agent) => ({
          label: agent.title,
          icon: "agent",
          fn: () => {
            connectNodes([boardId], [agent.id], "reference", {
              sourceItemKey: cardId,
            });
            showToast(t("boardAgentLinked", { name: agent.title }));
          },
        })),
        ...(agents.length
          ? []
          : [{ label: t("boardNoAgents"), disabled: true }]),
        { divider: true },
        {
          label: t("boardDispatch"),
          icon: "sendTask",
          fn: () => createBoardCompanion(boardId, cardId, "agent"),
        },
      ]);
    },
    [openBoardMenu, connectNodes, createBoardCompanion, showToast, docRef],
  );

  const openAddMenu = useCallback(
    (anchor: AnchorTarget, worldPt?: { x: number; y: number }) => {
      openAnchoredMenu(anchor, [
        { heading: t("create") },
        {
          label: t("flow_fanout_group"),
          icon: "fanout",
          fn: () => insertFanout(worldPt),
        },
        {
          label: t("newAgent"),
          icon: "agent",
          fn: () => createCanvasNode("agent", worldPt),
        },
        {
          label: t("newTeam"),
          icon: "team",
          fn: () => setTeamPicker({ at: worldPt }),
        },
        {
          label: t("existingSession"),
          icon: "chat",
          fn: () =>
            void bridge.sessions().then(setSessionModal).catch(reportError),
        },
        {
          label: t("newGit"),
          icon: "git",
          fn: () => createCanvasNode("git", worldPt),
        },
        {
          label: t("newChanges"),
          icon: "diff",
          fn: () => createCanvasNode("changes", worldPt),
        },
        {
          label: t("newFile"),
          icon: "file",
          fn: () => createCanvasNode("file", worldPt),
        },
        {
          label: t("newTerminal"),
          icon: "term",
          fn: () => createCanvasNode("terminal", worldPt),
        },
        {
          label: t("newNote"),
          icon: "note",
          fn: () => createCanvasNode("note", worldPt),
        },
        {
          label: t("newBoard"),
          icon: "board",
          fn: () => createCanvasNode("board", worldPt),
        },
        { divider: true },
        { heading: t("workflows") },
        ...allTemplates(docRef.current)
          .slice(0, 3)
          .map((tpl) => ({
            label: tpl.builtin ? t(tpl.title) : tpl.title,
            icon: "canvas",
            fn: () => handleInstantiateTemplate(tpl),
          })),
      ]);
    },
    [
      openAnchoredMenu,
      createCanvasNode,
      bridge,
      reportError,
      handleInstantiateTemplate,
      insertFanout,
      setTeamPicker,
      setSessionModal,
      docRef,
    ],
  );

  const openQuickCreate = useCallback(
    (
      clientPt: { x: number; y: number },
      wire: WireDropContext | null = null,
    ) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const world =
        wire?.worldPoint ??
        toWorld(
          docRef.current.viewport,
          vp.getBoundingClientRect(),
          clientPt.x,
          clientPt.y,
        );
      setMenu(null);
      setPayloadPeek(null);
      setQuickCreate({ anchor: clientPt, world, wire });
    },
    [viewportRef, docRef, setMenu, setPayloadPeek, setQuickCreate],
  );

  const handleQuickCreateSelect = useCallback(
    (sel: QuickCreateSelection) => {
      const qc = quickCreate;
      setQuickCreate(null);
      if (!qc) return;
      const { world, wire } = qc;
      if (sel.action === "create-fanout") {
        insertFanout(world, wire);
        return;
      }
      const anchorNode = wire
        ? docRef.current.nodes.find(
            (n) =>
              n.id ===
              (wire.direction === "out"
                ? wire.sourceNode?.id
                : wire.targetNode?.id),
          )
        : undefined;
      const portKind = wire?.portKind;
      const anchorBox = anchorNode
        ? nodeBox(anchorNode, lod, keepExpandedIds.has(anchorNode.id))
        : undefined;
      const placeAligned =
        anchorNode && anchorBox && portKind
          ? (n: FlowNode) =>
              alignedWireDropPosition(anchorBox, portKind, world, n.kind, {
                direction: wire!.direction,
                sourceKind: anchorNode.kind,
                sourcePortOffset: portY(
                  anchorNode,
                  portKind,
                  !!anchorBox.compact,
                  wire?.portId,
                  branchScroll.get(anchorNode.id),
                  anchorBox.h,
                  wire?.direction,
                ),
                targetCompact: isCompactNode(n, false, true),
              })
          : undefined;

      if (sel.action === "existing-session") {
        void bridge
          .sessions()
          .then((sessions) => {
            sessionWireDrop.current = qc;
            setSessionModal(sessions);
          })
          .catch(reportError);
        return;
      }
      if (sel.action === "create-team") {
        setTeamPicker({ at: world });
        return;
      }

      if (sel.action === "instantiate-template") {
        const kind = sel.edgePatch?.kind ?? portKind;
        handleInstantiateTemplate(sel.template, {
          at: world,
          link:
            anchorNode && kind && wire?.direction === "out"
              ? (d, grp) => {
                  const entry = inferGroupPorts(d, grp).find(
                    (p) =>
                      p.direction === "in" && p.kind === kind && !p.hidden,
                  );
                  for (const targetId of entry?.nodes ?? []) {
                    const target = d.nodes.find((n) => n.id === targetId);
                    if (target)
                      linkWireDrop(d, wire, target, {
                        ...sel.edgePatch,
                        kind,
                        targetPort: entry?.portId,
                      });
                  }
                }
              : undefined,
        });
        return;
      }

      if (sel.action === "create-display") {
        const source = wire?.direction === "out" ? anchorNode : undefined;
        const latestText = source
          ? source.kind === "agent"
            ? snapshot?.live.find((l) => l.nodeId === source.id)?.output ||
              snapshot?.runs
                .flatMap((r) => r.steps)
                .filter((s) => s.nodeId === source.id)
                .at(-1)?.output ||
              ""
            : source.text
          : "";
        createCanvasNode("display", world, undefined, false, {
          place: placeAligned,
          patch: source
            ? {
                title: `${source.title} · ${t("newDisplay")}`,
                sourceNodeId: source.id,
                text: latestText,
                fixed: sel.fixed || source.kind !== "agent",
              }
            : { fixed: sel.fixed },
        });
        return;
      }

      const edgeKind = sel.edgePatch?.kind ?? portKind;
      const created = createCanvasNode(sel.nodeKind, world, undefined, false, {
        place: placeAligned,
        flowType: sel.flowType,
        patch: sel.nodePatch,
        link:
          anchorNode && edgeKind && wire
            ? (d, c) => linkWireDrop(d, wire, c, sel.edgePatch)
            : undefined,
      });
      if (created.kind === "agent" || created.kind === "note") {
        pendingFocusRef.current = created.id;
      }
    },
    [
      quickCreate,
      setQuickCreate,
      branchScroll,
      insertFanout,
      lod,
      keepExpandedIds,
      bridge,
      reportError,
      handleInstantiateTemplate,
      snapshot,
      createCanvasNode,
      docRef,
      sessionWireDrop,
      setSessionModal,
      setTeamPicker,
      pendingFocusRef,
    ],
  );

  const openNodeContextMenu = useCallback(
    (node: FlowNode, anchor: AnchorTarget) => {
      selectNode(node.id);
      const items: MenuItem[] = [
        {
          label: t("rename"),
          icon: "note",
          fn: () =>
            setFormModal({
              title: t("rename"),
              initialValue: node.title,
              onSubmit: (title) => editNode(node.id, { title }),
            }),
        },
      ];
      if (
        node.generatedBy &&
        node.itemKey &&
        node.overridden &&
        !node.removed &&
        docRef.current.nodes.find((n) => n.id === node.generatedBy)?.config
          ?.followMaster !== false
      ) {
        items.push({
          label: t("flow_resume_master_sync"),
          icon: "undo",
          fn: () =>
            edit((d) => {
              const used = new Set(
                snapshot?.runs.flatMap((run) =>
                  run.steps.map((step) => step.nodeId),
                ) ?? [],
              );
              resumeMasterSync(d, node.generatedBy!, node.itemKey!, used);
            }),
        });
      }
      if (node.kind === "role" && node.staffOf) {
        items.push({
          label: t("teamRoleDisconnect"),
          icon: "unplug",
          fn: () => editNode(node.id, { staffOf: undefined }),
        });
      }
      if (node.kind === "agent") {
        if (isTeamNode(node, staffedIds(docRef.current.nodes))) {
          items.push({
            label: t("teamEnter"),
            icon: "team",
            fn: () => openTeam(node.id),
          });
        }
        items.push(
          {
            label: t("runSingle"),
            icon: "play",
            disabled: !(node.draft.trim() || node.task.trim()),
            fn: () => launchScope({ kind: "single", nodeIds: [node.id] }),
          },
          {
            label: t("runFromHere"),
            icon: "runFrom",
            fn: () => runFromHere(node.id),
          },
          {
            label: t("runToHere"),
            icon: "runTo",
            fn: () => runToHere(node.id),
          },
          {
            label: `⎇ ${t("forkHypothesis")}`,
            description: t("forkHypothesisTip"),
            icon: "fork",
            disabled: !node.sessionId,
            fn: () => forkHypothesis(node.id),
          },
        );
        if (
          ["running", "settling"].includes(nodeStatusOf(snapshot, node.id))
        ) {
          items.push({
            label: t("stopAgent"),
            icon: "stop",
            danger: true,
            fn: () => stopNode(node.id),
          });
        }
        items.push(
          { divider: true },
          {
            label: t("toggleBypass"),
            icon: "bypass",
            checked: node.participation === "bypassed",
            shortcut: "Ctrl B",
            fn: () => toggleParticipation("bypassed", [node.id]),
          },
          {
            label: t("toggleMute"),
            icon: "mute",
            checked: node.participation === "paused",
            shortcut: "Ctrl M",
            fn: () => toggleParticipation("paused", [node.id]),
          },
          {
            label: t("executionDetail"),
            icon: "card",
            fn: () => openDetailCard(node.id),
          },
        );
        if (node.sessionId) {
          items.push({
            label: t("openNativeChat"),
            icon: "chat",
            fn: () => bridge.openChat(node.sessionId!),
          });
        }
      }
      items.push(
        {
          label: t("duplicateSelection"),
          icon: "duplicate",
          shortcut: "Ctrl D",
          fn: () => {
            let res: ReturnType<typeof duplicateSubgraph> | null = null;
            edit((d) => {
              res = duplicateSubgraph(d, [node.id]);
            });
            if (res) selectPasteResult(res);
          },
        },
        {
          label: t("copySelection"),
          icon: "copy",
          shortcut: "Ctrl C",
          fn: () => {
            const clip = serializeSubgraphClipboard(docRef.current, [node.id]);
            if (clip) {
              clipboardRef.current = clip;
              showToast(t("copySelection"));
            }
          },
        },
      );
      items.push(
        { divider: true },
        {
          label: t(node.expanded ? "collapse" : "expand"),
          icon: "card",
          fn: () => toggleNodeForm(node.id),
        },
        {
          label: t(node.window ? "returnCanvas" : "openWindow"),
          icon: "pop",
          fn: () =>
            node.window ? returnWindow(node.id) : openWindow(node.id),
        },
        {
          label: t(node.pinned ? "unpin" : "pin"),
          icon: "pin",
          checked: !!node.pinned,
          fn: () => editNode(node.id, { pinned: !node.pinned }),
        },
        {
          label: t("inspect"),
          icon: "side",
          fn: () => setInspectorOpen(true),
        },
      );
      if (node.window) {
        items.push(
          { divider: true },
          ...(
            [
              ["left", "snapLeft"],
              ["right", "snapRight"],
              ["max", "maximize"],
            ] as const
          ).map(([snap, labelKey]) => ({
            label: t(labelKey),
            icon: "card",
            fn: () =>
              editNode(node.id, {
                window: { ...node.window!, snap },
              }),
          })),
        );
      }
      items.push(
        { divider: true },
        {
          label: t("deleteNode"),
          icon: "trash",
          danger: true,
          fn: () => {
            edit((d) => {
              removeCanvasNodes(d, [node.id]);
            });
            setSelection({ nodes: [], groups: [], edge: null });
          },
        },
      );
      openAnchoredMenu(anchor, items);
    },
    [
      selectNode,
      editNode,
      launchScope,
      openDetailCard,
      bridge,
      toggleNodeForm,
      returnWindow,
      openWindow,
      edit,
      openAnchoredMenu,
      runFromHere,
      runToHere,
      openTeam,
      forkHypothesis,
      stopNode,
      snapshot,
      toggleParticipation,
      selectPasteResult,
      showToast,
      setFormModal,
      setInspectorOpen,
      setSelection,
      docRef,
      clipboardRef,
    ],
  );

  const openGroupContextMenu = useCallback(
    (group: FlowNode, anchor: AnchorTarget) => {
      setSelection({ nodes: [], groups: [group.id], edge: null });
      const items: MenuItem[] = [
        {
          label: t("rename"),
          icon: "note",
          fn: () =>
            setFormModal({
              title: t("rename"),
              initialValue: group.title,
              onSubmit: (title) =>
                editNode(group.id, { title, titleKey: undefined }),
            }),
        },
        {
          label: t("runGroup"),
          icon: "play",
          fn: () => launchScope({ kind: "group", nodeIds: [group.id] }),
        },
        {
          label: t(group.collapsed ? "expand" : "collapse"),
          icon: "card",
          fn: () => editNode(group.id, { collapsed: !group.collapsed }),
        },
        {
          label: t("tidyGroup"),
          icon: "tidy",
          fn: () => arrangeTopology([group.id]),
        },
        {
          label: t("ports"),
          icon: "side",
          fn: () => setInspectorOpen(true),
        },
        { divider: true },
        {
          label: t("saveTemplate"),
          icon: "box",
          fn: () => handleSaveTemplateDialog(group.id),
        },
      ];
      if (group.templateId) {
        items.push(
          {
            label: t("syncTemplate"),
            icon: "undo",
            fn: () => handleOpenSyncTemplate(group.id),
          },
          {
            label: t("saveNewVersion"),
            icon: "check",
            fn: () => handleSaveNewTemplateVersion(group.id),
          },
          {
            label: t("detachTemplate"),
            icon: "off",
            fn: () =>
              editNode(group.id, {
                templateId: undefined,
                templateRevision: undefined,
              }),
          },
        );
      }
      if (group.fanout) {
        const fanId = group.fanout.fanId;
        items.push({
          label: t("flow_append_master_step"),
          icon: "plus",
          fn: () => {
            let id: string | undefined;
            edit((d) => {
              const previous = canvasItemBox(
                d,
                d.nodes.find((node) => node.id === group.id)!,
              );
              id = appendMasterStep(d, fanId, getLanguage())?.id;
              const frame = d.nodes.find((node) => node.id === group.id)!;
              reflowCanvasItem(d, frame, previous);
            });
            if (id) revealNode(id);
          },
        });
        if (
          docRef.current.nodes.some(
            (node) => node.generatedBy === fanId && node.removed,
          )
        ) {
          items.push({
            label: t("flow_cleanup_lanes"),
            icon: "trash",
            fn: () => edit((d) => cleanRetiredLanes(d, fanId)),
          });
        }
        items.push({
          label: t("deleteNode"),
          icon: "trash",
          danger: true,
          fn: () => {
            edit((d) => removeCanvasNodes(d, [group.id]));
            setSelection({ nodes: [], groups: [], edge: null });
          },
        });
      } else {
        items.push(
          { divider: true },
          {
            label: t("ungroup"),
            icon: "x",
            danger: true,
            fn: () => ungroup(group.id),
          },
        );
      }
      openAnchoredMenu(anchor, items);
    },
    [
      editNode,
      launchScope,
      arrangeTopology,
      handleSaveTemplateDialog,
      handleOpenSyncTemplate,
      handleSaveNewTemplateVersion,
      edit,
      revealNode,
      ungroup,
      openAnchoredMenu,
      setSelection,
      setFormModal,
      setInspectorOpen,
      docRef,
    ],
  );

  /* Command / @ Mention Palette Items */
  const paletteEntries = useMemo<PaletteEntry[]>(() => {
    if (!paletteDialog) return [];
    const targetId = paletteDialog.targetNodeId;
    const needle = paletteDialog.query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    if (!targetId) {
      const cmds: [string, string, () => void][] = [
        ["newAgent", "agent", () => createCanvasNode("agent")],
        ["newTeam", "team", () => setTeamPicker({})],
        [
          "existingSession",
          "chat",
          () => void bridge.sessions().then(setSessionModal).catch(reportError),
        ],
        ["newGit", "git", () => createCanvasNode("git")],
        ["newChanges", "diff", () => createCanvasNode("changes")],
        ["newFile", "file", () => createCanvasNode("file")],
        ["newTerminal", "term", () => createCanvasNode("terminal")],
        ["newNote", "note", () => createCanvasNode("note")],
        ["newBoard", "board", () => createCanvasNode("board")],
        ["runAll", "play", () => launchScope({ kind: "global", nodeIds: [] })],
        ["groupSelection", "group", groupSelected],
        [tidyLabel, "tidy", () => arrangeTopology()],
        ["fitView", "fit", () => fitView(false)],
        ["saveSnapshot", "clock", handleCaptureSnapshot],
        ["workflowLibrary", "box", () => setRouteName("workflows")],
        ["activity", "bolt", () => setRouteName("activity")],
        ["settings", "gear", () => setRouteName("settings")],
      ];
      for (const [key, glyph, fn] of cmds) {
        list.push({
          label: t(key),
          section: t("command"),
          icon: glyph,
          fn,
        });
      }
      for (const tpl of allTemplates(doc)) {
        list.push({
          label: tpl.builtin ? t(tpl.title) : tpl.title,
          detail: tpl.builtin ? t(tpl.description) : tpl.description,
          section: t("workflows"),
          icon: "canvas",
          fn: () => handleInstantiateTemplate(tpl),
        });
      }
    }

    for (const node of doc.nodes) {
      if (node.kind === "group") continue;
      if (targetId && node.id === targetId) continue;
      list.push({
        label: node.title,
        detail: node.kind.toUpperCase(),
        section: t("canvas"),
        icon: kindIconName(node.kind, node.flowType),
        fn: () => {
          if (!targetId) {
            revealNode(node.id);
            return;
          }
          if (node.kind === "agent") {
            edit((d) => {
              const tgt = d.nodes.find((x) => x.id === targetId);
              if (
                tgt &&
                !d.edges.some(
                  (e) => e.source === node.id && e.target === targetId,
                )
              ) {
                addWire(d, node, tgt, "continuation", { trigger: "off" });
              }
              if (tgt) {
                tgt.draft = `${tgt.draft ? tgt.draft + " " : ""}@${node.title} `;
                tgt.task = tgt.draft;
              }
            });
          } else {
            connectNodes([node.id], [targetId], "reference");
            editNode(targetId, {
              draft: `${docRef.current.nodes.find((x) => x.id === targetId)?.draft ?? ""}@${node.title} `,
              task: `${docRef.current.nodes.find((x) => x.id === targetId)?.draft ?? ""}@${node.title} `,
            });
          }
        },
      });
    }

    if (targetId) {
      for (const filePath of workspaceFilesList) {
        list.push({
          label: filePath.split("/").pop() ?? filePath,
          detail: filePath,
          section: t("newFile"),
          icon: "file",
          fn: () => {
            const targetNode = docRef.current.nodes.find(
              (n) => n.id === targetId,
            );
            if (!targetNode) return;
            edit((d) => {
              const existingFileNode = d.nodes.find(
                (n) =>
                  n.kind === "file" &&
                  (n.text === filePath || n.selectedItems?.includes(filePath)),
              );
              if (existingFileNode) {
                addWire(d, existingFileNode, targetNode, "reference");
              }
              const tgt = d.nodes.find((x) => x.id === targetId);
              if (tgt) {
                tgt.draft = `${tgt.draft ? tgt.draft + " " : ""}@${filePath} `;
                if (!tgt.sessionId) tgt.task = tgt.draft;
              }
            });
          },
        });
      }
    }

    return list
      .filter(
        (item) =>
          !needle ||
          `${item.label} ${item.detail ?? ""} ${item.section}`
            .toLowerCase()
            .includes(needle),
      )
      .slice(0, 20);
  }, [
    paletteDialog,
    doc,
    workspaceFilesList,
    createCanvasNode,
    bridge,
    reportError,
    launchScope,
    groupSelected,
    arrangeTopology,
    tidyLabel,
    fitView,
    handleCaptureSnapshot,
    handleInstantiateTemplate,
    revealNode,
    edit,
    connectNodes,
    editNode,
    activeWorkspaceCwd,
    setTeamPicker,
    setSessionModal,
    setRouteName,
    docRef,
  ]);

  return {
    openAnchoredMenu,
    openBoardMenu,
    openBoardAgentMenu,
    openAddMenu,
    openQuickCreate,
    handleQuickCreateSelect,
    openNodeContextMenu,
    openGroupContextMenu,
    paletteEntries,
  };
}
