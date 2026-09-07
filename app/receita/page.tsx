import type { Metadata } from "next";
import DirectUnitLinks from "../DirectUnitLinks";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";

export const metadata: Metadata = {
  title: "Enviar receita pelo WhatsApp | Uni\u00e3o Farma",
  description:
    "Manda a foto da receita ou o Memed no WhatsApp da Uni\u00e3o Farma em Sabar\u00e1. O farmac\u00eautico confere no hor\u00e1rio da loja, antes de separar.",
};

export default function ReceitaPage() {
  return (
    <>
      <ContentSiteHeader activePath="/receita" />
      <div className="recipe-page" id="receita-whatsapp">
        <section className="recipe-hero" aria-labelledby="recipe-title">
          <div className="section-inner recipe-inner recipe-with-art">
            <div>
              <p className="section-kicker">Receita no WhatsApp da loja</p>
              <h1 id="recipe-title">Envia a receita para o farmac\u00eautico conferir</h1>
              <p>
                Foto n\u00edtida ou link do Memed. A equipe olha a prescri\u00e7\u00e3o no hor\u00e1rio da loja,
                diz se tem o medicamento e orienta o pr\u00f3ximo passo. Controlado e antibi\u00f3tico saem na loja.
              </p>
            </div>
            <img
              className="recipe-illustration"
              src="/illustrations/atendimento.svg?v=8"
              alt="Ilustra\u00e7\u00e3o de farmac\u00eautica orientando uma cliente no balc\u00e3o da Uni\u00e3o Farma"
              width="1200"
              height="900"
              decoding="async"
            />
            <DirectUnitLinks
              message={WHATSAPP_MESSAGES.recipe}
              intent="recipe"
              source="recipe_page"
              heading="Escolha a loja que vai receber a receita"
              description="Manda s\u00f3 o que o atendimento precisa. Pre\u00e7o e estoque a unidade confirma no hor\u00e1rio da loja, conforme a fila."
            />
            <p className="recipe-note">
              N\u00e3o envie dados al\u00e9m dos necess\u00e1rios. Medicamentos sujeitos \u00e0 vigil\u00e2ncia sanit\u00e1ria.
            </p>
          </div>
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
