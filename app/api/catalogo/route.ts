import { nomeDeExibicao } from "../../nome-exibicao";
import { normalizarBusca } from "../../nacoes-unidas/produtos/busca";
import { fetchCatalogoNacoes, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../../nacoes-unidas/produtos/imagens";

export const dynamic = "force-dynamic";

/** Catálogo enxuto para as sugestões da busca do cabeçalho: nome de exibição, preço do dia e foto. Cache de 5 min. */
export async function GET() {
  const catalogo = await fetchCatalogoNacoes();
  const itens = (catalogo?.itens ?? []).slice(0, 600).map((item) => {
    const nome = nomeDeExibicao(item.nome);
    return {
      nome,
      slug: slugify(item.nome),
      precoCentavos: Math.round(item.preco * 100),
      foto: fotoDoProduto(item.nome),
      busca: normalizarBusca(`${nome} ${item.nome} ${item.lab} ${item.categoria}`),
    };
  });
  return Response.json({ itens }, { headers: { "cache-control": "public, max-age=300" } });
}
