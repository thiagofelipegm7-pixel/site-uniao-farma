import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import NeighborhoodPage from "../NeighborhoodPage";
import { SITE_URL, UNITS } from "../site-config";

const unit = UNITS[1];

export const metadata: Metadata = {
  title: { absolute: "Farmácia em Nações Unidas, Sabará | União Farma" },
  description:
    "Farmácia União Farma na Rua Inglaterra, 162, Nações Unidas, Sabará/MG. Horário, mapa e pedido pelo WhatsApp.",
  alternates: { canonical: `${SITE_URL}/nacoes-unidas` },
  keywords: ["farmácia Nações Unidas Sabará", "União Farma Nações", "drogaria Nações Unidas"],
  openGraph: {
    title: "Farmácia em Nações Unidas, Sabará | União Farma",
    description: "Rua Inglaterra, 162. Peça pelo WhatsApp da loja de Nações Unidas.",
    url: `${SITE_URL}/nacoes-unidas`,
    type: "website",
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
