import "./sem-foto.css";

type Props = {
  /** Classe de contexto (tamanho e posição); o desenho e as cores são sempre os mesmos. */
  className?: string;
  /** Legenda visível pequena ("Sem foto"). Sem ela, o quadro é só decorativo (aria-hidden). */
  legenda?: string;
};

/** Quadro para produto sem foto: frasco neutro em SVG, fundo suave e proporção quadrada, igual em todas as telas. */
export default function SemFoto({ className = "", legenda }: Props) {
  return (
    <span className={`sem-foto${className ? ` ${className}` : ""}`} aria-hidden={legenda ? undefined : "true"}>
      <svg className="sem-foto-icone" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <rect x="15" y="6" width="18" height="7" rx="2" />
        <path d="M17 13h14v3a4 4 0 0 1 3 4v20a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V20a4 4 0 0 1 3-4z" />
        <rect x="19" y="24" width="10" height="9" rx="1.5" />
      </svg>
      {legenda ? <span className="sem-foto-legenda">{legenda}</span> : null}
    </span>
  );
}
