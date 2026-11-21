import type { ContextSnapshot, FlowContent, FlowItem, FlowNode, JsonObject, JsonValue } from "../../../types.ts";
import { canonicalJson, contentList, contentOf, DEFAULT_LIST_LIMIT, textOfContent } from "../../content.ts";
import { conditionRoute, type ConditionConfig } from "../judge/condition.ts";
import { constantValues, dataMode } from "./descriptors.ts";
import { extractValues, parseValues, pathValues, splitValues } from "./text.ts";

export { dataDescriptors, dataMode } from "./descriptors.ts";
export interface DataInput { port: string; source: ContextSnapshot }

const asText = (value: JsonValue) => typeof value === "string" ? value : JSON.stringify(value);

function itemValue(item: FlowItem): JsonValue {
  if (item.value === undefined) throw new Error("请从 spill 读取完整条目后再执行变换");
  return item.value;
}

function sourceValue(source: ContextSnapshot): JsonValue {
  const content = contentOf(source);
  if (content.spill) throw new Error("请从 spill 读取完整内容后再执行变换");
  if (content.items) return content.items.map(itemValue);
  return content.value === undefined ? source.text : content.value;
}

export function dataText(inputs: readonly DataInput[]): string {
  return inputs.map(({ source }) => {
    if (source.textSpill) throw new Error("请从 spill 读取完整文本后再执行变换");
    return source.text || (source.content ? textOfContent(source.content) : "");
  }).join("\n");
}

/** Preserve native keys. Repeated deliveries of the same native item remain distinct. */
function concatenate(parts: readonly FlowContent[], limit: number): FlowContent {
  const retained: FlowItem[] = [];
  let total = 0;
  for (const part of parts) {
    const entries = part.items ?? [];
    total += part.originalCount ?? entries.length;
    for (const entry of entries.slice(0, limit - retained.length)) retained.push(entry);
  }
  const originalKeys = new Set(retained.map(item => item.key));
  const seen = new Set<string>(), occurrences = new Map<string, number>();
  const items = retained.map(item => {
    if (!seen.has(item.key)) {
      seen.add(item.key);
      return item;
    }
    let number = occurrences.get(item.key) ?? 1;
    let key: string;
    do { key = "repeat:" + JSON.stringify([item.key, ++number]); } while (originalKeys.has(key) || seen.has(key));
    occurrences.set(item.key, number);
    seen.add(key);
    return { ...item, key };
  });
  return { dataType: "list", items, ...(total > items.length ? { originalCount: total } : {}) };
}

export function dataItems(inputs: readonly DataInput[], limit = DEFAULT_LIST_LIMIT): FlowContent {
  const parts = inputs.map(({ source }): FlowContent => {
    const content = contentOf(source);
    if (content.dataType === "list") return content;
    if (content.spill) return { dataType: "list", items: [{ key: content.spill.locator, spill: content.spill }] };
    if (content.dataType === "file" && Array.isArray(content.value)) {
      const result = contentList(content.value, limit, content.value.map(value => typeof value === "string" ? value : undefined));
      if (content.originalCount !== undefined) result.originalCount = content.originalCount;
      return result;
    }
    if (content.value === undefined && content.dataType === "signal") return { dataType: "list", items: [] };
    return contentList([sourceValue(source)], limit);
  });
  return concatenate(parts, limit);
}

function formatTemplate(template: string, fields: Map<string, JsonValue>, item?: JsonValue): string {
  const names = [...fields.keys()].sort((a, b) => b.length - a.length);
  return template.replace(/\{\{([^{}]+)\}\}/g, (_token, field: string) => {
    const key = field.trim();
    if (fields.has(key)) return asText(fields.get(key)!);
    const name = names.find(name => key.startsWith(name + ".") || key.startsWith(name + "["));
    const root = name === undefined ? item : fields.get(name);
    if (root === undefined) return "";
    return pathValues(root, name === undefined ? key : key.slice(name.length)).map(asText).join(", ");
  });
}

function formatItem(template: string, item: FlowItem, index: number): string {
  const value = itemValue(item);
  return formatTemplate(template, new Map<string, JsonValue>([
    ["item", value], ["key", item.key], ["index", index], ["n", index + 1],
  ]), value);
}

function namedText(config: JsonObject, inputs: readonly DataInput[]): string {
  const values = new Map<string, JsonValue[]>();
  for (const input of inputs) {
    const prior = values.get(input.port);
    if (prior) prior.push(sourceValue(input.source));
    else values.set(input.port, [sourceValue(input.source)]);
  }
  const fields = new Map<string, JsonValue>();
  for (const name of config.inputs as string[]) {
    const input = values.get(name) ?? [];
    fields.set(name, input.length === 1 ? input[0] : input.length ? input : "");
  }
  return formatTemplate(String(config.template), fields);
}

function ruleMatches(config: JsonObject, item: FlowItem): boolean {
  const selection = config.condition as Omit<ConditionConfig["branches"][number], "id" | "label">;
  return conditionRoute({ branches: [{ ...selection, id: "pass", label: "pass" }] }, asText(itemValue(item))) === "pass";
}

function compare(a: JsonValue | undefined, b: JsonValue | undefined): number {
  if (a === b) return 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  const ranks = ["boolean", "number", "string", "object"];
  const rank = ranks.indexOf(typeof a) - ranks.indexOf(typeof b);
  if (rank) return rank;
  const left = typeof a === "string" ? a : canonicalJson(a!);
  const right = typeof b === "string" ? b : canonicalJson(b!);
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(list: FlowContent, config: JsonObject): FlowContent {
  const entries = list.items!.map(item => ({ item, key: config.mode === "rule" ? Number(!ruleMatches(config, item)) :
    pathValues(itemValue(item), String(config.path))[0] }));
  // Missing fields stay at the end in either direction. Array.sort is stable.
  entries.sort(({ key: a }, { key: b }) => {
    if (a == null || b == null) return Number(a == null) - Number(b == null);
    return (config.order === "desc" ? -1 : 1) * compare(a, b);
  });
  return { ...list, items: entries.map(entry => entry.item) };
}

function normalizeText(text: string) { return text.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase(); }

/** Rule implementations are used by both Host execution and the static canvas preview. */
export function transformData(
  node: FlowNode, inputs: readonly DataInput[], limit = DEFAULT_LIST_LIMIT, previous?: FlowContent,
): FlowContent {
  const config = node.config ?? {};
  if (dataMode(node) !== "rule") throw new Error("代码或 AI 变换需要由 Host 试运行");
  switch (node.flowType) {
    case "flowspace/constant":
      return config.mode === "list" ? contentList(constantValues(String(config.value)), limit) : { dataType: "text", value: config.value };
    case "flowspace/template":
      return { dataType: "text", value: namedText(config, inputs) };
    case "flowspace/split":
      return contentList(splitValues(config, dataText(inputs)), limit);
    case "flowspace/extract":
      if (config.mode === "json-path" && inputs.length === 1 && inputs[0].source.content &&
          inputs[0].source.content.dataType !== "text") {
        return contentList(pathValues(sourceValue(inputs[0].source), String(config.path)), limit);
      }
      return contentList(extractValues(config, dataText(inputs)), limit);
    case "flowspace/parse":
      return contentList(parseValues(config, dataText(inputs)), limit);
  }
  const list = dataItems(inputs, limit);
  const items = list.items!;
  switch (node.flowType) {
    case "flowspace/join": {
      const lines = items.map((item, index) => {
        if (config.mode === "template") return formatItem(String(config.template), item, index);
        const text = asText(itemValue(item));
        return config.mode === "numbered" ? `${index + 1}. ${text}` : text;
      });
      return { dataType: "text", value: lines.join(config.mode === "numbered" ? "\n" : String(config.delimiter)),
        ...(list.originalCount === undefined ? {} : { originalCount: list.originalCount }) };
    }
    case "flowspace/map":
      return { ...list, items: items.map((item, index) => ({ key: item.key, value: formatItem(String(config.template), item, index) })) };
    case "flowspace/filter":
      return { ...list, items: items.filter(item => ruleMatches(config, item)) };
    case "flowspace/sort":
      return sorted(list, config);
    case "flowspace/dedupe": {
      const seen = new Set<string>();
      return { ...list, items: items.filter(item => {
        const key = canonicalJson(itemValue(item), config.mode === "normalized" ? normalizeText : undefined);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }) };
    }
    case "flowspace/accumulate":
      return previous ? concatenate([previous, list], limit) : list;
    default: throw new Error(`未知的数据变换：${node.flowType}`);
  }
}
