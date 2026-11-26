/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import { LINHAS_CONFIANCA } from "./confianca";

type Props = { variante: "ticks" | "faixa"; className?: string };

/** Três linhas de confiança, iguais na cesta e no topo do catálogo. */
export default function LinhasConfianca({ variante, className }: Props) {
  const classe = variante === "faixa" ? "faixa-confianca" : "ticks-confianca";
  return (
    <ul className={className ? `${classe} ${className}` : classe} aria-label="Como comprar na União Farma">
      {LINHAS_CONFIANCA.map((linha) => (
        <li key={linha.texto}>
          {variante === "ticks" ? <span className="ticks-confianca-icone" aria-hidden="true">✓</span> : null}
          {"href" in linha && linha.href ? <a href={linha.href}>{linha.texto}</a> : linha.texto}
        </li>
      ))}
    </ul>
  );
}
