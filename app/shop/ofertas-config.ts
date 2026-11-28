/**
 * Ofertas da vitrine "Descontos e ofertas" na home e preços promocionais vigentes no catálogo.
 * O preço "por" entra no catálogo só enquanto a validade estiver aberta (fuso de Brasília);
 * depois o site volta sozinho ao preço publicado no JSON do DMaster. O "de" é o do encarte.
 */
export type OfertaHome = {
  nomeCatalogo: string;
  /** Preço "de" do encarte, em centavos. Na oferta "leve 3", é o preço da unidade no encarte. */
  precoAnteriorCentavos: number;
  /** Preço "por" unitário do encarte, em centavos. Se o catálogo já estiver mais baixo, vale o menor. Ausente nas ofertas "leve 3". */
  precoPorCentavos?: number;
  /** Oferta "leve N por X": quantidade e preço total do conjunto, em centavos. */
  leveQuantidade?: number;
  levePrecoCentavos?: number;
  validoDe?: string;
  validoAte?: string;
};

/** Black Friday 2026: o encarte e o pedido da loja valem neste dia (27/11/2026). */
export const ENCARTES_VALIDO_DE = "2026-11-27";
export const ENCARTES_VALIDO_ATE = "2026-11-27";

function chaveDeNome(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Validade no horário de Brasília, do início de validoDe até 23:59:59 de validoAte. */
export function periodoOfertaAberto(
  validoDe: string | undefined,
  validoAte: string | undefined,
  now = new Date(),
): boolean {
  if (validoDe) {
    const inicio = new Date(`${validoDe}T00:00:00-03:00`);
    if (Number.isNaN(inicio.getTime()) || now.getTime() < inicio.getTime()) return false;
  }
  if (validoAte) {
    const fim = new Date(`${validoAte}T23:59:59-03:00`);
    if (Number.isNaN(fim.getTime()) || now.getTime() > fim.getTime()) return false;
  }
  return true;
}

/** Chave estável do encarte vigente: o catálogo memoiza o overlay com ela e recompõe sozinho quando a validade fecha. */
export function chaveDeOfertaVigente(now = new Date()): string {
  return periodoOfertaAberto(ENCARTES_VALIDO_DE, ENCARTES_VALIDO_ATE, now)
    ? `oferta:${ENCARTES_VALIDO_DE}:${ENCARTES_VALIDO_ATE}`
    : "sem-oferta";
}

const BF = { validoDe: ENCARTES_VALIDO_DE, validoAte: ENCARTES_VALIDO_ATE } as const;

function oferta(nomeCatalogo: string, precoAnteriorCentavos: number, precoPorCentavos: number): OfertaHome {
  return { nomeCatalogo, precoAnteriorCentavos, precoPorCentavos, ...BF };
}

function ofertaLeve(nomeCatalogo: string, precoUnidadeCentavos: number, leveQuantidade: number, levePrecoCentavos: number): OfertaHome {
  return { nomeCatalogo, precoAnteriorCentavos: precoUnidadeCentavos, leveQuantidade, levePrecoCentavos, ...BF };
}

/** Texto sóbrio da condição "leve 3", no formato do encarte. */
export function textoLevePor(quantidade: number, precoCentavos: number): string {
  const reais = Math.floor(precoCentavos / 100);
  const centavos = String(precoCentavos % 100).padStart(2, "0");
  return `Leve ${quantidade} por R$ ${reais},${centavos}`;
}

/**
 * Itens do encarte de Black Friday. Inclui medicamentos com receita do encarte, a pedido da loja,
 * só com nome, preço e a condição "leve 3". Losartana Neo Química ficou de fora (estoque insuficiente para o leve 3).
 */
export const OFERTAS_HOME: readonly OfertaHome[] = [
  oferta("STREPSILS 8.75mg cx 16 past LARANJA", 3490, 1990),
  oferta("STREPSILS 875MG CX 16 PAST MEL LIMAO", 3490, 1990),
  oferta("COREGA MAX CREME 70G UND", 7990, 6500),
  oferta("FLEXALGIN CX 30CPR", 1500, 990),
  ofertaLeve("NIMESULIDA 100mg cx 12cpr GLOBO PHARMA", 600, 3, 999),
  ofertaLeve("LOSARTANA 50mg cx 30cpr TEUTO", 600, 3, 999),
  oferta("BANHO DE CREME BIOEXTRATUS POS QUIMICA 1KG", 6990, 5990),
  oferta("BANHO DE CREME BIOEXTRATUS OLEO DE COCO 1KG", 6990, 5990),
  oferta("BANHO DE CREME BIOEXTRATUS MEL 1KG", 6990, 5990),
  oferta("BANHO DE CREME BIOEXTRATUS CACHOS 1KG", 6990, 5990),
  oferta("BANHO DE CREME BIOEXTRATUS TUTANO CERAMIDAS 1KG", 6990, 5990),
  oferta("BANHO DE CREME BIOEXTRATUS ANTIQUEDA JABORANDI 1KG", 6990, 5990),
  oferta("CR PENT SEDA LUMINOUS UV 300ML", 1390, 990),
  oferta("CR PENT SEDA FORC E CRESC 300ML", 1390, 990),
  oferta("CR PENT SEDA MEGA CRESCIM 300ML", 1390, 990),
  oferta("CR PENT SEDA CER 300ML", 1390, 990),
  oferta("CR PENT SEDA 300ML PRETO LUM", 1390, 990),
  oferta("NEOSALDINA CX 20 DRAGEAS", 3599, 2190),
  oferta("CIMEGRIPE CX C/20 CAPS", 1600, 990),
  oferta("BEPANTRIZ 50MG POMADA 30G", 1200, 790),
  oferta("LAVITAN HAIR COM 60 CAPSULA", 3500, 1890),
  ofertaLeve("NEVRALGEX CARTELA 10 CP", 500, 3, 894),
  oferta("MACA PERUANA EM PO SEM SABOR 100G QUALYN", 5690, 4990),
  oferta("LAVITAN HAIR C/ 30CP", 1990, 990),
  oferta("KIT DERMAFEME C/2", 2500, 1790),
  oferta("KIT DERMAFEME FRESH THELMINHA 200ML X 2", 2500, 1790),
  oferta("KIT DERMAFEME TUTTI-FRUTTI 200ML X 2", 2500, 1790),
  oferta("HYSTIN XPE 120 ML", 1500, 990),
  oferta("CR NIVEA FAC NUTRITIVO 100G", 3500, 2590),
  oferta("CR NIVEA FAC ANTISSINAIS 100G", 3500, 2590),
  oferta("CR NIVEA FACIAL NOTURNO 100G", 3500, 2590),
  oferta("CR NIVEA FAC VIT C 7EM1 100G", 3500, 2590),
  oferta("CR NIVEA FACIAL CONTROLE OLEOSIDADE 100 G", 3500, 2590),
  oferta("CR NIVEA FACIAL PELE NEGRA 100", 3500, 2590),
  oferta("LISTERINE COOL MINT ZERO ALCOOL 500ML", 2490, 1990),
  oferta("LISTERINE COOL MINT 500ML*", 2490, 1990),
  oferta("PROTETOR SOLAR SUNLESS FPS 60 120 ML", 4990, 2390),
  oferta("OLEO LOLA ARGAN 50ML", 2990, 1990),
  oferta("OLEO LOLA DANOS VORAZES 50ML", 2990, 1990),
  oferta("DECONGEX PLUS comp c/12", 3390, 1990),
  oferta("OLEO DE ABOBORA + VIT E 1000MG C/60 CAPS", 6990, 4990),
  oferta("LICOPENO + VIT E 500MG C/60 CAPS QUALYNU", 6990, 4990),
  oferta("ARTRIFLEX ULTRA 80MG C/60 CAPS QUALYNUTR", 7990, 5990),
  // "De" 49,90: preço do DMaster confirmado pela loja; o "por" 29,90 é o do encarte.
  oferta("OLEO ELSEVE EXTRAORDINARIO 100ML", 4990, 2990),
  oferta("DESODORANTE DOVE SPRAY AEROSOL ORIGINAL 150ML", 1990, 1590),
  oferta("NISTATINA+OXIDO DE ZINCO 60G NEO QUIMICA", 1690, 990),
  oferta("LORATAMED C/12 COMP", 790, 490),
  oferta("DIPIRONA 1G cx 10cpr PRATI DONADUZZI", 1290, 990),
  oferta("TOSSEXPEC XP 5MG/ML XPE 120ML-", 2990, 1990),
  oferta("CARMED CEREJA 10 G", 2990, 1490),
  oferta("CARMED ACIDO HIALURONICO 10G", 2990, 1490),
  oferta("CARMED DOCE DE LEITE 10G", 2990, 1490),
  oferta("CARMED MELANCIA 10G", 2990, 1490),
  oferta("REP XO INSETO 200ML SPRAY", 2590, 1690),
  oferta("REPELENTE XO INSETO 200ML LOCAO", 2590, 1690),
  oferta("NEOLEFRIN 400+20+400+4mg cx 20", 1600, 990),
  ofertaLeve("NARIX 0.5mg fr 30ML ADULTO", 500, 3, 999),
];

const ofertasPorChave = new Map(OFERTAS_HOME.map((item) => [chaveDeNome(item.nomeCatalogo), item]));

export function ofertaHomeVigente(nomeCatalogo: string, now = new Date()): OfertaHome | null {
  const oferta = ofertasPorChave.get(chaveDeNome(nomeCatalogo));
  if (!oferta || !periodoOfertaAberto(oferta.validoDe, oferta.validoAte, now)) return null;
  return oferta;
}

/** Preço "por" vigente, em centavos, ou null fora da validade. */
export function precoPorOfertaVigente(nomeCatalogo: string, now = new Date()): number | null {
  const oferta = ofertaHomeVigente(nomeCatalogo, now);
  return oferta?.precoPorCentavos ?? null;
}
