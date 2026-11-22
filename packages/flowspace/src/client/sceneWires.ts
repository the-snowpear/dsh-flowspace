import type { FlowEdge, NativeAgentMessage, WireRoutingMode } from "../types.ts";
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

export type WireEnd = { x: number; y: number; box: Box };
type CachedWire = { key: string; region: Box; geom: WireRoute; extent: Box };
export type CachedPath = { key: string; region?: Box; path: string; extent: Box };
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

export interface GuideBatch {
  id: number;
  obstacles?: ObstacleDelta;
  tasks: GuideRoute[];
}

export type GuideResults = [id: string, path: CachedPath][];
export interface GuideReply {
  id: number;
  paths: GuideResults;
  done: boolean;
}

export function pathExtent(path: string): Box {
  const coordinates = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let index = 0; index < coordinates.length; index += 2) {
    const x = Number(coordinates[index]), y = Number(coordinates[index + 1]);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
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
  const commands = wire.path.match(/[MLQC]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
  const segments: Segment[] = [];
  let previous = { x: 0, y: 0 };
  for (let index = 0; index < commands.length;) {
    const command = commands[index++];
    const points = [previous];
    const count = command === "C" ? 3 : command === "Q" ? 2 : 1;
    for (let pair = 0; pair < count; pair++) points.push({ x: +commands[index++], y: +commands[index++] });
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
  return wire.path;
}

export class SceneWires {
  private entries = new Map<string, CachedWire>();
  private paths = new Map<string, CachedPath>();
  private edgeRegions = new BoxIndex<string>();
  private guideRegions = new BoxIndex<string>();
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
    if (task.key !== entry.key || this.lookupGuide(task).current) return;
    const elapsed = this.obstacleRevision - revision;
    const region = entry.region;
    if (region && elapsed && (elapsed > this.obstacleChanges.length ||
      this.obstacleChanges.slice(-elapsed).some(change => change.some(box => intersects(region, box))))) return;
    this.saveGuide(task.id, entry);
  }

  getPath(id: string, from: WireEnd, to: WireEnd, mode: WireRoutingMode, kind: FlowEdge["kind"] = "continuation"): CachedPath {
    const task = this.guide(id, from, to, mode, kind);
    const { path, current } = this.lookupGuide(task);
    return current ? path! : this.saveGuide(id, buildGuideRoute(task, this.obstacles));
  }

  get(edge: FlowEdge, from: WireEnd, to: WireEnd, mode: WireRoutingMode): CachedWire {
    const waypoints = edge.waypoints ?? [];
    const key = `${mode}:${edge.kind}:${boxKey(from.box)}:${from.x},${from.y}:${boxKey(to.box)}:${to.x},${to.y}:${waypoints.map(point => `${point.x},${point.y}`).join("/")}`;
    const cached = this.entries.get(edge.id);
    if (cached?.key === key) return cached;
    const anchors = [from.box, to.box, ...waypoints.map(point => ({ ...point, w: 0, h: 0 }))];
    const local = padded(bounds(anchors), 320);
    const { region, boxes } = mode === "avoid"
      ? this.obstacles.corridor(local)
      : { region: local, boxes: this.obstacles.query(local) };
    const geom = route(from, to, { mode, kind: edge.kind, waypoints, obstacles: boxes });
    const extent = padded(pathExtent(geom.path), 72);
    // In overlap mode an obstacle can move the label only within reach of the fixed path.
    const entry = { key, region: mode === "avoid" ? region : extent, geom, extent };
    this.entries.set(edge.id, entry);
    this.edgeRegions.set(edge.id, entry.region);
    return entry;
  }
}
