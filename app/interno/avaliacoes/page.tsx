import { redirect } from "next/navigation";

/** Agora é uma aba da página Vendas. */
export default function AvaliacoesPage() {
  redirect("/interno/vendas?aba=avaliacoes");
}
