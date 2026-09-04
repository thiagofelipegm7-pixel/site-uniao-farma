"use client";

import { useMemo, useState } from "react";
import { buildWhatsAppUrl, UNITS, type Unit } from "./site-config";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";

const LABEL: Record<Unit["id"], string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

export default function InteractiveUnitMap({ initialUnitId }: { initialUnitId?: Unit["id"] }) {
  const [activeId, setActiveId] = useState<Unit["id"]>(initialUnitId ?? "fatima");
  const unit = useMemo(() => UNITS.find((item) => item.id === activeId) ?? UNITS[0], [activeId]);
  const message = WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName);

  return (
    <section className="unit-map" aria-label="Mapa das unidades">
      <div className="unit-map-pins" role="tablist" aria-label="Escolher loja no mapa">
        {UNITS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === unit.id}
            className={item.id === unit.id ? "is-active" : ""}
            onClick={() => setActiveId(item.id)}
          >
            <strong>{LABEL[item.id]}</strong>
            <span>{item.shortAddress}</span>
          </button>
        ))}
      </div>

      <div className="unit-map-frame">
        <iframe
          src={unit.mapEmbed}
          title={`Mapa da União Farma ${LABEL[unit.id]}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="unit-map-details">
        <p className="eyebrow">Unidade no mapa</p>
        <h2>{unit.shortName}</h2>
        <p>{unit.address}</p>
        <ul className="hours-grid">
          <li><span>Seg a sex</span><strong>07:00–21:00</strong></li>
          <li><span>Sábado</span><strong>{unit.schedule.sat?.open}–{unit.schedule.sat?.close}</strong></li>
          <li><span>Domingo</span><strong>07:00–12:00</strong></li>
        </ul>
        <div className="unit-map-actions">
          <a className="button button-whatsapp" href={buildWhatsAppUrl(unit, message, { campaign: "mapa", content: unit.id })} target="_blank" rel="noreferrer">
            WhatsApp {LABEL[unit.id]}
          </a>
          <a className="button button-call" href={unit.map} target="_blank" rel="noreferrer">
            Abrir rota
          </a>
          <a className="text-link" href={unit.phoneLink}>Ligar {unit.phone}</a>
        </div>
      </div>
    </section>
  );
}
