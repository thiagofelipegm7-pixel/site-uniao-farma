import { PAYMENT_ACCEPTED } from "../../site-config";

/** Formas de pagamento aceitas na loja, lidas do mesmo texto público que alimenta os dados estruturados (uma fonte só). */
const FORMAS = [...PAYMENT_ACCEPTED.split(",").map((forma) => forma.trim()).filter(Boolean), "ECX Card"];

function Icone({ forma }: { forma: string }) {
  const f = forma.toLowerCase();
  const comum = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  if (f.includes("pix")) {
    return (
      <svg {...comum}>
        <path d="M12 3l4.5 4.5L12 12 7.5 7.5 12 3z" />
        <path d="M12 12l4.5 4.5L12 21l-4.5-4.5L12 12z" />
        <path d="M3 12l3-3M18 15l3-3M3 12l3 3M18 9l3 3" />
      </svg>
    );
  }
  if (f.includes("dinheiro")) {
    return (
      <svg {...comum}>
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  );
}

/** Meios de pagamento da página de produto. Nada é cobrado no site: o pagamento é na retirada ou na entrega. */
export default function MeiosPagamento() {
  return (
    <section className="pdp-pagamento section-inner" aria-labelledby="pagamento-titulo">
      <h2 id="pagamento-titulo">Meios de pagamento</h2>
      <p className="pdp-pagamento-nota">Nada é cobrado no site. Você paga na retirada ou na entrega.</p>
      <ul className="pdp-pagamento-lista">
        {FORMAS.map((forma) => (
          <li key={forma}>
            <Icone forma={forma} />
            <span>{forma.charAt(0).toUpperCase() + forma.slice(1)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
