import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { applyGeometry, byId, indexNodes, intersects, reuseRunHistory, runtimeIndex, shareSnapshotValue } from "../src/client/sceneModel.ts";
import { buildGuideRoute, obstacleDelta, pathExtent, RouteObstacles, SceneWires } from "../src/client/sceneWires.ts";
import { route, routePath } from "../src/client/wireRouting.ts";
import type { FlowspaceRun, RunStep } from "../src/types.ts";

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
  cache.acceptGuide(newTask, original, revision);
  assert.deepEqual(cache.lookupGuide(newTask), { path: exact, current: true });
});
