/**
 * "Repetir meu último pedido": o aparelho guarda só os nomes e as quantidades do último pedido enviado.
 * Preço e disponibilidade são os de hoje (lidos do catálogo na hora de repetir); o que não existe mais fica de fora e é avisado.
 */
import { adicionar, definirQtd, idDoItem, type ReservaEstado, type ReservaItem } from "./reserva-store";

export const CHAVE_ULTIMO_PEDIDO = "uf-ultimo-pedido-v1";
export type ItemUltimoPedido = { nome: string; qtd: number; receita?: "receita" | "controlado" };
export type ItemCatalogo = { nome: string; precoCentavos: number | null; foto?: string | null; tipo?: "receita" | "controlados" };

export function lerUltimoPedido(bruto: string | null): ItemUltimoPedido[] {
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto) as unknown;
    if (!Array.isArray(lista)) return [];
    return lista
      .filter((i): i is ItemUltimoPedido => !!i && typeof i.nome === "string" && i.nome.trim().length > 0 && Number.isInteger(i.qtd) && i.qtd > 0 && i.qtd <= 20)
      .slice(0, 40)
      .map((i) => ({ nome: i.nome.trim().slice(0, 160), qtd: i.qtd, ...(i.receita === "receita" || i.receita === "controlado" ? { receita: i.receita } : {}) }));
  } catch {
    return [];
  }
}

export function carregarUltimoPedido(): ItemUltimoPedido[] {
  try {
    return lerUltimoPedido(window.localStorage.getItem(CHAVE_ULTIMO_PEDIDO));
  } catch {
    return [];
  }
}

export function guardarUltimoPedido(itens: readonly Pick<ReservaItem, "nome" | "qtd" | "receita">[]): void {
  try {
    const lista = itens.map((i) => ({ nome: i.nome, qtd: i.qtd, ...(i.receita ? { receita: i.receita } : {}) }));
    if (lista.length > 0) window.localStorage.setItem(CHAVE_ULTIMO_PEDIDO, JSON.stringify(lista));
  } catch {
    // sem armazenamento: só não lembra
  }
}

/** Coloca na cesta o que ainda existe (com o preço de hoje) e devolve os nomes que não foram encontrados. */
export function repetirPedido(estado: ReservaEstado, anterior: readonly ItemUltimoPedido[], catalogo: readonly ItemCatalogo[], unitId: string): { estado: ReservaEstado; faltaram: string[] } {
  const porNome = new Map(catalogo.map((c) => [c.nome.trim().toLowerCase(), c]));
  let novo = estado;
  const faltaram: string[] = [];
  for (const item of anterior) {
    const achado = porNome.get(item.nome.trim().toLowerCase());
    if (!achado || !achado.precoCentavos || achado.precoCentavos <= 0) {
      faltaram.push(item.nome);
      continue;
    }
    const receita = item.receita ?? (achado.tipo === "controlados" ? "controlado" : achado.tipo === "receita" ? "receita" : undefined);
    novo = adicionar(novo, { unitId, nome: item.nome, precoCentavos: achado.precoCentavos, foto: achado.foto ?? null, ...(receita ? { receita } : {}) }, 1);
    novo = definirQtd(novo, idDoItem(unitId, item.nome), item.qtd);
  }
  return { estado: novo, faltaram };
}
