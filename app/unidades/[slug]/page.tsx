import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { notFound } from "next/navigation";
import UnitStatusBadge from "../../UnitStatusBadge";
import {
  buildWhatsAppUrl,
  getUnitBySlug,
  SITE_URL,
  UNITS,
} from "../../site-config";
import { getUnitFaqs } from "../../seo-content";
import { getPageStructuredData } from "../../structured-data";
import { SiteDirectoryLinks } from "../../SiteDirectoryLinks";

type UnitPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [...UNITS.map((unit) => ({ slug: unit.slug })), { slug: "fatima" }];
}

export async function generateMetadata({ params }: UnitPageProps): Promise<Metadata> {
  const { slug } = await params;
  const unit = getUnitBySlug(slug);

  if (!unit) {
    return {
      title: "Unidade não encontrada",
    };
  }

  const title = `Farmácia ${unit.shortName} em Sabará`;
  const description = `União Farma no bairro ${unit.neighborhood}, em Sabará. Farmácia e perfumaria com atendimento presencial, WhatsApp, telefone e entrega sob consulta.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/unidades/${unit.slug}`,
    },
    openGraph: {
      title: `${title} | União Farma`,
      description,
      url: `${SITE_URL}/unidades/${unit.slug}`,
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1792,
          height: 909,
          alt: `União Farma — farmácia ${unit.shortName} em Sabará`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Farmácia ${unit.shortName} em Sabará | União Farma`,
      description: `Fale com a unidade ${unit.shortName} pelo WhatsApp.`,
      images: ["/og.png"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function UnitPage({ params }: UnitPageProps) {
  const { slug } = await params;
  const unit = getUnitBySlug(slug);

  if (!unit) notFound();

  const trackingUnit = unit.slug.replace(/-/g, "_");
  const message = `Olá! Gostaria de consultar a disponibilidade de um produto na unidade ${unit.shortName}.`;
  const heroDescription = `Drogaria e perfumaria no bairro ${unit.neighborhood}, em Sabará, com atendimento presencial, WhatsApp e entrega sob consulta. Fale com a equipe para consultar produtos e disponibilidade.`;
  const pageUrl = `${SITE_URL}/unidades/${unit.slug}`;
  const unitFaqs = getUnitFaqs(unit);
  const schema = getPageStructuredData({
    name: `Farmácia ${unit.shortName} em Sabará`,
    url: pageUrl,
    unit,
    faqs: unitFaqs,
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: "Unidades", url: `${SITE_URL}/#unidades-rapidas` },
      { name: unit.shortName, url: pageUrl },
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <header className="simple-header">
        <div className="section-inner simple-header-inner">
          <a className="brand" href="/">
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
          <a className="simple-back-link" href="/#unidades-rapidas">
            Ver todas as unidades
          </a>
        </div>
      </header>

      <main className="unit-page">
        <nav className="breadcrumb section-inner" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <a href="/#unidades-rapidas">Unidades</a>
          <span aria-hidden="true">/</span>
          <span>{unit.shortName}</span>
        </nav>
        <section className="unit-page-hero">
          <div className="section-inner unit-page-hero-grid">
            <div>
              <p className="section-kicker light">Unidade União Farma</p>
              <h1>Farmácia {unit.shortName} em Sabará</h1>
              <p className="unit-page-lead">{heroDescription}</p>
              <p className="unit-page-address">{unit.address}</p>
              <UnitStatusBadge unit={unit} />
              <ul className="unit-trust-list" aria-label="Informações rápidas da unidade">
                <li><strong>{unit.neighborhood}</strong><span>Sabará/MG</span></li>
                <li><strong>Horário</strong><span>Seg–sex 07:00–21:00 · sáb {unit.schedule.sat?.open}–{unit.schedule.sat?.close} · dom 07:00–12:00</span></li>
                <li><strong>Atendimento presencial</strong><span>Na unidade</span></li>
                <li><strong>Entrega</strong><span>Sob consulta</span></li>
                <li><strong>WhatsApp</strong><span>{unit.whatsapp}</span></li>
              </ul>
              <div className="unit-page-actions">
                <a
                  className="button button-light"
                  href={buildWhatsAppUrl(unit, message, {
                    campaign: "seo_local",
                    content: `unit_${unit.id}_hero`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  data-track-event="whatsapp_click"
                  data-track-unit={trackingUnit}
                  data-track-placement="hero"
                >
                  Consultar pelo WhatsApp
                </a>
                <a
                  className="button button-outline-light"
                  href={unit.map}
                  target="_blank"
                  rel="noreferrer"
                  data-track-event="get_directions"
                  data-track-unit={trackingUnit}
                  data-track-placement="hero"
                >
                  Como chegar
                </a>
                <a
                  className="button button-text-light"
                  href={unit.phoneLink}
                  data-track-event="phone_click"
                  data-track-unit={trackingUnit}
                  data-track-placement="hero"
                >
                  Ligar: {unit.phone}
                </a>
              </div>
              <p className="unit-page-note">
                Preço, estoque, entrega, aplicação de injetáveis e horários em feriados devem ser
                confirmados diretamente com a equipe.
              </p>
            </div>
            <div className="unit-page-logo-card">
              <img
                src="/uniao-farma-logo.webp"
                alt="Logo da União Farma"
                width="150"
                height="150"
              />
              <strong>Atendimento próximo em Sabará</strong>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner unit-detail-grid">
            <article className="unit-detail-card">
              <h2>Horários</h2>
              <dl className="unit-page-hours">
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
              <p>Em feriados, confirme o funcionamento pelo WhatsApp.</p>
            </article>

            <article className="unit-detail-card">
              <h2>Serviços</h2>
              <ul className="check-list">
                <li>Medicamentos, genéricos e similares.</li>
                <li>Perfumaria, higiene e cuidados pessoais.</li>
                <li>Entrega para sua região.</li>
                <li>Aplicação de injetáveis e atendimento farmacêutico.</li>
                <li>Aferição de pressão e teste de glicemia, sob consulta.</li>
              </ul>
            </article>

            <article className="unit-detail-card">
              <h2>Atendimento</h2>
              <p className="unit-contact-line">
                Telefone fixo: <a href={unit.phoneLink} data-track-event="phone_click" data-track-unit={trackingUnit} data-track-placement="contact">{unit.phone}</a>
              </p>
              <p className="unit-contact-line">
                WhatsApp: <a href={buildWhatsAppUrl(unit, message, { campaign: "seo_local", content: `unit_${unit.id}_contact` })} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={trackingUnit} data-track-placement="contact">{unit.whatsapp}</a>
              </p>
            </article>

            <article className="unit-detail-card">
              <h2>Entrega</h2>
              <p>
                Bairro de referência: <strong>{unit.neighborhood}</strong>, em Sabará/MG.
              </p>
              <p>
                A disponibilidade de entrega, os bairros atendidos, a taxa e o prazo dependem do
                endereço informado. Consulte esta unidade pelo WhatsApp antes de solicitar.
              </p>
              <a
                className="text-link"
                href={buildWhatsAppUrl(unit, `Olá! Gostaria de consultar a entrega da unidade ${unit.shortName} no meu bairro.`, { campaign: "seo_local", content: `unit_${unit.id}_delivery` })}
                target="_blank"
                rel="noreferrer"
                data-track-event="whatsapp_click"
                data-track-unit={trackingUnit}
                data-track-placement="delivery"
              >
                Consultar pelo WhatsApp <span aria-hidden="true">→</span>
              </a>
            </article>
          </div>
        </section>

        <section className="section unit-page-map-section">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Localização</p>
                <h2>Como chegar</h2>
              </div>
              <p>{unit.address}</p>
            </div>
            <div className="unit-page-map">
              <iframe
                src={unit.mapEmbed}
                title={`Mapa da unidade ${unit.shortName}`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="centered-actions">
              <a
                className="button button-call compact-button"
                href={unit.map}
                target="_blank"
                rel="noreferrer"
                data-track-event="get_directions"
                data-track-unit={trackingUnit}
                data-track-placement="location"
              >
                Como chegar
              </a>
            </div>
          </div>
        </section>

        <section className="section unit-faq-section" aria-labelledby="unit-faq-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Dúvidas locais</p>
                <h2 id="unit-faq-title">Perguntas frequentes</h2>
              </div>
              <p>Confira as informações principais de endereço, contato, horário e entrega.</p>
            </div>
            <div className="unit-faq-list">
              {unitFaqs.map((faq) => (
                <details key={faq.q} className="unit-faq-item">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="unit-final-cta">
          <div className="section-inner">
            <h2>Precisa consultar um produto?</h2>
            <p>Informe o nome do produto ou envie uma foto da embalagem pelo WhatsApp. A equipe confirma disponibilidade e condições de atendimento.</p>
            <a
              className="button button-light compact-button"
              href={buildWhatsAppUrl(unit, message, { campaign: "seo_local", content: `unit_${unit.id}_final_cta` })}
              target="_blank"
              rel="noreferrer"
              data-track-event="whatsapp_click"
              data-track-unit={trackingUnit}
              data-track-placement="product_consultation"
            >
              Consultar no WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="simple-footer">
        <nav className="section-inner" aria-label="Navegação do site">
          <SiteDirectoryLinks />
          <a
            href={buildWhatsAppUrl(unit, message, { campaign: "seo_local", content: `unit_${unit.id}_footer` })}
            target="_blank"
            rel="noreferrer"
            data-track-event="whatsapp_click"
            data-track-unit={trackingUnit}
            data-track-placement="footer"
          >
            WhatsApp da unidade
          </a>
        </nav>
      </footer>

      <a
        className="unit-mobile-sticky"
        href={buildWhatsAppUrl(unit, message, { campaign: "seo_local", content: `unit_${unit.id}_sticky` })}
        target="_blank"
        rel="noreferrer"
        aria-label={`Falar pelo WhatsApp com a unidade ${unit.shortName}`}
        data-track-event="whatsapp_click"
        data-track-unit={trackingUnit}
        data-track-placement="sticky"
      >
        <img src="/whatsapp-icon.svg" alt="" width="22" height="22" aria-hidden="true" />
        Falar no WhatsApp
      </a>
    </>
  );
}
