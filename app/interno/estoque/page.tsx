import type { Metadata } from "next";
import PainelEstoque from "../../components/PainelEstoque";

export const metadata: Metadata = {
  title: "Alertas de estoque",
  robots: { index: false, follow: false },
};

export default function EstoqueInternoPage() {
  return <PainelEstoque />;
}
