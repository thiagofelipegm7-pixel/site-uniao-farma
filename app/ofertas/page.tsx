import type { Metadata } from "next";
import OffersPageClient from "./OffersPageClient";
import { SITE_URL } from "../site-config";

const OFFERS_FAQS = [
  {
    q: "O preço é o mesmo nas três lojas?",
    a: "Nem sempre. Promoção vale enquanto tiver naquela unidade. Confirma no WhatsApp da loja que você vai usar.",
  },
  {
    q: "A oferta que eu vi ainda tem?",
    a: "Estoque muda no dia. Manda o nome do produto para a loja — ela diz se ainda tem e o preço de agora.",
  },
  {
    q: "Dá para entregar a promoção?",
    a: "Sim, nos bairros atendidos pela loja (veja a página de entrega). Taxa e prazo entram na mesma conversa.",
  },
  {
    q: "Até quando vale?",
    a: "As ofertas da Black Friday valem por tempo limitado, enquanto durar o estoque em cada loja. Confirme na loja antes de sair de casa.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "Black Friday União Farma: ofertas em Sabará" },
  description:
    "Black Friday União Farma: ofertas por tempo limitado. Confirme preço e estoque no WhatsApp da loja — Fátima, Nações Unidas ou Itacolomi.",
  alternates: { canonical: "/ofertas" },
  openGraph: {
    title: "Black Friday União Farma: ofertas em Sabará",
    description:
      "Black Friday União Farma: ofertas por tempo limitado. Confirme na loja do seu bairro se ainda tem e quanto custa.",
    url: `${SITE_URL}/ofertas`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/ofertas-og-optimized.jpg`,
        width: 1200,
        height: 628,
        alt: "Ofertas da União Farma — confirme preço e estoque na unidade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Friday União Farma: ofertas em Sabará",
    description: "Ofertas por tempo limitado. Confirme preço e estoque no WhatsApp da loja.",
    images: [`${SITE_URL}/ofertas-og-optimized.jpg`],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/ofertas#webpage`,
      url: `${SITE_URL}/ofertas`,
      name: "Black Friday União Farma: ofertas em Sabará",
      description:
        "Black Friday União Farma: ofertas por tempo limitado. Confirme preço e estoque no WhatsApp da loja.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "pt-BR",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Ofertas", item: `${SITE_URL}/ofertas` },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: OFFERS_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ],
};

export default function OffersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <OffersPageClient
        faqs={OFFERS_FAQS}
        showReviewPanel={
          process.env.NODE_ENV !== "production" || process.env.OFFERS_REVIEW_MODE === "true"
        }
      />
    </>
  );
}
