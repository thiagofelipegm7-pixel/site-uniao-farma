"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import UnitStatusBadge from "./UnitStatusBadge";
import { trackEvent } from "./analytics";
import { buildWhatsAppUrl, UNITS } from "./site-config";
import {
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
            <span>Pergunta no WhatsApp do bairro</span>
          </div>
          <div>
            <strong>Farmacêutico</strong>
            <span>Orientação no horário da loja</span>
          </div>
          <div>
            <strong>Família</strong>
            <span>Remédio, higiene e cuidado</span>
          </div>
        </div>
      </section>

      <section className="quick-units-section reveal" id="unidades-rapidas" aria-labelledby="quick-units-title">
        <div className="section-inner">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-kicker">A loja do seu bairro</p>
              <h2 id="quick-units-title">Escolha a unidade e fale agora</h2>
            </div>
            <p>Cada botão abre o WhatsApp daquela loja, já com a mensagem pronta.</p>
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
                  <a className="text-link" href={`/unidades/${unit.slug}`}>Ver endereço e horário</a>
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

      <section className="section categories-section reveal" id="categorias" aria-labelledby="categories-title">
        <div className="section-inner">
          <h2 id="categories-title">O que a gente costuma ter na loja</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <article className="category-card" key={category.title}>
                <img className="category-icon-img" src={CATEGORY_ICON_SRC[category.icon]} alt="" width="24" height="24" loading="lazy" decoding="async" />
                <h3>{category.title}</h3>
                <p>{category.text}</p>
                <button
                  type="button"
                  className="category-link"
                  onClick={() =>
                    openSelector({
                      title: `Consultar ${category.title.toLowerCase()}`,
                      description: "Escolha a loja para ver se tem hoje, o preço e as marcas.",
                      message: `Oi, União Farma {unidade}! Quero consultar um produto de ${category.title}. Posso mandar o nome?`,
                      eventName: `categoria_${category.title}`,
                    })
                  }
                >
                  Perguntar na loja
                </button>
              </article>
            ))}
          </div>
          <div className="family-illustration-row">
            <figure className="family-illustration">
              <img
                src="/illustrations/familia.svg?v=7"
                alt="Cliente acompanhando uma senhora na saída da farmácia, com a farmacêutica acenando na porta"
                width="720"
                height="540"
                sizes="(max-width: 860px) 92vw, 360px"
                loading="lazy"
                decoding="async"
              />
            </figure>
            <figure className="family-illustration">
              <img
                src="/illustrations/perfumaria.svg?v=7"
                alt="Farmacêutica indicando produtos de higiene e beleza para uma cliente"
                width="720"
                height="540"
                sizes="(max-width: 860px) 92vw, 360px"
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
