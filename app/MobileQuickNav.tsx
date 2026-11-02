"use client";

import { usePathname } from "next/navigation";
import { buildWhatsAppUrl, getUnitBySlug, UNITS, type Unit } from "./site-config";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";
import { IconCasa, IconCategorias, IconLoja, IconSacola } from "./reserva/ReservaIcons";

type Slot = {
  key: string;
  href: string;
  label: string;
  ariaLabel?: string;
  icon: "lojas" | "ofertas" | "receita" | "mapa" | "ligar" | "whatsapp" | "inicio" | "categorias" | "reserva" | "loja";
  primary?: boolean;
  external?: boolean;
};

function findUnit(pathname: string): Unit | undefined {
  // /nacoes-unidas/produtos é a loja virtual (barra de compra), não a página institucional da loja.
  if (pathname.startsWith("/nacoes-unidas/produtos")) return undefined;
  const slug = pathname.replace(/^\//, "").split("/")[0];
  if (!slug) return undefined;
  return UNITS.find((item) => item.id === slug || item.slug === slug) || getUnitBySlug(slug);
}

function Icon({ name }: { name: Slot["icon"] }) {
  if (name === "inicio") return <IconCasa size={24} />;
  if (name === "categorias") return <IconCategorias size={24} />;
  if (name === "reserva") return <IconSacola size={24} />;
  if (name === "loja") return <IconLoja size={24} />;
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

  // Páginas de compra: Início, Categorias, Reserva e Lojas (como no protótipo). O WhatsApp fica no botão flutuante.
  return [
    { key: "inicio", href: "/", label: "Início", icon: "inicio" },
    { key: "categorias", href: "/nacoes-unidas/produtos", label: "Categorias", icon: "categorias" },
    { key: "reserva", href: "/reserva", label: "Reserva", icon: "reserva" },
    { key: "loja", href: pathname === "/" ? "#unidades-rapidas" : "/#unidades-rapidas", label: "Lojas", icon: "loja" },
  ];
}

function ativo(slot: Slot, pathname: string): boolean {
  if (slot.key === "inicio") return pathname === "/";
  if (slot.key === "categorias") return pathname.startsWith("/nacoes-unidas/produtos");
  if (slot.key === "reserva") return pathname.startsWith("/reserva");
  return false;
}

export default function MobileQuickNav() {
  const pathname = usePathname() || "/";
  const slots = slotsFor(pathname);

  return (
    <nav className="mobile-quick-nav" aria-label="Ações rápidas">
      <div className={slots.length === 4 ? "mobile-quick-nav-inner is-shop" : "mobile-quick-nav-inner"}>
        {slots.map((slot) => (
          <a
            key={slot.key}
            href={slot.href}
            className={slot.primary ? "mqn-primary" : undefined}
            aria-label={slot.ariaLabel}
            aria-current={ativo(slot, pathname) ? "page" : undefined}
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
