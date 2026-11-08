import type { Metadata } from "next";
import PainelErros from "../../components/PainelErros";

export const metadata: Metadata = {
  title: "Erros no celular dos clientes",
  robots: { index: false, follow: false },
};

export default function ErrosInternoPage() {
  return <PainelErros />;
}
