import { banco } from "../../../../estoque-fonte";
import { mapaDePalavras } from "../../../../palavras-busca";
import type { Banco } from "../../../../nomes-corrigidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Palavras de busca por produto (carregadas depois da lista, para a primeira tela sair mais leve). Painel interno; a senha é pedida pelo middleware. */
export async function GET() {
  const db = banco();
  const palavras = db ? await mapaDePalavras(db as Banco).catch(() => ({})) : {};
  return Response.json({ ok: true, palavras }, { headers: SEM_CACHE });
}
