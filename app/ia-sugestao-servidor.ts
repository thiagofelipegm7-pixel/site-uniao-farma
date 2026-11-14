import { conteudoDaRespostaIA } from "./busca-ia-nucleo";
import { segredo } from "./estoque-fonte";
import { chamarGeminiComMotivo, esquemaParaGemini, MODELO_GEMINI_TEXTO, modeloEscolhido } from "./gemini-nucleo";
import { ESQUEMA_SUGESTAO, limparSugestao, PROMPT_SUGESTAO, type Sugestao } from "./ia-sugestao-nucleo";
import { nomeDeExibicao } from "./nome-exibicao";
import { CATEGORIAS_VALIDAS } from "./revisao";

export type ResultadoSugestao = { ok: true; sugestao: Sugestao } | { ok: false; erro: "sem_ia" | "falha_ia" | "sem_sugestao"; motivo?: string; resposta?: string };

/** Pede ao Gemini a sugestão de um produto (usada pelo botão do painel e pelo lote). Não grava nada. */
export async function sugerirProduto(p: { original: string; marca: string; categoria: string; permitirDescricao: boolean; ms?: number }): Promise<ResultadoSugestao> {
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) return { ok: false, erro: "sem_ia" };
  const categorias = [...CATEGORIAS_VALIDAS] as string[];
  const r = await chamarGeminiComMotivo({
    modelo: modeloEscolhido(segredo("GEMINI_MODELO_PAINEL"), MODELO_GEMINI_TEXTO),
    chave,
    sistema: PROMPT_SUGESTAO,
    texto: JSON.stringify({ nome_sistema: p.original, marca_atual: p.marca.slice(0, 60), categoria_atual: p.categoria.slice(0, 40), categorias, descricao: p.permitirDescricao, nome_atual_no_site: nomeDeExibicao(p.original) }),
    maxTokens: 500,
    ms: p.ms ?? 12_000,
    esquema: esquemaParaGemini(ESQUEMA_SUGESTAO),
  });
  if (!r.ok) return { ok: false, erro: "falha_ia", motivo: r.motivo };
  const sugestao = limparSugestao(conteudoDaRespostaIA({ response: r.response }), { original: p.original, categorias, permitirDescricao: p.permitirDescricao });
  return sugestao ? { ok: true, sugestao } : { ok: false, erro: "sem_sugestao", motivo: "resposta_reprovada", resposta: r.response.slice(0, 300) };
}
