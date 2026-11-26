import { redirect } from "next/navigation";

export default function CestasPage() {
  redirect("/interno/vendas?aba=cestas");
}
