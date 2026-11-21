import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { dataDescriptors } from "../src/core/nodes/data/descriptors.ts";
import { visibleDataFields } from "../src/client/nodes/dataForm.ts";
import { dict } from "../src/client/i18n.ts";
import { dataCardHeight, nodeBox, portY } from "../src/client/geometry.ts";
import { newFlowNode } from "../src/core/document.ts";

test("each data operation exposes the fields and localized mode choices supported by its descriptor", () => {
  for (const descriptor of dataDescriptors) {
    assert.ok(dict[descriptor.titleKey]?.every(Boolean) && dict[descriptor.descKey]?.every(Boolean));
    const schema = z.toJSONSchema(descriptor.configSchema) as { properties: Record<string, { enum?: string[] }> };
    for (const mode of schema.properties.mode?.enum ?? [""]) {
      const fields = visibleDataFields(descriptor.flowType, { ...descriptor.defaultConfig, mode });
      assert.ok(fields?.every(field => Object.hasOwn(schema.properties, field)), descriptor.flowType + "/" + mode);
      if (mode) assert.ok(dict["flow_data_choice_" + mode]?.every(Boolean), mode);
    }
  }
  assert.deepEqual(visibleDataFields("flowspace/join", { mode: "template" }), ["mode","delimiter","template"]);
  assert.deepEqual(visibleDataFields("flowspace/map", { mode: "ai" }), ["mode","ai"]);
  assert.deepEqual(visibleDataFields("flowspace/map", { mode: "code" }), ["mode","code"]);
  assert.deepEqual(visibleDataFields("flowspace/template", {}), ["inputs","template"]);
  assert.equal(visibleDataFields("vendor/custom-data", {}), undefined);
});

test("full preview height follows visible lines without moving output sockets", () => {
  const data = newFlowNode("flowspace/split", 0, 0);
  const empty = dataCardHeight(data, 0, 1, false);
  const two = dataCardHeight(data, 2, 0, false);
  const six = dataCardHeight(data, 6, 1, false);
  assert.equal(empty, 200);
  assert.ok(empty < two && two < six && six <= 480);
  assert.equal(nodeBox(data, false, false, two).h, two);
  assert.equal(portY(data, "continuation", false, "out", 0, two, "out"),
    portY(data, "continuation", false, "out", 0, six, "out"));
  data.height = 420;
  assert.equal(dataCardHeight(data, 1, 0, false), 420);
});
