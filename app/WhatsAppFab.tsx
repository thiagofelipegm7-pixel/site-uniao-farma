"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { buildWhatsAppUrl, getUnitBySlug, LOJAS_PUBLICAS, UNITS } from "./site-config";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";
import LogoWhatsApp from "./LogoWhatsApp";
import "./whatsapp-fab.css";

function fabTarget(pathname: string) {
  if (pathname.startsWith("/ofertas")) return { href: "#ofertas-whatsapp", external: false };
  if (pathname.startsWith("/receita")) return { href: "#receita-whatsapp", external: false };

  const slug = pathname.replace(/^\//, "").split("/")[0];
  const unit =
    UNITS.find((item) => item.id === slug || item.slug === slug) ||
    (slug ? getUnitBySlug(slug) : undefined);

  if (unit) {
    // Loja que ainda não vende pelo site: contato geral, sem "pedir".
    const geral = !LOJAS_PUBLICAS.includes(unit.id);
    return {
      geral,
      href: buildWhatsAppUrl(unit, geral ? "Oi, União Farma!" : WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName), {
        campaign: "fab",
        content: `fab_${unit.id}`,
      }),
      external: true,
      unitName: unit.shortName,
    };
  }

  if (pathname === "/") return { href: "#unidades-rapidas", external: false };
  return { href: "/#unidades-rapidas", external: false };
}

export default function WhatsAppFab() {
  const pathname = usePathname() || "/";
  const target = fabTarget(pathname);

  const unitName = "unitName" in target ? target.unitName : undefined;
  const geral = "geral" in target ? target.geral : false;
  // Nas páginas de loja, a barra fixa só aparece depois que o botão da própria página sai da tela.
  const [inPageCtaVisible, setInPageCtaVisible] = useState(Boolean(unitName));

  useEffect(() => {
    if (!unitName) return;
    const cta = document.querySelector(".neighborhood-actions .button-whatsapp");
    if (!cta || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setInPageCtaVisible(false));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => setInPageCtaVisible(entry.isIntersecting), {
      rootMargin: "0px 0px -120px 0px",
    });
    observer.observe(cta);
    return () => observer.disconnect();
  }, [unitName, pathname]);

  const hidden = Boolean(unitName) && inPageCtaVisible;

  // Telas internas da equipe não mostram o botão dos clientes.
  if (pathname.startsWith("/interno")) return null;

  return (
    <a
      className={`whatsapp-fab${unitName ? " whatsapp-fab-unit" : ""}${hidden ? " is-hidden" : ""}`}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      href={target.href}
      aria-label={unitName ? `${geral ? "Falar" : "Pedir"} no WhatsApp da loja ${unitName}` : "Falar no WhatsApp"}
      {...(target.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <LogoWhatsApp size={30} cor="atual" />
      {unitName ? <span className="whatsapp-fab-label">{geral ? "Falar no WhatsApp da loja" : "Pedir no WhatsApp da loja"}</span> : null}
    </a>
  );
}
