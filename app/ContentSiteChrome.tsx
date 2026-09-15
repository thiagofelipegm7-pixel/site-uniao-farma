"use client";

/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BrandLogo from "./BrandLogo";

type ContentPath = "/ofertas" | "/novidades" | "/receita";

const NAV_LINKS: Array<{ href: string; label: string; activePath?: ContentPath }> = [
  { href: "/ofertas", label: "Ofertas", activePath: "/ofertas" },
  { href: "/#unidades-rapidas", label: "Unidades" },
  { href: "/receita", label: "Receita", activePath: "/receita" },
  { href: "/novidades", label: "Novidades", activePath: "/novidades" },
  { href: "/perguntas", label: "Perguntas" },
  { href: "/encarte", label: "Encarte" },
];

const HEADER_CTA: Record<ContentPath, { href: string; label: string; ariaLabel: string }> = {
  "/ofertas": {
    href: "#ofertas-whatsapp",
    label: "Consultar oferta",
    ariaLabel: "Consultar oferta no WhatsApp da loja",
  },
  "/receita": {
    href: "#receita-whatsapp",
    label: "Enviar receita",
    ariaLabel: "Enviar receita no WhatsApp da loja",
  },
  "/novidades": {
    href: "/#unidades-rapidas",
    label: "Pedir no WhatsApp",
    ariaLabel: "Pedir no WhatsApp",
  },
};

export function ContentSiteHeader({ activePath }: { activePath: ContentPath }) {
  const linksRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = HEADER_CTA[activePath];
  const hideHeaderWhatsApp = activePath === "/ofertas" || activePath === "/receita";

  useEffect(() => {
    const links = linksRef.current;
    if (links && links.scrollWidth > links.clientWidth) links.scrollLeft = links.scrollWidth;
  }, [activePath]);

  useEffect(() => {
    if (!menuOpen) return;

    const menuButton = menuButtonRef.current;
    const background = [
      document.getElementById("conteudo"),
      document.querySelector(".uf-footer"),
      document.querySelector(".mobile-quick-nav"),
      document.querySelector(".whatsapp-fab"),
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);
    background.forEach((node) => node.setAttribute("inert", ""));

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 20);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const closeOnDesktop = () => {
      if (window.innerWidth > 860) setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeOnDesktop);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      background.forEach((node) => node.removeAttribute("inert"));
      menuButton?.focus();
    };
  }, [menuOpen]);

  const mobileMenu = menuOpen
    ? createPortal(
        <>
          <button type="button" className="content-menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <aside ref={drawerRef} className="content-menu-drawer" id="content-menu-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="content-menu-drawer-header">
              <span>Menu</span>
              <button ref={closeButtonRef} type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">{"×"}</button>
            </div>
            <nav className="content-side-nav" aria-label="Navegação móvel">
              {NAV_LINKS.map((link) => (
                <a
                  key={`drawer-${link.href}`}
                  className="nav-plain-label"
                  href={link.href}
                  aria-current={link.activePath === activePath ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </aside>
        </>,
        document.body,
      )
    : null;

  return (
    <header className="content-header" data-content-path={activePath}>
      <nav className="content-nav" aria-label="Menu principal">
        <a className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <BrandLogo />
          <span><strong>{"União Farma"}</strong><small>Drogaria e Perfumaria</small></span>
        </a>
        {hideHeaderWhatsApp ? null : (
          <a className="content-header-cta" href={cta.href} aria-label={cta.ariaLabel}>
            <img src="/whatsapp-icon.svg" alt="" width="24" height="24" aria-hidden="true" />
            <span>{cta.label}</span>
          </a>
        )}
        <button
          ref={menuButtonRef}
          className="content-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="content-menu-drawer"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="content-menu-icon" aria-hidden="true"><span /><span /><span /></span>
          <span className="content-menu-label">{menuOpen ? "Fechar" : "Menu"}</span>
        </button>
        <div className="content-nav-links" ref={linksRef}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} className="nav-plain-label" href={link.href} aria-current={link.activePath === activePath ? "page" : undefined}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>
      {mobileMenu}
    </header>
  );
}

export function ContentSiteFooter(props: { notice?: string }) {
  void props.notice;
  return null;
}
