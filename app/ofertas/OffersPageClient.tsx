"use client";

import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import PublicOffersGrid from "../PublicOffersGrid";

type FAQ = { q: string; a: string };

export default function OffersPageClient({
  faqs,
}: {
  faqs: FAQ[];
  showReviewPanel: boolean;
}) {
  return (
    <>
      <a className="skip-link" href="#conteudo-ofertas">
        Pular para o conteúdo
      </a>

      <ContentSiteHeader activePath="/ofertas" />

      <main id="conteudo-ofertas" className="offers-page">
        <section className="offers-hero" aria-labelledby="offers-title">
          <div className="section-inner">
            <p className="eyebrow">Ofertas selecionadas</p>
            <h1 id="offers-title">Ofertas da União Farma em Sabará</h1>
            <p className="offers-hero-lead">
              Foto, produto e um toque na loja. A equipe confirma se tem hoje.
            </p>
            <p className="offers-hero-note">Oferta válida enquanto durarem os estoques.</p>
            <p className="offers-hero-note">Preços e disponibilidade podem variar conforme o estoque de cada unidade.</p>
          </div>
        </section>

        <section className="section offers-list-section" id="lista-ofertas" aria-labelledby="offers-list-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">Ofertas aprovadas da União Farma</p>
              <h2 id="offers-list-title">Promoções em destaque</h2>
            </div>
            <PublicOffersGrid />
          </div>
        </section>

        <section className="section offers-faq" aria-labelledby="offers-faq-title">
          <div className="section-inner offers-faq-inner">
            <div>
              <p className="section-kicker">Dúvidas frequentes</p>
              <h2 id="offers-faq-title">Antes de consultar</h2>
            </div>
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
