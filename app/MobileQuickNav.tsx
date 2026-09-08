"use client";

import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/ofertas", label: "Oferta", kind: "ofertas" as const, icon: "/icons/nav/oferta.svg" },
  { href: "/#unidades-rapidas", label: "Lojas", kind: "lojas" as const, icon: "/icons/nav/lojas.svg" },
  { href: "/receita", label: "Receita", kind: "receita" as const, icon: "/icons/nav/receita.svg" },
];

export default function MobileQuickNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="mobile-quick-nav" aria-label="Atalhos do site">
      <div className="mobile-quick-nav-inner">
        {ITEMS.map(({ href, label, kind, icon }) => {
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
                <img src={icon} alt="" width="18" height="18" />
              </span>
              <span className="mqn-label">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
