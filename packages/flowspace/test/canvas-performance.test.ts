import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { applyGeometry, byId, indexNodes, intersects, runtimeIndex, shareSnapshotValue } from "../src/client/sceneModel.ts";
import { pathExtent, SceneWires } from "../src/client/sceneWires.ts";
import { route, routePath } from "../src/client/wireRouting.ts";
import type { FlowspaceRun } from "../src/types.ts";

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
    tokens: [{ id: "gate", edgeId: edge.id, stepId: "s", consumed: false, dismissed: false, ready: false, boundary: true,
      source: { id: "context", kind: "text", sourceNodeId: "upstream", capturedAt: 0, title: "input", text: "wait" } }],
  };
  const index = runtimeIndex({ document, runs: [run], live: [] });
  assert.equal(index.statuses.get(node.id), "waiting");
  assert.equal(index.waiting.get(node.id)?.[0].token.id, "gate");
  assert.equal(byId(document.edges).get(edge.id), undefined);
});
