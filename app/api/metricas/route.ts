import { NextResponse } from "next/server";
import { getMetricsSnapshot, recordMetricHit } from "../../metrics-store";
import { webhookConfigStatus } from "../../whatsapp-cloud";

export async function GET() {
  const data = getMetricsSnapshot();
  return NextResponse.json({
    today: data.today,
    days: data.days,
    webhook: {
      ...webhookConfigStatus(),
      callbackPath: "/api/whatsapp/webhook",
      recent: data.webhookEvents,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    unit?: string;
    intent?: string;
    source?: string;
    stage?: string;
  };

  const today = recordMetricHit(body);
  return NextResponse.json({ ok: true, today });
}
