import { selecionarDestaques } from "../../shop/destaques-servidor";

export const dynamic = "force-dynamic";

/**
 * Vitrines da home e da cesta: itens do catálogo da Nações, preferindo os que têm foto.
 * `?grupo=<slug da categoria>` filtra por categoria, `?lab=<marca>` por marca (igual, sem diferenciar caixa),
 * `?ate=<centavos>` por preço máximo e `?n=<1..36>` limita a quantidade (padrão 6).
 * `?fotos=1` devolve só itens com foto (a home não mostra cartão com o espaço da imagem vazio).
 * Os itens vêm pela escolha de atrativos (marca conhecida, boa faixa de preço, descrição de verdade, sem repetir marca nem família, com
 * pequena variação diária); `?ordem=catalogo` mantém a ordem antiga do catálogo.
 * `?slugs=a,b,c` (até 10) devolve esses produtos na ordem pedida, só os que ainda estão no catálogo, têm foto e NÃO são remédio
 * ("Visto recentemente" da home: preço e disponibilidade do dia; sem cache, porque a lista é da pessoa).
 * `?ordem=conversao` ("Mais pedidos"): só produtos com sinal real de compra (pedidos enviados e aberturas depois da busca), em estoque, com
 * foto e que podem ser sugeridos (nunca remédio); sem sinal suficiente devolve lista vazia e a vitrine some.
 * `?ordem=pedidos-semana`: chips da home, só pedidos reais dos últimos 7 dias (sem clique), em estoque, com foto e sem medicamento;
 * menos de 4 itens devolve lista vazia.
 * Preço sempre do dia (cache de 5 min).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { itens, semCache } = await selecionarDestaques({
    grupo: params.get("grupo") ?? undefined,
    lab: params.get("lab") ?? undefined,
    ate: Number(params.get("ate")) || undefined,
    n: Number(params.get("n")) || undefined,
    fotos: params.get("fotos") === "1",
    ordem: params.get("ordem") ?? undefined,
    slugs: (params.get("slugs") ?? "").split(","),
  });
  return Response.json({ itens }, { headers: { "cache-control": semCache ? "no-store" : "public, max-age=300" } });
}
