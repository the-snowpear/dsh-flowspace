import type { Box } from "./geometry.ts";
import { intersects } from "./sceneModel.ts";

const CELL_SIZE = 512;
const MAX_CELLS = 64;

function cellsOf(box: Box): string[] | undefined {
  const left = Math.floor(box.x / CELL_SIZE), right = Math.floor((box.x + box.w) / CELL_SIZE);
  const top = Math.floor(box.y / CELL_SIZE), bottom = Math.floor((box.y + box.h) / CELL_SIZE);
  const width = right - left + 1, height = bottom - top + 1;
  if (!(width * height <= MAX_CELLS)) return;
  const cells: string[] = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) cells.push(`${left + x}:${top + y}`);
  }
  return cells;
}

/** A broad phase for moving rectangles. Large rectangles use a bounded side list. */
export class BoxIndex<K> {
  private items = new Map<K, { box: Box; cells?: string[] }>();
  private buckets = new Map<string, Set<K>>();
  private large = new Set<K>();

  set(key: K, box: Box) {
    this.delete(key);
    const cells = cellsOf(box);
    this.items.set(key, { box, cells });
    if (!cells) {
      this.large.add(key);
      return;
    }
    for (const cell of cells) {
      let bucket = this.buckets.get(cell);
      if (!bucket) {
        bucket = new Set();
        this.buckets.set(cell, bucket);
      }
      bucket.add(key);
    }
  }

  delete(key: K) {
    const item = this.items.get(key);
    if (!item) return;
    this.items.delete(key);
    this.large.delete(key);
    for (const cell of item.cells ?? []) {
      const bucket = this.buckets.get(cell)!;
      bucket.delete(key);
      if (!bucket.size) this.buckets.delete(cell);
    }
  }

  query(area: Box): K[] {
    const cells = cellsOf(area);
    let keys: Iterable<K> = this.items.keys();
    if (cells) {
      const candidates = new Set(this.large);
      for (const cell of cells) {
        for (const key of this.buckets.get(cell) ?? []) candidates.add(key);
      }
      keys = candidates;
    }
    const matches: K[] = [];
    for (const key of keys) {
      if (intersects(area, this.items.get(key)!.box)) matches.push(key);
    }
    return matches;
  }
}
