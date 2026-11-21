import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-tools";
import { z } from "zod";
import type { Scheduler } from "../core/scheduler.ts";

const emission = z.strictObject({ items: z.array(z.json()) });

export function registerFlowEmit(ctx: Context, scheduler: Pick<Scheduler, "canEmit" | "emit" | "transact">) {
  return ctx.tools.register({
    name: "flow_emit",
    description: "Emit ordered JSON items to this FlowSpace step's downstream structured inputs. Call again to append another batch. For a record output, put the JSON object in items.",
    parameters: {
      type: "object", properties: { items: { type: "array", items: {} } },
      required: ["items"], additionalProperties: false,
    },
    output: {
      schema: {
        type: "object", properties: { accepted: { type: "integer" }, total: { type: "integer" } },
        required: ["accepted", "total"], additionalProperties: false,
      },
      render: (_args, result) => [{ type: "text", text: JSON.stringify(result) }],
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error("flow_emit 需要正在执行的 Agent 步骤");
      const { items } = emission.parse(args);
      return scheduler.emit(exec.agent.id, exec.callId, items, exec.signal);
    },
  }, {
    // rc.3 resolves tools immediately after emitting inbox/claimed. Observe the
    // serialized claim before deciding which step owns this native turn.
    when: ({ agent, signal }) => scheduler.transact(async () => {
      signal.throwIfAborted();
      return scheduler.canEmit(agent.id);
    }),
  });
}
