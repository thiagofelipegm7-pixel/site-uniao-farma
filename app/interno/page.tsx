import type { Metadata } from "next";
import PainelInicio from "../components/PainelInicio";

export const metadata: Metadata = {
  title: "Área interna",
  robots: { index: false, follow: false },
};

export default function InternoInicioPage() {
  return <PainelInicio />;
}
