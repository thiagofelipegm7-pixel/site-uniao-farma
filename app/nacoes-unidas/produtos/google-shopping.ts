import catalogoBruto from "./dados/catalogo-nacoes.json" with { type: "json" };
import receitaBruta from "./dados/receita-nacoes.json" with { type: "json" };
import { carregarCatalogoCompleto, slugify, type CatalogoItem } from "./catalogo";
import { fotoDoProduto } from "./imagens";
import { ehNbcal } from "./produto";

/**
 * Fonte única de elegibilidade para o Google (listagens gratuitas do Merchant Center, JSON-LD Product com Offer, indexação da página
 * e sitemap). Entra só item NÃO medicamento, em estoque, com foto aprovada e preço válido; o preço do site vale como preço firme
 * nesses itens (decisão da União Farma, nov/2026). Medicamento nunca entra, nem o isento de prescrição (MIP), nem nada que esteja nas
 * listas de receita, controlados ou "consulte o farmacêutico".
 */

/** Categorias públicas que nunca vão para o Google. */
const CATEGORIAS_FORA = new Set(["Medicamentos", "Categoria a conferir"]);

/** Nomes (slug) de tudo que está nas listas restritas (receita, controlados, consulte). */
const SLUGS_RESTRITOS: ReadonlySet<string> = (() => {
  const r = receitaBruta as unknown as Record<string, unknown>;
  const s = new Set<string>();
  for (const lista of ["receita", "controlados", "consulte"]) {
    const itens = r[lista];
    if (!Array.isArray(itens)) continue;
    for (const i of itens as Array<{ nome?: unknown; nomeExibicao?: unknown; slug?: unknown }>) {
      for (const v of [i?.nome, i?.nomeExibicao, i?.slug]) if (typeof v === "string" && v.trim()) s.add(slugify(v));
    }
  }
  return s;
})();

/** Itens do catálogo que vieram de lista de medicamento ou "consulte o farmacêutico" no sistema da loja (mesmo que a categoria pública seja outra). */
const SLUGS_ORIGEM_MEDICAMENTO: ReadonlySet<string> = (() => {
  const b = catalogoBruto as unknown as { itens?: Array<{ nome?: unknown; origem?: unknown; categoriaAntiga?: unknown }> };
  const s = new Set<string>();
  for (const i of b.itens ?? []) {
    if (typeof i?.nome !== "string") continue;
    const origem = typeof i.origem === "string" ? i.origem : "";
    const antiga = typeof i.categoriaAntiga === "string" ? i.categoriaAntiga : "";
    if (origem || /consulte|medicamento|prescri/i.test(antiga)) s.add(slugify(i.nome));
  }
  return s;
})();

/**
 * Trava extra pelo nome: formas farmacêuticas e termos que só aparecem em medicamento. Na dúvida, fica de fora.
 * Fórmula infantil fica de fora pela NBCAL (Lei 11.265/2006), que limita a promoção desses produtos.
 */
const NOME_FORA =
  /\b(XPE|XAROPE|COMP|COMPRIMIDOS?|DRG|DRAGEAS?|AMP|AMPOLAS?|INJ|INJETAVEL|SUSP|SUSPENSAO|POM|POMADA|COLIRIO|SUPOSITORIOS?|OVULOS?|FLACONETE|GTS|GOTAS|GEN|GENERICO|MG\/ML|BULA|SOL ORAL|ANTIBIOTICO|ANTISSEPTICO|FITOTERAPICO|HOMEOPATIC\w*|FORMULA INFANTIL|NAN|APTAMIL|NESTOGENO|MILNUTRI|ENFAMIL|PREGOMIN|ALFARE|NEOCATE|SIMILAC|CATETER|AUTOTESTE|SORO|LANCETA\w*)\b|(?<!SEM |S\/)AGULHA/;

/**
 * Itens de farmácia que, no Brasil, costumam ter registro ou notificação como medicamento (antissépticos, água boricada, óleo mineral,
 * pasta d'água, enxaguante com clorexidina etc.) ou cujo enquadramento não está claro. Ficam de fora até a equipe confirmar.
 */
const NOME_DUVIDA =
  /\b(ANTISS?EP\w*|IODO|CLOREXIDINA|PERIOGARD|PERIOGEN|AGUA BORICADA|ENXOFRE EM PO|OLEO MINERAL|VASELINA SOLIDA|VASELINA \d+ ?G|PASTA D ?AGUA|BEPANTOL|GELEIA 46)\b/;

function nomeNormal(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

type IndiceSlug = Map<string, { primeiro: CatalogoItem; total: number }>;
const INDICES = new WeakMap<readonly CatalogoItem[], IndiceSlug>();

/** Endereço (slug) de cada item: quantos itens dão o mesmo endereço e qual a página abre (o primeiro, como em acharPorSlug). */
function indiceDeSlugs(catalogo: readonly CatalogoItem[]): IndiceSlug {
  let indice = INDICES.get(catalogo);
  if (!indice) {
    indice = new Map();
    for (const i of catalogo) {
      const slug = slugify(i.nome);
      const atual = indice.get(slug);
      if (atual) atual.total += 1;
      else indice.set(slug, { primeiro: i, total: 1 });
    }
    INDICES.set(catalogo, indice);
  }
  return indice;
}

let catalogoPadrao: readonly CatalogoItem[] | null = null;
function catalogoPublicado(): readonly CatalogoItem[] {
  catalogoPadrao ??= carregarCatalogoCompleto().itens;
  return catalogoPadrao;
}

/**
 * Motivo de o item ser tratado como medicamento (ou de enquadramento a confirmar), ou null quando não é. Vale para o Google e para o
 * aviso de preço: medicamento mantém "a loja confirma preço e estoque"; o resto tem o preço do site como preço firme.
 */
export function motivoMedicamento(item: CatalogoItem): string | null {
  const slug = slugify(item.nome);
  if (CATEGORIAS_FORA.has(item.categoria)) return "categoria";
  if (item.isMIP) return "mip";
  if (SLUGS_RESTRITOS.has(slug)) return "lista_restrita";
  if (SLUGS_ORIGEM_MEDICAMENTO.has(slug)) return "origem_medicamento";
  const normal = nomeNormal(item.nome);
  if (NOME_FORA.test(normal)) return "nome_medicamento";
  if (NOME_DUVIDA.test(normal.replace(/'/g, " "))) return "enquadramento_a_confirmar";
  return null;
}

/** Medicamento (inclusive MIP, receita, controlado, "consulte") ou item com enquadramento a confirmar. */
export function ehMedicamentoOuDuvida(item: CatalogoItem): boolean {
  return motivoMedicamento(item) !== null;
}

/** Motivo de o item ficar fora do Google, ou null quando é elegível. Útil em teste e no painel. */
export function motivoForaGoogle(item: CatalogoItem, catalogo: readonly CatalogoItem[] = catalogoPublicado()): string | null {
  const medicamento = motivoMedicamento(item);
  if (medicamento) return medicamento;
  const slug = slugify(item.nome);
  if (ehNbcal(item.nome)) return "nbcal";
  if (item.esgotado) return "esgotado";
  if (!(Number.isFinite(item.preco) && item.preco > 0)) return "sem_preco";
  if (!fotoDoProduto(item.nome)) return "sem_foto";
  // O link precisa abrir exatamente este item (dois nomes com o mesmo endereço ficam de fora).
  const naPagina = indiceDeSlugs(catalogo).get(slug);
  if (!slug || !naPagina || naPagina.total > 1 || (naPagina.primeiro !== item && naPagina.primeiro.nome !== item.nome)) return "slug_ambiguo";
  return null;
}

/** Fonte única: o item pode ir para o Google (feed, página indexável, sitemap e Offer no JSON-LD)? */
export function elegivelGoogle(item: CatalogoItem, catalogo?: readonly CatalogoItem[]): boolean {
  return motivoForaGoogle(item, catalogo) === null;
}

/** Itens elegíveis do catálogo publicado, em ordem de nome. */
export function itensElegiveisGoogle(): CatalogoItem[] {
  const itens = catalogoPublicado();
  return itens.filter((i) => elegivelGoogle(i, itens)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Categoria do Google (taxonomia oficial, IDs) por categoria da loja. Sem correspondência segura, o campo fica de fora. */
export const CATEGORIA_GOOGLE: Readonly<Record<string, number>> = {
  Perfumes: 479, // Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne
  "Dermocosméticos": 567, // Health & Beauty > Personal Care > Cosmetics > Skin Care
  Beleza: 2915, // Health & Beauty > Personal Care
  "Cuidado Diário": 2915, // Health & Beauty > Personal Care
  "Infantil e Gestante": 537, // Baby & Toddler
};

/** GTIN (EAN-8, UPC-12, EAN-13, GTIN-14) com dígito verificador válido. */
export function gtinValido(codigo: string | null | undefined): boolean {
  if (!codigo || !/^(\d{8}|\d{12,14})$/.test(codigo)) return false;
  const digitos = codigo.split("").map(Number);
  const verificador = digitos.pop()!;
  const soma = digitos.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === verificador;
}
