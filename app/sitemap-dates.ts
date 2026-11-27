/** Data YYYY-MM-DD da última alteração de conteúdo de cada URL estática.
 *  Atualize o campo da rota quando mudar texto, horário, oferta ou dado da loja.
 *  Artigos de /novidades/[slug] usam publishedAt e não entram aqui.
 */
export const PAGE_LAST_UPDATED = {
  home: "2026-11-23",
  fatima: "2026-11-23",
  nacoes: "2026-11-23",
  itacolomi: "2026-11-23",
  ofertas: "2026-10-28",
  receita: "2026-10-31",
  novidades: "2026-08-16",
  perguntas: "2026-11-17",
  institucional: "2026-11-16",
  farmaciaEmSabara: "2026-11-23",
  abertaDomingo: "2026-11-16",
  entrega: "2026-11-16",
  jardimVitoria: "2026-11-23",
  perfumaria: "2026-10-28",
  privacidade: "2026-11-27",
  termos: "2026-11-17",
  trocas: "2026-11-17",
  departamentos: "2026-11-05",
} as const;

export function sitemapDate(value: string): Date {
  return new Date(`${value}T12:00:00-03:00`);
}
