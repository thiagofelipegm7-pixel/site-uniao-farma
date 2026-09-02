/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { buildWhatsAppUrl, SITE_URL, UNITS, type Unit } from "./site-config";
import DirectUnitLinks from "./DirectUnitLinks";
import type { FaqItem } from "./seo-content";
import { getPageStructuredData } from "./structured-data";
import { SiteDirectoryLinks } from "./SiteDirectoryLinks";

export type LocalLandingPageConfig = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  lead: string;
  bullets: string[];
  faqs: FaqItem[];
  primaryLabel: string;
  primaryMessage: string;
};

function UnitContactCard({ unit, campaign, message }: { unit: Unit; campaign: string; message: string }) {
  return (
    <article className="landing-unit-card">
      <p className="section-kicker">Unidade União Farma</p>
      <h3>Farmácia {unit.shortName}</h3>
      <p>{unit.address}</p>
      <p>
        Telefone: <a href={unit.phoneLink} data-track-event="phone_click" data-track-unit={unit.id} data-track-source={`${campaign}_unit_card`} data-track-placement="unit_card">{unit.phone}</a>
      </p>
      <div className="landing-unit-actions">
        <a
          className="button button-whatsapp"
          href={buildWhatsAppUrl(unit, message, { campaign, content: `unit_${unit.id}` })}
          target="_blank"
          rel="noreferrer"
          data-track-event="whatsapp_click"
          data-track-unit={unit.id}
          data-track-source={`${campaign}_unit_card`}
          data-track-placement="unit_card"
        >
          Falar no WhatsApp — {unit.shortName}
        </a>
        <a
          className="button button-call"
          href={unit.map}
          target="_blank"
          rel="noreferrer"
          data-track-event="get_directions"
          data-track-unit={unit.id}
          data-track-source={`${campaign}_unit_card`}
          data-track-placement="unit_card"
        >
          Ver rota no Google Maps
        </a>
      </div>
    </article>
  );
}

export default function LocalLandingPage({ config }: { config: LocalLandingPageConfig }) {
  const pageUrl = `${SITE_URL}/${config.slug}`;
  const structuredData = getPageStructuredData({
    name: config.title,
    url: pageUrl,
    faqs: config.faqs,
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: config.heading, url: pageUrl },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="simple-header">
        <div className="section-inner simple-header-inner">
          <a className="brand" href="/">
            <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="52" height="52" />
            <span>
              <strong>União Farma</strong>
              <small>Drogaria e Perfumaria</small>
            </span>
          </a>
          <a className="simple-back-link" href="#unidades-landing">Escolher unidade</a>
        </div>
      </header>

      <main className="unit-page landing-page">
        <nav className="breadcrumb section-inner" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>{config.heading}</span>
        </nav>

        <section className="unit-page-hero">
          <div className="section-inner unit-page-hero-grid">
            <div>
              <p className="section-kicker light">{config.eyebrow}</p>
              <h1>{config.heading}</h1>
              <p className="unit-page-address">{config.lead}</p>
              <DirectUnitLinks
                message={config.primaryMessage}
                intent={config.slug}
                source={`${config.slug}_hero`}
                heading="Escolha uma unidade e fale direto pelo WhatsApp"
                description="Consulte preço, estoque, entrega ou atendimento sem preencher formulários."
              />
              <p className="unit-page-note">
                Preços, estoque, disponibilidade de entrega e horários especiais devem ser confirmados diretamente com a unidade.
              </p>
            </div>
            <div className="unit-page-logo-card">
              <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="150" height="150" />
              <strong>Três unidades em Sabará</strong>
            </div>
          </div>
        </section>

        <section className="section landing-benefits" aria-labelledby="landing-benefits-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Atendimento local</p>
                <h2 id="landing-benefits-title">Como a União Farma pode ajudar</h2>
              </div>
              <p>{config.description}</p>
            </div>
            <ul className="landing-benefit-grid">
              {config.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </div>
        </section>

        <section className="section landing-units-section" id="unidades-landing" aria-labelledby="landing-units-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Fale com a loja certa</p>
                <h2 id="landing-units-title">Escolha uma unidade em Sabará</h2>
              </div>
              <p>O botão identifica a unidade e abre o WhatsApp correspondente.</p>
            </div>
            <div className="landing-unit-grid">
              {UNITS.map((unit) => (
                <UnitContactCard key={unit.id} unit={unit} campaign={config.slug} message={config.primaryMessage} />
              ))}
            </div>
          </div>
        </section>

        <section className="section unit-faq-section" aria-labelledby="landing-faq-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Dúvidas frequentes</p>
                <h2 id="landing-faq-title">Perguntas sobre {config.heading.toLowerCase()}</h2>
              </div>
            </div>
            <div className="unit-faq-list">
              {config.faqs.map((faq) => (
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
            <h2>Fale com uma unidade da União Farma</h2>
            <p>Envie sua dúvida, o nome do produto ou seu bairro para a equipe confirmar o atendimento.</p>
            <a className="button button-light compact-button" href="#unidades-landing" data-track-event="unit_selector_view" data-track-source={`${config.slug}_final_cta`}>
              Escolher unidade e abrir WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="simple-footer">
        <nav className="section-inner" aria-label="Navegação do site">
          <SiteDirectoryLinks />
        </nav>
      </footer>
    </>
  );
}
