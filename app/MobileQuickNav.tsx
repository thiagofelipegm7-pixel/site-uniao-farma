"use client";

import { usePathname } from "next/navigation";

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.2 11.3 12.7 3.8A2.4 2.4 0 0 0 11 3H4.6C3.7 3 3 3.7 3 4.6V11c0 .6.3 1.2.8 1.7l7.5 7.5a2.4 2.4 0 0 0 3.4 0l5.5-5.5a2.4 2.4 0 0 0 0-3.4ZM7.4 8.3a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.4A6.8 6.8 0 0 0 5.2 9.2c0 4.9 5.4 10.5 6.4 11.5.2.2.6.2.8 0 1-1 6.4-6.6 6.4-11.5A6.8 6.8 0 0 0 12 2.4Zm0 9.1A2.4 2.4 0 1 1 12 6.7a2.4 2.4 0 0 1 0 4.8Z"
      />
    </svg>
  );
}

function RecipeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.2 2.5h7.1c.3 0 .6.1.8.3l4.1 4.1c.2.2.3.5.3.8v12.3c0 .8-.7 1.5-1.5 1.5H7.2c-.8 0-1.5-.7-1.5-1.5V4c0-.8.7-1.5 1.5-1.5Zm7.3 1.7v3.1h3.1l-3.1-3.1ZM9 12.1h6v1.5H9V12.1Zm0 3.2h4.2V16.8H9v-1.5Z"
      />
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
