import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { sanitizeDocumentForWire } from "../core/document.ts";
import type {
  CanvasSnapshot,
  FlowspaceDocument,
  FlowspaceRun,
  WorkflowTemplate,
} from "../types.ts";

export { sanitizeDocumentForWire };

const groupPort = z.object({
  id: z.string(),
  kind: z.enum(["reference", "continuation"]),
  direction: z.enum(["in", "out"]),
  name: z.string(),
  nodes: z.array(z.string()),
  hidden: z.boolean(),
});

const boardColumn = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    }),
  ),
});

const windowState = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive(),
  h: z.number().positive(),
  snap: z.enum(["left", "right", "max"]).nullable().optional(),
  z: z.number().optional(),
});

const node = z.object({
  id: z.string(),
  kind: z.enum([
    "agent",
    "note",
    "file",
    "display",
    "group",
    "board",
    "detail",
    "git",
    "changes",
    "terminal",
  ]),
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
  branch: z.string().optional(),
  worktreePath: z.string().optional(),
  agentPreset: z.string().optional(),
  planMode: z.boolean().optional(),
  customTitle: z.boolean().optional(),
  subAgentsExpanded: z.boolean().optional(),
  task: z.string(),
  draft: z.string(),
  continuationPrompt: z.string().optional(),
  continuationCollapsed: z.boolean().optional(),
  nativeTrigger: z.enum(["inherit", "enabled", "disabled"]),
  participation: z.enum(["global", "manual", "paused", "bypassed"]),
  text: z.string(),
  sourceNodeId: z.string().optional(),
  sourceSeq: z.number().optional(),
  fixed: z.boolean(),
  collapsed: z.boolean(),
  lastSubmittedTask: z.string().optional(),
  tab: z.enum(["task", "conversation", "execution"]).optional(),
  pinned: z.boolean().optional(),
  roleLabel: z.string().optional(),
  rerun: z.enum(["change", "update", "always"]).optional(),
  color: z.enum(["violet", "teal", "blue", "amber"]).optional(),
  ports: z.array(groupPort).optional(),
  templateId: z.string().optional(),
  templateRevision: z.number().int().positive().optional(),
  templateSlotId: z.string().optional(),
  titleKey: z.string().optional(),
  window: windowState.nullable().optional(),
  columns: z.array(boardColumn).optional(),
  items: z.array(z.string()).optional(),
  selectedItems: z.array(z.string()).optional(),
  nudge: z
    .object({
      by: z.string(),
      origY: z.number().finite().optional(),
      origH: z.number().positive().optional(),
    })
    .optional(),
  gitTab: z.enum(["changes", "history", "branches"]).optional(),
  gitCommitOid: z.string().optional(),
  changesSessionId: z.string().optional(),
  changesSeq: z.number().optional(),
  changesTurn: z.number().optional(),
  terminalSessionId: z.string().optional(),
  terminalId: z.string().optional(),
});

const waypoint = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
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
  currentVersion: z.string().optional(),
  sourceItemKey: z.string().optional(),
  snapshotTitle: z.string().optional(),
  snapshotText: z.string().optional(),
  originMode: z.enum(["conclusion", "session", "fork"]).optional(),
  waypoints: z.array(waypoint).optional(),
  placedCapsules: z.array(z.string()).optional(),
});

export const workflowTemplateSchema: z.ZodType<WorkflowTemplate> = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  revision: z.number().int().positive(),
  builtin: z.boolean().optional(),
  color: z.enum(["violet", "teal", "blue", "amber"]).optional(),
  w: z.number().positive(),
  h: z.number().positive(),
  nodes: z.array(node),
  edges: z.array(edge),
  ports: z.array(groupPort),
});

export const canvasSnapshotSchema: z.ZodType<CanvasSnapshot> = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  nodes: z.array(node),
  edges: z.array(edge),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().positive(),
  }),
  summary: z
    .object({
      drafts: z.number(),
      stopping: z.number(),
      awaiting: z.number(),
      queued: z.number(),
      recentOutputs: z.array(
        z.object({
          title: z.string(),
          snippet: z.string(),
        }),
      ),
    })
    .optional(),
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
  prefs: z
    .object({
      theme: z.enum(["dark", "light", "auto"]).optional(),
      wheel: z.enum(["zoom", "pan"]).optional(),
      snap: z.boolean().optional(),
      filter: z.enum(["auto", "running", "3d", "7d", "all"]).optional(),
      hiddenWorkspaces: z.array(z.string()).optional(),
      showBranches: z.boolean().optional(),
      showWorktrees: z.boolean().optional(),
    })
    .optional(),
  templates: z.array(workflowTemplateSchema).optional(),
  snapshots: z.array(canvasSnapshotSchema).optional(),
});

// Four isolated tables per design.md §6.2: documents, runs, templates, snapshots.
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
    templates: domainTable(workflowTemplateSchema),
    snapshots: domainTable(canvasSnapshotSchema),
  },
});

function scrubNodeNullsInPlace(nodes: FlowspaceDocument["nodes"]): void {
  for (const n of nodes) {
    if (n.window === null) {
      delete n.window;
    } else if (n.window && n.window.snap === null) {
      delete n.window.snap;
    }
  }
}

export function checkDocument(doc: FlowspaceDocument): void {
  scrubNodeNullsInPlace(doc.nodes);
  for (const tpl of doc.templates ?? []) scrubNodeNullsInPlace(tpl.nodes);
  for (const snap of doc.snapshots ?? []) scrubNodeNullsInPlace(snap.nodes);

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
