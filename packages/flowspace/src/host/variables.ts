import type { Context } from "@deepseek-ai/cordis";
import type { KvTable } from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";
import { containerPermission } from "../core/containers.ts";
import { DEFAULT_LIST_LIMIT } from "../core/content.ts";
import { snapshotWithContent } from "../core/nodes/input.ts";
import {
  VARIABLE_OPERATIONS, assignmentConfig, variableContent,
  variableNode, variableTemplate, variableValue, type VariableDefinition, type VariableOperation,
} from "../core/nodes/variables.ts";
import type { NodeExecutor } from "../core/nodes/types.ts";
import type { Scheduler } from "../core/scheduler.ts";
import type { ContextSnapshot, FlowNode, FlowspaceDocument, FlowspaceRun, JsonObject, JsonValue, RunStep, VariableRecord } from "../types.ts";
import { variableRecordSchema } from "./storage.ts";
import { approveWrite, jsonToolOutput, zodToolSchema } from "./toolPrimitives.ts";

export { variableRecordSchema };
const humanWrite = z.strictObject({ id: z.string(), runId: z.string().optional(), lane: z.string().optional(),
  expectedVersion: z.number().int().nonnegative(), value: z.json().optional() });
type VariableOwner = { runId?: string; lane?: string; stepId?: string; writer: string; writeId?: string };
type ScopeContext = { runId?: string; lane?: string };
const laneKey = (step?: RunStep) => step?.fanoutId && step.itemKey ? JSON.stringify([step.fanoutId, step.itemKey]) : undefined;

function applyOperation(current: VariableRecord, operation: VariableOperation, input: JsonValue): JsonValue {
  if (operation === "set") return variableValue(current.type, input);
  if (operation === "append" && current.type === "list") {
    const addition = Array.isArray(input) ? input : [input];
    return [...current.value as JsonValue[], ...addition];
  }
  if ((operation === "increment" || operation === "decrement") && current.type === "number") {
    const delta = variableValue("number", input) as number;
    return variableValue("number", (current.value as number) + delta * (operation === "increment" ? 1 : -1));
  }
  if (operation === "merge" && current.type === "record")
    return { ...current.value as JsonObject, ...variableValue("record", input) as JsonObject };
  throw new Error("此操作与变量类型不匹配");
}

export class VariableStore {
  constructor(
    private readonly table: KvTable<string, VariableRecord>,
    private readonly document: () => FlowspaceDocument,
    private readonly runs: () => FlowspaceRun[],
    private readonly publish: () => void,
    private readonly onWrite: (value: VariableRecord) => void,
  ) {}

  private definitions(runId?: string) {
    return (runId ? this.runs().find(run => run.id === runId)?.graph.nodes ?? [] : this.document().nodes)
      .filter(node => node.flowType === variableNode.flowType);
  }

  private definition(node: FlowNode) {
    return (node.config ?? variableNode.defaultConfig) as VariableDefinition;
  }

  private named(name: string, runId?: string) {
    const node = this.definitions(runId).find(node => this.definition(node).name === name);
    if (!node) throw new Error(`变量不存在：${name}`);
    return node;
  }

  private resolve(node: FlowNode, context: ScopeContext, strict: boolean): VariableRecord {
    const { name, scope, type, initial } = this.definition(node);
    const runId = scope !== "canvas" ? context.runId : undefined;
    const lane = scope === "lane" ? context.lane : undefined;
    if (strict && scope !== "canvas" && (!runId || (scope === "lane" && !lane)))
      throw new Error(`请选择「${name}」的运行或泳道`);
    const key = JSON.stringify([this.document().id, node.id, type, scope, runId, lane]);
    return { id: node.id, key, scope, type, version: 0, value: variableValue(type, initial), history: [],
      ...this.table.get(key), name, ...(runId ? { runId } : {}), ...(lane ? { lane } : {}) };
  }

  list() {
    const records = [...this.table.entries()].map(([, value]) => value);
    const defined = this.definitions();
    return [
      ...defined.map(node => this.resolve(node, {}, false)),
      ...records.filter(record => record.runId),
    ];
  }

  read(node: FlowNode, context: ScopeContext) {
    return this.resolve(node, context, false);
  }

  private async write(node: FlowNode, operation: VariableOperation, value: JsonValue, owner: VariableOwner, expectedVersion?: number) {
    const current = this.resolve(node, owner, true);
    if (owner.writeId && current.history.some(write => write.id === owner.writeId)) return current;
    if (expectedVersion !== undefined && expectedVersion !== current.version)
      throw new Error(`变量版本冲突。当前版本 v${current.version}。`);
    let next = applyOperation(current, operation, value);
    if (Array.isArray(next)) next = next.slice(0, this.document().settings.listLimit ?? DEFAULT_LIST_LIMIT);
    const version = current.version + 1;
    const history = current.history.concat({
      id: owner.writeId ?? crypto.randomUUID(), at: Date.now(), writer: owner.writer,
      from: current.value, to: next, version, runId: owner.runId, stepId: owner.stepId,
    });
    const result = { ...current, value: next, version, history };
    await this.table.put(result.key, result);
    this.publish();
    this.onWrite(result);
    return result;
  }

  async manualWrite(input: unknown) {
    const { id, runId, lane, value, expectedVersion } = humanWrite.parse(input);
    const node = this.definitions(runId).find(node => node.id === id);
    if (!node) throw new Error("变量已移除");
    await this.write(node, "set", value === undefined ? this.definition(node).initial : value,
      { runId, lane, writer: "用户" }, expectedVersion);
  }

  reference(node: FlowNode, run?: FlowspaceRun, step?: RunStep): ContextSnapshot {
    const result = this.resolve(node, { runId: run?.id, lane: laneKey(step) }, false);
    return {
      ...snapshotWithContent(node, variableContent(result.type, result.value, run?.listLimit ?? DEFAULT_LIST_LIMIT)),
      referenceKind: "variable", version: String(result.version), title: `${result.name} · v${result.version}`,
    };
  }

  prepare(node: FlowNode, task: string, run?: FlowspaceRun, step?: RunStep) {
    const values = new Map<string, ReturnType<VariableStore["read"]>>();
    const replace = (text: string) => text.replace(variableTemplate, (_whole, name: string) => {
      const result = values.get(name) ?? this.resolve(this.named(name, run?.id), { runId: run?.id, lane: laneKey(step) }, false);
      values.set(name, result);
      return typeof result.value === "string" ? result.value : JSON.stringify(result.value);
    });
    const visit = (value: JsonValue, field?: string): JsonValue => {
      if (typeof value === "string") return field === "source" ? value : replace(value);
      if (Array.isArray(value)) return value.map(entry => visit(entry));
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) =>
        [name, visit(item!, name)]));
      return value;
    };
    const resolvedTask = replace(task);
    const expanded = node.config ? visit(node.config) as JsonObject : undefined;
    const config = node.flowType?.startsWith("flowspace/exec-") ? node.config : expanded;
    if (node.breakpoint || run?.singleStep || run?.budget || node.budget) {
      for (const definition of this.definitions(run?.id)) {
        const record = this.resolve(definition, { runId: run?.id, lane: laneKey(step) }, false);
        if (!values.has(record.name)) values.set(record.name, record);
      }
    }
    const variables = [...values.values()].map(({ history, ...record }) => record);
    return { resolvedTask, config, variables };
  }

  assign: NodeExecutor = async (node, step, signal, options) => {
    const config = assignmentConfig.parse(node.config);
    const variable = this.named(config.name, options?.runId);
    const input = step.sources.at(-1);
    let value = config.inputValue && input ? input.content?.value ?? input.text : config.value;
    if (config.inputValue && input?.content?.dataType === "list") value = input.content.items!.map(item => item.value ?? null);
    signal.throwIfAborted();
    const result = await this.write(variable, config.operation, value,
      { runId: options?.runId, lane: laneKey(step), stepId: step.id, writer: node.title, writeId: step.id });
    const source = snapshotWithContent(node, variableContent(result.type, result.value, options?.listLimit ?? DEFAULT_LIST_LIMIT));
    return { route: "out", output: source.text, source: { ...source, version: String(result.version) } };
  };

  deliver(node: FlowNode, run: FlowspaceRun, step: RunStep | undefined, edgeId: string, source: ContextSnapshot) {
    const value = source.content?.dataType === "list" ? source.content.items!.map(item => item.value ?? null) : source.content?.value ?? source.text;
    return this.write(node, "set", value, { runId: run.id, lane: laneKey(step), stepId: step?.id,
      writer: step?.sessionId ?? source.title, writeId: JSON.stringify([step?.id, edgeId]) });
  }

  recordAccumulator(run: FlowspaceRun, step: RunStep, node: FlowNode, source: ContextSnapshot) {
    const value = source.content?.items?.map(item => item.value ?? item.spill?.preview ?? null) ?? [];
    const variable = { ...node, config: { name: node.title, scope: "run", type: "list", initial: "[]" } };
    return this.write(variable, "set", value, { runId: run.id, stepId: step.id, writer: node.title, writeId: step.id });
  }

  registerTools(ctx: Context, scheduler: Scheduler) {
    const mounts = (sessionId: string) => {
      const doc = this.document();
      const target = doc.nodes.find(node => node.kind === "agent" && node.sessionId === sessionId);
      if (!target) return [];
      return doc.edges.flatMap(edge => {
        if (edge.target !== target.id) return [];
        const node = doc.nodes.find(node => node.id === edge.source && node.flowType === variableNode.flowType);
        return node && containerPermission(node, edge) === "edit" ? [{ node, edge }] : [];
      });
    };
    const select = (sessionId: string, edgeId: string) => {
      const found = mounts(sessionId).find(item => item.edge.id === edgeId);
      if (!found) throw new Error("会话没有此变量的写入授权");
      return found;
    };
    const when = ({ agent }: { agent: { id: string } }) => mounts(agent.id).length > 0;
    const get = z.strictObject({ edgeId: z.string().optional() });
    const set = z.strictObject({ edgeId: z.string(), expectedVersion: z.number().int().nonnegative().optional(),
      operation: z.enum(VARIABLE_OPERATIONS).default("set"), value: z.json() });
    ctx.tools.register({
      name: "var_get", description: "List writable variables or get a variable's current value and version by its reference edge ID.",
      parameters: zodToolSchema(get), output: jsonToolOutput,
      execute: async (raw, exec) => {
        const args = get.parse(raw);
        const id = exec.agent!.id;
        const owner = scheduler.activeSessionStep(id);
        if (!args.edgeId) return { references: mounts(id).map(({ node, edge }) => ({ id: edge.id, name: this.definition(node).name })) };
        const result = this.read(select(id, args.edgeId).node, { runId: owner?.run.id, lane: laneKey(owner?.step) });
        return { value: result.value, version: result.version };
      },
    }, { when });
    ctx.tools.register({
      name: "var_set", description: "Set, append, increment, decrement or merge a mounted variable. Use var_get for its current version.",
      parameters: { type: "object", additionalProperties: false, required: ["edgeId", "value"], properties: {
        edgeId: { type: "string" }, expectedVersion: { type: "integer", minimum: 0 },
        operation: { type: "string", enum: [...VARIABLE_OPERATIONS] }, value: {},
      } }, output: jsonToolOutput,
      execute: async (raw, exec) => {
        const args = set.parse(raw);
        const id = exec.agent!.id;
        const before = select(id, args.edgeId);
        if (before.edge.ask) await approveWrite(ctx, exec, "var_set", before.node.title, "变量修改未获批准");
        return scheduler.transact(async () => {
          exec.signal.throwIfAborted();
          const current = select(id, args.edgeId);
          if (current.node.id !== before.node.id || (current.edge.ask && !before.edge.ask))
            throw new Error("变量的授权已变化");
          const owner = scheduler.activeSessionStep(id);
          const result = await this.write(current.node, args.operation, args.value, {
            runId: owner?.run.id, lane: laneKey(owner?.step), stepId: owner?.step.id,
            writer: id, writeId: JSON.stringify([id, owner?.step.id, exec.callId]),
          }, args.expectedVersion);
          return { value: result.value, version: result.version };
        });
      },
    }, { when });
  }
}
