import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import DirectUnitLinks from "../DirectUnitLinks";
import { SITE_URL } from "../site-config";
import { CUSTOMER_QUESTIONS } from "../seo-content";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";

export const metadata: Metadata = {
  title: { absolute: "Perguntas frequentes | União Farma Sabará" },
  description: "Tem genérico? Aceita receita digital? Entrega no meu bairro? Respostas curtas e contato direto com a loja.",
  alternates: { canonical: `${SITE_URL}/perguntas` },
};

export default function QuestionsPage() {
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />
      <main className="questions-page">
        <section className="section-inner">
          <p className="eyebrow">Dúvidas rápidas</p>
          <h1>O que o cliente mais pergunta</h1>
          <p>Resposta curta. Se precisar confirmar, fale com a loja.</p>
          <div className="questions-list">
            {CUSTOMER_QUESTIONS.map((item) => (
              <article key={item.q} className="question-card">
                <h2>{item.q}</h2>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
          <DirectUnitLinks
            message={WHATSAPP_MESSAGES.product}
            intent="consulta_geral"
            source="perguntas"
            heading="Ainda tem dúvida?"
            description="Escolha a loja e pergunte no WhatsApp."
          />
        </section>
      </main>
      <ContentSiteFooter />
    </>
  );
}
