import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { aprovar, validarPedido, type ItemDaFila } from "../../../../revisao";
import fila from "../../../../nacoes-unidas/produtos/dados/revisao-pendente.json";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Aprova um item da fila (registra quem, quando e o motivo) e pede a publicação. Só equipe logada. */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const v = validarPedido(corpo, (fila as { itens: ItemDaFila[] }).itens);
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  await aprovar(db, v.pedido);
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, publicando }, { headers: SEM_CACHE });
}
