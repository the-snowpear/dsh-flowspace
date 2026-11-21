var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x) {
    return __privateSet(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __using = (stack, value, async) => {
  if (value != null) {
    if (typeof value !== "object" && typeof value !== "function") __typeError("Object expected");
    var dispose, inner;
    if (async) dispose = value[__knownSymbol("asyncDispose")];
    if (dispose === void 0) {
      dispose = value[__knownSymbol("dispose")];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") __typeError("Object not disposable");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    stack.push([async, dispose, value]);
  } else if (async) {
    stack.push([async]);
  }
  return value;
};
var __callDispose = (stack, error, hasError) => {
  var E = typeof SuppressedError === "function" ? SuppressedError : function(e, s, m, _) {
    return _ = Error(m), _.name = "SuppressedError", _.error = e, _.suppressed = s, _;
  };
  var fail = (e) => error = hasError ? new E(e, error, "An error was suppressed during disposal") : (hasError = true, e);
  var next = (it) => {
    while (it = stack.pop()) {
      try {
        var result = it[1] && it[1].call(it[2]);
        if (it[0]) return Promise.resolve(result).then(next, (e) => (fail(e), next()));
      } catch (e) {
        fail(e);
      }
    }
    if (hasError) throw error;
  };
  return next();
};

// packages/flowspace/src/index.ts
import { createHash as createHash5, randomUUID } from "node:crypto";
import { statSync as statSync2 } from "node:fs";
import { open, readdir, readFile as readFile2, realpath, stat } from "node:fs/promises";
import { basename as basename2, dirname as dirname2, isAbsolute as isAbsolute2, relative as relative2, resolve as resolve3 } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

// packages/flowspace/src/core/content.ts
var DEFAULT_LIST_LIMIT = 1e3;
function selectedFileContent(node2, limit = DEFAULT_LIST_LIMIT) {
  const selected = node2.selectedItems?.length ? node2.selectedItems : node2.text.split(/\r?\n/);
  const paths2 = [...new Set(selected.map((path) => path.trim()).filter(Boolean))];
  return contentList(paths2, limit, paths2);
}
function canonicalJson(value, normalizeText2) {
  return JSON.stringify(value, (_key, member) => {
    if (normalizeText2 && typeof member === "string") return normalizeText2(member);
    if (!member || typeof member !== "object" || Array.isArray(member)) return member;
    return Object.fromEntries(Object.keys(member).sort().map((key) => [key, member[key]]));
  });
}
function itemHash(value) {
  return hashContentText(canonicalJson(value));
}
function hashContentText(text) {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
  }
  return hash.toString(36);
}
function contentList(values, limit = DEFAULT_LIST_LIMIT, keys = [], previousKeys = []) {
  const occurrences = /* @__PURE__ */ new Map();
  const nativeKeys = /* @__PURE__ */ new Set([...keys, ...previousKeys]);
  const items = values.slice(0, limit).map((value, index) => {
    let key = keys[index];
    if (key === void 0) {
      const hash = itemHash(value);
      let occurrence = occurrences.get(hash) ?? 0;
      do {
        key = `item:${hash}:${++occurrence}`;
      } while (nativeKeys.has(key));
      occurrences.set(hash, occurrence);
    }
    return { key, value: structuredClone(value) };
  });
  return values.length > items.length ? { dataType: "list", items, originalCount: values.length } : { dataType: "list", items };
}
function contentOf(source) {
  return source.content ?? { dataType: source.kind === "file" ? "file" : "text", value: source.text };
}
function textOfContent(content) {
  if (content.spill) return `${content.spill.preview}
${content.spill.locator}`;
  if (content.items) {
    return JSON.stringify(content.items.map(
      (item) => item.spill ? { preview: item.spill.preview, locator: item.spill.locator } : item.value
    ));
  }
  if (content.value === void 0) return "";
  return typeof content.value === "string" ? content.value : JSON.stringify(content.value);
}

// packages/flowspace/src/core/board.ts
var BOARD_PRIORITIES = ["none", "low", "medium", "high", "urgent"];
var BOARD_ROLES = ["backlog", "todo", "doing", "done", "custom"];
var BOARD_COLORS = ["neutral", "blue", "teal", "green", "amber", "violet", "red"];
var BOARD_REF_SCOPES = ["selected-or-all", "open-only", "all"];
var BOARD_LIMITS = { description: 12e3, tags: 20, tag: 32, checklist: 200, checklistText: 500, wip: 9999 };
var defaultColumns = [
  { id: "todo", name: "\u5F85\u529E", role: "todo", color: "neutral", cards: [] },
  { id: "doing", name: "\u8FDB\u884C\u4E2D", role: "doing", color: "blue", cards: [] },
  { id: "done", name: "\u5B8C\u6210", role: "done", color: "green", cards: [] }
];
var legacyRolesByPosition = ["todo", "doing", "done"];
var legacyRoles = /* @__PURE__ */ new Map([
  ["\u5F85\u529E", "todo"],
  ["todo", "todo"],
  ["to do", "todo"],
  ["col-todo", "todo"],
  ["\u8FDB\u884C\u4E2D", "doing"],
  ["doing", "doing"],
  ["in progress", "doing"],
  ["col-doing", "doing"],
  ["\u5B8C\u6210", "done"],
  ["\u5DF2\u5B8C\u6210", "done"],
  ["\u5DF2\u9A8C\u8BC1", "done"],
  ["done", "done"],
  ["completed", "done"],
  ["verified", "done"],
  ["col-done", "done"],
  ["\u79EF\u538B", "backlog"],
  ["backlog", "backlog"]
]);
function normalizeBoardColumns(columns = defaultColumns) {
  if (columns.every((column) => column.role)) return columns;
  const legacyLayout = columns.length === 3 && columns.every((column) => !column.role);
  return columns.map((column, index) => {
    if (column.role) return column;
    const role = legacyRoles.get(column.name.trim().toLowerCase()) ?? legacyRoles.get(column.id.toLowerCase()) ?? (legacyLayout ? legacyRolesByPosition[index] : "custom");
    return { ...column, role };
  });
}
var isBoardCardDone = (card, column) => card.done ?? column.role === "done";
function newBoardCard(text) {
  const now = Date.now();
  return { id: crypto.randomUUID(), text, createdAt: now, updatedAt: now };
}
function defaultBoardWithExamples(locale = "zh") {
  const english = locale === "en";
  const englishNames = ["To do", "In progress", "Done"];
  const examples = [
    [
      { ...newBoardCard(english ? "Define acceptance criteria" : "\u660E\u786E\u9700\u6C42\u4E0E\u9A8C\u6536\u6807\u51C6"), priority: "high" },
      newBoardCard(english ? "Record open questions" : "\u8BB0\u5F55\u5C1A\u5F85\u786E\u8BA4\u7684\u95EE\u9898")
    ],
    [{ ...newBoardCard(english ? "Review the current workflow" : "\u68B3\u7406\u5F53\u524D\u5DE5\u4F5C\u6D41\u7A0B"), priority: "medium" }],
    [{ ...newBoardCard(english ? "Collect background materials" : "\u6536\u96C6\u80CC\u666F\u8D44\u6599"), done: true }]
  ];
  return defaultColumns.map((column, index) => ({
    ...column,
    name: english ? englishNames[index] : column.name,
    cards: examples[index]
  }));
}
function findBoardCard(columns, id) {
  for (const [columnIndex, column] of columns.entries()) {
    const index = column.cards.findIndex((card) => card.id === id);
    if (index >= 0) return { card: column.cards[index], column, index, columnIndex };
  }
}
function updateBoardColumn(columns, id, update2) {
  const index = columns.findIndex((column) => column.id === id);
  if (index < 0) return columns;
  const next = update2(columns[index]);
  return next === columns[index] ? columns : columns.with(index, next);
}
function updateBoardCard(columns, id, update2) {
  const found = findBoardCard(columns, id);
  if (!found) return columns;
  const card = update2(found.card);
  return card === found.card ? columns : columns.with(found.columnIndex, { ...found.column, cards: found.column.cards.with(found.index, card) });
}
function removeBoardCard(columns, id) {
  const found = findBoardCard(columns, id);
  if (!found) return columns;
  return columns.with(found.columnIndex, { ...found.column, cards: found.column.cards.toSpliced(found.index, 1) });
}
function relocateBoardCard(columns, destination, card, beforeId) {
  const withoutCard = removeBoardCard(columns, card.id);
  return updateBoardColumn(withoutCard, destination.id, (column) => {
    const before = column.cards.findIndex((item) => item.id === beforeId);
    const index = before < 0 ? column.cards.length : before;
    return { ...column, cards: column.cards.toSpliced(index, 0, card) };
  });
}
function moveBoardCard(columns, id, destinationId, beforeId, now) {
  const found = findBoardCard(columns, id);
  const destination = columns.find((column2) => column2.id === destinationId);
  if (!found || !destination || beforeId === id) return columns;
  const { card, column, index } = found;
  if (column === destination) {
    const next = column.cards[index + 1]?.id;
    const before = column.cards.find((item) => item.id === beforeId)?.id;
    if (before === next) return columns;
  }
  let moved = now === void 0 ? card : { ...card, updatedAt: now };
  if (column !== destination) {
    if (destination.role === "done" && column.role !== "done") {
      moved = { ...moved, done: true, previousColumnId: column.id };
    } else if (column.role === "done" && destination.role !== "done") {
      moved = { ...moved, done: false, previousColumnId: void 0 };
    }
  }
  return relocateBoardCard(columns, destination, moved, beforeId);
}
function toggleBoardCardDone(columns, id, settings, now) {
  const found = findBoardCard(columns, id);
  if (!found) return columns;
  const { card, column } = found;
  const done = !isBoardCardDone(card, column);
  const updated = { ...card, done, updatedAt: now ?? card.updatedAt };
  if (settings?.autoMoveDone !== false) {
    if (done && column.role !== "done") {
      const destination = columns.find((item) => item.role === "done");
      if (destination) {
        return relocateBoardCard(columns, destination, { ...updated, previousColumnId: column.id });
      }
    } else if (!done && column.role === "done") {
      const open2 = columns.filter((item) => item.role !== "done");
      const destination = open2.find((item) => item.id === card.previousColumnId) ?? open2.find((item) => item.role === "todo") ?? open2[0];
      if (destination) {
        return relocateBoardCard(columns, destination, { ...updated, previousColumnId: void 0 });
      }
    }
  }
  return updateBoardCard(columns, id, () => updated);
}
var priorityLabels = { none: "", low: "\u4F4E", medium: "\u4E2D", high: "\u9AD8", urgent: "\u7D27\u6025" };
var singleLine = (text) => text.trim().replace(/\s*\r?\n\s*/g, " ");
function formatCardLines(card, column) {
  const priority = priorityLabels[card.priority ?? "none"];
  const attrs = [
    card.tags?.length ? `\u6807\u7B7E: ${card.tags.map(singleLine).join(", ")}` : "",
    card.dueDate ? `\u622A\u6B62: ${card.dueDate}` : ""
  ].filter(Boolean);
  const lines2 = [
    `- [${isBoardCardDone(card, column) ? "x" : " "}] ${priority ? `[${priority}] ` : ""}${singleLine(card.text)}${attrs.length ? ` (${attrs.join(" | ")})` : ""}`
  ];
  if (card.description?.trim()) {
    const [first, ...rest] = card.description.trim().split(/\r?\n/);
    lines2.push(`  \u8BF4\u660E\uFF1A${first}`, ...rest.map((line) => `  ${line}`));
  }
  for (const item of card.checklist ?? []) {
    lines2.push(`  - [${item.done ? "x" : " "}] ${singleLine(item.text)}`);
  }
  return lines2;
}
function formatBoardCardMarkdown(card, column) {
  return [`## [${singleLine(column.name)}]`, ...formatCardLines(card, column)].join("\n");
}
function referenceColumns(columns, selectedIds, scope = "selected-or-all") {
  const chosen = scope === "selected-or-all" && selectedIds?.length ? new Set(selectedIds) : void 0;
  const filterSelection = chosen && columns.some((column) => column.cards.some((card) => chosen.has(card.id)));
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
      if (scope === "open-only") return !isBoardCardDone(card, column);
      return !filterSelection || chosen.has(card.id);
    })
  }));
}
function formatBoardMarkdown(columns, selectedIds, scope = "selected-or-all", limit = Infinity) {
  let remaining = limit;
  return referenceColumns(columns, selectedIds, scope).flatMap((column) => {
    const cards = column.cards.slice(0, remaining);
    remaining -= cards.length;
    return cards.length ? [[`## [${singleLine(column.name)}]`, ...cards.flatMap((card) => formatCardLines(card, column))].join("\n")] : [];
  }).join("\n\n");
}
function cardRecord(card, column) {
  const { checklist, comments, ...fields } = card;
  return {
    ...fields,
    columnId: column.id,
    column: column.name,
    done: isBoardCardDone(card, column),
    ...checklist ? { checklist: checklist.map((item) => ({ ...item })) } : {},
    ...comments ? { comments: comments.map((comment) => ({ ...comment })) } : {}
  };
}
function boardContent(node2, sourceItemKey, limit = DEFAULT_LIST_LIMIT) {
  if (!node2.columns) return void 0;
  const columns = normalizeBoardColumns(node2.columns);
  if (sourceItemKey !== void 0) {
    const found = findBoardCard(columns, sourceItemKey);
    return found ? { dataType: "record", value: cardRecord(found.card, found.column) } : void 0;
  }
  const selected = referenceColumns(columns, node2.selectedItems, node2.boardSettings?.refScope);
  const values = [], keys = [];
  let total = 0;
  for (const column of selected) {
    total += column.cards.length;
    for (const card of column.cards.slice(0, limit - values.length)) {
      values.push(cardRecord(card, column));
      keys.push(card.id);
    }
  }
  const result = contentList(values, limit, keys);
  if (total > values.length) result.originalCount = total;
  return result;
}
function resolveBoardReference(node2, sourceItemKey, limit) {
  if (sourceItemKey !== void 0) {
    const found = findBoardCard(normalizeBoardColumns(node2.columns), sourceItemKey);
    return found ? { title: found.card.text, text: formatBoardCardMarkdown(found.card, found.column) } : { title: node2.title, text: "\u5F15\u7528\u7684\u5F85\u529E\u5361\u7247\u5DF2\u79FB\u9664 / The referenced task was removed.", missing: true };
  }
  return {
    title: node2.title,
    text: node2.columns ? formatBoardMarkdown(normalizeBoardColumns(node2.columns), node2.selectedItems, node2.boardSettings?.refScope, limit) : node2.text
  };
}
function pruneBoardReferences(node2, edges) {
  const ids = new Set(node2.columns?.flatMap((column) => column.cards.map((card) => card.id)));
  if (node2.selectedItems?.some((id) => !ids.has(id))) {
    node2.selectedItems = node2.selectedItems.filter((id) => ids.has(id));
  }
  const retained = edges.filter(
    (edge2) => edge2.source !== node2.id || edge2.kind !== "reference" || edge2.sourceItemKey === void 0 || ids.has(edge2.sourceItemKey)
  );
  return retained.length === edges.length ? edges : retained;
}

// packages/flowspace/src/core/containers.ts
var isContainer = (node2) => node2?.kind === "board" || node2?.kind === "note" || node2?.kind === "file" || node2?.flowType === "flowspace/variable";
function containerPermission(node2, edge2) {
  if (edge2.kind !== "reference" || !isContainer(node2) || edge2.snapshotText !== void 0 || edge2.snapshotContent)
    return "read";
  if (edge2.permission === "advance" && node2?.kind !== "board") return "read";
  return edge2.permission ?? "read";
}
function boardIdsForReference(node2, edge2) {
  const columns = normalizeBoardColumns(node2.columns);
  return edge2.sourceItemKey !== void 0 ? new Set(findBoardCard(columns, edge2.sourceItemKey) ? [edge2.sourceItemKey] : []) : new Set(referenceColumns(columns, node2.selectedItems, node2.boardSettings?.refScope).flatMap((column) => column.cards.map((card) => card.id)));
}
function canvasEntry(node2, itemId) {
  if (node2.kind === "note") return { kind: "note", text: node2.text };
  if (node2.kind !== "board" || itemId === void 0) return null;
  const columns = normalizeBoardColumns(node2.columns);
  const entry = findBoardCard(columns, itemId);
  return entry ? {
    kind: "board",
    columnId: entry.column.id,
    card: entry.card,
    ...entry.column.cards[entry.index + 1] ? { beforeId: entry.column.cards[entry.index + 1].id } : {}
  } : null;
}
function writeCanvasEntry(node2, itemId, entry) {
  if (node2.kind === "note" && entry?.kind === "note") {
    node2.text = entry.text;
    return true;
  }
  if (node2.kind !== "board" || itemId === void 0 || entry && entry.kind !== "board") return false;
  const columns = normalizeBoardColumns(node2.columns);
  const without = removeBoardCard(columns, itemId);
  if (!entry) {
    node2.columns = without;
    return true;
  }
  const destination = without.findIndex((column2) => column2.id === entry.columnId);
  if (destination < 0) return false;
  const column = without[destination];
  const before = column.cards.findIndex((card) => card.id === entry.beforeId);
  node2.columns = without.with(destination, {
    ...column,
    cards: column.cards.toSpliced(before < 0 ? column.cards.length : before, 0, entry.card)
  });
  return true;
}
var equal = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
function mergeEntry(current, change, history) {
  const { before, after } = change;
  if (equal(current, before)) return after;
  if (current?.kind === "note" && after?.kind === "note") return history ? after : current;
  if (current?.kind !== "board" || before?.kind !== "board") return current;
  if (after === null) return history || equal(current.card, before.card) ? null : current;
  if (after.kind !== "board") return current;
  const fields = { ...current.card };
  for (const key of /* @__PURE__ */ new Set([...Object.keys(before.card), ...Object.keys(after.card)])) {
    if (equal(before.card[key], after.card[key]) || !history && !equal(current.card[key], before.card[key])) continue;
    Object.assign(fields, { [key]: after.card[key] });
  }
  const moved = before.columnId !== after.columnId;
  const canMove = moved && (history || current.columnId === before.columnId);
  return { ...current, ...canMove ? { columnId: after.columnId, beforeId: after.beforeId } : {}, card: fields };
}
function rebaseContainerChanges(document, changes, history = false) {
  const revision = document.containerRevision ?? 0;
  const newer = changes.filter((change) => !change.pending && change.revision > revision);
  if (!newer.length) return document;
  const next = { ...document, nodes: [...document.nodes], containerRevision: newer.at(-1).revision };
  const indices = new Map(next.nodes.map((node2, index) => [node2.id, index]));
  for (const change of newer) {
    const index = indices.get(change.nodeId);
    if (index === void 0 || change.before?.kind === "file" || change.after?.kind === "file") continue;
    const node2 = next.nodes[index];
    const current = canvasEntry(node2, change.itemId);
    const entry = mergeEntry(current, change, history);
    if (equal(current, entry)) continue;
    const updated = { ...node2 };
    if (writeCanvasEntry(updated, change.itemId, entry)) {
      next.nodes[index] = updated;
      if (updated.kind === "board") next.edges = pruneBoardReferences(updated, next.edges);
    }
  }
  return next;
}

// packages/flowspace/src/client/i18n.ts
var language = "zh";
var getLanguage = () => language.startsWith("en") ? "en" : "zh";
var dict = {
  flow_missing_endpoint: ["\u8FDE\u7EBF\u7AEF\u70B9\u4E0D\u5B58\u5728", "An endpoint no longer exists"],
  flow_staff_only: ["\u5C97\u4F4D\u8282\u70B9\u53EA\u80FD\u901A\u8FC7\u7F16\u5236\u7EBF\u63A5\u5165\u56E2\u961F", "Use a staffing wire to connect a role to a team"],
  flow_invalid_board_card: ["\u8BF7\u9009\u62E9\u73B0\u6709\u770B\u677F\u5361\u7247\u7684\u5F15\u7528\u51FA\u53E3", "Choose a reference output on an existing board card"],
  flow_invalid_output: ["\u6E90\u8282\u70B9\u6CA1\u6709\u5339\u914D\u7684\u51FA\u53E3", "The source has no matching output"],
  flow_invalid_input: ["\u76EE\u6807\u8282\u70B9\u6CA1\u6709\u5339\u914D\u7684\u5165\u53E3", "The target has no matching input"],
  flow_invalid_fork: ["\u5206\u53C9\u53EA\u80FD\u63A5\u5165\u6709\u5355\u4E00\u5206\u53C9\u6765\u6E90\u7684\u672A\u542F\u52A8\u8349\u7A3F", "A fork needs a draft agent with a single fork source"],
  flow_invalid_permission: ["\u6388\u6743\u53EA\u9002\u7528\u4E8E\u8FDE\u63A5\u5230 Agent \u7684\u5B9E\u65F6\u5BB9\u5668\u5F15\u7528", "Permissions require a live container reference into an agent"],
  flow_invalid_delivery: ["\u5BB9\u5668\u5199\u5165\u9700\u8981\u7ED3\u8BBA\u6A21\u5F0F", "Delivery requires conclusion mode"],
  flow_permission: ["\u5F15\u7528\u6388\u6743", "Reference permissions"],
  flow_permission_read: ["\u53EA\u8BFB", "Read only"],
  flow_permission_advance: ["\u53EF\u63A8\u8FDB", "Advance"],
  flow_permission_edit: ["\u53EF\u7F16\u8F91", "Edit"],
  flow_permission_ask: ["\u6BCF\u6B21\u8BE2\u95EE", "Ask each time"],
  flow_delivery: ["\u6295\u9012", "Delivery"],
  flow_delivery_lines: ["\u6BCF\u884C\u4E00\u5361", "One card per line"],
  flow_delivery_paragraph: ["\u6574\u6BB5\u4E00\u5361", "One card for the full text"],
  flow_delivery_list: ["\u89E3\u6790\u6E05\u5355", "Parse a list"],
  flow_delivery_first_column: ["\u9996\u5217", "First column"],
  flow_delivery_replace: ["\u56DE\u5408\u7ED3\u675F\u540E\u5C06\u4EA7\u51FA\u5199\u5165\u76EE\u6807\u5185\u5BB9", "Write the result into the target when the turn ends"],
  flow_agent_changes: ["Agent \u6539\u52A8\u8BB0\u5F55", "Agent changes"],
  flow_board_comments: ["\u8BC4\u8BBA", "Comments"],
  flow_change_revert: ["\u64A4\u56DE", "Revert"],
  flow_variable: ["\u53D8\u91CF", "Variable"],
  flow_variable_desc: ["\u4FDD\u5B58\u5E26\u7248\u672C\u7684\u5171\u4EAB\u503C", "Store a versioned shared value"],
  flow_assign: ["\u8D4B\u503C", "Assign variable"],
  flow_assign_desc: ["\u8BBE\u7F6E\u3001\u8FFD\u52A0\u6216\u5408\u5E76\u4E00\u4E2A\u53D8\u91CF\u503C", "Set, append to, or merge a variable value"],
  flow_variable_panel: ["\u53D8\u91CF\u9762\u677F", "Variables"],
  flow_variable_edit: ["\u4FEE\u6539\u503C", "Edit value"],
  flow_variable_save: ["\u4FDD\u5B58\u503C", "Save value"],
  flow_variable_value: ["\u5F53\u524D\u503C", "Current value"],
  flow_variable_reset: ["\u91CD\u7F6E", "Reset"],
  flow_variable_no_run: ["\u8FD0\u884C\u540E\u53EF\u67E5\u770B\u548C\u4FEE\u6539\u6B64\u4F5C\u7528\u57DF\u7684\u503C", "Start a run to read or edit a value in this scope"],
  flow_variable_empty: ["\u753B\u5E03\u4E0A\u8FD8\u6CA1\u6709\u53D8\u91CF", "There are no variables on this canvas"],
  flow_scope_run: ["\u8FD0\u884C\u7EA7", "Run scope"],
  flow_scope_canvas: ["\u753B\u5E03\u7EA7", "Canvas scope"],
  flow_scope_lane: ["\u6CF3\u9053\u7EA7", "Lane scope"],
  flow_form_initial: ["\u521D\u59CB\u503C", "Initial value"],
  flow_form_scope: ["\u4F5C\u7528\u57DF", "Scope"],
  flow_form_operation: ["\u64CD\u4F5C", "Operation"],
  flow_form_inputValue: ["\u4F7F\u7528\u4E0A\u6E38\u8F93\u5165", "Use upstream input"],
  flow_form_run: ["\u8FD0\u884C\u7EA7", "Run"],
  flow_form_canvas: ["\u753B\u5E03\u7EA7", "Canvas"],
  flow_form_lane: ["\u6CF3\u9053\u7EA7", "Lane"],
  flow_form_set: ["\u8BBE\u7F6E", "Set"],
  flow_form_append: ["\u8FFD\u52A0", "Append"],
  flow_form_increment: ["\u81EA\u589E", "Increment"],
  flow_form_decrement: ["\u81EA\u51CF", "Decrement"],
  flow_form_merge: ["\u5408\u5E76", "Merge"],
  flow_exec_terminal: ["\u7EC8\u7AEF\u6267\u884C", "Terminal command"],
  flow_exec_terminal_desc: ["\u5728\u6240\u9009\u5DE5\u4F5C\u533A\u6267\u884C\u9884\u8BBE\u547D\u4EE4", "Run a configured command in the selected workspace"],
  flow_exec_git: ["Git \u64CD\u4F5C", "Git operation"],
  flow_exec_git_desc: ["\u5728\u6240\u9009 worktree \u6267\u884C Git \u64CD\u4F5C", "Apply a Git action in the selected worktree"],
  flow_exec_operation: ["\u64CD\u4F5C", "Operation"],
  flow_exec_interactive: ["\u4EA4\u4E92\u7EC8\u7AEF", "Interactive terminal"],
  flow_exec_success: ["\u6210\u529F", "Success"],
  flow_exec_failure: ["\u5931\u8D25", "Failure"],
  flow_exec_now: ["\u6267\u884C", "Execute"],
  flow_exec_skip: ["\u8DF3\u8FC7", "Skip"],
  flow_exec_retry: ["\u8FFD\u95EE\u4E0A\u6E38", "Ask upstream"],
  flow_exec_terminal_owner: ["\u7EC8\u7AEF\u6240\u5C5E\u4F1A\u8BDD", "Terminal session"],
  flow_exec_terminal_upstream: ["\u8DDF\u968F\u4E0A\u6E38\u4F1A\u8BDD", "Use the upstream session"],
  flow_form_retryUpstream: ["\u5141\u8BB8\u8FFD\u95EE\u4E0A\u6E38\u4E00\u8F6E", "Allow one upstream follow-up"],
  flow_form_program: ["\u53EF\u6267\u884C\u7A0B\u5E8F", "Executable"],
  flow_form_parameters: ["\u53C2\u6570", "Parameters"],
  flow_form_fixed: ["\u56FA\u5B9A\u503C", "Fixed"],
  flow_form_template: ["\u6A21\u677F", "Template"],
  flow_form_upstream: ["\u4E0A\u6E38\u63D0\u4F9B", "Upstream"],
  flow_exec_source_model: ["AI \u751F\u6210", "Generate with AI"],
  flow_form_human: ["\u4EBA\u5DE5\u586B\u5199", "User input"],
  flow_form_once: ["\u4E00\u6B21\u6027\u6267\u884C", "One-shot"],
  flow_form_interactive: ["\u4EA4\u4E92\u7EC8\u7AEF", "Interactive terminal"],
  flow_form_approved: ["\u514D\u786E\u8BA4\u64CD\u4F5C\u6E05\u5355", "Approved operations"],
  flow_form_readyPattern: ["\u5C31\u7EEA\u6B63\u5219", "Readiness regex"],
  flow_form_outputMode: ["\u8F93\u51FA\u683C\u5F0F", "Output format"],
  flow_form_terminalId: ["\u7EC8\u7AEF ID", "Terminal ID"],
  flow_form_sandbox: ["\u4F7F\u7528 DSH \u6C99\u7BB1", "Use the DSH sandbox"],
  flow_evt_wire: ["\u4E8B\u4EF6\u7EBF", "Event wire"],
  flow_exec_canvas_tools: ["\u4EC5\u9650\u753B\u5E03\u6388\u6743\u5DE5\u5177", "Canvas-authorized tools only"],
  flow_evt_port: ["\u72B6\u6001\u4E8B\u4EF6", "Status events"],
  flow_evt_target: ["\u6B64\u8282\u70B9\u65E0\u6CD5\u63A5\u6536\u72B6\u6001\u4E8B\u4EF6", "This node cannot receive status events"],
  flow_evt_model: ["\u8FDE\u7EED\u4E8B\u4EF6\u53EA\u80FD\u53D1\u5F80\u4E0D\u8C03\u7528\u6A21\u578B\u7684\u8282\u70B9", "Continuous events require a target without model calls"],
  flow_evt_end: ["\u7ED3\u675F", "End"],
  flow_evt_change: ["\u53D8\u5316", "Change"],
  flow_evt_continuous: ["\u8FDE\u7EED", "Continuous"],
  flow_event_running: ["\u8FD0\u884C\u4E2D", "Running"],
  flow_event_waiting: ["\u7B49\u5F85", "Waiting"],
  flow_event_done: ["\u5B8C\u6210", "Completed"],
  flow_event_error: ["\u9519\u8BEF", "Error"],
  flow_event_budget: ["\u8D85\u51FA\u9884\u7B97", "Budget exceeded"],
  flow_event_container: ["\u5BB9\u5668\u53D8\u5316", "Container change"],
  flow_event_output: ["\u8F93\u51FA\u589E\u91CF", "Output delta"],
  flow_event_tool: ["\u5DE5\u5177\u8C03\u7528", "Tool call"],
  flow_event_usage: ["\u7528\u91CF", "Usage"],
  flow_event_cooldown: ["\u51B7\u5374\u65F6\u95F4\uFF08\u79D2\uFF09", "Cooldown in seconds"],
  flow_event_limit: ["\u6700\u5927\u89E6\u53D1\u6B21\u6570", "Maximum deliveries"],
  flow_event_full: ["\u9644\u5E26\u5B8C\u6574\u5185\u5BB9", "Include full content"],
  flow_human_form: ["\u8868\u5355", "Form"],
  flow_human_form_desc: ["\u586B\u5199\u5B57\u6BB5\u5E76\u63D0\u4EA4\u7ED3\u6784\u5316\u8BB0\u5F55", "Complete fields to submit a record"],
  flow_human_score: ["\u6253\u5206", "Score"],
  flow_human_score_desc: ["\u4E3A\u4E0A\u6E38\u4EA7\u51FA\u8BC4\u5206\u5E76\u586B\u5199\u8BC4\u8BED", "Score the upstream result with an optional comment"],
  flow_human_review: ["\u5BA1\u9605\u7F16\u8F91", "Review and edit"],
  flow_human_review_desc: ["\u7F16\u8F91\u4E0A\u6E38\u5185\u5BB9\u540E\u7EE7\u7EED", "Edit the upstream content and continue"],
  flow_human_submit: ["\u63D0\u4EA4", "Submit"],
  flow_human_batch: ["\u6279\u91CF\u5904\u7406", "Batch answers"],
  flow_human_batch_lane: ["\u6CF3\u9053", "Lane"],
  flow_human_batch_question: ["\u95EE\u9898", "Question"],
  flow_human_batch_answer: ["\u56DE\u7B54", "Answer"],
  flow_human_batch_state: ["\u72B6\u6001", "Status"],
  flow_human_batch_apply: ["\u6574\u5217\u5957\u7528", "Apply to column"],
  flow_evt_end_reasons: ["\u7ED3\u675F\u539F\u56E0\uFF08\u9017\u53F7\u5206\u9694\uFF09", "End reasons (comma separated)"],
  flow_human_rating: ["\u8BC4\u5206", "Rating"],
  flow_form_rating: ["\u8BC4\u5206\u65B9\u5F0F", "Rating style"],
  flow_form_stars: ["1\u20135 \u5206", "1\u20135 stars"],
  flow_form_like: ["\u70B9\u8D5E", "Like"],
  flow_human_comment: ["\u8BC4\u8BED", "Comment"],
  flow_human_idle: ["\u8FD0\u884C\u5230\u8FD9\u91CC\u65F6\u5728\u5361\u7247\u5185\u4F5C\u7B54", "Answer here when the workflow reaches this node"],
  flow_human_your_turn: ["\u7B49\u4F60\u4F5C\u7B54", "Your answer is needed"],
  flow_human_pick: ["\u70B9\u9009\u4E00\u4E2A\u5206\u652F\u4F5C\u7B54", "Pick a branch to answer"],
  flow_human_upstream: ["\u4E0A\u6E38\u5185\u5BB9", "Upstream content"],
  flow_trig_out: ["\u89E6\u53D1\u65F6", "On trigger"],
  flow_notice_sent: ["\u5DF2\u53D1\u9001", "Sent"],
  flow_variable_ref: ["\u8BFB\u53D6\u5F15\u7528", "Read reference"],
  flow_variable_history: ["\u6700\u8FD1\u5199\u5165", "Recent writes"],
  flow_exec_tool: ["\u4EA4\u7ED9 Agent \u8C03\u7528", "Offer to agent"],
  flow_exec_exit: ["\u9000\u51FA {code}", "Exit {code}"],
  flow_trig_title: ["\u89E6\u53D1\u5668", "Trigger"],
  flow_trig_desc: ["\u6309\u8BA1\u5212\u6216\u4E8B\u4EF6\u542F\u52A8\u4E00\u6B21\u8FD0\u884C", "Start a run on a schedule or event"],
  flow_trig_launchpad: ["\u542F\u52A8\u53F0", "Launchpad"],
  flow_trig_launch: ["\u542F\u52A8\u5DE5\u4F5C\u6D41", "Launch workflow"],
  flow_trig_next: ["\u4E0B\u6B21 {time}", "Next {time}"],
  flow_trig_last: ["\u4E0A\u6B21 {time}", "Last {time}"],
  flow_trig_missed: ["\u9519\u8FC7 {count} \u6B21", "Missed {count}"],
  flow_trig_no_backfill: ["Host \u79BB\u7EBF\u671F\u95F4\u9519\u8FC7\u7684\u65F6\u95F4\u4E0D\u4F1A\u8865\u8DD1", "Occurrences missed while the Host was offline are skipped."],
  flow_trig_enabled: ["\u5DF2\u542F\u7528", "Enabled"],
  flow_trig_disabled: ["\u5DF2\u6682\u505C", "Disabled"],
  flow_trig_gate: ["\u81EA\u52A8\u89E6\u53D1\u603B\u95F8", "Automatic triggers"],
  flow_trig_enable_import: ["\u5BFC\u5165\u540E\u542F\u7528\u89E6\u53D1\u5668", "Enable triggers after import"],
  flow_notice: ["\u901A\u77E5", "Notification"],
  flow_notice_desc: ["\u5411\u753B\u5E03\u53D1\u9001\u901A\u77E5", "Send a canvas notification"],
  flow_notice_permission: ["\u5F00\u542F\u7CFB\u7EDF\u901A\u77E5", "Enable system notifications"],
  flow_form_fields: ["\u5B57\u6BB5", "Fields"],
  flow_form_cwd: ["\u5DE5\u4F5C\u76EE\u5F55", "Working directory"],
  flow_form_name: ["\u540D\u79F0", "Name"],
  flow_form_action: ["Git \u64CD\u4F5C", "Git action"],
  flow_form_mode: ["\u6A21\u5F0F", "Mode"],
  flow_form_type: ["\u7C7B\u578B", "Type"],
  flow_form_choices: ["\u9009\u9879", "Choices"],
  flow_form_title: ["\u6807\u9898", "Title"],
  flow_form_message: ["\u5185\u5BB9", "Message"],
  flow_form_system: ["\u540C\u65F6\u53D1\u9001\u7CFB\u7EDF\u901A\u77E5", "Also send a system notification"],
  flow_form_sound: ["\u64AD\u653E\u63D0\u793A\u97F3", "Play a sound"],
  flow_form_enabled: ["\u542F\u7528", "Enabled"],
  flow_form_lines: ["\u6309\u884C\u62C6\u5206", "One item per line"],
  flow_form_number: ["\u6570\u5B57", "Number"],
  flow_form_boolean: ["\u5F00\u5173", "Toggle"],
  flow_form_select: ["\u5355\u9009", "Single choice"],
  flow_form_score: ["\u8BC4\u5206", "Score"],
  flow_form_review: ["\u957F\u6587\u672C", "Long text"],
  flow_form_init: ["\u521D\u59CB\u5316\u4ED3\u5E93", "Initialize repository"],
  flow_form_stage: ["\u6682\u5B58", "Stage"],
  flow_form_unstage: ["\u53D6\u6D88\u6682\u5B58", "Unstage"],
  flow_form_stageAll: ["\u5168\u90E8\u6682\u5B58", "Stage all"],
  flow_form_unstageAll: ["\u5168\u90E8\u53D6\u6D88\u6682\u5B58", "Unstage all"],
  flow_form_discard: ["\u4E22\u5F03\u6539\u52A8", "Discard changes"],
  flow_form_commit: ["\u63D0\u4EA4", "Commit"],
  flow_form_createBranch: ["\u65B0\u5EFA\u5206\u652F", "Create branch"],
  flow_form_checkoutBranch: ["\u5207\u6362\u5206\u652F", "Check out branch"],
  flow_form_fetch: ["\u83B7\u53D6\u8FDC\u7AEF", "Fetch"],
  flow_form_pull: ["\u62C9\u53D6", "Pull"],
  flow_form_push: ["\u63A8\u9001", "Push"],
  flow_form_createWorktree: ["\u65B0\u5EFA worktree", "Create worktree"],
  flow_form_removeWorktree: ["\u5220\u9664 worktree", "Remove worktree"],
  flow_form_unset_hint: ["\u7559\u7A7A\u5219\u4E0D\u8BBE\u7F6E", "Leave empty to unset"],
  flow_form_required: ["\u5FC5\u586B", "Required"],
  flow_form_schedule: ["\u8BA1\u5212\u8868\u8FBE\u5F0F", "Schedule expression"],
  flow_form_timeZone: ["\u65F6\u533A", "Time zone"],
  flow_form_intervalSec: ["\u95F4\u9694\uFF08\u79D2\uFF09", "Interval in seconds"],
  flow_form_cooldownSec: ["\u51B7\u5374\uFF08\u79D2\uFF09", "Cooldown in seconds"],
  flow_form_dailyLimit: ["\u6BCF\u65E5\u4E0A\u9650", "Daily limit"],
  flow_form_busy: ["\u4E0A\u6B21\u8FD0\u884C\u672A\u7ED3\u675F\u65F6", "When the previous run is active"],
  flow_form_interrupt: ["\u6253\u65AD", "Interrupt"],
  flow_form_queue: ["\u6392\u961F", "Queue"],
  flow_form_launchpad: ["\u542F\u52A8\u53F0", "Launchpad"],
  flow_form_interval: ["\u95F4\u9694", "Interval"],
  flow_form_cron: ["Cron \u5B9A\u65F6", "Cron"],
  flow_form_rrule: ["RRULE \u5B9A\u65F6", "RRULE"],
  flow_form_container: ["\u5BB9\u5668\u4E8B\u4EF6", "Container event"],
  flow_form_file: ["\u6587\u4EF6\u53D8\u5316", "File change"],
  flow_form_git: ["Git \u4E8B\u4EF6", "Git event"],
  flow_form_terminal: ["\u7EC8\u7AEF\u4E8B\u4EF6", "Terminal event"],
  flow_form_aiPrefill: ["AI \u9884\u586B", "AI prefill"],
  flow_form_defaultAnswer: ["\u8D85\u65F6\u9ED8\u8BA4\u56DE\u7B54\uFF08JSON\uFF09", "Default answer on timeout (JSON)"],
  flow_form_sourceNodeId: ["\u6765\u6E90\u8282\u70B9 ID", "Source node ID"],
  flow_bp_title: ["\u65AD\u70B9", "Breakpoint"],
  flow_bp_hit: ["\u5DF2\u5728\u53D1\u51FA\u8BF7\u6C42\u524D\u6682\u505C", "Paused before dispatch"],
  flow_bp_continue: ["\u7EE7\u7EED", "Continue"],
  flow_bp_step: ["\u5355\u6B65", "Step"],
  flow_bp_skip: ["\u8DF3\u8FC7", "Skip"],
  flow_bp_edit: ["\u7F16\u8F91\u672C\u6B21\u8F93\u5165", "Edit this input"],
  flow_budget_title: ["\u8FD0\u884C\u9884\u7B97", "Run limits"],
  flow_budget_pause: ["\u8D85\u51FA\u9884\u7B97", "Budget exceeded"],
  flow_budget_tokens: ["Token \u4E0A\u9650", "Token limit"],
  flow_budget_seconds: ["\u65F6\u957F\uFF08\u79D2\uFF09", "Seconds"],
  flow_budget_rounds: ["\u8F6E\u6570", "Rounds"],
  flow_replay_play: ["\u56DE\u653E", "Replay"],
  flow_replay_readonly: ["\u56DE\u653E\u4E2D \xB7 \u53EA\u8BFB", "Replay \xB7 Read only"],
  flow_replay_position: ["\u56DE\u653E\u8FDB\u5EA6", "Replay position"],
  flow_arena_table: ["\u6218\u7EE9\u699C", "Leaderboard"],
  flow_arena_model: ["\u6A21\u578B", "Model"],
  flow_arena_wins: ["\u80DC", "Wins"],
  flow_arena_losses: ["\u8D1F", "Losses"],
  flow_arena_rate: ["\u80DC\u7387", "Win rate"],
  flow_arena_empty: ["\u5B8C\u6210\u4E00\u6B21\u64C2\u53F0\u8FD0\u884C\u540E\u663E\u793A\u6218\u7EE9", "Complete a model arena to see results"],
  flow_report_title: ["\u8FD0\u884C\u6218\u62A5", "Run report"],
  flow_report_generate: ["\u751F\u6210\u6218\u62A5", "Generate report"],
  flow_report_export: ["\u5BFC\u51FA\u56FE\u7247", "Export image"],
  flow_report_best: ["\u6700\u4F73\u8282\u70B9", "Best node"],
  flow_report_tokens: ["Token \u7528\u91CF", "Tokens used"],
  flow_choice_wait_best: ["\u62E9\u4F18", "Best score"],
  flow_form_scoreBy: ["\u8BC4\u5206\u6765\u6E90", "Score source"],
  flow_form_arena: ["\u8BB0\u5F55\u64C2\u53F0\u6218\u7EE9", "Track arena results"],
  flow_form_taskTag: ["\u4EFB\u52A1\u6807\u7B7E", "Task tag"],
  flow_lane_bindings: ["\u6CF3\u9053\u53C2\u6570\u7ED1\u5B9A", "Lane parameter bindings"],
  flow_lane_bind_provider: ["\u4F9B\u5E94\u5546\u5B57\u6BB5", "Provider field"],
  flow_lane_bind_model: ["\u6A21\u578B\u5B57\u6BB5", "Model field"],
  flow_lane_bind_persona: ["\u4EBA\u8BBE\u5B57\u6BB5", "Persona field"],
  flow_lane_bind_cwd: ["\u5DE5\u4F5C\u76EE\u5F55\u5B57\u6BB5", "Working directory field"],
  flow_play_random: ["\u968F\u673A", "Random"],
  flow_play_random_desc: ["\u6309\u79CD\u5B50\u968F\u673A\u6216\u6309\u987A\u5E8F\u9009\u62E9\u51FA\u53E3", "Select an output at random or in rotation"],
  flow_form_seed: ["\u968F\u673A\u79CD\u5B50", "Random seed"],
  flow_form_rotation: ["\u8F6E\u8BE2", "Round robin"],
  flow_form_random: ["\u968F\u673A", "Random"],
  flow_origin_canvas: ["\u753B\u5E03", "Canvas"],
  flow_origin_chat: ["\u5BF9\u8BDD", "Chat"],
  flow_origin_trigger: ["\u89E6\u53D1\u5668", "Trigger"],
  flow_run_origin: ["\u8FD0\u884C\u6765\u6E90", "Run origin"],
  flow_play_arena: ["\u6A21\u578B\u64C2\u53F0", "Model arena"],
  flow_play_arena_desc: ["\u591A\u4E2A\u6A21\u578B\u5B8C\u6210\u540C\u4E00\u4EFB\u52A1\uFF0C\u6309\u8BC4\u5206\u9009\u51FA\u7ED3\u679C", "Models answer the same task and the top score wins"],
  flow_play_jury: ["\u6A21\u578B\u966A\u5BA1\u56E2", "Model jury"],
  flow_play_jury_desc: ["\u6309\u6CD5\u5B9A\u6570\u6C47\u603B\u591A\u4F4D\u8BC4\u5BA1\u7684\u610F\u89C1", "Collect a quorum of model votes"],
  flow_play_debate: ["\u8FA9\u8BBA", "Debate"],
  flow_play_debate_desc: ["\u6B63\u53CD\u4E24\u65B9\u4EA4\u66FF\u9648\u8FF0\uFF0C\u7531\u6A21\u578B\u88C1\u51B3", "Alternate arguments and ask a model to judge them"],
  flow_play_wall: ["\u5934\u8111\u98CE\u66B4\u5899", "Brainstorm wall"],
  flow_play_wall_desc: ["\u6536\u96C6\u70B9\u5B50\uFF0C\u8BC4\u9009\u540E\u4EA4\u7ED9\u5B9E\u65BD\u8005", "Collect ideas, score them and hand one to an implementer"],
  flow_play_inspiration: ["\u968F\u673A\u7075\u611F", "Random inspiration"],
  flow_play_inspiration_desc: ["\u62BD\u53D6\u521B\u4F5C\u98CE\u683C\u540E\u751F\u6210\u4E00\u4EFD\u4F5C\u54C1", "Draw a style and create a piece in it"],
  flow_play_model_list: ["\u53C2\u8D5B\u6A21\u578B", "Models"],
  flow_play_author: ["\u521B\u4F5C\u8005", "Creator"],
  flow_play_review: ["\u8BC4\u5BA1", "Reviewer"],
  flow_play_best: ["\u6700\u4F73\u7ED3\u679C", "Best result"],
  flow_play_pro: ["\u6B63\u65B9", "For"],
  flow_play_con: ["\u53CD\u65B9", "Against"],
  flow_play_judge: ["\u88C1\u51B3", "Verdict"],
  flow_play_vote_task: ["\u6839\u636E\u9898\u76EE\u7ED9\u51FA\u8D5E\u6210\u6216\u53CD\u5BF9\u7968\uFF0C\u5E76\u8BF4\u660E\u7406\u7531\u3002", "Vote for or against the proposition and explain your vote."],
  flow_play_arena_task: ["\u4E3A\u673A\u68B0\u661F\u56FE\u5199\u4E00\u5F20\u4FBF\u4E8E\u513F\u7AE5\u9605\u8BFB\u7684\u5C55\u7B7E\u3002", "Write a museum label for children about a mechanical star chart."],
  flow_play_wall_task: ["\u4E3A\u8FD9\u4EF6\u5C55\u54C1\u63D0\u51FA\u4E00\u4E2A\u5177\u4F53\u53EF\u5B9E\u65BD\u7684\u4E92\u52A8\u70B9\u5B50\u3002", "Propose a practical interactive idea for this exhibit."],
  flow_play_wall_educator: ["\u535A\u7269\u9986\u6559\u80B2\u5458", "Museum educator"],
  flow_play_wall_educator_task: ["\u4ECE\u513F\u7AE5\u5982\u4F55\u89C2\u5BDF\u548C\u7406\u89E3\u5C55\u54C1\u7684\u89D2\u5EA6\u51FA\u53D1\u3002", "Consider how children can observe and understand the exhibit."],
  flow_play_wall_exhibit_designer: ["\u5C55\u9648\u8BBE\u8BA1\u5E08", "Exhibit designer"],
  flow_play_wall_exhibit_designer_task: ["\u4ECE\u5E03\u5C55\u7A7A\u95F4\u3001\u6750\u6599\u548C\u65E5\u5E38\u7EF4\u62A4\u7684\u89D2\u5EA6\u51FA\u53D1\u3002", "Consider exhibit space, materials, and day-to-day maintenance."],
  flow_play_debate_pro: ["\u63D0\u51FA\u5728\u5C55\u533A\u589E\u52A0\u52A8\u624B\u73AF\u8282\u7684\u7406\u7531\u3002", "Make the case for adding a hands-on activity to the exhibit."],
  flow_play_debate_con: ["\u56DE\u5E94\u6B63\u65B9\uFF0C\u5E76\u8BF4\u660E\u7EF4\u62A4\u548C\u6210\u672C\u65B9\u9762\u7684\u53D6\u820D\u3002", "Respond to the argument and address maintenance and cost tradeoffs."],
  flow_play_creative: ["\u7528\u4E0A\u6E38\u62BD\u5230\u7684\u98CE\u683C\uFF0C\u5199\u4E00\u6BB5\u673A\u68B0\u661F\u56FE\u7684\u5BFC\u89C8\u8BCD\u3002", "Use the selected style to write a short guide to a mechanical star chart."],
  flow_play_style_story: ["\u6545\u4E8B", "Story"],
  flow_play_style_question: ["\u63D0\u95EE", "Question"],
  flow_play_style_demo: ["\u6F14\u793A", "Demonstration"],
  flow_play_implement: ["\u6309\u6700\u9AD8\u5206\u63D0\u6848\u5199\u51FA\u4E09\u6B65\u5B9E\u65BD\u65B9\u6848\u3002", "Outline three steps to implement the highest-ranked idea."],
  flow_type_mismatch: ["\u63A5\u7EED\u7AEF\u53E3\u7684\u6570\u636E\u7C7B\u578B\u4E0D\u5339\u914D", "The continuation port data types do not match"],
  appTitle: ["FlowSpace \xB7 Agent \u753B\u5E03", "FlowSpace \xB7 Agent Canvas"],
  canvas: ["\u753B\u5E03", "Canvas"],
  conversation: ["\u5BF9\u8BDD", "Conversation"],
  workflows: ["\u5DE5\u4F5C\u6D41", "Workflows"],
  activity: ["\u8FD0\u884C\u8BB0\u5F55", "Activity"],
  settings: ["\u8BBE\u7F6E", "Settings"],
  workbench: ["\u5DE5\u4F5C\u53F0", "Workbench"],
  workspaces: ["\u5DE5\u4F5C\u533A", "Workspaces"],
  workspace: ["\u5DE5\u4F5C\u533A", "Workspace"],
  currentWorkspace: ["\u5F53\u524D\u5DE5\u4F5C\u533A", "Current workspace"],
  projectSessions: ["\u5DE5\u4F5C\u533A\u4E0E Agent", "Workspaces & agents"],
  hostSaved: ["\u5DF2\u4FDD\u5B58", "Saved"],
  saving: ["\u4FDD\u5B58\u4E2D\u2026", "Saving\u2026"],
  showWorkspace: ["\u5728\u753B\u5E03\u663E\u793A", "Show on canvas"],
  hideWorkspace: ["\u4ECE\u753B\u5E03\u9690\u85CF", "Hide from canvas"],
  searchNodes: ["\u641C\u7D22\u8282\u70B9", "Search nodes"],
  commandSearch: [
    "\u641C\u7D22\u8282\u70B9\u3001\u6587\u4EF6\u3001\u64CD\u4F5C\u6216\u5DE5\u4F5C\u6D41\u2026",
    "Search nodes, files, actions or workflows\u2026"
  ],
  command: ["\u5FEB\u6377\u547D\u4EE4", "Commands"],
  create: ["\u521B\u5EFA\u4E0E\u5BFC\u5165", "Create & import"],
  add: ["\u6DFB\u52A0\u8282\u70B9", "Add node"],
  newAgent: ["\u65B0\u5EFA Agent", "New agent"],
  existingSession: ["\u5DF2\u6709 DSH \u4F1A\u8BDD\u2026", "Existing DSH session\u2026"],
  newFile: ["\u6587\u4EF6\u5F15\u7528", "File reference"],
  newNote: ["\u65B0\u5EFA\u4FBF\u7B7E", "New note"],
  newBoard: ["\u4EFB\u52A1\u770B\u677F", "Task board"],
  newDisplay: ["\u5C55\u793A\u8282\u70B9", "Display node"],
  flow_qc_logic: ["\u903B\u8F91", "Logic"],
  flow_view_question: ["\u95EE\u9898", "Question"],
  flow_view_branches: ["\u5206\u652F", "Branches"],
  flow_view_missing: ["\u7F3A\u5C11\u63D2\u4EF6", "Missing plugin"],
  flow_view_latest: ["\u4E0A\u6B21\uFF1A{branch}", "Last: {branch}"],
  flow_view_remaining: ["\u5269 {time}", "{time} left"],
  flow_view_import_code: ["\u6B64\u5DE5\u4F5C\u6D41\u5305\u542B JavaScript \u4EE3\u7801\u8282\u70B9", "This workflow contains JavaScript code nodes"],
  flow_view_code_sandbox: ["\u811A\u672C\u5728 QuickJS \u6C99\u7BB1\u4E2D\u8FD0\u884C\uFF0C\u53EA\u80FD\u8BFB\u53D6\u8F93\u5165\u5FEB\u7167\u3002\u6587\u4EF6\u548C\u7F51\u7EDC\u63A5\u53E3\u5747\u5DF2\u5173\u95ED\u3002", "Scripts run in QuickJS with access only to the input snapshot. File and network access are disabled."],
  flow_view_accept_code: ["\u6211\u4E86\u89E3\u8FD0\u884C\u5DE5\u4F5C\u6D41\u65F6\u4F1A\u6267\u884C\u5BFC\u5165\u7684\u4EE3\u7801\uFF0C\u5E76\u540C\u610F\u5BFC\u5165\u3002", "I understand that running the workflow executes imported code and agree to import it."],
  flow_node: ["\u6D41\u7A0B\u8282\u70B9", "Flow node"],
  flow_skipped: ["\u5DF2\u8DF3\u8FC7", "Skipped"],
  flow_awaiting: ["\u7B49\u5F85\u56DE\u7B54", "Awaiting answer"],
  flow_data_text: ["\u6587\u672C", "Text"],
  flow_data_list: ["\u5217\u8868", "List"],
  flow_list_limit: ["\u5217\u8868\u6761\u76EE\u4E0A\u9650", "List item limit"],
  flow_list_limit_description: ["\u5217\u8868\u8D85\u8FC7\u4E0A\u9650\u65F6\uFF0C\u6309\u539F\u987A\u5E8F\u4FDD\u7559\u524D\u9762\u7684\u6761\u76EE\u3002", "When a list exceeds this limit, keep its first items in order."],
  flow_list_truncated: ["\u5DF2\u622A\u65AD \xB7 \u4FDD\u7559 {kept} / {total} \u9879", "Truncated \xB7 kept {kept} of {total} items"],
  flow_emit_mode: ["\u7ED3\u6784\u5316\u8F93\u51FA\u65F6\u673A", "Structured output timing"],
  flow_emit_end: ["\u7ED3\u675F\u65F6\u53D1", "At turn end"],
  flow_emit_stream: ["\u968F\u51FA\u968F\u53D1", "As emitted"],
  flow_emit_stream_targets: ["\u968F\u51FA\u968F\u53D1\u9002\u7528\u4E8E\u6247\u51FA\u3001\u5408\u5E76\u5206\u62E3\u548C\u6570\u636E\u8282\u70B9\u3002", "Streaming is available for fan-out, merge and data nodes."],
  flow_emit_missing: ["\u6B64\u6B65\u9AA4\u4ECD\u9700\u63D0\u4EA4\u7ED3\u6784\u5316\u8F93\u51FA\u3002", "This step still needs structured output."],
  flow_emit_remind: ["\u63D0\u9192\u8865\u4EA4", "Request missing output"],
  flow_fanout: ["\u6247\u51FA", "Fan-out"],
  flow_tpl_content_title: ["\u62C6\u5206 \u2192 \u6247\u51FA \u2192 \u5408\u5E76", "Split \u2192 Fan-out \u2192 Merge"],
  flow_tpl_content_description: ["\u6309\u884C\u62C6\u5F00\u5C55\u54C1\u6E05\u5355\uFF0C\u4E3A\u6BCF\u4EF6\u5C55\u54C1\u72EC\u7ACB\u64B0\u5199\u5C55\u7B7E\uFF0C\u518D\u6309\u539F\u987A\u5E8F\u6C47\u6210\u7F16\u53F7\u5BFC\u89C8\u3002", "Split the exhibit list by line, write each label in its own session, and assemble a numbered guide in source order."],
  flow_tpl_content_note: ["\u5C55\u54C1\u6E05\u5355", "Exhibit list"],
  flow_tpl_content_items: ["\u673A\u68B0\u661F\u56FE\n\u9EC4\u94DC\u65E5\u6677\n\u822A\u6D77\u7F57\u76D8", "Mechanical star chart\nBrass sundial\nMariner\u2019s compass"],
  flow_tpl_content_split: ["\u6309\u884C\u62C6\u5206", "Split by line"],
  flow_tpl_content_input: ["\u6E05\u5355\u6587\u672C", "List text"],
  flow_tpl_content_group: ["\u9010\u4EF6\u64B0\u5199\u5C55\u7B7E", "Write exhibit labels"],
  flow_tpl_content_master: ["\u5C55\u7B7E\u7F16\u8F91", "Label editor"],
  flow_tpl_content_task: ["\u4E3A\u8F93\u5165\u4E2D\u7684\u8FD9\u4EF6\u5C55\u54C1\u5199\u4E00\u53E5\u5C55\u7B7E\uFF0C\u8BF4\u660E\u8BBF\u5BA2\u80FD\u89C2\u5BDF\u5230\u7684\u7279\u5F81\u3002\u53EA\u8FD4\u56DE\u5C55\u7B7E\u6B63\u6587\u3002", "Write one label describing a feature a visitor can see in this exhibit. Return only the label text."],
  flow_tpl_content_result: ["\u7F16\u53F7\u5BFC\u89C8", "Numbered guide"],
  flow_fanout_desc: ["\u5C06\u5217\u8868\u4E2D\u7684\u6BCF\u4E00\u9879\u4EA4\u7ED9\u4E00\u6761\u6CF3\u9053\u5904\u7406\u3002", "Process each list item in its own lane."],
  flow_fanout_item: ["\u6761\u76EE", "Item"],
  flow_merge_sort: ["\u5408\u5E76\u5206\u62E3", "Merge and route"],
  flow_merge_sort_desc: ["\u6309\u8F93\u5165\u987A\u5E8F\u6C47\u96C6\u5404\u6CF3\u9053\u7684\u7ED3\u679C\u3002", "Collect the lane results in input order."],
  flow_lane_master: ["\u6BCD\u7248", "Master"],
  flow_lane_progress: ["\u5DF2\u7ED3\u675F {done}/{total} \u6761\u6CF3\u9053", "{done} of {total} lanes finished"],
  flow_lane_concurrency: ["\u5E76\u53D1 {limit}", "Concurrency {limit}"],
  flow_lane_removed: ["\u5DF2\u79FB\u51FA", "Removed"],
  flow_lane_overridden: ["\u5DF2\u8986\u76D6", "Overridden"],
  flow_lane_unused: ["\u7ED3\u679C\u672A\u91C7\u7528", "Result unused"],
  flow_lane_runtime: ["\u8FD0\u884C\u65F6\u751F\u6210", "Generated at runtime"],
  flow_lane_item_name: ["#{n} \xB7 {item}", "#{n} \xB7 {item}"],
  flow_insert_fanout: ["\u5728\u6B64\u63D2\u5165\u6247\u51FA\u7EC4", "Insert fan-out here"],
  flow_append_master_step: ["\u6DFB\u52A0\u6BCD\u7248\u6B65\u9AA4", "Add master step"],
  flow_cleanup_lanes: ["\u6E05\u7406\u5DF2\u79FB\u51FA\u6CF3\u9053", "Remove retired lanes"],
  flow_resume_master_sync: ["\u6062\u590D\u8DDF\u968F\u6BCD\u7248", "Resume master sync"],
  flow_lane_task: ["\u9010\u9879\u5904\u7406\u5E76\u7ED9\u51FA\u7ED3\u679C\u3002", "Process the item and return its result."],
  flow_fanout_group: ["\u6247\u51FA\u7EC4", "Fan-out group"],
  flow_merge_list: ["\u6761\u76EE\u5217\u8868", "Item list"],
  flow_merge_out: ["\u5408\u5E76\u7ED3\u679C", "Merged result"],
  flow_merge_pass: ["\u901A\u8FC7", "Pass"],
  flow_merge_fail: ["\u672A\u901A\u8FC7", "Fail"],
  flow_form_concurrency: ["\u5E76\u53D1\u4E0A\u9650", "Concurrent lanes"],
  flow_form_followMaster: ["\u8DDF\u968F\u6BCD\u7248", "Follow master lane"],
  flow_form_wait_policy: ["\u7B49\u5F85\u7B56\u7565", "Wait policy"],
  flow_choice_wait_all: ["\u5168\u90E8", "All"],
  flow_choice_wait_any: ["\u4EFB\u4E00", "Any"],
  flow_choice_wait_quorum: ["\u6CD5\u5B9A\u6570", "Quorum"],
  flow_form_quorum: ["\u6CD5\u5B9A\u6570", "Quorum"],
  flow_form_output: ["\u8F93\u51FA\u5F62\u5F0F", "Output format"],
  flow_form_list: ["\u5217\u8868", "List"],
  flow_form_cancelRest: ["\u53D6\u6D88\u5176\u4F59\u6CF3\u9053", "Cancel remaining lanes"],
  flow_form_sortMode: ["\u5206\u62E3\u65B9\u5F0F", "Routing mode"],
  flow_form_off: ["\u5173\u95ED", "Off"],
  flow_form_condition: ["\u6761\u4EF6\u89C4\u5219", "Condition"],
  flow_form_code: ["\u4EE3\u7801", "Code"],
  flow_form_ai: ["AI \u5224\u65AD", "AI decision"],
  flow_form_provider: ["\u4F9B\u5E94\u5546", "Provider"],
  flow_form_model: ["\u6A21\u578B", "Model"],
  flow_form_passDescription: ["\u901A\u8FC7\u6761\u4EF6", "Pass criteria"],
  flow_form_failDescription: ["\u672A\u901A\u8FC7\u6761\u4EF6", "Fail criteria"],
  flow_data_record: ["\u8BB0\u5F55", "Record"],
  flow_data_signal: ["\u4FE1\u53F7", "Signal"],
  flow_data_file: ["\u6587\u4EF6", "File"],
  flow_qc_data: ["\u6570\u636E", "Data"],
  flow_data_result: ["\u7ED3\u679C", "Result"],
  flow_data_split: ["\u62C6\u5206", "Split"],
  flow_data_split_desc: ["\u4ECE\u6587\u672C\u751F\u6210\u6709\u5E8F\u6761\u76EE\u5217\u8868\u3002", "Split text into an ordered list of items."],
  flow_data_join: ["\u5408\u5E76\u6587\u672C", "Join text"],
  flow_data_join_desc: ["\u5C06\u5217\u8868\u6761\u76EE\u6309\u987A\u5E8F\u6392\u6210\u4E00\u6BB5\u6587\u672C\u3002", "Join list items into a single text in order."],
  flow_data_extract: ["\u63D0\u53D6", "Extract"],
  flow_data_extract_desc: ["\u63D0\u53D6\u5339\u914D\u7684\u6587\u672C\u3001\u5B57\u6BB5\u6216\u4EE3\u7801\u5757\u3002", "Extract matching text, fields or code blocks."],
  flow_data_template: ["\u6587\u672C\u6A21\u677F", "Text template"],
  flow_data_template_desc: ["\u5C06\u591A\u4E2A\u547D\u540D\u8F93\u5165\u586B\u5165\u6587\u672C\u6A21\u677F\u3002", "Fill a text template using named inputs."],
  flow_data_map: ["\u6620\u5C04", "Map"],
  flow_data_map_desc: ["\u9010\u9879\u8F6C\u6362\u5185\u5BB9\uFF0C\u4FDD\u7559\u6BCF\u9879\u7684\u8EAB\u4EFD\u3002", "Transform each value while preserving its item key."],
  flow_data_filter: ["\u8FC7\u6EE4", "Filter"],
  flow_data_filter_desc: ["\u4FDD\u7559\u7B26\u5408\u6761\u4EF6\u7684\u6761\u76EE\u3002", "Keep the items that satisfy a condition."],
  flow_data_sort: ["\u6392\u5E8F", "Sort"],
  flow_data_sort_desc: ["\u6309\u5B57\u6BB5\u3001\u89C4\u5219\u6216\u6A21\u578B\u5224\u65AD\u91CD\u65B0\u6392\u5217\u6761\u76EE\u3002", "Order items by field, rule or model judgment."],
  flow_data_dedupe: ["\u53BB\u91CD", "Deduplicate"],
  flow_data_dedupe_desc: ["\u5408\u5E76\u91CD\u590D\u6761\u76EE\uFF0C\u4FDD\u7559\u4EE3\u8868\u9879\u3002", "Remove duplicates and keep a representative item."],
  flow_data_constant: ["\u5E38\u91CF", "Constant"],
  flow_data_constant_ref: ["\u5E38\u91CF\u5F15\u7528", "Constant reference"],
  flow_data_constant_desc: ["\u63D0\u4F9B\u56FA\u5B9A\u7684\u6587\u672C\u6216\u5217\u8868\u3002", "Supply a fixed text or list value."],
  flow_data_accumulate: ["\u7D2F\u79EF", "Accumulate"],
  flow_data_accumulate_desc: ["\u5C06\u672C\u6B21\u8FD0\u884C\u7684\u6BCF\u6279\u8F93\u5165\u8FFD\u52A0\u5230\u540C\u4E00\u5217\u8868\u3002", "Append each input batch to this run\u2019s list."],
  flow_data_parse: ["\u4E0A\u4E0B\u6587\u89E3\u6790", "Parse context"],
  flow_data_parse_desc: ["\u5C06\u6587\u672C\u4E2D\u7684\u5F85\u529E\u3001\u8DEF\u5F84\u3001\u9519\u8BEF\u6216\u4EE3\u7801\u6574\u7406\u6210\u5217\u8868\u3002", "Collect tasks, paths, errors or code from text."],
  flow_data_field_mode: ["\u5904\u7406\u65B9\u5F0F", "Method"],
  flow_data_field_delimiter: ["\u5206\u9694\u7B26", "Delimiter"],
  flow_data_field_pattern: ["\u6B63\u5219\u8868\u8FBE\u5F0F", "Regular expression"],
  flow_data_field_heading: ["\u6807\u9898", "Heading"],
  flow_data_field_template: ["\u6587\u672C\u6A21\u677F", "Template text"],
  flow_data_field_inputs: ["\u8F93\u5165\u540D\u79F0", "Input name"],
  flow_form_inputs: ["\u547D\u540D\u8F93\u5165", "Named input"],
  flow_data_field_order: ["\u987A\u5E8F", "Order"],
  flow_data_field_source: ["\u53D8\u6362\u51FD\u6570", "Transform function"],
  flow_data_field_instruction: ["\u5904\u7406\u6307\u4EE4", "Instructions"],
  flow_data_field_kind: ["\u63D0\u53D6\u5185\u5BB9", "Content to extract"],
  flow_data_field_value: ["\u5E38\u91CF\u503C", "Constant value"],
  flow_data_list_input_hint: ["\u6BCF\u884C\u586B\u5199\u4E00\u9879\uFF0C\u6216\u8F93\u5165 JSON \u6570\u7EC4\u3002", "Enter one item per line or a JSON array."],
  flow_data_named_hint: ["\u5728\u6A21\u677F\u91CC\u7528 {{\u8F93\u5165\u540D\u79F0}} \u63D2\u5165\u8BE5\u7AEF\u53E3\u7684\u5185\u5BB9\u3002", "Use {{inputName}} in the template to insert that port\u2019s content."],
  flow_data_item_hint: ["{{item}} \u63D2\u5165\u6761\u76EE\uFF0C{{n}} \u63D2\u5165\u4ECE 1 \u5F00\u59CB\u7684\u7F16\u53F7\u3002", "Use {{item}} for the item and {{n}} for its one-based number."],
  flow_data_calls: ["\u6A21\u578B\u8C03\u7528\u8BB0\u5F55 \xB7 {count}", "Model calls \xB7 {count}"],
  flow_data_call_item: ["\u6761\u76EE {n}", "Item {n}"],
  flow_data_call_usage: ["\u8F93\u5165 {input} \xB7 \u8F93\u51FA {output} token", "{input} input \xB7 {output} output tokens"],
  flow_data_trial: ["\u8BD5\u8FD0\u884C", "Try run"],
  flow_data_previous: ["\u4E0A\u6B21\u8FD0\u884C", "Last run"],
  flow_data_empty: ["\u65E0\u5185\u5BB9", "No content"],
  flow_data_waiting: ["\u7B49\u5F85\u4E0A\u6E38\u8F93\u5165", "Waiting for upstream input"],
  flow_data_loading: ["\u6B63\u5728\u8BFB\u53D6\u9884\u89C8\u2026", "Loading preview\u2026"],
  flow_data_remaining: ["\u8FD8\u6709 {n} \u9879", "{n} more items"],
  flow_data_choice_lines: ["\u6309\u884C", "Lines"],
  flow_data_choice_delimiter: ["\u5206\u9694\u7B26", "Delimiter"],
  flow_data_choice_regex: ["\u6B63\u5219\u8868\u8FBE\u5F0F", "Regular expression"],
  flow_data_choice_headings: ["Markdown \u6807\u9898", "Markdown headings"],
  "flow_data_choice_code-blocks": ["\u4EE3\u7801\u5757", "Code blocks"],
  flow_data_choice_numbered: ["\u7F16\u53F7\u5217\u8868", "Numbered list"],
  flow_data_choice_template: ["\u5957\u7528\u6A21\u677F", "Template"],
  "flow_data_choice_json-path": ["JSON \u8DEF\u5F84", "JSON path"],
  flow_data_choice_heading: ["\u6307\u5B9A\u6807\u9898\u4E0B\u7684\u6BB5\u843D", "Section under a heading"],
  flow_data_choice_code: ["JavaScript", "JavaScript"],
  flow_data_choice_ai: ["AI", "AI"],
  flow_data_choice_rule: ["\u89C4\u5219", "Rule"],
  flow_data_choice_field: ["\u5B57\u6BB5", "Field"],
  flow_data_choice_asc: ["\u5347\u5E8F", "Ascending"],
  flow_data_choice_desc: ["\u964D\u5E8F", "Descending"],
  flow_data_choice_exact: ["\u7CBE\u786E\u5339\u914D", "Exact match"],
  flow_data_choice_normalized: ["\u89C4\u8303\u5316\u5339\u914D", "Normalized match"],
  flow_data_choice_text: ["\u6587\u672C", "Text"],
  flow_data_choice_list: ["\u5217\u8868", "List"],
  flow_data_choice_todos: ["\u5F85\u529E\u4E8B\u9879", "To-do items"],
  flow_data_choice_paths: ["\u6587\u4EF6\u8DEF\u5F84", "File paths"],
  flow_data_choice_errors: ["\u9519\u8BEF\u4E0E\u5806\u6808", "Errors and stack traces"],
  flow_data_choice_json: ["JSON", "JSON"],
  flow_edge_not: ["\u975E", "Not"],
  flow_edge_round: ["\u2265\u7B2C{n}\u8F6E", "Round \u2265{n}"],
  flow_edge_limit: ["\u2264{n}\u6B21", "\u2264{n} times"],
  flow_edge_delay: ["\u5EF6\u8FDF {seconds}s", "Delay {seconds}s"],
  flow_condition: ["\u6761\u4EF6\u5224\u65AD", "Condition"],
  flow_condition_desc: ["\u6309\u987A\u5E8F\u68C0\u67E5\u89C4\u5219\uFF0C\u8F6C\u5230\u7B2C\u4E00\u4E2A\u5339\u914D\u7684\u5206\u652F\u3002", "Take the first branch whose rules match."],
  flow_code: ["\u4EE3\u7801\u5224\u65AD", "Code decision"],
  flow_code_desc: ["\u7528 JavaScript \u9009\u62E9\u5206\u652F\u3002", "Choose a branch with JavaScript."],
  flow_ai: ["AI \u5224\u65AD", "AI decision"],
  flow_ai_desc: ["\u7531\u6240\u9009\u6A21\u578B\u5224\u65AD\u5206\u652F\u5E76\u8BB0\u5F55\u7406\u7531\u3002", "Use the selected model to choose a branch and record its reason."],
  flow_human: ["\u4EBA\u5DE5\u9009\u62E9", "Human choice"],
  flow_human_desc: ["\u7B49\u5F85\u56DE\u7B54\uFF0C\u518D\u5C06\u8F93\u5165\u53D1\u5F80\u6240\u9009\u5206\u652F\u3002", "Wait for an answer and pass the input to that branch."],
  "flow_form_branches": ["\u5206\u652F", "Branches"],
  "flow_form_match": ["\u5339\u914D\u65B9\u5F0F", "Match"],
  "flow_form_rules": ["\u89C4\u5219", "Rules"],
  "flow_form_id": ["\u51FA\u53E3 ID", "Port ID"],
  "flow_form_label": ["\u663E\u793A\u540D\u79F0", "Label"],
  "flow_form_field": ["\u5224\u65AD\u5B57\u6BB5", "Field"],
  "flow_form_path": ["JSON \u8DEF\u5F84", "JSON path"],
  "flow_form_op": ["\u8FD0\u7B97\u7B26", "Operator"],
  "flow_form_value": ["\u6BD4\u8F83\u503C", "Comparison value"],
  "flow_form_source": ["\u5224\u65AD\u51FD\u6570", "Decision function"],
  "flow_form_timeoutMs": ["\u6267\u884C\u65F6\u9650\uFF08\u6BEB\u79D2\uFF09", "Time limit (ms)"],
  "flow_form_description": ["\u5206\u652F\u8BF4\u660E", "Branch description"],
  "flow_form_instruction": ["\u5224\u65AD\u6307\u4EE4", "Instructions"],
  "flow_form_lowConfidence": ["\u4F4E\u7F6E\u4FE1\u5EA6\u5904\u7406", "Low confidence"],
  "flow_form_threshold": ["\u7F6E\u4FE1\u5EA6\u9608\u503C", "Confidence threshold"],
  "flow_form_branch": ["\u51FA\u53E3 ID", "Port ID"],
  "flow_form_question": ["\u95EE\u9898", "Question"],
  "flow_form_options": ["\u9009\u9879", "Options"],
  "flow_form_timeoutSec": ["\u7B49\u5F85\u65F6\u9650\uFF08\u79D2\uFF09", "Wait time (seconds)"],
  "flow_form_timeoutAction": ["\u8D85\u65F6\u5904\u7406", "On timeout"],
  "flow_form_defaultOption": ["\u9ED8\u8BA4\u9009\u9879 ID", "Default option ID"],
  "flow_form_all": ["\u5168\u90E8\u6EE1\u8DB3", "All rules"],
  "flow_form_any": ["\u4EFB\u4E00\u6EE1\u8DB3", "Any rule"],
  "flow_form_text": ["\u6587\u672C", "Text"],
  "flow_form_json": ["JSON", "JSON"],
  "flow_form_contains": ["\u5305\u542B", "Contains"],
  "flow_form_not-contains": ["\u4E0D\u5305\u542B", "Does not contain"],
  "flow_form_regex": ["\u6B63\u5219\u5339\u914D", "Regular expression"],
  "flow_form_equals": ["\u7B49\u4E8E", "Equals"],
  "flow_form_empty": ["\u4E3A\u7A7A", "Is empty"],
  "flow_form_gt": ["\u5927\u4E8E", "Greater than"],
  "flow_form_lt": ["\u5C0F\u4E8E", "Less than"],
  "flow_form_wait": ["\u7EE7\u7EED\u7B49\u5F85", "Keep waiting"],
  "flow_form_skip": ["\u8DF3\u8FC7", "Skip"],
  "flow_form_default": ["\u9009\u62E9\u9ED8\u8BA4\u9879", "Use default option"],
  "flow_form_timeout-port": ["\u8F6C\u5230\u8D85\u65F6\u51FA\u53E3", "Use timeout port"],
  "flow_form_add": ["\u6DFB\u52A0{field}", "Add {field}"],
  "flow_form_up": ["\u4E0A\u79FB", "Move up"],
  "flow_form_down": ["\u4E0B\u79FB", "Move down"],
  "flow_form_remove": ["\u79FB\u9664", "Remove"],
  "flow_form_apply": ["\u5E94\u7528\u914D\u7F6E", "Apply configuration"],
  "flow_form_connected": ["\u7AEF\u53E3 {port} \u4E0A\u4ECD\u6709\u8FDE\u7EBF\u3002\u8BF7\u5148\u79FB\u9664\u6216\u6539\u63A5\u8FDE\u7EBF\uFF0C\u518D\u91CD\u547D\u540D\u6216\u5220\u9664\u7AEF\u53E3\u3002", "Port {port} has a connected wire. Disconnect or reconnect the wire before renaming or removing the port."],
  "flow_form_edge_logic": ["\u63A5\u7EED\u6761\u4EF6", "Continuation logic"],
  "flow_form_negate": ["\u53CD\u8F6C\u5206\u652F\u5339\u914D", "Invert branch match"],
  "flow_form_fromRound": ["\u8D77\u59CB\u8F6E\u6B21", "Starting round"],
  "flow_form_maxTimes": ["\u6700\u591A\u89E6\u53D1\u6B21\u6570", "Maximum activations"],
  "flow_form_delayMs": ["\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09", "Delay (ms)"],
  "flow_form_unset": ["\u672A\u8BBE\u7F6E", "Unset"],
  flow_else: ["\u5426\u5219", "Otherwise"],
  flow_error: ["\u51FA\u9519", "Error"],
  flow_timeout: ["\u8D85\u65F6", "Timeout"],
  nodeKind_agent: ["Agent", "Agent"],
  nodeKind_note: ["\u4FBF\u7B7E", "Note"],
  nodeKind_file: ["\u6587\u4EF6", "Files"],
  nodeKind_display: ["\u8F93\u51FA", "Output"],
  nodeKind_board: ["\u770B\u677F", "Board"],
  nodeKind_detail: ["\u6267\u884C", "Run"],
  nodeKind_git: ["Git", "Git"],
  nodeKind_changes: ["\u6539\u52A8", "Changes"],
  nodeKind_terminal: ["\u7EC8\u7AEF", "Terminal"],
  nodeKind_role: ["\u5C97\u4F4D", "Role"],
  filter: ["\u663E\u793A", "Show"],
  auto: ["\u81EA\u52A8", "Auto"],
  onlyRunning: ["\u8FD0\u884C\u4E0E\u7B49\u5F85", "Running & waiting"],
  all: ["\u5168\u90E8\u8282\u70B9", "All nodes"],
  run: ["\u542F\u52A8", "Run"],
  runAll: ["\u5168\u5C40\u542F\u52A8", "Run all"],
  runSelection: ["\u542F\u52A8\u9009\u533A", "Run selection"],
  runGroup: ["\u542F\u52A8\u5DE5\u4F5C\u6D41", "Run workflow"],
  runSingle: ["\u542F\u52A8 Agent", "Run agent"],
  runCount: ["\u542F\u52A8 {count} \u4E2A\u8D77\u59CB Agent", "Run {count} starting agents"],
  launchDescription: [
    "\u8D77\u59CB Agent \u5148\u8FD0\u884C\uFF0C\u4E0B\u6E38\u6309\u63A5\u7EED\u89C4\u5219\u63A8\u8FDB\u3002\u9690\u85CF\u5DE5\u4F5C\u533A\u7684\u53EF\u8FD0\u884C\u8D77\u70B9\u4E5F\u5305\u542B\u5728\u5185\u3002",
    "Starting agents run first, then continuations advance the flow. Hidden starters are included."
  ],
  hidden: ["\u5DF2\u9690\u85CF", "Hidden"],
  noStarters: ["\u8FD8\u6CA1\u6709\u53EF\u542F\u52A8\u7684\u4EFB\u52A1", "No tasks ready to run"],
  noStartersDescription: [
    "\u4E3A Agent \u5199\u4E0B\u4EFB\u52A1\uFF0C\u6216\u4E3A\u5DF2\u5B8C\u6210\u7684 Agent \u8865\u5145\u65B0\u8F93\u5165\u3002",
    "Write a task for an agent, or add new input to a completed agent."
  ],
  task: ["\u4EFB\u52A1", "Task"],
  conversationTab: ["\u5BF9\u8BDD", "Conversation"],
  execution: ["\u6267\u884C", "Execution"],
  savedTask: ["\u4EFB\u52A1\u9884\u8BBE", "Saved task"],
  taskPlaceholder: [
    "\u5199\u4E0B\u8981\u5B8C\u6210\u7684\u4EFB\u52A1\u2026\uFF08\u8F93\u5165 @ \u5F15\u7528\u4E0A\u4E0B\u6587\uFF0CEnter \u542F\u52A8\uFF09",
    "Describe the task\u2026 (@ to reference context, Enter to run)"
  ],
  followupPlaceholder: [
    "\u8865\u5145\u4E0B\u4E00\u8F6E\u6307\u793A\uFF0C@ \u5F15\u7528\u4E0A\u4E0B\u6587\u2026",
    "Add next-turn instructions, @ to reference context\u2026"
  ],
  send: ["\u53D1\u9001", "Send"],
  queueSend: ["\u52A0\u5165\u961F\u5217", "Queue"],
  rerun: ["\u91CD\u65B0\u8FD0\u884C", "Run again"],
  bindConversation: ["\u521B\u5EFA\u5E76\u6253\u5F00\u539F\u751F\u4F1A\u8BDD", "Create & open session"],
  forkDraftHint: [
    "\u6B64\u8349\u7A3F\u5DF2\u63A5\u5165\u5386\u53F2\u5206\u53C9\uFF0C\u9996\u6B21\u8FD0\u884C\u65F6\u5C06\u81EA\u52A8\u4ECE\u4E0A\u6E38\u4F1A\u8BDD\u5206\u53C9\u521B\u5EFA\u3002",
    "Connected via history fork; the session is forked automatically on first run."
  ],
  openingConversation: ["\u6B63\u5728\u6253\u5F00\u4F1A\u8BDD\u2026", "Opening conversation\u2026"],
  openNativeChat: ["\u5728\u539F\u751F\u5BF9\u8BDD\u4E2D\u6253\u5F00", "Open in native chat"],
  noMessages: [
    "\u542F\u52A8\u8FD0\u884C\u6216\u521B\u5EFA\u4F1A\u8BDD\u540E\uFF0C\u539F\u751F\u5BF9\u8BDD\u5C06\u5728\u6B64\u5904\u5C55\u5F00",
    "Start or create a session to chat here"
  ],
  noEvents: [
    "\u8FD0\u884C\u540E\uFF0C\u5728\u8FD9\u91CC\u67E5\u770B\u6BCF\u8F6E\u6B65\u9AA4\u8F68\u8FF9",
    "Run an agent to inspect its execution steps here"
  ],
  executionDetail: ["\u6267\u884C\u8BE6\u60C5", "Execution details"],
  pinDetail: ["\u51BB\u7ED3\u5F53\u524D\u5FEB\u7167", "Freeze snapshot"],
  unpinDetail: ["\u6062\u590D\u8DDF\u968F\u6700\u65B0", "Follow live"],
  context: ["\u4E0A\u4E0B\u6587", "Context"],
  addContext: ["\u6DFB\u52A0\u5F15\u7528", "Add reference"],
  reference: ["\u5F15\u7528", "Reference"],
  continuation: ["\u63A5\u7EED", "Continuation"],
  messagesLine: ["\u539F\u751F\u6D88\u606F", "Messages"],
  refInput: ["\u5F15\u7528\u8F93\u5165", "Reference input"],
  refOutput: ["\u5F15\u7528\u8F93\u51FA", "Reference output"],
  contInput: ["\u63A5\u7EED\u5165\u53E3", "Continuation input"],
  contOutput: ["\u63A5\u7EED\u51FA\u53E3", "Continuation output"],
  quoteMessage: ["\u5F15\u51FA\u4E3A\u5C55\u793A\u8282\u70B9", "Extract as display node"],
  quoteSelection: ["\u5F15\u51FA\u9009\u4E2D\u6587\u5B57", "Extract selected text"],
  viewSource: ["\u5B9A\u4F4D\u6765\u6E90", "Locate source"],
  fixed: ["\u56FA\u5B9A\u5185\u5BB9", "Pinned"],
  follow: ["\u8DDF\u968F\u6700\u65B0", "Follow latest"],
  noOutput: ["\u7B49\u5F85\u6765\u6E90\u8F93\u51FA\u2026", "Waiting for source output\u2026"],
  pending: ["\u5F85\u53D1", "Pending"],
  sent: ["\u5DF2\u53D1", "Sent"],
  updated: ["\u6765\u6E90\u66F4\u65B0", "Updated"],
  always: ["\u59CB\u7EC8\u9644\u5E26", "Always include"],
  live: ["\u5B9E\u65F6\u9884\u89C8", "Live"],
  pendingTip: ["\u4E0B\u6B21\u53D1\u9001\u65F6\u9644\u5E26\u6B64\u5F15\u7528", "Included with the next prompt"],
  sentTip: ["\u5DF2\u53D1\u9001\uFF0C\u70B9\u51FB\u53EF\u91CD\u65B0\u9644\u5E26", "Already sent. Click to re-arm"],
  updatedTip: ["\u6765\u6E90\u5DF2\u66F4\u65B0\uFF0C\u4E0B\u6B21\u53D1\u9001\u65F6\u91CD\u65B0\u9644\u5E26", "Updated; included next turn"],
  alwaysTip: ["\u6BCF\u6B21\u53D1\u9001\u90FD\u81EA\u52A8\u9644\u5E26", "Included with every turn"],
  mode: ["\u4F20\u9012\u5185\u5BB9", "Context mode"],
  conclusion: ["\u672C\u8F6E\u7ED3\u8BBA", "Conclusion"],
  session: ["\u4F1A\u8BDD\u5FEB\u7167", "Session transcript"],
  fork: ["\u5386\u53F2\u5206\u53C9", "Fork history"],
  conclusionDescription: [
    "\u4F20\u9012\u4E0A\u6E38\u622A\u81F3\u89E6\u53D1\u5E8F\u53F7\u7684\u6700\u540E\u4E00\u8F6E\u52A9\u624B\u7ED3\u8BBA",
    "Pass the final assistant conclusion locked at trigger seq"
  ],
  sessionDescription: [
    "\u4F20\u9012\u622A\u81F3\u89E6\u53D1\u5E8F\u53F7\u7684\u7528\u6237\u4E0E\u52A9\u624B\u5BF9\u8BDD\u5FEB\u7167\uFF08\u5254\u9664\u5DE5\u5177\u566A\u97F3\uFF09",
    "Pass folded user & assistant transcript at trigger seq (no tool noise)"
  ],
  forkDescription: [
    "\u4ECE\u4E0A\u6E38\u5DF2\u5B8C\u6210\u4E8B\u4EF6\u8FB9\u754C\u6D3E\u751F\u72EC\u7ACB\u4F1A\u8BDD\uFF08\u7EE7\u627F\u5B8C\u6574\u5386\u53F2\uFF09",
    "Fork a new DSH session inheriting full history up to completed seq"
  ],
  draftOnly: ["\u76EE\u6807\u9700\u8981\u662F\u5C1A\u672A\u7ED1\u5B9A\u4F1A\u8BDD\u7684\u8349\u7A3F", "Target must be an unbound draft agent"],
  createdBy: ["\u9996\u6B21\u8FD0\u884C\u7531\u300C{mode}\u300D\u521B\u5EFA", "Created via {mode}"],
  trigger: ["\u89E6\u53D1\u65B9\u5F0F", "Trigger"],
  off: ["\u4E0D\u81EA\u52A8\u89E6\u53D1", "Reference only"],
  automatic: ["\u81EA\u52A8\u63A5\u7EED", "Automatic"],
  confirm: ["\u7B49\u5F85\u786E\u8BA4", "Confirm first"],
  release: ["\u653E\u884C", "Continue"],
  dismiss: ["\u8FD9\u6B21\u8DF3\u8FC7", "Skip"],
  waitingConfirmation: ["\u7B49\u5F85\u4F60\u7684\u786E\u8BA4", "Waiting for confirmation"],
  scopeBoundary: ["\u5DF2\u5230\u8FBE\u542F\u52A8\u8303\u56F4\u8FB9\u754C", "Reached run scope boundary"],
  loopCapReached: ["\u5DF2\u8FBE\u5FAA\u73AF\u4E0A\u9650\uFF08{count} \u8F6E\uFF09", "Reached loop limit ({count} rounds)"],
  loopCapGate: ["\u5DF2\u8FBE\u6709\u754C\u5FAA\u73AF\u4E0A\u9650\uFF0C\u5F85\u786E\u8BA4\u7EED\u8DD1", "Loop bound reached \xB7 awaiting +1 round"],
  extendLoopOne: ["\u7EED\u8DD1 +1 \u8F6E", "+1 round"],
  planPendingConfirm: ["\u5F85\u786E\u8BA4\u8BA1\u5212", "Plan awaiting confirmation"],
  waitingDescription: [
    "\u4E0A\u6E38\u5DF2\u5B8C\u6210\u5E76\u56FA\u5B9A\u5FEB\u7167\u3002\u653E\u884C\u540E\u5C06\u5E26\u7740\u8BE5\u7ED3\u679C\u63A8\u8FDB\u5F53\u524D\u4EFB\u52A1\u3002",
    "Upstream finished and captured. Continue to run with the captured result."
  ],
  approvalNeeded: ["\u7B49\u5F85\u5BA1\u6279\u6216\u56DE\u7B54", "Approval or answer needed"],
  approvalDescription: [
    "\u5F53\u524D\u4F1A\u8BDD\u6B63\u5728\u7B49\u5F85\u5DE5\u5177\u5BA1\u6279\u3001\u8BA1\u5212\u786E\u8BA4\u6216\u63D0\u95EE\u56DE\u7B54\uFF0C\u53EF\u76F4\u63A5\u5728\u5C55\u5F00\u7684\u753B\u5E03\u5361\u7247/\u6D6E\u7A97\u5185\u5904\u7406\uFF0C\u6216\u5207\u81F3\u539F\u751F\u5BF9\u8BDD\u9875\u540C\u6B65\u64CD\u4F5C\u3002",
    "Session is awaiting tool approval, plan confirmation or user input \u2014 handle inline on the expanded card/window or in native Conversation."
  ],
  openApprovalTab: ["\u5B9A\u4F4D\u5E76\u5904\u7406", "Focus & handle"],
  maxRounds: ["\u5FAA\u73AF\u4E0A\u9650", "Max loop rounds"],
  rounds: ["{count} \u8F6E", "{count} rounds"],
  waypoint: ["\u4E2D\u7EE7\u70B9", "Waypoint"],
  addWaypoint: ["\u6DFB\u52A0\u4E2D\u7EE7\u70B9", "Add waypoint"],
  clearWaypoints: ["\u6E05\u9664\u4E2D\u7EE7\u70B9", "Clear waypoints"],
  removeWaypoint: ["\u79FB\u9664\u4E2D\u7EE7\u70B9", "Remove waypoint"],
  deleteConnection: ["\u5220\u9664\u8FDE\u7EBF", "Delete connection"],
  draft: ["\u8349\u7A3F", "Draft"],
  running: ["\u8FD0\u884C\u4E2D", "Running"],
  queued: ["\u6392\u961F\u4E2D", "Queued"],
  waiting: ["\u7B49\u4F60\u786E\u8BA4", "Needs confirm"],
  input: ["\u7B49\u5F85\u5BA1\u6279", "Input needed"],
  paused: ["\u5DF2\u6682\u505C", "Paused"],
  bypassed: ["\u65C1\u8DEF\u900F\u4F20", "Bypassed"],
  completed: ["\u5DF2\u5B8C\u6210", "Done"],
  done: ["\u5DF2\u5B8C\u6210", "Done"],
  interrupted: ["\u5F85\u6062\u590D", "Interrupted"],
  aborted: ["\u5DF2\u4E2D\u6B62", "Stopped"],
  cancelled: ["\u5DF2\u53D6\u6D88", "Cancelled"],
  error: ["\u5F02\u5E38", "Error"],
  pause: ["\u6682\u505C\u540E\u7EED", "Pause"],
  resume: ["\u7EE7\u7EED\u63A8\u8FDB", "Resume"],
  stop: ["\u4E2D\u6B62", "Stop"],
  stopAgent: ["\u505C\u6B62\u5F53\u524D\u56DE\u5408", "Stop active turn"],
  cancelRun: ["\u53D6\u6D88\u8FD0\u884C", "Cancel run"],
  inspector: ["\u68C0\u67E5\u5668", "Inspector"],
  close: ["\u5173\u95ED", "Close"],
  name: ["\u540D\u79F0", "Name"],
  description: ["\u8BF4\u660E", "Description"],
  cancel: ["\u53D6\u6D88", "Cancel"],
  save: ["\u4FDD\u5B58", "Save"],
  delete: ["\u79FB\u9664", "Remove"],
  deleteNode: ["\u4ECE\u753B\u5E03\u79FB\u9664", "Remove from canvas"],
  deleteSelected: ["\u79FB\u9664\u6240\u9009\u5BF9\u8C61", "Remove selected"],
  removeKeepSession: ["\u79FB\u9664\u8282\u70B9\u4E0D\u4F1A\u5220\u9664 DSH \u4F1A\u8BDD\u5386\u53F2\u3002", "Removing a node keeps its DSH session."],
  rename: ["\u91CD\u547D\u540D", "Rename"],
  expand: ["\u5C55\u5F00\u5361\u7247", "Expand"],
  collapse: ["\u6536\u6210\u7CBE\u7B80\u5361", "Collapse"],
  openWindow: ["\u5F39\u51FA\u4E3A\u6D6E\u7A97", "Open in window"],
  returnCanvas: ["\u6536\u56DE\u753B\u5E03", "Return to canvas"],
  maximize: ["\u6700\u5927\u5316\u6D6E\u7A97", "Maximize"],
  restoreWindow: ["\u8FD8\u539F\u6D6E\u7A97", "Restore"],
  snapLeft: ["\u5438\u9644\u5230\u5DE6\u4FA7", "Snap left"],
  snapRight: ["\u5438\u9644\u5230\u53F3\u4FA7", "Snap right"],
  pin: ["\u56FA\u5B9A\u4F4D\u7F6E\u4E0E\u5C55\u5F00\u6001", "Pin position & size"],
  unpin: ["\u53D6\u6D88\u56FA\u5B9A", "Unpin"],
  inspect: ["\u6253\u5F00\u68C0\u67E5\u5668", "Inspect"],
  participation: ["\u53C2\u4E0E\u65B9\u5F0F", "Participation"],
  global: ["\u53C2\u4E0E\u5168\u5C40\u4E0E\u5206\u7EC4\u5DE5\u4F5C\u6D41", "Include in workflow"],
  manual: ["\u4EC5\u624B\u52A8\u542F\u52A8\u6216\u653E\u884C", "Manual start only"],
  pausedParticipation: ["\u6682\u505C\u53C2\u4E0E\uFF08\u9759\u97F3\u963B\u65AD Ctrl+M\uFF09", "Muted / Paused (halt branch Ctrl+M)"],
  bypassParticipation: [
    "\u65C1\u8DEF\u900F\u4F20\uFF08\u8DF3\u8FC7\u672C\u5361\u5E76\u76F4\u4F20\u4E0A\u6E38\u5FEB\u7167 Ctrl+B\uFF09",
    "Bypass (pass upstream snapshot through Ctrl+B)"
  ],
  toggleBypass: ["\u5207\u6362\u65C1\u8DEF\u900F\u4F20 (Ctrl+B)", "Toggle bypass (Ctrl+B)"],
  toggleMute: ["\u5207\u6362\u9759\u97F3\u6682\u505C (Ctrl+M)", "Toggle mute/pause (Ctrl+M)"],
  runFromHere: ["\u4ECE\u6B64\u8282\u70B9\u5411\u4E0B\u6E38\u8FD0\u884C", "Run from here downstream"],
  runToHere: ["\u8FD0\u884C\u4E0A\u6E38\u81F3\u6B64\u8282\u70B9", "Run ancestors to here"],
  forkHypothesis: ["\u5206\u53C9\u5E76\u884C\u5B9E\u9A8C\u5206\u652F", "Fork hypothesis branch"],
  forkHypothesisTip: [
    "\u57FA\u4E8E\u5F53\u524D\u5DF2\u5B8C\u6210\u56DE\u5408\u5386\u53F2\u6D3E\u751F\u5E76\u884C\u5B9E\u9A8C\u8349\u7A3F",
    "Branch a new draft agent inheriting completed session history"
  ],
  nativeTriggerLabel: ["\u539F\u751F\u5BF9\u8BDD\u89E6\u53D1\u63A5\u7EED", "Continue from native chat"],
  nativeTriggerOn: ["\u63A5\u7EED\xB7\u5F00", "Auto\xB7On"],
  nativeTriggerOff: ["\u63A5\u7EED\xB7\u5173", "Auto\xB7Off"],
  viewInFlowspace: ["\u5728 FlowSpace \u4E2D\u67E5\u770B\u548C\u8BBE\u7F6E\u63A5\u7EED", "View and configure continuations in FlowSpace"],
  sessionBound: ["\u5DF2\u7ED1\u5B9A\u4F1A\u8BDD", "Session"],
  sessionUnbound: ["\u539F\u751F\u4F1A\u8BDD", "DSH Session"],
  inheritGlobal: ["\u7EE7\u627F\u5168\u5C40\uFF08{state}\uFF09", "Use global ({state})"],
  enabled: ["\u5F00\u542F", "On"],
  disabled: ["\u5173\u95ED", "Off"],
  rerunRule: ["\u91CD\u590D\u542F\u52A8\u7B56\u7565", "Rerun rule"],
  onInput: ["\u6709\u65B0\u8349\u7A3F\u8F93\u5165\u65F6", "When new draft exists"],
  onUpdate: ["\u5F15\u7528\u5185\u5BB9\u66F4\u65B0\u65F6", "When references update"],
  everyRun: ["\u6BCF\u6B21\u5168\u5C40\u542F\u52A8\u90FD\u8FD0\u884C", "Every workflow launch"],
  groupSelection: ["\u7F16\u7EC4\u5DE5\u4F5C\u6D41 (Ctrl+G)", "Group workflow (Ctrl+G)"],
  groupNeedSelection: ["\u8BF7\u6309\u4F4F Shift \u9009\u62E9\u81F3\u5C11 2 \u4E2A\u8282\u70B9\u540E\u518D\u7F16\u7EC4", "Select at least 2 nodes to group"],
  groupNotFound: ["\u5DE5\u4F5C\u6D41\u5206\u7EC4\u4E0D\u5B58\u5728", "Workflow group does not exist"],
  nestedLimit: ["\u5206\u7EC4\u6700\u591A\u652F\u6301\u4E24\u5C42\u5D4C\u5957", "Groups support at most 2 nesting levels"],
  groupSettings: ["\u5DE5\u4F5C\u6D41\u5206\u7EC4", "Workflow group"],
  groupColor: ["\u5206\u7EC4\u5F3A\u8C03\u8272", "Accent color"],
  blue: ["\u6DF1\u7D22\u84DD", "DeepSeek Blue"],
  violet: ["\u661F\u4E91\u7D2B", "Nebula Violet"],
  teal: ["\u9752\u78A7", "Teal"],
  amber: ["\u7425\u73C0\u91D1", "Amber"],
  ports: ["\u6298\u53E0\u4EE3\u7406\u7AEF\u53E3", "Composite proxy ports"],
  portName: ["\u7AEF\u53E3\u540D\u79F0", "Port name"],
  inputPort: ["\u5165\u53E3", "Input"],
  outputPort: ["\u51FA\u53E3", "Output"],
  reorderUp: ["\u4E0A\u79FB", "Move up"],
  hidePort: ["\u9690\u85CF\u6216\u663E\u793A\u7AEF\u53E3", "Toggle port visibility"],
  mergePorts: ["\u5408\u5E76\u5165\u53E3\u7AEF\u53E3\u2026", "Merge input ports\u2026"],
  ungroup: ["\u89E3\u6563\u5206\u7EC4\uFF08\u4FDD\u7559\u8282\u70B9\uFF09", "Ungroup (keep nodes)"],
  saveTemplate: ["\u4FDD\u5B58\u4E3A\u5DE5\u4F5C\u6D41\u6A21\u677F", "Save as template"],
  syncTemplate: ["\u6309\u6A21\u677F\u540C\u6B65\u2026", "Sync with template\u2026"],
  saveNewVersion: ["\u66F4\u65B0\u6A21\u677F\u7248\u672C", "Save new template version"],
  detachTemplate: ["\u89E3\u9664\u6A21\u677F\u5173\u8054", "Detach from template"],
  templateLinked: ["\u6A21\u677F v{version}", "Template v{version}"],
  workflowLibrary: ["\u5DE5\u4F5C\u6D41\u4E0E\u72B6\u6001\u5E93", "Workflows & snapshots"],
  libraryDescription: [
    "\u4ECE\u6210\u719F\u7684 Agent ComfyUI \u534F\u4F5C\u84DD\u56FE\u8D77\u6B65\uFF0C\u6216\u5C06\u753B\u5E03\u4E0A\u7684\u5DE5\u4F5C\u6D41\u4FDD\u5B58\u4E3A\u53EF\u539F\u5730\u540C\u6B65\u7684\u6A21\u677F\u4E0E\u72B6\u6001\u5FEB\u7167\u3002",
    "Start from battle-tested Agent ComfyUI blueprints, or save your own syncable templates and state snapshots."
  ],
  builtIn: ["\u5185\u7F6E\u5DE5\u4F5C\u6D41\u84DD\u56FE", "Built-in blueprints"],
  mine: ["\u6211\u7684\u6A21\u677F", "My templates"],
  snapshots: ["\u72B6\u6001\u5FEB\u7167", "Snapshots"],
  useTemplate: ["\u653E\u5165\u753B\u5E03", "Drop on canvas"],
  previewTemplate: ["\u9884\u89C8\u62D3\u6251", "Preview topology"],
  nodesCount: ["{count} \u4E2A\u8282\u70B9", "{count} nodes"],
  noTemplates: ["\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u6A21\u677F", "No custom templates yet"],
  noTemplatesDescription: [
    "\u5728\u753B\u5E03\u4E2D\u6846\u9009\u591A\u4E2A\u8282\u70B9\u6309 G / Ctrl+G \u7F16\u7EC4\uFF0C\u5373\u53EF\u5728\u68C0\u67E5\u5668\u4E2D\u4FDD\u5B58\u4E3A\u53EF\u590D\u7528\u6A21\u677F\u3002",
    "Group nodes with G / Ctrl+G on the canvas, then save the group as a reusable template."
  ],
  saveSnapshot: ["\u4FDD\u5B58\u72B6\u6001", "Save snapshot"],
  snapshotDescription: [
    "\u4FDD\u5B58\u5F53\u524D\u753B\u5E03\u5E03\u5C40\u3001\u8349\u7A3F\u4E0E\u6700\u8FD1\u8F93\u51FA\u6458\u8981\u3002\u6062\u590D\u5FEB\u7167\u65F6\u5B89\u5168\u505C\u6B62\u5728\u9014\u8C03\u5EA6\uFF0C\u7EDD\u4E0D\u91CD\u653E\u63D0\u793A\u8BCD\u3002",
    "Save layout, drafts and recent output summaries. Restoring safely stops active runs and never replays prompts."
  ],
  restoreSnapshot: ["\u6062\u590D\u6B64\u72B6\u6001", "Restore snapshot"],
  noSnapshots: ["\u8FD8\u6CA1\u6709\u4FDD\u5B58\u72B6\u6001\u5FEB\u7167", "No snapshots saved yet"],
  noSnapshotsDescription: [
    "\u70B9\u51FB\u9876\u680F\u300C\u4FDD\u5B58\u72B6\u6001\u300D\uFF0C\u968F\u65F6\u4E3A\u5B9E\u9A8C\u5206\u652F\u5E03\u5C40\u548C\u8349\u7A3F\u7559\u5B58\u68C0\u67E5\u70B9\u3002",
    "Use Save snapshot in the top bar before rearranging or experimenting."
  ],
  snapshotSaved: ["\u72B6\u6001\u5FEB\u7167\u5DF2\u4FDD\u5B58", "Snapshot saved"],
  snapshotRestored: [
    "\u5DF2\u6062\u590D\u753B\u5E03\u5FEB\u7167\uFF08\u5728\u9014\u8FD0\u884C\u5DF2\u505C\u6B62\uFF0C\u4E0D\u4F1A\u91CD\u653E\u63D0\u793A\u8BCD\uFF09",
    "Snapshot restored without replaying prompts"
  ],
  templateSaved: ["\u5DE5\u4F5C\u6D41\u6A21\u677F\u5DF2\u4FDD\u5B58", "Workflow template saved"],
  templateAdded: ["\u5DE5\u4F5C\u6D41\u5DF2\u653E\u5165\u753B\u5E03", "Workflow added to canvas"],
  templateSynced: ["\u5DF2\u6309\u6A21\u677F\u539F\u5730\u540C\u6B65", "Workflow synced with template"],
  groupCreated: ["\u5DF2\u521B\u5EFA\u5DE5\u4F5C\u6D41\u5206\u7EC4", "Workflow group created"],
  nodeCreated: ["\u8282\u70B9\u5DF2\u521B\u5EFA", "Node created"],
  copied: ["\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F", "Copied to clipboard"],
  /* ---------- 6 Built-In "Agent ComfyUI" Blueprints ---------- */
  implementationReview: [
    "\u65B9\u6848\u89C4\u5212 \u2192 \u6311\u523A\u5BA1\u67E5 \u2192 \u786E\u8BA4\u4EA4\u4ED8",
    "Spec \u2192 Plan Gate \u2192 Adversarial Critique \u2192 Delivery"
  ],
  implementationReviewDescription: [
    "\u4FBF\u7B7E\u951A\u5B9A\u9A8C\u6536\u7EA6\u675F\uFF08\u59CB\u7EC8\u9644\u5E26\uFF09\uFF0C\u67B6\u6784\u5E08\u5F00\u542F Plan \u6A21\u5F0F\u8F93\u51FA\u65B9\u6848\uFF0C\u5BA1\u67E5\u5458\u57FA\u4E8E\u5B8C\u6574\u4F1A\u8BDD\u5FEB\u7167\u6311\u523A\uFF0C\u4EBA\u5DE5\u786E\u8BA4\u540E\u751F\u6210\u53EF\u6267\u884C\u6E05\u5355\u3002",
    "Pinned constraints feed a Plan-mode Architect; a Staff Critic audits the folded session transcript before human-gated delivery."
  ],
  parallelResearch: [
    "\u53CC\u8DEF\u5E76\u884C\u4FA6\u5BDF \u2192 \u6C47\u5408\u7EFC\u8FF0",
    "Parallel Repo Recon \u2192 Join Synthesis"
  ],
  parallelResearchDescription: [
    "\u76EE\u6807\u4FBF\u7B7E\u5F15\u5BFC\u4E24\u8DEF\u4FA6\u5BDF Agent \u540C\u65F6\u626B\u63CF\u6A21\u5757\u6570\u636E\u6D41\u4E0E\u7C7B\u578B\u6D4B\u8BD5\u8FB9\u754C\uFF0C\u5728\u6C47\u5408\u5C4F\u969C\u5904\u81EA\u52A8\u5408\u6210\u5168\u666F\u8DEF\u7EBF\u56FE\u3002",
    "Investigation goals guide two parallel scouts across architecture and test boundaries, auto-joining into one synthesis brief."
  ],
  tddLoopWorkflow: [
    "\u7EA2\u7EFF\u91CD\u6784 \xB7 \u6709\u754C\u81EA\u6108\u95ED\u73AF (\xD73)",
    "Self-Healing TDD Bounded Loop (\xD73)"
  ],
  tddLoopWorkflowDescription: [
    "\u770B\u677F\u5B9A\u4E49\u9A8C\u6536\u9879\uFF0C\u5B9E\u73B0\u8005\u7F16\u5199\u6D4B\u8BD5\u4E0E\u4EE3\u7801\uFF0C\u72EC\u7ACB\u9A8C\u8BC1\u5458\u7ED3\u5408 Changes Diff \u6838\u9A8C\u5E76\u6700\u591A\u5FAA\u73AF 3 \u8F6E\u81EA\u52A8\u4FEE\u590D\uFF0C\u901A\u8FC7\u540E\u786E\u8BA4\u4EA4\u4ED8\u3002",
    "Kanban criteria drive a Test & Feature Author; an Independent Verifier audits turn diffs in a 3-round self-repair loop before sign-off."
  ],
  flow_tdd_gate: ["\u9A8C\u6536\u7ED3\u8BBA", "Acceptance verdict"],
  flow_tdd_pass: ["\u901A\u8FC7", "Pass"],
  flow_tdd_marker: [
    "\u5C06\u7ED3\u8BBA\u72EC\u7ACB\u5199\u5728\u56DE\u590D\u7684\u6700\u540E\u4E00\u884C\uFF1A\u5168\u90E8\u901A\u8FC7\u65F6\u5199\u300C\u7ED3\u8BBA\uFF1A\u901A\u8FC7\u300D\uFF0C\u4ECD\u6709\u5931\u8D25\u65F6\u5199\u300C\u7ED3\u8BBA\uFF1A\u672A\u901A\u8FC7\u300D\u3002\u8BF7\u9010\u5B57\u8F93\u51FA\uFF0C\u4E0D\u52A0\u5F15\u53F7\u3001\u6807\u8BB0\u6216\u53E5\u53F7\u3002",
    "Write the verdict on the final line of your reply. Use the exact Chinese text \u7ED3\u8BBA\uFF1A\u901A\u8FC7 if all checks pass, or \u7ED3\u8BBA\uFF1A\u672A\u901A\u8FC7 if any fail. Omit quotes, markup and punctuation after the verdict."
  ],
  abForkWorkflow: [
    "\u540C\u6E90\u5206\u53C9\u5B9E\u9A8C (A/B Fork) \u2192 \u88C1\u51B3\u9009\u578B",
    "A/B Hypothesis Fork \u2192 Trade-off Judge"
  ],
  abForkWorkflowDescription: [
    "\u5148\u7531\u63A2\u7D22\u4F1A\u8BDD\u5B9A\u4F4D\u95EE\u9898\u57FA\u7EBF\uFF0C\u518D\u901A\u8FC7\u4E24\u6761 Fork \u5206\u53C9\u7EBF\u6D3E\u751F\u300C\u4FDD\u5B88\u6700\u5C0F\u8865\u4E01\u300D\u4E0E\u300C\u67B6\u6784\u7EA7\u91CD\u6784\u300D\u5E76\u884C\u5BF9\u6BD4\uFF0C\u6700\u540E\u4EA4\u7531\u8BC4\u59D4\u7EFC\u5408\u88C1\u51B3\u3002",
    "Frame root context once, fork session history into Conservative Patch vs. Clean Refactor branches, then join transcripts into a Judge."
  ],
  bugHuntWorkflow: [
    "\u7EC8\u7AEF\u62A5\u9519 + Git \u8BCA\u65AD \u2192 \u6839\u56E0\u5B9A\u4F4D \u2192 \u4FEE\u590D\u62A5\u544A",
    "Bug Triage: Terminal + Git \u2192 Root Cause \u2192 Fix"
  ],
  bugHuntWorkflowDescription: [
    "\u6C47\u96C6\u7EC8\u7AEF\u5C4F\u5E55\u62A5\u9519\u4E0E Git \u8FD1\u671F\u6539\u52A8\uFF0C\u5148\u53EA\u8BFB\u9501\u5B9A\u7CBE\u786E\u6839\u56E0\uFF0C\u4EBA\u5DE5\u786E\u8BA4\u540E\u7F16\u5199\u6700\u5C0F\u4FEE\u590D\u4E0E\u56DE\u5F52\u6D4B\u8BD5\uFF0C\u5E76\u5B9E\u65F6\u540C\u6B65\u81F3\u5C55\u793A\u5361\u3002",
    "Correlate Terminal snapshots and Git diffs to localize root cause read-only, confirm, author a minimal fix, and stream a live report card."
  ],
  releaseWorkflow: [
    "Git \u53D8\u66F4\u53CC\u8DEF\u4F1A\u5BA1 \u2192 \u53CC\u8BED\u53D1\u5E03\u8BF4\u660E",
    "Multi-Reviewer PR Audit \u2192 Release Notes"
  ],
  releaseWorkflowDescription: [
    "\u4ECE Git \u8282\u70B9\u63D0\u53D6\u6539\u52A8\u5FEB\u7167\uFF0C\u6B63\u786E\u6027\u5BA1\u67E5\u4E0E\u7834\u574F\u6027\u53D8\u66F4/DX \u5BA1\u67E5\u5E76\u884C\u4F1A\u8BCA\uFF0C\u4EBA\u5DE5\u653E\u884C\u540E\u8F93\u51FA\u7ED3\u6784\u5316\u53D1\u5E03\u8BF4\u660E\u3002",
    "Wire Git repo status into parallel Correctness and DX/Breaking-Change reviewers, joining at a confirm gate for bilingual release notes."
  ],
  badgePlan: ["Plan \u95E8\u63A7", "Plan gate"],
  badgeJoin: ["\u5E76\u884C\u6C47\u5408", "Join barrier"],
  badgeLoop: ["\u5FAA\u73AF \xD7{count}", "Loop \xD7{count}"],
  badgeFork: ["\u5386\u53F2\u5206\u53C9", "Fork A/B"],
  badgeTools: ["\u5DE5\u5177\u534F\u540C", "Tool refs"],
  activityDescription: [
    "\u6BCF\u6B21\u542F\u52A8\u805A\u5408\u4E3A\u4E00\u5F20\u8FD0\u884C\u603B\u89C8\u5361\uFF1A\u76F4\u89C2\u67E5\u770B\u5B8C\u6210\u8FDB\u5EA6\u3001\u6B65\u9AA4\u8017\u65F6\u4E0E\u7528\u91CF\u3001\u5F53\u524D\u95E8\u63A7\u3001\u4EA4\u4ED8\u4EA7\u7269\u4E0E\u8BE6\u7EC6\u65F6\u95F4\u7EBF\u3002",
    "One card per workflow launch: completion ring, step telemetry, active gates, presented deliverables and full timeline."
  ],
  runDockTitle: ["\u5355\u6B21\u8FD0\u884C\u603B\u89C8", "Run overview"],
  allRuns: ["\u5168\u90E8\u8FD0\u884C", "All runs"],
  outputsTab: ["\u7ED3\u679C\u4E0E\u5C55\u793A\u5361", "Outputs & displays"],
  waitingTab: ["\u5F85\u786E\u8BA4\u4E0E\u5BA1\u6279", "Waiting & approvals"],
  noActivity: ["\u8FD8\u6CA1\u6709\u8FD0\u884C\u8BB0\u5F55", "No workflow runs yet"],
  noActivityDescription: [
    "\u542F\u52A8\u4EFB\u610F Agent \u6216\u5DE5\u4F5C\u6D41\u540E\uFF0C\u5B9E\u65F6\u8FDB\u5EA6\u4E0E\u63A5\u7EED\u8F68\u8FF9\u5C06\u663E\u793A\u5728\u8FD9\u91CC\u3002",
    "Start an agent or workflow to track live steps and continuations here."
  ],
  noOutputs: ["\u8FD8\u6CA1\u6709\u63D0\u53D6\u7ED3\u679C\u6216\u8FD0\u884C\u8F93\u51FA", "No outputs yet"],
  noWaiting: ["\u5F53\u524D\u6CA1\u6709\u7B49\u5F85\u5904\u7406\u7684\u786E\u8BA4\u6216\u5BA1\u6279", "Nothing waiting on you"],
  runTypeGlobal: ["\u5168\u5C40\u542F\u52A8", "Global launch"],
  runTypeGroup: ["\u5DE5\u4F5C\u6D41\u8FD0\u884C", "Workflow run"],
  runTypeSelection: ["\u9009\u533A\u8FD0\u884C", "Selection run"],
  runTypeChat: ["\u539F\u751F\u5BF9\u8BDD\u89E6\u53D1", "Native chat"],
  stepsDone: ["{done}/{total} \u6B65\u5DF2\u5B8C\u6210", "{done}/{total} steps done"],
  stepPending: ["\u5F85\u89E6\u53D1", "Pending"],
  stepQueued: ["\u6392\u961F\u4E2D", "Queued"],
  stepStopped: ["\u5DF2\u505C\u6B62", "Stopped"],
  runAllDone: ["\u5168\u90E8\u6B65\u9AA4\u5DF2\u5B8C\u6210", "All steps completed"],
  runNextStep: ["\u6B63\u5728\u63A8\u8FDB\uFF1A{name}", "Active: {name}"],
  runTimeline: ["\u6267\u884C\u65F6\u95F4\u7EBF \xB7 {count} \u6B65", "Timeline \xB7 {count} steps"],
  runBlockedBy: ["\u505C\u5728\u300C{name}\u300D\uFF1A{reason}", "Waiting at \u201C{name}\u201D: {reason}"],
  locate: ["\u5B9A\u4F4D\u8282\u70B9", "Locate"],
  appearance: ["\u5916\u89C2\u4E0E\u8BED\u8A00", "Appearance & language"],
  theme: ["\u754C\u9762\u4E3B\u9898", "Theme"],
  dark: ["\u77F3\u58A8\u6DF1\u8272", "Dark"],
  light: ["\u6D45\u8272\u5DE5\u4F5C\u9762", "Light"],
  followHost: ["\u8DDF\u968F\u5BBF\u4E3B", "Follow DSH"],
  language: ["\u754C\u9762\u8BED\u8A00", "Language"],
  chinese: ["\u7B80\u4F53\u4E2D\u6587", "\u4E2D\u6587"],
  english: ["English", "English"],
  interaction: ["\u753B\u5E03\u4E0E\u4EA4\u4E92", "Canvas & interaction"],
  wheelBehavior: ["\u6EDA\u8F6E\u9ED8\u8BA4\u624B\u52BF", "Mouse wheel"],
  zoom: ["\u7F29\u653E\u753B\u5E03", "Zoom"],
  pan: ["\u5E73\u79FB\u753B\u5E03", "Pan"],
  wireRouting: ["\u8FDE\u7EBF\u8D70\u5411", "Wire routing"],
  wireRoutingAvoid: ["\u7ED5\u8FC7\u8282\u70B9", "Avoid nodes"],
  wireRoutingOverlap: ["\u5141\u8BB8\u906E\u76D6", "Allow overlap"],
  wireRoutingAvoidDescription: ["\u8FDE\u7EBF\u4F1A\u5BFB\u627E\u8282\u70B9\u4E4B\u95F4\u7684\u7A7A\u9699\u3002", "Wires route through gaps between nodes."],
  wireRoutingOverlapDescription: ["\u8FDE\u7EBF\u7ECF\u8FC7\u8282\u70B9\u65F6\u4F1A\u88AB\u5361\u7247\u76D6\u4F4F\u3002", "Cards cover any wires that pass behind them."],
  snapGrid: ["\u62D6\u52A8\u65F6\u5438\u9644\u7F51\u683C (12px)", "Snap nodes to 12px grid"],
  reducedMotion: ["\u51CF\u5F31\u52A8\u6548", "Reduce motion"],
  reducedMotionDescription: [
    "\u5173\u95ED\u6D41\u5149\u3001\u80CC\u666F\u547C\u5438\u4E0E\u4F4D\u79FB\u8FC7\u6E21\uFF0C\u4FDD\u7559\u5168\u90E8\u72B6\u6001\u8272\u5F69\u3001\u56FE\u6807\u4E0E\u6570\u5B57\u4FE1\u606F\u3002",
    "Disable ambient motion, wire flow and transitions while keeping all state colors and counters."
  ],
  orchestration: ["\u5BBF\u4E3B\u7F16\u6392", "Host orchestration"],
  nativeChatTriggers: [
    "\u539F\u751F\u5BF9\u8BDD\u9ED8\u8BA4\u89E6\u53D1\u4E0B\u6E38\u63A5\u7EED",
    "Native chat starts downstream continuations by default"
  ],
  nativeChatTriggersDescription: [
    "\u5728 DSH \u539F\u751F\u804A\u5929\u9875\u53D1\u9001\u6D88\u606F\u65F6\u81EA\u52A8\u63A8\u8FDB\u753B\u5E03\u63A5\u7EED\u7EBF\uFF1B\u5355\u4E2A Agent \u53EF\u72EC\u7ACB\u8986\u76D6\u3002",
    "Prompts sent in DSH native chat trigger canvas continuations unless overridden on the node."
  ],
  data: ["\u753B\u5E03\u6570\u636E\u4E0E\u8D77\u624B\u5F0F", "Data & starter workflows"],
  exportCanvas: ["\u5BFC\u51FA\u753B\u5E03 JSON", "Export canvas JSON"],
  importCanvas: ["\u5BFC\u5165\u753B\u5E03 JSON", "Import canvas JSON"],
  download: ["\u5BFC\u51FA\u6587\u4EF6", "Download"],
  import: ["\u9009\u62E9\u6587\u4EF6\u2026", "Choose file\u2026"],
  loadStarter: ["\u653E\u5165\u8D77\u624B\u5BA1\u67E5\u5DE5\u4F5C\u6D41", "Drop starter review workflow"],
  loadStarterDescription: [
    "\u5728\u753B\u5E03\u7A7A\u767D\u5904\u653E\u5165\u4E00\u5957\u53CC\u8BED\u81EA\u9002\u5E94\u7684\u300C\u89C4\u5212 \u2192 \u5BA1\u67E5 \u2192 \u4EA4\u4ED8\u300D\u5DE5\u4F5C\u6D41\uFF0C\u4E0D\u5F71\u54CD\u5DF2\u6709\u4F1A\u8BDD\u3002",
    "Insert a localized Analyze \u2192 Review \u2192 Deliver blueprint beside existing nodes."
  ],
  selectObject: ["\u9009\u62E9\u8282\u70B9\u3001\u5206\u7EC4\u6216\u8FDE\u7EBF", "Select a node, group or wire"],
  selectObjectDescription: [
    "\u5728\u8FD9\u91CC\u67E5\u770B\u8F7D\u8377\u900F\u89C6\uFF08X-Ray\uFF09\u3001\u914D\u7F6E\u53C2\u4E0E\u7B56\u7565\u4E0E\u65C1\u8DEF\u900F\u4F20\u3001\u8C03\u6574\u5FAA\u73AF\u4E0A\u9650\u6216\u6279\u91CF\u5BF9\u9F50\u591A\u4E2A\u8282\u70B9\u3002",
    "Inspect live wire payloads (X-Ray), configure participation & bypass, tune loop bounds or batch-align nodes."
  ],
  /* ---------- Multi-Select, Subgraph Clipboard & Structure Inspector ---------- */
  multiSelectionTitle: ["\u5DF2\u9009 {count} \u4E2A\u753B\u5E03\u5BF9\u8C61", "{count} canvas items selected"],
  alignNodesLabel: ["\u5BF9\u9F50\u9009\u533A", "Align selection"],
  distributeNodesLabel: ["\u7B49\u8DDD\u5206\u5E03", "Distribute spacing"],
  alignLeft: ["\u5DE6\u5BF9\u9F50", "Align left"],
  alignCenter: ["\u6C34\u5E73\u5C45\u4E2D", "Align center"],
  alignRight: ["\u53F3\u5BF9\u9F50", "Align right"],
  alignTop: ["\u9876\u5BF9\u9F50", "Align top"],
  alignMiddle: ["\u5782\u76F4\u5C45\u4E2D", "Align middle"],
  alignBottom: ["\u5E95\u5BF9\u9F50", "Align bottom"],
  distributeH: ["\u6C34\u5E73\u7B49\u8DDD\u5206\u5E03", "Distribute horizontally"],
  distributeV: ["\u5782\u76F4\u7B49\u8DDD\u5206\u5E03", "Distribute vertically"],
  duplicateSelection: ["\u590D\u5236\u4E3A\u72EC\u7ACB\u8349\u7A3F (Ctrl+D)", "Duplicate as clean drafts (Ctrl+D)"],
  copySelection: ["\u590D\u5236\u5B50\u56FE (Ctrl+C)", "Copy subgraph (Ctrl+C)"],
  pasteSelection: ["\u7C98\u8D34\u5B50\u56FE (Ctrl+V)", "Paste subgraph (Ctrl+V)"],
  batchParticipation: ["\u6279\u91CF\u8BBE\u7F6E\u53C2\u4E0E\u7B56\u7565", "Batch participation"],
  structureInspectorEyebrow: ["\u9879\u76EE\u62D3\u6251\u7ED3\u6784\uFF08\u53EA\u8BFB\u6D3E\u751F\uFF09", "Derived project topology"],
  structureInspectorDesc: [
    "\u7ED3\u6784\u5361\u5B9E\u65F6\u6295\u5F71\u5DE5\u4F5C\u533A\u3001Git \u5206\u652F\u3001\u9694\u79BB Worktree \u4E0E\u539F\u751F\u5B50 Agent \u5C42\u7EA7\u5173\u7CFB\u3002",
    "Projects live workspace, Git branch, isolated worktree and native subagent hierarchy."
  ],
  /* ---------- Payload X-Ray Popover & Inspector ---------- */
  payloadXray: ["\u8F7D\u8377\u900F\u89C6\uFF08X-Ray\uFF09", "Payload X-Ray"],
  inspectPayload: ["\u900F\u89C6\u4F20\u9012\u8F7D\u8377", "Inspect wire payload"],
  loadingPayload: ["\u6B63\u5728\u8BFB\u53D6\u5BBF\u4E3B\u5FEB\u7167\u2026", "Reading host snapshot\u2026"],
  payloadEmpty: [
    "\u6682\u65E0\u5DF2\u6355\u83B7\u6587\u672C\uFF1B\u5F53\u4E0A\u6E38\u4EA7\u751F\u56DE\u590D\u6216\u5199\u5165\u5185\u5BB9\u540E\u5728\u6B64\u5B9E\u65F6\u900F\u89C6\u3002",
    "No captured payload yet; live text appears as soon as upstream produces content."
  ],
  seqWatermark: ["\u5E8F\u53F7 #{seq}", "seq #{seq}"],
  spillBadge: ["\u8D85 64 KiB \xB7 \u81EA\u52A8\u8F6C\u5B58 spillStore", ">64 KiB \xB7 Auto-spilled to spillStore"],
  withinInlineLimit: ["\u76F4\u6CE8\u4E0A\u4E0B\u6587 (\u226464 KiB)", "Inline context (\u226464 KiB)"],
  expandPayload: ["\u5C55\u5F00\u5168\u6587", "Expand"],
  collapsePayload: ["\u6536\u8D77", "Collapse"],
  /* ---------- Fuzzy Quick-Create & Wire-Drop Quick-Connect ---------- */
  quickCreateTitle: ["\u5FEB\u901F\u521B\u5EFA\u8282\u70B9\u6216\u5DE5\u4F5C\u6D41\u84DD\u56FE", "Quick-create node or blueprint"],
  quickCreatePlaceholder: [
    "\u68C0\u7D22\u8282\u70B9\u3001\u7814\u53D1\u5DE5\u5177\u6216\u5DE5\u4F5C\u6D41\u84DD\u56FE\u2026",
    "Search nodes, dev tools or workflow blueprints\u2026"
  ],
  quickConnectFrom: ["\u4ECE\u300C{name}\u300D\u8FDE\u51FA", "Wire out from \u201C{name}\u201D"],
  quickConnectTo: ["\u63A5\u5165\u300C{name}\u300D", "Wire into \u201C{name}\u201D"],
  catAll: ["\u5168\u90E8", "All"],
  catNodes: ["\u8282\u70B9", "Nodes"],
  catTools: ["\u5DE5\u5177", "Tools"],
  catBlueprints: ["\u84DD\u56FE", "Blueprints"],
  qcAutoAgent: ["\u65B0\u5EFA\u81EA\u52A8\u63A5\u7EED Agent", "New auto-continued Agent"],
  qcAutoAgentDesc: [
    "\u4E0A\u6E38\u5B8C\u6210\u540E\u81EA\u52A8\u643A\u5E26\u672C\u8F6E\u7ED3\u8BBA\u542F\u52A8\u4E0B\u6E38",
    "Starts automatically with upstream conclusion upon completion"
  ],
  qcConfirmAgent: ["\u65B0\u5EFA\u786E\u8BA4\u95E8\u63A7\u5BA1\u67E5\u5458", "New confirm-gated Reviewer"],
  qcConfirmAgentDesc: [
    "\u4E0A\u6E38\u5B8C\u6210\u540E\u9A7B\u7559\u5728\u7EBF\u4E0A\u9884\u89C8\u5FEB\u7167\uFF0C\u4EBA\u5DE5\u653E\u884C\u540E\u6267\u884C",
    "Holds captured output at wire gate until you click Continue"
  ],
  qcSessionAgent: ["\u65B0\u5EFA\u5171\u4EAB\u5FEB\u7167 Agent (Session)", "New shared-transcript Agent"],
  qcSessionAgentDesc: [
    "\u63A5\u6536\u4E0A\u6E38\u622A\u81F3\u89E6\u53D1\u5E8F\u53F7\u7684\u7CBE\u7B80\u5BF9\u8BDD\u5168\u8C8C\uFF08\u5254\u9664\u5DE5\u5177\u566A\u97F3\uFF09",
    "Receives folded user & assistant transcript locked at atSeq"
  ],
  qcForkAgent: ["\u5206\u53C9\u5E76\u884C\u5047\u8BBE Agent (Fork)", "Fork hypothesis Agent"],
  qcForkAgentDesc: [
    "\u57FA\u4E8E\u4E0A\u6E38\u5DF2\u5B8C\u6210\u5386\u53F2\u5206\u53C9\u72EC\u7ACB\u4F1A\u8BDD\uFF0C\u9002\u5408 A/B \u65B9\u6848\u5B9E\u9A8C",
    "Clones upstream session history at atSeq for A/B branching"
  ],
  qcRefConsumerAgent: ["\u65B0\u5EFA\u6D88\u8D39\u6B64\u5F15\u7528\u7684 Agent", "New Agent fed by this reference"],
  qcRefConsumerAgentDesc: [
    "\u5C06\u6765\u6E90\u4F5C\u4E3A\u53EA\u8BFB\u4E0A\u4E0B\u6587\u80F6\u56CA\u63A5\u5165\u65B0 Agent \u8349\u7A3F",
    "Wires this source into a new draft Agent's reference capsule tray"
  ],
  qcFollowDisplay: ["\u5F15\u51FA\u5C55\u793A\u5361\uFF08\u8DDF\u968F\u6700\u65B0\uFF09", "Extract Display card (follow latest)"],
  qcFollowDisplayDesc: [
    "\u6301\u7EED\u540C\u6B65\u6765\u6E90\u6700\u65B0\u8F93\u51FA\uFF0C\u4FBF\u4E8E\u4E00\u5BF9\u591A\u5206\u53D1\u4E0B\u6E38\u5F15\u7528",
    "Tracks latest source output for 1-to-many reference fan-out"
  ],
  qcPinnedDisplay: ["\u5F15\u51FA\u56FA\u5B9A\u5FEB\u7167\u5361\uFF08Pinned\uFF09", "Extract pinned snapshot card"],
  qcPinnedDisplayDesc: [
    "\u51BB\u7ED3\u6B64\u523B\u6587\u672C\u5FEB\u7167\uFF0C\u540E\u7EED\u8FD0\u884C\u4E0D\u4F1A\u8986\u76D6",
    "Freezes current text snapshot for side-by-side comparison"
  ],
  qcUpstreamAgent: ["\u65B0\u5EFA\u524D\u7F6E\u4E0A\u6E38 Agent", "New upstream starter Agent"],
  qcUpstreamAgentDesc: [
    "\u5728\u5DE6\u4FA7\u521B\u5EFA\u524D\u7F6E Agent \u5E76\u8FDE\u5165\u5F53\u524D\u63A5\u7EED\u5165\u53E3",
    "Creates an upstream agent wired into this continuation input"
  ],
  qcUpstreamPlanAgent: ["\u65B0\u5EFA\u524D\u7F6E Plan \u67B6\u6784\u5E08", "New upstream Plan-mode Architect"],
  qcUpstreamPlanAgentDesc: [
    "\u5148\u5728 Plan \u6A21\u5F0F\u4E0B\u89C4\u5212\u5E76\u7ECF\u6279\u51C6\u540E\u518D\u63A8\u8FDB\u5F53\u524D\u8282\u70B9",
    "Plans first under Plan mode before advancing into this node"
  ],
  qcChainBlueprint: ["\u4E32\u8054\u300C{name}\u300D\u84DD\u56FE", "Chain \u201C{name}\u201D blueprint"],
  pointer: ["\u9009\u62E9\u5DE5\u5177 (V)", "Select tool (V)"],
  hand: ["\u6293\u624B\u5E73\u79FB (H)", "Hand pan (H)"],
  undo: ["\u64A4\u9500 (Ctrl+Z)", "Undo (Ctrl+Z)"],
  redo: ["\u91CD\u505A (Ctrl+Shift+Z)", "Redo (Ctrl+Shift+Z)"],
  tidy: ["\u81EA\u52A8\u6392\u7248", "Tidy layout"],
  tidySelection: ["\u81EA\u52A8\u6392\u7248\u9009\u533A", "Tidy selection"],
  tidyGroup: ["\u81EA\u52A8\u6392\u7248\u6B64\u7EC4", "Tidy this group"],
  fitView: ["\u9002\u5E94\u89C6\u56FE (F)", "Fit view (F)"],
  minimap: ["\u5C0F\u5730\u56FE", "Minimap"],
  help: ["\u5FEB\u6377\u952E\u4E0E\u8FDE\u7EBF\u56FE\u4F8B (?)", "Shortcuts & wire legend (?)"],
  doubleClickTip: ["\u53CC\u51FB\u7A7A\u767D\u65B0\u5EFA Agent", "Double-click to create agent"],
  rangeSelection: ["\u6846\u9009\u4E0E\u591A\u9009", "Marquee / multi-select"],
  waitingCount: ["{count} \u9879\u5F85\u5904\u7406", "{count} waiting"],
  locateWaiting: ["\u5B9A\u4F4D\u5F85\u5904\u7406\u8282\u70B9", "Locate waiting node"],
  launchNow: ["\u7ACB\u5373\u542F\u52A8", "Start now"],
  launchNext: ["\u968F\u540E\u63A5\u7EED", "Then continue"],
  launchConfirm: ["\u7B49\u4F60\u786E\u8BA4", "Needs your go-ahead"],
  launchNone: ["\u8FD9\u6B21\u4E0D\u8FD0\u884C", "Not in this run"],
  afterStep: ["\u5728\u300C{name}\u300D\u5B8C\u6210\u540E", "After \u201C{name}\u201D"],
  keyboardHint: ["\u5FEB\u6377\u952E\u4E0E\u8FDE\u7EBF\u8BED\u4E49", "Shortcuts & wire legend"],
  helpDescription: [
    "\u6BCF\u4E2A Agent \u8282\u70B9\u7ED1\u5B9A\u771F\u5B9E\u7684\u6301\u4E45\u5316 DSH Session\u3002\u5DE5\u4F5C\u6D41\u8C03\u5EA6\u9A7B\u7559\u5728\u5BBF\u4E3B\uFF0C\u64A4\u9500\u7EDD\u4E0D\u91CD\u653E\u63D0\u793A\u8BCD\u3002",
    "Every Agent node binds a real persistent DSH Session. Scheduling runs in the Host; undo never replays prompts."
  ],
  legendContinuation: [
    "\u63A5\u7EED\u7EBF\uFF08\u6807\u9898\u680F\u7BAD\u5934\u53E3\uFF09\uFF1A\u63A8\u8FDB\u4E0B\u6E38\u4EFB\u52A1\uFF0C\u652F\u6301\u7ED3\u8BBA / \u4F1A\u8BDD\u5FEB\u7167 / \u5386\u53F2\u5206\u53C9\u4E0E\u786E\u8BA4\u95E8\u63A7",
    "Continuation wire (header arrow port): advances tasks with conclusion, folded transcript or fork"
  ],
  legendReference: [
    "\u5F15\u7528\u7EBF\uFF08\u4E0B\u65B9\u5706\u73AF\u53E3\uFF09\uFF1A\u4EC5\u6CE8\u5165\u53EA\u8BFB\u4E0A\u4E0B\u6587\u8D44\u6599\uFF0C\u7EDD\u4E0D\u81EA\u52A8\u542F\u52A8\u5BF9\u65B9",
    "Reference wire (lower circle port): supplies read-only context, never triggers execution"
  ],
  legendExchange: [
    "\u6D88\u606F\u7EBF\uFF08\u53CC\u80A1\u9752\u6A59\u5F27\u7EBF\uFF09\uFF1A\u53EA\u8BFB\u5448\u73B0 DSH \u539F\u751F Agent \u95F4\u901A\u4FE1\uFF08agent-message / subagent-settled / team-message\uFF09",
    "Message arc (dual cyan-orange strand): read-only projection of native DSH inter-agent messages (agent-message / subagent-settled / team-message)"
  ],
  legendDisplay: [
    "\u5C55\u793A\u6E90\u7EBF\uFF08\u7C89\u8272\u70B9\u7EBF\uFF09\uFF1A\u8FDE\u63A5\u5C55\u793A/\u8BE6\u60C5\u5361\u4E0E\u5176\u4E0A\u6E38\u6765\u6E90\uFF0C\u652F\u6301\u56FA\u5B9A\u6216\u8DDF\u968F\u6700\u65B0",
    "Display link (pink dotted): links an extracted display/detail card to its source"
  ],
  filesDescription: ["\u52FE\u9009\u6216\u8F93\u5165\u5DE5\u4F5C\u533A\u76F8\u5BF9\u8DEF\u5F84\u4F5C\u4E3A\u4E0A\u4E0B\u6587\u5F15\u7528", "Select or enter workspace file paths"],
  filePathPlaceholder: [
    "\u8F93\u5165\u5DE5\u4F5C\u533A\u8DEF\u5F84\uFF0C\u5982 src/index.ts\uFF0C\u56DE\u8F66\u6DFB\u52A0\u2026",
    "Workspace path e.g. src/index.ts, Enter to add\u2026"
  ],
  selectedCount: ["\u5DF2\u9009 {count} \u9879", "{count} selected"],
  filesCount: ["{count} \u4E2A\u6587\u4EF6", "{count} files"],
  openFile: ["\u9884\u89C8\u6587\u4EF6\u5185\u5BB9", "Preview file"],
  lineCount: ["{count} \u884C", "{count} lines"],
  copy: ["\u590D\u5236\u5185\u5BB9", "Copy"],
  notePlaceholder: [
    "\u5728\u8FD9\u91CC\u8BB0\u5F55\u8BBE\u8BA1\u7EA6\u675F\u3001\u9A8C\u6536\u6807\u51C6\u6216\u63D0\u793A\u8BCD\u7247\u6BB5\u2026",
    "Write constraints, acceptance criteria or notes\u2026"
  ],
  todo: ["\u5F85\u529E", "To do"],
  inProgress: ["\u8FDB\u884C\u4E2D", "In progress"],
  completedColumn: ["\u5B8C\u6210", "Done"],
  addCard: ["\u6DFB\u52A0\u5361\u7247", "Add card"],
  editCard: ["\u7F16\u8F91\u5361\u7247", "Edit card"],
  deleteCard: ["\u5220\u9664\u5361\u7247", "Delete card"],
  boardList: ["\u6E05\u5355", "List"],
  boardView: ["\u770B\u677F", "Board"],
  boardAutoView: ["\u968F\u5BBD\u5EA6\u5207\u6362\u89C6\u56FE", "Adapt view to width"],
  boardViewMode: ["\u770B\u677F\u89C6\u56FE", "Board view mode"],
  boardProgress: ["{done}/{total} \u5DF2\u5B8C\u6210 \xB7 {percent}%", "{done}/{total} done \xB7 {percent}%"],
  boardNext: ["\u4E0B\u4E00\u9879 \xB7 {text}", "Next \xB7 {text}"],
  boardSearch: ["\u641C\u7D22\u5F85\u529E", "Search tasks"],
  boardFilter_all: ["\u5168\u90E8", "All"],
  boardFilter_open: ["\u672A\u5B8C\u6210", "Open"],
  boardFilter_priority: ["\u9AD8\u4F18\u5148", "High priority"],
  boardFilter_refs: ["\u5DF2\u9009\u5F15\u7528", "Referenced"],
  boardNoMatches: ["\u6CA1\u6709\u5339\u914D\u7684\u5F85\u529E", "No matching tasks"],
  boardNoColumns: ["\u6DFB\u52A0\u4E00\u5217\uFF0C\u5F00\u59CB\u5B89\u6392\u5F85\u529E", "Add a column to start organizing tasks"],
  boardColumnEmpty: ["\u6682\u65E0\u5F85\u529E", "No tasks"],
  boardAddTask: ["\u6DFB\u52A0\u5F85\u529E\u2026", "Add a task\u2026"],
  boardNewTask: ["\u65B0\u5F85\u529E\u6807\u9898", "New task title"],
  boardTitle: ["\u5F85\u529E\u6807\u9898", "Task title"],
  boardNewWithDetails: ["\u6DFB\u52A0\u5E76\u586B\u5199\u8BE6\u60C5", "Add with details"],
  boardMarkDone: ["\u6807\u4E3A\u5B8C\u6210", "Mark complete"],
  boardMarkOpen: ["\u6807\u4E3A\u672A\u5B8C\u6210", "Mark incomplete"],
  boardOptions: ["\u770B\u677F\u9009\u9879", "Board options"],
  boardColumnOptions: ["\u5217\u9009\u9879 \xB7 {name}", "Column options \xB7 {name}"],
  boardAddColumn: ["\u6DFB\u52A0\u5217", "Add column"],
  boardColumnName: ["\u5217\u540D\u79F0", "Column name"],
  boardCardColumn: ["\u6240\u5C5E\u5217", "Column"],
  boardColumnRole: ["\u5217\u89D2\u8272", "Column role"],
  boardColumnColor: ["\u5217\u8272\u6807", "Column color"],
  boardRole_backlog: ["\u79EF\u538B", "Backlog"],
  boardRole_todo: ["\u5F85\u529E", "To do"],
  boardRole_doing: ["\u8FDB\u884C\u4E2D", "In progress"],
  boardRole_done: ["\u5B8C\u6210", "Done"],
  boardRole_custom: ["\u81EA\u5B9A\u4E49", "Custom"],
  boardColor_neutral: ["\u4E2D\u6027\u7070", "Neutral"],
  boardColor_blue: ["\u84DD\u8272", "Blue"],
  boardColor_teal: ["\u9752\u8272", "Teal"],
  boardColor_green: ["\u7EFF\u8272", "Green"],
  boardColor_amber: ["\u7425\u73C0\u8272", "Amber"],
  boardColor_violet: ["\u7D2B\u8272", "Violet"],
  boardColor_red: ["\u7EA2\u8272", "Red"],
  boardColumnSettings: ["\u5217\u8BBE\u7F6E", "Column settings"],
  boardColumnDone: ["\u8BBE\u4E3A\u5B8C\u6210\u5217", "Set as Done column"],
  boardWip: ["\u5728\u5236\u4E0A\u9650\uFF08WIP\uFF09", "Work in progress limit"],
  boardWipHint: ["{count} \u5F20\u672A\u5B8C\u6210\uFF0CWIP \u4E0A\u9650 {limit}", "{count} open, WIP limit {limit}"],
  boardNoLimit: ["\u65E0\u9650\u5236", "No limit"],
  boardCollapseColumn: ["\u6298\u53E0\u300C{name}\u300D", "Collapse {name}"],
  boardExpandColumn: ["\u5C55\u5F00\u300C{name}\u300D", "Expand {name}"],
  boardClearDone: ["\u6E05\u9664\u5DF2\u5B8C\u6210\u5F85\u529E", "Clear completed tasks"],
  boardClearDoneConfirm: ["\u6E05\u9664\u672C\u5217 {count} \u5F20\u5DF2\u5B8C\u6210\u5F85\u529E\u53CA\u5176\u5F15\u7528\u7EBF\uFF1F", "Clear {count} completed tasks and their reference wires?"],
  boardDeleteColumn: ["\u5220\u9664\u5217", "Delete column"],
  boardMigrateTasks: ["\u9009\u62E9\u8FC1\u79FB\u8FD9 {count} \u5F20\u5F85\u529E\u7684\u76EE\u6807\u5217\u3002", "Choose where to move these {count} tasks."],
  boardMigrateFirst: ["\u8BF7\u5148\u521B\u5EFA\u53E6\u4E00\u5217\u6765\u4FDD\u7559\u73B0\u6709\u5F85\u529E\u3002", "Add another column to keep the existing tasks."],
  boardMoveAndDelete: ["\u8FC1\u79FB\u5F85\u529E\u5E76\u5220\u9664\u5217", "Move tasks and delete column"],
  boardShowCompleted: ["\u663E\u793A\u5DF2\u5B8C\u6210", "Show completed"],
  boardHideCompleted: ["\u9690\u85CF\u5DF2\u5B8C\u6210", "Hide completed"],
  boardEnableAutoMove: ["\u52FE\u9009\u540E\u79FB\u5165\u5B8C\u6210\u5217", "Move completed tasks to Done"],
  boardDisableAutoMove: ["\u52FE\u9009\u540E\u7559\u5728\u539F\u5217", "Keep completed tasks in place"],
  boardCopyMarkdown: ["\u590D\u5236\u4E3A Markdown", "Copy as Markdown"],
  boardRefScope: ["\u5F15\u7528\u8303\u56F4", "Reference scope"],
  "boardRefScope_selected-or-all": ["\u4F18\u5148\u5F15\u7528\u5DF2\u9009\u5F85\u529E", "Selected tasks or whole board"],
  "boardRefScope_open-only": ["\u6574\u677F\u672A\u5B8C\u6210", "Open tasks on board"],
  boardRefScope_all: ["\u6574\u677F", "Whole board"],
  boardRefScopeBadge: ["\u5F15\u7528\u8303\u56F4 \xB7 {scope}", "Reference scope \xB7 {scope}"],
  boardRefSelected: ["\u5DF2\u9009 {count} \u5F20", "{count} selected"],
  boardRefClear: ["\u6E05\u9664\u5DF2\u9009\u5F15\u7528", "Clear selected references"],
  boardUseReference: ["\u9009\u4E3A\u5F15\u7528", "Select as reference"],
  boardRemoveReference: ["\u79FB\u51FA\u5F15\u7528\u96C6\u5408", "Deselect as reference"],
  boardHasReference: ["\u5DF2\u8FDE\u63A5\u5F15\u7528\u7EBF", "Linked as reference"],
  boardDragReference: ["\u62D6\u5230 Agent \u4EE5\u5F15\u7528\u5F85\u529E", "Drag to an agent to reference this task"],
  boardSetSelectionRefs: ["\u5F15\u7528\u9009\u4E2D\u7684 {count} \u5F20\u5F85\u529E", "Reference {count} selected tasks"],
  boardDispatch: ["\u6D3E\u53D1\u7ED9\u65B0 Agent", "Send to new agent"],
  boardDraft: ["\u5B8C\u6210\u5F85\u529E\u300C{title}\u300D\uFF0C\u6309\u5F15\u7528\u4E2D\u7684\u9A8C\u6536\u9879\u9010\u4E00\u6838\u5BF9\u5E76\u6C47\u62A5\u7ED3\u679C\u3002", "Complete \u201C{title}\u201D. Check the acceptance criteria in the reference and report the outcome."],
  boardLinkAgent: ["\u5F15\u7528\u5230\u5DF2\u6709 Agent\u2026", "Link to an existing agent\u2026"],
  boardAgentLinked: ["\u5DF2\u8FDE\u63A5\u81F3 {name}", "Linked to {name}"],
  boardNoAgents: ["\u753B\u5E03\u4E2D\u8FD8\u6CA1\u6709 Agent", "No agents on this canvas"],
  boardConvertNote: ["\u8F6C\u4E3A\u72EC\u7ACB\u4FBF\u7B7E", "Convert to a note"],
  boardDuplicateTask: ["\u590D\u5236\u5F85\u529E", "Duplicate task"],
  boardTaskOptions: ["\u5F85\u529E\u9009\u9879 \xB7 {text}", "Task options \xB7 {text}"],
  boardMoveTask: ["\u79FB\u52A8\u5F85\u529E", "Move task"],
  boardMoveUp: ["\u4E0A\u79FB", "Move up"],
  boardMoveDown: ["\u4E0B\u79FB", "Move down"],
  boardMoveColumn: ["\u79FB\u81F3\u300C{name}\u300D", "Move to {name}"],
  boardMoved: ["\u5DF2\u5C06\u300C{text}\u300D\u79FB\u81F3 {name}\uFF0C\u7B2C {index} \u9879", "Moved \u201C{text}\u201D to {name}, position {index}"],
  boardDetails: ["\u5F85\u529E\u8BE6\u60C5", "Task details"],
  boardPriority: ["\u4F18\u5148\u7EA7", "Priority"],
  boardPriority_none: ["\u65E0\u4F18\u5148\u7EA7", "No priority"],
  boardPriority_low: ["\u4F4E", "Low"],
  boardPriority_medium: ["\u4E2D", "Medium"],
  boardPriority_high: ["\u9AD8", "High"],
  boardPriority_urgent: ["\u7D27\u6025", "Urgent"],
  boardDueDate: ["\u622A\u6B62\u65E5\u671F", "Due date"],
  boardToday: ["\u4ECA\u5929", "Today"],
  boardTomorrow: ["\u660E\u5929", "Tomorrow"],
  boardDateClear: ["\u6E05\u9664\u65E5\u671F", "Clear date"],
  boardOverdue: ["\u5DF2\u903E\u671F \xB7 {date}", "Overdue \xB7 {date}"],
  boardTags: ["\u6807\u7B7E", "Labels"],
  boardNewTag: ["\u8F93\u5165\u6807\u7B7E\u5E76\u56DE\u8F66", "Type a label and press Enter"],
  boardRemoveTag: ["\u79FB\u9664\u6807\u7B7E {tag}", "Remove label {tag}"],
  boardDescription: ["\u9A8C\u6536\u8BF4\u660E", "Acceptance notes"],
  boardDescriptionHint: ["\u8BF4\u660E\u9884\u671F\u7ED3\u679C\u4E0E\u9A8C\u6536\u6807\u51C6\uFF08\u652F\u6301 Markdown\uFF09", "Describe the expected result and acceptance criteria (Markdown supported)"],
  boardChecklist: ["\u5B50\u4EFB\u52A1\u6E05\u5355", "Checklist"],
  boardAddChecklistItem: ["\u6DFB\u52A0\u5B50\u4EFB\u52A1\u2026", "Add a checklist item\u2026"],
  boardChecklistItem: ["\u5B50\u4EFB\u52A1\u6807\u9898", "Checklist item"],
  boardDeleteChecklistItem: ["\u5220\u9664\u5B50\u4EFB\u52A1", "Delete checklist item"],
  nextColumn: ["\u79FB\u81F3\u4E0B\u4E00\u5217", "Move to next column"],
  syncDialogDescription: [
    "\u6309\u6A21\u677F\u6700\u65B0\u7248\u672C\u539F\u5730\u66F4\u65B0\u6B64\u5DE5\u4F5C\u6D41\u7ED3\u6784\uFF1A\u5DF2\u6709\u8282\u70B9\u8EAB\u4EFD\u3001DSH \u4F1A\u8BDD\u7ED1\u5B9A\u548C\u8DE8\u8FB9\u754C\u8FDE\u7EBF\u5747\u5B8C\u6574\u4FDD\u7559\u3002",
    "Update this workflow in place from its template while keeping node identities, DSH sessions and external wires."
  ],
  syncStructure: ["\u66F4\u65B0\u5206\u7EC4\u5185\u90E8\u7ED3\u6784\u4E0E\u8FDE\u7EBF", "Update internal layout and wiring"],
  syncOutsideKept: ["\u4FDD\u7559 {count} \u6761\u8DE8\u8FB9\u754C\u8FDE\u7EBF", "Keep {count} external connections"],
  syncRunKept: ["\u4FDD\u7559 {count} \u4E2A\u5DF2\u7ED1\u5B9A\u4F1A\u8BDD\u7684 Agent", "Keep {count} bound agent sessions"],
  syncAdded: ["\u65B0\u589E {count} \u4E2A\u6A21\u677F\u8282\u70B9", "Add {count} new template nodes"],
  syncRemoved: ["\u79FB\u9664 {count} \u4E2A\u6A21\u677F\u5DF2\u5220\u8282\u70B9", "Remove {count} dropped nodes"],
  syncEdited: ["\u4EFB\u52A1\u5DF2\u88AB\u4F60\u4FEE\u6539", "Task customized"],
  syncKeepMine: ["\u540C\u6B65\uFF0C\u4FDD\u7559\u6211\u6539\u8FC7\u7684\u4EFB\u52A1", "Sync & keep my tasks"],
  syncUseTemplate: ["\u540C\u6B65\uFF0C\u91C7\u7528\u6A21\u677F\u4EFB\u52A1", "Sync & use template tasks"],
  snapDrafts: ["{count} \u4E2A\u8349\u7A3F", "{count} drafts"],
  snapInterrupted: ["{count} \u4E2A\u8FD0\u884C\u6062\u590D\u65F6\u505C\u6B62", "{count} active stop on restore"],
  snapWaiting: ["{count} \u9879\u5F85\u786E\u8BA4", "{count} awaiting confirm"],
  snapQueued: ["{count} \u6B65\u6392\u961F\u4E2D", "{count} queued"],
  welcomeEyebrow: [
    "DEEPSEEK HARNESS \xB7 PERSISTENT AGENT COMFYUI",
    "DEEPSEEK HARNESS \xB7 PERSISTENT AGENT COMFYUI"
  ],
  welcomeTitle: [
    "\u628A\u591A Agent \u534F\u4F5C\u653E\u4E0A\u540C\u4E00\u5F20\u53EF\u89C6\u5DE5\u4F5C\u53F0",
    "Orchestrate real DSH agents on one spatial canvas"
  ],
  welcomeDescription: [
    "\u6BCF\u4E2A\u8282\u70B9\u90FD\u662F\u771F\u5B9E\u7684\u6301\u4E45\u5316 DSH \u4F1A\u8BDD\u3002\u7528\u5706\u73AF\u5F15\u7528\u53E3\u6CE8\u5165\u6587\u4EF6\u3001Diff \u4E0E\u770B\u677F\uFF0C\u7528\u7BAD\u5934\u63A5\u7EED\u53E3\u4E32\u8054\u5206\u53C9\u5B9E\u9A8C\u3001\u5E76\u884C\u6C47\u5408\u4E0E\u6709\u754C\u81EA\u6108\u5FAA\u73AF\u3002",
    "Every Agent card is a real persistent DSH session. Wire files, diffs and boards into reference ports, and chain forks, joins and bounded TDD loops."
  ],
  welcomeStudioSubtitle: [
    "\u4E00\u952E\u5C06\u6210\u719F\u7684\u591A Agent \u534F\u4F5C\u84DD\u56FE\u653E\u5165\u5F53\u524D\u5DE5\u4F5C\u533A\uFF0C\u6216\u53CC\u51FB\u7A7A\u767D\u753B\u5E03\u81EA\u7531\u7F16\u6392\u3002",
    "Drop a ready-to-run multi-agent blueprint onto your workspace in one click, or double-click anywhere to build freely."
  ],
  browseAllBlueprints: ["\u6D4F\u89C8\u5168\u90E8 {count} \u5957\u84DD\u56FE", "Browse all {count} blueprints"],
  legendPillRef: [
    "\u25CF \u5F15\u7528\u7EBF\uFF1A\u53EA\u8BFB\u4E0A\u4E0B\u6587\u80F6\u56CA\uFF0C\u7EDD\u4E0D\u89E6\u53D1\u8FD0\u884C",
    "\u25CF Reference: read-only context, never triggers run"
  ],
  legendPillCont: [
    "\u25C6 \u63A5\u7EED\u7EBF\uFF1A\u7ED3\u8BBA / \u4F1A\u8BDD\u5FEB\u7167 / \u5386\u53F2\u5206\u53C9\u63A8\u8FDB",
    "\u25C6 Continuation: advances conclusion / transcript / fork"
  ],
  legendPillMsg: [
    "\u2312 \u6D88\u606F\u7EBF\uFF1A\u53EA\u8BFB\u6295\u5F71 DSH \u539F\u751F\u5B50\u4EE3\u7406\u4E0E\u56E2\u961F\u901A\u4FE1",
    "\u2312 Message arc: live native DSH inter-agent comms"
  ],
  startWithReview: [
    "\u8F7D\u5165\u300C\u89C4\u5212 \u2192 \u5BA1\u67E5 \u2192 \u4EA4\u4ED8\u300D\u5DE5\u4F5C\u6D41",
    "Load \u201CPlan \u2192 Critique \u2192 Deliver\u201D"
  ],
  startWithParallel: [
    "\u8F7D\u5165\u300C\u4E24\u8DEF\u63A2\u7D22 \u2192 \u6C47\u603B\u300D\u5E76\u884C\u5DE5\u4F5C\u6D41",
    "Load \u201CParallel Recon \u2192 Synthesis\u201D"
  ],
  noSearchResults: ["\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9\u3001\u5DE5\u5177\u6216\u84DD\u56FE", "No matching nodes, tools or blueprints"],
  noExistingSessions: [
    "\u5F53\u524D\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u5176\u4ED6 DSH \u4F1A\u8BDD",
    "No other DSH sessions available to add"
  ],
  exchange: ["\u63A5\u7EED\u4E0A\u4E0B\u6587\u5F80\u6765", "Continuation exchange"],
  exchangeReadOnly: [
    "\u5C55\u793A\u8FD0\u884C\u8FC7\u7A0B\u4E2D\u5B9E\u9645\u6355\u83B7\u5E76\u6295\u9012\u7684\u4E0A\u4E0B\u6587\u5FEB\u7167\uFF0C\u53EA\u8BFB\u3002",
    "Captured context snapshots delivered across runs (read-only)."
  ],
  roundBadge: ["\u7B2C {round} \u8F6E", "Round {round}"],
  role_implementation: ["\u5B9E\u73B0", "Build"],
  role_review: ["\u5BA1\u67E5", "Review"],
  role_delivery: ["\u4EA4\u4ED8", "Deliver"],
  continuationInstruction: [
    "\u63A5\u7EED\u6307\u4EE4\uFF08\u4E0A\u6E38\u5B8C\u6210\u65F6\u81EA\u52A8\u53D1\u9001\uFF09",
    "Continuation prompt (sent on upstream finish)"
  ],
  continuationPlaceholder: [
    "\u586B\u5199\u4E0A\u6E38\u6B63\u5E38\u5B8C\u6210\u540E\u81EA\u52A8\u53D1\u7ED9\u6B64\u4F1A\u8BDD\u7684\u6307\u4EE4\u2026",
    "Instruction sent automatically when upstream finishes\u2026"
  ],
  rearmCapsule: ["\u6807\u8BB0\u4E3A\u5F85\u53D1\uFF08\u4E0B\u6B21\u91CD\u6CE8\uFF09", "Mark pending (re-send next turn)"],
  pinFileToCanvas: ["\u56FA\u5B9A\u4E3A\u753B\u5E03\u6587\u4EF6\u8282\u70B9", "Pin as canvas file node"],
  filter3d: ["3 \u5929\u5185", "Last 3 days"],
  filter7d: ["7 \u5929\u5185", "Last 7 days"],
  showBranches: ["\u5206\u652F", "Branches"],
  showWorktrees: ["Worktree", "Worktrees"],
  subagents: ["\u5B50 Agent", "Subagents"],
  affiliation: ["\u5F52\u5C5E\u76EE\u5F55 / \u5206\u652F", "Affiliation"],
  planMode: ["Plan \u6A21\u5F0F", "Plan mode"],
  createWorktreePrompt: [
    "\u8BE5\u5206\u652F\u5C1A\u672A\u68C0\u51FA\u72EC\u7ACB\u76EE\u5F55\uFF0C\u662F\u5426\u5148\u521B\u5EFA\u9694\u79BB Worktree \u518D\u542F\u52A8\uFF1F",
    "This branch has no checked-out worktree. Create an isolated worktree before running?"
  ],
  newGit: ["Git \u4ED3\u5E93\u9762\u677F", "Git workbench"],
  newChanges: ["\u8F6E\u6B21\u6539\u52A8\uFF08Changes\uFF09", "Turn changes"],
  newTerminal: ["\u7EC8\u7AEF\u5FEB\u7167", "Terminal snapshot"],
  git: ["Git \u4ED3\u5E93", "Git repo"],
  changes: ["\u8F6E\u6B21\u6539\u52A8", "Turn changes"],
  terminal: ["\u7EC8\u7AEF\u5FEB\u7167", "Terminal"],
  gitChanges: ["\u6539\u52A8", "Changes"],
  gitHistory: ["\u63D0\u4EA4\u5386\u53F2", "History"],
  gitBranches: ["\u5206\u652F / Worktree", "Branches & WT"],
  stagedFiles: ["\u5DF2\u6682\u5B58", "Staged"],
  workingFiles: ["\u5DE5\u4F5C\u533A\u6539\u52A8", "Working tree"],
  gitStageFile: ["\u6682\u5B58\u6B64\u6587\u4EF6", "Stage file"],
  gitUnstageFile: ["\u53D6\u6D88\u6682\u5B58", "Unstage file"],
  gitBaseRef: ["\u57FA\u51C6\u5F15\u7528 (Base ref)", "Base ref"],
  gitWorktreesCount: ["Worktree ({count})", "Worktrees ({count})"],
  gitNotRepoTitle: ["\u5F53\u524D\u76EE\u5F55\u5C1A\u672A\u521D\u59CB\u5316 Git \u4ED3\u5E93", "Not a Git repository yet"],
  gitNotRepoDesc: [
    "\u5728\u6B64\u76EE\u5F55\u521D\u59CB\u5316\u672C\u5730 Git \u4ED3\u5E93\u4EE5\u542F\u7528\u53D8\u66F4\u5BF9\u6BD4\u3001\u63D0\u4EA4\u56FE\u8C31\u4E0E\u9694\u79BB Worktree\uFF0C\u6216\u5728\u5916\u90E8\u521D\u59CB\u5316\u540E\u5237\u65B0\u3002",
    "Initialize a local Git repository here to enable diffs, commit graph and isolated worktrees, or refresh."
  ],
  initGitRepo: ["\u521D\u59CB\u5316 Git \u4ED3\u5E93", "Initialize Git repo"],
  stageAll: ["\u5168\u90E8\u6682\u5B58", "Stage all"],
  unstageAll: ["\u53D6\u6D88\u5168\u6682\u5B58", "Unstage all"],
  commitChanges: ["\u63D0\u4EA4", "Commit"],
  commitMessagePlaceholder: ["\u8F93\u5165 Git \u63D0\u4EA4\u8BF4\u660E\u2026", "Enter commit message\u2026"],
  createBranch: ["\u65B0\u5EFA\u5206\u652F", "New branch"],
  createWorktree: ["\u65B0\u5EFA Worktree", "New worktree"],
  fetch: ["\u62C9\u53D6\u8FDC\u7AEF (Fetch)", "Fetch"],
  pull: ["\u540C\u6B65\u66F4\u65B0 (Pull)", "Pull"],
  push: ["\u63A8\u9001 (Push)", "Push"],
  wireReference: ["\u5F15\u51FA\u4E3A\u5F15\u7528\u5FEB\u7167", "Extract as reference"],
  turnChanges: ["\u7B2C {turn} \u8F6E\u6539\u52A8", "Turn #{turn} changes"],
  noChangesYet: [
    "\u5173\u8054 Agent \u4EA7\u751F\u6587\u4EF6\u4FEE\u6539\u540E\u5728\u6B64\u5C55\u793A\u6458\u8981\u4E0E Diff",
    "File summaries and diffs appear after an agent edits files"
  ],
  refreshSnapshot: ["\u5237\u65B0\u5FEB\u7167", "Refresh snapshot"],
  openTerminal: ["\u65B0\u5EFA\u4F1A\u8BDD\u7EC8\u7AEF", "New session terminal"],
  terminalScreenHeader: ["\u7EC8\u7AEF\u5C4F\u5E55\u5FEB\u7167", "Terminal screen snapshot"],
  noTerminalsYet: [
    "\u6240\u7ED1\u5B9A\u7684\u4F1A\u8BDD\u6682\u65E0\u5DF2\u6253\u5F00\u7EC8\u7AEF\uFF0C\u53EF\u4E00\u952E\u65B0\u5EFA\u7EC8\u7AEF\u6355\u83B7\u5C4F\u5E55\u8F93\u51FA\u3002",
    "No open terminal in this session yet \u2014 launch one to capture screen output."
  ],
  terminalSelectAgentHint: [
    "\u8BF7\u5148\u542F\u52A8\u6216\u7ED1\u5B9A\u4E00\u4E2A Agent \u4F1A\u8BDD\u4EE5\u6302\u8F7D\u5176\u4E13\u5C5E\u7EC8\u7AEF\u3002",
    "Start or bind an Agent session first to attach its session terminal."
  ],
  nativeExchange: ["DSH \u539F\u751F Agent \u6D88\u606F\u5F80\u6765", "Native DSH inter-agent messages"],
  nativeExchangeReadOnly: [
    "\u5FE0\u5B9E\u5448\u73B0 DSH Runtime \u539F\u751F Agent \u95F4\u6D88\u606F\uFF08agent-message / subagent-settled / team-message\uFF09\uFF0C\u53EA\u8BFB\u3002",
    "Faithful read-only projection of native DSH inter-agent messages (agent-message / subagent-settled / team-message)."
  ],
  deliverablesTitle: ["\u672C\u8F6E\u4EA4\u4ED8\u4EA7\u7269", "Presented deliverables"],
  extractDeliverable: ["\u56FA\u5B9A\u5230\u753B\u5E03", "Pin to canvas"],
  rerunFailed: ["\u91CD\u8DD1\u5931\u8D25\u8282\u70B9\u53CA\u4E0B\u6E38", "Rerun failed & downstream"],
  quoteToCanvas: ["\u5F15\u51FA\u9009\u533A\u5230\u753B\u5E03", "Quote to Canvas"],
  overviewTab: ["\u6982\u89C8", "Overview"],
  latestConclusion: ["\u6700\u65B0\u8F93\u51FA\u6458\u8981", "Latest output"],
  openChatView: ["\u8FDB\u5165\u5BF9\u8BDD", "Open chat"],
  backToOverview: ["\u8FD4\u56DE\u6982\u89C8", "Overview"],
  dropToDisconnect: ["\u677E\u5F00\u4EE5\u65AD\u5F00\u6B64\u8F93\u5165\u8FDE\u7EBF", "Release to disconnect wire"],
  reconnectTo: ["\u91CD\u8FDE\u81F3\u300C{name}\u300D", "Reconnect to \u201C{name}\u201D"],
  connectTo: ["\u8FDE\u63A5\u81F3\u300C{name}\u300D", "Connect to \u201C{name}\u201D"],
  keepConnected: ["\u677E\u5F00\u4FDD\u6301\u539F\u8FDE\u63A5", "Release to keep connected"],
  wireDisconnected: [
    "\u5DF2\u65AD\u5F00\u8F93\u5165\u8FDE\u7EBF\uFF08\u53EF Ctrl+Z \u64A4\u9500\uFF09",
    "Input wire disconnected (Ctrl+Z to undo)"
  ],
  wireReconnected: ["\u5DF2\u5C06\u8FDE\u7EBF\u6539\u63A5\u81F3\u300C{name}\u300D", "Wire rerouted to \u201C{name}\u201D"],
  dragInputTip: [
    "\u62D6\u62FD\u53EF\u62D4\u51FA\u91CD\u8FDE\u6216\u62D6\u5230\u7A7A\u767D\u5904\u65AD\u5F00",
    "Drag to reroute or drop on canvas to unplug"
  ],
  selectAgentOption: ["\u9009\u62E9\u5173\u8054 Agent\u2026", "Select bound Agent\u2026"],
  diffAction: ["\u67E5\u770B Diff", "View diff"],
  /* ---------- Wave 2B: ComfyUI shortcut help & native dock X-Ray ---------- */
  shortcutSectionCreate: ["\u521B\u5EFA\u4E0E\u8FDE\u63A5", "Create & connect"],
  shortcutSectionEdit: ["\u7F16\u8F91\u4E0E\u5B50\u56FE", "Edit & subgraphs"],
  shortcutSectionRun: ["\u8FD0\u884C\u4E0E\u53C2\u4E0E", "Run & participation"],
  shortcutSectionView: ["\u89C6\u56FE", "View"],
  quickCreateShortcut: ["\u5149\u6807\u5904\u6A21\u7CCA\u641C\u7D22\u65B0\u5EFA", "Fuzzy quick-create at cursor"],
  wireDropShortcut: ["\u62D6\u7EBF\u5230\u7A7A\u767D\u5904\u5FEB\u9009\u63A5\u7EED", "Drop a wire on empty canvas"],
  dragWireToEmpty: ["\u62D6\u7EBF \u2192 \u7A7A\u767D", "Drag wire \u2192 empty"],
  doubleClickKey: ["\u53CC\u51FB\u7A7A\u767D", "Double-click empty"],
  selectAllShortcut: ["\u5168\u9009\u53EF\u89C1\u8282\u70B9", "Select all visible"],
  shortcutHelp: ["\u5FEB\u6377\u952E\u5E2E\u52A9", "Shortcut help"],
  dockCapsuleHint: [
    "\u70B9\u51FB\u900F\u89C6\u8F7D\u8377 \xB7 Shift \u70B9\u51FB\u5E38\u9A7B \xB7 \u53F3\u952E\u91CD\u65B0\u5F85\u53D1",
    "Click to X-Ray \xB7 Shift-click to pin \xB7 Right-click to re-arm"
  ],
  teamLibrary: ["\u56E2\u961F", "Teams"],
  teamLibraryTitle: ["\u56E2\u961F\u5E93", "Team library"],
  teamLibraryDescription: ["\u5728\u8FD9\u91CC\u5B9A\u4E49\u89D2\u8272\u3001\u5206\u914D\u5C97\u4F4D\uFF0C\u518D\u628A\u7F16\u5236\u7528\u4E8E\u753B\u5E03\u4E0A\u7684\u56E2\u961F\u3002", "Define roles and arrange them into teams for your canvas."],
  teamDirectory: ["\u56E2\u961F\u8D44\u4EA7", "Team assets"],
  teamSearchRole: ["\u67E5\u627E\u89D2\u8272", "Find a role"],
  teamSearchBlueprint: ["\u67E5\u627E\u7F16\u5236", "Find a blueprint"],
  teamNoMatch: ["\u6CA1\u6709\u5339\u914D\u7684\u7ED3\u679C", "No matches"],
  teamClearSearch: ["\u6E05\u9664\u641C\u7D22", "Clear search"],
  teamEmptyRoles: ["\u8FD8\u6CA1\u6709\u89D2\u8272", "No roles yet"],
  teamEmptyBlueprints: ["\u8FD8\u6CA1\u6709\u56E2\u961F\u7F16\u5236", "No blueprints yet"],
  teamEmptyRoleHint: ["\u5148\u7ED9\u89D2\u8272\u9009\u5B9A\u6A21\u578B\uFF0C\u518D\u5199\u4E0B\u5B83\u7684\u804C\u8D23\u4E0E\u5DE5\u4F5C\u65B9\u5F0F\u3002", "Choose a model and describe how this role works."],
  teamEmptyBlueprintHint: ["\u8BBE\u7F6E\u4E3B\u7BA1\uFF0C\u518D\u628A\u89D2\u8272\u5B89\u6392\u5230\u5404\u4E2A\u5C97\u4F4D\u3002", "Choose a lead and assign roles to the team\u2019s slots."],
  teamEditRole: ["\u7F16\u8F91\u89D2\u8272", "Edit role"],
  teamEditBlueprint: ["\u7F16\u8F91\u7F16\u5236", "Edit blueprint"],
  teamStructure: ["\u7F16\u5236\u56FE", "Team structure"],
  teamSlotDetails: ["\u5C97\u4F4D\u8BE6\u60C5", "Slot details"],
  teamRoleUsedIn: ["\u4F7F\u7528\u6B64\u89D2\u8272\u7684\u7F16\u5236", "Used in blueprints"],
  teamRoleUnused: ["\u6B64\u89D2\u8272\u8FD8\u672A\u52A0\u5165\u7F16\u5236\u3002", "This role has no assigned slots yet."],
  teamNoInstructions: ["\u5C1A\u672A\u586B\u5199", "Not specified"],
  teamOpenRole: ["\u67E5\u770B\u89D2\u8272", "View role"],
  teamRosterSlots: ["\u5C97\u4F4D\u8BBE\u7F6E", "Slots"],
  teamRoomPanels: ["\u56E2\u961F\u89C6\u56FE", "Team views"],
  teamNoTasks: ["\u6682\u65E0\u4EFB\u52A1", "No tasks yet"],
  teamNoTasksHint: ["\u4E3B\u7BA1\u6216\u6210\u5458\u521B\u5EFA\u7684\u4EFB\u52A1\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002", "Tasks created by the lead or members appear here."],
  teamLeadStartHint: ["\u521B\u5EFA\u4E3B\u7BA1\u4F1A\u8BDD\u540E\uFF0C\u5373\u53EF\u5728\u8FD9\u91CC\u5BF9\u8BDD\u5E76\u67E5\u770B\u6210\u5458\u52A8\u6001\u3002", "Open a lead conversation to chat and follow member activity."],
  teamRevision: ["\u7248\u672C {revision}", "Revision {revision}"],
  teamChat: ["\u5BF9\u8BDD", "Chat"],
  teamRoles: ["\u89D2\u8272\u5E93", "Roles"],
  teamBlueprints: ["\u56E2\u961F\u7F16\u5236", "Team blueprints"],
  teamRole: ["\u89D2\u8272", "Role"],
  teamBlueprint: ["\u7F16\u5236", "Blueprint"],
  teamNewRole: ["\u65B0\u5EFA\u89D2\u8272", "New role"],
  teamNewBlueprint: ["\u65B0\u5EFA\u7F16\u5236", "New blueprint"],
  teamRoleHint: ["\u9009\u62E9\u89D2\u8272\uFF0C\u6216\u65B0\u5EFA\u89D2\u8272\u6765\u8BBE\u7F6E\u804C\u8D23\u4E0E\u6A21\u578B\u3002", "Select a role or create one to set its responsibilities and model."],
  teamBlueprintHint: ["\u9009\u62E9\u7F16\u5236\uFF0C\u6216\u65B0\u5EFA\u7F16\u5236\u6765\u914D\u7F6E\u4E3B\u7BA1\u4E0E\u5C97\u4F4D\u3002", "Select or create a blueprint to configure a lead and its slots."],
  teamShowArchived: ["\u663E\u793A\u5DF2\u5F52\u6863", "Show archived"],
  teamArchived: ["\u5DF2\u5F52\u6863", "Archived"],
  teamArchive: ["\u5F52\u6863", "Archive"],
  teamTitle: ["\u540D\u79F0", "Name"],
  teamResponsibility: ["\u804C\u8D23", "Responsibilities"],
  teamPersona: ["\u89D2\u8272\u4EBA\u8BBE", "Role instructions"],
  teamLeadPersona: ["\u4E3B\u7BA1\u4EBA\u8BBE", "Lead instructions"],
  teamModel: ["\u6A21\u578B", "Model"],
  teamLeadModel: ["\u4E3B\u7BA1\u6A21\u578B", "Lead model"],
  teamChooseModel: ["\u9009\u62E9\u6A21\u578B", "Choose a model"],
  teamEffort: ["\u63A8\u7406\u5F3A\u5EA6\uFF08\u53EF\u9009\uFF09", "Reasoning effort (optional)"],
  teamNorms: ["\u56E2\u961F\u89C4\u8303", "Team instructions"],
  teamRevisionHint: ["\u5F53\u524D\u8FD0\u884C\u4FDD\u7559\u5DF2\u9501\u5B9A\u7684\u7248\u672C\uFF0C\u4FEE\u6539\u5728\u4E0B\u6B21\u8FD0\u884C\u751F\u6548\u3002", "Active runs keep their pinned revision. Changes apply to the next run."],
  teamRunningRevisions: ["\u5728\u8DD1\u56E2\u961F\u4F7F\u7528 {revisions}", "Active teams use {revisions}"],
  teamSlot: ["\u5C97\u4F4D", "Slot"],
  teamSlotId: ["\u5C97\u4F4D\u6807\u8BC6", "Slot ID"],
  teamSlotLabel: ["\u5C97\u4F4D\u663E\u793A\u540D", "Display name"],
  teamMaxInstances: ["\u5B9E\u4F8B\u4E0A\u9650", "Instance limit"],
  teamOverrideModel: ["\u8986\u76D6\u89D2\u8272\u6A21\u578B", "Override role model"],
  teamRemoveSlot: ["\u79FB\u9664\u5C97\u4F4D", "Remove slot"],
  teamAddSlot: ["\u6DFB\u52A0\u5C97\u4F4D", "Add slot"],
  teamNeedsRole: ["\u5148\u5728\u89D2\u8272\u5E93\u521B\u5EFA\u89D2\u8272\u3002", "Create a role before adding a slot."],
  newTeam: ["\u65B0\u5EFA\u56E2\u961F\u8282\u70B9", "New team node"],
  teamPickBlueprint: ["\u9009\u62E9\u56E2\u961F\u7F16\u5236", "Choose a team blueprint"],
  teamNoBlueprint: ["\u56E2\u961F\u5E93\u91CC\u8FD8\u6CA1\u6709\u53EF\u7528\u7F16\u5236\u3002", "Create a team blueprint in the library."],
  teamOpenLibrary: ["\u6253\u5F00\u56E2\u961F\u5E93", "Open team library"],
  teamSlotCount: ["{count} \u4E2A\u5C97\u4F4D", "{count} slots"],
  teamCapacity: ["\u6D3B\u8DC3\u6210\u5458 {active}/{max}", "Active members {active}/{max}"],
  teamTaskProgress: ["{done}/{total} \u4EFB\u52A1", "{done}/{total} tasks"],
  settling: ["\u7B49\u5F85\u56E2\u961F\u6C47\u603B", "Settling team"],
  teamEnter: ["\u8FDB\u5165\u56E2\u961F", "Open team"],
  teamBack: ["\u8FD4\u56DE\u753B\u5E03", "Back to canvas"],
  teamBreadcrumb: ["\u56E2\u961F\u5BFC\u822A", "Team navigation"],
  teamMembers: ["\u6210\u5458", "Members"],
  teamLead: ["\u4E3B\u7BA1", "Lead"],
  teamVacant: ["\u7A7A\u5C97", "Vacant"],
  teamIdle: ["\u7A7A\u95F2", "Idle"],
  teamOutsideRoster: ["\u7F16\u5236\u5916\u6210\u5458", "Outside roster"],
  subagent: ["\u5B50 Agent", "Subagent"],
  teamOpenMember: ["\u5728\u56E2\u961F\u623F\u95F4\u91CC\u6253\u5F00", "Open in the team room"],
  teamRoleMembers: ["{count} \u540D\u6210\u5458", "{count} members"],
  teamRoleMembersBusy: ["{count} \u540D\u5DE5\u4F5C\u4E2D", "{count} working"],
  teamFormerSlots: ["\u5386\u53F2\u5C97\u4F4D", "Former slots"],
  teamMessages: ["\u6210\u5458\u6D88\u606F", "Team messages"],
  teamConversation: ["\u56E2\u961F\u5BF9\u8BDD", "Team conversation"],
  teamCreateLead: ["\u521B\u5EFA\u4E3B\u7BA1\u4F1A\u8BDD", "Create lead conversation"],
  teamRestrictedApproval: ["\u5BA1\u6279\u53D7\u9650\u3002\u9700\u8981\u5BA1\u6279\u7684\u64CD\u4F5C\u7531\u539F\u751F\u8FD0\u884C\u65F6\u62D2\u7EDD\uFF0C\u8BF7\u7531\u4E3B\u7BA1\u5904\u7406\u3002", "Approval is restricted. Operations requiring approval are declined and can be handled by the lead."],
  teamInterruptMember: ["\u4E2D\u65AD\u6210\u5458", "Interrupt member"],
  teamExternalConversation: ["\u5916\u90E8\u6210\u5458\u7684\u5BF9\u8BDD\u7531\u5176\u8FD0\u884C\u73AF\u5883\u63D0\u4F9B\u3002", "The external runtime owns this member\u2019s conversation."],
  teamTasks: ["\u4EFB\u52A1\u677F", "Task board"],
  teamTask_pending: ["\u5F85\u5904\u7406", "Pending"],
  teamTask_in_progress: ["\u8FDB\u884C\u4E2D", "In progress"],
  teamTask_completed: ["\u5DF2\u5B8C\u6210", "Completed"],
  teamTaskOwner: ["\u8D1F\u8D23\u4EBA {owner}", "Owner {owner}"],
  teamTaskBlocked: ["\u4F9D\u8D56 {blockers}", "Blocked by {blockers}"],
  teamTaskReady: ["\u53EF\u5F00\u59CB", "Ready"],
  workflowImport: ["\u5BFC\u5165\u5DE5\u4F5C\u6D41 JSON", "Import workflow JSON"],
  workflowExport: ["\u5BFC\u51FA\u5DE5\u4F5C\u6D41 JSON", "Export workflow JSON"],
  workflowImported: ["\u5DE5\u4F5C\u6D41\u5DF2\u5BFC\u5165", "Workflow imported"],
  workflowImportAssets: ["\u56E2\u961F\u8D44\u4EA7", "Team assets"],
  workflowReuseAssets: ["\u590D\u7528\u76F8\u540C ID \u7684\u672C\u5730\u89D2\u8272\u4E0E\u7F16\u5236", "Reuse local roles and blueprints with matching IDs"],
  workflowCopyAssets: ["\u5C06\u89D2\u8272\u4E0E\u7F16\u5236\u53E6\u5B58\u4E3A\u65B0\u8D44\u4EA7", "Save roles and blueprints as new assets"],
  workflowAssetModeHint: ["\u590D\u7528\u65F6\u6CBF\u7528\u672C\u5730\u6A21\u578B\u3002\u53E6\u5B58\u4E3A\u65B0\u65F6\u53EF\u4E3A\u526F\u672C\u66FF\u6362\u6A21\u578B\u3002", "Reused assets keep their local models. Replace models in a new copy."],
  workflowMissingModels: ["\u8BF7\u66FF\u6362\u4EE5\u4E0B\u4E0D\u53EF\u7528\u7684\u6A21\u578B", "Replace these unavailable models"],
  teamRevisionDifference: ["{title} \xB7 \u6A21\u677F rev {saved}\uFF0C\u672C\u5730 rev {current}", "{title} \xB7 Template rev {saved}, local rev {current}"],
  teamDefaultEffort: ["\u9ED8\u8BA4\u5F3A\u5EA6", "Default effort"],
  teamModelUnavailable: ["\u6A21\u578B\u4E0D\u53EF\u7528", "Model unavailable"],
  teamNoModels: ["\u6682\u65E0\u53EF\u7528\u6A21\u578B", "No models available"],
  teamDragSlot: ["\u62D6\u52A8\u4EE5\u8C03\u6574\u987A\u5E8F", "Drag to reorder"],
  teamSlotOptions: ["\u5C97\u4F4D\u8BBE\u7F6E", "Slot options"],
  teamArchiveConfirm: ["\u786E\u8BA4\u5F52\u6863", "Confirm archive"],
  teamInstanceLimit: ["\u6700\u591A {count} \u4EBA", "Up to {count}"],
  teamUseRoleModel: ["\u6CBF\u7528\u89D2\u8272\u6A21\u578B", "Use the role\u2019s model"],
  teamSlotsEmpty: ["\u8FD8\u6CA1\u6709\u5C97\u4F4D\u3002\u6DFB\u52A0\u5C97\u4F4D\uFF0C\u628A\u89D2\u8272\u7F16\u5165\u56E2\u961F\u3002", "No slots yet. Add one to bring a role onto the team."],
  teamResizeRail: ["\u62D6\u52A8\u8C03\u6574\u5BBD\u5EA6", "Drag to resize"],
  teamDecrease: ["\u51CF\u5C11", "Decrease"],
  teamIncrease: ["\u589E\u52A0", "Increase"],
  teamUntitled: ["\u672A\u547D\u540D", "Untitled"],
  teamRoleNamePlaceholder: ["\u89D2\u8272\u540D\u79F0", "Role name"],
  teamBlueprintNamePlaceholder: ["\u7F16\u5236\u540D\u79F0", "Blueprint name"],
  teamLeadDuty: ["\u62C6\u5206\u4EFB\u52A1\u3001\u6D3E\u6D3B\u3001\u76D1\u7763\u8FDB\u5EA6\u5E76\u6C47\u62A5", "Plans, delegates, supervises and reports"],
  teamApprovalShort: ["\u5BA1\u6279\u53D7\u9650", "Approval restricted"],
  teamMembersActive: ["{active} \u4EBA\u5DE5\u4F5C\u4E2D", "{active} working"],
  teamRolePersonaHint: ["\u6D3E\u6D3B\u65F6\u968F\u4EFB\u52A1\u4E00\u8D77\u4EA4\u7ED9\u6210\u5458\u3002", "Sent to the member with each assignment."],
  teamNormsHint: ["\u4E3B\u7BA1\u6BCF\u8F6E\u90FD\u4F1A\u770B\u5230\u8FD9\u4E9B\u7EA6\u5B9A\u3002", "The lead sees these on every turn."],
  teamRoleModelHint: ["\u5C97\u4F4D\u672A\u8986\u76D6\u65F6\u4F7F\u7528\u6B64\u6A21\u578B\u3002", "Used unless a slot overrides it."],
  teamLive: ["\u5B9E\u65F6", "Live"],
  teamLeadShort: ["\u7EDF\u7B79\u5168\u961F", "Coordinates"],
  teamQuiet: ["\u5F85\u547D", "Standing by"],
  teamCrew: ["\u6210\u5458", "Crew"],
  teamMember: ["\u6210\u5458", "Member"],
  teamViews: ["\u56E2\u961F\u89C6\u56FE", "Team views"],
  teamMemberCountLine: ["{count} \u540D\u6210\u5458 \xB7 {running} \u5DE5\u4F5C\u4E2D", "{count} members \xB7 {running} working"],
  teamLastActivity: ["\u6700\u8FD1\u6D88\u606F {time}", "Last message {time}"],
  teamOrbit: ["\u661F\u56FE", "Orbit"],
  teamComms: ["\u901A\u4FE1", "Comms"],
  teamOverview: ["\u6982\u89C8", "Overview"],
  teamSearchCrew: ["\u641C\u7D22\u6210\u5458\u3001\u4EFB\u52A1\u6216\u6A21\u578B", "Search members, tasks or models"],
  teamGroup_running: ["\u5DE5\u4F5C\u4E2D", "Working"],
  teamGroup_idle: ["\u7A7A\u95F2", "Idle"],
  teamGroup_vacant: ["\u7A7A\u5C97", "Vacant"],
  teamCrewClear: ["\u6E05\u9664\u7B5B\u9009", "Clear"],
  teamNoCrewMatch: ["\u6CA1\u6709\u5339\u914D\u7684\u6210\u5458", "No matching members"],
  teamMetricSlots: ["\u5728\u5C97", "Staffed"],
  teamMetricTasks: ["\u4EFB\u52A1", "Tasks"],
  teamMetricCapacity: ["\u5E76\u53D1", "Active"],
  teamMetricActivity: ["\u901A\u4FE1", "Comms"],
  teamMetricMessages: ["\u6D88\u606F", "messages"],
  teamOpenNative: ["\u5728\u5BF9\u8BDD\u4E2D\u6253\u5F00", "Open conversation"],
  teamStopTeam: ["\u505C\u6B62\u56E2\u961F", "Stop team"],
  teamLegendSpawn: ["\u6D3E\u6D3B", "Delegated"],
  teamLegendComms: ["\u901A\u4FE1", "Comms"],
  teamFit: ["\u590D\u4F4D\u89C6\u56FE", "Reset view"],
  teamZoomIn: ["\u653E\u5927", "Zoom in"],
  teamZoomOut: ["\u7F29\u5C0F", "Zoom out"],
  teamCommsAll: ["\u5168\u90E8", "All"],
  teamCommsEmpty: ["\u6210\u5458\u4E4B\u95F4\u8FD8\u6CA1\u6709\u6D88\u606F\u3002", "No messages between members yet."],
  teamCommsEmptyAgent: ["{name} \u8FD8\u6CA1\u6709\u6536\u53D1\u6D88\u606F\u3002", "{name} has not sent or received messages yet."],
  teamSettledNotice: ["\u5B8C\u6210\u901A\u77E5", "Finished"],
  teamJustNow: ["\u521A\u521A", "just now"],
  teamSecondsAgo: ["{count} \u79D2\u524D", "{count}s ago"],
  teamMinutesAgo: ["{count} \u5206\u949F\u524D", "{count}m ago"],
  teamHoursAgo: ["{count} \u5C0F\u65F6\u524D", "{count}h ago"],
  teamExpand: ["\u5C55\u5F00", "Show more"],
  teamCollapse: ["\u6536\u8D77", "Show less"],
  teamLatest: ["\u56DE\u5230\u6700\u65B0", "Latest"],
  teamNewMessages: ["{count} \u6761\u65B0\u6D88\u606F", "{count} new"],
  teamNowWorking: ["\u5F53\u524D", "Now"],
  teamNothingNow: ["\u6CA1\u6709\u8FDB\u884C\u4E2D\u7684\u4EFB\u52A1\u3002", "No task in progress."],
  teamVacantHint: ["\u4E3B\u7BA1\u6D3E\u6D3B\u5230\u8FD9\u4E2A\u5C97\u4F4D\u540E\uFF0C\u6210\u5458\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002", "A member appears here once the lead delegates to this slot."],
  teamOwnedTasks: ["\u8D1F\u8D23\u7684\u4EFB\u52A1", "Assigned tasks"],
  teamNoOwnedTasks: ["\u6682\u65E0\u4EFB\u52A1\u3002", "No tasks."],
  teamSlotInfo: ["\u5C97\u4F4D", "Slot"],
  teamRosterSummary: ["\u7F16\u5236", "Roster"],
  newRole: ["\u65B0\u5EFA\u5C97\u4F4D\u8282\u70B9", "New role node"],
  newRoleDesc: ["\u8FDE\u5230\u56E2\u961F\u8282\u70B9\u4E0A\uFF0C\u5C31\u6210\u4E3A\u56E2\u961F\u7684\u4E00\u4E2A\u5C97\u4F4D", "Wire it into a team to add a slot"],
  role: ["\u5C97\u4F4D", "Role"],
  teamRoleUntitled: ["\u672A\u547D\u540D\u5C97\u4F4D", "Untitled role"],
  teamRoleName: ["\u5C97\u4F4D\u540D", "Role name"],
  teamRoleSource: ["\u89D2\u8272\u6765\u6E90", "Role source"],
  teamRoleInline: ["\u5728\u6B64\u5B9A\u4E49", "Define here"],
  teamRoleDuty: ["\u804C\u8D23", "Responsibility"],
  teamRoleDutyPlaceholder: ["\u4E00\u53E5\u8BDD\u8BF4\u660E\u8FD9\u4E2A\u5C97\u4F4D\u8D1F\u8D23\u4EC0\u4E48", "What this role is responsible for"],
  teamRolePersona: ["\u4EBA\u8BBE", "Persona"],
  teamRolePersonaPlaceholder: ["\u7ED9\u6210\u5458\u7684\u5DE5\u4F5C\u65B9\u5F0F\u4E0E\u7EA6\u675F", "How members in this role should work"],
  teamRoleModel: ["\u6A21\u578B", "Model"],
  teamRoleModelDefault: ["\u4F7F\u7528\u89D2\u8272\u9ED8\u8BA4\u6A21\u578B", "Use the role's model"],
  teamRoleNeedsModel: ["\u9009\u4E00\u4E2A\u6A21\u578B", "Choose a model"],
  teamRoleStaffed: ["\u5DF2\u63A5\u5165 {team}", "Staffs {team}"],
  teamRoleLoose: ["\u62D6\u52A8\u9876\u90E8\u63A5\u53E3\uFF0C\u8FDE\u5230\u56E2\u961F\u8282\u70B9", "Drag the top socket onto a team"],
  teamRoleDisconnect: ["\u4ECE\u56E2\u961F\u65AD\u5F00", "Disconnect from team"],
  teamStaffSocket: ["\u7F16\u5236\u63A5\u53E3\uFF1A\u62D6\u5230\u56E2\u961F\u8282\u70B9\u4E0A", "Staffing socket: drag onto a team"],
  teamStaffPort: ["\u7F16\u5236\u53E3\uFF1A\u62D6\u51FA\u8FDE\u63A5\u5C97\u4F4D\u8282\u70B9\uFF0C\u62D6\u5230\u7A7A\u767D\u5904\u65B0\u5EFA\u5C97\u4F4D", "Staffing port: drag to a role node, or to empty canvas for a new role"],
  teamStaffLocked: ["\u56E2\u961F\u8FD0\u884C\u4E2D\uFF0C\u5C97\u4F4D\u8C03\u6574\u4F1A\u5728\u4E3B\u7BA1\u4E0B\u4E00\u6B21\u63A5\u5230\u4F60\u7684\u6D88\u606F\u65F6\u751F\u6548\u3002", "The team is running. Role changes apply on the lead's next message from you."],
  teamCrewTab: ["\u6210\u5458", "Crew"],
  teamLeadSettings: ["\u4E3B\u7BA1\u8BBE\u5B9A", "Lead settings"],
  teamLeadPersonaPlaceholder: ["\u4E3B\u7BA1\u5982\u4F55\u62C6\u89E3\u3001\u6D3E\u6D3B\u548C\u6C47\u62A5", "How the lead plans, delegates and reports"],
  teamNormsPlaceholder: ["\u6240\u6709\u6210\u5458\u90FD\u8981\u9075\u5B88\u7684\u7EA6\u5B9A", "Rules every member follows"],
  teamLeadModelDefault: ["\u4F7F\u7528\u4F1A\u8BDD\u9ED8\u8BA4\u6A21\u578B", "Use the session default"],
  teamNoSlotsYet: ["\u8FD8\u6CA1\u6709\u5C97\u4F4D\u3002\u4ECE\u4E0B\u65B9\u7F16\u5236\u53E3\u62D6\u51FA\u8FDE\u7EBF\uFF0C\u6216\u628A\u5C97\u4F4D\u8282\u70B9\u8FDE\u8FDB\u6765\u3002", "No roles yet. Drag from the staffing port below, or wire a role node in."],
  teamLayout: ["\u5E03\u5C40", "Layout"],
  teamLayout_row: ["\u6A2A\u6392", "Row"],
  teamLayout_orbit: ["\u73AF\u5F62", "Orbit"],
  teamLayout_tree: ["\u6811\u72B6", "Tree"],
  teamTasksLine: ["\u4EFB\u52A1 {done}/{total}", "Tasks {done}/{total}"],
  teamTasksActive: ["\u8FDB\u884C\u4E2D {count}", "{count} in progress"],
  teamOpenRoom: ["\u8FDB\u5165\u623F\u95F4", "Open room"],
  teamSlotsFull: ["\u4E00\u4E2A\u56E2\u961F\u6700\u591A 8 \u4E2A\u5C97\u4F4D", "A team has at most 8 slots"],
  teamFromLibrary: ["\u7F16\u5236\u5E93", "Library"],
  teamFromCanvas: ["\u753B\u5E03", "Canvas"]
};
function tFor(locale, key, values) {
  const pair = dict[key === "skipped" ? "flow_skipped" : key === "awaiting" ? "flow_awaiting" : key];
  let text = pair ? pair[locale === "en" ? 1 : 0] : key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
function t(key, values) {
  return tFor(getLanguage(), key, values);
}

// packages/flowspace/src/core/nodes/judge/ai.ts
import { z as z2 } from "zod";

// packages/flowspace/src/core/nodes/judge/common.ts
import { z } from "zod";
var reservedPorts = /* @__PURE__ */ new Set(["in", "out", "else", "error", "timeout", "skip"]);
var branchSchema = z.object({
  id: z.string().trim().min(1).refine((id) => !reservedPorts.has(id), "\u5206\u652F ID \u4E0E\u56FA\u5B9A\u7AEF\u53E3\u91CD\u540D"),
  label: z.string().trim().min(1)
});
function uniqueIds(branches) {
  return new Set(branches.map((branch) => branch.id)).size === branches.length;
}
var judgeBase = {
  version: 1,
  family: "logic",
  icon: "logic-branch",
  size: { compact: [256, 96], full: [312, 200] },
  quickCreate: { canvas: true, afterContinuationOut: true },
  experimental: true
};
function judgePorts(branches, extra) {
  const output = { direction: "out", role: "continuation", dataType: "text" };
  return [
    { id: "in", direction: "in", role: "continuation", dataType: "text" },
    ...branches.map(({ id, label }) => ({ ...output, id, label })),
    ...extra ? [{ ...output, id: extra, labelKey: `flow_${extra}` }] : [],
    { ...output, id: "error", labelKey: "flow_error", fixed: "error" }
  ];
}

// packages/flowspace/src/core/nodes/judge/ai.ts
var schema = z2.object({
  provider: z2.string(),
  model: z2.string(),
  instruction: z2.string(),
  branches: z2.array(branchSchema.extend({ description: z2.string() })).min(1).refine(uniqueIds, "\u5206\u652F ID \u91CD\u590D"),
  lowConfidence: z2.object({ threshold: z2.number().min(0).max(1), branch: z2.string() }).optional()
}).refine(({ branches, lowConfidence }) => !lowConfidence || branches.some((branch) => branch.id === lowConfidence.branch), {
  path: ["lowConfidence", "branch"],
  message: "\u4F4E\u7F6E\u4FE1\u5EA6\u51FA\u53E3\u5FC5\u987B\u6307\u5411\u73B0\u6709\u5206\u652F"
});
var ai = {
  ...judgeBase,
  flowType: "flowspace/ai-judge",
  titleKey: "flow_ai",
  descKey: "flow_ai_desc",
  configSchema: schema,
  capabilities: { callsModel: true },
  defaultConfig: { provider: "", model: "", instruction: "", branches: [
    { id: "pass", label: "A", description: "PASS" },
    { id: "review", label: "B", description: "REVIEW" }
  ] },
  ports: (config) => judgePorts(config.branches)
};

// packages/flowspace/src/core/nodes/judge/code.ts
import { z as z3 } from "zod";
var codeScript = z3.object({
  source: z3.string().min(1),
  timeoutMs: z3.number().int().min(100).max(5e3).default(1e3)
});
var schema2 = codeScript.extend({
  branches: z3.array(branchSchema).min(1).refine(uniqueIds, "\u5206\u652F ID \u91CD\u590D")
});
var code = {
  ...judgeBase,
  flowType: "flowspace/code",
  titleKey: "flow_code",
  descKey: "flow_code_desc",
  configSchema: schema2,
  capabilities: { runsCode: true },
  defaultConfig: { source: "(input) => Boolean(input.text)", timeoutMs: 1e3, branches: [{ id: "pass", label: "A" }] },
  ports: (config) => judgePorts(config.branches, "else")
};

// packages/flowspace/src/core/nodes/judge/condition.ts
import { z as z4 } from "zod";
var conditionRule = z4.object({
  field: z4.enum(["text", "json"]),
  path: z4.string().optional(),
  op: z4.enum(["contains", "not-contains", "regex", "equals", "empty", "gt", "lt"]),
  value: z4.string().optional()
}).superRefine(({ op, value }, ctx) => {
  if (op === "empty") return;
  if (value && /\{\{\s*var\./u.test(value)) return;
  let message;
  if (value === void 0) message = "\u6B64\u8FD0\u7B97\u7B26\u9700\u8981\u6BD4\u8F83\u503C";
  else if (op === "regex") {
    try {
      new RegExp(value, "u");
    } catch {
      message = "\u6B63\u5219\u8868\u8FBE\u5F0F\u65E0\u6548";
    }
  } else if ((op === "gt" || op === "lt") && (!value.trim() || !Number.isFinite(Number(value)))) {
    message = "\u6570\u503C\u6BD4\u8F83\u9700\u8981\u6709\u9650\u6570\u5B57";
  }
  if (message) ctx.addIssue({ code: "custom", path: ["value"], message });
});
var schema3 = z4.object({
  branches: z4.array(branchSchema.extend({
    match: z4.enum(["all", "any"]),
    rules: z4.array(conditionRule).min(1)
  })).min(1).refine(uniqueIds, "\u5206\u652F ID \u91CD\u590D")
});
function fieldAt(root, path = "") {
  const fields = path.trim().replace(/^\$(?=\.|\[|$)/, "").replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let value = root;
  for (const field of fields) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, field)) return void 0;
    value = value[field];
  }
  return value;
}
function matches(rule, subject) {
  if (rule.op === "empty") {
    return subject == null || typeof subject === "string" && !subject.trim() || typeof subject === "object" && Object.keys(subject).length === 0;
  }
  if (subject == null) return false;
  const text = typeof subject === "string" ? subject : JSON.stringify(subject);
  const value = rule.value;
  switch (rule.op) {
    case "contains":
      return text.includes(value);
    case "not-contains":
      return !text.includes(value);
    case "regex":
      return new RegExp(value, "u").test(text);
    case "equals":
      return text === value;
    case "gt":
    case "lt": {
      const number = Number(text);
      return !!text.trim() && Number.isFinite(number) && (rule.op === "gt" ? number > Number(value) : number < Number(value));
    }
  }
}
function conditionRoute(config, text) {
  let parsed2 = false;
  let json;
  const evaluate = (entry) => {
    if (entry.field === "text") return matches(entry, text);
    if (!parsed2) {
      parsed2 = true;
      try {
        json = JSON.parse(text);
      } catch {
      }
    }
    return json !== void 0 && matches(entry, fieldAt(json, entry.path));
  };
  return config.branches.find(
    (branch) => branch.match === "all" ? branch.rules.every(evaluate) : branch.rules.some(evaluate)
  )?.id ?? "else";
}
var condition = {
  ...judgeBase,
  flowType: "flowspace/condition",
  titleKey: "flow_condition",
  descKey: "flow_condition_desc",
  configSchema: schema3,
  capabilities: {},
  defaultConfig: { branches: [{ id: "pass", label: "A", match: "all", rules: [{ field: "text", op: "contains", value: "PASS" }] }] },
  ports: (config) => judgePorts(config.branches, "else")
};

// packages/flowspace/src/core/nodes/judge/human.ts
import { z as z5 } from "zod";
var schema4 = z5.object({
  question: z5.string().trim().min(1),
  options: z5.array(branchSchema).min(1).refine(uniqueIds, "\u9009\u9879 ID \u91CD\u590D"),
  timeoutSec: z5.number().int().nonnegative().optional(),
  timeoutAction: z5.enum(["wait", "skip", "default", "timeout-port"]).default("wait"),
  defaultOption: z5.string().optional()
}).superRefine(({ options, timeoutSec, timeoutAction, defaultOption }, ctx) => {
  if (timeoutAction !== "wait" && timeoutSec === void 0)
    ctx.addIssue({ code: "custom", path: ["timeoutSec"], message: "\u8BF7\u9009\u62E9\u8D85\u65F6\u65F6\u957F" });
  if ((defaultOption !== void 0 || timeoutAction === "default") && !options.some((option) => option.id === defaultOption))
    ctx.addIssue({ code: "custom", path: ["defaultOption"], message: "\u9ED8\u8BA4\u9009\u9879\u5FC5\u987B\u6307\u5411\u73B0\u6709\u9009\u9879" });
});
var human = {
  ...judgeBase,
  flowType: "flowspace/human-choice",
  titleKey: "flow_human",
  descKey: "flow_human_desc",
  configSchema: schema4,
  capabilities: { needsHuman: true },
  defaultConfig: { question: tFor("zh", "flow_human_desc"), options: [{ id: "pass", label: "A" }, { id: "review", label: "B" }], timeoutAction: "wait" },
  ports: (config) => judgePorts(config.options, config.timeoutAction === "timeout-port" ? "timeout" : void 0)
};

// packages/flowspace/src/core/nodes/judge/index.ts
var judges = [condition, code, ai, human];

// packages/flowspace/src/core/nodes/fanout.ts
import { z as z6 } from "zod";
var fanSchema = z6.object({
  concurrency: z6.number().int().positive().default(4),
  followMaster: z6.boolean().default(true)
});
var defaultCondition = {
  match: condition.defaultConfig.branches[0].match,
  rules: condition.defaultConfig.branches[0].rules
};
var defaultScript = { source: code.defaultConfig.source, timeoutMs: code.defaultConfig.timeoutMs };
var defaultAi = {
  provider: "",
  model: "",
  instruction: "",
  passDescription: "PASS",
  failDescription: "FAIL",
  threshold: 0
};
var mergeSchema = z6.object({
  wait: z6.enum(["all", "any", "quorum", "best"]).default("all"),
  quorum: z6.number().int().positive().default(1),
  output: z6.enum(["list", "text"]).default("list"),
  cancelRest: z6.boolean().default(false),
  scoreBy: z6.enum(["human", "ai"]).default("human"),
  arena: z6.boolean().default(false),
  taskTag: z6.string().default(""),
  sortMode: z6.enum(["off", "condition", "code", "ai"]).default("off"),
  condition: z6.object({ match: z6.enum(["all", "any"]), rules: z6.array(conditionRule).min(1) }).default(defaultCondition),
  code: codeScript.default(defaultScript),
  ai: z6.object({
    provider: z6.string(),
    model: z6.string(),
    instruction: z6.string(),
    passDescription: z6.string(),
    failDescription: z6.string(),
    threshold: z6.number().min(0).max(1)
  }).default(defaultAi)
});
var fanout = {
  ...judgeBase,
  flowType: "flowspace/fanout",
  titleKey: "flow_fanout",
  descKey: "flow_fanout_desc",
  icon: "fanout",
  configSchema: fanSchema,
  defaultConfig: { concurrency: 4, followMaster: true },
  capabilities: {},
  quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
  ports: () => [
    { id: "in", role: "continuation", direction: "in", dataType: "list" },
    { id: "in", role: "reference", direction: "in", dataType: "list" },
    { id: "out", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_fanout_item" }
  ]
};
var mergeSort = {
  ...judgeBase,
  flowType: "flowspace/merge-sort",
  titleKey: "flow_merge_sort",
  descKey: "flow_merge_sort_desc",
  icon: "merge-in",
  configSchema: mergeSchema,
  defaultConfig: mergeSchema.parse({}),
  capabilities: {},
  quickCreate: { canvas: false },
  ports: (config) => {
    const output = { role: "continuation", direction: "out", dataType: config.output ?? "list" };
    const outputs = !config.sortMode || config.sortMode === "off" ? [{ ...output, id: "out", labelKey: "flow_merge_out" }] : [
      { ...output, id: "pass", labelKey: "flow_merge_pass" },
      { ...output, id: "fail", labelKey: "flow_merge_fail" },
      { ...output, id: "error", labelKey: "flow_error", fixed: "error" }
    ];
    return [
      { id: "in", role: "continuation", direction: "in", dataType: "text" },
      { id: "list", role: "continuation", direction: "in", dataType: "list", labelKey: "flow_merge_list" },
      ...outputs
    ];
  }
};

// packages/flowspace/src/core/nodes/data/descriptors.ts
import { z as z8 } from "zod";

// packages/flowspace/src/core/nodes/data/text.ts
function markdown(text) {
  const lines2 = text.split(/\r\n?|\n/);
  const headings = [];
  const blocks = [];
  let fence;
  for (let line = 0; line < lines2.length; line++) {
    const value = lines2[line];
    const marker = /^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(value);
    if (fence) {
      if (marker && marker[1][0] === fence.marker[0] && marker[1].length >= fence.marker.length && !marker[2].trim()) {
        blocks.push({ language: fence.language, code: lines2.slice(fence.start, line).join("\n") });
        fence = void 0;
      }
    } else if (marker) {
      fence = { marker: marker[1], language: marker[2].trim().split(/\s+/)[0], start: line + 1 };
    } else {
      const heading = /^ {0,3}(#{1,6})(?:\s+(.+)|\s*)$/.exec(value);
      if (heading) headings.push({ line, level: heading[1].length, title: (heading[2] ?? "").trim().replace(/\s+#+$/, "") });
    }
  }
  if (fence) blocks.push({ language: fence.language, code: lines2.slice(fence.start).join("\n") });
  return { lines: lines2, headings, blocks };
}
function pieces(values) {
  return values.map((value) => value.trim()).filter(Boolean);
}
function splitValues(config, text) {
  if (!text.trim()) return [];
  switch (config.mode) {
    case "lines":
      return pieces(text.split(/\r\n?|\n/));
    case "delimiter": {
      const delimiter = String(config.delimiter ?? "");
      if (!delimiter) throw new Error("\u62C6\u5206\u9700\u8981\u975E\u7A7A\u5206\u9694\u7B26");
      return pieces(text.split(delimiter));
    }
    case "regex": {
      const pattern = String(config.pattern ?? "");
      if (!pattern) throw new Error("\u62C6\u5206\u9700\u8981\u6B63\u5219\u8868\u8FBE\u5F0F");
      const parts = [];
      let start = 0;
      for (const match of text.matchAll(new RegExp(pattern, "gu"))) {
        parts.push(text.slice(start, match.index));
        start = match.index + match[0].length;
      }
      return pieces([...parts, text.slice(start)]);
    }
    case "headings": {
      const { lines: lines2, headings } = markdown(text);
      const cuts = [0, ...headings.map((h) => h.line), lines2.length];
      return pieces(cuts.slice(1).map((end, i) => lines2.slice(cuts[i], end).join("\n")));
    }
    case "code-blocks":
      return markdown(text).blocks.map((block) => block.code);
    default:
      throw new Error("\u672A\u77E5\u7684\u6587\u672C\u62C6\u5206\u65B9\u5F0F");
  }
}
function pathValues(value, path) {
  const input = path.trim();
  let i = input.startsWith("$") ? 1 : 0;
  let found = [value];
  while (i < input.length) {
    let key, wildcard = false;
    if (input[i] === "[") {
      const part = /^\[\s*(\d+|\*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\]/.exec(input.slice(i));
      if (!part) throw new Error("JSON \u8DEF\u5F84\u7684\u4E0B\u6807\u65E0\u6548");
      const raw = part[1];
      wildcard = raw === "*";
      key = raw.startsWith('"') ? JSON.parse(raw) : raw.startsWith("'") ? raw.slice(1, -1).replace(/\\(['\\])/g, "$1") : raw;
      i += part[0].length;
    } else {
      if (input[i] === ".") i++;
      else if (i !== 0) throw new Error("JSON \u8DEF\u5F84\u9700\u8981\u70B9\u53F7\u6216\u65B9\u62EC\u53F7");
      const field = /^[^.[\]\s]+/.exec(input.slice(i));
      if (!field) throw new Error("JSON \u8DEF\u5F84\u7F3A\u5C11\u5B57\u6BB5\u540D");
      key = field[0];
      wildcard = key === "*";
      i += key.length;
    }
    const next = [];
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
function extractValues(config, text) {
  if (!text.trim()) return [];
  switch (config.mode) {
    case "regex": {
      if (!config.pattern) throw new Error("\u63D0\u53D6\u9700\u8981\u6B63\u5219\u8868\u8FBE\u5F0F");
      return [...text.matchAll(new RegExp(String(config.pattern), "gmu"))].map((match) => {
        if (match.groups) return Object.fromEntries(Object.entries(match.groups).map(([name, value]) => [name, value ?? null]));
        if (match.length > 2) return match.slice(1).map((value) => value ?? null);
        return match.length === 2 ? match[1] ?? null : match[0];
      });
    }
    case "json-path": {
      const first = markdown(text).blocks.find((block) => block.language.toLowerCase() === "json");
      return pathValues(JSON.parse(first?.code ?? text), String(config.path ?? "$"));
    }
    case "code-blocks":
      return markdown(text).blocks.map((block) => block.code);
    case "heading": {
      const { lines: lines2, headings } = markdown(text);
      const wanted = String(config.heading ?? "").trim().replace(/^#{1,6}\s+/, "").toLowerCase();
      return headings.flatMap((heading, index) => {
        if (heading.title.toLowerCase() !== wanted) return [];
        const end = headings.slice(index + 1).find((next) => next.level <= heading.level)?.line ?? lines2.length;
        return pieces([lines2.slice(heading.line + 1, end).join("\n")]);
      });
    }
    default:
      throw new Error("\u672A\u77E5\u7684\u63D0\u53D6\u65B9\u5F0F");
  }
}
function paths(text) {
  const values = [];
  for (const match of text.matchAll(/"([^"\r\n]+)"|'([^'\r\n]+)'|\x60([^\x60\r\n]+)\x60|[^\s"'()\x60<>\[\]{},;]+/gu)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? match[0]).replace(/[,.;，。；]+$/u, "").replace(/:\d+(?::\d+)?:?$/, "");
    if (/^[a-z]+:\/\//i.test(value)) continue;
    if (/^(?:[a-z]:[\\/]|\\\\|\/|\.{1,2}[\\/]|~[\\/]).+/iu.test(value) || /^[\w@.~\-\p{L}]+(?:[\\/][\w@.~ \-\p{L}]+)+$/u.test(value) || /^[\w \-\p{L}]+\.[a-z][\w-]*$/iu.test(value)) values.push(value);
  }
  return values;
}
function errorBlocks(text) {
  const errors = [];
  let lines2 = [];
  const finish = () => {
    if (lines2.length) errors.push(lines2.join("\n"));
    lines2 = [];
  };
  for (const line of text.split(/\r\n?|\n/)) {
    const head = /\b(?:[\w.]*Error|[\w.]*Exception|Traceback|FATAL)\b|错误|异常|报错/i.test(line);
    if (lines2.length && (/^\s+\S|^Caused by:/i.test(line) || lines2[0].startsWith("Traceback") && head)) lines2.push(line);
    else {
      finish();
      if (head) lines2.push(line);
    }
  }
  finish();
  return errors;
}
function jsonSections(text) {
  const fenced = markdown(text).blocks.filter((block) => block.language.toLowerCase() === "json");
  if (fenced.length) return fenced.map((block) => JSON.parse(block.code));
  try {
    return [JSON.parse(text)];
  } catch {
  }
  const result = [];
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (start < 0) {
      if (char === "{" || char === "[") {
        start = i;
        depth = 1;
      }
    } else if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") depth++;
    else if ((char === "}" || char === "]") && --depth === 0) {
      try {
        result.push(JSON.parse(text.slice(start, i + 1)));
      } catch {
      }
      start = -1;
    }
  }
  return result;
}
function parseValues(config, text) {
  if (!text.trim()) return [];
  switch (config.kind) {
    case "todos":
      return text.split(/\r\n?|\n/).flatMap((line) => {
        const task = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.+)/u.exec(line) ?? /^\s*(?:(?:\/\/|#|\/\*+|\*|-)\s*)?TODO(?:\([^)]*\))?[\s:：-]+(.+)/iu.exec(line);
        return task ? [task[1].trim()] : [];
      });
    case "paths":
      return paths(text);
    case "errors":
      return errorBlocks(text);
    case "json":
      return jsonSections(text);
    case "code-blocks":
      return markdown(text).blocks.map((block) => ({ language: block.language, code: block.code }));
    default:
      throw new Error("\u672A\u77E5\u7684\u4E0A\u4E0B\u6587\u89E3\u6790\u65B9\u5F0F");
  }
}

// packages/flowspace/src/core/nodes/variables.ts
import { z as z7 } from "zod";
var VARIABLE_TYPES = ["text", "number", "boolean", "list", "record"];
var VARIABLE_SCOPES = ["run", "canvas", "lane"];
var VARIABLE_OPERATIONS = ["set", "append", "increment", "decrement", "merge"];
var variableName = /^[\p{L}_][\p{L}\p{N}_]*$/u;
var variableTemplate = /\{\{\s*var\.([\p{L}_][\p{L}\p{N}_]*)\s*\}\}/gu;
function variableValue(type, input) {
  let value = input;
  if (type === "text") return typeof value === "string" ? value : JSON.stringify(value);
  if (typeof value === "string") {
    if (value.trim()) value = JSON.parse(value);
    else value = type === "number" ? 0 : type === "boolean" ? false : type === "list" ? [] : {};
  }
  if (type === "number" && typeof value === "number" && Number.isFinite(value) || type === "boolean" && typeof value === "boolean" || type === "list" && Array.isArray(value) || type === "record" && typeof value === "object" && value !== null && !Array.isArray(value)) return value;
  throw new Error("\u53D8\u91CF\u503C\u4E0E\u5B9A\u4E49\u7684\u7C7B\u578B\u4E0D\u4E00\u81F4");
}
var definition = z7.object({
  name: z7.string().regex(variableName).default("variable"),
  type: z7.enum(VARIABLE_TYPES).default("text"),
  scope: z7.enum(VARIABLE_SCOPES).default("run"),
  initial: z7.string().default("")
}).superRefine(({ type, initial }, ctx) => {
  try {
    variableValue(type, initial);
  } catch {
    ctx.addIssue({ code: "custom", path: ["initial"], message: "\u521D\u59CB\u503C\u4E0E\u53D8\u91CF\u7C7B\u578B\u4E0D\u4E00\u81F4" });
  }
});
var assignmentConfig = z7.object({
  name: z7.string().regex(variableName).default("variable"),
  operation: z7.enum(VARIABLE_OPERATIONS).default("set"),
  value: z7.string().default(""),
  inputValue: z7.boolean().default(true)
});
var inputPorts = [
  { id: "in", direction: "in", role: "continuation", dataType: "text" },
  { id: "in", direction: "in", role: "reference", dataType: "text" }
];
var dataType = (type) => type === "list" || type === "record" ? type : "text";
var variableNode = {
  ...judgeBase,
  flowType: "flowspace/variable",
  family: "data",
  icon: "braces",
  titleKey: "flow_variable",
  descKey: "flow_variable_desc",
  configSchema: definition,
  defaultConfig: definition.parse({}),
  capabilities: { resourceOnly: true, sideEffects: true },
  quickCreate: { canvas: true, afterContinuationOut: true },
  ports: (config) => [inputPorts[0], { id: "out", direction: "out", role: "reference", dataType: dataType(config.type), labelKey: "flow_variable_ref" }]
};
var assignmentNode = {
  ...judgeBase,
  flowType: "flowspace/assign",
  family: "data",
  icon: "braces",
  titleKey: "flow_assign",
  descKey: "flow_assign_desc",
  configSchema: assignmentConfig,
  defaultConfig: assignmentConfig.parse({}),
  capabilities: { sideEffects: true },
  quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
  ports: () => [
    ...inputPorts,
    { id: "out", direction: "out", role: "continuation", dataType: "text", labelKey: "flow_data_result" },
    { id: "error", direction: "out", role: "continuation", dataType: "text", labelKey: "flow_error", fixed: "error" }
  ]
};
function variableContent(type, value, limit) {
  if (type === "list") return contentList(value, limit);
  if (type === "record") return { dataType: "record", value };
  return { dataType: "text", value: typeof value === "string" ? value : JSON.stringify(value) };
}

// packages/flowspace/src/core/nodes/data/descriptors.ts
var mode = (options) => z8.enum(options).default(options[0]);
var aiSettings = z8.object({ provider: z8.string(), model: z8.string(), instruction: z8.string() }).default({ provider: "", model: "", instruction: "" });
var defaultBranch = condition.defaultConfig.branches[0];
var ruleSettings = z8.object({ match: z8.enum(["all", "any"]), rules: z8.array(conditionRule).min(1) }).default({ match: defaultBranch.match, rules: defaultBranch.rules });
var script = (source) => codeScript.default({ source, timeoutMs: 1e3 });
var itemTemplate = z8.string().default("{{item}}");
function patternError(pattern, ctx) {
  try {
    if (!pattern) throw new Error();
    new RegExp(pattern, "u");
  } catch {
    ctx.addIssue({ code: "custom", path: ["pattern"], message: "\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6B63\u5219\u8868\u8FBE\u5F0F" });
  }
}
function pathError(path, ctx) {
  try {
    pathValues(null, path);
  } catch (error) {
    ctx.addIssue({ code: "custom", path: ["path"], message: error instanceof Error ? error.message : String(error) });
  }
}
function constantValues(text) {
  if (!text.trim().startsWith("[")) return text.split(/\r\n?|\n/).map((line) => line.trim()).filter(Boolean);
  return JSON.parse(text);
}
var split = z8.object({
  mode: mode(["lines", "delimiter", "regex", "headings", "code-blocks"]),
  delimiter: z8.string().default(","),
  pattern: z8.string().default("\\s+")
}).superRefine((config, ctx) => {
  if (config.mode === "regex") patternError(config.pattern, ctx);
  if (config.mode === "delimiter" && !config.delimiter) ctx.addIssue({ code: "custom", path: ["delimiter"], message: "\u62C6\u5206\u9700\u8981\u975E\u7A7A\u5206\u9694\u7B26" });
});
var join = z8.object({ mode: mode(["delimiter", "numbered", "template"]), delimiter: z8.string().default("\n"), template: itemTemplate });
var extract = z8.object({
  mode: mode(["regex", "json-path", "code-blocks", "heading"]),
  pattern: z8.string().default("\\S+"),
  path: z8.string().default("$"),
  heading: z8.string().default("")
}).superRefine((config, ctx) => {
  if (config.mode === "regex") patternError(config.pattern, ctx);
  if (config.mode === "json-path") pathError(config.path, ctx);
  if (config.mode === "heading" && !config.heading.trim()) ctx.addIssue({ code: "custom", path: ["heading"], message: "\u8BF7\u8F93\u5165 Markdown \u6807\u9898" });
});
var template = z8.object({
  inputs: z8.array(z8.string().trim().min(1).regex(/^[^{}]+$/).refine((name) => !["out", "error"].includes(name), "\u8F93\u5165\u540D\u4E0E\u8F93\u51FA\u7AEF\u53E3\u91CD\u540D")).min(1).refine((names) => new Set(names).size === names.length, "\u8F93\u5165\u7AEF\u53E3\u540D\u91CD\u590D").default(["in"]),
  template: z8.string().default("{{in}}")
}).superRefine((config, ctx) => {
  for (const token of config.template.replace(variableTemplate, "").matchAll(/\{\{([^{}]+)\}\}/g)) {
    const field = token[1].trim();
    if (!config.inputs.some((name) => field === name || field.startsWith(name + ".") || field.startsWith(name + "["))) {
      ctx.addIssue({ code: "custom", path: ["template"], message: `\u6CA1\u6709\u540D\u4E3A\u300C${field}\u300D\u7684\u8F93\u5165\u7AEF\u53E3` });
    }
  }
});
var map = z8.object({
  mode: mode(["template", "code", "ai"]),
  template: itemTemplate,
  code: script("(input) => input.item"),
  ai: aiSettings
});
var filter = z8.object({
  mode: mode(["rule", "code", "ai"]),
  condition: ruleSettings,
  code: script("(input) => Boolean(input.item)"),
  ai: aiSettings
});
var sort = z8.object({
  mode: mode(["field", "rule", "ai"]),
  path: z8.string().default("$"),
  order: mode(["asc", "desc"]),
  condition: ruleSettings,
  ai: aiSettings
}).superRefine((config, ctx) => {
  if (config.mode === "field") pathError(config.path, ctx);
});
var dedupe = z8.object({ mode: mode(["exact", "normalized", "ai"]), ai: aiSettings });
var constant = z8.object({ mode: mode(["text", "list"]), value: z8.string().default("") }).superRefine((config, ctx) => {
  if (config.mode !== "list" || !config.value.trim().startsWith("[")) return;
  try {
    constantValues(config.value);
  } catch {
    ctx.addIssue({ code: "custom", path: ["value"], message: "\u5217\u8868\u5E38\u91CF\u9700\u8981\u6709\u6548\u7684 JSON \u6570\u7EC4\uFF0C\u6216\u6BCF\u884C\u4E00\u4E2A\u6761\u76EE" });
  }
});
var accumulate = z8.strictObject({});
var parse = z8.object({
  mode: mode(["rule", "code", "ai"]),
  kind: mode(["todos", "paths", "errors", "json", "code-blocks"]),
  code: script("(input) => input.text.split(/\\r?\\n/).filter(Boolean)"),
  ai: aiSettings
});
function describe(name, icon, configSchema, inputType, output) {
  return {
    ...judgeBase,
    flowType: `flowspace/${name}`,
    family: "data",
    icon,
    titleKey: `flow_data_${name}`,
    descKey: `flow_data_${name}_desc`,
    configSchema,
    defaultConfig: configSchema.parse({}),
    capabilities: {},
    quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true },
    ports(config) {
      const names = name === "template" && Array.isArray(config.inputs) ? config.inputs.map(String) : ["in"];
      const inputs = names.flatMap((id) => ["continuation", "reference"].map((role) => ({ id, role, direction: "in", dataType: inputType, ...name === "template" ? { label: id } : {} })));
      const result = {
        id: "out",
        role: "continuation",
        direction: "out",
        dataType: typeof output === "string" ? output : output(config),
        labelKey: "flow_data_result"
      };
      return [
        ...inputs,
        result,
        ...name === "constant" ? [{ ...result, role: "reference", labelKey: "flow_data_constant_ref" }] : [],
        { id: "error", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_error", fixed: "error" }
      ];
    }
  };
}
var dataDescriptors = [
  describe("split", "split", split, "text", "list"),
  describe("join", "merge-in", join, "list", "text"),
  describe("extract", "braces", extract, "text", "list"),
  describe("template", "braces", template, "text", "text"),
  describe("map", "braces", map, "list", "list"),
  describe("filter", "filter", filter, "list", "list"),
  describe("sort", "sort", sort, "list", "list"),
  describe("dedupe", "filter", dedupe, "list", "list"),
  describe("constant", "braces", constant, "text", (config) => config.mode === "list" ? "list" : "text"),
  describe("accumulate", "merge-in", accumulate, "list", "list"),
  describe("parse", "braces", parse, "text", "list")
];
function dataMode(node2) {
  const mode2 = node2.config?.mode;
  if (mode2 === "code" && ["flowspace/map", "flowspace/filter", "flowspace/parse"].includes(node2.flowType ?? "")) return "code";
  if (mode2 === "ai" && ["flowspace/map", "flowspace/filter", "flowspace/sort", "flowspace/dedupe", "flowspace/parse"].includes(node2.flowType ?? "")) return "ai";
  return "rule";
}

// packages/flowspace/src/core/nodes/operations.ts
import { z as z9 } from "zod";
var gitActions = [
  "init",
  "stage",
  "unstage",
  "stageAll",
  "unstageAll",
  "discard",
  "commit",
  "createBranch",
  "checkoutBranch",
  "fetch",
  "pull",
  "push",
  "createWorktree",
  "removeWorktree"
];
var operationParameter = z9.object({
  name: z9.string().trim().min(1),
  source: z9.enum(["fixed", "template", "upstream", "model", "human"]).default("fixed"),
  value: z9.string().default("")
});
var common = z9.object({
  cwd: z9.string().default(""),
  parameters: z9.array(operationParameter).default([]),
  timeoutSec: z9.number().min(1).max(3600).default(60),
  provider: z9.string().default(""),
  model: z9.string().default(""),
  approved: z9.array(z9.string()).default([]),
  retryUpstream: z9.boolean().default(false)
});
var terminalOperation = common.extend({
  program: z9.string().default(""),
  mode: z9.enum(["once", "interactive"]).default("once"),
  outputMode: z9.enum(["text", "lines"]).default("text"),
  terminalId: z9.string().default(""),
  readyPattern: z9.string().default(""),
  sandbox: z9.boolean().default(false)
});
var gitOperation = common.extend({ action: z9.enum(gitActions).default("stage") });
function ports(output) {
  return [
    { id: "in", direction: "in", role: "continuation", dataType: "text" },
    { id: "in", direction: "in", role: "reference", dataType: "text" },
    { id: "out", direction: "out", role: "reference", dataType: "text", labelKey: "flow_exec_tool" },
    { id: "out", direction: "out", role: "continuation", dataType: output, labelKey: "flow_exec_success" },
    { id: "error", direction: "out", role: "continuation", dataType: "text", labelKey: "flow_exec_failure", fixed: "error" }
  ];
}
var terminalExec = {
  ...judgeBase,
  flowType: "flowspace/exec-terminal",
  family: "exec",
  icon: "term",
  titleKey: "flow_exec_terminal",
  descKey: "flow_exec_terminal_desc",
  configSchema: terminalOperation,
  defaultConfig: terminalOperation.parse({}),
  capabilities: { sideEffects: true },
  ports: (config) => ports(config.outputMode === "lines" ? "list" : "text")
};
var gitExec = {
  ...judgeBase,
  flowType: "flowspace/exec-git",
  family: "exec",
  icon: "git",
  titleKey: "flow_exec_git",
  descKey: "flow_exec_git_desc",
  configSchema: gitOperation,
  defaultConfig: gitOperation.parse({}),
  capabilities: { sideEffects: true },
  ports: () => ports("text")
};
var isOperation = (flowType) => flowType === terminalExec.flowType || flowType === gitExec.flowType;

// packages/flowspace/src/core/nodes/interactions.ts
import { z as z10 } from "zod";
var humanFieldSchema = z10.object({
  name: z10.string().trim().min(1),
  label: z10.string().trim().min(1),
  type: z10.enum(["text", "number", "boolean", "select", "score", "review", "like"]),
  choices: z10.array(z10.string()).optional(),
  required: z10.boolean().optional()
});
var form = z10.object({
  question: z10.string().default(""),
  fields: z10.array(humanFieldSchema).default([{ name: "answer", label: "Answer", type: "text", required: true }]),
  timeoutSec: z10.number().min(1).max(604800).optional(),
  timeoutAction: z10.enum(["wait", "skip", "default", "timeout-port"]).default("wait"),
  defaultAnswer: z10.string().default("{}"),
  aiPrefill: z10.boolean().default(false),
  rating: z10.enum(["stars", "like"]).default("stars"),
  provider: z10.string().default(""),
  model: z10.string().default("")
});
var humanConfig = form;
function checkAnswers(fields, input) {
  const out = {};
  for (const field of fields) {
    const value = input[field.name] ?? (field.type === "boolean" || field.type === "like" ? false : void 0);
    if (value === void 0) {
      if (!field.required) continue;
      throw new Error(`\u8BF7\u586B\u5199\u300C${field.label}\u300D`);
    }
    if (field.type === "number" && typeof value === "number" && Number.isFinite(value) || field.type === "score" && typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5 || (field.type === "boolean" || field.type === "like") && typeof value === "boolean" || field.type === "select" && typeof value === "string" && field.choices?.includes(value) || (field.type === "text" || field.type === "review") && typeof value === "string" && (!field.required || !!value.trim())) {
      out[field.name] = value;
    } else throw new Error(`\u300C${field.label}\u300D\u7684\u56DE\u7B54\u65E0\u6548`);
  }
  return out;
}
var portsFor = (kind, timeout) => [
  { id: "in", role: "continuation", direction: "in", dataType: "text" },
  { id: "in", role: "reference", direction: "in", dataType: "text" },
  { id: "out", role: "continuation", direction: "out", dataType: kind === "review" ? "text" : "record", labelKey: "flow_human_submit" },
  ...timeout ? [{ id: "timeout", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_timeout" }] : [],
  { id: "error", role: "continuation", direction: "out", dataType: "text", fixed: "error", labelKey: "flow_error" }
];
var humanNodes = ["form", "score", "review"].map((kind) => ({
  ...judgeBase,
  flowType: `flowspace/human-${kind}`,
  family: "human",
  icon: kind === "score" ? "star" : "person",
  titleKey: `flow_human_${kind}`,
  descKey: `flow_human_${kind}_desc`,
  configSchema: form,
  defaultConfig: form.parse({}),
  capabilities: { needsHuman: true },
  ports: (config) => portsFor(kind, config.timeoutAction === "timeout-port"),
  quickCreate: { canvas: true, afterContinuationOut: true, afterReferenceOut: true }
}));
var triggerConfig = z10.object({
  mode: z10.enum(["launchpad", "interval", "cron", "rrule", "file", "git", "terminal", "container"]).default("launchpad"),
  enabled: z10.boolean().default(false),
  intervalSec: z10.number().int().min(1).max(604800).default(60),
  timeZone: z10.string().default("Asia/Shanghai"),
  schedule: z10.string().default(""),
  cwd: z10.string().default(""),
  path: z10.string().default(""),
  sourceNodeId: z10.string().default(""),
  match: z10.string().default(""),
  cooldownSec: z10.number().min(0).optional(),
  dailyLimit: z10.number().int().min(1).optional(),
  busy: z10.enum(["skip", "queue", "interrupt"]).optional(),
  fields: z10.array(humanFieldSchema).default([])
});
var triggerNode = {
  ...judgeBase,
  flowType: "flowspace/trigger",
  family: "trigger",
  icon: "bolt",
  titleKey: "flow_trig_title",
  descKey: "flow_trig_desc",
  configSchema: triggerConfig,
  defaultConfig: triggerConfig.parse({}),
  capabilities: { resourceOnly: true },
  ports: (config) => [{
    id: "out",
    role: "continuation",
    direction: "out",
    labelKey: "flow_trig_out",
    dataType: config.mode === "file" ? "list" : config.fields.length ? "record" : "text"
  }]
};
var noticeConfig = z10.object({
  title: z10.string().default(""),
  message: z10.string().default(""),
  system: z10.boolean().default(false),
  sound: z10.boolean().default(false)
});
var noticeNode = {
  ...judgeBase,
  flowType: "flowspace/notice",
  family: "trigger",
  icon: "bell",
  titleKey: "flow_notice",
  descKey: "flow_notice_desc",
  configSchema: noticeConfig,
  defaultConfig: noticeConfig.parse({}),
  capabilities: {},
  ports: () => [
    { id: "in", role: "continuation", direction: "in", dataType: "text" },
    { id: "out", role: "continuation", direction: "out", dataType: "text", labelKey: "flow_notice_sent" }
  ]
};
function hasStatusPort(kind, flowType, fanout2 = false) {
  return kind === "agent" || kind === "terminal" || kind === "git" || kind === "group" && fanout2 || kind === "flow" && !!flowType && /(?:exec-|human-|judge$|^flowspace\/(?:condition|code|fanout|merge-sort|variable)$)/.test(flowType);
}

// packages/flowspace/src/core/nodes/play.ts
import { z as z11 } from "zod";
var randomConfig = z11.object({
  mode: z11.enum(["random", "rotation"]).default("random"),
  seed: z11.string().default(""),
  branches: z11.array(branchSchema.extend({ value: z11.string().default("") })).min(1).refine(uniqueIds).default([{ id: "first", label: "A", value: "A" }, { id: "second", label: "B", value: "B" }])
});
var randomNode = {
  ...judgeBase,
  flowType: "flowspace/random",
  family: "logic",
  icon: "dice",
  titleKey: "flow_play_random",
  descKey: "flow_play_random_desc",
  configSchema: randomConfig,
  defaultConfig: randomConfig.parse({}),
  capabilities: {},
  ports: (config) => judgePorts(config.branches)
};
function seededIndex(seed, iteration, count) {
  let state = 2166136261;
  for (const char of `${seed}:${iteration}`) state = Math.imul(state ^ char.codePointAt(0), 16777619);
  return (state >>> 0) % count;
}

// packages/flowspace/src/core/nodes/registry.ts
var DEFAULT_FLOW_SIZE = {
  compact: [256, 96],
  full: [312, 200]
};
var descriptors = new Map([
  ...judges,
  fanout,
  mergeSort,
  variableNode,
  assignmentNode,
  gitExec,
  terminalExec,
  triggerNode,
  noticeNode,
  randomNode,
  ...humanNodes,
  ...dataDescriptors
].map((descriptor) => [descriptor.flowType, descriptor]));
function registerDescriptor(descriptor) {
  const { flowType } = descriptor;
  if (descriptors.has(flowType)) throw new Error(`\u8282\u70B9\u7C7B\u578B\u5DF2\u6CE8\u518C\uFF1A${flowType}`);
  descriptors.set(flowType, descriptor);
  let registered = true;
  return () => {
    if (!registered) return;
    registered = false;
    descriptors.delete(flowType);
  };
}
function descriptorOf(flowType) {
  return flowType ? descriptors.get(flowType) : void 0;
}
function isExecutable(node2) {
  const descriptor = node2.kind === "flow" ? descriptorOf(node2.flowType) : void 0;
  return node2.kind === "agent" || !!descriptor && !descriptor.capabilities.resourceOnly;
}
function portsOf(node2) {
  const descriptor = node2.kind === "flow" ? descriptorOf(node2.flowType) : void 0;
  return descriptor ? descriptor.ports(node2.config ?? descriptor.defaultConfig) : [];
}
function sizeOf(node2, compact) {
  const size = descriptorOf(node2.flowType)?.size ?? DEFAULT_FLOW_SIZE;
  return compact ? size.compact : size.full;
}

// packages/flowspace/src/core/document.ts
function workflowNodes(document) {
  return [
    ...document.nodes,
    ...(document.templates ?? []).flatMap((template2) => template2.nodes),
    ...(document.snapshots ?? []).flatMap((snapshot2) => snapshot2.nodes)
  ];
}
var uid = () => crypto.randomUUID();
var DEFAULT_AGENT_TITLES = /* @__PURE__ */ new Set(["\u65B0 Agent", "New Agent", ""]);
function stripNullFields(value, structuredContent = false) {
  if (value === null || value === void 0 || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== void 0).map((item) => stripNullFields(item, structuredContent));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (structuredContent && k === "value") {
      out[k] = v;
      continue;
    }
    if (v === null || v === void 0) continue;
    out[k] = k === "config" && "kind" in value && value.kind === "flow" ? v : stripNullFields(v, structuredContent || k === "snapshotContent");
  }
  return out;
}
function sanitizeDocumentForWire(doc) {
  return stripNullFields(structuredClone(doc));
}
function emptyDocument() {
  return {
    version: 1,
    id: "main",
    title: "FlowSpace",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { nativeChatTriggers: true, reducedMotion: false }
  };
}
var DEFAULT_DIMS = {
  agent: [312, 392],
  note: [276, 200],
  file: [300, 286],
  display: [300, 252],
  group: [1152, 474],
  board: [580, 380],
  detail: [340, 362],
  git: [380, 376],
  changes: [340, 318],
  terminal: [360, 300],
  role: [260, 336],
  flow: DEFAULT_FLOW_SIZE.full
};
function boardSummaryText(columns, selectedIds) {
  return formatBoardMarkdown(normalizeBoardColumns(columns), selectedIds);
}
function referenceTitle(node2, edge2) {
  if (node2?.kind === "board" && edge2.sourceItemKey !== void 0) {
    return findBoardCard(node2.columns ?? [], edge2.sourceItemKey)?.card.text || node2.title;
  }
  return edge2.snapshotTitle || node2?.title || edge2.source;
}
function deriveDraftTitle(prompt, fallback = "\u65B0 Agent") {
  const first = prompt.split(/\r?\n/).map((line) => line.replace(/^[#>*\-\s]+/, "").trim()).find(Boolean);
  if (!first) return fallback;
  return first.length > 36 ? `${first.slice(0, 36)}\u2026` : first;
}
function syncUntitledAgentNode(node2) {
  if (node2.kind !== "agent" || node2.customTitle) return false;
  if (!DEFAULT_AGENT_TITLES.has(node2.title.trim())) return false;
  const seed = node2.draft.trim() || node2.task.trim() || (node2.continuationPrompt ?? "").trim();
  if (!seed) return false;
  const derived = deriveDraftTitle(seed, node2.title || "\u65B0 Agent");
  if (derived && derived !== node2.title) {
    node2.title = derived;
    return true;
  }
  return false;
}
function syncUntitledAgentTitles(doc) {
  let changed = false;
  for (const node2 of doc.nodes) {
    if (syncUntitledAgentNode(node2)) changed = true;
  }
  return changed;
}
function newNode(kind, x, y, title, locale = "zh") {
  const [width, height] = DEFAULT_DIMS[kind] ?? [312, 260];
  const columns = kind === "board" ? defaultBoardWithExamples(locale) : void 0;
  const isCustomTitle = Boolean(title) && !(kind === "agent" && DEFAULT_AGENT_TITLES.has((title ?? "").trim()));
  return {
    id: uid(),
    kind,
    title: title ?? {
      agent: "\u65B0 Agent",
      note: "\u4FBF\u7B7E",
      file: "\u6587\u4EF6\u5F15\u7528",
      display: "\u5C55\u793A\u7ED3\u679C",
      group: "\u5DE5\u4F5C\u6D41",
      board: locale === "en" ? "Task board" : "\u4EFB\u52A1\u770B\u677F",
      detail: "\u6267\u884C\u8BE6\u60C5",
      git: "Git \u4ED3\u5E93",
      changes: "\u8F6E\u6B21\u6539\u52A8",
      terminal: "\u7EC8\u7AEF\u5FEB\u7167",
      role: "\u65B0\u5C97\u4F4D",
      flow: tFor(locale, "flow_node")
    }[kind],
    x,
    y,
    width,
    height,
    expanded: kind === "agent" || kind === "note" || kind === "display" || kind === "board" || kind === "detail" || kind === "git" || kind === "role" || kind === "flow",
    task: "",
    draft: "",
    nativeTrigger: "inherit",
    participation: "global",
    text: columns ? boardSummaryText(columns) : "",
    fixed: kind !== "detail",
    collapsed: false,
    ...isCustomTitle ? { customTitle: true } : {},
    ...kind === "agent" ? { tab: "task", rerun: "change" } : {},
    ...kind === "file" ? { items: [], selectedItems: [] } : {},
    ...kind === "git" ? { gitTab: "changes" } : {},
    ...kind === "group" ? { color: "blue", ports: [] } : {},
    ...columns ? { columns, selectedItems: [] } : {}
  };
}
function members(doc, groupId) {
  return doc.nodes.filter((n) => n.parentId === groupId).flatMap((n) => n.kind === "group" ? members(doc, n.id) : [n.id]);
}

// packages/flowspace/src/core/team.ts
var SLOT_ID = /^(?!lead$)[a-z][a-z0-9-]{0,31}$/;
function staffedIds(nodes) {
  return new Set(nodes.flatMap((node2) => node2.kind === "role" && node2.staffOf ? [node2.staffOf] : []));
}
var isTeamNode = (node2, staffed) => !!node2 && node2.kind === "agent" && (!!node2.teamRef || staffed.has(node2.id));
function teamIdOf(node2, staffed) {
  if (!node2 || !isTeamNode(node2, staffed)) return;
  return node2.teamRef?.teamId ?? canvasTeamId(node2.id);
}
var canvasTeamId = (nodeId) => `canvas-${nodeId}`;
function staffNodes(nodes, teamNodeId) {
  return nodes.filter((node2) => node2.kind === "role" && node2.staffOf === teamNodeId).sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));
}
function slotIdFor(title, taken) {
  const base = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[^a-z]+/, "").replace(/-+$/, "").slice(0, 24) || "member";
  let id = base;
  for (let index = 2; taken.has(id) || !SLOT_ID.test(id); index++) id = `${base}-${index}`;
  return id;
}

// packages/flowspace/src/core/graph.ts
function activeEdges(edges) {
  return edges.filter((e) => e.kind === "continuation" && e.trigger !== "off");
}
function reachable(roots, edges, nodes) {
  const pausedIds = nodes ? new Set(
    nodes.filter((n) => n.participation === "paused").map((n) => n.id)
  ) : /* @__PURE__ */ new Set();
  const validRoots = roots.filter((id) => !pausedIds.has(id));
  const found = new Set(validRoots);
  const links = activeEdges(edges);
  const visit = (id) => {
    for (const e of links) {
      if (e.source === id && !pausedIds.has(e.target) && !found.has(e.target)) {
        found.add(e.target);
        visit(e.target);
      }
    }
  };
  validRoots.forEach(visit);
  return [...found];
}
function ancestorsOf(targets, edges, nodes) {
  const pausedIds = nodes ? new Set(
    nodes.filter((n) => n.participation === "paused").map((n) => n.id)
  ) : /* @__PURE__ */ new Set();
  const validTargets = targets.filter((id) => !pausedIds.has(id));
  const found = new Set(validTargets);
  const links = activeEdges(edges);
  const visitBack = (id) => {
    for (const e of links) {
      if (e.target === id && !pausedIds.has(e.source) && !found.has(e.source)) {
        found.add(e.source);
        visitBack(e.source);
      }
    }
  };
  validTargets.forEach(visitBack);
  return [...found];
}
function hasEligibleUpstream(targetId, eligibleIds, bypassedIds, links) {
  const seen = /* @__PURE__ */ new Set([targetId]);
  const stack = [targetId];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of links) {
      if (e.target !== cur) continue;
      if (eligibleIds.has(e.source) && e.source !== targetId) return true;
      if (bypassedIds.has(e.source) && !seen.has(e.source)) {
        seen.add(e.source);
        stack.push(e.source);
      }
    }
  }
  return false;
}
function graphOrder(nodes, edges, roots) {
  const ids = /* @__PURE__ */ new Set([...roots, ...nodes.filter(isExecutable).map((n) => n.id)]);
  const links = activeEdges(edges).filter((edge2) => ids.has(edge2.source) && ids.has(edge2.target));
  const index = /* @__PURE__ */ new Map(), low = /* @__PURE__ */ new Map(), component = /* @__PURE__ */ new Map(), rank = /* @__PURE__ */ new Map(), cyclic = /* @__PURE__ */ new Set();
  const stack = [], onStack = /* @__PURE__ */ new Set();
  let tick = 0, comp = 0;
  const visit = (v) => {
    index.set(v, tick);
    low.set(v, tick++);
    rank.set(v, rank.size);
    stack.push(v);
    onStack.add(v);
    for (const e of links.filter((e2) => e2.source === v)) {
      if (!index.has(e.target)) {
        visit(e.target);
        low.set(v, Math.min(low.get(v), low.get(e.target)));
      } else if (onStack.has(e.target))
        low.set(v, Math.min(low.get(v), index.get(e.target)));
    }
    if (low.get(v) === index.get(v)) {
      const group = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        component.set(w, comp);
        group.push(w);
      } while (w !== v);
      if (group.length > 1 || links.some((e) => e.source === v && e.target === v))
        cyclic.add(comp);
      comp++;
    }
  };
  [...roots, ...ids].forEach((id) => {
    if (ids.has(id) && !index.has(id)) visit(id);
  });
  return { component, rank, cyclic };
}
function isFanoutMaster(graph, node2) {
  if (node2.masterOf) return true;
  if (node2.generatedBy || !node2.parentId) return false;
  const pair = graph.nodes.find((parent) => parent.id === node2.parentId)?.fanout;
  return !!pair && node2.id !== pair.fanId && node2.id !== pair.mergeId;
}
function canStartNode(doc, node2) {
  if (node2.generatedBy || isFanoutMaster(doc, node2)) return false;
  if (node2.kind === "agent") return true;
  if (node2.kind !== "flow" || !isExecutable(node2)) return false;
  if (node2.flowType === "flowspace/constant" || node2.flowType === "flowspace/random" || node2.flowType === "flowspace/assign" && node2.config?.inputValue === false) return true;
  if (node2.flowType !== "flowspace/fanout" && descriptorOf(node2.flowType)?.family !== "data") return false;
  return doc.edges.some((edge2) => edge2.kind === "reference" && edge2.target === node2.id);
}
function launchPlan(doc, request, busy, waiting) {
  const expandIds = (rawIds) => rawIds.flatMap(
    (id) => doc.nodes.find((n) => n.id === id)?.kind === "group" ? members(doc, id) : [id]
  );
  const explicitTargetIds = new Set(expandIds(request.nodeIds));
  const selected = request.kind === "global" ? doc.nodes.map((n) => n.id) : request.kind === "from-node" ? reachable([...explicitTargetIds], doc.edges, doc.nodes) : request.kind === "to-node" ? ancestorsOf([...explicitTargetIds], doc.edges, doc.nodes) : expandIds(request.nodeIds);
  const pool = doc.nodes.filter(
    (n) => selected.includes(n.id) && (canStartNode(doc, n) || explicitTargetIds.has(n.id) && ["single", "from-node", "to-node"].includes(request.kind) && isExecutable(n) && !n.generatedBy && !isFanoutMaster(doc, n))
  );
  const skipped = [];
  const bypassedIds = /* @__PURE__ */ new Set();
  const forceTargetSet = request.kind === "single" || request.kind === "from-node" ? explicitTargetIds : /* @__PURE__ */ new Set();
  const admitNode = (n, forceSelf) => {
    if (busy.has(n.id)) return "\u6B63\u5728\u8FD0\u884C";
    if (waiting.has(n.id)) return "\u7B49\u5F85\u786E\u8BA4";
    if (n.participation === "paused") return "\u6682\u505C\u53C2\u4E0E";
    if (n.participation === "bypassed") {
      bypassedIds.add(n.id);
      return "\u5DF2\u65C1\u8DEF\u900F\u4F20";
    }
    if (n.kind === "agent" && !n.draft.trim() && !n.task.trim() && !(n.continuationPrompt ?? "").trim()) {
      return "\u5C1A\u672A\u586B\u5199\u4EFB\u52A1";
    }
    if (!forceSelf && n.participation === "manual") return "\u4EC5\u624B\u52A8\u542F\u52A8";
    if (n.kind === "agent" && !forceSelf && !n.draft.trim() && n.lastSubmittedTask === n.task && n.rerun !== "always" && !(n.rerun === "update" && doc.edges.some(
      (e) => e.kind === "reference" && e.target === n.id && (!e.sentVersion || !!e.currentVersion && e.sentVersion !== e.currentVersion)
    ))) {
      return "\u6CA1\u6709\u65B0\u8F93\u5165";
    }
    return "";
  };
  const eligible = pool.filter((n) => {
    const why = admitNode(n, forceTargetSet.has(n.id));
    if (why) skipped.push({ nodeId: n.id, reason: why });
    return !why;
  });
  if (request.kind === "to-node" && eligible.length === 0) {
    for (const n of pool) {
      if (!explicitTargetIds.has(n.id)) continue;
      const why = admitNode(n, true);
      if (!why) {
        eligible.push(n);
        const idx = skipped.findIndex((s) => s.nodeId === n.id);
        if (idx >= 0) skipped.splice(idx, 1);
      }
    }
  }
  const ids = new Set(eligible.map((n) => n.id)), links = activeEdges(doc.edges).filter(
    (e) => selected.includes(e.source) && selected.includes(e.target)
  );
  const blocked = new Set(
    reachable(
      [...busy, ...waiting].filter((id) => selected.includes(id)),
      links,
      doc.nodes
    )
  );
  for (const n of eligible) {
    if (blocked.has(n.id)) {
      ids.delete(n.id);
      skipped.push({ nodeId: n.id, reason: "\u4E0A\u6E38\u4ECD\u5728\u8FD0\u884C\u6216\u7B49\u5F85\u786E\u8BA4" });
    }
  }
  const traversable = /* @__PURE__ */ new Set([...bypassedIds, ...doc.nodes.filter((n) => (n.kind === "flow" || n.generatedBy || isFanoutMaster(doc, n)) && isExecutable(n) && n.participation !== "paused").map((n) => n.id)]);
  const roots = [...ids].filter(
    (id) => request.kind === "single" || request.kind === "from-node" && explicitTargetIds.has(id) || !hasEligibleUpstream(id, ids, traversable, links)
  );
  let covered = new Set(reachable(roots, links, doc.nodes));
  for (const id of ids) {
    if (!covered.has(id)) {
      roots.push(id);
      covered = new Set(reachable(roots, links, doc.nodes));
    }
  }
  const later = [...covered].filter(
    (id) => !roots.includes(id) && selected.includes(id) && !bypassedIds.has(id)
  );
  const confirmTargets = /* @__PURE__ */ new Set();
  for (const e of links) {
    if (!covered.has(e.source) || bypassedIds.has(e.target)) continue;
    const targetNode = doc.nodes.find((n) => n.id === e.target);
    if (e.trigger === "confirm" || targetNode?.participation === "manual") {
      confirmTargets.add(e.target);
    }
  }
  return {
    roots,
    later,
    confirmation: [...confirmTargets],
    skipped: skipped.filter((s) => !later.includes(s.nodeId))
  };
}

// packages/flowspace/src/core/nodes/input.ts
function snapshotWithContent(node2, content, capturedAt = Date.now()) {
  return {
    id: crypto.randomUUID(),
    kind: content.dataType === "file" ? "file" : "text",
    sourceNodeId: node2.id,
    title: node2.title,
    text: textOfContent(content),
    content,
    capturedAt
  };
}
async function forwardInput(node2, step, contextText) {
  if (step.sources.length === 1) return step.sources[0];
  const text = contextText ? await contextText(step.sources) : step.sources.map((source) => source.text).join("\n\n");
  return snapshotWithContent(node2, { dataType: "text", value: text }, step.createdAt);
}

// packages/flowspace/src/core/connect.ts
function connectionPort(node2, role, direction, portId) {
  const id = portId ?? direction;
  if (role === "event") {
    if (direction === "out") return hasStatusPort(node2.kind, node2.flowType, !!node2.fanout) ? { id, role, direction, dataType: "signal" } : void 0;
    return connectionPort(node2, "continuation", "in", portId);
  }
  if (node2.kind === "flow")
    return portsOf(node2).find((port) => port.id === id && port.role === role && port.direction === direction);
  if (id !== direction || node2.kind === "role") return void 0;
  if (role === "continuation" && direction === "in" && isContainer(node2))
    return { id, role, direction, dataType: "text" };
  if ((direction === "in" || role === "continuation") && node2.kind !== "agent") return void 0;
  const dataType2 = node2.kind === "board" ? "list" : node2.kind === "file" ? "file" : "text";
  return { id, role, direction, dataType: dataType2 };
}
function structuredInput(target, portId) {
  const type = connectionPort(target, "continuation", "in", portId)?.dataType;
  return type === "list" || type === "record" ? type : void 0;
}
function canStreamTo(target, portId) {
  if (!structuredInput(target, portId)) return false;
  return descriptorOf(target.flowType)?.family === "data" || target.flowType === "flowspace/fanout" || target.flowType === "flowspace/merge-sort";
}
function mergeResultPort(config, portId) {
  if (portId && portId !== "out" && portId !== "pass") return portId;
  if (config?.sortMode && config.sortMode !== "off") return "pass";
  return portId === "pass" ? "out" : portId;
}
function connectionOutput(source, target, edge2) {
  const port = connectionPort(source, edge2.kind, "out", edge2.sourcePort);
  if (!port) return void 0;
  if (edge2.kind === "reference" && edge2.snapshotContent) return { ...port, dataType: edge2.snapshotContent.dataType };
  if (edge2.kind === "reference" && source.kind === "file" && (target.flowType === "flowspace/fanout" || descriptorOf(target.flowType)?.family === "data") && connectionPort(target, "reference", "in", edge2.targetPort)?.dataType === "list")
    return { ...port, dataType: "list" };
  if (edge2.kind === "reference" && source.kind === "board" && edge2.sourceItemKey !== void 0)
    return { ...port, dataType: "record" };
  if (edge2.kind === "continuation" && source.kind === "agent")
    return { ...port, dataType: structuredInput(target, edge2.targetPort) ?? port.dataType };
  return port;
}
function canConnect(connection) {
  const { source, target, kind, targetPort, sourceItemKey } = connection;
  if (!source || !target) return { ok: false, reason: "flow_missing_endpoint" };
  if (kind === "event") {
    if (!connectionPort(source, "event", "out", connection.sourcePort) || !connectionPort(target, "event", "in", targetPort) || target.kind !== "agent" && !isContainer(target) && !["flowspace/notice", "flowspace/parse", "flowspace/condition", "flowspace/code", "flowspace/ai-judge", "flowspace/human-choice"].includes(target.flowType ?? ""))
      return { ok: false, reason: "flow_evt_target" };
    if (connection.event?.mode === "continuous" && (target.kind === "agent" || target.flowType === "flowspace/ai-judge" || descriptorOf(target.flowType)?.capabilities.callsModel || target.config?.mode === "ai"))
      return { ok: false, reason: "flow_evt_model" };
    return { ok: true };
  }
  if ((connection.permission || connection.ask) && (kind !== "reference" || !isContainer(source) || target.kind !== "agent" || connection.snapshotContent))
    return { ok: false, reason: "flow_invalid_permission" };
  if (kind === "continuation" && isContainer(target) && connection.mode && connection.mode !== "conclusion")
    return { ok: false, reason: "flow_invalid_delivery" };
  if (connection.delivery && (kind !== "continuation" || !isContainer(target)))
    return { ok: false, reason: "flow_invalid_delivery" };
  if (source.kind === "role" || target.kind === "role") return { ok: false, reason: "flow_staff_only" };
  if (sourceItemKey !== void 0 && (kind !== "reference" || source.kind !== "board" || !findBoardCard(source.columns ?? [], sourceItemKey))) return { ok: false, reason: "flow_invalid_board_card" };
  const output = connectionOutput(source, target, connection);
  const input = connectionPort(target, kind, "in", targetPort);
  if (!output) return { ok: false, reason: "flow_invalid_output" };
  if (!input) return { ok: false, reason: "flow_invalid_input" };
  if (connection.mode === "fork" && (source.kind === "flow" || target.kind !== "agent" || target.sessionId || connection.edges?.some((edge2) => edge2.id !== connection.edgeId && edge2.target === target.id && edge2.mode === "fork")))
    return { ok: false, reason: "flow_invalid_fork" };
  if (output.dataType !== input.dataType) {
    if (kind === "reference") return { ok: true, convert: "text" };
    if (input.dataType !== "text") return { ok: false, reason: "flow_type_mismatch" };
  }
  return { ok: true };
}

// packages/flowspace/src/core/emission.ts
function emissionTargets(run, sourceId) {
  if (!run.graph.nodes.some((node2) => node2.id === sourceId && node2.kind === "agent")) return [];
  const targets = [];
  for (const edge2 of run.graph.edges) {
    if (edge2.source !== sourceId || edge2.kind !== "continuation" || edge2.trigger === "off") continue;
    const node2 = run.graph.nodes.find((candidate) => candidate.id === edge2.target);
    if (!node2 || node2.participation === "paused") continue;
    const type = structuredInput(node2, edge2.targetPort);
    if (type) targets.push({ edge: edge2, node: node2, type });
  }
  return targets;
}
function checkEmissionValues(targets, values) {
  if (targets.some((target) => target.type === "record") && values.some((value) => value === null || typeof value !== "object" || Array.isArray(value))) {
    throw new Error("\u8BB0\u5F55\u5165\u53E3\u9700\u8981\u6BCF\u4E2A\u6761\u76EE\u90FD\u662F JSON \u5BF9\u8C61");
  }
}
function parseEmission(text) {
  const items = [];
  let fence;
  for (const line of text.split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1].startsWith(fence.marker) && !marker[2].trim()) {
        if (fence.json) {
          try {
            const value = JSON.parse(fence.lines.join("\n"));
            if (Array.isArray(value)) return value;
            if (value && typeof value === "object") return [value];
          } catch {
          }
        }
        fence = void 0;
      } else if (fence.json) fence.lines.push(line);
    } else if (marker) {
      fence = { marker: marker[1], json: /^(?:json)?$/i.test(marker[2].trim()), lines: [] };
    } else {
      const item = /^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$/.exec(line)?.[1].trim();
      if (item) items.push(item);
    }
  }
  if (items.length) return items;
  throw new Error("\u672A\u6536\u5230 flow_emit \u8F93\u51FA\uFF0C\u7ED3\u8BBA\u4E2D\u4E5F\u6CA1\u6709\u53EF\u7528\u7684 Markdown \u5217\u8868\u6216 JSON \u4EE3\u7801\u5757");
}

// packages/flowspace/src/client/geometry.ts
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var BOARD_MIN_SIZE = [320, 280];
var COMPACT_SIZE = {
  agent: [280, 118],
  note: [276, 98],
  file: [256, 82],
  display: [280, 126],
  board: [280, 112],
  detail: [280, 112],
  group: [312, 152],
  git: [280, 108],
  changes: [276, 104],
  terminal: [280, 108],
  role: [252, 96],
  flow: DEFAULT_FLOW_SIZE.compact
};
var FULL_SIZE = {
  agent: [312, 392],
  note: [276, 200],
  file: [300, 286],
  display: [300, 252],
  board: [580, 380],
  detail: [340, 362],
  group: [1152, 474],
  git: [420, 410],
  changes: [360, 340],
  terminal: [380, 320],
  role: [260, 336],
  flow: DEFAULT_FLOW_SIZE.full
};
function isCompactNode(node2, lod = false, keepExpanded = false) {
  if (node2.kind === "group") return node2.collapsed;
  if (!node2.expanded) return true;
  if (lod && !node2.pinned && !keepExpanded) return true;
  return false;
}
var judgeTypes = /* @__PURE__ */ new Set([...judges.map((judge) => judge.flowType), "flowspace/merge-sort"]);
var rowHeight = 32;
var branchTop = (_node) => 1 + 48 + 48;
function judgeHeight(node2, minHeight) {
  const rows = portsOf(node2).filter((port) => port.direction === "out").length;
  return clamp(Math.max(node2.height ?? 0, branchTop(node2) + rows * rowHeight + 13), minHeight, 480);
}
function dataCardHeight(node2, lines2, notes, button) {
  const ports2 = portsOf(node2).filter((port) => port.direction === "out").length;
  const blocks = Number(lines2 > 0) + notes + Number(button);
  const preview = (lines2 ? Math.min(6, lines2) * 16 + 18 : 0) + notes * 16 + (button ? 28 : 0) + blocks * 4;
  return clamp(Math.max(node2.height, branchTop(node2) + ports2 * rowHeight + 12 + preview), 200, 480);
}
function nodeBox(node2, lod = false, keepExpanded = false, previewHeight) {
  if (node2.kind === "group") return groupBox(node2);
  const compact = isCompactNode(node2, lod, keepExpanded);
  const flowSize = node2.kind === "flow" ? sizeOf(node2, compact) : void 0;
  if (compact) {
    const [cw, ch] = flowSize ?? COMPACT_SIZE[node2.kind] ?? [280, 110];
    return { x: node2.x, y: node2.y, w: cw, h: ch, compact: true };
  }
  const [fw, fh] = flowSize ?? FULL_SIZE[node2.kind] ?? [320, 280];
  const inLiveChat = node2.kind === "agent" && Boolean(node2.sessionId) && (node2.tab ?? "task") === "conversation";
  const minW = inLiveChat ? 420 : node2.kind === "board" ? BOARD_MIN_SIZE[0] : fw;
  const minH = inLiveChat ? 490 : node2.kind === "board" ? BOARD_MIN_SIZE[1] : fh;
  const data = node2.kind === "flow" && descriptorOf(node2.flowType)?.family === "data";
  const dataHeight = data ? previewHeight ?? dataCardHeight(node2, 6, 1, dataMode(node2) === "ai") : 0;
  return {
    x: node2.x,
    y: node2.y,
    w: Math.max(node2.width || fw, minW),
    h: data || previewHeight !== void 0 ? clamp(Math.max(node2.height || fh, dataHeight, previewHeight ?? 0), minH, 480) : node2.flowType && judgeTypes.has(node2.flowType) ? judgeHeight(node2, minH) : Math.max(node2.height || fh, minH),
    compact: false
  };
}
function groupBox(group, portRows = 2, context) {
  if (group.collapsed) {
    return {
      x: group.x,
      y: group.y,
      w: 312,
      h: 96 + Math.max(1, portRows) * 28,
      compact: true
    };
  }
  const baseW = Math.max(260, group.width || 850);
  const baseH = Math.max(180, group.height || 474);
  if (!context?.doc) {
    return {
      x: group.x,
      y: group.y,
      w: baseW,
      h: baseH,
      compact: false
    };
  }
  return expandedGroupBox(
    context.doc,
    group,
    context.lod ?? false,
    context.keepExpandedIds
  );
}
function expandedGroupBox(doc, group, lod = false, keepExpandedIds) {
  if (group.collapsed) {
    const ports2 = inferGroupPorts(doc, group).filter((p) => !p.hidden);
    const rows = Math.max(
      ports2.filter((p) => p.direction === "in").length,
      ports2.filter((p) => p.direction === "out").length
    );
    return groupBox(group, rows);
  }
  const baseW = Math.max(260, group.width || 850);
  const baseH = Math.max(180, group.height || 474);
  const directChildren = doc.nodes.filter((n) => n.parentId === group.id);
  if (!directChildren.length) {
    return { x: group.x, y: group.y, w: baseW, h: baseH, compact: false };
  }
  const childBoxes = directChildren.map(
    (child) => child.kind === "group" ? expandedGroupBox(doc, child, lod, keepExpandedIds) : nodeBox(
      child,
      lod,
      Boolean(child.pinned) || Boolean(keepExpandedIds?.has(child.id))
    )
  );
  const maxRight = Math.max(...childBoxes.map((b) => b.x + b.w));
  const maxBottom = Math.max(...childBoxes.map((b) => b.y + b.h));
  const pad = 24;
  return {
    x: group.x,
    y: group.y,
    w: Math.max(baseW, maxRight - group.x + pad),
    h: Math.max(
      lod ? 180 : baseH,
      maxBottom - group.y + pad
    ),
    compact: false
  };
}
function inferGroupPorts(doc, group) {
  const inside = new Set(members(doc, group.id));
  const inferred = [];
  for (const kind of ["reference", "continuation"]) {
    for (const direction of ["in", "out"]) {
      const matching = doc.edges.filter(
        (e) => e.kind === kind && (direction === "in" ? inside.has(e.target) && !inside.has(e.source) : inside.has(e.source) && !inside.has(e.target))
      );
      for (const edge2 of matching) {
        const nodeId = direction === "in" ? edge2.target : edge2.source;
        const portId = direction === "in" ? edge2.targetPort : edge2.sourcePort;
        const targetNode = doc.nodes.find((n) => n.id === nodeId);
        if (!targetNode) continue;
        if (!inferred.some(
          (p) => p.kind === kind && p.direction === direction && (p.portId ?? direction) === (portId ?? direction) && p.nodes.includes(nodeId)
        )) {
          const port = portId && portsOf(targetNode).find((item) => item.id === portId);
          inferred.push({
            id: `${kind}-${direction}-${nodeId}${portId && portId !== direction ? "-" + portId : ""}`,
            ...portId ? { portId } : {},
            kind,
            direction,
            name: port ? `${targetNode.title} \xB7 ${port.label ?? t(port.labelKey ?? port.id)}` : targetNode.title,
            nodes: [nodeId],
            hidden: false
          });
        }
      }
    }
  }
  if (group.fanout) {
    const fan = doc.nodes.find((node2) => node2.id === group.fanout.fanId);
    const merge = doc.nodes.find((node2) => node2.id === group.fanout.mergeId);
    const boundary = [fan, merge].flatMap((node2) => !node2 ? [] : portsOf(node2).filter((port) => port.role !== "event" && port.direction === (node2 === fan ? "in" : "out")).map((port) => ({
      id: `${node2.id}:${port.role}:${port.id}`,
      kind: port.role,
      direction: port.direction,
      portId: port.id,
      name: port.label ?? (port.labelKey ? t(port.labelKey) : node2.title),
      nodes: [node2.id],
      hidden: false
    })));
    const realExternal = inferred.filter((port) => port.nodes.every((id) => {
      const node2 = doc.nodes.find((candidate) => candidate.id === id);
      return node2 && !node2.generatedBy && node2 !== fan && node2 !== merge;
    }));
    const valid = [...boundary, ...realExternal];
    const matches2 = (a, b) => a.kind === b.kind && a.direction === b.direction && (a.portId ?? a.direction) === (b.portId ?? b.direction) && b.nodes.every((id) => a.nodes.includes(id));
    const customized2 = (group.ports ?? []).filter((port) => valid.some((real) => matches2(port, real)));
    return [...customized2, ...valid.filter((port) => !customized2.some((custom) => matches2(custom, port)))];
  }
  const agents = doc.nodes.filter(
    (n) => n.kind === "agent" && inside.has(n.id)
  );
  if (agents.length && !inferred.some((p) => p.kind === "continuation" && p.direction === "in")) {
    const roots = agents.filter(
      (n) => !doc.edges.some(
        (e) => e.kind === "continuation" && e.target === n.id && inside.has(e.source) && e.trigger !== "off"
      )
    );
    for (const n of roots.length ? roots : [agents[0]]) {
      inferred.push({
        id: `continuation-in-${n.id}`,
        kind: "continuation",
        direction: "in",
        name: n.title,
        nodes: [n.id],
        hidden: false
      });
    }
  }
  if (agents.length && !inferred.some((p) => p.kind === "continuation" && p.direction === "out")) {
    const leaves = agents.filter(
      (n) => !doc.edges.some(
        (e) => e.kind === "continuation" && e.source === n.id && inside.has(e.target) && e.trigger !== "off"
      )
    );
    for (const n of leaves.length ? leaves : [agents[agents.length - 1]]) {
      inferred.push({
        id: `continuation-out-${n.id}`,
        kind: "continuation",
        direction: "out",
        name: n.title,
        nodes: [n.id],
        hidden: false
      });
    }
  }
  const customized = group.ports ?? [];
  const mergedKeys = new Set(
    customized.filter((p) => p.nodes.length > 1).flatMap((p) => p.nodes.map((id) => `${p.kind}-${p.direction}-${id}`))
  );
  return [
    ...customized,
    ...inferred.filter(
      (p) => !customized.some(
        (c) => c.id === p.id || c.kind === p.kind && c.direction === p.direction && (c.portId ?? c.direction) === (p.portId ?? p.direction) && p.nodes.every((id) => c.nodes.includes(id))
      ) && !mergedKeys.has(p.id)
    )
  ];
}
function bezier(x1, y1, x2, y2) {
  return (x) => {
    let lo = 0, hi = 1, t2 = x;
    const val = (a, b, u) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
    for (let i = 0; i < 16; i++) {
      const v = val(x1, x2, t2);
      if (v < x) lo = t2;
      else hi = t2;
      t2 = (lo + hi) / 2;
    }
    return val(y1, y2, t2);
  };
}
var easeView = bezier(0.32, 0.72, 0, 1);

// packages/flowspace/src/core/nodes/data/index.ts
var asText = (value) => typeof value === "string" ? value : JSON.stringify(value);
function itemValue(item) {
  if (item.value === void 0) throw new Error("\u8BF7\u4ECE spill \u8BFB\u53D6\u5B8C\u6574\u6761\u76EE\u540E\u518D\u6267\u884C\u53D8\u6362");
  return item.value;
}
function sourceValue(source) {
  const content = contentOf(source);
  if (content.spill) throw new Error("\u8BF7\u4ECE spill \u8BFB\u53D6\u5B8C\u6574\u5185\u5BB9\u540E\u518D\u6267\u884C\u53D8\u6362");
  if (content.items) return content.items.map(itemValue);
  return content.value === void 0 ? source.text : content.value;
}
function dataText(inputs) {
  return inputs.map(({ source }) => {
    if (source.textSpill) throw new Error("\u8BF7\u4ECE spill \u8BFB\u53D6\u5B8C\u6574\u6587\u672C\u540E\u518D\u6267\u884C\u53D8\u6362");
    return source.text || (source.content ? textOfContent(source.content) : "");
  }).join("\n");
}
function concatenate(parts, limit) {
  const retained = [];
  let total = 0;
  for (const part of parts) {
    const entries = part.items ?? [];
    total += part.originalCount ?? entries.length;
    for (const entry of entries.slice(0, limit - retained.length)) retained.push(entry);
  }
  const originalKeys = new Set(retained.map((item) => item.key));
  const seen = /* @__PURE__ */ new Set(), occurrences = /* @__PURE__ */ new Map();
  const items = retained.map((item) => {
    if (!seen.has(item.key)) {
      seen.add(item.key);
      return item;
    }
    let number = occurrences.get(item.key) ?? 1;
    let key;
    do {
      key = "repeat:" + JSON.stringify([item.key, ++number]);
    } while (originalKeys.has(key) || seen.has(key));
    occurrences.set(item.key, number);
    seen.add(key);
    return { ...item, key };
  });
  return { dataType: "list", items, ...total > items.length ? { originalCount: total } : {} };
}
function dataItems(inputs, limit = DEFAULT_LIST_LIMIT) {
  const parts = inputs.map(({ source }) => {
    const content = contentOf(source);
    if (content.dataType === "list") return content;
    if (content.spill) return { dataType: "list", items: [{ key: content.spill.locator, spill: content.spill }] };
    if (content.dataType === "file" && Array.isArray(content.value)) {
      const result = contentList(content.value, limit, content.value.map((value) => typeof value === "string" ? value : void 0));
      if (content.originalCount !== void 0) result.originalCount = content.originalCount;
      return result;
    }
    if (content.value === void 0 && content.dataType === "signal") return { dataType: "list", items: [] };
    return contentList([sourceValue(source)], limit);
  });
  return concatenate(parts, limit);
}
function formatTemplate(template2, fields, item) {
  const names = [...fields.keys()].sort((a, b) => b.length - a.length);
  return template2.replace(/\{\{([^{}]+)\}\}/g, (_token, field) => {
    const key = field.trim();
    if (fields.has(key)) return asText(fields.get(key));
    const name = names.find((name2) => key.startsWith(name2 + ".") || key.startsWith(name2 + "["));
    const root = name === void 0 ? item : fields.get(name);
    if (root === void 0) return "";
    return pathValues(root, name === void 0 ? key : key.slice(name.length)).map(asText).join(", ");
  });
}
function formatItem(template2, item, index) {
  const value = itemValue(item);
  return formatTemplate(template2, /* @__PURE__ */ new Map([
    ["item", value],
    ["key", item.key],
    ["index", index],
    ["n", index + 1]
  ]), value);
}
function namedText(config, inputs) {
  const values = /* @__PURE__ */ new Map();
  for (const input of inputs) {
    const prior = values.get(input.port);
    if (prior) prior.push(sourceValue(input.source));
    else values.set(input.port, [sourceValue(input.source)]);
  }
  const fields = /* @__PURE__ */ new Map();
  for (const name of config.inputs) {
    const input = values.get(name) ?? [];
    fields.set(name, input.length === 1 ? input[0] : input.length ? input : "");
  }
  return formatTemplate(String(config.template), fields);
}
function ruleMatches(config, item) {
  const selection = config.condition;
  return conditionRoute({ branches: [{ ...selection, id: "pass", label: "pass" }] }, asText(itemValue(item))) === "pass";
}
function compare(a, b) {
  if (a === b) return 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  const ranks = ["boolean", "number", "string", "object"];
  const rank = ranks.indexOf(typeof a) - ranks.indexOf(typeof b);
  if (rank) return rank;
  const left = typeof a === "string" ? a : canonicalJson(a);
  const right = typeof b === "string" ? b : canonicalJson(b);
  return left < right ? -1 : left > right ? 1 : 0;
}
function sorted(list, config) {
  const entries = list.items.map((item) => ({ item, key: config.mode === "rule" ? Number(!ruleMatches(config, item)) : pathValues(itemValue(item), String(config.path))[0] }));
  entries.sort(({ key: a }, { key: b }) => {
    if (a == null || b == null) return Number(a == null) - Number(b == null);
    return (config.order === "desc" ? -1 : 1) * compare(a, b);
  });
  return { ...list, items: entries.map((entry) => entry.item) };
}
function normalizeText(text) {
  return text.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}
function transformData(node2, inputs, limit = DEFAULT_LIST_LIMIT, previous) {
  const config = node2.config ?? {};
  if (dataMode(node2) !== "rule") throw new Error("\u4EE3\u7801\u6216 AI \u53D8\u6362\u9700\u8981\u7531 Host \u8BD5\u8FD0\u884C");
  switch (node2.flowType) {
    case "flowspace/constant":
      return config.mode === "list" ? contentList(constantValues(String(config.value)), limit) : { dataType: "text", value: config.value };
    case "flowspace/template":
      return { dataType: "text", value: namedText(config, inputs) };
    case "flowspace/split":
      return contentList(splitValues(config, dataText(inputs)), limit);
    case "flowspace/extract":
      if (config.mode === "json-path" && inputs.length === 1 && inputs[0].source.content && inputs[0].source.content.dataType !== "text") {
        return contentList(pathValues(sourceValue(inputs[0].source), String(config.path)), limit);
      }
      return contentList(extractValues(config, dataText(inputs)), limit);
    case "flowspace/parse":
      return contentList(parseValues(config, dataText(inputs)), limit);
  }
  const list = dataItems(inputs, limit);
  const items = list.items;
  switch (node2.flowType) {
    case "flowspace/join": {
      const lines2 = items.map((item, index) => {
        if (config.mode === "template") return formatItem(String(config.template), item, index);
        const text = asText(itemValue(item));
        return config.mode === "numbered" ? `${index + 1}. ${text}` : text;
      });
      return {
        dataType: "text",
        value: lines2.join(config.mode === "numbered" ? "\n" : String(config.delimiter)),
        ...list.originalCount === void 0 ? {} : { originalCount: list.originalCount }
      };
    }
    case "flowspace/map":
      return { ...list, items: items.map((item, index) => ({ key: item.key, value: formatItem(String(config.template), item, index) })) };
    case "flowspace/filter":
      return { ...list, items: items.filter((item) => ruleMatches(config, item)) };
    case "flowspace/sort":
      return sorted(list, config);
    case "flowspace/dedupe": {
      const seen = /* @__PURE__ */ new Set();
      return { ...list, items: items.filter((item) => {
        const key = canonicalJson(itemValue(item), config.mode === "normalized" ? normalizeText : void 0);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }) };
    }
    case "flowspace/accumulate":
      return previous ? concatenate([previous, list], limit) : list;
    default:
      throw new Error(`\u672A\u77E5\u7684\u6570\u636E\u53D8\u6362\uFF1A${node2.flowType}`);
  }
}

// packages/flowspace/src/core/nodes/data/preview.ts
var dataTypes = new Set(dataDescriptors.map((descriptor) => descriptor.flowType));
var dynamic = { state: "dynamic" };
var ready = (content) => ({ state: "ready", content });
var blockerRank = {
  dynamic: 5,
  error: 4,
  "needs-ai": 3,
  "needs-code": 2,
  "needs-file": 1,
  "needs-spill": 1
};
function snapshot(node2, edge2, content, text = textOfContent(content)) {
  return {
    id: edge2.id,
    sourceNodeId: node2.id,
    title: edge2.snapshotTitle ?? node2.title,
    capturedAt: 0,
    kind: content.dataType === "file" ? "file" : "text",
    text,
    content
  };
}
function fromSnapshot(edgeId, source) {
  return source.textSpill || source.content?.spill || source.content?.items?.some((item) => item.spill) ? { state: "needs-spill", edgeId, source } : { state: "ready", source };
}
function createStaticResolver(doc, overrides = {}, sourceVersions = {}) {
  const nodes = new Map(doc.nodes.map((node2) => [node2.id, node2]));
  const edges = new Map(doc.edges.map((edge3) => [edge3.id, edge3]));
  const incoming = /* @__PURE__ */ new Map();
  for (const attached of [false, true]) for (const edge3 of doc.edges) {
    if (edge3.generatedBy || (edge3.kind === "reference" || edge3.trigger === "off") !== attached) continue;
    if (edge3.kind === "continuation" && edge3.trigger === "off" && nodes.get(edge3.target)?.flowType === "flowspace/fanout") continue;
    const list = incoming.get(edge3.target);
    if (list) list.push(edge3);
    else incoming.set(edge3.target, [edge3]);
  }
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  const cached = /* @__PURE__ */ new Map(), visiting = /* @__PURE__ */ new Set();
  const fingerprints = /* @__PURE__ */ new Map(), signing = /* @__PURE__ */ new Set();
  function edgeInput(edge3) {
    const override = overrides.edges?.get(edge3.id);
    if (override) return fromSnapshot(edge3.id, override);
    const source = nodes.get(edge3.source), target = nodes.get(edge3.target);
    if (!source || !target) return dynamic;
    if (edge3.snapshotContent) return fromSnapshot(edge3.id, snapshot(source, edge3, edge3.snapshotContent, edge3.snapshotText));
    if (source.kind === "board" && (edge3.sourceItemKey !== void 0 || !edge3.snapshotText)) {
      const ref = resolveBoardReference(source, edge3.sourceItemKey, limit);
      if (ref.missing) return dynamic;
      const content = boardContent(source, edge3.sourceItemKey, limit) ?? { dataType: "text", value: ref.text };
      return { state: "ready", source: {
        ...snapshot(source, edge3, content, ref.text),
        title: ref.title,
        referenceKind: edge3.sourceItemKey === void 0 ? "board" : "board-card"
      } };
    }
    if (edge3.snapshotText !== void 0 && edge3.snapshotText !== "")
      return fromSnapshot(edge3.id, snapshot(source, edge3, { dataType: "text", value: edge3.snapshotText }));
    if (source.kind === "file") {
      const paths2 = selectedFileContent(source, limit);
      const textInput = connectionPort(target, edge3.kind, "in", edge3.targetPort)?.dataType === "text";
      if (textInput && paths2.items?.length) return { state: "needs-file", edgeId: edge3.id, sourceId: source.id, targetId: target.id };
      const content = textInput ? { dataType: "text", value: "" } : paths2;
      return { state: "ready", source: { ...snapshot(source, edge3, content), referenceKind: "file" } };
    }
    if (edge3.sourcePort && edge3.sourcePort !== "out" || source.participation === "paused" || source.participation === "bypassed")
      return dynamic;
    const result = output(source.id);
    return result.state === "ready" ? fromSnapshot(edge3.id, snapshot(source, edge3, result.content)) : result;
  }
  function inputs(nodeId) {
    const attached = incoming.get(nodeId) ?? [];
    if (!attached.length) return nodes.get(nodeId)?.flowType === "flowspace/constant" ? { state: "ready", inputs: [] } : dynamic;
    const values = [];
    let pending2;
    for (const edge3 of attached) {
      const result = edgeInput(edge3);
      if (result.state === "ready") values.push({ port: edge3.targetPort ?? "in", source: result.source });
      else if (!pending2 || blockerRank[result.state] > blockerRank[pending2.state]) pending2 = result;
    }
    return pending2 ?? { state: "ready", inputs: values };
  }
  function output(nodeId) {
    const override = overrides.nodes?.get(nodeId);
    if (override) return ready(override);
    const known = cached.get(nodeId);
    if (known) return known;
    const node2 = nodes.get(nodeId);
    if (!node2 || visiting.has(nodeId)) return dynamic;
    visiting.add(nodeId);
    let result;
    try {
      if (node2.kind === "note" || (node2.kind === "display" || node2.kind === "detail") && (node2.fixed || node2.pinned)) {
        result = ready({ dataType: "text", value: node2.text });
      } else if (node2.kind === "board") {
        result = ready(boardContent(node2, void 0, limit) ?? { dataType: "text", value: node2.text });
      } else if (node2.kind === "file") result = ready(selectedFileContent(node2, limit));
      else if (!dataTypes.has(node2.flowType ?? "")) result = dynamic;
      else if (node2.flowType === "flowspace/constant") result = ready(transformData(node2, [], limit));
      else {
        const sources = inputs(node2.id);
        if (sources.state !== "ready") result = sources;
        else {
          const mode2 = dataMode(node2);
          result = mode2 === "rule" ? ready(transformData(node2, sources.inputs, limit)) : { state: mode2 === "ai" ? "needs-ai" : "needs-code", nodeId, inputs: sources.inputs };
        }
      }
    } catch (error) {
      result = { state: "error", message: error instanceof Error ? error.message : String(error) };
    } finally {
      visiting.delete(nodeId);
    }
    cached.set(nodeId, result);
    return result;
  }
  function edge2(edgeId) {
    const link = edges.get(edgeId);
    if (!link) return dynamic;
    const result = edgeInput(link);
    return result.state === "ready" ? ready(contentOf(result.source)) : result;
  }
  function signature(nodeId) {
    const cached2 = fingerprints.get(nodeId);
    if (cached2) return cached2;
    const node2 = nodes.get(nodeId);
    if (!node2 || signing.has(nodeId)) return nodeId;
    signing.add(nodeId);
    const semantics = [
      limit,
      node2.id,
      node2.kind,
      node2.title,
      node2.participation,
      node2.flowType,
      node2.config,
      node2.text,
      node2.fixed,
      node2.pinned,
      node2.columns,
      node2.selectedItems,
      node2.boardSettings?.refScope,
      ...node2.kind === "file" ? [node2.worktreePath ?? node2.cwd, sourceVersions[nodeId]] : []
    ];
    const dependencies = (incoming.get(nodeId) ?? []).map((edge3) => {
      const source = nodes.get(edge3.source);
      const value = edge3.snapshotContent ?? (source?.kind === "board" && edge3.sourceItemKey !== void 0 ? boardContent(source, edge3.sourceItemKey, limit) : edge3.snapshotText || signature(edge3.source));
      return [
        edge3.id,
        edge3.kind,
        edge3.sourcePort,
        edge3.targetPort,
        edge3.trigger,
        edge3.sourceItemKey,
        edge3.snapshotTitle,
        value,
        edge3.snapshotContent ? edge3.snapshotText : void 0
      ];
    });
    signing.delete(nodeId);
    const key = hashContentText(JSON.stringify([semantics, dependencies]));
    fingerprints.set(nodeId, key);
    return key;
  }
  return { output, inputs, edge: edge2, signature };
}
var rowText = (value) => typeof value === "string" ? value : JSON.stringify(value);
var singleLine2 = (text) => text.replace(/\r\n?|\n/g, "\\n");
function previewLines(content) {
  let rows, count;
  if (content.items) {
    count = content.items.length;
    rows = content.items.slice(0, 6).map((item) => singleLine2(item.spill?.preview ?? rowText(item.value ?? null)));
  } else if (content.dataType === "file" && Array.isArray(content.value)) {
    count = content.value.length;
    rows = content.value.slice(0, 6).map((value) => singleLine2(rowText(value)));
  } else {
    const text = content.spill?.preview ?? (content.value === void 0 ? "" : typeof content.value === "string" ? content.value : JSON.stringify(content.value, null, 2));
    const lines2 = text ? text.split(/\r\n?|\n/) : [];
    if (lines2.at(-1) === "") lines2.pop();
    count = lines2.length;
    rows = lines2.slice(0, 6);
  }
  return {
    lines: rows.map((row) => row.length > 512 ? row.slice(0, 511) + "\u2026" : row),
    count,
    remaining: count - rows.length,
    ...content.originalCount === void 0 ? {} : { originalCount: content.originalCount }
  };
}

// packages/flowspace/src/core/fanout.ts
function laneTitle(group, node2) {
  if (!group || node2.laneIndex === void 0) return void 0;
  return `${group.title} #${node2.laneIndex + 1} \xB7 ${node2.itemTitle || node2.title}`;
}
function fanoutPair(graph, fanId) {
  const group = graph.nodes.find((node2) => node2.fanout?.fanId === fanId);
  const fan = graph.nodes.find((node2) => node2.id === fanId);
  const merge = group?.fanout && graph.nodes.find((node2) => node2.id === group.fanout.mergeId);
  return group && fan && merge ? { group, fan, merge } : void 0;
}
function lines(text) {
  return text.split(/\r?\n/).map((line) => line.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, "")).filter(Boolean);
}
function staticFanoutContent(doc, fanId, overrides) {
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  const connected = doc.edges.filter((edge2) => edge2.target === fanId && !edge2.generatedBy && (edge2.kind === "reference" || edge2.trigger !== "off"));
  const references = connected.filter((edge2) => edge2.kind === "reference");
  const incoming = [...connected.filter((edge2) => edge2.kind === "continuation"), ...references];
  if (!incoming.length) return void 0;
  let resolver;
  const lists = [];
  for (const edge2 of incoming) {
    const source = doc.nodes.find((node2) => node2.id === edge2.source);
    if (!source) return void 0;
    const resolved = overrides?.edges?.get(edge2.id);
    let content = resolved ? contentOf(resolved) : edge2.snapshotContent;
    if (!content) {
      if (source.kind === "board") content = boardContent(source, edge2.sourceItemKey, limit);
      else if (source.kind === "file") {
        content = selectedFileContent(source, limit);
      } else if (source.kind === "note" || source.kind === "display" && source.fixed) {
        content = contentList(lines(edge2.snapshotText ?? source.text), limit);
      } else if (source.kind === "flow") {
        resolver ??= createStaticResolver(doc, overrides);
        const result = resolver.edge(edge2.id);
        if (result.state !== "ready") return void 0;
        content = result.content;
      } else return void 0;
    }
    if (!content) return void 0;
    if (content.dataType !== "list") {
      if (content.value === void 0) return void 0;
      const values = content.dataType === "text" ? lines(String(content.value)) : content.dataType === "file" && Array.isArray(content.value) ? content.value : [content.value];
      content = contentList(values, limit, edge2.sourceItemKey ? [edge2.sourceItemKey] : void 0);
    }
    lists.push(content);
  }
  const items = [];
  const keys = /* @__PURE__ */ new Set();
  let total = 0;
  for (const [index, list] of lists.entries()) {
    const sourceItems = list.items ?? [];
    total += list.originalCount ?? sourceItems.length;
    for (const item of sourceItems.slice(0, limit - items.length)) {
      const edge2 = incoming[index];
      const sourceKey = edge2.kind === "reference" && references.length > 1 ? JSON.stringify([edge2.id, item.key]) : item.key;
      let key = sourceKey;
      for (let occurrence = 2; keys.has(key); occurrence++) key = `${sourceKey}#${occurrence}`;
      keys.add(key);
      items.push(key === item.key ? item : { ...item, key });
    }
  }
  return { dataType: "list", items, ...total > items.length ? { originalCount: total } : {} };
}
function itemTitle(item) {
  const value = item.value;
  const record = typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
  const named = record && [record.title, record.text, record.name, record.path].find((field) => typeof field === "string");
  const text = typeof named === "string" ? named : typeof value === "string" ? value : item.spill?.preview ?? JSON.stringify(value) ?? item.key;
  return text.trim().split(/\r?\n/, 1)[0].slice(0, 100) || item.key;
}
function generatedId(kind, fanId, key, masterId) {
  return `lane-${kind}:${encodeURIComponent(JSON.stringify([fanId, key, masterId]))}`;
}
function masterGraph(graph, group, fan, merge) {
  const children = new Set(graph.nodes.filter((node2) => node2.parentId === group.id && !node2.generatedBy).map((node2) => node2.id));
  const interior = graph.edges.filter((edge2) => !edge2.generatedBy && edge2.kind === "continuation" && children.has(edge2.source) && children.has(edge2.target) && edge2.source !== merge.id && edge2.target !== fan.id);
  function reachable2(start, upstream) {
    const seen = /* @__PURE__ */ new Set([start]), queue = [start];
    for (let i = 0; i < queue.length; i++) {
      for (const edge2 of interior) {
        if ((upstream ? edge2.target : edge2.source) !== queue[i]) continue;
        const next = upstream ? edge2.source : edge2.target;
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return seen;
  }
  const from = reachable2(fan.id, false), to = reachable2(merge.id, true);
  const nodes = graph.nodes.filter((node2) => children.has(node2.id) && node2.id !== fan.id && node2.id !== merge.id && (node2.masterOf === fan.id || from.has(node2.id) && to.has(node2.id) || node2.staffOf && from.has(node2.staffOf) && to.has(node2.staffOf)));
  const ids = new Set(nodes.map((node2) => node2.id));
  const edges = graph.edges.filter((edge2) => !edge2.generatedBy && (ids.has(edge2.target) && (ids.has(edge2.source) || edge2.source === fan.id || edge2.kind === "reference") || ids.has(edge2.source) && edge2.target === merge.id));
  return { nodes, edges };
}
function cloneMaster(master, fanId, key, title, index, dy, ids, prior) {
  const copy = structuredClone(master);
  delete copy.masterOf;
  delete copy.templateSlotId;
  delete copy.sessionId;
  delete copy.lastSubmittedTask;
  delete copy.window;
  delete copy.nudge;
  copy.id = ids.get(master.id);
  copy.generatedBy = fanId;
  copy.masterNodeId = master.id;
  copy.itemKey = key;
  copy.itemTitle = title;
  copy.laneIndex = index;
  copy.y += dy;
  if (copy.sourceNodeId) copy.sourceNodeId = ids.get(copy.sourceNodeId) ?? copy.sourceNodeId;
  if (copy.staffOf) copy.staffOf = ids.get(copy.staffOf) ?? copy.staffOf;
  if (copy.kind === "agent") {
    copy.draft = master.draft || master.task;
    if (copy.tab === "conversation") copy.tab = "task";
  }
  if (prior?.generatedRevision !== void 0) copy.generatedRevision = prior.generatedRevision;
  if (prior?.sessionId) {
    copy.sessionId = prior.sessionId;
    copy.lastSubmittedTask = prior.lastSubmittedTask;
    copy.draft = prior.draft;
    copy.tab = prior.tab;
    copy.cwd = prior.cwd;
    copy.workspaceId = prior.workspaceId;
    copy.worktreePath = prior.worktreePath;
  }
  return copy;
}
function cloneMasterEdge(master, fanId, key, dy, ids, prior) {
  const edge2 = structuredClone(master);
  edge2.id = prior?.id ?? generatedId("edge", fanId, key, master.id);
  edge2.source = ids.get(master.source) ?? master.source;
  edge2.target = ids.get(master.target) ?? master.target;
  edge2.generatedBy = fanId;
  edge2.itemKey = key;
  edge2.masterEdgeId = master.id;
  edge2.waypoints = master.waypoints?.map((point) => ({ x: point.x, y: point.y + dy }));
  delete edge2.sentVersion;
  delete edge2.currentVersion;
  delete edge2.placedCapsules;
  if (prior?.sentVersion) edge2.sentVersion = prior.sentVersion;
  if (prior?.currentVersion) edge2.currentVersion = prior.currentVersion;
  if (prior?.generatedRevision !== void 0) edge2.generatedRevision = prior.generatedRevision;
  return edge2;
}
function laneMap(objects, fanId) {
  const result = /* @__PURE__ */ new Map();
  for (const object of objects) {
    if (object.generatedBy !== fanId || object.itemKey === void 0) continue;
    const lane = result.get(object.itemKey);
    if (lane) lane.push(object);
    else result.set(object.itemKey, [object]);
  }
  return result;
}
function sameValue(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((value, i) => sameValue(value, b[i]));
  if (Array.isArray(b)) return false;
  const left = a, right = b;
  return Object.keys(left).every((key) => sameValue(left[key], right[key])) && Object.keys(right).every((key) => right[key] === void 0 || Object.hasOwn(left, key));
}
function reconcileFanout(graph, fanId, items, usedNodeIds = /* @__PURE__ */ new Set()) {
  const pair = fanoutPair(graph, fanId);
  if (!pair) return false;
  const { group, fan, merge } = pair;
  const masters = masterGraph(graph, group, fan, merge);
  const rows = laneMap(graph.nodes, fanId), wires = laneMap(graph.edges, fanId);
  const oldCount = [...rows.values()].filter((row) => row.some((node2) => !node2.removed)).length;
  const boxes = masters.nodes.map((node2) => nodeBox(node2));
  const stride = boxes.length ? Math.max(...boxes.map((box) => box.y + box.h)) - Math.min(...boxes.map((box) => box.y)) + 48 : 248;
  const nextNodes = [], nextEdges = [];
  const activeKeys = new Set(items.map((item) => item.key));
  let changed = false;
  for (const node2 of masters.nodes) {
    if (node2.masterOf !== fanId) {
      node2.masterOf = fanId;
      changed = true;
    }
  }
  function preserveRow(nodes, index, title, removed) {
    for (const node2 of nodes) {
      const moved = (index - (node2.laneIndex ?? index)) * stride;
      const copy = { ...node2, laneIndex: index, itemTitle: title, y: node2.y + moved };
      if (removed) copy.removed = true;
      else delete copy.removed;
      nextNodes.push(copy);
    }
  }
  for (const [index, item] of items.entries()) {
    const row = rows.get(item.key) ?? [], edges = wires.get(item.key) ?? [];
    const title = itemTitle(item);
    if (row.length && (fan.config?.followMaster === false || row.some((node2) => node2.overridden))) {
      preserveRow(row, index, title, false);
      nextEdges.push(...edges);
      continue;
    }
    const priorNodes = new Map(row.map((node2) => [node2.masterNodeId, node2]));
    const priorEdges = new Map(edges.map((edge2) => [edge2.masterEdgeId, edge2]));
    const ids = new Map(masters.nodes.map((node2) => [node2.id, priorNodes.get(node2.id)?.id ?? generatedId("node", fanId, item.key, node2.id)]));
    const dy = (index + 1) * stride;
    for (const node2 of masters.nodes) nextNodes.push(cloneMaster(node2, fanId, item.key, title, index, dy, ids, priorNodes.get(node2.id)));
    for (const edge2 of masters.edges) nextEdges.push(cloneMasterEdge(edge2, fanId, item.key, dy, ids, priorEdges.get(edge2.id)));
    for (const node2 of row) {
      if (node2.masterNodeId && !ids.has(node2.masterNodeId) && (node2.sessionId || usedNodeIds.has(node2.id))) {
        nextNodes.push({ ...node2, removed: true });
      }
    }
  }
  let removedIndex = items.length;
  for (const [key, row] of rows) {
    if (activeKeys.has(key) || !row.some((node2) => node2.sessionId || usedNodeIds.has(node2.id))) continue;
    preserveRow(row, removedIndex++, row[0].itemTitle ?? key, true);
    nextEdges.push(...wires.get(key) ?? []);
  }
  const same = (previous, next) => {
    const flat = [...previous.values()].flat();
    return flat.length === next.length && flat.every((entry, i) => entry === next[i] || entry.id === next[i].id && sameValue(entry, next[i]));
  };
  if (!same(rows, nextNodes) || !same(wires, nextEdges)) {
    const kept = graph.nodes.filter((node2) => node2.generatedBy !== fanId);
    const ids = new Set([...kept, ...nextNodes].map((node2) => node2.id));
    graph.nodes = [...kept, ...nextNodes];
    graph.edges = [...graph.edges.filter((edge2) => edge2.generatedBy !== fanId && ids.has(edge2.source) && ids.has(edge2.target)), ...nextEdges];
    changed = true;
  }
  let width = group.width, height = 180;
  for (const node2 of [...masters.nodes, fan, merge, ...nextNodes]) {
    const box = nodeBox(node2);
    width = Math.max(width, box.x + box.w - group.x + 24);
    height = Math.max(height, box.y + box.h - group.y + 24);
  }
  if (width > group.width || height !== group.height) {
    group.width = width;
    group.height = height;
    changed = true;
  }
  if (oldCount <= 10 && items.length > 10 && !group.collapsed) {
    group.collapsed = true;
    changed = true;
  }
  return changed;
}
function syncExistingFanout(graph, fanId, usedNodeIds) {
  const rows = [...laneMap(graph.nodes, fanId).values()].map((nodes) => nodes.find((node2) => !node2.removed)).filter((node2) => !!node2);
  rows.sort((a, b) => a.laneIndex - b.laneIndex);
  return reconcileFanout(graph, fanId, rows.map((node2) => ({ key: node2.itemKey, value: node2.itemTitle ?? node2.itemKey })), usedNodeIds);
}
function markFanoutOverrides(previous, next) {
  const before = new Map(previous.nodes.map((node2) => [node2.id, node2]));
  const after = new Map(next.nodes.map((node2) => [node2.id, node2]));
  const changed = /* @__PURE__ */ new Set();
  const laneId = (item) => JSON.stringify([item.generatedBy, item.itemKey]);
  const resumed = new Set(next.nodes.filter((node2) => node2.generatedBy && node2.overridden === false && before.get(node2.id)?.overridden === true).map(laneId));
  const fields = [
    "title",
    "task",
    "draft",
    "continuationPrompt",
    "text",
    "config",
    "columns",
    "selectedItems",
    "items",
    "roleLabel",
    "planMode",
    "teamRef",
    "participation",
    "rerun"
  ];
  for (const node2 of previous.nodes) {
    if (!node2.generatedBy || node2.removed) continue;
    const updated = after.get(node2.id);
    const master = node2.masterNodeId && after.get(node2.masterNodeId);
    if (!updated && node2.masterNodeId && !master) continue;
    const parent = before.get(node2.parentId ?? ""), movedParent = after.get(node2.parentId ?? "");
    const dx = (movedParent?.x ?? 0) - (parent?.x ?? 0), dy = (movedParent?.y ?? 0) - (parent?.y ?? 0);
    if (!updated || node2.parentId !== updated.parentId || node2.x + dx !== updated.x || node2.y + dy !== updated.y || fields.some((field) => !sameValue(node2[field], updated[field]) && (!master || !sameValue(master[field], updated[field])))) changed.add(laneId(node2));
  }
  const edges = new Map(next.edges.map((edge2) => [edge2.id, edge2]));
  const previousEdges = new Map(previous.edges.map((edge2) => [edge2.id, edge2]));
  const edgeFields = (edge2) => [
    edge2.kind,
    edge2.source,
    edge2.target,
    edge2.sourcePort,
    edge2.targetPort,
    edge2.mode,
    edge2.trigger,
    edge2.emitMode,
    edge2.always,
    edge2.maxRounds,
    edge2.logic,
    edge2.sourceItemKey
  ];
  for (const edge2 of previous.edges) {
    if (!edge2.generatedBy) continue;
    const updated = edges.get(edge2.id);
    const master = edge2.masterEdgeId && edges.get(edge2.masterEdgeId);
    if (!updated && edge2.masterEdgeId && !master) continue;
    if (!updated || !sameValue(edgeFields(edge2), edgeFields(updated))) {
      const originalEndpoint = (id) => {
        const node2 = after.get(id);
        return node2 && node2.generatedBy === edge2.generatedBy && node2.itemKey === edge2.itemKey ? node2.masterNodeId ?? id : id;
      };
      const logical = updated && { ...updated, source: originalEndpoint(updated.source), target: originalEndpoint(updated.target) };
      if (!logical || !master || !sameValue(edgeFields(logical), edgeFields(master))) changed.add(laneId(edge2));
    } else if (!sameValue(edge2.waypoints ?? [], updated.waypoints ?? [])) {
      const source = before.get(edge2.generatedBy), moved = source && after.get(source.id);
      if (!source || !moved || source.x === moved.x && source.y === moved.y) changed.add(laneId(edge2));
    }
  }
  for (const edge2 of next.edges) {
    if (previousEdges.has(edge2.id) || edge2.generatedBy) continue;
    const source = after.get(edge2.source), target = after.get(edge2.target);
    const lane = source?.generatedBy ? source : target?.generatedBy ? target : void 0;
    if (!lane || !lane.itemKey) continue;
    const peer = lane === source ? target : source;
    if (!peer) continue;
    changed.add(laneId(lane));
    if (!before.has(peer.id) && !peer.masterOf && !peer.generatedBy && peer.parentId === lane.parentId && peer.kind !== "group" && peer.flowType !== "flowspace/merge-sort" && peer.flowType !== "flowspace/fanout") {
      Object.assign(peer, {
        generatedBy: lane.generatedBy,
        itemKey: lane.itemKey,
        laneIndex: lane.laneIndex,
        itemTitle: lane.itemTitle,
        overridden: true
      });
    }
    if (peer.generatedBy === lane.generatedBy && peer.itemKey === lane.itemKey) {
      edge2.generatedBy = lane.generatedBy;
      edge2.itemKey = lane.itemKey;
    }
  }
  if (changed.size) {
    for (const node2 of next.nodes) if (node2.generatedBy && changed.has(laneId(node2)) && !resumed.has(laneId(node2))) node2.overridden = true;
  }
}

// packages/flowspace/src/core/generation.ts
function stampGeneratedBatch(doc, beforeNodes, beforeEdges) {
  const nodes = doc.nodes.filter((node2) => node2.generatedBy && !beforeNodes.has(node2.id));
  const edges = doc.edges.filter((edge2) => edge2.generatedBy && !beforeEdges.has(edge2.id));
  if (!nodes.length && !edges.length) return false;
  const revision = (doc.generationRevision ?? 0) + 1;
  doc.generationRevision = revision;
  for (const element of [...nodes, ...edges]) element.generatedRevision = revision;
  return true;
}
function mergePendingGeneration(draft, host) {
  const seen = draft.generationRevision ?? 0;
  if ((host.generationRevision ?? 0) <= seen) return draft;
  const nodeIds = new Set(draft.nodes.map((node2) => node2.id));
  const edgeIds = new Set(draft.edges.map((edge2) => edge2.id));
  const nodes = host.nodes.filter((node2) => (node2.generatedRevision ?? 0) > seen && node2.generatedBy && nodeIds.has(node2.generatedBy) && !nodeIds.has(node2.id));
  for (const node2 of nodes) nodeIds.add(node2.id);
  const edges = host.edges.filter((edge2) => (edge2.generatedRevision ?? 0) > seen && edge2.generatedBy && nodeIds.has(edge2.generatedBy) && !edgeIds.has(edge2.id) && nodeIds.has(edge2.source) && nodeIds.has(edge2.target));
  const changedFans = new Set(nodes.map((node2) => node2.generatedBy));
  const groups = new Map(host.nodes.filter((node2) => node2.fanout && changedFans.has(node2.fanout.fanId)).map((node2) => [node2.id, node2]));
  const authored = draft.nodes.map((node2) => {
    const group = groups.get(node2.id);
    return group ? { ...node2, width: group.width, height: group.height, collapsed: group.collapsed } : node2;
  });
  return {
    ...draft,
    generationRevision: host.generationRevision,
    nodes: [...authored, ...structuredClone(nodes)],
    edges: [...draft.edges, ...structuredClone(edges)]
  };
}

// packages/flowspace/src/core/runFanout.ts
var active = (step) => ["queued", "running", "settling", "awaiting"].includes(step.state);
var pending = (token) => !token.consumed && !token.dismissed;
var sourceValue2 = (content) => content.dataType === "list" ? (content.items ?? []).map((item) => item.value ?? null) : content.value ?? null;
function itemContent(value, limit) {
  if (Array.isArray(value)) return contentList(value, limit);
  if (value && typeof value === "object") return { dataType: "record", value };
  return { dataType: typeof value === "string" ? "text" : "signal", value };
}
function incomingItems(snapshot2, limit) {
  const content = contentOf(snapshot2);
  if (content.dataType === "list") return content.items ?? [];
  if (content.dataType === "file" && Array.isArray(content.value)) {
    return contentList(content.value, limit, content.value.map((file) => typeof file === "string" ? file : void 0)).items;
  }
  throw new Error("\u6247\u51FA\u9700\u8981\u5217\u8868\u8F93\u5165");
}
function openStream(run, batch) {
  if (!batch.producerStepId) return false;
  const producer = run.steps.find((step) => step.id === batch.producerStepId);
  if (producer && active(producer)) return true;
  const upstream = new Set(ancestorsOf([batch.fanId], run.graph.edges, run.graph.nodes));
  if (run.steps.some((step) => step.streamFrom === batch.producerStepId && upstream.has(step.nodeId) && active(step))) return true;
  const incoming = new Set(run.graph.edges.filter((edge2) => upstream.has(edge2.target)).map((edge2) => edge2.id));
  return run.tokens.some((token) => token.streamFrom === batch.producerStepId && incoming.has(token.edgeId) && pending(token));
}
function laneSessionTitle(run, node2) {
  if (!node2.generatedBy || node2.laneIndex === void 0) return void 0;
  const pair = fanoutPair(run.graph, node2.generatedBy);
  return laneTitle(pair?.group, node2);
}
var unsettled = (lane) => lane.state === "queued" || lane.state === "running";
var FanoutExecution = class {
  constructor(runtime, store, runs) {
    this.runtime = runtime;
    this.store = store;
    this.runs = runs;
  }
  async hydrated(source) {
    return this.runtime.hydrateContent ? this.runtime.hydrateContent(source) : source;
  }
  async frozen(source, run) {
    return this.runtime.freezeContent ? this.runtime.freezeContent(source, run.listLimit) : source;
  }
  async receive(run, fan, step) {
    const pair = fanoutPair(run.graph, fan.id);
    if (!pair) throw new Error("\u6247\u51FA\u8282\u70B9\u7F3A\u5C11\u5BF9\u5E94\u7684\u6BCD\u7248\u548C\u5408\u5E76\u8282\u70B9");
    if (!step.sources.length) throw new Error("\u6247\u51FA\u9700\u8981\u5217\u8868\u8F93\u5165");
    const batches = run.fanouts ??= [];
    let batch = step.streamFrom && batches.find((entry) => entry.fanId === fan.id && entry.producerStepId === step.streamFrom);
    if (!batch) {
      batch = {
        id: uid(),
        fanId: fan.id,
        mergeId: pair.merge.id,
        groupId: pair.group.id,
        ...step.streamFrom ? { producerStepId: step.streamFrom } : {},
        closed: false,
        lanes: []
      };
      batches.push(batch);
    }
    const limit = run.listLimit ?? DEFAULT_LIST_LIMIT;
    const added = [];
    const keys = new Set(batch.lanes.map((lane) => lane.item.key));
    for (const source of step.sources) {
      const items = incomingItems(source, limit);
      for (const item of items.slice(0, limit - batch.lanes.length - added.length)) {
        let key = item.key;
        for (let occurrence = 2; keys.has(key); occurrence++) key = `${item.key}#${occurrence}`;
        keys.add(key);
        let value = item.value ?? null;
        if (item.spill) {
          const hydrated = await this.hydrated(snapshotWithContent(fan, { dataType: "list", items: [item] }));
          value = hydrated.content.items[0].value ?? null;
        }
        const input = await this.frozen({
          ...snapshotWithContent({ id: source.sourceNodeId, title: source.title }, itemContent(value, limit), source.capturedAt),
          sourceSessionId: source.sourceSessionId,
          seq: source.seq
        }, run);
        const retired = !!batch.mergeStepId && pair.merge.config?.cancelRest === true;
        added.push({
          item: { ...item, key },
          fanStepId: step.id,
          input,
          state: retired ? "cancelled" : "queued",
          ...batch.mergeStepId ? { adopted: false } : {},
          ...retired ? { endedAt: Date.now() } : {}
        });
      }
    }
    batch.lanes.push(...added);
    const runItems = new Map(batches.filter((entry) => entry.fanId === fan.id).flatMap((entry) => entry.lanes.map((lane) => [lane.item.key, lane.item])));
    reconcileFanout(run.graph, fan.id, [...runItems.values()], new Set(run.steps.map((existing) => existing.nodeId)));
    const generated = run.graph.nodes.filter((node2) => node2.generatedBy === fan.id && !node2.removed).map((node2) => node2.id);
    run.participants = [.../* @__PURE__ */ new Set([...run.participants, ...generated])];
    if (run.scope?.includes(fan.id)) run.scope = [.../* @__PURE__ */ new Set([...run.scope, ...generated])];
    const doc = this.store.document();
    if (fanoutPair(doc, fan.id)) {
      const beforeNodes = new Set(doc.nodes.map((node2) => node2.id)), beforeEdges = new Set(doc.edges.map((edge2) => edge2.id));
      const visible = new Set(doc.nodes.filter((node2) => node2.generatedBy === fan.id && !node2.removed).map((node2) => node2.itemKey));
      const newKeys = new Set(added.map((lane) => lane.item.key));
      const liveItems = new Map([...runItems].filter(([key]) => visible.has(key) || newKeys.has(key)));
      for (const other of this.runs) {
        if (other === run || !["running", "paused", "waiting"].includes(other.state)) continue;
        for (const group of other.fanouts ?? []) if (group.fanId === fan.id) {
          for (const lane of group.lanes) if (visible.has(lane.item.key)) liveItems.set(lane.item.key, lane.item);
        }
      }
      reconcileFanout(doc, fan.id, [...liveItems.values()], new Set(this.runs.flatMap((r) => r.steps.map((s) => s.nodeId))));
      stampGeneratedBatch(doc, beforeNodes, beforeEdges);
    }
    step.state = "completed";
    step.fanoutBatchId = batch.id;
    step.route = "out";
    step.endedAt = Date.now();
    step.output = String(added.length);
  }
  async collect(run, batch, lane) {
    const terminal = run.graph.edges.filter((edge2) => edge2.generatedBy === batch.fanId && edge2.itemKey === lane.item.key && edge2.target === batch.mergeId && edge2.kind === "continuation" && edge2.trigger !== "off");
    const tokens = terminal.map((edge2) => run.tokens.find((token) => token.fanoutBatchId === batch.id && token.edgeId === edge2.id && (pending(token) || token.dismissed)));
    const steps = run.steps.filter((step) => step.fanoutBatchId === batch.id && step.itemKey === lane.item.key);
    const failed = steps.some((step) => ["aborted", "interrupted", "error"].includes(step.state) || step.route === "error" && step.error);
    if (!terminal.length || tokens.some((token) => !token || !token.ready && !token.dismissed)) {
      const edges = new Set(run.graph.edges.filter((edge2) => edge2.generatedBy === batch.fanId && edge2.itemKey === lane.item.key).map((edge2) => edge2.id));
      if (steps.some(active) || run.tokens.some((token) => pending(token) && token.fanoutBatchId === batch.id && edges.has(token.edgeId))) return;
      lane.state = failed ? "error" : "skipped";
      lane.endedAt = Date.now();
      return;
    }
    const now = Date.now();
    const sources = [];
    for (const token of tokens) {
      token.consumed = true;
      token.consumedAt ??= now;
      if (!token.skip && !token.dismissed) sources.push(token.source);
    }
    lane.endedAt = Math.max(...tokens.map((token) => token.readyAt ?? token.consumedAt ?? now));
    lane.readyOrder = Math.max(...tokens.map((token) => token.readyOrder ?? run.tokens.indexOf(token)));
    lane.state = sources.length ? "completed" : failed ? "error" : "skipped";
    const ratingNode = steps.findLast((step) => run.graph.nodes.find((node2) => node2.id === step.nodeId)?.flowType === "flowspace/human-score");
    const rating = ratingNode?.human?.initial?.score;
    const ai2 = steps.findLast((step) => typeof step.verdict?.confidence === "number");
    const merge = run.graph.nodes.find((node2) => node2.id === batch.mergeId);
    if (merge?.config?.scoreBy === "ai" && ai2?.verdict?.confidence !== void 0) lane.score = ai2.verdict.confidence;
    else if (typeof rating === "number") lane.score = rating;
    else if (typeof rating === "boolean") lane.score = rating ? 5 : 1;
    const member = run.graph.nodes.find((node2) => node2.generatedBy === batch.fanId && node2.itemKey === lane.item.key && node2.kind === "agent");
    if (member?.teamModel) lane.model = member.teamModel;
    if (merge?.config?.wait === "best" && lane.score !== void 0 && ratingNode?.sources[0])
      lane.result = ratingNode.sources[0];
    else if (sources.length === 1) lane.result = sources[0];
    else if (sources.length) {
      const hydrated = await Promise.all(sources.map((source) => this.hydrated(source)));
      lane.result = await this.frozen(snapshotWithContent(
        { id: batch.mergeId, title: lane.item.key },
        contentList(hydrated.map((source) => sourceValue2(contentOf(source))), run.listLimit)
      ), run);
    }
  }
  async mergedContent(run, node2, batch) {
    const values = [], keys = [], texts = [];
    for (const lane of batch.lanes) {
      if (!lane.result || lane.adopted === false) continue;
      const source = await this.hydrated(lane.result);
      values.push(sourceValue2(contentOf(source)));
      keys.push(lane.item.key);
      texts.push(source.text);
    }
    const content = node2.config?.output === "text" ? { dataType: "text", value: texts.join("\n") } : contentList(values, run.listLimit, keys);
    return this.frozen(snapshotWithContent(node2, content), run);
  }
  async collectCompleted(run) {
    for (const batch of run.fanouts ?? []) {
      for (const lane of batch.lanes) {
        if (lane.state === "running") await this.collect(run, batch, lane);
      }
      batch.closed = !openStream(run, batch);
    }
  }
  available(fanId) {
    let occupied = 0, cap = Infinity;
    for (const owner of this.runs) {
      if (["cancelled", "completed", "interrupted"].includes(owner.state) || owner.state === "error" && !owner.steps.some(active)) continue;
      const groups = owner.fanouts?.filter((batch) => batch.fanId === fanId && batch.lanes.some(unsettled));
      if (!groups?.length) continue;
      const node2 = owner.graph.nodes.find((node3) => node3.id === fanId);
      cap = Math.min(cap, Number(node2.config?.concurrency ?? 4));
      for (const group of groups) occupied += group.lanes.filter((lane) => lane.state === "running").length;
    }
    return cap - occupied;
  }
  hasAdmission(run) {
    return !!run.fanouts?.some((group) => group.lanes.some((lane) => lane.state === "queued") && this.available(group.fanId) > 0);
  }
  selection(batch, node2) {
    const winners = batch.lanes.filter((lane) => lane.state === "completed" && lane.result);
    const done = batch.closed && !batch.lanes.some(unsettled);
    const wait = node2.config?.wait ?? "all";
    if (wait === "best") {
      if (!done) return;
      const ranked = winners.filter((lane) => lane.score !== void 0).sort((a, b) => b.score - a.score || batch.lanes.indexOf(a) - batch.lanes.indexOf(b));
      return ranked.length ? { chosen: ranked.slice(0, 1) } : { chosen: [], error: "\u62E9\u4F18\u9700\u8981\u81F3\u5C11\u4E00\u6761\u5E26\u6709\u6548\u8BC4\u5206\u7684\u6CF3\u9053\u7ED3\u679C" };
    }
    if (wait === "all") {
      if (!done) return;
      const failed = batch.lanes.find((lane) => lane.state === "error");
      return { chosen: winners, ...failed ? { error: `\u6CF3\u9053\u672A\u80FD\u751F\u6210\u7ED3\u679C\uFF1A${failed.item.key}` } : {} };
    }
    const needed = wait === "any" ? 1 : Number(node2.config?.quorum ?? 1);
    if (winners.length >= needed) {
      winners.sort((a, b) => a.endedAt - b.endedAt || (a.readyOrder ?? 0) - (b.readyOrder ?? 0));
      return { chosen: winners.slice(0, needed) };
    }
    const possible = winners.length + batch.lanes.filter(unsettled).length;
    if (batch.closed && possible < needed) {
      return { chosen: [], error: `\u5408\u5E76\u9700\u8981 ${needed} \u6761\u6709\u6548\u6CF3\u9053\uFF0C\u5F53\u524D\u5B8C\u6210 ${winners.length} \u6761\uFF0C\u6700\u591A\u53EF\u5B8C\u6210 ${possible} \u6761` };
    }
  }
  async pump(run, deliver, merge, cancel) {
    let changed = false;
    await this.collectCompleted(run);
    for (const batch of run.fanouts ?? []) {
      const node2 = run.graph.nodes.find((node3) => node3.id === batch.mergeId);
      const decision = !batch.mergeStepId && this.selection(batch, node2);
      if (decision) {
        const winners = new Set(decision.chosen);
        for (const lane of batch.lanes) {
          lane.adopted = winners.has(lane);
          if (!lane.adopted && unsettled(lane) && node2.config?.cancelRest === true) await cancel(batch, lane);
        }
        await merge(node2, batch, await this.mergedContent(run, node2, batch), decision.error);
        changed = true;
      }
      let slots = this.available(batch.fanId);
      for (const lane of batch.lanes) {
        if (slots <= 0) break;
        if (lane.state !== "queued") continue;
        const item = (await this.hydrated(lane.input)).content?.value;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const field = (path) => {
            if (!path) return void 0;
            let value = item;
            for (const name of path.split(".")) {
              if (!value || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(value, name)) return void 0;
              value = value[name] ?? null;
            }
            return typeof value === "string" ? value : void 0;
          };
          for (const member of run.graph.nodes.filter((node3) => node3.generatedBy === batch.fanId && node3.itemKey === lane.item.key && node3.laneBindings)) {
            const bindings = member.laneBindings;
            const provider = field(bindings.provider);
            const model = field(bindings.model);
            if (provider && model) member.teamModel = { provider, model };
            member.lanePersona = field(bindings.persona);
            const cwd = field(bindings.cwd);
            if (cwd) {
              member.cwd = cwd;
              member.worktreePath = cwd;
            }
          }
        }
        const step = run.steps.find((entry) => entry.id === lane.fanStepId);
        const entries = run.graph.edges.filter((edge2) => edge2.generatedBy === batch.fanId && edge2.itemKey === lane.item.key && edge2.source === batch.fanId && edge2.kind === "continuation" && edge2.trigger !== "off");
        if (!entries.length) {
          lane.state = "error";
          lane.endedAt = Date.now();
          const message = "\u6247\u51FA\u6BCD\u7248\u9700\u8981\u63A5\u7EED\u5230\u6CF3\u9053\u9996\u8282\u70B9";
          if (!run.notes.includes(message)) run.notes.push(message);
          changed = true;
          continue;
        }
        for (const edge2 of entries) deliver(edge2, step, lane.input, batch);
        lane.state = "running";
        slots--;
        changed = true;
      }
    }
    return changed;
  }
};

// packages/flowspace/src/core/budget.ts
function budgetUsage(steps, start, now) {
  const active2 = steps.filter((step) => !!step.startedAt || step.state !== "queued" && step.state !== "awaiting");
  return {
    tokens: steps.reduce((total, step) => total + (step.telemetry?.inputTokens ?? 0) + (step.telemetry?.outputTokens ?? 0), 0),
    seconds: Math.max(0, (now - start) / 1e3),
    rounds: active2.length
  };
}
function budgetHit(run, step, beforeDispatch, now) {
  const limitForNode = run.graph.nodes.find((node2) => node2.id === step.nodeId)?.budget;
  const sets = [
    { key: "run", nodeId: void 0, limits: run.budget, steps: run.steps, start: run.createdAt },
    {
      key: step.nodeId,
      nodeId: step.nodeId,
      limits: limitForNode,
      steps: run.steps.filter((entry) => entry.nodeId === step.nodeId),
      start: step.startedAt ?? now
    }
  ];
  for (const set of sets) {
    if (!set.limits) continue;
    const usage = budgetUsage(set.steps, set.start, now);
    for (const dimension of ["tokens", "seconds", "rounds"]) {
      const limit = set.limits[dimension];
      const key = `${set.key}:${dimension}`;
      const value = usage[dimension] + (beforeDispatch && dimension === "rounds" ? 1 : 0);
      if (limit !== void 0 && value > limit && !run.budgetAcknowledged?.includes(key))
        return { key, nodeId: set.nodeId, dimension, value, limit, at: now };
    }
  }
}

// packages/flowspace/src/core/scheduler.ts
var activeStep = (step) => step.state === "queued" || step.state === "running" || step.state === "settling";
function consumeToken(token) {
  if (token.consumed) return;
  token.consumed = true;
  token.consumedAt = Date.now();
}
function markTokenReady(run, token, at = Date.now()) {
  token.readyAt = at;
  if (token.fanoutBatchId) token.readyOrder = run.fanoutReadyOrder = (run.fanoutReadyOrder ?? 0) + 1;
}
var Scheduler = class {
  constructor(runtime, store, runs = []) {
    this.runtime = runtime;
    this.store = store;
    this.runs = runs;
    this.fanout = new FanoutExecution(runtime, store, runs);
  }
  runs;
  serial = Promise.resolve();
  disposed = false;
  teamSettlements = /* @__PURE__ */ new Set();
  executions = /* @__PURE__ */ new Map();
  timers = /* @__PURE__ */ new Map();
  fanout;
  transact(action) {
    const next = this.serial.then(action);
    this.serial = next.catch(() => void 0);
    return next;
  }
  busy() {
    const sessions = new Set(this.runtime.running?.() ?? []);
    return /* @__PURE__ */ new Set([
      ...this.runs.flatMap(
        (r) => r.steps.filter(activeStep).map((s) => s.nodeId)
      ),
      ...this.store.document().nodes.filter((n) => n.sessionId && sessions.has(n.sessionId)).map((n) => n.id)
    ]);
  }
  waiting() {
    return new Set(
      this.runs.flatMap(
        (r) => r.tokens.filter((t2) => !t2.ready && !t2.consumed && !t2.dismissed && (!t2.delayUntil || t2.needsRelease)).flatMap((t2) => {
          const edge2 = r.graph.edges.find((e) => e.id === t2.edgeId);
          return edge2 ? [edge2.target] : [];
        })
      )
    );
  }
  plan(request) {
    return launchPlan(
      this.store.document(),
      request,
      this.busy(),
      this.waiting()
    );
  }
  async start(request) {
    return this.transact(async () => {
      const doc = this.store.document();
      syncUntitledAgentTitles(doc);
      const plan = request.kind === "single" ? launchPlan(doc, request, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set()) : this.plan(request);
      plan.roots = plan.roots.filter(
        (id) => !request.excludeRootIds?.includes(id)
      );
      if (!plan.roots.length) throw new Error("\u6CA1\u6709\u53EF\u542F\u52A8\u7684 Agent \u6216\u9759\u6001\u8F93\u5165\u8282\u70B9");
      const expandIds = (ids) => ids.flatMap(
        (id) => doc.nodes.find((n) => n.id === id)?.kind === "group" ? members(doc, id) : [id]
      );
      const scope = request.kind === "global" || request.kind === "single" ? null : request.kind === "from-node" ? reachable(expandIds(request.nodeIds), doc.edges, doc.nodes) : request.kind === "to-node" ? ancestorsOf(expandIds(request.nodeIds), doc.edges, doc.nodes) : expandIds(request.nodeIds);
      const groupTitles = request.kind === "group" ? request.nodeIds.map(
        (id) => doc.nodes.find((n) => n.id === id && n.kind === "group")?.title
      ).filter((t2) => Boolean(t2?.trim())) : [];
      const customTitle = groupTitles.length ? groupTitles.join(" \xB7 ") : void 0;
      const run = this.create(plan.roots, scope, "canvas", customTitle);
      await this.store.changed();
      for (const id of run.roots) {
        const node2 = run.graph.nodes.find((n) => n.id === id);
        const incomingFork = run.graph.edges.find(
          (e) => e.target === id && e.mode === "fork"
        );
        let sources = [];
        let treatAsContinuation = false;
        if (incomingFork && !node2.sessionId) {
          try {
            sources = [
              await this.runtime.capture(
                run.graph.nodes.find((n) => n.id === incomingFork.source),
                "fork"
              )
            ];
          } catch (error) {
            run.state = "error";
            run.notes.push(String(error));
            continue;
          }
        } else if (request.kind === "from-node" || request.kind === "to-node") {
          const seeded = await this.collectCompletedUpstreamSources(run, id);
          if (seeded.length) {
            sources = seeded;
            treatAsContinuation = true;
          }
        }
        await this.enqueue(run, id, sources, treatAsContinuation);
      }
      if (run.fanouts?.length) await this.advance(run);
      this.settle(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }
  startTriggered(nodeId, input) {
    return this.transact(async () => {
      const node2 = this.store.document().nodes.find((node3) => node3.id === nodeId && node3.flowType === triggerNode.flowType);
      if (!node2) throw new Error("\u89E6\u53D1\u5668\u5DF2\u79FB\u9664");
      const run = this.create([nodeId], null, "trigger", node2.title);
      run.triggerId = nodeId;
      const now = Date.now();
      const step = {
        id: uid(),
        requestId: uid(),
        nodeId,
        state: "completed",
        iteration: 1,
        route: "out",
        sources: [input],
        task: "",
        output: input.text,
        createdAt: now,
        endedAt: now
      };
      run.steps.push(step);
      input = await this.runtime.freezeContent?.(input, run.listLimit) ?? input;
      await this.emitDownstreamTokens(run, step, node2, void 0, void 0, input.text, false, input);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }
  async status(run, step, kind, summary, reason, seq) {
    const edges = run.graph.edges.filter((edge2) => edge2.kind === "event" && edge2.source === step.nodeId);
    if (!edges.length && ["tool", "output", "usage"].includes(kind)) return;
    const event = {
      id: uid(),
      nodeId: step.nodeId,
      stepId: step.id,
      at: Date.now(),
      round: step.iteration,
      kind,
      summary: summary?.slice(0, 512),
      reason,
      sessionId: step.sessionId,
      seq: seq ?? step.endSeq,
      telemetry: step.telemetry && { ...step.telemetry }
    };
    (run.events ??= []).push(event);
    for (const edge2 of edges) {
      const policy = edge2.event;
      const mode2 = policy?.mode ?? "end";
      if (edge2.trigger === "off" || mode2 === "end" && !["done", "error"].includes(kind) || mode2 === "change" && ["output", "usage", "tool"].includes(kind) || mode2 === "continuous" && !["output", "usage", "tool"].includes(kind) || !(policy?.kinds ?? ["done", "error"]).includes(kind) || policy?.reasons?.length && (!reason || !policy.reasons.includes(reason))) continue;
      const prior = run.tokens.filter((token) => token.edgeId === edge2.id && !token.skip);
      if (prior.length >= (policy?.maxTimes ?? Infinity)) continue;
      const dueAt = (prior.at(-1)?.createdAt ?? 0) + (policy?.cooldownMs ?? 0);
      const pending2 = run.pendingEvents?.find((batch) => batch.edgeId === edge2.id && batch.event.kind === kind && batch.event.stepId === step.id);
      if (mode2 === "continuous" && (pending2 || dueAt > event.at)) {
        const batch = pending2 ?? { edgeId: edge2.id, event, content: "", dueAt };
        if (!pending2) (run.pendingEvents ??= []).push(batch);
        batch.event = event;
        batch.content += (batch.content && kind !== "output" ? "\n" : "") + (summary ?? "");
        this.armEvent(run, batch);
      } else if (dueAt <= event.at) await this.sendEvent(run, edge2, event, summary);
    }
  }
  async sendEvent(run, edge2, event, content) {
    const origin = run.graph.nodes.find((node2) => node2.id === event.nodeId);
    const target = run.graph.nodes.find((node2) => node2.id === edge2.target);
    const step = run.steps.find((step2) => step2.id === event.stepId);
    if (!origin || !step || !target || target.participation === "paused") return;
    const value = JSON.parse(JSON.stringify({
      ...event,
      ...edge2.event?.full || edge2.event?.mode === "continuous" ? { content } : {}
    }));
    const snapshot2 = { ...snapshotWithContent(origin, { dataType: "record", value }), seq: event.seq, sourceSessionId: event.sessionId };
    const frozen = await this.runtime.freezeContent?.(snapshot2, run.listLimit, event.sessionId) ?? snapshot2;
    this.pushToken(run, edge2, step, target, frozen, false);
  }
  armEvent(run, batch) {
    const timer = `event:${run.id}:${batch.edgeId}:${batch.event.stepId}:${batch.event.kind}`;
    this.schedule(timer, batch.dueAt, async () => {
      if (!run.pendingEvents?.includes(batch) || ["cancelled", "interrupted", "error"].includes(run.state)) return;
      const edge2 = run.graph.edges.find((edge3) => edge3.id === batch.edgeId);
      const prior = run.tokens.filter((token) => token.edgeId === batch.edgeId && !token.skip);
      const dueAt = (prior.at(-1)?.createdAt ?? 0) + (edge2?.event?.cooldownMs ?? 0);
      if (dueAt > Date.now()) {
        batch.dueAt = dueAt;
        this.armEvent(run, batch);
        return;
      }
      run.pendingEvents = run.pendingEvents.filter((other) => other !== batch);
      if (edge2 && prior.length < (edge2.event?.maxTimes ?? Infinity))
        await this.sendEvent(run, edge2, batch.event, batch.content);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }
  nativeStatus(sessionId, kind, summary, seq) {
    return this.transact(async () => {
      const owner = this.activeSessionStep(sessionId);
      if (!owner || !owner.run.graph.edges.some((edge2) => edge2.kind === "event" && edge2.source === owner.step.nodeId && edge2.event?.mode === "continuous" && edge2.event.kinds.includes(kind))) return;
      await this.status(owner.run, owner.step, kind, summary, void 0, seq);
      await this.advance(owner.run);
      await this.store.changed();
    });
  }
  observesOutput(sessionId) {
    const owner = this.activeSessionStep(sessionId);
    return !!owner?.run.graph.edges.some((edge2) => edge2.kind === "event" && edge2.source === owner.step.nodeId && edge2.event?.mode === "continuous" && edge2.event.kinds.includes("output"));
  }
  variableChanged(nodeId, summary, runId, stepId) {
    return this.transact(async () => {
      const graph = runId ? this.runs.find((run2) => run2.id === runId)?.graph : this.store.document();
      if (!graph?.edges.some((edge2) => edge2.source === nodeId && edge2.kind === "event" && edge2.event?.kinds.includes("container"))) return;
      const owner = runId && this.runs.find((run2) => run2.id === runId);
      const run = owner || this.create([nodeId], null, "trigger", graph.nodes.find((node2) => node2.id === nodeId)?.title);
      if (!owner) run.triggerId = nodeId;
      const now = Date.now();
      const original = run.steps.find((step2) => step2.id === stepId);
      const step = original ? { ...original, nodeId } : {
        id: uid(),
        nodeId,
        requestId: uid(),
        state: "completed",
        iteration: 1,
        createdAt: now,
        endedAt: now,
        task: "",
        sources: [],
        output: summary
      };
      if (!original) run.steps.push(step);
      await this.status(run, step, "container", summary);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }
  /** Collect latest completed outputs from upstream sessions when starting mid-DAG (`from-node` / `to-node`). */
  async collectCompletedUpstreamSources(run, targetId) {
    const out = [];
    const links = activeEdges(run.graph.edges);
    const seen = /* @__PURE__ */ new Set([targetId]);
    const walkBack = async (curId, fallbackMode) => {
      for (const e of links) {
        if (e.target !== curId || run.roots.includes(e.source)) continue;
        const src = run.graph.nodes.find((n) => n.id === e.source);
        if (!src || src.participation === "paused" || seen.has(src.id))
          continue;
        seen.add(src.id);
        if (src.participation === "bypassed") {
          await walkBack(
            src.id,
            e.mode === "fork" ? "conclusion" : e.mode
          );
          continue;
        }
        if (src.sessionId) {
          try {
            const mode2 = e.mode === "fork" ? fallbackMode : e.mode;
            const snap = await this.runtime.capture(src, mode2);
            if (snap.text.trim()) out.push(snap);
          } catch {
          }
        }
      }
    };
    await walkBack(targetId, "conclusion");
    return out;
  }
  /** Rerun failed/interrupted nodes of a run and their affected downstream while reusing completed upstream snapshots (R5). */
  async rerunFailed(runId) {
    return this.transact(async () => {
      const prev = this.requireRun(runId);
      const latestByNode = /* @__PURE__ */ new Map();
      for (const step of prev.steps) latestByNode.set(step.nodeId, step);
      const failedRoots = [...latestByNode.entries()].filter(
        ([, step]) => ["error", "aborted", "interrupted"].includes(step.state)
      ).map(([nodeId]) => nodeId).filter(
        (nodeId) => this.store.document().nodes.some((n) => n.id === nodeId && isExecutable(n))
      );
      if (!failedRoots.length)
        throw new Error("\u8BE5\u6B21\u8FD0\u884C\u6CA1\u6709\u53EF\u91CD\u8DD1\u7684\u5931\u8D25\u6216\u4E2D\u65AD\u8282\u70B9");
      const doc = this.store.document();
      const scope = prev.scope ? [
        .../* @__PURE__ */ new Set([
          ...prev.scope,
          ...reachable(failedRoots, doc.edges, doc.nodes)
        ])
      ] : null;
      const run = this.create(failedRoots, scope, "canvas");
      run.notes.push(`\u81EA\u8FD0\u884C ${prev.title} \u5C40\u90E8\u91CD\u8DD1\u5931\u8D25\u8282\u70B9\u53CA\u4E0B\u6E38`);
      await this.store.changed();
      for (const id of run.roots) {
        const failedStep = latestByNode.get(id);
        const preservedSources = failedStep?.sources ?? [];
        await this.enqueue(
          run,
          id,
          preservedSources,
          preservedSources.length > 0,
          void 0,
          { sourcePorts: failedStep?.sourcePorts },
          !!failedStep
        );
      }
      this.settle(run);
      await this.store.changed();
      return structuredClone(run);
    });
  }
  create(roots, scope, origin, customTitle) {
    const doc = this.store.document();
    const run = {
      id: uid(),
      title: customTitle || roots.map((id) => doc.nodes.find((n) => n.id === id)?.title).filter(Boolean).join(" \xB7 "),
      origin,
      budget: doc.settings.budget,
      state: "running",
      createdAt: Date.now(),
      scope,
      roots,
      participants: reachable(roots, doc.edges, doc.nodes),
      graph: structuredClone({ nodes: doc.nodes, edges: doc.edges }),
      listLimit: doc.settings.listLimit ?? DEFAULT_LIST_LIMIT,
      steps: [],
      tokens: [],
      notes: [],
      deliverables: []
    };
    for (const node2 of run.graph.nodes) {
      if (node2.flowType !== "flowspace/fanout") continue;
      const inputs = run.graph.edges.filter((edge2) => edge2.target === node2.id && edge2.kind === "reference");
      for (const edge2 of inputs) {
        const frozen = staticFanoutContent({ nodes: run.graph.nodes, edges: [edge2], settings: doc.settings }, node2.id);
        if (!frozen) continue;
        if (inputs.length > 1 && frozen.items)
          frozen.items = frozen.items.map((item) => ({ ...item, key: JSON.stringify([edge2.id, item.key]) }));
        edge2.snapshotContent = frozen;
      }
    }
    this.runs.push(run);
    return run;
  }
  /** Only direct user input not already owned by a workflow creates a chat run. */
  native(sessionId, requestId, task, canvas = false, sources = []) {
    return this.transact(async () => {
      if (this.runs.some((r) => r.steps.some((s) => s.requestId === requestId)))
        return;
      const doc = this.store.document(), node2 = doc.nodes.find(
        (n) => n.kind === "agent" && n.sessionId === sessionId
      );
      if (!node2 || node2.generatedBy || isFanoutMaster(doc, node2) || node2.participation === "paused" || node2.participation === "bypassed" || !(canvas || (node2.nativeTrigger === "inherit" ? doc.settings.nativeChatTriggers : node2.nativeTrigger === "enabled")))
        return;
      syncUntitledAgentNode(node2);
      const run = this.create([node2.id], null, canvas ? "canvas" : "chat");
      const teamId = teamIdOf(node2, staffedIds(doc.nodes));
      run.steps.push({
        id: uid(),
        nodeId: node2.id,
        requestId,
        sessionId,
        ...teamId ? { teamRef: node2.teamRef ?? { teamId } } : {},
        state: "queued",
        iteration: 1,
        task,
        sources,
        createdAt: Date.now()
      });
      await this.store.submitted(node2.id, task, false);
      await this.store.changed();
    });
  }
  claim(requestId, turn, teamRef) {
    return this.transact(async () => {
      const step = this.runs.flatMap((r) => r.steps).find((s) => s.requestId === requestId);
      if (!step || step.endedAt) return;
      const existing = this.runs.flatMap((r) => r.steps).find(
        (s) => s !== step && s.sessionId === step.sessionId && s.turn === turn && !s.endedAt
      );
      if (existing) {
        existing.task += "\n\n" + step.task;
        const owner = this.runs.find((r) => r.steps.includes(step));
        owner.steps = owner.steps.filter((s) => s !== step);
        if (!owner.steps.length) this.runs.splice(this.runs.indexOf(owner), 1);
        await this.store.changed();
        return;
      }
      step.turn = turn;
      if (teamRef) step.teamRef = teamRef;
      step.state = "running";
      const run = this.runs.find((run2) => run2.steps.includes(step));
      if (run) {
        await this.status(run, step, "running");
        await this.advance(run);
      }
      await this.store.changed();
    });
  }
  /** Record native step/token telemetry from DSH session events without triggering full storage churn. */
  recordTelemetry(sessionId, turn, delta) {
    const step = this.runs.flatMap((r) => r.steps).find(
      (s) => s.sessionId === sessionId && !s.endedAt && (s.turn === turn || s.turn === void 0 || s.state === "settling")
    );
    if (!step) return false;
    step.telemetry ??= { stepCount: 0, inputTokens: 0, outputTokens: 0 };
    if (delta.addStep) step.telemetry.stepCount += 1;
    if (typeof delta.inputTokens === "number") {
      step.telemetry.inputTokens += delta.inputTokens;
    }
    if (typeof delta.outputTokens === "number") {
      step.telemetry.outputTokens += delta.outputTokens;
    }
    const owner = this.runs.find((run) => run.steps.includes(step));
    if (owner?.budget || owner?.graph.nodes.find((node2) => node2.id === step.nodeId)?.budget) {
      void this.transact(async () => {
        if (owner && await this.enforceBudget(owner, step, false)) await this.store.changed();
      }).catch((error) => console.error("FlowSpace \u9884\u7B97", error));
    }
    return true;
  }
  async enforceBudget(run, step, beforeDispatch) {
    if (["cancelled", "interrupted", "error", "completed"].includes(run.state)) return false;
    const hit = budgetHit(run, step, beforeDispatch, Date.now());
    if (!hit) return false;
    if (!run.budgetPause) {
      run.state = "paused";
      const { key, ...details } = hit;
      run.budgetPause = details;
      await this.status(run, step, "budget", `${hit.dimension}: ${hit.value} / ${hit.limit}`);
      await this.deliverEvents(run, true);
    }
    return true;
  }
  armBudget(run, step) {
    const limits = run.graph.nodes.find((node2) => node2.id === step.nodeId)?.budget;
    for (const [scope, duration, start] of [
      ["run", run.budget?.seconds, run.createdAt],
      [step.id, limits?.seconds, step.startedAt ?? Date.now()]
    ]) {
      if (duration === void 0) continue;
      this.schedule(`budget:${run.id}:${scope}`, start + duration * 1e3 + 1, async () => {
        if (await this.enforceBudget(run, step, false)) await this.store.changed();
      });
    }
  }
  deliverable(sessionId, turn, seq, time, files) {
    return this.transact(async () => {
      const run = [...this.runs].reverse().find(
        (r) => r.steps.some(
          (s) => s.sessionId === sessionId && (s.turn === turn || !s.endedAt && s.turn === void 0)
        )
      );
      const node2 = this.store.document().nodes.find((n) => n.sessionId === sessionId);
      if (!run || !node2) return;
      run.deliverables ??= [];
      for (const file of files) {
        const id = `${sessionId}:${seq}:${file.path}`;
        if (run.deliverables.some((d) => d.id === id)) continue;
        run.deliverables.push({
          id,
          nodeId: node2.id,
          sessionId,
          turn,
          seq,
          time,
          path: file.path,
          description: file.description
        });
      }
      await this.store.changed();
    });
  }
  addNoteOnce(run, note) {
    if (!run.notes.includes(note)) run.notes.push(note);
  }
  activeSessionStep(sessionId) {
    for (const run of this.runs) {
      if (run.state === "cancelled" || run.state === "interrupted") continue;
      const step = run.steps.find((entry) => entry.sessionId === sessionId && entry.state === "running" && entry.turn !== void 0 && !entry.endedAt);
      if (step) return { run, step };
    }
  }
  emissionOwner(sessionId) {
    const owner = this.activeSessionStep(sessionId);
    if (!owner || owner.step.emission?.closed) return;
    const targets = emissionTargets(owner.run, owner.step.nodeId);
    if (targets.length) return { ...owner, targets };
  }
  canEmit(sessionId) {
    return !this.disposed && !!this.emissionOwner(sessionId);
  }
  emissionState(run, step) {
    return step.emission ?? { items: [], calls: [], total: 0, limit: run.listLimit ?? DEFAULT_LIST_LIMIT, closed: false };
  }
  async emissionSnapshot(run, step, content) {
    const node2 = run.graph.nodes.find((entry) => entry.id === step.nodeId);
    let source = {
      ...snapshotWithContent(node2, content),
      kind: "conclusion",
      sourceSessionId: step.sessionId,
      seq: step.endSeq
    };
    if (this.runtime.hydrateContent && (content.spill || content.items?.some((item) => item.spill))) {
      source = await this.runtime.hydrateContent(source);
      source = { ...source, text: textOfContent(source.content) };
    }
    return this.runtime.freezeContent ? this.runtime.freezeContent(source, step.emission?.limit ?? run.listLimit, step.sessionId) : source;
  }
  async emissionDeliveries(run, step, targets, list) {
    const items = list.content.items;
    const records = [];
    if (targets.some((target) => target.type === "record")) {
      for (const item of items) {
        const content = item.spill ? { dataType: "record", spill: item.spill } : { dataType: "record", value: item.value };
        records.push(await this.emissionSnapshot(run, step, content));
      }
    }
    return targets.flatMap(
      ({ edge: edge2, node: node2, type }) => (type === "list" ? [list] : records.length ? records : [void 0]).map((source) => ({ edge: edge2, node: node2, source }))
    );
  }
  pushEmissionDeliveries(run, step, deliveries, planGate) {
    for (const { edge: edge2, node: node2, source } of deliveries) {
      this.pushToken(
        run,
        edge2,
        step,
        node2,
        this.edgeFires(run, edge2, step, true) ? source : void 0,
        planGate,
        { streamFrom: edge2.emitMode === "stream" ? step.id : step.streamFrom, fanoutBatchId: step.fanoutBatchId }
      );
    }
  }
  emit(sessionId, callId, values, signal) {
    const owner = this.emissionOwner(sessionId);
    return this.transact(async () => {
      signal.throwIfAborted();
      if (this.disposed || !owner || this.emissionOwner(sessionId)?.step !== owner.step) {
        throw new Error("\u5F53\u524D\u539F\u751F\u56DE\u5408\u6CA1\u6709\u53EF\u63A5\u6536\u7ED3\u6784\u5316\u5185\u5BB9\u7684\u6B65\u9AA4");
      }
      const { run, step, targets } = owner;
      const state = this.emissionState(run, step);
      const previous = state.calls.find((call) => call.id === callId);
      if (previous) return { accepted: previous.accepted, total: previous.total };
      checkEmissionValues(targets, values);
      const content = contentList(values, state.limit - state.items.length, [], state.items.map((item) => item.key));
      const batch = await this.emissionSnapshot(run, step, content);
      const items = batch.content.items;
      const streamTargets = targets.filter((target) => target.edge.emitMode === "stream" && (items.length || !state.calls.length && !values.length && target.type === "list"));
      const deliveries = await this.emissionDeliveries(run, step, streamTargets, batch);
      const planGate = Boolean(await this.runtime.isPlanModeActive?.(sessionId));
      signal.throwIfAborted();
      const receipt = { accepted: items.length, total: state.total + values.length };
      step.emission = {
        ...state,
        items: [...state.items, ...items],
        total: receipt.total,
        calls: [...state.calls, { id: callId, ...receipt }]
      };
      this.pushEmissionDeliveries(run, step, deliveries, planGate);
      await this.store.changed();
      if (deliveries.length) {
        await this.advance(run);
        this.settle(run);
        await this.store.changed();
      }
      return receipt;
    });
  }
  async closeEmission(run, step, targets, planGate) {
    const state = this.emissionState(run, step);
    if (state.closed) return;
    let items = state.items;
    let total = state.total;
    try {
      if (!state.calls.length) {
        const values = parseEmission(step.output ?? "");
        checkEmissionValues(targets, values);
        items = contentList(values, state.limit).items;
        total = values.length;
      }
    } catch (error) {
      step.emission = { ...state, closed: true, missing: true };
      step.state = "error";
      step.error = error instanceof Error ? error.message : String(error);
      this.addNoteOnce(run, step.error);
      return;
    }
    const endTargets = targets.filter((target) => target.edge.emitMode !== "stream" || !state.calls.length || !items.length && target.type === "record");
    if (endTargets.length) {
      const content = { dataType: "list", items, ...total > items.length ? { originalCount: total } : {} };
      const list = await this.emissionSnapshot(run, step, content);
      const deliveries = await this.emissionDeliveries(run, step, endTargets, list);
      this.pushEmissionDeliveries(run, step, deliveries, planGate);
      items = list.content.items;
    }
    step.emission = { ...state, items, total, closed: true };
  }
  /**
   * Capture upstream snapshots at exact `seq` and route tokens across outgoing active
   * edges, forwarding transparently through `bypassed` Agents (with cycle guard) and
   * respecting `paused` stops, `scope` boundaries, `confirm`/`manual` gates, and `R2` Plan gates.
   */
  async emitDownstreamTokens(run, step, sourceNode, sessionId, seq, output, planGateActive, forwarded, omit) {
    const outgoing = activeEdges(run.graph.edges).filter((edge2) => edge2.source === sourceNode.id);
    if (planGateActive && outgoing.length) {
      this.addNoteOnce(run, `${sourceNode.title}\uFF1APlan \u6A21\u5F0F\u5C1A\u672A\u9000\u51FA\u8BA1\u5212\u6001\uFF0C\u5DF2\u6682\u505C\u81EA\u52A8\u63A5\u7EED\u7B49\u5F85\u786E\u8BA4\u8BA1\u5212`);
    }
    for (const edge2 of outgoing) {
      if (omit?.has(edge2.id)) continue;
      const target = run.graph.nodes.find((node2) => node2.id === edge2.target);
      if (!target || target.participation === "paused" || !isExecutable(target) && !isContainer(target)) continue;
      const selected = (edge2.sourcePort ?? "out") === (step.route ?? "out");
      const fires = step.state !== "skipped" && this.edgeFires(run, edge2, step, selected);
      try {
        const mode2 = target.participation === "bypassed" && edge2.mode === "fork" ? "conclusion" : edge2.mode;
        const source = fires ? forwarded ?? await this.runtime.capture({ ...sourceNode, sessionId }, mode2, seq, output) : void 0;
        this.pushToken(run, edge2, step, target, source, planGateActive);
      } catch (error) {
        run.notes.push(`${sourceNode.title} \u2192 ${target.title}: ${String(error)}`);
        run.state = "error";
      }
    }
  }
  edgeFires(run, edge2, step, selected) {
    const logic = edge2.logic;
    const routed = logic?.negate ? !selected : selected;
    if (!routed) return false;
    if (step.iteration < (logic?.fromRound ?? 0)) return false;
    return logic?.maxTimes === void 0 || run.tokens.filter((token) => token.edgeId === edge2.id && !token.skip).length < logic.maxTimes;
  }
  pushToken(run, edge2, step, target, source, planGate, origin = step) {
    const now = Date.now();
    const boundary = !!source && !!run.scope && !run.scope.includes(target.id);
    const needsRelease = !!source && (planGate || boundary || edge2.trigger === "confirm" || target.participation === "manual");
    const delayUntil = source && edge2.logic?.delayMs ? now + edge2.logic.delayMs : void 0;
    const ready2 = !needsRelease && delayUntil === void 0;
    const token = {
      id: uid(),
      edgeId: edge2.id,
      stepId: step.id,
      ...origin.streamFrom ? { streamFrom: origin.streamFrom } : {},
      ...origin.fanoutBatchId && (target.generatedBy || target.flowType === "flowspace/merge-sort") ? { fanoutBatchId: origin.fanoutBatchId } : {},
      source: source ?? { id: uid(), kind: "text", sourceNodeId: edge2.source, text: "", title: "", capturedAt: now },
      ...source ? {} : { skip: true },
      ...source && planGate ? { planGate: true } : {},
      ...needsRelease ? { needsRelease: true } : {},
      createdAt: now,
      delayUntil,
      readyAt: ready2 ? now : delayUntil,
      boundary,
      ready: ready2,
      consumed: false,
      dismissed: false
    };
    if (ready2) markTokenReady(run, token, token.fanoutBatchId && step.endedAt ? step.endedAt : now);
    run.tokens.push(token);
    if (delayUntil !== void 0) this.armDelay(run, token);
  }
  forwardThroughBypass(run, node2, token, step, cycleEdges) {
    this.addNoteOnce(run, `${node2.title}\uFF1A\u5DF2\u65C1\u8DEF\u900F\u4F20\u4E0A\u6E38\u4E0A\u4E0B\u6587`);
    for (const edge2 of activeEdges(run.graph.edges).filter((candidate) => candidate.source === node2.id)) {
      const target = run.graph.nodes.find((entry) => entry.id === edge2.target);
      if (!target || target.participation === "paused" || !isExecutable(target)) continue;
      const fires = !token.skip && this.edgeFires(run, edge2, step, true);
      if (cycleEdges.has(edge2.id) && run.tokens.some((seen) => seen.edgeId === edge2.id && seen.stepId === step.id && Boolean(seen.skip) === !fires)) continue;
      this.pushToken(run, edge2, step, target, fires ? token.source : void 0, false, token);
    }
  }
  finish(sessionId, turn, ending, seq, output, error, teamFollowup = false) {
    return this.transact(async () => {
      const matches2 = (s) => s.sessionId === sessionId && !s.endedAt && s.turn === turn;
      const settling = (s) => s.sessionId === sessionId && s.state === "settling";
      const run = this.runs.find((r) => r.steps.some(matches2)) ?? (teamFollowup ? this.runs.findLast((r) => r.steps.some(settling)) : void 0);
      const step = run?.steps.find(matches2) ?? run?.steps.findLast(settling);
      if (!run || !step || seq <= (step.endSeq ?? -1)) return;
      step.turn = turn;
      step.endSeq = seq;
      if (output || step.output === void 0) step.output = output;
      if (step.teamRef && ending === "completed" && this.runtime.waitForTeam) {
        step.state = "settling";
        await this.store.changed();
        this.waitForTeam(run, step, sessionId);
      } else {
        await this.finishStep(run, step, sessionId, ending, error);
      }
    });
  }
  waitForTeam(run, step, sessionId) {
    if (this.teamSettlements.has(step.id)) return;
    this.teamSettlements.add(step.id);
    const finish = (ending, error) => this.transact(async () => {
      this.teamSettlements.delete(step.id);
      if (step.state === "settling") await this.finishStep(run, step, sessionId, ending, error);
    });
    void this.runtime.waitForTeam(sessionId).then(
      () => finish("completed"),
      (error) => finish("error", String(error))
    ).catch((error) => console.error("FlowSpace team settlement:", error));
  }
  async finishStep(run, step, sessionId, ending, error) {
    step.endedAt = Date.now();
    step.telemetry ??= { stepCount: 1, inputTokens: 0, outputTokens: 0 };
    if (step.telemetry.stepCount === 0) step.telemetry.stepCount = 1;
    step.telemetry.durationMs = Math.max(0, step.endedAt - step.createdAt);
    step.state = ending === "completed" || ending === "aborted" || ending === "interrupted" ? ending : "error";
    step.error = error ?? (step.state === "error" ? ending : void 0);
    this.clearTimer(`budget:${run.id}:${step.id}`);
    await this.enforceBudget(run, step, false);
    if (step.parameterRetryFor) {
      const target = run.steps.find((entry) => entry.id === step.parameterRetryFor);
      if (target?.operation && target.state === "awaiting" && !["cancelled", "interrupted"].includes(run.state)) {
        const data = step.operationParameters?.[target.nodeId] ?? {};
        for (const field of target.operation.missing) {
          if (data[field]?.trim()) target.operation.values[field] = data[field];
        }
        target.operation.missing = target.operation.missing.filter((field) => !target.operation.values[field]?.trim());
        target.operation.review = true;
        delete target.human;
        target.state = "running";
        await this.store.changed();
        this.execute(run, target, run.graph.nodes.find((node2) => node2.id === target.nodeId));
      }
      if (step.state === "error" || step.state === "interrupted") step.state = "skipped";
      this.settle(run);
      await this.store.changed();
      return;
    }
    await this.status(run, step, step.state === "completed" ? "done" : "error", step.error ?? step.output, ending);
    if (step.state === "completed" && !["cancelled", "interrupted"].includes(run.state)) {
      step.route = "out";
      const node2 = run.graph.nodes.find((n) => n.id === step.nodeId);
      const planGateActive = Boolean(await this.runtime.isPlanModeActive?.(sessionId));
      await this.deliverAgentResult(run, step, node2, planGateActive);
      await this.store.changed();
      if (run.state !== "error") await this.advance(run);
    } else {
      if (step.emission) step.emission.closed = true;
      if (step.fanoutBatchId || run.fanouts?.some((batch) => batch.producerStepId === step.id)) await this.advance(run);
    }
    this.settle(run);
    await this.store.changed();
  }
  async deliverAgentResult(run, step, node2, planGate) {
    const targets = emissionTargets(run, step.nodeId);
    const omit = new Set(targets.map((target) => target.edge.id));
    if (!step.reminderFor) {
      for (const token of run.tokens) if (token.stepId === step.id) omit.add(token.edgeId);
      await this.emitDownstreamTokens(
        run,
        step,
        node2,
        step.sessionId,
        step.endSeq,
        step.output ?? "",
        planGate,
        void 0,
        omit
      );
    }
    if (targets.length) {
      try {
        await this.closeEmission(run, step, targets, planGate);
      } catch (error) {
        step.state = "error";
        step.error = String(error);
        this.addNoteOnce(run, step.error);
      }
    }
  }
  remindEmission(runId, stepId) {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const prior = run.steps.find((step) => step.id === stepId);
      if (!prior?.emission?.missing) throw new Error("\u8BE5\u6B65\u9AA4\u6CA1\u6709\u9700\u8981\u8865\u4EA4\u7684\u7ED3\u6784\u5316\u8F93\u51FA");
      if (prior.emission.reminderStepId) return;
      if (["cancelled", "interrupted", "paused"].includes(run.state)) throw new Error("\u5F53\u524D\u8FD0\u884C\u65E0\u6CD5\u8865\u4EA4\u8F93\u51FA");
      run.state = "running";
      await this.enqueue(run, prior.nodeId, prior.sources, true, prior);
      this.settle(run);
      await this.store.changed();
    });
  }
  stopSettlingTeam(sessionId) {
    return this.transact(async () => {
      for (const run of this.runs) {
        for (const step of run.steps) {
          if (step.sessionId === sessionId && step.state === "settling") {
            await this.finishStep(run, step, sessionId, "aborted");
          }
        }
      }
    });
  }
  async finishExecStep(run, step, result, skipped = false) {
    const node2 = run.graph.nodes.find((n) => n.id === step.nodeId);
    step.state = skipped ? "skipped" : "completed";
    step.route = result.route;
    if (result.route === "error") step.error ??= result.output;
    step.output = result.output;
    step.verdict = result.verdict;
    if (result.dataCalls) step.dataCalls = result.dataCalls;
    if (!skipped && result.route !== "error" && descriptorOf(node2.flowType)?.family === "data") {
      step.outputContent = result.source.content;
      if (node2.flowType === "flowspace/accumulate" && result.source.content) {
        await this.store.recordAccumulator?.(run, step, node2, result.source);
        const states = run.accumulators ??= [];
        const state = states.find((existing) => existing.nodeId === node2.id);
        if (state) state.content = result.source.content;
        else states.push({ nodeId: node2.id, content: result.source.content });
      }
    }
    step.endedAt = Date.now();
    step.telemetry = {
      stepCount: 1,
      inputTokens: 0,
      outputTokens: 0,
      ...result.telemetry,
      durationMs: step.endedAt - step.createdAt
    };
    this.clearTimer(`budget:${run.id}:${step.id}`);
    await this.enforceBudget(run, step, false);
    if (!skipped) await this.status(run, step, result.route === "error" ? "error" : "done", result.output, result.route);
    await this.emitDownstreamTokens(run, step, node2, void 0, void 0, result.output, false, result.source);
    await this.advance(run);
    this.settle(run);
    await this.store.changed();
  }
  execute(run, step, node2) {
    const controller = new AbortController();
    this.executions.set(step.id, controller);
    const recordCall = (trace) => this.transact(async () => {
      if (this.disposed) return;
      (step.dataCalls ??= []).push(trace);
      const telemetry = step.telemetry ??= { stepCount: 0, inputTokens: 0, outputTokens: 0 };
      telemetry.stepCount++;
      telemetry.inputTokens += trace.inputTokens;
      telemetry.outputTokens += trace.outputTokens;
      await this.enforceBudget(run, step, false);
      await this.store.changed();
    });
    const dispatch = async (previous) => {
      if (!this.runtime.execute) throw new Error("Host \u672A\u6CE8\u518C\u8282\u70B9\u6267\u884C\u5668");
      const configured = step.resolvedConfig ? { ...node2, config: step.resolvedConfig } : node2;
      return this.runtime.execute(configured, step, controller.signal, { runId: run.id, listLimit: run.listLimit, previous, recordCall });
    };
    const complete = async (result, error) => {
      this.executions.delete(step.id);
      if (controller.signal.aborted || step.state !== "running" || this.disposed) return;
      if (!result) {
        step.error = String(error);
        result = { route: "error", output: step.error, source: await forwardInput(node2, step) };
      }
      if (result.operation) step.operation = result.operation;
      if (result.operationResult) step.operationResult = result.operationResult;
      if ("awaiting" in result) {
        step.state = "awaiting";
        step.human = result.awaiting;
        this.armHuman(run, step);
        await this.status(run, step, "waiting", step.human.question);
        await this.advance(run);
        this.settle(run);
        await this.store.changed();
      } else {
        await this.finishExecStep(run, step, result);
      }
    };
    const work = node2.flowType === "flowspace/accumulate" ? this.transact(async () => {
      if (controller.signal.aborted || step.state !== "running" || this.disposed) return;
      const previous = run.accumulators?.find((state) => state.nodeId === node2.id)?.content;
      let result;
      try {
        result = await dispatch(previous);
      } catch (error) {
        await complete(void 0, error);
        return;
      }
      await complete(result);
    }) : dispatch().then(
      (result) => this.transact(() => complete(result)),
      (error) => this.transact(() => complete(void 0, error))
    );
    void work.catch((error) => console.error("FlowSpace \u8282\u70B9\u6267\u884C\u6536\u5C3E\u5931\u8D25", error));
  }
  clearTimer(id) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }
  schedule(id, deadline, action) {
    this.clearTimer(id);
    if (this.disposed) return;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      if (Date.now() < deadline) this.schedule(id, deadline, action);
      else void this.transact(action).catch((error) => console.error("FlowSpace \u8C03\u5EA6\u5B9A\u65F6\u5668", error));
    }, Math.min(2147483647, Math.max(0, deadline - Date.now())));
    timer.unref();
    this.timers.set(id, timer);
  }
  armDelay(run, token) {
    if (token.delayUntil === void 0) return;
    this.schedule(token.id, token.delayUntil, async () => {
      if (this.disposed || token.consumed || token.dismissed || ["cancelled", "interrupted"].includes(run.state)) return;
      delete token.delayUntil;
      token.ready = !token.needsRelease && !token.loopCapReached;
      if (token.ready) markTokenReady(run, token);
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }
  armHuman(run, step) {
    const human2 = step.human;
    if (human2?.deadline === void 0 || !human2.timeoutAction || human2.timeoutAction === "wait") return;
    this.schedule(step.id, human2.deadline, async () => {
      if (this.disposed || step.state !== "awaiting" || ["cancelled", "interrupted"].includes(run.state)) return;
      const route = human2.timeoutAction === "default" ? human2.defaultOption : human2.timeoutAction === "skip" ? "skip" : "timeout";
      await this.resolveHuman(run, step, route, human2.timeoutAction === "skip");
    });
  }
  async resolveHuman(run, step, route, skip = false) {
    this.clearTimer(step.id);
    const node2 = run.graph.nodes.find((n) => n.id === step.nodeId);
    const source = route === "out" && step.human?.fields && step.human.initial ? this.humanSource(node2, step, step.human.initial) : await forwardInput(node2, step, this.runtime.contextText?.bind(this.runtime));
    await this.finishExecStep(run, step, { route, source, output: route, verdict: { branch: route } }, skip);
  }
  humanSource(node2, step, values) {
    if (node2.flowType === "flowspace/human-score")
      values = { ...values, reviewed: step.sources[0]?.content?.value ?? step.sources[0]?.text ?? "" };
    return snapshotWithContent(node2, node2.flowType === "flowspace/human-review" ? { dataType: "text", value: String(values.text ?? "") } : { dataType: "record", value: values });
  }
  answerHuman(runId, stepId, option, values) {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const step = run.steps.find((s) => s.id === stepId);
      if (step?.state !== "awaiting" || !step.human) throw new Error("\u8BE5\u6B65\u9AA4\u6CA1\u6709\u7B49\u5F85\u56DE\u7B54\u7684\u95EE\u9898");
      if (!step.human.options.includes(option)) throw new Error("\u65E0\u6548\u7684\u4EBA\u5DE5\u9009\u9879");
      if (step.human.operation && option === "execute" && step.operation) {
        for (const key of step.operation.missing) {
          if (typeof values?.[key] !== "string" || !values[key].trim()) throw new Error(`\u8BF7\u586B\u5199 ${key}`);
        }
        for (const key of step.operation.missing) step.operation.values[key] = values[key];
        step.operation.missing = [];
        step.operation.approved = true;
        delete step.human;
        step.state = "running";
        run.state = "running";
        await this.store.changed();
        this.execute(run, step, run.graph.nodes.find((node2) => node2.id === step.nodeId));
        return;
      }
      if (step.human.operation && option === "skip") {
        await this.resolveHuman(run, step, "skip", true);
        return;
      }
      if (step.human.operation && option === "retry" && step.operation?.sessionId) {
        if (run.steps.some((entry) => entry.parameterRetryFor === step.id)) throw new Error("\u5DF2\u7ECF\u5411\u4E0A\u6E38\u8FFD\u95EE");
        const prior = run.steps.find((entry) => step.upstreamStepIds?.includes(entry.id) && entry.sessionId === step.operation?.sessionId);
        if (!prior) throw new Error("\u65E0\u6CD5\u627E\u5230\u4E0A\u6E38\u4F1A\u8BDD");
        const retry = {
          id: uid(),
          requestId: uid(),
          nodeId: prior.nodeId,
          sessionId: prior.sessionId,
          task: "\u8BF7\u8C03\u7528 provide_flow_parameters \u8865\u9F50\u4E0A\u4E00\u8F6E\u672A\u63D0\u4F9B\u7684\u53C2\u6570\u3002\u64CD\u4F5C\u5C06\u7531 FlowSpace \u6267\u884C\u3002",
          parameterRetryFor: step.id,
          state: "queued",
          iteration: prior.iteration,
          sources: step.sources,
          createdAt: Date.now(),
          startedAt: Date.now()
        };
        step.human.options = step.human.options.filter((option2) => option2 !== "retry");
        run.steps.push(retry);
        await this.store.changed();
        await this.runtime.send(retry);
        return;
      }
      if (step.human.fields && option === "skip") {
        await this.resolveHuman(run, step, "skip", true);
        return;
      }
      if (step.human.fields && option === "out") {
        this.clearTimer(step.id);
        const node2 = run.graph.nodes.find((node3) => node3.id === step.nodeId);
        const answer = checkAnswers(step.human.fields, values ?? {});
        const source = this.humanSource(node2, step, answer);
        step.human.initial = answer;
        await this.finishExecStep(run, step, { route: "out", source, output: source.text });
        return;
      }
      await this.resolveHuman(run, step, option);
    });
  }
  async advance(run) {
    if (this.disposed) return;
    if (run.state === "paused") await this.fanout.collectCompleted(run);
    else if (!["cancelled", "interrupted", "error"].includes(run.state)) await this.advanceRun(run);
    await this.wakeFanouts(run);
  }
  async wakeFanouts(except) {
    for (const other of this.runs) {
      if (other === except || !["running", "waiting"].includes(other.state) || !this.fanout.hasAdmission(other)) continue;
      await this.advanceRun(other);
      this.settle(other);
    }
  }
  async advanceRun(run) {
    let expanded;
    do {
      await this.advanceGraph(run);
      await this.deliverContainers(run);
      await this.deliverEvents(run);
      expanded = await this.fanout.pump(
        run,
        (edge2, step, input, batch) => {
          const target = run.graph.nodes.find((node2) => node2.id === edge2.target);
          this.pushToken(run, edge2, step, target, input, false, { fanoutBatchId: batch.id });
        },
        (merge, batch, result, error) => this.finishMerge(run, merge, batch, result, error),
        (batch, lane) => this.cancelFanoutLane(run, batch, lane)
      );
    } while (expanded && run.state !== "error");
  }
  async deliverContainers(run) {
    const deliveries = new Map(run.graph.edges.filter((edge2) => edge2.kind !== "reference" && run.graph.nodes.some((node2) => node2.id === edge2.target && isContainer(node2))).map((edge2) => [edge2.id, edge2]));
    for (const token of run.tokens) {
      const edge2 = deliveries.get(token.edgeId);
      if (!edge2 || !token.ready || token.dismissed || token.consumed) continue;
      if (!token.skip) {
        try {
          await this.store.deliver?.(run, edge2, token);
        } catch (error) {
          run.state = "error";
          this.addNoteOnce(run, `\u6295\u9012\u5931\u8D25\uFF1A${String(error)}`);
        }
      }
      consumeToken(token);
    }
  }
  async deliverEvents(run, budgetOnly = false) {
    const edges = new Map(run.graph.edges.filter((edge2) => edge2.kind === "event").map((edge2) => [edge2.id, edge2]));
    for (const token of run.tokens) {
      const edge2 = edges.get(token.edgeId);
      if (!edge2 || token.consumed || !token.ready || token.dismissed) continue;
      if (budgetOnly && (!edge2.event?.kinds.includes("budget") || run.graph.nodes.find((node2) => node2.id === edge2.target)?.flowType !== "flowspace/notice")) continue;
      consumeToken(token);
      if (!token.skip) await this.enqueue(run, edge2.target, [token.source], true, void 0, {
        upstreamStepIds: [token.stepId],
        sourcePorts: [edge2.targetPort ?? "in"]
      });
    }
  }
  async finishMerge(run, node2, batch, source, error) {
    const now = Date.now();
    const step = {
      id: uid(),
      requestId: uid(),
      nodeId: node2.id,
      iteration: run.steps.filter((other) => other.nodeId === node2.id).length + 1,
      fanoutId: batch.fanId,
      fanoutBatchId: batch.id,
      state: error ? "error" : "completed",
      route: error ? "error" : "out",
      error,
      task: "",
      sources: [source],
      output: source.text,
      createdAt: now,
      endedAt: now
    };
    batch.mergeStepId = step.id;
    run.steps.push(step);
    if (run.graph.edges.some((edge2) => edge2.source === batch.groupId && edge2.kind === "event"))
      await this.status(run, { ...step, nodeId: batch.groupId }, error ? "error" : "done", error ?? source.text);
    if (!error && node2.config?.sortMode && node2.config.sortMode !== "off") {
      step.state = "running";
      delete step.route;
      delete step.endedAt;
      await this.store.changed();
      this.execute(run, step, node2);
      return;
    }
    await this.emitDownstreamTokens(run, step, node2, void 0, void 0, source.text, false, source);
  }
  async cancelFanoutLane(run, batch, lane) {
    for (const step of run.steps.filter((step2) => step2.fanoutBatchId === batch.id && step2.itemKey === lane.item.key && (activeStep(step2) || step2.state === "awaiting"))) {
      await this.stopStep(step);
      step.state = "aborted";
      step.endedAt = Date.now();
    }
    const edges = new Set(run.graph.edges.filter((edge2) => edge2.generatedBy === batch.fanId && edge2.itemKey === lane.item.key).map((edge2) => edge2.id));
    for (const token of run.tokens) {
      if (token.fanoutBatchId !== batch.id || !edges.has(token.edgeId) || token.consumed) continue;
      this.clearTimer(token.id);
      token.dismissed = true;
      consumeToken(token);
    }
    lane.state = "cancelled";
    lane.endedAt = Date.now();
  }
  async advanceGraph(run) {
    const nodes = new Map(run.graph.nodes.map((node2) => [node2.id, node2]));
    const links = activeEdges(run.graph.edges).filter((edge2) => {
      const source = nodes.get(edge2.source), target = nodes.get(edge2.target);
      return source && target && (isExecutable(source) || source.flowType === triggerNode.flowType) && isExecutable(target) && !source.removed && !target.removed && !isFanoutMaster(run.graph, source) && !isFanoutMaster(run.graph, target) && !(edge2.generatedBy && target.flowType === "flowspace/merge-sort") && source.participation !== "paused" && target.participation !== "paused";
    });
    const edges = new Map(links.map((edge2) => [edge2.id, edge2]));
    const { component, rank, cyclic } = graphOrder(run.graph.nodes, links, run.roots);
    const bypassNodes = run.graph.nodes.filter((node2) => node2.participation === "bypassed");
    const bypassLinks = links.filter((edge2) => nodes.get(edge2.source)?.participation === "bypassed" && nodes.get(edge2.target)?.participation === "bypassed");
    const bypassOrder = graphOrder(bypassNodes, bypassLinks, []);
    const bypassCycles = new Set(bypassLinks.filter((edge2) => {
      const group = bypassOrder.component.get(edge2.source);
      return bypassOrder.cyclic.has(group) && group === bypassOrder.component.get(edge2.target);
    }).map((edge2) => edge2.id));
    const feedback = /* @__PURE__ */ new Set();
    const limits = /* @__PURE__ */ new Map();
    for (const edge2 of links) {
      const group = component.get(edge2.source);
      if (!cyclic.has(group) || group !== component.get(edge2.target)) continue;
      limits.set(group, Math.min(limits.get(group) ?? Infinity, edge2.maxRounds));
      if (rank.get(edge2.source) >= rank.get(edge2.target)) feedback.add(edge2.id);
    }
    let progressed;
    do {
      progressed = false;
      const steps = new Map(run.steps.map((step) => [step.id, step]));
      const frontier = run.steps.filter((s) => activeStep(s) || ["awaiting", "error", "interrupted", "aborted"].includes(s.state)).map((s) => s.nodeId);
      const delivered = /* @__PURE__ */ new Set();
      for (const token of run.tokens) {
        const edge2 = edges.get(token.edgeId);
        if (!edge2) continue;
        delivered.add(edge2.id);
        if (token.consumed || token.dismissed) continue;
        if (token.skip && feedback.has(edge2.id)) {
          consumeToken(token);
          progressed = true;
        } else {
          frontier.push(edge2.target);
        }
      }
      const producers = new Set(reachable([...new Set(frontier)], links));
      for (const nodeId of run.participants) {
        const node2 = nodes.get(nodeId);
        if (!node2 || !isExecutable(node2) || node2.participation === "paused") continue;
        const incoming = links.filter((edge2) => edge2.target === nodeId && (delivered.has(edge2.id) || producers.has(edge2.source)));
        if (!incoming.length) continue;
        const pending2 = run.tokens.filter((token) => !token.consumed && !token.dismissed && edges.get(token.edgeId)?.target === nodeId);
        if (!pending2.length) continue;
        if (node2.participation === "bypassed") {
          for (const token of pending2) {
            if (!token.ready) continue;
            consumeToken(token);
            if (!token.skip || !feedback.has(token.edgeId)) {
              this.forwardThroughBypass(run, node2, token, steps.get(token.stepId), bypassCycles);
            }
            progressed = true;
          }
          continue;
        }
        const batchId = node2.generatedBy ? pending2[0]?.fanoutBatchId : void 0;
        const count = run.steps.filter((step) => step.nodeId === nodeId && (!batchId || step.fanoutBatchId === batchId)).length;
        const group = component.get(nodeId);
        const limit = limits.get(group) ?? Infinity;
        if (count >= limit) {
          for (const token of pending2) {
            if (token.skip || token.loopCapReached) continue;
            token.loopCapReached = true;
            token.ready = false;
            delete token.readyAt;
            this.addNoteOnce(run, `${node2.title}\uFF1A\u5DF2\u8FBE\u5230\u5FAA\u73AF\u4E0A\u9650\uFF08${limit} \u8F6E\uFF09\uFF0C\u53EF\u70B9\u51FB\u300C+1 \u8F6E\u300D\u7EE7\u7EED\u6216\u8DF3\u8FC7\u5B8C\u6210`);
          }
        }
        const chosen = [];
        let missing = false;
        for (const edge2 of incoming) {
          const back = feedback.has(edge2.id);
          if (back && count === 0) continue;
          const internal = component.get(edge2.source) === group;
          const candidates = run.tokens.filter((token2) => {
            if (token2.edgeId !== edge2.id || token2.dismissed || batchId && token2.fanoutBatchId !== batchId) return false;
            if (!internal) return true;
            const origin = steps.get(token2.stepId);
            if (component.get(origin.nodeId) !== group) return true;
            const sourceFeedsBack = rank.get(origin.nodeId) >= rank.get(nodeId);
            return origin.iteration === count + (sourceFeedsBack ? 0 : 1);
          });
          let token = candidates.find((t2) => !t2.consumed && (!back || !t2.skip));
          if (back && !token && candidates.some((t2) => t2.skip)) continue;
          if (!token && !internal && cyclic.has(group)) token = candidates.at(-1);
          if (!token?.ready) {
            missing = true;
            break;
          }
          chosen.push(token);
        }
        if (missing || !chosen.some((token) => !token.consumed)) continue;
        const live = chosen.filter((token) => !token.skip);
        const fires = live.some((token) => !token.consumed);
        chosen.forEach(consumeToken);
        progressed = true;
        if (fires) {
          await this.enqueue(run, nodeId, live.map((token) => token.source), true, void 0, {
            ...node2.kind === "flow" ? { sourcePorts: live.map((token) => edges.get(token.edgeId)?.targetPort ?? "in") } : {},
            fanoutBatchId: batchId,
            streamFrom: live.find((token) => token.streamFrom)?.streamFrom,
            upstreamStepIds: [...new Set(live.map((token) => token.stepId))]
          });
        } else {
          const now = Date.now();
          const step = {
            id: uid(),
            requestId: uid(),
            nodeId,
            iteration: count + 1,
            state: "skipped",
            sources: [],
            task: "",
            createdAt: now,
            endedAt: now,
            ...batchId ? { fanoutBatchId: batchId, fanoutId: node2.generatedBy, itemKey: node2.itemKey } : {}
          };
          run.steps.push(step);
          steps.set(step.id, step);
          const pair = node2.flowType === "flowspace/fanout" && fanoutPair(run.graph, node2.id);
          if (pair) {
            const merge = { ...step, id: uid(), requestId: uid(), nodeId: pair.merge.id, fanoutId: node2.id };
            run.steps.push(merge);
            await this.emitDownstreamTokens(run, merge, pair.merge, void 0, void 0, "", false);
          } else await this.emitDownstreamTokens(run, step, node2, void 0, void 0, "", false);
        }
      }
    } while (progressed && run.state !== "error");
  }
  /** Extend bounded-loop round budget (`+1 Round` gate) and immediately advance parked feedback tokens. */
  extendLoop(request) {
    return this.transact(async () => {
      const run = this.requireRun(request.runId);
      if (["cancelled", "interrupted"].includes(run.state)) return;
      const extra = Math.max(1, Math.trunc(request.extraRounds ?? 1));
      const order = graphOrder(run.graph.nodes, run.graph.edges, run.roots);
      const targetComps = /* @__PURE__ */ new Set();
      if (request.edgeId) {
        const edge2 = run.graph.edges.find((e) => e.id === request.edgeId);
        const comp = edge2 ? order.component.get(edge2.target) : void 0;
        if (comp !== void 0 && order.cyclic.has(comp)) targetComps.add(comp);
      } else if (request.nodeId) {
        const comp = order.component.get(request.nodeId);
        if (comp !== void 0 && order.cyclic.has(comp)) targetComps.add(comp);
      } else {
        for (const t2 of run.tokens) {
          if (!t2.loopCapReached || t2.consumed || t2.dismissed) continue;
          const edge2 = run.graph.edges.find((e) => e.id === t2.edgeId);
          const comp = edge2 ? order.component.get(edge2.target) : void 0;
          if (comp !== void 0 && order.cyclic.has(comp))
            targetComps.add(comp);
        }
      }
      if (!targetComps.size) return;
      for (const edge2 of activeEdges(run.graph.edges)) {
        const sc = order.component.get(edge2.source);
        const tc = order.component.get(edge2.target);
        if (sc !== void 0 && sc === tc && targetComps.has(sc)) {
          edge2.maxRounds += extra;
        }
      }
      for (const token of run.tokens) {
        if (!token.loopCapReached || token.consumed || token.dismissed)
          continue;
        const edge2 = run.graph.edges.find((e) => e.id === token.edgeId);
        const comp = edge2 ? order.component.get(edge2.target) : void 0;
        if (comp !== void 0 && targetComps.has(comp)) {
          delete token.loopCapReached;
          if (!token.boundary && !token.planGate && !token.needsRelease && token.delayUntil === void 0) {
            token.ready = true;
            markTokenReady(run, token);
          }
        }
      }
      if (run.state === "waiting") run.state = "running";
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }
  async enqueue(run, nodeId, sources, isContinuation = false, reminder, origin = {}, reuseReferences = false) {
    const liveDoc = this.store.document();
    const liveNode = liveDoc.nodes.find((n) => n.id === nodeId);
    const node2 = run.graph.nodes.find((n) => n.id === nodeId);
    if (!node2.generatedBy && liveNode?.continuationPrompt !== void 0) {
      node2.continuationPrompt = liveNode.continuationPrompt;
    }
    if (!node2.generatedBy && liveNode?.planMode !== void 0) {
      node2.planMode = liveNode.planMode;
    }
    syncUntitledAgentNode(node2);
    if (liveNode) syncUntitledAgentNode(liveNode);
    const task = reminder ? `\u8BF7\u8C03\u7528 flow_emit \u8865\u4EA4\u4E0A\u4E00\u8F6E\u4EFB\u52A1\u8981\u6C42\u7684\u7ED3\u6784\u5316\u5185\u5BB9\u3002

${reminder.task}` : isContinuation ? (node2.continuationPrompt ?? "").trim() || (node2.sessionId ? node2.task.trim() || node2.draft.trim() : node2.draft.trim() || node2.task.trim()) : node2.draft.trim() || node2.task.trim() || (node2.continuationPrompt ?? "").trim();
    if (!task && node2.kind !== "flow") {
      run.notes.push(`${node2.title}\uFF1A\u5C1A\u672A\u586B\u5199\u4EFB\u52A1`);
      run.state = "error";
      return;
    }
    const step = {
      id: uid(),
      nodeId,
      requestId: uid(),
      state: "queued",
      iteration: run.steps.filter((s) => s.nodeId === nodeId).length + 1,
      task,
      sources: [...sources],
      ...node2.generatedBy ? { fanoutId: node2.generatedBy, itemKey: node2.itemKey } : {},
      ...origin,
      createdAt: Date.now(),
      ...reminder ? { reminderFor: reminder.id } : {}
    };
    if (node2.kind === "flow") {
      step.sourcePorts = [...origin.sourcePorts ?? sources.map((source) => run.graph.edges.find((edge2) => edge2.source === source.sourceNodeId && edge2.target === nodeId)?.targetPort ?? "in")];
    }
    run.steps.push(step);
    if (reminder?.emission) reminder.emission.reminderStepId = step.id;
    try {
      const pendingSentUpdates = [];
      for (const edge2 of (reminder ? [] : run.graph.edges).filter(
        (e) => e.target === nodeId && (e.kind === "reference" || e.trigger === "off")
      )) {
        const source = run.graph.nodes.find((n) => n.id === edge2.source);
        if (!source) continue;
        if (reuseReferences && sources.some((saved, index) => saved.sourceNodeId === edge2.source && (!origin.sourcePorts || origin.sourcePorts[index] === (edge2.targetPort ?? "in")))) continue;
        const variable = source.flowType === "flowspace/variable" && this.store.variableReference?.(run, step, source);
        const captured = variable || (source.kind === "agent" ? await this.runtime.capture(source, edge2.mode) : await this.runtime.reference(source, edge2, node2, run.listLimit));
        if (captured.referenceKind === "board-card" && captured.missing) continue;
        const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
        edge2.currentVersion = version;
        if (source.kind === "display" && source.sourceNodeId) {
          const replaced = source.sourceNodeId;
          if (step.sourcePorts) step.sourcePorts = step.sourcePorts.filter((_, i) => step.sources[i].sourceNodeId !== replaced);
          step.sources = step.sources.filter(
            (s) => s.sourceNodeId !== source.sourceNodeId
          );
        }
        if (edge2.kind === "reference" && node2.kind !== "flow" && !edge2.always && edge2.sentVersion === version)
          continue;
        step.sources.push(captured);
        step.sourcePorts?.push(edge2.targetPort ?? "in");
        pendingSentUpdates.push({ edge: edge2, version });
      }
      if (new Set(
        step.sources.filter((s) => s.kind === "session").map((s) => s.sourceSessionId)
      ).size > 3)
        throw new Error("\u4E00\u6B21\u4F1A\u8BDD\u5F15\u7528\u6700\u591A\u5305\u542B\u4E09\u4E2A\u6765\u6E90\uFF1B\u66F4\u591A\u6765\u6E90\u53EF\u6539\u7528\u7ED3\u8BBA");
      await this.store.prepareStep?.(run, step, node2);
      const debug = {
        originalTask: task,
        continuation: isContinuation,
        references: pendingSentUpdates.map(({ edge: edge2, version }) => ({ edgeId: edge2.id, version })),
        tools: this.store.toolsFor?.(run, step) ?? []
      };
      const over = node2.flowType !== "flowspace/notice" && await this.enforceBudget(run, step, true);
      if (over || node2.breakpoint || run.singleStep) {
        step.state = "awaiting";
        step.debug = { reason: over ? "budget" : "breakpoint", ...debug };
        run.singleStep = false;
        if (!over) await this.status(run, step, "waiting");
        await this.store.changed();
        return;
      }
      await this.admitPrepared(run, step, node2, debug);
    } catch (e) {
      step.state = "error";
      step.error = String(e);
      step.endedAt = Date.now();
    }
  }
  async admitPrepared(run, step, node2, prepared) {
    const { originalTask, continuation, references } = prepared;
    const pendingSentUpdates = references.flatMap(({ edgeId, version }) => {
      const edge2 = run.graph.edges.find((edge3) => edge3.id === edgeId);
      return edge2 ? [{ edge: edge2, version }] : [];
    });
    const liveDoc = this.store.document();
    const nodeId = node2.id;
    const fork = step.sources.find((s) => s.kind === "fork");
    step.startedAt = Date.now();
    this.armBudget(run, step);
    if (node2.kind === "flow") {
      step.state = "running";
      for (const { edge: edge2, version } of pendingSentUpdates) edge2.sentVersion = version;
      if (node2.flowType === "flowspace/fanout") {
        await this.fanout.receive(run, node2, step);
        await this.store.changed();
        return;
      }
      await this.store.changed();
      this.execute(run, step, node2);
      return;
    }
    const current = liveDoc.nodes.find((n) => n.id === nodeId);
    if (current?.sessionId) node2.sessionId = current.sessionId;
    step.sessionId = await this.runtime.ensure(
      node2,
      node2.sessionId || node2.generatedBy ? void 0 : fork,
      laneSessionTitle(run, node2)
    );
    node2.sessionId = step.sessionId;
    const teamId = teamIdOf(node2, staffedIds(liveDoc.nodes));
    if (teamId) step.teamRef = this.runtime.teamReference?.(step.sessionId) ?? node2.teamRef ?? { teamId };
    await this.store.bound(nodeId, step.sessionId, fork);
    if (fork)
      for (const e of run.graph.edges.filter(
        (e2) => e2.target === nodeId && e2.mode === "fork"
      )) {
        e.originMode = "fork";
        e.mode = "conclusion";
      }
    await this.store.changed();
    await this.runtime.send(step);
    const currentDoc = this.store.document();
    for (const { edge: edge2, version } of pendingSentUpdates) {
      edge2.sentVersion = version;
      const live = currentDoc.edges.find((e) => e.id === edge2.id);
      if (live) {
        live.sentVersion = version;
        live.currentVersion = version;
      }
    }
    if (!step.reminderFor) await this.store.submitted(nodeId, originalTask, continuation);
    await this.store.changed();
  }
  debugStep(runId, stepId, action, task) {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      const step = run.steps.find((entry) => entry.id === stepId);
      if (!step?.debug || step.state !== "awaiting" || run.budgetPause) throw new Error("\u6B64\u6B65\u9AA4\u672A\u5904\u4E8E\u53EF\u653E\u884C\u7684\u65AD\u70B9");
      const prepared = step.debug;
      if (task !== void 0) step.task = task;
      delete step.debug;
      run.state = "running";
      run.singleStep = action === "step";
      if (action === "skip") await this.resolveHuman(run, step, "skip", true);
      else {
        step.state = "queued";
        const node2 = run.graph.nodes.find((node3) => node3.id === step.nodeId);
        try {
          await this.admitPrepared(run, step, node2, prepared);
        } catch (error) {
          step.state = "error";
          step.endedAt = Date.now();
          step.error = String(error);
        }
      }
      this.settle(run);
      await this.store.changed();
    });
  }
  release(runId, tokenId, accept) {
    return this.transact(async () => {
      const run = this.requireRun(runId), token = run.tokens.find((t2) => t2.id === tokenId);
      if (!token || token.consumed || token.dismissed || ["cancelled", "interrupted"].includes(run.state))
        return;
      if (!accept) {
        this.clearTimer(token.id);
        token.dismissed = true;
        consumeToken(token);
        delete token.loopCapReached;
        delete token.planGate;
      } else {
        if (token.loopCapReached) {
          const edge2 = run.graph.edges.find((e) => e.id === token.edgeId);
          if (edge2) edge2.maxRounds += 1;
          delete token.loopCapReached;
        }
        delete token.planGate;
        delete token.needsRelease;
        token.ready = token.delayUntil === void 0;
        if (token.ready) markTokenReady(run, token);
        if (token.boundary && run.scope)
          run.scope.push(
            run.graph.edges.find((e) => e.id === token.edgeId).target
          );
        token.boundary = false;
      }
      if (run.state === "waiting") run.state = "running";
      await this.advance(run);
      this.settle(run);
      await this.store.changed();
    });
  }
  command(runId, action) {
    return this.transact(async () => {
      const run = this.requireRun(runId);
      if (action === "pause") {
        if (["running", "waiting"].includes(run.state)) run.state = "paused";
      } else if (action === "resume") {
        if (!["paused", "interrupted"].includes(run.state)) return;
        run.state = "running";
        if (run.budgetPause) {
          const { nodeId, dimension } = run.budgetPause;
          (run.budgetAcknowledged ??= []).push(`${nodeId ?? "run"}:${dimension}`);
          delete run.budgetPause;
          for (const step of run.steps) if (step.debug?.reason === "budget") step.debug.reason = "breakpoint";
        }
        this.restoreWaits(run);
        await this.advance(run);
        this.settle(run);
      } else {
        run.state = "cancelled";
        delete run.pendingEvents;
        for (const step of run.steps.filter((s) => activeStep(s) || s.state === "awaiting")) {
          await this.stopStep(step);
          step.state = "aborted";
          step.endedAt = Date.now();
        }
        for (const token of run.tokens) {
          this.clearTimer(token.id);
          consumeToken(token);
        }
        for (const batch of run.fanouts ?? []) {
          batch.closed = true;
          for (const lane of batch.lanes) if (lane.state === "queued" || lane.state === "running") {
            lane.state = "cancelled";
            lane.endedAt = Date.now();
          }
        }
        await this.wakeFanouts(run);
      }
      await this.store.changed();
    });
  }
  /** Safely interrupt all active runs before restoring a canvas snapshot (R10). */
  async stopStep(step) {
    this.clearTimer(step.id);
    if (step.emission) step.emission.closed = true;
    const controller = this.executions.get(step.id);
    if (controller) {
      controller.abort();
      this.executions.delete(step.id);
    } else if (step.sessionId) await this.runtime.cancel(step).catch(() => {
    });
  }
  async interruptAllActive(reasonNote) {
    for (const run of this.runs) {
      if (!["running", "waiting", "paused"].includes(run.state)) continue;
      run.state = "interrupted";
      for (const step of run.steps) {
        if (activeStep(step) || step.state === "awaiting") {
          await this.stopStep(step);
          step.state = "interrupted";
          step.endedAt = Date.now();
        }
      }
      for (const token of run.tokens) {
        this.clearTimer(token.id);
        if (!token.consumed && !token.dismissed) {
          token.dismissed = true;
        }
      }
      this.addNoteOnce(run, reasonNote);
    }
  }
  hasDurableWait(run) {
    return !!run.pendingEvents?.length || !!run.fanouts?.some((batch) => !batch.mergeStepId || batch.lanes.some((lane) => lane.state === "queued" || lane.state === "running")) || run.steps.some((step) => step.state === "awaiting") || run.tokens.some((token) => !token.consumed && !token.dismissed && token.delayUntil !== void 0);
  }
  restoreWaits(run) {
    for (const batch of run.pendingEvents ?? []) this.armEvent(run, batch);
    for (const step of run.steps) if (step.state === "awaiting") this.armHuman(run, step);
    for (const token of run.tokens) if (!token.consumed && !token.dismissed) this.armDelay(run, token);
  }
  recover() {
    return this.transact(async () => {
      const resume = [];
      for (const run of this.runs) {
        if (!["running", "waiting", "paused"].includes(run.state)) continue;
        const hadActiveSteps = run.steps.some(activeStep);
        const resumable = this.hasDurableWait(run) || run.state === "paused" && !hadActiveSteps;
        if (!resumable) run.state = "interrupted";
        for (const step of run.steps) {
          if (activeStep(step) || resumable && step.fanoutBatchId && step.sessionId && step.state === "interrupted" && step.endSeq === void 0) {
            let patch;
            try {
              patch = step.sessionId && this.runtime.reconcile ? await this.runtime.reconcile(step) : { state: "interrupted", endedAt: Date.now() };
            } catch (err) {
              patch = {
                state: "interrupted",
                endedAt: Date.now(),
                error: String(err)
              };
            }
            Object.assign(step, patch);
            if (step.state === "completed") {
              const source = run.graph.nodes.find((n) => n.id === step.nodeId);
              if (source?.kind === "agent") {
                try {
                  const planGateActive = step.sessionId ? Boolean(
                    await this.runtime.isPlanModeActive?.(step.sessionId)
                  ) : false;
                  step.route ??= "out";
                  await this.deliverAgentResult(run, step, source, planGateActive);
                } catch (err) {
                  this.addNoteOnce(
                    run,
                    `${source.title}\uFF1A\u6062\u590D\u6355\u83B7\u7ED3\u679C\u5931\u8D25\uFF08${String(err)}\uFF09`
                  );
                }
              }
            } else if (step.emission && !activeStep(step)) step.emission.closed = true;
          }
        }
        if (resumable) {
          this.restoreWaits(run);
          resume.push(run);
        }
        if (hadActiveSteps || !resumable) this.addNoteOnce(
          run,
          "Host \u5DF2\u91CD\u65B0\u542F\u52A8\u3002\u4FDD\u7559\u5DF2\u5B8C\u6210\u7ED3\u679C\uFF1B\u7EE7\u7EED\u53EA\u63A8\u8FDB\u5C1A\u672A\u6295\u9012\u7684\u63A5\u7EED\uFF0C\u4E2D\u65AD\u8282\u70B9\u8BF7\u624B\u52A8\u91CD\u8DD1\u3002"
        );
      }
      for (const run of resume) {
        await this.advance(run);
        this.settle(run);
      }
      await this.store.changed();
    });
  }
  async dispose() {
    this.disposed = true;
    for (const id of this.timers.keys()) this.clearTimer(id);
    await this.transact(async () => {
      for (const run of this.runs.filter(
        (r) => ["running", "waiting", "paused"].includes(r.state)
      )) {
        const active2 = run.steps.filter(activeStep);
        if (this.hasDurableWait(run)) {
          if (run.state !== "paused") run.state = "waiting";
        } else if (run.state !== "paused" || active2.length) run.state = "interrupted";
        for (const step of active2) {
          await this.stopStep(step);
          step.state = "interrupted";
          step.endedAt = Date.now();
        }
      }
      await this.store.changed();
    });
  }
  requireRun(id) {
    const run = this.runs.find((r) => r.id === id);
    if (!run) throw new Error("\u8FD0\u884C\u8BB0\u5F55\u4E0D\u5B58\u5728");
    return run;
  }
  settle(run) {
    for (const step of run.steps) {
      if (step.state === "completed" && step.route === "error" && step.error) step.state = "error";
    }
    if (["paused", "cancelled", "interrupted"].includes(run.state)) return;
    if (run.steps.some((s) => s.state === "awaiting"))
      run.state = "waiting";
    else if (run.steps.some(activeStep))
      run.state = "running";
    else if (run.tokens.some((t2) => !t2.skip && !t2.consumed && !t2.dismissed && !t2.ready))
      run.state = "waiting";
    else if (run.pendingEvents?.length || run.fanouts?.some((batch) => batch.lanes.some((lane) => lane.state === "queued")))
      run.state = "waiting";
    else if (run.steps.some((step) => {
      if (step.emission?.reminderStepId) return false;
      if (step.itemKey && run.fanouts?.some((batch) => batch.id === step.fanoutBatchId && batch.mergeStepId && batch.lanes.some((lane) => lane.item.key === step.itemKey && lane.adopted === false))) return false;
      if (step.state === "error" && step.route === "error") {
        return !run.tokens.some((token) => token.stepId === step.id && !token.skip);
      }
      return ["error", "aborted", "interrupted"].includes(step.state);
    }) || run.state === "error")
      run.state = "error";
    else if (run.tokens.some((t2) => !t2.skip && !t2.consumed && !t2.dismissed)) {
      run.state = "error";
      this.addNoteOnce(
        run,
        "\u63A5\u7EED\u65E0\u6CD5\u6C47\u5408\uFF1A\u6709\u5206\u652F\u88AB\u8DF3\u8FC7\u6216\u672A\u4EA7\u751F\u672C\u8F6E\u7ED3\u679C\u3002\u53EF\u4ECE\u76EE\u6807\u8282\u70B9\u624B\u52A8\u7EE7\u7EED\u3002"
      );
    } else run.state = "completed";
  }
};

// packages/flowspace/src/host/nodes/judge/ai.ts
import { z as z12 } from "zod";
var response = z12.object({
  branch: z12.string(),
  reason: z12.string(),
  confidence: z12.number().min(0).max(1)
});
async function aiJudge(llm, config, input, signal) {
  const { provider, model, branches } = config;
  if (!provider || !model) throw new Error("\u8BF7\u5148\u9009\u62E9 AI \u5224\u65AD\u7684\u4F9B\u5E94\u5546\u548C\u6A21\u578B");
  const rawOutputs = [];
  const telemetry = { stepCount: 0, inputTokens: 0, outputTokens: 0 };
  const record = { provider, model, inputSummary: input.slice(0, 240), rawOutputs };
  const system = [
    config.instruction,
    JSON.stringify(branches),
    '\u9009\u62E9\u4E00\u4E2A\u5217\u51FA\u7684\u5206\u652F\u3002\u53EA\u8FD4\u56DE JSON {"branch":"\u5206\u652F id","reason":"\u5224\u65AD\u7406\u7531","confidence":0-1}\u3002'
  ].join("\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    let raw = "";
    telemetry.stepCount++;
    for await (const chunk of llm.stream({
      provider,
      model,
      signal,
      purpose: "flowspace-judge",
      system: attempt ? system + "\n\u4E0A\u6B21\u54CD\u5E94\u65E0\u6CD5\u89E3\u6790\uFF0C\u8BF7\u4E25\u683C\u4F7F\u7528\u6307\u5B9A\u683C\u5F0F\u548C\u5206\u652F\u3002" : system,
      messages: [{ role: "user", content: [{ type: "text", text: input }] }]
    })) {
      if (chunk.type === "text-delta") raw += chunk.text;
      if (chunk.type === "usage") {
        telemetry.inputTokens += chunk.usage.inputTokens + (chunk.usage.cacheReadTokens ?? 0) + (chunk.usage.cacheWriteTokens ?? 0);
        telemetry.outputTokens += chunk.usage.outputTokens;
      }
      if (chunk.type === "finish" && (chunk.reason.kind === "error" || chunk.reason.kind === "aborted"))
        throw new Error(chunk.reason.failure.message);
    }
    rawOutputs.push(raw);
    let parsed2;
    try {
      parsed2 = JSON.parse(raw);
    } catch {
      continue;
    }
    const result = response.safeParse(parsed2);
    if (!result.success || !branches.some((b) => b.id === result.data.branch)) continue;
    const { branch, confidence, reason: reason2 } = result.data;
    const route = config.lowConfidence && confidence < config.lowConfidence.threshold ? config.lowConfidence.branch : branch;
    return { route, output: reason2, verdict: { ...record, branch: route, reason: reason2, confidence }, telemetry };
  }
  const reason = "\u8FDE\u7EED\u4E24\u6B21\u672A\u6536\u5230\u6709\u6548\u7684\u5224\u65AD\u7ED3\u679C";
  const verdict = { ...record, branch: "error", reason };
  return { route: "error", output: reason, verdict, telemetry };
}

// packages/flowspace/src/host/nodes/judge/code.ts
import { Worker } from "node:worker_threads";
var workerUrl = new URL("./src/host/nodes/judge/code-worker.mjs", import.meta.resolve("dsh-flowspace/package.json"));
async function runCode(source, input, timeoutMs, signal) {
  return runWorker(source, [input], "branch", timeoutMs, signal);
}
async function runDataCode(source, inputs, timeoutMs, signal) {
  return runWorker(source, inputs, "json", timeoutMs, signal);
}
async function runWorker(source, inputs, mode2, timeoutMs, signal) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 5e3) {
    throw new Error("\u4EE3\u7801\u5224\u65AD\u8D85\u65F6\u987B\u4E3A 100 \u5230 5000 \u6BEB\u79D2\u7684\u6574\u6570");
  }
  signal.throwIfAborted();
  const worker = new Worker(workerUrl, {
    workerData: { source, inputs, mode: mode2, timeoutMs },
    execArgv: [],
    resourceLimits: { maxOldGenerationSizeMb: 48, maxYoungGenerationSizeMb: 8, stackSizeMb: 2 }
  });
  return awaitWorkerResult(worker, signal, timeoutMs);
}
async function awaitWorkerResult(worker, signal, timeoutMs, startupMs = 1e4) {
  let timer;
  let abort;
  try {
    return await new Promise((resolve4, reject) => {
      timer = setTimeout(() => reject(new Error("\u4EE3\u7801\u5224\u65AD Worker \u521D\u59CB\u5316\u8D85\u65F6")), startupMs);
      abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      worker.once("error", reject);
      worker.once("exit", (code2) => reject(new Error(`\u4EE3\u7801\u5224\u65AD Worker \u63D0\u524D\u7ED3\u675F\uFF08${code2}\uFF09`)));
      worker.on("message", (reply) => {
        if (reply.kind === "ready") {
          clearTimeout(timer);
          timer = setTimeout(() => reject(new Error("\u4EE3\u7801\u5224\u65AD\u6267\u884C\u8D85\u65F6")), timeoutMs);
        } else if (reply.kind === "result") {
          resolve4(reply.value);
        } else {
          reject(new Error(reply.message));
        }
      });
    });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    await worker.terminate();
  }
}

// packages/flowspace/src/host/nodes/judge/index.ts
function judgeExecutors(ctx, contextText) {
  return {
    "flowspace/condition": async (node2, step) => {
      const source = await forwardInput(node2, step, contextText);
      const config = node2.config;
      const route = conditionRoute(config, source.text);
      return { route, source, output: config.branches.find((b) => b.id === route)?.label ?? route, verdict: { branch: route } };
    },
    "flowspace/code": async (node2, step, signal) => {
      const source = await forwardInput(node2, step, contextText);
      const config = node2.config;
      const value = await runCode(config.source, source, config.timeoutMs, signal);
      const route = value === true ? config.branches[0].id : value === false ? "else" : value;
      if (route !== "else" && !config.branches.some((b) => b.id === route)) throw new Error(`\u4EE3\u7801\u8FD4\u56DE\u4E86\u672A\u77E5\u5206\u652F\uFF1A${route}`);
      return { route, source, output: config.branches.find((b) => b.id === route)?.label ?? route, verdict: { branch: route } };
    },
    "flowspace/ai-judge": async (node2, step, signal) => {
      const source = await forwardInput(node2, step, contextText);
      return { ...await aiJudge(ctx.llm, node2.config, source.text, signal), source };
    },
    "flowspace/human-choice": async (node2) => {
      const config = node2.config;
      const deadline = config.timeoutSec !== void 0 && config.timeoutAction !== "wait" ? Date.now() + config.timeoutSec * 1e3 : void 0;
      return { awaiting: {
        question: config.question,
        options: config.options.map((option) => option.id),
        timeoutAction: config.timeoutAction,
        deadline,
        defaultOption: config.defaultOption
      } };
    }
  };
}

// packages/flowspace/src/host/nodes/merge.ts
function mergedInput(node2, step, format, limit) {
  const first = step.sources[0];
  if (step.sources.length === 1 && contentOf(first).dataType === format && (first.content?.items?.length ?? 0) <= limit) return first;
  const values = [];
  const keys = [];
  let total = 0;
  const sourceCounts = /* @__PURE__ */ new Map();
  for (const source of step.sources) {
    const content2 = contentOf(source);
    if (content2.items) {
      total += content2.originalCount ?? content2.items.length;
      const occurrence = sourceCounts.get(source.sourceNodeId) ?? 0;
      sourceCounts.set(source.sourceNodeId, occurrence + 1);
      for (const item of content2.items.slice(0, limit - values.length)) {
        values.push(item.value);
        keys.push(step.sources.length === 1 ? item.key : JSON.stringify([source.sourceNodeId, occurrence, item.key]));
      }
    } else {
      total++;
      if (values.length < limit) {
        values.push(content2.value === void 0 ? source.text : content2.value);
        keys.push(void 0);
      }
    }
  }
  const content = format === "list" ? contentList(values, limit, keys) : {
    dataType: "text",
    value: values.map((value) => typeof value === "string" ? value : JSON.stringify(value)).join("\n")
  };
  if (total > values.length) Object.assign(content, { originalCount: total });
  return snapshotWithContent(node2, content, step.createdAt);
}
function mergeExecutor(ctx, getListLimit = () => DEFAULT_LIST_LIMIT) {
  return async (node2, step, signal) => {
    signal.throwIfAborted();
    const config = node2.config;
    const source = mergedInput(node2, step, config.output, getListLimit(step));
    if (!config.sortMode || config.sortMode === "off") return { source, route: "out", output: source.text };
    try {
      if (config.sortMode === "ai") {
        const settings = config.ai;
        const result = await aiJudge(ctx.llm, {
          provider: settings.provider,
          model: settings.model,
          instruction: settings.instruction,
          branches: [
            { id: "pass", label: "pass", description: settings.passDescription },
            { id: "fail", label: "fail", description: settings.failDescription }
          ],
          lowConfidence: { threshold: settings.threshold, branch: "fail" }
        }, source.text, signal);
        return { ...result, source, output: result.route === "error" ? result.output : source.text };
      }
      let route;
      if (config.sortMode === "condition") {
        const selected = conditionRoute({ branches: [{ id: "pass", label: "pass", ...config.condition }] }, source.text);
        route = selected === "pass" ? "pass" : "fail";
      } else {
        const value = await runCode(config.code.source, source, config.code.timeoutMs, signal);
        if (value === true || value === "pass") route = "pass";
        else if (value === false || value === "fail") route = "fail";
        else throw new Error("\u5206\u62E3\u811A\u672C\u987B\u8FD4\u56DE\u5E03\u5C14\u503C\u3001pass \u6216 fail");
      }
      return { source, route, output: source.text, verdict: { branch: route } };
    } catch (error) {
      signal.throwIfAborted();
      const reason = error instanceof Error ? error.message : String(error);
      return { source, route: "error", output: reason, verdict: { branch: "error", reason } };
    }
  };
}

// packages/flowspace/src/host/nodes/data.ts
import { z as z13 } from "zod";
var mapped = z13.strictObject({ value: z13.json() });
var filtered = z13.strictObject({ keep: z13.boolean() });
var parsed = z13.strictObject({ items: z13.array(z13.json()) });
var ordered = z13.strictObject({ indexes: z13.array(z13.number().int().nonnegative()) });
var responseInstructions = {
  map: 'Transform the item. Return only JSON {"value":<JSON value>}.',
  filter: 'Decide whether to keep the item. Return only JSON {"keep":true|false}.',
  sort: 'Order the supplied items. Return only JSON {"indexes":[...]}, a permutation of all zero-based indexes. Preserve the input order of ties.',
  dedupe: 'Identify semantic duplicates and retain the first representative. Return only JSON {"indexes":[...]}, listing distinct retained zero-based indexes.',
  parse: 'Extract items from the supplied text. Return only JSON {"items":[...]}.'
};
async function modelCall(ctx, config, operation, payload, signal, calls, read, record) {
  signal.throwIfAborted();
  if (!config.provider || !config.model) throw new Error("\u8BF7\u5148\u9009\u62E9\u6570\u636E\u53D8\u6362\u7684\u4F9B\u5E94\u5546\u548C\u6A21\u578B");
  const text = JSON.stringify({ operation, ...payload });
  const trace = {
    id: crypto.randomUUID(),
    operation,
    provider: config.provider,
    model: config.model,
    ...typeof payload.key === "string" ? { itemKey: payload.key } : {},
    ...typeof payload.index === "number" ? { index: payload.index } : {},
    startedAt: Date.now(),
    endedAt: 0,
    inputTokens: 0,
    outputTokens: 0,
    inputSummary: text.slice(0, 240)
  };
  let raw = "", finished = false;
  try {
    for await (const chunk of ctx.llm.stream({
      provider: config.provider,
      model: config.model,
      signal,
      purpose: "flowspace-transform",
      system: [config.instruction, responseInstructions[operation]].filter(Boolean).join("\n"),
      messages: [{ role: "user", content: [{ type: "text", text }] }]
    })) {
      if (chunk.type === "usage") {
        trace.inputTokens += chunk.usage.inputTokens + (chunk.usage.cacheReadTokens ?? 0) + (chunk.usage.cacheWriteTokens ?? 0);
        trace.outputTokens += chunk.usage.outputTokens;
      }
      if (chunk.type === "text-delta") raw += chunk.text;
      if (chunk.type === "finish") {
        if (chunk.reason.kind === "error" || chunk.reason.kind === "aborted") throw new Error(chunk.reason.failure.message);
        finished = true;
      }
      signal.throwIfAborted();
    }
    signal.throwIfAborted();
    if (!finished) throw new Error("\u6A21\u578B\u672A\u5B8C\u6210\u6570\u636E\u53D8\u6362\u8BF7\u6C42");
    let response2;
    try {
      response2 = JSON.parse(raw);
    } catch {
      throw new Error("\u6A21\u578B\u672A\u8FD4\u56DE\u6709\u6548\u7684 JSON");
    }
    return read(response2);
  } catch (error) {
    trace.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    trace.endedAt = Date.now();
    if (raw) trace.outputSummary = raw.slice(0, 240);
    calls.push(trace);
    await record?.(trace);
  }
}
function parseSource(node2, inputs) {
  const text = dataText(inputs);
  return inputs.length === 1 && inputs[0].source.text === text ? inputs[0].source : snapshotWithContent(node2, { dataType: "text", value: text });
}
function codeItem(source, item, index, limit) {
  const value = item.value;
  const content = Array.isArray(value) ? contentList(value, limit) : { dataType: typeof value === "string" ? "text" : value && typeof value === "object" ? "record" : "signal", value };
  return {
    ...snapshotWithContent({ id: source.sourceNodeId, title: source.title }, content, source.capturedAt),
    sourceSessionId: source.sourceSessionId,
    seq: source.seq,
    item: value,
    key: item.key,
    index
  };
}
async function executeCode(node2, inputs, limit, signal) {
  const config = node2.config.code;
  const source = parseSource(node2, inputs);
  if (node2.flowType === "flowspace/parse") {
    const [value] = await runDataCode(config.source, [source], config.timeoutMs, signal);
    if (!Array.isArray(value)) throw new Error("\u89E3\u6790\u811A\u672C\u5FC5\u987B\u8FD4\u56DE JSON \u5217\u8868");
    return contentList(value, limit);
  }
  const list = dataItems(inputs, limit), items = list.items;
  if (!items.length) return list;
  const values = await runDataCode(config.source, items.map((item, i) => codeItem(source, item, i, limit)), config.timeoutMs, signal);
  if (node2.flowType === "flowspace/map") return { ...list, items: items.map((item, i) => ({ key: item.key, value: values[i] })) };
  if (values.some((value) => typeof value !== "boolean")) throw new Error("\u8FC7\u6EE4\u811A\u672C\u5FC5\u987B\u8FD4\u56DE\u5E03\u5C14\u503C");
  return { ...list, items: items.filter((_item, i) => values[i]) };
}
async function executeModel(ctx, node2, inputs, limit, signal, calls, record) {
  const operation = node2.flowType.slice("flowspace/".length);
  const config = node2.config.ai;
  const ask = (payload, read) => modelCall(ctx, config, operation, payload, signal, calls, read, record);
  if (operation === "parse") {
    const text = parseSource(node2, inputs).text;
    const values = await ask({ text }, (value) => parsed.parse(value).items);
    return contentList(values, limit);
  }
  const list = dataItems(inputs, limit), items = list.items;
  if (!items.length) return list;
  if (operation === "sort" || operation === "dedupe") {
    const indexes = await ask({ items: items.map((item) => ({ key: item.key, value: item.value })) }, (response2) => {
      const order = ordered.parse(response2).indexes;
      if (order.some((index) => index >= items.length) || new Set(order).size !== order.length || operation === "sort" && order.length !== items.length) throw new Error("\u6A21\u578B\u8FD4\u56DE\u4E86\u65E0\u6548\u7684\u6761\u76EE\u5E8F\u53F7");
      return order;
    });
    if (operation === "dedupe") indexes.sort((a, b) => a - b);
    return { ...list, items: indexes.map((index) => items[index]) };
  }
  const output = [];
  for (const [index, item] of items.entries()) {
    const payload = { item: item.value, key: item.key, index };
    if (operation === "map") {
      const value = await ask(payload, (response2) => mapped.parse(response2).value);
      output.push({ key: item.key, value });
    } else if (await ask(payload, (response2) => filtered.parse(response2).keep)) output.push(item);
  }
  return { ...list, items: output };
}
async function evaluateData(ctx, node2, inputs, limit, signal, previous, record) {
  const calls = [];
  const mode2 = dataMode(node2);
  const accounting = () => ({
    ...calls.length ? { dataCalls: calls } : {},
    telemetry: {
      stepCount: mode2 === "ai" ? calls.length : 1,
      inputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
      outputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0)
    }
  });
  try {
    signal.throwIfAborted();
    const content = mode2 === "code" ? await executeCode(node2, inputs, limit, signal) : mode2 === "ai" ? await executeModel(ctx, node2, inputs, limit, signal, calls, record) : transformData(node2, inputs, limit, previous);
    signal.throwIfAborted();
    const source = snapshotWithContent(node2, content);
    return { source, route: "out", output: source.text, ...accounting() };
  } catch (error) {
    signal.throwIfAborted();
    const reason = error instanceof Error ? error.message : String(error);
    return {
      source: inputs[0]?.source ?? snapshotWithContent(node2, { dataType: "text", value: "" }),
      route: "error",
      output: reason,
      ...accounting()
    };
  }
}
function dataExecutor(ctx, getListLimit = () => DEFAULT_LIST_LIMIT) {
  return (node2, step, signal, options) => evaluateData(
    ctx,
    node2,
    step.sources.map((source, i) => ({ source, port: step.sourcePorts?.[i] ?? "in" })),
    options?.listLimit ?? getListLimit(step),
    signal,
    options?.previous,
    options?.recordCall
  );
}

// packages/flowspace/src/host/dataPreview.ts
var emptyPreview = (state, message) => ({ state, lines: [], count: 0, remaining: 0, ...message ? { message: message.slice(0, 512) } : {} });
function latestSources(runs, doc, node2) {
  const wiring = (graph) => graph.edges.filter((edge2) => edge2.target === node2.id).map((edge2) => [
    edge2.source,
    edge2.kind,
    edge2.sourcePort,
    edge2.targetPort,
    edge2.mode,
    edge2.trigger,
    edge2.emitMode,
    edge2.sourceItemKey,
    edge2.snapshotText,
    edge2.snapshotContent
  ]);
  const current = wiring(doc);
  if (!current.length) return;
  const ports2 = JSON.stringify(current);
  let latest;
  for (const run of runs) {
    if (!run.graph.nodes.some((candidate) => candidate.id === node2.id && candidate.flowType === node2.flowType) || JSON.stringify(wiring(run.graph)) !== ports2) continue;
    for (const step of run.steps) if (step.nodeId === node2.id && step.state !== "skipped" && step.sources.length && (!latest || step.createdAt >= latest.createdAt)) latest = step;
  }
  return latest?.sources.map((source, i) => ({ source, port: latest.sourcePorts?.[i] ?? "in" }));
}
async function resolveStatic(ctx, runtime, doc, read, signal) {
  const overrides = { nodes: /* @__PURE__ */ new Map(), edges: /* @__PURE__ */ new Map() };
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  for (; ; ) {
    signal.throwIfAborted();
    const resolution = read(createStaticResolver(doc, overrides));
    if (resolution.state === "needs-file") {
      const edge2 = doc.edges.find((edge3) => edge3.id === resolution.edgeId);
      const source = doc.nodes.find((node2) => node2.id === resolution.sourceId);
      const receiver = doc.nodes.find((node2) => node2.id === resolution.targetId);
      overrides.edges.set(edge2.id, await runtime.previewFile(source, edge2, receiver, limit));
    } else if (resolution.state === "needs-spill") {
      overrides.edges.set(resolution.edgeId, await runtime.hydrateContent(resolution.source));
    } else if (resolution.state === "needs-code") {
      const code2 = doc.nodes.find((node2) => node2.id === resolution.nodeId);
      const result = await evaluateData(ctx, code2, resolution.inputs, limit, signal);
      if (result.route === "error") throw new Error(result.output);
      overrides.nodes.set(code2.id, result.source.content);
    } else return { resolution, overrides };
  }
}
async function resolveStaticFanout(ctx, runtime, doc, fanId, signal = new AbortController().signal) {
  try {
    const { resolution, overrides } = await resolveStatic(ctx, runtime, doc, (resolver) => resolver.inputs(fanId), signal);
    return resolution.state === "ready" ? staticFanoutContent(doc, fanId, overrides) : void 0;
  } catch {
    signal.throwIfAborted();
    return void 0;
  }
}
async function previewDataNode(ctx, runtime, doc, runs, request, signal) {
  const target = doc.nodes.find((node2) => node2.id === request.nodeId);
  if (!target || !dataDescriptors.some((descriptor) => descriptor.flowType === target.flowType))
    return emptyPreview("error", "\u6240\u9009\u8282\u70B9\u4E0D\u652F\u6301\u6570\u636E\u9884\u89C8");
  const targetAI = dataMode(target) === "ai";
  if (targetAI && !request.tryModel) return emptyPreview("trial");
  const limit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  const ready2 = (content, telemetry) => ({ state: "ready", ...previewLines(content), ...telemetry ? { telemetry } : {} });
  const trial = async (inputs) => {
    const hydrated = await Promise.all(inputs.map(async ({ source, port }) => ({ source: await runtime.hydrateContent(source), port })));
    const result = await evaluateData(ctx, target, hydrated, limit, signal);
    return result.route === "error" ? { ...emptyPreview("error", result.output), telemetry: result.telemetry } : ready2(result.source.content, result.telemetry);
  };
  try {
    const { resolution } = await resolveStatic(ctx, runtime, doc, (resolver) => resolver.output(target.id), signal);
    if (resolution.state === "ready") return ready2(resolution.content);
    if (resolution.state === "error") return emptyPreview("error", resolution.message);
    if (!targetAI || !request.tryModel) return emptyPreview("waiting");
    const inputs = resolution.state === "needs-ai" && resolution.nodeId === target.id ? resolution.inputs : latestSources(runs, doc, target);
    return inputs ? await trial(inputs) : emptyPreview("waiting");
  } catch (error) {
    signal.throwIfAborted();
    return emptyPreview("error", error instanceof Error ? error.message : String(error));
  }
}

// packages/flowspace/src/host/dataFileWatch.ts
function fileSelections(doc) {
  const nodes = new Map(doc.nodes.map((node2) => [node2.id, node2]));
  const sources = new Set(doc.edges.flatMap((edge2) => {
    if (edge2.kind !== "reference" || edge2.generatedBy || edge2.snapshotContent || edge2.snapshotText) return [];
    const source = nodes.get(edge2.source), target = nodes.get(edge2.target);
    return source?.kind === "file" && !source.generatedBy && target && !target.generatedBy && descriptorOf(target.flowType)?.family === "data" && connectionPort(target, "reference", "in", edge2.targetPort)?.dataType === "text" ? [source] : [];
  }));
  const paths2 = /* @__PURE__ */ new Map();
  for (const source of sources) {
    const cwd = source.worktreePath ?? source.cwd;
    for (const item of selectedFileContent(source, doc.settings.listLimit ?? DEFAULT_LIST_LIMIT).items) {
      const path = item.key, key = JSON.stringify([cwd, path]);
      const entry = paths2.get(key);
      if (entry) entry.nodes.add(source.id);
      else paths2.set(key, { path, cwd, nodes: /* @__PURE__ */ new Set([source.id]) });
    }
  }
  return [...paths2.values()];
}
var DataFileWatch = class {
  constructor(fs, checkedTarget, changed) {
    this.fs = fs;
    this.checkedTarget = checkedTarget;
    this.changed = changed;
  }
  watches = /* @__PURE__ */ new Map();
  dirty = /* @__PURE__ */ new Set();
  init;
  pending = Promise.resolve();
  signature;
  flushQueued = false;
  disposed = false;
  sync(doc) {
    if (this.disposed) return this.pending;
    const selected = fileSelections(doc);
    const signature = JSON.stringify(selected.map((entry) => [entry.cwd, entry.path, [...entry.nodes]]));
    if (signature === this.signature) return this.pending;
    this.signature = signature;
    this.init?.abort();
    const init = this.init = new AbortController();
    this.pending = this.pending.then(() => this.reconcile(selected, init.signal)).finally(() => {
      if (this.init !== init) return;
      this.init = void 0;
      this.flush();
    });
    return this.pending;
  }
  async reconcile(selected, signal) {
    if (signal.aborted) return;
    const resolved = await Promise.allSettled(selected.map(async (entry) => this.checkedTarget(entry.path, entry.cwd, signal)));
    if (signal.aborted) return;
    const targets = /* @__PURE__ */ new Map();
    for (const [index, result] of resolved.entries()) {
      if (result.status === "rejected") continue;
      const target = result.value, owners = selected[index].nodes;
      const existing = targets.get(target.targetKey);
      if (existing) owners.forEach((id) => existing.nodes.add(id));
      else targets.set(target.targetKey, { target, nodes: owners });
    }
    const closing = [];
    for (const [key, subscription] of this.watches) {
      const retained = targets.get(key);
      if (retained) {
        subscription.nodes = retained.nodes;
        targets.delete(key);
      } else {
        this.watches.delete(key);
        this.dirty.delete(key);
        if (subscription.close) closing.push(subscription.close());
      }
    }
    await Promise.allSettled(closing);
    if (signal.aborted) return;
    await Promise.allSettled([...targets].map(async ([key, { target, nodes }]) => {
      const subscription = { nodes };
      this.watches.set(key, subscription);
      try {
        const close = await this.fs.watch(target, (error) => {
          if (error || this.disposed || this.watches.get(key) !== subscription) return;
          this.dirty.add(key);
          this.flush();
        }, signal);
        if (signal.aborted) {
          this.watches.delete(key);
          await close();
        } else subscription.close = close;
      } catch {
        this.watches.delete(key);
      }
    }));
  }
  flush() {
    if (this.disposed || this.init || this.flushQueued || !this.dirty.size) return;
    this.flushQueued = true;
    queueMicrotask(() => {
      this.flushQueued = false;
      if (this.disposed || this.init) return;
      const ids = /* @__PURE__ */ new Set();
      for (const key of this.dirty) this.watches.get(key)?.nodes.forEach((id) => ids.add(id));
      this.dirty.clear();
      if (ids.size) this.changed([...ids]);
    });
  }
  dispose() {
    if (this.disposed) return this.pending;
    this.disposed = true;
    this.init?.abort();
    this.pending = this.pending.then(async () => {
      const watchers = [...this.watches.values()];
      this.watches.clear();
      this.dirty.clear();
      await Promise.allSettled(watchers.map(async (subscription) => subscription.close?.()));
    });
    return this.pending;
  }
};

// packages/flowspace/src/host/runtime.ts
import { createHash as createHash3 } from "node:crypto";
import { statSync } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { foldSurface } from "@deepseek-ai/dsh-session";
import { isCompactCheckpointSource } from "@deepseek-ai/dsh-compaction";

// packages/flowspace/src/host/git.ts
import { execFile as execFileCb } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join as join2,
  relative,
  resolve
} from "node:path";
import { promisify } from "node:util";
var execFile = promisify(execFileCb);
var SENSITIVE_ENV_KEY_RE = /(?:^dsh_|api[_-]?key|secret|token|password|passwd|credential|private[_-]?key|auth[_-]?header)/i;
function sanitizedGitEnv(write = false, baseEnv = process.env) {
  const clean = {};
  for (const [k, v] of Object.entries(baseEnv)) {
    if (v === void 0) continue;
    if (SENSITIVE_ENV_KEY_RE.test(k)) continue;
    clean[k] = v;
  }
  clean.GIT_TERMINAL_PROMPT = "0";
  if (!write) clean.GIT_OPTIONAL_LOCKS = "0";
  return clean;
}
function normPath(p) {
  const resolved = resolve(p).replaceAll("\\", "/").replace(/\/+$/, "");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function sameFsPath(a, b) {
  if (!a || !b) return false;
  return normPath(a) === normPath(b);
}
function isSubPath(root, target) {
  const r = resolve(root);
  const t2 = resolve(target);
  const rel = relative(r, t2);
  return rel === "" || !rel.startsWith("..") && !isAbsolute(rel);
}
function parseUnifiedDiff(raw) {
  const hunks = [];
  const lines2 = raw.split(/\r?\n/);
  let current = null;
  const headerRe = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;
  for (const line of lines2) {
    const m = headerRe.exec(line);
    if (m) {
      current = {
        oldStart: Number(m[1]),
        oldLines: m[2] === void 0 ? 1 : Number(m[2]),
        newStart: Number(m[3]),
        newLines: m[4] === void 0 ? 1 : Number(m[4]),
        lines: m[5]?.trim() ? [` ${m[5].trim()}`] : []
      };
      hunks.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
      current.lines.push(line);
    }
  }
  return hunks;
}
var HostGitService = class {
  queues = /* @__PURE__ */ new Map();
  async runGit(args, opts) {
    const env = sanitizedGitEnv(Boolean(opts.write));
    try {
      const { stdout, stderr } = await execFile("git", args, {
        cwd: opts.cwd,
        env,
        timeout: opts.timeoutMs ?? 2e4,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true
      });
      return { stdout, stderr, code: 0 };
    } catch (err) {
      const e = err;
      if (opts.allowNonZero && typeof e.stdout === "string") {
        return {
          stdout: e.stdout,
          stderr: e.stderr ?? "",
          code: typeof e.code === "number" ? e.code : 1
        };
      }
      const detail = (e.stderr || e.message || String(err)).trim();
      throw new Error(detail || `git ${args[0]} \u6267\u884C\u5931\u8D25`);
    }
  }
  enqueueWrite(repoKey, fn) {
    const prev = this.queues.get(repoKey) ?? Promise.resolve();
    const next = prev.then(fn);
    this.queues.set(
      repoKey,
      next.then(
        () => void 0,
        () => void 0
      )
    );
    return next;
  }
  async inspect(cwd) {
    const targetCwd = resolve(cwd);
    const revRes = await this.runGit(
      ["rev-parse", "--show-toplevel", "--git-common-dir", "HEAD"],
      { cwd: targetCwd, allowNonZero: true }
    );
    if (revRes.code !== 0 && !revRes.stdout.trim()) {
      return {
        isGitRepo: false,
        cwd: targetCwd,
        branch: "",
        detached: false,
        ahead: 0,
        behind: 0,
        revision: "none",
        staged: [],
        unstaged: [],
        branches: [],
        worktrees: [],
        commits: []
      };
    }
    const topRes = await this.runGit(
      ["rev-parse", "--show-toplevel", "--git-common-dir"],
      { cwd: targetCwd, allowNonZero: true }
    );
    if (topRes.code !== 0) {
      return {
        isGitRepo: false,
        cwd: targetCwd,
        branch: "",
        detached: false,
        ahead: 0,
        behind: 0,
        revision: "none",
        staged: [],
        unstaged: [],
        branches: [],
        worktrees: [],
        commits: []
      };
    }
    const [rawTop, rawCommon] = topRes.stdout.trim().split(/\r?\n/);
    const topLevel = resolve(targetCwd, rawTop.trim());
    const commonDir = resolve(targetCwd, (rawCommon ?? ".git").trim());
    const [statusRes, wtRes, branchRes, logRes] = await Promise.all([
      this.runGit(["status", "--porcelain=v1", "-b"], {
        cwd: topLevel,
        allowNonZero: true
      }),
      this.runGit(["worktree", "list", "--porcelain"], {
        cwd: topLevel,
        allowNonZero: true
      }),
      this.runGit(
        [
          "for-each-ref",
          "--format=%(HEAD)	%(refname:short)	%(upstream:short)	%(upstream:track)	%(objectname:short)",
          "refs/heads"
        ],
        { cwd: topLevel, allowNonZero: true }
      ),
      this.runGit(
        [
          "log",
          "-n",
          "30",
          "--date=relative",
          "--format=%H%x09%h%x09%P%x09%an%x09%ar%x09%ct%x09%D%x09%s"
        ],
        { cwd: topLevel, allowNonZero: true }
      )
    ]);
    let branch = "HEAD";
    let detached = false;
    let upstream;
    let ahead = 0;
    let behind = 0;
    const staged = [];
    const unstaged = [];
    const statusLines = statusRes.stdout.split(/\r?\n/).filter(Boolean);
    for (const line of statusLines) {
      if (line.startsWith("## ")) {
        const headInfo = line.slice(3).trim();
        if (headInfo.startsWith("HEAD (no branch)") || headInfo.includes("detached")) {
          detached = true;
          branch = "HEAD";
        } else {
          const trackMatch = /^(.*?)(?:\.\.\.([^\s[]+))?(?:\s+\[(.*)\])?$/.exec(
            headInfo
          );
          if (trackMatch) {
            branch = trackMatch[1].replace(/^No commits yet on /, "").replace(/^Initial commit on /, "").trim();
            upstream = trackMatch[2]?.trim() || void 0;
            const track = trackMatch[3] ?? "";
            const a = /ahead\s+(\d+)/.exec(track);
            const b = /behind\s+(\d+)/.exec(track);
            if (a) ahead = Number(a[1]);
            if (b) behind = Number(b[1]);
          }
        }
        continue;
      }
      if (line.length < 3) continue;
      const x = line[0];
      const y = line[1];
      const rest = line.slice(3);
      let path = rest;
      let origPath;
      if (rest.includes(" -> ")) {
        const parts = rest.split(" -> ");
        origPath = parts[0];
        path = parts[1];
      }
      if (x === "?" && y === "?") {
        unstaged.push({ path, status: "?", staged: false });
        continue;
      }
      const toStatus = (ch) => ch === "A" ? "A" : ch === "D" ? "D" : ch === "R" ? "R" : ch === "U" ? "U" : "M";
      if (x !== " " && x !== "?") {
        staged.push({ path, origPath, status: toStatus(x), staged: true });
      }
      if (y !== " " && y !== "?") {
        unstaged.push({ path, origPath, status: toStatus(y), staged: false });
      }
    }
    const worktrees = parsePorcelainWorktrees(wtRes.stdout);
    const wtByBranch = /* @__PURE__ */ new Map();
    for (const wt of worktrees) {
      if (wt.branch) wtByBranch.set(wt.branch, wt.path);
    }
    const branches = branchRes.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const [headMark, name, up, track, oid] = line.split("	");
      const a = /ahead\s+(\d+)/.exec(track ?? "");
      const b = /behind\s+(\d+)/.exec(track ?? "");
      return {
        name: name ?? "",
        current: headMark === "*" || name === branch,
        upstream: up || void 0,
        ahead: a ? Number(a[1]) : 0,
        behind: b ? Number(b[1]) : 0,
        commitOid: oid ?? "",
        worktreePath: name ? wtByBranch.get(name) : void 0
      };
    }).filter((b) => Boolean(b.name));
    if (branch && !detached && !branches.some((b) => b.name === branch)) {
      branches.unshift({
        name: branch,
        current: true,
        ahead,
        behind,
        commitOid: "",
        worktreePath: topLevel
      });
    }
    const commits = logRes.code === 0 ? logRes.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const [
        oid = "",
        shortOid = "",
        parentsRaw = "",
        author = "",
        relativeTime = "",
        ts = "0",
        refsRaw = "",
        ...subjectParts
      ] = line.split("	");
      return {
        oid,
        shortOid,
        parents: parentsRaw.split(" ").filter(Boolean),
        author,
        relativeTime,
        timestamp: Number(ts) * 1e3,
        refs: refsRaw.split(",").map((r) => r.trim()).filter(Boolean),
        subject: subjectParts.join("	")
      };
    }) : [];
    const revision = createHash("sha1").update(
      JSON.stringify({
        topLevel,
        branch,
        head: commits[0]?.oid ?? "",
        status: statusRes.stdout,
        wtCount: worktrees.length
      })
    ).digest("hex").slice(0, 16);
    return {
      isGitRepo: true,
      cwd: targetCwd,
      topLevel,
      commonDir,
      branch,
      detached,
      upstream,
      ahead,
      behind,
      revision,
      staged,
      unstaged,
      branches,
      worktrees,
      commits
    };
  }
  async diff(cwd, req) {
    const targetCwd = resolve(cwd);
    let args;
    let title;
    if (req.target === "commit" && req.commitOid) {
      args = ["show", "--format=medium", "--patch", req.commitOid];
      if (req.path) args.push("--", req.path);
      title = `Commit ${req.commitOid.slice(0, 7)}${req.path ? ` \xB7 ${req.path}` : ""}`;
    } else if (req.target === "staged") {
      args = ["diff", "--cached"];
      if (req.path) args.push("--", req.path);
      title = `Staged${req.path ? ` \xB7 ${req.path}` : ""}`;
    } else if (req.target === "all") {
      args = ["diff", "HEAD"];
      if (req.path) args.push("--", req.path);
      title = `HEAD Diff${req.path ? ` \xB7 ${req.path}` : ""}`;
    } else {
      args = ["diff"];
      if (req.path) args.push("--", req.path);
      title = `Working${req.path ? ` \xB7 ${req.path}` : ""}`;
    }
    const res = await this.runGit(args, {
      cwd: targetCwd,
      allowNonZero: true
    });
    const raw = res.stdout;
    const maxLen = 96e3;
    const truncated = raw.length > maxLen;
    const text = truncated ? raw.slice(0, maxLen) : raw;
    return {
      title,
      text,
      hunks: parseUnifiedDiff(text),
      truncated
    };
  }
  async act(cwd, req) {
    const targetCwd = resolve(cwd);
    const initial = await this.inspect(targetCwd);
    if (req.action === "init") {
      if (initial.isGitRepo && initial.topLevel) {
        return initial;
      }
      return this.enqueueWrite(normPath(targetCwd), async () => {
        await mkdir(targetCwd, { recursive: true });
        const initBranch = req.branch?.trim() ? sanitizeBranchName(req.branch) : "main";
        const res = await this.runGit(["init", "-b", initBranch], {
          cwd: targetCwd,
          write: true,
          allowNonZero: true
        });
        if (res.code !== 0) {
          await this.runGit(["init"], { cwd: targetCwd, write: true });
        }
        return this.inspect(targetCwd);
      });
    }
    if (!initial.isGitRepo || !initial.topLevel || !initial.commonDir) {
      throw new Error("\u5F53\u524D\u76EE\u5F55\u4E0D\u662F Git \u4ED3\u5E93");
    }
    const worktreeRoot = initial.topLevel;
    const mainWorktreeRoot = initial.worktrees.find((w) => w.isMain)?.path ?? worktreeRoot;
    const repoKey = normPath(initial.commonDir);
    return this.enqueueWrite(repoKey, async () => {
      const fresh = await this.inspect(worktreeRoot);
      if (req.expectedRevision && fresh.revision !== req.expectedRevision) {
        throw new Error("Git \u4ED3\u5E93\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u518D\u6267\u884C\u64CD\u4F5C");
      }
      const cleanPaths = (req.paths ?? []).map((p) => p.trim()).filter((p) => p && !p.startsWith("-"));
      switch (req.action) {
        case "stage": {
          if (!cleanPaths.length) throw new Error("\u672A\u6307\u5B9A\u8981\u6682\u5B58\u7684\u6587\u4EF6");
          await this.runGit(["add", "--", ...cleanPaths], {
            cwd: worktreeRoot,
            write: true
          });
          break;
        }
        case "unstage": {
          if (!cleanPaths.length) throw new Error("\u672A\u6307\u5B9A\u8981\u53D6\u6D88\u6682\u5B58\u7684\u6587\u4EF6");
          await this.runGit(["reset", "HEAD", "--", ...cleanPaths], {
            cwd: worktreeRoot,
            write: true,
            allowNonZero: true
          });
          break;
        }
        case "stageAll": {
          await this.runGit(["add", "-A"], { cwd: worktreeRoot, write: true });
          break;
        }
        case "unstageAll": {
          await this.runGit(["reset"], {
            cwd: worktreeRoot,
            write: true,
            allowNonZero: true
          });
          break;
        }
        case "discard": {
          if (!cleanPaths.length) throw new Error("\u672A\u6307\u5B9A\u8981\u653E\u5F03\u4FEE\u6539\u7684\u6587\u4EF6");
          const untrackedSet = new Set(
            fresh.unstaged.filter((f) => f.status === "?").map((f) => f.path)
          );
          const untrackedPaths = cleanPaths.filter((p) => untrackedSet.has(p));
          const trackedPaths = cleanPaths.filter((p) => !untrackedSet.has(p));
          if (trackedPaths.length) {
            await this.runGit(["checkout", "--", ...trackedPaths], {
              cwd: worktreeRoot,
              write: true
            });
          }
          if (untrackedPaths.length) {
            await this.runGit(["clean", "-fd", "--", ...untrackedPaths], {
              cwd: worktreeRoot,
              write: true
            });
          }
          break;
        }
        case "commit": {
          const msg = (req.message ?? "").trim();
          if (!msg) throw new Error("\u63D0\u4EA4\u8BF4\u660E\u4E0D\u80FD\u4E3A\u7A7A");
          await this.runGit(["commit", "-m", msg], {
            cwd: worktreeRoot,
            write: true
          });
          break;
        }
        case "createBranch": {
          const name = sanitizeBranchName(req.branch);
          const args = ["branch", name];
          if (req.baseRef?.trim()) args.push(req.baseRef.trim());
          await this.runGit(args, { cwd: worktreeRoot, write: true });
          break;
        }
        case "checkoutBranch": {
          const name = sanitizeBranchName(req.branch);
          await this.runGit(["checkout", name], {
            cwd: worktreeRoot,
            write: true
          });
          break;
        }
        case "fetch": {
          await this.runGit(["fetch", "--all", "--prune"], {
            cwd: worktreeRoot,
            write: true,
            timeoutMs: 45e3
          });
          break;
        }
        case "pull": {
          await this.runGit(["pull", "--ff-only"], {
            cwd: worktreeRoot,
            write: true,
            timeoutMs: 45e3
          });
          break;
        }
        case "push": {
          await this.runGit(["push"], {
            cwd: worktreeRoot,
            write: true,
            timeoutMs: 45e3
          });
          break;
        }
        case "createWorktree": {
          const branch = sanitizeBranchName(req.branch);
          const slug = branch.replace(/[^a-zA-Z0-9._-]+/g, "-");
          const defaultWtRoot = join2(
            dirname(mainWorktreeRoot),
            `${basename(mainWorktreeRoot)}-worktrees`
          );
          const wtPath = req.worktreePath?.trim() ? resolve(worktreeRoot, req.worktreePath.trim()) : join2(defaultWtRoot, slug);
          await mkdir(dirname(wtPath), { recursive: true });
          const existsBranch = fresh.branches.some((b) => b.name === branch);
          const args = existsBranch ? ["worktree", "add", wtPath, branch] : [
            "worktree",
            "add",
            "-b",
            branch,
            wtPath,
            ...req.baseRef?.trim() ? [req.baseRef.trim()] : []
          ];
          await this.runGit(args, { cwd: worktreeRoot, write: true });
          break;
        }
        case "removeWorktree": {
          const target = req.worktreePath?.trim();
          if (!target) throw new Error("\u672A\u6307\u5B9A\u8981\u79FB\u9664\u7684 worktree \u8DEF\u5F84");
          const resolvedWt = resolve(worktreeRoot, target);
          if (sameFsPath(resolvedWt, mainWorktreeRoot)) {
            throw new Error("\u4E0D\u80FD\u79FB\u9664\u4E3B\u5DE5\u4F5C\u6811\u76EE\u5F55");
          }
          await this.runGit(["worktree", "remove", resolvedWt], {
            cwd: mainWorktreeRoot,
            write: true
          });
          break;
        }
      }
      return this.inspect(worktreeRoot);
    });
  }
};
function sanitizeBranchName(raw) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed.startsWith("-") || /\s|~|\^|:|\?|\*|\[|\\/.test(trimmed)) {
    throw new Error("\u65E0\u6548\u7684\u5206\u652F\u540D\u79F0");
  }
  return trimmed;
}
function parsePorcelainWorktrees(stdout) {
  const blocks = stdout.trim().split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, index) => {
    let path = "";
    let head = "";
    let branch;
    let bare = false;
    let detached = false;
    let locked = false;
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("worktree ")) {
        path = resolve(line.slice("worktree ".length).trim());
      } else if (line.startsWith("HEAD ")) {
        head = line.slice(5).trim();
      } else if (line.startsWith("branch ")) {
        const ref = line.slice(7).trim();
        branch = ref.replace(/^refs\/heads\//, "");
      } else if (line === "bare") {
        bare = true;
      } else if (line === "detached") {
        detached = true;
      } else if (line === "locked" || line.startsWith("locked ")) {
        locked = true;
      }
    }
    return {
      path,
      head,
      branch,
      bare,
      detached,
      locked,
      isMain: index === 0
    };
  });
}

// packages/flowspace/src/host/content.ts
import { createHash as createHash2 } from "node:crypto";
var MAX_INLINE_CONTEXT_BYTES = 64 * 1024;
var ContentSpills = class {
  constructor(ctx, records) {
    this.ctx = ctx;
    this.records = records;
    for (const [, record] of records.entries()) this.byLocator.set(record.locator, record);
  }
  byLocator = /* @__PURE__ */ new Map();
  async store(value, source, owner) {
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    if (Buffer.byteLength(raw, "utf8") <= MAX_INLINE_CONTEXT_BYTES) return void 0;
    const encoding = typeof value === "string" ? "text" : "json";
    const key = createHash2("sha256").update(JSON.stringify([owner, encoding])).update(raw).digest("hex");
    let record = this.records.get(key);
    if (!record) {
      const backend = this.ctx.get("spillStore");
      if (!backend) throw new Error("\u957F\u6761\u76EE\u9700\u8981 DSH spill \u5B58\u50A8");
      const saved = await backend.saveText({
        owner: { sessionId: owner },
        source: { kind: "session-reference", sessionId: source.sourceSessionId ?? owner, label: source.title },
        suggestedName: encoding === "json" ? "flowspace-item.json" : "flowspace-item.txt",
        content: raw
      });
      record = { ...saved, encoding, preview: raw.slice(0, 2e3) };
      await this.records.put(key, record);
    }
    this.byLocator.set(record.locator, record);
    return { locator: record.locator, preview: record.preview, bytes: record.bytes };
  }
  saved(ref) {
    const record = this.byLocator.get(ref.locator);
    if (!record) throw new Error("\u6B64 Host \u6CA1\u6709\u8BE5\u6761\u76EE\u7684 spill \u8BB0\u5F55");
    return record;
  }
  async read(ref) {
    const record = this.saved(ref);
    const fs = this.ctx.fs;
    const raw = await fs.readText(await fs.resolve(record.locator));
    return record.encoding === "json" ? JSON.parse(raw) : raw;
  }
  async freeze(source, limit, ownerSessionId) {
    const owner = ownerSessionId ?? source.sourceSessionId ?? `flowspace:${source.sourceNodeId}`;
    let content = source.content;
    let text = source.text;
    let textSpill = source.textSpill;
    if (content?.items) {
      if (content.items.length > limit) {
        content = { ...content, originalCount: content.originalCount ?? content.items.length, items: content.items.slice(0, limit) };
        text = textOfContent(content);
        textSpill = void 0;
      }
      const items = [];
      for (const item of content.items) {
        if (item.spill) this.saved(item.spill);
        const spill2 = item.value === void 0 ? void 0 : await this.store(item.value, source, owner);
        items.push(spill2 ? { key: item.key, spill: spill2 } : item);
      }
      content = { ...content, items };
    } else if (content?.spill) {
      this.saved(content.spill);
    } else if (content?.value !== void 0) {
      const spill2 = await this.store(content.value, source, owner);
      if (spill2) {
        const { value: _value, ...fields2 } = content;
        content = { ...fields2, spill: spill2 };
      }
    }
    textSpill ??= await this.store(text, source, owner);
    if (textSpill) {
      const saved = this.saved(textSpill);
      text = `${saved.preview}

\u5B8C\u6574\u5185\u5BB9\uFF1A${saved.locator}
${saved.retrievalHint}`;
      content ??= { dataType: source.kind === "file" ? "file" : "text", spill: textSpill };
    }
    const { textSpill: _priorTextSpill, ...fields } = source;
    return { ...fields, text, ...content ? { content } : {}, ...textSpill ? { textSpill } : {} };
  }
  async hydrate(source) {
    const { textSpill, content } = source;
    if (!textSpill && !content?.spill && !content?.items?.some((item) => item.spill)) return source;
    const { textSpill: _textSpill, ...out } = source;
    if (textSpill) out.text = String(await this.read(textSpill));
    if (content?.spill) {
      const { spill: spill2, ...fields } = content;
      out.content = { ...fields, value: spill2.locator === textSpill?.locator ? out.text : await this.read(spill2) };
    } else if (content?.items) {
      const items = [];
      for (const item of content.items) {
        items.push(item.spill ? { key: item.key, value: await this.read(item.spill) } : item);
      }
      out.content = { ...content, items };
    }
    if (!textSpill && content && out.content && source.text === textOfContent(content))
      out.text = textOfContent(out.content);
    return out;
  }
};

// packages/flowspace/src/host/runtime.ts
var shortHash = (value) => createHash3("sha1").update(value).digest("hex").slice(0, 12);
var escapeXmlAttr = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
var plainText = (blocks) => blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n");
function extractFileNodePaths(node2) {
  return (node2.selectedItems?.length ? node2.selectedItems : node2.text.split(/\r?\n/)).map((p) => p.trim()).filter(Boolean);
}
function computeFileNodeFingerprint(node2, baseCwd) {
  const paths2 = extractFileNodePaths(node2);
  if (!paths2.length) return "missing:empty";
  const root = resolve2(
    baseCwd || node2.worktreePath || node2.cwd || process.cwd()
  );
  const parts = paths2.map((p) => {
    try {
      const full = resolve2(root, p);
      const st = statSync(full);
      if (!st.isFile()) return `${p}:missing`;
      return `${p}:${Math.trunc(st.mtimeMs)}:${st.size}`;
    } catch {
      return `${p}:missing`;
    }
  });
  return shortHash(parts.join("|"));
}
var DshRuntime = class {
  constructor(ctx, findNode, teams, nodeExecutors, spillRecords, getListLimit = () => void 0, readDataFile) {
    this.ctx = ctx;
    this.findNode = findNode;
    this.teams = teams;
    this.nodeExecutors = nodeExecutors;
    this.getListLimit = getListLimit;
    this.readDataFile = readDataFile;
    this.spills = new ContentSpills(ctx, spillRecords);
  }
  spills;
  freezeContent(snapshot2, limit = this.getListLimit() ?? DEFAULT_LIST_LIMIT, ownerSessionId) {
    return this.spills.freeze(snapshot2, limit, ownerSessionId);
  }
  hydrateContent(snapshot2) {
    return this.spills.hydrate(snapshot2);
  }
  execute = async (node2, step, signal, options) => {
    const execute = this.nodeExecutors.get(node2.flowType ?? "");
    if (!execute) throw new Error(`\u8282\u70B9\u6267\u884C\u5668\u4E0D\u53EF\u7528\uFF1A${node2.flowType}`);
    const sources = await Promise.all(step.sources.map((source2) => this.hydrateContent(source2)));
    const previous = options?.previous && (await this.hydrateContent(snapshotWithContent(node2, options.previous))).content;
    signal.throwIfAborted();
    const result = await execute(node2, { ...step, sources }, signal, { ...options, previous });
    if ("awaiting" in result) return result;
    const forwarded = sources.indexOf(result.source);
    const source = forwarded >= 0 ? step.sources[forwarded] : await this.freezeContent(result.source, options?.listLimit);
    return { ...result, source, output: result.output === result.source.text ? source.text : result.output };
  };
  teamReference(sessionId) {
    return this.teams.reference(sessionId);
  }
  waitForTeam(sessionId) {
    return this.teams.waitForIdle(sessionId);
  }
  running() {
    return this.ctx.agents.list().filter((a) => a.status === "running").map((a) => a.id);
  }
  isPlanModeActive(sessionId) {
    const pm = this.ctx.get("planMode");
    if (!pm?.get) return false;
    const liveAgent = this.ctx.agents.get(sessionId);
    if (!liveAgent) return false;
    try {
      return Boolean(pm.get(liveAgent).active);
    } catch {
      return false;
    }
  }
  async syncLiveAgentConfig(node2, sessionId, opts = {}) {
    const targetDir = node2.worktreePath || node2.cwd;
    const needsWorkdirSet = !opts.isFork && Boolean(
      targetDir && opts.workspacePath && !sameFsPath(targetDir, opts.workspacePath)
    );
    const hasPlanPreference = node2.planMode !== void 0;
    const laneModel = node2.generatedBy ? node2.teamModel : void 0;
    if (!needsWorkdirSet && !hasPlanPreference && !laneModel) return;
    const resolved = await this.ctx.sessionController.resolveAgent(sessionId).catch(() => null);
    if (!resolved || "error" in resolved) return;
    if (laneModel) resolved.agent.model.select(laneModel);
    if (needsWorkdirSet && targetDir) {
      const wd = this.ctx.get("workingDirectory");
      if (wd) {
        await wd.set(resolved.agent, targetDir).catch((err) => {
          this.ctx.logger.warn(
            "FlowSpace worktree workingDirectory.set failed: %s",
            err
          );
        });
      }
    }
    if (hasPlanPreference) {
      const pm = this.ctx.get("planMode");
      try {
        pm?.set?.(resolved.agent, Boolean(node2.planMode));
      } catch (err) {
        this.ctx.logger.warn("FlowSpace planMode.set failed: %s", err);
      }
    }
  }
  async ensure(node2, fork, sessionTitle) {
    const titleDerived = syncUntitledAgentNode(node2);
    const ws = node2.workspaceId ? this.ctx.workspaceRegistry.list().find((w) => w.id === node2.workspaceId) : void 0;
    const team = this.teams.wantsTeam(node2);
    if (node2.sessionId) {
      if (team && !this.teams.isLead(node2.sessionId)) await this.teams.sync(node2.id);
      if (titleDerived || sessionTitle) {
        await this.ctx.sessionController.rename({
          sessionId: node2.sessionId,
          title: sessionTitle ?? node2.title
        }).catch(() => {
        });
      }
      await this.syncLiveAgentConfig(node2, node2.sessionId, {
        workspacePath: ws?.path
      });
      return node2.sessionId;
    }
    const roster = team ? await this.teams.validateRoster(node2) : void 0;
    const result = fork?.sourceSessionId ? await this.ctx.sessionController.fork({
      sessionId: fork.sourceSessionId,
      atSeq: fork.seq
    }) : await this.ctx.sessionController.create({
      ...ws ? { workspaceId: ws.id } : node2.cwd || node2.worktreePath ? { cwd: node2.worktreePath ?? node2.cwd } : {},
      ...node2.agentPreset ? { agentPreset: node2.agentPreset } : {}
    });
    await this.ctx.sessionController.rename({
      sessionId: result.sessionId,
      title: sessionTitle ?? node2.title
    });
    await this.syncLiveAgentConfig(node2, result.sessionId, {
      isFork: Boolean(fork),
      workspacePath: ws?.path
    });
    if (roster) await this.teams.bind(node2, result.sessionId, roster);
    return result.sessionId;
  }
  async send(step) {
    await this.ctx.sessionController.prompt(
      {
        sessionId: step.sessionId,
        requestId: step.requestId,
        mode: "queue",
        content: [{ type: "text", text: step.task }],
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      new AbortController().signal
    );
  }
  /**
   * Format semantic `<upstream-conclusion>`, `<upstream-session>`, and `<canvas-reference>`
   * XML context blocks with both individual and cumulative >64 KiB `spillStore` protection (D36).
   */
  async contextText(sources, sessionId) {
    if (!sessionId) {
      const full = await Promise.all(sources.map((source) => this.hydrateContent(source)));
      return full.map((source) => source.text).join("\n\n");
    }
    const active2 = sources.filter((s) => s.kind !== "fork");
    if (!active2.length) return "";
    const entries = active2.map((source, idx) => ({
      idx,
      source,
      bytes: Buffer.byteLength(source.text, "utf8"),
      spill: Buffer.byteLength(source.text, "utf8") > MAX_INLINE_CONTEXT_BYTES
    }));
    let inlineTotal = entries.filter((e) => !e.spill).reduce((sum, e) => sum + e.bytes, 0);
    if (inlineTotal > MAX_INLINE_CONTEXT_BYTES) {
      const candidates = entries.filter((e) => !e.spill && e.bytes > 1024).sort((a, b) => b.bytes - a.bytes);
      for (const candidate of candidates) {
        if (inlineTotal <= MAX_INLINE_CONTEXT_BYTES) break;
        candidate.spill = true;
        inlineTotal -= candidate.bytes;
        inlineTotal += Math.min(candidate.bytes, 2200);
      }
    }
    const blocks = [];
    for (const entry of entries) {
      const { source } = entry;
      let body = source.text;
      if (entry.spill) {
        const spill2 = this.ctx.get("spillStore");
        if (!spill2) throw new Error("\u957F\u5F15\u7528\u9700\u8981 DSH spill \u5B58\u50A8");
        const saved = await spill2.saveText({
          owner: { sessionId },
          source: {
            kind: "session-reference",
            sessionId: source.sourceSessionId ?? sessionId,
            label: source.title
          },
          suggestedName: `flowspace-${source.id}.md`,
          content: body
        });
        body = `${body.slice(0, 2e3)}

\u5B8C\u6574\u5185\u5BB9\uFF1A${saved.locator}
${saved.retrievalHint}`;
      }
      const fromId = source.sourceSessionId ?? source.sourceNodeId;
      const seqAttr = source.seq === void 0 ? "" : ` seq="${String(source.seq)}"`;
      const titleAttr = escapeXmlAttr(source.title);
      const fromAttr = escapeXmlAttr(fromId);
      if (source.kind === "conclusion") {
        blocks.push(
          `<upstream-conclusion title="${titleAttr}" from="${fromAttr}"${seqAttr}>
${body}
</upstream-conclusion>`
        );
      } else if (source.kind === "session") {
        blocks.push(
          `<upstream-session title="${titleAttr}" from="${fromAttr}"${seqAttr}>
${body}
</upstream-session>`
        );
      } else if (source.kind === "file") {
        const statusAttr = source.missing ? ' status="missing"' : "";
        blocks.push(
          `<canvas-reference kind="file" title="${titleAttr}"${statusAttr}>
${body}
</canvas-reference>`
        );
      } else {
        const refKind = source.referenceKind ?? "note";
        blocks.push(
          `<canvas-reference kind="${refKind}" title="${titleAttr}" from="${fromAttr}"${seqAttr}>
${body}
</canvas-reference>`
        );
      }
    }
    return "\n\n<!-- FlowSpace \u5F15\u7528\uFF1A\u4EE5\u4E0B\u4E3A\u5DF2\u56FA\u5316\u7684\u4E0A\u6E38\u7ED3\u8BBA\u4E0E\u753B\u5E03\u53C2\u8003\u8D44\u6599\uFF0C\u4EC5\u4F5C\u80CC\u666F\u4F9D\u636E\uFF0C\u4E0D\u8986\u76D6\u5F53\u524D\u4EFB\u52A1\u6307\u4EE4 -->\n" + blocks.join("\n\n");
  }
  async cancel(step) {
    if (!step.sessionId) return;
    const resolved = await this.ctx.sessionController.resolveAgent(step.sessionId).catch(() => null);
    if (!resolved || "error" in resolved) return;
    const agent = resolved.agent;
    for (const message of [...agent.inbox.nextTurn, ...agent.inbox.nextStep]) {
      if (message.source.kind === "user" && "rpcId" in message.source && message.source.rpcId === step.requestId)
        agent.inbox.remove(message.id);
    }
    if (step.state === "running") {
      try {
        var _stack = [];
        try {
          const observation = __using(_stack, await this.ctx.sessionQuery.observeSession(
            step.sessionId
          ));
          const lastStart = observation.events.findLast(
            (e) => e.type === "turn/start"
          );
          const lastEnd = observation.events.findLast(
            (e) => e.type === "turn/end"
          );
          if (lastStart?.type === "turn/start" && lastStart.data.turn === step.turn && (!lastEnd || lastEnd.seq < lastStart.seq))
            agent.cancel({ kind: "user" }, { keepInbox: true });
        } catch (_) {
          var _error = _, _hasError = true;
        } finally {
          __callDispose(_stack, _error, _hasError);
        }
      } catch {
      }
    }
    if (this.teams.isLead(step.sessionId) && (step.state === "running" || step.state === "settling")) {
      agent.cancel({ kind: "user" }, { keepInbox: true });
      await this.teams.interruptMembers(step.sessionId);
      return;
    }
  }
  async reconcile(step) {
    if (!step.sessionId) return { state: "interrupted", endedAt: Date.now() };
    if (step.teamRef || this.teams.isLead(step.sessionId)) {
      await this.cancel({ ...step, state: "queued" });
      return { state: "interrupted", endedAt: Date.now() };
    }
    try {
      var _stack = [];
      try {
        const observation = __using(_stack, await this.ctx.sessionQuery.observeSession(
          step.sessionId
        ));
        const input = observation.events.find(
          (e) => e.type === "user/message" && e.data.source.kind === "user" && "rpcId" in e.data.source && e.data.source.rpcId === step.requestId
        );
        const preceding = input && observation.events.filter((e) => e.seq < input.seq).findLast((e) => e.type === "turn/start");
        const turn = preceding?.type === "turn/start" ? preceding.data.turn : step.turn;
        const end = turn !== void 0 ? observation.events.find(
          (e) => e.type === "turn/end" && e.data.turn === turn
        ) : void 0;
        if (end?.type === "turn/end" && end.data.reason.kind === "completed") {
          const turnAssistants = observation.events.filter(
            (e) => e.seq > (preceding?.seq ?? -1) && e.seq < end.seq && e.type === "assistant/message" && !e.data.interrupted
          );
          const lastNonEmpty = turnAssistants.findLast(
            (e) => e.type === "assistant/message" && plainText(e.data.message.content).trim().length > 0
          );
          const chosen = lastNonEmpty ?? turnAssistants.at(-1);
          return {
            state: "completed",
            turn,
            endSeq: end.seq,
            endedAt: end.time,
            output: chosen?.type === "assistant/message" ? plainText(chosen.data.message.content) : ""
          };
        }
        await this.cancel({ ...step, state: "queued" }).catch(() => {
        });
        return { state: "interrupted", turn, endedAt: Date.now() };
      } catch (_) {
        var _error = _, _hasError = true;
      } finally {
        __callDispose(_stack, _error, _hasError);
      }
    } catch {
      return { state: "interrupted", endedAt: Date.now() };
    }
  }
  async capture(node2, mode2, seq, output) {
    var _stack = [];
    try {
      const sessionId = node2.sessionId ?? this.findNode(node2.id)?.sessionId;
      if (!sessionId) throw new Error(`${node2.title} \u5C1A\u672A\u521B\u5EFA\u4F1A\u8BDD`);
      const observation = __using(_stack, await this.ctx.sessionQuery.observeSession(
        sessionId,
        { projectionMode: "none" }
      ));
      const rawCut = seq ?? observation.cursor;
      const candidateEvents = observation.events.filter((e) => e.seq <= rawCut);
      let cut = rawCut;
      if (mode2 === "fork") {
        const lastCompletedEnd = candidateEvents.findLast(
          (e) => e.type === "turn/end" && e.data.reason.kind === "completed"
        );
        if (!lastCompletedEnd) {
          throw new Error("\u6765\u6E90\u4F1A\u8BDD\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u5DF2\u5B8C\u6210\u56DE\u5408\u624D\u80FD\u5206\u53C9");
        }
        cut = lastCompletedEnd.seq;
      }
      const events = cut === rawCut ? candidateEvents : candidateEvents.filter((e) => e.seq <= cut);
      let text = output;
      if (mode2 === "session") {
        const surface = foldSurface(events);
        text = surface.nodes.flatMap((index) => {
          const e = events[index];
          if (e.type === "user/message" && (e.data.source.kind === "user" || isCompactCheckpointSource(e.data.source)))
            return [`\u7528\u6237\uFF1A${plainText(e.data.content)}`];
          if (e.type === "assistant/message")
            return [`\u52A9\u624B\uFF1A${plainText(e.data.message.content)}`];
          return [];
        }).join("\n\n");
      } else if (!text || !text.trim()) {
        const nonEmptyAssistant = events.findLast(
          (e) => e.type === "assistant/message" && !e.data.interrupted && plainText(e.data.message.content).trim().length > 0
        );
        const fallbackAssistant = nonEmptyAssistant ?? events.findLast(
          (e) => e.type === "assistant/message" && !e.data.interrupted
        );
        text = fallbackAssistant?.type === "assistant/message" ? plainText(fallbackAssistant.data.message.content) : output ?? "";
      }
      return this.freezeContent({
        id: uid(),
        kind: mode2,
        sourceNodeId: node2.id,
        sourceSessionId: sessionId,
        seq: cut,
        title: node2.title,
        text: text ?? "",
        version: String(cut),
        capturedAt: Date.now()
      });
    } catch (_) {
      var _error = _, _hasError = true;
    } finally {
      __callDispose(_stack, _error, _hasError);
    }
  }
  inferReferenceKind(node2) {
    switch (node2.kind) {
      case "file":
        return "file";
      case "changes":
        return "changes";
      case "git":
        return "git";
      case "terminal":
        return "terminal";
      case "display":
      case "detail":
        return "display";
      case "board":
        return "board";
      default:
        return "note";
    }
  }
  async reference(node2, edge2, target, limit = this.getListLimit() ?? DEFAULT_LIST_LIMIT) {
    return this.freezeContent(await this.readReference(node2, edge2, limit, target), limit);
  }
  /** A preview reads the configured file through the same workspace boundary without persisting a spill. */
  async previewFile(node2, edge2, target, limit) {
    return this.readReference(node2, edge2, limit, target);
  }
  async readReference(node2, edge2, limit, frozenTarget) {
    const refKind = this.inferReferenceKind(node2);
    if (edge2?.snapshotContent) {
      return {
        id: uid(),
        kind: edge2.snapshotContent.dataType === "file" ? "file" : "text",
        referenceKind: refKind,
        sourceNodeId: node2.id,
        title: edge2.snapshotTitle || node2.title,
        text: edge2.snapshotText ?? textOfContent(edge2.snapshotContent),
        content: edge2.snapshotContent,
        version: shortHash(JSON.stringify(edge2.snapshotContent)),
        capturedAt: Date.now()
      };
    }
    if (node2.flowType === "flowspace/constant" && edge2?.snapshotText === void 0) {
      const content = transformData(node2, [], limit);
      return { ...snapshotWithContent(node2, content), version: shortHash(JSON.stringify(node2.config)) };
    }
    if (node2.kind === "board" && (edge2?.sourceItemKey !== void 0 || !edge2?.snapshotText)) {
      const board = frozenTarget?.kind === "flow" ? node2 : this.findNode(node2.id) ?? node2;
      const itemKey = edge2?.sourceItemKey;
      const ref = resolveBoardReference(board, itemKey, limit);
      return {
        id: uid(),
        kind: "text",
        referenceKind: itemKey === void 0 ? "board" : "board-card",
        sourceNodeId: node2.id,
        ...ref,
        content: boardContent(board, itemKey, limit),
        version: shortHash(resolveBoardReference(board, itemKey).text),
        capturedAt: Date.now()
      };
    }
    if (edge2?.snapshotText !== void 0 && edge2.snapshotText.length > 0) {
      return {
        id: uid(),
        kind: "text",
        referenceKind: refKind,
        sourceNodeId: node2.id,
        title: edge2.snapshotTitle || node2.title,
        text: edge2.snapshotText,
        version: shortHash(edge2.snapshotText),
        capturedAt: Date.now()
      };
    }
    if ((node2.kind === "display" || node2.kind === "detail") && !node2.fixed && !node2.pinned && node2.sourceNodeId) {
      const source = this.findNode(node2.sourceNodeId);
      if (source?.sessionId) {
        const cap = await this.capture(source, "conclusion");
        return {
          ...cap,
          kind: "text",
          referenceKind: "display",
          sourceNodeId: node2.id,
          title: node2.title
        };
      }
    }
    if (node2.kind === "file") {
      const configured = extractFileNodePaths(node2);
      const paths2 = configured.slice(0, limit);
      const counts = paths2.length < configured.length ? { originalCount: configured.length } : {};
      const baseCwd = node2.worktreePath ?? node2.cwd;
      const version = computeFileNodeFingerprint(node2, baseCwd);
      const target = frozenTarget ?? (edge2 && this.findNode(edge2.target));
      const inputType = edge2 && target && descriptorOf(target.flowType)?.family === "data" ? connectionPort(target, edge2.kind, "in", edge2.targetPort)?.dataType : void 0;
      if (inputType === "list")
        return { ...snapshotWithContent(node2, selectedFileContent(node2, limit)), referenceKind: "file", version };
      if (this.readDataFile && inputType === "text") {
        const chunks = [];
        for (const path of paths2) chunks.push(await this.readDataFile(path, baseCwd));
        const text2 = chunks.join("\n");
        return { ...snapshotWithContent(node2, { dataType: "text", value: text2 }), referenceKind: "file", version };
      }
      if (!paths2.length) {
        return {
          id: uid(),
          kind: "file",
          referenceKind: "file",
          missing: true,
          sourceNodeId: node2.id,
          title: node2.title,
          text: "\u672A\u914D\u7F6E\u5F15\u7528\u6587\u4EF6\u8DEF\u5F84\uFF08\u5F53\u524D\u6587\u4EF6\u8282\u70B9\u4E3A\u7A7A\uFF09",
          content: { dataType: "file", value: [] },
          version,
          capturedAt: Date.now()
        };
      }
      const resolved = [];
      const missingPaths = [];
      for (const p of paths2) {
        try {
          const target2 = await this.ctx.fs.resolve(p, { cwd: baseCwd });
          const info = await this.ctx.fs.stat(target2);
          if (!info) {
            missingPaths.push(p);
          } else {
            resolved.push(target2.displayPath);
          }
        } catch {
          missingPaths.push(p);
        }
      }
      if (!resolved.length) {
        return {
          id: uid(),
          kind: "file",
          referenceKind: "file",
          missing: true,
          sourceNodeId: node2.id,
          title: node2.title,
          text: `\u5F15\u7528\u7684\u6587\u4EF6\u5F53\u524D\u4E0D\u5B58\u5728\uFF08\u5DF2\u5B89\u5168\u8DF3\u8FC7\uFF09\uFF1A${missingPaths.join("\u3001")}`,
          content: { dataType: "file", value: [], ...counts },
          version,
          capturedAt: Date.now()
        };
      }
      const noteMissing = missingPaths.length ? `
\uFF08\u4EE5\u4E0B\u8DEF\u5F84\u672A\u627E\u5230\uFF0C\u5DF2\u8DF3\u8FC7\uFF1A${missingPaths.join("\u3001")}\uFF09` : "";
      return {
        id: uid(),
        kind: "file",
        referenceKind: "file",
        sourceNodeId: node2.id,
        title: node2.title,
        text: `\u8BF7\u6309\u4EFB\u52A1\u9700\u8981\u8BFB\u53D6\u6587\u4EF6\uFF1A${resolved.join("\u3001")}${noteMissing}`,
        content: { dataType: "file", value: resolved, ...counts },
        version,
        capturedAt: Date.now()
      };
    }
    if (node2.kind === "changes") {
      let text2 = node2.text;
      if (!text2 && node2.changesSessionId && node2.changesSeq !== void 0) {
        const wc = this.ctx.get("workspaceChanges");
        const sum = wc?.summary(
          node2.changesSessionId,
          node2.changesSeq
        );
        if (sum) {
          text2 = `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})
` + sum.files.map((f) => `- ${f.display} (+${f.added} / -${f.deleted})`).join("\n");
        }
      }
      return {
        id: uid(),
        kind: "text",
        referenceKind: "changes",
        sourceNodeId: node2.id,
        sourceSessionId: node2.changesSessionId,
        seq: node2.changesSeq,
        title: node2.title,
        text: text2,
        version: shortHash(text2),
        capturedAt: Date.now()
      };
    }
    if (node2.kind === "terminal") {
      let text2 = node2.text;
      if (node2.terminalSessionId) {
        const tc = this.ctx.get("terminalController");
        const list = tc?.list(node2.terminalSessionId) ?? [];
        const term = (node2.terminalId ? list.find((item) => item.id === node2.terminalId) : void 0) ?? list[0];
        if (tc && term) {
          const resolved = await this.ctx.sessionController.resolveAgent(node2.terminalSessionId).catch(() => null);
          if (resolved && !("error" in resolved)) {
            const page = await tc.readScreen(resolved.agent, term.id, {
              offset: 0,
              count: 140,
              maxBytes: 49152
            }).catch(() => null);
            if (page?.text) text2 = page.text;
          }
        }
      }
      return {
        id: uid(),
        kind: "text",
        referenceKind: "terminal",
        sourceNodeId: node2.id,
        sourceSessionId: node2.terminalSessionId,
        title: node2.title,
        text: text2,
        version: shortHash(text2),
        capturedAt: Date.now()
      };
    }
    const text = node2.text;
    return {
      id: uid(),
      kind: "text",
      referenceKind: refKind,
      sourceNodeId: node2.id,
      title: node2.title,
      text,
      seq: node2.sourceSeq,
      version: shortHash(text),
      capturedAt: Date.now()
    };
  }
};

// packages/flowspace/src/host/flowEmit.ts
import { z as z14 } from "zod";
var emission = z14.strictObject({ items: z14.array(z14.json()) });
function registerFlowEmit(ctx, scheduler) {
  return ctx.tools.register({
    name: "flow_emit",
    description: "Emit ordered JSON items to this FlowSpace step's downstream structured inputs. Call again to append another batch. For a record output, put the JSON object in items.",
    parameters: {
      type: "object",
      properties: { items: { type: "array", items: {} } },
      required: ["items"],
      additionalProperties: false
    },
    output: {
      schema: {
        type: "object",
        properties: { accepted: { type: "integer" }, total: { type: "integer" } },
        required: ["accepted", "total"],
        additionalProperties: false
      },
      render: (_args, result) => [{ type: "text", text: JSON.stringify(result) }]
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error("flow_emit \u9700\u8981\u6B63\u5728\u6267\u884C\u7684 Agent \u6B65\u9AA4");
      const { items } = emission.parse(args);
      return scheduler.emit(exec.agent.id, exec.callId, items, exec.signal);
    }
  }, {
    // rc.3 resolves tools immediately after emitting inbox/claimed. Observe the
    // serialized claim before deciding which step owns this native turn.
    when: ({ agent, signal }) => scheduler.transact(async () => {
      signal.throwIfAborted();
      return scheduler.canEmit(agent.id);
    })
  });
}

// packages/flowspace/src/host/containers.ts
import { createHash as createHash4 } from "node:crypto";
import { z as z15 } from "zod";
var lookup = z15.strictObject({ edgeId: z15.string() });
var update = lookup.extend({ expectedVersion: z15.string(), text: z15.string() });
var boardUpdate = lookup.extend({
  action: z15.enum(["add", "edit", "delete", "move", "toggle", "comment", "check"]),
  itemId: z15.string().optional(),
  expectedVersion: z15.string(),
  text: z15.string().optional(),
  columnId: z15.string().optional(),
  checklistId: z15.string().optional()
});
var versionOf = (entry) => {
  if (!entry) return "absent";
  const value = entry.kind === "board" ? { column: entry.columnId, card: entry.card } : entry;
  return createHash4("sha256").update(JSON.stringify(
    value,
    (key, value2) => value2 && typeof value2 === "object" && !Array.isArray(value2) ? Object.fromEntries(Object.entries(value2).sort(([a], [b]) => a.localeCompare(b))) : value2
  )).digest("hex");
};
function requireVersion(expected, actual) {
  if (expected !== actual) throw new Error(`\u6761\u76EE\u7248\u672C\u51B2\u7A81\u3002\u5F53\u524D\u7248\u672C ${actual}\u3002\u8BF7\u8BFB\u53D6\u6700\u65B0\u5185\u5BB9\u540E\u518D\u8BD5\u3002`);
}
var ContainerStore = class {
  constructor(ctx, table, document, persist, publish, workspacePath) {
    this.ctx = ctx;
    this.table = table;
    this.document = document;
    this.persist = persist;
    this.publish = publish;
    this.workspacePath = workspacePath;
  }
  changes() {
    return [...this.table.entries()].map(([, value]) => value).filter((change) => !change.pending).sort((a, b) => a.revision - b.revision);
  }
  latest(id) {
    return this.table.get(id);
  }
  mounts(sessionId, kind) {
    const doc = this.document();
    const target = doc.nodes.find((node2) => node2.kind === "agent" && node2.sessionId === sessionId);
    if (!target) return [];
    const nodes = new Map(doc.nodes.map((node2) => [node2.id, node2]));
    return doc.edges.flatMap((edge2) => {
      if (edge2.target !== target.id) return [];
      const node2 = nodes.get(edge2.source);
      if (node2?.kind !== kind || kind === "file" && extractFileNodePaths(node2).length !== 1) return [];
      const permission = containerPermission(node2, edge2);
      return permission === "read" ? [] : [{ node: node2, edge: edge2, permission }];
    });
  }
  mount(sessionId, kind, edgeId) {
    const mount = this.mounts(sessionId, kind).find((item) => item.edge.id === edgeId);
    if (!mount) throw new Error("\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709\u6B64\u5BB9\u5668\u7684\u5199\u5165\u6388\u6743");
    return mount;
  }
  async read(mount, signal) {
    const { edge: edge2, node: node2 } = mount;
    if (node2.kind === "board") {
      const ids = boardIdsForReference(node2, edge2);
      const entries = [...ids].map((id) => {
        const entry2 = canvasEntry(node2, id);
        return { id, version: versionOf(entry2), entry: entry2 };
      });
      const columns = normalizeBoardColumns(node2.columns).map(({ id, name }) => ({ id, name }));
      return { entries, columns };
    }
    if (node2.kind === "file") {
      const path = extractFileNodePaths(node2)[0];
      const file = await this.file(path, node2.worktreePath ?? node2.cwd, signal);
      return { entry: file.entry, version: file.version ?? "absent" };
    }
    const entry = canvasEntry(node2);
    return { entry, version: versionOf(entry) };
  }
  async file(path, cwd, signal) {
    const { base, full, rel } = this.workspacePath({ path, cwd });
    const root = await this.ctx.fs.resolve(base, { signal });
    const target = await this.ctx.fs.resolve(full, { signal });
    if (!this.ctx.fs.contains(root, target)) throw new Error("\u6587\u4EF6\u8DEF\u5F84\u8D85\u51FA\u5F53\u524D\u5DE5\u4F5C\u533A");
    const info = await this.ctx.fs.stat(target, signal);
    const entry = info ? {
      kind: "file",
      path: rel,
      cwd: base,
      text: await this.ctx.fs.readText(target, signal)
    } : null;
    return { target, version: info?.version, entry };
  }
  async record(node2, itemId, id, before, after, owner, file, signal) {
    const previous = this.latest(id);
    if (previous && !previous.pending) return previous;
    if (after?.kind === "board" && owner.sessionId) after.card = { ...after.card, author: owner.sessionId };
    const document = this.document();
    const revision = (document.containerRevision ?? 0) + 1;
    const change = {
      id,
      nodeId: node2.id,
      itemId,
      before,
      after,
      ...owner,
      revision,
      at: Date.now(),
      beforeVersion: file?.version ?? versionOf(before),
      afterVersion: versionOf(after),
      pending: true
    };
    const edited = { ...node2 };
    if (!file && !writeCanvasEntry(edited, itemId, after)) throw new Error("\u76EE\u6807\u5BB9\u5668\u6216\u5217\u5DF2\u79FB\u9664");
    await this.table.put(id, change);
    if (file) {
      try {
        if (after?.kind === "file") {
          const outcome = await this.ctx.fs.writeText(
            file.target,
            after.text,
            file.version ? { kind: "replaceIfVersion", version: file.version } : { kind: "createIfAbsent" },
            signal
          );
          change.afterVersion = outcome.version;
          after.text = outcome.after;
        } else if (file.version) {
          await this.ctx.fs.deleteFile(file.target, { version: file.version }, signal);
          change.afterVersion = "absent";
        }
      } catch (error) {
        await this.table.delete(id);
        throw error;
      }
    } else {
      document.nodes = document.nodes.map((current) => current.id === edited.id ? edited : current);
      if (edited.kind === "board") document.edges = pruneBoardReferences(edited, document.edges);
    }
    document.containerRevision = revision;
    await this.persist();
    delete change.pending;
    await this.table.put(id, change);
    this.publish();
    return change;
  }
  async recover() {
    for (const [, stored] of this.table.entries()) {
      if (!stored.pending) continue;
      const change = structuredClone(stored);
      const doc = this.document();
      const node2 = doc.nodes.find((entry) => entry.id === change.nodeId);
      const file = change.after?.kind === "file" ? change.after : change.before?.kind === "file" ? change.before : void 0;
      if (file) {
        const current = await this.file(file.path, file.cwd);
        if (versionOf(current.entry) !== versionOf(change.after)) {
          await this.table.delete(change.id);
          continue;
        }
        change.afterVersion = current.version ?? "absent";
        doc.containerRevision = Math.max(doc.containerRevision ?? 0, change.revision);
      } else if (!node2 || (doc.containerRevision ?? 0) < change.revision) {
        await this.table.delete(change.id);
        continue;
      }
      delete change.pending;
      await this.table.put(change.id, change);
    }
  }
  writeBoard(mount, args, owner, id) {
    const { edge: edge2, node: node2, permission } = mount;
    const { itemId, action, expectedVersion, text, columnId, checklistId } = args;
    const columns = normalizeBoardColumns(node2.columns);
    const found = itemId === void 0 ? void 0 : findBoardCard(columns, itemId);
    const before = canvasEntry(node2, itemId);
    if (action === "add") {
      if (permission !== "edit" || edge2.sourceItemKey !== void 0 || node2.selectedItems?.length)
        throw new Error("\u5F53\u524D\u5F15\u7528\u672A\u6388\u6743\u65B0\u589E\u5361\u7247");
      requireVersion(expectedVersion, "absent");
      const target = columns.find((column) => column.id === columnId) ?? (!columnId ? columns[0] : void 0);
      if (!target || !text?.trim()) throw new Error("\u65B0\u589E\u5361\u7247\u9700\u8981\u6587\u5B57\u548C\u6709\u6548\u7684\u5217");
      const card = newBoardCard(text.trim());
      return this.record(node2, card.id, id, null, { kind: "board", columnId: target.id, card }, owner);
    }
    if (!itemId || !found || !boardIdsForReference(node2, edge2).has(itemId)) throw new Error("\u5F53\u524D\u5F15\u7528\u672A\u6388\u6743\u6B64\u5361\u7247");
    if ((action === "edit" || action === "delete") && permission !== "edit") throw new Error("\u8BE5\u64CD\u4F5C\u9700\u8981\u7F16\u8F91\u6388\u6743");
    requireVersion(expectedVersion, versionOf(before));
    const now = Date.now();
    let next = columns;
    switch (action) {
      case "move":
        if (!columns.some((column) => column.id === columnId)) throw new Error("\u76EE\u6807\u5217\u4E0D\u5B58\u5728");
        next = moveBoardCard(columns, itemId, columnId, void 0, now);
        break;
      case "toggle":
        next = toggleBoardCardDone(columns, itemId, node2.boardSettings, now);
        break;
      case "check":
        if (!found.card.checklist?.some((item) => item.id === checklistId)) throw new Error("\u6E05\u5355\u9879\u4E0D\u5B58\u5728");
        next = updateBoardCard(columns, itemId, (card) => ({
          ...card,
          updatedAt: now,
          checklist: card.checklist.map((item) => item.id === checklistId ? { ...item, done: !item.done } : item)
        }));
        break;
      case "comment":
        if (!text?.trim()) throw new Error("\u8BF7\u586B\u5199\u8BC4\u8BBA");
        next = updateBoardCard(columns, itemId, (card) => ({
          ...card,
          updatedAt: now,
          comments: [...card.comments ?? [], { id, by: owner.by, text: text.trim(), createdAt: now }]
        }));
        break;
      case "edit":
        if (!text?.trim()) throw new Error("\u8BF7\u586B\u5199\u5361\u7247\u6587\u5B57");
        next = updateBoardCard(columns, itemId, (card) => ({ ...card, text: text.trim(), updatedAt: now }));
        break;
      case "delete":
        next = removeBoardCard(columns, itemId);
        break;
    }
    return this.record(node2, itemId, id, before, canvasEntry({ ...node2, columns: next }, itemId), owner);
  }
  async write(mount, args, owner, id, signal) {
    const previous = this.latest(id);
    if (previous && !previous.pending) return previous;
    if ("action" in args) return this.writeBoard(mount, args, owner, id);
    const { node: node2 } = mount;
    if (node2.kind === "file") {
      const path = extractFileNodePaths(node2)[0];
      const file = await this.file(path, node2.worktreePath ?? node2.cwd, signal);
      requireVersion(args.expectedVersion, file.version ?? "absent");
      const { base, rel } = this.workspacePath({ path, cwd: node2.worktreePath ?? node2.cwd });
      return this.record(node2, void 0, id, file.entry, {
        kind: "file",
        path: rel,
        cwd: base,
        text: args.text.replaceAll("\r\n", "\n")
      }, owner, file, signal);
    }
    const before = canvasEntry(node2);
    requireVersion(args.expectedVersion, versionOf(before));
    return this.record(node2, void 0, id, before, { kind: "note", text: args.text }, owner);
  }
  async deliver(run, edge2, token, source) {
    const node2 = this.document().nodes.find((node3) => node3.id === edge2.target);
    if (!node2) throw new Error("\u6295\u9012\u76EE\u6807\u5DF2\u79FB\u9664");
    const step = run.steps.find((step2) => step2.id === token.stepId);
    const owner = {
      by: step?.sessionId ?? edge2.source,
      sessionId: step?.sessionId,
      runId: run.id,
      stepId: step?.id,
      edgeId: edge2.id
    };
    const id = JSON.stringify([run.id, token.stepId, edge2.id]);
    const text = source.content ? textOfContent(source.content) : source.text;
    if (node2.kind === "board") {
      const columns = normalizeBoardColumns(node2.columns);
      const dest = edge2.delivery?.columnId ? columns.find((column) => column.id === edge2.delivery?.columnId) : columns[0];
      if (!dest) throw new Error("\u6295\u9012\u76EE\u6807\u5217\u5DF2\u79FB\u9664");
      const mode2 = edge2.delivery?.mode ?? "lines";
      const values = mode2 === "paragraph" ? [text] : mode2 === "list" ? source.content?.items?.map((item) => item.value) ?? parseEmission(text) : text.split(/\r?\n/);
      for (const [index, value] of values.slice(0, run.listLimit ?? DEFAULT_LIST_LIMIT).entries()) {
        const title = typeof value === "string" ? value.trim() : JSON.stringify(value);
        if (!title) continue;
        const itemId = `${id}:${index}`;
        const current = this.document().nodes.find((node3) => node3.id === edge2.target);
        const card = { ...newBoardCard(title), id: itemId };
        await this.record(current, itemId, itemId, null, { kind: "board", columnId: dest.id, card }, owner);
      }
    } else if (node2.kind === "note") {
      await this.record(node2, void 0, id, canvasEntry(node2), { kind: "note", text }, owner);
    } else if (node2.kind === "file") {
      const paths2 = extractFileNodePaths(node2);
      if (paths2.length !== 1) throw new Error("\u8BF7\u9009\u62E9\u4E00\u4E2A\u6295\u9012\u6587\u4EF6");
      const cwd = node2.worktreePath ?? node2.cwd;
      const file = await this.file(paths2[0], cwd);
      const path = this.workspacePath({ path: paths2[0], cwd });
      await this.record(node2, void 0, id, file.entry, {
        kind: "file",
        text: text.replaceAll("\r\n", "\n"),
        path: path.rel,
        cwd: path.base
      }, owner, file);
    }
  }
  async revert(id) {
    const change = this.latest(id);
    if (!change || change.pending || change.revertedBy) throw new Error("\u6B64\u6539\u52A8\u5DF2\u64A4\u56DE\u6216\u4E0D\u53EF\u7528");
    const node2 = this.document().nodes.find((node3) => node3.id === change.nodeId);
    if (!node2) throw new Error("\u5BB9\u5668\u5DF2\u79FB\u9664");
    const file = change.after?.kind === "file" ? await this.file(change.after.path, change.after.cwd) : void 0;
    const current = file ? file.entry : canvasEntry(node2, change.itemId);
    requireVersion(change.afterVersion, file?.version ?? versionOf(current));
    const undone = await this.record(node2, change.itemId, `undo:${id}`, current, change.before, { by: "\u7528\u6237" }, file);
    await this.table.put(id, { ...change, revertedBy: undone.id });
    return undone;
  }
};
var jsonToolOutput = {
  schema: { type: "object", additionalProperties: true },
  render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
};
async function approveWrite(ctx, exec, toolName, title) {
  const approval = ctx.get("approval");
  const result = await approval?.request({
    agent: exec.agent,
    toolName,
    callId: exec.callId,
    signal: exec.signal,
    reason: `\u5141\u8BB8 Agent \u4FEE\u6539\u300C${title}\u300D\u4E2D\u7684\u5185\u5BB9\uFF1F`
  });
  if (result !== "allowed-once") throw new Error("\u5BB9\u5668\u6539\u52A8\u672A\u83B7\u6279\u51C6");
}
function registerContainerTools(ctx, store, scheduler) {
  for (const kind of ["board", "note", "file"]) {
    const when = ({ agent }) => store.mounts(agent.id, kind).length > 0;
    ctx.tools.register({
      name: `${kind}_read`,
      description: `List your writable FlowSpace ${kind} references or read one with its current version.`,
      parameters: { type: "object", properties: { edgeId: { type: "string" } }, additionalProperties: false },
      output: jsonToolOutput,
      async execute(raw, exec) {
        const { edgeId } = lookup.partial().parse(raw);
        const sessionId = exec.agent?.id;
        if (!sessionId) throw new Error("\u5BB9\u5668\u5DE5\u5177\u9700\u8981\u753B\u5E03 Agent \u4F1A\u8BDD");
        return scheduler.transact(async () => edgeId ? store.read(store.mount(sessionId, kind, edgeId), exec.signal) : { references: store.mounts(sessionId, kind).map(({ node: node2, edge: edge2, permission }) => ({
          edgeId: edge2.id,
          title: node2.title,
          permission
        })) });
      }
    }, { when });
    const schema5 = kind === "board" ? boardUpdate : update;
    const toolName = `${kind}_write`;
    ctx.tools.register({
      name: toolName,
      description: kind === "board" ? "Change one granted FlowSpace board card. Use board_read first to get its current version. For add, expectedVersion is absent." : `Replace the text of one granted FlowSpace ${kind}. Read it first to get the current version.`,
      parameters: JSON.parse(JSON.stringify(z15.toJSONSchema(schema5, { target: "draft-7" }))),
      output: jsonToolOutput,
      async execute(raw, exec) {
        const args = schema5.parse(raw);
        const agent = exec.agent;
        if (!agent) throw new Error("\u5BB9\u5668\u5DE5\u5177\u9700\u8981\u753B\u5E03 Agent \u4F1A\u8BDD");
        const before = store.mount(agent.id, kind, args.edgeId);
        if (before.edge.ask) await approveWrite(ctx, exec, toolName, before.node.title);
        return scheduler.transact(async () => {
          exec.signal.throwIfAborted();
          const current = store.mount(agent.id, kind, args.edgeId);
          if (before.node.id !== current.node.id || before.edge.sourceItemKey !== current.edge.sourceItemKey || current.edge.ask && !before.edge.ask || kind === "file" && (extractFileNodePaths(before.node)[0] !== extractFileNodePaths(current.node)[0] || (before.node.worktreePath ?? before.node.cwd) !== (current.node.worktreePath ?? current.node.cwd)))
            throw new Error("\u5BB9\u5668\u6388\u6743\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6");
          const running = scheduler.activeSessionStep(agent.id);
          const result = await store.write(current, args, {
            by: agent.id,
            sessionId: agent.id,
            edgeId: current.edge.id,
            runId: running?.run.id,
            stepId: running?.step.id
          }, JSON.stringify([agent.id, running?.step.id, exec.callId]), exec.signal);
          return { id: result.id, itemId: result.itemId ?? null, version: result.afterVersion };
        });
      }
    }, { when });
  }
}

// packages/flowspace/src/host/variables.ts
import { z as z16 } from "zod";
var variableRecordSchema = z16.object({
  id: z16.string(),
  key: z16.string(),
  name: z16.string(),
  scope: z16.enum(VARIABLE_SCOPES),
  type: z16.enum(VARIABLE_TYPES),
  runId: z16.string().optional(),
  lane: z16.string().optional(),
  version: z16.number().int().nonnegative(),
  value: z16.json(),
  history: z16.array(z16.object({
    id: z16.string(),
    writer: z16.string(),
    at: z16.number(),
    version: z16.number().int().positive(),
    from: z16.json(),
    to: z16.json(),
    runId: z16.string().optional(),
    stepId: z16.string().optional()
  }))
});
var humanWrite = z16.strictObject({
  id: z16.string(),
  runId: z16.string().optional(),
  lane: z16.string().optional(),
  expectedVersion: z16.number().int().nonnegative(),
  value: z16.json().optional()
});
var laneKey = (step) => step?.fanoutId && step.itemKey ? JSON.stringify([step.fanoutId, step.itemKey]) : void 0;
function applyOperation(current, operation, input) {
  if (operation === "set") return variableValue(current.type, input);
  if (operation === "append" && current.type === "list") {
    const addition = Array.isArray(input) ? input : [input];
    return [...current.value, ...addition];
  }
  if ((operation === "increment" || operation === "decrement") && current.type === "number") {
    const delta = variableValue("number", input);
    return variableValue("number", current.value + delta * (operation === "increment" ? 1 : -1));
  }
  if (operation === "merge" && current.type === "record")
    return { ...current.value, ...variableValue("record", input) };
  throw new Error("\u6B64\u64CD\u4F5C\u4E0E\u53D8\u91CF\u7C7B\u578B\u4E0D\u5339\u914D");
}
var VariableStore = class {
  constructor(table, document, runs, publish, onWrite) {
    this.table = table;
    this.document = document;
    this.runs = runs;
    this.publish = publish;
    this.onWrite = onWrite;
  }
  definitions(runId) {
    return (runId ? this.runs().find((run) => run.id === runId)?.graph.nodes ?? [] : this.document().nodes).filter((node2) => node2.flowType === variableNode.flowType);
  }
  definition(node2) {
    return node2.config ?? variableNode.defaultConfig;
  }
  named(name, runId) {
    const node2 = this.definitions(runId).find((node3) => this.definition(node3).name === name);
    if (!node2) throw new Error(`\u53D8\u91CF\u4E0D\u5B58\u5728\uFF1A${name}`);
    return node2;
  }
  resolve(node2, context, strict) {
    const { name, scope, type, initial } = this.definition(node2);
    const runId = scope !== "canvas" ? context.runId : void 0;
    const lane = scope === "lane" ? context.lane : void 0;
    if (strict && scope !== "canvas" && (!runId || scope === "lane" && !lane))
      throw new Error(`\u8BF7\u9009\u62E9\u300C${name}\u300D\u7684\u8FD0\u884C\u6216\u6CF3\u9053`);
    const key = JSON.stringify([this.document().id, node2.id, type, scope, runId, lane]);
    return {
      id: node2.id,
      key,
      scope,
      type,
      version: 0,
      value: variableValue(type, initial),
      history: [],
      ...this.table.get(key),
      name,
      ...runId ? { runId } : {},
      ...lane ? { lane } : {}
    };
  }
  list() {
    const records = [...this.table.entries()].map(([, value]) => value);
    const defined = this.definitions();
    return [
      ...defined.map((node2) => this.resolve(node2, {}, false)),
      ...records.filter((record) => record.runId)
    ];
  }
  read(node2, context) {
    return this.resolve(node2, context, false);
  }
  async write(node2, operation, value, owner, expectedVersion) {
    const current = this.resolve(node2, owner, true);
    if (owner.writeId && current.history.some((write) => write.id === owner.writeId)) return current;
    if (expectedVersion !== void 0 && expectedVersion !== current.version)
      throw new Error(`\u53D8\u91CF\u7248\u672C\u51B2\u7A81\u3002\u5F53\u524D\u7248\u672C v${current.version}\u3002`);
    let next = applyOperation(current, operation, value);
    if (Array.isArray(next)) next = next.slice(0, this.document().settings.listLimit ?? DEFAULT_LIST_LIMIT);
    const version = current.version + 1;
    const history = current.history.concat({
      id: owner.writeId ?? crypto.randomUUID(),
      at: Date.now(),
      writer: owner.writer,
      from: current.value,
      to: next,
      version,
      runId: owner.runId,
      stepId: owner.stepId
    });
    const result = { ...current, value: next, version, history };
    await this.table.put(result.key, result);
    this.publish();
    this.onWrite(result);
    return result;
  }
  async manualWrite(input) {
    const { id, runId, lane, value, expectedVersion } = humanWrite.parse(input);
    const node2 = this.definitions(runId).find((node3) => node3.id === id);
    if (!node2) throw new Error("\u53D8\u91CF\u5DF2\u79FB\u9664");
    await this.write(
      node2,
      "set",
      value === void 0 ? this.definition(node2).initial : value,
      { runId, lane, writer: "\u7528\u6237" },
      expectedVersion
    );
  }
  reference(node2, run, step) {
    const result = this.resolve(node2, { runId: run?.id, lane: laneKey(step) }, false);
    return {
      ...snapshotWithContent(node2, variableContent(result.type, result.value, run?.listLimit ?? DEFAULT_LIST_LIMIT)),
      referenceKind: "variable",
      version: String(result.version),
      title: `${result.name} \xB7 v${result.version}`
    };
  }
  prepare(node2, task, run, step) {
    const values = /* @__PURE__ */ new Map();
    const replace = (text) => text.replace(variableTemplate, (_whole, name) => {
      const result = values.get(name) ?? this.resolve(this.named(name, run?.id), { runId: run?.id, lane: laneKey(step) }, false);
      values.set(name, result);
      return typeof result.value === "string" ? result.value : JSON.stringify(result.value);
    });
    const visit = (value, field) => {
      if (typeof value === "string") return field === "source" ? value : replace(value);
      if (Array.isArray(value)) return value.map((entry) => visit(entry));
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, visit(item, name)]));
      return value;
    };
    const resolvedTask = replace(task);
    const expanded = node2.config ? visit(node2.config) : void 0;
    const config = node2.flowType?.startsWith("flowspace/exec-") ? node2.config : expanded;
    if (node2.breakpoint || run?.singleStep || run?.budget || node2.budget) {
      for (const definition2 of this.definitions(run?.id)) {
        const record = this.resolve(definition2, { runId: run?.id, lane: laneKey(step) }, false);
        if (!values.has(record.name)) values.set(record.name, record);
      }
    }
    const variables = [...values.values()].map(({ history, ...record }) => record);
    return { resolvedTask, config, variables };
  }
  assign = async (node2, step, signal, options) => {
    const config = assignmentConfig.parse(node2.config);
    const variable = this.named(config.name, options?.runId);
    const input = step.sources.at(-1);
    let value = config.inputValue && input ? input.content?.value ?? input.text : config.value;
    if (config.inputValue && input?.content?.dataType === "list") value = input.content.items.map((item) => item.value ?? null);
    signal.throwIfAborted();
    const result = await this.write(
      variable,
      config.operation,
      value,
      { runId: options?.runId, lane: laneKey(step), stepId: step.id, writer: node2.title, writeId: step.id }
    );
    const source = snapshotWithContent(node2, variableContent(result.type, result.value, options?.listLimit ?? DEFAULT_LIST_LIMIT));
    return { route: "out", output: source.text, source: { ...source, version: String(result.version) } };
  };
  deliver(node2, run, step, edgeId, source) {
    const value = source.content?.dataType === "list" ? source.content.items.map((item) => item.value ?? null) : source.content?.value ?? source.text;
    return this.write(node2, "set", value, {
      runId: run.id,
      lane: laneKey(step),
      stepId: step?.id,
      writer: step?.sessionId ?? source.title,
      writeId: JSON.stringify([step?.id, edgeId])
    });
  }
  recordAccumulator(run, step, node2, source) {
    const value = source.content?.items?.map((item) => item.value ?? item.spill?.preview ?? null) ?? [];
    const variable = { ...node2, config: { name: node2.title, scope: "run", type: "list", initial: "[]" } };
    return this.write(variable, "set", value, { runId: run.id, stepId: step.id, writer: node2.title, writeId: step.id });
  }
  registerTools(ctx, scheduler) {
    const mounts = (sessionId) => {
      const doc = this.document();
      const target = doc.nodes.find((node2) => node2.kind === "agent" && node2.sessionId === sessionId);
      if (!target) return [];
      return doc.edges.flatMap((edge2) => {
        if (edge2.target !== target.id) return [];
        const node2 = doc.nodes.find((node3) => node3.id === edge2.source && node3.flowType === variableNode.flowType);
        return node2 && containerPermission(node2, edge2) === "edit" ? [{ node: node2, edge: edge2 }] : [];
      });
    };
    const select = (sessionId, edgeId) => {
      const found = mounts(sessionId).find((item) => item.edge.id === edgeId);
      if (!found) throw new Error("\u4F1A\u8BDD\u6CA1\u6709\u6B64\u53D8\u91CF\u7684\u5199\u5165\u6388\u6743");
      return found;
    };
    const when = ({ agent }) => mounts(agent.id).length > 0;
    const get = z16.strictObject({ edgeId: z16.string().optional() });
    const set = z16.strictObject({
      edgeId: z16.string(),
      expectedVersion: z16.number().int().nonnegative().optional(),
      operation: z16.enum(VARIABLE_OPERATIONS).default("set"),
      value: z16.json()
    });
    const parameters = (schema5) => JSON.parse(JSON.stringify(z16.toJSONSchema(schema5, { target: "draft-7" })));
    ctx.tools.register({
      name: "var_get",
      description: "List writable variables or get a variable's current value and version by its reference edge ID.",
      parameters: parameters(get),
      output: jsonToolOutput,
      execute: async (raw, exec) => {
        const args = get.parse(raw);
        const id = exec.agent.id;
        const owner = scheduler.activeSessionStep(id);
        if (!args.edgeId) return { references: mounts(id).map(({ node: node2, edge: edge2 }) => ({ id: edge2.id, name: this.definition(node2).name })) };
        const result = this.read(select(id, args.edgeId).node, { runId: owner?.run.id, lane: laneKey(owner?.step) });
        return { value: result.value, version: result.version };
      }
    }, { when });
    ctx.tools.register({
      name: "var_set",
      description: "Set, append, increment, decrement or merge a mounted variable. Use var_get for its current version.",
      parameters: { type: "object", additionalProperties: false, required: ["edgeId", "value"], properties: {
        edgeId: { type: "string" },
        expectedVersion: { type: "integer", minimum: 0 },
        operation: { type: "string", enum: [...VARIABLE_OPERATIONS] },
        value: {}
      } },
      output: jsonToolOutput,
      execute: async (raw, exec) => {
        const args = set.parse(raw);
        const id = exec.agent.id;
        const before = select(id, args.edgeId);
        if (before.edge.ask) await approveWrite(ctx, exec, "var_set", before.node.title);
        return scheduler.transact(async () => {
          exec.signal.throwIfAborted();
          const current = select(id, args.edgeId);
          if (current.node.id !== before.node.id || current.edge.ask && !before.edge.ask)
            throw new Error("\u53D8\u91CF\u7684\u6388\u6743\u5DF2\u53D8\u5316");
          const owner = scheduler.activeSessionStep(id);
          const result = await this.write(current.node, args.operation, args.value, {
            runId: owner?.run.id,
            lane: laneKey(owner?.step),
            stepId: owner?.step.id,
            writer: id,
            writeId: JSON.stringify([id, owner?.step.id, exec.callId])
          }, args.expectedVersion);
          return { value: result.value, version: result.version };
        });
      }
    }, { when });
  }
};

// packages/flowspace/src/host/nodes/operations.ts
import { readFile } from "node:fs/promises";
import { z as z17 } from "zod";
var stringValues = z17.record(z17.string(), z17.string());
var operationRequest = z17.strictObject({ nodeId: z17.string(), values: stringValues.default({}) });
var softActions = /* @__PURE__ */ new Set(["discard", "push", "removeWorktree"]);
var requiredFields = {
  commit: ["message"],
  stage: ["paths"],
  unstage: ["paths"],
  discard: ["paths"],
  createBranch: ["branch"],
  checkoutBranch: ["branch"],
  createWorktree: ["branch"],
  removeWorktree: ["worktreePath"]
};
var shellQuote = (value, windows) => "'" + value.replaceAll("'", windows ? "''" : "'\\''") + "'";
var stdio = { maxBytes: 65536, spill: { maxBytes: 16 * 1024 * 1024 } };
function configOf(node2) {
  return node2.flowType === gitExec.flowType ? gitOperation.parse(node2.config) : terminalOperation.parse(node2.config);
}
function directSource(run, step) {
  const matches2 = run?.steps.filter((entry) => step.upstreamStepIds?.includes(entry.id)) ?? [];
  return matches2.length === 1 ? matches2[0].sessionId : void 0;
}
function interpolate(text, step) {
  const expand = (value) => value.replace(variableTemplate, (_match, name) => {
    const variable = step.variables?.find((item) => item.name === name);
    if (!variable) throw new Error(`\u53D8\u91CF\u4E0D\u5B58\u5728\uFF1A${name}`);
    return typeof variable.value === "string" ? variable.value : JSON.stringify(variable.value);
  });
  return expand(text).replace(/\{\{\s*(input|task)\s*\}\}/g, (_match, key) => key === "task" ? step.task : step.sources.at(-1)?.text ?? "");
}
var fullOutput = (output) => output.spillPath ? readFile(output.spillPath, "utf8") : Promise.resolve(output.text);
var OperationService = class {
  constructor(ctx, git, document, runs, workdir, sessionDirectory) {
    this.ctx = ctx;
    this.git = git;
    this.document = document;
    this.runs = runs;
    this.workdir = workdir;
    this.sessionDirectory = sessionDirectory;
  }
  terminals = /* @__PURE__ */ new Map();
  terminalQueue = /* @__PURE__ */ new Map();
  async agent(sessionId) {
    if (!sessionId) return;
    const result = await this.ctx.sessionController.resolveAgent(sessionId);
    return "error" in result ? void 0 : result.agent;
  }
  async fullAccess(id) {
    const agent = await this.agent(id);
    const policy = this.ctx.get("sandboxPolicy");
    return !!agent && policy?.resolve({ session: agent.session }).mode === "danger-full-access";
  }
  async generate(config, node2, step, name, signal, record) {
    if (!config.provider || !config.model) return void 0;
    const messages = [{ role: "user", content: [{
      type: "text",
      text: JSON.stringify({ operation: node2.title, parameter: name, sources: step.sources.map((source) => source.text) })
    }] }];
    let text = "";
    let inputTokens = 0, outputTokens = 0;
    const startedAt = Date.now();
    for await (const chunk of this.ctx.llm.stream({
      provider: config.provider,
      model: config.model,
      signal,
      messages,
      purpose: "flowspace-parameters",
      system: 'Give the requested operation parameter as a JSON object {"value":"..."}.'
    })) {
      if (chunk.type === "text-delta") text += chunk.text;
      if (chunk.type === "usage") {
        inputTokens += chunk.usage.inputTokens;
        outputTokens += chunk.usage.outputTokens;
      }
    }
    await record?.({
      id: crypto.randomUUID(),
      operation: "execution parameter",
      provider: config.provider,
      model: config.model,
      startedAt,
      endedAt: Date.now(),
      inputTokens,
      outputTokens,
      inputSummary: name,
      outputSummary: text.slice(0, 240)
    });
    try {
      return z17.object({ value: z17.string().min(1) }).parse(JSON.parse(text)).value;
    } catch {
      return void 0;
    }
  }
  preview(config, values, cwd) {
    return "program" in config ? `${cwd}
${JSON.stringify([config.program, ...config.parameters.map((parameter) => values[parameter.name] ?? "\u2026")])}` : `${cwd}
${JSON.stringify({ action: config.action, ...values }, null, 2)}`;
  }
  async prepare(node2, config, step, run, signal, sessionId = directSource(run, step), supplied = {}, record) {
    const directory = config.cwd || node2.worktreePath || node2.cwd || (sessionId ? this.sessionDirectory(sessionId) : void 0);
    const cwd = this.workdir(directory);
    if (directory && !sameFsPath(directory, cwd)) throw new Error("\u6267\u884C\u76EE\u5F55\u4E0D\u5728\u53EF\u7528\u7684\u5DE5\u4F5C\u533A\u5185");
    const values = {};
    const parent = run?.steps.findLast((entry) => step.upstreamStepIds?.includes(entry.id) && entry.sessionId === sessionId);
    const prefetched = parent?.operationParameters?.[node2.id] ?? {};
    const missing = [];
    for (const parameter of config.parameters) {
      const { name, source, value } = parameter;
      let resolved = source === "fixed" ? value : source === "template" ? interpolate(value, step) : void 0;
      if (source === "upstream") {
        const input = step.sources.at(-1)?.content?.value;
        const entry = input && typeof input === "object" && !Array.isArray(input) ? input[name] : void 0;
        resolved = supplied[name] ?? prefetched[name] ?? (typeof entry === "string" ? entry : void 0) ?? (value === "" ? void 0 : interpolate(value, step)) ?? await this.generate(config, node2, step, name, signal, record);
      }
      if (source === "model") resolved = await this.generate(config, node2, step, name, signal, record);
      if (source === "human") resolved = supplied[name];
      if (resolved === void 0 || source !== "fixed" && !resolved.trim()) missing.push(name);
      else values[name] = resolved;
    }
    if ("action" in config) {
      const required = requiredFields[config.action] ?? [];
      for (const field of required) if (!values[field]?.trim() && !missing.includes(field)) missing.push(field);
    }
    const revision = "action" in config ? (await this.git.inspect(cwd)).revision : void 0;
    return { cwd, sessionId, values, missing, preview: this.preview(config, values, cwd), revision };
  }
  async requiresApproval(config, operation) {
    if (await this.fullAccess(operation.sessionId)) return false;
    if ("action" in config && (softActions.has(config.action) || config.action === "checkoutBranch" && this.document().nodes.filter((node2) => node2.sessionId && sameFsPath(
      this.sessionDirectory(node2.sessionId) ?? node2.worktreePath ?? node2.cwd,
      operation.cwd
    )).length > 1)) return true;
    if (config.approved.includes(operation.preview)) return false;
    return config.parameters.some((parameter) => parameter.source === "model" || parameter.source === "upstream");
  }
  execute = async (node2, step, signal, options) => {
    const config = configOf(node2);
    const run = this.runs().find((run2) => run2.id === options?.runId);
    const operation = step.operation ?? await this.prepare(node2, config, step, run, signal, void 0, {}, options?.recordCall);
    operation.preview = this.preview(config, operation.values, operation.cwd);
    const followup = config.retryUpstream && operation.sessionId && operation.missing.length && !run?.steps.some((entry) => entry.parameterRetryFor === step.id) && config.parameters.some((parameter) => parameter.source === "upstream" && operation.missing.includes(parameter.name));
    if (operation.missing.length || !operation.approved && (operation.review || await this.requiresApproval(config, operation))) {
      return { operation, awaiting: {
        question: operation.preview,
        options: ["execute", "skip", ...followup ? ["retry"] : []],
        operation: true,
        fields: operation.missing.map((name) => ({ name, label: name, type: "text", required: true }))
      } };
    }
    const result = await this.perform(node2, config, operation, signal);
    const failed = result.exitCode !== 0 || result.timedOut;
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n") || (result.timedOut ? "\u6267\u884C\u8D85\u65F6" : failed ? `\u6267\u884C\u5931\u8D25\uFF08\u9000\u51FA\u7801 ${result.exitCode ?? "\u672A\u77E5"}\uFF09` : "");
    const content = "outputMode" in config && config.outputMode === "lines" && result.exitCode === 0 ? contentList(output.split(/\r?\n/).filter(Boolean), options?.listLimit ?? DEFAULT_LIST_LIMIT) : { dataType: "text", value: output };
    return {
      operation,
      operationResult: { ...result, stdout: result.stdout.slice(0, 4096), stderr: result.stderr.slice(0, 4096) },
      route: failed ? "error" : "out",
      output,
      source: snapshotWithContent(node2, content)
    };
  };
  async perform(node2, config, operation, signal) {
    signal.throwIfAborted();
    if ("action" in config) {
      const fields = operation.values;
      const request = {
        action: config.action,
        expectedRevision: operation.revision,
        paths: fields.paths?.split(/\r?\n/).filter(Boolean),
        branch: fields.branch,
        message: fields.message,
        baseRef: fields.baseRef,
        worktreePath: fields.worktreePath
      };
      const result = await this.git.act(operation.cwd, request);
      return { exitCode: 0, timedOut: false, stdout: result.commits[0]?.oid ?? result.branch ?? config.action, stderr: "" };
    }
    if (!config.program.trim()) throw new Error("\u8BF7\u5148\u6307\u5B9A\u53EF\u6267\u884C\u7A0B\u5E8F");
    const subprocess = this.ctx.get("subprocess");
    if (!subprocess) throw new Error("\u6B64 DSH \u914D\u7F6E\u6CA1\u6709\u5B50\u8FDB\u7A0B\u670D\u52A1");
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), Math.round(config.timeoutSec * 1e3));
    timer.unref();
    const timeout = deadline.signal;
    const combined = AbortSignal.any([signal, timeout]);
    const args = config.parameters.map((parameter) => operation.values[parameter.name]);
    try {
      if (config.mode === "interactive") return await this.interactive(node2, config, operation, args, combined);
      if (config.sandbox) {
        const shell = this.ctx.get("shell");
        if (!shell?.sandboxMode || shell.sandboxMode === "danger-full-access") throw new Error("\u6B64 DSH \u914D\u7F6E\u6CA1\u6709\u542F\u7528\u53D7\u9650 Shell \u6267\u884C\u5668");
        const pwsh = /pwsh/i.test(shell.constructor.name);
        const command = (pwsh ? "& " : "") + [config.program, ...args].map((arg) => shellQuote(arg, pwsh)).join(" ");
        const result = await shell.execute(shell.resolve({
          command,
          workdir: operation.cwd,
          signal: combined,
          timeoutMs: Math.round(config.timeoutSec * 1e3)
        })).result();
        const [stdout2, stderr2] = await Promise.all([fullOutput(result.stdout), fullOutput(result.stderr)]);
        return { exitCode: result.exitCode, timedOut: result.timedOut || timeout.aborted, stdout: stdout2, stderr: stderr2 };
      }
      const exe = await subprocess.resolveExecutable(config.program, void 0, combined);
      const handle = subprocess.spawn({
        argv: [exe, ...args],
        cwd: operation.cwd,
        stdio: { stdin: "ignore", stdout: stdio, stderr: stdio },
        graceMs: 500,
        signal: combined
      });
      const { exitCode } = await handle.done;
      const [stdout, stderr] = await Promise.all([fullOutput(handle.collected.stdout.readFrom(0)), fullOutput(handle.collected.stderr.readFrom(0))]);
      return { exitCode, timedOut: timeout.aborted, stdout, stderr };
    } finally {
      clearTimeout(timer);
    }
  }
  async interactive(node2, config, operation, args, signal) {
    const controller = this.ctx.get("terminalController");
    const sessionId = operation.sessionId ?? node2.terminalSessionId;
    const owner = await this.agent(sessionId);
    if (!controller || !owner) throw new Error("\u4EA4\u4E92\u6267\u884C\u9700\u8981\u7ED1\u5B9A\u5E26\u539F\u751F\u7EC8\u7AEF\u670D\u52A1\u7684\u4F1A\u8BDD");
    const key = JSON.stringify([sessionId, node2.id, operation.cwd]);
    const execute = async () => {
      signal.throwIfAborted();
      let terminal = this.terminals.get(key);
      if (config.terminalId && config.terminalId !== terminal?.id) throw new Error("\u8BE5\u7EC8\u7AEF\u4E0D\u5C5E\u4E8E\u6B64\u6267\u884C\u8282\u70B9");
      if (terminal?.info.control === "user") throw new Error("\u6B64\u7EC8\u7AEF\u5DF2\u7531\u7528\u6237\u63A5\u7BA1");
      if (!terminal || terminal.info.state !== "running") {
        const policy = this.ctx.get("sandboxPolicy");
        terminal = await controller.openForAgent(owner, {
          title: node2.title,
          cwd: operation.cwd,
          cols: 100,
          rows: 28,
          preferredShells: process.platform === "win32" ? ["pwsh.exe", "powershell.exe"] : ["bash", "sh"],
          policy: policy?.resolve({ session: owner.session }) ?? { mode: "danger-full-access", workspaceRoot: operation.cwd }
        }, signal);
        this.terminals.set(key, terminal);
      }
      const windows = /(?:^|[\\/])(?:powershell|pwsh)(?:\.exe)?$/i.test(terminal.info.shell.path);
      const marker = `FLOWSPACE_${crypto.randomUUID().replaceAll("-", "")}`;
      const invocation = [config.program, ...args].map((arg) => shellQuote(arg, windows)).join(" ");
      const begin = `${marker}=start`;
      const wrapped = windows ? `[Console]::WriteLine('${begin}'); & ${invocation}; if ($?) { [Console]::WriteLine('${marker}=0') } else { [Console]::WriteLine("${marker}=$LASTEXITCODE") }` : `printf '\\n%s\\n' '${begin}'; ${invocation}; printf '\\n${marker}=%s\\n' "$?"`;
      const ready2 = config.readyPattern ? new RegExp(config.readyPattern, "u") : void 0;
      const completion = new RegExp(`${marker}=(-?\\d+)[ \\t\\r]*$`, "m");
      await terminal.drain();
      const mark = terminal.mark();
      let output = "";
      try {
        await terminal.write(wrapped + "\r");
        for (; ; ) {
          const revision = terminal.revision;
          const lines2 = mark.lines().lines;
          const start = lines2.findIndex((line) => line.trimEnd().endsWith(begin));
          output = start < 0 ? "" : lines2.slice(start + 1).join("\n");
          const end = completion.exec(output);
          if (end || ready2?.test(output) || terminal.info.state !== "running")
            return {
              exitCode: end ? Number(end[1]) : ready2?.test(output) ? 0 : null,
              timedOut: false,
              stdout: output.replace(completion, "").trim(),
              stderr: ""
            };
          await terminal.changed(revision, signal);
        }
      } catch (error) {
        if (!signal.aborted) throw error;
        return { exitCode: null, timedOut: true, stdout: output, stderr: "" };
      } finally {
        mark.dispose();
      }
    };
    const pending2 = (this.terminalQueue.get(key) ?? Promise.resolve()).then(execute, execute);
    this.terminalQueue.set(key, pending2);
    return pending2.finally(() => {
      if (this.terminalQueue.get(key) === pending2) this.terminalQueue.delete(key);
    });
  }
  prefetch(run, step) {
    if (step.parameterRetryFor) {
      const target = run.steps.find((entry) => entry.id === step.parameterRetryFor);
      const node2 = run.graph.nodes.find((node3) => node3.id === target?.nodeId);
      return target?.operation && node2 ? [{ id: node2.id, title: node2.title, fields: target.operation.missing.filter((name) => configOf(node2).parameters.some((parameter) => parameter.name === name && parameter.source === "upstream")) }] : [];
    }
    return run.graph.edges.flatMap((edge2) => {
      if (edge2.kind !== "continuation" || edge2.trigger === "off" || edge2.source !== step.nodeId) return [];
      const node2 = run.graph.nodes.find((node3) => node3.id === edge2.target);
      if (!node2 || !isOperation(node2.flowType)) return [];
      const fields = configOf(node2).parameters.filter((parameter) => parameter.source === "upstream").map((parameter) => parameter.name);
      return fields.length ? [{ id: node2.id, title: node2.title, fields }] : [];
    });
  }
  registerTools(scheduler) {
    const lookup2 = (id) => {
      const target = this.document().nodes.find((node2) => node2.sessionId === id);
      const ids = new Set(this.document().edges.filter((edge2) => edge2.kind === "reference" && edge2.target === target?.id).map((edge2) => edge2.source));
      return this.document().nodes.filter((node2) => ids.has(node2.id) && isOperation(node2.flowType));
    };
    const schema5 = JSON.parse(JSON.stringify(z17.toJSONSchema(operationRequest, { target: "draft-7" })));
    this.ctx.tools.register({
      name: "provide_flow_parameters",
      description: "Supply parameters to a downstream FlowSpace operation before ending this turn.",
      parameters: schema5,
      output: jsonToolOutput,
      execute: async (input, exec) => scheduler.transact(async () => {
        const { nodeId, values } = operationRequest.parse(input);
        exec.signal.throwIfAborted();
        const owner = exec.agent && scheduler.activeSessionStep(exec.agent.id);
        const downstream = owner && this.prefetch(owner.run, owner.step).find((node2) => node2.id === nodeId);
        if (!owner || !downstream || Object.keys(values).some((field) => !downstream.fields.includes(field)))
          throw new Error("\u5F53\u524D\u6B65\u9AA4\u672A\u8BF7\u6C42\u8FD9\u4E9B\u53C2\u6570");
        (owner.step.operationParameters ??= {})[nodeId] = values;
        return { accepted: Object.keys(values) };
      })
    }, { when: ({ agent }) => scheduler.transact(async () => {
      const owner = scheduler.activeSessionStep(agent.id);
      return !!owner && this.prefetch(owner.run, owner.step).length > 0;
    }) });
    this.ctx.tools.register({
      name: "flow_execute",
      description: "Execute a preconfigured FlowSpace operation. The operation ID and allowed parameters are defined by a reference wire.",
      parameters: schema5,
      output: jsonToolOutput,
      execute: async (input, exec) => {
        const { nodeId, values } = operationRequest.parse(input);
        const id = exec.agent.id;
        const node2 = lookup2(id).find((node3) => node3.id === nodeId);
        if (!node2) throw new Error("\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709\u6B64\u6267\u884C\u8282\u70B9\u7684\u5DE5\u5177\u5F15\u7528");
        const config = configOf(node2);
        const owner = scheduler.activeSessionStep(id);
        const step = owner?.step ?? {
          id: exec.callId,
          nodeId: node2.id,
          requestId: exec.callId,
          state: "running",
          iteration: 0,
          sources: [],
          task: "",
          createdAt: Date.now()
        };
        const operation = await this.prepare(node2, config, step, owner?.run, exec.signal, id, values);
        if (operation.missing.length) throw new Error(`\u9700\u8981\u8865\u9F50\u53C2\u6570\uFF1A${operation.missing.join(", ")}`);
        if (await this.requiresApproval(config, operation)) await approveWrite(this.ctx, exec, "flow_execute", operation.preview);
        if (!lookup2(id).some((candidate) => candidate.id === node2.id && JSON.stringify(candidate.config) === JSON.stringify(node2.config)))
          throw new Error("\u6267\u884C\u8282\u70B9\u5B9A\u4E49\u6216\u6388\u6743\u5DF2\u53D8\u5316");
        return this.perform(node2, config, operation, exec.signal);
      }
    }, { when: ({ agent }) => lookup2(agent.id).length > 0 });
  }
};

// packages/flowspace/src/host/nodes/interactions.ts
import { Cron, RRule } from "@deepseek-ai/dsh-util-time";
var humanExecutor = (ctx) => async (node2, step, signal) => {
  const config = humanConfig.parse(node2.config);
  const fields = node2.flowType === "flowspace/human-score" ? [
    { name: "score", label: "flow_human_rating", type: config.rating === "like" ? "like" : "score", required: true },
    { name: "comment", label: "flow_human_comment", type: "text" }
  ] : node2.flowType === "flowspace/human-review" ? [
    { name: "text", label: "flow_human_review", type: "review", required: true }
  ] : config.fields;
  let initial = node2.flowType === "flowspace/human-review" ? { text: step.sources.at(-1)?.text ?? "" } : {};
  if (config.timeoutAction === "default") initial = checkAnswers(fields, JSON.parse(config.defaultAnswer));
  if (config.aiPrefill && config.provider && config.model) {
    let raw = "";
    try {
      for await (const chunk of ctx.llm.stream({
        provider: config.provider,
        model: config.model,
        signal,
        purpose: "flowspace-form-prefill",
        system: "Suggest form answers in a single JSON object keyed by field name.",
        messages: [{ role: "user", content: [{
          type: "text",
          text: JSON.stringify({ question: config.question, fields, source: step.sources.at(-1)?.text })
        }] }]
      })) if (chunk.type === "text-delta") raw += chunk.text;
      initial = checkAnswers(fields, JSON.parse(raw));
    } catch {
      signal.throwIfAborted();
    }
  }
  return { awaiting: {
    question: config.question,
    fields,
    initial,
    options: ["out", "skip"],
    timeoutAction: config.timeoutAction,
    defaultOption: "out",
    ...config.timeoutSec && config.timeoutAction !== "wait" ? { deadline: Date.now() + config.timeoutSec * 1e3 } : {}
  } };
};
var noticeExecutor = (notify) => async (node2, step) => {
  const config = noticeConfig.parse(node2.config);
  const source = step.sources.at(-1);
  const value = source?.content?.value;
  const summary = value && typeof value === "object" && !Array.isArray(value) && typeof value.summary === "string" ? value.summary : void 0;
  const text = config.message || summary || source?.text.slice(0, 1e3) || node2.title;
  notify({ id: step.id, at: Date.now(), title: config.title || node2.title, text, system: config.system, sound: config.sound });
  return { route: "out", output: text, source: snapshotWithContent(node2, { dataType: "text", value: text }) };
};
function triggerNext(config, after) {
  if (config.mode === "interval") return after + config.intervalSec * 1e3;
  if (config.mode !== "cron" && config.mode !== "rrule") return void 0;
  const result = config.mode === "cron" ? Cron.parse(config.schedule, config.timeZone) : RRule.parse(config.schedule);
  if (result.kind === "rejected") throw new Error(result.detail);
  const next = result.rule.next(after);
  return next === void 0 ? void 0 : Date.parse(next);
}
function validateTriggers(document) {
  for (const node2 of document.nodes) {
    if (node2.flowType !== triggerNode.flowType) continue;
    const config = triggerConfig.parse(node2.config);
    if (config.enabled) triggerNext(config, Date.now());
    if (config.match && config.mode === "terminal") new RegExp(config.match, "u");
  }
}
var TriggerService = class {
  constructor(ctx, table, scheduler, git, document, runs, publish, path, changes) {
    this.ctx = ctx;
    this.table = table;
    this.scheduler = scheduler;
    this.git = git;
    this.document = document;
    this.runs = runs;
    this.publish = publish;
    this.path = path;
    this.changes = changes;
  }
  startedAt = Date.now();
  serial = Promise.resolve();
  timer;
  running = false;
  observedAtBoot = /* @__PURE__ */ new Set();
  list() {
    return [...this.table.entries()].map(([, value]) => value);
  }
  start() {
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      void this.queue(() => this.tick(Date.now())).catch(() => void 0).finally(() => {
        this.running = false;
      });
    }, 1e3);
    this.timer.unref();
    return () => clearInterval(this.timer);
  }
  queue(action) {
    const next = this.serial.then(action);
    this.serial = next.then(() => void 0, (error) => this.ctx.logger.warn("FlowSpace \u89E6\u53D1\u5668\uFF1A%s", error));
    return next;
  }
  launch(id, values) {
    return this.queue(async () => {
      const node2 = this.document().nodes.find((node3) => node3.id === id && node3.flowType === triggerNode.flowType);
      if (!node2) throw new Error("\u542F\u52A8\u53F0\u5DF2\u79FB\u9664");
      const config = triggerConfig.parse(node2.config);
      if (config.mode !== "launchpad") throw new Error("\u6B64\u89E6\u53D1\u5668\u4E0D\u662F\u542F\u52A8\u53F0");
      const answer = checkAnswers(config.fields, values);
      const source = snapshotWithContent(node2, config.fields.length ? { dataType: "record", value: answer } : { dataType: "text", value: node2.title });
      const status = this.table.get(id) ?? { id, hits: 0, missed: 0 };
      const run = await this.scheduler.startTriggered(id, source);
      await this.save({ ...status, lastAt: Date.now(), hits: status.hits + 1 });
      return run;
    });
  }
  async save(status) {
    await this.table.put(status.id, status);
    this.publish();
  }
  active(id) {
    return this.runs().findLast((run) => run.triggerId === id && ["running", "waiting", "paused"].includes(run.state));
  }
  async fire(node2, config, state, source, now) {
    const defaults = this.document().settings.triggerGuards;
    const day = new Intl.DateTimeFormat("sv-SE", { timeZone: config.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    if (day !== state.day) Object.assign(state, { day, hits: 0 });
    if (now - (state.lastAt ?? 0) < (config.cooldownSec ?? defaults?.cooldownSec ?? 0) * 1e3 || state.hits >= (config.dailyLimit ?? defaults?.dailyLimit ?? Infinity)) {
      state.missed++;
      return;
    }
    const active2 = this.active(node2.id);
    if (active2) {
      const strategy = config.busy ?? defaults?.busy ?? "skip";
      if (strategy === "skip") {
        state.missed++;
        return;
      }
      if (strategy === "queue") {
        (state.queued ??= []).push(source);
        return;
      }
      await this.scheduler.command(active2.id, "cancel");
    }
    state.lastAt = now;
    state.hits++;
    await this.save(state);
    await this.scheduler.startTriggered(node2.id, source);
  }
  async observe(node2, config) {
    if (config.mode === "file" && config.path.trim()) {
      const { base, full, rel } = this.path({ path: config.path, cwd: config.cwd || node2.worktreePath || node2.cwd });
      const root = await this.ctx.fs.resolve(base);
      const target = await this.ctx.fs.resolve(full);
      if (!this.ctx.fs.contains(root, target)) throw new Error("\u89E6\u53D1\u8DEF\u5F84\u8D85\u51FA\u5DE5\u4F5C\u533A");
      const info = await this.ctx.fs.stat(target);
      if (info?.type === "directory") {
        const files = (await this.ctx.fs.listDir(target)).filter((entry) => entry.type === "file");
        return Object.fromEntries(await Promise.all(files.map(async (entry) => [
          rel === "." || !rel ? entry.name : `${rel.replaceAll("\\", "/")}/${entry.name}`,
          entry.version ?? (await this.ctx.fs.stat(entry.target))?.version ?? ""
        ])));
      }
      return info ? { [rel]: info.version } : {};
    }
    if (config.mode === "git") {
      const directory = this.path({ path: ".", cwd: config.cwd || node2.worktreePath || node2.cwd }).base;
      const status = await this.git.inspect(directory);
      if (config.match === "commit") return { commit: status.commits[0]?.oid ?? "" };
      if (config.match === "branch") return { branch: status.branch };
      return { git: status.revision };
    }
    if (config.mode === "terminal") {
      const all = this.runs().flatMap((run) => run.steps.filter((step) => step.operationResult && (!config.sourceNodeId || step.nodeId === config.sourceNodeId)));
      const found = all.findLast((step) => config.match ? new RegExp(config.match, "u").test(step.output ?? "") : step.operationResult.exitCode !== 0);
      return found ? { terminal: found.id, output: found.output?.slice(0, 512) ?? "" } : {};
    }
    if (config.mode === "container") {
      const board = this.document().nodes.find((node3) => node3.id === config.sourceNodeId && node3.kind === "board");
      if (board) return Object.fromEntries((board.columns ?? []).filter((column) => !config.match || config.match === column.id).flatMap((column) => column.cards.map((card) => [card.id, column.id])));
      const found = this.changes().findLast((change) => (!config.sourceNodeId || change.nodeId === config.sourceNodeId) && (!config.match || change.columnId === config.match));
      return found ? { container: found.key, at: String(found.at) } : {};
    }
  }
  async tick(now) {
    const doc = this.document();
    const nodes = doc.nodes.filter((node2) => node2.flowType === triggerNode.flowType);
    for (const node2 of nodes) {
      const config = triggerConfig.parse(node2.config);
      if (!config.enabled || config.mode === "launchpad") continue;
      const old = this.table.get(node2.id);
      const configKey = JSON.stringify([config.mode, config.schedule, config.timeZone, config.intervalSec, config.path, config.cwd, config.sourceNodeId, config.match]);
      const state = old?.configKey === configKey ? structuredClone(old) : { id: node2.id, hits: old?.hits ?? 0, lastAt: old?.lastAt, missed: old?.missed ?? 0, configKey, nextAt: triggerNext(config, now) };
      const scheduled = state.nextAt;
      if (scheduled && scheduled <= now) {
        let next = scheduled;
        if (config.mode === "interval") {
          const period = config.intervalSec * 1e3;
          const missed = Math.floor((now - scheduled) / period);
          next = scheduled + (missed + 1) * period;
          state.missed += missed;
        } else {
          for (; ; ) {
            const occurrence = triggerNext(config, next);
            if (occurrence === void 0 || occurrence > now) {
              next = occurrence ?? 0;
              break;
            }
            next = occurrence;
            state.missed++;
          }
        }
        state.nextAt = next || void 0;
        if (!doc.settings.automaticTriggers || scheduled < this.startedAt) state.missed++;
        else await this.fire(node2, config, state, snapshotWithContent(node2, {
          dataType: "text",
          value: new Date(scheduled).toISOString()
        }), now);
      }
      const observed = await this.observe(node2, config);
      const hasBaseline = this.observedAtBoot.has(node2.id);
      if (observed) this.observedAtBoot.add(node2.id);
      if (observed && JSON.stringify(observed) !== JSON.stringify(state.observed)) {
        const before = state.observed;
        state.observed = observed;
        if (before && Object.keys(observed).length + Object.keys(before).length) {
          const diff = [.../* @__PURE__ */ new Set([...Object.keys(observed), ...Object.keys(before)])].filter((key) => observed[key] !== before[key]);
          if (doc.settings.automaticTriggers && old && hasBaseline) {
            const entered = diff.filter((key) => observed[key] !== void 0);
            if (config.mode !== "container" || entered.length) {
              const source = snapshotWithContent(node2, config.mode === "file" ? contentList(diff) : { dataType: "text", value: JSON.stringify(config.mode === "container" ? Object.fromEntries(entered.map((key) => [key, observed[key]])) : observed) });
              await this.fire(node2, config, state, source, now);
            }
          } else state.missed++;
        }
      }
      if (doc.settings.automaticTriggers && state.queued?.length && !this.active(node2.id)) {
        const source = state.queued.shift();
        await this.fire(node2, config, state, source, now);
      }
      if (JSON.stringify(state) !== JSON.stringify(old)) await this.save(state);
    }
  }
};

// packages/flowspace/src/host/nodes/play.ts
import { randomInt } from "node:crypto";
var randomExecutor = (counter) => async (node2, step) => {
  const config = randomConfig.parse(node2.config);
  const count = config.branches.length;
  let index;
  if (config.mode === "rotation") {
    const state = counter.get(node2.id);
    if (state?.lastStep === step.id) index = state.index % count;
    else {
      index = (state?.next ?? 0) % count;
      await counter.put(node2.id, { next: index + 1, lastStep: step.id, index });
    }
  } else index = config.seed ? seededIndex(config.seed, step.iteration, count) : randomInt(count);
  const option = config.branches[index];
  const source = snapshotWithContent(node2, { dataType: "text", value: option.value || option.label });
  return { route: option.id, output: source.text, source, verdict: { branch: option.id } };
};
var ArenaStore = class {
  constructor(table) {
    this.table = table;
  }
  list() {
    return [...this.table.entries()].map(([, result]) => result);
  }
  async settle(run) {
    if (run.state !== "completed") return;
    for (const batch of run.fanouts ?? []) {
      const merge = run.graph.nodes.find((node2) => node2.id === batch.mergeId);
      if (!merge?.config?.arena || !batch.mergeStepId || !batch.lanes.some((lane) => lane.adopted === true)) continue;
      for (const lane of batch.lanes) {
        if (!lane.model || lane.adopted === void 0) continue;
        const id = JSON.stringify([run.id, batch.id, lane.item.key]);
        if (this.table.get(id)) continue;
        await this.table.put(id, { id, runId: run.id, tag: String(merge.config.taskTag || ""), model: lane.model, won: lane.adopted });
      }
    }
  }
};
async function buildReport(ctx, run, model) {
  const ended = Math.max(run.createdAt, ...run.steps.map((step) => step.endedAt ?? step.createdAt));
  const usage = budgetUsage(run.steps, run.createdAt, ended);
  const scores = run.fanouts?.flatMap((batch) => batch.lanes.filter((lane) => lane.adopted).map((lane) => ({ batch, lane }))) ?? [];
  const chosen = scores.toSorted((a, b) => (b.lane.score ?? 0) - (a.lane.score ?? 0))[0];
  const best = chosen && run.graph.nodes.find((node2) => node2.generatedBy === chosen.batch.fanId && node2.itemKey === chosen.lane.item.key);
  const bestNode = best?.title ?? run.graph.nodes.find((node2) => node2.id === run.steps.findLast((step) => step.state === "completed" && step.sessionId)?.nodeId)?.title;
  let summary = "";
  for await (const chunk of ctx.llm.stream({
    provider: model.provider,
    model: model.model,
    purpose: "flowspace-run-report",
    system: "Summarize this completed FlowSpace run in three short sentences using the provided results.",
    messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify({
      title: run.title,
      ...usage,
      bestNode,
      steps: run.steps.slice(-40).map((step) => ({ state: step.state, task: step.task.slice(0, 180), output: step.output?.slice(0, 480) })),
      artifacts: run.deliverables?.map((artifact) => artifact.path)
    }) }] }]
  })) {
    if (chunk.type === "text-delta") summary += chunk.text;
    if (chunk.type === "finish" && (chunk.reason.kind === "error" || chunk.reason.kind === "aborted"))
      throw new Error(chunk.reason.failure.message);
  }
  if (!summary.trim()) throw new Error("\u6A21\u578B\u6CA1\u6709\u8FD4\u56DE\u6218\u62A5");
  return { summary, ...usage, bestNode, artifacts: run.deliverables ?? [] };
}

// packages/flowspace/src/host/fanoutDrafts.ts
function motherDefinition(doc, fan) {
  const nodes = doc.nodes.filter((node2) => node2.masterOf === fan.id);
  const ids = new Set(nodes.map((node2) => node2.id));
  const edges = doc.edges.filter((edge2) => !edge2.generatedBy && (ids.has(edge2.source) || ids.has(edge2.target)));
  return JSON.stringify([fan.config, nodes, edges]);
}
async function reconcileFanoutDrafts(next, previous, runs, resolveDeferred, changedFiles = []) {
  const fans = next.nodes.filter((node2) => node2.flowType === "flowspace/fanout");
  if (!fans.length) return false;
  markFanoutOverrides(previous, next);
  const oldInputs = createStaticResolver(previous);
  const newInputs = createStaticResolver(next, {}, Object.fromEntries(changedFiles.map((id) => [id, "changed"])));
  let changed = false;
  const needsHost = (state) => state === "needs-file" || state === "needs-code" || state === "needs-spill";
  const used = new Set(runs.flatMap((run) => run.steps.map((step) => step.nodeId)));
  for (const run of runs) {
    if (run.state === "running" || run.state === "waiting" || run.state === "paused") {
      for (const node2 of run.graph.nodes) if (node2.generatedBy) used.add(node2.id);
    }
  }
  for (const fan of fans) {
    const old = previous.nodes.find((node2) => node2.id === fan.id);
    const motherChanged = !old || motherDefinition(previous, old) !== motherDefinition(next, fan);
    if (!motherChanged && oldInputs.signature(fan.id) === newInputs.signature(fan.id)) continue;
    let after = staticFanoutContent(next, fan.id);
    if (!after && needsHost(newInputs.inputs(fan.id).state)) after = await resolveDeferred(fan.id);
    if (after || old && (staticFanoutContent(previous, fan.id) || needsHost(oldInputs.inputs(fan.id).state))) {
      if (reconcileFanout(next, fan.id, after?.items ?? [], used)) changed = true;
    } else if (motherChanged) {
      if (syncExistingFanout(next, fan.id, used)) changed = true;
    }
  }
  return changed;
}

// packages/flowspace/src/host/storage.ts
import { z as z18 } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
var assetId = z18.string().trim().min(1);
var teamModelSchema = z18.object({
  provider: assetId,
  model: assetId,
  reasoningEffort: assetId.optional()
});
var saveRoleSchema = z18.object({
  id: assetId,
  title: assetId,
  description: z18.string(),
  persona: z18.string(),
  model: teamModelSchema,
  revision: z18.number().int().nonnegative()
});
var maxTeamSlots = 8;
var saveTeamSchema = z18.object({
  id: assetId,
  title: assetId,
  lead: z18.object({ persona: z18.string(), model: teamModelSchema }),
  slots: z18.array(z18.object({
    slotId: z18.string().regex(/^(?!lead$)[a-z][a-z0-9-]{0,31}$/, "Invalid native subagent slot name"),
    roleId: assetId,
    label: assetId,
    model: teamModelSchema.optional(),
    maxInstances: z18.number().int().positive().optional(),
    nodeId: assetId.optional()
  })).min(1).max(maxTeamSlots),
  norms: z18.string(),
  revision: z18.number().int().nonnegative()
}).refine((team) => new Set(team.slots.map((slot) => slot.slotId)).size === team.slots.length, {
  path: ["slots"],
  message: "Slot names must be unique"
});
var revisionFields = {
  revision: z18.number().int().positive(),
  archived: z18.boolean().optional()
};
var roleDefinitionSchema = saveRoleSchema.extend(revisionFields);
var teamBlueprintSchema = saveTeamSchema.safeExtend(revisionFields);
var archiveTeamAssetSchema = z18.object({
  id: assetId,
  revision: revisionFields.revision
});
var teamReferenceSchema = z18.object({
  teamId: assetId,
  revision: revisionFields.revision.optional()
});
var teamDependenciesSchema = z18.object({
  teams: z18.array(teamBlueprintSchema),
  roles: z18.array(roleDefinitionSchema)
}).refine(
  ({ teams, roles }) => new Set(teams.map((team) => team.id)).size === teams.length && new Set(roles.map((role) => role.id)).size === roles.length,
  "Team dependency IDs must be unique"
);
var teamModelReplacementSchema = z18.array(z18.object({ from: teamModelSchema, to: teamModelSchema }));
var teamSessionSchema = z18.object({
  leadSessionId: assetId,
  nodeId: assetId,
  roster: z18.object({
    team: teamBlueprintSchema,
    roles: z18.array(roleDefinitionSchema)
  }),
  delegations: z18.array(z18.object({
    sessionId: assetId,
    slotId: assetId,
    roleId: assetId,
    model: teamModelSchema,
    roleRevision: revisionFields.revision,
    /** The canvas role node the member was delegated through. */
    nodeId: assetId.optional()
  })),
  /** Subagents the session already had when it became a team; they stay plain subagents. */
  priorChildren: z18.array(assetId).optional(),
  /** The node lost its roles: the session is a plain agent again, its member record kept. */
  released: z18.boolean().optional()
});
var groupPort = z18.object({
  id: z18.string(),
  portId: z18.string().optional(),
  kind: z18.enum(["reference", "continuation", "event"]),
  direction: z18.enum(["in", "out"]),
  name: z18.string(),
  nodes: z18.array(z18.string()),
  hidden: z18.boolean()
});
var budget = z18.object({
  tokens: z18.number().int().positive().optional(),
  seconds: z18.number().positive().optional(),
  rounds: z18.number().int().positive().optional()
});
var boardChecklistItem = z18.object({
  id: z18.string(),
  text: z18.string().max(BOARD_LIMITS.checklistText),
  done: z18.boolean()
});
var boardCard = z18.object({
  id: z18.string(),
  text: z18.string(),
  description: z18.string().max(BOARD_LIMITS.description).optional(),
  done: z18.boolean().optional(),
  priority: z18.enum(BOARD_PRIORITIES).optional(),
  tags: z18.array(z18.string().min(1).max(BOARD_LIMITS.tag)).max(BOARD_LIMITS.tags).optional(),
  dueDate: z18.iso.date().optional(),
  checklist: z18.array(boardChecklistItem).max(BOARD_LIMITS.checklist).optional(),
  comments: z18.array(z18.object({ id: z18.string(), by: z18.string(), text: z18.string(), createdAt: z18.number() })).optional(),
  author: z18.string().optional(),
  previousColumnId: z18.string().optional(),
  createdAt: z18.number().int().nonnegative().optional(),
  updatedAt: z18.number().int().nonnegative().optional()
});
var boardColumn = z18.object({
  id: z18.string(),
  name: z18.string(),
  cards: z18.array(boardCard),
  role: z18.enum(BOARD_ROLES).optional(),
  color: z18.enum(BOARD_COLORS).optional(),
  wipLimit: z18.number().int().positive().max(BOARD_LIMITS.wip).optional(),
  collapsed: z18.boolean().optional()
});
var boardSettings = z18.object({
  view: z18.enum(["board", "list"]).optional(),
  autoMoveDone: z18.boolean().optional(),
  showCompleted: z18.boolean().optional(),
  refScope: z18.enum(BOARD_REF_SCOPES).optional()
});
var windowState = z18.object({
  x: z18.number().finite(),
  y: z18.number().finite(),
  w: z18.number().positive(),
  h: z18.number().positive(),
  snap: z18.enum(["left", "right", "max"]).nullable().optional(),
  z: z18.number().optional()
});
var fanoutPairIds = z18.object({ fanId: assetId, mergeId: assetId });
var generationRevision = z18.number().int().nonnegative().optional();
var node = z18.object({
  breakpoint: z18.boolean().optional(),
  budget: budget.optional(),
  laneBindings: z18.object({
    provider: z18.string().optional(),
    model: z18.string().optional(),
    persona: z18.string().optional(),
    cwd: z18.string().optional()
  }).optional(),
  lanePersona: z18.string().optional(),
  canvasToolsOnly: z18.boolean().optional(),
  id: z18.string(),
  kind: z18.enum([
    "agent",
    "note",
    "file",
    "display",
    "group",
    "board",
    "detail",
    "git",
    "changes",
    "terminal",
    "role",
    "flow"
  ]),
  flowType: z18.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/).optional(),
  config: z18.record(z18.string(), z18.json()).optional(),
  configVersion: z18.number().int().nonnegative().optional(),
  title: z18.string(),
  x: z18.number().finite(),
  y: z18.number().finite(),
  width: z18.number().positive(),
  height: z18.number().positive(),
  expanded: z18.boolean(),
  parentId: z18.string().optional(),
  fanout: fanoutPairIds.optional(),
  masterOf: assetId.optional(),
  generatedBy: assetId.optional(),
  itemKey: assetId.optional(),
  itemTitle: z18.string().optional(),
  masterNodeId: assetId.optional(),
  laneIndex: z18.number().int().nonnegative().optional(),
  overridden: z18.boolean().optional(),
  removed: z18.boolean().optional(),
  generatedRevision: generationRevision,
  sessionId: z18.string().optional(),
  workspaceId: z18.string().optional(),
  cwd: z18.string().optional(),
  branch: z18.string().optional(),
  worktreePath: z18.string().optional(),
  agentPreset: z18.string().optional(),
  teamRef: teamReferenceSchema.optional(),
  teamConfig: z18.object({
    persona: z18.string(),
    norms: z18.string(),
    model: teamModelSchema.optional()
  }).optional(),
  teamLayout: z18.enum(["row", "orbit", "tree"]).optional(),
  roleRef: assetId.optional(),
  teamModel: teamModelSchema.optional(),
  maxInstances: z18.number().int().positive().max(8).optional(),
  staffOf: z18.string().optional(),
  slotId: z18.string().regex(SLOT_ID, "Invalid native subagent slot name").optional(),
  planMode: z18.boolean().optional(),
  customTitle: z18.boolean().optional(),
  subAgentsExpanded: z18.boolean().optional(),
  task: z18.string(),
  draft: z18.string(),
  continuationPrompt: z18.string().optional(),
  continuationCollapsed: z18.boolean().optional(),
  nativeTrigger: z18.enum(["inherit", "enabled", "disabled"]),
  participation: z18.enum(["global", "manual", "paused", "bypassed"]),
  text: z18.string(),
  sourceNodeId: z18.string().optional(),
  sourceSeq: z18.number().optional(),
  fixed: z18.boolean(),
  collapsed: z18.boolean(),
  lastSubmittedTask: z18.string().optional(),
  tab: z18.enum(["task", "conversation", "execution", "crew"]).optional(),
  pinned: z18.boolean().optional(),
  roleLabel: z18.string().optional(),
  rerun: z18.enum(["change", "update", "always"]).optional(),
  color: z18.enum(["violet", "teal", "blue", "amber"]).optional(),
  ports: z18.array(groupPort).optional(),
  templateId: z18.string().optional(),
  templateRevision: z18.number().int().positive().optional(),
  templateSlotId: z18.string().optional(),
  titleKey: z18.string().optional(),
  window: windowState.nullable().optional(),
  columns: z18.array(boardColumn).optional(),
  boardSettings: boardSettings.optional(),
  items: z18.array(z18.string()).optional(),
  selectedItems: z18.array(z18.string()).optional(),
  nudge: z18.object({
    by: z18.string(),
    origX: z18.number().finite().optional(),
    origY: z18.number().finite().optional(),
    origW: z18.number().positive().optional(),
    origH: z18.number().positive().optional()
  }).optional(),
  gitTab: z18.enum(["changes", "history", "branches"]).optional(),
  gitCommitOid: z18.string().optional(),
  changesSessionId: z18.string().optional(),
  changesSeq: z18.number().optional(),
  changesTurn: z18.number().optional(),
  terminalSessionId: z18.string().optional(),
  terminalId: z18.string().optional()
});
var waypoint = z18.object({
  x: z18.number().finite(),
  y: z18.number().finite()
});
var spill = z18.object({
  locator: z18.string().min(1),
  preview: z18.string(),
  bytes: z18.number().int().nonnegative()
});
var contentItem = z18.object({
  key: z18.string().min(1),
  value: z18.json().optional(),
  spill: spill.optional()
}).refine((item) => item.value !== void 0 !== !!item.spill, "\u6761\u76EE\u5FC5\u987B\u5305\u542B\u4E00\u4E2A\u503C\u6216 spill \u5F15\u7528");
var flowContentSchema = z18.object({
  dataType: z18.enum(["text", "record", "list", "signal", "file"]),
  value: z18.json().optional(),
  items: z18.array(contentItem).optional(),
  originalCount: z18.number().int().nonnegative().optional(),
  spill: spill.optional()
}).superRefine((content, ctx) => {
  if (content.dataType === "list") {
    if (!content.items || content.spill || content.value !== void 0)
      ctx.addIssue({ code: "custom", message: "\u5217\u8868\u5185\u5BB9\u5FC5\u987B\u4F7F\u7528\u6709\u5E8F\u6761\u76EE" });
    else if (new Set(content.items.map((item) => item.key)).size !== content.items.length)
      ctx.addIssue({ code: "custom", path: ["items"], message: "\u5217\u8868\u6761\u76EE\u6807\u8BC6\u91CD\u590D" });
    else if (content.originalCount !== void 0 && content.originalCount < content.items.length)
      ctx.addIssue({ code: "custom", path: ["originalCount"], message: "\u539F\u59CB\u9879\u6570\u5C0F\u4E8E\u5DF2\u4FDD\u7559\u9879\u6570" });
    return;
  }
  if (content.items || content.spill && content.value !== void 0) {
    ctx.addIssue({ code: "custom", message: "\u5185\u5BB9\u503C\u4E0E\u6761\u76EE\u3001spill \u5F15\u7528\u4E0D\u80FD\u6DF7\u7528" });
  } else if (!content.spill && (content.dataType === "text" && typeof content.value !== "string" || content.dataType === "record" && (!content.value || typeof content.value !== "object" || Array.isArray(content.value)) || content.dataType === "file" && content.value === void 0)) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "\u5185\u5BB9\u4E0E\u7AEF\u53E3\u7C7B\u578B\u4E0D\u7B26" });
  }
});
var edge = z18.object({
  id: z18.string(),
  source: z18.string(),
  target: z18.string(),
  generatedBy: assetId.optional(),
  itemKey: assetId.optional(),
  masterEdgeId: assetId.optional(),
  generatedRevision: generationRevision,
  sourcePort: z18.string().optional(),
  targetPort: z18.string().optional(),
  emitMode: z18.enum(["stream", "end"]).optional(),
  permission: z18.enum(["read", "advance", "edit"]).optional(),
  ask: z18.boolean().optional(),
  delivery: z18.object({ mode: z18.enum(["lines", "paragraph", "list"]), columnId: z18.string().optional() }).optional(),
  logic: z18.object({
    negate: z18.boolean().optional(),
    fromRound: z18.number().int().nonnegative().optional(),
    maxTimes: z18.number().int().nonnegative().optional(),
    delayMs: z18.number().int().nonnegative().optional()
  }).optional(),
  kind: z18.enum(["reference", "continuation", "event"]),
  event: z18.object({
    mode: z18.enum(["end", "change", "continuous"]),
    kinds: z18.array(z18.enum(["running", "waiting", "done", "error", "budget", "output", "tool", "usage", "container"])),
    reasons: z18.array(z18.string()).optional(),
    cooldownMs: z18.number().int().nonnegative().optional(),
    maxTimes: z18.number().int().positive().optional(),
    full: z18.boolean().optional()
  }).optional(),
  mode: z18.enum(["conclusion", "session", "fork"]),
  trigger: z18.enum(["off", "auto", "confirm"]),
  maxRounds: z18.number().int().positive(),
  always: z18.boolean(),
  sentVersion: z18.string().optional(),
  currentVersion: z18.string().optional(),
  sourceItemKey: z18.string().optional(),
  snapshotTitle: z18.string().optional(),
  snapshotText: z18.string().optional(),
  snapshotContent: flowContentSchema.optional(),
  originMode: z18.enum(["conclusion", "session", "fork"]).optional(),
  waypoints: z18.array(waypoint).optional(),
  placedCapsules: z18.array(z18.string()).optional()
});
var workflowTemplateSchema = z18.object({
  id: z18.string(),
  fanout: fanoutPairIds.optional(),
  title: z18.string(),
  description: z18.string(),
  revision: z18.number().int().positive(),
  builtin: z18.boolean().optional(),
  color: z18.enum(["violet", "teal", "blue", "amber"]).optional(),
  w: z18.number().positive(),
  h: z18.number().positive(),
  nodes: z18.array(node),
  edges: z18.array(edge),
  ports: z18.array(groupPort)
});
var canvasSnapshotSchema = z18.object({
  id: z18.string(),
  title: z18.string(),
  createdAt: z18.number(),
  nodes: z18.array(node),
  edges: z18.array(edge),
  viewport: z18.object({
    x: z18.number(),
    y: z18.number(),
    zoom: z18.number().positive()
  }),
  summary: z18.object({
    drafts: z18.number(),
    stopping: z18.number(),
    awaiting: z18.number(),
    queued: z18.number(),
    recentOutputs: z18.array(
      z18.object({
        title: z18.string(),
        snippet: z18.string()
      })
    )
  }).optional()
});
var documentSchema = z18.object({
  containerRevision: z18.number().int().nonnegative().optional(),
  version: z18.literal(1),
  generationRevision,
  id: z18.literal("main"),
  title: z18.string(),
  nodes: z18.array(node),
  edges: z18.array(edge),
  viewport: z18.object({
    x: z18.number(),
    y: z18.number(),
    zoom: z18.number().positive()
  }),
  settings: z18.object({
    nativeChatTriggers: z18.boolean(),
    reducedMotion: z18.boolean(),
    automaticTriggers: z18.boolean().optional(),
    budget: budget.optional(),
    triggerGuards: z18.object({
      cooldownSec: z18.number().nonnegative().optional(),
      dailyLimit: z18.number().int().positive().optional(),
      busy: z18.enum(["skip", "queue", "interrupt"]).optional()
    }).optional(),
    listLimit: z18.number().int().positive().optional()
  }),
  prefs: z18.object({
    theme: z18.enum(["dark", "light", "auto"]).optional(),
    wheel: z18.enum(["zoom", "pan"]).optional(),
    wireRouting: z18.enum(["avoid", "overlap"]).optional(),
    snap: z18.boolean().optional(),
    filter: z18.enum(["auto", "running", "3d", "7d", "all"]).optional(),
    hiddenWorkspaces: z18.array(z18.string()).optional(),
    showBranches: z18.boolean().optional(),
    showWorktrees: z18.boolean().optional()
  }).optional(),
  templates: z18.array(workflowTemplateSchema).optional(),
  snapshots: z18.array(canvasSnapshotSchema).optional()
});
var flowspaceDomain = defineDomain({
  name: "flowspace",
  version: 1,
  tables: {
    documents: domainTable(documentSchema),
    runs: domainTable(
      z18.custom(
        (v) => typeof v === "object" && v !== null && "id" in v && "steps" in v
      ).transform((run) => {
        for (const token of run.tokens) token.createdAt ??= token.source.capturedAt;
        return run;
      })
    ),
    templates: domainTable(workflowTemplateSchema),
    snapshots: domainTable(canvasSnapshotSchema),
    roles: domainTable(roleDefinitionSchema),
    teams: domainTable(teamBlueprintSchema),
    team_sessions: domainTable(teamSessionSchema),
    variables: domainTable(variableRecordSchema),
    play_counters: domainTable(z18.object({ next: z18.number().int().nonnegative(), lastStep: z18.string(), index: z18.number().int().nonnegative() })),
    arena_results: domainTable(z18.object({ id: z18.string(), runId: z18.string(), tag: z18.string(), model: teamModelSchema, won: z18.boolean() })),
    triggers: domainTable(z18.object({
      id: z18.string(),
      nextAt: z18.number().optional(),
      lastAt: z18.number().optional(),
      hits: z18.number(),
      missed: z18.number(),
      day: z18.string().optional(),
      configKey: z18.string().optional(),
      queued: z18.array(z18.custom()).optional(),
      observed: z18.record(z18.string(), z18.string()).optional()
    })),
    content_spills: domainTable(spill.extend({
      encoding: z18.enum(["text", "json"]),
      retrievalHint: z18.string()
    })),
    container_changes: domainTable(z18.object({
      id: z18.string(),
      nodeId: z18.string(),
      itemId: z18.string().optional(),
      edgeId: z18.string().optional(),
      sessionId: z18.string().optional(),
      runId: z18.string().optional(),
      stepId: z18.string().optional(),
      by: z18.string(),
      at: z18.number(),
      revision: z18.number().int().positive(),
      before: z18.discriminatedUnion("kind", [
        z18.object({ kind: z18.literal("board"), columnId: z18.string(), beforeId: z18.string().optional(), card: boardCard }),
        z18.object({ kind: z18.literal("note"), text: z18.string() }),
        z18.object({ kind: z18.literal("file"), text: z18.string(), path: z18.string(), cwd: z18.string() })
      ]).nullable(),
      after: z18.discriminatedUnion("kind", [
        z18.object({ kind: z18.literal("board"), columnId: z18.string(), beforeId: z18.string().optional(), card: boardCard }),
        z18.object({ kind: z18.literal("note"), text: z18.string() }),
        z18.object({ kind: z18.literal("file"), text: z18.string(), path: z18.string(), cwd: z18.string() })
      ]).nullable(),
      beforeVersion: z18.string(),
      afterVersion: z18.string(),
      pending: z18.boolean().optional(),
      revertedBy: z18.string().optional()
    }))
  }
});
function checkGraph(graph) {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const missingPlugins = /* @__PURE__ */ new Set();
  for (const n of graph.nodes) {
    if (n.fanout) {
      const fan = nodes.get(n.fanout.fanId), merge = nodes.get(n.fanout.mergeId);
      if (n.kind !== "group" || fan?.flowType !== "flowspace/fanout" || merge?.flowType !== "flowspace/merge-sort" || fan.parentId !== n.id || merge.parentId !== n.id) throw new Error("\u6247\u51FA\u4E0E\u5408\u5E76\u5FC5\u987B\u4F4D\u4E8E\u6240\u5C5E\u7684\u6247\u51FA\u5206\u7EC4\u5185");
    }
    if (n.generatedBy && (!n.itemKey || !n.masterNodeId && !n.overridden || n.laneIndex === void 0 || nodes.get(n.generatedBy)?.flowType !== "flowspace/fanout")) throw new Error("\u6CF3\u9053\u8282\u70B9\u7F3A\u5C11\u6761\u76EE\u3001\u6BCD\u7248\u6216\u6247\u51FA\u6765\u6E90");
    if (n.window === null) {
      delete n.window;
    } else if (n.window && n.window.snap === null) {
      delete n.window.snap;
    }
    if (n.kind === "board") graph.edges = pruneBoardReferences(n, graph.edges);
    if (n.kind !== "flow") continue;
    const descriptor = descriptorOf(n.flowType);
    if (!descriptor) {
      missingPlugins.add(n.id);
      continue;
    }
    const version = n.configVersion ?? 1;
    if (version > descriptor.version)
      throw new Error(`${n.title}\uFF1A\u914D\u7F6E\u7248\u672C ${version} \u9AD8\u4E8E\u5DF2\u5B89\u88C5\u7684 ${descriptor.version}`);
    let config = n.config ?? descriptor.defaultConfig;
    if (n.config && version < descriptor.version && descriptor.migrate)
      config = descriptor.migrate(n.config, version);
    const parsed2 = descriptor.configSchema.safeParse(config);
    if (!parsed2.success) throw new Error(`${n.title}\uFF1A\u8282\u70B9\u914D\u7F6E\u65E0\u6548\uFF08${z18.prettifyError(parsed2.error)}\uFF09`);
    n.config = parsed2.data;
    n.configVersion = descriptor.version;
  }
  for (const edge2 of graph.edges) {
    const source = nodes.get(edge2.source), target = nodes.get(edge2.target);
    const result = canConnect({
      ...edge2,
      source,
      target,
      edges: graph.edges,
      edgeId: edge2.id
    });
    if (result.ok) {
      if (edge2.kind === "event") {
        const seen = /* @__PURE__ */ new Set([edge2.target]);
        const pending2 = [edge2.target];
        while (pending2.length) {
          const current = pending2.pop();
          for (const link of graph.edges) {
            if (link.source !== current || link.kind === "reference" || link.trigger === "off" || seen.has(link.target)) continue;
            seen.add(link.target);
            pending2.push(link.target);
          }
        }
        if ((target?.kind === "agent" || seen.has(edge2.source)) && !edge2.event?.cooldownMs)
          throw new Error("\u53D1\u5F80 Agent \u6216\u6784\u6210\u73AF\u8DEF\u7684\u4E8B\u4EF6\u7EBF\u9700\u8981\u51B7\u5374\u65F6\u95F4");
        if (seen.has(edge2.source) && !edge2.event?.maxTimes) throw new Error("\u4E8B\u4EF6\u73AF\u8DEF\u9700\u8981\u6B21\u6570\u4E0A\u9650");
      }
      if (edge2.emitMode && (source?.kind !== "agent" || edge2.kind !== "continuation" || !target || !structuredInput(target, edge2.targetPort))) throw new Error("\u4EA7\u51FA\u6A21\u5F0F\u9700\u8981 Agent \u63A5\u7EED\u5230\u5217\u8868\u6216\u8BB0\u5F55\u8F93\u5165");
      if (edge2.emitMode === "stream" && target && !canStreamTo(target, edge2.targetPort))
        throw new Error("\u968F\u51FA\u968F\u53D1\u9700\u8981\u6247\u51FA\u3001\u5408\u5E76\u5206\u62E3\u6216\u6570\u636E\u8282\u70B9");
      continue;
    }
    if (result.reason === "flow_invalid_output" && missingPlugins.has(edge2.source)) continue;
    if (result.reason === "flow_invalid_input" && missingPlugins.has(edge2.target)) continue;
    throw new Error(tFor("zh", result.reason));
  }
}
function checkDocument(doc) {
  checkGraph(doc);
  for (const template2 of doc.templates ?? []) checkGraph(template2);
  for (const snapshot2 of doc.snapshots ?? []) checkGraph(snapshot2);
  const ids = new Set(doc.nodes.map((n) => n.id));
  if (ids.size !== doc.nodes.length) throw new Error("\u8282\u70B9\u8EAB\u4EFD\u91CD\u590D");
  const sessions = doc.nodes.flatMap((n) => n.sessionId ? [n.sessionId] : []);
  if (sessions.length !== new Set(sessions).size)
    throw new Error("\u4E00\u4E2A\u4F1A\u8BDD\u53EA\u80FD\u5BF9\u5E94\u4E00\u4E2A Agent \u8282\u70B9");
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const staffSlots = /* @__PURE__ */ new Map();
  for (const n of doc.nodes) {
    if ((n.teamRef || n.teamConfig) && n.kind !== "agent") throw new Error("\u56E2\u961F\u5FC5\u987B\u4F7F\u7528 Agent \u8282\u70B9");
    if (n.teamRef && n.teamConfig) throw new Error("\u56E2\u961F\u53EA\u80FD\u5F15\u7528\u7F16\u5236\u5E93\u6216\u5728\u753B\u5E03\u4E0A\u7EC4\u5EFA\uFF0C\u4E0D\u80FD\u540C\u65F6\u4F7F\u7528");
    if (n.staffOf !== void 0) {
      if (n.kind !== "role") throw new Error("\u53EA\u6709\u5C97\u4F4D\u8282\u70B9\u53EF\u4EE5\u63A5\u5165\u56E2\u961F");
      if (byId.get(n.staffOf)?.kind !== "agent") throw new Error("\u5C97\u4F4D\u8282\u70B9\u53EA\u80FD\u63A5\u5165 Agent \u8282\u70B9");
      const taken = staffSlots.get(n.staffOf) ?? /* @__PURE__ */ new Set();
      if (n.slotId && taken.has(n.slotId)) throw new Error(`\u540C\u4E00\u56E2\u961F\u7684\u5C97\u4F4D\u540D\u91CD\u590D: ${n.slotId}`);
      if (n.slotId) taken.add(n.slotId);
      staffSlots.set(n.staffOf, taken);
    }
    if (!n.parentId) continue;
    const parent = doc.nodes.find((p) => p.id === n.parentId);
    if (!parent || parent.kind !== "group" || parent.id === n.id)
      throw new Error("\u65E0\u6548\u5206\u7EC4");
    const grand = parent.parentId && doc.nodes.find((p) => p.id === parent.parentId);
    if (grand && (grand.parentId || n.kind === "group"))
      throw new Error("\u5206\u7EC4\u6700\u591A\u4E24\u5C42");
  }
}

// packages/flowspace/src/host/teamAssets.ts
var modelKey = (model) => JSON.stringify([model.provider, model.model, model.reasoningEffort ?? ""]);
function nextRevision(expected, current) {
  if (expected !== (current ?? 0)) throw new Error("\u7248\u672C\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u7F16\u8F91\u3002 / Revision changed. Reopen the editor.");
  return expected + 1;
}
var TeamAssets = class {
  constructor(domain, llm) {
    this.domain = domain;
    this.llm = llm;
  }
  listRoles() {
    return structuredClone([...this.domain.table("roles").entries()].map(([, role]) => role));
  }
  listTeams() {
    return structuredClone([...this.domain.table("teams").entries()].map(([, team]) => team));
  }
  getTeam(id) {
    return this.domain.table("teams").get(id);
  }
  roster(teamId) {
    const team = this.getTeam(teamId);
    if (!team) throw new Error(`\u627E\u4E0D\u5230\u56E2\u961F\u7F16\u5236 / Team blueprint not found: ${teamId}`);
    const roles = [...new Set(team.slots.map((slot) => slot.roleId))].map((id) => {
      const role = this.domain.table("roles").get(id);
      if (!role) throw new Error(`\u627E\u4E0D\u5230\u89D2\u8272 / Role not found: ${id}`);
      return role;
    });
    return { team, roles };
  }
  /**
   * The roster a team node runs with: its library blueprint (or canvas lead
   * settings) plus every role node wired into it. Without a lead model, the
   * roster keeps `leadModel` so a new lead session can supply its default.
   */
  rosterForNode(node2, nodes, leadModel) {
    if (node2.kind !== "agent") throw new Error(`\u4E0D\u662F Agent \u8282\u70B9 / Not an agent node: ${node2.id}`);
    const base = node2.teamRef ? this.roster(node2.teamRef.teamId) : void 0;
    const roles = [...base?.roles ?? []];
    const slots = [...base?.team.slots ?? []];
    const taken = new Set(slots.map((slot) => slot.slotId));
    for (const staff of staffNodes(nodes, node2.id)) {
      const label = staff.title.trim() || "\u6210\u5458";
      let role;
      if (staff.roleRef) {
        role = this.domain.table("roles").get(staff.roleRef);
        if (!role) throw new Error(`\u627E\u4E0D\u5230\u89D2\u8272 / Role not found: ${staff.roleRef}`);
      } else {
        if (!staff.teamModel) throw new Error(`\u5C97\u4F4D\u300C${label}\u300D\u8FD8\u6CA1\u6709\u9009\u62E9\u6A21\u578B / Role "${label}" needs a model`);
        role = {
          id: `canvas-${staff.id}`,
          title: label,
          revision: 1,
          persona: staff.text,
          model: staff.teamModel,
          description: staff.task.trim() || staff.text.split(/\r?\n/).find((line) => line.trim())?.trim() || label
        };
      }
      if (!roles.some((known) => known.id === role.id)) roles.push(role);
      const slotId = staff.slotId && !taken.has(staff.slotId) ? staff.slotId : slotIdFor(label, taken);
      taken.add(slotId);
      slots.push({
        slotId,
        roleId: role.id,
        label,
        nodeId: staff.id,
        ...staff.roleRef && staff.teamModel ? { model: staff.teamModel } : {},
        ...staff.maxInstances ? { maxInstances: staff.maxInstances } : {}
      });
    }
    if (!slots.length) throw new Error("\u56E2\u961F\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u5C97\u4F4D\uFF1A\u628A\u5C97\u4F4D\u8282\u70B9\u8FDE\u5230\u56E2\u961F\u4E0A\u3002 / Wire at least one role node into the team.");
    if (slots.length > maxTeamSlots) throw new Error(`\u56E2\u961F\u6700\u591A ${maxTeamSlots} \u4E2A\u5C97\u4F4D / A team has at most ${maxTeamSlots} slots`);
    const team = base ? { ...base.team, slots } : {
      id: canvasTeamId(node2.id),
      title: node2.title,
      revision: 1,
      slots,
      norms: node2.teamConfig?.norms ?? "",
      lead: { persona: node2.teamConfig?.persona ?? "", model: node2.teamConfig?.model ?? leadModel }
    };
    return { team, roles };
  }
  async listModelRoutes() {
    const results = await Promise.allSettled(this.llm.listProviders().map(
      async (provider) => (await this.llm.listModels(provider.id)).map((model) => ({
        provider: provider.id,
        providerName: provider.name,
        model: model.id,
        name: model.name
      }))
    ));
    return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
  async validateModels(models) {
    const [missing] = await this.missingModels(models);
    if (missing) throw new Error(`\u6A21\u578B\u4E0D\u53EF\u7528 / Model unavailable: ${missing.provider}/${missing.model}${missing.reasoningEffort ? ` (${missing.reasoningEffort})` : ""}`);
  }
  async missingModels(models) {
    const catalogs = /* @__PURE__ */ new Map();
    const missing = [];
    for (const model of new Map(models.map((model2) => [modelKey(model2), model2])).values()) {
      let catalog = catalogs.get(model.provider);
      if (!catalog) {
        catalog = await this.llm.listModels(model.provider).catch(() => []);
        catalogs.set(model.provider, catalog);
      }
      if (!catalog.some((entry) => entry.id === model.model)) {
        missing.push(model);
      } else if (model.reasoningEffort) {
        await this.llm.resolveCallConfig(model).catch(() => {
          missing.push(model);
        });
      }
    }
    return missing;
  }
  async prepareImport(request, referenced) {
    const input = teamDependenciesSchema.parse(request.dependencies ?? { teams: [], roles: [] });
    const replacements = new Map(teamModelReplacementSchema.parse(request.replacements ?? []).map(
      ({ from, to }) => [modelKey(from), to]
    ));
    const replacement = (model) => replacements.get(modelKey(model)) ?? model;
    const roleIds = /* @__PURE__ */ new Map();
    const teamIds = /* @__PURE__ */ new Map();
    const additions = { roles: [], teams: [] };
    const roles = new Map(this.domain.table("roles").entries());
    const teams = new Map(this.domain.table("teams").entries());
    for (const incoming of input.roles) {
      const id = request.copyAssets ? uid() : incoming.id;
      roleIds.set(incoming.id, id);
      if (roles.has(id)) continue;
      const role = { ...incoming, id, model: replacement(incoming.model) };
      roles.set(id, role);
      additions.roles.push(role);
    }
    for (const incoming of input.teams) {
      const id = request.copyAssets ? uid() : incoming.id;
      teamIds.set(incoming.id, id);
      if (teams.has(id)) continue;
      const team = {
        ...incoming,
        id,
        lead: { ...incoming.lead, model: replacement(incoming.lead.model) },
        slots: incoming.slots.map((slot) => ({
          ...slot,
          roleId: roleIds.get(slot.roleId) ?? slot.roleId,
          ...slot.model ? { model: replacement(slot.model) } : {}
        }))
      };
      teams.set(id, team);
      additions.teams.push(team);
    }
    const models = additions.roles.map((role) => role.model);
    const teamIdsToValidate = /* @__PURE__ */ new Set([...referenced, ...input.teams.map((team) => team.id)]);
    for (const teamId of teamIdsToValidate) {
      const team = teams.get(teamIds.get(teamId) ?? teamId);
      if (!team) throw new Error(`\u627E\u4E0D\u5230\u56E2\u961F\u7F16\u5236 / Team blueprint not found: ${teamId}`);
      models.push(team.lead.model);
      for (const slot of team.slots) {
        const role = roles.get(slot.roleId);
        if (!role) throw new Error(`\u627E\u4E0D\u5230\u89D2\u8272 / Role not found: ${slot.roleId}`);
        models.push(role.model);
        if (slot.model) models.push(slot.model);
      }
    }
    return { additions, teamIds, roleIds, missing: await this.missingModels(models) };
  }
  async addImported(assets) {
    for (const role of assets.roles) await this.domain.table("roles").put(role.id, role);
    for (const team of assets.teams) await this.domain.table("teams").put(team.id, team);
  }
  async saveRole(request) {
    const input = saveRoleSchema.parse(request);
    const table = this.domain.table("roles");
    const current = table.get(input.id);
    const revision = nextRevision(input.revision, current?.revision);
    if (current?.archived) throw new Error("\u6B64\u89D2\u8272\u5DF2\u5F52\u6863\u3002 / This role is archived.");
    await this.validateModels([input.model]);
    const saved = { ...input, revision };
    await table.put(saved.id, saved);
    return saved;
  }
  async saveTeam(request) {
    const input = saveTeamSchema.parse(request);
    const table = this.domain.table("teams");
    const current = table.get(input.id);
    const revision = nextRevision(input.revision, current?.revision);
    if (current?.archived) throw new Error("\u6B64\u7F16\u5236\u5DF2\u5F52\u6863\u3002 / This team is archived.");
    const models = input.slots.map((slot) => {
      const role = this.domain.table("roles").get(slot.roleId);
      if (!role || role.archived && !current?.slots.some(
        (previous) => previous.slotId === slot.slotId && previous.roleId === role.id
      )) throw new Error(`\u89D2\u8272\u4E0D\u53EF\u7528 / Role unavailable: ${slot.roleId}`);
      return slot.model ?? role.model;
    });
    await this.validateModels([input.lead.model, ...models]);
    const saved = { ...input, revision };
    await table.put(saved.id, saved);
    return saved;
  }
  async archiveRole(request) {
    const { id, revision } = archiveTeamAssetSchema.parse(request);
    const table = this.domain.table("roles");
    const current = table.get(id);
    if (!current) throw new Error("\u627E\u4E0D\u5230\u89D2\u8272\u3002 / Role not found.");
    const saved = { ...current, revision: nextRevision(revision, current.revision), archived: true };
    await table.put(id, saved);
    return saved;
  }
  async archiveTeam(request) {
    const { id, revision } = archiveTeamAssetSchema.parse(request);
    const table = this.domain.table("teams");
    const current = table.get(id);
    if (!current) throw new Error("\u627E\u4E0D\u5230\u56E2\u961F\u3002 / Team not found.");
    const saved = { ...current, revision: nextRevision(revision, current.revision), archived: true };
    await table.put(id, saved);
    return saved;
  }
};

// packages/flowspace/src/host/teamDelegate.ts
import { z as z19 } from "zod";
var teamDelegateName = "team_delegate";
var inputSchema = z19.object({ slot: z19.string().min(1), task: z19.string().trim().min(1) });
function teamAgentOptions(model) {
  return { ...model, reasoningEffort: model.reasoningEffort };
}
function rosterSlots(roster) {
  return roster.team.slots.map((slot) => {
    const role = roster.roles.find((role2) => role2.id === slot.roleId);
    return { ...slot, role, model: slot.model ?? role.model, maxInstances: slot.maxInstances ?? 1 };
  });
}
function slotOf(slots, child) {
  const nodeId = child.nodeId ?? (child.roleId.startsWith("canvas-") ? child.roleId.slice("canvas-".length) : void 0);
  return nodeId ? slots.find((slot) => slot.nodeId === nodeId) : slots.find((slot) => !slot.nodeId && slot.slotId === child.slotId && slot.roleId === child.roleId);
}
function planDelegation(record, args, names) {
  const { slot: slotId, task } = inputSchema.parse(args);
  const slots = rosterSlots(record.roster);
  const slot = slots.find((slot2) => slot2.slotId === slotId);
  if (!slot) throw new Error(`Unknown team slot "${slotId}". Use a slot ID from <team-brief>.`);
  const count = record.delegations.filter(
    (child) => slotOf(slots, child)?.slotId === slotId && child.roleId === slot.roleId && child.roleRevision === slot.role.revision && child.model.provider === slot.model.provider && child.model.model === slot.model.model && child.model.reasoningEffort === slot.model.reasoningEffort
  ).length;
  if (count >= slot.maxInstances) {
    throw new Error(`Slot "${slotId}" reached its ${slot.maxInstances}-member limit. Use send_message to reuse a member.`);
  }
  let name = slotId;
  for (let index = 2; names.has(name); index++) {
    const suffix = `-${index}`;
    name = slotId.slice(0, 32 - suffix.length) + suffix;
  }
  const persona = [slot.role.description, slot.role.persona].filter(Boolean).join("\n");
  return { slot, name, prompt: `<role-persona>
${persona}
</role-persona>

${task}` };
}
function registerTeamDelegate(ctx, isLead, delegate) {
  return ctx.tools.register({
    name: teamDelegateName,
    description: "Start a FlowSpace team member in a slot from <team-brief>. FlowSpace assigns the role and model. Returns the member name immediately. Use send_message to reuse a member. The native runtime delivers results to the lead.",
    parameters: {
      type: "object",
      properties: { slot: { type: "string" }, task: { type: "string" } },
      required: ["slot", "task"],
      additionalProperties: false
    },
    output: {
      schema: {
        type: "object",
        properties: { name: { type: "string" }, label: { type: "string" }, model: { type: "string" } },
        required: ["name", "label", "model"],
        additionalProperties: false
      },
      render: (_args, value) => [{
        type: "text",
        text: JSON.stringify({ name: value.name })
      }],
      presentationMeta: (_args, value) => value
    },
    presentResult: (_args, result) => {
      const meta = result.meta;
      return result.isError || !meta ? void 0 : {
        card: "generic",
        title: `\u6D3E\u7ED9 ${meta.label} \xB7 ${meta.model}`
      };
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error("team_delegate requires a calling team lead.");
      return delegate(exec.agent, args, exec.signal);
    }
  }, { when: ({ agent }) => isLead(agent.id) });
}

// packages/flowspace/src/host/teamRuntime.ts
var delegationTools = ["subagent", "subagent_fork", "workflow"];
function stableJson(value) {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
}
function leadDefault(agent) {
  const current = agent.model.current();
  if (!current) throw new Error("\u8BF7\u4E3A\u56E2\u961F\u4E3B\u7BA1\u9009\u62E9\u6A21\u578B\u3002 / Choose a model for the team lead.");
  return {
    provider: current.provider,
    model: current.model,
    ...current.reasoningEffort ? { reasoningEffort: current.reasoningEffort } : {}
  };
}
var TeamRuntime = class {
  constructor(ctx, domain, assets, publish, nodes) {
    this.ctx = ctx;
    this.domain = domain;
    this.assets = assets;
    this.publish = publish;
    this.nodes = nodes;
    for (const [id, record] of domain.table("team_sessions").entries())
      (record.released ? this.dormant : this.records).set(id, record);
    const unregister = registerTeamDelegate(ctx, (id) => this.isLead(id), (agent, args, signal) => this.delegate(agent, args, signal));
    ctx.effect(() => () => {
      unregister();
      for (const release of this.restrictions.values()) release();
    });
    ctx.on("agent/created", ({ agent }) => {
      const record = this.records.get(agent.id);
      if (record) this.applyLead(agent, record);
      return void 0;
    });
    ctx.on("agent/disposed", ({ agent }) => {
      this.restrictions.delete(agent);
      this.userTurns.delete(agent.id);
    });
    ctx.sessionProjections.onChanged((session, key, value) => {
      if (key === "agentTeam" && this.isLead(session.id)) {
        this.boards.set(session.id, value);
        this.queueRefresh(session.id);
      }
      if (key === "subagentCatalog") this.refreshFor(session.id);
    });
    ctx.on("subagent/start", ({ id, parentSessionId, runId }) => {
      const root = this.rootFor(parentSessionId);
      if (!root) return;
      this.leafRoots.set(id, root);
      this.activations.set(id, runId);
      this.queueRefresh(root);
    });
    ctx.on("subagent/end", ({ id, parentSessionId, runId }) => {
      if (this.activations.get(id) === runId) this.activations.delete(id);
      this.refreshFor(this.leafRoots.get(id) ?? parentSessionId);
    });
    ctx.on("agent/status", ({ agent }) => {
      if (this.leafRoots.has(agent.id)) this.refreshFor(agent.id);
    });
  }
  records = /* @__PURE__ */ new Map();
  /** Released leads: plain agents again, keeping who their members were. */
  dormant = /* @__PURE__ */ new Map();
  views = /* @__PURE__ */ new Map();
  boards = /* @__PURE__ */ new Map();
  models = /* @__PURE__ */ new Map();
  restrictions = /* @__PURE__ */ new Map();
  leafRoots = /* @__PURE__ */ new Map();
  activations = /* @__PURE__ */ new Map();
  refreshes = /* @__PURE__ */ new Map();
  waits = /* @__PURE__ */ new Map();
  delegateTails = /* @__PURE__ */ new Map();
  userTurns = /* @__PURE__ */ new Map();
  epochs = /* @__PURE__ */ new Set();
  pendingSaves = /* @__PURE__ */ new Map();
  syncs = /* @__PURE__ */ new Map();
  warn(error) {
    this.ctx.logger.warn("FlowSpace team: %s", error);
  }
  isLead(sessionId) {
    return this.records.has(sessionId);
  }
  ownsNode(sessionId, nodeId) {
    return this.records.get(sessionId)?.nodeId === nodeId;
  }
  reference(sessionId) {
    const team = this.records.get(sessionId)?.roster.team;
    return team && { teamId: team.id, revision: team.revision };
  }
  isFollowup(sessionId, turn) {
    return this.isLead(sessionId) && this.userTurns.get(sessionId) !== turn;
  }
  wantsTeam(node2) {
    return isTeamNode(node2, staffedIds(this.nodes()));
  }
  async validateRoster(node2) {
    const roster = this.assets.rosterForNode(node2, this.nodes());
    const lead = roster.team.lead.model;
    await this.assets.validateModels([...lead ? [lead] : [], ...rosterSlots(roster).map((slot) => slot.model)]);
    return roster;
  }
  async bind(node2, sessionId, draft) {
    const service = this.ctx.get("agentTeams");
    if (!service) throw new Error("DSH Agent Teams service is unavailable");
    const result = await this.ctx.sessionController.resolveAgent(sessionId);
    if ("error" in result) throw result.error;
    const model = draft.team.lead.model ?? leadDefault(result.agent);
    const roster = { ...draft, team: { ...draft.team, lead: { ...draft.team.lead, model } } };
    const earlier = this.dormant.get(sessionId);
    const delegations = earlier?.nodeId === node2.id ? earlier.delegations : [];
    const members2 = new Set(delegations.map((child) => child.sessionId));
    const children = await this.ctx.subagents.listDescendants(sessionId);
    const priorChildren = children.flatMap((row) => row.kind === "child" && !members2.has(row.id) ? [row.id] : []);
    const record = {
      leadSessionId: sessionId,
      nodeId: node2.id,
      roster,
      delegations,
      ...priorChildren.length ? { priorChildren } : {}
    };
    result.agent.model.select(teamAgentOptions(roster.team.lead.model));
    await service.setEnabled(result.agent, true);
    await this.save(record);
    this.dormant.delete(sessionId);
    this.applyLead(result.agent, record);
    this.boards.set(sessionId, { enabled: true, tasks: [] });
    await this.refresh(sessionId);
  }
  /**
   * Brings an existing session in line with its node's wiring: an agent that
   * gains role nodes becomes a team lead in place; a canvas team that loses all
   * of them goes back to a plain agent once its tree is idle. Library teams stay bound.
   */
  sync(nodeId) {
    const sessionId = this.nodes().find((node2) => node2.id === nodeId)?.sessionId;
    if (!sessionId) return Promise.resolve();
    const previous = this.syncs.get(sessionId) ?? Promise.resolve();
    const next = previous.catch(() => {
    }).then(async () => {
      const wanted = () => {
        const nodes = this.nodes();
        const node2 = nodes.find((candidate) => candidate.id === nodeId && candidate.sessionId === sessionId);
        return node2 && { node: node2, team: isTeamNode(node2, staffedIds(nodes)) };
      };
      const record = this.records.get(sessionId);
      const now = wanted();
      if (!now) return;
      if (now.team && !record) {
        await this.bind(now.node, sessionId, await this.validateRoster(now.node));
      } else if (!now.team && record?.nodeId === nodeId && !now.node.teamRef) {
        await this.waitForIdle(sessionId);
        const later = wanted();
        if (later && !later.team && this.records.has(sessionId)) await this.release(sessionId);
      }
    });
    this.syncs.set(sessionId, next);
    void next.finally(() => {
      if (this.syncs.get(sessionId) === next) this.syncs.delete(sessionId);
    }).catch(() => {
    });
    return next;
  }
  async release(sessionId) {
    const record = { ...this.records.get(sessionId), released: true };
    await this.domain.table("team_sessions").put(sessionId, record);
    this.dormant.set(sessionId, record);
    this.records.delete(sessionId);
    this.views.delete(sessionId);
    this.boards.delete(sessionId);
    this.userTurns.delete(sessionId);
    for (const [member, root] of this.leafRoots) if (root === sessionId) this.leafRoots.delete(member);
    const agent = this.ctx.agents.get(sessionId);
    if (agent) {
      this.restrictions.get(agent)?.();
      this.restrictions.delete(agent);
    }
    this.publish();
  }
  applyLead(agent, record) {
    agent.model.select(teamAgentOptions(record.roster.team.lead.model));
    if (this.restrictions.has(agent)) return;
    const releases = delegationTools.flatMap((name) => {
      if (!this.ctx.tools.get(name, agent)) return [];
      try {
        return [agent.ctx.tools.restrict({ deny: [name] })];
      } catch (error) {
        this.warn(error);
        return [];
      }
    });
    this.restrictions.set(agent, () => releases.forEach((release) => release()));
  }
  async save(record) {
    await this.domain.table("team_sessions").put(record.leadSessionId, record);
    this.records.set(record.leadSessionId, record);
  }
  /** Inbox claim precedes DSH's model selection capture for the step. */
  claim(agent, turn, user) {
    const record = this.records.get(agent.id);
    if (!record) return;
    if (user && this.userTurns.get(agent.id) !== turn) {
      this.userTurns.set(agent.id, turn);
      if (!this.epochs.has(agent.id)) {
        const roster = this.currentRoster(record);
        if (roster && stableJson(roster) !== stableJson(record.roster)) {
          const next = { ...record, roster };
          this.records.set(agent.id, next);
          const saved = this.save(next);
          this.pendingSaves.set(agent.id, saved);
          void saved.then(() => this.queueRefresh(agent.id), (error) => this.warn(error));
        }
        this.epochs.add(agent.id);
        void this.waitForIdle(agent.id).finally(() => this.epochs.delete(agent.id)).catch((error) => this.warn(error));
      }
    }
    agent.model.select(teamAgentOptions(this.records.get(agent.id).roster.team.lead.model));
  }
  /** The node's roster as the canvas and library stand now; undefined keeps the bound one. */
  currentRoster(record) {
    const nodes = this.nodes();
    const node2 = nodes.find((candidate) => candidate.id === record.nodeId);
    if (!node2) return;
    try {
      const draft = this.assets.rosterForNode(node2, nodes, record.roster.team.lead.model);
      const model = draft.team.lead.model ?? record.roster.team.lead.model;
      return { ...draft, team: { ...draft.team, lead: { ...draft.team.lead, model } } };
    } catch (error) {
      this.warn(error);
      return;
    }
  }
  async brief(sessionId) {
    const record = this.records.get(sessionId);
    if (!record) return;
    const saving = this.pendingSaves.get(sessionId);
    if (saving) {
      await saving;
      if (this.pendingSaves.get(sessionId) === saving) this.pendingSaves.delete(sessionId);
    }
    const { team } = record.roster;
    const slots = rosterSlots(record.roster).map(({ slotId, role, label, model, maxInstances }) => `- ${slotId} (${label}, ${model.provider}/${model.model}, up to ${maxInstances}): ${role.description}`).join("\n");
    return `<team-brief>
${team.title} \xB7 rev ${team.revision}
${team.lead.persona}
${team.norms}
${slots}
Coordinate work and report the team's results. Assign new work through team_delegate(slot, task). Use send_message to continue with an existing member. Native notices deliver the results.
</team-brief>`;
  }
  delegate(parent, args, signal) {
    const previous = this.delegateTails.get(parent.id) ?? Promise.resolve();
    const next = previous.catch(() => {
    }).then(async () => {
      const record = this.records.get(parent.id);
      if (!record) throw new Error("Only a FlowSpace team lead can delegate to a slot.");
      const rows = await this.ctx.subagents.listDescendants(parent.id, signal);
      const names = new Set(rows.flatMap((entry) => entry.depth === 1 && entry.path ? [entry.path] : []));
      const { slot, name, prompt } = planDelegation(record, args, names);
      try {
        const activation = await this.ctx.subagents.startActivation({
          provider: "spawn",
          parent,
          name,
          label: slot.label,
          delivery: "parent",
          prompt: [{ type: "text", text: prompt }],
          agentOptions: teamAgentOptions(slot.model),
          maxDepth: this.ctx.subagents.resolveMaxDepth(),
          signal
        });
        void activation.result.catch((error) => this.warn(error));
        try {
          const latest = this.records.get(parent.id);
          await this.save({ ...latest, delegations: [...latest.delegations, {
            sessionId: activation.childId,
            slotId: slot.slotId,
            roleId: slot.role.id,
            model: slot.model,
            roleRevision: slot.role.revision,
            ...slot.nodeId ? { nodeId: slot.nodeId } : {}
          }] });
        } catch (error) {
          await activation.dispose();
          throw error;
        }
        this.queueRefresh(parent.id);
        return { name: activation.name, label: slot.label, model: slot.model.model };
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ACTIVATION_LIMIT_REACHED")
          throw new Error("Team capacity is full. Wait for a member to finish or use send_message to reuse one.", { cause: error });
        throw error;
      }
    });
    this.delegateTails.set(parent.id, next);
    void next.finally(() => {
      if (this.delegateTails.get(parent.id) === next) this.delegateTails.delete(parent.id);
    }).catch(() => {
    });
    return next;
  }
  waitForIdle(sessionId) {
    const current = this.waits.get(sessionId);
    if (current) return current;
    const lead = this.ctx.agents.get(sessionId);
    if (!lead) return Promise.resolve();
    const wait = (async () => {
      do {
        await lead.whenIdle();
      } while (await this.ctx.subagents.waitForTreeWork(lead) || lead.status !== "idle");
    })();
    this.waits.set(sessionId, wait);
    void wait.finally(() => this.waits.delete(sessionId)).catch(() => {
    });
    return wait;
  }
  async interruptMembers(sessionId) {
    const rows = await this.ctx.subagents.listDescendants(sessionId);
    for (const row of rows) {
      if (row.kind === "child" && (row.activity === "running" || this.activations.has(row.id)))
        this.ctx.subagents.interruptByUser(row.id);
    }
  }
  rootFor(sessionId) {
    return this.records.has(sessionId) ? sessionId : this.leafRoots.get(sessionId);
  }
  refreshFor(sessionId) {
    const root = this.rootFor(sessionId);
    if (root) this.queueRefresh(root);
  }
  queueRefresh(sessionId) {
    void this.refresh(sessionId).catch((error) => this.warn(error));
  }
  refresh(sessionId) {
    const previous = this.refreshes.get(sessionId) ?? Promise.resolve();
    const next = previous.catch(() => {
    }).then(async () => {
      const record = this.records.get(sessionId);
      if (!record) return;
      const prior = new Set(record.priorChildren);
      const tree = await this.ctx.subagents.listDescendants(sessionId);
      for (let grew = prior.size > 0; grew; ) {
        grew = false;
        for (const row of tree) {
          if (prior.has(row.id) || !prior.has(row.parentId)) continue;
          prior.add(row.id);
          grew = true;
        }
      }
      const rows = tree.filter((row) => !prior.has(row.id));
      const delegations = new Map(record.delegations.map((child) => [child.sessionId, child]));
      const slots = rosterSlots(record.roster);
      const members2 = await Promise.all(rows.flatMap((row) => row.kind !== "child" ? [] : [(async () => {
        this.leafRoots.set(row.id, sessionId);
        const delegated = delegations.get(row.id);
        const slot = delegated && slotOf(slots, delegated);
        const agent = this.ctx.agents.get(row.id);
        const model = delegated?.model ?? agent?.model.current() ?? await this.memberModel(row.id, row.mode);
        return {
          sessionId: row.id,
          parentId: row.parentId,
          depth: row.depth,
          mode: row.mode,
          name: row.path ?? row.id,
          label: row.label ?? row.path ?? row.id,
          activity: agent?.status === "running" || row.mode === "external" && this.activations.has(row.id) ? "running" : "idle",
          slotId: slot?.slotId ?? null,
          ...slot?.nodeId ? { nodeId: slot.nodeId } : {},
          provider: model?.provider,
          model: model?.model
        };
      })()]));
      const { team } = record.roster;
      const board = this.boards.get(sessionId);
      const native = this.ctx.subagents;
      this.views.set(sessionId, {
        leadSessionId: sessionId,
        nodeId: record.nodeId,
        teamId: team.id,
        title: team.title,
        revision: team.revision,
        enabled: board?.enabled ?? false,
        tasks: board?.tasks ?? [],
        leadModel: team.lead.model,
        slots: slots.map(({ slotId, label, role, model, maxInstances, nodeId }) => ({
          slotId,
          label,
          roleTitle: role.title,
          model,
          maxInstances,
          ...nodeId ? { nodeId } : {}
        })),
        members: members2,
        capacity: {
          active: rows.filter((row) => row.kind === "child" && (row.activity === "running" || this.activations.has(row.id))).length,
          max: native.config.maxActiveSubagents.get()
        }
      });
      this.publish();
    });
    this.refreshes.set(sessionId, next);
    void next.finally(() => {
      if (this.refreshes.get(sessionId) === next) this.refreshes.delete(sessionId);
    }).catch(() => {
    });
    return next;
  }
  async memberModel(id, mode2) {
    var _stack = [];
    try {
      if (mode2 === "external") return;
      const cached = this.models.get(id);
      if (cached) return cached;
      const log = __using(_stack, await this.ctx.sessionQuery.observeSession(id));
      const selection = log.projections?.values.modelSelection;
      const model = selection?.pending ?? selection?.lastUsed;
      if (model) this.models.set(id, model);
      return model;
    } catch (_) {
      var _error = _, _hasError = true;
    } finally {
      __callDispose(_stack, _error, _hasError);
    }
  }
  async hydrate() {
    await Promise.all([...this.records].map(async ([id, record]) => {
      try {
        var _stack = [];
        try {
          const agent = this.ctx.agents.get(id);
          if (agent) this.applyLead(agent, record);
          const log = __using(_stack, await this.ctx.sessionQuery.observeSession(id));
          const board = log.projections?.values.agentTeam;
          if (board) this.boards.set(id, board);
          await this.refresh(id);
        } catch (_) {
          var _error = _, _hasError = true;
        } finally {
          __callDispose(_stack, _error, _hasError);
        }
      } catch (error) {
        this.warn(error);
      }
    }));
  }
  snapshot() {
    return Object.fromEntries(this.views);
  }
};

// packages/flowspace/src/index.ts
function teamBriefMessage(text) {
  return Object.freeze({
    id: randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "flowspace-team", form: "snapshot", sections: [{ name: "flowspace-team", text }] }
  });
}
var shortHash2 = (value) => createHash5("sha1").update(value).digest("hex").slice(0, 12);
var _follow_dec, _stopNode_dec, _canvasPresence_dec, _readWorkspaceFile_dec, _workspaceFiles_dec, _readTerminalScreen_dec, _openSessionTerminal_dec, _sessionTerminals_dec, _sessionChangeDiff_dec, _sessionChanges_dec, _gitAction_dec, _gitDiff_dec, _gitInspect_dec, _projectStructures_dec, _workspaces_dec, _sessions_dec, _display_dec, _bind_dec, _inspectEdgePayload_dec, _restoreSnapshot_dec, _release_dec, _previewData_dec, _remindEmission_dec, _answerHuman_dec, _command_dec, _extendLoop_dec, _rerunFailed_dec, _start_dec, _plan_dec, _draft_dec, _importWorkflow_dec, _generateReport_dec, _debugStep_dec, _launchTrigger_dec, _writeVariable_dec, _revertContainerChange_dec, _save_dec, _listModelRoutes_dec, _archiveTeam_dec, _saveTeam_dec, _listTeams_dec, _archiveRole_dec, _saveRole_dec, _listRoles_dec, _snapshot_dec, _a, _init, _b;
var FlowspaceService = class extends (_b = TypertRemoteService) {
  constructor(ctx) {
    super(ctx, "flowspace");
    __runInitializers(_init, 5, this);
    __publicField(this, "state", {
      doc: emptyDocument(),
      runs: [],
      live: /* @__PURE__ */ new Map(),
      nativeMessages: /* @__PURE__ */ new Map(),
      nativeOperations: /* @__PURE__ */ new Map(),
      notices: [],
      subagents: /* @__PURE__ */ new Map(),
      listeners: /* @__PURE__ */ new Set(),
      turnOutput: /* @__PURE__ */ new Map(),
      canvasSessions: /* @__PURE__ */ new Set(),
      knownWorktrees: /* @__PURE__ */ new Set(),
      injectedSteps: /* @__PURE__ */ new Set()
    });
    __publicField(this, "domain");
    __publicField(this, "teamAssets");
    __publicField(this, "teams");
    __publicField(this, "teamBriefs", /* @__PURE__ */ new Map());
    __publicField(this, "scheduler");
    __publicField(this, "containers");
    __publicField(this, "variables");
    __publicField(this, "operations");
    __publicField(this, "triggers");
    __publicField(this, "arena");
    __publicField(this, "reportRequests", /* @__PURE__ */ new Map());
    __publicField(this, "canvasToolRestrictions", /* @__PURE__ */ new Map());
    __publicField(this, "runtime");
    __publicField(this, "dataFileWatch");
    __publicField(this, "nodeExecutors", /* @__PURE__ */ new Map());
    __publicField(this, "git", new HostGitService());
    __publicField(this, "inputContexts", /* @__PURE__ */ new Map());
    __publicField(this, "deferredPersistTimer");
  }
  registerNodeKind(descriptor, executor) {
    return this.ctx.effect(() => {
      if (this.nodeExecutors.has(descriptor.flowType)) throw new Error(`\u8282\u70B9\u6267\u884C\u5668\u5DF2\u6CE8\u518C\uFF1A${descriptor.flowType}`);
      const unregister = descriptorOf(descriptor.flowType) === descriptor ? void 0 : registerDescriptor(descriptor);
      this.nodeExecutors.set(descriptor.flowType, executor);
      return () => {
        this.nodeExecutors.delete(descriptor.flowType);
        unregister?.();
      };
    });
  }
  async [(_a = Service.init, _snapshot_dec = [Remote], _listRoles_dec = [Remote], _saveRole_dec = [Remote], _archiveRole_dec = [Remote], _listTeams_dec = [Remote], _saveTeam_dec = [Remote], _archiveTeam_dec = [Remote], _listModelRoutes_dec = [Remote], _save_dec = [Remote], _revertContainerChange_dec = [Remote], _writeVariable_dec = [Remote], _launchTrigger_dec = [Remote], _debugStep_dec = [Remote], _generateReport_dec = [Remote], _importWorkflow_dec = [Remote], _draft_dec = [Remote], _plan_dec = [Remote], _start_dec = [Remote], _rerunFailed_dec = [Remote], _extendLoop_dec = [Remote], _command_dec = [Remote], _answerHuman_dec = [Remote], _remindEmission_dec = [Remote], _previewData_dec = [Remote], _release_dec = [Remote], _restoreSnapshot_dec = [Remote], _inspectEdgePayload_dec = [Remote], _bind_dec = [Remote], _display_dec = [Remote], _sessions_dec = [Remote], _workspaces_dec = [Remote], _projectStructures_dec = [Remote], _gitInspect_dec = [Remote], _gitDiff_dec = [Remote], _gitAction_dec = [Remote], _sessionChanges_dec = [Remote], _sessionChangeDiff_dec = [Remote], _sessionTerminals_dec = [Remote], _openSessionTerminal_dec = [Remote], _readTerminalScreen_dec = [Remote], _workspaceFiles_dec = [Remote], _readWorkspaceFile_dec = [Remote], _canvasPresence_dec = [Remote], _stopNode_dec = [Remote], _follow_dec = [Remote({ mode: "stream" })], _a)]() {
    this.domain = await this.ctx.storageDomain.open(flowspaceDomain);
    this.arena = new ArenaStore(this.domain.table("arena_results"));
    this.teamAssets = new TeamAssets(this.domain, this.ctx.llm);
    this.teams = new TeamRuntime(
      this.ctx,
      this.domain,
      this.teamAssets,
      () => this.publish(),
      () => this.state?.doc.nodes ?? []
    );
    const storedDoc = sanitizeDocumentForWire(
      structuredClone(
        this.domain.table("documents").get("main") ?? emptyDocument()
      )
    );
    const storedTemplates = [...this.domain.table("templates").entries()].map(
      ([, tpl]) => structuredClone(tpl)
    );
    const storedSnapshots = [...this.domain.table("snapshots").entries()].map(([, snap]) => structuredClone(snap)).sort((a, b) => b.createdAt - a.createdAt);
    if (storedTemplates.length) {
      storedDoc.templates = storedTemplates;
    } else if (storedDoc.templates?.length) {
      for (const tpl of storedDoc.templates) {
        await this.domain.table("templates").put(tpl.id, structuredClone(tpl));
      }
    }
    if (storedSnapshots.length) {
      storedDoc.snapshots = storedSnapshots;
    } else if (storedDoc.snapshots?.length) {
      for (const snap of storedDoc.snapshots) {
        await this.domain.table("snapshots").put(snap.id, structuredClone(snap));
      }
    }
    checkDocument(storedDoc);
    validateTriggers(storedDoc);
    syncUntitledAgentTitles(storedDoc);
    this.state.doc = sanitizeDocumentForWire(storedDoc);
    for (const n of this.state.doc.nodes) {
      if (n.worktreePath) this.state.knownWorktrees.add(resolve3(n.worktreePath));
    }
    this.state.runs = [...this.domain.table("runs").entries()].map(([, r]) => structuredClone(r)).sort((a, b) => a.createdAt - b.createdAt);
    this.runtime = new DshRuntime(
      this.ctx,
      (id) => this.state.doc.nodes.find((n) => n.id === id),
      this.teams,
      this.nodeExecutors,
      this.domain.table("content_spills"),
      () => this.state.doc.settings.listLimit,
      async (path, cwd) => {
        const { full } = await this.workspaceFile({ path, cwd });
        const body = await readFile2(full);
        if (body.includes(0)) throw new Error(`\u4E8C\u8FDB\u5236\u6587\u4EF6\u4E0D\u80FD\u4F5C\u4E3A\u6587\u672C\u8F93\u5165\uFF1A${path}`);
        return new TextDecoder().decode(body);
      }
    );
    const executors = judgeExecutors(this.ctx, this.runtime.contextText.bind(this.runtime));
    for (const descriptor of judges) this.registerNodeKind(descriptor, executors[descriptor.flowType]);
    const stepLimit = (step) => this.state.runs.find((run) => run.steps.some((current) => current.id === step.id))?.listLimit ?? this.state.doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
    this.registerNodeKind(mergeSort, mergeExecutor(this.ctx, stepLimit));
    const transform = dataExecutor(this.ctx, stepLimit);
    for (const descriptor of dataDescriptors) this.registerNodeKind(descriptor, transform);
    this.variables = new VariableStore(this.domain.table("variables"), () => this.state.doc, () => this.state.runs, () => this.publish(), (value) => {
      const write = value.history.at(-1);
      if (!write) return;
      void this.scheduler.variableChanged(
        value.id,
        JSON.stringify({ name: value.name, version: value.version, value: value.value }),
        write.runId,
        write.stepId
      ).catch((error) => this.ctx.logger.warn("FlowSpace \u53D8\u91CF\u4E8B\u4EF6\uFF1A%s", error));
    });
    this.operations = new OperationService(
      this.ctx,
      this.git,
      () => this.state.doc,
      () => this.state.runs,
      (cwd) => this.resolveWorkspaceRoot(cwd),
      (id) => [...this.state.live.values()].find((live) => live.sessionId === id)?.effectiveCwd ?? this.state.doc.nodes.find((node2) => node2.sessionId === id)?.worktreePath ?? this.state.doc.nodes.find((node2) => node2.sessionId === id)?.cwd
    );
    this.registerNodeKind(gitExec, this.operations.execute);
    this.registerNodeKind(terminalExec, this.operations.execute);
    const draw = randomExecutor(this.domain.table("play_counters"));
    this.registerNodeKind(randomNode, (node2, step, signal, options) => this.scheduler.transact(() => draw(node2, step, signal, options)));
    for (const descriptor of humanNodes) this.registerNodeKind(descriptor, humanExecutor(this.ctx));
    this.registerNodeKind(noticeNode, noticeExecutor((notice) => {
      if (this.state.notices.some((entry) => entry.id === notice.id)) return;
      this.state.notices = [...this.state.notices.slice(-39), notice];
      this.publish();
    }));
    this.registerNodeKind(assignmentNode, (node2, step, signal, options) => this.scheduler.transact(() => this.variables.assign(node2, step, signal, options)));
    this.scheduler = new Scheduler(
      this.runtime,
      {
        document: () => this.state.doc,
        changed: () => this.persist(),
        deliver: async (run, edge2, token) => {
          const source = await this.runtime.hydrateContent(token.source);
          const variable = this.state.doc.nodes.find((node2) => node2.id === edge2.target && node2.flowType === variableNode.flowType);
          if (variable) await this.variables.deliver(variable, run, run.steps.find((step) => step.id === token.stepId), edge2.id, source);
          else await this.containers.deliver(run, edge2, token, source);
        },
        variableReference: (run, step, node2) => this.variables.reference(node2, run, step),
        prepareStep: async (run, step, node2) => {
          const { resolvedTask, config, variables } = this.variables.prepare(node2, step.task, run, step);
          step.task = node2.lanePersona ? `${node2.lanePersona}

${resolvedTask}` : resolvedTask;
          if (node2.teamModel?.provider === "@available") node2.teamModel = await this.availableModel(node2.teamModel.model);
          if (variables.length) {
            step.variables = variables;
            step.resolvedConfig = config;
          }
          if (config?.provider === "@available") {
            const model = await this.availableModel(String(config.model ?? "0"));
            step.resolvedConfig = { ...config, ...model };
          }
        },
        toolsFor: (run, step) => this.operations.prefetch(run, step).length ? ["provide_flow_parameters"] : [],
        recordAccumulator: async (run, step, node2, source) => {
          await this.variables.recordAccumulator(run, step, node2, await this.runtime.hydrateContent(source));
        },
        bound: async (nodeId, sessionId, fork) => {
          const node2 = this.state.doc.nodes.find((n) => n.id === nodeId);
          if (!node2) return;
          node2.sessionId = sessionId;
          syncUntitledAgentNode(node2);
          if (node2.continuationPrompt === void 0 && node2.task.trim()) {
            node2.continuationPrompt = node2.task;
          }
          if (fork) {
            const source = this.state.doc.nodes.find(
              (n) => n.id === fork.sourceNodeId
            );
            node2.workspaceId = source?.workspaceId;
            node2.cwd = source?.cwd;
            node2.branch = source?.branch;
            node2.worktreePath = source?.worktreePath;
            for (const edge2 of this.state.doc.edges.filter(
              (e) => e.target === nodeId && e.mode === "fork"
            )) {
              edge2.originMode = "fork";
              edge2.mode = "conclusion";
            }
          }
        },
        submitted: async (id, task, isContinuation) => {
          const n = this.state.doc.nodes.find((n2) => n2.id === id);
          if (n) {
            syncUntitledAgentNode(n);
            n.lastSubmittedTask = isContinuation ? task : n.task || task;
            if (!isContinuation && n.draft === task) n.draft = "";
          }
        }
      },
      this.state.runs
    );
    this.containers = new ContainerStore(
      this.ctx,
      this.domain.table("container_changes"),
      () => this.state.doc,
      () => this.persist(),
      () => this.publish(),
      (request) => this.workspacePath(request)
    );
    await this.containers.recover();
    this.triggers = new TriggerService(
      this.ctx,
      this.domain.table("triggers"),
      this.scheduler,
      this.git,
      () => this.state.doc,
      () => this.state.runs,
      () => this.publish(),
      (request) => this.workspacePath(request),
      () => [
        ...this.containers.changes().map((change) => ({
          key: change.id,
          at: change.at,
          nodeId: change.nodeId,
          columnId: change.after?.kind === "board" ? change.after.columnId : void 0
        })),
        ...this.variables.list().flatMap((variable) => variable.history.map((write) => ({
          key: write.id,
          at: write.at,
          nodeId: variable.id,
          columnId: void 0
        })))
      ].sort((a, b) => a.at - b.at)
    );
    this.ctx.effect(() => this.triggers.start());
    registerFlowEmit(this.ctx, this.scheduler);
    registerContainerTools(this.ctx, this.containers, this.scheduler);
    this.variables.registerTools(this.ctx, this.scheduler);
    this.operations.registerTools(this.scheduler);
    this.ctx.effect(() => () => this.canvasToolRestrictions.forEach((dispose) => dispose()));
    this.ctx.on("llm/stream", (options, next) => {
      const source = next();
      const id = options.sessionId;
      if (!id || !this.scheduler.observesOutput(id)) return source;
      const scheduler = this.scheduler;
      const logger = this.ctx.logger;
      return (async function* () {
        let buffered = "", sentAt = 0;
        const emit = () => {
          if (!buffered) return;
          const delta = buffered;
          buffered = "";
          sentAt = Date.now();
          void scheduler.nativeStatus(id, "output", delta).catch((error) => logger.warn("FlowSpace \u8F93\u51FA\u4E8B\u4EF6\uFF1A%s", error));
        };
        for await (const chunk of source) {
          if (chunk.type === "text-delta") {
            buffered += chunk.text;
            if (Date.now() - sentAt >= 200) emit();
          } else if (chunk.type === "finish") emit();
          yield chunk;
        }
      })();
    });
    await this.scheduler.recover().catch(
      (e) => this.ctx.logger.warn("FlowSpace run recovery warning: %s", e)
    );
    this.dataFileWatch = new DataFileWatch(this.ctx.fs, async (path, cwd, signal) => {
      const { base, full } = this.workspacePath({ path, cwd });
      const physical = await realpath(full).catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return realpath(dirname2(full));
      });
      if (!isSubPath(await realpath(base), physical)) throw new Error("\u6587\u4EF6\u8DEF\u5F84\u8D85\u51FA\u5F53\u524D\u5DE5\u4F5C\u533A");
      return this.ctx.fs.resolve(full, { signal });
    }, (ids) => {
      void this.refreshDataFiles(ids).catch((error) => this.ctx.logger.warn("FlowSpace \u6587\u4EF6\u9884\u89C8\u66F4\u65B0\u5931\u8D25: %s", error));
    });
    this.ctx.effect(() => () => this.dataFileWatch.dispose());
    await this.dataFileWatch.sync(this.state.doc);
    const fileIds = this.state.doc.nodes.filter((node2) => node2.kind === "file").map((node2) => node2.id);
    if (fileIds.length) await this.refreshDataFiles(fileIds);
    await this.hydrateBoundSessions().catch(
      (e) => this.ctx.logger.warn("FlowSpace session hydration: %s", e)
    );
    await this.teams.hydrate();
    this.syncTeams();
    const report = (promise) => {
      void promise.catch((e) => this.ctx.logger.error("FlowSpace: %s", e));
    };
    this.ctx.on("agent/inbox/inserted", ({ agent, message }) => {
      if (message.source.kind !== "user") return;
      const id = "rpcId" in message.source ? message.source.rpcId : message.id;
      const owned = this.state.runs.some(
        (r) => r.steps.some((s) => s.requestId === id)
      );
      const preparation = owned ? Promise.resolve([]) : this.prepareReferences(agent.id);
      void preparation.catch(
        (e) => this.ctx.logger.warn("FlowSpace reference preparation: %s", e)
      );
      this.inputContexts.set(message.id, preparation);
      report(
        this.scheduler.native(
          agent.id,
          id,
          plainText(message.content),
          this.state.canvasSessions.has(agent.id)
        )
      );
    });
    this.ctx.on(
      "agent/pre-step",
      async (payload, next) => {
        const decision = await next();
        if (decision.kind !== "enter") return decision;
        const node2 = this.state.doc.nodes.find((node3) => node3.sessionId === payload.agent.id);
        if (node2?.canvasToolsOnly && !this.canvasToolRestrictions.has(payload.agent.id)) {
          const deny = this.ctx.tools.definitions().map((tool) => tool.name).filter((name) => /^(bash|pwsh|terminal_)/.test(name));
          if (deny.length) this.canvasToolRestrictions.set(payload.agent.id, payload.agent.ctx.tools.restrict({ deny }));
        }
        const messages = await Promise.all(
          decision.messages.map(async (message) => {
            const id = message.source.kind === "user" && "rpcId" in message.source ? message.source.rpcId : message.id;
            const run = this.state.runs.find((run2) => run2.steps.some((step2) => step2.requestId === id));
            const step = run?.steps.find((step2) => step2.requestId === id);
            const requests = run && step ? this.operations.prefetch(run, step) : [];
            if (requests.length) {
              const text2 = "\u56DE\u5408\u7ED3\u675F\u540E FlowSpace \u5C06\u6267\u884C\u4EE5\u4E0B\u64CD\u4F5C\u3002\u8BF7\u7528 provide_flow_parameters \u63D0\u4EA4\u6240\u9700\u53C2\u6570\uFF0C\u64CD\u4F5C\u7531 Host \u6267\u884C\u3002\n" + JSON.stringify(requests);
              message = { ...message, content: [...message.content, { type: "text", text: text2 }] };
            }
            const preparation = this.inputContexts.get(message.id);
            this.inputContexts.delete(message.id);
            if (step && step.sources.length > 0 && !this.state.injectedSteps.has(step.id)) {
              this.state.injectedSteps.add(step.id);
              const text2 = await this.runtime.contextText(
                step.sources,
                payload.agent.id
              );
              return text2 ? {
                ...message,
                content: [
                  ...message.content,
                  { type: "text", text: text2 }
                ]
              } : message;
            }
            if (!preparation) return message;
            const entries = await preparation;
            if (!entries.length) return message;
            const sources = entries.map((e) => e.snapshot);
            for (const item of entries) {
              const liveEdge = this.state.doc.edges.find(
                (e) => e.id === item.edgeId
              );
              if (liveEdge) {
                liveEdge.sentVersion = item.version;
                liveEdge.currentVersion = item.version;
              }
            }
            const text = await this.runtime.contextText(
              sources,
              payload.agent.id
            );
            if (step) {
              step.sources.push(...sources);
            }
            await this.persist();
            return text ? {
              ...message,
              content: [
                ...message.content,
                { type: "text", text }
              ]
            } : message;
          })
        );
        const sessionId = payload.agent.id;
        if (this.teams.isLead(sessionId) && messages.length) {
          const brief = await this.teams.brief(sessionId);
          if (brief && this.teamBriefs.get(sessionId) !== brief) {
            this.teamBriefs.set(sessionId, brief);
            messages.push(teamBriefMessage(brief));
          }
        }
        return { ...decision, messages };
      },
      { prepend: true }
    );
    this.ctx.on("agent/inbox/claimed", ({ agent, message, turn }) => {
      this.teams.claim(agent, turn, message.source.kind === "user");
      if (message.source.kind === "user")
        report(
          this.scheduler.claim(
            "rpcId" in message.source ? message.source.rpcId : message.id,
            turn,
            this.teams.reference(agent.id)
          )
        );
    });
    this.ctx.on("agent/inbox/discarded", ({ message }) => {
      this.inputContexts.delete(message.id);
    });
    this.ctx.on("agent/status", ({ agent, status }) => {
      const n = this.state.doc.nodes.find((n2) => n2.sessionId === agent.id);
      if (n) {
        const old = this.state.live.get(n.id);
        this.state.live.set(n.id, {
          nodeId: n.id,
          sessionId: agent.id,
          running: status === "running",
          output: old?.output ?? "",
          seq: old?.seq ?? -1,
          pendingInput: [],
          updatedAt: Date.now(),
          effectiveCwd: old?.effectiveCwd,
          changesTurns: old?.changesTurns
        });
        this.publish();
      }
      const sub = this.state.subagents.get(agent.id);
      if (sub) {
        this.state.subagents.set(agent.id, {
          ...sub,
          running: status === "running",
          updatedAt: Date.now()
        });
        this.publish();
      }
    });
    const rawCtx = this.ctx;
    rawCtx.on("subagent/start", (rawInfo) => {
      const info = rawInfo;
      if (!info?.id || !info?.parentSessionId) return;
      this.upsertSubagentBrief(info.id, info.parentSessionId, true);
    });
    rawCtx.on("subagent/end", (rawInfo) => {
      const info = rawInfo;
      if (!info?.id) return;
      const existing = this.state.subagents.get(info.id);
      const parentId = info.parentSessionId ?? existing?.parentSessionId;
      if (parentId) {
        this.upsertSubagentBrief(info.id, parentId, false);
      }
    });
    rawCtx.on("api-session/added", (rawSummary) => {
      const summary = rawSummary;
      if (summary?.origin === "subagent" && summary.sessionId && summary.parentSessionId) {
        this.upsertSubagentBrief(
          summary.sessionId,
          summary.parentSessionId,
          Boolean(summary.running)
        );
      }
    });
    this.ctx.on("session/event", (session, event) => {
      this.event(session.id, event, report, session.header);
    });
    this.ctx.effect(() => async () => {
      clearTimeout(this.deferredPersistTimer);
      await this.scheduler.dispose();
      this.state.listeners.forEach((fn) => fn());
      await this.domain.close();
    });
  }
  upsertSubagentBrief(childSessionId, parentSessionId, running) {
    const existing = this.state.subagents.get(childSessionId);
    this.state.subagents.set(childSessionId, {
      sessionId: childSessionId,
      parentSessionId,
      title: existing?.title ?? childSessionId.slice(0, 8),
      running,
      updatedAt: Date.now()
    });
    this.publish();
    void this.ctx.sessionQuery.readTitleSnapshots([childSessionId]).then((titles) => {
      const resolvedTitle = titles[0]?.status === "fulfilled" ? titles[0].value.title?.title : void 0;
      if (resolvedTitle) {
        const cur = this.state.subagents.get(childSessionId);
        if (cur && cur.title !== resolvedTitle) {
          this.state.subagents.set(childSessionId, {
            ...cur,
            title: resolvedTitle
          });
          this.publish();
        }
      }
    }).catch(() => {
    });
  }
  schedulePersist() {
    clearTimeout(this.deferredPersistTimer);
    this.deferredPersistTimer = setTimeout(() => {
      void this.persist().catch(
        (e) => this.ctx.logger.warn("FlowSpace deferred persist: %s", e)
      );
    }, 350);
  }
  async hydrateBoundSessions() {
    const listed = await this.ctx.sessionController.list(
      {},
      new AbortController().signal
    );
    const subRows = listed.items.filter((s) => s.origin === "subagent");
    if (subRows.length) {
      const titles = await this.ctx.sessionQuery.readTitleSnapshots(
        subRows.map((s) => s.sessionId)
      );
      subRows.forEach((row, idx) => {
        const parentId = row.parentSessionId;
        if (parentId) {
          this.state.subagents.set(row.sessionId, {
            sessionId: row.sessionId,
            parentSessionId: parentId,
            title: titles[idx]?.status === "fulfilled" ? titles[idx].value.title?.title ?? row.sessionId : row.sessionId,
            running: row.running
          });
        }
      });
    }
    for (const sub of subRows) {
      try {
        var _stack = [];
        try {
          const subObs = __using(_stack, await this.ctx.sessionQuery.observeSession(
            sub.sessionId,
            { projectionMode: "none" }
          ));
          for (const ev of subObs.events) {
            this.recordNativeMessage(sub.sessionId, ev);
          }
        } catch (_) {
          var _error = _, _hasError = true;
        } finally {
          __callDispose(_stack, _error, _hasError);
        }
      } catch {
      }
    }
    for (const node2 of this.state.doc.nodes) {
      if (node2.kind !== "agent" || !node2.sessionId) continue;
      try {
        var _stack2 = [];
        try {
          const obs = __using(_stack2, await this.ctx.sessionQuery.observeSession(
            node2.sessionId,
            { projectionMode: "none" }
          ));
          const lastAssistant = obs.events.findLast(
            (e) => e.type === "assistant/message" && !e.data.interrupted && plainText(e.data.message.content).trim().length > 0
          ) ?? obs.events.findLast(
            (e) => e.type === "assistant/message" && !e.data.interrupted
          );
          const lastWorkdir = obs.events.findLast(
            (e) => e.type === "working-directory/change"
          );
          const lastTime = obs.events.at(-1)?.time;
          for (const ev of obs.events) {
            this.recordNativeMessage(node2.sessionId, ev);
          }
          const turns = this.collectSessionChangesFromEvents(
            node2.sessionId,
            obs.events
          );
          const effectiveCwd = lastWorkdir?.data?.cwd ?? node2.worktreePath ?? node2.cwd;
          if (effectiveCwd) {
            this.state.knownWorktrees.add(resolve3(effectiveCwd));
          }
          this.state.live.set(node2.id, {
            nodeId: node2.id,
            sessionId: node2.sessionId,
            running: this.runtime.running().includes(node2.sessionId),
            output: lastAssistant?.type === "assistant/message" ? plainText(lastAssistant.data.message.content) : "",
            seq: lastAssistant?.seq ?? obs.cursor,
            pendingInput: [],
            updatedAt: lastTime,
            effectiveCwd,
            changesTurns: turns
          });
        } catch (_2) {
          var _error2 = _2, _hasError2 = true;
        } finally {
          __callDispose(_stack2, _error2, _hasError2);
        }
      } catch {
      }
    }
  }
  recordNativeMessage(sessionId, event) {
    if (event.type !== "user/message") return false;
    const src = event.data.source;
    const senderSessionId = src.senderSessionId ?? src.senderId;
    if ((src.kind === "agent-message" || src.kind === "subagent-settled" || src.kind === "team-message") && typeof senderSessionId === "string" && senderSessionId.length > 0) {
      const msgId = `${sessionId}:${event.seq}`;
      if (this.state.nativeMessages.has(msgId)) return false;
      const bodyText = plainText(event.data.content).trim() || src.summary || (src.senderName ? `From ${src.senderName}` : "");
      this.state.nativeMessages.set(msgId, {
        id: msgId,
        fromSessionId: senderSessionId,
        toSessionId: sessionId,
        kind: src.kind,
        text: bodyText,
        summary: src.summary ?? src.senderName,
        seq: event.seq,
        time: event.time
      });
      if (src.kind === "subagent-settled") {
        const existingSub = this.state.subagents.get(senderSessionId);
        this.state.subagents.set(senderSessionId, {
          sessionId: senderSessionId,
          parentSessionId: existingSub?.parentSessionId ?? sessionId,
          title: existingSub?.title ?? senderSessionId.slice(0, 8),
          running: false,
          updatedAt: event.time
        });
      }
      return true;
    }
    return false;
  }
  collectSessionChangesFromEvents(sessionId, events) {
    const wc = this.ctx.get("workspaceChanges");
    if (!wc) return [];
    const byTurn = /* @__PURE__ */ new Map();
    for (const ev of events) {
      if (ev.type !== "workspace/changes") continue;
      const sum = wc.summary(sessionId, ev.seq);
      if (!sum) continue;
      byTurn.set(sum.turn, {
        sessionId,
        turn: sum.turn,
        seq: ev.seq,
        cwd: sum.cwd,
        total: sum.total,
        added: sum.added,
        deleted: sum.deleted,
        files: sum.files.map((f) => ({
          path: f.path,
          display: f.display,
          added: f.added,
          deleted: f.deleted,
          binary: f.binary,
          oversized: f.oversized
        }))
      });
    }
    return [...byTurn.values()].sort((a, b) => b.turn - a.turn);
  }
  event(sessionId, event, report, header) {
    if (this.recordNativeMessage(sessionId, event)) {
      this.publish();
    }
    if (header?.origin === "subagent") {
      const prev = this.state.subagents.get(sessionId);
      if (prev) {
        this.state.subagents.set(sessionId, {
          ...prev,
          updatedAt: event.time
        });
      } else if (header.parentSession) {
        this.upsertSubagentBrief(sessionId, header.parentSession, true);
      }
    }
    const node2 = this.state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node2) return;
    const evAny = event;
    if (evAny.type === "tool/call" && evAny.data) {
      const name = String(evAny.data.name ?? "");
      report(this.scheduler.nativeStatus(sessionId, "tool", name, event.seq));
      if (/^(bash|pwsh|terminal_(?:exec|send))$/.test(name)) {
        const raw = evAny.data.args ?? evAny.data.arguments;
        let args = raw;
        if (typeof raw === "string") {
          try {
            args = JSON.parse(raw);
          } catch {
            args = void 0;
          }
        }
        if (args && typeof args === "object") {
          const command = ["command", "text", "code"].flatMap((key) => typeof args[key] === "string" ? [String(args[key])] : [])[0];
          if (command) {
            const kind = /^\s*git(?:\.exe)?\s/i.test(command) ? "git" : "terminal";
            const cwd = this.state.live.get(node2.id)?.effectiveCwd ?? node2.worktreePath ?? node2.cwd;
            const key = `${node2.id}:${kind}`;
            const old = this.state.nativeOperations.get(key);
            if (!old || old.seq < event.seq) {
              this.state.nativeOperations.set(key, {
                nodeId: node2.id,
                kind,
                command: command.slice(0, 256),
                cwd,
                at: event.time,
                seq: event.seq
              });
              this.publish();
            }
          }
        }
      }
    }
    if (evAny.type === "working-directory/change" && evAny.data?.cwd) {
      const nextCwd = String(evAny.data.cwd);
      this.state.knownWorktrees.add(resolve3(nextCwd));
      const old = this.state.live.get(node2.id);
      this.state.live.set(node2.id, {
        nodeId: node2.id,
        sessionId,
        running: old?.running ?? false,
        output: old?.output ?? "",
        seq: event.seq,
        pendingInput: old?.pendingInput ?? [],
        updatedAt: event.time,
        effectiveCwd: nextCwd,
        changesTurns: old?.changesTurns
      });
      this.publish();
    }
    if (evAny.type === "step/start" && evAny.data) {
      const turn = Number(evAny.data.turn ?? 0);
      if (this.scheduler.recordTelemetry(sessionId, turn, { addStep: true })) {
        this.publish();
      }
    }
    if (evAny.type === "deliverables/presented" && evAny.data) {
      const turn = Number(evAny.data.turn ?? 0);
      const files = Array.isArray(evAny.data.files) ? evAny.data.files : [];
      if (files.length) {
        report(
          this.scheduler.deliverable(
            sessionId,
            turn,
            event.seq,
            event.time,
            files
          )
        );
      }
    }
    if (evAny.type === "workspace/changes") {
      const wc = this.ctx.get("workspaceChanges");
      const sum = wc?.summary(sessionId, event.seq);
      if (sum) {
        const turnEntry = {
          sessionId,
          turn: sum.turn,
          seq: event.seq,
          cwd: sum.cwd,
          total: sum.total,
          added: sum.added,
          deleted: sum.deleted,
          files: sum.files.map((f) => ({
            path: f.path,
            display: f.display,
            added: f.added,
            deleted: f.deleted,
            binary: f.binary,
            oversized: f.oversized
          }))
        };
        const old = this.state.live.get(node2.id);
        const existing = (old?.changesTurns ?? []).filter(
          (c) => c.turn !== sum.turn
        );
        this.state.live.set(node2.id, {
          nodeId: node2.id,
          sessionId,
          running: old?.running ?? false,
          output: old?.output ?? "",
          seq: event.seq,
          pendingInput: old?.pendingInput ?? [],
          updatedAt: event.time,
          effectiveCwd: old?.effectiveCwd,
          changesTurns: [turnEntry, ...existing]
        });
        let docMutated = false;
        for (const chNode of this.state.doc.nodes) {
          if (chNode.kind === "changes" && !chNode.fixed && chNode.changesSessionId === sessionId) {
            chNode.changesSeq = event.seq;
            chNode.changesTurn = sum.turn;
            chNode.text = `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})
` + sum.files.map((f) => `- ${f.display} (+${f.added} / -${f.deleted})`).join("\n");
            docMutated = true;
          }
        }
        this.publish();
        if (docMutated) this.schedulePersist();
      }
    }
    if (event.type === "assistant/message") {
      const text = plainText(event.data.message.content);
      const usage = event.data.usage;
      if (usage) {
        this.scheduler.recordTelemetry(sessionId, event.data.turn, {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens
        });
        report(this.scheduler.nativeStatus(sessionId, "usage", JSON.stringify(usage), event.seq));
      }
      if (!event.data.interrupted && text.trim().length > 0) {
        this.state.turnOutput.set(sessionId, text);
      } else if (!this.state.turnOutput.has(sessionId) && text.length > 0) {
        this.state.turnOutput.set(sessionId, text);
      }
      const effectiveOutput = text.trim().length > 0 ? text : this.state.turnOutput.get(sessionId) ?? text;
      const old = this.state.live.get(node2.id);
      this.state.live.set(node2.id, {
        nodeId: node2.id,
        sessionId,
        running: old?.running ?? true,
        output: effectiveOutput,
        seq: event.seq,
        pendingInput: [],
        updatedAt: event.time,
        effectiveCwd: old?.effectiveCwd,
        changesTurns: old?.changesTurns
      });
      let displayMutated = false;
      if (!event.data.interrupted && effectiveOutput.trim().length > 0) {
        for (const display of this.state.doc.nodes.filter(
          (n) => (n.kind === "display" && !n.fixed || n.kind === "detail" && !n.pinned) && n.sourceNodeId === node2.id
        )) {
          display.text = effectiveOutput;
          display.sourceSeq = event.seq;
          displayMutated = true;
        }
      }
      this.publish();
      if (displayMutated) this.schedulePersist();
    }
    if (event.type === "turn/start") this.state.turnOutput.delete(sessionId);
    if (event.type === "turn/end")
      report(
        this.scheduler.finish(
          sessionId,
          event.data.turn,
          event.data.reason.kind,
          event.seq,
          this.state.turnOutput.get(sessionId) ?? "",
          event.data.reason.kind === "error" ? event.data.reason.error.message : void 0,
          this.teams.isFollowup(sessionId, event.data.turn)
        )
      );
  }
  publish() {
    this.state.listeners.forEach((fn) => fn());
  }
  computeSourceVersions() {
    const out = {};
    for (const n of this.state.doc.nodes) {
      if (n.flowType === variableNode.flowType) {
        out[n.id] = `${n.id}:${this.variables.read(n, {}).version}`;
        continue;
      }
      if (n.flowType === "flowspace/constant") {
        out[n.id] = `${n.id}:${shortHash2(JSON.stringify(n.config))}`;
        continue;
      }
      if (n.kind === "agent") {
        const live = this.state.live.get(n.id);
        if (n.sessionId && live && live.seq >= 0) {
          out[n.id] = `${n.sessionId}:${live.seq}`;
        }
        continue;
      }
      if (n.kind === "file") {
        const baseCwd = this.resolveWorkspaceRoot(n.worktreePath ?? n.cwd);
        out[n.id] = `${n.id}:${computeFileNodeFingerprint(n, baseCwd)}`;
        continue;
      }
      if (n.kind === "board") {
        out[n.id] = `${n.id}:${shortHash2(resolveBoardReference(n).text)}`;
        continue;
      }
      if (n.kind === "note" || n.kind === "display" || n.kind === "git" || n.kind === "changes" || n.kind === "terminal") {
        out[n.id] = `${n.id}:${shortHash2(n.text)}`;
      }
    }
    return out;
  }
  referenceVersion(edge2, source, sourceVersions) {
    if (edge2.snapshotContent) return `${edge2.source}:${shortHash2(JSON.stringify(edge2.snapshotContent))}`;
    if (source?.kind === "board" && (edge2.sourceItemKey !== void 0 || !edge2.snapshotText)) {
      if (edge2.sourceItemKey === void 0 && sourceVersions[source.id]) return sourceVersions[source.id];
      return `${source.id}:${shortHash2(resolveBoardReference(source, edge2.sourceItemKey).text)}`;
    }
    return edge2.snapshotText ? `${edge2.source}:${shortHash2(edge2.snapshotText)}` : sourceVersions[edge2.source] ?? edge2.currentVersion;
  }
  syncLiveReferenceVersions(doc, sourceVersions = this.computeSourceVersions()) {
    const nodes = new Map(doc.nodes.map((node2) => [node2.id, node2]));
    for (const edge2 of doc.edges) {
      if (edge2.kind === "reference") {
        edge2.currentVersion = this.referenceVersion(edge2, nodes.get(edge2.source), sourceVersions);
      }
    }
    return sourceVersions;
  }
  async prepareReferences(sessionId) {
    const node2 = this.state.doc.nodes.find((n) => n.sessionId === sessionId);
    if (!node2) return [];
    const entries = [];
    for (const edge2 of this.state.doc.edges.filter(
      (e) => e.target === node2.id && (e.kind === "reference" || e.trigger === "off")
    )) {
      const source = this.state.doc.nodes.find((n) => n.id === edge2.source);
      if (!source) continue;
      const captured = source.flowType === variableNode.flowType ? this.variables.reference(source) : source.kind === "agent" ? await this.runtime.capture(source, edge2.mode) : await this.runtime.reference(source, edge2);
      if (captured.referenceKind === "board-card" && captured.missing) continue;
      const version = `${captured.sourceSessionId ?? captured.sourceNodeId}:${captured.version ?? captured.seq ?? captured.text}`;
      edge2.currentVersion = version;
      if (edge2.kind === "reference" && !edge2.always && edge2.sentVersion === version)
        continue;
      entries.push({ snapshot: captured, edgeId: edge2.id, version });
    }
    if (new Set(
      entries.filter((e) => e.snapshot.kind === "session").map((e) => e.snapshot.sourceSessionId)
    ).size > 3)
      throw new Error("\u4E00\u6B21\u4F1A\u8BDD\u5F15\u7528\u6700\u591A\u5305\u542B\u4E09\u4E2A\u6765\u6E90");
    return entries;
  }
  async persist() {
    clearTimeout(this.deferredPersistTimer);
    this.syncLiveReferenceVersions(this.state.doc);
    const cleanDoc = sanitizeDocumentForWire(this.state.doc);
    this.state.doc = cleanDoc;
    await this.domain.table("documents").put("main", structuredClone(cleanDoc));
    const retainedTemplates = new Set(
      (cleanDoc.templates ?? []).map((t2) => t2.id)
    );
    for (const id of this.domain.table("templates").keys())
      if (!retainedTemplates.has(id))
        await this.domain.table("templates").delete(id);
    for (const tpl of cleanDoc.templates ?? [])
      await this.domain.table("templates").put(tpl.id, structuredClone(tpl));
    const retainedSnapshots = new Set(
      (cleanDoc.snapshots ?? []).map((s) => s.id)
    );
    for (const id of this.domain.table("snapshots").keys())
      if (!retainedSnapshots.has(id))
        await this.domain.table("snapshots").delete(id);
    for (const snap of cleanDoc.snapshots ?? [])
      await this.domain.table("snapshots").put(snap.id, structuredClone(snap));
    const retainedRuns = new Set(this.state.runs.map((r) => r.id));
    for (const id of this.domain.table("runs").keys())
      if (!retainedRuns.has(id)) await this.domain.table("runs").delete(id);
    for (const run of this.state.runs) {
      await this.domain.table("runs").put(run.id, structuredClone(run));
      await this.arena.settle(run);
    }
    this.publish();
  }
  snapshot() {
    const sourceVersions = this.computeSourceVersions();
    const docCopy = sanitizeDocumentForWire(this.state.doc);
    this.syncLiveReferenceVersions(docCopy, sourceVersions);
    return {
      document: docCopy,
      runs: structuredClone(this.state.runs),
      live: [...this.state.live.values()],
      nativeMessages: [...this.state.nativeMessages.values()].sort(
        (a, b) => a.time - b.time || a.seq - b.seq
      ),
      nativeOperations: [...this.state.nativeOperations.values()],
      subagents: [...this.state.subagents.values()],
      sourceVersions,
      roles: this.teamAssets.listRoles(),
      teamBlueprints: this.teamAssets.listTeams(),
      teams: this.teams.snapshot(),
      containerChanges: this.containers.changes(),
      variables: this.variables.list(),
      triggers: this.triggers.list(),
      notices: this.state.notices,
      arena: this.arena.list()
    };
  }
  listRoles() {
    return this.teamAssets.listRoles();
  }
  async saveRole(request) {
    return this.scheduler.transact(async () => {
      const role = await this.teamAssets.saveRole(request);
      this.publish();
      return role;
    });
  }
  async archiveRole(request) {
    return this.scheduler.transact(async () => {
      const role = await this.teamAssets.archiveRole(request);
      this.publish();
      return role;
    });
  }
  listTeams() {
    return this.teamAssets.listTeams();
  }
  async saveTeam(request) {
    return this.scheduler.transact(async () => {
      const team = await this.teamAssets.saveTeam(request);
      this.publish();
      return team;
    });
  }
  async archiveTeam(request) {
    return this.scheduler.transact(async () => {
      const team = await this.teamAssets.archiveTeam(request);
      this.publish();
      return team;
    });
  }
  async listModelRoutes() {
    return this.teamAssets.listModelRoutes();
  }
  async availableModel(index) {
    const models = await this.teamAssets.listModelRoutes();
    const fixtures = models.filter((model2) => model2.provider === "flowspace-test");
    const routes = fixtures.length ? fixtures : models;
    if (!routes.length) throw new Error("\u8BF7\u5148\u914D\u7F6E\u53EF\u7528\u7684\u6A21\u578B");
    const { provider, model } = routes[(Number(index) || 0) % routes.length];
    return { provider, model };
  }
  async save(document) {
    return this.scheduler.transact(
      () => this.saveDocument(documentSchema.parse(sanitizeDocumentForWire(document)))
    );
  }
  async saveDocument(next, portable = false, importedAssets) {
    const previous = this.state.doc;
    if (!portable && next.id === previous.id)
      next = rebaseContainerChanges(next, this.containers.changes());
    next.containerRevision = previous.containerRevision;
    if (!portable) next = mergePendingGeneration(next, previous);
    next.generationRevision = previous.generationRevision;
    const previousNodes = new Map(this.state.doc.nodes.map((node2) => [node2.id, node2]));
    const previousEdges = new Map(this.state.doc.edges.map((edge2) => [edge2.id, edge2]));
    for (const node2 of next.nodes) {
      const prior = previousNodes.get(node2.id);
      const old = portable && prior?.teamRef?.teamId !== node2.teamRef?.teamId ? void 0 : prior;
      if (old?.sessionId) {
        node2.sessionId = old.sessionId;
        node2.teamRef = old.teamRef;
        if (node2.teamRef) delete node2.teamConfig;
        node2.cwd = old.cwd;
        node2.workspaceId = old.workspaceId;
        node2.branch = old.branch;
        node2.worktreePath = old.worktreePath;
      }
      if (node2.sessionId && this.teams.isLead(node2.sessionId) && !this.teams.ownsNode(node2.sessionId, node2.id))
        throw new Error("\u56E2\u961F\u4E3B\u7BA1\u4F1A\u8BDD\u5FC5\u987B\u7531\u5BF9\u5E94\u7684\u753B\u5E03\u56E2\u961F\u8282\u70B9\u521B\u5EFA");
      if (old) node2.lastSubmittedTask = old.lastSubmittedTask;
      syncUntitledAgentNode(node2);
      if (node2.worktreePath) this.state.knownWorktrees.add(resolve3(node2.worktreePath));
      if (node2.kind === "agent" && node2.sessionId && old && old.planMode !== node2.planMode) {
        void this.runtime.ensure(node2).catch(() => {
        });
      }
    }
    for (const edge2 of next.edges) {
      const old = previousEdges.get(edge2.id);
      if (old?.originMode === "fork") {
        edge2.originMode = "fork";
        edge2.mode = old.mode;
      }
      if (old && edge2.sentVersion === void 0 && old.sentVersion) {
        edge2.sentVersion = old.sentVersion;
      } else if (edge2.sentVersion === "") {
        delete edge2.sentVersion;
      }
    }
    const byId = new Map(next.nodes.map((node2) => [node2.id, node2]));
    for (const edge2 of next.edges) {
      const source = byId.get(edge2.source);
      if (source?.flowType === "flowspace/merge-sort" && edge2.kind === "continuation")
        edge2.sourcePort = mergeResultPort(source.config, edge2.sourcePort);
    }
    for (const node2 of next.nodes) {
      const merge = node2.fanout && byId.get(node2.fanout.mergeId);
      if (merge) for (const port of node2.ports ?? []) {
        if (port.direction === "out" && port.kind === "continuation" && port.nodes.includes(merge.id))
          port.portId = mergeResultPort(merge.config, port.portId);
      }
      if (node2.staffOf !== void 0 && !byId.has(node2.staffOf)) delete node2.staffOf;
    }
    checkDocument(next);
    validateTriggers(next);
    await reconcileFanoutDrafts(
      next,
      portable ? emptyDocument() : previous,
      this.state.runs,
      (fanId) => resolveStaticFanout(this.ctx, this.runtime, next, fanId)
    );
    if (importedAssets) await this.teamAssets.addImported(importedAssets);
    this.state.doc = sanitizeDocumentForWire(next);
    for (const [id, dispose] of this.canvasToolRestrictions) {
      if (next.nodes.some((node2) => node2.sessionId === id && node2.canvasToolsOnly)) continue;
      dispose();
      this.canvasToolRestrictions.delete(id);
    }
    await this.persist();
    await this.dataFileWatch.sync(next);
    await this.renameLaneSessions(previous, next);
    this.syncTeams();
    return structuredClone(this.state.doc);
  }
  async revertContainerChange(id) {
    await this.scheduler.transact(async () => {
      await this.containers.revert(id);
      this.publish();
    });
  }
  async writeVariable(request) {
    await this.scheduler.transact(() => this.variables.manualWrite(request));
  }
  async launchTrigger(request) {
    return this.triggers.launch(request.nodeId, request.values ?? {});
  }
  debugStep(request) {
    return this.scheduler.debugStep(request.runId, request.stepId, request.action, request.task);
  }
  async generateReport(request) {
    const run = this.state.runs.find((run2) => run2.id === request.runId);
    if (!run || !["completed", "cancelled", "error", "interrupted"].includes(run.state)) throw new Error("\u8FD0\u884C\u7ED3\u675F\u540E\u624D\u80FD\u751F\u6210\u6218\u62A5");
    if (run.report) return run.report;
    const existing = this.reportRequests.get(run.id);
    if (existing) return existing;
    const job = buildReport(this.ctx, structuredClone(run), request.model).then((report) => this.scheduler.transact(async () => {
      run.report = report;
      await this.persist();
      return report;
    })).finally(() => this.reportRequests.delete(run.id));
    this.reportRequests.set(run.id, job);
    return job;
  }
  refreshDataFiles(ids) {
    return this.scheduler.transact(async () => {
      const previous = this.state.doc;
      const next = structuredClone(previous);
      const changed = await reconcileFanoutDrafts(
        next,
        previous,
        this.state.runs,
        (fanId) => resolveStaticFanout(this.ctx, this.runtime, next, fanId),
        ids
      );
      if (changed) {
        stampGeneratedBatch(next, new Set(previous.nodes.map((node2) => node2.id)), new Set(previous.edges.map((edge2) => edge2.id)));
        this.state.doc = next;
        await this.persist();
        await this.renameLaneSessions(previous, next);
      } else this.publish();
    });
  }
  async renameLaneSessions(previous, next) {
    const previousNodes = new Map(previous.nodes.map((node2) => [node2.id, node2]));
    const laneGroups = (nodes) => new Map(nodes.flatMap((node2) => node2.fanout ? [[node2.fanout.fanId, node2]] : []));
    const priorGroups = laneGroups(previous.nodes), groups = laneGroups(next.nodes);
    for (const lane of next.nodes) {
      if (!lane.generatedBy || !lane.sessionId) continue;
      const prior = previousNodes.get(lane.id);
      const title = laneTitle(groups.get(lane.generatedBy), lane);
      if (!title || prior && prior.sessionId === lane.sessionId && title === laneTitle(priorGroups.get(lane.generatedBy), prior)) continue;
      await this.ctx.sessionController.rename({ sessionId: lane.sessionId, title }).catch((error) => this.ctx.logger.warn("FlowSpace \u6CF3\u9053\u4F1A\u8BDD\u91CD\u547D\u540D\u5931\u8D25: %s", error));
    }
  }
  /**
   * Upgrades agents that gained role nodes to team leads and releases canvas
   * teams that lost them. A roster that does not validate yet (a role without a
   * model) waits; running the node reports the error.
   */
  syncTeams() {
    const staffed = staffedIds(this.state.doc.nodes);
    for (const node2 of this.state.doc.nodes) {
      if (node2.kind !== "agent" || !node2.sessionId) continue;
      if (isTeamNode(node2, staffed) !== this.teams.isLead(node2.sessionId))
        void this.teams.sync(node2.id).catch(() => {
        });
    }
  }
  async importWorkflow(request) {
    return this.scheduler.transact(async () => {
      if (!!request.document === !!request.template) throw new Error("Choose one canvas or workflow template to import.");
      const template2 = request.template && workflowTemplateSchema.parse(request.template);
      const next = request.document ? documentSchema.parse(sanitizeDocumentForWire(request.document)) : structuredClone(this.state.doc);
      if (template2) {
        if (next.templates?.some((existing) => existing.id === template2.id)) template2.id = uid();
        delete template2.builtin;
        next.templates = [...next.templates ?? [], template2];
      }
      const nodes = template2?.nodes ?? workflowNodes(next);
      if (!request.enableTriggers) {
        for (const node2 of nodes)
          if (node2.flowType === triggerNode.flowType) node2.config = { ...node2.config, enabled: false };
      }
      const refs = new Set(nodes.flatMap((node2) => node2.teamRef ? [node2.teamRef.teamId] : []));
      const plan = await this.teamAssets.prepareImport(request, refs);
      if (plan.missing.length) return { kind: "missing-models", models: plan.missing };
      const staffed = staffedIds(nodes);
      for (const node2 of nodes) {
        if (node2.roleRef) node2.roleRef = plan.roleIds.get(node2.roleRef) ?? node2.roleRef;
        if (!isTeamNode(node2, staffed)) continue;
        if (node2.teamRef) node2.teamRef.teamId = plan.teamIds.get(node2.teamRef.teamId) ?? node2.teamRef.teamId;
        delete node2.sessionId;
        delete node2.lastSubmittedTask;
      }
      return { kind: "imported", document: await this.saveDocument(next, !!request.document, plan.additions) };
    });
  }
  async draft(request) {
    const node2 = this.node(request.nodeId);
    node2.draft = request.draft;
    syncUntitledAgentNode(node2);
    const cleanDoc = sanitizeDocumentForWire(this.state.doc);
    this.state.doc = cleanDoc;
    await this.domain.table("documents").put("main", structuredClone(cleanDoc));
    this.publish();
  }
  plan(request) {
    this.syncLiveReferenceVersions(this.state.doc);
    return this.scheduler.plan(request);
  }
  start(request) {
    this.syncLiveReferenceVersions(this.state.doc);
    return this.scheduler.start(request);
  }
  rerunFailed(request) {
    return this.scheduler.rerunFailed(request.runId);
  }
  extendLoop(request) {
    return this.scheduler.extendLoop(request);
  }
  command(request) {
    return this.scheduler.command(request.runId, request.action);
  }
  answerHuman(request) {
    return this.scheduler.answerHuman(request.runId, request.stepId, request.option, request.values);
  }
  remindEmission(request) {
    return this.scheduler.remindEmission(request.runId, request.stepId);
  }
  previewData(request, signal) {
    return previewDataNode(this.ctx, this.runtime, this.state.doc, this.state.runs, request, signal ?? new AbortController().signal);
  }
  release(request) {
    return this.scheduler.release(
      request.runId,
      request.tokenId,
      request.accept
    );
  }
  async restoreSnapshot(request) {
    return this.scheduler.transact(async () => {
      const snap = (this.state.doc.snapshots ?? []).find(
        (s) => s.id === request.snapshotId
      );
      if (!snap) throw new Error("\u72B6\u6001\u5FEB\u7167\u4E0D\u5B58\u5728");
      await this.scheduler.interruptAllActive(
        `\u5DF2\u6062\u590D\u5DE5\u4F5C\u72B6\u6001\u5FEB\u7167\u300C${snap.title}\u300D\uFF0C\u539F\u5728\u9014\u8C03\u5EA6\u5DF2\u5B89\u5168\u4E2D\u65AD`
      );
      const liveNodes = this.state.doc.nodes;
      const restoredNodes = structuredClone(snap.nodes).map((n) => {
        const cur = liveNodes.find((x) => x.id === n.id);
        return cur?.sessionId && cur.teamRef?.teamId === n.teamRef?.teamId ? {
          ...n,
          sessionId: cur.sessionId,
          cwd: cur.cwd,
          workspaceId: cur.workspaceId,
          branch: cur.branch,
          worktreePath: cur.worktreePath,
          lastSubmittedTask: cur.lastSubmittedTask
        } : n;
      });
      const nextDoc = sanitizeDocumentForWire({
        ...this.state.doc,
        nodes: restoredNodes,
        edges: structuredClone(snap.edges),
        viewport: structuredClone(snap.viewport)
      });
      checkDocument(nextDoc);
      this.state.doc = nextDoc;
      await this.persist();
      await this.dataFileWatch.sync(nextDoc);
      this.syncTeams();
      return structuredClone(this.state.doc);
    });
  }
  async inspectEdgePayload(request) {
    const run = request.runId ? this.state.runs.find((r) => r.id === request.runId) : [...this.state.runs].reverse().find((r) => r.tokens.some((t2) => t2.edgeId === request.edgeId));
    const edge2 = this.state.doc.edges.find((e) => e.id === request.edgeId) ?? run?.graph.edges.find((e) => e.id === request.edgeId);
    if (!edge2) throw new Error("\u8FDE\u7EBF\u4E0D\u5B58\u5728");
    const source = this.state.doc.nodes.find((n) => n.id === edge2.source) ?? run?.graph.nodes.find((n) => n.id === edge2.source);
    const target = this.state.doc.nodes.find((n) => n.id === edge2.target) ?? run?.graph.nodes.find((n) => n.id === edge2.target);
    if (!source || !target) throw new Error("\u8FDE\u7EBF\u7AEF\u70B9\u4E0D\u5B58\u5728");
    const sourceVersions = this.computeSourceVersions();
    let freshness = "live";
    if (edge2.kind === "reference") {
      if (edge2.always) {
        freshness = "always";
      } else if (!edge2.sentVersion) {
        freshness = "pending";
      } else {
        const currentVer = this.referenceVersion(edge2, source, sourceVersions);
        freshness = currentVer && currentVer !== edge2.sentVersion ? "updated" : "sent";
      }
    }
    const runToken = run?.tokens.findLast((token) => token.edgeId === edge2.id && (request.runId !== void 0 || !token.skip && token.source.content !== void 0));
    let content = "";
    let structured = runToken?.source.content ?? edge2.snapshotContent;
    let sessionId;
    let seq;
    let totalDiskBytes = 0;
    if (runToken) {
      content = runToken.source.text;
      sessionId = runToken.source.sourceSessionId;
      seq = runToken.source.seq;
    } else if (source.kind === "agent") {
      sessionId = source.sessionId;
      if (source.sessionId) {
        if (edge2.mode === "fork") {
          try {
            var _stack = [];
            try {
              const obs = __using(_stack, await this.ctx.sessionQuery.observeSession(
                source.sessionId,
                { projectionMode: "none" }
              ));
              const completedTurns = obs.events.filter(
                (e) => e.type === "turn/end" && e.data.reason.kind === "completed"
              );
              const lastEnd = completedTurns.at(-1);
              seq = lastEnd?.seq ?? obs.cursor;
              const latestSnap = await this.runtime.capture(source, "conclusion", seq).catch(() => null);
              content = `[Fork \u5B8C\u6574\u5386\u53F2\u5206\u652F \xB7 ${completedTurns.length} \u4E2A\u5DF2\u5B8C\u6210\u56DE\u5408 \xB7 \u622A\u81F3\u4E8B\u4EF6 #${seq}]

` + (latestSnap?.text || "(\u6682\u65E0\u52A9\u624B\u6587\u672C\u8F93\u51FA)");
            } catch (_) {
              var _error = _, _hasError = true;
            } finally {
              __callDispose(_stack, _error, _hasError);
            }
          } catch {
            content = "(\u4F1A\u8BDD\u5386\u53F2\u6682\u4E0D\u53EF\u8BFB)";
          }
        } else {
          try {
            const cap = await this.runtime.capture(source, edge2.mode);
            content = cap.text;
            seq = cap.seq;
          } catch {
            content = source.draft || source.task || "(\u4F1A\u8BDD\u6682\u65E0\u8F93\u51FA)";
          }
        }
      } else {
        content = source.draft.trim() || source.task.trim() || "(\u5C1A\u672A\u542F\u52A8\u8349\u7A3F \u2014 \u542F\u52A8\u8FD0\u884C\u540E\u5C06\u5728\u6B64\u4F20\u9012\u8F93\u51FA)";
      }
    } else if (source.kind === "file" && !edge2.snapshotText && !edge2.snapshotContent) {
      const cap = await this.runtime.reference(source, edge2);
      structured = cap.content;
      const paths2 = extractFileNodePaths(source);
      const baseCwd = this.resolveWorkspaceRoot(
        source.worktreePath ?? source.cwd
      );
      const previews = [cap.text];
      for (const p of paths2.slice(0, 4)) {
        try {
          const full = resolve3(baseCwd, p);
          const rel = relative2(baseCwd, full);
          if (rel.startsWith("..") || isAbsolute2(rel)) continue;
          const st = statSync2(full);
          if (st.isFile()) {
            totalDiskBytes += st.size;
            const preview = await this.readWorkspaceFile({
              path: p,
              cwd: baseCwd
            });
            previews.push(
              `
--- ${preview.path} (${st.size} bytes) ---
${preview.content.slice(0, 4e3)}${preview.truncated || preview.content.length > 4e3 ? "\n\u2026[\u9884\u89C8\u5DF2\u622A\u65AD]" : ""}`
            );
          }
        } catch {
        }
      }
      content = previews.join("\n");
    } else {
      const cap = await this.runtime.reference(source, edge2);
      structured = cap.content;
      content = cap.text;
      sessionId = cap.sourceSessionId;
      seq = cap.seq;
    }
    const byteLength = Math.max(
      totalDiskBytes,
      Buffer.byteLength(content, "utf8")
    );
    const firstLine = content.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
    const summary = firstLine.length > 100 ? `${firstLine.slice(0, 100)}\u2026` : firstLine || `${source.title} \u2192 ${target.title}`;
    const itemCount = structured?.items?.length ?? (structured?.dataType === "file" && Array.isArray(structured.value) ? structured.value.length : void 0);
    return {
      edgeId: edge2.id,
      kind: edge2.kind,
      mode: edge2.kind === "reference" ? source.kind : edge2.mode,
      sourceTitle: source.kind === "board" ? runToken?.source.title ?? referenceTitle(source, edge2) : source.title,
      targetTitle: target.title,
      ...sessionId ? { sessionId } : {},
      ...seq !== void 0 ? { seq } : {},
      byteLength,
      ...itemCount !== void 0 ? { itemCount, originalCount: structured?.originalCount } : {},
      willSpill: byteLength > 65536,
      freshness,
      summary,
      content
    };
  }
  async bind(request) {
    return this.scheduler.transact(async () => {
      const node2 = this.node(request.nodeId);
      if (node2.sessionId) return structuredClone(sanitizeDocumentForWire(this.state.doc).nodes.find((n) => n.id === node2.id));
      if (this.state.doc.edges.some(
        (e) => e.target === node2.id && e.mode === "fork"
      ))
        throw new Error("\u5206\u53C9\u8349\u7A3F\u5C06\u5728\u63A5\u7EED\u65F6\u521B\u5EFA\u4F1A\u8BDD");
      if (request.sessionId && this.state.doc.nodes.some((n) => n.sessionId === request.sessionId))
        throw new Error("\u8BE5\u4F1A\u8BDD\u5DF2\u5728\u753B\u5E03\u4E2D");
      node2.workspaceId = request.workspaceId ?? node2.workspaceId;
      node2.cwd = request.cwd ?? node2.cwd;
      node2.branch = request.branch ?? node2.branch;
      node2.worktreePath = request.worktreePath ?? node2.worktreePath;
      if (node2.worktreePath) {
        this.state.knownWorktrees.add(resolve3(node2.worktreePath));
      }
      if (request.sessionId) {
        var _stack = [];
        try {
          if (node2.teamRef || this.teams.isLead(request.sessionId))
            throw new Error("\u56E2\u961F\u4E3B\u7BA1\u4F1A\u8BDD\u5FC5\u987B\u7531\u5BF9\u5E94\u7684\u753B\u5E03\u56E2\u961F\u8282\u70B9\u521B\u5EFA");
          const observation = __using(_stack, await this.ctx.sessionQuery.observeSession(
            request.sessionId
          ));
          node2.sessionId = request.sessionId;
          node2.cwd = observation.header.cwd;
          for (const ev of observation.events) {
            this.recordNativeMessage(request.sessionId, ev);
          }
        } catch (_) {
          var _error = _, _hasError = true;
        } finally {
          __callDispose(_stack, _error, _hasError);
        }
      } else node2.sessionId = await this.runtime.ensure(node2);
      syncUntitledAgentNode(node2);
      if (node2.continuationPrompt === void 0 && node2.task.trim()) {
        node2.continuationPrompt = node2.task;
      }
      await this.persist();
      if (request.sessionId) this.syncTeams();
      return structuredClone(
        this.state.doc.nodes.find((n) => n.id === node2.id)
      );
    });
  }
  async display(request) {
    const source = this.state.doc.nodes.find((n) => n.id === request.nodeId);
    if (!source) throw new Error("\u6765\u6E90\u8282\u70B9\u4E0D\u5B58\u5728");
    const captured = request.text === void 0 ? source.kind === "agent" ? await this.runtime.capture(source, "conclusion", request.seq) : await this.runtime.reference(source) : void 0;
    const node2 = {
      ...newNode(
        "display",
        source.x + source.width + 60,
        source.y + 40,
        source.title + " \xB7 \u7ED3\u679C"
      ),
      text: request.text ?? captured?.text ?? "",
      sourceNodeId: source.id,
      sourceSeq: request.seq ?? captured?.seq,
      fixed: request.fixed
    };
    this.state.doc.nodes.push(node2);
    await this.persist();
    return structuredClone(node2);
  }
  async sessions() {
    const result = await this.ctx.sessionController.list(
      {},
      new AbortController().signal
    );
    const rows = result.items.filter((s) => s.origin !== "subagent");
    const titles = await this.ctx.sessionQuery.readTitleSnapshots(
      rows.map((s) => s.sessionId)
    );
    return rows.map((s, i) => ({
      sessionId: s.sessionId,
      title: titles[i]?.status === "fulfilled" ? titles[i].value.title?.title ?? s.sessionId : s.sessionId,
      cwd: s.cwd,
      running: s.running,
      updatedAt: s.updatedAt
    }));
  }
  workspaces() {
    return this.ctx.workspaceRegistry.list().map((w) => ({ id: w.id, name: w.title, path: w.path }));
  }
  async projectStructures() {
    const list = this.ctx.workspaceRegistry.list();
    return Promise.all(
      list.map(async (w) => {
        const status = await this.git.inspect(w.path).catch(() => null);
        if (status?.topLevel && sameFsPath(status.topLevel, w.path)) {
          for (const wt of status.worktrees) {
            if (wt.path && !wt.isMain) {
              this.state.knownWorktrees.add(resolve3(wt.path));
            }
          }
        }
        return {
          id: w.id,
          name: w.title,
          path: w.path,
          isGitRepo: Boolean(
            status?.isGitRepo && sameFsPath(status.topLevel, w.path)
          ),
          currentBranch: status?.branch || void 0,
          branches: status?.branches ?? [],
          worktrees: status?.worktrees ?? []
        };
      })
    );
  }
  async gitInspect(request) {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const status = await this.git.inspect(base);
    if (status.topLevel && sameFsPath(status.topLevel, base)) {
      for (const wt of status.worktrees) {
        if (wt.path && !wt.isMain) {
          this.state.knownWorktrees.add(resolve3(wt.path));
        }
      }
    }
    return status;
  }
  async gitDiff(request) {
    const base = this.resolveWorkspaceRoot(request.cwd);
    return this.git.diff(base, request);
  }
  async gitAction(request) {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const status = await this.git.act(base, request);
    if (status.topLevel && sameFsPath(status.topLevel, base)) {
      for (const wt of status.worktrees) {
        if (wt.path && !wt.isMain) {
          this.state.knownWorktrees.add(resolve3(wt.path));
        }
      }
    }
    return status;
  }
  async sessionChanges(request) {
    var _stack = [];
    try {
      const sessionId = request.sessionId.trim();
      if (!sessionId) return [];
      const obs = __using(_stack, await this.ctx.sessionQuery.observeSession(
        sessionId,
        { projectionMode: "none" }
      ));
      return this.collectSessionChangesFromEvents(sessionId, obs.events);
    } catch (_) {
      var _error = _, _hasError = true;
    } finally {
      __callDispose(_stack, _error, _hasError);
    }
  }
  async sessionChangeDiff(request) {
    const wc = this.ctx.get("workspaceChanges");
    if (!wc) {
      throw new Error("\u5F53\u524D Host \u672A\u6302\u8F7D workspace-changes \u670D\u52A1");
    }
    const sid = request.sessionId;
    const sum = wc.summary(sid, request.seq);
    if (!sum) {
      throw new Error("\u8BE5\u8F6E\u6539\u52A8\u4E34\u65F6\u5FEB\u7167\u5DF2\u8FC7\u671F\u6216\u4E0D\u5B58\u5728");
    }
    const signal = new AbortController().signal;
    if (request.fileIndex !== void 0) {
      const diff = await wc.diff(sid, request.seq, request.fileIndex, signal);
      if (!diff) throw new Error("\u672A\u627E\u5230\u6307\u5B9A\u6587\u4EF6\u6539\u52A8\u5BF9\u6BD4");
      if (diff.kind !== "text") {
        return {
          path: diff.path,
          display: diff.display,
          kind: diff.kind,
          hunks: [],
          formatted: `[${diff.kind.toUpperCase()}] ${diff.display}`
        };
      }
      const formatted2 = [
        `--- a/${diff.display}`,
        `+++ b/${diff.display}`,
        ...diff.hunks.flatMap((h) => [
          `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
          ...h.lines
        ])
      ].join("\n");
      return {
        path: diff.path,
        display: diff.display,
        kind: "text",
        hunks: diff.hunks,
        formatted: formatted2
      };
    }
    const parts = [
      `Turn #${sum.turn} (${sum.total} files, +${sum.added} / -${sum.deleted})`
    ];
    const allHunks = [];
    for (let i = 0; i < Math.min(sum.files.length, 20); i++) {
      const diff = await wc.diff(sid, request.seq, i, signal).catch(() => void 0);
      if (!diff) continue;
      if (diff.kind !== "text") {
        parts.push(`
[${diff.kind.toUpperCase()}] ${diff.display}`);
        continue;
      }
      parts.push(`
--- a/${diff.display}
+++ b/${diff.display}`);
      for (const h of diff.hunks) {
        allHunks.push(h);
        parts.push(
          `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
          ...h.lines
        );
      }
    }
    const formatted = parts.join("\n");
    return {
      path: sum.cwd,
      display: `Turn #${sum.turn}`,
      kind: "text",
      hunks: allHunks.slice(0, 60),
      formatted
    };
  }
  sessionTerminals(request) {
    const tc = this.ctx.get("terminalController");
    if (!tc || !request.sessionId) return [];
    return tc.list(request.sessionId).map((t2) => ({
      id: t2.id,
      sessionId: request.sessionId,
      title: t2.title,
      cwd: t2.cwd,
      state: t2.state,
      exitCode: t2.exitCode,
      origin: t2.origin
    }));
  }
  async openSessionTerminal(request) {
    const tc = this.ctx.get("terminalController");
    if (!tc) throw new Error("\u5F53\u524D\u73AF\u5883\u672A\u542F\u7528 terminalController");
    const resolved = await this.ctx.sessionController.resolveAgent(
      request.sessionId
    );
    if ("error" in resolved) throw resolved.error;
    const created = await tc.create(
      resolved.agent,
      { id: uid(), cols: 100, rows: 28 },
      new AbortController().signal
    );
    return {
      id: created.id,
      sessionId: request.sessionId,
      title: created.title,
      cwd: created.cwd,
      state: created.state,
      exitCode: created.exitCode,
      origin: created.origin
    };
  }
  async readTerminalScreen(request) {
    const tc = this.ctx.get("terminalController");
    if (!tc) throw new Error("\u5F53\u524D\u73AF\u5883\u672A\u542F\u7528 terminalController");
    const sid = request.sessionId;
    const list = tc.list(sid);
    const chosen = (request.terminalId ? list.find((t2) => t2.id === request.terminalId) : void 0) ?? list[0];
    if (!chosen) {
      return {
        sessionId: request.sessionId,
        terminalId: "",
        title: "\u65E0\u6D3B\u52A8\u7EC8\u7AEF",
        state: "exited",
        text: "",
        totalLines: 0,
        truncated: false
      };
    }
    const resolved = await this.ctx.sessionController.resolveAgent(sid);
    if ("error" in resolved) throw resolved.error;
    const page = await tc.readScreen(resolved.agent, chosen.id, {
      offset: 0,
      count: Math.min(400, Math.max(20, request.lines ?? 140)),
      maxBytes: 65536
    });
    return {
      sessionId: request.sessionId,
      terminalId: chosen.id,
      title: chosen.title,
      state: chosen.state,
      text: page.text,
      totalLines: page.totalLines,
      truncated: page.truncated
    };
  }
  async workspaceFiles(request) {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const out = [];
    const skip = /* @__PURE__ */ new Set([
      "node_modules",
      ".git",
      ".local",
      ".backups",
      "dist",
      "lib",
      ".next",
      "coverage"
    ]);
    const walk = async (dir, depth) => {
      if (depth > 3 || out.length >= 80) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (out.length >= 80) break;
        if (skip.has(entry.name)) continue;
        const full = resolve3(dir, entry.name);
        if (entry.isDirectory()) await walk(full, depth + 1);
        else if (entry.isFile())
          out.push(relative2(base, full).replaceAll("\\", "/"));
      }
    };
    await walk(base, 0);
    return out;
  }
  workspacePath(request) {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const raw = request.path.trim();
    if (!raw) throw new Error("\u672A\u6307\u5B9A\u6587\u4EF6\u8DEF\u5F84");
    const full = resolve3(base, raw);
    const rel = relative2(base, full);
    if (rel.startsWith("..") || isAbsolute2(rel))
      throw new Error("\u6587\u4EF6\u8DEF\u5F84\u8D85\u51FA\u5F53\u524D\u5DE5\u4F5C\u533A");
    return { base, raw, full, rel };
  }
  async workspaceFile(request) {
    const { base, raw, full, rel } = this.workspacePath(request);
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) throw new Error(`\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${raw}`);
    if (!isSubPath(await realpath(base), await realpath(full))) throw new Error("\u6587\u4EF6\u8DEF\u5F84\u8D85\u51FA\u5F53\u524D\u5DE5\u4F5C\u533A");
    return { full, rel, info, raw };
  }
  async readWorkspaceFile(request) {
    const { full, rel, info, raw } = await this.workspaceFile(request);
    const maxReadBytes = 65536;
    const maxChars = 24e3;
    const toRead = Math.min(info.size, maxReadBytes);
    if (toRead === 0) {
      return {
        path: rel.replaceAll("\\", "/"),
        content: "",
        truncated: false
      };
    }
    const fh = await open(full, "r");
    try {
      const buf = Buffer.allocUnsafe(toRead);
      const { bytesRead } = await fh.read(buf, 0, toRead, 0);
      const slice = buf.subarray(0, bytesRead);
      if (slice.includes(0)) {
        throw new Error(`\u4E8C\u8FDB\u5236\u6587\u4EF6\u4E0D\u652F\u6301\u6587\u672C\u9884\u89C8\uFF1A${raw}`);
      }
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      const truncated = bytesRead < info.size || decoded.length > maxChars;
      return {
        path: rel.replaceAll("\\", "/"),
        content: decoded.length > maxChars ? decoded.slice(0, maxChars) : decoded,
        truncated
      };
    } finally {
      await fh.close();
    }
  }
  /**
   * Confine `cwd` strictly to registered DSH workspaces, `<repo>-worktrees/*` managed directories,
   * or verified Git worktrees discovered from those workspaces (no arbitrary `../*` sibling folders).
   */
  resolveWorkspaceRoot(cwd) {
    const list = this.ctx.workspaceRegistry.list();
    if (cwd) {
      const candidate = resolve3(cwd);
      const inRegisteredWorkspace = list.some(
        (w) => isSubPath(w.path, candidate)
      );
      const inManagedWorktreesDir = list.some(
        (w) => isSubPath(
          resolve3(w.path, "..", `${basename2(w.path)}-worktrees`),
          candidate
        )
      );
      const inVerifiedWorktree = [...this.state.knownWorktrees].some(
        (wt) => isSubPath(wt, candidate)
      );
      if (inRegisteredWorkspace || inManagedWorktreesDir || inVerifiedWorktree || isSubPath(resolve3(process.cwd()), candidate)) {
        return candidate;
      }
    }
    return resolve3(list[0]?.path ?? process.cwd());
  }
  canvasPresence(sessionIds) {
    this.state.canvasSessions = new Set(sessionIds);
  }
  async stopNode(nodeId) {
    const node2 = this.node(nodeId);
    if (!node2.sessionId) return;
    const lead = this.teams.isLead(node2.sessionId);
    if (lead) await this.scheduler.stopSettlingTeam(node2.sessionId);
    this.ctx.sessionController.cancel({ sessionId: node2.sessionId });
    if (lead) await this.teams.interruptMembers(node2.sessionId);
  }
  async *follow(signal) {
    let wake, changed = true;
    const notify = () => {
      changed = true;
      wake?.();
    };
    this.state.listeners.add(notify);
    signal.addEventListener("abort", notify, { once: true });
    try {
      while (!signal.aborted) {
        if (!changed)
          await new Promise((resolve4) => {
            wake = resolve4;
          });
        if (signal.aborted) break;
        changed = false;
        wake = void 0;
        yield this.snapshot();
      }
    } finally {
      this.state.listeners.delete(notify);
      signal.removeEventListener("abort", notify);
    }
  }
  node(id) {
    const n = this.state.doc.nodes.find((n2) => n2.id === id);
    if (!n || n.kind !== "agent") throw new Error("Agent \u8282\u70B9\u4E0D\u5B58\u5728");
    return n;
  }
};
_init = __decoratorStart(_b);
__decorateElement(_init, 1, "snapshot", _snapshot_dec, FlowspaceService);
__decorateElement(_init, 1, "listRoles", _listRoles_dec, FlowspaceService);
__decorateElement(_init, 1, "saveRole", _saveRole_dec, FlowspaceService);
__decorateElement(_init, 1, "archiveRole", _archiveRole_dec, FlowspaceService);
__decorateElement(_init, 1, "listTeams", _listTeams_dec, FlowspaceService);
__decorateElement(_init, 1, "saveTeam", _saveTeam_dec, FlowspaceService);
__decorateElement(_init, 1, "archiveTeam", _archiveTeam_dec, FlowspaceService);
__decorateElement(_init, 1, "listModelRoutes", _listModelRoutes_dec, FlowspaceService);
__decorateElement(_init, 1, "save", _save_dec, FlowspaceService);
__decorateElement(_init, 1, "revertContainerChange", _revertContainerChange_dec, FlowspaceService);
__decorateElement(_init, 1, "writeVariable", _writeVariable_dec, FlowspaceService);
__decorateElement(_init, 1, "launchTrigger", _launchTrigger_dec, FlowspaceService);
__decorateElement(_init, 1, "debugStep", _debugStep_dec, FlowspaceService);
__decorateElement(_init, 1, "generateReport", _generateReport_dec, FlowspaceService);
__decorateElement(_init, 1, "importWorkflow", _importWorkflow_dec, FlowspaceService);
__decorateElement(_init, 1, "draft", _draft_dec, FlowspaceService);
__decorateElement(_init, 1, "plan", _plan_dec, FlowspaceService);
__decorateElement(_init, 1, "start", _start_dec, FlowspaceService);
__decorateElement(_init, 1, "rerunFailed", _rerunFailed_dec, FlowspaceService);
__decorateElement(_init, 1, "extendLoop", _extendLoop_dec, FlowspaceService);
__decorateElement(_init, 1, "command", _command_dec, FlowspaceService);
__decorateElement(_init, 1, "answerHuman", _answerHuman_dec, FlowspaceService);
__decorateElement(_init, 1, "remindEmission", _remindEmission_dec, FlowspaceService);
__decorateElement(_init, 1, "previewData", _previewData_dec, FlowspaceService);
__decorateElement(_init, 1, "release", _release_dec, FlowspaceService);
__decorateElement(_init, 1, "restoreSnapshot", _restoreSnapshot_dec, FlowspaceService);
__decorateElement(_init, 1, "inspectEdgePayload", _inspectEdgePayload_dec, FlowspaceService);
__decorateElement(_init, 1, "bind", _bind_dec, FlowspaceService);
__decorateElement(_init, 1, "display", _display_dec, FlowspaceService);
__decorateElement(_init, 1, "sessions", _sessions_dec, FlowspaceService);
__decorateElement(_init, 1, "workspaces", _workspaces_dec, FlowspaceService);
__decorateElement(_init, 1, "projectStructures", _projectStructures_dec, FlowspaceService);
__decorateElement(_init, 1, "gitInspect", _gitInspect_dec, FlowspaceService);
__decorateElement(_init, 1, "gitDiff", _gitDiff_dec, FlowspaceService);
__decorateElement(_init, 1, "gitAction", _gitAction_dec, FlowspaceService);
__decorateElement(_init, 1, "sessionChanges", _sessionChanges_dec, FlowspaceService);
__decorateElement(_init, 1, "sessionChangeDiff", _sessionChangeDiff_dec, FlowspaceService);
__decorateElement(_init, 1, "sessionTerminals", _sessionTerminals_dec, FlowspaceService);
__decorateElement(_init, 1, "openSessionTerminal", _openSessionTerminal_dec, FlowspaceService);
__decorateElement(_init, 1, "readTerminalScreen", _readTerminalScreen_dec, FlowspaceService);
__decorateElement(_init, 1, "workspaceFiles", _workspaceFiles_dec, FlowspaceService);
__decorateElement(_init, 1, "readWorkspaceFile", _readWorkspaceFile_dec, FlowspaceService);
__decorateElement(_init, 1, "canvasPresence", _canvasPresence_dec, FlowspaceService);
__decorateElement(_init, 1, "stopNode", _stopNode_dec, FlowspaceService);
__decorateElement(_init, 1, "follow", _follow_dec, FlowspaceService);
__decoratorMetadata(_init, FlowspaceService);
__publicField(FlowspaceService, "inject", [
  "sessionController",
  "sessions",
  "agents",
  "sessionQuery",
  "storageDomain",
  "workspaceRegistry",
  "fs",
  "llm",
  "tools",
  "subagents",
  "sessionProjections"
]);
var index_default = FlowspaceService;
export {
  FlowspaceService,
  index_default as default
};
//# sourceMappingURL=index.js.map
