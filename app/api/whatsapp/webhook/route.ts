import { NextResponse } from "next/server";
import {
  recordInboundMessage,
} from "../../../metrics-store";
import {
  extractInboundMessages,
  verifyWhatsAppSignature,
} from "../../../whatsapp-cloud";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!expected) {
    return new NextResponse("Webhook n\u00e3o configurado", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    return NextResponse.json(
      { ok: false, error: "missing_app_secret" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const valid = await verifyWhatsAppSignature(rawBody, signature, appSecret);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const inbound = extractInboundMessages(payload);
  let accepted = 0;

  for (const message of inbound) {
    if (await recordInboundMessage(message)) accepted += 1;
  }

  return NextResponse.json({ ok: true, accepted }, { headers: { "Cache-Control": "no-store" } });
}
