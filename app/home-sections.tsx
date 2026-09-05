"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import UnitStatusBadge from "./UnitStatusBadge";
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import { buildWhatsAppUrl, UNITS } from "./site-config";
import {
  deliveryIntent,
  SHORT_UNIT_ADDRESSES,
  categories,
  WhatsAppIcon,
  LineIcon,
  type SelectorIntent,
} from "./home-chrome";
import { HomeMore } from "./home-more";

export function HomeSections({
  generalIntent,
  openSelector,
}: {
  generalIntent: SelectorIntent;
  openSelector: (intent: SelectorIntent) => void;
}) {
  return (
    <>
      <section className="quick-units-section reveal" id="unidades-rapidas" aria-labelledby="quick-units-title">
        <div className="section-inner">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-kicker">Atendimento direto</p>
              <h2 id="quick-units-title">Escolha sua unidade</h2>
            </div>
            <p>Vá direto ao WhatsApp da loja mais conveniente para você.</p>
          </div>
          <div className="quick-unit-grid">
            {UNITS.map((unit) => (
              <article className="quick-unit-card" key={unit.id}>
                <h3>{unit.shortName}</h3>
                <p>{SHORT_UNIT_ADDRESSES[unit.id]}</p>
                <UnitStatusBadge unit={unit} />
                <div className="quick-unit-actions">
                  <a
                    className="button button-whatsapp"
                    href={buildWhatsAppUrl(unit, generalIntent.message.replaceAll("{unidade}", unit.shortName))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackEvent("whatsapp_click", { unit: unit.id, source: "quick_units" })}
                  >
                    <WhatsAppIcon /> Falar no WhatsApp
                  </a>
                  <a className="text-link" href={`/unidades/${unit.slug}`}>Ver detalhes</a>
                  <a
                    className="text-link quick-recipe-link"
                    href={buildWhatsAppUrl(unit, `Olá, União Farma ${unit.shortName}! Vou enviar a foto da receita (ou Memed). Pode o farmacêutico conferir?`)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackEvent("whatsapp_click", { unit: unit.id, intent: "enviar_receita", source: "quick_units", placement: "recipe" })}
                  >
                    Enviar receita
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section delivery-section reveal" id="entrega" aria-labelledby="delivery-title">
        <div className="section-inner delivery-panel">
          <div className="delivery-copy">
            <p className="section-kicker light">Comodidade para sua rotina</p>
            <h2 id="delivery-title">Consulte entrega no seu bairro</h2>
            <DirectUnitLinks
              message={deliveryIntent.message}
              intent={deliveryIntent.eventName}
              source="home_delivery_section"
              heading="Informe seu bairro pelo WhatsApp"
              description="Escolha a unidade e confirme região, taxa e prazo de entrega."
              compact
            />
          </div>
          <div className="delivery-visual" aria-hidden="true">
            <LineIcon name="delivery" size={92} />
            <strong>Pedido pelo WhatsApp</strong>
          </div>
        </div>
      </section>

      <section className="section categories-section reveal" id="categorias" aria-labelledby="categories-title">
        <div className="section-inner">
          <h2 id="categories-title">Principais categorias</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <article className="category-card" key={category.title}>
                <h3>{category.title}</h3>
                <p>{category.text}</p>
                <button
                  type="button"
                  className="category-link"
                  onClick={() =>
                    openSelector({
                      title: `Consultar ${category.title.toLowerCase()}`,
                      description: "Escolha a unidade para verificar marcas, opções e disponibilidade.",
                      message: `Olá! Vim pelo site da União Farma e gostaria de consultar produtos da categoria ${category.title}.`,
                      eventName: `categoria_${category.title}`,
                    })
                  }
                >
                  Consultar categoria
                </button>
              </article>
            ))}
          </div>
          <div className="seo-intent-grid">
            <a href="/farmacia-em-sabara">Farmácia em Sabará</a>
            <a href="/entrega-de-medicamentos-em-sabara">Entrega de medicamentos em Sabará</a>
            <a href="/perfumaria-em-sabara">Perfumaria em Sabará</a>
          </div>
        </div>
      </section>

      <HomeMore generalIntent={generalIntent} openSelector={openSelector} />
    </>
  );
}
