"use client";

import { usePathname } from "next/navigation";

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 3.5 20.5 11.5a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.5 12.5V3.5h9z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function RecipeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4M9 12h6M9 16h4" />
    </svg>
  );
}

function WhatsAppNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.4-9.91 9.83 0 1.73.46 3.43 1.33 4.93L2 22l5.39-1.41A10 10 0 0 0 12.04 21.7C17.5 21.7 22 17.29 22 11.86 22 6.43 17.5 2 12.04 2zm5.76 14.16c-.24.67-1.18 1.22-1.93 1.38-.52.11-1.19.2-3.46-.74-2.9-1.2-4.77-4.13-4.92-4.32-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.26-.29.58-.36.77-.36h.55c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.14.32-.29.49-.14.17-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.72 1.19 1.55 1.93 1.07.95 1.97 1.24 2.24 1.38.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.08 1.56.73 1.82.87.27.13.45.2.51.31.07.12.07.67-.17 1.34z" />
    </svg>
  );
}

const ITEMS = [
  { href: "/ofertas", label: "Ofertas", kind: "ofertas" as const, Icon: TagIcon },
  { href: "/#unidades-rapidas", label: "Lojas", kind: "lojas" as const, Icon: PinIcon },
  { href: "/receita", label: "Receita", kind: "receita" as const, Icon: RecipeIcon },
  { href: "/#whatsapp-lojas", label: "WhatsApp", kind: "whatsapp" as const, Icon: WhatsAppNavIcon },
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
            <a key={label} href={href} className={className} aria-current={active ? "page" : undefined}>
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
