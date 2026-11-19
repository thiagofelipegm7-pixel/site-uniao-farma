import { nomeDeExibicao } from "../../../nome-exibicao";
import { carregarCatalogoNacoes } from "../../../nacoes-unidas/produtos/catalogo";
import { itensCombinaCom } from "../../../nacoes-unidas/produtos/CombinaCom";
import { fotoDoProduto } from "../../../nacoes-unidas/produtos/imagens";

export const dynamic = "force-dynamic";

/**
 * "Combina com" da ficha no app: mesma escolha do site (relacionados-ia + regras de elegibilidade).
 * `?id=` é o nome bruto do produto, como o app já usa no catálogo. Sem foto aprovada, o item não entra.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const itens = carregarCatalogoNacoes()?.itens ?? [];
  const item = itens.find((i) => i.nome === id);
  const relacionados = item
    ? itensCombinaCom(itens, item)
        .map((alvo) => ({
          id: alvo.nome,
          nome: nomeDeExibicao(alvo.nome),
          precoCentavos: Math.round(alvo.preco * 100),
          foto: fotoDoProduto(alvo.nome),
        }))
        .filter((r) => r.foto !== null)
    : [];
  return Response.json({ itens: relacionados }, { headers: { "cache-control": "no-store" } });
}
