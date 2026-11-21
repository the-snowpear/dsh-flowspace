import { z } from "zod";
import type { HumanField, JsonObject, NodeKind } from "../../types.ts";
import { judgeBase } from "./judge/common.ts";
import type { NodeDescriptor, PortSpec } from "./types.ts";

export const humanFieldSchema = z.object({
  name: z.string().trim().min(1), label: z.string().trim().min(1),
  type: z.enum(["text", "number", "boolean", "select", "score", "review", "like"]),
  choices: z.array(z.string()).optional(), required: z.boolean().optional(),
});
const form = z.object({
  question: z.string().default(""),
  fields: z.array(humanFieldSchema).default([{ name: "answer", label: "Answer", type: "text", required: true }]),
  timeoutSec: z.number().min(1).max(604800).optional(),
  timeoutAction: z.enum(["wait", "skip", "default", "timeout-port"]).default("wait"),
  defaultAnswer: z.string().default("{}"),
  aiPrefill: z.boolean().default(false),
  rating: z.enum(["stars", "like"]).default("stars"),
  provider: z.string().default(""),
  model: z.string().default(""),
});
export const humanConfig = form;
export function checkAnswers(fields: readonly HumanField[], input: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const field of fields) {
    const value = input[field.name] ?? (field.type === "boolean" || field.type === "like" ? false : undefined);
    if (value === undefined) {
      if (!field.required) continue;
      throw new Error(`请填写「${field.label}」`);
    }
    if ((field.type === "number" && typeof value === "number" && Number.isFinite(value)) ||
        (field.type === "score" && typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) ||
        ((field.type === "boolean" || field.type === "like") && typeof value === "boolean") ||
        (field.type === "select" && typeof value === "string" && field.choices?.includes(value)) ||
        ((field.type === "text" || field.type === "review") && typeof value === "string" && (!field.required || !!value.trim()))) {
      out[field.name] = value;
    } else throw new Error(`「${field.label}」的回答无效`);
  }
  return out;
}

const portsFor = (kind: string, timeout: boolean): PortSpec[] => [
  { id: "in", role: "continuation", direction: "in", dataType: "text" },
  { id: "in", role: "reference", direction: "in", dataType: "text" },
  { id: "out", role: "continuation", direction: "out", dataType: kind === "review" ? "text" : "record", labelKey: "flow_human_submit" },
  ...(timeout ? [{ id: "timeout", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_timeout" } as const] : []),
  { id: "error", role: "continuation", direction: "out", dataType: "text", fixed: "error", labelKey: "flow_error" },
];
export const humanNodes: NodeDescriptor[] = (["form", "score", "review"] as const).map(kind => ({
  ...judgeBase, flowType: `flowspace/human-${kind}`, family: "human", icon: kind === "score" ? "star" : "person",
  titleKey: `flow_human_${kind}`, descKey: `flow_human_${kind}_desc`, configSchema: form, defaultConfig: form.parse({}),
  capabilities: { needsHuman: true }, ports: config => portsFor(kind, config.timeoutAction === "timeout-port"),
  quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
}));

export const triggerConfig = z.object({
  mode: z.enum(["launchpad", "interval", "cron", "rrule", "file", "git", "terminal", "container"]).default("launchpad"),
  enabled: z.boolean().default(false),
  intervalSec: z.number().int().min(1).max(604800).default(60),
  timeZone: z.string().default("Asia/Shanghai"),
  schedule: z.string().default(""),
  cwd: z.string().default(""),
  path: z.string().default(""),
  sourceNodeId: z.string().default(""),
  match: z.string().default(""),
  cooldownSec: z.number().min(0).optional(),
  dailyLimit: z.number().int().min(1).optional(),
  busy: z.enum(["skip", "queue", "interrupt"]).optional(),
  fields: z.array(humanFieldSchema).default([]),
});
export const triggerNode: NodeDescriptor<z.infer<typeof triggerConfig>> = {
  ...judgeBase, flowType: "flowspace/trigger", family: "trigger", icon: "bolt",
  titleKey: "flow_trig_title", descKey: "flow_trig_desc", configSchema: triggerConfig, defaultConfig: triggerConfig.parse({}),
  capabilities: { resourceOnly: true },
  ports: config => [{ id: "out", role: "continuation", direction: "out", labelKey: "flow_trig_out",
    dataType: config.mode === "file" ? "list" : config.fields.length ? "record" : "text" }],
};
export const noticeConfig = z.object({ title: z.string().default(""), message: z.string().default(""),
  system: z.boolean().default(false), sound: z.boolean().default(false) });
export const noticeNode: NodeDescriptor<z.infer<typeof noticeConfig>> = {
  ...judgeBase, flowType: "flowspace/notice", family: "trigger", icon: "bell", titleKey: "flow_notice", descKey: "flow_notice_desc",
  configSchema: noticeConfig, defaultConfig: noticeConfig.parse({}), capabilities: {},
  ports: () => [{ id: "in", role: "continuation", direction: "in", dataType: "text" },
    { id: "out", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_notice_sent" }],
};

export function hasStatusPort(kind: NodeKind, flowType?: string, fanout = false) {
  return kind === "agent" || kind === "terminal" || kind === "git" || kind === "group" && fanout ||
    kind === "flow" && !!flowType && /(?:exec-|human-|judge$|^flowspace\/(?:condition|code|fanout|merge-sort|variable)$)/.test(flowType);
}
