/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import type { FaqItem } from "../seo-content";
import { buildWhatsAppUrl, getHoursSentence, SITE_URL, UNITS } from "../site-config";
import { getPageStructuredData, getUnitPublicPath } from "../structured-data";

const SLUG = "ifood";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "União Farma no iFood | Farmácia Nações Unidas em Sabará";
const DESCRIPTION =
  "A União Farma Nações Unidas (Rua Inglaterra, 162, Sabará) está no iFood. Veja como pedir e como pedir pelo WhatsApp nas lojas Fátima e Itacolomi.";
const HEADING = "União Farma no iFood";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;
const others = UNITS.filter((unit) => unit.id !== "nacoes");
const ifoodUrl = nacoes.ifoodUrl!;

const faqs: FaqItem[] = [
  {
    q: "A União Farma está no iFood?",
    a: "Sim, mas só a loja Nações Unidas (Rua Inglaterra, 162, bairro Nações Unidas, Sabará/MG). As lojas Fátima e Itacolomi não estão no iFood.",
  },
  {
    q: "Como peço nas lojas Fátima e Itacolomi?",
    a: `Pelo WhatsApp de cada loja: ${others.map((unit) => `${unit.legalLabel} ${unit.whatsapp}`).join(" e ")}.`,
  },
  {
    q: "Qual o valor da entrega e o prazo no iFood?",
    a: "O iFood mostra a taxa de entrega e o prazo antes de você finalizar o pedido. Este site não informa esses valores.",
  },
  {
    q: "Posso tirar dúvida de um medicamento antes de pedir?",
    a: `Pode. Chame a loja Nações Unidas no WhatsApp ${nacoes.whatsapp}. O farmacêutico orienta no horário da loja. Medicamentos com receita seguem as regras da Anvisa.`,
  },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `/${SLUG}` },
  keywords: ["União Farma iFood", "farmácia iFood Sabará", "drogaria iFood Sabará", "farmácia Nações Unidas iFood"],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/og-nacoes-unidas.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-nacoes-unidas.jpg"] },
};

function IfoodButton({ source, className = "button button-ifood" }: { source: string; className?: string }) {
  return (
    <a
      className={className}
      href={ifoodUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-track-event="ifood_click"
      data-track-unit={nacoes.id}
      data-track-source={`${SLUG}_${source}`}
    >
      Pedir no iFood
    </a>
  );
}

export default function IfoodPage() {
  const structuredData = getPageStructuredData({
    name: TITLE,
    url: PAGE_URL,
    faqs,
    units: [nacoes],
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: HEADING, url: PAGE_URL },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ContentSiteHeader activePath="/ofertas" />
      <div className="unit-page landing-page ifood-page">
        <nav className="breadcrumb section-inner" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>{HEADING}</span>
        </nav>

        <section className="unit-page-hero">
          <div className="section-inner unit-page-hero-grid">
            <div>
              <p className="section-kicker light">Loja Nações Unidas</p>
              <h1>{HEADING}</h1>
              <p className="unit-page-address">
                A loja União Farma Nações Unidas, na {nacoes.street}, está no iFood. Peça pelo aplicativo ou pelo site do iFood.
              </p>
              <div className="ifood-actions">
                <IfoodButton source="hero" />
              </div>
              <p className="unit-page-note">
                Só a loja Nações Unidas está no iFood. As lojas Fátima e Itacolomi atendem pelo WhatsApp.
              </p>
            </div>
            <div className="unit-page-logo-card">
              <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="150" height="150" />
              <strong>Nações Unidas, Sabará</strong>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="qual-loja">
          <div className="section-inner">
            <h2 id="qual-loja">Qual loja está no iFood?</h2>
            <p>
              Somente a <a href={getUnitPublicPath(nacoes)}>União Farma Nações Unidas</a>. {nacoes.address}, CEP {nacoes.cep}.
            </p>
            <p>{getHoursSentence(nacoes)} Esse é o horário da loja física; o horário de atendimento no iFood aparece no próprio aplicativo.</p>
          </div>
        </section>

        <section className="section" aria-labelledby="como-pedir">
          <div className="section-inner">
            <h2 id="como-pedir">Como pedir no iFood</h2>
            <ol>
              <li>Toque em “Pedir no iFood”. A página da loja abre no iFood.</li>
              <li>Escolha os produtos e informe o seu endereço no iFood.</li>
              <li>Taxa de entrega, prazo e forma de pagamento aparecem no iFood antes de você finalizar o pedido.</li>
            </ol>
            <div className="ifood-actions">
              <IfoodButton source="como_pedir" />
            </div>
            <p>
              Dúvida sobre um medicamento? Fale com o farmacêutico no{" "}
              <a
                href={buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Vim pela página do iFood e tenho uma dúvida.", { campaign: SLUG, content: "nacoes_duvida" })}
                target="_blank"
                rel="noreferrer"
                data-track-event="whatsapp_click"
                data-track-unit={nacoes.id}
                data-track-source={`${SLUG}_duvida`}
              >
                WhatsApp {nacoes.whatsapp}
              </a>
              . Medicamentos com receita seguem as regras da Anvisa.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="outras-lojas">
          <div className="section-inner">
            <h2 id="outras-lojas">E as lojas Fátima e Itacolomi?</h2>
            <p>Essas duas lojas não estão no iFood. Peça pelo WhatsApp de cada uma:</p>
            <ul>
              {others.map((unit) => (
                <li key={unit.id}>
                  <a href={getUnitPublicPath(unit)}>{`Farmácia ${unit.shortName}`}</a> – {unit.shortAddress} – entrega {unit.deliveryScope} –{" "}
                  <a
                    href={buildWhatsAppUrl(unit, `Oi, União Farma ${unit.shortName}! Vim pela página do iFood e quero fazer um pedido.`, { campaign: SLUG, content: `${unit.id}_pedido` })}
                    target="_blank"
                    rel="noreferrer"
                    data-track-event="whatsapp_click"
                    data-track-unit={unit.id}
                    data-track-source={`${SLUG}_outras_lojas`}
                  >
                    WhatsApp {unit.whatsapp}
                  </a>
                </li>
              ))}
            </ul>
            <p>
              Veja os bairros atendidos por cada loja em <a href="/entrega-de-medicamentos-em-sabara">entrega de medicamentos em Sabará</a>.
            </p>
          </div>
        </section>

        <section className="section unit-faq-section" aria-labelledby="faq">
          <div className="section-inner">
            <h2 id="faq">Perguntas frequentes</h2>
            <div className="unit-faq-list">
              {faqs.map((faq) => (
                <details key={faq.q} className="unit-faq-item" open>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
