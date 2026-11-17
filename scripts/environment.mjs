import {
  mkdir,
  writeFile,
  readFile,
  access,
  symlink,
  copyFile,
} from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
export const root = resolve(import.meta.dirname, "..");
const runtimeRequire = createRequire(
  import.meta.resolve("@deepseek-ai/dsh/package.json"),
);
export const runtimeImport = async (name) =>
  import(pathToFileURL(runtimeRequire.resolve(name)).href);
export async function prepare(
  name = "flowspace",
  mock = false,
  packageDir = resolve(root, "packages/flowspace"),
) {
  const home = resolve(root, ".local", name),
    profile = join(home, "profiles", "flowspace");
  await mkdir(profile, { recursive: true });
  await mkdir(join(home, "workspace"), { recursive: true });
  const manifest = {
    name: "flowspace-development-profile",
    private: true,
    dsh: {
      profile: {
        bundles: [
          "@deepseek-ai/dsh-base",
          "@deepseek-ai/dsh-web-app",
          "dsh-flowspace",
        ],
      },
    },
    dependencies: {
      "dsh-flowspace": `link:${resolve(root, "packages/flowspace")}`,
    },
  };
  const path = join(profile, "package.json");
  try {
    await access(path);
  } catch {
    await writeFile(path, JSON.stringify(manifest, null, 2));
  }
  await mkdir(join(profile, "node_modules"), { recursive: true });
  try {
    await access(join(profile, "node_modules/dsh-flowspace"));
  } catch {
    await symlink(
      packageDir,
      join(profile, "node_modules/dsh-flowspace"),
      "junction",
    );
  }
  const overlay = join(profile, mock ? "mock.patch.yml" : "cordis.patch.yml");
  try {
    await access(join(profile, "cordis.patch.yml"));
  } catch {
    await writeFile(join(profile, "cordis.patch.yml"), "[]\n");
  }
  if (mock) {
    await writeFile(
      overlay,
      `- insert:\n    - id: flowspace-test-model\n      name: ${JSON.stringify(resolve(root, "scripts/mock-model.mjs"))}\n- id: agent-default-model\n  config:\n    provider: flowspace-test\n    model: deterministic\n`,
    );
  } else {
    try {
      await access(overlay);
    } catch {
      await writeFile(overlay, "[]\n");
    }
  }
  const fixture = join(home, "workspace/README.md");
  try {
    await access(fixture);
  } catch {
    await writeFile(
      fixture,
      "# FlowSpace test workspace\n\nA tiny project for validating agent workflows.\n",
    );
  }
  return { home, profile, overlay, workspace: join(home, "workspace") };
}
export async function boot({
  name = "flowspace",
  mock = false,
  port = 3190,
  packageDir,
} = {}) {
  const env = await prepare(name, mock, packageDir);
  process.env.DSH_HOME = env.home;
  process.env.DSH_AGENTS_HOME = join(env.home, "agents");
  process.env.DSH_TELEMETRY_DISABLED = "1";
  process.chdir(env.workspace);
  const { createLaunchEnvironmentSnapshot } = await runtimeImport(
    "@deepseek-ai/dsh-launch-environment",
  );
  const { runProfile } = await import("@deepseek-ai/dsh/profile-boot");
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
    args: ["--port", String(port), "--no-open"],
  });
  return { ...result, ...env };
}
