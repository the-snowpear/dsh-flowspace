import {
  mkdir,
  writeFile,
  readFile,
  access,
  symlink,
  copyFile,
  lstat,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { homedir } from "node:os";
import { createConnection, createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const root = resolve(import.meta.dirname, "..");
export const defaultPackageDir = resolve(root, "packages/flowspace");
export const museumSandbox = "flowspace-museum";
export const museumPort = 3194;
export const dshCliEntry = createRequire(import.meta.url).resolve(
  "@deepseek-ai/dsh/lib/bin.js",
);

const runtimeRequire = createRequire(
  import.meta.resolve("@deepseek-ai/dsh/package.json"),
);

export const runtimeImport = async (name) =>
  import(pathToFileURL(runtimeRequire.resolve(name)).href);

export function resolveSandboxPaths(name = "flowspace") {
  const home = resolve(root, ".local", name);
  const profile = join(home, "profiles", "flowspace");
  const workspace = join(home, "workspace");
  const runtimeFile = join(home, "runtime.json");
  return { home, profile, workspace, runtimeFile };
}

export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}

export function probePort(port, host = "127.0.0.1", timeoutMs = 450) {
  return new Promise((resolveProbe) => {
    const socket = createConnection({ port: Number(port), host });
    let settled = false;
    const finish = (alive) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveProbe(alive);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export function canBindPort(port, host = "127.0.0.1") {
  return new Promise((resolveBind) => {
    const server = createServer();
    server.once("error", (err) => {
      resolveBind({ ok: false, code: err?.code || "ERROR" });
    });
    server.listen(Number(port), host, () => {
      server.close(() => resolveBind({ ok: true, code: null }));
    });
  });
}

export async function findAvailablePort(
  startPort,
  host = "127.0.0.1",
  maxTries = 100,
) {
  for (let offset = 0; offset < maxTries; offset++) {
    const candidate = Number(startPort) + offset;
    const bindCheck = await canBindPort(candidate, host);
    if (bindCheck.ok) {
      return candidate;
    }
  }
  throw new Error(
    `No bindable port found between ${startPort} and ${Number(startPort) + maxTries - 1}`,
  );
}

export async function readSandboxRuntime(name = "flowspace") {
  const { runtimeFile } = resolveSandboxPaths(name);
  if (!(await exists(runtimeFile))) return null;
  try {
    const data = JSON.parse(await readFile(runtimeFile, "utf8"));
    const pidOk = isPidAlive(data?.pid);
    const portOk = data?.port ? await probePort(data.port) : false;
    if (pidOk && portOk) {
      return data;
    }
    await rm(runtimeFile, { force: true }).catch(() => {});
    return null;
  } catch {
    return null;
  }
}

export async function writeSandboxRuntime(name, payload) {
  const { home, runtimeFile } = resolveSandboxPaths(name);
  await mkdir(home, { recursive: true });
  await writeFile(runtimeFile, JSON.stringify(payload, null, 2) + "\n", {
    mode: 0o600,
  });
}

export async function clearSandboxRuntime(name, expectedPid = process.pid) {
  const { runtimeFile } = resolveSandboxPaths(name);
  try {
    const raw = await readFile(runtimeFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!expectedPid || parsed?.pid === expectedPid) {
      await rm(runtimeFile, { force: true });
    }
  } catch {}
}

export async function openSystemBrowser(url) {
  try {
    const webApp = await runtimeImport("@deepseek-ai/dsh-web-app");
    if (typeof webApp?.internals?.openBrowser === "function") {
      await webApp.internals.openBrowser(url);
      return true;
    }
  } catch {}

  return new Promise((resolveOpen) => {
    const [cmd, args] =
      process.platform === "win32"
        ? [
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              "Start-Process $args[0]",
              url,
            ],
          ]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];

    const child = spawn(cmd, args, {
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", () => resolveOpen(false));
    child.once("close", (code) => resolveOpen(code === 0));
  });
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureFlowspaceLink(
  profile,
  packageDir = defaultPackageDir,
) {
  const manifestPath = join(profile, "package.json");
  const requiredBundles = [
    "@deepseek-ai/dsh-base",
    "@deepseek-ai/dsh-web-app",
    "dsh-flowspace",
  ];
  const linkSpec = `link:${packageDir}`;

  if (!(await exists(manifestPath))) {
    const manifest = {
      name: "flowspace-development-profile",
      private: true,
      dsh: {
        profile: {
          bundles: requiredBundles,
        },
      },
      dependencies: {
        "dsh-flowspace": linkSpec,
      },
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  } else {
    try {
      const raw = await readFile(manifestPath, "utf8");
      const parsed = JSON.parse(raw);
      parsed.name ??= "flowspace-development-profile";
      parsed.private ??= true;
      parsed.dsh ??= {};
      parsed.dsh.profile ??= {};
      const bundles = Array.isArray(parsed.dsh.profile.bundles)
        ? [...parsed.dsh.profile.bundles]
        : [];
      for (const reqBundle of requiredBundles) {
        if (!bundles.includes(reqBundle)) bundles.push(reqBundle);
      }
      parsed.dsh.profile.bundles = bundles;
      parsed.dependencies ??= {};
      if (parsed.dependencies["dsh-flowspace"] !== linkSpec) {
        parsed.dependencies["dsh-flowspace"] = linkSpec;
      }
      const nextRaw = JSON.stringify(parsed, null, 2) + "\n";
      if (nextRaw !== raw) {
        await writeFile(manifestPath, nextRaw);
      }
    } catch {
      // Leave user-edited invalid JSON untouched so DSH reports clear diagnostics.
    }
  }

  const modulesDir = join(profile, "node_modules");
  await mkdir(modulesDir, { recursive: true });
  const linkPath = join(modulesDir, "dsh-flowspace");
  let needsLink = true;
  try {
    const stat = await lstat(linkPath);
    if (stat.isSymbolicLink()) {
      const target = await realpath(linkPath).catch(() => "");
      const expected = await realpath(packageDir).catch(() => packageDir);
      if (target === expected) needsLink = false;
      else await rm(linkPath, { recursive: true, force: true });
    } else {
      needsLink = false;
    }
  } catch {
    needsLink = true;
  }
  if (needsLink) {
    await symlink(packageDir, linkPath, "junction");
  }
}

export async function syncGlobalCredentials(
  home,
  { force = false, sourceHome = join(homedir(), ".dsh") } = {},
) {
  const src = join(sourceHome, ".credentials.yaml");
  const dest = join(home, ".credentials.yaml");
  if (!(await exists(src))) {
    return { synced: false, reason: "missing-source", src, dest };
  }
  if (!force && (await exists(dest))) {
    return { synced: false, reason: "already-exists", src, dest };
  }
  await mkdir(home, { recursive: true });
  if (await exists(dest)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = resolve(root, ".backups", `sandbox-credentials-${stamp}`);
    await mkdir(backupDir, { recursive: true });
    await copyFile(dest, join(backupDir, ".credentials.yaml"));
  }
  await copyFile(src, dest);
  return { synced: true, src, dest };
}

export async function listSandboxPlugins(profile) {
  const manifestPath = join(profile, "package.json");
  if (!(await exists(manifestPath))) return { bundles: [], dependencies: {}, linked: [] };
  const parsed = JSON.parse(await readFile(manifestPath, "utf8"));
  const bundles = parsed?.dsh?.profile?.bundles ?? [];
  const dependencies = parsed?.dependencies ?? {};
  const modulesDir = join(profile, "node_modules");
  const linked = [];
  if (await exists(modulesDir)) {
    for (const entry of await readdir(modulesDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name.startsWith("@")) {
        const scopeDir = join(modulesDir, entry.name);
        for (const child of await readdir(scopeDir, { withFileTypes: true }).catch(() => [])) {
          const full = join(scopeDir, child.name);
          const st = await lstat(full).catch(() => null);
          if (st?.isSymbolicLink()) {
            linked.push({
              name: `${entry.name}/${child.name}`,
              linkPath: full,
              realPath: await realpath(full).catch(() => full),
            });
          }
        }
      } else {
        const full = join(modulesDir, entry.name);
        const st = await lstat(full).catch(() => null);
        if (st?.isSymbolicLink()) {
          linked.push({
            name: entry.name,
            linkPath: full,
            realPath: await realpath(full).catch(() => full),
          });
        }
      }
    }
  }
  return { bundles, dependencies, linked };
}

export async function prepare(
  name = "flowspace",
  mock = false,
  packageDir = defaultPackageDir,
) {
  const { home, profile, workspace } = resolveSandboxPaths(name);
  await mkdir(profile, { recursive: true });
  await mkdir(workspace, { recursive: true });
  await ensureFlowspaceLink(profile, packageDir);

  const overlay = join(profile, mock ? "mock.patch.yml" : "cordis.patch.yml");
  if (!(await exists(join(profile, "cordis.patch.yml")))) {
    await writeFile(join(profile, "cordis.patch.yml"), "[]\n");
  }
  if (mock) {
    await writeFile(
      overlay,
      `- insert:\n    - id: flowspace-test-model\n      name: ${JSON.stringify(resolve(root, "scripts/mock-model.mjs"))}\n- id: agent-default-model\n  config:\n    provider: flowspace-test\n    model: deterministic\n`,
    );
  } else if (!(await exists(overlay))) {
    await writeFile(overlay, "[]\n");
  }

  const fixture = join(workspace, "README.md");
  if (!(await exists(fixture))) {
    await writeFile(
      fixture,
      "# FlowSpace test workspace\n\nA tiny project for validating agent workflows.\n",
    );
  }
  return { home, profile, overlay, workspace };
}

export async function boot({
  name = "flowspace",
  mock = false,
  port = 3190,
  host,
  packageDir,
  syncCredentials = false,
  extraArgs = [],
} = {}) {
  const env = await prepare(name, mock, packageDir);
  if (syncCredentials && !mock) {
    await syncGlobalCredentials(env.home, { force: false });
  }
  process.env.DSH_HOME = env.home;
  process.env.DSH_AGENTS_HOME = join(env.home, "agents");
  process.env.DSH_TELEMETRY_DISABLED = "1";
  process.chdir(env.workspace);
  const { createLaunchEnvironmentSnapshot } = await runtimeImport(
    "@deepseek-ai/dsh-launch-environment",
  );
  const { runProfile } = await import("@deepseek-ai/dsh/profile-boot");
  const args = [
    ...(host ? ["--host", host] : []),
    "--port",
    String(port),
    "--no-open",
    ...extraArgs,
  ];
  const result = await runProfile({
    environment: createLaunchEnvironmentSnapshot([
      {
        source: "process",
        values: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined),
        ),
      },
    ]),
    profile: "flowspace",
    patchFiles: mock ? [env.overlay] : [],
    args,
  });
  return { ...result, ...env };
}
