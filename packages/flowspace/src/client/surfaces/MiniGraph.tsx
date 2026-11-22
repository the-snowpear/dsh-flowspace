import type {
  FlowEdge,
  FlowNode,
  FlowspaceSnapshot,
  WireRoutingMode,
} from "../../types.ts";
import { bounds, nodeBox, portY } from "../geometry.ts";
import { route } from "../wireRouting.ts";
import { nodeStatusOf } from "./formatters.ts";

export function MiniGraph({
  nodes,
  edges,
  snapshot,
  wireRouting,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  snapshot?: FlowspaceSnapshot | null;
  wireRouting?: WireRoutingMode;
}) {
  const shown = nodes.filter((n) => n.kind !== "group");
  if (!shown.length) return null;
  const boxes = new Map(
    shown.map((node) => [node.id, { node, box: nodeBox(node) }]),
  );
  const obstacles = [...boxes.values()].map(({ box }) => box);
  const wires = edges.flatMap((edge) => {
    const source = boxes.get(edge.source);
    const target = boxes.get(edge.target);
    if (!source || !target) return [];
    const a = source.box;
    const b = target.box;
    const geom = route(
      { x: a.x + a.w, y: a.y + portY(source.node, edge.kind, !!a.compact, edge.sourcePort ?? "out", 0, a.h, "out"), box: a },
      { x: b.x, y: b.y + portY(target.node, edge.kind, !!b.compact, edge.targetPort ?? "in", 0, b.h, "in"), box: b },
      { kind: edge.kind, mode: wireRouting, obstacles, waypoints: edge.waypoints },
    );
    return [{ edge, geom }];
  });
  const cardBounds = bounds(obstacles);
  let left = cardBounds.x;
  let top = cardBounds.y;
  let right = left + cardBounds.w;
  let bottom = top + cardBounds.h;
  for (const { geom } of wires) {
    for (const leg of geom.legs) {
      for (const { x, y } of leg) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const pad = 44;

  return (
    <svg
      className="mini-graph"
      viewBox={`${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {(["reference", "continuation"] as const).map((kind) =>
        wires.filter(({ edge }) => edge.kind === kind).map(({ edge, geom }) => (
          <path
            key={edge.id}
            className={kind === "reference" ? "mg-ref" : `mg-flow ${edge.trigger === "confirm" ? "mg-confirm" : ""}`}
            vectorEffect="non-scaling-stroke"
            d={geom.path}
          />
        )),
      )}
      {shown.map((n) => {
        const { box: b } = boxes.get(n.id)!;
        const { x, y } = b;
        const st = snapshot ? nodeStatusOf(snapshot, n.id) : "draft";
        const mgState =
          n.kind !== "agent"
            ? "other"
            : (n.participation as string) === "bypassed" || st === "bypassed"
              ? "bypassed"
              : st === "completed" || st === "done"
                ? "done"
                : st === "running"
                  ? "running"
                  : st === "waiting" || st === "input" || st === "paused"
                    ? "waiting"
                    : "agent";
        return (
          <g key={n.id}>
            <rect
              className={`mg-node mg-${mgState}`}
              vectorEffect="non-scaling-stroke"
              x={x}
              y={y}
              width={b.w}
              height={b.h}
              rx={20}
            />
            <circle
              className={`mg-dot mg-${mgState}`}
              cx={x + 30}
              cy={y + 30}
              r={n.kind === "agent" ? 13 : 9}
            />
            <rect
              className="mg-bar"
              x={x + 54}
              y={y + 22}
              width={b.w * 0.5}
              height={16}
              rx={8}
            />
            {b.h > 150 && (
              <>
                <rect
                  className="mg-bar"
                  x={x + 24}
                  y={y + 74}
                  width={b.w - 48}
                  height={12}
                  rx={6}
                />
                <rect
                  className="mg-bar"
                  x={x + 24}
                  y={y + 100}
                  width={(b.w - 48) * 0.7}
                  height={12}
                  rx={6}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
