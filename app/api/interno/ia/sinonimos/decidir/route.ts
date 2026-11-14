import { disparar } from "../../palavras/disparo";
import { banco } from "../../../../../estoque-fonte";
import { acrescentarPalavra } from "../../../../../palavras-busca";
import { lerSinonimo, marcarSinonimo } from "../../../../../sinonimos-ia";
import { produtosBuscaveis, produtosDaAlternativa } from "../../../../../sinonimos-ia-servidor";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/**
 * Aprova ou descarta um sinônimo sugerido (só equipe logada). Aprovar acrescenta o termo digitado às palavras de busca dos produtos
 * da alternativa escolhida (nunca remédio), com histórico; a busca passa a achar direto depois da próxima publicação.
 */
export async function POST(request: Request) {
  let c: { termo?: unknown; estado?: unknown; alternativa?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const termo = typeof c.termo === "string" ? c.termo.trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 && por.length <= 60 ? por : "painel";
  if (!termo || termo.length > 60 || (c.estado !== "aprovado" && c.estado !== "descartado")) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const sug = await lerSinonimo(db, termo);
  if (!sug || sug.estado !== "pendente") return Response.json({ ok: false, erro: "nao_encontrado" }, { status: 404, headers: SEM_CACHE });
  if (c.estado === "descartado") {
    await marcarSinonimo(db, termo, "descartado");
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  }
  const alternativa = typeof c.alternativa === "string" ? c.alternativa : "";
  if (!sug.alternativas.some((a) => a.t === alternativa)) return Response.json({ ok: false, erro: "alternativa_invalida" }, { status: 400, headers: SEM_CACHE });
  const { itens } = await produtosBuscaveis(db);
  const nomes = produtosDaAlternativa(itens, alternativa);
  let acrescentados = 0;
  for (const nome of nomes) if (await acrescentarPalavra(db, nome, termo, quem)) acrescentados++;
  await marcarSinonimo(db, termo, "aprovado");
  if (acrescentados > 0) await disparar(db);
  return Response.json({ ok: true, produtos: acrescentados }, { headers: SEM_CACHE });
}
