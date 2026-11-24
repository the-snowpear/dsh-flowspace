import { ICONS } from "../icons.tsx";

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Surface = OffscreenCanvas | HTMLCanvasElement;

export interface OverviewPort {
  kind: "continuation" | "reference" | "event";
  direction: "in" | "out";
  id: string;
  x: number;
  y: number;
  linked: boolean;
}

export interface OverviewVisual {
  title: string;
  detail: string;
  icon: string;
  kind: string;
  status: string;
  participation?: string;
  width: number;
  height: number;
  ports: OverviewPort[];
}

export interface OverviewPalette {
  surface: string;
  border: string;
  text: string;
  secondary: string;
  accent: string;
  running: string;
  amber: string;
  red: string;
  green: string;
  font: string;
  groupRadius?: number;
  kinds: Record<string, string>;
}

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function readOverviewPalette(root: Element): OverviewPalette {
  const style = getComputedStyle(root);
  const color = (name: string, fallback = "") => style.getPropertyValue(`--${name}`).trim() || fallback;
  const accent = color("accent", "#3b82f6");
  const radius = Number.parseFloat(color("r-group", "26"));
  return {
    surface: color("surface", "#1c1f26"), border: color("border-strong", "#3a4150"), text: color("text", "#f5f7fa"),
    secondary: color("text-3", "#8b93a6"), accent, running: color("running", accent),
    amber: color("amber", "#f59e0b"), red: color("red", "#ef4444"), green: color("green", "#22c55e"),
    font: color("font-ui", "sans-serif"), groupRadius: Number.isFinite(radius) ? radius : 26,
    kinds: {
      ...Object.fromEntries(["agent", "note", "file", "display", "board", "detail", "git", "changes", "terminal", "role", "flow", "project", "branch", "worktree", "sub"].map(kind => [kind, color(`k-${kind}`, accent)])),
      blue: accent, violet: color("violet", accent), teal: color("teal", accent), amber: color("amber", "#f59e0b"),
    },
  };
}

/** Measure whole graphemes, retaining CJK and emoji when a line is shortened. */
export function overviewTextLines(text: string, width: number, measure: (text: string) => number, limit = 2): string[] {
  const graphemes = Array.from(GRAPHEME_SEGMENTER.segment(text), part => part.segment);
  const lines: string[] = [];
  let lineParts: string[] = [];
  let line = "";
  for (let index = 0; index < graphemes.length; index++) {
    const next = graphemes[index];
    if (next !== "\n" && measure(line + next) <= width) {
      lineParts.push(next);
      line += next;
      continue;
    }
    if (lines.length === limit - 1) {
      while (lineParts.length && measure(line + "…") > width) {
        lineParts.pop();
        line = lineParts.join("");
      }
      lines.push(line.trimEnd() + "…");
      return lines;
    }
    // Prefer a word boundary for Latin text, with character wrapping for CJK.
    const space = lineParts.lastIndexOf(" ");
    if (space > lineParts.length / 2 && next !== "\n") {
      lines.push(lineParts.slice(0, space).join(""));
      lineParts = [...lineParts.slice(space + 1), next];
      line = lineParts.join("");
    } else {
      lines.push(line.trimEnd());
      const trimmed = next === "\n" ? "" : next.trimStart();
      lineParts = trimmed ? [trimmed] : [];
      line = trimmed;
    }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

const icons = new Map<string, Path2D>();
export function overviewStatusColor(status: string, palette: OverviewPalette) {
  if (status === "running" || status === "settling") return palette.running;
  if (status === "waiting" || status === "input") return palette.amber;
  if (["error", "aborted", "interrupted"].includes(status)) return palette.red;
  if (status === "done" || status === "completed") return palette.green;
  return palette.secondary;
}

export function rasterizeOverviewCard(ctx: Context, visual: OverviewVisual, palette: OverviewPalette, scale: number) {
  const { width, height } = visual;
  const ink = palette.kinds[visual.kind] || palette.accent;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, 16);
  ctx.fillStyle = visual.kind === "note" ? `color-mix(in oklab, ${ink} 4%, ${palette.surface})` : palette.surface;
  ctx.fill();
  if (visual.participation === "bypassed") {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = -height; x < width; x += 22) { ctx.moveTo(x, height); ctx.lineTo(x + height, 0); }
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = visual.status && !["idle", "draft"].includes(visual.status)
    ? `color-mix(in oklab, ${overviewStatusColor(visual.status, palette)} 55%, ${palette.border})` : palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, 16);
  ctx.stroke();
  const centerY = height * 0.29 + 2.5;
  ctx.fillStyle = `color-mix(in oklab, ${ink} 9%, ${palette.surface})`;
  ctx.beginPath();
  ctx.roundRect(18, centerY - 17, 34, 34, 10);
  ctx.fill();
  if (typeof Path2D !== "undefined") {
    let path = icons.get(visual.icon);
    if (!path) { path = new Path2D(ICONS[visual.icon] || ICONS.card); icons.set(visual.icon, path); }
    ctx.save();
    ctx.translate(24.5, centerY - 10.5);
    ctx.scale(21 / 16, 21 / 16);
    ctx.lineWidth = 1.7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ink;
    ctx.stroke(path);
    ctx.restore();
  }
  const size = 12 * Math.min(scale, 2.1);
  ctx.font = `500 ${size}px ${palette.font}`;
  ctx.fillStyle = palette.text;
  ctx.textBaseline = "middle";
  const lines = overviewTextLines(visual.title, width - 82, text => ctx.measureText(text).width);
  lines.forEach((line, index) => ctx.fillText(line, 64, centerY + (index - (lines.length - 1) / 2) * size * 1.2));
  const baseline = Math.max(height * 0.72, height * 0.58 + 13);
  ctx.fillStyle = overviewStatusColor(visual.status, palette);
  ctx.beginPath();
  ctx.arc(22, baseline, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `450 ${10 * Math.min(scale, 2)}px ${palette.font}`;
  ctx.fillStyle = palette.secondary;
  ctx.fillText(overviewTextLines(visual.detail, width - 53, text => ctx.measureText(text).width, 1)[0], 35, baseline);
  for (const port of visual.ports) {
    if (!port.linked) continue;
    ctx.beginPath();
    ctx.arc(port.x, port.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = port.kind === "reference" ? palette.accent : ink;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

interface AtlasPage {
  canvas: Surface;
  ctx: Context;
  x: number;
  y: number;
  rowHeight: number;
  used: number;
  keys: Set<string>;
}
export interface OverviewTile {
  page: AtlasPage;
  x: number;
  y: number;
  w: number;
  h: number;
  density: number;
}

/** Four persistent 2048² RGBA surfaces bound the atlas to 64 MiB. */
export class OverviewCardAtlas {
  private pages: AtlasPage[] = [];
  private tiles = new Map<string, OverviewTile>();
  private clock = 0;
  rasterizations = 0;
  constructor(private palette: OverviewPalette, private dpr: number) {}

  get pageCount() { return this.pages.length; }

  invalidateAll(palette = this.palette, dpr = this.dpr) {
    this.palette = palette;
    this.dpr = dpr;
    this.tiles.clear();
    for (const page of this.pages) this.clear(page);
  }

  private clear(page: AtlasPage) {
    for (const key of page.keys) this.tiles.delete(key);
    page.keys.clear();
    page.x = page.y = page.rowHeight = 0;
    page.ctx.resetTransform();
    page.ctx.clearRect(0, 0, 2048, 2048);
  }

  get(visual: OverviewVisual, typeScale: number): OverviewTile {
    const key = JSON.stringify([visual, typeScale]);
    const cached = this.tiles.get(key);
    if (cached) { cached.page.used = ++this.clock; return cached; }
    const safeWidth = Math.max(1, visual.width);
    const safeHeight = Math.max(1, visual.height);
    const density = Math.min(2, Math.max(0.25, this.dpr * 0.5), 2048 / (safeWidth + 12), 2048 / (safeHeight + 12));
    const w = Math.min(2048, Math.max(1, Math.ceil((safeWidth + 12) * density)));
    const h = Math.min(2048, Math.max(1, Math.ceil((safeHeight + 12) * density)));
    let page = this.pages.find(page => page.y + Math.max(page.rowHeight, h) <= 2048 &&
      (page.x + w <= 2048 || page.y + page.rowHeight + h <= 2048));
    if (!page) {
      if (this.pages.length === 4) {
        page = this.pages.reduce((a, b) => a.used < b.used ? a : b);
        this.clear(page);
      } else {
        const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(2048, 2048) : document.createElement("canvas");
        canvas.width = canvas.height = 2048;
        page = { canvas, ctx: canvas.getContext("2d") as Context, x: 0, y: 0, rowHeight: 0, used: 0, keys: new Set() };
        this.pages.push(page);
      }
    }
    if (page.x + w > 2048) { page.x = 0; page.y += page.rowHeight; page.rowHeight = 0; }
    const tile = { page, x: page.x, y: page.y, w, h, density };
    page.x += w;
    page.rowHeight = Math.max(page.rowHeight, h);
    page.used = ++this.clock;
    page.keys.add(key);
    this.tiles.set(key, tile);
    page.ctx.save();
    page.ctx.setTransform(density, 0, 0, density, tile.x + 6 * density, tile.y + 6 * density);
    rasterizeOverviewCard(page.ctx, visual, this.palette, typeScale);
    page.ctx.restore();
    this.rasterizations++;
    return tile;
  }

  dispose() {
    this.tiles.clear();
    for (const page of this.pages) page.canvas.width = page.canvas.height = 0;
    this.pages = [];
  }
}
