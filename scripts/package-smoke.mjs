import {
  mkdir,
  readFile,
  writeFile,
  symlink,
  readdir,
  realpath,
} from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname, resolve, relative, isAbsolute, join } from "node:path";
import assert from "node:assert/strict";
import { root, boot } from "./environment.mjs";
const output = resolve(root, ".local/package-smoke-" + Date.now());
await mkdir(output, { recursive: true });
const bytes = gunzipSync(
  await readFile(resolve(root, "artifacts/dsh-flowspace-0.1.0.tgz")),
);
for (let offset = 0; offset + 512 <= bytes.length; ) {
  const name = bytes
    .subarray(offset, offset + 100)
    .toString()
    .split("\0")[0];
  if (!name) break;
  const length =
    parseInt(
      bytes
        .subarray(offset + 124, offset + 136)
        .toString()
        .replace(/\0/g, "")
        .trim(),
      8,
    ) || 0;
  const type = bytes[offset + 156],
    target = resolve(output, name),
    local = relative(output, target);
  if (local.startsWith("..") || isAbsolute(local))
    throw new Error("Archive path outside extraction root");
  if (type === 0 || type === 48) {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      target,
      bytes.subarray(offset + 512, offset + 512 + length),
    );
  }
  offset += 512 + Math.ceil(length / 512) * 512;
}
const pkg = join(output, "package");
// Use the exact locked dependencies, but load every plugin file from the archive.
await mkdir(join(pkg, "node_modules"), { recursive: true });
const sourceModules = resolve(root, "packages/flowspace/node_modules");
for (const name of await readdir(sourceModules)) {
  if (name.startsWith(".")) continue;
  if (name.startsWith("@")) {
    await mkdir(join(pkg, "node_modules", name), { recursive: true });
    for (const child of await readdir(join(sourceModules, name)))
      await symlink(
        await realpath(join(sourceModules, name, child)),
        join(pkg, "node_modules", name, child),
        "junction",
      );
  } else
    await symlink(
      await realpath(join(sourceModules, name)),
      join(pkg, "node_modules", name),
      "junction",
    );
}
const { ctx, shutdown } = await boot({
  name: "package-smoke-host-" + Date.now(),
  mock: true,
  port: 3194,
  packageDir: pkg,
});
try {
  assert.equal(ctx.flowspace.snapshot().document.version, 1);
  assert.ok(ctx.typert.local.get("flowspace/start"));
  console.log(
    "PASS: packed plugin loads Host service and generated Remote contracts in rc.3.",
  );
} finally {
  await shutdown.shutdown(0);
}
