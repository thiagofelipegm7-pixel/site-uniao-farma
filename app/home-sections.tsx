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
  type SelectorIntent,
} from "./home-chrome";
import { HomeMore } from "./home-more";

const CATEGORY_ICON_SRC: Record<string, string> = {
  medicine: "/icons/medicamentos.svg",
  beauty: "/icons/beleza.svg",
  hair: "/icons/cabelos.svg",
  hygiene: "/icons/higiene.svg",
  baby: "/icons/mamae-bebe.svg",
  vitamins: "/icons/vitaminas.svg",
};

export function HomeSections({
  generalIntent,
  openSelector,
}: {
  generalIntent: SelectorIntent;
  openSelector: (intent: SelectorIntent) => void;
}) {
  return (
    <>
      <section className="trust-strip" aria-label="Por que a União Farma">
        <div className="section-inner trust-strip-grid">
          <div>
            <strong>3 lojas</strong>
            <span>Fátima, Nações e Itacolomi</span>
          </div>
          <div>
            <strong>Entrega</strong>
            <span>Consulte no WhatsApp do bairro</span>
          </div>
          <div>
            <strong>Farmacêutico</strong>
            <span>Orientação durante o horário</span>
          </div>
          <div>
            <strong>Família</strong>
            <span>Saúde, higiene e bem-estar</span>
          </div>
        </div>
      </section>

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
          <div className="delivery-visual">
            <img
              src="/illustrations/entrega.svg?v=7"
              alt="Entregador levando uma sacola da farmácia até uma casa do bairro"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
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
                <img className="category-icon-img" src={CATEGORY_ICON_SRC[category.icon]} alt="" width="24" height="24" />
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
          <div className="family-illustration-row">
            <figure className="family-illustration">
              <img
                src="/illustrations/familia.svg?v=7"
                alt="Cliente acompanhando uma senhora na saída da farmácia, com a farmacêutica acenando na porta"
                width="1200"
                height="900"
                loading="lazy"
                decoding="async"
              />
            </figure>
            <figure className="family-illustration">
              <img
                src="/illustrations/perfumaria.svg?v=7"
                alt="Farmacêutica indicando produtos de higiene e beleza para uma cliente"
                width="1200"
                height="900"
                loading="lazy"
                decoding="async"
              />
            </figure>
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
