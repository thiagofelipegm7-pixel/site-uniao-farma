"use client";

import { usePathname } from "next/navigation";

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.8 10.4V5.2A1.4 1.4 0 0 1 5.2 3.8h5.2c.4 0 .7.1 1 .4l8.4 8.4a1.4 1.4 0 0 1 0 2L12.6 21a1.4 1.4 0 0 1-2 0L3.8 12.8a1.4 1.4 0 0 1-.4-1V10.4z" />
      <circle cx="8.1" cy="8.1" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6.4-5.8 6.4-11.1A6.4 6.4 0 0 0 5.6 9.9C5.6 15.2 12 21 12 21z" />
      <circle cx="12" cy="9.8" r="2.15" />
    </svg>
  );
}

function RecipeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.6h7.2L20 9.4v11c0 .6-.5 1-1 1H7c-.6 0-1-.4-1-1V4.6c0-.6.4-1 1-1z" />
      <path d="M14.2 3.6V9H20M8.6 13h6.8M8.6 16.4h4.6" />
    </svg>
  );
}

const ITEMS = [
  { href: "/ofertas", label: "Oferta", kind: "ofertas" as const, Icon: TagIcon },
  { href: "/#unidades-rapidas", label: "Lojas", kind: "lojas" as const, Icon: PinIcon },
  { href: "/receita", label: "Receita", kind: "receita" as const, Icon: RecipeIcon },
];

export default function MobileQuickNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="mobile-quick-nav" aria-label="Atalhos do site">
      <div className="mobile-quick-nav-inner">
        {ITEMS.map(({ href, label, kind, Icon }) => {
          const active =
            kind === "ofertas"
              ? pathname.startsWith("/ofertas")
              : kind === "receita"
                ? pathname.startsWith("/receita")
                : pathname.startsWith("/fatima") ||
                  pathname.startsWith("/nacoes-unidas") ||
                  pathname.startsWith("/itacolomi") ||
                  pathname.startsWith("/nossa-senhora-de-fatima") ||
                  pathname.startsWith("/farmacia");

          return (
            <a
              key={label}
              href={href}
              className={active ? "is-primary" : undefined}
              aria-current={active ? "page" : undefined}
            >
              <span className="mqn-icon">
                <Icon />
              </span>
              <span className="mqn-label">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
