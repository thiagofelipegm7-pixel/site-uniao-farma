import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { definirPalavras, limparPalavras } from "../../../../palavras-busca";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Escreve (ou apaga) as palavras de busca de um produto: só a busca usa, o cliente não as lê. Registra quem e o valor anterior. Só equipe logada. */
export async function POST(request: Request) {
  let c: { original?: unknown; palavras?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 ? por : "painel";
  if (!original || original.length > 200 || quem.length > 60 || (c.palavras !== null && c.palavras !== undefined && typeof c.palavras !== "string")) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const palavras = limparPalavras(c.palavras ?? "", original);
  await definirPalavras(db, original, palavras, "equipe", quem);
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, palavras: palavras.join(", "), publicando }, { headers: SEM_CACHE });
}
