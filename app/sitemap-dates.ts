/** Data YYYY-MM-DD da última alteração de conteúdo de cada URL estática.
 *  Atualize o campo da rota quando mudar texto, horário, oferta ou dado da loja.
 *  Artigos de /novidades/[slug] usam publishedAt e não entram aqui.
 */
export const PAGE_LAST_UPDATED = {
  home: "2026-09-15",
  fatima: "2026-09-15",
  nacoes: "2026-09-15",
  itacolomi: "2026-09-15",
  ofertas: "2026-08-17",
  receita: "2026-09-01",
  novidades: "2026-08-16",
  perguntas: "2026-08-16",
  institucional: "2026-09-10",
  farmaciaEmSabara: "2026-08-16",
  entrega: "2026-08-16",
  perfumaria: "2026-08-16",
  privacidade: "2026-08-16",
  termos: "2026-08-16",
} as const;

export function sitemapDate(value: string): Date {
  return new Date(`${value}T12:00:00-03:00`);
}
