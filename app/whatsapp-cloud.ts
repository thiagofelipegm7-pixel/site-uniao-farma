import { SITE_URL, UNITS, type Unit } from "./site-config";

const GRAPH_VERSION = "v21.0";

export type InboundWhatsAppMessage = {
  id: string;
  type: string;
  unitId: Unit["id"] | "unknown";
  phoneNumberId?: string;
};

type WhatsAppChangeValue = {
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  messages?: Array<{ id?: string; type?: string; from?: string }>;
  statuses?: Array<{ id?: string; status?: string }>;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function envPhoneId(unitId: Unit["id"]) {
  if (unitId === "fatima") return process.env.WHATSAPP_PHONE_ID_FATIMA?.trim();
  if (unitId === "nacoes") return process.env.WHATSAPP_PHONE_ID_NACOES?.trim();
  return process.env.WHATSAPP_PHONE_ID_ITACOLOMI?.trim();
}

export function resolveUnitFromWhatsApp(meta: {
  displayPhone?: string;
  phoneNumberId?: string;
}): Unit["id"] | "unknown" {
  const phoneId = meta.phoneNumberId?.trim();
  if (phoneId) {
    const byEnv = UNITS.find((unit) => envPhoneId(unit.id) === phoneId);
    if (byEnv) return byEnv.id;
  }

  const incoming = digitsOnly(meta.displayPhone || "");
  if (incoming) {
    const byDigits = UNITS.find((unit) => digitsOnly(unit.whatsappDigits) === incoming || digitsOnly(unit.whatsappDigits).endsWith(incoming));
    if (byDigits) return byDigits.id;
  }

  return "unknown";
}

export function extractInboundMessages(payload: unknown): InboundWhatsAppMessage[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as {
    object?: string;
    entry?: Array<{ changes?: Array<{ field?: string; value?: WhatsAppChangeValue }> }>;
  };
  if (root.object && root.object !== "whatsapp_business_account") return [];

  const found: InboundWhatsAppMessage[] = [];
  for (const entry of root.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field && change.field !== "messages") continue;
      const value = change.value || {};
      const unitId = resolveUnitFromWhatsApp({
        displayPhone: value.metadata?.display_phone_number,
        phoneNumberId: value.metadata?.phone_number_id,
      });
      for (const message of value.messages || []) {
        if (!message.id) continue;
        found.push({
          id: message.id,
          type: message.type || "unknown",
          unitId,
          phoneNumberId: value.metadata?.phone_number_id,
        });
      }
    }
  }
  return found;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length).toLowerCase();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return timingSafeEqual(toHex(digest), expected);
}

export async function sendWhatsAppText(phoneNumberId: string, to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!token || !phoneNumberId || !to || !body) return { ok: false as const, error: "missing_config" };

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: false, body },
    }),
  });

  if (!response.ok) {
    return { ok: false as const, error: `graph_${response.status}` };
  }
  return { ok: true as const };
}

export function webhookConfigStatus() {
  return {
    verifyTokenReady: Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim()),
    appSecretReady: Boolean(process.env.WHATSAPP_APP_SECRET?.trim()),
    accessTokenReady: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    callbackPath: "/api/whatsapp/webhook",
    callbackUrl: `${SITE_URL}/api/whatsapp/webhook`,
    phoneIds: {
      fatima: Boolean(process.env.WHATSAPP_PHONE_ID_FATIMA?.trim()),
      nacoes: Boolean(process.env.WHATSAPP_PHONE_ID_NACOES?.trim()),
      itacolomi: Boolean(process.env.WHATSAPP_PHONE_ID_ITACOLOMI?.trim()),
    },
  };
}
