"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's current Link runtime breaks production navigation. */

import { useEffect, useRef, useState } from "react";
import { SiteDirectoryLinks } from "./SiteDirectoryLinks";

type ContentPath = "/ofertas" | "/novidades" | "/receita";

const NAV_LINKS: Array<{ href: string; label: string; activePath?: ContentPath }> = [
  { href: "/ofertas", label: "Ofertas", activePath: "/ofertas" },
  { href: "/#unidades-rapidas", label: "Unidades" },
  { href: "/receita", label: "Receita", activePath: "/receita" },
];

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2.02C6.55 2.02 2.1 6.47 2.1 11.96c0 1.75.46 3.45 1.33 4.95L2 22l5.23-1.37a9.9 9.9 0 0 0 4.81 1.23h.01c5.49 0 9.94-4.45 9.94-9.94 0-2.65-1.03-5.15-2.91-7.03A9.9 9.9 0 0 0 12.04 2.02Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 0 1-1.26-4.34c0-4.53 3.69-8.22 8.22-8.22 2.2 0 4.26.86 5.81 2.41a8.17 8.17 0 0 1 2.41 5.81c0 4.53-3.69 8.22-8.22 8.22Zm4.51-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.85-.2-.48-.4-.42-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.46-.6 1.67-1.17.21-.58.21-1.07.14-1.17-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

export function ContentSiteHeader({ activePath }: { activePath: ContentPath }) {
  const linksRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
          <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="52" height="52" />
          <span><strong>União Farma</strong><small>Drogaria e Perfumaria</small></span>
        </a>
        <a className="content-whatsapp-button" href="/#unidades-rapidas" aria-label="Pedir no WhatsApp">
          <WhatsAppIcon />
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
                ×
              </button>
            </div>
            <nav className="content-side-nav" aria-label="Navegação móvel">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={link.activePath === activePath ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a href="/#unidades-rapidas" onClick={() => setMenuOpen(false)}>
                Pedir no WhatsApp
              </a>
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}

export function ContentSiteFooter({ notice = "Preço, estoque e condições devem ser confirmados com a unidade escolhida." }: { notice?: string }) {
  return (
    <footer className="content-footer">
      <div className="section-inner">
        <a className="brand" href="/">
          <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="52" height="52" />
          <span><strong>União Farma</strong><small>Três unidades em Sabará/MG</small></span>
        </a>
        <p>{notice}</p>
        <nav aria-label="Links do rodapé">
          <SiteDirectoryLinks />
        </nav>
      </div>
    </footer>
  );
}
