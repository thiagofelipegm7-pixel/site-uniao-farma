import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "farmacia-em-sabara",
  title: "Farmácia em Sabará | União Farma",
  description: "Consulte medicamentos, perfumaria e cuidados pessoais com atendimento local em três unidades da União Farma em Sabará/MG.",
  eyebrow: "Farmácia e drogaria em Sabará",
  heading: "Farmácia em Sabará para sua rotina",
  lead: "Encontre a unidade da União Farma mais conveniente para consultar preço, disponibilidade, horário e atendimento pelo WhatsApp.",
  bullets: [
    "Três unidades com endereço, telefone, horário e rota no Google Maps.",
    "Medicamentos, genéricos, similares, higiene, beleza e perfumaria.",
    "Atendimento direto pelo WhatsApp da unidade escolhida.",
  ],
  faqs: [
    { q: "Onde encontrar uma farmácia da União Farma em Sabará?", a: "A União Farma possui unidades em Nossa Senhora de Fátima, Nações Unidas e Itacolomi. Consulte os endereços e escolha o WhatsApp da loja mais conveniente." },
    { q: "Como consultar preço e disponibilidade?", a: "Escolha uma unidade e consulte a equipe sobre disponibilidade e requisitos de atendimento." },
    { q: "A União Farma faz entrega em Sabará?", a: "A entrega depende da região, do endereço, da taxa e do prazo. Informe seu bairro à unidade escolhida para confirmar a disponibilidade." },
  ],
  primaryLabel: "Escolher uma unidade",
  primaryMessage: "Olá! Vim pela página Farmácia em Sabará e gostaria de consultar preço e disponibilidade.",
};

export const metadata: Metadata = {
  title: { absolute: config.title },
  description: config.description,
  alternates: { canonical: `${SITE_URL}/${config.slug}` },
  openGraph: { title: config.title, description: config.description, url: `${SITE_URL}/${config.slug}`, type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: config.title, description: config.description, images: ["/og.png"] },
};

export default function FarmaciaEmSabaraPage() {
  return <LocalLandingPage config={config} />;
}
