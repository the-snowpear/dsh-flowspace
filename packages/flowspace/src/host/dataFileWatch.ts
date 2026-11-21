import type { Context } from "@deepseek-ai/cordis";
import type { FsTarget } from "@deepseek-ai/dsh-fs";
import { connectionPort } from "../core/connect.ts";
import { DEFAULT_LIST_LIMIT, selectedFileContent } from "../core/content.ts";
import { descriptorOf } from "../core/nodes/registry.ts";
import type { FlowspaceDocument } from "../types.ts";

type FileSelection = { path: string; cwd?: string; nodes: Set<string> };
type Subscription = { nodes: Set<string>; close?: () => Promise<void> };

function fileSelections(doc: FlowspaceDocument): FileSelection[] {
  const nodes = new Map(doc.nodes.map(node => [node.id, node]));
  const sources = new Set(doc.edges.flatMap(edge => {
    if (edge.kind !== "reference" || edge.generatedBy || edge.snapshotContent || edge.snapshotText) return [];
    const source = nodes.get(edge.source), target = nodes.get(edge.target);
    return source?.kind === "file" && !source.generatedBy && target && !target.generatedBy &&
      descriptorOf(target.flowType)?.family === "data" && connectionPort(target, "reference", "in", edge.targetPort)?.dataType === "text"
      ? [source] : [];
  }));
  const paths = new Map<string, FileSelection>();
  for (const source of sources) {
    const cwd = source.worktreePath ?? source.cwd;
    for (const item of selectedFileContent(source, doc.settings.listLimit ?? DEFAULT_LIST_LIMIT).items!) {
      const path = item.key, key = JSON.stringify([cwd, path]);
      const entry = paths.get(key);
      if (entry) entry.nodes.add(source.id);
      else paths.set(key, { path, cwd, nodes: new Set([source.id]) });
    }
  }
  return [...paths.values()];
}

/** Observes configured static text inputs. Each provider target has one native watch, shared by file nodes. */
export class DataFileWatch {
  private watches = new Map<string, Subscription>();
  private dirty = new Set<string>();
  private init?: AbortController;
  private pending = Promise.resolve();
  private signature?: string;
  private flushQueued = false;
  private disposed = false;

  constructor(private fs: Pick<Context["fs"], "watch">,
    private checkedTarget: (path: string, cwd: string | undefined, signal: AbortSignal) => Promise<FsTarget>,
    private changed: (fileNodeIds: string[]) => void) {}

  sync(doc: FlowspaceDocument): Promise<void> {
    if (this.disposed) return this.pending;
    const selected = fileSelections(doc);
    const signature = JSON.stringify(selected.map(entry => [entry.cwd, entry.path, [...entry.nodes]]));
    if (signature === this.signature) return this.pending;
    this.signature = signature;
    this.init?.abort();
    const init = this.init = new AbortController();
    this.pending = this.pending.then(() => this.reconcile(selected, init.signal)).finally(() => {
      if (this.init !== init) return;
      this.init = undefined;
      this.flush();
    });
    return this.pending;
  }

  private async reconcile(selected: FileSelection[], signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    const resolved = await Promise.allSettled(selected.map(async entry => this.checkedTarget(entry.path, entry.cwd, signal)));
    if (signal.aborted) return;
    const targets = new Map<string, { target: FsTarget; nodes: Set<string> }>();
    for (const [index, result] of resolved.entries()) {
      if (result.status === "rejected") continue;
      const target = result.value, owners = selected[index].nodes;
      const existing = targets.get(target.targetKey);
      if (existing) owners.forEach(id => existing.nodes.add(id));
      else targets.set(target.targetKey, { target, nodes: owners });
    }
    const closing: Promise<void>[] = [];
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
      const subscription: Subscription = { nodes };
      this.watches.set(key, subscription);
      try {
        const close = await this.fs.watch(target, error => {
          if (error || this.disposed || this.watches.get(key) !== subscription) return;
          this.dirty.add(key);
          this.flush();
        }, signal);
        if (signal.aborted) {
          this.watches.delete(key);
          await close();
        } else subscription.close = close;
      } catch {
        // Watching is optional in rc.3. Explicit reads remain available on these providers.
        this.watches.delete(key);
      }
    }));
  }

  private flush(): void {
    if (this.disposed || this.init || this.flushQueued || !this.dirty.size) return;
    this.flushQueued = true;
    queueMicrotask(() => {
      this.flushQueued = false;
      if (this.disposed || this.init) return;
      const ids = new Set<string>();
      for (const key of this.dirty) this.watches.get(key)?.nodes.forEach(id => ids.add(id));
      this.dirty.clear();
      if (ids.size) this.changed([...ids]);
    });
  }

  dispose(): Promise<void> {
    if (this.disposed) return this.pending;
    this.disposed = true;
    this.init?.abort();
    this.pending = this.pending.then(async () => {
      const watchers = [...this.watches.values()];
      this.watches.clear();
      this.dirty.clear();
      await Promise.allSettled(watchers.map(async subscription => subscription.close?.()));
    });
    return this.pending;
  }
}
