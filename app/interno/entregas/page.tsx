import type { Metadata } from "next";
import PainelEntregas from "../../components/PainelEntregas";

export const metadata: Metadata = {
  title: "Entregas | Área interna",
  robots: { index: false, follow: false },
};

export default function EntregasPage() {
  return <PainelEntregas />;
}
