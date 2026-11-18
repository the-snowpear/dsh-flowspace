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
