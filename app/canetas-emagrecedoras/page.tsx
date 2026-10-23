import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "canetas-emagrecedoras",
  title: "Canetas Emagrecedoras | União Farma Sabará",
  description: "Informações sobre canetas emagrecedoras (Wegovy, Mounjaro, Ozempic e similares). Consulte estoque, preço e disponibilidade com receita médica nas unidades da União Farma em Sabará.",
  eyebrow: "Em alta no momento",
  heading: "Canetas emagrecedoras na União Farma",
  lead: "Medicamentos injetáveis à base de semaglutida, tirzepatida e similares. Disponíveis sob receita médica com retenção. Consulte a unidade do seu bairro para estoque e condições atuais.",
  bullets: [
    "Wegovy, Poviztra, Mounjaro, Ozempic e outras opções — conforme indicação médica.",
    "Venda somente com receita médica com retenção (válida por até 90 dias).",
    "Confirme preço e estoque no WhatsApp da loja. Farmacêutico disponível para orientação.",
    "Produtos com registro na Anvisa. Desconfie de ofertas irregulares sem receita ou de origem duvidosa.",
  ],
  faqs: [
    { q: "Preciso de receita para comprar?", a: "Sim. Todas as canetas desta classe exigem receita médica com retenção da via pela farmácia. A receita tem validade de até 90 dias." },
    { q: "Quais canetas vocês têm?", a: "Depende do estoque do dia em cada unidade. As principais são Wegovy/Poviztra (semaglutida para obesidade), Mounjaro (tirzepatida) e Ozempic (semaglutida para diabetes). Mande a receita no WhatsApp para confirmar." },
    { q: "Posso usar sem indicação médica?", a: "Não. Esses medicamentos são controlados e devem ser usados apenas com avaliação e acompanhamento de médico. A farmácia não vende sem receita." },
    { q: "Como funciona a consulta de preço?", a: "Escolha a unidade mais próxima, envie a foto da receita (ou receita digital) e o nome do produto no WhatsApp. A equipe responde com disponibilidade e valor do dia." },
  ],
  primaryLabel: "Consultar estoque e preço",
  primaryMessage: "Oi, União Farma {unidade}! Vim pela página de Canetas Emagrecedoras. Quero consultar disponibilidade e preço com receita.",
};

export const metadata: Metadata = {
  title: { absolute: config.title },
  description: config.description,
  alternates: { canonical: `/${config.slug}` },
  openGraph: { title: config.title, description: config.description, url: `${SITE_URL}/${config.slug}`, type: "website", images: ["/og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: config.title, description: config.description, images: ["/og-optimized.jpg"] },
};

export default function CanetasEmagrecedorasPage() {
  return <LocalLandingPage config={config} />;
}
