"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useState } from "react";
import BrandLogo from "../BrandLogo";
import ReservaSacola from "../reserva/ReservaSacola";
import { IconFechar, IconLupa, IconMenu, IconPino } from "../reserva/ReservaIcons";
import LojaPicker from "./LojaPicker";
import "./shop.css";
import { abrirSeletorDeLoja } from "./loja-evento";

const LINKS = [
  { href: "/nacoes-unidas/produtos", label: "Produtos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/#unidades-rapidas", label: "Lojas" },
  { href: "/receita", label: "Receita" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega" },
  { href: "/perguntas", label: "Perguntas" },
] as const;

/** Cabeçalho de loja virtual: menu, marca, pino de loja, sacola e busca. Sem JavaScript a busca é um formulário GET comum. */
export default function ShopHeader({ consultaInicial = "" }: { consultaInicial?: string }) {
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [menu]);

  return (
    <>
      <header className="shop-header">
        <button type="button" className="shop-icone shop-menu" aria-label="Abrir menu" aria-expanded={menu} aria-controls="shop-menu-painel" onClick={() => setMenu(true)}>
          <IconMenu size={26} />
        </button>
        <a className="shop-marca" href="/">
          <BrandLogo priority />
          <span>União Farma</span>
        </a>
        <form className="shop-busca" role="search" action="/nacoes-unidas/produtos" method="get">
          <label className="sr-only" htmlFor="shop-busca-q">Buscar produto</label>
          <input id="shop-busca-q" name="q" type="search" defaultValue={consultaInicial} placeholder="Buscar produto, ex.: nivea, listerine" autoComplete="off" enterKeyHint="search" />
          <button type="submit" aria-label="Buscar">
            <IconLupa size={22} />
          </button>
        </form>
        <nav className="shop-links" aria-label="Menu principal">
          {LINKS.slice(0, 4).map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <div className="shop-acoes">
          <button type="button" className="shop-icone" aria-label="Escolher loja" onClick={abrirSeletorDeLoja}>
            <IconPino size={28} />
          </button>
          <ReservaSacola />
        </div>
      </header>

      {menu ? (
        <div className="shop-menu-raiz" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="shop-menu-fundo" aria-label="Fechar o menu" tabIndex={-1} onClick={() => setMenu(false)} />
          <div className="shop-menu-painel" id="shop-menu-painel">
            <div className="shop-menu-topo">
              <strong>Menu</strong>
              <button type="button" className="reserva-icone" aria-label="Fechar o menu" onClick={() => setMenu(false)}>
                <IconFechar size={24} />
              </button>
            </div>
            <ul>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} onClick={() => setMenu(false)}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <LojaPicker />
    </>
  );
}
