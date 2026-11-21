import assert from "node:assert/strict";
import test from "node:test";
import { builtinTemplates, contentFlowTemplateId, instantiateTemplate } from "../src/client/templates.ts";
import { tFor } from "../src/client/i18n.ts";
import { emptyDocument } from "../src/core/document.ts";
import { fanoutPair, staticFanoutContent } from "../src/core/fanout.ts";
import { checkDocument, documentSchema } from "../src/host/storage.ts";

test("the bilingual content template has stable slots and three static draft items in each independent copy", () => {
  for (const locale of ["zh", "en"] as const) {
    const template = () => builtinTemplates(locale).find(t => t.id === contentFlowTemplateId)!;
    const builtin = template();
    assert.deepEqual(template(), builtin);
    assert.equal(builtin.nodes.filter(node => node.generatedBy || node.sessionId).length, 0);
    const doc = emptyDocument();
    for (const offset of [0, 2200]) {
      const group = instantiateTemplate(doc, builtin, offset, 0, tFor(locale, builtin.title));
      const laneGroup = doc.nodes.find(node => node.parentId === group.id && node.fanout)!;
      const pair = fanoutPair(doc, laneGroup.fanout!.fanId)!;
      assert.equal(pair.merge.parentId, laneGroup.id);
      const master = doc.nodes.find(node => node.masterOf === pair.fan.id)!;
      assert.equal(master.templateSlotId, "slot-content-master");
      const items = staticFanoutContent(doc, pair.fan.id)!.items!;
      assert.equal(items.length, 3);
      assert.equal(items[0].value, locale === "en" ? "Mechanical star chart" : "机械星图");
    }
    checkDocument(documentSchema.parse(doc));
  }
});
