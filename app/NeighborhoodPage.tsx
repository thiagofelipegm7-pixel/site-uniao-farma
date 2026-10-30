import DeliverySlot from "./DeliverySlot";
import InteractiveUnitMap from "./InteractiveUnitMap";
import OffersGroupCta from "./OffersGroupCta";
import UnitStatusBadge from "./UnitStatusBadge";
import WebImage from "./WebImage";
import { buildWhatsAppUrl, getHoursSentence, SITE_URL, UNITS, type Unit } from "./site-config";
import { getStoreContent } from "./store-content";
import { getPageStructuredData } from "./structured-data";
import { UNIT_PHOTOS } from "./unit-photos";
import { responsiveSrcSet } from "./responsive-images";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";

const SHORT_LABEL: Record<Unit["id"], string> = {
  fatima: "Fátima",
  nacoes: "Nações Unidas",
  itacolomi: "Itacolomi",
};

const PAGE_HEADING: Record<Unit["id"], string> = {
  fatima: "Farmácia em Nossa Senhora de Fátima, Sabará",
  nacoes: "Farmácia em Nações Unidas, Sabará",
  itacolomi: "Farmácia no Itacolomi, Sabará",
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
  const content = getStoreContent(unit);
  const otherUnits = UNITS.filter((other) => other.id !== unit.id);
  const structuredData = getPageStructuredData({
    name: `Farmácia ${unit.shortName} em Sabará`,
    url: pageUrl,
    unit,
    faqs: content.faqs,
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
        <h1>{PAGE_HEADING[unit.id]}</h1>
        {unit.alternateNames?.length ? (
          <p className="former-name"><strong>Antiga {unit.alternateNames.join(", ")}</strong> — mesmo endereço, agora União Farma</p>
        ) : null}
        <p>{unit.address} — CEP {unit.cep}</p>
        <UnitStatusBadge unit={unit} />
        <div className="neighborhood-actions">
          <a className="button button-whatsapp" href={buildWhatsAppUrl(unit, product, { campaign: "bairro", content: `${unit.id}_pedir` })} target="_blank" rel="noreferrer">Pedir no WhatsApp</a>
          <div className="neighborhood-secondary">
            <a className="button button-outline" href={unit.map} target="_blank" rel="noreferrer">Como chegar</a>
            <a className="button button-outline" href={unit.phoneLink}>Ligar {unit.phone}</a>
          </div>
        </div>
      </section>

      <section className="section-inner neighborhood-grid">
        <article>
          <h2>Horário</h2>
          <ul className="hours-grid">
            <li><span>Seg a sex</span><strong>{unit.schedule.mon?.open}–{unit.schedule.mon?.close}</strong></li>
            <li><span>Sábado</span><strong>{unit.schedule.sat?.open}–{unit.schedule.sat?.close}</strong></li>
            <li><span>Domingo</span><strong>{unit.schedule.sun?.open}–{unit.schedule.sun?.close}</strong></li>
          </ul>
          <p>{getHoursSentence(unit)}</p>
        </article>
        <article>
          <h2>Entrega</h2>
          <p>A loja de {label} entrega {unit.deliveryScope}.</p>
          <a href={buildWhatsAppUrl(unit, delivery, { campaign: "bairro", content: `${unit.id}_entrega` })} target="_blank" rel="noreferrer">Pedir entrega</a>
          {unit.ifoodUrl ? <a href="/ifood">Pedir pelo iFood</a> : null}
        </article>
        <article>
          <h2>Receita</h2>
          <p>Envie a foto ou o Memed no WhatsApp desta unidade.</p>
          <a href={buildWhatsAppUrl(unit, recipe, { campaign: "bairro", content: `${unit.id}_receita` })} target="_blank" rel="noreferrer">Enviar receita</a>
        </article>
      </section>

      <DeliverySlot unitName={label} href={buildWhatsAppUrl(unit, delivery, { campaign: "bairro", content: `${unit.id}_entrega_faixa` })} external ifood={Boolean(unit.ifoodUrl)} />

      <section className="section-inner store-about">
        <h2>Sobre a loja de {label}</h2>
        <p>{content.intro}</p>
        {unit.alternateNames?.length ? (
          <p>Loja {label} (antiga {unit.alternateNames.join(", ")}, como aparece no Google).</p>
        ) : null}
        {unit.amenities?.freeParking ? <p><strong>Estacionamento gratuito</strong> para clientes da loja.</p> : null}

        <h3>Bairros atendidos na entrega</h3>
        <div className="hours-table-wrap">
          <table className="hours-table">
            <caption>Entrega da loja de {label}</caption>
            <thead>
              <tr><th scope="col">Bairro</th><th scope="col">Cobertura</th></tr>
            </thead>
            <tbody>
              {content.bairros.map((bairro) => (
                <tr key={bairro}>
                  <th scope="row">{bairro}</th>
                  <td data-label="Cobertura">{unit.deliveryExclusive ? "Todo o bairro. A loja entrega somente neste bairro." : "Todo o bairro"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{content.bairrosNote}</p>

        <h3>Formas de pagamento</h3>
        <p>Pix, dinheiro, cartão de débito e cartão de crédito, inclusive por aproximação. Na entrega, confirme a forma de pagamento com a loja pelo WhatsApp.</p>

        <h3>Como pedir pelo WhatsApp</h3>
        <ol>
          <li>Chame a loja no WhatsApp {unit.whatsapp}.</li>
          <li>Mande o nome dos produtos ou uma foto da embalagem.</li>
          <li>Informe o seu endereço, se quiser receber em casa.</li>
          <li>A loja confirma o pedido com você.</li>
        </ol>
      </section>

      <section className="section-inner store-faq">
        <h2>Perguntas frequentes da loja de {label}</h2>
        {content.faqs.map((faq) => (
          <div key={faq.q}>
            <h3>{faq.q}</h3>
            <p>{faq.a}</p>
          </div>
        ))}
      </section>

      <section className="section-inner store-others">
        <h2>Outras lojas</h2>
        <ul>
          {otherUnits.map((other) => (
            <li key={other.id}>
              <a href={PAGE_HREF[other.id]}>União Farma {SHORT_LABEL[other.id]}</a> — {other.street}
            </li>
          ))}
          <li><a href="/entrega-de-medicamentos-em-sabara">Entrega de medicamentos em Sabará</a></li>
          <li><a href="/farmacia-em-sabara">Farmácia em Sabará: as 3 lojas</a></li>
          <li><a href="/farmacia-aberta-domingo-sabara">Ver horários: farmácia aberta agora e domingo</a></li>
        </ul>
      </section>

      <section className="section-inner offers-group-inline">
        <h2>Grupo de Ofertas no WhatsApp</h2>
        <p>Receba as ofertas da semana das 3 lojas direto no seu celular.</p>
        <OffersGroupCta placement={`unit_${unit.id}`} />
      </section>

      <section className="section-inner">
        <h2>Mapa interativo</h2>
        <InteractiveUnitMap initialUnitId={unit.id} />
      </section>
    </div>
  );
}
