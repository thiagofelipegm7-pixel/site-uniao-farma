import type { Metadata } from "next";
import HomePage from "./HomePage";
import { dadosDaHome } from "./shop/destaques-servidor";
import { SITE_URL } from "./site-config";

const HOME_TITLE = "Drogaria e Farmácia em Sabará com entrega | União Farma";
const HOME_DESCRIPTION =
  "Loja Nações Unidas, na Rua Inglaterra, 162, em Sabará. Aberta todos os dias, até domingo de manhã. Peça pelo WhatsApp e consulte a entrega no seu bairro.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: `${SITE_URL}/`,
    type: "website",
    images: ["/og-instagram-optimized.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/og-instagram-optimized.jpg"],
  },
};

// Produtos, ofertas, banners e chips são escolhidos aqui, no servidor, para irem no HTML (robôs de IA e buscadores sem JavaScript veem tudo)
// e para a página não mudar de altura quando eles chegam. Falha em uma parte: o componente busca no navegador, como antes.
export default async function Page() {
  const dados = await dadosDaHome();
  return <HomePage dados={dados} />;
}
