import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "entrega-de-medicamentos-em-sabara",
  title: "Entrega de medicamentos em Sabar\u00e1 | Uni\u00e3o Farma",
  description: "Quer receber em casa? Manda o bairro no WhatsApp da Uni\u00e3o Farma mais perto. A loja confirma se entrega, a taxa e o hor\u00e1rio.",
  eyebrow: "Entrega pela loja do bairro",
  heading: "Entrega de medicamentos em Sabar\u00e1",
  lead: "A gente n\u00e3o promete cidade inteira no site. Cada loja tem a sua \u00e1rea. Manda o endere\u00e7o \u2014 a equipe responde se leva, quando e quanto fica a taxa.",
  bullets: [
    "F\u00e1tima, Na\u00e7\u00f5es Unidas ou Itacolomi: escolha a mais perto.",
    "Confirme bairro, taxa e prazo antes de separar o pedido.",
    "Rem\u00e9dio, higiene e perfumaria entram na mesma conversa.",
  ],
  faqs: [
    { q: "Entregam em toda Sabar\u00e1?", a: "N\u00e3o automaticamente. Cada unidade cobre os bairros ao redor. Manda o endere\u00e7o no WhatsApp para saber se atende." },
    { q: "Como pe\u00e7o a entrega?", a: "Abre o WhatsApp da loja, manda o nome do produto e o bairro. A equipe confirma estoque, taxa e prazo." },
    { q: "Como pago na entrega?", a: "Pix, dinheiro ou cart\u00e3o \u2014 a loja confirma a forma junto com a taxa." },
  ],
  primaryLabel: "Consultar entrega",
  primaryMessage: "Oi, Uni\u00e3o Farma {unidade}! Quero saber se voc\u00eas entregam no meu bairro. Posso mandar o endere\u00e7o?",
  intent: "delivery",
};

export const metadata: Metadata = {
  title: { absolute: config.title },
  description: config.description,
  alternates: { canonical: `${SITE_URL}/${config.slug}` },
  openGraph: { title: config.title, description: config.description, url: `${SITE_URL}/${config.slug}`, type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: config.title, description: config.description, images: ["/og.png"] },
};

export default function EntregaDeMedicamentosEmSabaraPage() {
  return <LocalLandingPage config={config} />;
}
