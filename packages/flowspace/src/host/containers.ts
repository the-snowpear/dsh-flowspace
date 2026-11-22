import { createHash } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import type { FsTarget, FsVersion } from "@deepseek-ai/dsh-fs";
import type { KvTable } from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";
import {
  findBoardCard, moveBoardCard, newBoardCard, normalizeBoardColumns,
  pruneBoardReferences, removeBoardCard, toggleBoardCardDone, updateBoardCard,
} from "../core/board.ts";
import { boardIdsForReference, canvasEntry, containerPermission, writeCanvasEntry } from "../core/containers.ts";
import { parseEmission } from "../core/emission.ts";
import { DEFAULT_LIST_LIMIT, textOfContent } from "../core/content.ts";
import { canonicalJson, extractFileNodePaths } from "../core/utils.ts";
import type { Scheduler } from "../core/scheduler.ts";
import type { ContainerChange, ContainerEntry, ContextSnapshot, FlowEdge, FlowNode, FlowspaceDocument, FlowspaceRun, FlowToken } from "../types.ts";
import { approveWrite, jsonToolOutput, zodToolSchema } from "./toolPrimitives.ts";

export { approveWrite, jsonToolOutput };

const lookup = z.strictObject({ edgeId: z.string() });
const update = lookup.extend({ expectedVersion: z.string(), text: z.string() });
const boardUpdate = lookup.extend({
  action: z.enum(["add", "edit", "delete", "move", "toggle", "comment", "check"]),
  itemId: z.string().optional(), expectedVersion: z.string(),
  text: z.string().optional(), columnId: z.string().optional(), checklistId: z.string().optional(),
});
type BoardUpdate = z.infer<typeof boardUpdate>;
type Kind = "board" | "note" | "file";
type ChangeOwner = Pick<ContainerChange, "by" | "sessionId" | "edgeId" | "runId" | "stepId">;
type Mount = { node: FlowNode; edge: FlowEdge; permission: "advance" | "edit" };
type FileEntry = { target: FsTarget; version: FsVersion | undefined; entry: Extract<ContainerEntry, { kind: "file" }> | null };

const versionOf = (entry: ContainerEntry | null) => {
  if (!entry) return "absent";
  const value = entry.kind === "board" ? { column: entry.columnId, card: entry.card } : entry;
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
};

function requireVersion(expected: string, actual: string): void {
  if (expected !== actual) throw new Error(`条目版本冲突。当前版本 ${actual}。请读取最新内容后再试。`);
}

export class ContainerStore {
  constructor(
    private readonly ctx: Context,
    private readonly table: KvTable<string, ContainerChange>,
    private readonly document: () => FlowspaceDocument,
    private readonly persist: () => Promise<void>,
    private readonly publish: () => void,
    private readonly workspacePath: (request: { path: string; cwd?: string }) => { base: string; full: string; rel: string },
  ) {}

  changes(): ContainerChange[] {
    return [...this.table.entries()].map(([, value]) => value)
      .filter(change => !change.pending).sort((a, b) => a.revision - b.revision);
  }

  private latest(id: string) {
    return this.table.get(id);
  }

  mounts(sessionId: string, kind: Kind): Mount[] {
    const doc = this.document();
    const target = doc.nodes.find(node => node.kind === "agent" && node.sessionId === sessionId);
    if (!target) return [];
    const nodes = new Map(doc.nodes.map(node => [node.id, node]));
    return doc.edges.flatMap(edge => {
      if (edge.target !== target.id) return [];
      const node = nodes.get(edge.source);
      if (node?.kind !== kind || (kind === "file" && extractFileNodePaths(node).length !== 1)) return [];
      const permission = containerPermission(node, edge);
      return permission === "read" ? [] : [{ node, edge, permission }];
    });
  }

  mount(sessionId: string, kind: Kind, edgeId: string): Mount {
    const mount = this.mounts(sessionId, kind).find(item => item.edge.id === edgeId);
    if (!mount) throw new Error("当前会话没有此容器的写入授权");
    return mount;
  }

  async read(mount: Mount, signal?: AbortSignal) {
    const { edge, node } = mount;
    if (node.kind === "board") {
      const ids = boardIdsForReference(node, edge);
      const entries = [...ids].map(id => {
        const entry = canvasEntry(node, id);
        return { id, version: versionOf(entry), entry };
      });
      const columns = normalizeBoardColumns(node.columns).map(({ id, name }) => ({ id, name }));
      return { entries, columns };
    }
    if (node.kind === "file") {
      const path = extractFileNodePaths(node)[0];
      const file = await this.file(path, node.worktreePath ?? node.cwd, signal);
      return { entry: file.entry, version: file.version ?? "absent" };
    }
    const entry = canvasEntry(node);
    return { entry, version: versionOf(entry) };
  }

  private async file(path: string, cwd?: string, signal?: AbortSignal): Promise<FileEntry> {
    const { base, full, rel } = this.workspacePath({ path, cwd });
    const root = await this.ctx.fs.resolve(base, { signal });
    const target = await this.ctx.fs.resolve(full, { signal });
    if (!this.ctx.fs.contains(root, target)) throw new Error("文件路径超出当前工作区");
    const info = await this.ctx.fs.stat(target, signal);
    const entry = info ? {
      kind: "file" as const, path: rel, cwd: base, text: await this.ctx.fs.readText(target, signal),
    } : null;
    return { target, version: info?.version, entry };
  }

  private async record(
    node: FlowNode, itemId: string | undefined, id: string,
    before: ContainerEntry | null, after: ContainerEntry | null,
    owner: ChangeOwner, file?: FileEntry, signal?: AbortSignal,
  ): Promise<ContainerChange> {
    const previous = this.latest(id);
    if (previous && !previous.pending) return previous;
    if (after?.kind === "board" && owner.sessionId) after.card = { ...after.card, author: owner.sessionId };
    const document = this.document();
    const revision = (document.containerRevision ?? 0) + 1;
    const change: ContainerChange = {
      id, nodeId: node.id, itemId, before, after, ...owner, revision, at: Date.now(),
      beforeVersion: file?.version ?? versionOf(before), afterVersion: versionOf(after), pending: true,
    };
    const edited = { ...node };
    if (!file && !writeCanvasEntry(edited, itemId, after)) throw new Error("目标容器或列已移除");
    await this.table.put(id, change);
    if (file) {
      try {
        if (after?.kind === "file") {
          const outcome = await this.ctx.fs.writeText(file.target, after.text,
            file.version ? { kind: "replaceIfVersion", version: file.version } : { kind: "createIfAbsent" }, signal);
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
      document.nodes = document.nodes.map(current => current.id === edited.id ? edited : current);
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
      const node = doc.nodes.find(entry => entry.id === change.nodeId);
      const file = change.after?.kind === "file" ? change.after : change.before?.kind === "file" ? change.before : undefined;
      if (file) {
        const current = await this.file(file.path, file.cwd);
        if (versionOf(current.entry) !== versionOf(change.after)) {
          await this.table.delete(change.id);
          continue;
        }
        change.afterVersion = current.version ?? "absent";
        doc.containerRevision = Math.max(doc.containerRevision ?? 0, change.revision);
      } else if (!node || (doc.containerRevision ?? 0) < change.revision) {
        await this.table.delete(change.id);
        continue;
      }
      delete change.pending;
      await this.table.put(change.id, change);
    }
  }

  private writeBoard(mount: Mount, args: BoardUpdate, owner: ChangeOwner, id: string) {
    const { edge, node, permission } = mount;
    const { itemId, action, expectedVersion, text, columnId, checklistId } = args;
    const columns = normalizeBoardColumns(node.columns);
    const found = itemId === undefined ? undefined : findBoardCard(columns, itemId);
    const before = canvasEntry(node, itemId);
    if (action === "add") {
      if (permission !== "edit" || edge.sourceItemKey !== undefined || node.selectedItems?.length)
        throw new Error("当前引用未授权新增卡片");
      requireVersion(expectedVersion, "absent");
      const target = columns.find(column => column.id === columnId) ?? (!columnId ? columns[0] : undefined);
      if (!target || !text?.trim()) throw new Error("新增卡片需要文字和有效的列");
      const card = newBoardCard(text.trim());
      return this.record(node, card.id, id, null, { kind: "board", columnId: target.id, card }, owner);
    }
    if (!itemId || !found || !boardIdsForReference(node, edge).has(itemId)) throw new Error("当前引用未授权此卡片");
    if ((action === "edit" || action === "delete") && permission !== "edit") throw new Error("该操作需要编辑授权");
    requireVersion(expectedVersion, versionOf(before));
    const now = Date.now();
    let next = columns;
    switch (action) {
      case "move":
        if (!columns.some(column => column.id === columnId)) throw new Error("目标列不存在");
        next = moveBoardCard(columns, itemId, columnId!, undefined, now);
        break;
      case "toggle":
        next = toggleBoardCardDone(columns, itemId, node.boardSettings, now);
        break;
      case "check":
        if (!found.card.checklist?.some(item => item.id === checklistId)) throw new Error("清单项不存在");
        next = updateBoardCard(columns, itemId, card => ({
          ...card, updatedAt: now,
          checklist: card.checklist!.map(item => item.id === checklistId ? { ...item, done: !item.done } : item),
        }));
        break;
      case "comment":
        if (!text?.trim()) throw new Error("请填写评论");
        next = updateBoardCard(columns, itemId, card => ({
          ...card, updatedAt: now, comments: [...(card.comments ?? []), { id, by: owner.by, text: text.trim(), createdAt: now }],
        }));
        break;
      case "edit":
        if (!text?.trim()) throw new Error("请填写卡片文字");
        next = updateBoardCard(columns, itemId, card => ({ ...card, text: text.trim(), updatedAt: now }));
        break;
      case "delete":
        next = removeBoardCard(columns, itemId);
        break;
    }
    return this.record(node, itemId, id, before, canvasEntry({ ...node, columns: next }, itemId), owner);
  }

  async write(mount: Mount, args: BoardUpdate | z.infer<typeof update>, owner: ChangeOwner, id: string, signal: AbortSignal) {
    const previous = this.latest(id);
    if (previous && !previous.pending) return previous;
    if ("action" in args) return this.writeBoard(mount, args, owner, id);
    const { node } = mount;
    if (node.kind === "file") {
      const path = extractFileNodePaths(node)[0];
      const file = await this.file(path, node.worktreePath ?? node.cwd, signal);
      requireVersion(args.expectedVersion, file.version ?? "absent");
      const { base, rel } = this.workspacePath({ path, cwd: node.worktreePath ?? node.cwd });
      return this.record(node, undefined, id, file.entry, {
        kind: "file", path: rel, cwd: base, text: args.text.replaceAll("\r\n", "\n"),
      }, owner, file, signal);
    }
    const before = canvasEntry(node);
    requireVersion(args.expectedVersion, versionOf(before));
    return this.record(node, undefined, id, before, { kind: "note", text: args.text }, owner);
  }

  async deliver(run: FlowspaceRun, edge: FlowEdge, token: FlowToken, source: ContextSnapshot) {
    const node = this.document().nodes.find(node => node.id === edge.target);
    if (!node) throw new Error("投递目标已移除");
    const step = run.steps.find(step => step.id === token.stepId);
    const owner: ChangeOwner = {
      by: step?.sessionId ?? edge.source, sessionId: step?.sessionId, runId: run.id, stepId: step?.id, edgeId: edge.id,
    };
    const id = JSON.stringify([run.id, token.stepId, edge.id]);
    const text = source.content ? textOfContent(source.content) : source.text;
    if (node.kind === "board") {
      const columns = normalizeBoardColumns(node.columns);
      const dest = edge.delivery?.columnId ? columns.find(column => column.id === edge.delivery?.columnId) : columns[0];
      if (!dest) throw new Error("投递目标列已移除");
      const mode = edge.delivery?.mode ?? "lines";
      const values = mode === "paragraph" ? [text] : mode === "list"
        ? source.content?.items?.map(item => item.value) ?? parseEmission(text)
        : text.split(/\r?\n/);
      for (const [index, value] of values.slice(0, run.listLimit ?? DEFAULT_LIST_LIMIT).entries()) {
        const title = typeof value === "string" ? value.trim() : JSON.stringify(value);
        if (!title) continue;
        const itemId = `${id}:${index}`;
        const current = this.document().nodes.find(node => node.id === edge.target)!;
        const card = { ...newBoardCard(title), id: itemId };
        await this.record(current, itemId, itemId, null, { kind: "board", columnId: dest.id, card }, owner);
      }
    } else if (node.kind === "note") {
      await this.record(node, undefined, id, canvasEntry(node), { kind: "note", text }, owner);
    } else if (node.kind === "file") {
      const paths = extractFileNodePaths(node);
      if (paths.length !== 1) throw new Error("请选择一个投递文件");
      const cwd = node.worktreePath ?? node.cwd;
      const file = await this.file(paths[0], cwd);
      const path = this.workspacePath({ path: paths[0], cwd });
      await this.record(node, undefined, id, file.entry, {
        kind: "file", text: text.replaceAll("\r\n", "\n"), path: path.rel, cwd: path.base,
      }, owner, file);
    }
  }

  async revert(id: string) {
    const change = this.latest(id);
    if (!change || change.pending || change.revertedBy) throw new Error("此改动已撤回或不可用");
    const node = this.document().nodes.find(node => node.id === change.nodeId);
    if (!node) throw new Error("容器已移除");
    const file = change.after?.kind === "file" ? await this.file(change.after.path, change.after.cwd) : undefined;
    const current = file ? file.entry : canvasEntry(node, change.itemId);
    requireVersion(change.afterVersion, file?.version ?? versionOf(current));
    const undone = await this.record(node, change.itemId, `undo:${id}`, current, change.before, { by: "用户" }, file);
    await this.table.put(id, { ...change, revertedBy: undone.id });
    return undone;
  }
}

export function registerContainerTools(ctx: Context, store: ContainerStore, scheduler: Scheduler) {
  for (const kind of ["board", "note", "file"] as const) {
    const when = ({ agent }: { agent: { id: string } }) => store.mounts(agent.id, kind).length > 0;
    ctx.tools.register({
      name: `${kind}_read`,
      description: `List your writable FlowSpace ${kind} references or read one with its current version.`,
      parameters: { type: "object", properties: { edgeId: { type: "string" } }, additionalProperties: false },
      output: jsonToolOutput,
      async execute(raw, exec) {
        const { edgeId } = lookup.partial().parse(raw);
        const sessionId = exec.agent?.id;
        if (!sessionId) throw new Error("容器工具需要画布 Agent 会话");
        return scheduler.transact(async () => edgeId
          ? store.read(store.mount(sessionId, kind, edgeId), exec.signal)
          : { references: store.mounts(sessionId, kind).map(({ node, edge, permission }) => ({
              edgeId: edge.id, title: node.title, permission,
            })) });
      },
    }, { when });
    const schema = kind === "board" ? boardUpdate : update;
    const toolName = `${kind}_write`;
    ctx.tools.register({
      name: toolName,
      description: kind === "board"
        ? "Change one granted FlowSpace board card. Use board_read first to get its current version. For add, expectedVersion is absent."
        : `Replace the text of one granted FlowSpace ${kind}. Read it first to get the current version.`,
      parameters: zodToolSchema(schema),
      output: jsonToolOutput,
      async execute(raw, exec) {
        const args = schema.parse(raw);
        const agent = exec.agent;
        if (!agent) throw new Error("容器工具需要画布 Agent 会话");
        const before = store.mount(agent.id, kind, args.edgeId);
        if (before.edge.ask) await approveWrite(ctx, exec, toolName, before.node.title);
        return scheduler.transact(async () => {
          exec.signal.throwIfAborted();
          const current = store.mount(agent.id, kind, args.edgeId);
          if (before.node.id !== current.node.id || before.edge.sourceItemKey !== current.edge.sourceItemKey ||
              (current.edge.ask && !before.edge.ask) || (kind === "file" &&
                (extractFileNodePaths(before.node)[0] !== extractFileNodePaths(current.node)[0] ||
                 (before.node.worktreePath ?? before.node.cwd) !== (current.node.worktreePath ?? current.node.cwd))))
            throw new Error("容器授权已变化，请重新读取");
          const running = scheduler.activeSessionStep(agent.id);
          const result = await store.write(current, args, {
            by: agent.id, sessionId: agent.id, edgeId: current.edge.id, runId: running?.run.id, stepId: running?.step.id,
          }, JSON.stringify([agent.id, running?.step.id, exec.callId]), exec.signal);
          return { id: result.id, itemId: result.itemId ?? null, version: result.afterVersion };
        });
      },
    }, { when });
  }
}
