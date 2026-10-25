/**
 * Página da unidade Nações Unidas.
 *
 * Convenção: cada unidade tem seu próprio arquivo page.tsx para que
 * `export const metadata` (estático) gere as meta tags SEO corretas no build.
 * O componente <NeighborhoodPage> é reutilizado — só o `unit` e os metadados mudam.
 */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[1];

export const metadata: Metadata = {
  title: { absolute: "Farmácia em Nações Unidas, Sabará: seg a sáb até 21h | União Farma" },
  description:
    "Rua Inglaterra, 162. Aberta até 21h de segunda a sábado e domingo até 12h. Peça pelo WhatsApp (31) 98762-9909 e consulte a entrega.",
  alternates: { canonical: "/nacoes-unidas" },
  keywords: ["farmácia Nações Unidas Sabará", "União Farma Nações", "drogaria Nações Unidas"],
  openGraph: {
    title: "Farmácia em Nações Unidas, Sabará: seg a sáb até 21h | União Farma",
    description: "Rua Inglaterra, 162. Aberta até 21h de segunda a sábado e domingo até 12h. Peça pelo WhatsApp (31) 98762-9909 e consulte a entrega.",
    url: `${SITE_URL}/nacoes-unidas`,
    type: "website",
    images: [{ url: "/og-nacoes-unidas.jpg", width: 1200, height: 630, alt: "União Farma Nações Unidas, Rua Inglaterra, 162" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farmácia em Nações Unidas, Sabará: seg a sáb até 21h | União Farma",
    description: "Rua Inglaterra, 162. Aberta até 21h de segunda a sábado e domingo até 12h. Peça pelo WhatsApp (31) 98762-9909 e consulte a entrega.",
    images: [{ url: "/og-nacoes-unidas.jpg", width: 1200, height: 630, alt: "União Farma Nações Unidas, Rua Inglaterra, 162" }],
  },
};

export default function NacoesPage() {
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />
      <NeighborhoodPage unit={unit} />
      <ContentSiteFooter />
    </>
  );
}
