import type { GeoPoint } from "./geo";
import type { Unit } from "./site-config";

let worker: Worker | null = null;
let warming = false;

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker("/inp-worker.js");
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

export function warmInpWorker() {
  if (warming || worker) return;
  warming = true;
  const start = () => {
    getWorker();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 2500 });
    return;
  }
  globalThis.setTimeout(start, 1000);
}

if (typeof window !== "undefined") {
  warmInpWorker();
}

export function rankUnitsInWorker(
  origin: GeoPoint,
  units: Unit[],
): Promise<Array<{ id: Unit["id"]; distanceKm: number }>> {
  const instance = getWorker();
  if (!instance) return Promise.resolve([]);

  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "rank" || event.data.requestId !== requestId) return;
      instance.removeEventListener("message", onMessage);
      resolve(event.data.ranked || []);
    };

    instance.addEventListener("message", onMessage);
    instance.postMessage({
      type: "rank",
      requestId,
      origin,
      units: units.map((unit) => ({ id: unit.id, coordinates: unit.coordinates })),
    });

    window.setTimeout(() => {
      instance.removeEventListener("message", onMessage);
      resolve([]);
    }, 600);
  });
}

export function postMetricInWorker(payload: Record<string, unknown>) {
  const instance = getWorker();
  if (!instance) return false;
  instance.postMessage({ type: "metric", payload });
  return true;
}
