"use client";

/** Cor própria de cada categoria: dá para reconhecer o grupo de relance. */
/* Cores vivas inspiradas na natureza (frutas, flores, folhas). O texto ativo escuro vai nas cores claras. */
const CORES_CATEGORIA: Record<string, { cor: string; texto: string }> = {
  "Medicamentos": { cor: "#1f7aa6", texto: "#ffffff" },
  "Cuidado Diário": { cor: "#22a05a", texto: "#ffffff" },
  "Beleza": { cor: "#e23f7a", texto: "#ffffff" },
  "Bem Estar": { cor: "#9bc21f", texto: "#16210a" },
  "Infantil e Gestante": { cor: "#f27a1c", texto: "#ffffff" },
  "Dermocosméticos": { cor: "#8a4fd6", texto: "#ffffff" },
  "Perfumes": { cor: "#c9a24a", texto: "#2a1d00" },
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
  return (
    <div className="pf-arvore" role="group" aria-label="Categoria e subcategoria">
      <div className="pf-arvore-faixa">
        <div className="pf-arvore-linha">
          <span className="pf-arvore-rotulo">Categoria</span>
          <div className="pf-arvore-chips pf-arvore-chips--cat">
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
