import { normalizarBusca } from "../nacoes-unidas/produtos/busca";
import { departamentosPublicos } from "../nacoes-unidas/produtos/departamentos";
import { MARCAS_DERMOCOSMETICOS, MARCAS_DESTAQUE, MARCAS_INFANTIL, MARCAS_MEDICAMENTOS } from "./marcas";

/**
 * Relevância de um produto para o que o cliente digitou. Quanto maior, melhor.
 * - O nome começar pela palavra buscada vale mais do que ela aparecer no meio ("Fralda Babysec" antes de "Fita Fralda Cremer").
 * - Palavras mais perto do começo do nome valem mais.
 * - Casar só pelo fabricante ou categoria (e não pelo nome) vale pouco.
 * - Produto com foto passa na frente de igual relevância; nomes mais curtos desempatam.
 */
export function pontuarRelevancia(nome: string, termos: readonly string[], temFoto: boolean): number {
  const palavras = normalizarBusca(nome).split(/[^a-z0-9]+/).filter(Boolean);
  let pontos = 0;
  for (const termo of termos) {
    const posicao = palavras.findIndex((palavra) => palavra.startsWith(termo));
    if (posicao === 0) pontos += 60;
    else if (posicao > 0) pontos += 35 - Math.min(posicao, 5) * 2;
    else pontos += 8;
  }
  if (palavras[0] && termos.includes(palavras[0])) pontos += 15; // primeira palavra igual ao termo
  if (temFoto) pontos += 6;
  return pontos - palavras.length * 0.1;
}

/** Os `n` itens que casam com a busca, dos mais para os menos relevantes (empate: ordem original do catálogo). */
export function melhoresResultados<T>(
  lista: readonly T[],
  casa: (item: T) => boolean,
  termos: readonly string[],
  nomeDe: (item: T) => string,
  fotoDe: (item: T) => boolean,
  n: number,
): T[] {
  const achados: Array<{ item: T; pontos: number; ordem: number }> = [];
  lista.forEach((item, ordem) => {
    if (casa(item)) achados.push({ item, pontos: pontuarRelevancia(nomeDe(item), termos, fotoDe(item)), ordem });
  });
  achados.sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem);
  return achados.slice(0, n).map((a) => a.item);
}

export type AtalhoBusca = { tipo: "marca" | "departamento"; nome: string; href: string };

const todasAsMarcas = (() => {
  const vistas = new Map<string, { nome: string; busca: string }>();
  for (const lista of [MARCAS_DESTAQUE, MARCAS_MEDICAMENTOS, MARCAS_DERMOCOSMETICOS, MARCAS_INFANTIL]) {
    for (const marca of lista) if (!vistas.has(marca.slug)) vistas.set(marca.slug, { nome: marca.nome, busca: marca.busca });
  }
  return [...vistas.values()];
})();

/**
 * Atalhos acima dos produtos: se o que o cliente digitou é o começo do nome de um departamento ou de uma marca da loja,
 * oferece ir direto à página do departamento ou à busca da marca. Só a partir de 3 letras, no máximo 1 departamento e 2 marcas.
 */
export function atalhosDaBusca(consulta: string): AtalhoBusca[] {
  const normal = normalizarBusca(consulta);
  if (normal.length < 3) return [];
  const saida: AtalhoBusca[] = [];
  const dep = departamentosPublicos().find((d) => normalizarBusca(d.nome).split(" ").some((palavra) => palavra.startsWith(normal)));
  if (dep) saida.push({ tipo: "departamento", nome: dep.nome, href: `/departamentos/${dep.slug}` });
  for (const marca of todasAsMarcas) {
    if (saida.filter((a) => a.tipo === "marca").length >= 2) break;
    if (normalizarBusca(marca.nome).startsWith(normal)) saida.push({ tipo: "marca", nome: marca.nome, href: `/nacoes-unidas/produtos?q=${encodeURIComponent(marca.busca)}` });
  }
  return saida;
}
