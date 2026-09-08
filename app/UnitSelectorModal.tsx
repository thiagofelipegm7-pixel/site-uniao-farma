"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "./analytics";
import type { SelectorIntent } from "./home-chrome";
import { WhatsAppIcon } from "./home-chrome";
import { trackWhatsAppClick } from "./metrics";
import { buildWhatsAppUrl, UNITS } from "./site-config";

export default function UnitSelectorModal({
  intent,
  onClose,
}: {
  intent: SelectorIntent | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!intent) return;

    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("conteudo")?.setAttribute("inert", "");
    document.querySelector(".site-header")?.setAttribute("inert", "");
    document.querySelector(".mobile-quick-nav")?.setAttribute("inert", "");
    document.querySelector(".whatsapp-fab")?.setAttribute("inert", "");

    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus();
    }, 20);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => !node.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.getElementById("conteudo")?.removeAttribute("inert");
      document.querySelector(".site-header")?.removeAttribute("inert");
      document.querySelector(".mobile-quick-nav")?.removeAttribute("inert");
      document.querySelector(".whatsapp-fab")?.removeAttribute("inert");
      window.removeEventListener("keydown", onKeyDown);
      lastFocusRef.current?.focus();
    };
  }, [intent, onClose]);

  if (!intent) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="unit-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-selector-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" ref={closeRef} onClick={onClose} aria-label="Fechar escolha de loja">
          {"×"}
        </button>
        <p className="section-kicker">Atendimento pelo WhatsApp</p>
        <h2 id="unit-selector-title">{intent.title}</h2>
        <p className="modal-description">{intent.description}</p>
        <div className="modal-unit-list">
          {UNITS.map((unit) => (
            <a
              className="modal-unit-option"
              key={unit.id}
              href={buildWhatsAppUrl(unit, intent.message.replaceAll("{unidade}", unit.shortName), {
                campaign: "unit_selector",
                content: `unit_selector_${unit.id}_${intent.eventName}`,
              })}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir WhatsApp da loja ${unit.shortName}`}
              onClick={() => {
                trackEvent("unit_selection", { unit: unit.id, intent: intent.eventName, source: "unit_selector" });
                trackWhatsAppClick({
                  unit: unit.id,
                  intent: intent.eventName,
                  source: "unit_selector",
                  placement: "modal",
                });
                onClose();
              }}
            >
              <span>
                <strong>{unit.shortName}</strong>
                <small>{unit.address}</small>
              </span>
              <span className="modal-unit-action">
                <WhatsAppIcon /> Abrir conversa
              </span>
            </a>
          ))}
        </div>
        <p className="modal-note">
          {"Você vai ao WhatsApp da unidade. Preço, estoque e entrega a equipe confirma no horário da loja."}
        </p>
      </section>
    </div>
  );
}
