import { createContext, useContext, useLayoutEffect } from "react";
import type { createStaticResolver } from "../../core/nodes/data/preview.ts";
import type { DataPreview } from "../../types.ts";

export interface CanvasPreviewApi {
  resolver: ReturnType<typeof createStaticResolver>;
  keyOf: (id: string) => string;
  request: (id: string, key: string, explicit: boolean) => void;
  heights: Map<string, number>;
  size: (id: string, height: number) => void;
  reply: (id: string, key: string) => DataPreview | undefined;
  pending: (id: string, key: string) => boolean;
}

export const CanvasPreviewContext = createContext<CanvasPreviewApi | null>(null);

export function useFlowBodyHeight(id: string, height: number) {
  const resize = useContext(CanvasPreviewContext)?.size;
  useLayoutEffect(() => {
    resize?.(id, height);
  }, [id, height, resize]);
}
