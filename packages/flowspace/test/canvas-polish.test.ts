import test from "node:test";
import assert from "node:assert/strict";
import { emptyDocument, newNode } from "../src/core/document.ts";
import type { FlowNode } from "../src/types.ts";
import { giveRoomBack, makeRoom, nodeBox } from "../src/client/geometry.ts";
import { buildChildTree } from "../src/client/childTree.ts";
import { rewriteNavigatorRowSelector } from "../src/client/hostStyleGuard.ts";

test("subagents hang from the agent's bottom port beside its role nodes; a role with several members grows a tree", () => {
  const agent = { ...newNode("agent", 300, 140, "Lead"), sessionId: "lead-1" };
  const solo = { ...newNode("role", 260, 700, "Reviewer"), staffOf: agent.id, slotId: "reviewer" };
  const pair = { ...newNode("role", 560, 700, "Tester"), staffOf: agent.id, slotId: "tester" };
  const plain = { ...newNode("agent", 1400, 140, "Plain"), sessionId: "plain-1" };
  const member = (sessionId: string, name: string, nodeId?: string) => ({
    sessionId, parentId: "lead-1", depth: 1, name, label: name, activity: "idle" as const, mode: "continuable" as const,
    slotId: nodeId ? name.replace(/-\d+$/, "") : null, ...(nodeId ? { nodeId } : {}),
  });
  const team = {
    leadSessionId: "lead-1", nodeId: agent.id, teamId: `canvas-${agent.id}`, title: "Lead", revision: 1, enabled: true,
    leadModel: { provider: "p", model: "m" }, slots: [], tasks: [], capacity: { active: 0, max: 8 },
    members: [member("m-1", "reviewer", solo.id), member("m-2", "tester", pair.id), member("m-3", "tester-2", pair.id), member("m-4", "explorer")],
  };
  const box = (n: typeof agent) => nodeBox(n, false, false);
  const { cards, links, members } = buildChildTree({
    nodes: [agent, solo, pair, plain], box, teams: { "lead-1": team },
    subagents: [
      { sessionId: "m-1", parentSessionId: "lead-1", title: "reviewer", running: false },
      { sessionId: "old-1", parentSessionId: "lead-1", title: "Earlier helper", running: false },
      { sessionId: "sub-1", parentSessionId: "plain-1", title: "Explorer", running: true },
    ],
  });
  assert.deepEqual(members.get(solo.id)?.map((m) => m.sessionId), ["m-1"], "one member lives in its role node");
  const row = cards.filter((c) => c.agentNodeId === agent.id && !c.roleNodeId);
  assert.deepEqual(row.map((c) => c.sessionId).sort(), ["m-4", "old-1"], "outside members and earlier subagents share the agent's row");
  assert.equal(row.find((c) => c.sessionId === "m-4")?.outside, true);
  assert.equal(row.find((c) => c.sessionId === "old-1")?.member, false);
  const pairBox = box(pair);
  assert.ok(row.every((c) => c.box.x >= pairBox.x + pairBox.w && c.box.y === Math.min(box(solo).y, pairBox.y)), "the row sits beside the roles");
  const tree = cards.filter((c) => c.roleNodeId === pair.id);
  assert.deepEqual(tree.map((c) => c.name), ["tester", "tester-2"]);
  assert.ok(tree.every((c) => c.box.y > pairBox.y + pairBox.h), "several members hang under their role");
  assert.ok(!cards.some((c) => c.roleNodeId === solo.id));
  const port = { x: box(agent).x + box(agent).w / 2, y: box(agent).y + box(agent).h };
  assert.deepEqual(links.find((l) => l.id === "child-old-1")?.from, port, "row links leave the bottom-centre port");
  const plainCard = cards.find((c) => c.sessionId === "sub-1")!;
  assert.equal(plainCard.box.x + plainCard.box.w / 2, box(plain).x + box(plain).w / 2, "a lone subagent centres under its agent");
  assert.equal(links.find((l) => l.id === "child-sub-1")?.active, true);
  const hidden = buildChildTree({ nodes: [{ ...plain, subAgentsExpanded: false }], box, teams: {}, subagents: [
    { sessionId: "sub-1", parentSessionId: "plain-1", title: "Explorer", running: true }] });
  assert.equal(hidden.cards.length, 0, "the subagent chip still folds the row away");
});
test("a card growing into live chat pushes its row right, cards below down, and gives the room back", () => {
  const doc = emptyDocument();
  const live: FlowNode = { ...newNode("agent", 0, 0, "Author"), expanded: true, sessionId: "s-1", tab: "conversation" };
  // Row neighbours spaced for the 312px idle card (40px apart).
  const right1 = { ...newNode("agent", 352, 0, "Verifier"), expanded: true };
  const right2 = { ...newNode("agent", 704, 0, "Summary"), expanded: true };
  // A card directly underneath the idle card (392px tall + 40px).
  const below = { ...newNode("note", 0, 432, "Notes"), expanded: true };
  // Far away: must not move.
  const far = { ...newNode("note", 0, 2000, "Far"), expanded: true };
  const group = { ...newNode("group", -40, -60, "Loop"), width: 1100, height: 720 };
  for (const n of [live, right1, right2, below]) n.parentId = group.id;
  doc.nodes = [group, live, right1, right2, below, far];

  const grown = nodeBox(live, false, true);
  assert.equal(grown.w, 420, "live chat widens the card");
  makeRoom(doc, live);

  const at = (id: string) => doc.nodes.find((n) => n.id === id)!;
  assert.equal(at(right1.id).x, grown.w + 24, "same-row neighbour slides right");
  assert.equal(at(right1.id).y, 0, "…without dropping a row");
  assert.ok(at(right2.id).x >= at(right1.id).x + 312 + 24, "the push chains along the row");
  assert.equal(at(below.id).x, 0);
  assert.equal(at(below.id).y, grown.y + grown.h + 24, "card underneath slides down");
  assert.equal(at(far.id).y, 2000);
  assert.equal(at(far.id).nudge, undefined);
  const g = at(group.id);
  assert.ok(g.width > 1100 && g.height > 720, "enclosing group grows to fit");

  live.tab = "task";
  giveRoomBack(doc, live);
  assert.deepEqual(
    [right1, right2, below].map((n) => [at(n.id).x, at(n.id).y, at(n.id).nudge]),
    [
      [352, 0, undefined],
      [704, 0, undefined],
      [0, 432, undefined],
    ],
  );
  assert.deepEqual([at(group.id).width, at(group.id).height], [1100, 720]);
});

test("host style guard rewrites only the navigator-row :has() shape", () => {
  assert.equal(
    rewriteNavigatorRowSelector(
      "[data-files-navigator-row]:has(> .k-1LKG_navigator.k-1LKG_fill) > :not(.k-1LKG_navigator)",
    ),
    "[data-files-navigator-row] > :not(.k-1LKG_navigator):has(~ .k-1LKG_navigator.k-1LKG_fill), " +
      "[data-files-navigator-row] > .k-1LKG_navigator.k-1LKG_fill ~ :not(.k-1LKG_navigator)",
  );
  // The narrow-viewport variant carries a nested :not() in the navigator compound.
  assert.equal(
    rewriteNavigatorRowSelector(
      "[data-files-navigator-row]:has(> .nav:not(.wholePage)) > :not(.nav)",
    ),
    "[data-files-navigator-row] > :not(.nav):has(~ .nav:not(.wholePage)), " +
      "[data-files-navigator-row] > .nav:not(.wholePage) ~ :not(.nav)",
  );
  assert.equal(rewriteNavigatorRowSelector(".fs-root .node:has(.x)"), null);
  assert.equal(
    rewriteNavigatorRowSelector("[data-files-navigator-row] > .navigator"),
    null,
  );
});
