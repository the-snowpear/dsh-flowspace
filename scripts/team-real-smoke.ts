import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { emptyDocument, newEdge, newNode } from "../packages/flowspace/src/core/document.ts";
import { boot, findAvailablePort } from "./environment.mjs";

const { ctx, shutdown, workspace } = await boot({
  name: `real-team-${Date.now()}`, syncCredentials: true, port: await findAvailablePort(0),
});
try {
  const flowspace = ctx.flowspace;
  const catalog = await flowspace.listModelRoutes();
  const routes = catalog.filter((route) => /deepseek/i.test(route.provider));
  const route = routes.find((route) => /flash|chat/i.test(route.model)) ?? routes[0] ?? catalog[0];
  if (!route) throw new Error("No configured DSH model is available.");
  const model = { provider: route.provider, model: route.model };
  await ctx.agentDefaultModel.saveSelection(model);
  console.log(`Real-model team smoke via ${model.provider}/${model.model}`);

  const reviewer = await flowspace.saveRole({
    id: "review", title: "Reviewer", description: "Review synthetic arithmetic",
    persona: "Perform the short calculation and send the result to the lead with the native send_message tool.",
    revision: 0, model,
  });
  const team = await flowspace.saveTeam({
    id: "arithmetic-team", title: "Arithmetic team", revision: 0,
    lead: { model, persona: "Coordinate the reviewer and report their result." },
    slots: [{ roleId: reviewer.id, slotId: "reviewer", label: "Reviewer" }],
    norms: "Use only team and messaging tools. Do not use file, terminal, or network tools.",
  });
  const doc = emptyDocument();
  const upstream = { ...newNode("agent", 0, 0, "Sample"), cwd: workspace,
    task: "Use no tools. Compute 17+4 and return SAMPLE=21." };
  const lead = { ...newNode("agent", 400, 0, "Lead"), cwd: workspace,
    teamRef: { teamId: team.id, revision: team.revision },
    task: [
      "On the first turn, create the board task “Double the sample” with team_task_create.",
      "Use team_delegate with slot reviewer to ask the member to double the upstream SAMPLE and call send_message to lead with WORKER_RESULT=42.",
      "Once the reviewer reports, complete the board task with team_task_update and reply FINAL_REVIEW=42. Preserve this conclusion after the reviewer's completion notice.",
      "If the reviewer is still working, end the turn with a short progress update. The native runtime will deliver the report.",
    ].join(" ") };
  const downstream = { ...newNode("agent", 800, 0, "Validate"), cwd: workspace,
    task: "Use no tools. Read FINAL_REVIEW from the upstream report, then reply TEAM_CHAIN_OK=42 if the result is 42." };
  doc.nodes.push(upstream, lead, downstream);
  doc.edges.push(newEdge(upstream.id, lead.id, "continuation"), newEdge(lead.id, downstream.id, "continuation"));
  await flowspace.save(doc);
  const launched = await flowspace.start({ kind: "single", nodeIds: [upstream.id] });

  let snapshot = flowspace.snapshot();
  let run = snapshot.runs.find((run) => run.id === launched.id)!;
  let lastProgress = "";
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    snapshot = flowspace.snapshot();
    run = snapshot.runs.find((run) => run.id === launched.id)!;
    const progress = run.steps.map((step) => step.state).join(" → ");
    if (progress !== lastProgress) console.log(lastProgress = progress);
    if (run.state === "completed" || run.state === "error") break;
    await delay(1000);
  }
  assert.equal(run.state, "completed", run.steps.map((step) => step.error).filter(Boolean).join("\n"));
  assert.equal(run.steps.length, 3);
  assert.match(run.steps[2].output ?? "", /TEAM_CHAIN_OK\s*=\s*42/);
  const leadId = run.steps[1].sessionId!;
  const teamView = snapshot.teams?.[leadId];
  const member = teamView?.members.find((member) => member.slotId === "reviewer");
  assert.ok(member, "The real lead used team_delegate");
  assert.equal(member.model, model.model);
  assert.ok(snapshot.nativeMessages?.some((message) => message.kind === "agent-message" &&
    message.fromSessionId === member.sessionId && message.toSessionId === leadId &&
    message.text.includes("WORKER_RESULT")), "The real reviewer used send_message");
  assert.ok(teamView?.tasks.some((task) => task.status === "completed"), "The real lead updated the native task board");
  console.log("PASS real team_delegate, send_message, task board and settled continuation.");
} finally {
  await shutdown.shutdown(0);
}
