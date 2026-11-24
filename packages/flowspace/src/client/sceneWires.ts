import type { FlowEdge, NativeAgentMessage, Waypoint, WireRoutingMode } from "../types.ts";
import { BoxIndex } from "./boxIndex.ts";
import { bounds, encloses, intersects, padded, type Box } from "./boxes.ts";
import { route, routePath, type WireRoute } from "./wireRouting.ts";

export interface ExchangePair {
  id: string;
  from: string;
  to: string;
  items: { id: string; fromId: string; toId: string; text: string; at: number; seq: number }[];
}

export function groupExchanges(messages: NativeAgentMessage[], endpoint: (id: string) => string | undefined): ExchangePair[] {
  const grouped = new Map<string, ExchangePair>();
  for (const message of messages) {
    const fromId = endpoint(message.fromSessionId);
    const toId = endpoint(message.toSessionId);
    if (!fromId || !toId || fromId === toId || !message.text.trim()) continue;
    const [from, to] = fromId < toId ? [fromId, toId] : [toId, fromId];
    const id = `${from}::${to}`;
    let pair = grouped.get(id);
    if (!pair) {
      pair = { id, from, to, items: [] };
      grouped.set(id, pair);
    }
    pair.items.push({ id: message.id, fromId, toId, text: message.text, at: message.time, seq: message.seq });
  }
  return [...grouped.values()];
}

export type WireEnd = { x: number; y: number; box: Box; groupId?: string };
export type CachedWire = { key: string; region: Box; geom: WireRoute; extent: Box; path2d?: Path2D };
export type CachedPath = { key: string; region?: Box; path: string; extent: Box; path2d?: Path2D };

/** Browser-only resources are created on first paint, never in the routing worker. */
export function cachedPath2D(entry: { path?: string; geom?: WireRoute; path2d?: Path2D }) {
  if (typeof Path2D === "undefined") return undefined;
  return entry.path2d ??= new Path2D(entry.geom?.path ?? entry.path!);
}

export interface WireHitResult {
  edgeId: string;
  distance: number;
  worldPoint: { x: number; y: number };
}
const boxKey = (box: Box) => `${box.x},${box.y},${box.w},${box.h}`;

export interface GuideRoute {
  id: string;
  key: string;
  from: WireEnd;
  to: WireEnd;
  mode: WireRoutingMode;
  kind: FlowEdge["kind"];
}

export interface ObstacleDelta {
  added: Box[];
  removed: string[];
}

export function obstacleDelta(previous: Box[], next: Box[]): ObstacleDelta {
  const before = new Set(previous.map(boxKey));
  const after = new Set(next.map(boxKey));
  return {
    added: next.filter(box => !before.has(boxKey(box))),
    removed: [...before].filter(key => !after.has(key)),
  };
}

export class RouteObstacles {
  private boxes = new Map<string, Box>();
  private index = new BoxIndex<string>();

  update(boxes: Box[]) {
    const next = new Map(boxes.map(box => [boxKey(box), box]));
    const added: Box[] = [];
    const removed: string[] = [];
    const changed: Box[] = [];
    for (const [key, box] of this.boxes) {
      if (!next.has(key)) {
        removed.push(key);
        changed.push(box);
      }
    }
    for (const [key, box] of next) if (!this.boxes.has(key)) added.push(box);
    this.apply({ added, removed });
    return { added, removed, changed: [...changed, ...added] };
  }

  apply({ added, removed }: ObstacleDelta) {
    for (const key of removed) {
      this.boxes.delete(key);
      this.index.delete(key);
    }
    for (const box of added) {
      const key = boxKey(box);
      this.boxes.set(key, box);
      this.index.set(key, box);
    }
  }

  all() {
    return [...this.boxes.values()];
  }

  query(box: Box) {
    return this.index.query(box).map(key => this.boxes.get(key)!);
  }

  corridor(region: Box) {
    let boxes = this.query(region);
    if (boxes.length) {
      region = padded(bounds([region, ...boxes]), 96);
      boxes = this.query(region);
    }
    return { region, boxes };
  }
}

export function buildGuideRoute(task: GuideRoute, obstacles: RouteObstacles): CachedPath {
  const { from, to, mode, kind, key } = task;
  const corridor = mode === "avoid" ? obstacles.corridor(padded(bounds([from.box, to.box]), 320)) : undefined;
  const path = routePath(from, to, { mode, kind, obstacles: corridor?.boxes });
  return { key, region: corridor?.region, path, extent: padded(pathExtent(path), 24) };
}

export interface EdgeRouteTask {
  kind: "edge";
  id: string;
  key: string;
  edgeKind: FlowEdge["kind"];
  mode: WireRoutingMode;
  from: WireEnd;
  to: WireEnd;
  waypoints: Waypoint[];
}

export interface GuideRouteTask extends Omit<GuideRoute, "kind"> {
  kind: "guide";
  edgeKind: FlowEdge["kind"];
}

export type RoutingTask = EdgeRouteTask | GuideRouteTask;

export interface RoutingBatchRequest {
  id: number;
  obstacles?: ObstacleDelta;
  tasks: RoutingTask[];
}

export type RoutingResultItem =
  | { kind: "guide"; id: string; entry: CachedPath }
  | ({ kind: "edge"; id: string } & CachedWire);

export interface RoutingBatchReply {
  id: number;
  results: RoutingResultItem[];
  done: boolean;
}

export function edgeRouteTask(edge: FlowEdge, from: WireEnd, to: WireEnd, mode: WireRoutingMode): EdgeRouteTask {
  const waypoints = edge.waypoints ?? [];
  const key = `${mode}:${edge.kind}:${boxKey(from.box)}:${from.x},${from.y}:${boxKey(to.box)}:${to.x},${to.y}:${waypoints.map(point => `${point.x},${point.y}`).join("/")}`;
  return { kind: "edge", id: edge.id, key, edgeKind: edge.kind, from, to, waypoints, mode };
}

export function buildEdgeRoute(task: EdgeRouteTask, obstacles: RouteObstacles): CachedWire {
  const { from, to, mode, edgeKind: kind, waypoints, key } = task;
  const anchors = [from.box, to.box, ...waypoints.map(point => ({ ...point, w: 0, h: 0 }))];
  const local = padded(bounds(anchors), 320);
  const { region, boxes } = mode === "avoid"
    ? obstacles.corridor(local)
    : { region: local, boxes: obstacles.query(local) };
  const geom = route(from, to, { mode, kind, waypoints, obstacles: boxes });
  const extent = padded(pathExtent(geom.path), 72);
  // In overlap mode obstacles can only move the label within reach of the fixed path.
  return { key, region: mode === "avoid" ? region : extent, geom, extent };
}

export function buildRoutingResult(task: RoutingTask, obstacles: RouteObstacles): RoutingResultItem {
  return task.kind === "edge"
    ? { kind: "edge", id: task.id, ...buildEdgeRoute(task, obstacles) }
    : { kind: "guide", id: task.id, entry: buildGuideRoute({ ...task, kind: task.edgeKind }, obstacles) };
}

export function pathExtent(path: string): Box {
  const coordinates = path.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? [];
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let index = 0; index + 1 < coordinates.length; index += 2) {
    const x = Number(coordinates[index]), y = Number(coordinates[index + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (!Number.isFinite(left)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: left, y: top, w: right - left, h: bottom - top };
}

type Point = { x: number; y: number };
type Segment = { points: Point[]; box: Box; halves?: [Segment, Segment] };
const contours = new WeakMap<{ path: string }, Segment[]>();

function segment(points: Point[]): Segment {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const point of points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return { points, box: { x: left, y: top, w: right - left, h: bottom - top } };
}

function pathSegments(wire: { path: string }): Segment[] {
  const cached = contours.get(wire);
  if (cached) return cached;
  const commands = wire.path.match(/[MLQC]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? [];
  const segments: Segment[] = [];
  let previous = { x: 0, y: 0 };
  for (let index = 0; index < commands.length;) {
    const command = commands[index++];
    if (command !== "M" && command !== "L" && command !== "Q" && command !== "C") continue;
    const count = command === "C" ? 3 : command === "Q" ? 2 : 1;
    if (index + count * 2 > commands.length) break;
    const points = [previous];
    let valid = true;
    for (let pair = 0; pair < count; pair++) {
      const x = Number(commands[index++]), y = Number(commands[index++]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) { valid = false; break; }
      points.push({ x, y });
    }
    if (!valid) continue;
    previous = points.at(-1)!;
    if (command !== "M") segments.push(segment(points));
  }
  contours.set(wire, segments);
  return segments;
}

function splitSegment(points: Point[], at = 0.5): [Segment, Segment] {
  const [a, b, c, d] = points;
  const mix = (from: Point, to: Point) => ({ x: from.x + (to.x - from.x) * at, y: from.y + (to.y - from.y) * at });
  const ab = mix(a, b);
  if (!c) return [segment([a, ab]), segment([ab, b])];
  const bc = mix(b, c);
  const abc = mix(ab, bc);
  if (!d) return [segment([a, ab, abc]), segment([abc, bc, c])];
  const cd = mix(c, d);
  const bcd = mix(bc, cd);
  const abcd = mix(abc, bcd);
  return [segment([a, ab, abc, abcd]), segment([abcd, bcd, cd, d])];
}

/** Flatten M/L/Q/C routes with a bounded chord error and accumulate arc length. */
export function sampleWirePath(path: string, tolerance = 0.025) {
  const samples: { point: Point; distance: number }[] = [];
  let distance = 0;
  const append = (point: Point) => {
    const previous = samples.at(-1)?.point;
    if (previous) distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    if (!previous || point.x !== previous.x || point.y !== previous.y) samples.push({ point, distance });
  };
  const flatten = (curve: Segment, depth: number) => {
    const points = curve.points;
    const first = points[0], last = points.at(-1)!;
    const polygon = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
    if (depth < 16 && polygon - Math.hypot(last.x - first.x, last.y - first.y) > tolerance) {
      const [left, right] = splitSegment(points);
      flatten(left, depth + 1);
      flatten(right, depth + 1);
    } else append(last);
  };
  for (const curve of pathSegments({ path })) {
    append(curve.points[0]);
    flatten(curve, 0);
  }
  return samples;
}

function containsPoint(area: Box, point: Point) {
  return point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h;
}

function segmentTouches(curve: Segment, area: Box, depth: number): boolean {
  const { box, points } = curve;
  if (!intersects(box, area)) return false;
  if (depth === 0 || Math.max(box.w, box.h) < 32 ||
      containsPoint(area, points[0]) || containsPoint(area, points[points.length - 1])) return true;
  const [left, right] = curve.halves ??= splitSegment(points);
  return segmentTouches(left, area, depth - 1) || segmentTouches(right, area, depth - 1);
}

export function pathTouches(wire: { path: string; extent?: Box }, area: Box, extent = wire.extent ?? pathExtent(wire.path)): boolean {
  if (!intersects(extent, area)) return false;
  if (encloses(area, extent)) return true;
  return pathSegments(wire).some(curve => segmentTouches(curve, area, 9));
}

function visibleEnd(curve: Segment, area: Box, start: number, end: number, depth: number): number {
  if (!intersects(curve.box, area)) return -1;
  if (depth < 1 || encloses(area, curve.box) || containsPoint(area, curve.points.at(-1)!)) return end;
  const [left, right] = curve.halves ??= splitSegment(curve.points);
  const middle = (start + end) / 2;
  const onRight = visibleEnd(right, area, middle, end, depth - 1);
  return onRight >= 0 ? onRight : visibleEnd(left, area, start, middle, depth - 1);
}

/** The dots keep their phase from the original start. Skip the invisible tail
 * before passing a long guide to Canvas 2D's dash tessellator. */
export function guidePathInArea(wire: { path: string; extent: Box }, area: Box) {
  if (encloses(area, wire.extent)) return wire.path;
  const clip = padded(area, 8);
  const segments = pathSegments(wire);
  for (let index = segments.length - 1; index >= 0; index--) {
    const curve = segments[index];
    const end = visibleEnd(curve, clip, 0, 1, 8);
    if (end < 0) continue;
    if (index === segments.length - 1 && end === 1) return wire.path;
    // Keep the initial path and exact Bézier control points through the cut.
    const start = segments[0].points[0];
    let path = `M ${start.x} ${start.y}`;
    for (let at = 0; at <= index; at++) {
      const points = at === index && end < 1 ? splitSegment(curve.points, end)[0].points : segments[at].points;
      path += ` ${["L", "Q", "C"][points.length - 2]}`;
      for (const point of points.slice(1)) path += ` ${point.x} ${point.y}`;
    }
    return path;
  }
  return segments.length ? "" : wire.path;
}

export class SceneWires {
  private entries = new Map<string, CachedWire>();
  private paths = new Map<string, CachedPath>();
  private edgeRegions = new BoxIndex<string>();
  private guideRegions = new BoxIndex<string>();
  readonly wireHitIndex = new BoxIndex<string>();
  private hitWires = new Map<string, { geom: WireRoute; extent: Box }>();
  private dirtyPaths = new Set<string>();
  private obstacleChanges: Box[][] = [];
  private edges?: FlowEdge[];
  private pathIds?: Set<string>;
  readonly obstacles = new RouteObstacles();
  obstacleRevision = 0;

  update(boxes: Box[], edges: FlowEdge[], pathIds: Set<string> = new Set()) {
    const { changed } = this.obstacles.update(boxes);
    if (changed.length) {
      this.obstacleRevision++;
      this.obstacleChanges.push(changed);
      if (this.obstacleChanges.length > 4) this.obstacleChanges.shift();
    }
    const invalid = new Set<string>();
    for (const box of changed) {
      for (const id of this.edgeRegions.query(box)) invalid.add(id);
      for (const id of this.guideRegions.query(box)) this.dirtyPaths.add(id);
    }
    if (edges !== this.edges) {
      this.edges = edges;
      const ids = new Set(edges.map(edge => edge.id));
      for (const id of this.entries.keys()) if (!ids.has(id)) invalid.add(id);
    }
    for (const id of invalid) {
      this.entries.delete(id);
      this.edgeRegions.delete(id);
      this.wireHitIndex.delete(id);
      this.hitWires.delete(id);
    }
    if (pathIds !== this.pathIds) {
      this.pathIds = pathIds;
      for (const id of this.paths.keys()) {
        if (pathIds.has(id)) continue;
        this.paths.delete(id);
        this.guideRegions.delete(id);
        this.dirtyPaths.delete(id);
      }
    }
    return invalid;
  }

  guide(id: string, from: WireEnd, to: WireEnd, mode: WireRoutingMode, kind: FlowEdge["kind"] = "continuation"): GuideRoute {
    const key = `${mode}:${kind}:${boxKey(from.box)}:${from.x},${from.y}:${boxKey(to.box)}:${to.x},${to.y}`;
    return { id, key, from, to, mode, kind };
  }

  lookupGuide(task: GuideRoute) {
    const path = this.paths.get(task.id);
    return { path, current: path?.key === task.key && !this.dirtyPaths.has(task.id) };
  }

  saveGuide(id: string, entry: CachedPath) {
    const previous = this.paths.get(id);
    const a = previous?.region, b = entry.region;
    const sameRegion = a === b || (a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);
    this.dirtyPaths.delete(id);
    if (previous?.key === entry.key && previous.path === entry.path && sameRegion) return previous;
    this.paths.set(id, entry);
    if (!sameRegion) {
      if (entry.region) this.guideRegions.set(id, entry.region);
      else this.guideRegions.delete(id);
    }
    return entry;
  }

  acceptGuide(task: GuideRoute, entry: CachedPath, revision: number) {
    if (task.key !== entry.key || this.lookupGuide(task).current) return false;
    if (!this.routeIsCurrent(entry.region, revision)) return false;
    this.saveGuide(task.id, entry);
    return true;
  }

  private routeIsCurrent(region: Box | undefined, revision: number) {
    const elapsed = this.obstacleRevision - revision;
    return elapsed >= 0 && (!region || elapsed === 0 ||
      (elapsed <= this.obstacleChanges.length &&
        !this.obstacleChanges.slice(-elapsed).some(change => change.some(box => intersects(region, box)))));
  }

  getPath(id: string, from: WireEnd, to: WireEnd, mode: WireRoutingMode, kind: FlowEdge["kind"] = "continuation"): CachedPath {
    const task = this.guide(id, from, to, mode, kind);
    const { path, current } = this.lookupGuide(task);
    return current ? path! : this.saveGuide(id, buildGuideRoute(task, this.obstacles));
  }

  lookupEdge(task: EdgeRouteTask) {
    const entry = this.entries.get(task.id);
    return entry?.key === task.key ? entry : undefined;
  }

  cachedEdge(id: string) {
    return this.entries.get(id);
  }

  private saveEdge(id: string, entry: CachedWire) {
    this.entries.set(id, entry);
    this.edgeRegions.set(id, entry.region);
    this.wireHitIndex.set(id, entry.extent);
    this.hitWires.set(id, entry);
    return entry;
  }

  /** Satellite endpoints can differ from the worker cache while the input hub is open. */
  setHitWires(wires: { edge: FlowEdge; geom: WireRoute; extent: Box }[]) {
    const ids = new Set(wires.map(wire => wire.edge.id));
    for (const id of this.hitWires.keys()) {
      if (ids.has(id)) continue;
      this.hitWires.delete(id);
      this.wireHitIndex.delete(id);
    }
    for (const wire of wires) {
      if (this.hitWires.get(wire.edge.id)?.geom === wire.geom) continue;
      this.hitWires.set(wire.edge.id, wire);
      this.wireHitIndex.set(wire.edge.id, wire.extent);
    }
  }

  hitTestEdge(worldPt: Point, tolerance: number, candidates?: ReadonlySet<string>): WireHitResult | null {
    let nearest: WireHitResult | null = null;
    let best = tolerance * tolerance;
    const area = { x: worldPt.x - tolerance, y: worldPt.y - tolerance, w: tolerance * 2, h: tolerance * 2 };
    for (const id of this.wireHitIndex.query(area)) {
      if (candidates && !candidates.has(id)) continue;
      const entry = this.hitWires.get(id)!;
      for (const leg of entry.geom.legs) {
        for (let index = 1; index < leg.length; index++) {
          const a = leg[index - 1], b = leg[index];
          const dx = b.x - a.x, dy = b.y - a.y;
          const length = dx * dx + dy * dy;
          const at = length ? Math.max(0, Math.min(1, ((worldPt.x - a.x) * dx + (worldPt.y - a.y) * dy) / length)) : 0;
          const point = { x: a.x + dx * at, y: a.y + dy * at };
          const squared = (point.x - worldPt.x) ** 2 + (point.y - worldPt.y) ** 2;
          if (squared > best) continue;
          best = squared;
          nearest = { edgeId: id, distance: Math.sqrt(squared), worldPoint: point };
        }
      }
    }
    return nearest;
  }

  acceptEdgeRoute(edgeId: string, key: string, entry: CachedWire, revision: number) {
    if (entry.key !== key || !this.routeIsCurrent(entry.region, revision)) return false;
    this.saveEdge(edgeId, entry);
    return true;
  }

  get(edge: FlowEdge, from: WireEnd, to: WireEnd, mode: WireRoutingMode): CachedWire {
    const task = edgeRouteTask(edge, from, to, mode);
    return this.lookupEdge(task) ?? this.saveEdge(task.id, buildEdgeRoute(task, this.obstacles));
  }
}
