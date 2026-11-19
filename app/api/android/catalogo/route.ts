import { bairrosAndroid, bannersAndroid, catalogoAndroid, departamentosAndroid, unidadeAndroid } from "../../../android-catalogo";
import { MAX_ITENS_PRE_VENDA } from "../../../pre-vendas";
import { taxaDoBairro } from "../../../reserva/reserva-store";

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
    itens: unidadeAndroid ? await catalogoAndroid() : [],
  }, { headers: { "cache-control": "no-store" } });
}
