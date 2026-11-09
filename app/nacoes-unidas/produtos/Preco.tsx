import "./preco.css";
import { partesPreco } from "./preco";

type Props = {
  precoFmt?: string | null;
  /** Texto quando não há preço ("Consultar", "Consulte"). */
  vazio?: string;
  /** "grande": página do produto. "selo": fundo de oferta (mesma tipografia, com o destaque da oferta). */
  variante?: "grande" | "selo";
};

/**
 * Preço no padrão único do site: R$, reais e centavos no mesmo tamanho (bold, navy),
 * no catálogo, na página do produto e nas ofertas. O texto lido por leitor de tela é o preço inteiro.
 */
export default function Preco({ precoFmt, vazio = "Consultar", variante }: Props) {
  const partes = precoFmt ? partesPreco(precoFmt) : null;
  const classe = `pv-preco${variante ? ` pv-preco--${variante}` : ""}`;
  if (!partes) return <span className={`${classe} pv-preco-vazio`}>{vazio}</span>;
  return (
    <span className={classe} aria-label={precoFmt ?? undefined}>
      <span aria-hidden="true">
        R$ <b>{partes.reais}</b>,{partes.centavos}
      </span>
    </span>
  );
}
