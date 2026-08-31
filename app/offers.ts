import type { Unit } from "./site-config";

export type OfferCategory =
  | "bebe"
  | "higiene_beleza"
  | "cuidados_pessoais"
  | "perfumaria"
  | "incontinencia"
  | "protecao_solar"
  | "suplementos"
  | "medicamentos";

export type RegulatoryClass =
  | "non_regulated"
  | "supplement_review"
  | "otc_review"
  | "prescription_blocked";

export type PublicationStatus = "draft" | "review" | "approved" | "expired" | "blocked";
export type OfferAvailability = "consult" | "available" | "unavailable";
export type OfferValidityType = "date" | "while_stock_lasts";
export type OfferUnitId = Unit["id"];

const ALL_UNIT_IDS: OfferUnitId[] = ["fatima", "nacoes", "itacolomi"];

export interface Offer {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  category: OfferCategory;
  currentPrice: number | null;
  previousPrice?: number | null;
  previousPriceConfirmed?: boolean;
  image?: string;
  placeholderLabel?: string;
  imageApproved: boolean;
  priceConfirmed: boolean;
  validityConfirmed: boolean;
  description?: string;
  units: OfferUnitId[];
  validFrom?: string;
  validUntil?: string;
  validityType?: OfferValidityType;
  availability: OfferAvailability;
  regulatoryClass: RegulatoryClass;
  publicationStatus: PublicationStatus;
  promotionConfirmed: boolean;
  manualRegulatoryApproval?: boolean;
  adsEligible: boolean;
  updatedAt: string;
}

export type PublicationDecision = {
  publishable: boolean;
  reason: string;
  code:
    | "approved"
    | "status_not_approved"
    | "prescription_blocked"
    | "image_not_approved"
  | "image_missing"
  | "price_missing"
  | "price_not_confirmed"
    | "promotion_not_confirmed"
    | "units_missing"
    | "regulatory_approval_missing"
    | "expired";
};

export const OFFER_CATEGORY_LABELS: Record<OfferCategory, string> = {
  bebe: "Bebê",
  higiene_beleza: "Higiene e beleza",
  cuidados_pessoais: "Cuidados pessoais",
  perfumaria: "Perfumaria",
  incontinencia: "Incontinência",
  protecao_solar: "Proteção solar",
  suplementos: "Suplementos",
  medicamentos: "Medicamentos",
};

const REVIEW_DATE = "2026-08-16";

const createOffer = (
  offer: Pick<Offer, "id" | "slug" | "name" | "category" | "regulatoryClass" | "publicationStatus"> &
    Partial<Offer>,
): Offer => ({
  brand: undefined,
  currentPrice: null,
  previousPrice: null,
  previousPriceConfirmed: false,
  image: undefined,
  imageApproved: false,
  priceConfirmed: false,
  validityConfirmed: false,
  units: ALL_UNIT_IDS,
  availability: "consult",
  promotionConfirmed: false,
  adsEligible: false,
  updatedAt: REVIEW_DATE,
  ...offer,
});

export const OFFERS: Offer[] = [
  createOffer({
    id: "seda-creme-pentear-300ml",
    slug: "creme-seda-para-pentear-300-ml",
    name: "Creme Seda para pentear 300 ml",
    brand: "Seda",
    category: "cuidados_pessoais",
    currentPrice: 13.9,
    image: "/promotions/drafts/seda-creme-pentear-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "nivea-locao-hidratante-400ml",
    slug: "locao-hidratante-nivea-400-ml",
    name: "Loção hidratante Nivea 400 ml",
    brand: "Nivea",
    category: "cuidados_pessoais",
    currentPrice: 29,
    image: "/promotions/drafts/nivea-locao-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "seda-boom-creme-1kg",
    slug: "creme-seda-boom-1-kg",
    name: "Creme Seda Boom 1 kg",
    brand: "Seda",
    category: "higiene_beleza",
    currentPrice: 35,
    image: "/promotions/drafts/seda-boom-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "sundown-protetor-solar-200ml",
    slug: "protetor-solar-sundown-200-ml",
    name: "Protetor solar Sundown 200 ml",
    brand: "Sundown",
    category: "protecao_solar",
    currentPrice: 55,
    image: "/promotions/drafts/sundown-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "hipopo-fralda-pacote-hiper",
    slug: "fralda-hipopo-pacote-hiper",
    name: "Fralda Hipopó pacote hiper",
    brand: "Hipopó",
    category: "bebe",
    currentPrice: 44.9,
    image: "/promotions/drafts/hipopo-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "natural-baby-lenco-umedecido",
    slug: "lenco-umedecido-natural-baby",
    name: "Lenço umedecido Natural Baby",
    brand: "Natural Baby",
    category: "bebe",
    currentPrice: 13.9,
    image: "/promotions/drafts/natural-baby-lenco-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "comfort-master-roupa-intima-geriatrica",
    slug: "roupa-intima-geriatrica-comfort-master",
    name: "Roupa íntima geriátrica Comfort Master",
    brand: "Comfort Master",
    category: "incontinencia",
    currentPrice: 49.9,
    image: "/promotions/drafts/comfort-master-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "salute-fralda-geriatrica",
    slug: "fralda-geriatrica-salute",
    name: "Fralda geriátrica Salute",
    brand: "Salute",
    category: "incontinencia",
    currentPrice: 16.9,
    image: "/promotions/drafts/salute-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "isababy-fralda",
    slug: "fralda-isababy",
    name: "Fralda IsaBaby",
    brand: "IsaBaby",
    category: "bebe",
    currentPrice: 25,
    image: "/promotions/drafts/isababy-original.jpeg",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "approved",
    adsEligible: true,
    updatedAt: "2026-08-17",
  }),
  ...([
    {
      id: "aceviton",
      name: "Aceviton",
      currentPrice: 9.9,
      image: "/promotions/drafts/aceviton-original.jpeg",
      description: "ACEVITON VITAMINA C 1 g — 10 comprimidos efervescentes",
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "review",
    },
    {
      id: "agil-c-kids",
      name: "Agil-C Kids",
      currentPrice: 34.9,
      image: "/promotions/drafts/agil-c-kids-original.jpeg",
      description: "SUPLEMENTO ALIMENTAR EM GOMAS — Vitaminas C + D + Zinco — 40 unidades",
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "review",
    },
    {
      id: "omega-3",
      name: "Ômega 3 Katiguá",
      currentPrice: 39.9,
      image: "/promotions/drafts/omega-3-original.jpeg",
      description: "ÔMEGA 3 KATIGUÁ — 120 cápsulas",
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "review",
    },
    {
      id: "lavitan",
      name: "Lavitan Cabelos e Unhas",
      currentPrice: 29.9,
      image: "/promotions/drafts/lavitan-original.jpeg",
      description: "LAVITAN CABELOS E UNHAS — 60 cápsulas",
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "review",
    },
    {
      id: "cognon-fos",
      name: "Cognon FOS",
      currentPrice: undefined,
      image: undefined,
      description: undefined,
      imageApproved: undefined,
      manualRegulatoryApproval: undefined,
      promotionConfirmed: undefined,
      publicationStatus: undefined,
    },
    {
      id: "melatonina-dr-good",
      name: "Melatonina Dr. Good",
      currentPrice: undefined,
      image: undefined,
      description: undefined,
      imageApproved: undefined,
      manualRegulatoryApproval: undefined,
      promotionConfirmed: undefined,
      publicationStatus: undefined,
    },
  ] as const).map(({ id, name, currentPrice, image, description, imageApproved, manualRegulatoryApproval, promotionConfirmed, publicationStatus }) =>
    createOffer({
      id,
      slug: id,
      name,
      currentPrice,
      image,
      description,
      imageApproved,
      manualRegulatoryApproval,
      promotionConfirmed,
      category: "suplementos",
      regulatoryClass: "supplement_review",
      publicationStatus: publicationStatus ?? "review",
    }),
  ),
  createOffer({
    id: "tandrilax",
    slug: "tandrilax",
    name: "Tandrilax",
    currentPrice: 16.9,
    image: "/promotions/drafts/tandrilax-original.jpeg",
    category: "medicamentos",
    regulatoryClass: "prescription_blocked",
    publicationStatus: "blocked",
  }),
  ...([
    {
      id: "strepsils",
      name: "Strepsils",
      currentPrice: 26.9,
      image: "/promotions/drafts/strepsils-original.jpeg",
      description: undefined,
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "blocked",
    },
    {
      id: "resfegripe",
      name: "ResfeGripe",
      currentPrice: 12,
      image: "/promotions/drafts/resfegripe-original.jpeg",
      description: undefined,
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "blocked",
    },
    {
      id: "expectorante-generico",
      name: "Expectorante genérico apresentado nas artes",
      currentPrice: 25,
      image: "/promotions/drafts/expec-generico-original.jpeg",
      description: "[ADVERTÊNCIA OBRIGATÓRIA CONFIRMADA PELA BULA/RDC] — REG. ANVISA: [CONFIRMAR]",
      imageApproved: false,
      manualRegulatoryApproval: false,
      promotionConfirmed: false,
      publicationStatus: "blocked",
    },
  ] as const).map(({ id, name, currentPrice, image, description, imageApproved, manualRegulatoryApproval, promotionConfirmed, publicationStatus }) =>
    createOffer({
      id,
      slug: id,
      name,
      currentPrice,
      image,
      description,
      imageApproved,
      manualRegulatoryApproval,
      promotionConfirmed,
      category: "medicamentos",
      regulatoryClass: "otc_review",
      publicationStatus: publicationStatus ?? "review",
    }),
  ),
];

function parseOfferDate(value: string): Date | null {
  const date = new Date(`${value}T23:59:59-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isOfferExpired(offer: Offer, now = new Date()): boolean {
  if (offer.publicationStatus === "expired") return true;
  if (offer.validityType === "while_stock_lasts") return false;
  if (!offer.validUntil) return false;
  const validUntil = parseOfferDate(offer.validUntil);
  return validUntil ? now.getTime() > validUntil.getTime() : true;
}

export function canPublishOffer(offer: Offer, now = new Date()): PublicationDecision {
  if (offer.regulatoryClass === "prescription_blocked") {
    return {
      publishable: false,
      code: "prescription_blocked",
      reason: "Medicamento bloqueado para ofertas e campanhas.",
    };
  }
  if (offer.publicationStatus !== "approved") {
    return {
      publishable: false,
      code: "status_not_approved",
      reason:
        offer.publicationStatus === "review"
          ? "Produto exige revisão antes da publicação."
          : "Oferta ainda não foi aprovada para publicação.",
    };
  }
  if (isOfferExpired(offer, now)) {
    return { publishable: false, code: "expired", reason: "Oferta encerrada." };
  }
  if (offer.currentPrice === null) {
    return { publishable: false, code: "price_missing", reason: "Preço atual não confirmado." };
  }
  if (!offer.priceConfirmed) {
    return { publishable: false, code: "price_not_confirmed", reason: "Price awaits confirmation." };
  }
  if (!offer.promotionConfirmed) {
    return {
      publishable: false,
      code: "promotion_not_confirmed",
      reason: "Promoção ainda não confirmada pelo responsável.",
    };
  }
  if (offer.units.length === 0) {
    return { publishable: false, code: "units_missing", reason: "Unidades participantes não confirmadas." };
  }
  if (!offer.imageApproved) {
    return { publishable: false, code: "image_not_approved", reason: "Imagem ainda não foi aprovada." };
  }
  if (!offer.image && !offer.placeholderLabel) {
    return { publishable: false, code: "image_missing", reason: "Imagem ou visual neutro aprovado não cadastrado." };
  }
  if (
    (offer.regulatoryClass === "supplement_review" || offer.regulatoryClass === "otc_review") &&
    offer.manualRegulatoryApproval !== true
  ) {
    return {
      publishable: false,
      code: "regulatory_approval_missing",
      reason: "Produto exige aprovação regulatória manual.",
    };
  }
  return { publishable: true, code: "approved", reason: "Oferta apta para publicação." };
}

export function getPublicOffers(now = new Date()): Offer[] {
  return OFFERS.filter((offer) => canPublishOffer(offer, now).publishable);
}

export type AdsDecision = { eligible: boolean; reason: string };

export function canUseInAds(offer: Offer, now = new Date()): AdsDecision {
  const publication = canPublishOffer(offer, now);
  if (!publication.publishable) return { eligible: false, reason: publication.reason };
  if (offer.regulatoryClass !== "non_regulated") {
    return { eligible: false, reason: "Regulatory class is not eligible for campaigns." };
  }
  if (!offer.validityConfirmed) {
    return { eligible: false, reason: "Offer validity awaits confirmation." };
  }
  if (offer.validityType !== "while_stock_lasts" && (offer.validityType !== "date" || !offer.validUntil)) {
    return { eligible: false, reason: "Offer validity requires a date or while-stock-lasts confirmation." };
  }
  if (!offer.adsEligible) {
    return { eligible: false, reason: "Offer is not yet approved for Google Ads." };
  }
  return { eligible: true, reason: "Offer is eligible for Google Ads." };
}

export function formatOfferPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
