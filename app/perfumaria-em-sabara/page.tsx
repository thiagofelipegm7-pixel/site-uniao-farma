import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "perfumaria-em-sabara",
  title: "Perfumaria em Sabará | União Farma",
  description: "Encontre perfumaria, beleza, higiene pessoal e cuidados para cabelos em três unidades da União Farma em Sabará/MG.",
  eyebrow: "Beleza e perfumaria em Sabará",
  heading: "Perfumaria em Sabará para seus cuidados",
  lead: "Consulte marcas, apresentações e disponibilidade de produtos de beleza, higiene, cabelos e cuidados pessoais pelo WhatsApp.",
  bullets: [
    "Perfumaria, cuidados para pele, rosto e corpo.",
    "Produtos para cabelos, higiene pessoal, mamãe e bebê.",
    "Confirmação de marcas e estoque diretamente com a unidade.",
  ],
  faqs: [
    { q: "Onde encontrar perfumaria em Sabará?", a: "A União Farma oferece atendimento de perfumaria nas unidades de Nossa Senhora de Fátima, Nações Unidas e Itacolomi. Consulte a unidade mais conveniente." },
    { q: "Posso consultar um produto de beleza pelo WhatsApp?", a: "Sim. Envie o nome ou uma foto do produto para a unidade escolhida e confirme marcas, apresentações, preço e disponibilidade." },
    { q: "A perfumaria também tem entrega?", a: "A disponibilidade de entrega depende do bairro, endereço, taxa e prazo. Confirme as condições diretamente com a unidade." },
  ],
  primaryLabel: "Consultar perfumaria",
  primaryMessage: "Olá! Vim pela página de perfumaria em Sabará e gostaria de consultar um produto de beleza ou cuidado pessoal.",
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
