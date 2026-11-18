import { build, context } from "esbuild";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const root = resolve(import.meta.dirname, "..");
export const pkg = resolve(root, "packages/flowspace");
const toolingDir = resolve(root, ".local/build-tools");
const typertBundlePath = resolve(toolingDir, "typert.mjs");

const CLIENT_EXTERNALS = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-store",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
  "zod",
];

let cachedTypertMod = null;

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function writeIfChanged(path, contents) {
  const prev = await readOptional(path);
  if (prev === contents) return false;
  await writeFile(path, contents);
  return true;
}

// rc.3 recognizes Remote decorators only when protocol is a workspace package.
// Extend its package-identity check for the published npm .d.ts, in a local build
// artifact; no installed DSH file or runtime behavior is patched.
export async function ensureTypertTooling({ force = false } = {}) {
  if (cachedTypertMod && !force) return cachedTypertMod;
  await mkdir(toolingDir, { recursive: true });
  const require = createRequire(import.meta.url);
  const generatorEntry = require.resolve("@deepseek-ai/dsh-typert-generator");

  let needsRebuild = force;
  if (!needsRebuild) {
    try {
      const [srcStat, outStat] = await Promise.all([
        stat(generatorEntry),
        stat(typertBundlePath),
      ]);
      if (srcStat.mtimeMs > outStat.mtimeMs) needsRebuild = true;
    } catch {
      needsRebuild = true;
    }
  }

  if (needsRebuild) {
    await build({
      entryPoints: [generatorEntry],
      outfile: typertBundlePath,
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
  }

  cachedTypertMod = await import(
    `${pathToFileURL(typertBundlePath).href}?v=${needsRebuild ? Date.now() : "cached"}`
  );
  return cachedTypertMod;
}

export async function generateTypert({ force = false } = {}) {
  await mkdir(resolve(pkg, "lib"), { recursive: true });
  const hostPath = resolve(pkg, "lib/typert.host.js");
  const clientPath = resolve(pkg, "lib/typert.remote-client.js");
  const [prevHost, prevClient] = await Promise.all([
    readOptional(hostPath),
    readOptional(clientPath),
  ]);

  const { WorkspaceTypertGenerator, writePackageArtifacts } =
    await ensureTypertTooling({ force });
  const generated = new WorkspaceTypertGenerator(root).generate(
    ["dsh-flowspace"],
    ["host"],
  );
  writePackageArtifacts(pkg, generated);

  const [nextHost, nextClient] = await Promise.all([
    readOptional(hostPath),
    readOptional(clientPath),
  ]);

  return {
    hostChanged: prevHost !== nextHost,
    clientChanged: prevClient !== nextClient,
  };
}

export function hostEsbuildOptions() {
  return {
    entryPoints: [resolve(pkg, "src/index.ts")],
    outfile: resolve(pkg, "lib/index.js"),
    platform: "node",
    format: "esm",
    bundle: true,
    packages: "external",
    target: "node24",
    sourcemap: true,
    logLevel: "silent",
  };
}

export function clientEsbuildOptions({ dev = false } = {}) {
  return {
    entryPoints: [resolve(pkg, "src/client/index.tsx")],
    outdir: resolve(pkg, "lib"),
    entryNames: "client",
    platform: "browser",
    format: "cjs",
    bundle: true,
    write: false,
    target: "es2022",
    jsx: "automatic",
    sourcemap: dev ? "inline" : false,
    external: CLIENT_EXTERNALS,
    define: {
      "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
    },
    logLevel: "silent",
  };
}

export function wrapClientModule(js, css) {
  return `window.__ModuleLoader__.load({id:"dsh-flowspace",factory(require){const module={exports:{}};const exports=module.exports;\n${js}\nconst flowspaceApply=module.exports.apply;return {...module.exports,apply(ctx){ctx.effect(()=>{const style=document.createElement('style');style.dataset.plugin='dsh-flowspace';style.textContent=${JSON.stringify(css)};document.head.appendChild(style);return ()=>style.remove()});return flowspaceApply(ctx)}};}});\n`;
}

async function emitClientOutput(result) {
  const js = result.outputFiles.find((f) => f.path.endsWith(".js"))?.text ?? "";
  const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
  const wrapped = wrapClientModule(js, css);
  return writeIfChanged(resolve(pkg, "lib/client.js"), wrapped);
}

export async function buildAll({ forceTypert = true, withLicenses = true } = {}) {
  await mkdir(resolve(pkg, "lib"), { recursive: true });
  await generateTypert({ force: forceTypert });
  await build(hostEsbuildOptions());
  const clientResult = await build(clientEsbuildOptions({ dev: false }));
  const js = clientResult.outputFiles.find((f) => f.path.endsWith(".js")).text;
  const css =
    clientResult.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
  await writeFile(resolve(pkg, "lib/client.js"), wrapClientModule(js, css));
  console.log("Built dsh-flowspace Host, typed Remote, and DSH client bundle.");
  if (withLicenses) {
    await import(`./licenses.mjs?t=${Date.now()}`);
  }
}

export async function createIncrementalBuilder({ dev = true } = {}) {
  await mkdir(resolve(pkg, "lib"), { recursive: true });
  const typertReady =
    (await readOptional(resolve(pkg, "lib/typert.host.js"))) !== null &&
    (await readOptional(resolve(pkg, "lib/typert.remote-client.js"))) !== null;

  if (!typertReady) {
    await generateTypert({ force: false });
  }

  const [hostCtx, clientCtx] = await Promise.all([
    context(hostEsbuildOptions()),
    context(clientEsbuildOptions({ dev })),
  ]);

  return {
    async initialBuild({ checkContracts = true } = {}) {
      const started = performance.now();
      if (checkContracts) {
        await generateTypert({ force: false });
      }
      const [, clientResult] = await Promise.all([
        hostCtx.rebuild(),
        clientCtx.rebuild(),
      ]);
      await emitClientOutput(clientResult);
      return { durationMs: Math.round(performance.now() - started) };
    },

    async rebuildClient() {
      const started = performance.now();
      const clientResult = await clientCtx.rebuild();
      const changed = await emitClientOutput(clientResult);
      return {
        changed,
        durationMs: Math.round(performance.now() - started),
      };
    },

    async rebuildHost({ checkContracts = false, alsoClient = false } = {}) {
      const started = performance.now();
      let typert = { hostChanged: false, clientChanged: false };
      if (checkContracts) {
        typert = await generateTypert({ force: false });
      }
      const prevHost = await readOptional(resolve(pkg, "lib/index.js"));
      await hostCtx.rebuild();
      const nextHost = await readOptional(resolve(pkg, "lib/index.js"));
      const hostChanged = prevHost !== nextHost || typert.hostChanged;

      let clientChanged = false;
      if (alsoClient || typert.clientChanged) {
        const clientResult = await clientCtx.rebuild();
        clientChanged = await emitClientOutput(clientResult);
      }

      return {
        hostChanged,
        clientChanged,
        typertChanged: typert.hostChanged || typert.clientChanged,
        durationMs: Math.round(performance.now() - started),
      };
    },

    async dispose() {
      await Promise.allSettled([hostCtx.dispose(), clientCtx.dispose()]);
    },
  };
}
