import { redirect } from "next/navigation";

/** Agora é uma aba da página Vendas. */
export default function RecompraPage() {
  redirect("/interno/vendas?aba=recompra");
}
