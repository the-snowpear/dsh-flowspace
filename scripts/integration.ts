import assert from "node:assert/strict";
import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { boot } from "./environment.mjs";
import {
  emptyDocument,
  newNode,
  newEdge,
} from "../packages/flowspace/src/core/document.ts";
const environmentName = `integration-${Date.now()}`;
const { ctx, shutdown, workspace, profile } = await boot({
  name: environmentName,
  mock: true,
  port: 3192,
});
const report: { name: string; passed: boolean }[] = [];
async function until(test: () => boolean, description: string): Promise<void> {
  const end = Date.now() + 20000;
  while (!test() && Date.now() < end)
    await new Promise((r) => setTimeout(r, 100));
  assert.ok(test(), description);
}
try {
  const service = ctx.flowspace;
  assert.ok(service, "FlowSpace service loaded");
  const doc = emptyDocument();
  doc.nodes = ["Analyze", "Review", "Summarize"].map((title, i) => ({
    ...newNode("agent", 80 + i * 420, 120, title),
    cwd: workspace,
    task: `Reply briefly to ${title}`,
    draft: `Reply briefly to ${title}`,
  }));
  doc.edges = [
    newEdge(doc.nodes[0].id, doc.nodes[1].id, "continuation"),
    {
      ...newEdge(doc.nodes[1].id, doc.nodes[2].id, "continuation"),
      trigger: "confirm",
    },
  ];
  await service.save(doc);
  const run = await service.start({ kind: "global", nodeIds: [] });
  await until(
    () => service.snapshot().runs[0]?.state === "waiting",
    "serial chain reaches confirmation",
  );
  let current = service.snapshot().runs[0];
  assert.equal(current.steps.length, 2);
  assert.equal(current.steps[0].state, "completed");
  assert.equal(current.steps[1].state, "completed");
  report.push({
    name: "Native DSH sessions, model stream and serial continuation",
    passed: true,
  });
  await service.release({
    runId: run.id,
    tokenId: current.tokens.find((t) => !t.ready)!.id,
    accept: true,
  });
  await until(
    () => service.snapshot().runs[0].state === "completed",
    "confirmation completes third agent",
  );
  current = service.snapshot().runs[0];
  assert.equal(current.steps.length, 3);
  report.push({
    name: "Persisted confirmation and run ownership",
    passed: true,
  });
  const session = current.steps[0].sessionId!;
  await ctx.sessionController.prompt(
    {
      sessionId: session,
      requestId: crypto.randomUUID(),
      mode: "queue",
      content: [{ type: "text", text: "Native chat follow-up" }],
    },
    new AbortController().signal,
  );
  await until(
    () =>
      service.snapshot().runs.length === 2 &&
      service.snapshot().runs[1].state === "waiting",
    "native chat creates one additional workflow",
  );
  report.push({ name: "Native chat triggers exactly one run", passed: true });
  const changed = service.snapshot().document;
  changed.nodes[0].nativeTrigger = "disabled";
  await service.save(changed);
  await ctx.sessionController.prompt(
    {
      sessionId: session,
      requestId: crypto.randomUUID(),
      mode: "queue",
      content: [{ type: "text", text: "Native chat without continuation" }],
    },
    new AbortController().signal,
  );
  const agent = await ctx.sessionController.resolveAgent(session);
  await agent.agent.whenIdle();
  assert.equal(service.snapshot().runs.length, 2);
  report.push({ name: "Node native-chat override", passed: true });
  const forkDoc = service.snapshot().document;
  const fork = {
    ...newNode("agent", 100, 650, "Forked review"),
    task: "Review inherited history",
    draft: "Review inherited history",
  };
  forkDoc.nodes.push(fork);
  forkDoc.edges = [
    { ...newEdge(forkDoc.nodes[0].id, fork.id, "continuation"), mode: "fork" },
  ];
  forkDoc.nodes[0].draft = "Prepare a fork";
  await service.save(forkDoc);
  await service.start({ kind: "single", nodeIds: [forkDoc.nodes[0].id] });
  await until(
    () => service.snapshot().runs[2]?.state === "completed",
    "native fork finishes",
  );
  const forkRun = service.snapshot().runs[2];
  assert.notEqual(forkRun.steps[1].sessionId, session);
  const forkSnapshot = await ctx.sessionQuery.observeSession(
    forkRun.steps[1].sessionId,
  );
  assert.ok(forkSnapshot.inheritedEventCount > 0);
  forkSnapshot[Symbol.dispose]();
  report.push({ name: "Native exact-prefix fork", passed: true });
  const refs = service.snapshot().document;
  const note = {
    ...newNode("note", 0, 800, "Pinned criteria"),
    text: "SNAPSHOT_CRITERIA_42",
  };
  refs.nodes.push(note);
  refs.edges = [newEdge(note.id, refs.nodes[0].id, "reference")];
  await service.save(refs);
  const requestId = crypto.randomUUID();
  await ctx.sessionController.prompt(
    {
      sessionId: session,
      requestId,
      mode: "queue",
      content: [{ type: "text", text: "Read my attached criteria" }],
    },
    new AbortController().signal,
  );
  const liveAgent = await ctx.sessionController.resolveAgent(session);
  await liveAgent.agent.whenIdle();
  const observed = await ctx.sessionQuery.observeSession(session);
  const message = observed.events.find(
    (e) => e.type === "user/message" && e.data.source.rpcId === requestId,
  );
  assert.match(JSON.stringify(message), /SNAPSHOT_CRITERIA_42/);
  observed[Symbol.dispose]();
  report.push({
    name: "Native embedded composer includes canvas references",
    passed: true,
  });
  const contextDoc = service.snapshot().document;
  const contextTarget = contextDoc.nodes[1];
  contextTarget.draft = "Inspect pinned history";
  contextDoc.nodes.find((n) => n.id === note.id)!.text =
    "LONG_REFERENCE_".repeat(6000);
  contextDoc.edges = [
    {
      ...newEdge(contextDoc.nodes[0].id, contextTarget.id, "continuation"),
      mode: "session",
      trigger: "off",
    },
    newEdge(note.id, contextTarget.id, "reference"),
  ];
  await service.save(contextDoc);
  const contextRun = await service.start({
    kind: "single",
    nodeIds: [contextTarget.id],
  });
  await until(
    () =>
      service.snapshot().runs.find((r) => r.id === contextRun.id)?.state ===
      "completed",
    "captured history and long reference complete",
  );
  const contextStep = service
    .snapshot()
    .runs.find((r) => r.id === contextRun.id)!.steps[0];
  assert.match(
    contextStep.sources.find((s) => s.kind === "session")!.text,
    /Native chat without continuation/,
  );
  const contextLog = await ctx.sessionQuery.observeSession(
    contextStep.sessionId,
  );
  const submitted = contextLog.events.find(
    (e) =>
      e.type === "user/message" &&
      e.data.source.rpcId === contextStep.requestId,
  );
  assert.match(JSON.stringify(submitted), /完整内容/);
  contextLog[Symbol.dispose]();
  report.push({
    name: "Exact conversation snapshot and native long-context spill",
    passed: true,
  });
  const currentDoc = service.snapshot().document;
  currentDoc.nodes[0].draft = "Persisted draft";
  currentDoc.nodes[0].x = 713;
  currentDoc.nodes[1].continuationPrompt = "DEDICATED_CONTINUATION_PROMPT_99";
  currentDoc.nodes[1].draft = "UNSENT_CHAT_DRAFT_KEEP";
  currentDoc.nodes.push(
    {
      ...newNode("git", -260, 120, "Repo Git"),
      cwd: workspace,
      text: "Branch: main",
    },
    {
      ...newNode("changes", -260, 320, "Turn Changes"),
      cwd: workspace,
      changesSessionId: session,
      text: "Turn #1 (+4 / -1)",
    },
    {
      ...newNode("terminal", -260, 520, "Session Term"),
      cwd: workspace,
      terminalSessionId: session,
      text: "$ pnpm check\nPASS",
    },
  );
  currentDoc.templates = [
    {
      id: "tpl-custom-1",
      title: "Custom Review",
      description: "Saved in templates table",
      revision: 1,
      w: 800,
      h: 400,
      nodes: [],
      edges: [],
      ports: [],
    },
  ];
  currentDoc.snapshots = [
    {
      id: "snap-1",
      title: "Checkpoint 1",
      createdAt: Date.now(),
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  ];
  await service.save(currentDoc);
  const structures = await service.projectStructures();
  assert.ok(Array.isArray(structures), "projectStructures returns workspace array");
  const gitStatus = await service.gitInspect({ cwd: workspace });
  assert.equal(typeof gitStatus.isGitRepo, "boolean");
  report.push({
    name: "4-table storageDomain (templates/snapshots), tool nodes, and Host Git/structure RPCs",
    passed: true,
  });

  // Verify M02: upstream continuation uses continuationPrompt and preserves live chat draft
  const contDoc = service.snapshot().document;
  contDoc.nodes[0].draft = "Trigger upstream for M02 check";
  contDoc.edges = [
    newEdge(contDoc.nodes[0].id, contDoc.nodes[1].id, "continuation"),
  ];
  await service.save(contDoc);
  const m02Run = await service.start({
    kind: "single",
    nodeIds: [contDoc.nodes[0].id],
  });
  await until(
    () =>
      service.snapshot().runs.find((r) => r.id === m02Run.id)?.state ===
      "completed",
    "M02 continuation chain completes",
  );
  const m02Steps = service
    .snapshot()
    .runs.find((r) => r.id === m02Run.id)!.steps;
  assert.equal(m02Steps[1].task, "DEDICATED_CONTINUATION_PROMPT_99");
  assert.equal(
    service.snapshot().document.nodes[1].draft,
    "UNSENT_CHAT_DRAFT_KEEP",
  );
  report.push({
    name: "M02 independent continuationPrompt preserves live session chat draft",
    passed: true,
  });

  // Verify Wave 2A: floating window `snap: null` wire safety, missing-file resilience, X-Ray `inspectEdgePayload`, Bypass pass-through, Telemetry, cumulative >64KiB spill & R10 `restoreSnapshot`
  const wave2Doc = service.snapshot().document;
  wave2Doc.nodes[0].window = { x: 24, y: 24, w: 460, h: 500, snap: null };
  wave2Doc.nodes[1].participation = "bypassed";
  wave2Doc.nodes[2].continuationPrompt = "FINAL_BYPASS_RECEIVER_TASK";
  const missingFileNode = {
    ...newNode("file", -260, 720, "Missing Spec"),
    cwd: workspace,
    selectedItems: ["DOES_NOT_EXIST_YET.md"],
    text: "DOES_NOT_EXIST_YET.md",
  };
  const spillNoteA = {
    ...newNode("note", -260, 920, "Spill Part A"),
    text: "CUMULATIVE_A_".repeat(3200), // ~41.6 KiB (< 64 KiB individually)
  };
  const spillNoteB = {
    ...newNode("note", -260, 1120, "Spill Part B"),
    text: "CUMULATIVE_B_".repeat(3200), // ~41.6 KiB (A + B > 64 KiB cumulatively!)
  };
  wave2Doc.nodes.push(missingFileNode, spillNoteA, spillNoteB);
  const missingFileEdge = newEdge(
    missingFileNode.id,
    wave2Doc.nodes[0].id,
    "reference",
  );
  wave2Doc.edges = [
    newEdge(wave2Doc.nodes[0].id, wave2Doc.nodes[1].id, "continuation"),
    newEdge(wave2Doc.nodes[1].id, wave2Doc.nodes[2].id, "continuation"),
    missingFileEdge,
    newEdge(spillNoteA.id, wave2Doc.nodes[0].id, "reference"),
    newEdge(spillNoteB.id, wave2Doc.nodes[0].id, "reference"),
  ];
  const savedWave2 = await service.save(wave2Doc);
  assert.equal("snap" in (savedWave2.nodes[0].window ?? {}), false);

  // X-Ray inspectEdgePayload reads payload without mutating sentVersion
  const xrayBefore = await service.inspectEdgePayload({
    edgeId: missingFileEdge.id,
  });
  assert.equal(xrayBefore.freshness, "pending");
  assert.equal(
    service.snapshot().document.edges.find((e) => e.id === missingFileEdge.id)
      ?.sentVersion,
    undefined,
  );

  // Run 0 -> 1 (bypassed) -> 2 with missing file + cumulative >64KiB notes
  const wave2DocReady = service.snapshot().document;
  wave2DocReady.nodes[0].draft = "Run upstream across bypassed middle node";
  await service.save(wave2DocReady);
  const bypassRun = await service.start({
    kind: "single",
    nodeIds: [wave2DocReady.nodes[0].id],
  });
  await until(
    () =>
      service.snapshot().runs.find((r) => r.id === bypassRun.id)?.state ===
      "completed",
    "bypass chain with missing file and cumulative spill completes",
  );
  const finishedBypassRun = service
    .snapshot()
    .runs.find((r) => r.id === bypassRun.id)!;
  // Only nodes[0] and nodes[2] ran; bypassed nodes[1] was skipped!
  assert.deepEqual(
    finishedBypassRun.steps.map((s) => s.nodeId),
    [wave2DocReady.nodes[0].id, wave2DocReady.nodes[2].id],
  );
  assert.ok((finishedBypassRun.steps[0].telemetry?.stepCount ?? 0) >= 1);
  assert.ok((finishedBypassRun.steps[0].telemetry?.durationMs ?? -1) >= 0);

  // Check semantic `<canvas-reference kind="file" ... status="missing">` and cumulative `spillStore` in session log
  const step0Log = await ctx.sessionQuery.observeSession(
    finishedBypassRun.steps[0].sessionId!,
  );
  const step0Msg = step0Log.events.find(
    (e) =>
      e.type === "user/message" &&
      "rpcId" in e.data.source &&
      e.data.source.rpcId === finishedBypassRun.steps[0].requestId,
  );
  const step0Raw = JSON.stringify(step0Msg);
  assert.match(step0Raw, /status=\\"missing\\"/);
  assert.match(step0Raw, /完整内容：/);
  step0Log[Symbol.dispose]();

  // Creating the missing file flips X-Ray freshness from `sent` -> `updated`!
  const xraySent = await service.inspectEdgePayload({
    edgeId: missingFileEdge.id,
  });
  assert.equal(xraySent.freshness, "sent");
  await writeFile(join(workspace, "DOES_NOT_EXIST_YET.md"), "# Fresh Spec\nHello");
  const xrayUpdated = await service.inspectEdgePayload({
    edgeId: missingFileEdge.id,
  });
  assert.equal(xrayUpdated.freshness, "updated");

  // Sibling path outside registered workspace & managed worktrees is rejected/confined back to default root
  const outsideSibling = join(workspace, "..", "unrelated-secret-sibling");
  assert.notEqual(
    service.resolveWorkspaceRoot(outsideSibling),
    outsideSibling,
  );
  assert.equal(
    service.resolveWorkspaceRoot(outsideSibling),
    service.resolveWorkspaceRoot(),
  );

  // R10 atomic `restoreSnapshot` interrupts waiting/active runs safely
  const preRestoreSnapDoc = service.snapshot().document;
  preRestoreSnapDoc.snapshots = [
    {
      id: "snap-1",
      title: "Checkpoint 1",
      createdAt: Date.now(),
      nodes: structuredClone(preRestoreSnapDoc.nodes),
      edges: structuredClone(preRestoreSnapDoc.edges),
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  ];
  await service.save(preRestoreSnapDoc);
  await service.restoreSnapshot({ snapshotId: "snap-1" });
  assert.ok(
    service.snapshot().runs.some((r) => r.state === "interrupted"),
    "restoreSnapshot safely interrupts previously waiting runs",
  );
  report.push({
    name: "Wave 2A Bypass, missing-file safety, cumulative spillStore, X-Ray inspectEdgePayload, Telemetry & R10 restoreSnapshot",
    passed: true,
  });

  const countBeforeRestart = service.snapshot().runs.length;
  const finalDocBeforeRestart = service.snapshot().document;
  finalDocBeforeRestart.nodes[0].draft = "Persisted draft";
  finalDocBeforeRestart.nodes[0].x = 713;
  await service.save(finalDocBeforeRestart);
  const patch = join(profile, "cordis.patch.yml");
  await copyFile(patch, patch + ".before-lifecycle-test");
  await writeFile(patch, "- id: flowspace\n  disabled: true\n");
  await until(
    () => !ctx.get("flowspace"),
    "disabled plugin releases Host service",
  );
  await writeFile(patch, "[]\n");
  await until(
    () => !!ctx.get("flowspace"),
    "enabled plugin reopens its storage",
  );
  assert.equal(ctx.flowspace.snapshot().document.nodes[0].x, 713);
  report.push({
    name: "Profile disable and re-enable retains saved data",
    passed: true,
  });
  await shutdown.shutdown(0);
  const restored = await boot({
    name: environmentName,
    mock: true,
    port: 3192,
  });
  try {
    assert.equal(
      restored.ctx.flowspace.snapshot().document.nodes[0].draft,
      "Persisted draft",
    );
    assert.equal(restored.ctx.flowspace.snapshot().document.nodes[0].x, 713);
    assert.equal(
      restored.ctx.flowspace.snapshot().runs.length,
      countBeforeRestart,
    );
    assert.equal(
      restored.ctx.flowspace.snapshot().document.templates?.length,
      1,
    );
    assert.equal(
      restored.ctx.flowspace.snapshot().document.snapshots?.length,
      1,
    );
    assert.ok(
      restored.ctx.flowspace
        .snapshot()
        .runs.some((r) => r.state === "interrupted"),
    );
    report.push({
      name: "Host restart preserves draft, layout and run identity without replay",
      passed: true,
    });
  } finally {
    await restored.shutdown.shutdown(0);
  }
  console.log(
    JSON.stringify(
      { model: "deterministic fixture; real DSH runtime", report },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error);
  console.error(
    JSON.stringify(
      ctx
        .get("flowspace")
        ?.snapshot()
        .runs.map((r) => ({
          id: r.id,
          state: r.state,
          notes: r.notes,
          steps: r.steps.map((s) => ({ state: s.state, error: s.error })),
        })),
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await shutdown.shutdown(process.exitCode ?? 0);
}
