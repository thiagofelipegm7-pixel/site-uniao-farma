"use client";

import { useCallback, useEffect, useRef } from "react";
import { rankUnitsInWorker, postMetricInWorker } from "./inp-worker-client";
import type { GeoPoint } from "./geo";
import type { Unit } from "./site-config";

/**
 * React does not run inside a Worker.
 * The hook only sends plain data out and brings plain data back.
 */
export function useInpWorker() {
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const rankUnits = useCallback(async (origin: GeoPoint, units: Unit[]) => {
    const ranked = await rankUnitsInWorker(origin, units);
    return alive.current ? ranked : [];
  }, []);

  const postMetric = useCallback((payload: Record<string, unknown>) => {
    if (!alive.current) return false;
    return postMetricInWorker(payload);
  }, []);

  return {
    supported: typeof window !== "undefined" && typeof Worker !== "undefined",
    rankUnits,
    postMetric,
  };
}
