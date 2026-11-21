import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { emptyDocument, newEdge, newFlowNode, newNode } from "../packages/flowspace/src/core/document.ts";
import { createFanoutPair } from "../packages/flowspace/src/core/fanout.ts";
import type { FlowspaceDocument, FlowspaceRun, RunStep } from "../packages/flowspace/src/types.ts";
import type { boot } from "./environment.mjs";

type Host = Awaited<ReturnType<typeof boot>>;
interface PolicyCase {
  wait: "all" | "any" | "quorum";
  output: "text" | "list";
  limit: number;
  quorum?: number;
  cancelRest?: boolean;
}

/** A real per-lane human gate lets the test control completion order independently of CPU speed. */
function bracket(workspace: string, policy: PolicyCase) {
  const document = emptyDocument();
  const source = newNode("board", 0, 0, "Items");
  source.columns = [{ id: "items", name: "Items", cards: ["A", "B", "C"].map(key =>
    ({ id: key, text: "FLOWSPACE_POLICY_ITEM_" + key })) }];
  document.nodes.push(source);
  const pair = createFanoutPair(document, 660, 0, {
    sourceId: source.id, sourceKind: "reference", cwd: workspace, title: "Policy " + policy.wait,
    task: policy.cancelRest ? "FLOWSPACE_POLICY_WORKER HOLD_A" : "FLOWSPACE_POLICY_WORKER",
  });
  pair.fan.config = { ...pair.fan.config, concurrency: policy.limit };
  pair.merge.config = { ...pair.merge.config, wait: policy.wait, output: policy.output,
    quorum: policy.quorum ?? 1, cancelRest: policy.cancelRest ?? false };
  const gate = { ...newFlowNode("flowspace/human-choice", pair.master.x + 340, 100),
    parentId: pair.group.id, masterOf: pair.fan.id };
  const sink = { ...newNode("agent", 2400, 0, "Receipt"), task: "Acknowledge the merged result.", cwd: workspace };
  document.nodes.push(gate, sink);
  const final = document.edges.find(edge => edge.source === pair.master.id && edge.target === pair.merge.id)!;
  final.source = gate.id;
  final.sourcePort = "pass";
  document.edges.push({ ...newEdge(pair.master.id, gate.id, "continuation"), targetPort: "in" },
    { ...newEdge(pair.merge.id, sink.id, "continuation"), sourcePort: "out" });
  return { document, mergeId: pair.merge.id, sinkId: sink.id };
}

function observe(host: Host, runId: string, limit: number) {
  let peak = 0;
  const read = (): FlowspaceRun => {
    const run = host.ctx.flowspace.snapshot().runs.find(entry => entry.id === runId)!;
    const active = run.fanouts?.flatMap(batch => batch.lanes.filter(lane => lane.state === "running")).length ?? 0;
    peak = Math.max(peak, active);
    assert.ok(active <= limit, `Fan-out admitted ${active} lanes with a group limit of ${limit}`);
    return run;
  };
  async function until(predicate: (run: FlowspaceRun) => boolean, label: string) {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const run = read();
      if (predicate(run)) return run;
      assert.ok(run.state !== "error" && Date.now() < deadline,
        label + ": " + JSON.stringify([run.state, run.notes, run.steps.map(s => [s.state, s.itemKey, s.error])]));
      await delay(80);
    }
  }
  async function answer(item: string) {
    const run = await until(run => run.steps.some(s => s.itemKey === item && s.state === "awaiting"), `Await gate ${item}`);
    const step = run.steps.find(s => s.itemKey === item && s.state === "awaiting")!;
    await host.ctx.flowspace.answerHuman({ runId, stepId: step.id, option: "pass" });
  }
  return { read, until, answer, peak: () => peak };
}

async function verifyNativeTurns(host: Host, steps: RunStep[]) {
  const native = steps.filter(step => step.sessionId);
  for (const step of native) {
    using log = await host.ctx.sessionQuery.observeSession(step.sessionId!);
    const ids = log.events.flatMap(event => event.type === "user/message" && event.data.source.kind === "user" &&
      event.data.source.rpcId ? [event.data.source.rpcId] : []);
    assert.deepEqual(ids, [step.requestId], "Each top-level lane or sink session received its original request exactly once");
  }
}

export async function verifyFanoutPolicies(host: Host) {
  const service = host.ctx.flowspace;
  const previous = service.snapshot().document;
  const cases: PolicyCase[] = [
    { wait: "all", output: "list", limit: 2 },
    { wait: "any", output: "text", limit: 2 },
    { wait: "quorum", output: "text", quorum: 2, limit: 3 },
    { wait: "any", output: "list", cancelRest: true, limit: 2 },
    { wait: "quorum", output: "list", quorum: 4, limit: 3 },
  ];
  try {
    for (const policy of cases) {
      const graph = bracket(host.workspace, policy);
      await service.save(graph.document);
      const { id } = await service.start({ kind: "global", nodeIds: [] });
      const observed = observe(host, id, policy.limit);
      const initialKeys = policy.limit === 3 ? ["A", "B", "C"] : ["A", "B"];
      await observed.until(run => initialKeys.every(key => run.steps.some(step => step.itemKey === key &&
        (policy.cancelRest && key === "A" ? step.sessionId && step.state === "running" : step.state === "awaiting"))),
        "Initial lanes should reach their gates");
      assert.equal(observed.peak(), policy.limit);
      if (policy.limit === 2) assert.equal(observed.read().steps.some(step => step.itemKey === "C"), false);

      const impossible = (policy.quorum ?? 1) > 3;
      const order = policy.wait === "quorum" ? ["C", "B", "A"] : ["B", "C", "A"];
      const adopted = policy.wait === "all" ? ["A", "B", "C"] : policy.wait === "any" ? ["B"] : ["B", "C"];
      if (policy.wait === "all" || impossible) {
        for (const key of order) await observed.answer(key);
      } else {
        for (const key of order.slice(0, policy.wait === "any" ? 1 : 2)) await observed.answer(key);
        await observed.until(run => run.steps.some(step => step.nodeId === graph.sinkId), "Early merge must reach the sink");
        if (!policy.cancelRest) {
          assert.ok(observed.read().fanouts![0].lanes.some(lane => !lane.endedAt));
          for (const key of order.filter(key => !adopted.includes(key))) await observed.answer(key);
        }
      }
      const run = await observed.until(run => run.state === (impossible ? "error" : "completed"), "Policy run should settle");
      const batch = run.fanouts![0], merges = run.steps.filter(step => step.nodeId === graph.mergeId);
      assert.equal(merges.length, 1);
      const sinks = run.steps.filter(step => step.nodeId === graph.sinkId && step.state !== "skipped");
      if (impossible) {
        assert.equal(merges[0].route, "error");
        assert.equal(sinks.length, 0);
      } else {
        assert.equal(sinks.length, 1);
        const source = sinks[0].sources[0].content!;
        assert.equal(source.dataType, policy.output);
        const results = adopted.map(key => "Reviewed " + key);
        if (policy.output === "list") {
          assert.deepEqual(source.items!.map(item => [item.key, item.value]), adopted.map((key, i) => [key, results[i]]));
        } else assert.equal(source.value, results.join("\n"));
        assert.deepEqual(batch.lanes.filter(lane => lane.adopted).map(lane => lane.item.key), adopted);
        for (const lane of batch.lanes.filter(lane => !adopted.includes(lane.item.key))) {
          assert.equal(lane.adopted, false);
          assert.equal(lane.state, policy.cancelRest ? "cancelled" : "completed");
        }
      }
      const workers = run.steps.filter(step => step.sessionId && step.itemKey);
      assert.equal(workers.length, policy.cancelRest ? 2 : 3);
      assert.equal(new Set(workers.map(step => step.sessionId)).size, workers.length);
      if (policy.cancelRest) assert.ok(["aborted", "interrupted"].includes(workers.find(step => step.itemKey === "A")!.state));
      await verifyNativeTurns(host, [...workers, ...sinks]);
    }
  } finally {
    await service.save(previous);
  }
}

interface RecoveryFixture {
  document: FlowspaceDocument;
  runId: string;
  mergeId: string;
  sinkId: string;
  completedRequests: string[];
}

export async function prepareFanoutRecovery(host: Host): Promise<RecoveryFixture> {
  const service = host.ctx.flowspace, previous = service.snapshot().document;
  try {
    const graph = bracket(host.workspace, { wait: "all", output: "list", limit: 1 });
    await service.save(graph.document);
    const run = await service.start({ kind: "global", nodeIds: [] });
    const observed = observe(host, run.id, 1);
    await observed.answer("A");
    const waiting = await observed.until(run => run.steps.some(step => step.itemKey === "B" && step.state === "awaiting"), "Waiting before restart");
    await service.command({ runId: run.id, action: "pause" });
    const requests = waiting.steps.filter(step => step.sessionId).map(step => step.requestId);
    assert.equal(requests.length, 2);
    return { document: service.snapshot().document, runId: run.id, mergeId: graph.mergeId, sinkId: graph.sinkId,
      completedRequests: requests };
  } finally {
    await service.save(previous);
  }
}

export async function verifyFanoutRecovery(host: Host, fixture: RecoveryFixture) {
  const service = host.ctx.flowspace, previous = service.snapshot().document;
  try {
    await service.save(fixture.document);
    const observed = observe(host, fixture.runId, 1), loaded = observed.read();
    assert.equal(loaded.state, "paused");
    assert.deepEqual(loaded.steps.filter(s => s.sessionId).map(s => s.requestId), fixture.completedRequests);
    assert.equal(loaded.fanouts![0].lanes.find(lane => lane.item.key === "A")!.state, "completed");
    await service.command({ runId: fixture.runId, action: "resume" });
    await observed.answer("B");
    await observed.answer("C");
    const result = await observed.until(run => run.state === "completed", "Restarted fan-out resumes its remaining queue");
    assert.equal(result.steps.filter(s => s.nodeId === fixture.mergeId).length, 1);
    const sink = result.steps.find(s => s.nodeId === fixture.sinkId)!;
    assert.deepEqual(sink.sources[0].content!.items!.map(item => item.value), ["Reviewed A", "Reviewed B", "Reviewed C"]);
    const workers = result.steps.filter(step => step.itemKey && step.sessionId);
    assert.equal(workers.length, 3);
    await verifyNativeTurns(host, [...workers, sink]);
  } finally {
    await service.save(previous);
  }
}
