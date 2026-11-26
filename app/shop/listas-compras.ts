/**
 * Listas de compras salvas no navegador.
 * Cada lista tem nome e itens (nome + quantidade).
 */
export const CHAVE_LISTAS = "uf-listas-v1";

export type ItemLista = { nome: string; qtd: number; slug?: string };
export type ListaCompra = { id: string; nome: string; itens: ItemLista[]; criadaEm: number };

export function carregarListas(): ListaCompra[] {
  try {
    const raw = localStorage.getItem(CHAVE_LISTAS);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function salvarListas(listas: ListaCompra[]) {
  try {
    localStorage.setItem(CHAVE_LISTAS, JSON.stringify(listas));
  } catch {}
}

export function criarLista(nome: string): ListaCompra {
  return {
    id: Date.now().toString(36),
    nome: nome.trim().slice(0, 40) || "Minha lista",
    itens: [],
    criadaEm: Date.now(),
  };
}
