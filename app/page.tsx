"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep the Novidades route working in Vinext production. */

import { useEffect, useRef, useState } from "react";
import UnitStatusBadge from "./UnitStatusBadge";
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import {
  buildWhatsAppUrl,
  GOOGLE_REVIEWS_URL,
  INSTAGRAM_URL,
  SITE_OPTIONS,
  SITE_URL,
  UNITS,
} from "./site-config";
import { HOME_FAQS } from "./seo-content";
import { getPageStructuredData } from "./structured-data";
import { formatOfferPrice, getPublicOffers } from "./offers";

type SelectorIntent = {
  title: string;
  description: string;
  message: string;
  eventName: string;
};

const deliveryIntent: SelectorIntent = {
  title: "Consultar entrega",
  description: "Escolha a unidade mais próxima para verificar o atendimento no seu bairro.",
  message:
    "Olá! Vim pelo site da União Farma e gostaria de saber se vocês entregam no meu bairro. Posso informar meu endereço?",
  eventName: "delivery_inquiry",
};

const categories = [
  {
    icon: "medicine",
    title: "Medicamentos",
    text: "Consulte disponibilidade e condições de atendimento diretamente com uma unidade. Produtos sujeitos a prescrição seguem os requisitos aplicáveis.",
  },
  {
    icon: "beauty",
    title: "Beleza e perfumaria",
    text: "Cuidados para pele, rosto, corpo e rotina de beleza.",
  },
  {
    icon: "hair",
    title: "Cuidados com os cabelos",
    text: "Shampoos, condicionadores, cremes e finalizadores.",
  },
  {
    icon: "hygiene",
    title: "Higiene pessoal",
    text: "Itens para o cuidado diário de toda a família.",
  },
  {
    icon: "baby",
    title: "Mamãe e bebê",
    text: "Fraldas, higiene infantil e produtos para a rotina do bebê.",
  },
  {
    icon: "vitamins",
    title: "Vitaminas e suplementos",
    text: "Consulte marcas, apresentações e disponibilidade na unidade.",
  },
];

const reviews = [
  {
    author: "Beatriz Cristina",
    text: "Atendimento excelente, todos são muito gentis e as entregas chegam rapidamente.",
  },
  {
    author: "Thais Juliane",
    text: "Sempre que preciso compro lá. Preço ótimo e atendimento maravilhoso!",
  },
  {
    author: "Kenner Alcino",
    text: "A melhor farmácia da região.",
  },
];

function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return progress;
}

function WhatsAppIcon() {
  return (
    <img
      className="inline-icon"
      src="/whatsapp-icon.svg"
      alt=""
      width="24"
      height="24"
      aria-hidden="true"
    />
  );
}

function PhoneIcon({ size = 24 }: { size?: number }) {
  return <LineIcon name="phone" size={size} />;
}

function GoogleMapIcon({ size = 24 }: { size?: number }) {
  return <LineIcon name="map" size={size} />;
}

function InstagramIcon() {
  return (
    <img
      className="inline-icon instagram-icon"
      src="/instagram-icon.jpg"
      alt=""
      width="24"
      height="24"
      aria-hidden="true"
    />
  );
}

function LineIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    medicine: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M9 7h6M12 11v6M9 14h6" />
      </>
    ),
    perfume: (
      <>
        <path d="M9 3h6v4H9zM8 7h8l2 4v10H6V11z" />
        <path d="M9 13h6M11 17h2" />
      </>
    ),
    syringe: (
      <>
        <path d="m14 5 5 5M16.5 2.5l5 5M12 7l5 5-8 8H4v-5z" />
        <path d="m4 20-2 2M9 10l5 5" />
      </>
    ),
    delivery: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
      </>
    ),
    care: (
      <>
        <path d="M12 21s-8-4.7-8-11a4 4 0 0 1 7-2.7A4 4 0 0 1 20 10c0 6.3-8 11-8 11z" />
        <path d="M9 12h6M12 9v6" />
      </>
    ),
    pressure: (
      <>
        <path d="M5 8h8a4 4 0 0 1 4 4v3" />
        <rect x="3" y="5" width="7" height="6" rx="2" />
        <circle cx="18" cy="17" r="3" />
        <path d="M18 17l1.5-1.5M13 12h2" />
      </>
    ),
    glucose: (
      <>
        <path d="M12 3s5 5.2 5 10a5 5 0 0 1-10 0c0-4.8 5-10 5-10z" />
        <path d="M9.5 14.5c.7 1.2 1.5 1.8 2.5 1.8" />
      </>
    ),
    payment: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19M7 15h3" />
      </>
    ),
    beauty: (
      <>
        <path d="M12 3c1.5 2.7 3.5 4.1 6 4.5-2.5.5-4.5 1.9-6 4.5-1.5-2.6-3.5-4-6-4.5C8.5 7.1 10.5 5.7 12 3z" />
        <path d="M7 14c.8 1.5 2 2.4 3.5 2.7C9 17 7.8 17.9 7 19.5c-.8-1.6-2-2.5-3.5-2.8C5 16.4 6.2 15.5 7 14z" />
      </>
    ),
    hair: (
      <>
        <path d="M7 20c-1-5 0-9 3-12 2-2 5-3 8-3-1 5-3 9-7 12" />
        <path d="M6 13c3 1 5 3 6 7" />
      </>
    ),
    hygiene: (
      <>
        <path d="M8 3h8v4H8zM7 7h10v14H7z" />
        <path d="M9 12h6M9 16h6" />
      </>
    ),
    baby: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c.5-5 3-8 7-8s6.5 3 7 8" />
        <path d="M10 8h.01M14 8h.01M10.5 10.5c1 .7 2 .7 3 0" />
      </>
    ),
    vitamins: (
      <>
        <path d="M8 3h8v4H8zM7 7h10v14H7z" />
        <path d="m12 10 1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    map: (
      <>
        <path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    phone: (
      <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1.5-1.5 3a15.2 15.2 0 0 1-10-10L8.5 7z" />
    ),
    external: (
      <>
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
  };

  return (
    <svg
      className="line-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`faq-item ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="faq-question"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="faq-icon" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      <div className="faq-answer" hidden={!open}>
        <p>{a}</p>
      </div>
    </article>
  );
}

function UnitSelectorModal({
  intent,
  onClose,
}: {
  intent: SelectorIntent | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!intent) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [intent, onClose]);

  if (!intent) return null;


  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="unit-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-selector-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <p className="section-kicker">Atendimento pelo WhatsApp</p>
        <h2 id="unit-selector-title">{intent.title}</h2>
        <p className="modal-description">{intent.description}</p>
        <div className="modal-unit-list">
          {UNITS.map((unit) => (
            <a
              className="modal-unit-option"
              key={unit.id}
              href={buildWhatsAppUrl(unit, intent.message.replaceAll("{unidade}", unit.shortName))}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                trackEvent("unit_selection", {
                  unit: unit.id,
                  intent: intent.eventName,
                });
                trackEvent("whatsapp_click", {
                  unit: unit.id,
                  source: "unit_selector",
                  intent: intent.eventName,
                });
                onClose();
              }}
            >
              <span>
                <strong>{unit.shortName}</strong>
                <small>{unit.address}</small>
              </span>
              <span className="modal-unit-action">
                <WhatsAppIcon /> Abrir conversa
              </span>
            </a>
          ))}
        </div>
        <p className="modal-note">
          Você será direcionado ao WhatsApp da unidade selecionada. Preço, estoque, entrega e
          horários especiais devem ser confirmados com a equipe.
        </p>
      </section>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectorIntent, setSelectorIntent] = useState<SelectorIntent | null>(null);
  const [showStickyConsult, setShowStickyConsult] = useState(false);
  const consultationRef = useRef<HTMLDivElement | null>(null);
  const progress = useScrollProgress();
  const heroOffers = getPublicOffers().slice(0, 3);
  const homeStructuredData = getPageStructuredData({
    name: "Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    faqs: HOME_FAQS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

  const openSelector = (intent: SelectorIntent) => {
    trackEvent("unit_selector_open", { intent: intent.eventName });
    setSelectorIntent(intent);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 860) setMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [menuOpen]);

  const generalIntent: SelectorIntent = {
    title: "Escolha sua unidade",
    description: "Selecione a loja em que deseja consultar preço, estoque ou fazer seu pedido.",
    message:
      "Olá, União Farma {unidade}! Quero pedir um produto. Nome: ___  dosagem: ___  bairro: ___",
    eventName: "consulta_geral",
  };

  useEffect(() => {
    const target = consultationRef.current;
    const buttonObserver = new IntersectionObserver(
      ([entry]) => {
        setShowStickyConsult(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0.15 },
    );

    if (target) buttonObserver.observe(target);

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.08 },
    );

    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

    return () => {
      buttonObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <div className="scroll-indicator" style={{ width: `${progress}%` }} aria-hidden="true" />

      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className={SITE_OPTIONS.promoToast.enabled ? "site-header has-promo" : "site-header"}>
        <nav className="nav" aria-label="Menu principal">
          <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
            <img
              src="/uniao-farma-logo.webp"
              alt="Logo da União Farma"
              width="52"
              height="52"
            />
            <span>
              <strong>União Farma</strong>
              <small>Drogaria e Perfumaria</small>
            </span>
          </a>

          <button
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-links"
            aria-label={menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="menu-label">{menuOpen ? "Fechar" : "Menu"}</span>
          </button>

          <div className={menuOpen ? "menu-links is-open" : "menu-links"} id="menu-links">
            <a href="/ofertas" onClick={() => setMenuOpen(false)}>
              Ofertas
            </a>
            <a href="#unidades-rapidas" onClick={() => setMenuOpen(false)}>
              Unidades
            </a>
            <a href="/receita" onClick={() => setMenuOpen(false)}>
              Receita
            </a>
            <button className="header-cta" type="button" onClick={() => openSelector(generalIntent)}>
              <WhatsAppIcon />
              Pedir no WhatsApp
            </button>
          </div>
          {menuOpen && (
            <button
              type="button"
              className="menu-backdrop"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            />
          )}
        </nav>
        {SITE_OPTIONS.promoToast.enabled && (
          <div className="promo-toast" role="status">
            {SITE_OPTIONS.promoToast.text}
          </div>
        )}
      </header>

      <main id="conteudo">
        <section className="hero reveal is-visible" id="inicio" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Drogaria e Perfumaria em Sabará</p>
              <h1 id="hero-title">Cuidado, ofertas e entrega pertinho de você.</h1>
              <p className="hero-lead">
                Consulte produtos, preço e disponibilidade pelo WhatsApp da unidade mais próxima.
              </p>
              <div className="hero-actions" ref={consultationRef}>
                <DirectUnitLinks
                  message={generalIntent.message}
                  intent={generalIntent.eventName}
                  source="home_hero"
                  heading="Escolha sua unidade e fale direto com a equipe"
                  description="Rua, horário e atendimento direto em cada loja."
                />
                <a className="hero-secondary-link" href="/ofertas">
                  Ver ofertas disponíveis
                </a>
                <p className="response-time">
                  <span aria-hidden="true" />
                  {SITE_OPTIONS.responseMessage}
                </p>
              </div>
              <div className="hero-mobile-facts" aria-label="Informações da União Farma">
                <span><strong>3</strong> unidades</span>
                <span><strong>7</strong> anos</span>
                <span><strong>4,7</strong> no Google</span>
              </div>
            </div>

            <aside className="hero-offer-showcase" aria-label="Ofertas em destaque">
              <div className="hero-showcase-heading">
                <span>Ofertas</span>
                <strong>em destaque</strong>
              </div>
              <div className="hero-product-stack">
                {heroOffers.map((offer, index) => (
                  <article className={`hero-product hero-product-${index + 1}`} key={offer.id}>
                    {offer.image && (
                      <img src={offer.image} alt={offer.name} width="360" height="360" />
                    )}
                    {index === 0 && offer.currentPrice !== null && (
                      <span className="hero-price-tag">
                        <small>A partir de</small>
                        <strong>{formatOfferPrice(offer.currentPrice)}</strong>
                      </span>
                    )}
                  </article>
                ))}
              </div>
              <span className="hero-heart" aria-hidden="true">♥</span>
              <p>*Ofertas enquanto durarem os estoques. Consulte a unidade.</p>
            </aside>
          </div>
        </section>

        <section className="quick-units-section reveal" id="unidades-rapidas" aria-labelledby="quick-units-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Atendimento direto</p>
                <h2 id="quick-units-title">Escolha sua unidade</h2>
              </div>
              <p>Vá direto ao WhatsApp da loja mais conveniente para você.</p>
            </div>

            <div className="quick-unit-grid">
              {UNITS.map((unit) => (
                <article className="quick-unit-card" key={unit.id}>
                  <span className="unit-number" aria-hidden="true">
                    {String(UNITS.indexOf(unit) + 1).padStart(2, "0")}
                  </span>
                  <h3>{unit.shortName}</h3>
                  <p>{unit.address}</p>
                  <UnitStatusBadge unit={unit} />
                  <div className="quick-unit-actions">
                    <a
                      className="button button-whatsapp"
                      href={buildWhatsAppUrl(unit, generalIntent.message.replaceAll("{unidade}", unit.shortName))}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        trackEvent("whatsapp_click", {
                          unit: unit.id,
                          source: "quick_units",
                        })
                      }
                    >
                      <WhatsAppIcon />
                      Falar no WhatsApp
                    </a>
                    <a className="text-link" href={`/unidades/${unit.slug}`}>
                      <span className="desktop-label">Conhecer esta unidade</span>
                      <span className="mobile-label">Ver detalhes</span>
                    </a>
                    <a
                      className="text-link quick-recipe-link"
                      href={buildWhatsAppUrl(unit, `Olá, União Farma ${unit.shortName}! Vou enviar a foto da receita (ou Memed). Pode o farmacêutico conferir?`)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackEvent("whatsapp_click", { unit: unit.id, intent: "enviar_receita", source: "quick_units", placement: "recipe" })}
                    >
                      Enviar receita
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="trust-strip reveal" aria-label="Diferenciais da União Farma">
          <div className="section-inner trust-strip-grid">
            <div>
              <strong>3</strong>
              <span>unidades em Sabará</span>
            </div>
            <div>
              <strong>7 anos</strong>
              <span>de atendimento próximo</span>
            </div>
            <div>
              <strong>Entrega</strong>
              <span>sob consulta por região</span>
            </div>
            <div>
              <strong>Farmacêutico</strong>
              <span>para orientação e cuidado</span>
            </div>
          </div>
        </section>

        <section className="section home-offers-callout reveal" aria-labelledby="home-offers-title">
          <div className="section-inner home-offers-panel">
            <div>
              <p className="section-kicker light">Ofertas selecionadas</p>
              <h2 id="home-offers-title">Ofertas da União Farma</h2>
              <p>Confira ofertas selecionadas atualmente aprovadas nas unidades.</p>
            </div>
            <a className="button button-light" href="/ofertas">
              Ver ofertas
            </a>
          </div>
        </section>


        <section className="section delivery-section reveal" id="entrega" aria-labelledby="delivery-title">
          <div className="section-inner delivery-panel">
            <div className="delivery-copy">
              <p className="section-kicker light">Comodidade para sua rotina</p>
              <h2 id="delivery-title">Consulte entrega no seu bairro</h2>
              <p>
                {SITE_OPTIONS.delivery.coverageText} {SITE_OPTIONS.delivery.paymentText}
              </p>
              <ul className="check-list light-list">
                <li>Informe seu bairro ou endereço para a unidade.</li>
                <li>Confirme taxa, prazo e disponibilidade no momento do pedido.</li>
                <li>Escolha a forma de pagamento oferecida pela loja.</li>
              </ul>
              <DirectUnitLinks
                message={deliveryIntent.message}
                intent={deliveryIntent.eventName}
                source="home_delivery_section"
                heading="Informe seu bairro pelo WhatsApp"
                description="Escolha a unidade e confirme região, taxa e prazo de entrega."
                compact
              />
            </div>
            <div className="delivery-visual" aria-hidden="true">
              <LineIcon name="delivery" size={92} />
              <strong>Pedido pelo WhatsApp</strong>
              <span>Confirmação direta com a unidade</span>
            </div>
          </div>
        </section>

        <section className="section categories-section reveal" id="categorias" aria-labelledby="categories-title">
          <div className="section-inner">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Encontre o que precisa</p>
                <h2 id="categories-title">Principais categorias</h2>
              </div>
              <p>
                Esta vitrine apresenta categorias permanentes. Preço e disponibilidade são
                confirmados pelo WhatsApp para evitar informações desatualizadas.
              </p>
            </div>

            <div className="category-grid">
              {categories.map((category) => (
                <article className="category-card" key={category.title}>
                  <span className="category-icon" aria-hidden="true">
                    <LineIcon name={category.icon} size={32} />
                  </span>
                  <h3>{category.title}</h3>
                  <p>{category.text}</p>
                  <button
                    type="button"
                    className="category-link"
                    onClick={() =>
                      openSelector({
                        title: `Consultar ${category.title.toLowerCase()}`,
                        description: "Escolha a unidade para verificar marcas, opções e disponibilidade.",
                        message: `Olá! Vim pelo site da União Farma e gostaria de consultar produtos da categoria ${category.title}.`,
                        eventName: `categoria_${category.title
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .toLowerCase()
                          .replace(/\s+/g, "_")}`,
                      })
                    }
                  >
                    {category.title === "Medicamentos" ? "Consultar uma unidade" : "Consultar categoria"} <span aria-hidden="true">→</span>
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-intent-links" aria-labelledby="seo-intents-title">
          <div className="section-inner">
            <p className="section-kicker">Encontre pela sua necessidade</p>
            <h2 id="seo-intents-title">Informações rápidas sobre a União Farma</h2>
            <div className="seo-intent-grid">
              <a href="/farmacia-em-sabara">Farmácia em Sabará</a>
              <a href="/entrega-de-medicamentos-em-sabara">Entrega de medicamentos em Sabará</a>
              <a href="/perfumaria-em-sabara">Perfumaria em Sabará</a>
            </div>
          </div>
        </section>

        <section className="section story-section reveal" aria-labelledby="story-title">
          <div className="section-inner story-grid">
            <div className="photo-gallery">
              <figure className="photo-main">
                <img
                  src="/uniao-farma-nacoes-loja.webp"
                  alt="Entrada e interior da unidade União Farma Nações Unidas"
                  width="900"
                  height="1100"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>Unidade Nações Unidas</figcaption>
              </figure>
              <div className="photo-side">
                <img
                  src="/uniao-farma-medicamentos.webp"
                  alt="Prateleiras de medicamentos da União Farma"
                  width="640"
                  height="480"
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src="/uniao-farma-perfumaria.webp"
                  alt="Setor de perfumaria e cuidados da União Farma"
                  width="640"
                  height="480"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            <div className="story-copy">
              <p className="section-kicker">Farmácia e drogaria em Sabará</p>
              <h2 id="story-title">Cuidado próximo, do jeito que você conhece</h2>
              <p>
                Há 7 anos, a União Farma atende Sabará com atenção, clareza e praticidade. Encontre
                medicamentos, beleza e perfumaria em Sabará e fale rapidamente com a unidade certa.
              </p>
              <ul className="check-list">
                <li>Três unidades com atendimento local.</li>
                <li>Consulta de preço, estoque e entrega pelo WhatsApp.</li>
                <li>Medicamentos, perfumaria e cuidados para toda a família.</li>
              </ul>
              <a
                className="text-link"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("instagram_click", { source: "story" })}
              >
                <InstagramIcon />
                Ver ofertas e novidades no Instagram
              </a>
            </div>
          </div>
        </section>

        <section className="section units-section reveal" id="unidades" aria-labelledby="unidades-title">
          <div className="section-inner">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Endereços e horários</p>
                <h2 id="unidades-title">Conheça nossas unidades</h2>
              </div>
              <p>
                Preços, estoque, regiões de entrega e horários em feriados podem variar. Confirme
                pelo WhatsApp antes de se deslocar.
              </p>
            </div>
            <p className="mobile-swipe-hint" aria-hidden="true">Deslize para ver as três unidades →</p>

            <div className="unit-grid">
              {UNITS.map((unit) => (
                <article className="unit-card" key={unit.id}>
                  <div className="unit-card-top">
                    <span className="unit-index" aria-hidden="true">
                      {String(UNITS.indexOf(unit) + 1).padStart(2, "0")}
                    </span>
                    <h3>{unit.shortName}</h3>
                    <p>{unit.address}</p>
                    <UnitStatusBadge unit={unit} />
                  </div>

                  <div className="unit-map">
                    <iframe
                      src={unit.mapEmbed}
                      title={`Mapa da unidade ${unit.shortName}`}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a
                      className="map-overlay"
                      href={unit.map}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir localização da unidade ${unit.shortName} no Google Maps`}
                      onClick={() => trackEvent("maps_click", { unit: unit.id, source: "unit_card" })}
                    >
                      <span className="map-overlay-text">
                        <GoogleMapIcon size={16} />
                        Abrir no Google Maps
                      </span>
                    </a>
                  </div>

                  <div className="contact-details">
                    <a href={unit.phoneLink} onClick={() => trackEvent("phone_click", { unit: unit.id, source: "unit_card" })}>
                      <PhoneIcon size={20} />
                      <span>
                        <small>Telefone fixo</small>
                        <strong>{unit.phone}</strong>
                      </span>
                    </a>
                    <a
                      href={buildWhatsAppUrl(unit, generalIntent.message.replaceAll("{unidade}", unit.shortName))}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackEvent("whatsapp_click", { unit: unit.id, source: "unit_card" })}
                    >
                      <WhatsAppIcon />
                      <span>
                        <small>WhatsApp</small>
                        <strong>{unit.whatsapp}</strong>
                      </span>
                    </a>
                  </div>

                  <div className="hours">
                    <h4>
                      <LineIcon name="clock" size={20} /> Horário regular
                    </h4>
                    <dl>
                      <div>
                        <dt>Segunda a sexta</dt>
                        <dd>07:00–21:00</dd>
                      </div>
                      <div>
                        <dt>Sábado</dt>
                        <dd>{unit.schedule.sat?.open}–{unit.schedule.sat?.close}</dd>
                      </div>
                      <div>
                        <dt>Domingo</dt>
                        <dd>07:00–12:00</dd>
                      </div>
                    </dl>
                    <p>Feriados: confirme o horário pelo WhatsApp.</p>
                  </div>

                  <div className="card-actions">
                    <a
                      className="button button-whatsapp"
                      href={buildWhatsAppUrl(unit, generalIntent.message.replaceAll("{unidade}", unit.shortName))}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackEvent("whatsapp_click", { unit: unit.id, source: "unit_actions" })}
                    >
                      <WhatsAppIcon />
                      Consultar pelo WhatsApp
                    </a>
                    <a
                      className="button button-call"
                      href={unit.phoneLink}
                      onClick={() => trackEvent("phone_click", { unit: unit.id, source: "unit_actions" })}
                    >
                      <PhoneIcon size={20} />
                      Ligar para a unidade
                    </a>
                    <a className="map-link" href={`/unidades/${unit.slug}`}>
                      Ver página completa da unidade
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section reviews-section reveal" id="avaliacoes" aria-labelledby="avaliacoes-title">
          <div className="section-inner">
            <div className="reviews-heading">
              <div>
                <p className="section-kicker">Avaliações no Google</p>
                <h2 id="avaliacoes-title">Quem conhece, confia</h2>
              </div>
              <div className="reviews-score">
                <strong>4,7</strong>
                <span>
                  <span className="rating-stars" aria-label="4,7 de 5 estrelas">
                    ★★★★★
                  </span>
                  <small>Média aproximada das unidades atualmente avaliadas</small>
                </span>
              </div>
            </div>

            <p className="mobile-swipe-hint" aria-hidden="true">Deslize para ler mais avaliações →</p>
            <div className="review-grid">
              {reviews.map((review) => (
                <blockquote className="review-card" key={review.author}>
                  <div className="rating-stars" aria-label="5 de 5 estrelas">
                    ★★★★★
                  </div>
                  <p>“{review.text}”</p>
                  <footer>
                    <strong>{review.author}</strong>
                    <span>Avaliação publicada no Google</span>
                  </footer>
                </blockquote>
              ))}
            </div>

            <a
              className="reviews-link"
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("google_reviews_click")}
            >
              Ver avaliações no Google <span aria-hidden="true">↗</span>
            </a>
            <p className="reviews-note">
              A nota exibida ainda não representa separadamente as três lojas. Os perfis e as notas
              individuais poderão ser adicionados quando os links de cada unidade forem confirmados.
            </p>
          </div>
        </section>

        <section className="section faq-section reveal" id="faq" aria-labelledby="faq-title">
          <div className="section-inner">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Tire suas dúvidas</p>
                <h2 id="faq-title">Perguntas frequentes</h2>
              </div>
              <p>Não encontrou a resposta? Escolha uma unidade e fale diretamente com a equipe.</p>
            </div>
            <div className="faq-list">
              {HOME_FAQS.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
            <div className="faq-cta">
              <DirectUnitLinks
                message={generalIntent.message}
                intent={generalIntent.eventName}
                source="home_faq"
                heading="Fale diretamente com uma unidade"
                description="Escolha a loja mais conveniente para você."
                compact
              />
            </div>
          </div>
        </section>

        <section className="instagram-section reveal" aria-labelledby="instagram-title">
          <div className="section-inner instagram-panel">
            <div>
              <p className="section-kicker light">Conteúdos e redes sociais</p>
              <h2 id="instagram-title">Acompanhe as novidades da União Farma</h2>
              <p>
                Veja informações publicadas no site e acompanhe a União Farma também pelo Instagram.
              </p>
            </div>
            <div className="instagram-actions">
              <a className="instagram-button" href="/novidades">Ver todas as novidades</a>
              <a
                className="instagram-secondary-button"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("instagram_click", { source: "instagram_section" })}
              >
                <InstagramIcon />
                Abrir Instagram
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer reveal">
        <div className="section-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <img
                src="/uniao-farma-logo.webp"
                alt="Logo da União Farma"
                width="58"
                height="58"
              />
              <div>
                <strong>União Farma</strong>
                <p>Drogaria e Perfumaria com três unidades em Sabará/MG.</p>
              </div>
            </div>

            <nav aria-label="Links do rodapé">
              <a href="/">Início</a>
              <a href="/ofertas">Ofertas</a>
              <a href="/novidades">Novidades</a>
              <a href="#unidades-rapidas">Unidades</a>
              <a href="#categorias">Categorias</a>
              <a href="#entrega">Entrega</a>
              <a href="#avaliacoes">Avaliações</a>
              <a href="/privacidade">Privacidade</a>
              <a href="/termos">Termos de uso</a>
            </nav>
          </div>

          <div className="footer-bottom-bar">
            <div className="anvisa-section">
              <img
                className="anvisa-logo"
                src="/anvisa-logo.png"
                alt="Anvisa — Agência Nacional de Vigilância Sanitária"
                width="120"
                height="112"
              />
              <p>A União Farma segue as determinações sanitárias aplicáveis.</p>
            </div>
          </div>

          <div className="legal-note">
            <LineIcon name="shield" size={20} />
            <p>
              Medicamentos podem apresentar riscos. Não se automedique e procure orientação de um
              profissional de saúde. Preços e disponibilidade devem ser confirmados com a unidade.
            </p>
          </div>
        </div>
      </footer>

      <div className={showStickyConsult ? "floating-bar is-visible" : "floating-bar"}>
        <a className="floating-btn floating-units" href="#unidades-rapidas">
          <LineIcon name="map" size={20} />
          Unidades
        </a>
        <button className="floating-btn floating-whatsapp" type="button" onClick={() => openSelector(generalIntent)}>
          <WhatsAppIcon />
          Pedir no WhatsApp
        </button>
      </div>

      <UnitSelectorModal intent={selectorIntent} onClose={() => setSelectorIntent(null)} />
    </>
  );
}
