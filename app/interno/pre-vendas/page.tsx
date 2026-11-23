import { redirect } from "next/navigation";

/** Agora é uma aba da página Vendas. */
export default function PreVendasPage() {
  redirect("/interno/vendas");
}
