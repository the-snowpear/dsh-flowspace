import { clamp } from "./geometry.ts";

type Theme = "dark" | "light";

/**
 * The theme switch's light show, layered over the view transition: a prismatic shock
 * ring riding the reveal edge, a flash at the toggle, sparks flung outward, and then
 * either sun rays (to light) or a field of stars that ignite as the night reaches them.
 * Positions and timings are baked in per element; the CSS only animates
 * transform / opacity.
 */
const THEME_REVEAL_MS = 1500;
/** Time (0..1) at which the reveal's cubic-bezier(0.7, 0, 0.2, 1) easing reaches `p`. */
function themeRevealTimeAt(p: number): number {
  const bez = (s: number, a: number, b: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const s = (lo + hi) / 2;
    if (bez(s, 0, 1) < p) lo = s;
    else hi = s;
  }
  return bez((lo + hi) / 2, 0.7, 0.2);
}
function buildThemeFx(to: Theme, ox: number, oy: number, rmax: number): HTMLElement {
  const fx = document.createElement("div");
  fx.className = "fs-theme-wave";
  fx.dataset.to = to;
  fx.style.setProperty("--ox", `${ox}px`);
  fx.style.setProperty("--oy", `${oy}px`);
  // Rings are rasterised small (600px) and scaled up on the compositor; the soft
  // upscale is what turns a thin prismatic band into a wide aurora edge.
  fx.style.setProperty("--rs", String(((rmax + 160) * 2.5) / 600));
  const add = (cls: string, vars?: Record<string, string>) => {
    const el = document.createElement("i");
    el.className = cls;
    if (vars) for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    fx.appendChild(el);
    return el;
  };
  add("tfx-core");
  add("tfx-ring");
  add("tfx-ring tfx-ring-echo");
  if (to === "light") add("tfx-rays");
  const sparks = 30;
  for (let i = 0; i < sparks; i++) {
    const a = (i / sparks) * 360 + (Math.random() - 0.5) * 9;
    add("tfx-spark", {
      "--a": `${a.toFixed(1)}deg`,
      "--d": `${Math.round(140 + Math.random() * 320)}px`,
      "--dl": `${Math.round(Math.random() * 140)}ms`,
      "--du": `${Math.round(820 + Math.random() * 520)}ms`,
      "--h": `${Math.round((i / sparks) * 300 + 200) % 360}`,
    });
  }
  if (to === "dark") {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 64; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      // Ignite just as the night's solid edge (≈1.03 × rmax at full progress) passes.
      const reach = clamp(Math.hypot(x - ox, y - oy) / ((rmax + 160) * 1.025), 0, 1);
      add("tfx-star", {
        "--sx": `${x.toFixed(0)}px`,
        "--sy": `${y.toFixed(0)}px`,
        "--dl": `${Math.round(Math.min(themeRevealTimeAt(reach) * THEME_REVEAL_MS, THEME_REVEAL_MS - 440))}ms`,
        "--sz": `${(1 + Math.random() * 2.2).toFixed(1)}px`,
      });
    }
  }
  return fx;
}

type ThemeEffect = { theme: Theme; effect: HTMLElement };
type Wave = ThemeEffect & { started: number };
type ThemeTransition = { add: (theme: Theme) => void; stop: () => void };
const NEW_IMAGE = "::view-transition-new(root)";
const OLD_IMAGE = "::view-transition-old(root)";
const IMAGE_PAIR = "::view-transition-image-pair(root)";
const FEATHER = 0.82;
const MIN_WAVE_GAP = 80;
const pendingRestores = new WeakMap<HTMLElement, number>();

function waveRadius(time: number, maxRadius: number) {
  if (time <= 0) return 0;
  const progress = clamp(time / THEME_REVEAL_MS, 0, 1);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const t = (lo + hi) / 2;
    const x = 3 * 0.7 * t * (1 - t) ** 2 + 3 * 0.2 * t * t * (1 - t) + t ** 3;
    if (x < progress) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return maxRadius * t * t * (3 - 2 * t);
}

// All waves use the toggle as their center. Blend their feathered edges in
// distance order and rasterize a single gradient for the two shared images.
function themeMask(
  waves: Wave[],
  now: number,
  incoming: Theme,
  base: Theme,
  radius: number,
) {
  const bands = waves
    .filter(({ started }) => now > started)
    .map(({ theme, started }) => ({
      outer: waveRadius(now - started, radius),
      alpha: Number(theme === incoming),
    }));
  if (!bands.length) return base === incoming ? "none" : "linear-gradient(transparent, transparent)";
  const edges = [0, ...bands.flatMap(({ outer }) => [outer * FEATHER, outer])]
    .sort((a, b) => a - b);
  const stops: string[] = [];
  function addStop(distance: number) {
    let alpha = Number(base === incoming);
    for (const band of bands) {
      const coverage = clamp((band.outer - distance) / (band.outer * (1 - FEATHER)), 0, 1);
      alpha += (band.alpha - alpha) * coverage;
    }
    stops.push(`rgb(0 0 0 / ${alpha.toFixed(3)}) ${distance.toFixed(2)}px`);
  }
  edges.forEach((edge, index) => {
    if (index > 0 && bands.length > 1) addStop((edges[index - 1] + edge) / 2);
    addStop(edge);
  });
  return `radial-gradient(circle at var(--tx) var(--ty), ${stops.join(", ")})`;
}

export function startThemeTransition(
  root: HTMLElement,
  button: HTMLElement,
  initial: Theme,
  incoming: Theme,
  showTheme: (theme: Theme | undefined) => void,
  onFinished: () => void,
): ThemeTransition {
  const surface = document.documentElement;
  const bounds = button.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;
  const farthest = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const radius = (farthest + 160) * 1.25;
  const overlay = document.createElement("div");
  overlay.className = "fs-theme-fx";
  overlay.setAttribute("aria-hidden", "true");
  const waiting: ThemeEffect[] = [];
  const waves: Wave[] = [];
  let base = initial;
  let frame = 0;
  let lastStart = -Infinity;
  let live = true;
  let settled = false;
  let imageAnimations: Animation[] = [];

  // Chromium retargets mouse clicks on the captured page to <html>. Route
  // those clicks back to the real switch while the view transition is visible.
  function forwardClick(event: MouseEvent) {
    if (event.target !== surface || event.button !== 0 || event.detail === 0) return;
    const { left, top, right, bottom } = bounds;
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) return;
    event.stopPropagation();
    button.click();
  }

  function animateImages(theme: Theme, now: number) {
    const reveal = theme === incoming ? NEW_IMAGE : OLD_IMAGE;
    const sink = theme === incoming ? OLD_IMAGE : NEW_IMAGE;
    const first = lastStart === -Infinity;
    const boost = { filter: "blur(0px) brightness(1.12) saturate(1.6)" };
    const flat = { filter: "none" };
    const revealFrames = first ? [boost, flat] : [
      { filter: getComputedStyle(surface, reveal).filter },
      { ...boost, offset: 0.12 },
      flat,
    ];
    const sinkStart = first ? flat : { filter: getComputedStyle(surface, sink).filter };
    const sinkEnd = { filter: `blur(4px) brightness(${theme === "light" ? 1.25 : 0.7}) saturate(0.7)` };
    const zoomStart = first ? "1.07" : getComputedStyle(surface, IMAGE_PAIR).scale;
    const zoomFrames = first
      ? [{ scale: zoomStart }, { scale: "1" }]
      : [{ scale: zoomStart }, { scale: "1.07", offset: 0.12 }, { scale: "1" }];
    imageAnimations.forEach((animation) => animation.cancel());
    imageAnimations = [
      surface.animate(revealFrames, {
        pseudoElement: reveal, duration: THEME_REVEAL_MS, fill: "both",
        easing: "cubic-bezier(0.2, 0.75, 0.2, 1)",
      }),
      surface.animate([sinkStart, sinkEnd], {
        pseudoElement: sink, duration: THEME_REVEAL_MS, fill: "both",
        easing: "cubic-bezier(0.55, 0, 0.2, 1)",
      }),
      // Both themed images keep the same geometry through overlapping waves.
      surface.animate(zoomFrames, {
        pseudoElement: IMAGE_PAIR, duration: THEME_REVEAL_MS, fill: "both",
        easing: "cubic-bezier(0.2, 0.75, 0.2, 1)",
      }),
    ];
    for (const animation of imageAnimations) animation.startTime = now;
  }

  function release(restoreTheme = true) {
    if (!live) return;
    live = false;
    cancelAnimationFrame(frame);
    document.removeEventListener("click", forwardClick, true);
    if (restoreTheme) showTheme(undefined);
    transition.skipTransition();
    overlay.remove();
    surface.removeAttribute("data-theme-transition");
    surface.style.removeProperty("--tx");
    surface.style.removeProperty("--ty");
    surface.style.removeProperty("--vt-wave-mask");
    imageAnimations.forEach((animation) => animation.cancel());
    // Let the live palette paint before restoring ordinary control transitions.
    pendingRestores.set(root, requestAnimationFrame(() => {
      delete root.dataset.themeSwap;
      pendingRestores.delete(root);
    }));
    onFinished();
  }

  function paint(now: number) {
    while (waves.length && now >= waves[0].started + THEME_REVEAL_MS) {
      const finished = waves.shift()!;
      base = finished.theme;
      finished.effect.remove();
    }
    if (!waves.length && !waiting.length) {
      if (settled) {
        release();
      } else {
        // Present a fully resolved composite for a frame before dropping it.
        surface.style.setProperty("--vt-wave-mask", themeMask(waves, now, incoming, base, radius));
        settled = true;
        frame = requestAnimationFrame(paint);
      }
      return;
    }
    if (waiting.length && now >= lastStart + MIN_WAVE_GAP) {
      const next = waiting.shift()!;
      animateImages(next.theme, now);
      waves.push({ ...next, started: now });
      overlay.appendChild(next.effect);
      lastStart = now;
    }
    surface.style.setProperty("--vt-wave-mask", themeMask(waves, now, incoming, base, radius));
    frame = requestAnimationFrame(paint);
  }

  function add(theme: Theme) {
    settled = false;
    waiting.push({ theme, effect: buildThemeFx(theme, x, y, farthest) });
  }

  const pendingRestore = pendingRestores.get(root);
  if (pendingRestore !== undefined) {
    cancelAnimationFrame(pendingRestore);
    pendingRestores.delete(root);
  }
  root.dataset.themeSwap = "";
  surface.dataset.themeTransition = incoming;
  surface.style.setProperty("--tx", `${x}px`);
  surface.style.setProperty("--ty", `${y}px`);
  document.addEventListener("click", forwardClick, true);
  add(incoming);
  const transition = document.startViewTransition(() => {
    if (!live) return;
    showTheme(incoming);
    document.body.appendChild(overlay);
  });
  const finish = () => release();
  void transition.ready.then(() => {
    if (live) frame = requestAnimationFrame(paint);
  }, finish);
  void transition.finished.then(finish, finish);
  return { add, stop: () => release(false) };
}
