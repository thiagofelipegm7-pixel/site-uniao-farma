import type { Metadata } from "next";
import ListaRestrita from "../ListaRestrita";
import { metadadosRestrita } from "../restritos-meta";

export const metadata: Metadata = metadadosRestrita("consulte");

export default function Page() {
  return <ListaRestrita tipo="consulte" />;
}
