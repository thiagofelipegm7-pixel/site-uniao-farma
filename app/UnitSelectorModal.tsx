"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "./analytics";
import { WhatsAppIcon } from "./home-chrome";
import { trackWhatsAppClick } from "./metrics";
import { buildWhatsAppUrl, UNITS } from "./site-config";

export type SelectorIntent = {
  title: string;
  description: string;
  message: string;
  eventName: string;
};

export default function UnitSelectorModal({
  intent,
  onClose,
}: {
  intent: SelectorIntent | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!intent) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();
    const first = dialog.querySelector<HTMLElement>("a, button");
    window.setTimeout(() => first?.focus(), 20);

    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [intent, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="unit-selector-modal"
      aria-labelledby="unit-selector-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {intent ? (
        <>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar escolha de loja">
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
        </>
      ) : null}
    </dialog>
  );
}
