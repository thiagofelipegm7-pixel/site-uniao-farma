"use client";

import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import DirectUnitLinks from "../DirectUnitLinks";
import PublicOffersGrid from "../PublicOffersGrid";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";
import "../offers-polish.css";

type FAQ = { q: string; a: string };

export default function OffersPageClient({
  faqs,
}: {
  faqs: FAQ[];
  showReviewPanel: boolean;
}) {
  return (
    <>
      <a className="skip-link" href="#lista-ofertas">
        {"Pular para as ofertas"}
      </a>

      <ContentSiteHeader activePath="/ofertas" />

      <main id="conteudo-ofertas" className="offers-page">
        <section className="offers-hero" aria-labelledby="offers-title">
          <div className="section-inner">
            <p className="eyebrow">Ofertas da semana</p>
            <h1 id="offers-title">{"Ofertas em Sabará"}</h1>
            <p className="offers-hero-lead">
              {"Escolha o produto e depois a loja. A equipe confirma se tem hoje."}
            </p>
          </div>
        </section>

        <section className="section offers-list-section" id="lista-ofertas" aria-labelledby="offers-list-title">
          <div className="section-inner">
            <h2 id="offers-list-title" className="sr-only">
              {"Promoções em destaque"}
            </h2>
            <PublicOffersGrid />
          </div>
        </section>

        <section className="section offers-whatsapp-section" id="ofertas-whatsapp" aria-labelledby="ofertas-whatsapp-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">WhatsApp da loja</p>
              <h2 id="ofertas-whatsapp-title">Escolha a unidade</h2>
            </div>
            <DirectUnitLinks
              compact
              message={WHATSAPP_MESSAGES.offer}
              intent="offer"
              source="ofertas_page"
            />
          </div>
        </section>

        <section className="section offers-faq" aria-labelledby="offers-faq-title">
          <div className="section-inner offers-faq-inner">
            <h2 id="offers-faq-title">Antes de chamar</h2>
            <div>
              {faqs.map((faq) => (
                <details key={faq.q} className="offers-faq-item">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <ContentSiteFooter />
    </>
  );
}
