import { access, mkdir, copyFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import {
  root,
  dshCliEntry,
  prepare,
  ensureFlowspaceLink,
  resolveSandboxPaths,
  listSandboxPlugins,
  syncGlobalCredentials,
} from "./environment.mjs";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function parseSandboxFlags(rawArgs) {
  const rest = [];
  let sandboxName = process.env.FLOWSPACE_SANDBOX || "";
  let mock = false;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--mock" && rest.length <= 1) {
      mock = true;
      continue;
    }
    if (arg === "--sandbox" && i + 1 < rawArgs.length && rest.length <= 1) {
      sandboxName = rawArgs[++i];
      continue;
    }
    if (arg.startsWith("--sandbox=") && rest.length <= 1) {
      sandboxName = arg.slice("--sandbox=".length);
      continue;
    }
    rest.push(arg);
  }

  if (!sandboxName) {
    sandboxName = mock ? "flowspace-mock" : "flowspace";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(sandboxName)) {
    throw new Error(`Invalid sandbox name: ${JSON.stringify(sandboxName)}`);
  }
  return { sandboxName, mock, rest };
}

function runSandboxCli(home, cliArgs) {
  return new Promise((resolveExit, reject) => {
    const env = {
      ...process.env,
      DSH_HOME: home,
      DSH_AGENTS_HOME: join(home, "agents"),
      DSH_TELEMETRY_DISABLED: "1",
    };
    const child = spawn(process.execPath, [dshCliEntry, ...cliArgs], {
      cwd: root,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolveExit(code ?? 1));
  });
}

async function printStatus(sandboxName, mock) {
  const { home, profile, workspace } = resolveSandboxPaths(sandboxName);
  const initialized = await exists(join(profile, "package.json"));
  const hasCreds = await exists(join(home, ".credentials.yaml"));
  const info = initialized
    ? await listSandboxPlugins(profile)
    : { bundles: [], dependencies: {}, linked: [] };

  console.log("=== FlowSpace Isolated DSH Sandbox ===");
  console.log(`Sandbox name : ${sandboxName}${mock ? " (mock)" : ""}`);
  console.log(`DSH_HOME     : ${home}`);
  console.log(`Profile dir  : ${profile}`);
  console.log(`Workspace    : ${workspace}`);
  console.log(`Initialized  : ${initialized ? "yes" : "no (auto-created on first run)"}`);
  console.log(`Credentials  : ${hasCreds ? "present (.credentials.yaml)" : "not configured yet"}`);
  console.log(`Bundles (${info.bundles.length}) :`);
  for (const b of info.bundles) {
    const spec = info.dependencies[b];
    console.log(`  - ${b}${spec ? `  [${spec}]` : "  [built-in]"}`);
  }
  const extraDeps = Object.entries(info.dependencies).filter(
    ([name]) => !info.bundles.includes(name),
  );
  if (extraDeps.length > 0) {
    console.log(`Additional dependencies (${extraDeps.length}) :`);
    for (const [name, spec] of extraDeps) {
      console.log(`  - ${name}  [${spec}]`);
    }
  }
  if (info.linked.length > 0) {
    console.log(`Linked local packages (${info.linked.length}) :`);
    for (const item of info.linked) {
      console.log(`  - ${item.name} -> ${item.realPath}`);
    }
  }
}

function printHelp() {
  console.log(`FlowSpace Isolated DSH Sandbox CLI

All operations run strictly inside .local/<sandbox> and NEVER touch your global ~/.dsh.

Usage:
  pnpm sandbox [status] [--mock] [--sandbox <name>]
      Inspect sandbox paths, installed bundles, linked plugins, and credentials.

  pnpm sandbox:plugin <pnpm/dsh-plugin-args...>
      Manage plugins inside the isolated sandbox profile ("flowspace").
      Examples:
        pnpm sandbox:plugin list
        pnpm sandbox:plugin link D:/path/to/other-local-plugin
        pnpm sandbox:plugin add ./some-plugin-0.1.0.tgz
        pnpm sandbox:plugin add some-dsh-plugin
        pnpm sandbox:plugin remove some-dsh-plugin
        pnpm sandbox:plugin allow-version pkg@1.0.0 --dsh-version 0.2.2-rc.3 --accept-risk

  pnpm sandbox:sync-auth [--force] [--mock] [--sandbox <name>]
      One-way copy ~/.dsh/.credentials.yaml into the isolated sandbox so real
      models work immediately without affecting global ~/.dsh.

  pnpm sandbox:reset [--keep-plugins] [--keep-auth] [--mock] [--sandbox <name>]
      Reset sandbox sessions, canvas storage, and workspace state back to clean
      defaults (backups saved to .backups/).

  pnpm sandbox:dsh <dsh-args...>
      Run any local @deepseek-ai/dsh CLI command against the isolated sandbox.
      Example:
        pnpm sandbox:dsh --profile flowspace --dump-config
`);
}

const { sandboxName, mock, rest } = parseSandboxFlags(process.argv.slice(2));
const [subcommand = "status", ...subArgs] = rest;

if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
  printHelp();
  process.exit(0);
}

if (subcommand === "status") {
  await printStatus(sandboxName, mock);
  process.exit(0);
}

if (subcommand === "init") {
  const env = await prepare(sandboxName, mock);
  console.log(`Initialized isolated sandbox at ${env.home}`);
  await printStatus(sandboxName, mock);
  process.exit(0);
}

if (subcommand === "sync-auth" || subcommand === "sync-credentials") {
  const force = subArgs.includes("--force");
  const env = await prepare(sandboxName, mock);
  const outcome = await syncGlobalCredentials(env.home, { force });
  if (outcome.synced) {
    console.log(`Synced credentials from ${outcome.src} -> ${outcome.dest}`);
  } else if (outcome.reason === "already-exists") {
    console.log(
      `Sandbox credentials already exist at ${outcome.dest} (pass --force to overwrite).`,
    );
  } else {
    console.log(`No global credentials file found at ${outcome.src}.`);
  }
  process.exit(0);
}

if (subcommand === "reset") {
  const keepPlugins = subArgs.includes("--keep-plugins");
  const keepAuth = subArgs.includes("--keep-auth") || !subArgs.includes("--drop-auth");
  const { home, profile } = resolveSandboxPaths(sandboxName);

  if (await exists(home)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = resolve(root, ".backups", `sandbox-reset-${sandboxName}-${stamp}`);
    await mkdir(backupDir, { recursive: true });
    for (const file of [
      join(home, ".credentials.yaml"),
      join(profile, "package.json"),
      join(profile, "cordis.patch.yml"),
      join(home, "storages", "flowspace.json"),
    ]) {
      if (await exists(file)) {
        const name = file.replace(home, "").replace(/^[/\\]+/, "").replaceAll("\\", "__").replaceAll("/", "__");
        await copyFile(file, join(backupDir, name));
      }
    }
    console.log(`Backed up key sandbox files to ${backupDir}`);

    if (keepPlugins) {
      for (const dir of ["sessions", "storages", "agents", "workspace", "office-kit"]) {
        await rm(join(home, dir), { recursive: true, force: true });
      }
      if (!keepAuth) {
        await rm(join(home, ".credentials.yaml"), { force: true });
      }
    } else {
      let savedCreds = null;
      const credsPath = join(home, ".credentials.yaml");
      if (keepAuth && (await exists(credsPath))) {
        const tempCreds = join(backupDir, ".credentials.keep.yaml");
        await copyFile(credsPath, tempCreds);
        savedCreds = tempCreds;
      }
      await rm(home, { recursive: true, force: true });
      await mkdir(home, { recursive: true });
      if (savedCreds) {
        await copyFile(savedCreds, credsPath);
      }
    }
  }

  const env = await prepare(sandboxName, mock);
  console.log(`Sandbox "${sandboxName}" reset cleanly at ${env.home}`);
  await printStatus(sandboxName, mock);
  process.exit(0);
}

if (subcommand === "plugin") {
  const env = await prepare(sandboxName, mock);
  let pluginArgs = subArgs.length > 0 ? [...subArgs] : ["list"];
  if (pluginArgs[0] === "list" || pluginArgs[0] === "ls") {
    await printStatus(sandboxName, mock);
    if (pluginArgs.length === 1) process.exit(0);
  }
  if (pluginArgs[0] === "link") {
    const targets = pluginArgs.slice(1);
    if (targets.length === 0) {
      console.error("Usage: pnpm sandbox:plugin link <path-to-plugin-dir>");
      process.exit(1);
    }
    pluginArgs = [
      "add",
      ...targets.map((t) =>
        t.startsWith("-") || t.startsWith("link:")
          ? t
          : `link:${resolve(process.cwd(), t)}`,
      ),
    ];
  }
  // Protect dsh-flowspace from accidental removal via CLI
  if (
    (pluginArgs[0] === "remove" || pluginArgs[0] === "rm" || pluginArgs[0] === "uninstall") &&
    pluginArgs.includes("dsh-flowspace")
  ) {
    console.error(
      "Refusing to remove dsh-flowspace from its own development sandbox.",
    );
    process.exit(1);
  }
  const code = await runSandboxCli(env.home, [
    "plugin",
    "--profile",
    "flowspace",
    ...pluginArgs,
  ]);
  await ensureFlowspaceLink(env.profile);
  process.exit(code);
}

if (subcommand === "dsh") {
  const env = await prepare(sandboxName, mock);
  const code = await runSandboxCli(env.home, subArgs);
  await ensureFlowspaceLink(env.profile);
  process.exit(code);
}

console.error(`Unknown sandbox command: ${JSON.stringify(subcommand)}\n`);
printHelp();
process.exit(1);
