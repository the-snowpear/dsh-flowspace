import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import type { FlowspaceDocument, FlowspaceRun } from "../types.ts";

const node = z.object({
  id: z.string(),
  kind: z.enum(["agent", "note", "file", "display", "group"]),
  title: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  expanded: z.boolean(),
  parentId: z.string().optional(),
  sessionId: z.string().optional(),
  workspaceId: z.string().optional(),
  cwd: z.string().optional(),
  agentPreset: z.string().optional(),
  task: z.string(),
  draft: z.string(),
  nativeTrigger: z.enum(["inherit", "enabled", "disabled"]),
  participation: z.enum(["global", "manual", "paused"]),
  text: z.string(),
  sourceNodeId: z.string().optional(),
  sourceSeq: z.number().optional(),
  fixed: z.boolean(),
  collapsed: z.boolean(),
  lastSubmittedTask: z.string().optional(),
});
const edge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum(["reference", "continuation"]),
  mode: z.enum(["conclusion", "session", "fork"]),
  trigger: z.enum(["off", "auto", "confirm"]),
  maxRounds: z.number().int().positive(),
  always: z.boolean(),
  sentVersion: z.string().optional(),
  originMode: z.enum(["conclusion", "session", "fork"]).optional(),
});
export const documentSchema: z.ZodType<FlowspaceDocument> = z.object({
  version: z.literal(1),
  id: z.literal("main"),
  title: z.string(),
  nodes: z.array(node),
  edges: z.array(edge),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().positive(),
  }),
  settings: z.object({
    nativeChatTriggers: z.boolean(),
    reducedMotion: z.boolean(),
  }),
});
// Run records are internal to the scheduler. The typed JSON record is not revalidated at every hop.
export const flowspaceDomain = defineDomain({
  name: "flowspace",
  version: 1,
  tables: {
    documents: domainTable(documentSchema),
    runs: domainTable(
      z.custom<FlowspaceRun>(
        (v) => typeof v === "object" && v !== null && "id" in v && "steps" in v,
      ),
    ),
  },
});

export function checkDocument(doc: FlowspaceDocument): void {
  const ids = new Set(doc.nodes.map((n) => n.id));
  if (ids.size !== doc.nodes.length) throw new Error("节点身份重复");
  const sessions = doc.nodes.flatMap((n) => (n.sessionId ? [n.sessionId] : []));
  if (sessions.length !== new Set(sessions).size)
    throw new Error("一个会话只能对应一个 Agent 节点");
  for (const n of doc.nodes) {
    if (!n.parentId) continue;
    const parent = doc.nodes.find((p) => p.id === n.parentId);
    if (!parent || parent.kind !== "group" || parent.id === n.id)
      throw new Error("无效分组");
    const grand =
      parent.parentId && doc.nodes.find((p) => p.id === parent.parentId);
    if (grand && (grand.parentId || n.kind === "group"))
      throw new Error("分组最多两层");
  }
  for (const e of doc.edges) {
    const source = doc.nodes.find((n) => n.id === e.source),
      target = doc.nodes.find((n) => n.id === e.target);
    if (!source || !target || target.kind !== "agent")
      throw new Error("连线目标必须是 Agent");
    if (e.kind === "continuation" && source.kind !== "agent")
      throw new Error("接续只能连接 Agent");
    if (
      e.mode === "fork" &&
      (target.sessionId ||
        doc.edges.filter((x) => x.target === target.id && x.mode === "fork")
          .length > 1)
    )
      throw new Error("分叉只能接入有单一分叉来源的未启动草稿");
  }
}
