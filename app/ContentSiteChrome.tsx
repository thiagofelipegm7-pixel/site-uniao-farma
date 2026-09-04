"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's current Link runtime breaks production navigation. */

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
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02ZM12.04 20.13h-.01a8.21 8.21 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Z" />
    </svg>
  );
}

export function ContentSiteHeader({ activePath }: { activePath: ContentPath }) {
  return (
    <header className="content-header">
      <nav className="content-nav" aria-label="Menu principal">
        <a className="brand" href="/">
          <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="52" height="52" />
          <span><strong>União Farma</strong><small>Drogaria e Perfumaria</small></span>
        </a>
        <a className="content-whatsapp-button" href="/#unidades-rapidas" aria-label="Pedir no WhatsApp">
          <WhatsAppIcon />
        </a>
        <div className="content-nav-links">
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
