/** Qualquer botão "Tenho uma receita" pede para abrir o leitor, que vive na sacola (presente em todas as páginas de loja). */
export const EVENTO_ABRIR_RECEITA = "uf-abrir-receita";

export function abrirLeitorReceita(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_RECEITA));
}
