import { useCallback, useEffect, useState } from "react";
import type { TeamModelRoute } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";

const routeCache = new WeakMap<CanvasBridge, Promise<TeamModelRoute[]>>();

function fetchRoutes(bridge: CanvasBridge, force = false): Promise<TeamModelRoute[]> {
  if (!force) {
    const cached = routeCache.get(bridge);
    if (cached) return cached;
  }
  const req = bridge.listModelRoutes().catch((error: unknown) => {
    if (routeCache.get(bridge) === req) routeCache.delete(bridge);
    throw error;
  });
  routeCache.set(bridge, req);
  return req;
}

export function invalidateModelRoutes(bridge: CanvasBridge): void {
  routeCache.delete(bridge);
}

/** Per-bridge cached model catalog state shared by TeamCanvas, ConfigForm, TeamAssetEditor, and WorkflowImportDialog. */
export function useModelRoutesState(bridge: CanvasBridge | undefined, active = true) {
  const [routes, setRoutes] = useState<TeamModelRoute[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    (force = false) => {
      if (!bridge || !active) return;
      let live = true;
      setError("");
      fetchRoutes(bridge, force).then(
        (list) => {
          if (!live) return;
          setRoutes(list);
          setLoaded(true);
        },
        (failure: unknown) => {
          if (!live) return;
          setError(failure instanceof Error ? failure.message : String(failure));
          setLoaded(true);
        },
      );
      return () => {
        live = false;
      };
    },
    [bridge, active],
  );

  useEffect(() => load(false), [load]);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  return { routes, loaded, error, refresh };
}

export function useModelRoutes(bridge: CanvasBridge, active = true): TeamModelRoute[] {
  return useModelRoutesState(bridge, active).routes;
}
