import { z } from "zod";
import type { NodeDescriptor, PortSpec } from "../types.ts";

const reservedPorts = new Set(["in", "out", "else", "error", "timeout", "skip"]);

export const branchSchema = z.object({
  id: z.string().trim().min(1).refine(id => !reservedPorts.has(id), "分支 ID 与固定端口重名"),
  label: z.string().trim().min(1),
});

export function uniqueIds(branches: { id: string }[]): boolean {
  return new Set(branches.map(branch => branch.id)).size === branches.length;
}

export const judgeBase = {
  version: 1,
  family: "logic",
  icon: "logic-branch",
  size: { compact: [256, 96], full: [312, 200] },
  quickCreate: { canvas: true, afterContinuationOut: true },
  experimental: true,
} satisfies Pick<NodeDescriptor, "version" | "family" | "icon" | "size" | "quickCreate" | "experimental">;

export function judgePorts(branches: { id: string; label: string }[], extra?: "else" | "timeout"): PortSpec[] {
  const output = { direction: "out", role: "continuation", dataType: "text" } as const;
  return [
    { id: "in", direction: "in", role: "continuation", dataType: "text" },
    ...branches.map(({ id, label }) => ({ ...output, id, label })),
    ...(extra ? [{ ...output, id: extra, labelKey: `flow_${extra}` }] : []),
    { ...output, id: "error", labelKey: "flow_error", fixed: "error" },
  ];
}
