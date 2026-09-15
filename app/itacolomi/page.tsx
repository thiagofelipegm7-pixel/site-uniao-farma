import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[2];

export const metadata: Metadata = {
  title: { absolute: "Farmácia no Itacolomi, Sabará | União Farma" },
  description:
    "Farmácia União Farma na Rua Joaquim Ferreira Moreira, 489, Itacolomi, Sabará/MG. Horário, mapa e pedido pelo WhatsApp.",
  alternates: { canonical: `${SITE_URL}/itacolomi` },
  keywords: ["farmácia Itacolomi Sabará", "União Farma Itacolomi", "drogaria Itacolomi"],
  openGraph: {
    title: "Farmácia no Itacolomi, Sabará | União Farma",
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
