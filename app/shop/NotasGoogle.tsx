import { formatarNotaGoogle, NOTAS_GOOGLE_LOJAS } from "../data/avaliacoes-google";

type Props = { className?: string };

/**
 * Notas reais das três lojas no Google (C-05, C-08, C-16; L-1: só dado real, nunca arredondado nem somado).
 * Fonte única: app/data/avaliacoes-google.ts. Fica perto do botão de comprar e na primeira tela da home.
 * Não use em página de medicamento de prescrição (P-15, R-06).
 */
export default function NotasGoogle({ className }: Props) {
  return (
    <section className={className ? `notas-google ${className}` : "notas-google"} aria-label="Avaliações reais das lojas no Google">
      <p className="notas-google-titulo">
        <span aria-hidden="true" className="notas-google-estrela">★</span> Clientes avaliam nossas lojas no Google
      </p>
      <ul className="notas-google-lista">
        {NOTAS_GOOGLE_LOJAS.map((loja) => (
          <li key={loja.unitId}>
            <a href={loja.urlAvaliacoes} target="_blank" rel="noreferrer" aria-label={`Ver as ${loja.quantidade} avaliações da loja ${loja.loja} no Google, nota ${formatarNotaGoogle(loja.nota)} de 5 (abre em nova aba)`}>
              <strong>{formatarNotaGoogle(loja.nota)}</strong>
              <span>{loja.loja}</span>
              <span>{loja.quantidade} avaliações</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
