import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type {
  FlowNode,
  FlowNotice,
  FlowspaceRun,
  LaunchPlan,
  SessionBrief,
  TeamModel,
  WorkflowImportRequest,
  WorkflowTemplate,
  WorkspaceBrief,
  WorkspaceFilePreview,
  WorkspaceStructureBrief,
} from "../types.ts";
import { isTeamNode } from "../core/team.ts";
import type { CanvasBridge } from "./bridge.ts";
import { LOD_ZOOM, nodeBox } from "./geometry.ts";
import { installHostStyleGuard } from "./hostStyleGuard.ts";
import { subscribeLanguage, t } from "./i18n.ts";
import { CanvasPreviewContext } from "./nodes/DataPreview.tsx";
import type { ExchangePair } from "./sceneWires.ts";
import type { SubgraphClipboard } from "./subgraphs.ts";
import { InspectorPanel } from "./SurfaceViews.tsx";
import { useModelRoutes } from "./TeamCanvas.tsx";
import type { SyncPlan } from "./templates.ts";
import type { MenuState } from "./ui/ContextMenu.tsx";
import type { PromptDialogSpec } from "./ui/PromptDialog.tsx";
import {
  detectHostDark,
  HOST_THEME_ATTRS,
  type PayloadPeekState,
  type QuickCreateState,
  type RouteId,
} from "./canvas/canvasGraphOps.ts";
import type {
  ConnectingState,
  SelectionState,
} from "./canvas/canvasTypes.ts";
import {
  CanvasBottomDrawer,
  CanvasOverlays,
  CanvasReplayView,
  CanvasRouteSurfaces,
} from "./canvas/CanvasChrome.tsx";
import { CanvasDialogsHost } from "./canvas/CanvasDialogsHost.tsx";
import { useNodeCardRenderer } from "./canvas/CanvasNodeCard.tsx";
import { CanvasSidebar } from "./canvas/CanvasSidebar.tsx";
import { CanvasToolbar, CanvasTopBar } from "./canvas/CanvasTopBar.tsx";
import { CanvasWorld } from "./canvas/CanvasWorld.tsx";
import { useCanvasActions } from "./canvas/useCanvasActions.ts";
import { useCanvasDocument } from "./canvas/useCanvasDocument.ts";
import { useCanvasGestures } from "./canvas/useCanvasGestures.ts";
import { useCanvasMenus } from "./canvas/useCanvasMenus.ts";
import { useCanvasScene } from "./canvas/useCanvasScene.ts";
import { useCanvasShortcuts } from "./canvas/useCanvasShortcuts.ts";
import { useCanvasViewport } from "./canvas/useCanvasViewport.ts";
import { useCardActions } from "./canvas/ViewportCard.tsx";
import { CanvasInteractionContext, createCanvasInteractionStore } from "./canvas/interactionStore.ts";

const reducedMotionStyles = (
  <style data-fs-reduced-motion>{`
@layer overrides {
  .fs-root[data-perf-tier="L1"] :where(
      div,
      section,
      article,
      aside,
      header,
      footer,
      main,
      nav,
      button,
      input,
      textarea,
      select,
      dialog,
      a,
      span,
      i,
      svg,
      path,
      circle,
      rect.port-rim
    ),
  .fs-root[data-perf-tier="L1"] :where(div, button, span, i, dialog)::before,
  .fs-root[data-perf-tier="L1"] :where(div, button, span, i, dialog)::after,
  .fs-root[data-perf-tier="L1"] dialog.fs-modal-dialog::backdrop {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
  }
}
`}</style>
);

export { detectHostDark };

export function CanvasApp({
  bridge,
  renderConversation,
  renderNotice,
}: {
  bridge: CanvasBridge;
  renderConversation: (
    node: FlowNode | undefined,
    reference: SessionReference,
  ) => ReactNode;
  renderNotice?: (notice: FlowNotice, onDone: () => void) => ReactNode;
}) {
  const snapshot = bridge.useSnapshot();
  const [languageRevision, setLangTick] = useState(0);
  useEffect(() => subscribeLanguage(() => setLangTick((v) => v + 1)), []);
  useEffect(() => installHostStyleGuard(), []);

  /* Core DOM & ephemeral refs */
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const mountedSessionsRef = useRef(new Map<string, number>());
  const sidebarAutoAdjusted = useRef(false);
  const clipboardRef = useRef<SubgraphClipboard | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const preClickSelectionRef = useRef<{
    nodes: string[];
    structureId: string | null;
  }>({ nodes: [], structureId: null });
  const sessionWireDrop = useRef<QuickCreateState | null>(null);
  const seenNotices = useRef(new Set<string>());
  const noticeSince = useRef(Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  /* UI shell & overlay state */
  const [toastState, setToastState] = useState<{
    text: string;
    error?: boolean;
    visible: boolean;
  }>({ text: "", visible: false });
  const [routeName, setRouteName] = useState<RouteId>("canvas");
  const [variablePanel, setVariablePanel] = useState(false);
  const [replayRun, setReplayRun] = useState<FlowspaceRun>();
  const replayLocked = useRef(false);
  replayLocked.current = !!replayRun;
  const [replayTime, setReplayTime] = useState(0);
  const [reportRun, setReportRun] = useState<FlowspaceRun>();
  const [arenaOpen, setArenaOpen] = useState(false);
  const [batchHumanId, setBatchHumanId] = useState<string>();
  const batchHumanRun = snapshot?.runs.find((run) => run.id === batchHumanId);
  const [notice, setNotice] = useState<FlowNotice>();
  const [teamNodeId, setTeamNodeId] = useState<string>();
  const [teamFocus, setTeamFocus] = useState<string>();
  const openTeam = useCallback((nodeId: string, rowId?: string) => {
    setTeamNodeId(nodeId);
    setTeamFocus(rowId);
    setRouteName("team");
  }, []);
  const [libraryTab, setLibraryTab] = useState<
    "patterns" | "mine" | "snapshots" | "teams"
  >("patterns");
  const [activityTab, setActivityTab] = useState<
    "runs" | "outputs" | "waiting"
  >("runs");
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"events" | "outputs" | "waiting">(
    "events",
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [tool, setTool] = useState<"pointer" | "hand">("pointer");
  const [spacePressed, setSpacePressed] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({
    nodes: [],
    groups: [],
    edge: null,
  });
  const [lastAgentId, setLastAgentId] = useState<string>("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<{
    nodeId: string;
    text: string;
  } | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceBrief[]>([]);
  const [projectStructures, setProjectStructures] = useState<
    WorkspaceStructureBrief[]
  >([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(
    null,
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [workspaceFilesList, setWorkspaceFilesList] = useState<string[]>([]);
  const [fileInputDrafts, setFileInputDrafts] = useState<
    Record<string, string>
  >({});
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [interactionStore] = useState(createCanvasInteractionStore);
  const setHoveredEdgeId = useCallback((update: string | null | ((id: string | null) => string | null)) => {
    const current = interactionStore.getHover().edgeId;
    interactionStore.setHover({ edgeId: typeof update === "function" ? update(current) : update });
  }, [interactionStore]);
  const [snapPreview, setSnapPreview] = useState<
    "left" | "right" | "max" | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);
  const [vpSize, setVpSize] = useState({ width: 960, height: 640 });
  const [hostDark, setHostDark] = useState(detectHostDark);
  const [sysReducedMotion, setSysReducedMotion] = useState(false);

  /* Dialogs & popovers state */
  const [launchDialog, setLaunchDialog] = useState<{
    plan: LaunchPlan;
    excluded: Set<string>;
  } | null>(null);
  const [paletteDialog, setPaletteDialog] = useState<{
    targetNodeId: string | null;
    query: string;
    index: number;
  } | null>(null);
  const [formModal, setFormModal] = useState<PromptDialogSpec | null>(null);
  const [sessionModal, setSessionModal] = useState<SessionBrief[] | null>(null);
  useEffect(() => {
    if (!sessionModal) sessionWireDrop.current = null;
  }, [sessionModal]);
  const [fileModal, setFileModal] = useState<WorkspaceFilePreview | null>(null);
  const [templatePreviewModal, setTemplatePreviewModal] =
    useState<WorkflowTemplate | null>(null);
  const [syncModal, setSyncModal] = useState<{
    groupId: string;
    plan: SyncPlan;
  } | null>(null);
  const [mergePortsModal, setMergePortsModal] = useState<{
    groupId: string;
    name: string;
    selectedPortIds: Set<string>;
  } | null>(null);
  const [exchangeModal, setExchangeModal] = useState<ExchangePair | null>(null);
  const [helpModal, setHelpModal] = useState(false);
  const [quickCreate, setQuickCreate] = useState<QuickCreateState | null>(null);
  const [teamPicker, setTeamPicker] = useState<{
    at?: { x: number; y: number };
  } | null>(null);
  const [workflowImport, setWorkflowImport] = useState<{
    request: WorkflowImportRequest;
    missing?: TeamModel[];
  }>();
  const [payloadPeek, setPayloadPeek] = useState<PayloadPeekState | null>(null);

  const vpSizeRef = useRef(vpSize);
  vpSizeRef.current = vpSize;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;
  const selectionNodeSet = useMemo(
    () => new Set(selection.nodes),
    [selection.nodes],
  );
  const connectSession = useMemo(
    () =>
      connecting
        ? {
            kind: connecting.kind,
            anchor: connecting.anchor,
            fromIds: connecting.fromIds,
          }
        : null,
    [connecting?.kind, connecting?.anchor, connecting?.fromIds],
  );

  const showToast = useCallback((msg: unknown, isError = false) => {
    const text = msg instanceof Error ? msg.message : String(msg);
    setToastState({ text, error: isError, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToastState((prev) => ({ ...prev, visible: false })),
      2800,
    );
  }, []);

  const reportError = useCallback(
    (err: unknown) => showToast(err, true),
    [showToast],
  );

  const onPresenceChange = useCallback(
    (sessionId: string, mounted: boolean) => {
      const prev = mountedSessionsRef.current.get(sessionId) ?? 0;
      if (mounted) mountedSessionsRef.current.set(sessionId, prev + 1);
      else if (prev <= 1) mountedSessionsRef.current.delete(sessionId);
      else mountedSessionsRef.current.set(sessionId, prev - 1);
      bridge.presence([...mountedSessionsRef.current.keys()]);
    },
    [bridge],
  );

  /* Host environment observers */
  useLayoutEffect(() => {
    const checkTheme = () => setHostDark(detectHostDark());
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    for (const el of [document.documentElement, document.body]) {
      obs.observe(el, { attributes: true, attributeFilter: HOST_THEME_ATTRS });
    }
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", checkTheme);
    return () => {
      obs.disconnect();
      scheme.removeEventListener("change", checkTheme);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSysReducedMotion(mq.matches);
    const onMq = () => setSysReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  const replayActive = Boolean(replayRun);
  useEffect(() => {
    if (replayActive) return;
    const vp = viewportRef.current;
    const root = rootRef.current;
    if (!vp || !root) return;
    const ro = new ResizeObserver(() => {
      setVpSize({
        width: vp.clientWidth || 960,
        height: vp.clientHeight || 640,
      });
      if (!sidebarAutoAdjusted.current && root.clientWidth > 0) {
        sidebarAutoAdjusted.current = true;
        if (root.clientWidth < 1040) setSidebarOpen(false);
      }
    });
    ro.observe(vp);
    ro.observe(root);
    return () => ro.disconnect();
  }, [replayActive]);

  const refreshProjectStructures = useCallback(() => {
    void bridge
      .projectStructures()
      .then(setProjectStructures)
      .catch(() => {});
  }, [bridge]);

  useEffect(() => bridge.connect(), [bridge]);
  useEffect(() => {
    void bridge
      .workspaces()
      .then((list) => {
        setWorkspaces(list);
        setActiveWorkspaceId(list[0]?.id ?? "");
      })
      .catch(reportError);
    refreshProjectStructures();
  }, [bridge, reportError, refreshProjectStructures]);

  useEffect(() => {
    for (const item of snapshot?.notices ?? []) {
      if (item.at < noticeSince.current || seenNotices.current.has(item.id))
        continue;
      seenNotices.current.add(item.id);
      if (renderNotice) setNotice(item);
      else showToast(`${item.title} · ${item.text}`);
      if (
        item.system &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(item.title, { body: item.text });
      }
      if (item.sound && typeof AudioContext !== "undefined") {
        const audio = new AudioContext();
        const tone = audio.createOscillator();
        const volume = audio.createGain();
        volume.gain.value = 0.06;
        tone.connect(volume).connect(audio.destination);
        tone.start();
        tone.stop(audio.currentTime + 0.15);
        tone.onended = () => {
          void audio.close();
        };
      }
    }
  }, [snapshot?.notices, showToast, renderNotice]);

  const activeWorkspaceCwd = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId)?.path,
    [workspaces, activeWorkspaceId],
  );

  useEffect(() => {
    void bridge
      .workspaceFiles(activeWorkspaceCwd)
      .then(setWorkspaceFilesList)
      .catch(() => setWorkspaceFilesList([]));
  }, [bridge, activeWorkspaceCwd]);

  /* Stage 1: Document state, Host snapshot reconciliation & save queue */
  const docState = useCanvasDocument({
    bridge,
    snapshot,
    replayLocked,
    reportError,
  });
  const {
    baseDoc,
    setDoc,
    doc,
    docRef,
    graphDocument,
    gesture,
    setGesture,
    gestureRef,
    rasterScene,
    contentIndex,
    groupPorts,
    nodesById,
    collapsed,
    membersOf,
    staffed,
    edgeIndex,
    branchScroll,
    onBranchScroll,
    writeByEdge,
    dataPreviews,
    previewHeights,
    endpointIndex,
    dirty,
    saveTimer,
    revision,
    saved,
    setSaved,
    history,
    setHistory,
    future,
    setFuture,
    flush,
    commitEdit,
    edit,
    applyConfig,
    prefs,
  } = docState;

  const effectiveTheme: "dark" | "light" =
    prefs.theme === "auto" ? (hostDark ? "dark" : "light") : prefs.theme;
  const reducedMotion = doc.settings.reducedMotion || sysReducedMotion;
  const view = doc.viewport;
  const lod = view.zoom < LOD_ZOOM;

  /* Stage 2: Viewport camera, cursor lens FX & wheel glide */
  const viewport = useCanvasViewport({
    interactionStore,
    rootRef,
    viewportRef,
    docRef,
    setDoc,
    revision,
    dirty,
    setSaved,
    saveTimer,
    flush,
    reportError,
    snapshot,
    view,
    vpSize,
    lod,
    rasterScene,
    reducedMotion,
    routeName,
    minimapOpen,
    wheelPref: prefs.wheel,
    replayActive,
  });

  /* Focus request from Native DSH ChatBadge */
  useEffect(() => {
    const focusId = bridge.takeFocus();
    if (!focusId) return;
    const n = docRef.current.nodes.find((x) => x.id === focusId);
    if (n) {
      setRouteName("canvas");
      setSelection({ nodes: [focusId], groups: [], edge: null });
      setInspectorOpen(true);
      if (n.kind === "agent") setLastAgentId(focusId);
      const box = nodeBox(n, false, true);
      setTimeout(() => viewport.fitBoxes([box]), 60);
    }
  }, [bridge, snapshot, viewport.fitBoxes, docRef]);

  /* Stage 3: Visibility, derived structures, child tree & base wire geometry */
  const scene = useCanvasScene({
    interactionStore,
    baseDoc,
    doc,
    graphDocument,
    snapshot,
    contentIndex,
    nodesById,
    collapsed,
    membersOf,
    endpointIndex,
    branchScroll,
    previewHeights,
    selection,
    editingNodeId,
    projectStructures,
    prefs,
    view,
    vpSize,
    lod,
    gesture,
  });
  const focusedCard = document.activeElement
    ?.closest("[data-node-card]")
    ?.getAttribute("data-node-card");

  /* Stage 4: Document actions, clipboard, undo, execution, templates, theme & import/export */
  const actions = useCanvasActions({
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
    visibleGroups: scene.visibleGroups,
    keepExpandedIds: scene.keepExpandedIds,
    derivedStructureCards: scene.derivedStructure.cards,
    isNodeVisible: scene.isNodeVisible,
    flush,
    commitEdit,
    edit,
    animateView: viewport.animateView,
    fitBoxes: viewport.fitBoxes,
    fitComfortably: viewport.fitComfortably,
    refreshProjectStructures,
    showToast,
    reportError,
  });

  /* Stage 5: Anchored context menus, QuickCreate & Command Palette */
  const menus = useCanvasMenus({
    doc,
    docRef,
    snapshot,
    bridge,
    viewportRef,
    sessionWireDrop,
    clipboardRef,
    pendingFocusRef,
    lod,
    keepExpandedIds: scene.keepExpandedIds,
    branchScroll,
    quickCreate,
    setQuickCreate,
    paletteDialog,
    workspaceFilesList,
    activeWorkspaceCwd,
    tidyLabel: actions.tidyLabel,
    setMenu,
    setPayloadPeek,
    setTeamPicker,
    setSessionModal,
    setFormModal,
    setSelection,
    setInspectorOpen,
    setRouteName,
    edit,
    editNode: actions.editNode,
    selectNode: actions.selectNode,
    revealNode: actions.revealNode,
    createCanvasNode: actions.createCanvasNode,
    connectNodes: actions.connectNodes,
    createBoardCompanion: actions.createBoardCompanion,
    insertFanout: actions.insertFanout,
    handleInstantiateTemplate: actions.handleInstantiateTemplate,
    openTeam,
    launchScope: actions.launchScope,
    runFromHere: actions.runFromHere,
    runToHere: actions.runToHere,
    forkHypothesis: actions.forkHypothesis,
    stopNode: actions.stopNode,
    toggleParticipation: actions.toggleParticipation,
    openDetailCard: actions.openDetailCard,
    selectPasteResult: actions.selectPasteResult,
    toggleNodeForm: actions.toggleNodeForm,
    returnWindow: actions.returnWindow,
    openWindow: actions.openWindow,
    arrangeTopology: actions.arrangeTopology,
    groupSelected: actions.groupSelected,
    fitView: actions.fitView,
    handleCaptureSnapshot: actions.handleCaptureSnapshot,
    handleSaveTemplateDialog: actions.handleSaveTemplateDialog,
    handleOpenSyncTemplate: actions.handleOpenSyncTemplate,
    handleSaveNewTemplateVersion: actions.handleSaveNewTemplateVersion,
    ungroup: actions.ungroup,
    showToast,
    reportError,
  });

  /* Stage 6: Pointer gestures, input fan-out hub, port/staff wiring & marquee */
  const gestures = useCanvasGestures({
    interactionStore,
    attachedEdges: scene.attachedEdges,
    areaRef,
    viewportRef,
    doc,
    docRef,
    snapshot,
    gestureRef,
    setGesture,
    viewAnimToken: viewport.viewAnimToken,
    wheelTargetRef: viewport.wheelTargetRef,
    pendingFocusRef,
    nodesById,
    groupPorts,
    endpointIndex,
    visibleGroups: scene.visibleGroups,
    keepExpandedIds: scene.keepExpandedIds,
    routingBoxes: scene.routingBoxes,
    baseWireLayouts: scene.baseWireLayouts,
    prefs,
    lod,
    reducedMotion,
    spacePressed,
    tool,
    selection,
    setSelection,
    setInspectorOpen,
    setHoveredEdgeId,
    setConnecting,
    connecting,
    setSnapPreview,
    setIsDragging,
    setHistory,
    setFuture,
    commitEdit,
    edit,
    setViewportDirect: viewport.setViewportDirect,
    isNodeVisible: scene.isNodeVisible,
    selectNode: actions.selectNode,
    openWindow: actions.openWindow,
    connectNodes: actions.connectNodes,
    createBoardCompanion: actions.createBoardCompanion,
    createCanvasNode: actions.createCanvasNode,
    insertFanout: actions.insertFanout,
    openQuickCreate: menus.openQuickCreate,
    openAnchoredMenu: menus.openAnchoredMenu,
    showToast,
  });

  /* Global keyboard shortcuts & utility effects */
  useCanvasShortcuts({
    replayLocked,
    rootRef,
    viewportRef,
    pointerRef,
    docRef,
    hasOpenDialog: Boolean(
      paletteDialog ||
        launchDialog ||
        formModal ||
        sessionModal ||
        fileModal ||
        templatePreviewModal ||
        syncModal ||
        mergePortsModal ||
        exchangeModal ||
        helpModal,
    ),
    hasKeyModal: Boolean(paletteDialog || launchDialog || helpModal),
    menu,
    quickCreateOpen: Boolean(quickCreate),
    payloadPeekOpen: Boolean(payloadPeek),
    routeName,
    vpSize,
    selection,
    setMenu,
    setPaletteDialog,
    setSpacePressed,
    setHelpModal,
    setTool,
    setSelection,
    openQuickCreate: menus.openQuickCreate,
    copySelection: actions.copySelection,
    pasteClipboard: actions.pasteClipboard,
    duplicateSelection: actions.duplicateSelection,
    selectAllVisible: actions.selectAllVisible,
    ungroup: actions.ungroup,
    toggleParticipation: actions.toggleParticipation,
    runSelection: actions.runSelection,
    performUndo: actions.performUndo,
    openWindow: actions.openWindow,
    fitView: actions.fitView,
    groupSelected: actions.groupSelected,
    openDetailCard: actions.openDetailCard,
    deleteSelection: actions.deleteSelection,
    isNodeVisible: scene.isNodeVisible,
    revealNode: actions.revealNode,
  });

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    const raf = requestAnimationFrame(() => {
      const card = rootRef.current?.querySelector<HTMLElement>(
        `[data-node-card="${CSS.escape(id)}"]`,
      );
      const field = card?.querySelector<HTMLTextAreaElement>(
        "textarea.task-editor, textarea.note-editor",
      );
      if (!field) return;
      pendingFocusRef.current = null;
      field.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [doc]);

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      pointerRef.current = { x: ev.clientX, y: ev.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!menu) return;
    if (menu.returnFocus) {
      rootRef.current
        ?.querySelector<HTMLElement>(
          '.fs-menu[role="menu"] > button:not(:disabled)',
        )
        ?.focus();
    }
    const onDown = (ev: PointerEvent) => {
      if (!(ev.target as HTMLElement | null)?.closest(".fs-menu")) {
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [menu]);

  /* Derived selection & team helpers */
  const wantsRoutes = useMemo(
    () => doc.nodes.some((n) => n.kind === "role" || !!n.teamConfig),
    [doc.nodes],
  );
  const modelRoutes = useModelRoutes(bridge, wantsRoutes);

  const selectedNode = useMemo(() => {
    if (selection.groups.length === 1) {
      return doc.nodes.find((n) => n.id === selection.groups[0]);
    }
    if (selection.nodes.length === 1) {
      return doc.nodes.find((n) => n.id === selection.nodes[0]);
    }
    return undefined;
  }, [doc.nodes, selection]);

  const selectedEdge = useMemo(
    () =>
      selection.edge
        ? doc.edges.find((e) => e.id === selection.edge)
        : undefined,
    [doc.edges, selection.edge],
  );

  const selectedNodesList = useMemo(() => {
    const ids = new Set([...selection.nodes, ...selection.groups]);
    return ids.size >= 2 ? doc.nodes.filter((n) => ids.has(n.id)) : undefined;
  }, [doc.nodes, selection.nodes, selection.groups]);

  const hasRunnableSelection = useMemo(() => {
    if (selection.groups.length > 0) return true;
    return selection.nodes.some(
      (id) => doc.nodes.find((n) => n.id === id)?.kind === "agent",
    );
  }, [selection, doc.nodes]);

  const conversationFocusAgent = useMemo(() => {
    const explicit = doc.nodes.find(
      (n) => n.id === lastAgentId && n.kind === "agent",
    );
    return explicit ?? doc.nodes.find((n) => n.kind === "agent");
  }, [doc.nodes, lastAgentId]);

  const openTeamNode = teamNodeId
    ? doc.nodes.find((node) => node.id === teamNodeId && isTeamNode(node, staffed))
    : undefined;
  const leftSnapped = doc.nodes.some((n) => n.window?.snap === "left");
  const rightSnapped = doc.nodes.some((n) => n.window?.snap === "right");

  const cardActions = useCardActions({
    editNode: actions.editNode,
    editEdge: actions.editEdge,
    edit,
    selectNode: actions.selectNode,
    showToast,
    openNodeContextMenu: menus.openNodeContextMenu,
    startNodeMove: gestures.startNodeMove,
    startResize: gestures.startResize,
    startPortDrag: gestures.startPortDrag,
    startInputEdgeDrag: gestures.startInputEdgeDrag,
    revealNode: actions.revealNode,
    openDetailCard: actions.openDetailCard,
    bindAgentSession: actions.bindAgentSession,
    refreshProjectStructures,
    openAnchoredMenu: menus.openAnchoredMenu,
    extractDisplayFrom: actions.extractDisplayFrom,
    launchScope: actions.launchScope,
    toggleNodeForm: actions.toggleNodeForm,
    stopNode: actions.stopNode,
    returnWindow: actions.returnWindow,
    openWindow: actions.openWindow,
    openInputHub: gestures.openInputHub,
    scheduleCloseInputHub: gestures.scheduleCloseInputHub,
    startStaffDrag: gestures.startStaffDrag,
    editBoard: actions.editBoard,
    createBoardCompanion: actions.createBoardCompanion,
    openBoardAgentMenu: menus.openBoardAgentMenu,
    openBoardMenu: menus.openBoardMenu,
  });

  const movingStaff =
    gesture?.nodes &&
    [...gesture.nodes.keys()].some(
      (id) => contentIndex.nodesById.get(id)?.staffOf,
    );
  const crewNodes = movingStaff ? doc.nodes : baseDoc.nodes;
  const staffDragSession = useMemo(
    () =>
      gestures.staffDrag
        ? {
            roleId: gestures.staffDrag.roleId,
            teamId: gestures.staffDrag.teamId,
          }
        : null,
    [gestures.staffDrag?.roleId, gestures.staffDrag?.teamId],
  );

  const renderNodeCard = useNodeCardRenderer({
    doc,
    docRef,
    areaRef,
    vpSizeRef,
    connectingRef,
    isDraggingRef,
    interactionStore,
    contentIndex,
    edgeIndex,
    crewNodes,
    staffed,
    cardActions,
    workspaces,
    projectStructures,
    activeWorkspaceId,
    workspaceFilesList,
    activeWorkspaceCwd,
    bridge,
    reportError,
    renderConversation,
    onPresenceChange,
    passesNodeFilter: scene.passesNodeFilter,
    connectSession,
    staffDragSession,
    modelRoutes,
    languageRevision,
    openTeam,
    setHoveredEdgeId,
    setEditingNodeId,
    setPaletteDialog,
    setPayloadPeek,
    setQuoteState,
    setFormModal,
    setFileInputDrafts,
    setFileModal,
  });

  if (replayRun) {
    return (
      <>
        {reducedMotion && reducedMotionStyles}
        <CanvasReplayView
          doc={doc}
          snapshot={snapshot}
          replayRun={replayRun}
          replayTime={replayTime}
          setReplayTime={setReplayTime}
          onExit={() => setReplayRun(undefined)}
          displayedTheme={actions.displayedTheme}
          reducedMotion={reducedMotion}
          vpSize={vpSize}
          renderNodeCard={renderNodeCard}
        />
      </>
    );
  }

  return (
    <CanvasInteractionContext.Provider value={interactionStore}>
    <CanvasPreviewContext.Provider value={dataPreviews}>
      <div
        ref={rootRef}
        className="fs-root"
        data-theme={actions.displayedTheme}
        data-perf-tier={reducedMotion ? "L1" : "L3"}
      >
        {reducedMotion && reducedMotionStyles}
        {notice && renderNotice?.(notice, () => setNotice(undefined))}
        <CanvasSidebar
          baseDoc={baseDoc}
          doc={doc}
          snapshot={snapshot}
          workspaces={workspaces}
          routeName={routeName}
          setRouteName={setRouteName}
          sidebarOpen={sidebarOpen}
          mobileSidebar={mobileSidebar}
          saved={saved}
          prefs={prefs}
          selection={selection}
          conversationFocusAgent={conversationFocusAgent}
          waitingAgentNodes={scene.waitingAgentNodes}
          gestureRef={gestureRef}
          languageRevision={languageRevision}
          passesNodeFilter={scene.passesNodeFilter}
          setLastAgentId={setLastAgentId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          setPaletteDialog={setPaletteDialog}
          setHelpModal={setHelpModal}
          setVariablePanel={setVariablePanel}
          revealNode={cardActions.revealNode}
          focusGroup={actions.focusGroup}
          fitBoxes={viewport.fitBoxes}
          edit={edit}
          openAddMenu={menus.openAddMenu}
          handleExportJson={actions.handleExportJson}
        />

        <div className="fs-main">
          <CanvasTopBar
            rootRef={rootRef}
            doc={doc}
            snapshot={snapshot}
            routeName={routeName}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            setActiveWorkspaceId={setActiveWorkspaceId}
            waitingAgentNodes={scene.waitingAgentNodes}
            displayedTheme={actions.displayedTheme}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            setMobileSidebar={setMobileSidebar}
            inspectorOpen={inspectorOpen}
            setInspectorOpen={setInspectorOpen}
            hasRunnableSelection={hasRunnableSelection}
            selection={selection}
            setFormModal={setFormModal}
            edit={edit}
            openAnchoredMenu={menus.openAnchoredMenu}
            revealNode={actions.revealNode}
            toggleTheme={actions.toggleTheme}
            handleCaptureSnapshot={actions.handleCaptureSnapshot}
            launchScope={actions.launchScope}
          />

          <div className="fs-content-row">
            <div
              className={`fs-canvas-column ${leftSnapped ? "has-left-window" : ""} ${rightSnapped ? "has-right-window" : ""}`}
            >
              {routeName === "canvas" && (
                <CanvasToolbar
                  docTitle={doc.title}
                  prefs={prefs}
                  tidyLabel={actions.tidyLabel}
                  edit={edit}
                  openAnchoredMenu={menus.openAnchoredMenu}
                  openAddMenu={menus.openAddMenu}
                  groupSelected={actions.groupSelected}
                  arrangeTopology={() => actions.arrangeTopology()}
                  setPaletteDialog={setPaletteDialog}
                />
              )}

              <div
                ref={areaRef}
                className={`fs-canvas-area ${leftSnapped ? "has-left-window" : ""} ${rightSnapped ? "has-right-window" : ""}`}
              >
                <CanvasWorld
                  doc={doc}
                  docRef={docRef}
                  snapshot={snapshot}
                  bridge={bridge}
                  routeName={routeName}
                  setRouteName={setRouteName}
                  prefs={prefs}
                  displayedTheme={actions.displayedTheme}
                  reducedMotion={reducedMotion}
                  view={view}
                  vpSize={vpSize}
                  lod={lod}
                  languageRevision={languageRevision}
                  paintArea={viewport.paintArea}
                  wireViewport={scene.wireViewport}
                  rasterScene={rasterScene}
                  tool={tool}
                  setTool={setTool}
                  spacePressed={spacePressed}
                  isDragging={isDragging}
                  minimapOpen={minimapOpen}
                  setMinimapOpen={setMinimapOpen}
                  snapPreview={snapPreview}
                  historyCount={history.length}
                  futureCount={future.length}
                  viewportRef={viewportRef}
                  gridRef={viewport.gridRef}
                  cursorFxRef={viewport.cursorFxRef}
                  cursorHaloRef={viewport.cursorHaloRef}
                  cursorLensRef={viewport.cursorLensRef}
                  lensGridRef={viewport.lensGridRef}
                  cameraRef={viewport.cameraRef}
                  worldRef={viewport.worldRef}
                  groupsLayerRef={viewport.groupsLayerRef}
                  zoomLabelRef={viewport.zoomLabelRef}
                  miniViewportRef={viewport.miniViewportRef}
                  miniFrameRef={viewport.miniFrameRef}
                  viewAnimToken={viewport.viewAnimToken}
                  wheelTargetRef={viewport.wheelTargetRef}
                  preClickSelectionRef={preClickSelectionRef}
                  pendingFocusRef={pendingFocusRef}
                  selection={selection}
                  setSelection={setSelection}
                  selectionNodeSet={selectionNodeSet}
                  selectedStructureId={selectedStructureId}
                  setSelectedStructureId={setSelectedStructureId}
                  editingNodeId={editingNodeId}
                  focusedCard={focusedCard}
                  setHoveredEdgeId={setHoveredEdgeId}
                  connecting={connecting}
                  gesture={gesture}
                  contentIndex={contentIndex}
                  nodesById={nodesById}
                  membersOf={membersOf}
                  groupPorts={groupPorts}
                  edgeIndex={edgeIndex}
                  writeByEdge={writeByEdge}
                  visibleGroups={scene.visibleGroups}
                  sceneNodes={scene.sceneNodes}
                  minimapBoxes={scene.minimapBoxes}
                  keepExpandedIds={scene.keepExpandedIds}
                  waitingAgentNodes={scene.waitingAgentNodes}
                  cardBoxes={scene.cardBoxes}
                  branchScroll={branchScroll}
                  onBranchScroll={onBranchScroll}
                  fileInputDrafts={fileInputDrafts}
                  quoteState={quoteState}
                  derivedStructure={scene.derivedStructure}
                  childTree={scene.childTree}
                  wireScene={scene.wireScene}
                  wireLayouts={gestures.wireLayouts}
                  accessoryWires={scene.accessoryWires}
                  exchanges={scene.exchanges}
                  routingBoxes={scene.routingBoxes}
                  routingBoxesById={scene.routingBoxesById}
                  activeHubLayout={gestures.activeHubLayout}
                  staffWires={gestures.staffWires}
                  staffDrag={gestures.staffDrag}
                  staffTip={gestures.staffTip}
                  staffTarget={gestures.staffTarget}
                  isNodeVisible={scene.isNodeVisible}
                  edgeVisualState={scene.edgeVisualState}
                  renderNodeCard={renderNodeCard}
                  edit={edit}
                  editNode={actions.editNode}
                  editEdge={actions.editEdge}
                  createCanvasNode={actions.createCanvasNode}
                  startPan={gestures.startPan}
                  startNodeMove={gestures.startNodeMove}
                  selectNode={actions.selectNode}
                  toggleNodeForm={actions.toggleNodeForm}
                  stopNode={actions.stopNode}
                  openNodeContextMenu={menus.openNodeContextMenu}
                  startMarquee={gestures.startMarquee}
                  startGroupMove={gestures.startGroupMove}
                  startResize={gestures.startResize}
                  startPortDrag={gestures.startPortDrag}
                  startInputEdgeDrag={gestures.startInputEdgeDrag}
                  startWaypointDrag={gestures.startWaypointDrag}
                  trackPointer={gestures.trackPointer}
                  openQuickCreate={menus.openQuickCreate}
                  openGroupContextMenu={menus.openGroupContextMenu}
                  openAnchoredMenu={menus.openAnchoredMenu}
                  openInputHub={gestures.openInputHub}
                  scheduleCloseInputHub={gestures.scheduleCloseInputHub}
                  insertFanout={actions.insertFanout}
                  launchScope={actions.launchScope}
                  revealNode={actions.revealNode}
                  returnWindow={actions.returnWindow}
                  openTeam={openTeam}
                  animateView={viewport.animateView}
                  fitView={actions.fitView}
                  performUndo={actions.performUndo}
                  loadStarter={actions.loadStarter}
                  handleInstantiateTemplate={actions.handleInstantiateTemplate}
                  reportError={reportError}
                  setInspectorOpen={setInspectorOpen}
                  setPayloadPeek={setPayloadPeek}
                  setExchangeModal={setExchangeModal}
                  setSessionModal={setSessionModal}
                  setHelpModal={setHelpModal}
                />

                <CanvasRouteSurfaces
                  routeName={routeName}
                  setRouteName={setRouteName}
                  doc={doc}
                  snapshot={snapshot}
                  bridge={bridge}
                  prefs={prefs}
                  lod={lod}
                  openTeamNode={openTeamNode}
                  teamFocus={teamFocus}
                  libraryTab={libraryTab}
                  setLibraryTab={setLibraryTab}
                  activityTab={activityTab}
                  setActivityTab={setActivityTab}
                  conversationFocusAgent={conversationFocusAgent}
                  selectionNodeSet={selectionNodeSet}
                  quoteState={quoteState}
                  importInputRef={importInputRef}
                  viewAnimToken={viewport.viewAnimToken}
                  cardBoxes={scene.cardBoxes}
                  renderNodeCard={renderNodeCard}
                  renderConversation={renderConversation}
                  onPresenceChange={onPresenceChange}
                  bindAgentSession={actions.bindAgentSession}
                  createCanvasNode={actions.createCanvasNode}
                  openAnchoredMenu={menus.openAnchoredMenu}
                  edit={edit}
                  updatePrefs={actions.updatePrefs}
                  handleInstantiateTemplate={actions.handleInstantiateTemplate}
                  handleExportTemplate={actions.handleExportTemplate}
                  handleExportJson={actions.handleExportJson}
                  handleRestoreSnapshot={actions.handleRestoreSnapshot}
                  loadStarter={actions.loadStarter}
                  revealNode={actions.revealNode}
                  extractDisplayFrom={actions.extractDisplayFrom}
                  pinDeliverable={actions.pinDeliverable}
                  reportError={reportError}
                  setLastAgentId={setLastAgentId}
                  setTemplatePreviewModal={setTemplatePreviewModal}
                  setReplayTime={setReplayTime}
                  setReplayRun={setReplayRun}
                  setReportRun={setReportRun}
                  setArenaOpen={setArenaOpen}
                  setBatchHumanId={setBatchHumanId}
                  setSessionModal={setSessionModal}
                />
              </div>
            </div>

            <InspectorPanel
              open={inspectorOpen && routeName === "canvas"}
              doc={doc}
              snapshot={snapshot}
              workspaces={workspaces}
              bridge={bridge}
              selectedNode={selectedNode}
              selectedNodes={selectedNodesList}
              selectedEdge={selectedEdge}
              onClose={() => setInspectorOpen(false)}
              onExtendLoop={actions.extendLoop}
              onAlign={actions.alignSelection}
              onDistribute={actions.distributeSelection}
              onGroupSelected={actions.groupSelected}
              onDuplicateSelected={() => void actions.duplicateSelection()}
              onBatchParticipation={actions.setBatchParticipation}
              onRunSelection={actions.runSelection}
              onRunFromHere={actions.runFromHere}
              onRunToHere={actions.runToHere}
              onForkHypothesis={actions.forkHypothesis}
              onStopNode={actions.stopNode}
              onEditNode={actions.editNode}
              onEditEdge={actions.editEdge}
              onApplyConfig={applyConfig}
              onDeleteSelection={actions.deleteSelection}
              onInsertFanout={(id) => actions.insertFanout(undefined, null, id)}
              onUngroup={actions.ungroup}
              onReleaseToken={(runId, tokenId, accept) =>
                void bridge.release(runId, tokenId, accept).catch(reportError)
              }
              onOpenNativeChat={(sid) => bridge.openChat(sid)}
              onOpenDetail={actions.openDetailCard}
              onOpenWindow={actions.openWindow}
              onSetGroupPorts={(gid, ports) => actions.editNode(gid, { ports })}
              onOpenMergePorts={(gid) =>
                setMergePortsModal({
                  groupId: gid,
                  name: t("inputPort"),
                  selectedPortIds: new Set(),
                })
              }
              onSaveTemplate={actions.handleSaveTemplateDialog}
              onSyncTemplate={actions.handleOpenSyncTemplate}
              onDetachTemplate={(gid) =>
                actions.editNode(gid, {
                  templateId: undefined,
                  templateRevision: undefined,
                })
              }
            />
          </div>

          {(routeName === "canvas" || routeName === "conversation") && (
            <CanvasBottomDrawer
              doc={doc}
              snapshot={snapshot}
              bridge={bridge}
              bottomOpen={bottomOpen}
              setBottomOpen={setBottomOpen}
              bottomTab={bottomTab}
              setBottomTab={setBottomTab}
              setRouteName={setRouteName}
              revealNode={actions.revealNode}
              extendLoop={actions.extendLoop}
              extractDisplayFrom={actions.extractDisplayFrom}
              pinDeliverable={actions.pinDeliverable}
              reportError={reportError}
            />
          )}
        </div>

        <CanvasOverlays
          doc={doc}
          snapshot={snapshot}
          bridge={bridge}
          modelRoutes={modelRoutes}
          quickCreate={quickCreate}
          setQuickCreate={setQuickCreate}
          handleQuickCreateSelect={menus.handleQuickCreateSelect}
          variablePanel={variablePanel}
          setVariablePanel={setVariablePanel}
          arenaOpen={arenaOpen}
          setArenaOpen={setArenaOpen}
          batchHumanRun={batchHumanRun}
          setBatchHumanId={setBatchHumanId}
          reportRun={reportRun}
          setReportRun={setReportRun}
          teamPicker={teamPicker}
          setTeamPicker={setTeamPicker}
          workflowImport={workflowImport}
          setWorkflowImport={setWorkflowImport}
          finishImport={actions.finishImport}
          payloadPeek={payloadPeek}
          setPayloadPeek={setPayloadPeek}
          menu={menu}
          setMenu={setMenu}
          pendingFocusRef={pendingFocusRef}
          createCanvasNode={actions.createCanvasNode}
          setLibraryTab={setLibraryTab}
          setRouteName={setRouteName}
          setSelection={setSelection}
          setInspectorOpen={setInspectorOpen}
        />

        <CanvasDialogsHost
          doc={doc}
          snapshot={snapshot}
          bridge={bridge}
          prefs={prefs}
          activeWorkspaceId={activeWorkspaceId}
          activeWorkspaceCwd={activeWorkspaceCwd}
          paletteDialog={paletteDialog}
          setPaletteDialog={setPaletteDialog}
          paletteEntries={menus.paletteEntries}
          launchDialog={launchDialog}
          setLaunchDialog={setLaunchDialog}
          formModal={formModal}
          setFormModal={setFormModal}
          sessionModal={sessionModal}
          setSessionModal={setSessionModal}
          sessionWireDrop={sessionWireDrop}
          fileModal={fileModal}
          setFileModal={setFileModal}
          templatePreviewModal={templatePreviewModal}
          setTemplatePreviewModal={setTemplatePreviewModal}
          syncModal={syncModal}
          setSyncModal={setSyncModal}
          mergePortsModal={mergePortsModal}
          setMergePortsModal={setMergePortsModal}
          exchangeModal={exchangeModal}
          setExchangeModal={setExchangeModal}
          helpModal={helpModal}
          setHelpModal={setHelpModal}
          isNodeVisible={scene.isNodeVisible}
          edit={edit}
          editNode={actions.editNode}
          revealNode={actions.revealNode}
          setBottomOpen={setBottomOpen}
          reportError={reportError}
          showToast={showToast}
          handleInstantiateTemplate={actions.handleInstantiateTemplate}
          extractDisplayFrom={actions.extractDisplayFrom}
        />

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) void actions.handleImportFile(f);
            ev.target.value = "";
          }}
        />

        <div
          role="status"
          aria-live="polite"
          className={`fs-toast ${toastState.visible ? "visible" : ""} ${toastState.error ? "is-error" : ""}`}
        >
          {toastState.text}
        </div>
      </div>
    </CanvasPreviewContext.Provider>
    </CanvasInteractionContext.Provider>
  );
}
