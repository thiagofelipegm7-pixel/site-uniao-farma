/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import { elegivelParaPares } from "./relacionados";
import type { CatalogoItem } from "./catalogo";

const MAX_TERMOS = 8;

/**
 * Buscas sugeridas para a página de um produto: a marca dele, a categoria e as marcas mais presentes na mesma categoria.
 * Só termos que existem no catálogo da loja; nada de palavra inventada.
 */
export function termosRelacionados(catalogo: readonly CatalogoItem[], item: CatalogoItem, categoriaRotulo: string): string[] {
  const termos: string[] = [];
  const guardar = (t: string) => {
    const limpo = t.trim().toLowerCase();
    if (limpo.length >= 3 && !termos.includes(limpo)) termos.push(limpo);
  };
  if (item.lab.trim()) guardar(item.lab);
  guardar(categoriaRotulo);
  if (elegivelParaPares(item)) {
    const contagem = new Map<string, number>();
    for (const c of catalogo) {
      if (c.categoria !== item.categoria || c.esgotado || !elegivelParaPares(c)) continue;
      const lab = c.lab.trim().toLowerCase();
      if (lab) contagem.set(lab, (contagem.get(lab) ?? 0) + 1);
    }
    [...contagem.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
      .forEach(([lab]) => guardar(lab));
  }
  return termos.slice(0, MAX_TERMOS);
}

/** "Você também pode estar interessado": lista de buscas relacionadas, cada uma abre a busca da loja. */
export default function VoceTambemInteressado({ termos }: { termos: readonly string[] }) {
  if (termos.length < 3) return null;
  return (
    <section className="pdp-interesse section-inner" aria-labelledby="interesse-titulo">
      <h2 id="interesse-titulo">Você também pode estar interessado</h2>
      <ul className="pdp-interesse-lista">
        {termos.map((termo) => (
          <li key={termo}>
            <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(termo)}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span>{termo}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
