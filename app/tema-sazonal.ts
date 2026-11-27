/**
 * Tema sazonal do site (Black Friday).
 *
 * - `TEMA_PADRAO = null`: o site fica com o visual normal para todos.
 * - `TEMA_PADRAO = "black-friday"`: o tema liga para todos (sai no HTML do servidor, sem piscar).
 * - Para ver sem ligar para ninguém: abra qualquer página com `?tema=black-friday`
 *   (vale até fechar a aba). `?tema=normal` desliga.
 *
 * O tema só troca cores e mostra uma faixa; não muda layout, preço nem oferta (A-16, L-1).
 */
export type TemaSazonal = "black-friday";

export const TEMA_PADRAO: TemaSazonal | null = "black-friday";

/**
 * Fim da campanha: a faixa diz "só nesta sexta, 27/11". Depois disto o tema desliga sozinho
 * (no servidor e, para página guardada em cache, também no navegador), para a faixa nunca anunciar oferta vencida (CDC, L-1).
 * 28/11/2026 00:00 em Sabará (UTC-3).
 */
export const TEMA_ATIVO_ATE = "2026-11-28T03:00:00Z";

/** Tema ligado agora para todos (null fora da validade). */
export function temaAtual(agora: number = Date.now()): TemaSazonal | null {
  return TEMA_PADRAO && agora < Date.parse(TEMA_ATIVO_ATE) ? TEMA_PADRAO : null;
}

export const TEMAS_VALIDOS: readonly TemaSazonal[] = ["black-friday"];

/** Script curto no <head>: aplica o tema da prévia antes de pintar a página. */
export const SCRIPT_TEMA_PREVIA = `(function(){try{if(Date.now()>=${Date.parse(TEMA_ATIVO_ATE)})document.documentElement.removeAttribute("data-tema");var q=new URLSearchParams(location.search).get("tema"),k="uf_tema_previa";if(q==="normal"){sessionStorage.removeItem(k);document.documentElement.removeAttribute("data-tema");return}if(q==="black-friday")sessionStorage.setItem(k,q);var t=sessionStorage.getItem(k);if(t==="black-friday")document.documentElement.setAttribute("data-tema",t)}catch(e){}})();`;
