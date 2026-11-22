import type { Context } from "@deepseek-ai/cordis";
import type { ToolRunContext } from "@deepseek-ai/dsh-tools";
import { z } from "zod";
import type { JsonValue } from "../types.ts";
import { getApproval } from "./dshServices.ts";

export const jsonToolOutput = {
  schema: { type: "object" as const, additionalProperties: true },
  render: (_args: unknown, value: JsonValue) => [
    { type: "text" as const, text: JSON.stringify(value) },
  ],
};

export function zodToolSchema(schema: z.ZodType): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(z.toJSONSchema(schema, { target: "draft-7" })),
  ) as Record<string, unknown>;
}

export async function requestToolApproval(
  ctx: Context,
  exec: ToolRunContext,
  toolName: string,
  reason: string,
  deniedMessage = "操作未获批准",
): Promise<void> {
  const approval = getApproval(ctx);
  const result = await approval?.request({
    agent: exec.agent,
    toolName,
    callId: exec.callId,
    signal: exec.signal,
    reason,
  });
  if (result !== "allowed-once") throw new Error(deniedMessage);
}

export async function approveWrite(
  ctx: Context,
  exec: ToolRunContext,
  toolName: string,
  title: string,
  deniedMessage = "容器改动未获批准",
): Promise<void> {
  await requestToolApproval(
    ctx,
    exec,
    toolName,
    `允许 Agent 修改「${title}」中的内容？`,
    deniedMessage,
  );
}
