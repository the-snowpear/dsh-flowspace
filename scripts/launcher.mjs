#!/usr/bin/env node
import { access, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

const root = resolve(import.meta.dirname, "..");

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `${code}${text}${ANSI.reset}` : text);
const bold = (t) => paint(ANSI.bold, t);
const dim = (t) => paint(ANSI.dim, t);
const cyan = (t) => paint(ANSI.cyan, t);
const green = (t) => paint(ANSI.green, t);
const yellow = (t) => paint(ANSI.yellow, t);
const red = (t) => paint(ANSI.red, t);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 9)) {
    console.error(
      red(
        `[错误] 当前 Node.js 版本为 v${process.versions.node}，DSH 0.2.2-rc.3 需要 Node.js >= 24.9.0。`,
      ),
    );
    process.exit(1);
  }
}

function runNodeScript(scriptRelPath, args = [], extraNodeArgs = []) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(
      process.execPath,
      [...extraNodeArgs, resolve(root, scriptRelPath), ...args],
      {
        cwd: root,
        env: process.env,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => resolveExit(code ?? 0));
  });
}

function runPnpm(pnpmArgs) {
  return new Promise((resolveExit, reject) => {
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", "pnpm", ...pnpmArgs], {
            cwd: root,
            env: process.env,
            stdio: "inherit",
            windowsHide: true,
          })
        : spawn("pnpm", pnpmArgs, {
            cwd: root,
            env: process.env,
            stdio: "inherit",
          });
    child.once("error", reject);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
}

async function ensureDependencies() {
  const dshPkg = resolve(root, "node_modules/@deepseek-ai/dsh/package.json");
  if (await exists(dshPkg)) return;
  console.log(yellow("检测到尚未安装项目依赖，正在执行 pnpm install ..."));
  const code = await runPnpm(["install"]);
  if (code !== 0) {
    console.error(red("依赖安装失败，请检查网络或 pnpm 环境后重试。"));
    process.exit(code);
  }
}

function readFlagValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  const prefixed = args.find((a) => a.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

function stripFlags(args, booleanFlags = [], valueFlags = []) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (booleanFlags.includes(a)) continue;
    if (valueFlags.includes(a)) {
      i++;
      continue;
    }
    if (valueFlags.some((vf) => a.startsWith(`${vf}=`))) continue;
    out.push(a);
  }
  return out;
}

async function inspectSandbox(envMod, name, defaultPort) {
  const { home, profile, workspace } = envMod.resolveSandboxPaths(name);
  const initialized = await exists(join(profile, "package.json"));
  const hasCreds = await exists(join(home, ".credentials.yaml"));
  const globalCreds = await exists(join(homedir(), ".dsh", ".credentials.yaml"));
  const runtime = await envMod.readSandboxRuntime(name);
  const portOccupied = await envMod.probePort(runtime?.port ?? defaultPort);
  const info = initialized
    ? await envMod.listSandboxPlugins(profile)
    : { bundles: [], dependencies: {}, linked: [] };
  const extraPlugins = info.bundles.filter(
    (b) =>
      b !== "@deepseek-ai/dsh-base" &&
      b !== "@deepseek-ai/dsh-web-app" &&
      b !== "dsh-flowspace",
  );
  return {
    name,
    defaultPort,
    home,
    profile,
    workspace,
    initialized,
    hasCreds,
    globalCreds,
    runtime,
    portOccupied,
    info,
    extraPlugins,
  };
}

async function stopSandboxInstance(envMod, name) {
  const runtime = await envMod.readSandboxRuntime(name);
  if (!runtime) return { stopped: false, reason: "not-running" };
  try {
    process.kill(runtime.pid, "SIGINT");
  } catch {
    try {
      process.kill(runtime.pid);
    } catch {}
  }
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (!(await envMod.probePort(runtime.port, "127.0.0.1", 200))) {
      break;
    }
  }
  if (envMod.isPidAlive(runtime.pid)) {
    try {
      process.kill(runtime.pid);
    } catch {}
  }
  await envMod.clearSandboxRuntime(name, null);
  return { stopped: true, pid: runtime.pid, port: runtime.port };
}

async function discoverAllRunningSandboxes(envMod) {
  const localRoot = resolve(root, ".local");
  if (!(await exists(localRoot))) return [];
  const entries = await readdir(localRoot, { withFileTypes: true });
  const running = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "build-tools") continue;
    const rt = await envMod.readSandboxRuntime(entry.name);
    if (rt) running.push(rt);
  }
  return running;
}

async function printDashboard(envMod) {
  const [realBox, mockBox, museumBox] = await Promise.all([
    inspectSandbox(envMod, "flowspace", 3190),
    inspectSandbox(envMod, "flowspace-mock", 3191),
    inspectSandbox(envMod, envMod.museumSandbox, envMod.museumPort),
  ]);

  console.log("");
  console.log(
    bold(cyan("╭──────────────────────────────────────────────────────────────╮")),
  );
  console.log(
    bold(cyan("│")) +
      "  " +
      bold("FlowSpace 独立测试 DSH 启动与管理台") +
      dim("  (DSH 0.2.2-rc.3 隔离沙盒)") +
      "  " +
      bold(cyan("│")),
  );
  console.log(
    bold(cyan("╰──────────────────────────────────────────────────────────────╯")),
  );

  const renderBoxLine = (label, box, isMock) => {
    const statusBadge = box.runtime
      ? green(`● 运行中 (PID ${box.runtime.pid} · :${box.runtime.port})`)
      : box.portOccupied
        ? yellow(`▲ 端口 :${box.defaultPort} 已被其他进程占用`)
        : dim(`○ 未启动 (默认 :${box.defaultPort})`);

    const authText = isMock
      ? dim("内置确定性模拟模型 (零 Token 消耗)")
      : box.hasCreds
        ? green("凭据已就绪")
        : box.globalCreds
          ? yellow("首次启动将自动从 ~/.dsh 同步凭据")
          : yellow("未配置凭据 (启动后可在设置页填写)");

    const pluginText = box.extraPlugins.length
      ? cyan(`额外测试插件: ${box.extraPlugins.join(", ")}`)
      : dim("纯净模式 (仅 dsh-flowspace)");

    console.log(`  ${bold(label)}  ${statusBadge}`);
    console.log(`    ├─ 目录: ${dim(box.home)}`);
    console.log(`    ├─ 模型: ${authText}`);
    console.log(`    └─ 插件: ${pluginText}`);
    if (box.runtime?.canvasUrl) {
      console.log(`       ${green("↳ 直达画布:")} ${box.runtime.canvasUrl}`);
    }
  };

  renderBoxLine("[真实模型沙盒]", realBox, false);
  console.log("");
  renderBoxLine("[Mock 测试沙盒]", mockBox, true);
  console.log("");
  renderBoxLine("[博物馆画布]", museumBox, true);
  console.log("");

  return { realBox, mockBox };
}

function printHelp() {
  console.log(`
${bold("FlowSpace 独立测试 DSH — 启动与使用脚本")}

${bold("一、交互式菜单模式（直接运行，无需记命令）：")}
  Windows (CMD / PowerShell / 双击):   ${cyan(".\\flowspace.cmd")}
  Git Bash / macOS / Linux:            ${cyan("./flowspace.sh")}
  通过 pnpm 启动:                      ${cyan("pnpm start")}

${bold("二、快捷一行命令模式：")}
  ${cyan("flowspace dev")}   [--port 3190] [--no-open]   启动【真实模型】独立 DSH + 双端秒级 HMR + 自动打开画布
  ${cyan("flowspace mock")}  [--port 3191] [--no-open]   启动【Mock 模型】独立 DSH + 零账单测试 + 自动打开画布
  ${cyan("flowspace museum")} [--port 3194] [--no-open]  打开【博物馆画布】独立 Mock 沙盒
  ${cyan("flowspace open")}  [--mock] [--chat]           在浏览器打开正在运行的测试 DSH（默认直达 FlowSpace 画布）
  ${cyan("flowspace stop")}  [--mock | --all]            优雅停止正在后台或其他终端运行的测试沙盒
  ${cyan("flowspace status")}                            查看沙盒路径、运行状态、凭据与已装测试插件

${bold("三、隔离沙盒多插件联调（完全不碰电脑全局 ~/.dsh）：")}
  ${cyan("flowspace link <本地插件目录>")} [--both|--mock]  软链挂载本地开发的其他插件（--both 同时挂入两个沙盒）
  ${cyan("flowspace add <包名或.tgz>")}    [--both|--mock]  在隔离沙盒内安装其他测试插件
  ${cyan("flowspace remove <包名>")}       [--both|--mock]  从隔离沙盒移除其他测试插件
  ${cyan("flowspace auth")}                [--force]        从全局 ~/.dsh/.credentials.yaml 单向同步模型凭据
  ${cyan("flowspace reset")} [--mock|--all] [--keep-plugins] 备份并清空沙盒测试会话与画布脏数据回到纯净态

${bold("四、质量校验与打包发布：")}
  ${cyan("flowspace check")}                             完整构建 + 双端 TypeScript 检查 + 单元测试
  ${cyan("flowspace test")}                              运行 DSH 0.2.2-rc.3 端到端集成冒烟测试
  ${cyan("flowspace pack")}                              打包可分发插件产物至 artifacts/*.tgz
  ${cyan("flowspace install-global")} [--profile web]    打包并安装到你电脑日常使用的正式全局 DSH
`);
}

async function launchDevFlow(envMod, { mock, museum = false, rawArgs = [], rl = null }) {
  const defaultPort = museum ? envMod.museumPort : mock ? 3191 : 3190;
  const sandboxOverride = museum ? envMod.museumSandbox : readFlagValue(rawArgs, "--sandbox");
  const sandboxName = sandboxOverride || (mock ? "flowspace-mock" : "flowspace");
  const explicitPort = readFlagValue(rawArgs, "--port");
  let targetPort = Number(explicitPort) || defaultPort;
  const wantOpen = !rawArgs.includes("--no-open");
  const forceRestart = rawArgs.includes("--restart");

  const activeRuntime = await envMod.readSandboxRuntime(sandboxName);
  if (activeRuntime && (museum || !explicitPort || activeRuntime.port === targetPort)) {
    if (forceRestart) {
      console.log(yellow(`正在重启运行中的 ${sandboxName} 实例 (PID ${activeRuntime.pid}) ...`));
      await stopSandboxInstance(envMod, sandboxName);
    } else if (rl) {
      console.log(
        yellow(
          `\n检测到 [${sandboxName}] 已在端口 :${activeRuntime.port} 运行中 (PID ${activeRuntime.pid})。`,
        ),
      );
      console.log("  [1] 直接在默认浏览器打开当前运行中的 FlowSpace 画布（推荐）");
      console.log("  [2] 停止旧实例并重新启动");
      if (!museum) console.log("  [3] 换一个空闲端口新开实例");
      console.log("  [0] 返回主菜单");
      const pick = (await rl.question("\n请选择 [1]: ")).trim() || "1";
      if (pick === "0") return "menu";
      if (pick === "1") {
        await envMod.openSystemBrowser(activeRuntime.canvasUrl || activeRuntime.url);
        console.log(green(`已在浏览器打开: ${activeRuntime.canvasUrl || activeRuntime.url}`));
        return "menu";
      }
      if (pick === "2") {
        await stopSandboxInstance(envMod, sandboxName);
      } else if (pick === "3" && !museum) {
        targetPort = await envMod.findAvailablePort(activeRuntime.port + 1);
      } else {
        return "menu";
      }
    } else {
      console.log(
        green(`沙盒 [${sandboxName}] 已在运行中 (PID ${activeRuntime.pid}):`),
      );
      console.log(`  Canvas URL: ${activeRuntime.canvasUrl || activeRuntime.url}`);
      if (wantOpen) {
        await envMod.openSystemBrowser(activeRuntime.canvasUrl || activeRuntime.url);
      }
      console.log(dim("（如需强制重启，请附加 --restart 或先执行 flowspace stop）"));
      return "exit:0";
    }
  } else {
    const bindState = await envMod.canBindPort(targetPort);
    if (!bindState.ok) {
      const freePort = await envMod.findAvailablePort(targetPort + 1);
      const reason =
        bindState.code === "EACCES"
          ? "被系统保留 (EACCES)"
          : "已被其他进程占用";
      if (rl) {
        console.log(
          yellow(`\n端口 :${targetPort} ${reason}，建议改用可用端口 :${freePort}。`),
        );
        const ans = (
          await rl.question(`按回车使用端口 :${freePort} 启动，或输入 0 返回主菜单: `)
        ).trim();
        if (ans === "0") return "menu";
        targetPort = Number(ans) > 0 ? Number(ans) : freePort;
      } else if (!explicitPort) {
        console.log(
          yellow(`端口 :${targetPort} ${reason}，自动切换到可用端口 :${freePort} 启动 ...`),
        );
        targetPort = freePort;
      }
    }
  }

  if (rl) {
    rl.close();
  }

  const forwarded = stripFlags(
    rawArgs,
    ["--mock", "--museum", "--open", "--no-open", "--restart"],
    ["--port", "--sandbox"],
  );
  const devArgs = [
    ...(museum ? ["--museum"] : mock ? ["--mock"] : []),
    "--port",
    String(targetPort),
    ...(!museum && (explicitPort || sandboxOverride) ? ["--sandbox", sandboxName] : []),
    ...(wantOpen ? ["--open"] : ["--no-open"]),
    ...forwarded,
  ];

  console.log(
    cyan(
      `\n正在启动 ${museum ? "博物馆画布" : mock ? "Mock 测试模型" : "真实模型"} 隔离 DSH (端口 :${targetPort}，源码保存即无刷新热更新) ...`,
    ),
  );
  const code = await runNodeScript("scripts/dev.mjs", devArgs, [
    "--expose-internals",
  ]);
  return `exit:${code}`;
}

async function runPluginTargets(targets, pluginArgs) {
  let lastCode = 0;
  for (const sandbox of targets) {
    console.log(cyan(`\n>>> 正在操作沙盒 [${sandbox}] ...`));
    const args = [
      "--sandbox",
      sandbox,
      ...(sandbox === "flowspace-mock" ? ["--mock"] : []),
      "plugin",
      ...pluginArgs,
    ];
    const code = await runNodeScript("scripts/sandbox.mjs", args);
    if (code !== 0) lastCode = code;
  }
  return lastCode;
}

function resolveTargetSandboxes(args) {
  if (args.includes("--both") || args.includes("--all")) {
    return ["flowspace", "flowspace-mock"];
  }
  const explicit = readFlagValue(args, "--sandbox");
  if (explicit) return [explicit];
  if (args.includes("--mock")) return ["flowspace-mock"];
  return ["flowspace"];
}

async function interactivePluginMenu(rl) {
  while (true) {
    console.log(`\n${bold("─── 隔离沙盒测试插件管理 ───")}`);
    console.log("  [1] 查看两个沙盒当前已安装的插件与软链列表");
    console.log("  [2] 软链挂载另一个本地正在开发的插件目录 (link)");
    console.log("  [3] 安装其他测试插件 (.tgz 本地包 / npm 包 / GitHub)");
    console.log("  [4] 从沙盒卸载指定的测试插件 (remove)");
    console.log("  [0] 返回上级主菜单");

    const choice = (await rl.question("\n请选择操作 [0-4]: ")).trim();
    if (!choice || choice === "0") return;

    if (choice === "1") {
      await runNodeScript("scripts/sandbox.mjs", ["status"]);
      console.log("");
      await runNodeScript("scripts/sandbox.mjs", ["--mock", "status"]);
      continue;
    }

    const askScope = async () => {
      console.log("\n请选择目标沙盒：");
      console.log("  [1] 两个沙盒同时生效（真实模型 + Mock 沙盒，推荐）");
      console.log("  [2] 仅真实模型沙盒 (.local/flowspace)");
      console.log("  [3] 仅 Mock 测试沙盒 (.local/flowspace-mock)");
      const s = (await rl.question("选择目标 [1]: ")).trim() || "1";
      if (s === "2") return ["flowspace"];
      if (s === "3") return ["flowspace-mock"];
      return ["flowspace", "flowspace-mock"];
    };

    if (choice === "2") {
      const targetDir = (
        await rl.question("请输入本地插件文件夹路径 (例如 ../my-dsh-plugin): ")
      )
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!targetDir) continue;
      const targets = await askScope();
      await runPluginTargets(targets, ["link", targetDir]);
    } else if (choice === "3") {
      const spec = (
        await rl.question("请输入插件包名或 .tgz 文件路径: ")
      )
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!spec) continue;
      const targets = await askScope();
      await runPluginTargets(targets, ["add", spec]);
    } else if (choice === "4") {
      const pkgName = (
        await rl.question("请输入要移除的测试插件包名 (不可移除 dsh-flowspace): ")
      ).trim();
      if (!pkgName) continue;
      const targets = await askScope();
      await runPluginTargets(targets, ["remove", pkgName]);
    }
  }
}

async function runInteractiveMenu(envMod) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("SIGINT", () => {
    rl.close();
    console.log("\n已退出。");
    process.exit(0);
  });

  try {
    while (true) {
      const { realBox, mockBox } = await printDashboard(envMod);

      console.log(bold("请选择要执行的操作："));
      console.log(
        `  ${cyan("[1]")} 启动【真实模型】测试 DSH  ${dim("(:3190 · 源码秒级热重载 + 自动打开画布)")}`,
      );
      console.log(
        `  ${cyan("[2]")} 启动【Mock 模型】测试 DSH ${dim("(:3191 · 零 Token 账单 + 秒级热重载 + 自动打开画布)")}`,
      );
      console.log(
        `  ${cyan("[3]")} 浏览器打开预览 / 停止后台运行中的沙盒实例`,
      );
      console.log(
        `  ${cyan("[4]")} 管理测试插件 ${dim("(软链本地其他插件 / 安装 .tgz / 卸载插件)")}`,
      );
      console.log(
        `  ${cyan("[5]")} 同步模型凭据 ${dim("(从电脑全局 ~/.dsh 单向复制凭据到沙盒)")}`,
      );
      console.log(
        `  ${cyan("[6]")} 重置测试沙盒 ${dim("(备份并清空测试会话与画布脏数据)")}`,
      );
      console.log(
        `  ${cyan("[7]")} 代码编译自检与集成测试 ${dim("(check / integration)")}`,
      );
      console.log(
        `  ${cyan("[8]")} 打包发布产物 / 安装到全局正式 DSH`,
      );
      console.log(`  ${cyan("[9]")} 查看命令行速查手册`);
      console.log(`  ${cyan("[10]")} 打开博物馆画布 ${dim("(全部节点与内置模板 · 独立 Mock 沙盒)")}`);
      console.log(`  ${cyan("[0]")} 退出`);

      const answer = (await rl.question("\n请输入编号 [1]: ")).trim();
      const choice = answer === "" ? "1" : answer.toLowerCase();

      if (choice === "0" || choice === "q" || choice === "exit") {
        console.log("已退出。");
        break;
      }

      if (choice === "1") {
        const res = await launchDevFlow(envMod, { mock: false, rl });
        if (res.startsWith("exit:")) {
          process.exit(Number(res.slice(5)) || 0);
        }
        continue;
      }

      if (choice === "2") {
        const res = await launchDevFlow(envMod, { mock: true, rl });
        if (res.startsWith("exit:")) {
          process.exit(Number(res.slice(5)) || 0);
        }
        continue;
      }

      if (choice === "10" || choice === "museum") {
        const res = await launchDevFlow(envMod, { mock: true, museum: true, rl });
        if (res.startsWith("exit:")) {
          process.exit(Number(res.slice(5)) || 0);
        }
        continue;
      }

      if (choice === "3") {
        const running = await discoverAllRunningSandboxes(envMod);
        if (running.length === 0) {
          console.log(yellow("\n当前没有正在运行的沙盒实例，请先选 [1] 或 [2] 启动。"));
          continue;
        }
        console.log("\n当前正在运行的隔离沙盒实例：");
        running.forEach((rt, idx) => {
          console.log(
            `  [${idx + 1}] ${rt.sandbox} (PID ${rt.pid}, :${rt.port}) -> ${rt.canvasUrl || rt.url}`,
          );
        });
        console.log("  [o] 在浏览器打开第 1 个运行实例的 FlowSpace 画布");
        console.log("  [s] 停止全部运行中的沙盒实例");
        console.log("  [0] 返回");
        const sub = (await rl.question("请选择 [o]: ")).trim().toLowerCase() || "o";
        if (sub === "o" || /^[1-9]\d*$/.test(sub)) {
          const target =
            sub === "o" ? running[0] : running[Number(sub) - 1] ?? running[0];
          await envMod.openSystemBrowser(target.canvasUrl || target.url);
          console.log(green(`已在浏览器打开: ${target.canvasUrl || target.url}`));
        } else if (sub === "s") {
          for (const rt of running) {
            const out = await stopSandboxInstance(envMod, rt.sandbox);
            if (out.stopped) {
              console.log(green(`已停止 ${rt.sandbox} (PID ${out.pid})`));
            }
          }
        }
        continue;
      }

      if (choice === "4") {
        await interactivePluginMenu(rl);
        continue;
      }

      if (choice === "5") {
        const forceAns = (
          await rl.question("是否覆盖沙盒已有凭据？(y/N，自动备份旧文件): ")
        )
          .trim()
          .toLowerCase();
        await runNodeScript("scripts/sandbox.mjs", [
          "sync-auth",
          ...(forceAns === "y" || forceAns === "yes" ? ["--force"] : []),
        ]);
        continue;
      }

      if (choice === "6") {
        console.log("\n请选择重置范围：");
        console.log("  [1] 重置真实模型沙盒 (.local/flowspace)");
        console.log("  [2] 重置 Mock 测试沙盒 (.local/flowspace-mock)");
        console.log("  [3] 同时重置两个沙盒");
        console.log("  [0] 取消");
        const scope = (await rl.question("请选择 [0]: ")).trim();
        if (!scope || scope === "0") continue;
        const keepPlugAns = (
          await rl.question("是否保留已额外安装的测试插件？(Y/n): ")
        )
          .trim()
          .toLowerCase();
        const keepPlugins = keepPlugAns !== "n" && keepPlugAns !== "no";
        const targets =
          scope === "1"
            ? ["flowspace"]
            : scope === "2"
              ? ["flowspace-mock"]
              : scope === "3"
                ? ["flowspace", "flowspace-mock"]
                : [];
        for (const t of targets) {
          if (
            (t === "flowspace" && realBox.runtime) ||
            (t === "flowspace-mock" && mockBox.runtime)
          ) {
            await stopSandboxInstance(envMod, t);
          }
          await runNodeScript("scripts/sandbox.mjs", [
            "--sandbox",
            t,
            ...(t === "flowspace-mock" ? ["--mock"] : []),
            "reset",
            ...(keepPlugins ? ["--keep-plugins"] : []),
          ]);
        }
        continue;
      }

      if (choice === "7") {
        console.log("\n  [1] 运行全量构建 + 双端类型检查 + 单元测试 (pnpm check)");
        console.log("  [2] 运行 DSH 0.2.2-rc.3 集成冒烟测试 (pnpm test:integration)");
        console.log("  [3] 两者依次全部运行");
        console.log("  [0] 返回");
        const sub = (await rl.question("请选择 [1]: ")).trim() || "1";
        if (sub === "1" || sub === "3") {
          await runPnpm(["check"]);
        }
        if (sub === "2" || sub === "3") {
          await runPnpm(["test:integration"]);
        }
        continue;
      }

      if (choice === "8") {
        console.log("\n  [1] 仅打包插件产物到 artifacts/*.tgz (pnpm pack:plugin)");
        console.log("  [2] 打包并安装到本地电脑正式全局 ~/.dsh (profile: web)");
        console.log("  [0] 返回");
        const sub = (await rl.question("请选择 [1]: ")).trim() || "1";
        if (sub === "1") {
          await runPnpm(["pack:plugin"]);
        } else if (sub === "2") {
          const confirm = (
            await rl.question(
              "确认将最新构建安装到电脑全局 ~/.dsh 的 web profile 吗？(y/N，会自动备份 profile): ",
            )
          )
            .trim()
            .toLowerCase();
          if (confirm === "y" || confirm === "yes") {
            const packCode = await runPnpm(["pack:plugin"]);
            if (packCode === 0) {
              await runNodeScript("scripts/install.mjs", ["--profile", "web"]);
            }
          }
        }
        continue;
      }

      if (choice === "9" || choice === "h" || choice === "help") {
        printHelp();
        await rl.question(dim("按回车键返回主菜单 ..."));
        continue;
      }

      console.log(yellow(`未识别的选项: ${answer}`));
    }
  } finally {
    rl.close();
  }
}

async function main() {
  checkNodeVersion();

  const rawArgs = process.argv.slice(2);
  const first = rawArgs[0]?.toLowerCase();

  if (first === "help" || first === "--help" || first === "-h") {
    printHelp();
    return;
  }

  await ensureDependencies();
  const envMod = await import("./environment.mjs");

  if (!first || first === "menu") {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      await runInteractiveMenu(envMod);
    } else {
      await printDashboard(envMod);
      printHelp();
    }
    return;
  }

  const subArgs = rawArgs.slice(1);

  if (first === "dev" || first === "real" || first === "run") {
    const res = await launchDevFlow(envMod, {
      mock: subArgs.includes("--mock"),
      rawArgs: subArgs,
    });
    process.exit(Number(res.split(":")[1]) || 0);
  }

  if (first === "mock" || first === "museum") {
    const res = await launchDevFlow(envMod, {
      mock: true,
      museum: first === "museum",
      rawArgs: subArgs,
    });
    process.exit(Number(res.split(":")[1]) || 0);
  }

  if (first === "status" || first === "st") {
    await printDashboard(envMod);
    if (subArgs.includes("--verbose") || subArgs.includes("-v")) {
      await runNodeScript("scripts/sandbox.mjs", ["status"]);
      console.log("");
      await runNodeScript("scripts/sandbox.mjs", ["--mock", "status"]);
    }
    return;
  }

  if (first === "open") {
    const isMock = subArgs.includes("--mock");
    const openChat = subArgs.includes("--chat");
    const explicitPort = readFlagValue(subArgs, "--port");
    const preferredName =
      readFlagValue(subArgs, "--sandbox") ||
      (isMock ? "flowspace-mock" : "flowspace");

    let targetRt = await envMod.readSandboxRuntime(preferredName);
    if (!targetRt && !subArgs.includes("--mock") && !explicitPort) {
      targetRt = await envMod.readSandboxRuntime("flowspace-mock");
    }

    if (targetRt) {
      const url = openChat ? targetRt.url : targetRt.canvasUrl || targetRt.url;
      await envMod.openSystemBrowser(url);
      console.log(green(`已在浏览器打开 [${targetRt.sandbox}]: ${url}`));
      return;
    }

    const fallbackPort = Number(explicitPort) || (isMock ? 3191 : 3190);
    if (await envMod.probePort(fallbackPort)) {
      const fallbackUrl = `http://127.0.0.1:${fallbackPort}/${openChat ? "" : "#flowspace"}`;
      await envMod.openSystemBrowser(fallbackUrl);
      console.log(green(`已在浏览器打开: ${fallbackUrl}`));
      return;
    }

    console.error(
      yellow(
        `当前未检测到运行中的测试沙盒。请先运行 \`flowspace dev\` 或 \`flowspace mock\` 启动。`,
      ),
    );
    process.exit(1);
  }

  if (first === "stop") {
    if (subArgs.includes("--all")) {
      const running = await discoverAllRunningSandboxes(envMod);
      if (running.length === 0) {
        console.log(dim("当前没有运行中的隔离沙盒实例。"));
        return;
      }
      for (const rt of running) {
        const out = await stopSandboxInstance(envMod, rt.sandbox);
        if (out.stopped) {
          console.log(
            green(`已停止 [${rt.sandbox}] (PID ${out.pid}, 端口 :${out.port})`),
          );
        }
      }
      return;
    }
    const targetName =
      readFlagValue(subArgs, "--sandbox") ||
      (subArgs.includes("--mock") ? "flowspace-mock" : "flowspace");
    const out = await stopSandboxInstance(envMod, targetName);
    if (out.stopped) {
      console.log(
        green(`已停止 [${targetName}] (PID ${out.pid}, 端口 :${out.port})`),
      );
    } else {
      console.log(dim(`沙盒 [${targetName}] 当前未运行。`));
    }
    return;
  }

  if (first === "link" || first === "add" || first === "remove" || first === "rm") {
    const action = first === "rm" ? "remove" : first;
    const targets = resolveTargetSandboxes(subArgs);
    const cleaned = stripFlags(
      subArgs,
      ["--mock", "--both", "--all"],
      ["--sandbox"],
    );
    if (cleaned.length === 0) {
      console.error(red(`用法: flowspace ${action} <目标插件路径或包名> [--both|--mock]`));
      process.exit(1);
    }
    const code = await runPluginTargets(targets, [action, ...cleaned]);
    process.exit(code);
  }

  if (first === "plugin" || first === "plugins") {
    const targets = resolveTargetSandboxes(subArgs);
    const cleaned = stripFlags(
      subArgs,
      ["--mock", "--both", "--all"],
      ["--sandbox"],
    );
    const code = await runPluginTargets(
      targets,
      cleaned.length ? cleaned : ["list"],
    );
    process.exit(code);
  }

  if (first === "auth" || first === "sync-auth") {
    const code = await runNodeScript("scripts/sandbox.mjs", [
      "sync-auth",
      ...subArgs,
    ]);
    process.exit(code);
  }

  if (first === "reset") {
    const targets = subArgs.includes("--all")
      ? ["flowspace", "flowspace-mock"]
      : resolveTargetSandboxes(subArgs);
    const cleaned = stripFlags(
      subArgs,
      ["--mock", "--both", "--all"],
      ["--sandbox"],
    );
    let lastCode = 0;
    for (const t of targets) {
      await stopSandboxInstance(envMod, t);
      const code = await runNodeScript("scripts/sandbox.mjs", [
        "--sandbox",
        t,
        ...(t === "flowspace-mock" ? ["--mock"] : []),
        "reset",
        ...cleaned,
      ]);
      if (code !== 0) lastCode = code;
    }
    process.exit(lastCode);
  }

  if (first === "check") {
    process.exit(await runPnpm(["check"]));
  }

  if (first === "test") {
    process.exit(await runPnpm(["test:integration"]));
  }

  if (first === "pack") {
    process.exit(await runPnpm(["pack:plugin"]));
  }

  if (first === "install-global") {
    const profile = readFlagValue(subArgs, "--profile") || "web";
    const useGithub = subArgs.includes("--github");
    if (!useGithub) {
      const packCode = await runPnpm(["pack:plugin"]);
      if (packCode !== 0) process.exit(packCode);
    }
    const code = await runNodeScript("scripts/install.mjs", [
      "--profile",
      profile,
      ...(useGithub ? ["--github"] : []),
    ]);
    process.exit(code);
  }

  if (first === "dsh") {
    const code = await runNodeScript("scripts/sandbox.mjs", ["dsh", ...subArgs]);
    process.exit(code);
  }

  console.error(red(`未知命令: ${rawArgs[0]}\n`));
  printHelp();
  process.exit(1);
}

await main();
