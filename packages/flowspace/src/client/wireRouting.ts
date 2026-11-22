import type { FlowEdge, Waypoint as Point, WireRoutingMode } from "../types.ts";
import type { Box } from "./boxes.ts";

type WireEnd = Point & { box?: Box };
type Rect = { left: number; top: number; right: number; bottom: number };
type Leg = {
  commands: string;
  points: Point[];
  horizontalRun?: { center: Point; width: number };
};

const CORNER_RADIUS = 16;
const PORT_STUB = 24;
const TURN_COST = 32;
const MAX_SEARCH_STEPS = 384;
const SEARCH_MOVES = [
  { dx: 1, dy: 0, axis: 1 }, { dx: 0, dy: -1, axis: 2 },
  { dx: 0, dy: 1, axis: 2 }, { dx: -1, dy: 0, axis: 1 },
];
const LABEL_HALF_WIDTH = 54;
const LABEL_HALF_HEIGHT = 12;
const COMPACT_LABEL_HALF_WIDTH = 24;

export const DEFAULT_WIRE_ROUTING: WireRoutingMode = "overlap";

const round = (value: number) => Math.round(value * 10) / 10;
const xy = (point: Point) => `${round(point.x)} ${round(point.y)}`;
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const manhattan = (a: Point, b: Point) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

function inside(point: Point, r: Rect): boolean {
  return point.x > r.left && point.x < r.right && point.y > r.top && point.y < r.bottom;
}

/** Return the part of a segment inside a rectangle, in segment coordinates. */
function coveredSpan(a: Point, b: Point, r: Rect): [number, number] | undefined {
  if (
    Math.max(a.x, b.x) <= r.left || Math.min(a.x, b.x) >= r.right ||
    Math.max(a.y, b.y) <= r.top || Math.min(a.y, b.y) >= r.bottom
  ) return;
  // A parallel segment that survived the bounds check is already inside that axis.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const x1 = dx === 0 ? -Infinity : (r.left - a.x) / dx;
  const x2 = dx === 0 ? Infinity : (r.right - a.x) / dx;
  const y1 = dy === 0 ? -Infinity : (r.top - a.y) / dy;
  const y2 = dy === 0 ? Infinity : (r.bottom - a.y) / dy;
  const start = Math.max(0, Math.min(x1, x2), Math.min(y1, y2));
  const end = Math.min(1, Math.max(x1, x2), Math.max(y1, y2));
  if (start < end) return [start, end];
}

function pathIsClear(points: Point[], obstacles: Rect[]): boolean {
  let left = points[0].x;
  let right = left;
  let top = points[0].y;
  let bottom = top;
  for (const point of points) {
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  return obstacles.every((box) =>
    right <= box.left || left >= box.right || bottom <= box.top || top >= box.bottom ||
    !points.some((point, i) => i > 0 && coveredSpan(points[i - 1], point, box)),
  );
}

function cubic(a: Point, c1: Point, c2: Point, b: Point): Leg {
  const points = [a];
  const steps = 16;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push({
      x: u ** 3 * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * b.x,
      y: u ** 3 * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * b.y,
    });
  }
  points.push(b);
  return { commands: ` C ${xy(c1)} ${xy(c2)} ${xy(b)}`, points };
}

function roundedPath(vertices: Point[], radius: number): Leg {
  const corners: Point[] = [];
  for (const point of vertices) {
    const last = corners.at(-1);
    if (last && manhattan(last, point) === 0) continue;
    const before = corners.at(-2);
    if (before && last && (
      (before.x === last.x && last.x === point.x) ||
      (before.y === last.y && last.y === point.y)
    )) {
      corners[corners.length - 1] = point;
    } else {
      corners.push(point);
    }
  }

  const points = [corners[0]];
  let commands = "";
  let horizontalRun: Leg["horizontalRun"];
  function lineTo(point: Point) {
    const last = points.at(-1)!;
    if (!manhattan(last, point)) return;
    const width = Math.abs(point.x - last.x);
    if (last.y === point.y && width > (horizontalRun?.width ?? 0)) {
      horizontalRun = { center: mix(last, point, 0.5), width };
    }
    commands += ` L ${xy(point)}`;
    points.push(point);
  }

  for (let i = 1; i < corners.length - 1; i++) {
    const [prev, corner, next] = [corners[i - 1], corners[i], corners[i + 1]];
    const incoming = manhattan(prev, corner);
    const outgoing = manhattan(corner, next);
    const r = Math.min(radius, incoming / 2, outgoing / 2);
    const a = mix(corner, prev, r / incoming);
    const b = mix(corner, next, r / outgoing);
    lineTo(a);
    if (!r) continue;
    commands += ` Q ${xy(corner)} ${xy(b)}`;
    for (let step = 1; step <= 6; step++) {
      const t = step / 6;
      points.push(mix(mix(a, corner, t), mix(corner, b, t), t));
    }
  }
  lineTo(corners.at(-1)!);
  return { commands, points, horizontalRun };
}

function portStub(point: Point, direction: 1 | -1, obstacles: Rect[]): Point {
  let length = PORT_STUB;
  for (const box of obstacles) {
    if (point.y <= box.top || point.y >= box.bottom) continue;
    const gap = direction === 1 ? box.left - point.x : point.x - box.right;
    if (gap >= 0) length = Math.min(length, gap / 3);
  }
  return { x: point.x + direction * length, y: point.y };
}

function boxDistance(point: Point, r: Rect): number {
  return Math.max(r.left - point.x, point.x - r.right, r.top - point.y, point.y - r.bottom);
}

interface SearchStep {
  col: number;
  row: number;
  axis: number;
  key: number;
  cost: number;
  estimate: number;
  order: number;
  prev?: SearchStep;
}

// Preserve the search's tie order: lower estimate, then lower cost, then newest.
function precedes(a: SearchStep, b: SearchStep): boolean {
  return a.estimate < b.estimate || (a.estimate === b.estimate &&
    (a.cost < b.cost || (a.cost === b.cost && a.order > b.order)));
}

function pushStep(heap: SearchStep[], next: SearchStep) {
  let i = heap.length;
  heap.push(next);
  while (i > 0) {
    const parent = (i - 1) >>> 1;
    if (!precedes(next, heap[parent])) break;
    heap[i] = heap[parent];
    i = parent;
  }
  heap[i] = next;
}

function popStep(heap: SearchStep[]) {
  const first = heap[0], tail = heap.pop()!;
  if (!heap.length) return first;
  let i = 0, child = 1;
  while (child < heap.length) {
    if (child + 1 < heap.length && precedes(heap[child + 1], heap[child])) child++;
    if (!precedes(heap[child], tail)) break;
    heap[i] = heap[child];
    i = child;
    child = 2 * i + 1;
  }
  heap[i] = tail;
  return first;
}

function coordinateBound(coords: number[], value: number, after: boolean) {
  let low = 0, high = coords.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (coords[mid] < value || (after && coords[mid] === value)) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Mark the same strict rectangle intersections for every edge of a small grid. */
function blockedEdges(xs: number[], ys: number[], obstacles: Rect[]) {
  const stride = xs.length + 1;
  const horizontal = new Int32Array(stride * (ys.length + 1));
  const vertical = new Int32Array(horizontal.length);
  function mark(grid: Int32Array, left: number, top: number, right: number, bottom: number) {
    if (left >= right || top >= bottom) return;
    grid[top * stride + left]++;
    grid[top * stride + right]--;
    grid[bottom * stride + left]--;
    grid[bottom * stride + right]++;
  }
  for (const box of obstacles) {
    if (box.left >= box.right || box.top >= box.bottom) continue;
    const xStart = coordinateBound(xs, box.left, true), xEnd = coordinateBound(xs, box.right, false);
    const yStart = coordinateBound(ys, box.top, true), yEnd = coordinateBound(ys, box.bottom, false);
    mark(horizontal, Math.max(0, xStart - 1), yStart, Math.min(xs.length - 1, xEnd), yEnd);
    mark(vertical, xStart, Math.max(0, yStart - 1), xEnd, Math.min(ys.length - 1, yEnd));
  }
  // Summing the corner marks gives the number of overlapping obstacles at each edge.
  for (let y = 0, row = 0; y < ys.length; y++, row += stride) {
    let across = 0, down = 0;
    for (let x = 0; x < xs.length; x++) {
      const index = row + x;
      across += horizontal[index];
      down += vertical[index];
      horizontal[index] = y ? across + horizontal[index - stride] : across;
      vertical[index] = y ? down + vertical[index - stride] : down;
    }
  }
  return { horizontal, vertical, stride };
}

/** Search orthogonal corridors defined by nearby card sides. Bends have a fixed cost. */
function findDetour(
  start: Point, finish: Point, obstacles: Rect[], clearance: number,
  leavesPort: boolean, entersPort: boolean, feedback: boolean,
): Point[] | undefined {
  const localMargin = 160;
  const left = Math.min(start.x, finish.x) - localMargin;
  const right = Math.max(start.x, finish.x) + localMargin;
  const top = Math.min(start.y, finish.y) - localMargin;
  const bottom = Math.max(start.y, finish.y) + localMargin;
  const padded: Rect[] = [];
  const columnsInRange = new Set([start.x, finish.x]);
  const rowsInRange = new Set([start.y, finish.y]);
  for (const box of obstacles) {
    const pad = Math.min(clearance, boxDistance(start, box), boxDistance(finish, box));
    const rect = { left: box.left - pad, right: box.right + pad, top: box.top - pad, bottom: box.bottom + pad };
    padded.push(rect);
    if (rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom) continue;
    columnsInRange.add(rect.left).add(rect.right);
    rowsInRange.add(rect.top).add(rect.bottom);
  }
  const xs = [...columnsInRange].sort((a, b) => a - b);
  const ys = [...rowsInRange].sort((a, b) => a - b);
  const feedbackY = (start.y + finish.y) / 2;
  const open: SearchStep[] = [];
  const cells = xs.length * ys.length;
  const states = cells * 3;
  // A regular grid is cheaper to address directly. Highly irregular diagrams
  // only pay for states the bounded search actually visits.
  const costs = states <= MAX_SEARCH_STEPS * 12 ? new Float64Array(states).fill(Infinity) : undefined;
  const sparseCosts = costs ? undefined : new Map<number, number>();
  const blocked = cells <= 4096 ? blockedEdges(xs, ys, padded) : undefined;
  type Lane = { blockers: Rect[]; checked: Int8Array };
  const rows: (Lane | undefined)[] = new Array(ys.length);
  const columns: (Lane | undefined)[] = new Array(xs.length);
  let order = 0;

  function queue(col: number, row: number, axis: number, cost: number, prev?: SearchStep) {
    const key = (row * xs.length + col) * 3 + axis;
    if (cost >= (costs ? costs[key] : sparseCosts!.get(key) ?? Infinity)) return;
    if (costs) costs[key] = cost;
    else sparseCosts!.set(key, cost);
    const estimate = cost + (Math.abs(xs[col] - finish.x) + Math.abs(ys[row] - finish.y));
    pushStep(open, { col, row, axis, key, cost, estimate, prev, order: order++ });
  }

  function crossesObstacle(horizontal: boolean, laneIndex: number, interval: number) {
    const lanes = horizontal ? rows : columns;
    const coords = horizontal ? xs : ys;
    let lane = lanes[laneIndex];
    if (!lane) {
      const fixed = (horizontal ? ys : xs)[laneIndex];
      const blockers = padded.filter(box => horizontal ? fixed > box.top && fixed < box.bottom : fixed > box.left && fixed < box.right);
      lane = { blockers, checked: new Int8Array(coords.length) };
      lanes[laneIndex] = lane;
    }
    // Both directions and both incoming axes share the same collision result.
    if (!lane.checked[interval]) {
      const lo = coords[interval], hi = coords[interval + 1];
      lane.checked[interval] = 1;
      for (const box of lane.blockers) {
        const start = horizontal ? box.left : box.top;
        const end = horizontal ? box.right : box.bottom;
        if (Math.max(lo, start) < Math.min(hi, end)) {
          lane.checked[interval] = -1;
          break;
        }
      }
    }
    return lane.checked[interval] < 0;
  }

  const finalCol = xs.indexOf(finish.x), finalRow = ys.indexOf(finish.y);
  queue(xs.indexOf(start.x), ys.indexOf(start.y), leavesPort ? 1 : 0, 0);
  for (let i = 0; i < MAX_SEARCH_STEPS && open.length; i++) {
    const step = popStep(open);
    if (step.cost !== (costs ? costs[step.key] : sparseCosts!.get(step.key))) continue;
    if (step.col === finalCol && step.row === finalRow) {
      const points: Point[] = [];
      for (let current: SearchStep | undefined = step; current; current = current.prev) {
        points.push({ x: xs[current.col], y: ys[current.row] });
      }
      return points.reverse();
    }
    for (const { dx, dy, axis } of SEARCH_MOVES) {
      const col = step.col + dx;
      const row = step.row + dy;
      if (col < 0 || col >= xs.length || row < 0 || row >= ys.length) continue;
      const atFinish = col === finalCol && row === finalRow;
      if (dx < 0 && ((!step.prev && leavesPort) || (atFinish && entersPort))) continue;
      const interval = dx ? Math.min(col, step.col) : Math.min(row, step.row);
      if (blocked) {
        const count = dx ? blocked.horizontal[row * blocked.stride + interval] : blocked.vertical[interval * blocked.stride + col];
        if (count > 0) continue;
      } else if (crossesObstacle(Boolean(dx), dx ? row : col, interval)) continue;
      const bend = step.axis !== 0 && step.axis !== axis ? TURN_COST : 0;
      const lastBend = atFinish && entersPort && axis !== 1 ? TURN_COST : 0;
      const length = dx ? Math.abs(xs[col] - xs[step.col]) : Math.abs(ys[row] - ys[step.row]);
      // Give feedback loops space below the main chain when the detour is comparable.
      const feedbackCost = feedback && dx < 0 && ys[row] < feedbackY ? length * 0.45 : 0;
      queue(col, row, axis, step.cost + length + bend + lastBend + feedbackCost, step);
    }
  }
}

function unit(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function midpoint(points: Point[], length: number): Point {
  let remaining = length / 2;
  for (let i = 1; i < points.length; i++) {
    const step = distance(points[i - 1], points[i]);
    if (step > 0 && remaining <= step) return mix(points[i - 1], points[i], remaining / step);
    remaining -= step;
  }
  return points[0];
}

const labelExclusion = (rect: Rect, halfWidth: number): Rect => ({
  left: rect.left - halfWidth,
  right: rect.right + halfWidth,
  top: rect.top - LABEL_HALF_HEIGHT,
  bottom: rect.bottom + LABEL_HALF_HEIGHT,
});

/** Keep a label on its wire, even when the middle is covered by a card. */
function visibleLabelPoint(
  points: Point[],
  preferred: Point,
  cards: Rect[],
  halfWidth: number,
): Point | undefined {
  const exclusions = cards.map((rect) => labelExclusion(rect, halfWidth));
  let answer: Point | undefined;
  let nearest = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const covered = exclusions
      .flatMap((rect) => {
        const span = coveredSpan(a, b, rect);
        return span ? [span] : [];
      })
      .sort(([first], [second]) => first - second);
    let start = 0;
    for (const [enter, leave] of [...covered, [1, 1]]) {
      if (enter > start) {
        const candidate = mix(a, b, (enter + start) / 2);
        const offset = distance(preferred, candidate);
        if (offset < nearest) {
          answer = candidate;
          nearest = offset;
        }
      }
      start = Math.max(start, leave);
    }
  }
  return answer;
}

interface WireOptions {
  waypoints?: Point[];
  obstacles?: Box[];
  freeEnd?: boolean;
  kind?: FlowEdge["kind"];
  mode?: WireRoutingMode;
}

export interface WireRoute {
  path: string;
  label: Point;
  /** Space between a short tag and the port rims, with clearance for its expanded pill. */
  portLabel?: { fit: "inline" | "snug" | "above"; lift: number; idleWidth: number };
  tight: boolean;
  /** Sampled path for each interval between consecutive saved anchors. */
  legs: Point[][];
}

function wireSegments(
  from: WireEnd,
  to: WireEnd,
  {
    waypoints = [],
    obstacles = [],
    freeEnd = false,
    kind = "continuation",
    mode = DEFAULT_WIRE_ROUTING,
  }: WireOptions = {},
) {
  const anchors = [from, ...waypoints, to];
  const toRect = ({ x, y, w, h }: Box): Rect => ({
    left: x, right: x + w, top: y, bottom: y + h,
  });
  const endpoints: Rect[] = [];
  if (from.box) endpoints.push(toRect(from.box));
  if (to.box) endpoints.push(toRect(to.box));
  const cards = [...endpoints, ...obstacles.map(toRect)];
  // Both modes protect the two connectors. Only avoidance changes shape for other cards.
  const rects = mode === "avoid" ? cards : endpoints;
  const tangents = anchors.map((point, i) => {
    if (i === 0) return { x: 1, y: 0 };
    const prev = anchors[i - 1];
    const incoming = unit(point.x - prev.x, point.y - prev.y);
    const next = anchors[i + 1];
    if (!next) return freeEnd ? incoming : { x: 1, y: 0 };
    const outgoing = unit(next.x - point.x, next.y - point.y);
    return unit(incoming.x + outgoing.x, incoming.y + outgoing.y);
  });

  const legs = tangents.slice(1).map((targetTangent, i): Leg => {
    const a = anchors[i];
    const b = anchors[i + 1];
    const leavesPort = i === 0;
    const entersPort = i === anchors.length - 2 && !freeEnd;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (!dx && !dy) return { commands: "", points: [a, b] };

    // A saved waypoint or a port covered by another card still has to stay attached.
    const blockers = rects.filter((r) => !inside(a, r) && !inside(b, r));
    if ((!leavesPort && !entersPort) || dx > 0 || freeEnd) {
      const straight = dy === 0 && dx > 0 && !tangents[i].y && !targetTangent.y;
      const forwardPorts = leavesPort && entersPort;
      const reach = forwardPorts ? Math.min(180, dx / 2) : Math.min(160, distance(a, b) * 0.36);
      const startReach = leavesPort && dx > 0 ? Math.min(reach, dx / 2) : reach;
      const endReach = entersPort && dx > 0 ? Math.min(reach, dx / 2) : reach;
      const candidate = straight
        ? {
            commands: ` L ${xy(b)}`,
            points: [a, b],
            horizontalRun: { center: mix(a, b, 0.5), width: dx },
          }
        : cubic(
            a,
            { x: a.x + tangents[i].x * startReach, y: a.y + tangents[i].y * startReach },
            { x: b.x - targetTangent.x * endReach, y: b.y - targetTangent.y * endReach },
            b,
          );
      if (freeEnd || pathIsClear(candidate.points, blockers)) return candidate;
    }

    const start = leavesPort ? portStub(a, 1, blockers) : a;
    const finish = entersPort ? portStub(b, -1, blockers) : b;
    const feedback = dx < 0 && leavesPort && entersPort;
    const clearance = (kind === "reference" ? 21 : 14) + (feedback ? 18 : 0);
    const detour = findDetour(start, finish, blockers, clearance, leavesPort, entersPort, feedback);
    if (detour) {
      const vertices = [a, ...detour, b];
      const rounded = roundedPath(vertices, CORNER_RADIUS);
      return pathIsClear(rounded.points, blockers) ? rounded : roundedPath(vertices, 0);
    }

    // Keep the connection visible if a tight arrangement leaves no local corridor.
    const top = Math.min(a.y, b.y, from.box?.y ?? a.y, to.box?.y ?? b.y) - clearance;
    const bottom = Math.max(a.y, b.y, from.box ? from.box.y + from.box.h : a.y, to.box ? to.box.y + to.box.h : b.y) + clearance;
    const lane = a.y + b.y <= top + bottom ? top : bottom;
    return roundedPath([a, start, { x: start.x, y: lane }, { x: finish.x, y: lane }, finish, b], CORNER_RADIUS);
  });
  const path = `M ${xy(from)}` + legs.map((leg) => leg.commands).join("");
  return { path, legs, cards, mode };
}

export function routePath(from: WireEnd, to: WireEnd, options: WireOptions = {}): string {
  return wireSegments(from, to, options.mode === "avoid" ? options : { ...options, obstacles: [] }).path;
}

export function route(from: WireEnd, to: WireEnd, options: WireOptions = {}): WireRoute {
  const { path, legs, cards, mode } = wireSegments(from, to, options);
  // A round detour's straight horizontal run is easier to read than a pill on a bend.
  let label: Point = from;
  let bestScore = -Infinity;
  let tight = true;
  for (const leg of legs) {
    const length = leg.points.reduce((total, p, i) => i ? total + distance(leg.points[i - 1], p) : total, 0);
    const run = leg.horizontalRun;
    const width = run?.width ?? Math.abs(leg.points[0].x - leg.points.at(-1)!.x);
    const preferred = run && run.width >= 36 ? run.center : midpoint(leg.points, length);
    let point = preferred;
    let compact = width < 128;
    const halfWidth = mode === "overlap" && compact ? COMPACT_LABEL_HALF_WIDTH : LABEL_HALF_WIDTH;
    let room = cards.every((rect) => !inside(preferred, labelExclusion(rect, halfWidth)));
    if (!room && mode === "overlap") {
      const full = visibleLabelPoint(leg.points, preferred, cards, halfWidth);
      const visible = full ?? (
        compact ? undefined : visibleLabelPoint(leg.points, preferred, cards, COMPACT_LABEL_HALF_WIDTH)
      );
      if (visible) {
        point = visible;
        room = true;
        compact ||= !full;
      }
    }
    const score = length + (room ? 200 : 0);
    if (score > bestScore) {
      bestScore = score;
      label = point;
      tight = !room || compact;
    }
  }
  let portLabel: WireRoute["portLabel"];
  if (tight) {
    const reference = options.kind === "reference";
    const rim = reference ? 7.5 : 6;
    let room = Infinity;
    let lift = 0;
    for (const end of [from, to]) {
      if (!end.box || Math.abs(label.y - end.y) >= 22) continue;
      const distanceX = Math.abs(label.x - end.x);
      if (distanceX >= 72) continue;
      room = Math.min(room, 2 * (distanceX - rim));
      lift = Math.max(lift, label.y - end.box.y + LABEL_HALF_HEIGHT + 2);
    }
    if (lift) {
      // Widths of the original icon pill with regular and close-set spacing.
      const regular = reference ? 27 : 46;
      const snug = reference ? 17 : 31;
      const fit = room >= regular ? "inline" : room >= snug ? "snug" : "above";
      portLabel = { fit, lift, idleWidth: fit === "snug" ? snug : regular };
    }
  }
  return { path, label, portLabel, tight, legs: legs.map((leg) => leg.points) };
}

export function insertWireWaypoint(waypoints: Point[], wire: WireRoute, click: Point): Point[] {
  let index = 0;
  let closest = click;
  let best = Infinity;
  for (const [i, points] of wire.legs.entries()) {
    for (let j = 1; j < points.length; j++) {
      const a = points[j - 1];
      const b = points[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = ((click.x - a.x) * dx + (click.y - a.y) * dy) / (dx * dx + dy * dy || 1);
      const point = mix(a, b, Math.max(0, Math.min(1, t)));
      const d = (point.x - click.x) ** 2 + (point.y - click.y) ** 2;
      if (d < best) {
        best = d;
        closest = point;
        index = i;
      }
    }
  }
  const point = { x: round(closest.x), y: round(closest.y) };
  return [...waypoints.slice(0, index), point, ...waypoints.slice(index)];
}
