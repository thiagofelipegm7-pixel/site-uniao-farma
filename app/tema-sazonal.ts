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
 * Fim do tema (ISO UTC), ou null enquanto a campanha não tiver data de encerramento.
 * Quando houver data, o tema desliga sozinho (servidor e cache no navegador) para a faixa não anunciar oferta vencida (CDC, L-1).
 */
export const TEMA_ATIVO_ATE: string | null = null;

/** Tema ligado agora para todos (null se a campanha estiver desligada ou já tiver encerrado). */
export function temaAtual(agora: number = Date.now()): TemaSazonal | null {
  if (!TEMA_PADRAO) return null;
  if (TEMA_ATIVO_ATE && agora >= Date.parse(TEMA_ATIVO_ATE)) return null;
  return TEMA_PADRAO;
}

export const TEMAS_VALIDOS: readonly TemaSazonal[] = ["black-friday"];

/** Script curto no <head>: aplica o tema da prévia antes de pintar a página. */
const corteTema = TEMA_ATIVO_ATE
  ? `if(Date.now()>=${Date.parse(TEMA_ATIVO_ATE)})document.documentElement.removeAttribute("data-tema");`
  : "";

export const SCRIPT_TEMA_PREVIA = `(function(){try{${corteTema}var q=new URLSearchParams(location.search).get("tema"),k="uf_tema_previa";if(q==="normal"){sessionStorage.removeItem(k);document.documentElement.removeAttribute("data-tema");return}if(q==="black-friday")sessionStorage.setItem(k,q);var t=sessionStorage.getItem(k);if(t==="black-friday")document.documentElement.setAttribute("data-tema",t)}catch(e){}})();`;
