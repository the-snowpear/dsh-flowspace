import type {
  ContextMode,
  ContextSnapshot,
  FlowEdge,
  FlowNode,
  FlowspaceDocument,
  FlowspaceRun,
  FlowToken,
  RunStep,
  TeamReference,
} from "../types.ts";
import type { NodeExecutor } from "./nodes/types.ts";

export interface RuntimeAdapter {
  execute?: NodeExecutor;
  freezeContent?(source: ContextSnapshot, limit?: number, ownerSessionId?: string): Promise<ContextSnapshot>;
  hydrateContent?(source: ContextSnapshot): Promise<ContextSnapshot>;
  contextText?(sources: ContextSnapshot[], sessionId?: string): Promise<string>;
  ensure(node: FlowNode, fork?: ContextSnapshot, sessionTitle?: string): Promise<string>;
  send(step: RunStep): Promise<void>;
  cancel(step: RunStep): Promise<void>;
  capture(
    node: FlowNode,
    mode: ContextMode,
    seq?: number,
    output?: string,
  ): Promise<ContextSnapshot>;
  reference(node: FlowNode, edge?: FlowEdge, target?: FlowNode, limit?: number): Promise<ContextSnapshot>;
  reconcile?(step: RunStep): Promise<Partial<RunStep>>;
  running?(): string[];
  isPlanModeActive?(sessionId: string): boolean | Promise<boolean>;
  teamReference?(sessionId: string): TeamReference | undefined;
  waitForTeam?(sessionId: string): Promise<void>;
}

export interface SchedulerStore {
  document(): FlowspaceDocument;
  changed(): Promise<void>;
  deliver?(run: FlowspaceRun, edge: FlowEdge, token: FlowToken): Promise<void>;
  variableReference?(run: FlowspaceRun, step: RunStep, node: FlowNode): ContextSnapshot;
  prepareStep?(run: FlowspaceRun, step: RunStep, node: FlowNode): Promise<void> | void;
  recordAccumulator?(run: FlowspaceRun, step: RunStep, node: FlowNode, source: ContextSnapshot): Promise<void>;
  toolsFor?(run: FlowspaceRun, step: RunStep): string[];
  bound(
    nodeId: string,
    sessionId: string,
    fork?: ContextSnapshot,
  ): Promise<void>;
  submitted(
    nodeId: string,
    task: string,
    isContinuation?: boolean,
  ): Promise<void>;
}

export const isActiveStep = (step: RunStep): boolean =>
  step.state === "queued" || step.state === "running" || step.state === "settling";

export const isPendingToken = (token: FlowToken): boolean =>
  !token.consumed && !token.dismissed;
