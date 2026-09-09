import { env } from "cloudflare:workers";

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

type LastTouch = { source: string; at: number };

type MetricsStore = {
  days: Record<string, DayBucket>;
  seenMessageIds: string[];
  webhookEvents: WebhookEventLog[];
  lastTouch: Record<string, LastTouch>;
};

const ATTRIBUTION_MS = 6 * 60 * 60 * 1000;

const globalStore = globalThis as typeof globalThis & { __ufMetrics?: MetricsStore };

type D1Result = {
  meta?: { changes?: number };
  results?: unknown[];
};

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<D1Result>;
  all(): Promise<D1Result>;
};

type MetricsDb = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
};

function database(): MetricsDb | undefined {
  try {
    return (env as { DB?: MetricsDb }).DB;
  } catch {
    return undefined;
  }
}

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
    globalStore.__ufMetrics = { days: {}, seenMessageIds: [], webhookEvents: [], lastTouch: {} };
  }
  if (!globalStore.__ufMetrics.lastTouch) globalStore.__ufMetrics.lastTouch = {};
  return globalStore.__ufMetrics;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

function bumpBy(map: Record<string, number>, key: string, amount: number) {
  map[key] = (map[key] || 0) + amount;
}

function rememberClick(unit: string | undefined, source: string | undefined) {
  if (!source) return;
  const key = unit || "*";
  store().lastTouch[key] = { source, at: Date.now() };
}

function memoryTouch(unit?: string) {
  const data = store().lastTouch;
  const hit = (unit && data[unit]) || data["*"];
  if (!hit) return "";
  if (Date.now() - hit.at > ATTRIBUTION_MS) return "";
  return hit.source;
}

async function lastClickSource(unit?: string) {
  const fromMemory = memoryTouch(unit);
  const db = database();
  if (!db) return fromMemory;

  const since = new Date(Date.now() - ATTRIBUTION_MS).toISOString();
  const result = unit
    ? await db
        .prepare(
          "SELECT source FROM metric_hits WHERE stage = 'whatsapp_click' AND unit = ? AND source IS NOT NULL AND created_at >= ? ORDER BY created_at DESC LIMIT 1",
        )
        .bind(unit, since)
        .all()
    : await db
        .prepare(
          "SELECT source FROM metric_hits WHERE stage = 'whatsapp_click' AND source IS NOT NULL AND created_at >= ? ORDER BY created_at DESC LIMIT 1",
        )
        .bind(since)
        .all();
  const source = String((result.results?.[0] as { source?: string } | undefined)?.source || "");
  return source || fromMemory;
}

function isClosingSource(source?: string) {
  const value = (source || "").toLowerCase();
  return !value || value.includes("webhook") || value.includes("staff");
}

export function normalizeStage(value: unknown): MetricStage {
  if (value === "conversation_received" || value === "order_completed") return value;
  return "whatsapp_click";
}

export async function recordMetricHit(hit: {
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
  let source = hit.source || "";
  if (stage === "whatsapp_click") {
    rememberClick(hit.unit, source);
  } else if (isClosingSource(source)) {
    source = (await lastClickSource(hit.unit)) || source || "other";
  }

  data.days[day].stages[stage] += 1;

  if (stage === "whatsapp_click") {
    data.days[day].total += 1;
    if (hit.unit) bump(data.days[day].units, hit.unit);
    if (hit.intent) bump(data.days[day].intents, hit.intent);
    if (source) bump(data.days[day].sources, source);
  } else {
    if (hit.unit) bump(data.days[day].units, `${stage}:${hit.unit}`);
    if (source) bump(data.days[day].sources, `${stage}:${source}`);
  }

  const db = database();
  if (db) {
    await db
      .prepare(
        "INSERT INTO metric_hits (day, stage, unit, intent, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(day, stage, hit.unit || null, hit.intent || null, source || null, new Date().toISOString())
      .run();
  }

  return data.days[day];
}

export async function rememberWebhookEvent(event: WebhookEventLog) {
  const data = store();
  data.webhookEvents.unshift(event);
  data.webhookEvents = data.webhookEvents.slice(0, 40);

  const db = database();
  if (db) {
    await db
      .prepare("INSERT INTO webhook_events (at, unit, type, source) VALUES (?, ?, ?, ?)")
      .bind(event.at, event.unit, event.type, event.source)
      .run();
  }
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

export async function recordInboundMessage(message: {
  id: string;
  type: string;
  unitId: string;
}) {
  const at = new Date().toISOString();
  const day = todayKey();
  const attributed = (await lastClickSource(message.unitId)) || "whatsapp_webhook";
  const db = database();

  if (db) {
    const result = await db.batch([
      db.prepare("INSERT OR IGNORE INTO webhook_messages (wamid, received_at) VALUES (?, ?)").bind(message.id, at),
      db
        .prepare(
          "INSERT INTO metric_hits (day, stage, unit, intent, source, created_at) SELECT ?, 'conversation_received', ?, ?, ?, ? WHERE changes() = 1",
        )
        .bind(day, message.unitId, message.type, attributed, at),
      db
        .prepare(
          "INSERT INTO webhook_events (at, unit, type, source) SELECT ?, ?, ?, 'whatsapp_webhook' WHERE changes() = 1",
        )
        .bind(at, message.unitId, message.type),
    ]);
    const claimed = Number(result[0]?.meta?.changes || 0) > 0;
    if (claimed) {
      const data = store();
      const bucket = data.days[day] || emptyBucket();
      data.days[day] = bucket;
      bucket.stages.conversation_received += 1;
      bump(bucket.units, `conversation_received:${message.unitId}`);
      bump(bucket.sources, `conversation_received:${attributed}`);
      data.webhookEvents.unshift({ at, unit: message.unitId, type: message.type, source: "whatsapp_webhook" });
      data.webhookEvents = data.webhookEvents.slice(0, 40);
    }
    return claimed;
  }

  if (hasSeenMessageId(message.id)) return false;
  markMessageId(message.id);
  await recordMetricHit({
    stage: "conversation_received",
    unit: message.unitId,
    intent: message.type,
    source: attributed,
  });
  await rememberWebhookEvent({ at, unit: message.unitId, type: message.type, source: "whatsapp_webhook" });
  return true;
}

export async function getMetricsSnapshot() {
  const data = store();
  const db = database();
  if (db) {
    const [hits, events] = await Promise.all([
      db
        .prepare(
          "SELECT day, stage, unit, intent, source, COUNT(*) AS count FROM metric_hits GROUP BY day, stage, unit, intent, source",
        )
        .all(),
      db.prepare("SELECT at, unit, type, source FROM webhook_events ORDER BY id DESC LIMIT 40").all(),
    ]);
    const days: Record<string, DayBucket> = {};
    for (const row of hits.results as Array<Record<string, unknown>>) {
      const day = String(row.day);
      const bucket = days[day] || emptyBucket();
      days[day] = bucket;
      const stage = normalizeStage(row.stage);
      const count = Number(row.count || 0);
      bucket.stages[stage] += count;
      if (stage === "whatsapp_click") bucket.total += count;
      if (row.unit) bumpBy(bucket.units, stage === "whatsapp_click" ? String(row.unit) : `${stage}:${row.unit}`, count);
      if (row.intent) bumpBy(bucket.intents, String(row.intent), count);
      if (row.source) bumpBy(bucket.sources, stage === "whatsapp_click" ? String(row.source) : `${stage}:${row.source}`, count);
    }
    return { today: todayKey(), days, webhookEvents: (events.results || []) as WebhookEventLog[] };
  }
  return {
    today: todayKey(),
    days: data.days,
    webhookEvents: data.webhookEvents,
  };
}
