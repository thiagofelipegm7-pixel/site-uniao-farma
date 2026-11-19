import { bairrosAndroid, bannersAndroid, catalogoAndroid, departamentosAndroid, unidadeAndroid } from "../../../android-catalogo";
import { MAX_ITENS_PRE_VENDA } from "../../../pre-vendas";
import { taxaDoBairro } from "../../../reserva/reserva-store";
import { buildWhatsAppUrl } from "../../../site-config";
import { MARCAS_DESTAQUE } from "../../../shop/marcas";

export const dynamic = "force-dynamic";

export async function GET() {
  const unidades = unidadeAndroid ? [{
    id: unidadeAndroid.id,
    nome: unidadeAndroid.shortName,
    endereco: unidadeAndroid.address,
    bairros: bairrosAndroid().map((nome) => ({ nome, taxaCentavos: taxaDoBairro(nome) })),
  }] : [];
  return Response.json({
    unidades,
    maxItens: MAX_ITENS_PRE_VENDA,
    departamentos: departamentosAndroid(),
    banners: await bannersAndroid(),
    // "Você também pode pedir por": link do WhatsApp da loja (mesmo texto e campanha da home do site).
    whatsapp: unidadeAndroid ? buildWhatsAppUrl(unidadeAndroid, "Oi, União Farma Nações Unidas! Quero fazer um pedido.", { campaign: "home", content: "alternativas" }) : null,
    marcas: MARCAS_DESTAQUE.map((m) => ({ slug: m.slug, nome: m.nome, busca: m.busca })),
    itens: unidadeAndroid ? await catalogoAndroid() : [],
  }, { headers: { "cache-control": "no-store" } });
}
