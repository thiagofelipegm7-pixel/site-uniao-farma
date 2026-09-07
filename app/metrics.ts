import { trackEvent } from "./analytics";
import { postMetricInWorker } from "./inp-worker-client";

export type MetricStage = "whatsapp_click" | "conversation_received" | "order_completed";

export type MetricHit = {
  unit?: string;
  intent?: string;
  source?: string;
  placement?: string;
  stage?: MetricStage;
};

export function recordMetric(hit: MetricHit) {
  if (typeof window === "undefined") return;

  const payload = {
    ...hit,
    stage: hit.stage ?? "whatsapp_click",
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

export function trackWhatsAppClick(hit: MetricHit) {
  recordMetric({ ...hit, stage: "whatsapp_click" });
  trackEvent("whatsapp_click", {
    unit: hit.unit,
    intent: hit.intent,
    source: hit.source,
    placement: hit.placement,
  });
}
