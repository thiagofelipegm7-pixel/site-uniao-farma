import { banco } from "../../../estoque-fonte";
import { lerPainelPedidos } from "../../../pedidos-resumo";
import type { Banco } from "../../../nomes-corrigidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Resumo de pedidos do site (hoje, 7 e 30 dias). Só equipe logada: o middleware protege todo /api/interno/. */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  try {
    return Response.json({ ok: true, ...(await lerPainelPedidos(db, Date.now())) }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_ler" }, { status: 503, headers: SEM_CACHE });
  }
}
