import type { Metadata } from "next";
import PublicidadeAbas from "../../components/PublicidadeAbas";
import "../colecoes/colecoes.css";
import "./publicidade.css";

export const metadata: Metadata = {
  title: "Publicidade",
  robots: { index: false, follow: false },
};

export default function PublicidadeInternoPage() {
  return <PublicidadeAbas />;
}
