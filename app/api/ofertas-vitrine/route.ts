import { nomeDeExibicao } from "../../nome-exibicao";
import { carregarCatalogoNacoes, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../../nacoes-unidas/produtos/imagens";
import { chaveDeNome } from "../../fotos-painel";
import { OFERTAS_HOME } from "../../shop/ofertas-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalogo = carregarCatalogoNacoes();
  const porNome = new Map((catalogo?.itens ?? []).map((item) => [chaveDeNome(item.nome), item]));
  const itens = OFERTAS_HOME.flatMap((oferta) => {
    const item = porNome.get(chaveDeNome(oferta.nomeCatalogo));
    if (!item || item.esgotado) return [];

    const foto = fotoDoProduto(item.nome);
    if (!foto) return [];

    const precoCentavos = Math.round(item.preco * 100);
    const precoAnteriorCentavos = "precoAnteriorCentavos" in oferta && precoCentavos < oferta.precoAnteriorCentavos
      ? oferta.precoAnteriorCentavos
      : undefined;
    const descontoPct = precoAnteriorCentavos
      ? Math.round((1 - precoCentavos / precoAnteriorCentavos) * 100)
      : undefined;

    return [{
      nome: nomeDeExibicao(item.nome),
      slug: slugify(item.nome),
      lab: item.lab,
      precoCentavos,
      foto,
      isMIP: item.isMIP,
      ...(typeof item.restam === "number" && item.restam > 0 ? { restam: item.restam } : {}),
      ...(precoAnteriorCentavos ? { precoAnteriorCentavos, descontoPct } : {}),
    }];
  });

  return Response.json({ itens }, { headers: { "cache-control": "public, max-age=300" } });
}
