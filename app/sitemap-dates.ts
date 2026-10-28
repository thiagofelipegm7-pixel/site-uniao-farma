/** Data YYYY-MM-DD da última alteração de conteúdo de cada URL estática.
 *  Atualize o campo da rota quando mudar texto, horário, oferta ou dado da loja.
 *  Artigos de /novidades/[slug] usam publishedAt e não entram aqui.
 */
export const PAGE_LAST_UPDATED = {
  home: "2026-10-28",
  fatima: "2026-10-28",
  nacoes: "2026-10-28",
  itacolomi: "2026-10-28",
  ofertas: "2026-10-28",
  receita: "2026-10-24",
  novidades: "2026-08-16",
  perguntas: "2026-10-28",
  institucional: "2026-09-10",
  farmaciaEmSabara: "2026-10-28",
  abertaDomingo: "2026-10-28",
  entrega: "2026-10-28",
  ifood: "2026-10-28",
  perfumaria: "2026-10-28",
  privacidade: "2026-08-16",
  termos: "2026-08-16",
} as const;

export function sitemapDate(value: string): Date {
  return new Date(`${value}T12:00:00-03:00`);
}
