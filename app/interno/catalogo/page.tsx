import type { Metadata } from "next";
import PainelCatalogo from "../../components/PainelCatalogo";

export const metadata: Metadata = {
  title: "Estoque da loja",
  robots: { index: false, follow: false },
};

export default function CatalogoInternoPage() {
  return <PainelCatalogo />;
}
