import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { boot, canBindPort, resolveSandboxPaths } from "./environment.mjs";
import { verifyStructuredEmission } from "./flow-emit-spike.mjs";
import { verifyContainerTools, verifyVariablesAndDelivery } from "./container-checks.ts";
import { verifyOperations, verifyTriggers, verifyPlaybackBudgetAndTemplates } from "./extension-checks.ts";
import { verifyFanout } from "./fanout-checks.ts";
import { prepareFanoutRecovery, verifyFanoutPolicies, verifyFanoutRecovery } from "./fanout-policy-checks.ts";
import { verifyDataTransforms } from "./data-checks.ts";
import { exerciseContentTemplate, checkContentTemplateAfterRestart, checkWatchedContent } from "./content-template-checks.ts";
import {
  emptyDocument,
  newNode,
  newFlowNode,
  newEdge,
} from "../packages/flowspace/src/core/document.ts";
import { captureTemplate, instantiateTemplate, teamDependenciesFor } from "../packages/flowspace/src/client/templates.ts";
import { contentList } from "../packages/flowspace/src/core/content.ts";
import { moveBoardCard, normalizeBoardColumns, removeBoardCard, updateBoardCard } from "../packages/flowspace/src/core/board.ts";
type Host = Awaited<ReturnType<typeof boot>>;
type IntegrationFixture = Awaited<ReturnType<typeof initialChecks>>;
const report: { name: string; passed: boolean }[] = [];
async function until(test: () => boolean, description: string, timeoutMs = 20_000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (!test() && Date.now() < end)
    await new Promise((r) => setTimeout(r, 100));
  assert.ok(test(), description);
}

async function initialChecks({ ctx, workspace, profile }: Host) {
  const service = ctx.flowspace;
  assert.ok(service, "FlowSpace service loaded");
  const route = { provider: "flowspace-test", model: "deterministic" };
  const workerRoute = { ...route, model: "deterministic-worker" };
  assert.ok((await service.listModelRoutes()).some((entry) => entry.model === workerRoute.model));
  const reviewer = await service.saveRole({
    id: "review-role", title: "Reviewer", description: "Check a sample",
    persona: "TEAM_REVIEW_PERSONA", model: workerRoute, revision: 0,
  });
  let blueprint = await service.saveTeam({
    id: "review-team", title: "Review team", lead: { persona: "Coordinate reviews", model: route },
    slots: [{ slotId: "reviewer", roleId: reviewer.id, label: "Reviewer" }], norms: "Keep reports brief", revision: 0,
  });
  await assert.rejects(service.saveRole({ ...reviewer, model: { ...route, model: "missing" } }), /Model unavailable/);
  await assert.rejects(service.saveTeam({ ...blueprint, revision: 0 }), /Revision changed/);
  const archivedRole = await service.archiveRole({ id: reviewer.id, revision: reviewer.revision });
  assert.equal(archivedRole.archived, true);
  assert.equal(service.snapshot().teamBlueprints?.[0].revision, 1);
  report.push({ name: "Global role and team RPCs, model catalog validation and archiving", passed: true });
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

  const teamDoc = service.snapshot().document;
  const upstream = { ...newNode("agent", 180, 1270, "Prepare a sample"), task: "Prepare a sample", cwd: workspace };
  const leadNode = { ...newNode("agent", 600, 1270, "Review team"), task: "FLOWSPACE_TEST_DELEGATE", cwd: workspace,
    teamRef: { teamId: blueprint.id, revision: blueprint.revision } };
  const downstream = { ...newNode("agent", 1020, 1270, "Consume team report"), task: "Use the team report", cwd: workspace };
  teamDoc.nodes.push(upstream, leadNode, downstream);
  teamDoc.edges.push(newEdge(upstream.id, leadNode.id, "continuation"), newEdge(leadNode.id, downstream.id, "continuation"));
  await service.save(teamDoc);
  const teamRun = await service.start({ kind: "single", nodeIds: [upstream.id] });
  const teamRunState = () => service.snapshot().runs.find((run) => run.id === teamRun.id)!;
  await until(() => teamRunState().steps[1]?.state === "settling", "team waits for its active member");
  assert.equal(teamRunState().steps.length, 2);
  const leadId = teamRunState().steps[1].sessionId!;
  const teamView = () => service.snapshot().teams?.[leadId];
  await until(() => teamView()?.members[0]?.slotId === "reviewer", "member is mapped to its slot");
  assert.equal(teamView()?.enabled, true);
  assert.equal(teamView()?.members[0]?.model, workerRoute.model);
  const memberId = teamView()!.members[0].sessionId;
  const runningRevision = blueprint.revision;
  blueprint = await service.saveTeam({
    ...blueprint, lead: { ...blueprint.lead, model: workerRoute },
    slots: [{ ...blueprint.slots[0], maxInstances: 2 }],
  });
  assert.equal(teamView()?.revision, runningRevision);
  await until(() => teamRunState().state === "completed", "team report continues downstream");
  assert.equal(teamRunState().steps[1].output, "TEAM_FINAL_REVIEW");
  assert.equal(teamRunState().steps[2].sources[0].text, "TEAM_FINAL_REVIEW");
  assert.equal(teamRunState().steps[1].teamRef?.revision, runningRevision);
  assert.equal(service.snapshot().runs.filter((run) => run.steps.some((step) => step.sessionId === leadId)).length, 1);
  report.push({ name: "Native team delegation, configured member model and settled conclusion continuation", passed: true });

  const teamSignal = AbortSignal.timeout(20_000);
  const { agent: teamLead } = await ctx.sessionController.resolveAgent(leadId);
  await ctx.sessionController.prompt({
    sessionId: leadId, requestId: crypto.randomUUID(), mode: "queue",
    content: [{ type: "text", text: "Check the next team revision." }],
  }, teamSignal);
  await teamLead.whenIdle();
  await until(() => teamView()?.revision === blueprint.revision, "next lead turn picks up the latest roster");
  assert.equal(teamLead.model.current().model, workerRoute.model);
  const delegate = ctx.tools.get("team_delegate", teamLead);
  await assert.rejects(delegate.execute({ slot: "outsider", task: "Review" }, { agent: teamLead, signal: teamSignal }), /Unknown team slot/);
  const assigned = await delegate.execute({ slot: "reviewer", task: "FLOWSPACE_TEAM_WORKER: second review." },
    { agent: teamLead, signal: teamSignal });
  assert.equal(assigned.name, "reviewer-2");
  const outsider = await ctx.subagents.startActivation({
    provider: "spawn", parent: teamLead, name: "off-roster",
    label: "Outside reviewer", delivery: "caller", agentOptions: workerRoute, signal: teamSignal,
    prompt: [{ type: "text", text: "FLOWSPACE_TEAM_WORKER: outside review." }],
  });
  await until(() => teamView()?.members.length === 3, "team shows both slot occupants and an outside member");
  const second = teamView()!.members.find((member) => member.name === assigned.name)!;
  assert.equal(second.slotId, "reviewer");
  assert.equal(teamView()?.members.find((member) => member.sessionId === outsider.childId)?.slotId, null);
  await ctx.subagents.sendMessage(ctx.agents.get(second.sessionId), outsider.childId, [
    { type: "text", text: "Native peer message for the team view." },
  ], { signal: teamSignal });
  const task = await ctx.agentTeams.createTask(teamLead, { subject: "Review task", description: "Check the sample" });
  const work = await ctx.agentTeams.updateTask(teamLead, {
    taskId: task.id, expectedRevision: task.revision, action: "reassign", owner: second.sessionId,
  });
  const blocked = await ctx.agentTeams.createTask(teamLead, {
    subject: "Publish report", description: "Wait for review", blockedBy: [task.id],
  });
  await until(() => teamView()?.tasks.some((item) => item.id === blocked.id && !item.ready), "team shows a blocked task");
  await ctx.agentTeams.updateTask(teamLead, { taskId: task.id, expectedRevision: work.revision, action: "complete" });
  await until(() => teamView()?.tasks.some((item) => item.id === blocked.id && item.ready), "team projects task dependency readiness");
  assert.equal(teamView()?.tasks.find((item) => item.id === task.id)?.ownerName, assigned.name);
  await until(() => service.snapshot().nativeMessages?.some((message) =>
    message.fromSessionId === second.sessionId && message.toSessionId === outsider.childId) ?? false, "team captures native peer message");
  await outsider.result;
  await ctx.subagents.waitForTreeWork(teamLead);
  await teamLead.whenIdle();
  await until(() => teamView()?.capacity.active === 0, "settled members release native capacity");
  report.push({ name: "Team revisions, native member messages, outside roster, capacity and task projection", passed: true });

  // A team composed on the canvas: lead settings on the node, slots from wired role nodes.
  const canvasDoc = service.snapshot().document;
  const canvasLead = { ...newNode("agent", 600, 2070, "Canvas team"), cwd: workspace, task: "FLOWSPACE_TEST_DELEGATE",
    teamConfig: { persona: "Plan, delegate and report.", norms: "Cite evidence." } };
  const canvasReviewer = { ...newNode("role", 600, 2500, "Canvas reviewer"), staffOf: canvasLead.id, slotId: "reviewer",
    task: "Review the sample", text: "Review carefully.", teamModel: workerRoute };
  canvasDoc.nodes.push(canvasLead, canvasReviewer);
  await service.save(canvasDoc);
  const canvasRun = await service.start({ kind: "single", nodeIds: [canvasLead.id] });
  const canvasState = () => service.snapshot().runs.find((run) => run.id === canvasRun.id)!;
  await until(() => !!canvasState().steps[0]?.sessionId, "canvas team creates its lead");
  const canvasLeadId = canvasState().steps[0].sessionId!;
  const canvasView = () => service.snapshot().teams?.[canvasLeadId];
  await until(() => canvasView()?.members[0]?.slotId === "reviewer", "canvas role node staffs the delegated member");
  assert.equal(canvasView()?.teamId, `canvas-${canvasLead.id}`);
  assert.equal(canvasView()?.slots[0]?.nodeId, canvasReviewer.id);
  assert.equal(canvasView()?.members[0]?.model, workerRoute.model);
  assert.ok(canvasView()?.leadModel.model, "a lead without a configured model keeps the session default");
  await until(() => canvasState().state === "completed", "canvas team settles and completes");
  assert.equal(canvasState().steps[0].output, "TEAM_FINAL_REVIEW");
  // Wiring another role node in reaches the lead on its next user turn.
  const rewired = service.snapshot().document;
  rewired.nodes.push({ ...newNode("role", 900, 2500, "Canvas tester"), staffOf: canvasLead.id, teamModel: workerRoute });
  await service.save(rewired);
  const { agent: canvasAgent } = await ctx.sessionController.resolveAgent(canvasLeadId);
  await ctx.sessionController.prompt({
    sessionId: canvasLeadId, requestId: crypto.randomUUID(), mode: "queue",
    content: [{ type: "text", text: "Check the new roster." }],
  }, AbortSignal.timeout(20_000));
  await canvasAgent.whenIdle();
  await until(() => canvasView()?.slots.length === 2, "the lead picks up a newly wired role");
  assert.equal(canvasView()?.slots[1]?.slotId, "canvas-tester");
  const loose = service.snapshot().document;
  const stray = newNode("note", 1200, 2300, "Not an agent");
  loose.nodes.push(stray, { ...newNode("role", 1200, 2500, "Wrong target"), staffOf: stray.id });
  await assert.rejects(service.save(loose), /Agent 节点/);
  // Any agent becomes a team lead in place when a role node is wired in, and goes back when the last one leaves.
  const plainDoc = service.snapshot().document;
  const plain = { ...newNode("agent", 1500, 2070, "Plain agent"), cwd: workspace, task: "Say hello" };
  plainDoc.nodes.push(plain);
  await service.save(plainDoc);
  const plainRun = await service.start({ kind: "single", nodeIds: [plain.id] });
  const plainState = () => service.snapshot().runs.find((run) => run.id === plainRun.id)!;
  await until(() => plainState().state === "completed", "a plain agent runs before it has roles");
  const plainId = plainState().steps[0].sessionId!;
  assert.equal(service.snapshot().teams?.[plainId], undefined);
  const { agent: plainAgent } = await ctx.sessionController.resolveAgent(plainId);
  const plainModel = plainAgent.model.current()?.model;
  // A subagent the agent had before it became a team stays a plain subagent.
  const earlier = await ctx.subagents.startActivation({
    provider: "spawn", parent: plainAgent, name: "earlier-helper", label: "Earlier helper", delivery: "caller",
    agentOptions: workerRoute, signal: AbortSignal.timeout(20_000),
    prompt: [{ type: "text", text: "FLOWSPACE_TEAM_WORKER: earlier work." }],
  });
  await earlier.result;
  await ctx.subagents.waitForTreeWork(plainAgent);
  const staffedDoc = service.snapshot().document;
  const helper = { ...newNode("role", 1500, 2500, "Helper"), staffOf: plain.id, slotId: "reviewer", teamModel: workerRoute };
  staffedDoc.nodes.push(helper);
  await service.save(staffedDoc);
  const plainTeam = () => service.snapshot().teams?.[plainId];
  await until(() => plainTeam()?.slots[0]?.nodeId === helper.id, "a wired role upgrades the agent's session in place");
  assert.equal(plainTeam()?.leadModel.model, plainModel);
  assert.ok(!plainTeam()?.members.some((member) => member.sessionId === earlier.childId), "earlier subagents are not members");
  await ctx.sessionController.prompt({
    sessionId: plainId, requestId: crypto.randomUUID(), mode: "queue",
    content: [{ type: "text", text: "FLOWSPACE_TEST_DELEGATE" }],
  }, AbortSignal.timeout(20_000));
  await until(() => plainTeam()?.members[0]?.nodeId === helper.id, "a delegated member resolves to its role node");
  const helperMember = plainTeam()!.members[0].sessionId;
  await plainAgent.whenIdle();
  await ctx.subagents.waitForTreeWork(plainAgent);
  const unstaffed = service.snapshot().document;
  const parked = unstaffed.nodes.find((node) => node.id === helper.id)!;
  delete parked.staffOf;
  await service.save(unstaffed);
  await until(() => !plainTeam(), "removing the last role releases the lead");
  const restaffed = service.snapshot().document;
  restaffed.nodes.find((node) => node.id === helper.id)!.staffOf = plain.id;
  await service.save(restaffed);
  await until(() => plainTeam()?.members.some((member) => member.sessionId === helperMember && member.nodeId === helper.id) ?? false,
    "wiring the role back returns its member");
  assert.ok(!plainTeam()?.members.some((member) => member.sessionId === earlier.childId));
  report.push({ name: "Teams from wired role nodes, in-place upgrade and release, default lead model and live re-staffing", passed: true });

  const haltDoc = service.snapshot().document;
  const halt = {
    ...newNode("agent", 600, 1670, "Interrupt review"), cwd: workspace,
    task: "FLOWSPACE_TEST_DELEGATE FLOWSPACE_TEST_HOLD_TEAM", teamRef: { teamId: blueprint.id },
  };
  haltDoc.nodes.push(halt);
  haltDoc.edges.push(newEdge(halt.id, downstream.id, "continuation"));
  await service.save(haltDoc);
  const haltedRun = await service.start({ kind: "single", nodeIds: [halt.id] });
  const halted = () => service.snapshot().runs.find((run) => run.id === haltedRun.id)!;
  await until(() => halted().steps[0]?.state === "settling", "the team can be stopped while settling");
  const haltLeadId = halted().steps[0].sessionId!;
  const haltTeam = () => service.snapshot().teams?.[haltLeadId];
  await until(() => haltTeam()?.members[0]?.activity === "running", "the member is still active");
  await service.stopNode(halt.id);
  await until(() => haltTeam()?.capacity.active === 0, "stopping the team also stops its member");
  assert.equal(halted().steps[0].state, "aborted");
  assert.equal(halted().steps.length, 1);
  report.push({ name: "Stopping a settling team interrupts native members without continuing downstream", passed: true });

  blueprint = await service.archiveTeam({ id: blueprint.id, revision: blueprint.revision });
  const source = service.snapshot();
  const group = newNode("group", 100, 1210, "Portable review");
  const chain = [upstream.id, leadNode.id, downstream.id];
  const portableDoc = {
    ...source.document,
    nodes: [group, ...source.document.nodes.filter((node) => chain.includes(node.id)).map(
      (node) => ({ ...node, parentId: group.id }),
    )],
  };
  const template = captureTemplate(portableDoc, group.id, group.title, "", source.teamBlueprints);
  assert.ok(template.nodes.every((node) => !node.sessionId));
  const bundle = JSON.parse(JSON.stringify({
    template, dependencies: teamDependenciesFor(template.nodes, source),
  }));

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
  return { archivedRole, blueprint, leadId, memberId, workerRoute, countBeforeRestart, bundle,
    reviewerId: reviewer.id, upstreamTitle: upstream.title };
}

async function restoredChecks(restored: Host, fixture: IntegrationFixture) {
  const { archivedRole, blueprint, leadId, memberId, workerRoute, countBeforeRestart } = fixture;
  assert.deepEqual(restored.ctx.flowspace.listRoles(), [archivedRole]);
  assert.deepEqual(restored.ctx.flowspace.listTeams(), [blueprint]);
  assert.equal(restored.ctx.flowspace.snapshot().teams?.[leadId]?.members[0]?.sessionId, memberId);
  assert.equal(restored.ctx.flowspace.snapshot().teams?.[leadId]?.tasks.length, 2);
  const { agent: resumedLead } = await restored.ctx.sessionController.resolveAgent(leadId);
  const tools = await restored.ctx.tools.resolve({
    agent: resumedLead, modelSelection: resumedLead.model.current(), signal: AbortSignal.timeout(10_000),
  });
  try {
    const names = restored.ctx.tools.schemas(resumedLead, tools).map((entry) => entry.name);
    assert.ok(names.includes("team_delegate"));
    assert.ok(!names.some((name) => ["subagent", "subagent_fork", "workflow"].includes(name)));
  } finally {
    tools.dispose();
  }
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
  const resumedSignal = AbortSignal.timeout(15_000);
  await restored.ctx.subagents.prompt({
    childSessionId: memberId, requestId: crypto.randomUUID(), delivery: "steer",
    content: [{ type: "text", text: "Cold member continuation." }],
  }, resumedSignal);
  await restored.ctx.subagents.waitForTreeWork(resumedLead);
  using memberLog = await restored.ctx.sessionQuery.observeSession(memberId);
  assert.ok(memberLog.events.some((event) => event.type === "user/message" && JSON.stringify(event.data).includes("Cold member continuation.")));
  assert.ok(memberLog.events.some((event) => event.type === "subagent/descriptor" && event.data.agentModel === workerRoute.model));
  report.push({
    name: "Host restart preserves draft, layout and run identity without replay",
    passed: true,
  });
}

async function portableChecks(fresh: Host, fixture: IntegrationFixture) {
  const { bundle, workerRoute, blueprint, reviewerId, upstreamTitle } = fixture;
  const imported = fresh.ctx.flowspace;
  assert.deepEqual(imported.listTeams(), []);
  assert.deepEqual(imported.listRoles(), []);
  const missingModel = { provider: "offline-provider", model: "unavailable" };
  bundle.dependencies.roles[0].model = missingModel;
  assert.deepEqual(await imported.importWorkflow(bundle), { kind: "missing-models", models: [missingModel] });
  assert.deepEqual(imported.listRoles(), []);
  const replacements = [{ from: missingModel, to: workerRoute }];
  const restored = await imported.importWorkflow({ ...bundle, replacements });
  assert.equal(restored.kind, "imported");
  const rebuilt = restored.document;
  const tpl = rebuilt.templates[0];
  assert.equal(tpl.nodes.find((node) => node.teamRef)?.teamRef.teamId, blueprint.id);
  assert.deepEqual(imported.listRoles()[0].model, workerRoute);
  assert.equal((await imported.importWorkflow(bundle)).kind, "imported");
  assert.equal(imported.listTeams().length, 1);
  const copied = await imported.importWorkflow({ ...bundle, replacements, copyAssets: true });
  assert.equal(copied.kind, "imported");
  const clone = copied.document.templates.at(-1);
  const cloneRef = clone.nodes.find((node) => node.teamRef).teamRef;
  const cloneTeam = imported.listTeams().find((team) => team.id === cloneRef.teamId);
  assert.notEqual(cloneTeam.id, blueprint.id);
  assert.notEqual(cloneTeam.slots[0].roleId, reviewerId);

  const newDoc = copied.document;
  const instance = instantiateTemplate(newDoc, clone, 200, 140, clone.title, { cwd: fresh.workspace });
  const input = newDoc.nodes.find((node) => node.parentId === instance.id && node.title === upstreamTitle);
  await imported.save(newDoc);
  const launch = await imported.start({ kind: "single", nodeIds: [input.id] });
  const restoredRun = () => imported.snapshot().runs.find((run) => run.id === launch.id);
  await until(() => ["completed", "error"].includes(restoredRun()?.state), "imported team workflow settles from an empty library", 45_000);
  assert.equal(restoredRun().state, "completed", JSON.stringify(restoredRun().steps.map((step) => step.error)));
  assert.equal(restoredRun().steps[1].output, "TEAM_FINAL_REVIEW");
  report.push({ name: "Exported team workflow, blank-library import, model replacement, reuse, copy and execution", passed: true });

  const boardDoc = emptyDocument();
  const board = {
    ...newNode("board", 0, 0),
    columns: [
      { id: "todo", name: "Acceptance", role: "todo" as const, cards: [
        { id: "test", text: "Verify build", checklist: [{ id: "sub", text: "BOARD_ASSERTION", done: false }] },
        { id: "unrelated", text: "UNRELATED_BOARD_TASK" },
      ] },
      { id: "done", name: "Verified", role: "done" as const, cards: [] },
    ],
    selectedItems: ["unrelated"],
  };
  const assignee = {
    ...newNode("agent", 660, 0), draft: "Check acceptance criteria", cwd: fresh.workspace,
    participation: "manual" as const, nativeTrigger: "disabled" as const,
  };
  const cardEdge = { ...newEdge(board.id, assignee.id, "reference"), sourceItemKey: "test" };
  boardDoc.nodes = [board, assignee];
  boardDoc.edges = [cardEdge];
  const priorRuns = imported.snapshot().runs.length;
  await imported.save(boardDoc);
  assert.equal(imported.snapshot().runs.length, priorRuns);
  const initial = await imported.inspectEdgePayload({ edgeId: cardEdge.id });
  assert.equal(initial.sourceTitle, "Verify build");
  assert.match(initial.content, /BOARD_ASSERTION/);
  assert.doesNotMatch(initial.content, /UNRELATED_BOARD_TASK/);
  const boardRun = await imported.start({ kind: "single", nodeIds: [assignee.id] });
  const boardResult = () => imported.snapshot().runs.find((run) => run.id === boardRun.id);
  await until(() => boardResult()?.state === "completed", "board reference reaches the native agent");
  const boardStep = boardResult()!.steps[0];
  assert.equal(boardStep.sources.find((source) => source.referenceKind === "board-card")?.text, initial.content);
  assert.equal((await imported.inspectEdgePayload({ edgeId: cardEdge.id })).freshness, "sent");

  const siblingEdit = imported.snapshot().document;
  siblingEdit.nodes[0].columns = updateBoardCard(siblingEdit.nodes[0].columns!, "unrelated", (card) => ({ ...card, text: "Revised unrelated task" }));
  await imported.save(siblingEdit);
  assert.equal((await imported.inspectEdgePayload({ edgeId: cardEdge.id })).freshness, "sent");

  const moved = imported.snapshot().document;
  moved.nodes[0].columns = updateBoardCard(
    moveBoardCard(normalizeBoardColumns(moved.nodes[0].columns), "test", "done"),
    "test",
    (card) => ({ ...card, text: "Verified build", checklist: [{ id: "sub", text: "BOARD_REVISED_ASSERTION", done: true }] }),
  );
  await imported.save(moved);
  const revised = await imported.inspectEdgePayload({ edgeId: cardEdge.id });
  assert.equal(revised.freshness, "updated");
  assert.equal(revised.sourceTitle, "Verified build");
  assert.match(revised.content, /Verified[\s\S]+- \[x\] BOARD_REVISED_ASSERTION/);
  const nativeBoardRequest = crypto.randomUUID();
  await fresh.ctx.sessionController.prompt({
    sessionId: boardStep.sessionId!, requestId: nativeBoardRequest, mode: "queue",
    content: [{ type: "text", text: "Read the updated task" }],
  }, AbortSignal.timeout(15_000));
  const attachedAgent = await fresh.ctx.sessionController.resolveAgent(boardStep.sessionId!);
  await attachedAgent.agent.whenIdle();
  using boardLog = await fresh.ctx.sessionQuery.observeSession(boardStep.sessionId!);
  const boardMessage = JSON.stringify(boardLog.events.find((event) =>
    event.type === "user/message" && "rpcId" in event.data.source && event.data.source.rpcId === nativeBoardRequest,
  ));
  assert.match(boardMessage, /canvas-reference kind=\\"board-card\\"/);
  assert.match(boardMessage, /BOARD_REVISED_ASSERTION/);
  const deleted = imported.snapshot().document;
  deleted.nodes[0].selectedItems = ["test", "unrelated"];
  deleted.nodes[0].columns = removeBoardCard(deleted.nodes[0].columns!, "test");
  const cleaned = await imported.save(deleted);
  assert.deepEqual(cleaned.edges, []);
  assert.deepEqual(cleaned.nodes[0].selectedItems, ["unrelated"]);
  report.push({ name: "Stable board-card reference reaches the native agent and follows edits, moves and deletion", passed: true });

  const agent = (title: string) => ({
    ...newNode("agent", 0, 0, title), cwd: fresh.workspace, task: title, draft: title, nativeTrigger: "disabled" as const,
  });
  for (const kind of ["condition", "human-choice"] as const) {
    const doc = emptyDocument();
    const source = agent("FLOWSPACE_P1_PASS");
    const judge = newFlowNode(`flowspace/${kind}`, 350, 0);
    const selected = agent("Selected downstream");
    const skipped = agent("Skipped downstream");
    const branchId = kind === "condition" ? "pass" : "review";
    const otherPort = kind === "condition" ? "else" : "pass";
    doc.nodes = [source, judge, selected, skipped];
    doc.edges = [
      { ...newEdge(source.id, judge.id, "continuation"), targetPort: "in" },
      { ...newEdge(judge.id, selected.id, "continuation"), sourcePort: branchId },
      { ...newEdge(judge.id, skipped.id, "continuation"), sourcePort: otherPort },
    ];
    await imported.save(doc);
    const launch = await imported.start({ kind: "global", nodeIds: [] });
    const current = () => imported.snapshot().runs.find(run => run.id === launch.id)!;
    if (kind === "human-choice") {
      await until(() => current().steps.some(step => step.state === "awaiting"), "human choice reaches awaiting");
      const waiting = current().steps.find(step => step.nodeId === judge.id)!;
      assert.deepEqual(waiting.human?.options, ["pass", "review"]);
      assert.equal(current().steps.length, 2);
      const answer = { runId: launch.id, stepId: waiting.id, option: branchId };
      await assert.rejects(imported.answerHuman({ ...answer, option: "unknown" }), /无效的人工选项/);
      assert.equal(current().steps.find(step => step.id === waiting.id)?.state, "awaiting");
      await imported.answerHuman(answer);
      await assert.rejects(imported.answerHuman(answer), /没有等待回答/);
    }
    await until(() => current().state === "completed", `${kind} routes to a native downstream agent`);
    const result = current();
    const decision = result.steps.find(step => step.nodeId === judge.id)!;
    const recipient = result.steps.find(step => step.nodeId === selected.id)!;
    assert.equal(result.steps.length, 4);
    assert.equal(recipient.state, "completed");
    assert.equal(decision.state, "completed");
    assert.equal(decision.route, branchId);
    assert.equal(decision.sessionId, undefined);
    assert.equal(decision.sources.length, 1);
    assert.equal(decision.sources[0].sourceNodeId, source.id);
    assert.match(decision.sources[0].text, /FLOWSPACE_P1_PASS/);
    assert.deepEqual(recipient.sources, decision.sources);
    const omitted = result.steps.find(step => step.nodeId === skipped.id)!;
    assert.equal(omitted.state, "skipped");
    assert.equal(omitted.sessionId, undefined);
    assert.ok(imported.snapshot().document.nodes.filter(node => node.sessionId).every(node => [source.id, selected.id].includes(node.id)));
    using log = await fresh.ctx.sessionQuery.observeSession(recipient.sessionId!);
    const deliveries = log.events.flatMap(event => event.type === "user/message" && event.data.source.kind === "user"
      ? [event.data.source.rpcId] : []);
    assert.deepEqual(deliveries, [recipient.requestId]);
    report.push({ name: kind === "condition"
      ? "Condition forwards the exact native Agent snapshot and skips the unselected Agent"
      : "Human choice rejects invalid and duplicate answers and runs the selected Agent once", passed: true });
  }

  const judgeDoc = emptyDocument();
  const judgeInput = agent("P1 judge input");
  const code = newFlowNode("flowspace/code", 0, 0);
  code.config = { ...code.config, source: "(input) => typeof input.text === 'string' && Boolean(input.sourceNodeId) && typeof process === 'undefined' && typeof require === 'undefined'" };
  const ai = newFlowNode("flowspace/ai-judge", 350, 0);
  ai.config = { ...ai.config, provider: workerRoute.provider, model: workerRoute.model };
  judgeDoc.nodes = [judgeInput, code, ai];
  judgeDoc.edges = [
    { ...newEdge(judgeInput.id, code.id, "continuation"), targetPort: "in" },
    { ...newEdge(code.id, ai.id, "continuation"), sourcePort: "pass", targetPort: "in" },
  ];
  await imported.save(judgeDoc);
  const launchJudges = await imported.start({ kind: "global", nodeIds: [] });
  const judgesRun = () => imported.snapshot().runs.find(run => run.id === launchJudges.id)!;
  await until(() => judgesRun().state === "completed", "packaged QuickJS worker and DSH judge stream complete");
  const [seed, ...judges] = judgesRun().steps;
  assert.equal(seed.nodeId, judgeInput.id);
  assert.ok(seed.sessionId);
  assert.deepEqual(judges.map(step => [step.nodeId, step.state, step.route]), [[code.id, "completed", "pass"], [ai.id, "completed", "pass"]]);
  assert.equal(judges[1].verdict?.model, workerRoute.model);
  assert.equal(judges[1].verdict?.reason, "Fixture reviewed");
  assert.equal(judges[1].telemetry?.inputTokens, 7);
  assert.equal(judges[1].telemetry?.outputTokens, 3);
  assert.ok(judges.every(step => !step.sessionId));
  report.push({ name: "Packaged QuickJS and native DSH judge stream execute without agent sessions", passed: true });

  const typedDoc = emptyDocument();
  typedDoc.settings.listLimit = 2;
  const frozen = contentList([{ nested: [null, ["博物馆", null]] }, null, "omitted"], 2);
  const note = newNode("note", 0, 0, "Frozen collection"), consumer = agent("Read frozen entries");
  const archive = newNode("note", 0, 300, "Full catalogue");
  const longRecord = { label: "展签".repeat(12_000), footnotes: [null] };
  typedDoc.nodes = [note, archive, consumer];
  typedDoc.edges = [
    { ...newEdge(note.id, consumer.id, "reference"), snapshotContent: frozen },
    { ...newEdge(archive.id, consumer.id, "reference"), snapshotContent: contentList([longRecord]) },
  ];
  const loaded = await imported.importWorkflow({ document: typedDoc });
  assert.equal(loaded.kind, "imported");
  assert.deepEqual(imported.snapshot().document.edges[0].snapshotContent, frozen);
  const typedRun = await imported.start({ kind: "single", nodeIds: [consumer.id] });
  const currentTyped = () => imported.snapshot().runs.find(run => run.id === typedRun.id)!;
  await until(() => currentTyped().state === "completed", "native dispatch with frozen JSON");
  assert.deepEqual(currentTyped().steps[0].sources[0].content, frozen);
  const spilled = currentTyped().steps[0].sources[1].content?.items?.[0];
  assert.ok(spilled?.spill && spilled.value === undefined);
  assert.ok(spilled.spill.bytes > 65536);
  assert.deepEqual(JSON.parse(await fresh.ctx.fs.readText(await fresh.ctx.fs.resolve(spilled.spill.locator))), longRecord);
  const peek = await imported.inspectEdgePayload({ edgeId: typedDoc.edges[0].id });
  assert.deepEqual([peek.itemCount, peek.originalCount], [2, 3]);
  report.push({ name: "Portable typed references retain nested nulls, item identity and truncation in native runs", passed: true });
  await verifyStructuredEmission(fresh);
  report.push({ name: "Native flow_emit ownership, ordered streaming and end-of-turn delivery", passed: true });
  await verifyContainerTools(fresh);
  report.push({ name: "Native container tools honor single-card scope, approvals and version conflicts", passed: true });
  await verifyVariablesAndDelivery(fresh);
  report.push({ name: "Versioned variables freeze in native Agent inputs and deliver once into a board", passed: true });
  await verifyOperations(fresh);
  report.push({ name: "Native subprocess and Git operations freeze parameters and wait for user input", passed: true });
  await verifyTriggers(fresh);
  report.push({ name: "Launchpad origin, status event delivery and typed human answers", passed: true });
  await verifyPlaybackBudgetAndTemplates(fresh);
  report.push({ name: "Breakpoints, runtime budget, persisted run report and five built-in play templates", passed: true });
  await verifyFanout(fresh);
  report.push({ name: "Static fan-out preserves draft identities, runs each native lane once, and retains removed sessions", passed: true });
  await verifyFanoutPolicies(fresh);
  report.push({ name: "Fan-out concurrency and ordered all, first and quorum results with native sessions", passed: true });
  await verifyDataTransforms(fresh);
  report.push({ name: "Data transforms preserve named inputs, stable item identity, native usage and per-run accumulation", passed: true });
  const filesDoc = emptyDocument();
  filesDoc.settings.listLimit = 2;
  const path = "data-input.txt";
  await writeFile(join(fresh.workspace, path), "星".repeat(24_000) + "\nsecond\nthird");
  const file = { ...newNode("file", 0, 0), cwd: fresh.workspace, selectedItems: [path] };
  const split = newFlowNode("flowspace/split", 400, 0);
  const fileList = newFlowNode("flowspace/dedupe", 400, 300);
  filesDoc.nodes = [file, split, fileList];
  filesDoc.edges = [split, fileList].map(node => ({ ...newEdge(file.id, node.id, "reference"), targetPort: "in" }));
  await imported.save(filesDoc);
  const fileRun = await imported.start({ kind: "global", nodeIds: [] });
  const fileResult = () => imported.snapshot().runs.find(run => run.id === fileRun.id)!;
  await until(() => ["completed", "error"].includes(fileResult().state), "static file transformation settles");
  const fileStep = fileResult().steps.find(step => step.nodeId === split.id)!;
  assert.equal(fileStep.state, "completed", fileStep.error);
  assert.ok(fileStep.sources[0].textSpill && fileStep.outputContent?.items?.[0].spill);
  assert.equal(fileStep.outputContent.originalCount, 3);
  assert.equal(fileStep.outputContent.items[1].value, "second");
  assert.deepEqual(fileResult().steps.find(step => step.nodeId === fileList.id)?.outputContent?.items, [{ key: path, value: path }]);
  report.push({ name: "Static file transforms read the actual file, spill long items and report original length", passed: true });
  await checkWatchedContent(fresh);
  report.push({ name: "Editing a file in place refreshes preview and static draft lanes without creating a run or session", passed: true });
}

const phases = ["initial", "restored", "portable"] as const;
type Phase = typeof phases[number];

async function runPhase(phase: Phase, environmentName: string, port: number) {
  const { home } = resolveSandboxPaths(environmentName);
  const host = await boot({ name: phase === "portable" ? `${environmentName}-portable` : environmentName, mock: true, port });
  const fixturePath = join(home, "integration-fixture.json");
  let exitCode = 1;
  try {
    if (phase === "initial") {
      const fixture = await initialChecks(host);
      const fanoutRecovery = await prepareFanoutRecovery(host);
      const contentTemplate = await exerciseContentTemplate(host);
      await writeFile(join(home, "content-template.json"), JSON.stringify(contentTemplate));
      report.push({ name: "Portable split-fanout-merge template runs its frozen three items in source order", passed: true });
      await writeFile(fixturePath, JSON.stringify({ ...fixture, countBeforeRestart: host.ctx.flowspace.snapshot().runs.length }));
      await writeFile(join(home, "fanout-recovery.json"), JSON.stringify(fanoutRecovery));
    } else {
      const fixture: IntegrationFixture = JSON.parse(await readFile(fixturePath, "utf8"));
      if (phase === "restored") {
        await restoredChecks(host, fixture);
        await verifyFanoutRecovery(host, JSON.parse(await readFile(join(home, "fanout-recovery.json"), "utf8")));
        report.push({ name: "Cold restart resumes a fan-out queue without replaying completed native requests", passed: true });
        await checkContentTemplateAfterRestart(host, JSON.parse(await readFile(join(home, "content-template.json"), "utf8")));
        report.push({ name: "Content template graph, lane results and native requests survive a cold Host restart", passed: true });
      }
      else await portableChecks(host, fixture);
    }
    await writeFile(join(home, `integration-${phase}.json`), JSON.stringify(report));
    exitCode = 0;
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify(host.ctx.get("flowspace")?.snapshot().runs.map((run) => ({
      id: run.id, state: run.state, notes: run.notes,
      steps: run.steps.map((step) => ({ state: step.state, error: step.error })),
    })), null, 2));
  } finally {
    await host.shutdown.shutdown(exitCode);
  }
}

// rc.3 owns process exit during profile disposal. Each boot needs its own
// process so startup, shutdown and cold-restart assertions run independently.
const phase = process.argv[2] as Phase | undefined;
if (phase) {
  assert.ok(phases.includes(phase));
  await runPhase(phase, process.argv[3], Number(process.argv[4]));
} else {
  const environmentName = `integration-${Date.now()}-${process.pid}`;
  const { home } = resolveSandboxPaths(environmentName);
  for (const stage of phases) {
    const address = await canBindPort(0);
    assert.ok(address.ok && address.port, "The integration Host needs a local port");
    const port = String(address.port);
    const child = spawnSync(process.execPath, ["--import", "tsx", import.meta.filename, stage, environmentName, port], {
      stdio: "inherit", windowsHide: true, timeout: 600_000, killSignal: "SIGKILL",
    });
    if (child.error) throw child.error;
    assert.equal(child.status, 0, `${stage} Host exited with ${child.signal ?? child.status}`);
    const completed = JSON.parse(await readFile(join(home, `integration-${stage}.json`), "utf8"));
    assert.ok(completed.length, `${stage} Host finished its assertions`);
    report.push(...completed);
  }
  console.log(JSON.stringify({ model: "deterministic fixture; real DSH runtime", report }, null, 2));
}
