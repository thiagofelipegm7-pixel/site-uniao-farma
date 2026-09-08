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

function WhatsAppNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.4-9.91 9.83 0 1.73.46 3.43 1.33 4.93L2 22l5.39-1.41A10 10 0 0 0 12.04 21.7C17.5 21.7 22 17.29 22 11.86 22 6.43 17.5 2 12.04 2zm5.76 14.16c-.24.67-1.18 1.22-1.93 1.38-.52.11-1.19.2-3.46-.74-2.9-1.2-4.77-4.13-4.92-4.32-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.26-.29.58-.36.77-.36h.55c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.14.32-.29.49-.14.17-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.72 1.19 1.55 1.93 1.07.95 1.97 1.24 2.24 1.38.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.08 1.56.73 1.82.87.27.13.45.2.51.31.07.12.07.67-.17 1.34z" />
    </svg>
  );
}

const ITEMS = [
  { href: "/ofertas", label: "Oferta", kind: "ofertas" as const, Icon: TagIcon },
  { href: "/#unidades-rapidas", label: "Lojas", kind: "lojas" as const, Icon: PinIcon },
  { href: "/receita", label: "Receita", kind: "receita" as const, Icon: RecipeIcon },
  { href: "/#whatsapp-lojas", label: "Zap", kind: "whatsapp" as const, Icon: WhatsAppNavIcon },
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
                : kind === "lojas"
                  ? pathname.startsWith("/fatima") ||
                    pathname.startsWith("/nacoes-unidas") ||
                    pathname.startsWith("/itacolomi") ||
                    pathname.startsWith("/farmacia")
                  : false;
          const className = [active ? "is-primary" : "", kind === "whatsapp" ? "is-whatsapp" : ""]
            .filter(Boolean)
            .join(" ") || undefined;

          return (
            <a
              key={label}
              href={href}
              className={className}
              aria-current={active ? "page" : undefined}
              aria-label={kind === "whatsapp" ? "WhatsApp" : label}
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
