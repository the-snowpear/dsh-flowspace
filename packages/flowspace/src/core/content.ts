import type { ContextSnapshot, FlowContent, FlowItem, FlowNode, JsonValue } from "../types.ts";
import { canonicalJson, extractFileNodePaths } from "./utils.ts";

export { canonicalJson };
export const DEFAULT_LIST_LIMIT = 1000;

export function selectedFileContent(node: FlowNode, limit = DEFAULT_LIST_LIMIT): FlowContent {
  const paths = extractFileNodePaths(node, true);
  return contentList(paths, limit, paths);
}

function itemHash(value: JsonValue): string {
  return hashContentText(canonicalJson(value));
}

export function hashContentText(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
  }
  return hash.toString(36);
}

/** Freeze a source list, retaining native IDs (e.g. board cards) where available. */
export function contentList(
  values: readonly JsonValue[],
  limit = DEFAULT_LIST_LIMIT,
  keys: readonly (string | undefined)[] = [],
  previousKeys: Iterable<string> = [],
): FlowContent {
  const occurrences = new Map<string, number>();
  const nativeKeys = new Set([...keys, ...previousKeys]);
  const items: FlowItem[] = values.slice(0, limit).map((value, index) => {
    let key = keys[index];
    if (key === undefined) {
      const hash = itemHash(value);
      let occurrence = occurrences.get(hash) ?? 0;
      do {
        key = `item:${hash}:${++occurrence}`;
      } while (nativeKeys.has(key));
      occurrences.set(hash, occurrence);
    }
    return { key, value: structuredClone(value) };
  });
  return values.length > items.length
    ? { dataType: "list", items, originalCount: values.length }
    : { dataType: "list", items };
}

export function contentOf(source: ContextSnapshot): FlowContent {
  return source.content ?? { dataType: source.kind === "file" ? "file" : "text", value: source.text };
}

export function textOfContent(content: FlowContent): string {
  if (content.spill) return `${content.spill.preview}\n${content.spill.locator}`;
  if (content.items) {
    return JSON.stringify(content.items.map(item =>
      item.spill ? { preview: item.spill.preview, locator: item.spill.locator } : item.value,
    ));
  }
  if (content.value === undefined) return "";
  return typeof content.value === "string" ? content.value : JSON.stringify(content.value);
}
