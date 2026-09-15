import { NextResponse } from "next/server";
import { getMetricsSnapshot, recordMetricHit } from "../../metrics-store";
import { webhookConfigStatus } from "../../whatsapp-cloud";

export async function GET() {
  const data = await getMetricsSnapshot();
  return NextResponse.json(
    {
      today: data.today,
      days: data.days,
      webhook: {
        ...webhookConfigStatus(),
        callbackPath: "/api/whatsapp/webhook",
        recent: data.webhookEvents,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) {
    return NextResponse.json(
      { ok: false, error: "payload_too_large" },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    unit?: string;
    intent?: string;
    source?: string;
    stage?: string;
  };

  const today = await recordMetricHit(body);
  return NextResponse.json({ ok: true, today }, { headers: { "Cache-Control": "no-store" } });
}
