import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { boot, findAvailablePort } from "./environment.mjs";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../packages/flowspace/src/core/document.ts";
import { builtinTemplates, instantiateTemplate } from "../packages/flowspace/src/client/templates.ts";
import type { FlowspaceRun } from "../packages/flowspace/src/types.ts";
import { triggerConfig } from "../packages/flowspace/src/core/nodes/interactions.ts";
import { triggerNext } from "../packages/flowspace/src/host/nodes/interactions.ts";

type Host = Awaited<ReturnType<typeof boot>>;
async function waitForRun(service: Host["ctx"]["flowspace"], id: string, state: FlowspaceRun["state"]) {
  const timeout = Date.now() + 45_000;
  while (Date.now() < timeout) {
    const current = service.snapshot().runs.find(run => run.id === id)!;
    if (current.state === state) return current;
    if (["error", "cancelled", "interrupted"].includes(current.state))
      throw new Error(JSON.stringify({ states: current.steps.map(step => [step.state, step.error]), notes: current.notes }));
    await delay(50);
  }
  const run = service.snapshot().runs.find(run => run.id === id)!;
  throw new Error(`Expected ${state}, got ${run.state}: ${JSON.stringify(run.steps.map(step => [step.nodeId, step.state, step.error]))}`);
}

export async function verifyOperations({ ctx, workspace }: Host) {
  const service = ctx.flowspace;
  const old = service.snapshot().document;
  const doc = emptyDocument();
  const terminal = newFlowNode("flowspace/exec-terminal", 0, 0);
  terminal.config = { ...terminal.config, cwd: workspace, program: process.execPath,
    parameters: [
      { name: "option", source: "fixed", value: "-p" },
      { name: "script", source: "fixed", value: "process.argv[1]" },
      { name: "argument", source: "human", value: "" },
    ] };
  const git = newFlowNode("flowspace/exec-git", 380, 0);
  const gitWorkspace = await mkdtemp(join(tmpdir(), "flowspace-git-check-"));
  await promisify(execFile)("git", ["init", "-b", "main"], { cwd: gitWorkspace, windowsHide: true });
  await ctx.workspaceRegistry.create(gitWorkspace, "FlowSpace Git fixture");
  git.config = { ...git.config, cwd: gitWorkspace, action: "stage", parameters: [{ name: "paths", source: "fixed", value: "operation-fixture.txt" }] };
  const terminalOwner = { ...newNode("agent", 760, 0, "Terminal owner"), cwd: workspace, task: "Terminal owner" };
  doc.nodes = [terminal, git, terminalOwner];
  try {
    await service.save(doc);
    const run = await service.start({ kind: "single", nodeIds: [terminal.id] });
    const waiting = await waitForRun(service, run.id, "waiting");
    const step = waiting.steps[0];
    assert.match(step.operation?.preview ?? "", /process\.argv/);
    assert.equal(step.human?.operation, true);
    await assert.rejects(service.answerHuman({ runId: run.id, stepId: step.id, option: "execute" }), /argument/);
    await service.answerHuman({ runId: run.id, stepId: step.id, option: "execute", values: { argument: "studio & gallery" } });
    const result = await waitForRun(service, run.id, "completed");
    assert.equal(result.steps[0].operationResult?.exitCode, 0);
    assert.equal(result.steps[0].output?.trim(), "studio & gallery");
    await writeFile(join(gitWorkspace, "operation-fixture.txt"), "gallery");
    const staging = await service.start({ kind: "single", nodeIds: [git.id] });
    await waitForRun(service, staging.id, "completed");
    assert.ok((await service.gitInspect({ cwd: gitWorkspace })).staged.some(entry => entry.path === "operation-fixture.txt"));
    const bound = await service.bind({ nodeId: terminalOwner.id, cwd: workspace });
    assert.ok(bound.sessionId);
    const interactive = newFlowNode("flowspace/exec-terminal", 0, 240);
    interactive.terminalSessionId = bound.sessionId;
    interactive.config = { ...interactive.config, cwd: workspace, program: process.execPath, mode: "interactive", timeoutSec: 20,
      parameters: [{ name: "option", source: "fixed", value: "-p" },
        { name: "expression", source: "fixed", value: "21 * 2" }] };
    const next = service.snapshot().document;
    next.nodes.push(interactive);
    await service.save(next);
    const native = await service.start({ kind: "single", nodeIds: [interactive.id] });
    const finished = await waitForRun(service, native.id, "completed");
    assert.equal(finished.steps[0].operationResult?.exitCode, 0);
    assert.match(finished.steps[0].output ?? "", /(?:^|\n)42(?:\n|$)/);
    assert.ok(service.sessionTerminals({ sessionId: bound.sessionId }).some(terminal => terminal.state === "running"));
  } finally { await service.save(old); }
}

export async function verifyTriggers({ ctx, workspace }: Host) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const doc = emptyDocument();
  const launch = newFlowNode("flowspace/trigger", 0, 0);
  launch.config = { ...launch.config, fields: [{ name: "exhibit", label: "Exhibit", type: "text", required: true }] };
  const form = newFlowNode("flowspace/human-form", 360, 0);
  form.config = { ...form.config, fields: [{ name: "approved", label: "Approved", type: "boolean", required: true }] };
  const notice = newFlowNode("flowspace/notice", 720, 0);
  doc.nodes = [launch, form, notice];
  doc.edges = [newEdge(launch.id, form.id, "continuation"), { ...newEdge(form.id, notice.id, "event"),
    event: { mode: "change", kinds: ["waiting"], cooldownMs: 0 } }];
  try {
    await service.save(doc);
    const run = await service.launchTrigger({ nodeId: launch.id, values: { exhibit: "Star chart" } });
    const waiting = await waitForRun(service, run.id, "waiting");
    assert.equal(waiting.origin, "trigger");
    assert.equal(waiting.steps[0].sources[0].content?.dataType, "record");
    const formStep = waiting.steps.find(step => step.nodeId === form.id)!;
    const until = Date.now() + 5000;
    while (!(service.snapshot().notices?.length) && Date.now() < until) await delay(50);
    assert.ok(service.snapshot().notices?.some(entry => entry.id === service.snapshot().runs.find(row => row.id === run.id)?.steps
      .find(step => step.nodeId === notice.id)?.id));
    await assert.rejects(service.answerHuman({ runId: run.id, stepId: formStep.id, option: "out", values: { approved: "yes" } }), /无效/);
    await service.answerHuman({ runId: run.id, stepId: formStep.id, option: "out", values: { approved: true } });
    const result = await waitForRun(service, run.id, "completed");
    assert.ok(result.events?.some(event => event.kind === "waiting"));
    assert.equal(result.steps.find(step => step.id === formStep.id)?.output, '{"approved":true}');
    const now = Date.parse("2026-11-21T00:00:00Z");
    assert.equal(triggerNext(triggerConfig.parse({ mode: "cron", timeZone: "Asia/Shanghai", schedule: "0 9 * * *" }), now),
      Date.parse("2026-11-21T01:00:00Z"));
    assert.equal(triggerNext(triggerConfig.parse({ mode: "rrule", schedule: "DTSTART:20261121T010000Z\nRRULE:FREQ=DAILY;COUNT=2" }), now),
      Date.parse("2026-11-21T01:00:00Z"));

    const watched = emptyDocument();
    const file = newFlowNode("flowspace/trigger", 0, 0);
    file.config = { ...file.config, enabled: true, mode: "file", cwd: workspace, path: "trigger-fixture.txt", dailyLimit: 1 };
    watched.settings.automaticTriggers = true;
    watched.nodes.push(file);
    await writeFile(join(workspace, "trigger-fixture.txt"), "before");
    await service.save(watched);
    await delay(1400);
    await writeFile(join(workspace, "trigger-fixture.txt"), "changed");
    const limit = Date.now() + 7000;
    let observed = service.snapshot().runs.find(run => run.triggerId === file.id);
    while (!observed && Date.now() < limit) {
      await delay(80);
      observed = service.snapshot().runs.find(run => run.triggerId === file.id);
    }
    assert.ok(observed);
    assert.equal(observed.steps[0].sources[0].content?.items?.[0]?.value, "trigger-fixture.txt");
  } finally { await service.save(previous); }
}

export async function verifyPlaybackBudgetAndTemplates({ ctx, workspace }: Host) {
  const service = ctx.flowspace;
  const previous = service.snapshot().document;
  const doc = emptyDocument();
  const agent = { ...newNode("agent", 0, 0, "Breakpoint"), cwd: workspace, task: "Review binder", breakpoint: true };
  const draw = newFlowNode("flowspace/random", 380, 0);
  draw.config = { ...draw.config, seed: "fixture" };
  doc.nodes = [agent, draw];
  doc.edges = [newEdge(agent.id, draw.id, "continuation")];
  doc.settings.budget = { rounds: 1 };
  try {
    await service.save(doc);
    const run = await service.start({ kind: "global", nodeIds: [] });
    const waiting = await waitForRun(service, run.id, "waiting");
    assert.equal(waiting.steps[0].debug?.reason, "breakpoint");
    assert.equal(waiting.steps[0].sessionId, undefined);
    await service.debugStep({ runId: run.id, stepId: waiting.steps[0].id, action: "step", task: "Revised input" });
    const paused = await waitForRun(service, run.id, "paused");
    assert.equal(paused.budgetPause?.dimension, "rounds");
    assert.equal(paused.steps[0].task, "Revised input");
    assert.equal(service.snapshot().document.nodes.find(node => node.id === agent.id)?.task, "Review binder");
    await service.command({ runId: run.id, action: "resume" });
    const resumed = await waitForRun(service, run.id, "waiting");
    const debug = resumed.steps.find(step => step.nodeId === draw.id)!;
    await service.debugStep({ runId: run.id, stepId: debug.id, action: "continue" });
    await waitForRun(service, run.id, "completed");
    const report = await service.generateReport({ runId: run.id, model: { provider: "flowspace-test", model: "deterministic" } });
    assert.ok(report.summary);
    assert.equal(report.rounds, 2);
    const templates = builtinTemplates("en").filter(template => template.id.startsWith("builtin-play-"));
    assert.equal(templates.length, 5);
    for (const template of templates) {
      const exhibit = emptyDocument();
      instantiateTemplate(exhibit, template, 0, 0, template.title, { cwd: workspace });
      assert.ok((await service.save(exhibit)).nodes.length > 2);
    }
  } finally { await service.save(previous); }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const host = await boot({ name: `extension-checks-${Date.now()}`, mock: true, port: await findAvailablePort(0), syncCredentials: false });
  let code = 1;
  try {
    for (const verify of [verifyOperations, verifyTriggers, verifyPlaybackBudgetAndTemplates]) {
      await verify(host);
      console.log("PASS", verify.name);
    }
    code = 0;
  } catch (error) { console.error(error); }
  finally { await host.shutdown.shutdown(code); }
}
