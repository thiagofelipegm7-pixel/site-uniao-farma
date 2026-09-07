"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!intent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [intent, onClose]);

  if (!intent) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="unit-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-selector-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
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
          Voc\u00ea vai ao WhatsApp da unidade. Pre\u00e7o, estoque e entrega a equipe confirma no hor\u00e1rio da loja.
        </p>
      </section>
    </div>
  );
}
