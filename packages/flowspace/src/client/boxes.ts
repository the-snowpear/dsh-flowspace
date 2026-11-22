/** World-space rectangle operations shared by the renderer and routing worker. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  compact?: boolean;
}

export function bounds(boxes: Box[]): Box {
  if (!boxes.length) return { x: 0, y: 0, w: 1000, h: 600 };
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity;
  for (const box of boxes) {
    x = Math.min(x, box.x);
    y = Math.min(y, box.y);
    right = Math.max(right, box.x + box.w);
    bottom = Math.max(bottom, box.y + box.h);
  }
  return { x, y, w: right - x, h: bottom - y };
}

export function padded(box: Box, pad: number): Box {
  return { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
}

export function intersects(a: Box, b: Box): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

export function encloses(outer: Box, inner: Box): boolean {
  return outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h;
}
