export const WHATSAPP_MESSAGES = {
  product:
    "Oi, Uni\u00e3o Farma {unidade}! Quero consultar um produto. Tem dispon\u00edvel agora?",
  recipe:
    "Oi, Uni\u00e3o Farma {unidade}! Vou enviar a foto da receita ou Memed. Pode o farmac\u00eautico conferir?",
  delivery:
    "Oi, Uni\u00e3o Farma {unidade}! Voc\u00eas entregam no meu bairro? Posso informar o endere\u00e7o.",
} as const;

export type WhatsAppIntentKey = keyof typeof WHATSAPP_MESSAGES;
