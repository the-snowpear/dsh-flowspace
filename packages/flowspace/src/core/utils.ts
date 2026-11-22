import type { FlowNode } from "../types.ts";

export interface MarkdownHeading {
  line: number;
  level: number;
  title: string;
}

export interface MarkdownFenceBlock {
  language: string;
  code: string;
  closed: boolean;
}

export interface ParsedMarkdown {
  lines: string[];
  headings: MarkdownHeading[];
  blocks: MarkdownFenceBlock[];
  outsideLines: string[];
}

/** Key-order independent JSON serialization for hashing, deduplication, and comparison. */
export function canonicalJson(
  value: unknown,
  normalizeText?: (text: string) => string,
): string {
  return JSON.stringify(value, (_key, member: unknown) => {
    if (normalizeText && typeof member === "string") return normalizeText(member);
    if (!member || typeof member !== "object" || Array.isArray(member)) return member;
    const record = member as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, record[key]]),
    );
  });
}

/** Extract trimmed, deduplicated file paths configured on a File node. */
export function extractFileNodePaths(
  node: Pick<FlowNode, "selectedItems" | "text">,
  dedupe = false,
): string[] {
  const raw = (
    node.selectedItems?.length ? node.selectedItems : node.text.split(/\r?\n/)
  )
    .map((p) => p.trim())
    .filter(Boolean);
  return dedupe ? [...new Set(raw)] : raw;
}

/** Structural equality tolerant of object key reordering and optional `undefined` properties. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, i) => deepEqual(value, b[i]))
    );
  }
  if (Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  return (
    Object.keys(left).every((key) => deepEqual(left[key], right[key])) &&
    Object.keys(right).every(
      (key) => right[key] === undefined || Object.hasOwn(left, key),
    )
  );
}

/**
 * Shared Markdown fence & heading parser. Headings and non-fence lines inside fenced blocks
 * belong to the fence, never to the outer document outline or list items.
 */
export function parseMarkdownFences(text: string): ParsedMarkdown {
  const lines = text.split(/\r\n?|\n/);
  const headings: MarkdownHeading[] = [];
  const blocks: MarkdownFenceBlock[] = [];
  const outsideLines: string[] = [];
  let fence: { marker: string; language: string; start: number } | undefined;
  for (let line = 0; line < lines.length; line++) {
    const value = lines[line];
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(value);
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence.marker[0] &&
        marker[1].length >= fence.marker.length &&
        !marker[2].trim()
      ) {
        blocks.push({
          language: fence.language,
          code: lines.slice(fence.start, line).join("\n"),
          closed: true,
        });
        fence = undefined;
      }
    } else if (marker) {
      fence = {
        marker: marker[1],
        language: marker[2].trim().split(/\s+/)[0] ?? "",
        start: line + 1,
      };
    } else {
      outsideLines.push(value);
      const heading = /^ {0,3}(#{1,6})(?:\s+(.+)|\s*)$/.exec(value);
      if (heading) {
        headings.push({
          line,
          level: heading[1].length,
          title: (heading[2] ?? "").trim().replace(/\s+#+$/, ""),
        });
      }
    }
  }
  if (fence) {
    blocks.push({
      language: fence.language,
      code: lines.slice(fence.start).join("\n"),
      closed: false,
    });
  }
  return { lines, headings, blocks, outsideLines };
}

/** Expand group IDs into their descendant non-group (or all descendant) node IDs without mutating input. */
export function expandNodeIds(
  nodes: readonly FlowNode[],
  ids: readonly string[],
  includeGroups = false,
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string, FlowNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId);
    if (list) list.push(node);
    else childrenByParent.set(node.parentId, [node]);
  }
  const out = new Set<string>();
  const visit = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    if (node.kind === "group") {
      if (includeGroups) out.add(node.id);
      for (const child of childrenByParent.get(node.id) ?? []) visit(child.id);
    } else {
      out.add(node.id);
    }
  };
  for (const id of ids) visit(id);
  return [...out];
}
