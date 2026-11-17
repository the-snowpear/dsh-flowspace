import type { FlowEdge, FlowNode, FlowspaceDocument } from "../types.ts";

export const uid = (): string => crypto.randomUUID();
export function emptyDocument(): FlowspaceDocument {
  return {
    version: 1,
    id: "main",
    title: "FlowSpace",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { nativeChatTriggers: true, reducedMotion: false },
  };
}
export function newNode(
  kind: FlowNode["kind"],
  x: number,
  y: number,
  title?: string,
): FlowNode {
  return {
    id: uid(),
    kind,
    title:
      title ??
      {
        agent: "新 Agent",
        note: "便签",
        file: "文件引用",
        display: "结果",
        group: "工作流",
      }[kind],
    x,
    y,
    width: kind === "group" ? 850 : 340,
    height: kind === "group" ? 480 : 240,
    expanded: false,
    task: "",
    draft: "",
    nativeTrigger: "inherit",
    participation: "global",
    text: "",
    fixed: true,
    collapsed: false,
  };
}
export function newEdge(
  source: string,
  target: string,
  kind: FlowEdge["kind"],
): FlowEdge {
  return {
    id: uid(),
    source,
    target,
    kind,
    mode: "conclusion",
    trigger: kind === "reference" ? "off" : "auto",
    maxRounds: 3,
    always: false,
  };
}
export function members(doc: FlowspaceDocument, groupId: string): string[] {
  return doc.nodes
    .filter((n) => n.parentId === groupId)
    .flatMap((n) => (n.kind === "group" ? members(doc, n.id) : [n.id]));
}
export function groupDescendants(
  doc: FlowspaceDocument,
  groupId: string,
): string[] {
  return doc.nodes
    .filter((n) => n.parentId === groupId)
    .flatMap((n) => [
      n.id,
      ...(n.kind === "group" ? groupDescendants(doc, n.id) : []),
    ]);
}
export function sample(
  doc: FlowspaceDocument,
  kind: "review" | "parallel",
  placement?: { workspaceId?: string; cwd?: string },
): FlowspaceDocument {
  const copy = structuredClone(doc);
  const x = copy.nodes.length
    ? Math.max(...copy.nodes.map((n) => n.x + n.width)) + 100
    : 80;
  const prompts =
    kind === "review"
      ? [
          [
            "分析项目",
            "阅读当前工作区，简要说明项目用途和最值得改进的一点。先不要修改文件。",
          ],
          [
            "审查建议",
            "审查上游建议的可行性，指出证据和不足。先不要修改文件。",
          ],
          ["汇总结论", "结合上游结果，给出简洁的行动清单。"],
        ]
      : [
          ["调查结构", "阅读工作区，概括架构和主要模块。不要修改文件。"],
          ["调查验证", "阅读工作区，概括测试与验证方式。不要修改文件。"],
          ["汇总调查", "综合两份调查，给出项目概览和建议的下一步。"],
        ];
  const nodes = prompts.map(([title, task], i) => ({
    ...newNode(
      "agent",
      x + (kind === "parallel" ? (i === 2 ? 460 : 0) : i * 430),
      kind === "parallel" && i === 1 ? 410 : 90,
      title,
    ),
    ...placement,
    task,
    draft: task,
  }));
  const edges =
    kind === "review"
      ? [
          newEdge(nodes[0].id, nodes[1].id, "continuation"),
          {
            ...newEdge(nodes[1].id, nodes[2].id, "continuation"),
            trigger: "confirm" as const,
          },
        ]
      : [
          newEdge(nodes[0].id, nodes[2].id, "continuation"),
          newEdge(nodes[1].id, nodes[2].id, "continuation"),
        ];
  copy.nodes.push(...nodes);
  copy.edges.push(...edges);
  return copy;
}
