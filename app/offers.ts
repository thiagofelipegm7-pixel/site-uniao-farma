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
  | "prescription_listed"
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
  /**
   * Preço de antes ("De R$ X"). Opcional.
   * Para o painel OFERTAS DA SEMANA mostrar o "De", preencha os dois no item de OFFERS:
   * previousPrice (número maior que currentPrice) e previousPriceConfirmed: true.
   * Sem confirmação o card mostra só o preço atual. Não inventar valor.
   */
  previousPrice?: number | null;
  previousPriceConfirmed?: boolean;
  /** Condição sóbria da oferta, sem apelo promocional (ex.: "Leve 3 por R$ 9,99"). */
  condicao?: string;
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
    | "expired"
    | "not_yet_valid";
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
  // Encarte de Black Friday (27/11/2026). Preços do folheto (Elseve "de" 49,90 do DMaster).
  // Expiram sozinhas depois de 27/11/2026 às 23:59:59 (Brasília). Inclui medicamentos com receita do encarte, a pedido da loja, só com nome, preço e a condição "leve 3".
  ...([
    { id: "bf-strepsils-16-laranja", slug: "strepsils-8-75mg-cx-16-past-laranja", name: "Strepsils caixa 16 pastilhas laranja", brand: "Strepsils", category: "medicamentos" as const, currentPrice: 19.9, previousPrice: 34.9, image: "/produtos/7891035010972.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-strepsils-16-mel-limao", slug: "strepsils-875mg-cx-16-past-mel-limao", name: "Strepsils caixa 16 pastilhas mel e limão", brand: "Strepsils", category: "medicamentos" as const, currentPrice: 19.9, previousPrice: 34.9, image: "/produtos/7891035010866.webp", regulatoryClass: "prescription_listed" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-corega-max-70g", slug: "corega-max-creme-70g-und", name: "Corega Max 70g (embalagem avulsa)", brand: "Corega", category: "cuidados_pessoais" as const, currentPrice: 65, previousPrice: 79.9, image: "/produtos/7896015525804.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-flexalgin-30", slug: "flexalgin-cx-30cpr", name: "Flexalgin caixa 30 comprimidos", brand: "Flexalgin", category: "medicamentos" as const, currentPrice: 9.9, previousPrice: 15, image: "/produtos/7899095201255.webp", regulatoryClass: "prescription_listed" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-nimesulida-12", slug: "nimesulida-100mg-cx-12cpr-globo-pharma", name: "Nimesulida 100mg caixa 12 comprimidos Globo Pharma", brand: "Globo Pharma", category: "medicamentos" as const, currentPrice: 6, condicao: "Leve 3 por R$ 9,99", image: "/produtos/7899620915039.webp", regulatoryClass: "prescription_listed" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-losartana-teuto-30", slug: "losartana-50mg-cx-30cpr-teuto", name: "Losartana 50mg caixa 30 comprimidos Teuto", brand: "Teuto", category: "medicamentos" as const, currentPrice: 6, condicao: "Leve 3 por R$ 9,99", image: "/produtos/7896112114185.webp", regulatoryClass: "prescription_listed" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-bioextratus-banho-1kg", slug: "banho-de-creme-bioextratus-pos-quimica-1kg", name: "Banho de creme Bioextratus 1kg", brand: "Bioextratus", category: "higiene_beleza" as const, currentPrice: 59.9, previousPrice: 69.9, image: "/produtos/7898126407918.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-seda-pentear-300ml", slug: "cr-pent-seda-luminous-uv-300ml", name: "Creme de pentear Seda 300ml", brand: "Seda", category: "cuidados_pessoais" as const, currentPrice: 9.9, previousPrice: 13.9, image: "/produtos/7891150099852.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-neosaldina-20", slug: "neosaldina-cx-20-drageas", name: "Neosaldina caixa 20 comprimidos", brand: "Neosaldina", category: "medicamentos" as const, currentPrice: 21.9, previousPrice: 35.99, image: "/produtos/7896094921979.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-cimegripe-20", slug: "cimegripe-cx-c-20-caps", name: "Cimegripe antigripal 20 cápsulas", brand: "Cimegripe", category: "medicamentos" as const, currentPrice: 9.9, previousPrice: 16, image: "/produtos/7896523200576.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-bepantriz-30g", slug: "bepantriz-50mg-pomada-30g", name: "Bepantriz pomada 30g", brand: "Bepantriz", category: "medicamentos" as const, currentPrice: 7.9, previousPrice: 12, image: "/produtos/7896523210797.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-lavitan-60", slug: "lavitan-hair-com-60-capsula", name: "Lavitan Cabelos e Unhas 60 cápsulas", brand: "Lavitan", category: "suplementos" as const, currentPrice: 18.9, previousPrice: 35, image: "/produtos/7897947612891.webp", regulatoryClass: "supplement_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-nevralgex-10", slug: "nevralgex-cartela-10-cp", name: "Nevralgex cartela 10 comprimidos", brand: "Nevralgex", category: "medicamentos" as const, currentPrice: 5, condicao: "Leve 3 por R$ 8,94", image: "/produtos/7896523224459.webp", regulatoryClass: "prescription_listed" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-maca-100g", slug: "maca-peruana-em-po-sem-sabor-100g-qualyn", name: "Maca peruana 100g pó QualyNutri", brand: "QualyNutri", category: "suplementos" as const, currentPrice: 49.9, previousPrice: 56.9, image: "/produtos/7898767762827.webp", regulatoryClass: "supplement_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-lavitan-30", slug: "lavitan-hair-c-30cp", name: "Lavitan Cabelos e Unhas 30 cápsulas", brand: "Lavitan", category: "suplementos" as const, currentPrice: 9.9, previousPrice: 19.9, image: "/produtos/7897947607996.webp", regulatoryClass: "supplement_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-dermafemme-kit", slug: "kit-dermafeme-c-2", name: "Kit Dermafemme 2 unidades 200ml", brand: "Dermafemme", category: "cuidados_pessoais" as const, currentPrice: 17.9, previousPrice: 25, image: "/produtos/7897947604384.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-hystin-120ml", slug: "hystin-xpe-120-ml", name: "Hystin xarope 120ml", brand: "Hystin", category: "medicamentos" as const, currentPrice: 9.9, previousPrice: 15, image: "/produtos/7899095201415.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-nivea-facial-100g", slug: "cr-nivea-fac-antissinais-100g", name: "Creme Nivea Facial 100g", brand: "Nivea", category: "cuidados_pessoais" as const, currentPrice: 25.9, previousPrice: 35, image: "/produtos/0000042360414.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-listerine-500ml", slug: "listerine-cool-mint-zero-alcool-500ml", name: "Enxaguante bucal Listerine 500ml", brand: "Listerine", category: "cuidados_pessoais" as const, currentPrice: 19.9, previousPrice: 24.9, image: "/produtos/7891010974312.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-lola-oleo-50ml", slug: "oleo-lola-argan-50ml", name: "Óleo Lola Argan ou Danos Vorazes 50ml", brand: "Lola", category: "higiene_beleza" as const, currentPrice: 19.9, previousPrice: 29.9, image: "/produtos/7899572810383.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-decongex-12", slug: "decongex-plus-comp-c-12", name: "Decongex Plus 12 comprimidos", brand: "Decongex", category: "medicamentos" as const, currentPrice: 19.9, previousPrice: 33.9, image: "/produtos/7896658001901.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-oleo-abobora-60", slug: "oleo-de-abobora-vit-e-1000mg-c-60-caps", name: "Óleo de Abóbora + Vitamina E 1000mg 60 cápsulas QualyNutri", brand: "QualyNutri", category: "suplementos" as const, currentPrice: 49.9, previousPrice: 69.9, image: "/produtos/7898767760564.webp", regulatoryClass: "supplement_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-licopeno-60", slug: "licopeno-vit-e-500mg-c-60-caps-qualynu", name: "Licopeno + Vitamina E 500mg 60 cápsulas QualyNutri", brand: "QualyNutri", category: "suplementos" as const, currentPrice: 49.9, previousPrice: 69.9, image: "/produtos/7898767760472.webp", regulatoryClass: "supplement_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-artriflex-60", slug: "artriflex-ultra-80mg-c-60-caps-qualynutr", name: "Artriflex Ultra 80mg 60 cápsulas QualyNutri", brand: "QualyNutri", category: "suplementos" as const, currentPrice: 59.9, previousPrice: 79.9, image: "/produtos/7898767760021.webp", regulatoryClass: "supplement_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-elseve-100ml", slug: "oleo-elseve-extraordinario-100ml", name: "Óleo Elseve Extraordinário 100ml", brand: "Elseve", category: "higiene_beleza" as const, currentPrice: 29.9, previousPrice: 49.9, image: "/produtos/7899026478909.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-dove-aerosol-150ml", slug: "desodorante-dove-spray-aerosol-original-150ml", name: "Desodorante Dove Original aerosol 150ml", brand: "Dove", category: "cuidados_pessoais" as const, currentPrice: 15.9, previousPrice: 19.9, image: "/produtos/7506306241183.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-nistatina-60g", slug: "nistatina-oxido-de-zinco-60g-neo-quimica", name: "Nistatina + Óxido de zinco 60g Neo Química", brand: "Neo Química", category: "medicamentos" as const, currentPrice: 9.9, previousPrice: 16.9, image: "/produtos/7896714224688.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-loratamed-12", slug: "loratamed-c-12-comp", name: "Loratamed Loratadina 10mg caixa 12 comprimidos", brand: "Loratamed", category: "medicamentos" as const, currentPrice: 4.9, previousPrice: 7.9, image: "/produtos/7896523202822.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-dipirona-1g-10", slug: "dipirona-1g-cx-10cpr-prati-donaduzzi", name: "Dipirona 1g Prati-Donaduzzi 10 comprimidos", brand: "Prati-Donaduzzi", category: "medicamentos" as const, currentPrice: 9.9, previousPrice: 12.9, image: "/produtos/7899547500356.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-tossexpec-120ml", slug: "tossexpec-xp-5mg-ml-xpe-120ml", name: "Tossexpec xarope 120ml", brand: "Tossexpec", category: "medicamentos" as const, currentPrice: 19.9, previousPrice: 29.9, image: "/produtos/7896094931534.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-carmed-10g", slug: "carmed-cereja-10-g", name: "Carmed 10g protetor labial", brand: "Carmed", category: "cuidados_pessoais" as const, currentPrice: 14.9, previousPrice: 29.9, image: "/produtos/7897947614734.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-xo-inseto-200ml", slug: "rep-xo-inseto-200ml-spray", name: "Repelente Xô Inseto 200ml spray ou loção", brand: "Xô Inseto", category: "cuidados_pessoais" as const, currentPrice: 16.9, previousPrice: 25.9, image: "/produtos/7897947612907.webp", regulatoryClass: "non_regulated" as const, adsEligible: true },
    { id: "bf-neolefrin-noite-20", slug: "neolefrin-400-20-400-4mg-cx-20", name: "Neolefrin Noite 20 comprimidos", brand: "Neolefrin", category: "medicamentos" as const, currentPrice: 9.9, previousPrice: 16, image: "/produtos/7896714265933.webp", regulatoryClass: "otc_review" as const, adsEligible: false, manualRegulatoryApproval: true },
    { id: "bf-narix-30ml", slug: "narix-0-5mg-fr-30ml-adulto", name: "Narix 0,5mg frasco 30ml adulto", brand: "Narix", category: "medicamentos" as const, currentPrice: 3.9, condicao: "Leve 3 por R$ 9,99", image: "/produtos/7896523202600.webp", regulatoryClass: "prescription_listed" as const, adsEligible: false, manualRegulatoryApproval: true },
  ] as const).map((item) =>
    createOffer({
      ...item,
      previousPriceConfirmed: true,
      placeholderLabel: "Oferta aprovada",
      imageApproved: true,
      priceConfirmed: true,
      validityConfirmed: true,
      validityType: "date",
      validFrom: "2026-11-27",
      validUntil: "2026-11-27",
      promotionConfirmed: true,
      publicationStatus: "approved",
      updatedAt: "2026-11-27",
    }),
  ),
  // Ofertas anteriores (já encerradas). Ofertas da semana das artes da loja (02/11/2026; a do Adeforte foi retirada a pedido da loja). "De" e "Por" confirmados pelo dono; valem enquanto durar o estoque em cada loja.
  createOffer({
    id: "cerave-creme-hidratante-85g",
    slug: "cerave-pote-creme-hidratante-sem-perfume-85g",
    name: "Cerave pote creme hidratante sem perfume 85g",
    brand: "CeraVe",
    category: "cuidados_pessoais",
    currentPrice: 39.9,
    previousPrice: 59.9,
    previousPriceConfirmed: true,
    image: "/promotions/cerave-creme-hidratante-85g.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-11-02",
  }),
  createOffer({
    id: "sunless-kit-fps50",
    slug: "kit-protetor-solar-sunless-fps50-toque-seco-200g-120g",
    name: "Kit protetor solar Sunless FPS50 toque seco 200g + 120g",
    brand: "Sunless",
    category: "protecao_solar",
    currentPrice: 59.9,
    previousPrice: 79.9,
    previousPriceConfirmed: true,
    image: "/promotions/sunless-kit-fps50.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-11-02",
  }),
  createOffer({
    id: "seda-creme-pentear-300ml",
    slug: "creme-seda-para-pentear-300-ml",
    name: "Creme Seda para pentear 300 ml",
    brand: "Seda",
    category: "cuidados_pessoais",
    currentPrice: 13.9,
    image: "/promotions/drafts/seda-creme-pentear.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "nivea-locao-hidratante-400ml",
    slug: "locao-hidratante-nivea-400-ml",
    name: "Loção hidratante Nivea 400 ml",
    brand: "Nivea",
    category: "cuidados_pessoais",
    currentPrice: 29,
    image: "/promotions/drafts/nivea-locao.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "seda-boom-creme-1kg",
    slug: "creme-seda-boom-1-kg",
    name: "Creme Seda Boom 1 kg",
    brand: "Seda",
    category: "higiene_beleza",
    currentPrice: 35,
    image: "/promotions/drafts/seda-boom.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "sundown-protetor-solar-200ml",
    slug: "protetor-solar-sundown-200-ml",
    name: "Protetor solar Sundown 200 ml",
    brand: "Sundown",
    category: "protecao_solar",
    currentPrice: 55,
    image: "/promotions/drafts/sundown.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "hipopo-fralda-pacote-hiper",
    slug: "fralda-hipopo-pacote-hiper",
    name: "Fralda Hipopó pacote hiper",
    brand: "Hipopó",
    category: "bebe",
    currentPrice: 44.9,
    image: "/promotions/drafts/hipopo.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "natural-baby-lenco-umedecido",
    slug: "lenco-umedecido-natural-baby",
    name: "Lenço umedecido Natural Baby",
    brand: "Natural Baby",
    category: "bebe",
    currentPrice: 13.9,
    image: "/promotions/drafts/natural-baby-lenco.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "comfort-master-roupa-intima-geriatrica",
    slug: "roupa-intima-geriatrica-comfort-master",
    name: "Roupa íntima geriátrica Comfort Master",
    brand: "Comfort Master",
    category: "incontinencia",
    currentPrice: 49.9,
    image: "/promotions/drafts/comfort-master.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "salute-fralda-geriatrica",
    slug: "fralda-geriatrica-salute",
    name: "Fralda geriátrica Salute",
    brand: "Salute",
    category: "incontinencia",
    currentPrice: 16.9,
    image: "/promotions/drafts/salute.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
    updatedAt: "2026-08-17",
  }),
  createOffer({
    id: "isababy-fralda",
    slug: "fralda-isababy",
    name: "Fralda IsaBaby",
    brand: "IsaBaby",
    category: "bebe",
    currentPrice: 25,
    image: "/promotions/drafts/isababy.webp",
    placeholderLabel: "Oferta aprovada",
    imageApproved: true,
    priceConfirmed: true,
    validityConfirmed: true,
    validityType: "while_stock_lasts",
    promotionConfirmed: true,
    regulatoryClass: "non_regulated",
    publicationStatus: "expired",
    adsEligible: false,
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
  if (offer.validityType === "date" && offer.validFrom) {
    const inicio = new Date(`${offer.validFrom}T00:00:00-03:00`);
    if (!Number.isNaN(inicio.getTime()) && now.getTime() < inicio.getTime()) {
      return { publishable: false, code: "not_yet_valid", reason: "Oferta ainda não começou." };
    }
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
    (offer.regulatoryClass === "supplement_review" || offer.regulatoryClass === "otc_review" || offer.regulatoryClass === "prescription_listed") &&
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

/** Dias depois da última conferência em que o encarte ainda pode ser chamado de "da semana". */
export const OFFERS_FRESH_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Data da última conferência do encarte (maior updatedAt, AAAA-MM-DD) ou null sem ofertas. */
export function getOffersReviewDate(offers: Offer[] = getPublicOffers()): string | null {
  return offers.reduce<string | null>(
    (latest, offer) => (latest === null || offer.updatedAt > latest ? offer.updatedAt : latest),
    null,
  );
}

export function isOffersCatalogFresh(now = new Date(), offers: Offer[] = getPublicOffers(now)): boolean {
  const reviewDate = getOffersReviewDate(offers);
  const reviewedAt = reviewDate ? parseOfferDate(reviewDate) : null;
  if (!reviewedAt) return false;
  return now.getTime() - reviewedAt.getTime() <= OFFERS_FRESH_DAYS * DAY_MS;
}

export function getOffersKicker(now = new Date(), offers: Offer[] = getPublicOffers(now)): string {
  return isOffersCatalogFresh(now, offers) ? "Ofertas da semana" : "Ofertas";
}

/** "2026-08-17" -> "17/08/2026". */
export function formatOfferDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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

/** "De" só quando o preço anterior foi confirmado e é maior que o atual. */
export function precoAnteriorConfirmado(
  offer: Pick<Offer, "previousPrice" | "previousPriceConfirmed" | "currentPrice">,
): number | null {
  const anterior = offer.previousPrice;
  if (offer.previousPriceConfirmed !== true) return null;
  if (typeof anterior !== "number" || !Number.isFinite(anterior) || anterior <= 0) return null;
  if (offer.currentPrice !== null && anterior <= offer.currentPrice) return null;
  return anterior;
}

/** Até 3 ofertas publicáveis, nunca medicamento bloqueado. A ordem é a de OFFERS. */
export function selecionarOfertasSemana(offers: readonly Offer[], limite = 3): Offer[] {
  return offers
    .filter((offer) => offer.regulatoryClass !== "prescription_blocked")
    .filter((offer) => offer.currentPrice !== null && offer.currentPrice > 0)
    .slice(0, Math.max(0, limite));
}

/** Primeira loja da oferta: é para ela que a reserva da home vai. */
export function lojaDaOferta(offer: Pick<Offer, "units">): OfferUnitId | null {
  return offer.units[0] ?? null;
}

/** Loja da reserva: a preferida do cliente, se a oferta vale nela; senão a primeira da oferta. */
export function lojaParaReserva(
  offer: Pick<Offer, "units">,
  preferida: OfferUnitId | null | undefined,
): OfferUnitId | null {
  if (preferida && offer.units.includes(preferida)) return preferida;
  return lojaDaOferta(offer);
}

export function precoOfertaCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Oferta de medicamento (isento ou em revisão): o card precisa exibir a advertência da RDC 96/2008. */
export function isMedicationOffer(offer: Pick<Offer, "category" | "regulatoryClass">): boolean {
  return offer.category === "medicamentos" || offer.regulatoryClass === "otc_review" || offer.regulatoryClass === "prescription_listed";
}

export const MEDICATION_WARNING = "EVITE A AUTOMEDICAÇÃO. Informe-se com o farmacêutico.";
