import { z } from "zod";
import type { FlowDataType, FlowNode, JsonObject, JsonValue } from "../../../types.ts";
import type { NodeDescriptor, PortSpec } from "../types.ts";
import { judgeBase } from "../judge/common.ts";
import { codeScript } from "../judge/code.ts";
import { condition, conditionRule } from "../judge/condition.ts";
import { pathValues } from "./text.ts";
import { variableTemplate } from "../variables.ts";

const mode = <T extends string>(options: [T, ...T[]]) => z.enum(options).default(options[0]);
const aiSettings = z.object({ provider: z.string(), model: z.string(), instruction: z.string() })
  .default({ provider: "", model: "", instruction: "" });
const defaultBranch = condition.defaultConfig.branches[0];
const ruleSettings = z.object({ match: z.enum(["all", "any"]), rules: z.array(conditionRule).min(1) })
  .default({ match: defaultBranch.match, rules: defaultBranch.rules });
const script = (source: string) => codeScript.default({ source, timeoutMs: 1000 });
const itemTemplate = z.string().default("{{item}}");

function patternError(pattern: string, ctx: z.RefinementCtx) {
  try {
    if (!pattern) throw new Error();
    new RegExp(pattern, "u");
  } catch { ctx.addIssue({ code: "custom", path: ["pattern"], message: "请输入有效的正则表达式" }); }
}

function pathError(path: string, ctx: z.RefinementCtx) {
  try { pathValues(null, path); }
  catch (error) { ctx.addIssue({ code: "custom", path: ["path"], message: error instanceof Error ? error.message : String(error) }); }
}

export function constantValues(text: string): JsonValue[] {
  if (!text.trim().startsWith("[")) return text.split(/\r\n?|\n/).map(line => line.trim()).filter(Boolean);
  return JSON.parse(text) as JsonValue[];
}

const split = z.object({
  mode: mode(["lines", "delimiter", "regex", "headings", "code-blocks"]), delimiter: z.string().default(","),
  pattern: z.string().default("\\s+"),
}).superRefine((config, ctx) => {
  if (config.mode === "regex") patternError(config.pattern, ctx);
  if (config.mode === "delimiter" && !config.delimiter) ctx.addIssue({ code: "custom", path: ["delimiter"], message: "拆分需要非空分隔符" });
});
const join = z.object({ mode: mode(["delimiter", "numbered", "template"]), delimiter: z.string().default("\n"), template: itemTemplate });
const extract = z.object({ mode: mode(["regex", "json-path", "code-blocks", "heading"]), pattern: z.string().default("\\S+"),
  path: z.string().default("$"), heading: z.string().default("") }).superRefine((config, ctx) => {
  if (config.mode === "regex") patternError(config.pattern, ctx);
  if (config.mode === "json-path") pathError(config.path, ctx);
  if (config.mode === "heading" && !config.heading.trim()) ctx.addIssue({ code: "custom", path: ["heading"], message: "请输入 Markdown 标题" });
});
const template = z.object({
  inputs: z.array(z.string().trim().min(1).regex(/^[^{}]+$/).refine(name => !["out", "error"].includes(name), "输入名与输出端口重名"))
    .min(1).refine(names => new Set(names).size === names.length, "输入端口名重复").default(["in"]),
  template: z.string().default("{{in}}"),
}).superRefine((config, ctx) => {
  for (const token of config.template.replace(variableTemplate, "").matchAll(/\{\{([^{}]+)\}\}/g)) {
    const field = token[1].trim();
    if (!config.inputs.some(name => field === name || field.startsWith(name + ".") || field.startsWith(name + "["))) {
      ctx.addIssue({ code: "custom", path: ["template"], message: `没有名为「${field}」的输入端口` });
    }
  }
});
const map = z.object({ mode: mode(["template", "code", "ai"]), template: itemTemplate,
  code: script("(input) => input.item"), ai: aiSettings });
const filter = z.object({ mode: mode(["rule", "code", "ai"]), condition: ruleSettings,
  code: script("(input) => Boolean(input.item)"), ai: aiSettings });
const sort = z.object({ mode: mode(["field", "rule", "ai"]), path: z.string().default("$"),
  order: mode(["asc", "desc"]), condition: ruleSettings, ai: aiSettings })
  .superRefine((config, ctx) => { if (config.mode === "field") pathError(config.path, ctx); });
const dedupe = z.object({ mode: mode(["exact", "normalized", "ai"]), ai: aiSettings });
const constant = z.object({ mode: mode(["text", "list"]), value: z.string().default("") })
  .superRefine((config, ctx) => {
    if (config.mode !== "list" || !config.value.trim().startsWith("[")) return;
    try { constantValues(config.value); }
    catch { ctx.addIssue({ code: "custom", path: ["value"], message: "列表常量需要有效的 JSON 数组，或每行一个条目" }); }
  });
const accumulate = z.strictObject({});
const parse = z.object({ mode: mode(["rule", "code", "ai"]), kind: mode(["todos", "paths", "errors", "json", "code-blocks"]),
  code: script("(input) => input.text.split(/\\r?\\n/).filter(Boolean)"), ai: aiSettings });

function describe<C extends JsonObject>(name: string, icon: string, configSchema: z.ZodType<C>,
  inputType: FlowDataType, output: FlowDataType | ((config: C) => FlowDataType)): NodeDescriptor<C> {
  return {
    ...judgeBase, flowType: `flowspace/${name}`, family: "data", icon, titleKey: `flow_data_${name}`, descKey: `flow_data_${name}_desc`,
    configSchema, defaultConfig: configSchema.parse({}), capabilities: {},
    quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
    ports(config) {
      const names = name === "template" && Array.isArray(config.inputs) ? config.inputs.map(String) : ["in"];
      const inputs = names.flatMap((id): PortSpec[] => (["continuation", "reference"] as const).map(role =>
        ({ id, role, direction: "in", dataType: inputType, ...(name === "template" ? { label: id } : {}) })));
      const result: PortSpec = { id: "out", role: "continuation", direction: "out",
        dataType: typeof output === "string" ? output : output(config), labelKey: "flow_data_result" };
      return [...inputs, result, ...(name === "constant" ? [{ ...result, role: "reference" as const, labelKey: "flow_data_constant_ref" }] : []),
        { id: "error", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_error", fixed: "error" }];
    },
  };
}

export const dataDescriptors: NodeDescriptor[] = [
  describe("split", "split", split, "text", "list"),
  describe("join", "merge-in", join, "list", "text"),
  describe("extract", "braces", extract, "text", "list"),
  describe("template", "braces", template, "text", "text"),
  describe("map", "braces", map, "list", "list"),
  describe("filter", "filter", filter, "list", "list"),
  describe("sort", "sort", sort, "list", "list"),
  describe("dedupe", "filter", dedupe, "list", "list"),
  describe("constant", "braces", constant, "text", config => config.mode === "list" ? "list" : "text"),
  describe("accumulate", "merge-in", accumulate, "list", "list"),
  describe("parse", "braces", parse, "text", "list"),
];

export function dataMode(node: Pick<FlowNode, "flowType" | "config">): "rule" | "code" | "ai" {
  const mode = node.config?.mode;
  if (mode === "code" && ["flowspace/map", "flowspace/filter", "flowspace/parse"].includes(node.flowType ?? "")) return "code";
  if (mode === "ai" && ["flowspace/map", "flowspace/filter", "flowspace/sort", "flowspace/dedupe", "flowspace/parse"].includes(node.flowType ?? "")) return "ai";
  return "rule";
}
