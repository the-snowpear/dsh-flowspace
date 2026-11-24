import assert from "node:assert/strict";
import { join } from "node:path";
import { emptyDocument, newEdge, newNode } from "../packages/flowspace/src/core/document.ts";
import { endpoint } from "../packages/flowspace/src/core/geometry.ts";
import { route } from "../packages/flowspace/src/client/wireRouting.ts";

export async function verifyWireStage(browser, service, url) {
  const doc = emptyDocument();
  doc.viewport = { x: 24, y: 24, zoom: 0.86 };
  doc.prefs = { filter: "all", wireRouting: "overlap", showBranches: false, showWorktrees: false };
  const source = { ...newNode("agent", 40, 220, "Wire source"), expanded: true };
  const target = { ...newNode("agent", 760, 220, "Wire target"), expanded: true };
  const edge = newEdge(source.id, target.id, "continuation");
  doc.nodes = [source, target];
  doc.edges = [edge];
  await service.ctx.flowspace.save(doc);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openCanvas(page, url);
    const geom = route(endpoint(doc, source.id, "continuation", "out", false, new Set()),
      endpoint(doc, target.id, "continuation", "in", false, new Set()), { mode: "overlap" });
    const start = geom.legs[0][0], end = geom.legs[0].at(-1);
    const point = { x: start.x + (end.x - start.x) * 0.25, y: start.y + (end.y - start.y) * 0.25 };
    const rect = await page.locator(".fs-viewport").boundingBox();
    const x = rect.x + doc.viewport.x + point.x * doc.viewport.zoom;
    const y = rect.y + doc.viewport.y + point.y * doc.viewport.zoom;
    await page.mouse.move(x, y);
    await page.waitForFunction(() => document.querySelector(".edge-tag.edge-spotlight"));
    await page.mouse.click(x, y);
    await page.waitForFunction(() => document.querySelector(".edge-tag.selected"));
    await page.mouse.dblclick(x, y);
    await page.locator(".waypoint").waitFor();
    for (let attempt = 0; attempt < 40 && service.ctx.flowspace.snapshot().document.edges[0].waypoints?.length !== 1; attempt++) {
      await page.waitForTimeout(50);
    }
    assert.equal(service.ctx.flowspace.snapshot().document.edges[0].waypoints?.length, 1);
    await page.keyboard.press("Control+z");
    await page.locator(".waypoint").waitFor({ state: "detached" });
    await page.mouse.click(x, y, { button: "right" });
    await page.getByText(/^(添加中继点|Add Waypoint|Add waypoint)$/).last().click();
    await page.locator(".waypoint").waitFor();
    await page.keyboard.press("Control+z");
    await page.locator(".waypoint").waitFor({ state: "detached" });
    await page.mouse.click(x, y, { button: "right" });
    await page.getByText(/^(删除连线|Delete Connection|Delete connection)$/).last().click();
    await page.waitForFunction(() => !document.querySelector(".edge-tag"));
    await page.keyboard.press("Control+z");
    await page.locator(".edge-tag").first().waitFor();
    return { hover: true, selection: true, doubleClickWaypoint: true, menuWaypoint: true, menuDelete: true, undo: true };
  } finally { await page.close(); }
}

export async function openCanvas(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const notice = page.getByRole("dialog").filter({ hasText: /预览版说明|preview release|preview notice/i });
  await page.locator(".fs-overview-canvas,.fs-world .node").first().waitFor();
  await page.waitForLoadState("networkidle");
  if (await notice.isVisible()) {
    await notice.getByRole("button", { name: /继续|continue/i }).click();
    await notice.waitFor({ state: "hidden" });
  }
  await page.waitForTimeout(700);
  assert.equal(await page.locator("dialog[open]:visible,[role=dialog]:visible").count(), 0);
}

export async function dragSample(page, kind, cancel = false) {
  return page.evaluate(async ({ kind, cancel }) => {
    const selector = { node: ".fs-card-slot:not([hidden]) .node-header", group: ".workflow-group .group-header", pan: ".fs-viewport" }[kind];
    const element = document.querySelector(selector) ?? (kind === "node" ? document.querySelector(".node-header") : null);
    if (!element) throw new Error(`Missing ${kind} drag target`);
    const card = element.closest("[data-node-card],.workflow-group");
    const before = card?.style.left;
    const point = element.getBoundingClientRect();
    const startX = point.left + 35, startY = point.top + 13;
    const fire = (target, type, dx, dy) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 82, pointerType: "mouse", isPrimary: true,
      button: 0, buttons: type === "pointerup" ? 0 : 1, ctrlKey: true, clientX: startX + dx, clientY: startY + dy,
    }));
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const intervals = [];
    let last = await frame();
    fire(element, "pointerdown", 0, 0);
    for (let step = 1; step <= 20; step++) {
      fire(window, "pointermove", step * 4, step * 2);
      const now = await frame();
      intervals.push(now - last);
      last = now;
    }
    if (cancel) window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }));
    else fire(window, kind === "pan" ? "pointercancel" : "pointerup", 96, 48);
    await frame();
    await frame();
    const after = card?.style.left;
    if (kind !== "pan" && (cancel ? before !== after : before === after)) throw new Error(`${kind} drag ended at ${after}, initially ${before}`);
    if (!cancel && kind !== "pan") {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
      await frame();
      await frame();
      if (card.style.left !== before) throw new Error(`${kind} undo failed to restore ${before}`);
    }
    return intervals;
  }, { kind, cancel });
}

export async function lodDragSample(page, kind, cancel = false) {
  return page.evaluate(async ({ kind, cancel }) => {
    const viewport = document.querySelector(".fs-viewport");
    const canvas = document.querySelector(".fs-overview-canvas");
    const read = () => canvas.overviewSnapshot();
    const snapshot = read();
    const { camera } = snapshot;
    const rect = viewport.getBoundingClientRect();
    const candidates = kind === "group" ? snapshot.groups : snapshot.cards.filter(card => card.kind === "node");
    const target = candidates.find(card => {
      const x = camera.x + (card.box.x + 70) * camera.zoom;
      const y = camera.y + (card.box.y + (kind === "group" ? 13 : card.box.h / 2)) * camera.zoom;
      return x > 20 && y > 20 && x < rect.width - 30 && y < rect.height - 30;
    });
    if (!target) throw new Error(`Missing Canvas ${kind} drag target`);
    const position = () => kind === "group" ? read().groups.find(group => group.id === target.id)?.box : read().nodes.find(node => node.id === target.id);
    const before = position();
    const startX = rect.left + camera.x + (target.box.x + 70) * camera.zoom;
    const startY = rect.top + camera.y + (target.box.y + (kind === "group" ? 13 : target.box.h / 2)) * camera.zoom;
    const fire = (element, type, dx, dy) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 83, pointerType: "mouse", isPrimary: true,
      button: 0, buttons: type === "pointerup" ? 0 : 1, ctrlKey: true, clientX: startX + dx, clientY: startY + dy,
    }));
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const intervals = [];
    let last = await frame();
    fire(viewport, "pointerdown", 0, 0);
    for (let step = 1; step <= 20; step++) {
      fire(window, "pointermove", step * 4, step * 2);
      const now = await frame();
      intervals.push(now - last);
      last = now;
    }
    if (cancel) window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }));
    else fire(window, "pointerup", 80, 40);
    await frame(); await frame();
    const after = position();
    const same = point => Math.abs(point.x - before.x) < 0.01 && Math.abs(point.y - before.y) < 0.01;
    if (!after || (cancel ? !same(after) : same(after))) throw new Error(`Canvas ${kind} ${cancel ? "cancel" : "commit"} failed`);
    const keyTarget = () => document.activeElement ?? window;
    if (!cancel) {
      if (Math.abs(after.x - before.x - 80 / camera.zoom) > 1 || Math.abs(after.y - before.y - 40 / camera.zoom) > 1) {
        throw new Error(`Canvas ${kind} coordinate delta does not match pointer movement`);
      }
      keyTarget().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
      await frame(); await frame();
      if (!same(position())) throw new Error(`Canvas ${kind} single-step undo failed ${JSON.stringify({ before, after: position(), focus: document.activeElement?.outerHTML.slice(0, 180) })}`);
    }
    keyTarget().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    await frame(); await frame();
    return intervals;
  }, { kind, cancel });
}

export async function verifyOverviewStage(browser, service, url, directory) {
  const doc = emptyDocument();
  doc.viewport = { x: 100, y: 100, zoom: 0.28 };
  doc.prefs = { filter: "all", wireRouting: "overlap", showBranches: false, showWorktrees: false };
  const source = { ...newNode("agent", 80, 160, "Canvas source 中文换行测试"), expanded: false };
  const target = { ...newNode("agent", 760, 160, "Canvas target"), expanded: false };
  const group = { ...newNode("group", 20, 60, "Canvas drag group"), width: 1160, height: 350 };
  source.parentId = group.id;
  target.parentId = group.id;
  doc.nodes = [source, target, group, ...Array.from({ length: 67 }, (_, index) => newNode("note", 4000 + index * 320, 2000, `Remote ${index}`))];
  await service.ctx.flowspace.save(doc);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openCanvas(page, url);
    const point = async (id, port = false) => page.evaluate(({ id, port }) => {
      const scene = document.querySelector(".fs-overview-canvas").overviewSnapshot();
      const card = scene.cards.find(card => card.id === id);
      const rect = document.querySelector(".fs-viewport").getBoundingClientRect();
      const socket = port && card.ports.find(p => p.kind === "continuation" && p.direction === port);
      return { x: rect.left + scene.camera.x + (card.box.x + (socket ? socket.x : card.box.w / 2)) * scene.camera.zoom,
        y: rect.top + scene.camera.y + (card.box.y + (socket ? socket.y : card.box.h / 2)) * scene.camera.zoom };
    }, { id, port });
    const origin = await point(source.id);
    await page.mouse.move(origin.x, origin.y);
    await page.locator(`.fs-overview-actions[data-overview-node="${source.id}"]`).waitFor();
    assert.ok(await page.locator(".fs-overview-port").count() >= 2);
    await page.mouse.click(origin.x, origin.y);
    await page.locator(`.fs-overview-focus[aria-label="${source.title}"]`).waitFor();
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.activeElement?.closest(".fs-overview-actions"));
    await page.locator(".fs-overview-focus").focus();
    const nodeCount = await page.locator(".fs-overview-canvas").evaluate(canvas => canvas.overviewSnapshot().nodes.length);
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    await page.waitForFunction(count => document.querySelector(".fs-overview-canvas").overviewSnapshot().nodes.length === count + 1, nodeCount);
    await page.keyboard.press("Control+z");
    await page.waitForFunction(count => document.querySelector(".fs-overview-canvas").overviewSnapshot().nodes.length === count, nodeCount);
    await page.mouse.click(origin.x, origin.y);
    await page.keyboard.press("Enter");
    await page.locator(`[data-node-card="${source.id}"].full`).waitFor();
    await page.keyboard.press("Delete");
    await page.locator(`[data-node-card="${source.id}"]`).waitFor({ state: "detached" });
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Escape");
    await page.locator(`[data-node-card="${source.id}"]`).waitFor({ state: "detached" });
    await page.mouse.dblclick(origin.x, origin.y);
    await page.locator(`[data-node-card="${source.id}"].full`).waitFor();
    await page.keyboard.press("Escape");
    await page.locator(`[data-node-card="${source.id}"]`).waitFor({ state: "detached" });
    await lodDragSample(page, "node");
    await lodDragSample(page, "node", true);
    await lodDragSample(page, "group");
    await lodDragSample(page, "group", true);
    const current = await point(source.id);
    await page.mouse.click(current.x, current.y, { button: "right" });
    await page.locator(".fs-menu").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".fs-menu").waitFor({ state: "detached" });
    await page.keyboard.press("Escape");
    await page.locator(`[data-node-card="${source.id}"]`).waitFor({ state: "detached" });
    const output = await point(source.id, "out"), input = await point(target.id, "in");
    await page.mouse.move(output.x, output.y);
    await page.mouse.down();
    await page.mouse.move(input.x, input.y, { steps: 8 });
    await page.mouse.up();
    for (let attempt = 0; attempt < 80 && !service.ctx.flowspace.snapshot().document.edges.length; attempt++) await page.waitForTimeout(50);
    assert.equal(service.ctx.flowspace.snapshot().document.edges.filter(edge => edge.source === source.id && edge.target === target.id).length, 1);
    await page.keyboard.press("Control+z");
    const zoomTo = async (from, to) => {
      await page.locator(".fs-viewport").evaluate((element, delta) => {
        const rect = element.getBoundingClientRect();
        element.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: delta, clientX: rect.left + 200, clientY: rect.top + 180 }));
      }, Math.log(from / to) / 0.009);
      await page.waitForFunction(expected => document.querySelector(".zoom-label")?.textContent === `${expected}%` && !document.querySelector(".fs-world[data-moving]"), to);
    };
    const rasters = await page.locator(".fs-overview-canvas").getAttribute("data-rasterizations");
    await zoomTo(28, 42);
    await zoomTo(42, 28);
    assert.equal(await page.locator(".fs-overview-canvas").getAttribute("data-rasterizations"), rasters);
    await zoomTo(28, 86);
    await reverseZoom(page, directory, "overview-reversal.png");
    await page.waitForFunction(() => document.querySelector(".fs-overview-canvas")?.getAttribute("data-visible-cards") === "0");
    assert.equal(await page.locator(".fs-overview-canvas").getAttribute("data-visible-cards"), "0");
    assert.equal(await page.locator(".fs-card-slot:not([hidden]) > .node").count(), new Set(await page.locator(".fs-card-slot:not([hidden]) > .node").evaluateAll(nodes => nodes.map(node => node.dataset.nodeCard))).size);
    return { hoverPorts: true, keyboardDeleteUndo: true, doubleClickExpand: true, dragCancelUndo: true,
      contextMenu: true, portConnection: true, reverseZoom: true, atlasZoomReuse: true, clipboardAndTab: true };
  } catch (error) {
    await page.screenshot({ path: join(directory, "overview-stage-failure.png") });
    throw error;
  } finally { await page.close(); }
}

export async function reverseZoom(page, directory, name = "museum-reversal.png") {
  const world = page.locator(".fs-world");
  const viewport = page.locator(".fs-viewport");
  const wheel = delta => viewport.evaluate((element, value) => {
    const box = element.getBoundingClientRect();
    element.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true,
      deltaY: value, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 }));
  }, delta);
  const compact = () => world.evaluate(element => element.classList.contains("semantic-zoom"));
  await wheel(67);
  await page.waitForFunction(() => document.querySelector(".fs-world.semantic-zoom"));
  await wheel(-10);
  await page.waitForFunction(() => !document.querySelector(".fs-world.semantic-zoom"));
  await wheel(10);
  await page.waitForFunction(() => document.querySelector(".fs-world.semantic-zoom"));
  await page.screenshot({ path: join(directory, name) });
  assert.ok(await compact());
  await wheel(-67);
  await page.waitForFunction(() => document.querySelector(".zoom-label")?.textContent === "86%" && !document.querySelector(".fs-world[data-moving]"));
}

export async function verifyNative(browser, service, url, directory) {
  const document = emptyDocument();
  const worker = { ...newNode("agent", 40, 50, "Session continuity"), expanded: true, tab: "conversation", cwd: service.workspace };
  document.nodes = [worker, { ...newNode("note", 1500, 100, "Offscreen note"), expanded: true }];
  document.viewport = { x: 16, y: 24, zoom: 0.86 };
  await service.ctx.flowspace.save(document);
  const { sessionId } = await service.ctx.flowspace.bind({ nodeId: worker.id });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openCanvas(page, url);
    const card = page.locator(`[data-node-card="${worker.id}"]:visible`);
    const editor = card.locator(".fs-embedded textarea,.fs-embedded [contenteditable=true]").first();
    await editor.waitFor({ timeout: 25000 });
    const draft = "FlowSpace unsent draft";
    await editor.fill(draft);
    const checkDraft = () => editor.evaluate(el => el.value ?? el.textContent);
    const handle = await editor.elementHandle();
    await page.locator(".fs-viewport").evaluate(viewport => {
      viewport.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: 75, clientX: 230, clientY: 210 }));
    });
    await page.waitForFunction(() => document.querySelector(".fs-world")?.classList.contains("semantic-zoom"));
    assert.ok(await card.evaluate(el => el.classList.contains("full")));
    assert.equal(await checkDraft(), draft);
    assert.ok(await handle.evaluate(el => el === document.activeElement));
    await editor.evaluate(el => el.blur());
    await page.locator(".fs-viewport").evaluate(viewport => {
      viewport.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -75, clientX: 230, clientY: 210 }));
    });
    await page.waitForFunction(() => !document.querySelector(".fs-world").classList.contains("semantic-zoom"));
    await page.locator(".fs-viewport").evaluate(async viewport => {
      const send = (target, type, x) => target.dispatchEvent(new PointerEvent(type, { pointerId: 34, isPrimary: true,
        bubbles: true, cancelable: true, pointerType: "mouse", button: 0, buttons: 1, clientX: x, clientY: 350 }));
      send(viewport, "pointerdown", 650);
      send(window, "pointermove", -2500);
      await new Promise(resolve => setTimeout(resolve, 750));
    });
    assert.ok(await handle.evaluate(el => el.isConnected));
    await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 34 })));
    await editor.waitFor();
    assert.equal(await checkDraft(), draft);
    await editor.fill("FLOWSPACE_APPROVAL canvas performance smoke");
    await editor.press("Enter");
    const allow = page.getByRole("button", { name: /允许一次|allow once/i }).first();
    await allow.waitFor({ timeout: 25000 });
    await page.screenshot({ path: join(directory, "native-approval.png") });
    await allow.click();
    await page.waitForFunction(() => document.querySelector(".fs-embedded")?.textContent.includes("【测试模型】"), undefined, { timeout: 25000 });
    assert.ok(service.ctx.flowspace.snapshot().runs.some(run => run.origin === "canvas"));
    await card.getByRole("button", { name: /弹出为浮窗|open.*window/i }).first().click({ force: true });
    await page.locator(".floating-window .fs-embedded").waitFor();
    await page.locator(".window-stub button").click({ force: true });
    await editor.waitFor();
    await editor.fill(draft);
    await page.waitForFunction(() => document.querySelector(".fs-root") !== null);
    const deadline = Date.now() + 10000;
    while (service.ctx.flowspace.snapshot().document.nodes.find(node => node.id === worker.id)?.draft !== draft && Date.now() < deadline) {
      await page.waitForTimeout(100);
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await editor.waitFor();
    assert.equal(await checkDraft(), draft);
    assert.equal(service.ctx.flowspace.snapshot().document.nodes.find(node => node.id === worker.id)?.sessionId, sessionId);
    return { focusedZoom: true, offscreenMounted: true, approval: true, canvasOrigin: true, floating: true, reloadDraft: true };
  } catch (error) {
    console.log("PERF native UI", (await page.locator("body").innerText()).slice(-850));
    await page.screenshot({ path: join(directory, "native-failure.png") });
    throw error;
  } finally { await page.close(); }
}

export async function verifyNativeLarge(browser, service, url, directory) {
  const doc = emptyDocument();
  const worker = { ...newNode("agent", 40, 50, "Large canvas session"), tab: "conversation", cwd: service.workspace };
  const draftNode = newNode("agent", 540, 50, "Unbound task");
  doc.nodes = [worker, draftNode, ...Array.from({ length: 68 }, (_, index) =>
    newNode("agent", index % 10 * 500, 600 + Math.floor(index / 10) * 520, `Agent ${index + 3}`))];
  doc.viewport = { x: 16, y: 24, zoom: 0.86 };
  const host = service.ctx.flowspace;
  await host.save(doc);
  const { sessionId } = await host.bind({ nodeId: worker.id });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const draft = "Large canvas unsent draft";
  const editorSelector = ".fs-embedded textarea,.fs-embedded [contenteditable=true]";
  const card = page.locator(`[data-node-card="${worker.id}"]:visible`);
  const unbound = page.locator(`[data-node-card="${draftNode.id}"]`);
  const editor = card.locator(editorSelector).first();
  const viewport = page.locator(".fs-viewport");
  const allow = page.getByRole("button", { name: /允许一次|allow once/i }).first();
  const value = element => element.value ?? element.textContent;
  const focused = element => element === document.activeElement;
  const metrics = element => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height, boxSizing: getComputedStyle(element).boxSizing };
  };
  const verifyBox = (initial, next) => {
    assert.ok(initial.width > 0 && initial.height > 0 && next.width > 0 && next.height > 0);
    assert.equal(next.boxSizing, initial.boxSizing);
  };
  const zoomTo = async (from, to) => {
    await viewport.evaluate((element, deltaY) => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true, cancelable: true, ctrlKey: true, deltaY, clientX: rect.left + 210, clientY: rect.top + 100,
      }));
    }, Math.log(from / to) / 0.009);
    await page.waitForFunction(zoom => document.querySelector(".zoom-label")?.textContent === `${zoom}%` &&
      !document.querySelector(".fs-world[data-moving]"), to);
  };
  const panAway = () => viewport.evaluate(element => {
    const dispatch = (target, type, dx) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 52, pointerType: "mouse", isPrimary: true,
      button: 0, buttons: 1, clientX: 700 + dx, clientY: 330,
    }));
    dispatch(element, "pointerdown", 0);
    dispatch(window, "pointermove", -2900);
  });
  const panBack = () => page.evaluate(() => window.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 52 })));

  try {
    await openCanvas(page, url);
    assert.equal(await page.locator(".fs-camera").getAttribute("data-raster"), "true");
    await editor.waitFor({ timeout: 25000 });
    const scrollMessage = "Scroll fixture\n" + "A line in the retained conversation.\n".repeat(34);
    await editor.fill(scrollMessage);
    await editor.press("Enter");
    await card.getByText(/【测试模型】/).first().waitFor({ timeout: 25000 });
    await editor.fill(draft);
    const handle = await editor.elementHandle();
    const inputBox = await editor.evaluate(metrics);
    await zoomTo(86, 44);
    await zoomTo(44, 28);
    assert.ok(await card.evaluate(element => element.classList.contains("full")));
    assert.ok(await handle.evaluate(focused));
    assert.equal(await handle.evaluate(value), draft);
    verifyBox(inputBox, await editor.evaluate(metrics));

    const scroll = await card.locator(".fs-embedded").evaluateHandle(embedded =>
      [...embedded.querySelectorAll("div")].find(element =>
        element.clientHeight > 40 && element.scrollHeight > element.clientHeight + 30 &&
        ["auto", "scroll"].includes(getComputedStyle(element).overflowY)));
    const scrollTop = await scroll.evaluate(element => {
      if (!element) throw new Error("Fixture conversation did not overflow");
      element.scrollTop = Math.min(90, element.scrollHeight - element.clientHeight - 4);
      return element.scrollTop;
    });
    assert.ok(scrollTop > 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await editor.blur();
    await zoomTo(28, 42);
    await zoomTo(42, 28);
    assert.ok(await handle.evaluate(element => element.isConnected && element.closest(".fs-card-slot").hidden));
    await panAway();
    await page.waitForTimeout(750);
    assert.ok(await handle.evaluate(element => element.isConnected && element.closest(".fs-card-slot").hidden));
    await panBack();
    await zoomTo(28, 86);
    assert.ok(await editor.evaluate((element, original) => element === original, handle));
    assert.equal(await handle.evaluate(value), draft);
    assert.equal(await scroll.evaluate(element => element.scrollTop), scrollTop, "Native conversation scroll after overview");

    const task = unbound.locator(".task-editor");
    const taskText = "Draft kept when its overview body is discarded";
    await task.fill(taskText);
    await zoomTo(86, 44);
    assert.ok(await task.evaluate(focused));
    assert.ok(await unbound.evaluate(element => element.classList.contains("full")));
    assert.equal(await task.inputValue(), taskText);
    const taskHandle = await task.elementHandle();
    await task.blur();
    await zoomTo(44, 42);
    await zoomTo(42, 44);
    assert.equal(await unbound.count(), 0);
    assert.equal(await taskHandle.evaluate(element => element.isConnected), false);
    await zoomTo(44, 86);
    assert.equal(await task.inputValue(), taskText);
    await task.press("Control+End");
    await task.press("!");
    assert.equal(await task.inputValue(), taskText + "!");

    const approvalText = "FLOWSPACE_APPROVAL large canvas";
    await editor.fill(approvalText);
    await editor.press("Enter");
    await allow.waitFor({ timeout: 25000 });
    const approvalBox = await allow.evaluate(metrics);
    await zoomTo(86, 28);
    await panAway();
    await page.waitForTimeout(750);
    await panBack();
    await zoomTo(28, 86);
    await allow.waitFor({ timeout: 25000 });
    verifyBox(approvalBox, await allow.evaluate(metrics));
    await page.screenshot({ path: join(directory, "native-large-approval.png") });
    await allow.click();
    await card.getByText(/【测试模型】.*FLOWSPACE_APPROVAL large canvas/).first().waitFor({ timeout: 25000 });
    assert.ok(host.snapshot().runs.some(run => run.origin === "canvas" && run.state === "completed"));

    await card.getByRole("button", { name: /弹出为浮窗|open.*window/i }).first().click({ force: true });
    const floatingEditor = page.locator(`.floating-window[data-node-card="${worker.id}"]`).locator(editorSelector).first();
    await floatingEditor.fill(draft);
    const floatingHandle = await floatingEditor.elementHandle();
    await zoomTo(86, 28);
    await dragSample(page, "pan");
    await zoomTo(28, 86);
    assert.ok(await floatingHandle.evaluate(focused));
    assert.equal(await floatingHandle.evaluate(value), draft);
    await page.locator(".window-stub button").click({ force: true });
    await editor.waitFor();
    assert.equal(await editor.evaluate(value), draft);
    const deadline = Date.now() + 10000;
    while (host.snapshot().document.nodes.find(node => node.id === worker.id)?.draft !== draft && Date.now() < deadline) {
      await page.waitForTimeout(100);
    }
    assert.equal(host.snapshot().document.nodes.find(node => node.id === worker.id)?.draft, draft);
    await page.reload({ waitUntil: "domcontentloaded" });
    await editor.waitFor();
    assert.equal(await editor.evaluate(value), draft);
    assert.equal(host.snapshot().document.nodes.find(node => node.id === worker.id)?.sessionId, sessionId);
    return {
      focusedZoomLarge: true, compactKeepMounted: true, unboundDraftRoundtrip: true,
      approvalAcrossZoom: true, floatingUnderMotion: true, embeddedStyleIsolation: true,
    };
  } catch (error) {
    await page.screenshot({ path: join(directory, "native-large-failure.png") });
    throw error;
  } finally {
    await page.close();
  }
}
