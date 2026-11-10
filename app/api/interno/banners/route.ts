import { banco } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banner = { id: string; url: string };

// Usa a tabela metric_hits existente como armazenamento (stage = "banner")
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

export async function POST(req: Request) {
  const db = banco() as { prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } } } | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const body = (await req.json().catch(() => ({}))) as { id?: string; url?: string };
  if (!body.id || !body.url) return Response.json({ ok: false, erro: "faltando" }, { status: 400, headers: SEM_CACHE });
  try {
    // Remove o anterior e insere o novo
    await db.prepare("DELETE FROM metric_hits WHERE stage = ? AND intent = ?").bind("banner", body.id).run();
    await db.prepare("INSERT INTO metric_hits (day, stage, intent, source, created_at) VALUES (?, ?, ?, ?, ?)").bind(new Date().toISOString().slice(0, 10), "banner", body.id, body.url, new Date().toISOString()).run();
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
