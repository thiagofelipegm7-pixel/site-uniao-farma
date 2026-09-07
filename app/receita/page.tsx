import type { Metadata } from "next";
import DirectUnitLinks from "../DirectUnitLinks";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";

export const metadata: Metadata = {
  title: "Enviar receita pelo WhatsApp | União Farma",
  description:
    "Manda a foto da receita ou o Memed no WhatsApp da União Farma em Sabará. O farmacêutico confere no horário da loja, antes de separar.",
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
              <h1 id="recipe-title">{"Envia a receita para o farmacêutico conferir"}</h1>
              <p>
                {"Foto nítida ou link do Memed. A equipe olha a prescrição no horário da loja, diz se tem o medicamento e orienta o próximo passo. Controlado e antibiótico saem na loja."}
              </p>
            </div>
            <img
              className="recipe-illustration"
              src="/illustrations/atendimento.svg?v=8"
              alt="Ilustração de farmacêutica orientando uma cliente no balcão da União Farma"
              width="1200"
              height="900"
              decoding="async"
            />
            <DirectUnitLinks
              message={WHATSAPP_MESSAGES.recipe}
              intent="recipe"
              source="recipe_page"
              heading="Escolha a loja que vai receber a receita"
              description="Manda só o que o atendimento precisa. Preço e estoque a unidade confirma no horário da loja, conforme a fila."
            />
            <p className="recipe-note">
              {"Não envie dados além dos necessários. Medicamentos sujeitos à vigilância sanitária."}
            </p>
          </div>
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
