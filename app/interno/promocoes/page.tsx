import type { Metadata } from "next";
import PainelPromocoes from "../../components/PainelPromocoes";
import PainelLevePague from "../../components/PainelLevePague";

export const metadata: Metadata = {
  title: "Promoções",
  robots: { index: false, follow: false },
};

export default function PromocoesInternoPage() {
  return <><PainelLevePague /><PainelPromocoes modo="destinos" /></>;
}
