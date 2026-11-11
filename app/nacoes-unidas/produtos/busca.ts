/** Filtro local do catálogo de produtos (sem rede): ignora acento e caixa, todos os termos precisam aparecer. */
import type { ItemRestrito } from "./receita";

export type ItemBusca = {
  nome: string;
  lab: string;
  precoFmt: string;
  /** Preço em reais. Se faltar, a faixa e a ordenação leem `precoFmt`. */
  preco?: number;
  isMIP: boolean;
  /** Unidades que restam (1 a 5). */
  restam?: number;
  /** Estoque zero: aparece com o selo "Esgotado" e sem botão de cesta. */
  esgotado?: boolean;
  foto: string | null;
  /** Âncora estável (`slugify` do nome). A página do produto ainda não existe: a sugestão rola até o item. */
  id?: string;
  /** Slug da página do produto (do nome original do catálogo; o nome de exibição pode gerar outro). */
  slug?: string;
  /** Categoria dentro do departamento (árvore de categorias), ex.: "Desodorantes". */
  tipo?: string;
  /** Medicamento com receita ou controlado: o cartão usa a ficha restrita (receita, retenção, cesta só para retirada). */
  restrito?: ItemRestrito;
};
export type GrupoBusca = { categoria: string; id: string; itens: ItemBusca[] };

/**
 * Termos do painel "Termos mais buscados" (campo de busca vazio).
 * Lista curada manualmente pela loja — não é ranking real de buscas do site.
 * Edite aqui para trocar a ordem ou os termos (até 10).
 */
export const BUSCAS_POPULARES = [
  "fralda",
  "protetor solar",
  "desodorante",
  "sabonete líquido",
  "dove",
  "fralda xg",
  "shampoo",
  "dipirona",
  "valda",
  "lenço umedecido",
] as const;

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
  /** Categoria dentro do departamento (nível 2 da árvore). */
  tipos?: readonly string[];
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

const PALAVRAS_DE_LIGACAO = new Set(["de", "da", "do", "das", "dos", "para", "pra", "com", "em", "no", "na"]);

/**
 * Palavras da busca como o cliente digita: sem as de ligação ("teste de covid" busca "teste" e "covid"), desde que sobre alguma palavra.
 * Só a busca do cliente usa; `termosDeBusca` continua igual para quem casa nomes de medicamento (receita).
 */
export function termosDaConsulta(consulta: string): string[] {
  // Hífen e barra separam palavras ("covid-19" vira "covid" e "19"), como nos arquivos de busca.
  const todos = termosDeBusca(consulta.replace(/[-/]/g, " "));
  const uteis = todos.filter((t) => !PALAVRAS_DE_LIGACAO.has(t));
  return uteis.length > 0 ? uteis : todos;
}

/**
 * Palavras que o cliente usa e que não estão no nome do produto (o nome vem do sistema da loja). Entram só na busca, nunca na tela.
 * O gerador dos arquivos de busca (scripts/gerar-assets-catalogo.mjs) tem a mesma tabela; um teste confere que as duas saem iguais.
 */
export const SINONIMOS_BUSCA: ReadonlyArray<readonly [RegExp, string]> = [[/covid|sars/i, "teste rapido antigeno coronavirus sars cov 2 autoteste"]];

export function sinonimosDe(nome: string): string {
  return SINONIMOS_BUSCA.filter(([rx]) => rx.test(nome)).map(([, extra]) => extra).join(" ");
}

/** Como `filtrarGrupos`, mas o produto pode casar com qualquer uma das buscas (OU entre elas, E entre as palavras de cada uma). */
export function filtrarGruposAlternativos(grupos: readonly GrupoBusca[], consultas: readonly string[]): GrupoBusca[] {
  const listas = consultas.map(termosDaConsulta).filter((termos) => termos.length > 0);
  if (listas.length === 0) return grupos.map((grupo) => ({ ...grupo, itens: [...grupo.itens] }));
  return grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => listas.some((termos) => combina(termos, item.nome, item.lab, grupo.categoria, sinonimosDe(item.nome)))) }))
    .filter((grupo) => grupo.itens.length > 0);
}

/** Sem termo devolve tudo. Com termo, procura em nome, laboratório e categoria; grupos sem resultado somem. */
export function filtrarGrupos(grupos: readonly GrupoBusca[], consulta: string): GrupoBusca[] {
  const termos = termosDaConsulta(consulta);
  if (termos.length === 0) return grupos.map((grupo) => ({ ...grupo, itens: [...grupo.itens] }));
  return grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => combina(termos, item.nome, item.lab, grupo.categoria, sinonimosDe(item.nome))) }))
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
export function opcoesFiltro(grupos: readonly GrupoBusca[]): { categorias: string[]; marcas: string[]; tipos: string[] } {
  const marcas = new Set<string>();
  const tipos = new Set<string>();
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      const lab = item.lab.trim();
      if (lab) marcas.add(lab);
      if (item.tipo) tipos.add(item.tipo);
    }
  }
  return {
    categorias: grupos.map((grupo) => grupo.categoria),
    marcas: [...marcas].sort((a, b) => a.localeCompare(b, "pt-BR")),
    // "Outros" sempre por último; só há filtro de tipo quando existe mais de um.
    tipos: tipos.size > 1 ? [...tipos].sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : a.localeCompare(b, "pt-BR"))) : [],
  };
}

export function contarFiltrosAtivos(filtro: Pick<FiltroCatalogo, "categorias" | "marcas" | "faixas" | "tipos">): number {
  return (filtro.categorias?.length ?? 0) + (filtro.marcas?.length ?? 0) + (filtro.faixas?.length ?? 0) + (filtro.tipos?.length ?? 0);
}

function ordenarItens(itens: readonly ItemBusca[], ordem: OrdemCatalogo): ItemBusca[] {
  if (ordem === "recomendados") return [...itens];
  const dir = ordem === "menor_preco" ? 1 : -1;
  return [...itens].sort((a, b) => {
    // Esgotados vão para o fim, qualquer que seja a ordem.
    const fim = Number(a.esgotado === true) - Number(b.esgotado === true);
    if (fim !== 0) return fim;
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
  const tipos = new Set((filtro.tipos ?? []).map(normalizarBusca).filter(Boolean));
  const porTexto = filtro.consultasAlternativas?.length ? filtrarGruposAlternativos(grupos, filtro.consultasAlternativas) : filtrarGrupos(grupos, filtro.consulta ?? "");
  const filtrados = porTexto
    .filter((grupo) => cats.size === 0 || cats.has(normalizarBusca(grupo.categoria)))
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => {
        if (marcas.size > 0 && !marcas.has(normalizarBusca(item.lab))) return false;
        if (tipos.size > 0 && !tipos.has(normalizarBusca(item.tipo ?? ""))) return false;
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
  filtro: Pick<FiltroCatalogo, "categorias" | "marcas" | "faixas" | "tipos">,
  resultados: number,
): { event: "catalog_filter"; params: Record<string, unknown> } | null {
  const categories = filtro.categorias?.length ?? 0;
  const brands = filtro.marcas?.length ?? 0;
  const ranges = filtro.faixas?.length ?? 0;
  const types = filtro.tipos?.length ?? 0;
  if (categories + brands + ranges + types === 0) return null;
  return {
    event: "catalog_filter",
    params: { source: "produtos_nacoes", unit: "nacoes", categories, brands, ranges, types, results: resultados },
  };
}
