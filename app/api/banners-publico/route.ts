import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "public, max-age=60" };

export async function GET() {
  const db = banco() as { prepare: (sql: string) => { bind: (...v: unknown[]) => { all: <T>() => Promise<{ results: T[] }> } } } | null;
  if (!db) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  try {
    const rows = await db.prepare("SELECT intent as id, source as url FROM metric_hits WHERE stage = ?").bind("banner").all<{ id: string; url: string }>();
    return Response.json({ banners: rows.results ?? [] }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}
