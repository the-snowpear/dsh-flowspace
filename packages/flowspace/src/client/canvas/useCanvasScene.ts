import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  GroupPort,
  WorkspaceStructureBrief,
} from "../../types.ts";
import { buildChildTree } from "../childTree.ts";
import {
  canvasItemBox,
  capsuleStateOf,
  endpoint,
  expandedGroupBox,
  nodeBox,
  type Box,
} from "../geometry.ts";
import {
  runtimeIndex,
  viewportBox,
  type GeometryEdit,
} from "../sceneModel.ts";
import { edgeRouteTask, groupExchanges, SceneWires, type EdgeRouteTask, type ExchangePair } from "../sceneWires.ts";
import { WireWorker } from "../wireWorker.ts";
import { buildDerivedStructure } from "../structure.ts";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import type { ResolvedCanvasPrefs, SelectionState } from "./canvasTypes.ts";
import type { WireLayout } from "./ViewportCard.tsx";
import type { CanvasInteractionStore } from "./interactionStore.ts";

export interface UseCanvasSceneOptions {
  interactionStore: CanvasInteractionStore;
  baseDoc: FlowspaceDocument;
  doc: FlowspaceDocument;
  graphDocument: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  contentIndex: {
    nodesById: Map<string, FlowNode>;
    collapsed: Map<string, FlowNode | undefined>;
    referenceSources: Set<string>;
  };
  nodesById: Map<string, FlowNode>;
  collapsed: Map<string, FlowNode | undefined>;
  membersOf: (groupId: string) => FlowNode[];
  endpointIndex: {
    nodes: Map<string, FlowNode>;
    ancestors: Map<string, FlowNode | undefined>;
    ports: Map<string, GroupPort[]>;
    branchScroll: Map<string, number>;
    previewHeights: Map<string, number>;
  };
  branchScroll: Map<string, number>;
  previewHeights: Map<string, number>;
  selection: SelectionState;
  editingNodeId: string | null;
  projectStructures: WorkspaceStructureBrief[];
  prefs: ResolvedCanvasPrefs;
  view: FlowspaceDocument["viewport"];
  vpSize: { width: number; height: number };
  lod: boolean;
  gesture: GeometryEdit | null;
}

export function useCanvasScene({
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
}: UseCanvasSceneOptions) {
  const runtime = runtimeIndex(snapshot);

  const filterSnapshot = ["all", "auto"].includes(prefs.filter) ? null : snapshot;
  const passesNodeFilter = useCallback(
    (node: FlowNode | undefined): boolean => {
      if (!node || node.kind === "group") return false;
      const wsKey = node.workspaceId || "__default__";
      if (prefs.hiddenWorkspaces.includes(wsKey)) return false;
      if (node.kind === "agent" && prefs.filter !== "all") {
        const filterRuntime = runtimeIndex(filterSnapshot);
        const st = nodeStatusOf(filterSnapshot, node.id);
        const active = [
          "running",
          "settling",
          "waiting",
          "queued",
          "input",
        ].includes(st);
        if (prefs.filter === "running") return active;
        const liveItem = filterRuntime.live.get(node.id);
        const lastStepAt = filterRuntime.steps.get(node.id)?.at(-1)?.createdAt ?? 0;
        const updatedAt = Math.max(liveItem?.updatedAt ?? 0, lastStepAt);
        if (prefs.filter === "3d") {
          return (
            active ||
            !node.sessionId ||
            updatedAt === 0 ||
            Date.now() - updatedAt <= 3 * 86_400_000
          );
        }
        if (prefs.filter === "7d") {
          return (
            active ||
            !node.sessionId ||
            updatedAt === 0 ||
            Date.now() - updatedAt <= 7 * 86_400_000
          );
        }
      }
      return true;
    },
    [prefs.hiddenWorkspaces, prefs.filter, filterSnapshot],
  );

  const isNodeVisible = useCallback(
    (node: FlowNode | undefined, ignoreCollapse = false) =>
      !!node &&
      passesNodeFilter(node) &&
      (ignoreCollapse || !collapsed.get(node.id)),
    [passesNodeFilter, collapsed],
  );

  const visibleGroups = useMemo(
    () =>
      doc.nodes.filter((g) => {
        if (g.kind !== "group") return false;
        if (g.parentId) {
          const parent = nodesById.get(g.parentId);
          if (parent?.collapsed) return false;
        }
        const groupMembers = membersOf(g.id);
        return (
          !groupMembers.length ||
          groupMembers.some((node) => isNodeVisible(node, true))
        );
      }),
    [doc.nodes, nodesById, membersOf, isNodeVisible],
  );

  const previousExpanded = useRef(new Set<string>());
  const keepExpandedIds = useMemo(() => {
    const ids = new Set<string>(selection.nodes.filter(id => nodesById.get(id)?.expanded));
    if (editingNodeId) ids.add(editingNodeId);
    const runtime = runtimeIndex(snapshot);
    for (const n of doc.nodes) {
      if (n.kind !== "agent" && n.kind !== "flow") continue;
      const st = nodeStatusOf(snapshot, n.id);
      if (st === "waiting" || st === "input" || runtime.awaiting.has(n.id) || runtime.breakpoints.has(n.id)) ids.add(n.id);
    }
    if (
      ids.size === previousExpanded.current.size &&
      [...ids].every((id) => previousExpanded.current.has(id))
    ) {
      return previousExpanded.current;
    }
    previousExpanded.current = ids;
    return ids;
  }, [selection.nodes, editingNodeId, doc.nodes, nodesById, snapshot]);

  const cardBoxes = useMemo(() => {
    const cache = new WeakMap<FlowNode, [Box, Box]>();
    return (node: FlowNode) => {
      const stored = cache.get(node);
      if (stored) return stored;
      const expanded = Boolean(node.window) || keepExpandedIds.has(node.id);
      const previewHeight = previewHeights.get(node.id);
      const full = nodeBox(node, false, expanded, previewHeight);
      const compact = nodeBox(node, true, expanded, previewHeight);
      const boxes: [Box, Box] = [
        full,
        full.compact === compact.compact ? full : compact,
      ];
      cache.set(node, boxes);
      return boxes;
    };
  }, [keepExpandedIds, previewHeights]);

  const visibleNodes = useMemo(
    () => doc.nodes.filter((n) => isNodeVisible(n)),
    [doc.nodes, isNodeVisible],
  );
  const sceneNodes = useMemo(
    () => visibleNodes.map((n) => ({ n, b: cardBoxes(n)[Number(lod)] })),
    [visibleNodes, cardBoxes, lod],
  );
  const minimapBoxes = useMemo(
    () => baseDoc.nodes.filter((n) => passesNodeFilter(n) && !contentIndex.collapsed.get(n.id))
      .map((n) => ({ n, b: cardBoxes(n)[Number(lod)] })),
    [baseDoc.nodes, passesNodeFilter, contentIndex.collapsed, cardBoxes, lod],
  );

  const waitingAgentNodes = useMemo(
    () =>
      doc.nodes.filter((n) => {
        if (n.kind !== "agent" && n.kind !== "flow") return false;
        const st = nodeStatusOf(snapshot, n.id);
        return st === "waiting" || st === "input";
      }),
    [doc.nodes, snapshot],
  );

  const derivedStructure = useMemo(() => {
    const runningIds = new Set(
      doc.nodes
        .filter(
          (n) =>
            n.kind === "agent" &&
            ["running", "settling"].includes(nodeStatusOf(snapshot, n.id)),
        )
        .map((n) => n.id),
    );
    const waitingIds = new Set(waitingAgentNodes.map((n) => n.id));
    return buildDerivedStructure({
      projects: projectStructures,
      hiddenWorkspaces: prefs.hiddenWorkspaces,
      showBranches: prefs.showBranches,
      showWorktrees: prefs.showWorktrees,
      visibleNodes,
      visibleGroupBoxes: visibleGroups.map((group) =>
        canvasItemBox(graphDocument, group),
      ),
      lod,
      keepExpandedIds,
      runningNodeIds: runningIds,
      waitingNodeIds: waitingIds,
    });
  }, [
    graphDocument,
    visibleNodes,
    visibleGroups,
    snapshot,
    waitingAgentNodes,
    projectStructures,
    prefs.hiddenWorkspaces,
    prefs.showBranches,
    prefs.showWorktrees,
    lod,
    keepExpandedIds,
  ]);

  const childTree = useMemo(
    () =>
      buildChildTree({
        nodes: doc.nodes.filter((n) => isNodeVisible(n)),
        allNodes: doc.nodes,
        box: (n) => nodeBox(n, lod, keepExpandedIds.has(n.id)),
        obstacles: [
          ...visibleGroups
            .filter((group) => group.collapsed)
            .map((group) => canvasItemBox(graphDocument, group)),
          ...derivedStructure.cards.map((card) => card.box),
        ],
        subagents: snapshot?.subagents ?? [],
        teams: snapshot?.teams,
      }),
    [
      graphDocument,
      isNodeVisible,
      visibleGroups,
      derivedStructure.cards,
      lod,
      keepExpandedIds,
      snapshot?.subagents,
      snapshot?.teams,
    ],
  );

  const exchanges = useMemo<ExchangePair[]>(() => {
    const teams = new Map<string, string>();
    for (const team of Object.values(snapshot?.teams ?? {})) {
      for (const member of team.members) teams.set(member.sessionId, team.nodeId);
    }
    const nodeIdForSession = (sid: string): string | undefined => {
      const direct = doc.nodes.find((n) => n.sessionId === sid)?.id;
      if (direct) return direct;
      if (teams.has(sid)) return teams.get(sid);
      const sub = snapshot?.subagents?.find((s) => s.sessionId === sid);
      if (sub) {
        return doc.nodes.find((n) => n.sessionId === sub.parentSessionId)?.id;
      }
      return undefined;
    };
    return groupExchanges(
      snapshot?.nativeMessages ?? [],
      nodeIdForSession,
    ).filter(
      (ex) =>
        ex.items.length > 0 &&
        isNodeVisible(
          doc.nodes.find((n) => n.id === ex.from),
          true,
        ) &&
        isNodeVisible(
          doc.nodes.find((n) => n.id === ex.to),
          true,
        ),
    );
  }, [
    snapshot?.nativeMessages,
    snapshot?.subagents,
    snapshot?.teams,
    doc.nodes,
    isNodeVisible,
  ]);

  const routingBoxesById = useMemo(() => {
    const boxes = new Map(sceneNodes.map(({ n, b }) => [n.id, b]));
    for (const group of visibleGroups) {
      if (group.collapsed) boxes.set(group.id, expandedGroupBox(graphDocument, group));
    }
    for (const card of derivedStructure.cards) boxes.set(card.id, card.box);
    return boxes;
  }, [graphDocument, sceneNodes, visibleGroups, derivedStructure.cards]);
  const routingBoxes = useMemo(() => [...routingBoxesById.values()], [routingBoxesById]);

  const wireViewport = useMemo(() => viewportBox(view, vpSize), [view, vpSize]);

  const edgeVisualState = useCallback(
    (edge: FlowEdge): string => {
      if (edge.kind === "reference") {
        return capsuleStateOf(edge, snapshot?.sourceVersions);
      }
      if (runtime.latestToken.get(edge.id)?.skip) return "skipped";
      if (
        contentIndex.nodesById.get(edge.target)?.participation === "bypassed"
      ) {
        return "bypassed";
      }
      const activeTokens = runtime.tokens.get(edge.id) ?? [];
      if (
        activeTokens.some(
          (tk) => !tk.ready && !tk.consumed && !tk.dismissed && tk.boundary,
        )
      )
        return "boundary";
      if (
        activeTokens.some(
          (tk) => !tk.ready && !tk.consumed && !tk.dismissed && !tk.boundary,
        )
      )
        return "waiting";
      if (activeTokens.some((tk) => tk.ready && !tk.consumed)) return "queued";
      const targetState = nodeStatusOf(snapshot, edge.target);
      if (targetState === "running" && runtime.runningConsumed.has(edge.id))
        return "active";
      if (runtime.consumed.has(edge.id)) return "done";
      return "idle";
    },
    [snapshot, contentIndex, runtime],
  );

  const wireCaches = useMemo(() => [new SceneWires(), new SceneWires()], []);
  const pathIds = useMemo(() => {
    const ids = new Set(derivedStructure.links.map((link) => link.id));
    for (const node of baseDoc.nodes) {
      if (node.kind === "detail" || node.kind === "display") {
        ids.add(`source:${node.id}`);
      }
    }
    return ids;
  }, [derivedStructure.links, baseDoc.nodes]);

  const wireScene = useMemo(() => {
    const cache = wireCaches[Number(lod)];
    const invalid = cache.update(routingBoxes, doc.edges, pathIds);
    return { cache, invalid };
  }, [wireCaches, lod, routingBoxes, doc.edges, pathIds]);

  const wirePlan = useMemo(() => {
    const attached = new Map<string, Set<string>>();
    const edges = new Map<string, { edge: FlowEdge; evState: string }>();
    const { nodesById: contentNodesById, collapsed: contentCollapsed } =
      contentIndex;
    for (const edge of doc.edges) {
      if (
        !passesNodeFilter(contentNodesById.get(edge.source)) ||
        !passesNodeFilter(contentNodesById.get(edge.target))
      )
        continue;
      const evState = edgeVisualState(edge);
      if (
        lod &&
        edge.kind === "reference" &&
        selection.edge !== edge.id &&
        !selection.nodes.includes(edge.source) &&
        !selection.nodes.includes(edge.target) &&
        !["active", "queued", "waiting", "boundary", "skipped"].includes(evState)
      )
        continue;
      const sourceGroup = contentCollapsed.get(edge.source)?.id;
      const targetGroup = contentCollapsed.get(edge.target)?.id;
      if (sourceGroup && sourceGroup === targetGroup) continue;
      for (const id of [
        sourceGroup ?? edge.source,
        targetGroup ?? edge.target,
      ]) {
        let ids = attached.get(id);
        if (!ids) {
          ids = new Set();
          attached.set(id, ids);
        }
        ids.add(edge.id);
      }
      edges.set(edge.id, { edge, evState });
    }
    return { edges, attached };
  }, [
    doc.edges,
    contentIndex,
    passesNodeFilter,
    edgeVisualState,
    lod,
    selection.edge,
    selection.nodes,
  ]);

  const edgeLayouts = useRef<
    {
      plan: typeof wirePlan;
      scroll: typeof branchScroll;
      expanded: Set<string>;
      mode: typeof prefs.wireRouting;
      deferred: boolean;
      routeRefresh: number;
      pending: EdgeRouteTask[];
      moves?: GeometryEdit["nodes"];
      byId: Map<string, WireLayout>;
      layouts: WireLayout[];
    }[]
  >([]);
  const routeWorker = useMemo(() => new WireWorker(), []);
  const [useWorker, setUseWorker] = useState(() => typeof Worker !== "undefined");
  const [routeRefresh, setRouteRefresh] = useState(0);
  const pendingEdgesRef = useRef<{ sig: string; tasks: EdgeRouteTask[] }>({ sig: "", tasks: [] });
  const deferred = prefs.wireRouting === "avoid" && useWorker;
  useEffect(() => () => routeWorker.dispose(), [routeWorker]);

  const layoutResult = useMemo(() => {
    const key = Number(lod);
    const previous = edgeLayouts.current[key];
    const reused =
      previous?.plan === wirePlan &&
      previous.expanded === keepExpandedIds &&
      previous.mode === prefs.wireRouting &&
      previous.deferred === deferred &&
      previous.routeRefresh === routeRefresh;
    const changed = new Set(wireScene.invalid);
    if (reused) {
      if (previous.scroll !== branchScroll) {
        for (const id of new Set([
          ...previous.scroll.keys(),
          ...branchScroll.keys(),
        ])) {
          if (previous.scroll.get(id) !== branchScroll.get(id)) {
            for (const edge of wirePlan.attached.get(id) ?? []) changed.add(edge);
          }
        }
      }
      for (const moves of [previous.moves, gesture?.nodes]) {
        for (const id of moves?.keys() ?? []) {
          if (previous.moves?.get(id) === gesture?.nodes?.get(id)) continue;
          for (const edge of wirePlan.attached.get(id) ?? []) changed.add(edge);
        }
      }
      if (!changed.size) return { layouts: previous.layouts, pending: previous.pending };
    }
    const layoutsById = reused
      ? new Map(previous.byId)
      : new Map<string, WireLayout>();
    const tasks = new Map(reused ? previous.pending.map(task => [task.id, task]) : []);
    for (const id of reused ? changed : wirePlan.edges.keys()) {
      const item = wirePlan.edges.get(id);
      if (!item) continue;
      const { edge, evState } = item;
      const from = endpoint(
        graphDocument,
        edge.source,
        edge.kind,
        "out",
        lod,
        keepExpandedIds,
        endpointIndex,
        edge.sourcePort,
      );
      const to = endpoint(
        graphDocument,
        edge.target,
        edge.kind,
        "in",
        lod,
        keepExpandedIds,
        endpointIndex,
        edge.targetPort,
      );
      const task = deferred ? edgeRouteTask(edge, from, to, "avoid") : undefined;
      const routed = task && wireScene.cache.lookupEdge(task);
      if (task && !routed) tasks.set(id, task);
      else tasks.delete(id);
      const { geom, extent } = routed ?? wireScene.cache.get(edge, from, to, deferred ? "overlap" : prefs.wireRouting);
      const old = previous?.byId.get(id);
      layoutsById.set(id, old?.edge === edge && old.geom === geom && old.evState === evState
        ? old : { edge, from, to, geom, extent, evState });
    }
    const layouts = Array.from(
      wirePlan.edges.keys(),
      (id) => layoutsById.get(id)!,
    );
    const rawPending = [...tasks.values()];
    const pendingSig = rawPending.map(task => `${task.id}=${task.key}`).join("|");
    const pending = pendingSig === pendingEdgesRef.current.sig ? pendingEdgesRef.current.tasks : rawPending;
    pendingEdgesRef.current = { sig: pendingSig, tasks: pending };
    edgeLayouts.current[key] = {
      plan: wirePlan,
      scroll: branchScroll,
      expanded: keepExpandedIds,
      mode: prefs.wireRouting,
      deferred,
      routeRefresh,
      pending,
      moves: gesture?.nodes,
      byId: layoutsById,
      layouts,
    };
    return { layouts, pending };
  }, [
    wirePlan,
    wireScene,
    graphDocument,
    endpointIndex,
    lod,
    keepExpandedIds,
    prefs.wireRouting,
    gesture?.nodes,
    branchScroll,
    deferred,
    routeRefresh,
  ]);
  const { layouts: baseWireLayouts, pending } = layoutResult;
  useEffect(() => {
    if (!pending.length) return;
    routeWorker.start(() => setUseWorker(false));
    if (!routeWorker.available) {
      setUseWorker(false);
      return;
    }
    const { cache } = wireScene;
    const revision = cache.obstacleRevision;
    const keys = new Map(pending.map(task => [task.id, task.key]));
    let changed = false;
    let unsubscribe: (() => void) | undefined;
    const publish = () => {
      if (interactionStore.getDrag()) return;
      unsubscribe?.();
      setRouteRefresh(version => version + 1);
    };
    routeWorker.request({
      boxes: routingBoxes,
      tasks: pending,
      receive(results, done) {
        for (const result of results) {
          if (result.kind !== "edge") continue;
          const key = keys.get(result.id);
          if (key && cache.acceptEdgeRoute(result.id, key, result, revision)) changed = true;
        }
        if (done && changed) {
          if (interactionStore.getDrag()) unsubscribe = interactionStore.subscribeDrag(publish);
          else publish();
        }
      },
    });
    return () => {
      unsubscribe?.();
      routeWorker.discard();
    };
  }, [routeWorker, wireScene, routingBoxes, pending, interactionStore]);

  const accessoryWires = useMemo(() => {
    const byId = new Map(doc.nodes.map((node) => [node.id, node]));
    return doc.nodes.flatMap((node) => {
      if (
        (node.kind !== "display" && node.kind !== "detail") ||
        !node.sourceNodeId ||
        !isNodeVisible(node, true) ||
        !isNodeVisible(byId.get(node.sourceNodeId), true)
      )
        return [];
      const from = endpoint(
        graphDocument,
        node.sourceNodeId,
        "reference",
        "out",
        lod,
        keepExpandedIds,
        endpointIndex,
      );
      const to = endpoint(
        graphDocument,
        node.id,
        "reference",
        "in",
        lod,
        keepExpandedIds,
        endpointIndex,
      );
      if (from.groupId && from.groupId === to.groupId) return [];
      const { path, extent } = wireScene.cache.getPath(
        `source:${node.id}`,
        from,
        to,
        prefs.wireRouting,
        "reference",
      );
      return [{ id: node.id, path, extent }];
    });
  }, [
    doc.nodes,
    graphDocument,
    isNodeVisible,
    keepExpandedIds,
    lod,
    prefs.wireRouting,
    wireScene,
    endpointIndex,
  ]);

  return {
    passesNodeFilter,
    isNodeVisible,
    visibleGroups,
    keepExpandedIds,
    cardBoxes,
    visibleNodes,
    sceneNodes,
    minimapBoxes,
    waitingAgentNodes,
    derivedStructure,
    childTree,
    exchanges,
    routingBoxes,
    routingBoxesById,
    wireViewport,
    edgeVisualState,
    wireScene,
    baseWireLayouts,
    attachedEdges: wirePlan.attached,
    accessoryWires,
  };
}
