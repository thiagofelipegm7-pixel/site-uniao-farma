import { banco } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

// Fallback: store in a simple key-value using the existing metric_hits pattern
// or use a JSON file approach via the database

type Banner = { id: string; url: string };

export async function GET() {
  const db = banco() as { prepare: (sql: string) => { all: <T>() => Promise<{ results: T[] }> } } | null;
  if (!db) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  try {
    // Try the banners table first
    const rows = await db.prepare("SELECT id, url FROM banners").all<Banner>();
    return Response.json({ banners: rows.results ?? [] }, { headers: SEM_CACHE });
  } catch {
    // Table doesn't exist - return empty
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}

export async function POST(req: Request) {
  const db = banco() as { 
    prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } };
    exec: (sql: string) => Promise<unknown>;
  } | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const body = (await req.json().catch(() => ({}))) as { id?: string; url?: string };
  if (!body.id || !body.url) return Response.json({ ok: false, erro: "faltando" }, { status: 400, headers: SEM_CACHE });
  try {
    // Ensure table exists
    await db.exec("CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, url TEXT NOT NULL, atualizado TEXT NOT NULL)");
    // Insert
    await db.prepare("INSERT OR REPLACE INTO banners (id, url, atualizado) VALUES (?, ?, datetime('now'))").bind(body.id, body.url).run();
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
