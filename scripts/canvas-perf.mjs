import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { boot, findAvailablePort, root } from "./environment.mjs";
import { initializeMuseum } from "./museum.ts";
import { emptyDocument, newEdge, newNode } from "../packages/flowspace/src/core/document.ts";
import { dragSample, lodDragSample, openCanvas, reverseZoom, verifyNative, verifyNativeLarge, verifyWireStage, verifyOverviewStage } from "./canvas-interactions.mjs";

const { chromium } = await import(process.env.FLOWSPACE_PLAYWRIGHT || "playwright");
const rounds = Number(process.env.FLOWSPACE_PERF_ROUNDS || 10);
const cases = process.argv.slice(2);
const directory = join(root, "output", "playwright", `canvas-perf-${Date.now()}`);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const port = await findAvailablePort(3200);
const packageDir = await mkdtemp(join(root, ".local", "bench-package-"));
const source = join(root, "packages", "flowspace");
await Promise.all([
  cp(resolve(process.env.FLOWSPACE_PERF_LIB || join(source, "lib")), join(packageDir, "lib"), { recursive: true }),
  ...["package.json", "cordis.patch.yml"].map(name => cp(join(source, name), join(packageDir, name))),
  symlink(join(source, "node_modules"), join(packageDir, "node_modules"), "junction"),
]);
const service = await boot({ name: `canvas-perf-${Date.now()}`, mock: true, packageDir, port, host: "127.0.0.1" });
const report = { browser: browser.version(), rounds, scenes: {} };
const quantile = (values, fraction) =>
  values.length ? +values.toSorted((left, right) => left - right)[Math.ceil(values.length * fraction) - 1].toFixed(1) : null;

function graph(count, mode, zoomedOut = false) {
  const doc = emptyDocument();
  doc.viewport = { x: 36, y: 58, zoom: zoomedOut ? 0.28 : 0.86 };
  doc.prefs = { filter: "all", wireRouting: mode };
  if (zoomedOut) {
    Object.assign(doc.prefs, { showBranches: true, showWorktrees: true });
  }
  const columns = 10;
  doc.nodes = Array.from({ length: count }, (_, index) => ({
    ...newNode("agent", index % columns * 420, Math.floor(index / columns) * 440, `Agent ${index}`),
    expanded: true,
  }));
  doc.edges = doc.nodes.flatMap((node, index) =>
    [index % columns < columns - 1 ? index + 1 : -1, index + columns]
      .filter(target => target >= 0 && target < count)
      .map(target => newEdge(node.id, doc.nodes[target].id, "continuation")),
  );
  const group = { ...newNode("group", -40, -54, "Drag group"), width: 1680, height: 490 };
  for (const node of doc.nodes.slice(0, 4)) node.parentId = group.id;
  doc.nodes.push(group);
  return doc;
}

async function zoom(page, delta, expected = delta > 0 ? "44%" : "86%") {
  return page.evaluate(async ({ delta, expected }) => {
    const world = document.querySelector(".fs-world");
    const viewport = document.querySelector(".fs-viewport");
    const rect = viewport.getBoundingClientRect();
    const before = world.classList.contains("semantic-zoom");
    let cross;
    const samples = [];
    const observer = new MutationObserver(() => {
      if (cross === undefined && world.classList.contains("semantic-zoom") !== before) cross = performance.now();
    });
    observer.observe(world, { attributes: true, attributeFilter: ["class"] });
    let previous = await new Promise(resolve => requestAnimationFrame(resolve));
    const start = performance.now();
    viewport.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true, cancelable: true, ctrlKey: true, deltaY: delta,
      clientX: rect.left + rect.width * 0.55, clientY: rect.top + rect.height * 0.4,
    }));
    await new Promise(resolve => {
      function sample(now) {
        samples.push({ time: now, interval: now - previous });
        previous = now;
        const mounting = !world.classList.contains("semantic-zoom") && Number(document.querySelector(".fs-overview-canvas")?.dataset.visibleCards) > 0;
        if (world.isConnected && now - start < 30000 && (now - start < 500 || world.dataset.moving || mounting || document.querySelector(".zoom-label")?.textContent !== expected)) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    observer.disconnect();
    const crossing = samples.filter(({ time, interval }) => cross !== undefined && time >= cross && time - interval < cross + 320);
    return {
      frames: samples.map(frame => frame.interval),
      crossing: crossing.map(frame => frame.interval),
      stable: samples.filter(frame => !crossing.includes(frame)).map(frame => frame.interval),
      zoom: document.querySelector(".zoom-label").textContent,
      elements: world.querySelectorAll("*").length,
      wirePaths: viewport.querySelectorAll(".fs-edges-svg path").length,
      dom: {
        nodes: world.querySelector(".fs-nodes-layer")?.querySelectorAll("*").length ?? 0,
        cards: world.querySelectorAll(".fs-card-slot").length,
        tags: world.querySelectorAll(".edge-tag").length,
        groups: world.querySelector(".fs-groups-layer")?.querySelectorAll("*").length ?? 0,
      },
      connected: world.isConnected,
    };
  }, { delta, expected });
}

const metricNames = ["LayoutDuration", "RecalcStyleDuration", "ScriptDuration"];

function metricDelta(before, after) {
  const initial = new Map(before.metrics.map(({ name, value }) => [name, value]));
  return Object.fromEntries(after.metrics.filter(({ name }) => metricNames.includes(name))
    .map(({ name, value }) => [name, Math.round((value - initial.get(name)) * 1000)]));
}

const frameSummary = samples => ({ p95: quantile(samples, 0.95), max: quantile(samples, 1) });

async function overview(page, session) {
  await page.waitForFunction(() => document.querySelector(".zoom-label")?.textContent === "28%");
  await page.locator(".fs-minimap").waitFor();
  const initial = await session.send("Performance.getMetrics");
  const pan = await dragSample(page, "pan");
  const passes = [];
  const delta = Math.log(0.42 / 0.28) / 0.009;
  for (let round = 0; round < 6; round++) {
    passes.push(await zoom(page, -delta, "42%"), await zoom(page, delta, "28%"));
  }
  if (passes.some((pass, index) => !pass.connected || pass.crossing.length || pass.zoom !== (index % 2 ? "28%" : "42%"))) {
    throw new Error("Overview zoom left the 28–42% range or failed to settle");
  }
  const node = await lodDragSample(page, "node");
  const group = await lodDragSample(page, "group");
  const after = await session.send("Performance.getMetrics");
  await lodDragSample(page, "node", true);
  await lodDragSample(page, "group", true);
  const { elements } = passes.at(-1);
  return { zoom: frameSummary(passes.flatMap(pass => pass.frames)), wirePaths: passes.at(-1).wirePaths, drags: {
    pan: frameSummary(pan), node: frameSummary(node), group: frameSummary(group),
  }, elements, timing: metricDelta(initial, after), passes };
}

async function activeFlow(count, dpr, isolated) {
  // Supply consumed continuation tokens and live destinations through the same
  // snapshot stream as a running workflow, without starting external sessions.
  const doc = emptyDocument();
  doc.viewport = { x: 36, y: 58, zoom: 0.86 };
  doc.prefs = { filter: "all", wireRouting: "overlap", showBranches: false, showWorktrees: false };
  doc.nodes.push(newNode("note", 180, 120, "Drag test"));
  doc.nodes.push({ ...newNode("group", 90, 72, "Drag group"), width: 480, height: 400 });
  for (let row = 0; row < count; row++) {
    const from = newNode("agent", -738, row * 17, `Source ${row}`);
    const to = newNode("agent", 3375, row * 17, `Target ${row}`);
    to.sessionId = `canvas-flow-fixture-${row}`;
    doc.nodes.push(from, to);
    doc.edges.push(newEdge(from.id, to.id, "continuation"));
  }
  const host = service.ctx.flowspace;
  if (isolated) doc.prefs.hiddenWorkspaces = (await host.projectStructures()).map(project => project.id);
  await host.save(doc);
  const original = host.snapshot;
  host.snapshot = function () {
    const snapshot = original.call(this);
    const destinations = snapshot.document.nodes.filter(node => node.sessionId?.startsWith("canvas-flow-fixture-"));
    const live = destinations.map(node => ({
      nodeId: node.id, sessionId: node.sessionId, running: true, output: "", seq: 0, pendingInput: [],
    }));
    const tokens = snapshot.document.edges.map(edge => ({
      id: edge.id, edgeId: edge.id, stepId: edge.source, createdAt: 0, ready: true, consumed: true, boundary: false, dismissed: false,
      source: { id: edge.id, kind: "text", sourceNodeId: edge.source, capturedAt: 0, title: "", text: "" },
    }));
    return { ...snapshot, live, runs: [{
      id: "canvas-flow-fixture", title: "Canvas flow fixture", origin: "canvas", state: "running", createdAt: 0,
      scope: null, roots: [], participants: [], graph: { nodes: snapshot.document.nodes, edges: snapshot.document.edges },
      steps: [], tokens, notes: [],
    }] };
  };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
  try {
    await page.addInitScript(() => {
      window.__flowspaceBufferUploads = 0;
      const upload = WebGL2RenderingContext.prototype.bufferData;
      WebGL2RenderingContext.prototype.bufferData = function (...args) {
        window.__flowspaceBufferUploads++;
        return upload.apply(this, args);
      };
    });
    const url = service.ctx.get("connection").authenticatedUrl(`http://127.0.0.1:${port}`) + "#flowspace";
    await openCanvas(page, url);
    await page.waitForFunction(n => Number(document.querySelector(".fs-wire-flow-canvas")?.dataset.activeWires) === n, count);
    const session = await page.context().newCDPSession(page);
    await session.send("Performance.enable");
    const metrics = async () => Object.fromEntries((await session.send("Performance.getMetrics")).metrics.map(entry => [entry.name, entry.value]));
    const gpuWires = () => page.locator(".fs-wire-flow-canvas").evaluate(canvas => Number(canvas.dataset.gpuActive));
    const accelerated = await gpuWires();
    const uploads = await page.evaluate(() => window.__flowspaceBufferUploads);
    await zoom(page, 20, "72%");
    await zoom(page, -20, "86%");
    const cameraUploads = await page.evaluate(before => window.__flowspaceBufferUploads - before, uploads);
    if (cameraUploads) throw new Error(`Camera-only zoom uploaded wire buffers ${cameraUploads} times`);
    const initial = await metrics();
    const idle = await page.evaluate(async () => {
      let previous = await new Promise(requestAnimationFrame);
      const end = previous + 1800;
      const frames = [];
      do {
        const next = await new Promise(requestAnimationFrame);
        frames.push(next - previous);
        previous = next;
      } while (previous < end);
      return frames;
    });
    const after = await metrics();
    const drags = {};
    for (const kind of ["pan", "node", "group"]) {
      drags[kind] = quantile(await dragSample(page, kind), 0.95);
    }
    const down = await zoom(page, 75);
    const up = await zoom(page, -75);
    if (!down.crossing.length || !up.crossing.length) throw new Error("Active flow did not cross the layout threshold");
    let contextLoss = false, contextRestore = false, fallbackAnimated = false;
    if (accelerated) {
      // Exercise the real context-loss event and the Canvas2D fallback before restoring.
      const hasTestExtension = await page.locator(".fs-wire-flow-canvas").evaluate(canvas => {
        const context = canvas.getContext("webgl2");
        const extension = context?.getExtension("WEBGL_lose_context");
        if (!extension) return false;
        window.__flowspaceRestoreContext = () => extension.restoreContext();
        extension.loseContext();
        return true;
      });
      if (hasTestExtension) {
        await page.waitForFunction(n => {
          const canvas = document.querySelector(".fs-wire-flow-canvas");
          return canvas?.dataset.renderer === "canvas2d" && Number(canvas.dataset.gpuActive) === 0 && Number(canvas.dataset.activeWires) === n;
        }, count);
        const fallback = await page.locator(".fs-wire-static-canvas").evaluate(canvas => {
          const context = canvas.getContext("2d");
          return context.getImageData(0, 0, canvas.width, canvas.height).data.some((value, i) => i % 4 === 3 && value > 0);
        });
        if (!fallback) throw new Error("Canvas2D fallback did not draw after context loss");
        fallbackAnimated = await page.locator(".fs-wire-static-canvas").evaluate(async canvas => {
          const context = canvas.getContext("2d");
          const pixels = () => context.getImageData(0, 0, canvas.width, canvas.height).data;
          const before = pixels();
          await new Promise(resolve => setTimeout(resolve, 150));
          return pixels().some((value, i) => value !== before[i]);
        });
        if (!fallbackAnimated) throw new Error("Canvas2D fallback animation stopped after context loss");
        contextLoss = true;
        await page.evaluate(() => {
          window.__flowspaceRestoreContext();
          delete window.__flowspaceRestoreContext;
        });
        await page.waitForFunction(n => Number(document.querySelector(".fs-wire-flow-canvas")?.dataset.gpuActive) === n, accelerated);
        contextRestore = true;
      }
    }
    const root = page.locator(".fs-root").first();
    const screenshot = async () => {
      const theme = await root.getAttribute("data-theme");
      const suffix = isolated ? "-isolated" : "";
      await page.screenshot({ path: join(directory, `flow-${count}-${dpr}x${suffix}-${theme}.png`) });
      return theme;
    };
    const theme = await screenshot();
    if (process.env.FLOWSPACE_VISUAL === "1") {
      await page.getByRole("button", { name: /^(界面主题|theme)$/i }).first().click();
      await page.waitForTimeout(1900);
      if (theme === await screenshot()) throw new Error("The active flow theme did not switch");
    }
    host.snapshot = original;
    host.publish();
    await page.waitForFunction(() => Number(document.querySelector(".fs-wire-flow-canvas")?.dataset.activeWires) === 0);
    if (accelerated && await page.locator(".fs-wire-flow-canvas").isVisible()) throw new Error("Idle WebGL layer remained visible");
    return { active: count, dpr, isolated, accelerated, cameraUploads, contextLoss, contextRestore, fallbackAnimated,
      themes: process.env.FLOWSPACE_VISUAL === "1" ? ["dark", "light"] : [theme], idleHidden: true, idleP95: quantile(idle, 0.95),
      idleMainMsPerFrame: Math.round((after.TaskDuration - initial.TaskDuration) * 10000 / idle.length) / 10,
      drags, crossingP95: quantile([...down.crossing, ...up.crossing], 0.95) };
  } finally {
    host.snapshot = original;
    await page.close();
  }
}

try {
  await initializeMuseum(service);
  const url = service.ctx.get("connection").authenticatedUrl(`http://127.0.0.1:${port}`) + "#flowspace";
  for (const scene of cases.length ? cases : ["museum", "200-overlap", "200-avoid", "500-overlap", "500-avoid"]) {
    if (scene === "wire-stage" || scene === "overview-stage") {
      report.scenes[scene] = await (scene === "wire-stage" ? verifyWireStage : verifyOverviewStage)(browser, service, url, directory);
      await writeFile(join(directory, "report.json"), JSON.stringify(report));
      console.log("PERF", scene, JSON.stringify(report.scenes[scene]));
      continue;
    }
    const zoomedOut = scene.endsWith("-zoomed-out");
    if (scene.startsWith("flow-")) {
      const [, count, dpr = "1", variant] = scene.split("-");
      report.scenes[scene] = await activeFlow(Number(count), Number(dpr), variant === "isolated");
      await writeFile(join(directory, "report.json"), JSON.stringify(report));
      console.log("PERF", scene, JSON.stringify(report.scenes[scene]));
      continue;
    }
    if (scene === "native" || scene === "native-large") {
      const verify = scene === "native" ? verifyNative : verifyNativeLarge;
      report.scenes[scene] = await verify(browser, service, url, directory);
      await writeFile(join(directory, "report.json"), JSON.stringify(report));
      console.log("PERF", scene, JSON.stringify(report.scenes[scene]));
      continue;
    }
    if (scene !== "museum") {
      const [count, mode] = scene.split("-");
      const parsed = Number(count);
      if (!Number.isFinite(parsed) || parsed <= 0 || (!zoomedOut && mode !== "overlap" && mode !== "avoid")) {
        throw new Error(`Unknown canvas perf scene: ${scene}`);
      }
      await service.ctx.flowspace.save(graph(parsed, zoomedOut ? "overlap" : mode, zoomedOut));
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await openCanvas(page, url);
    const session = await page.context().newCDPSession(page);
    await session.send("Performance.enable");
    if (zoomedOut) {
      const { passes, ...result } = await overview(page, session);
      report.scenes[scene] = { ...result, passes };
      await writeFile(join(directory, "report.json"), JSON.stringify(report));
      console.log("PERF", scene, JSON.stringify(result));
      await page.screenshot({ path: join(directory, `${scene}.png`) });
      await page.close();
      continue;
    }
    const trace = process.env.FLOWSPACE_PERF_TRACE === "1";
    const events = [];
    if (trace) {
      session.on("Tracing.dataCollected", event => events.push(...event.value));
      const categories = ["devtools.timeline", "blink.user_timing", "toplevel"];
      if (process.env.FLOWSPACE_SELECTOR_STATS) categories.push("disabled-by-default-blink.debug", "disabled-by-default-devtools.timeline.invalidationTracking");
      await session.send("Tracing.start", { categories: categories.join(","), transferMode: "ReportEvents" });
      await session.send("Profiler.enable");
      await session.send("Profiler.start");
    }
    const initial = await session.send("Performance.getMetrics");
    const passes = [];
    for (let round = 0; round < rounds; round++) {
      for (const delta of [75, -75]) passes.push(await zoom(page, delta));
    }
    if (trace) {
      const { profile } = await session.send("Profiler.stop");
      const complete = new Promise(resolve => session.once("Tracing.tracingComplete", resolve));
      await session.send("Tracing.end");
      await complete;
      await writeFile(join(directory, `${scene}.cpuprofile`), JSON.stringify(profile));
      await writeFile(join(directory, `${scene}.trace.json`), JSON.stringify({ traceEvents: events }));
    }
    if (passes.some((pass, index) => !pass.crossing.length || (parseInt(pass.zoom) < 50) !== (index % 2 === 0))) {
      console.log("PERF incomplete", scene, passes.map(pass => [pass.zoom, pass.connected, pass.frames.length, pass.crossing.length]));
      throw new Error(`${scene} failed to cross the threshold and settle`);
    }
    const after = await session.send("Performance.getMetrics");
    const timing = metricDelta(initial, after);
    const hot = passes.slice(2);
    const regular = [];
    for (let round = 0; round < rounds; round++) {
      regular.push(await zoom(page, 20, "72%"), await zoom(page, -20, "86%"));
    }
    const result = {
      coldMax: quantile(passes.slice(0, 2).flatMap(pass => pass.crossing), 1),
      hotCrossMax: quantile(hot.flatMap(pass => pass.crossing), 1),
      hotCrossP95: quantile(hot.flatMap(pass => pass.crossing), 0.95),
      regularP95: quantile(regular.flatMap(pass => pass.frames), 0.95),
      p95: quantile(hot.flatMap(pass => pass.frames), 0.95),
      stableP95: quantile(hot.flatMap(pass => pass.stable), 0.95),
      max: quantile(passes.flatMap(pass => pass.frames), 1),
      elements: passes.slice(0, 2).map(pass => pass.elements), timing,
      wirePaths: Math.max(...passes.map(pass => pass.wirePaths)),
    };
    if (scene === "museum" && process.env.FLOWSPACE_REVERSAL === "1") {
      await reverseZoom(page, directory);
      result.reversal = true;
    }
    if (process.env.FLOWSPACE_INTERACTIONS !== "0") {
      const drags = {};
      for (const kind of ["pan", "node", "group"]) {
        const samples = await dragSample(page, kind);
        drags[kind] = frameSummary(samples);
      }
      await dragSample(page, "node", true);
      result.drags = drags;
    }
    report.scenes[scene] = { ...result, passes };
    await writeFile(join(directory, "report.json"), JSON.stringify(report));
    console.log("PERF", scene, JSON.stringify(result));
    await page.screenshot({ path: join(directory, `${scene}.png`) });
    if (scene === "museum" && process.env.FLOWSPACE_VISUAL === "1") {
      for (let theme = 0; theme < 2; theme++) {
        const variant = await page.locator(".fs-root").first().getAttribute("data-theme");
        await page.screenshot({ path: join(directory, `museum-${variant}-full.png`) });
        await zoom(page, 75);
        await page.screenshot({ path: join(directory, `museum-${variant}-compact.png`) });
        await zoom(page, Math.log(44 / 28) / 0.009, "28%");
        await page.screenshot({ path: join(directory, `museum-${variant}-overview.png`) });
        await zoom(page, -Math.log(44 / 28) / 0.009, "44%");
        await zoom(page, -75);
        if (!theme) {
          await page.getByRole("button", { name: /^(界面主题|theme)$/i }).first().click();
          await page.waitForTimeout(1900);
        }
      }
    }
    await page.close();
  }
} finally {
  console.log("PERF output", directory);
  await browser.close();
  await service.shutdown.shutdown(0);
  await rm(packageDir, { recursive: true, force: true }).catch(() => {});
}
