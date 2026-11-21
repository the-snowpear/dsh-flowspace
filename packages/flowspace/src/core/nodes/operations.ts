import { z } from "zod";
import type { NodeDescriptor, PortSpec } from "./types.ts";
import { judgeBase } from "./judge/common.ts";

export const gitActions = ["init", "stage", "unstage", "stageAll", "unstageAll", "discard", "commit",
  "createBranch", "checkoutBranch", "fetch", "pull", "push", "createWorktree", "removeWorktree"] as const;
export const operationParameter = z.object({
  name: z.string().trim().min(1),
  source: z.enum(["fixed", "template", "upstream", "model", "human"]).default("fixed"),
  value: z.string().default(""),
});
const common = z.object({
  cwd: z.string().default(""),
  parameters: z.array(operationParameter).default([]),
  timeoutSec: z.number().min(1).max(3600).default(60),
  provider: z.string().default(""),
  model: z.string().default(""),
  approved: z.array(z.string()).default([]),
  retryUpstream: z.boolean().default(false),
});
export const terminalOperation = common.extend({
  program: z.string().default(""),
  mode: z.enum(["once", "interactive"]).default("once"),
  outputMode: z.enum(["text", "lines"]).default("text"),
  terminalId: z.string().default(""),
  readyPattern: z.string().default(""),
  sandbox: z.boolean().default(false),
});
export const gitOperation = common.extend({ action: z.enum(gitActions).default("stage") });
export type TerminalOperation = z.infer<typeof terminalOperation>;
export type GitOperation = z.infer<typeof gitOperation>;

function ports(output: "text" | "list"): PortSpec[] {
  return [
    { id: "in", direction: "in", role: "continuation", dataType: "text" },
    { id: "in", direction: "in", role: "reference", dataType: "text" },
    { id: "out", direction: "out", role: "reference", dataType: "text", labelKey: "flow_exec_tool" },
    { id: "out", direction: "out", role: "continuation", dataType: output, labelKey: "flow_exec_success" },
    { id: "error", direction: "out", role: "continuation", dataType: "text", labelKey: "flow_exec_failure", fixed: "error" },
  ];
}
export const terminalExec: NodeDescriptor<TerminalOperation> = {
  ...judgeBase, flowType: "flowspace/exec-terminal", family: "exec", icon: "term",
  titleKey: "flow_exec_terminal", descKey: "flow_exec_terminal_desc",
  configSchema: terminalOperation, defaultConfig: terminalOperation.parse({}),
  capabilities: { sideEffects: true }, ports: config => ports(config.outputMode === "lines" ? "list" : "text"),
};
export const gitExec: NodeDescriptor<GitOperation> = {
  ...judgeBase, flowType: "flowspace/exec-git", family: "exec", icon: "git",
  titleKey: "flow_exec_git", descKey: "flow_exec_git_desc", configSchema: gitOperation,
  defaultConfig: gitOperation.parse({}), capabilities: { sideEffects: true }, ports: () => ports("text"),
};
export const isOperation = (flowType?: string) => flowType === terminalExec.flowType || flowType === gitExec.flowType;
