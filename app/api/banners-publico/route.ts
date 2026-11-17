import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "public, max-age=60" };

type Consulta = { prepare: (sql: string) => { bind: (...v: unknown[]) => { all: <T>() => Promise<{ results: T[] }> } } };

// Arte de cada vaga + destino (o mais recente de cada vaga): termo de busca e/ou slug do produto no índice.
export async function GET() {
  const db = banco() as Consulta | null;
  if (!db) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  try {
    const artes = await db.prepare("SELECT intent as id, source as url FROM metric_hits WHERE stage = ?").bind("banner").all<{ id: string; url: string }>();
    const destinos = await db.prepare("SELECT intent as id, source as slug FROM metric_hits WHERE stage = ? ORDER BY id").bind("banner-link").all<{ id: string; slug: string }>();
    const slugPorVaga = new Map<string, string>();
    for (const d of destinos.results ?? []) slugPorVaga.set(d.id, d.slug);
    // Termo de busca de cada vaga (painel interno). Se a consulta falhar, os banners continuam saindo, só sem termo.
    const buscaPorVaga = new Map<string, string>();
    try {
      const buscas = await db.prepare("SELECT intent as id, source as busca FROM metric_hits WHERE stage = ? ORDER BY id").bind("banner-busca").all<{ id: string; busca: string }>();
      for (const d of buscas.results ?? []) buscaPorVaga.set(d.id, d.busca);
    } catch {
      // sem termo
    }
    const banners = (artes.results ?? []).map((b) => ({ id: b.id, url: b.url, slug: slugPorVaga.get(b.id) ?? null, busca: buscaPorVaga.get(b.id) ?? null }));
    return Response.json({ banners }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}
