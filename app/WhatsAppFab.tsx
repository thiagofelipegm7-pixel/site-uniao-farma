"use client";

import { usePathname } from "next/navigation";
import { buildWhatsAppUrl, getUnitBySlug, UNITS } from "./site-config";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";
import "./whatsapp-fab.css";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.4-9.91 9.83 0 1.73.46 3.43 1.33 4.93L2 22l5.39-1.41A10 10 0 0 0 12.04 21.7C17.5 21.7 22 17.29 22 11.86 22 6.43 17.5 2 12.04 2zm5.76 14.16c-.24.67-1.18 1.22-1.93 1.38-.52.11-1.19.2-3.46-.74-2.9-1.2-4.77-4.13-4.92-4.32-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.26-.29.58-.36.77-.36h.55c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.19-.14.32-.29.49-.14.17-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.72 1.19 1.55 1.93 1.07.95 1.97 1.24 2.24 1.38.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.08 1.56.73 1.82.87.27.13.45.2.51.31.07.12.07.67-.17 1.34z" />
    </svg>
  );
}

function fabTarget(pathname: string) {
  if (pathname.startsWith("/ofertas")) return { href: "#ofertas-whatsapp", external: false };
  if (pathname.startsWith("/receita")) return { href: "#receita-whatsapp", external: false };

  const slug = pathname.replace(/^\//, "").split("/")[0];
  const unit =
    UNITS.find((item) => item.id === slug || item.slug === slug) ||
    (slug ? getUnitBySlug(slug) : undefined);

  if (unit) {
    return {
      href: buildWhatsAppUrl(unit, WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName), {
        campaign: "fab",
        content: `fab_${unit.id}`,
      }),
      external: true,
    };
  }

  if (pathname === "/") return { href: "#whatsapp-lojas", external: false };
  return { href: "/#whatsapp-lojas", external: false };
}

export default function WhatsAppFab() {
  const pathname = usePathname() || "/";
  const target = fabTarget(pathname);

  return (
    <a
      className="whatsapp-fab"
      href={target.href}
      aria-label="Falar no WhatsApp"
      {...(target.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <WhatsAppIcon />
    </a>
  );
}
