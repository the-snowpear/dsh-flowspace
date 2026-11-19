import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { sanitizeDocumentForWire } from "../core/document.ts";
import type {
  CanvasSnapshot,
  FlowspaceDocument,
  FlowspaceRun,
  RoleDefinition,
  TeamBlueprint,
  WorkflowTemplate,
} from "../types.ts";

export { sanitizeDocumentForWire };

const assetId = z.string().trim().min(1);
export const teamModelSchema = z.object({
  provider: assetId,
  model: assetId,
  reasoningEffort: assetId.optional(),
});

export const saveRoleSchema = z.object({
  id: assetId,
  title: assetId,
  description: z.string(),
  persona: z.string(),
  model: teamModelSchema,
  revision: z.number().int().nonnegative(),
});

export const maxTeamSlots = 8;
export const saveTeamSchema = z.object({
  id: assetId,
  title: assetId,
  lead: z.object({ persona: z.string(), model: teamModelSchema }),
  slots: z.array(z.object({
    slotId: z.string().regex(/^(?!lead$)[a-z][a-z0-9-]{0,31}$/, "Invalid native subagent slot name"),
    roleId: assetId,
    label: assetId,
    model: teamModelSchema.optional(),
    maxInstances: z.number().int().positive().optional(),
  })).min(1).max(maxTeamSlots),
  norms: z.string(),
  revision: z.number().int().nonnegative(),
}).refine((team) => new Set(team.slots.map((slot) => slot.slotId)).size === team.slots.length, {
  path: ["slots"],
  message: "Slot names must be unique",
});

const revisionFields = {
  revision: z.number().int().positive(),
  archived: z.boolean().optional(),
};
export const roleDefinitionSchema: z.ZodType<RoleDefinition> = saveRoleSchema.extend(revisionFields);
export const teamBlueprintSchema: z.ZodType<TeamBlueprint> = saveTeamSchema.safeExtend(revisionFields);
export const archiveTeamAssetSchema = z.object({
  id: assetId,
  revision: revisionFields.revision,
});
export const teamReferenceSchema = z.object({
  teamId: assetId,
  revision: revisionFields.revision.optional(),
});
export const teamDependenciesSchema = z.object({
  teams: z.array(teamBlueprintSchema),
  roles: z.array(roleDefinitionSchema),
}).refine(({ teams, roles }) =>
  new Set(teams.map((team) => team.id)).size === teams.length &&
  new Set(roles.map((role) => role.id)).size === roles.length,
  "Team dependency IDs must be unique",
);
export const teamModelReplacementSchema = z.array(z.object({ from: teamModelSchema, to: teamModelSchema }));
const teamSessionSchema = z.object({
  leadSessionId: assetId,
  nodeId: assetId,
  roster: z.object({
    team: teamBlueprintSchema,
    roles: z.array(roleDefinitionSchema),
  }),
  delegations: z.array(z.object({
    sessionId: assetId,
    slotId: assetId,
    roleId: assetId,
    model: teamModelSchema,
    roleRevision: revisionFields.revision,
  })),
});
export type TeamSessionRecord = z.infer<typeof teamSessionSchema>;

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
  teamRef: teamReferenceSchema.optional(),
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
      origX: z.number().finite().optional(),
      origY: z.number().finite().optional(),
      origW: z.number().positive().optional(),
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
      wireRouting: z.enum(["avoid", "overlap"]).optional(),
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
    roles: domainTable(roleDefinitionSchema),
    teams: domainTable(teamBlueprintSchema),
    team_sessions: domainTable(teamSessionSchema),
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
    if (n.teamRef && n.kind !== "agent") throw new Error("团队必须使用 Agent 节点");
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
      (target.teamRef || target.sessionId ||
        doc.edges.filter((x) => x.target === target.id && x.mode === "fork")
          .length > 1)
    )
      throw new Error("分叉只能接入有单一分叉来源的未启动草稿");
  }
}
