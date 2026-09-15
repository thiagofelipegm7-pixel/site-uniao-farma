import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[0];

export const metadata: Metadata = {
  title: { absolute: "Farmácia em Nossa Senhora de Fátima, Sabará | União Farma" },
  description:
    "Farmácia União Farma na Rua Cláudio, 902, Nossa Senhora de Fátima, Sabará/MG. Horário, mapa e pedido pelo WhatsApp.",
  alternates: { canonical: `${SITE_URL}/fatima` },
  keywords: ["farmácia Fátima Sabará", "União Farma Fátima", "drogaria Nossa Senhora de Fátima"],
  openGraph: {
    title: "Farmácia em Nossa Senhora de Fátima, Sabará | União Farma",
    description: "Rua Cláudio, 902. Peça pelo WhatsApp da loja de Fátima.",
    url: `${SITE_URL}/fatima`,
    type: "website",
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
