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
            <p className="section-kicker">Farmácia de bairro em Sabará</p>
            <h2 id="story-title">Gente que atende gente, não um carrinho virtual</h2>
            <p>
              São três lojas de rua, com farmacêutico no horário e conversa pelo WhatsApp da unidade.
              Preço e estoque valem para o dia — por isso a confirmação é com a loja, não com uma lista enorme no site.
            </p>
            <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "story" })}>
              <InstagramIcon /> Ofertas da semana no Instagram
            </a>
          </div>
        </div>
      </section>

      <section className="section reviews-section reveal" id="avaliacoes" aria-labelledby="reviews-title">
        <h2 id="reviews-title">Quem passa aqui, volta</h2>
        <p className="reviews-score">4,7 no Google</p>
        {reviews.map((review) => (
          <blockquote className="review-card" key={review.author}>
            <p>“{review.text}”</p>
            <footer>{review.author}</footer>
          </blockquote>
        ))}
        <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("google_reviews_click")}>Ler as avaliações no Google</a>
      </section>

      <section className="section faq-section reveal" id="faq">
        <h2>Dúvidas que a gente mais ouve</h2>
        {HOME_FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
        <DirectUnitLinks message={generalIntent.message} intent={generalIntent.eventName} source="home_faq" heading="Ainda com dúvida?" description="Manda no WhatsApp da loja do seu bairro." compact />
      </section>

      <section className="instagram-section reveal">
        <h2>O que chegou e o que está em oferta</h2>
        <a href="/novidades">Ver novidades da loja</a>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "instagram_section" })}>
          <InstagramIcon /> Abrir o Instagram
        </a>
      </section>
    </>
  );
}
