import { redirect } from "next/navigation";

/** Agora é a aba Coleções da página Publicidade. */
export default function ColecoesInternoPage() {
  redirect("/interno/publicidade?aba=colecoes");
}
