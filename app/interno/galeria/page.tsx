import { redirect } from "next/navigation";

/** A página Fotos virou Publicidade (a aba pedida segue na URL). */
export default async function GaleriaInternoPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  redirect(aba === "colecoes" || aba === "banners" ? `/interno/publicidade?aba=${aba}` : "/interno/publicidade");
}
