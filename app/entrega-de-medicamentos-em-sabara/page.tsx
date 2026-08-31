import type { Metadata } from "next";
import LocalLandingPage, { type LocalLandingPageConfig } from "../local-landing-page";
import { SITE_URL } from "../site-config";

const config: LocalLandingPageConfig = {
  slug: "entrega-de-medicamentos-em-sabara",
  title: "Entrega de medicamentos em Sabará | União Farma",
  description: "Consulte a disponibilidade de entrega de medicamentos em Sabará pelo WhatsApp da unidade União Farma mais próxima.",
  eyebrow: "Farmácia com entrega em Sabará",
  heading: "Entrega de medicamentos em Sabará",
  lead: "Informe seu bairro ou endereço para a equipe confirmar se a unidade atende sua região, além de taxa, prazo e forma de pagamento.",
  bullets: [
    "Escolha Nossa Senhora de Fátima, Nações Unidas ou Itacolomi.",
    "Confirme a área atendida antes de finalizar o pedido.",
    "Tire dúvidas sobre medicamentos, higiene, beleza e perfumaria pelo WhatsApp.",
  ],
  faqs: [
    { q: "A União Farma entrega medicamentos em toda Sabará?", a: "Cada unidade possui uma área de atendimento. Envie seu bairro ou endereço pelo WhatsApp para confirmar a disponibilidade, a taxa e o prazo." },
    { q: "Como consultar uma entrega de medicamentos?", a: "Escolha a unidade mais próxima nesta página e envie uma mensagem com seu bairro ou endereço. A equipe confirma as condições no momento do pedido." },
    { q: "Quais formas de pagamento estão disponíveis na entrega?", a: "As formas de pagamento da entrega devem ser confirmadas com a unidade junto com a taxa e o prazo do pedido." },
  ],
  primaryLabel: "Consultar entrega",
  primaryMessage: "Olá! Vim pela página de entrega de medicamentos em Sabará e gostaria de informar meu bairro para confirmar o atendimento.",
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
