import type { Context } from "@deepseek-ai/cordis";
import type { KvTable } from "@deepseek-ai/dsh-storage-domain";
import { Cron, RRule } from "@deepseek-ai/dsh-util-time";
import { checkAnswers, humanConfig, noticeConfig, triggerConfig, triggerNode } from "../../core/nodes/interactions.ts";
import { contentList } from "../../core/content.ts";
import { snapshotWithContent } from "../../core/nodes/input.ts";
import type { NodeExecutor } from "../../core/nodes/types.ts";
import type { ContextSnapshot, FlowNode, FlowNotice, FlowspaceDocument, FlowspaceRun, HumanField, JsonObject, TriggerStatus } from "../../types.ts";
import type { Scheduler } from "../../core/scheduler.ts";
import type { HostGitService } from "../git.ts";
import { streamLlmText } from "../llm.ts";
import { SerialQueue } from "../serialQueue.ts";

declare module "@deepseek-ai/dsh-llm/types" {
  interface LlmRequestPurposeMap { "flowspace-form-prefill": true }
}

export const humanExecutor = (ctx: Context): NodeExecutor => async (node, step, signal) => {
  const config = humanConfig.parse(node.config);
  const fields: HumanField[] = node.flowType === "flowspace/human-score" ? [
    { name: "score", label: "flow_human_rating", type: config.rating === "like" ? "like" : "score", required: true },
    { name: "comment", label: "flow_human_comment", type: "text" },
  ] : node.flowType === "flowspace/human-review" ? [
    { name: "text", label: "flow_human_review", type: "review", required: true },
  ] : config.fields;
  let initial: JsonObject = node.flowType === "flowspace/human-review" ? { text: step.sources.at(-1)?.text ?? "" } : {};
  if (config.timeoutAction === "default") initial = checkAnswers(fields, JSON.parse(config.defaultAnswer));
  if (config.aiPrefill && config.provider && config.model) {
    try {
      const res = await streamLlmText(ctx.llm, {
        provider: config.provider,
        model: config.model,
        signal,
        purpose: "flowspace-form-prefill",
        system: "Suggest form answers in a single JSON object keyed by field name.",
        userText: JSON.stringify({ question: config.question, fields, source: step.sources.at(-1)?.text }),
      });
      initial = checkAnswers(fields, JSON.parse(res.text));
    } catch { signal.throwIfAborted(); }
  }
  return { awaiting: {
    question: config.question, fields, initial, options: ["out", "skip"],
    timeoutAction: config.timeoutAction, defaultOption: "out",
    ...(config.timeoutSec && config.timeoutAction !== "wait" ? { deadline: Date.now() + config.timeoutSec * 1000 } : {}),
  } };
};

export const noticeExecutor = (notify: (notice: FlowNotice) => void): NodeExecutor => async (node, step) => {
  const config = noticeConfig.parse(node.config);
  const source = step.sources.at(-1);
  const value = source?.content?.value;
  const summary = value && typeof value === "object" && !Array.isArray(value) && typeof value.summary === "string"
    ? value.summary : undefined;
  const text = config.message || summary || source?.text.slice(0, 1000) || node.title;
  notify({ id: step.id, at: Date.now(), title: config.title || node.title, text, system: config.system, sound: config.sound });
  return { route: "out", output: text, source: snapshotWithContent(node, { dataType: "text", value: text }) };
};

type TriggerConfig = ReturnType<typeof triggerConfig.parse>;
export function triggerNext(config: TriggerConfig, after: number): number | undefined {
  if (config.mode === "interval") return after + config.intervalSec * 1000;
  if (config.mode !== "cron" && config.mode !== "rrule") return undefined;
  const result = config.mode === "cron" ? Cron.parse(config.schedule, config.timeZone) : RRule.parse(config.schedule);
  if (result.kind === "rejected") throw new Error(result.detail);
  const next = result.rule.next(after);
  return next === undefined ? undefined : Date.parse(next);
}

export function validateTriggers(document: FlowspaceDocument) {
  for (const node of document.nodes) {
    if (node.flowType !== triggerNode.flowType) continue;
    const config = triggerConfig.parse(node.config);
    if (config.enabled) triggerNext(config, Date.now());
    if (config.match && config.mode === "terminal") new RegExp(config.match, "u");
  }
}

export class TriggerService {
  private startedAt = Date.now();
  private readonly serial: SerialQueue;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly observedAtBoot = new Set<string>();
  constructor(
    private readonly ctx: Context,
    private readonly table: KvTable<string, TriggerStatus>,
    private readonly scheduler: Scheduler,
    private readonly git: HostGitService,
    private readonly document: () => FlowspaceDocument,
    private readonly runs: () => FlowspaceRun[],
    private readonly publish: () => void,
    private readonly path: (request: { cwd?: string; path: string }) => { base: string; full: string; rel: string },
    private readonly changes: () => { nodeId: string; columnId?: string; at: number; key: string }[],
  ) {
    this.serial = new SerialQueue((error) => this.ctx.logger.warn("FlowSpace 触发器：%s", error));
  }

  list() { return [...this.table.entries()].map(([, value]) => value); }

  start() {
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      void this.queue(() => this.tick(Date.now())).catch(() => undefined).finally(() => { this.running = false; });
    }, 1000);
    this.timer.unref();
    return () => clearInterval(this.timer);
  }

  private queue<T>(action: () => Promise<T>) {
    return this.serial.run(action);
  }

  launch(id: string, values: JsonObject) {
    return this.queue(async () => {
      const node = this.document().nodes.find(node => node.id === id && node.flowType === triggerNode.flowType);
      if (!node) throw new Error("启动台已移除");
      const config = triggerConfig.parse(node.config);
      if (config.mode !== "launchpad") throw new Error("此触发器不是启动台");
      const answer = checkAnswers(config.fields, values);
      const source = snapshotWithContent(node, config.fields.length ? { dataType: "record", value: answer } :
        { dataType: "text", value: node.title });
      const status = this.table.get(id) ?? { id, hits: 0, missed: 0 };
      const run = await this.scheduler.startTriggered(id, source);
      await this.save({ ...status, lastAt: Date.now(), hits: status.hits + 1 });
      return run;
    });
  }

  private async save(status: TriggerStatus) {
    await this.table.put(status.id, status);
    this.publish();
  }

  private active(id: string) {
    return this.runs().findLast(run => run.triggerId === id && ["running", "waiting", "paused"].includes(run.state));
  }

  private async fire(node: FlowNode, config: TriggerConfig, state: TriggerStatus, source: ContextSnapshot, now: number) {
    const defaults = this.document().settings.triggerGuards;
    const day = new Intl.DateTimeFormat("sv-SE", { timeZone: config.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    if (day !== state.day) Object.assign(state, { day, hits: 0 });
    if (now - (state.lastAt ?? 0) < (config.cooldownSec ?? defaults?.cooldownSec ?? 0) * 1000 ||
        state.hits >= (config.dailyLimit ?? defaults?.dailyLimit ?? Infinity)) {
      state.missed++;
      return;
    }
    const active = this.active(node.id);
    if (active) {
      const strategy = config.busy ?? defaults?.busy ?? "skip";
      if (strategy === "skip") { state.missed++; return; }
      if (strategy === "queue") { (state.queued ??= []).push(source); return; }
      await this.scheduler.command(active.id, "cancel");
    }
    state.lastAt = now;
    state.hits++;
    await this.save(state);
    await this.scheduler.startTriggered(node.id, source);
  }

  private async observe(node: FlowNode, config: TriggerConfig): Promise<Record<string, string> | undefined> {
    if (config.mode === "file" && config.path.trim()) {
      const { base, full, rel } = this.path({ path: config.path, cwd: config.cwd || node.worktreePath || node.cwd });
      const root = await this.ctx.fs.resolve(base);
      const target = await this.ctx.fs.resolve(full);
      if (!this.ctx.fs.contains(root, target)) throw new Error("触发路径超出工作区");
      const info = await this.ctx.fs.stat(target);
      if (info?.type === "directory") {
        const files = (await this.ctx.fs.listDir(target)).filter(entry => entry.type === "file");
        return Object.fromEntries(await Promise.all(files.map(async entry => [
          rel === "." || !rel ? entry.name : `${rel.replaceAll("\\", "/")}/${entry.name}`,
          entry.version ?? (await this.ctx.fs.stat(entry.target))?.version ?? "",
        ])));
      }
      return info ? { [rel]: info.version } : {};
    }
    if (config.mode === "git") {
      const directory = this.path({ path: ".", cwd: config.cwd || node.worktreePath || node.cwd }).base;
      const status = await this.git.inspect(directory);
      if (config.match === "commit") return { commit: status.commits[0]?.oid ?? "" };
      if (config.match === "branch") return { branch: status.branch };
      return { git: status.revision };
    }
    if (config.mode === "terminal") {
      const all = this.runs().flatMap(run => run.steps.filter(step => step.operationResult &&
        (!config.sourceNodeId || step.nodeId === config.sourceNodeId)));
      const found = all.findLast(step => config.match ? new RegExp(config.match, "u").test(step.output ?? "") : step.operationResult!.exitCode !== 0);
      return found ? { terminal: found.id, output: found.output?.slice(0, 512) ?? "" } : {};
    }
    if (config.mode === "container") {
      const board = this.document().nodes.find(node => node.id === config.sourceNodeId && node.kind === "board");
      if (board) return Object.fromEntries((board.columns ?? [])
        .filter(column => !config.match || config.match === column.id)
        .flatMap(column => column.cards.map(card => [card.id, column.id])));
      const found = this.changes().findLast(change => (!config.sourceNodeId || change.nodeId === config.sourceNodeId) &&
        (!config.match || change.columnId === config.match));
      return found ? { container: found.key, at: String(found.at) } : {};
    }
  }

  async tick(now: number) {
    const doc = this.document();
    const nodes = doc.nodes.filter(node => node.flowType === triggerNode.flowType);
    for (const node of nodes) {
      const config = triggerConfig.parse(node.config);
      if (!config.enabled || config.mode === "launchpad") continue;
      const old = this.table.get(node.id);
      const configKey = JSON.stringify([config.mode, config.schedule, config.timeZone, config.intervalSec, config.path, config.cwd, config.sourceNodeId, config.match]);
      const state: TriggerStatus = old?.configKey === configKey ? structuredClone(old) :
        { id: node.id, hits: old?.hits ?? 0, lastAt: old?.lastAt, missed: old?.missed ?? 0, configKey, nextAt: triggerNext(config, now) };
      const scheduled = state.nextAt;
      if (scheduled && scheduled <= now) {
        let next = scheduled;
        if (config.mode === "interval") {
          const period = config.intervalSec * 1000;
          const missed = Math.floor((now - scheduled) / period);
          next = scheduled + (missed + 1) * period;
          state.missed += missed;
        } else {
          for (;;) {
            const occurrence = triggerNext(config, next);
            if (occurrence === undefined || occurrence > now) { next = occurrence ?? 0; break; }
            next = occurrence;
            state.missed++;
          }
        }
        state.nextAt = next || undefined;
        if (!doc.settings.automaticTriggers || scheduled < this.startedAt) state.missed++;
        else await this.fire(node, config, state, snapshotWithContent(node, {
          dataType: "text", value: new Date(scheduled).toISOString(),
        }), now);
      }
      const observed = await this.observe(node, config);
      const hasBaseline = this.observedAtBoot.has(node.id);
      if (observed) this.observedAtBoot.add(node.id);
      if (observed && JSON.stringify(observed) !== JSON.stringify(state.observed)) {
        const before = state.observed;
        state.observed = observed;
        if (before && Object.keys(observed).length + Object.keys(before).length) {
          const diff = [...new Set([...Object.keys(observed), ...Object.keys(before)])]
            .filter(key => observed[key] !== before[key]);
          if (doc.settings.automaticTriggers && old && hasBaseline) {
            const entered = diff.filter(key => observed[key] !== undefined);
            if (config.mode !== "container" || entered.length) {
              const source = snapshotWithContent(node, config.mode === "file" ? contentList(diff) :
                { dataType: "text", value: JSON.stringify(config.mode === "container"
                  ? Object.fromEntries(entered.map(key => [key, observed[key]])) : observed) });
              await this.fire(node, config, state, source, now);
            }
          } else state.missed++;
        }
      }
      if (doc.settings.automaticTriggers && state.queued?.length && !this.active(node.id)) {
        const source = state.queued.shift()!;
        await this.fire(node, config, state, source, now);
      }
      if (JSON.stringify(state) !== JSON.stringify(old)) await this.save(state);
    }
  }
}
