/** Data YYYY-MM-DD da última alteração de conteúdo de cada URL estática.
 *  Atualize o campo da rota quando mudar texto, horário, oferta ou dado da loja.
 *  Artigos de /novidades/[slug] usam publishedAt e não entram aqui.
 */
export const PAGE_LAST_UPDATED = {
  home: "2026-10-24",
  fatima: "2026-10-26",
  nacoes: "2026-10-26",
  itacolomi: "2026-10-26",
  ofertas: "2026-08-17",
  receita: "2026-10-24",
  novidades: "2026-08-16",
  perguntas: "2026-08-16",
  institucional: "2026-09-10",
  farmaciaEmSabara: "2026-10-25",
  abertaDomingo: "2026-10-25",
  entrega: "2026-10-26",
  perfumaria: "2026-08-16",
  privacidade: "2026-08-16",
  termos: "2026-08-16",
} as const;

export function sitemapDate(value: string): Date {
  return new Date(`${value}T12:00:00-03:00`);
}
