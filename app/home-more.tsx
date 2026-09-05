"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import { GOOGLE_REVIEWS_URL, INSTAGRAM_URL } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import {
  reviews,
  InstagramIcon,
  FAQItem,
  type SelectorIntent,
} from "./home-chrome";

export function HomeMore({
  generalIntent,
  openSelector,
}: {
  generalIntent: SelectorIntent;
  openSelector: (intent: SelectorIntent) => void;
}) {
  return (
    <>
      <section className="section story-section reveal" aria-labelledby="story-title">
        <div className="section-inner story-grid">
          <div className="photo-gallery">
            <img src="/uniao-farma-nacoes-loja.webp" alt="Unidade União Farma Nações Unidas" width="900" height="1100" loading="lazy" decoding="async" />
          </div>
          <div className="story-copy">
            <p className="section-kicker">Farmácia e drogaria em Sabará</p>
            <h2 id="story-title">Cuidado próximo, do jeito que você conhece</h2>
            <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "story" })}>
              <InstagramIcon /> Ver ofertas e novidades no Instagram
            </a>
          </div>
        </div>
      </section>

      <section className="section reviews-section reveal" id="avaliacoes">
        <h2>Quem conhece, confia</h2>
        {reviews.map((review) => (
          <blockquote className="review-card" key={review.author}>
            <p>“{review.text}”</p>
            <footer>{review.author}</footer>
          </blockquote>
        ))}
        <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("google_reviews_click")}>Ver avaliações no Google</a>
      </section>

      <section className="section faq-section reveal" id="faq">
        <h2>Perguntas frequentes</h2>
        {HOME_FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
        <DirectUnitLinks message={generalIntent.message} intent={generalIntent.eventName} source="home_faq" heading="Fale diretamente com uma unidade" description="Escolha a loja mais conveniente para você." compact />
      </section>

      <section className="instagram-section reveal">
        <h2>Acompanhe as novidades da União Farma</h2>
        <a href="/novidades">Ver todas as novidades</a>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "instagram_section" })}>
          <InstagramIcon /> Abrir Instagram
        </a>
      </section>
    </>
  );
}
