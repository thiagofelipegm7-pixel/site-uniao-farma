import { banco } from "../../estoque-fonte";
import { listarGrupos } from "../../variacoes-produto";
import { resolverGrupo } from "../../variacoes-resolver";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banco = Parameters<typeof listarGrupos>[0];

/**
 * Grupos de variações (tamanho, cor...) já ligados aos produtos do catálogo: as listas usam para juntar os tamanhos num cartão só.
 * Só traz o que já é público (nome, página, preço e se está esgotado). Sem banco ou sem grupos, devolve lista vazia.
 */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ grupos: [] }, { headers: SEM_CACHE });
  try {
    const grupos = (await listarGrupos(db)).map((g) => resolverGrupo(g)).filter((g) => g.fichas.length >= 2);
    return Response.json({ grupos }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ grupos: [] }, { headers: SEM_CACHE });
  }
}
