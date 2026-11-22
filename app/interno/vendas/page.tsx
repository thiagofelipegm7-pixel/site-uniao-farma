import type { Metadata } from "next";
import VendasAbas from "../../components/VendasAbas";
import "./vendas.css";

export const metadata: Metadata = {
  title: "Vendas | Área interna",
  robots: { index: false, follow: false },
};

export default function VendasPage() {
  return <VendasAbas />;
}
