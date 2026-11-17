import type { Metadata } from "next";
import PainelInicio from "../components/PainelInicio";

export const metadata: Metadata = {
  title: "Área interna | União Farma",
  robots: { index: false, follow: false },
};

export default function InternoPage() {
  return <PainelInicio />;
}
