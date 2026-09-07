"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import { GOOGLE_REVIEWS_URL, INSTAGRAM_URL } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import {
  InstagramIcon,
  FAQItem,
  type SelectorIntent,
} from "./home-chrome";

const GOOGLE_REVIEWS = [
  {
    author: "Jaderson Almeida",
    meta: "12 avaliações em Sabará",
    time: "5 anos atrás",
    text: "Quer encontrar medicamentos baratos entre outras coisas. Confira os melhores preços e compare.",
    color: "#5f6368",
  },
  {
    author: "Beatriz Cristina",
    meta: "8 avaliações em Sabará",
    time: "1 ano atrás",
    text: "Atendimento excelente, todos são muito gentis e as entregas chegam rapidamente.",
    color: "#1a73e8",
  },
  {
    author: "Thais Juliane",
    meta: "6 avaliações em Sabará",
    time: "8 meses atrás",
    text: "Sempre que preciso compro lá. Preço ótimo e atendimento maravilhoso!",
    color: "#188038",
  },
  {
    author: "Kenner Alcino",
    meta: "4 avaliações em Sabará",
    time: "2 anos atrás",
    text: "A melhor farmácia da região.",
    color: "#c5221f",
  },
];

function GoldStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F4B400" d="M12 2.6l2.7 6.2 6.7.6-5.1 4.4 1.6 6.5L12 16.9 6.1 20.3l1.6-6.5-5.1-4.4 6.7-.6z" />
    </svg>
  );
}

function Stars() {
  return (
    <span className="review-stars" aria-label="5 de 5 estrelas">
      <GoldStar />
      <GoldStar />
      <GoldStar />
      <GoldStar />
      <GoldStar />
    </span>
  );
}

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
            <h2 id="story-title">Quem atende é gente da loja, não um carrinho virtual</h2>
            <p>
              São três drogaria de rua — Fátima, Nações Unidas e Itacolomi — com farmacêutico no horário
              e conversa no WhatsApp da unidade. Preço e estoque valem para o dia. Por isso a confirmação
              é com a loja, não com uma prateleira infinita no site.
            </p>
            <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "story" })}>
              <InstagramIcon /> Ver o que chegou esta semana
            </a>
          </div>
        </div>
      </section>

      <section className="section reviews-section reveal" id="avaliacoes" aria-labelledby="reviews-title">
        <div className="reviews-head">
          <div>
            <h2 id="reviews-title">Avaliações no Google</h2>
            <p className="reviews-score">
              <span className="reviews-score-number">4,7</span>
              <Stars />
            </p>
          </div>
          <a className="reviews-google-link" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("google_reviews_click")}>
            Ver todas
          </a>
        </div>
        <div className="reviews-track" role="list">
          {GOOGLE_REVIEWS.map((review) => (
            <article className="review-card" key={review.author} role="listitem">
              <header className="review-person">
                <span className="review-avatar" style={{ background: review.color }} aria-hidden="true">
                  {review.author.charAt(0)}
                </span>
                <span>
                  <strong>{review.author}</strong>
                  <small>{review.meta}</small>
                </span>
              </header>
              <p className="review-rating-row">
                <Stars />
                <time>{review.time}</time>
              </p>
              <p className="review-text">{review.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section reveal" id="faq">
        <h2>Perguntas que a gente responde todo dia</h2>
        {HOME_FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
        <DirectUnitLinks message={generalIntent.message} intent={generalIntent.eventName} source="home_faq" heading="Ainda com dúvida?" description="Manda no WhatsApp da loja do seu bairro. A resposta vem de quem está no balcão." compact />
      </section>
    </>
  );
}
