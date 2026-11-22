import type {
  ContextSnapshot, FlowContent, FlowEdge, FlowItem, FlowNode, FlowspaceRun, FlowToken,
  JsonValue, RunFanout, RunFanoutLane, RunStep,
} from "../types.ts";
import { contentList, contentOf, DEFAULT_LIST_LIMIT } from "./content.ts";
import { uid } from "./document.ts";
import { fanoutPair, laneTitle, reconcileFanout } from "./fanout.ts";
import { stampGeneratedBatch } from "./generation.ts";
import { ancestorsOf } from "./graph.ts";
import { snapshotWithContent } from "./nodes/input.ts";
import type { RuntimeAdapter, SchedulerStore } from "./schedulerTypes.ts";

const active = (step: RunStep) => ["queued", "running", "settling", "awaiting"].includes(step.state);
const pending = (token: FlowToken) => !token.consumed && !token.dismissed;
const sourceValue = (content: FlowContent): JsonValue => content.dataType === "list"
  ? (content.items ?? []).map(item => item.value ?? null) : content.value ?? null;

function itemContent(value: JsonValue, limit: number): FlowContent {
  if (Array.isArray(value)) return contentList(value, limit);
  if (value && typeof value === "object") return { dataType: "record", value };
  return { dataType: typeof value === "string" ? "text" : "signal", value };
}

function incomingItems(snapshot: ContextSnapshot, limit: number): FlowItem[] {
  const content = contentOf(snapshot);
  if (content.dataType === "list") return content.items ?? [];
  if (content.dataType === "file" && Array.isArray(content.value)) {
    return contentList(content.value, limit, content.value.map(file => typeof file === "string" ? file : undefined)).items!;
  }
  throw new Error("扇出需要列表输入");
}

function openStream(run: FlowspaceRun, batch: RunFanout): boolean {
  if (!batch.producerStepId) return false;
  const producer = run.steps.find(step => step.id === batch.producerStepId);
  if (producer && active(producer)) return true;
  const upstream = new Set(ancestorsOf([batch.fanId], run.graph.edges, run.graph.nodes));
  if (run.steps.some(step => step.streamFrom === batch.producerStepId && upstream.has(step.nodeId) && active(step))) return true;
  const incoming = new Set(run.graph.edges.filter(edge => upstream.has(edge.target)).map(edge => edge.id));
  return run.tokens.some(token => token.streamFrom === batch.producerStepId && incoming.has(token.edgeId) && pending(token));
}

export function laneSessionTitle(run: FlowspaceRun, node: FlowNode): string | undefined {
  if (!node.generatedBy || node.laneIndex === undefined) return undefined;
  const pair = fanoutPair(run.graph, node.generatedBy);
  return laneTitle(pair?.group, node);
}

type DeliverLane = (edge: FlowEdge, step: RunStep, input: ContextSnapshot, batch: RunFanout) => void;
type Merge = (node: FlowNode, batch: RunFanout, result: ContextSnapshot, error?: string) => Promise<void>;
type CancelLane = (batch: RunFanout, lane: RunFanoutLane) => Promise<void>;
const unsettled = (lane: RunFanoutLane) => lane.state === "queued" || lane.state === "running";

/** Owns item identities, frozen lane input and completion barriers inside one Host scheduler. */
export class FanoutExecution {
  constructor(private runtime: RuntimeAdapter, private store: SchedulerStore, private runs: FlowspaceRun[]) {}

  private async hydrated(source: ContextSnapshot) {
    return this.runtime.hydrateContent ? this.runtime.hydrateContent(source) : source;
  }

  private async frozen(source: ContextSnapshot, run: FlowspaceRun) {
    return this.runtime.freezeContent ? this.runtime.freezeContent(source, run.listLimit) : source;
  }

  async receive(run: FlowspaceRun, fan: FlowNode, step: RunStep): Promise<void> {
    const pair = fanoutPair(run.graph, fan.id);
    if (!pair) throw new Error("扇出节点缺少对应的母版和合并节点");
    if (!step.sources.length) throw new Error("扇出需要列表输入");
    const batches = run.fanouts ??= [];
    let batch = step.streamFrom && batches.find(entry => entry.fanId === fan.id && entry.producerStepId === step.streamFrom);
    if (!batch) {
      batch = { id: uid(), fanId: fan.id, mergeId: pair.merge.id, groupId: pair.group.id,
        ...(step.streamFrom ? { producerStepId: step.streamFrom } : {}), closed: false, lanes: [] };
      batches.push(batch);
    }
    const limit = run.listLimit ?? DEFAULT_LIST_LIMIT;
    const added: RunFanoutLane[] = [];
    const keys = new Set(batch.lanes.map(lane => lane.item.key));
    for (const source of step.sources) {
      const items = incomingItems(source, limit);
      for (const item of items.slice(0, limit - batch.lanes.length - added.length)) {
        let key = item.key;
        for (let occurrence = 2; keys.has(key); occurrence++) key = `${item.key}#${occurrence}`;
        keys.add(key);
        let value = item.value ?? null;
        if (item.spill) {
          const hydrated = await this.hydrated(snapshotWithContent(fan, { dataType: "list", items: [item] }));
          value = hydrated.content!.items![0].value ?? null;
        }
        const input = await this.frozen({
          ...snapshotWithContent({ id: source.sourceNodeId, title: source.title }, itemContent(value, limit), source.capturedAt),
          sourceSessionId: source.sourceSessionId, seq: source.seq,
        }, run);
        const retired = !!batch.mergeStepId && pair.merge.config?.cancelRest === true;
        added.push({ item: { ...item, key }, fanStepId: step.id, input, state: retired ? "cancelled" : "queued",
          ...(batch.mergeStepId ? { adopted: false } : {}), ...(retired ? { endedAt: Date.now() } : {}) });
      }
    }
    batch.lanes.push(...added);
    // A later traversal of the same bracket can coexist with an earlier merge.
    const runItems = new Map(batches.filter(entry => entry.fanId === fan.id)
      .flatMap(entry => entry.lanes.map(lane => [lane.item.key, lane.item] as const)));
    reconcileFanout(run.graph, fan.id, [...runItems.values()], new Set(run.steps.map(existing => existing.nodeId)));
    const generated = run.graph.nodes.filter(node => node.generatedBy === fan.id && !node.removed).map(node => node.id);
    run.participants = [...new Set([...run.participants, ...generated])];
    if (run.scope?.includes(fan.id)) run.scope = [...new Set([...run.scope, ...generated])];
    const doc = this.store.document();
    if (fanoutPair(doc, fan.id)) {
      const beforeNodes = new Set(doc.nodes.map(node => node.id)), beforeEdges = new Set(doc.edges.map(edge => edge.id));
      const visible = new Set(doc.nodes.filter(node => node.generatedBy === fan.id && !node.removed).map(node => node.itemKey));
      const newKeys = new Set(added.map(lane => lane.item.key));
      const liveItems = new Map([...runItems].filter(([key]) => visible.has(key) || newKeys.has(key)));
      for (const other of this.runs) {
        if (other === run || !["running", "paused", "waiting"].includes(other.state)) continue;
        for (const group of other.fanouts ?? []) if (group.fanId === fan.id) {
          for (const lane of group.lanes) if (visible.has(lane.item.key)) liveItems.set(lane.item.key, lane.item);
        }
      }
      reconcileFanout(doc, fan.id, [...liveItems.values()], new Set(this.runs.flatMap(r => r.steps.map(s => s.nodeId))));
      stampGeneratedBatch(doc, beforeNodes, beforeEdges);
    }
    step.state = "completed";
    step.fanoutBatchId = batch.id;
    step.route = "out";
    step.endedAt = Date.now();
    step.output = String(added.length);
  }

  private async collect(run: FlowspaceRun, batch: RunFanout, lane: RunFanoutLane) {
    const terminal = run.graph.edges.filter(edge => edge.generatedBy === batch.fanId && edge.itemKey === lane.item.key &&
      edge.target === batch.mergeId && edge.kind === "continuation" && edge.trigger !== "off");
    const tokens = terminal.map(edge => run.tokens.find(token => token.fanoutBatchId === batch.id && token.edgeId === edge.id &&
      (pending(token) || token.dismissed)));
    const steps = run.steps.filter(step => step.fanoutBatchId === batch.id && step.itemKey === lane.item.key);
    const failed = steps.some(step => ["aborted", "interrupted", "error"].includes(step.state) ||
      (step.route === "error" && step.error));
    if (!terminal.length || tokens.some(token => !token || (!token.ready && !token.dismissed))) {
      const edges = new Set(run.graph.edges.filter(edge => edge.generatedBy === batch.fanId && edge.itemKey === lane.item.key).map(edge => edge.id));
      if (steps.some(active) || run.tokens.some(token => pending(token) && token.fanoutBatchId === batch.id && edges.has(token.edgeId))) return;
      lane.state = failed ? "error" : "skipped";
      lane.endedAt = Date.now();
      return;
    }
    const now = Date.now();
    const sources: ContextSnapshot[] = [];
    for (const token of tokens) {
      token!.consumed = true;
      token!.consumedAt ??= now;
      if (!token!.skip && !token!.dismissed) sources.push(token!.source);
    }
    lane.endedAt = Math.max(...tokens.map(token => token!.readyAt ?? token!.consumedAt ?? now));
    lane.readyOrder = Math.max(...tokens.map(token => token!.readyOrder ?? run.tokens.indexOf(token!)));
    lane.state = sources.length ? "completed" : failed ? "error" : "skipped";
    const ratingNode = steps.findLast(step => run.graph.nodes.find(node => node.id === step.nodeId)?.flowType === "flowspace/human-score");
    const rating = ratingNode?.human?.initial?.score;
    const ai = steps.findLast(step => typeof step.verdict?.confidence === "number");
    const merge = run.graph.nodes.find(node => node.id === batch.mergeId);
    if (merge?.config?.scoreBy === "ai" && ai?.verdict?.confidence !== undefined) lane.score = ai.verdict.confidence;
    else if (typeof rating === "number") lane.score = rating;
    else if (typeof rating === "boolean") lane.score = rating ? 5 : 1;
    const member = run.graph.nodes.find(node => node.generatedBy === batch.fanId && node.itemKey === lane.item.key && node.kind === "agent");
    if (member?.teamModel) lane.model = member.teamModel;
    if (merge?.config?.wait === "best" && lane.score !== undefined && ratingNode?.sources[0])
      lane.result = ratingNode.sources[0];
    else if (sources.length === 1) lane.result = sources[0];
    else if (sources.length) {
      const hydrated = await Promise.all(sources.map(source => this.hydrated(source)));
      lane.result = await this.frozen(snapshotWithContent({ id: batch.mergeId, title: lane.item.key },
        contentList(hydrated.map(source => sourceValue(contentOf(source))), run.listLimit)), run);
    }
  }

  async mergedContent(run: FlowspaceRun, node: FlowNode, batch: RunFanout): Promise<ContextSnapshot> {
    const values: JsonValue[] = [], keys: string[] = [], texts: string[] = [];
    for (const lane of batch.lanes) {
      if (!lane.result || lane.adopted === false) continue;
      const source = await this.hydrated(lane.result);
      values.push(sourceValue(contentOf(source)));
      keys.push(lane.item.key);
      texts.push(source.text);
    }
    const content: FlowContent = node.config?.output === "text"
      ? { dataType: "text", value: texts.join("\n") }
      : contentList(values, run.listLimit, keys);
    return this.frozen(snapshotWithContent(node, content), run);
  }

  async collectCompleted(run: FlowspaceRun): Promise<void> {
    for (const batch of run.fanouts ?? []) {
      for (const lane of batch.lanes) {
        if (lane.state === "running") await this.collect(run, batch, lane);
      }
      batch.closed = !openStream(run, batch);
    }
  }

  private available(fanId: string): number {
    let occupied = 0, cap = Infinity;
    for (const owner of this.runs) {
      if (["cancelled", "completed", "interrupted"].includes(owner.state) ||
        (owner.state === "error" && !owner.steps.some(active))) continue;
      const groups = owner.fanouts?.filter(batch => batch.fanId === fanId && batch.lanes.some(unsettled));
      if (!groups?.length) continue;
      const node = owner.graph.nodes.find(node => node.id === fanId)!;
      cap = Math.min(cap, Number(node.config?.concurrency ?? 4));
      for (const group of groups) occupied += group.lanes.filter(lane => lane.state === "running").length;
    }
    return cap - occupied;
  }

  hasAdmission(run: FlowspaceRun): boolean {
    return !!run.fanouts?.some(group => group.lanes.some(lane => lane.state === "queued") && this.available(group.fanId) > 0);
  }

  private selection(batch: RunFanout, node: FlowNode): { chosen: RunFanoutLane[]; error?: string } | undefined {
    const winners = batch.lanes.filter(lane => lane.state === "completed" && lane.result);
    const done = batch.closed && !batch.lanes.some(unsettled);
    const wait = node.config?.wait ?? "all";
    if (wait === "best") {
      if (!done) return;
      const ranked = winners.filter(lane => lane.score !== undefined)
        .sort((a, b) => b.score! - a.score! || batch.lanes.indexOf(a) - batch.lanes.indexOf(b));
      return ranked.length ? { chosen: ranked.slice(0, 1) } : { chosen: [], error: "择优需要至少一条带有效评分的泳道结果" };
    }
    if (wait === "all") {
      if (!done) return;
      const failed = batch.lanes.find(lane => lane.state === "error");
      return { chosen: winners, ...(failed ? { error: `泳道未能生成结果：${failed.item.key}` } : {}) };
    }
    const needed = wait === "any" ? 1 : Number(node.config?.quorum ?? 1);
    if (winners.length >= needed) {
      winners.sort((a, b) => a.endedAt! - b.endedAt! || (a.readyOrder ?? 0) - (b.readyOrder ?? 0));
      return { chosen: winners.slice(0, needed) };
    }
    const possible = winners.length + batch.lanes.filter(unsettled).length;
    if (batch.closed && possible < needed) {
      return { chosen: [], error: `合并需要 ${needed} 条有效泳道，当前完成 ${winners.length} 条，最多可完成 ${possible} 条` };
    }
  }

  async pump(run: FlowspaceRun, deliver: DeliverLane, merge: Merge, cancel: CancelLane): Promise<boolean> {
    let changed = false;
    await this.collectCompleted(run);
    for (const batch of run.fanouts ?? []) {
      const node = run.graph.nodes.find(node => node.id === batch.mergeId)!;
      const decision = !batch.mergeStepId && this.selection(batch, node);
      if (decision) {
        const winners = new Set(decision.chosen);
        for (const lane of batch.lanes) {
          lane.adopted = winners.has(lane);
          if (!lane.adopted && unsettled(lane) && node.config?.cancelRest === true) await cancel(batch, lane);
        }
        await merge(node, batch, await this.mergedContent(run, node, batch), decision.error);
        changed = true;
      }
      let slots = this.available(batch.fanId);
      for (const lane of batch.lanes) {
        if (slots <= 0) break;
        if (lane.state !== "queued") continue;
        const item = (await this.hydrated(lane.input)).content?.value;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const field = (path?: string) => {
            if (!path) return undefined;
            let value: JsonValue = item;
            for (const name of path.split(".")) {
              if (!value || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(value, name)) return undefined;
              value = value[name] ?? null;
            }
            return typeof value === "string" ? value : undefined;
          };
          for (const member of run.graph.nodes.filter(node => node.generatedBy === batch.fanId && node.itemKey === lane.item.key && node.laneBindings)) {
            const bindings = member.laneBindings!;
            const provider = field(bindings.provider);
            const model = field(bindings.model);
            if (provider && model) member.teamModel = { provider, model };
            member.lanePersona = field(bindings.persona);
            const cwd = field(bindings.cwd);
            if (cwd) { member.cwd = cwd; member.worktreePath = cwd; }
          }
        }
        const step = run.steps.find(entry => entry.id === lane.fanStepId)!;
        const entries = run.graph.edges.filter(edge => edge.generatedBy === batch.fanId && edge.itemKey === lane.item.key &&
          edge.source === batch.fanId && edge.kind === "continuation" && edge.trigger !== "off");
        if (!entries.length) {
          lane.state = "error";
          lane.endedAt = Date.now();
          const message = "扇出母版需要接续到泳道首节点";
          if (!run.notes.includes(message)) run.notes.push(message);
          changed = true;
          continue;
        }
        for (const edge of entries) deliver(edge, step, lane.input, batch);
        lane.state = "running";
        slots--;
        changed = true;
      }
    }
    return changed;
  }
}
