import type { Metadata } from "next";
import ListaRestrita, { metadadosRestrita, type ParamsLista } from "../ListaRestrita";

export const dynamic = "force-dynamic";

export const metadata: Metadata = metadadosRestrita("receita");

export default async function Page({ searchParams }: { searchParams?: Promise<ParamsLista> }) {
  return <ListaRestrita tipo="receita" params={(await searchParams) ?? {}} />;
}
