import type { Metadata } from "next";
import OffersPageClient from "./OffersPageClient";
import { SITE_URL } from "../site-config";

const OFFERS_FAQS = [
  {
    q: "Os preços são iguais em todas as unidades?",
    a: "Consulte a unidade escolhida para confirmar preço e disponibilidade da oferta.",
  },
  {
    q: "Todas as ofertas estão disponíveis?",
    a: "A disponibilidade pode variar. Consulte a equipe pelo WhatsApp.",
  },
  {
    q: "Vocês fazem entrega?",
    a: "A entrega depende do endereço, da unidade responsável e das condições informadas no atendimento.",
  },
  {
    q: "Como saber se uma promoção ainda está válida?",
    a: "A validade deve constar na oferta quando informada. Em caso de dúvida, confirme com a unidade.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "Ofertas de Farmácia e Perfumaria em Sabará | União Farma" },
  description:
    "Confira ofertas selecionadas da União Farma em Sabará. Consulte preços, disponibilidade, validade e atendimento diretamente com uma unidade.",
  alternates: { canonical: "/ofertas" },
  openGraph: {
    title: "Ofertas de Farmácia e Perfumaria em Sabará | União Farma",
    description:
      "Confira ofertas selecionadas e consulte preço, disponibilidade e atendimento com a unidade escolhida.",
    url: `${SITE_URL}/ofertas`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/ofertas-og.png`,
        width: 1733,
        height: 907,
        alt: "Ofertas da União Farma — consulte preço e disponibilidade com a unidade escolhida",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ofertas de Farmácia e Perfumaria em Sabará | União Farma",
    description: "Consulte preço e disponibilidade com a unidade escolhida.",
    images: [`${SITE_URL}/ofertas-og.png`],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/ofertas#webpage`,
      url: `${SITE_URL}/ofertas`,
      name: "Ofertas de Farmácia e Perfumaria em Sabará | União Farma",
      description:
        "Confira ofertas selecionadas da União Farma em Sabará. Consulte preços, disponibilidade, validade e atendimento diretamente com uma unidade.",
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
