import { postMetricInWorker } from "./inp-worker-client";

export type MetricHit = {
  unit?: string;
  intent?: string;
  source?: string;
};

export function recordMetric(hit: MetricHit) {
  if (typeof window === "undefined") return;

  const payload = {
    ...hit,
    path: window.location.pathname,
    at: new Date().toISOString(),
  };

  if (postMetricInWorker(payload)) return;

  try {
    navigator.sendBeacon?.("/api/metricas", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  } catch {
    void fetch("/api/metricas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  }
}
