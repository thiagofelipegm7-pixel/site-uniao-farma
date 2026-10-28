import { SITE_OPTIONS } from "./site-config";

/**
 * Faixa de entrega. O espaço do mascote fica reservado só com texto:
 * o arquivo do desenho ainda não existe e nenhuma ilustração é inventada.
 */
export default function DeliverySlot({
  href = "/entrega-de-medicamentos-em-sabara",
  unitName,
  external = false,
  ifood = false,
}: {
  href?: string;
  unitName?: string;
  external?: boolean;
  /** Mostra o aviso de que a loja Nações Unidas também está no iFood. */
  ifood?: boolean;
}) {
  return (
    <section className="delivery-slot" aria-labelledby="delivery-slot-title">
      <div className="delivery-slot-inner">
        <div className="delivery-slot-copy">
          <p className="section-kicker">Entrega em Sabará</p>
          <h2 id="delivery-slot-title">Fazemos entregas{unitName ? ` a partir da loja de ${unitName}` : ""}</h2>
          <p>{SITE_OPTIONS.delivery.coverageText}</p>
          {ifood ? (
            <p>
              A loja Nações Unidas também está no iFood. <a href="/ifood">Veja como pedir</a>.
            </p>
          ) : null}
        </div>
        <a
          className="button button-outline delivery-slot-cta"
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          Ver se entrega no meu bairro
        </a>
      </div>
    </section>
  );
}
