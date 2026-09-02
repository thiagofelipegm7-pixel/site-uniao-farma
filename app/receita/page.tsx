import type { Metadata } from "next";
import DirectUnitLinks from "../DirectUnitLinks";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";

export const metadata: Metadata = {
  title: "Enviar receita pelo WhatsApp | União Farma",
  description:
    "Escolha uma unidade da União Farma em Sabará e envie sua receita pelo WhatsApp para conferência da equipe.",
};

const message =
  "Olá, União Farma {unidade}! Vou enviar a foto da receita (ou Memed). Pode o farmacêutico conferir?";

export default function ReceitaPage() {
  return (
    <>
      <ContentSiteHeader activePath="/receita" />
      <main className="recipe-page" id="conteudo">
        <section className="recipe-hero" aria-labelledby="recipe-title">
          <div className="section-inner recipe-inner">
            <p className="section-kicker">Atendimento direto</p>
            <h1 id="recipe-title">Envie sua receita para a unidade certa</h1>
            <p>
              Escolha uma loja e envie uma foto legível ou a receita Memed. A equipe confere a
              disponibilidade e orienta os próximos passos pelo WhatsApp.
            </p>
            <DirectUnitLinks
              message={message}
              intent="enviar_receita"
              source="recipe_page"
              heading="Escolha onde deseja ser atendido"
              description="Antibióticos e medicamentos controlados devem ser retirados presencialmente, conforme as exigências aplicáveis."
            />
            <p className="recipe-note">
              Não envie dados além dos necessários para o atendimento. Preço, estoque e condições
              são confirmados diretamente com a unidade.
            </p>
          </div>
        </section>
      </main>
      <ContentSiteFooter />
    </>
  );
}
