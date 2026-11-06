import type { Metadata } from "next";
import PainelFotos from "../../components/PainelFotos";

export const metadata: Metadata = {
  title: "Fotos dos produtos",
  robots: { index: false, follow: false },
};

export default function FotosInternoPage() {
  return <PainelFotos />;
}
