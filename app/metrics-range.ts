import { sourceToChannel, splitSourceKey, type ChannelKey } from "./metrics-channels";

export type MetricStage = "whatsapp_click" | "conversation_received" | "order_completed";
export type RangeKey = "today" | "7" | "30" | "all";

export type DayBucket = {
  total: number;
  stages?: Record<MetricStage, number>;
  units: Record<string, number>;
  sources?: Record<string, number>;
};

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Hoje",
  "7": "7 dias",
  "30": "30 dias",
  all: "Tudo",
};

export function lastDays(today: string, count: number) {
  if (!today) return [];
  const start = new Date(`${today}T12:00:00-03:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export function daysForRange(today: string, days: Record<string, DayBucket>, range: RangeKey) {
  if (range === "today") return today ? [today] : [];
  if (range === "7") return lastDays(today, 7);
  if (range === "30") return lastDays(today, 30);
  const keys = Object.keys(days).sort();
  if (!keys.length) return today ? [today] : [];
  const first = keys[0];
  const start = new Date(`${first}T12:00:00-03:00`);
  const end = new Date(`${today || keys[keys.length - 1]}T12:00:00-03:00`);
  const out: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    out.push(cursor.toISOString().slice(0, 10));
    if (out.length > 90) break;
  }
  return out;
}

export function stageValue(day: DayBucket | undefined, stage: MetricStage, channel: ChannelKey = "all") {
  if (!day) return 0;
  if (channel === "all") {
    if (day.stages?.[stage] != null) return day.stages[stage];
    return stage === "whatsapp_click" ? day.total || 0 : 0;
  }
  let total = 0;
  for (const [key, count] of Object.entries(day.sources || {})) {
    const parts = splitSourceKey(key);
    const mappedStage = parts.stage === "conversation_received" || parts.stage === "order_completed"
      ? parts.stage
      : "whatsapp_click";
    if (mappedStage !== stage) continue;
    if (sourceToChannel(parts.source) !== channel && sourceToChannel(key) !== channel) continue;
    total += count;
  }
  return total;
}

export function unitClicks(day: DayBucket | undefined, unitId: string) {
  return day?.units?.[unitId] || 0;
}

export function sumRange(
  days: Record<string, DayBucket>,
  keys: string[],
  channel: ChannelKey = "all",
) {
  const stages: Record<MetricStage, number> = {
    whatsapp_click: 0,
    conversation_received: 0,
    order_completed: 0,
  };
  const units: Record<string, number> = {};
  const channels: Record<string, number> = {};
  for (const key of keys) {
    const bucket = days[key];
    stages.whatsapp_click += stageValue(bucket, "whatsapp_click", channel);
    stages.conversation_received += stageValue(bucket, "conversation_received", channel);
    stages.order_completed += stageValue(bucket, "order_completed", channel);
    if (channel === "all") {
      for (const unitId of ["fatima", "nacoes", "itacolomi"]) {
        units[unitId] = (units[unitId] || 0) + unitClicks(bucket, unitId);
      }
    }
    for (const [sourceKey, count] of Object.entries(bucket?.sources || {})) {
      const parts = splitSourceKey(sourceKey);
      const mapped = sourceToChannel(parts.source);
      channels[mapped] = (channels[mapped] || 0) + count;
    }
  }
  return { stages, units, channels };
}
