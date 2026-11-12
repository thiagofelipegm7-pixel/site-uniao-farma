import { banco } from "../../../estoque-fonte";
import { MAX_ARQUIVO_TEXTO, MAX_DATA_URL, gravarBanner, validarBanner, type BancoBanner } from "../../../banners-gravacao";

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
  const db = banco() as BancoBanner | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  // Recusa antes de ler o corpo inteiro quando o tamanho declarado já passa do limite.
  const declarado = Number(req.headers.get("content-length") || 0);
  if (declarado > MAX_DATA_URL + 1_000) return Response.json({ ok: false, erro: "arte_grande", max: MAX_ARQUIVO_TEXTO }, { status: 413, headers: SEM_CACHE });
  const v = validarBanner(await req.json().catch(() => ({})));
  if (!v.ok) return Response.json({ ok: false, erro: v.erro, max: MAX_ARQUIVO_TEXTO }, { status: v.status, headers: SEM_CACHE });
  try {
    // Grava a nova e só então remove a antiga (transação): se falhar, a arte anterior continua no ar.
    await gravarBanner(db, v.id, v.url);
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
