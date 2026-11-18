import type {
  CanvasSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceSnapshot,
  WorkflowTemplate,
} from "../types.ts";
import { groupDescendants, newEdge, newNode, uid } from "../core/document.ts";
import { inferGroupPorts } from "./geometry.ts";

function tplAgent(
  slotId: string,
  title: string,
  x: number,
  y: number,
  task: string,
  opts: Partial<FlowNode> = {},
): FlowNode {
  return {
    ...newNode("agent", x, y, title),
    id: slotId,
    templateSlotId: slotId,
    task,
    draft: task,
    expanded: opts.expanded ?? true,
    ...opts,
  };
}

export function builtinTemplates(): WorkflowTemplate[] {
  const reviewNodes: FlowNode[] = [
    tplAgent(
      "slot-analyze",
      "分析项目",
      24,
      54,
      "阅读当前工作区，简要说明项目用途、核心架构以及最值得改进的一点。先不要修改文件。",
      { roleLabel: "implementation" },
    ),
    tplAgent(
      "slot-review",
      "审查建议",
      420,
      54,
      "审查上游建议的可行性，核对代码证据、潜在风险与边界条件。先不要修改文件。",
      { roleLabel: "review" },
    ),
    tplAgent(
      "slot-deliver",
      "汇总结论",
      816,
      54,
      "结合上游审查结论，整理出一份简洁、可直接执行的行动清单与验收项。",
      { roleLabel: "delivery" },
    ),
  ];
  const reviewEdges: FlowEdge[] = [
    { ...newEdge("slot-analyze", "slot-review", "continuation"), id: "e-1" },
    {
      ...newEdge("slot-review", "slot-deliver", "continuation"),
      id: "e-2",
      trigger: "confirm",
    },
  ];

  const parallelNodes: FlowNode[] = [
    tplAgent(
      "slot-res1",
      "探索架构与模块",
      24,
      64,
      "阅读当前工作区，概括架构分层、主要模块职责与数据流。不要修改文件。",
      { expanded: false, roleLabel: "implementation" },
    ),
    tplAgent(
      "slot-res2",
      "调查测试与约束",
      24,
      236,
      "调查当前项目的类型检查、单元测试、集成验收与工程约束边界。不要修改文件。",
      { expanded: false, roleLabel: "implementation" },
    ),
    tplAgent(
      "slot-synth",
      "汇总结论",
      384,
      54,
      "等两路调查全部完成后，综合整理出一份有明确下一步推荐的项目概览。",
      { roleLabel: "review" },
    ),
  ];
  const parallelEdges: FlowEdge[] = [
    { ...newEdge("slot-res1", "slot-synth", "continuation"), id: "ep-1" },
    { ...newEdge("slot-res2", "slot-synth", "continuation"), id: "ep-2" },
  ];

  const releaseNodes: FlowNode[] = [
    tplAgent(
      "slot-writer",
      "整理变更说明",
      24,
      54,
      "根据当前工作区最近的提交与文档，整理结构化的变更说明（新增、改进与修复）。",
      { roleLabel: "delivery" },
    ),
    tplAgent(
      "slot-proof",
      "双语校对与核验",
      408,
      54,
      "翻译并校对上游变更说明，核对命令、版本号与术语一致性，输出中英对照版本。",
      { roleLabel: "review" },
    ),
  ];
  const releaseEdges: FlowEdge[] = [
    {
      ...newEdge("slot-writer", "slot-proof", "continuation"),
      id: "er-1",
      trigger: "confirm",
    },
  ];

  return [
    {
      id: "builtin-review",
      title: "implementationReview",
      description: "implementationReviewDescription",
      revision: 1,
      builtin: true,
      color: "blue",
      w: 1152,
      h: 474,
      nodes: reviewNodes,
      edges: reviewEdges,
      ports: [
        {
          id: "in-analyze",
          kind: "continuation",
          direction: "in",
          name: "分析项目",
          nodes: ["slot-analyze"],
          hidden: false,
        },
        {
          id: "out-deliver",
          kind: "continuation",
          direction: "out",
          name: "汇总结论",
          nodes: ["slot-deliver"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-parallel",
      title: "parallelResearch",
      description: "parallelResearchDescription",
      revision: 1,
      builtin: true,
      color: "teal",
      w: 756,
      h: 492,
      nodes: parallelNodes,
      edges: parallelEdges,
      ports: [
        {
          id: "in-res",
          kind: "reference",
          direction: "in",
          name: "调查上下文",
          nodes: ["slot-res1", "slot-res2"],
          hidden: false,
        },
        {
          id: "out-synth",
          kind: "continuation",
          direction: "out",
          name: "汇总结论",
          nodes: ["slot-synth"],
          hidden: false,
        },
      ],
    },
    {
      id: "builtin-release",
      title: "releaseWorkflow",
      description: "releaseWorkflowDescription",
      revision: 1,
      builtin: true,
      color: "blue",
      w: 780,
      h: 492,
      nodes: releaseNodes,
      edges: releaseEdges,
      ports: [
        {
          id: "in-writer",
          kind: "reference",
          direction: "in",
          name: "变更输入",
          nodes: ["slot-writer"],
          hidden: false,
        },
        {
          id: "out-proof",
          kind: "continuation",
          direction: "out",
          name: "发布说明",
          nodes: ["slot-proof"],
          hidden: false,
        },
      ],
    },
  ];
}

export function allTemplates(doc: FlowspaceDocument): WorkflowTemplate[] {
  return [...builtinTemplates(), ...(doc.templates ?? [])];
}

export function captureTemplate(
  doc: FlowspaceDocument,
  groupId: string,
  title: string,
  description: string,
): WorkflowTemplate {
  const group = doc.nodes.find((n) => n.id === groupId && n.kind === "group");
  if (!group) throw new Error("工作流分组不存在");
  const descendantIds = groupDescendants(doc, group.id);
  const inside = new Set(descendantIds);
  const nodes = doc.nodes
    .filter((n) => inside.has(n.id))
    .map((n) => {
      const slot = n.templateSlotId ?? n.id;
      const clone = structuredClone(n);
      delete clone.sessionId;
      delete clone.lastSubmittedTask;
      delete clone.window;
      delete clone.nudge;
      return {
        ...clone,
        id: slot,
        templateSlotId: slot,
        parentId:
          n.parentId === group.id
            ? undefined
            : doc.nodes.find((p) => p.id === n.parentId)?.templateSlotId ??
              n.parentId,
        x: n.x - group.x,
        y: n.y - group.y,
        draft: n.task || n.draft,
      };
    });
  const slotOf = new Map<string, string>(
    doc.nodes
      .filter((n) => inside.has(n.id))
      .map((n) => [n.id, n.templateSlotId ?? n.id]),
  );
  const edges = doc.edges
    .filter((e) => inside.has(e.source) && inside.has(e.target))
    .map((e) => {
      const clone = structuredClone(e);
      delete clone.sentVersion;
      delete clone.originMode;
      return {
        ...clone,
        id: uid(),
        source: slotOf.get(e.source)!,
        target: slotOf.get(e.target)!,
        waypoints: e.waypoints?.map((p) => ({
          x: p.x - group.x,
          y: p.y - group.y,
        })),
      };
    });
  const ports = inferGroupPorts(doc, group).map((p) => ({
    ...structuredClone(p),
    nodes: p.nodes.map((id) => slotOf.get(id) ?? id),
  }));
  return {
    id: uid(),
    title,
    description,
    revision: 1,
    color: group.color ?? "blue",
    w: group.width,
    h: group.height,
    nodes,
    edges,
    ports,
  };
}

export function instantiateTemplate(
  doc: FlowspaceDocument,
  template: WorkflowTemplate,
  x: number,
  y: number,
  displayTitle: string,
  placement?: { workspaceId?: string; cwd?: string },
): FlowNode {
  const group: FlowNode = {
    ...newNode("group", x, y, displayTitle),
    color: template.color ?? "blue",
    width: template.w,
    height: template.h,
    templateId: template.id,
    templateRevision: template.revision,
    ...(template.builtin ? { titleKey: template.title } : {}),
  };
  const idMap = new Map<string, string>();
  for (const n of template.nodes) idMap.set(n.id, uid());
  const createdNodes: FlowNode[] = template.nodes.map((n) => {
    const clone = structuredClone(n);
    delete clone.sessionId;
    delete clone.lastSubmittedTask;
    delete clone.window;
    return {
      ...clone,
      id: idMap.get(n.id)!,
      templateSlotId: n.templateSlotId ?? n.id,
      parentId: n.parentId ? idMap.get(n.parentId) ?? group.id : group.id,
      x: x + n.x,
      y: y + n.y,
      ...(n.kind === "agent"
        ? {
            workspaceId: placement?.workspaceId,
            cwd: placement?.cwd,
            draft: n.task || n.draft,
          }
        : {}),
    };
  });
  const createdEdges: FlowEdge[] = template.edges.map((e) => ({
    ...structuredClone(e),
    id: uid(),
    source: idMap.get(e.source)!,
    target: idMap.get(e.target)!,
    waypoints: e.waypoints?.map((p) => ({ x: x + p.x, y: y + p.y })),
  }));
  group.ports = template.ports.map((p) => ({
    ...structuredClone(p),
    id: uid(),
    nodes: p.nodes.map((s) => idMap.get(s)).filter(Boolean) as string[],
  }));
  doc.nodes.push(group, ...createdNodes);
  doc.edges.push(...createdEdges);
  return group;
}

export interface SyncPlan {
  template: WorkflowTemplate;
  outside: number;
  locked: FlowNode[];
  added: FlowNode[];
  removed: FlowNode[];
  edited: FlowNode[];
}

export function computeSyncPlan(
  doc: FlowspaceDocument,
  group: FlowNode,
  template: WorkflowTemplate,
): SyncPlan {
  const desc = groupDescendants(doc, group.id);
  const inside = new Set(desc);
  const members = doc.nodes.filter((n) => inside.has(n.id));
  const outside = doc.edges.filter(
    (e) => inside.has(e.source) !== inside.has(e.target),
  ).length;
  const slots = new Set(
    template.nodes.map((n) => n.templateSlotId ?? n.id),
  );
  const memberSlots = new Set(
    members.map((n) => n.templateSlotId ?? ""),
  );
  const added = template.nodes.filter(
    (n) => !memberSlots.has(n.templateSlotId ?? n.id),
  );
  const removed = members.filter(
    (n) =>
      n.templateSlotId &&
      !slots.has(n.templateSlotId) &&
      !n.sessionId,
  );
  const locked = members.filter((n) => !!n.sessionId);
  const edited = members.filter((n) => {
    const src = template.nodes.find(
      (t) => (t.templateSlotId ?? t.id) === n.templateSlotId,
    );
    return src && n.kind === "agent" && n.task !== src.task;
  });
  return { template, outside, locked, added, removed, edited };
}

export function synchronizeTemplate(
  doc: FlowspaceDocument,
  groupId: string,
  template: WorkflowTemplate,
  keepTasks: boolean,
  placement?: { workspaceId?: string; cwd?: string },
): void {
  const group = doc.nodes.find((n) => n.id === groupId && n.kind === "group");
  if (!group) return;
  const desc = groupDescendants(doc, group.id);
  const inside = new Set(desc);
  const existingBySlot = new Map<string, FlowNode>();
  for (const n of doc.nodes) {
    if (inside.has(n.id) && n.templateSlotId) {
      existingBySlot.set(n.templateSlotId, n);
    }
  }
  const slotToNodeId = new Map<string, string>();
  group.width = template.w;
  group.height = template.h;
  group.templateRevision = template.revision;

  for (const src of template.nodes) {
    const slot = src.templateSlotId ?? src.id;
    const existing = existingBySlot.get(slot);
    if (existing) {
      slotToNodeId.set(slot, existing.id);
      existing.x = group.x + src.x;
      existing.y = group.y + src.y;
      existing.width = src.width;
      existing.height = src.height;
      if (!keepTasks && !existing.sessionId) {
        existing.title = src.title;
        existing.task = src.task;
        existing.draft = src.task;
        existing.text = src.text;
      }
    } else {
      const freshId = uid();
      slotToNodeId.set(slot, freshId);
      const clone = structuredClone(src);
      delete clone.sessionId;
      delete clone.lastSubmittedTask;
      doc.nodes.push({
        ...clone,
        id: freshId,
        templateSlotId: slot,
        parentId: group.id,
        x: group.x + src.x,
        y: group.y + src.y,
        ...(src.kind === "agent"
          ? {
              workspaceId: placement?.workspaceId,
              cwd: placement?.cwd,
              draft: src.task || src.draft,
            }
          : {}),
      });
    }
  }

  const templateSlots = new Set(
    template.nodes.map((n) => n.templateSlotId ?? n.id),
  );
  const dropIds = new Set(
    doc.nodes
      .filter(
        (n) =>
          inside.has(n.id) &&
          n.templateSlotId &&
          !templateSlots.has(n.templateSlotId) &&
          !n.sessionId,
      )
      .map((n) => n.id),
  );
  if (dropIds.size) {
    doc.nodes = doc.nodes.filter((n) => !dropIds.has(n.id));
    doc.edges = doc.edges.filter(
      (e) => !dropIds.has(e.source) && !dropIds.has(e.target),
    );
  }

  const mappedIds = new Set(slotToNodeId.values());
  const oldInternal = doc.edges.filter(
    (e) => mappedIds.has(e.source) && mappedIds.has(e.target),
  );
  doc.edges = doc.edges.filter(
    (e) => !(mappedIds.has(e.source) && mappedIds.has(e.target)),
  );
  for (const e of template.edges) {
    const source = slotToNodeId.get(e.source),
      target = slotToNodeId.get(e.target);
    if (!source || !target) continue;
    const prev = oldInternal.find(
      (o) => o.source === source && o.target === target && o.kind === e.kind,
    );
    doc.edges.push({
      ...structuredClone(e),
      id: prev?.id ?? uid(),
      source,
      target,
      sentVersion: prev?.sentVersion,
      originMode: prev?.originMode,
      mode: prev?.originMode === "fork" ? prev.mode : e.mode,
      waypoints:
        prev?.waypoints ??
        e.waypoints?.map((p) => ({ x: group.x + p.x, y: group.y + p.y })),
    });
  }

  group.ports = template.ports.map((p) => ({
    ...structuredClone(p),
    id: uid(),
    nodes: p.nodes.map((s) => slotToNodeId.get(s)).filter(Boolean) as string[],
  }));
}

export function buildSnapshot(
  doc: FlowspaceDocument,
  hostSnapshot: FlowspaceSnapshot | null,
  title: string,
): CanvasSnapshot {
  const agents = doc.nodes.filter((n) => n.kind === "agent");
  const drafts = agents.filter(
    (n) => !n.sessionId && (n.draft.trim() || n.task.trim()),
  ).length;
  const stopping =
    hostSnapshot?.live.filter((l) => l.running).length ?? 0;
  const awaiting =
    (hostSnapshot?.runs
      .filter((r) => ["running", "waiting", "paused"].includes(r.state))
      .reduce(
        (sum, r) =>
          sum +
          r.tokens.filter((tk) => !tk.ready && !tk.consumed && !tk.dismissed)
            .length,
        0,
      ) ?? 0) +
    (hostSnapshot?.live.filter((l) => l.pendingInput.length > 0).length ?? 0);
  const queued =
    hostSnapshot?.runs
      .filter((r) => r.state === "running")
      .reduce(
        (sum, r) => sum + r.steps.filter((s) => s.state === "queued").length,
        0,
      ) ?? 0;
  const recentOutputs = (hostSnapshot?.runs ?? [])
    .flatMap((r) =>
      r.steps
        .filter((s) => s.state === "completed" && s.output)
        .map((s) => ({
          title:
            r.graph.nodes.find((n) => n.id === s.nodeId)?.title ?? s.nodeId,
          snippet: s.output!.slice(0, 72),
        })),
    )
    .slice(-3)
    .reverse();

  return {
    id: uid(),
    title,
    createdAt: Date.now(),
    nodes: structuredClone(doc.nodes).map((n) => {
      delete n.window;
      return n;
    }),
    edges: structuredClone(doc.edges),
    viewport: structuredClone(doc.viewport),
    summary: {
      drafts,
      stopping,
      awaiting,
      queued,
      recentOutputs,
    },
  };
}
