import type { JsonObject, JsonValue } from "../../../types.ts";
import { parseMarkdownFences as markdown } from "../../utils.ts";

function pieces(values: string[]): string[] {
  return values.map(value => value.trim()).filter(Boolean);
}

export function splitValues(config: JsonObject, text: string): JsonValue[] {
  if (!text.trim()) return [];
  switch (config.mode) {
    case "lines": return pieces(text.split(/\r\n?|\n/));
    case "delimiter": {
      const delimiter = String(config.delimiter ?? "");
      if (!delimiter) throw new Error("拆分需要非空分隔符");
      return pieces(text.split(delimiter));
    }
    case "regex": {
      const pattern = String(config.pattern ?? "");
      if (!pattern) throw new Error("拆分需要正则表达式");
      const parts: string[] = [];
      let start = 0;
      for (const match of text.matchAll(new RegExp(pattern, "gu"))) {
        parts.push(text.slice(start, match.index));
        start = match.index + match[0].length;
      }
      return pieces([...parts, text.slice(start)]);
    }
    case "headings": {
      const { lines, headings } = markdown(text);
      const cuts = [0, ...headings.map(h => h.line), lines.length];
      return pieces(cuts.slice(1).map((end, i) => lines.slice(cuts[i], end).join("\n")));
    }
    case "code-blocks": return markdown(text).blocks.map(block => block.code);
    default: throw new Error("未知的文本拆分方式");
  }
}

/** JSON paths support own fields, quoted field names, array indices and wildcards. */
export function pathValues(value: JsonValue, path: string): JsonValue[] {
  const input = path.trim();
  let i = input.startsWith("$") ? 1 : 0;
  let found = [value];
  while (i < input.length) {
    let key: string, wildcard = false;
    if (input[i] === "[") {
      const part = /^\[\s*(\d+|\*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\]/.exec(input.slice(i));
      if (!part) throw new Error("JSON 路径的下标无效");
      const raw = part[1];
      wildcard = raw === "*";
      key = raw.startsWith('"') ? JSON.parse(raw) :
        raw.startsWith("'") ? raw.slice(1, -1).replace(/\\(['\\])/g, "$1") : raw;
      i += part[0].length;
    } else {
      if (input[i] === ".") i++;
      else if (i !== 0) throw new Error("JSON 路径需要点号或方括号");
      const field = /^[^.[\]\s]+/.exec(input.slice(i));
      if (!field) throw new Error("JSON 路径缺少字段名");
      key = field[0];
      wildcard = key === "*";
      i += key.length;
    }
    const next: JsonValue[] = [];
    for (const item of found) {
      if (!item || typeof item !== "object") continue;
      if (wildcard) for (const member of Object.values(item)) next.push(member);
      else if (Object.hasOwn(item, key)) {
        if (!Array.isArray(item)) next.push(item[key]);
        else if (/^(0|[1-9]\d*)$/.test(key)) next.push(item[Number(key)]);
      }
    }
    found = next;
  }
  return found;
}

export function extractValues(config: JsonObject, text: string): JsonValue[] {
  if (!text.trim()) return [];
  switch (config.mode) {
    case "regex": {
      if (!config.pattern) throw new Error("提取需要正则表达式");
      return [...text.matchAll(new RegExp(String(config.pattern), "gmu"))].map(match => {
        if (match.groups) return Object.fromEntries(Object.entries(match.groups).map(([name, value]) => [name, value ?? null]));
        if (match.length > 2) return match.slice(1).map(value => value ?? null);
        return match.length === 2 ? match[1] ?? null : match[0];
      });
    }
    case "json-path": {
      const first = markdown(text).blocks.find(block => block.language.toLowerCase() === "json");
      return pathValues(JSON.parse(first?.code ?? text), String(config.path ?? "$"));
    }
    case "code-blocks": return markdown(text).blocks.map(block => block.code);
    case "heading": {
      const { lines, headings } = markdown(text);
      const wanted = String(config.heading ?? "").trim().replace(/^#{1,6}\s+/, "").toLowerCase();
      return headings.flatMap((heading, index) => {
        if (heading.title.toLowerCase() !== wanted) return [];
        const end = headings.slice(index + 1).find(next => next.level <= heading.level)?.line ?? lines.length;
        return pieces([lines.slice(heading.line + 1, end).join("\n")]);
      });
    }
    default: throw new Error("未知的提取方式");
  }
}

function paths(text: string): string[] {
  const values: string[] = [];
  for (const match of text.matchAll(/"([^"\r\n]+)"|'([^'\r\n]+)'|\x60([^\x60\r\n]+)\x60|[^\s"'()\x60<>\[\]{},;]+/gu)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? match[0]).replace(/[,.;，。；]+$/u, "").replace(/:\d+(?::\d+)?:?$/, "");
    if (/^[a-z]+:\/\//i.test(value)) continue;
    if (/^(?:[a-z]:[\\/]|\\\\|\/|\.{1,2}[\\/]|~[\\/]).+/iu.test(value) ||
        /^[\w@.~\-\p{L}]+(?:[\\/][\w@.~ \-\p{L}]+)+$/u.test(value) ||
        /^[\w \-\p{L}]+\.[a-z][\w-]*$/iu.test(value)) values.push(value);
  }
  return values;
}

function errorBlocks(text: string): string[] {
  const errors: string[] = [];
  let lines: string[] = [];
  const finish = () => { if (lines.length) errors.push(lines.join("\n")); lines = []; };
  for (const line of text.split(/\r\n?|\n/)) {
    const head = /\b(?:[\w.]*Error|[\w.]*Exception|Traceback|FATAL)\b|错误|异常|报错/i.test(line);
    if (lines.length && (/^\s+\S|^Caused by:/i.test(line) || (lines[0].startsWith("Traceback") && head))) lines.push(line);
    else {
      finish();
      if (head) lines.push(line);
    }
  }
  finish();
  return errors;
}

function jsonSections(text: string): JsonValue[] {
  const fenced = markdown(text).blocks.filter(block => block.language.toLowerCase() === "json");
  if (fenced.length) return fenced.map(block => JSON.parse(block.code) as JsonValue);
  try { return [JSON.parse(text) as JsonValue]; } catch { /* A report can contain inline records. */ }
  const result: JsonValue[] = [];
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (start < 0) {
      if (char === "{" || char === "[") { start = i; depth = 1; }
    } else if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") depth++;
    else if ((char === "}" || char === "]") && --depth === 0) {
      try { result.push(JSON.parse(text.slice(start, i + 1)) as JsonValue); } catch { /* Ordinary bracketed text. */ }
      start = -1;
    }
  }
  return result;
}

export function parseValues(config: JsonObject, text: string): JsonValue[] {
  if (!text.trim()) return [];
  switch (config.kind) {
    case "todos": return text.split(/\r\n?|\n/).flatMap(line => {
      const task = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.+)/u.exec(line) ??
        /^\s*(?:(?:\/\/|#|\/\*+|\*|-)\s*)?TODO(?:\([^)]*\))?[\s:：-]+(.+)/iu.exec(line);
      return task ? [task[1].trim()] : [];
    });
    case "paths": return paths(text);
    case "errors": return errorBlocks(text);
    case "json": return jsonSections(text);
    case "code-blocks": return markdown(text).blocks.map(block => ({ language: block.language, code: block.code }));
    default: throw new Error("未知的上下文解析方式");
  }
}
