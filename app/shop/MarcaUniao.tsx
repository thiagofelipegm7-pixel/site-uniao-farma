/**
 * Logo só com as letras: "União Farma" em itálico + selo "Drogaria e Perfumaria". Texto vivo, sem ilustração.
 * `claro` é para fundo branco (nome verde). O link que a envolve já tem o nome acessível.
 */
export default function MarcaUniao({ claro = false }: { claro?: boolean }) {
  return (
    <span className={claro ? "marca-uf marca-uf--claro" : "marca-uf"} aria-hidden="true">
      <span className="marca-uf-texto">
        <span className="marca-uf-nome">União Farma</span>
        <span className="marca-uf-pe">Drogaria e Perfumaria</span>
      </span>
    </span>
  );
}
