export const SITE_URL = "https://xn--uniofarmasabar-8gbu.com.br";
export const INSTAGRAM_URL = "https://www.instagram.com/droguniaofarma/";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type DailyHours =
  | {
      open: string;
      close: string;
    }
  | null;

export type Unit = {
  id: "fatima" | "nacoes" | "itacolomi";
  slug: string;
  shortName: string;
  title: string;
  neighborhood: string;
  address: string;
  phone: string;
  phoneLink: string;
  whatsapp: string;
  whatsappDigits: string;
  map: string;
  mapEmbed: string;
  schedule: Record<Weekday, DailyHours>;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
};

const mondayToFriday = {
  open: "07:00",
  close: "21:00",
} as const;

export const UNITS: Unit[] = [
  {
    id: "fatima",
    slug: "nossa-senhora-de-fatima",
    shortName: "Nossa Senhora de Fátima",
    title: "União Farma — Nossa Senhora de Fátima",
    neighborhood: "Nossa Senhora de Fátima",
    address: "Rua Cláudio, 902 — Nossa Senhora de Fátima, Sabará/MG",
    phone: "(31) 3673-2122",
    phoneLink: "tel:+553136732122",
    whatsapp: "(31) 98738-1786",
    whatsappDigits: "5531987381786",
    map: "https://maps.app.goo.gl/XeHATeSiSfqLQ7w37",
    mapEmbed:
      "https://maps.google.com/maps?q=-19.8650470,-43.8621090&t=&z=17&ie=UTF8&iwloc=&output=embed",
    coordinates: {
      latitude: -19.865047,
      longitude: -43.862109,
    },
    schedule: {
      sun: { open: "07:00", close: "12:00" },
      mon: mondayToFriday,
      tue: mondayToFriday,
      wed: mondayToFriday,
      thu: mondayToFriday,
      fri: mondayToFriday,
      sat: { open: "07:00", close: "20:00" },
    },
  },
  {
    id: "nacoes",
    slug: "nacoes-unidas",
    shortName: "Nações Unidas",
    title: "União Farma — Nações Unidas",
    neighborhood: "Nações Unidas",
    address: "Rua Inglaterra, 162 — Nações Unidas, Sabará/MG",
    phone: "(31) 3671-8506",
    phoneLink: "tel:+553136718506",
    whatsapp: "(31) 98762-9909",
    whatsappDigits: "5531987629909",
    map: "https://maps.app.goo.gl/V3S7ZFeZKwRQ2sm47",
    mapEmbed:
      "https://maps.google.com/maps?q=Rua+Inglaterra,162,Nacoes+Unidas,Sabara,MG&t=&z=17&ie=UTF8&iwloc=&output=embed",
    coordinates: {
      latitude: -19.879422,
      longitude: -43.866889,
    },
    schedule: {
      sun: { open: "07:00", close: "12:00" },
      mon: mondayToFriday,
      tue: mondayToFriday,
      wed: mondayToFriday,
      thu: mondayToFriday,
      fri: mondayToFriday,
      sat: { open: "07:00", close: "21:00" },
    },
  },
  {
    id: "itacolomi",
    slug: "itacolomi",
    shortName: "Itacolomi",
    title: "União Farma — Itacolomi",
    neighborhood: "Itacolomi",
    address: "Rua Joaquim Ferreira Moreira, 489 — Itacolomi, Sabará/MG",
    phone: "(31) 3673-3155",
    phoneLink: "tel:+553136733155",
    whatsapp: "(31) 99493-6960",
    whatsappDigits: "5531994936960",
    map: "https://www.google.com/maps/search/?api=1&query=Rua+Joaquim+Ferreira+Moreira+489+Itacolomi+Sabara+MG",
    mapEmbed:
      "https://maps.google.com/maps?q=Rua+Joaquim+Ferreira+Moreira+489+Sabará+MG&t=&z=16&ie=UTF8&iwloc=&output=embed",
    // DECISÃO PENDENTE: confirmar latitude e longitude antes de adicionar ao Schema.org.
    schedule: {
      sun: { open: "07:00", close: "12:00" },
      mon: mondayToFriday,
      tue: mondayToFriday,
      wed: mondayToFriday,
      thu: mondayToFriday,
      fri: mondayToFriday,
      sat: { open: "07:00", close: "20:00" },
    },
  },
];

export const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Drogaria+e+Perfumaria+Uni%C3%A3o+Farma/@-19.8794223,-43.8668895,17z/data=!4m8!3m7!1s0xa69c9e248f1981:0xee9db0cbc26a5edc!8m2!3d-19.8794223!4d-43.8668895!9m1!1b1!16s%2Fg%2F11h7d3ybd9";

export const SITE_OPTIONS = {
  responseMessage:
    "Atendimento durante o horário de funcionamento. O tempo de resposta pode variar conforme a fila.",
  promoToast: {
    // Faixa demonstrativa. Troque o texto quando houver uma campanha oficial com regras definidas.
    enabled: false,
    text: "Consulte a disponibilidade de entrega diretamente com a unidade escolhida.",
  },
  delivery: {
    // Informações seguras enquanto bairros, taxas e horários não forem confirmados.
    coverageText:
      "A disponibilidade, a área atendida, a taxa e o prazo são confirmados diretamente pela unidade escolhida.",
    paymentText:
      "Consulte as formas de pagamento disponíveis para a entrega no momento do pedido.",
  },
  offers: {
    // DECISÃO PENDENTE: mantenha false até ter produtos, preços, validade e unidades participantes.
    enabled: false,
  },
  team: {
    // DECISÃO PENDENTE: habilite após receber fotos, nomes e cargos autorizados.
    enabled: false,
  },
} as const;

export type WhatsAppTracking = {
  campaign?: string;
  content?: string;
};

export function buildWhatsAppUrl(
  unit: Unit,
  message: string,
  tracking: WhatsAppTracking = {},
): string {
  const params = new URLSearchParams({
    text: message,
    utm_source: "site",
    utm_medium: "whatsapp",
    utm_campaign: tracking.campaign ?? "seo_local",
    utm_content: tracking.content ?? `unit_${unit.id}`,
  });

  return `https://wa.me/${unit.whatsappDigits}?${params.toString()}`;
}

export function getUnitBySlug(slug: string): Unit | undefined {
  return UNITS.find((unit) => unit.slug === slug);
}
