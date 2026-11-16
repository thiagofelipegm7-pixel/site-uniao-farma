import "../motion/motion.css";
import "./pill-steps.css";

const ETAPAS = ["Cesta", "Entrega", "Finalizar"];

type PillStepsProps = {
  /** Etapa atual: 0 = Cesta, 1 = Entrega, 2 = Finalizar. */
  atual: number;
};

/** Indicador de etapas em pílulas: a etapa atual se expande em preto, as concluídas viram só o check. */
export default function PillSteps({ atual }: PillStepsProps) {
  return (
    <ol className="pill-steps" aria-label={`Passo ${atual + 1} de ${ETAPAS.length}: ${ETAPAS[atual]}`}>
      {ETAPAS.map((nome, i) => {
        const estado = i < atual ? "is-done" : i === atual ? "is-on" : "";
        return (
          <li key={nome} className={`pill-steps-item ${estado}`}>
            <span className="pill-steps-n" aria-hidden="true">
              {i < atual ? (
                <svg width="15" height="15" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                i + 1
              )}
            </span>
            <span className="pill-steps-t">{nome}</span>
          </li>
        );
      })}
    </ol>
  );
}
