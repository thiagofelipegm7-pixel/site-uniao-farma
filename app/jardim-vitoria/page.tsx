/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import type { FaqItem } from "../seo-content";
import { buildWhatsAppUrl, getHoursSentence, getShortHoursPhrase, SITE_URL, UNITS } from "../site-config";
import { getPageStructuredData, getUnitPublicPath } from "../structured-data";

const SLUG = "jardim-vitoria";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const BAIRRO = "Jardim Vitória";
const TITLE = "Farmácia no Jardim Vitória, Sabará: entrega e WhatsApp | União Farma";
const HEADING = "Farmácia no Jardim Vitória, Sabará";

const fatima = UNITS.find((unit) => unit.id === "fatima")!;
const fatimaPath = getUnitPublicPath(fatima);
const DESCRIPTION = `A loja União Farma Fátima entrega no ${BAIRRO}. ${fatima.street}. ${getShortHoursPhrase(fatima)}. Peça pelo WhatsApp ${fatima.whatsapp}.`;
const MESSAGE = `Oi, União Farma ${fatima.shortName}! Moro no ${BAIRRO} e quero fazer um pedido para entrega.`;

const faqs: FaqItem[] = [
  {
    q: `A União Farma entrega no ${BAIRRO}?`,
    a: `Sim. A loja ${fatima.legalLabel} entrega ${fatima.deliveryScope}. Peça pelo WhatsApp ${fatima.whatsapp}, dentro do horário da loja.`,
  },
  {
    q: `Qual loja atende o ${BAIRRO}?`,
    a: `A loja ${fatima.legalLabel}, na ${fatima.street}, bairro ${fatima.neighborhood}, Sabará/MG, CEP ${fatima.cep}.`,
  },
  {
    q: "Qual é o horário da loja?",
    a: `${getHoursSentence(fatima)} Em feriado, confirme no WhatsApp.`,
  },
  {
    q: "Qual é o WhatsApp da loja?",
    a: `O WhatsApp da loja ${fatima.legalLabel} é ${fatima.whatsapp}. O telefone fixo é ${fatima.phone}.`,
  },
  {
    q: "Quanto custa a entrega e quanto tempo demora?",
    a: "Taxa e prazo são confirmados no WhatsApp da loja antes de fechar o pedido.",
  },
  {
    q: "Controlado e antibiótico saem na entrega?",
    a: "Em regra, não. Controlado e antibiótico pedem receita e retirada na loja, com o farmacêutico. Tire a dúvida no WhatsApp antes de ir.",
  },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `/${SLUG}` },
  keywords: ["farmácia Jardim Vitória Sabará", "farmácia que entrega Jardim Vitória", "União Farma Jardim Vitória"],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-optimized.jpg"] },
};

export default function JardimVitoriaPage() {
  const structuredData = getPageStructuredData({
    name: TITLE,
    url: PAGE_URL,
    faqs,
    units: [fatima],
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: HEADING, url: PAGE_URL },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ContentSiteHeader activePath="/novidades" />
      <div className="unit-page landing-page">
        <nav className="breadcrumb section-inner" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>{HEADING}</span>
        </nav>

        <section className="section">
          <div className="section-inner">
            <h1>{HEADING}</h1>
            <p className="unit-page-address">
              {`A loja União Farma ${fatima.legalLabel} entrega no ${BAIRRO}. A loja fica na ${fatima.street}, no bairro ${fatima.neighborhood}. Peça pelo WhatsApp ${fatima.whatsapp}, dentro do horário da loja.`}
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="loja">
          <div className="section-inner">
            <h2 id="loja">{`Loja que atende o ${BAIRRO}`}</h2>
            <ul>
              <li><strong>Loja:</strong> <a href={fatimaPath}>{`União Farma ${fatima.legalLabel}`}</a></li>
              <li><strong>Endereço:</strong> {fatima.address} – CEP {fatima.cep}</li>
              <li><strong>Horário:</strong> {getShortHoursPhrase(fatima)}.</li>
              <li><strong>WhatsApp:</strong> {fatima.whatsapp}</li>
              <li><strong>Telefone:</strong> <a href={fatima.phoneLink} data-track-event="phone_click" data-track-unit={fatima.id} data-track-source={`${SLUG}_loja`}>{fatima.phone}</a></li>
            </ul>
            <p>
              <a
                className="button button-whatsapp"
                href={buildWhatsAppUrl(fatima, MESSAGE, { campaign: SLUG, content: "pedir" })}
                target="_blank"
                rel="noreferrer"
                data-track-event="whatsapp_click"
                data-track-unit={fatima.id}
                data-track-source={`${SLUG}_pedir`}
              >
                Pedir no WhatsApp
              </a>{" "}
              <a
                className="button button-outline"
                href={fatima.map}
                target="_blank"
                rel="noreferrer"
                data-track-event="get_directions"
                data-track-unit={fatima.id}
                data-track-source={`${SLUG}_rota`}
              >
                Como chegar
              </a>
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="entrega">
          <div className="section-inner">
            <h2 id="entrega">{`Entrega no ${BAIRRO}`}</h2>
            <p>
              {`A loja ${fatima.legalLabel} entrega ${fatima.deliveryScope}. Taxa e prazo são confirmados no WhatsApp da loja. `}
              <a href="/entrega-de-medicamentos-em-sabara">Veja os bairros atendidos por cada loja</a>.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="horario">
          <div className="section-inner">
            <h2 id="horario">Horário da loja</h2>
            <p>{getHoursSentence(fatima)} Em feriados, o horário pode mudar. <a href="/farmacia-aberta-domingo-sabara">Veja os horários das lojas</a>.</p>
          </div>
        </section>

        <section className="section" aria-labelledby="como-pedir">
          <div className="section-inner">
            <h2 id="como-pedir">Como pedir pelo WhatsApp</h2>
            <ol>
              <li>{`Chame a loja ${fatima.legalLabel} no WhatsApp ${fatima.whatsapp}.`}</li>
              <li>Mande o nome dos produtos ou uma foto da embalagem.</li>
              <li>Informe o seu endereço.</li>
              <li>A loja confirma o pedido com você.</li>
            </ol>
            <p>
              Medicamentos com receita seguem as regras da Anvisa. <a href="/receita">Veja como enviar a receita</a>.
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
