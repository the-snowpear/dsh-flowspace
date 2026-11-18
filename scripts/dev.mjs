import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { resolve, relative } from "node:path";

// Ensure Node internal ESM cache hooks are available so DSH native Host HMR
// (`ctx.hmr.reconcileProfile()`) can hot-replace ESM plugin modules in memory
// without restarting the process.
if (
  !process.execArgv.includes("--expose-internals") &&
  process.env.FLOWSPACE_NO_REEXEC !== "1"
) {
  const child = spawn(
    process.execPath,
    ["--expose-internals", ...process.execArgv, ...process.argv.slice(1)],
    {
      env: { ...process.env, FLOWSPACE_NO_REEXEC: "1" },
      stdio: "inherit",
      windowsHide: true,
    },
  );
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      if (!child.killed) child.kill(sig);
    });
  }
  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} else {
  await runDevServer();
}

function readFlagValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  const prefixed = args.find((a) => a.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

function formatError(err) {
  if (err && typeof err === "object" && Array.isArray(err.errors) && err.errors.length) {
    return err.errors
      .map((e) => {
        const loc = e.location
          ? `${e.location.file}:${e.location.line}:${e.location.column}: `
          : "";
        return `${loc}${e.text}`;
      })
      .join("\n  ");
  }
  return err instanceof Error ? err.message : String(err);
}

function timestamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

async function runDevServer() {
  const { boot, listSandboxPlugins, root } = await import("./environment.mjs");
  const { createIncrementalBuilder, pkg } = await import("./compiler.mjs");

  const argv = process.argv.slice(2);
  const mock = argv.includes("--mock");
  const noWatch = argv.includes("--no-watch");
  const syncCredentials = !argv.includes("--no-sync-auth");
  const explicitPort = readFlagValue(argv, "--port") ?? process.env.PORT;
  const port = Number(explicitPort) || (mock ? 3191 : 3190);
  const explicitSandbox =
    readFlagValue(argv, "--sandbox") ?? process.env.FLOWSPACE_SANDBOX;

  const profileKey =
    explicitSandbox ||
    (port !== 3191 && port !== 3190
      ? `${mock ? "flowspace-mock" : "flowspace"}-${port}`
      : mock
        ? "flowspace-mock"
        : "flowspace");

  const builder = await createIncrementalBuilder({ dev: true });
  const initial = await builder.initialBuild({ checkContracts: true });
  console.log(
    `[${timestamp()}] [Build] Initial incremental build ready in ${initial.durationMs}ms`,
  );

  const result = await boot({
    name: profileKey,
    mock,
    port,
    syncCredentials,
  });

  const sandboxInfo = await listSandboxPlugins(result.profile);
  const extraBundles = sandboxInfo.bundles.filter(
    (b) =>
      b !== "@deepseek-ai/dsh-base" &&
      b !== "@deepseek-ai/dsh-web-app" &&
      b !== "dsh-flowspace",
  );

  console.log(
    [
      "",
      `FlowSpace isolated DSH dev server ready (${mock ? "simulated model" : "real model"}):`,
      `  Preview URL  : http://127.0.0.1:${port}`,
      `  Sandbox Home : ${result.home}`,
      `  Workspace    : ${result.workspace}`,
      `  Extra Plugins: ${extraBundles.length ? extraBundles.join(", ") : "(none — use `pnpm sandbox:plugin` to add)"}`,
      `  Live HMR     : ${noWatch ? "disabled (--no-watch)" : "watching packages/flowspace/src (Client + Host + RPC)"}`,
      "",
    ].join("\n"),
  );

  let shuttingDown = false;
  const cleanShutdown = async (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    await builder.dispose();
    await result.shutdown.shutdown(code);
  };

  process.on("SIGINT", () => {
    void cleanShutdown(0);
  });
  process.on("SIGTERM", () => {
    void cleanShutdown(0);
  });

  if (noWatch) return;

  const srcDir = resolve(pkg, "src");
  const patchFile = resolve(pkg, "cordis.patch.yml");
  const dirtyPaths = new Set();
  let debounceTimer;
  let runningBuild = null;

  const reconcileHost = async () => {
    if (!result.ctx.hmr) {
      console.warn(
        `[${timestamp()}] [HMR] Warning: ctx.hmr is unavailable; restart required for Host changes.`,
      );
      return;
    }
    const outcome = await result.ctx.hmr.runExclusive(() =>
      result.ctx.hmr.reconcileProfile(),
    );
    if (outcome?.restartReason) {
      console.warn(
        `[${timestamp()}] [HMR] Restart required: ${outcome.restartReason}`,
      );
    }
    if (outcome?.pending?.length) {
      console.warn(
        `[${timestamp()}] [HMR] Pending modules require restart:`,
        outcome.pending,
      );
    }
  };

  const flushChanges = async () => {
    while (dirtyPaths.size > 0 && !shuttingDown) {
      const batch = [...dirtyPaths];
      dirtyPaths.clear();

      let touchedClient = false;
      let touchedCore = false;
      let touchedHost = false;
      let touchedContracts = false;
      let touchedPatch = false;
      let touchedExternalPlugin = false;

      for (const fullPath of batch) {
        if (fullPath === patchFile) {
          touchedPatch = true;
          continue;
        }
        const rel = relative(srcDir, fullPath).replaceAll("\\", "/");
        if (rel.startsWith("..")) {
          touchedExternalPlugin = true;
          continue;
        }
        if (rel.startsWith("client/")) {
          touchedClient = true;
        } else if (rel.startsWith("core/")) {
          touchedCore = true;
        } else if (rel === "types.ts" || rel === "index.ts") {
          touchedHost = true;
          touchedContracts = true;
        } else {
          touchedHost = true;
        }
      }

      try {
        if (
          touchedClient &&
          !touchedCore &&
          !touchedHost &&
          !touchedContracts &&
          !touchedPatch &&
          !touchedExternalPlugin
        ) {
          const out = await builder.rebuildClient();
          if (out.changed) {
            result.ctx.clientModules.rebuilt("dsh-flowspace");
            console.log(
              `[${timestamp()}] [HMR] Client bundle rebuilt in ${out.durationMs}ms -> live reloaded`,
            );
          }
          continue;
        }

        if (touchedCore || touchedHost || touchedContracts) {
          const out = await builder.rebuildHost({
            checkContracts: touchedContracts,
            alsoClient: touchedClient || touchedCore,
          });
          if (out.hostChanged) {
            const hmrStart = performance.now();
            await reconcileHost();
            const hmrMs = Math.round(performance.now() - hmrStart);
            console.log(
              `[${timestamp()}] [HMR] Host service hot-reloaded (build ${out.durationMs}ms, hmr ${hmrMs}ms${out.typertChanged ? ", RPC updated" : ""})`,
            );
          }
          if (out.clientChanged) {
            result.ctx.clientModules.rebuilt("dsh-flowspace");
            console.log(
              `[${timestamp()}] [HMR] Client bundle live reloaded`,
            );
          }
        } else if (touchedPatch || touchedExternalPlugin) {
          const hmrStart = performance.now();
          await reconcileHost();
          const hmrMs = Math.round(performance.now() - hmrStart);
          console.log(
            `[${timestamp()}] [HMR] Profile / linked plugin reconciled in ${hmrMs}ms`,
          );
        }
      } catch (err) {
        console.error(
          `[${timestamp()}] [HMR] Rebuild failed (waiting for next save):\n  ${formatError(err)}`,
        );
      }
    }
  };

  const scheduleFlush = (changedFile) => {
    if (shuttingDown) return;
    dirtyPaths.add(changedFile);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!runningBuild) {
        runningBuild = flushChanges().finally(() => {
          runningBuild = null;
          if (dirtyPaths.size > 0) scheduleFlush([...dirtyPaths][0]);
        });
      }
    }, 60);
  };

  const watchers = [];

  watchers.push(
    watch(srcDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      const norm = String(filename).replaceAll("\\", "/");
      if (norm.endsWith("~") || norm.endsWith(".tmp") || norm.startsWith(".")) {
        return;
      }
      scheduleFlush(resolve(srcDir, String(filename)));
    }),
  );

  try {
    watchers.push(
      watch(patchFile, () => {
        scheduleFlush(patchFile);
      }),
    );
  } catch {}

  // Also watch any additional linked local test plugins inside the isolated sandbox
  for (const linked of sandboxInfo.linked) {
    if (linked.name === "dsh-flowspace") continue;
    try {
      watchers.push(
        watch(linked.realPath, { recursive: true }, (_event, filename) => {
          if (!filename) return;
          const norm = String(filename).replaceAll("\\", "/");
          if (
            norm.startsWith("node_modules/") ||
            norm.startsWith(".git/") ||
            norm.endsWith(".map")
          ) {
            return;
          }
          if (norm.startsWith("lib/") || norm === "cordis.patch.yml" || norm === "package.json") {
            scheduleFlush(resolve(linked.realPath, String(filename)));
          }
        }),
      );
    } catch {}
  }

  result.ctx.effect(() => () => {
    clearTimeout(debounceTimer);
    for (const w of watchers) {
      try {
        w.close();
      } catch {}
    }
  });
}
