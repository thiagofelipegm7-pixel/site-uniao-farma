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
  title: { absolute: "Farmácia no Itacolomi, Sabará: entrega e WhatsApp | União Farma" },
  description:
    "Rua Joaquim F. Moreira, 489. Seg a sex até 21h, sábado até 20h e domingo até 12h. Peça pelo WhatsApp (31) 99493-6960 e consulte a entrega.",
  alternates: { canonical: "/itacolomi" },
  keywords: ["farmácia Itacolomi Sabará", "União Farma Itacolomi", "drogaria Itacolomi"],
  openGraph: {
    title: "Farmácia no Itacolomi, Sabará: entrega e WhatsApp | União Farma",
    description: "Rua Joaquim Ferreira Moreira, 489. Peça pelo WhatsApp da loja do Itacolomi.",
    url: `${SITE_URL}/itacolomi`,
    type: "website",
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
