import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { FlowNode, FlowspaceSnapshot } from "../types.ts";
import type { Box } from "./geometry.ts";
import { nodeStatusOf } from "./SurfaceViews.tsx";

interface MiniMapProps {
  boxes: { n: FlowNode; b: Box }[];
  snapshot: FlowspaceSnapshot | null;
  x: number; y: number; scale: number; offsetX: number; offsetY: number;
  width: number; height: number; theme: string;
}

export const MiniMapNodes = memo(function MiniMapNodes(props: MiniMapProps & { raster: boolean }) {
  if (props.raster) return <RasterMiniMap {...props} />;
  const { boxes, snapshot, x, y, scale, offsetX, offsetY } = props;
  return <>{boxes.map(({ n, b }) =>
    <rect key={n.id} className={`mini-node mini-${n.kind === "agent" ? nodeStatusOf(snapshot, n.id) : n.kind}`}
      x={(b.x - x) * scale + offsetX} y={(b.y - y) * scale + offsetY}
      width={Math.max(2, b.w * scale)} height={Math.max(2, b.h * scale)} rx={1.8} />,
  )}</>;
});

function RasterMiniMap({ boxes, snapshot, x, y, scale, offsetX, offsetY, width, height, theme }: MiniMapProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const palette = useRef<SVGDefsElement>(null);
  const nodes = useMemo(() => boxes.map(({ n, b }) => ({
    box: b, kind: n.kind === "agent" ? nodeStatusOf(snapshot, n.id) : n.kind,
  })), [boxes, snapshot]);
  // Palette geometry is in <defs>. The visible projection is one bitmap, so moving
  // the live SVG camera rectangle never invalidates hundreds of sibling markers.
  const kinds = [...new Set(nodes.map(node => node.kind))].sort().join(" ");
  const paints = useRef(new Map<string, { color: string; alpha: number; radius: number }>());
  useLayoutEffect(() => {
    const colors = paints.current;
    colors.clear();
    for (const swatch of Array.from(palette.current!.children)) {
      const style = getComputedStyle(swatch);
      colors.set(swatch.getAttribute("data-kind")!, {
        color: style.fill, alpha: Number(style.opacity), radius: parseFloat(style.rx),
      });
    }
  }, [kinds, theme]);
  useLayoutEffect(() => {
    const image = canvas.current!;
    const dpr = window.devicePixelRatio;
    const w = Math.ceil(width * dpr), h = Math.ceil(height * dpr);
    if (image.width !== w) image.width = w;
    if (image.height !== h) image.height = h;
    const ctx = image.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(w / width, 0, 0, h / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const { box, kind } of nodes) {
      const { color, alpha, radius } = paints.current.get(kind)!;
      const nodeWidth = Math.max(2, box.w * scale), nodeHeight = Math.max(2, box.h * scale);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.roundRect((box.x - x) * scale + offsetX, (box.y - y) * scale + offsetY, nodeWidth, nodeHeight,
        { x: Math.min(radius, nodeWidth / 2), y: Math.min(radius, nodeHeight / 2) });
      ctx.fill();
    }
  }, [nodes, x, y, scale, offsetX, offsetY, width, height, theme]);
  return <>
    <defs ref={palette}>{kinds.split(" ").filter(Boolean).map(kind =>
      <rect key={kind} data-kind={kind} className={`mini-node mini-${kind}`} rx={1.8} />,
    )}</defs>
    <foreignObject width={width} height={height} pointerEvents="none">
      <canvas ref={canvas} style={{ display: "block", width, height }} />
    </foreignObject>
  </>;
}
