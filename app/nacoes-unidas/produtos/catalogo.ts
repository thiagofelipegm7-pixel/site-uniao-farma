import catalogoEstatico from "./dados/catalogo-nacoes.json" with { type: "json" };

/**
 * Catálogo público da loja Nações Unidas. Fonte: JSON do repositório (export do DMaster, gerado por ops/catalogo-nacoes/gerar.py,
 * sem estoque, sem código de barras e sem tokens), atualizado de 3 em 3 horas pelo workflow catalogo-sync.yml com o último envio do PC
 * da loja ao Worker dmaster-catalogo. Se o Worker falhar ou os dados forem recusados, este JSON continua valendo.
 * O Worker continua disponível em fetchCatalogoNacoes, mas as páginas só leem o JSON.
 */
export const CATALOGO_NACOES_URL =
  process.env.CATALOGO_NACOES_URL?.trim() || "https://dmaster-catalogo.thiagofelipegm7.workers.dev/loja/nacoes.json";

export type CatalogoItem = { nome: string; lab: string; categoria: string; preco: number; isMIP: boolean };
export type Catalogo = { loja: string; geradoEm?: string; total?: number; itens: CatalogoItem[] };
export type CatalogoGrupo = { categoria: string; itens: CatalogoItem[] };

export const CATEGORIAS_ORDEM = [
  "Medicamentos",
  "Dermocosméticos",
  "Perfumes",
  "Infantil e Gestante",
  "Beleza",
  "Cuidado Diário",
  "Bem Estar",
  "Categoria a conferir",
];

function isItem(value: unknown): value is CatalogoItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nome === "string" &&
    v.nome.trim().length > 0 &&
    typeof v.categoria === "string" &&
    typeof v.preco === "number" &&
    Number.isFinite(v.preco) &&
    v.preco > 0
  );
}

/** Busca no servidor (sem CSP/CORS no navegador). Em erro devolve null e a página mostra o aviso de indisponível. */
export async function fetchCatalogoNacoes(fetchImpl: typeof fetch = fetch): Promise<Catalogo | null> {
  try {
    const response = await fetchImpl(CATALOGO_NACOES_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<Catalogo>;
    if (!data || !Array.isArray(data.itens)) return null;
    const itens = data.itens.filter(isItem).map((i) => ({ nome: i.nome, lab: typeof i.lab === "string" ? i.lab : "", categoria: i.categoria, preco: i.preco, isMIP: i.isMIP === true }));
    return { loja: String(data.loja ?? "nacoes"), geradoEm: typeof data.geradoEm === "string" ? data.geradoEm : undefined, total: itens.length, itens };
  } catch {
    return null;
  }
}

export function groupByCategoria(itens: CatalogoItem[]): CatalogoGrupo[] {
  const map = new Map<string, CatalogoItem[]>();
  for (const item of itens) map.set(item.categoria, [...(map.get(item.categoria) ?? []), item]);
  const rank = (c: string) => {
    const i = CATEGORIAS_ORDEM.indexOf(c);
    return i === -1 ? CATEGORIAS_ORDEM.length : i;
  };
  return [...map.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"))
    .map(([categoria, list]) => ({ categoria, itens: [...list].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) }));
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Primeiro item cujo nome vira esse slug. Sem página para medicamento fora desta lista. */
export function acharPorSlug(itens: readonly CatalogoItem[], slug: string): CatalogoItem | null {
  let alvo = slug;
  try {
    alvo = decodeURIComponent(slug);
  } catch {
    alvo = slug;
  }
  const normal = slugify(alvo);
  return itens.find((item) => slugify(item.nome) === normal) ?? null;
}

/** Catálogo estático (sem receita) já filtrado: só itens com nome e preço válidos. Sem rede, sem token. */
export function carregarCatalogoNacoes(): Catalogo {
  const bruto = catalogoEstatico as unknown as Partial<Catalogo>;
  const itens = (Array.isArray(bruto.itens) ? bruto.itens : [])
    .filter(isItem)
    .map((i) => ({ nome: i.nome, lab: typeof i.lab === "string" ? i.lab : "", categoria: i.categoria, preco: i.preco, isMIP: i.isMIP === true }));
  return { loja: "nacoes", geradoEm: typeof bruto.geradoEm === "string" ? bruto.geradoEm : undefined, total: itens.length, itens };
}

/** "2026-10-31T20:00:04" → "31/10/2026 às 20:00". */
export function formatGeradoEm(value: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}` : null;
}

/** "2026-10-31T20:00:04" → "31/10/2026". */
export function formatDataDosDados(value: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}
