import type { Metadata } from "next";
import ListaRestrita from "../ListaRestrita";
import { metadadosRestrita } from "../restritos-meta";

export const metadata: Metadata = metadadosRestrita("receita");

export default function Page() {
  return <ListaRestrita tipo="receita" />;
}
