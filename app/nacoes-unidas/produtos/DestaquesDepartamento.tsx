/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import { OUTROS, tipoDoProduto } from "./arvore-categorias";
import type { CatalogoItem } from "./catalogo";
import { acharDepartamentoPorNome } from "./destaques-departamento";
import { elegivelParaPares } from "./relacionados";

type Grupo = { categoria: string; termos: string[] };

const MAX_GRUPOS = 5;
const MAX_TERMOS = 6;
const MIN_PRODUTOS_POR_GRUPO = 3;

/**
 * Grupos do departamento: cada "tipo de produto" (pela árvore de categorias da loja) com as marcas mais presentes nele.
 * Só produtos em estoque que podem ser sugeridos (nunca medicamento). Os termos são marcas reais do catálogo.
 */
export function gruposDoDepartamento(catalogo: readonly CatalogoItem[], departamento: string): Grupo[] {
  const porTipo = new Map<string, Map<string, number>>();
  const total = new Map<string, number>();
  for (const c of catalogo) {
    if (c.categoria !== departamento || c.esgotado || !elegivelParaPares(c)) continue;
    const tipo = tipoDoProduto(c.nome, departamento);
    if (!tipo || tipo === OUTROS) continue;
    total.set(tipo, (total.get(tipo) ?? 0) + 1);
    const lab = c.lab.trim().toLowerCase();
    if (!lab) continue;
    const marcas = porTipo.get(tipo) ?? new Map<string, number>();
    marcas.set(lab, (marcas.get(lab) ?? 0) + 1);
    porTipo.set(tipo, marcas);
  }
  return [...total.entries()]
    .filter(([, n]) => n >= MIN_PRODUTOS_POR_GRUPO)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, MAX_GRUPOS)
    .map(([categoria]) => ({
      categoria,
      termos: [...(porTipo.get(categoria) ?? new Map()).entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
        .slice(0, MAX_TERMOS)
        .map(([lab]) => lab),
    }))
    .filter((g) => g.termos.length >= 2);
}

/** "Destaques em [departamento]": grupos que abrem e fecham, cada link abre a busca da marca. */
export default function DestaquesDepartamento({ grupos, departamento }: { grupos: readonly Grupo[]; departamento: string }) {
  if (grupos.length === 0) return null;
  const dep = acharDepartamentoPorNome(departamento);
  return (
    <section className="pdp-destaques section-inner" aria-labelledby="destaques-titulo">
      <h2 id="destaques-titulo">Destaques em {departamento}</h2>
      <div className="pdp-destaques-card">
        {grupos.map((grupo, i) => (
          <details key={grupo.categoria} open={i === 0}>
            <summary>
              <span>{grupo.categoria}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7" /></svg>
            </summary>
            <ul>
              {grupo.termos.map((termo) => (
                <li key={termo}>
                  <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(termo)}`}>{termo}</a>
                </li>
              ))}
              {dep ? (
                <li>
                  <a className="pdp-destaques-todos" href={`/departamentos/${dep.slug}`}>Ver tudo em {departamento}</a>
                </li>
              ) : null}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
