import { banco } from "../../../estoque-fonte";
import { gravarDestino, validarDestino, type BancoBanner } from "../../../banners-gravacao";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

// Salva para qual produto a vaga do banner leva. Só o slug do índice é gravado (nada de texto livre).
export async function POST(req: Request) {
  const db = banco() as BancoBanner | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const v = validarDestino(await req.json().catch(() => ({})));
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: v.status, headers: SEM_CACHE });
  try {
    await gravarDestino(db, v.id, v.slug);
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
