import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "farmacia-em-sabara",
  title: "Farmácia em Sabará | União Farma",
  description: "Três drogarias da União Farma em Sabará: Fátima, Nações Unidas e Itacolomi. Consulte remédio, preço e entrega no WhatsApp da loja do seu bairro.",
  eyebrow: "Farmácia de rua em Sabará",
  heading: "Farmácia em Sabará, pertinho de casa",
  lead: "Não é um site de compra. É a loja do bairro respondendo no WhatsApp: se tem, quanto custa e se dá para entregar hoje.",
  bullets: [
    "Três endereços com horário, telefone e rota no Maps.",
    "Genérico, similar, referência, higiene e perfumaria — estoque do dia.",
    "Farmacêutico no balcão e conversa direta com a unidade.",
  ],
  faqs: [
    { q: "Onde tem União Farma em Sabará?", a: "Em Nossa Senhora de Fátima, Nações Unidas e Itacolomi. Escolhe a loja mais perto e abre o WhatsApp dela." },
    { q: "Como saber o preço?", a: "Manda o nome e a dosagem no WhatsApp da unidade. A resposta é do estoque de hoje, não de uma lista congelada." },
    { q: "Fazem entrega?", a: "Depende do bairro e da loja. Informa o endereço que a equipe fala taxa, prazo e se atende." },
  ],
  primaryLabel: "Escolher uma unidade",
  primaryMessage: "Oi, União Farma {unidade}! Vim pela página Farmácia em Sabará. Quero consultar um produto.",
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
