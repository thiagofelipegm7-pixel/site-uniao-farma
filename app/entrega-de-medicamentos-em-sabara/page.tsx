import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "entrega-de-medicamentos-em-sabara",
  title: "Entrega de medicamentos em Sabará | União Farma",
  description: "Quer receber em casa? Manda o bairro no WhatsApp da União Farma mais perto. A loja confirma se entrega, a taxa e o horário.",
  eyebrow: "Entrega pela loja do bairro",
  heading: "Entrega de medicamentos em Sabará",
  lead: "A gente não promete cidade inteira no site. Cada loja tem a sua área. Manda o endereço — a equipe responde se leva, quando e quanto fica a taxa.",
  bullets: [
    "Fátima, Nações Unidas ou Itacolomi: escolha a mais perto.",
    "Confirme bairro, taxa e prazo antes de separar o pedido.",
    "Remédio, higiene e perfumaria entram na mesma conversa.",
  ],
  faqs: [
    { q: "Entregam em toda Sabará?", a: "Não automaticamente. Cada unidade cobre os bairros ao redor. Manda o endereço no WhatsApp para saber se atende." },
    { q: "Como peço a entrega?", a: "Abre o WhatsApp da loja, manda o nome do produto e o bairro. A equipe confirma estoque, taxa e prazo." },
    { q: "Como pago na entrega?", a: "Pix, dinheiro ou cartão — a loja confirma a forma junto com a taxa." },
  ],
  primaryLabel: "Consultar entrega",
  primaryMessage: "Oi, União Farma {unidade}! Quero saber se vocês entregam no meu bairro. Posso mandar o endereço?",
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
