import { nomeDeExibicao } from "../../nome-exibicao";
import { carregarCatalogoNacoes, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../../nacoes-unidas/produtos/imagens";

export const dynamic = "force-dynamic";

/**
 * Vitrines da home e da cesta: itens do catálogo da Nações, preferindo os que têm foto.
 * `?grupo=<slug da categoria>` filtra por categoria, `?lab=<marca>` por marca (igual, sem diferenciar caixa),
 * `?ate=<centavos>` por preço máximo e `?n=<1..12>` limita a quantidade (padrão 6).
 * Preço sempre do dia (cache de 5 min).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const grupo = (params.get("grupo") ?? "").slice(0, 80);
  const lab = (params.get("lab") ?? "").slice(0, 80).trim().toLowerCase();
  const ate = Math.floor(Number(params.get("ate"))) || 0;
  const n = Math.min(12, Math.max(1, Math.floor(Number(params.get("n"))) || 6));
  const catalogo = carregarCatalogoNacoes();
  const itens = (catalogo?.itens ?? [])
    .filter((item) => !grupo || slugify(item.categoria) === grupo)
    .filter((item) => !lab || item.lab.replace(/\s+/g, " ").trim().toLowerCase() === lab)
    .filter((item) => !ate || Math.round(item.preco * 100) <= ate)
    .map((item) => ({
      nome: nomeDeExibicao(item.nome),
      slug: slugify(item.nome),
      lab: item.lab,
      precoCentavos: Math.round(item.preco * 100),
      foto: fotoDoProduto(item.nome),
    }))
    .sort((a, b) => Number(b.foto !== null) - Number(a.foto !== null))
    .slice(0, n);
  return Response.json({ itens }, { headers: { "cache-control": "public, max-age=300" } });
}
