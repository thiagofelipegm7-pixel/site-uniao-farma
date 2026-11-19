import { POST as lerReceitaIA } from "../../receita-ia/route";
import { nomeDeExibicao } from "../../../nome-exibicao";
import { casarReceita, prepararCatalogo, type CatalogoReceita, type ProdutoNormal, type ProdutoRestrito } from "../../../nacoes-unidas/produtos/receita-casar";
import { idsDoAplicativo } from "../../../android-ids";

export const dynamic = "force-dynamic";

/**
 * Receita por foto no app: a mesma leitura (IA) e a mesma escolha de produtos do site, feitas no servidor.
 * A foto não é gravada: vai na requisição, é lida e descartada. Só volta nome, dose e o que a loja tem no catálogo.
 */
let catalogoEmMemoria: Promise<CatalogoReceita> | null = null;

function carregarCatalogo(origem: string): Promise<CatalogoReceita> {
  if (!catalogoEmMemoria) {
    const pegar = async <T,>(caminho: string): Promise<T[]> => {
      const r = await fetch(new URL(caminho, origem), { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error("catalogo");
      const dados: unknown = await r.json();
      if (!Array.isArray(dados)) throw new Error("catalogo");
      return dados as T[];
    };
    catalogoEmMemoria = Promise.all([
      pegar<ProdutoNormal>("/dados/nacoes/catalogo-busca.json"),
      pegar<ProdutoRestrito>("/dados/nacoes/restritos-busca.json"),
    ])
      .then(([normais, restritos]) => prepararCatalogo(normais, restritos))
      .catch((erro) => {
        catalogoEmMemoria = null;
        throw erro;
      });
  }
  return catalogoEmMemoria;
}

function json(corpo: Record<string, unknown>, status: number) {
  return Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const bytes = await request.arrayBuffer();
  // Mesmos cabeçalhos (inclusive o IP do visitante, usado no limite de uso); o corpo é a própria foto.
  const pedido = new Request(request.url, { method: "POST", headers: request.headers, body: bytes });
  const leitura = await lerReceitaIA(pedido);
  if (!leitura.ok) return json({ erro: "ia", status: leitura.status }, leitura.status);

  const dados = (await leitura.json()) as { ehReceita?: boolean; medicamentos?: { nome: string; dosagem: string | null }[] };
  const lidos = Array.isArray(dados.medicamentos) ? dados.medicamentos : [];
  if (dados.ehReceita === false || lidos.length === 0) return json({ ehReceita: false, resultados: [] }, 200);

  let catalogo: CatalogoReceita;
  try {
    catalogo = await carregarCatalogo(request.url);
  } catch {
    return json({ erro: "catalogo" }, 503);
  }
  const ids = idsDoAplicativo();
  const resultados = casarReceita(catalogo, lidos).map((r) => ({
    lido: r.lido,
    status: r.status,
    entendidoComo: r.entendidoComo,
    outrasDoses: r.outrasDoses,
    itens: r.itens.map((item) => ({
      id: ids.get(item.nome) ?? item.nome,
      nome: nomeDeExibicao(item.nome),
      precoCentavos: item.precoCentavos,
    })),
  }));
  return json({ ehReceita: true, resultados }, 200);
}
