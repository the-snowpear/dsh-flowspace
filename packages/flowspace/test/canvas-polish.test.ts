import test from "node:test";
import assert from "node:assert/strict";
import { emptyDocument, newNode } from "../src/core/document.ts";
import { giveRoomBack, makeRoom, nodeBox } from "../src/client/geometry.ts";
import {
  buildDerivedStructure,
  subagentTetherPaths,
} from "../src/client/structure.ts";
import { rewriteNavigatorRowSelector } from "../src/client/hostStyleGuard.ts";

test("sub-agent tether: one spine from the parent bottom plus an elbow into each child", () => {
  const parent = { x: 100, y: 40, w: 300, h: 200 };
  const children = [
    { x: 144, y: 262, w: 236, h: 52 },
    { x: 144, y: 326, w: 236, h: 52 },
  ];
  const { spine, branches, spineX } = subagentTetherPaths(parent, children);
  assert.equal(spineX, 118);
  // Spine starts at the parent's bottom edge and stops one elbow radius above the last child.
  assert.equal(spine, "M 118 240 L 118 340");
  assert.equal(branches.length, 2);
  // Each elbow leaves the spine, curves right and lands on the child's left edge mid-height.
  assert.equal(branches[0], "M 118 276 Q 118 288 130 288 L 144 288");
  assert.equal(branches[1], "M 118 340 Q 118 352 130 352 L 144 352");
});

test("derived structure emits a tether spine and per-child branches for expanded sub-agents", () => {
  const agent = {
    ...newNode("agent", 300, 140, "Worker"),
    sessionId: "sess-1",
    subAgentsExpanded: true,
  };
  const { cards, links } = buildDerivedStructure({
    projects: [],
    hiddenWorkspaces: [],
    showBranches: false,
    showWorktrees: false,
    visibleNodes: [agent],
    lod: false,
    keepExpandedIds: new Set(),
    subagents: [
      { sessionId: "sub-1", parentSessionId: "sess-1", title: "Explorer", running: false },
      { sessionId: "sub-2", parentSessionId: "sess-1", title: "Reviewer", running: true },
    ],
    runningNodeIds: new Set(),
    waitingNodeIds: new Set(),
  });
  const subCards = cards.filter((c) => c.kind === "subagent");
  assert.equal(subCards.length, 2);
  const spine = links.filter((l) => l.kind === "subagent-spine");
  const branches = links.filter((l) => l.kind === "subagent-branch");
  assert.equal(spine.length, 1);
  assert.equal(spine[0].active, true, "spine glows while any child runs");
  assert.deepEqual(
    branches.map((b) => b.active),
    [false, true],
  );
  for (const [i, b] of branches.entries()) {
    assert.ok(b.path?.endsWith(`L ${Math.round(subCards[i].box.x)} ${Math.round(subCards[i].box.y + subCards[i].box.h / 2)}`));
  }
});

test("a card growing into live chat pushes its row right, cards below down, and gives the room back", () => {
  const doc = emptyDocument();
  const live = { ...newNode("agent", 0, 0, "Author"), expanded: true, sessionId: "s-1", tab: "conversation" as const };
  // Row neighbours spaced for the 312px idle card (40px apart).
  const right1 = { ...newNode("agent", 352, 0, "Verifier"), expanded: true };
  const right2 = { ...newNode("agent", 704, 0, "Summary"), expanded: true };
  // A card directly underneath the idle card (392px tall + 40px).
  const below = { ...newNode("note", 0, 432, "Notes"), expanded: true };
  // Far away: must not move.
  const far = { ...newNode("note", 0, 2000, "Far"), expanded: true };
  const group = { ...newNode("group", -40, -60, "Loop"), width: 1100, height: 520 };
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
  assert.ok(g.width > 1100 && g.height > 520, "enclosing group grows to fit");

  giveRoomBack(doc, live);
  assert.deepEqual(
    [right1, right2, below].map((n) => [at(n.id).x, at(n.id).y, at(n.id).nudge]),
    [
      [352, 0, undefined],
      [704, 0, undefined],
      [0, 432, undefined],
    ],
  );
  assert.deepEqual([at(group.id).width, at(group.id).height], [1100, 520]);
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
