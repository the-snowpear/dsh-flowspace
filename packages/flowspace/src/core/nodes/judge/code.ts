import { z } from "zod";
import type { NodeDescriptor } from "../types.ts";
import { branchSchema, judgeBase, judgePorts, uniqueIds } from "./common.ts";

export const codeScript = z.object({
  source: z.string().min(1),
  timeoutMs: z.number().int().min(100).max(5000).default(1000),
});
const schema = codeScript.extend({
  branches: z.array(branchSchema).min(1).refine(uniqueIds, "分支 ID 重复"),
});
export type CodeConfig = z.infer<typeof schema>;

export const code: NodeDescriptor<CodeConfig> = {
  ...judgeBase, flowType: "flowspace/code", titleKey: "flow_code", descKey: "flow_code_desc",
  configSchema: schema, capabilities: { runsCode: true },
  defaultConfig: { source: '(input) => Boolean(input.text)', timeoutMs: 1000, branches: [{ id: "pass", label: "A" }] },
  ports: config => judgePorts(config.branches, "else"),
};
