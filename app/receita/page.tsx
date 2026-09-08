import type { Metadata } from "next";
import DirectUnitLinks from "../DirectUnitLinks";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { SITE_URL } from "../site-config";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";
import "../receita-polish.css";
import "../page-concordance.css";

export const metadata: Metadata = {
  title: { absolute: "Enviar receita pelo WhatsApp" },
  description:
    "Manda a foto da receita ou o Memed no WhatsApp da União Farma em Sabará. O farmacêutico confere no horário da loja, antes de separar.",
  alternates: { canonical: `${SITE_URL}/receita` },
};

export default function ReceitaPage() {
  return (
    <>
      <ContentSiteHeader activePath="/receita" />
      <div className="recipe-page" id="receita-whatsapp">
        <section className="hero hero-home recipe-hero" aria-labelledby="recipe-title">
          <div className="hero-inner">
            <div className="hero-copy recipe-copy">
              <p className="eyebrow">Receita no WhatsApp</p>
              <h1 id="recipe-title">{"Envie a receita para a loja"}</h1>
              <p className="hero-lead recipe-lead">
                {"Foto nítida ou link do Memed. A equipe confere no horário da loja e diz se tem."}
              </p>
            </div>

            <ol className="recipe-steps">
              <li>
                <strong>1</strong>
                <span>Manda a foto ou o Memed</span>
              </li>
              <li>
                <strong>2</strong>
                <span>Escolhe a loja do bairro</span>
              </li>
              <li>
                <strong>3</strong>
                <span>A loja confirma no horário</span>
              </li>
            </ol>

            <DirectUnitLinks
              compact
              message={WHATSAPP_MESSAGES.recipe}
              intent="recipe"
              source="recipe_page"
            />

            <p className="recipe-note">
              {"Controlado e antibiótico saem na loja. Não envie dados além dos necessários."}
            </p>
          </div>
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
