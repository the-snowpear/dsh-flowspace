import type {
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  LaunchPlan,
  StartRequest,
} from "../types.ts";
import { members } from "./document.ts";

export function activeEdges(edges: FlowEdge[]): FlowEdge[] {
  return edges.filter((e) => e.kind === "continuation" && e.trigger !== "off");
}
export function reachable(roots: string[], edges: FlowEdge[]): string[] {
  const found = new Set(roots);
  const visit = (id: string): void => {
    for (const e of activeEdges(edges))
      if (e.source === id && !found.has(e.target)) {
        found.add(e.target);
        visit(e.target);
      }
  };
  roots.forEach(visit);
  return [...found];
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
  const selected =
    request.kind === "global"
      ? doc.nodes.map((n) => n.id)
      : request.nodeIds.flatMap((id) =>
          doc.nodes.find((n) => n.id === id)?.kind === "group"
            ? members(doc, id)
            : [id],
        );
  const pool = doc.nodes.filter(
    (n) => n.kind === "agent" && selected.includes(n.id),
  );
  const skipped: LaunchPlan["skipped"] = [];
  const eligible = pool.filter((n) => {
    const why = busy.has(n.id)
      ? "正在运行"
      : waiting.has(n.id)
        ? "等待确认"
        : !n.draft.trim() && !n.task.trim()
          ? "尚未填写任务"
          : n.participation === "paused"
            ? "暂停参与"
            : request.kind !== "single" && n.participation === "manual"
              ? "仅手动启动"
              : request.kind !== "single" &&
                  !n.draft.trim() &&
                  n.lastSubmittedTask === n.task &&
                  n.rerun !== "always" &&
                  !(
                    n.rerun === "update" &&
                    doc.edges.some(
                      (e) =>
                        e.kind === "reference" &&
                        e.target === n.id &&
                        !e.sentVersion,
                    )
                  )
                ? "没有新输入"
                : "";
    if (why) skipped.push({ nodeId: n.id, reason: why });
    return !why;
  });
  const ids = new Set(eligible.map((n) => n.id)),
    links = activeEdges(doc.edges).filter(
      (e) => selected.includes(e.source) && selected.includes(e.target),
    );
  const blocked = new Set(
    reachable(
      [...busy, ...waiting].filter((id) => selected.includes(id)),
      links,
    ),
  );
  for (const n of eligible)
    if (blocked.has(n.id)) {
      ids.delete(n.id);
      skipped.push({ nodeId: n.id, reason: "上游仍在运行或等待确认" });
    }
  const roots = [...ids].filter(
    (id) =>
      request.kind === "single" ||
      !links.some((e) => e.target === id && ids.has(e.source)),
  );
  let covered = new Set(reachable(roots, links));
  for (const id of ids)
    if (!covered.has(id)) {
      roots.push(id);
      covered = new Set(reachable(roots, links));
    }
  const later = [...covered].filter(
    (id) => !roots.includes(id) && selected.includes(id),
  );
  return {
    roots,
    later,
    confirmation: links
      .filter((e) => e.trigger === "confirm" && covered.has(e.source))
      .map((e) => e.target),
    skipped: skipped.filter((s) => !later.includes(s.nodeId)),
  };
}
