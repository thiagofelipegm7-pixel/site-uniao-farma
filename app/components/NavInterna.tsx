"use client";

import { usePathname } from "next/navigation";
import { ITENS_NAV_INTERNO } from "../interno/itens-nav";
import "./painel-inicio.css";

/** Barra única no topo de todas as telas internas (some só na tela de entrar). Rola de lado no celular; a tela atual fica marcada. */
export default function NavInterna() {
  const caminho = (usePathname() || "").replace(/\/$/, "") || "/";
  if (caminho.startsWith("/interno/entrar")) return null;
  return (
    <nav className="nav-interna" aria-label="Área interna">
      <ul>
        {ITENS_NAV_INTERNO.map((i) => {
          const ativo = caminho === i.href || caminho.startsWith(`${i.href}/`);
          return (
            <li key={i.href}>
              <a href={i.href} aria-current={ativo ? "page" : undefined}>{i.rotulo}</a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
