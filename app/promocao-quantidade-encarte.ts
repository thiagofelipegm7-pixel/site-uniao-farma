import { ENCARTES_VALIDO_ATE, ENCARTES_VALIDO_DE, periodoOfertaAberto } from "./shop/ofertas-config";
import type { FaixaPromocaoQuantidade } from "./promocao-quantidade-tipos";

/** "Leve 3" do encarte de Black Friday, no mesmo formato do painel de promoções por quantidade. */
export type PromocaoQuantidadeEncarte = {
  slug: string;
  faixas: FaixaPromocaoQuantidade[];
  validoDe?: string;
  validoAte?: string;
};

export const PROMOCOES_QUANTIDADE_ENCARTES: readonly PromocaoQuantidadeEncarte[] = [
  { slug: "nimesulida-100mg-cx-12cpr-globo-pharma", faixas: [{ quantidade: 3, precoUnitarioCentavos: 333 }], validoDe: ENCARTES_VALIDO_DE, validoAte: ENCARTES_VALIDO_ATE },
  { slug: "losartana-50mg-cx-30cpr-teuto", faixas: [{ quantidade: 3, precoUnitarioCentavos: 333 }], validoDe: ENCARTES_VALIDO_DE, validoAte: ENCARTES_VALIDO_ATE },
  { slug: "nevralgex-cartela-10-cp", faixas: [{ quantidade: 3, precoUnitarioCentavos: 298 }], validoDe: ENCARTES_VALIDO_DE, validoAte: ENCARTES_VALIDO_ATE },
  { slug: "narix-0-5mg-fr-30ml-adulto", faixas: [{ quantidade: 3, precoUnitarioCentavos: 333 }], validoDe: ENCARTES_VALIDO_DE, validoAte: ENCARTES_VALIDO_ATE },
];

export function promocoesQuantidadeEncarteVigentes(now = new Date()): PromocaoQuantidadeEncarte[] {
  return PROMOCOES_QUANTIDADE_ENCARTES.filter((item) => periodoOfertaAberto(item.validoDe, item.validoAte, now));
}
