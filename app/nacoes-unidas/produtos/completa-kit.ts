import { slugify, type CatalogoItem } from "./catalogo";
import paresJson from "./dados/relacionados-ia.json" with { type: "json" };
import { fotoDoProduto } from "./imagens";
import { elegivelParaPares, type Pares } from "./relacionados";

const PARES = paresJson as Pares;

export const MIN_KIT = 2;
export const MAX_KIT = 3;

/**
 * 2 ou 3 sugestões compactas para a tira "Complete o kit", reusando os pares de "Combina com"
 * e, se faltar, itens da mesma categoria. Nunca medicamento (origem ou sugestão); some se não houver o mínimo.
 */
export function itensCompletaKit(catalogo: readonly CatalogoItem[], item: CatalogoItem): CatalogoItem[] {
  if (!elegivelParaPares(item) || item.esgotado) return [];
  const meu = slugify(item.nome);
  const vistos = new Set<string>([meu]);
  const saida: CatalogoItem[] = [];

  function tentar(alvo: CatalogoItem | null | undefined) {
    if (!alvo || alvo.esgotado || !elegivelParaPares(alvo)) return;
    const slug = slugify(alvo.nome);
    if (vistos.has(slug) || !fotoDoProduto(alvo.nome)) return;
    vistos.add(slug);
    saida.push(alvo);
  }

  for (const slug of PARES[meu] ?? []) {
    if (saida.length >= MAX_KIT) break;
    tentar(catalogo.find((c) => slugify(c.nome) === slug));
  }
  if (saida.length < MIN_KIT) {
    const lab = item.lab.trim().toLowerCase();
    const mesmos = catalogo.filter((c) => c.categoria === item.categoria);
    const porMarca = (c: CatalogoItem) => (lab !== "" && c.lab.trim().toLowerCase() === lab ? 0 : 1);
    const ordenados = [...mesmos].sort((a, b) => porMarca(a) - porMarca(b) || Math.abs(a.preco - item.preco) - Math.abs(b.preco - item.preco) || a.nome.localeCompare(b.nome, "pt-BR"));
    for (const candidato of ordenados) {
      if (saida.length >= MAX_KIT) break;
      tentar(candidato);
    }
  }
  return saida.length >= MIN_KIT ? saida.slice(0, MAX_KIT) : [];
}
