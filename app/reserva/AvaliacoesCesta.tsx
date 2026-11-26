import {
  avaliacoesParaExibir,
  formatarNotaGoogle,
  NOTAS_GOOGLE_LOJAS,
  type AvaliacaoGoogle,
} from "../data/avaliacoes-google";
import "./avaliacoes-cesta.css";

function EstrelaOuro() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F4B400" d="M12 2.6l2.7 6.2 6.7.6-5.1 4.4 1.6 6.5L12 16.9 6.1 20.3l1.6-6.5-5.1-4.4 6.7-.6z" />
    </svg>
  );
}

function Estrelas({ n }: { n: number }) {
  return (
    <span className="cesta-avaliacoes-estrelas review-stars" role="img" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: n }, (_, i) => <EstrelaOuro key={i} />)}
    </span>
  );
}

function Citacao({ avaliacao }: { avaliacao: AvaliacaoGoogle }) {
  return (
    <figure className="cesta-avaliacoes-item">
      <Estrelas n={avaliacao.estrelas} />
      <blockquote className="cesta-avaliacoes-texto">“{avaliacao.texto}”</blockquote>
      <figcaption className="cesta-avaliacoes-autor">
        {avaliacao.nomeExibicao} · {avaliacao.loja} · {avaliacao.fonte}
      </figcaption>
    </figure>
  );
}

/** Bloco compacto com avaliações reais do Google, abaixo do total da cesta e perto de finalizar. */
export default function AvaliacoesCesta({ variante }: { variante: "gaveta" | "resumo" }) {
  const quantidade = variante === "gaveta" ? 2 : 3;
  const avaliacoes = avaliacoesParaExibir(quantidade);
  if (avaliacoes.length === 0) return null;

  return (
    <section
      className={variante === "gaveta" ? "cesta-avaliacoes cesta-avaliacoes--gaveta" : "cesta-avaliacoes"}
      aria-label="Avaliações de clientes no Google"
    >
      <p className="cesta-avaliacoes-titulo">O que os clientes dizem</p>
      {variante === "resumo" ? (
        <div className="cesta-avaliacoes-notas">
          Notas no Google:{" "}
          {NOTAS_GOOGLE_LOJAS.map((loja, i) => (
            <span key={loja.unitId}>
              {i > 0 ? " · " : null}
              <span className="cesta-avaliacoes-nota">{loja.loja} {formatarNotaGoogle(loja.nota)} ({loja.quantidade})</span>
            </span>
          ))}
        </div>
      ) : null}
      <ul className="cesta-avaliacoes-lista">
        {avaliacoes.map((avaliacao) => (
          <li key={avaliacao.id}>
            <Citacao avaliacao={avaliacao} />
          </li>
        ))}
      </ul>
    </section>
  );
}
