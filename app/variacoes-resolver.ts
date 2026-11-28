import { carregarCatalogoCompleto, slugify } from "./nacoes-unidas/produtos/catalogo";
import { eanDaFoto } from "./nacoes-unidas/produtos/imagens";
import type { GrupoVariacao } from "./variacoes-produto";

type ItemCatalogo = ReturnType<typeof carregarCatalogoCompleto>["itens"][number];

/** Código de barras do item, na mesma regra do painel de coleções (assim o painel e o site falam do mesmo produto). */
export function codigoDoItem(item: Pick<ItemCatalogo, "nome"> & { ean?: unknown }): string | null {
  return (typeof item.ean === "string" && /^\d{8,14}$/.test(item.ean) ? item.ean : null) ?? eanDaFoto(item.nome);
}

export type FichaVariacao = { ean: string; rotulo: string; nome: string; slug: string; precoCentavos: number; esgotado: boolean };
export type VariacoesResolvidas = { eixo: string; fichas: FichaVariacao[] };

function montarMapa(itens: readonly ItemCatalogo[]): Map<string, ItemCatalogo> {
  const mapa = new Map<string, ItemCatalogo>();
  for (const item of itens) {
    const codigo = codigoDoItem(item);
    if (codigo && !mapa.has(codigo)) mapa.set(codigo, item);
  }
  return mapa;
}

// O mapa código → produto é refeito só quando o catálogo muda (versão = data da exportação + quantidade de itens).
let cache: { chave: string; mapa: Map<string, ItemCatalogo> } | null = null;
function mapaDoCatalogo(): Map<string, ItemCatalogo> {
  const catalogo = carregarCatalogoCompleto();
  const chave = `${catalogo.geradoEm ?? ""}|${catalogo.itens.length}`;
  if (cache?.chave !== chave) cache = { chave, mapa: montarMapa(catalogo.itens) };
  return cache.mapa;
}

/** Liga cada membro do grupo ao produto do catálogo (nome, página, preço, estoque). Produto que saiu do catálogo some da lista. */
export function resolverGrupo(grupo: GrupoVariacao, itens?: readonly ItemCatalogo[]): VariacoesResolvidas {
  const porCodigo = itens ? montarMapa(itens) : mapaDoCatalogo();
  const fichas: FichaVariacao[] = [];
  for (const membro of grupo.itens) {
    const item = porCodigo.get(membro.ean);
    if (!item) continue;
    fichas.push({ ean: membro.ean, rotulo: membro.rotulo, nome: item.nome, slug: slugify(item.nome), precoCentavos: Math.round(item.preco * 100), esgotado: item.esgotado === true });
  }
  return { eixo: grupo.eixo, fichas };
}

/** Dados de um produto para o painel (nome, preço) a partir do código de barras. */
export function produtoPorCodigo(ean: string): { nome: string; precoCentavos: number; esgotado: boolean } | null {
  const item = mapaDoCatalogo().get(ean);
  return item ? { nome: item.nome, precoCentavos: Math.round(item.preco * 100), esgotado: item.esgotado === true } : null;
}
