export const WHATSAPP_MESSAGES = {
  product:
    "Oi, Uni\u00e3o Farma {unidade}! Quero consultar um produto. Pode ver se tem aí agora?",
  recipe:
    "Oi, Uni\u00e3o Farma {unidade}! Vou mandar a foto da receita ou o Memed. O farmacêutico pode conferir?",
  delivery:
    "Oi, Uni\u00e3o Farma {unidade}! Vocês entregam no meu bairro? Posso passar o endereço.",
} as const;

export type WhatsAppIntentKey = keyof typeof WHATSAPP_MESSAGES;
