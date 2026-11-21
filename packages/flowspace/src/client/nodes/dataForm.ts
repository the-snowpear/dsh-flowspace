import type { JsonObject } from "../../types.ts";

const modes: Record<string, Record<string, readonly string[]>> = {
  split: { lines: [], delimiter: ["delimiter"], regex: ["pattern"], headings: [], "code-blocks": [] },
  join: { delimiter: ["delimiter"], numbered: [], template: ["delimiter", "template"] },
  extract: { regex: ["pattern"], "json-path": ["path"], "code-blocks": [], heading: ["heading"] },
  map: { template: ["template"], code: ["code"], ai: ["ai"] },
  filter: { rule: ["condition"], code: ["code"], ai: ["ai"] },
  sort: { field: ["path", "order"], rule: ["condition", "order"], ai: ["ai"] },
  dedupe: { exact: [], normalized: [], ai: ["ai"] },
  constant: { text: ["value"], list: ["value"] },
  parse: { rule: ["kind"], code: ["code"], ai: ["ai"] },
};

export function visibleDataFields(type: string, config: JsonObject): readonly string[] | undefined {
  if (!type.startsWith("flowspace/")) return undefined;
  if (type === "flowspace/template") return ["inputs", "template"];
  if (type === "flowspace/accumulate") return [];
  const choices = modes[type.slice("flowspace/".length)];
  return choices ? ["mode", ...(choices[String(config.mode)] ?? [])] : undefined;
}
