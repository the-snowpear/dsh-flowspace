import { createHash } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session";
import type { KvTable } from "@deepseek-ai/dsh-storage-domain";
import type {} from "@deepseek-ai/dsh-spill";
import type {} from "@deepseek-ai/dsh-fs";
import { textOfContent } from "../core/content.ts";
import type { ContextSnapshot, FlowItem, FlowSpill, JsonValue } from "../types.ts";
import { getSpillStore } from "./dshServices.ts";

export const MAX_INLINE_CONTEXT_BYTES = 64 * 1024;

interface SavedContent extends FlowSpill {
  encoding: "text" | "json";
  retrievalHint: string;
}
export type ContentSpillTable = Pick<KvTable<string, SavedContent>, "get" | "put" | "entries">;

/** rc.3 returns an opaque locator from saveText. Only Host-issued entries can be resolved for a workflow. */
export class ContentSpills {
  private byLocator = new Map<string, SavedContent>();

  constructor(private ctx: Context, private records: ContentSpillTable) {
    for (const [, record] of records.entries()) this.byLocator.set(record.locator, record);
  }

  private async store(value: JsonValue, source: ContextSnapshot, owner: string): Promise<FlowSpill | undefined> {
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    if (Buffer.byteLength(raw, "utf8") <= MAX_INLINE_CONTEXT_BYTES) return undefined;
    const encoding = typeof value === "string" ? "text" : "json";
    const key = createHash("sha256").update(JSON.stringify([owner, encoding])).update(raw).digest("hex");
    let record = this.records.get(key);
    if (!record) {
      const backend = getSpillStore(this.ctx);
      if (!backend) throw new Error("长条目需要 DSH spill 存储");
      const saved = await backend.saveText({
        owner: { sessionId: owner as SessionId },
        source: { kind: "session-reference", sessionId: (source.sourceSessionId ?? owner) as SessionId, label: source.title },
        suggestedName: encoding === "json" ? "flowspace-item.json" : "flowspace-item.txt",
        content: raw,
      });
      record = { ...saved, encoding, preview: raw.slice(0, 2000) };
      await this.records.put(key, record);
    }
    this.byLocator.set(record.locator, record);
    return { locator: record.locator, preview: record.preview, bytes: record.bytes };
  }

  private saved(ref: FlowSpill): SavedContent {
    const record = this.byLocator.get(ref.locator);
    if (!record) throw new Error("此 Host 没有该条目的 spill 记录");
    return record;
  }

  private async read(ref: FlowSpill): Promise<JsonValue> {
    const record = this.saved(ref);
    const fs = this.ctx.fs;
    const raw = await fs.readText(await fs.resolve(record.locator));
    return record.encoding === "json" ? JSON.parse(raw) as JsonValue : raw;
  }

  async freeze(source: ContextSnapshot, limit: number, ownerSessionId?: string): Promise<ContextSnapshot> {
    // Static and pure flows use a private spill namespace without creating a DSH Session.
    const owner = ownerSessionId ?? source.sourceSessionId ?? `flowspace:${source.sourceNodeId}`;
    let content = source.content;
    let text = source.text;
    let textSpill = source.textSpill;
    if (content?.items) {
      if (content.items.length > limit) {
        content = { ...content, originalCount: content.originalCount ?? content.items.length, items: content.items.slice(0, limit) };
        text = textOfContent(content);
        textSpill = undefined;
      }
      const items: FlowItem[] = [];
      for (const item of content.items!) {
        if (item.spill) this.saved(item.spill);
        const spill = item.value === undefined ? undefined : await this.store(item.value, source, owner);
        items.push(spill ? { key: item.key, spill } : item);
      }
      content = { ...content, items };
    } else if (content?.spill) {
      this.saved(content.spill);
    } else if (content?.value !== undefined) {
      const spill = await this.store(content.value, source, owner);
      if (spill) {
        const { value: _value, ...fields } = content;
        content = { ...fields, spill };
      }
    }
    textSpill ??= await this.store(text, source, owner);
    if (textSpill) {
      const saved = this.saved(textSpill);
      text = `${saved.preview}\n\n完整内容：${saved.locator}\n${saved.retrievalHint}`;
      content ??= { dataType: source.kind === "file" ? "file" : "text", spill: textSpill };
    }
    const { textSpill: _priorTextSpill, ...fields } = source;
    return { ...fields, text, ...(content ? { content } : {}), ...(textSpill ? { textSpill } : {}) };
  }

  async hydrate(source: ContextSnapshot): Promise<ContextSnapshot> {
    const { textSpill, content } = source;
    if (!textSpill && !content?.spill && !content?.items?.some(item => item.spill)) return source;
    const { textSpill: _textSpill, ...out } = source;
    if (textSpill) out.text = String(await this.read(textSpill));
    if (content?.spill) {
      const { spill, ...fields } = content;
      out.content = { ...fields, value: spill.locator === textSpill?.locator ? out.text : await this.read(spill) };
    } else if (content?.items) {
      const items: FlowItem[] = [];
      for (const item of content.items) {
        items.push(item.spill ? { key: item.key, value: await this.read(item.spill) } : item);
      }
      out.content = { ...content, items };
    }
    // A portable reference may carry only structured content. Restore the derived
    // text alongside its full value while preserving independently authored Markdown.
    if (!textSpill && content && out.content && source.text === textOfContent(content))
      out.text = textOfContent(out.content);
    return out;
  }

  /** Persist an oversized inline context block through the Host spill registry (deduplicated). */
  async saveInlineContext(
    body: string,
    source: ContextSnapshot,
    sessionId: string,
  ): Promise<string> {
    const backend = getSpillStore(this.ctx);
    if (!backend) throw new Error("长引用需要 DSH spill 存储");
    const key = createHash("sha256")
      .update(JSON.stringify([sessionId, "context-md"]))
      .update(body)
      .digest("hex");
    let record = this.records.get(key);
    if (!record) {
      const saved = await backend.saveText({
        owner: { sessionId: sessionId as SessionId },
        source: {
          kind: "session-reference",
          sessionId: (source.sourceSessionId ?? sessionId) as SessionId,
          label: source.title,
        },
        suggestedName: `flowspace-${source.id}.md`,
        content: body,
      });
      record = { ...saved, encoding: "text", preview: body.slice(0, 2000) };
      await this.records.put(key, record);
    }
    this.byLocator.set(record.locator, record);
    return `${record.preview}\n\n完整内容：${record.locator}\n${record.retrievalHint}`;
  }
}
