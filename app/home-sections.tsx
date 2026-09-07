"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { categories, type SelectorIntent } from "./home-chrome";
import HomeReasons from "./HomeReasons";
import { HomeMore } from "./home-more";
import UnitsShowcase from "./UnitsShowcase";

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
      <UnitsShowcase />
      <HomeReasons openSelector={openSelector} />

      <section className="trust-strip" aria-label="Por que a Uni\u00e3o Farma">
        <div className="section-inner trust-strip-grid">
          <div>
            <strong>3 unidades</strong>
            <span>F\u00e1tima, Na\u00e7\u00f5es e Itacolomi</span>
          </div>
          <div>
            <strong>Entrega</strong>
            <span>Confirme no WhatsApp da loja</span>
          </div>
          <div>
            <strong>Farmac\u00eautico</strong>
            <span>Orienta\u00e7\u00e3o no hor\u00e1rio da loja</span>
          </div>
          <div>
            <strong>Fam\u00edlia</strong>
            <span>Rem\u00e9dio, higiene e cuidado</span>
          </div>
        </div>
      </section>

      <section className="section categories-section reveal" id="categorias" aria-labelledby="categories-title">
        <div className="section-inner">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-kicker">No balc\u00e3o</p>
              <h2 id="categories-title">O que consultar na loja</h2>
            </div>
          </div>
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
                      description: "Escolha a loja para ver se tem hoje, o pre\u00e7o e as marcas.",
                      message: `Oi, Uni\u00e3o Farma {unidade}! Quero consultar um produto de ${category.title}. Posso mandar o nome?`,
                      eventName: `categoria_${category.title}`,
                    })
                  }
                >
                  Consultar na loja
                </button>
              </article>
            ))}
          </div>
          <div className="seo-intent-grid">
            <a href="/farmacia-em-sabara">Farm\u00e1cia em Sabar\u00e1</a>
            <a href="/entrega-de-medicamentos-em-sabara">Entrega de medicamentos em Sabar\u00e1</a>
            <a href="/perfumaria-em-sabara">Perfumaria em Sabar\u00e1</a>
          </div>
        </div>
      </section>

      <HomeMore generalIntent={generalIntent} openSelector={openSelector} />
    </>
  );
}
