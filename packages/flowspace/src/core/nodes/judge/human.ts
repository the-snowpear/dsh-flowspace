import { z } from "zod";
import { tFor } from "../../i18n.ts";
import type { NodeDescriptor } from "../types.ts";
import { branchSchema, judgeBase, judgePorts, uniqueIds } from "./common.ts";

const schema = z.object({
  question: z.string().trim().min(1),
  options: z.array(branchSchema).min(1).refine(uniqueIds, "选项 ID 重复"),
  timeoutSec: z.number().int().nonnegative().optional(),
  timeoutAction: z.enum(["wait", "skip", "default", "timeout-port"]).default("wait"),
  defaultOption: z.string().optional(),
}).superRefine(({ options, timeoutSec, timeoutAction, defaultOption }, ctx) => {
  if (timeoutAction !== "wait" && timeoutSec === undefined)
    ctx.addIssue({ code: "custom", path: ["timeoutSec"], message: "请选择超时时长" });
  if ((defaultOption !== undefined || timeoutAction === "default") && !options.some(option => option.id === defaultOption))
    ctx.addIssue({ code: "custom", path: ["defaultOption"], message: "默认选项必须指向现有选项" });
});
export type HumanConfig = z.infer<typeof schema>;

export const human: NodeDescriptor<HumanConfig> = {
  ...judgeBase, flowType: "flowspace/human-choice", titleKey: "flow_human", descKey: "flow_human_desc",
  configSchema: schema, capabilities: { needsHuman: true },
  defaultConfig: { question: tFor("zh", "flow_human_desc"), options: [{ id: "pass", label: "A" }, { id: "review", label: "B" }], timeoutAction: "wait" },
  ports: config => judgePorts(config.options, config.timeoutAction === "timeout-port" ? "timeout" : undefined),
};
