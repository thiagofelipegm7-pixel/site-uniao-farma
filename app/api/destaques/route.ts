import { nomeDeExibicao } from "../../nome-exibicao";
import { carregarCatalogoNacoes, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../../nacoes-unidas/produtos/imagens";
import { ehNbcal } from "../../nacoes-unidas/produtos/produto";
import { descricaoDoProduto } from "../../nacoes-unidas/produtos/descricoes";
import { escolherAtrativos } from "../../nacoes-unidas/produtos/atrativos";

export const dynamic = "force-dynamic";

/**
 * Vitrines da home e da cesta: itens do catálogo da Nações, preferindo os que têm foto.
 * `?grupo=<slug da categoria>` filtra por categoria, `?lab=<marca>` por marca (igual, sem diferenciar caixa),
 * `?ate=<centavos>` por preço máximo e `?n=<1..36>` limita a quantidade (padrão 6).
 * `?fotos=1` devolve só itens com foto (a home não mostra cartão com o espaço da imagem vazio).
 * Os itens vêm pela escolha de atrativos (marca conhecida, boa faixa de preço, descrição de verdade, sem repetir marca nem família, com
 * pequena variação diária); `?ordem=catalogo` mantém a ordem antiga do catálogo.
 * Preço sempre do dia (cache de 5 min).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const grupo = (params.get("grupo") ?? "").slice(0, 80);
  const lab = (params.get("lab") ?? "").slice(0, 80).trim().toLowerCase();
  const ate = Math.floor(Number(params.get("ate"))) || 0;
  const soComFoto = params.get("fotos") === "1";
  const n = Math.min(36, Math.max(1, Math.floor(Number(params.get("n"))) || 6));
  const catalogo = carregarCatalogoNacoes();
  const dia = new Date().toISOString().slice(0, 10);
  const filtrados = (catalogo?.itens ?? [])
    .filter((item) => !ehNbcal(item.nome)) // NBCAL: sem vitrine nem destaque
    .filter((item) => !grupo || slugify(item.categoria) === grupo)
    .filter((item) => !lab || item.lab.replace(/\s+/g, " ").trim().toLowerCase() === lab)
    .filter((item) => !ate || Math.round(item.preco * 100) <= ate)
    .map((item) => {
      const slug = slugify(item.nome);
      const descricao = descricaoDoProduto(slug);
      return {
        nome: nomeDeExibicao(item.nome),
        nomeOriginal: item.nome,
        slug,
        lab: item.lab,
        precoCentavos: Math.round(item.preco * 100),
        foto: fotoDoProduto(item.nome),
        ...(typeof item.restam === "number" && item.restam > 0 ? { restam: item.restam } : {}),
        isMIP: item.isMIP,
        descricaoReal: descricao !== null && descricao.origem !== "modelo",
      };
    })
    .filter((item) => !soComFoto || item.foto !== null);
  const ordenados = params.get("ordem") === "catalogo"
    ? [...filtrados].sort((a, b) => Number(b.foto !== null) - Number(a.foto !== null)).slice(0, n)
    : escolherAtrativos(filtrados, n, dia, grupo === "medicamentos");
  const itens = ordenados.map(({ nome, slug, lab: marca, precoCentavos, foto }) => ({ nome, slug, lab: marca, precoCentavos, foto }));
  return Response.json({ itens }, { headers: { "cache-control": "public, max-age=300" } });
}
