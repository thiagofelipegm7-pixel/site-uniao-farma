import type { Metadata } from "next";
import TutorialReceita from "./TutorialReceita";
import BotaoReceita from "../receita-foto/BotaoReceita";
import { IconClipe } from "../reserva/ReservaIcons";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { RECIPE_FAQS } from "../seo-content";
import { SITE_URL } from "../site-config";
import { getBreadcrumbSchema, getFaqSchema } from "../structured-data";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@graph": [
    getBreadcrumbSchema([
      { name: "Início", url: SITE_URL },
      { name: "Ler receita", url: `${SITE_URL}/receita` },
    ]),
    getFaqSchema(RECIPE_FAQS, `${SITE_URL}/receita`),
  ],
};
import "../receita-polish.css";

export const metadata: Metadata = {
  title: { absolute: "Ler receita e achar os remédios | União Farma" },
  description:
    "Fotografe a receita ou anexe o PDF e veja quais remédios a União Farma tem em Sabará. O farmacêutico confere antes da venda.",
  alternates: { canonical: "/receita" },
  openGraph: {
    title: "Ler receita e achar os remédios | União Farma",
    description: "Fotografe a receita ou anexe o PDF e veja quais remédios a União Farma tem em Sabará.",
    url: `${SITE_URL}/receita`,
    type: "website",
    images: [{ url: "/og-receita.jpg", width: 1200, height: 630, alt: "Envie sua receita para a União Farma" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ler receita e achar os remédios | União Farma",
    images: ["/og-receita.jpg"],
  },
};

export default function ReceitaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ContentSiteHeader activePath="/receita" />
      <div className="recipe-page" id="receita-whatsapp">
        <nav className="recipe-migalhas" aria-label="Navegação estrutural">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>Ler receita</span>
        </nav>
        <section className="hero hero-home recipe-hero" aria-labelledby="recipe-title">
          <img
            className="recipe-foto"
            src="/fotos/receita-topo.jpg"
            alt="Mulher olhando a receita em papel e o celular"
            width={1600}
            height={895}
            fetchPriority="high"
          />
          <div className="hero-inner">
            <div className="hero-copy recipe-copy">
              <p className="eyebrow">Receita</p>
              <h1 id="recipe-title">Encontre os remédios da sua receita</h1>
            </div>

            <BotaoReceita classe="recipe-anexar" rotulo="Ler minha receita" icone={<IconClipe size={22} />} />
          </div>
        </section>

        <TutorialReceita />

        <section className="section unit-faq-section" aria-labelledby="recipe-faq">
          <div className="section-inner">
            <h2 id="recipe-faq">Perguntas frequentes</h2>
            <div className="unit-faq-list">
              {RECIPE_FAQS.map((faq) => (
                <details key={faq.q} className="unit-faq-item">
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
