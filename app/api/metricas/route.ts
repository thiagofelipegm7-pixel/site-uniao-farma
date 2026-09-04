import { NextResponse } from "next/server";

type DayBucket = {
  total: number;
  units: Record<string, number>;
  intents: Record<string, number>;
  sources: Record<string, number>;
};

type MetricsStore = {
  days: Record<string, DayBucket>;
};

const globalStore = globalThis as typeof globalThis & { __ufMetrics?: MetricsStore };

function store(): MetricsStore {
  if (!globalStore.__ufMetrics) globalStore.__ufMetrics = { days: {} };
  return globalStore.__ufMetrics;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

export async function GET() {
  const data = store();
  return NextResponse.json({
    today: todayKey(),
    days: data.days,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    unit?: string;
    intent?: string;
    source?: string;
  };

  const day = todayKey();
  const data = store();
  if (!data.days[day]) data.days[day] = { total: 0, units: {}, intents: {}, sources: {} };

  data.days[day].total += 1;
  if (body.unit) bump(data.days[day].units, body.unit);
  if (body.intent) bump(data.days[day].intents, body.intent);
  if (body.source) bump(data.days[day].sources, body.source);

  return NextResponse.json({ ok: true, today: data.days[day] });
}
