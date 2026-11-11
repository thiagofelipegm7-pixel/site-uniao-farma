import descricoesJson from "./dados/descricoes-ia.json" with { type: "json" };
import pesquisaJson from "./dados/descricoes-pesquisa.json" with { type: "json" };

/**
 * Descrições curtas geradas fora do site (ops/ia-catalogo), só a partir do nome, marca e categoria do item.
 * f = "ia": reescrita pelo Workers AI e aprovada pelas regras automáticas; f = "modelo": texto fixo, sem IA.
 * Nenhuma delas é texto de fabricante: servem como apoio e ficam marcadas para revisão (data-descricao-origem).
 */
export type OrigemDescricao = "ia" | "modelo" | "pesquisa";
export type DescricaoProduto = { texto: string; origem: OrigemDescricao; /** Só em "pesquisa": a página oficial de onde vieram os dados. */ fonte?: string };

/**
 * f = "pesquisa": texto escrito a partir de página oficial da marca ou do fabricante (ops: pesquisa por código de barras), só com fatos do
 * produto (tipo, tamanho, ingredientes que a marca lista, modo de uso do rótulo), sem promessa de efeito. Fica em arquivo próprio para a
 * sincronização e o gerador de IA nunca o apagarem; vale mais do que a descrição de IA do mesmo produto. Aguarda revisão da equipe.
 */
const PESQUISA = pesquisaJson as Record<string, { t: string; fonte: string; quando: string }>;

const DADOS = descricoesJson as Record<string, { t: string; f: string }>;

/** Aviso fixo dos medicamentos (sem receita ou não): neutro, sem dizer para que serve nem como usar. */
export const AVISO_BULA = "Leia a bula. Em caso de dúvida, consulte o farmacêutico.";

export function descricaoDoProduto(slug: string): DescricaoProduto | null {
  const pesquisada = PESQUISA[slug];
  if (pesquisada && typeof pesquisada.t === "string" && pesquisada.t.trim()) return { texto: pesquisada.t.trim(), origem: "pesquisa", fonte: pesquisada.fonte };
  const registro = DADOS[slug];
  if (!registro || typeof registro.t !== "string" || !registro.t.trim()) return null;
  return { texto: registro.t.trim(), origem: registro.f === "ia" ? "ia" : "modelo" };
}

/** Texto mostrado na página: a descrição e, nos medicamentos, o aviso fixo da bula. */
export function descricaoPublica(slug: string, ehMedicamento: boolean): DescricaoProduto | null {
  const base = descricaoDoProduto(slug);
  if (!base) return null;
  return { ...base, texto: ehMedicamento ? `${base.texto} ${AVISO_BULA}` : base.texto };
}
