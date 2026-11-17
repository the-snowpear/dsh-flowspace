import { cp, mkdir } from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname } from "node:path";
const root = resolve(import.meta.dirname, "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
for (const input of process.argv.slice(2)) {
  const source = resolve(root, input),
    name = relative(root, source);
  if (name.startsWith("..") || isAbsolute(name))
    throw new Error("Backup source must be in this workspace");
  const target = resolve(root, ".backups", stamp, name);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}
console.log(`Backup: .backups/${stamp}`);
