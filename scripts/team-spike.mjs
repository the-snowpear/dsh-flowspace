import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { boot, findAvailablePort } from "./environment.mjs";
import { emptyDocument, newNode } from "../packages/flowspace/src/core/document.ts";

const [phase, sandbox] = process.argv.slice(2);
if (!phase) {
  const name = `team-spike-${Date.now()}`;
  for (const step of ["create", "resume"]) {
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), step, name], {
      stdio: "inherit",
      windowsHide: true,
    });
  }
  process.exit(0);
}

const { ctx, shutdown, workspace } = await boot({
  name: sandbox, mock: true, port: await findAvailablePort(0),
});
const name = "flowspace_team_spike";
const model = { provider: "flowspace-test", model: "deterministic-worker" };
const persona = "SPIKE_REVIEWER_PERSONA";
const signal = AbortSignal.timeout(45_000);
const params = {
  type: "object",
  properties: { slot: { type: "string" } },
  required: ["slot"],
  additionalProperties: false,
};
const output = {
  schema: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false,
  },
  render: (_args, result) => [{ type: "text", text: JSON.stringify(result) }],
  presentationMeta: () => ({ label: "Reviewer", model: model.model }),
};
const resolve = async (id) => {
  const { agent, error } = await ctx.sessionController.resolveAgent(id);
  if (error) throw error;
  return agent;
};
const modelTools = async (agent) => {
  const resolved = await ctx.tools.resolve({ agent, modelSelection: agent.model.current(), signal });
  try {
    return ctx.tools.schemas(agent, resolved);
  } finally {
    resolved.dispose();
  }
};
const prompt = (sessionId, text) => ctx.sessionController.prompt({
  sessionId, requestId: crypto.randomUUID(), mode: "queue",
  content: [{ type: "text", text }],
}, signal);
const activate = (parent, name, actSignal) => ctx.subagents.startActivation({
  provider: "spawn", parent, name, label: "Reviewer",
  prompt: [{ type: "text", text: `<role-persona>${persona}</role-persona>\nReview a sample.` }],
  delivery: "parent", agentOptions: model, signal: actSignal,
});
try {
  const service = ctx.flowspace;
  const marked = new Set(service.snapshot().document.nodes.filter(
    (node) => node.title === "Spike lead" && node.sessionId,
  ).map((node) => node.sessionId));
  const starts = [];
  const def = {
    name, description: "Start a reviewer for the spike.", parameters: params, output,
    async execute(_args, exec) {
      assert.ok(marked.has(exec.agent?.id), "executor receives exact calling lead");
      const child = await activate(exec.agent, "reviewer", exec.signal);
      starts.push(child);
      return { name: child.name };
    },
    presentResult(_args, result) {
      return result.isError ? undefined : {
        card: "generic", title: `Delegated to ${result.meta.label} · ${result.meta.model}`,
      };
    },
  };
  const unregister = service.ctx.tools.register(def, { when: ({ agent }) => marked.has(agent.id) });
  try {
    if (phase === "create") {
      const doc = emptyDocument();
      doc.nodes = [newNode("agent", 0, 0, "Spike lead"), newNode("agent", 400, 0, "Ordinary")];
      await service.save(doc);
      const leadId = (await service.bind({ nodeId: doc.nodes[0].id, cwd: workspace })).sessionId;
      const otherId = (await service.bind({ nodeId: doc.nodes[1].id, cwd: workspace })).sessionId;
      marked.add(leadId);
      const lead = await resolve(leadId);
      const other = await resolve(otherId);
      assert.ok((await modelTools(lead)).some((tool) => tool.name === name));
      assert.ok(!(await modelTools(other)).some((tool) => tool.name === name));
      const scoped = lead.ctx.tools.register({
        ...def, parameters: { ...params, properties: { slot: { type: "string", enum: ["reviewer"] } } },
      }, { when: ({ agent }) => agent.id === lead.id });
      assert.deepEqual((await modelTools(lead)).find((tool) => tool.name === name).parameters.properties.slot.enum, ["reviewer"]);
      assert.ok(!(await modelTools(other)).some((tool) => tool.name === name));
      scoped();
      console.log("PASS conditional global tool and Agent-scoped schema shadowing");

      const control = ["subagent", "subagent_fork", "workflow"];
      const visible = new Set((await modelTools(lead)).map((tool) => tool.name));
      const deny = control.filter((tool) => visible.has(tool));
      const restore = lead.ctx.tools.restrict({ deny });
      assert.ok(deny.length > 0);
      assert.ok(!(await modelTools(lead)).some((tool) => control.includes(tool.name)));
      assert.ok((await modelTools(other)).some((tool) => deny.includes(tool.name)));
      console.log(`PASS scoped restriction masks: ${deny.join(", ")}`);
      await ctx.agentTeams.setEnabled(lead, true, signal);
      ctx.permissionPresets.set(lead.session, "danger-full-access");
      assert.notEqual(lead.model.current().model, model.model);
      await prompt(lead.id, "FLOWSPACE_TEAM_SPIKE");
      await lead.whenIdle();
      assert.equal(starts.length, 1, "native model turn executed the conditional tool");
      await starts[0].result;
      await lead.whenIdle();
      using leadLog = await ctx.sessionQuery.observeSession(lead.id);
      const result = leadLog.events.find((event) => event.type === "tool/result" && event.data.meta?.label === "Reviewer");
      assert.ok(result, "presentation metadata persisted on the native tool result");
      assert.equal(def.presentResult({}, { meta: result.data.meta }).title, "Delegated to Reviewer · deterministic-worker");
      restore();

      ctx.permissionPresets.set(lead.session, "workspace-write");
      const second = await activate(lead, "second-reviewer", signal);
      const worker = ctx.agents.get(second.childId);
      const childTools = await modelTools(worker);
      assert.ok(!childTools.some((tool) => tool.name === name));
      const globalTools = new Set(ctx.tools.schemas().map((tool) => tool.name));
      const inheritedTool = childTools.find((tool) => globalTools.has(tool.name));
      assert.ok(inheritedTool);
      const unrestrict = worker.ctx.tools.restrict({ deny: [inheritedTool.name] });
      assert.ok(!(await modelTools(worker)).some((tool) => tool.name === inheritedTool.name));
      unrestrict();
      await second.result;
      for (const [activation, preset] of [[starts[0], "danger-full-access"], [second, undefined]]) {
        using log = await ctx.sessionQuery.observeSession(activation.childId);
        const descriptor = log.events.find((event) => event.type === "subagent/descriptor");
        assert.equal(descriptor?.data.agentProvider, model.provider);
        assert.equal(descriptor?.data.agentModel, model.model);
        assert.ok(log.events.some((event) => event.type === "approval/policy" && event.data.policy === "never"));
        assert.equal(log.events.find((event) => event.type === "permission/preset")?.data.preset, preset);
        assert.ok(log.events.some((event) => event.type === "user/message" && JSON.stringify(event.data).includes(persona)));
      }
      console.log("PASS explicit child route with default native model-selection policy; approval pin, inherited presets, child restrictions, result presentation metadata");
    } else {
      assert.equal(marked.size, 1);
      const lead = await resolve([...marked][0]);
      assert.ok((await modelTools(lead)).some((tool) => tool.name === name));
      assert.equal(ctx.sessionProjections.stateOf(lead.session, "agentTeam").enabled, true);
      const member = (await ctx.subagents.listDescendants(lead.id, signal)).find(
        (entry) => entry.kind === "child" && entry.path === "reviewer",
      );
      assert.ok(member);
      assert.equal(member.activity, "inactive");
      let resumedModel;
      const stop = ctx.on("subagent/start", ({ id }) => {
        if (id === member.id) resumedModel = ctx.agents.get(id)?.model.current()?.model;
      });
      try {
        await ctx.subagents.prompt({
          childSessionId: member.id, requestId: crypto.randomUUID(), delivery: "queue",
          content: [{ type: "text", text: "Continue the review." }],
        }, signal);
        await ctx.subagents.waitForTreeWork(lead);
        await lead.whenIdle();
      } finally {
        stop();
      }
      assert.equal(resumedModel, model.model);
      using log = await ctx.sessionQuery.observeSession(member.id);
      assert.ok(log.events.some((event) => event.type === "user/message" && JSON.stringify(event.data).includes(persona)));
      assert.ok(log.events.some((event) => event.type === "user/message" && JSON.stringify(event.data).includes("Continue the review.")));
      console.log("PASS new process restores lead marker, conditional tool, native team state, child model and persona history");
    }
  } finally {
    unregister();
  }
} finally {
  await shutdown.shutdown(0);
}
