import { encloses, type Box } from "../boxes.ts";

const MAX_SIZE = 2560;
const CACHE_SLOTS = 4;

export interface WireImage {
  canvas: OffscreenCanvas;
  source: object;
  theme: string;
  dpr: number;
  area: Box;
  density: number;
  zoom: number;
  width: number;
  height: number;
}

/** Each surface stays allocated until its LRU slot is reused or the stage is disposed. */
export class WireImageCache {
  private images: WireImage[] = [];

  get(source: object, theme: string, area: Box, zoom: number, dpr: number,
    paint: (context: OffscreenCanvasRenderingContext2D, region: Box, zoom: number) => void): WireImage {
    const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    const safeDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
    const padX = Math.max(64, Math.min(384, (MAX_SIZE / safeDpr - area.w * safeZoom) / 2)) / safeZoom;
    const padY = Math.max(64, Math.min(384, (MAX_SIZE / safeDpr - area.h * safeZoom) / 2)) / safeZoom;
    const region = { x: area.x - padX, y: area.y - padY, w: Math.max(1, area.w + padX * 2), h: Math.max(1, area.h + padY * 2) };
    const density = Math.min(safeZoom * safeDpr, MAX_SIZE / region.w, MAX_SIZE / region.h);
    const index = this.images.findIndex(image => image.source === source && image.theme === theme &&
      image.dpr === safeDpr && (image.zoom < 0.5) === (safeZoom < 0.5) && encloses(image.area, area) &&
      density / image.density >= 0.55 && density / image.density <= 1.8);
    if (index >= 0) {
      const [image] = this.images.splice(index, 1);
      this.images.unshift(image);
      return image;
    }
    const previous = this.images.length === CACHE_SLOTS ? this.images.pop()! : undefined;
    const canvas = previous?.canvas ?? new OffscreenCanvas(1, 1);
    const width = Math.max(1, Math.min(MAX_SIZE, Math.ceil(region.w * density)));
    const height = Math.max(1, Math.min(MAX_SIZE, Math.ceil(region.h * density)));
    if (canvas.width < width) canvas.width = width;
    if (canvas.height < height) canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.resetTransform();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(density, 0, 0, density, -region.x * density, -region.y * density);
    context.lineCap = "round";
    context.lineJoin = "round";
    paint(context, region, safeZoom);
    const image = { canvas, source, theme, dpr: safeDpr, area: region, density, zoom: safeZoom, width, height };
    this.images.unshift(image);
    return image;
  }

  dispose() {
    for (const image of this.images) image.canvas.width = image.canvas.height = 1;
    this.images = [];
  }
}
