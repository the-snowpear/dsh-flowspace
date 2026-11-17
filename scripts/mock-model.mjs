import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(
  new URL("../packages/flowspace/package.json", import.meta.url),
);
const { LlmAdapter } = await import(
  pathToFileURL(require.resolve("@deepseek-ai/dsh-llm")).href
);
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
      const last =
        options.messages
          .filter((m) => m.role === "user" && m.source?.kind === "user")
          .at(-1) ?? options.messages.filter((m) => m.role === "user").at(-1);
      const input =
        last?.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n") ?? "";
      if (input.includes("FLOWSPACE_APPROVAL") && options.sessionId) {
        const agent = ctx.agents.get(options.sessionId);
        await ctx.approval.request({
          agent,
          toolName: "flowspace_test",
          reason: "FlowSpace 审批界面验收：不执行文件或网络操作",
          signal: options.signal,
        });
      }
      const text = `【测试模型】已收到任务：${input.slice(0, 600)}`;
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
