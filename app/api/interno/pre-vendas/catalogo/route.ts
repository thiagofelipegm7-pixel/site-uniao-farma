import { nomeDeExibicao } from "../../../../nome-exibicao";
import { normalizarBusca } from "../../../../nacoes-unidas/produtos/busca";
import { carregarCatalogoNacoes, slugify } from "../../../../nacoes-unidas/produtos/catalogo";
import { buscarNoCatalogo } from "../../../../pedido-edicao";

export const dynamic = "force-dynamic";

type Indexado = { slug: string; nome: string; precoCentavos: number; busca: string };
let indice: Indexado[] | null = null;

function indexar(): Indexado[] {
  if (indice) return indice;
  indice = carregarCatalogoNacoes().itens.map((item) => {
    const nome = nomeDeExibicao(item.nome);
    return { slug: slugify(item.nome), nome, precoCentavos: Math.round(item.preco * 100), busca: normalizarBusca(`${nome} ${item.nome} ${item.lab}`) };
  });
  return indice;
}

/** Busca no catálogo do site para a equipe incluir um item num pedido (protegida pelo login da equipe no middleware). Preço do catálogo, sem destaque. */
export async function GET(request: Request) {
  const termo = (new URL(request.url).searchParams.get("q") || "").slice(0, 80);
  const achados = buscarNoCatalogo(indexar(), termo, normalizarBusca).map(({ slug, nome, precoCentavos }) => ({ slug, nome, precoCentavos }));
  return Response.json({ ok: true, itens: achados }, { headers: { "cache-control": "no-store" } });
}
