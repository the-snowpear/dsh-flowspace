import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { boot, root } from "./environment.mjs";
import {
  emptyDocument,
  newNode,
  newEdge,
} from "../packages/flowspace/src/core/document.ts";
const { ctx, shutdown, workspace } = await boot({
  name: `real-smoke-${Date.now()}`,
  mock: false,
  port: 3193,
});
try {
  const catalog = await ctx.sessionController.modelCatalog();
  const group =
    catalog.groups.find(
      (g) => /deepseek/i.test(g.id) && g.models.some((m) => /chat/i.test(m.id)),
    ) ?? catalog.groups[0];
  if (!group) throw new Error("No configured model is available");
  const model = group.models.find((m) => /chat/i.test(m.id)) ?? group.models[0];
  await ctx.agentDefaultModel.saveSelection({
    provider: group.id,
    model: model.id,
  });
  console.log(`Real-model verification: ${group.id}/${model.id}`);
  const doc = emptyDocument();
  const tasks = [
    [
      "Arithmetic A",
      "这是一次插件集成验收。不要使用任何工具。只计算 17+25，输出 A=数字。",
    ],
    [
      "Arithmetic B",
      "这是一次插件集成验收。不要使用任何工具。只计算 6*7，输出 B=数字。",
    ],
    [
      "Join",
      "不要使用任何工具。读取 FlowSpace 引用中的 A、B 结果，输出 sum=两数之和。",
    ],
    ["Final", "不要使用任何工具。读取上游 sum 的结果，只输出 VERIFIED:数字。"],
  ];
  doc.nodes = tasks.map(([title, task], i) => ({
    ...newNode("agent", i * 400, 100, title),
    cwd: workspace,
    task,
    draft: task,
  }));
  doc.edges = [
    newEdge(doc.nodes[0].id, doc.nodes[2].id, "continuation"),
    newEdge(doc.nodes[1].id, doc.nodes[2].id, "continuation"),
    newEdge(doc.nodes[2].id, doc.nodes[3].id, "continuation"),
  ];
  await ctx.flowspace.save(doc);
  await ctx.flowspace.start({ kind: "global", nodeIds: [] });
  const deadline = Date.now() + 180000;
  let previous = "";
  while (Date.now() < deadline) {
    const run = ctx.flowspace.snapshot().runs[0];
    const progress = run.steps
      .map(
        (s) =>
          `${run.graph.nodes.find((n) => n.id === s.nodeId)?.title}:${s.state}`,
      )
      .join(", ");
    if (progress !== previous) {
      console.log(progress);
      previous = progress;
    }
    if (["completed", "error"].includes(run.state)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const run = ctx.flowspace.snapshot().runs[0];
  await mkdir(resolve(root, "artifacts"), { recursive: true });
  await writeFile(
    resolve(root, "artifacts/real-smoke.json"),
    JSON.stringify({ provider: group.id, model: model.id, run }, null, 2),
  );
  assert.equal(run.state, "completed");
  assert.equal(run.steps.length, 4);
  assert.match(run.steps.at(-1).output, /84/);
  console.log(
    "PASS: real parallel → join → serial continuation; final output contains 84.",
  );
} finally {
  await shutdown.shutdown(0);
}
