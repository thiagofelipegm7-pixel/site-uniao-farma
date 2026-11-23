import { idsDoAplicativo } from "../../../android-ids";
import { aplicarCatalogo, filtrarGrupos } from "../../../nacoes-unidas/produtos/busca";
import { gruposDoIndice, indiceValido, type BuscaIndice } from "../../../nacoes-unidas/produtos/busca-index";
import { calcularFacetas, predicadoFiltros, type FiltrosLista, type Selecoes } from "../../../nacoes-unidas/produtos/facetas-calculo";

export const dynamic = "force-dynamic";

/** Índice da busca (o mesmo arquivo que a página de produtos usa), guardado em memória por instância. */
let indiceEmMemoria: Promise<BuscaIndice> | null = null;

function carregarIndice(origem: string): Promise<BuscaIndice> {
  if (!indiceEmMemoria) {
    indiceEmMemoria = fetch(new URL("/dados/nacoes/busca-index.json", origem), { headers: { accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error("indice");
        const dados: unknown = await r.json();
        if (!indiceValido(dados)) throw new Error("indice");
        return dados;
      })
      .catch((erro) => {
        indiceEmMemoria = null;
        throw erro;
      });
  }
  return indiceEmMemoria;
}

function json(corpo: Record<string, unknown>, status: number) {
  return Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
}

/** Número de preço vindo da URL (em reais), ou undefined se faltar ou não for número. */
function precoDaUrl(valor: string | null): number | undefined {
  if (!valor) return undefined;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Lista de produtos da busca do app, igual à página de produtos do site: texto, departamento, filtros (facetas) e preço.
 * Devolve as seções de filtro com as contagens e os ids dos produtos, na mesma ordem do site.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const consulta = (p.get("q") ?? "").slice(0, 120);
  const departamento = (p.get("dep") ?? "").slice(0, 80) || undefined;

  let selecoes: Selecoes = {};
  try {
    const bruto = JSON.parse(p.get("sel") ?? "{}");
    if (bruto && typeof bruto === "object") selecoes = bruto as Selecoes;
  } catch {
    return json({ erro: "filtros" }, 400);
  }

  let indice: BuscaIndice;
  try {
    indice = await carregarIndice(request.url);
  } catch {
    return json({ erro: "indice" }, 503);
  }

  const filtros: FiltrosLista = { selecoes, precoMin: precoDaUrl(p.get("precoMin")), precoMax: precoDaUrl(p.get("precoMax")) };
  const grupos = gruposDoIndice(indice, departamento);
  const porTexto = filtrarGrupos(grupos, consulta);
  const facetas = calcularFacetas(porTexto, filtros);
  const visiveis = aplicarCatalogo(porTexto, { predicado: predicadoFiltros(filtros) });

  const ids = idsDoAplicativo();
  const lista = visiveis.flatMap((g) => g.itens.map((item) => ids.get(item.nome) ?? item.nome)).slice(0, 3000);

  return json(
    {
      facetas: facetas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        opcoes: f.opcoes.map((o) => ({ valor: o.valor, label: o.label, contagem: o.contagem, selecionada: o.selecionada })),
      })),
      ids: lista,
    },
    200,
  );
}
