import { redirect } from "next/navigation";

/** Agora é a aba Promoções da página Publicidade. */
export default function PromocoesInternoPage() {
  redirect("/interno/publicidade?aba=promocoes");
}
