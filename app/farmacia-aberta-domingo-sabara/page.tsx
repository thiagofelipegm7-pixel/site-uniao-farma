/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { buildWhatsAppUrl, getHoursSentence, getShortHoursPhrase, SITE_URL, PUBLIC_UNITS, type DailyHours, type Unit } from "../site-config";
import type { FaqItem } from "../seo-content";
import { getPageStructuredData, getUnitPublicPath } from "../structured-data";
import OpenStatusCell from "./OpenStatusCell";

const SLUG = "farmacia-aberta-domingo-sabara";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Farmácia aberta agora e domingo em Sabará | União Farma";
const DESCRIPTION =
  "Veja o horário da loja União Farma Nações Unidas, em Sabará. Abertas todo dia, domingo até 12h. Peça pelo WhatsApp e receba em casa.";
const HEADING = "Farmácia aberta agora e domingo em Sabará";

const [loja] = PUBLIC_UNITS;

function h(value: string) {
  const [hours, minutes] = value.split(":");
  return minutes === "00" ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
}

function range(hours: DailyHours) {
  return hours ? `${h(hours.open)} às ${h(hours.close)}` : "Fechada";
}

function latestWeekdayClose(units: Unit[]) {
  return units.map((unit) => unit.schedule.mon?.close ?? "00:00").sort().at(-1) ?? "21:00";
}

const weekdayClose = h(latestWeekdayClose(PUBLIC_UNITS));
const sundayClose = h(PUBLIC_UNITS[0].schedule.sun?.close ?? "12:00");
const abertura = h(loja.schedule.mon?.open ?? "08:00");
const satEarlyClose = PUBLIC_UNITS.filter((unit) => unit.schedule.sat?.close !== unit.schedule.mon?.close);

const faqs: FaqItem[] = [
  { q: "Tem farmácia aberta domingo em Sabará?", a: `Sim. A União Farma Nações Unidas abre no domingo de manhã e fecham às ${sundayClose}.` },
  { q: "Qual farmácia abre mais cedo em Sabará?", a: `A União Farma Nações Unidas abre às ${abertura} todos os dias.` },
  { q: "Até que horas a farmácia fica aberta em Sabará?", a: `De segunda a sexta, a União Farma Nações Unidas fica aberta até ${weekdayClose}.` },
  { q: "Tem farmácia 24 horas em Sabará?", a: `A União Farma não é 24 horas. A loja fecha às ${weekdayClose} e reabre às ${abertura}.` },
  { q: "A farmácia entrega no domingo?", a: `Sim, dentro do horário da loja e nos bairros atendidos: ${PUBLIC_UNITS.map((unit) => `${unit.legalLabel} entrega ${unit.deliveryScope}`).join(". ")}.` },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/farmacia-aberta-domingo-sabara" },
  keywords: ["farmácia aberta agora Sabará", "farmácia aberta domingo Sabará", "farmácia aberta à noite Sabará"],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-optimized.jpg"] },
};

export default function FarmaciaAbertaDomingoPage() {
  const structuredData = getPageStructuredData({
    name: TITLE,
    url: PAGE_URL,
    faqs,
    units: PUBLIC_UNITS,
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
              {`A União Farma Nações Unidas fica aberta todos os dias. De segunda a sábado, fecha às ${weekdayClose}`}
              {satEarlyClose.length ? ` (${satEarlyClose.map((unit) => unit.legalLabel).join(" e ")} fecham às ${h(satEarlyClose[0].schedule.sat?.close ?? "20:00")} no sábado)` : ""}
              {`. No domingo, abre de manhã e fecha às ${sundayClose}. A loja abre às ${abertura}.`}
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="aberta-agora">
          <div className="section-inner">
            <h2 id="aberta-agora">Qual loja está aberta agora?</h2>
            <p>O status abaixo usa o horário de Brasília. Em feriados, confirme pelo WhatsApp.</p>
            <div className="hours-table-wrap">
              <table className="hours-table">
                <caption>Horário das lojas União Farma em Sabará</caption>
                <thead>
                  <tr>
                    <th scope="col">Loja</th>
                    <th scope="col">Endereço</th>
                    <th scope="col">Seg a sex</th>
                    <th scope="col">Sábado</th>
                    <th scope="col">Domingo</th>
                    <th scope="col">WhatsApp</th>
                    <th scope="col">Agora</th>
                  </tr>
                </thead>
                <tbody>
                  {PUBLIC_UNITS.map((unit) => (
                    <tr key={unit.id}>
                      <th scope="row"><a href={getUnitPublicPath(unit)}>{unit.legalLabel}</a></th>
                      <td data-label="Endereço">{unit.street} – CEP {unit.cep}</td>
                      <td data-label="Seg a sex">{range(unit.schedule.mon)}</td>
                      <td data-label="Sábado">{range(unit.schedule.sat)}</td>
                      <td data-label="Domingo">{range(unit.schedule.sun)}</td>
                      <td data-label="WhatsApp">
                        <a href={buildWhatsAppUrl(unit, `Oi, União Farma ${unit.shortName}! Vim pela página de horários.`, { campaign: SLUG, content: `table_${unit.id}` })} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={unit.id} data-track-source={`${SLUG}_table`}>{unit.whatsapp}</a>
                      </td>
                      <td data-label="Agora"><OpenStatusCell unitId={unit.id} fallback={getShortHoursPhrase(unit)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="horario-por-loja">
          <div className="section-inner">
            <h2 id="horario-por-loja">Horário de cada loja</h2>
            <ul>
              {PUBLIC_UNITS.map((unit) => (
                <li key={unit.id}>{getHoursSentence(unit)} Endereço: {unit.address}.{unit.alternateNames?.length ? ` Também aparece no Google como ${unit.alternateNames.join(", ")}.` : ""}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="domingo">
          <div className="section-inner">
            <h2 id="domingo">Farmácia aberta domingo em Sabará</h2>
            <p>{`A loja abre no domingo. ${PUBLIC_UNITS.map((unit) => `${unit.legalLabel}: ${range(unit.schedule.sun)}`).join(". ")}.`}</p>
          </div>
        </section>

        <section className="section" aria-labelledby="noite">
          <div className="section-inner">
            <h2 id="noite">{`Farmácia aberta à noite em Sabará (até ${weekdayClose})`}</h2>
            <p>{`De segunda a sexta, a loja fica aberta até ${weekdayClose}. No sábado: ${PUBLIC_UNITS.map((unit) => `${unit.legalLabel} até ${h(unit.schedule.sat?.close ?? "20:00")}`).join(", ")}.`}</p>
          </div>
        </section>

        <section className="section" aria-labelledby="feriados">
          <div className="section-inner">
            <h2 id="feriados">Horário em feriados</h2>
            <p>Em feriados, o horário pode mudar. Os horários especiais são publicados no perfil de cada loja no Google. Na dúvida, chame a loja no WhatsApp antes de sair de casa.</p>
          </div>
        </section>

        <section className="section" aria-labelledby="entrega">
          <div className="section-inner">
            <h2 id="entrega">Peça pelo WhatsApp e receba em casa</h2>
            <p>Dentro do horário de cada loja, você pode pedir pelo WhatsApp. {PUBLIC_UNITS.map((unit) => `A loja ${unit.legalLabel} entrega ${unit.deliveryScope}.`).join(" ")} <a href="/entrega-de-medicamentos-em-sabara">Saiba como funciona a entrega em Sabará</a>.</p>
            <ul>
              {PUBLIC_UNITS.map((unit) => (
                <li key={unit.id}><a href={getUnitPublicPath(unit)}>{`Farmácia ${unit.shortName}`}</a> – {unit.shortAddress}</li>
              ))}
              <li><a href="/farmacia-em-sabara">Farmácia em Sabará: a loja</a></li>
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
