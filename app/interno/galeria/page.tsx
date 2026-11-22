import type { Metadata } from "next";
import FotosAbas from "../../components/FotosAbas";
import "../colecoes/colecoes.css";
import "./galeria.css";

export const metadata: Metadata = {
  title: "Fotos",
  robots: { index: false, follow: false },
};

export default function FotosInternoPage() {
  return <FotosAbas />;
}
