import { nomeDeExibicao } from "../../nome-exibicao";
import { fetchCatalogoNacoes, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../../nacoes-unidas/produtos/imagens";

export const dynamic = "force-dynamic";

/** Destaques da home: até 6 itens do catálogo da Nações, preferindo os que têm foto. Preço sempre do dia (cache de 5 min). */
export async function GET() {
  const catalogo = await fetchCatalogoNacoes();
  const itens = (catalogo?.itens ?? [])
    .map((item) => ({
      nome: nomeDeExibicao(item.nome),
      slug: slugify(item.nome),
      precoCentavos: Math.round(item.preco * 100),
      foto: fotoDoProduto(item.nome),
    }))
    .sort((a, b) => Number(b.foto !== null) - Number(a.foto !== null))
    .slice(0, 6);
  return Response.json({ itens }, { headers: { "cache-control": "public, max-age=300" } });
}
