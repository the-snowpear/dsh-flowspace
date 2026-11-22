import type {
  ContextSnapshot,
  FlowNode,
  FlowspaceRun,
  JsonObject,
  RunStep,
} from "../types.ts";
import { uid } from "./document.ts";
import { forwardInput, snapshotWithContent } from "./nodes/input.ts";
import { checkAnswers } from "./nodes/interactions.ts";
import type { ExecResult } from "./nodes/types.ts";
import type { RuntimeAdapter, SchedulerStore } from "./schedulerTypes.ts";

export interface HumanGateHost {
  runtime: RuntimeAdapter;
  store: SchedulerStore;
  isDisposed: () => boolean;
  schedule: (id: string, deadline: number, action: () => Promise<void>) => void;
  clearTimer: (id: string) => void;
  execute: (run: FlowspaceRun, step: RunStep, node: FlowNode) => void;
  finishExecStep: (
    run: FlowspaceRun,
    step: RunStep,
    result: Exclude<ExecResult, { awaiting: unknown }>,
    skipped?: boolean,
  ) => Promise<void>;
}

/**
 * Handles human approval choices, forms, operation approvals/parameter retries,
 * and human deadline timers.
 */
export class HumanGateController {
  constructor(private readonly host: HumanGateHost) {}

  armHuman(run: FlowspaceRun, step: RunStep): void {
    const human = step.human;
    if (
      human?.deadline === undefined ||
      !human.timeoutAction ||
      human.timeoutAction === "wait"
    ) {
      return;
    }
    this.host.schedule(step.id, human.deadline, async () => {
      if (
        this.host.isDisposed() ||
        step.state !== "awaiting" ||
        ["cancelled", "interrupted"].includes(run.state)
      ) {
        return;
      }
      const route =
        human.timeoutAction === "default"
          ? human.defaultOption!
          : human.timeoutAction === "skip"
            ? "skip"
            : "timeout";
      await this.resolveHuman(run, step, route, human.timeoutAction === "skip");
    });
  }

  humanSource(
    node: FlowNode,
    step: RunStep,
    values: JsonObject,
  ): ContextSnapshot {
    if (node.flowType === "flowspace/human-score") {
      values = {
        ...values,
        reviewed:
          step.sources[0]?.content?.value ?? step.sources[0]?.text ?? "",
      };
    }
    return snapshotWithContent(
      node,
      node.flowType === "flowspace/human-review"
        ? { dataType: "text", value: String(values.text ?? "") }
        : { dataType: "record", value: values },
    );
  }

  async resolveHuman(
    run: FlowspaceRun,
    step: RunStep,
    route: string,
    skip = false,
  ): Promise<void> {
    this.host.clearTimer(step.id);
    const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
    const source =
      route === "out" && step.human?.fields && step.human.initial
        ? this.humanSource(node, step, step.human.initial)
        : await forwardInput(
            node,
            step,
            this.host.runtime.contextText?.bind(this.host.runtime),
          );
    await this.host.finishExecStep(
      run,
      step,
      { route, source, output: route, verdict: { branch: route } },
      skip,
    );
  }

  async answer(
    run: FlowspaceRun,
    stepId: string,
    option: string,
    values?: JsonObject,
  ): Promise<void> {
    const step = run.steps.find((s) => s.id === stepId);
    if (step?.state !== "awaiting" || !step.human) {
      throw new Error("该步骤没有等待回答的问题");
    }
    if (!step.human.options.includes(option)) {
      throw new Error("无效的人工选项");
    }
    if (step.human.operation && option === "execute" && step.operation) {
      for (const key of step.operation.missing) {
        if (typeof values?.[key] !== "string" || !(values[key] as string).trim()) {
          throw new Error(`请填写 ${key}`);
        }
      }
      for (const key of step.operation.missing) {
        step.operation.values[key] = values![key] as string;
      }
      step.operation.missing = [];
      step.operation.approved = true;
      delete step.human;
      step.state = "running";
      run.state = "running";
      await this.host.store.changed();
      this.host.execute(
        run,
        step,
        run.graph.nodes.find((node) => node.id === step.nodeId)!,
      );
      return;
    }
    if (step.human.operation && option === "skip") {
      await this.resolveHuman(run, step, "skip", true);
      return;
    }
    if (step.human.operation && option === "retry" && step.operation?.sessionId) {
      if (run.steps.some((entry) => entry.parameterRetryFor === step.id)) {
        throw new Error("已经向上游追问");
      }
      const prior = run.steps.find(
        (entry) =>
          step.upstreamStepIds?.includes(entry.id) &&
          entry.sessionId === step.operation?.sessionId,
      );
      if (!prior) throw new Error("无法找到上游会话");
      const retry: RunStep = {
        id: uid(),
        requestId: uid(),
        nodeId: prior.nodeId,
        sessionId: prior.sessionId,
        task: "请调用 provide_flow_parameters 补齐上一轮未提供的参数。操作将由 FlowSpace 执行。",
        parameterRetryFor: step.id,
        state: "queued",
        iteration: prior.iteration,
        sources: step.sources,
        createdAt: Date.now(),
        startedAt: Date.now(),
      };
      step.human.options = step.human.options.filter((opt) => opt !== "retry");
      run.steps.push(retry);
      await this.host.store.changed();
      await this.host.runtime.send(retry);
      return;
    }
    if (step.human.fields && option === "skip") {
      await this.resolveHuman(run, step, "skip", true);
      return;
    }
    if (step.human.fields && option === "out") {
      this.host.clearTimer(step.id);
      const node = run.graph.nodes.find((n) => n.id === step.nodeId)!;
      const answer = checkAnswers(step.human.fields, values ?? {});
      const source = this.humanSource(node, step, answer);
      step.human.initial = answer;
      await this.host.finishExecStep(run, step, {
        route: "out",
        source,
        output: source.text,
      });
      return;
    }
    await this.resolveHuman(run, step, option);
  }
}
