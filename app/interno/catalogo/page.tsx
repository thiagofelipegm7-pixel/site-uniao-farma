import type { Metadata } from "next";
import PainelCatalogo from "../../components/PainelCatalogo";

export const metadata: Metadata = {
  title: "Catálogo e sincronização",
  robots: { index: false, follow: false },
};

export default function CatalogoInternoPage() {
  return <PainelCatalogo />;
}
