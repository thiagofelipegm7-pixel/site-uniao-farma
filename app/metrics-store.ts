export type MetricStage = "whatsapp_click" | "conversation_received" | "order_completed";

export type DayBucket = {
  total: number;
  stages: Record<MetricStage, number>;
  units: Record<string, number>;
  intents: Record<string, number>;
  sources: Record<string, number>;
};

export type WebhookEventLog = {
  at: string;
  unit: string;
  type: string;
  source: string;
};

type MetricsStore = {
  days: Record<string, DayBucket>;
  seenMessageIds: string[];
  webhookEvents: WebhookEventLog[];
};

const globalStore = globalThis as typeof globalThis & { __ufMetrics?: MetricsStore };

export function emptyBucket(): DayBucket {
  return {
    total: 0,
    stages: {
      whatsapp_click: 0,
      conversation_received: 0,
      order_completed: 0,
    },
    units: {},
    intents: {},
    sources: {},
  };
}

export function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function store(): MetricsStore {
  if (!globalStore.__ufMetrics) {
    globalStore.__ufMetrics = { days: {}, seenMessageIds: [], webhookEvents: [] };
  }
  return globalStore.__ufMetrics;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

export function normalizeStage(value: unknown): MetricStage {
  if (value === "conversation_received" || value === "order_completed") return value;
  return "whatsapp_click";
}

export function recordMetricHit(hit: {
  stage?: string;
  unit?: string;
  intent?: string;
  source?: string;
}) {
  const day = todayKey();
  const data = store();
  if (!data.days[day]) data.days[day] = emptyBucket();
  if (!data.days[day].stages) data.days[day].stages = emptyBucket().stages;

  const stage = normalizeStage(hit.stage);
  data.days[day].stages[stage] += 1;

  if (stage === "whatsapp_click") {
    data.days[day].total += 1;
    if (hit.unit) bump(data.days[day].units, hit.unit);
    if (hit.intent) bump(data.days[day].intents, hit.intent);
    if (hit.source) bump(data.days[day].sources, hit.source);
  } else {
    if (hit.unit) bump(data.days[day].units, `${stage}:${hit.unit}`);
    if (hit.source) bump(data.days[day].sources, `${stage}:${hit.source}`);
  }

  return data.days[day];
}

export function rememberWebhookEvent(event: WebhookEventLog) {
  const data = store();
  data.webhookEvents.unshift(event);
  data.webhookEvents = data.webhookEvents.slice(0, 40);
}

export function hasSeenMessageId(id: string) {
  return store().seenMessageIds.includes(id);
}

export function markMessageId(id: string) {
  const data = store();
  data.seenMessageIds.push(id);
  if (data.seenMessageIds.length > 400) {
    data.seenMessageIds = data.seenMessageIds.slice(-200);
  }
}

export function getMetricsSnapshot() {
  const data = store();
  return {
    today: todayKey(),
    days: data.days,
    webhookEvents: data.webhookEvents,
  };
}
