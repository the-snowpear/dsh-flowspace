import { boot } from "./environment.mjs";
const mock = process.argv.includes("--mock");
const result = await boot({
  name: mock ? "flowspace-mock" : "flowspace",
  mock,
  port: mock ? 3191 : 3190,
});
console.log(
  `FlowSpace ${mock ? "integration fixture (simulated model)" : "rc.3 development"} ready. Data: ${result.home}`,
);
process.on("SIGINT", () => {
  void result.shutdown.shutdown(0);
});
// Local development only: reload the client graph after a rebuilt entry.
const { watch } = await import("node:fs");
const { resolve } = await import("node:path");
const { root } = await import("./environment.mjs");
let rebuildTimer;
const watcher = watch(resolve(root, "packages/flowspace/lib/client.js"), () => {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(
    () => result.ctx.clientModules.rebuilt("dsh-flowspace"),
    400,
  );
});
result.ctx.effect(() => () => {
  clearTimeout(rebuildTimer);
  watcher.close();
});
