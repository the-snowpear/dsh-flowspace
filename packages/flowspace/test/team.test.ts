import assert from "node:assert/strict";
import { test } from "node:test";
import { roleDefinitionSchema, saveTeamSchema, teamBlueprintSchema } from "../src/host/storage.ts";
import { planDelegation } from "../src/host/teamDelegate.ts";
import { emptyDocument, newNode } from "../src/core/document.ts";
import { duplicateSubgraph } from "../src/client/subgraphs.ts";
import { captureTemplate, teamRevisionDifferences } from "../src/client/templates.ts";

const model = { provider: "fixture", model: "test" };
const role = { id: "reviewer", title: "Reviewer", description: "", persona: "Review the result", model, revision: 1 };
const slot = { slotId: "reviewer", roleId: role.id, label: "Review" };
const team = { id: "test-team", title: "Test team", lead: { persona: "Delegate", model },
  slots: [slot], norms: "", revision: 1 };

test("team storage preserves models, revisions and archive flags", () => {
  assert.deepEqual(roleDefinitionSchema.parse({ ...role, archived: true }), { ...role, archived: true });
  assert.deepEqual(teamBlueprintSchema.parse(team), team);
  assert.equal(teamBlueprintSchema.safeParse({ ...team, revision: 0 }).success, false);
});

test("team input rejects invalid native names, duplicate slots and invalid instance counts", () => {
  for (const slots of [
    [slot, slot],
    [{ ...slot, slotId: "lead" }],
    [{ ...slot, slotId: "bad/name" }],
    [{ ...slot, maxInstances: 0 }],
    Array.from({ length: 9 }, (_, i) => ({ ...slot, slotId: `slot-${i}` })),
  ]) assert.equal(saveTeamSchema.safeParse({ ...team, slots }).success, false);
  assert.equal(saveTeamSchema.safeParse({ ...team, slots: [{ ...slot, maxInstances: 16 }] }).success, true);
});

test("delegation validates the slot and task and pins the configured role/model", () => {
  const override = { ...model, model: "override" };
  const record = {
    leadSessionId: "lead-id", nodeId: "node-id",
    roster: { team: { ...team, slots: [{ ...slot, model: override }] }, roles: [role] },
    delegations: [],
  };
  const names = new Set(["reviewer", "reviewer-2"]);
  assert.throws(() => planDelegation(record, { slot: "other", task: "Review" }, names), /Unknown team slot/);
  assert.throws(() => planDelegation(record, { slot: "reviewer", task: " " }, names));
  const plan = planDelegation(record, { slot: "reviewer", task: "Review", model }, names);
  assert.equal(plan.name, "reviewer-3");
  assert.deepEqual(plan.slot.model, override);
  assert.match(plan.prompt, /<role-persona>.*Review the result.*<\/role-persona>.*Review/s);
  assert.throws(() => planDelegation({ ...record, delegations: [{
    sessionId: "child", slotId: slot.slotId, roleId: role.id, roleRevision: 1, model: override,
  }] }, { slot: "reviewer", task: "Review" }, names), /member limit/);
});

test("workflow and subgraph copies preserve the reference while creating new lead sessions", () => {
  const doc = emptyDocument();
  const group = newNode("group", 0, 0, "Review");
  const member = { ...newNode("agent", 100, 90, "Team"), parentId: group.id,
    teamRef: { teamId: team.id, revision: 1 }, sessionId: "original-lead" };
  doc.nodes = [group, member];
  const template = captureTemplate(doc, group.id, "Review workflow", "", [team]);
  assert.deepEqual(template.nodes[0].teamRef, member.teamRef);
  assert.equal(template.nodes[0].sessionId, undefined);
  assert.deepEqual(teamRevisionDifferences(template, [{ ...team, revision: 2 }]), [
    { id: team.id, title: team.title, saved: 1, current: 2 },
  ]);
  const pasted = duplicateSubgraph(doc, [group.id]).nodes.find((node) => node.teamRef)!;
  assert.deepEqual(pasted.teamRef, member.teamRef);
  assert.equal(pasted.sessionId, undefined);
});
