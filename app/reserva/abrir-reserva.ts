/** Abre a gaveta da cesta (círculo + do card, barra do produto, atalhos). */
export const EVENTO_ABRIR_RESERVA = "uf-abrir-reserva";

export type DetalheAbrirReserva = { gatilho?: HTMLElement | null };

export function abrirReserva(gatilho?: HTMLElement | null): void {
  if (typeof window === "undefined") return;
  const origem = gatilho ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  window.dispatchEvent(new CustomEvent<DetalheAbrirReserva>(EVENTO_ABRIR_RESERVA, { detail: { gatilho: origem } }));
}
