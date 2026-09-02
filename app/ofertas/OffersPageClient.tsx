"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { trackEvent } from "../analytics";
import {
  canPublishOffer,
  canUseInAds,
  getPublicOffers,
  OFFER_CATEGORY_LABELS,
  OFFERS,
  type Offer,
} from "../offers";
import { UNITS, type Unit } from "../site-config";

type FAQ = { q: string; a: string };
type SelectorContext =
  | { action: "availability"; offer: Offer }
  | { action: "general"; offer: null };

const STATUS_LABELS: Record<Offer["publicationStatus"], string> = {
  draft: "Rascunho",
  review: "Em revisão",
  approved: "Aprovado",
  expired: "Expirado",
  blocked: "Bloqueado",
};

const REGULATORY_LABELS: Record<Offer["regulatoryClass"], string> = {
  non_regulated: "Não regulado",
  supplement_review: "Suplemento — revisão",
  otc_review: "Medicamento — revisão",
  prescription_blocked: "Prescrição — bloqueado",
};

function WhatsAppIcon() {
  return <img src="/whatsapp-icon.svg" alt="" width="22" height="22" aria-hidden="true" />;
}

function buildOfferMessage(unit: Unit, context: SelectorContext): string {
  if (!context.offer) {
    return `Olá! Acessei a página de ofertas da União Farma e gostaria de consultar as condições disponíveis na unidade ${unit.shortName}.`;
  }

  return `Olá! Vi uma oferta no site da União Farma e gostaria de consultar disponibilidade na unidade ${unit.shortName}. Produto: ${context.offer.name}.`;
}

function buildWhatsAppUrl(unit: Unit, message: string, content = "offers_page"): string {
  const params = new URLSearchParams({
    text: message,
    utm_source: "site",
    utm_medium: "whatsapp",
    utm_campaign: "ofertas",
    utm_content: content,
  });
  return `https://wa.me/${unit.whatsappDigits}?${params.toString()}`;
}

function UnitSelector({ context, onClose }: { context: SelectorContext | null; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!context) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [context, onClose]);

  if (!context) return null;

  return (
    <div className="offers-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="offers-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offers-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="offers-modal-close"
          onClick={onClose}
          aria-label="Fechar seletor de unidade"
        >
          ×
        </button>
        <p className="section-kicker">Atendimento pelo WhatsApp</p>
        <h2 id="offers-modal-title">Em qual unidade você deseja consultar?</h2>
        <div className="offers-unit-list">
          {UNITS.map((unit) => (
            <a
              key={unit.id}
              className="offers-unit-option"
              href={buildWhatsAppUrl(unit, buildOfferMessage(unit, context), `offers_${context.offer?.id ?? "general"}_${unit.id}`)}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (context.offer) {
                  trackEvent("offer_unit_select", {
                    offer_id: context.offer.id,
                  category: context.offer.category,
                  unit: unit.id,
                  source: "offers_page",
                  placement: "offer_card",
                  });
                }
                trackEvent("whatsapp_click", {
                  unit: unit.id,
                  source: "offers_page",
                  placement: context.offer ? "offer_card" : "offers_page_cta",
                  ...(context.offer ? { offer_id: context.offer.id, category: context.offer.category } : {}),
                });
                onClose();
              }}
            >
              <span>
                <strong>{unit.shortName}</strong>
                <small>{unit.address}</small>
              </span>
              <span className="offers-unit-action">
                <WhatsAppIcon /> Abrir conversa
              </span>
            </a>
          ))}
        </div>
        <p className="offers-modal-note">
          Preço, disponibilidade, validade da oferta e condições devem ser confirmados com a unidade.
        </p>
      </section>
    </div>
  );
}

function formatOfferValidity(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
    new Date(`${value}T12:00:00-03:00`),
  );
}

function OfferCard({
  offer,
}: {
  offer: Offer;
}) {
  return (
    <article
      className="offer-card"
      data-offer-view
      data-offer-id={offer.id}
      data-offer-category={offer.category}
    >
      <div className="offer-image-wrap">
        {offer.image ? (
          <img src={offer.image} alt={offer.name} width="640" height="520" loading="lazy" />
        ) : (
          <div className="offer-image-placeholder" aria-label={`Visual neutro para ${offer.name}`}>
            <span>{offer.placeholderLabel ?? "Oferta"}</span>
            <strong>{offer.name}</strong>
          </div>
        )}
      </div>
      <div className="offer-card-body">
        <span className="offer-card-badge">Oferta selecionada</span>
        <h3>{offer.name}</h3>
        {offer.brand && <p className="offer-brand">{offer.brand}</p>}
        {offer.validityType === "while_stock_lasts" ? (
          <p className="offer-validity">Oferta válida enquanto durarem os estoques.</p>
        ) : offer.validityConfirmed && offer.validUntil ? (
          <p className="offer-validity">Oferta válida até {formatOfferValidity(offer.validUntil)}</p>
        ) : (
          <p className="offer-validity">Consulte a validade da oferta com a unidade.</p>
        )}
        <div className="offer-direct-unit-links" aria-label={`Consultar ${offer.name} por unidade`}>
          <span>Consultar direto na unidade:</span>
          <div>
            {UNITS.map((unit) => (
              <a
                key={unit.id}
                href={buildWhatsAppUrl(unit, buildOfferMessage(unit, { action: "availability", offer }), `offer_${offer.id}_${unit.id}`)}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackEvent("offer_unit_select", {
                    offer_id: offer.id,
                    category: offer.category,
                    unit: unit.id,
                    source: "offers_page",
                    placement: "offer_card_direct",
                  });
                  trackEvent("whatsapp_click", {
                    offer_id: offer.id,
                    category: offer.category,
                    unit: unit.id,
                    source: "offers_page",
                    placement: "offer_card_direct",
                  });
                }}
              >
                <WhatsAppIcon /> {unit.shortName}
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function OffersPageClient({ faqs, showReviewPanel }: { faqs: FAQ[]; showReviewPanel: boolean }) {
  const publicOffers = useMemo(() => getPublicOffers(), []);
  const [selectorContext, setSelectorContext] = useState<SelectorContext | null>(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const seenOffers = useRef(new Set<string>());

  const filteredOffers = publicOffers;

  useEffect(() => {
    const carousel = carouselRef.current;
    if (
      !carousel ||
      filteredOffers.length < 2 ||
      isCarouselPaused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    let frame = 0;
    let previousTime = performance.now();
    const pixelsPerMillisecond = 0.045;

    const animate = (time: number) => {
      const elapsed = Math.min(time - previousTime, 80);
      previousTime = time;
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;

      if (maxScroll > 0) {
        const nextScroll = carousel.scrollLeft + elapsed * pixelsPerMillisecond;
        carousel.scrollLeft = nextScroll >= maxScroll - 1 ? 0 : nextScroll;
      }

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frame);
  }, [filteredOffers.length, isCarouselPaused]);

  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("[data-offer-view]")];
    if (elements.length === 0) return;

    const report = (element: HTMLElement) => {
      const offerId = element.dataset.offerId;
      const offerCategory = element.dataset.offerCategory;
      if (!offerId || !offerCategory || seenOffers.current.has(offerId)) return;
      seenOffers.current.add(offerId);
      trackEvent("offer_view", {
        offer_id: offerId,
        category: offerCategory,
        source: "offers_page",
        placement: "offer_card",
      });
    };

    if (!("IntersectionObserver" in window)) {
      elements.forEach(report);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && report(entry.target as HTMLElement)),
      { threshold: 0.45 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [filteredOffers]);

  return (
    <>
      <a className="skip-link" href="#conteudo-ofertas">Pular para o conteúdo</a>

      <ContentSiteHeader activePath="/ofertas" />

      <main id="conteudo-ofertas" className="offers-page">
        <section className="offers-hero" aria-labelledby="offers-title">
          <div className="section-inner offers-hero-grid">
            <div>
              <p className="eyebrow">Ofertas selecionadas</p>
              <h1 id="offers-title">Ofertas da União Farma em Sabará</h1>
              <p className="offers-hero-lead">
                Confira ofertas selecionadas de perfumaria, higiene, cuidados pessoais, produtos infantis e outras categorias. Consulte disponibilidade, validade e condições com a unidade escolhida.
              </p>
              <div className="offers-hero-actions">
                <a className="offers-primary-button" href="#lista-ofertas">Ver ofertas</a>
                <button type="button" className="offers-secondary-button" onClick={() => setSelectorContext({ action: "general", offer: null })}>
                  Escolher uma unidade
                </button>
              </div>
              <p className="offers-hero-note">
                Consulte disponibilidade, validade da oferta e condições diretamente com a unidade.
              </p>
            </div>
            <aside className="offers-hero-card" aria-label="Como usar a página de ofertas">
              <span>Consulta simples</span>
              <strong>Oferta → unidade → WhatsApp</strong>
              <p>A equipe confirma preço, disponibilidade e condições antes do atendimento.</p>
            </aside>
          </div>
        </section>

        <section className="offers-intro">
          <div className="section-inner">
            <p>
              Esta vitrine reúne ofertas comerciais aprovadas em categorias não medicamentosas. Preço e disponibilidade devem ser confirmados com a unidade.
            </p>
            <strong>Ofertas sujeitas à disponibilidade e às condições informadas pela unidade.</strong>
          </div>
        </section>

        <section className="section offers-list-section" id="lista-ofertas" aria-labelledby="offers-list-title">
          <div className="section-inner">
            <div className="section-heading compact-heading offers-list-heading">
              <p className="section-kicker">Vitrine geral</p>
              <h2 id="offers-list-title">Ofertas aprovadas da União Farma</h2>
              <p className="offers-shared-note">
                Consulte disponibilidade, validade e condições com a unidade escolhida.
              </p>
            </div>

            {filteredOffers.length > 0 ? (
              <div
                className="offers-carousel-shell"
                onPointerEnter={() => setIsCarouselPaused(true)}
                onPointerLeave={() => setIsCarouselPaused(false)}
                onPointerDown={() => setIsCarouselPaused(true)}
                onPointerUp={() => {
                  if (window.matchMedia("(hover: none)").matches) setIsCarouselPaused(false);
                }}
                onPointerCancel={() => setIsCarouselPaused(false)}
                onFocusCapture={() => setIsCarouselPaused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsCarouselPaused(false);
                  }
                }}
              >
                <div ref={carouselRef} className="offer-carousel" role="region" aria-label="Promoções em destaque">
                  {filteredOffers.map((offer) => (
                    <div key={offer.id} className="offer-carousel-item" data-offer-card>
                      <OfferCard offer={offer} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="offers-empty" role="status">
                <span aria-hidden="true">✓</span>
                <h3>{publicOffers.length === 0 ? "Ofertas em preparação" : "Nenhuma promoção disponível"}</h3>
                <p>
                  {publicOffers.length === 0
                    ? "As promoções recebidas estão em revisão. Nenhuma oferta será publicada antes da confirmação de preço, validade, unidades participantes e imagem."
                    : "Consulte uma unidade para saber as condições disponíveis."}
                </p>
                <button type="button" className="offers-secondary-button" onClick={() => setSelectorContext({ action: "general", offer: null })}>
                  Escolher uma unidade
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="section offers-how" aria-labelledby="offers-how-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">Atendimento direto</p>
              <h2 id="offers-how-title">Como consultar uma oferta</h2>
            </div>
            <ol className="offers-steps">
              <li><span>1</span><strong>Escolha a oferta</strong></li>
              <li><span>2</span><strong>Selecione sua unidade</strong></li>
              <li><span>3</span><strong>Fale pelo WhatsApp</strong></li>
              <li><span>4</span><strong>A equipe confirma preço, disponibilidade e condições.</strong></li>
            </ol>
          </div>
        </section>

        <section className="section offers-delivery" aria-labelledby="offers-delivery-title">
          <div className="section-inner offers-delivery-panel">
            <div>
              <p className="section-kicker light">Entrega sob consulta</p>
              <h2 id="offers-delivery-title">Consulte a entrega com a unidade</h2>
              <p>A disponibilidade de entrega, região atendida, taxa e prazo devem ser confirmados com a unidade.</p>
            </div>
            <button type="button" className="offers-light-button" onClick={() => setSelectorContext({ action: "general", offer: null })}>
              Consultar entrega
            </button>
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

        {showReviewPanel && (
          <section className="section offer-review-panel" aria-labelledby="review-panel-title">
            <div className="section-inner">
              <p className="section-kicker">Somente no ambiente de desenvolvimento</p>
              <h2 id="review-panel-title">Fila de aprovação das ofertas</h2>
              <p>Este painel não entra na versão pública. Ele mostra a classificação inicial e o primeiro bloqueio técnico de cada item.</p>
              <div className="offer-review-table-wrap">
                <table>
                  <thead><tr><th>Oferta</th><th>Categoria</th><th>Classificação</th><th>Status</th><th>Site</th><th>Ads</th></tr></thead>
                  <tbody>
                    {OFFERS.map((offer) => {
                      const decision = canPublishOffer(offer);
                      const adsDecision = canUseInAds(offer);
                      return (
                        <tr key={offer.id}>
                          <th scope="row">{offer.name}</th>
                          <td>{OFFER_CATEGORY_LABELS[offer.category]}</td>
                          <td>{REGULATORY_LABELS[offer.regulatoryClass]}</td>
                          <td>{STATUS_LABELS[offer.publicationStatus]}</td>
                          <td>{decision.publishable ? "Site OK" : decision.reason}</td>
                          <td>{adsDecision.eligible ? "Ads Ready" : adsDecision.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="offers-final-cta" aria-labelledby="offers-final-title">
          <div className="section-inner">
            <h2 id="offers-final-title">Fale com a unidade mais conveniente</h2>
            <p>Confirme preço, disponibilidade, validade e condições diretamente com a equipe.</p>
            <button type="button" className="offers-primary-button" onClick={() => setSelectorContext({ action: "general", offer: null })}>
              Escolher uma unidade
            </button>
          </div>
        </section>
      </main>

      <ContentSiteFooter notice="Preços e disponibilidade podem variar conforme o estoque de cada unidade. Consulte a unidade escolhida para confirmação." />

      <UnitSelector context={selectorContext} onClose={() => setSelectorContext(null)} />
    </>
  );
}
