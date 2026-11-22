import type { Metadata } from "next";
import ColecoesPainel from "../../components/ColecoesPainel";
import "./colecoes.css";

export const metadata: Metadata = {
  title: "Coleções de fotos",
  robots: { index: false, follow: false },
};

export default function ColecoesInternoPage() {
  return <ColecoesPainel />;
}
