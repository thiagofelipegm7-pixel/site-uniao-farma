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

const ITEMS = [
  { href: "/ofertas", label: "Ofertas", match: (path: string) => path.startsWith("/ofertas"), Icon: TagIcon },
  {
    href: "/#unidades-rapidas",
    label: "Unidades",
    match: (path: string) =>
      path === "/" ||
      path.startsWith("/fatima") ||
      path.startsWith("/nacoes-unidas") ||
      path.startsWith("/itacolomi") ||
      path.startsWith("/farmacia"),
    Icon: PinIcon,
  },
  { href: "/receita", label: "Receita", match: (path: string) => path.startsWith("/receita"), Icon: RecipeIcon },
] as const;

export default function MobileQuickNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="mobile-quick-nav" aria-label="Atalhos do site">
      <div className="mobile-quick-nav-inner">
        {ITEMS.map(({ href, label, match, Icon }) => {
          const active = match(pathname);
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
