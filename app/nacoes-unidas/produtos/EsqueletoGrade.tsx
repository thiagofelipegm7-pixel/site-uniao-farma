/**
 * Cartões cinzas no lugar da lista enquanto o catálogo chega. Usam a mesma grade e a mesma caixa do cartão de produto
 * (`pv-grade` / `pv-card`), então nada pula quando os produtos entram. Sem nome, preço nem foto inventados.
 */
export default function EsqueletoGrade({ aviso, quantidade = 8 }: { /** Texto visível acima da grade. Sem ele, quem avisa é a contagem da lista ("Buscando…"). */ aviso?: string; quantidade?: number }) {
  return (
    <div className="pv-esqueleto" aria-busy="true">
      {aviso ? <p className="pv-esqueleto-aviso">{aviso}</p> : null}
      <ul className="catalogo-lista pv-grade" aria-hidden="true">
        {Array.from({ length: quantidade }, (_, k) => (
          <li key={k} className="pv-card pv-card--esqueleto">
            <div className="pv-corpo">
              <span className="pv-img pv-esq-bloco" />
              <span className="pv-texto">
                <span className="pv-esq-linha" />
                <span className="pv-esq-linha pv-esq-linha--curta" />
              </span>
              <span className="pv-esq-linha pv-esq-preco" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
