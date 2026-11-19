/**
 * Ordem dos resultados da lista quando há busca e a ordem é "Recomendados": o que mais se parece com o que a pessoa digitou vem primeiro.
 * Pesa: palavra do nome (no começo vale mais), marca igual ao termo, frase inteira junta no nome, palavra inteira (e não só pedaço),
 * produto com foto e produto em estoque (esgotado vai para o fim). Empate: ordem do catálogo.
 */
import { pontuarRelevancia } from "../../shop/busca-painel";
import { reforcoPorCliques, type MapaCliques } from "../../busca-cliques";
import { textoDeBusca, type GrupoBusca, type ItemBusca } from "./busca";

export function pontuarItem(item: Pick<ItemBusca, "nome" | "lab" | "foto" | "esgotado">, termos: readonly string[], cliques = 0): number {
  let pontos = pontuarRelevancia(item.nome, termos, item.foto !== null);
  const nome = textoDeBusca(item.nome);
  const palavrasNome = nome.split(" ");
  // Marca igual ao que foi digitado ("dove" → produtos da marca Dove).
  const palavrasMarca = textoDeBusca(item.lab ?? "").split(" ").filter(Boolean);
  if (palavrasMarca.length > 0 && termos.some((t) => palavrasMarca.includes(t))) pontos += 30;
  // A frase inteira junta no nome ("creme dental" antes de "creme para dentes e gengivas").
  if (termos.length > 1 && nome.includes(termos.join(" "))) pontos += 25;
  // Palavra inteira vale mais que pedaço de palavra ("sabonete" antes de "sabonetera").
  for (const t of termos) if (palavrasNome.includes(t)) pontos += 8;
  // O que as pessoas mais abrem depois dessa mesma busca sobe um pouco (limitado; o texto do nome continua pesando mais).
  pontos += reforcoPorCliques(cliques);
  if (item.esgotado === true) pontos -= 1000;
  return pontos;
}

/** Junta os grupos numa lista só ("Resultados"), dos mais para os menos parecidos com a busca. Sem termo, devolve como veio. */
export function ordenarPorRelevancia(grupos: readonly GrupoBusca[], termos: readonly string[], cliquesDoTermo?: MapaCliques[string], slugDe?: (item: ItemBusca) => string): GrupoBusca[] {
  if (termos.length === 0) return [...grupos];
  const itens = grupos
    // Remédio (medicamento, receita, controlado) nunca ganha reforço por popularidade.
    .flatMap((g) => g.itens.map((item) => ({ item, remedio: g.categoria === "Medicamentos" || item.isMIP === true || Boolean(item.restrito) })))
    .map(({ item, remedio }, ordem) => ({ item, ordem, pontos: pontuarItem(item, termos, !remedio && cliquesDoTermo && slugDe ? (cliquesDoTermo[slugDe(item)] ?? 0) : 0) }))
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .map((x) => x.item);
  return itens.length === 0 ? [] : [{ categoria: "Resultados", id: "resultados", itens }];
}
