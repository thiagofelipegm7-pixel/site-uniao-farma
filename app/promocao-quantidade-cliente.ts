import type { PromocaoQuantidade } from "./promocao-quantidade-tipos";

let cache: { expira: number; dados: PromocaoQuantidade[] } | null = null;
let carregando: Promise<PromocaoQuantidade[]> | null = null;

/** Compartilha a leitura das faixas de preço entre a página do produto e a cesta. */
export function carregarPromocoesQuantidade(): Promise<PromocaoQuantidade[]> {
  if (cache && cache.expira > Date.now()) return Promise.resolve(cache.dados);
  if (carregando) return carregando;
  carregando = fetch("/api/promocoes-quantidade", { cache: "no-store" })
    .then((resposta) => resposta.ok ? resposta.json() as Promise<{ promocoes?: PromocaoQuantidade[] }> : Promise.reject(new Error("Falha ao buscar promoções")))
    .then((resultado) => {
      const dados = Array.isArray(resultado.promocoes) ? resultado.promocoes : [];
      cache = { dados, expira: Date.now() + 30_000 };
      return dados;
    })
    .finally(() => { carregando = null; });
  return carregando;
}
