import { conteudoDaRespostaIA } from "./busca-ia-nucleo";
import { segredo } from "./estoque-fonte";
import { chamarGeminiComMotivo, esquemaParaGemini, MODELO_GEMINI_TEXTO, MODELO_GEMINI_VISAO, modeloEscolhido } from "./gemini-nucleo";
import { ESQUEMA_SUGESTAO, limparDescricaoPesquisada, limparSugestao, PROMPT_DESCRICAO_PESQUISADA, PROMPT_SUGESTAO, type Sugestao } from "./ia-sugestao-nucleo";
import { nomeDeExibicao } from "./nome-exibicao";
import { CATEGORIAS_VALIDAS } from "./revisao";

export type ResultadoSugestao = { ok: true; sugestao: Sugestao; fontes?: string[] } | { ok: false; erro: "sem_ia" | "falha_ia" | "sem_sugestao"; motivo?: string; resposta?: string };

/** Pede ao Gemini a sugestão de um produto (usada pelo botão do painel e pelo lote). Não grava nada. */
export async function sugerirProduto(p: { original: string; marca: string; categoria: string; permitirDescricao: boolean; ms?: number; msPesquisa?: number }): Promise<ResultadoSugestao> {
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) return { ok: false, erro: "sem_ia" };
  const categorias = [...CATEGORIAS_VALIDAS] as string[];
  const pedidoCampos = chamarGeminiComMotivo({
    modelo: modeloEscolhido(segredo("GEMINI_MODELO_PAINEL"), MODELO_GEMINI_TEXTO),
    chave,
    sistema: PROMPT_SUGESTAO,
    // Aqui a IA só propõe nome, marca e categoria; a descrição vem da pesquisa na web (abaixo) quando permitida.
    texto: JSON.stringify({ nome_sistema: p.original, marca_atual: p.marca.slice(0, 60), categoria_atual: p.categoria.slice(0, 40), categorias, descricao: false, nome_atual_no_site: nomeDeExibicao(p.original) }),
    maxTokens: 400,
    ms: p.ms ?? 12_000,
    esquema: esquemaParaGemini(ESQUEMA_SUGESTAO),
  });
  // Descrição: pesquisa na web (modelo mais forte, com busca do Google) para trazer fatos além do nome.
  const pedidoDescricao = p.permitirDescricao
    ? chamarGeminiComMotivo({
        modelo: modeloEscolhido(segredo("GEMINI_MODELO_PESQUISA"), MODELO_GEMINI_VISAO),
        chave,
        sistema: PROMPT_DESCRICAO_PESQUISADA,
        texto: `Produto (nome do sistema da loja): ${p.original}\nNome para o cliente: ${nomeDeExibicao(p.original)}\nMarca ou laboratório: ${p.marca || "não informado"}`,
        maxTokens: 700,
        ms: p.msPesquisa ?? 25_000,
        pesquisar: true,
      })
    : Promise.resolve(null);
  const [campos, desc] = await Promise.all([pedidoCampos, pedidoDescricao]);
  const sugestao: Sugestao = campos.ok ? (limparSugestao(conteudoDaRespostaIA({ response: campos.response }), { original: p.original, categorias, permitirDescricao: false }) ?? {}) : {};
  let fontes: string[] | undefined;
  let motivoDescricao = "";
  if (desc) {
    if (!desc.ok) motivoDescricao = desc.motivo;
    else {
      const limpa = limparDescricaoPesquisada(desc.response, p.original);
      if ("descricao" in limpa) {
        sugestao.descricao = limpa.descricao;
        fontes = desc.fontes;
      } else motivoDescricao = limpa.motivo;
    }
  }
  if (Object.keys(sugestao).length > 0) return { ok: true, sugestao, fontes };
  if (!campos.ok && (!desc || !desc.ok)) return { ok: false, erro: "falha_ia", motivo: !campos.ok ? campos.motivo : motivoDescricao };
  return { ok: false, erro: "sem_sugestao", motivo: motivoDescricao || "resposta_reprovada" };
}
