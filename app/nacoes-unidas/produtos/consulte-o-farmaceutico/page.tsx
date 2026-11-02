import type { Metadata } from "next";
import ListaRestrita, { metadadosRestrita, type ParamsLista } from "../ListaRestrita";

export const dynamic = "force-dynamic";

export const metadata: Metadata = metadadosRestrita("consulte");

export default async function Page({ searchParams }: { searchParams?: Promise<ParamsLista> }) {
  return <ListaRestrita tipo="consulte" params={(await searchParams) ?? {}} />;
}
