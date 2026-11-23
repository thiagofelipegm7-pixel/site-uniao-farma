"use client";

import { useEffect, useRef } from "react";

/** Cor própria de cada categoria: dá para reconhecer o grupo de relance. */
/* Cores vivas inspiradas na natureza (frutas, flores, folhas). O texto ativo escuro vai nas cores claras. */
/* Uma história só: as cores acompanham um dia, da aurora ao entardecer, na ordem em que as categorias aparecem.
   Assim a linha de chips forma um gradiente contínuo, e não cores escolhidas ao acaso. */
const CORES_CATEGORIA: Record<string, { cor: string; texto: string }> = {
  "Beleza": { cor: "#ff2e7e", texto: "#ffffff" },
  "Bem Estar": { cor: "#ff7a1a", texto: "#ffffff" },
  "Cuidado Diário": { cor: "#ffd600", texto: "#2a1d00" },
  "Dermocosméticos": { cor: "#7ed321", texto: "#10210a" },
  "Infantil e Gestante": { cor: "#00c2a8", texto: "#ffffff" },
  "Medicamentos": { cor: "#0a84ff", texto: "#ffffff" },
  "Perfumes": { cor: "#7b3ff2", texto: "#ffffff" },
};
const COR_PADRAO = { cor: "#5b6b68", texto: "#ffffff" };
export function corDaCategoria(c: string): string {
  return (CORES_CATEGORIA[c] ?? COR_PADRAO).cor;
}
export function textoDaCategoria(c: string): string {
  return (CORES_CATEGORIA[c] ?? COR_PADRAO).texto;
}

/**
 * Filtro único de categoria e subcategoria do painel: chips em dois níveis.
 * Escolher uma categoria abre a linha das subcategorias dela, com a contagem de cada uma.
 */
export default function FiltroCategorias({
  categorias,
  categoria,
  onCategoria,
  subcategorias,
  subcategoria,
  onSubcategoria,
  contagemCategoria,
  contagemSubcategoria,
  total,
}: {
  categorias: string[];
  categoria: string;
  onCategoria: (c: string) => void;
  subcategorias: string[];
  subcategoria: string;
  onSubcategoria: (s: string) => void;
  contagemCategoria: Record<string, number>;
  contagemSubcategoria: Record<string, number>;
  total: number;
}) {
  // Ao escolher uma categoria, a linha rola até o chip dela, para ele nunca ficar cortado na borda.
  const linhaCatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const linha = linhaCatRef.current;
    const ativo = linha?.querySelector<HTMLElement>(".pf-chip-filtro--ativo");
    if (!linha || !ativo) return;
    // Rola só a própria linha (não a página) até o chip ativo, se ele estiver cortado.
    const inicio = ativo.offsetLeft;
    const fim = inicio + ativo.offsetWidth;
    if (fim > linha.scrollLeft + linha.clientWidth) linha.scrollTo({ left: fim - linha.clientWidth + 12, behavior: "smooth" });
    else if (inicio < linha.scrollLeft) linha.scrollTo({ left: inicio - 12, behavior: "smooth" });
  }, [categoria]);
  return (
    <div className="pf-arvore" role="group" aria-label="Categoria e subcategoria">
      <div className="pf-arvore-faixa">
        <div className="pf-arvore-linha">
          <span className="pf-arvore-rotulo">Categoria</span>
          <div className="pf-arvore-chips pf-arvore-chips--cat" ref={linhaCatRef}>
            <button type="button" className={`pf-chip-filtro${categoria === "" ? " pf-chip-filtro--ativo" : ""}`} aria-pressed={categoria === ""} onClick={() => onCategoria("")}>
              Todos <small>{total}</small>
            </button>
            {categorias.map((c) => (
              <button key={c} type="button" style={{ ["--cor" as string]: corDaCategoria(c), ["--cor-texto" as string]: textoDaCategoria(c) }} className={`pf-chip-filtro pf-chip-cat${categoria === c ? " pf-chip-filtro--ativo" : ""}${(contagemCategoria[c] ?? 0) === 0 ? " pf-chip-filtro--vazio" : ""}`} aria-pressed={categoria === c} onClick={() => onCategoria(c)}>
                {c} <small>{contagemCategoria[c] ?? 0}</small>
              </button>
            ))}
          </div>
        </div>
        {categoria ? (
          <div className="pf-arvore-linha pf-arvore-linha--sub">
            <span className="pf-arvore-rotulo">Subcategoria</span>
            <div className="pf-arvore-chips pf-arvore-chips--sub" style={{ ["--cor" as string]: corDaCategoria(categoria) }} aria-label="Subcategorias">
              {subcategorias.map((sc) => (
                <button key={sc} type="button" className={`pf-chip-filtro pf-chip-filtro--sub${subcategoria === sc ? " pf-chip-filtro--ativo" : ""}${(contagemSubcategoria[sc] ?? 0) === 0 ? " pf-chip-filtro--vazio" : ""}`} aria-pressed={subcategoria === sc} onClick={() => onSubcategoria(sc)}>
                  {sc} <small>{contagemSubcategoria[sc] ?? 0}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
