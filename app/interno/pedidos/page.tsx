import { redirect } from "next/navigation";

/** Agora é uma aba da página Vendas. */
export default function PedidosPage() {
  redirect("/interno/vendas?aba=pedidos");
}
