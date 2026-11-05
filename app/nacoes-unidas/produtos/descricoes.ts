import descricoesJson from "./dados/descricoes-ia.json" with { type: "json" };

/**
 * Descrições curtas geradas fora do site (ops/ia-catalogo), só a partir do nome, marca e categoria do item.
 * f = "ia": reescrita pelo Workers AI e aprovada pelas regras automáticas; f = "modelo": texto fixo, sem IA.
 * Nenhuma delas é texto de fabricante: servem como apoio e ficam marcadas para revisão (data-descricao-origem).
 */
export type OrigemDescricao = "ia" | "modelo";
export type DescricaoProduto = { texto: string; origem: OrigemDescricao };

const DADOS = descricoesJson as Record<string, { t: string; f: string }>;

/** Aviso fixo dos medicamentos (sem receita ou não): neutro, sem dizer para que serve nem como usar. */
export const AVISO_BULA = "Leia a bula. Em caso de dúvida, consulte o farmacêutico.";

export function descricaoDoProduto(slug: string): DescricaoProduto | null {
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
