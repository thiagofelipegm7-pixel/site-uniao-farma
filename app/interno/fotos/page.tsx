import type { Metadata } from "next";
import PainelFotos from "../../components/PainelFotos";

export const metadata: Metadata = {
  title: "Fotos dos produtos",
  robots: { index: false, follow: false },
};

export default function FotosInternoPage() {
  return <PainelFotos modo="produtos" descricao="Estoque do PC, nomes, categorias e ajustes do que aparece no site. As fotos ficam na página Fotos." />;
}
