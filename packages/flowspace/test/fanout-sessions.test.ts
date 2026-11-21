import assert from "node:assert/strict";
import test from "node:test";
import { fanoutSession } from "../src/client/FanoutSessions.tsx";
import { emptyDocument, newNode } from "../src/core/document.ts";
import type { FlowspaceRun, FlowspaceSnapshot } from "../src/types.ts";

function fixture() {
  const document = emptyDocument();
  const group = { ...newNode("group", 0, 0, "审稿"), fanout: { fanId: "fan", mergeId: "merge" } };
  const worker = (key: string, index: number, sessionId?: string, removed = false) => ({
    ...newNode("agent", 0, 0), generatedBy: "fan", parentId: group.id, itemKey: key, itemTitle: key.toUpperCase(),
    laneIndex: index, sessionId, removed,
  });
  document.nodes = [group, worker("b", 1, "b-first"), worker("b", 1, "b-last"), worker("a", 0, "a"),
    worker("c", 2), worker("gone", 3, "retired", true), { ...newNode("agent", 0, 300), sessionId: "ordinary" }];
  return { document, runs: [], live: [] } as FlowspaceSnapshot;
}

test("native row seats share one ordered lane list including drafts, multiple workers and retired sessions", () => {
  const snapshot = fixture();
  const b = fanoutSession(snapshot, "b-first")!;
  assert.equal(b.group, "审稿");
  assert.equal(b.lane.index, 2);
  assert.equal(b.total, 3);
  assert.deepEqual(b.lanes.map(lane => [lane.title, lane.removed]), [["A", false], ["B", false], ["C", false], ["GONE", true]]);
  assert.equal(b.lanes, fanoutSession(snapshot, "b-last")!.lanes);
  assert.equal(fanoutSession(snapshot, "b-first"), b);
  assert.equal(fanoutSession(snapshot, "retired")!.removed, true);
  assert.equal(fanoutSession(snapshot, "ordinary"), undefined);
});

test("a native lane session resolves its frozen group after generated cards are undone", () => {
  const snapshot = fixture();
  const graph = structuredClone({ nodes: snapshot.document.nodes, edges: [] });
  snapshot.runs = [{ graph } as FlowspaceRun];
  snapshot.document.nodes = snapshot.document.nodes.filter(node => !node.generatedBy);
  const history = fanoutSession(snapshot, "a")!;
  assert.equal(history.lane.title, "A");
  assert.equal(history.group, "审稿");
  assert.equal(fanoutSession(null, "a"), undefined);
});
