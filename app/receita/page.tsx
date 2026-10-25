import type { Metadata } from "next";
import DirectUnitLinks from "../DirectUnitLinks";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { SITE_URL } from "../site-config";
import { getBreadcrumbSchema } from "../structured-data";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  ...getBreadcrumbSchema([
    { name: "Início", url: SITE_URL },
    { name: "Enviar receita", url: `${SITE_URL}/receita` },
  ]),
};
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";
import "../receita-polish.css";

export const metadata: Metadata = {
  title: { absolute: "Enviar receita pelo WhatsApp | União Farma" },
  description:
    "Envie a foto da receita ou o link do Memed no WhatsApp da União Farma em Sabará. A loja confere no horário e diz se tem.",
  alternates: { canonical: "/receita" },
  openGraph: {
    title: "Enviar receita pelo WhatsApp | União Farma",
    description: "Envie a foto da receita ou o link do Memed no WhatsApp da União Farma em Sabará.",
    url: `${SITE_URL}/receita`,
    type: "website",
    images: [{ url: "/og-receita.jpg", width: 1200, height: 630, alt: "Envie sua receita para a União Farma" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Enviar receita pelo WhatsApp | União Farma",
    images: ["/og-receita.jpg"],
  },
};

export default function ReceitaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ContentSiteHeader activePath="/receita" />
      <div className="recipe-page" id="receita-whatsapp">
        <section className="hero hero-home recipe-hero" aria-labelledby="recipe-title">
          <div className="hero-inner">
            <div className="hero-copy recipe-copy">
              <p className="eyebrow">Receita no WhatsApp</p>
              <h1 id="recipe-title">Envie a receita para a loja</h1>
              <p className="hero-lead recipe-lead">
                Foto nítida ou Memed. A loja do bairro confere no horário e responde se tem.
              </p>
            </div>

            <ol className="recipe-steps">
              <li>
                <strong>1</strong>
                <span>Foto ou Memed</span>
              </li>
              <li>
                <strong>2</strong>
                <span>Loja do bairro</span>
              </li>
              <li>
                <strong>3</strong>
                <span>Confirma se tem</span>
              </li>
            </ol>

            <DirectUnitLinks
              compact
              message={WHATSAPP_MESSAGES.recipe}
              intent="recipe"
              source="recipe_page"
            />

            <p className="recipe-note">
              Controlado e antibiótico saem na loja. Não envie dados além dos necessários.
            </p>
          </div>
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
