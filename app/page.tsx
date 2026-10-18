import type { Metadata } from "next";
import HomePage from "./HomePage";
import { SITE_URL } from "./site-config";

const HOME_TITLE = "Farmácia em Sabará com entrega | União Farma";
const HOME_DESCRIPTION =
  "3 lojas em Sabará: Fátima, Nações Unidas e Itacolomi. Aberta todos os dias, até domingo de manhã. Peça pelo WhatsApp e consulte a entrega no seu bairro.";

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

export default function Page() {
  return <HomePage />;
}
