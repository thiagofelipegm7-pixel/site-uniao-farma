/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import type { ReactNode } from "react";
import { departamentosPublicos } from "./departamentos";

/** Itens por página oferecidos na faixa de cima (a Drogasil usa 24, 48 e 96). */
export const OPCOES_POR_PAGINA = [24, 48, 96] as const;

/** Grupo da lateral que abre e fecha (título + seta), como os filtros da Drogasil. */
export function GrupoLateral({ titulo, children, aberto = true }: { titulo: string; children: ReactNode; aberto?: boolean }) {
  return (
    <details className="dg-grupo" open={aberto}>
      <summary>
        <h2>{titulo}</h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      {children}
    </details>
  );
}

/** Topo da lateral: quantidade de resultados e a lista de departamentos (a "Subcategorias" da Drogasil). */
export function LateralTopo({ total, rotulo, atual, carregando = false, departamentosAbertos = true }: { total: number; rotulo: string; atual?: string; carregando?: boolean; departamentosAbertos?: boolean }) {
  return (
    <>
      <p className="dg-resultados" aria-live="polite">
        {carregando ? "Buscando…" : <><strong>{total.toLocaleString("pt-BR")}</strong> {total === 1 ? `${rotulo} encontrado` : `${rotulo}s encontrados`}</>}
      </p>
      <GrupoLateral titulo="Departamentos" aberto={departamentosAbertos}>
        <ol className="dg-deps">
          {departamentosPublicos().map((d) => (
            <li key={d.slug}>
              <a href={`/departamentos/${d.slug}`} aria-current={d.slug === atual ? "page" : undefined}>{d.nome}</a>
            </li>
          ))}
        </ol>
      </GrupoLateral>
    </>
  );
}

type Opcao = { id: string; label: string };

/** Faixa sobre a grade: "Itens por página", paginação no meio e "Ordenado por" (Drogasil). */
export function FaixaLista({ porPagina, aoMudarPorPagina, ordem, opcoesOrdem, aoMudarOrdem, paginacao, filtrar }: {
  porPagina: number;
  aoMudarPorPagina: (n: number) => void;
  ordem: string;
  opcoesOrdem: readonly Opcao[];
  aoMudarOrdem: (id: string) => void;
  paginacao: ReactNode;
  /** Botão "Filtrar" (só no celular, abre a gaveta de filtros). */
  filtrar?: ReactNode;
}) {
  return (
    <div className="dg-faixa" role="toolbar" aria-label="Organizar a lista">
      <label className="dg-campo dg-campo--por">
        <span>Itens por página</span>
        <select value={porPagina} onChange={(e) => aoMudarPorPagina(Number(e.target.value))}>
          {OPCOES_POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <div className="dg-faixa-pag">{paginacao}</div>
      {filtrar}
      <label className="dg-campo dg-campo--ordem">
        <span>Ordenado por</span>
        <select value={ordem} onChange={(e) => aoMudarOrdem(e.target.value)}>
          {opcoesOrdem.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
    </div>
  );
}
