import { criarLimitador } from "../../../../busca-ia-nucleo";
import { descricaoNaoPermitida } from "../../../../descricao-permitida";
import { sugerirProduto } from "../../../../ia-sugestao-servidor";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const limite = criarLimitador(40, 60_000);

/**
 * Sugere nome, marca, categoria e descrição de um produto para a equipe revisar. Não grava nada: o painel preenche os campos e a
 * equipe confirma. Só equipe logada (o middleware exige login em /api/interno/). Medicamento e afins nunca recebem descrição.
 */
export async function POST(request: Request) {
  let c: { original?: unknown; marca?: unknown; categoria?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  if (!original || original.length > 200) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  if (!limite(request.headers.get("cf-connecting-ip") ?? "equipe")) return Response.json({ ok: false, erro: "limite" }, { status: 429, headers: SEM_CACHE });

  const permitirDescricao = !descricaoNaoPermitida(original);
  const r = await sugerirProduto({ original, marca: typeof c.marca === "string" ? c.marca : "", categoria: typeof c.categoria === "string" ? c.categoria : "", permitirDescricao });
  if (r.ok) return Response.json({ ok: true, sugestao: r.sugestao, descricaoPermitida: permitirDescricao }, { headers: SEM_CACHE });
  // Rota só da equipe: o motivo técnico ajuda a achar o problema (chave inválida, cota, modelo). Nunca inclui a chave.
  return Response.json({ ok: false, erro: r.erro, motivo: r.motivo, resposta: r.resposta }, { status: r.erro === "sem_ia" ? 501 : 502, headers: SEM_CACHE });
}
