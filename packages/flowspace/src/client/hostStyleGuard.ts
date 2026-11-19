/**
 * Host stylesheet guard.
 *
 * DSH's files sidebar (`dsh-client-ui-sidebar-files/FilesBody.module.css`) hides the
 * content covered by a full-row file navigator with
 *
 *   [data-files-navigator-row]:has(> .navigator.fill) > :not(.navigator) { … }
 *
 * The `:has()` sits on a non-subject compound, and in Chromium every DOM mutation
 * inside the FlowSpace canvas column then pays a style recalculation of the whole
 * canvas subtree (~10–13 ms per text or element change, measured on Chrome 157),
 * even when no navigator row exists. Streaming agent output, node drags and HUD
 * readouts all mutate the DOM, so this single rule caps the canvas well below 60 fps.
 *
 * The rule is rewritten into an exactly equivalent selector list whose `:has()` is on
 * the subject and only looks at siblings, which Chromium invalidates cheaply:
 *
 *   [row] > :not(N):has(~ N.fill), [row] > N.fill ~ :not(N)
 *
 * (every non-navigator sibling of a matching navigator, before or after it). Only rules
 * with exactly this shape are touched, so an upstream fix simply makes this a no-op.
 */

const NAVIGATOR_ROW_RULE =
  /^\[data-files-navigator-row\]:has\(>\s*([^()]+?(?:\([^()]*\))?[^()]*?)\)\s*>\s*:not\(([^()]+)\)$/;

const patched = new WeakSet<CSSStyleRule>();

/** Returns the cheap equivalent selector list, or `null` for any other selector. */
export function rewriteNavigatorRowSelector(selector: string): string | null {
  const m = NAVIGATOR_ROW_RULE.exec(selector.trim());
  if (!m) return null;
  const navigator = m[1].trim();
  const excluded = m[2].trim();
  const row = "[data-files-navigator-row]";
  return `${row} > :not(${excluded}):has(~ ${navigator}), ${row} > ${navigator} ~ :not(${excluded})`;
}

function patchRules(list: CSSRuleList): number {
  let count = 0;
  for (const rule of Array.from(list)) {
    if (rule instanceof CSSStyleRule) {
      if (patched.has(rule)) continue;
      const next = rewriteNavigatorRowSelector(rule.selectorText);
      if (next) {
        rule.selectorText = next;
        patched.add(rule);
        count++;
      }
    } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
      count += patchRules((rule as CSSGroupingRule).cssRules);
    }
  }
  return count;
}

function patchDocument(doc: Document): number {
  let count = 0;
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // Cross-origin sheet: not ours to read.
    }
    count += patchRules(rules);
  }
  return count;
}

/**
 * Applies the rewrite now and whenever the host adds stylesheets later (sidebar panels
 * load their CSS lazily). Returns a disposer.
 */
export function installHostStyleGuard(doc: Document = document): () => void {
  if (typeof CSSStyleRule === "undefined") return () => {};
  patchDocument(doc);
  let queued = false;
  const observer = new MutationObserver((records) => {
    if (queued) return;
    const addsStyles = records.some((r) =>
      Array.from(r.addedNodes).some(
        (n) => n instanceof HTMLStyleElement || n instanceof HTMLLinkElement,
      ),
    );
    if (!addsStyles) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchDocument(doc);
    });
  });
  observer.observe(doc.head, { childList: true });
  // Late <link> sheets finish loading after insertion; re-check once they settle.
  const onLoad = (ev: Event) => {
    if (ev.target instanceof HTMLLinkElement) patchDocument(doc);
  };
  doc.addEventListener("load", onLoad, true);
  return () => {
    observer.disconnect();
    doc.removeEventListener("load", onLoad, true);
  };
}
