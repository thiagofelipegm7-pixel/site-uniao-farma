/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos mantêm a navegação estável no Vinext em produção. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import ReservaPagina from "./ReservaPagina";
import { FarmaceuticoCard } from "../visual-fase2";

const TITLE = "Minha reserva | União Farma";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: "Separe seus produtos sem receita e envie a reserva pelo WhatsApp da loja. Pague só no balcão ou na entrega.",
  alternates: { canonical: "/reserva" },
  // Página pessoal (o conteúdo vem do navegador de cada cliente): fora do Google.
  robots: { index: false, follow: false },
};

export default function ReservaRota() {
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />
      <main className="reserva-pagina" id="conteudo">
        <div className="section-inner">
          <ReservaPagina />
          <FarmaceuticoCard />
        </div>
      </main>
      <ContentSiteFooter />
    </>
  );
}
