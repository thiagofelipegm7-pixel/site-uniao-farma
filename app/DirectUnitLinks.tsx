"use client";

import { trackEvent } from "./analytics";
import { buildWhatsAppUrl, UNITS } from "./site-config";
import UnitStatusBadge from "./UnitStatusBadge";

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

const recipeMessage =
  "Olá, União Farma {unidade}! Vou enviar a foto da receita (ou Memed). Pode o farmacêutico conferir?";

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
          <article key={unit.id} className="direct-unit-link">
            <span className="direct-unit-name">{unit.shortName}</span>
            <span className="direct-unit-neighborhood">{unit.address}</span>
            <UnitStatusBadge unit={unit} />
            <div className="direct-unit-actions">
              <a
                href={buildWhatsAppUrl(unit, resolveMessage(message, unit.shortName), {
                  campaign: source,
                  content: `${source}_${unit.id}_pedido`,
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
                <WhatsAppIcon /> Pedir produto
              </a>
              <a
                className="direct-unit-recipe"
                href={buildWhatsAppUrl(unit, resolveMessage(recipeMessage, unit.shortName), {
                  campaign: source,
                  content: `${source}_${unit.id}_receita`,
                })}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackEvent("unit_selection", { unit: unit.id, intent: "enviar_receita", source, placement: "direct_links" });
                  trackEvent("whatsapp_click", { unit: unit.id, intent: "enviar_receita", source, placement: "direct_links_recipe" });
                }}
              >
                Enviar receita
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
