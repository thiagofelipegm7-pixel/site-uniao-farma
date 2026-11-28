import { formatarCentavos } from "../../reserva/reserva-store";
import type { VariacoesResolvidas } from "../../variacoes-resolver";
import type { ItemBusca } from "./busca";
import { eanDaFoto } from "./imagens";

/** Grupo de variações como a API pública entrega (tamanhos e cores já ligados aos produtos do catálogo). */
export type GrupoLista = VariacoesResolvidas;

const EAN_VALIDO = /^\d{8,14}$/;

/**
 * Junta, numa lista de produtos, os que são tamanhos ou cores do mesmo grupo: vira UM cartão, na posição do primeiro deles.
 * O cartão leva a foto e a página do produto escolhido como "atual" (o primeiro com estoque, na ordem do grupo, entre os que
 * estão na lista; senão o primeiro que apareceu), o título do grupo (ou o nome do produto), o menor preço entre as opções com
 * estoque ("a partir de") e as fichas de todas as opções. Sem grupos, devolve a lista como veio.
 */
export function agruparNasListas<T extends ItemBusca>(itens: readonly T[], grupos: readonly GrupoLista[] | undefined): T[] {
  if (!grupos || grupos.length === 0) return [...itens];
  const grupoPorEan = new Map<string, GrupoLista>();
  for (const g of grupos) for (const f of g.fichas) if (EAN_VALIDO.test(f.ean)) grupoPorEan.set(f.ean, g);
  if (grupoPorEan.size === 0) return [...itens];

  const eanDe = (item: ItemBusca) => eanDaFoto(item.nome);
  // Itens da própria lista por código, para o cartão usar a foto e a marca de um produto que realmente apareceu.
  const naLista = new Map<string, T>();
  for (const item of itens) {
    const ean = eanDe(item);
    if (ean && grupoPorEan.has(ean) && !naLista.has(ean)) naLista.set(ean, item);
  }

  const jaMontados = new Set<string>();
  const saida: T[] = [];
  for (const item of itens) {
    const ean = eanDe(item);
    const grupo = ean ? grupoPorEan.get(ean) : undefined;
    if (!grupo || !ean) { saida.push(item); continue; }
    if (jaMontados.has(grupo.grupo)) continue;
    jaMontados.add(grupo.grupo);

    const fichas = grupo.fichas;
    const comEstoque = fichas.filter((f) => !f.esgotado);
    const escolhida = fichas.find((f) => !f.esgotado && naLista.has(f.ean)) ?? fichas.find((f) => naLista.has(f.ean)) ?? fichas.find((f) => f.ean === ean)!;
    const base = naLista.get(escolhida.ean) ?? item;
    const menor = Math.min(...(comEstoque.length > 0 ? comEstoque : fichas).map((f) => f.precoCentavos));
    saida.push({
      ...base,
      nome: grupo.nome ?? base.nome,
      slug: escolhida.slug,
      precoFmt: formatarCentavos(menor),
      preco: menor / 100,
      esgotado: comEstoque.length === 0,
      restam: undefined,
      variacoes: { eixo: grupo.eixo, fichas, atual: escolhida.ean },
      aPartirDe: fichas.some((f) => f.precoCentavos !== menor),
    });
  }
  return saida;
}
