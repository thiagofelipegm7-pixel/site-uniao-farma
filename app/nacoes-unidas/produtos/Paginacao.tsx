/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import { Fragment } from "react";

/** Produtos por página: 24 = 6 linhas de 4 cartões no desktop. */
export const POR_PAGINA = 24;

/** Páginas que aparecem, como na Panvel: a primeira, a última, a atual com as vizinhas e, no começo e no fim, as 3 seguintes. */
export function paginasVisiveis(atual: number, total: number): number[] {
  const alvo = new Set<number>([1, total, atual - 1, atual, atual + 1]);
  if (atual <= 3) [2, 3, 4].forEach((n) => alvo.add(n));
  if (atual >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => alvo.add(n));
  return [...alvo].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

type Props = {
  atual: number;
  total: number;
  /** Endereço de cada página (também serve a quem não roda JavaScript e ao Google). */
  href: (pagina: number) => string;
  /** Troca de página sem recarregar. Sem ele, os links funcionam normalmente. */
  onIr?: (pagina: number) => void;
};

const Seta = ({ lado }: { lado: "esq" | "dir" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={lado === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

/** Paginação no padrão da Panvel: seta, números (1 2 3 4 … última) e seta. */
export default function Paginacao({ atual, total, href, onIr }: Props) {
  if (total <= 1) return null;
  const ir = (n: number) => (e: React.MouseEvent) => {
    if (!onIr || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onIr(n);
  };
  return (
    <nav className="pv-paginas" aria-label="Paginação">
      {atual > 1 ? (
        <a className="pv-pag-seta" href={href(atual - 1)} aria-label="Página anterior" onClick={ir(atual - 1)}>
          <Seta lado="esq" />
        </a>
      ) : (
        <span className="pv-pag-seta is-off" aria-hidden="true">
          <Seta lado="esq" />
        </span>
      )}
      {paginasVisiveis(atual, total).map((n) => (
        <Fragment key={n}>
          <a className={n === atual ? "pv-pag-num is-on" : "pv-pag-num"} href={href(n)} aria-label={`Página ${n}`} aria-current={n === atual ? "page" : undefined} onClick={ir(n)}>
            {n}
          </a>
        </Fragment>
      ))}
      {atual < total ? (
        <a className="pv-pag-seta" href={href(atual + 1)} aria-label="Próxima página" onClick={ir(atual + 1)}>
          <Seta lado="dir" />
        </a>
      ) : (
        <span className="pv-pag-seta is-off" aria-hidden="true">
          <Seta lado="dir" />
        </span>
      )}
    </nav>
  );
}

/** Lê ?pagina= do endereço (1 se faltar ou for inválido). */
export function paginaDaUrl(search: string): number {
  const n = Number(new URLSearchParams(search).get("pagina"));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Endereço relativo da página n, mantendo a busca (?q=). */
export function hrefPagina(n: number, consulta: string): string {
  const p = new URLSearchParams();
  if (consulta.trim()) p.set("q", consulta.trim());
  if (n > 1) p.set("pagina", String(n));
  const s = p.toString();
  return s ? `?${s}` : "?";
}

/** Atualiza ?pagina= sem recarregar e leva o topo da lista à vista. */
export function irParaPagina(n: number, consulta: string): void {
  const u = new URL(window.location.href);
  if (consulta.trim()) u.searchParams.set("q", consulta.trim());
  if (n > 1) u.searchParams.set("pagina", String(n));
  else u.searchParams.delete("pagina");
  window.history.pushState(null, "", u);
  document.getElementById("lista")?.scrollIntoView({ block: "start" });
}
