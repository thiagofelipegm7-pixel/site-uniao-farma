"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { trackEvent } from "./analytics";
import { type SelectorIntent } from "./home-chrome";
import {
  formatOfferPrice,
  getPublicOffers,
  type Offer,
} from "./offers";

function pickFeaturedOffers(): Offer[] {
  const published = getPublicOffers();
  const featured: Offer[] = [];
  const seen = new Set<string>();

  for (const offer of published) {
    if (featured.length >= 3) break;
    if (seen.has(offer.category) && featured.length + (published.length - featured.length) > 3) {
      if (seen.size < 3 && published.some((item) => !seen.has(item.category) && !featured.includes(item))) {
        continue;
      }
    }
    featured.push(offer);
    seen.add(offer.category);
  }

  if (featured.length < 3) {
    for (const offer of published) {
      if (featured.length >= 3) break;
      if (!featured.some((item) => item.id === offer.id)) featured.push(offer);
    }
  }

  return featured.slice(0, 3);
}

export default function HomeReasons({
  openSelector,
}: {
  openSelector: (intent: SelectorIntent) => void;
}) {
  const offers = pickFeaturedOffers();

  return (
    <section className="home-reasons" id="por-que-chamar" aria-labelledby="home-reasons-title">
      <div className="home-reasons-inner">
        <header className="home-reasons-head">
          <p className="section-kicker">Por que chamar agora</p>
          <h2 id="home-reasons-title">Oferta confirmada, conversa pronta</h2>
          <p>Foto e pre\u00e7o de encarte. A loja confirma se ainda tem hoje.</p>
        </header>

        {offers.length > 0 ? (
          <div className="home-reasons-offers">
            {offers.map((offer) => {
              const price =
                offer.currentPrice !== null ? formatOfferPrice(offer.currentPrice) : "Consulte";
              return (
                <article className="home-offer-card" key={offer.id}>
                  <div className="home-offer-photo">
                    {offer.image ? (
                      <img src={offer.image} alt={offer.name} width="320" height="320" loading="lazy" />
                    ) : (
                      <span>{offer.placeholderLabel ?? "Oferta"}</span>
                    )}
                  </div>
                  <div className="home-offer-body">
                    {offer.brand ? <p className="home-offer-brand">{offer.brand}</p> : null}
                    <h3>{offer.name}</h3>
                    <p className="home-offer-price">{price}</p>
                    <p className="home-offer-note">Enquanto durar o estoque</p>
                    <button
                      type="button"
                      className="home-offer-cta"
                      onClick={() => {
                        trackEvent("offer_unit_select", {
                          offer_id: offer.id,
                          source: "home_featured",
                        });
                        openSelector({
                          title: `Consultar ${offer.name}`,
                          description: "Escolha a loja. A conversa j\u00e1 leva o nome e o pre\u00e7o da oferta.",
                          message: `Oi, Uni\u00e3o Farma {unidade}! Vi a oferta de ${offer.name}${offer.currentPrice !== null ? ` por ${price}` : ""} no site. Tem hoje?`,
                          eventName: `home_offer_${offer.id}`,
                        });
                      }}
                    >
                      Consultar esta oferta
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="home-reasons-empty">As ofertas da semana entram aqui depois da confirma\u00e7\u00e3o com as lojas.</p>
        )}

        <nav className="home-reasons-actions" aria-label="O que voc\u00ea precisa agora">
          <button
            type="button"
            onClick={() =>
              openSelector({
                title: "Consultar pre\u00e7o e disponibilidade",
                description: "Manda o nome do produto. A loja responde se tem e quanto custa hoje.",
                message: "Oi, Uni\u00e3o Farma {unidade}! Quero consultar pre\u00e7o e se tem o produto. Posso mandar o nome?",
                eventName: "home_consult_price",
              })
            }
          >
            Consultar pre\u00e7o e disponibilidade
          </button>
          <a href="/entrega-de-medicamentos-em-sabara">Ver se entrega no meu bairro</a>
          <a href="/receita">Enviar minha receita</a>
        </nav>

        <a className="home-reasons-more" href="/ofertas">
          Ver todas as ofertas
        </a>
      </div>
    </section>
  );
}
