import { banco } from "../../../estoque-fonte";
import { gravarBusca, validarBusca, type BancoBanner } from "../../../banners-gravacao";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

// Salva o termo de busca do banner (o clique leva para /nacoes-unidas/produtos?q=termo). Termo vazio tira o termo.
export async function POST(req: Request) {
  const db = banco() as BancoBanner | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const v = validarBusca(await req.json().catch(() => ({})));
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: v.status, headers: SEM_CACHE });
  try {
    await gravarBusca(db, v.id, v.busca);
    return Response.json({ ok: true, busca: v.busca }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
