"use client";

import { useEffect, useState } from "react";
import { buildWhatsAppUrl, UNITS, type Unit } from "./site-config";
import { readPreferredUnitId } from "./preferred-unit";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";
import { recordMetric } from "./metrics";

const SHORT: Record<Unit["id"], string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

export default function PreferredStoreBanner() {
  const [unitId, setUnitId] = useState<Unit["id"] | null>(null);

  useEffect(() => {
    const sync = () => setUnitId(readPreferredUnitId());
    sync();
    window.addEventListener("uf-preferred-unit", sync);
    return () => window.removeEventListener("uf-preferred-unit", sync);
  }, []);

  const unit = UNITS.find((item) => item.id === unitId);
  if (!unit) return null;

  const href = buildWhatsAppUrl(unit, WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName), {
    campaign: "loja_preferida",
    content: `${unit.id}_repeat`,
  });

  return (
    <a
      className="preferred-store-banner"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => recordMetric({ unit: unit.id, intent: "product", source: "preferred_banner" })}
    >
      Pedir de novo em {SHORT[unit.id]}
    </a>
  );
}
