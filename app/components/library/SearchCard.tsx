import { motionIndex } from "../../motion/motion";
import "../../motion/motion.css";
import "./search-card.css";

type SearchCardProps = {
  /** "light" (padrão) ou "dark". */
  theme?: "light" | "dark";
  /** Raio dos cantos do cartão, em px. */
  corner?: number;
  /** Quantidade de linhas animadas enquanto a busca carrega. */
  rows?: number;
  /** Texto acessível para leitores de tela. */
  label?: string;
};

export default function SearchCard({ theme = "light", corner = 16, rows = 3, label = "Buscando…" }: SearchCardProps) {
  return (
    <div
      className={`search-card search-card--${theme}`}
      style={{ borderRadius: corner }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="search-card-linha" key={i} aria-hidden="true" style={motionIndex(i)}>
          <span className="search-card-foto" />
          <span className="search-card-texto">
            <span className="search-card-barra search-card-barra--longa" />
            <span className="search-card-barra search-card-barra--curta" />
          </span>
        </div>
      ))}
    </div>
  );
}
