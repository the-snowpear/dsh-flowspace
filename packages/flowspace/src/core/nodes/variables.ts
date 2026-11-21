import { z } from "zod";
import type { FlowContent, FlowDataType, JsonValue, VariableType } from "../../types.ts";
import type { NodeDescriptor, PortSpec } from "./types.ts";
import { judgeBase } from "./judge/common.ts";
import { contentList } from "../content.ts";

export const VARIABLE_TYPES = ["text", "number", "boolean", "list", "record"] as const;
export const VARIABLE_SCOPES = ["run", "canvas", "lane"] as const;
export const VARIABLE_OPERATIONS = ["set", "append", "increment", "decrement", "merge"] as const;
export const variableName = /^[\p{L}_][\p{L}\p{N}_]*$/u;
export const variableTemplate = /\{\{\s*var\.([\p{L}_][\p{L}\p{N}_]*)\s*\}\}/gu;

export function variableValue(type: VariableType, input: JsonValue): JsonValue {
  let value = input;
  if (type === "text") return typeof value === "string" ? value : JSON.stringify(value);
  if (typeof value === "string") {
    if (value.trim()) value = JSON.parse(value) as JsonValue;
    else value = type === "number" ? 0 : type === "boolean" ? false : type === "list" ? [] : {};
  }
  if (type === "number" && typeof value === "number" && Number.isFinite(value) ||
      type === "boolean" && typeof value === "boolean" ||
      type === "list" && Array.isArray(value) ||
      type === "record" && typeof value === "object" && value !== null && !Array.isArray(value)) return value;
  throw new Error("变量值与定义的类型不一致");
}

const definition = z.object({
  name: z.string().regex(variableName).default("variable"),
  type: z.enum(VARIABLE_TYPES).default("text"),
  scope: z.enum(VARIABLE_SCOPES).default("run"),
  initial: z.string().default(""),
}).superRefine(({ type, initial }, ctx) => {
  try { variableValue(type, initial); }
  catch { ctx.addIssue({ code: "custom", path: ["initial"], message: "初始值与变量类型不一致" }); }
});
export type VariableDefinition = z.infer<typeof definition>;

export const assignmentConfig = z.object({
  name: z.string().regex(variableName).default("variable"),
  operation: z.enum(VARIABLE_OPERATIONS).default("set"),
  value: z.string().default(""),
  inputValue: z.boolean().default(true),
});
export type AssignmentConfig = z.infer<typeof assignmentConfig>;
export type VariableOperation = AssignmentConfig["operation"];

const inputPorts: PortSpec[] = [
  { id: "in", direction: "in", role: "continuation", dataType: "text" },
  { id: "in", direction: "in", role: "reference", dataType: "text" },
];
const dataType = (type: VariableType): FlowDataType => type === "list" || type === "record" ? type : "text";

export const variableNode: NodeDescriptor<VariableDefinition> = {
  ...judgeBase, flowType: "flowspace/variable", family: "data", icon: "braces",
  titleKey: "flow_variable", descKey: "flow_variable_desc", configSchema: definition, defaultConfig: definition.parse({}),
  capabilities: { resourceOnly: true, sideEffects: true },
  quickCreate: { canvas: true, afterContinuationOut: true },
  ports: config => [inputPorts[0], { id: "out", direction: "out", role: "reference", dataType: dataType(config.type), labelKey: "flow_variable_ref" }],
};
export const assignmentNode: NodeDescriptor<AssignmentConfig> = {
  ...judgeBase, flowType: "flowspace/assign", family: "data", icon: "braces",
  titleKey: "flow_assign", descKey: "flow_assign_desc",
  configSchema: assignmentConfig, defaultConfig: assignmentConfig.parse({}), capabilities: { sideEffects: true },
  quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
  ports: () => [...inputPorts,
    { id: "out", direction: "out", role: "continuation", dataType: "text", labelKey: "flow_data_result" },
    { id: "error", direction: "out", role: "continuation", dataType: "text", labelKey: "flow_error", fixed: "error" }],
};

export function variableContent(type: VariableType, value: JsonValue, limit: number): FlowContent {
  if (type === "list") return contentList(value as JsonValue[], limit);
  if (type === "record") return { dataType: "record", value };
  return { dataType: "text", value: typeof value === "string" ? value : JSON.stringify(value) };
}
