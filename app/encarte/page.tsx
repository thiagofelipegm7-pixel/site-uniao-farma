import type { Metadata } from "next";
import EncartePageClient from "./EncartePageClient";
import { SITE_URL } from "../site-config";

export const metadata: Metadata = {
  title: { absolute: "Encarte da semana | União Farma Sabará" },
  description: "Ofertas da semana da União Farma em Sabará. Escolha a loja e peça no WhatsApp com confirmação de estoque.",
  alternates: { canonical: `${SITE_URL}/encarte` },
  openGraph: {
    title: "Encarte da semana | União Farma Sabará",
    description: "Ofertas da semana no Instagram e no site da União Farma. Peça direto no WhatsApp da sua unidade.",
    url: `${SITE_URL}/encarte`,
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/encarte#webpage`,
      url: `${SITE_URL}/encarte`,
      name: "Encarte da semana | União Farma Sabará",
      description: "Ofertas da semana da União Farma. Escolha a loja e peça no WhatsApp.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "pt-BR",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Encarte", item: `${SITE_URL}/encarte` },
      ],
    },
  ],
};

export default function FlyerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <EncartePageClient />
    </>
  );
}

