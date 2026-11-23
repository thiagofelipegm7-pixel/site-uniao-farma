import type { ReactNode } from "react";
import NavInterna from "../components/NavInterna";
import "./interno.css";
// Barra lateral (telas largas) e menu do celular: o mesmo layout em todas as telas internas.
import "../components/painel-fotos.css";
import "./polimento.css";

/** Moldura comum das telas internas: barra da equipe no topo e o mesmo fundo, largura e estilo de cabeçalho, cartões e botões. */
export default function InternoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavInterna />
      <div className="interno-corpo">{children}</div>
    </>
  );
}
