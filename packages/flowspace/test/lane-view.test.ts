import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newNode } from "../src/core/document.ts";
import { createFanoutPair } from "../src/core/fanout.ts";
import { hasUnusedResult, laneGroupState } from "../src/client/nodes/FanoutView.tsx";
import type { FlowspaceRun, RunFanoutLane } from "../src/types.ts";

test("the group distinguishes an empty static list from a dynamic source and counts item identities once", () => {
  const doc = emptyDocument(), board = newNode("board", 0, 0);
  board.columns = [];
  doc.nodes.push(board);
  const { fan, master } = createFanoutPair(doc, 400, 0, { sourceId: board.id });
  assert.deepEqual(laneGroupState(doc, [master], fan), { total: 0, done: 0, concurrency: 4 });
  doc.edges = doc.edges.filter(edge => edge.source !== board.id);
  assert.equal(laneGroupState(doc, [master], fan).total, undefined);
  const a = { ...master, generatedBy: fan.id, itemKey: "a" };
  assert.equal(laneGroupState(doc, [a, { ...a, id: "next" }, { ...a, itemKey: "b", removed: true }], fan).total, 1);
});

test("progress follows the active frozen batch and waits for an unused result to finish", () => {
  const doc = emptyDocument();
  const { group, fan, merge, master } = createFanoutPair(doc, 0, 0);
  const worker = { ...master, generatedBy: fan.id, itemKey: "b" };
  const lane = (key: string, state: RunFanoutLane["state"], adopted: boolean): RunFanoutLane => ({
    state, adopted, item: { key, value: key }, fanStepId: "step",
    input: { id: key, kind: "text", sourceNodeId: fan.id, title: key, text: key, capturedAt: 1 },
    ...(state === "completed" ? { endedAt: 2 } : {}),
  });
  const run: FlowspaceRun = { id: "run", title: "Run", state: "running", origin: "canvas", createdAt: 1,
    roots: [fan.id], scope: null, participants: [], graph: { nodes: doc.nodes, edges: doc.edges }, steps: [], tokens: [], notes: [],
    fanouts: [{ id: "batch", fanId: fan.id, mergeId: merge.id, groupId: group.id, closed: true,
      lanes: [lane("a", "completed", true), lane("b", "running", false)] }],
  };
  assert.deepEqual(laneGroupState(doc, [], fan, [run]), { total: 2, done: 1, concurrency: 4 });
  assert.equal(hasUnusedResult([run], worker), false);
  run.fanouts![0].lanes[1] = lane("b", "completed", false);
  assert.equal(hasUnusedResult([run], worker), true);
});
