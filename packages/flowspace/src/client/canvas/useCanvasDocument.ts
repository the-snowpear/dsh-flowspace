import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type {
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
} from "../../types.ts";
import { rebaseContainerChanges } from "../../core/containers.ts";
import { emptyDocument } from "../../core/document.ts";
import { staffedIds } from "../../core/team.ts";
import type { CanvasBridge } from "../bridge.ts";
import { receiveGeneration, reconcileLaneChanges } from "../generationHistory.ts";
import { inferGroupPorts, nodeBox, reflowCanvasItem } from "../geometry.ts";
import { useCanvasPreviews } from "../nodes/DataPreview.tsx";
import {
  applyGeometry,
  byId,
  indexEdges,
  indexNodes,
  shareSnapshotValue,
  type GeometryEdit,
} from "../sceneModel.ts";
import { DEFAULT_WIRE_ROUTING } from "../wireRouting.ts";
import type { ResolvedCanvasPrefs } from "./canvasTypes.ts";
import { RASTER_SCENE_NODES } from "./viewportMath.ts";

export interface UseCanvasDocumentOptions {
  bridge: CanvasBridge;
  snapshot: FlowspaceSnapshot | null;
  replayLocked: MutableRefObject<boolean>;
  reportError: (err: unknown) => void;
}

export function useCanvasDocument({
  bridge,
  snapshot,
  replayLocked,
  reportError,
}: UseCanvasDocumentOptions) {
  const [baseDoc, setDoc] = useState<FlowspaceDocument>(emptyDocument);
  const [gesture, setGesture] = useState<GeometryEdit | null>(null);
  const gestureRef = useRef<GeometryEdit | null>(null);
  const doc = useMemo(
    () => applyGeometry(baseDoc, gesture),
    [baseDoc, gesture],
  );
  const rasterScene = baseDoc.nodes.length >= RASTER_SCENE_NODES;
  const contentIndex = useMemo(
    () => indexNodes(baseDoc.nodes),
    [baseDoc.nodes],
  );
  const groupPorts = useMemo(
    () =>
      new Map(
        baseDoc.nodes
          .filter((node) => node.kind === "group")
          .map((group) => [
            group.id,
            inferGroupPorts(baseDoc, group).filter((port) => !port.hidden),
          ]),
      ),
    [baseDoc.nodes, baseDoc.edges],
  );
  const { nodesById, collapsed, membersOf } = useMemo(
    () => (doc.nodes === baseDoc.nodes ? contentIndex : indexNodes(doc.nodes)),
    [doc.nodes, baseDoc.nodes, contentIndex],
  );
  const staffed = useMemo(() => staffedIds(baseDoc.nodes), [baseDoc.nodes]);
  const edgeIndex = useMemo(() => indexEdges(doc.edges), [doc.edges]);
  const [branchScroll, setBranchScroll] = useState(
    () => new Map<string, number>(),
  );
  const onBranchScroll = useCallback((id: string, top: number) => {
    setBranchScroll((previous) => {
      if ((previous.get(id) ?? 0) === top) return previous;
      const next = new Map(previous);
      if (top) next.set(id, top);
      else next.delete(id);
      return next;
    });
  }, []);
  const writeByEdge = useMemo(
    () =>
      new Map(
        snapshot?.containerChanges?.flatMap((change) =>
          change.edgeId && change.sessionId && !change.revertedBy
            ? [[change.edgeId, change] as const]
            : [],
        ),
      ),
    [snapshot?.containerChanges],
  );

  const docRef = useRef(baseDoc);
  const graphDocument = useMemo(() => doc, [doc.nodes, doc.edges]);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const savingPromise = useRef<Promise<unknown>>(Promise.resolve());
  const applyingConfig = useRef(false);
  const revision = useRef(0);
  const sentRevision = useRef(-1);
  const initialized = useRef(false);
  const autoSwitchedSteps = useRef(new Set<string>());
  const lastHostDoc = useRef<FlowspaceDocument>();

  const [saved, setSaved] = useState(true);
  const [history, setHistory] = useState<FlowspaceDocument[]>([]);
  const [future, setFuture] = useState<FlowspaceDocument[]>([]);

  const acceptGeneration = useCallback(
    (local: FlowspaceDocument, host: FlowspaceDocument) => {
      if (!initialized.current) return local;
      const received = receiveGeneration(local, host);
      if (received.history.length) {
        setHistory((h) => [...h, ...received.history].slice(-40));
        setFuture([]);
      }
      return received.document;
    },
    [],
  );

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (!dirty.current) {
      await savingPromise.current;
      return;
    }
    const rev = revision.current;
    if (sentRevision.current === rev) {
      await savingPromise.current;
      return;
    }
    sentRevision.current = rev;
    const task = savingPromise.current.then(async () => {
      if (!dirty.current) return;
      const currentRevision = revision.current;
      const submitted = docRef.current;
      try {
        const accepted = await bridge.save(submitted);
        const current = acceptGeneration(docRef.current, accepted);
        if (
          (accepted.generationRevision ?? 0) >=
          (current.generationRevision ?? 0)
        ) {
          const reconciled = reconcileLaneChanges(submitted, current, accepted);
          if (reconciled !== docRef.current) {
            docRef.current = reconciled;
            setDoc(reconciled);
          }
        }
        if (revision.current === currentRevision) {
          dirty.current = false;
          setSaved(true);
        }
      } catch (err) {
        if (sentRevision.current === rev) {
          sentRevision.current = -1;
        }
        throw err;
      }
    });
    savingPromise.current = task.catch(reportError);
    await task;
  }, [bridge, reportError, acceptGeneration]);

  const dataPreviews = useCanvasPreviews(baseDoc, snapshot, bridge, flush);
  const previewHeights = dataPreviews.heights;
  const endpointIndex = useMemo(
    () => ({
      nodes: nodesById,
      ancestors: collapsed,
      ports: groupPorts,
      branchScroll,
      previewHeights,
    }),
    [nodesById, collapsed, groupPorts, branchScroll, previewHeights],
  );

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      if (dirty.current) void bridge.save(docRef.current).catch(reportError);
      bridge.presence([]);
    },
    [bridge, reportError],
  );

  const commitEdit = useCallback(
    (next: FlowspaceDocument, delay = 450) => {
      revision.current++;
      docRef.current = next;
      setDoc(next);
      dirty.current = true;
      setSaved(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flush().catch(reportError);
      }, delay);
    },
    [flush, reportError],
  );

  const edit = useCallback(
    (
      mutator: (d: FlowspaceDocument) => void,
      options: { remember?: boolean; delay?: number } = {},
    ) => {
      if (replayLocked.current) return;
      const { remember = true, delay = 450 } = options;
      const prev = docRef.current;
      const next = structuredClone(prev);
      if (remember) {
        setHistory((h) => [...h.slice(-39), prev]);
        setFuture([]);
      }
      mutator(next);
      commitEdit(next, delay);
    },
    [commitEdit, replayLocked],
  );

  const applyConfig = useCallback(
    (
      id: string,
      config: NonNullable<FlowNode["config"]>,
      configVersion: number,
    ) => {
      const task = savingPromise.current.then(async () => {
        const before = docRef.current;
        const submittedRevision = revision.current;
        const withConfig = (
          document: FlowspaceDocument,
          changes: Pick<FlowNode, "config" | "configVersion">,
        ) => ({
          ...document,
          nodes: document.nodes.map((node) =>
            node.id === id ? { ...node, ...changes } : node,
          ),
        });
        if (!before.nodes.some((node) => node.id === id)) return;
        applyingConfig.current = true;
        try {
          const savedDocument = await bridge.save(
            withConfig(before, { config, configVersion }),
          );
          const local = acceptGeneration(docRef.current, savedDocument);
          const latest =
            (savedDocument.generationRevision ?? 0) >=
            (local.generationRevision ?? 0)
              ? reconcileLaneChanges(before, local, savedDocument)
              : local;
          if (!latest.nodes.some((node) => node.id === id)) return;
          setHistory((h) => [...h.slice(-39), local]);
          setFuture([]);
          if (revision.current !== submittedRevision) {
            const accepted = savedDocument.nodes.find((node) => node.id === id)!;
            commitEdit(
              withConfig(latest, {
                config: accepted.config,
                configVersion: accepted.configVersion,
              }),
              0,
            );
          } else {
            revision.current++;
            sentRevision.current = revision.current;
            dirty.current = false;
            setSaved(true);
            const accepted = savedDocument.nodes.find((node) => node.id === id)!;
            const next =
              (latest.generationRevision ?? 0) >
              (savedDocument.generationRevision ?? 0)
                ? withConfig(latest, {
                    config: accepted.config,
                    configVersion: accepted.configVersion,
                  })
                : savedDocument;
            docRef.current = next;
            setDoc(next);
          }
        } finally {
          applyingConfig.current = false;
        }
      });
      savingPromise.current = task.catch(() => {});
      return task;
    },
    [bridge, commitEdit, acceptGeneration],
  );

  /* Reconcile incoming Host snapshots without clobbering uncommitted local edits */
  useEffect(() => {
    if (!snapshot) return;
    const previousNodes =
      lastHostDoc.current && lastHostDoc.current !== snapshot.document
        ? byId(docRef.current.nodes)
        : undefined;
    const incoming =
      lastHostDoc.current !== snapshot.document &&
      (snapshot.document.generationRevision ?? 0) >=
        (docRef.current.generationRevision ?? 0);
    const rebased = rebaseContainerChanges(
      docRef.current,
      snapshot.containerChanges ?? [],
    );
    const generated = incoming
      ? acceptGeneration(rebased, snapshot.document)
      : rebased;
    if (incoming && !dirty.current && !applyingConfig.current) {
      docRef.current = snapshot.document;
      setDoc(snapshot.document);
    } else if (incoming || rebased !== docRef.current) {
      const local = lastHostDoc.current
        ? reconcileLaneChanges(lastHostDoc.current, generated, snapshot.document)
        : generated;
      const hostNodes = byId(snapshot.document.nodes);
      const hostEdges = byId(snapshot.document.edges);
      const merged: FlowspaceDocument = {
        ...local,
        nodes: local.nodes.map((n) => {
          const host = hostNodes.get(n.id);
          if (!host) return n;
          return shareSnapshotValue(n, {
            ...n,
            ...(host.sessionId ? { sessionId: host.sessionId } : {}),
            ...(host.lastSubmittedTask !== undefined
              ? { lastSubmittedTask: host.lastSubmittedTask }
              : {}),
            ...(((n.kind === "display" && !n.fixed) ||
              (n.kind === "detail" && !n.pinned)) &&
            host.text
              ? { text: host.text, sourceSeq: host.sourceSeq }
              : {}),
          });
        }),
        edges: local.edges.map((e) => {
          const hostEdge = hostEdges.get(e.id);
          if (!hostEdge) return e;
          if (
            e.sentVersion === hostEdge.sentVersion &&
            e.originMode === (hostEdge.originMode ?? e.originMode)
          )
            return e;
          return {
            ...e,
            sentVersion: hostEdge.sentVersion,
            originMode: hostEdge.originMode ?? e.originMode,
          };
        }),
      };
      const next = shareSnapshotValue(docRef.current, merged);
      docRef.current = next;
      setDoc(next);
    }
    if (incoming) lastHostDoc.current = snapshot.document;
    if (!initialized.current) initialized.current = true;

    const switchToConversation = new Set<string>();
    for (const run of snapshot.runs) {
      if (run.state !== "running") continue;
      for (const step of run.steps) {
        if (
          step.state === "running" &&
          !autoSwitchedSteps.current.has(step.id)
        ) {
          autoSwitchedSteps.current.add(step.id);
          const target = docRef.current.nodes.find((n) => n.id === step.nodeId);
          if (target && target.tab !== "conversation") {
            switchToConversation.add(target.id);
          }
        }
      }
    }
    const justBound = new Set(
      docRef.current.nodes.flatMap((node) => {
        const before = previousNodes?.get(node.id);
        return node.sessionId &&
          node.expanded &&
          node.tab === "conversation" &&
          before &&
          !before.sessionId
          ? [node.id]
          : [];
      }),
    );
    if (!switchToConversation.size && !justBound.size) return;
    edit(
      (d) => {
        for (const node of d.nodes) {
          const switching = switchToConversation.has(node.id);
          const bound = justBound.has(node.id);
          if (!switching && !bound) continue;
          const previous = nodeBox(
            bound ? { ...node, sessionId: undefined } : node,
          );
          if (switching) node.tab = "conversation";
          reflowCanvasItem(d, node, previous);
        }
      },
      { remember: false },
    );
  }, [snapshot, edit, acceptGeneration]);

  const prefs = useMemo<ResolvedCanvasPrefs>(
    () => ({
      theme: doc.prefs?.theme ?? "auto",
      wheel: doc.prefs?.wheel ?? "zoom",
      wireRouting: doc.prefs?.wireRouting ?? DEFAULT_WIRE_ROUTING,
      snap: doc.prefs?.snap ?? true,
      filter: doc.prefs?.filter ?? "all",
      hiddenWorkspaces: doc.prefs?.hiddenWorkspaces ?? [],
      showBranches: doc.prefs?.showBranches ?? true,
      showWorktrees: doc.prefs?.showWorktrees ?? true,
    }),
    [doc.prefs],
  );

  return {
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
  };
}
