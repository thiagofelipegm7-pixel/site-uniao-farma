import UnitStatusBadge from "./UnitStatusBadge";
import { buildWhatsAppUrl, type Unit } from "./site-config";
import { UNIT_PHOTOS } from "./unit-photos";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";

const SHORT_LABEL: Record<Unit["id"], string> = {
  fatima: "Fátima",
  nacoes: "Nações Unidas",
  itacolomi: "Itacolomi",
};

export default function NeighborhoodPage({ unit }: { unit: Unit }) {
  const label = SHORT_LABEL[unit.id];
  const product = WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName);
  const delivery = WHATSAPP_MESSAGES.delivery.replaceAll("{unidade}", unit.shortName);
  const recipe = WHATSAPP_MESSAGES.recipe.replaceAll("{unidade}", unit.shortName);

  return (
    <main className="neighborhood-page">
      <section className="section-inner neighborhood-hero">
        <img className="neighborhood-photo" src={UNIT_PHOTOS[unit.id]} alt={`União Farma ${label}`} width="1200" height="720" />
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

      <section className="section-inner neighborhood-map">
        <h2>Mapa</h2>
        <iframe src={unit.mapEmbed} title={`Mapa da União Farma ${label}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </section>
    </main>
  );
}
