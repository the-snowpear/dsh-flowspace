import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = resolve(import.meta.dirname, ".."),
  pkg = resolve(root, "packages/flowspace");
await mkdir(resolve(pkg, "lib"), { recursive: true });
const require = createRequire(import.meta.url);
// rc.3 recognizes Remote decorators only when protocol is a workspace package.
// Extend its package-identity check for the published npm .d.ts, in a local build
// artifact; no installed DSH file or runtime behavior is patched.
const tooling = resolve(root, ".local/build-tools");
await mkdir(tooling, { recursive: true });
const generatorEntry = require.resolve("@deepseek-ai/dsh-typert-generator");
await build({
  entryPoints: [generatorEntry],
  outfile: resolve(tooling, "typert.mjs"),
  platform: "node",
  format: "esm",
  bundle: true,
  external: ["typescript"],
  plugins: [
    {
      name: "published-protocol-identity",
      setup(b) {
        b.onLoad(
          { filter: /dsh-typert-generator[\\/]lib[\\/]index\.js$/ },
          async ({ path }) => ({
            loader: "js",
            contents: (await readFile(path, "utf8")).replace(
              'if (declaration === void 0) return false;\n\t\tif (this.registrationForFile(declaration.getSourceFile().fileName)?.name === "@deepseek-ai/dsh-typert-protocol") return true;',
              'if (declaration === void 0) return false;\n\t\tif (/[/\\\\]@deepseek-ai[/\\\\]dsh-typert-protocol[/\\\\]/.test(declaration.getSourceFile().fileName)) return true;\n\t\tif (this.registrationForFile(declaration.getSourceFile().fileName)?.name === "@deepseek-ai/dsh-typert-protocol") return true;',
            ),
          }),
        );
      },
    },
  ],
});
const { WorkspaceTypertGenerator, writePackageArtifacts } = await import(
  pathToFileURL(resolve(tooling, "typert.mjs")).href
);
const generated = new WorkspaceTypertGenerator(root).generate(
  ["dsh-flowspace"],
  ["host"],
);
writePackageArtifacts(pkg, generated);
await build({
  entryPoints: [resolve(pkg, "src/index.ts")],
  outfile: resolve(pkg, "lib/index.js"),
  platform: "node",
  format: "esm",
  bundle: true,
  packages: "external",
  target: "node24",
  sourcemap: true,
});
const client = await build({
  entryPoints: [resolve(pkg, "src/client/index.tsx")],
  outdir: resolve(pkg, "lib"),
  entryNames: "client",
  platform: "browser",
  format: "cjs",
  bundle: true,
  write: false,
  target: "es2022",
  jsx: "automatic",
  external: [
    "react",
    "react/jsx-runtime",
    "react-dom",
    "react-dom/client",
    "@deepseek-ai/cordis",
    "@deepseek-ai/dsh-client-store",
    "@deepseek-ai/dsh-client-ui-slots",
    "@deepseek-ai/dsh-client-ui-primitives",
    "zod",
  ],
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = client.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = client.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
await writeFile(
  resolve(pkg, "lib/client.js"),
  `window.__ModuleLoader__.load({id:"dsh-flowspace",factory(require){const module={exports:{}};const exports=module.exports;\n${js}\nconst flowspaceApply=module.exports.apply;return {...module.exports,apply(ctx){ctx.effect(()=>{const style=document.createElement('style');style.dataset.plugin='dsh-flowspace';style.textContent=${JSON.stringify(css)};document.head.appendChild(style);return ()=>style.remove()});return flowspaceApply(ctx)}};}});\n`,
);
console.log("Built dsh-flowspace Host, typed Remote, and DSH client bundle.");
await import("./licenses.mjs");
