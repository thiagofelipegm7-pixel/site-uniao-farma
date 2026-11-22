export type FaixaPromocaoQuantidade = { quantidade: number; precoUnitarioCentavos: number };

/**
 * Faixas novas convivem com os campos antigos para que cestas já salvas no navegador
 * continuem calculando o preço até o cliente atualizar o catálogo.
 */
export type PromocaoQuantidade = {
  slug: string;
  nome?: string;
  faixas?: FaixaPromocaoQuantidade[];
  quantidade?: number;
  precoUnitarioCentavos?: number;
};

export type RegraPromocaoQuantidade = Pick<PromocaoQuantidade, "faixas" | "quantidade" | "precoUnitarioCentavos">;

export function faixasDaPromocao(promocao: RegraPromocaoQuantidade | null | undefined): FaixaPromocaoQuantidade[] {
  if (!promocao) return [];
  const faixas = Array.isArray(promocao.faixas) ? promocao.faixas : [];
  if (faixas.length) return faixas.filter((f) => Number.isInteger(f.quantidade) && f.quantidade > 0 && Number.isInteger(f.precoUnitarioCentavos) && f.precoUnitarioCentavos > 0).sort((a, b) => a.quantidade - b.quantidade);
  if (Number.isInteger(promocao.quantidade) && Number.isInteger(promocao.precoUnitarioCentavos) && (promocao.quantidade ?? 0) > 0 && (promocao.precoUnitarioCentavos ?? 0) > 0) {
    return [{ quantidade: promocao.quantidade as number, precoUnitarioCentavos: promocao.precoUnitarioCentavos as number }];
  }
  return [];
}

/** Seleciona o menor preço já atingido pela quantidade atual. */
export function faixaAplicavel(promocao: RegraPromocaoQuantidade | null | undefined, quantidade: number): FaixaPromocaoQuantidade | undefined {
  return faixasDaPromocao(promocao).filter((f) => quantidade >= f.quantidade).at(-1);
}

export function proximaFaixa(promocao: RegraPromocaoQuantidade | null | undefined, quantidade: number): FaixaPromocaoQuantidade | undefined {
  return faixasDaPromocao(promocao).find((f) => quantidade < f.quantidade);
}
