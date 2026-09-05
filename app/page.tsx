"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { useState } from "react";
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import {
  buildWhatsAppUrl,
  INSTAGRAM_URL,
  SITE_URL,
  UNITS,
} from "./site-config";
import { HOME_FAQS } from "./seo-content";
import { getPageStructuredData } from "./structured-data";

const PRODUCT_MESSAGE =
  "Olá, União Farma {unidade}! Quero pedir um produto. Nome: ___  dosagem: ___  bairro: ___";

const DELIVERY_MESSAGE =
  "Olá! Vim pelo site da União Farma e gostaria de saber se vocês entregam no meu bairro. Posso informar meu endereço?";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const homeStructuredData = getPageStructuredData({
    name: "Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    faqs: HOME_FAQS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <nav className="nav" aria-label="Menu principal">
          <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
            <img
              src="/uniao-farma-logo.webp"
              alt="Logo da União Farma"
              width="52"
              height="52"
              fetchPriority="high"
              decoding="async"
            />
            <span>
              <strong>União Farma</strong>
              <small>Drogaria e Perfumaria</small>
            </span>
          </a>
          <button
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-links"
            aria-label={menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="menu-label">{menuOpen ? "Fechar" : "Menu"}</span>
          </button>
          <div className={menuOpen ? "menu-links is-open" : "menu-links"} id="menu-links">
            <a href="/ofertas" onClick={() => setMenuOpen(false)}>Ofertas</a>
            <a href="#unidades-rapidas" onClick={() => setMenuOpen(false)}>Unidades</a>
            <a href="/receita" onClick={() => setMenuOpen(false)}>Receita</a>
          </div>
        </nav>
      </header>

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Drogaria e Perfumaria em Sabará</p>
          <h1 id="hero-title">Cuidado, ofertas e entrega pertinho de você.</h1>
          <p className="hero-lead">
            Consulte produtos, preço e disponibilidade pelo WhatsApp da unidade mais próxima.
          </p>
        </div>
      </section>

      <section id="unidades-rapidas" aria-labelledby="quick-units-title">
        <h2 id="quick-units-title">Escolha sua unidade</h2>
        <DirectUnitLinks
          message={PRODUCT_MESSAGE}
          intent="consulta_geral"
          source="home_hero"
          heading="Escolha sua unidade e fale direto com a equipe"
          description="Rua, horário e atendimento direto em cada loja."
        />
      </section>

      <section id="entrega" aria-labelledby="delivery-title">
        <h2 id="delivery-title">Consulte entrega no seu bairro</h2>
        <DirectUnitLinks
          message={DELIVERY_MESSAGE}
          intent="delivery_inquiry"
          source="home_delivery_section"
          heading="Informe seu bairro pelo WhatsApp"
          description="Escolha a unidade e confirme região, taxa e prazo de entrega."
          compact
        />
      </section>

      <section aria-label="Unidades">
        {UNITS.map((unit) => (
          <article key={unit.id}>
            <h3>{unit.shortName}</h3>
            <p>{unit.address}</p>
            <a
              href={buildWhatsAppUrl(unit, PRODUCT_MESSAGE.replaceAll("{unidade}", unit.shortName))}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { unit: unit.id, source: "unit_card" })}
            >
              WhatsApp {unit.whatsapp}
            </a>
            <a href={unit.phoneLink} onClick={() => trackEvent("phone_click", { unit: unit.id, source: "unit_card" })}>
              {unit.phone}
            </a>
            <a href={unit.map} target="_blank" rel="noreferrer" onClick={() => trackEvent("maps_click", { unit: unit.id, source: "unit_card" })}>
              Como chegar
            </a>
            <a href={`/unidades/${unit.slug}`}>Ver página da unidade</a>
          </article>
        ))}
      </section>

      <p>
        <a href="/ofertas">Ver ofertas</a>
        {" · "}
        <a href="/novidades">Ver todas as novidades</a>
        {" · "}
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>
      </p>
    </>
  );
}
