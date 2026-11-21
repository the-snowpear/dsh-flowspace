import { z } from "zod";
import type { NodeDescriptor } from "../types.ts";
import { branchSchema, judgeBase, judgePorts, uniqueIds } from "./common.ts";

const schema = z.object({
  provider: z.string(),
  model: z.string(),
  instruction: z.string(),
  branches: z.array(branchSchema.extend({ description: z.string() })).min(1).refine(uniqueIds, "分支 ID 重复"),
  lowConfidence: z.object({ threshold: z.number().min(0).max(1), branch: z.string() }).optional(),
}).refine(({ branches, lowConfidence }) => !lowConfidence || branches.some(branch => branch.id === lowConfidence.branch), {
  path: ["lowConfidence", "branch"], message: "低置信度出口必须指向现有分支",
});
export type AiConfig = z.infer<typeof schema>;

export const ai: NodeDescriptor<AiConfig> = {
  ...judgeBase, flowType: "flowspace/ai-judge", titleKey: "flow_ai", descKey: "flow_ai_desc",
  configSchema: schema, capabilities: { callsModel: true },
  defaultConfig: { provider: "", model: "", instruction: "", branches: [
    { id: "pass", label: "A", description: "PASS" }, { id: "review", label: "B", description: "REVIEW" },
  ] },
  ports: config => judgePorts(config.branches),
};
