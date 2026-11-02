/**
 * Página da unidade Itacolomi.
 *
 * Convenção: cada unidade tem seu próprio arquivo page.tsx para que
 * `export const metadata` (estático) gere as meta tags SEO corretas no build.
 * O componente <NeighborhoodPage> é reutilizado — só o `unit` e os metadados mudam.
 */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[2];

export const metadata: Metadata = {
  title: { absolute: "Drogaria Itacolomi em Sabará — União Farma (antiga Droga Manaus)" },
  description:
    "Drogaria no Itacolomi, em Sabará: União Farma, antiga Droga Manaus, na Av. Joaquim Ferreira Madureira, 489. Seg a sex até 21h, sáb até 20h, dom até 12h. WhatsApp (31) 99493-6960.",
  alternates: { canonical: "/itacolomi" },
  keywords: ["drogaria Itacolomi Sabará", "drogaria no Itacolomi", "farmácia Itacolomi Sabará", "União Farma Itacolomi", "Droga Manaus Itacolomi"],
  openGraph: {
    title: "Drogaria Itacolomi em Sabará — União Farma (antiga Droga Manaus)",
    description: "Drogaria no Itacolomi, em Sabará: União Farma, antiga Droga Manaus, na Av. Joaquim Ferreira Madureira, 489. Seg a sex até 21h, sáb até 20h, dom até 12h. WhatsApp (31) 99493-6960.",
    url: `${SITE_URL}/itacolomi`,
    type: "website",
    images: [{ url: "/og-itacolomi.jpg", width: 1200, height: 630, alt: "União Farma Itacolomi, Av. Joaquim Ferreira Madureira, 489" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drogaria Itacolomi em Sabará — União Farma (antiga Droga Manaus)",
    description: "Drogaria no Itacolomi, em Sabará: União Farma, antiga Droga Manaus, na Av. Joaquim Ferreira Madureira, 489. Seg a sex até 21h, sáb até 20h, dom até 12h. WhatsApp (31) 99493-6960.",
    images: [{ url: "/og-itacolomi.jpg", width: 1200, height: 630, alt: "União Farma Itacolomi, Av. Joaquim Ferreira Madureira, 489" }],
  },
};

export default function ItacolomiPage() {
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />
      <NeighborhoodPage unit={unit} />
      <ContentSiteFooter />
    </>
  );
}
