import type {
  ContextSnapshot,
  FlowContent,
  FlowEdge,
  FlowItem,
  FlowNode,
  FlowspaceRun,
  FlowToken,
  JsonValue,
  RunStep,
  StepEmission,
} from "../types.ts";
import { contentList, DEFAULT_LIST_LIMIT, textOfContent } from "./content.ts";
import {
  checkEmissionValues,
  emissionTargets,
  parseEmission,
  type EmissionTarget,
} from "./emission.ts";
import { snapshotWithContent } from "./nodes/input.ts";
import {
  addNoteOnce,
  edgeFires,
  emitDownstreamTokens,
  pushToken,
} from "./schedulerTokens.ts";
import type { RuntimeAdapter, SchedulerStore } from "./schedulerTypes.ts";

export interface EmissionControllerHost {
  runtime: RuntimeAdapter;
  store: SchedulerStore;
  isDisposed: () => boolean;
  activeSessionStep: (
    sessionId: string,
  ) => { run: FlowspaceRun; step: RunStep } | undefined;
  armDelay: (run: FlowspaceRun, token: FlowToken) => void;
  advance: (run: FlowspaceRun) => Promise<void>;
  settle: (run: FlowspaceRun) => void;
}

/**
 * Manages structured `flow_emit` admission, streaming/batch emission delivery,
 * turn-end emission closing, and fallback parsing when the tool was not called.
 */
export class EmissionController {
  constructor(private readonly host: EmissionControllerHost) {}

  owner(sessionId: string) {
    const owner = this.host.activeSessionStep(sessionId);
    if (!owner || owner.step.emission?.closed) return;
    const targets = emissionTargets(owner.run, owner.step.nodeId);
    if (targets.length) return { ...owner, targets };
  }

  canEmit(sessionId: string): boolean {
    return !this.host.isDisposed() && !!this.owner(sessionId);
  }

  private emissionState(run: FlowspaceRun, step: RunStep): StepEmission {
    return (
      step.emission ?? {
        items: [],
        calls: [],
        total: 0,
        limit: run.listLimit ?? DEFAULT_LIST_LIMIT,
        closed: false,
      }
    );
  }

  private async emissionSnapshot(
    run: FlowspaceRun,
    step: RunStep,
    content: FlowContent,
  ): Promise<ContextSnapshot> {
    const node = run.graph.nodes.find((entry) => entry.id === step.nodeId)!;
    let source: ContextSnapshot = {
      ...snapshotWithContent(node, content),
      kind: "conclusion",
      sourceSessionId: step.sessionId,
      seq: step.endSeq,
    };
    if (
      this.host.runtime.hydrateContent &&
      (content.spill || content.items?.some((item) => item.spill))
    ) {
      source = await this.host.runtime.hydrateContent(source);
      source = { ...source, text: textOfContent(source.content!) };
    }
    return this.host.runtime.freezeContent
      ? this.host.runtime.freezeContent(
          source,
          step.emission?.limit ?? run.listLimit,
          step.sessionId,
        )
      : source;
  }

  private async emissionDeliveries(
    run: FlowspaceRun,
    step: RunStep,
    targets: EmissionTarget[],
    list: ContextSnapshot,
  ) {
    const items = list.content!.items!;
    const records: ContextSnapshot[] = [];
    if (targets.some((target) => target.type === "record")) {
      for (const item of items) {
        const content: FlowContent = item.spill
          ? { dataType: "record", spill: item.spill }
          : { dataType: "record", value: item.value };
        records.push(await this.emissionSnapshot(run, step, content));
      }
    }
    return targets.flatMap(({ edge, node, type }) =>
      (type === "list" ? [list] : records.length ? records : [undefined]).map(
        (source) => ({ edge, node, source }),
      ),
    );
  }

  private pushEmissionDeliveries(
    run: FlowspaceRun,
    step: RunStep,
    deliveries: { edge: FlowEdge; node: FlowNode; source?: ContextSnapshot }[],
    planGate: boolean,
  ): void {
    for (const { edge, node, source } of deliveries) {
      pushToken(
        run,
        edge,
        step,
        node,
        edgeFires(run, edge, step, true) ? source : undefined,
        planGate,
        this.host.armDelay,
        {
          streamFrom: edge.emitMode === "stream" ? step.id : step.streamFrom,
          fanoutBatchId: step.fanoutBatchId,
        },
      );
    }
  }

  async admitEmit(
    owner: ReturnType<EmissionController["owner"]>,
    sessionId: string,
    callId: string,
    values: JsonValue[],
    signal: AbortSignal,
  ): Promise<{ accepted: number; total: number }> {
    signal.throwIfAborted();
    if (
      this.host.isDisposed() ||
      !owner ||
      this.owner(sessionId)?.step !== owner.step
    ) {
      throw new Error("当前原生回合没有可接收结构化内容的步骤");
    }
    const { run, step, targets } = owner;
    const state = this.emissionState(run, step);
    const previous = state.calls.find((call) => call.id === callId);
    if (previous) {
      return { accepted: previous.accepted, total: previous.total };
    }
    checkEmissionValues(targets, values);
    const content = contentList(
      values,
      state.limit - state.items.length,
      [],
      state.items.map((item) => item.key),
    );
    const batch = await this.emissionSnapshot(run, step, content);
    const items = batch.content!.items!;
    const streamTargets = targets.filter(
      (target) =>
        target.edge.emitMode === "stream" &&
        (items.length ||
          (!state.calls.length && !values.length && target.type === "list")),
    );
    const deliveries = await this.emissionDeliveries(
      run,
      step,
      streamTargets,
      batch,
    );
    const planGate = Boolean(
      await this.host.runtime.isPlanModeActive?.(sessionId),
    );
    signal.throwIfAborted();
    const receipt = {
      accepted: items.length,
      total: state.total + values.length,
    };
    step.emission = {
      ...state,
      items: [...state.items, ...items],
      total: receipt.total,
      calls: [...state.calls, { id: callId, ...receipt }],
    };
    this.pushEmissionDeliveries(run, step, deliveries, planGate);
    // Persist the receipt together with the tokens before starting any downstream work.
    await this.host.store.changed();
    if (deliveries.length) {
      await this.host.advance(run);
      this.host.settle(run);
      await this.host.store.changed();
    }
    return receipt;
  }

  async closeEmission(
    run: FlowspaceRun,
    step: RunStep,
    targets: EmissionTarget[],
    planGate: boolean,
  ): Promise<void> {
    const state = this.emissionState(run, step);
    if (state.closed) return;
    let items: FlowItem[] = state.items;
    let total = state.total;
    try {
      if (!state.calls.length) {
        const values = parseEmission(step.output ?? "");
        checkEmissionValues(targets, values);
        items = contentList(values, state.limit).items!;
        total = values.length;
      }
    } catch (error) {
      step.emission = { ...state, closed: true, missing: true };
      step.state = "error";
      step.error = error instanceof Error ? error.message : String(error);
      addNoteOnce(run, step.error);
      return;
    }
    const endTargets = targets.filter(
      (target) =>
        target.edge.emitMode !== "stream" ||
        !state.calls.length ||
        (!items.length && target.type === "record"),
    );
    if (endTargets.length) {
      const content: FlowContent = {
        dataType: "list",
        items,
        ...(total > items.length ? { originalCount: total } : {}),
      };
      const list = await this.emissionSnapshot(run, step, content);
      const deliveries = await this.emissionDeliveries(
        run,
        step,
        endTargets,
        list,
      );
      this.pushEmissionDeliveries(run, step, deliveries, planGate);
      items = list.content!.items!;
    }
    step.emission = { ...state, items, total, closed: true };
  }

  async deliverAgentResult(
    run: FlowspaceRun,
    step: RunStep,
    node: FlowNode,
    planGate: boolean,
  ): Promise<void> {
    const targets = emissionTargets(run, step.nodeId);
    const omit = new Set(targets.map((target) => target.edge.id));
    if (!step.reminderFor) {
      for (const token of run.tokens) {
        if (token.stepId === step.id) omit.add(token.edgeId);
      }
      await emitDownstreamTokens(
        this.host.runtime,
        this.host.armDelay,
        run,
        step,
        node,
        step.sessionId,
        step.endSeq,
        step.output ?? "",
        planGate,
        undefined,
        omit,
      );
    }
    if (targets.length) {
      try {
        await this.closeEmission(run, step, targets, planGate);
      } catch (error) {
        step.state = "error";
        step.error = String(error);
        addNoteOnce(run, step.error);
      }
    }
  }
}
