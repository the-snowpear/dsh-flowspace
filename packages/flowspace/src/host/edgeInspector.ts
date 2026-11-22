import { statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
import { referenceTitle } from "../core/document.ts";
import { extractFileNodePaths } from "../core/utils.ts";
import type { EdgePayloadPreview, InspectEdgeRequest } from "../types.ts";
import { MAX_INLINE_CONTEXT_BYTES } from "./content.ts";
import type { ReferenceService } from "./referenceService.ts";
import type { DshRuntime } from "./runtime.ts";
import type { FlowspaceHostState } from "./state.ts";
import type { WorkspaceFs } from "./workspaceFs.ts";

export interface EdgeInspectorDeps {
  ctx: Context;
  state: FlowspaceHostState;
  runtime: DshRuntime;
  references: ReferenceService;
  workspaceFs: WorkspaceFs;
}

/** Read-only Glass-Box X-Ray wire & capsule payload inspector (zero mutation to `sentVersion`). */
export async function inspectEdgePayload(
  deps: EdgeInspectorDeps,
  request: InspectEdgeRequest,
): Promise<EdgePayloadPreview> {
  const { ctx, state, runtime, references, workspaceFs } = deps;
  const run = request.runId
    ? state.runs.find((r) => r.id === request.runId)
    : [...state.runs]
        .reverse()
        .find((r) => r.tokens.some((t) => t.edgeId === request.edgeId));

  const edge =
    state.doc.edges.find((e) => e.id === request.edgeId) ??
    run?.graph.edges.find((e) => e.id === request.edgeId);
  if (!edge) throw new Error("连线不存在");

  const source =
    state.doc.nodes.find((n) => n.id === edge.source) ??
    run?.graph.nodes.find((n) => n.id === edge.source);
  const target =
    state.doc.nodes.find((n) => n.id === edge.target) ??
    run?.graph.nodes.find((n) => n.id === edge.target);
  if (!source || !target) throw new Error("连线端点不存在");

  // X-Ray is an explicit freshness check. Bypass the short-lived render cache
  // so a file created or edited immediately before inspection is visible.
  references.invalidateFileFingerprints();
  const sourceVersions = references.computeSourceVersions();
  let freshness: EdgePayloadPreview["freshness"] = "live";
  if (edge.kind === "reference") {
    if (edge.always) {
      freshness = "always";
    } else if (!edge.sentVersion) {
      freshness = "pending";
    } else {
      const currentVer = references.referenceVersion(edge, source, sourceVersions);
      freshness =
        currentVer && currentVer !== edge.sentVersion ? "updated" : "sent";
    }
  }

  const runToken = run?.tokens.findLast(
    (token) =>
      token.edgeId === edge.id &&
      (request.runId !== undefined ||
        (!token.skip && token.source.content !== undefined)),
  );

  let content = "";
  let structured = runToken?.source.content ?? edge.snapshotContent;
  let sessionId: string | undefined;
  let seq: number | undefined;
  let totalDiskBytes = 0;

  if (runToken) {
    content = runToken.source.text;
    sessionId = runToken.source.sourceSessionId;
    seq = runToken.source.seq;
  } else if (source.kind === "agent") {
    sessionId = source.sessionId;
    if (source.sessionId) {
      if (edge.mode === "fork") {
        try {
          using obs = await ctx.sessionQuery.observeSession(
            source.sessionId as SessionId,
            { projectionMode: "none" },
          );
          const completedTurns = obs.events.filter(
            (e) =>
              e.type === "turn/end" && e.data.reason.kind === "completed",
          );
          const lastEnd = completedTurns.at(-1);
          seq = lastEnd?.seq ?? obs.cursor;
          const latestSnap = await runtime
            .capture(source, "conclusion", seq)
            .catch(() => null);
          content =
            `[Fork 完整历史分支 · ${completedTurns.length} 个已完成回合 · 截至事件 #${seq}]\n\n` +
            (latestSnap?.text || "(暂无助手文本输出)");
        } catch {
          content = "(会话历史暂不可读)";
        }
      } else {
        try {
          const cap = await runtime.capture(source, edge.mode);
          content = cap.text;
          seq = cap.seq;
        } catch {
          content = source.draft || source.task || "(会话暂无输出)";
        }
      }
    } else {
      content =
        source.draft.trim() ||
        source.task.trim() ||
        "(尚未启动草稿 — 启动运行后将在此传递输出)";
    }
  } else if (
    source.kind === "file" &&
    !edge.snapshotText &&
    !edge.snapshotContent
  ) {
    const cap = await runtime.reference(source, edge);
    structured = cap.content;
    const paths = extractFileNodePaths(source);
    const baseCwd = workspaceFs.resolveWorkspaceRoot(
      source.worktreePath ?? source.cwd,
    );
    const previews: string[] = [cap.text];
    for (const p of paths.slice(0, 4)) {
      try {
        const full = resolve(baseCwd, p);
        const rel = relative(baseCwd, full);
        if (rel.startsWith("..") || isAbsolute(rel)) continue;
        const st = statSync(full);
        if (st.isFile()) {
          totalDiskBytes += st.size;
          const preview = await workspaceFs.readBoundedText({
            path: p,
            cwd: baseCwd,
          });
          previews.push(
            `\n--- ${preview.path} (${st.size} bytes) ---\n${preview.content.slice(0, 4000)}${preview.truncated || preview.content.length > 4000 ? "\n…[预览已截断]" : ""}`,
          );
        }
      } catch {
        /* Missing file already reported in `cap.text` */
      }
    }
    content = previews.join("\n");
  } else {
    const cap = await runtime.reference(source, edge);
    structured = cap.content;
    content = cap.text;
    sessionId = cap.sourceSessionId;
    seq = cap.seq;
  }

  const byteLength = Math.max(
    totalDiskBytes,
    Buffer.byteLength(content, "utf8"),
  );
  const firstLine =
    content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  const summary =
    firstLine.length > 100
      ? `${firstLine.slice(0, 100)}…`
      : firstLine || `${source.title} → ${target.title}`;
  const itemCount =
    structured?.items?.length ??
    (structured?.dataType === "file" && Array.isArray(structured.value)
      ? structured.value.length
      : undefined);

  return {
    edgeId: edge.id,
    kind: edge.kind,
    mode: edge.kind === "reference" ? source.kind : edge.mode,
    sourceTitle:
      source.kind === "board"
        ? (runToken?.source.title ?? referenceTitle(source, edge))
        : source.title,
    targetTitle: target.title,
    ...(sessionId ? { sessionId } : {}),
    ...(seq !== undefined ? { seq } : {}),
    byteLength,
    ...(itemCount !== undefined
      ? { itemCount, originalCount: structured?.originalCount }
      : {}),
    willSpill: byteLength > MAX_INLINE_CONTEXT_BYTES,
    freshness,
    summary,
    content,
  };
}
