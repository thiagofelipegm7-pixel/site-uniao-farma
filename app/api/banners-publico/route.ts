import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "public, max-age=60" };

type Banner = { id: string; url: string };

/** Banners públicos (sem autenticação). */
export async function GET() {
  const db = banco() as { prepare: (sql: string) => { all: <T>() => Promise<{ results: T[] }> } } | null;
  if (!db) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  try {
    const rows = await db.prepare("SELECT id, url FROM banners").all<Banner>();
    return Response.json({ banners: rows.results ?? [] }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}
