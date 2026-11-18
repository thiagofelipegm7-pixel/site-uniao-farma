import type { Metadata } from "next";
import PainelPedidos from "../../components/PainelPedidos";

export const metadata: Metadata = {
  title: "Pedidos | Área interna",
  robots: { index: false, follow: false },
};

export default function PedidosPage() {
  return <PainelPedidos />;
}
