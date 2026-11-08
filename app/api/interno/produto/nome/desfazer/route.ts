import { dispararSincronizacao } from "../../../../../disparar-sync";
import { banco } from "../../../../../estoque-fonte";
import { desfazerNome } from "../../../../../nomes-corrigidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Volta ao nome automático (desfaz a correção). Só equipe logada. */
export async function POST(request: Request) {
  let c: { original?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  if (!original || por.length < 2 || por.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  if (!(await desfazerNome(db, original, por))) return Response.json({ ok: false, erro: "nao_havia_correcao" }, { status: 404, headers: SEM_CACHE });
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, publicando }, { headers: SEM_CACHE });
}
