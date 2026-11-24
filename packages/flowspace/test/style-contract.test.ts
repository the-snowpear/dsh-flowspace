import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/client/styles/flow-ext.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const header = /^\s*\.fs-root\s*\{([^{}]*)\}\s*\.fs-root\[data-theme="light"\]\s*\{([^{}]*)\}/.exec(css);
assert.ok(header, "Declare the dark and light theme tokens at the top of flow-ext.css");
const rules = css.slice(header[0].length);
const declarations = (block: string) => Object.fromEntries(block.trim().split(";").filter(line => line.trim())
  .map(line => line.split(":").map(part => part.trim())));

test("flow extension colors come from theme tokens", () => {
  assert.doesNotMatch(rules, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/i);
});

test("flow extension motion durations come from timing tokens", () => {
  assert.doesNotMatch(rules, /(?:\d+\.?\d*|\.\d+)(?:ms|s)\b/i);
});

test("flow extension selectors and effects avoid expensive canvas operations", () => {
  assert.doesNotMatch(css, /(?:[\s;{]|^)(?:-webkit-)?(?:backdrop-)?filter\s*:|:has\s*\(/i);
});

test("FlowSpace styles avoid relational selectors", () => {
  const directory = new URL("../src/client/styles/", import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith(".css"))) {
    const styles = readFileSync(new URL(file, directory), "utf8");
    assert.doesNotMatch(styles.replace(/\/\*[\s\S]*?\*\//g, ""), /:has\s*\(/i, file);
  }
});

test("flow extension keyframes have the fsx namespace", () => {
  for (const match of rules.matchAll(/@(?:-webkit-)?keyframes\s+([^\s{]+)/gi)) {
    assert.match(match[1], /^fsx-/);
  }
});

test("fan-out surfaces use the canvas type scale and flat group layers", () => {
  for (const [, selector, block] of rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/fs-lane-|data-fanout/.test(selector)) continue;
    assert.doesNotMatch(block, /(?:linear|radial|conic)-gradient\s*\(/i, selector);
    for (const [, shadow] of block.matchAll(/(?:box|text)-shadow:\s*([^;}]+)/g))
      assert.equal(shadow.trim(), "none", selector);
    for (const [, size] of block.matchAll(/font-size:\s*([^;}]+)/g))
      assert.match(size.trim(), /^(?:11|12|12\.5|13|13\.5)px$/, selector);
    for (const [, weight] of block.matchAll(/font-weight:\s*([^;}]+)/g))
      assert.match(weight.trim(), /^(?:400|500|600)$/, selector);
  }
});

test("both low-motion modes stop transitions and animations, including pseudo-elements", () => {
  const media = rules.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(media, -1);
  for (const [source, prefix] of [
    [rules.slice(0, media), '.fs-root[data-perf-tier="L1"]'],
    [rules.slice(media), ".fs-root"],
  ]) {
    const selector = prefix + " .fsx-motion";
    const block = source.slice(source.indexOf(selector)).split("}")[0];
    for (const target of ["", "::before", "::after"]) assert.ok(block.includes(selector + target));
    assert.match(block, /animation:\s*none\s*!important/);
    assert.match(block, /transition:\s*none\s*!important/);
  }
});

test("only the approved family and event tokens are introduced, with exact theme values", () => {
  const common = {
    "--k-human": "var(--k-note)", "--evt-error": "var(--red)",
    "--evt-wait": "var(--amber)", "--evt-done": "var(--green)",
  };
  const dark = { "--k-logic": "#e879f9", "--k-data": "#a3e635", "--k-trigger": "#fb7185", ...common };
  const light = { "--k-logic": "#a21caf", "--k-data": "#4d7c0f", "--k-trigger": "#be123c", ...common };
  assert.deepEqual(declarations(header[1]), dark);
  assert.deepEqual({ ...dark, ...declarations(header[2]) }, light);
  // --kc is the existing card category property from nodes.css.
  assert.deepEqual(new Set(Array.from(rules.matchAll(/(--[\w-]+)\s*:/g), match => match[1])), new Set(["--kc"]));
});
