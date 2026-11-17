import { access, mkdir, copyFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const index = process.argv.indexOf("--profile");
const profileName = index < 0 ? "flowspace" : process.argv[index + 1];
if (!profileName || !/^[a-zA-Z0-9_-]+$/.test(profileName))
  throw new Error("Supply a valid --profile name");
const files = (await readdir(join(root, "artifacts")))
  .filter((n) => /^dsh-flowspace-.*\.tgz$/.test(n))
  .sort();
const artifact = files.at(-1);
if (!artifact) throw new Error("Run pnpm pack:plugin first");
const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
const profile = join(dshHome, "profiles", profileName);
const backup = join(
  root,
  ".backups",
  "install-" + new Date().toISOString().replace(/[:.]/g, "-"),
  profileName,
);
await mkdir(backup, { recursive: true });
for (const name of [
  "package.json",
  "cordis.yml",
  "cordis.patch.yml",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
]) {
  try {
    await access(join(profile, name));
  } catch {
    continue;
  }
  await copyFile(join(profile, name), join(backup, name));
}
console.log(`Profile backup: ${backup}`);
const globalCli =
  process.platform === "win32"
    ? join(process.env.APPDATA, "npm/node_modules/@deepseek-ai/dsh/lib/bin.js")
    : undefined;
if (!globalCli)
  throw new Error(
    `Install manually: dsh plugin --profile ${profileName} add ${join(root, "artifacts", artifact)}`,
  );
const child = spawn(
  process.execPath,
  [
    globalCli,
    "plugin",
    "--profile",
    profileName,
    "add",
    join(root, "artifacts", artifact),
  ],
  { stdio: "inherit", windowsHide: true },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
