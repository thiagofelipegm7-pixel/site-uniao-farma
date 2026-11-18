import type { Metadata } from "next";
import PainelRecompra from "../../components/PainelRecompra";

export const metadata: Metadata = {
  title: "Recompra | Área interna",
  robots: { index: false, follow: false },
};

export default function RecompraPage() {
  return <PainelRecompra />;
}
