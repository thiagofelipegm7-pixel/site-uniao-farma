import type { Metadata } from "next";
import "../shop/shop.css";
import ReservaFluxo from "./ReservaFluxo";

const TITLE = "Minha cesta | União Farma";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: "Monte a sua cesta de produtos sem receita e envie o pedido pelo WhatsApp da loja. Pague só no balcão ou na entrega.",
  alternates: { canonical: "/reserva" },
  // Página pessoal (o conteúdo vem do navegador de cada cliente): fora do Google.
  robots: { index: false, follow: false },
};

export default function ReservaRota() {
  return <ReservaFluxo />;
}
