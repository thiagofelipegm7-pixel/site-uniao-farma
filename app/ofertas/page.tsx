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
    a: "Se a unidade atender o seu bairro, sim. Taxa e prazo entram na mesma conversa.",
  },
  {
    q: "Até quando vale?",
    a: "Quando a oferta tiver data, ela aparece no card. Se não tiver, pergunta na loja antes de sair de casa.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "Ofertas da farmácia em Sabará | União Farma" },
  description:
    "Promoções da União Farma em Sabará. Confirme preço e estoque no WhatsApp da loja — Fátima, Nações Unidas ou Itacolomi.",
  alternates: { canonical: "/ofertas" },
  openGraph: {
    title: "Ofertas da farmácia em Sabará | União Farma",
    description:
      "Veja as ofertas e confirme na loja do seu bairro se ainda tem e quanto custa hoje.",
    url: `${SITE_URL}/ofertas`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/ofertas-og.png`,
        width: 1733,
        height: 907,
        alt: "Ofertas da União Farma — confirme preço e estoque na unidade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ofertas da farmácia em Sabará | União Farma",
    description: "Confirme preço e estoque no WhatsApp da loja.",
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
      name: "Ofertas da farmácia em Sabará | União Farma",
      description:
        "Promoções da União Farma em Sabará. Confirme preço e estoque no WhatsApp da loja.",
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
