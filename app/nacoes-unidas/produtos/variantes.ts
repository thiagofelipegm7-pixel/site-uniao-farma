/**
 * Agrupa no catálogo os produtos que são o mesmo item em tamanhos diferentes (ex.: fralda G, P, XG, M).
 * Um cartão só, com botões de tamanho. Só agrupa quando o nome traz o tamanho no fim e o nome base é igual.
 */

/** Tamanho no fim do nome, com ou sem a quantidade: "... Mega G 1X34UN", "... Mega P 42UN", "... tamanho M 8UN". */
const TAMANHO_SIGLA = /\s+(PP|P|M|G|GG|XG|XXG|XXXG|XP|XGG)\s+(?:\d+\s*X\s*)?\d+\s*UN\s*$/i;
const TAMANHO_PALAVRA = /\s+tamanho\s+(\S+)(\s+\d+\s*UN)?\s*$/i;

/** Nome sem o tamanho e o tamanho em maiúsculas. Sem tamanho no nome, devolve null. */
export function tamanhoDoNome(nome: string): { base: string; tamanho: string } | null {
  const sigla = nome.match(TAMANHO_SIGLA);
  if (sigla) return { base: nome.slice(0, sigla.index).trim(), tamanho: sigla[1].toUpperCase() };
  const palavra = nome.match(TAMANHO_PALAVRA);
  if (palavra) return { base: nome.slice(0, palavra.index).trim(), tamanho: palavra[1].toUpperCase() };
  return null;
}

type ItemVariante = { nome: string; isMIP?: boolean; restrito?: unknown };

/** Ordem de grandeza dos tamanhos: do menor para o maior. Tamanho fora da lista vai para o fim, na ordem original. */
const ORDEM_TAMANHOS = ["PP", "XP", "P", "M", "G", "GG", "XG", "XGG", "XXG", "XXXG"];
function posicaoDoTamanho(nome: string): number {
  const tamanho = tamanhoDoNome(nome)?.tamanho;
  const posicao = tamanho ? ORDEM_TAMANHOS.indexOf(tamanho) : -1;
  return posicao === -1 ? ORDEM_TAMANHOS.length : posicao;
}

/** Junta os itens que são o mesmo produto em tamanhos diferentes. Ordem de aparição preservada; sem tamanho, cada item fica sozinho. */
export function agruparVariantes<T extends ItemVariante>(itens: readonly T[]): T[][] {
  const saida: T[][] = [];
  const porBase = new Map<string, T[][]>();
  for (const item of itens) {
    const info = item.restrito || item.isMIP ? null : tamanhoDoNome(item.nome);
    if (!info) {
      saida.push([item]);
      continue;
    }
    const chave = info.base.toLowerCase();
    const grupos = porBase.get(chave) ?? [];
    const tamanhoJa = (grupo: T[]) => grupo.some((x) => tamanhoDoNome(x.nome)?.tamanho === info.tamanho);
    const grupo = grupos.find((g) => !tamanhoJa(g));
    if (grupo) grupo.push(item);
    else {
      const novo = [item];
      grupos.push(novo);
      porBase.set(chave, grupos);
      saida.push(novo);
    }
  }
  // Dentro de cada produto, os tamanhos vão do menor para o maior (a ordem de chegada não importa).
  return saida.map((grupo) => (grupo.length > 1 ? [...grupo].sort((a, b) => posicaoDoTamanho(a.nome) - posicaoDoTamanho(b.nome)) : grupo));
}
