import test from "node:test";
import assert from "node:assert/strict";
import { insertWireWaypoint, route } from "../src/client/wireRouting.ts";

test("an open row stays straight and short diagonal wires go forward", () => {
  assert.equal(
    route({ x: 280, y: 21 }, { x: 400, y: 21 }).path,
    "M 280 21 L 400 21",
  );
  const short = route({ x: 280, y: 21 }, { x: 286, y: 140 });
  assert.match(short.path, / C /);
  assert.ok(short.legs[0].every((point, i, points) => i === 0 || point.x >= points[i - 1].x));
});

test("a wire responds to card clearance and keeps feedback below a long row", () => {
  const source = { x: 0, y: 40, w: 280, h: 118 };
  const target = { x: 850, y: 40, w: 280, h: 118 };
  const block = { x: 380, y: 0, w: 280, h: 136 };
  const from = { x: 280, y: 61, box: source };
  const to = { x: 850, y: 61, box: target };

  const blocked = route(from, to, { mode: "avoid", obstacles: [block] });
  assert.match(blocked.path, / Q /);
  assert.ok(blocked.label.y < block.y);
  assert.ok(blocked.legs[0].every(({ x, y }) =>
    x <= block.x || x >= block.x + block.w || y < block.y || y > block.y + block.h,
  ));
  assert.equal(
    route(from, to, { mode: "avoid", obstacles: [{ ...block, y: 200 }] }).path,
    "M 280 61 L 850 61",
  );

  const feedback = route(
    { x: target.x + target.w, y: to.y, box: target },
    { x: source.x, y: from.y, box: source },
    { mode: "avoid", obstacles: [block] },
  );
  assert.ok(feedback.label.y > source.y + source.h);
  assert.ok(feedback.legs[0][1].x > target.x + target.w);
  assert.ok(feedback.legs[0].at(-2)!.x < source.x);
});

test("overlap is the default and moves the label onto an exposed part of the same wire", () => {
  const from = { x: 280, y: 61, box: { x: 0, y: 40, w: 280, h: 118 } };
  const to = { x: 850, y: 61, box: { x: 850, y: 40, w: 280, h: 118 } };
  const block = { x: 530, y: 0, w: 200, h: 136 };
  const defaults = route(from, to, { obstacles: [block] });
  const overlap = route(from, to, { mode: "overlap", obstacles: [block] });
  const open = route(from, to);
  assert.deepEqual(defaults, overlap);
  assert.equal(overlap.path, open.path);
  assert.ok(overlap.label.x > from.x && overlap.label.x < block.x);
  assert.equal(overlap.label.y, open.label.y);
  assert.notEqual(overlap.path, route(from, to, { mode: "avoid", obstacles: [block] }).path);
});

test("adding a waypoint uses the leg that was hit and preserves saved anchors", () => {
  const waypoints = [{ x: 340, y: 180 }, { x: 640, y: 180 }];
  const wire = route({ x: 160, y: 30 }, { x: 850, y: 30 }, { waypoints });
  const first = wire.legs[0][8];
  const result = insertWireWaypoint(waypoints, wire, { x: first.x + 2, y: first.y });
  assert.ok(Math.hypot(result[0].x - first.x, result[0].y - first.y) <= 2.1);
  assert.deepEqual(result.slice(1), waypoints);
  assert.deepEqual(wire.legs.map((leg) => leg.at(-1)), [...waypoints, { x: 850, y: 30 }]);
});

test("short wires keep the pill centred inline and only lift it at rest when its icons cannot fit", () => {
  const from = { x: 280, y: 64, box: { x: 0, y: 40, w: 280, h: 118 } };
  for (const mode of ["overlap", "avoid"] as const) {
    for (const gap of [16, 44, 80, 180]) {
      const to = { x: from.x + gap, y: from.y, box: { ...from.box, x: from.x + gap } };
      const wire = route(from, to, { mode });
      assert.deepEqual(wire.label, { x: from.x + gap / 2, y: from.y });
      assert.equal(wire.tight, gap < 128);
      const fit = gap === 16 ? "above" : gap === 44 ? "snug" : gap === 80 ? "inline" : undefined;
      assert.equal(wire.portLabel?.fit, fit);
      if (wire.portLabel) assert.ok(wire.label.y - wire.portLabel.lift + 11 < from.box.y);
    }
    const to = { x: 336, y: from.y, box: { ...from.box, x: 336 } };
    assert.equal(route(from, to, { mode, kind: "reference" }).portLabel?.fit, "inline");
    assert.equal(route(from, to, { mode, kind: "continuation" }).portLabel?.fit, "snug");
  }
});
