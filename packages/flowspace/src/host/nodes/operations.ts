import { readFile } from "node:fs/promises";
import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
import { z } from "zod";
import { contentList, DEFAULT_LIST_LIMIT } from "../../core/content.ts";
import { snapshotWithContent } from "../../core/nodes/input.ts";
import { gitExec, gitOperation, isOperation, terminalOperation, type GitOperation, type TerminalOperation } from "../../core/nodes/operations.ts";
import { variableTemplate } from "../../core/nodes/variables.ts";
import type { ExecutionOptions, NodeExecutor } from "../../core/nodes/types.ts";
import type { Scheduler } from "../../core/scheduler.ts";
import type { FlowNode, FlowspaceDocument, FlowspaceRun, GitActionRequest, PreparedOperation, RunStep } from "../../types.ts";
import { approveWrite, jsonToolOutput } from "../containers.ts";
import { sameFsPath, type HostGitService } from "../git.ts";

declare module "@deepseek-ai/dsh-llm/types" {
  interface LlmRequestPurposeMap { "flowspace-parameters": true }
}

type OperationConfig = TerminalOperation | GitOperation;
const stringValues = z.record(z.string(), z.string());
const operationRequest = z.strictObject({ nodeId: z.string(), values: stringValues.default({}) });
const softActions = new Set(["discard", "push", "removeWorktree"]);
const requiredFields: Partial<Record<GitActionRequest["action"], string[]>> = {
  commit: ["message"], stage: ["paths"], unstage: ["paths"], discard: ["paths"], createBranch: ["branch"],
  checkoutBranch: ["branch"], createWorktree: ["branch"], removeWorktree: ["worktreePath"],
};
const shellQuote = (value: string, windows: boolean) => "'" + value.replaceAll("'", windows ? "''" : "'\\''") + "'";
const stdio = { maxBytes: 65_536, spill: { maxBytes: 16 * 1024 * 1024 } };

function configOf(node: FlowNode): OperationConfig {
  return node.flowType === gitExec.flowType ? gitOperation.parse(node.config) : terminalOperation.parse(node.config);
}

function directSource(run: FlowspaceRun | undefined, step: RunStep) {
  const matches = run?.steps.filter(entry => step.upstreamStepIds?.includes(entry.id)) ?? [];
  return matches.length === 1 ? matches[0].sessionId : undefined;
}

function interpolate(text: string, step: RunStep) {
  const expand = (value: string) => value.replace(variableTemplate, (_match, name: string) => {
    const variable = step.variables?.find(item => item.name === name);
    if (!variable) throw new Error(`变量不存在：${name}`);
    return typeof variable.value === "string" ? variable.value : JSON.stringify(variable.value);
  });
  return expand(text).replace(/\{\{\s*(input|task)\s*\}\}/g, (_match, key: string) =>
    key === "task" ? step.task : step.sources.at(-1)?.text ?? "");
}

type ShellResult = { exitCode: number | null; timedOut: boolean; stdout: string; stderr: string };
type ProcessOutput = { text: string; spillPath?: string };
interface Subprocess {
  resolveExecutable(name: string, env?: Record<string, string>, signal?: AbortSignal): Promise<string>;
  spawn(spec: { argv: string[]; cwd: string; stdio: { stdin: "ignore"; stdout: typeof stdio; stderr: typeof stdio };
    graceMs: number; signal: AbortSignal }): {
    done: Promise<{ exitCode: number | null }>;
    collected: { stdout: { readFrom(offset: number): ProcessOutput }; stderr: { readFrom(offset: number): ProcessOutput } };
  };
}
type ShellPolicy = { mode: string; workspaceRoot: string };
interface NativeTerminal {
  id: string;
  info: { state: "running" | "exited" | "failed"; shell: { path: string }; control?: "agent" | "user" };
  revision: number;
  changed(after: number, signal: AbortSignal): Promise<number>;
  write(data: string): Promise<void>;
  drain(): Promise<void>;
  mark(): { lines(): { lines: readonly string[] }; dispose(): void };
}
interface TerminalController {
  openForAgent(owner: unknown, request: { title: string; cwd: string; cols: number; rows: number;
    policy: ShellPolicy; preferredShells: string[] }, signal: AbortSignal): Promise<NativeTerminal>;
}
const fullOutput = (output: ProcessOutput) => output.spillPath ? readFile(output.spillPath, "utf8") : Promise.resolve(output.text);

export class OperationService {
  private readonly terminals = new Map<string, NativeTerminal>();
  private readonly terminalQueue = new Map<string, Promise<unknown>>();
  constructor(
    private readonly ctx: Context,
    private readonly git: HostGitService,
    private readonly document: () => FlowspaceDocument,
    private readonly runs: () => FlowspaceRun[],
    private readonly workdir: (directory?: string) => string,
    private readonly sessionDirectory: (id: string) => string | undefined,
  ) {}

  dispose(): void {
    this.terminals.clear();
    this.terminalQueue.clear();
  }

  private async agent(sessionId?: string) {
    if (!sessionId) return;
    const result = await this.ctx.sessionController.resolveAgent(sessionId as SessionId);
    return "error" in result ? undefined : result.agent;
  }

  private async fullAccess(id?: string) {
    const agent = await this.agent(id);
    const policy = this.ctx.get("sandboxPolicy") as {
      resolve(request: { session?: unknown }): { mode: string };
    } | undefined;
    return !!agent && policy?.resolve({ session: agent.session }).mode === "danger-full-access";
  }

  private async generate(config: OperationConfig, node: FlowNode, step: RunStep, name: string, signal: AbortSignal,
    record?: ExecutionOptions["recordCall"]) {
    if (!config.provider || !config.model) return undefined;
    const messages = [{ role: "user" as const, content: [{ type: "text" as const,
      text: JSON.stringify({ operation: node.title, parameter: name, sources: step.sources.map(source => source.text) }) }] }];
    let text = "";
    let inputTokens = 0, outputTokens = 0;
    const startedAt = Date.now();
    for await (const chunk of this.ctx.llm.stream({
      provider: config.provider, model: config.model, signal, messages, purpose: "flowspace-parameters",
      system: 'Give the requested operation parameter as a JSON object {"value":"..."}.',
    })) {
      if (chunk.type === "text-delta") text += chunk.text;
      if (chunk.type === "usage") {
        inputTokens += chunk.usage.inputTokens;
        outputTokens += chunk.usage.outputTokens;
      }
    }
    await record?.({ id: crypto.randomUUID(), operation: "execution parameter", provider: config.provider, model: config.model,
      startedAt, endedAt: Date.now(), inputTokens, outputTokens, inputSummary: name, outputSummary: text.slice(0, 240) });
    try { return z.object({ value: z.string().min(1) }).parse(JSON.parse(text)).value; }
    catch { return undefined; }
  }

  private preview(config: OperationConfig, values: Record<string, string>, cwd: string) {
    return "program" in config
      ? `${cwd}\n${JSON.stringify([config.program, ...config.parameters.map(parameter => values[parameter.name] ?? "…")])}`
      : `${cwd}\n${JSON.stringify({ action: config.action, ...values }, null, 2)}`;
  }

  private async prepare(node: FlowNode, config: OperationConfig, step: RunStep, run: FlowspaceRun | undefined,
    signal: AbortSignal, sessionId = directSource(run, step), supplied: Record<string, string> = {},
    record?: ExecutionOptions["recordCall"]): Promise<PreparedOperation> {
    const directory = config.cwd || node.worktreePath || node.cwd || (sessionId ? this.sessionDirectory(sessionId) : undefined);
    const cwd = this.workdir(directory);
    if (directory && !sameFsPath(directory, cwd)) throw new Error("执行目录不在可用的工作区内");
    const values: Record<string, string> = {};
    const parent = run?.steps.findLast(entry => step.upstreamStepIds?.includes(entry.id) && entry.sessionId === sessionId);
    const prefetched = parent?.operationParameters?.[node.id] ?? {};
    const missing: string[] = [];
    for (const parameter of config.parameters) {
      const { name, source, value } = parameter;
      let resolved = source === "fixed" ? value : source === "template" ? interpolate(value, step) : undefined;
      if (source === "upstream") {
        const input = step.sources.at(-1)?.content?.value;
        const entry = input && typeof input === "object" && !Array.isArray(input) ? input[name] : undefined;
        resolved = supplied[name] ?? prefetched[name] ?? (typeof entry === "string" ? entry : undefined)
          ?? (value === "" ? undefined : interpolate(value, step))
          ?? await this.generate(config, node, step, name, signal, record);
      }
      if (source === "model") resolved = await this.generate(config, node, step, name, signal, record);
      if (source === "human") resolved = supplied[name];
      if (resolved === undefined || (source !== "fixed" && !resolved.trim())) missing.push(name);
      else values[name] = resolved;
    }
    if ("action" in config) {
      const required = requiredFields[config.action] ?? [];
      for (const field of required) if (!values[field]?.trim() && !missing.includes(field)) missing.push(field);
    }
    const revision = "action" in config ? (await this.git.inspect(cwd)).revision : undefined;
    return { cwd, sessionId, values, missing, preview: this.preview(config, values, cwd), revision };
  }

  private async requiresApproval(config: OperationConfig, operation: PreparedOperation) {
    if (await this.fullAccess(operation.sessionId)) return false;
    if ("action" in config && (softActions.has(config.action) || config.action === "checkoutBranch" &&
        this.document().nodes.filter(node => node.sessionId && sameFsPath(
          this.sessionDirectory(node.sessionId) ?? node.worktreePath ?? node.cwd, operation.cwd)).length > 1)) return true;
    if (config.approved.includes(operation.preview)) return false;
    return config.parameters.some(parameter => parameter.source === "model" || parameter.source === "upstream");
  }

  execute: NodeExecutor = async (node, step, signal, options) => {
    const config = configOf(node);
    const run = this.runs().find(run => run.id === options?.runId);
    const operation = step.operation ?? await this.prepare(node, config, step, run, signal, undefined, {}, options?.recordCall);
    operation.preview = this.preview(config, operation.values, operation.cwd);
    const followup = config.retryUpstream && operation.sessionId && operation.missing.length &&
      !run?.steps.some(entry => entry.parameterRetryFor === step.id) &&
      config.parameters.some(parameter => parameter.source === "upstream" && operation.missing.includes(parameter.name));
    if (operation.missing.length || (!operation.approved && (operation.review || await this.requiresApproval(config, operation)))) {
      return { operation, awaiting: {
        question: operation.preview, options: ["execute", "skip", ...(followup ? ["retry"] : [])], operation: true,
        fields: operation.missing.map(name => ({ name, label: name, type: "text", required: true })),
      } };
    }
    const result = await this.perform(node, config, operation, signal);
    const failed = result.exitCode !== 0 || result.timedOut;
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n") ||
      (result.timedOut ? "执行超时" : failed ? `执行失败（退出码 ${result.exitCode ?? "未知"}）` : "");
    const content = "outputMode" in config && config.outputMode === "lines" && result.exitCode === 0
      ? contentList(output.split(/\r?\n/).filter(Boolean), options?.listLimit ?? DEFAULT_LIST_LIMIT)
      : { dataType: "text" as const, value: output };
    return { operation, operationResult: { ...result, stdout: result.stdout.slice(0, 4096), stderr: result.stderr.slice(0, 4096) },
      route: failed ? "error" : "out", output, source: snapshotWithContent(node, content) };
  };

  private async perform(node: FlowNode, config: OperationConfig, operation: PreparedOperation, signal: AbortSignal): Promise<ShellResult> {
    signal.throwIfAborted();
    if ("action" in config) {
      const fields = operation.values;
      const request: GitActionRequest = { action: config.action, expectedRevision: operation.revision,
        paths: fields.paths?.split(/\r?\n/).filter(Boolean), branch: fields.branch, message: fields.message,
        baseRef: fields.baseRef, worktreePath: fields.worktreePath };
      const result = await this.git.act(operation.cwd, request);
      return { exitCode: 0, timedOut: false, stdout: result.commits[0]?.oid ?? result.branch ?? config.action, stderr: "" };
    }
    if (!config.program.trim()) throw new Error("请先指定可执行程序");
    const subprocess = this.ctx.get("subprocess") as Subprocess | undefined;
    if (!subprocess) throw new Error("此 DSH 配置没有子进程服务");
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), Math.round(config.timeoutSec * 1000));
    timer.unref();
    const timeout = deadline.signal;
    const combined = AbortSignal.any([signal, timeout]);
    const args = config.parameters.map(parameter => operation.values[parameter.name]);
    try {
      if (config.mode === "interactive") return await this.interactive(node, config, operation, args, combined);
      if (config.sandbox) {
        const shell = this.ctx.get("shell") as {
          sandboxMode?: string; resolve(input: object): unknown;
          execute(spec: unknown): { result(): Promise<{ exitCode: number | null; timedOut: boolean; stdout: ProcessOutput; stderr: ProcessOutput }> };
        } | undefined;
        if (!shell?.sandboxMode || shell.sandboxMode === "danger-full-access") throw new Error("此 DSH 配置没有启用受限 Shell 执行器");
        const pwsh = /pwsh/i.test(shell.constructor.name);
        const command = (pwsh ? "& " : "") + [config.program, ...args].map(arg => shellQuote(arg, pwsh)).join(" ");
        const result = await shell.execute(shell.resolve({ command, workdir: operation.cwd, signal: combined,
          timeoutMs: Math.round(config.timeoutSec * 1000) })).result();
        const [stdout, stderr] = await Promise.all([fullOutput(result.stdout), fullOutput(result.stderr)]);
        return { exitCode: result.exitCode, timedOut: result.timedOut || timeout.aborted, stdout, stderr };
      }
      const exe = await subprocess.resolveExecutable(config.program, undefined, combined);
      const handle = subprocess.spawn({ argv: [exe, ...args], cwd: operation.cwd,
        stdio: { stdin: "ignore", stdout: stdio, stderr: stdio }, graceMs: 500, signal: combined });
      const { exitCode } = await handle.done;
      const [stdout, stderr] = await Promise.all([fullOutput(handle.collected.stdout.readFrom(0)), fullOutput(handle.collected.stderr.readFrom(0))]);
      return { exitCode, timedOut: timeout.aborted, stdout, stderr };
    } finally { clearTimeout(timer); }
  }

  private async interactive(node: FlowNode, config: TerminalOperation, operation: PreparedOperation, args: string[], signal: AbortSignal): Promise<ShellResult> {
    const controller = this.ctx.get("terminalController") as TerminalController | undefined;
    const sessionId = operation.sessionId ?? node.terminalSessionId;
    const owner = await this.agent(sessionId);
    if (!controller || !owner) throw new Error("交互执行需要绑定带原生终端服务的会话");
    const key = JSON.stringify([sessionId, node.id, operation.cwd]);
    const execute = async () => {
      signal.throwIfAborted();
      let terminal = this.terminals.get(key);
      if (config.terminalId && config.terminalId !== terminal?.id) throw new Error("该终端不属于此执行节点");
      if (terminal?.info.control === "user") throw new Error("此终端已由用户接管");
      if (!terminal || terminal.info.state !== "running") {
        const policy = this.ctx.get("sandboxPolicy") as { resolve(request: { session: unknown }): ShellPolicy } | undefined;
        terminal = await controller.openForAgent(owner, { title: node.title, cwd: operation.cwd, cols: 100, rows: 28,
          preferredShells: process.platform === "win32" ? ["pwsh.exe", "powershell.exe"] : ["bash", "sh"],
          policy: policy?.resolve({ session: owner.session }) ?? { mode: "danger-full-access", workspaceRoot: operation.cwd },
        }, signal);
        this.terminals.set(key, terminal);
      }
      const windows = /(?:^|[\\/])(?:powershell|pwsh)(?:\.exe)?$/i.test(terminal.info.shell.path);
      const marker = `FLOWSPACE_${crypto.randomUUID().replaceAll("-", "")}`;
      const invocation = [config.program, ...args].map(arg => shellQuote(arg, windows)).join(" ");
      const begin = `${marker}=start`;
      const wrapped = windows
        ? `[Console]::WriteLine('${begin}'); & ${invocation}; if ($?) { [Console]::WriteLine('${marker}=0') } else { [Console]::WriteLine("${marker}=$LASTEXITCODE") }`
        : `printf '\\n%s\\n' '${begin}'; ${invocation}; printf '\\n${marker}=%s\\n' "$?"`;
      const ready = config.readyPattern ? new RegExp(config.readyPattern, "u") : undefined;
      const completion = new RegExp(`${marker}=(-?\\d+)[ \\t\\r]*$`, "m");
      await terminal.drain();
      const mark = terminal.mark();
      let output = "";
      try {
        await terminal.write(wrapped + "\r");
        for (;;) {
          const revision = terminal.revision;
          const lines = mark.lines().lines;
          const start = lines.findIndex(line => line.trimEnd().endsWith(begin));
          output = start < 0 ? "" : lines.slice(start + 1).join("\n");
          const end = completion.exec(output);
          if (end || ready?.test(output) || terminal.info.state !== "running")
            return { exitCode: end ? Number(end[1]) : ready?.test(output) ? 0 : null,
              timedOut: false, stdout: output.replace(completion, "").trim(), stderr: "" };
          await terminal.changed(revision, signal);
        }
      } catch (error) {
        if (!signal.aborted) throw error;
        return { exitCode: null, timedOut: true, stdout: output, stderr: "" };
      } finally { mark.dispose(); }
    };
    const pending = (this.terminalQueue.get(key) ?? Promise.resolve()).then(execute, execute);
    this.terminalQueue.set(key, pending);
    return pending.finally(() => { if (this.terminalQueue.get(key) === pending) this.terminalQueue.delete(key); });
  }

  prefetch(run: FlowspaceRun, step: RunStep) {
    if (step.parameterRetryFor) {
      const target = run.steps.find(entry => entry.id === step.parameterRetryFor);
      const node = run.graph.nodes.find(node => node.id === target?.nodeId);
      return target?.operation && node ? [{ id: node.id, title: node.title, fields: target.operation.missing
        .filter(name => configOf(node).parameters.some(parameter => parameter.name === name && parameter.source === "upstream")) }] : [];
    }
    return run.graph.edges.flatMap(edge => {
      if (edge.kind !== "continuation" || edge.trigger === "off" || edge.source !== step.nodeId) return [];
      const node = run.graph.nodes.find(node => node.id === edge.target);
      if (!node || !isOperation(node.flowType)) return [];
      const fields = configOf(node).parameters.filter(parameter => parameter.source === "upstream").map(parameter => parameter.name);
      return fields.length ? [{ id: node.id, title: node.title, fields }] : [];
    });
  }

  registerTools(scheduler: Scheduler) {
    const lookup = (id: string) => {
      const target = this.document().nodes.find(node => node.sessionId === id);
      const ids = new Set(this.document().edges.filter(edge => edge.kind === "reference" && edge.target === target?.id)
        .map(edge => edge.source));
      return this.document().nodes.filter(node => ids.has(node.id) && isOperation(node.flowType));
    };
    const schema = JSON.parse(JSON.stringify(z.toJSONSchema(operationRequest, { target: "draft-7" })));
    this.ctx.tools.register({
      name: "provide_flow_parameters", description: "Supply parameters to a downstream FlowSpace operation before ending this turn.",
      parameters: schema, output: jsonToolOutput,
      execute: async (input, exec) => scheduler.transact(async () => {
        const { nodeId, values } = operationRequest.parse(input);
        exec.signal.throwIfAborted();
        const owner = exec.agent && scheduler.activeSessionStep(exec.agent.id);
        const downstream = owner && this.prefetch(owner.run, owner.step).find(node => node.id === nodeId);
        if (!owner || !downstream || Object.keys(values).some(field => !downstream.fields.includes(field)))
          throw new Error("当前步骤未请求这些参数");
        (owner.step.operationParameters ??= {})[nodeId] = values;
        return { accepted: Object.keys(values) };
      }),
    }, { when: ({ agent }) => scheduler.transact(async () => {
      const owner = scheduler.activeSessionStep(agent.id);
      return !!owner && this.prefetch(owner.run, owner.step).length > 0;
    }) });
    this.ctx.tools.register({
      name: "flow_execute", description: "Execute a preconfigured FlowSpace operation. The operation ID and allowed parameters are defined by a reference wire.",
      parameters: schema, output: jsonToolOutput,
      execute: async (input, exec) => {
        const { nodeId, values } = operationRequest.parse(input);
        const id = exec.agent!.id;
        const node = lookup(id).find(node => node.id === nodeId);
        if (!node) throw new Error("当前会话没有此执行节点的工具引用");
        const config = configOf(node);
        const owner = scheduler.activeSessionStep(id);
        const step: RunStep = owner?.step ?? { id: exec.callId, nodeId: node.id, requestId: exec.callId,
          state: "running", iteration: 0, sources: [], task: "", createdAt: Date.now() };
        const operation = await this.prepare(node, config, step, owner?.run, exec.signal, id, values);
        if (operation.missing.length) throw new Error(`需要补齐参数：${operation.missing.join(", ")}`);
        if (await this.requiresApproval(config, operation)) await approveWrite(this.ctx, exec, "flow_execute", operation.preview);
        if (!lookup(id).some(candidate => candidate.id === node.id && JSON.stringify(candidate.config) === JSON.stringify(node.config)))
          throw new Error("执行节点定义或授权已变化");
        return this.perform(node, config, operation, exec.signal);
      },
    }, { when: ({ agent }) => lookup(agent.id).length > 0 });
  }
}
