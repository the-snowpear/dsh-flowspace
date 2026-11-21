import { z } from "zod";
import type { NodeDescriptor, PortSpec } from "./types.ts";
import { judgeBase } from "./judge/common.ts";
import { conditionRule, condition } from "./judge/condition.ts";
import { codeScript, code } from "./judge/code.ts";

const fanSchema = z.object({
  concurrency: z.number().int().positive().default(4),
  followMaster: z.boolean().default(true),
});
const defaultCondition = {
  match: condition.defaultConfig.branches[0].match,
  rules: condition.defaultConfig.branches[0].rules,
};
const defaultScript = { source: code.defaultConfig.source, timeoutMs: code.defaultConfig.timeoutMs };
const defaultAi = {
  provider: "", model: "", instruction: "", passDescription: "PASS", failDescription: "FAIL", threshold: 0,
};
const mergeSchema = z.object({
  wait: z.enum(["all", "any", "quorum", "best"]).default("all"),
  quorum: z.number().int().positive().default(1),
  output: z.enum(["list", "text"]).default("list"),
  cancelRest: z.boolean().default(false),
  scoreBy: z.enum(["human", "ai"]).default("human"),
  arena: z.boolean().default(false),
  taskTag: z.string().default(""),
  sortMode: z.enum(["off", "condition", "code", "ai"]).default("off"),
  condition: z.object({ match: z.enum(["all", "any"]), rules: z.array(conditionRule).min(1) }).default(defaultCondition),
  code: codeScript.default(defaultScript),
  ai: z.object({
    provider: z.string(), model: z.string(), instruction: z.string(),
    passDescription: z.string(), failDescription: z.string(), threshold: z.number().min(0).max(1),
  }).default(defaultAi),
});
export type FanConfig = z.infer<typeof fanSchema>;
export type MergeConfig = z.infer<typeof mergeSchema>;

export const fanout: NodeDescriptor<FanConfig> = {
  ...judgeBase, flowType: "flowspace/fanout", titleKey: "flow_fanout", descKey: "flow_fanout_desc", icon: "fanout",
  configSchema: fanSchema, defaultConfig: { concurrency: 4, followMaster: true }, capabilities: {},
  quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
  ports: () => [
    { id: "in", role: "continuation", direction: "in", dataType: "list" },
    { id: "in", role: "reference", direction: "in", dataType: "list" },
    { id: "out", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_fanout_item" },
  ],
};

export const mergeSort: NodeDescriptor<MergeConfig> = {
  ...judgeBase, flowType: "flowspace/merge-sort", titleKey: "flow_merge_sort", descKey: "flow_merge_sort_desc", icon: "merge-in",
  configSchema: mergeSchema, defaultConfig: mergeSchema.parse({}),
  capabilities: {}, quickCreate: { canvas: false },
  ports: config => {
    const output = { role: "continuation", direction: "out", dataType: config.output ?? "list" } as const;
    const outputs: PortSpec[] = !config.sortMode || config.sortMode === "off"
      ? [{ ...output, id: "out", labelKey: "flow_merge_out" }]
      : [
          { ...output, id: "pass", labelKey: "flow_merge_pass" },
          { ...output, id: "fail", labelKey: "flow_merge_fail" },
          { ...output, id: "error", labelKey: "flow_error", fixed: "error" },
        ];
    return [
      { id: "in", role: "continuation", direction: "in", dataType: "text" },
      { id: "list", role: "continuation", direction: "in", dataType: "list", labelKey: "flow_merge_list" },
      ...outputs,
    ];
  },
};
