import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { canConnect, canStreamTo, connectionOutput } from "../src/core/connect.ts";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../src/core/document.ts";
import { checkDocument } from "../src/host/storage.ts";
import { registerDescriptor } from "../src/core/nodes/registry.ts";

test("legacy continuation, reference, staffing, fork and board-card rules", () => {
  const a = newNode("agent", 0, 0), b = newNode("agent", 0, 0);
  const board = newNode("board", 0, 0), role = newNode("role", 0, 0);
  for (const [source, target, kind, ok] of [
    [a, b, "continuation", true], [a, b, "reference", true], [board, b, "reference", true],
    [board, b, "continuation", false], [role, b, "reference", false], [b, role, "continuation", false],
    [a, board, "reference", false], [undefined, b, "reference", false],
  ] as const) assert.equal(canConnect({ source, target, kind }).ok, ok);
  const sourceItemKey = board.columns![0].cards[0].id;
  assert.ok(canConnect({ source: board, target: b, kind: "reference", sourceItemKey }).ok);
  assert.equal(canConnect({ source: board, target: b, kind: "reference", sourceItemKey: "missing" }).ok, false);
  assert.equal(canConnect({ source: a, target: b, kind: "reference", sourceItemKey }).ok, false);
  const fork = { ...newEdge(a.id, b.id, "continuation"), mode: "fork" as const };
  const link = { source: a, target: b, kind: fork.kind, mode: fork.mode, edges: [fork] };
  assert.equal(canConnect(link).ok, false);
  assert.ok(canConnect({ ...link, edgeId: fork.id }).ok);
  assert.equal(canConnect({ ...link, edges: [], target: { ...b, sessionId: "bound" } }).ok, false);
});

test("registry port identity, direction, role and data type apply in both directions", (t) => {
  t.after(registerDescriptor({
    flowType: "test/typed", version: 1, family: "data", titleKey: "flow_node", descKey: "flow_node",
    icon: "braces", configSchema: z.object({}), defaultConfig: {}, capabilities: {},
    size: { compact: [256, 96], full: [312, 200] }, experimental: true, quickCreate: { canvas: true },
    ports: () => [
      { id: "in", role: "continuation", direction: "in", dataType: "list" },
      { id: "yes", role: "continuation", direction: "out", dataType: "list" },
      { id: "ref", role: "reference", direction: "out", dataType: "record" },
    ],
  }));
  const a = newFlowNode("test/typed", 0, 0), b = newFlowNode("test/typed", 10, 10);
  const agent = newNode("agent", 20, 20);
  assert.equal(connectionOutput(agent, b, { kind: "continuation" })?.dataType, "list");
  assert.equal(canStreamTo(b), true);
  assert.equal(canStreamTo(a, "yes"), false);
  assert.equal(canStreamTo(agent), false);
  assert.ok(canConnect({ source: a, sourcePort: "yes", target: b, kind: "continuation" }).ok);
  assert.ok(canConnect({ source: a, sourcePort: "yes", target: agent, kind: "continuation" }).ok);
  assert.ok(canConnect({ source: agent, target: b, kind: "continuation" }).ok);
  assert.equal(canConnect({ source: newFlowNode("flowspace/condition", 0, 0), sourcePort: "pass", target: b, kind: "continuation" }).ok, false);
  for (const sourcePort of ["in", "ref", "deleted", "out"])
    assert.equal(canConnect({ source: a, sourcePort, target: agent, kind: "continuation" }).ok, false);
  assert.deepEqual(canConnect({ source: a, sourcePort: "ref", target: agent, kind: "reference" }),
    { ok: true, convert: "text" });
  assert.equal(canConnect({ source: newFlowNode("vendor/missing", 0, 0), target: agent, kind: "continuation" }).ok, false);

  const doc = emptyDocument();
  doc.nodes = [agent, a, b];
  doc.edges = [{ ...newEdge(agent.id, a.id, "continuation"), emitMode: "stream" }];
  assert.doesNotThrow(() => checkDocument(doc));
  doc.edges = [{ ...newEdge(a.id, b.id, "continuation"), sourcePort: "yes", emitMode: "stream" }];
  assert.throws(() => checkDocument(doc));
  doc.edges = [{ ...newEdge(agent.id, agent.id, "continuation"), emitMode: "end" }];
  assert.throws(() => checkDocument(doc));
});
