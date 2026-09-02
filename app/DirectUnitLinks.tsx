"use client";

import { trackEvent } from "./analytics";
import { buildWhatsAppUrl, UNITS } from "./site-config";

type DirectUnitLinksProps = {
  message: string;
  intent: string;
  source: string;
  heading?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

function resolveMessage(message: string, unitName: string): string {
  return message.replaceAll("{unidade}", unitName);
}

function WhatsAppIcon() {
  return <img src="/whatsapp-icon.svg" alt="" width="20" height="20" aria-hidden="true" />;
}

export default function DirectUnitLinks({
  message,
  intent,
  source,
  heading = "Escolha sua unidade e fale direto com a equipe",
  description = "Uma mensagem já pronta será aberta no WhatsApp da loja escolhida.",
  compact = false,
  className = "",
}: DirectUnitLinksProps) {
  return (
    <div className={`direct-unit-links ${compact ? "direct-unit-links-compact" : ""} ${className}`.trim()}>
      <div className="direct-unit-links-copy">
        <strong>{heading}</strong>
        <span>{description}</span>
      </div>
      <div className="direct-unit-links-grid">
        {UNITS.map((unit) => (
          <a
            key={unit.id}
            className="direct-unit-link"
            href={buildWhatsAppUrl(unit, resolveMessage(message, unit.shortName), {
              campaign: source,
              content: `${source}_${unit.id}`,
            })}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (intent === "delivery_inquiry") {
                trackEvent("delivery_inquiry", { unit: unit.id, source, placement: "direct_links" });
              }
              trackEvent("unit_selection", { unit: unit.id, intent, source, placement: "direct_links" });
              trackEvent("whatsapp_click", { unit: unit.id, intent, source, placement: "direct_links" });
            }}
          >
            <span className="direct-unit-name">{unit.shortName}</span>
            <span className="direct-unit-neighborhood">{unit.neighborhood}</span>
            <span className="direct-unit-action"><WhatsAppIcon /> Abrir WhatsApp</span>
          </a>
        ))}
      </div>
    </div>
  );
}
