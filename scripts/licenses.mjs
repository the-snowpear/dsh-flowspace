import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
const pkg = resolve(import.meta.dirname, "../packages/flowspace");
const req = createRequire(join(pkg, "package.json"));
const packages = [
  ["@xyflow/react", req],
  ["lucide-react", req],
];
const texts = [];
const seen = new Set();
for (const [name, anchor] of packages) {
  if (seen.has(name)) continue;
  seen.add(name);
  let entry, dir;
  try {
    entry = anchor.resolve(name + "/package.json");
  } catch {
    dir = dirname(anchor.resolve(name));
    while (true) {
      try {
        const candidate = join(dir, "package.json");
        const m = JSON.parse(await readFile(candidate, "utf8"));
        if (m.name === name) {
          entry = candidate;
          break;
        }
      } catch {}
      const parent = dirname(dir);
      if (parent === dir)
        throw new Error(`Cannot find package manifest: ${name}`);
      dir = parent;
    }
  }
  const manifest = JSON.parse(await readFile(entry, "utf8"));
  const childRequire = createRequire(entry);
  for (const child of Object.keys(manifest.dependencies ?? {}))
    packages.push([child, childRequire]);
  for (const file of ["LICENSE", "LICENSE.md", "LICENSE.txt", "license"]) {
    try {
      texts.push(
        `## ${name} ${manifest.version}\n\n${await readFile(join(dirname(entry), file), "utf8")}`,
      );
      break;
    } catch {}
  }
}
await writeFile(
  join(pkg, "THIRD_PARTY_NOTICES.md"),
  "# Bundled dependencies\n\n" + texts.join("\n\n"),
);
