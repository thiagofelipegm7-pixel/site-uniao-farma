"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's current Link runtime breaks production navigation. */

import { useEffect, useRef, useState } from "react";

type ContentPath = "/ofertas" | "/novidades" | "/receita";

const NAV_LINKS: Array<{ href: string; label: string; activePath?: ContentPath }> = [
  { href: "/ofertas", label: "Ofertas", activePath: "/ofertas" },
  { href: "/#unidades-rapidas", label: "Unidades" },
  { href: "/receita", label: "Receita", activePath: "/receita" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = HEADER_CTA[activePath];

  useEffect(() => {
    const links = linksRef.current;
    if (links && links.scrollWidth > links.clientWidth) links.scrollLeft = links.scrollWidth;
  }, [activePath]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="content-header">
      <nav className="content-nav" aria-label="Menu principal">
        <a className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <img src="/icon-192.png" alt="Logo da Uni\u00e3o Farma" width="52" height="52" decoding="async" />
          <span><strong>Uni\u00e3o Farma</strong><small>Drogaria e Perfumaria</small></span>
        </a>
        <a className="content-header-cta" href={cta.href} aria-label={cta.ariaLabel}>
          <img src="/whatsapp-icon.svg" alt="" width="24" height="24" aria-hidden="true" />
          <span>{cta.label}</span>
        </a>
        <button
          className="content-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="content-menu-drawer"
          aria-label={menuOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="content-menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="content-menu-label">{menuOpen ? "Fechar" : "Menu"}</span>
        </button>
        <div className="content-nav-links" ref={linksRef}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.activePath === activePath ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>
      {menuOpen && (
        <>
          <button
            type="button"
            className="content-menu-backdrop"
            aria-label="Fechar menu lateral"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="content-menu-drawer" id="content-menu-drawer" aria-label="Menu lateral">
            <div className="content-menu-drawer-header">
              <span>Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu lateral">
                \u00d7
              </button>
            </div>
            <nav className="content-side-nav" aria-label="Navega\u00e7\u00e3o m\u00f3vel">
              {NAV_LINKS.map((link) => (
                <a
                  key={`drawer-${link.href}`}
                  href={link.href}
                  aria-current={link.activePath === activePath ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}

export function ContentSiteFooter(_props: { notice?: string }) {
  return null;
}
