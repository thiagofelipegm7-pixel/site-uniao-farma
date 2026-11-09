import type { Metadata } from "next";
import PainelPromocoes from "../../components/PainelPromocoes";

export const metadata: Metadata = {
  title: "Promoções",
  robots: { index: false, follow: false },
};

export default function PromocoesInternoPage() {
  return <PainelPromocoes />;
}
