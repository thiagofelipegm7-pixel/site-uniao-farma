import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[0];

export const metadata: Metadata = {
  title: { absolute: "Farmácia em Nossa Senhora de Fátima, Sabará | União Farma" },
  description: "Unidade União Farma em Nossa Senhora de Fátima: endereço, horário, mapa e pedido pelo WhatsApp.",
  alternates: { canonical: `${SITE_URL}/fatima` },
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
