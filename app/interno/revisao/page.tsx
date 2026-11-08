import type { Metadata } from "next";
import PainelRevisao from "../../components/PainelRevisao";

export const metadata: Metadata = {
  title: "Fila de revisão",
  robots: { index: false, follow: false },
};

export default function RevisaoInternoPage() {
  return <PainelRevisao />;
}
