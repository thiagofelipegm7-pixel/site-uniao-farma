import { descricaoNaoPermitida } from "../../../../descricao-permitida";
import { segredo } from "../../../../estoque-fonte";
import { chamarGeminiComMotivo, esquemaParaGemini, MODELO_GEMINI_TEXTO, modeloEscolhido } from "../../../../gemini-nucleo";
import { criarLimitador, conteudoDaRespostaIA } from "../../../../busca-ia-nucleo";
import { ESQUEMA_SUGESTAO, limparSugestao, PROMPT_SUGESTAO } from "../../../../ia-sugestao-nucleo";
import { nomeDeExibicao } from "../../../../nome-exibicao";
import { CATEGORIAS_VALIDAS } from "../../../../revisao";

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
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) return Response.json({ ok: false, erro: "sem_ia" }, { status: 501, headers: SEM_CACHE });
  if (!limite(request.headers.get("cf-connecting-ip") ?? "equipe")) return Response.json({ ok: false, erro: "limite" }, { status: 429, headers: SEM_CACHE });

  const permitirDescricao = !descricaoNaoPermitida(original);
  const categorias = [...CATEGORIAS_VALIDAS] as string[];
  const entrada = JSON.stringify({
    nome_sistema: original,
    marca_atual: typeof c.marca === "string" ? c.marca.slice(0, 60) : "",
    categoria_atual: typeof c.categoria === "string" ? c.categoria.slice(0, 40) : "",
    categorias,
    descricao: permitirDescricao,
    nome_atual_no_site: nomeDeExibicao(original),
  });
  const r = await chamarGeminiComMotivo({
    modelo: modeloEscolhido(segredo("GEMINI_MODELO_PAINEL"), MODELO_GEMINI_TEXTO),
    chave,
    sistema: PROMPT_SUGESTAO,
    texto: entrada,
    maxTokens: 500,
    ms: 12_000,
    esquema: esquemaParaGemini(ESQUEMA_SUGESTAO),
  });
  // Rota só da equipe: o motivo técnico ajuda a achar o problema (chave inválida, cota, modelo). Nunca inclui a chave.
  if (!r.ok) return Response.json({ ok: false, erro: "falha_ia", motivo: r.motivo }, { status: 502, headers: SEM_CACHE });
  const sugestao = limparSugestao(conteudoDaRespostaIA({ response: r.response }), { original, categorias, permitirDescricao });
  if (!sugestao) return Response.json({ ok: false, erro: "sem_sugestao", motivo: "resposta_reprovada", resposta: r.response.slice(0, 300) }, { status: 502, headers: SEM_CACHE });
  return Response.json({ ok: true, sugestao, descricaoPermitida: permitirDescricao }, { headers: SEM_CACHE });
}
