import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  LaunchPlan,
  StartRequest,
} from "../types.ts";
import { groupDescendants, members } from "./document.ts";

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
  const links = activeEdges(edges),
    ids = nodes.filter((n) => n.kind === "agent").map((n) => n.id);
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
    if (!index.has(id)) visit(id);
  });
  return { component, rank, cyclic };
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
    (n) => n.kind === "agent" && selected.includes(n.id),
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
      !n.draft.trim() &&
      !n.task.trim() &&
      !(n.continuationPrompt ?? "").trim()
    ) {
      return "尚未填写任务";
    }
    if (!forceSelf && n.participation === "manual") return "仅手动启动";
    if (
      !forceSelf &&
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

  const roots = [...ids].filter(
    (id) =>
      request.kind === "single" ||
      (request.kind === "from-node" && explicitTargetIds.has(id)) ||
      !hasEligibleUpstream(id, ids, bypassedIds, links),
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

const snapGrid = (val: number): number => Math.round(val / 12) * 12;

/**
 * Pure topological + barycenter auto-layout for Agent DAGs and attached reference/display
 * satellite nodes, respecting `pinned` nodes and optional group/selection scopes.
 */
export function computeAutoLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts?: { targetIds?: string[]; groupId?: string },
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (!nodes.length) return result;

  const docLike = { nodes, edges } as FlowspaceDocument;
  let scopeIds: Set<string>;
  let groupAnchor: FlowNode | undefined;
  if (opts?.groupId) {
    groupAnchor = nodes.find(
      (n) => n.id === opts.groupId && n.kind === "group",
    );
    scopeIds = new Set(groupDescendants(docLike, opts.groupId));
  } else if (opts?.targetIds?.length) {
    scopeIds = new Set(
      opts.targetIds.flatMap((id) =>
        nodes.find((n) => n.id === id)?.kind === "group"
          ? groupDescendants(docLike, id)
          : [id],
      ),
    );
  } else {
    scopeIds = new Set(nodes.filter((n) => n.kind !== "group").map((n) => n.id));
  }

  const movable = nodes.filter(
    (n) => scopeIds.has(n.id) && n.kind !== "group" && !n.pinned,
  );
  if (!movable.length) return result;

  const pinnedBoxes = nodes
    .filter((n) => n.kind !== "group" && (!scopeIds.has(n.id) || n.pinned))
    .map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height }));

  const baseX = groupAnchor
    ? groupAnchor.x + 28
    : snapGrid(Math.min(...movable.map((n) => n.x)));
  const baseY = groupAnchor
    ? groupAnchor.y + 64
    : snapGrid(Math.min(...movable.map((n) => n.y)));

  const agents = movable.filter((n) => n.kind === "agent");
  const agentIds = new Set(agents.map((n) => n.id));
  const contEdges = edges.filter(
    (e) =>
      e.kind === "continuation" &&
      agentIds.has(e.source) &&
      agentIds.has(e.target) &&
      e.source !== e.target,
  );

  // Break cycles via Tarjan DFS rank so back-edges don't create infinite layers
  const roots = agents
    .filter((a) => !contEdges.some((e) => e.target === a.id))
    .map((a) => a.id);
  const order = graphOrder(agents, contEdges, roots);
  const dagEdges = contEdges.filter((e) => {
    const sameComp =
      order.component.get(e.source) === order.component.get(e.target);
    if (!sameComp) return true;
    return (order.rank.get(e.source) ?? 0) < (order.rank.get(e.target) ?? 0);
  });

  // Longest-path layering
  const layerOf = new Map<string, number>();
  for (const a of agents) layerOf.set(a.id, 0);
  for (let pass = 0; pass < agents.length; pass++) {
    let changed = false;
    for (const e of dagEdges) {
      const nextLayer = (layerOf.get(e.source) ?? 0) + 1;
      if (nextLayer > (layerOf.get(e.target) ?? 0)) {
        layerOf.set(e.target, nextLayer);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const maxLayer = agents.length
    ? Math.max(...agents.map((a) => layerOf.get(a.id) ?? 0))
    : -1;
  const layers: FlowNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const a of agents) {
    layers[layerOf.get(a.id) ?? 0].push(a);
  }
  for (const col of layers) {
    col.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  // Two-pass barycenter sweep to minimize continuation wire crossings
  const rowIndex = new Map<string, number>();
  const syncRows = () => {
    for (const col of layers) {
      col.forEach((n, idx) => rowIndex.set(n.id, idx));
    }
  };
  syncRows();
  for (let sweep = 0; sweep < 2; sweep++) {
    for (let l = 1; l <= maxLayer; l++) {
      layers[l].sort((a, b) => {
        const upA = dagEdges
          .filter((e) => e.target === a.id)
          .map((e) => rowIndex.get(e.source) ?? 0);
        const upB = dagEdges
          .filter((e) => e.target === b.id)
          .map((e) => rowIndex.get(e.source) ?? 0);
        const baryA = upA.length
          ? upA.reduce((s, v) => s + v, 0) / upA.length
          : (rowIndex.get(a.id) ?? 0);
        const baryB = upB.length
          ? upB.reduce((s, v) => s + v, 0) / upB.length
          : (rowIndex.get(b.id) ?? 0);
        return baryA - baryB || a.y - b.y;
      });
      syncRows();
    }
    for (let l = maxLayer - 1; l >= 0; l--) {
      layers[l].sort((a, b) => {
        const dnA = dagEdges
          .filter((e) => e.source === a.id)
          .map((e) => rowIndex.get(e.target) ?? 0);
        const dnB = dagEdges
          .filter((e) => e.source === b.id)
          .map((e) => rowIndex.get(e.target) ?? 0);
        const baryA = dnA.length
          ? dnA.reduce((s, v) => s + v, 0) / dnA.length
          : (rowIndex.get(a.id) ?? 0);
        const baryB = dnB.length
          ? dnB.reduce((s, v) => s + v, 0) / dnB.length
          : (rowIndex.get(b.id) ?? 0);
        return baryA - baryB || a.y - b.y;
      });
      syncRows();
    }
  }

  // Classify movable non-agent satellites
  const satellites = movable.filter((n) => n.kind !== "agent");
  const inputSatellitesByAgent = new Map<string, FlowNode[]>();
  const outputSatellitesByAgent = new Map<string, FlowNode[]>();
  const looseSatellites: FlowNode[] = [];

  for (const sat of satellites) {
    if (sat.kind === "display" || sat.kind === "detail") {
      const producerId =
        sat.sourceNodeId && (agentIds.has(sat.sourceNodeId) || nodes.some((n) => n.id === sat.sourceNodeId))
          ? sat.sourceNodeId
          : edges.find((e) => e.target === sat.id)?.source;
      if (producerId && agentIds.has(producerId)) {
        const list = outputSatellitesByAgent.get(producerId) ?? [];
        list.push(sat);
        outputSatellitesByAgent.set(producerId, list);
        continue;
      }
    }
    const refEdge = edges.find(
      (e) =>
        e.kind === "reference" &&
        e.source === sat.id &&
        agentIds.has(e.target),
    );
    if (refEdge) {
      const list = inputSatellitesByAgent.get(refEdge.target) ?? [];
      list.push(sat);
      inputSatellitesByAgent.set(refEdge.target, list);
    } else {
      looseSatellites.push(sat);
    }
  }

  // Reserve a left satellite gutter if any layer-0 agent has input satellites
  const hasLayer0Inputs = (layers[0] ?? []).some(
    (a) => (inputSatellitesByAgent.get(a.id)?.length ?? 0) > 0,
  );
  const agentStartX = hasLayer0Inputs ? baseX + 372 : baseX;
  const colGap = 96;
  const rowGap = 48;

  const avoidPinned = (
    x: number,
    y: number,
    w: number,
    h: number,
  ): { x: number; y: number } => {
    let curY = y;
    for (let guard = 0; guard < 12; guard++) {
      const hit = pinnedBoxes.find(
        (b) =>
          x < b.x + b.w + 20 &&
          x + w + 20 > b.x &&
          curY < b.y + b.h + 20 &&
          curY + h + 20 > b.y,
      );
      if (!hit) break;
      curY = snapGrid(hit.y + hit.h + 28);
    }
    return { x: snapGrid(x), y: snapGrid(curY) };
  };

  let curX = agentStartX;
  let maxAgentBottom = baseY;

  for (let l = 0; l <= maxLayer; l++) {
    const col = layers[l];
    if (!col.length) continue;
    const colWidth = Math.max(...col.map((n) => n.width));
    let curY = baseY;
    for (const ag of col) {
      const inputs = inputSatellitesByAgent.get(ag.id) ?? [];
      if (l > 0 && inputs.length > 0) {
        // Place reference satellites cleanly above their consumer Agent in deeper columns
        for (const sat of inputs) {
          const placedSat = avoidPinned(curX, curY, sat.width, sat.height);
          result.set(sat.id, placedSat);
          curY = placedSat.y + sat.height + 24;
        }
      }
      const placedAg = avoidPinned(curX, curY, ag.width, ag.height);
      result.set(ag.id, placedAg);

      if (l === 0 && inputs.length > 0) {
        let satY = placedAg.y;
        for (const sat of inputs) {
          const satX = Math.max(baseX, placedAg.x - sat.width - 56);
          const placedSat = avoidPinned(satX, satY, sat.width, sat.height);
          result.set(sat.id, placedSat);
          satY = placedSat.y + sat.height + 24;
          maxAgentBottom = Math.max(maxAgentBottom, placedSat.y + sat.height);
        }
      }

      const outputs = outputSatellitesByAgent.get(ag.id) ?? [];
      if (outputs.length > 0) {
        let outY = placedAg.y;
        const outX =
          l === maxLayer
            ? placedAg.x + ag.width + 64
            : placedAg.x + 24;
        if (l === maxLayer) {
          for (const outSat of outputs) {
            const placedOut = avoidPinned(
              outX,
              outY,
              outSat.width,
              outSat.height,
            );
            result.set(outSat.id, placedOut);
            outY = placedOut.y + outSat.height + 24;
            maxAgentBottom = Math.max(
              maxAgentBottom,
              placedOut.y + outSat.height,
            );
          }
        } else {
          outY = placedAg.y + ag.height + 24;
          for (const outSat of outputs) {
            const placedOut = avoidPinned(
              placedAg.x,
              outY,
              outSat.width,
              outSat.height,
            );
            result.set(outSat.id, placedOut);
            outY = placedOut.y + outSat.height + 24;
          }
          curY = Math.max(placedAg.y + ag.height, outY - 24) + rowGap;
          maxAgentBottom = Math.max(maxAgentBottom, curY);
          continue;
        }
      }

      curY = placedAg.y + ag.height + rowGap;
      maxAgentBottom = Math.max(maxAgentBottom, placedAg.y + ag.height);
    }
    curX += colWidth + colGap;
  }

  if (looseSatellites.length > 0) {
    let looseX = baseX;
    const looseY = agents.length ? maxAgentBottom + 60 : baseY;
    for (const sat of looseSatellites) {
      const placed = avoidPinned(looseX, looseY, sat.width, sat.height);
      result.set(sat.id, placed);
      looseX = placed.x + sat.width + 48;
    }
  }

  return result;
}
