import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL, PUBLIC_UNITS } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "farmacia-em-sabara",
  title: "Farmácia em Sabará | União Farma",
  description: "Drogaria União Farma Nações Unidas, em Sabará. Consulte remédio, preço e entrega no WhatsApp da loja.",
  eyebrow: "Farmácia de rua em Sabará",
  heading: "Farmácia em Sabará, pertinho de casa",
  lead: "Não é um site de compra. É a loja do bairro respondendo no WhatsApp: se tem, quanto custa e se dá para entregar hoje.",
  bullets: [
    "Endereço com horário, telefone e rota no Maps.",
    "Genérico, similar, referência, higiene e perfumaria — estoque do dia.",
    "Farmacêutico no balcão e conversa direta com a loja.",
  ],
  faqs: [
    { q: "Onde tem União Farma em Sabará?", a: "No bairro Nações Unidas, na Rua Inglaterra, 162. Abra o WhatsApp da loja." },
    { q: "Como saber o preço?", a: "Manda o nome e a dosagem no WhatsApp da loja. A resposta é do estoque de hoje, não de uma lista congelada." },
    { q: "Fazem entrega?", a: `Sim, pelo WhatsApp da loja. ${PUBLIC_UNITS.map((unit) => `A loja ${unit.legalLabel} entrega ${unit.deliveryScope}`).join(". ")}. Taxa e prazo são confirmados na conversa.` },
  ],
  includeUnitSchema: true,
  primaryLabel: "Escolher uma unidade",
  primaryMessage: "Oi, União Farma {unidade}! Vim pela página Farmácia em Sabará. Quero consultar um produto.",
};

export const metadata: Metadata = {
  title: { absolute: config.title },
  description: config.description,
  alternates: { canonical: `/${config.slug}` },
  openGraph: { title: config.title, description: config.description, url: `${SITE_URL}/${config.slug}`, type: "website", images: ["/og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: config.title, description: config.description, images: ["/og-optimized.jpg"] },
};

export default function FarmaciaEmSabaraPage() {
  return <LocalLandingPage config={config} />;
}
