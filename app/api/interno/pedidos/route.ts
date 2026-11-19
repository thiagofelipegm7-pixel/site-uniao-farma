import { banco } from "../../../estoque-fonte";
import { lerPainelPedidos } from "../../../pedidos-resumo";
import { lerRetiradas } from "../../../retirada";
import type { Banco } from "../../../nomes-corrigidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Resumo de pedidos do site (hoje, 7 e 30 dias). Só equipe logada: o middleware protege todo /api/interno/. */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  try {
    const agora = Date.now();
    const painel = await lerPainelPedidos(db, agora);
    // Retiradas em aberto, com o link pronto do WhatsApp (só abre a conversa; quem envia é a equipe).
    const retiradas = await lerRetiradas(db, agora).catch(() => null);
    return Response.json({ ok: true, ...painel, retiradas }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_ler" }, { status: 503, headers: SEM_CACHE });
  }
}
