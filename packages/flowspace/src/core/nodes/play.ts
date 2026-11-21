import { z } from "zod";
import type { NodeDescriptor } from "./types.ts";
import { branchSchema, judgeBase, judgePorts, uniqueIds } from "./judge/common.ts";

export const randomConfig = z.object({
  mode: z.enum(["random", "rotation"]).default("random"),
  seed: z.string().default(""),
  branches: z.array(branchSchema.extend({ value: z.string().default("") })).min(1).refine(uniqueIds)
    .default([{ id: "first", label: "A", value: "A" }, { id: "second", label: "B", value: "B" }]),
});
export const randomNode: NodeDescriptor<z.infer<typeof randomConfig>> = {
  ...judgeBase, flowType: "flowspace/random", family: "logic", icon: "dice",
  titleKey: "flow_play_random", descKey: "flow_play_random_desc", configSchema: randomConfig, defaultConfig: randomConfig.parse({}),
  capabilities: {}, ports: config => judgePorts(config.branches),
};

export function seededIndex(seed: string, iteration: number, count: number) {
  let state = 2166136261;
  for (const char of `${seed}:${iteration}`) state = Math.imul(state ^ char.codePointAt(0)!, 16777619);
  return (state >>> 0) % count;
}
