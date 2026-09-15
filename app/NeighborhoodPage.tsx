import InteractiveUnitMap from "./InteractiveUnitMap";
import UnitStatusBadge from "./UnitStatusBadge";
import WebImage from "./WebImage";
import { buildWhatsAppUrl, SITE_URL, type Unit } from "./site-config";
import { getPageStructuredData } from "./structured-data";
import { getUnitFaqs } from "./seo-content";
import { UNIT_PHOTOS } from "./unit-photos";
import { responsiveSrcSet } from "./responsive-images";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";

const SHORT_LABEL: Record<Unit["id"], string> = {
  fatima: "Fátima",
  nacoes: "Nações Unidas",
  itacolomi: "Itacolomi",
};

const PAGE_HREF: Record<Unit["id"], string> = {
  fatima: "/fatima",
  nacoes: "/nacoes-unidas",
  itacolomi: "/itacolomi",
};

export default function NeighborhoodPage({ unit }: { unit: Unit }) {
  const label = SHORT_LABEL[unit.id];
  const product = WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName);
  const delivery = WHATSAPP_MESSAGES.delivery.replaceAll("{unidade}", unit.shortName);
  const recipe = WHATSAPP_MESSAGES.recipe.replaceAll("{unidade}", unit.shortName);
  const pageUrl = `${SITE_URL}${PAGE_HREF[unit.id]}`;
  const faqs = getUnitFaqs(unit);
  const structuredData = getPageStructuredData({
    name: `Farmácia ${unit.shortName} em Sabará`,
    url: pageUrl,
    unit,
    faqs,
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: unit.shortName, url: pageUrl },
    ],
  });

  return (
    <div className="neighborhood-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="section-inner neighborhood-hero">
        <WebImage
          className="neighborhood-photo"
          src={UNIT_PHOTOS[unit.id]}
          alt={`União Farma ${label}`}
          width={1200}
          height={720}
          priority
          sizes="(max-width: 800px) 96vw, 1200px"
          srcSet={responsiveSrcSet(UNIT_PHOTOS[unit.id], unit.id === "nacoes" ? [480, 768, 1024] : [480])}
        />
        <p className="eyebrow">Farmácia em {unit.neighborhood}</p>
        <h1>União Farma {label}</h1>
        <p>{unit.address}</p>
        <UnitStatusBadge unit={unit} />
        <div className="neighborhood-actions">
          <a className="button button-whatsapp" href={buildWhatsAppUrl(unit, product, { campaign: "bairro", content: `${unit.id}_pedir` })} target="_blank" rel="noreferrer">Pedir no WhatsApp</a>
          <a className="button button-call" href={unit.map} target="_blank" rel="noreferrer">Como chegar</a>
          <a className="text-link" href={unit.phoneLink}>Ligar {unit.phone}</a>
        </div>
      </section>

      <section className="section-inner neighborhood-grid">
        <article>
          <h2>Horário</h2>
          <ul className="hours-grid">
            <li><span>Seg a sex</span><strong>07:00–21:00</strong></li>
            <li><span>Sábado</span><strong>{unit.schedule.sat?.open}–{unit.schedule.sat?.close}</strong></li>
            <li><span>Domingo</span><strong>07:00–12:00</strong></li>
          </ul>
        </article>
        <article>
          <h2>Entrega</h2>
          <p>A loja de {label} confirma se atende o seu endereço.</p>
          <a href={buildWhatsAppUrl(unit, delivery, { campaign: "bairro", content: `${unit.id}_entrega` })} target="_blank" rel="noreferrer">Perguntar entrega</a>
        </article>
        <article>
          <h2>Receita</h2>
          <p>Envie a foto ou o Memed no WhatsApp desta unidade.</p>
          <a href={buildWhatsAppUrl(unit, recipe, { campaign: "bairro", content: `${unit.id}_receita` })} target="_blank" rel="noreferrer">Enviar receita</a>
        </article>
      </section>

      <section className="section-inner">
        <h2>Mapa interativo</h2>
        <InteractiveUnitMap initialUnitId={unit.id} />
      </section>

      <section className="section-inner neighborhood-faqs" aria-labelledby="unit-faq-heading">
        <h2 id="unit-faq-heading">Dúvidas sobre a farmácia {unit.shortName}</h2>
        <div className="unit-faq-list">
          {faqs.map((faq) => (
            <details key={faq.q} className="unit-faq-item">
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
