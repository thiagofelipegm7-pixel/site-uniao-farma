"use client";

import { usePathname } from "next/navigation";
import { buildWhatsAppUrl, getUnitBySlug, UNITS, type Unit } from "./site-config";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";

type Slot = {
  key: string;
  href: string;
  label: string;
  ariaLabel?: string;
  icon: "lojas" | "ofertas" | "receita" | "mapa" | "ligar" | "whatsapp";
  primary?: boolean;
  external?: boolean;
};

function findUnit(pathname: string): Unit | undefined {
  const slug = pathname.replace(/^\//, "").split("/")[0];
  if (!slug) return undefined;
  return UNITS.find((item) => item.id === slug || item.slug === slug) || getUnitBySlug(slug);
}

function Icon({ name }: { name: Slot["icon"] }) {
  if (name === "whatsapp") return <img src="/whatsapp-icon.svg" alt="" width="22" height="22" />;
  if (name === "ofertas") return <img src="/icons/nav/oferta.svg" alt="" width="22" height="22" />;
  if (name === "lojas") return <img src="/icons/nav/lojas.svg" alt="" width="22" height="22" />;
  if (name === "receita") return <img src="/icons/nav/receita.svg" alt="" width="22" height="22" />;
  if (name === "mapa") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function slotsFor(pathname: string): Slot[] {
  const unit = findUnit(pathname);
  if (unit) {
    const message = WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName);
    return [
      { key: "mapa", href: unit.map, label: "Como chegar", icon: "mapa", external: true },
      {
        key: "whatsapp",
        href: buildWhatsAppUrl(unit, message, { campaign: "bottom_bar", content: `bottom_bar_${unit.id}` }),
        label: "WhatsApp",
        ariaLabel: `WhatsApp da loja ${unit.shortName}`,
        icon: "whatsapp",
        primary: true,
        external: true,
      },
      { key: "ligar", href: unit.phoneLink, label: "Ligar", ariaLabel: `Ligar ${unit.phone}`, icon: "ligar" },
    ];
  }

  const onOffers = pathname.startsWith("/ofertas");
  const onRecipe = pathname.startsWith("/receita");
  const whatsappHref = onOffers ? "#ofertas-whatsapp" : onRecipe ? "#receita-whatsapp" : pathname === "/" ? "#unidades-rapidas" : "/#unidades-rapidas";

  return [
    { key: "lojas", href: pathname === "/" ? "#unidades-rapidas" : "/#unidades-rapidas", label: "Lojas", icon: "lojas" },
    {
      key: "whatsapp",
      href: whatsappHref,
      label: "WhatsApp",
      ariaLabel: "WhatsApp: escolher a loja",
      icon: "whatsapp",
      primary: true,
    },
    onOffers
      ? { key: "receita", href: "/receita", label: "Receita", icon: "receita" }
      : { key: "ofertas", href: "/ofertas", label: "Ofertas", icon: "ofertas" },
  ];
}

export default function MobileQuickNav() {
  const pathname = usePathname() || "/";
  const slots = slotsFor(pathname);

  return (
    <nav className="mobile-quick-nav" aria-label="Ações rápidas">
      <div className="mobile-quick-nav-inner">
        {slots.map((slot) => (
          <a
            key={slot.key}
            href={slot.href}
            className={slot.primary ? "mqn-primary" : undefined}
            aria-label={slot.ariaLabel}
            {...(slot.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <span className="mqn-icon">
              <Icon name={slot.icon} />
            </span>
            <span className="mqn-label">{slot.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
