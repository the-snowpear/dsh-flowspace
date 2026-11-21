import { z } from "zod";
import type { NodeDescriptor } from "../types.ts";
import { branchSchema, judgeBase, judgePorts, uniqueIds } from "./common.ts";

export const conditionRule = z.object({
  field: z.enum(["text", "json"]),
  path: z.string().optional(),
  op: z.enum(["contains", "not-contains", "regex", "equals", "empty", "gt", "lt"]),
  value: z.string().optional(),
}).superRefine(({ op, value }, ctx) => {
  if (op === "empty") return;
  if (value && /\{\{\s*var\./u.test(value)) return;
  let message: string | undefined;
  if (value === undefined) message = "此运算符需要比较值";
  else if (op === "regex") {
    try { new RegExp(value, "u"); } catch { message = "正则表达式无效"; }
  } else if ((op === "gt" || op === "lt") && (!value.trim() || !Number.isFinite(Number(value)))) {
    message = "数值比较需要有限数字";
  }
  if (message) ctx.addIssue({ code: "custom", path: ["value"], message });
});

const schema = z.object({
  branches: z.array(branchSchema.extend({
    match: z.enum(["all", "any"]),
    rules: z.array(conditionRule).min(1),
  })).min(1).refine(uniqueIds, "分支 ID 重复"),
});
type Rule = z.infer<typeof conditionRule>;
export type ConditionConfig = z.infer<typeof schema>;

function fieldAt(root: unknown, path = ""): unknown {
  const fields = path.trim().replace(/^\$(?=\.|\[|$)/, "").replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let value = root;
  for (const field of fields) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, field)) return undefined;
    value = (value as Record<string, unknown>)[field];
  }
  return value;
}

function matches(rule: Rule, subject: unknown): boolean {
  if (rule.op === "empty") {
    return subject == null || (typeof subject === "string" && !subject.trim()) ||
      (typeof subject === "object" && Object.keys(subject).length === 0);
  }
  if (subject == null) return false;
  const text = typeof subject === "string" ? subject : JSON.stringify(subject);
  const value = rule.value!;
  switch (rule.op) {
    case "contains": return text.includes(value);
    case "not-contains": return !text.includes(value);
    case "regex": return new RegExp(value, "u").test(text);
    case "equals": return text === value;
    case "gt":
    case "lt": {
      const number = Number(text);
      return !!text.trim() && Number.isFinite(number) && (rule.op === "gt" ? number > Number(value) : number < Number(value));
    }
  }
}

export function conditionRoute(config: ConditionConfig, text: string): string {
  let parsed = false;
  let json: unknown;
  const evaluate = (entry: Rule) => {
    if (entry.field === "text") return matches(entry, text);
    if (!parsed) {
      parsed = true;
      try { json = JSON.parse(text); } catch { /* Text-only input does not match JSON rules. */ }
    }
    return json !== undefined && matches(entry, fieldAt(json, entry.path));
  };
  return config.branches.find(branch =>
    branch.match === "all" ? branch.rules.every(evaluate) : branch.rules.some(evaluate),
  )?.id ?? "else";
}

export const condition: NodeDescriptor<ConditionConfig> = {
  ...judgeBase, flowType: "flowspace/condition", titleKey: "flow_condition", descKey: "flow_condition_desc",
  configSchema: schema, capabilities: {},
  defaultConfig: { branches: [{ id: "pass", label: "A", match: "all", rules: [{ field: "text", op: "contains", value: "PASS" }] }] },
  ports: config => judgePorts(config.branches, "else"),
};
