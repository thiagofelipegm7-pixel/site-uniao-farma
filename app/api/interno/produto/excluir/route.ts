import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { removerProduto, restaurarProduto } from "../../../../produtos-removidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/**
 * Tira o produto do site (ou devolve, com `restaurar`). O nome do sistema da loja é a chave; o item continua no PC.
 * Só equipe logada: o middleware pede a senha da equipe para esta rota. Registra quem e quando.
 */
export async function POST(request: Request) {
  let c: { nome?: unknown; por?: unknown; restaurar?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const nome = typeof c.nome === "string" ? c.nome.replace(/\s+/g, " ").trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 ? por : "painel";
  if (!nome || nome.length > 200 || quem.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  try {
    if (c.restaurar === true) await restaurarProduto(db, nome, quem);
    else await removerProduto(db, nome, quem);
  } catch {
    return Response.json({ ok: false, erro: "falha" }, { status: 500, headers: SEM_CACHE });
  }
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, publicando }, { headers: SEM_CACHE });
}
