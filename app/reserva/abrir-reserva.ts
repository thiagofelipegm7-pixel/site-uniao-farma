/** A barra do produto pede para abrir a gaveta que vive na faixa da marca. */
export const EVENTO_ABRIR_RESERVA = "uf-abrir-reserva";

export function abrirReserva(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_RESERVA));
}
