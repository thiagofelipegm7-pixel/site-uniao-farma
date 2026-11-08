/**
 * Árvore de categorias (plano de finalização, item 2): departamento > categoria ("tipo de produto") > subcategoria opcional.
 * Máximo de 3 níveis. O motor sugere pela regra do nome; o que não casa fica em "Outros" e entra na revisão da equipe.
 * As regras ficam em arvore-categorias.json (um padrão por categoria, aplicado ao nome sem acento e em maiúsculas), lidas
 * também por scripts/gerar-assets-catalogo.mjs: uma regra nova vale nos dois lados. A primeira regra do departamento que casar vence.
 */
import REGRAS_JSON from "./arvore-categorias.json" with { type: "json" };

export const OUTROS = "Outros";
type Regra = { departamento: string; categoria: string; padrao: string };
const REGRAS = (REGRAS_JSON as Regra[]).map((r) => ({ ...r, rx: new RegExp(r.padrao) }));

export function nomeParaRegra(nome: string): string {
  return nome.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Categoria (nível 2) do produto dentro do departamento; "Outros" quando nenhuma regra casa. */
export function tipoDoProduto(nome: string, departamento: string): string {
  const n = nomeParaRegra(nome);
  for (const r of REGRAS) if (r.departamento === departamento && r.rx.test(n)) return r.categoria;
  return OUTROS;
}

/** A árvore como lista, para o painel e para os testes: departamento -> categorias (na ordem das regras). */
export function arvoreDeCategorias(): { departamento: string; categorias: string[] }[] {
  const mapa = new Map<string, string[]>();
  for (const r of REGRAS) mapa.set(r.departamento, [...new Set([...(mapa.get(r.departamento) ?? []), r.categoria])]);
  return [...mapa].map(([departamento, categorias]) => ({ departamento, categorias }));
}
