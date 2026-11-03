/**
 * Logo da faixa principal em texto vivo (como a "PanVel" branca da Panvel): a cruz do cartaz com contorno branco e,
 * ao lado, "UNIÃO FARMA" em itálico pesado com "Drogaria" e "Drogaria e Perfumaria". Nítida em qualquer tela,
 * sem imagem do texto. O link que a envolve já tem o nome acessível.
 */
export default function MarcaUniao() {
  return (
    <span className="marca-uf" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- ícone pequeno e estático */}
      <img className="marca-uf-cruz" src="/logo-uniao-farma-cruz.png" alt="" width="44" height="48" decoding="async" />
      <span className="marca-uf-texto">
        <small className="marca-uf-topo">Drogaria</small>
        <strong className="marca-uf-nome">União Farma</strong>
        <em className="marca-uf-pe">Drogaria e Perfumaria</em>
      </span>
    </span>
  );
}
