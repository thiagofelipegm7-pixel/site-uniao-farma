"use client";

import { useEffect, useState } from "react";
import { Megaphone, MessageCircle, Package, ShoppingCart, Truck, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { ITENS_NAV_INTERNO } from "../interno/itens-nav";
import MarcaUniao from "../shop/MarcaUniao";
import "./painel-inicio.css";
import "./nav-direcao.css";

const ICONES: Record<(typeof ITENS_NAV_INTERNO)[number]["href"], LucideIcon> = {
  "/interno/fotos": Package,
  "/interno/publicidade": Megaphone,
  "/interno/vendas": ShoppingCart,
  "/interno/entregas": Truck,
  "/interno/crm": MessageCircle,
};

const CHAVE_RECOLHIDA = "nav-interna-recolhida";

/** Menu da área interna: lateral à esquerda em telas largas (recolhível), faixa no topo em telas estreitas. A tela atual fica marcada. */
export default function NavInterna() {
  const caminho = (usePathname() || "").replace(/\/$/, "") || "/";
  const [recolhida, setRecolhida] = useState(false);
  // Celular: a lateral abre por cima da tela, por um botão; fecha ao escolher um item.
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    try {
      setRecolhida(window.localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      // sem armazenamento: começa aberta
    }
  }, []);

  /** Ao passar o mouse (ou focar) num item, baixa a tela de destino antes do clique: a troca de tela quase não espera. */
  function prefetch(href: string) {
    try {
      if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = href;
      document.head.appendChild(l);
    } catch {
      // navegador sem suporte: segue normal
    }
  }

  function alternar() {
    setRecolhida((antes) => {
      const novo = !antes;
      try {
        window.localStorage.setItem(CHAVE_RECOLHIDA, novo ? "1" : "0");
      } catch {
        // sem armazenamento: só nesta visita
      }
      return novo;
    });
  }

  if (caminho.startsWith("/interno/entrar")) return null;
  return (
    <>
    <button type="button" className="nav-interna-abrir" onClick={() => setMenuAberto((v) => !v)} aria-expanded={menuAberto} aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d={menuAberto ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
    </button>
    <nav className={`nav-interna${recolhida ? " nav-interna--recolhida" : ""}${menuAberto ? " nav-interna--mobile-aberta" : ""}`} aria-label="Área interna">
      <a className="nav-interna-marca" href="/interno" aria-label="União Farma, Nações Unidas"><MarcaUniao claro /><small>Nações Unidas</small></a>
      <ul>
        {ITENS_NAV_INTERNO.map((i) => {
          const ativo = caminho === i.href || caminho.startsWith(`${i.href}/`);
          return (
            <li key={i.href}>
              <a href={i.href} aria-current={ativo ? "page" : undefined} title={i.rotulo} onMouseEnter={() => prefetch(i.href)} onFocus={() => prefetch(i.href)} onClick={() => setMenuAberto(false)}>
                {(() => { const I = ICONES[i.href]; return <I className="nav-interna-icone" size={18} strokeWidth={1.75} aria-hidden="true" />; })()}
                <span className="nav-interna-rotulo">{i.rotulo}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <button type="button" className="nav-interna-recolher" onClick={alternar} aria-expanded={!recolhida} aria-label={recolhida ? "Expandir menu" : "Recolher menu"}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={recolhida ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} /></svg>
        <span className="nav-interna-rotulo">Recolher</span>
      </button>
    </nav>
    </>
  );
}
