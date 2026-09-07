"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { trackEvent } from "./analytics";
import { GOOGLE_REVIEWS_URL, INSTAGRAM_URL } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import {
  InstagramIcon,
  FAQItem,
  type SelectorIntent,
} from "./home-chrome";

const STORE_PHOTOS = [
  {
    src: "/uniao-farma-nacoes-loja.webp",
    alt: "Fachada da União Farma Nações Unidas, em Sabará",
  },
  {
    src: "/uniao-farma-perfumaria.webp",
    alt: "Prateleira de shampoos e cuidados para cabelo na União Farma",
  },
  {
    src: "/uniao-farma-medicamentos.webp",
    alt: "Prateleira de medicamentos na União Farma",
  },
  {
    src: "/fotos/bio-extratus",
    alt: "Linha Bio Extratus Mel e Pós-Química na União Farma",
  },
  {
    src: "/fotos/salon-line-cremes",
    alt: "Cremes para pentear Salon Line na prateleira da União Farma",
  },
  {
    src: "/fotos/rexona-clinical",
    alt: "Desodorante Rexona Clinical em creme na União Farma",
  },
  {
    src: "/fotos/dove-oleo-serum",
    alt: "Óleo sérum corporal Dove na União Farma",
  },
  {
    src: "/fotos/salon-line-matizadora",
    alt: "Máscaras matizadoras Salon Line na União Farma",
  },
  {
    src: "/fotos/dove-banho",
    alt: "Linha Dove banho e hidratação corporal na União Farma",
  },
];

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
}: {
  generalIntent?: SelectorIntent;
  openSelector?: (intent: SelectorIntent) => void;
}) {
  return (
    <>
      <section className="section story-section reveal" aria-labelledby="story-title">
        <div className="section-inner story-grid">
          <div className="store-photos" role="list">
            {STORE_PHOTOS.map((photo) => (
              <figure className="store-photo" key={photo.src} role="listitem">
                <img src={photo.src} alt={photo.alt} width="900" height="720" loading="lazy" decoding="async" />
              </figure>
            ))}
          </div>
          <div className="story-copy">
            <p className="section-kicker">Fotos da loja</p>
            <h2 id="story-title">A farmácia de verdade, em Sabará</h2>
            <p>
              Fachada, gôndola e prateleira das unidades. Três lojas de rua — Fátima, Nações Unidas e Itacolomi.
              Preço e estoque se confirmam no WhatsApp da loja.
            </p>
            <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "story" })}>
              <InstagramIcon /> Mais fotos no Instagram
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
        <h2>Perguntas frequentes</h2>
        {HOME_FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </section>
    </>
  );
}
