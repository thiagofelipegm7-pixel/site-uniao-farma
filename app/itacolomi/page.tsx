import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[2];

export const metadata: Metadata = {
  title: { absolute: "Farmácia no Itacolomi, Sabará | União Farma" },
  description: "Unidade União Farma no Itacolomi: endereço, horário, mapa e pedido pelo WhatsApp.",
  alternates: { canonical: `${SITE_URL}/itacolomi` },
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
