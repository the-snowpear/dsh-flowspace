import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDocument, roleDefinitionSchema, saveTeamSchema, teamBlueprintSchema } from "../src/host/storage.ts";
import { planDelegation, rosterSlots, slotOf } from "../src/host/teamDelegate.ts";
import { TeamAssets } from "../src/host/teamAssets.ts";
import { emptyDocument, newEdge, newNode } from "../src/core/document.ts";
import { isTeamNode, slotIdFor, staffedIds, staffNodes, teamIdOf } from "../src/core/team.ts";
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

test("members resolve to the role node they were delegated through, never to a reused slot name", () => {
  const slots = [{ slotId: "member", roleId: "canvas-b", label: "B", nodeId: "b" }, slot];
  const child = { sessionId: "s", roleRevision: 1, model };
  assert.equal(slotOf(slots, { ...child, slotId: "member", roleId: "canvas-a" }), undefined, "a removed role's member is outside");
  assert.equal(slotOf(slots, { ...child, slotId: "member", roleId: "canvas-b" })?.nodeId, "b", "inline roles carry their node");
  assert.equal(slotOf(slots, { ...child, slotId: "reviewer", roleId: role.id })?.slotId, "reviewer");
  assert.equal(slotOf(slots, { ...child, slotId: "reviewer", roleId: role.id, nodeId: "c" }), undefined,
    "a library role wired through a node that left is not the library slot");
  const record = { leadSessionId: "lead", nodeId: "team", roster: { team: { ...team, slots }, roles: [role] },
    delegations: [{ ...child, slotId: "member", roleId: "canvas-a", model }] };
  const names = new Set(["member"]);
  const plan = planDelegation({ ...record, roster: { ...record.roster, roles: [role,
    { ...role, id: "canvas-b", title: "B" }] } }, { slot: "member", task: "Go" }, names);
  assert.equal(plan.name, "member-2", "the reused slot name starts its own count");
});

function fakeAssets() {
  const tables: Record<string, Map<string, unknown>> = {
    roles: new Map([[role.id, role]]), teams: new Map([[team.id, team]]),
  };
  const domain = { table: (name: string) => tables[name] } as unknown as ConstructorParameters<typeof TeamAssets>[0];
  return new TeamAssets(domain, {} as ConstructorParameters<typeof TeamAssets>[1]);
}

test("role nodes wired into a canvas team become its slots, left to right", () => {
  const lead = { ...newNode("agent", 0, 0, "Canvas team"), teamConfig: { persona: "Lead", norms: "Be brief" } };
  const inline = { ...newNode("role", 300, 400, "测试员"), staffOf: lead.id, text: "Write tests", task: "Testing",
    teamModel: model, maxInstances: 2 };
  const library = { ...newNode("role", 0, 400, "Reviewer"), staffOf: lead.id, roleRef: role.id, slotId: "review" };
  const loose = { ...newNode("role", 600, 400, "Loose"), teamModel: model };
  const roster = fakeAssets().rosterForNode(lead, [lead, inline, library, loose]);
  assert.equal(roster.team.id, `canvas-${lead.id}`);
  assert.equal(roster.team.lead.model, undefined);
  assert.deepEqual(roster.team.slots.map((s) => [s.slotId, s.label, s.nodeId, s.maxInstances]), [
    ["review", "Reviewer", library.id, undefined],
    ["member", "测试员", inline.id, 2],
  ]);
  const inlineRole = roster.roles.find((r) => r.id === `canvas-${inline.id}`)!;
  assert.deepEqual([inlineRole.persona, inlineRole.description, inlineRole.model], ["Write tests", "Testing", model]);
  assert.equal(rosterSlots(roster).find((s) => s.slotId === "review")!.model, model);
});

test("a library team keeps its slots and adds wired roles after them", () => {
  const node = { ...newNode("agent", 0, 0, "Team"), teamRef: { teamId: team.id } };
  const extra = { ...newNode("role", 0, 400, "Reviewer"), staffOf: node.id, teamModel: model };
  const roster = fakeAssets().rosterForNode(node, [node, extra], model);
  assert.deepEqual(roster.team.slots.map((s) => s.slotId), ["reviewer", "reviewer-2"]);
  assert.deepEqual(roster.team.lead, team.lead);
});

test("canvas rosters reject empty teams and inline roles without a model", () => {
  const lead = newNode("agent", 0, 0, "Team");
  assert.throws(() => fakeAssets().rosterForNode(lead, [lead]), /至少需要一个岗位/);
  const role = { ...newNode("role", 0, 400, "Writer"), staffOf: lead.id };
  assert.throws(() => fakeAssets().rosterForNode(lead, [lead, role]), /选择模型/);
});

test("documents validate staffing wires", () => {
  const doc = emptyDocument();
  const lead = newNode("agent", 0, 0, "Team");
  const agent = newNode("agent", 400, 0, "Agent");
  const note = newNode("note", 800, 0, "Note");
  const a = { ...newNode("role", 0, 400, "A"), staffOf: lead.id, slotId: "same" };
  doc.nodes = [lead, agent, note, a];
  checkDocument(structuredClone(doc));
  assert.throws(() => checkDocument({ ...structuredClone(doc), nodes: [lead, agent, note, { ...a, staffOf: note.id }] }), /Agent 节点/);
  assert.throws(() => checkDocument({ ...structuredClone(doc), nodes: [lead, agent, a, { ...a, id: "b" }] }), /重复/);
  assert.throws(() => checkDocument({ ...structuredClone(doc), nodes: [{ ...lead, teamRef: { teamId: team.id }, teamConfig: { persona: "", norms: "" } }, agent, a] }), /同时/);
  assert.throws(() => checkDocument({ ...structuredClone(doc), edges: [newEdge(a.id, agent.id, "reference")] }), /编制线/);
  assert.equal(slotIdFor("Code Reviewer", new Set(["code-reviewer"])), "code-reviewer-2");
  assert.equal(slotIdFor("lead", new Set()), "lead-2");
  const staffed = staffedIds(doc.nodes);
  assert.equal(teamIdOf(lead, staffed), `canvas-${lead.id}`);
  assert.equal(teamIdOf(agent, staffed), undefined);
  assert.equal(isTeamNode(agent, staffed), false);
  assert.equal(isTeamNode({ ...agent, teamRef: { teamId: team.id } }, staffed), true);
  assert.deepEqual(staffNodes(doc.nodes, lead.id).map((n) => n.id), [a.id]);
});

test("copied role nodes follow copied teams and release foreign slot names", () => {
  const doc = emptyDocument();
  const lead = { ...newNode("agent", 0, 0, "Team"), teamConfig: { persona: "", norms: "" } };
  const role = { ...newNode("role", 0, 400, "A"), staffOf: lead.id, slotId: "a" };
  doc.nodes = [lead, role];
  const both = duplicateSubgraph(doc, [lead.id, role.id]);
  const copiedLead = both.nodes.find((n) => n.kind === "agent" && n.id !== lead.id)!;
  const copiedRole = both.nodes.find((n) => n.kind === "role" && n.id !== role.id)!;
  assert.deepEqual([copiedRole.staffOf, copiedRole.slotId], [copiedLead.id, "a"]);
  const alone = duplicateSubgraph(doc, [role.id]).nodes.find((n) => n.kind === "role" && n.id !== role.id)!;
  assert.deepEqual([alone.staffOf, alone.slotId], [lead.id, undefined]);
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
