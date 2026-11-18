import { execFile as execFileCb } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { promisify } from "node:util";
import type {
  DiffHunkView,
  GitActionRequest,
  GitBranchInfo,
  GitCommitInfo,
  GitDiffRequest,
  GitDiffResult,
  GitFileChange,
  GitRepoStatus,
  GitWorktreeInfo,
} from "../types.ts";

const execFile = promisify(execFileCb);

const SENSITIVE_ENV_KEY_RE =
  /(?:^dsh_|api[_-]?key|secret|token|password|passwd|credential|private[_-]?key|auth[_-]?header)/i;

/**
 * Scrub credential-shaped and DSH_* variables before spawning git (and repository git hooks),
 * matching @deepseek-ai/dsh-subprocess's case-insensitive scrub policy.
 */
export function sanitizedGitEnv(
  write = false,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(baseEnv)) {
    if (v === undefined) continue;
    if (SENSITIVE_ENV_KEY_RE.test(k)) continue;
    clean[k] = v;
  }
  clean.GIT_TERMINAL_PROMPT = "0";
  if (!write) clean.GIT_OPTIONAL_LOCKS = "0";
  return clean;
}

function normPath(p: string): string {
  const resolved = resolve(p).replaceAll("\\", "/").replace(/\/+$/, "");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function sameFsPath(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return normPath(a) === normPath(b);
}

export function isSubPath(root: string, target: string): boolean {
  const r = resolve(root);
  const t = resolve(target);
  const rel = relative(r, t);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function parseUnifiedDiff(raw: string): DiffHunkView[] {
  const hunks: DiffHunkView[] = [];
  const lines = raw.split(/\r?\n/);
  let current: DiffHunkView | null = null;
  const headerRe = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;
  for (const line of lines) {
    const m = headerRe.exec(line);
    if (m) {
      current = {
        oldStart: Number(m[1]),
        oldLines: m[2] === undefined ? 1 : Number(m[2]),
        newStart: Number(m[3]),
        newLines: m[4] === undefined ? 1 : Number(m[4]),
        lines: m[5]?.trim() ? [` ${m[5].trim()}`] : [],
      };
      hunks.push(current);
      continue;
    }
    if (!current) continue;
    if (
      line.startsWith("+") ||
      line.startsWith("-") ||
      line.startsWith(" ")
    ) {
      current.lines.push(line);
    }
  }
  return hunks;
}

interface GitExecOptions {
  cwd: string;
  write?: boolean;
  allowNonZero?: boolean;
  timeoutMs?: number;
}

/**
 * Host Git service migrated from OMP Studio's git-service architecture:
 * - Scrubbed child environment (no leaked API keys / DSH_* vars to git hooks)
 * - Per-repository commonDir write serialization queue + expectedRevision check
 * - Supplies both 4-tier Project -> Branch -> Worktree structure & Git node workbench
 */
export class HostGitService {
  private queues = new Map<string, Promise<unknown>>();

  private async runGit(
    args: string[],
    opts: GitExecOptions,
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    const env = sanitizedGitEnv(Boolean(opts.write));
    try {
      const { stdout, stderr } = await execFile("git", args, {
        cwd: opts.cwd,
        env,
        timeout: opts.timeoutMs ?? 20_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      });
      return { stdout, stderr, code: 0 };
    } catch (err: unknown) {
      const e = err as {
        stdout?: string;
        stderr?: string;
        code?: number | string;
        message?: string;
      };
      if (opts.allowNonZero && typeof e.stdout === "string") {
        return {
          stdout: e.stdout,
          stderr: e.stderr ?? "",
          code: typeof e.code === "number" ? e.code : 1,
        };
      }
      const detail = (e.stderr || e.message || String(err)).trim();
      throw new Error(detail || `git ${args[0]} 执行失败`);
    }
  }

  private enqueueWrite<T>(
    repoKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const prev = this.queues.get(repoKey) ?? Promise.resolve();
    const next = prev.then(fn);
    this.queues.set(
      repoKey,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  async inspect(cwd: string): Promise<GitRepoStatus> {
    const targetCwd = resolve(cwd);
    const revRes = await this.runGit(
      ["rev-parse", "--show-toplevel", "--git-common-dir", "HEAD"],
      { cwd: targetCwd, allowNonZero: true },
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
        commits: [],
      };
    }

    const topRes = await this.runGit(
      ["rev-parse", "--show-toplevel", "--git-common-dir"],
      { cwd: targetCwd, allowNonZero: true },
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
        commits: [],
      };
    }
    const [rawTop, rawCommon] = topRes.stdout.trim().split(/\r?\n/);
    const topLevel = resolve(targetCwd, rawTop.trim());
    const commonDir = resolve(targetCwd, (rawCommon ?? ".git").trim());

    const [statusRes, wtRes, branchRes, logRes] = await Promise.all([
      this.runGit(["status", "--porcelain=v1", "-b"], {
        cwd: topLevel,
        allowNonZero: true,
      }),
      this.runGit(["worktree", "list", "--porcelain"], {
        cwd: topLevel,
        allowNonZero: true,
      }),
      this.runGit(
        [
          "for-each-ref",
          "--format=%(HEAD)\t%(refname:short)\t%(upstream:short)\t%(upstream:track)\t%(objectname:short)",
          "refs/heads",
        ],
        { cwd: topLevel, allowNonZero: true },
      ),
      this.runGit(
        [
          "log",
          "-n",
          "30",
          "--date=relative",
          "--format=%H%x09%h%x09%P%x09%an%x09%ar%x09%ct%x09%D%x09%s",
        ],
        { cwd: topLevel, allowNonZero: true },
      ),
    ]);

    let branch = "HEAD";
    let detached = false;
    let upstream: string | undefined;
    let ahead = 0;
    let behind = 0;
    const staged: GitFileChange[] = [];
    const unstaged: GitFileChange[] = [];

    const statusLines = statusRes.stdout.split(/\r?\n/).filter(Boolean);
    for (const line of statusLines) {
      if (line.startsWith("## ")) {
        const headInfo = line.slice(3).trim();
        if (
          headInfo.startsWith("HEAD (no branch)") ||
          headInfo.includes("detached")
        ) {
          detached = true;
          branch = "HEAD";
        } else {
          const trackMatch = /^(.*?)(?:\.\.\.([^\s[]+))?(?:\s+\[(.*)\])?$/.exec(
            headInfo,
          );
          if (trackMatch) {
            branch = trackMatch[1]
              .replace(/^No commits yet on /, "")
              .replace(/^Initial commit on /, "")
              .trim();
            upstream = trackMatch[2]?.trim() || undefined;
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
      let origPath: string | undefined;
      if (rest.includes(" -> ")) {
        const parts = rest.split(" -> ");
        origPath = parts[0];
        path = parts[1];
      }
      if (x === "?" && y === "?") {
        unstaged.push({ path, status: "?", staged: false });
        continue;
      }
      const toStatus = (ch: string): GitFileChange["status"] =>
        ch === "A"
          ? "A"
          : ch === "D"
            ? "D"
            : ch === "R"
              ? "R"
              : ch === "U"
                ? "U"
                : "M";
      if (x !== " " && x !== "?") {
        staged.push({ path, origPath, status: toStatus(x), staged: true });
      }
      if (y !== " " && y !== "?") {
        unstaged.push({ path, origPath, status: toStatus(y), staged: false });
      }
    }

    const worktrees = parsePorcelainWorktrees(wtRes.stdout);
    const wtByBranch = new Map<string, string>();
    for (const wt of worktrees) {
      if (wt.branch) wtByBranch.set(wt.branch, wt.path);
    }

    const branches: GitBranchInfo[] = branchRes.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [headMark, name, up, track, oid] = line.split("\t");
        const a = /ahead\s+(\d+)/.exec(track ?? "");
        const b = /behind\s+(\d+)/.exec(track ?? "");
        return {
          name: name ?? "",
          current: headMark === "*" || name === branch,
          upstream: up || undefined,
          ahead: a ? Number(a[1]) : 0,
          behind: b ? Number(b[1]) : 0,
          commitOid: oid ?? "",
          worktreePath: name ? wtByBranch.get(name) : undefined,
        };
      })
      .filter((b) => Boolean(b.name));

    if (branch && !detached && !branches.some((b) => b.name === branch)) {
      branches.unshift({
        name: branch,
        current: true,
        ahead,
        behind,
        commitOid: "",
        worktreePath: topLevel,
      });
    }

    const commits: GitCommitInfo[] =
      logRes.code === 0
        ? logRes.stdout
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
              const [
                oid = "",
                shortOid = "",
                parentsRaw = "",
                author = "",
                relativeTime = "",
                ts = "0",
                refsRaw = "",
                ...subjectParts
              ] = line.split("\t");
              return {
                oid,
                shortOid,
                parents: parentsRaw.split(" ").filter(Boolean),
                author,
                relativeTime,
                timestamp: Number(ts) * 1000,
                refs: refsRaw
                  .split(",")
                  .map((r) => r.trim())
                  .filter(Boolean),
                subject: subjectParts.join("\t"),
              };
            })
        : [];

    const revision = createHash("sha1")
      .update(
        JSON.stringify({
          topLevel,
          branch,
          head: commits[0]?.oid ?? "",
          status: statusRes.stdout,
          wtCount: worktrees.length,
        }),
      )
      .digest("hex")
      .slice(0, 16);

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
      commits,
    };
  }

  async diff(cwd: string, req: GitDiffRequest): Promise<GitDiffResult> {
    const targetCwd = resolve(cwd);
    let args: string[];
    let title: string;
    if (req.target === "commit" && req.commitOid) {
      args = ["show", "--format=medium", "--patch", req.commitOid];
      if (req.path) args.push("--", req.path);
      title = `Commit ${req.commitOid.slice(0, 7)}${req.path ? ` · ${req.path}` : ""}`;
    } else if (req.target === "staged") {
      args = ["diff", "--cached"];
      if (req.path) args.push("--", req.path);
      title = `Staged${req.path ? ` · ${req.path}` : ""}`;
    } else if (req.target === "all") {
      args = ["diff", "HEAD"];
      if (req.path) args.push("--", req.path);
      title = `HEAD Diff${req.path ? ` · ${req.path}` : ""}`;
    } else {
      args = ["diff"];
      if (req.path) args.push("--", req.path);
      title = `Working${req.path ? ` · ${req.path}` : ""}`;
    }

    const res = await this.runGit(args, {
      cwd: targetCwd,
      allowNonZero: true,
    });
    const raw = res.stdout;
    const maxLen = 96_000;
    const truncated = raw.length > maxLen;
    const text = truncated ? raw.slice(0, maxLen) : raw;
    return {
      title,
      text,
      hunks: parseUnifiedDiff(text),
      truncated,
    };
  }

  async act(cwd: string, req: GitActionRequest): Promise<GitRepoStatus> {
    const targetCwd = resolve(cwd);
    const initial = await this.inspect(targetCwd);

    if (req.action === "init") {
      if (initial.isGitRepo && initial.topLevel) {
        return initial;
      }
      return this.enqueueWrite(normPath(targetCwd), async () => {
        await mkdir(targetCwd, { recursive: true });
        const initBranch = req.branch?.trim()
          ? sanitizeBranchName(req.branch)
          : "main";
        const res = await this.runGit(["init", "-b", initBranch], {
          cwd: targetCwd,
          write: true,
          allowNonZero: true,
        });
        if (res.code !== 0) {
          await this.runGit(["init"], { cwd: targetCwd, write: true });
        }
        return this.inspect(targetCwd);
      });
    }

    if (!initial.isGitRepo || !initial.topLevel || !initial.commonDir) {
      throw new Error("当前目录不是 Git 仓库");
    }
    // `worktreeRoot` is the exact worktree containing `cwd`; `commonDir` serializes shared repo writes.
    const worktreeRoot = initial.topLevel;
    const mainWorktreeRoot =
      initial.worktrees.find((w) => w.isMain)?.path ?? worktreeRoot;
    const repoKey = normPath(initial.commonDir);

    return this.enqueueWrite(repoKey, async () => {
      const fresh = await this.inspect(worktreeRoot);
      if (req.expectedRevision && fresh.revision !== req.expectedRevision) {
        throw new Error("Git 仓库状态已变化，请刷新后再执行操作");
      }

      const cleanPaths = (req.paths ?? [])
        .map((p) => p.trim())
        .filter((p) => p && !p.startsWith("-"));

      switch (req.action) {
        case "stage": {
          if (!cleanPaths.length) throw new Error("未指定要暂存的文件");
          await this.runGit(["add", "--", ...cleanPaths], {
            cwd: worktreeRoot,
            write: true,
          });
          break;
        }
        case "unstage": {
          if (!cleanPaths.length) throw new Error("未指定要取消暂存的文件");
          await this.runGit(["reset", "HEAD", "--", ...cleanPaths], {
            cwd: worktreeRoot,
            write: true,
            allowNonZero: true,
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
            allowNonZero: true,
          });
          break;
        }
        case "discard": {
          if (!cleanPaths.length) throw new Error("未指定要放弃修改的文件");
          const untrackedSet = new Set(
            fresh.unstaged
              .filter((f) => f.status === "?")
              .map((f) => f.path),
          );
          const untrackedPaths = cleanPaths.filter((p) => untrackedSet.has(p));
          const trackedPaths = cleanPaths.filter((p) => !untrackedSet.has(p));
          if (trackedPaths.length) {
            await this.runGit(["checkout", "--", ...trackedPaths], {
              cwd: worktreeRoot,
              write: true,
            });
          }
          if (untrackedPaths.length) {
            await this.runGit(["clean", "-fd", "--", ...untrackedPaths], {
              cwd: worktreeRoot,
              write: true,
            });
          }
          break;
        }
        case "commit": {
          const msg = (req.message ?? "").trim();
          if (!msg) throw new Error("提交说明不能为空");
          await this.runGit(["commit", "-m", msg], {
            cwd: worktreeRoot,
            write: true,
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
            write: true,
          });
          break;
        }
        case "fetch": {
          await this.runGit(["fetch", "--all", "--prune"], {
            cwd: worktreeRoot,
            write: true,
            timeoutMs: 45_000,
          });
          break;
        }
        case "pull": {
          await this.runGit(["pull", "--ff-only"], {
            cwd: worktreeRoot,
            write: true,
            timeoutMs: 45_000,
          });
          break;
        }
        case "push": {
          await this.runGit(["push"], {
            cwd: worktreeRoot,
            write: true,
            timeoutMs: 45_000,
          });
          break;
        }
        case "createWorktree": {
          const branch = sanitizeBranchName(req.branch);
          const slug = branch.replace(/[^a-zA-Z0-9._-]+/g, "-");
          const defaultWtRoot = join(
            dirname(mainWorktreeRoot),
            `${basename(mainWorktreeRoot)}-worktrees`,
          );
          const wtPath = req.worktreePath?.trim()
            ? resolve(worktreeRoot, req.worktreePath.trim())
            : join(defaultWtRoot, slug);
          await mkdir(dirname(wtPath), { recursive: true });
          const existsBranch = fresh.branches.some((b) => b.name === branch);
          const args = existsBranch
            ? ["worktree", "add", wtPath, branch]
            : [
                "worktree",
                "add",
                "-b",
                branch,
                wtPath,
                ...(req.baseRef?.trim() ? [req.baseRef.trim()] : []),
              ];
          await this.runGit(args, { cwd: worktreeRoot, write: true });
          break;
        }
        case "removeWorktree": {
          const target = req.worktreePath?.trim();
          if (!target) throw new Error("未指定要移除的 worktree 路径");
          const resolvedWt = resolve(worktreeRoot, target);
          if (sameFsPath(resolvedWt, mainWorktreeRoot)) {
            throw new Error("不能移除主工作树目录");
          }
          await this.runGit(["worktree", "remove", resolvedWt], {
            cwd: mainWorktreeRoot,
            write: true,
          });
          break;
        }
      }

      return this.inspect(worktreeRoot);
    });
  }
}

function sanitizeBranchName(raw?: string): string {
  const trimmed = (raw ?? "").trim();
  if (
    !trimmed ||
    trimmed.startsWith("-") ||
    /\s|~|\^|:|\?|\*|\[|\\/.test(trimmed)
  ) {
    throw new Error("无效的分支名称");
  }
  return trimmed;
}

function parsePorcelainWorktrees(stdout: string): GitWorktreeInfo[] {
  const blocks = stdout
    .trim()
    .split(/\r?\n\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block, index) => {
    let path = "";
    let head = "";
    let branch: string | undefined;
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
      isMain: index === 0,
    };
  });
}
