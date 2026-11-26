/** Qualquer botão "Tenho uma receita" pede para abrir o leitor, que vive na sacola (presente em todas as páginas de loja). */
export const EVENTO_ABRIR_RECEITA = "uf-abrir-receita";

/** `modo: "pdf"` abre direto o seletor de arquivo PDF (para quem já tem a receita do Memed). */
export type ModoLeitor = "pdf";

export function abrirLeitorReceita(modo?: ModoLeitor): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ modo?: ModoLeitor }>(EVENTO_ABRIR_RECEITA, { detail: { modo } }));
}
