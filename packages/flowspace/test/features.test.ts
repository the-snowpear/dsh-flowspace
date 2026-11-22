import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { Scheduler, type RuntimeAdapter } from "../src/core/scheduler.ts";
import {
  deriveDraftTitle,
  emptyDocument,
  newEdge,
  newNode,
  sample,
  sanitizeDocumentForWire,
  syncUntitledAgentTitles,
} from "../src/core/document.ts";
import { launchPlan } from "../src/core/graph.ts";
import { computeAutoLayout } from "../src/client/canvasLayout.ts";
import {
  capsuleStateOf,
  computeInputHubLayout,
  endpoint,
  hubFilamentPath,
} from "../src/client/geometry.ts";
import { nodeStatusOf } from "../src/client/SurfaceViews.tsx";
import {
  buildDerivedStructure,
  resolveDraftAffiliation,
} from "../src/client/structure.ts";
import {
  HostGitService,
  parseUnifiedDiff,
  sanitizedGitEnv,
} from "../src/host/git.ts";
import { computeFileNodeFingerprint } from "../src/host/runtime.ts";
import { checkDocument, documentSchema } from "../src/host/storage.ts";
import type { RunStep } from "../src/types.ts";

const execFile = promisify(execFileCb);

function makeSchedulerFixture() {
  const doc = emptyDocument();
  doc.nodes = ["Analyze", "Review", "Summarize"].map((title, i) => ({
    ...newNode("agent", i * 400, 0, title),
    task: `initial ${title}`,
    draft: `initial ${title}`,
  }));
  const sent: RunStep[] = [];
  const runtime: RuntimeAdapter = {
    ensure: async (n) => n.sessionId ?? `session-${n.id}`,
    send: async (s) => {
      sent.push(structuredClone(s));
    },
    cancel: async () => {},
    capture: async (n, mode, seq = 1, output = `out-${n.title}`) => ({
      id: `${n.id}-${seq}`,
      kind: mode,
      sourceNodeId: n.id,
      sourceSessionId: n.sessionId,
      seq,
      title: n.title,
      text: output,
      version: String(seq),
      capturedAt: 1,
    }),
    reference: async (n, edge) => ({
      id: n.id,
      kind: "text",
      sourceNodeId: n.id,
      title: edge?.snapshotTitle || n.title,
      text: edge?.snapshotText || n.text,
      version: edge?.snapshotText ? `snap:${edge.snapshotText}` : `v:${n.text}`,
      capturedAt: 1,
    }),
  };
  const scheduler = new Scheduler(runtime, {
    document: () => doc,
    changed: async () => {},
    bound: async (id, sessionId) => {
      doc.nodes.find((n) => n.id === id)!.sessionId = sessionId;
    },
    submitted: async (id, task, isContinuation) => {
      const n = doc.nodes.find((n) => n.id === id)!;
      n.lastSubmittedTask = isContinuation ? task : n.task || task;
      if (!isContinuation && n.draft === task) n.draft = "";
    },
  });
  return { doc, sent, scheduler };
}

test("M02: upstream continuation uses continuationPrompt and preserves live chat draft", async () => {
  const { doc, sent, scheduler } = makeSchedulerFixture();
  const [a, b] = doc.nodes;
  b.sessionId = "live-session-b";
  b.continuationPrompt = "Auto review upstream conclusions carefully";
  b.draft = "Half-typed manual question in chat box";
  doc.edges.push(newEdge(a.id, b.id, "continuation"));

  await scheduler.start({ kind: "single", nodeIds: [a.id] });
  assert.equal(sent.length, 1);
  await scheduler.claim(sent[0].requestId, 1);
  await scheduler.finish(sent[0].sessionId!, 1, "completed", 10, "A done");

  assert.equal(sent.length, 2);
  assert.equal(sent[1].task, "Auto review upstream conclusions carefully");
  assert.equal(
    b.draft,
    "Half-typed manual question in chat box",
    "live chat draft must not be wiped by upstream continuation",
  );
});

test("R5: rerunFailed re-executes only failed step and downstream while keeping completed upstream context", async () => {
  const { doc, sent, scheduler } = makeSchedulerFixture();
  const [a, b, c] = doc.nodes;
  doc.edges.push(
    newEdge(a.id, b.id, "continuation"),
    newEdge(b.id, c.id, "continuation"),
  );

  const run = await scheduler.start({ kind: "global", nodeIds: [] });
  await scheduler.claim(sent[0].requestId, 1);
  await scheduler.finish(sent[0].sessionId!, 1, "completed", 10, "COMPUTED_42");
  assert.equal(sent.length, 2);

  // B fails with an error
  await scheduler.claim(sent[1].requestId, 2);
  await scheduler.finish(sent[1].sessionId!, 2, "error", 20, "", "rate limit");
  assert.equal(scheduler.runs[0].state, "error");
  assert.equal(sent.length, 2);

  // Rerun failed nodes of run: A must NOT re-run; B starts with COMPUTED_42 and advances to C
  const retried = await scheduler.rerunFailed(run.id);
  assert.deepEqual(retried.roots, [b.id]);
  assert.equal(sent.length, 3);
  assert.equal(sent[2].nodeId, b.id);
  assert.equal(sent[2].sources[0]?.text, "COMPUTED_42");

  await scheduler.claim(sent[2].requestId, 3);
  await scheduler.finish(sent[2].sessionId!, 3, "completed", 30, "REVIEW_OK");
  assert.equal(sent.length, 4);
  assert.equal(sent[3].nodeId, c.id);
});

test("R5: deliverables/presented attaches deduplicated files to active run", async () => {
  const { doc, sent, scheduler } = makeSchedulerFixture();
  const [a] = doc.nodes;
  await scheduler.start({ kind: "single", nodeIds: [a.id] });
  await scheduler.claim(sent[0].requestId, 1);
  await scheduler.deliverable(sent[0].sessionId!, 1, 8, 1000, [
    { path: "docs/report.md", description: "Final report" },
    { path: "docs/report.md", description: "Duplicate in same seq" },
  ]);
  assert.equal(scheduler.runs[0].deliverables?.length, 1);
  assert.equal(scheduler.runs[0].deliverables?.[0].path, "docs/report.md");
});

test("M03 & D18: 4-state capsuleStateOf and rerun on-source-update", () => {
  const doc = emptyDocument();
  const note = { ...newNode("note", 0, 0, "Spec"), text: "v1" };
  const agent = {
    ...newNode("agent", 360, 0, "Builder"),
    task: "Build spec",
    draft: "",
    lastSubmittedTask: "Build spec",
    rerun: "update" as const,
  };
  const ref = newEdge(note.id, agent.id, "reference");
  doc.nodes.push(note, agent);
  doc.edges.push(ref);

  assert.equal(capsuleStateOf(ref, { [note.id]: "n:1" }), "pending");
  ref.sentVersion = "n:1";
  ref.currentVersion = "n:1";
  assert.equal(capsuleStateOf(ref, { [note.id]: "n:1" }), "sent");

  // With no source update, batch launch skips Builder ("没有新输入")
  const planUnchanged = launchPlan(
    doc,
    { kind: "global", nodeIds: [] },
    new Set(),
    new Set(),
  );
  assert.equal(planUnchanged.roots.length, 0);

  // Source updates -> capsule turns "updated" and rerun="update" admits Builder!
  ref.currentVersion = "n:2";
  assert.equal(capsuleStateOf(ref, { [note.id]: "n:2" }), "updated");
  const planUpdated = launchPlan(
    doc,
    { kind: "global", nodeIds: [] },
    new Set(),
    new Set(),
  );
  assert.deepEqual(planUpdated.roots, [agent.id]);

  ref.always = true;
  assert.equal(capsuleStateOf(ref, { [note.id]: "n:2" }), "always");
});

test("D38 & M05 & M06: draft auto-title, 3-tier affiliation priority, and 4-tier structure bridging", () => {
  assert.equal(
    deriveDraftTitle("# 排查登录重定向死循环\n详细复现步骤…"),
    "排查登录重定向死循环",
  );

  const doc = emptyDocument();
  const untitled = newNode("agent", 0, 0);
  untitled.draft = "## Review auth middleware\nCheck JWT expiry";
  doc.nodes.push(untitled);
  assert.equal(syncUntitledAgentTitles(doc), true);
  assert.equal(untitled.title, "Review auth middleware");

  const projects = [
    {
      id: "ws-1",
      name: "flowspace",
      path: "/repo/flowspace",
      isGitRepo: true,
      currentBranch: "master",
      branches: [
        {
          name: "master",
          current: true,
          ahead: 0,
          behind: 0,
          commitOid: "abc1234",
          worktreePath: "/repo/flowspace",
        },
        {
          name: "feat/git",
          current: false,
          ahead: 1,
          behind: 0,
          commitOid: "def5678",
          worktreePath: "/repo/flowspace-wt-git",
        },
      ],
      worktrees: [
        {
          path: "/repo/flowspace",
          head: "abc1234",
          branch: "master",
          bare: false,
          detached: false,
          locked: false,
          isMain: true,
        },
        {
          path: "/repo/flowspace-wt-git",
          head: "def5678",
          branch: "feat/git",
          bare: false,
          detached: false,
          locked: false,
          isMain: false,
        },
      ],
    },
  ];
  const agent = {
    ...newNode("agent", 300, 140, "Worker"),
    sessionId: "sess-1",
    workspaceId: "ws-1",
    branch: "feat/git",
    worktreePath: "/repo/flowspace-wt-git",
    subAgentsExpanded: true,
  };

  // Collapsed branches/worktrees -> 1 project card, bridged link
  const collapsed = buildDerivedStructure({
    projects,
    hiddenWorkspaces: [],
    showBranches: false,
    showWorktrees: false,
    visibleNodes: [agent],
    lod: false,
    keepExpandedIds: new Set(),
    runningNodeIds: new Set(),
    waitingNodeIds: new Set(),
  });
  assert.equal(
    collapsed.cards.filter((c) => c.kind === "project").length,
    1,
  );

  // Expanded branches & worktrees -> full 4-tier cards
  const expanded = buildDerivedStructure({
    projects,
    hiddenWorkspaces: [],
    showBranches: true,
    showWorktrees: true,
    visibleNodes: [agent],
    lod: false,
    keepExpandedIds: new Set(),
    runningNodeIds: new Set(),
    waitingNodeIds: new Set(),
  });
  assert.equal(expanded.cards.filter((c) => c.kind === "branch").length, 2);
  assert.equal(expanded.cards.filter((c) => c.kind === "worktree").length, 2);

  const wtCard = expanded.cards.find(
    (c) => c.kind === "worktree" && c.branch === "feat/git",
  )!;
  // Priority 1: Explicit wins over pre-selected
  assert.equal(
    resolveDraftAffiliation({
      explicit: { workspaceId: "ws-explicit", branch: "release" },
      preSelectedStructure: wtCard,
      structureCards: expanded.cards,
      workspaces: [{ id: "ws-1", name: "flowspace", path: "/repo/flowspace" }],
    }).branch,
    "release",
  );
  // Priority 2: Pre-selected structure card wins over spatial distance
  assert.equal(
    resolveDraftAffiliation({
      preSelectedStructure: wtCard,
      dropPoint: { x: -9999, y: -9999 },
      structureCards: expanded.cards,
      workspaces: [{ id: "ws-1", name: "flowspace", path: "/repo/flowspace" }],
    }).worktreePath,
    "/repo/flowspace-wt-git",
  );
  // Priority 3: Nearest visible structure card when nothing was selected
  const nearWt = resolveDraftAffiliation({
    dropPoint: { x: wtCard.box.x + 5, y: wtCard.box.y + 5 },
    structureCards: expanded.cards,
    workspaces: [{ id: "ws-1", name: "flowspace", path: "/repo/flowspace" }],
  });
  assert.equal(nearWt.branch, "feat/git");
});

test("M08: HostGitService init, env scrubbing, untracked discard, staging/commit, diff, worktree, and expectedRevision", async () => {
  // Verify secret scrubbing never forwards API keys or DSH_* vars to git hooks
  const scrubbed = sanitizedGitEnv(true, {
    PATH: "/usr/bin",
    DEEPSEEK_API_KEY: "sk-secret",
    dsh_internal_flag: "1",
    GITHUB_TOKEN: "ghp_secret",
    HOME: "/home/dev",
  });
  assert.equal(scrubbed.DEEPSEEK_API_KEY, undefined);
  assert.equal(scrubbed.dsh_internal_flag, undefined);
  assert.equal(scrubbed.GITHUB_TOKEN, undefined);
  assert.equal(scrubbed.PATH, "/usr/bin");
  assert.equal(scrubbed.GIT_TERMINAL_PROMPT, "0");

  const dir = await mkdtemp(join(tmpdir(), "flowspace-git-test-"));
  const gitSvc = new HostGitService();
  try {
    // Initialize non-repo via `action: "init"`
    const beforeInit = await gitSvc.inspect(dir);
    assert.equal(beforeInit.isGitRepo, false);
    const inited = await gitSvc.act(dir, { action: "init", branch: "main" });
    assert.equal(inited.isGitRepo, true);

    await execFile("git", ["config", "user.email", "test@example.com"], {
      cwd: dir,
    });
    await execFile("git", ["config", "user.name", "FlowSpace Test"], {
      cwd: dir,
    });
    await writeFile(join(dir, "hello.txt"), "line 1\nline 2\n");
    await gitSvc.act(dir, { action: "stageAll" });
    const afterCommit = await gitSvc.act(dir, {
      action: "commit",
      message: "init commit",
    });
    assert.equal(afterCommit.isGitRepo, true);
    assert.equal(afterCommit.branch, "main");
    assert.equal(afterCommit.commits.length, 1);

    await writeFile(join(dir, "hello.txt"), "line 1\nline 2 modified\nline 3\n");
    await writeFile(join(dir, "untracked.txt"), "scratch");
    const status = await gitSvc.inspect(dir);
    assert.equal(status.unstaged.length, 2);

    // Discard handles untracked (`?`) files cleanly via `git clean -fd`
    const afterDiscardUntracked = await gitSvc.act(dir, {
      action: "discard",
      paths: ["untracked.txt"],
    });
    assert.equal(
      afterDiscardUntracked.unstaged.some((u) => u.path === "untracked.txt"),
      false,
    );

    const diff = await gitSvc.diff(dir, {
      target: "working",
      path: "hello.txt",
    });
    assert.ok(diff.hunks.length >= 1);
    assert.ok(
      parseUnifiedDiff(diff.text)[0]?.lines.some((l) =>
        l.includes("+line 2 modified"),
      ),
    );

    // Optimistic concurrency check rejects stale expectedRevision
    await assert.rejects(
      () =>
        gitSvc.act(dir, {
          action: "stageAll",
          expectedRevision: "stale-revision",
        }),
      /状态已变化/,
    );

    // Create isolated worktree
    const wtTarget = join(dir, "..", `wt-${Date.now()}`);
    try {
      const withWt = await gitSvc.act(dir, {
        action: "createWorktree",
        branch: "feat/isolated",
        worktreePath: wtTarget,
      });
      assert.ok(withWt.worktrees.some((w) => w.branch === "feat/isolated"));
      await gitSvc.act(dir, {
        action: "removeWorktree",
        worktreePath: wtTarget,
      });
    } finally {
      await rm(wtTarget, { recursive: true, force: true });
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Multi-input ComfyUI fan-out layout uncrosses upstream wires and interpolates 0..1 cleanly", () => {
  const doc = emptyDocument();
  const srcBottom = newNode("agent", 40, 420, "Bottom Source");
  const srcTop = newNode("agent", 40, 60, "Top Source");
  const srcMiddle = newNode("agent", 40, 240, "Middle Source");
  const target = newNode("agent", 520, 240, "Synthesis");
  doc.nodes.push(srcBottom, srcTop, srcMiddle, target);

  // Add edges in scrambled order: layout must sort top-to-bottom so wires never cross
  const eBottom = newEdge(srcBottom.id, target.id, "continuation");
  const eTop = newEdge(srcTop.id, target.id, "continuation");
  const eMiddle = newEdge(srcMiddle.id, target.id, "continuation");
  doc.edges.push(eBottom, eTop, eMiddle);

  const portPt = endpoint(doc, target.id, "continuation", "in");
  const atZero = computeInputHubLayout({
    doc,
    nodeId: target.id,
    kind: "continuation",
    progress: 0,
  })!;
  assert.equal(atZero.satellites.length, 3);
  assert.deepEqual(
    atZero.satellites.map((s) => s.sourceNode.title),
    ["Top Source", "Middle Source", "Bottom Source"],
  );
  for (const sat of atZero.satellites) {
    assert.equal(sat.wireIn.x, portPt.x);
    assert.equal(sat.wireIn.y, portPt.y);
  }

  const atFull = computeInputHubLayout({
    doc,
    nodeId: target.id,
    kind: "continuation",
    progress: 1,
  })!;
  assert.ok(atFull.satellites[0].cy < atFull.satellites[1].cy);
  assert.ok(atFull.satellites[1].cy < atFull.satellites[2].cy);
  // Concave lens arc places outer satellites slightly further left than center satellite
  assert.ok(atFull.satellites[0].cx < atFull.satellites[1].cx);
  assert.ok(atFull.satellites[2].cx < atFull.satellites[1].cx);
  assert.ok(
    hubFilamentPath(atFull.satellites[0].wireOut, atFull.portPoint).startsWith(
      "M ",
    ),
  );
});

test("Agent Overview defaults, expanded Note/Display defaults, empty File node safety, and blank bound session status", () => {
  const grp = newNode("group", 0, 0, "Blue Group");
  assert.equal(grp.color, "blue");
  const ag = newNode("agent", 0, 0, "Overview First");
  assert.equal(ag.tab, "task");
  const note = newNode("note", 0, 0);
  assert.equal(note.expanded, true);
  const disp = newNode("display", 0, 0);
  assert.equal(disp.expanded, true);
  const file = newNode("file", 0, 0);
  assert.equal(file.text, "");
  assert.deepEqual(file.items, []);

  const seeded = sample(emptyDocument(), "review");
  assert.equal(
    seeded.nodes.find((n) => n.kind === "group")?.color,
    "blue",
  );
  assert.equal(
    seeded.nodes.find((n) => n.kind === "file")?.text,
    "",
    "sample without availableFiles must not prefill non-existent README.md",
  );

  // Pre-bound blank session (seq = -1, no steps) stays "draft" instead of falsely showing Done
  ag.sessionId = "blank-session-1";
  const doc = emptyDocument();
  doc.nodes.push(ag);
  assert.equal(
    nodeStatusOf(
      {
        document: doc,
        runs: [],
        live: [
          {
            nodeId: ag.id,
            sessionId: "blank-session-1",
            output: "",
            seq: -1,
            running: false,
            pendingInput: [],
          },
        ],
      },
      ag.id,
    ),
    "draft",
  );
  assert.equal(
    nodeStatusOf(
      {
        document: doc,
        runs: [],
        live: [
          {
            nodeId: ag.id,
            sessionId: "blank-session-1",
            output: "Done output",
            seq: 4,
            running: false,
            pendingInput: [],
          },
        ],
      },
      ag.id,
    ),
    "completed",
  );
});

test("Wire sanitization (`sanitizeDocumentForWire`), File `mtimeMs:size` versioning, and `computeAutoLayout`", async () => {
  // 1. Floating window `snap: null` and `window: null` strip cleanly for Typert validation
  const doc = emptyDocument();
  const a1 = {
    ...newNode("agent", 900, 500, "Step 1"),
    window: { x: 40, y: 40, w: 480, h: 520, snap: null },
  };
  const a2 = {
    ...newNode("agent", 100, 500, "Step 2"),
    window: null,
  };
  const a3 = newNode("agent", 500, 100, "Step 3");
  const pinnedCard = {
    ...newNode("note", 80, 80, "Pinned Anchor"),
    pinned: true,
  };
  const refFile = newNode("file", 700, 700, "Spec File");
  const outDisplay = {
    ...newNode("display", 50, 50, "Final Report"),
    sourceNodeId: a3.id,
  };
  doc.nodes.push(a1, a2, a3, pinnedCard, refFile, outDisplay);
  doc.edges.push(
    newEdge(a1.id, a2.id, "continuation"),
    newEdge(a2.id, a3.id, "continuation"),
    newEdge(refFile.id, a1.id, "reference"),
  );

  const sanitized = sanitizeDocumentForWire(doc);
  assert.equal(sanitized.nodes[0].window?.snap, undefined);
  assert.equal("snap" in (sanitized.nodes[0].window ?? {}), false);
  assert.equal(sanitized.nodes[1].window, undefined);
  assert.equal("window" in sanitized.nodes[1], false);
  documentSchema.parse(sanitized);
  checkDocument(sanitized);

  // 2. `computeAutoLayout` orders DAG left-to-right, places satellites cleanly, and never moves pinned nodes
  const positions = computeAutoLayout(sanitized.nodes, sanitized.edges);
  assert.equal(positions.has(pinnedCard.id), false, "pinned node must not move");
  const pos1 = positions.get(a1.id)!;
  const pos2 = positions.get(a2.id)!;
  const pos3 = positions.get(a3.id)!;
  const posRef = positions.get(refFile.id)!;
  const posOut = positions.get(outDisplay.id)!;
  assert.ok(pos1.x < pos2.x && pos2.x < pos3.x, "DAG ranks flow left-to-right");
  assert.ok(posRef.x < pos1.x, "layer-0 reference satellite sits to the left of consumer");
  assert.ok(posOut.x > pos3.x, "terminal display satellite sits to the right of producer");

  // 3. `computeFileNodeFingerprint` detects file creation and edits
  const tmp = await mkdtemp(join(tmpdir(), "flowspace-fp-"));
  try {
    refFile.cwd = tmp;
    refFile.selectedItems = ["spec.md"];
    const vMissing = computeFileNodeFingerprint(refFile, tmp);
    await writeFile(join(tmp, "spec.md"), "v1");
    const vCreated = computeFileNodeFingerprint(refFile, tmp);
    assert.notEqual(vMissing, vCreated);
    await writeFile(join(tmp, "spec.md"), "v2-with-more-bytes");
    const vUpdated = computeFileNodeFingerprint(refFile, tmp);
    assert.notEqual(vCreated, vUpdated);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
