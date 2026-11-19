/**
 * Bairro de entrega escolhido na faixa do topo, guardado SÓ no navegador (localStorage). Só vale bairro que a loja atende
 * (site-config). O CEP digitado para descobrir o bairro nunca é guardado nem enviado.
 */
import { UNITS } from "../site-config";

export const CHAVE_ENTREGA = "uf-entrega-v1";

const BAIRROS_ATENDIDOS: readonly string[] = UNITS.flatMap((u) => u.deliveryAreas);

export function bairroValido(valor: unknown): valor is string {
  return typeof valor === "string" && BAIRROS_ATENDIDOS.includes(valor);
}

export function lerEntregaEscolhida(bruto: string | null): string | null {
  if (!bruto) return null;
  try {
    const d = JSON.parse(bruto) as { bairro?: unknown };
    return bairroValido(d.bairro) ? d.bairro : null;
  } catch {
    return null;
  }
}

export function carregarEntregaEscolhida(): string | null {
  try {
    return lerEntregaEscolhida(window.localStorage.getItem(CHAVE_ENTREGA));
  } catch {
    return null;
  }
}

export function guardarEntregaEscolhida(bairro: string): void {
  if (!bairroValido(bairro)) return;
  try {
    window.localStorage.setItem(CHAVE_ENTREGA, JSON.stringify({ bairro }));
  } catch {
    // sem armazenamento: só não lembra
  }
}

export function esquecerEntregaEscolhida(): void {
  try {
    window.localStorage.removeItem(CHAVE_ENTREGA);
  } catch {
    // sem armazenamento
  }
}
