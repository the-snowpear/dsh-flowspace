import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  LaunchPlan,
  StartRequest,
} from "../types.ts";
import { groupDescendants, members } from "./document.ts";
import { descriptorOf, isExecutable } from "./nodes/registry.ts";

export function activeEdges(edges: FlowEdge[]): FlowEdge[] {
  return edges.filter((e) => e.kind === "continuation" && e.trigger !== "off");
}

/**
 * Forward reachability along active continuation edges.
 * When `nodes` is provided, `paused` (Muted) nodes act as execution stops while
 * `bypassed` nodes remain transparent pass-through conduits.
 */
export function reachable(
  roots: string[],
  edges: FlowEdge[],
  nodes?: FlowNode[],
): string[] {
  const pausedIds = nodes
    ? new Set(
        nodes.filter((n) => n.participation === "paused").map((n) => n.id),
      )
    : new Set<string>();
  const validRoots = roots.filter((id) => !pausedIds.has(id));
  const found = new Set(validRoots);
  const links = activeEdges(edges);
  const visit = (id: string): void => {
    for (const e of links) {
      if (
        e.source === id &&
        !pausedIds.has(e.target) &&
        !found.has(e.target)
      ) {
        found.add(e.target);
        visit(e.target);
      }
    }
  };
  validRoots.forEach(visit);
  return [...found];
}

/**
 * Upstream ancestor cone leading into `targets` along active continuation edges,
 * stopping at `paused` (Muted) nodes. Used by `"to-node"` partial DAG execution.
 */
export function ancestorsOf(
  targets: string[],
  edges: FlowEdge[],
  nodes?: FlowNode[],
): string[] {
  const pausedIds = nodes
    ? new Set(
        nodes.filter((n) => n.participation === "paused").map((n) => n.id),
      )
    : new Set<string>();
  const validTargets = targets.filter((id) => !pausedIds.has(id));
  const found = new Set(validTargets);
  const links = activeEdges(edges);
  const visitBack = (id: string): void => {
    for (const e of links) {
      if (
        e.target === id &&
        !pausedIds.has(e.source) &&
        !found.has(e.source)
      ) {
        found.add(e.source);
        visitBack(e.source);
      }
    }
  };
  validTargets.forEach(visitBack);
  return [...found];
}

/**
 * Resolve direct or bypassed upstream connections (`u -> [bypassed...] -> v`).
 */
export function hasEligibleUpstream(
  targetId: string,
  eligibleIds: Set<string>,
  bypassedIds: Set<string>,
  links: FlowEdge[],
): boolean {
  const seen = new Set<string>([targetId]);
  const stack = [targetId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of links) {
      if (e.target !== cur) continue;
      if (eligibleIds.has(e.source) && e.source !== targetId) return true;
      if (bypassedIds.has(e.source) && !seen.has(e.source)) {
        seen.add(e.source);
        stack.push(e.source);
      }
    }
  }
  return false;
}

/** Strongly connected components and stable DFS order distinguish loop feedback. */
export function graphOrder(
  nodes: FlowNode[],
  edges: FlowEdge[],
  roots: string[],
): {
  component: Map<string, number>;
  rank: Map<string, number>;
  cyclic: Set<number>;
} {
  // Layout callers can supply their entire vertex set as ordered roots.
  const ids = new Set([...roots, ...nodes.filter(isExecutable).map((n) => n.id)]);
  const links = activeEdges(edges).filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const index = new Map<string, number>(),
    low = new Map<string, number>(),
    component = new Map<string, number>(),
    rank = new Map<string, number>(),
    cyclic = new Set<number>();
  const stack: string[] = [],
    onStack = new Set<string>();
  let tick = 0,
    comp = 0;
  const visit = (v: string): void => {
    index.set(v, tick);
    low.set(v, tick++);
    rank.set(v, rank.size);
    stack.push(v);
    onStack.add(v);
    for (const e of links.filter((e) => e.source === v)) {
      if (!index.has(e.target)) {
        visit(e.target);
        low.set(v, Math.min(low.get(v)!, low.get(e.target)!));
      } else if (onStack.has(e.target))
        low.set(v, Math.min(low.get(v)!, index.get(e.target)!));
    }
    if (low.get(v) === index.get(v)) {
      const group: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.set(w, comp);
        group.push(w);
      } while (w !== v);
      if (
        group.length > 1 ||
        links.some((e) => e.source === v && e.target === v)
      )
        cyclic.add(comp);
      comp++;
    }
  };
  [...roots, ...ids].forEach((id) => {
    if (ids.has(id) && !index.has(id)) visit(id);
  });
  return { component, rank, cyclic };
}

export function isFanoutMaster(graph: Pick<FlowspaceDocument, "nodes">, node: FlowNode): boolean {
  if (node.masterOf) return true;
  if (node.generatedBy || !node.parentId) return false;
  const pair = graph.nodes.find(parent => parent.id === node.parentId)?.fanout;
  return !!pair && node.id !== pair.fanId && node.id !== pair.mergeId;
}

function canStartNode(doc: FlowspaceDocument, node: FlowNode): boolean {
  if (node.generatedBy || isFanoutMaster(doc, node)) return false;
  if (node.kind === "agent") return true;
  if (node.kind !== "flow" || !isExecutable(node)) return false;
  if (node.flowType === "flowspace/constant" || node.flowType === "flowspace/random" ||
      node.flowType === "flowspace/assign" && node.config?.inputValue === false) return true;
  if (node.flowType !== "flowspace/fanout" && descriptorOf(node.flowType)?.family !== "data") return false;
  return doc.edges.some(edge => edge.kind === "reference" && edge.target === node.id);
}

export function launchPlan(
  doc: FlowspaceDocument,
  request: StartRequest,
  busy: Set<string>,
  waiting: Set<string>,
): LaunchPlan {
  const expandIds = (rawIds: string[]): string[] =>
    rawIds.flatMap((id) =>
      doc.nodes.find((n) => n.id === id)?.kind === "group"
        ? members(doc, id)
        : [id],
    );

  const explicitTargetIds = new Set(expandIds(request.nodeIds));
  const selected =
    request.kind === "global"
      ? doc.nodes.map((n) => n.id)
      : request.kind === "from-node"
        ? reachable([...explicitTargetIds], doc.edges, doc.nodes)
        : request.kind === "to-node"
          ? ancestorsOf([...explicitTargetIds], doc.edges, doc.nodes)
          : expandIds(request.nodeIds);

  const pool = doc.nodes.filter(
    (n) => selected.includes(n.id) && (canStartNode(doc, n) ||
      (explicitTargetIds.has(n.id) && ["single", "from-node", "to-node"].includes(request.kind) &&
        isExecutable(n) && !n.generatedBy && !isFanoutMaster(doc, n))),
  );
  const skipped: LaunchPlan["skipped"] = [];
  const bypassedIds = new Set<string>();
  const forceTargetSet =
    request.kind === "single" || request.kind === "from-node"
      ? explicitTargetIds
      : new Set<string>();

  const admitNode = (n: FlowNode, forceSelf: boolean): string => {
    if (busy.has(n.id)) return "正在运行";
    if (waiting.has(n.id)) return "等待确认";
    if (n.participation === "paused") return "暂停参与";
    if (n.participation === "bypassed") {
      bypassedIds.add(n.id);
      return "已旁路透传";
    }
    if (
      n.kind === "agent" && !n.draft.trim() &&
      !n.task.trim() &&
      !(n.continuationPrompt ?? "").trim()
    ) {
      return "尚未填写任务";
    }
    if (!forceSelf && n.participation === "manual") return "仅手动启动";
    if (
      n.kind === "agent" && !forceSelf &&
      !n.draft.trim() &&
      n.lastSubmittedTask === n.task &&
      n.rerun !== "always" &&
      !(
        n.rerun === "update" &&
        doc.edges.some(
          (e) =>
            e.kind === "reference" &&
            e.target === n.id &&
            (!e.sentVersion ||
              (!!e.currentVersion && e.sentVersion !== e.currentVersion)),
        )
      )
    ) {
      return "没有新输入";
    }
    return "";
  };

  const eligible = pool.filter((n) => {
    const why = admitNode(n, forceTargetSet.has(n.id));
    if (why) skipped.push({ nodeId: n.id, reason: why });
    return !why;
  });

  // For `"to-node"`, if every upstream ancestor was clean/already completed, run the target itself!
  if (request.kind === "to-node" && eligible.length === 0) {
    for (const n of pool) {
      if (!explicitTargetIds.has(n.id)) continue;
      const why = admitNode(n, true);
      if (!why) {
        eligible.push(n);
        const idx = skipped.findIndex((s) => s.nodeId === n.id);
        if (idx >= 0) skipped.splice(idx, 1);
      }
    }
  }

  const ids = new Set(eligible.map((n) => n.id)),
    links = activeEdges(doc.edges).filter(
      (e) => selected.includes(e.source) && selected.includes(e.target),
    );
  const blocked = new Set(
    reachable(
      [...busy, ...waiting].filter((id) => selected.includes(id)),
      links,
      doc.nodes,
    ),
  );
  for (const n of eligible) {
    if (blocked.has(n.id)) {
      ids.delete(n.id);
      skipped.push({ nodeId: n.id, reason: "上游仍在运行或等待确认" });
    }
  }

  const traversable = new Set([...bypassedIds, ...doc.nodes
    .filter((n) => (n.kind === "flow" || n.generatedBy || isFanoutMaster(doc, n)) &&
      isExecutable(n) && n.participation !== "paused").map((n) => n.id)]);
  const roots = [...ids].filter(
    (id) =>
      request.kind === "single" ||
      (request.kind === "from-node" && explicitTargetIds.has(id)) ||
      !hasEligibleUpstream(id, ids, traversable, links),
  );
  let covered = new Set(reachable(roots, links, doc.nodes));
  for (const id of ids) {
    if (!covered.has(id)) {
      roots.push(id);
      covered = new Set(reachable(roots, links, doc.nodes));
    }
  }
  const later = [...covered].filter(
    (id) =>
      !roots.includes(id) &&
      selected.includes(id) &&
      !bypassedIds.has(id),
  );
  const confirmTargets = new Set<string>();
  for (const e of links) {
    if (!covered.has(e.source) || bypassedIds.has(e.target)) continue;
    const targetNode = doc.nodes.find((n) => n.id === e.target);
    if (e.trigger === "confirm" || targetNode?.participation === "manual") {
      confirmTargets.add(e.target);
    }
  }
  return {
    roots,
    later,
    confirmation: [...confirmTargets],
    skipped: skipped.filter((s) => !later.includes(s.nodeId)),
  };
}

