import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { sanitizeDocumentForWire } from "../core/document.ts";
import { canConnect, canStreamTo, structuredInput } from "../core/connect.ts";
import { descriptorOf } from "../core/nodes/registry.ts";
import { tFor } from "../client/i18n.ts";
import { BOARD_COLORS, BOARD_LIMITS, BOARD_PRIORITIES, BOARD_REF_SCOPES, BOARD_ROLES, pruneBoardReferences } from "../core/board.ts";
import { variableRecordSchema } from "./variables.ts";
import { SLOT_ID } from "../core/team.ts";
import type {
  CanvasSnapshot,
  FlowContent,
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
    nodeId: assetId.optional(),
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
    /** The canvas role node the member was delegated through. */
    nodeId: assetId.optional(),
  })),
  /** Subagents the session already had when it became a team; they stay plain subagents. */
  priorChildren: z.array(assetId).optional(),
  /** The node lost its roles: the session is a plain agent again, its member record kept. */
  released: z.boolean().optional(),
});
export type TeamSessionRecord = z.infer<typeof teamSessionSchema>;

const groupPort = z.object({
  id: z.string(),
  portId: z.string().optional(),
  kind: z.enum(["reference", "continuation", "event"]),
  direction: z.enum(["in", "out"]),
  name: z.string(),
  nodes: z.array(z.string()),
  hidden: z.boolean(),
});

const budget = z.object({
  tokens: z.number().int().positive().optional(), seconds: z.number().positive().optional(), rounds: z.number().int().positive().optional(),
});

const boardChecklistItem = z.object({
  id: z.string(),
  text: z.string().max(BOARD_LIMITS.checklistText),
  done: z.boolean(),
});

const boardCard = z.object({
  id: z.string(),
  text: z.string(),
  description: z.string().max(BOARD_LIMITS.description).optional(),
  done: z.boolean().optional(),
  priority: z.enum(BOARD_PRIORITIES).optional(),
  tags: z.array(z.string().min(1).max(BOARD_LIMITS.tag)).max(BOARD_LIMITS.tags).optional(),
  dueDate: z.iso.date().optional(),
  checklist: z.array(boardChecklistItem).max(BOARD_LIMITS.checklist).optional(),
  comments: z.array(z.object({ id: z.string(), by: z.string(), text: z.string(), createdAt: z.number() })).optional(),
  author: z.string().optional(),
  previousColumnId: z.string().optional(),
  createdAt: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative().optional(),
});

const boardColumn = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(boardCard),
  role: z.enum(BOARD_ROLES).optional(),
  color: z.enum(BOARD_COLORS).optional(),
  wipLimit: z.number().int().positive().max(BOARD_LIMITS.wip).optional(),
  collapsed: z.boolean().optional(),
});

const boardSettings = z.object({
  view: z.enum(["board", "list"]).optional(),
  autoMoveDone: z.boolean().optional(),
  showCompleted: z.boolean().optional(),
  refScope: z.enum(BOARD_REF_SCOPES).optional(),
});

const windowState = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive(),
  h: z.number().positive(),
  snap: z.enum(["left", "right", "max"]).nullable().optional(),
  z: z.number().optional(),
});

const fanoutPairIds = z.object({ fanId: assetId, mergeId: assetId });
const generationRevision = z.number().int().nonnegative().optional();
const node = z.object({
  breakpoint: z.boolean().optional(),
  budget: budget.optional(),
  laneBindings: z.object({ provider: z.string().optional(), model: z.string().optional(),
    persona: z.string().optional(), cwd: z.string().optional() }).optional(),
  lanePersona: z.string().optional(),
  canvasToolsOnly: z.boolean().optional(),
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
    "role",
    "flow",
  ]),
  flowType: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/).optional(),
  config: z.record(z.string(), z.json()).optional(),
  configVersion: z.number().int().nonnegative().optional(),
  title: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  expanded: z.boolean(),
  parentId: z.string().optional(),
  fanout: fanoutPairIds.optional(),
  masterOf: assetId.optional(),
  generatedBy: assetId.optional(),
  itemKey: assetId.optional(),
  itemTitle: z.string().optional(),
  masterNodeId: assetId.optional(),
  laneIndex: z.number().int().nonnegative().optional(),
  overridden: z.boolean().optional(),
  removed: z.boolean().optional(),
  generatedRevision: generationRevision,
  sessionId: z.string().optional(),
  workspaceId: z.string().optional(),
  cwd: z.string().optional(),
  branch: z.string().optional(),
  worktreePath: z.string().optional(),
  agentPreset: z.string().optional(),
  teamRef: teamReferenceSchema.optional(),
  teamConfig: z.object({
    persona: z.string(),
    norms: z.string(),
    model: teamModelSchema.optional(),
  }).optional(),
  teamLayout: z.enum(["row", "orbit", "tree"]).optional(),
  roleRef: assetId.optional(),
  teamModel: teamModelSchema.optional(),
  maxInstances: z.number().int().positive().max(8).optional(),
  staffOf: z.string().optional(),
  slotId: z.string().regex(SLOT_ID, "Invalid native subagent slot name").optional(),
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
  tab: z.enum(["task", "conversation", "execution", "crew"]).optional(),
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
  boardSettings: boardSettings.optional(),
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

const spill = z.object({
  locator: z.string().min(1), preview: z.string(), bytes: z.number().int().nonnegative(),
});
const contentItem = z.object({
  key: z.string().min(1), value: z.json().optional(), spill: spill.optional(),
}).refine(item => (item.value !== undefined) !== !!item.spill, "条目必须包含一个值或 spill 引用");

export const flowContentSchema: z.ZodType<FlowContent> = z.object({
  dataType: z.enum(["text", "record", "list", "signal", "file"]),
  value: z.json().optional(),
  items: z.array(contentItem).optional(),
  originalCount: z.number().int().nonnegative().optional(),
  spill: spill.optional(),
}).superRefine((content, ctx) => {
  if (content.dataType === "list") {
    if (!content.items || content.spill || content.value !== undefined)
      ctx.addIssue({ code: "custom", message: "列表内容必须使用有序条目" });
    else if (new Set(content.items.map(item => item.key)).size !== content.items.length)
      ctx.addIssue({ code: "custom", path: ["items"], message: "列表条目标识重复" });
    else if (content.originalCount !== undefined && content.originalCount < content.items.length)
      ctx.addIssue({ code: "custom", path: ["originalCount"], message: "原始项数小于已保留项数" });
    return;
  }
  if (content.items || (content.spill && content.value !== undefined)) {
    ctx.addIssue({ code: "custom", message: "内容值与条目、spill 引用不能混用" });
  } else if (!content.spill && (
    (content.dataType === "text" && typeof content.value !== "string") ||
    (content.dataType === "record" && (!content.value || typeof content.value !== "object" || Array.isArray(content.value))) ||
    (content.dataType === "file" && content.value === undefined)
  )) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "内容与端口类型不符" });
  }
});

const edge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  generatedBy: assetId.optional(),
  itemKey: assetId.optional(),
  masterEdgeId: assetId.optional(),
  generatedRevision: generationRevision,
  sourcePort: z.string().optional(),
  targetPort: z.string().optional(),
  emitMode: z.enum(["stream", "end"]).optional(),
  permission: z.enum(["read", "advance", "edit"]).optional(),
  ask: z.boolean().optional(),
  delivery: z.object({ mode: z.enum(["lines", "paragraph", "list"]), columnId: z.string().optional() }).optional(),
  logic: z.object({
    negate: z.boolean().optional(),
    fromRound: z.number().int().nonnegative().optional(),
    maxTimes: z.number().int().nonnegative().optional(),
    delayMs: z.number().int().nonnegative().optional(),
  }).optional(),
  kind: z.enum(["reference", "continuation", "event"]),
  event: z.object({
    mode: z.enum(["end", "change", "continuous"]),
    kinds: z.array(z.enum(["running", "waiting", "done", "error", "budget", "output", "tool", "usage", "container"])),
    reasons: z.array(z.string()).optional(),
    cooldownMs: z.number().int().nonnegative().optional(),
    maxTimes: z.number().int().positive().optional(),
    full: z.boolean().optional(),
  }).optional(),
  mode: z.enum(["conclusion", "session", "fork"]),
  trigger: z.enum(["off", "auto", "confirm"]),
  maxRounds: z.number().int().positive(),
  always: z.boolean(),
  sentVersion: z.string().optional(),
  currentVersion: z.string().optional(),
  sourceItemKey: z.string().optional(),
  snapshotTitle: z.string().optional(),
  snapshotText: z.string().optional(),
  snapshotContent: flowContentSchema.optional(),
  originMode: z.enum(["conclusion", "session", "fork"]).optional(),
  waypoints: z.array(waypoint).optional(),
  placedCapsules: z.array(z.string()).optional(),
});

export const workflowTemplateSchema: z.ZodType<WorkflowTemplate> = z.object({
  id: z.string(),
  fanout: fanoutPairIds.optional(),
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
  containerRevision: z.number().int().nonnegative().optional(),
  version: z.literal(1),
  generationRevision,
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
    automaticTriggers: z.boolean().optional(),
    budget: budget.optional(),
    triggerGuards: z.object({
      cooldownSec: z.number().nonnegative().optional(), dailyLimit: z.number().int().positive().optional(),
      busy: z.enum(["skip", "queue", "interrupt"]).optional(),
    }).optional(),
    listLimit: z.number().int().positive().optional(),
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
      ).transform((run) => {
        // Older runs only timestamped the snapshot captured when producing a token.
        for (const token of run.tokens) token.createdAt ??= token.source.capturedAt;
        return run;
      }),
    ),
    templates: domainTable(workflowTemplateSchema),
    snapshots: domainTable(canvasSnapshotSchema),
    roles: domainTable(roleDefinitionSchema),
    teams: domainTable(teamBlueprintSchema),
    team_sessions: domainTable(teamSessionSchema),
    variables: domainTable(variableRecordSchema),
    play_counters: domainTable(z.object({ next: z.number().int().nonnegative(), lastStep: z.string(), index: z.number().int().nonnegative() })),
    arena_results: domainTable(z.object({ id: z.string(), runId: z.string(), tag: z.string(), model: teamModelSchema, won: z.boolean() })),
    triggers: domainTable(z.object({
      id: z.string(), nextAt: z.number().optional(), lastAt: z.number().optional(), hits: z.number(),
      missed: z.number(), day: z.string().optional(), configKey: z.string().optional(),
      queued: z.array(z.custom<import("../types.ts").ContextSnapshot>()).optional(),
      observed: z.record(z.string(), z.string()).optional(),
    })),
    content_spills: domainTable(spill.extend({
      encoding: z.enum(["text", "json"]), retrievalHint: z.string(),
    })),
    container_changes: domainTable(z.object({
      id: z.string(), nodeId: z.string(), itemId: z.string().optional(), edgeId: z.string().optional(),
      sessionId: z.string().optional(), runId: z.string().optional(), stepId: z.string().optional(),
      by: z.string(), at: z.number(), revision: z.number().int().positive(),
      before: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("board"), columnId: z.string(), beforeId: z.string().optional(), card: boardCard }),
        z.object({ kind: z.literal("note"), text: z.string() }),
        z.object({ kind: z.literal("file"), text: z.string(), path: z.string(), cwd: z.string() }),
      ]).nullable(),
      after: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("board"), columnId: z.string(), beforeId: z.string().optional(), card: boardCard }),
        z.object({ kind: z.literal("note"), text: z.string() }),
        z.object({ kind: z.literal("file"), text: z.string(), path: z.string(), cwd: z.string() }),
      ]).nullable(),
      beforeVersion: z.string(), afterVersion: z.string(),
      pending: z.boolean().optional(), revertedBy: z.string().optional(),
    })),
  },
});

function checkGraph(graph: Pick<FlowspaceDocument, "nodes" | "edges">): void {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const missingPlugins = new Set<string>();
  for (const n of graph.nodes) {
    if (n.fanout) {
      const fan = nodes.get(n.fanout.fanId), merge = nodes.get(n.fanout.mergeId);
      if (n.kind !== "group" || fan?.flowType !== "flowspace/fanout" || merge?.flowType !== "flowspace/merge-sort" ||
          fan.parentId !== n.id || merge.parentId !== n.id) throw new Error("扇出与合并必须位于所属的扇出分组内");
    }
    if (n.generatedBy && (!n.itemKey || (!n.masterNodeId && !n.overridden) || n.laneIndex === undefined ||
        nodes.get(n.generatedBy)?.flowType !== "flowspace/fanout")) throw new Error("泳道节点缺少条目、母版或扇出来源");
    if (n.window === null) {
      delete n.window;
    } else if (n.window && n.window.snap === null) {
      delete n.window.snap;
    }
    if (n.kind === "board") graph.edges = pruneBoardReferences(n, graph.edges);
    if (n.kind !== "flow") continue;
    const descriptor = descriptorOf(n.flowType);
    if (!descriptor) {
      missingPlugins.add(n.id);
      continue;
    }
    const version = n.configVersion ?? 1;
    if (version > descriptor.version)
      throw new Error(`${n.title}：配置版本 ${version} 高于已安装的 ${descriptor.version}`);
    let config = n.config ?? descriptor.defaultConfig;
    if (n.config && version < descriptor.version && descriptor.migrate)
      config = descriptor.migrate(n.config, version);
    const parsed = descriptor.configSchema.safeParse(config);
    if (!parsed.success) throw new Error(`${n.title}：节点配置无效（${z.prettifyError(parsed.error)}）`);
    n.config = parsed.data;
    n.configVersion = descriptor.version;
  }
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source), target = nodes.get(edge.target);
    const result = canConnect({
      ...edge, source, target,
      edges: graph.edges, edgeId: edge.id,
    });
    if (result.ok) {
      if (edge.kind === "event") {
        const seen = new Set([edge.target]);
        const pending = [edge.target];
        while (pending.length) {
          const current = pending.pop()!;
          for (const link of graph.edges) {
            if (link.source !== current || link.kind === "reference" || link.trigger === "off" || seen.has(link.target)) continue;
            seen.add(link.target);
            pending.push(link.target);
          }
        }
        if ((target?.kind === "agent" || seen.has(edge.source)) && !edge.event?.cooldownMs)
          throw new Error("发往 Agent 或构成环路的事件线需要冷却时间");
        if (seen.has(edge.source) && !edge.event?.maxTimes) throw new Error("事件环路需要次数上限");
      }
      if (edge.emitMode && (source?.kind !== "agent" || edge.kind !== "continuation" ||
          !target || !structuredInput(target, edge.targetPort))) throw new Error("产出模式需要 Agent 接续到列表或记录输入");
      if (edge.emitMode === "stream" && target && !canStreamTo(target, edge.targetPort))
        throw new Error("随出随发需要扇出、合并分拣或数据节点");
      continue;
    }
    // An uninstalled plugin owns these port IDs. Preserve the edge until it is available again.
    if (result.reason === "flow_invalid_output" && missingPlugins.has(edge.source)) continue;
    if (result.reason === "flow_invalid_input" && missingPlugins.has(edge.target)) continue;
    throw new Error(tFor("zh", result.reason));
  }
}

export function checkDocument(doc: FlowspaceDocument): void {
  checkGraph(doc);
  for (const template of doc.templates ?? []) checkGraph(template);
  for (const snapshot of doc.snapshots ?? []) checkGraph(snapshot);

  const ids = new Set(doc.nodes.map((n) => n.id));
  if (ids.size !== doc.nodes.length) throw new Error("节点身份重复");
  const sessions = doc.nodes.flatMap((n) => (n.sessionId ? [n.sessionId] : []));
  if (sessions.length !== new Set(sessions).size)
    throw new Error("一个会话只能对应一个 Agent 节点");
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const staffSlots = new Map<string, Set<string>>();
  for (const n of doc.nodes) {
    if ((n.teamRef || n.teamConfig) && n.kind !== "agent") throw new Error("团队必须使用 Agent 节点");
    if (n.teamRef && n.teamConfig) throw new Error("团队只能引用编制库或在画布上组建，不能同时使用");
    if (n.staffOf !== undefined) {
      if (n.kind !== "role") throw new Error("只有岗位节点可以接入团队");
      if (byId.get(n.staffOf)?.kind !== "agent") throw new Error("岗位节点只能接入 Agent 节点");
      const taken = staffSlots.get(n.staffOf) ?? new Set<string>();
      if (n.slotId && taken.has(n.slotId)) throw new Error(`同一团队的岗位名重复: ${n.slotId}`);
      if (n.slotId) taken.add(n.slotId);
      staffSlots.set(n.staffOf, taken);
    }
    if (!n.parentId) continue;
    const parent = doc.nodes.find((p) => p.id === n.parentId);
    if (!parent || parent.kind !== "group" || parent.id === n.id)
      throw new Error("无效分组");
    const grand =
      parent.parentId && doc.nodes.find((p) => p.id === parent.parentId);
    if (grand && (grand.parentId || n.kind === "group"))
      throw new Error("分组最多两层");
  }
}
