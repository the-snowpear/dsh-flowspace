import type { z } from "zod";
import type { ContextSnapshot, DataCallTrace, FlowContent, FlowDataType, FlowNode, JsonObject, RunStep, StepTelemetry } from "../../types.ts";

export type PortRole = "continuation" | "reference" | "event";
export type DataType = FlowDataType;

export type ExecResult = (
  | { route: string; output: string; source: ContextSnapshot; verdict?: RunStep["verdict"]; telemetry?: StepTelemetry; dataCalls?: DataCallTrace[] }
  | { awaiting: NonNullable<RunStep["human"]> }) & Pick<RunStep, "operation" | "operationResult">;

export interface ExecutionOptions {
  listLimit?: number;
  runId?: string;
  previous?: FlowContent;
  recordCall?(trace: DataCallTrace): Promise<void>;
}
export type NodeExecutor = (node: FlowNode, step: RunStep, signal: AbortSignal, options?: ExecutionOptions) => Promise<ExecResult>;

export interface PortSpec {
  id: string;
  role: PortRole;
  direction: "in" | "out";
  dataType: DataType;
  labelKey?: string;
  label?: string;
  fixed?: "error";
}

export interface NodeDescriptor<C extends JsonObject = JsonObject> {
  flowType: string;
  version: number;
  family: "logic" | "data" | "trigger" | "human" | "exec" | "container";
  icon: string;
  titleKey: string;
  descKey: string;
  configSchema: z.ZodType<C>;
  defaultConfig: C;
  migrate?(old: unknown, fromVersion: number): C;
  ports(config: C): PortSpec[];
  size: { compact: [number, number]; full: [number, number] };
  capabilities: {
    resourceOnly?: boolean;
    callsModel?: boolean;
    runsCode?: boolean;
    sideEffects?: boolean;
    needsHuman?: boolean;
  };
  quickCreate: { canvas: boolean; afterContinuationOut?: boolean; afterReferenceOut?: boolean };
  experimental: true;
}
