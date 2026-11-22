import { redirect } from "next/navigation";

/** A tela de coleções agora é uma aba da página única de fotos. */
export default function ColecoesInternoPage() {
  redirect("/interno/galeria?aba=colecoes");
}
