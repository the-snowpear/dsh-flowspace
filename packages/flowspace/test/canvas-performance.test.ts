import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { applyGeometry, byId, indexNodes, intersects, reuseRunHistory, runtimeIndex, shareSnapshotValue } from "../src/client/sceneModel.ts";
import { buildGuideRoute, buildRoutingResult, cachedPath2D, edgeRouteTask, guidePathInArea, obstacleDelta, pathExtent, RouteObstacles, sampleWirePath, SceneWires } from "../src/client/sceneWires.ts";
import { wireMeshFromPath } from "../src/client/wireFlowMesh.ts";
import { WireImageCache } from "../src/client/canvas/wireImageCache.ts";
import { wireInk } from "../src/client/canvas/wireCanvasPalette.ts";
import { createCanvasInteractionStore } from "../src/client/canvas/interactionStore.ts";
import { route, routePath } from "../src/client/wireRouting.ts";
import type { FlowspaceRun, RunStep } from "../src/types.ts";
import { OverviewCardAtlas, overviewTextLines, type OverviewPalette, type OverviewVisual } from "../src/client/canvas/OverviewCardAtlas.ts";
import { overviewGroupBox, shouldRenderDomInLod } from "../src/client/canvas/overviewScene.ts";
import { CanvasPointerDispatcher } from "../src/client/canvas/CanvasPointerDispatcher.ts";
import { BoxIndex } from "../src/client/boxIndex.ts";
import { typeScaleFor } from "../src/client/canvas/viewportMath.ts";

test("overview atlas keeps persistent pages across zoom, drag, and LRU eviction", () => {
  const original = globalThis.OffscreenCanvas;
  let allocated = 0;
  const context = { save() {}, restore() {}, resetTransform() {}, clearRect() {}, setTransform() {},
    beginPath() {}, roundRect() {}, fill() {}, stroke() {}, arc() {}, fillText() {}, clip() {}, moveTo() {}, lineTo() {},
    measureText: (text: string) => ({ width: Array.from(text).length * 12 }) };
  class Surface {
    constructor(public width: number, public height: number) { allocated++; }
    getContext() { return context; }
  }
  globalThis.OffscreenCanvas = Surface as unknown as typeof OffscreenCanvas;
  const palette: OverviewPalette = { surface: "#fff", border: "#eee", text: "#111", secondary: "#555", accent: "blue",
    running: "green", amber: "orange", red: "red", green: "green", font: "sans-serif", kinds: { agent: "blue" } };
  const visual: OverviewVisual = { title: "中文 Agent", detail: "Agent · Draft", icon: "agent", kind: "agent", status: "draft", width: 280, height: 118, ports: [] };
  try {
    const atlas = new OverviewCardAtlas(palette, 1);
    const tile = atlas.get(visual, typeScaleFor(0.28));
    for (let round = 0; round < 6; round++) {
      assert.equal(atlas.get({ ...visual }, typeScaleFor(0.42)), tile);
      assert.equal(atlas.get(visual, typeScaleFor(0.28)), tile);
    }
    assert.equal(atlas.rasterizations, 1);
    assert.notEqual(atlas.get({ ...visual, status: "running" }, 2.2), tile);
    for (let index = 0; index < 2200; index++) atlas.get({ ...visual, title: String(index) }, 2.2);
    assert.equal(allocated, 4);
    assert.equal(atlas.pageCount, 4);
    const oldCount = atlas.rasterizations;
    atlas.invalidateAll(palette, 2);
    atlas.get(visual, 2.2);
    assert.equal(atlas.rasterizations, oldCount + 1);
    assert.equal(allocated, 4);
    atlas.dispose();
    assert.equal(tile.page.canvas.width, 0);
  } finally { globalThis.OffscreenCanvas = original; }
});

test("overview text wraps CJK and Latin words and caps the final line", () => {
  const measure = (text: string) => Array.from(text).length;
  assert.deepEqual(overviewTextLines("中文标题继续换行", 4, measure), ["中文标题", "继续换行"]);
  assert.deepEqual(overviewTextLines("中文标题继续换行再多", 4, measure), ["中文标题", "继续换…"]);
  assert.deepEqual(overviewTextLines("Agent sample title", 12, measure), ["Agent sample", "title"]);
  assert.deepEqual(overviewTextLines("一行标题太长", 4, measure, 1), ["一行标…"]);
});

test("overview hit dispatch gives ports precedence and bounds screen-space tolerance", () => {
  const index = new BoxIndex<string>();
  const node = newNode("agent", 10, 20, "Hit target");
  const card = { id: node.id, node, box: { x: 10, y: 20, w: 280, h: 118 }, kind: "node" as const,
    visual: { title: node.title, detail: "Agent", icon: "agent", kind: "agent", status: "draft", width: 280, height: 118,
      ports: [{ kind: "continuation" as const, direction: "in" as const, id: "in", x: 0, y: 22, linked: true }] } };
  index.set(node.id, card.box);
  const hit = new CanvasPointerDispatcher({ index, cards: new Map([[node.id, card]]) }, [{ id: "group", box: { x: 0, y: 0, w: 400, h: 250 } }]);
  assert.equal(hit.cardAt({ x: -30, y: 42 }, 0.28)?.port?.id, "in");
  assert.equal(hit.cardAt({ x: -35, y: 42 }, 0.28), undefined);
  assert.equal(hit.cardAt({ x: 150, y: 90 }, 0.28)?.card.id, node.id);
  assert.equal(hit.cardAt({ x: 150, y: 90 }, 0.28)?.port, undefined);
  assert.equal(hit.groupAt({ x: 330, y: 20 }), "group");
  assert.equal(hit.groupAt({ x: 330, y: 80 }), undefined);
});

test("wire image caches reuse overview zooms, retain LRU coverage, and bound backing surfaces", () => {
  const original = globalThis.OffscreenCanvas;
  let allocated = 0;
  class Surface {
    constructor(public width: number, public height: number) { allocated++; }
    getContext() { return { resetTransform() {}, clearRect() {}, setTransform() {} }; }
  }
  globalThis.OffscreenCanvas = Surface as unknown as typeof OffscreenCanvas;
  try {
    const cache = new WireImageCache();
    const scene = {};
    let paints = 0;
    const paint = () => { paints++; };
    const area = (zoom: number, x = 0) => ({ x, y: 0, w: 1440 / zoom, h: 900 / zoom });
    const overview = cache.get(scene, "dark", area(0.28), 0.28, 1, paint);
    for (let round = 0; round < 6; round++) {
      assert.equal(cache.get(scene, "dark", area(0.42), 0.42, 1, paint), overview);
      assert.equal(cache.get(scene, "dark", area(0.28, -80 / 0.28), 0.28, 1, paint), overview);
    }
    assert.equal(paints, 1);
    const detail = cache.get(scene, "dark", area(0.86), 0.86, 1, paint);
    assert.notEqual(detail, overview);
    assert.equal(cache.get(scene, "dark", area(0.28), 0.28, 1, paint), overview);
    for (let i = 0; i < 8; i++) {
      const image = cache.get({}, "light", area(0.28, i * 3000), 0.28, 3, paint);
      assert.ok(image.canvas.width <= 2560 && image.canvas.height <= 2560);
    }
    assert.equal(allocated, 4);
    cache.dispose();
  } finally { globalThis.OffscreenCanvas = original; }
});

test("wire hit testing resolves the closest leg, respects tolerance and candidates, and removes invalid entries", () => {
  const scene = new SceneWires();
  const a = newEdge("a", "b", "continuation"), b = newEdge("c", "d", "reference");
  const end = (x: number, y: number) => ({ x, y, box: { x, y, w: 0, h: 0 } });
  scene.update([], [a, b]);
  const entry = scene.get(a, end(0, 0), end(200, 0), "overlap");
  scene.get(b, end(0, 12), end(200, 12), "overlap");
  assert.equal(cachedPath2D(entry), undefined);
  assert.equal(scene.hitTestEdge({ x: 70, y: 5 }, 4), null);
  assert.deepEqual(scene.hitTestEdge({ x: 70, y: 5 }, 5), { edgeId: a.id, distance: 5, worldPoint: { x: 70, y: 0 } });
  assert.equal(scene.hitTestEdge({ x: 70, y: 8 }, 9)?.edgeId, b.id);
  assert.equal(scene.hitTestEdge({ x: 70, y: 8 }, 9, new Set([a.id]))?.edgeId, a.id);
  assert.equal(scene.hitTestEdge({ x: 204, y: 0 }, 4)?.distance, 4);
  const curved = scene.get(a, end(0, 0), end(300, 240), "overlap");
  const point = curved.geom.legs[0][Math.floor(curved.geom.legs[0].length / 2)];
  assert.equal(scene.hitTestEdge(point, 0.01)?.edgeId, a.id);
  scene.update([], [b]);
  assert.equal(scene.hitTestEdge(point, 0.01), null);
});

test("mathematical wire meshes preserve arc length and produce finite caps for curves and degenerate routes", () => {
  const line = wireMeshFromPath("M 0 0 L 100 0", 0.25, 1)!;
  assert.equal(line.strip[5], 100);
  assert.equal(line.strip[4], 0.25);
  assert.equal(line.strip[6], 1);
  assert.equal(line.strip[0], -8);
  const curve = "M 0 0 C 0 100 100 100 100 0";
  const samples = sampleWirePath(curve);
  assert.ok(Math.abs(samples.at(-1)!.distance - 200) < 0.2);
  assert.deepEqual(samples[0].point, { x: 0, y: 0 });
  assert.deepEqual(samples.at(-1)!.point, { x: 100, y: 0 });
  const mesh = wireMeshFromPath(`${curve} Q 150 -50 200 0 L 200 0`, 0, 2)!;
  assert.ok([...mesh.strip].every(Number.isFinite));
  assert.ok(mesh.strip[5] > 300);
  assert.equal(wireMeshFromPath("M 4 6 L 4 6", 0, 0), undefined);
  assert.equal(wireMeshFromPath("M 4 6", 0, 0), undefined);
  assert.equal(wireMeshFromPath("", 0, 0), undefined);
});

test("canvas interaction channels notify only their own subscribers and stop on unsubscribe", () => {
  const store = createCanvasInteractionStore();
  const calls: string[] = [];
  const stopCamera = store.subscribeCamera(() => calls.push("camera"));
  const stopDrag = store.subscribeDrag(() => calls.push("drag"));
  const stopHover = store.subscribeHover(() => calls.push("hover"));
  const stopMarquee = store.subscribeMarquee(() => calls.push("marquee"));
  const stopHidden = store.subscribeHiddenEdgeIds(() => calls.push("hidden"));
  const drag = { mode: "node" as const, deltas: new Map(), affectedEdgeIds: new Set(["e1"]) };
  store.setCamera({ ...store.getCamera(), x: 9 });
  store.setDrag(drag);
  store.setDrag({ ...drag });
  store.setHover({ edgeId: "e1" });
  store.setHover({ edgeId: "e1" });
  store.setMarquee({ x: 1, y: 2, w: 3, h: 4 });
  assert.deepEqual(calls, ["camera", "hidden", "drag", "drag", "hover", "marquee"]);
  for (const unsubscribe of [stopCamera, stopDrag, stopHover, stopMarquee, stopHidden]) unsubscribe();
  store.setDrag(null);
  store.setHover({ edgeId: null });
  assert.equal(calls.length, 6);
  assert.equal(store.getHiddenEdgeIds().size, 0);
});

test("worker edge routing matches a direct route after obstacle deltas and rejects stale corridors", () => {
  const edge = { ...newEdge("source", "target", "continuation"), waypoints: [{ x: 400, y: -80 }] };
  const from = { x: 280, y: 24, box: { x: 0, y: 0, w: 280, h: 120 } };
  const to = { x: 840, y: 24, box: { x: 840, y: 0, w: 280, h: 120 } };
  const barrier = { x: 500, y: -40, w: 130, h: 180 };
  const initial = [from.box, to.box];
  const next = [...initial, barrier];
  const workerObstacles = new RouteObstacles();
  const cache = new SceneWires();
  const task = edgeRouteTask(edge, from, to, "avoid");
  cache.update(initial, [edge]);
  workerObstacles.apply(obstacleDelta([], initial));
  const revision = cache.obstacleRevision;
  const old = buildRoutingResult(task, workerObstacles);
  assert.equal(old.kind, "edge");
  cache.update(next, [edge]);
  workerObstacles.apply(obstacleDelta(initial, next));
  assert.equal(cache.acceptEdgeRoute(edge.id, task.key, old, revision), false);
  const result = buildRoutingResult(task, workerObstacles);
  assert.equal(result.kind, "edge");
  assert.equal(JSON.stringify(result.geom), JSON.stringify(route(from, to, { mode: "avoid", waypoints: edge.waypoints, obstacles: next })));
  assert.equal(cache.acceptEdgeRoute(edge.id, "other endpoint", result, cache.obstacleRevision), false);
  assert.equal(cache.acceptEdgeRoute(edge.id, task.key, result, cache.obstacleRevision), true);
  assert.equal(cache.get(edge, from, to, "avoid"), result);
});

test("snapshot reconciliation follows IDs across reordering and retains unchanged branches", () => {
  const doc = emptyDocument();
  doc.nodes = [newNode("agent", 0, 0, "A"), newNode("note", 700, 0, "N")];
  const next = structuredClone(doc);
  next.nodes.reverse();
  next.nodes[1].title = "A2";
  const result = shareSnapshotValue(doc, next);
  assert.equal(result.nodes[0], doc.nodes[1]);
  assert.equal(result.edges, doc.edges);
  assert.equal(result.nodes[1].title, "A2");
  assert.equal(doc.nodes[0].title, "A");
  assert.equal(shareSnapshotValue(doc, structuredClone(doc)), doc);
});

test("geometry previews preserve unrelated edits, nested ownership and the base document", () => {
  const doc = emptyDocument();
  const outer = { ...newNode("group", 0, 0, "Outer"), collapsed: true };
  const inner = { ...newNode("group", 30, 20, "Inner"), parentId: outer.id, collapsed: true };
  const worker = { ...newNode("agent", 50, 30, "Worker"), parentId: inner.id };
  doc.nodes = [outer, inner, worker];
  const index = indexNodes(doc.nodes);
  assert.equal(index.collapsed.get(worker.id), outer);
  assert.deepEqual(index.membersOf(outer.id), [worker]);
  const changes = { nodes: new Map([[worker.id, { x: 80 }]]) };
  const current = structuredClone(doc);
  current.nodes[2].draft = "concurrent edit";
  const moved = applyGeometry(current, changes);
  assert.equal(moved.nodes[2].draft, "concurrent edit");
  assert.equal(moved.nodes[2].x, 80);
  assert.equal(current.nodes[2].x, 50);
  assert.equal(moved.nodes[1], current.nodes[1]);
  assert.equal(applyGeometry(current, null), current);
});

test("incremental paths and labels match full routing as obstacles move in and out", () => {
  const edge = newEdge("source", "target", "continuation");
  const source = { x: 0, y: 40, w: 280, h: 118 };
  const target = { x: 850, y: 40, w: 280, h: 118 };
  const from = { x: 280, y: 61, box: source };
  const to = { x: 850, y: 61, box: target };
  for (const mode of ["avoid", "overlap"] as const) {
    const cache = new SceneWires();
    const ids = new Set(["structure"]);
    for (const x of [1600, 440, 510, 1800]) {
      const obstacles = [source, target, { x, y: 0, w: 260, h: 160 }];
      cache.update(obstacles, [edge], ids);
      const layout = cache.get(edge, from, to, mode);
      const reference = route(from, to, { mode, obstacles });
      assert.deepEqual(layout.geom, reference);
      assert.equal(cache.getPath("structure", from, to, mode).path, reference.path);
      assert.equal(routePath(from, to, { mode, obstacles }), reference.path);
      assert.equal(cache.get(edge, from, to, mode), layout);
    }
  }
  assert.ok(intersects(pathExtent("M -300 0 C -100 80, 100 80, 300 0"), { x: 0, y: 0, w: 12, h: 80 }));
});

test("waiting status is indexed against the captured run graph", () => {
  const document = emptyDocument();
  const node = newNode("agent", 0, 0, "A");
  document.nodes = [node];
  const edge = newEdge("upstream", node.id, "continuation");
  const run: FlowspaceRun = { id: "run", title: "", origin: "canvas", state: "waiting", createdAt: 0, scope: null,
    roots: [], participants: [], notes: [], steps: [], graph: { nodes: [node], edges: [edge] },
    tokens: [{ id: "gate", edgeId: edge.id, stepId: "s", createdAt: 0, consumed: false, dismissed: false, ready: false, boundary: true,
      source: { id: "context", kind: "text", sourceNodeId: "upstream", capturedAt: 0, title: "input", text: "wait" } }],
  };
  const index = runtimeIndex({ document, runs: [run], live: [] });
  assert.equal(index.statuses.get(node.id), "waiting");
  assert.equal(index.waiting.get(node.id)?.[0].token.id, "gate");
  assert.equal(index.waitingByEdge.get(edge.id), index.waiting.get(node.id)?.[0]);
  assert.equal(byId(document.edges).get(edge.id), undefined);
});

test("live-only snapshots reuse history and cards prefer the first awaiting step of the newest waiting run", () => {
  const document = emptyDocument();
  const node = newNode("agent", 0, 0, "A");
  document.nodes = [node];
  const step: RunStep = { id: "step", nodeId: node.id, requestId: "request", state: "awaiting",
    createdAt: 0, iteration: 1, task: "", sources: [] };
  const debug: RunStep = { ...step, id: "debug", debug: {
    reason: "breakpoint", tools: [], originalTask: "", continuation: false, references: [],
  } };
  const run: FlowspaceRun = { id: "run", title: "", origin: "canvas", createdAt: 0, state: "waiting",
    scope: null, roots: [], participants: [], notes: [], graph: { nodes: [node], edges: [] }, tokens: [], steps: [debug] };
  const waiting = { ...run, id: "later", steps: [step, debug, { ...debug, id: "second-debug" }] };
  const latest: FlowspaceRun = { ...run, id: "latest", steps: [{ ...step, state: "completed" }] };
  const snapshot = { document, runs: [run, waiting, latest], live: [] };
  const index = runtimeIndex(snapshot);
  assert.equal(index.latestRun.get(node.id), latest);
  assert.deepEqual(index.awaiting.get(node.id), { run: waiting, step });
  assert.deepEqual(index.breakpoints.get(node.id), { run: waiting, step: debug });
  const live = [{ nodeId: node.id, sessionId: "session", running: true, output: "new", seq: 1, pendingInput: [] }];
  const next = { ...snapshot, live };
  reuseRunHistory(snapshot, next);
  const refreshed = runtimeIndex(next);
  assert.equal(refreshed.steps, index.steps);
  assert.equal(refreshed.statuses.get(node.id), "running");
  assert.equal(runtimeIndex({ ...snapshot, runs: [latest] }).awaiting.has(node.id), false);
});

test("moving an obstacle preserves overlap guides but updates affected wire labels", () => {
  const cache = new SceneWires();
  const edge = newEdge("a", "b", "continuation");
  const a = { x: 0, y: 0, w: 280, h: 120 }, b = { ...a, x: 900 };
  const from = { x: 280, y: 25, box: a }, to = { x: 900, y: 25, box: b };
  const ids = new Set(["project"]);
  cache.update([a, b], [edge], ids);
  const guide = cache.getPath("project", from, to, "overlap");
  const original = cache.get(edge, from, to, "overlap");
  const obstacle = { x: original.geom.label.x - 55, y: 0, w: 110, h: 100 };
  const boxes = [a, b, obstacle];
  cache.update(boxes, [edge], ids);
  assert.equal(cache.getPath("project", from, to, "overlap"), guide);
  const updated = cache.get(edge, from, to, "overlap");
  assert.notDeepEqual(updated.geom.label, original.geom.label);
  assert.deepEqual(updated.geom, route(from, to, { mode: "overlap", obstacles: boxes }));
});

test("obstacle moves invalidate both ends of the move and retain distant workflow wires", () => {
  const cache = new SceneWires();
  const near = newEdge("left", "right", "continuation");
  const far = newEdge("above", "below", "continuation");
  const left = { x: -850, y: 0, w: 280, h: 100 };
  const right = { ...left, x: 250 };
  const above = { ...left, y: 5000 }, below = { ...right, y: 5000 };
  const obstacle = { ...left, x: -430, y: -240, h: 120 };
  const before = [left, right, above, below, obstacle];
  const after = [left, right, above, below, { ...obstacle, y: 0 }];
  const end = (box: typeof left, out: boolean) => ({ x: box.x + (out ? box.w : 0), y: box.y + 25, box });
  const edges = [near, far];
  cache.update(before, edges);
  const initial = cache.get(near, end(left, true), end(right, false), "avoid");
  const remote = cache.get(far, end(above, true), end(below, false), "avoid");
  assert.deepEqual([...cache.update(after, edges)], [near.id]);
  assert.notEqual(cache.get(near, end(left, true), end(right, false), "avoid").geom.path, initial.geom.path);
  assert.equal(cache.get(far, end(above, true), end(below, false), "avoid"), remote);
  assert.deepEqual([...cache.update(before, edges)], [near.id]);
  assert.equal(cache.get(near, end(left, true), end(right, false), "avoid").geom.path, initial.geom.path);
});

test("guide batches using obstacle deltas reproduce main-thread paths after consecutive moves", () => {
  const main = new SceneWires();
  const worker = new RouteObstacles();
  const origin = { x: -900, y: -100, w: 225, h: 74 };
  const target = { x: 800, y: 500, w: 280, h: 375 };
  const from = { x: origin.x + origin.w, y: origin.y + origin.h / 2, box: origin };
  const to = { x: target.x, y: target.y + target.h / 2, box: target };
  const task = main.guide("project", from, to, "avoid");
  let previous: typeof origin[] = [];
  for (const x of [0, 900, -600, 0]) {
    const boxes = [origin, target, { x, y: 30, w: 260, h: 600 }];
    main.update(boxes, [], new Set([task.id]));
    worker.apply(structuredClone(obstacleDelta(previous, boxes)));
    assert.deepEqual(buildGuideRoute(task, worker), main.getPath(task.id, from, to, "avoid"));
    previous = boxes;
  }
});

test("late guide results survive unrelated moves and leave stale or replaced routes untouched", () => {
  const cache = new SceneWires();
  const origin = { x: 0, y: 0, w: 220, h: 74 };
  const target = { x: 850, y: 500, w: 280, h: 118 };
  const far = { ...target, y: 5000 };
  const from = { x: origin.x + origin.w, y: origin.y + origin.h / 2, box: origin };
  const to = { x: target.x, y: target.y + target.h / 2, box: target };
  const task = cache.guide("project", from, to, "avoid");
  const ids = new Set([task.id]);
  cache.update([origin, target, far], [], ids);
  const original = buildGuideRoute(task, cache.obstacles);
  const revision = cache.obstacleRevision;

  const farMoved = { ...far, x: 940 };
  cache.update([origin, target, farMoved], [], ids);
  cache.acceptGuide(task, original, revision);
  assert.deepEqual(cache.lookupGuide(task), { path: original, current: true });

  const near = { x: 450, y: 40, w: 280, h: 375 };
  cache.update([origin, target, farMoved, near], [], ids);
  cache.acceptGuide(task, original, revision);
  assert.equal(cache.lookupGuide(task).current, false);

  const newTask = cache.guide(task.id, from, { ...to, y: to.y + 20 }, "avoid");
  cache.acceptGuide(newTask, original, cache.obstacleRevision);
  assert.equal(cache.lookupGuide(newTask).current, false);
  const exact = cache.getPath(newTask.id, newTask.from, newTask.to, newTask.mode);
  assert.equal(cache.acceptGuide(newTask, original, revision), false);
  assert.deepEqual(cache.lookupGuide(newTask), { path: exact, current: true });
});

test("overview text keeps multi-codepoint emoji graphemes intact during ellipsis truncation", () => {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const measure = (text: string) => Array.from(segmenter.segment(text)).length;
  assert.deepEqual(overviewTextLines("👨‍👩‍👧‍👦🇨🇳测试标题", 3, measure, 1), ["👨‍👩‍👧‍👦🇨🇳…"]);
  assert.deepEqual(overviewTextLines("A👨‍👩‍👧‍👦B", 2, measure, 1), ["A…"]);
});

test("overview atlas evicts least-recently-used pages, re-rasterizes evicted keys, and draws bypassed/ports", () => {
  const original = globalThis.OffscreenCanvas;
  let clipped = 0, arcs = 0;
  const context = {
    save() {}, restore() {}, resetTransform() {}, clearRect() {}, setTransform() {},
    beginPath() {}, roundRect() {}, fill() {}, stroke() {}, fillText() {}, moveTo() {}, lineTo() {},
    clip() { clipped++; },
    arc() { arcs++; },
    measureText: (text: string) => ({ width: Array.from(text).length * 12 }),
  };
  class Surface {
    constructor(public width: number, public height: number) {}
    getContext() { return context; }
  }
  globalThis.OffscreenCanvas = Surface as unknown as typeof OffscreenCanvas;
  const palette: OverviewPalette = {
    surface: "#fff", border: "#eee", text: "#111", secondary: "#555", accent: "blue",
    running: "green", amber: "orange", red: "red", green: "green", font: "sans-serif", kinds: { agent: "blue" },
  };
  const first: OverviewVisual = {
    title: "First", detail: "Agent", icon: "agent", kind: "agent", status: "draft", participation: "bypassed",
    width: 280, height: 118, ports: [{ kind: "continuation", direction: "out", id: "out", x: 280, y: 24, linked: true }],
  };
  try {
    const atlas = new OverviewCardAtlas(palette, 1);
    const tile1 = atlas.get(first, 2.2);
    assert.ok(clipped >= 1 && arcs >= 2);
    for (let index = 0; index < 2200; index++) {
      atlas.get({ ...first, participation: undefined, ports: [], title: `Evict-${index}` }, 2.2);
    }
    const before = atlas.rasterizations;
    const tile2 = atlas.get(first, 2.2);
    assert.equal(atlas.rasterizations, before + 1);
    assert.notEqual(tile2, tile1);
    atlas.dispose();
  } finally { globalThis.OffscreenCanvas = original; }
});

test("wire image cache invalidates on DPR change and handles non-positive zoom safely", () => {
  const original = globalThis.OffscreenCanvas;
  let lineJoins: string[] = [];
  class Surface {
    constructor(public width: number, public height: number) {}
    getContext() {
      return {
        resetTransform() {}, clearRect() {}, setTransform() {},
        set lineCap(_v: string) {},
        set lineJoin(v: string) { lineJoins.push(v); },
      };
    }
  }
  globalThis.OffscreenCanvas = Surface as unknown as typeof OffscreenCanvas;
  try {
    const cache = new WireImageCache();
    const scene = {};
    let paints = 0;
    const paint = () => { paints++; };
    const area = { x: 0, y: 0, w: 1440, h: 900 };
    const dpr1 = cache.get(scene, "dark", area, 1, 1, paint);
    const dpr15 = cache.get(scene, "dark", area, 1, 1.5, paint);
    assert.notEqual(dpr15, dpr1);
    assert.equal(paints, 2);
    assert.ok(lineJoins.every(join => join === "round") && lineJoins.length === 2);
    const safe = cache.get(scene, "dark", area, 0, 1, paint);
    assert.ok(Number.isFinite(safe.density) && safe.width >= 1 && safe.height >= 1);
    cache.dispose();
  } finally { globalThis.OffscreenCanvas = original; }
});

test("pathExtent, guidePathInArea, typeScaleFor, wireInk, and overview scene handle edge cases", () => {
  assert.deepEqual(pathExtent(""), { x: 0, y: 0, w: 0, h: 0 });
  assert.deepEqual(pathExtent("M 10 20 L 30"), { x: 10, y: 20, w: 0, h: 0 });
  assert.equal(guidePathInArea({ path: "M 0 0 L 100 0", extent: { x: 0, y: 0, w: 100, h: 1 } }, { x: 500, y: 500, w: 100, h: 100 }), "");
  assert.equal(typeScaleFor(0.5), 1);
  assert.equal(typeScaleFor(0.28), 2.2);
  assert.equal(typeScaleFor(0), 2.2);
  assert.equal(typeScaleFor(-1), 2.2);

  const cont = newEdge("a", "b", "continuation");
  const ref = newEdge("a", "b", "reference");
  const evt = { ...newEdge("a", "b", "event"), event: { mode: "end" as const, kinds: ["error" as const] } };
  assert.equal(wireInk({ edge: cont, evState: "active" }).animation, 0);
  assert.equal(wireInk({ edge: cont, evState: "queued" }).animation, 1);
  assert.equal(wireInk({ edge: cont, evState: "waiting" }).animation, 3);
  assert.equal(wireInk({ edge: cont, evState: "bypassed" }).color, "violet");
  assert.equal(wireInk({ edge: ref, evState: "updated" }).animation, 2);
  assert.equal(wireInk({ edge: evt, evState: "idle" }).color, "eventError");

  const node = newNode("agent", 20, 40, "Agent");
  assert.equal(shouldRenderDomInLod(node, new Set()), false);
  assert.equal(shouldRenderDomInLod({ ...node, pinned: true }, new Set()), true);
  assert.equal(shouldRenderDomInLod(node, new Set([node.id])), true);

  const group = { ...newNode("group", 0, 0, "G"), width: 400, height: 200 };
  const child = { ...newNode("agent", 20, 260, "Child"), parentId: group.id };
  const box = overviewGroupBox(group, { groupPorts: new Map(), membersOf: () => [child], keepExpandedIds: new Set() }, true);
  assert.ok(box.h > 200);
});

test("interaction store rejects stale drag routes and notifies overviewDom subscribers", () => {
  const store = createCanvasInteractionStore();
  const dragA = { mode: "node" as const, deltas: new Map(), affectedEdgeIds: new Set(["e1"]) };
  const dragB = { mode: "node" as const, deltas: new Map(), affectedEdgeIds: new Set(["e1"]) };
  let routeNotifications = 0;
  let domNotifications = 0;
  const stopRoutes = store.subscribeDragRoutes(() => routeNotifications++);
  const stopDom = store.subscribeOverviewDom(() => domNotifications++);
  store.setDrag(dragA);
  store.setDrag(dragB);
  store.setDragRoutes(dragA, new Map());
  assert.equal(routeNotifications, 0);
  store.setDragRoutes(dragB, new Map());
  assert.equal(routeNotifications, 1);
  store.setOverviewDomIds(new Set(["n1"]));
  assert.equal(domNotifications, 1);
  const el = {} as HTMLElement;
  store.registerElement("n1", el);
  assert.equal(store.getElement("n1"), el);
  store.registerElement("n1", null);
  assert.equal(store.getElement("n1"), undefined);
  stopRoutes();
  stopDom();
});

test("overview pointer dispatcher resolves overlapping cards top-most first and prefers closer ports", () => {
  const index = new BoxIndex<string>();
  const back = newNode("agent", 0, 0, "Back");
  const front = newNode("agent", 40, 20, "Front");
  const backCard = {
    id: back.id, node: back, box: { x: 0, y: 0, w: 280, h: 118 }, kind: "node" as const,
    visual: { title: "Back", detail: "", icon: "agent", kind: "agent", status: "draft", width: 280, height: 118,
      ports: [{ kind: "continuation" as const, direction: "in" as const, id: "in", x: 0, y: 40, linked: false }] },
  };
  const frontCard = {
    id: front.id, node: front, box: { x: 40, y: 20, w: 280, h: 118 }, kind: "node" as const,
    visual: { title: "Front", detail: "", icon: "agent", kind: "agent", status: "draft", width: 280, height: 118,
      ports: [{ kind: "continuation" as const, direction: "in" as const, id: "in", x: 0, y: 20, linked: false }] },
  };
  index.set(back.id, backCard.box);
  index.set(front.id, frontCard.box);
  const hit = new CanvasPointerDispatcher({ index, cards: new Map([[back.id, backCard], [front.id, frontCard]]) }, []);
  assert.equal(hit.cardAt({ x: 100, y: 60 }, 0.4)?.card.id, front.id);
  assert.equal(hit.cardAt({ x: 35, y: 40 }, 0.4)?.card.id, front.id);
  assert.equal(hit.cardAt({ x: 35, y: 40 }, 0.4)?.port?.id, "in");
  assert.equal(hit.cardAt({ x: 10, y: 40 }, 0.4)?.card.id, back.id);
  assert.equal(hit.cardAt({ x: 10, y: 40 }, 0.4)?.port?.id, "in");
});
