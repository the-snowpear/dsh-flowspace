import type { FlowEdge, WireRoutingMode } from "../types.ts";
import { bounds, type Box } from "./geometry.ts";
import { encloses, intersects, padded } from "./sceneModel.ts";
import { route, routePath, type WireRoute } from "./wireRouting.ts";

type End = { x: number; y: number; box: Box };
type CachedWire = { key: string; region: Box; geom: WireRoute; extent: Box };
type CachedPath = { key: string; region: Box; path: string; extent: Box };
const boxKey = (box: Box) => `${box.x},${box.y},${box.w},${box.h}`;

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
const contours = new WeakMap<{ path: string }, Point[][]>();

function pathSegments(wire: { path: string }): Point[][] {
  const cached = contours.get(wire);
  if (cached) return cached;
  const commands = wire.path.match(/[MLQC]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
  const segments: Point[][] = [];
  let previous = { x: 0, y: 0 };
  for (let index = 0; index < commands.length;) {
    const command = commands[index++];
    const points = [previous];
    const count = command === "C" ? 3 : command === "Q" ? 2 : 1;
    for (let pair = 0; pair < count; pair++) points.push({ x: +commands[index++], y: +commands[index++] });
    previous = points.at(-1)!;
    if (command !== "M") segments.push(points);
  }
  contours.set(wire, segments);
  return segments;
}

function segmentTouches(points: Point[], area: Box, depth: number): boolean {
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  const box = { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  if (!intersects(box, area)) return false;
  if (encloses(area, box) || depth === 0 || Math.max(box.w, box.h) < 32) return true;
  const left = [points[0]], right = [points.at(-1)!];
  let level = points;
  while (level.length > 1) {
    level = level.slice(1).map((end, index) => ({ x: (level[index].x + end.x) / 2, y: (level[index].y + end.y) / 2 }));
    left.push(level[0]);
    right.unshift(level.at(-1)!);
  }
  return segmentTouches(left, area, depth - 1) || segmentTouches(right, area, depth - 1);
}

export function pathTouches(wire: { path: string; extent?: Box }, area: Box, extent = wire.extent ?? pathExtent(wire.path)): boolean {
  if (!intersects(extent, area)) return false;
  if (encloses(area, extent)) return true;
  return pathSegments(wire).some(points => segmentTouches(points, area, 9));
}

export class SceneWires {
  private entries = new Map<string, CachedWire>();
  private paths = new Map<string, CachedPath>();
  private obstacles = new Map<string, Box>();
  private sorted: Box[] = [];

  update(boxes: Box[], edges: FlowEdge[], pathIds: Set<string> = new Set()) {
    const next = new Map(boxes.map(box => [boxKey(box), box]));
    const changed: Box[] = [];
    for (const [key, box] of this.obstacles) if (!next.has(key)) changed.push(box);
    for (const [key, box] of next) if (!this.obstacles.has(key)) changed.push(box);
    const ids = new Set(edges.map(edge => edge.id));
    for (const [id, entry] of this.entries) {
      if (!ids.has(id) || changed.some(box => intersects(entry.region, box))) this.entries.delete(id);
    }
    for (const [id, entry] of this.paths) {
      if (!pathIds.has(id) || changed.some(box => intersects(entry.region, box))) this.paths.delete(id);
    }
    if (changed.length) {
      this.obstacles = next;
      this.sorted = [...next.values()].sort((a, b) => a.x - b.x);
    }
  }

  getPath(id: string, from: End, to: End, mode: WireRoutingMode, kind: FlowEdge["kind"] = "continuation"): CachedPath {
    const key = `${mode}:${kind}:${boxKey(from.box)}:${from.x},${from.y}:${boxKey(to.box)}:${to.x},${to.y}`;
    const cached = this.paths.get(id);
    if (cached?.key === key) return cached;
    let region = padded(bounds([from.box, to.box]), 320);
    const nearby = mode === "avoid" ? this.query(region) : [];
    if (nearby.length) region = padded(bounds([region, ...nearby]), 96);
    const path = routePath(from, to, { mode, kind, obstacles: nearby.length ? this.query(region) : [] });
    const entry = { key, region, path, extent: padded(pathExtent(path), 24) };
    this.paths.set(id, entry);
    return entry;
  }
  private query(box: Box) {
    const hits = [];
    for (const candidate of this.sorted) {
      if (candidate.x > box.x + box.w) break;
      if (intersects(candidate, box)) hits.push(candidate);
    }
    return hits;
  }

  get(edge: FlowEdge, from: End, to: End, mode: WireRoutingMode): CachedWire {
    const waypoints = edge.waypoints ?? [];
    const key = `${mode}:${edge.kind}:${boxKey(from.box)}:${from.x},${from.y}:${boxKey(to.box)}:${to.x},${to.y}:${waypoints.map(point => `${point.x},${point.y}`).join("/")}`;
    const cached = this.entries.get(edge.id);
    if (cached?.key === key) return cached;
    const anchors = [from.box, to.box, ...waypoints.map(point => ({ ...point, w: 0, h: 0 }))];
    let region = padded(bounds(anchors), 320);
    let obstacles = this.query(region);
    if (mode === "avoid" && obstacles.length) {
      region = padded(bounds([region, ...obstacles]), 96);
      obstacles = this.query(region);
    }
    const geom = route(from, to, { mode, kind: edge.kind, waypoints, obstacles });
    const extent = padded(pathExtent(geom.path), 72);
    const entry = { key, region, geom, extent };
    this.entries.set(edge.id, entry);
    return entry;
  }
}
