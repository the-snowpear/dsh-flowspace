/**
 * Pixel sigils (after omp-studio's agent deck): a small robot face on a 7×7
 * grid, mirrored around the middle column. The face comes from a stable hash
 * of a seed — a slot ID or member name — so one role wears the same face in
 * the library, the canvas and the team room. Colour is not part of the face:
 * it comes from the model hue (`--hue`), so the face says "who" and the
 * colour says "which model".
 */

export const SIGIL_GRID = 7;

export type SigilCell = { readonly x: number; readonly y: number; readonly part: "head" | "eye" | "mouth" | "beacon" | "crown" };
export type SigilSpec = { readonly cells: readonly SigilCell[]; readonly eyes: readonly SigilCell[] };

/** FNV-1a: small, fast and well spread for short identifiers. */
export function sigilHash(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const cache = new Map<string, SigilSpec>();

/** `commander` is the team lead: a crowned, symmetric face no member can draw. */
export function sigilSpec(seed: string, commander = false): SigilSpec {
  const key = `${commander ? 1 : 0}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const bits = sigilHash(seed);
  const bit = (index: number) => (bits >>> index) & 1;
  const pick = (index: number, count: number) => ((bits >>> index) & 0xff) % count;
  const cells: SigilCell[] = [];
  const eyes: SigilCell[] = [];
  const add = (x: number, y: number, part: SigilCell["part"]) => {
    const cell = { x, y, part };
    if (part === "eye") eyes.push(cell); else cells.push(cell);
  };
  const mirror = (x: number, y: number, part: SigilCell["part"]) => {
    add(x, y, part);
    if (x !== 3) add(6 - x, y, part);
  };

  const antenna = commander ? 3 : pick(0, 3);
  const rounded = commander || bit(3) === 1;
  const ears = !commander && bit(4) === 1;
  const eyeStyle = commander ? 0 : [0, 0, 0, 1, 1, 2][pick(6, 6)]!;
  const eyeRow = commander ? 2 : eyeStyle === 1 ? 2 : 2 + bit(5);
  const mouth = commander ? 0 : pick(9, 4);
  const narrowJaw = !commander && bit(12) === 1;
  const body = commander ? 2 : pick(13, 3);

  if (antenna === 3) { mirror(1, 0, "crown"); add(3, 0, "crown"); }
  else if (antenna === 0) add(3, 0, "beacon");
  else if (antenna === 1) mirror(2, 0, "beacon");

  const eyeColumns = eyeStyle === 2 ? [2, 3, 4] : [2, 4];
  const eyeRows = eyeStyle === 1 ? [eyeRow, eyeRow + 1] : [eyeRow];
  const mouthColumns = mouth === 0 ? [2, 3, 4] : mouth === 1 ? [3] : mouth === 2 ? [2, 4] : [];
  const mouthRow = eyeRows[eyeRows.length - 1]! + 2;
  for (let y = 1; y <= 5; y += 1) {
    for (let x = 1; x <= 5; x += 1) {
      const corner = (x === 1 || x === 5) && (y === 1 || (y === 5 && narrowJaw));
      if (corner && (rounded || y === 5)) continue;
      if (eyeRows.includes(y) && eyeColumns.includes(x)) { add(x, y, "eye"); continue; }
      if (y === mouthRow && mouthRow <= 5 && mouthColumns.includes(x)) { add(x, y, "mouth"); continue; }
      add(x, y, "head");
    }
  }
  if (ears) mirror(0, 3, "head");
  if (body === 1) add(3, 6, "head");
  else if (body === 2) { mirror(2, 6, "head"); add(3, 6, "head"); if (!narrowJaw) mirror(1, 6, "head"); }

  const spec = { cells, eyes };
  if (cache.size > 512) cache.clear();
  cache.set(key, spec);
  return spec;
}

export function cellsPath(cells: readonly SigilCell[], part: SigilCell["part"]): string {
  return cells.filter((cell) => cell.part === part).map((cell) => `M${cell.x} ${cell.y}h1v1h-1z`).join("");
}

/** Eyes close to a slit once an agent stops working. */
export function eyesPath(eyes: readonly SigilCell[], closed: boolean): string {
  return eyes.map((cell) => closed ? `M${cell.x} ${cell.y + 0.55}h1v0.35h-1z` : `M${cell.x} ${cell.y}h1v1h-1z`).join("");
}

/** A per-face phase so blinks never fire in unison. */
export function sigilPhase(seed: string): string {
  return ((sigilHash(`blink:${seed}`) % 100) / 100).toFixed(2);
}
