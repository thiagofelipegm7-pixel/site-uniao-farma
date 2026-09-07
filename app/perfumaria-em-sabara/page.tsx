import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "perfumaria-em-sabara",
  title: "Perfumaria em Sabará | União Farma",
  description: "Shampoo, creme, higiene e cuidado de pele nas três União Farma de Sabará. Manda o nome ou uma foto no WhatsApp da loja.",
  eyebrow: "Beleza e higiene no bairro",
  heading: "Perfumaria em Sabará, sem fila de aplicativo",
  lead: "Manda o nome da marca ou uma foto da embalagem. A loja diz se tem, o preço de hoje e se dá para separar ou entregar.",
  bullets: [
    "Pele, cabelo, higiene e rotina do bebê.",
    "Ofertas da semana no Instagram e confirmação na loja.",
    "Estoque muda no dia — por isso a resposta vem do WhatsApp.",
  ],
  faqs: [
    { q: "Onde tem perfumaria da União Farma?", a: "Nas três lojas: Fátima, Nações Unidas e Itacolomi. Escolhe a mais perto." },
    { q: "Posso mandar foto do produto?", a: "Pode. Foto ou nome no WhatsApp. A equipe confere marca, tamanho, preço e se tem hoje." },
    { q: "Perfumaria também entrega?", a: "Se a loja atender o seu bairro, sim. Confirma taxa e prazo na mesma conversa." },
  ],
  primaryLabel: "Consultar perfumaria",
  primaryMessage: "Oi, União Farma {unidade}! Quero consultar um produto de perfumaria ou higiene. Posso mandar o nome?",
};

export const metadata: Metadata = {
  title: { absolute: config.title },
  description: config.description,
  alternates: { canonical: `${SITE_URL}/${config.slug}` },
  openGraph: { title: config.title, description: config.description, url: `${SITE_URL}/${config.slug}`, type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: config.title, description: config.description, images: ["/og.png"] },
};

export default function PerfumariaEmSabaraPage() {
  return <LocalLandingPage config={config} />;
}
