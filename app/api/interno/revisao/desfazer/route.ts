import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { desfazer, TIPOS_APROVACAO, type TipoAprovacao } from "../../../../revisao";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Desfaz uma aprovação (volta o item para a fila na próxima publicação). Só equipe logada. */
export async function POST(request: Request) {
  let c: { chave?: unknown; tipo?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const chave = typeof c.chave === "string" ? c.chave : "";
  const tipo = (TIPOS_APROVACAO as readonly string[]).includes(String(c.tipo)) ? (c.tipo as TipoAprovacao) : null;
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  if (!chave || !tipo || por.length < 2 || por.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const feito = await desfazer(db, chave, tipo, por);
  if (!feito) return Response.json({ ok: false, erro: "nao_havia_aprovacao" }, { status: 404, headers: SEM_CACHE });
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, publicando }, { headers: SEM_CACHE });
}
