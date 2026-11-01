/** Catálogo público da loja Nações Unidas (Worker dmaster-catalogo): só seleção sem receita, sem estoque. */
export const CATALOGO_NACOES_URL =
  process.env.CATALOGO_NACOES_URL?.trim() || "https://dmaster-catalogo.thiagofelipegm7.workers.dev/loja/nacoes.json";

export type CatalogoItem = { nome: string; lab: string; categoria: string; preco: number; isMIP: boolean };
export type Catalogo = { loja: string; geradoEm?: string; total?: number; itens: CatalogoItem[] };
export type CatalogoGrupo = { categoria: string; itens: CatalogoItem[] };

export const CATEGORIAS_ORDEM = [
  "Perfumaria e higiene",
  "Pele e proteção solar",
  "Suplementos e alimentos",
  "Medicamentos isentos de prescrição",
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
