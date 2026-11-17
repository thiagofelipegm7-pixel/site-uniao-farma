import type { Metadata } from "next";
import PreVendasPainel from "../../components/PreVendasPainel";

export const metadata: Metadata = {
  title: "Pré-vendas | Área interna",
  robots: { index: false, follow: false },
};

export default function PreVendasPage() {
  return <PreVendasPainel />;
}
