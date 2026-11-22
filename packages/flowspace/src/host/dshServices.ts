import { createHash } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";
import type {} from "@deepseek-ai/dsh-api-session-controller";
import type { SessionId } from "@deepseek-ai/dsh-session";
import type {} from "@deepseek-ai/dsh-spill";

export interface TurnChangesSummary {
  turn: number;
  cwd: string;
  total: number;
  added: number;
  deleted: number;
  files: {
    path: string;
    display: string;
    added: number;
    deleted: number;
    binary?: true;
    oversized?: true;
  }[];
}

export interface HostWorkspaceChanges {
  summary(sessionId: SessionId, seq: number): TurnChangesSummary | undefined;
  diff(
    sessionId: SessionId,
    seq: number,
    index: number,
    signal: AbortSignal,
  ): Promise<
    | {
        kind: "text";
        path: string;
        display: string;
        hunks: {
          oldStart: number;
          oldLines: number;
          newStart: number;
          newLines: number;
          lines: string[];
        }[];
      }
    | { kind: "binary" | "oversized"; path: string; display: string }
    | undefined
  >;
}

export interface ShellPolicy {
  mode: string;
  workspaceRoot: string;
}

export interface NativeTerminal {
  id: string;
  info: {
    state: "running" | "exited" | "failed";
    shell: { path: string };
    control?: "agent" | "user";
  };
  revision: number;
  changed(after: number, signal: AbortSignal): Promise<number>;
  write(data: string): Promise<void>;
  drain(): Promise<void>;
  mark(): { lines(): { lines: readonly string[] }; dispose(): void };
}

export interface HostTerminalSummary {
  id: string;
  title: string;
  cwd: string;
  state: "running" | "exited" | "failed";
  exitCode: number | null;
  origin: "user" | "agent";
}

export interface HostTerminalController {
  list(sessionId: SessionId): HostTerminalSummary[];
  create(
    agent: unknown,
    req: { id: string; cols: number; rows: number },
    signal: AbortSignal,
  ): Promise<HostTerminalSummary>;
  readScreen(
    agent: unknown,
    id: string,
    req: { offset: number; count: number; maxBytes: number },
  ): Promise<{ text: string; totalLines: number; truncated: boolean }>;
  openForAgent(
    owner: unknown,
    request: {
      title: string;
      cwd: string;
      cols: number;
      rows: number;
      policy: ShellPolicy;
      preferredShells: string[];
    },
    signal: AbortSignal,
  ): Promise<NativeTerminal>;
}

export interface HostWorkingDirectory {
  set(agent: unknown, path: string, signal?: AbortSignal): Promise<string>;
}

export interface HostPlanMode {
  get?(agent: unknown): { active: boolean; pending?: boolean };
  set?(agent: unknown, active: boolean): unknown;
}

export interface HostSandboxPolicy {
  resolve(request: { session?: unknown }): ShellPolicy;
}

export interface ProcessOutput {
  text: string;
  spillPath?: string;
}

export interface HostSubprocess {
  resolveExecutable(
    name: string,
    env?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<string>;
  spawn(spec: {
    argv: string[];
    cwd: string;
    stdio: {
      stdin: "ignore";
      stdout: { maxBytes: number; spill: { maxBytes: number } };
      stderr: { maxBytes: number; spill: { maxBytes: number } };
    };
    graceMs: number;
    signal: AbortSignal;
  }): {
    done: Promise<{ exitCode: number | null }>;
    collected: {
      stdout: { readFrom(offset: number): ProcessOutput };
      stderr: { readFrom(offset: number): ProcessOutput };
    };
  };
}

export interface HostShell {
  sandboxMode?: string;
  resolve(input: object): unknown;
  execute(spec: unknown): {
    result(): Promise<{
      exitCode: number | null;
      timedOut: boolean;
      stdout: ProcessOutput;
      stderr: ProcessOutput;
    }>;
  };
}

export interface HostApproval {
  request(req: {
    agent: unknown;
    toolName: string;
    callId: string;
    reason: string;
    signal: AbortSignal;
  }): Promise<string>;
}

function optionalService<T>(ctx: Context, key: string): T | undefined {
  return (ctx as unknown as { get?: (name: string) => unknown }).get?.(key) as T | undefined;
}

export const getWorkspaceChanges = (ctx: Context) =>
  optionalService<HostWorkspaceChanges>(ctx, "workspaceChanges");

export const getTerminalController = (ctx: Context) =>
  optionalService<HostTerminalController>(ctx, "terminalController");

export const getWorkingDirectory = (ctx: Context) =>
  optionalService<HostWorkingDirectory>(ctx, "workingDirectory");

export const getPlanMode = (ctx: Context) =>
  optionalService<HostPlanMode>(ctx, "planMode");

export const getSandboxPolicy = (ctx: Context) =>
  optionalService<HostSandboxPolicy>(ctx, "sandboxPolicy");

export const getSubprocess = (ctx: Context) =>
  optionalService<HostSubprocess>(ctx, "subprocess");

export const getShell = (ctx: Context) =>
  optionalService<HostShell>(ctx, "shell");

export const getApproval = (ctx: Context) =>
  optionalService<HostApproval>(ctx, "approval");

export const getSpillStore = (ctx: Context) => ctx.get?.("spillStore");

export async function resolveAgentOptional(
  ctx: Context,
  sessionId?: string,
): Promise<Agent | undefined> {
  if (!sessionId) return undefined;
  const result = await ctx.sessionController
    .resolveAgent(sessionId as SessionId)
    .catch(() => null);
  return result && !("error" in result) ? result.agent : undefined;
}

export async function resolveAgentOrThrow(
  ctx: Context,
  sessionId: string,
  errorMessage = "无法解析会话代理",
): Promise<Agent> {
  const result = await ctx.sessionController.resolveAgent(sessionId as SessionId);
  if ("error" in result) throw new Error(errorMessage);
  return result.agent;
}

export function formatTurnChangesSummary(sum: TurnChangesSummary): string {
  return (
    `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})\n` +
    sum.files
      .map((f) => `- ${f.display} (+${f.added} / -${f.deleted})`)
      .join("\n")
  );
}

export function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}
