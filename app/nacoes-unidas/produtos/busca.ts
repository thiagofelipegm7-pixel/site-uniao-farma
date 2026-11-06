/** Filtro local do catálogo de produtos (sem rede): ignora acento e caixa, todos os termos precisam aparecer. */

export type ItemBusca = {
  nome: string;
  lab: string;
  precoFmt: string;
  /** Preço em reais. Se faltar, a faixa e a ordenação leem `precoFmt`. */
  preco?: number;
  isMIP: boolean;
  /** Unidades que restam (1 a 5). */
  restam?: number;
  foto: string | null;
  /** Âncora estável (`slugify` do nome). A página do produto ainda não existe: a sugestão rola até o item. */
  id?: string;
  /** Slug da página do produto (do nome original do catálogo; o nome de exibição pode gerar outro). */
  slug?: string;
};
export type GrupoBusca = { categoria: string; id: string; itens: ItemBusca[] };

/** Termos provisórios do painel com o campo vazio. Troque aqui quando houver dados reais. */
export const BUSCAS_POPULARES = ["nivea", "listerine", "protetor solar"] as const;

export const ORDENS_CATALOGO = [
  { id: "recomendados", label: "Recomendados" },
  { id: "menor_preco", label: "Menor preço" },
  { id: "maior_preco", label: "Maior preço" },
] as const;

export type OrdemCatalogo = (typeof ORDENS_CATALOGO)[number]["id"];

export const FAIXAS_PRECO = [
  { id: "ate_15", label: "Até R$ 15" },
  { id: "de_15_a_25", label: "R$ 15 a 25" },
  { id: "acima_25", label: "Acima de R$ 25" },
] as const;

export type FaixaPreco = (typeof FAIXAS_PRECO)[number]["id"];

export type FiltroCatalogo = {
  consulta?: string;
  /** Busca corrigida (erro de digitação): se vier, vale no lugar de `consulta`, e o produto só precisa casar com uma delas. */
  consultasAlternativas?: readonly string[];
  ordem?: OrdemCatalogo;
  categorias?: readonly string[];
  marcas?: readonly string[];
  faixas?: readonly FaixaPreco[];
};

export function normalizarBusca(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras da busca sem acento e no singular simples ("fraldas" acha "fralda", "protetores" acha "protetor"). */
export function termosDeBusca(consulta: string): string[] {
  return normalizarBusca(consulta)
    .split(" ")
    .filter(Boolean)
    .map((t) => (t.length > 5 && t.endsWith("es") ? t.slice(0, -2) : t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function combina(termos: string[], ...campos: string[]): boolean {
  const alvo = normalizarBusca(campos.join(" "));
  return termos.every((termo) => alvo.includes(termo));
}

/** Como `filtrarGrupos`, mas o produto pode casar com qualquer uma das buscas (OU entre elas, E entre as palavras de cada uma). */
export function filtrarGruposAlternativos(grupos: readonly GrupoBusca[], consultas: readonly string[]): GrupoBusca[] {
  const listas = consultas.map(termosDeBusca).filter((termos) => termos.length > 0);
  if (listas.length === 0) return grupos.map((grupo) => ({ ...grupo, itens: [...grupo.itens] }));
  return grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => listas.some((termos) => combina(termos, item.nome, item.lab, grupo.categoria))) }))
    .filter((grupo) => grupo.itens.length > 0);
}

/** Sem termo devolve tudo. Com termo, procura em nome, laboratório e categoria; grupos sem resultado somem. */
export function filtrarGrupos(grupos: readonly GrupoBusca[], consulta: string): GrupoBusca[] {
  const termos = termosDeBusca(consulta);
  if (termos.length === 0) return grupos.map((grupo) => ({ ...grupo, itens: [...grupo.itens] }));
  return grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => combina(termos, item.nome, item.lab, grupo.categoria)) }))
    .filter((grupo) => grupo.itens.length > 0);
}

export function contarItens(grupos: readonly GrupoBusca[]): number {
  return grupos.reduce((total, grupo) => total + grupo.itens.length, 0);
}

/** "R$ 1.234,50" → 1234.5. Zero se o texto não for um preço. */
export function precoDoItem(item: Pick<ItemBusca, "preco" | "precoFmt">): number {
  if (typeof item.preco === "number" && Number.isFinite(item.preco) && item.preco > 0) return item.preco;
  const texto = item.precoFmt.replace(/[^\d,.]/g, "");
  if (!texto) return 0;
  const normal = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  const valor = Number(normal);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

/** Até 15 inclusive; de 15 a 25 fica com o de cima (25 inclusive); acima de 25 no terceiro. */
export function faixaDoPreco(preco: number): FaixaPreco {
  if (preco <= 15) return "ate_15";
  if (preco <= 25) return "de_15_a_25";
  return "acima_25";
}

/** Mesma regra de `slugify` em catalogo.ts: a âncora de hoje vira o slug da página do produto. */
function slugDoNome(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ids estáveis para a âncora da sugestão. Repetidos ganham sufixo -2, -3… */
export function identificarItens(grupos: readonly GrupoBusca[]): GrupoBusca[] {
  const usados = new Set<string>();
  return grupos.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.map((item) => {
      const base = item.id || slugDoNome(item.nome) || "item";
      let id = base;
      let n = 2;
      while (usados.has(id)) id = `${base}-${n++}`;
      usados.add(id);
      return { ...item, id };
    }),
  }));
}

/** Sugestões do painel: só a partir de 2 letras, na ordem do catálogo. */
export function sugerirProdutos(grupos: readonly GrupoBusca[], consulta: string, limite = 8): ItemBusca[] {
  const termo = normalizarBusca(consulta);
  if (termo.length < 2) return [];
  const vistos = new Set<string>();
  const saida: ItemBusca[] = [];
  for (const grupo of filtrarGrupos(grupos, consulta)) {
    for (const item of grupo.itens) {
      const chave = normalizarBusca(item.nome);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push(item);
      if (saida.length >= limite) return saida;
    }
  }
  return saida;
}

/** Categorias na ordem dos grupos; marcas únicas, em ordem alfabética, sem laboratório vazio. */
export function opcoesFiltro(grupos: readonly GrupoBusca[]): { categorias: string[]; marcas: string[] } {
  const marcas = new Set<string>();
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      const lab = item.lab.trim();
      if (lab) marcas.add(lab);
    }
  }
  return {
    categorias: grupos.map((grupo) => grupo.categoria),
    marcas: [...marcas].sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export function contarFiltrosAtivos(filtro: Pick<FiltroCatalogo, "categorias" | "marcas" | "faixas">): number {
  return (filtro.categorias?.length ?? 0) + (filtro.marcas?.length ?? 0) + (filtro.faixas?.length ?? 0);
}

function ordenarItens(itens: readonly ItemBusca[], ordem: OrdemCatalogo): ItemBusca[] {
  if (ordem === "recomendados") return [...itens];
  const dir = ordem === "menor_preco" ? 1 : -1;
  return [...itens].sort((a, b) => {
    const delta = (precoDoItem(a) - precoDoItem(b)) * dir;
    return delta !== 0 ? delta : a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/**
 * Texto + categoria + marca + faixa, depois a ordem.
 * Recomendados mantém os grupos. Menor/maior preço vira uma lista só, do mais barato ao mais caro (ou o contrário).
 */
export function aplicarCatalogo(grupos: readonly GrupoBusca[], filtro: FiltroCatalogo = {}): GrupoBusca[] {
  const cats = new Set((filtro.categorias ?? []).map(normalizarBusca).filter(Boolean));
  const marcas = new Set((filtro.marcas ?? []).map(normalizarBusca).filter(Boolean));
  const faixas = new Set(filtro.faixas ?? []);
  const porTexto = filtro.consultasAlternativas?.length ? filtrarGruposAlternativos(grupos, filtro.consultasAlternativas) : filtrarGrupos(grupos, filtro.consulta ?? "");
  const filtrados = porTexto
    .filter((grupo) => cats.size === 0 || cats.has(normalizarBusca(grupo.categoria)))
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => {
        if (marcas.size > 0 && !marcas.has(normalizarBusca(item.lab))) return false;
        if (faixas.size > 0 && !faixas.has(faixaDoPreco(precoDoItem(item)))) return false;
        return true;
      }),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  const ordem = filtro.ordem ?? "recomendados";
  if (ordem === "recomendados") return filtrados;
  const itens = ordenarItens(
    filtrados.flatMap((grupo) => grupo.itens),
    ordem,
  );
  if (itens.length === 0) return [];
  return [{ categoria: "Resultados", id: "resultados", itens }];
}

/** Mensagem pronta do WhatsApp para um item da lista: pede confirmação do dia, sem prometer estoque. */
export function mensagemItem(nome: string, precoFmt: string): string {
  const limpo = nome.replace(/\s+/g, " ").trim();
  return `Oi, União Farma Nações Unidas! Vi "${limpo}" (${precoFmt}) na lista do site. Pode confirmar preço e disponibilidade?`;
}

/**
 * Evento de analytics da busca. Nunca leva o texto digitado: uma busca por remédio pode revelar condição de saúde,
 * e esse tipo de dado não deve ir ao GA4 nem ao Google Ads. Só o tamanho do termo e a quantidade de resultados.
 */
export function eventoBusca(consulta: string, resultados: number): { event: "catalog_search" | "empty_search"; params: Record<string, unknown> } | null {
  const termo = normalizarBusca(consulta);
  if (termo.length < 2) return null;
  return {
    event: resultados === 0 ? "empty_search" : "catalog_search",
    params: { source: "produtos_nacoes", unit: "nacoes", term_length: termo.length, results: resultados },
  };
}

/**
 * Filtro aplicado. Só contagens: nada de nome de categoria, marca ou texto digitado.
 * Sem nenhum filtro marcado, não há evento.
 */
export function eventoFiltro(
  filtro: Pick<FiltroCatalogo, "categorias" | "marcas" | "faixas">,
  resultados: number,
): { event: "catalog_filter"; params: Record<string, unknown> } | null {
  const categories = filtro.categorias?.length ?? 0;
  const brands = filtro.marcas?.length ?? 0;
  const ranges = filtro.faixas?.length ?? 0;
  if (categories + brands + ranges === 0) return null;
  return {
    event: "catalog_filter",
    params: { source: "produtos_nacoes", unit: "nacoes", categories, brands, ranges, results: resultados },
  };
}
