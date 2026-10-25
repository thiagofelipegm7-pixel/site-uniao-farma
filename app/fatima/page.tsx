/**
 * Página da unidade Fátima.
 *
 * Convenção: cada unidade tem seu próprio arquivo page.tsx para que
 * `export const metadata` (estático) gere as meta tags SEO corretas no build.
 * O componente <NeighborhoodPage> é reutilizado — só o `unit` e os metadados mudam.
 */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[0];

export const metadata: Metadata = {
  title: { absolute: "Farmácia em Fátima, Sabará: entrega e WhatsApp | União Farma" },
  description:
    "Rua Cláudio, 902. Seg a sex das 7h às 21h, sábado até 20h e domingo até 12h. Peça pelo WhatsApp (31) 98738-1786 e consulte a entrega.",
  alternates: { canonical: "/fatima" },
  keywords: ["farmácia Fátima Sabará", "União Farma Fátima", "drogaria Nossa Senhora de Fátima"],
  openGraph: {
    title: "Farmácia em Fátima, Sabará: entrega e WhatsApp | União Farma",
    description: "Rua Cláudio, 902. Seg a sex das 7h às 21h, sábado até 20h e domingo até 12h. Peça pelo WhatsApp (31) 98738-1786 e consulte a entrega.",
    url: `${SITE_URL}/fatima`,
    type: "website",
    images: ["/og-instagram-optimized.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farmácia em Fátima, Sabará: entrega e WhatsApp | União Farma",
    description: "Rua Cláudio, 902. Seg a sex das 7h às 21h, sábado até 20h e domingo até 12h. Peça pelo WhatsApp (31) 98738-1786 e consulte a entrega.",
    images: ["/og-instagram-optimized.jpg"],
  },
};

export default function FatimaPage() {
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />
      <NeighborhoodPage unit={unit} />
      <ContentSiteFooter />
    </>
  );
}
