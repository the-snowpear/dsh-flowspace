import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
const require = createRequire(
  new URL("../packages/flowspace/package.json", import.meta.url),
);
const { LlmAdapter } = await import(
  pathToFileURL(require.resolve("@deepseek-ai/dsh-llm")).href
);

function transformResponse(request) {
  switch (request.operation) {
    case "map": return { value: { reviewed: request.item } };
    case "filter": return { keep: request.item !== null && (typeof request.item !== "string" || request.item.trim() !== "") };
    case "sort":
      return { indexes: request.items.map((_, index) => index)
        .sort((a, b) => String(request.items[a].value).localeCompare(String(request.items[b].value))) };
    case "dedupe": {
      const seen = new Set();
      return { indexes: request.items.flatMap(({ value }, i) => {
        const label = typeof value === "string" ? value.trim().toLowerCase() : JSON.stringify(value);
        if (seen.has(label)) return [];
        seen.add(label);
        return [i];
      }) };
    }
    case "parse": return { items: request.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean) };
    default: throw new Error("Unknown data transform fixture operation: " + request.operation);
  }
}

export const inject = ["llm", "approval", "agents"];
export function apply(ctx) {
  class FixtureAdapter extends LlmAdapter {
    async listModels(provider) {
      return [
        {
          provider,
          id: "deterministic",
          name: "FlowSpace integration fixture",
        },
        {
          provider,
          id: "deterministic-worker",
          name: "FlowSpace member fixture",
        },
      ];
    }
    async resolveModel(provider, model) {
      return {
        provider,
        id: model,
        name: model,
        context: { contextWindow: 128000, maxOutputTokens: 4096 },
        inputModalities: ["text"],
      };
    }
    async *stream(options) {
      options.signal?.throwIfAborted();
      if (options.purpose === "flowspace-run-report") {
        const run = JSON.parse(options.messages.at(-1).content[0].text);
        const text = `「${run.title}」已完成。运行记录保留了本次输入和各步骤产出，可以沿时间轴逐步复核。`;
        yield { type: "block-start", index: 0, blockType: "text" };
        yield { type: "text-delta", index: 0, text };
        yield { type: "block-end", index: 0, block: { type: "text", text } };
        yield { type: "usage", usage: { inputTokens: 19, outputTokens: 11 } };
        yield { type: "finish", reason: "stop" };
        return;
      }
      if (options.purpose === "flowspace-transform") {
        const request = JSON.parse(options.messages.at(-1).content.find(block => block.type === "text").text);
        const text = JSON.stringify(transformResponse(request));
        yield { type: "block-start", index: 0, blockType: "text" };
        yield { type: "text-delta", index: 0, text };
        yield { type: "block-end", index: 0, block: { type: "text", text } };
        yield { type: "usage", usage: { inputTokens: 9, outputTokens: 4 } };
        yield { type: "finish", reason: "stop" };
        return;
      }
      if (options.purpose === "flowspace-judge") {
        const reason = options.system?.includes("第一次见到机械星图")
          ? "展签讲清楚了圆盘的操作方法，也邀请访客动手寻找星座。"
          : "Fixture reviewed";
        const text = JSON.stringify({ branch: "pass", reason, confidence: 0.95 });
        yield { type: "block-start", index: 0, blockType: "text" };
        yield { type: "text-delta", index: 0, text };
        yield { type: "block-end", index: 0, block: { type: "text", text } };
        yield { type: "usage", usage: { inputTokens: 7, outputTokens: 3 } };
        yield { type: "finish", reason: "stop" };
        return;
      }
      const last =
        options.messages
          .filter((m) => m.role === "user" && m.source?.kind === "user")
          .at(-1) ?? options.messages.filter((m) => m.role === "user").at(-1);
      const input =
        last?.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n") ?? "";
      const recent = options.messages.slice(options.messages.lastIndexOf(last) + 1);
      const container = /^FLOWSPACE_CONTAINER (.+)/.exec(input);
      const containerActions = container ? JSON.parse(container[1]) : [];
      const containerCallCount = recent.flatMap(message => message.content)
        .filter(block => block.type === "tool-call" && /^(board|note|file)_(read|write)$/.test(block.name)).length;
      const emitted = recent.flatMap(message => message.content).filter(
        block => block.type === "tool-call" && block.name === "flow_emit",
      ).length;
      const accumulator = /FLOWSPACE_DATA_ACC_([AB])/.exec(input)?.[1];
      const emissionFixture = input.includes("FLOWSPACE_EMIT_SPIKE") || Boolean(accumulator);
      const fixtureCall = containerActions[containerCallCount] ?? (emissionFixture && emitted < 2
        ? { name: "flow_emit", args: { items: accumulator ? [`${accumulator}:${emitted + 1}`] :
            emitted === 0 ? ["first", { nested: [null, 2] }] : ["last"] } }
        : input.includes("FLOWSPACE_TEAM_SPIKE")
        ? { name: "flowspace_team_spike", args: { slot: "reviewer" } }
        : input.includes("FLOWSPACE_TEST_DELEGATE")
          ? { name: "team_delegate", args: {
              slot: "reviewer",
              task: input.includes("FLOWSPACE_TEST_HOLD_TEAM")
                ? "FLOWSPACE_TEAM_HOLD: Review this sample."
                : "FLOWSPACE_TEAM_WORKER: Review this sample.",
            } }
          : undefined);
      const tool = options.tools?.find((candidate) => candidate.name === fixtureCall?.name);
      const settled = recent.some((message) => message.source?.kind === "subagent-settled");
      if (tool && !settled && (container || tool.name === "flow_emit" || !recent.some((message) => message.content.some(
            (block) => block.type === "tool-call" && block.name === tool.name,
          )))) {
        const block = {
          type: "tool-call",
          id: `fixture-${crypto.randomUUID()}`,
          name: tool.name,
          arguments: JSON.stringify(fixtureCall.args),
        };
        yield { type: "block-start", index: 0, blockType: block.type };
        yield { type: "tool-call-delta", index: 0, id: block.id, name: block.name, argumentsDelta: block.arguments };
        yield { type: "block-end", index: 0, block };
        yield { type: "finish", reason: "tool-calls" };
        return;
      }
      if (input.includes("FLOWSPACE_APPROVAL") && options.sessionId) {
        const agent = ctx.agents.get(options.sessionId);
        await ctx.approval.request({
          agent,
          toolName: "flowspace_test",
          reason: "FlowSpace 审批界面验收：不执行文件或网络操作",
          signal: options.signal,
        });
      }
      if (input.includes("FLOWSPACE_TEAM_WORKER")) await delay(1500, undefined, { signal: options.signal });
      if (input.includes("FLOWSPACE_TEAM_HOLD")) await delay(25_000, undefined, { signal: options.signal });
      const instruction = last?.content.find((block) => block.type === "text")?.text ?? "";
      const policyItem = instruction.startsWith("FLOWSPACE_POLICY_WORKER")
        ? /FLOWSPACE_POLICY_ITEM_([A-D])/.exec(input)?.[1] : undefined;
      if (policyItem) {
        const hold = policyItem === "A" && instruction.includes("HOLD_A");
        await delay(hold ? 45_000 : ({ A: 340, B: 160, C: 60, D: 110 })[policyItem], undefined, { signal: options.signal });
      }
      const isTddVerifier = instruction.includes("结论：通过") && instruction.includes("结论：未通过");
      let text = tool?.name === "team_delegate"
        ? (settled ? "TEAM_FINAL_REVIEW" : "Review assigned.")
        : `【测试模型】已收到任务：${input.slice(0, 600)}`;
      if (policyItem) {
        text = `Reviewed ${policyItem}`;
      } else if (emissionFixture) {
        text = options.tools?.some(candidate => candidate.name === "flow_emit") ? "FLOWSPACE_EMITTED" : "FLOWSPACE_EMIT_UNAVAILABLE";
      } else if (container) {
        text = "FlowSpace container check completed.";
      } else if (isTddVerifier) {
        const priorChecks = options.messages.filter((message) => message.role === "assistant" &&
          message.content.some((block) => block.type === "text" && block.text.startsWith("【TDD 验证】"))).length;
        text = priorChecks % 2 === 0 ? "【TDD 验证】边界用例仍失败。\n结论：未通过" : "【TDD 验证】修复后用例均已通过。\n结论：通过";
      } else if (instruction.startsWith("为机械星图拟写一张展签")) {
        text = "机械星图\n转动圆盘，把日期对准观测时刻，窗口里就会出现当晚可见的北半球星空。把圆盘拨到今天，你能找到北斗七星吗？";
      } else if (instruction.startsWith("为输入中的这件展品写一句展签") || instruction.startsWith("Write one label describing a feature")) {
        const labels = [
          ["机械星图", "机械星图的圆盘可以转动，窗口里的星座会随所选日期改变。"],
          ["黄铜日晷", "黄铜日晷的晷针在刻度盘上投下细长的影子，影子的位置指示当地太阳时。"],
          ["航海罗盘", "转动航海罗盘的外壳，磁针仍指向同一方向，对齐刻度就能读出方位。"],
          ["Mechanical star chart", "Turn the star chart’s disc to see which constellations rise on the selected date."],
          ["Brass sundial", "The sundial’s brass gnomon casts a narrow shadow across the hour markings."],
          ["Mariner’s compass", "Rotate the compass housing and watch the magnetic needle hold its bearing."],
        ];
        text = labels.find(([name]) => input.includes(name))?.[1] ?? text;
      } else if (instruction.startsWith("为这张已通过的展签写一句发布记录")) {
        text = "机械星图展签已完成审核，准予在展厅发布。";
      } else if (instruction.startsWith("为这张被退回的展签写一句修改建议")) {
        text = "建议补充如何对齐日期和刻度，再提交展签复核。";
      }
      yield { type: "block-start", index: 0, blockType: "text" };
      for (let i = 0; i < text.length; i += 25) {
        await new Promise((r) => setTimeout(r, 35));
        options.signal?.throwIfAborted();
        yield { type: "text-delta", index: 0, text: text.slice(i, i + 25) };
      }
      yield { type: "block-end", index: 0, block: { type: "text", text } };
      yield { type: "finish", reason: "stop" };
    }
  }
  ctx.effect(() =>
    ctx.llm.registerAdapter(["flowspace-test"], new FixtureAdapter()),
  );
}
