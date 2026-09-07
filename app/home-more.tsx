"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { trackEvent } from "./analytics";
import { UNIT_GOOGLE_PROFILES } from "./google-reviews";
import { INSTAGRAM_URL } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import {
  InstagramIcon,
  FAQItem,
  type SelectorIntent,
} from "./home-chrome";
import { STORE_PHOTOS } from "./store-photos";

const GOOGLE_REVIEWS = [
  {
    author: "Jaderson Almeida",
    meta: "Avaliação no Google · Sabará",
    time: "5 anos atrás",
    text: "Quer encontrar medicamentos baratos entre outras coisas. Confira os melhores preços e compare.",
    color: "#5f6368",
  },
  {
    author: "Beatriz Cristina",
    meta: "Avaliação no Google · Sabará",
    time: "1 ano atrás",
    text: "Atendimento excelente, todos são muito gentis e as entregas chegam rapidamente.",
    color: "#1a73e8",
  },
  {
    author: "Thais Juliane",
    meta: "Avaliação no Google · Sabará",
    time: "8 meses atrás",
    text: "Sempre que preciso compro lá. Preço ótimo e atendimento maravilhoso!",
    color: "#188038",
  },
  {
    author: "Kenner Alcino",
    meta: "Avaliação no Google · Sabará",
    time: "2 anos atrás",
    text: "A melhor farmácia da região.",
    color: "#c5221f",
  },
];

function GoogleMark() {
  return (
    <svg className="reviews-google-g" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GoldStar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
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
                <figcaption>
                  <strong>{photo.kind}</strong>
                  <span>{photo.unit}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="story-copy">
            <p className="section-kicker">Fotos da loja</p>
            <h2 id="story-title">{"A farmácia de verdade, em Sabará"}</h2>
            <p>
              {"Fachada da Nações Unidas e interior organizado em Fátima e Itacolomi. Três lojas de rua — você reconhece o endereço e se imagina no balcão."}
            </p>
            <p className="story-note">
              {"Fotos da equipe entram aqui só com autorização de quem aparece. Até lá, a loja se apresenta pela fachada, pela gôndola e pelo atendimento no WhatsApp."}
            </p>
            <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("instagram_click", { source: "story" })}>
              <InstagramIcon /> Mais fotos no Instagram
            </a>
          </div>
        </div>
      </section>

      <section className="section reviews-section reveal" id="avaliacoes" aria-labelledby="reviews-title">
        <div className="reviews-head">
          <div className="reviews-brand">
            <span className="reviews-google-mark" aria-hidden="true">
              <GoogleMark />
            </span>
            <div className="reviews-brand-copy">
              <h2 id="reviews-title">{"Avaliações no Google"}</h2>
              <p className="reviews-score">
                <span className="reviews-score-meta">{"Cada loja tem o próprio perfil. A nota só aparece depois da conferência."}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="reviews-unit-grid">
          {UNIT_GOOGLE_PROFILES.map((profile) => (
            <a
              className="reviews-unit-card"
              key={profile.unitId}
              href={profile.mapsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("google_reviews_click", { unit: profile.unitId })}
            >
              <strong>{profile.label}</strong>
              {profile.rating !== null ? (
                <span className="reviews-unit-score">{profile.rating.toFixed(1).replace(".", ",")} no Google</span>
              ) : (
                <span className="reviews-unit-score">{"Ver avaliações no Google"}</span>
              )}
              <small>{profile.sourceNote}</small>
            </a>
          ))}
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
