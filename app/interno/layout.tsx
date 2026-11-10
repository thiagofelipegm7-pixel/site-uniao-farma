import type { ReactNode } from "react";
import NavInterna from "../components/NavInterna";
import "./interno.css";

/** Moldura comum das telas internas: barra da equipe no topo e o mesmo fundo, largura e estilo de cabeçalho, cartões e botões. */
export default function InternoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavInterna />
      <div className="interno-corpo">{children}</div>
    </>
  );
}
