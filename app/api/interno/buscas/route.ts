import { topBuscas } from "../../../busca-sem-resultado";
import { banco } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const diaBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Buscas dos últimos 30 dias que não acharam produto (só equipe logada). */
export async function GET() {
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  return Response.json({ ok: true, itens: await topBuscas(db, diaBrasilia()) }, { headers: SEM_CACHE });
}
