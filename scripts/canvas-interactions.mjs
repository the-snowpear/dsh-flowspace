import assert from "node:assert/strict";
import { join } from "node:path";
import { emptyDocument, newNode } from "../packages/flowspace/src/core/document.ts";

export async function openCanvas(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const notice = page.getByRole("dialog").filter({ hasText: /预览版说明|preview release|preview notice/i });
  await page.locator(".fs-world .node").first().waitFor();
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
    fire(window, cancel || kind === "pan" ? "pointercancel" : "pointerup", 96, 48);
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

export async function reverseZoom(page, directory) {
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
  await page.screenshot({ path: join(directory, "museum-reversal.png") });
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
