import { statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  addCollaborationGallery,
  collaborationChildId,
  collaborationLeadId,
  initializeMuseum,
} from "./museum.ts";
import { buildSnapshot } from "../packages/flowspace/src/client/templates.ts";

export async function prepareMuseum(result) {
  const fresh = await initializeMuseum(result);
  const { ctx, home, workspace } = result;
  const marker = join(home, "museum-collaboration-initialized");
  if (statSync(marker, { throwIfNoEntry: false })) return;

  const service = ctx.flowspace;
  const { document } = service.snapshot();
  const cwd = join(workspace, "collection");
  const project = await ctx.workspaceRegistry.create(cwd, "馆藏工作区");
  addCollaborationGallery(document, { cwd, workspaceId: project.id });
  await service.save(document);
  const lead = await service.bind({ nodeId: collaborationLeadId });
  const { agent: parent, error } = await ctx.sessionController.resolveAgent(lead.sessionId);
  if (error) throw error;

  const signal = AbortSignal.timeout(30_000);
  const name = "label-check";
  const descendants = await ctx.subagents.listDescendants(parent.id, signal);
  const previous = descendants.find((child) => child.kind === "child" && child.path === name);
  const activation = previous ? null : await ctx.subagents.startActivation({
    provider: "spawn",
    parent,
    name,
    label: "展签核对",
    prompt: [{ type: "text", text: "核对机械星图的展签，确认名称与可观察的特征。" }],
    delivery: "parent",
    agentOptions: { provider: "flowspace-test", model: "deterministic" },
    signal,
  });
  const childId = previous?.id ?? activation.childId;
  await service.bind({ nodeId: collaborationChildId, sessionId: childId });
  if (!service.snapshot().nativeMessages.some((message) =>
    message.fromSessionId === parent.id && message.toSessionId === childId
  )) {
    await ctx.subagents.sendMessage(parent, childId, [
      { type: "text", text: "请再核对展签末尾是否给访客留下了一个问题。" },
    ], { signal });
  }
  await activation?.result;
  await ctx.subagents.waitForTreeWork(parent);
  await parent.whenIdle();

  if (fresh) {
    const snapshot = service.snapshot();
    snapshot.document.snapshots = [buildSnapshot(snapshot.document, snapshot, "开馆布展")];
    await service.save(snapshot.document);
  }
  await writeFile(marker, "");
}
