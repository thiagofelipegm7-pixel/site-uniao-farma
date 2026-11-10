import { banco } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banner = { id: string; url: string; atualizado: string };

async function garantirTabela(db: ReturnType<typeof banco>) {
  if (!db) return;
  try {
    await (db as { exec: (sql: string) => Promise<unknown> }).exec("CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, url TEXT, atualizado TEXT)");
  } catch {}
}

export async function GET() {
  const db = banco();
  if (!db) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  await garantirTabela(db);
  try {
    const rows = await (db as { prepare: (sql: string) => { all: <T>() => Promise<{ results: T[] }> } }).prepare("SELECT id, url, atualizado FROM banners").all<Banner>();
    return Response.json({ banners: rows.results ?? [] }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}

export async function POST(req: Request) {
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  await garantirTabela(db);
  const body = (await req.json().catch(() => ({}))) as { id?: string; url?: string };
  if (!body.id || !body.url) return Response.json({ ok: false, erro: "faltando" }, { status: 400, headers: SEM_CACHE });
  try {
    await (db as { prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } } }).prepare("INSERT OR REPLACE INTO banners (id, url, atualizado) VALUES (?, ?, ?)").bind(body.id, body.url, new Date().toISOString()).run();
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: "banco", detalhe: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
