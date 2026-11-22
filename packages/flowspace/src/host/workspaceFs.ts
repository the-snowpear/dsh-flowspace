import { open, readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import type { Context } from "@deepseek-ai/cordis";
import type { FsTarget } from "@deepseek-ai/dsh-fs";
import type {} from "@deepseek-ai/dsh-workspace";
import type {
  FilePreviewRequest,
  WorkspaceFilePreview,
  WorkspaceFilesRequest,
} from "../types.ts";
import { MAX_INLINE_CONTEXT_BYTES } from "./content.ts";
import { isSubPath } from "./git.ts";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".local",
  ".backups",
  "dist",
  "lib",
  ".next",
  "coverage",
]);

/**
 * Unified workspace confinement and file-access boundary shared across Host RPCs,
 * container tools, triggers, file watchers, and data-node preview/execution.
 */
export class WorkspaceFs {
  readonly knownWorktrees = new Set<string>();

  constructor(private readonly ctx: Context) {}

  trackWorktree(path: string | undefined): void {
    if (path) this.knownWorktrees.add(resolve(path));
  }

  /**
   * Confine `cwd` strictly to registered DSH workspaces, `<repo>-worktrees/*` managed directories,
   * or verified Git worktrees discovered from those workspaces.
   */
  resolveWorkspaceRoot(cwd?: string): string {
    const list = this.ctx.workspaceRegistry.list();
    if (cwd) {
      const candidate = resolve(cwd);
      const inRegisteredWorkspace = list.some((w) => isSubPath(w.path, candidate));
      const inManagedWorktreesDir = list.some((w) =>
        isSubPath(
          resolve(w.path, "..", `${basename(w.path)}-worktrees`),
          candidate,
        ),
      );
      const inVerifiedWorktree = [...this.knownWorktrees].some((wt) =>
        isSubPath(wt, candidate),
      );
      if (
        inRegisteredWorkspace ||
        inManagedWorktreesDir ||
        inVerifiedWorktree ||
        isSubPath(resolve(process.cwd()), candidate)
      ) {
        return candidate;
      }
    }
    return resolve(list[0]?.path ?? process.cwd());
  }

  workspacePath(request: FilePreviewRequest): {
    base: string;
    raw: string;
    full: string;
    rel: string;
  } {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const raw = request.path.trim();
    if (!raw) throw new Error("未指定文件路径");
    const full = resolve(base, raw);
    const rel = relative(base, full);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error("文件路径超出当前工作区");
    }
    return { base, raw, full, rel };
  }

  async workspaceFile(request: FilePreviewRequest) {
    const { base, raw, full, rel } = this.workspacePath(request);
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) throw new Error(`文件不存在：${raw}`);
    if (!isSubPath(await realpath(base), await realpath(full))) {
      throw new Error("文件路径超出当前工作区");
    }
    return { full, rel, info, raw };
  }

  async checkedTarget(
    path: string,
    cwd: string | undefined,
    signal?: AbortSignal,
  ): Promise<FsTarget> {
    const { base, full } = this.workspacePath({ path, cwd });
    const root = await this.ctx.fs.resolve(base, { signal });
    const target = await this.ctx.fs.resolve(full, { signal });
    if (!this.ctx.fs.contains(root, target)) {
      throw new Error("文件路径超出当前工作区");
    }
    return target;
  }

  async checkedWatchTarget(
    path: string,
    cwd: string | undefined,
    signal?: AbortSignal,
  ): Promise<FsTarget> {
    const { base, full } = this.workspacePath({ path, cwd });
    const physical = await realpath(full).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return realpath(dirname(full));
    });
    if (!isSubPath(await realpath(base), physical)) {
      throw new Error("文件路径超出当前工作区");
    }
    return this.ctx.fs.resolve(full, { signal });
  }

  async readFullText(
    path: string,
    cwd?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const { full } = await this.workspaceFile({ path, cwd });
    const body = await readFile(full, { signal });
    if (body.includes(0)) throw new Error(`二进制文件不能作为文本输入：${path}`);
    return new TextDecoder().decode(body);
  }

  async readBoundedText(
    request: FilePreviewRequest,
    maxReadBytes = MAX_INLINE_CONTEXT_BYTES,
    maxChars = 24000,
  ): Promise<WorkspaceFilePreview> {
    const { full, rel, info, raw } = await this.workspaceFile(request);
    const toRead = Math.min(info.size, maxReadBytes);
    if (toRead === 0) {
      return {
        path: rel.replaceAll("\\", "/"),
        content: "",
        truncated: false,
      };
    }

    const fh = await open(full, "r");
    try {
      const buf = Buffer.allocUnsafe(toRead);
      const { bytesRead } = await fh.read(buf, 0, toRead, 0);
      const slice = buf.subarray(0, bytesRead);
      if (slice.includes(0)) {
        throw new Error(`二进制文件不支持文本预览：${raw}`);
      }
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      const truncated = bytesRead < info.size || decoded.length > maxChars;
      return {
        path: rel.replaceAll("\\", "/"),
        content: decoded.length > maxChars ? decoded.slice(0, maxChars) : decoded,
        truncated,
      };
    } finally {
      await fh.close();
    }
  }

  async listFiles(request: WorkspaceFilesRequest): Promise<string[]> {
    const base = this.resolveWorkspaceRoot(request.cwd);
    const out: string[] = [];
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > 3 || out.length >= 80) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (out.length >= 80) break;
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) await walk(full, depth + 1);
        else if (entry.isFile()) {
          out.push(relative(base, full).replaceAll("\\", "/"));
        }
      }
    };
    await walk(base, 0);
    return out;
  }
}
