/**
 * Logo da faixa principal só com as letras, como a "PanVel" branca da Panvel: "UNIÃO FARMA" em itálico pesado direto
 * sobre a faixa, com "Drogaria e Perfumaria". Texto vivo (nítido em qualquer tela), sem ilustração.
 * O link que a envolve já tem o nome acessível.
 */
export default function MarcaUniao() {
  return (
    <span className="marca-uf" aria-hidden="true">
      <span className="marca-uf-texto">
        <strong className="marca-uf-nome">União Farma</strong>
        <em className="marca-uf-pe">Drogaria e Perfumaria</em>
      </span>
    </span>
  );
}
