/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import EntregaBairro from "./EntregaBairro";
import { buildWhatsAppUrl, SITE_URL, UNITS } from "../site-config";
import type { FaqItem } from "../seo-content";
import { getPageStructuredData, getUnitPublicPath } from "../structured-data";

const SLUG = "entrega-de-medicamentos-em-sabara";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Entrega de farmácia em Sabará | União Farma";
const HEADING = "Entrega de farmácia em Sabará";
const DESCRIPTION =
  "Veja em quais bairros cada loja União Farma entrega em Sabará. Peça pelo WhatsApp da loja, dentro do horário de funcionamento.";

const MESSAGE = "Oi, União Farma {unidade}! Quero fazer um pedido para entrega.";

const byId = Object.fromEntries(UNITS.map((unit) => [unit.id, unit]));
const directAnswer = `A União Farma entrega em Sabará pelo WhatsApp de cada loja. ${UNITS.map((unit) => `A loja ${unit.legalLabel} entrega ${unit.deliveryScope}`).join(". ")}. Faça o pedido dentro do horário de funcionamento da loja.`;

const faqs: FaqItem[] = [
  { q: "A União Farma faz entrega em Sabará?", a: "Sim. Cada loja entrega nos bairros da tabela desta página. Peça pelo WhatsApp da loja." },
  ...UNITS.map((unit) => ({
    q: `Quais bairros a loja ${unit.legalLabel} atende?`,
    a: `A loja ${unit.legalLabel} entrega ${unit.deliveryScope}. WhatsApp: ${unit.whatsapp}.`,
  })),
  { q: "A União Farma está no iFood?", a: "Só a loja Nações Unidas está no iFood. As lojas Fátima e Itacolomi atendem pelo WhatsApp." },
  { q: "Meu bairro não está na lista. E agora?", a: "Hoje a entrega é feita só nos bairros da tabela. Se o seu bairro não está nela, fale com a loja mais perto pelo WhatsApp e retire o pedido no balcão." },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `/${SLUG}` },
  keywords: ["entrega de farmácia Sabará", "farmácia que entrega Sabará", "delivery farmácia Sabará"],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-optimized.jpg"] },
};

export default function EntregaDeMedicamentosEmSabaraPage() {
  const structuredData = getPageStructuredData({
    name: TITLE,
    url: PAGE_URL,
    faqs,
    units: UNITS,
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: HEADING, url: PAGE_URL },
    ],
  });
  const rows = UNITS.flatMap((unit) => unit.deliveryAreas.map((area) => ({ area, unitId: unit.id })));

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
            <p className="unit-page-address">{directAnswer}</p>
          </div>
        </section>

        <EntregaBairro />

        <section className="section" aria-labelledby="bairros">
          <div className="section-inner">
            <h2 id="bairros">Bairros atendidos por loja</h2>
            <div className="hours-table-wrap">
              <table className="hours-table">
                <caption>Bairros de entrega da União Farma em Sabará</caption>
                <thead>
                  <tr>
                    <th scope="col">Bairro</th>
                    <th scope="col">Cobertura</th>
                    <th scope="col">Loja</th>
                    <th scope="col">WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ area, unitId }) => {
                    const unit = byId[unitId];
                    return (
                      <tr key={`${unitId}-${area}`}>
                        <th scope="row">{area === "Jardim Vitória" ? <a href="/jardim-vitoria">{area}</a> : area}</th>
                        <td data-label="Cobertura">{unit.deliveryExclusive ? "Todo o bairro. A loja entrega somente neste bairro." : "Todo o bairro"}</td>
                        <td data-label="Loja"><a href={getUnitPublicPath(unit)}>{unit.legalLabel}</a></td>
                        <td data-label="WhatsApp">
                          <a href={buildWhatsAppUrl(unit, MESSAGE.replace("{unidade}", unit.shortName), { campaign: SLUG, content: `table_${unit.id}` })} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={unit.id} data-track-source={`${SLUG}_table`}>{unit.whatsapp}</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="como-pedir">
          <div className="section-inner">
            <h2 id="como-pedir">Como pedir pelo WhatsApp</h2>
            <ol>
              <li>Veja na tabela qual loja atende o seu bairro.</li>
              <li>Chame essa loja no WhatsApp e mande a lista de produtos e o seu endereço.</li>
              <li>A loja confirma o pedido com você pelo WhatsApp.</li>
            </ol>
            <p>
              Os pedidos são feitos dentro do horário de cada loja. <a href="/farmacia-aberta-domingo-sabara">Veja os horários das lojas</a>.
              Medicamentos com receita seguem as regras da Anvisa.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="ifood">
          <div className="section-inner">
            <h2 id="ifood">Loja Nações Unidas também no iFood</h2>
            <p>
              Além do WhatsApp, a loja Nações Unidas está no iFood. As lojas Fátima e Itacolomi não estão no iFood e atendem só pelo WhatsApp.{" "}
              <a href="/ifood">Veja como pedir pelo iFood</a>.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="fora-da-lista">
          <div className="section-inner">
            <h2 id="fora-da-lista">Meu bairro não está na lista?</h2>
            <p>A entrega é feita somente nos bairros da tabela acima. Se o seu bairro não está nela, fale com a loja mais perto pelo WhatsApp e retire o pedido no balcão.</p>
            <ul>
              {UNITS.map((unit) => (
                <li key={unit.id}>
                  <a href={getUnitPublicPath(unit)}>{`Farmácia ${unit.shortName}`}</a> – {unit.shortAddress} – WhatsApp {unit.whatsapp}
                </li>
              ))}
            </ul>
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
