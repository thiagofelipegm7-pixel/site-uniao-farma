export const WHATSAPP_MESSAGES = {
  product:
    "Oi, Uni\u00e3o Farma {unidade}! Quero consultar um produto. Pode ver se tem a\u00ed agora?",
  recipe:
    "Oi, Uni\u00e3o Farma {unidade}! Vou mandar a foto da receita ou o Memed. O farmac\u00eautico pode conferir?",
  delivery:
    "Oi, Uni\u00e3o Farma {unidade}! Voc\u00eas entregam no meu bairro? Posso passar o endere\u00e7o.",
  offer:
    "Oi, Uni\u00e3o Farma {unidade}! Vi as ofertas no site. Quero confirmar se tem e o pre\u00e7o de hoje.",
} as const;

export type WhatsAppIntentKey = keyof typeof WHATSAPP_MESSAGES;

export function fillUnitPlaceholder(message: string, unitName: string): string {
  return message.replaceAll("{unidade}", unitName);
}

export function resolveWhatsAppIntent(intent: string): WhatsAppIntentKey {
  const value = intent.toLowerCase();
  if (value.includes("entrega") || value.includes("delivery")) return "delivery";
  if (value.includes("receita") || value.includes("recipe")) return "recipe";
  if (value.includes("oferta") || value.includes("offer") || value.includes("encarte")) return "offer";
  if (value in WHATSAPP_MESSAGES) return value as WhatsAppIntentKey;
  return "product";
}
