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
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const root = resolve(import.meta.dirname, "..");
export const defaultPackageDir = resolve(root, "packages/flowspace");
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
  return { home, profile, workspace };
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
