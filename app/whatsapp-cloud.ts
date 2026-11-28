import { SITE_URL, UNITS, type Unit } from "./site-config";

const GRAPH_VERSION = "v25.0";

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
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<{
    id?: string;
    type?: string;
    from?: string;
    timestamp?: string;
    text?: { body?: string };
    button?: { text?: string };
    interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  }>;
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

function* inboundValues(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const root = payload as {
    object?: string;
    entry?: Array<{ changes?: Array<{ field?: string; value?: WhatsAppChangeValue }> }>;
  };
  if (root.object && root.object !== "whatsapp_business_account") return;
  for (const entry of Array.isArray(root.entry) ? root.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (!change) continue;
      if (change.field && change.field !== "messages") continue;
      const value = change.value;
      if (!Array.isArray(value?.messages)) continue;
      const unitId = resolveUnitFromWhatsApp({
        displayPhone: value.metadata?.display_phone_number,
        phoneNumberId: value.metadata?.phone_number_id,
      });
      for (const message of value.messages) {
        if (typeof message?.id !== "string" || !message.id) continue;
        yield { message, unitId, value };
      }
    }
  }
}

export function extractInboundMessages(payload: unknown): InboundWhatsAppMessage[] {
  return Array.from(inboundValues(payload), ({ message, unitId, value }) => ({
    id: message.id!,
    type: message.type || "unknown",
    unitId,
    phoneNumberId: value.metadata?.phone_number_id,
  }));
}

export type EntradaCrmWhatsApp = {
  id: string;
  unidade: Unit["id"];
  canal: string;
  telefone: string;
  nome: string;
  texto: string;
  criadaEm: string;
};

const TIPOS_MIDIA: Record<string, string> = {
  audio: "Áudio",
  document: "Documento",
  image: "Imagem",
  location: "Localização",
  contacts: "Contato",
  sticker: "Figurinha",
  video: "Vídeo",
};

export function extrairEntradasCrm(payload: unknown, agora = Date.now()): EntradaCrmWhatsApp[] {
  const entradas: EntradaCrmWhatsApp[] = [];
  for (const { message, unitId, value } of inboundValues(payload)) {
    const canal = value.metadata?.phone_number_id;
    const telefone = message.from;
    if (unitId === "unknown" || !canal || !/^\d{5,24}$/.test(canal) ||
        !telefone || !/^\d{8,15}$/.test(telefone) || message.type === "reaction") continue;
    const timestamp = Number(message.timestamp) * 1000;
    if (!Number.isFinite(timestamp) || timestamp <= 0) continue;
    const contato = Array.isArray(value.contacts) ? value.contacts.find((item) => item?.wa_id === telefone) : undefined;
    const nome = typeof contato?.profile?.name === "string" ? contato.profile.name.trim().slice(0, 120) : "";
    const texto = message.text?.body || message.button?.text ||
      message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;
    entradas.push({
      id: message.id!,
      unidade: unitId,
      canal,
      telefone,
      nome,
      texto: typeof texto === "string" && texto.trim()
        ? texto.slice(0, 4096)
        : `[${TIPOS_MIDIA[message.type ?? ""] || "Mensagem sem texto"}]`,
      criadaEm: new Date(Math.min(timestamp, agora)).toISOString(),
    });
  }
  return entradas;
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
    signal: AbortSignal.timeout(15_000),
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
