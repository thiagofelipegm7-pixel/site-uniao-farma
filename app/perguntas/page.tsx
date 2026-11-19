import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import DirectUnitLinks from "../DirectUnitLinks";
import { SITE_URL } from "../site-config";
import { getPageStructuredData } from "../structured-data";
import { CUSTOMER_QUESTIONS } from "../seo-content";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";

export const metadata: Metadata = {
  title: { absolute: "Perguntas frequentes | União Farma Sabará" },
  description: "Tem genérico? Aceita receita digital? Entrega no meu bairro? Respostas curtas e contato direto com a loja.",
  alternates: { canonical: "/perguntas" },
};

export default function QuestionsPage() {
  const pageUrl = `${SITE_URL}/perguntas`;
  const structuredData = getPageStructuredData({
    name: "Perguntas frequentes | União Farma Sabará",
    url: pageUrl,
    faqs: CUSTOMER_QUESTIONS,
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: "Perguntas frequentes", url: pageUrl },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ContentSiteHeader activePath="/ofertas" />
      <div className="questions-page">
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
      </div>
      <ContentSiteFooter />
    </>
  );
}
