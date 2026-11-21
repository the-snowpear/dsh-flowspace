import assert from "node:assert/strict";
import test from "node:test";
import { builtinTemplates, computeSyncPlan, instantiateTemplate, synchronizeTemplate } from "../src/client/templates.ts";
import { tFor } from "../src/client/i18n.ts";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { condition, conditionRoute } from "../src/core/nodes/judge/index.ts";
import { checkDocument } from "../src/host/storage.ts";

const gateSlot = "slot-tdd-gate";
const verifierSlot = "slot-tdd-verifier";
const tdd = (locale: "zh" | "en") => builtinTemplates(locale).find(template => template.id === "builtin-tdd-loop")!;

test("both TDD templates accept only a complete final verdict line and confirm summary delivery", () => {
  for (const locale of ["zh", "en"] as const) {
    const template = tdd(locale);
    const gate = template.nodes.find(node => node.id === gateSlot)!;
    const verifier = template.nodes.find(node => node.id === verifierSlot)!;
    const marker = tFor(locale, "flow_tdd_marker");
    for (const prompt of [verifier.task, verifier.draft, verifier.continuationPrompt]) assert.ok(prompt?.endsWith(marker));
    assert.ok(marker.includes("结论：通过") && marker.includes("结论：未通过"));
    const config = condition.configSchema.parse(gate.config);
    for (const text of ["结论：通过", "checks passed\n结论：通过\n", "tests passed\r\n结论：通过\r\n"])
      assert.equal(conditionRoute(config, text), "pass", text);
    for (const text of ["结论：未通过", "结论：通过。", "之前的结论：通过", "> 结论：通过", "“结论：通过”", "结论：通过\n结论：未通过", "结论：通过\n\n"])
      assert.equal(conditionRoute(config, text), "else", text);
    assert.deepEqual(template.edges.filter(edge => edge.source === gateSlot).map(edge =>
      [edge.id, edge.sourcePort, edge.target, edge.trigger, edge.maxRounds]), [
      ["etdd-loopback", "else", "slot-tdd-author", "auto", 3],
      ["etdd-exit", "pass", "slot-tdd-summary", "confirm", 3],
    ]);
    assert.ok(template.edges.some(edge => edge.source === verifierSlot && edge.target === gateSlot && edge.trigger === "auto"));
    const doc = emptyDocument();
    instantiateTemplate(doc, template, 17, 22, "TDD");
    checkDocument(doc);
  }
});

test("revision one instances sync the decision gate while preserving existing sessions, ports, external wires and authored prompts", () => {
  const next = tdd("en");
  const previous = structuredClone(next);
  previous.revision = 1;
  previous.w = 1060;
  previous.nodes = previous.nodes.filter(n => n.id !== gateSlot);
  previous.nodes.find(n => n.id === "slot-tdd-summary")!.x = 744;
  const verifier = previous.nodes.find(n => n.id === verifierSlot)!;
  verifier.task = verifier.draft = verifier.continuationPrompt =
    "Audit the turn diff and run typecheck + tests independently: cite exact file/line failures for repair, or sign off when clean.";
  previous.edges = previous.edges.filter(edge => edge.target !== gateSlot);
  for (const edge of previous.edges.filter(edge => edge.source === gateSlot)) {
    edge.source = verifierSlot;
    delete edge.sourcePort;
  }
  for (const keepTasks of [true, false]) {
    const doc = emptyDocument();
    const group = instantiateTemplate(doc, previous, 82, 37, "TDD");
    const slots = new Map(doc.nodes.filter(n => n.templateSlotId).map(n => [n.templateSlotId, n.id]));
    const live = doc.nodes.find(n => n.id === slots.get(verifierSlot))!;
    live.sessionId = "session-fixture";
    live.task = "My attached session task.";
    live.draft = "Unsent draft.";
    live.continuationPrompt = "Reproduce the Windows failure.";
    const client = newNode("agent", 1500, 700);
    const external = newEdge(live.id, client.id, "continuation");
    doc.nodes.push(client);
    doc.edges.push(external);
    const ports = structuredClone(group.ports);
    checkDocument(doc);
    const plan = computeSyncPlan(doc, group, next);
    assert.deepEqual(plan.added.map(n => n.id), [gateSlot]);
    assert.deepEqual(plan.locked.map(n => n.id), [live.id]);
    synchronizeTemplate(doc, group.id, next, keepTasks);
    checkDocument(doc);
    for (const [slot, id] of slots) assert.equal(doc.nodes.find(n => n.templateSlotId === slot)?.id, id);
    assert.equal(doc.edges.find(e => e.id === external.id), external);
    assert.deepEqual(group.ports, ports);
    assert.equal(live.sessionId, "session-fixture");
    assert.equal(live.task, "My attached session task.");
    assert.equal(live.draft, "Unsent draft.");
    assert.equal(live.continuationPrompt, "Reproduce the Windows failure.\n\n" + tFor("en", "flow_tdd_marker"));
    const gate = doc.nodes.find(n => n.templateSlotId === gateSlot)!;
    assert.ok(doc.edges.some(e => e.source === live.id && e.target === gate.id && e.targetPort === "in"));
    assert.deepEqual(doc.edges.filter(e => e.source === gate.id).map(e => e.sourcePort), ["else", "pass"]);
    const prompt = live.continuationPrompt;
    synchronizeTemplate(doc, group.id, next, keepTasks);
    assert.equal(live.continuationPrompt, prompt);
    assert.equal(doc.nodes.filter(n => n.templateSlotId === gateSlot).length, 1);
  }
});
