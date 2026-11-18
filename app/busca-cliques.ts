/**
 * Aprender com os cliques: depois de uma busca, qual produto a pessoa abriu. Com poucas repetições, o produto mais aberto para aquele
 * termo sobe um pouco na lista "Recomendados". Anônimo: guarda só o texto normalizado da busca, o endereço do produto, o dia e uma
 * contagem (sem IP, cookie ou quem clicou), por 90 dias. Termos sensíveis, números longos e e-mails são descartados (mesma regra de
 * busca-sem-resultado). O reforço é pequeno e limitado, nunca vale para medicamento e nunca passa um produto esgotado à frente de um em estoque.
 * Módulo sem Cloudflare (testável).
 */
import { termoParaRegistro } from "./busca-sem-resultado";
import type { Banco } from "./nomes-corrigidos";

export { termoParaRegistro };

/** Quantos cliques de um mesmo termo/produto no mesmo dia contam no máximo (um robô não consegue empurrar um produto sozinho). */
export const MAX_POR_DIA = 20;
/** O termo só entra no mapa com este total de cliques, e o produto só com este mínimo. */
export const MIN_TOTAL_TERMO = 5;
export const MIN_CLIQUES_PRODUTO = 2;
export const MAX_REFORCO = 24;

export type MapaCliques = Record<string, Record<string, number>>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugParaRegistro(bruto: unknown): string | null {
  return typeof bruto === "string" && bruto.length >= 3 && bruto.length <= 140 && SLUG.test(bruto) ? bruto : null;
}

/** Pontos a mais na relevância de um produto aberto `n` vezes para aquele termo: cresce devagar e para em MAX_REFORCO. */
export function reforcoPorCliques(n: number): number {
  if (!Number.isFinite(n) || n < MIN_CLIQUES_PRODUTO) return 0;
  return Math.min(MAX_REFORCO, Math.round(Math.log2(1 + n) * 8));
}

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS busca_clique (termo TEXT NOT NULL, slug TEXT NOT NULL, dia TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (termo, slug, dia))");
}

export async function registrarClique(db: Banco, termo: string, slug: string, dia: string, limpar = Math.random() < 0.02): Promise<void> {
  await garantir(db);
  await db
    .prepare(`INSERT INTO busca_clique (termo, slug, dia, n) VALUES (?, ?, ?, 1) ON CONFLICT(termo, slug, dia) DO UPDATE SET n = MIN(n + 1, ${MAX_POR_DIA})`)
    .bind(termo, slug, dia)
    .run();
  if (limpar) await db.prepare("DELETE FROM busca_clique WHERE dia < date(?, '-90 day')").bind(dia).run();
}

/** Mapa termo → produto → cliques dos últimos dias, só do que já repetiu o bastante (até 6 produtos por termo). */
export async function cliquesPorTermo(db: Banco, dia: string, dias = 60): Promise<MapaCliques> {
  await garantir(db);
  const { results } = await db
    .prepare("SELECT termo, slug, SUM(n) AS n FROM busca_clique WHERE dia >= date(?, ?) GROUP BY termo, slug HAVING SUM(n) >= ? ORDER BY termo, n DESC LIMIT 1500")
    .bind(dia, `-${dias} day`, MIN_CLIQUES_PRODUTO)
    .all<{ termo: string; slug: string; n: number }>();
  return montarMapa(results);
}

export function montarMapa(linhas: ReadonlyArray<{ termo: string; slug: string; n: number }>): MapaCliques {
  const porTermo = new Map<string, Array<{ slug: string; n: number }>>();
  for (const l of linhas) {
    if (!termoParaRegistro(l.termo) || !slugParaRegistro(l.slug) || !(l.n >= MIN_CLIQUES_PRODUTO)) continue;
    const lista = porTermo.get(l.termo) ?? [];
    lista.push({ slug: l.slug, n: l.n });
    porTermo.set(l.termo, lista);
  }
  const mapa: MapaCliques = {};
  for (const [termo, lista] of porTermo) {
    if (lista.reduce((soma, x) => soma + x.n, 0) < MIN_TOTAL_TERMO) continue;
    mapa[termo] = Object.fromEntries(lista.sort((a, b) => b.n - a.n).slice(0, 6).map((x) => [x.slug, x.n]));
  }
  return mapa;
}
