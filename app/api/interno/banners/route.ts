import { banco } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banner = { id: string; url: string; atualizado: string };

/** Lista os banners atuais. */
export async function GET() {
  const db = banco();
  if (!db) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  try {
    const rows = await db.prepare("SELECT id, url, atualizado FROM banners").all<Banner>();
    return Response.json({ banners: rows.results ?? [] }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}

/** Grava um banner (id + url da imagem). */
export async function POST(req: Request) {
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const body = (await req.json().catch(() => ({}))) as { id?: string; url?: string };
  if (!body.id || !body.url) return Response.json({ ok: false, erro: "faltando" }, { status: 400, headers: SEM_CACHE });
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, url TEXT, atualizado TEXT)").run();
    await db.prepare("INSERT OR REPLACE INTO banners (id, url, atualizado) VALUES (?, ?, ?)").bind(body.id, body.url, new Date().toISOString()).run();
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "banco" }, { status: 500, headers: SEM_CACHE });
  }
}
